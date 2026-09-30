import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bus,
  Plane,
  Building2,
  Ticket,
  HelpCircle,
  User,
  LogIn,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCheck,
} from "lucide-react";
import '../../STYLES/Topbar.css';
import '../../STYLES/Notifications.css';
import { clearAuthSession, subscribeAuthSession } from "../../services/authSession";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationsService";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.png";


function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return {};
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return {};
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = atob(padded);
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function pickFirst(values, fallback = "") {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }
  return fallback;
}

function getAuthProfile() {
  const rawUser = localStorage.getItem("user") || localStorage.getItem("b2b_user") || sessionStorage.getItem("user") || sessionStorage.getItem("b2b_user");
  const token = localStorage.getItem("token") || localStorage.getItem("b2b_token") || localStorage.getItem("authToken") || sessionStorage.getItem("token");
  const tokenPayload = decodeJwtPayload(token);

  let parsedUser = {};
  if (rawUser) {
    try {
      parsedUser = typeof rawUser === "object" ? rawUser : JSON.parse(rawUser) || {};
    } catch {
      parsedUser = { name: rawUser };
    }
  }

  const email = pickFirst(
    [
      parsedUser.email,
      parsedUser.Email,
      parsedUser.userEmail,
      tokenPayload.email,
      tokenPayload.upn,
      tokenPayload.unique_name,
    ],
    ""
  );

  const displayName = pickFirst(
    [
      parsedUser.firstName,
      parsedUser.FirstName,
      parsedUser.name,
      parsedUser.Name,
      parsedUser.fullName,
      parsedUser.userName,
      tokenPayload.given_name,
      tokenPayload.name,
      email ? email.split("@")[0] : "",
    ],
    "User"
  );

  const hasSession = Boolean(rawUser || token);

  return {
    isLoggedIn: hasSession,
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    email,
  };
}

