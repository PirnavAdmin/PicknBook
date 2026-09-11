import { toApiUrl } from "./apiClient";
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

async function request(path, options = {}) {
  const hasBody = !!options.body;
  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: { ...getAdminAuthHeaders(hasBody), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMsg = data?.message || data?.Message || `Server error (${response.status})`;
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const getAdminPaymentMetrics = () => request("/api/admin/payments/metrics");

export const getAdminPayments = (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  // Only include status if present and NOT "ALL"
  if (params.status && params.status !== "ALL") {
    queryParams.set("status", String(params.status));
  }

  // Only include bookingType if present and NOT "ALL"
  if (params.bookingType && params.bookingType !== "ALL") {
    queryParams.set("bookingType", String(params.bookingType));
  }

  if (params.search && String(params.search).trim()) {
    queryParams.set("search", String(params.search).trim());
  }

  if (params.fromDate && String(params.fromDate).trim()) {
    queryParams.set("fromDate", String(params.fromDate).trim());
  }

  if (params.toDate && String(params.toDate).trim()) {
    queryParams.set("toDate", String(params.toDate).trim());
  }

  const queryString = queryParams.toString();
  return request(`/api/admin/payments${queryString ? `?${queryString}` : ""}`);
};

export const getAdminPaymentById = (id) => request(`/api/admin/payments/${id}`);
export const initiateAdminPaymentRefund = (id, payload) => request(`/api/admin/payments/${id}/refund`, { method: "POST", body: JSON.stringify(payload || {}) });


