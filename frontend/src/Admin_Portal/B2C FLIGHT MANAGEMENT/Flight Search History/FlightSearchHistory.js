import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const FALLBACK_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";
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

function normalizeFlightSearchHistoryRecord(record, index = 0) {
  return {
    id:
      pickFirst(
        record,
        ["id", "Id", "searchId", "SearchId", "flightSearchId", "FlightSearchId"],
        null
      ) || `flight-search-${index + 1}`,
    searchDateUtc:
      pickFirst(
        record,
        [
          "searchDateUtc",
          "SearchDateUtc",
          "searchedAtUtc",
          "SearchedAtUtc",
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
      ) || null,
    departDate:
      pickFirst(
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
      ) || null,
    fromCity: String(
      pickFirst(
        record,
        [
          "fromCity",
          "FromCity",
          "from",
          "From",
          "sourceCity",
          "SourceCity",
          "originCity",
          "OriginCity",
          "origin",
          "Origin",
          "fromAirport",
          "FromAirport",
          "fromAirportName",
          "FromAirportName",
        ],
        ""
      ) || ""
    ),
    toCity: String(
      pickFirst(
        record,
        [
          "toCity",
          "ToCity",
          "to",
          "To",
          "destinationCity",
          "DestinationCity",
          "destination",
          "Destination",
          "toAirport",
          "ToAirport",
          "toAirportName",
          "ToAirportName",
        ],
        ""
      ) || ""
    ),
    fromCityCode: String(
      pickFirst(
        record,
        [
          "fromCityCode",
          "FromCityCode",
          "fromCode",
          "FromCode",
          "originCode",
          "OriginCode",
          "fromAirportCode",
          "FromAirportCode",
        ],
        ""
      ) || ""
    ),
    toCityCode: String(
      pickFirst(
        record,
        [
          "toCityCode",
          "ToCityCode",
          "toCode",
          "ToCode",
          "destinationCode",
          "DestinationCode",
          "toAirportCode",
          "ToAirportCode",
        ],
        ""
      ) || ""
    ),
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
        "No Login"
      ) || "No Login"
    ),
    customerId: String(
      pickFirst(record, ["customerId", "CustomerId", "userId", "UserId"], "0") || "0"
    ),
    travelType: String(
      pickFirst(
        record,
        ["travelType", "TravelType", "tripType", "TripType", "journeyType", "JourneyType", "type", "Type"],
        ""
      ) || ""
    ),
    adultCount:
      Number(
        pickFirst(record, ["adultCount", "AdultCount", "adults", "Adults"], 0)
      ) || 0,
    childCount:
      Number(
        pickFirst(record, ["childCount", "ChildCount", "children", "Children"], 0)
      ) || 0,
    infantCount:
      Number(
        pickFirst(record, ["infantCount", "InfantCount", "infants", "Infants"], 0)
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

async function listAdminFlightSearchHistory({
  query,
  customerName,
  fromDate,
  toDate,
  limit = 500,
} = {}) {
  const candidateEndpoints = [
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
    `${FLIGHT_BOOKINGS_ROOT}/search_history`,
    `${FLIGHT_BOOKINGS_ROOT}/flight_search_history`,
  ];

  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    const url = buildUrl(endpoint, {
      query,
      customerName,
      fromDate,
      toDate,
      limit,
    });

    try {
      const payload = await requestJson(url, { method: "GET" });
      if (isLikelyHtmlResponse(payload)) {
        throw new Error(payload);
      }
      const records = extractArrayPayload(payload);
      return records.map((record, index) =>
        normalizeFlightSearchHistoryRecord(record, index)
      );
    } catch (error) {
      lastError = error;
      if (shouldTryNextSearchHistoryEndpoint(error)) {
        continue;
      }

      throw error;
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
  return {
    id: record?.id || `local-flight-search-${index + 1}`,
    searchDateUtc: record?.searchDateUtc || null,
    departDate: record?.departDate || null,
    fromCity: normalizeText(record?.fromCity, ""),
    toCity: normalizeText(record?.toCity, ""),
    fromCityCode: normalizeText(record?.fromCityCode, ""),
    toCityCode: normalizeText(record?.toCityCode, ""),
    customerName: normalizeText(record?.customerName, "No Login"),
    customerId: normalizeText(record?.customerId, "0"),
    travelType: normalizeText(record?.travelType, ""),
    adultCount: Number(record?.adultCount) || 0,
    childCount: Number(record?.childCount) || 0,
    infantCount: Number(record?.infantCount) || 0,
    searchType: "Flight",
    isLocalFallback: true,
    raw: record,
  };
}

function mergeSearchHistory(apiRecords, localRecords) {
  const byKey = new Map();

  [...apiRecords, ...localRecords].forEach((record, index) => {
    const normalizedRecord = {
      id: record?.id || `search-row-${index + 1}`,
      searchDateUtc: record?.searchDateUtc || null,
      departDate: record?.departDate || null,
      fromCity: normalizeText(record?.fromCity, ""),
      toCity: normalizeText(record?.toCity, ""),
      fromCityCode: normalizeText(
        record?.fromCityCode || record?.fromCode || record?.fromCityId,
        ""
      ),
      toCityCode: normalizeText(
        record?.toCityCode || record?.toCode || record?.toCityId,
        ""
      ),
      customerName: normalizeText(record?.customerName, "No Login"),
      customerId: normalizeText(record?.customerId || record?.userId, "0"),
      travelType: normalizeText(record?.travelType || record?.journeyType || record?.type || record?.tripType || record?.TripType, ""),
      adultCount:
        Number(record?.adultCount ?? record?.adults ?? record?.AdultCount ?? record?.Adults) || 0,
      childCount:
        Number(
          record?.childCount ?? record?.children ?? record?.ChildCount ?? record?.Children
        ) || 0,
      infantCount:
        Number(
          record?.infantCount ?? record?.infants ?? record?.InfantCount ?? record?.Infants
        ) || 0,
      searchType: "Flight",
      isLocalFallback: Boolean(record?.isLocalFallback),
      raw: record?.raw || record,
    };

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
  const fromPart = normalizeText(record.fromCity, "--");
  const toPart = normalizeText(record.toCity, "--");
  const fromCode = normalizeText(record.fromCityCode, "");
  const toCode = normalizeText(record.toCityCode, "");

  const sourceLabel = fromCode ? `${fromPart}, ${fromCode}` : fromPart;
  const destinationLabel = toCode ? `${toPart}, ${toCode}` : toPart;

  return `${sourceLabel} \u27A4 ${destinationLabel}`;
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
        const searchText = `${record.id} ${record.fromCity} ${record.toCity} ${record.customerName}`.toLowerCase();
        if (!searchText.includes(queryValue)) {
          return false;
        }
      }

      if (customerNameValue) {
        if (!String(record.customerName || "").toLowerCase().includes(customerNameValue)) {
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
    const headers = ["ID", "Customer", "Segment", "Depart Date", "Type", "Search Date"];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredRows.map((record) => [
      normalizeText(record.id, "--"),
      `${normalizeText(record.customerName, "No Login")} (${normalizeText(record.customerId, "0")})`,
      buildSegmentLabel(record),
      formatSearchDate(record.departDate),
      normalizeText(record.travelType, "--"),
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
        <h1 style={{ fontWeight: 600, margin: 0, fontSize: "1.85rem" }}>
          <span style={{ color: "#be185d" }}>B2C Flight </span>
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
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Close Filter" : "Filter"}
          </button>
          <button type="button" className="admin-cancel-clear-btn" onClick={clearFilters}>
            Clear Filter
          </button>
          <button type="button" onClick={handleExport}>
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
        <section className="flight-ops-filters admin-ops-filters admin-search-filters">
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
              placeholder="Route or customer"
            />
          </label>
          <label>
            <span>Customer Name</span>
            <input
              type="text"
              value={draftFilters.customerName}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  customerName: event.target.value,
                }))
              }
              placeholder="Enter customer name"
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
          <label>
            <span>Search Date From</span>
            <input
              type="date"
              value={draftFilters.searchFromDate}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  searchFromDate: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Search Date To</span>
            <input
              type="date"
              value={draftFilters.searchToDate}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  searchToDate: event.target.value,
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
          <span>ID</span>
          <span>Segment</span>
          <span>Depart Date</span>
          <span>Type / Search Date</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-search-history-empty">Loading flight search history...</div>
        ) : pagedRows.length ? (
          <div className="admin-search-history-table-body">
            {pagedRows.map((row, index) => {
              const departParts = formatDepartDateParts(row.departDate);

              return (
                <article
                  key={`${row.id}-${row.searchDateUtc}-${index}`}
                  className="admin-search-history-row"
                >
                  <div className="admin-search-history-cell">
                    <strong>Search: {normalizeText(row.id, "--")}</strong>
                    <small>Customer: {normalizeText(row.customerId, "0")}</small>
                  </div>

                  <div className="admin-search-history-cell">
                    <strong>{buildSegmentLabel(row)}</strong>
                    <small>{formatPassengerCounts(row)}</small>
                  </div>

                  <div className="admin-search-history-cell admin-cell-centered">
                    <strong>{departParts.dayMonth}</strong>
                    <small>{departParts.year}</small>
                  </div>

                  <div className="admin-search-history-cell">
                    <strong>{normalizeText(row.travelType, "--")}</strong>
                    <small>
                      {formatSearchTime(row.searchDateUtc)}, {formatSearchDate(row.searchDateUtc)}
                    </small>
                  </div>

                  <div className="admin-search-history-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-action-btn admin-flight-search-view-btn"
                      onClick={() => setSelectedRecord(row)}
                      aria-label="View flight search"
                      title="View"
                    >
                      <Eye size={16} />
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
                <h2>Flight Search Detail</h2>
                <p className="admin-view-header-subtitle">
                  Search: {normalizeText(selectedRecord.id, "--")} | Customer:{" "}
                  {normalizeText(selectedRecord.customerId, "0")}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Segment</span>
                <strong>{buildSegmentLabel(selectedRecord)}</strong>
              </div>
              <div>
                <span>Depart Date</span>
                <strong>{formatSearchDate(selectedRecord.departDate)}</strong>
              </div>
              <div>
                <span>Search Date</span>
                <strong>
                  {formatSearchTime(selectedRecord.searchDateUtc)},{" "}
                  {formatSearchDate(selectedRecord.searchDateUtc)}
                </strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{normalizeText(selectedRecord.travelType, "--")}</strong>
              </div>
              <div>
                <span>Passengers</span>
                <strong>{formatPassengerCounts(selectedRecord)}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{selectedRecord.isLocalFallback ? "Local Backup" : "API"}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

