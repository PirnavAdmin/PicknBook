import React, { useState } from "react";
import { List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveHotelConvenienceFee } from "../../../services/adminHotelService";
import "./HotelEditConvenienceFee.css";

export default function AdminHotelEditConvenienceFeePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    amountType: "Fixed",
    value: "",
    updatedBy: "system",
    status: "Active",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field) => (e) => {
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleUpdate = async () => {
    setStatusMessage("");
    setErrorMessage("");

    const numericValue = Number(formValues.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setErrorMessage("Enter a valid value greater than 0.");
      return;
    }

    try {
      await saveHotelConvenienceFee({
        feeInr: numericValue,
        isActive: formValues.status === "Active",
        amountType: formValues.amountType,
      });
      setStatusMessage("Convenience fee added successfully.");
      setTimeout(() => {
        navigate("/admin/b2c-hotel/convenience-fee");
      }, 1500);
    } catch (error) {
      setErrorMessage("Failed to save convenience fee.");
      console.error(error);
    }
  };

  return (
    <section className="admin-b2c-page admin-hotel-fee-edit-page">
      <div className="admin-hotel-fee-edit-head-row">
        <header className="admin-b2c-header admin-hotel-fee-edit-header">
          <h1>Add B2C Hotel Convenience Fee</h1>
        </header>
        <div className="admin-hotel-fee-edit-head-actions">
          <button
            type="button"
            className="admin-hotel-fee-list-btn"
            onClick={() => navigate("/admin/b2c-hotel/convenience-fee")}
          >
            <List size={16} /> Convenience Fee List
          </button>
        </div>
      </div>

      <section className="admin-hotel-fee-edit-shell">
        <div className="admin-hotel-fee-edit-row">
          <div className="admin-hotel-fee-edit-label">Amount Type</div>
          <div className="admin-hotel-fee-edit-field">
            <select value={formValues.amountType} onChange={handleChange("amountType")}>
              <option value="Fixed">Fixed</option>
              <option value="Percentage">Percentage</option>
            </select>
          </div>

          <div className="admin-hotel-fee-edit-label">Value</div>
          <div className="admin-hotel-fee-edit-field">
            <input
              type="number"
              value={formValues.value}
              onChange={handleChange("value")}
              placeholder="Enter value"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="admin-hotel-fee-edit-row">
          <div className="admin-hotel-fee-edit-label">Updated By</div>
          <div className="admin-hotel-fee-edit-field">
            <input type="text" value={formValues.updatedBy} onChange={handleChange("updatedBy")} />
          </div>

          <div className="admin-hotel-fee-edit-label">Status</div>
          <div className="admin-hotel-fee-edit-field">
            <select value={formValues.status} onChange={handleChange("status")}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="admin-hotel-fee-edit-actions">
          <button type="button" className="admin-hotel-fee-update-btn" onClick={handleUpdate}>
            Submit
          </button>
        </div>
      </section>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-data-info">{statusMessage}</div> : null}
    </section>
  );
}

