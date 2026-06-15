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
// HOTEL PROMOTIONS CRUD
// ---------------------------------------------------------

export async function listHotelPromotions() {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getHotelPromotion(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-promotions/${id}`), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createHotelPromotion(data) {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateHotelPromotion(id, data) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-promotions/${id}`), {
    method: "PUT",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteHotelPromotion(id) {
  const response = await fetch(toApiUrl(`/api/admin/hotel-promotions/${id}`), {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL PROMOTION USAGE LOGS
// ---------------------------------------------------------

export async function getHotelPromotionUsages() {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions/usages"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL CONVENIENCE FEE SETTINGS
// ---------------------------------------------------------

export async function getHotelConvenienceFees() {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions/convenience-fees"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function saveHotelConvenienceFee(data) {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions/convenience-fees"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// HOTEL GST SETTINGS
// ---------------------------------------------------------

export async function getHotelGstSettings() {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions/gst-settings"), {
    method: "GET",
    headers: getAdminAuthHeaders(),
  });
  return handleResponse(response);
}

export async function saveHotelGstSetting(data) {
  const response = await fetch(toApiUrl("/api/admin/hotel-promotions/gst-settings"), {
    method: "POST",
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}
