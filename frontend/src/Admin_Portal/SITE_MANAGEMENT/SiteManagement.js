/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Globe, Image, Users, FileText, Link as LinkIcon } from "lucide-react";

function SiteManagement() {
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const cards = [
    {
      title: "Site Settings",
      description: "Manage global website configuration",
      to: "/admin/site-management/site-setting",
      icon: <Settings size={28} />
    },
    {
      title: "Social Links",
      description: "Manage social media platforms and URLs",
      to: "/admin/site-management/social-links",
      icon: <Globe size={28} />
    },
    {
      title: "Home Slider",
      description: "Manage homepage promotional sliders",
      to: "/admin/site-management/slider-image",
      icon: <Image size={28} />
    },
    {
      title: "Manual Suppliers",
      description: "Manage suppliers for manual bookings",
      to: "/admin/site-management/manual-booking-supplier",
      icon: <Users size={28} />
    },
    {
      title: "SEO / Meta Data",
      description: "Manage page level SEO meta-data",
      to: "/admin/site-management/meta-data-list",
      icon: <FileText size={28} />
    },
    {
      title: "SEO Links",
      description: "Manage SEO friendly URLs and route mappings.",
      to: "/admin/site-management/seo-link-list",
      icon: <LinkIcon size={28} />
    }
  ];

  return (
    <div style={{ padding: "24px 32px", minHeight: "100%", width: "100%", boxSizing: "border-box" }}>
      {/* Breadcrumb */}
      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Home / Site Management</p>
      
      <h1 style={{ margin: "6px 0 2px", fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
        Site Management
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: "0.86rem", color: "#64748b" }}>
        Manage global site configuration, sliders, social links and SEO content.
      </p>

      {/* Grid of Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "24px"
      }}>
        {cards.map((card, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.to)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                cursor: "pointer",
                boxShadow: isHovered ? "0 10px 25px rgba(165, 28, 73, 0.08)" : "0 4px 16px rgba(0, 0, 0, 0.02)",
                transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                borderColor: isHovered ? "#A51C49" : "#e2e8f0",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {/* Icon Container (Rounded square matching mockup) */}
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: isHovered ? "rgba(165, 28, 73, 0.15)" : "rgba(165, 28, 73, 0.08)",
                color: "#A51C49",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                transition: "all 0.25s ease-out"
              }}>
                {card.icon}
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                {card.title}
              </h3>
              
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SiteManagement;
