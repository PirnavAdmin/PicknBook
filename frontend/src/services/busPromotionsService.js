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

export const saveCouponImageLocally = (couponCode, id, imageUrl, serviceType = "") => {
  try {
    const images = JSON.parse(localStorage.getItem("admin_coupon_images") || "{}");
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";

    if (cleanId && sType) images[`${sType}_${cleanId}`] = imageUrl;
    if (cleanCode && sType) images[`${sType}_${cleanCode}`] = imageUrl;
    if (cleanCode) images[cleanCode] = imageUrl;
    if (cleanId && !sType) images[cleanId] = imageUrl;

    localStorage.setItem("admin_coupon_images", JSON.stringify(images));
  } catch (e) {
    console.warn("Could not save coupon image locally", e);
  }
};

export const saveCouponCategoryLocally = (couponCode, id, category, serviceType = "") => {
  try {
    const cats = JSON.parse(localStorage.getItem("admin_coupon_categories") || "{}");
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";

    if (cleanId && sType) cats[`${sType}_${cleanId}`] = category;
    if (cleanCode && sType) cats[`${sType}_${cleanCode}`] = category;
    if (cleanCode) cats[cleanCode] = category;
    if (cleanId && !sType) cats[cleanId] = category;

    localStorage.setItem("admin_coupon_categories", JSON.stringify(cats));
  } catch (e) {
    console.warn("Could not save coupon category locally", e);
  }
};

export const saveCouponServiceLocally = (couponCode, id, serviceType) => {
  try {
    const svcs = JSON.parse(localStorage.getItem("admin_coupon_services") || "{}");
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const cleanId = id !== null && id !== undefined ? String(id).trim() : "";

    if (cleanId && sType) svcs[`${sType}_${cleanId}`] = sType;
    if (cleanCode && sType) svcs[`${sType}_${cleanCode}`] = sType;
    if (cleanCode) svcs[cleanCode] = sType;
    if (cleanId && !sType) svcs[cleanId] = sType;

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

    const existingServiceIdMeta = cleanId && sType ? meta[`${sType}_${cleanId}`] || {} : {};
    const existingServiceCodeMeta = cleanCode && sType ? meta[`${sType}_${cleanCode}`] || {} : {};
    const existingCodeMeta = cleanCode ? meta[cleanCode] || {} : {};
    const merged = { ...existingCodeMeta, ...existingServiceCodeMeta, ...existingServiceIdMeta, ...metadata };

    if (cleanId && sType) meta[`${sType}_${cleanId}`] = merged;
    if (cleanCode && sType) meta[`${sType}_${cleanCode}`] = merged;
    if (cleanCode) meta[cleanCode] = merged;
    if (cleanId && !sType) meta[cleanId] = merged;

    localStorage.setItem("admin_coupon_metadata", JSON.stringify(meta));
  } catch (e) {
    console.warn("Could not save coupon metadata locally", e);
  }
};

export const purgeCouponFromLocalStorage = (couponId, serviceType = "", couponCode = "") => {
  try {
    const sType = serviceType ? String(serviceType).toLowerCase() : "";
    const cleanId = couponId !== null && couponId !== undefined ? String(couponId).trim() : "";
    const cleanCode = couponCode ? String(couponCode).trim().toUpperCase() : "";

    const keysToPurge = [
      "admin_coupon_metadata",
      "admin_coupon_images",
      "admin_coupon_categories",
      "admin_coupon_services"
    ];

    keysToPurge.forEach((storageKey) => {
      try {
        const itemStr = localStorage.getItem(storageKey);
        if (!itemStr) return;
        const data = JSON.parse(itemStr);
        if (typeof data !== "object" || !data) return;

        let modified = false;
        const removeKeys = new Set();
        if (cleanId) {
          removeKeys.add(cleanId);
          if (sType) removeKeys.add(`${sType}_${cleanId}`);
          removeKeys.add(`bus_${cleanId}`);
          removeKeys.add(`flight_${cleanId}`);
          removeKeys.add(`hotel_${cleanId}`);
        }
        if (cleanCode) {
          removeKeys.add(cleanCode);
          if (sType) removeKeys.add(`${sType}_${cleanCode}`);
          removeKeys.add(`bus_${cleanCode}`);
          removeKeys.add(`flight_${cleanCode}`);
          removeKeys.add(`hotel_${cleanCode}`);
        }

        for (const k of removeKeys) {
          if (k in data) {
            delete data[k];
            modified = true;
          }
        }

        if (modified) {
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    console.warn("Could not purge coupon from localStorage:", e);
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
