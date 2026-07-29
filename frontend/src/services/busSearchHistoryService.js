/* eslint-disable */
import api from "./adminFeaturedOffersService";

const SEARCH_HISTORY_STORAGE_KEY = "user_search_history_logs";
const BUS_BOOKINGS_ROOT = "/api/BusBookings";
const BUS_SEARCH_LOGS_ROOT = "/api/BusSearchLogs";

const SEARCH_HISTORY_ENDPOINTS = [
  BUS_SEARCH_LOGS_ROOT,
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

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeCount(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
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

function findFirstArrayPayload(value, depth = 0) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }

  const preferredKeys = [
    "$values",
    "data",
    "Data",
    "items",
    "Items",
    "records",
    "Records",
    "results",
    "Results",
    "value",
    "Value",
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

function getStoredValue(key) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function getSearchHistoryHeaders() {
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
    ...(adminId ? { "X-Admin-Id": adminId } : {}),
    ...(adminRole ? { "X-Admin-Role": adminRole } : {}),
  };
}

function shouldTryNextSearchHistoryEndpoint(error) {
  const status = Number(error?.status || error?.response?.status);
  if (Number.isFinite(status) && [401, 403, 404, 405].includes(status)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("cannot get") ||
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("network error")
  );
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
    fromCity: normalizeText(
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
      )
    ),
    toCity: normalizeText(
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
      )
    ),
    fromCityCode: normalizeText(
      pickFirst(record, ["fromCityCode", "FromCityCode", "fromCode", "FromCode"], "")
    ),
    toCityCode: normalizeText(
      pickFirst(record, ["toCityCode", "ToCityCode", "toCode", "ToCode"], "")
    ),
    resultsCount: normalizeCount(
      pickFirst(record, ["resultsCount", "ResultsCount", "resultCount", "ResultCount"], 0)
    ),
    searchType: normalizeText(pickFirst(record, ["searchType", "SearchType"], "Bus"), "Bus"),
    raw: record,
  };
}

function readLocalSearchHistoryEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((record, index) => normalizeBusSearchHistoryRecord(record, index))
          .filter((record) => record.searchType.toLowerCase() === "bus")
      : [];
  } catch {
    return [];
  }
}

async function listBusSearchHistory({ limit = 500 } = {}) {
  let lastError = null;
  let emptyRecords = [];

  for (const endpoint of SEARCH_HISTORY_ENDPOINTS) {
    try {
      const response = await api.get(endpoint, {
        params: { limit },
        headers: getSearchHistoryHeaders(),
      });
      const records = extractArrayPayload(response?.data);

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

  return emptyRecords;
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

function normalizeRouteKey(value) {
  return normalizeText(value, "").toLowerCase().replace(/\s+/g, " ");
}

function buildRouteId(fromCity, toCity) {
  return `${normalizeRouteKey(fromCity)}-${normalizeRouteKey(toCity)}`
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPopularRouteDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return "";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function aggregatePopularRoutes(records) {
  const routeMap = new Map();

  records.forEach((record, index) => {
    const fromCity = normalizeText(record?.fromCity, "");
    const toCity = normalizeText(record?.toCity, "");

    if (!fromCity || !toCity || normalizeRouteKey(fromCity) === normalizeRouteKey(toCity)) {
      return;
    }

    const key = `${normalizeRouteKey(fromCity)}|${normalizeRouteKey(toCity)}`;
    const current = routeMap.get(key) || {
      id: buildRouteId(fromCity, toCity) || `popular-route-${index + 1}`,
      fromCity,
      toCity,
      fromCityCode: normalizeText(record?.fromCityCode, ""),
      toCityCode: normalizeText(record?.toCityCode, ""),
      searches: 0,
      resultsCount: 0,
      latestSearchDateUtc: null,
      latestDepartDate: null,
    };

    current.searches += 1;
    current.resultsCount += normalizeCount(record?.resultsCount);

    const searchDate = parseDateValue(record?.searchDateUtc);
    const currentSearchDate = parseDateValue(current.latestSearchDateUtc);
    if (searchDate && (!currentSearchDate || searchDate > currentSearchDate)) {
      current.latestSearchDateUtc = record.searchDateUtc;
    }

    const departDate = parseDateValue(record?.departDate);
    const currentDepartDate = parseDateValue(current.latestDepartDate);
    if (departDate && (!currentDepartDate || departDate > currentDepartDate)) {
      current.latestDepartDate = record.departDate;
    }

    routeMap.set(key, current);
  });

  return Array.from(routeMap.values())
    .map((route) => ({
      ...route,
      latestDepartDateLabel: formatPopularRouteDate(route.latestDepartDate),
    }))
    .sort((left, right) => {
      if (right.searches !== left.searches) {
        return right.searches - left.searches;
      }

      const rightDate = parseDateValue(right.latestSearchDateUtc)?.getTime() || 0;
      const leftDate = parseDateValue(left.latestSearchDateUtc)?.getTime() || 0;
      return rightDate - leftDate;
    });
}

export async function getPopularBusRoutesFromSearchHistory({ limit = 12 } = {}) {
  let apiRecords = [];
  let apiError = null;

  try {
    apiRecords = await listBusSearchHistory({ limit: 500 });
  } catch (error) {
    apiError = error;
  }

  const localRecords = apiRecords.length > 0 ? [] : readLocalSearchHistoryEntries();
  const routes = aggregatePopularRoutes([...apiRecords, ...localRecords]).slice(0, limit);

  if (!routes.length && apiError) {
    throw apiError;
  }

  return routes;
}
