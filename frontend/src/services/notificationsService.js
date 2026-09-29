import { getAuthToken } from "./authSession";
import { toApiUrl } from "./apiClient";

async function request(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please sign in to view your notifications.");
  }

  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string"
      ? payload.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : payload?.message || payload?.title;
    throw new Error(message || "Could not load notifications.");
  }

  if (options.method === "PUT" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("notificationsUpdated"));
  }

  return payload;
}

export async function getUnreadNotificationCount() {
  const payload = await request("/api/notifications/unread-count");
  return Number(payload?.unreadCount) || 0;
}

export function getNotifications({
  page = 1,
  pageSize = 20,
  unreadOnly,
  category,
  severity,
} = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (unreadOnly !== undefined) query.set("unreadOnly", String(unreadOnly));
  if (category) query.set("category", category);
  if (severity) query.set("severity", severity);
  return request(`/api/notifications?${query.toString()}`);
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
}

export function markAllNotificationsRead() {
  return request("/api/notifications/mark-all-read", { method: "PUT" });
}