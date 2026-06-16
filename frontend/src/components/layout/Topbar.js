import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BusFront,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PlaneTakeoff,
  Ticket,
  User,
  Menu,
  X,
} from "lucide-react";
import '../../STYLES/Topbar.css';
import { clearAuthSession } from "../../services/authSession";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.png";
import { openAuthModal } from "../../utils/authModalEvents";

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

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [authProfile, setAuthProfile] = useState(() => getAuthProfile());
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith("/dashboard");
  const tabParam = new URLSearchParams(location.search).get("tab");
  const currentHomeTab = ["buses", "hotels"].includes(tabParam)
    ? tabParam
    : "flights";
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

  // Listen to scroll events on the #root container
  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (!rootEl) return;

    const handleScroll = () => {
      if (rootEl.scrollTop > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll(); // initial check
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
    navigate("/");
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handleNavClick = (tab, e) => {
    e.preventDefault();
    navigate(`/?tab=${tab}`);
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handleMobileNavClick = (tab, e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(`/?tab=${tab}`);
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  return (
    <>
      <header className="topbar">
        {/* Left Side: Logo */}
        <div className="left-group">
          {/* Hamburger Menu Toggle Button */}
          <button 
            type="button" 
            className="hamburger-btn" 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          {/* Application Logo */}
          <button type="button" className="brand" onClick={handleLogoClick}>
            <img className="brand-logo" src={pickNBookLogo} alt="Pick N Book" />
          </button>
        </div>

        {/* Right Side: Navigation Links & Account Authentication */}
        <div className="right-section">
          {/* Navigation Links next to Login/Signup (scrolling-dependent on Home) */}
          <div className={`nav-menu-links ${isHome ? (scrolled ? "visible" : "hidden") : "visible"}`}>
            <button
              type="button"
              className={`menu-item ${isHome && currentHomeTab === "flights" ? "active" : ""}`}
              onClick={(e) => handleNavClick("flights", e)}
            >
              <PlaneTakeoff size={16} />
              <span>Flights</span>
            </button>
            <button
              type="button"
              className={`menu-item ${isHome && currentHomeTab === "buses" ? "active" : ""}`}
              onClick={(e) => handleNavClick("buses", e)}
            >
              <BusFront size={16} />
              <span>Buses</span>
            </button>
            <button
              type="button"
              className={`menu-item ${isHome && currentHomeTab === "hotels" ? "active" : ""}`}
              onClick={(e) => handleNavClick("hotels", e)}
            >
              <Building2 size={16} />
              <span>Hotels</span>
            </button>
          </div>

          {/* Authentication State section */}
          {authProfile.isLoggedIn ? (
            /* Logged In User Dropdown */
            <div className="user-section" ref={dropdownRef}>
              <button
                type="button"
                className="user-name authenticated"
                onClick={() => setOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${authProfile.displayName} menu`}
              >
                <span className="user-trigger-name">{authProfile.displayName}</span>
                <ChevronDown size={16} className={`dropdown-caret ${open ? "open" : ""}`} />
              </button>

              {open && (
                <div className="dropdown" role="menu">
                  {!isDashboard && (
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setOpen(false)}>
                      <LayoutDashboard size={15} />
                      Dashboard
                    </Link>
                  )}

                  {isDashboard && (
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
              className="menu-item"
              onClick={() => openAuthModal("login")}
            >
              <User size={16} />
              <span>Login/Signup</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile navigation side drawer overlay */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <button
                type="button"
                className="brand"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleLogoClick(e);
                }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
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
              <button 
                type="button" 
                className={`drawer-item ${isHome && currentHomeTab === "flights" ? "active" : ""}`}
                onClick={(e) => handleMobileNavClick("flights", e)}
              >
                <PlaneTakeoff size={18} />
                <span>Flights</span>
              </button>
              <button 
                type="button" 
                className={`drawer-item ${isHome && currentHomeTab === "buses" ? "active" : ""}`}
                onClick={(e) => handleMobileNavClick("buses", e)}
              >
                <BusFront size={18} />
                <span>Buses</span>
              </button>
              <button 
                type="button" 
                className={`drawer-item ${isHome && currentHomeTab === "hotels" ? "active" : ""}`}
                onClick={(e) => handleMobileNavClick("hotels", e)}
              >
                <Building2 size={18} />
                <span>Hotels</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
