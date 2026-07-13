import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./FlightBookingList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_FILTERS = {
  status: "all",
  bookingReference: "",
  passengerPhone: "",
  fromDate: "",
  toDate: "",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const FALLBACK_API_BASE_URL =
  "https://undogmatically-knotlike-evita.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const FLIGHT_BOOKINGS_ROOT = "/api/FlightBookings";
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
      pickFirst(record, ["bookingReference", "BookingReference", "pnr", "Pnr"], "") || ""
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
    ) || pickFirst(
      record?.raw,
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
    ) || pickFirst(
      record?.raw,
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
    travelClass: String(pickFirst(record, ["travelClass", "TravelClass"], "") || ""),
    adults: Number(pickFirst(record, ["adults", "Adults"], 0)) || 0,
    children: Number(pickFirst(record, ["children", "Children"], 0)) || 0,
    infants: Number(pickFirst(record, ["infants", "Infants"], 0)) || 0,
    seatsBooked:
      Number(pickFirst(record, ["seatsBooked", "SeatsBooked"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr", "customerFareInr", "CustomerFareInr"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Unknown") || "Unknown"),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc", "bookingDateUtc", "BookingDateUtc"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
    tripNumber: String(
      pickFirst(record, ["tripNumber", "TripNumber", "flightNumber", "FlightNumber"], "") ||
      pickFirst(record?.raw, ["flightNumber", "FlightNumber", "tripNumber", "TripNumber"], "") ||
      pickFirst(record, ["pnr", "Pnr"], "") ||
      ""
    ),
    passengers,
    profit: Number(pickFirst(record, ["profitInr", "ProfitInr", "profit", "Profit"], null)),
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

async function listAdminFlightBookings({ passengerPhone, status } = {}) {
  const url = buildUrl("/api/admin/flight/bookings", {
    passengerPhone,
    status,
  });

  try {
    const data = await requestJson(url, { method: "GET" });
    return Array.isArray(data)
      ? data.map((record) => normalizeFlightBookingRecord(record))
      : [];
  } catch (error) {
    if (shouldUseFallbackFlightBookings(error)) {
      return [];
    }

    throw error;
  }
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
const PENDING_STATUS_SET = new Set(["pending", "onhold", "processing"]);
const CANCELLED_STATUS_SET = new Set(["cancelled", "canceled"]);

const toAdminStatusLabel = (statusValue) => {
  const normalized = normalizeText(statusValue, "Unknown");
  const key = normalized.toLowerCase();

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

const toUnifiedAdminBooking = (record, sourceType) => {
  const safeSourceType = normalizeText(sourceType, "Bus");
  const status = toAdminStatusLabel(record?.status);
  const bookingReference = normalizeText(record?.bookingReference, "");
  const bookingId = normalizeText(record?.bookingId, "");
  const tripNumber = normalizeText(record?.tripNumber, "");
  const bookedAtValue = record?.bookedAtUtc || null;
  const departureValue = record?.departureTimeUtc || null;

  const fare = Math.max(parseNumber(record?.totalPriceInr, 0), 0);
  const inferredProfit = Math.round(fare * 0.04);
  const profit = parseNumber(record?.profit, inferredProfit);

  const rawJourneyTime = toTimeKey(departureValue);
  const journeyTime = rawJourneyTime && rawJourneyTime !== "--" ? rawJourneyTime : (toTimeKey(bookedAtValue) || "00:00");

  return {
    id: bookingReference || bookingId || "--",
    bookingId,
    bookingReference,
    tripType: safeSourceType,
    createdAt: toDateKey(bookedAtValue),
    createdAtValue: bookedAtValue,
    passengerName: normalizeText(record?.passengerName, "--"),
    passengerPhone: normalizeText(record?.passengerPhone, "--"),
    from: normalizeText(record?.fromCity, "--"),
    to: normalizeText(record?.toCity, "--"),
    journeyDate: toDateKey(departureValue),
    journeyTime,
    pnr: bookingReference || tripNumber || bookingId || "--",
    status,
    operator: normalizeText(record?.providerName, "--"),
    vehicleType: normalizeText(record?.travelClass, safeSourceType),
    fare,
    profit,
    cancellationReason: normalizeText(record?.cancellationReason, ""),
    cancelledAtValue: record?.cancelledAtUtc || null,
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

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const resolveFlightStatusClass = (statusValue) => {
  const key = String(statusValue || "").trim().toLowerCase();

  if (!key) {
    return "pending";
  }

  if (key.includes("fail") || key.includes("error") || key.includes("reject")) {
    return "failed";
  }

  return mapAdminStatusClass(statusValue);
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
  const itemsPerPage = 50;

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
      });

      const unifiedBookings = flightResults
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
        const query = filters.bookingReference.toLowerCase();
        const lookup = `${booking.id} ${booking.pnr} ${booking.passengerName} ${booking.operator} ${booking.raw?.tripNumber || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (
        filters.passengerPhone &&
        !String(booking.passengerPhone || "").includes(filters.passengerPhone)
      ) {
        return false;
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
      <header className="admin-b2c-header admin-flight-booking-header">
        <div className="admin-toolbar-row">
          <h1 className="admin-flight-booking-title">
            <span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Booking List
          </h1>

          <div className="admin-actions-row admin-flight-actions">
            <button
              type="button"
              className="admin-flight-btn admin-flight-btn-filter"
              onClick={() => setIsFiltersOpen((current) => !current)}
            >
              {isFiltersOpen ? "Close Filter" : "Filter"}
            </button>
            <button
              type="button"
              className="admin-flight-btn admin-flight-btn-clear"
              onClick={clearFilters}
            >
              Clear Filter
            </button>
            <button
              type="button"
              className="admin-flight-btn admin-flight-btn-export"
              onClick={handleExport}
            >
              Export
            </button>
          </div>
        </div>

        <div className="admin-flight-metrics">
          <div className="admin-flight-metric-group">
            <span className="admin-flight-metric-chip success">
              <strong>{todaySuccessCount}</strong>
              <span>Today Success</span>
            </span>
            <span className="admin-flight-metric-chip failed">
              <strong>{todayFailedCount}</strong>
              <span>Today Failed</span>
            </span>
            <span className="admin-flight-metric-chip pending">
              <strong>{todayPendingCount}</strong>
              <span>Today Pending</span>
            </span>
          </div>

          <div className="admin-flight-metric-group admin-flight-profit-group">
            <span className="admin-flight-metric-chip profit">
              <strong>₹</strong>
              <span>Today Profit {adminCurrencyFormatter.format(todayProfit)}</span>
            </span>
            <span className="admin-flight-metric-chip profit">
              <strong>₹</strong>
              <span>Current Month Profit {adminCurrencyFormatter.format(monthProfit)}</span>
            </span>
          </div>
        </div>
      </header>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters">
          <label>
            <span>Status</span>
            <select
              value={draftFilters.status}
              onChange={(event) => handleDraftChange("status", event.target.value)}
            >
              <option value="all">All</option>
              <option value="booked">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span>Booking Ref / PNR</span>
            <input
              type="text"
              value={draftFilters.bookingReference}
              onChange={(event) =>
                handleDraftChange("bookingReference", event.target.value)
              }
              placeholder="Search booking id, PNR or passenger"
            />
          </label>

          <label>
            <span>Passenger Phone</span>
            <input
              type="text"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleDraftChange("passengerPhone", event.target.value)}
              placeholder="Enter mobile number"
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
        <header className="admin-table-head admin-flight-table-head">
          <span>B. ID/Date</span>
          <span>Journey Date</span>
          <span>Segment</span>
          <span>Status</span>
          <span>PNR</span>
          <span>Passenger</span>
          <span>Fare</span>
          <span>+ / P</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading flight bookings...</div>
        ) : filteredBookings.length ? (
          <>
            <div className="admin-table-body">
              {paginatedBookings.map((booking, idx) => {
                const statusClass = resolveFlightStatusClass(booking.status);
                const flightNumber = safeValue(booking.raw?.tripNumber, "--");
                const fare = Number(booking.fare) || 0;
                const profit = Number(booking.profit) || 0;
                const netFare = resolveNetFare(booking);

                return (
                  <article
                    key={`flight-${booking.id || idx}-${booking.createdAt || idx}-${idx}`}
                    className="admin-table-row"
                  >
                    <div className="admin-table-cell" title={`Booking ID: ${safeValue(booking.id)}`}>
                      <strong title={safeValue(booking.id)}>{safeValue(booking.id)}</strong>
                      <small title={safeValue(booking.createdAt)}>{safeValue(booking.createdAt)}</small>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`Journey: ${safeValue(booking.journeyDate)} ${safeValue(booking.journeyTime)}`}>
                      <strong title={safeValue(booking.journeyDate)}>{safeValue(booking.journeyDate)}</strong>
                      <small title={safeValue(booking.journeyTime)}>{safeValue(booking.journeyTime)}</small>
                    </div>

                    <div className="admin-table-cell" title={`Segment: ${safeValue(booking.from)} to ${safeValue(booking.to)} | ${booking.operator} | ${flightNumber}`}>
                      <strong title={`${safeValue(booking.from)} to ${safeValue(booking.to)}`}>
                        {safeValue(booking.from)} to {safeValue(booking.to)}
                      </strong>
                      <small title={`${booking.operator && booking.operator !== "--" ? `${booking.operator} | ` : ""}${flightNumber} | ${safeValue(booking.vehicleType)}`}>
                        {booking.operator && booking.operator !== "--" ? `${booking.operator} | ` : ""}
                        {flightNumber} | {safeValue(booking.vehicleType)}
                      </small>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`Status: ${safeValue(booking.status)}`}>
                      <span className={`admin-status-pill ${statusClass}`}>
                        {safeValue(booking.status)}
                      </span>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`PNR: ${safeValue(booking.pnr)}`}>
                      <strong title={safeValue(booking.pnr)}>{safeValue(booking.pnr)}</strong>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`Passenger: ${safeValue(booking.passengerName)} (${safeValue(booking.passengerPhone)})`}>
                      <strong title={safeValue(booking.passengerName)}>{safeValue(booking.passengerName)}</strong>
                      <small title={safeValue(booking.passengerPhone)}>{safeValue(booking.passengerPhone)}</small>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`Fare: CF ${adminCurrencyFormatter.format(fare)} | NF ${adminCurrencyFormatter.format(netFare)}`}>
                      <strong title={`Customer Fare: ${adminCurrencyFormatter.format(fare)}`}>CF {adminCurrencyFormatter.format(fare)}</strong>
                      <small title={`Net Fare: ${adminCurrencyFormatter.format(netFare)}`}>NF {adminCurrencyFormatter.format(netFare)}</small>
                    </div>

                    <div className="admin-table-cell admin-cell-centered" title={`Profit: ${adminCurrencyFormatter.format(profit)}`}>
                      <strong title={`Profit: ${adminCurrencyFormatter.format(profit)}`}>+ {adminCurrencyFormatter.format(profit)}</strong>
                    </div>

                    <div className="admin-table-cell admin-cell-centered">
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => setSelectedBooking(booking)}
                        title="View details"
                      >
                        View
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="admin-pagination-container">
              <span className="admin-pagination-info">
                Showing {startItem}-{endItem} of {totalItems} bookings
              </span>
              <div className="admin-pagination-controls">
                <button
                  type="button"
                  className="admin-pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  &lt; Previous
                </button>
                <span className="admin-pagination-page-num">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next &gt;
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="admin-table-empty">No flight bookings available.</div>
        )}

        <footer className="admin-flight-legend" style={{ borderTop: "1px solid var(--admin-border)", display: "flex", width: "100%", boxSizing: "border-box" }}>
          D :- Depart, R :- Return, B. By :- Booked By, CF :- Customer Fare, NF :- Net Fare, +/P :- Profit
        </footer>
      </section>

      {selectedBooking ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedBooking(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Flight booking details"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(950px, 95vw)", padding: "24px" }}
          >
            <header className="admin-view-header" style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "16px", marginBottom: "16px" }}>
              <div className="admin-view-header-main">
                <h2 style={{ fontSize: "1.4rem", margin: "0 0 6px" }}>Flight Booking Detail</h2>
                <p className="admin-view-header-subtitle" style={{ fontSize: "0.88rem", margin: 0 }}>
                  Booking ID: <strong>{safeValue(selectedBooking.id)}</strong> | Lead Passenger: <strong>{safeValue(selectedBooking.passengerName)}</strong>
                </p>
                <div className="admin-view-meta-row" style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <span
                    className={`admin-view-meta-chip ${resolveFlightStatusClass(
                      selectedBooking.status
                    )}`}
                  >
                    Status: {safeValue(selectedBooking.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Customer Fare: {adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Profit: {adminCurrencyFormatter.format(Number(selectedBooking.profit) || 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--admin-border)",
                  background: "var(--admin-soft)",
                  color: "var(--admin-primary)",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </header>

            {/* Section 1: Flight & Route Information */}
            <div className="admin-view-section-title">
              Flight & Route Information
            </div>
            <section className="admin-view-grid" style={{ padding: "0 0 16px", borderBottom: "1px solid var(--admin-border)" }}>
              <div>
                <span>Trip Type</span>
                <strong>{safeValue(selectedBooking.tripType)}</strong>
              </div>
              <div>
                <span>Booking ID</span>
                <strong>{safeValue(selectedBooking.id)}</strong>
              </div>
              <div>
                <span>PNR / Reference</span>
                <strong>{safeValue(selectedBooking.pnr)}</strong>
              </div>
              <div>
                <span>Booking Date</span>
                <strong>{safeValue(selectedBooking.createdAt)}</strong>
              </div>
              <div>
                <span>Segment (Route)</span>
                <strong>
                  {safeValue(selectedBooking.from)} to {safeValue(selectedBooking.to)}
                </strong>
              </div>
              <div>
                <span>Journey Date & Time</span>
                <strong>
                  {safeValue(selectedBooking.journeyDate)} | {safeValue(selectedBooking.journeyTime)}
                </strong>
              </div>
              <div>
                <span>Airline / Carrier</span>
                <strong>{safeValue(selectedBooking.operator)}</strong>
              </div>
              <div>
                <span>Travel Class</span>
                <strong>{safeValue(selectedBooking.vehicleType)}</strong>
              </div>
            </section>

            {/* Section 2: Contact Information */}
            <div className="admin-view-section-title" style={{ marginTop: "16px" }}>
              Contact Information
            </div>
            <section className="admin-view-grid" style={{ padding: "0 0 16px", borderBottom: "1px solid var(--admin-border)" }}>
              <div>
                <span>Lead Passenger</span>
                <strong>{safeValue(selectedBooking.passengerName)}</strong>
              </div>
              <div>
                <span>Passenger Phone</span>
                <strong>{safeValue(selectedBooking.passengerPhone)}</strong>
              </div>
              <div>
                <span>Passenger Email</span>
                <strong>{safeValue(selectedBooking.passengerEmail, "Not Provided")}</strong>
              </div>
            </section>

            {/* Section 3: Passenger Details List */}
            {selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
              <div className="admin-view-passengers-section" style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "20px" }}>
                <div className="admin-view-section-title" style={{ marginTop: "16px" }}>
                  Passenger List ({selectedBooking.passengers.length})
                </div>
                <div className="admin-view-passengers-list">
                  {selectedBooking.passengers.map((p, pIdx) => (
                    <div key={`p-${pIdx}`} className="admin-view-passenger-row">
                      <div className="p-info">
                        <span className="p-num">{pIdx + 1}.</span>
                        <strong>{p.fullName || "Name Not Available"}</strong>
                        <span className="p-type-chip">{p.passengerType || "Adult"}</span>
                      </div>
                      <div className="p-meta">
                        {p.gender && <span>Gender: <strong>{p.gender}</strong></span>}
                        {p.seatNumber && <span className="p-seat">Seat: {p.seatNumber}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Cancellation Request Details */}
            {selectedBooking.status === "Cancelled" && (
              <div className="admin-view-cancellation-section" style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "20px" }}>
                <div className="admin-view-section-title" style={{ marginTop: "16px", color: "var(--admin-danger)" }}>
                  Cancellation Information
                </div>
                <div className="admin-view-cancellation-card">
                  <div>
                    <span>Reason</span>
                    <strong>{selectedBooking.cancellationReason || "No reason specified"}</strong>
                  </div>
                  {selectedBooking.cancelledAtValue && (
                    <div>
                      <span>Cancellation Date</span>
                      <strong>{toDateKey(selectedBooking.cancelledAtValue)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Financial Summary Breakdown */}
            <div className="admin-view-section-title" style={{ marginTop: "16px" }}>
              Financial Summary Breakdown
            </div>
            <section className="admin-view-highlight-grid" style={{ marginTop: "8px" }}>
              <div className="admin-view-highlight-card">
                <span>Customer Fare (CF)</span>
                <strong>
                  {adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}
                </strong>
              </div>
              <div className="admin-view-highlight-card net-fare">
                <span>Net Fare (NF)</span>
                <strong>
                  {adminCurrencyFormatter.format(resolveNetFare(selectedBooking))}
                </strong>
              </div>
              <div className="admin-view-highlight-card profit">
                <span>Calculated Profit</span>
                <strong>
                  {adminCurrencyFormatter.format(Number(selectedBooking.profit) || 0)}
                </strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}


