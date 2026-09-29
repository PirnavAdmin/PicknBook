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

function buildSlugKey(str) {
  return String(str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

export function normalizeCmsPage(page) {
  if (!page || typeof page !== "object") return page;
  try {
    const imgOverrides = JSON.parse(localStorage.getItem("cms_page_image_overrides") || "{}");
    const bnrOverrides = JSON.parse(localStorage.getItem("cms_page_banner_overrides") || "{}");

    const pSlug = page.slug || page.Slug || "";
    const pTitle = page.title || page.Title || "";
    const pId = String(page.id || page.Id || "");

    const keys = [
      pSlug,
      buildSlugKey(pSlug),
      pTitle,
      buildSlugKey(pTitle),
      pId,
      String(pId)
    ].filter(Boolean);

    const isImgRemovedInOverrides = keys.some(k => imgOverrides[k] === "__REMOVED__" || imgOverrides[k] === "" || imgOverrides[k] === null);
    const rawImgPath = page.imagePath ?? page.ImagePath ?? page.image ?? page.Image ?? page.imageUrl ?? page.ImageUrl;
    const isRawImgRemoved = rawImgPath === "" || rawImgPath === null || rawImgPath === "null" || rawImgPath === undefined;
    const isImgRemoved = isImgRemovedInOverrides || isRawImgRemoved;

    const isBnrRemovedInOverrides = keys.some(k => bnrOverrides[k] === "__REMOVED__" || bnrOverrides[k] === "" || bnrOverrides[k] === null);
    const rawBnrPath = page.bannerPath ?? page.BannerPath ?? page.banner ?? page.Banner ?? page.bannerUrl ?? page.BannerUrl;
    const isRawBnrRemoved = rawBnrPath === "" || rawBnrPath === null || rawBnrPath === "null" || rawBnrPath === undefined;
    const isBnrRemoved = isBnrRemovedInOverrides || isRawBnrRemoved;

    let imgVal = undefined;
    if (isImgRemoved) {
      imgVal = null;
    } else {
      for (const k of keys) {
        if (imgOverrides[k] && imgOverrides[k] !== "__REMOVED__") {
          imgVal = imgOverrides[k];
          break;
        }
      }
      if (imgVal === undefined) {
        imgVal = rawImgPath;
      }
    }

    let bnrVal = undefined;
    if (isBnrRemoved) {
      bnrVal = null;
    } else {
      for (const k of keys) {
        if (bnrOverrides[k] && bnrOverrides[k] !== "__REMOVED__") {
          bnrVal = bnrOverrides[k];
          break;
        }
      }
      if (bnrVal === undefined) {
        bnrVal = rawBnrPath;
      }
    }

    const updated = {
      ...page,
      id: page.id ?? page.Id,
      title: page.title ?? page.Title,
      slug: page.slug ?? page.Slug,
      status: page.status ?? page.Status,
      module: page.module ?? page.Module,
      metaTitle: page.metaTitle ?? page.MetaTitle,
      metaKeyword: page.metaKeyword ?? page.MetaKeyword,
      metaDescription: page.metaDescription ?? page.MetaDescription,
      description: page.description ?? page.Description,
    };

    const finalImg = isImgRemoved ? null : (imgVal || null);
    updated.imagePath = finalImg;
    updated.ImagePath = finalImg;
    updated.image = finalImg;
    updated.Image = finalImg;
    updated.imageUrl = finalImg;
    updated.ImageUrl = finalImg;

    const finalBnr = isBnrRemoved ? null : (bnrVal || null);
    updated.bannerPath = finalBnr;
    updated.BannerPath = finalBnr;
    updated.banner = finalBnr;
    updated.Banner = finalBnr;
    updated.bannerUrl = finalBnr;
    updated.BannerUrl = finalBnr;

    return updated;
  } catch (e) {
    return page;
  }
}

export function normalizeCmsPagesList(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeCmsPage);
  }
  if (Array.isArray(data.data)) {
    return { ...data, data: data.data.map(normalizeCmsPage) };
  }
  if (Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.map(normalizeCmsPage) };
  }
  if (Array.isArray(data.list)) {
    return { ...data, list: data.list.map(normalizeCmsPage) };
  }
  return normalizeCmsPage(data);
}

export async function getAdminPages() {
  const response = await cmsApi.get("/api/CmsPages/admin/list");
  return normalizeCmsPagesList(response.data);
}

export async function createAdminPage(formData) {
  const response = await cmsApi.post("/api/CmsPages/admin", formData);
  return normalizeCmsPagesList(response.data);
}

export async function updateAdminPage(id, formData) {
  const response = await cmsApi.put(`/api/CmsPages/admin/${id}`, formData);
  return normalizeCmsPagesList(response.data);
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
  const response = await cmsApi.get(`/api/CmsPages/${encodeURIComponent(slug)}?_t=${Date.now()}`);
  return normalizeCmsPage(response.data);
}

export async function getPublicPages() {
  const response = await cmsApi.get("/api/CmsPages");
  return normalizeCmsPagesList(response.data);
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
