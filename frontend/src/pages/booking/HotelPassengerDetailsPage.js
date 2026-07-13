import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, Home, MapPin, ShieldCheck, Sparkles, Star, UserRound, Loader2, BedDouble
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getOfferDetails } from "../../services/hotelBookingService";
import { listTravelers } from "../../services/travelerService";
import { buildGuestSummary, buildStayFacts, buildStayHighlights, formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import BookingTimer from "./BookingTimer";
import "../../STYLES/HotelCheckoutExperience.css";
import { readHotelBookingFlowState, writeHotelBookingFlowState } from "./hotelBookingFlowStore";

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => String(mobile || "").replace(/\D/g, "").length >= 10 && String(mobile || "").replace(/\D/g, "").length <= 13;
const readQueryValue = (params, key, fallback = "") => String(params.get(key) ?? "").trim() || fallback;

const CATEGORY_IMAGES = {
  "Rooms": [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"
  ],
  "Property Views": [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"
  ],
  "Facilities": [
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519690889869-e49694ae041e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80"
  ],
  "Dining": [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
  ],
  "Nearby Attractions": [
    "https://images.unsplash.com/photo-1477587458883-471a5ed94245?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80"
  ]
};

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
    offers: [],
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
  const incomingState = useMemo(() => {
    const routerState = location.state && typeof location.state === "object" ? location.state : null;
    const storedState = readHotelBookingFlowState() || {};
    const merged = { ...storedState, ...routerState };
    if (merged.hotel || merged.offer) {
      writeHotelBookingFlowState(merged);
      return merged;
    }
    return {};
  }, [location.state]);

  const [hotel, setHotel] = useState(() => incomingState.hotel || parseHotelFromSearch(searchParams));
  const [offer, setOffer] = useState(() => incomingState.offer || null);
  const initialOfferId = readQueryValue(searchParams, "offerId");
  const searchContext = useMemo(() => incomingState.searchContext || parseSearchContext(searchParams), [incomingState.searchContext, searchParams]);
  const [offerLoadError, setOfferLoadError] = useState("");
  const [isLoadingOffer, setIsLoadingOffer] = useState(Boolean(!incomingState.offer && initialOfferId));
  const [selectingOfferId, setSelectingOfferId] = useState("");
  const [guestName, setGuestName] = useState(incomingState.guestName || "");
  const [guestEmail, setGuestEmail] = useState(incomingState.guestEmail || "");
  const [guestPhone, setGuestPhone] = useState(incomingState.guestPhone || "");
  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState("");
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(incomingState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [activeImageTab, setActiveImageTab] = useState("All");

  const checkInDate = offer?.checkInDate || searchContext?.checkInDate || "";
  const checkOutDate = offer?.checkOutDate || searchContext?.checkOutDate || "";
  const nights = useMemo(() => calculateNights(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${searchContext?.destination || "stay"}`), [hotel?.hotelId, hotel?.name, searchContext?.destination]);
  const gallery = useMemo(() => {
    const apiImages = hotel?.images || [];
    if (apiImages.length >= 5) {
      return apiImages.slice(0, 5);
    }
    if (apiImages.length > 0) {
      return [...apiImages, ...visuals.gallery.slice(apiImages.length, 5)];
    }
    return visuals.gallery;
  }, [hotel?.images, visuals.gallery]);

  const displayedImages = useMemo(() => {
    if (activeImageTab === "All") {
      return [
        CATEGORY_IMAGES["Property Views"][0],
        CATEGORY_IMAGES["Rooms"][0],
        CATEGORY_IMAGES["Dining"][0],
        CATEGORY_IMAGES["Facilities"][0],
        CATEGORY_IMAGES["Nearby Attractions"][0]
      ];
    }
    return CATEGORY_IMAGES[activeImageTab] || gallery;
  }, [activeImageTab, gallery]);

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
          offers: [],
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
    if (hotel || offer) {
      writeHotelBookingFlowState({
        hotel,
        offer,
        searchContext,
        guestName,
        guestEmail,
        guestPhone,
        agreedToTerms,
      });
    }
  }, [hotel, offer, searchContext, guestName, guestEmail, guestPhone, agreedToTerms]);

  const handleSelectOffer = async (selectedRoomOffer) => {
    setSelectingOfferId(selectedRoomOffer.offerId);
    setOfferLoadError("");
    try {
      const offerDetails = await getOfferDetails(selectedRoomOffer.offerId);
      setOffer({
        ...selectedRoomOffer,
        ...offerDetails,
        checkInDate: offerDetails?.checkInDate || selectedRoomOffer.checkInDate || checkInDate,
        checkOutDate: offerDetails?.checkOutDate || selectedRoomOffer.checkOutDate || checkOutDate,
      });
    } catch (err) {
      setOfferLoadError(err.message || "Failed to validate room availability. Please choose another room.");
    } finally {
      setSelectingOfferId("");
    }
  };

  const basePrice = Number(offer?.price || 0) * nights;
  const tax = Math.round(basePrice * 0.12);
  const convenienceFee = 150;

  const markupValue = (() => {
    let val = 0;
    const rawMarkup = localStorage.getItem("b2b_markup_settings");
    if (rawMarkup) {
      try {
        const parsedMarkup = JSON.parse(rawMarkup);
        if (parsedMarkup.hotelType === "percentage") {
          val = basePrice * (Number(parsedMarkup.hotelValue) / 100);
        } else if (parsedMarkup.hotelType === "fixed") {
          val = Number(parsedMarkup.hotelValue) * Number(searchContext?.rooms || 1);
        }
      } catch (e) {
        console.error("Error reading B2B hotel markup", e);
      }
    }
    return val;
  })();

  // B2B Discounts (Removed as requested)
  const tierDiscount = 0;
  const volumeDiscount = 0;
  const isAgent = localStorage.getItem("b2b_role") === "Agent";

  const wholesalePrice = basePrice + tax + convenienceFee;
  const finalPayable = isAgent ? (wholesalePrice + markupValue) : (basePrice + tax + convenienceFee + markupValue);

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
    const token = isAgent ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
    if (!token || isTokenExpired(token)) { openAuthModal("login"); return; }
    setFormError("");
    navigate("/hotel/payment", { state: { hotel, offer, searchContext, guestName: guestName.trim(), guestEmail: guestEmail.trim(), guestPhone: guestPhone.trim(), agreedToTerms, payableAmount: finalPayable, fareSummary: { baseFare: basePrice, tax, convenienceFee, markup: markupValue, tierDiscount, volumeDiscount, totalFare: finalPayable } } });
  };

  if (!hotel) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>Stay details missing</h2><p>Select a stay before entering guest details.</p><button type="button" onClick={() => navigate("/search/hotels")}>Go to hotel search</button></section></div></main>;
  }

  if (isLoadingOffer) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Loader2 className="hotel-spin" size={32} /></div><h2>Loading stay details</h2><p>Loading stay details from the backend...</p></section></div></main>;
  }

  const guestSummary = searchContext?.guests || buildGuestSummary(searchContext || {});
  const stayLocation = hotel.address || [hotel.area, hotel.city].filter(Boolean).join(", ");

  return (
    <main className="hotel-checkout-page">
      <BookingTimer />
      <div className="hotel-checkout-shell">
        <button type="button" className="hotel-back-link" onClick={() => navigate("/search/hotels")}><ArrowLeft size={16} />Back to stays</button>
        <div className="hotel-checkout-stepper" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="step-item is-completed" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "#137a3b" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#edfdf3", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #137a3b" }}>✓</span>
            <span>1. Choose stay</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item is-active" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 800, color: "var(--hotel-rose-deep)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255, 56, 92, 0.05)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--hotel-rose)" }}>2</span>
            <span>2. Guest & Room Details</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 500, color: "var(--hotel-muted)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--hotel-border)" }}>3</span>
            <span>3. Secure Payment</span>
          </div>
        </div>
        <div className="hotel-category-tabs">
          {["All", "Rooms", "Property Views", "Facilities", "Dining", "Nearby Attractions"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`hotel-category-tab-btn${activeImageTab === tab ? " is-active" : ""}`}
              onClick={() => setActiveImageTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <section className="hotel-gallery-hero"><div className="hotel-gallery-primary"><img src={displayedImages[0]} alt={hotel.name} /></div><div className="hotel-gallery-grid">{displayedImages.slice(1, 5).map((image, index) => <div key={`${image}-${index}`} className="hotel-gallery-thumb"><img src={image} alt={`${hotel.name} view ${index + 2}`} /></div>)}</div></section>
        <div className="hotel-checkout-layout">
          <div className="hotel-checkout-main">
            <section className="hotel-panel hotel-panel--headline">
              <div className="hotel-panel-kicker"><Home size={14} /><span>{visuals.propertyLabel}</span></div>
              <h1>{hotel.name}</h1>
              <div className="hotel-meta-line"><span><Star size={14} fill="currentColor" />{Number(hotel.rating || 4.8).toFixed(1)}</span><span><MapPin size={14} />{stayLocation}</span><span><CalendarDays size={14} />{formatNightLabel(nights)}</span></div>
              <div className="hotel-chip-row">{stayFacts.map((fact) => <span key={fact}>{fact}</span>)}</div>
            </section>
            <section className="hotel-panel hotel-host-panel"><div className="hotel-host-avatar" style={visuals.avatarStyle}>{visuals.hostName.slice(0, 1)}</div><div className="hotel-host-copy"><h2>Hosted by {visuals.hostName}</h2><p>Superhost style service · {visuals.hostYears} years hosting · Curated for short city stays.</p></div></section>
            <section className="hotel-panel"><div className="hotel-section-heading"><h2>What makes this stay feel easy</h2><p>These highlights are built from the live hotel record and details.</p></div><div className="hotel-highlight-list">{stayHighlights.map((highlight) => <article key={highlight.title} className="hotel-highlight-item"><span className="hotel-highlight-icon"><Sparkles size={16} /></span><div><strong>{highlight.title}</strong><p>{highlight.text}</p></div></article>)}</div></section>

            {offer && (
              <section className="hotel-panel" style={{ borderLeft: "4px solid var(--hotel-rose)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className="hotel-panel-kicker" style={{ background: "rgba(255, 56, 92, 0.05)", border: "1px solid rgba(255, 56, 92, 0.2)" }}>Selected room option</span>
                    <h3 style={{ margin: "8px 0 4px", fontSize: "1.2rem", fontWeight: 700 }}>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}</h3>
                    <p style={{ margin: 0, color: "var(--hotel-muted)", fontSize: "0.9rem" }}>
                      Bed type: {offer.bedType || "Double"} bed &middot; {offer.cancellationPolicy || "Cancellation policy applies"}
                    </p>
                  </div>
                  <button type="button" className="hotel-secondary-button" onClick={() => setOffer(null)}>Change room</button>
                </div>
              </section>
            )}

            {offer ? (
              <>
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
                <section className="hotel-panel hotel-policy-panel"><div className="hotel-section-heading"><h2>Before you continue</h2><p>Review the booking acknowledgement and confirm the primary guest details are correct.</p></div><div className="hotel-policy-list"><div><ShieldCheck size={18} /><span>{offer.cancellationPolicy || "Cancellation and booking policy will apply to the selected offer."}</span></div><div><Clock3 size={18} /><span>Pricing remains synced with the backend preview while you are on this page.</span></div><div><UserRound size={18} /><span>The primary guest should match the ID shown during hotel check-in.</span></div></div><label className={`hotel-checkbox${errors.agreedToTerms ? " is-error" : ""}`}><input type="checkbox" checked={agreedToTerms} onChange={(event) => { setAgreedToTerms(event.target.checked); setErrors((current) => { const next = { ...current }; delete next.agreedToTerms; return next; }); }} /><span>I agree to the hotel booking policy, guest rules, and cancellation terms for this stay.</span></label>{errors.agreedToTerms && <p className="hotel-helper hotel-helper--error">{errors.agreedToTerms}</p>}{formError && <p className="hotel-helper hotel-helper--error">{formError}</p>}</section>
              </>
            ) : (
              <section className="hotel-panel hotel-rooms-selection">
                <div className="hotel-section-heading">
                  <h2>Available rooms & rates</h2>
                  <p>Select a room type to begin your reservation. Rates are live and sourced directly from the API.</p>
                </div>
                {offerLoadError && <div className="hotel-helper hotel-helper--error" style={{ marginBottom: 16 }}>{offerLoadError}</div>}
                <div className="hotel-rooms-list">
                  {hotel.offers && hotel.offers.length > 0 ? (
                    hotel.offers.map((roomOffer, roomIndex) => {
                      const isSelectingThis = selectingOfferId === roomOffer.offerId;
                      const roomImgList = CATEGORY_IMAGES["Rooms"];
                      const roomImg = roomImgList[roomIndex % roomImgList.length];
                      return (
                        <div key={roomOffer.offerId} className="hotel-room-card-option">
                          <div className="hotel-room-img-col">
                            <img src={roomImg} alt={roomOffer.roomCategory || "Room"} />
                          </div>
                          <div className="hotel-room-details">
                            <span className="hotel-room-pill">Room option</span>
                            <h3>{roomOffer.roomCategory ? roomOffer.roomCategory.replace(/_/g, " ") : "Standard Room"}</h3>
                            <p className="hotel-room-desc">
                              {roomOffer.roomDescription || "A comfortable, spacious room prepared with standard travel amenities."}
                            </p>
                            <div className="hotel-room-meta-tags">
                              <span><BedDouble size={12} style={{ marginRight: 4 }} /> {roomOffer.bedType || "Double"} bed</span>
                              <span>{roomOffer.cancellationPolicy || "Cancellation policy applies"}</span>
                            </div>
                          </div>
                          <div className="hotel-room-action-price">
                            <div className="hotel-room-price-val">
                              <strong>{formatCurrency(roomOffer.price)}</strong>
                              <span>night</span>
                            </div>
                            <button
                              type="button"
                              className="hotel-primary-button hotel-room-select-btn"
                              onClick={() => handleSelectOffer(roomOffer)}
                              disabled={selectingOfferId !== ""}
                            >
                              {isSelectingThis ? (
                                <>
                                  <Loader2 size={13} className="hotel-spin" />
                                  Checking...
                                </>
                              ) : (
                                "Choose room"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="hotel-room-empty">
                      <p>No active rooms returned for the selected dates. Please search for different dates.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {offer ? (
            <aside className="hotel-reserve-rail">
              <div className="hotel-reserve-card">
                <div className="hotel-reserve-preview">
                  <img src={gallery[1] || gallery[0]} alt={hotel.name} />
                  <div>
                    <span>{visuals.highlightLabel}</span>
                    <strong>{hotel.name}</strong>
                    <p>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}</p>
                  </div>
                </div>
                <div className="hotel-reserve-price">
                  <strong>{formatCurrency(offer.price)}</strong>
                  <span>per night before taxes</span>
                </div>
                <div className="hotel-reserve-facts">
                  <div>
                    <span>Check-in</span>
                    <strong>{toDisplayDate(String(checkInDate).split("T")[0])}</strong>
                  </div>
                  <div>
                    <span>Check-out</span>
                    <strong>{toDisplayDate(String(checkOutDate).split("T")[0])}</strong>
                  </div>
                  <div>
                    <span>Guests</span>
                    <strong>{guestSummary}</strong>
                  </div>
                  <div>
                    <span>Room</span>
                    <strong>{offer.bedType || "Double"} bed</strong>
                  </div>
                </div>
                <div className="hotel-fare-breakdown">
                  <div>
                    <span>Room charges ({formatNightLabel(nights)})</span>
                    <strong>{formatCurrency(basePrice)}</strong>
                  </div>
                  <div>
                    <span>Taxes and GST (12%)</span>
                    <strong>{formatCurrency(tax)}</strong>
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Convenience fee
                      <span title="This fee covers secure payment processing and 24/7 booking support." style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.06)", fontSize: "0.65rem", fontWeight: "bold" }}>i</span>
                    </span>
                    <strong>{formatCurrency(convenienceFee)}</strong>
                  </div>
                  <div className="hotel-fare-total" style={{ borderTop: "1px solid var(--hotel-border)", paddingTop: 12 }}>
                    <span>Total before payment</span>
                    <strong>{formatCurrency(finalPayable)}</strong>
                  </div>
                </div>
                <div className="hotel-reserve-actions" style={{ display: "grid", gap: 10, marginTop: 18 }}>
                  <button type="button" className="hotel-primary-button" onClick={handleContinue}>
                    Continue to payment
                  </button>
                  <button type="button" className="hotel-tertiary-link" onClick={() => navigate("/search/hotels")}>
                    Change hotel search
                  </button>
                </div>
                <div className="hotel-reserve-assurance" style={{ marginTop: 18, padding: "14px 16px", borderRadius: 18, color: "#0c5132", background: "#edfdf3", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  <span>Your booking details stay synced to the backend pricing preview while you review this page.</span>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="hotel-reserve-rail">
              <div className="hotel-reserve-card" style={{ padding: "24px", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 30, background: "var(--hotel-surface)", boxShadow: "var(--hotel-shadow)" }}>
                <div style={{ textAlign: "center", padding: "24px 10px" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛋️</div>
                  <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "1.25rem", margin: "0 0 8px" }}>Select a room option</h3>
                  <p style={{ color: "var(--hotel-muted)", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
                    Choose one of the available rooms in the list to calculate pricing and proceed to passenger details.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      {offer && (
        <div className="hotel-mobile-sticky-cta" style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1px solid rgba(220, 30, 38, 0.15)",
          padding: "12px 20px",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1000,
          boxShadow: "0 -10px 30px rgba(0, 0, 0, 0.08)",
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--hotel-muted)", fontWeight: 700 }}>Total Payable</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--hotel-ink)", fontWeight: 800 }}>{formatCurrency(finalPayable)}</strong>
          </div>
          <button type="button" className="hotel-primary-button" style={{ minHeight: 44, padding: "0 22px", fontSize: "0.9rem" }} onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </main>
  );
}