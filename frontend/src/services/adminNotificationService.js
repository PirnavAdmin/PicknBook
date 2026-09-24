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

async function adminNotificationRequest(path, options = {}) {
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

    if (!response.ok) {
      return null;
    }
    const data = await response.json().catch(() => null);
    return data;
  } catch (err) {
    console.error("adminNotificationRequest error:", err);
    return null;
  }
}

export const adminNotificationService = {
  /**
   * 1. Get Paginated Notifications
   * GET /api/admin/notifications?page=1&pageSize=20&isRead=true/false
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined && params.page !== null) query.append("page", String(params.page));
    if (params.pageSize !== undefined && params.pageSize !== null) query.append("pageSize", String(params.pageSize));
    if (params.isRead !== undefined && params.isRead !== null && params.isRead !== "") query.append("isRead", String(params.isRead));

    const queryString = query.toString();
    const endpoint = `/api/admin/notifications${queryString ? `?${queryString}` : ""}`;
    const result = await adminNotificationRequest(endpoint, { method: "GET" });
    return result;
  },

  /**
   * 2. Get Unread Count
   * GET /api/admin/notifications/unread-count
   */
  getUnreadCount: async () => {
    const result = await adminNotificationRequest("/api/admin/notifications/unread-count", { method: "GET" });
    if (result === null || result === undefined) return 0;
    if (typeof result === "number") return result;
    if (typeof result === "object") {
      if (typeof result.unreadCount === "number") return result.unreadCount;
      if (typeof result.count === "number") return result.count;
    }
    return 0;
  },

  /**
   * 3. Mark Single Notification as Read
   * PUT /api/admin/notifications/{id}/read
   */
  markAsRead: async (id) => {
    if (!id) return null;
    const result = await adminNotificationRequest(`/api/admin/notifications/${id}/read`, {
      method: "PUT",
    });
    return result;
  },

  /**
   * 4. Mark All Notifications as Read
   * PUT /api/admin/notifications/mark-all-read
   */
  markAllAsRead: async () => {
    const result = await adminNotificationRequest("/api/admin/notifications/mark-all-read", {
      method: "PUT",
    });
    return result;
  },

  /**
   * 5. Broadcast a Notification to Users
   * POST /api/admin/notifications/broadcast
   * Payload: { title, message, targetRole, type, category, severity }
   */
  broadcastNotification: async (payload = {}) => {
    const result = await adminNotificationRequest("/api/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result;
  },
};
