import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle2, Loader2, MessageSquareText, ShieldCheck, Star,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookHotel } from "../../services/hotelBookingService";
import { formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import BookingTimer from "./BookingTimer";
import "../../STYLES/HotelCheckoutExperience.css";
import { readHotelBookingFlowState, writeHotelBookingFlowState, clearHotelBookingFlowState } from "./hotelBookingFlowStore";
import {
  UpiIcon,
  CardIcon,
  NetBankingIcon,
  WalletIcon,
  PaytmIcon,
  PhonePeIcon,
  AmazonPayIcon,
  CustomWalletSelect,
} from "../../components/PaymentIcons";
import { getAccountProfile } from "../../services/accountProfileService";
import { getLedgerStatement } from "../../services/b2bService";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: UpiIcon },
  { id: "card", label: "Card", icon: CardIcon },
  { id: "netbanking", label: "Net banking", icon: NetBankingIcon },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

const WALLET_OPTIONS = [
  { id: "paytm", label: "Paytm", icon: PaytmIcon },
  { id: "amazonpay", label: "Amazon Pay", icon: AmazonPayIcon },
  { id: "phonepe", label: "PhonePe Wallet", icon: PhonePeIcon },
];

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);

function isPaymentInputValid(method, formValues) {
  if (method === "agent_wallet") return true;
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
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((entry) => entry.id === paymentMethod)?.label || paymentMethod),
    fare: { baseFare: Number(fareSummary.baseFare || 0), tax: Number(fareSummary.tax || 0), convenienceFee: Number(fareSummary.convenienceFee || 0), discount: Number(fareSummary.discount || 0), totalFare: Number(fareSummary.totalFare || 0) },
    totalPaid: Number(fareSummary.totalFare || 0),
    notifications: { email: "Queued", sms: "Queued", whatsapp: "Skipped" },
    mode: "live",
  };
}

