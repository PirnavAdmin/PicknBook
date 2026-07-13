import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Mail, MapPin, Phone, X, ArrowLeft, Calendar, Tag } from "lucide-react";
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

  const footerStyle = {};
  if (footerConfig) {
    if (footerConfig.bgColor) footerStyle.backgroundColor = footerConfig.bgColor;
    if (footerConfig.gradientColor) footerStyle.background = footerConfig.gradientColor;
    if (footerConfig.textColor) footerStyle.color = footerConfig.textColor;
  }

  return (
    <footer className="travel-footer" style={footerStyle}>
      <div className="footer-shell">
        {footerConfig?.imageUrl && (
          <div className="footer-logo-row" style={{ marginBottom: "20px", display: "flex", justifyContent: "flex-start" }}>
            <img src={footerConfig.imageUrl} alt="Footer Logo" style={{ maxHeight: "45px", width: "auto" }} />
          </div>
        )}

        {/* Detail Grid */}
        <div className="footer-detail-grid">

          {/* Row 1: Services */}
          <div className="footer-detail-row">
            <span className="footer-row-label">SERVICES</span>
            <span className="footer-row-pipe">|</span>
            <div className="footer-row-content">
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={(e) => handleServiceClick("flights", e)} className="footer-inline-link">Flight</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={(e) => handleServiceClick("buses", e)} className="footer-inline-link">Bus</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={(e) => handleServiceClick("hotels", e)} className="footer-inline-link">Hotel</button>
            </div>
          </div>

          {/* Row 2: Quick Links */}
          <div className="footer-detail-row">
            <span className="footer-row-label">QUICK LINKS</span>
            <span className="footer-row-pipe">|</span>
            <div className="footer-row-content">
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => window.open("/contact", "_blank")} className="footer-inline-link">Contact Us</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => window.open("/travel-guide", "_blank")} className="footer-inline-link">Travel Guide</button>
            </div>
          </div>

          {/* Row 3: Policies */}
          <div className="footer-detail-row">
            <span className="footer-row-label">POLICIES</span>
            <span className="footer-row-pipe">|</span>
            <div className="footer-row-content">
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => setActivePolicy("terms-conditions")} className="footer-inline-link">Terms & Conditions</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => setActivePolicy("privacy-policy")} className="footer-inline-link">Privacy Policy</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => setActivePolicy("refund-cancellation-policy")} className="footer-inline-link">Refund & Cancellation Policy</button>
            </div>
          </div>

          {/* Row 4: Get In Touch */}
          <div className="footer-detail-row align-start">
            <span className="footer-row-label">GET IN TOUCH</span>
            <span className="footer-row-pipe" style={{ marginTop: "3px" }}>|</span>
            <div className="footer-contact-block">
              <div className="footer-contact-item">
                <MapPin size={16} className="contact-icon" />
                <span>Pirnav Software Solutions Private Limited, 4th Floor, Jain Sadguru Images Capital Park, Madhapur, Hyderabad,Telangana ,India ( 500081 )</span>
              </div>
              <div className="footer-contact-item">
                <button
                  type="button"
                  className="footer-copy-phone-btn"
                  onClick={() => copyContact("+91 999-999-9999", "phone")}
                >
                  <Phone size={16} className="contact-icon" />
                  <span>+91 999-999-9999</span>
                  {copiedContact === "phone" && (
                    <span className="footer-copy-bubble">Copied</span>
                  )}
                </button>
              </div>
              <div className="footer-contact-item">
                <a href="mailto:contact@picknbook.in" className="footer-email-link">
                  <Mail size={16} className="contact-icon" />
                  <span>contact@picknbook.in</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Separator Line */}
        <hr className="footer-separator dashed" />

        {/* Middle Section */}
        <div className="footer-middle-section">

          {/* We Accept & Apps */}
          <div className="footer-middle-left">
            <div className="footer-accept-block">
              <span className="accept-title">We Accept</span>
              <div className="accept-logos">
                {/* MasterCard */}
                <div className="card-logo mastercard" title="MasterCard">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                    alt="MasterCard"
                    style={{ height: "25px", width: "auto", objectFit: "contain" }}
                  />
                </div>
                {/* Maestro */}
                <div className="card-logo maestro" title="Maestro">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/f/f6/Maestro_2016.svg"
                    alt="Maestro"
                    style={{ height: "25px", width: "auto", objectFit: "contain" }}
                  />
                </div>
                {/* Visa */}
                <div className="card-logo visa" title="Visa">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo_%282021%E2%80%93present%29.svg"
                    alt="Visa"
                    style={{ height: "25px", width: "auto", objectFit: "contain" }}
                  />
                </div>
                {/* AMEX */}
                <div className="card-logo amex" title="American Express">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg"
                    alt="American Express"
                    style={{ height: "25px", width: "auto", objectFit: "contain" }}
                  />
                </div>
                {/* RuPay */}
                <div className="card-logo rupay" title="RuPay">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg"
                    alt="RuPay"
                    style={{ height: "25px", width: "auto", objectFit: "contain" }}
                  />
                </div>
              </div>
            </div>

            {/* App downloads */}
            <div className="footer-apps-block">
              {/* Google Play */}
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="app-badge">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  style={{ height: "40px", width: "auto", objectFit: "contain" }}
                />
              </a>
              {/* App Store */}
              <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="app-badge">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                  alt="Download on the App Store"
                  style={{ height: "40px", width: "auto", objectFit: "contain" }}
                />
              </a>
            </div>
          </div>

          {/* Newsletter Subscription */}
          <div className="footer-middle-right">
            <form className="footer-subscribe-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Email address" required className="subscribe-input" />
              <button type="submit" className="subscribe-btn">Subscribe</button>
            </form>
          </div>

        </div>

        {/* Separator Line */}
        <hr className="footer-separator dotted" />

        {/* Copyright */}
        <div className="footer-copyright-row">
          <span>{footerConfig?.bottomLineText || "Copyright © 2026 All Rights Reserved"}</span>
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
              <div className="footer-policy-modal-head">
                <div>
                  <span>{policyData.kicker}</span>
                  <h2>{policyData.title}</h2>
                </div>
                <button
                  type="button"
                  className="footer-policy-close"
                  onClick={() => setActivePolicy(null)}
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
                maxHeight: activePolicy === "contact-us" ? "calc(85vh - 60px)" : "none",
                marginTop: activePolicy === "contact-us" ? "0" : "16px",
                padding: activePolicy === "contact-us" ? "24px" : "0 8px 0 0",
                background: activePolicy === "contact-us" ? "#f3f4f6" : "transparent"
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
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13px",
                          padding: "0",
                          alignSelf: "flex-start"
                        }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back to Guides</span>
                      </button>

                      {(selectedBlog.imageUrl || selectedBlog.image) && (
                        <img
                          src={toApiAssetUrl(selectedBlog.imageUrl || selectedBlog.image)}
                          alt={selectedBlog.title}
                          style={{
                            width: "100%",
                            height: "200px",
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0"
                          }}
                        />
                      )}

                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748b" }}>
                        {selectedBlog.category && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Tag size={12} />
                            <span>{selectedBlog.category}</span>
                          </span>
                        )}
                        {selectedBlog.createdAt && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} />
                            <span>{new Date(selectedBlog.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                        {selectedBlog.title}
                      </h3>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#334155",
                          lineHeight: "1.6",
                          whiteSpace: "pre-wrap"
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                      {blogs.map((blog) => (
                        <div
                          key={blog.id || blog.slug || blog.title}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%"
                          }}
                        >
                          {(blog.imageUrl || blog.image) && (
                            <img
                              src={toApiAssetUrl(blog.imageUrl || blog.image)}
                              alt={blog.title}
                              style={{ width: "100%", height: "120px", objectFit: "cover" }}
                            />
                          )}
                          <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: "1" }}>
                            <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                              <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: "100px", fontWeight: "600" }}>
                                {blog.category || "Guide"}
                              </span>
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                              {blog.title}
                            </h4>
                            <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#475569", lineHeight: "1.4", flex: "1" }}>
                              {blog.description ? (blog.description.length > 80 ? blog.description.substring(0, 80) + "..." : blog.description) : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedBlog(blog)}
                              style={{
                                width: "100%",
                                padding: "8px",
                                background: "#f8fafc",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#0f172a",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "#dc2626";
                                e.currentTarget.style.color = "#fff";
                                e.currentTarget.style.borderColor = "#dc2626";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "#f8fafc";
                                e.currentTarget.style.color = "#0f172a";
                                e.currentTarget.style.borderColor = "#e2e8f0";
                              }}
                            >
                              Read More
                            </button>
                          </div>
                        </div>
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
