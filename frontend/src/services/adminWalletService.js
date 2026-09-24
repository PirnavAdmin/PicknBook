/* eslint-disable */
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("b2b_token") ||
    sessionStorage.getItem("b2b_token") ||
    ""
  );
}

async function adminWalletRequest(path, options = {}) {
  const token = getAuthToken();
  const url = toApiUrl(path);
  const headers = withNgrokSkipWarningHeader(path, {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return data;
    }

    return null;
  } catch (err) {
    return null;
  }
}

export const adminWalletService = {
  // 1. Global Wallet Ledger Endpoint (GET /api/admin/wallet/ledger)
  getAdminLedger: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    if (params.userId) query.append("userId", String(params.userId));
    if (params.transactionType && params.transactionType !== "ALL" && params.transactionType !== "All") query.append("transactionType", params.transactionType);
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.referenceType) query.append("referenceType", params.referenceType);
    if (params.search) query.append("search", params.search);
    if (params.fromDate) query.append("fromDate", params.fromDate);
    if (params.toDate) query.append("toDate", params.toDate);

    const queryString = query.toString();
    const endpoints = [
      `/api/admin/wallet/ledger${queryString ? `?${queryString}` : ""}`,
      `/api/wallet/transactions${queryString ? `?${queryString}` : ""}`,
    ];

    for (const ep of endpoints) {
      const res = await adminWalletRequest(ep);
      if (res) return res;
    }
    return null;
  },

  // 2. Customer Consolidated Wallet Profile Summary (GET /api/admin/wallet/customer/{userId}/summary)
  getCustomerSummary: async (userId) => {
    const endpoints = [
      `/api/admin/wallet/customer/${userId}/summary`,
      `/api/Customers/${userId}/wallet/summary`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await adminWalletRequest(ep);
        if (res) return res;
      } catch (err) {
        if (ep === endpoints[endpoints.length - 1]) throw err;
      }
    }
  },

  // 3. Active Holds / Stuck Reservations Monitor (GET /api/admin/wallet/reservations)
  getReservations: async (status = "Reserved", olderThanMinutes = 15) => {
    const query = new URLSearchParams();
    if (status) query.append("status", status);
    if (olderThanMinutes) query.append("olderThanMinutes", String(olderThanMinutes));
    return adminWalletRequest(`/api/admin/wallet/reservations?${query.toString()}`);
  },

  // 4. Emergency Manual Release of Held Funds (POST /api/admin/wallet/reservations/{transactionId}/release)
  releaseReservation: async (transactionId, reason = "") => {
    return adminWalletRequest(`/api/admin/wallet/reservations/${transactionId}/release`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Admin manual release after payment gateway abandonment" }),
    });
  },

  // 5. Add Wallet Balance with Audit Trail (POST /api/Customers/{userId}/wallet/add)
  addWalletBalance: async (userId, amount, remark = "") => {
    return adminWalletRequest(`/api/Customers/${userId}/wallet/add`, {
      method: "POST",
      body: JSON.stringify({ amount: Number(amount), remark: remark || "Manual admin adjustment" }),
    });
  },

  // 6. Reset Wallet Balance with Audit Trail (POST /api/Customers/{userId}/wallet/reset)
  resetWalletBalance: async (userId) => {
    return adminWalletRequest(`/api/Customers/${userId}/wallet/reset`, {
      method: "POST",
    });
  },

  // 7. Admin Payments List & Tender Breakdown (GET /api/admin/payments)
  getAdminPayments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    if (params.status) query.append("status", params.status);
    if (params.search) query.append("search", params.search);

    const queryString = query.toString();
    return adminWalletRequest(`/api/admin/payments${queryString ? `?${queryString}` : ""}`);
  },

  // 8. Admin Refund Execution via RefundRouterService (POST /api/admin/payments/{id}/refund)
  refundAdminPayment: async (paymentId, payload = {}) => {
    return adminWalletRequest(`/api/admin/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 9. Unified Cancellations List (GET /api/admin/cancellations)
  getAdminCancellations: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    if (params.bookingType) query.append("bookingType", params.bookingType);
    if (params.status) query.append("status", params.status);
    if (params.search) query.append("search", params.search);

    const queryString = query.toString();
    return adminWalletRequest(`/api/admin/cancellations${queryString ? `?${queryString}` : ""}`);
  },
};

export default adminWalletService;

export const getAdminWalletLedger = (params) => adminWalletService.getAdminLedger(params);
export const getCustomerWalletSummary = (userId) => adminWalletService.getCustomerSummary(userId);
export const getWalletReservations = (status, olderThanMinutes) => adminWalletService.getReservations(status, olderThanMinutes);
export const releaseWalletReservation = (transactionId, reason) => adminWalletService.releaseReservation(transactionId, reason);
export const addCustomerWalletBalance = (userId, amount, remark) => adminWalletService.addWalletBalance(userId, amount, remark);
export const resetCustomerWalletBalance = (userId) => adminWalletService.resetCustomerWalletBalance(userId);
export const getAdminPayments = (params) => adminWalletService.getAdminPayments(params);
export const refundAdminPayment = (paymentId, payload) => adminWalletService.refundAdminPayment(paymentId, payload);
export const getAdminCancellations = (params) => adminWalletService.getAdminCancellations(params);
