import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import "./FlightSearchHistory.css";
import AdminPagination from "../../../components/AdminPagination";

const DEFAULT_FILTERS = {
  query: "",
  customerName: "",
  fromDate: "",
  toDate: "",
  searchFromDate: "",
  searchToDate: "",
};

const PAGE_SIZE = 100;

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const SEARCH_HISTORY_STORAGE_KEY = "user_search_history_logs";

function normalizeCount(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
}

function readRawSearchHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRawSearchHistory(records) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors.
  }
}

function readSearchHistoryEntries({ searchType } = {}) {
  const typeFilter = normalizeText(searchType, "").toLowerCase();

  return readRawSearchHistory()
    .map((record) => ({
      id: normalizeText(record?.id, ""),
      searchType: normalizeText(record?.searchType, "Bus"),
      searchDateUtc: normalizeText(record?.searchDateUtc, ""),
      departDate: normalizeText(record?.departDate, ""),
      fromCity: normalizeText(record?.fromCity, ""),
      toCity: normalizeText(record?.toCity, ""),
      fromCityCode: normalizeText(record?.fromCityCode, ""),
      toCityCode: normalizeText(record?.toCityCode, ""),
      travelType: normalizeText(record?.travelType, ""),
      adultCount: normalizeCount(record?.adultCount),
      childCount: normalizeCount(record?.childCount),
      infantCount: normalizeCount(record?.infantCount),
      customerName: normalizeText(record?.customerName, "No Login"),
      customerId: normalizeText(record?.customerId, "0"),
      resultsCount: Number(record?.resultsCount) || 0,
    }))
    .filter((record) => {
      if (!record.id || !record.searchDateUtc) {
        return false;
      }

      if (!typeFilter) {
        return true;
      }

      return record.searchType.toLowerCase() === typeFilter;
    });
}

function clearSearchHistoryEntries({ searchType } = {}) {
  const typeFilter = normalizeText(searchType, "").toLowerCase();

  if (!typeFilter) {
    writeRawSearchHistory([]);
    return;
  }

  const remaining = readRawSearchHistory().filter((record) => {
    const recordType = normalizeText(record?.searchType, "").toLowerCase();
    return recordType !== typeFilter;
  });

  writeRawSearchHistory(remaining);
}

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

export function parseSegments(segmentsJson) {
  if (!segmentsJson) return [];
  try {
    const raw = typeof segmentsJson === "string" ? JSON.parse(segmentsJson) : segmentsJson;
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => ({
      segmentIndex: item.SegmentIndex ?? item.segmentIndex ?? (idx + 1),
      origin: item.Origin ?? item.origin ?? "",
      originCity: item.OriginCity ?? item.originCity ?? item.Origin ?? item.origin ?? "",
      destination: item.Destination ?? item.destination ?? "",
      destinationCity: item.DestinationCity ?? item.destinationCity ?? item.Destination ?? item.destination ?? "",
      departureDate: item.DepartureDate ?? item.departureDate ?? "",
      flightCabinClass: item.FlightCabinClass ?? item.flightCabinClass ?? "1",
    }));
  } catch (err) {
    console.error("Failed to parse segmentsJson:", err);
    return [];
  }
}

function formatTripType(typeVal, typeNameVal) {
  const nameStr = String(typeNameVal ?? "").trim();
  if (nameStr) {
    if (nameStr.toLowerCase().includes("round")) return "RoundTrip";
    if (nameStr.toLowerCase().includes("multi")) return "MultiCity";
    if (nameStr.toLowerCase().includes("one")) return "OneWay";
    return nameStr;
  }

  const str = String(typeVal ?? "").trim();
  if (str === "1" || str.toLowerCase() === "oneway") return "OneWay";
  if (str === "2" || str.toLowerCase() === "roundtrip") return "RoundTrip";
  if (str === "3" || str.toLowerCase() === "multicity") return "MultiCity";
  return "OneWay";
}

