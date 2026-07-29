/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plane, Bus, Building2, Sparkles, Tag } from "lucide-react";
import SearchWidget from "../../components/SearchWidget";
import { getMarkupSettings } from "../../services/b2bService";
import "../../STYLES/B2BLayout.css";

const TAB_MAP = { flights: "flights", flight: "flights", buses: "buses", bus: "buses", hotels: "hotels", hotel: "hotels" };

export default function B2BBookingEngine() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("flights");
  const [markups, setMarkups] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = TAB_MAP[params.get("tab")] || "flights";
    setActiveTab(tab);
  }, [location.search]);

  // Load markups and persist to localStorage for booking pages to read
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMarkupSettings();
        const list = Array.isArray(data) ? data : [];
        setMarkups(list);

        // Persist in the format FlightSearchResults.js reads
        const flightMarkup = list.find((m) => m.serviceType === "Flight");
        const busMarkup = list.find((m) => m.serviceType === "Bus");
        const hotelMarkup = list.find((m) => m.serviceType === "Hotel");

        const settings = {
          flightType: flightMarkup ? (flightMarkup.markupType === "Flat" ? "fixed" : "percentage") : null,
          flightValue: flightMarkup ? flightMarkup.markupValue : 0,
          busType: busMarkup ? (busMarkup.markupType === "Flat" ? "fixed" : "percentage") : null,
          busValue: busMarkup ? busMarkup.markupValue : 0,
          hotelType: hotelMarkup ? (hotelMarkup.markupType === "Flat" ? "fixed" : "percentage") : null,
          hotelValue: hotelMarkup ? hotelMarkup.markupValue : 0,
        };
        localStorage.setItem("b2b_markup_settings", JSON.stringify(settings));
      } catch (err) {
        // fallback: use whatever is already in localStorage
        try {
          const raw = localStorage.getItem("b2b_markup_settings");
          if (raw) {
            const parsed = JSON.parse(raw);
            // rebuild markups array for display
            const arr = [];
            if (parsed.flightValue > 0) arr.push({ serviceType: "Flight", markupType: parsed.flightType === "fixed" ? "Flat" : "Percentage", markupValue: parsed.flightValue });
            if (parsed.busValue > 0) arr.push({ serviceType: "Bus", markupType: parsed.busType === "fixed" ? "Flat" : "Percentage", markupValue: parsed.busValue });
            if (parsed.hotelValue > 0) arr.push({ serviceType: "Hotel", markupType: parsed.hotelType === "fixed" ? "Flat" : "Percentage", markupValue: parsed.hotelValue });
            setMarkups(arr);
          }
        } catch {}
      }
    };
    load();
  }, []);

  const TABS = [
    { key: "flights", label: "Flights", icon: Plane, gradient: "linear-gradient(135deg,#1e40af,#3b82f6)", accent: "#3b82f6", desc: "Search & book domestic and international flights" },
    { key: "buses", label: "Buses", icon: Bus, gradient: "linear-gradient(135deg,#065f46,#10b981)", accent: "#10b981", desc: "Find intercity bus tickets across all operators" },
    { key: "hotels", label: "Hotels", icon: Building2, gradient: "linear-gradient(135deg,#7c2d12,#f97316)", accent: "#f97316", desc: "Book hotels with net rates and instant confirmation" },
  ];

  const activeTabData = TABS.find((t) => t.key === activeTab) || TABS[0];

  // Markup for the active tab
  const activeMarkup = markups.find(
    (m) => m.serviceType.toLowerCase() === activeTab.replace("s", "").toLowerCase() ||
           m.serviceType.toLowerCase() === activeTab.replace(/s$/, "").toLowerCase() ||
           activeTab.startsWith(m.serviceType.toLowerCase().replace("flight", "flight"))
  );

  const markupLabel = activeMarkup
    ? `+${activeMarkup.markupType === "Flat" ? "₹" : ""}${activeMarkup.markupValue}${activeMarkup.markupType !== "Flat" ? "%" : ""} markup applied`
    : null;

  return (
    <div className="b2b-dashboard">

      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)",
        borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${activeTabData.accent}33 0%,transparent 70%)`, transition: "background 0.4s" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ background: `${activeTabData.accent}22`, borderRadius: 8, padding: 8, border: `1px solid ${activeTabData.accent}44` }}>
              <Sparkles size={20} style={{ color: activeTabData.accent }} />
            </div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>
              B2B Booking Console
            </h1>
            {markupLabel && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem", color: "#fbbf24", fontWeight: 600 }}>
                <Tag size={13} />
                {markupLabel}
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>
            Net wholesale rates · Markup auto-applied · Instant GDS ticketing
          </p>
        </div>
      </div>

      {/* Tab Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: isActive ? tab.gradient : "rgba(255,255,255,0.03)",
                border: isActive ? "none" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "14px 18px", cursor: "pointer", textAlign: "left",
                transition: "all 0.25s ease",
                boxShadow: isActive ? `0 8px 24px ${tab.accent}44` : "none",
                transform: isActive ? "translateY(-1px)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon size={18} style={{ color: isActive ? "#fff" : tab.accent }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: isActive ? "#fff" : "#cbd5e1" }}>{tab.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.73rem", color: isActive ? "rgba(255,255,255,0.7)" : "#64748b", lineHeight: 1.4 }}>{tab.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Search Panel — same as user homepage */}
      <div style={{
        borderRadius: 16, overflow: "hidden",
        boxShadow: `0 4px 24px rgba(0,0,0,0.08)`,
        border: `2px solid ${activeTabData.accent}22`,
        transition: "border-color 0.3s",
      }}>
        {/* accent bar */}
        <div style={{ height: 4, background: activeTabData.gradient, transition: "background 0.3s" }} />

        <SearchWidget defaultTab={activeTab} showTabBar={false} key={activeTab} />
      </div>

      {/* Markup info chips */}
      {markups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {markups.map((m) => (
            <div key={m.serviceType} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "5px 14px", fontSize: "0.78rem", color: "#94a3b8"
            }}>
              <Tag size={12} style={{ color: "#fbbf24" }} />
              <span style={{ color: "#f8fafc", fontWeight: 600 }}>{m.serviceType}</span>
              <span>markup:</span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                {m.markupType === "Flat" ? "₹" : ""}{m.markupValue}{m.markupType !== "Flat" ? "%" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
