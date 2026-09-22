/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

function getAdminToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("admin_token") ||
    sessionStorage.getItem("admin_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

const api = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  const processed = withNgrokSkipWarningHeader({
    ...config,
    url: toApiUrl(config.url || ""),
  });
  if (token) {
    processed.headers = processed.headers || {};
    processed.headers["Authorization"] = `Bearer ${token}`;
  }
  return processed;
});

export const adminWalletService = {
  async getCustomerSummary(userId) {
    try {
      const res = await api.get(`/api/admin/wallet/customer-summary/${userId}`);
      return res.data;
    } catch (err) {
      console.error("adminWalletService.getCustomerSummary error:", err);
      return null;
    }
  },

  async getTransactions(params = {}) {
    try {
      const res = await api.get(`/api/admin/wallet/transactions`, { params });
      return res.data;
    } catch (err) {
      console.error("adminWalletService.getTransactions error:", err);
      return { data: [], totalCount: 0 };
    }
  },

  async adjustWallet(payload) {
    try {
      const res = await api.post(`/api/admin/wallet/adjust`, payload);
      return res.data;
    } catch (err) {
      console.error("adminWalletService.adjustWallet error:", err);
      throw err;
    }
  },
};

export default adminWalletService;
