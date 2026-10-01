import React from "react";

export const CalendarDateIcon = ({ size = 15, className = "", style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`calendar-date-icon ${className}`.trim()}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Soft Drop Shadow Layer */}
      <rect x="2.5" y="4.5" width="19" height="17" rx="4" fill="#000000" fillOpacity="0.07" />

      {/* Main White Calendar Sheet */}
      <rect x="2.5" y="4" width="19" height="17" rx="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.85" />

      {/* Blue Header Bar */}
      <path
        d="M2.5 7.5C2.5 5.567 4.067 4 6 4H18C19.933 4 21.5 5.567 21.5 7.5V9.5H2.5V7.5Z"
        fill="#2563eb"
      />

      {/* Binder Rings */}
      <rect x="6" y="1.8" width="2.2" height="4.4" rx="1.1" fill="#1d4ed8" stroke="#ffffff" strokeWidth="0.75" />
      <rect x="15.8" y="1.8" width="2.2" height="4.4" rx="1.1" fill="#1d4ed8" stroke="#ffffff" strokeWidth="0.75" />

      {/* Date Grid Dots / Cells */}
      <rect x="5.8" y="12" width="2.4" height="2.2" rx="0.6" fill="#94a3b8" />
      <rect x="10.8" y="12" width="2.4" height="2.2" rx="0.6" fill="#94a3b8" />
      <rect x="15.8" y="12" width="2.4" height="2.2" rx="0.6" fill="#94a3b8" />

      <rect x="5.8" y="16" width="2.4" height="2.2" rx="0.6" fill="#94a3b8" />
      <rect x="10.8" y="16" width="2.4" height="2.2" rx="0.6" fill="#2563eb" />
      <rect x="15.8" y="16" width="2.4" height="2.2" rx="0.6" fill="#94a3b8" />

      {/* Curled / Folded Page Corner at bottom-right */}
      <path
        d="M17.5 21L21.5 17V17.5C21.5 19.433 19.933 21 18 21H17.5Z"
        fill="#cbd5e1"
      />
    </svg>
  );
};

export default CalendarDateIcon;