function getTripTypeBadge(tripTypeName, tripType) {
  const formatted = formatTripType(tripType, tripTypeName);
  switch (formatted) {
    case "RoundTrip":
      return { label: "Round Trip", color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd", icon: "⇄" };
    case "MultiCity":
      return { label: "Multi-City", color: "#6b21a8", bg: "#f3e8ff", border: "#e9d5ff", icon: "➔➔" };
    default:
      return { label: "One Way", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0", icon: "➔" };
  }
}

function getCabinClassName(classCode) {
  const code = String(classCode ?? "1").trim();
  switch (code) {
    case "1": return "Economy";
    case "2": return "Premium Economy";
    case "3": return "Business";
    case "4": return "First Class";
    default: return `Class ${code}`;
  }
}

function normalizeFlightSearchHistoryRecord(record, index = 0) {
  const isGuest = Boolean(
    pickFirst(record, ["isGuest", "IsGuest"], false) ||
    (!pickFirst(record, ["userId", "UserId"]) && !pickFirst(record, ["customerId", "CustomerId"]))
  );

  const rawUserId = pickFirst(record, ["userId", "UserId", "customerId", "CustomerId"], null);
  const endUserIp = String(pickFirst(record, ["endUserIp", "EndUserIp"], "") || "");
  const traceId = String(pickFirst(record, ["traceId", "TraceId"], "") || "");

  const userOrGuestId = String(
    pickFirst(
      record,
      ["userOrGuestId", "UserOrGuestId"],
      isGuest
        ? `Guest ${endUserIp ? `(${endUserIp})` : ""}`.trim()
        : `User #${rawUserId || index + 1}`
    ) || ""
  );

  const rawTripType = pickFirst(
    record,
    ["tripType", "TripType", "travelType", "TravelType", "journeyType", "JourneyType", "type", "Type"],
    "1"
  );

  const rawTripTypeName = pickFirst(
    record,
    ["tripTypeName", "TripTypeName", "travelTypeName", "TravelTypeName"],
    ""
  );

  const tripTypeName = formatTripType(rawTripType, rawTripTypeName);

  const fromCity = String(
    pickFirst(
      record,
      ["fromCity", "FromCity", "from", "From", "origin", "Origin", "fromAirport", "FromAirport"],
      ""
    ) || ""
  );

  const toCity = String(
    pickFirst(
      record,
      ["toCity", "ToCity", "to", "To", "destination", "Destination", "toAirport", "ToAirport"],
      ""
    ) || ""
  );

  const fromCityName = String(
    pickFirst(
      record,
      ["fromCityName", "FromCityName", "originCity", "OriginCity"],
      ""
    ) || ""
  );

  const toCityName = String(
    pickFirst(
      record,
      ["toCityName", "ToCityName", "destinationCity", "DestinationCity"],
      ""
    ) || ""
  );

  const fromCityCode = String(
    pickFirst(
      record,
      ["fromCityCode", "FromCityCode", "fromCode", "FromCode", "originCode", "OriginCode"],
      fromCity
    ) || fromCity
  );

  const toCityCode = String(
    pickFirst(
      record,
      ["toCityCode", "ToCityCode", "toCode", "ToCode", "destinationCode", "DestinationCode"],
      toCity
    ) || toCity
  );

  const routeSummary = pickFirst(record, ["routeSummary", "RouteSummary"], null);
  const segmentsJson = pickFirst(record, ["segmentsJson", "SegmentsJson", "segments", "Segments"], null);

  const searchDateUtc = pickFirst(
    record,
    [
      "searchedAtIst",
      "SearchedAtIst",
      "searchedAtUtc",
      "SearchedAtUtc",
      "searchDateUtc",
      "SearchDateUtc",
      "createdAtUtc",
      "CreatedAtUtc",
      "searchDate",
      "SearchDate",
      "createdAt",
      "CreatedAt",
      "searchedAt",
      "SearchedAt",
    ],
    null
  );

  const departDate = pickFirst(
    record,
    [
      "departDate",
      "DepartDate",
      "departureDate",
      "DepartureDate",
      "journeyDate",
      "JourneyDate",
      "travelDate",
      "TravelDate",
      "date",
      "Date",
    ],
    null
  );

  const returnDate = pickFirst(record, ["returnDate", "ReturnDate"], null);

  return {
    id:
      pickFirst(
        record,
        ["id", "Id", "searchId", "SearchId", "flightSearchId", "FlightSearchId"],
        null
      ) || `search-${index + 1}`,
    isGuest,
    userId: rawUserId ? String(rawUserId) : null,
    userOrGuestId,
    endUserIp,
    traceId,
    searchDateUtc,
    searchedAtIst: pickFirst(record, ["searchedAtIst", "SearchedAtIst"], null),
    departDate,
    returnDate,
    fromCity: fromCityCode || fromCity,
    toCity: toCityCode || toCity,
    fromCityName: fromCityName || fromCityCode || fromCity,
    toCityName: toCityName || toCityCode || toCity,
    fromCityCode,
    toCityCode,
    routeSummary,
    segmentsJson: typeof segmentsJson === "object" ? JSON.stringify(segmentsJson) : segmentsJson,
    tripType: String(rawTripType || "1"),
    tripTypeName,
    customerName: String(
      pickFirst(
        record,
        [
          "customerName",
          "CustomerName",
          "userName",
          "UserName",
          "passengerName",
          "PassengerName",
        ],
        ""
      ) || userOrGuestId
    ),
    customerId: rawUserId ? String(rawUserId) : (isGuest ? "Guest" : "0"),
    travelType: tripTypeName,
    adultCount:
      Number(
        pickFirst(record, ["adults", "Adults", "adultCount", "AdultCount"], 0)
      ) || 0,
    childCount:
      Number(
        pickFirst(record, ["children", "Children", "childCount", "ChildCount"], 0)
      ) || 0,
    infantCount:
      Number(
        pickFirst(record, ["infants", "Infants", "infantCount", "InfantCount"], 0)
      ) || 0,
    searchType: "Flight",
    raw: record,
  };
}

function extractArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates = [
    payload.data,
    payload.items,
    payload.records,
    payload.results,
    payload.value,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      const nestedCandidates = [
        candidate.data,
        candidate.items,
        candidate.records,
        candidate.results,
        candidate.value,
      ];

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate;
        }
      }
    }
  }

  return [];
}

