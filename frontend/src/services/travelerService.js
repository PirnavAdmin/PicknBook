/* eslint-disable */
import {
  normalizeResponseMessage,
  readResponsePayload,
  toApiUrl,
  withNgrokSkipWarningHeader,
} from "./apiClient";
import { getAuthToken, getAuthUserId } from "./authSession";
import { toDdMmYyyy, toYyyyMmDd } from "../utils/apiDateFormat";

const TRAVELERS_ROOT = "/api/travelers";

function getTravelerUserId() {
  return String(getAuthUserId() || "").trim();
}

function getAuthHeaders() {
  const token = getAuthToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requestJson(urlOrPath, options = {}) {
  if (options.requireUserId && !getTravelerUserId()) {
    throw new Error("Sign in to sync traveler details.");
  }

  const headers = withNgrokSkipWarningHeader(urlOrPath, {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  });

  const { requireUserId, ...fetchOptions } = options;
  const response = await fetch(toApiUrl(urlOrPath), {
    ...fetchOptions,
    headers,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(normalizeResponseMessage(payload, "Traveler request failed."));
  }

  return payload;
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const titleValues = new Set(["Mr", "Mrs", "Ms"]);
  const title = titleValues.has(parts[0]) ? parts[0] : "";
  const nameParts = title ? parts.slice(1) : parts;

  return {
    title,
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" "),
  };
}

function calculateAge(dob) {
  const dateInput = toYyyyMmDd(dob);
  const birthDate = new Date(dateInput);

  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : "";
}

export function normalizeTraveler(record) {
  const parsedName = splitName(record?.name);
  const title = record?.title || record?.Title || parsedName.title || "Mr";
  const firstName = record?.firstName || record?.FirstName || parsedName.firstName;
  const lastName = record?.lastName || record?.LastName || parsedName.lastName;
  const dob = record?.dob || record?.Dob || "";

  return {
    id: record?.id || record?.Id,
    type: record?.type || record?.Type || "Adult",
    title,
    firstName,
    lastName,
    name:
      record?.name ||
      [title, firstName, lastName].filter(Boolean).join(" ") ||
      "Traveler",
    gender: record?.gender || record?.Gender || "",
    dob,
    dobInput: toYyyyMmDd(dob),
    email: record?.email || record?.Email || "",
    mobile: record?.mobile || record?.phone || record?.phoneNo || record?.PhoneNo || "",
    phone: record?.phone || record?.phoneNo || record?.PhoneNo || record?.mobile || "",
    passportNo: record?.passportNo || record?.PassportNo || "",
    country: record?.country || record?.Country || "India",
    age: record?.age || calculateAge(dob),
  };
}

export function buildTravelerPayload(traveler) {
  const parsedName = splitName(traveler?.name);
  const title = traveler?.title || parsedName.title || "Mr";
  const firstName = traveler?.firstName || parsedName.firstName;
  const lastName = traveler?.lastName || parsedName.lastName;

  return {
    type: traveler?.type || "Adult",
    title,
    firstName,
    lastName,
    gender: traveler?.gender || "Male",
    dob: toDdMmYyyy(traveler?.dob || traveler?.dobInput),
    email: traveler?.email || "",
    phoneNo: traveler?.phoneNo || traveler?.phone || traveler?.mobile || "",
    passportNo: traveler?.passportNo || "",
    country: traveler?.country || "India",
    age: traveler?.age ? Number(traveler.age) : 1,
  };
}

export async function listTravelers(params = {}) {
  if (!getTravelerUserId()) {
    return [];
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const text = String(value || "").trim();
    if (text) {
      searchParams.set(key, text);
    }
  });

  const path = searchParams.toString()
    ? `${TRAVELERS_ROOT}?${searchParams.toString()}`
    : TRAVELERS_ROOT;
  const payload = await requestJson(path, { method: "GET", requireUserId: true });

  return Array.isArray(payload) ? payload.map(normalizeTraveler) : [];
}

export async function createTraveler(traveler) {
  const payload = await requestJson(TRAVELERS_ROOT, {
    method: "POST",
    requireUserId: true,
    body: JSON.stringify(buildTravelerPayload(traveler)),
  });

  return normalizeTraveler(payload);
}

export async function updateTraveler(travelerId, traveler) {
  const payload = await requestJson(`${TRAVELERS_ROOT}/${travelerId}`, {
    method: "PUT",
    requireUserId: true,
    body: JSON.stringify(buildTravelerPayload(traveler)),
  });

  return normalizeTraveler(payload);
}

export async function deleteTraveler(travelerId) {
  return requestJson(`${TRAVELERS_ROOT}/${travelerId}`, {
    method: "DELETE",
    requireUserId: true,
  });
}
