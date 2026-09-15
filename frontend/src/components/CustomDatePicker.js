import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
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

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  isOpen,
  onClose,
  align = "left",
  title = "Select Date",
}) {
  // anchorRef stays in the normal DOM to measure position
  const anchorRef = useRef(null);
  // popupRef is the actual popup div rendered in portal
  const popupRef = useRef(null);

  const selectedDate = parseIso(value);
  const minDateObj = parseIso(minDate);
  const maxDateObj = parseIso(maxDate);

  const [viewDate, setViewDate] = useState(() => {
    return selectedDate || minDateObj || new Date();
  });

  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  // Sync view date when opening
  useEffect(() => {
    if (isOpen) {
      const syncDate = parseIso(value) || parseIso(minDate) || new Date();
      setViewDate(new Date(syncDate.getFullYear(), syncDate.getMonth(), 1));
    }
  }, [isOpen, value, minDate]);

  // Compute popup position from the anchor placeholder
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const POPUP_WIDTH = 260;

    const computePos = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let left = rect.left + scrollX;
      if (align === "right") {
        left = rect.right + scrollX - POPUP_WIDTH;
      }

      // Clamp horizontally inside viewport
      const maxLeft = window.innerWidth + scrollX - POPUP_WIDTH - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8 + scrollX) left = 8 + scrollX;

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

  // Outside click & escape to close
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
        if (event.key === "Escape") onClose?.();
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      // Store cleanup on the ref so we can remove even after unmount
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

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  const isDateDisabled = (year, month, day) => {
    const candidate = new Date(year, month, day, 23, 59, 59);
    if (minDateObj) {
      const minThreshold = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate(), 0, 0, 0);
      if (candidate < minThreshold) return true;
    }
    if (maxDateObj) {
      const maxThreshold = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate(), 23, 59, 59);
      if (candidate > maxThreshold) return true;
    }
    return false;
  };

  const isDateSelected = (year, month, day) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
  };

  const isDateToday = (year, month, day) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const handleSelectDay = (day) => {
    if (isDateDisabled(currentYear, currentMonth, day)) return;
    onChange?.(toIsoString(new Date(currentYear, currentMonth, day)));
    onClose?.();
  };

  const handleQuickPick = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const iso = toIsoString(target);
    if (minDate && iso < minDate) return;
    onChange?.(iso);
    onClose?.();
  };

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) daysArray.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) daysArray.push(d);

  const popup = isOpen ? (
    <div
      ref={popupRef}
      className="pnb-custom-datepicker-popup"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: popupPos.top,
        left: popupPos.left,
        zIndex: 2147483647,
        width: "260px",
        boxSizing: "border-box",
        background: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 16px 36px -4px rgba(220, 30, 38, 0.2), 0 8px 20px -4px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(220, 30, 38, 0.12)",
        padding: "10px 12px 8px",
        fontFamily: "inherit",
        userSelect: "none",
        color: "#0f172a",
        animation: "pnbFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes pnbFadeInScale {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pnb-dp-nav-btn {
          width: 24px; height: 24px; border-radius: 8px;
          border: 1px solid #fee2e2; background: #ffffff; color: #dc1e26;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease; padding: 0;
        }
        .pnb-dp-nav-btn:hover { background: #fef2f2; border-color: #fca5a5; transform: scale(1.05); }
        .pnb-dp-day-cell {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid transparent; background: transparent;
          font-size: 0.74rem; font-weight: 600; color: #1e293b;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s ease; margin: 0 auto;
          padding: 0; position: relative;
        }
        .pnb-dp-day-cell:hover:not(.disabled):not(.selected) { background: #fef2f2; color: #dc1e26; border-color: #fecaca; }
        .pnb-dp-day-cell.selected { background: linear-gradient(135deg,#ef4444 0%,#dc1e26 100%) !important; color:#fff !important; box-shadow: 0 4px 10px rgba(220,30,38,0.4) !important; border-color:#dc1e26 !important; font-weight:700 !important; }
        .pnb-dp-day-cell.today:not(.selected) { border-color: #dc1e26; color: #dc1e26; }
        .pnb-dp-day-cell.today:not(.selected)::after { content:""; position:absolute; bottom:3px; width:4px; height:4px; border-radius:50%; background:#dc1e26; }
        .pnb-dp-day-cell.disabled { color:#cbd5e1 !important; cursor:not-allowed !important; opacity:0.45; }
        .pnb-dp-quick-btn { border-radius:10px; border:1px solid #fee2e2; background:#fff5f5; color:#dc1e26; font-size:0.65rem; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:3px 8px; cursor:pointer; transition:all 0.2s ease; }
        .pnb-dp-quick-btn:hover { background:#dc1e26; color:#fff; border-color:#dc1e26; box-shadow:0 2px 6px rgba(220,30,38,0.25); }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", borderBottom:"1px solid #f1f5f9", paddingBottom:"6px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <CalendarIcon size={13} style={{ color:"#dc1e26" }} />
          <span style={{ fontSize:"0.68rem", fontWeight:800, color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.06em" }}>{title}</span>
        </div>
        <button type="button" onClick={onClose} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", padding:"2px", display:"flex", alignItems:"center", borderRadius:"6px" }} aria-label="Close calendar">
          <X size={16} />
        </button>
      </div>

      {/* Month Navigation */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", padding:"0 2px" }}>
        <button type="button" className="pnb-dp-nav-btn" onClick={prevMonth} aria-label="Previous Month"><ChevronLeft size={16} /></button>
        <span style={{ fontSize:"0.8rem", fontWeight:800, color:"#0f172a" }}>{MONTH_NAMES[currentMonth]} {currentYear}</span>
        <button type="button" className="pnb-dp-nav-btn" onClick={nextMonth} aria-label="Next Month"><ChevronRight size={16} /></button>
      </div>

      {/* Weekday Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", textAlign:"center", marginBottom:"4px" }}>
        {WEEKDAYS.map((wd) => (
          <span key={wd} style={{ fontSize:"0.62rem", fontWeight:800, color: wd==="Su"||wd==="Sa" ? "#dc1e26" : "#64748b", textTransform:"uppercase", letterSpacing:"0.04em", padding:"1px 0" }}>{wd}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", rowGap:"2px", marginBottom:"8px" }}>
        {daysArray.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} style={{ width:"28px", height:"28px" }} />;
          const disabled = isDateDisabled(currentYear, currentMonth, day);
          const selected = isDateSelected(currentYear, currentMonth, day);
          const today = isDateToday(currentYear, currentMonth, day);
          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`pnb-dp-day-cell${disabled?" disabled":""}${selected?" selected":""}${today?" today":""}`}
              disabled={disabled}
              onClick={() => handleSelectDay(day)}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Quick Footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:"6px", borderTop:"1px solid #f1f5f9" }}>
        <div style={{ display:"flex", gap:"6px" }}>
          <button type="button" className="pnb-dp-quick-btn" onClick={() => handleQuickPick(0)}>Today</button>
          <button type="button" className="pnb-dp-quick-btn" onClick={() => handleQuickPick(1)}>Tomorrow</button>
        </div>
        <button type="button" onClick={onClose} style={{ background:"transparent", border:"none", color:"#64748b", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", padding:"4px 6px" }}>Cancel</button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Invisible anchor div that stays in the normal DOM tree so we can measure position */}
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
      {/* Portal the actual popup to document.body */}
      {ReactDOM.createPortal(popup, document.body)}
    </>
  );
}
