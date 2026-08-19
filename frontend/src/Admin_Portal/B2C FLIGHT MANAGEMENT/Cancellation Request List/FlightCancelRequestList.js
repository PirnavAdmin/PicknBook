/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./FlightCancelRequestList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import AdminPagination from "../../../components/AdminPagination";

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
  "https://satin-eastcoast-musky.ngrok-free.dev";
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

  return {
    bookingId: pickFirst(record, ["bookingId", "BookingId"], null),
    bookingReference: String(
      pickFirst(record, ["bookingReference", "BookingReference"], "") || ""
    ),
    tripType: String(
      pickFirst(record, ["tripType", "TripType"], "Flight") || "Flight"
    ),
    tripId: pickFirst(record, ["tripId", "TripId"], null),
    passengerName: String(
      pickFirst(record, ["passengerName", "PassengerName"], "") || ""
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
    fromCity: String(pickFirst(record, ["fromCity", "FromCity"], "") || ""),
    toCity: String(pickFirst(record, ["toCity", "ToCity"], "") || ""),
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
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Unknown") || "Unknown"),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
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

  if (CANCELLED_STATUS_SET.has(key) || key.includes("cancel") || key.includes("failed")) {
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

const formatRequestDate = (statusValue) => {
  if (!statusValue) return "--";
  const parsed = new Date(statusValue);

  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toNumberDate = (val) => {
  if (!val) return 0;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const safeValue = (value, fallback = "--") => {
  if (value === undefined || value === null) return fallback;
  const str = String(value).trim();
  return str ? str : fallback;
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
          const status = toAdminStatusLabel(record?.status);
          const bookingReference = normalizeText(record?.bookingReference, "");
          const bookingId = normalizeText(record?.bookingId, "");
          const tripNumber = normalizeText(record?.tripNumber, "");
          const bookedAtValue = record?.bookedAtUtc || null;
          const departureValue = record?.departureTimeUtc || null;
          const rawPayload = record?.raw || record || {};

          const fare = Math.max(parseNumber(record?.totalPriceInr, 0), 0);
          const inferredProfit = Math.round(fare * 0.04);
          const profit = parseNumber(record?.profit, inferredProfit);

          return {
            id: bookingReference || bookingId || "--",
            bookingId,
            bookingReference,
            tripType: "Flight",
            createdAt: toDateKey(bookedAtValue),
            createdAtValue: bookedAtValue,
            passengerName: normalizeText(record?.passengerName, "--"),
            passengerPhone: normalizeText(record?.passengerPhone, "--"),
            passengerEmail: normalizeText(record?.passengerEmail, ""),
            from: normalizeText(record?.fromCity, "--"),
            to: normalizeText(record?.toCity, "--"),
            journeyDate: toDateKey(departureValue),
            journeyTime: toTimeKey(departureValue),
            pnr: bookingReference || tripNumber || bookingId || "--",
            status,
            operator: normalizeText(record?.providerName, "--"),
            vehicleType: normalizeText(record?.travelClass, "Flight"),
            fare,
            profit,
            paymentMethod: record?.paymentMethod || rawPayload?.paymentMethod || rawPayload?.paymentType || rawPayload?.gatewayName || "--",
            paymentDetails: record?.paymentDetails || rawPayload?.transactionId || rawPayload?.txnId || rawPayload?.paymentId || "--",
            paymentStatus: record?.paymentStatus || rawPayload?.paymentStatus || "Completed",
            cancellationReason: normalizeText(record?.cancellationReason, ""),
            cancelledAtValue: record?.cancelledAtUtc || null,
            raw: record,
          };
        })
        .filter((record) => mapAdminStatusClass(record.status) === "cancelled")
        .map((unifiedBooking) => {
          const fare = Math.max(parseNumber(unifiedBooking?.fare, 0), 0);
          const raw = unifiedBooking?.raw || {};

          const cancellationChargeRaw = parseNumber(
            raw.cancellationCharge ?? raw.CancellationCharge,
            Number.NaN
          );
          const refundAmountRaw = parseNumber(raw.refundAmount ?? raw.RefundAmount, Number.NaN);

          const cancellationCharge = Number.isFinite(cancellationChargeRaw)
            ? Math.max(cancellationChargeRaw, 0)
            : Math.round(fare * 0.18);

          const refundAmount = Number.isFinite(refundAmountRaw)
            ? Math.max(refundAmountRaw, 0)
            : Math.max(fare - cancellationCharge, 0);

          return {
            ...unifiedBooking,
            cancellationCharge,
            refundAmount,
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

      if (mapped.length > 0) {
        setCancellationRequests(mapped);
      }
    } catch (error) {
      console.warn("Backend fetch failed, falling back to dynamic local storage data", error);
    } finally {
      setIsLoading(false);
    }
  }, [setCancellationRequests]);

  useEffect(() => {
    loadCancellationRequests(filters);
  }, [filters, loadCancellationRequests]);

  const handleUpdatePaymentStatus = (bookingId, newStatus) => {
    setCancellationRequests((prev) =>
      prev.map((c) => (c.bookingId === bookingId ? { ...c, paymentStatus: newStatus } : c))
    );
    if (selectedCancellation && selectedCancellation.bookingId === bookingId) {
      setSelectedCancellation((prev) => ({ ...prev, paymentStatus: newStatus }));
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
      "requestDate",
      "segmentFrom",
      "segmentTo",
      "journeyDate",
      "pnr",
      "customerName",
      "customerPhone",
      "status",
      "customerRefundAmount",
      "adminCancellationCharge",
      "paymentMethod",
      "paymentDetails",
      "paymentStatus",
      "remark",
    ];

    const rows = filteredRequests.map((booking) => [
      booking.id,
      formatRequestDate(booking.cancelledAtValue || booking.createdAtValue),
      booking.from,
      booking.to,
      `${booking.journeyDate} ${booking.journeyTime}`.trim(),
      booking.pnr,
      booking.passengerName,
      booking.passengerPhone,
      booking.status,
      booking.refundAmount,
      booking.cancellationCharge,
      booking.paymentMethod,
      booking.paymentDetails,
      booking.paymentStatus,
      booking.cancellationReason,
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
      <header className="admin-b2c-header admin-cancel-header admin-flight-cancel-header">
        <h1 className="admin-flight-cancel-title" style={{ fontWeight: 500 }}>
          <span style={{ color: "#be185d", fontWeight: 700 }}>B2C Flight </span>
          <span style={{ color: "black" }}>Cancellation List</span>
        </h1>
      </header>

      <div className="admin-toolbar-row admin-cancel-toolbar">
        <div className="admin-chip-row">
          <span className="admin-chip admin-cancel-chip">
            Cancelled Records: {filteredRequests.length}
          </span>
        </div>

        <div className="admin-actions-row admin-flight-cancel-actions">
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
        <header className="admin-cancel-table-head admin-flight-cancel-table-head" style={{ gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.8fr" }}>
          <span>Id &amp; Request Date</span>
          <span>Segment</span>
          <span>Customer</span>
          <span>B2B Amount</span>
          <span>Admin Amount</span>
          <span>Payment Info</span>
          <span>Payment Status</span>
          <span>Remark</span>
          <span>Details</span>
        </header>

        {isLoading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : paginatedRequests.length ? (
          <div className="admin-cancel-table-body">
            {paginatedRequests.map((booking) => (
              <article
                key={`flight-cancel-${booking.id}-${booking.createdAt}`}
                className="admin-cancel-table-row admin-flight-cancel-table-row"
                style={{ gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.8fr" }}
              >
                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.id)}</strong>
                  <small>
                    {formatRequestDate(booking.cancelledAtValue || booking.createdAtValue)}
                  </small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>
                    {safeValue(booking.from)} to {safeValue(booking.to)}
                  </strong>
                  <small>
                    {safeValue(booking.journeyDate)} | {safeValue(booking.journeyTime)}
                  </small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.passengerName)}</strong>
                  <small>{safeValue(booking.passengerPhone)}</small>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <strong>CRA {adminCurrencyFormatter.format(booking.refundAmount)}</strong>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <strong>CCC {adminCurrencyFormatter.format(booking.cancellationCharge)}</strong>
                </div>

                <div className="admin-cancel-cell">
                  <strong>Method:</strong> {safeValue(booking.paymentMethod)}
                  <small style={{ wordBreak: "break-all" }}><strong>Txn:</strong> {safeValue(booking.paymentDetails)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <select
                    value={booking.paymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(booking.bookingId, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      backgroundColor: booking.paymentStatus === "Completed" ? "#ecfdf5" : "#fffbeb",
                      color: booking.paymentStatus === "Completed" ? "#10b981" : "#d97706",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.cancellationReason, "--")}</strong>
                  <small>PNR {safeValue(booking.pnr)}</small>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => setSelectedCancellation(booking)}
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-cancel-empty">not found any record.</div>
        )}

        {filteredRequests.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="cancellations"
          />
        )}

        <footer className="admin-flight-cancel-footnote">
          <strong>RD :-</strong> Request Date, <strong>CS :-</strong> Cancellation Status,
          <strong> CRS :-</strong> Customer Refund Status, <strong>ARS :-</strong> Admin
          Refund Status, <strong>CRA :-</strong> Customer Refund Amount, <strong>CCC :-</strong>{" "}
          Customer Cancellation Charge, <strong>CSC :-</strong> Customer Service Charge,
          <strong> ARA :-</strong> Admin Refund Amount, <strong>ACC :-</strong> Admin
          Cancellation Charge, <strong>ASC :-</strong> Admin Service Charge, <strong>SR :-</strong>{" "}
          Supplier Remark, <strong>CR :-</strong> Customer Remark, <strong>AR :-</strong>{" "}
          Admin Remark
        </footer>
      </section>

      {selectedCancellation ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Cancellation details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Cancellation Request Detail</h2>
                <p className="admin-view-header-subtitle">
                  {safeValue(selectedCancellation.id)} |{" "}
                  {safeValue(selectedCancellation.passengerName)}
                </p>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip cancelled">Cancelled</span>
                  <span className="admin-view-meta-chip">
                    CRA{" "}
                    {adminCurrencyFormatter.format(
                      Number(selectedCancellation.refundAmount) || 0
                    )}
                  </span>
                  <span className="admin-view-meta-chip">
                    CCC{" "}
                    {adminCurrencyFormatter.format(
                      Number(selectedCancellation.cancellationCharge) || 0
                    )}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCancellation(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Request Date</span>
                <strong>
                  {formatRequestDate(
                    selectedCancellation.cancelledAtValue || selectedCancellation.createdAtValue
                  )}
                </strong>
              </div>
              <div>
                <span>PNR</span>
                <strong>{safeValue(selectedCancellation.pnr)}</strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{safeValue(selectedCancellation.passengerName)}</strong>
              </div>
              <div>
                <span>Customer Phone</span>
                <strong>{safeValue(selectedCancellation.passengerPhone)}</strong>
              </div>
              <div>
                <span>Segment</span>
                <strong>
                  {safeValue(selectedCancellation.from)} to {safeValue(selectedCancellation.to)}
                </strong>
              </div>
              <div>
                <span>Journey Date &amp; Time</span>
                <strong>
                  {safeValue(selectedCancellation.journeyDate)} |{" "}
                  {safeValue(selectedCancellation.journeyTime)}
                </strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{safeValue(selectedCancellation.paymentMethod)}</strong>
              </div>
              <div>
                <span>Payment Details (Txn)</span>
                <strong>{safeValue(selectedCancellation.paymentDetails)}</strong>
              </div>
              <div>
                <span>Payment Status</span>
                <select
                  value={selectedCancellation.paymentStatus}
                  onChange={(e) => handleUpdatePaymentStatus(selectedCancellation.bookingId, e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1.5px solid var(--border)",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="admin-view-highlight-card">
                <span>Customer Refund Amount</span>
                <strong>
                  {adminCurrencyFormatter.format(Number(selectedCancellation.refundAmount) || 0)}
                </strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Customer Cancellation Charge</span>
                <strong>
                  {adminCurrencyFormatter.format(
                    Number(selectedCancellation.cancellationCharge) || 0
                  )}
                </strong>
              </div>
              <div>
                <span>Remark</span>
                <strong>{safeValue(selectedCancellation.cancellationReason, "--")}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

