/**
 * src/utils/normalizeSeatMap.js
 * 
 * Pipeline: API response (per segment) -> normalizeSeatMap() -> layout model -> <AircraftSeatMap />
 * 
 * Normalized Output:
 * {
 *   aircraft: "A320neo",
 *   cabins: [{ name, startRow, endRow, groups: ["ABC", "DEF"] }],
 *   rows: [...],
 *   seats: [{
 *     row,
 *     col,
 *     cabin,
 *     status: 'free' | 'paid' | 'booked',
 *     price: 0,
 *     isWindow: false,
 *     isAisle: false,
 *     isExitRow: false,
 *     isEmergencyExit: false,
 *     isBassinet: false,
 *     type: "Window",
 *     typeTag: "WINDOW",
 *     id: "12A",
 *     label: "12A"
 *   }],
 *   exitRows: [14, 15],
 *   galleys: [...],
 *   lavatories: [...],
 *   bassinets: [...],
 *   currency: "INR",
 *   totalRows: 30,
 *   totalSeats: 180
 * }
 */

import { extractAllSeatObjects } from "./seatMapUtils.js";

// Cache normalized seat maps: cacheKey = `${tripId}:${segmentIndex}:${flightNumber}`
const layoutCache = new Map();

export function getCachedNormalizedSeatMap(cacheKey, apiResponse) {
  if (cacheKey && layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey);
  }
  const layout = normalizeSeatMap(apiResponse);
  if (cacheKey && layout !== null) {
    layoutCache.set(cacheKey, layout);
  }
  return layout;
}

export function clearNormalizedSeatMapCache(cacheKey) {
  if (cacheKey) {
    layoutCache.delete(cacheKey);
  } else {
    layoutCache.clear();
  }
}

/**
 * Parses seat label (e.g. "12A", "1B", "A12") into numeric row and column letter.
 */
function parseSeatLabel(label) {
  if (!label) return null;
  const clean = String(label).trim().toUpperCase().replace(/[\s\-_]/g, "");
  let match = clean.match(/^(\d{1,3})([A-Z]+)$/);
  if (match) {
    return { row: parseInt(match[1], 10), col: match[2] };
  }
  match = clean.match(/^([A-Z]+)(\d{1,3})$/);
  if (match) {
    return { row: parseInt(match[2], 10), col: match[1] };
  }
  return null;
}

/**
 * Derives cabin column groups e.g. ["ABC", "DEF"], ["AB", "CD"], ["A", "DG", "K"], ["ABC", "DEF", "GHK"], ["ABC", "DEFG", "HJK"]
 * Split a cabin's sorted seat letters wherever the API marks an aisle (aisle flag / blank column / jump in column index).
 */
