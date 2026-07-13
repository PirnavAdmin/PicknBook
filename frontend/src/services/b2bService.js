import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const b2bApi = axios.create({
  headers: {
    Accept: "application/json",
  },
});

function getB2BToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem("b2b_token") || "";
}

b2bApi.interceptors.request.use((config) => {
  const originalUrl = config.url || "";
  const token = getB2BToken();

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

// 1. Upload Custom Logo
export async function uploadAgentLogo(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await b2bApi.put("/api/agentportal/profile/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

// 2. Get Current Markup Settings
export async function getMarkupSettings() {
  const response = await b2bApi.get("/api/agentportal/markups");
  return response.data;
}

// 3. Update Markup settings
export async function updateMarkupSettings(payload) {
  const response = await b2bApi.put("/api/agentportal/markups", payload);
  return response.data;
}

// 4. Get Ledger Account Statement
export async function getLedgerStatement(fromDate = "", toDate = "") {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const response = await b2bApi.get("/api/agentportal/ledger", { params });
  return response.data;
}

// 5. Submit Offline Deposit Request
export async function submitDepositRequest(payload) {
  const response = await b2bApi.post("/api/agentportal/deposits", payload);
  return response.data;
}

// 6. Get Bookings Report / Export CSV
export async function getBookingsReport(params = {}) {
  const response = await b2bApi.get("/api/agentportal/bookings", { params });
  return response.data;
}

// Export CSV download helper
export function getExportCsvUrl(params = {}) {
  const query = new URLSearchParams({ ...params, export: "true" }).toString();
  return toApiUrl(`/api/agentportal/bookings?${query}`);
}

export default b2bApi;
