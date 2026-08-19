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
} from "lucide-react";
import '../../STYLES/Topbar.css';
import { clearAuthSession } from "../../services/authSession";
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
  const rawUser = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  const tokenPayload = decodeJwtPayload(token);

  let parsedUser = {};
  if (rawUser) {
    try {
      parsedUser = JSON.parse(rawUser) || {};
    } catch {
      parsedUser = { name: rawUser };
    }
  }

  const email = pickFirst(
    [
      parsedUser.email,
      parsedUser.Email,
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
      tokenPayload.given_name,
      tokenPayload.name,
      email.split("@")[0],
    ],
    "User"
  );

  return {
    isLoggedIn: Boolean(rawUser || token),
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    email,
  };
}

const NAV_ITEMS = [
  { id: "buses",   label: "Buses",   tab: "buses",   icon: Bus       },
  { id: "flights", label: "Flights", tab: "flights", icon: Plane     },
  { id: "hotels",  label: "Hotels",  tab: "hotels",  icon: Building2 },
];

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [authProfile, setAuthProfile] = useState(() => getAuthProfile());
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isB2BDashboard = location.pathname.startsWith("/b2b");
  const isDashboardOrB2B = isDashboard || isB2BDashboard;
  const dashboardLink = "/dashboard";
  const tabParam = new URLSearchParams(location.search).get("tab");
  const currentHomeTab = ["flights", "buses", "hotels"].includes(tabParam)
    ? tabParam
    : "buses";
  const isHome = location.pathname === "/";

  const syncAuthState = () => {
    setAuthProfile(getAuthProfile());
  };

  useEffect(() => {
    syncAuthState();
    setOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleStorage = () => syncAuthState();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
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
            <img className="brand-logo" src={pickNBookLogo} alt="Pick N Book" />
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
                    animate={isActive ? { scale: [1, 1.2, 1], rotate: [0, -5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
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
            <Ticket size={18} />
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
            <HelpCircle size={18} />
            <span>Help</span>
          </a>

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
                      <LayoutDashboard size={15} />
                      Dashboard
                    </Link>
                  )}

                  {isDashboardOrB2B && (
                    <Link to="/dashboard/my-account" className="dropdown-item" onClick={() => setOpen(false)}>
                      <User size={15} />
                      My Account
                    </Link>
                  )}

                  <button type="button" className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={15} />
                    Logout
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
                <img className="brand-logo" src={pickNBookLogo} alt="Pick N Book" />
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
