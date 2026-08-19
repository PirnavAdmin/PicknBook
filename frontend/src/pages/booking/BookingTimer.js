/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertOctagon, RefreshCw } from "lucide-react";
import "../../STYLES/BookingTimer.css";

const SESSION_EXPIRY_KEY = "booking_session_expiry";

export function resetBookingSessionTimer() {
  if (typeof window !== "undefined" && window.sessionStorage) {
    const newTarget = String(Date.now() + 10 * 60 * 1000);
    sessionStorage.setItem(SESSION_EXPIRY_KEY, newTarget);
    return newTarget;
  }
  return null;
}

export default function BookingTimer({ hideBanner = false, mode = "banner" }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(600);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // 1. Check or set the target expiration timestamp
    let targetTime = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    const now = Date.now();

    // If no target time exists OR target timestamp is in the past (stale timer from previous session),
    // reset to a fresh 10-minute session for this booking attempt!
    if (!targetTime || Number(targetTime) <= now) {
      targetTime = resetBookingSessionTimer();
    }

    const targetTimestamp = Number(targetTime) || (now + 10 * 60 * 1000);

    // 2. Ticker logic
    const calculateTimeLeft = () => {
      const diff = Math.max(0, Math.round((targetTimestamp - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        setIsExpired(true);
      }
    };

    calculateTimeLeft(); // Initial calculation
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRestart = () => {
    resetBookingSessionTimer();
    setIsExpired(false);
    navigate("/");
  };

  if (isExpired) {
    return (
      <div className="booking-expiry-overlay">
        <div className="booking-expiry-card">
          <div className="booking-expiry-icon-wrapper">
            <AlertOctagon size={48} className="booking-expiry-icon" />
          </div>
          <h2>Booking Session Expired</h2>
          <p>
            Your session has expired due to inactivity. To ensure fare accuracy and seat/room availability, please restart your search process.
          </p>
          <button type="button" className="booking-expiry-restart-btn" onClick={handleRestart}>
            <RefreshCw size={16} />
            <span>Restart New Search</span>
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isUrgent = timeLeft < 120; // less than 2 minutes

  if (hideBanner && mode !== "compact") {
    return null;
  }

  if (mode === "compact") {
    return (
      <div className={`booking-timer-compact${isUrgent ? " is-urgent" : ""}`} style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.82rem",
        color: isUrgent ? "#b91c1c" : "#64748b",
        fontWeight: 600,
        background: isUrgent ? "rgba(220, 38, 38, 0.05)" : "rgba(0, 0, 0, 0.02)",
        padding: "4px 10px",
        borderRadius: "8px",
        border: isUrgent ? "1px solid rgba(220, 38, 38, 0.15)" : "1px solid rgba(0, 0, 0, 0.05)",
      }}>
        <Clock size={13} className={`booking-timer-clock${isUrgent ? " animate-pulse" : ""}`} style={{ color: isUrgent ? "#b91c1c" : "#dc1e26" }} />
        <span>
          {isUrgent ? "Complete booking in: " : "Complete your booking within: "}
          <strong className="booking-timer-val" style={{
            fontFamily: "monospace",
            fontSize: "0.88rem",
            background: "none",
            padding: 0,
            marginLeft: "2px"
          }}>{formattedTime}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className={`booking-timer-banner${isUrgent ? " is-urgent" : ""}`}>
      <div className="booking-timer-content">
        <Clock size={16} className={`booking-timer-clock${isUrgent ? " animate-pulse" : ""}`} />
        <span>
          {isUrgent ? (
            <strong>Time is running out! Complete booking in: </strong>
          ) : (
            "Complete your booking within: "
          )}
          <strong className="booking-timer-val">{formattedTime}</strong>
        </span>
      </div>
    </div>
  );
}
