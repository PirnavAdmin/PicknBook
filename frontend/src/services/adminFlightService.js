/* eslint-disable */
import { toApiUrl, readResponsePayload } from "./apiClient";
import { getAuthToken } from "./authSession";

const ADMIN_FLIGHT_ROOT = "/api/admin/flight";
const ADMIN_FLIGHT_MARKUPS_ROOT = "/api/admin/flight-markups";
const ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT = "/api/admin/flight-convenience-fee-rules";

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

async function requestAdminJson(path, options = {}) {
  const url = toApiUrl(path);
  const hasBody = Boolean(options.body);
  const headers = {
    ...getAdminAuthHeaders(hasBody),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

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

function pickFirst(source, keys, fallback = null) {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return fallback;
}

// ---------------------------------------------------------
// MARKUP PAYLOAD & NORMALIZATION HELPERS
// ---------------------------------------------------------

export const toFlightMarkupRequestPayload = (formData = {}) => {
  const tripTypeMap = {
    'OneWay': 0, '0': 0, 0: 0,
    'RoundTrip': 1, 'TwoWay': 1, '1': 1, 1: 1,
    'MultiCity': 2, 'Both': 2, '2': 2, 2: 2
  };

  const markupTypeMap = {
    'Flat': 0, 'flat': 0, 'fixed': 0, 'Fixed': 0, '0': 0, 0: 0,
    'Percentage': 1, 'percentage': 1, 'percent': 1, '1': 1, 1: 1
  };

  return {
    ...(formData.id ? { id: formData.id } : {}),
    airlineCode: (formData.airlineCode || '*').trim().toUpperCase(),
    tripType: typeof formData.tripType === 'number' ? formData.tripType : (tripTypeMap[formData.tripType] ?? 0),
    markupType: typeof formData.markupType === 'number' ? formData.markupType : (markupTypeMap[formData.markupType] ?? 0),
    markupValue: Number(formData.markupValue) || 0,
    cabinClass: (formData.cabinClass || '*').trim(),
    priority: Number(formData.priority) || 1,
    isActive: Boolean(formData.isActive)
  };
};

export const normalizeFlightMarkupResponse = (item) => {
  if (!item) return item;
  const tripTypeToId = { 'OneWay': 0, 'RoundTrip': 1, 'MultiCity': 2 };

  let tripTypeStr = item.tripType ?? item.TripType;
  if (typeof tripTypeStr === "number") {
    const idToTripType = { 0: "OneWay", 1: "RoundTrip", 2: "MultiCity" };
    tripTypeStr = idToTripType[tripTypeStr] || "OneWay";
  }

  let markupTypeStr = item.markupType ?? item.MarkupType;
  if (typeof markupTypeStr === "number") {
    const idToMarkupType = { 0: "Flat", 1: "Percentage" };
    markupTypeStr = idToMarkupType[markupTypeStr] || "Percentage";
  } else if (String(markupTypeStr).toLowerCase() === "fixed") {
    markupTypeStr = "Flat";
  }

  return {
    ...item,
    id: item.id ?? item.Id,
    airlineCode: String(item.airlineCode ?? item.AirlineCode ?? "*"),
    tripType: tripTypeStr ?? "OneWay",
    cabinClass: String(item.cabinClass ?? item.CabinClass ?? "*"),
    markupType: markupTypeStr ?? "Percentage",
    markupValue: Number(item.markupValue ?? item.MarkupValue ?? 0),
    priority: Number(item.priority ?? item.Priority ?? 1),
    isActive: (item.isActive ?? item.IsActive ?? true) !== false,
    createdAtUtc: item.createdAtUtc ?? item.CreatedAtUtc ?? null,
    updatedAtUtc: item.updatedAtUtc ?? item.UpdatedAtUtc ?? null,
    tripTypeLabel: tripTypeStr ?? "OneWay",
    tripTypeId: typeof item.tripType === "number" ? item.tripType : (tripTypeToId[tripTypeStr] ?? 0)
  };
};

export const normalizeFlightMarkupRecord = (record) => {
  if (!record) return record;
  const norm = normalizeFlightMarkupResponse(record);
  return {
    ...norm,
    id: pickFirst(record, ["id", "Id"], norm.id),
    airlineCode: String(pickFirst(record, ["airlineCode", "AirlineCode"], norm.airlineCode) || "*"),
    markupValue: Number(pickFirst(record, ["markupValue", "MarkupValue"], norm.markupValue)) || 0,
    cabinClass: String(pickFirst(record, ["cabinClass", "CabinClass", "travelClass", "TravelClass", "class", "Class"], norm.cabinClass) || "*").trim(),
    priority: Number(pickFirst(record, ["priority", "Priority"], norm.priority)) || 1,
    isActive: pickFirst(record, ["isActive", "IsActive"], norm.isActive) !== false,
    createdAtUtc: pickFirst(record, ["createdAtUtc", "CreatedAtUtc"], norm.createdAtUtc),
    updatedAtUtc: pickFirst(record, ["updatedAtUtc", "UpdatedAtUtc"], norm.updatedAtUtc),
  };
};

// ---------------------------------------------------------
// B2C FLIGHT MARKUPS API
// ---------------------------------------------------------

export async function listFlightMarkups() {
  const data = await requestAdminJson(ADMIN_FLIGHT_MARKUPS_ROOT, { method: "GET" });
  return Array.isArray(data)
    ? data.map((record) => normalizeFlightMarkupRecord(record))
    : [];
}

export async function createFlightMarkup(markup) {
  const data = await requestAdminJson(ADMIN_FLIGHT_MARKUPS_ROOT, {
    method: "POST",
    body: JSON.stringify(toFlightMarkupRequestPayload(markup)),
  });
  return normalizeFlightMarkupRecord(data);
}

export async function updateFlightMarkup(markupId, markup) {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_MARKUPS_ROOT}/${markupId}`, {
    method: "PUT",
    body: JSON.stringify(toFlightMarkupRequestPayload(markup)),
  });
  return normalizeFlightMarkupRecord(data);
}

export async function deleteFlightMarkup(markupId) {
  return requestAdminJson(`${ADMIN_FLIGHT_MARKUPS_ROOT}/${markupId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------
// CONVENIENCE FEE RULES API
// ---------------------------------------------------------

function toConvenienceFeeRuleRequestPayload(rule) {
  return {
    tripType: rule.tripType || "OneWay",
    feeType: rule.feeType || "Flat",
    feeValue: Number(rule.feeValue || rule.value || 0) || 0,
    isActive: rule.isActive !== false,
  };
}

function normalizeConvenienceFeeRuleRecord(record) {
  if (!record) return record;
  return {
    ...record,
    id: record.id || record.Id,
    feeValue: Number(record.feeValue ?? record.FeeValue ?? 0),
    isActive: (record.isActive ?? record.IsActive ?? true) !== false,
  };
}

export async function listConvenienceFeeRules() {
  const data = await requestAdminJson(ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT, { method: "GET" });
  return Array.isArray(data) ? data.map(normalizeConvenienceFeeRuleRecord) : [];
}

export async function createConvenienceFeeRule(rule) {
  const data = await requestAdminJson(ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT, {
    method: "POST",
    body: JSON.stringify(toConvenienceFeeRuleRequestPayload(rule)),
  });
  return normalizeConvenienceFeeRuleRecord(data);
}

export async function updateConvenienceFeeRule(ruleId, rule) {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT}/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(toConvenienceFeeRuleRequestPayload(rule)),
  });
  return normalizeConvenienceFeeRuleRecord(data);
}

