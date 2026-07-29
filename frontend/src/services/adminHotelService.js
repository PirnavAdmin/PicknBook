/* eslint-disable */
import { toApiUrl, readResponsePayload } from "./apiClient";
import { getAuthToken } from "./authSession";

function getAdminAuthHeaders(hasBody = false) {
  const sanitize = (val) => {
    const text = String(val ?? "").trim();
    return (text === "undefined" || text === "null") ? "" : text;
  };

  const token = typeof window !== "undefined"
    ? sanitize(window.localStorage.getItem("adminToken")) || sanitize(getAuthToken()) || sanitize(window.localStorage.getItem("token"))
    : "";

  const adminId = typeof window !== "undefined"
    ? sanitize(window.localStorage.getItem("adminId"))
    : "";

  const headers = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (adminId) {
    headers["X-Admin-Id"] = adminId;
  }

  return headers;
}

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorPayload = await readResponsePayload(response);
      errorMessage =
        errorPayload?.message ||
        errorPayload?.Message ||
        errorPayload?.error ||
        errorPayload?.title ||
        response.statusText ||
        "An error occurred";
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }
  return await readResponsePayload(response);
}

// ---------------------------------------------------------
// HOTEL PROMOTIONS (COUPONS) CRUD
// ---------------------------------------------------------

