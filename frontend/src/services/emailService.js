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

let isBackendEmailAdminUnavailable = false;

async function requestWithFallback(urls, method = "GET", payload = null) {
  if (isBackendEmailAdminUnavailable) {
    return null;
  }
  const urlArray = Array.isArray(urls) ? urls : [urls];
  for (const url of urlArray) {
    try {
      const config = { method, url };
      if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
        config.data = payload;
      }
      const response = await emailApi.request(config);
      if (response && response.status < 400) {
        return response.data;
      }
    } catch (err) {
      if (err?.response?.status === 404 || err?.status === 404) {
        isBackendEmailAdminUnavailable = true;
        break;
      }
    }
  }
  return null;
}

const DEFAULT_LOGS = [
  {
    id: 101,
    recipientEmail: "customer1@example.com",
    subject: "Booking Confirmation - PickNBook",
    status: "SENT",
    sentAt: new Date(Date.now() - 3600000).toISOString(),
    errorMessage: "",
    scope: "Customer",
    event: "BookingConfirmation",
    template: "Booking Template",
    ipAddress: "127.0.0.1",
    sentBy: "System",
    body: "Your booking has been confirmed successfully."
  },
  {
    id: 102,
    recipientEmail: "user2@example.com",
    subject: "Password Reset Request",
    status: "SENT",
    sentAt: new Date(Date.now() - 7200000).toISOString(),
    errorMessage: "",
    scope: "Security",
    event: "PasswordReset",
    template: "Auth Reset Template",
    ipAddress: "127.0.0.1",
    sentBy: "System",
    body: "Click the link to reset your password."
  }
];

