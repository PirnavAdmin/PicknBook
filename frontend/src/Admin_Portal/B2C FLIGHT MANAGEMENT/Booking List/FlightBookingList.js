import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./FlightBookingList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";
import { Filter, Download } from "lucide-react";
import { useAdminList, getAdminItemsPerPage } from "../../../utils/adminPortalStorage";
import AdminPagination from "../../../components/AdminPagination";

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const adminProfitFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getProfitClassName = (profit) =>
  Number(profit) < 0 ? "admin-profit-value loss" : "admin-profit-value gain";

const DEFAULT_FILTERS = {
  status: "all",
  bookingReference: "",
  passengerName: "",
  passengerPhone: "",
  tripType: "all",
  fromCity: "",
  toCity: "",
  fromDate: "",
  toDate: "",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const safeValue = (val, fallback = "--") =>
  val !== undefined && val !== null && String(val).trim() !== ""
    ? String(val).trim()
    : fallback;

const formatAdminDate = (dateString) => {
  if (!dateString || dateString === "--" || dateString === "N/A" || String(dateString).startsWith("0001")) return "--";
  try {
    const raw = String(dateString).trim();
    if (raw.startsWith("0001-01-01")) return "--";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Match YYYY-MM-DD
    const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const [, year, monthStr, dayStr] = isoDateMatch;
      if (year === "0001") return "--";
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }

    // 2. Match DD-MM-YYYY
    const formattedMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (formattedMatch) {
      const [, dayStr, monthStr, year] = formattedMatch;
      if (year === "0001") return "--";
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }

    // 3. Fallback standard Date parsing
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      if (parsed.getFullYear() <= 1) return "--";
      const day = parsed.getDate();
      const monthIdx = parsed.getMonth();
      const year = parsed.getFullYear();
      return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const formatDateCell = (value) => formatAdminDate(value);

const formatSingleTimeAmPm = (timeStr) => {
  if (!timeStr || timeStr === "--" || timeStr === "00:00") return "";
  const raw = String(timeStr).trim();

  const hhmmMatch = raw.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    let hours = parseInt(hhmmMatch[1], 10);
    const minutes = hhmmMatch[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }

  return raw;
};

const formatJourneyTimeAmPm = (journeyTime) => {
  if (!journeyTime || journeyTime === "--" || journeyTime === "00:00") return "--:--";
  const str = String(journeyTime).trim();
  if (str.includes("-")) {
    const parts = str.split("-");
    const dep = formatSingleTimeAmPm(parts[0].trim());
    const arr = formatSingleTimeAmPm(parts[1].trim());
    if (dep && arr) {
      return `${dep} - ${arr}`;
    }
  }
  const single = formatSingleTimeAmPm(str);
  return single || journeyTime || "--:--";
};

const FALLBACK_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const FLIGHT_BOOKINGS_ROOT = "/api/flight/srdv/bookings";
const DEFAULT_API_USER_ID =
  String(process.env.REACT_APP_API_USER_ID || "").trim() || "user_123";

function isLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

function resolveApiBaseUrl(...explicitBases) {
  const preferProxyInDev =
    isLocalDevelopment() &&
    String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() !==
    "true";

  if (preferProxyInDev) {
    return "";
  }

  for (const candidate of explicitBases) {
    const trimmed = String(candidate || "").trim();
    if (trimmed) {
      return trimmed;
    }
  }

  const placesUrl = process.env.REACT_APP_PLACES_API_URL;
  if (placesUrl && placesUrl.trim()) {
    try {
      return new URL(placesUrl.trim()).origin;
    } catch {
      // Fall through to default.
    }
  }

  return FALLBACK_API_BASE_URL;
}

const FLIGHT_API_BASE_URL = resolveApiBaseUrl(
  process.env.REACT_APP_API_BASE_URL,
  process.env.REACT_APP_FLIGHT_API_BASE_URL
);

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  if (FLIGHT_API_BASE_URL) {
    return `${FLIGHT_API_BASE_URL.replace(/\/+$/, "")}/${String(
      urlOrPath || ""
    ).replace(/^\/+/, "")}`;
  }

  return urlOrPath;
}

function shouldUseNgrokBypass(urlOrPath) {
  try {
    const parsed = new URL(toAbsoluteUrl(urlOrPath), window.location.origin);
    return (
      parsed.hostname.includes("ngrok-free.dev") ||
      parsed.hostname.includes("ngrok.io")
    );
  } catch {
    return false;
  }
}

function buildUrl(path, query = {}) {
  const base = toAbsoluteUrl(path);
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue =
      typeof value === "string" ? value.trim() : String(value);

    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });

  return params.toString() ? `${base}?${params.toString()}` : base;
}

function resolveCurrentUserId(explicitUserId) {
  const directValue = normalizeText(explicitUserId, "");
  if (directValue) {
    return directValue;
  }

  if (typeof window === "undefined") {
    return DEFAULT_API_USER_ID;
  }

  try {
    const directStoredUserId = normalizeText(
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("UserId"),
      ""
    );

    if (directStoredUserId) {
      return directStoredUserId;
    }

    const rawUser = window.localStorage.getItem("user") || "";
    if (!rawUser) {
      return DEFAULT_API_USER_ID;
    }

    const parsed = JSON.parse(rawUser) || {};
    const nestedUser =
      parsed.user && typeof parsed.user === "object" ? parsed.user : {};

    const resolved = normalizeText(
      parsed.userId ||
      parsed.UserId ||
      parsed.id ||
      parsed.Id ||
      parsed.uid ||
      parsed.Uid ||
      nestedUser.userId ||
      nestedUser.UserId ||
      nestedUser.id ||
      nestedUser.Id ||
      nestedUser.uid ||
      nestedUser.Uid,
      ""
    );

    return resolved || DEFAULT_API_USER_ID;
  } catch {
    return DEFAULT_API_USER_ID;
  }
}

