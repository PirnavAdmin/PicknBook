import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../STYLES/bank.css";
import { getItem, setItem } from "../utils/memoryStorage";

const AddBankPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    accountType: "",
    ifscCode: "",
    branchName: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    let value = event.target.value;
    if (event.target.name === "ifscCode") value = value.toUpperCase();
    setForm({ ...form, [event.target.name]: value });
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.bankName.trim()) nextErrors.bankName = "Bank Name is required";
    if (!/^\d{9,16}$/.test(form.accountNumber)) {
      nextErrors.accountNumber = "Account Number must be 9-16 digits";
    }
    if (!form.accountType) nextErrors.accountType = "Account Type is required";
    if (!/^[A-Z0-9]{4}0[A-Z0-9]{6}$/.test(form.ifscCode)) {
      nextErrors.ifscCode = "IFSC invalid";
    }
    if (!form.branchName.trim()) nextErrors.branchName = "Branch Name is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (validate()) {
      const saved = getItem("banks");
      const banks = saved ? JSON.parse(saved) : [];
      setItem(
        "banks",
        JSON.stringify([...banks, { ...form, id: Date.now() }])
      );
      navigate("/banks");
    }
  };

  return (
    <div className="bank-container">
      <div className="flex-between bank-header-row">
        <h2 className="page-title">Add Bank</h2>
        <button onClick={() => navigate("/banks")} className="btn-back">
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="white-card bank-form">
        {["name", "bankName", "accountNumber", "ifscCode", "branchName"].map((field) => (
          <div key={field}>
            <input
              type="text"
              name={field}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={form[field]}
              onChange={handleChange}
              className={`input-field ${errors[field] ? "input-error" : ""} ${
                field === "ifscCode" ? "uppercase" : ""
              }`}
            />
            {errors[field] && <p className="error-text">{errors[field]}</p>}
          </div>
        ))}

        <div>
          <select
            name="accountType"
            value={form.accountType}
            onChange={handleChange}
            className={`input-field ${errors.accountType ? "input-error" : ""}`}
          >
            <option value="">Select Account Type</option>
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
            <option value="Business">Business</option>
          </select>
          {errors.accountType && <p className="error-text">{errors.accountType}</p>}
        </div>

        <div className="col-span-full bank-form-actions">
          <button type="submit" className="btn-primary">
            Save Bank
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBankPage;
