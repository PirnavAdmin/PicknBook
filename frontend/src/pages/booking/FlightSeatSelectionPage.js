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
import "../../STYLES/FlightBookingFlow.css";
import { getFlightSeatMap } from "../../services/flightBookingService";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";

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

function hashFromText(value) {
  let hash = 0;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
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

function getZoneName(travelClass) {
  const normalized = String(travelClass || "Economy").toLowerCase();

  if (normalized.includes("first")) {
    return "First Suite";
  }

  if (normalized.includes("business")) {
    return "Business Cabin";
  }

  if (normalized.includes("premium economy")) {
    return "Premium Economy";
  }

  return "Economy Cabin";
}

function getCabinTemplate(travelClass) {
  const normalized = String(travelClass || "Economy").toLowerCase();

  if (normalized.includes("first")) {
    return {
      rows: [1, 2],
      seatLetters: ["A", "C", "D", "F"],
      extraLegroomRows: new Set([1]),
      zoneName: getZoneName(travelClass),
    };
  }

  if (normalized.includes("business")) {
    return {
      rows: [3, 4, 5, 6],
      seatLetters: ["A", "C", "D", "F"],
      extraLegroomRows: new Set([3]),
      zoneName: getZoneName(travelClass),
    };
  }

  if (normalized.includes("premium economy")) {
    return {
      rows: [7, 8, 9, 10],
      seatLetters: ["A", "B", "C", "D", "E", "F"],
      extraLegroomRows: new Set([7]),
      zoneName: getZoneName(travelClass),
    };
  }

  return {
    rows: [11, 12, 13, 14, 15, 16, 17, 18],
    seatLetters: ["A", "B", "C", "D", "E", "F"],
    extraLegroomRows: new Set([11, 15]),
    zoneName: getZoneName(travelClass),
  };
}

function parseSeatCode(seatCode) {
  const match = String(seatCode || "")
    .trim()
    .toUpperCase()
    .match(/^(\d+)([A-Z]+)$/);

  if (!match) {
    return null;
  }

  return {
    rowNumber: Number(match[1]),
    seatLetter: match[2],
    label: `${match[1]}${match[2]}`,
  };
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

  const parsedSeats = seatMap.seats
    .map((seat) => {
      const parsed = parseSeatCode(seat?.seatCode || seat?.seatNumber);
      if (!parsed) {
        return null;
      }

      return {
        ...parsed,
        isBooked: Boolean(seat?.isBooked),
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

  const extraLegroomRows = new Set(rows.length > 0 ? [rows[0]] : []);

  const seats = parsedSeats.map((seat) => {
    const isExtraLegroom = extraLegroomRows.has(seat.rowNumber);
    let status = "available";

    if (seat.isBooked) {
      status = "booked";
    } else if (isExtraLegroom) {
      status = "extra";
    }

    const type = getSeatType(seat.seatLetter, seatLetters);

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
    };
  });

  return {
    rows,
    seatLetters,
    extraLegroomRows,
    zoneName: getZoneName(travelClass || seatMap.travelClass),
    seats,
    meta: {
      totalSeats: Number(seatMap.totalSeats || 0) || seats.length,
      availableSeats: Number(seatMap.availableSeats || 0),
      bookedSeats: Number(seatMap.bookedSeats || 0),
    },
  };
}

function createCabinSeats(flightId, travelClass, availableSeats) {
  const template = getCabinTemplate(travelClass);
  const random = createRandom(hashFromText(`${flightId}-${travelClass}`));

  const seats = template.rows.flatMap((rowNumber) =>
    template.seatLetters.map((seatLetter) => {
      const type = getSeatType(seatLetter, template.seatLetters);
      return {
        id: `${rowNumber}${seatLetter}`,
        label: `${rowNumber}${seatLetter}`,
        rowNumber,
        seatLetter,
        status: "available",
        isExtraLegroom: template.extraLegroomRows.has(rowNumber),
        isWindow: type === "window",
        isAisle: type === "aisle",
        isMiddle: type === "middle",
      };
    })
  );

  const totalSeats = seats.length;
  const normalizedAvailable = Math.max(1, Math.min(totalSeats, Number(availableSeats) || totalSeats));
  const bookedTarget = Math.max(0, totalSeats - normalizedAvailable);

  const indexes = Array.from({ length: totalSeats }, (_, index) => index);
  const bookedSet = new Set();

  while (bookedSet.size < Math.min(bookedTarget, totalSeats - 1)) {
    const picked = indexes[Math.floor(random() * indexes.length)];
    bookedSet.add(picked);
  }

  const normalizedSeats = seats.map((seat, index) => {
    if (bookedSet.has(index)) {
      return { ...seat, status: "booked" };
    }

    if (seat.isExtraLegroom) {
      return { ...seat, status: "extra" };
    }

    return seat;
  });

  return {
    ...template,
    seats: normalizedSeats,
  };
}

function getSeatSurcharge(seat) {
  if (!seat || seat.status === "booked") {
    return 0;
  }

  let surcharge = 0;
  if (seat.isExtraLegroom) {
    surcharge += 999;
  } else if (seat.rowNumber <= 12) {
    surcharge += 350; // preferred front rows
  }

  if (seat.isWindow) {
    surcharge += 250;
  } else if (seat.isAisle) {
    surcharge += 200;
  }

  return surcharge;
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
    flight?.className || searchContext?.cabinClass || "Economy";

  const [selectedSeatLabels, setSelectedSeatLabels] = useState(
    flowState.selectedSeatLabels || []
  );
  const [mealPreference, setMealPreference] = useState(
    flowState.mealPreference || "standard"
  );
  const [baggagePlan, setBaggagePlan] = useState(flowState.baggagePlan || "20kg");
  const [selectionError, setSelectionError] = useState("");
  const [seatMapCabin, setSeatMapCabin] = useState(null);
  const [seatMapError, setSeatMapError] = useState("");
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("seat");
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

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

  const segments = useMemo(() => {
    const src = flight?.sourceCode || searchContext?.source || "DEL";
    const dest = flight?.destinationCode || searchContext?.destination || "BOM";
    if (flight && Number(flight.stops) > 0) {
      return [`${src}-DEL`, `DEL-${dest}`];
    }
    return [`${src}-${dest}`];
  }, [flight, searchContext]);

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

    if (!flight?.id) {
      setSeatMapCabin(null);
      setSeatMapError("");
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    const flightId = String(flight.id);
    const shouldFetch =
      flightId &&
      !flightId.toLowerCase().includes("fallback-flight") &&
      !flightId.toLowerCase().includes("demo");

    if (!shouldFetch) {
      setSeatMapCabin(null);
      setSeatMapError("");
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsSeatMapLoading(true);
    setSeatMapError("");

    (async () => {
      try {
        const seatMap = await getFlightSeatMap(flight.id, travelClass);
        if (!isCurrent) {
          return;
        }

        const cabin = buildCabinFromSeatMap(seatMap, travelClass);
        if (!cabin) {
          setSeatMapCabin(null);
          setSeatMapError("Seat map unavailable. Showing a generated layout instead.");
          return;
        }

        setSeatMapCabin(cabin);
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        setSeatMapCabin(null);
        setSeatMapError(
          error?.message || "Seat map unavailable. Showing a generated layout instead."
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
  }, [flight?.id, travelClass]);

  const cabinData = useMemo(() => {
    if (seatMapCabin) {
      return seatMapCabin;
    }

    const fallbackSeats =
      flight?.availableSeats ||
      flight?.totalAvailableSeats ||
      flight?.totalSeats ||
      undefined;

    return createCabinSeats(flight?.id || "flight", travelClass, fallbackSeats);
  }, [flight, seatMapCabin, travelClass]);

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

    setSelectedSeatLabels((previous) =>
      previous.filter((label) => {
        const seat = seatLookup.get(label);
        return seat && seat.status !== "booked";
      })
    );
  }, [seatMapCabin]);

  const selectedSeats = useMemo(
    () => selectedSeatLabels.map((label) => seatsByLabel.get(label)).filter(Boolean),
    [selectedSeatLabels, seatsByLabel]
  );

  const previousFareSummary = flowState.fareSummary || {};
  const baseFareTotal =
    Number(previousFareSummary.baseFare || 0) ||
    (Number(flight?.fare) || 0) * travellers.seatRequired;
  const seatSurcharge = selectedSeats.reduce(
    (sum, seat) => sum + getSeatSurcharge(seat),
    0
  );
  const mealFee = mealPreference === "premium" ? 450 : mealPreference === "lite" ? 180 : 0;
  const baggageFee = baggagePlan === "30kg" ? 950 : baggagePlan === "40kg" ? 1850 : 0;
  const tax = Number(previousFareSummary.tax || 0);
  const convenienceFee = Number(previousFareSummary.convenienceFee || 0);
  const discount = Number(previousFareSummary.discount || flowState.couponDiscount || 0);
  const assuredFee = Number(previousFareSummary.assuredFee || 0);
  const totalFare =
    baseFareTotal +
    seatSurcharge +
    mealFee +
    baggageFee +
    tax +
    convenienceFee +
    assuredFee -
    discount;

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

    setSelectedSeatLabels((previous) => {
      if (previous.includes(seat.label)) {
        return previous.filter((label) => label !== seat.label);
      }

      if (previous.length >= travellers.seatRequired) {
        setSelectionError(
          `You can select up to ${travellers.seatRequired} seat(s) for this booking.`
        );
        return previous;
      }

      return [...previous, seat.label];
    });
  };

  const handleContinue = () => {
    if (selectedSeats.length !== travellers.seatRequired) {
      setSelectionError(
        `Select exactly ${travellers.seatRequired} seat(s) to continue to payment.`
      );
      return;
    }

    const passengersWithSeats = Array.isArray(flowState.passengers)
      ? flowState.passengers.map((passenger, index) => ({
          ...passenger,
          seatLabel: selectedSeats[index]?.label || passenger.seatLabel || "",
        }))
      : [];

    const flowPayload = {
      ...flowState,
      flight,
      searchContext,
      selectedSeatLabels,
      selectedSeats,
      passengers: passengersWithSeats,
      mealPreference,
      baggagePlan,
      fareSummary: {
        baseFare: baseFareTotal,
        seatSurcharge,
        mealFee,
        baggageFee,
        tax,
        convenienceFee,
        assuredFee,
        discount,
        totalFare,
      },
      payableAmount: totalFare,
    };

    writeFlightBookingFlowState(flowPayload);
    navigate("/flight/payment", { state: flowPayload });
  };

  return (
    <main className="flight-flow-page">
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
            <h3 className="sidebar-card-title">Your Flight</h3>
            <div className="flight-segment">
              <div className="flight-city-info">
                <span className="flight-city-code">{flight.sourceCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.source || "--"}</span>
              </div>
              <div className="flight-stops-indicator">
                <span className="stops-text">{Number(flight.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                <div className="stops-line"></div>
              </div>
              <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                <span className="flight-city-code">{flight.destinationCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.destination || "--"}</span>
              </div>
            </div>
            <div className="flight-meta-info">
              <span>{flight.airlineName} ({flight.flightNumber})</span>
              <span className="flight-date-badge">{flight.departDate || "--"}</span>
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
            {seatSurcharge > 0 && (
              <div className="fare-row">
                <span>Seat Surcharge</span>
                <span>₹ {seatSurcharge.toLocaleString("en-IN")}</span>
              </div>
            )}
            {(mealFee + baggageFee) > 0 && (
              <div className="fare-row">
                <span>Meals & Baggage</span>
                <span>₹ {(mealFee + baggageFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {tax.toLocaleString("en-IN")}</span>
              </div>
            )}
            {convenienceFee > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {convenienceFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {assuredFee > 0 && (
              <div className="fare-row">
                <span>PickNBook Fee</span>
                <span>₹ {assuredFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {totalFare.toLocaleString("en-IN")}</span>
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
                <div className="segment-pills">
                  {segments.map((seg, idx) => (
                    <button
                      key={seg}
                      className={`segment-pill ${activeSegmentIndex === idx ? "active" : ""}`}
                      onClick={() => setActiveSegmentIndex(idx)}
                    >
                      {seg}
                    </button>
                  ))}
                </div>

                {/* Seat Category Legends */}
                <div className="seat-legend-row">
                  <div className="legend-badge">
                    <span className="legend-color free"></span>
                    <span>Free</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color mid"></span>
                    <span>₹350 - ₹500</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color high"></span>
                    <span>₹1200 - ₹1300</span>
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
                  <h4 className="legend-title">Select Your Preferred Seat</h4>
                  <div className="airplane-legend-grid">
                    <div className="legend-item">
                      <div className="legend-seat standard free">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Middle Seat</span>
                        <span className="legend-price">Free</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat standard window">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Window</span>
                        <span className="legend-price">+₹250</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat standard aisle">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Aisle</span>
                        <span className="legend-price">+₹200</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat preferred">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Preferred Rows 2-5</span>
                        <span className="legend-price">+₹350 - ₹600</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat extra">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Extra Legroom</span>
                        <span className="legend-price">+₹999 - ₹1249</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat booked">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Booked</span>
                        <span className="legend-price">Unavailable</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-seat selected">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Selected</span>
                        <span className="legend-price">Active Selection</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Airplane Fuselage Outside Layout */}
                <div className="airplane-fuselage-wrapper">
                  {isSeatMapLoading && (
                    <div className="flight-loading-overlay">
                      <Loader2 size={24} className="spin" />
                      <p>Loading aircraft seat map...</p>
                    </div>
                  )}

                  {seatMapError && (
                    <p className="flight-flow-error">
                      <Info size={14} />
                      {seatMapError}
                    </p>
                  )}

                  <div className="airplane-fuselage">
                    {/* Airplane Nose Cone */}
                    <div className="airplane-nose">
                      <div className="cockpit-windows">
                        <span className="cockpit-window left"></span>
                        <span className="cockpit-window center"></span>
                        <span className="cockpit-window right"></span>
                      </div>
                      <div className="flight-crew-label">COCKPIT</div>
                    </div>

                    {/* Forward Galley & Lavatories */}
                    <div className="cabin-amenities forward">
                      <div className="amenity-box galley">
                        <span className="amenity-icon">🍽️</span>
                        <span className="amenity-label">Galley</span>
                      </div>
                      <div className="amenity-box lavatory">
                        <span className="amenity-icon">🚻</span>
                        <span className="amenity-label">Lavatory</span>
                      </div>
                    </div>

                    {/* Forward Exit Doors */}
                    <div className="exit-doors-row forward">
                      <div className="exit-door left">
                        <ArrowLeft size={10} /> EXIT
                      </div>
                      <div className="exit-door-spacer"></div>
                      <div className="exit-door right">
                        EXIT <ArrowRight size={10} />
                      </div>
                    </div>

                    {/* Main Cabin Seating Area */}
                    <div className="airplane-cabin">
                      {/* Left and Right Side Walls with Windows */}
                      <div className="cabin-side-wall left-wall">
                        {cabinData.rows.map((rowNumber) => (
                          <div key={`left-win-${rowNumber}`} className="wall-window-container">
                            <span className="wall-window"></span>
                          </div>
                        ))}
                      </div>

                      <div className="cabin-side-wall right-wall">
                        {cabinData.rows.map((rowNumber) => (
                          <div key={`right-win-${rowNumber}`} className="wall-window-container">
                            <span className="wall-window"></span>
                          </div>
                        ))}
                      </div>

                      {/* Aircraft Wings */}
                      <div className="airplane-wings">
                        <div className="airplane-wing left">
                          <div className="wing-engine left-engine"></div>
                        </div>
                        <div className="airplane-wing right">
                          <div className="wing-engine right-engine"></div>
                        </div>
                      </div>

                      {/* Seating Grid */}
                      <div className="seating-grid">
                        {/* Header Seat Letters */}
                        <div className="column-labels-header">
                          <span className="row-label-placeholder"></span>
                          {cabinData.seatLetters.map((letter, index) => {
                            const cols = [];
                            if (index === Math.ceil(cabinData.seatLetters.length / 2)) {
                              cols.push(<span key="aisle-lbl-space" className="aisle-label-placeholder"></span>);
                            }
                            cols.push(
                              <span key={`header-lbl-${letter}`} className="col-letter-label">
                                {letter}
                              </span>
                            );
                            return cols;
                          })}
                        </div>

                        {/* Seat Rows */}
                        {cabinData.rows.map((rowNumber) => {
                          const isExitRow = cabinData.extraLegroomRows.has(rowNumber);
                          const rowElements = [];

                          rowElements.push(
                            <span key={`row-lbl-${rowNumber}`} className="row-number-badge">
                              {rowNumber}
                            </span>
                          );

                          cabinData.seatLetters.forEach((seatLetter, index) => {
                            if (index === Math.ceil(cabinData.seatLetters.length / 2)) {
                              rowElements.push(
                                <div key={`aisle-${rowNumber}`} className="cabin-aisle">
                                  <span>AISLE</span>
                                </div>
                              );
                            }

                            const seat = seatsByLabel.get(`${rowNumber}${seatLetter}`);
                            const isSelected = selectedSeatLabels.includes(seat?.label);
                            const isBooked = !seat || seat.status === "booked";

                            let seatClass = "seat-item";
                            if (isBooked) {
                              seatClass += " booked";
                            } else if (isSelected) {
                              seatClass += " selected";
                            } else if (seat.isExtraLegroom) {
                              seatClass += " extra-legroom";
                            } else if (seat.rowNumber <= 12) {
                              seatClass += " preferred";
                            } else {
                              seatClass += " standard";
                            }

                            if (seat) {
                              if (seat.isWindow) seatClass += " seat-window";
                              else if (seat.isAisle) seatClass += " seat-aisle-side";
                              else seatClass += " seat-middle-side";
                            }

                            rowElements.push(
                              <div
                                key={seat?.id || `${rowNumber}-${seatLetter}`}
                                className="seat-container"
                                onMouseEnter={(e) => handleSeatMouseEnter(e, seat)}
                                onMouseLeave={handleSeatMouseLeave}
                              >
                                <button
                                  type="button"
                                  className={seatClass}
                                  disabled={isBooked}
                                  onClick={() => toggleSeat(seat)}
                                >
                                  <svg viewBox="0 0 100 100" className="seat-svg">
                                    <path
                                      d="M20,20 C20,10 80,10 80,20 L80,80 C80,85 75,90 70,90 L30,90 C25,90 20,85 20,80 Z"
                                      className="seat-body"
                                    />
                                    <rect x="32" y="15" width="36" height="18" rx="6" className="seat-headrest" />
                                    <path d="M28,45 L72,45 C75,45 75,78 72,78 L28,78 C25,78 25,45 28,45 Z" className="seat-cushion" />
                                    <rect x="12" y="38" width="8" height="42" rx="4" className="seat-armrest" />
                                    <rect x="80" y="38" width="8" height="42" rx="4" className="seat-armrest" />
                                  </svg>
                                  <span className="seat-letter-label">{seatLetter}</span>
                                </button>
                              </div>
                            );
                          });

                          return (
                            <div key={`row-wrap-${rowNumber}`} className="row-wrapper">
                              {isExitRow && (
                                <div className="exit-row-marker-row">
                                  <span className="marker-line"></span>
                                  <span className="marker-text">⚠️ EMERGENCY EXIT ROW (EXTRA LEGROOM)</span>
                                  <span className="marker-line"></span>
                                </div>
                              )}
                              <div className={`cabin-row ${isExitRow ? "exit-row" : ""}`}>
                                {rowElements}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Aft Galley & Lavatories */}
                    <div className="cabin-amenities aft">
                      <div className="amenity-box galley">
                        <span className="amenity-icon">🍽️</span>
                        <span className="amenity-label">Galley</span>
                      </div>
                      <div className="amenity-box lavatory">
                        <span className="amenity-icon">🚻</span>
                        <span className="amenity-label">Lavatory</span>
                      </div>
                      <div className="amenity-box lavatory">
                        <span className="amenity-icon">🚻</span>
                        <span className="amenity-label">Lavatory</span>
                      </div>
                    </div>

                    {/* Aft Exit Doors */}
                    <div className="exit-doors-row aft">
                      <div className="exit-door left">
                        <ArrowLeft size={10} /> EXIT
                      </div>
                      <div className="exit-door-spacer"></div>
                      <div className="exit-door right">
                        EXIT <ArrowRight size={10} />
                      </div>
                    </div>

                    {/* Airplane Tail Structure */}
                    <div className="airplane-tail">
                      <div className="stabilizer left"></div>
                      <div className="vertical-fin"></div>
                      <div className="stabilizer right"></div>
                    </div>
                  </div>

                  {/* Custom Floating Tooltip */}
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
                      <div className="tooltip-divider"></div>
                      <div className="tooltip-body">
                        <div className="tooltip-detail">
                          <span className="detail-label">Fare Surcharge:</span>
                          <span className="detail-value highlight">
                            {getSeatSurcharge(hoveredSeat) > 0
                              ? `₹${getSeatSurcharge(hoveredSeat).toLocaleString("en-IN")}`
                              : "Free"}
                          </span>
                        </div>
                        <div className="tooltip-features">
                          {hoveredSeat.isWindow && <span className="feature-pill">🪟 Window Seat</span>}
                          {hoveredSeat.isAisle && <span className="feature-pill">🎛️ Aisle Seat</span>}
                          {hoveredSeat.isMiddle && <span className="feature-pill">🤝 Middle Seat</span>}
                          {hoveredSeat.isExtraLegroom && (
                            <span className="feature-pill highlight-pill">🦵 Extra Legroom</span>
                          )}
                          {hoveredSeat.rowNumber === 15 && <span className="feature-pill exit-row-pill">🚨 Exit Row</span>}
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
              // Insurance Tab Content
              <div style={{ padding: "12px 0" }}>
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: 20,
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start"
                  }}
                >
                  <ShieldCheck size={36} style={{ color: "var(--secondary-color)", flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1rem" }}>
                      {flowState.assuredSecured ? "Your booking is protected" : "Add protection to your booking"}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {flowState.assuredSecured
                        ? "You have secured full refunds on cancellations under PickNBook protection."
                        : "Secure full refunds, instant payouts and 24x7 support by opting in. Go back to traveller details to secure."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Meals & Baggage Selection Card */}
          <div className="flight-main-card">
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
                  <option value="standard">Standard Meal (Included)</option>
                  <option value="lite">Lite Meal (+INR 180)</option>
                  <option value="premium">Premium Meal (+INR 450)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Checked Baggage Allowance</label>
                <select
                  className="input-control"
                  value={baggagePlan}
                  onChange={(event) => setBaggagePlan(event.target.value)}
                >
                  <option value="20kg">20kg (Included)</option>
                  <option value="30kg">30kg (+INR 950)</option>
                  <option value="40kg">40kg (+INR 1850)</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Total Fare</span>
          <span className="bottom-price-amount">₹ {totalFare.toLocaleString("en-IN")}</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleContinue}
          disabled={selectedSeats.length !== travellers.seatRequired}
        >
          Continue to Payment <ArrowRight size={16} />
        </button>
      </div>
    </main>
  );
}
