import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./FlightCancelRequestList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";
import { Filter, Download, Plus } from "lucide-react";
import { useAdminList } from "../../../utils/adminPortalStorage";
import AdminPagination from "../../../components/AdminPagination";
import {
  CancellationStatusBadge,
  RefundStatusBadge,
  RefundAmountDisplay,
  RefundActionButton,
} from "../../../utils/adminPortalUtils";
import {
  listAdminCancellations,
  updateAdminCancellation,
  createAdminCancellation,
} from "../../../services/flightBookingService";

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
  status: "ALL",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

function formatFlightTripType(booking) {
  const rawType = String(
    booking?.travelType ||
    booking?.tripType ||
    booking?.journeyType ||
    booking?.type ||
    booking?.details?.travelType ||
    booking?.details?.tripType ||
    booking?.raw?.travelType ||
    booking?.raw?.tripType ||
    booking?.raw?.details?.travelType ||
    booking?.raw?.details?.tripType ||
    ""
  ).trim().toLowerCase();

  if (rawType === "1" || rawType.includes("oneway") || rawType === "one-way" || rawType === "one way") {
    return "One-Way";
  }
  if (rawType === "2" || rawType.includes("roundtrip") || rawType === "round-trip" || rawType === "round trip") {
    return "Round-Trip";
  }
  if (rawType === "3" || rawType.includes("multicity") || rawType === "multi-city" || rawType === "multi city") {
    return "Multi-City";
  }

  const returnDate = booking?.returnDate || booking?.details?.returnDate || booking?.raw?.returnDate;
  if (returnDate && String(returnDate).trim() && String(returnDate) !== "N/A" && String(returnDate) !== "--") {
    return "Round-Trip";
  }

  const segment = String(booking?.segment || "").trim();
  if (segment && segment !== "--") {
    const parts = segment.split(/[-➔|>]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 2) {
      if (parts[0].toLowerCase() === parts[parts.length - 1].toLowerCase()) {
        return "Round-Trip";
      }
      return "Multi-City";
    }
  }

  return "One-Way";
}

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

  return "";
}

const FLIGHT_API_BASE_URL = "";

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

const formatSingleTimeAmPm = (timeStr) => {
  if (!timeStr || timeStr === "--" || timeStr === "00:00") return "";
  const raw = String(timeStr).trim();
  if (raw.startsWith("0001")) return "";

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
    if (parsed.getFullYear() <= 1) return "";
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }
  return "";
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

function extractListFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.$values)) return payload.$values;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.cancellations)) return payload.cancellations;
    if (Array.isArray(payload.cancellationRequests)) return payload.cancellationRequests;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.result)) return payload.result;
    if (Array.isArray(payload.value)) return payload.value;
    if (Array.isArray(payload.response)) return payload.response;
    if (Array.isArray(payload.payload)) return payload.payload;
  }
  return [];
}

const FALLBACK_CANCELLATION_REQUESTS = [];

const parseNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const parseBookingRefDate = (ref) => {
  if (!ref) return null;
  const match = String(ref).match(/FL-(\d{4})(\d{2})(\d{2})/i);
  if (match) {
    const [, yr, mo, dy] = match;
    return `${yr}-${mo}-${dy}`;
  }
  return null;
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
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Edit / Update Refund Form states
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Create Cancellation Record Form state
  const DEFAULT_CREATE_FORM = {
    flightReservationId: "",
    cancellationStatus: "Pending",
    customerRefundStatus: "Pending",
    adminRefundStatus: "Pending",
    customerRefundAmountInr: 0,
    customerCancellationChargeInr: 0,
    customerServiceChargeInr: 0,
    adminRefundAmountInr: 0,
    adminCancellationChargeInr: 0,
    adminServiceChargeInr: 0,
    supplierRemark: "",
    customerRemark: "",
    adminRemark: "",
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState("");
  const [createSuccessMsg, setCreateSuccessMsg] = useState("");

  const handleCreateCancellationRecord = async (e) => {
    e.preventDefault();
    if (!createForm.flightReservationId) {
      setCreateErrorMsg("Flight Reservation ID is required.");
      return;
    }

    setIsCreating(true);
    setCreateErrorMsg("");
    setCreateSuccessMsg("");

    try {
      await createAdminCancellation({
        flightReservationId: Number(createForm.flightReservationId),
        cancellationStatus: createForm.cancellationStatus,
        customerRefundStatus: createForm.customerRefundStatus,
        adminRefundStatus: createForm.adminRefundStatus,
        customerRefundAmountInr: Number(createForm.customerRefundAmountInr) || 0,
        customerCancellationChargeInr: Number(createForm.customerCancellationChargeInr) || 0,
        customerServiceChargeInr: Number(createForm.customerServiceChargeInr) || 0,
        adminRefundAmountInr: Number(createForm.adminRefundAmountInr) || 0,
        adminCancellationChargeInr: Number(createForm.adminCancellationChargeInr) || 0,
        adminServiceChargeInr: Number(createForm.adminServiceChargeInr) || 0,
        supplierRemark: createForm.supplierRemark || null,
        customerRemark: createForm.customerRemark || null,
        adminRemark: createForm.adminRemark || null,
      });

      setCreateSuccessMsg("Cancellation record created successfully!");
      loadCancellationRequests(filters);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateForm(DEFAULT_CREATE_FORM);
        setCreateSuccessMsg("");
      }, 1000);
    } catch (err) {
      setCreateErrorMsg(err?.message || "Failed to create cancellation record.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (selectedCancellation) {
      setEditForm({
        cancellationStatus: selectedCancellation.cancellationStatus || selectedCancellation.status || "Pending",
        customerRefundStatus: selectedCancellation.customerRefundStatus || "Pending",
        adminRefundStatus: selectedCancellation.adminRefundStatus || "Pending",
        customerRefundAmountInr: selectedCancellation.customerRefundAmountInr ?? 0,
        customerCancellationChargeInr: selectedCancellation.customerCancellationChargeInr ?? 0,
        customerServiceChargeInr: selectedCancellation.customerServiceChargeInr ?? 0,
        adminRefundAmountInr: selectedCancellation.adminRefundAmountInr ?? 0,
        adminCancellationChargeInr: selectedCancellation.adminCancellationChargeInr ?? 0,
        adminServiceChargeInr: selectedCancellation.adminServiceChargeInr ?? 0,
        supplierRemark: selectedCancellation.supplierRemark || "",
        customerRemark: selectedCancellation.customerRemark || selectedCancellation.cancellationReason || "",
        adminRemark: selectedCancellation.adminRemark || "",
      });
      setSaveSuccessMsg("");
      setSaveErrorMsg("");
    } else {
      setEditForm(null);
    }
  }, [selectedCancellation]);

  const handleSaveRefundUpdate = async () => {
    if (!selectedCancellation || !editForm) return;
    setIsSaving(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const payload = {
      cancellationStatus: editForm.cancellationStatus,
      customerRefundStatus: editForm.customerRefundStatus,
      adminRefundStatus: editForm.adminRefundStatus,
      customerRefundAmountInr: Number(editForm.customerRefundAmountInr) || 0,
      customerCancellationChargeInr: Number(editForm.customerCancellationChargeInr) || 0,
      customerServiceChargeInr: Number(editForm.customerServiceChargeInr) || 0,
      adminRefundAmountInr: Number(editForm.adminRefundAmountInr) || 0,
      adminCancellationChargeInr: Number(editForm.adminCancellationChargeInr) || 0,
      adminServiceChargeInr: Number(editForm.adminServiceChargeInr) || 0,
      supplierRemark: editForm.supplierRemark || null,
      customerRemark: editForm.customerRemark || null,
      adminRemark: editForm.adminRemark || null,
    };

    try {
      await updateAdminCancellation(selectedCancellation.id, payload);
      setSaveSuccessMsg(`Cancellation #${selectedCancellation.id} updated successfully!`);

      const custRef = payload.customerRefundAmountInr;
      const admRef = payload.adminRefundAmountInr;
      const custChg = payload.customerCancellationChargeInr;
      const admChg = payload.adminCancellationChargeInr;
      const custSvc = payload.customerServiceChargeInr;
      const admSvc = payload.adminServiceChargeInr;
      const newProfit = (admRef - custRef) + (custChg - admChg) + (custSvc - admSvc);

      const updatedRecord = {
        ...selectedCancellation,
        status: payload.cancellationStatus,
        cancellationStatus: payload.cancellationStatus,
        customerRefundStatus: payload.customerRefundStatus,
        adminRefundStatus: payload.adminRefundStatus,
        customerRefundAmountInr: custRef,
        adminRefundAmountInr: admRef,
        customerCancellationChargeInr: custChg,
        adminCancellationChargeInr: admChg,
        customerServiceChargeInr: custSvc,
        adminServiceChargeInr: admSvc,
        supplierRemark: payload.supplierRemark || "",
        customerRemark: payload.customerRemark || "",
        adminRemark: payload.adminRemark || "",
        calculatedProfit: newProfit,
      };

      setSelectedCancellation(updatedRecord);
      setCancellationRequests((prev) =>
        prev.map((c) => (String(c.id) === String(selectedCancellation.id) ? updatedRecord : c))
      );
    } catch (err) {
      setSaveErrorMsg(err?.message || "Failed to update cancellation request.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadCancellationRequests = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");

    const passengerPhone = String(activeFilters.passengerPhone || "").trim() || undefined;

    try {
      const flightResults = await listAdminCancellations({
        passengerPhone,
      });

      const recordsToProcess = Array.isArray(flightResults)
        ? flightResults
        : [];

      const mapped = recordsToProcess
        .map((record) => {
          const status = toAdminStatusLabel(record?.status || record?.details?.cancellationStatus);
          const cancelId = record?.id ?? record?.bookingId ?? "--";
          const bookingId = record?.bookingId ?? record?.id ?? null;
          const bookingReference = record?.bookingReference || record?.BookingReference || null;
          const pnr = record?.pnr || record?.PNR || null;
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

          const requestTime = formatSingleTimeAmPm(bookedAtValue);
          const rawJourneyDate =
            record?.journeyDateIst ||
            record?.journeyDate ||
            record?.travelDate ||
            record?.flightDate ||
            record?.departureTimeUtc ||
            record?.departureDate ||
            record?.departureTime ||
            rawDetails?.journeyDateIst ||
            rawDetails?.journeyDate ||
            rawDetails?.travelDate ||
            rawDetails?.flightDate ||
            rawDetails?.departureTimeUtc ||
            rawDetails?.departureDate ||
            parseBookingRefDate(bookingReference) ||
            record?.requestDateUtc ||
            record?.bookedAtUtc ||
            null;
          const isInvalidJd = !rawJourneyDate || String(rawJourneyDate).startsWith("0001");
          const journeyDate = isInvalidJd ? "--" : toDateKey(rawJourneyDate);
          const journeyTime = (!isInvalidJd && toTimeKey(rawJourneyDate)) ? formatSingleTimeAmPm(rawJourneyDate) : (requestTime || "--:--");

          return {
            id: cancelId,
            bookingId: bookingId,
            bookingReference: bookingReference,
            tripType: "Flight",
            createdAt: toDateKey(bookedAtValue),
            createdAtValue: bookedAtValue,
            requestDateUtc: bookedAtValue,
            bookedAtUtc: record?.bookedAtUtc || record?.bookingDate || rawDetails?.bookedAtUtc || null,
            passengerName: normalizeText(record?.customer || record?.passengerName || record?.passenger, "--"),
            passengerPhone: normalizeText(record?.customerPhone || record?.passengerPhone || record?.phone, "--"),
            passengerEmail: normalizeText(record?.customerEmail || record?.passengerEmail || record?.email, ""),
            from: normalizeText(record?.fromCity || fromFallback, "--"),
            to: normalizeText(record?.toCity || toFallback, "--"),
            segment: segment || (fromFallback && toFallback ? `${fromFallback} - ${toFallback}` : "--"),
            journeyDate,
            journeyTime,
            pnr: pnr,
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
          if (!record) return false;
          return true;
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
      setErrorMessage("");
    } catch (error) {
      console.warn("Backend fetch failed or server off:", error);
      setCancellationRequests([]);
      setErrorMessage(
        error?.message || "Server is offline or unreachable. Failed to fetch flight cancellations."
      );
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

  const mapRawCancellationRecord = (record) => {
    const status = toAdminStatusLabel(record?.status || record?.details?.cancellationStatus);
    const cancelId = record?.id ?? record?.bookingId ?? "--";
    const bookingId = record?.bookingId ?? record?.id ?? null;
    const bookingReference = record?.bookingReference || record?.BookingReference || null;
    const pnr = record?.pnr || record?.PNR || null;
    const bookedAtValue = record?.requestDateUtc || record?.bookedAtUtc || record?.cancelledAtUtc || null;
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

    const requestTime = formatSingleTimeAmPm(bookedAtValue);
    const rawJourneyDate =
      record?.journeyDateIst ||
      record?.journeyDate ||
      record?.travelDate ||
      record?.flightDate ||
      record?.departureTimeUtc ||
      record?.departureDate ||
      record?.departureTime ||
      rawDetails?.journeyDateIst ||
      rawDetails?.journeyDate ||
      rawDetails?.travelDate ||
      rawDetails?.flightDate ||
      rawDetails?.departureTimeUtc ||
      rawDetails?.departureDate ||
      parseBookingRefDate(bookingReference) ||
      record?.requestDateUtc ||
      record?.bookedAtUtc ||
      null;
    const isInvalidJd = !rawJourneyDate || String(rawJourneyDate).startsWith("0001");
    const journeyDate = isInvalidJd ? "--" : toDateKey(rawJourneyDate);
    const journeyTime = (!isInvalidJd && toTimeKey(rawJourneyDate)) ? formatSingleTimeAmPm(rawJourneyDate) : (requestTime || "--:--");

    const cancellationCharge = Number.isFinite(customerCancellationChargeInr) && customerCancellationChargeInr > 0
      ? customerCancellationChargeInr
      : Math.round(fare * 0.18);

    const refundAmount = Number.isFinite(customerRefundAmountInr) && customerRefundAmountInr > 0
      ? customerRefundAmountInr
      : Math.max(fare - cancellationCharge, 0);

    const calculatedProfit = (adminRefundAmountInr - customerRefundAmountInr) +
      (customerCancellationChargeInr - adminCancellationChargeInr) +
      (customerServiceChargeInr - adminServiceChargeInr) ||
      profit || 0;

    return {
      id: cancelId,
      bookingId: bookingId,
      bookingReference: bookingReference,
      pnr: pnr,
      tripType: "Flight",
      createdAt: toDateKey(bookedAtValue),
      createdAtValue: bookedAtValue,
      requestDateUtc: bookedAtValue,
      bookedAtUtc: record?.bookedAtUtc || record?.bookingDate || rawDetails?.bookedAtUtc || null,
      passengerName: normalizeText(record?.customer || record?.passengerName || record?.passenger, "--"),
      passengerPhone: normalizeText(record?.customerPhone || record?.passengerPhone || record?.phone, "--"),
      passengerEmail: normalizeText(record?.customerEmail || record?.passengerEmail || record?.email, ""),
      from: normalizeText(record?.fromCity || fromFallback, "--"),
      to: normalizeText(record?.toCity || toFallback, "--"),
      segment: segment || (fromFallback && toFallback ? `${fromFallback} - ${toFallback}` : "--"),
      journeyDate,
      journeyTime,
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
      cancellationCharge,
      refundAmount,
      calculatedProfit,
    };
  };

  const displayRequests = useMemo(() => {
    const rawList = Array.isArray(cancellationRequests) && cancellationRequests.length > 0
      ? cancellationRequests
      : FALLBACK_CANCELLATION_REQUESTS;

    return rawList.map((record) => (record?.raw ? record : mapRawCancellationRecord(record)));
  }, [cancellationRequests]);

  const filteredRequests = useMemo(() => {
    return displayRequests.filter((booking) => {
      if (filters.bookingId) {
        const query = filters.bookingId.trim().toLowerCase();
        if (!String(booking.id || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.pnr) {
        const query = filters.pnr.trim().toLowerCase();
        if (!String(booking.pnr || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.customer) {
        const query = filters.customer.trim().toLowerCase();
        const lookup = `${booking.passengerName} ${booking.passengerEmail || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (filters.passengerPhone) {
        const query = filters.passengerPhone.trim();
        if (!String(booking.passengerPhone || "").includes(query)) {
          return false;
        }
      }

      if (filters.status && filters.status !== "ALL") {
        const query = filters.status.trim().toLowerCase();
        const st = String(booking.customerRefundStatus || booking.cancellationStatus || booking.status || "").toLowerCase();
        if (!st.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [displayRequests, filters]);

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
    <section className="admin-b2c-page admin-booking-page admin-cancel-page admin-flight-cancel-page">
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

        <div className="admin-actions-row admin-flight-cancel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

          <label>
            <span>Status</span>
            <select
              value={draftFilters.status || "ALL"}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed / Refunded</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
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

      <section className="admin-table-shell">
        <header className="admin-table-head" style={{ gridTemplateColumns: "minmax(75px, 0.65fr) minmax(120px, 1.1fr) minmax(120px, 1.1fr) minmax(100px, 0.9fr) minmax(85px, 0.65fr) minmax(85px, 0.65fr) minmax(190px, 2.5fr) minmax(90px, 0.8fr) minmax(80px, 0.7fr)", minWidth: "1050px" }}>
          <span>C. ID / C.D.</span>
          <span>Passenger Details</span>
          <span>Segment / Journey Date</span>
          <span>PNR / Trip Type</span>
          <span>Cancellation Status</span>
          <span>Refund Status</span>
          <span>Refund Amount</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading cancellation records...</div>
        ) : paginatedRequests.length ? (
          <div className="admin-table-body">
            {paginatedRequests.map((booking) => {
              const profitInfo = formatProfitDisplay(booking.calculatedProfit);
              const cancellationStatus = booking.details?.cancellationStatus || booking.cancellationStatus || booking.status || "Pending";
              const customerRefundStatus = booking.details?.customerRefundStatus || booking.customerRefundStatus || (booking.customerRefundAmountInr === 0 ? "Completed" : "Pending");

              return (
                <article
                  key={`flight-cancel-${booking.id}-${booking.createdAt}`}
                  className="admin-table-row"
                  style={{ gridTemplateColumns: "minmax(75px, 0.65fr) minmax(120px, 1.1fr) minmax(120px, 1.1fr) minmax(100px, 0.9fr) minmax(85px, 0.65fr) minmax(85px, 0.65fr) minmax(190px, 2.5fr) minmax(90px, 0.8fr) minmax(80px, 0.7fr)", minWidth: "1050px" }}
                >
                  {/* Cell 1: C. ID / C.D. */}
                  <div className="admin-table-cell admin-cell-centered" style={{ cursor: "pointer" }} onClick={() => setSelectedCancellation(booking)}>
                    <strong style={{ fontSize: "0.68rem", color: "#A51C49", fontWeight: 700, wordBreak: "break-all" }}>#{safeValue(booking.id)}</strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(booking.requestDateUtc || booking.createdAtValue)}</span>
                    </div>
                  </div>

                  {/* Cell 2: Passenger Details */}
                  <div className="admin-table-cell admin-cell-centered">
                    <strong className="admin-name-text" style={{ color: "#000000", fontWeight: 800, fontSize: "0.76rem", display: "block", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                      {safeValue(booking.passengerName)}
                    </strong>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#475569" }}>
                      {safeValue(booking.passengerPhone)}
                    </small>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#64748b", fontSize: "0.68rem" }}>
                      {safeValue(booking.passengerEmail)}
                    </small>
                  </div>

                  {/* Cell 3: Segment / Journey Date */}
                  <div className="admin-table-cell admin-cell-centered">
                    <div className="admin-route-segment">
                      <span>{booking.from || booking.segment?.split("-")[0]?.trim()}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{booking.to || booking.segment?.split("-")[1]?.trim()}</span>
                    </div>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(booking.journeyDate)}</span>
                    </div>
                  </div>

                  {/* Cell 4: PNR / Trip Type */}
                  <div className="admin-table-cell admin-cell-centered">
                    <strong style={{ fontSize: "0.82rem", marginBottom: "2px" }}>{safeValue(booking.pnr)}</strong>
                    {(() => {
                      const tripTypeLabel = formatFlightTripType(booking);
                      const isRound = tripTypeLabel === "Round-Trip";
                      const isMulti = tripTypeLabel === "Multi-City";
                      return (
                        <span
                          style={{
                            padding: "1px 7px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            margin: "2px 0",
                            display: "inline-block",
                            backgroundColor: isRound ? "#fce7f3" : isMulti ? "#fef3c7" : "#e0f2fe",
                            color: isRound ? "#be185d" : isMulti ? "#b45309" : "#0369a1",
                          }}
                        >
                          {tripTypeLabel}
                        </span>
                      );
                    })()}
                    {(booking.ticketNumber || booking.ticketNo) && (booking.ticketNumber || booking.ticketNo) !== "N/A" && (booking.ticketNumber || booking.ticketNo) !== booking.pnr && (
                      <small style={{ display: "block", color: "#475569", fontWeight: "600", fontSize: "0.72rem", marginBottom: "3px" }}>
                        Tkt No: {booking.ticketNumber || booking.ticketNo}
                      </small>
                    )}
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.68rem" }}>
                      {booking.operator || "--"}
                    </small>
                  </div>

                  {/* Cell 5: Cancellation Status */}
                  <div className="admin-table-cell admin-cell-centered">
                    <CancellationStatusBadge status={cancellationStatus} />
                  </div>

                  {/* Cell 6: Refund Status */}
                  <div className="admin-table-cell admin-cell-centered">
                    <RefundStatusBadge status={customerRefundStatus} refundAmount={booking.customerRefundAmountInr} cancellationStatus={cancellationStatus} />
                  </div>

                  {/* Cell 7: Refund Amount */}
                  <div className="admin-table-cell admin-cell-centered" style={{ overflow: "visible" }}>
                    <RefundAmountDisplay amount={booking.customerRefundAmountInr} adminAmount={booking.adminRefundAmountInr} refundStatus={customerRefundStatus} />
                  </div>

                  {/* Cell 8: Calculated Profit */}
                  <div className="admin-table-cell admin-cell-centered" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      color: Number(booking.calculatedProfit) < 0 ? "#dc2626" : "#16a34a",
                      lineHeight: "1.2"
                    }}>
                      {Number(booking.calculatedProfit) < 0
                        ? `-₹${Math.abs(Number(booking.calculatedProfit)).toFixed(2)}`
                        : `₹${Number(booking.calculatedProfit || 0).toFixed(2)}`}
                    </span>
                    <span style={{
                      fontSize: "0.68rem",
                      color: "#64748b",
                      fontWeight: "500",
                      marginTop: "2px"
                    }}>
                      {Number(booking.calculatedProfit) < 0 ? "Loss" : "Profit"}
                    </span>
                  </div>

                  {/* Cell 9: Action */}
                  <div className="admin-table-cell admin-cell-centered">
                    <RefundActionButton
                      refundStatus={customerRefundStatus}
                      refundAmount={booking.customerRefundAmountInr}
                      onClick={() => setSelectedCancellation(booking)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-table-empty">
            {errorMessage || "No records found."}
          </div>
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
          <div
            className="admin-view-card"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(900px, 95vw)", padding: "20px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="admin-view-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  Flight Cancellation Detail View
                </h3>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Req ID: <strong>#{safeValue(selectedCancellation.id)}</strong> | PNR: <strong>{safeValue(selectedCancellation.pnr)}</strong> | Ref: <strong>{safeValue(selectedCancellation.bookingReference)}</strong>
                </div>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip">
                    Status: {safeValue(selectedCancellation.cancellationStatus || selectedCancellation.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Customer Fare: {adminCurrencyFormatter.format(selectedCancellation.fare || 0)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Refund Amount: {adminCurrencyFormatter.format(selectedCancellation.customerRefundAmountInr || 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-view-close-btn"
                onClick={() => setSelectedCancellation(null)}
                title="Close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* GENERAL & JOURNEY DETAILS TABLE */}
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ color: "#A51C49", fontSize: "0.88rem", fontWeight: "700", margin: "12px 0 8px 0" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> GENERAL & JOURNEY DETAILS
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <tbody>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px", width: "22%" }}>Cancellation ID</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", width: "28%" }}>#{safeValue(selectedCancellation.id)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px", width: "22%" }}>Booking Reference</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", width: "28%" }}>{safeValue(selectedCancellation.bookingReference)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>PNR</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{safeValue(selectedCancellation.pnr)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Request Date (C.D.)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{formatRequestDate(selectedCancellation.requestDateUtc || selectedCancellation.cancelledAtValue || selectedCancellation.createdAtValue)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Cancellation Status</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>
                      {(() => {
                        const st = String(selectedCancellation.customerRefundStatus || selectedCancellation.cancellationStatus || selectedCancellation.status || "").toLowerCase();
                        let cls = "pending";
                        if (st.includes("refund") || st.includes("approv")) cls = "refunded";
                        else if (st.includes("complet")) cls = "completed";
                        else if (st.includes("cancel") || st.includes("reject")) cls = "cancelled";
                        return (
                          <span className={`admin-status-pill ${cls}`}>
                            {safeValue(selectedCancellation.customerRefundStatus || selectedCancellation.cancellationStatus || selectedCancellation.status)}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Segment / Route</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{safeValue(selectedCancellation.segment || `${selectedCancellation.from} ➔ ${selectedCancellation.to}`)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Journey Date (J.d)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{formatAdminDate(selectedCancellation.journeyDate)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Airline &amp; Class</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.operator || "Flight Airlines"} ({selectedCancellation.vehicleType || "Economy"})</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Customer Name</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{safeValue(selectedCancellation.passengerName)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Phone Number (P.no)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{safeValue(selectedCancellation.passengerPhone)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Customer Email</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{safeValue(selectedCancellation.passengerEmail)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Booked By</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>B2C Customer</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FINANCIAL & FARE BREAKDOWN TABLE */}
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ color: "#A51C49", fontSize: "0.88rem", fontWeight: "700", margin: "12px 0 8px 0" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> FINANCIAL & FARE BREAKDOWN
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#A51C49", color: "#ffffff", fontWeight: "700" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Fare Parameter</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Amount (INR)</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Total Fare</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700" }}>{adminCurrencyFormatter.format(selectedCancellation.fare || 0)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Total fare charged to customer</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Customer Refund Amount</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#10b981" }}>{adminCurrencyFormatter.format(selectedCancellation.customerRefundAmountInr || 0)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Refund credited to customer ({safeValue(selectedCancellation.customerRefundStatus)})</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Customer Cancellation Charge</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#d97706" }}>{adminCurrencyFormatter.format(selectedCancellation.customerCancellationChargeInr || 0)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Cancellation fee charged to customer</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Admin Refund Amount</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#0369a1" }}>{adminCurrencyFormatter.format(selectedCancellation.adminRefundAmountInr || 0)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Refund received from airline ({safeValue(selectedCancellation.adminRefundStatus)})</td>
                  </tr>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700" }}>Calculated Profit / Loss</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: formatProfitDisplay(selectedCancellation.calculatedProfit).color }}>
                      {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                    </td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#10b981", fontWeight: "700" }}>Profit</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* REFUND & FEE MANAGEMENT FORM */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginTop: "16px", background: "#ffffff" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#A51C49", fontWeight: "700" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> REFUND & FEE MANAGEMENT FORM
              </h4>

              {saveSuccessMsg && (
                <div style={{ background: "#dcfce7", color: "#15803d", padding: "8px 12px", borderRadius: "6px", fontSize: "0.80rem", fontWeight: "600", marginBottom: "10px" }}>
                  ✓ {saveSuccessMsg}
                </div>
              )}
              {saveErrorMsg && (
                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: "6px", fontSize: "0.80rem", fontWeight: "600", marginBottom: "10px" }}>
                  ⚠️ {saveErrorMsg}
                </div>
              )}

              {editForm && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Cancellation Status</label>
                    <select
                      value={editForm.cancellationStatus}
                      onChange={(e) => setEditForm(prev => ({ ...prev, cancellationStatus: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Refund Status</label>
                    <select
                      value={editForm.customerRefundStatus}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerRefundStatus: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Completed">Completed</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Refund Status</label>
                    <select
                      value={editForm.adminRefundStatus}
                      onChange={(e) => setEditForm(prev => ({ ...prev, adminRefundStatus: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Refund Amt (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.customerRefundAmountInr}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerRefundAmountInr: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Cancel Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.customerCancellationChargeInr}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerCancellationChargeInr: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Refund Amt (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.adminRefundAmountInr}
                      onChange={(e) => setEditForm(prev => ({ ...prev, adminRefundAmountInr: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Remark</label>
                    <input
                      type="text"
                      placeholder="e.g. Processed refund to customer"
                      value={editForm.adminRemark}
                      onChange={(e) => setEditForm(prev => ({ ...prev, adminRemark: e.target.value }))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setShowRawJsonModal(prev => !prev)}
                      style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                    >
                      {showRawJsonModal ? "Hide Raw JSON" : "View Raw JSON"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveRefundUpdate}
                      style={{ padding: "6px 16px", borderRadius: "6px", border: "none", background: "#10b981", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                    >
                      {isSaving ? "Saving..." : "Save Refund Update"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showRawJsonModal && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#0f172a", color: "#38bdf8", borderRadius: "6px", fontSize: "0.78rem", maxHeight: "200px", overflowY: "auto" }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedCancellation.raw || selectedCancellation, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal: Create Admin Cancellation Record */}
      {isCreateModalOpen ? (
        <div className="admin-view-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Create Flight Cancellation Record"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(780px, 94vw)", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "var(--admin-text, #0f172a)" }}>
                  Create Flight Cancellation Record
                </h2>
                <p className="admin-view-header-subtitle" style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
                  POST /api/admin/flight/cancellations — Manually create a cancellation record linked to a booking.
                </p>
              </div>
              <button
                type="button"
                className="admin-view-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </header>

            {createSuccessMsg && (
              <div style={{ background: "#dcfce7", color: "#15803d", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", marginBottom: "14px" }}>
                ✓ {createSuccessMsg}
              </div>
            )}
            {createErrorMsg && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", marginBottom: "14px" }}>
                ⚠ {createErrorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCancellationRecord} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Flight Reservation ID <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1234"
                    value={createForm.flightReservationId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, flightReservationId: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Cancellation Status
                  </label>
                  <select
                    value={createForm.cancellationStatus}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, cancellationStatus: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Customer Refund Status
                  </label>
                  <select
                    value={createForm.customerRefundStatus}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, customerRefundStatus: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Processing">Processing</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Admin Refund Status
                  </label>
                  <select
                    value={createForm.adminRefundStatus}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, adminRefundStatus: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Processing">Processing</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Financial Charges & Amounts */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#0f172a", fontWeight: "700" }}>
                  Financial Breakdown (INR ₹)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Cust. Refund Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.customerRefundAmountInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, customerRefundAmountInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Cust. Cancel Charge</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.customerCancellationChargeInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, customerCancellationChargeInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Cust. Service Charge</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.customerServiceChargeInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, customerServiceChargeInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Admin Refund Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.adminRefundAmountInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, adminRefundAmountInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Admin Cancel Charge</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.adminCancellationChargeInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, adminCancellationChargeInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>Admin Service Charge</label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.adminServiceChargeInr}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, adminServiceChargeInr: e.target.value }))}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#334155" }}>Customer Remark</label>
                  <input
                    type="text"
                    placeholder="Customer reason"
                    value={createForm.customerRemark}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, customerRemark: e.target.value }))}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#334155" }}>Supplier Remark</label>
                  <input
                    type="text"
                    placeholder="Airline remark"
                    value={createForm.supplierRemark}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, supplierRemark: e.target.value }))}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#334155" }}>Admin Remark</label>
                  <input
                    type="text"
                    placeholder="Internal admin note"
                    value={createForm.adminRemark}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, adminRemark: e.target.value }))}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: "8px 18px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#ffffff", fontWeight: "600", cursor: isCreating ? "wait" : "pointer" }}
                >
                  {isCreating ? "Saving..." : "Create Cancellation Record"}
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}


