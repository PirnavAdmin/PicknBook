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

export const getAdminPaymentMetrics = () => request("/api/admin/payments/metrics");
export const getAdminPayments = (params = {}) => request(`/api/admin/payments?${new URLSearchParams(params).toString()}`);
export const getAdminPaymentById = (id) => request(`/api/admin/payments/${id}`);
export const initiateAdminPaymentRefund = (id, payload) => request(`/api/admin/payments/${id}/refund`, { method: "POST", body: JSON.stringify(payload || {}) });
