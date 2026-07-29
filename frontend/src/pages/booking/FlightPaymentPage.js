/* eslint-disable */
import React, { useState, useEffect } from "react";
import {
  Loader2,
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
import BookingTimer from "./BookingTimer";
import { saveBookingPassengersToTravelers } from "../../utils/travelerStorage";
import {
  clearFlightBookingFlowState,
  readFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { getAccountProfile } from "../../services/accountProfileService";
import { getLedgerStatement } from "../../services/b2bService";
import {
  UpiIcon,
  CardIcon,
  NetBankingIcon,
  WalletIcon,
  PaytmIcon,
  PhonePeIcon,
  AmazonPayIcon,
  MobiKwikIcon
} from "../../components/PaymentIcons";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: UpiIcon },
  { id: "card", label: "Credit / Debit Card", icon: CardIcon },
  { id: "netbanking", label: "Net Banking", icon: NetBankingIcon },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

function formatCurrency(amount) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0))}`;
}

function isPaymentInputValid(method, formValues, upiSubMethod = "qr") {
  if (method === "agent_wallet") {
    return true;
  }

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

function ddMmYyyyToYyyyMmDd(val) {
  if (!val) return "";
  const match = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return val;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function mapPassengersForApi(passengers) {
  return (Array.isArray(passengers) ? passengers : []).map((passenger, index) => ({
    fullName: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim() || `Passenger ${index + 1}`,
    passengerType: passenger.passengerType || "Adult",
    gender: passenger.gender || "Male",
    nationality: passenger.nationality || "Indian",
    ...(passenger.dob ? { dob: ddMmYyyyToYyyyMmDd(passenger.dob) } : {}),
    ...(passenger.seatLabel ? { seatNumber: passenger.seatLabel } : {}),
  }));
}

function resolveCleanTravelClass(travelClass) {
  if (!travelClass || typeof travelClass !== "string") {
    return "Economy";
  }
  const clean = travelClass.toLowerCase();
  if (clean.includes("premium economy")) return "Premium Economy";
  if (clean.includes("premium business")) return "Premium Business";
  if (clean.includes("economy")) return "Economy";
  if (clean.includes("business")) return "Business";
  if (clean.includes("first")) return "First Class";
  return travelClass;
}

function buildFlightBookingPayload(flowState) {
  const passengers = mapPassengersForApi(flowState.passengers);
  const rawClass =
    flowState.flight?.selectedTravelClass ||
    flowState.flight?.className ||
    flowState.searchContext?.cabinClass ||
    "Economy";

  const adults = (flowState.passengers || []).filter(p => p.passengerType === "Adult").length;
  const children = (flowState.passengers || []).filter(p => p.passengerType === "Child").length;
  const infants = (flowState.passengers || []).filter(p => p.passengerType === "Infant").length;

  return {
    passengerName: passengers[0]?.fullName || "Passenger",
    passengerPhone: String(flowState.contact?.mobile || "").trim(),
    passengerEmail: String(flowState.contact?.email || "").trim(),
    travelClass: resolveCleanTravelClass(rawClass),
    passengers,
    couponCode: flowState.couponCode ? flowState.couponCode.trim().toUpperCase() : null,
    selectedFeaturedOfferId: flowState.selectedFeaturedOfferId || null,
    selectedPromotionId: flowState.selectedFeaturedOfferId || null,
    adults: adults || 1,
    children: children || 0,
    infants: infants || 0,
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
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label || paymentMethod),
    fare: {
      baseFare: Number(fareSummary.baseFare || 0),
      tax: Number(fareSummary.tax || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(flowState.couponDiscount || fareSummary.discount || 0),
      totalFare: Number(flowState.payableAmount || fareSummary.totalFare || 0),
      tripSecureFee: Number(fareSummary.tripSecureFee || 0),
      travelAssistanceFee: Number(fareSummary.travelAssistanceFee || 0),
      zeroCancellationFee: Number(fareSummary.zeroCancellationFee || 0),
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

  const activePortal = sessionStorage.getItem("active_portal");
  const isAgent = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
  const [agentProfile, setAgentProfile] = useState(null);

  useEffect(() => {
    if (isAgent) {
      // 1. Initial cached profile load (if available)
      getAccountProfile()
        .then((profile) => {
          if (profile) setAgentProfile(profile);
        })
        .catch((err) => console.error("Error loading agent cached profile", err));

      // 2. Fetch live wallet balance from B2B Ledger statement
      getLedgerStatement()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) => {
              const dateA = new Date(a.createdAtUtc || a.createdAt || a.date || 0).getTime();
              const dateB = new Date(b.createdAtUtc || b.createdAt || b.date || 0).getTime();
              if (dateA !== dateB) return dateB - dateA;
              return (b.id || 0) - (a.id || 0);
            });
            const latest = sorted[0];
            if (latest && latest.runningBalance !== undefined) {
              setAgentProfile((prev) => ({
                ...(prev || {}),
                walletBalance: Number(latest.runningBalance)
              }));
            }
          }
        })
        .catch((err) => console.error("Error loading live agent ledger balance", err));
    }
  }, [isAgent]);

  const availableMethods = isAgent
    ? [{ id: "agent_wallet", label: "Agent Wallet", icon: WalletIcon }, ...PAYMENT_METHODS]
    : PAYMENT_METHODS;

  const [selectedMethod, setSelectedMethod] = useState(isAgent ? "agent_wallet" : "upi");
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
    const interval = setInterval(() => {
      setQrTimer((t) => (t > 0 ? t - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    if (selectedMethod === "agent_wallet") {
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const markup = Number(flowState.fareSummary?.markup || 0);
      const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
      const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
      const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
      if (balance < wholesalePrice) {
        setPaymentError(`Insufficient wallet balance. You need ₹ ${wholesalePrice.toFixed(2)} (wholesale price) but only have ₹ ${balance.toFixed(2)}.`);
        return;
      }
    } else {
      if (!isPaymentInputValid(selectedMethod, formValues, upiSubMethod)) {
        setPaymentError("Enter valid payment details for the selected method.");
        return;
      }
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

      const bookingReference = response?.bookingReference || `PNB-${Date.now().toString().slice(-8)}`;

      if (isAgent && agentProfile) {
        const markup = Number(flowState.fareSummary?.markup || 0);
        const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
        const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
        const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
        const updatedBalance = Number(agentProfile.walletBalance) - Number(wholesalePrice);
        const updatedProfile = { ...agentProfile, walletBalance: updatedBalance };
        
        if (localStorage.getItem("b2b_user")) {
          localStorage.setItem("b2b_user", JSON.stringify(updatedProfile));
        }
        localStorage.setItem("user", JSON.stringify(updatedProfile));

      }

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

      try {
        const existingStr = localStorage.getItem("mock_tickets");
        const existing = existingStr ? JSON.parse(existingStr) : [];
        existing.unshift(ticketPayload);
        localStorage.setItem("mock_tickets", JSON.stringify(existing));
      } catch (e) {
        console.error("Error saving mock flight booking:", e);
      }

      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      sessionStorage.removeItem("booking_session_expiry");
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
      <BookingTimer />
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
            {Number(fareSummary.tripSecureFee) > 0 && (
              <div className="fare-row">
                <span>Trip Secure Fee</span>
                <span>₹ {Number(fareSummary.tripSecureFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.travelAssistanceFee) > 0 && (
              <div className="fare-row">
                <span>Travel Assistance</span>
                <span>₹ {Number(fareSummary.travelAssistanceFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.zeroCancellationFee) > 0 && (
              <div className="fare-row">
                <span>Zero Cancellation</span>
                <span>₹ {Number(fareSummary.zeroCancellationFee).toLocaleString("en-IN")}</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <h2 className="flight-main-card-title" style={{ margin: 0 }}>Select Payment Method</h2>
              <div className="qr-timer" style={{ margin: 0 }}>
                ⏳ Expiration time: <span className="timer-countdown">{formatTimer(qrTimer)}</span>
              </div>
            </div>
            
            <div className="flight-payment-methods" style={{ padding: 0, marginBottom: 24 }}>
              {availableMethods.map((method) => (
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
              {/* Agent Wallet Section */}
              {selectedMethod === "agent_wallet" && (() => {
                const markup = Number(flowState.fareSummary?.markup || 0);
                const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
                const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
                const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
                const balance = Number(agentProfile?.walletBalance ?? 0);
                const hasSufficient = balance >= wholesalePrice;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                        <span style={{ color: "var(--b2b-text-secondary)" }}>Customer Price (Collected):</span>
                        <span style={{ fontWeight: 600 }}>₹ {payableAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                        <span>Agent Markup (Your Profit):</span>
                        <span>+ ₹ {markup.toFixed(2)}</span>
                      </div>
                      {tierDiscount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                          <span>Tier Discount (Commission):</span>
                          <span>- ₹ {tierDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {volumeDiscount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                          <span>Bulk Volume Discount:</span>
                          <span>- ₹ {volumeDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                        <span style={{ fontWeight: 500 }}>Wholesale Price (To Deduct):</span>
                        <strong style={{ color: "var(--b2b-accent)" }}>₹ {wholesalePrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontWeight: 500 }}>Current Wallet Balance:</span>
                      <strong style={{ fontSize: "1.2rem", color: hasSufficient ? "#10b981" : "#ef4444" }}>
                        ₹ {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(balance)}
                      </strong>
                    </div>

                    {!hasSufficient ? (
                      <div style={{ color: "#ef4444", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                        <strong>Insufficient Balance:</strong> You need an additional ₹ {(wholesalePrice - balance).toFixed(2)} to complete this booking. Please top up your wallet in the B2B portal.
                      </div>
                    ) : (
                      <div style={{ color: "#10b981", fontSize: "0.85rem", background: "rgba(16, 185, 129, 0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                        ✔ Balance is sufficient. Click <strong>Pay Now</strong> to proceed (only ₹ {wholesalePrice.toFixed(2)} will be debited).
                      </div>
                    )}
                  </div>
                );
              })()}

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
                      { id: "paytm", label: "Paytm", icon: PaytmIcon },
                      { id: "amazonpay", label: "Amazon Pay", icon: AmazonPayIcon },
                      { id: "phonepe", label: "PhonePe Wallet", icon: PhonePeIcon },
                      { id: "mobikwik", label: "MobiKwik", icon: MobiKwikIcon },
                    ].map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        className={`wallet-card-btn ${formValues.walletProvider === wallet.id ? "active" : ""}`}
                        onClick={() => setFormValues((prev) => ({ ...prev, walletProvider: wallet.id }))}
                      >
                        <span className="wallet-logo-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                          <wallet.icon size={24} />
                        </span>
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
