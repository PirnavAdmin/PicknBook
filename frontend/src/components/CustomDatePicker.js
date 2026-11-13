import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Loader2, Plane } from "lucide-react";
import { getCalendarFare, resolveAirportCode } from "../services/flightBookingService";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Tier 2 / Regional airports list for Regional indicator
const REGIONAL_AIRPORTS = new Set([
  "VGA", "RJA", "TIR", "IXE", "IXB", "DED", "HBX", "IXR", "IXU", "GWL", "BHO",
  "JLR", "KUU", "DHM", "SHL", "AJL", "TEZ", "DMU", "IXS", "IMF", "IXA", "COH",
  "IXH", "IXV", "RUP", "IXP", "CDH", "PGH", "TCR", "ZER", "BEK", "BUP", "NMB", "HSS", "BDQ"
]);

// Shared in-memory cache across date picker instances to avoid duplicate API requests
const fareCache = new Map();

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

function isIndianFestivalDate(m, d) {
  // m is 1-12, d is 1-31
  if (m === 1 && ((d >= 13 && d <= 17) || d === 26)) return true; // Makar Sankranti / Pongal / Republic Day
  if (m === 3 && d >= 13 && d <= 17) return true; // Holi / Maha Shivratri
  if (m === 4 && d >= 10 && d <= 15) return true; // Eid / Baisakhi / Ambedkar Jayanti / Tamil New Year
  if (m === 8 && ((d >= 14 && d <= 17) || (d >= 25 && d <= 29))) return true; // Independence Day / Raksha Bandhan
  if (m === 9 && d >= 5 && d <= 10) return true; // Ganesh Chaturthi
  if (m === 10 && ((d >= 8 && d <= 14) || (d >= 28 && d <= 31))) return true; // Dussehra / Diwali start
  if (m === 11 && d >= 1 && d <= 6) return true; // Diwali / Bhai Dooj / Chhath Puja
  if (m === 12 && ((d >= 23 && d <= 26) || d >= 30)) return true; // Christmas / New Year
  return false;
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
  from = "",
  to = "",
  travelClass = "Economy",
  adults = 1,
  children = 0,
  infants = 0,
  isFlight = true,
}) {
  const anchorRef = useRef(null);
  const popupRef = useRef(null);

  const selectedDate = parseIso(value);
  const minDateObj = minDate ? parseIso(minDate) : parseIso(toIsoString(new Date()));
  const maxDateObj = parseIso(maxDate);

  const [viewDate, setViewDate] = useState(() => {
    return selectedDate || minDateObj || new Date();
  });

  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [faresMap, setFaresMap] = useState({});
  const [isLoadingFares, setIsLoadingFares] = useState(false);

  // Extract airport codes
  const fromCode = useMemo(() => resolveAirportCode(from) || "", [from]);
  const toCode = useMemo(() => resolveAirportCode(to) || "", [to]);
  const hasFlightRoute = Boolean(isFlight !== false && fromCode && toCode);

  // Sync view date when opening
  useEffect(() => {
    if (isOpen) {
      const syncDate = parseIso(value) || parseIso(minDate) || new Date();
      setViewDate(new Date(syncDate.getFullYear(), syncDate.getMonth(), 1));
    }
  }, [isOpen, value, minDate]);

  // Fetch dynamic calendar fares when month, route, or class changes
  useEffect(() => {
    if (!isOpen || !hasFlightRoute) {
      setFaresMap({});
      setIsLoadingFares(false);
      return;
    }

    const yyyy = viewDate.getFullYear();
    const mm = String(viewDate.getMonth() + 1).padStart(2, "0");
    const monthKey = `${yyyy}-${mm}`;
    const cacheKey = `${fromCode}_${toCode}_${monthKey}_${travelClass || "Economy"}`;

    if (fareCache.has(cacheKey)) {
      setFaresMap(fareCache.get(cacheKey));
      setIsLoadingFares(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingFares(true);

    getCalendarFare({
      from: fromCode,
      to: toCode,
      month: monthKey,
      travelClass: travelClass || "Economy",
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
      journeyType: 1,
    })
      .then((res) => {
        if (!isCurrent) return;
        const map = res?.fareMapByDate || {};
        fareCache.set(cacheKey, map);
        setFaresMap(map);
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn("[CustomDatePicker] Could not fetch fares:", err);
        setFaresMap({});
      })
      .finally(() => {
        if (isCurrent) setIsLoadingFares(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isOpen, hasFlightRoute, fromCode, toCode, viewDate, travelClass, adults, children, infants]);

  // Compute popup position from the anchor placeholder
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const POPUP_WIDTH = hasFlightRoute ? 365 : 280;

    const computePos = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let left = rect.left + scrollX;
      if (align === "right") {
        left = rect.right + scrollX - POPUP_WIDTH;
      }

      // Clamp horizontally inside viewport
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
  }, [isOpen, align, hasFlightRoute]);

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

  // Determine min and max fares for the month
  const { lowestFare, highestFare } = useMemo(() => {
    if (!faresMap || Object.keys(faresMap).length === 0) {
      return { lowestFare: null, highestFare: null };
    }
    const values = Object.values(faresMap)
      .map((item) => (typeof item === "object" ? Number(item?.totalFare) : Number(item)))
      .filter((v) => !isNaN(v) && v > 0);

    if (values.length === 0) return { lowestFare: null, highestFare: null };
    return {
      lowestFare: Math.min(...values),
      highestFare: Math.max(...values),
    };
  }, [faresMap]);

  // Categorize a date's fare into Backoffice categories
  const getDayFareDetails = (year, month, day) => {
    if (!hasFlightRoute) return null;
    const mmStr = String(month + 1).padStart(2, "0");
    const ddStr = String(day).padStart(2, "0");
    const dateKey = `${year}-${mmStr}-${ddStr}`;
    const fareItem = faresMap[dateKey];
    if (!fareItem) return null;

    const fareVal = typeof fareItem === "object" ? Number(fareItem.totalFare) : Number(fareItem);
    if (isNaN(fareVal) || fareVal <= 0) return null;

    const isLowest =
      fareItem?.isLowestFareOfMonth === true ||
      (lowestFare !== null && fareVal === lowestFare) ||
      (lowestFare !== null && fareVal <= lowestFare * 1.05);

    if (isLowest) {
      return {
        fareVal,
        key: "low",
        label: "Low Fare",
        color: "#10b981", // Green
      };
    }

    const m = month + 1;
    if (isIndianFestivalDate(m, day)) {
      return {
        fareVal,
        key: "festival",
        label: "Festival",
        color: "#f59e0b", // Amber/Orange
      };
    }

    const dayOfWeek = new Date(year, month, day).getDay();
    const isLongWeekend = dayOfWeek === 5 || dayOfWeek === 1;
    if (isLongWeekend) {
      return {
        fareVal,
        key: "weekend",
        label: "Long Weekend",
        color: "#eab308", // Yellow / Gold
      };
    }

    const isHigh =
      highestFare !== null &&
      lowestFare !== null &&
      (fareVal >= lowestFare * 1.35 || fareVal >= highestFare * 0.9);

    if (isHigh) {
      return {
        fareVal,
        key: "high",
        label: "High Fare",
        color: "#ef4444", // Red
      };
    }

    const isRegional = REGIONAL_AIRPORTS.has(fromCode) || REGIONAL_AIRPORTS.has(toCode);
    if (isRegional) {
      return {
        fareVal,
        key: "regional",
        label: "Regional",
        color: "#8b5cf6", // Purple
      };
    }

    return {
      fareVal,
      key: "normal",
      label: "Normal Fare",
      color: "#3b82f6", // Blue
    };
  };

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

  const isPrevMonthDisabled = minDateObj && (
    currentYear < minDateObj.getFullYear() ||
    (currentYear === minDateObj.getFullYear() && currentMonth <= minDateObj.getMonth())
  );

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
        width: hasFlightRoute ? "min(365px, calc(100vw - 20px))" : "280px",
        boxSizing: "border-box",
        background: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 18px 40px -4px rgba(220, 30, 38, 0.18), 0 10px 24px -4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(220, 30, 38, 0.12)",
        padding: hasFlightRoute ? "12px 14px 10px" : "10px 12px 8px",
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
        @keyframes pnbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pnb-dp-spin {
          animation: pnbSpin 1s linear infinite;
        }
        .pnb-dp-nav-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid #fee2e2; background: #ffffff; color: #ff0000;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease; padding: 0;
        }
        .pnb-dp-nav-btn:hover:not(:disabled) {
          background: #fef2f2; border-color: #fca5a5; transform: scale(1.05);
        }
        .pnb-dp-nav-btn:disabled {
          color: #cbd5e1; border-color: #f1f5f9; cursor: not-allowed; opacity: 0.5;
        }
        .pnb-dp-day-cell {
          width: 100%; border-radius: 8px;
          border: 1px solid #f1f5f9; background: #ffffff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s ease; margin: 0 auto;
          padding: 3px 1px 2px; position: relative; box-sizing: border-box;
        }
        .pnb-dp-day-cell.with-fare {
          min-height: 48px;
        }
        .pnb-dp-day-cell.compact {
          min-height: 28px; height: 28px; border-color: transparent; background: transparent;
        }
        .pnb-dp-day-cell:hover:not(.disabled):not(.selected) {
          background: #fef2f2; border-color: #fca5a5; transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(220, 30, 38, 0.12);
        }
        .pnb-dp-day-cell.selected {
          background: linear-gradient(135deg, #ef4444 0%, #ff0000 100%) !important;
          color: #fff !important;
          box-shadow: 0 4px 12px rgba(220, 30, 38, 0.35) !important;
          border-color: #ff0000 !important;
        }
        .pnb-dp-day-cell.today:not(.selected) {
          border-color: #ff0000 !important;
        }
        .pnb-dp-day-cell.today:not(.selected) .pnb-dp-day-num {
          color: #ff0000;
        }
        .pnb-dp-day-cell.disabled {
          color: #cbd5e1 !important; background: #fafafa !important;
          border-color: transparent !important; cursor: not-allowed !important; opacity: 0.45;
        }
        .pnb-dp-day-num {
          font-size: 0.78rem; font-weight: 700; line-height: 1; color: #0f172a;
        }
        .pnb-dp-day-cell.selected .pnb-dp-day-num {
          color: #ffffff !important;
        }
        .pnb-dp-fare {
          font-size: 0.62rem; font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; margin-top: 2px;
        }
        .pnb-dp-day-cell.selected .pnb-dp-fare {
          color: #ffffff !important;
        }
        .pnb-dp-indicator-dot {
          width: 4px; height: 4px; border-radius: 50%; margin-top: 2px; flex-shrink: 0;
        }
        .pnb-dp-day-cell.selected .pnb-dp-indicator-dot {
          background-color: #ffffff !important;
        }
        .pnb-dp-quick-btn {
          border-radius: 8px; border: 1px solid #fee2e2; background: #fff5f5; color: #ff0000;
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
          padding: 3px 8px; cursor: pointer; transition: all 0.2s ease;
        }
        .pnb-dp-quick-btn:hover {
          background: #ff0000; color: #fff; border-color: #ff0000; box-shadow: 0 2px 6px rgba(220, 30, 38, 0.25);
        }
        .pnb-dp-legend-container {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 6px;
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: 6px 8px; margin: 8px 0 6px; box-sizing: border-box;
        }
        .pnb-dp-legend-item {
          display: flex; align-items: center; gap: 5px; font-size: 0.63rem; font-weight: 600; color: #475569;
        }
        .pnb-dp-legend-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <CalendarIcon size={14} style={{ color: "#ff0000" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </span>
          {hasFlightRoute && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.64rem", fontWeight: 700, color: "#475569", background: "#f8fafc", padding: "1px 6px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <Plane size={10} style={{ color: "#ff0000" }} />
              {fromCode} ➔ {toCode}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isLoadingFares && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.6rem", color: "#64748b", fontWeight: 600 }}>
              <Loader2 size={11} className="pnb-dp-spin" style={{ color: "#ff0000" }} />
              <span>Fares...</span>
            </div>
          )}
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", borderRadius: "6px" }} aria-label="Close calendar">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", padding: "0 2px" }}>
        <button
          type="button"
          className="pnb-dp-nav-btn"
          onClick={prevMonth}
          disabled={isPrevMonthDisabled}
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0f172a" }}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          className="pnb-dp-nav-btn"
          onClick={nextMonth}
          aria-label="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "4px" }}>
        {WEEKDAYS.map((wd) => (
          <span key={wd} style={{ fontSize: "0.64rem", fontWeight: 800, color: wd === "Su" || wd === "Sa" ? "#ff0000" : "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", padding: "1px 0" }}>
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: hasFlightRoute ? "3px 2px" : "2px", marginBottom: "8px" }}>
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                style={{ width: "100%", height: hasFlightRoute ? "48px" : "28px" }}
              />
            );
          }

          const disabled = isDateDisabled(currentYear, currentMonth, day);
          const selected = isDateSelected(currentYear, currentMonth, day);
          const today = isDateToday(currentYear, currentMonth, day);
          const fareDetails = !disabled ? getDayFareDetails(currentYear, currentMonth, day) : null;

          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`pnb-dp-day-cell${hasFlightRoute ? " with-fare" : " compact"}${disabled ? " disabled" : ""}${selected ? " selected" : ""}${today ? " today" : ""}`}
              disabled={disabled}
              onClick={() => handleSelectDay(day)}
              title={
                fareDetails
                  ? `${MONTH_NAMES[currentMonth]} ${day}: ₹${new Intl.NumberFormat("en-IN").format(fareDetails.fareVal)} (${fareDetails.label})`
                  : undefined
              }
            >
              <span className="pnb-dp-day-num">{day}</span>
              {hasFlightRoute && (
                <>
                  {fareDetails ? (
                    <span
                      className="pnb-dp-fare"
                      style={{ color: selected ? "#ffffff" : fareDetails.color }}
                    >
                      ₹{new Intl.NumberFormat("en-IN").format(fareDetails.fareVal)}
                    </span>
                  ) : !disabled ? (
                    <span className="pnb-dp-fare" style={{ color: "#94a3b8", opacity: 0.7 }}>
                      {isLoadingFares ? "..." : "--"}
                    </span>
                  ) : null}
                  {fareDetails && (
                    <span
                      className="pnb-dp-indicator-dot"
                      style={{
                        backgroundColor: selected ? "#ffffff" : fareDetails.color,
                      }}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Fare Legend (Backoffice style) */}
      {hasFlightRoute && (
        <div className="pnb-dp-legend-container">
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#10b981" }} />
            <span>Low Fare</span>
          </div>
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#3b82f6" }} />
            <span>Normal Fare</span>
          </div>
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#ef4444" }} />
            <span>High Fare</span>
          </div>
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#f59e0b" }} />
            <span>Festival</span>
          </div>
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#8b5cf6" }} />
            <span>Regional</span>
          </div>
          <div className="pnb-dp-legend-item">
            <span className="pnb-dp-legend-dot" style={{ backgroundColor: "#eab308" }} />
            <span>Long Weekend</span>
          </div>
        </div>
      )}

      {/* Quick Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" className="pnb-dp-quick-btn" onClick={() => handleQuickPick(0)}>
            Today
          </button>
          <button type="button" className="pnb-dp-quick-btn" onClick={() => handleQuickPick(1)}>
            Tomorrow
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", padding: "4px 6px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

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
