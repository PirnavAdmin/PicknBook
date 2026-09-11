/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const customerApi = axios.create({
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

customerApi.interceptors.request.use((config) => {
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

export async function getCustomers(params = {}) {
  const response = await customerApi.get("/api/customers", { params });
  return response.data;
}

export async function getCustomerById(id) {
  const response = await customerApi.get(`/api/customers/${id}`);
  return response.data;
}

export async function createCustomer(data) {
  const response = await customerApi.post("/api/customers", data);
  return response.data;
}

export async function updateCustomer(id, data) {
  const response = await customerApi.put(`/api/customers/${id}`, data);
  return response.data;
}

export async function toggleCustomerStatus(id) {
  const response = await customerApi.put(`/api/customers/${id}/status`);
  return response.data;
}

export async function toggleWalletStatus(id) {
  const response = await customerApi.put(`/api/customers/${id}/wallet-status`);
  return response.data;
}

export async function addWalletBalance(id, payload) {
  const response = await customerApi.post(`/api/customers/${id}/wallet/add`, payload);
  return response.data;
}

export async function resetWalletBalance(id) {
  const response = await customerApi.post(`/api/customers/${id}/wallet/reset`);
  return response.data;
}

export async function deleteCustomer(id) {
  const response = await customerApi.delete(`/api/customers/${id}`);
  return response.data;
}

export default customerApi;