export async function listHotelPromotions() {
  const response = await fetch(toApiUrl("/api/admin/hotel-coupons"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getHotelPromotion(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-coupons/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createHotelPromotion(data) {
  const response = await fetch(toApiUrl("/api/admin/hotel-coupons"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateHotelPromotion(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-coupons/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteHotelPromotion(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-coupons/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL PROMOTION USAGE LOGS
// ---------------------------------------------------------

export async function getHotelPromotionUsages() {
  return [];
}

// ---------------------------------------------------------
// HOTEL CONVENIENCE FEE SETTINGS
// ---------------------------------------------------------

export async function getHotelConvenienceFees() {
  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  const data = await handleResponse(response);
  return (data || []).map((setting) => ({
    id: setting.id,
    feeInr: setting.convenienceFeeValue,
    status: setting.isActive ? "Active" : "Inactive",
    entryDateUtc: setting.createdAtUtc,
    updateDateUtc: setting.updatedAtUtc,
  }));
}

export async function saveHotelConvenienceFee(data) {
  // Fetch existing settings to preserve markup and GST settings
  const existingResponse = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  const existingList = await handleResponse(existingResponse);
  const activeRule = existingList.find((r) => r.isActive) || existingList[0] || {};

  const payload = {
    markupType: activeRule.markupType || "Amount",
    markupValue: activeRule.markupValue || 0,
    convenienceFeeType: "Amount",
    convenienceFeeValue: data.feeInr,
    gstPercent: activeRule.gstPercent || 0,
    isActive: true,
  };

  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL GST SETTINGS
// ---------------------------------------------------------

export async function getHotelGstSettings() {
  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  const data = await handleResponse(response);
  return (data || []).map((setting) => ({
    id: setting.id,
    gstPercent: setting.gstPercent,
    gstCategory: "Hotel",
    status: setting.isActive ? "Active" : "Inactive",
    entryDateUtc: setting.createdAtUtc,
    updateDateUtc: setting.updatedAtUtc,
    remark: setting.updatedBy || "",
  }));
}

export async function saveHotelGstSetting(data) {
  // Fetch existing settings to preserve markup and convenience fee settings
  const existingResponse = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  const existingList = await handleResponse(existingResponse);
  const activeRule = existingList.find((r) => r.isActive) || existingList[0] || {};

  const payload = {
    markupType: activeRule.markupType || "Amount",
    markupValue: activeRule.markupValue || 0,
    convenienceFeeType: activeRule.convenienceFeeType || "Amount",
    convenienceFeeValue: activeRule.convenienceFeeValue || 0,
    gstPercent: data.gstPercent,
    isActive: true,
  };

  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL PRICING RULES CRUD
// ---------------------------------------------------------

export async function listHotelPricingRules() {
  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getHotelPricingRuleById(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-pricing/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createHotelPricingRule(data) {
  const response = await fetch(toApiUrl("/api/admin/hotel-pricing"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateHotelPricingRule(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-pricing/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteHotelPricingRule(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-pricing/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL BOOKINGS & CANCELLATIONS & SEARCH HISTORY (ADMIN)
// ---------------------------------------------------------

export async function listHotelBookings({ passengerPhone, status } = {}) {
  const query = new URLSearchParams();
  if (passengerPhone) query.set("passengerPhone", passengerPhone);
  if (status) query.set("status", status);
  const queryString = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(toApiUrl(`/api/admin/hotel/bookings${queryString}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function listHotelCancellations() {
  const response = await fetch(toApiUrl("/api/admin/hotel/cancellations"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function cancelHotelBookingByAdmin(bookingId, { reason, cancellationCharges }) {
  const response = await fetch(toApiUrl(`/api/admin/hotel/bookings/${bookingId}/cancel`), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ reason, cancellationCharges }),
  });
  return handleResponse(response);
}

export async function listHotelSearchHistory({ searchTerm } = {}) {
  const query = new URLSearchParams();
  if (searchTerm) query.set("searchTerm", searchTerm);
  const queryString = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(toApiUrl(`/api/admin/hotel/search-history${queryString}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL POPULAR DESTINATIONS (aggregated from search history)
// ---------------------------------------------------------

/** Recursively unwrap nested API envelopes until we find an array */
function findFirstHotelArray(value, depth = 0) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object" || depth > 5) return null;

  const PREFERRED_KEYS = [
    "$values", "data", "Data", "items", "Items",
    "records", "Records", "results", "Results",
    "value", "Value", "list", "List",
    "searchHistory", "SearchHistory",
    "hotelSearchHistory", "HotelSearchHistory",
    "searches", "Searches",
  ];

  for (const key of PREFERRED_KEYS) {
    const found = findFirstHotelArray(value[key], depth + 1);
    if (found) return found;
  }

  // Last resort: walk all object values
  for (const nested of Object.values(value)) {
    if (Array.isArray(nested) && nested.length > 0) return nested;
  }

  return null;
}

function extractHotelRecords(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  return findFirstHotelArray(raw) || [];
}

function normalizeHotelText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pickHotelField(record, keys, fallback = null) {
  if (!record || typeof record !== "object") return fallback;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return fallback;
}

function aggregateHotelDestinations(records) {
  const destMap = new Map();

  records.forEach((record, index) => {
    // The hotel search history table uses `row.searchQuery` as the city/destination label
    const city = normalizeHotelText(
      pickHotelField(record, [
        "searchQuery", "SearchQuery",
        "destination", "Destination",
        "city", "City",
        "location", "Location",
        "hotelCity", "HotelCity",
        "cityName", "CityName",
        "destinationCity", "DestinationCity",
        "query", "Query",
        "name", "Name",
      ], "")
    );

    if (!city) return;

    const key = city.toLowerCase().replace(/\s+/g, " ");
    const current = destMap.get(key) || {
      id: `hotel-dest-${index + 1}`,
      city,
      searches: 0,
      latestSearchDateUtc: null,
    };

    current.searches += 1;

    const rawDate = pickHotelField(record, [
      "searchedAtUtc", "SearchedAtUtc",
      "createdAtUtc", "CreatedAtUtc",
      "searchDate", "SearchDate",
      "createdAt", "CreatedAt",
      "timestamp", "Timestamp",
    ], null);

    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        const existing = current.latestSearchDateUtc
          ? new Date(current.latestSearchDateUtc)
          : null;
        if (!existing || parsed > existing) {
          current.latestSearchDateUtc = rawDate;
        }
      }
    }

    destMap.set(key, current);
  });

  return Array.from(destMap.values()).sort((a, b) => b.searches - a.searches);
}

export async function getPopularHotelDestinationsFromSearchHistory({ limit = 10 } = {}) {
  let rawResponse = null;
  let records = [];

  try {
    rawResponse = await listHotelSearchHistory({});

    // Unwrap any envelope the API may have returned
    records = extractHotelRecords(rawResponse);

    // Debug: log what the API returned so data-shape issues are visible in devtools
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        "[HotelPopularDestinations] raw API response:",
        rawResponse,
        "→ extracted records:",
        records.length
      );
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[HotelPopularDestinations] API error:", err?.message || err);
    }
    records = [];
  }

  const aggregated = aggregateHotelDestinations(records);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[HotelPopularDestinations] aggregated destinations:", aggregated);
  }

  return aggregated.slice(0, limit);
}

