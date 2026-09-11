/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const walletApi = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }
  const activePortal = window.sessionStorage.getItem("active_portal") || "b2c";
  if (activePortal === "b2b") {
    return window.localStorage.getItem("b2b_token") || window.localStorage.getItem("token") || "";
  }
  return window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token") || "";
}

walletApi.interceptors.request.use((config) => {
  const originalUrl = config.url || "";
  const token = getStoredToken();

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

/**
 * Retrieves the wallet summary (Balance, Coins, Status, Totals)
 */
export async function getWalletSummary() {
  const response = await walletApi.get("/api/wallet/summary");
  return response.data;
}

/**
 * Retrieves the paginated transaction history
 * @param {Object} params - Query parameters
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} params.type - 'Credit' or 'Debit'
 */
export async function getWalletTransactions(params = { page: 1, pageSize: 20 }) {
  const response = await walletApi.get("/api/wallet/transactions", { params });
  return response.data;
}

/**
 * Retrieves the user's deposit request history
 */
export async function getWalletDeposits() {
  const response = await walletApi.get("/api/wallet/deposits");
  return response.data;
}

/**
 * Submits a new deposit request
 * @param {Object} payload 
 * @param {number} payload.amount
 * @param {string} payload.type
 * @param {string} payload.remark
 * @param {string} payload.transactionDate
 */
export async function submitWalletDeposit(payload) {
  const response = await walletApi.post("/api/wallet/deposits", payload);
  return response.data;
}

export default walletApi;
