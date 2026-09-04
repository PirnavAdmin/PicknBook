/* eslint-disable */
/**
 * useCashfreePayment.js
 *
 * Shared React hook for initiating Cashfree checkout.
 * Updated to support Seamless Integration (Core Checkout) using NPM package.
 */

import { useState, useRef } from "react";
import { createCashfreeOrder } from "../services/paymentService";
import { load } from "@cashfreepayments/cashfree-js";

export function useCashfreePayment() {
  const [cfStatus, setCfStatus] = useState("idle"); 
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cfInstanceRef = useRef(null);

  const clearError = () => setPaymentError("");

  /**
   * Initializes the payment session and returns the session ID
   * for the UI Elements to mount.
   */
  const initializePaymentSession = async ({
    orderAmount, customerId, customerName, customerEmail,
    customerPhone, bookingType, bookingPayloadJson, couponCode = null, promotionId = null
  }) => {
    if (isSubmitting || cfStatus === "creating") return null;

    setPaymentError("");
    setIsSubmitting(true);
    setCfStatus("creating");

    try {
      const orderData = await createCashfreeOrder({
        orderAmount, customerId, customerName, customerEmail,
        customerPhone, bookingType, bookingPayloadJson, couponCode, promotionId,
      });

      try {
        sessionStorage.setItem("pending_cashfree_order_id", orderData.order_id);
        sessionStorage.setItem(
          "pending_cashfree_booking",
          JSON.stringify({
            orderId: orderData.order_id,
            bookingType,
            email: customerEmail,
            mobile: customerPhone,
          })
        );
      } catch {}

      const cashfree = await load({ mode: "production" });
      cfInstanceRef.current = cashfree;
      
      setCfStatus("ready");
      setIsSubmitting(false);
      return { paymentSessionId: orderData.payment_session_id, cashfree };
    } catch (err) {
      console.error("[useCashfreePayment] init error:", err);
      setPaymentError(err?.message || "Payment initiation failed. Please try again.");
      setCfStatus("failed");
      setIsSubmitting(false);
      return null;
    }
  };

  return { initializePaymentSession, cfStatus, paymentError, isSubmitting, clearError };
}
