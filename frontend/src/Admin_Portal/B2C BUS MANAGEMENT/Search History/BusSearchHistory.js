/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import adminFeaturedOffersService from "../../../services/adminFeaturedOffersService";
import "./BusSearchHistory.css";
import AdminPagination from "../../../components/AdminPagination";
import { RefreshCw, AlertCircle } from "lucide-react";

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
  "https://satin-eastcoast-musky.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const BUS_BOOKINGS_ROOT = "/api/BusBookings";
const BUS_SEARCH_LOGS_ROOT = "/api/admin/bus-search-logs";
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
  const isGuest = Boolean(
    pickFirst(record, ["isGuest", "IsGuest"], false) ||
    (!pickFirst(record, ["userId", "UserId"]) && !pickFirst(record, ["customerId", "CustomerId"]))
  );

  const rawUserId = pickFirst(
    record,
    ["userId", "UserId", "customerId", "CustomerId", "userGuid", "UserGuid"],
    null
  );

  const resolvedCustomerId =
    rawUserId !== null && rawUserId !== undefined && String(rawUserId).trim()
      ? String(rawUserId).trim()
      : "0";

  const customerNameDirect = pickFirst(
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
    ],
    null
  );

  const userOrGuestId = String(
    pickFirst(
      record,
      ["userOrGuestId", "UserOrGuestId"],
      isGuest ? `Guest` : `User #${resolvedCustomerId}`
    ) || ""
  );

  const customerName =
    customerNameDirect || userOrGuestId || (isGuest ? "Guest User" : "Logged User");

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

  const searchedAtIst = pickFirst(record, ["searchedAtIst", "SearchedAtIst"], null);

  return {
    id:
      pickFirst(
        record,
        ["id", "Id", "searchId", "SearchId", "busSearchLogId", "BusSearchLogId"],
        null
      ) || `bus-search-${index + 1}`,
    isGuest,
    userId: rawUserId ? String(rawUserId) : null,
    userOrGuestId,
    customerName,
    customerId: resolvedCustomerId,
    searchDateUtc,
    searchedAtIst,
    departDate:
      pickFirst(
        record,
        [
          "journeyDate",
          "JourneyDate",
          "departDate",
          "DepartDate",
          "departureDate",
          "DepartureDate",
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
          "fromCityName",
          "FromCityName",
          "sourceCity",
          "SourceCity",
          "from",
          "From",
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
          "toCityName",
          "ToCityName",
          "destinationCity",
          "DestinationCity",
          "to",
          "To",
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
          "sourceCityCode",
          "SourceCityCode",
          "fromCode",
          "FromCode",
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
          "destinationCityCode",
          "DestinationCityCode",
          "toCode",
          "ToCode",
        ],
        ""
      ) || ""
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

  const directArrayCandidates = [
    value.data,
    value.items,
    value.records,
    value.results,
    value.value,
  ];

  for (const candidate of directArrayCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
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
    cache: "no-store",
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
  "",
  "http://localhost:7147",
  "https://localhost:7147",
  "http://localhost:7179",
  "https://localhost:7179",
  "https://satin-eastcoast-musky.ngrok-free.dev"
];

const CANDIDATE_ENDPOINTS = [
  BUS_SEARCH_LOGS_ROOT,
  "/api/admin/bus/searches",
  "/api/BusSearchLogs",
  "/api/admin/bus/search-history",
  "/api/admin/bus/bus-search-history",
  "/api/admin/bus-search-history",
  "/api/BusSearchHistory",
  "/api/BusSearchHistories",
  `${BUS_BOOKINGS_ROOT}/admin/search-history`,
  `${BUS_BOOKINGS_ROOT}/admin/searches`,
  `${BUS_BOOKINGS_ROOT}/admin/bus-search-history`,
  `${BUS_BOOKINGS_ROOT}/search-history`,
  `${BUS_BOOKINGS_ROOT}/searches`,
  `${BUS_BOOKINGS_ROOT}/bus-search-history`,
];

async function listAdminBusSearchHistory({
  query,
  customerName,
  fromDate,
  toDate,
  limit = 500,
} = {}) {
  const queryParams = {};
  if (limit) queryParams.limit = limit;
  if (query && String(query).trim()) queryParams.query = String(query).trim();
  if (customerName && String(customerName).trim()) queryParams.customerName = String(customerName).trim();
  if (fromDate && String(fromDate).trim()) queryParams.fromDate = String(fromDate).trim();
  if (toDate && String(toDate).trim()) queryParams.toDate = String(toDate).trim();

  let lastError = null;

  for (const endpoint of CANDIDATE_ENDPOINTS) {
    for (const baseUrl of CANDIDATE_BASE_URLS) {
      const fullPath = baseUrl
        ? `${baseUrl.replace(/\/+$/, "")}${endpoint}`
        : endpoint;

      const url = buildUrl(fullPath, queryParams);

      try {
        const payload = await requestJson(url, { method: "GET" });
        if (isLikelyHtmlResponse(payload)) {
          throw new Error("Received HTML response page");
        }
        const records = extractArrayPayload(payload);
        if (Array.isArray(records) && records.length > 0) {
          return records.map((record, index) =>
            normalizeBusSearchHistoryRecord(record, index)
          );
        }
        if (Array.isArray(records)) {
          return [];
        }
      } catch (error) {
        lastError = error;
        if (!shouldTryNextSearchHistoryEndpoint(error)) {
          // Fall through candidate loop
        }
      }
    }
  }

  if (lastError && !shouldTryNextSearchHistoryEndpoint(lastError)) {
    throw lastError;
  }

  return [];
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

function parseUtcDate(value) {
  const text = normalizeText(value, "");
  if (!text) {
    return new Date("");
  }

  if (text.includes(":") && !hasTimezoneSuffix(text)) {
    return new Date(`${text.replace(" ", "T")}Z`);
  }

  const parsed = parseDateValue(text);
  return parsed || new Date(text);
}

function toDateValue(value) {
  const parsed = parseUtcDate(value);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getTime();
}

function formatSearchDate(value) {
  const parsed = parseUtcDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).replace(/\//g, "-");
}

function formatDepartDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return normalizeText(value, "--");
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

function mapLocalSearchRecord(record, index = 0) {
  return normalizeBusSearchHistoryRecord({
    ...record,
    id: record?.id || `local-bus-search-${index + 1}`,
    isLocalFallback: true,
  }, index);
}

function mergeSearchHistory(apiRecords, localRecords) {
  const byKey = new Map();

  [...apiRecords, ...localRecords].forEach((record, index) => {
    const normalizedRecord = normalizeBusSearchHistoryRecord(record, index);
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
  const fromPart = normalizeText(record.fromCity, "--");
  const toPart = normalizeText(record.toCity, "--");
  const fromCode = normalizeText(record.fromCityCode, "");
  const toCode = normalizeText(record.toCityCode, "");

  const sourceLabel = fromCode && fromCode !== fromPart ? `${fromPart} (${fromCode})` : fromPart;
  const destinationLabel = toCode && toCode !== toPart ? `${toPart} (${toCode})` : toPart;

  return `${sourceLabel} \u27A4 ${destinationLabel}`;
}

function buildCustomerLabel(record) {
  if (record.isGuest) {
    return record.userOrGuestId || "Guest User";
  }

  const name = normalizeText(record.customerName, "");
  const id = normalizeText(record.userId || record.customerId, "");
  if (name && id && id !== "0") {
    return `${name} (${id})`;
  }

  return name || (id ? `User #${id}` : "Logged User");
}

export default function AdminBusSearchHistoryPage() {
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
      apiRows = await listAdminBusSearchHistory({
        query: activeFilters.query,
        customerName: activeFilters.customerName,
        fromDate: activeFilters.fromDate,
        toDate: activeFilters.toDate,
        limit: 500,
      });
    } catch (error) {
      apiError = normalizeText(error?.message, "Unable to load bus search history.");
    }

    const localRows = apiError
      ? readSearchHistoryEntries({ searchType: "Bus" }).map((record, index) =>
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
    const deletedIdSet = new Set(deletedRecordIds);

    return historyRows.filter((record) => {
      if (deletedIdSet.has(record.id)) {
        return false;
      }

      if (queryValue) {
        const searchText = `${record.id} ${record.fromCity} ${record.toCity} ${record.customerName} ${record.userOrGuestId}`.toLowerCase();
        if (!searchText.includes(queryValue)) {
          return false;
        }
      }

      if (customerNameValue) {
        const customerText = `${record.customerName} ${record.userOrGuestId} ${record.customerId}`.toLowerCase();
        if (!customerText.includes(customerNameValue)) {
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
      "Log ID",
      "User / Guest ID",
      "User Type",
      "User ID",
      "From City",
      "To City",
      "Journey Date",
      "Search Date (IST)"
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredRows.map((record) => [
      normalizeText(record.id, "--"),
      normalizeText(record.userOrGuestId, "Guest"),
      record.isGuest ? "Guest" : "Registered User",
      normalizeText(record.userId, "--"),
      normalizeText(record.fromCity, "--"),
      normalizeText(record.toCity, "--"),
      formatDepartDate(record.departDate),
      formatSearchDate(record.searchDateUtc),
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
        <h1 style={{ fontWeight: 600, margin: 0, fontSize: "1.85rem" }}>
          <span style={{ color: "#A51C49" }}>B2C Bus </span>
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
          <span>Search Date (IST)</span>
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
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedRecord(row)}
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: row.isGuest ? "#fef3c7" : "#e0f2fe",
                        color: row.isGuest ? "#92400e" : "#075985",
                      }}
                    >
                      {row.isGuest ? "Guest" : "User"}
                    </span>
                    <strong>{row.userOrGuestId || buildCustomerLabel(row)}</strong>
                  </div>
                </div>
              </article>
            ))}
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
            itemName="search history records"
          />
        )}
      </section>

      {selectedRecord ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "16px",
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <article
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "min(560px, 95vw)",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Bus Search Log #{selectedRecord.id}</h3>
                <small style={{ color: "#64748b" }}>{selectedRecord.userOrGuestId}</small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </header>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>User Type</span>
                <div style={{ marginTop: "4px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      backgroundColor: selectedRecord.isGuest ? "#fef3c7" : "#e0f2fe",
                      color: selectedRecord.isGuest ? "#92400e" : "#075985",
                    }}
                  >
                    {selectedRecord.isGuest ? "Guest User" : "Registered User"}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>User / Guest ID</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#0f172a" }}>{selectedRecord.userOrGuestId || "N/A"}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Route Segment</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#0f172a" }}>{buildSegmentLabel(selectedRecord)}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Journey Date</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#0f172a" }}>{formatDepartDate(selectedRecord.departDate)}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Search Timestamp (IST)</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#0f172a" }}>{formatSearchDate(selectedRecord.searchDateUtc)}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Data Source</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#0f172a" }}>{selectedRecord.isLocalFallback ? "Local Backup" : "Live Backend API"}</p>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}
