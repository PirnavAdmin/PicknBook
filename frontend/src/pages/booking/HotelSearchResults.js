/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  Building2,
  CalendarRange,
  Check,
  Heart,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Filter,
  Sparkles,
  Star,
  Users,
  Navigation,
  Map,
  Trees,
  Home,
  BellRing,
  Building,
  Briefcase,
  Umbrella,
  Coffee,
  Wifi,
  Car,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate, getDefaultDateString } from "../../utils/apiDateFormat";
import { searchHotels, getOfferDetails } from "../../services/hotelBookingService";
import { buildStayFacts, getHotelVisuals } from "./hotelPresentation";
import HotelInteractiveMap from "./HotelInteractiveMap";
import HotelSearchWidget from "../../components/HotelSearchWidget";
import "../../STYLES/HotelSearchResults.css";
 
const HOTEL_COLLECTIONS = [
  { id: "all", label: "All stays" },
  { id: "guest-favourite", label: "Guest favourite" },
  { id: "breakfast", label: "Breakfast" },
  { id: "work-ready", label: "Work-ready" },
  { id: "value", label: "Best value" },
];
 
function readValue(params, state, key, fallback = "") {
  const queryValue = params.get(key);
 
  if (typeof queryValue === "string" && queryValue.trim()) {
    return queryValue.trim();
  }
 
  const stateValue = state?.[key];
  return typeof stateValue === "string" && stateValue.trim() ? stateValue.trim() : fallback;
}
 
function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;
}
 
function buildPassengerDetailsQuery(hotel, offerId, searchContext) {
  const params = new URLSearchParams();
 
  const entries = [
    ["offerId", offerId],
    ["hotelId", hotel?.hotelId],
    ["hotelName", hotel?.name],
    ["hotelCity", hotel?.city],
    ["hotelArea", hotel?.area],
    ["hotelAddress", hotel?.address],
    ["hotelRating", hotel?.rating],
    ["hotelTag", hotel?.tag],
    ["hotelAmenities", Array.isArray(hotel?.amenities) ? hotel.amenities.join("|") : ""],
    ["destination", searchContext?.destination],
    ["checkInDate", searchContext?.checkInDate],
    ["checkOutDate", searchContext?.checkOutDate],
    ["adults", searchContext?.adults],
    ["rooms", searchContext?.rooms],
    ["guests", searchContext?.guests],
  ];
 
  entries.forEach(([key, value]) => {
    const text = String(value ?? "").trim();
    if (text) {
      params.set(key, text);
    }
  });
 
  const query = params.toString();
  return query ? `?${query}` : "";
}
 
