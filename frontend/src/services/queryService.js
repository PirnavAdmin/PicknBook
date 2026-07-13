import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const queriesApi = axios.create({
  headers: {
    Accept: "application/json",
  },
});

queriesApi.interceptors.request.use((config) => {
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

function getStoredAdminToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("adminToken") ||
    window.localStorage.getItem("token") ||
    ""
  );
}

// 1. Public Submission
export async function submitContactQuery(queryData) {
  const response = await queriesApi.post("/api/contactqueries", queryData);
  return response.data;
}

// 2. Admin List
export async function getAdminQueries() {
  const response = await queriesApi.get("/api/contactqueries/admin/list");
  return response.data;
}

// 3. Admin Update Status
export async function updateQueryStatus(id, status) {
  const response = await queriesApi.put(`/api/contactqueries/admin/${id}/status`, { status });
  return response.data;
}

// 4. Admin Delete
export async function deleteAdminQuery(id) {
  const response = await queriesApi.delete(`/api/contactqueries/admin/${id}`);
  return response.data;
}

export const createQuery = submitContactQuery;

export default queriesApi;
