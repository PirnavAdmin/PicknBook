import React, { useState, useRef, useEffect } from "react";
import { AIRPORTS_DATABASE } from "../../utils/flightAirports";
import "./CityAirportDisplay.css";

/**
 * CityAirportDisplay
 * 
 * Standardized component across the flight booking flow to render:
 * - City Name (primary text, cleanly truncated with ellipsis when space is constrained)
 * - Three-letter IATA Airport Code in parentheses beside it (slightly smaller, subtle grey / muted text #64748b)
 * - Full interactive hover & mobile tap tooltip displaying the unabbreviated City, Airport Code, and Airport Name
 * - Accessible keyboard navigation (Enter / Space / Escape)
 */
export default function CityAirportDisplay({
  cityName = "",
  airportCode = "",
  airportName = "",
  align = "left",
  className = "",
  cityClassName = "",
  codeClassName = "",
  showTooltip = true,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize airport code
  let code = String(airportCode || "").trim().toUpperCase();

  // Normalize city name
  let cleanCity = String(cityName || "").trim();

  // If code is not provided, try to extract from city name e.g. "Paris (CDG)" or "CDG - Paris"
  if (!code) {
    const parenMatch = cleanCity.match(/\(([A-Z]{3})\)$/i);
    if (parenMatch) {
      code = parenMatch[1].toUpperCase();
    } else {
      const prefixMatch = cleanCity.match(/^([A-Z]{3})\s*[-–]\s*/i);
      if (prefixMatch) {
        code = prefixMatch[1].toUpperCase();
      }
    }
  }

  // Strip code from cleanCity if it's already embedded at the end or start to avoid "New Delhi (DEL) (DEL)"
  cleanCity = cleanCity.replace(/\s*\([A-Z]{3}\)$/i, "").trim();
  cleanCity = cleanCity.replace(/^[A-Z]{3}\s*[-–]\s*/i, "").trim();

  // If city is empty, fall back to airport database lookup by code or code itself
  if (!cleanCity && code) {
    cleanCity = AIRPORTS_DATABASE[code]?.city || code;
  }

  // Resolved full airport name for hover/tap tooltip
  let resolvedAirportName = String(airportName || "").trim();
  if (!resolvedAirportName && code && AIRPORTS_DATABASE[code]?.name) {
    resolvedAirportName = AIRPORTS_DATABASE[code].name;
  }
  // If airport name is identical to city, don't repeat it
  if (resolvedAirportName.toLowerCase() === cleanCity.toLowerCase()) {
    resolvedAirportName = "";
  }

  // Full accessible label and tooltip strings
  const tooltipHeader = code ? `${cleanCity} (${code})` : cleanCity;
  const fullTooltipText = resolvedAirportName ? `${tooltipHeader} • ${resolvedAirportName}` : tooltipHeader;

  // Dismiss tooltip on outside click or tap
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("touchstart", handleOutsideClick, true);
    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("touchstart", handleOutsideClick, true);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`pb-city-airport-box pb-city-airport-box--${align} ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        // Support mobile tap to toggle full information
        e.stopPropagation();
        setOpen((prev) => !prev);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Location: ${fullTooltipText}`}
      title={fullTooltipText}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((prev) => !prev);
        } else if (e.key === "Escape") {
          setOpen(false);
        }
      }}
    >
      <span className={`pb-city-name ${cityClassName}`}>
        {cleanCity || "--"}
      </span>
      {code && (
        <span className={`pb-city-code ${codeClassName}`}>
          ({code})
        </span>
      )}

      {showTooltip && open && (
        <div
          className={`pb-city-tooltip pb-city-tooltip--${align}`}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pb-city-tooltip-title">
            <span>{cleanCity}</span>
            {code && <span className="pb-city-tooltip-code">({code})</span>}
          </div>
          {resolvedAirportName && (
            <div className="pb-city-tooltip-sub">
              {resolvedAirportName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
