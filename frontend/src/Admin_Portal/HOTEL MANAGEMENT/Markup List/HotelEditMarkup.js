/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { List } from "lucide-react";
import {
  getHotelPricingRuleById,
  createHotelPricingRule,
  updateHotelPricingRule,
} from "../../../services/adminHotelService";
import "./HotelEditMarkup.css";

const DEFAULT_FORM = {
  markupType: "Percentage",
  markupValue: "",
  isActive: false,
};

export default function HotelEditMarkup() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await getHotelPricingRuleById(id);
        if (!cancelled && data) {
          setFormValues({
            markupType: data.markupType || "Percentage",
            markupValue: data.markupValue != null ? String(data.markupValue) : "",
            isActive: Boolean(data.isActive),
          });
        }
      } catch (err) {
        if (!cancelled) setErrorMessage(err.message || "Failed to load rule.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isEditing]);

  const handleChange = (field) => (e) => {
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleToggle = () => {
    setFormValues((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const validate = () => {
    const markupVal = Number(formValues.markupValue);

    if (formValues.markupValue === "" || !Number.isFinite(markupVal) || markupVal < 0) {
      return "Markup value must be a number >= 0.";
    }
    if (formValues.markupType === "Percentage" && markupVal > 100) {
      return "Markup percentage cannot exceed 100%.";
    }
    return "";
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (formValues.isActive) {
      const confirmed = window.confirm(
        "Setting this rule as active will automatically deactivate all other pricing rules. Continue?"
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        markupType: formValues.markupType,
        markupValue: Number(formValues.markupValue),
        isActive: formValues.isActive,
      };

      if (isEditing) {
        await updateHotelPricingRule(id, payload);
        setSuccessMessage("Pricing rule updated successfully.");
      } else {
        await createHotelPricingRule(payload);
        setSuccessMessage("Pricing rule created successfully.");
      }

      setTimeout(() => navigate("/admin/hotel-management/markup-list"), 1200);
    } catch (err) {
      setErrorMessage(err.message || "Failed to save rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="hml-edit-page">
        <p style={{ color: "#64748b" }}>Loading pricing rule...</p>
      </div>
    );
  }

  return (
    <div className="hml-edit-page">
      <div className="hml-edit-head-row">
        <h2 style={{ fontWeight: 500, margin: 0 }}><span style={{ color: '#A51C49', fontWeight: 500 }}>Hotel</span> {isEditing ? "Edit Pricing Rule" : "Add Pricing Rule"}</h2>
        <button
          type="button"
          className="hml-edit-back-btn"
          onClick={() => navigate("/admin/hotel-management/markup-list")}
        >
          <List size={14} />
          Pricing Rules
        </button>
      </div>

      {errorMessage && <div className="hml-edit-error">{errorMessage}</div>}
      {successMessage && <div className="hml-edit-success">{successMessage}</div>}

      <div className="hml-edit-info-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Only one pricing rule can be active at a time. Activating this rule will automatically deactivate all others.
      </div>

      <div className="hml-edit-shell">
        <div className="hml-edit-grid">
          {/* Row 1: Markup Type */}
          <div className="hml-edit-label">Markup Type</div>
          <div className="hml-edit-field">
            <select value={formValues.markupType} onChange={handleChange("markupType")}>
              <option value="Percentage">Percentage</option>
              <option value="Flat">Flat</option>
            </select>
          </div>

          {/* Row 2: Markup Value */}
          <div className="hml-edit-label">Markup Value</div>
          <div className="hml-edit-field">
            <input
              type="number"
              min="0"
              step="0.01"
              value={formValues.markupValue}
              onChange={handleChange("markupValue")}
              placeholder={formValues.markupType === "Percentage" ? "e.g. 10.00" : "e.g. 500.00"}
            />
          </div>

          {/* Row 3: Active Status */}
          <div className="hml-edit-label">Active Status</div>
          <div className="hml-edit-field">
            <div className="hml-toggle-wrap">
              <label className="hml-toggle-switch">
                <input type="checkbox" checked={formValues.isActive} onChange={handleToggle} />
                <span className="hml-toggle-track" />
              </label>
              <span className="hml-toggle-text">
                {formValues.isActive ? "Active — this is the live rule" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="hml-edit-actions">
          <button
            type="button"
            className="hml-edit-submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
          </button>
          <button
            type="button"
            className="hml-edit-cancel-btn"
            onClick={() => navigate("/admin/hotel-management/markup-list")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

