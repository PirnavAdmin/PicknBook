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
export const getActiveOffers = (bookingType) =>
  request(`/api/FeaturedOffers${bookingType ? `?bookingType=${encodeURIComponent(bookingType)}` : ""}`).then(unwrap);
export const getPublicPromotions = getActiveOffers;

/**
 * Fetches available bus coupons/offers for the current user.
 * Endpoint: GET /api/BusBookings/user/available
 * Maps the response shape to the normalized featured-offer structure used by the UI.
 */
export const getUserAvailableBusOffers = () =>
  request("/api/BusBookings/user/available").then((data) => {
    const raw = Array.isArray(data) ? data : [];
    return raw.map((item) => ({
      id: item.id,
      title: item.title || "Bus Offer",
      description: item.description || null,
      couponCode: item.couponCode || null,
      bookingType: "Bus",
      isActive: item.isEligible !== false,
      discountType: item.couponType || null,
      discountValue: item.value ?? null,
      maxDiscountAmount: item.maxDiscountAmount ?? null,
      minBookingAmount: item.minBookingAmount ?? null,
      maxUsagePerUser: item.maxUsagePerUser ?? null,
      couponExpiresAtUtc: item.expiryDate || null,
      promotionCategory: item.promotionCategory || null,
      isAutoApply: item.isAutoApply ?? false,
      isExclusive: item.isExclusive ?? false,
      isEligible: item.isEligible ?? true,
      imageUrl: null,
      conditions: [],
    }));
  });
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
