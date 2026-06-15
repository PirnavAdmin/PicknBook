import React, { useEffect, useState } from "react";
import { Check, Edit, Plus, Trash2, X, AlertCircle } from "lucide-react";
import "./HotelGstSettings.css";
import { getHotelGstSettings, saveHotelGstSetting } from "../../../services/adminHotelService";

export default function HotelGstSettings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [gstPercent, setGstPercent] = useState("");
  const [category, setCategory] = useState("Hotel");
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHotelGstSettings();
      setRows(Array.isArray(data) ? data : []);
      const activeSetting = data.find(g => g.status === "Active");
      if (activeSetting) {
        setGstPercent(String(activeSetting.gstPercent));
        setCategory(activeSetting.gstCategory || "Hotel");
        setRemark(activeSetting.remark || "");
      }
    } catch (err) {
      setError(err.message || "Failed to load GST settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    const percent = Number(gstPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("Enter a valid GST percentage (0 - 100).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await saveHotelGstSetting({
        gstCategory: category,
        gstPercent: percent,
        remark: remark.trim()
      });
      setIsEditing(false);
      await loadSettings();
    } catch (err) {
      setError(err.message || "Failed to save GST setting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGst = rows.find(r => r.status === "Active");

  return (
    <section className="admin-b2c-page admin-gst-settings-page">
      <header className="admin-b2c-header admin-gst-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>B2C Hotel GST Settings</h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Manage GST percentages applied on hotel reservation checkout bookings</p>
        </div>
        {activeGst && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}
          >
            <Edit size={14} /> Update Rate
          </button>
        )}
      </header>

      {loading ? (
        <div className="admin-data-info">Loading GST settings...</div>
      ) : (
        <div style={{ marginTop: "24px" }}>
          {error && <div className="admin-data-error" style={{ marginBottom: "15px" }}>{error}</div>}

          {isEditing || !activeGst ? (
            <section className="admin-gst-edit-shell" style={{ maxWidth: "550px", padding: "24px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "16px" }}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 16px 0", fontWeight: "700" }}>Configure GST Settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  <span>Category Name:</span>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Hotel"
                    disabled
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-soft)", color: "var(--text-secondary)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  <span>GST Percentage (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    placeholder="e.g. 18"
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  <span>Remark:</span>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="e.g. Standard 12% / 18% GST"
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                  />
                </label>
                
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting}
                    style={{ padding: "10px 16px", borderRadius: "8px", background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: "650" }}
                  >
                    {isSubmitting ? "Saving..." : "Save GST Settings"}
                  </button>
                  {activeGst && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setGstPercent(String(activeGst.gstPercent));
                        setRemark(activeGst.remark || "");
                      }}
                      style={{ padding: "10px 16px", borderRadius: "8px", background: "var(--border)", color: "var(--text-primary)", border: "1px solid var(--border)", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <section className="admin-gst-active-card" style={{ padding: "24px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "green", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={14} /> ACTIVE SETTING
                </span>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--primary)" }}>{activeGst.gstPercent}%</div>
                <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>Category: {activeGst.gstCategory}</div>
                {activeGst.remark && <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Remark: {activeGst.remark}</div>}
              </section>

              <section className="admin-gst-history-list" style={{ padding: "24px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "16px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", fontWeight: "700" }}>GST Audit History</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {rows.map((row) => (
                    <div key={row.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid var(--border)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <span>{row.gstPercent}% ({row.status})</span>
                      <span>{new Date(row.entryDateUtc).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
