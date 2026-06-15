import React, { useState } from "react";
import "../../STYLES/deposite.css";

const FilterPanel = ({
  fromDate,
  toDate,
  transactionDate,
  setFromDate,
  setToDate,
  setTransactionDate,
  onSearch,
}) => {
  const [error, setError] = useState("");

  const handleSearchClick = () => {
    setError("");

    if (!fromDate && !toDate && !transactionDate) {
      setError("Please select at least one date.");
      return;
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      setError("From Date cannot be greater than To Date.");
      return;
    }

    onSearch();
  };

  return (
    <div className="deposit-card">
      <div className="deposit-filter-badge">Search By Details</div>

      <div className="deposit-grid-3 deposit-filter-grid">
        <div className="deposit-form-group">
          <label className="deposit-label">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="deposit-input"
          />
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="deposit-input"
          />
        </div>

        <div className="deposit-form-group">
          <label className="deposit-label">Transaction Date</label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="deposit-input"
          />
        </div>
      </div>

      {error && <p className="deposit-error">{error}</p>}

      <div className="deposit-btn-group">
        <button onClick={handleSearchClick} className="deposit-btn deposit-btn-primary">
          Search
        </button>
        <button
          onClick={() => {
            setFromDate("");
            setToDate("");
            setTransactionDate("");
            setError("");
            onSearch(true);
          }}
          className="deposit-btn deposit-btn-muted"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
