import React from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Shared Flight Booking Stepper Header with Back navigation option
 *
 * Stages:
 * 1: Flight Selection
 * 2: Review & Traveller Details
 * 3: Add-ons
 * 4: Payment
 */
export default function FlightStepperHeader({
  currentStage = 2,
  onBack = null,
  className = "",
  compact = false,
}) {
  const showBack = currentStage > 1 && typeof onBack === "function";

  return (
    <div
      className={`flight-stepper-header ${compact ? "flight-stepper-header--compact" : ""} ${
        showBack ? "has-back-btn" : ""
      } ${className}`.trim()}
    >
      <div className="flight-stepper-stages">
        {/* Stage 1: Flight Selection */}
        <div
          className={`step-item ${
            currentStage > 1 ? "completed" : currentStage === 1 ? "active" : ""
          }`}
        >
          <span className="step-circle">{currentStage > 1 ? "✓" : "1"}</span>
          <span>Flight Selection</span>
        </div>
        <div className={`step-line ${currentStage > 1 ? "completed" : ""}`}></div>

        {/* Stage 2: Review & Traveller Details */}
        <div
          className={`step-item ${
            currentStage > 2 ? "completed" : currentStage === 2 ? "active" : ""
          }`}
        >
          <span className="step-circle">{currentStage > 2 ? "✓" : "2"}</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className={`step-line ${currentStage > 2 ? "completed" : ""}`}></div>

        {/* Stage 3: Add-ons */}
        <div
          className={`step-item ${
            currentStage > 3 ? "completed" : currentStage === 3 ? "active" : ""
          }`}
        >
          <span className="step-circle">{currentStage > 3 ? "✓" : "3"}</span>
          <span>Add-ons</span>
        </div>
        <div className={`step-line ${currentStage > 3 ? "completed" : ""}`}></div>

        {/* Stage 4: Payment */}
        <div className={`step-item ${currentStage === 4 ? "active" : ""}`}>
          <span className="step-circle">4</span>
          <span>Payment</span>
        </div>
      </div>

      {showBack ? (
        <button
          type="button"
          className="stepper-back-btn"
          onClick={onBack}
          aria-label="Go back to previous stage"
        >
          <ArrowLeft size={16} className="stepper-back-icon" />
          <span>Back</span>
        </button>
      ) : null}
    </div>
  );
}
