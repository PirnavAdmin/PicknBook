/* eslint-disable */
import React, { useState } from "react";
import "../../STYLES/deposite.css";

const DepositTable = ({ data, onDelete, onUpdateRow }) => {
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewData, setViewData] = useState(null);

  const handleSave = () => {
    onUpdateRow(editId, editData);
    setEditId(null);
  };

  return (
    <div className="deposit-card deposit-table-card">
      <div className="deposit-table-wrap">
        <table className="deposit-table">
          <thead className="deposit-table-head">
            <tr>
              <th>SR.</th>
              <th>AMOUNT</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>USER REMARK</th>
              <th>ADMIN REMARK</th>
              <th>ENTRY DATE</th>
              <th>TRNS. DATE</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="9" className="deposit-cell deposit-empty">
                  No Data Found
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="deposit-row">
                  <td className="deposit-cell deposit-cell-sr">{index + 1}</td>
                  <td className="deposit-cell">
                    {editId === item.id ? (
                      <input
                        name="amount"
                        value={editData.amount}
                        onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                        className="deposit-input"
                      />
                    ) : (
                      <span className="deposit-amount">INR {item.amount}</span>
                    )}
                  </td>
                  <td className="deposit-cell">{item.type}</td>
                  <td className="deposit-cell">{item.status}</td>
                  <td className="deposit-cell">{item.userRemark}</td>
                  <td className="deposit-cell">{item.adminRemark}</td>
                  <td className="deposit-cell">{item.entryDate}</td>
                  <td className="deposit-cell">{item.transactionDate}</td>
                  <td className="deposit-cell">
                    <div className="deposit-action-group">
                      {editId !== item.id ? (
                        <>
                          <button onClick={() => setViewData(item)} className="deposit-btn-action" title="View">
                            View
                          </button>
                          <button
                            onClick={() => {
                              setEditId(item.id);
                              setEditData(item);
                            }}
                            className="deposit-btn-action"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="deposit-btn-action"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={handleSave} className="deposit-icon-btn deposit-icon-green" title="Save">
                            Save
                          </button>
                          <button onClick={() => setEditId(null)} className="deposit-icon-btn" title="Cancel">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewData && (
        <div className="deposit-modal-overlay">
          <div className="deposit-modal-content">
            <h3>Deposit Details</h3>
            <div className="deposit-modal-info">
              <p>
                <b>Amount:</b> INR {viewData.amount}
              </p>
              <p>
                <b>Type:</b> {viewData.type}
              </p>
              <p>
                <b>Status:</b> {viewData.status}
              </p>
              <p>
                <b>Remark:</b> {viewData.userRemark}
              </p>
            </div>
            <div className="deposit-btn-group">
              <button onClick={() => setViewData(null)} className="deposit-btn deposit-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositTable;
