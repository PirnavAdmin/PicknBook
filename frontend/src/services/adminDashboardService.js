/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

// ✅ SINGLE SOURCE OF TRUTH
const DASHBOARD_ROOT = "/api/BDashboard";

function isLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

function resolveApiBaseUrl() {
  const preferProxyInDev =
    isLocalDevelopment() &&
    String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() !==
      "true";

  if (preferProxyInDev) return "";

  const explicitBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_ADMIN_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

  return FALLBACK_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

function createEmptyAdminSummary() {
  return {
    busBookings: {
      total: 0,
      completed: 0,
      cancelled: 0,
      upcoming: 0,
    },
    revenueSnapshot: {
      totalRevenueInr: 0,
      totalSavingsInr: 0,
    },
    pendingActions: {
      total: 0,
      cancellations: 0,
      deposits: 0,
      travelerUpdates: 0,
    },
    recentUpdateCounters: {
      travelerUpdates: 0,
    },
    isFallback: true,
  };
}

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;

  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/${urlOrPath.replace(
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
    if (value === undefined || value === null) return;

    const text = typeof value === "string" ? value.trim() : String(value);
    if (text) params.set(key, text);
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
    if (!text) return "";

    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch?.[1]) {
      return preMatch[1].replace(/\s+/g, " ").trim();
    }

    return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  if (payload && typeof payload?.message === "string") {
    return payload.message.trim();
  }

  return "";
}

async function requestJson(urlOrPath, options = {}) {
  const headers = {
    Accept: "application/json",
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
    throw new Error(message || "Unable to load admin dashboard data.");
  }

  if (typeof payload === "string") {
    const normalized = payload.toLowerCase();
    if (
      normalized.includes("<!doctype html") ||
      normalized.includes("<html") ||
      normalized.includes("cannot get /api")
    ) {
      throw new Error(
        "Admin Dashboard API returned HTML. Check backend/proxy."
      );
    }
  }

  return payload;
}

function getAdminAuthHeaders() {
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    "";

  const headers = { Accept: "application/json" };

  if (token) headers.Authorization = `Bearer ${token}`;

  const adminId =
    localStorage.getItem("adminId") ||
    "";

  if (adminId) {
    headers["X-Admin-Id"] = adminId;
  }

  return headers;
}

// ================= API CALL =================

export async function getAdminDashboardSummary() {
  const url = buildUrl(`${DASHBOARD_ROOT}/summary`, {
    recentLimit: 10,
    travelerPendingDays: 7,
  });

  try {
    const summary = await requestJson(url, { headers: getAdminAuthHeaders() });
    return summary && typeof summary === "object" ? summary : createEmptyAdminSummary();
  } catch (error) {
    console.warn("Admin dashboard summary unavailable; using empty dashboard.", error);
    return createEmptyAdminSummary();
  }
}

// ================= DERIVED DATA =================

export function deriveAdminMetrics(summary) {
  if (!summary) return null;

  const bus = summary.busBookings || {};
  const revenue = summary.revenueSnapshot || {};
  const pending = summary.pendingActions || {};

  const totalBookings = bus.total || 0;
  const cancelled = bus.cancelled || 0;
  const completed = bus.completed || 0;

  return {
    totalBookings,
    bookings: totalBookings,

    pendingBookings: pending.total || pending.cancellations || 0,
    pending: pending.total || 0,

    failedBookings: cancelled,
    failed: cancelled,

    revenue: revenue.totalRevenueInr || 0,
    totalRevenue: revenue.totalRevenueInr || 0,

    successfulBookings: completed,
    successful: completed,

    pendingWorks: pending.travelerUpdates || 0,
    pendingAmount: revenue.totalSavingsInr || 0,
  };
}

export function deriveAdminChartData(summary) {
  if (!summary) return null;

  const bus = summary.busBookings || {};

  const completed = bus.completed || 0;
  const cancelled = bus.cancelled || 0;
  const upcoming = bus.upcoming || 0;

  return {
    successful: [0.12, 0.15, 0.13, 0.16, 0.18, 0.14, 0.12].map(p =>
      Math.round(completed * p)
    ),
    failed: [0.18, 0.12, 0.2, 0.1, 0.15, 0.13, 0.12].map(p =>
      Math.round(cancelled * p)
    ),
    pending: [0.16, 0.18, 0.14, 0.17, 0.12, 0.15, 0.08].map(p =>
      Math.round(upcoming * p)
    ),
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  };
}

export function deriveAdminPendingWorks(summary) {
  if (!summary) return [];

  const pending = summary.pendingActions || {};
  const updates = summary.recentUpdateCounters || {};

  const works = [];

  if (pending.cancellations > 0)
    works.push({ id: "cancel", type: "Cancellation", count: pending.cancellations });

  if (pending.deposits > 0)
    works.push({ id: "deposit", type: "Deposits", count: pending.deposits });

  if (pending.travelerUpdates || updates.travelerUpdates)
    works.push({
      id: "traveler",
      type: "Traveler Updates",
      count: pending.travelerUpdates || updates.travelerUpdates || 0,
    });

  return works;
}

// ================= EXTRA APIs =================

export async function getAdminDashboardMetrics() {
  return deriveAdminMetrics(await getAdminDashboardSummary());
}

export async function getAdminDashboardChartData() {
  return deriveAdminChartData(await getAdminDashboardSummary());
}

export async function getAdminDashboardPendingWorks() {
  return deriveAdminPendingWorks(await getAdminDashboardSummary());
}

export async function getAdminDashboardRecentActivity() {
  return requestJson(
    buildUrl(`${DASHBOARD_ROOT}/recent-activity`),
    { headers: getAdminAuthHeaders() }
  );
}

export async function getAdminDashboardRevenueStats() {
  return requestJson(
    buildUrl(`${DASHBOARD_ROOT}/revenue-stats`),
    { headers: getAdminAuthHeaders() }
  );
}

export async function getAdminDashboardBookingStats() {
  return requestJson(
    buildUrl(`${DASHBOARD_ROOT}/booking-stats`),
    { headers: getAdminAuthHeaders() }
  );
}
