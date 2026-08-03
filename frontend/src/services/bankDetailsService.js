/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const BANK_DETAILS_ROOT = "/api/BankDetails";
const BANK_UPI_DETAILS_ROOT = "/api/BankUpiDetails";

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
    process.env.REACT_APP_BANK_API_BASE_URL;

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

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function resolveAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return normalizeText(window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token"), "");
  } catch {
    return "";
  }
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.value)) {
      return payload.value;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }
  }

  return [];
}

async function parseJsonOrText(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function requestJson(urlOrPath, options = {}) {
  const resolvedToken = resolveAuthToken();
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    Accept: "application/json",
    ...(resolvedToken && !options?.headers?.Authorization
      ? { Authorization: `Bearer ${resolvedToken}` }
      : {}),
    ...(options.headers || {}),
  };

  if (options.body && !isFormDataBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(toAbsoluteUrl(urlOrPath), {
    ...options,
    headers,
  });

  const payload = await parseJsonOrText(response);

  if (!response.ok) {
    const message = normalizeErrorMessage(payload);
    throw new Error(message || "Request failed. Please try again.");
  }

  return payload;
}

async function requestBlob(urlOrPath, options = {}) {
  const resolvedToken = resolveAuthToken();
  const headers = {
    Accept: "image/*,application/octet-stream",
    ...(resolvedToken && !options?.headers?.Authorization
      ? { Authorization: `Bearer ${resolvedToken}` }
      : {}),
    ...(options.headers || {}),
  };

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(toAbsoluteUrl(urlOrPath), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    const message = normalizeErrorMessage(payload);
    throw new Error(message || "Unable to fetch QR image.");
  }

  return response.blob();
}

function normalizeBankDetail(record) {
  const id = toNumber(pickFirst(record, ["id", "Id"], 0), 0);

  return {
    id,
    sr: toNumber(pickFirst(record, ["sr", "Sr"], 0), 0),
    userId: normalizeText(pickFirst(record, ["userId", "UserId"], ""), ""),
    bankName: normalizeText(pickFirst(record, ["bankName", "BankName"], ""), ""),
    accountHolderName: normalizeText(
      pickFirst(record, ["accountHolderName", "AccountHolderName"], ""),
      ""
    ),
    accountNumber: normalizeText(
      pickFirst(record, ["accountNumber", "AccountNumber"], ""),
      ""
    ),
    branch: normalizeText(pickFirst(record, ["branch", "Branch"], ""), ""),
    ifsc: normalizeText(pickFirst(record, ["ifsc", "Ifsc"], ""), ""),
    type: normalizeText(pickFirst(record, ["type", "Type"], ""), ""),
    createdAtUtc: pickFirst(record, ["createdAtUtc", "CreatedAtUtc"], null),
    updatedAtUtc: pickFirst(record, ["updatedAtUtc", "UpdatedAtUtc"], null),
  };
}

function normalizeBankUpiDetail(record) {
  const id = toNumber(pickFirst(record, ["id", "Id"], 0), 0);
  const rawQrImageUrl = normalizeText(
    pickFirst(record, ["qrImageUrl", "QrImageUrl"], ""),
    ""
  );

  return {
    id,
    sr: toNumber(pickFirst(record, ["sr", "Sr"], 0), 0),
    userId: normalizeText(pickFirst(record, ["userId", "UserId"], ""), ""),
    bankName: normalizeText(pickFirst(record, ["bankName", "BankName"], ""), ""),
    accountHolderName: normalizeText(
      pickFirst(record, ["accountHolderName", "AccountHolderName"], ""),
      ""
    ),
    upiId: normalizeText(pickFirst(record, ["upiId", "UpiId"], ""), ""),
    mobile: normalizeText(pickFirst(record, ["mobile", "Mobile"], ""), ""),
    hasQrImage: Boolean(
      pickFirst(record, ["hasQrImage", "HasQrImage"], rawQrImageUrl !== "")
    ),
    qrImageUrl: rawQrImageUrl ? toAbsoluteUrl(rawQrImageUrl) : "",
    qrContentType: normalizeText(
      pickFirst(record, ["qrContentType", "QrContentType"], ""),
      ""
    ),
    qrFileName: normalizeText(pickFirst(record, ["qrFileName", "QrFileName"], ""), ""),
    createdAtUtc: pickFirst(record, ["createdAtUtc", "CreatedAtUtc"], null),
    updatedAtUtc: pickFirst(record, ["updatedAtUtc", "UpdatedAtUtc"], null),
  };
}

function normalizePayloadWithMessage(payload, fallbackMessage) {
  if (typeof payload === "string") {
    return { message: normalizeText(payload, fallbackMessage) };
  }

  if (payload && typeof payload === "object") {
    return {
      ...payload,
      message: normalizeText(payload.message, fallbackMessage),
    };
  }

  return { message: fallbackMessage };
}

function unwrapEntityPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const nested = pickFirst(payload, ["value", "Value", "data", "Data", "item", "Item"], null);
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested;
  }

  return payload;
}