export async function getConvenienceFee() {
  return listConvenienceFeeRules();
}

export async function createConvenienceFee(rule) {
  return createConvenienceFeeRule(rule);
}

export async function deleteConvenienceFee(ruleId) {
  return requestAdminJson(`${ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT}/${ruleId}`, {
    method: "DELETE",
  });
}

export async function updateConvenienceFeeById(ruleId, rule) {
  return updateConvenienceFeeRule(ruleId, rule);
}

// ---------------------------------------------------------
// CANCELLATIONS & AMENDMENTS API
// ---------------------------------------------------------

export async function listAdminCancellations() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/cancellations`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createAdminCancellation(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/cancellations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCancellation(cancellationId, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/cancellations/${cancellationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listAdminAmendments() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/amendments`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function updateAdminAmendment(amendmentId, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/amendments/${amendmentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------
// FLIGHT COUPONS & PROMOTIONS API
// ---------------------------------------------------------

export async function listFlightCoupons() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/coupons`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createFlightCoupon(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/coupons`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightCoupon(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/coupons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightCoupon(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/coupons/${id}`, { method: "DELETE" });
}

export async function listFlightPromotions() {
  return requestAdminJson("/api/admin/flight-promotions", { method: "GET" });
}

export async function getFlightPromotionById(id) {
  return requestAdminJson(`/api/admin/flight-promotions/${id}`, { method: "GET" });
}

export async function createFlightPromotion(payload) {
  return requestAdminJson("/api/admin/flight-promotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightPromotion(id, payload) {
  return requestAdminJson(`/api/admin/flight-promotions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightPromotion(id) {
  return requestAdminJson(`/api/admin/flight-promotions/${id}`, { method: "DELETE" });
}

export async function listUsedCoupons() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/coupons/used`, { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data.map((record) => ({
    id: record.id,
    bookingId: record.bookingId,
    couponCode: record.couponCode,
    usedDate: record.usedDateUtc || record.usedDate || "",
    totalFare: record.totalFareInr ?? record.totalFare ?? 0,
    cpnType: record.couponType || record.cpnType || "Fixed",
    cpnValue: record.couponValue ?? record.cpnValue ?? 0,
    cpnAmount: record.couponAmountInr ?? record.cpnAmount ?? 0,
    bookingStatus: record.bookingStatus || "Confirmed",
  }));
}

// ---------------------------------------------------------
// FLIGHT DISCOUNTS API
// ---------------------------------------------------------

export async function listFlightDiscounts() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createFlightDiscount(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightDiscount(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightDiscount(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts/${id}`, { method: "DELETE" });
}

export async function listDiscountConditions(id) {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts/${id}/conditions`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function addDiscountCondition(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts/${id}/conditions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDiscountCondition(id, conditionId) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/discounts/${id}/conditions/${conditionId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------
// POPULAR DESTINATIONS & ROUTES API
// ---------------------------------------------------------

export async function listPopularDestinations() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createPopularDestination(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePopularDestination(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePopularDestination(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations/${id}`, { method: "DELETE" });
}

export async function getPopularDestinations() {
  return listPopularDestinations();
}

export async function getPopularFlightRoutes() {
  const data = await requestAdminJson("/api/flight/popular-routes", { method: "GET" });
  return data || [];
}

export async function createPopularFlightRoute(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-routes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePopularFlightRoute(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-routes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePopularFlightRoute(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/popular-routes/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------
// AIRLINE WEB CHECK-INS API
// ---------------------------------------------------------

export async function listAirlineWebChecks() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/web-checkins`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function createAirlineWebCheck(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/web-checkins`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAirlineWebCheck(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/web-checkins/${id}`, { method: "DELETE" });
}

export async function listAirlineWebCheckins() {
  return listAirlineWebChecks();
}

export async function createAirlineWebCheckin(link) {
  return createAirlineWebCheck(link);
}

export async function deleteAirlineWebCheckin(linkId) {
  return deleteAirlineWebCheck(linkId);
}

// ---------------------------------------------------------
// BOOKINGS, REMARKS & PENDING AIRLINES API
// ---------------------------------------------------------

export async function listAdminFlightBookings() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/bookings`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

export async function getFlightRemarks() {
  return requestAdminJson("/api/admin/flight/remarks", { method: "GET" });
}

export async function createFlightRemark(payload) {
  return requestAdminJson("/api/admin/flight/remarks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFlightRemarkById(id) {
  return requestAdminJson(`/api/admin/flight/remarks/${id}`, { method: "GET" });
}

export async function updateFlightRemark(id, payload) {
  return requestAdminJson(`/api/admin/flight/remarks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightRemark(id) {
  return requestAdminJson(`/api/admin/flight/remarks/${id}`, { method: "DELETE" });
}

export async function listFlightPendingAirlines() {
  const data = await requestAdminJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines`, { method: "GET" });
  return data || [];
}

export async function deleteFlightPendingAirline(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, { method: "DELETE" });
}

export async function getFlightPendingAirlineById(id) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, { method: "GET" });
}

export async function createFlightPendingAirline(payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightPendingAirline(id, payload) {
  return requestAdminJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
