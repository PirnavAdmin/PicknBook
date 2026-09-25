/* eslint-disable */
import React, { useState, useEffect } from "react";
// ApiClient service

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
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

export function resolveApiBaseUrl() {
  // Always use same-origin relative API paths. Vite and Nginx proxy /api requests.
  return "";
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

function getHostnameWithoutWww(urlStr) {
  if (!urlStr) return "";
  try {
    const trimmed = String(urlStr).trim();
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const u = new URL(withProtocol);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isApiAssetOrigin(urlValue) {
  if (!isLocalDevelopment()) {
    return false;
  }

  try {
    const assetUrl = new URL(urlValue);
    const originHost = getHostnameWithoutWww(assetUrl.hostname);

    if (
      originHost.includes("unsplash.com") ||
      originHost.includes("cloudinary.com") ||
      originHost.includes("googleapis.com") ||
      originHost.includes("githubusercontent.com") ||
      originHost.includes("placeholder.com")
    ) {
      return false;
    }

    const configuredBase = process.env.REACT_APP_API_BASE_URL || "";
    const configuredProxy = process.env.REACT_APP_API_PROXY_TARGET || "";

    const targetHosts = [
      getHostnameWithoutWww(configuredBase),
      getHostnameWithoutWww(configuredProxy),
      "picknbook.in",
      "localhost",
      "127.0.0.1",
    ].filter(Boolean);

    if (targetHosts.some((th) => originHost === th || originHost.endsWith(`.${th}`)) || originHost.includes("ngrok")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function getDisplayFileName(fileOrUrl) {
  if (!fileOrUrl) return "No file chosen";
  if (typeof fileOrUrl === "object" && fileOrUrl.name) {
    return fileOrUrl.name;
  }
  if (typeof fileOrUrl === "string") {
    const clean = fileOrUrl.trim();
    if (!clean || clean === "-" || clean === "null" || clean === "undefined") return "No file chosen";
    try {
      const urlObj = clean.startsWith("http") ? new URL(clean) : null;
      const pathStr = urlObj ? urlObj.pathname : clean;
      const filename = pathStr.split("/").filter(Boolean).pop();
      return filename ? decodeURIComponent(filename) : clean;
    } catch {
      return clean.split("/").filter(Boolean).pop() || clean;
    }
  }
  return "No file chosen";
}

export function toApiAssetUrl(urlOrPath) {
  const normalizedUrlOrPath = sanitizeApiUrlValue(urlOrPath);

  if (!normalizedUrlOrPath) {
    return "";
  }

  let resultUrl = normalizedUrlOrPath;

  if (isLocalDevelopment() && /^https?:\/\//i.test(normalizedUrlOrPath)) {
    try {
      const parsed = new URL(normalizedUrlOrPath);
      const parsedHost = getHostnameWithoutWww(parsed.hostname);
      const configuredTarget = process.env.REACT_APP_API_PROXY_TARGET || process.env.REACT_APP_API_BASE_URL || "https://www.picknbook.in";
      const targetHost = getHostnameWithoutWww(configuredTarget);

      const isTargetMatch = (parsedHost && targetHost && parsedHost === targetHost) || parsedHost.includes("picknbook.in");
      const isNgrok = parsed.hostname.includes("ngrok");

      if (isTargetMatch || isNgrok) {
        resultUrl = parsed.pathname + parsed.search;
      }
    } catch {
      // ignore
    }
  }

  if (/^https?:\/\//i.test(resultUrl) || resultUrl.startsWith("data:") || resultUrl.startsWith("blob:")) {
    if (/^http:\/\//i.test(resultUrl)) {
      const host = getHostnameWithoutWww(resultUrl);
      if (host === "picknbook.in" || (typeof window !== "undefined" && window.location.protocol === "https:")) {
        resultUrl = resultUrl.replace(/^http:\/\//i, "https://");
      }
    }
  } else if (isLocalDevelopment()) {
    const cleanPath = String(resultUrl).replace(/^\/+/, "");
    resultUrl = `/${cleanPath}`;
  } else {
    resultUrl = toApiUrl(resultUrl);
  }

  if (resultUrl && (resultUrl.includes("ngrok") || resultUrl.includes("ngrok-free.dev"))) {
    const sep = resultUrl.includes("?") ? "&" : "?";
    if (!resultUrl.includes("ngrok-skip-browser-warning")) {
      resultUrl = `${resultUrl}${sep}ngrok-skip-browser-warning=true`;
    }
  }

  return resultUrl;
}

export function withNgrokSkipWarningHeader(urlOrPath, headers = {}) {
  return {
    ...headers,
  };
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
    if (payload.message || payload.Message) {
      return String(payload.message || payload.Message).trim();
    }
    if (payload.errors && typeof payload.errors === "object") {
      const messages = [];
      Object.values(payload.errors).forEach(err => {
        if (Array.isArray(err)) messages.push(...err);
        else if (typeof err === 'string') messages.push(err);
      });
      if (messages.length > 0) return messages.join(" ");
    }
    if (payload.title || payload.detail) {
      return String(payload.title || payload.detail).trim();
    }
    if (payload.error) {
      return String(payload.error).trim();
    }
    return String(fallbackMessage || "").trim();
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

export function NgrokSafeImage({ src, alt, style, className, onClick, onError, title, fallbackSrc = null }) {
  const [retryStage, setRetryStage] = useState(0);

  useEffect(() => {
    setRetryStage(0);
  }, [src]);

  let currentSrc = src;

  if (retryStage === 1 && typeof src === "string") {
    if (src.startsWith("/")) {
      currentSrc = `https://www.picknbook.in${src}`;
    } else if (src.startsWith("http://")) {
      currentSrc = src.replace(/^http:\/\//i, "https://");
    } else {
      currentSrc = fallbackSrc || null;
    }
  } else if (retryStage >= 2) {
    currentSrc = fallbackSrc || null;
  }

  const proxyTarget = process.env.REACT_APP_API_PROXY_TARGET || "";
  const isNgrokProxy = proxyTarget.includes("ngrok");

  if (currentSrc && typeof currentSrc === "string") {
    if (currentSrc.includes("ngrok") || currentSrc.includes("ngrok-free.dev") || isNgrokProxy) {
      const sep = currentSrc.includes("?") ? "&" : "?";
      if (!currentSrc.includes("ngrok-skip-browser-warning")) {
        currentSrc = `${currentSrc}${sep}ngrok-skip-browser-warning=true`;
      }
    }
  }

  const handleNativeError = (e) => {
    if (retryStage === 0 && typeof src === "string" && (src.startsWith("/") || src.startsWith("http://"))) {
      setRetryStage(1);
    } else if (retryStage < 2 && fallbackSrc) {
      setRetryStage(2);
    } else {
      setRetryStage(3);
    }
    if (onError) onError(e);
  };

  if (!currentSrc || retryStage >= 3) {
    return (
      <div style={{
        width: style?.width || '36px',
        height: style?.height || '36px',
        borderRadius: style?.borderRadius || '6px',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 500,
        color: '#94a3b8',
        margin: '0 auto'
      }}>
        No Img
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || ''}
      title={title}
      style={style}
      className={className}
      onClick={onClick}
      onError={handleNativeError}
    />
  );
}



