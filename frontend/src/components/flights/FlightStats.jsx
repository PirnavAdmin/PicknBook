import React, { useState, useEffect } from "react";
import { Plane, Users, MapPin, Headphones, Clock, ShieldCheck, Award } from "lucide-react";

const ICON_MAP = {
  plane: Plane,
  users: Users,
  mappin: MapPin,
  headphones: Headphones,
  clock: Clock,
  shield: ShieldCheck,
  award: Award,
};

const DEFAULT_STATS = [
  {
    id: "stat-1",
    label: "Airlines Compared",
    value: "500+",
    icon: "plane",
    description: "Domestic and international airline partners compared side by side.",
  },
  {
    id: "stat-2",
    label: "Happy Flyers",
    value: "10L+",
    icon: "users",
    description: "Satisfied passengers booked through our platform nationwide.",
  },
  {
    id: "stat-3",
    label: "Destinations Covered",
    value: "300+",
    icon: "mappin",
    description: "Connecting major metro hubs, regional airports and global cities.",
  },
  {
    id: "stat-4",
    label: "Customer Support",
    value: "24/7",
    icon: "headphones",
    description: "Dedicated assistance for bookings, cancellations and web check-in.",
  },
];

export default function FlightStats({
  stats = null,
  title = "India's Most Reliable Flight Booking Network",
  subtitle = "Real-time seat inventory, automated web check-in guidance, and transparent pricing across all airlines.",
  endpoint = "/api/flights/stats",
}) {
  const [data, setData] = useState(() => (Array.isArray(stats) && stats.length > 0 ? stats : []));
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    if (Array.isArray(stats) && stats.length > 0) {
      setData(stats);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (!isMounted) return;
        const list = Array.isArray(resData) ? resData : resData?.stats || resData?.data || [];
        setData(list.length > 0 ? list : DEFAULT_STATS);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(DEFAULT_STATS);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [stats, endpoint]);

  const displayStats = data.length > 0 ? data : DEFAULT_STATS;

  return (
    <section className="w-full py-8 my-2">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mb-8 text-center sm:text-left">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
            PERFORMANCE AT A GLANCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 mt-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Responsive Grid [PNB_FLT_068, PNB_FLT_069] */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {loading
            ? [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-36 animate-pulse" />
            ))
            : displayStats.map((item, index) => {
              let IconComponent = Plane;
              if (typeof item.icon === "string") {
                IconComponent = ICON_MAP[item.icon.toLowerCase()] || Plane;
              } else if (item.icon) {
                IconComponent = item.icon;
              }

              return (
                <div
                  key={item.id || index}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform duration-200">
                      <IconComponent size={22} />
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {item.value}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.label}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {item.description || item.subtext}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

