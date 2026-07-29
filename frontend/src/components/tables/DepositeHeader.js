/* eslint-disable */
import React from "react";
import "../../STYLES/deposite.css";

const Header = ({ onFilter, onForm }) => {
  return (
    <div className="deposit-header">
      <div className="deposit-heading-block">
        <span className="deposit-section-kicker">Wallet and Funding</span>
        <h2 className="deposit-page-title">
          <span>Deposit</span> Request List
        </h2>
        <p className="deposit-page-subtitle">
          Track request history, review payment entries, and monitor approval status.
        </p>
      </div>
      <div className="deposit-header-actions">
        {onFilter && (
          <button onClick={onFilter} className="deposit-btn deposit-btn-secondary">
            Filter
          </button>
        )}
        {onForm && (
          <button onClick={onForm} className="deposit-btn deposit-btn-primary">
            Deposit Request
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
