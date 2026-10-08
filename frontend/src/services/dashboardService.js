/* eslint-disable */
import { getAuthToken } from "./authSession";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const DASHBOARD_ROOT = "/api/BDashboard";

function isLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

function resolveApiBaseUrl() {
  const preferProxyInDev =
    isLocalDevelopment() &&
    String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() !==
    "true";

  if (preferProxyInDev) {
    return "";
  }

  return "";
}

const API_BASE_URL = resolveApiBaseUrl();

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/${urlOrPath.replace(/^\/+/, "")}`;
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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value, { min, max, fallback }) {
  const numeric = Math.floor(toNumber(value, fallback));
  return Math.max(min, Math.min(max, numeric));
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

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
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
    return noTags || text;
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

  return (
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("b2b_token") ||
    window.localStorage.getItem("authToken") ||
    window.localStorage.getItem("accessToken") ||
    ""
  );
}

async function requestJson(urlOrPath, options = {}) {
  const token = (typeof window !== "undefined" && window.sessionStorage.getItem("active_portal") === "b2b"
    ? window.localStorage.getItem("b2b_token") : "") || getAuthToken() || resolveAuthToken();
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(toAbsoluteUrl(urlOrPath), {
    ...options,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = normalizeErrorMessage(payload);
    throw new Error(message || "Unable to load dashboard summary.");
  }

  if (typeof payload === "string") {
    const normalized = payload.toLowerCase();
    if (
      normalized.includes("<!doctype html") ||
      normalized.includes("<html") ||
      normalized.includes("cannot get /api/dashboard/summary")
    ) {
      throw new Error(
        "Dashboard API returned an unexpected HTML response. Check backend/proxy configuration."
      );
    }
  }

  return payload;
}

function normalizeDashboardSummary(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const revenueSnapshot = pickFirst(
    safePayload,
    ["revenueSnapshot", "RevenueSnapshot"],
    {}
  );
  const busBookings = pickFirst(safePayload, ["busBookings", "BusBookings"], {});

  return {
    totalBookings: toNumber(pickFirst(safePayload, ["totalBookings", "TotalBookings"], 0)),
    completionRatePercent: toNumber(
      pickFirst(safePayload, ["completionRatePercent", "CompletionRatePercent"], 0)
    ),
    revenueSnapshot: {
      totalRevenueInr: toNumber(
        pickFirst(revenueSnapshot, ["totalRevenueInr", "TotalRevenueInr"], 0)
      ),
      totalSavingsInr: toNumber(
        pickFirst(revenueSnapshot, ["totalSavingsInr", "TotalSavingsInr"], 0)
      ),
      cancelledValueInr: toNumber(
        pickFirst(revenueSnapshot, ["cancelledValueInr", "CancelledValueInr"], 0)
      ),
    },
    flightBookings: Object.fromEntries(["completed", "upcoming", "cancelled", "total"].map(key => [key, toNumber(safePayload.flightBookings?.[key])])),
    busBookings: {
      completed: toNumber(pickFirst(busBookings, ["completed", "Completed"], 0)),
      upcoming: toNumber(pickFirst(busBookings, ["upcoming", "Upcoming"], 0)),
      cancelled: toNumber(pickFirst(busBookings, ["cancelled", "Cancelled"], 0)),
      total: toNumber(pickFirst(busBookings, ["total", "Total"], 0)),
    },
  };
}

export async function getDashboardSummary({
  recentLimit = 10,
  travelerPendingDays = 7,
} = {}) {
  const safeRecentLimit = clampNumber(recentLimit, {
    min: 1,
    max: 50,
    fallback: 10,
  });
  const safeTravelerPendingDays = clampNumber(travelerPendingDays, {
    min: 1,
    max: 60,
    fallback: 7,
  });

  const url = buildUrl(`${DASHBOARD_ROOT}/summary`, {
    recentLimit: safeRecentLimit,
    travelerPendingDays: safeTravelerPendingDays,
  });

  const payload = await requestJson(url, {
    method: "GET",
  });

  return normalizeDashboardSummary(payload);
}
