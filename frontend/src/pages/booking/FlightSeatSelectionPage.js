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
  ArrowRight
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

    return {
      id: seat.label,
      label: seat.label,
      rowNumber: seat.rowNumber,
      seatLetter: seat.seatLetter,
      status,
      isExtraLegroom,
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
    template.seatLetters.map((seatLetter) => ({
      id: `${rowNumber}${seatLetter}`,
      label: `${rowNumber}${seatLetter}`,
      rowNumber,
      seatLetter,
      status: "available",
      isExtraLegroom: template.extraLegroomRows.has(rowNumber),
    }))
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
  if (!seat) {
    return 0;
  }

  if (seat.status === "extra") {
    return 720;
  }

  return 0;
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

                {/* Seat Grid Layout */}
                <div className="flight-cabin-body" style={{ padding: 0 }}>
                  {isSeatMapLoading && (
                    <p className="flight-seat-hint">
                      <Loader2 size={14} className="spin" /> Loading seat map...
                    </p>
                  )}

                  {seatMapError && (
                    <p className="flight-flow-error">
                      <Info size={14} />
                      {seatMapError}
                    </p>
                  )}

                  <div className="flight-seat-grid">
                    {cabinData.rows.map((rowNumber) => {
                      const rowLayoutClass =
                        cabinData.seatLetters.length === 6 ? "layout-6" : "layout-4";
                      const rowElements = [];

                      rowElements.push(
                        <span key={`row-${rowNumber}`} className="row-label">
                          {rowNumber}
                        </span>
                      );

                      cabinData.seatLetters.forEach((seatLetter, index) => {
                        if (index === Math.ceil(cabinData.seatLetters.length / 2)) {
                          rowElements.push(
                            <span key={`aisle-${rowNumber}`} className="seat-aisle" />
                          );
                        }

                        const seat = seatsByLabel.get(`${rowNumber}${seatLetter}`);
                        const isDisabled = !seat || seat?.status === "booked";
                        const isSelected = selectedSeatLabels.includes(seat?.label);

                        let seatCategoryClass = "status-available";
                        if (seat?.status === "booked") {
                          seatCategoryClass = "status-booked";
                        } else if (seat?.status === "extra") {
                          seatCategoryClass = "status-extra";
                        }

                        rowElements.push(
                          <button
                            key={seat?.id || `${rowNumber}-${seatLetter}`}
                            type="button"
                            className={`flight-seat ${seatCategoryClass} ${
                              isSelected ? "status-selected" : ""
                            }`}
                            disabled={isDisabled}
                            onClick={() => toggleSeat(seat)}
                            style={{
                              backgroundColor: isSelected
                                ? "#f4f8fd"
                                : seat?.status === "booked"
                                ? "#d6dee9"
                                : seat?.status === "extra"
                                ? "#fee2e2"
                                : "#d1fae5",
                              borderColor: isSelected
                                ? "#2f5e9c"
                                : seat?.status === "booked"
                                ? "#abbdd3"
                                : seat?.status === "extra"
                                ? "#fca5a5"
                                : "#a7f3d0",
                              color: isSelected ? "#163865" : "#1e293b"
                            }}
                          >
                            {seatLetter}
                          </button>
                        );
                      });

                      return (
                        <div className={`flight-seat-row ${rowLayoutClass}`} key={`row-wrap-${rowNumber}`}>
                          {rowElements}
                        </div>
                      );
                    })}
                  </div>

                  <p className="flight-seat-hint" style={{ marginTop: 12 }}>
                    Please select {travellers.seatRequired} seat(s). Extra legroom seats have added charges.
                  </p>

                  {selectionError && (
                    <p className="flight-flow-error" style={{ color: "var(--danger-color)", margin: "8px 0" }}>
                      <Info size={14} />
                      {selectionError}
                    </p>
                  )}
                </div>
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
