import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Mail, MapPin, Phone, X } from "lucide-react";
import "../../STYLES/SiteFooter.css";
import {
  TERMS_CONDITIONS_TEXT,
  PRIVACY_POLICY_TEXT,
  REFUND_CANCELLATION_POLICY_TEXT,
} from "../../data/legalPages";

export default function SiteFooter() {
  const [copiedContact, setCopiedContact] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);
  
  const navigate = useNavigate();
  const bodyRef = useRef(null);

  // Reset scroll to top of modal body whenever the opened policy changes
  useEffect(() => {
    if (activePolicy && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
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
    switch (activePolicy) {
      case "terms-conditions":
        return {
          title: "Terms & Conditions",
          kicker: "Legal Information",
          text: TERMS_CONDITIONS_TEXT,
        };
      case "privacy-policy":
        return {
          title: "Privacy Policy",
          kicker: "Privacy & Data Protection",
          text: PRIVACY_POLICY_TEXT,
        };
      case "refund-cancellation-policy":
        return {
          title: "Refund & Cancellation Policy",
          kicker: "Refund & Cancellation",
          text: REFUND_CANCELLATION_POLICY_TEXT,
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

  return (
    <footer className="travel-footer">
      <div className="footer-shell">
        
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
              <button type="button" onClick={() => navigate("/contact")} className="footer-inline-link">Contact Us</button>
              <span className="footer-link-divider">|</span>
              <button type="button" onClick={() => navigate("/travel-guide")} className="footer-inline-link">Travel Guide</button>
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
          <span>Copyright © 2026 All Rights Reserved</span>
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
            onClick={(e) => e.stopPropagation()}
          >
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
            <div
              className="footer-policy-modal-body"
              ref={bodyRef}
              style={{
                overflowY: "auto",
                flex: "1",
                marginTop: "16px",
                paddingRight: "8px",
              }}
            >
              {formatPolicyText(policyData.text)}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
