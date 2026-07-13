const FALLBACK_API_BASE_URL =
  "https://undogmatically-knotlike-evita.ngrok-free.dev";
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

  const explicitBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_DASHBOARD_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

  const placesUrl = process.env.REACT_APP_PLACES_API_URL;
  if (placesUrl && placesUrl.trim()) {
    try {
      return new URL(placesUrl.trim()).origin;
    } catch {
      // Fall through to fallback.
    }
  }

  return FALLBACK_API_BASE_URL;
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
  const token = resolveAuthToken();
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

function normalizeRecentUpdate(item, index) {
  return {
    id: `recent-update-${index + 1}`,
    type: String(pickFirst(item, ["type", "Type"], "") || "").trim(),
    message: String(pickFirst(item, ["message", "Message"], "") || "").trim(),
    occurredAtUtc: pickFirst(item, ["occurredAtUtc", "OccurredAtUtc"], null),
  };
}

function normalizeTopRoute(item, index) {
  return {
    id: `top-route-${index + 1}`,
    tripType: String(pickFirst(item, ["tripType", "TripType"], "") || "").trim(),
    fromCity: String(pickFirst(item, ["fromCity", "FromCity"], "") || "").trim(),
    toCity: String(pickFirst(item, ["toCity", "ToCity"], "") || "").trim(),
    searchCount: toNumber(pickFirst(item, ["searchCount", "SearchCount"], 0)),
    bookingCount: toNumber(pickFirst(item, ["bookingCount", "BookingCount"], 0)),
    score: toNumber(pickFirst(item, ["score", "Score"], 0)),
  };
}

function normalizeDashboardSummary(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const pendingActions = pickFirst(
    safePayload,
    ["pendingActions", "PendingActions"],
    {}
  );
  const revenueSnapshot = pickFirst(
    safePayload,
    ["revenueSnapshot", "RevenueSnapshot"],
    {}
  );
  const busBookings = pickFirst(safePayload, ["busBookings", "BusBookings"], {});
  const recentUpdateCounters = pickFirst(
    safePayload,
    ["recentUpdateCounters", "RecentUpdateCounters"],
    {}
  );
  const recentUpdatesRaw = pickFirst(
    safePayload,
    ["recentUpdates", "RecentUpdates"],
    []
  );
  const topRoutesRaw = pickFirst(safePayload, ["topRoutes", "TopRoutes"], []);

  return {
    totalBookings: toNumber(pickFirst(safePayload, ["totalBookings", "TotalBookings"], 0)),
    completionRatePercent: toNumber(
      pickFirst(safePayload, ["completionRatePercent", "CompletionRatePercent"], 0)
    ),
    pendingActions: {
      cancellations: toNumber(
        pickFirst(pendingActions, ["cancellations", "Cancellations"], 0)
      ),
      deposits: toNumber(pickFirst(pendingActions, ["deposits", "Deposits"], 0)),
      travelerUpdates: toNumber(
        pickFirst(pendingActions, ["travelerUpdates", "TravelerUpdates"], 0)
      ),
      total: toNumber(pickFirst(pendingActions, ["total", "Total"], 0)),
    },
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
    busBookings: {
      completed: toNumber(pickFirst(busBookings, ["completed", "Completed"], 0)),
      upcoming: toNumber(pickFirst(busBookings, ["upcoming", "Upcoming"], 0)),
      cancelled: toNumber(pickFirst(busBookings, ["cancelled", "Cancelled"], 0)),
      total: toNumber(pickFirst(busBookings, ["total", "Total"], 0)),
    },
    recentUpdates: Array.isArray(recentUpdatesRaw)
      ? recentUpdatesRaw.map((item, index) => normalizeRecentUpdate(item, index))
      : [],
    recentUpdateCounters: {
      bookingUpdates: toNumber(
        pickFirst(recentUpdateCounters, ["bookingUpdates", "BookingUpdates"], 0)
      ),
      cancellationUpdates: toNumber(
        pickFirst(
          recentUpdateCounters,
          ["cancellationUpdates", "CancellationUpdates"],
          0
        )
      ),
      travelerUpdates: toNumber(
        pickFirst(recentUpdateCounters, ["travelerUpdates", "TravelerUpdates"], 0)
      ),
      walletPaymentUpdates: toNumber(
        pickFirst(
          recentUpdateCounters,
          ["walletPaymentUpdates", "WalletPaymentUpdates"],
          0
        )
      ),
      bankAddUpdates: toNumber(
        pickFirst(recentUpdateCounters, ["bankAddUpdates", "BankAddUpdates"], 0)
      ),
    },
    topRoutes: Array.isArray(topRoutesRaw)
      ? topRoutesRaw.map((item, index) => normalizeTopRoute(item, index))
      : [],
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
