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
    } catch (adminRequestError) {
      if (adminRequestError?.name === 'AbortError' || adminRequestError?.code === 'ERR_CANCELED') throw adminRequestError;
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

export async function listAdminBusCoupons(params = {}) {
  const sType = (typeof params === "string" ? params : params?.type || params?.serviceType || "bus").toLowerCase();
  const cat = params?.category && params.category !== "all" ? params.category : null;
  const query = new URLSearchParams();
  if (sType && sType !== "all") query.set("type", sType);
  if (cat) query.set("category", cat);
  const qStr = query.toString();
  const url = `/api/admin/bus/coupons${qStr ? `?${qStr}` : ""}`;

  try {
    const response = await fetch(toApiUrl(url), {
      method: "GET",
      headers: getAdminAuthHeaders(),
    });
    if (response.ok) {
      return await handleResponse(response);
    }
  } catch (err) {
    if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') throw err;
    console.warn("listAdminBusCoupons error:", err);
  }
  return [];
}

// ---------------------------------------------------------
// COUPON / DISCOUNT CONDITIONS CRUD
// ---------------------------------------------------------

export async function createCondition(couponId, data, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();

  const payload = {
    conditionType: data.conditionType || data.ConditionType || "",
    conditionOperator: data.conditionOperator || data.ConditionOperator || data.operator || "Equals",
    operator: data.operator || data.conditionOperator || data.ConditionOperator || "Equals",
    value1: data.value1 !== undefined && data.value1 !== null ? String(data.value1).trim() : (data.value !== undefined ? String(data.value).trim() : ""),
    value2: data.value2 !== undefined && data.value2 !== null ? String(data.value2).trim() : null,
    value: data.value !== undefined ? String(data.value).trim() : (data.value1 !== undefined && data.value1 !== null ? String(data.value1).trim() : ""),
  };

  const primaryUrl = `/api/admin/bus/coupons/${couponId}/conditions?type=${sType}`;
  
  try {
    const response = await fetch(toApiUrl(primaryUrl), {
      method: "POST",
      headers: getAdminAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await handleResponse(response);
    }
    if (response.status === 404) {
      const fallbackUrl = `/api/admin/flight-promotions/${couponId}/conditions`;
      const fallbackResp = await fetch(toApiUrl(fallbackUrl), {
        method: "POST",
        headers: getAdminAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      if (fallbackResp.ok) {
        return await handleResponse(fallbackResp);
      }
    }
    return await handleResponse(response);
  } catch (err) {
    if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') throw err;
    throw err;
  }
}

export async function getConditions(couponId, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();
  const primaryUrl = `/api/admin/bus/coupons/${couponId}/conditions?type=${sType}`;

  try {
    const response = await fetch(toApiUrl(primaryUrl), {
      method: "GET",
      headers: getAdminAuthHeaders(),
    });
    if (response.ok) {
      const data = await handleResponse(response);
      return Array.isArray(data) ? data : [];
    }
    if (response.status === 404) {
      const fallbackUrl = `/api/admin/flight-promotions/${couponId}/conditions`;
      const fallbackResp = await fetch(toApiUrl(fallbackUrl), {
        method: "GET",
        headers: getAdminAuthHeaders(),
      });
      if (fallbackResp.ok) {
        const fallbackData = await handleResponse(fallbackResp);
        return Array.isArray(fallbackData) ? fallbackData : [];
      }
    }
    return await handleResponse(response);
  } catch (err) {
    if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') throw err;
    console.warn("Error fetching conditions:", err);
    return [];
  }
}

export async function updateCondition(conditionId, data, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();
  const payload = {
    conditionType: data.conditionType || data.ConditionType || "",
    conditionOperator: data.conditionOperator || data.ConditionOperator || data.operator || "Equals",
    operator: data.operator || data.conditionOperator || data.ConditionOperator || "Equals",
    value1: data.value1 !== undefined && data.value1 !== null ? String(data.value1).trim() : (data.value !== undefined ? String(data.value).trim() : ""),
    value2: data.value2 !== undefined && data.value2 !== null ? String(data.value2).trim() : null,
    value: data.value !== undefined ? String(data.value).trim() : (data.value1 !== undefined && data.value1 !== null ? String(data.value1).trim() : ""),
  };

  const primaryUrl = `/api/admin/bus/coupons/conditions/${conditionId}?type=${sType}`;

  const response = await fetch(toApiUrl(primaryUrl), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteCondition(conditionId, serviceType = "bus") {
  const sType = String(serviceType || "bus").toLowerCase();
  const primaryUrl = `/api/admin/bus/coupons/conditions/${conditionId}?type=${sType}`;

  const response = await fetch(toApiUrl(primaryUrl), {
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

export async function listAdminBusBookings({ passengerPhone, status } = {}, options = {}) {
  const params = new URLSearchParams();
  if (passengerPhone) params.append("passengerPhone", passengerPhone);
  if (status) params.append("status", status);
  const path = `/api/admin/bus/bookings/all${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(toApiUrl(path), {
    ...options,
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
