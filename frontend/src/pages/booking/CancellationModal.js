/* eslint-disable */
import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import CancellationPolicySection from "../../components/booking/CancellationPolicySection";
import "../../STYLES/CancellationModal.css";

export default function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Cancel Ticket",
  message = "Are you sure you want to cancel this ticket?",
  booking = null,
  bookingType = "",
  policyData = null,
  isLoadingPolicy = false,
  policyError = "",
}) {
  const [reason, setReason] = useState("Plan changed");
  const [refundPreference, setRefundPreference] = useState("Original");
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    setSelectedItems([]);
  }, [isOpen, booking]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason, refundPreference, selectedItems);
  };

  const bookingRef =
    booking?.bookingReference ||
    booking?.BookingReference ||
    booking?.bookingId ||
    booking?.BookingId ||
    booking?.pnr ||
    booking?.id ||
    "Selected Item";

  const hasSelectedCancellationItem = selectedItems.length > 0;

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
          <div className="cancel-modal-selection-wrap">
            <span className="cancel-modal-selection-label">
              Select item for cancellation:
            </span>
            {Array.isArray(booking?.passengers) && booking.passengers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {booking.passengers.map((p, idx) => {
                  const pId = p.id || `pax-${idx}`;
                  const isChecked = selectedItems.includes(pId);
                  return (
                    <label key={pId} className="cancel-modal-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, pId]);
                          } else {
                            setSelectedItems(selectedItems.filter((id) => id !== pId));
                          }
                        }}
                      />
                      <span>
                        {p.fullName || p.FullName || p.name || `Passenger ${idx + 1}`}
                        {p.seatNumber ? ` (Seat: ${p.seatNumber})` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <label className="cancel-modal-checkbox-label">
                <input
                  type="checkbox"
                  checked={hasSelectedCancellationItem}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([bookingRef]);
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
                <span>Select booking for cancellation ({bookingRef})</span>
              </label>
            )}
          </div>

          <CancellationPolicySection
            booking={booking}
            bookingType={bookingType}
            policyData={policyData}
            isLoading={isLoadingPolicy}
            error={policyError}
            selectedPassengerIds={selectedItems}
          />

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
          <label className="cancel-modal-label" style={{ marginTop: "12px" }}>
            <span>Refund To:</span>
            <select
              value={refundPreference}
              onChange={(e) => setRefundPreference(e.target.value)}
              className="cancel-modal-input"
              style={{ marginTop: "4px" }}
            >
              <option value="Original">Original Payment Method</option>
              <option value="Wallet">Pick&book Wallet</option>
            </select>
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
