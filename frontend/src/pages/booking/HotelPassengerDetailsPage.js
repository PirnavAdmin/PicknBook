import React, { useMemo, useState, useEffect } from "react";
import { Info, MapPin, Calendar, Bed, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import "../../STYLES/BusBookingFlow.css"; // Reuse bus checkout styles
import {
  readHotelBookingFlowState,
  writeHotelBookingFlowState,
} from "./hotelBookingFlowStore";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getHotelPricingPreview, getHotelPromotions } from "../../services/hotelBookingService";
import { toApiUrl } from "../../services/apiClient";
import { listTravelers, normalizeTraveler } from "../../services/travelerService";

const TRAVELER_STORAGE_KEY = "my_traveler_data";

function readLocalTravelers() {
  try {
    const raw = localStorage.getItem(TRAVELER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => normalizeTraveler(t));
  } catch {
    return [];
  }
}

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN", {
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
  
  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState("");
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const localList = readLocalTravelers();
      if (isMounted && localList.length > 0) {
        setSavedTravelers(localList);
      }
      try {
        const apiList = await listTravelers();
        if (!isMounted) return;
        if (Array.isArray(apiList) && apiList.length > 0) {
          const apiById = new Map(apiList.map((t) => [String(t.id), t]));
          const merged = [...apiList];
          for (const local of localList) {
            if (!apiById.has(String(local.id))) {
              merged.push(local);
            }
          }
          setSavedTravelers(merged);
          setTravelerLoadError("");
        } else if (apiList.length === 0 && localList.length > 0) {
          setSavedTravelers(localList);
        }
      } catch (err) {
        if (!isMounted) return;
        setTravelerLoadError("Using locally saved travelers.");
        console.warn("listTravelers API error:", err.message);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleSelectExistingTraveler = (travelerId) => {
    setSelectedTravelerId(travelerId);
    if (!travelerId) {
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
      return;
    }

    const found = savedTravelers.find((t) => String(t.id) === travelerId);
    if (!found) return;

    setGuestName([found.title, found.firstName, found.lastName].filter(Boolean).join(" "));
    setGuestEmail(found.email || "");
    setGuestPhone(found.mobile || found.phone || "");
  };

  const setGuestMode = (isExisting) => {
    setIsExistingGuest(isExisting);
    setSelectedTravelerId("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
  };
  
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
  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    if (!guestName.trim()) {
      newErrors.guestName = "Required";
    }
    if (!guestEmail.trim()) {
      newErrors.guestEmail = "Required";
    } else if (!isValidEmail(guestEmail)) {
      newErrors.guestEmail = "Invalid";
    }
    if (!guestPhone.trim()) {
      newErrors.guestPhone = "Required";
    } else if (!isValidMobile(guestPhone)) {
      newErrors.guestPhone = "Invalid";
    }
    if (!agreedToTerms) {
      newErrors.agreedToTerms = "Required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    const isValid = validateForm();
    if (!isValid) {
      setFormError("Please correct the errors in the form to proceed.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      openAuthModal("login");
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

  const renderGuestFields = () => (
    <div className="passenger-fields hotel-guest-fields">
      <label className="passenger-field">
        <span>Full Name (as in Passport/ID) *</span>
        <input
          type="text"
          value={guestName}
          onChange={(e) => {
            setGuestName(e.target.value);
            setErrors(prev => { const c = { ...prev }; delete c.guestName; return c; });
          }}
          placeholder="Full Name (as in Passport/ID) *"
          className={errors.guestName ? "field-has-error" : ""}
        />
        {errors.guestName && (
          <span className="field-error-text">{errors.guestName}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Email Address *</span>
        <input
          type="email"
          value={guestEmail}
          onChange={(e) => {
            setGuestEmail(e.target.value);
            setErrors(prev => { const c = { ...prev }; delete c.guestEmail; return c; });
          }}
          placeholder="Email Address *"
          className={errors.guestEmail ? "field-has-error" : ""}
        />
        {errors.guestEmail && (
          <span className="field-error-text">{errors.guestEmail}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Mobile Number *</span>
        <input
          type="text"
          value={guestPhone}
          onChange={(e) => {
            setGuestPhone(e.target.value);
            setErrors(prev => { const c = { ...prev }; delete c.guestPhone; return c; });
          }}
          placeholder="Mobile Number *"
          className={errors.guestPhone ? "field-has-error" : ""}
        />
        {errors.guestPhone && (
          <span className="field-error-text">{errors.guestPhone}</span>
        )}
      </label>
    </div>
  );

  return (
    <main className="bus-flow-page">
      <div className="bus-flow-shell">
        <section className="bus-passenger-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="bus-passenger-main">

            {/* Hotel Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                  </svg>
                </span>
                Hotel Details
              </header>
              <div className="flow-card-body">
                <div className="bus-journey-grid">
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold', display: 'block' }}>
                      {hotel.name}
                    </strong>
                    <span className="date-badge">
                      {hotel.address || hotel.area}
                    </span>
                  </div>
                  <div>
                    <small>Check-in</small>
                    <strong>{toDisplayDate(String(checkInDate).split("T")[0])}</strong>
                  </div>
                  <div className="journey-timeline-center">
                    <div className="timeline-line-wrap">
                      <div className="timeline-dot"></div>
                      <div className="timeline-line"></div>
                      <span className="timeline-bus-icon">🏨</span>
                      <div className="timeline-line"></div>
                      <div className="timeline-dot"></div>
                    </div>
                    <span className="timeline-duration">{nights} Night{nights > 1 ? "s" : ""}</span>
                  </div>
                  <div>
                    <small>Check-out</small>
                    <strong>{toDisplayDate(String(checkOutDate).split("T")[0])}</strong>
                  </div>
                  <div>
                    <small>Room Type</small>
                    <strong>
                      {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}
                    </strong>
                  </div>
                </div>
              </div>
            </article>

            {/* Guest Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Guest Details
              </header>
              <div className="flow-card-body">
                <div className="passenger-mode-toggle" style={{ marginBottom: "20px" }}>
                  <button
                    type="button"
                    className={`pmode-btn${isExistingGuest ? " pmode-btn--active" : ""}`}
                    onClick={() => setGuestMode(true)}
                  >
                    Existing Traveler
                  </button>
                  <button
                    type="button"
                    className={`pmode-btn${!isExistingGuest ? " pmode-btn--active" : ""}`}
                    onClick={() => setGuestMode(false)}
                  >
                    Add New Traveler
                  </button>
                </div>

                {isExistingGuest ? (
                  <div className="passenger-existing-wrap">
                    {travelerLoadError && (
                      <p className="pmode-warn">{travelerLoadError}</p>
                    )}
                    <select
                      className="passenger-existing-select"
                      value={selectedTravelerId || ""}
                      onChange={(e) =>
                        handleSelectExistingTraveler(e.target.value)
                      }
                    >
                      <option value="">-- Select Existing Traveler --</option>
                      {savedTravelers.length === 0 ? (
                        <option disabled>No saved travelers found</option>
                      ) : (
                        savedTravelers.map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {[t.title, t.firstName, t.lastName]
                              .filter(Boolean)
                              .join(" ")}
                            {t.mobile
                              ? ` — ${t.mobile}`
                              : t.email
                              ? ` — ${t.email}`
                              : ""}
                          </option>
                        ))
                      )}
                    </select>
                    {selectedTravelerId && renderGuestFields()}
                  </div>
                ) : (
                  renderGuestFields()
                )}
              </div>
            </article>

            {/* Policies & Acknowledgement */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                Hotel Booking Policy &amp; Acknowledgement
              </header>
              <div className="flow-card-body acknowledgement">
                <label className={`ack-checkbox ${errors.agreedToTerms ? "field-has-error-text" : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      setErrors(prev => { const c = { ...prev }; delete c.agreedToTerms; return c; });
                    }}
                  />
                  <span>
                    I agree to the hotel booking policy, rules, and cancellation terms. <span className="mandatory-star" style={{ color: 'red', fontWeight: 'bold', marginLeft: '4px' }}>*</span>
                  </span>
                </label>
                {errors.agreedToTerms && (
                  <span className="field-error-text" style={{ marginTop: '2px', display: 'block', marginBottom: '10px' }}>{errors.agreedToTerms}</span>
                )}

                {formError && (
                  <div className="form-error-summary-box" style={{ marginTop: '12px' }}>
                    <div className="error-summary-header">
                      <span>Please correct the following issues to proceed:</span>
                    </div>
                    <ul className="error-summary-list">
                      <li>{formError}</li>
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="flow-continue-btn align-right"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </article>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <aside className="bus-passenger-side">
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
                </span>
                Fare Details
              </header>
              <div className="flow-card-body fare-list">
                <div>
                  <span>Room Charges ({nights} nights)</span>
                  <strong>{formatCurrency(basePrice)}</strong>
                </div>
                <div>
                  <span>Taxes &amp; GST</span>
                  <strong>{formatCurrency(tax)}</strong>
                </div>
                <div>
                  <span>Convenience Fee</span>
                  <strong>{formatCurrency(convenienceFee)}</strong>
                </div>
                {totalDiscount > 0 && (
                  <div>
                    <span>Coupon Discount</span>
                    <strong style={{ color: "#2e7d32" }}>-{formatCurrency(totalDiscount)}</strong>
                  </div>
                )}
                <div className="grand-total">
                  <span>Grand Total</span>
                  <strong>{formatCurrency(finalPayable)}</strong>
                </div>
              </div>
            </article>

            {/* Apply Coupon Card */}
            <article className="flow-card coupon-sheet-card">
              <header className="coupon-sheet-header">
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </span>
                <span>Apply Coupon</span>
                {isApplying && <span className="coupon-sheet-loading">Loading...</span>}
              </header>
              <div className="flow-card-body coupon-sheet-body">
                <div className="coupon-manual-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Enter Coupon code"
                    disabled={isApplying || selectedFeaturedOfferId !== null}
                  />
                  {couponCode && pricingBreakdown?.totalDiscount > 0 ? (
                    <button type="button" onClick={handleRemoveCoupon} className="coupon-action-button is-remove">Remove</button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplying || selectedFeaturedOfferId !== null}
                      className="coupon-action-button is-apply"
                    >
                      {isApplying ? "Applying..." : "APPLY"}
                    </button>
                  )}
                </div>
                
                {couponError && (
                  <p className="coupon-sheet-message is-error" style={{ marginTop: 5 }}>
                    {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="coupon-sheet-message is-success" style={{ marginTop: 5 }}>
                    {couponSuccess}
                  </p>
                )}

                {/* Available Coupons */}
                {availableCoupons.length > 0 && (
                  <div className="coupon-chip-block" style={{ marginTop: 15 }}>
                    <p className="coupon-section-label">Available Coupons:</p>
                    <div className="coupon-chip-list">
                      {availableCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className={`coupon-voucher-card ${couponCode === coupon.code ? "is-selected" : ""}`}
                        >
                          <div className="voucher-header">
                            <span className="voucher-discount">
                              {coupon.discountValue}% OFF
                            </span>
                            <span className="voucher-code-badge">{coupon.code}</span>
                          </div>
                          <div className="voucher-body">
                            <div className="voucher-title">{coupon.code}</div>
                            <p className="voucher-description">{coupon.description || `${coupon.discountValue} Off`}</p>
                            <div className="voucher-action-row">
                              {couponCode === coupon.code ? (
                                <button
                                  type="button"
                                  onClick={handleRemoveCoupon}
                                  className="voucher-remove-btn"
                                >Remove</button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => loadPricing(coupon.code, null)}
                                  disabled={isApplying || selectedFeaturedOfferId !== null}
                                  className="voucher-apply-btn"
                                >Apply</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Offers */}
                {featuredOffers.length > 0 && (
                  <div className="coupon-featured-block" style={{ marginTop: 15 }}>
                    <p className="coupon-section-label">Featured Offers:</p>
                    <div className="coupon-featured-list">
                      {featuredOffers.map((offer) => {
                        const isSelected = selectedFeaturedOfferId === offer.id;
                        return (
                          <div
                            key={offer.id}
                            className={`coupon-voucher-card coupon-featured-offer ${isSelected ? "is-selected" : ""}`}
                          >
                            <div className="voucher-header">
                              <span className="voucher-discount">OFFER</span>
                              <span className="voucher-code-badge">{offer.title}</span>
                            </div>
                            <div className="voucher-body">
                              <div className="voucher-title">{offer.title}</div>
                              <p className="voucher-description">{offer.subtitle || offer.description}</p>
                              <div className="voucher-action-row">
                                {isSelected ? (
                                  <button
                                    type="button"
                                    onClick={handleRemoveOffer}
                                    className="voucher-remove-btn"
                                  >Remove</button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectOffer(offer.id)}
                                    disabled={isApplying || couponCode !== ""}
                                    className="voucher-apply-btn"
                                  >Apply</button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </aside>

        </section>
      </div>
    </main>
  );
}
