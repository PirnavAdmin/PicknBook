/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const menuApi = axios.create({
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

menuApi.interceptors.request.use((config) => {
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

export async function getAdminMenuItems() {
  const response = await menuApi.get("/api/MenuItems/admin/list");
  return response.data;
}

export async function createMenuItem(data) {
  const response = await menuApi.post("/api/MenuItems/admin", data);
  return response.data;
}

export async function updateMenuItem(id, data) {
  const response = await menuApi.put(`/api/MenuItems/admin/${id}`, data);
  return response.data;
}

export async function deleteMenuItem(id) {
  const response = await menuApi.delete(`/api/MenuItems/admin/${id}`);
  return response.data;
}

export default menuApi;
