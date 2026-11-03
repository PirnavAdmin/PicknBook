/**
 * Utility functions for flight date, time, and schedule formatting.
 * Handles local airport time preservation, prevents unintended timezone date shifts,
 * correctly formats 12-hour AM/PM times (e.g. 09:30 AM, 12:15 AM), and manages next-day arrival.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a time string or Date into a standardized 12-hour "hh:mm AM/PM" format.
 * Preserves local airport time without applying browser/UTC timezone shifts.
 * 
 * @param {string|Date} value - Raw time string or Date object
 * @returns {string} Formatted time string (e.g., "09:30 AM", "12:15 AM")
 */
export function formatFlightTime(value) {
  if (!value) return "--:--";

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "--:--";
    let hours = value.getHours();
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
  }

  const str = String(value).trim();
  if (!str) return "--:--";

  // Check if already in 12-hour AM/PM format (e.g. "09:30 AM", "9:30am", "12:00 PM")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    const hours = String(parseInt(ampmMatch[1], 10)).padStart(2, "0");
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    return `${hours}:${minutes} ${period}`;
  }

  // Extract hours and minutes from ISO/date-time string (e.g. "2026-11-05T09:30:00", "2026-11-05 09:30:00", "09:30:00", "09:30")
  const timeMatch = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    if (hours >= 0 && hours <= 23) {
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
    }
  }

  return str;
}

/**
 * Extract calendar components (year, month 1-12, day 1-31) from various date representations.
 * Avoids new Date(utcString) to prevent timezone shifts across days.
 */
export function parseFlightDateComponents(input) {
  if (!input) return null;
  const str = String(input).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
    };
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return {
      year: parseInt(dmyMatch[3], 10),
      month: parseInt(dmyMatch[2], 10),
      day: parseInt(dmyMatch[1], 10),
    };
  }

  return null;
}

/**
 * Formats a flight date string into "D MMM YY" (e.g. "5 Nov 26").
 * Uses fallback date if input is only a time string.
 */
export function formatFlightDate(dateInput, fallbackDateInput = null) {
  let parts = parseFlightDateComponents(dateInput);
  if (!parts && fallbackDateInput) {
    parts = parseFlightDateComponents(fallbackDateInput);
  }
  if (!parts) return "";

  const monthName = MONTHS_SHORT[parts.month - 1] || "";
  const shortYear = String(parts.year).slice(-2);
  return `${parts.day} ${monthName} ${shortYear}`;
}

/**
 * Formats a flight date string into "ddd, D MMM YYYY" (e.g. "Thu, 5 Nov 2026").
 */
export function formatFlightDateLong(dateInput, fallbackDateInput = null) {
  let parts = parseFlightDateComponents(dateInput);
  if (!parts && fallbackDateInput) {
    parts = parseFlightDateComponents(fallbackDateInput);
  }
  if (!parts) return "";

  const d = new Date(parts.year, parts.month - 1, parts.day);
  const dayName = DAYS_SHORT[d.getDay()] || "";
  const monthName = MONTHS_SHORT[parts.month - 1] || "";
  return `${dayName}, ${parts.day} ${monthName} ${parts.year}`;
}

/**
 * Checks whether arrival is on the next calendar day compared to departure.
 */
export function isArrivalNextDay(depStr, arrStr) {
  const depParts = parseFlightDateComponents(depStr);
  const arrParts = parseFlightDateComponents(arrStr);
  if (depParts && arrParts) {
    const depDate = new Date(depParts.year, depParts.month - 1, depParts.day);
    const arrDate = new Date(arrParts.year, arrParts.month - 1, arrParts.day);
    const diffDays = Math.round((arrDate - depDate) / (1000 * 60 * 60 * 24));
    return diffDays > 0;
  }
  return false;
}

/**
 * Determines whether a given flight time is daytime (6:00 AM - 5:59 PM).
 * Correctly accounts for AM/PM notations.
 */
export function isDayTime(timeStr) {
  if (!timeStr) return true;
  const str = String(timeStr).trim();

  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hr = parseInt(ampmMatch[1], 10);
    const isPm = ampmMatch[3].toUpperCase() === "PM";
    if (isPm && hr < 12) hr += 12;
    if (!isPm && hr === 12) hr = 0;
    return hr >= 6 && hr < 18;
  }

  const isoMatch = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (isoMatch) {
    const hr = parseInt(isoMatch[1], 10);
    return hr >= 6 && hr < 18;
  }

  return true;
}

/**
 * Parses time into minutes from midnight (0 - 1439) for accurate flight sorting.
 */
export function getFlightMinutesFromMidnight(value) {
  if (!value) return null;
  const str = String(value).trim();

  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hr = parseInt(ampmMatch[1], 10);
    const mins = parseInt(ampmMatch[2], 10);
    const isPm = ampmMatch[3].toUpperCase() === "PM";
    if (isPm && hr < 12) hr += 12;
    if (!isPm && hr === 12) hr = 0;
    return hr * 60 + mins;
  }

  const isoMatch = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (isoMatch) {
    const hr = parseInt(isoMatch[1], 10);
    const mins = parseInt(isoMatch[2], 10);
    return hr * 60 + mins;
  }

  return null;
}

