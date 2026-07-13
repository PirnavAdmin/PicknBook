import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import "../../STYLES/CancellationModal.css";

export default function CancellationModal({ isOpen, onClose, onConfirm, title = "Cancel Ticket", message = "Are you sure you want to cancel this ticket?" }) {
  const [reason, setReason] = useState("Plan changed");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason);
  };

  return (
    <div className="cancel-modal-overlay">
      <div className="cancel-modal-card">
        <button type="button" className="cancel-modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="cancel-modal-header">
          <div className="cancel-modal-icon-wrapper">
            <AlertTriangle size={24} className="cancel-modal-icon" />
          </div>
          <h3>{title}</h3>
        </div>
        <form onSubmit={handleSubmit} className="cancel-modal-body">
          <p className="cancel-modal-message">{message}</p>
          <label className="cancel-modal-label">
            <span>Reason for cancellation:</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Change of plans"
              required
              className="cancel-modal-input"
            />
          </label>
          <div className="cancel-modal-actions">
            <button type="button" className="cancel-btn-secondary" onClick={onClose}>
              Go back
            </button>
            <button type="submit" className="cancel-btn-primary">
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
