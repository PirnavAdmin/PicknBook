/* eslint-disable */
import React from "react";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, FileText } from "lucide-react";

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const CURRENCY_FORMATTER_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CURRENCY_FORMATTER_DECIMAL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeCurrency(value) {
  return value.replace(/\u00a0/g, " ");
}

export function formatCurrency(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  const formatter = Number.isInteger(numericValue)
    ? CURRENCY_FORMATTER_WHOLE
    : CURRENCY_FORMATTER_DECIMAL;

  return normalizeCurrency(formatter.format(numericValue));
}

export function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}, ${hh}:${min}`;
}

export function formatCouponDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return DATE_ONLY_FORMATTER.format(date);
}

export function formatCouponDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return DATE_TIME_FORMATTER.format(date);
}

export function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value);
  if (/["\n\r,]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function toViewId(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const label = String(value);
  return label.startsWith("#") ? label : `#${label}`;
}

/**
 * Render Ticket/Inventory Cancellation Status Badge
 * Standards:
 * - Pending: 🟡 Yellow / Warning
 * - Cancelled: 🟢 Green / Success
 * - Rejected: 🔴 Red / Danger
 */
export function CancellationStatusBadge({ status }) {
  const normStatus = String(status || "Pending").trim();
  const lower = normStatus.toLowerCase();

  let badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "0.72rem",
    fontWeight: "700",
    lineHeight: "1.2",
    letterSpacing: "0.02em",
  };

  if (lower.includes("cancelled") || lower.includes("canceled") || lower.includes("success")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#dcfce7",
      color: "#15803d",
      border: "1px solid #bbf7d0",
    };
    return (
      <span style={badgeStyle} title="Cancellation successfully processed with provider">
        <CheckCircle size={11} /> Cancelled
      </span>
    );
  }

  if (lower.includes("reject")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
      border: "1px solid #fca5a5",
    };
    return (
      <span style={badgeStyle} title="Supplier rejected the cancellation">
        <XCircle size={11} /> Rejected
      </span>
    );
  }

  // Pending default
  badgeStyle = {
    ...badgeStyle,
    backgroundColor: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
  };
  return (
    <span style={badgeStyle} title="Cancellation requested; awaiting operator confirmation">
      <Clock size={11} /> Pending
    </span>
  );
}

/**
 * Render Financial Customer Refund Status Badge
 * Standards:
 * - Pending: 🟡 Amber / Orange
 * - Processing: 🔵 Blue / Info (Spinner)
 * - Refunded: 🟢 Green / Success
 * - Completed: ⚪ Gray / Secondary
 * - Failed: 🔴 Red / Danger
 */
export function RefundStatusBadge({ status, refundAmount = 0, cancellationStatus = "" }) {
  const normStatus = String(status || "").trim();
  const lower = normStatus.toLowerCase();
  const cancelLower = String(cancellationStatus || "").toLowerCase();

  let badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "0.72rem",
    fontWeight: "700",
    lineHeight: "1.2",
    letterSpacing: "0.02em",
  };

  if (lower.includes("pending") || cancelLower.includes("pending") || (!lower && !cancelLower)) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #ffedd5",
    };
    return (
      <span style={badgeStyle} title="Refund status is pending operator / admin processing">
        <Clock size={11} /> Pending
      </span>
    );
  }

  if (lower.includes("refunded") || lower.includes("refund_success")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#d1fae5",
      color: "#047857",
      border: "1px solid #a7f3d0",
    };
    return (
      <span style={badgeStyle} title="Money successfully credited to customer">
        <CheckCircle size={11} /> Refunded
      </span>
    );
  }

  if (lower.includes("process") || lower.includes("in_flight")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
    return (
      <span style={badgeStyle} title="Gateway or wallet refund is in-flight">
        <Loader2 size={11} className="spin-animation" style={{ animation: "spin 1s linear infinite" }} /> Processing
      </span>
    );
  }

  if (lower.includes("failed") || lower.includes("error")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      border: "1px solid #fca5a5",
    };
    return (
      <span style={badgeStyle} title="Payout failed (bank rejection / gateway timeout)">
        <AlertTriangle size={11} /> Failed
      </span>
    );
  }

  if (lower.includes("completed")) {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#f1f5f9",
      color: "#475569",
      border: "1px solid #cbd5e1",
    };
    return (
      <span style={badgeStyle} title="Settled with ₹0.00 refund (100% penalty)">
        <FileText size={11} /> Completed
      </span>
    );
  }

  // Pending default
  badgeStyle = {
    ...badgeStyle,
    backgroundColor: "#fff7ed",
    color: "#c2410c",
    border: "1px solid #ffedd5",
  };
  return (
    <span style={badgeStyle} title="Refund amount calculated & queued. Payout not started yet.">
      <Clock size={11} /> Pending
    </span>
  );
}

/**
 * Display Refund Amount with special subtext/tooltips per specification:
 * - If customerRefundAmountInr == 0 && customerRefundStatus == "Completed" -> "₹0.00 (Non-refundable / 100% Charges)"
 */
