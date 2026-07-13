import {
  normalizeResponseMessage,
  readResponsePayload,
  toApiUrl,
  withNgrokSkipWarningHeader,
} from "./apiClient";
import { getAuthToken } from "./authSession";

const PUBLIC_TESTIMONIAL_CANDIDATES = [
  "/api/testimonials",
  "/api/Testimonials",
  "/api/testimonial",
  "/api/Testimonial"
];

const ADMIN_TESTIMONIAL_CANDIDATES = [
  "/api/admin/testimonials",
  "/api/admin/Testimonials",
  "/api/admin/testimonial",
  "/api/admin/Testimonial",
  "/api/testimonials/admin",
  "/api/Testimonials/admin",
  "/api/testimonial/admin",
  "/api/Testimonial/admin"
];

// Cache resolved endpoints to avoid repeated probing
let resolvedPublicTestimonialRoot = null;
let resolvedAdminTestimonialRoot = null;

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

export async function getPublicTestimonials() {
  if (resolvedPublicTestimonialRoot) {
    try {
      return await requestJson(`${resolvedPublicTestimonialRoot}/active`, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
      try {
        return await requestJson(resolvedPublicTestimonialRoot, { method: "GET" });
      } catch (err2) {
        if (err2.status !== 404 && err2.status !== 405) throw err2;
      }
    }
  }

  // Probe candidates with /active first
  for (const root of PUBLIC_TESTIMONIAL_CANDIDATES) {
    try {
      const data = await requestJson(`${root}/active`, { method: "GET" });
      resolvedPublicTestimonialRoot = root;
      return data;
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  // Fallback to normal root candidates
  return requestWithCandidates(
    PUBLIC_TESTIMONIAL_CANDIDATES,
    { method: "GET" },
    (path) => { resolvedPublicTestimonialRoot = path; }
  );
}

export async function getAdminTestimonials() {
  if (resolvedAdminTestimonialRoot) {
    try {
      return await requestJson(resolvedAdminTestimonialRoot, { method: "GET" });
    } catch (err) {
      if (err.status !== 404 && err.status !== 405) throw err;
    }
  }

  return requestWithCandidates(
    ADMIN_TESTIMONIAL_CANDIDATES,
    { method: "GET" },
    (path) => { resolvedAdminTestimonialRoot = path; }
  );
}

export async function createAdminTestimonial(formData) {
  const root = resolvedAdminTestimonialRoot || ADMIN_TESTIMONIAL_CANDIDATES[0];
  return requestJson(root, {
    method: "POST",
    body: formData,
  });
}

export async function updateAdminTestimonial(id, formData) {
  const root = resolvedAdminTestimonialRoot || ADMIN_TESTIMONIAL_CANDIDATES[0];
  return requestJson(`${root}/${id}`, {
    method: "PUT",
    body: formData,
  });
}

export async function deleteAdminTestimonial(id) {
  const root = resolvedAdminTestimonialRoot || ADMIN_TESTIMONIAL_CANDIDATES[0];
  return requestJson(`${root}/${id}`, {
    method: "DELETE",
  });
}

export async function toggleTestimonialStatus(id) {
  const root = resolvedAdminTestimonialRoot || ADMIN_TESTIMONIAL_CANDIDATES[0];
  return requestJson(`${root}/${id}/toggle-status`, {
    method: "POST",
  });
}