function resolveNumericId(value, label) {
  const numeric = toNumber(value, NaN);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`Invalid ${label}.`);
  }

  return numeric;
}

export async function listBankDetails({ userId } = {}) {
  const payload = await requestJson(BANK_DETAILS_ROOT, {
    method: "GET",
    userId,
  });

  return normalizeListPayload(payload).map((record) => normalizeBankDetail(record));
}

export async function createBankDetail(payload, { userId } = {}) {
  const result = await requestJson(BANK_DETAILS_ROOT, {
    method: "POST",
    userId,
    body: JSON.stringify(payload),
  });

  return normalizeBankDetail(unwrapEntityPayload(result));
}

export async function updateBankDetail(bankId, payload, { userId } = {}) {
  const id = resolveNumericId(bankId, "bank id");
  const result = await requestJson(`${BANK_DETAILS_ROOT}/${id}`, {
    method: "PUT",
    userId,
    body: JSON.stringify(payload),
  });

  return normalizeBankDetail(unwrapEntityPayload(result));
}

export async function deleteBankDetail(bankId, { userId } = {}) {
  const id = resolveNumericId(bankId, "bank id");
  const result = await requestJson(`${BANK_DETAILS_ROOT}/${id}`, {
    method: "DELETE",
    userId,
  });

  return normalizePayloadWithMessage(result, "Bank detail deleted successfully.");
}

export async function listBankUpiDetails({ userId } = {}) {
  const payload = await requestJson(BANK_UPI_DETAILS_ROOT, {
    method: "GET",
    userId,
  });

  return normalizeListPayload(payload).map((record) => normalizeBankUpiDetail(record));
}

export async function createBankUpiDetail(payload, { userId } = {}) {
  const result = await requestJson(BANK_UPI_DETAILS_ROOT, {
    method: "POST",
    userId,
    body: JSON.stringify(payload),
  });

  return normalizeBankUpiDetail(unwrapEntityPayload(result));
}

export async function updateBankUpiDetail(upiNumericId, payload, { userId } = {}) {
  const id = resolveNumericId(upiNumericId, "UPI record id");
  const result = await requestJson(`${BANK_UPI_DETAILS_ROOT}/${id}`, {
    method: "PUT",
    userId,
    body: JSON.stringify(payload),
  });

  return normalizeBankUpiDetail(unwrapEntityPayload(result));
}

export async function uploadBankUpiQr(upiNumericId, qrFile, { userId } = {}) {
  const id = resolveNumericId(upiNumericId, "UPI record id");

  if (typeof File === "undefined" || !(qrFile instanceof File)) {
    throw new Error("QR file is required.");
  }

  const formData = new FormData();
  formData.append("QrFile", qrFile);

  const result = await requestJson(`${BANK_UPI_DETAILS_ROOT}/${id}/upload-qr`, {
    method: "PUT",
    userId,
    body: formData,
  });

  return normalizeBankUpiDetail(unwrapEntityPayload(result));
}

export async function deleteBankUpiDetail(upiNumericId, { userId } = {}) {
  const id = resolveNumericId(upiNumericId, "UPI record id");
  const result = await requestJson(`${BANK_UPI_DETAILS_ROOT}/${id}`, {
    method: "DELETE",
    userId,
  });

  return normalizePayloadWithMessage(result, "UPI detail deleted successfully.");
}

export async function fetchBankUpiQrBlob(upiNumericId, { userId } = {}) {
  const id = resolveNumericId(upiNumericId, "UPI record id");
  return requestBlob(`${BANK_UPI_DETAILS_ROOT}/${id}/qr`, {
    method: "GET",
    userId,
  });
}
