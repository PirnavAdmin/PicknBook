/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./FlightCancelRequestList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";
import { Filter, Download } from "lucide-react";
import { useAdminList } from "../../../utils/adminPortalStorage";
import AdminPagination from "../../../components/AdminPagination";

const safeValue = (val, fallback = "--") =>
  val !== undefined && val !== null && val !== "" ? val : fallback;

const toNumberDate = (rawDate) => {
  if (!rawDate) return 0;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_FILTERS = {
  bookingId: "",
  pnr: "",
  customer: "",
  passengerPhone: "",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
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

const formatAdminDate = (dateString) => {
  if (!dateString || dateString === "--" || dateString === "N/A" || String(dateString).startsWith("0001")) return "--";
  try {
    const raw = String(dateString).trim();
    if (raw.startsWith("0001-01-01")) return "--";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

const formatRequestDate = (dateString) => {
  if (!dateString || dateString === "--") return "--";
  try {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return formatAdminDate(dateString);
    }
    const dateFormatted = formatAdminDate(dateString);
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${dateFormatted}, ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return formatAdminDate(dateString);
  }
};

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

  const segment = String(pickFirst(record, ["segment", "Segment"], "") || "");
  const [fromCityFallback, toCityFallback] = segment.includes(" - ")
    ? segment.split(" - ").map((s) => s.trim())
    : ["", ""];

  return {
    id: pickFirst(record, ["id", "Id"], null),
    bookingId: pickFirst(record, ["bookingId", "BookingId", "id", "Id"], null),
    bookingReference: String(
      pickFirst(record, ["bookingReference", "BookingReference", "pnr", "PNR"], "") ||
      pickFirst(record, ["id", "Id"], "") || ""
    ),
    tripType: String(
      pickFirst(record, ["tripType", "TripType"], "Flight") || "Flight"
    ),
    tripId: pickFirst(record, ["tripId", "TripId"], null),
    passengerName: String(
      pickFirst(record, ["passengerName", "PassengerName", "customer", "Customer"], "") || ""
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
    fromCity: String(pickFirst(record, ["fromCity", "FromCity"], fromCityFallback) || fromCityFallback),
    toCity: String(pickFirst(record, ["toCity", "ToCity"], toCityFallback) || toCityFallback),
    providerName: String(
      pickFirst(record, ["providerName", "ProviderName", "airline", "Airline"], "") ||
        ""
    ),
    departureTimeUtc: pickFirst(
      record,
      [
        "departureTimeUtc",
        "DepartureTimeUtc",
        "departureDateTimeUtc",
        "DepartureDateTimeUtc",
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
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr", "CustomerRefundAmountInr", "customerRefundAmountInr"], 0)) || 0,
    status: String(
      pickFirst(record, ["status", "Status", "cancellationStatus", "CancellationStatus", "CancelStatus", "cancelStatus"], null) ||
      pickFirst(record?.RefundDetails, ["CancellationStatus", "cancellationStatus", "CancelStatus", "cancelStatus"], "Unknown") ||
      "Unknown"
    ),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc", "requestDateUtc", "RequestDateUtc"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc", "requestDateUtc", "RequestDateUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason", "remark", "Remark"], "") || ""
    ),
    cancellationCharge: Number(
      pickFirst(record, ["cancellationCharge", "CancellationCharge", "CustomerCancellationChargeInr", "customerCancellationChargeInr", "AdminCancellationChargeInr", "adminCancellationChargeInr"], null) ??
      pickFirst(record?.RefundDetails, ["cancellationCharge", "CancellationCharge"], 0)
    ) || 0,
    refundAmount: Number(
      pickFirst(record, ["refundAmount", "RefundAmount", "CustomerRefundAmountInr", "customerRefundAmountInr"], null) ??
      pickFirst(record?.RefundDetails, ["refundAmount", "RefundAmount"], 0)
    ) || 0,
    details: pickFirst(record, ["details", "Details"], null),
    tripNumber: String(
      pickFirst(
        record,
        ["tripNumber", "TripNumber", "flightNumber", "FlightNumber"],
        ""
      ) || ""
    ),
    passengers,
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

function resolveAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const adminToken = String(window.localStorage.getItem("adminToken") || "").trim();
    if (adminToken && adminToken !== "undefined" && adminToken !== "null") {
      return adminToken;
    }
    return normalizeText(window.localStorage.getItem("token"), "");
  } catch {
    return "";
  }
}

async function requestJson(urlOrPath, options = {}) {
  const resolvedUserId = resolveCurrentUserId(options.userId);
  const resolvedToken = resolveAuthToken();
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

async function listAdminCancellations({ passengerPhone } = {}) {
  const url = buildUrl("/api/admin/flight/cancellations", {
    passengerPhone,
  });

  try {
    const data = await requestJson(url, { method: "GET" });
    return Array.isArray(data)
      ? data.map((record) => normalizeFlightBookingRecord(record))
      : [];
  } catch (error) {
    console.warn("Backend 500 error fetching flight cancellations:", error);
    return [];
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
  if (key === "approved" || key === "completed" || key === "refunded") return "status-approved";
  if (key === "rejected" || key === "cancelled") return "status-rejected";
  return "status-pending";
};

export default function AdminFlightCancellationRequestListPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [selectedCancellation, setSelectedCancellation] = useState(null);
  const [cancellationRequests, setCancellationRequests] = useAdminList(
    "flight-cancellation-requests",
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadCancellationRequests = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");

    const passengerPhone = String(activeFilters.passengerPhone || "").trim() || undefined;

    try {
      const flightResults = await listAdminCancellations({
        passengerPhone,
      });

      const mapped = flightResults
        .map((record) => {
          const status = toAdminStatusLabel(record?.status || record?.details?.cancellationStatus);
          const bookingReference = normalizeText(record?.bookingReference || record?.id, "");
          const bookingId = normalizeText(record?.bookingId || record?.id, "");
          const tripNumber = normalizeText(record?.tripNumber, "");
          const bookedAtValue = record?.requestDateUtc || record?.bookedAtUtc || record?.cancelledAtUtc || null;
          const departureValue = record?.departureTimeUtc || null;
          const rawPayload = record?.raw || record || {};
          const rawDetails = record?.details || record?.Details || rawPayload?.details || rawPayload?.Details || {};

          const fare = Math.max(parseNumber(record?.totalPriceInr, 0), 0);
          const inferredProfit = Math.round(fare * 0.04);
          const profit = parseNumber(record?.profit, inferredProfit);

          const customerRefundAmountInr = parseNumber(
            record?.customerRefundAmountInr ?? record?.CustomerRefundAmountInr ?? rawDetails?.customerRefundAmountInr ?? record?.refundAmount,
            0
          );
          const adminRefundAmountInr = parseNumber(
            record?.adminRefundAmountInr ?? record?.AdminRefundAmountInr ?? rawDetails?.adminRefundAmountInr,
            0
          );

          const customerCancellationChargeInr = parseNumber(
            rawDetails?.customerCancellationChargeInr ?? record?.cancellationCharge,
            0
          );
          const adminCancellationChargeInr = parseNumber(
            rawDetails?.adminCancellationChargeInr,
            0
          );
          const customerServiceChargeInr = parseNumber(
            rawDetails?.customerServiceChargeInr,
            0
          );
          const adminServiceChargeInr = parseNumber(
            rawDetails?.adminServiceChargeInr,
            0
          );

          const customerRefundStatus = String(
            rawDetails?.customerRefundStatus || record?.customerRefundStatus || record?.status || "Pending"
          );
          const adminRefundStatus = String(
            rawDetails?.adminRefundStatus || record?.adminRefundStatus || "Pending"
          );

          const customerRemark = String(
            rawDetails?.customerRemark || record?.customerRemark || record?.remark || record?.cancellationReason || ""
          );
          const supplierRemark = String(
            rawDetails?.supplierRemark || record?.supplierRemark || ""
          );
          const adminRemark = String(
            rawDetails?.adminRemark || record?.adminRemark || ""
          );

          const segment = String(record?.segment || "").trim();
          const [fromFallback, toFallback] = segment.includes(" - ")
            ? segment.split(" - ").map(s => s.trim())
            : (segment.includes("➔") ? segment.split("➔").map(s => s.trim()) : ["", ""]);

          return {
            id: bookingReference || bookingId || record?.id || "--",
            bookingId: bookingId || record?.id || "--",
            bookingReference,
            tripType: "Flight",
            createdAt: toDateKey(bookedAtValue),
            createdAtValue: bookedAtValue,
            requestDateUtc: bookedAtValue,
            bookedAtUtc: record?.bookedAtUtc || record?.bookingDate || rawDetails?.bookedAtUtc || null,
            passengerName: normalizeText(record?.passengerName || record?.customer, "--"),
            passengerPhone: normalizeText(record?.passengerPhone, "--"),
            passengerEmail: normalizeText(record?.passengerEmail, ""),
            from: normalizeText(record?.fromCity || fromFallback, "--"),
            to: normalizeText(record?.toCity || toFallback, "--"),
            segment: segment || (fromFallback && toFallback ? `${fromFallback} - ${toFallback}` : "--"),
            journeyDate: toDateKey(departureValue),
            journeyTime: toTimeKey(departureValue),
            pnr: bookingReference || tripNumber || bookingId || String(record?.id || "--"),
            status,
            cancellationStatus: String(rawDetails?.cancellationStatus || record?.status || "Pending"),
            operator: normalizeText(record?.providerName, "Flight Airlines"),
            vehicleType: normalizeText(record?.travelClass, "Economy"),
            fare,
            profit,
            paymentMethod: record?.paymentMethod || rawPayload?.paymentMethod || rawPayload?.paymentType || rawPayload?.gatewayName || "--",
            paymentDetails: record?.paymentDetails || rawPayload?.transactionId || rawPayload?.txnId || rawPayload?.paymentId || "--",
            paymentStatus: record?.paymentStatus || rawPayload?.paymentStatus || "Completed",
            cancellationReason: customerRemark || normalizeText(record?.cancellationReason, ""),
            cancelledAtValue: record?.cancelledAtUtc || record?.requestDateUtc || null,
            customerRefundAmountInr,
            adminRefundAmountInr,
            customerCancellationChargeInr,
            adminCancellationChargeInr,
            customerServiceChargeInr,
            adminServiceChargeInr,
            customerRefundStatus,
            adminRefundStatus,
            customerRemark,
            supplierRemark,
            adminRemark,
            mainRemark: String(record?.remark || rawDetails?.remark || ""),
            details: rawDetails,
            raw: record,
          };
        })
        .filter((record) => {
          const isCancelReq = Boolean(record?.raw?.details || record?.raw?.Details || record?.raw?.id || record?.raw?.Id);
          return isCancelReq || mapAdminStatusClass(record.status) === "cancelled";
        })
        .map((unifiedBooking) => {
          const fare = Math.max(parseNumber(unifiedBooking?.fare, 0), 0);
          const raw = unifiedBooking?.raw || {};

          const customerRefundAmountInr = unifiedBooking.customerRefundAmountInr;
          const adminRefundAmountInr = unifiedBooking.adminRefundAmountInr;
          const customerCancellationChargeInr = unifiedBooking.customerCancellationChargeInr;
          const adminCancellationChargeInr = unifiedBooking.adminCancellationChargeInr;
          const customerServiceChargeInr = unifiedBooking.customerServiceChargeInr;
          const adminServiceChargeInr = unifiedBooking.adminServiceChargeInr;

          const cancellationChargeRaw = parseNumber(
            customerCancellationChargeInr || (raw.cancellationCharge ?? raw.CancellationCharge ?? raw?.RefundDetails?.CancellationCharge ?? unifiedBooking.cancellationCharge),
            0
          );
          const refundAmountRaw = parseNumber(
            customerRefundAmountInr || (raw.refundAmount ?? raw.RefundAmount ?? raw?.RefundDetails?.RefundAmount ?? unifiedBooking.refundAmount),
            0
          );

          const cancellationCharge = Number.isFinite(cancellationChargeRaw)
            ? Math.max(cancellationChargeRaw, 0)
            : Math.round(fare * 0.18);

          const refundAmount = Number.isFinite(refundAmountRaw)
            ? Math.max(refundAmountRaw, 0)
            : Math.max(fare - cancellationCharge, 0);

          // Profit Calculation (+ or - amount)
          // Difference between refund amounts and charge margins
          const calculatedProfit = (adminRefundAmountInr - customerRefundAmountInr) +
            (customerCancellationChargeInr - adminCancellationChargeInr) +
            (customerServiceChargeInr - adminServiceChargeInr) ||
            unifiedBooking.profit || 0;

          return {
            ...unifiedBooking,
            cancellationCharge,
            refundAmount,
            calculatedProfit,
          };
        })
        .sort((first, second) => {
          const firstTime = toNumberDate(
            first.cancelledAtValue || first.createdAtValue || first.createdAt
          );
          const secondTime = toNumberDate(
            second.cancelledAtValue || second.createdAtValue || second.createdAt
          );
          return secondTime - firstTime;
        });

      setCancellationRequests(mapped);
    } catch (error) {
      console.warn("Backend fetch failed or server off, setting empty list", error);
      setCancellationRequests([]);
      setErrorMessage("");
    } finally {
      setIsLoading(false);
    }
  }, [setCancellationRequests]);

  useEffect(() => {
    loadCancellationRequests(filters);
  }, [filters, loadCancellationRequests]);

  const [showRawJsonModal, setShowRawJsonModal] = useState(false);

  const handleUpdatePaymentStatus = (bookingId, newStatus) => {
    setCancellationRequests((prev) =>
      prev.map((c) => (c.bookingId === bookingId ? { ...c, paymentStatus: newStatus } : c))
    );
    if (selectedCancellation && selectedCancellation.bookingId === bookingId) {
      setSelectedCancellation((prev) => ({ ...prev, paymentStatus: newStatus }));
    }
  };

  const formatProfitDisplay = (amount) => {
    const num = Number(amount) || 0;
    const absFormatted = adminCurrencyFormatter.format(Math.abs(num));
    if (num > 0) {
      return { text: `+${absFormatted}`, color: "#10b981", isPositive: true };
    } else if (num < 0) {
      return { text: `-${absFormatted}`, color: "#ef4444", isNegative: true };
    } else {
      return { text: `+${absFormatted}`, color: "#64748b", isZero: true };
    }
  };

  const filteredRequests = useMemo(() => {
    return cancellationRequests.filter((booking) => {
      if (filters.bookingId) {
        const query = filters.bookingId.toLowerCase();
        if (!String(booking.id || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.pnr) {
        const query = filters.pnr.toLowerCase();
        if (!String(booking.pnr || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.customer) {
        const query = filters.customer.toLowerCase();
        const lookup = `${booking.passengerName} ${booking.passengerEmail || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (filters.passengerPhone) {
        if (!String(booking.passengerPhone || "").includes(filters.passengerPhone)) {
          return false;
        }
      }

      return true;
    });
  }, [cancellationRequests, filters]);

  // Compute paginated data
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
    setCurrentPage(1);
  };

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const headers = [
      "id",
      "bookingDate",
      "requestDate",
      "segmentFrom",
      "segmentTo",
      "journeyDate",
      "pnr",
      "customerName",
      "customerPhone",
      "cancellationStatus",
      "customerRefundStatus",
      "adminRefundStatus",
      "customerRefundAmount",
      "adminRefundAmount",
      "customerCancellationCharge",
      "adminCancellationCharge",
      "calculatedProfit",
      "customerRemark",
      "supplierRemark",
      "adminRemark",
    ];

    const rows = filteredRequests.map((booking) => [
      booking.id,
      formatAdminDate(booking.bookedAtUtc),
      formatRequestDate(booking.requestDateUtc || booking.cancelledAtValue || booking.createdAtValue),
      booking.from,
      booking.to,
      `${booking.journeyDate} ${booking.journeyTime}`.trim(),
      booking.pnr,
      booking.passengerName,
      booking.passengerPhone,
      booking.cancellationStatus || booking.status,
      booking.customerRefundStatus,
      booking.adminRefundStatus,
      booking.customerRefundAmountInr,
      booking.adminRefundAmountInr,
      booking.customerCancellationChargeInr,
      booking.adminCancellationChargeInr,
      booking.calculatedProfit,
      booking.customerRemark,
      booking.supplierRemark,
      booking.adminRemark,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `admin-b2c-flight-cancellation-requests.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-cancel-page admin-flight-cancel-page">
      <header className="admin-b2c-header admin-flight-cancel-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Flight</span> Cancellation List
        </h1>
      </header>

      <div className="admin-toolbar-row admin-cancel-toolbar" style={{ marginBottom: "6px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Today Cancelled: {filteredRequests.filter(r => r.paymentStatus === "Completed" || r.cancellationStatus === "Completed").length}</span>
          <span className="admin-chip">Today Pending: {filteredRequests.filter(r => r.paymentStatus === "Pending" || r.cancellationStatus === "Pending").length}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredRequests.length}
          </span>
        </div>

        <div className="admin-actions-row admin-flight-cancel-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#A51C49',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={15} />
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
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters admin-cancel-filters">
          <label>
            <span>ID</span>
            <input
              type="text"
              placeholder="Search by booking id"
              value={draftFilters.bookingId}
              onChange={(event) => handleFilterChange("bookingId", event.target.value)}
            />
          </label>

          <label>
            <span>PNR</span>
            <input
              type="text"
              placeholder="Search by PNR"
              value={draftFilters.pnr}
              onChange={(event) => handleFilterChange("pnr", event.target.value)}
            />
          </label>

          <label>
            <span>Customer</span>
            <input
              type="text"
              placeholder="Search by customer"
              value={draftFilters.customer}
              onChange={(event) => handleFilterChange("customer", event.target.value)}
            />
          </label>

          <label>
            <span>Customer Phone</span>
            <input
              type="text"
              placeholder="Search by mobile"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleFilterChange("passengerPhone", event.target.value)}
            />
          </label>

          <div className="filters-actions admin-cancel-filter-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Reset
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-cancel-table-shell">
        <header className="admin-cancel-table-head admin-flight-cancel-table-head" style={{ gridTemplateColumns: "0.8fr 1.1fr 1.4fr 1.3fr 1.4fr 1.1fr 1.1fr 1fr 0.7fr" }}>
          <span>B. ID / B.D.</span>
          <span>Name</span>
          <span>Segment / Journey Date</span>
          <span>Timings</span>
          <span>PNR / R.F Status</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : paginatedRequests.length ? (
          <div className="admin-cancel-table-body">
            {paginatedRequests.map((booking) => {
              const profitInfo = formatProfitDisplay(booking.calculatedProfit);
              return (
                <article
                  key={`flight-cancel-${booking.id}-${booking.createdAt}`}
                  className="admin-cancel-table-row admin-flight-cancel-table-row"
                  style={{ gridTemplateColumns: "0.8fr 1.1fr 1.4fr 1.3fr 1.4fr 1.1fr 1.1fr 1fr 0.7fr" }}
                >
                  <div className="admin-cancel-cell admin-cell-centered">
                    <strong>#{safeValue(booking.id)}</strong>
                  </div>

                  <div className="admin-cancel-cell">
                    <small style={{ display: "block", fontSize: "0.72rem", color: "#334155" }}>
                      <strong>B.D:</strong> {formatAdminDate(booking.bookedAtUtc)}
                    </small>
                    <small style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                      <strong>C.D:</strong> {formatRequestDate(booking.requestDateUtc || booking.cancelledAtValue)}
                    </small>
                  </div>

                  <div className="admin-cancel-cell">
                    <strong>{safeValue(booking.passengerName)}</strong>
                    {booking.passengerPhone && booking.passengerPhone !== "--" && (
                      <small>{booking.passengerPhone}</small>
                    )}
                  </div>

                  <div className="admin-cancel-cell">
                    <strong>
                      {safeValue(booking.from)} ➔ {safeValue(booking.to)}
                    </strong>
                    <small>
                      {safeValue(booking.journeyDate)}
                    </small>
                  </div>

                  <div className="admin-cancel-cell">
                    <strong>{safeValue(booking.pnr)}</strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.68rem", background: booking.customerRefundStatus === "Completed" ? "#dcfce7" : "#fef3c7", color: booking.customerRefundStatus === "Completed" ? "#15803d" : "#b45309", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                        Cust R.F: {safeValue(booking.customerRefundStatus)}
                      </span>
                      <span style={{ fontSize: "0.68rem", background: booking.adminRefundStatus === "Completed" ? "#e0f2fe" : "#f3f4f6", color: booking.adminRefundStatus === "Completed" ? "#0369a1" : "#4b5563", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                        Admin R.F: {safeValue(booking.adminRefundStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="admin-cancel-cell">
                    <strong>{safeValue(booking.operator || "Airline")}</strong>
                    <small>{safeValue(booking.vehicleType || "Flight")}</small>
                  </div>

                  <div className="admin-cancel-cell admin-cell-centered">
                    <strong>{adminCurrencyFormatter.format(booking.fare || 0)}</strong>
                    <small style={{ display: "block", color: "#10b981", fontSize: "0.7rem", fontWeight: "600" }}>
                      Cust Ref: {adminCurrencyFormatter.format(booking.customerRefundAmountInr || booking.refundAmount || 0)}
                    </small>
                    <small style={{ display: "block", color: "#0369a1", fontSize: "0.7rem" }}>
                      Admin Ref: {adminCurrencyFormatter.format(booking.adminRefundAmountInr || 0)}
                    </small>
                  </div>

                  <div className="admin-cancel-cell admin-cell-centered">
                    <strong style={{ color: profitInfo.color, fontSize: "0.92rem", fontWeight: "700" }}>
                      {profitInfo.text}
                    </strong>
                    <small style={{ display: "block", color: "#d97706", fontSize: "0.7rem", marginTop: "2px" }}>
                      Cust Chg: {adminCurrencyFormatter.format(booking.customerCancellationChargeInr || booking.cancellationCharge || 0)}
                    </small>
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.7rem" }}>
                      Admin Chg: {adminCurrencyFormatter.format(booking.adminCancellationChargeInr || 0)}
                    </small>
                  </div>

                  <div className="admin-cancel-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-cancel-view-btn"
                      onClick={() => {
                        setSelectedCancellation(booking);
                        setShowRawJsonModal(false);
                      }}
                    >
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-cancel-empty">No cancellation requests found.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredRequests.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="cancellations"
        />
      </section>

      {selectedCancellation ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Cancellation details"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(920px, 96vw)", padding: "20px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "var(--admin-text, #0f172a)" }}>
                  Flight Cancellation Details &amp; Response Data
                </h2>
                <p className="admin-view-header-subtitle">
                  Req ID: #{safeValue(selectedCancellation.id)} | PNR: {safeValue(selectedCancellation.pnr)} | Customer: <strong>{safeValue(selectedCancellation.passengerName)}</strong>
                </p>
                <div className="admin-view-meta-row">
                  <span className={`admin-view-meta-chip ${mapAdminStatusClass(selectedCancellation.status)}`}>
                    Status: {safeValue(selectedCancellation.cancellationStatus || selectedCancellation.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Cust R.F: {safeValue(selectedCancellation.customerRefundStatus)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Admin R.F: {safeValue(selectedCancellation.adminRefundStatus)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Calculated Profit: {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-view-close-btn"
                onClick={() => setSelectedCancellation(null)}
              >
                ✕
              </button>
            </header>

            {/* Section 1: General & Journey Details Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">General &amp; Request Details</h3>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Request ID</th>
                    <td>#{safeValue(selectedCancellation.id)}</td>
                    <th>PNR</th>
                    <td>{safeValue(selectedCancellation.pnr)}</td>
                  </tr>
                  <tr>
                    <th>Booking Date (B.D.)</th>
                    <td>{formatAdminDate(selectedCancellation.bookedAtUtc)}</td>
                    <th>Cancellation Request Date (C.D.)</th>
                    <td>{formatRequestDate(selectedCancellation.requestDateUtc || selectedCancellation.cancelledAtValue || selectedCancellation.createdAtValue)}</td>
                  </tr>
                  <tr>
                    <th>Cancellation Status</th>
                    <td>{safeValue(selectedCancellation.cancellationStatus || selectedCancellation.status)}</td>
                    <th>Customer Name</th>
                    <td>{safeValue(selectedCancellation.passengerName)}</td>
                  </tr>
                  <tr>
                    <th>Customer Contact</th>
                    <td>{safeValue(selectedCancellation.passengerPhone)} {selectedCancellation.passengerEmail ? `(${selectedCancellation.passengerEmail})` : ""}</td>
                    <th>Segment / Route</th>
                    <td>{safeValue(selectedCancellation.segment || `${selectedCancellation.from} ➔ ${selectedCancellation.to}`)}</td>
                  </tr>
                  <tr>
                    <th>Journey Date &amp; Time</th>
                    <td>{safeValue(selectedCancellation.journeyDate)} {selectedCancellation.journeyTime ? `at ${selectedCancellation.journeyTime}` : ""}</td>
                    <th>Airline / Vehicle Class</th>
                    <td>{safeValue(selectedCancellation.operator || "Flight Airlines")} ({safeValue(selectedCancellation.vehicleType || "Economy")})</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Financial & Refund Breakdown Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Financial &amp; Refund Breakdown</h3>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th>Refund Parameter</th>
                    <th>Amount (INR)</th>
                    <th>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Fare Amount</strong></td>
                    <td><strong>{adminCurrencyFormatter.format(selectedCancellation.fare || 0)}</strong></td>
                    <td>Total original ticket fare</td>
                  </tr>
                  <tr>
                    <td><strong>Customer Refund Amount</strong></td>
                    <td><strong style={{ color: "#10b981" }}>{adminCurrencyFormatter.format(selectedCancellation.customerRefundAmountInr || 0)}</strong></td>
                    <td>Refund credited to customer ({safeValue(selectedCancellation.customerRefundStatus)})</td>
                  </tr>
                  <tr>
                    <td><strong>Customer Cancellation Charge</strong></td>
                    <td><strong style={{ color: "#d97706" }}>{adminCurrencyFormatter.format(selectedCancellation.customerCancellationChargeInr || 0)}</strong></td>
                    <td>Cancellation fee charged to customer</td>
                  </tr>
                  <tr>
                    <td><strong>Customer Service Charge</strong></td>
                    <td>{adminCurrencyFormatter.format(selectedCancellation.customerServiceChargeInr || 0)}</td>
                    <td>Platform service charge</td>
                  </tr>
                  <tr>
                    <td><strong>Admin Refund Amount</strong></td>
                    <td><strong style={{ color: "#0369a1" }}>{adminCurrencyFormatter.format(selectedCancellation.adminRefundAmountInr || 0)}</strong></td>
                    <td>Refund received from airline/supplier ({safeValue(selectedCancellation.adminRefundStatus)})</td>
                  </tr>
                  <tr>
                    <td><strong>Admin Cancellation Charge</strong></td>
                    <td>{adminCurrencyFormatter.format(selectedCancellation.adminCancellationChargeInr || 0)}</td>
                    <td>Airline cancellation fee</td>
                  </tr>
                  <tr>
                    <td><strong>Admin Service Charge</strong></td>
                    <td>{adminCurrencyFormatter.format(selectedCancellation.adminServiceChargeInr || 0)}</td>
                    <td>Airline supplier service fee</td>
                  </tr>
                  <tr className="admin-view-highlight-row">
                    <td><strong>Calculated Net Profit / Loss</strong></td>
                    <td>
                      <strong style={{ color: formatProfitDisplay(selectedCancellation.calculatedProfit).color }}>
                        {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                      </strong>
                    </td>
                    <td>Net profit margin calculated on flight cancellation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Remarks & Cancellation Reason Notes */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Remarks &amp; Reason Notes</h3>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Customer Remark</th>
                    <td><em>"{safeValue(selectedCancellation.customerRemark || selectedCancellation.cancellationReason, "No customer remark provided")}"</em></td>
                  </tr>
                  <tr>
                    <th>Supplier Remark</th>
                    <td>{safeValue(selectedCancellation.supplierRemark, "--")}</td>
                  </tr>
                  <tr>
                    <th>Admin Remark</th>
                    <td>{safeValue(selectedCancellation.adminRemark, "--")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 4: Complete Response Data (Raw JSON) */}
            <div className="admin-view-section" style={{ background: "#1e293b", padding: "14px 16px", borderRadius: "8px", color: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase" }}>
                  Complete Response Data (Raw JSON)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRawJsonModal(prev => !prev)}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.76rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {showRawJsonModal ? "Hide Raw JSON" : "View Raw JSON"}
                </button>
              </div>
              {showRawJsonModal && (
                <pre
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "#0f172a",
                    color: "#38bdf8",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    overflowX: "auto",
                    maxHeight: "260px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}
                >
                  {JSON.stringify(selectedCancellation.raw || selectedCancellation, null, 2)}
                </pre>
              )}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}


