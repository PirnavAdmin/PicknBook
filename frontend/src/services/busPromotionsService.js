import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
} from "./busBookingService";

import {
  getConditions,
  createCondition,
  deleteCondition,
} from "./adminBusService";

const getBusCouponConditions = getConditions;
const createBusCouponCondition = createCondition;
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

export const getImagePreviewSrc = (imageUrl) => {
  return imageUrl || "";
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
  deleteBusCouponCondition,
};
