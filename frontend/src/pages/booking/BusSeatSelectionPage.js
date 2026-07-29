/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Info } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/BusBookingFlow.css";
import SeatSelection from "../../components/forms/SeatSelection";
import {
  readBusBookingFlowState,
  writeBusBookingFlowState,
} from "./busBookingFlowStore";
import { getBusSeatMap } from "../../services/busBookingService";
import { isTokenExpired } from "../../services/authSession";
import { openAuthModal } from "../../utils/authModalEvents";

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `\u20b9 ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)}`;
}

function hashFromText(text) {
  let hash = 0;
  const value = String(text || "");
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function createRandom(seedStart) {
  let seed = seedStart >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function getBusLayoutKind(busType) {
  const normalizedType = String(busType || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const hasSeater = /\bseat(er|ing)?\b/.test(normalizedType);
  const hasSleeper = /\bsleeper\b|\bsleeping\b/.test(normalizedType);

  if (hasSeater && hasSleeper) {
    return "hybrid";
  }

  if (hasSleeper) {
    return "sleeper";
  }

  return "seater";
}

function getSeatMapLayoutKind(busType, seatMap) {
  const layoutType = String(seatMap?.layoutType || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (
    layoutType.includes("seater sleeper") ||
    layoutType.includes("sleeper seater") ||
    layoutType.includes("hybrid")
  ) {
    return "hybrid";
  }

  if (layoutType.includes("sleeper")) {
    return "sleeper";
  }

  if (layoutType.includes("seater")) {
    return "seater";
  }

  return getBusLayoutKind(busType);
}

function normalizeSeatCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getDeckName(value, fallback = "Main Deck") {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "LOWER") {
    return "Lower Deck";
  }

  if (normalized === "UPPER") {
    return "Upper Deck";
  }

  return value ? String(value).trim() : fallback;
}

function getDeckGroupName(definition, section, fallback = "Deck") {
  const deckName = getDeckName(definition?.deck || section?.deck || "", "");

  if (deckName) {
    return deckName.replace(/\s+Deck$/i, "");
  }

  const sectionLabel = String(section?.label || definition?.sectionLabel || "").trim();

  if (/upper/i.test(sectionLabel)) {
    return "Upper";
  }

  if (/lower/i.test(sectionLabel)) {
    return "Lower";
  }

  return fallback;
}

function getDeckGroupSortValue(groupName) {
  const normalized = String(groupName || "").trim().toLowerCase();

  if (normalized === "lower") {
    return 1;
  }

  if (normalized === "upper") {
    return 2;
  }

  if (normalized === "main") {
    return 0;
  }

  return 10;
}

function getSeatKindFromData(definition, backendSeat) {
  const seatType = String(definition?.seatType || backendSeat?.seatType || "")
    .trim()
    .toLowerCase();

  if (definition?.isSleeper === true || seatType.includes("sleeper")) {
    return "sleeper";
  }

  return "seater";
}

function resolveKindFromBusType(busType, seatLabel) {
  const layoutKind = getBusLayoutKind(busType);
  const label = String(seatLabel || "").toUpperCase();

  if (layoutKind === "seater") {
    return "seater";
  }

  if (layoutKind === "sleeper") {
    return "sleeper";
  }

  // hybrid: seater/sleeper
  if (label.startsWith("LS")) {
    return "sleeper";
  }
  if (label.startsWith("U")) {
    return "sleeper";
  }
  // L-codes and seater codes (1A, 2B, etc.) are seaters in hybrid
  return "seater";
}

function createSequentialSeats({ count, prefix, deck, kind }) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    label: `${prefix}${index + 1}`,
    deck,
    kind,
  }));
}

function createSeaterDisplayLabel(index, seatsPerRow = 3) {
  const letters = ["A", "B", "C", "D"];
  const row = Math.floor(index / seatsPerRow) + 1;
  const letter = letters[index % seatsPerRow] || String(index + 1);
  return `${row}${letter}`;
}

