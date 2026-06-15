import React, { useState } from "react";
import "../../STYLES/QR.css";

export default function AddQR({ onAdd, onBack, isBusy = false }) {
  const [formData, setFormData] = useState({
    bankName: "",
    accountName: "",
    upiId: "",
    mobile: "",
    file: null,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "file" ? files?.[0] || null : value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(formData.bankName).trim()) {
      nextErrors.bankName = "Bank name is required.";
    }

    if (!String(formData.accountName).trim()) {
      nextErrors.accountName = "Account name is required.";
    }

    if (!String(formData.upiId).trim()) {
      nextErrors.upiId = "UPI ID is required.";
    }

    if (!String(formData.mobile).trim()) {
      nextErrors.mobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(String(formData.mobile).trim())) {
      nextErrors.mobile = "Enter a valid 10 digit mobile number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || typeof onAdd !== "function") {
      return;
    }

    await onAdd({
      bankName: String(formData.bankName).trim(),
      accountName: String(formData.accountName).trim(),
      upiId: String(formData.upiId).trim(),
      mobile: String(formData.mobile).trim(),
      file: formData.file,
    });

    setFormData({
      bankName: "",
      accountName: "",
      upiId: "",
      mobile: "",
      file: null,
    });
    setErrors({});
  };

  return (
    <div className="card">
      <button type="button" onClick={onBack} className="btn-back" disabled={isBusy}>
        QR List
      </button>

      <h3 className="form-title">Add QR</h3>

      <form className="grid-form" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="input-style"
            placeholder="Bank Name"
            disabled={isBusy}
          />
          {errors.bankName && <p className="error-text">{errors.bankName}</p>}
        </div>

        <div>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            className="input-style"
            placeholder="Account Holder Name"
            disabled={isBusy}
          />
          {errors.accountName && <p className="error-text">{errors.accountName}</p>}
        </div>

        <div>
          <input
            type="text"
            name="upiId"
            value={formData.upiId}
            onChange={handleChange}
            className="input-style"
            placeholder="UPI ID"
            disabled={isBusy}
          />
          {errors.upiId && <p className="error-text">{errors.upiId}</p>}
        </div>

        <div>
          <input
            type="text"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            className="input-style"
            placeholder="Mobile Number"
            maxLength="10"
            disabled={isBusy}
          />
          {errors.mobile && <p className="error-text">{errors.mobile}</p>}
        </div>

        <div className="col-span-full">
          <input
            type="file"
            name="file"
            accept="image/*"
            onChange={handleChange}
            className="file-input"
            disabled={isBusy}
          />
        </div>

        <div className="col-span-full qr-form-actions">
          <button type="submit" className="btn-save" disabled={isBusy}>
            {isBusy ? "Saving..." : "Save QR"}
          </button>
        </div>
      </form>
    </div>
  );
}