const EmojiBus = ({ size }) => <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}>🚌</span>;
const EmojiPlane = ({ size }) => <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}>✈️</span>;
const EmojiHotel = ({ size }) => <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}>🏨</span>;
const EmojiTicket = ({ size }) => <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}>🎫</span>;
const EmojiHelp = ({ size }) => <span style={{ fontSize: size, lineHeight: 1, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}>❓</span>;

const NAV_ITEMS = [
  { id: "buses",   label: "Buses",   tab: "buses",   icon: EmojiBus },
  { id: "flights", label: "Flights", tab: "flights", icon: EmojiPlane },
  { id: "hotels",  label: "Hotels",  tab: "hotels",  icon: EmojiHotel },
];

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [authProfile, setAuthProfile] = useState(() => getAuthProfile());
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  // Track previous auth state to avoid unnecessary re-renders on every route change
  const prevAuthKeyRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isB2BDashboard = location.pathname.startsWith("/b2b");
  const isDashboardOrB2B = isDashboard || isB2BDashboard;
  const showB2CNotifications = authProfile.isLoggedIn &&
    !isB2BDashboard && sessionStorage.getItem("active_portal") !== "b2b";
  const dashboardLink = "/dashboard";
  const tabParam = new URLSearchParams(location.search).get("tab");
  const currentHomeTab = ["flights", "buses", "hotels"].includes(tabParam)
    ? tabParam
    : "buses";
  const isHome = location.pathname === "/";

  const syncAuthState = () => {
    const next = getAuthProfile();
    // Only update state if login status or identity actually changed
    const nextKey = `${next.isLoggedIn}|${next.email}`;
    if (nextKey !== prevAuthKeyRef.current) {
      prevAuthKeyRef.current = nextKey;
      setAuthProfile(next);
    }
  };

  useEffect(() => {
    syncAuthState();
    setOpen(false);
    setNotificationOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!showB2CNotifications) {
      setNotificationCount(0);
      setNotificationOpen(false);
      return undefined;
    }

    let cancelled = false;
    const refreshUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (!cancelled) setNotificationCount(count);
      } catch {
        if (!cancelled) setNotificationCount(0);
      }
    };

    refreshUnreadCount();
    // Poll every 5 minutes — unread count doesn't need to be realtime.
    // The "notificationsUpdated" event handles immediate updates after actions.
    const intervalId = window.setInterval(refreshUnreadCount, 5 * 60 * 1000);
    window.addEventListener("notificationsUpdated", refreshUnreadCount);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("notificationsUpdated", refreshUnreadCount);
    };
  }, [showB2CNotifications]);

  useEffect(() => {
    const handleAuth = () => syncAuthState();
    window.addEventListener("storage", handleAuth);
    window.addEventListener("authChange", handleAuth);
    window.addEventListener("focus", handleAuth);
    const unsubscribe = subscribeAuthSession(handleAuth);
    return () => {
      window.removeEventListener("storage", handleAuth);
      window.removeEventListener("authChange", handleAuth);
      window.removeEventListener("focus", handleAuth);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (!rootEl) return;

    const handleScroll = () => {
      setScrolled(rootEl.scrollTop > 50);
    };

    handleScroll();
    rootEl.addEventListener("scroll", handleScroll);
    return () => rootEl.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setAuthProfile({ isLoggedIn: false, displayName: "User", email: "" });
    setOpen(false);
    navigate("/");
  };

  const handleNotificationToggle = async () => {
    if (notificationOpen) {
      setNotificationOpen(false);
      return;
    }

    setNotificationOpen(true);
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const result = await getNotifications({ page: 1, pageSize: 10 });
      setNotificationItems(Array.isArray(result?.items) ? result.items : []);
      setNotificationCount(Number(result?.unreadCount) || 0);
    } catch (error) {
      setNotificationError(error.message || "Could not load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationClick = async (item) => {
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id);
        setNotificationItems((items) => items.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry
        ));
        setNotificationCount((count) => Math.max(0, count - 1));
      }
      setNotificationOpen(false);
      if (typeof item.actionUrl === "string" && item.actionUrl.startsWith("/") && !item.actionUrl.startsWith("//")) {
        navigate(item.actionUrl);
      }
    } catch (error) {
      setNotificationError(error.message || "Could not mark notification as read.");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotificationBusy(true);
    setNotificationError("");
    try {
      await markAllNotificationsRead();
      setNotificationItems((items) => items.map((item) => ({ ...item, isRead: true })));
      setNotificationCount(0);
    } catch (error) {
      setNotificationError(error.message || "Could not mark notifications as read.");
    } finally {
      setNotificationBusy(false);
    }
  };

  const notificationDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate("/?tab=buses");
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) rootEl.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const handleNavClick = (tab, e) => {
    e.preventDefault();
    navigate(`/?tab=${tab}`);
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) rootEl.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const handleMobileNavClick = (tab, e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(`/?tab=${tab}`);
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) rootEl.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="topbar-wrapper-custom" style={{ position: "sticky", top: 0, zIndex: 1000, width: "100%", display: "flex", flexDirection: "column" }}>
      <header className="topbar">
        {/* Left Group: Hamburger + Logo + Nav Items (Buses, Flights, Hotels) */}
        <div className="left-group">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <button type="button" className="brand" onClick={handleLogoClick}>
            <img className="brand-logo" src={pickNBookLogo} alt="Pick&book" />
          </button>

          <div className="nav-menu-links visible airbnb-nav-container">
            {NAV_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isActive = isHome && currentHomeTab === item.tab;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  className={`menu-item airbnb-tab-item ${isActive ? "active" : ""}`}
                  onClick={(e) => handleNavClick(item.tab, e)}
                  whileHover={{ scale: 1.05, y: -1.5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    className="tab-icon-wrap"
                    animate={isActive ? { y: [0, -3, 0], scale: [1, 1.1, 1] } : { y: 0, scale: 1 }}
                    transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                  >
                    <ItemIcon size={18} />
                  </motion.div>
                  <span>{item.label}</span>

                  {isActive && (
                    <motion.div
                      className="airbnb-tab-indicator"
                      layoutId="airbnbActiveIndicator"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Bookings + Help + Auth Buttons */}
        <div className="right-section">
          <button
            type="button"
            className="topbar-nav-link"
            onClick={() => navigate("/fetch-ticket")}
          >
            <EmojiTicket size={20} />
            <span>Fetch Ticket</span>
          </button>

          <a
            href="#help"
            className="topbar-nav-link"
            onClick={(e) => {
              e.preventDefault();
              navigate("/contact");
            }}
          >
            <EmojiHelp size={20} />
            <span>Help</span>
          </a>

          {showB2CNotifications && (
            <div className="notification-bell-wrap" ref={notificationRef}>
              <button
                type="button"
                className="notification-bell-button"
                onClick={handleNotificationToggle}
                aria-label={notificationCount ? `Notifications, ${notificationCount} unread` : "Notifications"}
                aria-haspopup="dialog"
                aria-expanded={notificationOpen}
                title="Notifications"
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="notification-bell-badge">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-popover" role="dialog" aria-label="Notifications">
                  <div className="notification-popover-header">
                    <strong>Notifications</strong>
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      disabled={notificationBusy || notificationCount === 0}
                    >
                      <CheckCheck size={14} /> Mark all as read
                    </button>
                  </div>
                  {notificationError && <div className="notification-popover-error" role="alert">{notificationError}</div>}
                  {notificationLoading ? (
                    <div className="notification-popover-state">Loading notifications...</div>
                  ) : notificationItems.length ? (
                    <div className="notification-popover-list">
                      {notificationItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`notification-popover-item ${item.isRead ? "" : "is-unread"}`}
                          onClick={() => handleNotificationClick(item)}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                          <time dateTime={item.createdAtUtc}>{notificationDate(item.createdAtUtc)}</time>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="notification-popover-state">No notifications yet.</div>
                  )}
                  <div className="notification-popover-footer">
                    <Link to="/notifications" onClick={() => setNotificationOpen(false)}>View all notifications</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {authProfile.isLoggedIn ? (
            <div className="user-section" ref={dropdownRef}>
              <button
                type="button"
                className="user-name authenticated"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${authProfile.displayName} menu`}
              >
                <span className="user-trigger-name">{authProfile.displayName}</span>
                <ChevronDown size={16} className={`dropdown-caret ${open ? "open" : ""}`} />
              </button>

              {open && (
                <div className="dropdown" role="menu">
                  {!isDashboardOrB2B && (
                    <Link to={dashboardLink} className="dropdown-item" onClick={() => setOpen(false)}>
                      Dashboard
                      <LayoutDashboard size={15} />
                    </Link>
                  )}

                  {isDashboardOrB2B && (
                    <Link to="/dashboard/my-account" className="dropdown-item" onClick={() => setOpen(false)}>
                      My Account
                      <User size={15} />
                    </Link>
                  )}

                  <button type="button" className="dropdown-item logout" onClick={handleLogout}>
                    Logout
                    <LogOut size={15} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="topbar-login-btn"
              onClick={() => {
                const returnTo = window.location.pathname + window.location.search;
                navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
              }}
            >
              <User size={18} />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile side drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <button
                type="button"
                className="brand"
                onClick={(e) => { setMobileMenuOpen(false); handleLogoClick(e); }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <img className="brand-logo" src={pickNBookLogo} alt="Pick&book" />
              </button>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <div className="drawer-body">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`drawer-item ${isHome && currentHomeTab === item.tab ? "active" : ""}`}
                  onClick={(e) => handleMobileNavClick(item.tab, e)}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
