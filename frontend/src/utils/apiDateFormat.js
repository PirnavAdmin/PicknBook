/* eslint-disable */
export function toDdMmYyyy(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const ddMmYyyyMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyyMatch) {
    return text;
  }

  const yyyyMmDdMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDdMatch) {
    return `${yyyyMmDdMatch[3]}-${yyyyMmDdMatch[2]}-${yyyyMmDdMatch[1]}`;
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) {
    return text;
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
}

export function toYyyyMmDd(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const yyyyMmDdMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDdMatch) {
    return text;
  }

  const ddMmYyyyMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyyMatch) {
    return `${ddMmYyyyMatch[3]}-${ddMmYyyyMatch[2]}-${ddMmYyyyMatch[1]}`;
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) {
    return text;
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${year}-${month}-${day}`;
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
// Converts YYYY-MM-DD → DD-MM-YYYY for display
export function toDisplayDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

// Converts DD-MM-YYYY → YYYY-MM-DD for the input value
export function toInputDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

// Generates YYYY-MM-DD date string with day offset in local time
export function getDefaultDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}