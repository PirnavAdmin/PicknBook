/* eslint-disable */
import axios from "axios";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

const emailApi = axios.create({
  headers: {
    Accept: "application/json",
  },
});

emailApi.interceptors.request.use((config) => {
  const originalUrl = config.url || "";
  const token = getStoredAdminToken();

  return {
    ...config,
    url: toApiUrl(originalUrl),
    headers: withNgrokSkipWarningHeader(originalUrl, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
    }),
  };
});

function getStoredAdminToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("adminToken") ||
    window.localStorage.getItem("token") ||
    ""
  );
}

export const emailService = {
  async getTemplates() {
    try {
      const response = await emailApi.get("/api/v1/EmailAdmin/templates");
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (err) {
      console.warn("emailService.getTemplates error:", err);
      return [];
    }
  },

  async createTemplate(payload) {
    const response = await emailApi.post("/api/v1/EmailAdmin/templates", payload);
    return response.data;
  },

  async updateTemplate(id, payload) {
    const response = await emailApi.put(`/api/v1/EmailAdmin/templates/${id}`, payload);
    return response.data;
  },

  async deleteTemplate(id) {
    const response = await emailApi.delete(`/api/v1/EmailAdmin/templates/${id}`);
    return response.data;
  },

  async sendTestTemplate(code, recipient) {
    const response = await emailApi.post("/api/v1/EmailAdmin/send-test", { code, recipient });
    return response.data;
  },

  async getHistoryLogs() {
    try {
      const response = await emailApi.get("/api/v1/EmailAdmin/logs");
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (err) {
      console.warn("emailService.getHistoryLogs error:", err);
      return [];
    }
  },

  async sendManualEmail(payload) {
    const response = await emailApi.post("/api/v1/EmailAdmin/send-manual", payload);
    return response.data;
  },

  async getReminders() {
    try {
      const response = await emailApi.get("/api/v1/EmailAdmin/reminders");
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (err) {
      console.warn("emailService.getReminders error:", err);
      return [];
    }
  },

  async scheduleReminder(payload) {
    const response = await emailApi.post("/api/v1/EmailAdmin/reminders", payload);
    return response.data;
  },

  async updateReminder(id, payload) {
    const response = await emailApi.put(`/api/v1/EmailAdmin/reminders/${id}`, payload);
    return response.data;
  },

  async cancelReminder(id) {
    const response = await emailApi.post(`/api/v1/EmailAdmin/reminders/${id}/cancel`);
    return response.data;
  },

  async deleteReminder(id) {
    const response = await emailApi.delete(`/api/v1/EmailAdmin/reminders/${id}`);
    return response.data;
  }
};

export default emailService;
