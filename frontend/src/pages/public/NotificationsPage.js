import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Bus,
  Plane,
  Building2,
  ShieldAlert,
  Wallet,
  CreditCard,
  CheckCheck,
  RefreshCw,
  Filter,
  Clock,
  Inbox,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { getAuthToken } from "../../services/authSession";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationsService";
import { getNotificationActionPath } from "../../utils/notificationActionPath";
import { formatNotificationDate } from "../../utils/formatNotificationDate";
import "../../STYLES/Notifications.css";

// ─── Category definitions ────────────────────────────────────────────────────
const CATEGORY_DEFS = [
  {
    key: "bus",
    label: "Bus",
    icon: Bus,
    headerClass: "unc-card-header-bus",
    chipClass: "unc-chip-bus",
    match: (cat) => /bus/i.test(cat),
  },
  {
    key: "flight",
    label: "Flight",
    icon: Plane,
    headerClass: "unc-card-header-flight",
    chipClass: "unc-chip-flight",
    match: (cat) => /flight/i.test(cat),
  },
  {
    key: "hotel",
    label: "Hotel",
    icon: Building2,
    headerClass: "unc-card-header-hotel",
    chipClass: "unc-chip-hotel",
    match: (cat) => /hotel/i.test(cat),
  },
  {
    key: "payment",
    label: "Payment",
    icon: CreditCard,
    headerClass: "unc-card-header-payment",
    chipClass: "unc-chip-payment",
    match: (cat) => /pay/i.test(cat),
  },
  {
    key: "wallet",
    label: "Wallet",
    icon: Wallet,
    headerClass: "unc-card-header-wallet",
    chipClass: "unc-chip-wallet",
    match: (cat) => /wallet/i.test(cat),
  },
  {
    key: "security",
    label: "Security",
    icon: ShieldAlert,
    headerClass: "unc-card-header-security",
    chipClass: "unc-chip-security",
    match: (cat) => /sec|account|system/i.test(cat),
  },
  {
    key: "other",
    label: "Other",
    icon: MessageSquare,
    headerClass: "unc-card-header-other",
    chipClass: "unc-chip-other",
    match: () => true, // catch-all
  },
];

