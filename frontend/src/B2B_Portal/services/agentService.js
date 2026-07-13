import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "../../services/apiClient";

const agentApi = axios.create({
  headers: {
    Accept: "application/json",
  },
});

function getStoredAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    window.localStorage.getItem("adminToken") ||
    window.localStorage.getItem("authToken") ||
    window.localStorage.getItem("token") ||
    ""
  );
}

agentApi.interceptors.request.use((config) => {
  const originalUrl = config.url || "";
  const token = getStoredAdminToken();

  return {
    ...config,
    url: toApiUrl(originalUrl),
    headers: withNgrokSkipWarningHeader(originalUrl, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
    }),
  };
});

export async function getAgents(params = {}) {
  const response = await agentApi.get("/api/admin/agents", { params });
  return response.data;
}

export async function getAgentById(id) {
  const response = await agentApi.get(`/api/admin/agents/${id}`);
  return response.data;
}

export async function updateAgentStatus(id, statusValue) {
  const response = await agentApi.put(`/api/admin/agents/${id}/status`, { status: statusValue });
  return response.data;
}

export async function updateAgentWalletStatus(id, walletStatusValue) {
  const response = await agentApi.put(`/api/admin/agents/${id}/wallet-status`, { walletStatus: walletStatusValue });
  return response.data;
}

export default agentApi;
