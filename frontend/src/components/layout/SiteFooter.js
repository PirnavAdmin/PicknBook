import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MapPin, Phone, PhoneCall, X, ArrowLeft, Calendar, Tag, ShieldCheck, Bus, Plane, Sparkles, User, Bed, Headphones, Facebook, Twitter, Instagram, Youtube, Linkedin, Building2, Send, Lock } from "lucide-react";
import "../../STYLES/SiteFooter.css";
import {
  TERMS_CONDITIONS_TEXT,
  PRIVACY_POLICY_TEXT,
  REFUND_CANCELLATION_POLICY_TEXT,
} from "../../data/legalPages";
import { getPublicPageBySlug, getPublicPages } from "../../services/cmsPageService";
import { getPublicBlogs } from "../../services/blogService";
import { getActiveLayout } from "../../services/themeService";
import { toApiAssetUrl } from "../../services/apiClient";
import { submitContactQuery } from "../../services/queryService";
import contactBg from "../../assets/images/contact-bg.png";
import customFooterBg from "../../assets/images/indian-travel-banner-hd.png";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.png";
import visaSvg from "../../assets/images/payments/visa.svg";
import mastercardSvg from "../../assets/images/payments/mastercard.svg";
import rupaySvg from "../../assets/images/payments/rupay.svg";
import maestroSvg from "../../assets/images/payments/maestro.svg";
import amexSvg from "../../assets/images/payments/amex.svg";

