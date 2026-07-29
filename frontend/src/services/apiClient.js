/* eslint-disable */
// ApiClient service


const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeApiBaseUrlCandidate(candidate) {
  const trimmed = String(candidate ?? "").trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      let pathname = String(parsed.pathname || "/");

      pathname = pathname.replace(/\/+$/, "");
      if (!pathname) {
        pathname = "/";
      }

      if (/\/api$/i.test(pathname)) {
        pathname = pathname.replace(/\/api$/i, "");
        pathname = pathname.replace(/\/+$/, "");

        if (!pathname) {
          pathname = "/";
        }
      }

      if (pathname === "/") {
        return parsed.origin;
      }

      return `${parsed.origin}${pathname}`;
    } catch {
      return trimmed;
    }
  }

  let relative = trimmed.replace(/\/+$/, "");

  if (/\/api$/i.test(relative)) {
    relative = relative.replace(/\/api$/i, "");
    relative = relative.replace(/\/+$/, "");
  }

  if (!relative || relative === "/") {
    return "";
  }

  return relative;
}

function getAbsoluteOrigin(candidate) {
  const normalized = normalizeApiBaseUrlCandidate(candidate);

  if (!/^https?:\/\//i.test(normalized)) {
    return "";
  }

  try {
    return new URL(normalized).origin;
  } catch {
    return "";
  }
}

export function isLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

export function resolveApiBaseUrl() {
  const preferProxyInDev =
    isLocalDevelopment() &&
    String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() !==
    "true";

  if (preferProxyInDev) {
    return "";
  }

  const explicitBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_AUTH_API_BASE_URL ||
    process.env.REACT_APP_API_PROXY_TARGET;

  if (explicitBase && explicitBase.trim()) {
    return normalizeApiBaseUrlCandidate(explicitBase);
  }

  // When a Places API host is configured, reuse it so all APIs stay on the same backend.
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

export function toApiUrl(urlOrPath) {
  const normalizedUrlOrPath = sanitizeApiUrlValue(urlOrPath);

  if (!normalizedUrlOrPath) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedUrlOrPath)) {
    return normalizedUrlOrPath;
  }

  const apiBaseUrl = resolveApiBaseUrl();
  if (apiBaseUrl) {
    return `${apiBaseUrl.replace(/\/+$/, "")}/${String(normalizedUrlOrPath).replace(
      /^\/+/,
      ""
    )}`;
  }

  return normalizedUrlOrPath;
}

export function sanitizeApiUrlValue(urlOrPath) {
  let value = String(urlOrPath ?? "").trim();

  if (!value) {
    return "";
  }

  value = value.replace(/^["'`]+|["'`]+$/g, "");
  value = value.replace(
    /(?:%22|%2522|%27|%2527|%60|%2560|&quot;|&#34;|&#39;|["'`])+$/gi,
    ""
  );

  return value.trim().replace(/\\/g, "/");
}

function isApiAssetOrigin(urlValue) {
  if (!isLocalDevelopment()) {
    return false;
  }

  try {
    const assetUrl = new URL(urlValue);
    const assetOrigins = [
      resolveApiBaseUrl(),
      process.env.REACT_APP_API_PROXY_TARGET,
      process.env.REACT_APP_API_BASE_URL,
      process.env.REACT_APP_AUTH_API_BASE_URL,
      process.env.REACT_APP_BUS_API_BASE_URL,
      process.env.REACT_APP_PLACES_API_URL,
      FALLBACK_API_BASE_URL,
    ]
      .map(getAbsoluteOrigin)
      .filter(Boolean);

    return assetOrigins.includes(assetUrl.origin);
  } catch {
    return false;
  }
}

export function toApiAssetUrl(urlOrPath) {
  const normalizedUrlOrPath = sanitizeApiUrlValue(urlOrPath);

  if (!normalizedUrlOrPath) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedUrlOrPath)) {
    if (isApiAssetOrigin(normalizedUrlOrPath)) {
      const parsed = new URL(normalizedUrlOrPath);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return normalizedUrlOrPath;
  }

  if (isLocalDevelopment()) {
    const cleanPath = String(normalizedUrlOrPath).replace(/^\/+/, "");
    return `/${cleanPath}`;
  }

  return toApiUrl(normalizedUrlOrPath);
}

export function withNgrokSkipWarningHeader(urlOrPath, headers = {}) {
  const nextHeaders = {
    ...headers,
    "User-Agent": "custom-app-client",
  };

  try {
    const parsed = new URL(
      toApiUrl(urlOrPath),
      typeof window !== "undefined" ? window.location.origin : undefined
    );

    if (
      parsed.hostname.includes("ngrok-free.dev") ||
      parsed.hostname.includes("ngrok.io")
    ) {
      nextHeaders["ngrok-skip-browser-warning"] = "true";
    }
  } catch {
    // Keep the request usable for relative URLs and non-browser contexts.
  }

  return nextHeaders;
}

export async function readResponsePayload(response) {
  const contentType = response?.headers?.get?.("content-type") || "";
  const normalizedType = String(contentType || "").toLowerCase();

  if (normalizedType.includes("json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  try {
    return await response.text();
  } catch {
    return "";
  }
}

export function normalizeResponseMessage(payload, fallbackMessage = "") {
  if (payload && typeof payload === "object") {
    return String(payload.message || payload.Message || fallbackMessage || "").trim();
  }

  const text = String(payload || "").trim();
  if (!text) {
    return String(fallbackMessage || "").trim();
  }

  const lower = text.toLowerCase();
  const ngrokEndpointMatch = text.match(
    /The endpoint\s+([^\s<]+)\s+is offline\.?\s*\(ERR_NGROK_3200\)/i
  );

  if (ngrokEndpointMatch?.[1] || lower.includes("err_ngrok_3200")) {
    const endpoint = String(ngrokEndpointMatch?.[1] || "").trim();
    return [
      "Ngrok tunnel is offline (ERR_NGROK_3200).",
      endpoint ? `Endpoint: ${endpoint}.` : "",
      "If your backend is running, update your ngrok URL / proxy target and restart the frontend dev server.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const dataPayloadMatch = text.match(/data-payload="([^"]+)"/i);
  const dataPayloadRaw = String(dataPayloadMatch?.[1] || "").trim();
  if (dataPayloadRaw && typeof atob === "function") {
    try {
      const decoded = atob(dataPayloadRaw);
      const parsed = JSON.parse(decoded) || {};
      const code = String(parsed.code || "").trim();

      if (code === "3200") {
        const message = String(parsed.message || "").trim();
        return [
          "Ngrok tunnel is offline (code 3200).",
          message ? `${message}` : "",
          "If your backend is running, update your ngrok URL / proxy target and restart the frontend dev server.",
        ]
          .filter(Boolean)
          .join(" ");
      }
    } catch {
      // Ignore decode failures.
    }
  }

  if (lower.includes("<!doctype html") || lower.includes("<html")) {
    const noTags = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return noTags || String(fallbackMessage || "").trim();
  }

  return text;
}

export function NgrokSafeImage({ src, alt, style, className, onClick, onError, title }) {
  const handleNativeError = (e) => {
    e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600";
    if (onError) onError(e);
  };

  const defaultPlaceholder = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600";

  return (
    <img
      src={src || defaultPlaceholder}
      alt={alt}
      title={title}
      style={style}
      className={className}
      onClick={onClick}
      onError={handleNativeError}
    />
  );
}



