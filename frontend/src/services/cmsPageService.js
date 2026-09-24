/* eslint-disable */
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

  const requestHeaders = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(config.headers || {}),
  };

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete requestHeaders["Content-Type"];
    delete requestHeaders["content-type"];
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  return {
    ...config,
    url: toApiUrl(originalUrl),
    headers: withNgrokSkipWarningHeader(originalUrl, requestHeaders),
  };
});

export async function getAdminPages() {
  const response = await cmsApi.get("/api/CmsPages/admin/list");
  return response.data;
}

export async function createAdminPage(formData) {
  const response = await cmsApi.post("/api/CmsPages/admin", formData);
  return response.data;
}

export async function updateAdminPage(id, formData) {
  const response = await cmsApi.put(`/api/CmsPages/admin/${id}`, formData);
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

export function getCmsApiBaseUrl() {
  return "";
}

export function resolveCmsImageUrl(pathOrUrl, type) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const baseUrl = getCmsApiBaseUrl();
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
}

export default cmsApi;