export default function HotelPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flowState = useMemo(() => {
    const routerState = location.state && location.state.hotel ? location.state : null;
    const storedState = readHotelBookingFlowState() || {};
    const merged = { ...storedState, ...routerState };
    if (merged.hotel) {
      writeHotelBookingFlowState(merged);
      return merged;
    }
    return {};
  }, [location.state]);
  const hotel = flowState.hotel || null;
  const offer = flowState.offer || null;
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);
  const nights = useMemo(() => calculateNights(offer?.checkInDate, offer?.checkOutDate), [offer]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${offer?.offerId || "offer"}`), [hotel?.hotelId, hotel?.name, offer?.offerId]);
  const isAgent = localStorage.getItem("b2b_role") === "Agent";
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
  const [messageToHost, setMessageToHost] = useState("");
  const [formValues, setFormValues] = useState({ upiId: "", cardNumber: "", nameOnCard: "", expiry: "", cvv: "", bankName: "", walletProvider: "" });
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardNumberChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 16);
    const formatted = clean.replace(/(\d{4})(?=\d)/g, "$1 ");
    setFormValues((current) => ({ ...current, cardNumber: formatted }));
  };

  const handleExpiryChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    setFormValues((current) => ({ ...current, expiry: formatted }));
  };

  const handleCvvChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setFormValues((current) => ({ ...current, cvv: clean }));
  };

  if (!hotel || !offer) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>Payment details unavailable</h2><p>Complete hotel guest details before entering payment.</p><button type="button" onClick={() => navigate("/search/hotels")}>Back to hotel search</button></section></div></main>;
  }

  const handlePayNow = async () => {
    if (selectedMethod === "agent_wallet") {
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const markup = Number(flowState.fareSummary?.markup || 0);
      const wholesalePrice = payableAmount - markup;
      if (balance < wholesalePrice) {
        setPaymentError(`Insufficient wallet balance. You need ₹ ${wholesalePrice.toFixed(2)} (wholesale price) but only have ₹ ${balance.toFixed(2)}.`);
        return;
      }
    } else {
      if (!isPaymentInputValid(selectedMethod, formValues)) { setPaymentError("Enter valid payment details for the selected method."); return; }
    }
    setPaymentError("");
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => { window.setTimeout(resolve, 1200); });
      const response = await bookHotel({
        offerId: offer.offerId,
        guestName: flowState.guestName,
        guestEmail: flowState.guestEmail,
        guestPhone: flowState.guestPhone,
      });
      const bookingReference = response?.bookingReference || `PNB-${Date.now().toString().slice(-8)}`;

      if (isAgent && agentProfile) {
        const markup = Number(flowState.fareSummary?.markup || 0);
        const wholesalePrice = payableAmount - markup;
        const updatedBalance = Number(agentProfile.walletBalance) - Number(wholesalePrice);
        const updatedProfile = { ...agentProfile, walletBalance: updatedBalance };

        if (localStorage.getItem("b2b_user")) {
          localStorage.setItem("b2b_user", JSON.stringify(updatedProfile));
        }
        localStorage.setItem("user", JSON.stringify(updatedProfile));

      }
      const ticketPayload = buildTicketPayload(flowState, response, selectedMethod, nights);

      try {
        const existingStr = localStorage.getItem("mock_tickets");
        const existing = existingStr ? JSON.parse(existingStr) : [];
        existing.unshift(ticketPayload);
        localStorage.setItem("mock_tickets", JSON.stringify(existing));
      } catch (e) {
        console.error("Error saving mock hotel booking:", e);
      }

      sessionStorage.removeItem("booking_session_expiry");
      clearHotelBookingFlowState();
      navigate("/ticket/confirmation", { state: ticketPayload, replace: true });
    } catch (error) {
      setPaymentError(error.message || "Failed to confirm hotel booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldContent = selectedMethod === "agent_wallet"
    ? (() => {
      const markup = Number(flowState.fareSummary?.markup || 0);
      const wholesalePrice = payableAmount - markup;
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const hasSufficient = balance >= wholesalePrice;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "10px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--b2b-text-secondary)" }}>Customer Price (Collected):</span>
              <span style={{ fontWeight: 600 }}>₹ {payableAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
              <span>Agent Markup (Your Profit):</span>
              <span>+ ₹ {markup.toFixed(2)}</span>
            </div>
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
              ✔ Balance is sufficient. Click <strong>Confirm and pay</strong> to proceed (only ₹ {wholesalePrice.toFixed(2)} will be debited).
            </div>
          )}
        </div>
      );
    })()
    : selectedMethod === "upi"
      ? <label className="hotel-field"><span>UPI ID</span><input type="text" placeholder="name@bank" value={formValues.upiId} onChange={(event) => setFormValues((current) => ({ ...current, upiId: event.target.value }))} /></label>
      : selectedMethod === "card"
        ? <div className="hotel-form-grid"><label className="hotel-field"><span>Card number</span><input type="text" placeholder="XXXX XXXX XXXX XXXX" value={formValues.cardNumber} onChange={(event) => handleCardNumberChange(event.target.value)} /></label><label className="hotel-field"><span>Name on card</span><input type="text" placeholder="Card holder name" value={formValues.nameOnCard} onChange={(event) => setFormValues((current) => ({ ...current, nameOnCard: event.target.value }))} /></label><label className="hotel-field"><span>Expiry</span><input type="text" placeholder="MM/YY" value={formValues.expiry} onChange={(event) => handleExpiryChange(event.target.value)} /></label><label className="hotel-field"><span>CVV</span><input type="password" placeholder="CVV" value={formValues.cvv} onChange={(event) => handleCvvChange(event.target.value)} /></label></div>
        : selectedMethod === "netbanking"
          ? <label className="hotel-field"><span>Select bank</span><select value={formValues.bankName} onChange={(event) => setFormValues((current) => ({ ...current, bankName: event.target.value }))}><option value="">Choose bank</option><option value="hdfc">HDFC Bank</option><option value="icici">ICICI Bank</option><option value="sbi">State Bank of India</option><option value="axis">Axis Bank</option></select></label>
          : <label className="hotel-field"><span>Select wallet</span><CustomWalletSelect value={formValues.walletProvider} options={WALLET_OPTIONS} onChange={(val) => setFormValues((current) => ({ ...current, walletProvider: val }))} /></label>;

  return (
    <main className="hotel-checkout-page hotel-checkout-page--confirm">
      <BookingTimer />
      <div className="hotel-checkout-shell">
        <button type="button" className="hotel-back-link" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back to guest details</button>
        <div className="hotel-checkout-stepper" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="step-item is-completed" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "#137a3b" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#edfdf3", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #137a3b" }}>✓</span>
            <span>1. Choose stay</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item is-completed" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "#137a3b" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#edfdf3", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #137a3b" }}>✓</span>
            <span>2. Guest & Room Details</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item is-active" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 800, color: "var(--hotel-rose-deep)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255, 56, 92, 0.05)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--hotel-rose)" }}>3</span>
            <span>3. Secure Payment</span>
          </div>
        </div>
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
              <div className="hotel-method-row">{availableMethods.map((method) => <button key={method.id} type="button" className={`hotel-method-pill${selectedMethod === method.id ? " is-active" : ""}`} onClick={() => setSelectedMethod(method.id)}><method.icon size={20} active={selectedMethod === method.id} stroke={undefined} /><span>{method.label}</span></button>)}</div>
              <div className="hotel-payment-fields">{fieldContent}</div>
              {paymentError && <p className="hotel-helper hotel-helper--error">{paymentError}</p>}
              <div className="hotel-confirm-actions"><button type="button" className="hotel-primary-button" onClick={handlePayNow} disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={14} className="hotel-spin" />Confirming...</> : `Confirm and pay ${formatCurrency(payableAmount)}`}</button><p>By continuing, you agree to the hotel booking terms and payment authorization for this reservation.</p></div>
            </section>
          </div>
          <aside className="hotel-reserve-rail">
            <div className="hotel-reserve-card hotel-reserve-card--confirm">
              <div className="hotel-reserve-preview"><img src={visuals.gallery[0]} alt={hotel.name} /><div><span>{visuals.highlightLabel}</span><strong>{hotel.name}</strong><p><Star size={13} fill="currentColor" /> {Number(hotel.rating || 4.8).toFixed(1)} · {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}</p></div></div>
              <div className="hotel-confirm-summary"><div><span>Dates</span><strong>{new Date(offer.checkInDate).toLocaleDateString("en-IN")} - {new Date(offer.checkOutDate).toLocaleDateString("en-IN")}</strong></div><div><span>Guests</span><strong>{flowState.searchContext?.guests || "Primary guest"}</strong></div></div>
              <div className="hotel-fare-breakdown"><div><span>Room base charges</span><strong>{formatCurrency(fareSummary.baseFare)}</strong></div><div><span>Taxes and fees</span><strong>{formatCurrency(fareSummary.tax)}</strong></div><div><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Convenience fee<span title="This fee covers secure payment processing and 24/7 booking support." style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.06)", fontSize: "0.65rem", fontWeight: "bold" }}>i</span></span><strong>{formatCurrency(fareSummary.convenienceFee)}</strong></div>{Number(fareSummary.discount) > 0 && <div className="is-discount"><span>Savings</span><strong>-{formatCurrency(fareSummary.discount)}</strong></div>}<div className="hotel-fare-total"><span>Total to pay</span><strong>{formatCurrency(payableAmount)}</strong></div></div>
              <div className="hotel-reserve-assurance"><CheckCircle2 size={16} /><span>Once confirmed, the ticket confirmation page will use the live hotel booking response from the backend.</span></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

