/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Wallet,
  LogOut,
  LayoutDashboard,
  PlaneTakeoff,
  BusFront,
  BedDouble,
  Users,
  CreditCard,
  User,
  KeyRound,
  FileSpreadsheet,
  Percent,
  Image,
  ClipboardList,
  Search,
  Menu,
  Printer
} from "lucide-react";
import "../../STYLES/B2BLayout.css";
import brandLogo from "../../assets/images/brand/pick-n-book-logo.png";
import { clearAuthSession } from "../../services/authSession";
import { toApiUrl, withNgrokSkipWarningHeader } from "../../services/apiClient";
import { getLedgerStatement } from "../../services/b2bService";

async function fetchAgentProfile() {
  const token = localStorage.getItem("b2b_token") || "";
  if (!token) return null;
  const paths = [
    "/api/Profile",
    "/api/agentportal/profile",
    "/api/agentportal/me",
    "/api/agentportal/account",
  ];
  const headers = withNgrokSkipWarningHeader("/api/Profile", {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  });
  for (const path of paths) {
    try {
      const res = await fetch(toApiUrl(path), { headers });
      if (res.ok) {
        const data = await res.json();
        // unwrap nested payload if needed
        return data?.data || data?.profile || data?.user || data?.User || data || null;
      }
    } catch { /* try next */ }
  }
  return null;
}

async function fetchAgentWalletBalance() {
  try {
    const data = await getLedgerStatement();
    if (Array.isArray(data) && data.length > 0) {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAtUtc || a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAtUtc || b.createdAt || b.date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      const latest = sorted[0];
      if (latest && latest.runningBalance !== undefined) {
        return Number(latest.runningBalance);
      }
    }
  } catch (err) {
    console.error("Failed to load wallet balance from ledger statement:", err);
  }
  return null;
}


const B2B_MAIN_LINKS = [
  {
    to: "/b2b/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true
  },
  {
    to: "/b2b/dashboard/bookings",
    label: "My Bookings",
    icon: ClipboardList
  },
  {
    to: "/b2b/dashboard/book",
    label: "Booking Console",
    icon: Search
  },
  {
    to: "/b2b/dashboard/print-ticket",
    label: "Print Ticket",
    icon: Printer
  }
];

const B2B_FINANCE_LINKS = [
  {
    to: "/b2b/dashboard/ledger",
    label: "Ledger Statement",
    icon: FileSpreadsheet
  },
  {
    to: "/b2b/dashboard/deposit-request",
    label: "Deposit Request",
    icon: CreditCard
  }
];

const B2B_SETTINGS_LINKS = [
  {
    to: "/b2b/dashboard/markup",
    label: "Markup Settings",
    icon: Percent
  },
  {
    to: "/b2b/dashboard/logo-management",
    label: "Logo Management",
    icon: Image
  }
];

const B2B_ACCOUNT_LINKS = [
  {
    to: "/b2b/dashboard/traveler-list",
    label: "Saved Passengers",
    icon: Users
  },
  {
    to: "/b2b/dashboard/my-account",
    label: "My Profile",
    icon: User
  },
  {
    to: "/b2b/dashboard/change-password",
    label: "Change Password",
    icon: KeyRound
  }
];

