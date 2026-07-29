/* eslint-disable */
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
