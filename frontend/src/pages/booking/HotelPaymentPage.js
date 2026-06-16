import React, { useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle2, CreditCard, Landmark, Loader2, MessageSquareText, ShieldCheck, Smartphone, Star, Wallet,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookHotel } from "../../services/hotelBookingService";
import { formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import "../../STYLES/HotelCheckoutExperience.css";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net banking", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);

function isPaymentInputValid(method, formValues) {
  if (method === "upi") return /\S+@\S+/.test(formValues.upiId || "");
  if (method === "card") return String(formValues.cardNumber || "").replace(/\D/g, "").length >= 12 && String(formValues.nameOnCard || "").trim().length >= 2 && String(formValues.expiry || "").trim().length >= 4 && String(formValues.cvv || "").replace(/\D/g, "").length >= 3;
  if (method === "netbanking") return Boolean(formValues.bankName);
  if (method === "wallet") return Boolean(formValues.walletProvider);
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
    duration: formatNightLabel(nights),
    bookedAt: bookingResponse?.createdAt || new Date().toISOString(),
    passengers: [{ name: flowState.guestName || "Guest Occupant", passengerType: "Primary Guest", seat: offer.bedType ? `${offer.bedType} Bed` : "1 Room" }],
    seats: [offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"],
    contact: { email: flowState.guestEmail, mobile: flowState.guestPhone, whatsappUpdates: false },
    paymentMethod: PAYMENT_METHODS.find((entry) => entry.id === paymentMethod)?.label || paymentMethod,
    fare: { baseFare: Number(fareSummary.baseFare || 0), tax: Number(fareSummary.tax || 0), convenienceFee: Number(fareSummary.convenienceFee || 0), discount: Number(fareSummary.discount || 0), totalFare: Number(fareSummary.totalFare || 0) },
    totalPaid: Number(fareSummary.totalFare || 0),
    notifications: { email: "Queued", sms: "Queued", whatsapp: "Skipped" },
    mode: "live",
  };
}

export default function HotelPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flowState = location.state && location.state.hotel ? location.state : {};
  const hotel = flowState.hotel || null;
  const offer = flowState.offer || null;
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);
  const nights = useMemo(() => calculateNights(offer?.checkInDate, offer?.checkOutDate), [offer]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${offer?.offerId || "offer"}`), [hotel?.hotelId, hotel?.name, offer?.offerId]);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [messageToHost, setMessageToHost] = useState("");
  const [formValues, setFormValues] = useState({ upiId: "", cardNumber: "", nameOnCard: "", expiry: "", cvv: "", bankName: "", walletProvider: "" });
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hotel || !offer) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>Payment details unavailable</h2><p>Complete hotel guest details before entering payment.</p><button type="button" onClick={() => navigate("/search/hotels")}>Back to hotel search</button></section></div></main>;
  }

  const handlePayNow = async () => {
    if (!isPaymentInputValid(selectedMethod, formValues)) { setPaymentError("Enter valid payment details for the selected method."); return; }
    setPaymentError("");
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => { window.setTimeout(resolve, 1200); });
      const response = await bookHotel({ offerId: offer.offerId, guestName: flowState.guestName, guestEmail: flowState.guestEmail, guestPhone: flowState.guestPhone, couponCode: flowState.couponCode, selectedFeaturedOfferId: flowState.selectedFeaturedOfferId });
      navigate("/ticket/confirmation", { state: buildTicketPayload(flowState, response, selectedMethod, nights), replace: true });
    } catch (error) {
      setPaymentError(error.message || "Failed to confirm hotel booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldContent = selectedMethod === "upi"
    ? <label className="hotel-field"><span>UPI ID</span><input type="text" placeholder="name@bank" value={formValues.upiId} onChange={(event) => setFormValues((current) => ({ ...current, upiId: event.target.value }))} /></label>
    : selectedMethod === "card"
      ? <div className="hotel-form-grid"><label className="hotel-field"><span>Card number</span><input type="text" placeholder="XXXX XXXX XXXX XXXX" value={formValues.cardNumber} onChange={(event) => setFormValues((current) => ({ ...current, cardNumber: event.target.value }))} /></label><label className="hotel-field"><span>Name on card</span><input type="text" placeholder="Card holder name" value={formValues.nameOnCard} onChange={(event) => setFormValues((current) => ({ ...current, nameOnCard: event.target.value }))} /></label><label className="hotel-field"><span>Expiry</span><input type="text" placeholder="MM/YY" value={formValues.expiry} onChange={(event) => setFormValues((current) => ({ ...current, expiry: event.target.value }))} /></label><label className="hotel-field"><span>CVV</span><input type="password" placeholder="CVV" value={formValues.cvv} onChange={(event) => setFormValues((current) => ({ ...current, cvv: event.target.value }))} /></label></div>
      : selectedMethod === "netbanking"
        ? <label className="hotel-field"><span>Select bank</span><select value={formValues.bankName} onChange={(event) => setFormValues((current) => ({ ...current, bankName: event.target.value }))}><option value="">Choose bank</option><option value="hdfc">HDFC Bank</option><option value="icici">ICICI Bank</option><option value="sbi">State Bank of India</option><option value="axis">Axis Bank</option></select></label>
        : <label className="hotel-field"><span>Select wallet</span><select value={formValues.walletProvider} onChange={(event) => setFormValues((current) => ({ ...current, walletProvider: event.target.value }))}><option value="">Choose wallet</option><option value="paytm">Paytm</option><option value="amazonpay">Amazon Pay</option><option value="phonepe">PhonePe Wallet</option></select></label>;

  return (
    <main className="hotel-checkout-page hotel-checkout-page--confirm">
      <div className="hotel-checkout-shell">
        <button type="button" className="hotel-back-link" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back to guest details</button>
        <div className="hotel-confirm-layout">
          <div className="hotel-checkout-main">
            <section className="hotel-panel hotel-panel--headline">
              <div className="hotel-panel-kicker"><ShieldCheck size={14} /><span>Confirm and pay</span></div>
              <h1>Finish your hotel booking with a calmer final step.</h1>
              <p className="hotel-panel-copy">Your dates, guest details, backend pricing preview, and room selection are already locked in below.</p>
            </section>
            <section className="hotel-panel">
              <div className="hotel-section-heading"><h2>Message for the host</h2><p>Optional note for a smoother arrival. This is for the guest experience only.</p></div>
              <label className="hotel-field"><span className="hotel-field-inline"><MessageSquareText size={16} />Arrival note</span><textarea rows="5" value={messageToHost} onChange={(event) => setMessageToHost(event.target.value)} placeholder={`Hi ${visuals.hostName}, I will be arriving around...`} /></label>
            </section>
            <section className="hotel-panel">
              <div className="hotel-section-heading"><h2>Guest and stay summary</h2><p>Quick recap before the booking request is sent to the hotel API.</p></div>
              <div className="hotel-confirm-facts"><div><span>Primary guest</span><strong>{flowState.guestName}</strong></div><div><span>Email</span><strong>{flowState.guestEmail}</strong></div><div><span>Phone</span><strong>{flowState.guestPhone}</strong></div><div><span>Stay length</span><strong>{formatNightLabel(nights)}</strong></div></div>
            </section>
            <section className="hotel-panel">
              <div className="hotel-section-heading"><h2>Select payment method</h2><p>Choose how you want to complete the final payment step for this hotel booking.</p></div>
              <div className="hotel-method-row">{PAYMENT_METHODS.map((method) => <button key={method.id} type="button" className={`hotel-method-pill${selectedMethod === method.id ? " is-active" : ""}`} onClick={() => setSelectedMethod(method.id)}><method.icon size={16} /><span>{method.label}</span></button>)}</div>
              <div className="hotel-payment-fields">{fieldContent}</div>
              {paymentError && <p className="hotel-helper hotel-helper--error">{paymentError}</p>}
              <div className="hotel-confirm-actions"><button type="button" className="hotel-primary-button" onClick={handlePayNow} disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={14} className="hotel-spin" />Confirming...</> : `Confirm and pay ${formatCurrency(payableAmount)}`}</button><p>By continuing, you agree to the hotel booking terms and payment authorization for this reservation.</p></div>
            </section>
          </div>
          <aside className="hotel-reserve-rail">
            <div className="hotel-reserve-card hotel-reserve-card--confirm">
              <div className="hotel-reserve-preview"><img src={visuals.gallery[0]} alt={hotel.name} /><div><span>{visuals.highlightLabel}</span><strong>{hotel.name}</strong><p><Star size={13} fill="currentColor" /> {Number(hotel.rating || 4.8).toFixed(1)} · {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}</p></div></div>
              <div className="hotel-confirm-summary"><div><span>Dates</span><strong>{new Date(offer.checkInDate).toLocaleDateString("en-IN")} - {new Date(offer.checkOutDate).toLocaleDateString("en-IN")}</strong></div><div><span>Guests</span><strong>{flowState.searchContext?.guests || "Primary guest"}</strong></div></div>
              <div className="hotel-fare-breakdown"><div><span>Room base charges</span><strong>{formatCurrency(fareSummary.baseFare)}</strong></div><div><span>Taxes and fees</span><strong>{formatCurrency(fareSummary.tax)}</strong></div><div><span>Convenience fee</span><strong>{formatCurrency(fareSummary.convenienceFee)}</strong></div>{Number(fareSummary.discount) > 0 && <div className="is-discount"><span>Savings</span><strong>-{formatCurrency(fareSummary.discount)}</strong></div>}<div className="hotel-fare-total"><span>Total to pay</span><strong>{formatCurrency(payableAmount)}</strong></div></div>
              <div className="hotel-reserve-assurance"><CheckCircle2 size={16} /><span>Once confirmed, the ticket confirmation page will use the live hotel booking response from the backend.</span></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