export default function B2BLayout({ children, bookingFlow = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [agentName, setAgentName] = useState("Travel Partner");
  const [agentTier, setAgentTier] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [logoUrl, setLogoUrl] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(bookingFlow);

  useEffect(() => {
    // 1. Immediate sync from localStorage (shows instantly)
    try {
      const stored = localStorage.getItem("b2b_user") || localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.agencyName || parsed.companyName || parsed.businessName || parsed.name || parsed.fullName || (parsed.firstName && parsed.lastName ? `${parsed.firstName} ${parsed.lastName}` : "") || parsed.firstName || parsed.email?.split("@")[0] || "Travel Partner";
        setAgentName(name);
        setAgentTier(parsed.membershipTier || parsed.tier || parsed.plan || "");
        setLogoUrl(localStorage.getItem("b2b_agency_logo") || parsed.logoUrl || null);
        if (parsed.walletBalance !== undefined) {
          setWalletBalance(Number(parsed.walletBalance).toFixed(2));
        }
      }
    } catch (e) {
      console.error("Local B2B session read error", e);
    }

    // 2. Live fetch from B2B API using b2b_token
    const loadLiveProfile = async () => {
      // Try dedicated wallet balance endpoint
      const liveBalance = await fetchAgentWalletBalance();
      if (liveBalance !== null) {
        setWalletBalance(liveBalance.toFixed(2));
        try {
          const userStr = localStorage.getItem("b2b_user");
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userObj.walletBalance = liveBalance;
            localStorage.setItem("b2b_user", JSON.stringify(userObj));
          }
        } catch {}
      }

      // Try agent profile for name/tier
      const profile = await fetchAgentProfile();
      if (profile) {
        const name = profile.agencyName || profile.companyName || profile.businessName ||
          profile.name || profile.fullName || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : "") || profile.firstName || profile.email?.split("@")[0] || "";
        if (name) setAgentName(name);
        const tier = profile.membershipTier || profile.tier || profile.plan || "";
        if (tier) setAgentTier(tier);
        const logo = localStorage.getItem("b2b_agency_logo") || profile.logoUrl || null;
        setLogoUrl(logo);
        
        const finalBalance = liveBalance !== null ? liveBalance : (profile.walletBalance !== undefined ? Number(profile.walletBalance) : null);
        if (finalBalance !== null) {
          setWalletBalance(finalBalance.toFixed(2));
        }

        try {
          const cachedUser = localStorage.getItem("b2b_user") || "{}";
          const userObj = JSON.parse(cachedUser);
          const merged = {
            ...userObj,
            ...profile,
            walletBalance: finalBalance !== null ? finalBalance : userObj.walletBalance
          };
          localStorage.setItem("b2b_user", JSON.stringify(merged));
        } catch {}
      }
    };

    loadLiveProfile();
  }, [location]);


  const handleSignOut = () => {
    localStorage.removeItem("b2b_user");
    localStorage.removeItem("b2b_userId");
    localStorage.removeItem("b2b_role");
    localStorage.removeItem("b2b_token");
    navigate("/b2b/login");
  };

  const navItemClass = ({ isActive }) =>
    `b2b-sidebar-item ${isActive ? "active" : ""}`;

  return (
    <div className={bookingFlow ? "b2b-layout-wrapper-light" : "b2b-layout-wrapper"}>
      {/* B2B Header */}
      <header className="b2b-topbar">
        <div className="b2b-topbar-left" style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--b2b-text-secondary)",
              cursor: "pointer",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              marginRight: "12px",
              transition: "all 0.2s"
            }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu size={20} />
          </button>
          <Link to="/b2b/dashboard" className="b2b-logo-container">
            <img src={logoUrl || brandLogo} alt="Pick N Book B2B Logo" className="b2b-brand-logo" style={{ maxHeight: "32px", objectFit: "contain" }} />
            <span className="b2b-tag">Partner</span>
          </Link>
        </div>

        <div className="b2b-topbar-right">
          {/* Wallet Balance widget */}
          <div className="b2b-wallet-widget" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Wallet size={16} className="b2b-wallet-icon" />
              <div className="b2b-wallet-info">
                <span className="b2b-wallet-label">Agent Wallet</span>
                <span className="b2b-wallet-amount" style={{ color: Number(walletBalance) < 5000 ? "#fbbf24" : "inherit" }}>
                  ₹{Number(walletBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            {Number(walletBalance) < 5000 && (
              <Link
                to="/b2b/dashboard/deposit-request"
                className="b2b-low-balance-warning"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  fontSize: "0.7rem",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                ⚠️ Deposit Req
              </Link>
            )}
          </div>

          {/* Agent Profile Summary */}
          <div className="b2b-agent-profile-summary">
            <div className="b2b-agent-avatar">
              {agentName.charAt(0).toUpperCase()}
            </div>
            <div className="b2b-agent-details">
              <span className="b2b-agent-name">{agentName}</span>
              <span className="b2b-agent-tier">{agentTier ? `${agentTier} Tier` : "Agent"}</span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button type="button" onClick={handleSignOut} className="b2b-signout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* B2B Main Body */}
      <div className="b2b-layout-body">
        {/* Sidebar */}
        <aside
          className="b2b-sidebar"
          style={{
            width: isCollapsed ? "70px" : "260px",
            minWidth: isCollapsed ? "70px" : "260px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden"
          }}
        >
          <nav className="b2b-sidebar-nav" style={{ padding: isCollapsed ? "0 8px" : "0 12px", transition: "padding 0.3s" }}>
            {!isCollapsed && <span className="b2b-sidebar-section-title">Core Operations</span>}
            {B2B_MAIN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={navItemClass}
                style={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "12px 0" : "12px 16px",
                  transition: "all 0.3s",
                }}
                title={isCollapsed ? link.label : ""}
              >
                <link.icon size={16} style={{ minWidth: "16px" }} />
                {!isCollapsed && <span>{link.label}</span>}
              </NavLink>
            ))}

            <div className="b2b-sidebar-divider" />
            {!isCollapsed && <span className="b2b-sidebar-section-title">Finance & Wallet</span>}
            {B2B_FINANCE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={navItemClass}
                style={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "12px 0" : "12px 16px",
                  transition: "all 0.3s",
                }}
                title={isCollapsed ? link.label : ""}
              >
                <link.icon size={16} style={{ minWidth: "16px" }} />
                {!isCollapsed && <span>{link.label}</span>}
              </NavLink>
            ))}

            <div className="b2b-sidebar-divider" />
            {!isCollapsed && <span className="b2b-sidebar-section-title">Settings & Markup</span>}
            {B2B_SETTINGS_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={navItemClass}
                style={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "12px 0" : "12px 16px",
                  transition: "all 0.3s",
                }}
                title={isCollapsed ? link.label : ""}
              >
                <link.icon size={16} style={{ minWidth: "16px" }} />
                {!isCollapsed && <span>{link.label}</span>}
              </NavLink>
            ))}

            <div className="b2b-sidebar-divider" />
            {!isCollapsed && <span className="b2b-sidebar-section-title">Partner Account</span>}
            {B2B_ACCOUNT_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={navItemClass}
                style={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "12px 0" : "12px 16px",
                  transition: "all 0.3s",
                }}
                title={isCollapsed ? link.label : ""}
              >
                <link.icon size={16} style={{ minWidth: "16px" }} />
                {!isCollapsed && <span>{link.label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content — booking flow uses white bg; portal uses dark b2b theme */}
        <main
          className="b2b-main-content"
          style={bookingFlow ? {
            background: "#ffffff",
            padding: 0,
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 70px)"
          } : undefined}
        >
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
