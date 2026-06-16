import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, Home, MapPin, ShieldCheck, Sparkles, Star, TicketPercent, UserRound,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getHotelPricingPreview, getHotelPromotions, getOfferDetails } from "../../services/hotelBookingService";
import { toApiUrl } from "../../services/apiClient";
import { listTravelers } from "../../services/travelerService";
import { buildGuestSummary, buildStayFacts, buildStayHighlights, formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import "../../STYLES/HotelCheckoutExperience.css";

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => String(mobile || "").replace(/\D/g, "").length >= 10 && String(mobile || "").replace(/\D/g, "").length <= 13;
const readQueryValue = (params, key, fallback = "") => String(params.get(key) ?? "").trim() || fallback;

function parseHotelFromSearch(params) {
  const hotelId = readQueryValue(params, "hotelId");
  const name = readQueryValue(params, "hotelName");
  if (!hotelId && !name) return null;
  return {
    hotelId,
    name: name || "Hotel stay",
    city: readQueryValue(params, "hotelCity"),
    area: readQueryValue(params, "hotelArea"),
    address: readQueryValue(params, "hotelAddress"),
    rating: Number(readQueryValue(params, "hotelRating")) || 0,
    tag: readQueryValue(params, "hotelTag"),
    amenities: readQueryValue(params, "hotelAmenities").split("|").map((item) => item.trim()).filter(Boolean),
  };
}

function parseSearchContext(params) {
  const destination = readQueryValue(params, "destination");
  const checkInDate = readQueryValue(params, "checkInDate");
  const checkOutDate = readQueryValue(params, "checkOutDate");
  const adults = readQueryValue(params, "adults");
  const rooms = readQueryValue(params, "rooms");
  const children = readQueryValue(params, "children");
  const guests = readQueryValue(params, "guests");
  return destination || checkInDate || checkOutDate || adults || rooms || guests
    ? { destination, checkInDate, checkOutDate, adults, rooms, children, guests }
    : null;
}

export default function HotelPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const incomingState = location.state && typeof location.state === "object" ? location.state : {};
  const [hotel, setHotel] = useState(incomingState.hotel || parseHotelFromSearch(searchParams));
  const [offer, setOffer] = useState(incomingState.offer || null);
  const initialOfferId = readQueryValue(searchParams, "offerId");
  const searchContext = incomingState.searchContext || parseSearchContext(searchParams);
  const [offerLoadError, setOfferLoadError] = useState("");
  const [isLoadingOffer, setIsLoadingOffer] = useState(Boolean(!incomingState.offer && initialOfferId));
  const [guestName, setGuestName] = useState(incomingState.guestName || "");
  const [guestEmail, setGuestEmail] = useState(incomingState.guestEmail || "");
  const [guestPhone, setGuestPhone] = useState(incomingState.guestPhone || "");
  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState("");
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");
  const [couponCode, setCouponCode] = useState(incomingState.couponCode || "");
  const [selectedFeaturedOfferId, setSelectedFeaturedOfferId] = useState(incomingState.selectedFeaturedOfferId || null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(incomingState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const checkInDate = offer?.checkInDate || searchContext?.checkInDate || "";
  const checkOutDate = offer?.checkOutDate || searchContext?.checkOutDate || "";
  const nights = useMemo(() => calculateNights(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${searchContext?.destination || "stay"}`), [hotel?.hotelId, hotel?.name, searchContext?.destination]);
  const stayFacts = useMemo(() => buildStayFacts(hotel || {}, offer || {}, searchContext || {}), [hotel, offer, searchContext]);
  const stayHighlights = useMemo(() => buildStayHighlights(hotel || {}, offer || {}, nights), [hotel, offer, nights]);

  useEffect(() => {
    let isMounted = true;
    async function loadOfferDetails() {
      if (offer || !initialOfferId) { setIsLoadingOffer(false); return; }
      setIsLoadingOffer(true);
      try {
        const offerDetails = await getOfferDetails(initialOfferId);
        if (!isMounted) return;
        setOffer(offerDetails);
        setHotel((current) => current || {
          hotelId: offerDetails?.hotelId || readQueryValue(searchParams, "hotelId"),
          name: offerDetails?.hotelName || readQueryValue(searchParams, "hotelName", "Hotel stay"),
          city: offerDetails?.cityCode || readQueryValue(searchParams, "hotelCity"),
          area: readQueryValue(searchParams, "hotelArea"),
          address: offerDetails?.address || readQueryValue(searchParams, "hotelAddress"),
          rating: Number(readQueryValue(searchParams, "hotelRating")) || 0,
          tag: readQueryValue(searchParams, "hotelTag"),
          amenities: readQueryValue(searchParams, "hotelAmenities").split("|").map((item) => item.trim()).filter(Boolean),
        });
      } catch (err) {
        if (isMounted) setOfferLoadError(err.message || "Unable to reload stay details from the backend.");
      } finally {
        if (isMounted) setIsLoadingOffer(false);
      }
    }
    loadOfferDetails();
    return () => { isMounted = false; };
  }, [offer, initialOfferId, searchParams]);

  useEffect(() => {
    let isMounted = true;
    listTravelers()
      .then((apiList) => { if (isMounted) { setSavedTravelers(Array.isArray(apiList) ? apiList : []); setTravelerLoadError(""); } })
      .catch(() => { if (isMounted) { setSavedTravelers([]); setTravelerLoadError("Unable to load saved travelers from the backend."); } });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    async function loadPromoData() {
      try {
        const promos = await getHotelPromotions();
        setAvailableCoupons((promos || []).filter((promotion) => !promotion.isAutoApply));
        const response = await fetch(toApiUrl("/api/FeaturedOffers"), { headers: { Accept: "application/json", "ngrok-skip-browser-warning": "true" } });
        const offersData = await response.json();
        if (offersData && Array.isArray(offersData.offers)) setFeaturedOffers(offersData.offers.filter((entry) => entry.bookingType === "Hotel" && entry.isActive));
      } catch (err) {
        console.error("Failed to load hotel promotions", err);
      }
    }
    loadPromoData();
  }, []);

  const loadPricing = async (code = "", offerId = null) => {
    if (!hotel || !offer) return;
    setIsApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const pricing = await getHotelPricingPreview({
        hotelId: hotel.hotelId, hotelName: hotel.name, hotelCity: hotel.cityCode || hotel.city || "", roomPrice: offer.price / (offer.roomQuantity || 1), rooms: offer.roomQuantity || 1, nights, couponCode: code || null, selectedFeaturedOfferId: offerId || null,
      });
      setPricingBreakdown(pricing);
      if (code) {
        if (pricing.totalDiscount > 0) { setCouponSuccess(`Coupon "${code}" applied. Discount: ${formatCurrency(pricing.totalDiscount)}`); setCouponCode(code); setSelectedFeaturedOfferId(null); } else setCouponError("Coupon is valid but does not reduce this booking.");
      } else if (offerId) {
        if (pricing.totalDiscount > 0) { setCouponSuccess(`Offer applied. Savings: ${formatCurrency(pricing.totalDiscount)}`); setSelectedFeaturedOfferId(offerId); setCouponCode(""); } else setCouponError("Offer is valid but does not reduce this booking.");
      }
    } catch (err) {
      setCouponError(err.message || "Unable to validate the selected coupon or offer.");
      setCouponCode("");
      setSelectedFeaturedOfferId(null);
      setPricingBreakdown(null);
    } finally { setIsApplying(false); }
  };

  useEffect(() => { loadPricing(couponCode, selectedFeaturedOfferId); }, [hotel, offer]);

  const basePrice = pricingBreakdown ? pricingBreakdown.basePrice : Number(offer?.price || 0) * nights;
  const tax = pricingBreakdown ? pricingBreakdown.gstAmount : Math.round(basePrice * 0.12);
  const convenienceFee = pricingBreakdown ? pricingBreakdown.convenienceFee : 150;
  const totalDiscount = pricingBreakdown ? pricingBreakdown.totalDiscount : 0;
  const finalPayable = pricingBreakdown ? pricingBreakdown.grandTotal : basePrice + tax + convenienceFee;

  const selectExistingTraveler = (travelerId) => {
    setSelectedTravelerId(travelerId);
    const found = savedTravelers.find((traveler) => String(traveler.id) === travelerId);
    if (!travelerId || !found) { if (!travelerId) { setGuestName(""); setGuestEmail(""); setGuestPhone(""); } return; }
    setGuestName([found.title, found.firstName, found.lastName].filter(Boolean).join(" "));
    setGuestEmail(found.email || "");
    setGuestPhone(found.mobile || found.phone || "");
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!guestName.trim()) nextErrors.guestName = "Please enter the primary guest name.";
    if (!guestEmail.trim()) nextErrors.guestEmail = "Please enter an email address.";
    else if (!isValidEmail(guestEmail)) nextErrors.guestEmail = "Enter a valid email address.";
    if (!guestPhone.trim()) nextErrors.guestPhone = "Please enter a mobile number.";
    else if (!isValidMobile(guestPhone)) nextErrors.guestPhone = "Enter a valid mobile number.";
    if (!agreedToTerms) nextErrors.agreedToTerms = "Please accept the booking terms.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) { setFormError("Please correct the highlighted guest details before continuing."); return; }
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) { openAuthModal("login"); return; }
    setFormError("");
    navigate("/hotel/payment", { state: { hotel, offer, searchContext, guestName: guestName.trim(), guestEmail: guestEmail.trim(), guestPhone: guestPhone.trim(), couponCode: couponCode.trim().toUpperCase(), selectedFeaturedOfferId, couponDiscount: totalDiscount, agreedToTerms, payableAmount: finalPayable, fareSummary: { baseFare: basePrice, tax, convenienceFee, discount: totalDiscount, totalFare: finalPayable } } });
  };

  if (!hotel || !offer) {
    const message = isLoadingOffer ? "Loading stay details from the backend." : offerLoadError || "Select a stay before entering guest details.";
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>{isLoadingOffer ? "Loading stay details" : "Stay details missing"}</h2><p>{message}</p><button type="button" onClick={() => navigate("/search/hotels")}>Go to hotel search</button></section></div></main>;
  }

  const guestSummary = searchContext?.guests || buildGuestSummary(searchContext || {});
  const stayLocation = hotel.address || [hotel.area, hotel.city].filter(Boolean).join(", ");
  const displayCheckIn = toDisplayDate(String(checkInDate).split("T")[0]);
  const displayCheckOut = toDisplayDate(String(checkOutDate).split("T")[0]);

  return (
    <main className="hotel-checkout-page">
      <div className="hotel-checkout-shell">
        <button type="button" className="hotel-back-link" onClick={() => navigate("/search/hotels")}><ArrowLeft size={16} />Back to stays</button>
        <div className="hotel-anchor-tabs">{["Photos", "Amenities", "Guest details", "Price"].map((item) => <span key={item}>{item}</span>)}</div>
        <section className="hotel-gallery-hero"><div className="hotel-gallery-primary"><img src={visuals.gallery[0]} alt={hotel.name} /></div><div className="hotel-gallery-grid">{visuals.gallery.slice(1, 5).map((image, index) => <div key={`${image}-${index}`} className="hotel-gallery-thumb"><img src={image} alt={`${hotel.name} view ${index + 2}`} /></div>)}</div></section>
        <div className="hotel-checkout-layout">
          <div className="hotel-checkout-main">
            <section className="hotel-panel hotel-panel--headline">
              <div className="hotel-panel-kicker"><Home size={14} /><span>{visuals.propertyLabel}</span></div>
              <h1>{hotel.name}</h1>
              <div className="hotel-meta-line"><span><Star size={14} fill="currentColor" />{Number(hotel.rating || 4.8).toFixed(1)}</span><span><MapPin size={14} />{stayLocation}</span><span><CalendarDays size={14} />{formatNightLabel(nights)}</span></div>
              <div className="hotel-chip-row">{stayFacts.map((fact) => <span key={fact}>{fact}</span>)}</div>
            </section>
            <section className="hotel-panel hotel-host-panel"><div className="hotel-host-avatar" style={visuals.avatarStyle}>{visuals.hostName.slice(0, 1)}</div><div className="hotel-host-copy"><h2>Hosted by {visuals.hostName}</h2><p>Superhost style service · {visuals.hostYears} years hosting · Curated for short city stays.</p></div></section>
            <section className="hotel-panel"><div className="hotel-section-heading"><h2>What makes this stay feel easy</h2><p>These highlights are built from the live hotel record and offer details you selected.</p></div><div className="hotel-highlight-list">{stayHighlights.map((highlight) => <article key={highlight.title} className="hotel-highlight-item"><span className="hotel-highlight-icon"><Sparkles size={16} /></span><div><strong>{highlight.title}</strong><p>{highlight.text}</p></div></article>)}</div></section>
            <section className="hotel-panel">
              <div className="hotel-section-heading"><h2>Guest details</h2><p>Use a saved traveler from your backend profile, or enter a new primary guest for this stay.</p></div>
              <div className="hotel-mode-switch"><button type="button" className={isExistingGuest ? "is-active" : ""} onClick={() => { setIsExistingGuest(true); setSelectedTravelerId(""); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}>Existing traveler</button><button type="button" className={!isExistingGuest ? "is-active" : ""} onClick={() => { setIsExistingGuest(false); setSelectedTravelerId(""); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}>Add new guest</button></div>
              {isExistingGuest && <div className="hotel-traveler-picker"><label htmlFor="hotel-existing-traveler">Saved traveler</label><select id="hotel-existing-traveler" value={selectedTravelerId} onChange={(event) => selectExistingTraveler(event.target.value)}><option value="">Select an existing traveler</option>{savedTravelers.map((traveler) => <option key={traveler.id} value={String(traveler.id)}>{[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}</option>)}</select>{travelerLoadError && <p className="hotel-helper hotel-helper--warning">{travelerLoadError}</p>}</div>}
              <div className="hotel-form-grid">
                <label className="hotel-field"><span>Primary guest name</span><input type="text" value={guestName} onChange={(event) => { setGuestName(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestName; return next; }); }} placeholder="Full name as per ID" className={errors.guestName ? "is-error" : ""} />{errors.guestName && <small>{errors.guestName}</small>}</label>
                <label className="hotel-field"><span>Email address</span><input type="email" value={guestEmail} onChange={(event) => { setGuestEmail(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestEmail; return next; }); }} placeholder="name@example.com" className={errors.guestEmail ? "is-error" : ""} />{errors.guestEmail && <small>{errors.guestEmail}</small>}</label>
                <label className="hotel-field"><span>Mobile number</span><input type="text" value={guestPhone} onChange={(event) => { setGuestPhone(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestPhone; return next; }); }} placeholder="10-digit mobile number" className={errors.guestPhone ? "is-error" : ""} />{errors.guestPhone && <small>{errors.guestPhone}</small>}</label>
              </div>
            </section>
            <section className="hotel-panel">
              <div className="hotel-section-heading"><h2>Offers and savings</h2><p>Apply hotel coupons and featured backend offers before continuing to payment.</p></div>
              <div className="hotel-savings-bar"><div className="hotel-savings-input"><TicketPercent size={18} /><input type="text" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" disabled={isApplying || selectedFeaturedOfferId !== null} /></div>{couponCode && pricingBreakdown?.totalDiscount > 0 ? <button type="button" onClick={() => { setCouponCode(""); setCouponSuccess(""); setCouponError(""); loadPricing("", null); }} className="hotel-secondary-button">Remove</button> : <button type="button" onClick={() => couponCode.trim() && loadPricing(couponCode.trim().toUpperCase(), null)} className="hotel-primary-button hotel-primary-button--compact" disabled={isApplying || selectedFeaturedOfferId !== null}>{isApplying ? "Applying..." : "Apply coupon"}</button>}</div>
              {couponError && <p className="hotel-helper hotel-helper--error">{couponError}</p>}
              {couponSuccess && <p className="hotel-helper hotel-helper--success">{couponSuccess}</p>}
              {availableCoupons.length > 0 && <div className="hotel-offer-grid">{availableCoupons.map((coupon) => <article key={coupon.id} className={`hotel-deal-card${couponCode === coupon.code ? " is-selected" : ""}`}><div><span className="hotel-deal-eyebrow">{coupon.discountValue}% OFF</span><h3>{coupon.code}</h3><p>{coupon.description || `${coupon.discountValue}% off selected stays`}</p></div><button type="button" className="hotel-secondary-button" onClick={() => (couponCode === coupon.code ? (setCouponCode(""), setCouponSuccess(""), setCouponError(""), loadPricing("", null)) : loadPricing(coupon.code, null))} disabled={isApplying || selectedFeaturedOfferId !== null}>{couponCode === coupon.code ? "Remove" : "Use coupon"}</button></article>)}</div>}
              {featuredOffers.length > 0 && <div className="hotel-offer-grid">{featuredOffers.map((entry) => { const isSelected = selectedFeaturedOfferId === entry.id; return <article key={entry.id} className={`hotel-deal-card${isSelected ? " is-selected" : ""}`}><div><span className="hotel-deal-eyebrow">Featured offer</span><h3>{entry.title}</h3><p>{entry.subtitle || entry.description}</p></div><button type="button" className="hotel-secondary-button" onClick={() => (isSelected ? (setSelectedFeaturedOfferId(null), setCouponSuccess(""), setCouponError(""), loadPricing("", null)) : loadPricing("", entry.id))} disabled={isApplying || couponCode !== ""}>{isSelected ? "Remove" : "Apply offer"}</button></article>; })}</div>}
            </section>
            <section className="hotel-panel hotel-policy-panel"><div className="hotel-section-heading"><h2>Before you continue</h2><p>Review the booking acknowledgement and confirm the primary guest details are correct.</p></div><div className="hotel-policy-list"><div><ShieldCheck size={18} /><span>{offer.cancellationPolicy || "Cancellation and booking policy will apply to the selected offer."}</span></div><div><Clock3 size={18} /><span>Pricing remains synced with the backend preview while you are on this page.</span></div><div><UserRound size={18} /><span>The primary guest should match the ID shown during hotel check-in.</span></div></div><label className={`hotel-checkbox${errors.agreedToTerms ? " is-error" : ""}`}><input type="checkbox" checked={agreedToTerms} onChange={(event) => { setAgreedToTerms(event.target.checked); setErrors((current) => { const next = { ...current }; delete next.agreedToTerms; return next; }); }} /><span>I agree to the hotel booking policy, guest rules, and cancellation terms for this stay.</span></label>{errors.agreedToTerms && <p className="hotel-helper hotel-helper--error">{errors.agreedToTerms}</p>}{formError && <p className="hotel-helper hotel-helper--error">{formError}</p>}</section>
          </div>
          <aside className="hotel-reserve-rail"><div className="hotel-reserve-card"><div className="hotel-reserve-preview"><img src={visuals.gallery[1] || visuals.gallery[0]} alt={hotel.name} /><div><span>{visuals.highlightLabel}</span><strong>{hotel.name}</strong><p>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}</p></div></div><div className="hotel-reserve-price"><strong>{formatCurrency(offer.price)}</strong><span>per night before taxes</span></div><div className="hotel-reserve-facts"><div><span>Check-in</span><strong>{toDisplayDate(String(checkInDate).split("T")[0])}</strong></div><div><span>Check-out</span><strong>{toDisplayDate(String(checkOutDate).split("T")[0])}</strong></div><div><span>Guests</span><strong>{guestSummary}</strong></div><div><span>Room</span><strong>{offer.bedType || "Double"} bed</strong></div></div><div className="hotel-fare-breakdown"><div><span>Room charges ({formatNightLabel(nights)})</span><strong>{formatCurrency(basePrice)}</strong></div><div><span>Taxes and GST</span><strong>{formatCurrency(tax)}</strong></div><div><span>Convenience fee</span><strong>{formatCurrency(convenienceFee)}</strong></div>{totalDiscount > 0 && <div className="is-discount"><span>Savings</span><strong>-{formatCurrency(totalDiscount)}</strong></div>}<div className="hotel-fare-total"><span>Total before payment</span><strong>{formatCurrency(finalPayable)}</strong></div></div><div className="hotel-reserve-actions"><button type="button" className="hotel-primary-button" onClick={handleContinue} disabled={isApplying}>Continue to payment</button><button type="button" className="hotel-tertiary-link" onClick={() => navigate("/?tab=hotels")}>Change hotel search</button></div><div className="hotel-reserve-assurance"><CheckCircle2 size={16} /><span>Your booking details stay synced to the backend pricing preview while you review this page.</span></div></div></aside>
        </div>
      </div>
    </main>
  );
}
