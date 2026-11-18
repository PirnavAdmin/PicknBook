import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCashfreePayment } from "../../hooks/useCashfreePayment";
import { prepareFlightBookingPayload, buildBookingPayload as buildBusBookingPayload } from "../../utils/checkoutPayloadBuilders";
import { getWalletSummary } from "../../services/walletService";
import FlightStepperHeader from "./FlightStepperHeader";
import "../../STYLES/FlightBookingFlow.css";

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundCurrency(Number.isFinite(amount) ? amount : 0));
}

export default function BookingConfirmationModal({ isOpen, onClose, bookingType, flowState, payload, onSuccess }) {
  const navigate = useNavigate();
  const { initializePaymentSession, cfStatus, paymentError, isSubmitting: cfIsSubmitting, clearError } = useCashfreePayment();
  const [localError, setLocalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Wallet data is always read from the authenticated B2C customer's wallet.
  const [b2cWallet, setB2cWallet] = useState(null);
  const [useWallet, setUseWallet] = useState(false);

  // Pre-payment Block state
  const hasBlock = Boolean(flowState?.blockKey || flowState?.blockRoomResponse);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  useEffect(() => {
    if (isOpen && hasBlock) {
      setIsBlocked(true);
      setBlockTimeRemaining(600); // 10 minutes from modal open
    }
  }, [isOpen, hasBlock]);

  useEffect(() => {
    let timer;
    if (isBlocked && blockTimeRemaining > 0) {
      timer = setInterval(() => {
        setBlockTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (blockTimeRemaining === 0 && isBlocked) {
      setIsBlocked(false);
      setLocalError("Your reserved seat block has expired. Please try booking again.");
    }
    return () => clearInterval(timer);
  }, [isBlocked, blockTimeRemaining]);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      document.body.style.overflow = "hidden";
      setUseWallet(Number(flowState?.walletAppliedAmount || 0) > 0);
      const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken");

      if (token) {
        getWalletSummary()
          .then((data) => {
            if (isMounted) setB2cWallet(data);
          })
          .catch((err) => console.warn("Failed to fetch wallet summary", err));
      }
    } else {
      document.body.style.overflow = "";
      setB2cWallet(null);
    }

    return () => {
      isMounted = false;
      document.body.style.overflow = "";
    };
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
  totalPayable = roundCurrency(Math.max(0, Number(totalPayable) || 0));
  const taxesAndFees = bookingType === "Bus"
    ? Number(fareSummary?.gstAmount ?? fareSummary?.tax ?? 0)
    : (Number(fareSummary?.tax) || 0) + (Number(fareSummary?.fee) || 0);
  const isBusBooking = bookingType === "Bus";
  const offerDiscountAmount = isBusBooking
    ? roundCurrency(
      flowState?.offerDiscount ??
      flowState?.couponDiscount ??
      fareSummary?.couponAmount ??
      fareSummary?.discount ??
      0
    )
    : 0;
  const discountedBookingTotal = isBusBooking
    ? roundCurrency(flowState?.discountedBookingTotal ?? totalPayable)
    : totalPayable;
  const originalBookingTotal = isBusBooking
    ? roundCurrency(flowState?.originalBookingTotal ?? discountedBookingTotal + offerDiscountAmount)
    : totalPayable;
  const walletBalance = Number(
    b2cWallet?.availableBalance ??
    b2cWallet?.AvailableBalance ??
    b2cWallet?.walletBalance ??
    b2cWallet?.WalletBalance ??
    b2cWallet?.balance ??
    b2cWallet?.Balance ??
    flowState?.walletAvailableBalance ??
    0,
  ) || 0;
  const walletStatus =
    b2cWallet?.walletStatus ||
    b2cWallet?.WalletStatus ||
    b2cWallet?.status ||
    b2cWallet?.Status ||
    flowState?.walletStatus ||
    "Inactive";
  const requestedWalletAmount = roundCurrency(Math.max(
    0,
    Number(flowState?.walletAppliedAmount ?? flowState?.walletAmount ?? 0) || 0
  ));
  const walletAppliedAmount = isBusBooking
    ? requestedWalletAmount
    : (requestedWalletAmount > 0 || useWallet) && walletStatus === "Active"
      ? Math.min(walletBalance, totalPayable, requestedWalletAmount > 0 ? requestedWalletAmount : walletBalance)
      : 0;
  const gatewayPayableAmount = roundCurrency(Math.max(
    0,
    (isBusBooking ? discountedBookingTotal : totalPayable) - walletAppliedAmount
  ));
  const selectedPaymentMethod =
    walletAppliedAmount <= 0
      ? "Cashfree"
      : gatewayPayableAmount <= 0
        ? "Wallet"
        : "Hybrid";

  // --- B2C Wallet / Cashfree Logic ---
  const handleCashfreePay = async () => {
    if (isProcessing || cfIsSubmitting || cfStatus === "creating") return;
    clearError();
    setLocalError("");
    setIsProcessing(true);

    try {
    // Derive customer details dynamically from flowState
    const rawEmail = contact?.email || flowState?.guestEmail || (bookingType === "Flight" ? "" : "guest@gopickandbook.in");
    const rawPhone = contact?.mobile || flowState?.guestPhone || (bookingType === "Flight" ? "" : "9876543210");
    let rawName = contact?.name || flowState?.guestName || "";
    if (!rawName && passengers.length > 0) {
      rawName = `${passengers[0].firstName || passengers[0].FirstName || ""} ${passengers[0].lastName || passengers[0].LastName || ""}`.trim();
    }
    if (!rawName && bookingType !== "Flight") rawName = "Customer";

    if (bookingType === "Flight" && (!rawEmail || !rawPhone || !rawName)) throw new Error("Traveller contact details are required before payment.");
    const customerId = String(
      flowState?.customerId ||
      flowState?.userId ||
      localStorage.getItem("userId") ||
      sessionStorage.getItem("userId") ||
      ""
    ).trim();
    if (bookingType === "Flight" && !customerId) throw new Error("Authenticated customer details are required before payment.");
    const customerName = rawName;
    const customerEmail = String(rawEmail).trim();
    const customerPhone = String(rawPhone).replace(/\D/g, "").slice(-10);
    if (bookingType === "Flight" && customerPhone.length !== 10) throw new Error("A valid traveller mobile number is required.");

    let bookingPayloadJson = "";

    if (bookingType === "Flight") {
      bookingPayloadJson = JSON.stringify(await prepareFlightBookingPayload(flowState));
    } else if (bookingType === "Bus") {
      bookingPayloadJson = JSON.stringify(buildBusBookingPayload(flowState));
    } else if (bookingType === "Hotel") {
      // Inline Hotel Payload mapping
      const { guestName, guestTitle, guestGender, guestAge, guestPhone, guestEmail, blockRoomResponse, hotel, offer, checkInDate, checkOutDate } = flowState;
      const firstName = guestName?.split(" ")[0] || "";
      const lastName = guestName?.split(" ").slice(1).join(" ") || "";
      const rawPhone = String(guestPhone || "").trim();
      const rawEmail = String(guestEmail || "").trim();

      const rawCheckIn = offer?.checkInDate || flowState.searchContext?.checkInDate || checkInDate || "";
      const rawCheckOut = offer?.checkOutDate || flowState.searchContext?.checkOutDate || checkOutDate || "";
      const checkInStr = typeof rawCheckIn === "string" ? rawCheckIn.split("T")[0] : "";
      const checkOutStr = typeof rawCheckOut === "string" ? rawCheckOut.split("T")[0] : "";

      const blockedRoom = blockRoomResponse?.BlockRoomResult?.HotelRoomsDetails?.[0] || 
                          blockRoomResponse?.blockRoomResult?.hotelRoomsDetails?.[0] || 
                          blockRoomResponse?.HotelRoomsDetails?.[0] || {};
      const cancelPolicies = blockedRoom?.CancellationPolicies || blockedRoom?.cancellationPolicies || offer?.cancellationPoliciesData || [];
      const lastCancellationDate = blockedRoom?.LastCancellationDate || blockedRoom?.lastCancellationDate || "";

      bookingPayloadJson = JSON.stringify({
        CheckInDate: checkInStr,
        CheckOutDate: checkOutStr,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        TraceId: String(blockRoomResponse?.TraceId || blockRoomResponse?.traceId || hotel?.TraceId || hotel?.traceId || ""),
        ResultIndex: String(hotel?.ResultIndex || hotel?.resultIndex || ""),
        SrdvType: String(hotel?.SrdvType || hotel?.srdvType || "MixAPI"),
        SrdvIndex: String(hotel?.SrdvIndex || hotel?.srdvIndex || ""),
        HotelCode: String(hotel?.hotelId || hotel?.hotelCode || hotel?.HotelCode || ""),
        HotelName: hotel?.name || "",
        GuestNationality: "IN",
        NoOfRooms: 1,
        ClientReferenceNo: "0",
        IsVoucherBooking: true,
        GuestName: `${firstName} ${lastName}`.trim(),
        GuestTitle: guestTitle || "Mr",
        GuestGender: guestGender || "Male",
        GuestAge: Number(guestAge) || 30,
        GuestEmail: rawEmail,
        GuestPhone: rawPhone,
        CouponCode: flowState.couponCode || flowState.appliedCouponCode || "",
        Price: Number(totalPayable || 0),
        EndUserIp: "192.168.10.10",
        HotelRoomsDetails: [
          {
            RoomIndex: "1",
            RoomTypeCode: String(offer?.roomTypeCode || offer?.RoomTypeCode || "1"),
            RoomTypeName: offer?.roomCategory || offer?.roomTypeName || "Room",
            RatePlanCode: offer?.ratePlanCode || offer?.RatePlanCode || "",
            LastCancellationDate: lastCancellationDate,
            CancellationPolicies: cancelPolicies,
            HotelPassenger: [
              {
                Title: guestTitle || "Mr",
                FirstName: firstName,
                LastName: lastName || firstName,
                Phoneno: rawPhone,
                Email: rawEmail,
                PaxType: "1",
                Age: Number(guestAge) || 30,
                LeadPassenger: true
              }
            ]
          }
        ]
      });
    }

    if (walletAppliedAmount > 0 && walletStatus !== "Active") {
      setLocalError(`Wallet is currently ${walletStatus}.`);
      setIsProcessing(false);
      return;
    }

    if (walletAppliedAmount > walletBalance) {
      setLocalError("Wallet amount cannot exceed your available balance. Please review your wallet amount.");
      setIsProcessing(false);
      return;
    }

    if (isBusBooking && walletAppliedAmount > discountedBookingTotal) {
      setLocalError("Wallet amount cannot exceed the final payable amount.");
      setIsProcessing(false);
      return;
    }

    if (!isBusBooking && bookingType !== "Flight" && gatewayPayableAmount <= 0) {
      onSuccess({
        paymentMethod: "Wallet",
        walletAppliedAmount,
        gatewayPayableAmount: 0,
        price: totalPayable,
      });
      setIsProcessing(false);
      return;
    }

    const sessionData = await initializePaymentSession({
      orderAmount: gatewayPayableAmount,
      useWallet: walletAppliedAmount > 0,
      walletAmount: walletAppliedAmount > 0 ? walletAppliedAmount : null,
      paymentMethod: selectedPaymentMethod,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      bookingType,
      bookingPayloadJson: JSON.stringify({
        ...JSON.parse(bookingPayloadJson),
        walletAppliedAmount,
        walletAmount: walletAppliedAmount,
        gatewayPayableAmount,
        paymentMethod: selectedPaymentMethod,
        ...(isBusBooking ? {
          originalBookingTotal,
          offerDiscount: offerDiscountAmount,
          discountedBookingTotal,
        } : {}),
      }),
      couponCode: flowState.couponCode || flowState.appliedCouponCode || null,
      promotionId: isBusBooking
        ? flowState.selectedFeaturedOfferId || flowState.promotionId || null
        : null,
    });

    if (sessionData && sessionData.isWalletFullyPaid) {
      navigate(`/payment/cashfree/return?order_id=${sessionData.orderId}`);
      return;
    }

    if (sessionData && sessionData.cashfree) {
      sessionData.cashfree.checkout({
        paymentSessionId: sessionData.paymentSessionId,
        redirectTarget: "_modal"
      }).then((result) => {
        if (result.error) {
          console.log("Checkout closed or errored:", result.error);
          setLocalError(result.error.message || "Payment cancelled or failed.");
          setIsProcessing(false);
        }
        if (result.paymentDetails) {
          console.log("Payment attempt finished:", result.paymentDetails);
          const orderId = sessionStorage.getItem("pending_cashfree_order_id");
          if (orderId) {
            navigate(`/payment/cashfree/return?order_id=${orderId}`);
          } else {
            // Fallback if sessionStorage is cleared somehow
            navigate("/payment/cashfree/return");
          }
        }
      });
    } else {
      setIsProcessing(false);
    }
    } catch (error) {
      setLocalError(error.message || "Unable to start payment.");
      setIsProcessing(false);
    }
  };

  const handlePayNow = handleCashfreePay;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: bookingType === "Flight" ? "620px" : "500px",
          borderRadius: "14px",
          padding: "16px 22px 20px 22px",
          maxHeight: "92vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        }}
      >
        {/* Dedicated Top-Right Close Button Header: Places close button above the pipeline */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "4px" }}>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f172a",
              borderRadius: "6px",
              lineHeight: 1,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {bookingType === "Flight" && (
          <div style={{ marginBottom: "12px" }}>
            <FlightStepperHeader currentStage={4} compact={true} />
          </div>
        )}

        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.25rem", fontWeight: "800", color: "#0f172a" }}>
          Review Booking ({bookingType})
        </h2>

        {isBlocked && blockTimeRemaining > 0 && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "8px 12px",
              borderRadius: "8px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #ffeeba",
              fontSize: "0.85rem",
            }}
          >
            <strong>{bookingType === "Hotel" ? "Room Blocked!" : "Seats Blocked!"}</strong>
            <span>Time remaining: {Math.floor(blockTimeRemaining / 60)}:{String(blockTimeRemaining % 60).padStart(2, '0')}</span>
          </div>
        )}

        {/* Passenger Summary */}
        <div style={{ marginBottom: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", margin: "0 0 6px 0", color: "#0f172a" }}>Passenger Details</h3>
          {passengers.length > 0 ? (
            passengers.map((p, idx) => (
              <div key={idx} style={{ marginBottom: idx < passengers.length - 1 ? "4px" : "0" }}>
                <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>{p.firstName || p.FirstName} {p.lastName || p.LastName}</strong>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Age: {bookingType === "Flight" ? (p.isChild ? "Child" : p.isInfant ? "Infant" : "Adult") : p.age || p.Age || "Adult"}
                  {p.gender || p.Gender ? ` | ${p.gender || p.Gender}` : ""}
                </div>
              </div>
            ))
          ) : (
            <div>
              <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>{flowState.guestName || "Guest"}</strong>
            </div>
          )}

          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#475569" }}>
            Contact: {contact?.mobile || flowState.guestPhone || "--"} | {contact?.email || flowState.guestEmail || "--"}
          </div>
        </div>

        {/* Fare Summary */}
        <div style={{ marginBottom: "10px", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", margin: "0 0 8px 0", color: "#0f172a" }}>Fare Summary</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.88rem", color: "#334155" }}>
            <span>Base Fare</span>
            <span style={{ fontWeight: "600" }}>₹{formatCurrency(fareSummary?.baseFare || 0)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.88rem", color: "#334155" }}>
            <span>{bookingType === "Bus" ? "Operator GST" : "Taxes & Fees"}</span>
            <span style={{ fontWeight: "600" }}>₹{formatCurrency(taxesAndFees)}</span>
          </div>
          {(flowState?.couponDiscount > 0 || fareSummary?.discount > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.88rem", color: "#16a34a" }}>
              <span>Discount</span>
              <span style={{ fontWeight: "600" }}>- ₹{formatCurrency(flowState?.couponDiscount || fareSummary?.discount || 0)}</span>
            </div>
          )}
          <hr style={{ margin: "8px 0", borderColor: "#f1f5f9" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "1.15rem", color: "#0f172a" }}>
            <span>Total Payable</span>
            <span>₹{formatCurrency(totalPayable)}</span>
          </div>
        </div>

        {/* Wallet Balance Section: Single-Line Alignment */}
        {walletBalance > 0 && (walletStatus === "Active" || !b2cWallet) && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 14px",
              background: "#fff5f5",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.9rem",
                color: "#0f172a",
                whiteSpace: "nowrap",
              }}
            >
              <input
                type="checkbox"
                id="modal-use-wallet-cb"
                checked={walletAppliedAmount > 0 || useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "#d32f2f",
                  flexShrink: 0,
                  margin: 0,
                }}
              />
              <label
                htmlFor="modal-use-wallet-cb"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  margin: 0,
                  userSelect: "none",
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ fontWeight: "700", color: "#0f172a" }}>Use Wallet Balance</span>
                <span style={{ color: "#9ca3af", fontWeight: "400" }}>|</span>
                <span style={{ fontWeight: "600", color: "#374151" }}>
                  Available: ₹{formatCurrency(walletBalance)}
                </span>
              </label>
            </div>
            {walletAppliedAmount > 0 && (
              <div
                style={{
                  display: "grid",
                  gap: "3px",
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: "1px dashed #fecaca",
                  fontSize: "0.82rem",
                  color: "#475569",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Wallet applied</span>
                  <span style={{ color: "#d32f2f", fontWeight: "700" }}>- ₹{formatCurrency(walletAppliedAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", color: "#0f172a" }}>
                  <span>Pay via gateway</span>
                  <span>₹{formatCurrency(gatewayPayableAmount)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {(localError || paymentError) && (
          <div style={{ padding: "8px 12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", marginBottom: "10px", fontSize: "0.85rem" }}>
            {localError || paymentError}
          </div>
        )}

        <button
          onClick={handlePayNow}
          disabled={isProcessing || cfIsSubmitting || (!isBusBooking && useWallet && (walletStatus !== "Active" || walletBalance <= 0))}
          style={{
            width: "100%",
            padding: "11px 16px",
            backgroundColor: "var(--pnb-red, #d32f2f)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1.05rem",
            fontWeight: "700",
            cursor: isProcessing || cfIsSubmitting ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
            transition: "background-color 0.15s ease",
          }}
        >
          {isProcessing || cfIsSubmitting ? <Loader2 className="spinner" size={18} /> : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
