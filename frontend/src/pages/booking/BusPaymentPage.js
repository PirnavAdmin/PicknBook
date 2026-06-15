import React, { useState } from "react";
import {
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  bookBus,
  calculateBusPayableAmount,
  getBusPromotionDiscountAmount,
} from "../../services/busBookingService";
import { sendBookingNotifications } from "../../services/bookingNotificationsService";
import "../../STYLES/BusBookingFlow.css";
import { saveBookingPassengersToTravelers } from "../../utils/travelerStorage";
import {
  clearBusBookingFlowState,
  readBusBookingFlowState,
} from "./busBookingFlowStore";

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN").format(Number(amount) || 0)}`;
}

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

function buildBookingPayload(flowState) {
  const firstPassenger = flowState.passengers?.[0] || {};
  const mobile = String(flowState.contact?.mobile || "").trim();

  const selectedSeats = Array.isArray(flowState.selectedSeats)
    ? flowState.selectedSeats
    : [];

  const fallbackPassengers = selectedSeats.map((seat, index) => {
    const seatNumber = String(seat?.label || "").trim();

    return {
      fullName: `Passenger ${index + 1}`,
      FullName: `Passenger ${index + 1}`,
      age: 25,
      Age: 25,
      gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      Gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
    };
  });

  const normalizedPassengers =
    Array.isArray(flowState.passengers) && flowState.passengers.length > 0
      ? flowState.passengers.map((passenger, index) => {
          const fullName = `${passenger.title || ""} ${
            passenger.firstName || ""
          } ${passenger.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim();

          const rawSeat =
            selectedSeats[index]?.label || passenger.seatLabel || "";
          const seatNumber = String(rawSeat).trim();

          const normalizedTitle = String(passenger.title || "").toLowerCase();
          const passengerGender = String(passenger.gender || "").trim();

          const ageNumber = Number(passenger.age ?? passenger.Age);

          return {
            fullName: fullName || `Passenger ${index + 1}`,
            FullName: fullName || `Passenger ${index + 1}`,
            age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            Age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            Gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
          };
        })
      : fallbackPassengers;

  return {
    passengerName: `${firstPassenger.title || ""} ${
      firstPassenger.firstName || ""
    } ${firstPassenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim(),
    passengerPhone: mobile,
    passengerEmail: String(flowState.contact?.email || "").trim(),
    couponCode: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      const hasPromo = pId !== undefined && pId !== null && pId !== "";
      return hasPromo ? null : (flowState.couponCode || null);
    })(),
    promotionId: null,
    selectedFeaturedOfferId: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      if (pId !== undefined && pId !== null && pId !== "") {
        const numericId = Number(pId);
        return Number.isNaN(numericId) ? null : numericId;
      }
      return null;
    })(),
    seats: normalizedPassengers.length,
    seatCodes: selectedSeats
      .map((seat) => seat.label || seat.seatCode || seat)
      .map((seatCode) => String(seatCode || "").trim())
      .filter(Boolean),
    passengerWhatsapp: String(
      flowState.contact?.whatsappNumber || flowState.contact?.mobile || ""
    ).trim(),
    sendEmailUpdates: Boolean(flowState.contact?.email),
    sendSmsUpdates: Boolean(flowState.contact?.mobile),
    sendWhatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    passengers: normalizedPassengers,
  };
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

function shouldUseDemoFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("cannot")
  );
}

