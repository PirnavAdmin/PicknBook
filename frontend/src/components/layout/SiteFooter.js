import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MapPin, Phone, X, ArrowLeft, Calendar, Tag, ShieldCheck, Bus, Plane, Sparkles, User, Bed, Headphones, Facebook, Twitter, Instagram, Youtube, Building2, Send, Lock } from "lucide-react";
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
  const [copiedContact, setCopiedContact] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);
  const [dynamicPolicies, setDynamicPolicies] = useState({
    "terms-conditions": null,
    "privacy-policy": null,
    "refund-cancellation-policy": null,
  });

  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phoneNo: "",
    subject: "",
    message: "",
  });
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [querySuccess, setQuerySuccess] = useState(false);

  const navigate = useNavigate();
  const bodyRef = useRef(null);
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
          // Sync to main layout cache too
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

  // Reset scroll to top of modal body whenever the opened policy changes
  useEffect(() => {
    if (activePolicy && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [activePolicy]);

  // Fetch blogs when Travel Guide modal is opened
  useEffect(() => {
    if (activePolicy === "travel-guide") {
      const fetchBlogs = async () => {
        setLoadingBlogs(true);
        try {
          const res = await getPublicBlogs();
          const list = Array.isArray(res) ? res : (res?.data || res?.blogs || []);
          setBlogs(list);
        } catch (e) {
          console.error("Error fetching travel guide blogs:", e);
          // Standard fallbacks if server has no blogs or throws an error
          setBlogs([
            {
              id: 1,
              title: "Exploring the Taj Mahal: A Complete Guide",
              slug: "exploring-taj-mahal",
              category: "Destinations",
              description: "Discover the best times to visit, ticket pricing, and historical highlights of India's iconic white marble monument.",
              content: "The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna river in the Indian city of Agra. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal. Best times to visit are early morning at sunrise to avoid the heat and crowds. Tickets can be purchased online or at the gate. Be sure to hire an official guide to hear the rich history behind every archway.",
              image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80",
              createdAt: "2026-06-20"
            },
            {
              id: 2,
              title: "Top 10 Hidden Beaches in South India",
              slug: "hidden-beaches-south-india",
              category: "Beaches",
              description: "Escape the crowds with these pristine, untouched coastal getaways across Karnataka, Kerala, and Goa.",
              content: "South India boasts some of the most scenic and peaceful coastlines in Asia. From the quiet shores of Gokarna's Paradise Beach to the golden sands of Marari in Kerala, there are plenty of secret spots for travelers seeking serenity. Pack light, respect the local fishing communities, and don't miss the fresh coconut water along the trails.",
              image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
              createdAt: "2026-06-18"
            }
          ]);
        } finally {
          setLoadingBlogs(false);
        }
      };
      fetchBlogs();
    } else {
      setSelectedBlog(null);
    }
  }, [activePolicy]);

  // Fetch policy page dynamically from CMS Page API only if it exists in the active pages list to prevent 404 console errors
  useEffect(() => {
    if (activePolicy) {
      const fetchDynamicPolicy = async () => {
        try {
          // 1. Fetch the list of public pages to check if the slug actually exists
          const pages = await getPublicPages();
          const pageExists = Array.isArray(pages) && pages.some(p => p.slug === activePolicy);

          if (pageExists) {
            // 2. Only fetch page by slug if it exists in the list
            const page = await getPublicPageBySlug(activePolicy);
            if (page) {
              setDynamicPolicies((prev) => ({
                ...prev,
                [activePolicy]: {
                  text: page.content || page.description || page.body,
                  imagePath: page.imagePath
                },
              }));
            }
          } else {
            console.log(`CMS page for slug "${activePolicy}" is not published. Using static fallback.`);
          }
        } catch (err) {
          console.warn(`CMS dynamic page search failed for: ${activePolicy}. Using static fallback.`, err);
        }
      };
      fetchDynamicPolicy();
    }
  }, [activePolicy]);

  // Support closing modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActivePolicy(null);
      }
    };
    if (activePolicy) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePolicy]);

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

  const getPolicyData = () => {
    const dynamicData = dynamicPolicies[activePolicy];
    const dynamicText = dynamicData && typeof dynamicData === "object" ? dynamicData.text : dynamicData;
    const imagePath = dynamicData && typeof dynamicData === "object" ? dynamicData.imagePath : null;
    switch (activePolicy) {
      case "terms-conditions":
        return {
          title: "Terms & Conditions",
          kicker: "Legal Information",
          text: dynamicText || TERMS_CONDITIONS_TEXT,
          imagePath: imagePath,
        };
      case "privacy-policy":
        return {
          title: "Privacy Policy",
          kicker: "Privacy & Data Protection",
          text: dynamicText || PRIVACY_POLICY_TEXT,
          imagePath: imagePath,
        };
      case "refund-cancellation-policy":
        return {
          title: "Refund & Cancellation Policy",
          kicker: "Refund & Cancellation",
          text: dynamicText || REFUND_CANCELLATION_POLICY_TEXT,
          imagePath: imagePath,
        };
      case "contact-us":
        return {
          title: "Contact Us",
          kicker: "Get In Touch",
          text: "custom_contact_us_form"
        };
      case "travel-guide":
        return {
          title: "Travel Guide",
          kicker: "Explore Destinations",
          text: "custom_travel_guide"
        };
      default:
        return null;
    }
  };

  const formatPolicyText = (text) => {
    if (!text) return null;
    return text
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p !== "")
      .map((trimmed, index) => {
        const isHeading =
          /^\d+\.\s+[A-Za-z]/.test(trimmed) || /^[a-z]\.\s+[A-Za-z]/.test(trimmed);

        return (
          <p
            key={index}
            className={isHeading ? "policy-heading" : "policy-paragraph"}
            style={
              isHeading
                ? {
                  fontWeight: "700",
                  marginTop: "12px",
                  marginBottom: "4px",
                  fontSize: "14px",
                  color: "#10233d",
                }
                : {
                  marginTop: "0px",
                  marginBottom: "6px",
                  lineHeight: "1.4",
                  color: "#4c627e",
                  fontSize: "13px"
                }
            }
          >
            {trimmed}
          </p>
        );
      });
  };

  const policyData = getPolicyData();

  const footerStyle = {
    backgroundImage: `url(${customFooterBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat'
  };
  if (footerConfig) {
    if (footerConfig.textColor) footerStyle.color = footerConfig.textColor;
  }

  return (
    <footer className="travel-footer upgraded-travel-footer" style={footerStyle}>
      <div className="footer-shell upgraded-footer-shell">

        {/* Top Newsletter & Brand Header Bar */}
        <div className="upgraded-footer-top-bar">
          <div className="upgraded-footer-brand-info">
            <div className="upgraded-footer-brand-logo-wrap">
              <img
                src={pickNBookLogo}
                alt="Pick N Book Logo"
                className="upgraded-footer-brand-logo-img"
              />
            </div>
            <p className="upgraded-footer-brand-desc">
              India's most trusted travel platform for instant bus, flight, and hotel bookings with guaranteed low fares & 24/7 support.
            </p>
          </div>

          <div className="upgraded-footer-newsletter-box">
            <div className="newsletter-text-content">
              <span className="newsletter-kicker">
                <Sparkles size={14} /> EXCLUSIVE TRAVEL OFFERS
              </span>
              <h4 className="newsletter-title">Subscribe to Get Secret Discounts</h4>
            </div>
            <form className="upgraded-subscribe-form" onSubmit={(e) => e.preventDefault()}>
              <div className="subscribe-input-wrapper">
                <Mail size={16} className="subscribe-mail-icon" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  required
                  className="upgraded-subscribe-input"
                />
              </div>
              <button type="submit" className="upgraded-subscribe-btn">
                <span>Subscribe</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        <hr className="upgraded-footer-divider" />

        {/* 4-Column Main Links Grid */}
        <div className="upgraded-footer-grid">

          {/* Column 1: Services */}
          <div className="upgraded-footer-col">
            <h4 className="upgraded-col-title">
              <Bus size={16} className="col-title-icon" />
              Our Services
            </h4>
            <ul className="upgraded-footer-links">
              <li>
                <button type="button" onClick={(e) => handleServiceClick("buses", e)} className="upgraded-footer-link">
                  Bus Ticket Booking
                </button>
              </li>
              <li>
                <button type="button" onClick={(e) => handleServiceClick("flights", e)} className="upgraded-footer-link">
                  Flight Booking
                </button>
              </li>
              <li>
                <button type="button" onClick={(e) => handleServiceClick("hotels", e)} className="upgraded-footer-link">
                  Hotel Reservations
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/offers")} className="upgraded-footer-link">
                  Exclusive Offers
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Quick Links */}
          <div className="upgraded-footer-col">
            <h4 className="upgraded-col-title">
              <Plane size={16} className="col-title-icon" />
              Quick Links
            </h4>
            <ul className="upgraded-footer-links">
              <li>
                <button type="button" onClick={() => navigate("/contact")} className="upgraded-footer-link">
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/travel-guide")} className="upgraded-footer-link">
                  Travel Guide & Blogs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/fetch-ticket")} className="upgraded-footer-link">
                  Track Booking Status
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/print-ticket")} className="upgraded-footer-link">
                  Print / Download E-Ticket
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Policies & Security */}
          <div className="upgraded-footer-col">
            <h4 className="upgraded-col-title">
              <ShieldCheck size={16} className="col-title-icon" />
              Policies & Help
            </h4>
            <ul className="upgraded-footer-links">
              <li>
                <button type="button" onClick={() => setActivePolicy("terms-conditions")} className="upgraded-footer-link">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActivePolicy("privacy-policy")} className="upgraded-footer-link">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActivePolicy("refund-cancellation-policy")} className="upgraded-footer-link">
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/contact")} className="upgraded-footer-link">
                  24/7 Support Center
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Get In Touch */}
          <div className="upgraded-footer-col upgraded-contact-col">
            <h4 className="upgraded-col-title">
              <Building2 size={16} className="col-title-icon" />
              Get In Touch
            </h4>
            <div className="upgraded-contact-block">
              <div className="upgraded-contact-item">
                <MapPin size={16} className="upgraded-contact-icon" />
                <span>Pirnav Software Solutions Pvt Ltd, 4th Floor, Jain Sadguru Capital Park, Madhapur, Hyderabad, Telangana 500081</span>
              </div>
              <div className="upgraded-contact-item">
                <button
                  type="button"
                  className="upgraded-copy-phone-btn"
                  onClick={() => copyContact("+91 999-999-9999", "phone")}
                >
                  <Phone size={16} className="upgraded-contact-icon" />
                  <span>+91 999-999-9999</span>
                  {copiedContact === "phone" && (
                    <span className="upgraded-copy-bubble">Copied</span>
                  )}
                </button>
              </div>
              <div className="upgraded-contact-item">
                <a href="mailto:contact@picknbook.in" className="upgraded-email-link">
                  <Mail size={16} className="upgraded-contact-icon" />
                  <span>contact@picknbook.in</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        <hr className="upgraded-footer-divider" />

        {/* Bottom Bar: Payments, Apps & Copyright */}
        <div className="upgraded-footer-bottom-bar">
          
          {/* We Accept & SSL Badge */}
          <div className="upgraded-payment-group">
            <span className="payment-label">We Accept:</span>
            <div className="payment-logos-row">
              <img src={mastercardSvg} alt="MasterCard" title="MasterCard" />
              <img src={visaSvg} alt="Visa" title="Visa" />
              <img src={rupaySvg} alt="RuPay" title="RuPay" />
              <img src={maestroSvg} alt="Maestro" title="Maestro" />
              <img src={amexSvg} alt="American Express" title="American Express" />
            </div>
          </div>

          {/* Apps Badges */}
          <div className="upgraded-app-badges">
            <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="upgraded-app-btn">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                alt="Get it on Google Play"
              />
            </a>
            <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="upgraded-app-btn">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                alt="Download on App Store"
              />
            </a>
          </div>

          {/* Copyright */}
          <div className="upgraded-copyright-text">
            <span>{footerConfig?.bottomLineText || "© 2026 Pick N Book. All rights reserved."}</span>
          </div>

        </div>

      </div>

      {/* Modern Glassmorphic Policy Modal Overlay */}
      {activePolicy && policyData && (
        <div
          className="footer-policy-backdrop"
          onClick={() => setActivePolicy(null)}
          style={{ display: "grid", placeItems: "center" }}
        >
          <div
            className="footer-policy-modal"
            style={activePolicy === "contact-us" ? { width: "min(1050px, 95vw)", padding: "0", overflow: "hidden", background: "#f3f4f6" } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            {activePolicy === "contact-us" ? (
              <div style={{
                background: "#e0761a",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                borderTopLeftRadius: "18px",
                borderTopRightRadius: "18px"
              }}>
                <h2 style={{ margin: 0, color: "#ffffff", fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>Contact Us</h2>
                <button
                  type="button"
                  onClick={() => setActivePolicy(null)}
                  style={{
                    position: "absolute",
                    right: "20px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  aria-label="Close policy modal"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopLeftRadius: "18px",
                borderTopRightRadius: "18px",
                borderBottom: "1px solid #334155"
              }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#38bdf8", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                    {policyData?.kicker || "TRAVEL & POLICIES"}
                  </span>
                  <h2 style={{ margin: 0, color: "#ffffff", fontSize: "1.3rem", fontWeight: "800" }}>
                    {policyData?.title || "Information"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePolicy(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "50%",
                    width: "34px",
                    height: "34px",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                  aria-label="Close policy modal"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div
              className="footer-policy-modal-body"
              ref={bodyRef}
              style={{
                overflowY: "auto",
                flex: "1",
                maxHeight: "calc(85vh - 75px)",
                padding: "24px",
                background: "#f8fafc"
              }}
            >
              {activePolicy === "contact-us" ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "24px",
                  alignItems: "stretch"
                }}>
                  {/* Left Column (Address, Call Us, Write Us) */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    border: "1px solid #e5e7eb"
                  }}>
                    {/* Call Us */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <div style={{
                        background: "#e0761a",
                        color: "#ffffff",
                        borderRadius: "50%",
                        width: "44px",
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <Phone size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: "#1f2937" }}>Have Questions? Call Us !</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>+91 999-999-9999</p>
                      </div>
                    </div>

                    {/* Write us on */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <div style={{
                        background: "#e0761a",
                        color: "#ffffff",
                        borderRadius: "50%",
                        width: "44px",
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <Mail size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: "#1f2937" }}>Write us on !</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>contact@picknbook.in</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <div style={{
                        background: "#e0761a",
                        color: "#ffffff",
                        borderRadius: "50%",
                        width: "44px",
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: "#1f2937" }}>Address</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#4b5563", lineHeight: "1.4" }}>
                          Pirnav Software Solutions Private Limited, 4th Floor, Jain Sadguru Images Capital Park, Madhapur Hyderabad, Telangana, India, 500081
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Form + Background Image) */}
                  <div style={{
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)), url(${contactBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: "12px",
                    padding: "28px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
                  }}>
                    <h3 style={{ margin: "0 0 20px 0", fontSize: "24px", color: "#0f56a3", fontWeight: "700" }}>Contact Us</h3>

                    {querySuccess ? (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700" }}>Thank You!</h4>
                        <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>Your query has been submitted successfully to Query Management.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuerySuccess(false);
                            setContactForm({ name: "", email: "", phoneNo: "", subject: "Footer Contact Inquiry", message: "" });
                          }}
                          style={{ background: "#e0761a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                        >
                          Send Another Message
                        </button>
                      </div>
                    ) : (
                      <form
                        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSubmittingQuery(true);
                          setQueryError("");
                          try {
                            await submitContactQuery(contactForm);
                            setQuerySuccess(true);
                          } catch (err) {
                            setQueryError(err.response?.data?.message || "Failed to submit query. Please try again.");
                          } finally {
                            setSubmittingQuery(false);
                          }
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Your Name *</label>
                            <input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                              disabled={submittingQuery}
                              style={{ padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", background: "#ffffff" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Your Email Address *</label>
                            <input
                              type="email"
                              required
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              disabled={submittingQuery}
                              style={{ padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", background: "#ffffff" }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Phone Number</label>
                            <input
                              type="text"
                              value={contactForm.phoneNo}
                              onChange={(e) => setContactForm({ ...contactForm, phoneNo: e.target.value })}
                              disabled={submittingQuery}
                              style={{ padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", background: "#ffffff" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Subject</label>
                            <input
                              type="text"
                              value={contactForm.subject}
                              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                              disabled={submittingQuery}
                              style={{ padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", background: "#ffffff" }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Message *</label>
                          <textarea
                            required
                            rows="4"
                            value={contactForm.message}
                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                            disabled={submittingQuery}
                            style={{ padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", resize: "none", background: "#ffffff" }}
                          />
                        </div>

                        {queryError && <p style={{ margin: 0, color: "#dc2626", fontSize: "12px" }}>{queryError}</p>}

                        <button
                          type="submit"
                          disabled={submittingQuery}
                          style={{
                            alignSelf: "flex-start",
                            padding: "10px 24px",
                            background: "#e0761a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background 0.2s",
                            opacity: submittingQuery ? 0.7 : 1
                          }}
                        >
                          {submittingQuery ? "Sending..." : "Send Message"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : activePolicy === "travel-guide" ? (
                <div className="footer-travel-guide-content">
                  {selectedBlog ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedBlog(null)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          color: "#1d4ed8",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "13px",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          alignSelf: "flex-start"
                        }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back to Travel Guides</span>
                      </button>

                      <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        <BlogCardCover
                          src={selectedBlog.imageUrl || selectedBlog.image}
                          title={selectedBlog.title}
                          category={selectedBlog.category}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748b" }}>
                        {selectedBlog.category && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "999px", fontWeight: "700", color: "#2563eb" }}>
                            <Tag size={12} />
                            <span>{selectedBlog.category}</span>
                          </span>
                        )}
                        {selectedBlog.createdAt && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "999px", fontWeight: "600" }}>
                            <Calendar size={12} />
                            <span>{new Date(selectedBlog.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                        {selectedBlog.title}
                      </h3>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#334155",
                          lineHeight: "1.7",
                          whiteSpace: "pre-wrap",
                          background: "#ffffff",
                          padding: "20px",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0"
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedBlog.content || selectedBlog.description || "" }}
                      />
                    </div>
                  ) : loadingBlogs ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      <span>Loading travel guides...</span>
                    </div>
                  ) : blogs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      <span>No travel guides available. Check back soon!</span>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
                      {blogs.map((blog) => (
                        <article
                          key={blog.id || blog.slug || blog.title}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "16px",
                            overflow: "hidden",
                            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            transition: "all 0.25s ease"
                          }}
                        >
                          <BlogCardCover
                            src={blog.imageUrl || blog.image}
                            title={blog.title}
                            category={blog.category}
                          />

                          <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: "1" }}>
                            <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: "999px", fontWeight: "700", textTransform: "uppercase", fontSize: "0.7rem" }}>
                                {blog.category || "Travel Guide"}
                              </span>
                            </div>

                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "800", color: "#0f172a", lineHeight: "1.35" }}>
                              {blog.title}
                            </h4>

                            <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#64748b", lineHeight: "1.5", flex: "1" }}>
                              {blog.description ? (blog.description.length > 85 ? blog.description.substring(0, 85) + "..." : blog.description) : "Discover top travel recommendations and tips for your journey."}
                            </p>

                            <button
                              type="button"
                              onClick={() => setSelectedBlog(blog)}
                              style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "#0f172a",
                                border: "none",
                                borderRadius: "10px",
                                fontSize: "12.5px",
                                fontWeight: "700",
                                color: "#ffffff",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "#2563eb";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "#0f172a";
                              }}
                            >
                              Read Guide
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {policyData.imagePath && (
                    <div style={{ marginBottom: "16px", textAlign: "center" }}>
                      <img
                        src={toApiAssetUrl(policyData.imagePath)}
                        alt={policyData.title}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "250px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0"
                        }}
                      />
                    </div>
                  )}
                  {formatPolicyText(policyData.text)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
