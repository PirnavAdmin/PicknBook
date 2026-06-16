import React, { useCallback, useEffect, useMemo, useState } from "react";
import adminFeaturedOffersService from "../../../services/adminFeaturedOffersService";
import "./BusSearchHistory.css";

const DEFAULT_FILTERS = {
  query: "",
  customerName: "",
  fromDate: "",
  toDate: "",
};

const PAGE_SIZE = 10;

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
  "https://undogmatically-knotlike-evita.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const BUS_BOOKINGS_ROOT = "/api/BusBookings";
const BUS_SEARCH_LOGS_ROOT = "/api/BusSearchLogs";
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

const BUS_API_BASE_URL = resolveApiBaseUrl(
  process.env.REACT_APP_API_BASE_URL,
  process.env.REACT_APP_BUS_API_BASE_URL
);

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  if (BUS_API_BASE_URL) {
    return `${BUS_API_BASE_URL.replace(/\/+$/, "")}/${String(urlOrPath || "").replace(
      /^\/+/,
      ""
    )}`;
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

function readStoredValue(storage, key) {
  try {
    return storage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function getStoredValue(key) {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    readStoredValue(window.sessionStorage, key) ||
    readStoredValue(window.localStorage, key)
  );
}

function getRequestAuthHeaders(resolvedUserId) {
  const token =
    getStoredValue("adminToken") ||
    getStoredValue("token") ||
    getStoredValue("authToken") ||
    getStoredValue("accessToken");
  const adminId = getStoredValue("adminId");
  const adminRole = getStoredValue("adminRole");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(resolvedUserId ? { "X-User-Id": resolvedUserId } : {}),
    ...(adminId ? { "X-Admin-Id": adminId } : {}),
    ...(adminRole ? { "X-Admin-Role": adminRole } : {}),
  };
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

function normalizeBusSearchHistoryRecord(record, index = 0) {
  return {
    id:
      pickFirst(record, ["id", "Id", "searchId", "SearchId"], null) ||
      `bus-search-${index + 1}`,
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
          "createdDateUtc",
          "CreatedDateUtc",
          "searchDate",
          "SearchDate",
          "searchedOn",
          "SearchedOn",
          "searchTime",
          "SearchTime",
          "createdAt",
          "CreatedAt",
          "createdDate",
          "CreatedDate",
          "timestamp",
          "Timestamp",
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
          "travelDate",
          "TravelDate",
          "onwardDate",
          "OnwardDate",
          "journeyDate",
          "JourneyDate",
          "tripDate",
          "TripDate",
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
          "sourceCity",
          "SourceCity",
          "sourceName",
          "SourceName",
          "originCity",
          "OriginCity",
          "origin",
          "Origin",
          "from",
          "From",
          "source",
          "Source",
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
          "destinationCity",
          "DestinationCity",
          "destinationName",
          "DestinationName",
          "arrivalCity",
          "ArrivalCity",
          "to",
          "To",
          "destination",
          "Destination",
        ],
        ""
      ) || ""
    ),
    fromCityCode: String(
      pickFirst(record, ["fromCityCode", "FromCityCode", "fromCode", "FromCode"], "") ||
      ""
    ),
    toCityCode: String(
      pickFirst(record, ["toCityCode", "ToCityCode", "toCode", "ToCode"], "") || ""
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
          "name",
          "Name",
          "fullName",
          "FullName",
          "createdBy",
          "CreatedBy",
          "email",
          "Email",
          "customerEmail",
          "CustomerEmail",
        ],
        "No Login"
      ) || "No Login"
    ),
    customerId: String(
      pickFirst(
        record,
        ["customerId", "CustomerId", "userId", "UserId", "createdById", "CreatedById"],
        "0"
      ) || "0"
    ),
    searchType: "Bus",
    raw: record,
  };
}

function findFirstArrayPayload(value, depth = 0) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }

  const preferredKeys = [
    "data",
    "items",
    "records",
    "results",
    "value",
    "searchHistory",
    "SearchHistory",
    "busSearchHistory",
    "BusSearchHistory",
    "busSearchHistories",
    "BusSearchHistories",
    "searches",
    "Searches",
    "list",
    "List",
  ];

  for (const key of preferredKeys) {
    const nestedArray = findFirstArrayPayload(value[key], depth + 1);
    if (nestedArray) {
      return nestedArray;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nestedArray = findFirstArrayPayload(nestedValue, depth + 1);
    if (nestedArray) {
      return nestedArray;
    }
  }

  return null;
}

function extractArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  return findFirstArrayPayload(payload) || [];
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
  const status = Number(error?.status || error?.response?.status);
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

