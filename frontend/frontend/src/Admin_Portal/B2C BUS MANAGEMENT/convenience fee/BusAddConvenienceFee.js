/* eslint-disable */
import React, { useEffect, useState } from "react";
import { List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BusAddConvenienceFee.css";
import { getConvenienceFee, updateConvenienceFee } from "../../../services/adminBusService";

export default function AdminAddConvenienceFeePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [feeInr, setFeeInr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadFee = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await getConvenienceFee();

        if (data && typeof data === "object" && data.feeInr !== undefined) {
          setFeeInr(String(data.feeInr ?? data.FeeInr ?? 0));
          const statusVal = data.status ?? data.Status;
          if (statusVal !== undefined) {
            setIsActive(String(statusVal).toLowerCase() === "active");
          } else {
            setIsActive(data.isActive ?? data.IsActive ?? true);
          }
        } else if (data && typeof data === "object" && (data.value !== undefined)) {
          // Legacy fallback
          setFeeInr(String(data.value ?? 0));
          setIsActive(String(data.status || "").toLowerCase() === "active");
        }
        // If message-only response ("No convenience fee configured."), leave defaults
      } catch (err) {
        console.warn("Failed to load convenience fee:", err.message);
        // Leave form with defaults for initial creation
      } finally {
        setLoading(false);
      }
    };

    loadFee();
  }, []);

  const handleSave = async () => {
    setStatusMessage("");
    setErrorMessage("");

    const numericFee = Number(feeInr);
    if (!Number.isFinite(numericFee) || numericFee < 0) {
      setErrorMessage("Enter a valid fee amount (>= 0).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        feeInr: numericFee,
        status: isActive ? "Active" : "Inactive",
        updatedBy: "admin",
      };

      await updateConvenienceFee(payload);

      setStatusMessage("Convenience fee updated successfully.");
      setTimeout(() => {
        navigate("/admin/b2c-bus/convenience-fee");
      }, 1200);
    } catch (err) {
      setErrorMessage(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="admin-b2c-page admin-convenience-edit-page">
        <header className="admin-b2c-header admin-convenience-edit-header">
          <h1>Convenience Fee Settings</h1>
        </header>
        <div className="admin-data-info">Loading convenience fee settings...</div>
      </section>
    );
  }

  return (
    <section className="admin-b2c-page admin-convenience-edit-page">
      <div className="admin-convenience-edit-head-row">
        <header className="admin-b2c-header admin-convenience-edit-header">
          <h1>Convenience Fee Settings</h1>
        </header>

        <button
          type="button"
          className="admin-convenience-list-btn"
          onClick={() => navigate("/admin/b2c-bus/convenience-fee")}
        >
          <List size={14} />
          View Current Fee
        </button>
      </div>

      <section className="admin-convenience-edit-shell">
        <div className="admin-convenience-edit-row">
          <div className="admin-convenience-edit-label">Fee Amount (INR)</div>
          <div className="admin-convenience-edit-field">
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeInr}
              onChange={(event) => setFeeInr(event.target.value)}
              placeholder="e.g. 49"
            />
          </div>

          <div className="admin-convenience-edit-label">Active</div>
          <div className="admin-convenience-edit-field">
            <label className="admin-convenience-toggle-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span>{isActive ? "Fee is active — applied during booking" : "Fee is inactive — not applied"}</span>
            </label>
          </div>
        </div>

        <div className="admin-convenience-edit-actions">
          <button
            type="button"
            className="admin-convenience-update-btn"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </section>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-data-info">{statusMessage}</div> : null}
    </section>
  );
}
