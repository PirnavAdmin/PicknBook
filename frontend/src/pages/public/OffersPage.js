import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Bus, ArrowLeft } from "lucide-react";
import { getPublicFeaturedOffers } from "../../services/adminFeaturedOffersService";
import { sanitizeApiUrlValue, toApiAssetUrl } from "../../services/apiClient";
import { usePromo } from "../../contexts/PromoContext";
import "../../STYLES/OffersPage.css";

function normalizeFeaturedOffer(offer, index) {
  const featuredOfferId = offer?.id ?? offer?.Id ?? offer?.offerId ?? offer?.OfferId ?? null;
  const id = featuredOfferId ?? offer?.offerCode ?? `offer-${index}`;
  const bookingType = String(offer?.bookingType || "").trim();

  const promo = offer?.promotion ?? offer?.Promotion ?? null;

  const promotionId = offer?.promotionId ?? offer?.PromotionId ?? promo?.id ?? promo?.Id ?? null;
  const promotionCode = offer?.promotionCode ?? offer?.PromotionCode ?? promo?.code ?? promo?.Code ?? null;
  const promotionTitle = offer?.promotionTitle ?? offer?.PromotionTitle ?? promo?.title ?? promo?.Title ?? null;
  const promotionType = offer?.promotionType ?? offer?.PromotionType ?? promo?.promotionType ?? promo?.PromotionType ?? null;
  const discountType = offer?.discountType ?? offer?.DiscountType ?? promo?.discountType ?? promo?.DiscountType ?? null;
  const discountValue = offer?.discountValue ?? offer?.DiscountValue ?? promo?.discountValue ?? promo?.DiscountValue ?? null;
  const maxDiscountAmount = offer?.maxDiscountAmount ?? offer?.MaxDiscountAmount ?? promo?.maxDiscountAmount ?? promo?.MaxDiscountAmount ?? null;
  const minBookingAmount = offer?.minBookingAmount ?? offer?.MinBookingAmount ?? promo?.minBookingAmount ?? promo?.MinBookingAmount ?? null;
  const previewFinalPrice = offer?.previewFinalPrice ?? offer?.PreviewFinalPrice ?? null;
  const rawConditions = offer?.conditions ?? offer?.Conditions ?? [];
  const conditions = Array.isArray(rawConditions)
    ? rawConditions.map((cond) => {
        const typeRaw = cond?.conditionType ?? cond?.ConditionType;
        const opRaw = cond?.conditionOperator ?? cond?.ConditionOperator;
        
        let conditionType = String(typeRaw || "");
        if (typeRaw === 1 || conditionType.toLowerCase() === "sourcecity") {
          conditionType = "SourceCity";
        } else if (typeRaw === 2 || conditionType.toLowerCase() === "destinationcity") {
          conditionType = "DestinationCity";
        } else if (typeRaw === 3 || conditionType.toLowerCase() === "bustype") {
          conditionType = "BusType";
        } else if (typeRaw === 4 || conditionType.toLowerCase() === "traveldate") {
          conditionType = "TravelDate";
        }

        let conditionOperator = String(opRaw || "Equals");
        if (opRaw === 1 || conditionOperator.toLowerCase() === "equals") {
          conditionOperator = "Equals";
        } else if (opRaw === 2 || conditionOperator.toLowerCase() === "contains") {
          conditionOperator = "Contains";
        } else if (opRaw === 3 || conditionOperator.toLowerCase() === "between") {
          conditionOperator = "Between";
        }

        return {
          id: cond?.id ?? cond?.Id,
          featuredOfferId: cond?.featuredOfferId ?? cond?.FeaturedOfferId,
          conditionType,
          conditionOperator,
          value1: cond?.value1 ?? cond?.Value1 ?? "",
          value2: cond?.value2 ?? cond?.Value2 ?? "",
          isActive: cond?.isActive ?? cond?.IsActive ?? true,
        };
      })
    : [];

  return {
    id,
    selectedFeaturedOfferId: featuredOfferId,
    promotionId,
    promotionCode,
    promotionTitle,
    promotionType,
    discountType,
    discountValue,
    maxDiscountAmount,
    minBookingAmount,
    previewFinalPrice,
    conditions,
    offerCode: String(offer?.offerCode || "").trim(),
    title: String(offer?.title || "Travel Offer").trim(),
    subtitle: String(offer?.subtitle || "").trim(),
    description: String(offer?.description || offer?.subtitle || "").trim(),
    couponCode: String(offer?.couponCode || "").trim() || promotionCode,
    imageUrl: sanitizeApiUrlValue(offer?.imageUrl),
    bookingType,
    isActive: offer?.isActive !== false,
  };
}

