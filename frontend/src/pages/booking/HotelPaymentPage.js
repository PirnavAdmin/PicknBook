import React, { useMemo, useState } from "react";
import { CreditCard, Landmark, Loader2, Smartphone, Wallet } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookHotel } from "../../services/hotelBookingService";
import "../../STYLES/FlightBookingFlow.css"; // Reuse checkout styling
import {
  clearHotelBookingFlowState,
  readHotelBookingFlowState,
} from "./hotelBookingFlowStore";

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

function calculateNights(inDate, outDate) {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate);
  const d2 = new Date(outDate);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
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

function buildTicketPayload(flowState, bookingResponse, paymentMethod, nights) {
  const hotel = flowState.hotel || {};
  const offer = flowState.offer || {};
  const fareSummary = flowState.fareSummary || {};
  const reference = bookingResponse?.bookingReference || `HT-${Date.now().toString().slice(-8)}`;
  const checkInDate = offer.checkInDate ? new Date(offer.checkInDate) : new Date();
  const checkOutDate = offer.checkOutDate ? new Date(offer.checkOutDate) : new Date();

  return {
    ticketType: "hotel",
    bookingReference: reference,
    status: bookingResponse?.status || "Confirmed",
    providerName: hotel.name || "Hotel Stay",
    tripNumber: offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Room Booking",
    fromCity: hotel.name || "Hotel",
    toCity: hotel.city || "Stay",
    departureTime: checkInDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    arrivalTime: checkOutDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    duration: `${nights} Night${nights > 1 ? "s" : ""}`,
    bookedAt: bookingResponse?.createdAt || new Date().toISOString(),
    passengers: [
      {
        name: flowState.guestName || "Guest Occupant",
        passengerType: "Primary Guest",
        seat: offer.bedType ? `${offer.bedType} Bed` : "1 Room",
      }
    ],
    seats: [offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"],
    contact: {
      email: flowState.guestEmail,
      mobile: flowState.guestPhone,
      whatsappUpdates: false
    },
    paymentMethod: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || paymentMethod,
    fare: {
      baseFare: Number(fareSummary.baseFare || 0),
      tax: Number(fareSummary.tax || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(fareSummary.discount || 0),
      totalFare: Number(fareSummary.totalFare || 0),
    },
    totalPaid: Number(fareSummary.totalFare || 0),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: "Skipped",
    },
    mode: "live"
  };
}

export default function HotelPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readHotelBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.hotel ? incomingState : persistedState || {};

  const hotel = flowState.hotel || null;
  const offer = flowState.offer || null;
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);

  const nights = useMemo(() => {
    return calculateNights(offer?.checkInDate, offer?.checkOutDate);
  }, [offer]);

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

  if (!hotel || !offer) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Payment details unavailable</h2>
            <p>Complete stay and guest details before entering payment.</p>
            <button type="button" onClick={() => navigate("/search/hotels")}>Back to Hotel Search</button>
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

      const response = await bookHotel({
        offerId: offer.offerId,
        guestName: flowState.guestName,
        guestEmail: flowState.guestEmail,
        guestPhone: flowState.guestPhone,
        couponCode: flowState.couponCode,
        selectedFeaturedOfferId: flowState.selectedFeaturedOfferId
      });

      const ticketPayload = buildTicketPayload(
        flowState,
        response,
        selectedMethod,
        nights
      );

      clearHotelBookingFlowState();
      navigate("/ticket/confirmation", { state: ticketPayload, replace: true });
    } catch (error) {
      setPaymentError(error.message || "Failed to process payment and confirm booking. Please try again.");
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

            <div className="flight-summary-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ margin: "0", fontSize: "0.92rem", fontWeight: "750" }}><strong>{hotel.name}</strong></p>
              <p style={{ margin: "0", fontSize: "0.82rem", color: "var(--hotel-muted)" }}>
                {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}
              </p>
              <p style={{ margin: "0", fontSize: "0.82rem", color: "var(--hotel-muted)" }}>
                Stay: {nights} Night{nights > 1 ? "s" : ""}
              </p>
              <p style={{ margin: "0", fontSize: "0.82rem", color: "var(--hotel-muted)" }}>
                Primary Guest: {flowState.guestName}
              </p>
            </div>

            <div className="flight-fare-list" style={{ marginTop: "14px" }}>
              <div>
                <span>Room Base Charges</span>
                <strong>{formatCurrency(fareSummary.baseFare)}</strong>
              </div>
              <div>
                <span>Taxes & Fees</span>
                <strong>{formatCurrency(fareSummary.tax)}</strong>
              </div>
              <div>
                <span>Convenience Fee</span>
                <strong>{formatCurrency(fareSummary.convenienceFee)}</strong>
              </div>
              {Number(fareSummary.discount) > 0 && (
                <div>
                  <span>Coupon Discount</span>
                  <strong>-{formatCurrency(fareSummary.discount)}</strong>
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
