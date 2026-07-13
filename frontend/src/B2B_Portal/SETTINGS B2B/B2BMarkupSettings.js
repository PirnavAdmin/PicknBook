import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Plus, Tag } from "lucide-react";
import { getMarkupSettings, updateMarkupSettings } from "../../services/b2bService";
import "../../STYLES/B2BLayout.css";

export default function B2BMarkupSettings() {
  const [markups, setMarkups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [formData, setFormData] = useState({
    serviceType: "Flight",
    markupType: "Flat",
    markupValue: ""
  });

  const fetchMarkups = async () => {
    setLoading(true);
    try {
      const data = await getMarkupSettings();
      setMarkups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading markups:", error);
      
      // Fallback Demo Markups
      setMarkups([
        { serviceType: "Flight", markupType: "Flat", markupValue: 150.0, updatedAtUtc: new Date().toISOString() },
        { serviceType: "Bus", markupType: "Percentage", markupValue: 3.0, updatedAtUtc: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkups();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const value = parseFloat(formData.markupValue);

    if (isNaN(value) || value < 0) {
      setStatus({ type: "error", message: "Please input a valid markup amount." });
      return;
    }

    setUpdating(true);
    setStatus({ type: "", message: "" });

    const payload = {
      serviceType: formData.serviceType,
      markupType: formData.markupType,
      markupValue: value
    };

    try {
      const response = await updateMarkupSettings(payload);
      if (response.success || response.markupValue !== undefined) {
        setStatus({
          type: "success",
          message: response.message || `${formData.serviceType} markup settings updated successfully.`
        });
        fetchMarkups();
        setFormData({ ...formData, markupValue: "" });
      } else {
        throw new Error(response.message || "Failed to update markup.");
      }
    } catch (error) {
      console.error("Error saving markup:", error);
      const errMsg = error?.message || "Failed to connect to markup configuration service.";

      // Fallback Demo Mode Behavior
      if (errMsg.includes("Failed to fetch") || errMsg.includes("404")) {
        // Update local state to simulate update
        setMarkups((prev) => {
          const index = prev.findIndex((m) => m.serviceType === formData.serviceType);
          const newMarkup = {
            serviceType: formData.serviceType,
            markupType: formData.markupType,
            markupValue: value,
            updatedAtUtc: new Date().toISOString()
          };
          if (index > -1) {
            const nextMarkups = [...prev];
            nextMarkups[index] = newMarkup;
            return nextMarkups;
          }
          return [...prev, newMarkup];
        });

        setStatus({
          type: "success",
          message: `Demo Mode: ${formData.serviceType} markup simulated update to ${formData.markupType === "Flat" ? "₹" : ""}${value}${formData.markupType === "Percentage" ? "%" : ""}.`
        });
        setFormData({ ...formData, markupValue: "" });
      } else {
        setStatus({ type: "error", message: errMsg });
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="b2b-dashboard">
      <div className="b2b-dashboard-header">
        <h1>Markup Settings</h1>
        <p>Set custom commissions and markups to earn additional revenue. Added values will apply automatically to client ticket searches.</p>
      </div>

      <div className="b2b-quick-section">
        {/* Active Markups Panel */}
        <div className="b2b-panel" style={{ flex: 1 }}>
          <h2 className="b2b-panel-title">Current Markup Configurations</h2>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <RefreshCw size={24} className="spin" style={{ color: 'var(--b2b-primary)' }} />
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Loading configurations...</p>
            </div>
          ) : markups.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--b2b-text-secondary)' }}>No active markup configurations found.</p>
          ) : (
            <div className="b2b-info-list" style={{ marginTop: 20 }}>
              {markups.map((m) => (
                <div key={m.serviceType} className="b2b-info-item" style={{ padding: '16px 0', borderBottom: '1px solid var(--b2b-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} style={{ color: 'var(--b2b-primary)' }} />
                    <span className="b2b-info-label" style={{ fontWeight: 'bold' }}>{m.serviceType} Service</span>
                  </div>
                  <span className="b2b-info-value" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--b2b-primary)' }}>
                    {m.markupType === "Flat" ? "₹" : ""}
                    {m.markupValue}
                    {m.markupType === "Percentage" ? "%" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Update Markup Form */}
        <div className="b2b-panel" style={{ flex: 1 }}>
          <h2 className="b2b-panel-title">Update Service Markup</h2>

          {status.message && (
            <div className={`b2b-alert ${status.type === "success" ? "success" : "error"}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
              {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group-item" style={{ flex: 1 }}>
                <label>Service Type</label>
                <select 
                  value={formData.serviceType} 
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                >
                  <option value="Flight">Flight</option>
                  <option value="Bus">Bus</option>
                </select>
              </div>

              <div className="form-group-item" style={{ flex: 1 }}>
                <label>Markup Type</label>
                <select 
                  value={formData.markupType} 
                  onChange={(e) => setFormData({ ...formData, markupType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                >
                  <option value="Flat">Flat Amount (INR)</option>
                  <option value="Percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div className="form-group-item">
              <label>Markup Value</label>
              <input 
                type="number" 
                placeholder="e.g. 150 or 3.5" 
                value={formData.markupValue} 
                onChange={(e) => setFormData({ ...formData, markupValue: e.target.value })}
                style={{ padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={updating}
              className="b2b-btn"
              style={{ padding: '12px 24px', background: 'var(--b2b-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', width: 'fit-content', marginTop: '10px' }}
            >
              {updating && <RefreshCw size={14} className="spin" />}
              {updating ? "Updating..." : "Save Configuration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
