/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

// âœ… SINGLE SOURCE OF TRUTH
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

// ================= OVERVIEW API CALL (/api/Dashboard/overview) =================

export async function getAdminDashboardOverview() {
  const url = buildUrl("/api/Dashboard/overview");
  try {
    const data = await requestJson(url, { headers: getAdminAuthHeaders() });
    if (data && typeof data === "object") {
      return data;
    }
  } catch (error) {
    console.warn("GET /api/Dashboard/overview endpoint error; falling back.", error);
  }
  return null;
}

// ================= API CALL =================

let pendingSummaryPromise = null;
let cachedSummary = null;
let cachedSummaryTime = 0;
const SUMMARY_CACHE_TTL_MS = 2500;

export async function getAdminDashboardSummary({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedSummary && now - cachedSummaryTime < SUMMARY_CACHE_TTL_MS) {
    return cachedSummary;
  }

  if (!force && pendingSummaryPromise) {
    return pendingSummaryPromise;
  }

  pendingSummaryPromise = (async () => {
    try {
      // 1. Try GET /api/Dashboard/overview
      const overviewData = await getAdminDashboardOverview();
      if (overviewData && (overviewData.todayStatus || overviewData.metrics || overviewData.bookingFunnel || overviewData.revenueToday || overviewData.bookings)) {
        cachedSummary = overviewData;
        cachedSummaryTime = Date.now();
        return overviewData;
      }

      // 2. Fallback to /api/BDashboard/summary
      const url = buildUrl(`${DASHBOARD_ROOT}/summary`, {
        recentLimit: 10,
        travelerPendingDays: 7,
      });
      const summary = await requestJson(url, { headers: getAdminAuthHeaders() });
      const result = summary && typeof summary === "object" ? summary : createEmptyAdminSummary();
      cachedSummary = result;
      cachedSummaryTime = Date.now();
      return result;
    } catch (error) {
      console.warn("Admin dashboard summary unavailable; using empty dashboard.", error);
      return createEmptyAdminSummary();
    } finally {
      pendingSummaryPromise = null;
    }
  })();

  return pendingSummaryPromise;
}

// ================= DERIVED DATA =================

export function deriveAdminMetrics(summary) {
  if (!summary) return null;

  const m = summary.metrics || {};
  const todayStatus = summary.todayStatus || {};
  const revenueToday = summary.revenueToday || {};
  const bookings = summary.bookings || {};
  const pendingWorks = summary.pendingWorks || {};
  const bus = summary.busBookings || {};
  const flight = summary.flightBookings || {};
  const revenue = summary.revenueSnapshot || {};
  const pending = summary.pendingActions || {};

  const totalBookings =
    m.totalBookings !== undefined && m.totalBookings !== null
      ? Number(m.totalBookings)
      : todayStatus.totalBookings !== undefined && todayStatus.totalBookings !== null
      ? Number(todayStatus.totalBookings)
      : summary.totalBookings !== undefined && summary.totalBookings !== null
      ? Number(summary.totalBookings)
      : (bus.total || 0) + (flight.total || 0);

  const successful =
    todayStatus.successfulBookings !== undefined
      ? Number(todayStatus.successfulBookings)
      : bookings.successfulToday !== undefined
      ? Number(bookings.successfulToday)
      : (flight.completed || 0) + (bus.completed || 0) || (summary.totalBookings || 0);

  const failed =
    todayStatus.failedBookings !== undefined
      ? Number(todayStatus.failedBookings)
      : bookings.failedToday !== undefined
      ? Number(bookings.failedToday)
      : (flight.cancelled || 0) + (bus.cancelled || 0) || (pending.cancellations || 0);

  const totalRevenue =
    m.totalRevenue !== undefined && m.totalRevenue !== null
      ? Number(m.totalRevenue)
      : revenueToday.amountInr !== undefined && revenueToday.amountInr !== null
      ? Number(revenueToday.amountInr)
      : todayStatus.revenueInr !== undefined && todayStatus.revenueInr !== null
      ? Number(todayStatus.revenueInr)
      : revenue.totalRevenueInr !== undefined && revenue.totalRevenueInr !== null
      ? Number(revenue.totalRevenueInr)
      : 0;

  const totalUsers =
    m.totalUsers !== undefined && m.totalUsers !== null
      ? Number(m.totalUsers)
      : summary.usersCount !== undefined && summary.usersCount !== null
      ? Number(summary.usersCount)
      : 0;

  const activeBookings =
    m.activeBookings !== undefined && m.activeBookings !== null
      ? Number(m.activeBookings)
      : (flight.upcoming || 0) + (bus.upcoming || 0);

  const cancelledBookings =
    m.cancelledBookings !== undefined && m.cancelledBookings !== null
      ? Number(m.cancelledBookings)
      : failed;

  const refundRequests =
    m.refundRequests !== undefined && m.refundRequests !== null
      ? Number(m.refundRequests)
      : pending.cancellations || 0;

  const pendingCount =
    todayStatus.pendingWorks !== undefined
      ? Number(todayStatus.pendingWorks)
      : pendingWorks.total !== undefined
      ? Number(pendingWorks.total)
      : pending.total || pending.travelerUpdates || 0;

  return {
    totalBookings,
    bookings: totalBookings,

    totalUsers,
    users: totalUsers,

    pendingBookings: activeBookings || pendingCount,
    pending: pendingCount,
    activeBookings,

    failedBookings: cancelledBookings,
    failed: cancelledBookings,
    cancelledBookings,

    revenue: totalRevenue,
    totalRevenue,

    successfulBookings: successful,
    successful,

    pendingWorks: pendingCount,
    pendingAmount: Number(revenue.totalSavingsInr || 0),
    refundRequests,

    revenueGrowth: m.revenueGrowthPercent ?? revenueToday.growthPercentVsYesterday ?? 5.0,
    bookingsGrowth: m.bookingsGrowthPercent ?? bookings.successfulGrowthPercent ?? 5.0,
    usersGrowth: m.usersGrowthPercent ?? 5.0,
    activeBookingsGrowth: m.activeBookingsGrowthPercent ?? 0,
    cancelledBookingsGrowth: m.cancelledBookingsGrowthPercent ?? 0,
    refundRequestsGrowth: m.refundRequestsGrowthPercent ?? 0,

    failedGrowth: bookings.failedGrowthPercent ?? -100.0,
    security: summary.security || null,
    weeklyChart: summary.weeklyChart || null,
    bookingFunnel: summary.bookingFunnel || null,
    topSellingRoutes: summary.topSellingRoutes || null,
    topHotels: summary.topHotels || null,
    todayStatus: summary.todayStatus || null,
    pendingWorksDetail: pendingWorks || null,

    flightBookings: flight,
    busBookings: bus,
  };
}

