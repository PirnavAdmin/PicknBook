import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const cmsApi = axios.create({
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

cmsApi.interceptors.request.use((config) => {
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

export async function getAdminPages() {
  const response = await cmsApi.get("/api/CmsPages/admin/list");
  return response.data;
}

export async function createAdminPage(formData) {
  const response = await cmsApi.post("/api/CmsPages/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateAdminPage(id, formData) {
  const response = await cmsApi.put(`/api/CmsPages/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteAdminPage(id) {
  const response = await cmsApi.delete(`/api/CmsPages/admin/${id}`);
  return response.data;
}

export async function getAdminAboutUs(module) {
  const response = await cmsApi.get(`/api/CmsPages/admin/about-us?module=${encodeURIComponent(module)}`);
  return response.data;
}

export async function updateAdminAboutUs(data) {
  const response = await cmsApi.put("/api/CmsPages/admin/about-us", data);
  return response.data;
}

export async function getPublicPageBySlug(slug) {
  const response = await cmsApi.get(`/api/CmsPages/${encodeURIComponent(slug)}`);
  return response.data;
}

export async function getPublicPages() {
  const response = await cmsApi.get("/api/CmsPages");
  return response.data;
}

export default cmsApi;

