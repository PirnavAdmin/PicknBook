/* eslint-disable */
import React, { useState } from "react";
import { ShieldCheck, Save, RefreshCw, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import "./HotelVoucherSettings.css";

export default function HotelVoucherSettings() {
  const [title, setTitle] = useState("B2C Hotel Booking Confirmation");
  const [logoUrl, setLogoUrl] = useState("PickNBook");
  const [email, setEmail] = useState("hotels@picknbook.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [address, setAddress] = useState("102, Prime Square, Hitech City, Hyderabad, India");
  const [terms, setTerms] = useState("1. Government photo ID is required at check-in.\n2. Standard check-in time is 2:00 PM; check-out is 12:00 PM.\n3. Cancellation charges apply as per hotel policy.");
  const [primaryColor, setPrimaryColor] = useState("#A51C49");
  const [textColor, setTextColor] = useState("#1e293b");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1200);
  };

  return (
    <section className="admin-b2c-page admin-b2c-hotel-page admin-voucher-page">
      <style>{`
        .save-voucher-btn {
          transition: all 0.2s ease !important;
        }
        .save-voucher-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
      `}</style>
      <header className="admin-b2c-header admin-voucher-header" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '28px' }}>
          <span style={{ color: '#A51C49' }}>B2C Hotel</span> Voucher Settings
        </h2>
      </header>

      <div className="voucher-settings-container">
        {/* Configuration Form */}
        <div className="voucher-form-card">
          <h2 className="section-title">Configure Hotel Voucher Template</h2>
          <form onSubmit={handleSave} className="voucher-config-form">
            <div className="form-row">
              <label className="form-group">
                <span>Voucher Title</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label className="form-group">
                <span>Brand Name / Logo Text</span>
                <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} required />
              </label>
            </div>

            <div className="form-row">
              <label className="form-group">
                <span>Support Email</span>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </label>
              <label className="form-group">
                <span>Support Phone</span>
                <div className="input-icon-wrapper">
                  <Phone size={16} className="input-icon" />
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </label>
            </div>

            <label className="form-group">
              <span>Company Address</span>
              <div className="input-icon-wrapper">
                <MapPin size={16} className="input-icon" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
            </label>

            <label className="form-group">
              <span>Terms & Conditions</span>
              <textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} required />
            </label>

            <div className="form-row colors-row">
              <label className="form-group color-picker-group">
                <span>Primary Color</span>
                <div className="color-picker-input">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                </div>
              </label>
              <label className="form-group color-picker-group">
                <span>Text Color</span>
                <div className="color-picker-input">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                  <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                </div>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn save-voucher-btn" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="spinner" size={16} />
                    <span>Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="voucher-preview-card">
          <h2 className="section-title">Live Hotel Voucher Preview</h2>
          <div className="voucher-preview-frame" style={{ borderColor: primaryColor }}>
            {/* Header */}
            <div className="preview-header" style={{ borderBottom: `2px dashed ${primaryColor}` }}>
              <div className="logo-section">
                <span className="logo-accent" style={{ color: primaryColor }}>Pick</span>
                <span className="logo-main" style={{ color: textColor }}>N</span>
                <span className="logo-accent" style={{ color: primaryColor }}>Book</span>
              </div>
              <div className="voucher-title-section">
                <h3 style={{ color: primaryColor }}>{title}</h3>
                <span className="voucher-tag">CONFIRMED</span>
              </div>
            </div>

            {/* Ticket Content Mock */}
            <div className="preview-ticket-body" style={{ color: textColor }}>
              <div className="ticket-main-row">
                <div className="ticket-col">
                  <span className="label">PRIMARY GUEST</span>
                  <span className="value bold">Jane Smith</span>
                </div>
                <div className="ticket-col">
                  <span className="label">CONFIRMATION NO</span>
                  <span className="value bold" style={{ color: primaryColor }}>PNBHT-203491</span>
                </div>
              </div>

              <div className="ticket-route-row" style={{ background: `${primaryColor}0a`, borderLeft: `3px solid ${primaryColor}` }}>
                <div className="route-point">
                  <span className="time">14 Apr 2026</span>
                  <span className="city">Check-In (02:00 PM)</span>
                </div>
                <div className="route-connector">
                  <span className="connector-line" style={{ background: primaryColor }} />
                  <span className="duration">3 Nights</span>
                </div>
                <div className="route-point">
                  <span className="time">17 Apr 2026</span>
                  <span className="city">Check-Out (12:00 PM)</span>
                </div>
              </div>

              <div className="ticket-main-row details-grid">
                <div className="ticket-col">
                  <span className="label">HOTEL NAME</span>
                  <span className="value">Grand Plaza Resort & Spa</span>
                </div>
                <div className="ticket-col">
                  <span className="label">ROOM TYPE</span>
                  <span className="value">Deluxe King Bed</span>
                </div>
                <div className="ticket-col">
                  <span className="label">MEALS</span>
                  <span className="value">Breakfast Included</span>
                </div>
              </div>
            </div>

            {/* Support and Address */}
            <div className="preview-support-section" style={{ background: "#f8fafc" }}>
              <div className="support-col">
                <span className="preview-sub-title">SUPPORT CONTACT</span>
                <span className="support-item"><Mail size={12} style={{ color: primaryColor }} /> {email}</span>
                <span className="support-item"><Phone size={12} style={{ color: primaryColor }} /> {phone}</span>
              </div>
              <div className="support-col">
                <span className="preview-sub-title">COMPANY ADDRESS</span>
                <span className="address-text">{address}</span>
              </div>
            </div>

            {/* Terms */}
            <div className="preview-terms-section">
              <span className="preview-sub-title">TERMS & CONDITIONS</span>
              <pre className="terms-pre">{terms}</pre>
            </div>

            {/* Footer QR mock */}
            <div className="preview-footer" style={{ borderTop: `1px solid #e2e8f0` }}>
              <div className="barcode-mock">
                <div className="barcode-lines" />
                <span className="barcode-num">PNBHT-203491-Verified</span>
              </div>
              <div className="secure-tag">
                <ShieldCheck size={14} className="security-icon" />
                <span>Digitally Verified Hotel Voucher</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

