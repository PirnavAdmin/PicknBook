/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const blogApi = axios.create({
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

blogApi.interceptors.request.use((config) => {
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

// Blog Posts API
export async function getAdminBlogs({ page = 1, pageSize = 20, isPublished = null } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (isPublished !== null) {
    params.set("isPublished", String(isPublished));
  }
  const response = await blogApi.get(`/api/Blogs/admin/list?${params.toString()}`);
  return response.data;
}

export async function createAdminBlog(formData) {
  const response = await blogApi.post("/api/Blogs/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateAdminBlog(id, formData) {
  const response = await blogApi.put(`/api/Blogs/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteAdminBlog(id) {
  const response = await blogApi.delete(`/api/Blogs/admin/${id}`);
  return response.data;
}

// Blog Categories API
export async function getBlogCategories() {
  const response = await blogApi.get("/api/BlogCategories");
  return response.data;
}

export async function createBlogCategory(formData) {
  const response = await blogApi.post("/api/BlogCategories/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateBlogCategory(id, formData) {
  const response = await blogApi.put(`/api/BlogCategories/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function toggleBlogCategoryStatus(id) {
  const response = await blogApi.put(`/api/BlogCategories/admin/${id}/status`);
  return response.data;
}

export async function deleteBlogCategory(id) {
  const response = await blogApi.delete(`/api/BlogCategories/admin/${id}`);
  return response.data;
}

// Blog Subcategories API
export async function getBlogSubCategories() {
  const response = await blogApi.get("/api/BlogSubCategories");
  return response.data;
}

export async function createBlogSubCategory(formData) {
  const response = await blogApi.post("/api/BlogSubCategories/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateBlogSubCategory(id, formData) {
  const response = await blogApi.put(`/api/BlogSubCategories/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function toggleBlogSubCategoryStatus(id) {
  const response = await blogApi.put(`/api/BlogSubCategories/admin/${id}/status`);
  return response.data;
}

export async function deleteBlogSubCategory(id) {
  const response = await blogApi.delete(`/api/BlogSubCategories/admin/${id}`);
  return response.data;
}

export async function getPublicBlogs({ page = 1, pageSize = 20, category = "", featuredOnly = false } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (category) {
    params.set("category", category);
  }
  if (featuredOnly) {
    params.set("featuredOnly", "true");
  }
  const response = await blogApi.get(`/api/Blogs?${params.toString()}`);
  return response.data;
}

export async function getPublicBlogBySlug(slug) {
  const response = await blogApi.get(`/api/Blogs/${encodeURIComponent(slug)}`);
  return response.data;
}

export default blogApi;

