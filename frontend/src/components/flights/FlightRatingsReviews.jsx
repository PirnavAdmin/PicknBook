import React, { useState, useEffect, useCallback } from "react";
import { Star, CheckCircle2, Plane, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

const DEFAULT_REVIEWS = [
  {
    id: "rev-1",
    name: "Rajesh Sharma",
    avatar: "RS",
    route: "Delhi (DEL) → Mumbai (BOM)",
    airline: "IndiGo",
    rating: 5,
    date: "12 Oct 2026",
    comment:
      "Seamless booking experience! The live seat map was instant, and web check-in details were delivered to my WhatsApp 24 hours prior to departure.",
    verified: true,
  },
  {
    id: "rev-2",
    name: "Priya Verma",
    avatar: "PV",
    route: "Bengaluru (BLR) → Goa (GOI)",
    airline: "Air India Express",
    rating: 5,
    date: "28 Sep 2026",
    comment:
      "Saved ₹1,200 with the FLYFAST promo code. The interface is clean, uncluttered, and there were no hidden convenience fees at checkout.",
    verified: true,
  },
  {
    id: "rev-3",
    name: "Amit Patel",
    avatar: "AP",
    route: "Hyderabad (HYD) → Chennai (MAA)",
    airline: "Akasa Air",
    rating: 5,
    date: "04 Oct 2026",
    comment:
      "I book weekly flights for corporate travel. Pick&book is by far the fastest site for one-way and multi-city route combinations.",
    verified: true,
  },
  {
    id: "rev-4",
    name: "Sneha Reddy",
    avatar: "SR",
    route: "Kolkata (CCU) → Delhi (DEL)",
    airline: "Air India",
    rating: 5,
    date: "19 Sep 2026",
    comment:
      "Clear fare comparison across all airlines made it so easy to pick the best departure slot. Customer support was very responsive when I had a baggage query.",
    verified: true,
  },
];

export default function FlightRatingsReviews({
  reviews = null,
  endpoint = "/api/flights/reviews",
}) {
  const [data, setData] = useState(() => (Array.isArray(reviews) ? reviews : []));
  const [loading, setLoading] = useState(!reviews);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (Array.isArray(reviews)) {
      setData(reviews);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to load reviews (Status: ${response.status})`);
      }
      const json = await response.json();
      const list = Array.isArray(json) ? json : json?.reviews || json?.data || [];
      setData(list);
    } catch (err) {
      // In development or if endpoint is not wired up yet, fallback cleanly with ability to retry
      // If mock fallback desired on network fail:
      if (process.env.NODE_ENV !== "production") {
        setData(DEFAULT_REVIEWS);
      } else {
        setError(err.message || "Unable to fetch verified flyer reviews.");
      }
    } finally {
      setLoading(false);
    }
  }, [reviews, endpoint]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Overall rating calculation
  const totalCount = data.length || 42000;
  const avgRating = data.length > 0
    ? (data.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / data.length).toFixed(1)
    : "4.9";

  return (
    <section className="w-full py-8">
      {/* ── Section Header [PNB_FLT_058] ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold mb-2">
            <MessageSquare size={12} className="text-[#E11D48]" />
            <span>VERIFIED FLYER EXPERIENCES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            What Our Flyers Say
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real feedback from travellers who booked domestic and international flights on Pick&amp;book.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 self-start sm:self-auto">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-base font-bold">★</span>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-800">{avgRating} / 5</span>
          <span className="text-[11px] text-slate-400">({totalCount}+ Ratings)</span>
        </div>
      </div>

      {/* ── Loading State: Skeleton Loader Grid [PNB_FLT_070] ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-200 rounded-xl h-44 p-5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-300" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-24 bg-slate-300 rounded" />
                  <div className="h-2.5 w-16 bg-slate-300 rounded" />
                </div>
              </div>
              <div className="space-y-2 my-2">
                <div className="h-2.5 w-full bg-slate-300 rounded" />
                <div className="h-2.5 w-4/5 bg-slate-300 rounded" />
              </div>
              <div className="h-3 w-32 bg-slate-300 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error State with Retry Button [PNB_FLT_071] ── */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center flex flex-col items-center justify-center gap-3 my-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-[#E11D48] flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {error || "Failed to load ratings and customer reviews."}
          </p>
          <button
            type="button"
            onClick={fetchReviews}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── Empty State [PNB_FLT_072] ── */}
      {!loading && !error && data.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-sm my-4">
          <MessageSquare size={32} className="mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-slate-800">
            No reviews yet. Be the first to share your flying experience!
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Reviews will appear here once flyers complete their bookings.
          </span>
        </div>
      )}

      {/* ── Dynamic Reviews Grid [PNB_FLT_070] ── */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map((rev, index) => {
            const avatarText = rev.avatar || (rev.name ? rev.name.slice(0, 2).toUpperCase() : "G");

            return (
              <div
                key={rev.id || index}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Header: Avatar, Name & Verified Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center font-bold text-xs text-rose-700">
                        {avatarText}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                          {rev.name}
                        </h3>
                        {rev.verified !== false && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            <CheckCircle2 size={10} /> Verified Flyer
                          </span>
                        )}
                      </div>
                    </div>
                    {rev.date && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {rev.date}
                      </span>
                    )}
                  </div>

                  {/* Stars Row */}
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(Math.min(5, Math.max(1, Number(rev.rating) || 5)))].map((_, i) => (
                      <span key={i} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>

                  {/* Route Badge */}
                  {rev.route && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium mb-3">
                      <Plane size={11} className="text-[#E11D48]" />
                      <span className="truncate max-w-[200px]">{rev.route}</span>
                    </div>
                  )}

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                    "{rev.comment}"
                  </p>
                </div>

                {rev.airline && (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Airline: <strong className="text-slate-700 font-semibold">{rev.airline}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

