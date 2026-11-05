import React from "react";
import {
  ShieldCheck,
  Search,
  Ticket,
  CreditCard,
  Headphones,
  ArrowRight,
  Plane
} from "lucide-react";

const POPULAR_DOMESTIC_ROUTES = [
  { from: "Delhi", fromCode: "DEL", to: "Mumbai", toCode: "BOM", fare: "₹ 3,499", duration: "2h 10m" },
  { from: "Bengaluru", fromCode: "BLR", to: "Goa", toCode: "GOI", fare: "₹ 2,199", duration: "1h 15m" },
  { from: "Hyderabad", fromCode: "HYD", to: "Chennai", toCode: "MAA", fare: "₹ 2,450", duration: "1h 20m" },
  { from: "Mumbai", fromCode: "BOM", to: "Kolkata", toCode: "CCU", fare: "₹ 4,200", duration: "2h 35m" },
  { from: "Chennai", fromCode: "MAA", to: "Hyderabad", toCode: "HYD", fare: "₹ 2,450", duration: "1h 15m" },
  { from: "Kolkata", fromCode: "CCU", to: "Bengaluru", toCode: "BLR", fare: "₹ 4,100", duration: "2h 45m" },
];

export default function AboutFlightBooking({ onSelectRoute }) {
  const handleRouteClick = (r) => {
    if (onSelectRoute) {
      onSelectRoute({
        source: `${r.from} (${r.fromCode})`,
        destination: `${r.to} (${r.toCode})`,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      window.location.href = `/search/flights?source=${encodeURIComponent(`${r.from} (${r.fromCode})`)}&destination=${encodeURIComponent(`${r.to} (${r.toCode})`)}&departureDate=${today}&tripType=oneway`;
    }
  };

  return (
    <section className="w-full py-10 my-4 border-t border-slate-100">
      {/* ── 1. Heading & Subheading [PNB_FLT_066, PNB_FLT_058] ── */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold mb-3">
          <ShieldCheck size={13} className="text-[#E11D48]" />
          <span>PICK&amp;BOOK FLIGHT ADVANTAGE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-center mb-3">
          Your Flight. Our Priority.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
          Seamless domestic and international flight reservations at the best fares.
        </p>
      </div>

      {/* ── 2. 4-Pillar Feature Grid [PNB_FLT_074] ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Pillar 1 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Search size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Fare Comparison &amp; Transparency
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Compare 100+ airlines side-by-side with zero hidden convenience fees or last-minute price jumps.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-rose-700 flex items-center gap-1">
            <span>Guaranteed Lowest Rates</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
              <Ticket size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Instant Booking &amp; Web Check-in
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seamless PNR generation and automated web check-in guidance delivered directly via WhatsApp and email.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-blue-700 flex items-center gap-1">
            <span>Digital Boarding Passes</span>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
              <CreditCard size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Secure Payment Options
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Flexible and secure checkout via UPI, Credit/Debit cards, Net Banking, and zero-cost EMI plans.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <span>256-bit Encrypted Checkout</span>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center mb-4">
              <Headphones size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              24/7 Travel Support
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dedicated travel experts ready around the clock for quick ticket cancellations, rescheduling, and instant refunds.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-purple-700 flex items-center gap-1">
            <span>Live Agent Assistance</span>
          </div>
        </div>
      </div>

      {/* ── 3. Popular Domestic Routes Table/Chips [PNB_FLT_073] ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Popular Domestic Flight Routes
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Find the lowest fares on top business and holiday routes across India.
            </p>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 self-start sm:self-auto">
            LIVE FARES
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_DOMESTIC_ROUTES.map((route, idx) => (
            <div
              key={idx}
              onClick={() => handleRouteClick(route)}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-rose-300 hover:bg-rose-50/30 cursor-pointer transition-all duration-200 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Plane size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    {route.from} → {route.to}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {route.duration} • Non-stop
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                  {route.fare}
                </span>
                <span className="text-[10px] text-rose-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  Book <ArrowRight size={10} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

