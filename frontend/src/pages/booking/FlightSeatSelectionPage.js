/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  CircleDot,
  Clock3,
  Info,
  Loader2,
  Luggage,
  Plane,
  Utensils,
  Check,
  X,
  ShieldCheck,
  User,
  ArrowRight,
  ArrowLeft,
  Maximize2
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BookingConfirmationModal from "../../components/booking/BookingConfirmationModal";
import AircraftSeatMap, {
  getTierSeatColors,
  getTierBaseColor,
  NON_PRICE_COLORS,
  SymbolBadge,
  getSymbolMeta,
} from "../../components/booking/AircraftSeatMap";
import CabinSymbol from "../../components/booking/CabinSymbol";
import { normalizeSeatMap, getCachedNormalizedSeatMap } from "../../utils/normalizeSeatMap";
import "../../STYLES/FlightBookingFlow.css";
import "../../STYLES/FlightSeatSelection.css";
import { getFlightSeatMap, getFlightSSR } from "../../services/flightBookingService";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { normalizeCabinClass } from "../../utils/seatMapUtils";
import BookingTimer from "./BookingTimer";
import FlightStepperHeader from "../../components/booking/FlightStepperHeader";
import { CityAirportDisplay } from "../../components/flights";

function formatCurrency(amount) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0))}`;
}

function parseTravellerSummary(summary) {
  const text = String(summary || "");
  const adults = Number((text.match(/(\d+)\s*Adult/i) || [])[1] || 1);
  const children = Number((text.match(/(\d+)\s*Child/i) || [])[1] || 0);
  const infants = Number((text.match(/(\d+)\s*Infant/i) || [])[1] || 0);

  return {
    children,
    infants,
    seatRequired: Math.max(1, adults + children),
  };
}

function getZoneName(travelClass) {
  const normalized = String(travelClass || "").toLowerCase();

  if (normalized.includes("first")) {
    return "First Suite";
  }

  if (normalized.includes("business")) {
    return "Business Cabin";
  }

  if (normalized.includes("premium economy")) {
    return "Premium Economy";
  }

  return "";
}

function parseSeatCode(seatCode) {
  const cleaned = String(seatCode || "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, "");

  // Standard format: 12A
  let match = cleaned.match(/^(\d+)([A-Z]+)$/);
  if (match) {
    const rowNum = Number(match[1]);
    return {
      rowNumber: rowNum,
      seatLetter: match[2],
      label: `${rowNum}${match[2]}`,
    };
  }

  // Inverted format: A12
  match = cleaned.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const rowNum = Number(match[2]);
    return {
      rowNumber: rowNum,
      seatLetter: match[1],
      label: `${rowNum}${match[1]}`,
    };
  }

  return null;
}

function getSeatType(seatLetter, seatLetters) {
  const index = seatLetters.indexOf(seatLetter);
  if (index === 0 || index === seatLetters.length - 1) {
    return "window";
  }
  const half = Math.ceil(seatLetters.length / 2);
  if (index === half - 1 || index === half) {
    return "aisle";
  }
  return "middle";
}

function buildCabinFromSeatMap(seatMap, travelClass) {
  if (!seatMap || !Array.isArray(seatMap.seats)) {
    return null;
  }

  // Show ALL seats — no cabin filtering
  const parsedSeats = seatMap.seats
    .map((seat) => {
      // Support both PascalCase (SRDV API) and camelCase field names
      let seatLabel = String(seat?.SeatNumber || seat?.seatNumber || seat?.SeatNo || seat?.seatNo || seat?.seatCode || seat?.Code || seat?.label || "").trim();

      // Some APIs append 'SeKey...' to the code. Strip it if we had to fall back to Code.
      if (seatLabel.includes("SeKey")) {
        seatLabel = seatLabel.split("SeKey")[0];
      }

      const parsed = parseSeatCode(seatLabel);
      if (!parsed) {
        return null;
      }

      const isBooked = [
        "booked", "blocked", "unavailable", "reserved"
      ].includes(String(seat.status || seat.Status || "").toLowerCase());

      const raw = seat?.rawSeat || seat;
      const isExit = Boolean(
        seat?.isExit ||
        raw?.IsExitRow === true ||
        raw?.isExitRow === true ||
        raw?.ExitRow === true ||
        raw?.Exit === true ||
        raw?.IsEmergencyExit === true ||
        raw?.isEmergencyExit === true ||
        raw?.IsEmergency === true ||
        raw?.isEmergency === true ||
        raw?.IsLegroom === true ||
        raw?.isLegroom === true ||
        (typeof raw?.Description === "string" && raw.Description.toLowerCase().includes("exit")) ||
        (typeof raw?.SeatDescription === "string" && raw.SeatDescription.toLowerCase().includes("exit")) ||
        (typeof raw?.SeatType === "string" && raw.SeatType.toLowerCase().includes("exit")) ||
        (typeof raw?.SeatClassification === "string" && raw.SeatClassification.toLowerCase().includes("exit")) ||
        (typeof raw?.Remarks === "string" && raw.Remarks.toLowerCase().includes("exit")) ||
        (typeof raw?.SeatCharacteristic === "string" && (raw.SeatCharacteristic.includes("E") || raw.SeatCharacteristic.toLowerCase().includes("exit"))) ||
        (Array.isArray(raw?.SeatCharacteristic) && raw.SeatCharacteristic.some(c => String(c).toUpperCase() === "E" || String(c).toLowerCase().includes("exit")))
      );

      const isWing = Boolean(
        seat?.isWing ||
        raw?.IsWing === true ||
        raw?.isWing === true ||
        raw?.IsOverWing === true ||
        raw?.isOverWing === true ||
        raw?.OverWing === true ||
        raw?.Wing === true ||
        (typeof raw?.Description === "string" && raw.Description.toLowerCase().includes("wing")) ||
        (typeof raw?.SeatDescription === "string" && raw.SeatDescription.toLowerCase().includes("wing")) ||
        (typeof raw?.SeatType === "string" && raw.SeatType.toLowerCase().includes("wing")) ||
        (typeof raw?.SeatClassification === "string" && raw.SeatClassification.toLowerCase().includes("wing")) ||
        (typeof raw?.SeatCharacteristic === "string" && (raw.SeatCharacteristic.toLowerCase().includes("wing") || raw.SeatCharacteristic.toLowerCase().includes("ow"))) ||
        (Array.isArray(raw?.SeatCharacteristic) && raw.SeatCharacteristic.some(c => String(c).toLowerCase().includes("wing") || String(c).toUpperCase() === "OW"))
      );

      return {
        ...parsed,
        isBooked,
        isExit,
        isWing,
        isLegroom: isExit,
        isAisleSeat: Boolean(raw?.IsAisle ?? raw?.isAisle ?? seat?.isAisle),
        amount: Number(seat?.Amount ?? seat?.amount ?? seat?.Price ?? seat?.price ?? 0),
        rawApiSeat: raw,
      };
    })
    .filter(Boolean);

  if (parsedSeats.length === 0) {
    return null;
  }

  const rows = Array.from(
    new Set(parsedSeats.map((seat) => seat.rowNumber).filter(Number.isFinite))
  ).sort((a, b) => a - b);
  const seatLetters = Array.from(
    new Set(parsedSeats.map((seat) => seat.seatLetter).filter(Boolean))
  ).sort();

  // Extract Emergency Exit rows directly from API seat data
  const extraLegroomRows = new Set(
    parsedSeats.filter(s => s.isExit).map(s => s.rowNumber)
  );

  // If supplier omitted explicit exit flags, commercial narrowbody aircraft exit rows are typically 12 & 13
  if (extraLegroomRows.size === 0 && rows.length >= 15) {
    if (rows.includes(12)) extraLegroomRows.add(12);
    if (rows.includes(13)) extraLegroomRows.add(13);
    if (extraLegroomRows.size === 0) {
      const mid = rows[Math.floor(rows.length * 0.45)];
      if (mid) extraLegroomRows.add(mid);
    }
  }

  // Calculate wing rows (based on API wing flags or emergency exit rows)
  const apiWingRows = new Set(
    parsedSeats.filter(s => s.isWing).map(s => s.rowNumber)
  );
  let wingStartRow = null;
  let wingEndRow = null;

  if (apiWingRows.size >= 3 && apiWingRows.size <= rows.length * 0.6) {
    const sortedWing = Array.from(apiWingRows).sort((a, b) => a - b);
    wingStartRow = sortedWing[0];
    wingEndRow = sortedWing[sortedWing.length - 1];
  } else if (extraLegroomRows.size > 0) {
    const sortedExit = Array.from(extraLegroomRows).sort((a, b) => a - b);
    const minExit = sortedExit[0];
    const maxExit = sortedExit[sortedExit.length - 1];
    // Commercial aircraft wings span 7 rows ahead of exit and 4 rows behind exit
    wingStartRow = Math.max(rows[0] || 1, Math.min(minExit - 7, 10));
    wingEndRow = Math.min(rows[rows.length - 1] || 32, Math.max(maxExit + 4, 22));
  } else {
    const totalR = rows.length;
    wingStartRow = rows[Math.floor(totalR * 0.3)] || 10;
    wingEndRow = rows[Math.floor(totalR * 0.68)] || 22;
  }

  const seats = parsedSeats.map((seat) => {
    const isExtraLegroom = seat.isExit || extraLegroomRows.has(seat.rowNumber);
    let status = "available";

    if (seat.isBooked) {
      status = "booked";
    } else if (isExtraLegroom) {
      status = "extra";
    }

    const type = seat.isAisleSeat ? "aisle" : getSeatType(seat.seatLetter, seatLetters);

    return {
      id: seat.label,
      label: seat.label,
      rowNumber: seat.rowNumber,
      seatLetter: seat.seatLetter,
      status,
      isExtraLegroom,
      isExit: isExtraLegroom,
      isWing: seat.isWing,
      isWindow: type === "window",
      isAisle: type === "aisle",
      isMiddle: type === "middle",
      amount: seat.amount,
      rawApiSeat: seat.rawApiSeat,
    };
  });

  return {
    rows,
    seatLetters,
    extraLegroomRows,
    wingStartRow,
    wingEndRow,
    zoneName: getZoneName(travelClass || seatMap.travelClass),
    travelClass: travelClass || "",
    seats,
    meta: {
      totalSeats: Number(seatMap.totalSeats || 0) || seats.length,
      availableSeats: Number(seatMap.availableSeats || 0),
      bookedSeats: Number(seatMap.bookedSeats || 0),
    },
  };
}

function getSeatSurcharge(seat) {
  return Number(seat?.amount ?? seat?.price ?? 0);
}

export default function FlightSeatSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const flight = flowState.flight || null;
  const searchContext = flowState.searchContext || null;
  const travellers = parseTravellerSummary(searchContext?.travellers);
  const travelClass =
    flight?.className || searchContext?.cabinClass || "";

  const [selectedSeatsBySegment, setSelectedSeatsBySegment] = useState(
    {}
  );
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(location.state?.activeSegmentIndex ?? 0);

  const handleRestartSearch = () => {
    if (!searchContext) {
      navigate("/search/flights");
      return;
    }
    const qs = new URLSearchParams();
    if (searchContext.source) qs.set("source", searchContext.source);
    if (searchContext.destination) qs.set("destination", searchContext.destination);
    if (searchContext.tripType) qs.set("tripType", searchContext.tripType);
    if (searchContext.cabinClass) qs.set("cabinClass", searchContext.cabinClass);
    if (searchContext.travellers) qs.set("travellers", searchContext.travellers);
    if (searchContext.departureDate) qs.set("departureDate", searchContext.departureDate);
    if (searchContext.returnDate) qs.set("returnDate", searchContext.returnDate);
    if (searchContext.multiCityLegs) {
      try {
        qs.set(
          "multiCityLegs",
          typeof searchContext.multiCityLegs === "string"
            ? searchContext.multiCityLegs
            : JSON.stringify(searchContext.multiCityLegs)
        );
      } catch { }
    }
    navigate(`/search/flights?${qs.toString()}`, { state: searchContext });
  };

  const handleBackToReviewAndTraveller = () => {
    const updatedState = {
      ...flowState,
      selectedSeatsBySegment,
      selectedSeatLabels,
      selectedSeats,
      mealPreference,
      baggagePlan,
      selectedMeal,
      selectedBaggage,
      travelAssistanceAdded,
      zeroCancellationAdded,
    };
    writeFlightBookingFlowState(updatedState);
    navigate("/flight/passenger-details", { state: updatedState });
  };

  const [seatMapCabinByLeg, setSeatMapCabinByLeg] = useState({});
  const [seatMapRawByLeg, setSeatMapRawByLeg] = useState({});
  const [ssrOptionsByLeg, setSsrOptionsByLeg] = useState({});

  const effectiveLegs = useMemo(() => {
    const isTwoWay = flowState.isTwoWay || ["twoway", "roundtrip", "round", "2"].includes(String(searchContext?.tripType || flowState.tripType || "").toLowerCase());
    const returnFlightResolved = flowState.returnFlight || flowState.selectedLegs?.[1] || flowState.legs?.[1] || null;

    let journeys = [];
    if (Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0) {
      journeys = [...flowState.selectedLegs];
    } else if (Array.isArray(flowState.legs) && flowState.legs.length > 0) {
      journeys = [...flowState.legs];
    } else {
      journeys = [flowState.flight, returnFlightResolved].filter(Boolean);
    }

    if (isTwoWay && journeys.length === 1 && returnFlightResolved) {
      journeys.push(returnFlightResolved);
    }

    return journeys.flatMap((journey, journeyIdx) => {
      let rawSegments =
        journey.segments ||
        journey.Segments ||
        flowState.fareQuote?.results?.Segments?.[journeyIdx] ||
        flowState.fareQuote?.results?.Segments?.[0] ||
        journey.FareDataMultiple?.[0]?.FareSegments ||
        journey.fareSegments ||
        [];
      if (Array.isArray(rawSegments) && rawSegments.length === 1 && Array.isArray(rawSegments[0])) {
        rawSegments = rawSegments[0];
      }
      const legs = Array.isArray(rawSegments) ? rawSegments.flat(Infinity) : [];
      return legs.length ? legs.map((segment, segIdx) => ({
        ...journey,
        sourceCode: segment.Origin?.Airport?.AirportCode || segment.Origin?.AirportCode || segment.FromAirportCode || segment.fromAirportCode || journey.sourceCode,
        destinationCode: segment.Destination?.Airport?.AirportCode || segment.Destination?.AirportCode || segment.ToAirportCode || segment.toAirportCode || journey.destinationCode,
        fromCity: segment.Origin?.Airport?.CityName || segment.Origin?.CityName || segment.FromCity || segment.fromCity || journey.fromCity,
        toCity: segment.Destination?.Airport?.CityName || segment.Destination?.CityName || segment.ToCity || segment.toCity || journey.toCity,
        airlineCode: segment.Airline?.AirlineCode || segment.AirlineCode || journey.airlineCode,
        flightNumber: segment.Airline?.FlightNumber || segment.FlightNumber || journey.flightNumber,
        sectorIndex: segIdx,
        journeyIndex: journeyIdx,
        isReturnLeg: journeyIdx > 0 && isTwoWay,
      })) : [{
        ...journey,
        sectorIndex: 0,
        journeyIndex: journeyIdx,
        isReturnLeg: journeyIdx > 0 && isTwoWay,
      }];
    });
  }, [flowState, searchContext]);
  const segments = effectiveLegs.map(leg => (leg.sourceCode || leg.fromAirportCode || "") + "-" + (leg.destinationCode || leg.toAirportCode || ""));

  const currentLeg = effectiveLegs[activeSegmentIndex] || flight;
  const displayedLeg = currentLeg || flight || {};

  const flattenSeatEntries = (value) => {
    if (Array.isArray(value)) {
      return value.flat(Infinity);
    }
    if (!value || typeof value !== "object") {
      return [];
    }
    return Object.values(value).flatMap((entry) => flattenSeatEntries(entry));
  };

  const selectedSeatLabels = useMemo(() => {
    const legSeats = selectedSeatsBySegment[activeSegmentIndex] || [];
    return legSeats.map((s) => s.label);
  }, [selectedSeatsBySegment, activeSegmentIndex]);

  const [extrasBySegment, setExtrasBySegment] = useState({});
  const mealPreference = extrasBySegment[activeSegmentIndex]?.meal || "none";
  const baggagePlan = extrasBySegment[activeSegmentIndex]?.baggage || "none";
  const setMealPreference = meal => setExtrasBySegment(previous => ({ ...previous, [activeSegmentIndex]: { ...previous[activeSegmentIndex], meal } }));
  const setBaggagePlan = baggage => setExtrasBySegment(previous => ({ ...previous, [activeSegmentIndex]: { ...previous[activeSegmentIndex], baggage } }));
  const [selectionError, setSelectionError] = useState("");
  const [seatMapError, setSeatMapError] = useState("");
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("seat");
  const [activeSeatFilter, setActiveSeatFilter] = useState(null);
  const [priceFiltersBySegment, setPriceFiltersBySegment] = useState({});
  const [isFitToScreen, setIsFitToScreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);
  const [palette, setPalette] = useState("spectrum");
  const [seatFill, setSeatFill] = useState("tinted");
  const [tappedSeat, setTappedSeat] = useState(null);
  const mapContainerRef = useRef(null);
  const seatMapRef = useRef(null);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el) {
        setContainerWidth(el.clientWidth || 800);
      }
    };
    updateSize();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          setContainerWidth(el.clientWidth || entry.contentRect.width || 800);
        } else {
          setContainerWidth(entry.contentRect.width || 800);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isVertical = !isFitToScreen && containerWidth < 560;

  const activeFilters = useMemo(() => {
    const list = priceFiltersBySegment[activeSegmentIndex];
    return new Set(list || []);
  }, [priceFiltersBySegment, activeSegmentIndex]);

  const handleTogglePriceFilter = (val) => {
    setPriceFiltersBySegment((prev) => {
      const current = new Set(prev[activeSegmentIndex] || []);
      if (val === "ALL") {
        current.clear();
      } else {
        if (current.has(val)) {
          current.delete(val);
        } else {
          current.add(val);
        }
      }
      return { ...prev, [activeSegmentIndex]: Array.from(current) };
    });
  };

  const travelAssistanceAdded = false;
  const zeroCancellationAdded = false;
  const [activeInsuranceTerms, setActiveInsuranceTerms] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState(null);

  const handleFilterToggle = (filterType) => {
    setActiveSeatFilter((prev) => (prev === filterType ? null : filterType));
  };

  const doesSeatMatchFilter = (seat, filter) => {
    if (!seat) return false;
    const isSelected = selectedSeatLabels.includes(seat.label);
    const isBooked = seat.status === "booked" || seat.isBooked;

    switch (filter) {
      case "middle_free":
        return seat.isMiddle && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "standard_window":
        return seat.isWindow && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "standard_aisle":
        return seat.isAisle && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "preferred":
        return !seat.isExtraLegroom && seat.rowNumber <= 12 && !isBooked && !isSelected;
      case "extra":
        return seat.isExtraLegroom && !isBooked && !isSelected;
      case "booked":
        return isBooked;
      case "selected":
        return isSelected;
      default:
        return true;
    }
  };

  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });

  const handleSeatMouseEnter = (event, seat) => {
    if (isVertical) {
      // On phones/touch devices, no hover tooltip
      return;
    }
    if (event && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left + 14;
      const y = event.clientY - rect.top - 96;
      setTooltipCoords({ x, y });
    }
    setHoveredSeat(seat);
  };

  const handleSeatMouseLeave = () => {
    setHoveredSeat(null);
  };

  const getSeatCategoryName = (seat) => {
    if (!seat) return "";
    if (seat.isEmergencyExit) return "Emergency Exit";
    if (seat.isExitRow) return "Exit Row (Extra Legroom)";
    if (seat.isBassinet) return "Bassinet Seat";
    if (seat.cabin) return `${seat.cabin} Seat`;
    if (seat.rowNumber <= 12) return "Preferred Seat";
    return "Standard Seat";
  };

  const getSeatCategoryClass = (seat) => {
    if (!seat) return "standard";
    if (seat.isEmergencyExit || seat.isExitRow) return "extra";
    if (seat.rowNumber <= 12) return "preferred";
    return "standard";
  };

  useEffect(() => {
    if (!flight) {
      return;
    }

    writeFlightBookingFlowState({
      ...flowState,
      flight,
      searchContext,
    });
  }, [flight, searchContext]);

  useEffect(() => {
    let isCurrent = true;

    if (!currentLeg?.id && !currentLeg?.resultIndex && !currentLeg?.ResultIndex) {
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    // Resolve leg-specific ResultIndex:
    // For MultiCity / RoundTrip, each leg MUST query SeatMap with its own individual sector ResultIndex.
    let resolvedResultIndex = currentLeg.ResultIndex || currentLeg.resultIndex || "";
    if (resolvedResultIndex.includes(",")) {
      const parts = resolvedResultIndex.split(",").map(p => p.trim());
      resolvedResultIndex = parts[currentLeg.journeyIndex ?? activeSegmentIndex] || parts[activeSegmentIndex] || parts[0];
    }
    if (!resolvedResultIndex || /^(flight-|flt-)/.test(resolvedResultIndex)) {
      if (currentLeg.journeyIndex !== undefined && flowState.selectedLegs?.[currentLeg.journeyIndex]) {
        const targetJourney = flowState.selectedLegs[currentLeg.journeyIndex];
        resolvedResultIndex = targetJourney.ResultIndex || targetJourney.resultIndex || "";
      } else if (currentLeg.isReturnLeg && flowState.returnFlight) {
        resolvedResultIndex = flowState.returnFlight.ResultIndex || flowState.returnFlight.resultIndex || "";
      } else if (flowState.selectedLegs?.[activeSegmentIndex]) {
        resolvedResultIndex = flowState.selectedLegs[activeSegmentIndex].ResultIndex || flowState.selectedLegs[activeSegmentIndex].resultIndex || "";
      } else if (flowState.legs?.[activeSegmentIndex]) {
        resolvedResultIndex = flowState.legs[activeSegmentIndex].ResultIndex || flowState.legs[activeSegmentIndex].resultIndex || "";
      }
    }
    if (!resolvedResultIndex || /^(flight-|flt-)/.test(resolvedResultIndex)) {
      const globalResultIndex = flowState.ResultIndex || flowState.resultIndex || "";
      if (globalResultIndex.includes(",")) {
        const parts = globalResultIndex.split(",").map(p => p.trim());
        resolvedResultIndex = parts[currentLeg.journeyIndex ?? activeSegmentIndex] || parts[activeSegmentIndex] || parts[0];
      } else {
        resolvedResultIndex = globalResultIndex;
      }
    }

    const resolvedTraceId =
      currentLeg.traceId ||
      currentLeg.TraceId ||
      flowState.TraceId ||
      flowState.traceId ||
      flowState.fareQuote?.identity?.TraceId ||
      flowState.fareQuote?.identity?.traceId ||
      flowState.searchContext?.traceId ||
      flowState.searchContext?.TraceId ||
      (typeof window !== "undefined"
        ? (window.sessionStorage.getItem("flight_trace_id") ||
          window.sessionStorage.getItem("TraceId") ||
          window.sessionStorage.getItem("flight_search_trace_id"))
        : null);

    const resolvedSrdvType = (
      currentLeg.srdvType ||
      currentLeg.SrdvType ||
      flowState.srdvType ||
      flowState.fareQuote?.identity?.SrdvType ||
      "MixAPI"
    ).trim();

    const resolvedSrdvIndex = (
      currentLeg.srdvIndex ||
      currentLeg.SrdvIndex ||
      flowState.srdvIndex ||
      flowState.fareQuote?.identity?.SrdvIndex ||
      (resolvedResultIndex.includes("_") ? resolvedResultIndex.split("_")[0] : "1")
    ).trim();

    const hasValidTraceId = /^[1-9]\d*$/.test(String(resolvedTraceId || "").trim());
    const hasValidResultIndex = !!(resolvedResultIndex) &&
      !/^(flight-|flt-)/.test(String(resolvedResultIndex || "").trim());

    if (!hasValidTraceId || !hasValidResultIndex) {
      console.warn("[SeatMap/SSR] Skipping API call — missing valid TraceId or ResultIndex:", {
        traceId: resolvedTraceId, resultIndex: resolvedResultIndex,
      });
      setIsSeatMapLoading(false);
      setSsrOptionsByLeg(prev => ({ ...prev, [activeSegmentIndex]: { baggage: [], meal: [] } }));
      setSeatMapError("Seat map not available for this leg");
      return () => { isCurrent = false; };
    }

    // Check if we already fetched seat map for this leg
    if (seatMapCabinByLeg[activeSegmentIndex]) {
      setIsSeatMapLoading(false);
      setSeatMapError("");
      return () => {
        isCurrent = false;
      };
    }

    setIsSeatMapLoading(true);
    setSeatMapError("");

    (async () => {
      try {
        // Query seat map and SSR per physical leg
        const legPayload = {
          ...currentLeg,
          TraceId: Number(resolvedTraceId),
          traceId: Number(resolvedTraceId),
          ResultIndex: resolvedResultIndex,
          resultIndex: resolvedResultIndex,
          SrdvType: resolvedSrdvType,
          srdvType: resolvedSrdvType,
          SrdvIndex: resolvedSrdvIndex,
          srdvIndex: resolvedSrdvIndex,
          journeyType: 1
        };
        const [seatMap, ssr] = await Promise.all([
          getFlightSeatMap(legPayload),
          getFlightSSR(legPayload)
        ]);
        if (!isCurrent) return;

        console.log("[SeatMap] raw response:", seatMap);
        console.log("[SSR] raw response:", ssr);

        // The service already returns normalized baggage/meal arrays in ssr.baggage and ssr.meal.
        // Fall back to raw arrays and filter by route only if normalized arrays are empty.
        const matchesRoute = (item) => {
          const origin = item.Origin || item.origin || item.AirlineCode || "";
          const dest = item.Destination || item.destination || "";
          if (!origin && !dest) return true; // no route info — accept all
          return origin === (currentLeg.sourceCode || "") && dest === (currentLeg.destinationCode || "");
        };

        // SSR: prefer normalized ssr.baggage / ssr.meal (pre-processed by service)
        let baggageList = Array.isArray(ssr?.baggage) ? ssr.baggage : [];
        let mealList = Array.isArray(ssr?.meal) ? ssr.meal : [];

        // Fallback: try raw arrays and route-filter them
        if (baggageList.length === 0) {
          const flatBag = flattenSeatEntries(ssr?.Baggage);
          baggageList = flatBag.filter(matchesRoute).length > 0 ? flatBag.filter(matchesRoute) : flatBag;
        }
        if (mealList.length === 0) {
          const flatMeal = flattenSeatEntries(ssr?.MealDynamic || ssr?.Meal);
          mealList = flatMeal.filter(matchesRoute).length > 0 ? flatMeal.filter(matchesRoute) : flatMeal;
        }

        console.log("[SSR] Resolved baggage:", baggageList);
        console.log("[SSR] Resolved meals:", mealList);

        const allSeats = seatMap.seats || [];
        const journeyOrigin = flight?.sourceCode || flight?.fromCity || "";
        const journeyDest = flight?.destinationCode || flight?.toCity || "";

        effectiveLegs.forEach((leg, lIdx) => {
          const legMatchesRoute = (item) => {
            const origin = item.Origin || item.origin || item.AirlineCode || "";
            const dest = item.Destination || item.destination || "";
            if (!origin && !dest) return true;
            return origin === (leg.sourceCode || "") && dest === (leg.destinationCode || "");
          };
          const legSeats = allSeats.filter(seat => legMatchesRoute(seat.rawSeat || {}));
          const seatsToUse = legSeats.length > 0 ? legSeats : (effectiveLegs.length === 1 ? allSeats : []);
          if (seatsToUse.length > 0) {
            const legCabin = buildCabinFromSeatMap({ ...seatMap, seats: seatsToUse }, travelClass);
            if (legCabin) {
              setSeatMapCabinByLeg(prev => ({ ...prev, [lIdx]: legCabin }));
            }
          }
          setSeatMapRawByLeg(prev => ({
            ...prev,
            [lIdx]: { ...seatMap, seats: seatsToUse.length > 0 ? seatsToUse : allSeats }
          }));

          const legMatchesSsr = (item) => {
            const origin = item.Origin || item.origin || "";
            const dest = item.Destination || item.destination || "";
            if (!origin && !dest) return true;
            return (origin === leg.sourceCode && dest === leg.destinationCode) ||
              (origin === journeyOrigin && dest === journeyDest);
          };
          let legBaggage = baggageList.filter(legMatchesSsr);
          if (legBaggage.length === 0) legBaggage = baggageList;
          let legMeal = mealList.filter(legMatchesSsr);
          if (legMeal.length === 0) legMeal = mealList;
          setSsrOptionsByLeg(prev => ({
            ...prev,
            [lIdx]: { baggage: legBaggage, meal: legMeal }
          }));
        });
      } catch (error) {
        if (!isCurrent) return;
        console.error("[SeatMap/SSR] Fetch error:", error);
        setSeatMapError("Seat map not available for this leg");
      } finally {
        if (isCurrent) {
          setIsSeatMapLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [currentLeg, activeSegmentIndex, travelClass, seatMapCabinByLeg]);

  const seatMapCabin = seatMapCabinByLeg[activeSegmentIndex] || null;
  const ssrOptions = ssrOptionsByLeg[activeSegmentIndex] || { baggage: [], meal: [] };

  const tripId = flowState.traceId || flowState.TraceId || flowState.tripId || searchContext?.tripId || "trip";
  const flightNumber = displayedLeg?.flightNumber || displayedLeg?.airlineCode || `leg${activeSegmentIndex}`;
  const cacheKey = `${tripId}:${activeSegmentIndex}:${flightNumber}`;

  const rawSeatMap = seatMapRawByLeg[activeSegmentIndex] || seatMapCabinByLeg[activeSegmentIndex] || null;
  const activeLayout = useMemo(() => {
    return getCachedNormalizedSeatMap(cacheKey, rawSeatMap);
  }, [cacheKey, rawSeatMap]);

  const applyFitScale = useCallback(() => {
    const viewport = mapContainerRef.current;
    const seatMap = seatMapRef.current;
    if (!viewport || !seatMap) return;

    const viewportWidth = viewport.clientWidth;
    const seatMapWidth = seatMap.scrollWidth;
    const seatMapHeight = seatMap.scrollHeight;
    if (!seatMapWidth || !seatMapHeight) return;

    const scale = Math.min(1, viewportWidth / seatMapWidth);
    seatMap.style.transform = `scale(${scale})`;
    seatMap.style.transformOrigin = "top center";
    viewport.style.height = `${Math.round(seatMapHeight * scale)}px`;
    viewport.style.overflowX = "hidden";
    viewport.scrollLeft = 0;
  }, []);

  const resetFitScale = useCallback(() => {
    const viewport = mapContainerRef.current;
    const seatMap = seatMapRef.current;
    if (seatMap) {
      seatMap.style.transform = "none";
      seatMap.style.transformOrigin = "top center";
    }
    if (viewport) {
      viewport.style.height = "auto";
      viewport.style.overflowX = containerWidth < 560 ? "hidden" : "auto";
    }
  }, [containerWidth]);

  const handleToggleFitToScreen = () => {
    if (isFitToScreen) {
      resetFitScale();
      setIsFitToScreen(false);
    } else {
      setIsFitToScreen(true);
    }
  };

  useEffect(() => {
    if (!isFitToScreen) {
      resetFitScale();
      return;
    }

    applyFitScale();

    const viewport = mapContainerRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(() => {
      applyFitScale();
    });
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isFitToScreen, applyFitScale, resetFitScale, activeSegmentIndex, activeLayout]);

  const seatStats = useMemo(() => {
    if (!activeLayout || !activeLayout.rows) {
      return { totalSeats: 0, freeCount: 0, priceCounts: new Map(), distinctPrices: [] };
    }
    let total = 0;
    let free = 0;
    const pCounts = new Map();

    activeLayout.rows.forEach((r) => {
      (r.seats || []).forEach((s) => {
        total++;
        if (s.status === "free") {
          free++;
        } else if (s.status === "paid" && s.price > 0) {
          pCounts.set(s.price, (pCounts.get(s.price) || 0) + 1);
        }
      });
    });

    const distinct = Array.from(pCounts.keys()).sort((a, b) => a - b);
    return {
      totalSeats: total,
      freeCount: free,
      priceCounts: pCounts,
      distinctPrices: distinct,
    };
  }, [activeLayout]);

  const showingSeatsCount = useMemo(() => {
    if (!activeLayout || !activeLayout.rows) return 0;
    if (activeFilters.size === 0) return seatStats.totalSeats;
    let count = 0;
    activeLayout.rows.forEach((r) => {
      (r.seats || []).forEach((s) => {
        if (s.status === "booked") return;
        if (s.status === "free" && activeFilters.has("FREE")) count++;
        else if (s.status === "paid" && activeFilters.has(s.price)) count++;
      });
    });
    return count;
  }, [activeLayout, activeFilters, seatStats.totalSeats]);

  const hasEmergencyExits = useMemo(() => {
    return (activeLayout?.exitRows || activeLayout?.exits || []).length > 0 || (activeLayout?.rows || []).some(r => (r.seats || []).some(s => s.isEmergencyExit));
  }, [activeLayout]);

  const hasExitRowSeats = useMemo(() => {
    return (activeLayout?.rows || []).some(r => (r.seats || []).some(s => s.isExitRow));
  }, [activeLayout]);

  const hasBassinets = useMemo(() => {
    return (activeLayout?.bassinetRows || activeLayout?.bassinets || []).length > 0 || (activeLayout?.rows || []).some(r => (r.seats || []).some(s => s.isBassinet));
  }, [activeLayout]);

  const hasStairs = useMemo(() => {
    return (activeLayout?.stairs || []).length > 0;
  }, [activeLayout]);

  const flightSymbols = useMemo(() => {
    if (!activeLayout) return [];
    const symbolSet = new Set();

    (activeLayout.rows || []).forEach((r) => {
      (r.seats || []).forEach((s) => {
        if (Array.isArray(s.badges)) {
          s.badges.forEach((b) => symbolSet.add(b));
        }
        if (s.isBassinet) symbolSet.add("bassinet");
        if (s.isExitRow || s.isEmergencyExit || s.isExtraLegroom) symbolSet.add("extraLegroom");
        if (s.isWheelchair || s.isAccessible) symbolSet.add("wheelchair");
        if (s.hasPower || s.isPower) symbolSet.add("power");
      });
    });

    if (Array.isArray(activeLayout.cabinElements) && activeLayout.cabinElements.length > 0) {
      activeLayout.cabinElements.forEach((el) => {
        symbolSet.add(el.type);
      });
    } else {
      if ((activeLayout.exitRows && activeLayout.exitRows.length > 0) || symbolSet.has("extraLegroom")) {
        symbolSet.add("exitDoor");
      }
      if (activeLayout.galleys && activeLayout.galleys.length > 0) {
        symbolSet.add("galley");
      }
      if (activeLayout.lavatories && activeLayout.lavatories.length > 0) {
        symbolSet.add("lavatory");
      }
      if (activeLayout.hasUpperDeck || (activeLayout.stairs && activeLayout.stairs.length > 0)) {
        symbolSet.add("stairs");
      }
    }

    const order = [
      "extraLegroom",
      "bassinet",
      "wheelchair",
      "power",
      "exitDoor",
      "galley",
      "lavatory",
      "stairs",
    ];

    return order.filter((sym) => symbolSet.has(sym));
  }, [activeLayout]);

  const hasAnyFeatureFilter = Boolean(activeLayout && (hasEmergencyExits || hasExitRowSeats || hasBassinets || hasStairs));

  const cabinData = seatMapCabin || { seats: [], rows: [], seatLetters: [], extraLegroomRows: new Set(), wingStartRow: null, wingEndRow: null, zoneName: "" };

  const [activeDeck, setActiveDeck] = useState("Main Deck");

  const availableDecks = useMemo(() => {
    const dSet = new Set();
    (cabinData?.seats || []).forEach((s) => {
      const raw = s.rawApiSeat || s.rawSeat || s;
      const d = s.deck || s.Deck || raw?.Deck || raw?.deck || raw?.Floor || raw?.floor;
      if (d) {
        const norm = String(d).toLowerCase();
        if (norm.includes("upper") || norm === "2") dSet.add("Upper Deck");
        else dSet.add("Main Deck");
      }
    });
    return Array.from(dSet);
  }, [cabinData]);

  const cabinSections = useMemo(() => {
    if (!cabinData || !cabinData.rows || cabinData.rows.length === 0) return [];
    const rowClassMap = new Map();
    cabinData.seats.forEach((s) => {
      if (!rowClassMap.has(s.rowNumber)) {
        const raw = s.rawApiSeat || s.rawSeat || {};
        const cName = raw.CabinClassName || raw.cabinClassName || raw.CabinClass || raw.cabinClass || raw.Compartment || "";
        let cls = "Economy Class";
        const norm = String(cName).toLowerCase();
        if (norm.includes("first") || norm === "1") cls = "First Class";
        else if (norm.includes("business") || norm === "2" || norm === "c" || norm === "j") cls = "Business Class";
        else if (norm.includes("premium") || norm.includes("plus") || norm === "w") cls = "Premium Economy";
        else {
          if (s.rowNumber <= 2 && s.amount >= 1200) cls = "Business Class";
          else if (s.rowNumber <= 5 && s.amount >= 600) cls = "Premium Economy";
          else cls = "Economy Class";
        }
        rowClassMap.set(s.rowNumber, cls);
      }
    });

    const sections = [];
    let currentSection = null;
    cabinData.rows.forEach((r) => {
      const cls = rowClassMap.get(r) || "Economy Class";
      if (!currentSection || currentSection.className !== cls) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          className: cls,
          startRow: r,
          endRow: r,
          rows: [r],
        };
      } else {
        currentSection.endRow = r;
        currentSection.rows.push(r);
      }
    });
    if (currentSection) sections.push(currentSection);
    return sections;
  }, [cabinData]);

  const seatsByLabel = useMemo(() => {
    const map = new Map();

    cabinData.seats.forEach((seat) => {
      map.set(seat.label, seat);
    });

    return map;
  }, [cabinData]);

  useEffect(() => {
    if (!seatMapCabin) {
      return;
    }

    const seatLookup = new Map();
    seatMapCabin.seats.forEach((seat) => {
      seatLookup.set(seat.label, seat);
    });

    setSelectedSeatsBySegment((previous) => {
      const currentLegSeats = previous[activeSegmentIndex] || [];
      const updatedLegSeats = currentLegSeats.filter((s) => {
        const mappedSeat = seatLookup.get(s.label);
        return mappedSeat && mappedSeat.status !== "booked" && mappedSeat.rawApiSeat?.Code;
      });
      return { ...previous, [activeSegmentIndex]: updatedLegSeats };
    });
  }, [seatMapCabin, activeSegmentIndex]);

  const selectedSeats = useMemo(() => {
    return selectedSeatsBySegment[activeSegmentIndex] || [];
  }, [selectedSeatsBySegment, activeSegmentIndex]);

  const previousFareSummary = flowState.fareSummary || {};
  const baseFareTotal = Number(flowState.fareQuote?.baseFare ?? 0);
  const seatSurcharge = Object.values(selectedSeatsBySegment)
    .flatMap((seatList) => (Array.isArray(seatList) ? seatList : []))
    .reduce((sum, seat) => sum + getSeatSurcharge(seat), 0);
  const selectedMeal = ssrOptions.meal.find(m => m.Code === mealPreference || m.code === mealPreference) || null;
  const selectedMeals = Object.entries(extrasBySegment).flatMap(([index, selection]) => {
    const item = ssrOptionsByLeg[index]?.meal.find(m => (m.Code || m.code) === selection.meal);
    return item ? [item] : [];
  });
  const mealFee = selectedMeals.reduce((sum, item) => sum + Number(item.Price ?? item.price), 0);
  const selectedBaggage = ssrOptions.baggage.find(b => b.Code === baggagePlan || b.code === baggagePlan) || null;
  const selectedBaggageItems = Object.entries(extrasBySegment).flatMap(([index, selection]) => {
    const item = ssrOptionsByLeg[index]?.baggage.find(b => (b.Code || b.code) === selection.baggage);
    return item ? [item] : [];
  });
  const baggageFee = selectedBaggageItems.reduce((sum, item) => sum + Number(item.Price ?? item.price), 0);
  const tax = Number(previousFareSummary.tax || 0);
  const convenienceFee = Number(previousFareSummary.convenienceFee || 0);
  const discount = Number(previousFareSummary.discount || flowState.couponDiscount || 0);
  const assuredFee = Number(previousFareSummary.assuredFee || 0);
  const tripSecureFee = Number(previousFareSummary.tripSecureFee || flowState.tripSecureFee || 0);
  const passengerCount = flowState.passengers?.length || travellers.seatRequired || 1;
  const travelAssistanceFee = 0;
  const zeroCancellationFee = 0;
  const totalFare = Number(flowState.fareQuote?.totalFare ?? 0) + seatSurcharge + mealFee + baggageFee;

  if (!flight) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Select a flight first</h2>
            <p>Open flight results and click Book Now to start the booking flow.</p>
            <button type="button" onClick={() => navigate("/search/flights")}>Go to Flight Search</button>
          </section>
        </div>
      </main>
    );
  }

  const toggleSeat = (seat) => {
    if (!seat || seat.status === "booked") {
      return;
    }

    setTappedSeat(seat);
    setSelectionError("");

    setSelectedSeatsBySegment((previous) => {
      const legSeats = previous[activeSegmentIndex] || [];
      const seatKey = seat.id || seat.label;
      const hasSeat = legSeats.find((s) => (s.id || s.label) === seatKey);

      let newLegSeats;
      if (hasSeat) {
        newLegSeats = legSeats.filter((s) => (s.id || s.label) !== seatKey);
      } else {
        if (legSeats.length >= travellers.seatRequired) {
          setSelectionError(
            `You can select up to ${travellers.seatRequired} seat(s) for this booking.`
          );
          return previous;
        }
        const seatToSave = {
          ...seat,
          id: seatKey,
          label: seatKey,
          amount: Number(seat.price ?? seat.amount ?? 0),
          price: Number(seat.price ?? seat.amount ?? 0),
        };
        newLegSeats = [...legSeats, seatToSave];
      }
      return { ...previous, [activeSegmentIndex]: newLegSeats };
    });
  };

  const handleContinue = () => {
    if (!flowState.fareQuote?.success) { setSelectionError("Return to traveller details to refresh the fare quote."); return; }
    // Seat selection is optional — proceed to payment even without seat selection.
    // Selected seats are passed through; if none are selected, Seat: [] is sent to SRDV which is valid.

    const passengersWithSeats = Array.isArray(flowState.passengers)
      ? flowState.passengers.map((passenger, index) => {
        const pSeats = segments.map((_, legIdx) => {
          const legSeats = selectedSeatsBySegment[legIdx] || [];
          const adultChildIndex = flowState.passengers.slice(0, index).filter(p => p.passengerType !== "Infant").length;
          const chosenSeat = passenger.passengerType === "Infant" ? null : legSeats[adultChildIndex];
          if (!chosenSeat || !chosenSeat.rawApiSeat) return null;
          const legMeta = effectiveLegs[legIdx] || {};
          return {
            ...chosenSeat.rawApiSeat,
            Origin: chosenSeat.rawApiSeat.Origin || legMeta.sourceCode || legMeta.fromAirportCode || "",
            Destination: chosenSeat.rawApiSeat.Destination || legMeta.destinationCode || legMeta.toAirportCode || "",
            AirlineCode: chosenSeat.rawApiSeat.AirlineCode || legMeta.airlineCode || "",
            FlightNumber: chosenSeat.rawApiSeat.FlightNumber || legMeta.flightNumber || "",
          };
        }).filter(Boolean);

        const seatLabels = segments
          .map((_, legIdx) => (selectedSeatsBySegment[legIdx] || [])[index]?.label)
          .filter(Boolean);

        return {
          ...passenger,
          seatLabel: seatLabels.length > 0 ? seatLabels.join(" / ") : "",
          seatDynamic: pSeats.length > 0 ? pSeats : undefined,
          Seat: pSeats.length > 0 ? pSeats : undefined,
          seat: pSeats.length > 0 ? pSeats : undefined,
          baggage: index === 0 ? selectedBaggageItems : [],
          Baggage: index === 0 ? selectedBaggageItems : [],
          mealDynamic: index === 0 ? selectedMeals : [],
          MealDynamic: index === 0 ? selectedMeals : [],
        };
      })
      : [];

    const prevWallet = Number(flowState.walletAppliedAmount ?? flowState.walletAmount ?? 0);
    const updatedWalletApplied = Math.min(prevWallet, totalFare);
    const updatedGatewayPayable = Math.max(0, totalFare - updatedWalletApplied);
    const updatedPaymentMethod = updatedWalletApplied <= 0 ? "Cashfree" : updatedGatewayPayable <= 0 ? "Wallet" : "Hybrid";

    const flowPayload = {
      ...flowState,
      flight,
      searchContext,
      selectedSeatsBySegment,
      selectedSeatLabels,
      selectedSeats,
      passengers: passengersWithSeats,
      mealPreference,
      baggagePlan,
      selectedMeal,
      selectedBaggage,
      travelAssistanceAdded,
      zeroCancellationAdded,
      fareSummary: {
        baseFare: baseFareTotal,
        seatSurcharge,
        mealFee,
        baggageFee,
        tax,
        convenienceFee,
        assuredFee,
        tripSecureFee,
        travelAssistanceFee,
        zeroCancellationFee,
        discount,
        totalFare,
      },
      payableAmount: totalFare,
      walletAppliedAmount: updatedWalletApplied,
      walletAmount: updatedWalletApplied,
      gatewayPayableAmount: updatedGatewayPayable,
      paymentMethod: updatedPaymentMethod,
      useWallet: updatedWalletApplied > 0,
    };

    writeFlightBookingFlowState(flowPayload);
    setCheckoutPayload(flowPayload);
    setIsModalOpen(true);
  };

  const renderAircraftSideLayout = (rowNumber, side, cabin) => {
    const isExitRow = cabin.extraLegroomRows.has(rowNumber);
    const wingStart = cabin.wingStartRow || 10;
    const wingEnd = cabin.wingEndRow || 22;
    const isWingRow = rowNumber >= wingStart && rowNumber <= wingEnd;
    const isPort = side === "left";

    if (isWingRow) {
      if (isExitRow) {
        return (
          <div className={`fuselage-side-slot wing-escape-slot ${side}`} title="Overwing Emergency Exit Evacuation Route">
            <div className="wing-escape-pathway">
              <span className="wing-escape-hazard-stripes" />
              <span className="wing-escape-text">
                {isPort ? "⬅ EXIT ROUTE" : "EXIT ROUTE ➔"}
              </span>
              <span className="wing-escape-hazard-stripes" />
            </div>
          </div>
        );
      }

      if (rowNumber === wingStart) {
        return (
          <div className={`fuselage-side-slot wing-lead-edge-slot ${side}`} title={`${isPort ? "Port" : "Starboard"} Wing Leading Edge & Slats`}>
            <div className="wing-lead-edge-body">
              <span className="wing-lead-slat" />
              <span className="wing-slot-label">{isPort ? "◀ WING ROOT" : "WING ROOT ▶"}</span>
            </div>
          </div>
        );
      }

      if (rowNumber === wingStart + 1 || rowNumber === 11) {
        return (
          <div className={`fuselage-side-slot wing-pylon-slot ${side}`} title="Engine Pylon Mount Structure">
            <div className="wing-surface-panel pylon">
              <div className="wing-panel-line" />
              <span className="wing-pylon-strut">▲ ENGINE PYLON</span>
            </div>
          </div>
        );
      }

      if (rowNumber === wingStart + 2 || rowNumber === 12) {
        return (
          <div className={`fuselage-side-slot wing-engine-slot intake ${side}`} title={`${isPort ? "Turbofan Engine 1 (Port)" : "Turbofan Engine 2 (Starboard)"} - Fan Intake`}>
            <div className="jet-engine-cowl intake">
              <div className="engine-fan-spinner">
                <span className="spinner-core" />
              </div>
              <span className="engine-name-badge">
                {isPort ? "✈ ENG 1" : "ENG 2 ✈"}
              </span>
            </div>
          </div>
        );
      }

      if (rowNumber === wingStart + 3 || rowNumber === 13) {
        return (
          <div className={`fuselage-side-slot wing-engine-slot nacelle ${side}`} title={`${isPort ? "Turbofan Engine 1" : "Turbofan Engine 2"} - Nacelle Body`}>
            <div className="jet-engine-cowl nacelle">
              <span className="engine-cowl-panel">CFM LEAP-1A</span>
            </div>
          </div>
        );
      }

      if (rowNumber === wingStart + 4 || rowNumber === 14) {
        return (
          <div className={`fuselage-side-slot wing-engine-slot exhaust ${side}`} title={`${isPort ? "Engine 1" : "Engine 2"} - Exhaust Nozzle Cone`}>
            <div className="jet-engine-cowl exhaust">
              <span className="exhaust-cone" />
            </div>
          </div>
        );
      }

      if (rowNumber === wingEnd) {
        return (
          <div className={`fuselage-side-slot wing-tip-slot ${side}`} title={`${isPort ? "Port Wingtip Sharklet (Amber Nav Strobe)" : "Starboard Wingtip Sharklet (Green Nav Strobe)"}`}>
            <div className="wingtip-sharklet">
              <span className="sharklet-curve" />
              <span className={`wing-nav-beacon ${isPort ? "beacon-amber" : "beacon-green"}`} />
              <span className="wingtip-label">{isPort ? "PORT" : "STBD"}</span>
            </div>
          </div>
        );
      }

      if (rowNumber === wingEnd - 1 || rowNumber === wingEnd - 2 || rowNumber === 20 || rowNumber === 21) {
        return (
          <div className={`fuselage-side-slot wing-flaps-slot ${side}`} title="Fowler Flaps & Flap Track Fairings">
            <div className="wing-surface-panel flaps">
              <span className="flap-track-canoe" />
              <span className="wing-slot-label">FLAPS</span>
            </div>
          </div>
        );
      }

      return (
        <div className={`fuselage-side-slot wing-surface-slot ${side}`} title="Aircraft Wing Surface Structure">
          <div className="wing-surface-panel">
            <div className="wing-panel-line" />
            <span className="wing-surface-label">{isPort ? "◀ OVERWING" : "OVERWING ▶"}</span>
            <div className="wing-panel-line" />
          </div>
        </div>
      );
    }

    // Non-wing rows: clean aerodynamic fuselage exterior skin
    return (
      <div className={`fuselage-side-slot fuselage-skin-slot ${side}`}>
        <div className="fuselage-outer-skin">
          <span className="skin-streamline" />
        </div>
      </div>
    );
  };

  return (
    <main className="flight-flow-page flight-seat-selection-page">
      {/* ── STEPPER PROGRESS HEADER WITH TOP COUNTDOWN TIMER ── */}
      <FlightStepperHeader
        currentStage={3}
        onBack={handleBackToReviewAndTraveller}
        timer={<BookingTimer onRestartSearch={handleRestartSearch} mode="stepper" />}
      />

      <div className="flight-booking-container">
        {/* ── LEFT COLUMN SIDEBAR: 190px, two stacked cards, gap 12px ── */}
        <aside className="flight-checkout-sidebar">
          {/* a) TRAVELLERS card */}
          <div className="sidebar-card travellers-card">
            <div className="sidebar-card-caption">TRAVELLERS</div>
            {flowState.passengers && flowState.passengers.length > 0 ? (
              flowState.passengers.map((p, idx) => (
                <div key={p.id || idx} className="traveller-item-line">
                  {idx + 1}. {p.title || "Mr"} {p.firstName} {p.lastName}
                </div>
              ))
            ) : (
              <div className="traveller-item-line">
                1. Traveller 1
              </div>
            )}
          </div>

          {/* b) FARE SUMMARY card */}
          <div className="sidebar-card fare-summary-card">
            <div className="sidebar-card-caption">FARE SUMMARY</div>
            <div className="fare-summary-row">
              <span>Base fare</span>
              <span>INR {baseFareTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="fare-summary-row">
              <span>Taxes and fees</span>
              <span>INR {tax.toLocaleString("en-IN")}</span>
            </div>
            <div className="fare-summary-row">
              <span>Seat charges</span>
              <span>INR {seatSurcharge.toLocaleString("en-IN")}</span>
            </div>
            <div className="fare-summary-total-row">
              <span>Total</span>
              <span className="fare-summary-total-amount">INR {(baseFareTotal + tax + seatSurcharge).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          <div className="flight-main-card">
            {/* Title & Subtitle with Airline Seat Icon */}
            <div className="seat-page-title-row">
              <div className="seat-page-title-icon-wrap">
                <Armchair size={24} className="seat-page-header-icon" />
              </div>
              <div>
                <h2 className="seat-page-title">Choose your seats</h2>
                <p className="seat-page-subtitle">Select seats for your trip. Seat selection is optional.</p>
              </div>
            </div>

            {/* Flight tabs row with Fit to screen at upper right */}
            <div className="flight-tabs-row">
              <div className="flight-tabs-left">
                {effectiveLegs.map((leg, idx) => {
                  const isActive = activeSegmentIndex === idx;
                  const src = leg.sourceCode || leg.fromAirportCode || "Origin";
                  const dst = leg.destinationCode || leg.toAirportCode || "Destination";
                  return (
                    <button
                      key={`seg-tab-${idx}`}
                      type="button"
                      className={`flight-segment-tab-btn ${isActive ? "active" : ""}`}
                      onClick={() => setActiveSegmentIndex(idx)}
                    >
                      Flight {idx + 1}: {src} → {dst}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={`fit-to-screen-btn ${isFitToScreen ? "fitted" : ""}`}
                onClick={handleToggleFitToScreen}
              >
                <Maximize2 size={14} className="fit-icon" />
                <span>{isFitToScreen ? "Reset zoom" : "Fit to screen"}</span>
              </button>
            </div>

            {/* Row: "Aircraft seat map" left with red plane icon; right side text */}
            <div className="aircraft-seatmap-header-row">
              <div className="aircraft-seatmap-title-wrap">
                <Plane size={18} className="aircraft-seatmap-plane-icon" />
                <h3 className="aircraft-seatmap-title">Aircraft seat map</h3>
              </div>
              <span className="aircraft-seatmap-count-info">
                {activeLayout?.aircraft || "Commercial Airline"} | {seatStats.totalSeats || 186} seats
              </span>
            </div>

            {/* MAP CONTAINER (position relative, 0.5px border, radius 12px, background #FFFFFF, responsive overflow) */}
            <div
              className={`aircraft-seatmap-container ${isVertical ? "vertical" : "horizontal"} ${isFitToScreen ? "fitted" : ""}`}
              ref={mapContainerRef}
              style={{
                overflowX: isFitToScreen ? "hidden" : (isVertical ? "hidden" : "auto"),
                overflowY: isVertical ? "visible" : "hidden",
                width: "100%",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {isSeatMapLoading && (
                <div className="seatmap-loading-overlay">
                  <Loader2 size={28} className="spin" />
                  <p>Loading seat map…</p>
                </div>
              )}

              {seatMapError && !isSeatMapLoading && (
                <div className="seatmap-error-box">
                  <Info size={16} />
                  <span>Seat map not available for this leg</span>
                </div>
              )}

              {!isSeatMapLoading && !seatMapError && activeLayout && activeLayout.totalRows > 0 && (
                <div
                  ref={seatMapRef}
                  className="seatmap-scalable-wrapper"
                  style={{
                    transformOrigin: "top center",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <AircraftSeatMap
                    layout={activeLayout}
                    selectedSeats={selectedSeats}
                    activeFilters={activeFilters}
                    palette={palette}
                    seatFill={seatFill}
                    orientation={isVertical ? "vertical" : "horizontal"}
                    containerWidth={containerWidth}
                    onSeatClick={toggleSeat}
                    onSeatHover={handleSeatMouseEnter}
                    onSeatLeave={handleSeatMouseLeave}
                  />
                </div>
              )}

              {!isSeatMapLoading && !seatMapError && (!activeLayout || activeLayout.totalRows === 0) && (
                <div className="seatmap-empty-box" style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                  <Info size={24} style={{ marginBottom: "8px", display: "inline-block" }} />
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>
                    Seat map not available for this leg
                  </p>
                </div>
              )}

              {/* Custom Dark Tooltip div clamped inside container - hidden on touch devices/vertical mode */}
              {!isVertical && hoveredSeat && (() => {
                const seatId = hoveredSeat.id || hoveredSeat.label || `${hoveredSeat.row}${hoveredSeat.col}`;
                let symbolName = "";
                if (Array.isArray(hoveredSeat.badges) && hoveredSeat.badges.length > 0) {
                  const bMeta = getSymbolMeta(hoveredSeat.badges[0]);
                  symbolName = bMeta ? bMeta.label : "";
                } else if (hoveredSeat.isBassinet) {
                  symbolName = "Bassinet";
                } else if (hoveredSeat.isExitRow || hoveredSeat.isEmergencyExit || hoveredSeat.isExtraLegroom) {
                  symbolName = "Extra legroom";
                } else if (hoveredSeat.isWheelchair || hoveredSeat.isAccessible) {
                  symbolName = "Accessible seat";
                } else if (hoveredSeat.hasPower || hoveredSeat.isPower) {
                  symbolName = "Power outlet";
                }

                const seatTitleText = symbolName ? `${seatId} · ${symbolName}` : `Seat ${seatId}`;

                return (
                  <div
                    className="seatmap-dark-tooltip"
                    style={{
                      position: "absolute",
                      left: `${Math.max(10, Math.min((mapContainerRef.current?.clientWidth || 800) - 210, tooltipCoords.x))}px`,
                      top: `${Math.max(10, tooltipCoords.y)}px`,
                    }}
                  >
                    <div className="tooltip-header-line">
                      <span className="tooltip-seat-label">
                        {seatTitleText}
                      </span>
                      <span className="tooltip-tag-chip">
                        {hoveredSeat.status === "booked" ? "BOOKED" : (hoveredSeat.typeTag || "STANDARD SEAT")}
                      </span>
                    </div>
                    <div className="tooltip-price-line">
                      <span className="tooltip-surcharge-label">Surcharge:</span>
                      <span className={`tooltip-surcharge-value ${hoveredSeat.status === "booked" ? "unavailable" : ""}`}>
                        {hoveredSeat.status === "booked"
                          ? "Unavailable"
                          : (hoveredSeat.price > 0 ? `INR ${hoveredSeat.price.toLocaleString("en-IN")}` : "Free")}
                      </span>
                    </div>
                    <div className="tooltip-meta-line">
                      {hoveredSeat.type || "Standard seat"} | {hoveredSeat.cabin || "Economy"}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── SEAT MAP REFERENCE LEGEND BAR (Exact match to screenshot) ── */}
            <div className="seatmap-reference-legend-bar">
              <div className="legend-section">
                <span className="legend-section-title">Seat Status</span>
                <div className="legend-badge-item">
                  <span className="legend-swatch available" />
                  <span>Available</span>
                </div>
                <div className="legend-badge-item">
                  <span className="legend-swatch booked" />
                  <span>Booked</span>
                </div>
                <div className="legend-badge-item">
                  <span className="legend-swatch selected" />
                  <span>Selected</span>
                </div>
                <div className="legend-badge-item">
                  <span className="legend-swatch exit-marker">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <rect x="0.5" y="0.5" width="19" height="19" rx="3.5" fill="#FFFFFF" stroke="#E31E24" strokeWidth="1.6" />
                      <circle cx="10" cy="5.2" r="1.8" fill="#E31E24" />
                      <path d="M 9.5 7.2 L 10.8 9.2 L 13.8 8.4 M 9.2 9.2 L 7.2 11.2 M 10.5 9.8 L 9.5 13.2 L 7.2 15.2 M 9.5 13.2 L 12.5 15.6" stroke="#E31E24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                  <span>Emergency Exit</span>
                </div>
              </div>

              <div className="legend-divider" />

              <div className="legend-section">
                <span className="legend-section-title">Amenities</span>
                <div className="legend-badge-item">
                  <span className="legend-amenity-icon food-icon">
                    <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
                      <path d="M 9 7.5 L 9 11.5 M 7 7.5 L 7 10.5 C 7 11.8 8 12.8 9 12.8 M 11 7.5 L 11 10.5 C 11 11.8 10 12.8 9 12.8 M 9 12.8 L 9 18.5" stroke="#E31E24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M 16 7.5 C 14.2 9 14.2 12.2 15.2 13.5 L 15.2 18.5 M 16 7.5 L 16 18.5" stroke="#E31E24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                  <span>Food / Meal</span>
                </div>
                <div className="legend-badge-item">
                  <span className="legend-amenity-icon washroom-icon">
                    <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
                      <circle cx="9" cy="8" r="1.6" fill="#2563EB" />
                      <path d="M 7.5 10.8 L 10.5 10.8 L 10.5 14.5 L 9.8 14.5 L 9.8 18.5 L 8.2 18.5 L 8.2 14.5 L 7.5 14.5 Z" fill="#2563EB" />
                      <circle cx="16.5" cy="8" r="1.6" fill="#2563EB" />
                      <path d="M 15 10.8 L 18 10.8 L 19 15.2 L 17.5 15.2 L 17.5 18.5 L 15.5 18.5 L 15.5 15.2 L 14 15.2 Z" fill="#2563EB" />
                    </svg>
                  </span>
                  <span>Washroom</span>
                </div>
              </div>

              <div className="legend-note">
                <Info size={15} className="legend-info-icon" />
                <span>Seat price is shown below each seat.</span>
              </div>
            </div>

            {selectionError && (
              <p className="flight-flow-error" style={{ color: "var(--seat-exit-icon, #d97706)", margin: "8px 0" }}>
                <Info size={14} />
                {selectionError}
              </p>
            )}
          </div>

          {/* ── ADD-ON SERVICES CARD ── */}
          <div className="flight-main-card addon-card">
            <h2 className="addon-card-title">
              <Utensils size={18} className="addon-header-icon" />
              <span>Add-on Services</span>
            </h2>
            <div className="addon-form-grid">
              <div className="addon-input-group">
                <label>Meal Preference</label>
                <select
                  className="addon-input-control"
                  value={mealPreference}
                  onChange={(event) => setMealPreference(event.target.value)}
                >
                  <option value="none">No additional meal</option>
                  {ssrOptions.meal.map((m, idx) => (
                    <option key={`meal-${idx}`} value={m.Code || m.code}>
                      {m.Description || m.description || "Meal"} (+INR {m.Price || m.price || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="addon-input-group">
                <label>Checked Baggage Allowance</label>
                <select
                  className="addon-input-control"
                  value={baggagePlan}
                  onChange={(event) => setBaggagePlan(event.target.value)}
                >
                  <option value="none">No additional baggage</option>
                  {ssrOptions.baggage.map((b, idx) => (
                    <option key={`bag-${idx}`} value={b.Code || b.code}>
                      {b.Description || b.description || "Baggage"} (+INR {b.Price || b.price || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="addon-card-footer">
              <button
                type="button"
                className="addon-cta-btn"
                onClick={() => {
                  const isLastSegment = activeSegmentIndex >= segments.length - 1;
                  if (!isLastSegment) {
                    setActiveSegmentIndex((prev) => prev + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    handleContinue();
                  }
                }}
                disabled={Boolean(!seatMapError && activeLayout && activeLayout.totalRows > 0 && selectedSeats.length > 0 && selectedSeats.length !== travellers.seatRequired)}
              >
                <span>
                  {activeSegmentIndex < segments.length - 1
                    ? (effectiveLegs[activeSegmentIndex + 1]?.isReturnLeg ? "Select Return Flight Seats" : "Next Flight Seats")
                    : "Continue to Payment"}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Insurance Terms Modal */}
      {activeInsuranceTerms && (
        <div className="insurance-modal-overlay" onClick={() => setActiveInsuranceTerms(null)}>
          <div className="insurance-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="insurance-modal-close"
              onClick={() => setActiveInsuranceTerms(null)}
            >
              <X size={20} />
            </button>
            {activeInsuranceTerms === "travel" ? (
              <div className="insurance-modal-body">
                <h3>Travel Assistance Benefits</h3>
                <p>Enjoy travel protection with the following exclusive coverage benefits:</p>
                <ul>
                  <li><strong>Flight Delay:</strong> Benefit beyond 2 hours delay.</li>
                  <li><strong>Emergency Medical Expenses:</strong> Medical costs incurred during transit.</li>
                  <li><strong>Baggage Delay & Loss:</strong> Assistance and financial payout.</li>
                  <li><strong>Emergency Assistance:</strong> 24x7 support coverage.</li>
                </ul>
                <p className="insurance-modal-disclaimer">
                  Valid for Indian citizens up to the age of 90 years. Inclusive of all taxes.
                </p>
              </div>
            ) : (
              <div className="insurance-modal-body">
                <h3>Zero Cancellation Benefits</h3>
                <p>Say goodbye to cancellation fees and get fully refunded with peace of mind:</p>
                <ul>
                  <li><strong>Trip Cancellation:</strong> Cancel up to 24 hours before departure.</li>
                  <li><strong>Full Refund:</strong> Claim refund of your flight fare up to ₹5,000.</li>
                  <li><strong>No Questions Asked:</strong> Processed immediately without hassle or extensive documentation.</li>
                  <li><strong>Asego Powered:</strong> Trusted assistance services.</li>
                </ul>
                <p className="insurance-modal-disclaimer">
                  Valid for Indian citizens up to the age of 70 years. Cancel &gt;= 24 hrs prior to departure.
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: "16px" }}
              onClick={() => setActiveInsuranceTerms(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {isModalOpen && checkoutPayload && (
        <BookingConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          bookingType="Flight"
          flowState={checkoutPayload}
          onSuccess={(res) => {
            if (res.orderId) navigate(`/payment/cashfree/return?order_id=${encodeURIComponent(res.orderId)}`, { replace: true });
          }}
        />
      )}
    </main>
  );
}