async function requestJson(urlOrPath, options = {}) {
  const resolvedUserId = resolveCurrentUserId(options.userId);
  const headers = {
    ...getRequestAuthHeaders(resolvedUserId),
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

async function listAdminBusSearchHistory({
  query,
  customerName,
  fromDate,
  toDate,
  limit = 500,
} = {}) {
  try {
    const response = await adminFeaturedOffersService.get(BUS_SEARCH_LOGS_ROOT);
    const records = extractArrayPayload(response?.data);

    return records.map((record, index) =>
      normalizeBusSearchHistoryRecord(record, index)
    );
  } catch (error) {
    if (!shouldTryNextSearchHistoryEndpoint(error)) {
      throw error;
    }
  }

  const candidateEndpoints = [
    `${BUS_BOOKINGS_ROOT}/admin/search-history`,
    `${BUS_BOOKINGS_ROOT}/admin/searches`,
    `${BUS_BOOKINGS_ROOT}/admin/bus-search-history`,
    `${BUS_BOOKINGS_ROOT}/admin/search_history`,
    `${BUS_BOOKINGS_ROOT}/admin/bus_search_history`,
    `${BUS_BOOKINGS_ROOT}/search-history`,
    `${BUS_BOOKINGS_ROOT}/searches`,
    `${BUS_BOOKINGS_ROOT}/bus-search-history`,
    `${BUS_BOOKINGS_ROOT}/search_history`,
    `${BUS_BOOKINGS_ROOT}/bus_search_history`,
    "/api/admin/bus/search-history",
    "/api/admin/bus/searches",
    "/api/admin/bus/bus-search-history",
    "/api/admin/bus/search_history",
    "/api/admin/bus/bus_search_history",
    "/api/admin/bus-search-history",
    "/api/BusSearchHistory",
    "/api/BusSearchHistories",
  ];

  let lastError = null;
  let emptyRecords = null;

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
      if (records.length > 0) {
        return records.map((record, index) =>
          normalizeBusSearchHistoryRecord(record, index)
        );
      }

      emptyRecords = records;
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

  return emptyRecords || [];
}

function parseDateValue(value) {
  const text = normalizeText(value, "");
  if (!text) {
    return null;
  }

  const ddMmYyyyMatch = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(.*)$/);
  if (ddMmYyyyMatch) {
    const [, day, month, year, timePart] = ddMmYyyyMatch;
    const parsed = new Date(`${year}-${month}-${day}${timePart || ""}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasTimezoneSuffix(value) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(String(value || "").trim());
}

function normalizeDateTimeText(value) {
  const text = normalizeText(value, "");
  if (!text) {
    return "";
  }

  const ddMmYyyyMatch = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(.*)$/);
  if (ddMmYyyyMatch) {
    const [, day, month, year, timePart] = ddMmYyyyMatch;
    const normalizedTime = normalizeText(timePart, "").replace(/^\s+/, "T");
    return `${year}-${month}-${day}${normalizedTime}`;
  }

  return text;
}

function parseUtcDateValue(value) {
  const text = normalizeDateTimeText(value);
  if (!text) {
    return null;
  }

  const hasTimeComponent = /[T\s]\d{1,2}:\d{2}/.test(text);
  const utcText = hasTimeComponent && !hasTimezoneSuffix(text) ? `${text}Z` : text;
  const parsed = new Date(utcText);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const toDateValue = (value) => {
  const parsed = parseDateValue(value);
  return parsed ? parsed.getTime() : Number.NaN;
};

const toSearchDateValue = (value) => {
  const parsed = parseUtcDateValue(value);
  return parsed ? parsed.getTime() : Number.NaN;
};

const formatSearchDate = (value) => {
  const parsed = parseUtcDateValue(value);
  if (!parsed) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDepartDate = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return "--";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function mapLocalSearchRecord(record, index = 0) {
  return {
    id: record?.id || `local-search-${index + 1}`,
    searchDateUtc: record?.searchDateUtc || null,
    departDate: record?.departDate || null,
    fromCity: normalizeText(record?.fromCity, ""),
    toCity: normalizeText(record?.toCity, ""),
    fromCityCode: normalizeText(record?.fromCityCode, ""),
    toCityCode: normalizeText(record?.toCityCode, ""),
    customerName: normalizeText(record?.customerName, "No Login"),
    customerId: normalizeText(record?.customerId, "0"),
    searchType: "Bus",
    isLocalFallback: true,
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
      searchType: "Bus",
      isLocalFallback: Boolean(record?.isLocalFallback),
    };

    const key = normalizedRecord.id ? String(normalizedRecord.id) : `search-row-${index + 1}`;
    if (!byKey.has(key)) {
      byKey.set(key, normalizedRecord);
    }
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const left = toSearchDateValue(a.searchDateUtc);
    const right = toSearchDateValue(b.searchDateUtc);
    return right - left;
  });
}

function buildSegmentLabel(record) {
  const fromPart = normalizeText(record.fromCity, "--");
  const toPart = normalizeText(record.toCity, "--");
  const fromCode = normalizeText(record.fromCityCode, "");
  const toCode = normalizeText(record.toCityCode, "");

  const sourceLabel = fromCode ? `${fromPart} (${fromCode})` : fromPart;
  const destinationLabel = toCode ? `${toPart} (${toCode})` : toPart;

  return `${sourceLabel} \u27A4 ${destinationLabel}`;
}

function buildCustomerLabel(record) {
  const name = normalizeText(record?.customerName, "");
  const id = normalizeText(record?.customerId, "");
  const hasName = name && name.toLowerCase() !== "no login";
  const hasId = id && id !== "0";

  if (hasName && hasId && name !== id) {
    return `${name} (${id})`;
  }

  if (hasName) {
    return name;
  }

  if (hasId) {
    return id;
  }

  return "No Login";
}

export default function AdminSearchHistoryPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [historyRows, setHistoryRows] = useState([]);
  const [deletedRecordIds, setDeletedRecordIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activePage, setActivePage] = useState(1);

  const loadSearchHistory = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    let apiRows = [];
    let apiError = "";

    try {
      apiRows = await listAdminBusSearchHistory({
        query: activeFilters.query,
        customerName: activeFilters.customerName,
        fromDate: activeFilters.fromDate,
        toDate: activeFilters.toDate,
        limit: 500,
      });
    } catch (error) {
      apiError = normalizeText(error?.message, "Unable to load search history.");
    }

    const localRows = apiError
      ? readSearchHistoryEntries({ searchType: "Bus" }).map((record, index) =>
        mapLocalSearchRecord(record, index)
      )
      : [];
    const mergedRows = mergeSearchHistory(apiRows, localRows);
    setHistoryRows(mergedRows);

    if (apiError && mergedRows.length > 0) {
      setInfoMessage(
        "Unable to load live search history. Showing local search history backup."
      );
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
    const deletedIdSet = new Set(deletedRecordIds);

    return historyRows.filter((record) => {
      if (deletedIdSet.has(record.id)) {
        return false;
      }

      if (queryValue) {
        const searchText = `${record.fromCity} ${record.toCity} ${record.customerName} ${record.customerId}`.toLowerCase();
        if (!searchText.includes(queryValue)) {
          return false;
        }
      }

      if (customerNameValue) {
        const customerText = `${record.customerName} ${record.customerId}`.toLowerCase();
        if (!customerText.includes(customerNameValue)) {
          return false;
        }
      }

      const departValue = toDateValue(record.departDate);
      if (Number.isFinite(fromDateValue) && (!Number.isFinite(departValue) || departValue < fromDateValue)) {
        return false;
      }

      if (Number.isFinite(toDateValueMs) && (!Number.isFinite(departValue) || departValue > toDateValueMs)) {
        return false;
      }

      return true;
    });
  }, [historyRows, filters, deletedRecordIds]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, totalPages);
  const startIndex = (safeActivePage - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setDeletedRecordIds([]);
    setIsFiltersOpen(false);
  };

  const handleExport = () => {
    const headers = ["S.No", "Search Date", "Depart Date", "Segment", "Customer / User"];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredRows.map((record, index) => [
      index + 1,
      formatSearchDate(record.searchDateUtc),
      formatDepartDate(record.departDate),
      buildSegmentLabel(record),
      buildCustomerLabel(record),
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-bus-search-history.csv";
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

    clearSearchHistoryEntries({ searchType: "Bus" });
    setDeletedRecordIds((previous) => [
      ...previous,
      ...filteredRows.map((row) => row.id),
    ]);
    setInfoMessage("Visible search records removed from this view.");
  };

  return (
    <section className="admin-b2c-page admin-search-history-page">
      <header className="admin-b2c-header admin-search-history-header">
        <h1>B2C Bus Search List</h1>
      </header>

      <div className="admin-toolbar-row admin-search-history-toolbar">
        <div className="admin-chip-row">
          <span className="admin-chip admin-search-history-chip">
            Total Records {filteredRows.length}
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
          <button type="button" className="admin-search-history-delete" onClick={handleDeleteAll}>
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
              placeholder="Route, customer or user ID"
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
              placeholder="Enter customer or user ID"
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
          <span>Search Date</span>
          <span>Depart Date</span>
          <span>Segment</span>
          <span>Customer / User</span>
        </header>

        {isLoading ? (
          <div className="admin-search-history-empty">Loading search history...</div>
        ) : pagedRows.length ? (
          <div className="admin-search-history-table-body">
            {pagedRows.map((row, index) => (
              <article
                key={`${row.id}-${row.searchDateUtc}-${index}`}
                className="admin-search-history-row"
              >
                <div className="admin-search-history-cell admin-cell-centered">
                  <strong>{startIndex + index + 1}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{formatSearchDate(row.searchDateUtc)}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{formatDepartDate(row.departDate)}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{buildSegmentLabel(row)}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{buildCustomerLabel(row)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-search-history-empty">Result Not Found.</div>
        )}

        <footer className="admin-search-history-pagination">
          <button
            type="button"
            onClick={() => setActivePage(1)}
            disabled={safeActivePage === 1}
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setActivePage((current) => Math.max(1, current - 1))}
            disabled={safeActivePage === 1}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1)
            .slice(Math.max(0, safeActivePage - 3), safeActivePage + 2)
            .map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={safeActivePage === pageNumber ? "active" : ""}
                onClick={() => setActivePage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

          <button
            type="button"
            onClick={() => setActivePage((current) => Math.min(totalPages, current + 1))}
            disabled={safeActivePage === totalPages}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setActivePage(totalPages)}
            disabled={safeActivePage === totalPages}
          >
            Last
          </button>
        </footer>
      </section>
    </section>
  );
}