function buildBusTicketPayload(
  flowState,
  bookingReference,
  paymentMethod,
  mode = "live"
) {
  const bus = flowState.bus || {};
  const selectedSeats = Array.isArray(flowState.selectedSeats)
    ? flowState.selectedSeats
    : [];
  const passengers = Array.isArray(flowState.passengers)
    ? flowState.passengers
    : [];
  const fareSummary = flowState.fareSummary || {};
  const hasAppliedFareDiscount = Boolean(
    flowState.couponCode ||
      flowState.appliedCoupon ||
      flowState.selectedFeaturedOfferId ||
      flowState.selectedOffer?.selectedFeaturedOfferId ||
      flowState.selectedOffer?.id ||
      flowState.selectedOffer?.offerId ||
      flowState.pricingPreview?.appliedPromotionCode
  );

  return {
    ticketType: "bus",
    bookingReference,
    status: "Booked",
    providerName: bus.operatorName || "Bus Service",
    tripNumber: bus.busNumber || "--",
    fromCity: bus.fromCity || flowState.searchContext?.source || "--",
    toCity: bus.toCity || flowState.searchContext?.destination || "--",
    departureTime: [flowState.searchContext?.departureDate, bus.departureTime]
      .filter(Boolean)
      .join(" "),
    arrivalTime: bus.arrivalTime || "--",
    duration: bus.duration || "--",
    bookedAt: new Date().toISOString(),
    passengers: passengers.map((passenger) => ({
      name: `${passenger.title || ""} ${passenger.firstName || ""} ${
        passenger.lastName || ""
      }`
        .replace(/\s+/g, " ")
        .trim(),
      passengerType: "Adult",
      seat: passenger.seatLabel || "",
    })),
    seats: selectedSeats.map((seat) => seat.label || seat),
    contact: flowState.contact || {},
    paymentMethod:
      PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label ||
      paymentMethod,
    fare: {
      subtotalBeforeCoupon: Number(flowState.pricingPreview?.subtotalBeforeCoupon || fareSummary.subtotalBeforeCoupon || fareSummary.baseFare || 0),
      autoDiscountAmount: Number(flowState.pricingPreview?.autoDiscountAmount || 0),
      couponDiscountAmount: hasAppliedFareDiscount
        ? getBusPromotionDiscountAmount(flowState.pricingPreview, flowState.couponDiscount)
        : 0,
      taxableFare: Number(flowState.pricingPreview?.taxableFare || fareSummary.taxableFare || 0),
      gstPercent: Number(flowState.pricingPreview?.gstPercent || fareSummary.gstPercent || 0),
      gstAmount: Number(flowState.pricingPreview?.gstAmount || fareSummary.gstAmount || fareSummary.tax || 0),
      convenienceFee: Number(flowState.pricingPreview?.convenienceFee || fareSummary.convenienceFee || 0),
      totalFare: calculateBusPayableAmount(
        flowState.pricingPreview,
        flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
      ),
    },
    totalPaid: calculateBusPayableAmount(
      flowState.pricingPreview,
      flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
    ),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: flowState.contact?.whatsappUpdates ? "Queued" : "Skipped",
    },
    mode,
  };
}

function navigateToBusPrintTicket(navigate, bookingReference, contact) {
  const reference = String(bookingReference || "").trim();
  const contactEmail = String(contact?.email || "").trim();
  const contactMobile = String(contact?.mobile || "").trim();

  navigate("/print-ticket", {
    replace: true,
    state: {
      pnr: reference,
      email: contactEmail,
      mobile: contactMobile,
      bookingType: "bus",
      forceFetch: true,
    },
  });
}

