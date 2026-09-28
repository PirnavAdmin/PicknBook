/* eslint-disable */
import axios from "axios";
import { toApiUrl, toApiAssetUrl, withNgrokSkipWarningHeader } from "./apiClient";

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

/**
 * Robust helper function to handle PUT updates for ASP.NET Controllers.
 * 1. If payload is FormData without a File, converts to JSON object (ASP.NET PUT endpoints expect JSON).
 * 2. If PUT fails with 500/405/415, automatically retries with POST or JSON fallback.
 */
async function sendUpdateWithFallback(endpointPath, payload) {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const hasFile = isFormData && Array.from(payload.values()).some(v => typeof File !== "undefined" && v instanceof File);

  // 1. If it's FormData without a File, convert to JSON object first because ASP.NET PUT endpoints expect JSON
  if (isFormData && !hasFile) {
    const jsonObj = {};
    for (const [k, v] of payload.entries()) {
      jsonObj[k] = v;
      // Add camelCase key as well for ASP.NET ModelBinder flexibility
      jsonObj[k.charAt(0).toLowerCase() + k.slice(1)] = v;
    }

    try {
      const res = await blogApi.put(endpointPath, jsonObj, {
        headers: { "Content-Type": "application/json" }
      });
      return res.data;
    } catch (err) {
      console.warn(`[blogService] JSON PUT to ${endpointPath} failed (${err?.response?.status}), trying FormData PUT...`);
    }
  }

  // 2. Try standard PUT with payload
  try {
    const res = await blogApi.put(endpointPath, payload);
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    // 3. Fallback for 500/405/415 errors on ASP.NET IIS servers
    if (status === 500 || status === 405 || status === 415) {
      console.warn(`[blogService] PUT to ${endpointPath} returned ${status}, attempting POST fallback...`);
      try {
        const postRes = await blogApi.post(endpointPath, payload);
        return postRes.data;
      } catch (postErr) {
        if (isFormData) {
          const jsonFallback = {};
          for (const [k, v] of payload.entries()) {
            jsonFallback[k] = v;
            jsonFallback[k.charAt(0).toLowerCase() + k.slice(1)] = v;
          }
          const jsonRes = await blogApi.put(endpointPath, jsonFallback, {
            headers: { "Content-Type": "application/json" }
          });
          return jsonRes.data;
        }
        throw postErr;
      }
    }
    throw err;
  }
}

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
  const response = await blogApi.post("/api/Blogs/admin", formData);
  return response.data;
}

export async function updateAdminBlog(id, formData) {
  return await sendUpdateWithFallback(`/api/Blogs/admin/${id}`, formData);
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
  const response = await blogApi.post("/api/BlogCategories/admin", formData);
  return response.data;
}

export async function updateBlogCategory(id, formData) {
  return await sendUpdateWithFallback(`/api/BlogCategories/admin/${id}`, formData);
}

export async function toggleBlogCategoryStatus(id) {
  try {
    const response = await blogApi.put(`/api/BlogCategories/admin/${id}/status`);
    return response.data;
  } catch (err) {
    if (err?.response?.status === 500 || err?.response?.status === 405) {
      const postRes = await blogApi.post(`/api/BlogCategories/admin/${id}/status`);
      return postRes.data;
    }
    throw err;
  }
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
  const response = await blogApi.post("/api/BlogSubCategories/admin", formData);
  return response.data;
}

export async function updateBlogSubCategory(id, formData) {
  return await sendUpdateWithFallback(`/api/BlogSubCategories/admin/${id}`, formData);
}

export async function toggleBlogSubCategoryStatus(id) {
  try {
    const response = await blogApi.put(`/api/BlogSubCategories/admin/${id}/status`);
    return response.data;
  } catch (err) {
    if (err?.response?.status === 500 || err?.response?.status === 405) {
      const postRes = await blogApi.post(`/api/BlogSubCategories/admin/${id}/status`);
      return postRes.data;
    }
    throw err;
  }
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

export function saveBlogImageLocally(key, value) {
  if (typeof window === "undefined" || !key || !value) return;
  try {
    const k = `blog_img_${String(key)}`;
    window.localStorage.setItem(k, value);
  } catch (err) {
    // ignore
  }
}

export function getBlogImageLocally(blog) {
  if (typeof window === "undefined" || !blog) return "";
  try {
    const keys = [blog?.id, blog?.slug, blog?.title].filter(Boolean);
    for (const key of keys) {
      const stored = window.localStorage.getItem(`blog_img_${String(key)}`);
      if (stored) return stored;
    }
  } catch (err) {
    // ignore
  }
  return "";
}

export function getBlogImageSrc(blog) {
  if (!blog) return "";
  const raw =
    blog.imageUrl ||
    blog.ImageUrl ||
    blog.image ||
    blog.Image ||
    blog.url ||
    blog.Url ||
    blog.thumbnail ||
    blog.coverImage ||
    blog.imageName ||
    "";

  if (raw && raw !== "-" && raw !== "null" && raw !== "undefined") {
    if (raw.startsWith("data:") || raw.startsWith("blob:")) {
      return raw;
    }
    return toApiAssetUrl(raw);
  }

  const local = getBlogImageLocally(blog);
  if (local) {
    if (local.startsWith("data:") || local.startsWith("blob:")) {
      return local;
    }
    return toApiAssetUrl(local);
  }

  return "";
}

export default blogApi;
