import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
  Check,
  X,
  ShieldCheck,
  User,
  ArrowRight
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookFlight } from "../../services/flightBookingService";
import { sendBookingNotifications } from "../../services/bookingNotificationsService";
import "../../STYLES/FlightBookingFlow.css";
import { saveBookingPassengersToTravelers } from "../../utils/travelerStorage";
import {
  clearFlightBookingFlowState,
  readFlightBookingFlowState,
} from "./flightBookingFlowStore";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

function formatCurrency(amount) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0))}`;
}

function isPaymentInputValid(method, formValues, upiSubMethod = "qr") {
  if (method === "upi") {
    if (upiSubMethod === "qr") return true;
    return /\S+@\S+/.test(formValues.upiId || "");
  }

  if (method === "card") {
    return (
      String(formValues.cardNumber || "").replace(/\D/g, "").length >= 12 &&
      String(formValues.nameOnCard || "").trim().length >= 2 &&
      String(formValues.expiry || "").trim().length >= 4 &&
      String(formValues.cvv || "").replace(/\D/g, "").length >= 3
    );
  }

  if (method === "netbanking") {
    return Boolean(formValues.bankName);
  }

  if (method === "wallet") {
    return Boolean(formValues.walletProvider);
  }

  return false;
}

function mapPassengersForApi(passengers) {
  return (Array.isArray(passengers) ? passengers : []).map((passenger, index) => ({
    fullName: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim() || `Passenger ${index + 1}`,
    passengerType: passenger.passengerType || "Adult",
    gender: passenger.gender || "Male",
    ...(passenger.seatLabel ? { seatNumber: passenger.seatLabel } : {}),
  }));
}

function buildFlightBookingPayload(flowState) {
  const passengers = mapPassengersForApi(flowState.passengers);
  return {
    passengerName: passengers[0]?.fullName || "Passenger",
    passengerPhone: String(flowState.contact?.mobile || "").trim(),
    passengerEmail: String(flowState.contact?.email || "").trim(),
    travelClass: flowState.flight?.className || flowState.searchContext?.cabinClass || "Economy",
    passengers,
    couponCode: flowState.couponCode || null,
    selectedFeaturedOfferId: flowState.selectedFeaturedOfferId || null,
  };
}

function shouldUseDemoFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("cannot")
  );
}

function formatDisplayDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildTicketPayload(flowState, bookingResponse, paymentMethod, mode = "live") {
  const flight = flowState.flight || {};
  const fareSummary = flowState.fareSummary || {};
  const passengers = Array.isArray(flowState.passengers) ? flowState.passengers : [];
  const selectedSeats = Array.isArray(flowState.selectedSeats) ? flowState.selectedSeats : [];

  const bookingReference =
    bookingResponse?.bookingReference || `FL-${Date.now().toString().slice(-8)}`;
  const apiPassengers = Array.isArray(bookingResponse?.passengers)
    ? bookingResponse.passengers
    : [];
  const apiSeatAssignments = apiPassengers
    .map((passenger) => passenger?.seatNumber)
    .filter(Boolean);

  const departureDate = flowState.searchContext?.departureDate || flight.departDate || "";
  const departureTimeRaw =
    bookingResponse?.departureTimeUtc ||
    bookingResponse?.departureTimeIst ||
    [departureDate, flight.departureTime || ""].join(" ").trim();
  const arrivalTimeRaw =
    bookingResponse?.arrivalTimeUtc || bookingResponse?.arrivalTimeIst || flight.arrivalTime || "";
  const bookedAtRaw = bookingResponse?.bookedAtUtc || new Date().toISOString();

  return {
    ticketType: "flight",
    bookingReference,
    status: bookingResponse?.status || "Booked",
    providerName:
      bookingResponse?.providerName || flight.airlineName || "Flight Service",
    tripNumber:
      bookingResponse?.tripNumber ||
      bookingResponse?.flightNumber ||
      flight.flightNumber ||
      "--",
    fromCity:
      bookingResponse?.fromCity ||
      flowState.searchContext?.source ||
      flight.sourceCode ||
      "--",
    toCity:
      bookingResponse?.toCity ||
      flowState.searchContext?.destination ||
      flight.destinationCode ||
      "--",
    departureTime: formatDisplayDateTime(departureTimeRaw) || departureTimeRaw,
    arrivalTime: formatDisplayDateTime(arrivalTimeRaw) || arrivalTimeRaw,
    duration: flight.duration || "--",
    bookedAt: bookedAtRaw,
    passengers:
      apiPassengers.length > 0
        ? apiPassengers.map((passenger, index) => ({
            name: passenger.fullName || `Passenger ${index + 1}`,
            passengerType: passenger.passengerType || "Adult",
            seat: passenger.seatNumber || "",
          }))
        : passengers.map((passenger) => ({
            name: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
              .replace(/\s+/g, " ")
              .trim(),
            passengerType: passenger.passengerType || "Adult",
            seat: passenger.seatLabel || "",
          })),
    seats:
      apiSeatAssignments.length > 0
        ? apiSeatAssignments
        : selectedSeats.map((seat) => seat.label || seat),
    contact: flowState.contact || {},
    paymentMethod: PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label ||
      paymentMethod,
    fare: {
      baseFare: Number(fareSummary.baseFare || 0),
      tax: Number(fareSummary.tax || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(flowState.couponDiscount || fareSummary.discount || 0),
      totalFare: Number(flowState.payableAmount || fareSummary.totalFare || 0),
    },
    totalPaid: Number(flowState.payableAmount || fareSummary.totalFare || 0),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: flowState.contact?.whatsappUpdates ? "Queued" : "Skipped",
    },
    mode,
  };
}

export default function FlightPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const flight = flowState.flight || null;
  const passengers = flowState.passengers || [];
  const selectedSeats = flowState.selectedSeats || [];
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);

  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [upiSubMethod, setUpiSubMethod] = useState("qr");
  const [activeField, setActiveField] = useState("");
  const [qrTimer, setQrTimer] = useState(300);
  const [formValues, setFormValues] = useState({
    upiId: "",
    cardNumber: "",
    nameOnCard: "",
    expiry: "",
    cvv: "",
    bankName: "",
    walletProvider: "",
  });
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedMethod !== "upi" || upiSubMethod !== "qr") return;
    const interval = setInterval(() => {
      setQrTimer((t) => (t > 0 ? t - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedMethod, upiSubMethod]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCardNumberInput = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 16);
    const groups = value.match(/.{1,4}/g) || [];
    setFormValues((prev) => ({ ...prev, cardNumber: groups.join(" ") }));
  };

  const handleExpiryInput = (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setFormValues((prev) => ({ ...prev, expiry: value }));
  };

  const getCardNetworkLogo = (cardNumber) => {
    const clean = String(cardNumber || "").replace(/\D/g, "");
    if (clean.startsWith("4")) return <span className="network-logo visa">VISA</span>;
    if (clean.startsWith("5")) return <span className="network-logo mastercard">Mastercard</span>;
    if (clean.startsWith("6")) return <span className="network-logo rupay">RuPay</span>;
    return <span className="network-logo generic">CARD</span>;
  };

  const formatCardNumberDisplay = (cardNumber) => {
    const clean = String(cardNumber || "").replace(/\D/g, "");
    const padded = clean.padEnd(16, "•");
    const groups = padded.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };

  if (!flight || passengers.length === 0 || selectedSeats.length === 0) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Payment details unavailable</h2>
            <p>Complete seat and passenger details before opening payment.</p>
            <button type="button" onClick={() => navigate("/flight/passenger-details")}>Back to Passenger Details</button>
          </section>
        </div>
      </main>
    );
  }

  const handlePayNow = async () => {
    if (!isPaymentInputValid(selectedMethod, formValues, upiSubMethod)) {
      setPaymentError("Enter valid payment details for the selected method.");
      return;
    }

    setPaymentError("");
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });

      const response = await bookFlight({
        flightId: flight.id,
        payload: buildFlightBookingPayload(flowState),
      });

      const ticketPayload = buildTicketPayload(
        flowState,
        response,
        selectedMethod,
        "live"
      );
      const notificationStatus = await sendBookingNotifications({
        bookingReference: ticketPayload.bookingReference,
        ticketType: "flight",
        providerName: ticketPayload.providerName,
        fromCity: ticketPayload.fromCity,
        toCity: ticketPayload.toCity,
        departureTime: ticketPayload.departureTime,
        contact: ticketPayload.contact,
      });
      ticketPayload.notifications = notificationStatus;
      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      clearFlightBookingFlowState();
      navigate("/ticket/confirmation", { state: ticketPayload, replace: true });
    } catch (error) {
      const fallbackMessage = shouldUseDemoFallback(error)
        ? "Booking could not be saved to the server. Please check your connection or backend API and try again."
        : "Unable to process payment right now.";

      setPaymentError(error.message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
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
                <span className="flight-city-name">{flowState.searchContext?.source || "--"}</span>
              </div>
              <div className="flight-stops-indicator">
                <span className="stops-text">{Number(flight.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                <div className="stops-line"></div>
              </div>
              <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                <span className="flight-city-code">{flight.destinationCode || "--"}</span>
                <span className="flight-city-name">{flowState.searchContext?.destination || "--"}</span>
              </div>
            </div>
            <div className="flight-meta-info">
              <span>{flight.airlineName} ({flight.flightNumber})</span>
              <span className="flight-date-badge">{flight.departDate || "--"}</span>
            </div>
          </div>

          {/* Travellers Details */}
          {passengers && passengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {passengers.map((p, idx) => (
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
              <span>₹ {(Number(fareSummary.baseFare) || 0).toLocaleString("en-IN")}</span>
            </div>
            {Number(fareSummary.seatSurcharge) > 0 && (
              <div className="fare-row">
                <span>Seat Surcharge</span>
                <span>₹ {Number(fareSummary.seatSurcharge).toLocaleString("en-IN")}</span>
              </div>
            )}
            {(Number(fareSummary.mealFee) + Number(fareSummary.baggageFee)) > 0 && (
              <div className="fare-row">
                <span>Meals & Baggage</span>
                <span>₹ {(Number(fareSummary.mealFee) + Number(fareSummary.baggageFee)).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.tax) > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {Number(fareSummary.tax).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.markup) > 0 && (
              <div className="fare-row">
                <span>Service Markup</span>
                <span>₹ {Number(fareSummary.markup).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.convenienceFee) > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {Number(fareSummary.convenienceFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.assuredFee) > 0 && (
              <div className="fare-row">
                <span>PickNBook Fee</span>
                <span>₹ {Number(fareSummary.assuredFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(flowState.couponDiscount || fareSummary.discount) > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {Number(flowState.couponDiscount || fareSummary.discount).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {payableAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          {/* Payment Selection Card */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">Select Payment Method</h2>
            
            <div className="flight-payment-methods" style={{ padding: 0, marginBottom: 24 }}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  className={`payment-method-tab-btn ${selectedMethod === method.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMethod(method.id);
                    setPaymentError("");
                  }}
                >
                  <method.icon size={16} />
                  <span>{method.label}</span>
                </button>
              ))}
            </div>

            <div className="flight-payment-form" style={{ padding: 0 }}>
              {/* 1. UPI Payment Section */}
              {selectedMethod === "upi" && (
                <div className="upi-payment-container">
                  <div className="upi-sub-tabs">
                    <button
                      type="button"
                      className={`upi-sub-tab-btn ${upiSubMethod === "qr" ? "active" : ""}`}
                      onClick={() => setUpiSubMethod("qr")}
                    >
                      Instant QR Code
                    </button>
                    <button
                      type="button"
                      className={`upi-sub-tab-btn ${upiSubMethod === "vpa" ? "active" : ""}`}
                      onClick={() => setUpiSubMethod("vpa")}
                    >
                      Enter UPI ID
                    </button>
                  </div>

                  {upiSubMethod === "qr" ? (
                    <div className="upi-qr-scanner-box">
                      <div className="qr-code-placeholder">
                        <svg viewBox="0 0 100 100" className="mock-qr-svg">
                          <rect x="5" y="5" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="11" y="11" width="13" height="13" fill="#1e293b" />
                          <rect x="70" y="5" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="76" y="11" width="13" height="13" fill="#1e293b" />
                          <rect x="5" y="70" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="11" y="76" width="13" height="13" fill="#1e293b" />
                          <path d="M40 5h10v10H40zm15 0h10v5H55zm15 15h10v10H70zm-30 15h10v10H40zm15 0h10v5H55zm15 0h5v10h-5zm-30 15h10v10H40zm15 0h10v10H55zm15 0h10v5H70zm-30 15h5v5h-5zm10 5h10v10H50zm15 0h5v5h-5zm15 0h10v10H80z" fill="#1e293b" />
                          <path d="M5 40h10v10H5zm15 0h10v5H20zm15 15h10v10H35zm-30 15h10v10H5zm15 0h10v5H20zm15 0h10v10H35z" fill="#1e293b" />
                        </svg>
                        <div className="qr-scanner-line"></div>
                      </div>
                      <div className="qr-instructions">
                        <p className="qr-main-text">Scan & Pay using GPay, PhonePe, Paytm or BHIM</p>
                        <p className="qr-sub-text">Generate secure dynamic checkout code</p>
                        <div className="qr-timer">
                          ⏳ Expiration time: <span className="timer-countdown">{formatTimer(qrTimer)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="upi-vpa-box">
                      <div className="input-group">
                        <label>UPI ID (VPA) *</label>
                        <div className="upi-input-wrapper">
                          <input
                            className="input-control"
                            type="text"
                            placeholder="username@bank"
                            value={formValues.upiId}
                            onChange={(event) =>
                              setFormValues((previous) => ({ ...previous, upiId: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="upi-suffixes-row">
                        {["@okhdfcbank", "@okicici", "@okaxis", "@ybl", "@paytm"].map((suffix) => (
                          <button
                            key={suffix}
                            type="button"
                            className="upi-suffix-pill"
                            onClick={() => {
                              const prefix = formValues.upiId.split("@")[0] || "";
                              setFormValues((prev) => ({ ...prev, upiId: `${prefix}${suffix}` }));
                            }}
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="upi-apps-row">
                    <div className="upi-app-badge">
                      <span className="app-logo gpay">G</span>
                      <span className="app-label">Google Pay</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo phonepe">P</span>
                      <span className="app-label">PhonePe</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo paytm">Py</span>
                      <span className="app-label">Paytm</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo bhim">B</span>
                      <span className="app-label">BHIM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Card Payment Section */}
              {selectedMethod === "card" && (
                <div className="card-payment-container">
                  {/* Credit Card Preview */}
                  <div className="visual-card-wrapper">
                    <div className={`visual-card-preview ${activeField === "cvv" ? "flipped" : ""}`}>
                      <div className="card-face front">
                        <div className="card-glare"></div>
                        <div className="card-header-row">
                          <div className="card-chip">
                            <span className="chip-line"></span>
                            <span className="chip-line"></span>
                            <span className="chip-line"></span>
                          </div>
                          <div className="card-network-logo">
                            {getCardNetworkLogo(formValues.cardNumber)}
                          </div>
                        </div>
                        <div className="card-number-display">
                          {formatCardNumberDisplay(formValues.cardNumber)}
                        </div>
                        <div className="card-footer-row">
                          <div className="card-holder-display">
                            <span className="card-label">CARD HOLDER</span>
                            <span className="card-value">{formValues.nameOnCard.toUpperCase() || "HOLDER NAME"}</span>
                          </div>
                          <div className="card-expiry-display">
                            <span className="card-label">EXPIRES</span>
                            <span className="card-value">{formValues.expiry || "MM/YY"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-face back">
                        <div className="card-magnetic-stripe"></div>
                        <div className="card-signature-area">
                          <span className="signature-lines"></span>
                          <div className="card-cvv-display">{formValues.cvv || "•••"}</div>
                        </div>
                        <div className="card-back-info">
                          PCI-DSS Certified Simulated Gateway Checkout.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="card-inputs-grid">
                    <div className="input-group">
                      <label>Card Number *</label>
                      <input
                        className="input-control"
                        type="text"
                        maxLength="19"
                        placeholder="XXXX XXXX XXXX XXXX"
                        value={formValues.cardNumber}
                        onFocus={() => setActiveField("number")}
                        onBlur={() => setActiveField("")}
                        onChange={handleCardNumberInput}
                      />
                    </div>
                    <div className="input-group">
                      <label>Name on Card *</label>
                      <input
                        className="input-control"
                        type="text"
                        placeholder="Card holder name"
                        value={formValues.nameOnCard}
                        onFocus={() => setActiveField("name")}
                        onBlur={() => setActiveField("")}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            nameOnCard: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Expiry (MM/YY) *</label>
                        <input
                          className="input-control"
                          type="text"
                          maxLength="5"
                          placeholder="MM/YY"
                          value={formValues.expiry}
                          onFocus={() => setActiveField("expiry")}
                          onBlur={() => setActiveField("")}
                          onChange={handleExpiryInput}
                        />
                      </div>
                      <div className="input-group">
                        <label>CVV *</label>
                        <input
                          className="input-control"
                          type="password"
                          maxLength="4"
                          placeholder="CVV"
                          value={formValues.cvv}
                          onFocus={() => setActiveField("cvv")}
                          onBlur={() => setActiveField("")}
                          onChange={(event) =>
                            setFormValues((previous) => ({ ...previous, cvv: event.target.value.replace(/\D/g, "") }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Net Banking Payment Section */}
              {selectedMethod === "netbanking" && (
                <div className="netbanking-payment-container">
                  <label className="section-subtitle-label">Popular Banks</label>
                  <div className="popular-banks-grid">
                    {[
                      { id: "hdfc", label: "HDFC Bank", logo: "🏦" },
                      { id: "icici", label: "ICICI Bank", logo: "🏛️" },
                      { id: "sbi", label: "State Bank of India", logo: "💼" },
                      { id: "axis", label: "Axis Bank", logo: "🏬" },
                    ].map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        className={`bank-card-btn ${formValues.bankName === bank.id ? "active" : ""}`}
                        onClick={() => setFormValues((prev) => ({ ...prev, bankName: bank.id }))}
                      >
                        <span className="bank-logo-icon">{bank.logo}</span>
                        <span className="bank-label-text">{bank.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="input-group" style={{ marginTop: 16 }}>
                    <label>Or Select Other Bank</label>
                    <select
                      className="input-control"
                      value={formValues.bankName}
                      onChange={(event) =>
                        setFormValues((previous) => ({ ...previous, bankName: event.target.value }))
                      }
                    >
                      <option value="">-- Choose Other Bank --</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                      <option value="yesbank">Yes Bank</option>
                      <option value="pnb">Punjab National Bank</option>
                      <option value="indusind">IndusInd Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Wallet Payment Section */}
              {selectedMethod === "wallet" && (
                <div className="wallet-payment-container">
                  <label className="section-subtitle-label">Select Digital Wallet</label>
                  <div className="popular-wallets-grid">
                    {[
                      { id: "paytm", label: "Paytm", logo: "📱" },
                      { id: "amazonpay", label: "Amazon Pay", logo: "🛒" },
                      { id: "phonepe", label: "PhonePe Wallet", logo: "💸" },
                      { id: "mobikwik", label: "MobiKwik", logo: "👛" },
                    ].map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        className={`wallet-card-btn ${formValues.walletProvider === wallet.id ? "active" : ""}`}
                        onClick={() => setFormValues((prev) => ({ ...prev, walletProvider: wallet.id }))}
                      >
                        <span className="wallet-logo-icon">{wallet.logo}</span>
                        <span className="wallet-label-text">{wallet.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {paymentError && (
              <p style={{ color: "var(--danger-color)", fontSize: "0.813rem", fontWeight: 700, margin: "16px 0 0 0" }}>
                {paymentError}
              </p>
            )}

            {/* Payment security badges */}
            <div className="payment-security-badges">
              <div className="security-badge">
                <ShieldCheck size={14} />
                <span>PCI-DSS Compliant</span>
              </div>
              <div className="security-badge">
                <span>🔒 256-bit SSL Secured</span>
              </div>
              <div className="security-badge">
                <span>Verified by VISA / Mastercard</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Payable Amount</span>
          <span className="bottom-price-amount">₹ {payableAmount.toLocaleString("en-IN")}</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handlePayNow}
          disabled={isSubmitting}
          style={{ minWidth: 160 }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Pay ₹ {payableAmount.toLocaleString("en-IN")}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}
