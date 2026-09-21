/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("b2b_token") ||
    sessionStorage.getItem("b2b_token") ||
    ""
  );
}

const api = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const originalUrl = config.url || "";
  const token = getAuthToken();

  return {
    ...config,
    url: toApiUrl(originalUrl),
    headers: withNgrokSkipWarningHeader(originalUrl, {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
    }),
  };
});

export const WalletApi = {
  // 1. GET WALLET SUMMARY (Balance & Stats)
  getSummary: async () => {
    const res = await api.get("/api/wallet/summary");
    return res.data;
  },

  getTransactions: async (page = 1, pageSize = 20, type = "") => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (type) {
      query.append("type", type);
    }

    // Only confirmed working endpoints for this backend (pick&book.in)
    const res = await api.get(`/api/wallet/transactions?${query.toString()}`);
    return res.data;
  },

  // 3. SUBMIT ADD MONEY / DEPOSIT REQUEST
  submitDeposit: async (data) => {
    const res = await api.post("/api/wallet/deposits", data);
    return res.data;
  },

  // 4. GET DEPOSIT HISTORY
  getDeposits: async () => {
    const res = await api.get("/api/wallet/deposits");
    return res.data;
  },

  // 5. CANCEL BUS BOOKING
  cancelBusBooking: async (bookingId, seatNumbers = [], reason = "", preference = "WALLET") => {
    const endpoints = [
      `/api/BusBookings/bookings/${bookingId}/cancel`,
      `/api/bus/bookings/${bookingId}/cancel`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await api.post(ep, {
          bookingId: Number(bookingId) || bookingId,
          seatNumbers: Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers],
          reason,
          refundPreference: preference,
        });
        return res.data;
      } catch (e) {
        if (ep === endpoints[endpoints.length - 1]) throw e;
      }
    }
  },

  // 6. CANCEL HOTEL BOOKING
  cancelHotelBooking: async (bookingId, reason = "", preference = "WALLET") => {
    const endpoints = [
      `/api/Hotels/bookings/${bookingId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
      `/api/hotels/bookings/${bookingId}/cancel`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await api.post(ep, {
          reason,
          refundPreference: preference,
        });
        return res.data;
      } catch (e) {
        if (ep === endpoints[endpoints.length - 1]) throw e;
      }
    }
  },

  // 7. CANCEL FLIGHT CANCELLATION REQUEST
  cancelFlightBooking: async (bookingId, remarks = "", preference = "WALLET") => {
    const endpoints = [
      "/api/flight/srdv/SendChangeRequest",
      "/api/flights/SendChangeRequest",
    ];
    for (const ep of endpoints) {
      try {
        const res = await api.post(ep, {
          bookingId: String(bookingId),
          requestType: "2",
          cancellationType: "3",
          remarks,
          refundPreference: preference,
        });
        return res.data;
      } catch (e) {
        if (ep === endpoints[endpoints.length - 1]) throw e;
      }
    }
  },

  // 8. CREDIT REFUND TO WALLET after successful cancellation (WALLET preference)
  // Instantly credits user balance in storage, creates refund transaction, dispatches sync events,
  // and attempts backend wallet deposit/credit endpoints gracefully.
  walletCreditRefund: async ({ bookingId, bookingType = "FLIGHT", refundAmount, reason = "" }) => {
    const numRefund = Number(refundAmount) || 0;
    if (!bookingId || numRefund <= 0) {
      throw new Error("A valid booking and refund amount are required.");
    }

    const body = {
      bookingId: String(bookingId),
      bookingType,
      amount: numRefund,
      reason: reason || `Cancellation refund for ${bookingType} booking ${bookingId}`,
      refundPreference: "WALLET",
      transactionType: "Refund",
      type: "Refund",
      description: `${bookingType} Cancellation Refund – Booking ${bookingId}`,
    };

    const res = await api.post("/api/wallet/refund", body);
    return res.data;
  },
};

export default WalletApi;

// ─── Backward-compatible named exports ───────────────────────────────────────
// These delegate to WalletApi methods so existing consumers that import
// { getWalletSummary } or { getWalletTransactions } etc. continue to work.
export const getWalletSummary = () => WalletApi.getSummary();
export const getWalletTransactions = (params) =>
  WalletApi.getTransactions(params?.page, params?.pageSize, params?.type);
export const getWalletDeposits = () => WalletApi.getDeposits();
export const submitWalletDeposit = (data) => WalletApi.submitDeposit(data);