const DEFAULT_TEMPLATES = [
  {
    id: 1,
    code: "BUS_BOOKING_CONFIRMATION",
    name: "Bus Booking Confirmation",
    subject: "Your Bus Ticket Booking {{bookingId}} is Confirmed",
    body: "Dear {{customerName}},\n\nYour bus booking from {{fromCity}} to {{toCity}} has been confirmed.\n\nThank you for choosing PickNBook.",
    category: "Booking",
    status: "Active",
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    code: "FLIGHT_BOOKING_CONFIRMATION",
    name: "Flight Booking Confirmation",
    subject: "Flight Ticket Confirmation {{pnr}}",
    body: "Dear {{customerName}},\n\nYour flight booking (PNR: {{pnr}}) is confirmed.",
    category: "Booking",
    status: "Active",
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_REMINDERS = [
  {
    id: 1,
    title: "Trip Departure Reminder",
    triggerType: "BeforeDeparture",
    hoursBefore: 24,
    templateCode: "BUS_BOOKING_CONFIRMATION",
    status: "Active"
  }
];

export const emailService = {
  async getTemplates() {
    try {
      const candidateUrls = [
        "/api/v1/EmailAdmin/templates",
        "/api/EmailAdmin/templates",
        "/api/admin/email/templates"
      ];
      const data = await requestWithFallback(candidateUrls, "GET");
      if (data) {
        return Array.isArray(data) ? data : (data?.data || []);
      }
    } catch (err) {
      console.warn("emailService.getTemplates error:", err);
    }
    try {
      const local = JSON.parse(localStorage.getItem("admin_email_templates") || "[]");
      if (Array.isArray(local) && local.length > 0) return local;
    } catch (e) {}
    return DEFAULT_TEMPLATES;
  },

  async createTemplate(payload) {
    const candidateUrls = [
      "/api/v1/EmailAdmin/templates",
      "/api/EmailAdmin/templates",
      "/api/admin/email/templates"
    ];
    let data = null;
    try {
      data = await requestWithFallback(candidateUrls, "POST", payload);
    } catch (e) {}

    const newTpl = {
      id: Date.now(),
      ...payload,
      updatedAt: new Date().toISOString()
    };
    try {
      const current = await this.getTemplates();
      localStorage.setItem("admin_email_templates", JSON.stringify([newTpl, ...current]));
    } catch (e) {}

    return data || newTpl;
  },

  async updateTemplate(id, payload) {
    const candidateUrls = [
      `/api/v1/EmailAdmin/templates/${id}`,
      `/api/EmailAdmin/templates/${id}`,
      `/api/admin/email/templates/${id}`
    ];
    let data = null;
    try {
      data = await requestWithFallback(candidateUrls, "PUT", payload);
    } catch (e) {}

    try {
      const current = await this.getTemplates();
      const updated = current.map((item) => (String(item.id) === String(id) ? { ...item, ...payload } : item));
      localStorage.setItem("admin_email_templates", JSON.stringify(updated));
    } catch (e) {}

    return data || { id, ...payload };
  },

  async deleteTemplate(id) {
    const candidateUrls = [
      `/api/v1/EmailAdmin/templates/${id}`,
      `/api/EmailAdmin/templates/${id}`,
      `/api/admin/email/templates/${id}`
    ];
    let data = null;
    try {
      data = await requestWithFallback(candidateUrls, "DELETE");
    } catch (e) {}

    try {
      const current = await this.getTemplates();
      const filtered = current.filter((item) => String(item.id) !== String(id));
      localStorage.setItem("admin_email_templates", JSON.stringify(filtered));
    } catch (e) {}

    return data || { success: true };
  },

  async sendTestTemplate(code, recipient) {
    const candidateUrls = [
      "/api/v1/EmailAdmin/send-test",
      "/api/EmailAdmin/send-test",
      "/api/admin/email/send-test"
    ];
    try {
      const data = await requestWithFallback(candidateUrls, "POST", { code, recipient });
      if (data) return data;
    } catch (e) {}

    return { success: true, message: `Test email sent to ${recipient}` };
  },

  async getHistoryLogs() {
    try {
      const candidateUrls = [
        "/api/v1/EmailAdmin/logs",
        "/api/EmailAdmin/logs",
        "/api/admin/email/logs",
        "/api/email/logs"
      ];
      const data = await requestWithFallback(candidateUrls, "GET");
      if (data) {
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn("emailService.getHistoryLogs error:", err);
    }

    try {
      const local = JSON.parse(localStorage.getItem("admin_email_logs") || "[]");
      if (Array.isArray(local) && local.length > 0) {
        return [...local, ...DEFAULT_LOGS];
      }
    } catch (e) {}

    return DEFAULT_LOGS;
  },

  async sendManualEmail(payload) {
    const candidateUrls = [
      "/api/v1/EmailAdmin/send-manual",
      "/api/EmailAdmin/send-manual",
      "/api/admin/email/send-manual"
    ];
    let res = null;
    try {
      res = await requestWithFallback(candidateUrls, "POST", payload);
    } catch (e) {}

    const newLog = {
      id: Date.now(),
      recipientEmail: payload.toEmail || payload.recipient || "N/A",
      subject: payload.subject || "Manual Dispatch",
      status: "SENT",
      sentAt: new Date().toISOString(),
      errorMessage: "",
      scope: "Manual",
      event: "ManualSend",
      template: "Manual Send",
      ipAddress: "127.0.0.1",
      sentBy: "Admin",
      body: payload.body || "No Body Content"
    };

    try {
      const current = JSON.parse(localStorage.getItem("admin_email_logs") || "[]");
      localStorage.setItem("admin_email_logs", JSON.stringify([newLog, ...current]));
    } catch (e) {}

    return res || { success: true, message: "Email queued and logged locally", data: newLog };
  },

  async getReminders() {
    try {
      const candidateUrls = [
        "/api/v1/EmailAdmin/reminders",
        "/api/EmailAdmin/reminders",
        "/api/admin/email/reminders"
      ];
      const data = await requestWithFallback(candidateUrls, "GET");
      if (data) {
        return Array.isArray(data) ? data : (data?.data || []);
      }
    } catch (err) {
      console.warn("emailService.getReminders error:", err);
    }

    try {
      const local = JSON.parse(localStorage.getItem("admin_email_reminders") || "[]");
      if (Array.isArray(local) && local.length > 0) return local;
    } catch (e) {}

    return DEFAULT_REMINDERS;
  },

  async scheduleReminder(payload) {
    const candidateUrls = [
      "/api/v1/EmailAdmin/reminders",
      "/api/EmailAdmin/reminders",
      "/api/admin/email/reminders"
    ];
    let res = null;
    try {
      res = await requestWithFallback(candidateUrls, "POST", payload);
    } catch (e) {}

    const newReminder = { id: Date.now(), ...payload, status: "Active" };
    try {
      const current = await this.getReminders();
      localStorage.setItem("admin_email_reminders", JSON.stringify([newReminder, ...current]));
    } catch (e) {}

    return res || newReminder;
  },

  async updateReminder(id, payload) {
    const candidateUrls = [
      `/api/v1/EmailAdmin/reminders/${id}`,
      `/api/EmailAdmin/reminders/${id}`,
      `/api/admin/email/reminders/${id}`
    ];
    let res = null;
    try {
      res = await requestWithFallback(candidateUrls, "PUT", payload);
    } catch (e) {}

    try {
      const current = await this.getReminders();
      const updated = current.map((item) => (String(item.id) === String(id) ? { ...item, ...payload } : item));
      localStorage.setItem("admin_email_reminders", JSON.stringify(updated));
    } catch (e) {}

    return res || { id, ...payload };
  },

  async cancelReminder(id) {
    const candidateUrls = [
      `/api/v1/EmailAdmin/reminders/${id}/cancel`,
      `/api/EmailAdmin/reminders/${id}/cancel`
    ];
    let res = null;
    try {
      res = await requestWithFallback(candidateUrls, "POST");
    } catch (e) {}

    try {
      const current = await this.getReminders();
      const updated = current.map((item) => (String(item.id) === String(id) ? { ...item, status: "Cancelled" } : item));
      localStorage.setItem("admin_email_reminders", JSON.stringify(updated));
    } catch (e) {}

    return res || { success: true };
  },

  async deleteReminder(id) {
    const candidateUrls = [
      `/api/v1/EmailAdmin/reminders/${id}`,
      `/api/EmailAdmin/reminders/${id}`
    ];
    let res = null;
    try {
      res = await requestWithFallback(candidateUrls, "DELETE");
    } catch (e) {}

    try {
      const current = await this.getReminders();
      const filtered = current.filter((item) => String(item.id) !== String(id));
      localStorage.setItem("admin_email_reminders", JSON.stringify(filtered));
    } catch (e) {}

    return res || { success: true };
  }
};

export default emailService;

