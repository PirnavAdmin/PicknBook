import React, { useMemo, useState, useEffect } from "react";
import { Info, MapPin, Calendar, Bed, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import "../../STYLES/FlightBookingFlow.css"; // Reuse existing checkout styles
import {
  readHotelBookingFlowState,
  writeHotelBookingFlowState,
} from "./hotelBookingFlowStore";
import { getHotelPricingPreview, getHotelPromotions } from "../../services/hotelBookingService";
import { toApiUrl } from "../../services/apiClient";

function formatCurrency(amount) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0))}`;
}

function calculateNights(inDate, outDate) {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate);
  const d2 = new Date(outDate);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export default function HotelPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readHotelBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.hotel ? incomingState : persistedState || {};

  const hotel = flowState.hotel || null;
  const offer = flowState.offer || null;
  const searchContext = flowState.searchContext || null;
  const checkInDate = offer?.checkInDate || searchContext?.checkInDate || "";
  const checkOutDate = offer?.checkOutDate || searchContext?.checkOutDate || "";

  const nights = useMemo(() => {
    return calculateNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  const [guestName, setGuestName] = useState(flowState.guestName || "");
  const [guestEmail, setGuestEmail] = useState(flowState.guestEmail || "");
  const [guestPhone, setGuestPhone] = useState(flowState.guestPhone || "");
  
  const [couponCode, setCouponCode] = useState(flowState.couponCode || "");
  const [selectedFeaturedOfferId, setSelectedFeaturedOfferId] = useState(flowState.selectedFeaturedOfferId || null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(flowState.agreedToTerms));
  const [formError, setFormError] = useState("");

  // Load available coupons and featured offers on mount
  useEffect(() => {
    async function loadPromoData() {
      try {
        const promos = await getHotelPromotions();
        setAvailableCoupons(promos.filter(p => !p.isAutoApply) || []);

        const response = await fetch(toApiUrl("/api/FeaturedOffers"), {
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true"
          }
        });
        const offersData = await response.json();
        if (offersData && Array.isArray(offersData.offers)) {
          setFeaturedOffers(offersData.offers.filter(o => o.bookingType === "Hotel" && o.isActive));
        }
      } catch (err) {
        console.error("Failed to load hotel promotions", err);
      }
    }
    loadPromoData();
  }, []);

  // Fetch dynamic pricing preview from backend
  const loadPricing = async (code = "", offerId = null) => {
    if (!hotel || !offer) return;
    setIsApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const roomPrice = offer.price / (offer.roomQuantity || 1);
      const payload = {
        hotelId: hotel.hotelId,
        hotelName: hotel.name,
        hotelCity: hotel.cityCode || "",
        roomPrice: roomPrice,
        rooms: offer.roomQuantity || 1,
        nights,
        couponCode: code || null,
        selectedFeaturedOfferId: offerId || null
      };

      const pricing = await getHotelPricingPreview(payload);
      setPricingBreakdown(pricing);

      if (code) {
        if (pricing.totalDiscount > 0) {
          setCouponSuccess(`Coupon "${code}" applied! Discount: ${formatCurrency(pricing.totalDiscount)}`);
          setCouponCode(code);
          setSelectedFeaturedOfferId(null);
        } else {
          setCouponError("Coupon is valid but offers no discount for this booking.");
        }
      } else if (offerId) {
        if (pricing.totalDiscount > 0) {
          setCouponSuccess(`Offer applied successfully! Discount: ${formatCurrency(pricing.totalDiscount)}`);
          setSelectedFeaturedOfferId(offerId);
          setCouponCode("");
        } else {
          setCouponError("Offer is valid but offers no discount for this booking.");
        }
      }
    } catch (err) {
      console.error(err);
      setCouponError(err.message || "Unable to validate coupon / offer.");
      setCouponCode("");
      setSelectedFeaturedOfferId(null);
      setPricingBreakdown(null);
    } finally {
      setIsApplying(false);
    }
  };

  // Run initial pricing preview
  useEffect(() => {
    loadPricing(couponCode, selectedFeaturedOfferId);
  }, [hotel, offer]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    loadPricing(couponCode.trim().toUpperCase(), null);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    loadPricing("", null);
  };

  const handleSelectOffer = (offerId) => {
    loadPricing("", offerId);
  };

  const handleRemoveOffer = () => {
    setSelectedFeaturedOfferId(null);
    setCouponSuccess("");
    setCouponError("");
    loadPricing("", null);
  };

  const basePrice = pricingBreakdown ? pricingBreakdown.basePrice : Number(offer?.price || 0) * nights;
  const tax = pricingBreakdown ? pricingBreakdown.gstAmount : Math.round(basePrice * 0.12);
  const convenienceFee = pricingBreakdown ? pricingBreakdown.convenienceFee : 150;
  const totalDiscount = pricingBreakdown ? pricingBreakdown.totalDiscount : 0;
  const finalPayable = pricingBreakdown ? pricingBreakdown.grandTotal : basePrice + tax + convenienceFee;

  const handleContinue = () => {
    if (!guestName.trim()) {
      setFormError("Guest Name is required.");
      return;
    }
    if (!isValidEmail(guestEmail)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!isValidMobile(guestPhone)) {
      setFormError("Enter a valid mobile number.");
      return;
    }
    if (!agreedToTerms) {
      setFormError("You must agree to hotel booking policy and cancellation rules.");
      return;
    }

    setFormError("");

    const payload = {
      ...flowState,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      couponCode: couponCode.trim().toUpperCase(),
      selectedFeaturedOfferId,
      couponDiscount: totalDiscount,
      agreedToTerms,
      payableAmount: finalPayable,
      fareSummary: {
        baseFare,
        tax,
        convenienceFee,
        discount: totalDiscount,
        totalFare: finalPayable
      }
    };

    writeHotelBookingFlowState(payload);
    navigate("/hotel/payment", { state: payload });
  };

  if (!hotel || !offer) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Stay details missing</h2>
            <p>Select a stay before entering guest details.</p>
            <button type="button" onClick={() => navigate("/search/hotels")}>Go to Hotel Search</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flight-flow-page">
      <div className="flight-flow-shell">
        <section className="flight-passenger-layout">
          <div className="flight-section-card">
            <header className="flight-card-head">
              <div>
                <h2>Guest Details</h2>
                <span>Primary Occupant</span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--hotel-primary-strong)", fontWeight: "700" }}>
                {hotel.name}
              </span>
            </header>

            <div className="flight-form-grid" style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: "750", color: "var(--hotel-text)" }}>Full Name (as in Passport/ID)</span>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter guest's full name"
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--hotel-border)",
                      borderRadius: "10px",
                      fontSize: "0.9rem"
                    }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: "750", color: "var(--hotel-text)" }}>Email Address</span>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{
                        padding: "10px 14px",
                        border: "1px solid var(--hotel-border)",
                        borderRadius: "10px",
                        fontSize: "0.9rem"
                      }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: "750", color: "var(--hotel-text)" }}>Mobile Number</span>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      style={{
                        padding: "10px 14px",
                        border: "1px solid var(--hotel-border)",
                        borderRadius: "10px",
                        fontSize: "0.9rem"
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 24px 24px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "0.92rem", fontWeight: "750" }}>Booking Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.82rem", color: "var(--hotel-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={16} />
                    <span>{hotel.address || hotel.area}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Calendar size={16} />
                    <span>Checkin: {toDisplayDate(String(checkInDate).split("T")[0]) || "Selected date"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Bed size={16} />
                    <span>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"} ({nights} Night{nights > 1 ? "s" : ""})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <User size={16} />
                    <span>{searchContext?.adults || 2} Guests | {searchContext?.rooms || 1} Rooms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="flight-side-card">
            <h3>Fare Summary</h3>
            <div className="flight-fare-list">
              <div>
                <span>Room Charges ({nights} nights)</span>
                <strong>{formatCurrency(basePrice)}</strong>
              </div>
              <div>
                <span>Taxes & GST</span>
                <strong>{formatCurrency(tax)}</strong>
              </div>
              <div>
                <span>Convenience Fee</span>
                <strong>{formatCurrency(convenienceFee)}</strong>
              </div>
              {totalDiscount > 0 && (
                <div>
                  <span>Coupon Discount</span>
                  <strong style={{ color: "#16a34a" }}>-{formatCurrency(totalDiscount)}</strong>
                </div>
              )}
              <div className="total">
                <span>Payable</span>
                <strong>{formatCurrency(finalPayable)}</strong>
              </div>
            </div>

            <div className="flight-options-group">
              <label>
                <span>Apply Coupon</span>
                <div className="flight-coupon-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Enter Coupon code"
                    disabled={isApplying || selectedFeaturedOfferId !== null}
                  />
                  {couponCode && pricingBreakdown?.totalDiscount > 0 ? (
                    <button type="button" onClick={handleRemoveCoupon} style={{ backgroundColor: "#d32f2f" }}>Remove</button>
                  ) : (
                    <button type="button" onClick={handleApplyCoupon} disabled={isApplying || selectedFeaturedOfferId !== null}>
                      {isApplying ? "Applying..." : "Apply"}
                    </button>
                  )}
                </div>
              </label>
              
              {couponError && <p className="flight-flow-error" style={{ marginTop: 5 }}>{couponError}</p>}
              {couponSuccess && <p className="coupon-success-text" style={{ color: "#2e7d32", fontSize: "0.85rem", marginTop: 5 }}>{couponSuccess}</p>}
            </div>

            {/* Available Promotions section */}
            {availableCoupons.length > 0 && (
              <div className="promo-chips-section" style={{ marginTop: 15 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 5 }}>Available Coupons:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => loadPricing(coupon.code, null)}
                      disabled={isApplying || selectedFeaturedOfferId !== null}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        backgroundColor: "#f5f5f5",
                        border: "1px dashed #ccc",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "#333"
                      }}
                    >
                      <strong>{coupon.code}</strong> - {coupon.description || `${coupon.discountValue} Off`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {featuredOffers.length > 0 && (
              <div className="featured-offers-section" style={{ marginTop: 15 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 5 }}>Featured Offers:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {featuredOffers.map((offer) => {
                    const isSelected = selectedFeaturedOfferId === offer.id;
                    return (
                      <div
                        key={offer.id}
                        style={{
                          padding: 8,
                          fontSize: "0.8rem",
                          backgroundColor: isSelected ? "#e8f5e9" : "#fff",
                          border: isSelected ? "1px solid #2e7d32" : "1px solid #ddd",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong>{offer.title}</strong>
                          <p style={{ margin: 0, color: "#666", fontSize: "0.75rem" }}>{offer.subtitle}</p>
                        </div>
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={handleRemoveOffer}
                            style={{
                              padding: "2px 6px",
                              backgroundColor: "#d32f2f",
                              color: "#fff",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer"
                            }}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectOffer(offer.id)}
                            disabled={isApplying || couponCode !== ""}
                            style={{
                              padding: "2px 6px",
                              backgroundColor: "#1976d2",
                              color: "#fff",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer"
                            }}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flight-check-row" style={{ marginTop: 15 }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
              />
              <span>I accept hotel policies, check-in terms, and cancellation rules.</span>
            </label>

            {formError && (
              <p className="flight-flow-error">
                <Info size={14} />
                {formError}
              </p>
            )}

            <button type="button" className="flight-primary-btn" onClick={handleContinue} style={{ marginTop: 10 }}>
              Continue to Payment
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
