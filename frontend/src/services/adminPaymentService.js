import { toApiUrl } from "./apiClient";

async function request(path, options = {}) {
  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.Message || "Payment request failed");
  return data;
}

export const getAdminPaymentMetrics = (options = {}) => request("/api/admin/payments/metrics", options);
export const getAdminPayments = (params = {}, options = {}) => request(`/api/admin/payments?${new URLSearchParams(params).toString()}`, options);
export const getAdminPaymentById = (id, options = {}) => request(`/api/admin/payments/${id}`, options);
export const initiateAdminPaymentRefund = (id, payload) => request(`/api/admin/payments/${id}/refund`, { method: "POST", body: JSON.stringify(payload || {}) });