export default function HotelSearchResults() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
 
  const destination = readValue(searchParams, state, "destination") || readValue(searchParams, state, "city") || "";
  const checkInDate = readValue(searchParams, state, "checkInDate") || readValue(searchParams, state, "checkIn") || getDefaultDateString(0);
  const checkOutDate = readValue(searchParams, state, "checkOutDate") || readValue(searchParams, state, "checkOut") || getDefaultDateString(1);
  
  const rawRooms = readValue(searchParams, state, "rooms");
  let roomsConfig = state?.roomsConfig || null;
  if (!roomsConfig && rawRooms) {
    try {
      const parsed = JSON.parse(rawRooms);
      if (Array.isArray(parsed)) roomsConfig = parsed;
    } catch {
      // it was just a number
    }
  }

  const roomsCount = roomsConfig ? roomsConfig.length : (Number(rawRooms) || 1);
  const guestsCount = roomsConfig 
    ? roomsConfig.reduce((sum, r) => sum + (Number(r.adults)||0) + (Number(r.children)||0), 0)
    : (Number(readValue(searchParams, state, "guests") || readValue(searchParams, state, "adults")) || 2);
    
  const guests = `${roomsCount} Room${roomsCount > 1 ? "s" : ""}, ${guestsCount} Guest${guestsCount > 1 ? "s" : ""}`;
 
  const [sortKey, setSortKey] = useState("recommended");
  const [collectionKey, setCollectionKey] = useState("all");
  const [isModifying, setIsModifying] = useState(false);

  const handleModifySearch = (params) => {
    const urlParams = new URLSearchParams();
    urlParams.set("destination", params.destination);
    urlParams.set("checkInDate", params.checkInDate);
    urlParams.set("checkOutDate", params.checkOutDate);
    urlParams.set("rooms", params.rooms);
    urlParams.set("guests", params.guests);
    navigate({ pathname: "/hotel/search", search: urlParams.toString() }, { state: params });
    setIsModifying(false);
  };
  const [apiHotels, setApiHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savedStayIds, setSavedStayIds] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [selectedPaymentPrefs, setSelectedPaymentPrefs] = useState([]);
  const [selectedLocalities, setSelectedLocalities] = useState([]);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState(["hotels"]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleTogglePropertyType = (typeId) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleTogglePaymentPref = (pref) => {
    setSelectedPaymentPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleToggleLocality = (locality) => {
    setSelectedLocalities((prev) =>
      prev.includes(locality) ? prev.filter((l) => l !== locality) : [...prev, locality]
    );
  };

  const handleToggleRating = (rating) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  const handleTogglePriceRange = (range) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
  };

  const handleToggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const getHotelLocality = (hotelRecord) => {
    const addr = hotelRecord.address || "";
    if (addr.includes("Falaknuma")) return "Falaknuma";
    if (addr.includes("Hitech City")) return "Hitech City";
    if (addr.includes("Madhapur")) return "Madhapur";
    if (addr.includes("Banjara Hills")) return "Banjara Hills";
    if (addr.includes("Shamshabad")) return "Shamshabad";
    if (addr.includes("Panaji")) return "Panaji";
    if (addr.includes("Candolim")) return "Candolim";
    if (addr.includes("Majorda")) return "Majorda";
    if (addr.includes("Vagator")) return "Vagator";
    if (addr.includes("Baga Beach")) return "Baga Beach";
    if (addr.includes("Chanakyapuri")) return "Chanakyapuri";
    if (addr.includes("Lodhi Road")) return "Lodhi Road";
    if (addr.includes("Mahipalpur")) return "Mahipalpur";
    if (addr.includes("Connaught Place")) return "Connaught Place";
    if (addr.includes("Mansingh Road")) return "Mansingh Road";
    return hotelRecord.area || "City centre";
  };

  const availableLocalities = useMemo(() => {
    const list = apiHotels.map(h => getHotelLocality(h));
    return Array.from(new Set(list.filter(Boolean)));
  }, [apiHotels]);
 
  useEffect(() => {
    let isCurrent = true;
 
    async function fetchHotelResults() {
      setLoading(true);
      setSearchError("");
      setActionError("");
 
      try {
        const data = await searchHotels({
          city: destination,
          checkInDate,
          checkOutDate,
          roomsConfig
        });
 
        if (isCurrent) {
          setApiHotels(data || []);
        }
      } catch (err) {
        if (isCurrent) {
          setSearchError(err.message || "Failed to search hotels. Please try again.");
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }
 
    fetchHotelResults();
    return () => {
      isCurrent = false;
    };
  }, [destination, checkInDate, checkOutDate, roomsConfig]);
 
  const hotels = useMemo(() => {
    return [...apiHotels]
      .map((hotelRecord, index) => {
        const hotelName = hotelRecord.hotelName || hotelRecord.name || "Hotel stay";
        const basePrice = Number(hotelRecord.price?.offeredPrice || hotelRecord.price?.b2CBasePrice || 0);
        const visuals = getHotelVisuals(`${hotelRecord.hotelCode || hotelRecord.hotelId || hotelName}-${destination}-${index}`);
        const rating = Number(hotelRecord.starRating || hotelRecord.rating || 4.6) || 4.6;
        const reviewCount = 36 + ((index + 1) * 17) % 112;
        const apiImage = hotelRecord.hotelPicture || (hotelRecord.images && hotelRecord.images.length > 0 ? hotelRecord.images[0] : null);
        
        // Build a mock offer structure from the TBO price and facilities since the UI expects 'offers'
        const mockOffer = {
          price: basePrice,
          cancellationPolicy: hotelRecord.hotelPolicy || "Flexible plans available on select rooms.",
        };
        const mappedOffers = [mockOffer];

        return {
          id: hotelRecord.hotelCode || hotelRecord.hotelId || `hotel-${String(hotelName).toLowerCase().replace(/\s+/g, "-")}`,
          hotelId: hotelRecord.hotelCode || hotelRecord.hotelId,
          TraceId: hotelRecord.traceId || hotelRecord.TraceId,
          ResultIndex: hotelRecord.resultIndex || hotelRecord.ResultIndex,
          SrdvType: hotelRecord.srdvType || hotelRecord.SrdvType || "Single",
          SrdvIndex: hotelRecord.srdvIndex || hotelRecord.SrdvIndex,
          name: hotelName,
          city: hotelRecord.city || hotelRecord.cityCode || destination,
          area: getHotelLocality(hotelRecord),
          address: hotelRecord.hotelAddress || hotelRecord.address || destination,
          rating,
          reviewCount,
          tag:
            hotelRecord.tag ||
            (rating >= 4.8 ? "Guest favourite" : rating >= 4.5 ? "Popular with city travelers" : "Value pick"),
          price: basePrice,
          oldPrice: Math.round(basePrice * 1.18),
          amenities: hotelRecord.facilities && hotelRecord.facilities.length > 0 && hotelRecord.facilities[0].facilitiesNames
            ? hotelRecord.facilities[0].facilitiesNames 
            : (Array.isArray(hotelRecord.amenities) ? hotelRecord.amenities : ["Wi-Fi", "Breakfast", "Room service"]),
          note: mockOffer.cancellationPolicy,
          offers: mappedOffers,
          image: apiImage || visuals.cardImage,
          thumbImage: apiImage || visuals.thumbImage,
          images: hotelRecord.hotelPicture ? [hotelRecord.hotelPicture] : (hotelRecord.images || []),
          latitude: Number(hotelRecord.latitude || hotelRecord.Latitude || 0),
          longitude: Number(hotelRecord.longitude || hotelRecord.Longitude || 0),
          propertyLabel: visuals.propertyLabel,
          highlightLabel: visuals.highlightLabel,
          facts: buildStayFacts(
            { city: hotelRecord.city || hotelRecord.cityCode || destination },
            mockOffer,
            { adults: guestsCount, rooms: roomsCount },
          ),
        };
      })
      .filter((hotelRecord) => {
        if (collectionKey === "guest-favourite" && hotelRecord.rating < 4.7) {
          return false;
        }

        if (collectionKey === "breakfast" && !hotelRecord.amenities.some((item) => /breakfast/i.test(item))) {
          return false;
        }

        if (collectionKey === "work-ready" && !hotelRecord.amenities.some((item) => /wi-?fi|desk|workspace/i.test(item))) {
          return false;
        }

        if (collectionKey === "value" && hotelRecord.price > 6000) {
          return false;
        }

        if (selectedPaymentPrefs.length > 0) {
          const matchesAllPrefs = selectedPaymentPrefs.every((pref) => {
            if (pref === "Free Cancellation") {
              return hotelRecord.offers.some((offer) =>
                /free cancellation|refundable/i.test(offer.cancellationPolicy || "") &&
                !/non-refundable/i.test(offer.cancellationPolicy || "")
              );
            }
            if (pref === "Pay at Hotel") {
              return hotelRecord.offers.some((offer) =>
                offer.paymentType === "GUARANTEE" || /pay at hotel/i.test(offer.cancellationPolicy || "")
              );
            }
            if (pref === "Pay Now") {
              return hotelRecord.offers.some((offer) =>
                offer.paymentType === "PREPAYMENT" || /prepayment|pay now/i.test(offer.cancellationPolicy || "")
              );
            }
            if (pref === "Book Without Credit Card") {
              return hotelRecord.offers.some((offer) =>
                offer.paymentType === "GUARANTEE" || String(offer.offerId).includes("std")
              );
            }
            return true;
          });
          if (!matchesAllPrefs) {
            return false;
          }
        }

        if (selectedPropertyTypes.length > 0 && !(selectedPropertyTypes.length === 1 && selectedPropertyTypes[0] === "hotels")) {
          const matchProperty = selectedPropertyTypes.some((type) => {
            if (type === "hotels") return !/resort|villa|apartment|boutique|home/i.test(hotelRecord.name || "");
            if (type === "resorts") return /resort/i.test(hotelRecord.name || "");
            if (type === "villas") return /villa/i.test(hotelRecord.name || "");
            if (type === "apartments") return /apartment/i.test(hotelRecord.name || "");
            if (type === "boutique") return /boutique/i.test(hotelRecord.name || "");
            if (type === "serviced") return /serviced/i.test(hotelRecord.name || "");
            if (type === "vacation") return /vacation|home/i.test(hotelRecord.name || "");
            if (type === "business") return /business/i.test(hotelRecord.name || "");
            if (type === "beach") return /beach/i.test(hotelRecord.name || "");
            return false;
          });
          if (!matchProperty) return false;
        }

        if (selectedLocalities.length > 0) {
          if (!selectedLocalities.includes(hotelRecord.area)) {
            return false;
          }
        }

        if (selectedPriceRanges.length > 0) {
          const matchPrice = selectedPriceRanges.some((range) => {
            if (range === "under-4k") return hotelRecord.price < 4000;
            if (range === "4k-8k") return hotelRecord.price >= 4000 && hotelRecord.price <= 8000;
            if (range === "8k-15k") return hotelRecord.price >= 8000 && hotelRecord.price <= 15000;
            if (range === "over-15k") return hotelRecord.price > 15000;
            return true;
          });
          if (!matchPrice) return false;
        }

        if (selectedRatings.length > 0) {
          const matchRating = selectedRatings.some((stars) => {
            if (stars === "5") return hotelRecord.rating >= 4.8;
            if (stars === "4") return hotelRecord.rating >= 4.5 && hotelRecord.rating < 4.8;
            if (stars === "3") return hotelRecord.rating >= 4.0 && hotelRecord.rating < 4.5;
            if (stars === "2") return hotelRecord.rating >= 3.0 && hotelRecord.rating < 4.0;
            if (stars === "1") return hotelRecord.rating < 3.0;
            return true;
          });
          if (!matchRating) return false;
        }

        if (selectedAmenities.length > 0) {
          const matchAmenities = selectedAmenities.every((amenity) => {
            const regex = new RegExp(amenity, "i");
            const hasAmenity = hotelRecord.amenities.some((hAmenity) => regex.test(hAmenity));
            const hasInNote = regex.test(hotelRecord.note || "");
            const hasInOffers = hotelRecord.offers.some((o) => regex.test(o.cancellationPolicy || "") || regex.test(o.roomCategory || "") || regex.test(o.bedType || ""));
            return hasAmenity || hasInNote || hasInOffers;
          });
          if (!matchAmenities) return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortKey === "price") {
          return left.price - right.price;
        }

        if (sortKey === "rating") {
          return right.rating - left.rating;
        }

        return right.rating * 100 - right.price / 100 - (left.rating * 100 - left.price / 100);
      });
  }, [apiHotels, collectionKey, destination, sortKey, selectedPaymentPrefs, selectedLocalities, selectedRatings, selectedPriceRanges, selectedAmenities]);
 
  const toggleSavedStay = (hotelId) => {
    setSavedStayIds((current) =>
      current.includes(hotelId) ? current.filter((item) => item !== hotelId) : [...current, hotelId],
    );
  };
 
  const handleSelectHotel = (hotel) => {
    setActionError("");
    const nextState = {
      hotel: {
        hotelId: hotel.hotelId,
        name: hotel.name,
        city: hotel.city,
        area: hotel.area,
        address: hotel.address,
        rating: hotel.rating,
        tag: hotel.tag,
        amenities: hotel.amenities,
        offers: hotel.offers,
        images: hotel.images,
        TraceId: hotel.TraceId,
        ResultIndex: hotel.ResultIndex,
        SrdvType: hotel.SrdvType,
        SrdvIndex: hotel.SrdvIndex,
      },
      offer: null,
      searchContext: {
        destination,
        checkInDate,
        checkOutDate,
        roomsConfig,
        guests,
      },
    };
 
    navigate(
      {
        pathname: "/hotel/passenger-details",
        search: buildPassengerDetailsQuery(hotel, "", nextState.searchContext),
      },
      { state: nextState }
    );
  };
 
  const renderLoadingCard = (index) => (
    <article className="hotel-stay-card hotel-stay-card--skeleton" key={`skeleton-${index}`}>
      <div className="hotel-stay-media" />
      <div className="hotel-stay-content">
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--short" />
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--title" />
        <div className="hotel-skeleton hotel-skeleton--line" />
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--tiny" />
        <div className="hotel-skeleton hotel-skeleton--tags">
          <span className="hotel-skeleton hotel-skeleton--pill" />
          <span className="hotel-skeleton hotel-skeleton--pill" />
          <span className="hotel-skeleton hotel-skeleton--pill" />
        </div>
      </div>
    </article>
  );
 
  return (
    <main className="hotel-discover-page">
      <section className="hotel-discover-hero">
        <div className="hotel-hero-wallpaper">
          <video
            className="hotel-hero-wallpaper-video"
            autoPlay
            loop
            muted
            playsInline
            poster="/hotel_poster.png"
          >
            <source src="/hotel_bg.mp4" type="video/mp4" />
          </video>
          <div className="hotel-hero-wallpaper-overlay" />
        </div>

        <div className="hero-content-wrapper">
          <div className="hotel-discover-copy">
            <span className="hotel-discover-kicker" style={{ display: "inline-flex", alignItems: "center", background: "rgba(0,0,0,0.5)", border: "1px solid #dc1e26", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase" }}><Star size={12} fill="#eab308" color="#eab308" style={{ marginRight: 6 }} /> HOTEL BOOKING, REIMAGINED</span>
            <h1 style={{ whiteSpace: "nowrap" }}>
              Discover city stays that feel <span className="hotel-hero-highlight">easier to compare.</span>
            </h1>
            <p>Find the perfect stay at the best price.<br/>Compare, choose & book with confidence.</p>
          </div>

          {isModifying ? (
            <div className="inline-modify-container" style={{ padding: 0 }}>
              <HotelSearchWidget
                isInline={true}
                initialDestination={destination}
                initialCheckIn={checkInDate}
                initialCheckOut={checkOutDate}
                initialRoomsConfig={roomsConfig}
                onSearch={handleModifySearch}
              />
            </div>
          ) : (
            <div className="hotel-discover-searchbar" style={{ background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(20px)", borderRadius: "40px", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
              <div className="hotel-discover-searchcell">
                <MapPin size={20} color="#dc1e26" />
                <div>
                  <span style={{ color: "#333", fontWeight: 700 }}>STAY DESTINATION</span>
                  <strong style={{ fontSize: "1.1rem" }}>{destination}</strong>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>Enter city, area or hotel</span>
                </div>
              </div>
              <div className="hotel-discover-searchcell" style={{ borderLeft: "1px solid rgba(0,0,0,0.1)", paddingLeft: "24px" }}>
                <CalendarRange size={20} color="#dc1e26" />
                <div>
                  <span style={{ color: "#333", fontWeight: 700 }}>TIMELINE</span>
                  <strong style={{ fontSize: "1.1rem" }}>
                    {toDisplayDate(checkInDate) || "Select"} - {toDisplayDate(checkOutDate) || "dates"}
                  </strong>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>2 Nights</span>
                </div>
              </div>
              <div className="hotel-discover-searchcell" style={{ borderLeft: "1px solid rgba(0,0,0,0.1)", paddingLeft: "24px" }}>
                <Users size={20} color="#dc1e26" />
                <div>
                  <span style={{ color: "#333", fontWeight: 700 }}>GUESTS</span>
                  <strong style={{ fontSize: "1.1rem" }}>{guests}</strong>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>Rooms & Guests</span>
                </div>
              </div>
              <button type="button" className="hotel-discover-searchbutton" onClick={() => setIsModifying(true)} style={{ borderRadius: "32px", padding: "0 32px", height: "56px", fontSize: "1.1rem", background: "linear-gradient(135deg, #dc1e26, #991b1b)", boxShadow: "0 4px 15px rgba(220, 30, 38, 0.4)" }}>
                <Search size={20} />
                <span>Search Hotels</span>
              </button>
            </div>
          )}

          <div className="hotel-property-types-row" style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", justifyContent: "flex-start" }}>
            {[
              { id: "hotels", label: "Hotels", icon: Building2, color: "#ef4444" },
              { id: "resorts", label: "Resorts", icon: Trees, color: "#0ea5e9" },
              { id: "villas", label: "Villas", icon: Home, color: "#eab308" },
              { id: "apartments", label: "Apartments", icon: BedDouble, color: "#6366f1" },
              { id: "boutique", label: "Boutique Hotels", icon: BellRing, color: "#a855f7" },
              { id: "serviced", label: "Serviced Apartments", icon: Building, color: "#06b6d4" },
              { id: "vacation", label: "Vacation Homes", icon: Home, color: "#10b981" },
              { id: "business", label: "Business Hotels", icon: Briefcase, color: "#6366f1" },
              { id: "beach", label: "Beach Resorts", icon: Umbrella, color: "#f59e0b" },
            ].map((type) => {
              const IconComp = type.icon;
              const isActive = selectedPropertyTypes.includes(type.id);
              return (
                <div 
                  key={type.id} 
                  className="property-type-card" 
                  onClick={() => handleTogglePropertyType(type.id)}
                  style={{
                    border: `1.5px solid ${isActive ? type.color : 'rgba(255,255,255,0.2)'}`,
                    boxShadow: isActive ? `0 0 15px ${type.color}40, inset 0 0 10px ${type.color}30` : "none",
                    cursor: "pointer"
                  }}
                >
                  <IconComp size={22} color={isActive ? type.color : 'rgba(255,255,255,0.5)'} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}>{type.label}</span>
                </div>
              );
            })}
          </div>
 
          <div className="hotel-discover-toolbar">
            <div className="hotel-collection-row">
              {[
                { id: "best-price", label: "Best Price", icon: Star, color: "#eab308" },
                { id: "verified", label: "Verified Stays", icon: ShieldCheck, color: "#f8fafc" },
                { id: "breakfast", label: "Breakfast Included", icon: Coffee, color: "#f8fafc" },
                { id: "wifi", label: "Free WiFi", icon: Wifi, color: "#f8fafc" },
                { id: "parking", label: "Free Parking", icon: Car, color: "#f8fafc" },
              ].map((pill) => {
                const IconComp = pill.icon;
                let isActive = false;
                if (pill.id === "best-price") isActive = sortKey === "price";
                if (pill.id === "verified") isActive = collectionKey === "guest-favourite";
                if (pill.id === "breakfast") isActive = selectedAmenities.includes("Breakfast");
                if (pill.id === "wifi") isActive = selectedAmenities.includes("WiFi");
                if (pill.id === "parking") isActive = selectedAmenities.includes("Parking");

                const handlePillClick = () => {
                  if (pill.id === "best-price") setSortKey(isActive ? "recommended" : "price");
                  if (pill.id === "verified") setCollectionKey(isActive ? "all" : "guest-favourite");
                  if (pill.id === "breakfast") handleToggleAmenity("Breakfast");
                  if (pill.id === "wifi") handleToggleAmenity("WiFi");
                  if (pill.id === "parking") handleToggleAmenity("Parking");
                };

                return (
                  <button
                    key={pill.id}
                    type="button"
                    className="property-type-card"
                    onClick={handlePillClick}
                    style={{ 
                      flexDirection: "row", 
                      padding: "8px 16px", 
                      borderRadius: "20px", 
                      minWidth: "auto", 
                      fontSize: "0.85rem", 
                      gap: "8px", 
                      border: `1px solid ${isActive ? pill.color : 'rgba(255,255,255,0.2)'}`,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      cursor: "pointer"
                    }}
                  >
                    <IconComp size={16} color={isActive ? pill.color : 'rgba(255,255,255,0.7)'} fill={pill.id === "best-price" ? pill.color : "none"} />
                    <span style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}>{pill.label}</span>
                  </button>
                );
              })}
            </div>
 
            <div className="hotel-sort-container">
              <div className="hotel-sort-trigger" onClick={() => setIsSortOpen(true)}>
                <SlidersHorizontal size={14} />
                <span>Sort</span>
              </div>
              <div className={`hotel-filter-trigger${(selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length) > 0 ? " is-active" : ""}`} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <Filter size={14} />
                <span>Filter</span>
                {(selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length) > 0 && (
                  <span className="hotel-filters-badge">
                    {selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length}
                  </span>
                )}
              </div>
              <select 
                className="hotel-sort-hidden-select" 
                value={sortKey} 
                onChange={(event) => {
                  setSortKey(event.target.value);
                  setIsSortOpen(false);
                }}
              >
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="rating">Highest rating</option>
              </select>
              {isSortOpen && (
                <div className="hotel-sort-overlay" onClick={() => setIsSortOpen(false)}>
                  <div className="hotel-sort-popup" onClick={(e) => e.stopPropagation()}>
                    <div className="hotel-sort-popup-header">
                      <h3>Sort By</h3>
                      <button className="hotel-sort-close" onClick={() => setIsSortOpen(false)}>&times;</button>
                    </div>
                    <div className="hotel-sort-popup-body">
                      <div className={`hotel-sort-option ${sortKey === "recommended" ? "is-active" : ""}`} onClick={() => { setSortKey("recommended"); setIsSortOpen(false); }}>Recommended</div>
                      <div className={`hotel-sort-option ${sortKey === "price" ? "is-active" : ""}`} onClick={() => { setSortKey("price"); setIsSortOpen(false); }}>Lowest price</div>
                      <div className={`hotel-sort-option ${sortKey === "rating" ? "is-active" : ""}`} onClick={() => { setSortKey("rating"); setIsSortOpen(false); }}>Highest rating</div>
                    </div>
                  </div>
                </div>
              )}
            
              {isFilterOpen && (
                <div className="hotel-sort-overlay" onClick={() => setIsFilterOpen(false)}>
                  <div className="hotel-sort-popup" onClick={(e) => e.stopPropagation()} style={{ width: 340, right: 0, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                    <div className="hotel-sort-popup-header">
                      <h3>Filters</h3>
                      <button className="hotel-sort-close" onClick={() => setIsFilterOpen(false)}>&times;</button>
                    </div>
                    <div className="hotel-sort-popup-body" style={{ padding: '16px', overflowY: 'auto' }}>
                      <div className="hotel-sidebar-filters" style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent' }}>
                        
            <div className="hotel-sidebar-filter-group">
              <h4>Price Range</h4>
              <div className="hotel-sidebar-checklist">
                {[
                  { id: "under-4k", label: "Under INR 4,000" },
                  { id: "4k-8k", label: "INR 4,000 - INR 8,000" },
                  { id: "8k-15k", label: "INR 8,000 - INR 15,000" },
                  { id: "over-15k", label: "Over INR 15,000" },
                ].map((range) => {
                  const isChecked = selectedPriceRanges.includes(range.id);
                  return (
                    <label key={range.id} className="hotel-sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePriceRange(range.id)}
                      />
                      <span>{range.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="hotel-sidebar-filter-group">
              <h4>Star Rating</h4>
              <div className="hotel-sidebar-checklist">
                {[
                  { id: "5", label: "5 Stars (Excellent 4.8+)" },
                  { id: "4", label: "4 Stars (Very Good 4.5+)" },
                  { id: "3", label: "3 Stars (Good 4.0+)" },
                  { id: "2", label: "2 Stars (Fair 3.0+)" },
                  { id: "1", label: "1 Star (Budget <3.0)" },
                ].map((rating) => {
                  const isChecked = selectedRatings.includes(rating.id);
                  return (
                    <label key={rating.id} className="hotel-sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRating(rating.id)}
                      />
                      <span>{rating.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="hotel-sidebar-filter-group">
              <h4>Popular Amenities & Offers</h4>
              <div className="hotel-sidebar-checklist">
                {[
                  { id: "Breakfast|Dining", label: "Breakfast Included" },
                  { id: "Transfer|Airport|Shuttle", label: "Airport Transfer" },
                  { id: "Wi-Fi|Internet", label: "Free Wi-Fi" },
                  { id: "Air Conditioning|AC", label: "Air Conditioning" },
                  { id: "Early Check-In", label: "Early Check-In" },
                  { id: "Late Check-Out", label: "Late Check-Out" },
                  { id: "Parking", label: "Parking" },
                  { id: "Family-Friendly|Kid", label: "Family-Friendly" },
                ].map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity.id);
                  return (
                    <label key={amenity.id} className="hotel-sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAmenity(amenity.id)}
                      />
                      <span>{amenity.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {availableLocalities.length > 0 && (
              <div className="hotel-sidebar-filter-group">
                <h4>Neighborhoods</h4>
                <div className="hotel-sidebar-checklist">
                  {availableLocalities.map((loc) => {
                    const isChecked = selectedLocalities.includes(loc);
                    return (
                      <label key={loc} className="hotel-sidebar-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLocality(loc)}
                        />
                        <span>{loc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hotel-sidebar-filter-group">
              <h4>Payment Preferences</h4>
              <div className="hotel-sidebar-checklist">
                {["Free Cancellation", "Pay at Hotel", "Pay Now", "Book Without Credit Card"].map((pref) => {
                  const isChecked = selectedPaymentPrefs.includes(pref);
                  return (
                    <label key={pref} className="hotel-sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePaymentPref(pref)}
                      />
                      <span>{pref}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="hotel-discover-shell">
        {actionError && <div className="hotel-inline-alert hotel-inline-alert--error">{actionError}</div>}

        <div className="hotel-discover-results-container">

          <section className={`hotel-discover-results${showMap ? " hotel-split-layout" : ""}`}>
            <div className="hotel-split-left">
            <header className="hotel-discover-resultshead">
              <div>
                <span>Hotel results</span>
                <h2 style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  {loading ? (
                    "Searching live inventory..."
                  ) : (
                    <>
                      {hotels.length} stays in {destination}
                      <button
                        type="button"
                        className={`hotel-map-toggle-btn${showMap ? " is-active" : ""}`}
                        onClick={() => setShowMap(!showMap)}
                        title={showMap ? "Switch to list view" : "Switch to split map view"}
                      >
                        <Map size={14} />
                        <span>Map</span>
                      </button>
                    </>
                  )}
                </h2>
              </div>
            </header>
 
            {searchError ? (
              <div className="hotel-state-panel hotel-state-panel--error">
                <h3>We could not load hotels right now.</h3>
                <p>{searchError}</p>
                <button type="button" onClick={() => navigate("/?tab=hotels")}>
                  Start a new hotel search
                </button>
              </div>
            ) : loading ? (
              <div className="hotel-stay-grid">
                {Array.from({ length: 6 }).map((_, index) => renderLoadingCard(index))}
              </div>
            ) : hotels.length === 0 ? (
              <div className="hotel-state-panel">
                <h3>No stays matched that combination.</h3>
                <p>Try different dates, fewer filters, or another nearby destination.</p>
                <button type="button" onClick={() => navigate("/?tab=hotels")}>
                  Modify your hotel search
                </button>
              </div>
            ) : (
              <div className="hotel-stay-grid">
                {hotels.map((hotel) => (
                  <article
                    key={hotel.id}
                    className="hotel-stay-card"
                    onClick={() => handleSelectHotel(hotel)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="hotel-stay-media">
                      {hotel.image ? (
                        <img 
                          src={hotel.image} 
                          alt={hotel.name} 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className="hotel-stay-placeholder" 
                        style={{ 
                          display: hotel.image ? "none" : "flex",
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: "8px",
                          background: "linear-gradient(135deg, #0f172a, #1e293b)",
                          color: "#94a3b8"
                        }}
                      >
                        <Building2 size={36} color="#60a5fa" />
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#cbd5e1" }}>Verified Stay</span>
                      </div>
                      <div className="hotel-stay-badges">
                        <span className="hotel-stay-badge">{hotel.tag}</span>
                        <span className="hotel-stay-badge hotel-stay-badge--light">{hotel.highlightLabel}</span>
                      </div>
                      <button
                        type="button"
                        className={`hotel-save-button${savedStayIds.includes(hotel.id) ? " is-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSavedStay(hotel.id);
                        }}
                        aria-label={savedStayIds.includes(hotel.id) ? "Remove saved stay" : "Save stay"}
                      >
                        <Heart size={17} fill={savedStayIds.includes(hotel.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
 
                    <div className="hotel-stay-content">
                      <div className="hotel-stay-topline">
                        <div>
                          <span className="hotel-stay-label">{hotel.propertyLabel}</span>
                          <h3>{hotel.name}</h3>
                        </div>
                        <div className="hotel-stay-rating">
                          <Star size={14} fill="currentColor" />
                          <strong>{hotel.rating.toFixed(1)}</strong>
                          <span>({hotel.reviewCount})</span>
                        </div>
                      </div>
 
                      <p className="hotel-stay-address">
                        <MapPin size={15} />
                        <span>
                          {hotel.area}, {hotel.city}
                        </span>
                      </p>
 
                      <div className="hotel-stay-facts">
                        {hotel.facts.map((fact) => (
                          <span key={fact}>{fact}</span>
                        ))}
                      </div>
 
                      <div className="hotel-stay-amenities">
                        {hotel.amenities.slice(0, 4).map((amenity) => (
                          <span key={amenity}>{amenity}</span>
                        ))}
                      </div>
 
                      <p className="hotel-stay-note">{hotel.note}</p>
 
                      <div className="hotel-stay-footer">
                        <div className="hotel-stay-pricebox">
                          <strong>{formatCurrency(hotel.price)}</strong>
                          <span>
                            night · <s>{formatCurrency(hotel.oldPrice)}</s>
                          </span>
                        </div>
 
                        <button
                          type="button"
                          className="hotel-stay-toggle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectHotel(hotel);
                          }}
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
 
          {showMap && (
            <div className="hotel-split-right" style={{ animation: "hotelFadeIn 0.3s ease" }}>
              <HotelInteractiveMap hotels={hotels} onSelectHotel={handleSelectHotel} />
            </div>
          )}
        </section>
      </div>
     </div>
    </main>
  );
}