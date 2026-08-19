/* eslint-disable */
import React, { useState } from "react";
import { ShieldCheck, Save, RefreshCw, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import "./FlightVoucherSettings.css";

export default function FlightVoucherSettings() {
  const [title, setTitle] = useState("B2C Flight E-Ticket Receipt");
  const [logoUrl, setLogoUrl] = useState("PickNBook");
  const [email, setEmail] = useState("flights@picknbook.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [address, setAddress] = useState("102, Prime Square, Hitech City, Hyderabad, India");
  const [terms, setTerms] = useState("1. Carriage is subject to airline terms & conditions.\n2. Please carry a valid Photo ID for airport entry.\n3. Check-in counters close 60 minutes prior to departure.");
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
    <section className="admin-b2c-page admin-voucher-page">
      <header className="admin-b2c-header admin-voucher-header">
        <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Voucher Settings</h1>
      </header>

      <div className="voucher-settings-container">
        {/* Configuration Form */}
        <div className="voucher-form-card">
          <h2 className="section-title">Configure Flight Ticket Template</h2>
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
          <h2 className="section-title">Live Flight Voucher Preview</h2>
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
                  <span className="label">PASSENGER NAME</span>
                  <span className="value bold">John Smith / MR</span>
                </div>
                <div className="ticket-col">
                  <span className="label">AIRLINE PNR</span>
                  <span className="value bold" style={{ color: primaryColor }}>PNBFL9281</span>
                </div>
              </div>

              <div className="ticket-route-row" style={{ background: `${primaryColor}0a`, borderLeft: `3px solid ${primaryColor}` }}>
                <div className="route-point">
                  <span className="time">06:00 AM</span>
                  <span className="city">DEL (Delhi)</span>
                </div>
                <div className="route-connector">
                  <span className="connector-line" style={{ background: primaryColor }} />
                  <span className="duration">2h 15m</span>
                </div>
                <div className="route-point">
                  <span className="time">08:15 AM</span>
                  <span className="city">BOM (Mumbai)</span>
                </div>
              </div>

              <div className="ticket-main-row details-grid">
                <div className="ticket-col">
                  <span className="label">FLIGHT</span>
                  <span className="value">IndiGo (6E-2034)</span>
                </div>
                <div className="ticket-col">
                  <span className="label">CLASS</span>
                  <span className="value">Economy (V)</span>
                </div>
                <div className="ticket-col">
                  <span className="label">BAGGAGE</span>
                  <span className="value">15 Kg Check-in</span>
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
                <span className="barcode-num">PNBFL9281-Verified</span>
              </div>
              <div className="secure-tag">
                <ShieldCheck size={14} className="security-icon" />
                <span>Digitally Verified E-Ticket</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