export function RefundAmountDisplay({ amount, adminAmount, refundStatus }) {
  const cusNum = Number(amount) || 0;
  const hasAdmin = adminAmount !== undefined && adminAmount !== null;
  const admNum = hasAdmin ? Number(adminAmount) || 0 : null;
  const isZeroCompleted = cusNum === 0 && String(refundStatus).toLowerCase().includes("completed");

  const formatShortINR = (num) => {
    const val = Number(num) || 0;
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {hasAdmin ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", width: "100%" }}>
          <small style={{ color: "#0369a1", fontSize: "0.72rem", fontWeight: "700", whiteSpace: "nowrap", display: "block", textAlign: "center" }}>
            Cust Ref: {formatShortINR(cusNum)}
          </small>
          <small style={{ color: "#059669", fontSize: "0.72rem", fontWeight: "700", whiteSpace: "nowrap", display: "block", textAlign: "center" }}>
            Admin Ref: {formatShortINR(admNum)}
          </small>
        </div>
      ) : (
        <>
          <strong style={{ fontSize: "0.82rem", color: isZeroCompleted ? "#475569" : "#0f766e", fontWeight: "700", textAlign: "center" }}>
            {formatShortINR(cusNum)}
          </strong>
          {isZeroCompleted && (
            <small
              style={{
                display: "block",
                fontSize: "0.64rem",
                color: "#64748b",
                fontWeight: "500",
                whiteSpace: "nowrap",
                marginTop: "1px",
                textAlign: "center",
              }}
            >
              (Non-refundable / 100% Charges)
            </small>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Standard Contextual Action Buttons per section 5 checklist:
 * - Pending + >0 -> "Process Refund"
 * - Processing -> "Refresh Status"
 * - Failed -> "Retry Payout"
 * - Completed / Refunded -> "View Details"
 */
export function RefundActionButton({ refundStatus, refundAmount, onClick, disabled = false }) {
  const lower = String(refundStatus || "").toLowerCase();
  const amount = Number(refundAmount) || 0;

  let btnText = "View";
  let btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "3px 10px",
    fontSize: "0.74rem",
    fontWeight: "600",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease-in-out",
  };

  if (lower.includes("failed")) {
    btnText = "Retry Payout";
    btnStyle = {
      ...btnStyle,
      backgroundColor: "#dc2626",
      color: "#ffffff",
      boxShadow: "0 2px 4px rgba(220,38,38,0.2)",
    };
    return (
      <button type="button" style={btnStyle} onClick={onClick} disabled={disabled}>
        <RefreshCw size={11} /> {btnText}
      </button>
    );
  }

  if (lower.includes("process")) {
    btnText = "Refresh Status";
    btnStyle = {
      ...btnStyle,
      backgroundColor: "#0284c7",
      color: "#ffffff",
      boxShadow: "0 2px 4px rgba(2,132,199,0.2)",
    };
    return (
      <button type="button" style={btnStyle} onClick={onClick} disabled={disabled}>
        <RefreshCw size={11} className="spin-animation" style={{ animation: "spin 1.5s linear infinite" }} /> {btnText}
      </button>
    );
  }

  if (amount > 0 && (lower.includes("pending") || !lower)) {
    btnText = "Process Refund";
    btnStyle = {
      ...btnStyle,
      backgroundColor: "#d97706",
      color: "#ffffff",
      boxShadow: "0 2px 4px rgba(217,119,6,0.2)",
    };
    return (
      <button type="button" style={btnStyle} onClick={onClick} disabled={disabled}>
        {btnText}
      </button>
    );
  }

  // Default view button
  btnStyle = {
    ...btnStyle,
    backgroundColor: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
  };
  return (
    <button type="button" style={btnStyle} onClick={onClick} disabled={disabled}>
      View
    </button>
  );
}

export function translateCityCode(code) {
  if (code === null || code === undefined) return "";
  const str = String(code).trim();
  if (!str) return "";
  const c = str.toUpperCase();

  if (c === "9" || c === "HYD" || c.includes("HYDERABAD")) return "Hyderabad";
  if (c === "11" || c === "BLR" || c.includes("BANGALORE") || c.includes("BENGALURU")) return "Bangalore";
  if (c === "30" || c === "VGA" || c.includes("VIJAYAWADA")) return "Vijayawada";
  if (c === "4" || c === "DEL" || c.includes("DELHI")) return "Delhi";
  if (c === "3" || c === "BOM" || c.includes("MUMBAI")) return "Mumbai";
  if (c === "14" || c === "MAA" || c.includes("CHENNAI")) return "Chennai";
  if (c === "6" || c === "PNQ" || c.includes("PUNE")) return "Pune";
  if (c === "8" || c === "CCU" || c.includes("KOLKATA")) return "Kolkata";
  if (c === "15" || c === "GOI" || c === "GOX" || c.includes("GOA")) return "Goa";
  if (c === "21" || c === "JAI" || c.includes("JAIPUR")) return "Jaipur";

  return str;
}

