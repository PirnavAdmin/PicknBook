import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCashfreePayment } from "../../hooks/useCashfreePayment";
import { buildFlightBookingPayload, buildBookingPayload as buildBusBookingPayload } from "../../utils/checkoutPayloadBuilders";
import "../../STYLES/FlightBookingFlow.css"; // Reuse existing styles

export default function BookingConfirmationModal({ isOpen, onClose, bookingType, flowState, payload, onSuccess }) {
  const navigate = useNavigate();
  const { initializePaymentSession, cfStatus, paymentError, isSubmitting: cfIsSubmitting, clearError } = useCashfreePayment();
  const [localError, setLocalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Agent Wallet Info
  const [isAgent, setIsAgent] = useState(false);
  const [agentProfile, setAgentProfile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const b2bUser = localStorage.getItem("b2b_user");
      if (b2bUser) {
        setIsAgent(true);
        setAgentProfile(JSON.parse(b2bUser));
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Common Variables ---
  const passengers = flowState?.passengers || [];
  const contact = flowState?.contact || {};
  const fareSummary = flowState?.fareSummary || {};
  let totalPayable = flowState?.payableAmount || fareSummary?.totalFare || 0;
  if (bookingType === "Hotel") {
    totalPayable = flowState?.payableAmount || flowState?.finalPayableAmount || 0;
  }
  
  // --- Agent Wallet Logic ---
  const handleAgentPay = async () => {
    if (isProcessing) return;
    setLocalError("");
    setIsProcessing(true);

    const markup = Number(fareSummary?.markup || 0);
    const tierDiscount = Number(fareSummary?.tierDiscount || 0);
    const volumeDiscount = Number(fareSummary?.volumeDiscount || 0);
    const wholesalePrice = totalPayable - markup - tierDiscount - volumeDiscount;
    const balance = Number(agentProfile?.walletBalance ?? 0);

    if (balance < wholesalePrice) {
      setLocalError(`Insufficient wallet balance. You need ₹ ${wholesalePrice.toFixed(2)} (wholesale price) but only have ₹ ${balance.toFixed(2)}.`);
      setIsProcessing(false);
      return;
    }

    try {
      await new Promise(res => setTimeout(res, 1200));
      
      // Update Agent Balance in localStorage
      const updatedBalance = balance - wholesalePrice;
      const updatedProfile = { ...agentProfile, walletBalance: updatedBalance };
      localStorage.setItem("b2b_user", JSON.stringify(updatedProfile));
      localStorage.setItem("user", JSON.stringify(updatedProfile));

      onSuccess({ paymentMethod: "Agent Wallet", wholesalePrice });
    } catch (err) {
      setLocalError(err.message || "Failed to process agent payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Cashfree B2C Logic ---
  const handleCashfreePay = async () => {
    if (cfIsSubmitting || cfStatus === "creating") return;
    clearError();
    setLocalError("");
    setIsProcessing(true);

    // Derive customer details dynamically from flowState
    const rawEmail = contact?.email || flowState?.guestEmail || "guest@gopickandbook.in";
    const rawPhone = contact?.mobile || flowState?.guestPhone || "9876543210";
    let rawName = contact?.name || flowState?.guestName || "";
    if (!rawName && passengers.length > 0) {
      rawName = `${passengers[0].firstName || passengers[0].FirstName || ""} ${passengers[0].lastName || passengers[0].LastName || ""}`.trim();
    }
    if (!rawName) rawName = "Customer";

    const customerId = `CUST_${Date.now()}`;
    const customerName = rawName;
    const customerEmail = String(rawEmail).trim();
    const customerPhone = String(rawPhone).replace(/\D/g, "").slice(-10) || "9876543210";

    let bookingPayloadJson = "";

    if (bookingType === "Flight") {
      bookingPayloadJson = JSON.stringify(buildFlightBookingPayload(flowState));
    } else if (bookingType === "Bus") {
      bookingPayloadJson = JSON.stringify(buildBusBookingPayload(flowState));
    } else if (bookingType === "Hotel") {
      // Inline Hotel Payload mapping
      const { guestName, guestTitle, guestPhone, guestEmail, blockRoomResponse, hotel, offer, checkInDate, checkOutDate } = flowState;
      const firstName = guestName?.split(' ')[0] || "";
      const lastName = guestName?.split(' ').slice(1).join(' ') || "";
      const cleanPhone = String(guestPhone || "9876543210").replace(/\D/g, "").slice(-10);
      const cleanEmail = String(guestEmail || "guest@gopickandbook.in").trim();
      
      const rawCheckIn = offer?.checkInDate || flowState.searchContext?.checkInDate || checkInDate || "";
      const rawCheckOut = offer?.checkOutDate || flowState.searchContext?.checkOutDate || checkOutDate || "";
      const checkInStr = typeof rawCheckIn === "string" ? rawCheckIn.split("T")[0] : "";
      const checkOutStr = typeof rawCheckOut === "string" ? rawCheckOut.split("T")[0] : "";

      bookingPayloadJson = JSON.stringify({
        CheckInDate: checkInStr,
        CheckOutDate: checkOutStr,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        TraceId: String(blockRoomResponse?.TraceId || blockRoomResponse?.traceId || hotel?.TraceId || ""),
        ResultIndex: String(hotel?.ResultIndex || ""),
        SrdvType: String(hotel?.SrdvType || "MixAPI"),
        SrdvIndex: String(hotel?.SrdvIndex || ""),
        HotelCode: String(hotel?.hotelId || hotel?.hotelCode || ""),
        HotelName: hotel?.name || "",
        GuestNationality: "IN",
        NoOfRooms: 1, // simplified for fallback
        ClientReferenceNo: 0,
        IsVoucherBooking: true,
        GuestName: `${firstName} ${lastName}`,
        GuestEmail: cleanEmail,
        GuestPhone: cleanPhone,
        Price: Number(totalPayable || 0),
        EndUserIp: "192.168.10.10",
      });
    }

    const sessionData = await initializePaymentSession({
      orderAmount: totalPayable,
      customerId,
      customerName,
      customerEmail: contact?.email || "guest@gopickandbook.in",
      customerPhone: contact?.mobile || "9876543210",
      bookingType,
      bookingPayloadJson,
      couponCode: flowState.couponCode || null,
    });

    if (sessionData && sessionData.cashfree) {
      sessionData.cashfree.checkout({
        paymentSessionId: sessionData.paymentSessionId,
        redirectTarget: "_self"
      });
    } else {
      setIsProcessing(false);
    }
  };

  const handlePayNow = isAgent ? handleAgentPay : handleCashfreePay;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex",
      alignItems: "center", justifyContent: "center"
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: "#fff", width: "100%", maxWidth: "500px",
        borderRadius: "12px", padding: "24px", maxHeight: "90vh", overflowY: "auto", position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer" }}>
          <X size={24} />
        </button>

        <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "1.5rem" }}>Review Booking ({bookingType})</h2>
        
        {/* Passenger Summary */}
        <div style={{ marginBottom: "20px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "1.1rem", margin: "0 0 12px 0" }}>Passenger Details</h3>
          {passengers.length > 0 ? (
            passengers.map((p, idx) => (
              <div key={idx} style={{ marginBottom: "8px" }}>
                <strong>{p.firstName || p.FirstName} {p.lastName || p.LastName}</strong>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  {p.gender || p.Gender} | Age: {bookingType === "Flight" ? (p.isChild ? "Child" : p.isInfant ? "Infant" : "Adult") : p.age || p.Age}
                </div>
              </div>
            ))
          ) : (
            <div style={{ marginBottom: "8px" }}>
              <strong>{flowState.guestName || "Guest"}</strong>
            </div>
          )}
          
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #ddd", fontSize: "0.9rem" }}>
            Contact: {contact?.mobile || flowState.guestPhone} | {contact?.email || flowState.guestEmail}
          </div>
        </div>

        {/* Fare Summary */}
        <div style={{ marginBottom: "24px", padding: "16px", border: "1px solid #eee", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "1.1rem", margin: "0 0 12px 0" }}>Fare Summary</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Base Fare</span>
            <span>₹ {fareSummary?.baseFare || 0}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Taxes & Fees</span>
            <span>₹ {(fareSummary?.tax || 0) + (fareSummary?.fee || 0)}</span>
          </div>
          {(flowState?.couponDiscount > 0 || fareSummary?.discount > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "green" }}>
              <span>Discount</span>
              <span>- ₹ {flowState?.couponDiscount || fareSummary?.discount || 0}</span>
            </div>
          )}
          <hr style={{ margin: "12px 0", borderColor: "#eee" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1.2rem" }}>
            <span>Total Payable</span>
            <span>₹ {totalPayable}</span>
          </div>
        </div>

        {(localError || paymentError) && (
          <div style={{ padding: "12px", background: "#fee", color: "#c00", borderRadius: "6px", marginBottom: "20px" }}>
            {localError || paymentError}
          </div>
        )}

        <button 
          onClick={handlePayNow} 
          disabled={isProcessing || cfIsSubmitting}
          style={{
            width: "100%", padding: "14px", backgroundColor: "var(--pnb-red, #e60000)", color: "white",
            border: "none", borderRadius: "8px", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer",
            display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"
          }}
        >
          {isProcessing || cfIsSubmitting ? <Loader2 className="spinner" size={20} /> : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
