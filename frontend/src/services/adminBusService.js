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
// COUPON / DISCOUNT CONDITIONS CRUD
// ---------------------------------------------------------

export async function createCondition(couponId, data, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();

  const primaryPath = sType === "flight"
    ? `/api/admin/flight/discounts/${couponId}/conditions`
    : `/api/admin/${sType}/coupons/${couponId}/conditions?type=${sType}`;

  const fallbackPath = sType === "flight"
    ? `/api/admin/flight/coupons/${couponId}/conditions?type=${sType}`
    : `/api/admin/${sType}/discounts/${couponId}/conditions`;

  try {
    const response = await fetch(toApiUrl(primaryPath), {
      method: "POST",
      headers: getAdminAuthHeaders(true),
      body: JSON.stringify(data),
    });
    if (response.status === 404) {
      throw new Error("404_NOT_FOUND");
    }
    return await handleResponse(response);
  } catch (err) {
    if (err.message === "404_NOT_FOUND" || err.message?.includes("404")) {
      const fbResponse = await fetch(toApiUrl(fallbackPath), {
        method: "POST",
        headers: getAdminAuthHeaders(true),
        body: JSON.stringify(data),
      });
      return await handleResponse(fbResponse);
    }
    throw err;
  }
}

export async function getConditions(couponId, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();

  const primaryPath = sType === "flight"
    ? `/api/admin/flight/discounts/${couponId}/conditions`
    : `/api/admin/${sType}/coupons/${couponId}/conditions?type=${sType}`;

  const fallbackPath = sType === "flight"
    ? `/api/admin/flight/coupons/${couponId}/conditions?type=${sType}`
    : `/api/admin/${sType}/discounts/${couponId}/conditions`;

  try {
    const response = await fetch(toApiUrl(primaryPath), {
      method: "GET",
      headers: getAdminAuthHeaders(),
    });
    if (response.status === 404) {
      throw new Error("404_NOT_FOUND");
    }
    return await handleResponse(response);
  } catch (err) {
    if (err.message === "404_NOT_FOUND" || err.message?.includes("404")) {
      const fbResponse = await fetch(toApiUrl(fallbackPath), {
        method: "GET",
        headers: getAdminAuthHeaders(),
      });
      return await handleResponse(fbResponse);
    }
    throw err;
  }
}

export async function updateCondition(conditionId, data, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();

  const primaryPath = sType === "flight"
    ? `/api/admin/flight/discounts/conditions/${conditionId}`
    : `/api/admin/${sType}/coupons/conditions/${conditionId}?type=${sType}`;

  const fallbackPath = sType === "flight"
    ? `/api/admin/flight/coupons/conditions/${conditionId}?type=${sType}`
    : `/api/admin/${sType}/discounts/conditions/${conditionId}`;

  try {
    const response = await fetch(toApiUrl(primaryPath), {
      method: "PUT",
      headers: getAdminAuthHeaders(true),
      body: JSON.stringify(data),
    });
    if (response.status === 404) {
      throw new Error("404_NOT_FOUND");
    }
    return await handleResponse(response);
  } catch (err) {
    if (err.message === "404_NOT_FOUND" || err.message?.includes("404")) {
      const fbResponse = await fetch(toApiUrl(fallbackPath), {
        method: "PUT",
        headers: getAdminAuthHeaders(true),
        body: JSON.stringify(data),
      });
      return await handleResponse(fbResponse);
    }
    throw err;
  }
}

export async function deleteCondition(conditionId, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();

  const primaryPath = sType === "flight"
    ? `/api/admin/flight/discounts/conditions/${conditionId}`
    : `/api/admin/${sType}/coupons/conditions/${conditionId}?type=${sType}`;

  const fallbackPath = sType === "flight"
    ? `/api/admin/flight/coupons/conditions/${conditionId}?type=${sType}`
    : `/api/admin/${sType}/discounts/conditions/${conditionId}`;

  try {
    const response = await fetch(toApiUrl(primaryPath), {
      method: "DELETE",
      headers: getAdminAuthHeaders(),
    });
    if (response.status === 404) {
      throw new Error("404_NOT_FOUND");
    }
    return await handleResponse(response);
  } catch (err) {
    if (err.message === "404_NOT_FOUND" || err.message?.includes("404")) {
      const fbResponse = await fetch(toApiUrl(fallbackPath), {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      return await handleResponse(fbResponse);
    }
    throw err;
  }
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

export async function listAdminBusBookings({ passengerPhone, status } = {}) {
  const params = new URLSearchParams();
  if (passengerPhone) params.append("passengerPhone", passengerPhone);
  if (status) params.append("status", status);
  const path = `/api/admin/bus/bookings/all${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(toApiUrl(path), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateBusCancellation(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/bus/cancellations/${id}`), {
    method: "PATCH",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}
