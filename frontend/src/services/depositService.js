/* eslint-disable */
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
  const endpoints = [
    "/api/admin/deposits",
    "/api/deposits",
    "/api/agentportal/deposits",
    "/api/Wallet/transactions",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await depositApi.get(endpoint, { params });
      const rawData = response.data;
      if (rawData) {
        const list = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData.items)
            ? rawData.items
            : Array.isArray(rawData.data)
              ? rawData.data
              : Array.isArray(rawData.results)
                ? rawData.results
                : null;
        if (list && list.length > 0) {
          return list;
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  try {
    const res = await depositApi.get("/api/admin/deposits", { params });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
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
