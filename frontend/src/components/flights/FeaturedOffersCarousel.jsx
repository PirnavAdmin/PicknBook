import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Copy, Check, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchCouponsAndOffers } from "../../services/unifiedCouponService";

function formatDynamicValidityDate(validTillStr) {
  if (!validTillStr) return "";
  try {
    const d = new Date(validTillStr);
    if (isNaN(d.getTime())) return validTillStr;
    const formatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    return `Valid till ${formatted}`;
  } catch {
    return `Valid till ${validTillStr}`;
  }
}

function normalizeFlightOffer(item, index) {
  if (!item) return null;
  const promoCode =
    item.promoCode ||
    item.PromoCode ||
    item.couponCode ||
    item.CouponCode ||
    item.code ||
    item.Code ||
    "";
  const title =
    item.title ||
    item.Title ||
    item.offerTitle ||
    item.OfferTitle ||
    item.name ||
    item.Name ||
    "Flight Offer";
  const badge =
    item.badge ||
    item.Badge ||
    item.tag ||
    item.category ||
    "FLIGHT OFFER";
  const discountText =
    item.discountText ||
    item.DiscountText ||
    item.discount ||
    (item.discountPercentage ? `${item.discountPercentage}% OFF` : "") ||
    (item.maxDiscountAmount ? `Save up to ₹${item.maxDiscountAmount}` : "") ||
    "Special Offer";
  const bannerUrl =
    item.bannerUrl ||
    item.BannerUrl ||
    item.imageUrl ||
    item.ImageUrl ||
    item.image ||
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80&fit=crop&auto=format";
  const description =
    item.description ||
    item.Description ||
    item.terms ||
    (promoCode ? `Use promo code ${promoCode} to unlock exclusive flight fares.` : "");
  const validTill =
    item.validTill ||
    item.ValidTill ||
    item.expiryDate ||
    item.ExpiryDate ||
    item.endDate ||
    item.EndDate ||
    null;
  const ctaLink = item.ctaLink || item.redirectUrl || "/search/flights";
  const isActive =
    item.isActive ??
    item.IsActive ??
    item.isCouponActive ??
    item.IsCouponActive ??
    true;

  return {
    id: item.id || item.Id || promoCode || `flt-off-${index}`,
    title,
    badge,
    discountText,
    promoCode,
    validTill,
    bannerUrl,
    description,
    ctaLink,
    isActive,
    raw: item,
  };
}

export default function FeaturedOffersCarousel({
  offers = null,
  onSelectOffer,
  endpoint = "/api/Coupons?serviceType=flight&category=Offer",
}) {
  const [items, setItems] = useState(() => (Array.isArray(offers) && offers.length > 0 ? offers : []));
  const [loading, setLoading] = useState(!offers);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(offers)) {
      setItems(offers);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadOffers = async () => {
      try {
        let list = [];
        try {
          const res = await fetchCouponsAndOffers({ serviceType: "flight", category: "Offer" });
          list = Array.isArray(res) ? res : res?.offers || res?.data || [];
        } catch (couponErr) {
          // Fallback to fetch endpoint directly
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            list = Array.isArray(data) ? data : data?.offers || data?.data || [];
          } else {
            throw couponErr;
          }
        }

        if (isMounted) {
          setItems(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Failed to load offers");
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOffers();

    return () => {
      isMounted = false;
    };
  }, [offers, endpoint]);

  // Filter out expired and inactive promotions
  const validOffers = (items || [])
    .map((item, idx) => normalizeFlightOffer(item, idx))
    .filter((offer) => {
      if (!offer || !offer.isActive) return false;
      if (!offer.validTill) return true;
      const exp = new Date(offer.validTill);
      return isNaN(exp.getTime()) || exp >= new Date();
    });

  // When offers are unavailable or empty: completely hide container and whitespace
  if (!loading && validOffers.length === 0) {
    return null;
  }

  const handleCopy = (e, code) => {
    e.stopPropagation();
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  if (loading && validOffers.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-8">
      {/* ── Section Header [PNB_FLT_058] ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold mb-2">
            <Sparkles size={12} className="text-[#E11D48]" />
            <span>EXCLUSIVE PROMOTIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Featured Flight Offers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Handpicked airline discounts and seasonal promo codes for maximum savings.
          </p>
        </div>

        {/* Carousel Navigation Chevron Buttons [PNB_FLT_060] */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Previous offers"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#E11D48] hover:border-[#E11D48] transition-all duration-200 active:scale-95"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Next offers"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#E11D48] hover:border-[#E11D48] transition-all duration-200 active:scale-95"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ── Carousel Track with zero edge clipping [PNB_FLT_061, PNB_FLT_063] ── */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 sm:px-2 no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {validOffers.map((offer) => {
          const isCopied = copiedCode === offer.promoCode;
          const validityLabel = formatDynamicValidityDate(offer.validTill);

          return (
            <div
              key={offer.id || offer.promoCode}
              className="shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-start bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group cursor-pointer"
              onClick={() => onSelectOffer && onSelectOffer(offer)}
            >
              {/* Image Banner */}
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src={offer.bannerUrl}
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80&fit=crop&auto=format";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Badge [PNB_FLT_064] */}
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold tracking-wide uppercase shadow-sm">
                  {offer.badge || "FLIGHT OFFER"}
                </span>

                <span className="absolute bottom-2.5 left-3 text-white text-lg font-black tracking-tight drop-shadow-sm">
                  {offer.discountText}
                </span>
              </div>

              {/* Body Content */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 mb-1">
                    {offer.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                    {offer.description || (offer.promoCode ? `Use promo code ${offer.promoCode} to unlock exclusive flight fares.` : "")}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Dashed Promo Code Pill */}
                  {offer.promoCode ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-rose-300 bg-rose-50/60">
                      <Tag size={12} className="text-[#E11D48]" />
                      <span className="font-mono text-xs font-bold text-rose-700">
                        {offer.promoCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, offer.promoCode)}
                        className="p-1 hover:text-rose-700 text-slate-400 transition-colors"
                        title="Copy code"
                      >
                        {isCopied ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  ) : <div />}

                  {validityLabel && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {validityLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
