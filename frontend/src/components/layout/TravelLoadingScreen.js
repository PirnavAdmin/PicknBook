import React from "react";
import { Bus, Hotel, Loader2, MapPin, Plane } from "lucide-react";

const iconMap = {
  bus: Bus,
  flight: Plane,
  hotel: Hotel,
  route: MapPin,
};

export default function TravelLoadingScreen({
  title = "Loading...",
  message = "Please wait while we get everything ready.",
  variant = "route",
  icon = "route",
}) {
  const Icon = iconMap[icon] || MapPin;

  return (
    <main className={`travel-loading-screen travel-loading-screen--${variant}`} aria-live="polite" aria-busy="true">
      <div className="travel-loading-skyline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <section className="travel-loading-panel">
        <div className="travel-loading-route" aria-hidden="true">
          <span className="travel-loading-pin travel-loading-pin--start">
            <MapPin size={24} />
          </span>
          <span className="travel-loading-road">
            <span className="travel-loading-vehicle">
              <Icon size={28} />
            </span>
          </span>
          <span className="travel-loading-pin travel-loading-pin--end">
            <MapPin size={24} />
          </span>
        </div>
        <div className="travel-loading-copy">
          <Loader2 className="travel-loading-spinner" size={30} />
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
      </section>
    </main>
  );
}
