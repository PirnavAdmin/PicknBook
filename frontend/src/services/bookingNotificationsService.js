/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const NOTIFICATIONS_ROOT = "/api/Notifications";
const NOTIFICATIONS_ROUTE = `${NOTIFICATIONS_ROOT}/booking-confirmation`;
const OPEN_API_ROUTE = "/openapi/v1.json";

let cachedNotificationEndpointAvailable = null;

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
    process.env.REACT_APP_NOTIFICATIONS_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

  const placesUrl = process.env.REACT_APP_PLACES_API_URL;
  if (placesUrl && placesUrl.trim()) {
    try {
      return new URL(placesUrl.trim()).origin;
    } catch {
      // Fall through to default host.
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

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
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
    if (typeof payload === "string") {
      const clean = payload.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      throw new Error(clean || "Notification request failed.");
    }

    throw new Error(payload?.message || "Notification request failed.");
  }

  return payload;
}

async function hasNotificationEndpoint() {
  if (cachedNotificationEndpointAvailable !== null) {
    return cachedNotificationEndpointAvailable;
  }

  try {
    const doc = await requestJson(OPEN_API_ROUTE, { method: "GET" });
    const paths = doc?.paths || {};
    const routeKeys = Object.keys(paths).map((item) => item.toLowerCase());

    cachedNotificationEndpointAvailable = routeKeys.includes(
      NOTIFICATIONS_ROUTE.toLowerCase()
    );
    return cachedNotificationEndpointAvailable;
  } catch {
    cachedNotificationEndpointAvailable = false;
    return false;
  }
}

function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.startsWith("0") && digits.length > 10) {
    return digits.slice(1);
  }

  return digits;
}

function openChannelLink(url) {
  if (typeof window === "undefined" || !url) {
    return "Failed";
  }

  try {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    return popup ? "Opened" : "Blocked";
  } catch {
    return "Failed";
  }
}

function buildNotificationMessage({
  bookingReference,
  ticketType,
  providerName,
  fromCity,
  toCity,
  departureTime,
}) {
  const travelType = String(ticketType || "Travel").toUpperCase();
  return [
    `${travelType} Booking Confirmed`,
    `Reference: ${bookingReference || "--"}`,
    `Provider: ${providerName || "--"}`,
    `Route: ${fromCity || "--"} to ${toCity || "--"}`,
    `Departure: ${departureTime || "--"}`,
    "Thank you for booking with us.",
  ].join("\n");
}

function dispatchThroughClientChannels({
  email,
  smsNumber,
  whatsappNumber,
  subject,
  message,
}) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedMessage = encodeURIComponent(message);

  const emailStatus = email
    ? openChannelLink(`mailto:${email}?subject=${encodedSubject}&body=${encodedMessage}`)
    : "Skipped";

  const smsStatus = smsNumber
    ? openChannelLink(`sms:${smsNumber}?body=${encodedMessage}`)
    : "Skipped";

  const whatsappStatus = whatsappNumber
    ? openChannelLink(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`)
    : "Skipped";

  return {
    email: emailStatus,
    sms: smsStatus,
    whatsapp: whatsappStatus,
    source: "client",
  };
}

function normalizeChannelStatus(status, fallbackLabel) {
  const normalized = String(status || fallbackLabel || "queued").toLowerCase();

  if (normalized.includes("deliver")) {
    return "Delivered";
  }

  if (normalized.includes("sent")) {
    return "Sent";
  }

  if (normalized.includes("open")) {
    return "Opened";
  }

  if (normalized.includes("block")) {
    return "Blocked";
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return "Failed";
  }

  if (normalized.includes("skip")) {
    return "Skipped";
  }

  return "Queued";
}

export async function sendBookingNotifications({
  bookingReference,
  ticketType,
  providerName,
  fromCity,
  toCity,
  departureTime,
  contact,
  preferClientDispatch = false,
}) {
  const email = String(contact?.email || "").trim();
  const mobileRaw = String(contact?.mobile || "").trim();
  const smsNumber = normalizePhoneDigits(mobileRaw);

  const whatsappEnabled = Boolean(contact?.whatsappUpdates);
  const whatsappRaw = String(contact?.whatsappNumber || mobileRaw).trim();
  const whatsappNumber = whatsappEnabled ? normalizePhoneDigits(whatsappRaw) : "";

  const hasAnyChannel = email || smsNumber || whatsappNumber;

  if (!hasAnyChannel) {
    return {
      email: "Skipped",
      sms: "Skipped",
      whatsapp: "Skipped",
      source: "none",
    };
  }

  const subject = `Booking Confirmed: ${bookingReference || "Travel Ticket"}`;
  const message = buildNotificationMessage({
    bookingReference,
    ticketType,
    providerName,
    fromCity,
    toCity,
    departureTime,
  });

  if (!preferClientDispatch) {
    const hasEndpoint = await hasNotificationEndpoint();

    if (hasEndpoint) {
      try {
        const payload = {
          bookingReference,
          ticketType,
          providerName,
          fromCity,
          toCity,
          departureTime,
          channels: {
            email: email || null,
            mobile: smsNumber || null,
            whatsapp: whatsappNumber || null,
          },
          message,
          subject,
        };

        const response = await requestJson(NOTIFICATIONS_ROUTE, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const channels = response?.channels || response || {};

        return {
          email: normalizeChannelStatus(channels.email, email ? "sent" : "skipped"),
          sms: normalizeChannelStatus(
            channels.sms || channels.mobile,
            smsNumber ? "sent" : "skipped"
          ),
          whatsapp: normalizeChannelStatus(
            channels.whatsapp,
            whatsappNumber ? "sent" : "skipped"
          ),
          source: "api",
        };
      } catch {
        // Fall back to client channel dispatch below.
      }
    }
  }

  const clientDispatch = dispatchThroughClientChannels({
    email,
    smsNumber,
    whatsappNumber,
    subject,
    message,
  });

  return {
    email: normalizeChannelStatus(clientDispatch.email, email ? "opened" : "skipped"),
    sms: normalizeChannelStatus(clientDispatch.sms, smsNumber ? "opened" : "skipped"),
    whatsapp: normalizeChannelStatus(
      clientDispatch.whatsapp,
      whatsappNumber ? "opened" : "skipped"
    ),
    source: clientDispatch.source,
  };
}
