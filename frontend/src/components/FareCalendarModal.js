import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Calendar, Loader2, Sparkles, Plane, Tag } from "lucide-react";
import { getCalendarFare } from "../services/flightBookingService";
import "../STYLES/FareCalendarModal.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function FareCalendarModal({
  isOpen,
  onClose,
  onSelectDate,
  from = "DEL",
  to = "BOM",
  initialDate = "",
  travelClass = "Economy",
  adults = 1,
  children = 0,
  infants = 0,
}) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });

  const [directFlightOnly, setDirectFlightOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const formattedMonthLabel = useMemo(() => {
    return currentMonthDate.toLocaleString("default", { month: "long", year: "numeric" });
  }, [currentMonthDate]);

  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    async function fetchMonthFares() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const yyyy = currentMonthDate.getFullYear();
        const mm = String(currentMonthDate.getMonth() + 1).padStart(2, "0");
        const sampleDate = `${yyyy}-${mm}-01`;

        const res = await getCalendarFare({
          from,
          to,
          date: sampleDate,
          travelClass,
          adults,
          children,
          infants,
          directFlight: directFlightOnly,
          journeyType: 1,
        });

        if (isCurrent) {
          if (res?.error) {
            setErrorMessage(res.error);
          } else {
            setCalendarData(res);
          }
        }
      } catch (err) {
        if (isCurrent) {
          setErrorMessage(err?.message || "Failed to load low fare calendar.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchMonthFares();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, currentMonthDate, from, to, travelClass, adults, children, infants, directFlightOnly]);

  if (!isOpen) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const fareMap = calendarData?.fareMapByDate || {};
  const resultsList = calendarData?.results || [];

  const lowestFareOverall = Math.min(
    ...Object.values(fareMap).filter((v) => typeof v === "number" && v > 0),
    Infinity
  );

  return (
    <div className="fare-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fare-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="fare-modal-header">
          <div className="fare-modal-title">
            <h2>Select Date</h2>
            <p>
              {from} ➔ {to} | {travelClass}
            </p>
          </div>
          <button type="button" className="fare-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>

        <div className="fare-modal-controls">
          <div className="month-navigator">
            <button type="button" className="nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft size={20} />
            </button>
            <span className="month-display">{formattedMonthLabel}</span>
            <button type="button" className="nav-btn" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight size={20} />
            </button>
          </div>

          <label className="direct-flight-toggle">
            <input
              type="checkbox"
              checked={directFlightOnly}
              onChange={(e) => setDirectFlightOnly(e.target.checked)}
            />
            <span>Direct Flights Only</span>
          </label>
        </div>

        {errorMessage && (
          <div className="fare-modal-error">
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="fare-modal-loading">
            <Loader2 className="spinner-icon" size={32} />
            <p>Fetching live fares from airlines...</p>
          </div>
        ) : (
          <div className="calendar-grid-container">
            <div className="weekdays-row">
              {WEEKDAYS.map((day) => (
                <div key={day} className="weekday-cell">
                  {day}
                </div>
              ))}
            </div>

            <div className="days-grid">
              {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="day-cell empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const mmStr = String(month + 1).padStart(2, "0");
                const ddStr = String(dayNum).padStart(2, "0");
                const dateKey = `${year}-${mmStr}-${ddStr}`;

                const fareValue = fareMap[dateKey];
                const dayResult = resultsList.find((r) => r.dateOnly === dateKey);
                
                const today = new Date();
                const cellDate = new Date(year, month, dayNum);
                const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <button
                    type="button"
                    key={dateKey}
                    disabled={isPast}
                    className={`day-cell ${isPast ? "past" : "active"}`}
                    onClick={() => {
                      if (onSelectDate) {
                        onSelectDate(dateKey);
                      }
                      onClose();
                    }}
                  >
                    <span className="day-number">{dayNum}</span>
                    {fareValue ? (
                      <span className="fare-amount">
                        ₹{new Intl.NumberFormat("en-IN").format(fareValue)}
                      </span>
                    ) : (
                      <span className="fare-amount placeholder">--</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <footer className="fare-modal-footer">
          <div className="legend-items"></div>
          <button type="button" className="fare-close-btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
