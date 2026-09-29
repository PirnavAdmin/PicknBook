import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons as rawListBusCoupons,
  updateBusCoupon,
} from "./busBookingService";

import {
  getConditions,
  createCondition,
  updateCondition,
  deleteCondition,
  listAdminBusCoupons,
} from "./adminBusService";

const getBusCouponConditions = getConditions;
const createBusCouponCondition = createCondition;
const updateBusCouponCondition = updateCondition;
const deleteBusCouponCondition = deleteCondition;

const listBusCoupons = async (params = {}) => {
  const sType = (typeof params === "string" ? params : params?.type || params?.serviceType || "bus").toLowerCase();

  const baseList = await rawListBusCoupons(params);

  let rawData = [];
  try {
    rawData = await listAdminBusCoupons(params);
  } catch (e) {
    console.warn("Failed to fetch raw admin coupons:", e);
  }

  const rawMap = new Map();
  const rawArray = Array.isArray(rawData) ? rawData : (rawData?.value || rawData?.items || []);
  rawArray.forEach((item) => {
    if (item && typeof item === "object") {
      if (item.id !== undefined && item.id !== null) {
        rawMap.set(String(item.id), item);
      }
      const code = item.couponCode || item.CouponCode || item.code || item.Code;
      if (code) {
        rawMap.set(String(code).trim().toUpperCase(), item);
      }
    }
  });

  return (Array.isArray(baseList) ? baseList : []).map((item) => {
    const cleanCode = String(item.couponCode || item.code || "").trim().toUpperCase();
    const rawMatch = rawMap.get(String(item.id)) || (cleanCode ? rawMap.get(cleanCode) : null);
    const localMeta = getStoredCouponMetadataLocally(cleanCode, item.id, sType);

    const conds =
      (rawMatch && Array.isArray(rawMatch.conditions) && rawMatch.conditions.length > 0 ? rawMatch.conditions : null) ||
      (rawMatch && Array.isArray(rawMatch.Conditions) && rawMatch.Conditions.length > 0 ? rawMatch.Conditions : null) ||
      (rawMatch && Array.isArray(rawMatch.conditionList) && rawMatch.conditionList.length > 0 ? rawMatch.conditionList : null) ||
      (localMeta && Array.isArray(localMeta.conditions) && localMeta.conditions.length > 0 ? localMeta.conditions : null) ||
      (Array.isArray(item.conditions) ? item.conditions : []);

    return {
      ...item,
      conditions: conds,
      Conditions: conds,
    };
  });
};

export const APPROVED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

export const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/") || url.startsWith("/");
};

export const validateImageUrlForPayload = (url) => {
  if (url && !isValidImageUrl(url)) {
    return "Invalid image URL format.";
  }
  return null;
};

export const saveCouponImageLocally = (couponCode, id, imageUrl, serviceType = "") => {
  try {
    const images = JSON.parse(localStorage.getItem("admin_coupon_images") || "{}");
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    if (id) {
      if (sType) images[`${sType}_${id}`] = imageUrl;
      images[id] = imageUrl;
    }
    if (couponCode) {
      if (sType) images[`${sType}_${couponCode}`] = imageUrl;
      images[couponCode] = imageUrl;
    }
    localStorage.setItem("admin_coupon_images", JSON.stringify(images));
  } catch (e) {
    console.warn("Could not save coupon image locally", e);
  }
};

export const saveCouponCategoryLocally = (couponCode, id, category, serviceType = "") => {
  try {
    const cats = JSON.parse(localStorage.getItem("admin_coupon_categories") || "{}");
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    if (id) {
      if (sType) cats[`${sType}_${id}`] = category;
      cats[id] = category;
    }
    if (couponCode) {
      if (sType) cats[`${sType}_${couponCode}`] = category;
      cats[couponCode] = category;
    }
    localStorage.setItem("admin_coupon_categories", JSON.stringify(cats));
  } catch (e) {
    console.warn("Could not save coupon category locally", e);
  }
};

export const saveCouponServiceLocally = (couponCode, id, serviceType) => {
  try {
    const svcs = JSON.parse(localStorage.getItem("admin_coupon_services") || "{}");
    if (id) svcs[id] = serviceType;
    if (couponCode) svcs[couponCode] = serviceType;
    localStorage.setItem("admin_coupon_services", JSON.stringify(svcs));
  } catch (e) {
    console.warn("Could not save coupon service locally", e);
  }
};

export const saveCouponMetadataLocally = (couponCode, id, metadata, serviceType = "") => {
  try {
    const meta = JSON.parse(localStorage.getItem("admin_coupon_metadata") || "{}");
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";
    const sType = serviceType ? String(serviceType).toLowerCase() : "";

    const existingIdMeta = cleanId ? meta[cleanId] || {} : {};
    const existingCodeMeta = cleanCode ? meta[cleanCode] || {} : {};
    const merged = { ...existingCodeMeta, ...existingIdMeta, ...metadata };

    if (cleanId) {
      if (sType) meta[`${sType}_${cleanId}`] = merged;
      meta[cleanId] = merged;
    }
    if (cleanCode) {
      if (sType) meta[`${sType}_${cleanCode}`] = merged;
      meta[cleanCode] = merged;
    }

    localStorage.setItem("admin_coupon_metadata", JSON.stringify(meta));
  } catch (e) {
    console.warn("Could not save coupon metadata locally", e);
  }
};

export const getStoredCouponMetadataLocally = (couponCode, id, serviceType = "") => {
  try {
    const meta = JSON.parse(localStorage.getItem("admin_coupon_metadata") || "{}");
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";
    const sType = serviceType ? String(serviceType).toLowerCase() : "";

    if (sType) {
      if (cleanId && meta[`${sType}_${cleanId}`]) return meta[`${sType}_${cleanId}`];
      if (cleanCode && meta[`${sType}_${cleanCode}`]) return meta[`${sType}_${cleanCode}`];
    }
    return (cleanId && meta[cleanId]) || (cleanCode && meta[cleanCode]) || {};
  } catch (e) {
    return {};
  }
};

export const getImagePreviewSrc = (imageUrl, coupon) => {
  let url = "";
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
    url = imageUrl.trim();
  } else if ((imageUrl === undefined || imageUrl === null || imageUrl === "") && coupon && typeof coupon === "object") {
    if (coupon.imageUrl === null || coupon.imageUrl === "") {
      url = "";
    } else {
      const raw =
        coupon.imageUrl ||
        coupon.ImageUrl ||
        coupon.imageURL ||
        coupon.ImageURL ||
        coupon.image ||
        coupon.Image ||
        coupon.bannerUrl ||
        coupon.BannerUrl ||
        coupon.imgUrl ||
        coupon.ImgUrl ||
        "";
      if (raw && typeof raw === "string" && raw.trim()) url = raw.trim();
    }
  }

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return url.startsWith("/") ? url : `/${url}`;
};

export const uploadCouponImage = async (file) => {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("adminToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("adminToken");

  const response = await fetch("/api/files/upload?type=promotions", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Image upload failed: ${response.statusText}${errText ? ` (${errText})` : ""}`);
  }

  const result = await response.json();
  const uploadedUrl = result?.url || result?.Url || result?.path || result?.filePath || result?.data?.url || (typeof result === "string" ? result : "");
  return uploadedUrl;
};

export {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
  getBusCouponConditions,
  createBusCouponCondition,
  updateBusCouponCondition,
  deleteBusCouponCondition,
};
