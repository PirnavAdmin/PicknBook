import React from "react";
import { ArrowLeft, Check } from "lucide-react";
import "../../STYLES/FlightBookingFlow.css";

/**
 * Shared Flight Booking Stepper Header with Back navigation option
 *
 * Stages:
 * 1: Flight Selection
 * 2: Review & Traveller Details
 * 3: Add-ons
 * 4: Payment
 */
const STAGES = [
  { id: 1, label: "Flight Selection" },
  { id: 2, label: "Review & Traveller Details" },
  { id: 3, label: "Add-ons" },
  { id: 4, label: "Payment" },
];

export default function FlightStepperHeader({
  currentStage = 1,
  onBack = null,
  className = "",
  compact = false,
  showBackButton = undefined,
}) {
  const showBack =
    showBackButton !== undefined
      ? Boolean(showBackButton) && typeof onBack === "function"
      : currentStage > 1 && currentStage < 4 && typeof onBack === "function";

  return (
    <div
      className={`flight-stepper-header ${compact ? "flight-stepper-header--compact" : ""} ${
        showBack ? "has-back-btn" : ""
      } ${className}`.trim()}
    >
      <div className="flight-stepper-stages">
        {STAGES.map((stage, idx) => {
          const isCompleted = currentStage > stage.id;
          const isActive = currentStage === stage.id;
          const statusClass = isCompleted ? "completed" : isActive ? "active" : "upcoming";

          return (
            <React.Fragment key={stage.id}>
              <div className={`step-item ${statusClass}`}>
                <span className="step-circle">
                  {isCompleted ? (
                    <Check size={13} strokeWidth={3} className="step-check-icon" />
                  ) : (
                    stage.id
                  )}
                </span>
                <span className="step-label">{stage.label}</span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`step-line ${currentStage > stage.id ? "completed" : ""}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {showBack ? (
        <button
          type="button"
          className="stepper-back-btn"
          onClick={onBack}
          aria-label="Go back to previous stage"
        >
          <ArrowLeft size={15} className="stepper-back-icon" />
          <span>Back</span>
        </button>
      ) : null}
    </div>
  );
}