export function deriveAdminChartData(summary) {
  if (!summary) return null;

  if (summary.weeklyChart && Array.isArray(summary.weeklyChart.labels)) {
    return {
      successful: summary.weeklyChart.successfulBookings || [],
      failed: summary.weeklyChart.failedBookings || [],
      pending: (summary.weeklyChart.successfulBookings || []).map(val => Math.round(val * 0.1)),
      labels: summary.weeklyChart.labels,
    };
  }

  const bus = summary.busBookings || {};
  const flight = summary.flightBookings || {};

  const completed = (flight.completed || 0) + (bus.completed || 0) || (summary.totalBookings || 0);
  const cancelled = (flight.cancelled || 0) + (bus.cancelled || 0);
  const upcoming = (flight.upcoming || 0) + (bus.upcoming || 0);

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

  if (summary.pendingWorks && Array.isArray(summary.pendingWorks.buckets)) {
    return summary.pendingWorks.buckets.map(b => ({
      id: b.key,
      type: b.label,
      count: b.items || 0,
    }));
  }

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

export async function getAdminDashboardRecentActivity(providedSummary) {
  let summary = providedSummary;
  if (!summary) {
    try {
      summary = await getAdminDashboardSummary();
    } catch {
      return [];
    }
  }

  const rawList =
    summary?.recentUpdates ||
    summary?.RecentUpdates ||
    summary?.recentActivities ||
    summary?.RecentActivities ||
    summary?.activities ||
    summary?.Activities ||
    [];

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((item, index) => {
      const type = item.type || item.Type || "booking";
      const message =
        item.message ||
        item.Message ||
        item.description ||
        item.Description ||
        "Recent activity update";
      const timestamp =
        item.occurredAtUtc ||
        item.OccurredAtUtc ||
        item.date ||
        item.Date ||
        item.createdAt ||
        item.CreatedAt ||
        null;
      let timeAgo = "Just now";
      if (timestamp) {
        try {
          const d = new Date(timestamp);
          if (!Number.isNaN(d.getTime())) {
            const isToday = new Date().toDateString() === d.toDateString();
            timeAgo = isToday
              ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
          }
        } catch {
          timeAgo = "Just now";
        }
      }

      return {
        id: item.id || `activity-${index + 1}`,
        type,
        message,
        timeAgo,
      };
    });
  }

  return [];
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
