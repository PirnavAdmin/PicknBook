import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";
import "../STYLES/HotelDatePicker.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseIso(isoStr) {
  if (!isoStr) return null;
  const parts = String(isoStr).split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  const fallback = new Date(isoStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toIsoString(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function HotelDatePicker({
  isOpen,
  onClose,
  value,
  onChange,
  onSelect,
  minDate,
  maxDate,
  title = "Select Date",
  align = "left",
  mode = "checkin", // "checkin" | "checkout"
  checkInDate = null,
}) {
  const anchorRef = useRef(null);
  const popupRef = useRef(null);

  const selectedDateObj = useMemo(() => parseIso(value), [value]);

  // Compute minimum selectable date (strictly next-day for checkout)
  const minDateObj = useMemo(() => {
    if (mode === "checkout" && checkInDate) {
      const cin = parseIso(checkInDate);
      if (cin) {
        const nextDay = new Date(cin.getFullYear(), cin.getMonth(), cin.getDate() + 1);
        if (minDate) {
          const customMin = parseIso(minDate);
          return customMin && customMin > nextDay ? customMin : nextDay;
        }
        return nextDay;
      }
    }
    if (minDate) {
      return parseIso(minDate);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, [mode, checkInDate, minDate]);

  const maxDateObj = useMemo(() => (maxDate ? parseIso(maxDate) : null), [maxDate]);

  const [viewDate, setViewDate] = useState(() => {
    return selectedDateObj || minDateObj || new Date();
  });

  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  // Sync view month when calendar opens
  useEffect(() => {
    if (isOpen) {
      const target = selectedDateObj || minDateObj || new Date();
      setViewDate(new Date(target.getFullYear(), target.getMonth(), 1));
    }
  }, [isOpen, selectedDateObj, minDateObj]);

  // Stay duration calculation for checkout mode
  const stayNights = useMemo(() => {
    if (mode === "checkout" && checkInDate && value) {
      const cin = parseIso(checkInDate);
      const cout = parseIso(value);
      if (cin && cout) {
        const diffDays = Math.ceil((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
      }
    }
    return null;
  }, [mode, checkInDate, value]);

  // Outside click & Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      function handleClickOutside(event) {
        const clickedPopup = popupRef.current && popupRef.current.contains(event.target);
        const clickedAnchor = anchorRef.current && anchorRef.current.contains(event.target);
        if (!clickedPopup && !clickedAnchor) {
          onClose?.();
        }
      }
      function handleKeyDown(event) {
        if (event.key === "Escape") {
          onClose?.();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);

      anchorRef._cleanup = () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, 10);

    return () => {
      clearTimeout(timer);
      anchorRef._cleanup?.();
    };
  }, [isOpen, onClose]);

  // Compute popup position relative to anchor
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const POPUP_WIDTH = 290;

    const computePos = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let left = rect.left + scrollX;
      if (align === "right") {
        left = rect.right + scrollX - POPUP_WIDTH;
      }

      // Viewport horizontal clamping
      const maxLeft = window.innerWidth + scrollX - POPUP_WIDTH - 12;
      if (left > maxLeft) left = maxLeft;
      if (left < 10 + scrollX) left = 10 + scrollX;

      setPopupPos({
        top: rect.bottom + scrollY + 6,
        left,
      });
    };

    computePos();
    window.addEventListener("resize", computePos);
    window.addEventListener("scroll", computePos, true);

    return () => {
      window.removeEventListener("resize", computePos);
      window.removeEventListener("scroll", computePos, true);
    };
  }, [isOpen, align]);

  if (!isOpen) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const isPrevMonthDisabled = (() => {
    if (!minDateObj) return false;
    const minYear = minDateObj.getFullYear();
    const minMonth = minDateObj.getMonth();
    return currentYear < minYear || (currentYear === minYear && currentMonth <= minMonth);
  })();

  const prevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const isDateDisabled = (y, m, d) => {
    const candidate = new Date(y, m, d);
    if (minDateObj) {
      const minMidnight = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate());
      if (candidate < minMidnight) return true;
    }
    if (maxDateObj) {
      const maxMidnight = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate());
      if (candidate > maxMidnight) return true;
    }
    return false;
  };

  const isDateSelected = (y, m, d) => {
    if (!selectedDateObj) return false;
    return (
      selectedDateObj.getFullYear() === y &&
      selectedDateObj.getMonth() === m &&
      selectedDateObj.getDate() === d
    );
  };

  const isDateToday = (y, m, d) => {
    const today = new Date();
    return (
      today.getFullYear() === y &&
      today.getMonth() === m &&
      today.getDate() === d
    );
  };

  const handleSelectDay = (day) => {
    const selected = new Date(currentYear, currentMonth, day);
    const iso = toIsoString(selected);
    onChange?.(iso);
    onSelect?.(iso);
    onClose?.();
  };

  const handleQuickPick = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const iso = toIsoString(target);
    onChange?.(iso);
    onSelect?.(iso);
    onClose?.();
  };

  const todayDateObj = new Date();
  const todayMidnight = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), todayDateObj.getDate());
  const tomorrowMidnight = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), todayDateObj.getDate() + 1);

  const isTodayQuickDisabled = minDateObj && todayMidnight < minDateObj;
  const isTomorrowQuickDisabled = minDateObj && tomorrowMidnight < minDateObj;

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDaysInMonth; i++) {
    daysArray.push(i);
  }

  const popup = (
    <div
      ref={popupRef}
      className="pnb-hotel-dp-popup"
      style={{
        top: `${popupPos.top}px`,
        left: `${popupPos.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Bar: Title & Optional Duration & Close */}
      <div className="pnb-hotel-dp-topbar">
        <div className="pnb-hotel-dp-title-wrap">
          <CalendarIcon size={14} className="pnb-hotel-dp-icon" />
          <span className="pnb-hotel-dp-title">{title}</span>
          {stayNights !== null && (
            <span className="pnb-hotel-dp-nights-pill">
              {stayNights} {stayNights === 1 ? "Night" : "Nights"}
            </span>
          )}
        </div>
        <button
          type="button"
          className="pnb-hotel-dp-close-btn"
          onClick={onClose}
          aria-label="Close hotel calendar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Month & Year Navigation */}
      <div className="pnb-hotel-dp-nav">
        <button
          type="button"
          className="pnb-hotel-dp-nav-btn"
          onClick={prevMonth}
          disabled={isPrevMonthDisabled}
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="pnb-hotel-dp-heading">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          className="pnb-hotel-dp-nav-btn"
          onClick={nextMonth}
          aria-label="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday Row */}
      <div className="pnb-hotel-dp-weekdays">
        {WEEKDAYS.map((wd) => (
          <span
            key={wd}
            className={`pnb-hotel-dp-weekday${wd === "Sun" ? " weekend" : ""}`}
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Date Grid */}
      <div className="pnb-hotel-dp-grid">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="pnb-hotel-dp-empty-cell" />;
          }

          const disabled = isDateDisabled(currentYear, currentMonth, day);
          const selected = isDateSelected(currentYear, currentMonth, day);
          const today = isDateToday(currentYear, currentMonth, day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`pnb-hotel-dp-day-cell${selected ? " selected" : ""}${today ? " today" : ""}`}
              disabled={disabled}
              onClick={() => handleSelectDay(day)}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Quick Footer */}
      <div className="pnb-hotel-dp-footer">
        <div className="pnb-hotel-dp-quick-wrap">
          <button
            type="button"
            className="pnb-hotel-dp-quick-btn"
            onClick={() => handleQuickPick(0)}
            disabled={isTodayQuickDisabled}
          >
            Today
          </button>
          <button
            type="button"
            className="pnb-hotel-dp-quick-btn"
            onClick={() => handleQuickPick(1)}
            disabled={isTomorrowQuickDisabled}
          >
            Tomorrow
          </button>
        </div>
        <button
          type="button"
          className="pnb-hotel-dp-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={anchorRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {ReactDOM.createPortal(popup, document.body)}
    </>
  );
}
