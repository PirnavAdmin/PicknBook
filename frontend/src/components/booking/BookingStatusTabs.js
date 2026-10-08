import React from "react";
import { bookingStatusOptions } from "../../utils/bookingStatus";
import "../../STYLES/BookingStatusTabs.css";

export default function BookingStatusTabs({ value, onChange, className = "" }) {
  return <div className={`booking-status-tabs${className ? ` ${className}` : ""}`} role="group" aria-label="Booking status">
    {bookingStatusOptions.map((status) => <button key={status} type="button" aria-pressed={value === status} onClick={() => onChange(status)}>{status}</button>)}
  </div>;
}
