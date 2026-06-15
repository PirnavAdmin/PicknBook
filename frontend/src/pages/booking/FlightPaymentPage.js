import React, { useState } from "react";
import {
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
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

function isPaymentInputValid(method, formValues) {
  if (method === "upi") {
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
    if (!isPaymentInputValid(selectedMethod, formValues)) {
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
      <div className="flight-flow-shell">
        <section className="flight-payment-layout">
          <div className="flight-section-card">
            <header className="flight-card-head">
              <h2>Select Payment Method</h2>
            </header>

            <div className="flight-payment-methods">
              {PAYMENT_METHODS.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  className={selectedMethod === method.id ? "active" : ""}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <method.icon size={15} />
                  <span>{method.label}</span>
                </button>
              ))}
            </div>

            <header className="flight-card-head">
              <h3>Payment Details</h3>
            </header>

            <div className="flight-payment-form">
              {selectedMethod === "upi" && (
                <label>
                  <span>UPI ID</span>
                  <input
                    type="text"
                    placeholder="name@bank"
                    value={formValues.upiId}
                    onChange={(event) =>
                      setFormValues((previous) => ({ ...previous, upiId: event.target.value }))
                    }
                  />
                </label>
              )}

              {selectedMethod === "card" && (
                <>
                  <label>
                    <span>Card Number</span>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={formValues.cardNumber}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          cardNumber: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Name on Card</span>
                    <input
                      type="text"
                      placeholder="Card holder name"
                      value={formValues.nameOnCard}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          nameOnCard: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Expiry (MM/YY)</span>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={formValues.expiry}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          expiry: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>CVV</span>
                    <input
                      type="password"
                      placeholder="CVV"
                      value={formValues.cvv}
                      onChange={(event) =>
                        setFormValues((previous) => ({ ...previous, cvv: event.target.value }))
                      }
                    />
                  </label>
                </>
              )}

              {selectedMethod === "netbanking" && (
                <label>
                  <span>Select Bank</span>
                  <select
                    value={formValues.bankName}
                    onChange={(event) =>
                      setFormValues((previous) => ({ ...previous, bankName: event.target.value }))
                    }
                  >
                    <option value="">Choose bank</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="axis">Axis Bank</option>
                  </select>
                </label>
              )}

              {selectedMethod === "wallet" && (
                <label>
                  <span>Select Wallet</span>
                  <select
                    value={formValues.walletProvider}
                    onChange={(event) =>
                      setFormValues((previous) => ({
                        ...previous,
                        walletProvider: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose wallet</option>
                    <option value="paytm">Paytm</option>
                    <option value="amazonpay">Amazon Pay</option>
                    <option value="phonepe">PhonePe Wallet</option>
                  </select>
                </label>
              )}
            </div>
          </div>

          <aside className="flight-side-card">
            <h3>Booking Summary</h3>

            <div className="flight-summary-list">
              <p><strong>{flight.airlineName}</strong> ({flight.flightNumber})</p>
              <p>{flowState.searchContext?.source} &rarr; {flowState.searchContext?.destination}</p>
              <p>Seats: {selectedSeats.map((seat) => seat.label).join(", ")}</p>
              <p>Passengers: {passengers.length}</p>
            </div>

            <div className="flight-fare-list">
              <div>
                <span>Base Fare</span>
                <strong>{formatCurrency(fareSummary.baseFare)}</strong>
              </div>
              <div>
                <span>Taxes</span>
                <strong>{formatCurrency(fareSummary.tax)}</strong>
              </div>
              <div>
                <span>Convenience Fee</span>
                <strong>{formatCurrency(fareSummary.convenienceFee)}</strong>
              </div>
              {Number(flowState.couponDiscount) > 0 && (
                <div>
                  <span>Coupon Discount</span>
                  <strong>{formatCurrency(flowState.couponDiscount)}</strong>
                </div>
              )}
              <div className="total">
                <span>Payable Amount</span>
                <strong>{formatCurrency(payableAmount)}</strong>
              </div>
            </div>

            {paymentError && <p className="flight-flow-error">{paymentError}</p>}

            <button
              type="button"
              className="flight-pay-btn"
              onClick={handlePayNow}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Processing...</span>
                </>
              ) : (
                `Pay ${formatCurrency(payableAmount)}`
              )}
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