function getBackendSeatCodes(backendSeats) {
  if (!Array.isArray(backendSeats)) {
    return [];
  }

  return backendSeats
    .map((seat) => normalizeSeatCode(seat?.seatCode || seat?.SeatCode))
    .filter(Boolean)
    .sort((first, second) => {
      const firstSeater = first.match(/^(\d+)([A-Z])$/);
      const secondSeater = second.match(/^(\d+)([A-Z])$/);

      if (firstSeater && secondSeater) {
        const rowDiff = Number(firstSeater[1]) - Number(secondSeater[1]);
        return rowDiff || firstSeater[2].localeCompare(secondSeater[2]);
      }

      const firstDeck = first.match(/^([LU])(\d+)$/);
      const secondDeck = second.match(/^([LU])(\d+)$/);

      if (firstDeck && secondDeck) {
        if (firstDeck[1] !== secondDeck[1]) {
          return firstDeck[1] === "L" ? -1 : 1;
        }

        return Number(firstDeck[2]) - Number(secondDeck[2]);
      }

      if (firstSeater && secondDeck) {
        return -1;
      }

      if (firstDeck && secondSeater) {
        return 1;
      }

      return first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function createDefinitionsFromBackendSeatMap(backendSeatMap, backendSeats = []) {
  const seatDefinitions = Array.isArray(backendSeatMap?.seatDefinitions)
    ? backendSeatMap.seatDefinitions
    : [];
  const sections = Array.isArray(backendSeatMap?.sections)
    ? backendSeatMap.sections
    : [];

  if (seatDefinitions.length === 0 && sections.length === 0) {
    return [];
  }

  const backendSeatsByCode = new Map();
  backendSeats.forEach((seat) => {
    const code = normalizeSeatCode(seat?.seatCode || seat?.SeatCode);
    if (code) {
      backendSeatsByCode.set(code, seat);
    }
  });

  const definitionsByCode = new Map();
  seatDefinitions.forEach((definition) => {
    const code = normalizeSeatCode(definition?.seatCode);
    if (code) {
      definitionsByCode.set(code, definition);
    }
  });

  const usedCodes = new Set();
  const sectionDefinitions = sections.flatMap((section, sectionIndex) => {
    const sectionSeatCodes = Array.isArray(section?.seatCodes)
      ? section.seatCodes.map(normalizeSeatCode).filter(Boolean)
      : [];
    const columnsPerRow = Math.max(1, Number(section?.columnsPerRow) || 1);
    const sectionLabel =
      String(section?.label || "").trim() ||
      getDeckName(section?.deck, `Section ${sectionIndex + 1}`);

    return sectionSeatCodes.map((seatCode, index) => {
      usedCodes.add(seatCode);
      const definition = definitionsByCode.get(seatCode) || {};
      const backendSeat = backendSeatsByCode.get(seatCode) || {};
      const aisleAfterColumn = Number(section?.aisleAfterColumn);
      const deckGroup = getDeckGroupName(
        definition,
        section,
        `Deck ${sectionIndex + 1}`
      );

      return {
        label: seatCode,
        deck: sectionLabel,
        deckGroup,
        sectionLabel,
        kind: getSeatKindFromData(definition, backendSeat),
        row: Number(definition.row) || Math.floor(index / columnsPerRow) + 1,
        column: Number(definition.column) || (index % columnsPerRow) + 1,
        columnsPerRow,
        aisleAfterColumn: Number.isFinite(aisleAfterColumn)
          ? aisleAfterColumn
          : -1,
        isUpper:
          deckGroup.toLowerCase() === "upper" ||
          definition?.isUpper === true ||
          String(definition?.deck || section?.deck || "").toUpperCase() === "UPPER",
      };
    });
  });

  const looseDefinitions = seatDefinitions
    .map((definition) => {
      const seatCode = normalizeSeatCode(definition?.seatCode);

      if (!seatCode || usedCodes.has(seatCode)) {
        return null;
      }

      const backendSeat = backendSeatsByCode.get(seatCode) || {};
      const deckGroup = getDeckGroupName(definition, null, getDeckName(definition.deck));

      return {
        label: seatCode,
        deck: getDeckName(definition.deck),
        deckGroup,
        sectionLabel: getDeckName(definition.deck),
        kind: getSeatKindFromData(definition, backendSeat),
        row: Number(definition.row) || 0,
        column: Number(definition.column) || 0,
        columnsPerRow: 0,
        aisleAfterColumn: definition.isSleeper ? -1 : 0,
        isUpper:
          deckGroup.toLowerCase() === "upper" ||
          definition?.isUpper === true ||
          String(definition?.deck || "").toUpperCase() === "UPPER",
      };
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        first.deck.localeCompare(second.deck) ||
        first.row - second.row ||
        first.column - second.column ||
        first.label.localeCompare(second.label, undefined, {
          numeric: true,
          sensitivity: "base",
        })
    );

  return [...sectionDefinitions, ...looseDefinitions];
}

function seatDefinitionsForBus(busType, totalSeats, backendSeats = [], backendSeatMap = null) {
  const backendDefinitions = createDefinitionsFromBackendSeatMap(
    backendSeatMap,
    backendSeats
  );

  if (backendDefinitions.length > 0) {
    return backendDefinitions;
  }

  const layoutKind = getSeatMapLayoutKind(busType, backendSeatMap);
  const backendSeatCodes = getBackendSeatCodes(backendSeats);
  const normalizedTotalSeats = Math.max(
    1,
    backendSeatCodes.length ||
      Number(totalSeats) ||
      (layoutKind === "hybrid" ? 36 : layoutKind === "sleeper" ? 30 : 44)
  );

  if (backendSeatCodes.length > 0 && layoutKind === "seater") {
    return backendSeatCodes.map((label) => ({
      label,
      deck: "Main Deck",
      kind: "seater",
    }));
  }

  if (layoutKind === "sleeper") {
    const lowerCodes = backendSeatCodes.filter((code) => code.startsWith("L"));
    const upperCodes = backendSeatCodes.filter((code) => code.startsWith("U"));

    if (lowerCodes.length > 0 || upperCodes.length > 0) {
      return [
        ...lowerCodes.map((label) => ({ label, deck: "Lower Deck", kind: "sleeper" })),
        ...upperCodes.map((label) => ({ label, deck: "Upper Deck", kind: "sleeper" })),
      ];
    }

    const lowerCount = Math.ceil(normalizedTotalSeats / 2);
    const upperCount = normalizedTotalSeats - lowerCount;

    return [
      ...createSequentialSeats({
        count: lowerCount,
        prefix: "L",
        deck: "Lower Deck",
        kind: "sleeper",
      }),
      ...createSequentialSeats({
        count: upperCount,
        prefix: "U",
        deck: "Upper Deck",
        kind: "sleeper",
      }),
    ];
  }

  if (layoutKind === "hybrid") {
    const lowerCodes = backendSeatCodes.filter((code) => code.startsWith("L"));
    const upperCodes = backendSeatCodes.filter((code) => code.startsWith("U"));

    if (lowerCodes.length > 0 || upperCodes.length > 0) {
      return [
        ...lowerCodes.map((label, index) => ({
          label,
          displayLabel: createSeaterDisplayLabel(index, 3),
          deck: "Lower Deck",
          kind: "seater",
        })),
        ...upperCodes.map((label) => ({ label, deck: "Upper Deck", kind: "sleeper" })),
      ];
    }

    const lowerCount = Math.ceil(normalizedTotalSeats * 0.67);
    const upperCount = normalizedTotalSeats - lowerCount;

    return [
      ...createSequentialSeats({
        count: lowerCount,
        prefix: "L",
        deck: "Lower Deck",
        kind: "seater",
      }).map((seat, index) => ({
        ...seat,
        displayLabel: createSeaterDisplayLabel(index, 3),
      })),
      ...createSequentialSeats({
        count: upperCount,
        prefix: "U",
        deck: "Upper Deck",
        kind: "sleeper",
      }),
    ];
  }

  return createSequentialSeats({
    count: normalizedTotalSeats,
    prefix: "L",
    deck: "Main Deck",
    kind: "seater",
  });
}

function createFareBands(baseFare) {
  return [Math.max(0, Number(baseFare) || 0)];
}

function normalizeGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  return "";
}

function createSeatCatalog(bus) {
  const seatDefs = seatDefinitionsForBus(bus.busType, bus.totalSeats);
  const fareBands = createFareBands(bus.fare);
  const availableSeatCount = Math.max(1, Number(bus.availableSeats) || 1);
  const bookedSeatCount = Math.max(0, seatDefs.length - availableSeatCount);
  const random = createRandom(hashFromText(`${bus.id}-${bus.busNumber}-${bus.fare}`));

  const allIndexes = seatDefs.map((_, index) => index);
  const bookedIndexes = new Set();

  while (bookedIndexes.size < Math.min(bookedSeatCount, seatDefs.length - 1)) {
    const picked = allIndexes[Math.floor(random() * allIndexes.length)];
    bookedIndexes.add(picked);
  }

  const seats = seatDefs.map((definition, index) => {
    let status = "available";

    if (bookedIndexes.has(index)) {
      status = "booked";
    }

    return {
      id: `seat-${definition.label}`,
      label: definition.label,
      displayLabel: definition.displayLabel,
      deck: definition.deck,
      deckGroup: definition.deckGroup || definition.deck,
      kind: resolveKindFromBusType(bus.busType, definition.label),
      status,
      bookedGender: "",
      fare: fareBands[index % fareBands.length],
    };
  });

  return { seats, fareBands };
}

function seatRowsForDeck(seats, deckName) {
  const deckSeats = seats.filter((seat) => seat.deck === deckName);
  const firstSeat = deckSeats[0];

  if (
    deckSeats.some(
      (seat) => Number(seat?.row) > 0 && Number(seat?.column) > 0
    )
  ) {
    const rowsByNumber = new Map();
    const maxColumn =
      Math.max(
        Number(firstSeat?.columnsPerRow) || 0,
        ...deckSeats.map((seat) => Number(seat?.column) || 0)
      ) || 1;

    deckSeats.forEach((seat) => {
      const rowNumber = Number(seat?.row) || 1;
      const columnNumber = Number(seat?.column) || 1;

      if (!rowsByNumber.has(rowNumber)) {
        rowsByNumber.set(rowNumber, Array.from({ length: maxColumn }, () => null));
      }

      rowsByNumber.get(rowNumber)[columnNumber - 1] = seat;
    });

    return [...rowsByNumber.entries()]
      .sort(([firstRow], [secondRow]) => firstRow - secondRow)
      .map(([, row]) => row);
  }

  const seatsPerRow = firstSeat?.kind === "sleeper" || deckName !== "Main Deck" ? 3 : 4;

  const rows = [];
  for (let index = 0; index < deckSeats.length; index += seatsPerRow) {
    const row = deckSeats.slice(index, index + seatsPerRow);
    while (row.length < seatsPerRow) {
      row.push(null);
    }
    rows.push(row);
  }
  return rows;
}

function getAdjacentSeatLabelsFromRows(seatLabel, rows) {
  const normalizedSeatLabel = String(seatLabel || "").trim();
  if (!normalizedSeatLabel) {
    return [];
  }

  for (const row of rows) {
    const seatIndex = row.findIndex((seat) => seat?.label === normalizedSeatLabel);
    if (seatIndex === -1) {
      continue;
    }

    const rowAnchorSeat = row.find(Boolean);
    const configuredAisleAfterColumn = Number(rowAnchorSeat?.aisleAfterColumn);
    const aisleAfterIndex = Number.isFinite(configuredAisleAfterColumn)
      ? configuredAisleAfterColumn
      : row.length === 4
        ? 1
        : 0;

    return [seatIndex - 1, seatIndex + 1]
      .filter((adjacentIndex) => {
        if (adjacentIndex < 0 || adjacentIndex >= row.length || !row[adjacentIndex]) {
          return false;
        }

        return aisleAfterIndex < 0 || Math.min(seatIndex, adjacentIndex) !== aisleAfterIndex;
      })
      .map((adjacentIndex) => row[adjacentIndex].label);
  }

  return [];
}

function getAdjacentBookedGenders(seat, allSeatRows, seatsByLabel) {
  const adjacentLabels = getAdjacentSeatLabelsFromRows(seat.label, allSeatRows);
  return adjacentLabels
    .map((label) => seatsByLabel.get(label))
    .filter((adjacentSeat) => adjacentSeat?.status === "booked" && adjacentSeat?.bookedGender)
    .map((adjacentSeat) => adjacentSeat.bookedGender);
}

function formatTripDateLabel(dateValue) {
  if (!dateValue) {
    return "";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    .toUpperCase();
}

function Seat({ label }) {
  return (
    <svg
      className="seat-svg seat-svg--seater"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="seat-headrest" x="17" y="5" width="14" height="6" rx="2" />
      <rect className="seat-handle seat-handle--left" x="6" y="16" width="6" height="17" rx="2" />
      <rect className="seat-handle seat-handle--right" x="36" y="16" width="6" height="17" rx="2" />
      <rect className="seat-footrest" x="17" y="37" width="14" height="6" rx="2" />
      <rect className="seat-body" x="10" y="9" width="28" height="30" rx="4" />
      <text className="seat-label" x="24" y="27" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

function SleeperSeat({ label }) {
  return (
    <svg
      className="seat-svg seat-svg--sleeper"
      viewBox="0 0 92 40"
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="seat-body" x="4" y="5" width="84" height="30" rx="4" />
      <rect className="sleeper-pillow" x="73" y="9" width="11" height="22" rx="4" />
      <text className="seat-label" x="41" y="24" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

export default function BusSeatSelectionPage({
  embedded = false,
  embeddedState = null,
  onClose,
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const flowState = readBusBookingFlowState();
  const stateData = embeddedState || location.state || flowState || {};
  
  const bus = stateData.bus;
  const searchContext = stateData.searchContext;
  
  const [selectedSeatLabels, setSelectedSeatLabels] = useState(stateData.selectedSeatLabels || []);
  const [selectedSeatPassengers, setSelectedSeatPassengers] = useState(stateData.selectedSeatPassengers || {});
  const [selectedBoardingId, setSelectedBoardingId] = useState(stateData.selectedBoardingId || "");
  const [selectedDroppingId, setSelectedDroppingId] = useState(stateData.selectedDroppingId || "");
  const [activePointTab, setActivePointTab] = useState("boarding");
  const [activeFareFilter, setActiveFareFilter] = useState("all");
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [isSeatLayoutLoading, setIsSeatLayoutLoading] = useState(true);
  const [isFetchingSeats, setIsFetchingSeats] = useState(false);
  const [seatFetchError, setSeatFetchError] = useState("");
  const [backendSeatMap, setBackendSeatMap] = useState(null);
  const [selectionError, setSelectionError] = useState("");
  const [activeCardPanel, setActiveCardPanel] = useState(null);


  useEffect(() => {
    // Clear any previous coupon state when seat selection is loaded/reset
    writeBusBookingFlowState({
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      selectedOffer: null,
      selectedFeaturedOfferId: null,
      promotionId: null,
      pricingPreview: null,
    });
  }, []);

  useEffect(() => {
    if (!bus) return;
    writeBusBookingFlowState({
      bus,
      searchContext,
      selectedSeatLabels,
      selectedSeatPassengers,
      selectedBoardingId,
      selectedDroppingId,
    });
  }, [bus, searchContext, selectedSeatLabels, selectedSeatPassengers, selectedBoardingId, selectedDroppingId]);

  useEffect(() => {
    if (!bus) {
      return undefined;
    }

    setIsSeatLayoutLoading(true);
    setIsFetchingSeats(true);
    setSeatFetchError("");
    
    const fetchSeatMap = async () => {
      try {
        const seatMap = await getBusSeatMap(bus);
        setBackendSeatMap(seatMap);
      } catch (error) {
        console.error("Failed to fetch seat map:", error);
        setSeatFetchError("Unable to load seat map. Please try again.");
      } finally {
        setIsFetchingSeats(false);
        window.setTimeout(() => {
          setIsSeatLayoutLoading(false);
        }, 500);
      }
    };

    fetchSeatMap();

    return () => {
      // Cleanup if needed
    };
  }, [bus]);

  const seatData = useMemo(() => {
    if (!bus) {
      return { seats: [], fareBands: [] };
    }

    const backendSeats = Array.isArray(backendSeatMap?.seats)
      ? backendSeatMap.seats
      : [];

    // If we have backend seat map, use it
    if (backendSeats.length > 0) {
      // Merge backend seat data with our seat definitions
      const backendSeatsByCode = new Map();
      backendSeats.forEach((seat) => {
        backendSeatsByCode.set(
          String(seat?.seatCode || "").trim().toUpperCase(),
          seat
        );
      });

      const fareBands = [
        ...new Set(
          backendSeats
            .map((seat) => Number(seat?.fareBeforeTax) || 0)
            .map((fare, index) => fare || Number(backendSeats[index]?.priceInr) || 0)
            .filter((fare) => fare > 0)
        ),
      ].sort((first, second) => first - second);

      const seatDefs = seatDefinitionsForBus(
        bus.busType,
        bus.totalSeats,
        backendSeats,
        backendSeatMap
      );
      const mergedSeats = seatDefs.map((definition, index) => {
        const backendSeat = backendSeatsByCode.get(definition.label);
        const isBooked = backendSeat
          ? backendSeat.isBooked === true
          : false;
        const bookedGender = normalizeGender(
          backendSeat?.gender
        );
        const seatFareBeforeTax =
          Number(backendSeat?.fareBeforeTax) ||
          Number(backendSeat?.priceInr) ||
          (Number(backendSeat?.baseFare) || 0) + (Number(backendSeat?.markupAmount) || 0) ||
          Number(backendSeatMap?.priceInr) ||
          Number(bus.fare) ||
          0;
        
        // Determine status based on backend data
        let status = "available";
        if (isBooked) {
          status = "booked";
        }

        return {
          id: `seat-${definition.label}`,
          label: definition.label,
          displayLabel: definition.displayLabel,
          deck: definition.deck,
          deckGroup: definition.deckGroup || definition.deck,
          kind: resolveKindFromBusType(bus.busType, definition.label),
          position: definition.position,
          row: definition.row,
          column: definition.column,
          columnsPerRow: definition.columnsPerRow,
          aisleAfterColumn: definition.aisleAfterColumn,
          isUpper: definition.isUpper,
          status,
          bookedGender,
          seatType: backendSeat?.seatType || "",
          baseFare: Number(backendSeat?.baseFare) || seatFareBeforeTax,
          markupAmount: Number(backendSeat?.markupAmount) || 0,
          fareBeforeTax: seatFareBeforeTax,
          priceInr: Number(backendSeat?.priceInr) || seatFareBeforeTax + (Number(backendSeat?.markupAmount) || 0),
          tax: Number(backendSeat?.serviceTaxAbsolute) || Number(backendSeat?.tax) || Number(backendSeat?.gst) || 0,
          fare: seatFareBeforeTax + (Number(backendSeat?.serviceTaxAbsolute) || Number(backendSeat?.tax) || Number(backendSeat?.gst) || 0),
        };
      });

      return { seats: mergedSeats, fareBands: fareBands.length > 0 ? fareBands : createFareBands(bus.fare) };
    }

    // Fallback to generated data if backend data not available
    return createSeatCatalog(bus);
  }, [bus, backendSeatMap]);

  const seatsByLabel = useMemo(() => {
    const map = new Map();
    seatData.seats.forEach((seat) => {
      map.set(seat.label, seat);
    });

    // Fallback: if SRDV raw layout data produced seats that aren't in
    // seatData.seats (e.g. when backend returns rawLayoutData but no
    // parsed sections/seatDefinitions), parse them here so selectedSeats
    // can resolve labels clicked in the SeatSelection SRDV grid renderer.
    const rawLayout = backendSeatMap?.rawLayoutData;
    if (rawLayout) {
      const parseSrdvSeats = (container, isUpper = false) => {
        if (!container || typeof container !== "object") return;
        if (container.SeatName || container.SeatNo || container.SeatType) {
          const seatName = String(container.SeatName || container.seatName || container.SeatNo || container.label || "").trim();
          if (!seatName) return;
          const publishedFare = parseFloat(container?.Price?.PublishedFare || container?.Price?.BaseFare || container?.SeatFare || container?.fare || 0) || 0;
          const gstAmount = parseFloat(container?.Price?.Tax || container?.Price?.GSTAmount || container?.Price?.ServiceTaxAbsolute || 0) || 0;
          let trueBaseFare = parseFloat(container?.Price?.BaseFare || 0);
          if (!trueBaseFare) {
            trueBaseFare = publishedFare - gstAmount;
          }

          if (map.has(seatName)) {
            const existing = map.get(seatName);
            existing.srdvBaseFare = trueBaseFare;
            existing.srdvTax = gstAmount;
            existing.fare = publishedFare;
          } else {
            const rawSeatType = String(container.SeatType || container.seatType || "").toLowerCase();
            const isSleeper = rawSeatType.includes("sleeper") || rawSeatType.includes("berth");
            const isAvailable = String(container.SeatStatus ?? container.seatStatus ?? "true").toLowerCase() === "true";
            map.set(seatName, {
              id: `seat-${seatName}`,
              label: seatName,
              displayLabel: seatName,
              deck: isUpper ? "Upper Deck" : "Lower Deck",
              deckGroup: isUpper ? "Upper Deck" : "Lower Deck",
              kind: isSleeper ? "sleeper" : "seater",
              status: isAvailable ? "available" : "booked",
              seatType: String(container.SeatType || container.seatType || "Seater"),
              baseFare: trueBaseFare,
              markupAmount: 0,
              fareBeforeTax: publishedFare,
              tax: gstAmount,
              fare: publishedFare,
              row: parseInt(container.RowNo ?? container.rowNo ?? 0, 10),
              column: parseInt(container.ColumnNo ?? container.columnNo ?? 0, 10),
              srdvBaseFare: trueBaseFare,
              srdvTax: gstAmount,
            });
          }
          return;
        }
        const items = Array.isArray(container) ? container : Object.values(container);
        items.forEach((item) => {
          if (!item || typeof item !== "object") return;
          if (item.SeatName || item.SeatNo || item.SeatType) {
            parseSrdvSeats(item, isUpper);
          } else {
            parseSrdvSeats(item, isUpper);
          }
        });
      };
      if (rawLayout.Result) parseSrdvSeats(rawLayout.Result, false);
      if (rawLayout.ResultUpperSeat) parseSrdvSeats(rawLayout.ResultUpperSeat, true);
      if (map.size === 0) parseSrdvSeats(rawLayout, false);
    }

    return map;
  }, [seatData.seats, backendSeatMap]);

  const boardingPoints = useMemo(() => {
    if (!bus) {
      return [];
    }

    let rawPoints = Array.isArray(backendSeatMap?.boardingPoints) && backendSeatMap.boardingPoints.length > 0
      ? backendSeatMap.boardingPoints
      : Array.isArray(bus?.boardingPoints) && bus.boardingPoints.length > 0
        ? bus.boardingPoints
        : [];

    if (rawPoints.length === 0) {
      rawPoints = [{ id: "b1", name: "Main Bus Stand", address: "City Center", time: bus?.departureTime || "" }];
    }

    return rawPoints.map((point, index) => {
      const id = String(point?.Id || point?.id || `boarding-${index + 1}`);
      const name = String(point?.Name || point?.name || point?.location || point || "Boarding Point");
      const address = String(point?.Address || point?.address || point?.landmark || name);
      const time = String(point?.Time || point?.time || bus.departureTime || "");

      return { id, name, address, time };
    });
  }, [bus, backendSeatMap]);

  const droppingPoints = useMemo(() => {
    if (!bus) {
      return [];
    }

    let rawPoints = Array.isArray(backendSeatMap?.droppingPoints) && backendSeatMap.droppingPoints.length > 0
      ? backendSeatMap.droppingPoints
      : Array.isArray(bus?.droppingPoints) && bus.droppingPoints.length > 0
        ? bus.droppingPoints
        : [];

    if (rawPoints.length === 0) {
      rawPoints = [{ id: "d1", name: "Main Bus Stand", address: "City Center", time: bus?.arrivalTime || "" }];
    }

    return rawPoints.map((point, index) => {
      const id = String(point?.Id || point?.id || `dropping-${index + 1}`);
      const name = String(point?.Name || point?.name || point?.location || point || "Dropping Point");
      const address = String(point?.Address || point?.address || point?.landmark || name);
      const time = String(point?.Time || point?.time || bus.arrivalTime || "");

      return { id, name, address, time };
    });
  }, [bus, backendSeatMap]);

  const selectedSeats = useMemo(
    () =>
      selectedSeatLabels
        .map((seatLabel) => seatsByLabel.get(seatLabel))
        .filter(Boolean),
    [selectedSeatLabels, seatsByLabel]
  );

  const maxSelectableSeats = Math.min(
    6,
    Math.max(1, Number(bus?.availableSeats) || selectedSeats.length || 1)
  );

  const selectedSeatTotal = selectedSeats.reduce(
    (accumulator, seat) => accumulator + (Number(seat.priceInr) || (Number(seat.baseFare) + Number(seat.markupAmount)) || Number(seat.fareBeforeTax) || Number(seat.fare) || 0),
    0
  );

  const selectedBoarding = boardingPoints.find((point) => point.id === selectedBoardingId) || null;
  const selectedDropping = droppingPoints.find((point) => point.id === selectedDroppingId) || null;

  // Auto-select first boarding point if not selected and points are available
  useEffect(() => {
    if (!selectedBoardingId && boardingPoints.length > 0) {
      setSelectedBoardingId(boardingPoints[0].id);
    }
  }, [boardingPoints, selectedBoardingId]);

  // Auto-select first dropping point if not selected and points are available
  useEffect(() => {
    if (!selectedDroppingId && droppingPoints.length > 0) {
      setSelectedDroppingId(droppingPoints[0].id);
    }
  }, [droppingPoints, selectedDroppingId]);

  const mainDeckRows = useMemo(
    () => seatRowsForDeck(seatData.seats, "Main Deck"),
    [seatData.seats]
  );
  const upperDeckRows = useMemo(
    () => seatRowsForDeck(seatData.seats, "Upper Deck"),
    [seatData.seats]
  );
  const lowerDeckRows = useMemo(
    () => seatRowsForDeck(seatData.seats, "Lower Deck"),
    [seatData.seats]
  );
  const seatSections = useMemo(() => {
    const sectionNames = [];

    seatData.seats.forEach((seat) => {
      if (seat?.deck && !sectionNames.includes(seat.deck)) {
        sectionNames.push(seat.deck);
      }
    });

    return sectionNames.map((sectionName) => ({
      name: sectionName,
      rows: seatRowsForDeck(seatData.seats, sectionName),
      firstSeat: seatData.seats.find((seat) => seat.deck === sectionName) || null,
    }));
  }, [seatData.seats]);
  const seatDeckGroups = useMemo(() => {
    const groups = new Map();

    seatSections.forEach((section, sectionIndex) => {
      const groupName =
        String(section.firstSeat?.deckGroup || "").trim() ||
        String(section.firstSeat?.isUpper ? "Upper" : "").trim() ||
        section.name.replace(/\s+(seater|sleeper)$/i, "").trim() ||
        section.name;

      if (!groups.has(groupName)) {
        groups.set(groupName, {
          name: groupName,
          order: getDeckGroupSortValue(groupName) * 100 + sectionIndex,
          sections: [],
        });
      }

      groups.get(groupName).sections.push(section);
    });

    return [...groups.values()].sort(
      (first, second) =>
        first.order - second.order ||
        first.name.localeCompare(second.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
    );
  }, [seatSections]);
  const allSeatRows = useMemo(
    () =>
      seatSections.length > 0
        ? seatSections.flatMap((section) => section.rows)
        : [...mainDeckRows, ...lowerDeckRows, ...upperDeckRows],
    [seatSections, mainDeckRows, lowerDeckRows, upperDeckRows]
  );
  const tripDateLabel = formatTripDateLabel(
    searchContext?.date ||
      searchContext?.travelDate ||
      searchContext?.journeyDate ||
      bus.departureDate ||
      bus.travelDate ||
      bus.journeyDate
  );

  if (!bus) {
    return (
      <main className="bus-flow-page">
        <div className="bus-flow-shell">
          <section className="bus-flow-empty">
            <h2>Select a bus first</h2>
            <p>Open bus search results and click View Seats to continue booking.</p>
            <button type="button" onClick={() => navigate("/search/buses")}>
              Go to Bus Search
            </button>
          </section>
        </div>
      </main>
    );
  }

  const layoutKind = getSeatMapLayoutKind(bus.busType, backendSeatMap);
  const hasBackendSections =
    Array.isArray(backendSeatMap?.sections) && backendSeatMap.sections.length > 0;
  const hasDeckSections =
    hasBackendSections || layoutKind === "sleeper" || layoutKind === "hybrid";

  const handleSeatToggle = (seat) => {
    if (!seat || seat.status === "booked") {
      return;
    }

    setSelectionError("");
    setSelectedSeatLabels((previous) => {
      if (previous.includes(seat.label)) {
        setSelectedSeatPassengers((passengers) => {
          const updated = { ...passengers };
          delete updated[seat.label];
          return updated;
        });

        return previous.filter((label) => label !== seat.label);
      }

      if (previous.length >= maxSelectableSeats) {
        setSelectionError(`You can select up to ${maxSelectableSeats} seats in one booking.`);
        return previous;
      }

      return [...previous, seat.label];
    });
  };

  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      setSelectionError("Select at least one seat.");
      return;
    }

    if (!selectedBoarding || !selectedDropping) {
      setSelectionError("Select both boarding and dropping points.");
      return;
    }

    const b2bToken = localStorage.getItem("b2b_token");
    const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
    const activePortal = sessionStorage.getItem("active_portal");
    const isAgent = b2bToken && b2bRole === "agent" && activePortal === "b2b";

    if (!isAgent) {
      const token = localStorage.getItem("token");
      if (!token || isTokenExpired(token)) {
        openAuthModal("login");
        return;
      }
    }

    const seatCodes = selectedSeats.map((seat) => seat.label).filter(Boolean);

    // Build fareSummary directly from seat data (no API call needed here –
    // Pricing Preview requires a BlockKey which is only obtained after Block API).
    const selectedSeatsWithAdjacency = selectedSeats.map((seat) => ({
      ...seat,
      adjacentBookedGenders: getAdjacentBookedGenders(seat, allSeatRows, seatsByLabel),
    }));

    const passengers = selectedSeatsWithAdjacency.map((seat, index) => ({
      id: `p-${seat.label}-${index + 1}`,
      seatNumber: seat.label,
      fullName: "",
      gender: "",
    }));

    const seatTotal = selectedSeatsWithAdjacency.reduce(
      (sum, seat) => sum + (Number(seat.seatFare) || Number(seat.priceInr) || Number(seat.fare) || 0),
      0
    );
    const seatBaseFare = selectedSeatsWithAdjacency.reduce(
      (sum, seat) => sum + (Number(seat.baseFare) || Number(seat.seatFare) || Number(seat.fare) || 0),
      0
    );
    const seatTax = selectedSeatsWithAdjacency.reduce(
      (sum, seat) => sum + (Number(seat.tax) || Number(seat.gstAmount) || 0),
      0
    );

    const displayTotal = seatTotal;

    const flowData = {
      bus,
      searchContext,
      selectedSeatLabels,
      selectedSeatPassengers,
      selectedSeats: selectedSeatsWithAdjacency,
      passengers,
      selectedBoardingId,
      selectedDroppingId,
      boardingPoint: selectedBoarding,
      droppingPoint: selectedDropping,
      fareSummary: {
        baseFare: seatBaseFare,
        subtotalBeforeCoupon: seatBaseFare,
        couponAmount: 0,
        taxableFare: seatBaseFare,
        gstPercent: 5,
        gstAmount: seatTax,
        gstAmount: seatTax,
        tax: seatTax,
        convenienceFee: 0,
        markup: 0,
        tierDiscount: 0,
        volumeDiscount: 0,
        grandTotal: displayTotal,
        totalFare: displayTotal,
      },
      // pricingPreview is intentionally NOT set here.
      // It will be populated on the Payment page after the Block API returns a BlockKey.
    };

    writeBusBookingFlowState(flowData);
    navigate("/bus/passenger-details", { state: flowData });
  };

  const handleRetryFetchSeats = async () => {
    if (!bus) return;
    
    setIsFetchingSeats(true);
    setSeatFetchError("");
    
    try {
      const seatMap = await getBusSeatMap(bus);
      setBackendSeatMap(seatMap);
    } catch (error) {
      setSeatFetchError("Failed to load seats. Please check your connection and try again.");
    } finally {
      setIsFetchingSeats(false);
    }
  };

  const renderSeatButton = (seat) => {
    if (!seat) {
      return <span className="bus-flow-seat-gap" />;
    }

    const isSelected = selectedSeatLabels.includes(seat.label);
    const isDimmed = activeFareFilter !== "all" && Number(activeFareFilter) !== seat.fare;
    const isBookedFemale = seat.status === "booked" && seat.bookedGender === "Female";
    const isBookedMale = seat.status === "booked" && seat.bookedGender === "Male";
    const isNextToBookedFemale =
      seat.status !== "booked" &&
      (seat.bookedGender === "Female" ||
        getAdjacentSeatLabelsFromRows(seat.label, allSeatRows).some((adjacentLabel) => {
          const adjacentSeat = seatsByLabel.get(adjacentLabel);
          return adjacentSeat?.status === "booked" && adjacentSeat?.bookedGender === "Female";
        }));
    const isNextToBookedMale =
      seat.status !== "booked" &&
      (seat.bookedGender === "Male" ||
        getAdjacentSeatLabelsFromRows(seat.label, allSeatRows).some((adjacentLabel) => {
          const adjacentSeat = seatsByLabel.get(adjacentLabel);
          return adjacentSeat?.status === "booked" && adjacentSeat?.bookedGender === "Male";
        }));
    const className = [
      "bus-flow-seat",
      seat.kind === "sleeper" ? "bus-flow-seat--sleeper" : "bus-flow-seat--seater",
      `status-${seat.status}`,
      isBookedFemale ? "status-booked-female" : "",
      isBookedMale ? "status-booked-male" : "",
      isNextToBookedFemale ? "status-female-adjacent" : "",
      isNextToBookedMale ? "status-male-adjacent" : "",
      isSelected ? "status-selected" : "",
      isDimmed ? "is-dimmed" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={seat.id}
        type="button"
        className={`${className} ${seat.kind === "sleeper" ? "is-sleeper" : "is-seater"}`}
        onClick={() => handleSeatToggle(seat)}
        onMouseEnter={(event) =>
          setHoveredSeat({
            label: seat.label,
            displayLabel: seat.displayLabel,
            fare: seat.fare,
            status: seat.status,
            bookedGender: seat.bookedGender,
            isNextToBookedFemale,
            isNextToBookedMale,
            x: event.clientX,
            y: event.clientY,
          })
        }
        onMouseMove={(event) =>
          setHoveredSeat((previous) =>
            previous && previous.label === seat.label
              ? { ...previous, x: event.clientX, y: event.clientY }
              : previous
          )
        }
        onMouseLeave={() => setHoveredSeat(null)}
        disabled={seat.status === "booked" || isDimmed}
        title={`Seat No: ${seat.displayLabel || seat.label} | Fare: ${formatCurrency(
          seat.fare
        )}`}
      >
        {seat.kind === "sleeper" ? (
          <SleeperSeat label={seat.displayLabel || seat.label} />
        ) : (
          <Seat label={seat.displayLabel || seat.label} />
        )}
      </button>
    );
  };


  const renderDeckContent = (deckName, rows, deckClassName) => {
    if (rows.length === 0) {
      return (
        <section className={`bus-flow-vertical-deck ${deckClassName}`}>
          <header className="bus-flow-vertical-deck-header">
            <span>{deckName.replace(" Deck", "")}</span>
          </header>
          <div className="bus-flow-vertical-deck-body">
            <div className="bus-flow-empty-deck">No {deckName.toLowerCase()} seats</div>
          </div>
        </section>
      );
    }

    const laneCount = Math.max(...rows.map((row) => row.length), 0);
    const lanes = Array.from({ length: laneCount }, (_, laneIndex) =>
      rows.map((row) => row[laneIndex] || null)
    ).reverse();
    
    const firstSeat = rows.flat().find(Boolean);
    const configuredAisleAfterColumn = Number(firstSeat?.aisleAfterColumn);
    const aisleBeforeLane = Number.isFinite(configuredAisleAfterColumn)
      ? configuredAisleAfterColumn + 1
      : 1;
    const reversedAisleIndex = laneCount > 0 && aisleBeforeLane > 0
      ? laneCount - aisleBeforeLane
      : -1;

    return (
      <section className={`bus-flow-vertical-deck ${deckClassName}`}>
        <header className="bus-flow-vertical-deck-header">
          <span>{deckName.replace(" Deck", "")}</span>
        </header>
        <div className="bus-flow-vertical-deck-body">
          {lanes.map((lane, laneIndex) => (
            <React.Fragment key={`${deckName}-lane-${laneIndex}`}>
              {reversedAisleIndex > 0 && laneIndex === reversedAisleIndex && (
                <div className="bus-flow-vertical-aisle" />
              )}
              <div className="bus-flow-vertical-row bus-flow-lane-row">
                {lane.map((seat, seatIndex) => (
                  <React.Fragment key={`${deckName}-${laneIndex}-${seatIndex}`}>
                    {seat ? renderSeatButton(seat) : <span className="bus-flow-seat-gap" />}
                  </React.Fragment>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>
    );
  };

  const renderVerticalSection = (section) => {
    const firstSeat = section.rows.flat().find(Boolean);
    const configuredAisleAfterColumn = Number(firstSeat?.aisleAfterColumn);
    const aisleAfterColumn = Number.isFinite(configuredAisleAfterColumn)
      ? configuredAisleAfterColumn
      : -1;

    return (
      <div
        key={section.name}
        className={`bus-flow-vertical-section bus-flow-vertical-section--${
          firstSeat?.kind || "seater"
        }`}
      >
        <div className="bus-flow-vertical-section-grid">
          {section.rows.map((row, rowIndex) => (
            <div
              className="bus-flow-vertical-row"
              key={`${section.name}-row-${rowIndex}`}
            >
              {row.slice().reverse().map((seat, reversedSeatIndex) => {
                const originalSeatIndex = row.length - 1 - reversedSeatIndex;
                return (
                  <React.Fragment key={`${section.name}-${rowIndex}-${reversedSeatIndex}`}>
                    {renderSeatButton(seat)}
                    {originalSeatIndex - 1 === aisleAfterColumn && (
                      <span className="bus-flow-vertical-aisle" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBusShell = (children, showFrontLabel = false) => (
    <div className="hologram-bus-shell is-top-view">
      <span className="bus-flow-bus-wheel wheel-front-left" />
      <span className="bus-flow-bus-wheel wheel-front-right" />
      <span className="bus-flow-bus-wheel wheel-back-left" />
      <span className="bus-flow-bus-wheel wheel-back-right" />
      <div className="bus-flow-coach-front" aria-hidden="true">
        <div className="bus-flow-windshield">
          <span />
          <span />
        </div>
        <div className="bus-flow-steering">
          <svg
            viewBox="0 0 24 24"
            width="100%"
            height="100%"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" stroke="#1e293b" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="2.5" fill="#1e293b" />
            <path d="M4 12h16" stroke="#1e293b" strokeWidth="1.8" />
            <path d="M12 12v8" stroke="#1e293b" strokeWidth="1.8" />
          </svg>
        </div>
        <div className="bus-flow-driver-seat driver">
          <Seat label="" />
        </div>
        <div className="bus-flow-driver-seat helper">
          <Seat label="" />
        </div>
        {showFrontLabel && <span className="bus-flow-front-label">FRONT</span>}
      </div>
      <div className="bus-flow-coach-floor">{children}</div>
    </div>
  );

  const renderBusLayout = () => {
    if (hasDeckSections) {
      if (hasBackendSections) {
        return seatDeckGroups.map((deckGroup) => (
          <React.Fragment key={deckGroup.name}>
            {renderBusShell(
              deckGroup.sections.map((section) => renderVerticalSection(section)),
              true
            )}
          </React.Fragment>
        ));
      }
      
      return (
        <>
          {lowerDeckRows.length > 0 && (
            renderBusShell(
              renderDeckContent("Lower Deck", lowerDeckRows, "bus-flow-vertical-deck--lower bus-flow-sleeper-lower-deck")
            )
          )}
          {upperDeckRows.length > 0 && (
            renderBusShell(
              renderDeckContent("Upper Deck", upperDeckRows, "bus-flow-vertical-deck--upper")
            )
          )}
        </>
      );
    }

    return renderBusShell(
      <section className="bus-flow-vertical-deck bus-flow-seater-deck bus-flow-vertical-deck--main">
        <header className="bus-flow-vertical-deck-header">
          <span>MAIN</span>
        </header>
        <div className="bus-flow-vertical-deck-body">
          <div className="bus-flow-vertical-row bus-flow-main-seat-grid">
            {mainDeckRows.map((row, rowIndex) => (
              <React.Fragment key={`main-${rowIndex}`}>
                {renderSeatButton(row[0])}
                {renderSeatButton(row[1])}
                <span className="bus-flow-vertical-aisle" />
                {renderSeatButton(row[2])}
                {renderSeatButton(row[3])}
              </React.Fragment>
            ))}
            </div>
        </div>
      </section>,
      true
    );
  };

  return (
    <main className={`bus-flow-page${embedded ? " bus-flow-page--embedded" : ""}`}>
      <div className="bus-flow-shell" style={embedded ? { minWidth: 0 } : {}}>
        {!embedded && (
        <section className="bus-flow-summary-card">
          <div className="bus-flow-trip-strip">
            <article className="bus-flow-operator-cell">
              <strong>{bus.operatorName}</strong>
              <span>{bus.busType}</span>
            </article>
            <article className="bus-flow-time-cell">
              <strong>
                {bus.departureTime}
                {tripDateLabel && <small>{tripDateLabel}</small>}
              </strong>
              <span>{bus.fromCity}</span>
            </article>
            <article className="bus-flow-duration-cell">
              <span>{bus.duration}</span>
              <i />
            </article>
            <article className="bus-flow-time-cell">
              <strong>
                {bus.arrivalTime}
                {tripDateLabel && <small>{tripDateLabel}</small>}
              </strong>
              <span>{bus.toCity}</span>
            </article>
            <article className="bus-flow-price-cell">
              <span>Starts from</span>
              <strong>{formatCurrency(bus.fare)}</strong>
            </article>
            <article className="bus-flow-seat-count-cell">
              <strong>{bus.availableSeats} Seats Available</strong>
            </article>
          </div>
          <div className="bus-flow-summary-actions">
            <button
              type="button"
              className={activeCardPanel === "boarding" ? "active" : ""}
              onClick={() => setActiveCardPanel(activeCardPanel === "boarding" ? null : "boarding")}
            >
              Boarding & Dropping Points
            </button>
            <button
              type="button"
              className={activeCardPanel === "policy" ? "active" : ""}
              onClick={() => setActiveCardPanel(activeCardPanel === "policy" ? null : "policy")}
            >
              Cancellation Policies
            </button>
            <button
              type="button"
              className="active"
              onClick={() => (embedded ? onClose?.() : navigate(-1))}
            >
              {isSeatLayoutLoading ? "VIEW SEATS" : "HIDE SEAT"}
            </button>
          </div>
          {activeCardPanel && (
            <div className="bus-flow-expand-panel">
              {activeCardPanel === "boarding" ? (
                <p>
                  Boarding Point: <strong>{bus.boardingPoint}</strong> | Dropping Point:{" "}
                  <strong>{bus.droppingPoint}</strong>
                </p>
              ) : (
                <p>
                  Free cancellation available up to 6 hours before departure. Partial refund
                  may apply afterwards.
                </p>
              )}
            </div>
          )}
        </section>
        )}

        {isSeatLayoutLoading || isFetchingSeats ? (
          <section className="bus-flow-seat-loader">
            <div className="loader-bars" aria-label="Loading seats">
              <span />
              <span />
              <span />
            </div>
            <p className="bus-flow-loader-text">
              {isFetchingSeats ? "Fetching live seat availability..." : "Loading seat layout..."}
            </p>
          </section>
        ) : seatFetchError ? (
          <section className="bus-flow-seat-error">
            <div className="error-content">
              <Info size={32} />
              <h3>Unable to Load Seats</h3>
              <p>{seatFetchError}</p>
              <button type="button" onClick={handleRetryFetchSeats}>
                Try Again
              </button>
            </div>
          </section>
        ) : (
          <section className="bus-flow-seat-layout">
            <div className="bus-flow-seat-zone">
              <header className="bus-flow-seat-top">
                <div className="bus-flow-fares">
                  <div className="bus-flow-fares-head">
                    <h3>{bus.availableSeats} Seats Available</h3>
                    <button type="button" className="bus-flow-info-btn" title="Seat Information">
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="bus-flow-fare-chips">
                    <button
                      type="button"
                      className={activeFareFilter === "all" ? "active" : ""}
                      onClick={() => setActiveFareFilter("all")}
                    >
                      All
                    </button>
                    {seatData.fareBands.map((fare) => (
                      <button
                        type="button"
                        key={fare}
                        className={Number(activeFareFilter) === fare ? "active" : ""}
                        onClick={() => setActiveFareFilter(fare)}
                      >
                        {formatCurrency(fare)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bus-flow-seat-legend">
                  <div className="legend-item">
                    <div className="legend-color available" />
                    <span>Available</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color selected" />
                    <span>Selected</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color booked" />
                    <span>Booked</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color booked-female" />
                    <span>Female</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color booked-male" />
                    <span>Male</span>
                  </div>
                </div>
              </header>

              <div className="modern-seat-layout-wrapper">
                <SeatSelection
                  vehicleType="bus"
                  seatData={backendSeatMap?.rawLayoutData || null}
                  layoutKind={layoutKind}
                  hasDeckSections={hasDeckSections}
                  hasBackendSections={hasBackendSections}
                  seatDeckGroups={seatDeckGroups}
                  lowerDeckRows={lowerDeckRows}
                  upperDeckRows={upperDeckRows}
                  mainDeckRows={mainDeckRows}
                  selectedSeatLabels={selectedSeatLabels}
                  activeFareFilter={activeFareFilter}
                  onSeatToggle={handleSeatToggle}
                  onSeatHover={setHoveredSeat}
                  onSeatMouseLeave={() => setHoveredSeat(null)}
                  allSeatRows={allSeatRows}
                  seatsByLabel={seatsByLabel}
                />
              </div>

              {hoveredSeat && (
                <div
                  className="bus-flow-seat-tooltip"
                  style={{
                    left: `${Math.min(window.innerWidth - 190, hoveredSeat.x + 14)}px`,
                    top: `${Math.max(8, hoveredSeat.y - 34)}px`,
                  }}
                >
                  Seat No: {hoveredSeat.displayLabel || hoveredSeat.label} |{" "}
                  {hoveredSeat.status === "booked" && hoveredSeat.bookedGender === "Female" && "Female Booked | "}
                  {hoveredSeat.status === "booked" && hoveredSeat.bookedGender === "Male" && "Male Booked | "}
                  {hoveredSeat.status !== "booked" && hoveredSeat.bookedGender === "Female" && "Female Available | "}
                  {hoveredSeat.status !== "booked" && hoveredSeat.bookedGender === "Male" && "Male Available | "}
                  {hoveredSeat.status !== "booked" && hoveredSeat.bookedGender !== "Female" && hoveredSeat.isNextToBookedFemale && "Beside Female Seat | "}
                  {hoveredSeat.status !== "booked" && hoveredSeat.bookedGender !== "Male" && hoveredSeat.isNextToBookedMale && "Beside Male Seat | "}
                  Fare: {formatCurrency(hoveredSeat.fare)}
                </div>
              )}
            </div>

            <aside className="bus-flow-point-panel">
              <h3>Select Boarding & Dropping</h3>

              <div className="point-tabs">
                <button
                  type="button"
                  className={activePointTab === "boarding" ? "active" : ""}
                  onClick={() => setActivePointTab("boarding")}
                >
                  Boarding
                </button>
                <button
                  type="button"
                  className={activePointTab === "dropping" ? "active" : ""}
                  onClick={() => setActivePointTab("dropping")}
                >
                  Dropping
                </button>
              </div>

              <div className="point-list">
                {(activePointTab === "boarding" ? boardingPoints : droppingPoints).map((point) => {
                  const checked =
                    activePointTab === "boarding"
                      ? selectedBoardingId === point.id
                      : selectedDroppingId === point.id;

                  return (
                    <button
                      type="button"
                      key={point.id}
                      className={`point-item ${checked ? "selected" : ""}`}
                      onClick={() => {
                        if (activePointTab === "boarding") {
                          setSelectedBoardingId(point.id);
                          setActivePointTab("dropping");
                        } else {
                          setSelectedDroppingId(point.id);
                        }
                      }}
                    >
                      <i />
                      <div>
                        <strong>{point.name}</strong>
                        <span>{point.address}</span>
                      </div>
                      <small>
                        <Clock3 size={14} />
                        {point.time}
                      </small>
                    </button>
                  );
                })}
              </div>

              <div className="selected-seat-summary">
                <h4>Selected Seats</h4>
                <strong>{formatCurrency(selectedSeatTotal)}</strong>
              </div>

              <div className="selected-seat-list">
                {selectedSeats.length === 0 ? (
                  "No Seats selected yet"
                ) : (
                  selectedSeats.map((seat) => (
                    <div key={seat.label} className="selected-seat-row">
                      <span className="seat-label-text">{seat.label}</span>
                    </div>
                  ))
                )}
              </div>

              {selectionError && (
                <p className="flow-error">
                  <Info size={14} />
                  {selectionError}
                </p>
              )}

              <button
                type="button"
                className="flow-continue-btn"
                disabled={selectedSeats.length === 0 || !selectedBoarding || !selectedDropping}
                onClick={handleContinue}
              >
                Continue
              </button>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
