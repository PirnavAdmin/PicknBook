import React, { useRef, useState, useCallback } from "react";
import { Plane } from "lucide-react";

/**
 * Single movable airplane slider for flight filters.
 * - Left side (min): fixed at minimum, active red track starts here.
 * - Movable handle: circular white thumb with a subtle red outline and centered red airplane icon pointing right.
 * - Active track: Pick&Book red from left (0%) to the airplane thumb.
 * - Inactive track: neutral light grey from airplane thumb to right (100%).
 * - Airplane thumb sits directly and precisely on the slider track, smoothly tracking user drag.
 * - Boundary padding prevents clipping at 0% and 100%.
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
      } catch (err) { }
      setIsDragging(false);
    }
  };

  return (
    <div
      className={`flight-single-slider-wrap ${disabled ? "disabled" : ""} ${isDragging ? "dragging" : ""} ${className}`.trim()}
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

        {/* Movable airplane handle pointing diagonally upwards to the right */}
        <div
          className={`flight-single-slider-airplane-handle flight-single-slider-thumb ${isDragging ? "active" : ""}`}
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
            } else if (e.key === "Home") {
              e.preventDefault();
              onChange(safeMin);
            } else if (e.key === "End") {
              e.preventDefault();
              onChange(safeMax);
            }
          }}
        >
          <div className="flight-slider-thumb-disc">
            <Plane
              size={18}
              className="flight-slider-airplane-icon"
              color="var(--theme-primary, #ff0000)"
              fill="var(--theme-primary, #ff0000)"
              stroke="var(--theme-primary, #ff0000)"
              strokeWidth={0.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

