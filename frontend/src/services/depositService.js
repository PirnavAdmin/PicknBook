import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const depositApi = axios.create({
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

depositApi.interceptors.request.use((config) => {
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

export async function getDepositRequests(params = {}) {
  const response = await depositApi.get("/api/admin/deposits", { params });
  return response.data;
}

export async function cycleDepositStatus(id) {
  const response = await depositApi.put(`/api/admin/deposits/${id}/status`);
  return response.data;
}

export async function updateAdminRemark(id, adminRemark) {
  const response = await depositApi.put(`/api/admin/deposits/${id}/remark`, { adminRemark });
  return response.data;
}

export default depositApi;
