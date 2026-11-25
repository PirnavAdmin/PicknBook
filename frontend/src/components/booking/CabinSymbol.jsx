import React from "react";

/**
 * CabinSymbol Component
 * 
 * Minimal line icons (1.2px stroke, no fills) according to prompt specs:
 * - door: green outlined box (#16a34a)
 * - emergency: red (#D62828) rounded box (22x12) with outward arrow
 * - stairs: 3-step staircase line (#64748b)
 * - pantry / galley: grey coffee cup outline (#64748b)
 * - lavatory: simple standing person outline (#64748b)
 * - bassinet: purple cradle outline (#9333ea)
 */

export const CabinSymbol = ({
  type = "door",
  width = 16,
  height = 16,
  className = "",
  title = "",
  style = {},
}) => {
  const normType = String(type || "").toLowerCase();

  const labels = {
    door: "Exit door",
    emergency: "Emergency Exit",
    emerg: "Emergency Exit",
    stairs: "Stairs",
    pantry: "Galley",
    galley: "Galley",
    lavatory: "Lavatory",
    lav: "Lavatory",
    bassinet: "Bassinet",
  };

  const resolvedTitle = title || labels[normType] || type;

  // Emergency exit: 22x12 red rounded box with outward arrow
  if (normType === "emergency" || normType === "emerg") {
    return (
      <svg
        width={22}
        height={12}
        viewBox="0 0 22 12"
        className={`cabin-symbol cabin-symbol-emergency ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
        role="img"
        aria-label={resolvedTitle}
      >
        <title>{resolvedTitle}</title>
        <rect
          x={0.5}
          y={0.5}
          width={21}
          height={11}
          rx={3}
          fill="#D62828"
          stroke="#D62828"
          strokeWidth="1"
        />
        {/* Outward arrow */}
        <g stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="11" y1="8.5" x2="11" y2="3.5" />
          <path d="M 8.5 5.5 L 11 3 L 13.5 5.5" />
        </g>
      </svg>
    );
  }

  // Minimal line icons (1.2px stroke, no fills)
  return (
    <svg
      width={width}
      height={height}
      viewBox="-8 -8 16 16"
      className={`cabin-symbol cabin-symbol-${normType} ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      role="img"
      aria-label={resolvedTitle}
    >
      <title>{resolvedTitle}</title>

      {/* Door: green outlined box at nose and tail */}
      {normType === "door" && (
        <rect
          x="-6"
          y="-5"
          width="12"
          height="10"
          rx="2"
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.2"
        />
      )}

      {/* Galley / Pantry: grey cup */}
      {(normType === "pantry" || normType === "galley") && (
        <g stroke="#64748b" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M -4 -3 L 2 -3 L 2 1 C 2 3.2 -0.2 4 -1 4 C -1.8 4 -4 3.2 -4 1 Z" />
          <path d="M 2 -2 L 4 -2 C 4.8 -2 4.8 0.5 4 0.5 L 2 0.5" />
          <line x1="-5" y1="5" x2="3" y2="5" />
        </g>
      )}

      {/* Lavatory: simple standing person */}
      {(normType === "lavatory" || normType === "lav") && (
        <g stroke="#64748b" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="0" cy="-3.5" r="1.3" />
          <path d="M 0 -1.8 L 0 1.5 M -2.5 -0.5 L 2.5 -0.5 M 0 1.5 L -1.5 4.5 M 0 1.5 L 1.5 4.5" />
        </g>
      )}

      {/* Stairs: 3-step staircase line */}
      {normType === "stairs" && (
        <path
          d="M -4 4 L -1.5 4 L -1.5 1.5 L 1 1.5 L 1 -1 L 3.5 -1 L 3.5 -3.5"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Bassinet: cradle half-moon with hood in purple */}
      {normType === "bassinet" && (
        <g stroke="#9333ea" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M -4 0 L 4 0 C 4 3.2 0 3.5 0 3.5 C 0 3.5 -4 3.2 -4 0 Z" />
          <path d="M -4 0 C -4 -3.5 0 -3.5 0 0" />
        </g>
      )}
    </svg>
  );
};

export default CabinSymbol;
