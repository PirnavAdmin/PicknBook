/* eslint-disable */
import React from "react";
import "../../STYLES/bank.css";

export default function BankListStatic() {
  return (
    <div className="bank-page">
      <div className="white-card">
        <div className="flex-between bank-header-row">
          <div>
            <h2 className="page-title">Bank Details</h2>
            <div className="title-underline"></div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="bank-table">
            <thead className="table-header">
              <tr>
                <th>Sr</th>
                <th>Bank Name</th>
                <th>A/c Holder Name</th>  
                <th>Account Number</th>
                <th>Branch Name</th>
                <th>IFSC Code</th>
                <th>SWIFT Code</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="7" className="table-cell table-empty">
                  Bank Detail not found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
