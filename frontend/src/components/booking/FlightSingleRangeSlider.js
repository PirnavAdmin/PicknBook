import React, { useRef, useState, useCallback } from "react";
import { Plane } from "lucide-react";

/**
 * Single movable airplane slider for flight filters.
 * - Left side (min): fixed, no handle or dot displayed.
 * - Right side (max): movable red airplane silhouette (no surrounding circle/border).
 * - Active track: Pick&Book red from left (0%) to the airplane.
 * - Inactive track: neutral light grey from airplane to right (100%).
 * - Airplane sits directly on the track and moves smoothly without clipping.
 */
export default function FlightSingleRangeSlider({
  min = 0,
  max = 100,
  value = 100,
  step = 1,
  onChange,
  disabled = false,
  ariaLabel = "Filter value",
  className = "",
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Safe numerical bounds
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
  const currentVal = Math.max(safeMin, Math.min(Number.isFinite(value) ? value : safeMax, safeMax));

  const percent = Math.max(0, Math.min(100, ((currentVal - safeMin) / (safeMax - safeMin)) * 100));

  const getValueFromPointer = useCallback(
    (clientX) => {
      if (!trackRef.current) return safeMax;
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      if (trackWidth <= 0) return safeMax;

      const offsetX = Math.max(0, Math.min(clientX - rect.left, trackWidth));
      const ratio = offsetX / trackWidth;
      let rawVal = safeMin + ratio * (safeMax - safeMin);

      if (step > 0) {
        rawVal = Math.round(rawVal / step) * step;
      }
      return Math.max(safeMin, Math.min(rawVal, safeMax));
    },
    [safeMin, safeMax, step]
  );

  const handlePointerDown = (e) => {
    if (disabled || !onChange) return;
    const newVal = getValueFromPointer(e.clientX);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(newVal);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || disabled || !onChange) return;
    const newVal = getValueFromPointer(e.clientX);
    onChange(newVal);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsDragging(false);
    }
  };

  return (
    <div
      className={`flight-single-slider-wrap ${disabled ? "disabled" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flight-single-slider-track-area" ref={trackRef}>
        {/* Grey inactive track behind */}
        <div className="flight-single-slider-rail" />

        {/* Red active track from fixed minimum (0%) to the airplane position */}
        <div
          className="flight-single-slider-active-track"
          style={{ width: `${percent}%` }}
        />

        {/* Single Movable Red Airplane Silhouette Handle */}
        <div
          className={`flight-single-slider-airplane-handle ${isDragging ? "active" : ""}`}
          style={{ left: `${percent}%` }}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={currentVal}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled || !onChange) return;
            const delta = step || 1;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(safeMin, currentVal - delta));
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(safeMax, currentVal + delta));
            }
          }}
        >
          <Plane
            size={18}
            className="flight-slider-airplane-icon"
            color="var(--theme-primary, #ff0000)"
            fill="var(--theme-primary, #ff0000)"
            strokeWidth={0.5}
          />
        </div>
      </div>
    </div>
  );
}