function deriveCabinGroups(colLetters, seatsInCabin) {
  if (!colLetters || colLetters.length === 0) {
    return ["ABC", "DEF"];
  }

  const sortedCols = Array.from(new Set(colLetters)).sort((a, b) => a.localeCompare(b));
  const totalCols = sortedCols.length;

  // 1. Check if the API explicitly designates aisle seats in this cabin
  const aisleCols = new Set();
  seatsInCabin.forEach((s) => {
    const raw = s.rawSeat || s.rawApiSeat || s;
    const isAisle = Boolean(
      raw?.IsAisle === true ||
      raw?.isAisle === true ||
      s?.isAisle === true ||
      (typeof raw?.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("A")) ||
      (typeof raw?.SeatType === "string" && raw.SeatType.toLowerCase().includes("aisle")) ||
      (typeof raw?.Description === "string" && raw.Description.toLowerCase().includes("aisle"))
    );
    if (isAisle && s.col) {
      aisleCols.add(s.col);
    }
  });

  // Check for 1-2-1 Business layout pattern (e.g. A, D, G, K or A, E, F, K)
  if (
    totalCols === 4 &&
    sortedCols[0] === "A" &&
    (sortedCols[3] === "K" || sortedCols[3] === "J")
  ) {
    return [sortedCols[0], sortedCols[1] + sortedCols[2], sortedCols[3]];
  }

  // Check for jumps in lettering or adjacent aisle seats
  const splitPoints = new Set();
  for (let i = 0; i < sortedCols.length - 1; i++) {
    const curr = sortedCols[i];
    const next = sortedCols[i + 1];

    // Aviation skips I (and sometimes J) between H and K, O between N and P
    const isAviationConsecutive =
      (curr === "H" && next === "J") ||
      (curr === "H" && next === "K") ||
      (curr === "J" && next === "K") ||
      (curr === "N" && next === "P");
    const charDiff = next.charCodeAt(0) - curr.charCodeAt(0);
    const isLetteringJump = !isAviationConsecutive && charDiff > 1;

    const isAisleBetween = (aisleCols.has(curr) && aisleCols.has(next)) ||
      (isLetteringJump && !aisleCols.has(next));

    if (isAisleBetween || isLetteringJump) {
      splitPoints.add(i); // split after index i
    }
  }

  if (splitPoints.size > 0) {
    const groups = [];
    let currentGroup = "";
    for (let i = 0; i < sortedCols.length; i++) {
      currentGroup += sortedCols[i];
      if (splitPoints.has(i)) {
        groups.push(currentGroup);
        currentGroup = "";
      }
    }
    if (currentGroup) {
      groups.push(currentGroup);
    }
    return groups;
  }

  // Standard fallback based on column count
  switch (totalCols) {
    case 1:
      return [sortedCols[0]];
    case 2:
      // 1-1
      return [sortedCols[0], sortedCols[1]];
    case 3:
      // 1-2
      return [sortedCols[0], sortedCols[1] + sortedCols[2]];
    case 4:
      // Standard 2-2: AB|CD
      return [sortedCols[0] + sortedCols[1], sortedCols[2] + sortedCols[3]];
    case 5:
      // 2-3
      return [sortedCols[0] + sortedCols[1], sortedCols[2] + sortedCols[3] + sortedCols[4]];
    case 6:
      // Standard 3-3: ABC|DEF
      return [
        sortedCols.slice(0, 3).join(""),
        sortedCols.slice(3).join(""),
      ];
    case 7:
      // Twin-aisle 2-3-2
      return [
        sortedCols.slice(0, 2).join(""),
        sortedCols.slice(2, 5).join(""),
        sortedCols.slice(5).join(""),
      ];
    case 8:
      // Twin-aisle 2-4-2
      return [
        sortedCols.slice(0, 2).join(""),
        sortedCols.slice(2, 6).join(""),
        sortedCols.slice(6).join(""),
      ];
    case 9:
      // Twin-aisle 3-3-3: ABC|DEF|GHK
      return [
        sortedCols.slice(0, 3).join(""),
        sortedCols.slice(3, 6).join(""),
        sortedCols.slice(6).join(""),
      ];
    case 10:
      // Twin-aisle 3-4-3: ABC|DEFG|HJK
      return [
        sortedCols.slice(0, 3).join(""),
        sortedCols.slice(3, 7).join(""),
        sortedCols.slice(7).join(""),
      ];
    default: {
      const mid = Math.ceil(totalCols / 2);
      return [sortedCols.slice(0, mid).join(""), sortedCols.slice(mid).join("")];
    }
  }
}

/**
 * Normalizes supplier seat-map API response for ONE segment.
 * Never throws: skip invalid seats with console.warn; if no valid seats, return null.
 * 
 * @param {Object} apiResponse
 * @returns {Object|null}
 */
