/* eslint-disable */
import {
  normalizeResponseMessage,
  readResponsePayload,
  toApiUrl,
  withNgrokSkipWarningHeader,
} from "./apiClient";
import { getAuthToken } from "./authSession";

const DASHBOARD_STATS_CANDIDATES = [
  "/api/admin/testimonials/dashboard-stats",
  "/api/testimonials/admin/dashboard-stats",
  "/api/testimonials/dashboard-stats",
];

const CATEGORY_CANDIDATES = [
  "/api/admin/testimonial-categories",
  "/api/testimonials/admin/categories",
  "/api/admin/testimonials/categories",
];

const TESTIMONIAL_CANDIDATES = [
  "/api/admin/testimonials",
  "/api/testimonials/admin/list",
  "/api/testimonials/admin",
];

const SETTINGS_CANDIDATES = [
  "/api/admin/testimonials/settings",
  "/api/testimonials/admin/settings",
];

let resolvedDashboardStatsRoot = null;
let resolvedCategoryRoot = null;
let resolvedTestimonialRoot = null;
let resolvedSettingsRoot = null;

function getAuthHeaders(isFormData = false) {
  const token = getAuthToken() || localStorage.getItem("adminToken") || localStorage.getItem("token");

  return {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requestJson(urlOrPath, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = withNgrokSkipWarningHeader(urlOrPath, {
    ...getAuthHeaders(isFormData),
    ...(options.headers || {}),
  });

  const response = await fetch(toApiUrl(urlOrPath), {
    cache: "no-store",
    ...options,
    headers,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    const err = new Error(normalizeResponseMessage(payload, `Request failed with status ${response.status}.`));
    err.status = response.status;
    throw err;
  }

  return payload;
}

async function requestWithCandidates(candidates, options = {}, resolvedCacheSetter) {
  let lastError = null;
  for (const path of candidates) {
    try {
      const result = await requestJson(path, options);
      if (resolvedCacheSetter) resolvedCacheSetter(path);
      return result;
    } catch (err) {
      lastError = err;
      if (err.status === 404 || err.status === 405) {
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error("All candidate endpoints failed.");
}

// ---------------------------------------------------------
// 1. DASHBOARD STATISTICS
// ---------------------------------------------------------

export async function getTestimonialDashboardStats(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  if (resolvedDashboardStatsRoot) {
    try {
      return await requestJson(`${resolvedDashboardStatsRoot}${queryString}`, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  const candidatesWithQuery = DASHBOARD_STATS_CANDIDATES.map(c => `${c}${queryString}`);
  return requestWithCandidates(
    candidatesWithQuery,
    { method: "GET" },
    (path) => { resolvedDashboardStatsRoot = path.split("?")[0]; }
  );
}

// ---------------------------------------------------------
// 2. TESTIMONIAL CATEGORIES MANAGEMENT
// ---------------------------------------------------------

export async function getAdminTestimonialCategories() {
  if (resolvedCategoryRoot) {
    try {
      return await requestJson(resolvedCategoryRoot, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  return requestWithCandidates(
    CATEGORY_CANDIDATES,
    { method: "GET" },
    (path) => { resolvedCategoryRoot = path; }
  );
}

export async function createAdminTestimonialCategory(data) {
  const root = resolvedCategoryRoot || CATEGORY_CANDIDATES[0];
  return requestJson(root, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminTestimonialCategory(id, data) {
  const root = resolvedCategoryRoot || CATEGORY_CANDIDATES[0];
  return requestJson(`${root}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminTestimonialCategory(id) {
  const root = resolvedCategoryRoot || CATEGORY_CANDIDATES[0];
  return requestJson(`${root}/${id}`, {
    method: "DELETE",
  });
}

export async function toggleTestimonialCategoryStatus(id) {
  const root = resolvedCategoryRoot || CATEGORY_CANDIDATES[0];
  try {
    return await requestJson(`${root}/${id}/status`, {
      method: "PATCH",
    });
  } catch (err) {
    return await requestJson(`${root}/${id}/toggle-status`, {
      method: "POST",
    });
  }
}

// ---------------------------------------------------------
// 3. TESTIMONIALS MANAGEMENT
// ---------------------------------------------------------

export async function getAdminTestimonials(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append("status", params.status);
  if (params.categoryId) queryParams.append("categoryId", params.categoryId);
  if (params.search) queryParams.append("search", params.search);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  if (resolvedTestimonialRoot) {
    try {
      return await requestJson(`${resolvedTestimonialRoot}${queryString}`, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  const candidatesWithQuery = TESTIMONIAL_CANDIDATES.map(c => `${c}${queryString}`);
  return requestWithCandidates(
    candidatesWithQuery,
    { method: "GET" },
    (path) => { resolvedTestimonialRoot = path.split("?")[0]; }
  );
}

export async function getPublicTestimonials() {
  return getAdminTestimonials({ status: "Active" });
}

export async function createAdminTestimonial(formDataOrObj) {
  const root = resolvedTestimonialRoot || TESTIMONIAL_CANDIDATES[0];
  let body = formDataOrObj;
  if (formDataOrObj && !(formDataOrObj instanceof FormData) && typeof formDataOrObj === "object") {
    body = new FormData();
    if (formDataOrObj.name || formDataOrObj.Name) body.append("Name", formDataOrObj.name || formDataOrObj.Name);
    if (formDataOrObj.role || formDataOrObj.Role) body.append("Role", formDataOrObj.role || formDataOrObj.Role || "Traveler");
    if (formDataOrObj.location || formDataOrObj.Location) body.append("Location", formDataOrObj.location || formDataOrObj.Location);
    if (formDataOrObj.rating != null || formDataOrObj.Rating != null) body.append("Rating", String(formDataOrObj.rating != null ? formDataOrObj.rating : formDataOrObj.Rating));
    if (formDataOrObj.comment || formDataOrObj.Comment || formDataOrObj.preview) body.append("Comment", formDataOrObj.comment || formDataOrObj.Comment || formDataOrObj.preview);
    if (formDataOrObj.status || formDataOrObj.Status) body.append("Status", formDataOrObj.status || formDataOrObj.Status || "Active");
    if (formDataOrObj.displayOrder != null || formDataOrObj.DisplayOrder != null || formDataOrObj.order != null) body.append("DisplayOrder", String(formDataOrObj.displayOrder ?? formDataOrObj.DisplayOrder ?? formDataOrObj.order ?? 1));
    if (formDataOrObj.featured != null || formDataOrObj.Featured != null) body.append("Featured", String(Boolean(formDataOrObj.featured ?? formDataOrObj.Featured)));
    if (formDataOrObj.categoryId != null || formDataOrObj.CategoryId != null) body.append("CategoryId", String(formDataOrObj.categoryId ?? formDataOrObj.CategoryId));
    if (formDataOrObj.image || formDataOrObj.Image || formDataOrObj.imageFile) body.append("Image", formDataOrObj.image || formDataOrObj.Image || formDataOrObj.imageFile);
  }

  return requestJson(root, {
    method: "POST",
    body,
  });
}

export async function updateAdminTestimonial(id, formDataOrObj) {
  const root = resolvedTestimonialRoot || TESTIMONIAL_CANDIDATES[0];
  let body = formDataOrObj;
  if (formDataOrObj && !(formDataOrObj instanceof FormData) && typeof formDataOrObj === "object") {
    body = new FormData();
    if (formDataOrObj.name || formDataOrObj.Name) body.append("Name", formDataOrObj.name || formDataOrObj.Name);
    if (formDataOrObj.role || formDataOrObj.Role) body.append("Role", formDataOrObj.role || formDataOrObj.Role || "Traveler");
    if (formDataOrObj.location || formDataOrObj.Location) body.append("Location", formDataOrObj.location || formDataOrObj.Location);
    if (formDataOrObj.rating != null || formDataOrObj.Rating != null) body.append("Rating", String(formDataOrObj.rating != null ? formDataOrObj.rating : formDataOrObj.Rating));
    if (formDataOrObj.comment || formDataOrObj.Comment || formDataOrObj.preview) body.append("Comment", formDataOrObj.comment || formDataOrObj.Comment || formDataOrObj.preview);
    if (formDataOrObj.status || formDataOrObj.Status) body.append("Status", formDataOrObj.status || formDataOrObj.Status || "Active");
    if (formDataOrObj.displayOrder != null || formDataOrObj.DisplayOrder != null || formDataOrObj.order != null) body.append("DisplayOrder", String(formDataOrObj.displayOrder ?? formDataOrObj.DisplayOrder ?? formDataOrObj.order ?? 1));
    if (formDataOrObj.featured != null || formDataOrObj.Featured != null) body.append("Featured", String(Boolean(formDataOrObj.featured ?? formDataOrObj.Featured)));
    if (formDataOrObj.categoryId != null || formDataOrObj.CategoryId != null) body.append("CategoryId", String(formDataOrObj.categoryId ?? formDataOrObj.CategoryId));
    if (formDataOrObj.image || formDataOrObj.Image || formDataOrObj.imageFile) body.append("Image", formDataOrObj.image || formDataOrObj.Image || formDataOrObj.imageFile);
  }

  return requestJson(`${root}/${id}`, {
    method: "PUT",
    body,
  });
}

export async function toggleTestimonialStatus(id, newStatus = null, featured = null) {
  const root = resolvedTestimonialRoot || TESTIMONIAL_CANDIDATES[0];
  const payload = {};
  if (newStatus) payload.status = newStatus;
  if (featured != null) payload.featured = Boolean(featured);

  try {
    return await requestJson(`${root}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return await requestJson(`${root}/${id}/toggle-status`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export async function deleteAdminTestimonial(id) {
  const root = resolvedTestimonialRoot || TESTIMONIAL_CANDIDATES[0];
  return requestJson(`${root}/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------
// 4. GLOBAL TESTIMONIAL SETTINGS
// ---------------------------------------------------------

export async function getTestimonialSettings() {
  if (resolvedSettingsRoot) {
    try {
      return await requestJson(resolvedSettingsRoot, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  return requestWithCandidates(
    SETTINGS_CANDIDATES,
    { method: "GET" },
    (path) => { resolvedSettingsRoot = path; }
  );
}

export async function updateTestimonialSettings(settingsData) {
  const root = resolvedSettingsRoot || SETTINGS_CANDIDATES[0];
  return requestJson(root, {
    method: "PUT",
    body: JSON.stringify(settingsData),
  });
}

// ---------------------------------------------------------
// 5. PUBLIC TESTIMONIAL SUBMISSION
// ---------------------------------------------------------

const PUBLIC_SUBMIT_CANDIDATES = [
  "/api/testimonials",
  "/api/public/testimonials",
  "/api/testimonials/submit",
];

let resolvedPublicSubmitRoot = null;

export async function submitPublicTestimonial(formDataOrObj) {
  let body = formDataOrObj;
  if (!(formDataOrObj instanceof FormData)) {
    body = new FormData();
    if (formDataOrObj.name || formDataOrObj.Name) body.append("Name", formDataOrObj.name || formDataOrObj.Name);
    if (formDataOrObj.role || formDataOrObj.Role) body.append("Role", formDataOrObj.role || formDataOrObj.Role || "Traveler");
    if (formDataOrObj.location || formDataOrObj.Location) body.append("Location", formDataOrObj.location || formDataOrObj.Location);
    if (formDataOrObj.rating != null || formDataOrObj.Rating != null) body.append("Rating", String(formDataOrObj.rating != null ? formDataOrObj.rating : formDataOrObj.Rating));
    if (formDataOrObj.comment || formDataOrObj.Comment) body.append("Comment", formDataOrObj.comment || formDataOrObj.Comment);
    if (formDataOrObj.categoryId != null || formDataOrObj.CategoryId != null) body.append("CategoryId", String(formDataOrObj.categoryId != null ? formDataOrObj.categoryId : formDataOrObj.CategoryId));
    if (formDataOrObj.image || formDataOrObj.Image) body.append("Image", formDataOrObj.image || formDataOrObj.Image);
  }

  if (resolvedPublicSubmitRoot) {
    try {
      return await requestJson(resolvedPublicSubmitRoot, {
        method: "POST",
        body,
      });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  return requestWithCandidates(
    PUBLIC_SUBMIT_CANDIDATES,
    {
      method: "POST",
      body,
    },
    (path) => { resolvedPublicSubmitRoot = path; }
  );
}