function shouldUseFallbackFlightBookings(error) {
  const message = String(error?.message || "").toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("cannot get /api/flightbookings") ||
    message.includes("err_ngrok_3200") ||
    (message.includes("endpoint") && message.includes("offline")) ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

function pickFirst(source, keys, fallback = null) {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return fallback;
}

function normalizeFlightPassenger(passenger, index = 0) {
  return {
    fullName: String(
      pickFirst(
        passenger,
        ["fullName", "FullName", "name", "Name"],
        `Passenger ${index + 1}`
      )
    ),
    passengerType: String(
      pickFirst(passenger, ["passengerType", "PassengerType"], "Adult")
    ),
    gender: String(pickFirst(passenger, ["gender", "Gender"], "")),
    seatNumber: pickFirst(passenger, ["seatNumber", "SeatNumber"], null),
  };
}

function normalizeFlightBookingRecord(record) {
  const passengersRaw = pickFirst(record, ["passengers", "Passengers"], []);
  const passengers = Array.isArray(passengersRaw)
    ? passengersRaw.map((passenger, index) =>
      normalizeFlightPassenger(passenger, index)
    )
    : [];
  const seatsBookedFallback = passengers.filter(
    (passenger) =>
      String(passenger.passengerType || "").toLowerCase() !== "infant"
  ).length;

  let fromCity = pickFirst(record, ["fromCity", "FromCity"], "");
  let toCity = pickFirst(record, ["toCity", "ToCity"], "");
  if (!fromCity && !toCity && record?.segment) {
    const parts = String(record.segment).split("-");
    if (parts.length >= 2) {
      fromCity = parts[0].trim();
      toCity = parts[1].trim();
    } else {
      fromCity = record.segment;
    }
  }

  return {
    bookingId: pickFirst(record, ["bookingId", "BookingId", "id", "Id"], null),
    bookingReference: String(
      pickFirst(record, ["bookingReference", "BookingReference"], "") || ""
    ),
    tripType: String(
      pickFirst(record, ["tripType", "TripType"], "Flight") || "Flight"
    ),
    tripId: pickFirst(record, ["tripId", "TripId"], null),
    passengerName: String(
      pickFirst(record, ["passengerName", "PassengerName", "passenger", "Passenger"], "") || ""
    ),
    passengerPhone: String(
      pickFirst(record, ["passengerPhone", "PassengerPhone", "phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo", "contactNumber", "ContactNumber"], "") ||
      pickFirst(record?.contact, ["phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo"], "") ||
      pickFirst(record?.raw, ["passengerPhone", "PassengerPhone", "phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo"], "") ||
      ""
    ),
    passengerEmail: String(
      pickFirst(record, ["passengerEmail", "PassengerEmail"], "") || ""
    ),
    fromCity,
    toCity,
    segment: String(pickFirst(record, ["segment", "Segment"], "") || ""),
    providerName: String(
      pickFirst(record, ["providerName", "ProviderName", "airline", "Airline"], "") ||
      pickFirst(record?.raw, ["airline", "Airline", "airlineName", "AirlineName", "providerName", "ProviderName"], "") ||
      ""
    ),
    departureTimeUtc: pickFirst(
      record,
      [
        "departureTimeUtc",
        "DepartureTimeUtc",
        "departureDateTimeUtc",
        "DepartureDateTimeUtc",
        "departureTimeIst",
        "DepartureTimeIst",
        "departureTime",
        "DepartureTime",
        "departureDateTime",
        "DepartureDateTime",
        "journeyDateTime",
        "JourneyDateTime",
        "journeyDateIst",
        "JourneyDateIst",
        "journeyDate",
        "JourneyDate",
        "departDate",
        "DepartDate",
      ],
      null
    ),
    arrivalTimeUtc: pickFirst(
      record,
      [
        "arrivalTimeUtc",
        "ArrivalTimeUtc",
        "arrivalDateTimeUtc",
        "ArrivalDateTimeUtc",
        "arrivalTimeIst",
        "ArrivalTimeIst",
        "arrivalTime",
        "ArrivalTime",
        "arrivalDateTime",
        "ArrivalDateTime",
      ],
      null
    ),
    travelClass: String(
      pickFirst(
        record,
        [
          "travelClass",
          "TravelClass",
          "cabinClass",
          "CabinClass",
          "class",
          "Class",
          "flightClass",
          "FlightClass"
        ],
        ""
      ) || ""
    ),
    children: Number(pickFirst(record, ["children", "Children"], 0)) || 0,
    infants: Number(pickFirst(record, ["infants", "Infants"], 0)) || 0,
    seatsBooked:
      Number(pickFirst(record, ["seatsBooked", "SeatsBooked"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(pickFirst(record, ["customerFareInr", "CustomerFareInr", "totalPriceInr", "TotalPriceInr"], 0)) || 0,
    customerFareInr:
      Number(pickFirst(record, ["customerFareInr", "CustomerFareInr", "totalPriceInr", "TotalPriceInr"], 0)) || 0,
    netFareInr:
      Number(pickFirst(record, ["netFareInr", "NetFareInr"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Unknown") || "Unknown"),
    paymentStatus: pickFirst(record, ["paymentStatus", "PaymentStatus"], null),
    refundStatus: pickFirst(record, ["refundStatus", "RefundStatus"], null),
    fulfillmentStatus: pickFirst(record, ["fulfillmentStatus", "FulfillmentStatus"], null),
    bookedBy: pickFirst(record, ["bookedBy", "BookedBy"], null),
    bookedAtUtc: pickFirst(record, ["bookingDateUtc", "BookingDateUtc", "bookedAtUtc", "BookedAtUtc"], null),
    bookingDateIst: pickFirst(record, ["bookingDateIst", "BookingDateIst"], null),
    journeyDateIst: pickFirst(record, ["journeyDateIst", "JourneyDateIst"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
    tripNumber: String(
      pickFirst(record, ["tripNumber", "TripNumber", "flightNumber", "FlightNumber"], "") ||
      pickFirst(record?.raw, ["flightNumber", "FlightNumber", "tripNumber", "TripNumber"], "") ||
      ""
    ),
    passengers,
    profit: Number(pickFirst(record, ["profitInr", "ProfitInr", "profit", "Profit"], 0)),
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text;
}

function normalizeErrorMessage(payload) {
  if (typeof payload === "string") {
    const text = payload.trim();
    if (!text) {
      return "";
    }

    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch?.[1]) {
      return preMatch[1].replace(/\s+/g, " ").trim();
    }

    const noTags = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (noTags) {
      return noTags;
    }

    return text;
  }

  if (payload && typeof payload?.message === "string") {
    return payload.message.trim();
  }

  return "";
}

function resolveAdminAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const adminToken = String(window.localStorage.getItem("adminToken") || "").trim();
    if (adminToken && adminToken !== "undefined" && adminToken !== "null") {
      return adminToken;
    }
    const userToken = String(window.localStorage.getItem("token") || "").trim();
    return userToken !== "undefined" && userToken !== "null" ? userToken : "";
  } catch {
    return "";
  }
}

async function requestJson(urlOrPath, options = {}) {
  const resolvedUserId = resolveCurrentUserId(options.userId);
  const resolvedToken = resolveAdminAuthToken();
  const headers = {
    Accept: "application/json",
    "X-User-Id": resolvedUserId,
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const url = toAbsoluteUrl(urlOrPath);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const normalizedMessage = normalizeErrorMessage(payload);
    const message =
      normalizedMessage || `Request failed (${response.status}). Please try again.`;
    const error = new Error(message);
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return payload;
}

async function listAdminFlightBookings({ passengerPhone, status, pnr, journeyDate, limit = 200 } = {}) {
  const candidateEndpoints = [
    "/api/admin/flight/bookings",
    "/api/SrdvFlightApi/bookings",
    "/api/flight/srdv/bookings",
    "/api/FlightBookings/bookings",
    "/api/FlightBookings",
    "/api/flight/bookings"
  ];

  let fetchedList = [];

  for (const endpoint of candidateEndpoints) {
    const url = buildUrl(endpoint, {
      passengerPhone,
      status,
      pnr,
      journeyDate,
      limit,
    });

    try {
      const data = await requestJson(url, { method: "GET" });
      const rawList = Array.isArray(data) ? data : (data?.data || data?.results || data?.items || data?.bookings || []);
      if (Array.isArray(rawList) && rawList.length > 0) {
        fetchedList = rawList.map((record) => normalizeFlightBookingRecord(record));
        break;
      }
    } catch (error) {
      // try next candidate endpoint
    }
  }

  // Merge locally cached flight tickets from localStorage so recent bookings appear in Admin immediately
  const localBookings = [];
  const localKeys = ["my_flight_bookings", "user_flight_tickets", "mock_tickets", "stored_tickets", "latest_ticket", "pnb_flight_bookings"];
  localKeys.forEach((key) => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      list.forEach((t) => {
        if (!t || typeof t !== "object") return;
        const isHotel = t.bookingType === "hotel" || t.ticketType === "hotel" || Boolean(t.hotelName) || Boolean(t.roomType) || Boolean(t.hotelId);
        if (isHotel) return;
        const isFlight = t.ticketType === "flight" || t.providerName?.toLowerCase().includes("flight") || Boolean(t.airline) || Boolean(t.flightNumber) || Boolean(t.pnr);
        if (!isFlight) return;
        localBookings.push(normalizeFlightBookingRecord(t));
      });
    } catch (e) {}
  });

  const mergedMap = new Map();
  fetchedList.forEach((b) => {
    const key = String(b.bookingReference || b.bookingId || "").trim().toLowerCase();
    if (key) mergedMap.set(key, b);
  });
  localBookings.forEach((b) => {
    const key = String(b.bookingReference || b.bookingId || "").trim().toLowerCase();
    if (key && !mergedMap.has(key)) {
      mergedMap.set(key, b);
    }
  });

  return Array.from(mergedMap.values());
}

const parseNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toDateKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();

  // 1. Try to match YYYY-MM-DD directly
  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  // 2. Try to parse with standard Date but don't convert to ISO if it shifts
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    // Fallback: slice first 10 chars
    return normalizeText(value, "").slice(0, 10);
  }

  // To avoid timezone shifting, format in local timezone parts
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  if (!raw.includes(":")) {
    return "";
  }

  // 1. Try regex match for HH:MM (e.g. 15:30)
  const timeMatch = raw.match(/(?:T|\s|^)(\d{1,2}:\d{2})/);
  if (timeMatch?.[1]) {
    // Pad single-digit hours if any, like "5:30" -> "05:30"
    const [h, m] = timeMatch[1].split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const text = normalizeText(value, "");
    if (text.includes("T")) {
      return text.split("T")[1]?.slice(0, 5) || "";
    }
    return text.slice(11, 16);
  }

  // Format local parts to avoid timezone shifting
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const BOOKED_STATUS_SET = new Set(["booked", "success", "confirmed", "ticketed"]);
const HOLD_STATUS_SET = new Set(["hold", "onhold", "on-hold", "on_hold"]);
const PENDING_STATUS_SET = new Set(["pending", "processing"]);
const CANCELLED_STATUS_SET = new Set(["cancelled", "canceled"]);

const toAdminStatusLabel = (statusValue) => {
  const normalized = normalizeText(statusValue, "Unknown");
  const key = normalized.toLowerCase();

  if (HOLD_STATUS_SET.has(key) || key.includes("hold")) {
    return "Hold";
  }

  if (CANCELLED_STATUS_SET.has(key)) {
    return "Cancelled";
  }

  if (PENDING_STATUS_SET.has(key)) {
    return "Pending";
  }

  if (BOOKED_STATUS_SET.has(key)) {
    return "Booked";
  }

  return normalized;
};

const mapAdminStatusClass = (statusValue) => {
  const key = normalizeText(statusValue, "").toLowerCase();

  if (HOLD_STATUS_SET.has(key) || key.includes("hold")) {
    return "hold";
  }

  if (CANCELLED_STATUS_SET.has(key)) {
    return "cancelled";
  }

  if (PENDING_STATUS_SET.has(key)) {
    return "pending";
  }

  if (BOOKED_STATUS_SET.has(key)) {
    return "success";
  }

  return "pending";
};

const mapBookingFilterStatusToApi = (filterStatus) => {
  const key = normalizeText(filterStatus, "").toLowerCase();

  if (!key || key === "all") {
    return undefined;
  }

  if (key === "booked" || key === "success") {
    return "Booked";
  }

  if (key === "pending") {
    return "Pending";
  }

  if (key === "cancelled") {
    return "Cancelled";
  }

  return undefined;
};

const resolveTripType = (record) => {
  const raw = String(
    pickFirst(
      record,
      [
        "tripType",
        "TripType",
        "journeyType",
        "JourneyType",
        "flightType",
        "FlightType",
        "bookingType",
        "BookingType",
        "tripCategory",
        "TripCategory"
      ],
      ""
    )
  ).trim().toLowerCase();

  if (raw.includes("round")) return "Round-Trip";
  if (raw.includes("multi")) return "Multi-City";
  if (raw.includes("one")) return "One-Way";

  const segment = String(record?.segment || "").trim();
  const segmentsCount = segment ? segment.split("-").length - 1 : 0;
  if (segmentsCount >= 2) {
    return "Multi-City";
  }

  const hasReturn = Boolean(
    record?.returnDate ||
    record?.returnDateIst ||
    record?.returnDateTime ||
    record?.returnDateUtc
  );
  if (hasReturn) {
    return "Round-Trip";
  }

  return "One-Way";
};

const toUnifiedAdminBooking = (record, sourceType) => {
  const safeSourceType = normalizeText(sourceType, "Flight");
  const status = toAdminStatusLabel(record?.status);
  const bookingReference = normalizeText(record?.bookingReference, "");
  const bookingId = normalizeText(record?.bookingId, "");
  const pnr = normalizeText(record?.pnr, "");
  const tripNumber = normalizeText(record?.tripNumber, "");
  const bookedAtValue = record?.bookingDateIst || record?.bookedAtUtc || null;

  const rawJourneyDate = record?.journeyDateIst || record?.departureTimeUtc || null;
  const isInvalidJourneyDate = !rawJourneyDate || rawJourneyDate === "0001-01-01" || String(rawJourneyDate).startsWith("0001");
  const validJourneyDate = isInvalidJourneyDate ? null : rawJourneyDate;

  const tripType = resolveTripType(record);

  const fare = Math.max(
    parseNumber(record?.customerFareInr ?? record?.totalPriceInr, 0),
    0
  );
  
  const explicitProfit =
    record?.profit !== undefined && record?.profit !== null
      ? parseNumber(record?.profit, 0)
      : (record?.profitInr !== undefined && record?.profitInr !== null ? parseNumber(record?.profitInr, 0) : null);

  const profit = explicitProfit !== null ? explicitProfit : Math.round(fare * 0.04);

  const netFareInr =
    record?.netFareInr !== undefined && record?.netFareInr !== null
      ? parseNumber(record?.netFareInr, Math.max(fare - profit, 0))
      : Math.max(fare - profit, 0);

  const rawJourneyTime = toTimeKey(validJourneyDate);
  const journeyTime =
    validJourneyDate && rawJourneyTime && rawJourneyTime !== "--"
      ? rawJourneyTime
      : (toTimeKey(bookedAtValue) || "--:--");

  const displayId = bookingId || bookingReference || "--";
  const displayPnr = pnr || bookingReference || tripNumber || bookingId || "--";

  const rawPassenger = normalizeText(record?.passengerName || record?.passenger, "");
  const rawPhone = normalizeText(record?.passengerPhone, "");
  const bookedBy = normalizeText(record?.bookedBy, "");

  const passengerName = rawPassenger || (bookedBy ? `User: ${bookedBy}` : "--");
  const passengerPhone = rawPhone || (bookedBy ? `ID: ${bookedBy}` : "--");

  return {
    id: displayId,
    bookingId: bookingId || "--",
    bookingReference: bookingReference || "--",
    tripType,
    createdAt: toDateKey(bookedAtValue),
    createdAtValue: bookedAtValue,
    passengerName,
    passengerPhone,
    rawPassenger,
    rawPhone,
    passengerEmail: normalizeText(record?.passengerEmail, ""),
    from: normalizeText(record?.fromCity, "--"),
    to: normalizeText(record?.toCity, "--"),
    segment:
      record?.segment ||
      (record?.fromCity && record?.toCity
        ? `${record.fromCity} - ${record.toCity}`
        : "--"),
    journeyDate: validJourneyDate ? toDateKey(validJourneyDate) : "--",
    journeyTime: validJourneyDate ? journeyTime : "--:--",
    pnr: displayPnr,
    rawPnr: pnr,
    status,
    operator: normalizeText(record?.providerName || record?.airline || record?.operator, "--"),
    vehicleType: normalizeText(record?.travelClass, safeSourceType),
    travelClass: normalizeText(record?.travelClass, "Economy"),
    fare,
    netFareInr,
    profit,
    paymentStatus: record?.paymentStatus || null,
    refundStatus: record?.refundStatus || null,
    fulfillmentStatus: record?.fulfillmentStatus || null,
    bookedBy: bookedBy || null,
    cancellationReason: normalizeText(record?.cancellationReason, ""),
    cancelledAtValue: record?.cancelledAtUtc || null,
    passengers: record?.passengers || [],
    raw: record,
  };
};

const isBookingOnDate = (booking, dateKey) => {
  return normalizeText(booking?.createdAt, "") === normalizeText(dateKey, "");
};

const toNumberDate = (value) => {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
};

const resolveFlightStatusClass = (statusValue) => {
  const key = String(statusValue || "").trim().toLowerCase();

  if (!key) {
    return "pending";
  }

  if (key.includes("hold")) {
    return "hold";
  }

  if (key.includes("fail") || key.includes("error") || key.includes("reject")) {
    return "failed";
  }

  if (key.includes("cancel")) {
    return "cancelled";
  }

  if (key.includes("pend")) {
    return "pending";
  }

  return "success";
};

const resolveNetFare = (booking) => {
  const fare = Number(booking?.fare) || 0;
  const profit = Number(booking?.profit) || 0;
  return Math.max(fare - profit, 0);
};

export default function AdminFlightBookingListPage() {
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useAdminList("flight-bookings", []);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => getAdminItemsPerPage(50));

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, bookings]);

  const todayDate = new Date().toISOString().slice(0, 10);

  const loadAdminBookings = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");

    const apiStatus = mapBookingFilterStatusToApi(activeFilters.status);
    const passengerPhone = String(activeFilters.passengerPhone || "").trim() || undefined;
    const isFailedFilter = String(activeFilters.status || "").toLowerCase() === "failed";

    try {
      const flightResults = await listAdminFlightBookings({
        passengerPhone,
        status: isFailedFilter ? undefined : apiStatus,
        pnr: String(activeFilters.bookingReference || activeFilters.pnr || "").trim() || undefined,
        journeyDate: String(activeFilters.fromDate || activeFilters.journeyDate || "").trim() || undefined,
        limit: 200,
      });

      const unifiedBookings = flightResults
        .filter((record) => {
          const isHotel = record?.bookingType === "hotel" || record?.ticketType === "hotel" || Boolean(record?.hotelName) || Boolean(record?.roomType) || Boolean(record?.hotelId);
          return !isHotel;
        })
        .map((record) => toUnifiedAdminBooking(record, "Flight"))
        .sort((first, second) => {
          const firstTime = toNumberDate(first.createdAtValue || first.createdAt);
          const secondTime = toNumberDate(second.createdAtValue || second.createdAt);
          return secondTime - firstTime;
        });

      setBookings(unifiedBookings);
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load flight bookings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminBookings(filters);
  }, [filters, loadAdminBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusFilterKey = String(filters.status || "").toLowerCase();

      if (statusFilterKey && statusFilterKey !== "all") {
        if (statusFilterKey === "failed") {
          if (resolveFlightStatusClass(booking.status) !== "failed") {
            return false;
          }
        } else {
          const statusFromFilter = mapBookingFilterStatusToApi(filters.status);
          if (
            statusFromFilter &&
            safeValue(booking.status, "").toLowerCase() !== statusFromFilter.toLowerCase()
          ) {
            return false;
          }
        }
      }

      if (filters.bookingReference) {
        const query = filters.bookingReference.trim().toLowerCase();
        const lookup = `${booking.id} ${booking.pnr} ${booking.bookingReference || ""} ${booking.raw?.tripNumber || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (filters.passengerName) {
        const query = filters.passengerName.trim().toLowerCase();
        const mainName = String(booking.passengerName || "").toLowerCase();
        const pNames = (booking.passengers || []).map((p) => String(p.fullName || "").toLowerCase()).join(" ");
        if (!mainName.includes(query) && !pNames.includes(query)) {
          return false;
        }
      }

      if (filters.passengerPhone) {
        const query = filters.passengerPhone.trim().toLowerCase();
        if (!String(booking.passengerPhone || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.tripType && filters.tripType !== "all") {
        const query = filters.tripType.toLowerCase();
        const bTripType = String(booking.vehicleType || booking.tripType || booking.raw?.tripType || "").toLowerCase();
        if (query === "oneway" || query === "one way") {
          if (bTripType.includes("round") || bTripType.includes("multi") || bTripType.includes("two")) return false;
        } else if (query === "roundtrip" || query === "two way" || query === "round trip" || query === "twoway") {
          if (!bTripType.includes("round") && !bTripType.includes("two") && !bTripType.includes("return")) return false;
        } else if (query === "multicity" || query === "multi city") {
          if (!bTripType.includes("multi")) return false;
        }
      }

      if (filters.fromCity) {
        const query = filters.fromCity.trim().toLowerCase();
        if (!String(booking.from || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.toCity) {
        const query = filters.toCity.trim().toLowerCase();
        if (!String(booking.to || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.fromDate) {
        const journeyTime = toNumberDate(booking.journeyDate);
        if (!Number.isFinite(journeyTime) || journeyTime < toNumberDate(filters.fromDate)) {
          return false;
        }
      }

      if (filters.toDate) {
        const journeyTime = toNumberDate(booking.journeyDate);
        if (!Number.isFinite(journeyTime) || journeyTime > toNumberDate(filters.toDate)) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, filters]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const todaySuccessCount = bookings.filter(
    (item) => isBookingOnDate(item, todayDate) && resolveFlightStatusClass(item.status) === "success"
  ).length;

  const todayFailedCount = bookings.filter(
    (item) => isBookingOnDate(item, todayDate) && resolveFlightStatusClass(item.status) === "failed"
  ).length;

  const todayPendingCount = bookings.filter(
    (item) => isBookingOnDate(item, todayDate) && resolveFlightStatusClass(item.status) === "pending"
  ).length;

  const currentMonth = todayDate.slice(0, 7);
  const todayProfit = bookings
    .filter(
      (item) =>
        isBookingOnDate(item, todayDate) && resolveFlightStatusClass(item.status) === "success"
    )
    .reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  const filteredProfit = filteredBookings
    .filter((item) => resolveFlightStatusClass(item.status) === "success")
    .reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  const monthProfit = bookings
    .filter(
      (item) =>
        resolveFlightStatusClass(item.status) === "success" &&
        String(item.createdAt || "").startsWith(currentMonth)
    )
    .reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  const totalItems = filteredBookings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleDraftChange = (field, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
  };

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const headers = [
      "bookingId",
      "bookingDate",
      "journeyDate",
      "journeyTime",
      "segmentFrom",
      "segmentTo",
      "airline",
      "flightNumber",
      "pnr",
      "status",
      "passengerName",
      "passengerPhone",
      "customerFare",
      "netFare",
      "profit",
    ];

    const rows = filteredBookings.map((booking) => {
      const fare = Number(booking.fare) || 0;
      const profit = Number(booking.profit) || 0;
      const netFare = resolveNetFare(booking);
      const flightNumber = safeValue(booking.raw?.tripNumber, "");

      return [
        booking.id,
        booking.createdAt,
        booking.journeyDate,
        booking.journeyTime,
        booking.from,
        booking.to,
        booking.operator,
        flightNumber,
        booking.pnr,
        booking.status,
        booking.passengerName,
        booking.passengerPhone,
        fare,
        netFare,
        profit,
      ];
    });

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `admin-b2c-flight-bookings-${todayDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-booking-page admin-flight-booking-page">
      <header className="admin-b2c-header admin-flight-booking-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Flight</span> Booking List
        </h1>
      </header>

      <div className="admin-toolbar-row" style={{ marginBottom: "6px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Today Booked: {todaySuccessCount}</span>
          <span className="admin-chip">Today Pending: {todayPendingCount}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredBookings.length}
          </span>
        </div>

        <div className="admin-actions-row admin-flight-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '4px 14px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: '#A51C49',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(165, 28, 73, 0.2)'
            }}
          >
            <Filter size={13} />
            <span>{isFiltersOpen ? "Close Filter" : "Filter"}</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '4px 14px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters">
          <label>
            <span>Booking Ref / PNR</span>
            <input
              type="text"
              value={draftFilters.bookingReference}
              onChange={(event) =>
                handleDraftChange("bookingReference", event.target.value)
              }
              placeholder="Search Ref / PNR"
            />
          </label>

          <label>
            <span>Passenger Name</span>
            <input
              type="text"
              value={draftFilters.passengerName}
              onChange={(event) =>
                handleDraftChange("passengerName", event.target.value)
              }
              placeholder="Enter name"
            />
          </label>

          <label>
            <span>Mobile No</span>
            <input
              type="text"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleDraftChange("passengerPhone", event.target.value)}
              placeholder="Enter mobile number"
            />
          </label>

          <label>
            <span>Trip Way</span>
            <select
              value={draftFilters.tripType}
              onChange={(event) => handleDraftChange("tripType", event.target.value)}
            >
              <option value="all">All Ways</option>
              <option value="oneway">One Way</option>
              <option value="roundtrip">Round Trip (Two Way)</option>
              <option value="multicity">Multi City</option>
            </select>
          </label>

          <label>
            <span>From City</span>
            <input
              type="text"
              value={draftFilters.fromCity}
              onChange={(event) => handleDraftChange("fromCity", event.target.value)}
              placeholder="e.g. DEL"
            />
          </label>

          <label>
            <span>To City</span>
            <input
              type="text"
              value={draftFilters.toCity}
              onChange={(event) => handleDraftChange("toCity", event.target.value)}
              placeholder="e.g. BOM"
            />
          </label>

          <label>
            <span>Journey From</span>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => handleDraftChange("fromDate", event.target.value)}
            />
          </label>

          <label>
            <span>Journey To</span>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => handleDraftChange("toDate", event.target.value)}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={draftFilters.status}
              onChange={(event) => handleDraftChange("status", event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="booked">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Clear Filter
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-table-shell admin-flight-table-shell">
        <header className="admin-table-head admin-flight-table-head" style={{ gridTemplateColumns: "0.8fr 1.1fr 1.4fr 1.3fr 1.4fr 1.1fr 1.1fr 1fr 0.7fr" }}>
          <span>B. ID / B.D.</span>
          <span>Name</span>
          <span>Segment / Journey Date</span>
          <span>Timings</span>
          <span>PNR / Status</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading flight bookings...</div>
        ) : errorMessage ? (
          <div className="admin-table-empty">Data not found</div>
        ) : filteredBookings.length ? (
          <div className="admin-table-body">
            {paginatedBookings.map((booking, idx) => {
              const statusClass = resolveFlightStatusClass(booking.paymentStatus || booking.status);
              const flightNumber = safeValue(booking.raw?.tripNumber, "--");
              const fare = Number(booking.fare) || 0;
              const profit = Number(booking.profit) || 0;

              return (
                <article
                  key={`flight-${booking.id || idx}-${booking.createdAt || idx}-${idx}`}
                  className="admin-table-row"
                  style={{ gridTemplateColumns: "0.8fr 1.1fr 1.4fr 1.3fr 1.4fr 1.1fr 1.1fr 1fr 0.7fr" }}
                >
                  <div
                    className="admin-table-cell"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <strong style={{ color: "#A51C49", fontWeight: 700, fontSize: "0.68rem", wordBreak: "break-all" }}>
                      {safeValue(booking.id)}
                    </strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(booking.createdAtValue || booking.createdAt)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong className="admin-name-text" style={{ color: "#000000", fontWeight: 800, fontSize: "0.76rem", display: "block", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                      {safeValue(booking.passengerName)}
                    </strong>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center" }}>
                      {safeValue(booking.passengerPhone)}
                    </small>
                  </div>

                  <div className="admin-table-cell">
                    <div className="admin-route-segment">
                      <span>{safeValue(booking.from)}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{safeValue(booking.to)}</span>
                    </div>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(booking.journeyDate)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{formatJourneyTimeAmPm(booking.journeyTime)}</strong>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong style={{ fontSize: "0.82rem", marginBottom: "3px" }}>{safeValue(booking.pnr)}</strong>
                    <span className={`admin-status-pill ${statusClass}`}>
                      {safeValue(booking.paymentStatus || booking.status)}
                    </span>
                  </div>

                  <div className="admin-table-cell">
                    <span>{booking.operator !== "--" ? booking.operator : "Flight Airlines"}</span>
                    <small>
                      {flightNumber !== "--" ? `${flightNumber} • ` : ""}{booking.tripType} ({booking.travelClass})
                    </small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{adminCurrencyFormatter.format(fare)}</strong>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong style={{ color: profit < 0 ? "#ef4444" : "#10b981" }}>
                      {profit < 0 ? `- ₹${Math.abs(profit).toLocaleString("en-IN")}` : `₹${profit.toLocaleString("en-IN")}`}
                    </strong>
                    <small style={{ color: profit < 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>{profit < 0 ? "Loss" : "Profit"}</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-table-empty">No flight bookings available.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredBookings.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          itemName="bookings"
        />
      </section>

      {selectedBooking ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedBooking(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Flight booking details"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(860px, 94vw)", padding: "20px" }}
          >
            <header className="admin-view-header" style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div className="admin-view-header-main">
                <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px", fontWeight: "700", color: "#1e293b" }}>Flight Booking Detail View</h2>
                <p className="admin-view-header-subtitle" style={{ fontSize: "0.82rem", margin: 0, color: "#64748b" }}>
                  ID: <strong>{safeValue(selectedBooking.bookingId || selectedBooking.id)}</strong> | PNR: <strong>{safeValue(selectedBooking.rawPnr || selectedBooking.pnr, "--")}</strong> | Ref: <strong>{safeValue(selectedBooking.bookingReference, "--")}</strong>
                </p>
                <div className="admin-view-meta-row" style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span className="admin-view-meta-chip">
                    Status: {safeValue(selectedBooking.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Customer Fare: {adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}
                  </span>
                  <span className="admin-view-meta-chip">
                    {Number(selectedBooking.profit) < 0
                      ? `Loss: -₹${Math.abs(Number(selectedBooking.profit)).toLocaleString("en-IN")}`
                      : `Profit: ${adminCurrencyFormatter.format(Number(selectedBooking.profit) || 0)}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{
                  padding: "6px 18px",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(165, 28, 73, 0.3)"
                }}
              >
                Close
              </button>
            </header>

            <div style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "4px" }}>
              {/* SECTION 1: GENERAL & JOURNEY DETAILS */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "14px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                GENERAL & JOURNEY DETAILS
              </div>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Booking ID</th>
                    <td>{safeValue(selectedBooking.bookingId || selectedBooking.id)}</td>
                    <th>Booking Reference</th>
                    <td>{safeValue(selectedBooking.bookingReference, "--")}</td>
                  </tr>
                  <tr>
                    <th>PNR</th>
                    <td>{safeValue(selectedBooking.rawPnr || selectedBooking.pnr, "--")}</td>
                    <th>Booking Date (B.D.)</th>
                    <td>{formatAdminDate(selectedBooking.raw?.bookingDateIst || selectedBooking.createdAtValue || selectedBooking.createdAt)}</td>
                  </tr>
                  <tr>
                    <th>Booking Status</th>
                    <td>
                      <span className={`admin-status-pill ${resolveFlightStatusClass(selectedBooking.status)}`}>
                        {safeValue(selectedBooking.status)}
                      </span>
                    </td>
                    <th>Pax / Passengers</th>
                    <td>{selectedBooking.seatsBooked || (selectedBooking.passengers?.length || 1)} Pax</td>
                  </tr>
                  <tr>
                    <th>Segment / Route</th>
                    <td>{safeValue(selectedBooking.segment, "--")}</td>
                    <th>Journey Date (Jd)</th>
                    <td>{formatAdminDate(selectedBooking.raw?.journeyDateIst || selectedBooking.journeyDate)}</td>
                  </tr>
                  <tr>
                    <th>Departure Time</th>
                    <td>{formatJourneyTimeAmPm(selectedBooking.raw?.departureTimeUtc || selectedBooking.journeyTime)}</td>
                    <th>Arrival Time</th>
                    <td>{formatJourneyTimeAmPm(selectedBooking.raw?.arrivalTimeUtc || "--:--")}</td>
                  </tr>
                  <tr>
                    <th>Airline / Carrier</th>
                    <td>{safeValue(selectedBooking.operator, "Flight Airlines")}</td>
                    <th>Travel Class</th>
                    <td>{safeValue(selectedBooking.travelClass, "Economy")}</td>
                  </tr>
                  <tr>
                    <th>Passenger Name</th>
                    <td>{safeValue(selectedBooking.passengerName, "--")}</td>
                    <th>Phone Number (P.no)</th>
                    <td>{safeValue(selectedBooking.passengerPhone, "--")}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 2: FINANCIAL & FARE BREAKDOWN */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                FINANCIAL & FARE BREAKDOWN
              </div>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Fare Parameter</th>
                    <th style={{ width: "30%" }}>Amount (INR)</th>
                    <th style={{ width: "40%" }}>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Customer Fare</strong></td>
                    <td><strong>{adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}</strong></td>
                    <td>Total fare charged to customer</td>
                  </tr>
                  <tr>
                    <td>Net Fare</td>
                    <td>{adminCurrencyFormatter.format(Number(selectedBooking.netFareInr) || resolveNetFare(selectedBooking))}</td>
                    <td>Net payable fare amount</td>
                  </tr>
                  <tr>
                    <td>Base Fare</td>
                    <td>{adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}</td>
                    <td>Base ticket fare cost</td>
                  </tr>
                  <tr>
                    <td>Taxable Fare</td>
                    <td>₹0.00</td>
                    <td>Fare amount subject to taxes</td>
                  </tr>
                  <tr>
                    <td>Markup Amount</td>
                    <td>₹0.00</td>
                    <td>Admin markup added</td>
                  </tr>
                  <tr>
                    <td>Discount Amount</td>
                    <td>₹0.00</td>
                    <td>Applied coupon / promo discount</td>
                  </tr>
                  <tr>
                    <td>Convenience Fee</td>
                    <td>₹0.00</td>
                    <td>Platform convenience fee</td>
                  </tr>
                  <tr>
                    <td>GST Percent / Amount</td>
                    <td>0.00% / ₹0.00</td>
                    <td>Applicable GST taxes</td>
                  </tr>
                  <tr className="admin-view-highlight-row" style={{ background: "#f8fafc" }}>
                    <td><strong>Calculated Profit / Loss</strong></td>
                    <td>
                      <strong style={{ color: Number(selectedBooking.profit) < 0 ? "#ef4444" : "#10b981" }}>
                        {adminProfitFormatter.format(Number(selectedBooking.profit) || 0)}
                      </strong>
                    </td>
                    <td style={{ color: Number(selectedBooking.profit) < 0 ? "#ef4444" : "#10b981", fontWeight: "700" }}>
                      {Number(selectedBooking.profit) < 0 ? "Loss" : "Profit"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 3: PAYMENT INFORMATION */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                PAYMENT INFORMATION
              </div>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Payment Status</th>
                    <td>
                      <span className={`admin-ps-pill ${resolveFlightStatusClass(selectedBooking.paymentStatus || selectedBooking.status) === "success" ? "ps-success" : "ps-na"}`}>
                        {safeValue(selectedBooking.paymentStatus || selectedBooking.status || "N/A")}
                      </span>
                    </td>
                    <th>Refund Status</th>
                    <td>
                      <span className="admin-ps-pill ps-na">
                        {safeValue(selectedBooking.refundStatus, "N/A")}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Fulfillment Status</th>
                    <td colSpan="3">
                      <span className="admin-ps-pill ps-na">
                        {safeValue(selectedBooking.fulfillmentStatus, "N/A")}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "14px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                    PASSENGER DETAILS ({selectedBooking.passengers.length})
                  </div>
                  <table className="admin-view-table">
                    <thead>
                      <tr>
                        <th style={{ width: "10%" }}>#</th>
                        <th style={{ width: "40%" }}>Full Name</th>
                        <th style={{ width: "20%" }}>Type</th>
                        <th style={{ width: "15%" }}>Gender</th>
                        <th style={{ width: "15%" }}>Seat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBooking.passengers.map((p, pIdx) => (
                        <tr key={`p-${pIdx}`}>
                          <td>{pIdx + 1}</td>
                          <td><strong>{p.fullName || "N/A"}</strong></td>
                          <td>{p.passengerType || "Adult"}</td>
                          <td>{p.gender || "--"}</td>
                          <td>{p.seatNumber || "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}


