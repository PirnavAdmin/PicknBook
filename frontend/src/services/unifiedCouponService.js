// src/services/unifiedCouponService.js

const IS_LOCAL_DEV = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const API_BASE_URL = IS_LOCAL_DEV ? '' : (process.env.REACT_APP_API_BASE_URL || '').trim();

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/${urlOrPath.replace(/^\/+/, "")}`;
  }
  return urlOrPath;
}

function buildUrl(path, query = {}) {
  const base = toAbsoluteUrl(path);
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = typeof value === "string" ? value.trim() : String(value);
    if (text) params.set(key, text);
  });

  return params.toString() ? `${base}?${params.toString()}` : base;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 1. GET Method — Fetch & Display Coupons / Offers
 * Fetch unified coupons and offers across the entire website and mobile app.
 * Supports type query filtering: 'bus', 'flight', 'hotel', 'all'
 * 
 * @param {Object} params 
 * @param {string} [params.serviceType='all'] - 'bus', 'hotel', 'flight', 'all'
 * @param {string} [params.type] - 'bus', 'hotel', 'flight', 'all'
 * @param {string} [params.category] - 'Coupon' (user discount codes) or 'Offer' (marketing cards/banners)
 */
export async function fetchCouponsAndOffers({ serviceType = 'all', type, bookingType, category } = {}) {
  const targetType = type || (serviceType !== 'all' ? serviceType : bookingType);
  const query = {};
  if (targetType && targetType !== 'all') {
    query.type = String(targetType).toLowerCase();
  }
  if (category && category !== 'all') {
    query.category = category;
  }

  const url = buildUrl("/api/coupons", query);

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch coupons: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 2. POST Method — Unified Pre-Checkout Validation
 * Use this before payment or when the user enters a code in the coupon box and clicks "Apply".
 * 
 * @param {Object} payload 
 * @param {string} payload.serviceType - 'bus', 'hotel', 'flight'
 * @param {string} payload.couponCode - The promo code to validate
 * @param {number} payload.totalAmount - The cart total before discount
 */
export async function validateUnifiedCoupon(payload) {
  const url = buildUrl("/api/coupons/validate");

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to validate coupon: ${response.statusText}`);
  }

  return response.json();
}

export const fetchBusCoupons = (params = {}) => fetchCouponsAndOffers({ ...params, type: 'bus' });
export const fetchFlightCoupons = (params = {}) => fetchCouponsAndOffers({ ...params, type: 'flight' });
export const fetchHotelCoupons = (params = {}) => fetchCouponsAndOffers({ ...params, type: 'hotel' });