export default function BusPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readBusBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.bus ? incomingState : persistedState || {};

  const bus = flowState.bus || null;
  const selectedSeats = flowState.selectedSeats || [];
  const boardingPoint = flowState.boardingPoint || null;
  const droppingPoint = flowState.droppingPoint || null;
  const passengers = flowState.passengers || [];
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = calculateBusPayableAmount(
    flowState.pricingPreview,
    flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
  );

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

  if (!bus || !boardingPoint || !droppingPoint || selectedSeats.length === 0) {
    return (
      <main className="bus-flow-page">
        <div className="bus-flow-shell">
          <section className="bus-flow-empty">
            <h2>Payment details unavailable</h2>
            <p>Complete seat and passenger details before opening payment.</p>
            <button
              type="button"
              onClick={() => navigate("/bus/passenger-details")}
            >
              Back to Passenger Details
            </button>
          </section>
        </div>
      </main>
    );
  }

  const handlePayNow = async () => {
    if (isSubmitting) return;

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

      const busId = bus.id ?? bus.busId;

      if (!busId) {
        throw new Error(
          "Bus ID is missing. Cannot complete booking. Please go back and re-select your bus."
        );
      }

      const bookingPayload = buildBookingPayload(flowState);
      console.log("BUS BOOKING PAYLOAD:", bookingPayload);

      const response = await bookBus({
        busId,
        payload: bookingPayload,
      });

      const bookingReference =
        response?.bookingReference || `PNB-${Date.now().toString().slice(-8)}`;

      const ticketPayload = buildBusTicketPayload(
        flowState,
        bookingReference,
        selectedMethod,
        "live"
      );

      const notificationStatus = await sendBookingNotifications({
        bookingReference,
        ticketType: "bus",
        providerName: ticketPayload.providerName,
        fromCity: ticketPayload.fromCity,
        toCity: ticketPayload.toCity,
        departureTime: ticketPayload.departureTime,
        contact: ticketPayload.contact,
      });

      ticketPayload.notifications = notificationStatus;

      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      clearBusBookingFlowState();
      navigateToBusPrintTicket(navigate, bookingReference, flowState.contact);
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
    <main className="bus-flow-page">
      <div className="bus-flow-shell">
        <section className="flow-payment-layout">
          <div className="flow-payment-main">
            <article className="flow-card">
              <header>Select Payment Method</header>

              <div className="flow-card-body">
                <div className="payment-method-grid">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      type="button"
                      key={method.id}
                      className={selectedMethod === method.id ? "active" : ""}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <method.icon size={16} />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <article className="flow-card">
              <header>Enter Payment Details</header>

              <div className="flow-card-body payment-form-grid">
                {selectedMethod === "upi" && (
                  <label>
                    <span>UPI ID</span>
                    <input
                      type="text"
                      placeholder="name@bank"
                      value={formValues.upiId}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          upiId: event.target.value,
                        }))
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
                          setFormValues((previous) => ({
                            ...previous,
                            cvv: event.target.value,
                          }))
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
                        setFormValues((previous) => ({
                          ...previous,
                          bankName: event.target.value,
                        }))
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
            </article>
          </div>

          <aside className="flow-payment-side">
            <article className="flow-card">
              <header>Booking Summary</header>

              <div className="flow-card-body summary-list">
                <p>
                  <strong>{bus.operatorName}</strong>
                </p>
                <p>
                  {bus.fromCity} → {bus.toCity}
                </p>
                <p>
                  Seat(s): {selectedSeats.map((seat) => seat.label).join(", ")}
                </p>
                <p>
                  Boarding: {boardingPoint.name} ({boardingPoint.time})
                </p>
                <p>
                  Dropping: {droppingPoint.name} ({droppingPoint.time})
                </p>
                <p>Passengers: {passengers.length}</p>
              </div>
            </article>

            <article className="flow-card">
              <header>Fare Details</header>

              <div className="flow-card-body fare-list">
                <div>
                  <span>Subtotal Before Coupon</span>
                  <strong>
                    {formatCurrency(
                      flowState.pricingPreview?.subtotalBeforeCoupon ||
                        fareSummary.subtotalBeforeCoupon ||
                        fareSummary.baseFare
                    )}
                  </strong>
                </div>

                {Number(flowState.pricingPreview?.autoDiscountAmount) > 0 && (
                  <div>
                    <span>Auto Discount</span>
                    <strong>
                      (-) {formatCurrency(flowState.pricingPreview.autoDiscountAmount)}
                    </strong>
                  </div>
                )}

                {/* Coupon Discount */}
                {(() => {
                  const appliedCode = flowState.pricingPreview?.appliedPromotionCode || flowState.couponCode;
                  const isPromotion = Boolean(
                    flowState.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.id ||
                      flowState.selectedOffer?.offerId
                  );
                  const hasCoupon = Boolean(appliedCode || flowState.appliedCoupon) && !isPromotion;
                  const couponAmount = hasCoupon
                    ? getBusPromotionDiscountAmount(
                        flowState.pricingPreview,
                        flowState.couponDiscount
                      )
                    : 0;

                  return hasCoupon && couponAmount > 0 ? (
                    <div>
                      <span>Coupon Discount ({appliedCode})</span>
                      <strong>(-) {formatCurrency(couponAmount)}</strong>
                    </div>
                  ) : null;
                })()}

                {/* Offer Discount */}
                {(() => {
                  const isPromotion = Boolean(
                    flowState.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.id ||
                      flowState.selectedOffer?.offerId
                  );
                  const offerAmount = isPromotion
                    ? getBusPromotionDiscountAmount(
                        flowState.pricingPreview,
                        flowState.couponDiscount
                      )
                    : 0;

                  return isPromotion && offerAmount > 0 ? (
                    <div>
                      <span>Offer Discount ({flowState.selectedOffer?.title || flowState.selectedFeaturedOfferId || ""})</span>
                      <strong>(-) {formatCurrency(offerAmount)}</strong>
                    </div>
                  ) : null;
                })()}

                <div>
                  <span>
                    GST{" "}
                    {flowState.pricingPreview?.gstPercent || fareSummary.gstPercent
                      ? `(${flowState.pricingPreview?.gstPercent || fareSummary.gstPercent}%)`
                      : ""}
                  </span>
                  <strong>
                    (+) {formatCurrency(
                      flowState.pricingPreview?.gstAmount ||
                        fareSummary.gstAmount ||
                        fareSummary.tax
                    )}
                  </strong>
                </div>

                <div>
                  <span>Convenience Fee</span>
                  <strong>
                    (+) {formatCurrency(
                      flowState.pricingPreview?.convenienceFee ||
                        fareSummary.convenienceFee
                    )}
                  </strong>
                </div>

                <div className="grand-total">
                  <span>Payable Amount</span>
                  <strong>{formatCurrency(payableAmount)}</strong>
                </div>
              </div>
            </article>

            {paymentError && <p className="flow-error">{paymentError}</p>}

            <button
              type="button"
              className="flow-pay-btn"
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
