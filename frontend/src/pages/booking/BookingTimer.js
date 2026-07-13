import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertOctagon, RefreshCw } from "lucide-react";
import "../../STYLES/BookingTimer.css";

const SESSION_EXPIRY_KEY = "booking_session_expiry";

export default function BookingTimer() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(600);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // 1. Check or set the target expiration timestamp
    let targetTime = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    if (!targetTime) {
      const newTarget = String(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      sessionStorage.setItem(SESSION_EXPIRY_KEY, newTarget);
      targetTime = newTarget;
    }

    const targetTimestamp = Number(targetTime);

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
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
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