function isLikelyHtmlResponse(payload) {
  if (typeof payload !== "string") {
    return false;
  }

  const text = payload.toLowerCase();
  return (
    text.includes("<!doctype html") ||
    text.includes("<html") ||
    text.includes("cannot get") ||
    text.includes("not found")
  );
}

function shouldTryNextSearchHistoryEndpoint(error) {
  const status = Number(error?.status);
  if (Number.isFinite(status) && status === 404) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("cannot get") || message.includes("not found") || message.includes("404");
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
    return normalizeText(
      window.localStorage.getItem("adminToken") ||
      window.localStorage.getItem("authToken") ||
      window.localStorage.getItem("token"),
      ""
    );
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

const CANDIDATE_BASE_URLS = [
  ""
];

const CANDIDATE_ENDPOINTS = [
  "/api/admin/flight-search-logs",
  "/api/admin/flight/searches",
  "/api/admin/flight/search-history",
  `${FLIGHT_BOOKINGS_ROOT}/admin/search-history`,
  `${FLIGHT_BOOKINGS_ROOT}/admin/searches`,
  `${FLIGHT_BOOKINGS_ROOT}/admin/flight-search-history`,
  `${FLIGHT_BOOKINGS_ROOT}/admin/search_history`,
  `${FLIGHT_BOOKINGS_ROOT}/admin/flight_search_history`,
  `${FLIGHT_BOOKINGS_ROOT}/search-history`,
  `${FLIGHT_BOOKINGS_ROOT}/searches`,
  `${FLIGHT_BOOKINGS_ROOT}/flight-search-history`,
];

async function listAdminFlightSearchHistory({
  query,
  customerName,
  fromDate,
  toDate,
  limit = 500,
} = {}) {
  let lastError = null;

  for (const endpoint of CANDIDATE_ENDPOINTS) {
    for (const baseUrl of CANDIDATE_BASE_URLS) {
      const fullPath = baseUrl
        ? `${baseUrl.replace(/\/+$/, "")}${endpoint}`
        : endpoint;

      const url = buildUrl(fullPath, {
        query,
        customerName,
        fromDate,
        toDate,
        limit,
      });

      try {
        const payload = await requestJson(url, { method: "GET" });
        if (isLikelyHtmlResponse(payload)) {
          throw new Error("Received HTML response page");
        }
        const records = extractArrayPayload(payload);
        if (Array.isArray(records)) {
          return records.map((record, index) =>
            normalizeFlightSearchHistoryRecord(record, index)
          );
        }
      } catch (error) {
        lastError = error;
        if (!shouldTryNextSearchHistoryEndpoint(error)) {
          // Fallback to next url/endpoint candidate
        }
      }
    }
  }

  if (lastError && !shouldTryNextSearchHistoryEndpoint(lastError)) {
    throw lastError;
  }

  return [];
}

const parseUtcDate = (value) => {
  if (!value) return new Date("");
  let str = String(value).trim();
  // If the date string has a time portion (contains ':') but lacks timezone offset information,
  // we append 'Z' to explicitly parse it as a UTC/GMT timestamp.
  if (str.includes(":") && !str.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(" ", "T") + "Z";
  }
  return new Date(str);
};

const toDateValue = (value) => {
  const parsed = parseUtcDate(value);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getTime();
};

const formatSearchTime = (value) => {
  const parsed = parseUtcDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const formatSearchDate = (value) => {
  const parsed = parseUtcDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).replace(/\//g, "-");
};

const formatDepartDateParts = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return { dayMonth: "--", year: "" };
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return {
    dayMonth: `${day}-${month}-${year}`,
    year: "",
  };
};

function mapLocalSearchRecord(record, index = 0) {
  return normalizeFlightSearchHistoryRecord({
    ...record,
    id: record?.id || `local-flight-search-${index + 1}`,
    isLocalFallback: true,
  }, index);
}

function mergeSearchHistory(apiRecords, localRecords) {
  const byKey = new Map();

  [...apiRecords, ...localRecords].forEach((record, index) => {
    const normalizedRecord = normalizeFlightSearchHistoryRecord(record, index);
    if (record?.isLocalFallback) {
      normalizedRecord.isLocalFallback = true;
    }

    const key = normalizedRecord.id ? String(normalizedRecord.id) : `search-row-${index + 1}`;
    if (!byKey.has(key)) {
      byKey.set(key, normalizedRecord);
    }
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const left = toDateValue(a.searchDateUtc);
    const right = toDateValue(b.searchDateUtc);
    return right - left;
  });
}

function buildSegmentLabel(record) {
  if (record?.routeSummary && String(record.routeSummary).trim()) {
    return String(record.routeSummary).trim();
  }

  const fromCode = normalizeText(record?.fromCityCode || record?.fromCity, "--");
  const toCode = normalizeText(record?.toCityCode || record?.toCity, "--");

  if (record?.tripTypeName === "RoundTrip" || record?.tripType === "2") {
    return `${fromCode} \u21C4 ${toCode}`;
  }

  return `${fromCode} \u27A4 ${toCode}`;
}

function buildCityNamesLabel(record) {
  const fromName = normalizeText(record?.fromCityName, "");
  const toName = normalizeText(record?.toCityName, "");

  if (!fromName && !toName) return "";
  if (fromName === record?.fromCityCode && toName === record?.toCityCode) return "";

  if (record?.tripTypeName === "RoundTrip" || record?.tripType === "2") {
    return `${fromName} \u21C4 ${toName}`;
  }

  return `${fromName} \u27A4 ${toName}`;
}

function formatPassengerCounts(record) {
  const adultCount = Number(record?.adultCount);
  const childCount = Number(record?.childCount);
  const infantCount = Number(record?.infantCount);

  if (
    record?.isLocalFallback &&
    !Number.isFinite(adultCount) &&
    !Number.isFinite(childCount) &&
    !Number.isFinite(infantCount)
  ) {
    return "Adult - --, Child - --, Infant - --";
  }

  return `Adult - ${Number.isFinite(adultCount) ? adultCount : 0}, Child - ${Number.isFinite(childCount) ? childCount : 0
    }, Infant - ${Number.isFinite(infantCount) ? infantCount : 0}`;
}

export default function AdminFlightSearchHistoryPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [historyRows, setHistoryRows] = useState([]);
  const [deletedRecordIds, setDeletedRecordIds] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadSearchHistory = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    let apiRows = [];
    let apiError = "";

    try {
      apiRows = await listAdminFlightSearchHistory({
        query: activeFilters.query,
        customerName: activeFilters.customerName,
        fromDate: activeFilters.fromDate,
        toDate: activeFilters.toDate,
        limit: 500,
      });
    } catch (error) {
      apiError = normalizeText(error?.message, "Unable to load flight search history.");
    }

    const localRows = apiError
      ? readSearchHistoryEntries({ searchType: "Flight" }).map((record, index) =>
        mapLocalSearchRecord(record, index)
      )
      : [];
    const mergedRows = mergeSearchHistory(apiRows, localRows);
    setHistoryRows(mergedRows);

    if (apiError && mergedRows.length > 0) {
      setInfoMessage("Unable to load live search history. Showing local search history backup.");
    } else if (apiError) {
      setErrorMessage(apiError);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSearchHistory(filters);
  }, [filters, loadSearchHistory]);

  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get("highlightId");

  useEffect(() => {
    if (highlightId && historyRows.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.backgroundColor = "#fef08a";
          el.style.transition = "background-color 1s ease";
          setTimeout(() => {
            el.style.backgroundColor = "transparent";
          }, 3000);
        }
      }, 350);
    }
  }, [location.search, highlightId, historyRows]);

  useEffect(() => {
    setActivePage(1);
  }, [filters, deletedRecordIds.length]);

  const filteredRows = useMemo(() => {
    const queryValue = normalizeText(filters.query, "").toLowerCase();
    const customerNameValue = normalizeText(filters.customerName, "").toLowerCase();
    const fromDateValue = filters.fromDate ? toDateValue(filters.fromDate) : Number.NaN;
    const toDateValueMs = filters.toDate
      ? toDateValue(filters.toDate) + 24 * 60 * 60 * 1000 - 1
      : Number.NaN;
    const searchFromDateValue = filters.searchFromDate ? toDateValue(filters.searchFromDate) : Number.NaN;
    const searchToDateValueMs = filters.searchToDate
      ? toDateValue(filters.searchToDate) + 24 * 60 * 60 * 1000 - 1
      : Number.NaN;
    const deletedIdSet = new Set(deletedRecordIds);

    return historyRows.filter((record) => {
      if (deletedIdSet.has(record.id)) {
        return false;
      }

      if (queryValue) {
        const searchText = `${record.id} ${record.fromCity} ${record.toCity} ${record.customerName} ${record.userOrGuestId} ${record.endUserIp}`.toLowerCase();
        if (!searchText.includes(queryValue)) {
          return false;
        }
      }

      if (customerNameValue) {
        if (!String(record.customerName || "").toLowerCase().includes(customerNameValue) &&
            !String(record.userOrGuestId || "").toLowerCase().includes(customerNameValue)) {
          return false;
        }
      }

      const departValue = toDateValue(record.departDate);
      if (
        Number.isFinite(fromDateValue) &&
        (!Number.isFinite(departValue) || departValue < fromDateValue)
      ) {
        return false;
      }

      if (
        Number.isFinite(toDateValueMs) &&
        (!Number.isFinite(departValue) || departValue > toDateValueMs)
      ) {
        return false;
      }

      const searchDateValue = toDateValue(record.searchDateUtc);
      if (
        Number.isFinite(searchFromDateValue) &&
        (!Number.isFinite(searchDateValue) || searchDateValue < searchFromDateValue)
      ) {
        return false;
      }

      if (
        Number.isFinite(searchToDateValueMs) &&
        (!Number.isFinite(searchDateValue) || searchDateValue > searchToDateValueMs)
      ) {
        return false;
      }

      return true;
    });
  }, [historyRows, filters, deletedRecordIds]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safeActivePage = Math.min(activePage, totalPages);
  const startIndex = (safeActivePage - 1) * itemsPerPage;
  const pagedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
    setActivePage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setDeletedRecordIds([]);
    setIsFiltersOpen(false);
    setActivePage(1);
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "User / Guest",
      "Is Guest",
      "User ID",
      "From City",
      "To City",
      "Depart Date",
      "Return Date",
      "Trip Type",
      "Adults",
      "Children",
      "Infants",
      "End User IP",
      "Trace ID",
      "Search Date"
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredRows.map((record) => [
      normalizeText(record.id, "--"),
      normalizeText(record.userOrGuestId, "Guest"),
      record.isGuest ? "Yes" : "No",
      normalizeText(record.userId, "--"),
      normalizeText(record.fromCity, "--"),
      normalizeText(record.toCity, "--"),
      formatSearchDate(record.departDate),
      formatSearchDate(record.returnDate),
      normalizeText(record.travelType, "--"),
      record.adultCount,
      record.childCount,
      record.infantCount,
      normalizeText(record.endUserIp, "--"),
      normalizeText(record.traceId, "--"),
      `${formatSearchTime(record.searchDateUtc)}, ${formatSearchDate(record.searchDateUtc)}`,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-flight-search-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = () => {
    if (!filteredRows.length) {
      return;
    }

    if (!window.confirm("Delete all visible search history records?")) {
      return;
    }

    clearSearchHistoryEntries({ searchType: "Flight" });
    setDeletedRecordIds((previous) => [...previous, ...filteredRows.map((row) => row.id)]);
    setInfoMessage("Visible search records removed from this view.");
  };

  return (
    <section className="admin-b2c-page admin-search-history-page admin-flight-search-history-page">
      <header className="admin-b2c-header admin-search-history-header">
        <h1 style={{ fontWeight: 600, margin: 0, fontSize: "1.25rem" }}>
          <span style={{ color: "#A51C49" }}>B2C Flight </span>
          <span style={{ color: "black" }}>Search List</span>
        </h1>
      </header>

      <div className="admin-toolbar-row admin-search-history-toolbar">
        <div className="admin-chip-row">
          <span className="admin-chip admin-search-history-chip">
            Total Records - {filteredRows.length}
          </span>
        </div>

        <div className="admin-actions-row">
          <button type="button" className="admin-search-history-filter-btn" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Close Filter" : "Filter"}
          </button>
          <button type="button" className="admin-search-history-export-btn" onClick={handleExport}>
            Export
          </button>
          <button
            type="button"
            className="admin-search-history-delete"
            onClick={handleDeleteAll}
          >
            Delete All Records
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {infoMessage ? <div className="admin-data-info">{infoMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="admin-search-filters">
          <label>
            <span>Search Query</span>
            <input
              type="text"
              value={draftFilters.query}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  query: event.target.value,
                }))
              }
              placeholder="Segment, airport, or ID"
            />
          </label>
          <label>
            <span>Customer / User</span>
            <input
              type="text"
              value={draftFilters.customerName}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  customerName: event.target.value,
                }))
              }
              placeholder="User ID or Guest"
            />
          </label>
          <label>
            <span>Depart Date From</span>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  fromDate: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Depart Date To</span>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  toDate: event.target.value,
                }))
              }
            />
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Reset
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-search-history-table-shell">
        <header className="admin-search-history-table-head">
          <span>S.No</span>
          <span>Search Date (IST)</span>
          <span>Depart Date</span>
          <span>Segment</span>
          <span>Customer / User</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-search-history-empty">Loading flight search history...</div>
        ) : pagedRows.length ? (
          <div className="admin-search-history-table-body">
            {pagedRows.map((row, index) => {
              const departParts = formatDepartDateParts(row.departDate);
              const badge = getTripTypeBadge(row.tripTypeName, row.tripType);
              const cityNames = buildCityNamesLabel(row);

              return (
                <article
                  key={`${row.id}-${row.searchDateUtc}-${index}`}
                  id={`row-${row.id || row.searchId || index}`}
                  className="admin-search-history-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRecord(row)}
                >
                  <div className="admin-search-history-cell admin-cell-centered">
                    <strong style={{ fontWeight: 500, color: "#475569" }}>{startIndex + index + 1}</strong>
                  </div>

                  <div className="admin-search-history-cell">
                    <strong style={{ fontWeight: 500, color: "#1e293b" }}>{formatSearchDate(row.searchDateUtc)}</strong>
                    {row.searchDateUtc ? (
                      <small style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>
                        {formatSearchTime(row.searchDateUtc)}
                      </small>
                    ) : null}
                  </div>

                  <div className="admin-search-history-cell">
                    <strong style={{ fontWeight: 500, color: "#1e293b" }}>{departParts.dayMonth || formatSearchDate(row.departDate)}</strong>
                    {row.returnDate ? (
                      <small style={{ color: "#0284c7", fontWeight: 500, fontSize: "0.72rem" }}>
                        Return: {formatSearchDate(row.returnDate)}
                      </small>
                    ) : null}
                  </div>

                  <div className="admin-search-history-cell">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "0.68rem",
                          fontWeight: 500,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {badge.label}
                      </span>
                      <strong style={{ fontWeight: 500, color: "#0f172a" }}>{buildSegmentLabel(row)}</strong>
                    </div>
                    {cityNames ? (
                      <small style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "1px", fontWeight: 400 }}>
                        {cityNames}
                      </small>
                    ) : null}
                    <small style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>
                      {formatPassengerCounts(row)}
                    </small>
                  </div>

                  <div className="admin-search-history-cell">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                          backgroundColor: row.isGuest ? "#fef3c7" : "#e0f2fe",
                          color: row.isGuest ? "#92400e" : "#075985",
                        }}
                      >
                        {row.isGuest ? "Guest" : "User"}
                      </span>
                      <strong style={{ fontWeight: 500, color: "#334155" }}>
                        {row.isGuest
                          ? (row.userOrGuestId && row.userOrGuestId.toLowerCase().includes("guest") ? row.userOrGuestId : "Guest")
                          : (row.userId ? `User #${row.userId}` : row.userOrGuestId ? (row.userOrGuestId.toLowerCase().startsWith("user #") ? row.userOrGuestId : `User #${row.userOrGuestId}`) : "User")}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-search-history-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-search-history-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(row);
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
          <div className="admin-search-history-empty">Result Not Found.</div>
        )}

        {filteredRows.length > 0 && (
          <AdminPagination
            currentPage={safeActivePage}
            totalItems={filteredRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setActivePage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="flight search history records"
          />
        )}
      </section>

      {selectedRecord ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedRecord(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Flight search details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Flight Search Details</h2>
                <p className="admin-view-header-subtitle">
                  Search ID: #{normalizeText(selectedRecord.id, "--")} | {selectedRecord.userOrGuestId}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>User Type</span>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      backgroundColor: selectedRecord.isGuest ? "#fef3c7" : "#e0f2fe",
                      color: selectedRecord.isGuest ? "#92400e" : "#075985",
                    }}
                  >
                    {selectedRecord.isGuest ? "Guest User" : "Registered User"}
                  </span>
                </strong>
              </div>
              <div>
                <span>User ID</span>
                <strong>{selectedRecord.userId ? `#${selectedRecord.userId}` : "N/A (Guest)"}</strong>
              </div>
              <div>
                <span>IP Address</span>
                <strong>{normalizeText(selectedRecord.endUserIp, "N/A")}</strong>
              </div>
              <div>
                <span>Trip Type</span>
                {(() => {
                  const badge = getTripTypeBadge(selectedRecord.tripTypeName, selectedRecord.tripType);
                  return (
                    <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </strong>
                  );
                })()}
              </div>
              <div>
                <span>Route / Segment</span>
                <strong>{buildSegmentLabel(selectedRecord)}</strong>
                {buildCityNamesLabel(selectedRecord) ? (
                  <small style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    {buildCityNamesLabel(selectedRecord)}
                  </small>
                ) : null}
              </div>
              <div>
                <span>Depart Date</span>
                <strong>{formatSearchDate(selectedRecord.departDate)}</strong>
              </div>
              <div>
                <span>Return Date</span>
                <strong>{selectedRecord.returnDate ? formatSearchDate(selectedRecord.returnDate) : "N/A (One-Way)"}</strong>
              </div>
              <div>
                <span>Search Date (IST)</span>
                <strong>
                  {formatSearchTime(selectedRecord.searchDateUtc)},{" "}
                  {formatSearchDate(selectedRecord.searchDateUtc)}
                </strong>
              </div>
              <div>
                <span>Passengers</span>
                <strong>{formatPassengerCounts(selectedRecord)}</strong>
              </div>
              {selectedRecord.traceId ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span>Trace ID</span>
                  <strong style={{ fontFamily: "monospace", fontSize: "0.85rem", wordBreak: "break-all" }}>
                    {selectedRecord.traceId}
                  </strong>
                </div>
              ) : null}
              <div>
                <span>Data Source</span>
                <strong>{selectedRecord.isLocalFallback ? "Local Backup" : "Live Backend API"}</strong>
              </div>

              {(() => {
                const segments = parseSegments(selectedRecord.segmentsJson);
                if (!segments.length) return null;
                return (
                  <div style={{ gridColumn: "1 / -1", marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "8px" }}>
                      Journey Legs ({segments.length} {segments.length === 1 ? "Sector" : "Sectors"})
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {segments.map((seg, idx) => (
                        <div
                          key={seg.segmentIndex || idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                background: "#e2e8f0",
                                color: "#334155",
                                fontWeight: 600,
                                fontSize: "0.72rem",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              Leg {seg.segmentIndex || idx + 1}
                            </span>
                            <strong style={{ fontWeight: 500, color: "#0f172a" }}>
                              {seg.originCity || seg.origin} ({seg.origin})
                            </strong>
                            <span style={{ color: "#94a3b8" }}>➔</span>
                            <strong style={{ fontWeight: 500, color: "#0f172a" }}>
                              {seg.destinationCity || seg.destination} ({seg.destination})
                            </strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.78rem", color: "#64748b" }}>
                            {seg.departureDate ? <span>{seg.departureDate}</span> : null}
                            {seg.flightCabinClass ? (
                              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", fontWeight: 500 }}>
                                {getCabinClassName(seg.flightCabinClass)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            <details style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "8px", width: "100%" }}>
              <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                View Raw API Response JSON
              </summary>
              <pre
                style={{
                  margin: "10px 0 0",
                  padding: "12px",
                  background: "#0f172a",
                  color: "#38bdf8",
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(selectedRecord.raw?.raw ? selectedRecord.raw.raw : (selectedRecord.raw || selectedRecord), null, 2)}
              </pre>
            </details>
          </article>
        </div>
      ) : null}
    </section>
  );
}

