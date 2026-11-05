import React from "react";
import { Plane } from "lucide-react";

export default function FlightHero({
  title = "Book Flights Smarter. Fly Higher.",
  highlightText = "Fly Higher.",
  subtitle = "Compare 100+ domestic & international airlines with real-time seat inventory, zero hidden fees, and instant confirmation.",
  badge = "FLIGHT SEARCH & BOOKING",
}) {
  const parts = highlightText && title.includes(highlightText)
    ? [title.replace(highlightText, "").trim(), highlightText]
    : [title, ""];

  return (
    <div className="text-center sm:text-left mb-6 sm:mb-8">
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold tracking-wider uppercase mb-3 border border-rose-500/30">
          <Plane size={13} className="text-rose-400" />
          <span>{badge}</span>
        </span>
      )}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight text-center sm:text-left">
        {parts[0]}{" "}
        {parts[1] && <span className="text-[#E11D48]">{parts[1]}</span>}
      </h1>
      {subtitle && (
        <p className="text-base sm:text-lg text-rose-100 font-medium mt-3 max-w-2xl text-center sm:text-left">
          {subtitle}
        </p>
      )}
    </div>
  );
}

