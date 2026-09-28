/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
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
  ArrowLeft
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BookingConfirmationModal from "../../components/booking/BookingConfirmationModal";
import "../../STYLES/FlightBookingFlow.css";
import { getFlightSeatMap, getFlightSSR } from "../../services/flightBookingService";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { normalizeCabinClass } from "../../utils/seatMapUtils";
import BookingTimer from "./BookingTimer";

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
    adults,
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

      return {
        ...parsed,
        isBooked,
        isLegroom: Boolean(seat?.rawSeat?.IsLegroom ?? seat?.rawSeat?.isLegroom ?? seat?.isExit),
        isAisleSeat: Boolean(seat?.rawSeat?.IsAisle ?? seat?.rawSeat?.isAisle ?? seat?.isAisle),
        amount: Number(seat?.Amount ?? seat?.amount ?? seat?.Price ?? seat?.price ?? seat?.price ?? 0),
        rawApiSeat: seat.rawSeat || seat,
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

  // Use IsLegroom flag from the API data (not just the first row)
  const extraLegroomRows = new Set(
    parsedSeats.filter(s => s.isLegroom).map(s => s.rowNumber)
  );

  const seats = parsedSeats.map((seat) => {
    const isExtraLegroom = seat.isLegroom || extraLegroomRows.has(seat.rowNumber);
    let status = "available";

    if (seat.isBooked) {
      status = "booked";
    } else if (isExtraLegroom) {
      status = "extra";
    }

    // Use IsAisle from API directly, fall back to position-based detection
    const type = seat.isAisleSeat ? "aisle" : getSeatType(seat.seatLetter, seatLetters);

    return {
      id: seat.label,
      label: seat.label,
      rowNumber: seat.rowNumber,
      seatLetter: seat.seatLetter,
      status,
      isExtraLegroom,
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
  return Number(seat?.amount ?? 0);
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
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const handleRestartSearch = () => {
    if (!searchContext) {
      navigate("/");
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
    navigate(`/flight-search?${qs.toString()}`, { state: searchContext });
  };

  const [seatMapCabinByLeg, setSeatMapCabinByLeg] = useState({});
  const [ssrOptionsByLeg, setSsrOptionsByLeg] = useState({});

  const effectiveLegs = useMemo(() => {
    const journeys = flowState.selectedLegs?.length ? flowState.selectedLegs : [flowState.flight, flowState.returnFlight].filter(Boolean);
    return journeys.flatMap(journey => {
      const rawSegments = journey.segments || journey.Segments || [];
      const legs = Array.isArray(rawSegments) ? rawSegments.flat(Infinity) : [];
      return legs.length ? legs.map(segment => ({ ...journey,
        sourceCode: segment.Origin?.Airport?.AirportCode || segment.Origin?.AirportCode,
        destinationCode: segment.Destination?.Airport?.AirportCode || segment.Destination?.AirportCode,
        fromCity: segment.Origin?.Airport?.CityName || segment.Origin?.CityName,
        toCity: segment.Destination?.Airport?.CityName || segment.Destination?.CityName,
        airlineCode: segment.Airline?.AirlineCode, flightNumber: segment.Airline?.FlightNumber,
      })) : [journey];
    });
  }, [flowState]);
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
    const button = event.currentTarget;
    const container = button.closest(".airplane-fuselage-wrapper");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    setTooltipCoords({
      x: buttonRect.left - containerRect.left + buttonRect.width / 2,
      y: buttonRect.top - containerRect.top - 8,
    });
    setHoveredSeat(seat);
  };

  const handleSeatMouseLeave = () => {
    setHoveredSeat(null);
  };

  const getSeatCategoryName = (seat) => {
    if (seat.isExtraLegroom) {
      return "Extra Legroom Seat";
    }
    if (seat.rowNumber <= 12) {
      return "Preferred Seat";
    }
    return "Standard Seat";
  };

  const getSeatCategoryClass = (seat) => {
    if (seat.isExtraLegroom) {
      return "extra";
    }
    if (seat.rowNumber <= 12) {
      return "preferred";
    }
    return "standard";
  };

  useEffect(() => {
    if (!flight) {
      return;
    }

    writeFlightBookingFlowState({
      flight,
      searchContext,
    });
  }, [flight, searchContext]);

  useEffect(() => {
    let isCurrent = true;

    if (!currentLeg?.id && !currentLeg?.resultIndex) {
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
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
        const [seatMap, ssr] = await Promise.all([getFlightSeatMap(currentLeg), getFlightSSR(currentLeg)]);
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

        setSsrOptionsByLeg((prev) => ({
          ...prev,
          [activeSegmentIndex]: { baggage: baggageList, meal: mealList }
        }));

        // Seat map: filter by route, but if result is empty use all seats
        const allSeats = seatMap.seats || [];
        const routeFilteredSeats = allSeats.filter(seat => matchesRoute(seat.rawSeat || {}));
        const seatsToUse = routeFilteredSeats.length > 0 ? routeFilteredSeats : allSeats;
        const cabin = buildCabinFromSeatMap({ ...seatMap, seats: seatsToUse }, travelClass);
        console.log("[SeatMap] Parsed cabin:", cabin);

        if (cabin) {
          setSeatMapCabinByLeg((prev) => ({ ...prev, [activeSegmentIndex]: cabin }));
        } else {
          setSeatMapError("The supplier has not provided a seat map. You can continue without selecting seats.");
        }
      } catch (error) {
        if (!isCurrent) return;
        console.error("[SeatMap/SSR] Fetch error:", error);
        setSeatMapError(
          error?.message || "The supplier has not provided a seat map. You can continue without selecting seats."
        );
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

  const cabinData = seatMapCabin || { seats: [], rows: [], seatLetters: [], extraLegroomRows: new Set(), zoneName: "" };

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

    setSelectionError("");

    setSelectedSeatsBySegment((previous) => {
      const legSeats = previous[activeSegmentIndex] || [];
      const hasSeat = legSeats.find((s) => s.label === seat.label);

      let newLegSeats;
      if (hasSeat) {
        newLegSeats = legSeats.filter((s) => s.label !== seat.label);
      } else {
        if (legSeats.length >= travellers.seatRequired) {
          setSelectionError(
            `You can select up to ${travellers.seatRequired} seat(s) for this booking.`
          );
          return previous;
        }
        newLegSeats = [...legSeats, seat];
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
          return (passenger.passengerType === "Infant" ? null : legSeats[flowState.passengers.slice(0, index).filter(p => p.passengerType !== "Infant").length]?.rawApiSeat) || null;
        }).filter(Boolean);

        return {
          ...passenger,
          seatLabel: (selectedSeatsBySegment[0] || [])[index]?.label || "",
          seatDynamic: pSeats.length > 0 ? pSeats : undefined,
          baggage: index === 0 ? selectedBaggageItems : [],
          mealDynamic: index === 0 ? selectedMeals : [],
        };
      })
      : [];

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
    };

    writeFlightBookingFlowState(flowPayload);
    setCheckoutPayload(flowPayload);
    setIsModalOpen(true);
  };

  return (
    <main className="flight-flow-page">
      <BookingTimer onRestartSearch={handleRestartSearch} mode="banner" />
      {/* ── STEPPER PROGRESS HEADER ── */}
      <div className="flight-stepper-header">
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Flight Selection</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
          <span className="step-circle">3</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">4</span>
          <span>Payment</span>
        </div>
      </div>

      <div className="flight-booking-container">
        {/* ── LEFT COLUMN SIDEBAR ── */}
        <aside className="flight-checkout-sidebar">
          {/* Your Flight Details */}
          <div className="sidebar-card your-flight-card">
            <h3 className="sidebar-card-title">
              {segments.length > 1 ? `Flight ${activeSegmentIndex + 1} of ${segments.length}` : "Your Flight"}
            </h3>
            <div className="flight-segment">
              <div className="flight-city-info">
                <span className="flight-city-code">{displayedLeg.sourceCode || displayedLeg.fromCity || flight.sourceCode || "--"}</span>
                <span className="flight-city-name">{displayedLeg.fromCity || searchContext?.source || "--"}</span>
              </div>
              <div className="flight-stops-indicator">
                <span className="stops-text">{Number(displayedLeg.stops || flight.stops || 0) > 0 ? `${displayedLeg.stops || flight.stops} stop` : "Non stop"}</span>
                <div className="stops-line"></div>
              </div>
              <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                <span className="flight-city-code">{displayedLeg.destinationCode || displayedLeg.toCity || flight.destinationCode || "--"}</span>
                <span className="flight-city-name">{displayedLeg.toCity || searchContext?.destination || "--"}</span>
              </div>
            </div>
            <div className="flight-meta-info">
              <span>{displayedLeg.airlineName || displayedLeg.airline || flight.airlineName} ({displayedLeg.flightNumber || flight.flightNumber})</span>
              <span className="flight-date-badge">{displayedLeg.departDate || (activeSegmentIndex === 1 ? searchContext?.returnDate : searchContext?.departureDate) || flight.departDate || "--"}</span>
            </div>
          </div>

          {/* Travellers Details */}
          {flowState.passengers && flowState.passengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {flowState.passengers.map((p, idx) => (
                <div key={p.id} className="traveller-item">
                  {idx + 1}. {p.title} {p.firstName} {p.lastName}
                </div>
              ))}
            </div>
          )}

          {/* Fare Summary */}
          <div className="sidebar-card fare-summary-card">
            <h3 className="sidebar-card-title">Fare Summary</h3>
            <div className="fare-row">
              <span>Base Fare</span>
              <span>₹ {baseFareTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="fare-row">
              <span>Taxes & Fees</span>
              <span>₹ {(tax + seatSurcharge + mealFee + baggageFee).toLocaleString("en-IN")}</span>
            </div>
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {(baseFareTotal + tax + seatSurcharge + mealFee + baggageFee).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          {/* Seat Layout Main Card */}
          <div className="flight-main-card">
            <div className="seat-tabs-container">
              <span
                className={`seat-tab ${activeTab === "seat" ? "active" : ""}`}
                onClick={() => setActiveTab("seat")}
              >
                Seat
              </span>
              <span
                className={`seat-tab ${activeTab === "insurance" ? "active" : ""}`}
                onClick={() => setActiveTab("insurance")}
              >
                Insurance {flowState.assuredSecured && " (Secured)"}
              </span>
            </div>

            {activeTab === "seat" ? (
              <div>
                {/* Segment Pills */}
                {segments.length > 1 && (
                  <div className="segment-pills">
                    {segments.map((seg, idx) => {
                      const legSeatCount = (selectedSeatsBySegment[idx] || []).length;
                      return (
                        <button
                          key={`seg-${idx}-${seg}`}
                          type="button"
                          className={`segment-pill ${activeSegmentIndex === idx ? "active" : ""}`}
                          onClick={() => setActiveSegmentIndex(idx)}
                        >
                          <span style={{ fontWeight: 700 }}>Flight {idx + 1}: {seg.replace("-", " → ")}</span>
                          {legSeatCount > 0 && (
                            <span style={{ marginLeft: 6, fontSize: "0.72rem", padding: "2px 7px", borderRadius: 10, backgroundColor: activeSegmentIndex === idx ? "#2563eb" : "#e2e8f0", color: activeSegmentIndex === idx ? "#ffffff" : "#334155" }}>
                              ✓ {legSeatCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Seat Category Legends */}
                <div className="seat-legend-row">
                  <div className="legend-badge">
                    <span className="legend-color free"></span>
                    <span>Free</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color mid"></span>
                    <span>Supplier price</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color high"></span>
                    <span>Supplier price</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color" style={{ backgroundColor: "#d6dee9" }}></span>
                    <span>Booked</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color" style={{ backgroundColor: "#f4f8fd", borderColor: "#2f5e9c" }}></span>
                    <span>Selected</span>
                  </div>
                </div>

                {/* Airplane Cabin Legends */}
                <div className="airplane-legend-container">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 className="legend-title" style={{ margin: 0, textAlign: "left" }}>Select Your Preferred Seat</h4>
                    {activeSeatFilter && (
                      <button
                        type="button"
                        onClick={() => setActiveSeatFilter(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--secondary-color)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "4px 10px",
                          borderRadius: 6,
                          backgroundColor: "rgba(37, 99, 235, 0.08)",
                          transition: "all 0.2s"
                        }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="airplane-legend-grid">
                    <div
                      className={`legend-item ${activeSeatFilter === "middle_free" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("middle_free")}
                    >
                      <div className="legend-seat standard free">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Middle Seat</span>
                        <span className="legend-price">Free</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "standard_window" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("standard_window")}
                    >
                      <div className="legend-seat standard window">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Window</span>
                        <span className="legend-price">Supplier price</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "standard_aisle" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("standard_aisle")}
                    >
                      <div className="legend-seat standard aisle">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Aisle</span>
                        <span className="legend-price">Supplier price</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "preferred" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("preferred")}
                    >
                      <div className="legend-seat preferred">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Preferred Rows 2-5</span>
                        <span className="legend-price">Supplier price</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "extra" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("extra")}
                    >
                      <div className="legend-seat extra">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Extra Legroom</span>
                        <span className="legend-price">Supplier price</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "booked" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("booked")}
                    >
                      <div className="legend-seat booked">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Booked</span>
                        <span className="legend-price">Unavailable</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "selected" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("selected")}
                    >
                      <div className="legend-seat selected">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Selected</span>
                        <span className="legend-price">Active Selection</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seat Map Panel */}
                <div className="seatmap-panel">
                  {isSeatMapLoading && (
                    <div className="seatmap-loading-overlay">
                      <Loader2 size={28} className="spin" />
                      <p>Loading seat map…</p>
                    </div>
                  )}

                  {seatMapError && !isSeatMapLoading && (
                    <div className="seatmap-error-box">
                      <Info size={16} />
                      <span>{seatMapError}</span>
                    </div>
                  )}

                  {!isSeatMapLoading && !seatMapError && cabinData.rows.length > 0 && (
                    <div className="seatmap-grid-wrapper">
                      {/* Sticky column-letter header */}
                      <div className="seatmap-col-header">
                        <span className="seatmap-row-num-placeholder" />
                        {cabinData.seatLetters.map((letter, idx) => {
                          const items = [];
                          if (idx === Math.ceil(cabinData.seatLetters.length / 2)) {
                            items.push(<span key="aisle-hdr" className="seatmap-aisle-gap">AISLE</span>);
                          }
                          items.push(<span key={`hdr-${letter}`} className="seatmap-col-lbl">{letter}</span>);
                          return items;
                        })}
                      </div>

                      {/* Seat rows */}
                      <div className="seatmap-rows">
                        {(() => {
                          const elements = [];
                          let prevRow = null;
                          cabinData.rows.forEach((rowNumber) => {
                            const isExitRow = cabinData.extraLegroomRows.has(rowNumber);
                            // Insert a section gap every 6 rows to visually segment cabin
                            if (prevRow !== null && (rowNumber - prevRow) > 1) {
                              elements.push(
                                <div key={`gap-${rowNumber}`} className="seatmap-section-gap">
                                  <span className="seatmap-gap-line" />
                                  <span className="seatmap-gap-label">Gap</span>
                                  <span className="seatmap-gap-line" />
                                </div>
                              );
                            }
                            prevRow = rowNumber;

                            if (isExitRow) {
                              elements.push(
                                <div key={`exit-${rowNumber}`} className="seatmap-exit-divider">
                                  <span className="seatmap-exit-line" />
                                  <span className="seatmap-exit-label">🚨 Emergency Exit — Extra Legroom</span>
                                  <span className="seatmap-exit-line" />
                                </div>
                              );
                            }

                            const rowSeats = [];
                            rowSeats.push(
                              <span key={`rn-${rowNumber}`} className="seatmap-row-num">{rowNumber}</span>
                            );

                            cabinData.seatLetters.forEach((seatLetter, idx) => {
                              if (idx === Math.ceil(cabinData.seatLetters.length / 2)) {
                                rowSeats.push(<div key={`aisle-${rowNumber}`} className="seatmap-aisle-col" />);
                              }

                              const seat = seatsByLabel.get(`${rowNumber}${seatLetter}`);
                              const isSelected = selectedSeatLabels.includes(seat?.label);
                              const isBooked = !seat || seat.status === "booked" || seat.status === "blocked";

                              let cls = "seatmap-seat";
                              if (isBooked) cls += " sm-booked";
                              else if (isSelected) cls += " sm-selected";
                              else if (isExitRow || seat?.isExtraLegroom) cls += " sm-exit";
                              else if (rowNumber <= 6) cls += " sm-preferred";
                              else if (seat?.isWindow) cls += " sm-window";
                              else if (seat?.isAisle) cls += " sm-aisle";
                              else cls += " sm-middle";

                              const doesMatch = !activeSeatFilter || doesSeatMatchFilter(seat, activeSeatFilter);
                              const isDimmed = activeSeatFilter && !doesMatch;

                              rowSeats.push(
                                <div
                                  key={seat?.id || `${rowNumber}-${seatLetter}`}
                                  className={`seatmap-seat-cell ${isDimmed ? "sm-dimmed" : ""}`}
                                  onMouseEnter={(e) => !isDimmed && seat && handleSeatMouseEnter(e, seat)}
                                  onMouseLeave={handleSeatMouseLeave}
                                >
                                  <button
                                    type="button"
                                    className={cls}
                                    disabled={isBooked}
                                    onClick={() => toggleSeat(seat)}
                                    title={seat ? `Seat ${seat.label}${seat.amount > 0 ? ` (+₹${seat.amount})` : " (Free)"}` : "Unavailable"}
                                  >
                                    <svg viewBox="0 0 100 115" className="seatmap-svg">
                                      {/* Headrest */}
                                      <rect x="20" y="4" width="60" height="26" rx="10" className="sm-svg-headrest" />
                                      {/* Seat back */}
                                      <rect x="14" y="28" width="72" height="54" rx="8" className="sm-svg-back" />
                                      {/* Seat cushion */}
                                      <rect x="14" y="82" width="72" height="22" rx="8" className="sm-svg-cushion" />
                                      {/* Left armrest */}
                                      <rect x="4" y="36" width="10" height="34" rx="5" className="sm-svg-arm" />
                                      {/* Right armrest */}
                                      <rect x="86" y="36" width="10" height="34" rx="5" className="sm-svg-arm" />
                                    </svg>
                                    <span className="seatmap-seat-lbl">{seatLetter}</span>
                                  </button>
                                  {seat && seat.amount > 0 && !isBooked && (
                                    <span className="seatmap-price-dot">₹{Math.round(seat.amount / 100) > 9 ? `${Math.round(seat.amount / 100)}` : seat.amount}</span>
                                  )}
                                </div>
                              );
                            });

                            elements.push(
                              <div
                                key={`row-${rowNumber}`}
                                className={`seatmap-row ${isExitRow ? "sm-row-exit" : rowNumber <= 6 ? "sm-row-preferred" : ""}`}
                              >
                                {rowSeats}
                              </div>
                            );
                          });
                          return elements;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Tooltip */}
                  {hoveredSeat && (
                    <div
                      className="seat-hover-tooltip"
                      style={{
                        position: "absolute",
                        left: tooltipCoords.x,
                        top: tooltipCoords.y,
                        transform: "translate(-50%, -100%) translateY(-10px)",
                        pointerEvents: "none",
                        zIndex: 1000,
                      }}
                    >
                      <div className="tooltip-header">
                        <span className="tooltip-seat-label">Seat {hoveredSeat.label}</span>
                        <span className={`tooltip-class-badge ${getSeatCategoryClass(hoveredSeat)}`}>
                          {getSeatCategoryName(hoveredSeat)}
                        </span>
                      </div>
                      <div className="tooltip-divider" />
                      <div className="tooltip-body">
                        <div className="tooltip-detail">
                          <span className="detail-label">Surcharge:</span>
                          <span className="detail-value highlight">
                            {getSeatSurcharge(hoveredSeat) > 0
                              ? `₹${getSeatSurcharge(hoveredSeat).toLocaleString("en-IN")}`
                              : "Free"}
                          </span>
                        </div>
                        <div className="tooltip-features">
                          {hoveredSeat.isWindow && <span className="feature-pill">🪟 Window</span>}
                          {hoveredSeat.isAisle && <span className="feature-pill">🎛️ Aisle</span>}
                          {hoveredSeat.isMiddle && <span className="feature-pill">🤝 Middle</span>}
                          {hoveredSeat.isExtraLegroom && <span className="feature-pill highlight-pill">🦵 Extra Legroom</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="flight-seat-hint" style={{ marginTop: 12 }}>
                  Please select {travellers.seatRequired} seat(s). Window/Aisle and front/exit rows have surcharges.
                </p>

                {selectionError && (
                  <p className="flight-flow-error" style={{ color: "var(--danger-color)", margin: "8px 0" }}>
                    <Info size={14} />
                    {selectionError}
                  </p>
                )}
              </div>
            ) : (
              <p>No additional protection products are available.</p>
            )}
          </div>

          {/* Meals & Baggage Selection Card */}
          <div className="flight-main-card addon-card">
            <h2 className="flight-main-card-title">
              <Utensils size={20} className="header-icon" />
              Add-on Services
            </h2>
            <div className="form-grid-2">
              <div className="input-group">
                <label>Meal Preference</label>
                <select
                  className="input-control"
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

              <div className="input-group">
                <label>Checked Baggage Allowance</label>
                <select
                  className="input-control"
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
                className="btn-primary addon-cta"
                onClick={() => {
                  const isLastSegment = activeSegmentIndex >= segments.length - 1;
                  if (!isLastSegment) {
                    setActiveSegmentIndex((prev) => prev + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    handleContinue();
                  }
                }}
                disabled={selectedSeats.length > 0 && selectedSeats.length !== travellers.seatRequired}
              >
                {activeSegmentIndex < segments.length - 1 ? "Next Flight Seats" : "Continue to Payment"} <ArrowRight size={16} />
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
