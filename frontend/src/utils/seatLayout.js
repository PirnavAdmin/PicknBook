/**
 * src/utils/seatLayout.js
 * 
 * Normalizes supplier seat map API responses into an aircraft-agnostic,
 * fully API-driven seat layout data structure.
 */

import { extractAllSeatObjects, normalizeCabinClass } from "./seatMapUtils.js";

// Cache seat layouts by flight / segment key
const layoutCache = new Map();

export function getCachedSeatLayout(cacheKey, apiResponse) {
  if (cacheKey && layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey);
  }
  const layout = buildSeatLayout(apiResponse);
  if (cacheKey) {
    layoutCache.set(cacheKey, layout);
  }
  return layout;
}

export function clearSeatLayoutCache(cacheKey) {
  if (cacheKey) {
    layoutCache.delete(cacheKey);
  } else {
    layoutCache.clear();
  }
}

/**
 * Parses raw seat code e.g. "12A", "1B", "A12", etc.
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
 * Derives column structure with aisles ("_") for a set of columns in a cabin.
 */
function deriveCabinColumns(colLetters, seatObjectsInCabin) {
  if (!colLetters || colLetters.length === 0) {
    return ["A", "B", "C", "_", "D", "E", "F"];
  }

  const sortedCols = Array.from(new Set(colLetters)).sort((a, b) => {
    // Standard airline letter order
    return a.localeCompare(b);
  });

  const totalCols = sortedCols.length;

  // Check if API seats in this cabin explicitly designate aisles
  const aisleCols = new Set();
  seatObjectsInCabin.forEach((s) => {
    const raw = s.rawSeat || s;
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

  // If we found explicit aisle seats:
  // An aisle exists between two adjacent columns where either the left is an aisle or right is an aisle
  const columnsWithAisles = [];
  let explicitAisleInserted = false;

  for (let i = 0; i < sortedCols.length; i++) {
    columnsWithAisles.push(sortedCols[i]);
    if (i < sortedCols.length - 1) {
      const curr = sortedCols[i];
      const next = sortedCols[i + 1];
      const isAisleGap = aisleCols.has(curr) && aisleCols.has(next);
      // In airline seating, 'I' is skipped between H and J, and 'O' is skipped between N and P
      const isAviationConsecutive = (curr === "H" && next === "J") || (curr === "N" && next === "P");
      const isCharGap = !isAviationConsecutive && (next.charCodeAt(0) - curr.charCodeAt(0) > 1);

      if (isAisleGap || (isCharGap && !aisleCols.has(next))) {
        columnsWithAisles.push("_");
        explicitAisleInserted = true;
      }
    }
  }

  if (explicitAisleInserted) {
    return columnsWithAisles;
  }

  // Canonical layout fallback based on count of columns:
  switch (totalCols) {
    case 1:
      return sortedCols;
    case 2:
      // 1-1 or 2-0
      return [sortedCols[0], "_", sortedCols[1]];
    case 3:
      // 1-2 e.g. A _ C D
      return [sortedCols[0], "_", sortedCols[1], sortedCols[2]];
    case 4:
      // Check if 1-2-1 (Business class: A _ D G _ K)
      if (sortedCols[0] === "A" && sortedCols[1] === "D") {
        return [sortedCols[0], "_", sortedCols[1], sortedCols[2], "_", sortedCols[3]];
      }
      // Standard 2-2: A C _ D F
      return [sortedCols[0], sortedCols[1], "_", sortedCols[2], sortedCols[3]];
    case 5:
      // 2-3
      return [sortedCols[0], sortedCols[1], "_", sortedCols[2], sortedCols[3], sortedCols[4]];
    case 6:
      // Standard 3-3: A B C _ D E F
      return [
        sortedCols[0], sortedCols[1], sortedCols[2],
        "_",
        sortedCols[3], sortedCols[4], sortedCols[5]
      ];
    case 7:
      // Twin-aisle 2-3-2: A B _ C D E _ F G
      return [
        sortedCols[0], sortedCols[1],
        "_",
        sortedCols[2], sortedCols[3], sortedCols[4],
        "_",
        sortedCols[5], sortedCols[6]
      ];
    case 8:
      // Twin-aisle 2-4-2: A C _ D E F G _ H K
      return [
        sortedCols[0], sortedCols[1],
        "_",
        sortedCols[2], sortedCols[3], sortedCols[4], sortedCols[5],
        "_",
        sortedCols[6], sortedCols[7]
      ];
    case 9:
      // Twin-aisle 3-3-3: A B C _ D E F _ G H J
      return [
        sortedCols[0], sortedCols[1], sortedCols[2],
        "_",
        sortedCols[3], sortedCols[4], sortedCols[5],
        "_",
        sortedCols[6], sortedCols[7], sortedCols[8]
      ];
    case 10:
      // Twin-aisle 3-4-3: A B C _ D E F G _ H J K
      return [
        sortedCols[0], sortedCols[1], sortedCols[2],
        "_",
        sortedCols[3], sortedCols[4], sortedCols[5], sortedCols[6],
        "_",
        sortedCols[7], sortedCols[8], sortedCols[9]
      ];
    default:
      // Split roughly in half
      const mid = Math.ceil(totalCols / 2);
      return [
        ...sortedCols.slice(0, mid),
        "_",
        ...sortedCols.slice(mid)
      ];
  }
}

/**
 * buildSeatLayout(apiResponse)
 * 
 * Main normalization function.
 */
export function buildSeatLayout(apiResponse) {
  if (!apiResponse) {
    return {
      aircraft: "Commercial Airliner",
      totalSeats: 0,
      totalRows: 0,
      cabins: [],
      rows: [],
      exits: [],
      bassinets: [],
      galleys: [],
      lavatories: [],
      stairs: [],
    };
  }

  // 1. Resolve raw seat list
  let rawList = [];
  if (Array.isArray(apiResponse.seats) && apiResponse.seats.length > 0) {
    rawList = apiResponse.seats;
  } else if (Array.isArray(apiResponse) && apiResponse.length > 0) {
    rawList = extractAllSeatObjects(apiResponse);
  } else if (apiResponse.rawResponse || apiResponse.Response || apiResponse.data) {
    rawList = extractAllSeatObjects(apiResponse.rawResponse || apiResponse.Response || apiResponse.data);
  } else {
    rawList = extractAllSeatObjects(apiResponse);
  }

  if (!rawList || rawList.length === 0) {
    console.warn("[seatLayout] No seat data found in apiResponse.");
    return {
      aircraft: "Commercial Airliner",
      totalSeats: 0,
      totalRows: 0,
      cabins: [],
      rows: [],
      exits: [],
      bassinets: [],
      galleys: [],
      lavatories: [],
      stairs: [],
    };
  }

  // Aircraft name resolution
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

  // 2. Parse every individual seat into a clean format
  const parsedSeats = [];
  const seenIds = new Set();

  rawList.forEach((s) => {
    try {
      const raw = s.rawSeat || s.rawApiSeat || s;
      let label = String(
        s.label || s.SeatNumber || s.SeatNo || s.seatNo || s.Number || s.Code || ""
      ).trim();

      if (label.includes("SeKey")) {
        label = label.split("SeKey")[0];
      }
      if (label.includes("_")) {
        label = label.split("_")[0];
      }

      const parsed = parseSeatLabel(label);
      if (!parsed) {
        return;
      }

      const rowNum = Number(s.rowNumber || s.row || s.RowNo || s.Row || parsed.row);
      const colLetter = String(s.seatLetter || s.seatCol || s.Column || parsed.col).toUpperCase();

      if (!rowNum || !colLetter) {
        return;
      }

      const seatId = `${rowNum}${colLetter}`;
      if (seenIds.has(seatId)) {
        return;
      }
      seenIds.add(seatId);

      // Status mapping:
      // available -> free (or paid if price > 0), occupied/blocked -> booked
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

      const price = Number(
        s.amount ?? s.price ?? s.Price ?? raw.Price ?? raw.Amount ?? raw.SeatCharge ?? raw.Charge ?? 0
      );

      let status = "free";
      if (isBooked) {
        status = "booked";
      } else if (price > 0) {
        status = "paid";
      }

      // Feature detection
      const isExit = Boolean(
        s.isExit ||
        s.isExtraLegroom ||
        raw.IsExitRow === true ||
        raw.isExitRow === true ||
        raw.ExitRow === true ||
        raw.Exit === true ||
        raw.IsEmergencyExit === true ||
        raw.isEmergencyExit === true ||
        raw.IsEmergency === true ||
        raw.IsLegroom === true ||
        raw.isLegroom === true ||
        (typeof raw.SeatCharacteristic === "string" && (raw.SeatCharacteristic.includes("E") || raw.SeatCharacteristic.toLowerCase().includes("exit"))) ||
        (Array.isArray(raw.SeatCharacteristic) && raw.SeatCharacteristic.some(c => String(c).toUpperCase() === "E" || String(c).toLowerCase().includes("exit"))) ||
        (typeof raw.Description === "string" && raw.Description.toLowerCase().includes("exit")) ||
        (typeof raw.SeatDescription === "string" && raw.SeatDescription.toLowerCase().includes("exit")) ||
        (typeof raw.Remarks === "string" && raw.Remarks.toLowerCase().includes("exit"))
      );

      const isBassinet = Boolean(
        s.isBassinet ||
        raw.IsBassinet === true ||
        raw.Bassinet === true ||
        (typeof raw.SeatCharacteristic === "string" && raw.SeatCharacteristic.toUpperCase().includes("B")) ||
        (typeof raw.Description === "string" && raw.Description.toLowerCase().includes("bassinet")) ||
        (typeof raw.SeatDescription === "string" && raw.SeatDescription.toLowerCase().includes("bassinet")) ||
        rowNum === 1
      );

      // Cabin class per seat
      const rawCabin = String(
        s.cabinClassName || s.CabinClassName || raw.CabinClassName ||
        s.cabinClass || s.CabinClass || raw.CabinClass ||
        s.Compartment || raw.Compartment || ""
      ).toLowerCase();

      let cabinCategory = "Economy";
      if (rawCabin.includes("first") || rawCabin === "5") {
        cabinCategory = "First Class";
      } else if (rawCabin.includes("business") || rawCabin === "4" || rawCabin === "c" || rawCabin === "j") {
        cabinCategory = "Business Class";
      } else if (rawCabin.includes("premium") || rawCabin.includes("plus") || rawCabin === "3" || rawCabin === "w") {
        cabinCategory = "Premium Economy";
      } else {
        // Price heuristics if API omitted class flag on individual seats
        if (rowNum <= 2 && price >= 1200) {
          cabinCategory = "Business Class";
        } else if (rowNum <= 5 && price >= 600) {
          cabinCategory = "Premium Economy";
        } else {
          cabinCategory = "Economy";
        }
      }

      parsedSeats.push({
        id: seatId,
        row: rowNum,
        col: colLetter,
        status,
        price,
        isExitRow: isExit,
        isEmergencyExit: isExit,
        isBassinet,
        cabinCategory,
        rawSeat: raw,
      });
    } catch (err) {
      console.warn("[seatLayout] Missing or corrupted seat field, rendering as booked:", err, s);
      const fallbackId = String(s.Code || s.SeatNumber || Math.random().toString(36).slice(2, 6));
      parsedSeats.push({
        id: fallbackId,
        row: 1,
        col: "A",
        status: "booked",
        price: 0,
        isExitRow: false,
        isEmergencyExit: false,
        isBassinet: false,
        cabinCategory: "Economy",
        rawSeat: s,
      });
    }
  });

  if (parsedSeats.length === 0) {
    return {
      aircraft: aircraftName,
      totalSeats: 0,
      totalRows: 0,
      cabins: [],
      rows: [],
      exits: [],
      bassinets: [],
      galleys: [],
      lavatories: [],
      stairs: [],
    };
  }

  // 3. Group rows and determine cabins
  const rowNumberSet = new Set(parsedSeats.map((s) => s.row));
  const sortedRowNumbers = Array.from(rowNumberSet).sort((a, b) => a - b);

  // Group consecutive rows with the same cabin category into distinct cabins
  const cabins = [];
  let currentCabin = null;

  sortedRowNumbers.forEach((rNum) => {
    const seatsInRow = parsedSeats.filter((s) => s.row === rNum);
    const majorityCategory = seatsInRow[0]?.cabinCategory || "Economy";

    if (!currentCabin || currentCabin.name !== majorityCategory) {
      if (currentCabin) {
        cabins.push(currentCabin);
      }
      currentCabin = {
        name: majorityCategory,
        startRow: rNum,
        endRow: rNum,
        rowNumbers: [rNum],
      };
    } else {
      currentCabin.endRow = rNum;
      currentCabin.rowNumbers.push(rNum);
    }
  });
  if (currentCabin) {
    cabins.push(currentCabin);
  }

  // Assign columns for each cabin
  cabins.forEach((cabin) => {
    const seatsInThisCabin = parsedSeats.filter((s) =>
      cabin.rowNumbers.includes(s.row)
    );
    const colLetters = Array.from(new Set(seatsInThisCabin.map((s) => s.col)));
    cabin.columns = deriveCabinColumns(colLetters, seatsInThisCabin);
  });

  // 4. Build normalized rows array with seat positions
  const rows = [];
  const bassinetRows = new Set();
  const exitRowsSet = new Set();

  sortedRowNumbers.forEach((rNum) => {
    const cabin = cabins.find((c) => rNum >= c.startRow && rNum <= c.endRow) || cabins[0];
    const seatsInRow = parsedSeats.filter((s) => s.row === rNum);
    const seatsByCol = new Map(seatsInRow.map((s) => [s.col, s]));

    const seatColumns = cabin.columns || ["A", "B", "C", "_", "D", "E", "F"];
    const actualSeatCols = seatColumns.filter((col) => col !== "_");

    const rowSeats = [];
    seatColumns.forEach((col) => {
      if (col === "_") {
        return; // Aisle slot
      }

      const found = seatsByCol.get(col);
      const colIndex = actualSeatCols.indexOf(col);
      const isWindow = colIndex === 0 || colIndex === actualSeatCols.length - 1;

      // Check if adjacent to aisle in cabin.columns
      const rawColIndex = seatColumns.indexOf(col);
      const isAisle =
        (rawColIndex > 0 && seatColumns[rawColIndex - 1] === "_") ||
        (rawColIndex < seatColumns.length - 1 && seatColumns[rawColIndex + 1] === "_");
      const isMiddle = !isWindow && !isAisle;

      if (found) {
        if (found.isBassinet) bassinetRows.add(rNum);
        if (found.isExitRow) exitRowsSet.add(rNum);

        rowSeats.push({
          id: found.id,
          col: found.col,
          status: found.status,
          price: found.price,
          isExitRow: found.isExitRow,
          isEmergencyExit: found.isEmergencyExit,
          isBassinet: found.isBassinet,
          isWindow,
          isAisle,
          isMiddle,
          rawSeat: found.rawSeat,
        });
      } else {
        // Seat missing in this slot (render as booked to maintain grid)
        rowSeats.push({
          id: `${rNum}${col}`,
          col,
          status: "booked",
          price: 0,
          isExitRow: false,
          isEmergencyExit: false,
          isBassinet: false,
          isWindow,
          isAisle,
          isMiddle,
          rawSeat: null,
        });
      }
    });

    rows.push({
      number: rNum,
      cabin: cabin.name,
      seats: rowSeats,
    });
  });

  // 5. Exits: Use the first row of any exit pair
  const sortedExitRows = Array.from(exitRowsSet).sort((a, b) => a - b);
  const exitRowsFiltered = [];
  for (let i = 0; i < sortedExitRows.length; i++) {
    const curr = sortedExitRows[i];
    const prev = sortedExitRows[i - 1];
    // If consecutive pair, use first row
    if (prev !== undefined && curr === prev + 1) {
      continue;
    }
    exitRowsFiltered.push(curr);
  }

  // Default narrow-body exit rows if supplier omitted exit flags
  if (exitRowsFiltered.length === 0 && sortedRowNumbers.length >= 15) {
    if (sortedRowNumbers.includes(12)) {
      exitRowsFiltered.push(12);
    } else {
      const midRow = sortedRowNumbers[Math.floor(sortedRowNumbers.length * 0.45)];
      if (midRow) exitRowsFiltered.push(midRow);
    }
  }

  const exits = [];
  exitRowsFiltered.forEach((exitRow) => {
    exits.push({ row: exitRow, side: "top" });
    exits.push({ row: exitRow, side: "bottom" });
  });

  // 6. Galleys, lavatories, stairs, bassinets
  const galleys = [];
  const lavatories = [];
  const stairs = [{ row: sortedRowNumbers[0] || 1, position: "front" }];
  const bassinets = Array.from(bassinetRows);

  // Galleys and lavatories at nose and tail
  galleys.push({ position: "nose", half: "top" });
  galleys.push({ position: "tail", half: "bottom" });
  lavatories.push({ position: "nose", half: "bottom" });
  lavatories.push({ position: "tail", half: "top" });

  // Between cabins (if more than 1 cabin)
  for (let c = 0; c < cabins.length - 1; c++) {
    const transitionRow = cabins[c].endRow;
    galleys.push({ position: "transition", afterRow: transitionRow, half: "top" });
    lavatories.push({ position: "transition", afterRow: transitionRow, half: "bottom" });
  }

  return {
    aircraft: aircraftName,
    totalSeats: parsedSeats.length,
    totalRows: sortedRowNumbers.length,
    cabins: cabins.map((c) => ({
      name: c.name,
      startRow: c.startRow,
      endRow: c.endRow,
      columns: c.columns,
    })),
    rows,
    exits,
    bassinets,
    galleys,
    lavatories,
    stairs,
  };
}