// Unique filter dropdowns driven by backend CATEGORIES/SEVERITIES
const FILTER_CATEGORIES = ["Flight", "Bus", "Hotel", "Payment", "Wallet", "System"];
const FILTER_SEVERITIES = ["Info", "Success", "Warning", "Error"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCategoryDef(cat) {
  const c = String(cat || "").toLowerCase();
  // Iterate in order; "other" is last so it only catches unmatched
  for (const def of CATEGORY_DEFS) {
    if (def.key !== "other" && def.match(c)) return def;
  }
  return CATEGORY_DEFS[CATEGORY_DEFS.length - 1]; // "other"
}

function getSeverityMeta(severity) {
  const s = String(severity || "").toLowerCase();
  if (s === "error" || s === "critical" || s === "high")
    return { cls: "unc-sev-error", label: severity || "Error", Icon: XCircle };
  if (s === "warning" || s === "medium")
    return { cls: "unc-sev-warning", label: severity || "Warning", Icon: AlertTriangle };
  if (s === "success")
    return { cls: "unc-sev-success", label: "Success", Icon: CheckCircle2 };
  return { cls: "unc-sev-info", label: severity || "Info", Icon: Info };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({ unreadOnly: false, category: "", severity: "" });
  // Pagination (kept for API; grid view shows all per category)
  const [page, setPage] = useState(1);
  // Data
  const [data, setData] = useState({ items: [], totalPages: 1, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  // Per-category card expansion
  const [expandedCards, setExpandedCards] = useState({});

  const abortRef = useRef(null);

  const loadPage = useCallback(async () => {
    if (!getAuthToken()) {
      navigate(`/login?returnTo=${encodeURIComponent("/notifications")}`, { replace: true });
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError("");
    try {
      const result = await getNotifications({ page, pageSize: 100, ...filters });
      if (ctrl.signal.aborted) return;
      setData({
        items: Array.isArray(result?.items) ? result.items : [],
        totalPages: Number(result?.totalPages) || 1,
        unreadCount: Number(result?.unreadCount) || 0,
      });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err.message || "Could not load notifications.");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [filters, navigate, page]);

  useEffect(() => {
    loadPage();
    return () => abortRef.current?.abort();
  }, [loadPage]);

  // ─── Filter helpers ───────────────────────────────────────────────────────
  const setFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({ unreadOnly: false, category: "", severity: "" });
  };

  const hasActiveFilter = filters.unreadOnly || filters.category || filters.severity;

  // ─── Mark-as-read handlers ────────────────────────────────────────────────
  const handleMarkRead = async (item) => {
    try {
      if (!item.isRead) await markNotificationRead(item.id);
      setStatusMessage(item.isRead ? "" : "Notification marked as read.");
      setData((prev) => ({
        ...prev,
        items:
          filters.unreadOnly && !item.isRead
            ? prev.items.filter((e) => e.id !== item.id)
            : prev.items.map((e) =>
                e.id === item.id ? { ...e, isRead: true } : e
              ),
        unreadCount: item.isRead ? prev.unreadCount : Math.max(0, prev.unreadCount - 1),
      }));
      const actionPath = getNotificationActionPath(item);
      if (actionPath) navigate(actionPath);
    } catch (err) {
      setError(err.message || "Could not mark notification as read.");
    }
  };

  const handleMarkAll = async () => {
    setBusy(true);
    setError("");
    setStatusMessage("");
    try {
      await markAllNotificationsRead();
      setStatusMessage("All notifications marked as read.");
      setData((prev) => ({
        ...prev,
        items: filters.unreadOnly
          ? []
          : prev.items.map((item) => ({ ...item, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      setError(err.message || "Could not mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  const toggleExpand = (key) =>
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Grouped data ─────────────────────────────────────────────────────────
  // Build per-category buckets from the flat API list
  const grouped = (() => {
    const buckets = {};
    for (const def of CATEGORY_DEFS) buckets[def.key] = [];

    for (const item of data.items) {
      const def = getCategoryDef(item.category);
      // Skip "other" if it already matched something specific
      buckets[def.key].push(item);
    }
    return buckets;
  })();

  // Summary chips shown in header (only categories that have items)
  const chipCategories = CATEGORY_DEFS.filter(
    (def) => def.key !== "other" && grouped[def.key]?.length > 0
  );

  // Active category sections to render (hide empty "other" unless it has items)
  const activeSections = CATEGORY_DEFS.filter(
    (def) => grouped[def.key]?.length > 0
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="unc-page">
      {/* ── Header Banner ── */}
      <div className="unc-header-banner">
        <div className="unc-header-left">
          <div className="unc-header-icon">
            <Bell size={24} color="#ffffff" />
          </div>
          <div>
            <h1 className="unc-banner-title">User Notification Center</h1>
            <p className="unc-banner-subtitle">
              Stay updated on your bookings, payments, wallet activity, and account security.
            </p>
          </div>
        </div>

        <div className="unc-header-right">
          {/* Category summary chips */}
          {chipCategories.length > 0 && (
            <div className="unc-header-chips">
              {chipCategories.map((def) => {
                const Icon = def.icon;
                return (
                  <div key={def.key} className={`unc-stat-chip ${def.chipClass}`}>
                    <Icon size={14} />
                    <span>{grouped[def.key].length} {def.label}</span>
                  </div>
                );
              })}
              {data.unreadCount > 0 && (
                <div className="unc-stat-chip unc-chip-unread">
                  <Bell size={14} />
                  <span>{data.unreadCount} Unread</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="unc-header-actions">
            <button
              type="button"
              className="unc-btn unc-btn-ghost"
              onClick={handleMarkAll}
              disabled={busy || data.unreadCount === 0}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              Mark All Read
            </button>
            <button
              type="button"
              className="unc-btn unc-btn-white"
              onClick={loadPage}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "unc-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="unc-filter-bar">
        <div className="unc-filter-inner">
          <Filter size={15} className="unc-filter-icon" />

          <label className="unc-filter-label">
            <span>Category</span>
            <select
              id="unc-filter-category"
              value={filters.category}
              onChange={(e) => setFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {FILTER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label className="unc-filter-label">
            <span>Severity</span>
            <select
              id="unc-filter-severity"
              value={filters.severity}
              onChange={(e) => setFilter("severity", e.target.value)}
            >
              <option value="">All severities</option>
              {FILTER_SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </label>

          <label className="unc-filter-checkbox" htmlFor="unc-unread-only">
            <input
              id="unc-unread-only"
              type="checkbox"
              checked={filters.unreadOnly}
              onChange={(e) => setFilter("unreadOnly", e.target.checked)}
            />
            Unread only
          </label>

          {hasActiveFilter && (
            <button type="button" className="unc-btn-reset" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Status Messages ── */}
      {error && (
        <div className="unc-alert unc-alert-error" role="alert">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
      {statusMessage && (
        <div className="unc-alert unc-alert-success" role="status">
          <CheckCircle2 size={15} />
          {statusMessage}
        </div>
      )}

      {/* ── Content Area ── */}
      <div aria-live="polite">
        {loading ? (
          <div className="unc-state-box">
            <RefreshCw size={28} className="unc-spin" />
            <p>Loading your notifications…</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="unc-state-box unc-state-empty">
            <Inbox size={36} />
            <strong>You're all caught up!</strong>
            <span>
              {hasActiveFilter
                ? "No notifications match the current filters. Try adjusting or clearing them."
                : "New booking and account updates will appear here."}
            </span>
          </div>
        ) : (
          <div className="unc-sections-grid">
            {activeSections.map((def) => {
              const Icon = def.icon;
              const items = grouped[def.key];
              const isExpanded = !!expandedCards[def.key];
              const PREVIEW = 5;
              const visibleItems = isExpanded ? items : items.slice(0, PREVIEW);

              return (
                <div key={def.key} className="unc-category-card">
                  {/* Card Header */}
                  <div className={`unc-card-header ${def.headerClass}`}>
                    <div className="unc-card-title-group">
                      <Icon size={19} className="unc-cat-icon" />
                      <h2 className="unc-card-title">{def.label} Notifications</h2>
                    </div>
                    <span className="unc-badge-count">{items.length}</span>
                  </div>

                  {/* Card Body */}
                  <div className="unc-card-body">
                    {visibleItems.map((item) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>

                  {/* Expand/Collapse */}
                  {items.length > PREVIEW && (
                    <div className="unc-card-footer">
                      <button
                        type="button"
                        className="unc-toggle-btn"
                        onClick={() => toggleExpand(def.key)}
                      >
                        {isExpanded ? (
                          <>Show Less <ChevronUp size={15} /></>
                        ) : (
                          <>+ View {items.length - PREVIEW} more <ChevronDown size={15} /></>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── NotificationCard sub-component ──────────────────────────────────────────
function NotificationCard({ item, onMarkRead }) {
  const sevMeta = getSeverityMeta(item.severity);
  const SevIcon = sevMeta.Icon;
  const catDef = getCategoryDef(item.category);
  const CatIcon = catDef.icon;

  return (
    <button
      type="button"
      className={`unc-notif-card ${item.isRead ? "unc-is-read" : "unc-is-unread"}`}
      onClick={() => onMarkRead(item)}
      aria-label={`${item.isRead ? "" : "Unread: "}${item.title}`}
    >
      {/* Unread dot */}
      {!item.isRead && <span className="unc-unread-dot" aria-hidden="true" />}

      <div className="unc-card-content">
        {/* Top row: title + severity */}
        <div className="unc-card-top">
          <span className="unc-notif-title">{item.title}</span>
          {item.severity && (
            <span className={`unc-sev-badge ${sevMeta.cls}`}>
              <SevIcon size={11} />
              {sevMeta.label}
            </span>
          )}
        </div>

        {/* Message */}
        {item.message && (
          <p className="unc-notif-message">{item.message}</p>
        )}

        {/* Meta row */}
        <div className="unc-notif-meta">
          <span className="unc-meta-cat">
            <CatIcon size={11} />
            {item.category || catDef.label}
          </span>
          {item.createdAtUtc && (
            <time className="unc-meta-time" dateTime={item.createdAtUtc}>
              <Clock size={11} />
              {formatNotificationDate(item.createdAtUtc)}
            </time>
          )}
          {!item.isRead && <span className="unc-new-pill">NEW</span>}
        </div>

        {/* Hover hint */}
        <div className="unc-hover-hint" aria-hidden="true">
          {item.actionUrl ? "View details" : "Mark as read"} <ArrowRight size={11} />
        </div>
      </div>
    </button>
  );
}