function isAdminManagedFeaturedOffer(offer) {
  return Boolean(
    offer?.offerCode ||
      offer?.couponExpiresAtUtc ||
      offer?.maxCouponUsage !== undefined ||
      offer?.couponUsedCount !== undefined ||
      offer?.isPercentageDiscount !== undefined
  );
}

function getFeaturedOffersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.offers)) return payload.offers;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function OfferImage({ offer }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = offer.imageUrl && !failed ? toApiAssetUrl(offer.imageUrl) : "";

  if (!imageUrl) {
    return (
      <div className="offer-image-fallback">
        <Tag size={40} />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={offer.title} 
      onError={() => setFailed(true)} 
    />
  );
}

export default function OffersPage() {
  const navigate = useNavigate();
  const { setSelectedOffer } = usePromo();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadOffers = async () => {
      setLoading(true);
      try {
        const payload = await getPublicFeaturedOffers();
        const activeOffers = getFeaturedOffersPayload(payload)
          .filter(isAdminManagedFeaturedOffer)
          .map(normalizeFeaturedOffer)
          .filter((offer) => offer.isActive && (offer.bookingType || "").toLowerCase() === "bus");
        setOffers(activeOffers);
      } catch (err) {
        setError("Unable to load offers. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, []);

  const filteredOffers = offers.filter((offer) => {
    if (filter === "all") return true;
    return (offer.bookingType || "").toLowerCase() === filter;
  });

  const handleBookNow = (offer) => {
    setSelectedOffer(offer);

    let source = "";
    let destination = "";
    let travelDate = "";

    if (offer.conditions && Array.isArray(offer.conditions)) {
      const activeConditions = offer.conditions.filter((c) => c.isActive !== false);

      const sourceCond = activeConditions.find((c) => c.conditionType === "SourceCity");
      if (sourceCond) {
        source = sourceCond.value1;
      }

      const destCond = activeConditions.find((c) => c.conditionType === "DestinationCity");
      if (destCond) {
        destination = destCond.value1;
      }

      const dateCond = activeConditions.find((c) => c.conditionType === "TravelDate");
      if (dateCond) {
        if (dateCond.value1) {
          travelDate = dateCond.value1;
        }
      }
    }

    if (!travelDate) {
      const date = new Date();
      const timezoneOffset = date.getTimezoneOffset() * 60000;
      travelDate = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
    }

    const busParams = new URLSearchParams();
    const busPayload = {
      source,
      destination,
      tripType: "oneway",
      departureDate: travelDate,
    };

    Object.entries(busPayload).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        busParams.set(key, value.trim());
      }
    });

    navigate(`/search/buses${busParams.toString() ? `?${busParams.toString()}` : ""}`, {
      state: busPayload,
    });
  };

  return (
    <div className="offers-page">
      <header className="offers-hero">
        <div className="shell">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Exclusive Travel Deals</h1>
          <p>Save big on your next journey with our curated featured offers.</p>
        </div>
      </header>

      <main className="shell">
        <div className="offers-filter-bar">
          <button 
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <Tag size={16} />
            <span>All Offers</span>
          </button>
          <button 
            className={`filter-chip ${filter === "bus" ? "active" : ""}`}
            onClick={() => setFilter("bus")}
          >
            <Bus size={16} />
            <span>Buses</span>
          </button>
        </div>

        {loading ? (
          <div className="offers-state-msg">Loading deals...</div>
        ) : error ? (
          <div className="offers-state-msg error">{error}</div>
        ) : filteredOffers.length === 0 ? (
          <div className="offers-state-msg">No deals found for this category.</div>
        ) : (
          <div className="offers-grid">
            {filteredOffers.map((offer) => (
              <article className="offer-voucher-card" key={offer.id}>
                <div className="voucher-details">
                  <span className="voucher-kicker">Exclusive {offer.bookingType || "travel"} offer</span>
                  <div className="voucher-content">
                    <h3 className="voucher-title">{offer.title}</h3>
                    <p className="voucher-desc">{offer.description}</p>
                    {offer.couponCode && (
                      <div className="voucher-coupon">
                        <span className="coupon-label">PROMO CODE</span>
                        <strong className="coupon-code">{offer.couponCode}</strong>
                      </div>
                    )}
                  </div>
                  <button className="voucher-book-btn" onClick={() => handleBookNow(offer)}>
                    Book Now
                  </button>
                </div>
                <div className="voucher-divider" aria-hidden="true" />
                <div className="voucher-visual">
                  <div className="voucher-image-container">
                    <OfferImage offer={offer} />
                  </div>
                  <div className="voucher-discount-badge">
                    <strong>
                      {offer.discountValue
                        ? `${offer.discountValue}${offer.discountType === "Percentage" ? "%" : ""}`
                        : "Deal"}
                    </strong>
                    <span>{offer.discountValue ? "OFF" : "OFFER"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