function BlogCardCover({ src, title, category }) {
  const [hasError, setHasError] = useState(false);
  const rawUrl = src ? toApiAssetUrl(src) : "";

  const gradients = [
    "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
    "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  ];

  const categoryIndex = (category || "").length % gradients.length;
  const gradient = gradients[categoryIndex];

  if (!rawUrl || hasError) {
    return (
      <div style={{
        height: "140px",
        width: "100%",
        background: gradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        padding: "16px",
        textAlign: "center"
      }}>
        <Sparkles size={26} style={{ marginBottom: "6px", opacity: 0.85 }} />
        <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.9 }}>
          {category || "Travel Guide"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={rawUrl}
      alt={title || "Blog cover"}
      onError={() => setHasError(true)}
      style={{ width: "100%", height: "140px", objectFit: "cover" }}
    />
  );
}

export default function SiteFooter() {
  const navigate = useNavigate();
  const [footerConfig, setFooterConfig] = useState(() => {
    try {
      const cached = localStorage.getItem("b2c_layout_config");
      if (cached) {
        const layout = JSON.parse(cached);
        if (layout && layout.footer) {
          return layout.footer;
        }
      }
    } catch (e) {
      // Ignore cache parse error
    }
    try {
      const fallback = JSON.parse(localStorage.getItem("admin_fallback_footer") || "null");
      return fallback;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const loadFooterConfig = async () => {
      try {
        const layout = await getActiveLayout();
        if (layout && layout.footer) {
          setFooterConfig(layout.footer);
          localStorage.setItem("b2c_layout_config", JSON.stringify(layout));
        }
      } catch (err) {
        const fallback = JSON.parse(localStorage.getItem("admin_fallback_footer") || "null");
        if (fallback) {
          setFooterConfig(fallback);
        }
      }
    };
    loadFooterConfig();
  }, []);



  const handleServiceClick = (tab, e) => {
    e.preventDefault();
    navigate(`/?tab=${tab}`);
    window.setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  const copyContact = async (value, type) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedContact(type);
      window.setTimeout(() => setCopiedContact(null), 1800);
    } catch (error) {
      setCopiedContact(null);
    }
  };


  return (
    <footer className="pnb-site-footer">
      <div className="pnb-footer-wrapper">



        {/* ── 2. Main Content Card (Large White Card) ──────────── */}
        <div className="pnb-footer-main-card">
          <div className="pnb-footer-main-grid">

            {/* Column 1: Brand Info */}
            <div className="pnb-footer-brand-col">
              <div
                className="pnb-footer-brand-logo-wrap"
                onClick={() => navigate("/")}
                role="button"
                tabIndex={0}
              >
                <img
                  src={pickNBookLogo}
                  alt="Pick&Book Logo"
                  className="pnb-footer-brand-logo-img"
                />
              </div>
              <p className="pnb-footer-brand-desc">
                India's most trusted travel platform for instant bus, flight, and hotel bookings with guaranteed low fares &amp; 24/7 support.
              </p>
            </div>

            {/* Column 2: Our Services */}
            <div className="pnb-footer-links-col">
              <h4 className="pnb-col-heading">
                <Bus size={19} className="pnb-col-heading-icon" />
                <span>Our Services</span>
              </h4>
              <ul className="pnb-col-links-list">
                <li>
                  <button
                    type="button"
                    onClick={(e) => handleServiceClick("buses", e)}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Bus Ticket Booking
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => handleServiceClick("flights", e)}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Flight Booking
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => handleServiceClick("hotels", e)}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Hotel Reservations
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/offers")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Exclusive Offers
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Quick Links */}
            <div className="pnb-footer-links-col">
              <h4 className="pnb-col-heading">
                <Plane size={19} className="pnb-col-heading-icon" />
                <span>Quick Links</span>
              </h4>
              <ul className="pnb-col-links-list">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/contact")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Contact Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/travel-guide")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Travel Guide &amp; Blogs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/fetch-ticket")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Track Booking Status
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/print-ticket")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Print / Download E-Ticket
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Policies & Help */}
            <div className="pnb-footer-links-col">
              <h4 className="pnb-col-heading">
                <ShieldCheck size={19} className="pnb-col-heading-icon" />
                <span>Policies &amp; Help</span>
              </h4>
              <ul className="pnb-col-links-list">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/legal/terms-conditions")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Terms &amp; Conditions
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/legal/privacy-policy")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/legal/refund-cancellation-policy")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> Refund &amp; Cancellation Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/contact")}
                    className="pnb-footer-link"
                  >
                    <span className="pnb-link-chevron">›</span> 24/7 Support Center
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* ── 3. Payments, App & Social Bar (White Rounded Pill) ── */}
        <div className="pnb-footer-bottom-pill">

          {/* We Accept */}
          <div className="pnb-pill-section pnb-pill-payments">
            <span className="pnb-pill-label">We Accept:</span>
            <div className="pnb-payment-badges-row">
              <span className="pnb-pay-badge pnb-visa-badge">VISA</span>
              <span className="pnb-pay-badge pnb-mc-badge">
                <span className="mc-circle mc-red"></span>
                <span className="mc-circle mc-yellow"></span>
              </span>
              <span className="pnb-pay-badge pnb-rupay-badge">
                RuPay <span className="pnb-badge-chevron">›</span>
              </span>
              <span className="pnb-pay-badge pnb-upi-badge">
                UPI <span className="pnb-badge-chevron">›</span>
              </span>
              <span className="pnb-pay-badge pnb-amex-badge">AMEX</span>
            </div>
          </div>

          {/* Experience App */}
          <div className="pnb-pill-section pnb-pill-apps">
            <span className="pnb-pill-label">Experience App:</span>
            <div className="pnb-app-badges-row">
              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-store-btn"
              >
                <svg className="pnb-store-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#34A853" d="M3.6 1.8l10.8 10.2-3.1 3.1L3.6 1.8z" />
                  <path fill="#4285F4" d="M14.4 12L3.6 1.8c-.3.4-.6 1-.6 1.7v17c0 .7.3 1.3.6 1.7L14.4 12z" />
                  <path fill="#FBBC05" d="M17.8 8.8l-3.4 3.2 3.4 3.2 3.8-2.2c1.1-.6 1.1-1.7 0-2.3l-3.8-1.9z" />
                  <path fill="#EA4335" d="M14.4 12l-3.1-3.1L3.6 22.2l10.8-10.2z" />
                </svg>
                <div className="pnb-store-btn-text">
                  <span className="pnb-store-sub">GET IT ON</span>
                  <span className="pnb-store-name">Google Play</span>
                </div>
              </a>

              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-store-btn"
              >
                <svg className="pnb-store-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.64-.78 1.08-1.86.96-2.95-1 .04-2.14.67-2.8 1.45-.58.67-1.1 1.77-.96 2.83 1.12.09 2.16-.55 2.8-1.33z" />
                </svg>
                <div className="pnb-store-btn-text">
                  <span className="pnb-store-sub">DOWNLOAD ON THE</span>
                  <span className="pnb-store-name">App Store</span>
                </div>
              </a>
            </div>
          </div>

          {/* Follow Us */}
          <div className="pnb-pill-section pnb-pill-socials">
            <span className="pnb-pill-label">Follow Us:</span>
            <div className="pnb-social-circles-row">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-social-circle pnb-ig-circle"
                title="Instagram"
              >
                <Instagram size={17} color="#ffffff" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-social-circle pnb-fb-circle"
                title="Facebook"
              >
                <Facebook size={17} color="#ffffff" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-social-circle pnb-yt-circle"
                title="YouTube"
              >
                <Youtube size={17} color="#ffffff" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pnb-social-circle pnb-li-circle"
                title="LinkedIn"
              >
                <Linkedin size={17} color="#ffffff" />
              </a>
            </div>
          </div>

        </div>

        {/* ── 4. Bottom Copyright & Legal Line ─────────────────── */}
        <div className="pnb-footer-bottom-line">
          <span className="pnb-bottom-brand">Pick&Book</span>
          <span className="pnb-bottom-sep">|</span>
          <span className="pnb-bottom-item">Explore</span>
          <span className="pnb-bottom-sep">|</span>
          <span className="pnb-bottom-item">Book</span>
          <span className="pnb-bottom-sep">|</span>
          <span className="pnb-bottom-item">Travel</span>
          <span className="pnb-bottom-sep">|</span>
          <span className="pnb-bottom-copyright">
            {footerConfig?.bottomLineText || "© 2026 Pirnav Software Solutions Pvt. Ltd. All rights reserved."}
          </span>
          <span className="pnb-bottom-sep">|</span>
          <button
            type="button"
            onClick={() => navigate("/legal/terms-conditions")}
            className="pnb-bottom-link"
          >
            Terms
          </button>
          <span className="pnb-bottom-sep">|</span>
          <button
            type="button"
            onClick={() => navigate("/legal/privacy-policy")}
            className="pnb-bottom-link"
          >
            Privacy
          </button>
          <span className="pnb-bottom-sep">|</span>
          <button
            type="button"
            onClick={() => navigate("/legal/refund-cancellation-policy")}
            className="pnb-bottom-link"
          >
            Cancellation Policy
          </button>
        </div>

      </div>

    </footer>
  );
}

