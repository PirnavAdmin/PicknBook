import { toApiUrl } from "./apiClient";

async function request(path, options = {}) {
  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.Message || "B2B admin request failed");
  return data?.data ?? data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const b2bAdminService = {
  getB2bStats: () => request("/api/admin/b2b/stats"),
  getB2bActivities: () => request("/api/admin/b2b/activities"),
  getB2bBookingsList: (search = {}) => request(`/api/admin/b2b/bookings?${new URLSearchParams(search).toString()}`),
  getAgents: (status = "All", search = "") => request(`/api/admin/b2b/agents?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`),
  getAgentById: (id) => request(`/api/admin/b2b/agents/${id}`),
  createAgent: (payload) => request("/api/admin/b2b/agents", json("POST", payload)),
  updateAgentStatus: (id, status) => request(`/api/admin/b2b/agents/${id}/status`, json("PUT", { status })),
  updateAgentWalletStatus: (id, status) => request(`/api/admin/b2b/agents/${id}/wallet-status`, json("PUT", { status })),
  updateMembershipTier: (id, membershipTier) => request(`/api/admin/b2b/agents/${id}/membership-tier`, json("PUT", { membershipTier })),
  updateCreditLimit: (id, creditLimit) => request(`/api/admin/b2b/agents/${id}/credit-limit`, json("PUT", { creditLimit })),
  getCommissionRules: () => request("/api/admin/b2b/commission-rules"),
  createCommissionRule: (payload) => request("/api/admin/b2b/commission-rules", json("POST", payload)),
  editCommissionRule: (id, payload) => request(`/api/admin/b2b/commission-rules/${id}`, json("PUT", payload)),
  deleteCommissionRule: (id) => request(`/api/admin/b2b/commission-rules/${id}`, { method: "DELETE" }),
  getDeposits: (status = "All", type = "All", search = "") => request(`/api/admin/b2b/deposits?status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`),
  approveDepositRequest: (id) => request(`/api/admin/b2b/deposits/${id}/approve`, json("PUT", {})),
  rejectDepositRequest: (id) => request(`/api/admin/b2b/deposits/${id}/reject`, json("PUT", {})),
  updateDepositRemark: (id, remark) => request(`/api/admin/b2b/deposits/${id}/remark`, json("PUT", { remark })),
  getAgentLedger: (id) => request(`/api/admin/b2b/agents/${id}/ledger`),
  getLogs: () => [],
  getMarkups: () => [],
  updateMarkups: () => Promise.resolve(),
  addLog: () => undefined,
  getSettings: () => ({}),
  updateSettings: () => Promise.resolve(),
  getWalletHistory: () => [],
  adjustAgentWalletBalance: (id, payload) => request(`/api/admin/b2b/agents/${id}/wallet`, json("POST", payload)),
};
