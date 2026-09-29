import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { getAuthToken } from "../../services/authSession";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationsService";
import "../../STYLES/Notifications.css";

const CATEGORIES = ["Flight", "Bus", "Hotel", "Wallet", "System"];
const SEVERITIES = ["Info", "Success", "Warning", "Error"];

function severityClass(severity) {
  return String(severity || "info").toLowerCase();
}

function safeActionPath(actionUrl) {
  return typeof actionUrl === "string" && actionUrl.startsWith("/") && !actionUrl.startsWith("//")
    ? actionUrl
    : "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ unreadOnly: false, category: "", severity: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], totalPages: 1, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPage = useCallback(async () => {
    if (!getAuthToken()) {
      navigate(`/login?returnTo=${encodeURIComponent("/notifications")}`, { replace: true });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getNotifications({ page, pageSize: 20, ...filters });
      setData({
        items: Array.isArray(result?.items) ? result.items : [],
        totalPages: Number(result?.totalPages) || 1,
        unreadCount: Number(result?.unreadCount) || 0,
      });
    } catch (requestError) {
      setError(requestError.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [filters, navigate, page]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleMarkRead = async (item) => {
    try {
      if (!item.isRead) await markNotificationRead(item.id);
      setData((current) => ({
        ...current,
        items: filters.unreadOnly && !item.isRead
          ? current.items.filter((entry) => entry.id !== item.id)
          : current.items.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry),
        unreadCount: item.isRead ? current.unreadCount : Math.max(0, current.unreadCount - 1),
      }));
      const actionPath = safeActionPath(item.actionUrl);
      if (actionPath) navigate(actionPath);
    } catch (requestError) {
      setError(requestError.message || "Could not mark notification as read.");
    }
  };

  const handleMarkAll = async () => {
    setBusy(true);
    setError("");
    try {
      await markAllNotificationsRead();
      setData((current) => ({
        ...current,
        items: filters.unreadOnly ? [] : current.items.map((item) => ({ ...item, isRead: true })),
        unreadCount: 0,
      }));
    } catch (requestError) {
      setError(requestError.message || "Could not mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="b2c-notifications-page">
      <div className="b2c-notifications-heading">
        <div>
          <span className="b2c-notifications-eyebrow">YOUR ACCOUNT</span>
          <h1>Notifications</h1>
          <p>Updates about your bookings, payments, and account.</p>
        </div>
        <div className="b2c-notifications-count" aria-live="polite">
          <Bell size={18} />
          <span>{data.unreadCount} unread</span>
        </div>
      </div>

      <div className="b2c-notifications-toolbar">
        <div className="b2c-notifications-filters">
          <label>
            <span>Category</span>
            <select value={filters.category} onChange={(event) => setFilter("category", event.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Severity</span>
            <select value={filters.severity} onChange={(event) => setFilter("severity", event.target.value)}>
              <option value="">All severities</option>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </label>
          <label className="b2c-notifications-unread-filter">
            <input
              type="checkbox"
              checked={filters.unreadOnly}
              onChange={(event) => setFilter("unreadOnly", event.target.checked)}
            />
            Unread only
          </label>
        </div>
        <button
          type="button"
          className="b2c-notifications-mark-all"
          onClick={handleMarkAll}
          disabled={busy || data.unreadCount === 0}
        >
          <CheckCheck size={17} /> Mark all as read
        </button>
      </div>

      {error && <div className="b2c-notifications-error" role="alert">{error}</div>}
      <section className="b2c-notifications-list" aria-live="polite">
        {loading ? (
          <div className="b2c-notifications-state">Loading notifications...</div>
        ) : data.items.length ? (
          data.items.map((item) => (
            <button
              className={`b2c-notification-row ${item.isRead ? "is-read" : "is-unread"}`}
              key={item.id}
              type="button"
              onClick={() => handleMarkRead(item)}
            >
              <span className={`b2c-notification-severity ${severityClass(item.severity)}`} aria-hidden="true" />
              <span className="b2c-notification-copy">
                <span className="b2c-notification-title-line">
                  <strong>{item.title}</strong>
                  {!item.isRead && <span className="b2c-notification-unread-label">NEW</span>}
                </span>
                <span className="b2c-notification-message">{item.message}</span>
                <span className="b2c-notification-meta">
                  {item.category && <span>{item.category}</span>}
                  {item.severity && <span className={`b2c-notification-severity-label ${severityClass(item.severity)}`}>{item.severity}</span>}
                  <time dateTime={item.createdAtUtc}>{formatDate(item.createdAtUtc)}</time>
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="b2c-notifications-state b2c-notifications-empty">
            <Inbox size={28} />
            <strong>You’re all caught up</strong>
            <span>New booking and account updates will appear here.</span>
          </div>
        )}
      </section>

      <div className="b2c-notifications-pagination">
        <span>Page {page} of {data.totalPages}</span>
        <div>
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next page" disabled={page >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}