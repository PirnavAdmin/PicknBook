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
// MARKUP SETTINGS
// ---------------------------------------------------------

export async function getBusMarkupSettings() {
  const response = await fetch(toApiUrl("/api/admin/bus/markup-settings"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getBusMarkupSettingById(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/markup-settings/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createBusMarkupSetting(data) {
  const response = await fetch(toApiUrl("/api/admin/bus/markup-settings"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateBusMarkupSetting(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/markup-settings/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteBusMarkupSetting(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/markup-settings/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// GST SETTINGS
// ---------------------------------------------------------

export async function getBusGstSettings() {
  const response = await fetch(toApiUrl("/api/admin/bus/gst-settings"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getBusGstSettingById(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/gst-settings/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createBusGstSetting(data) {
  const response = await fetch(toApiUrl("/api/admin/bus/gst-settings"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateBusGstSetting(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/gst-settings/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteBusGstSetting(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/gst-settings/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// DISCOUNTS CRUD
// ---------------------------------------------------------

export async function listDiscounts() {
  const response = await fetch(toApiUrl("/api/admin/bus/discounts"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getDiscount(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createDiscount(data) {
  const response = await fetch(toApiUrl("/api/admin/bus/discounts"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateDiscount(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteDiscount(id) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// DISCOUNT CONDITIONS CRUD
// ---------------------------------------------------------

export async function createCondition(discountId, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/${discountId}/conditions`), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function getConditions(discountId) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/${discountId}/conditions`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateCondition(conditionId, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/conditions/${conditionId}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteCondition(conditionId) {
  const response = await fetch(toApiUrl(`/api/admin/bus/discounts/conditions/${conditionId}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// CONVENIENCE FEE SETTINGS
// ---------------------------------------------------------

export async function getConvenienceFee() {
  const response = await fetch(toApiUrl("/api/admin/bus/convenience-fee"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateConvenienceFee(data) {
  const response = await fetch(toApiUrl("/api/admin/bus/convenience-fee"), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// CANCELLATION REPORTS
// ---------------------------------------------------------

export async function getCancellationReports() {
  const response = await fetch(toApiUrl("/api/admin/bus/cancellations"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function listAdminBusBookings({ passengerPhone, status, pnr, journeyDate, limit = 200 } = {}) {
  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (status && status !== "all") params.append("status", status);
  if (pnr) params.append("pnr", pnr);
  if (journeyDate) params.append("journeyDate", journeyDate);
  if (passengerPhone) params.append("passengerPhone", passengerPhone);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const primaryPath = `/api/admin/bus/bookings${queryString}`;

  try {
    const response = await fetch(toApiUrl(primaryPath), {
      method: "GET",
      headers: getAdminAuthHeaders(),
    });
    if (response.ok) {
      return await handleResponse(response);
    }
  } catch (err) {
    // Fallback to /all endpoint if primary endpoint fails
  }

  const fallbackPath = `/api/admin/bus/bookings/all${queryString}`;
  const response = await fetch(toApiUrl(fallbackPath), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// UNIFIED COUPON MANAGEMENT (Bus / Hotel / Flight)
// All endpoints use /api/admin/bus/coupons with ?type= param
// ---------------------------------------------------------

/**
 * List all coupons for a given service type.
 * @param {"bus"|"hotel"|"flight"} type - Service type
 * @param {"Coupon"|"Offer"} [category] - Promotion category (bus only)
 */
export async function listCoupons(type = "bus", category) {
  const params = new URLSearchParams();
  params.append("type", type);
  if (category) params.append("category", category);

  const response = await fetch(toApiUrl(`/api/admin/bus/coupons?${params.toString()}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get single coupon details by ID.
 * @param {number|string} id - Coupon ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 */
export async function getCouponById(id, type = "bus") {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/${id}?type=${type}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * Create a new coupon. The `type` field must be included in the request body.
 * @param {object} data - BusCouponRequestDto payload
 */
export async function createCoupon(data) {
  const response = await fetch(toApiUrl("/api/admin/bus/coupons"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Update an existing coupon.
 * @param {number|string} id - Coupon ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 * @param {object} data - BusCouponRequestDto payload
 */
export async function updateCoupon(id, type = "bus", data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/${id}?type=${type}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Delete a coupon and its conditions.
 * @param {number|string} id - Coupon ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 */
export async function deleteCoupon(id, type = "bus") {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/${id}?type=${type}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// COUPON CONDITIONS CRUD
// ---------------------------------------------------------

/**
 * Get all conditions for a coupon.
 * @param {number|string} couponId - Coupon ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 */
export async function getCouponConditions(couponId, type = "bus") {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/${couponId}/conditions?type=${type}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * Add or set a DayOfWeek condition for a coupon.
 * @param {number|string} couponId - Coupon ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 * @param {object} data - CreateBusCouponConditionDto payload
 */
export async function createCouponCondition(couponId, type = "bus", data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/${couponId}/conditions?type=${type}`), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Update a condition's operator or day value.
 * @param {number|string} conditionId - Condition ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 * @param {object} data - UpdateBusCouponConditionDto payload
 */
export async function updateCouponCondition(conditionId, type = "bus", data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/conditions/${conditionId}?type=${type}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Delete a specific condition.
 * @param {number|string} conditionId - Condition ID
 * @param {"bus"|"hotel"|"flight"} type - Service type
 */
export async function deleteCouponCondition(conditionId, type = "bus") {
  const response = await fetch(toApiUrl(`/api/admin/bus/coupons/conditions/${conditionId}?type=${type}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}
