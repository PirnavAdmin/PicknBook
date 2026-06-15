import React, { useState } from "react";
import "../../STYLES/deposite.css";

const DepositForm = ({ onSubmit, onBack }) => {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [remark, setRemark] = useState("");
  const [adminRemark, setAdminRemark] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!amount) nextErrors.amount = "Required";
    if (!type) nextErrors.type = "Required";
    if (!status) nextErrors.status = "Required";
    if (!entryDate) nextErrors.entryDate = "Required";
    if (!transactionDate) nextErrors.transactionDate = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ amount, type, status, entryDate, transactionDate, remark, adminRemark });
  };

  return (
    <div className="deposit-card deposit-form-shell">
      <div className="deposit-header">
        <div className="deposit-heading-block">
          <span className="deposit-section-kicker">Wallet and Funding</span>
          <h2 className="deposit-page-title">
            <span>Deposit</span> Request Form
          </h2>
          <p className="deposit-page-subtitle">
            Submit a new deposit entry with amount, transfer type, and remarks.
          </p>
        </div>
        <button type="button" onClick={onBack} className="deposit-btn deposit-btn-secondary">
          Deposit List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="deposit-grid-3">
        <div className="deposit-form-group">
          <label className="deposit-label">
            Amount <span className="deposit-required">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="deposit-input"
            placeholder="Enter Amount"
          />
          {errors.amount && <p className="deposit-error deposit-error-inline">{errors.amount}</p>}
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">
            Type <span className="deposit-required">*</span>
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="deposit-input">
            <option value="">Select Type</option>
            <option>UPI Transfer</option>
            <option>Bank Transfer</option>
          </select>
          {errors.type && <p className="deposit-error deposit-error-inline">{errors.type}</p>}
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">
            Status <span className="deposit-required">*</span>
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="deposit-input">
            <option value="">Select Status</option>
            <option>Approved</option>
            <option>Pending</option>
          </select>
          {errors.status && <p className="deposit-error deposit-error-inline">{errors.status}</p>}
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">
            Entry Date <span className="deposit-required">*</span>
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="deposit-input"
          />
          {errors.entryDate && <p className="deposit-error deposit-error-inline">{errors.entryDate}</p>}
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">
            Transaction Date <span className="deposit-required">*</span>
          </label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="deposit-input"
          />
          {errors.transactionDate && <p className="deposit-error deposit-error-inline">{errors.transactionDate}</p>}
        </div>

        <div className="deposit-col-span-2">
          <label className="deposit-label">Your Remark</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="deposit-input"
            rows="3"
          />
        </div>

        <div className="deposit-col-span-2">
          <label className="deposit-label">Admin Remark</label>
          <textarea
            value={adminRemark}
            onChange={(e) => setAdminRemark(e.target.value)}
            className="deposit-input"
            rows="3"
          />
        </div>

        <div className="deposit-col-span-3 deposit-btn-group">
          <button type="submit" className="deposit-btn deposit-btn-primary">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepositForm;