export function normalizeSeatMap(apiResponse) {
  if (!apiResponse) {
    return null;
  }

  // 1. Extract raw seat objects
  let rawList = [];
  try {
    if (Array.isArray(apiResponse.seats) && apiResponse.seats.length > 0) {
      rawList = apiResponse.seats;
    } else if (Array.isArray(apiResponse) && apiResponse.length > 0) {
      rawList = extractAllSeatObjects(apiResponse);
    } else if (apiResponse.rawResponse || apiResponse.Response || apiResponse.data) {
      rawList = extractAllSeatObjects(apiResponse.rawResponse || apiResponse.Response || apiResponse.data);
    } else {
      rawList = extractAllSeatObjects(apiResponse);
    }
  } catch (err) {
    console.warn("[normalizeSeatMap] Error extracting seat objects:", err);
    return null;
  }

  if (!rawList || rawList.length === 0) {
    console.warn("[normalizeSeatMap] No seat data found in response.");
    return null;
  }

  // Aircraft name and Currency resolution
  const aircraftName =
    apiResponse.aircraft ||
    apiResponse.Equipment ||
    apiResponse.equipment ||
    apiResponse.AircraftType ||
    apiResponse.EquipmentType ||
    rawList[0]?.rawSeat?.Equipment ||
    rawList[0]?.rawSeat?.Craft ||
    rawList[0]?.Equipment ||
    rawList[0]?.Craft ||
    "Commercial Airliner";

  const currency =
    apiResponse.currency ||
    apiResponse.Currency ||
    rawList[0]?.rawSeat?.Currency ||
    rawList[0]?.Currency ||
    "INR";

  // 2. Parse individual seat items
  const parsedSeats = [];
  const seenIds = new Set();

  rawList.forEach((s) => {
    try {
      const raw = s.rawSeat || s.rawApiSeat || s;
      let label = String(
        s.label || s.SeatNumber || s.SeatNo || s.seatNo || s.Number || s.Code || ""
      ).trim();

      if (label.includes("SeKey")) label = label.split("SeKey")[0];
      if (label.includes("_")) label = label.split("_")[0];

      const parsed = parseSeatLabel(label);
      if (!parsed) {
        console.warn("[normalizeSeatMap] Invalid seat label skipped:", label);
        return;
      }

      // Exact API row and column - never array index
      const rowNum = Number(s.rowNumber || s.row || s.RowNo || s.Row || parsed.row);
      const colLetter = String(s.seatLetter || s.seatCol || s.Column || parsed.col).toUpperCase();

      if (!rowNum || !colLetter) {
        console.warn("[normalizeSeatMap] Missing row or column:", { label, rowNum, colLetter });
        return;
      }

      const seatId = `${rowNum}${colLetter}`;
      if (seenIds.has(seatId)) {
        return;
      }
      seenIds.add(seatId);

      // Status mapping:
      // available + price 0 -> free, available + price > 0 -> paid, occupied/blocked -> booked
      const isBooked = Boolean(
        s.isBooked === true ||
        raw.AvailablityType === 0 ||
        raw.IsBooked === true ||
        raw.IsAvailable === false ||
        String(s.status || raw.Status || "").toLowerCase() === "booked" ||
        String(s.status || raw.Status || "").toLowerCase() === "blocked" ||
        String(s.status || raw.Status || "").toLowerCase() === "reserved" ||
        String(s.status || raw.Status || "").toLowerCase() === "unavailable"
      );

      const price = Math.round(
        Number(s.amount ?? s.price ?? raw.Price ?? raw.Amount ?? raw.SeatPrice ?? 0)
      );

      let status = "free";
      if (isBooked) {
        status = "booked";
      } else if (price > 0) {
        status = "paid";
      }

      // Feature flags
      const isExitRow = Boolean(
        s.isExitRow === true ||
        s.isExit === true ||
        raw.IsExitRow === true ||
        raw.IsExit === true ||
        raw.ExitRow === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("E"))
      );

      const isEmergencyExit = Boolean(
        s.isEmergencyExit === true ||
        raw.IsEmergencyExit === true ||
        (typeof raw.Description === "string" && raw.Description.toLowerCase().includes("emergency")) ||
        (typeof raw.SeatType === "string" && raw.SeatType.toLowerCase().includes("emergency"))
      );

      const isBassinet = Boolean(
        s.isBassinet === true ||
        raw.IsBassinet === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("B")) ||
        (typeof raw.Description === "string" && raw.Description.toLowerCase().includes("bassinet"))
      );

      const isWindow = Boolean(
        s.isWindow === true ||
        raw.IsWindow === true ||
        raw.isWindow === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("W")) ||
        (typeof raw.SeatType === "string" && raw.SeatType.toLowerCase().includes("window"))
      );

      const isAisle = Boolean(
        raw.IsAisle === true ||
        raw.isAisle === true ||
        s.isAisle === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("A")) ||
        (typeof raw.SeatType === "string" && raw.SeatType.toLowerCase().includes("aisle"))
      );

      // Cabin / Class grouping
      const rawCabin =
        s.cabin ||
        s.cabinClass ||
        s.travelClass ||
        raw.CabinClass ||
        raw.CabinClassName ||
        raw.Compartment ||
        raw.Class ||
        "";

      let cabinName = "Economy";
      const normCabin = String(rawCabin).toLowerCase();
      if (normCabin.includes("first") || normCabin === "1") {
        cabinName = "First";
      } else if (normCabin.includes("business") || normCabin === "2" || normCabin === "c" || normCabin === "j") {
        cabinName = "Business";
      } else if (normCabin.includes("premium") || normCabin.includes("plus") || normCabin === "w") {
        cabinName = "Premium Economy";
      }

      // type / typeTag: Exit row (EXIT ROW), Window (WINDOW), Aisle (AISLE), Middle (MIDDLE), otherwise Standard seat (STANDARD SEAT)
      let type = "Standard seat";
      let typeTag = "STANDARD SEAT";
      if (isExitRow || isEmergencyExit) {
        type = "Exit row";
        typeTag = "EXIT ROW";
      } else if (isWindow) {
        type = "Window";
        typeTag = "WINDOW";
      } else if (isAisle) {
        type = "Aisle";
        typeTag = "AISLE";
      }

      // Seat Badges: "bassinet" | "extraLegroom" | "wheelchair" | "power"
      const isWheelchair = Boolean(
        s.isWheelchair ||
        s.isAccessible ||
        raw.IsWheelchair === true ||
        raw.IsAccessible === true ||
        (typeof raw.SeatCharacteristic === "string" && (raw.SeatCharacteristic.toUpperCase().includes("H") || raw.SeatCharacteristic.toUpperCase().includes("D")))
      );

      const hasPower = Boolean(
        s.hasPower ||
        s.isPower ||
        raw.HasPower === true ||
        raw.IsPower === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("P"))
      );

      const badges = Array.isArray(s.badges)
        ? s.badges
        : [
            ...(isBassinet ? ["bassinet"] : []),
            ...((isExitRow || isEmergencyExit) ? ["extraLegroom"] : []),
            ...(isWheelchair ? ["wheelchair"] : []),
            ...(hasPower ? ["power"] : []),
          ];

      parsedSeats.push({
        id: seatId,
        row: rowNum,
        col: colLetter,
        status,
        price,
        type,
        typeTag,
        isWindow,
        isAisle,
        isExitRow: isExitRow || isEmergencyExit,
        isEmergencyExit,
        isBassinet,
        isWheelchair,
        hasPower,
        badges,
        cabin: cabinName,
        label: seatId,
        rowNumber: rowNum,
        seatLetter: colLetter,
        amount: price,
        rawSeat: raw,
        rawApiSeat: raw,
      });
    } catch (seatErr) {
      console.warn("[normalizeSeatMap] Error processing seat:", seatErr);
    }
  });

  if (parsedSeats.length === 0) {
    console.warn("[normalizeSeatMap] No valid seats parsed from response.");
    return null;
  }

  // 3. Group seats by row number
  const rowMap = new Map();
  parsedSeats.forEach((seat) => {
    if (!rowMap.has(seat.row)) {
      rowMap.set(seat.row, []);
    }
    rowMap.get(seat.row).push(seat);
  });

  const sortedRowNumbers = Array.from(rowMap.keys()).sort((a, b) => a - b);

  // 4. Identify cabins, groups and column positions
  const cabinRowsMap = new Map();
  sortedRowNumbers.forEach((rNum) => {
    const seatsInRow = rowMap.get(rNum);
    const primaryCabin = seatsInRow[0]?.cabin || "Economy";
    if (!cabinRowsMap.has(primaryCabin)) {
      cabinRowsMap.set(primaryCabin, []);
    }
    cabinRowsMap.get(primaryCabin).push(rNum);
  });

  const cabins = [];
  cabinRowsMap.forEach((rowsList, cName) => {
    const minRow = Math.min(...rowsList);
    const maxRow = Math.max(...rowsList);
    const cabinSeats = parsedSeats.filter((s) => rowsList.includes(s.row));
    const uniqueCols = Array.from(new Set(cabinSeats.map((s) => s.col))).sort();
    const groups = deriveCabinGroups(uniqueCols, cabinSeats);

    // Identify outer window columns and inner aisle columns per group
    const firstLetter = uniqueCols[0];
    const lastLetter = uniqueCols[uniqueCols.length - 1];
    const aisleLetters = new Set();

    groups.forEach((g) => {
      if (g.length > 1) {
        // In a multi-seat group, boundary letters next to other groups are aisle seats
        // Outer letters of the first and last group facing the window are window seats
      }
      // If group is not the first, its first letter is on the aisle
      // If group is not the last, its last letter is on the aisle
    });

    // Refine seat type / typeTag for seats in this cabin if not already set
    cabinSeats.forEach((st) => {
      if (!st.isExitRow && !st.isEmergencyExit) {
        if (st.col === firstLetter || st.col === lastLetter) {
          st.isWindow = true;
          st.type = "Window";
          st.typeTag = "WINDOW";
        } else {
          // Check if it's on an aisle boundary
          let onAisle = false;
          groups.forEach((g, gIdx) => {
            if (gIdx > 0 && g.startsWith(st.col)) onAisle = true;
            if (gIdx < groups.length - 1 && g.endsWith(st.col)) onAisle = true;
          });
          if (onAisle || st.isAisle) {
            st.isAisle = true;
            st.type = "Aisle";
            st.typeTag = "AISLE";
          } else {
            st.type = "Middle";
            st.typeTag = "MIDDLE";
          }
        }
      }
    });

    cabins.push({
      name: cName,
      startRow: minRow,
      endRow: maxRow,
      groups, // ["ABC", "DEF"]
    });
  });

  cabins.sort((a, b) => a.startRow - b.startRow);

  // 5. Structure normalized rows with sorted seats
  const rows = [];
  const exitRowsSet = new Set();
  const bassinetRowsSet = new Set();

  sortedRowNumbers.forEach((rNum) => {
    const seatsInRow = rowMap.get(rNum);
    seatsInRow.sort((a, b) => a.col.localeCompare(b.col));
    const cabin = seatsInRow[0]?.cabin || "Economy";

    const hasExit = seatsInRow.some((s) => s.isExitRow || s.isEmergencyExit);
    const hasBassinet = seatsInRow.some((s) => s.isBassinet);

    if (hasExit) exitRowsSet.add(rNum);
    if (hasBassinet) bassinetRowsSet.add(rNum);

    rows.push({
      number: rNum,
      cabin,
      seats: seatsInRow,
    });
  });

  // Amenities: galleys, lavatories, stairs
  const galleys = [];
  const lavatories = [];
  const bassinets = Array.from(bassinetRowsSet).sort((a, b) => a - b);
  const exitRows = Array.from(exitRowsSet).sort((a, b) => a - b);
  const stairs = [];

  // Front transition galley & lavatory
  if (sortedRowNumbers.length > 0) {
    galleys.push({ position: "front", row: sortedRowNumbers[0] });
    lavatories.push({ position: "front", row: sortedRowNumbers[0] });
  }

  // Inter-cabin galleys & lavatories
  for (let i = 0; i < cabins.length - 1; i++) {
    const endRow = cabins[i].endRow;
    galleys.push({ position: "mid", row: endRow });
    lavatories.push({ position: "mid", row: endRow });
  }

  // Rear galley & lavatory
  if (sortedRowNumbers.length > 0) {
    const lastRow = sortedRowNumbers[sortedRowNumbers.length - 1];
    galleys.push({ position: "rear", row: lastRow });
    lavatories.push({ position: "rear", row: lastRow });
  }

  const isDoubleDeck =
    String(aircraftName).toLowerCase().includes("380") ||
    String(aircraftName).toLowerCase().includes("747") ||
    rawList.some((s) => {
      const raw = s.rawSeat || s;
      const d = raw.Deck || raw.Floor;
      return d && (String(d).toLowerCase().includes("upper") || String(d) === "2");
    });

  if (isDoubleDeck && sortedRowNumbers.length > 0) {
    stairs.push(sortedRowNumbers[0]);
  }

  return {
    aircraft: aircraftName,
    hasUpperDeck: isDoubleDeck,
    cabinElements: apiResponse.cabinElements || [],
    cabins,
    rows,
    seats: parsedSeats,
    exitRows,
    galleys,
    lavatories,
    bassinets,
    stairs,
    currency,
    totalRows: rows.length,
    totalSeats: parsedSeats.length,
  };
}

export default normalizeSeatMap;
