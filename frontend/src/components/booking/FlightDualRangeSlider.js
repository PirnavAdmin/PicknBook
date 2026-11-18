import React, { useRef, useState, useCallback } from "react";
import { Plane } from "lucide-react";

/**
 * Custom dual-range slider for flight filters.
 * - Left handle (min): standard circular slider handle.
 * - Right handle (max): circular handle with a red airplane icon.
 * - Active track: Pick&Book red.
 * - Inactive rail: neutral grey.
 * - Bounded and non-clipping at 0% and 100%.
 */
export default function FlightDualRangeSlider({
  min = 0,
  max = 100,
  minValue = 0,
  maxValue = 100,
  step = 1,
  onChange,
  disabled = false,
  ariaLabelMin = "Minimum value",
  ariaLabelMax = "Maximum value",
  className = "",
}) {
  const trackRef = useRef(null);
  const [activeThumb, setActiveThumb] = useState(null); // 'min' | 'max' | null

  // Ensure safe numbers
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
  const currentMin = Math.max(safeMin, Math.min(Number.isFinite(minValue) ? minValue : safeMin, safeMax));
  const currentMax = Math.max(currentMin, Math.min(Number.isFinite(maxValue) ? maxValue : safeMax, safeMax));

  const minPercent = Math.max(0, Math.min(100, ((currentMin - safeMin) / (safeMax - safeMin)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((currentMax - safeMin) / (safeMax - safeMin)) * 100));

  const getValueFromPointer = useCallback(
    (clientX) => {
      if (!trackRef.current) return safeMin;
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      if (trackWidth <= 0) return safeMin;

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
    const val = getValueFromPointer(e.clientX);
    const distMin = Math.abs(val - currentMin);
    const distMax = Math.abs(val - currentMax);

    let targetThumb = "min";
    if (distMin < distMax) {
      targetThumb = "min";
    } else if (distMax < distMin) {
      targetThumb = "max";
    } else {
      // Tie-breaker based on direction
      targetThumb = val < currentMin ? "min" : "max";
    }

    setActiveThumb(targetThumb);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (targetThumb === "min") {
      const newMin = Math.min(val, currentMax);
      onChange({ min: newMin, max: currentMax });
    } else {
      const newMax = Math.max(val, currentMin);
      onChange({ min: currentMin, max: newMax });
    }
  };

  const handlePointerMove = (e) => {
    if (!activeThumb || disabled || !onChange) return;
    const val = getValueFromPointer(e.clientX);

    if (activeThumb === "min") {
      const newMin = Math.min(val, currentMax);
      onChange({ min: newMin, max: currentMax });
    } else if (activeThumb === "max") {
      const newMax = Math.max(val, currentMin);
      onChange({ min: currentMin, max: newMax });
    }
  };

  const handlePointerUp = (e) => {
    if (activeThumb) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setActiveThumb(null);
    }
  };

  return (
    <div
      className={`flight-dual-slider-wrap ${disabled ? "disabled" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flight-dual-slider-track-area" ref={trackRef}>
        {/* Grey inactive track */}
        <div className="flight-dual-slider-rail" />

        {/* Active Red track between handles */}
        <div
          className="flight-dual-slider-active-track"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`,
          }}
        />

        {/* Left (Min) Handle: Normal Circular Slider Handle */}
        <div
          className={`flight-slider-handle flight-slider-handle--min ${
            activeThumb === "min" ? "active" : ""
          }`}
          style={{
            left: `${minPercent}%`,
            zIndex: activeThumb === "min" ? 5 : minPercent > 90 ? 4 : 3,
          }}
          role="slider"
          aria-label={ariaLabelMin}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={currentMin}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled || !onChange) return;
            const delta = step || 1;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange({ min: Math.max(safeMin, currentMin - delta), max: currentMax });
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange({ min: Math.min(currentMax, currentMin + delta), max: currentMax });
            }
          }}
        >
          <div className="flight-slider-handle-disc flight-slider-handle-disc--circle">
            <div className="flight-slider-handle-dot" />
          </div>
        </div>

        {/* Right (Max) Handle: Circular thumb with subtle red outline & centered red airplane pointing right */}
        <div
          className={`flight-slider-handle flight-slider-handle--max ${
            activeThumb === "max" ? "active" : ""
          }`}
          style={{
            left: `${maxPercent}%`,
            zIndex: activeThumb === "max" ? 5 : 3,
          }}
          role="slider"
          aria-label={ariaLabelMax}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={currentMax}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled || !onChange) return;
            const delta = step || 1;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange({ min: currentMin, max: Math.max(currentMin, currentMax - delta) });
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange({ min: currentMin, max: Math.min(safeMax, currentMax + delta) });
            }
          }}
        >
          <div className="flight-slider-handle-disc flight-slider-handle-disc--plane flight-slider-thumb-disc">
            <Plane
              size={18}
              className="flight-slider-plane-icon flight-slider-airplane-icon"
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
