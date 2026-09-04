/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const PUBLIC_FEATURED_OFFERS_PATHS = [
  "/api/FeaturedOffers",
  "/api/featured-offers",
  "/api/FeaturedOffers/active",
];

function buildActiveOffersPaths(bookingType) {
  const encodedBookingType = encodeURIComponent(String(bookingType || "").trim());
  const query = encodedBookingType ? `?bookingType=${encodedBookingType}` : "";

  return [
    "/api/FeaturedOffers",
    `/api/FeaturedOffers/active${query}`,
    `/api/featured-offers${query}`,
    `/api/offers/active${query}`,
  ];
}

const offersApi = axios.create({
  headers: {
    Accept: "application/json",
  },
});

offersApi.interceptors.request.use((config) => {
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

function shouldTryNextPublicEndpoint(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403 || status === 404 || status === 405;
}

export async function getPublicFeaturedOffers() {
  for (const path of PUBLIC_FEATURED_OFFERS_PATHS) {
    try {
      const response = await offersApi.get(path);
      return response.data;
    } catch (error) {
      if (!shouldTryNextPublicEndpoint(error)) {
        return [];
      }
    }
  }

  const token = getStoredAdminToken();
  if (!token) {
    return [];
  }

  try {
    const response = await offersApi.get("/api/admin/featured-offers", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch {
    return [];
  }
}

export async function getActiveOffers(bookingType = "Bus") {
  for (const path of buildActiveOffersPaths(bookingType)) {
    try {
      const response = await offersApi.get(path);
      return response.data;
    } catch (error) {
      if (!shouldTryNextPublicEndpoint(error)) {
        return [];
      }
    }
  }

  return getPublicFeaturedOffers();
}

export async function getAdminFeaturedOffers() {
  const response = await offersApi.get("/api/admin/featured-offers");
  return response.data;
}

export async function getAdminFeaturedOfferById(id) {
  const response = await offersApi.get(`/api/admin/featured-offers/${id}`);
  return response.data;
}

export async function createAdminFeaturedOffer(formData) {
  const response = await offersApi.post("/api/admin/featured-offers", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateAdminFeaturedOffer(id, formData) {
  const response = await offersApi.put(`/api/admin/featured-offers/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteAdminFeaturedOffer(id) {
  const response = await offersApi.delete(`/api/admin/featured-offers/${id}`);
  return response.data;
}

export async function getOfferConditions(offerId) {
  const response = await offersApi.get(`/api/admin/featured-offers/${offerId}/conditions`);
  return response.data;
}

export async function addOfferCondition(offerId, data) {
  const response = await offersApi.post(`/api/admin/featured-offers/${offerId}/conditions`, data);
  return response.data;
}

export async function updateOfferCondition(offerId, conditionId, data) {
  const response = await offersApi.put(`/api/admin/featured-offers/${offerId}/conditions/${conditionId}`, data);
  return response.data;
}

export async function deleteOfferCondition(offerId, conditionId) {
  const response = await offersApi.delete(`/api/admin/featured-offers/${offerId}/conditions/${conditionId}`);
  return response.data;
}

export function extractOfferErrorMessage(error, fallback = "An unexpected error occurred.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === "string") return data;
    if (data.message || data.Message) return data.message || data.Message;
    if (data.error || data.Error) return data.error || data.Error;
    if (data.title || data.Title) return data.title || data.Title;
    if (data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors).flat().filter(Boolean);
      if (messages.length > 0) return messages.join(", ");
    }
  }
  return error.message || fallback;
}

export default offersApi;

