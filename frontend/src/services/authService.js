/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

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
    process.env.REACT_APP_AUTH_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

  const placesUrl = process.env.REACT_APP_PLACES_API_URL;
  if (placesUrl && placesUrl.trim()) {
    try {
      return new URL(placesUrl.trim()).origin;
    } catch {
      // Fall through to fallback host.
    }
  }

  return FALLBACK_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

export function toAuthUrl(urlOrPath) {
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
    const parsed = new URL(
      toAuthUrl(urlOrPath),
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    return (
      parsed.hostname.includes("ngrok-free.dev") ||
      parsed.hostname.includes("ngrok.io")
    );
  } catch {
    return false;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function readApiMessage(payload, fallback = "") {
  if (typeof payload === "string") {
    const text = payload.trim();

    if (!text) {
      return fallback;
    }

    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch?.[1]) {
      return preMatch[1].replace(/\s+/g, " ").trim();
    }

    const noTags = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return noTags || text;
  }

  if (payload && typeof payload === "object") {
    return normalizeText(
      payload.message ||
      payload.Message ||
      payload.error ||
      payload.Error ||
      payload.title ||
      payload.Title,
      fallback
    );
  }

  return fallback;
}

export async function requestAuth(
  urlOrPath,
  options = {},
  fallbackMessage = "Request failed. Please try again."
) {
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    Accept: "application/json, text/plain, */*",
    ...(options.headers || {}),
  };

  if (options.body && !isFormDataBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(toAuthUrl(urlOrPath), {
    ...options,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(readApiMessage(payload, fallbackMessage) || fallbackMessage);
  }

  return payload;
}

// ---------------------------------------------------------
// B2C (Customer) Authentication API Methods
// ---------------------------------------------------------

export async function sendLoginOtp(payload) {
  return requestAuth("/api/auth/send-login-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyLoginOtp(payload, guestId = null) {
  const headers = {};
  if (guestId) {
    headers["X-Guest-Id"] = guestId;
  }
  return requestAuth("/api/auth/verify-login-otp", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

export async function sendRegistrationOtp(payload) {
  return requestAuth("/api/auth/send-registration-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyRegistrationOtp(payload) {
  return requestAuth("/api/auth/verify-registration-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerCustomer(payload, guestId = null) {
  const headers = {};
  if (guestId) {
    headers["X-Guest-Id"] = guestId;
  }
  return requestAuth("/api/auth/register", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload, guestId = null) {
  const headers = {};
  if (guestId) {
    headers["X-Guest-Id"] = guestId;
  }
  return requestAuth("/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

export async function forgotPasswordSendOtp(payload) {
  return requestAuth("/api/auth/forgot-password/send-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function forgotPasswordVerifyOtp(payload) {
  return requestAuth("/api/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetPassword(payload) {
  return requestAuth("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function changePassword(payload, token) {
  return requestAuth("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}
