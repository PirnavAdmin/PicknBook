import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarDropdown({
  selectedDate,
  minDate,
  onSelectDate,
  onClose,
}) {
  const dropdownRef = useRef(null);

  const initialDateObj = (() => {
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date();
  })();

  const [currentMonth, setCurrentMonth] = useState(initialDateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDateObj.getFullYear());

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const todayStr = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const effectiveMin = minDate || todayStr;

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleSelect = (day, e) => {
    e.stopPropagation();
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${mm}-${dd}`;
    if (dateStr < effectiveMin) return;
    onSelectDate?.(dateStr);
    onClose?.();
  };

  return (
    <div
      ref={dropdownRef}
      className="calendar-dropdown-popover"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 9999,
        background: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        padding: "16px",
        width: "290px",
        userSelect: "none",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#334155",
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#334155",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          textAlign: "center",
          marginBottom: "6px",
        }}
      >
        {WEEKDAYS.map((w, idx) => (
          <span
            key={idx}
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: idx === 0 || idx === 6 ? "#dc1e26" : "#94a3b8",
              textTransform: "uppercase",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} style={{ height: "32px" }} />;
          }

          const mm = String(currentMonth + 1).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const dateStr = `${currentYear}-${mm}-${dd}`;
          const isSelected = selectedDate === dateStr;
          const isDisabled = dateStr < effectiveMin;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={(e) => handleSelect(day, e)}
              style={{
                height: "32px",
                width: "100%",
                borderRadius: "8px",
                border: isSelected ? "none" : isToday ? "1px solid #dc1e26" : "none",
                background: isSelected
                  ? "#dc1e26"
                  : isToday
                  ? "#fef2f2"
                  : "transparent",
                color: isSelected
                  ? "#ffffff"
                  : isDisabled
                  ? "#cbd5e1"
                  : isToday
                  ? "#dc1e26"
                  : "#1e293b",
                fontWeight: isSelected || isToday ? 700 : 500,
                fontSize: "0.82rem",
                cursor: isDisabled ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
