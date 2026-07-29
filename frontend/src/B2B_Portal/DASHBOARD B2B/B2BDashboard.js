/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  PlaneTakeoff,
  BusFront,
  BedDouble,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw
} from "lucide-react";
import { getBookingsReport, getLedgerStatement } from "../../services/b2bService";
import { toApiUrl, withNgrokSkipWarningHeader } from "../../services/apiClient";
import "../../STYLES/B2BLayout.css";

async function fetchAgentProfileData() {
  const token = localStorage.getItem("b2b_token") || "";
  if (!token) return null;
  const paths = ["/api/Profile", "/api/agentportal/profile", "/api/agentportal/me", "/api/agentportal/account"];
  const headers = withNgrokSkipWarningHeader("/api/Profile", {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  });
  for (const path of paths) {
    try {
      const res = await fetch(toApiUrl(path), { headers });
      if (res.ok) {
        const d = await res.json();
        return d?.data || d?.profile || d?.user || d?.User || d || null;
      }
    } catch { /* try next */ }
  }
  return null;
}

async function fetchWalletBalance() {
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

export default function B2BDashboard() {
  const [agentUser, setAgentUser] = useState({ name: "", email: "", contactName: "", phone: "", city: "" });
  const [walletBalance, setWalletBalance] = useState(null);
  const [stats, setStats] = useState({ flights: 0, buses: 0, hotels: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Immediately show what's in localStorage
    try {
      const userStr = localStorage.getItem("b2b_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setAgentUser({
          name: u.agencyName || u.companyName || u.businessName || "",
          email: u.email || "",
          contactName: u.contactName || u.contactPersonName || u.name || "",
          phone: u.phoneNumber || u.phone || u.mobile || "",
          city: u.city || u.region || u.address || "",
        });
        if (u.walletBalance !== undefined) setWalletBalance(Number(u.walletBalance));
      }
    } catch { /* ignore */ }

    const loadAll = async () => {
      setLoading(true);
      try {
        // 1. Wallet balance from dedicated endpoint
        const liveBal = await fetchWalletBalance();
        if (liveBal !== null) setWalletBalance(liveBal);

        const profile = await fetchAgentProfileData();
        if (profile) {
          const name = profile.agencyName || profile.companyName || profile.businessName || profile.name || profile.fullName || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : "") || profile.firstName || "";
          const contact = profile.contactName || profile.contactPersonName || profile.name || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : "") || profile.firstName || "";
          setAgentUser((prev) => ({
            ...prev,
            name: name || prev.name,
            email: profile.email || prev.email,
            contactName: contact || prev.contactName,
            phone: profile.phoneNumber || profile.phone || profile.mobile || prev.phone,
            city: profile.city || profile.region || prev.city,
          }));
          if (liveBal === null && profile.walletBalance !== undefined) {
            setWalletBalance(Number(profile.walletBalance));
          }
        }

        // 3. Bookings report for live stats
        const bookings = await getBookingsReport();
        const list = Array.isArray(bookings) ? bookings : [];
        const flights = list.filter((b) => (b.serviceType || b.type || "").toLowerCase() === "flight").length;
        const buses = list.filter((b) => (b.serviceType || b.type || "").toLowerCase() === "bus").length;
        const hotels = list.filter((b) => (b.serviceType || b.type || "").toLowerCase() === "hotel").length;
        setStats({ flights, buses, hotels });
        setRecentBookings(list.slice(0, 5));
      } catch (err) {
        console.error("B2BDashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const displayBalance = walletBalance !== null ? walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—";

  return (
    <div className="b2b-dashboard">
      {/* Header */}
      <div className="b2b-dashboard-header">
        <h1>Welcome Back, {agentUser.contactName || agentUser.name || "Agent"}</h1>
        <p>Manage your enterprise bookings, wallet accounts, and travel operations from your dedicated partner suite.</p>
      </div>

      {/* Stats Grid */}
      <div className="b2b-stats-grid">
        {/* Wallet */}
        <div className="b2b-card">
          <div className="b2b-card-glow green" />
          <div className="b2b-card-header">
            <span className="b2b-card-title">Wallet Balance</span>
            <div className="b2b-card-icon green"><Wallet size={20} /></div>
          </div>
          <div className="b2b-card-body">
            <h2>₹{displayBalance}</h2>
            <div className="b2b-card-footer">
              <Link to="/b2b/dashboard/deposit-request" style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", textDecoration: "none", fontWeight: 600 }}>
                <span>Top-up Wallet</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Flights */}
        <div className="b2b-card">
          <div className="b2b-card-glow blue" />
          <div className="b2b-card-header">
            <span className="b2b-card-title">Flight Trips</span>
            <div className="b2b-card-icon blue"><PlaneTakeoff size={20} /></div>
          </div>
          <div className="b2b-card-body">
            <h2>{loading ? "—" : `${stats.flights} Booking${stats.flights !== 1 ? "s" : ""}`}</h2>
            <div className="b2b-card-footer">
              <Link to="/b2b/dashboard/bookings" style={{ color: "#60a5fa", textDecoration: "none", fontSize: "0.82rem" }}>View all →</Link>
            </div>
          </div>
        </div>

        {/* Buses */}
        <div className="b2b-card">
          <div className="b2b-card-glow blue" />
          <div className="b2b-card-header">
            <span className="b2b-card-title">Bus Trips</span>
            <div className="b2b-card-icon blue"><BusFront size={20} /></div>
          </div>
          <div className="b2b-card-body">
            <h2>{loading ? "—" : `${stats.buses} Booking${stats.buses !== 1 ? "s" : ""}`}</h2>
            <div className="b2b-card-footer">
              <Link to="/b2b/dashboard/bookings" style={{ color: "#60a5fa", textDecoration: "none", fontSize: "0.82rem" }}>View all →</Link>
            </div>
          </div>
        </div>

        {/* Hotels */}
        <div className="b2b-card">
          <div className="b2b-card-glow gold" />
          <div className="b2b-card-header">
            <span className="b2b-card-title">Hotel Stays</span>
            <div className="b2b-card-icon gold"><BedDouble size={20} /></div>
          </div>
          <div className="b2b-card-body">
            <h2>{loading ? "—" : `${stats.hotels} Stay${stats.hotels !== 1 ? "s" : ""}`}</h2>
            <div className="b2b-card-footer">
              <Link to="/b2b/dashboard/bookings" style={{ color: "#f59e0b", textDecoration: "none", fontSize: "0.82rem" }}>View all →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="b2b-quick-section">
        {/* Recent Bookings */}
        <div className="b2b-panel">
          <h2 className="b2b-panel-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Recent Bookings</span>
            <Link to="/b2b/dashboard/bookings" style={{ fontSize: "0.8rem", color: "var(--b2b-primary)", textDecoration: "none", fontWeight: 600 }}>
              View All →
            </Link>
          </h2>
          {loading ? (
            <div style={{ color: "var(--b2b-text-secondary)", fontSize: "0.85rem", padding: "20px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
              Loading bookings from backend...
            </div>
          ) : recentBookings.length === 0 ? (
            <div style={{ color: "var(--b2b-text-secondary)", fontSize: "0.85rem", padding: "20px 0" }}>
              No bookings yet. Start booking from the Booking Console.
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--b2b-border)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--b2b-text-secondary)", fontWeight: 600 }}>Booking Ref</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--b2b-text-secondary)", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--b2b-text-secondary)", fontWeight: 600 }}>Passenger</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--b2b-text-secondary)", fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--b2b-text-secondary)", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b, i) => (
                    <tr key={b.bookingId || b.id || i} style={{ borderBottom: "1px solid var(--b2b-border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--b2b-primary)" }}>{b.bookingReference || b.pnr || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{b.serviceType || b.type || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{b.passengerName || b.passenger || "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>₹{Number(b.amount || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600,
                          background: b.status === "Confirmed" || b.status === "Completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                          color: b.status === "Confirmed" || b.status === "Completed" ? "#10b981" : "#f59e0b"
                        }}>{b.status || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agent Profile */}
        <div className="b2b-panel">
          <h2 className="b2b-panel-title">Travel Agency Profile</h2>
          <div className="b2b-info-list" style={{ marginTop: 15 }}>
            {[
              { label: "Agency Name", value: agentUser.name },
              { label: "Corporate Email", value: agentUser.email },
              { label: "Contact Person", value: agentUser.contactName },
              { label: "Mobile Number", value: agentUser.phone },
              { label: "Region / City", value: agentUser.city },
            ].map(({ label, value }) => (
              <div key={label} className="b2b-info-item">
                <span className="b2b-info-label">{label}</span>
                <span className="b2b-info-value">{value || "—"}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Link to="/b2b/dashboard/book" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--b2b-primary, #2563eb)", color: "#fff",
              padding: "10px 20px", borderRadius: 8, textDecoration: "none",
              fontWeight: 600, fontSize: "0.88rem"
            }}>
              <FileSpreadsheet size={16} />
              Start Booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
