/* eslint-disable */
/**
 * paymentService.js
 *
 * Handles all Cashfree payment gateway interactions via the PicknBook backend.
 * The frontend NEVER calls Cashfree''s server-side API directly.
 * API keys live entirely on the backend.
 */

import { toApiUrl } from "./apiClient";

const CASHFREE_CREATE_ORDER_PATH = "/api/cashfree/create-order";

/**
 * Creates a Cashfree payment order via PicknBook backend.
 * @param {Object} params
 * @param {number} params.orderAmount
 * @param {string} params.customerId
 * @param {string} params.customerName
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 */
export async function createCashfreeOrder({
  orderAmount,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  bookingType,
  bookingPayloadJson,
  couponCode,
  promotionId,
}) {
  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/payment/cashfree/return?order_id={order_id}`
      : "/payment/cashfree/return?order_id={order_id}";

  const notifyUrl = typeof window !== "undefined"
    ? toApiUrl("/api/cashfree/webhook")
    : "https://www.picknbook.in/api/cashfree/webhook";

  const payload = {
    orderAmount: Number(orderAmount) || 0,
    orderCurrency: "INR",
    customerId: String(customerId || "GUEST_001"),
    customerName: String(customerName || "Customer").trim(),
    customerEmail: String(customerEmail || "").trim(),
    customerPhone: String(customerPhone || "").replace(/\D/g, "").slice(-10),
    returnUrl,
    notifyUrl,
    bookingType,
    bookingPayloadJson,
    couponCode: couponCode || null,
    promotionId: promotionId || null,
    selectedFeaturedOfferId: promotionId || null,
  };

  const url = toApiUrl(CASHFREE_CREATE_ORDER_PATH);
  let token = "";
  try {
    token =
      localStorage.getItem("token") ||
      localStorage.getItem("b2b_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("b2b_token") ||
      "";
  } catch { }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `Failed to create Cashfree order (HTTP ${response.status})`;
    try {
      const errBody = await response.json();
      errMsg = errBody?.message || errBody?.error || errMsg;
    } catch { }
    throw new Error(errMsg);
  }

  const data = await response.json();

  if (!data || !data.payment_session_id) {
    throw new Error("Invalid response from payment server: payment_session_id missing.");
  }

  return {
    order_id: data.order_id || "",
    payment_session_id: data.payment_session_id || "",
    cf_order_id: data.cf_order_id || "",
    order_amount: data.order_amount || orderAmount,
    order_currency: data.order_currency || "INR",
    order_status: data.order_status || "ACTIVE",
  };
}

export async function verifyCashfreePayment(orderId) {
  const url = toApiUrl(`/api/cashfree/orders/${orderId}/payments`);
  
  let token = "";
  try {
    token =
      localStorage.getItem("token") ||
      localStorage.getItem("b2b_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("b2b_token") ||
      "";
  } catch { }

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new Error("Failed to verify payment");
  }

  return response.json();
}
