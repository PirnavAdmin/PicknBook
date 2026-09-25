import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
} from "./busBookingService";

import {
  getConditions,
  createCondition,
  updateCondition,
  deleteCondition,
} from "./adminBusService";

const getBusCouponConditions = getConditions;
const createBusCouponCondition = createCondition;
const updateBusCouponCondition = updateCondition;
const deleteBusCouponCondition = deleteCondition;

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

export const saveCouponImageLocally = (couponCode, id, imageUrl) => {
  try {
    const images = JSON.parse(localStorage.getItem("admin_coupon_images") || "{}");
    images[id || couponCode] = imageUrl;
    localStorage.setItem("admin_coupon_images", JSON.stringify(images));
  } catch (e) {
    console.warn("Could not save coupon image locally", e);
  }
};

export const saveCouponCategoryLocally = (couponCode, id, category) => {
  try {
    const cats = JSON.parse(localStorage.getItem("admin_coupon_categories") || "{}");
    cats[id || couponCode] = category;
    localStorage.setItem("admin_coupon_categories", JSON.stringify(cats));
  } catch (e) {
    console.warn("Could not save coupon category locally", e);
  }
};

export const saveCouponServiceLocally = (couponCode, id, serviceType) => {
  try {
    const svcs = JSON.parse(localStorage.getItem("admin_coupon_services") || "{}");
    svcs[id || couponCode] = serviceType;
    localStorage.setItem("admin_coupon_services", JSON.stringify(svcs));
  } catch (e) {
    console.warn("Could not save coupon service locally", e);
  }
};

export const saveCouponMetadataLocally = (couponCode, id, metadata) => {
  try {
    const meta = JSON.parse(localStorage.getItem("admin_coupon_metadata") || "{}");
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";

    const existingIdMeta = cleanId ? meta[cleanId] || {} : {};
    const existingCodeMeta = cleanCode ? meta[cleanCode] || {} : {};
    const merged = { ...existingCodeMeta, ...existingIdMeta, ...metadata };

    if (cleanId) meta[cleanId] = merged;
    if (cleanCode) meta[cleanCode] = merged;

    localStorage.setItem("admin_coupon_metadata", JSON.stringify(meta));
  } catch (e) {
    console.warn("Could not save coupon metadata locally", e);
  }
};

export const getStoredCouponMetadataLocally = (couponCode, id) => {
  try {
    const meta = JSON.parse(localStorage.getItem("admin_coupon_metadata") || "{}");
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";
    return (cleanId && meta[cleanId]) || (cleanCode && meta[cleanCode]) || {};
  } catch (e) {
    return {};
  }
};

export const getImagePreviewSrc = (imageUrl, coupon) => {
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
    return imageUrl.trim();
  }
  if (coupon && typeof coupon === "object") {
    const raw =
      coupon.imageUrl ||
      coupon.ImageUrl ||
      coupon.image ||
      coupon.Image ||
      coupon.bannerUrl ||
      coupon.BannerUrl ||
      coupon.imgUrl ||
      coupon.ImgUrl ||
      "";
    if (raw && typeof raw === "string" && raw.trim()) return raw.trim();
  }
  if (coupon) {
    try {
      const code = String(coupon.couponCode || coupon.code || "").toUpperCase();
      const id = String(coupon.id || "");
      const images = JSON.parse(localStorage.getItem("admin_coupon_images") || "{}");
      const found = images[id] || images[code];
      if (found && typeof found === "string" && found.trim()) return found.trim();
    } catch (e) {}
  }
  return "";
};

export const uploadCouponImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
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
