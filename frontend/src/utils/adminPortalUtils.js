/* eslint-disable */
import React from "react";
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

// ── React UI Components ────────────────────────────────────────────────────────

const CANCELLATION_STATUS_COLORS = {
  Pending:    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Approved:   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  Rejected:   { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Processing: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Refunded:   { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  Cancelled:  { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

export function CancellationStatusBadge({ status }) {
  const s = CANCELLATION_STATUS_COLORS[status] || CANCELLATION_STATUS_COLORS["Cancelled"];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {status || "—"}
    </span>
  );
}

const REFUND_STATUS_COLORS = {
  Pending:    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Processed:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  Failed:     { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Initiated:  { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  NA:         { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

export function RefundStatusBadge({ status }) {
  const s = REFUND_STATUS_COLORS[status] || REFUND_STATUS_COLORS["NA"];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {status || "NA"}
    </span>
  );
}

export function RefundAmountDisplay({ amount, currency = "INR" }) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
  return (
    <span style={{ fontWeight: 600, color: num < 0 ? "#b91c1c" : "#15803d" }}>
      {formatted}
    </span>
  );
}

export function RefundActionButton({ label = "Process Refund", onClick, disabled = false, variant = "primary" }) {
  const styles = {
    primary:  { background: "#A51C49", color: "#fff", border: "none" },
    outline:  { background: "transparent", color: "#A51C49", border: "1px solid #A51C49" },
    danger:   { background: "#b91c1c", color: "#fff", border: "none" },
    success:  { background: "#15803d", color: "#fff", border: "none" },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        padding: "5px 14px",
        borderRadius: "6px",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {label}
    </button>
  );
}
