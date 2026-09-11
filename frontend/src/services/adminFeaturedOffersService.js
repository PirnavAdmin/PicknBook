import { toApiUrl } from "./apiClient";

async function request(path, options = {}) {
  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.Message || "Featured offer request failed");
  return data;
}

const unwrap = (data) => data?.value || data?.data || data?.offers || data || [];

export const getPublicFeaturedOffers = () => request("/api/FeaturedOffers").then(unwrap);
export const getActiveOffers = (bookingType) => request(`/api/FeaturedOffers${bookingType ? `?bookingType=${encodeURIComponent(bookingType)}` : ""}`).then(unwrap);
export const getAdminFeaturedOffers = () => request("/api/AdminFeaturedOffers").then(unwrap);
export const getAdminFeaturedOfferById = (id) => request(`/api/AdminFeaturedOffers/${id}`);
export const createAdminFeaturedOffer = (payload) => request("/api/AdminFeaturedOffers", { method: "POST", body: JSON.stringify(payload) });
export const updateAdminFeaturedOffer = (id, payload) => request(`/api/AdminFeaturedOffers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteAdminFeaturedOffer = (id) => request(`/api/AdminFeaturedOffers/${id}`, { method: "DELETE" });
export const getOfferConditions = (id) => request(`/api/AdminFeaturedOffers/${id}/conditions`).then(unwrap);
export const addOfferCondition = (id, payload) => request(`/api/AdminFeaturedOffers/${id}/conditions`, { method: "POST", body: JSON.stringify(payload) });
export const updateOfferCondition = (id, conditionId, payload) => request(`/api/AdminFeaturedOffers/${id}/conditions/${conditionId}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteOfferCondition = (id, conditionId) => request(`/api/AdminFeaturedOffers/${id}/conditions/${conditionId}`, { method: "DELETE" });
export const extractOfferErrorMessage = (error) => error?.response?.data?.message || error?.message || "Unable to process featured offer.";

const adminFeaturedOffersService = { getAdminFeaturedOffers, createAdminFeaturedOffer, updateAdminFeaturedOffer, deleteAdminFeaturedOffer };
export default adminFeaturedOffersService;
