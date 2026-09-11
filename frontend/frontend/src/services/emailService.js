/* eslint-disable */
import { toApiUrl } from "./apiClient";
import { getAuthToken } from "./authSession";

function getAdminAuthHeaders(hasBody = false) {
  const sanitize = (val) => {
    const text = String(val ?? "").trim();
    return (text === "undefined" || text === "null") ? "" : text;
  };

  const token = typeof window !== "undefined"
    ? sanitize(window.localStorage.getItem("adminToken")) || sanitize(getAuthToken()) || sanitize(window.localStorage.getItem("token"))
    : "";

  const adminId = typeof window !== "undefined"
    ? sanitize(window.localStorage.getItem("adminId"))
    : "";

  const headers = { Accept: "application/json" };
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (adminId) headers["X-Admin-Id"] = adminId;
  return headers;
}

async function request(path, options = {}) {
  const hasBody = !!options.body;
  const response = await fetch(toApiUrl(path), {
    ...options,
    headers: { ...getAdminAuthHeaders(hasBody), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.Message || "Email service request failed");
  return data;
}

const emailService = {
  // Email Logs
  getHistoryLogs: (params = {}) => request(`/api/admin/email/logs?${new URLSearchParams(params).toString()}`),
  sendManualEmail: (payload) => request("/api/admin/email/send", { method: "POST", body: JSON.stringify(payload) }),

  // Email Templates
  getTemplates: (params = {}) => request(`/api/admin/email/templates?${new URLSearchParams(params).toString()}`),
  createTemplate: (payload) => request("/api/admin/email/templates", { method: "POST", body: JSON.stringify(payload) }),
  updateTemplate: (id, payload) => request(`/api/admin/email/templates/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTemplate: (id) => request(`/api/admin/email/templates/${id}`, { method: "DELETE" }),
  sendTestTemplate: (code, recipient) => request("/api/admin/email/templates/test", { method: "POST", body: JSON.stringify({ code, recipient }) }),

  // Email Reminders
  getReminders: (params = {}) => request(`/api/admin/email/reminders?${new URLSearchParams(params).toString()}`),
  scheduleReminder: (payload) => request("/api/admin/email/reminders", { method: "POST", body: JSON.stringify(payload) }),
  updateReminder: (id, payload) => request(`/api/admin/email/reminders/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelReminder: (id) => request(`/api/admin/email/reminders/${id}/cancel`, { method: "PUT" }),
  deleteReminder: (id) => request(`/api/admin/email/reminders/${id}`, { method: "DELETE" }),
};

export default emailService;
