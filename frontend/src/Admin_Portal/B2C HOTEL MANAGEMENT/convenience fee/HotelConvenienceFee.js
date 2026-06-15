import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, PencilLine, List } from "lucide-react";
import "./HotelConvenienceFee.css";
import { getHotelConvenienceFees, saveHotelConvenienceFee } from "../../../services/adminHotelService";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatDateTime = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function HotelConvenienceFee() {
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newFeeVal, setNewFeeVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFee = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHotelConvenienceFees();
      // Find the active fee from list, or take the first one
      const activeFee = data.find(f => f.status === "Active") || data[0] || null;
      setFee(activeFee);
      if (activeFee) {
        setNewFeeVal(String(activeFee.feeInr));
      }
    } catch (err) {
      setError(err.message || "Unable to load hotel convenience fee settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFee();
  }, []);

  const handleSave = async () => {
    const numericFee = Number(newFeeVal);
    if (!Number.isFinite(numericFee) || numericFee < 0) {
      setError("Enter a valid convenience fee amount (>= 0).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await saveHotelConvenienceFee({ feeInr: numericFee });
      setIsEditing(false);
      await loadFee();
    } catch (err) {
      setError(err.message || "Failed to update convenience fee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-b2c-page admin-convenience-page">
      <header className="admin-b2c-header admin-convenience-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>B2C Hotel Convenience Fee</h1>
        {fee && !isEditing && (
          <button
            type="button"
            className="admin-convenience-icon-btn edit"
            onClick={() => setIsEditing(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}
          >
            <PencilLine size={15} />
            Edit Fee
          </button>
        )}
      </header>

      {loading ? (
        <div className="admin-data-info">Loading convenience fee settings...</div>
      ) : (
        <div style={{ marginTop: "20px" }}>
          {error && <div className="admin-data-error" style={{ marginBottom: "15px" }}>{error}</div>}

          {isEditing || !fee ? (
            <section className="admin-convenience-edit-shell" style={{ maxWidth: "500px", padding: "24px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  <span>Fee Amount (INR):</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newFeeVal}
                    onChange={(e) => setNewFeeVal(e.target.value)}
                    placeholder="e.g. 150"
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
                    {isSubmitting ? "Saving..." : "Save Settings"}
                  </button>
                  {fee && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setNewFeeVal(String(fee.feeInr));
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
            <section className="admin-convenience-table-shell" style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
              <header className="admin-convenience-table-head" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 3fr 3fr", padding: "12px 20px", background: "var(--surface-soft)", fontWeight: "650", borderBottom: "1px solid var(--border)", fontSize: "0.88rem" }}>
                <span>ID</span>
                <span>Fee (INR)</span>
                <span>Status</span>
                <span>Created</span>
                <span>Updated</span>
              </header>

              <div className="admin-convenience-table-body" style={{ padding: "12px 20px" }}>
                <article className="admin-convenience-table-row" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 3fr 3fr", alignItems: "center", fontSize: "0.85rem" }}>
                  <span>{fee.id}</span>
                  <strong>{inrFormatter.format(fee.feeInr)}</strong>
                  <span className="admin-convenience-status-cell">
                    {fee.status === "Active" ? (
                      <span className="admin-convenience-status active" style={{ color: "green", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={14} /> Active
                      </span>
                    ) : (
                      <span className="admin-convenience-status inactive" style={{ color: "red", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <XCircle size={14} /> Inactive
                      </span>
                    )}
                  </span>
                  <span>{formatDateTime(fee.entryDateUtc)}</span>
                  <span>{formatDateTime(fee.updateDateUtc)}</span>
                </article>
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
