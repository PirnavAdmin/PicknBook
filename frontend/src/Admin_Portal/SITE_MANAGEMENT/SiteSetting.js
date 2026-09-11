/* eslint-disable */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Edit3, Settings, ShieldCheck, X, Upload, Trash2, Info, Save } from "lucide-react";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.svg";

const DEFAULT_SITE_SETTINGS = {
  siteName: "PickNBook",
  currency: "INR - Indian Rupee",
  siteLogo: "picknbook_logo.png",
  timeZone: "Asia/Kolkata",
  favicon: "favicon.ico",
  websiteStatus: "Active",
  contactEmail: "support@picknbook.com",
  maintenanceMode: "Enabled", // Enabled in mockup
  contactPhoneCode: "+91",
  contactPhone: "98765 43210",
  address: "Hyderabad, Telangana, India",
  maintenanceMessage: "Website is currently under maintenance. We will be back soon. Thank you for your patience."
};

function SiteSetting() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("admin-site-settings-picknbook");
    return saved ? JSON.parse(saved) : DEFAULT_SITE_SETTINGS;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...settings });
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    setSettings(editForm);
    localStorage.setItem("admin-site-settings-picknbook", JSON.stringify(editForm));
    setIsEditing(false);
    showToast("Site configuration updated successfully!");
  };

  const handleCancel = () => {
    setEditForm({ ...settings });
    setIsEditing(false);
  };

  return (
    <div style={{ padding: "24px 32px", minHeight: "100%", width: "100%", boxSizing: "border-box", background: "#f8fafc" }}>
      {/* Toast */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "#ecfdf5",
          border: "1px solid #10b981",
          color: "#065f46",
          padding: "12px 24px",
          borderRadius: "10px",
          fontSize: "0.88rem",
          fontWeight: "bold",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
          zIndex: 9999
        }}>
          ✅ {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, display: "flex", gap: "6px", alignItems: "center" }}>
        <Link to="/admin" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
        <span>&gt;</span>
        <Link to="/admin/site-management" style={{ color: "#64748b", textDecoration: "none" }}>Site Management</Link>
        <span>&gt;</span>
        {isEditing ? (
          <>
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={handleCancel}>Site Settings</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Edit</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>Site Settings</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {isEditing ? "Edit Site Settings" : "Site Settings"}
          </h1>
        </div>

        {isEditing ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: "#A51C49",
                color: "#ffffff",
                border: "none",
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
              }}
            >
              <Save size={15} /> Save Changes
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{
              background: "#A51C49",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
            }}
          >
            <Edit3 size={15} /> Edit Settings
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* General Information Card */}
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.01)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "0.95rem", fontWeight: 700, color: "#A51C49", textTransform: "uppercase", letterSpacing: "0.02em" }}>
              General Information
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }}>
              {/* Site Name */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Site Name <span style={{ color: "#ef4444" }}>*</span></span>
                <input
                  type="text"
                  required
                  value={editForm.siteName}
                  onChange={e => setEditForm(prev => ({ ...prev, siteName: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500 }}
                />
              </label>

              {/* Currency */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Currency <span style={{ color: "#ef4444" }}>*</span></span>
                <select
                  value={editForm.currency}
                  onChange={e => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, background: "#fff" }}
                >
                  <option value="INR - Indian Rupee">INR - Indian Rupee</option>
                  <option value="USD - US Dollar">USD - US Dollar</option>
                  <option value="EUR - Euro">EUR - Euro</option>
                </select>
              </label>

              {/* Site Logo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Site Logo <span style={{ color: "#ef4444" }}>*</span></span>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    minWidth: "180px",
                    height: "42px",
                    boxSizing: "border-box"
                  }}>
                    <img src={pickNBookLogo} alt="Logo" style={{ height: "16px", width: "auto", objectFit: "contain" }} />
                  </div>
                  <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                    <Upload size={14} /> Change
                  </button>
                  <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #fee2e2", padding: "8px 12px", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600 }}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>
                  Recommended size: 250px X 60px, Max size: 2MB, PNG/JPG
                </span>
              </div>

              {/* Favicon */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Favicon <span style={{ color: "#ef4444" }}>*</span></span>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "42px",
                    height: "42px",
                    boxSizing: "border-box"
                  }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#A51C49" }}>P</span>
                  </div>
                  <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                    <Upload size={14} /> Change
                  </button>
                  <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #fee2e2", padding: "8px 12px", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600 }}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>
                  Recommended size: 32px X 32px, Max size: 1MB, ICO/PNG
                </span>
              </div>

              {/* Contact Email */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Contact Email <span style={{ color: "#ef4444" }}>*</span></span>
                <input
                  type="email"
                  required
                  value={editForm.contactEmail}
                  onChange={e => setEditForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500 }}
                />
              </label>

              {/* Contact Phone */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Contact Phone <span style={{ color: "#ef4444" }}>*</span></span>
                <div style={{ display: "flex" }}>
                  <select
                    value={editForm.contactPhoneCode}
                    onChange={e => setEditForm(prev => ({ ...prev, contactPhoneCode: e.target.value }))}
                    style={{
                      padding: "10px",
                      borderRadius: "8px 0 0 8px",
                      border: "1px solid #cbd5e1",
                      borderRight: "none",
                      outline: "none",
                      fontSize: "0.88rem",
                      background: "#fff",
                      fontWeight: 500
                    }}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={editForm.contactPhone}
                    onChange={e => setEditForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: "0 8px 8px 0",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.88rem",
                      fontWeight: 500
                    }}
                  />
                </div>
              </div>

              {/* Address */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Address <span style={{ color: "#ef4444" }}>*</span></span>
                <input
                  type="text"
                  required
                  value={editForm.address}
                  onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500 }}
                />
              </label>

              {/* Time Zone */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Time Zone <span style={{ color: "#ef4444" }}>*</span></span>
                <select
                  value={editForm.timeZone}
                  onChange={e => setEditForm(prev => ({ ...prev, timeZone: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, background: "#fff" }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </label>
            </div>
          </div>

          {/* Website Configuration Card */}
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.01)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "0.95rem", fontWeight: 700, color: "#A51C49", textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Website Configuration
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px", marginBottom: "20px" }}>
              {/* Website Status */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Website Status <span style={{ color: "#ef4444" }}>*</span></span>
                <select
                  value={editForm.websiteStatus}
                  onChange={e => setEditForm(prev => ({ ...prev, websiteStatus: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, background: "#fff" }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              {/* Maintenance Mode */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                <span>Maintenance Mode</span>
                <div style={{ display: "flex", gap: "24px", height: "42px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}>
                    <input
                      type="radio"
                      name="maintenanceMode"
                      value="Disabled"
                      checked={editForm.maintenanceMode === "Disabled"}
                      onChange={e => setEditForm(prev => ({ ...prev, maintenanceMode: e.target.value }))}
                      style={{ accentColor: "#A51C49" }}
                    />
                    Disabled
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}>
                    <input
                      type="radio"
                      name="maintenanceMode"
                      value="Enabled"
                      checked={editForm.maintenanceMode === "Enabled"}
                      onChange={e => setEditForm(prev => ({ ...prev, maintenanceMode: e.target.value }))}
                      style={{ accentColor: "#A51C49" }}
                    />
                    Enabled
                  </label>
                </div>
              </div>

              {/* Maintenance Message */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700, gridColumn: "1 / -1" }}>
                <span>Maintenance Message <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 400 }}>(Shown to users when maintenance mode is enabled)</span></span>
                <textarea
                  rows={3}
                  value={editForm.maintenanceMessage}
                  onChange={e => setEditForm(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, resize: "none" }}
                />
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 500 }}>
                  Maximum 255 characters.
                </span>
              </label>
            </div>
          </div>

          {/* Banner note at bottom */}
          <div style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "8px",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#9f1239",
            fontSize: "0.8rem",
            fontWeight: 600
          }}>
            <Info size={16} style={{ color: "#e11d48", flexShrink: 0 }} />
            <span>Note: Changes made here will be reflected on the website as per the active status and configurations.</span>
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: "#A51C49",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(165, 28, 73, 0.2)"
              }}
            >
              <Save size={16} /> Save Changes
            </button>
          </div>

        </form>
      ) : (
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "32px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 24px", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #edf2f7", paddingBottom: "12px" }}>
            General Settings
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 48px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Site Name</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.siteName}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Currency</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.currency}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Site Logo</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.siteLogo}</span>
                <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>View</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Time Zone</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.timeZone}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Favicon</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.favicon}</span>
                <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>View</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Website Status</span>
              <span style={{
                padding: "3px 10px",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 700,
                alignSelf: "flex-start",
                background: settings.websiteStatus === "Active" ? "#dcfce7" : "#fee2e2",
                color: settings.websiteStatus === "Active" ? "#15803d" : "#b91c1c"
              }}>
                {settings.websiteStatus}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contact Email</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.contactEmail}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Maintenance Mode</span>
              <span style={{
                padding: "3px 10px",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 700,
                alignSelf: "flex-start",
                background: settings.maintenanceMode === "Enabled" ? "#fee2e2" : "#f1f5f9",
                color: settings.maintenanceMode === "Enabled" ? "#b91c1c" : "#475569"
              }}>
                {settings.maintenanceMode}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contact Phone</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.contactPhoneCode} {settings.contactPhone}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Address</span>
              <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 500 }}>{settings.address}</span>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Mode notice box */}
      {!isEditing && (
        <div style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
        }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: settings.maintenanceMode === "Enabled" ? "#fee2e2" : "#f0fdf4",
            color: settings.maintenanceMode === "Enabled" ? "#ef4444" : "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Settings size={22} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 2px", fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
              Maintenance mode is currently {settings.maintenanceMode.toLowerCase()}.
            </h4>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
              When enabled, only maintenance page will be visible to users.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteSetting;
