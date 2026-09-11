/* eslint-disable */
const LATEST_TICKET_STORAGE_KEY = "latest_ticket_confirmation_v1";
const TICKET_HISTORY_STORAGE_KEY = "ticket_confirmation_history_v1";
const HISTORY_LIMIT = 40;
const INACTIVE_TICKET_STATUSES = new Set([
  "cancelled",
  "canceled",
  "completed",
  "complete",
  "expired",
  "failed",
  "closed",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

function toObject(value) {
  return value && typeof value === "object" ? value : null;
}

function readJsonFromSessionStorage(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonToSessionStorage(key, value) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

function normalizeRef(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

function mobileMatches(ticketMobile, wantedMobile) {
  const ticketDigits = normalizeMobile(ticketMobile);
  const wantedDigits = normalizeMobile(wantedMobile);

  if (!wantedDigits) {
    return true;
  }

  if (!ticketDigits) {
    return false;
  }

  return (
    ticketDigits === wantedDigits ||
    ticketDigits.endsWith(wantedDigits) ||
    wantedDigits.endsWith(ticketDigits)
  );
}

function parseHour(hourValue, meridiem) {
  let hour = Number(hourValue);
  const marker = String(meridiem || "").trim().toUpperCase();

  if (marker === "PM" && hour < 12) {
    hour += 12;
  }

  if (marker === "AM" && hour === 12) {
    hour = 0;
  }

  return hour;
}

function parseDateValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/\bat\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const directDate = new Date(normalized);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const isoLike = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i
  );
  if (isoLike) {
    return new Date(
      Number(isoLike[1]),
      Number(isoLike[2]) - 1,
      Number(isoLike[3]),
      isoLike[4] ? parseHour(isoLike[4], isoLike[6]) : 0,
      isoLike[5] ? Number(isoLike[5]) : 0
    );
  }

  const monthIndex = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  const namedDate = normalized.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  const month = monthIndex[String(namedDate?.[2] || "").toLowerCase()];
  if (namedDate && month !== undefined) {
    return new Date(
      Number(namedDate[3]),
      month,
      Number(namedDate[1]),
      namedDate[4] ? parseHour(namedDate[4], namedDate[6]) : 0,
      namedDate[5] ? Number(namedDate[5]) : 0
    );
  }

  const slashDate = normalized.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  if (slashDate) {
    return new Date(
      Number(slashDate[3]),
      Number(slashDate[2]) - 1,
      Number(slashDate[1]),
      slashDate[4] ? parseHour(slashDate[4], slashDate[6]) : 0,
      slashDate[5] ? Number(slashDate[5]) : 0
    );
  }

  return null;
}

function parseDateTimeValue(value, fallbackDateValue) {
  const parsed = parseDateValue(value);
  if (parsed) {
    return parsed;
  }

  const fallbackDate = parseDateValue(fallbackDateValue);
  const timeMatch = String(value || "").match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\b/i
  );

  if (!fallbackDate || !timeMatch) {
    return null;
  }

  return new Date(
    fallbackDate.getFullYear(),
    fallbackDate.getMonth(),
    fallbackDate.getDate(),
    parseHour(timeMatch[1], timeMatch[3]),
    timeMatch[2] ? Number(timeMatch[2]) : 0
  );
}

function hasClockTime(value) {
  return /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(AM|PM)\b/i.test(
    String(value || "")
  );
}

function getTicketEndDate(ticket) {
  const departureValue =
    ticket?.departureTime ||
    ticket?.departureDateTime ||
    ticket?.departureDate ||
    ticket?.date;
  const arrivalValue =
    ticket?.arrivalTime || ticket?.arrivalDateTime || ticket?.arrivalDate;
  const departureDate = parseDateTimeValue(departureValue);
  let arrivalDate = parseDateTimeValue(arrivalValue, departureValue);

  if (arrivalDate && departureDate && arrivalDate < departureDate) {
    arrivalDate = new Date(arrivalDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const journeyEndDate = arrivalDate || departureDate || null;
  const journeyEndSource = arrivalDate ? arrivalValue : departureValue;

  if (journeyEndDate && !hasClockTime(journeyEndSource)) {
    journeyEndDate.setHours(23, 59, 59, 999);
  }

  return journeyEndDate;
}

export function isStoredTicketActive(ticket, now = new Date()) {
  if (!toObject(ticket)) {
    return false;
  }

  const status = String(ticket.status || "")
    .trim()
    .toLowerCase();
  if (INACTIVE_TICKET_STATUSES.has(status)) {
    return false;
  }

  const journeyEndDate = getTicketEndDate(ticket);
  if (!journeyEndDate) {
    return true;
  }

  return journeyEndDate.getTime() >= now.getTime();
}

export function readLatestStoredTicket() {
  return toObject(readJsonFromSessionStorage(LATEST_TICKET_STORAGE_KEY));
}

export function writeLatestStoredTicket(ticket) {
  if (!toObject(ticket)) {
    return;
  }

  writeJsonToSessionStorage(LATEST_TICKET_STORAGE_KEY, ticket);
}

export function readStoredTicketHistory() {
  const parsed = readJsonFromSessionStorage(TICKET_HISTORY_STORAGE_KEY);
  return Array.isArray(parsed) ? parsed.filter((item) => toObject(item)) : [];
}

export function writeStoredTicketHistory(history) {
  if (!Array.isArray(history)) {
    return;
  }

  writeJsonToSessionStorage(TICKET_HISTORY_STORAGE_KEY, history);
}

export function upsertStoredTicket(ticket) {
  if (!toObject(ticket)) {
    return;
  }

  const nextReference = normalizeRef(ticket.bookingReference || ticket.pnr);
  const nextType = String(ticket.ticketType || "").trim().toLowerCase();
  if (!nextReference || !nextType) {
    return;
  }

  const deduped = readStoredTicketHistory().filter((item) => {
    const itemReference = normalizeRef(item.bookingReference || item.pnr);
    const itemType = String(item.ticketType || "").trim().toLowerCase();
    return !(itemReference === nextReference && itemType === nextType);
  });

  const nextHistory = [ticket, ...deduped].slice(0, HISTORY_LIMIT);
  writeStoredTicketHistory(nextHistory);
}

export function findStoredTicket({ pnr, mobile, email, bookingType, activeOnly = false }) {
  const wantedReference = normalizeRef(pnr);
  const wantedMobile = normalizeMobile(mobile);
  const wantedEmail = normalizeEmail(email);
  const wantedType = String(bookingType || "").trim().toLowerCase();

  if ((!wantedReference && !wantedMobile) || !wantedType) {
    return null;
  }

  const latest = readLatestStoredTicket();
  const searchPool = latest
    ? [latest, ...readStoredTicketHistory()]
    : readStoredTicketHistory();

  return (
    searchPool.find((ticket) => {
      if (activeOnly && !isStoredTicketActive(ticket)) {
        return false;
      }

      const ticketReference = normalizeRef(
        ticket.bookingReference || ticket.pnr || ticket.reference
      );
      if (wantedReference && ticketReference !== wantedReference) {
        return false;
      }

      if (wantedMobile) {
        const ticketMobile =
          ticket.contact?.mobile ||
          ticket.contact?.phone ||
          ticket.passengerPhone ||
          ticket.mobile ||
          ticket.phone;
        if (!mobileMatches(ticketMobile, wantedMobile)) {
          return false;
        }
      }

      const ticketType = String(ticket.ticketType || ticket.type || "")
        .trim()
        .toLowerCase();
      if (ticketType !== wantedType) {
        return false;
      }

      const ticketEmail = normalizeEmail(ticket.contact?.email);
      if (wantedEmail && ticketEmail && ticketEmail !== wantedEmail) {
        return false;
      }

      return true;
    }) || null
  );
}
