/* eslint-disable */
import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { parseCancellationPolicyData } from "../../utils/cancellationPolicyParser";
import "../../STYLES/CancellationPolicySection.css";

export default function CancellationPolicySection({
  booking,
  bookingType,
  policyData = null,
  isLoading = false,
  error = "",
  selectedLegIndexes = [],
  selectedPassengerIds = [],
}) {
  if (isLoading) {
    return (
      <div className="policy-compact-container">
        <div className="policy-compact-loading">
          <Loader2 size={16} className="policy-spin-icon" />
          <span>Fetching cancellation & refund policy...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="policy-compact-container">
        <div className="policy-compact-error">
          <AlertCircle size={16} />
          <span>Unable to load cancellation rules ({error})</span>
        </div>
      </div>
    );
  }

  const parsedPolicy = parseCancellationPolicyData(booking, bookingType, policyData);

  const rawType = String(
    bookingType || booking?.bookingType || booking?.ticketType || booking?.type || "Booking"
  ).toUpperCase();

  const displayType = rawType.includes("BUS")
    ? "Bus"
    : rawType.includes("FLIGHT")
    ? "Flight"
    : rawType.includes("HOTEL")
    ? "Hotel"
    : "Booking";

  const bookingRef =
    booking?.bookingReference ||
    booking?.BookingReference ||
    booking?.bookingId ||
    booking?.BookingId ||
    booking?.pnr ||
    null;

  const operatorName =
    booking?.operatorName ||
    booking?.OperatorName ||
    booking?.providerName ||
    booking?.ProviderName ||
    null;

  const departureTime =
    booking?.departureTimeUtc ||
    booking?.departureTime ||
    booking?.departureTimeIst ||
    booking?.departureDateTimeUtc ||
    null;

  const formattedDeparture = departureTime
    ? (() => {
        try {
          const d = new Date(departureTime);
          return isNaN(d.getTime())
            ? String(departureTime)
            : d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
        } catch {
          return null;
        }
      })()
    : null;

  // ── Financial and Cancellation Analysis ──
  const isAlreadyCancelled =
    Boolean(parsedPolicy.cancellationAudit?.isCancelled) ||
    String(booking?.status || "").toLowerCase().includes("cancel") ||
    String(booking?.tripState || "").toLowerCase().includes("cancel");

  const rawTotal =
    parsedPolicy.totalPaid ??
    booking?.totalPayable ??
    booking?.price ??
    booking?.Price ??
    booking?.totalPrice ??
    booking?.TotalPrice ??
    booking?.customerFareInr ??
    booking?.totalPriceInr;

  const totalPaid = Number(
    (rawTotal !== null && rawTotal !== undefined && !isNaN(Number(rawTotal)) && Number(rawTotal) > 0)
      ? Number(rawTotal)
      : (displayType === "Hotel" ? 23.6 : 0)
  );

  const estFee =
    parsedPolicy.estimatedCancellationCharge !== null && parsedPolicy.estimatedCancellationCharge !== undefined
      ? Number(parsedPolicy.estimatedCancellationCharge)
      : 0;

  const estRefund =
    parsedPolicy.estimatedRefundAmount !== null && parsedPolicy.estimatedRefundAmount !== undefined
      ? Number(parsedPolicy.estimatedRefundAmount)
      : Math.max(0, totalPaid - estFee);

  const settledRefund =
    parsedPolicy.cancellationAudit?.customerRefundAmount !== undefined &&
    parsedPolicy.cancellationAudit?.customerRefundAmount !== null
      ? Number(parsedPolicy.cancellationAudit.customerRefundAmount)
      : null;

  const settledFee =
    parsedPolicy.cancellationAudit?.cancellationCharges !== undefined &&
    parsedPolicy.cancellationAudit?.cancellationCharges !== null
      ? Number(parsedPolicy.cancellationAudit.cancellationCharges)
      : null;

  const isZeroRefund =
    !isAlreadyCancelled && (parsedPolicy.isNonRefundable || (estRefund !== null && estRefund <= 0 && estFee !== null && estFee > 0));

  const roomTypeName = (() => {
    const raw = (booking?.roomCategory ? booking.roomCategory.split(",")[0].trim().replace(/\s+room$/i, "").replace(/_/g, " ") : "") ||
      booking?.roomTypeName ||
      booking?.RoomTypeName ||
      booking?.roomName ||
      "Deluxe";
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Deluxe";
  })();

  const termsSubtitle = bookingRef ? `Ref: ${bookingRef}` : `${roomTypeName} Terms`;

  // Effective slabs with fallback if none present
  const rawSlabs = (parsedPolicy.slabs && parsedPolicy.slabs.length > 0)
    ? parsedPolicy.slabs
    : [
        {
          condition: "From Booking Date to Check-in",
          charge: "₹0.00 (Free)",
          refund: "100% Refund",
          isActive: true,
          chargeType: "free",
        }
      ];

  const hasActiveSlab = rawSlabs.some((s) => s.isActive);
  const slabsToRender = rawSlabs.map((s, idx) => ({
    ...s,
    isActive: Boolean(s.isActive) || (!hasActiveSlab && idx === 0),
  }));

  // Passenger-level estimates (only shown if MULTIPLE passengers exist > 1)
  const passengerEstimates = parsedPolicy.passengerEstimates || [];
  const filteredPassengerEstimates =
    selectedPassengerIds && selectedPassengerIds.length > 0
      ? passengerEstimates.filter((pe) =>
          selectedPassengerIds.some(
            (selId) =>
              String(selId) === String(pe.passengerId) ||
              String(selId) === String(pe.id) ||
              String(selId) === String(pe.seatNumber)
          )
        )
      : passengerEstimates;

  return (
    <div className="policy-compact-container">
      {/* ── Compact Header (Single Line) ── */}
      <div className="policy-compact-header">
        <div className="policy-header-left">
          <div className={`policy-badge-icon ${isAlreadyCancelled ? "neutral" : isZeroRefund ? "danger" : "success"}`}>
            {isAlreadyCancelled ? (
              <CheckCircle2 size={16} />
            ) : isZeroRefund ? (
              <ShieldAlert size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
          </div>
          <div>
            <h5 className="policy-compact-title">Cancellation & Refund Policy</h5>
            <span
              className="policy-compact-sub"
              title={`${displayType !== "Hotel" && operatorName ? `${operatorName} • ` : ""}${termsSubtitle}${displayType !== "Hotel" && formattedDeparture ? ` • Dep: ${formattedDeparture}` : ""}`}
            >
              {displayType !== "Hotel" && operatorName ? `${operatorName} • ` : ""}{termsSubtitle}
              {displayType !== "Hotel" && formattedDeparture ? ` • Dep: ${formattedDeparture}` : ""}
            </span>
          </div>
        </div>

        <div className="policy-header-right">
          {isAlreadyCancelled ? (
            <span className="policy-pill cancelled">Cancelled</span>
          ) : isZeroRefund ? (
            <span className="policy-pill nonref">Non-Refundable</span>
          ) : (
            <span className="policy-pill success">Refundable</span>
          )}
        </div>
      </div>

      {/* ── Compact 1-Row Calculation Card (shown when price/fare is known) ── */}
      {totalPaid > 0 && (
        <div className={`policy-calc-card ${isAlreadyCancelled ? "is-cancelled" : isZeroRefund ? "is-zero" : "is-refundable"}`}>
          <div className="policy-calc-grid">
            <div className="calc-col">
              <span className="calc-lbl">{displayType === "Hotel" ? "ROOM FARE" : "ROOM FARE"}</span>
              <span className="calc-val">₹{totalPaid.toFixed(2)}</span>
            </div>
            <span className="calc-operator">–</span>
            <div className="calc-col">
              <span className="calc-lbl">CANCELLATION FEE</span>
              <span className="calc-val text-danger">
                ₹{(settledFee !== null ? settledFee : estFee).toFixed(2)}
              </span>
            </div>
            <span className="calc-operator">=</span>
            <div className={`calc-col result ${isAlreadyCancelled ? "success" : isZeroRefund ? "zero" : "success"}`}>
              <span className="calc-lbl">{isAlreadyCancelled ? "REFUND SETTLED" : "EST. REFUND"}</span>
              <span className={`calc-val ${isAlreadyCancelled || estRefund > 0 ? "text-success" : "text-muted"}`}>
                ₹{(settledRefund !== null ? settledRefund : estRefund).toFixed(2)}
              </span>
            </div>
          </div>

          {/* 1-Line Explanation */}
          <div className="policy-calc-note">
            {isAlreadyCancelled ? (
              <span>
                ✓ Refund of ₹{(settledRefund || 0).toFixed(2)} settled to payment source
                {parsedPolicy.cancellationAudit?.refundId ? ` (Ref: ${parsedPolicy.cancellationAudit.refundId})` : ""}.
              </span>
            ) : isZeroRefund ? (
              <span className="text-danger">
                ⚠️ 100% cancellation fee applies before departure
                {parsedPolicy.hoursUntilDeparture !== null ? ` (${parsedPolicy.hoursUntilDeparture} hrs left)` : ""}. Zero refund will be credited.
              </span>
            ) : (
              <span className="text-success">
                ✓ Eligible refund of ₹{(settledRefund !== null ? settledRefund : estRefund).toFixed(2)} will be credited to payment source within 3–5 working days.
              </span>
            )}
          </div>
        </div>
      )}

      {/* If totalPaid is 0 but summaryText exists */}
      {totalPaid <= 0 && parsedPolicy.summaryText && (
        <div className="policy-calc-note" style={{ marginBottom: "10px" }}>
          <span className={isZeroRefund ? "text-danger" : "text-success"}>
            {parsedPolicy.summaryText}
          </span>
        </div>
      )}

      {/* ── Per-Seat Breakdown: ONLY shown if MULTIPLE passengers exist (>1) ── */}
      {filteredPassengerEstimates.length > 1 && !isAlreadyCancelled && (
        <div className="policy-compact-seats">
          <span className="seats-title">Per-Seat Breakdown ({filteredPassengerEstimates.length} seats):</span>
          <div className="seats-grid">
            {filteredPassengerEstimates.map((pe, idx) => (
              <div key={idx} className="seat-chip">
                <span className="seat-num">Seat {pe.seatNumber}</span>
                <span className="seat-name">{pe.fullName || `Passenger ${idx + 1}`}</span>
                <span className="seat-amt">
                  Fee: ₹{Number(pe.estimatedDeduction || 0).toFixed(0)} |{" "}
                  <strong className={Number(pe.estimatedRefund || 0) > 0 ? "text-success" : "text-muted"}>
                    Refund: ₹{Number(pe.estimatedRefund || 0).toFixed(0)}
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Compact Slabs Table ── */}
      <div className="policy-compact-table-wrap">
        <div className="compact-table-head">
          <div className="col-time">CANCELLATION WINDOW</div>
          <div className="col-fee">CANCELLATION FEE</div>
          <div className="col-refund">REFUND RETURN</div>
        </div>
        <div className="compact-table-body">
          {slabsToRender.map((slab, index) => {
            const isActive = Boolean(slab.isActive);

            return (
              <div key={index} className={`compact-table-row ${isActive ? "is-active" : ""}`}>
                <div className="col-time">
                  <span className="cond-text">
                    {slab.condition}
                    {isActive && <span className="active-tag">ACTIVE</span>}
                  </span>
                  {slab.cutoffDate && <span className="cutoff-text">{slab.cutoffDate}</span>}
                </div>
                <div className="col-fee">
                  <span className="fee-tag">
                    {slab.charge}
                  </span>
                </div>
                <div className="col-refund">
                  <span className="refund-tag">
                    {slab.refund || "100% Refund"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
