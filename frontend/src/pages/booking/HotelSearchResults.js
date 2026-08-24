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
  return `₹${new Intl.NumberFormat("en-IN", {
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
  const internalCityId = readValue(searchParams, state, "internalCityId") || readValue(searchParams, state, "cityId") || "";
  const checkInDate = readValue(searchParams, state, "checkInDate") || readValue(searchParams, state, "checkIn") || getDefaultDateString(0);
  const checkOutDate = readValue(searchParams, state, "checkOutDate") || readValue(searchParams, state, "checkOut") || getDefaultDateString(1);
    const rawRooms = readValue(searchParams, state, "rooms");
  const rawAdults = readValue(searchParams, state, "adults");
  const rawChildren = readValue(searchParams, state, "children");

  const roomsConfig = useMemo(() => {
    let config = state?.roomsConfig || state?.hotelRoomsConfig || null;
    const rawRoomsConfig = searchParams.get("roomsConfig");
    if (!config && rawRoomsConfig) {
      try {
        const parsed = JSON.parse(rawRoomsConfig);
        if (Array.isArray(parsed) && parsed.length > 0) config = parsed;
      } catch (e) { }
    }
    if (!config && rawRooms) {
      try {
        const parsed = JSON.parse(rawRooms);
        if (Array.isArray(parsed) && parsed.length > 0) config = parsed;
      } catch {
        // rawRooms was just a number
      }
    }
    if (!config) {
      const numRooms = Math.max(1, Number(rawRooms) || 1);
      const numAdults = Math.max(1, Number(rawAdults) || 2);
      const numChildren = Math.max(0, Number(rawChildren) || 0);

      const adultsPerRoom = Math.max(1, Math.floor(numAdults / numRooms));
      const extraAdults = numAdults % numRooms;
      const childrenPerRoom = Math.floor(numChildren / numRooms);
      const extraChildren = numChildren % numRooms;

      config = Array.from({ length: numRooms }, (_, i) => ({
        adults: adultsPerRoom + (i === 0 ? extraAdults : 0),
        children: childrenPerRoom + (i === 0 ? extraChildren : 0),
        childAges: Array(childrenPerRoom + (i === 0 ? extraChildren : 0)).fill(4)
      }));
    }
    return config;
  }, [rawRooms, rawAdults, rawChildren, searchParams.get("roomsConfig"), JSON.stringify(state?.roomsConfig || state?.hotelRoomsConfig)]);

  const roomsCount = roomsConfig ? roomsConfig.length : (Number(rawRooms) || 1);
  const totalAdults = roomsConfig 
    ? roomsConfig.reduce((sum, r) => sum + (Number(r.adults) || 0), 0)
    : (Number(rawAdults) || 2);
  const totalChildren = roomsConfig
    ? roomsConfig.reduce((sum, r) => sum + (Number(r.children) || 0), 0)
    : (Number(rawChildren) || 0);

  const guests = `${roomsCount} Room${roomsCount > 1 ? "s" : ""}, ${totalAdults} Adult${totalAdults > 1 ? "s" : ""}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren > 1 ? "ren" : ""}` : ""}`;

  const [sortKey, setSortKey] = useState("recommended");
  const [collectionKey, setCollectionKey] = useState("all");
  const [isModifying, setIsModifying] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleModifySearch = (params) => {
    const urlParams = new URLSearchParams();
    urlParams.set("destination", params.destination || destination);
    urlParams.set("checkInDate", params.checkInDate || checkInDate);
    urlParams.set("checkOutDate", params.checkOutDate || checkOutDate);

    const destChanged = params.destination && params.destination !== destination;
    const resolvedCityId = destChanged ? params.internalCityId : (params.internalCityId || internalCityId);
    if (resolvedCityId) {
      urlParams.set("internalCityId", String(resolvedCityId));
    }

    const config = params.roomsConfig || roomsConfig;
    if (Array.isArray(config)) {
      urlParams.set("roomsConfig", JSON.stringify(config));
      const rCount = config.length;
      const aCount = config.reduce((sum, r) => sum + (Number(r.adults) || 0), 0);
      const cCount = config.reduce((sum, r) => sum + (Number(r.children) || 0), 0);
      urlParams.set("rooms", String(rCount));
      urlParams.set("adults", String(aCount));
      urlParams.set("children", String(cCount));
    } else {
      urlParams.set("rooms", params.rooms || "1");
    }
    if (params.guests) {
      urlParams.set("guests", params.guests);
    }
    navigate(`/search/hotels?${urlParams.toString()}`, { 
      state: { 
        ...params, 
        internalCityId: resolvedCityId 
      } 
    });
    setIsModifying(false);
  };
  const [apiHotels, setApiHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savedStayIds, setSavedStayIds] = useState(() => {
    try {
      const saved = localStorage.getItem("savedStayIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("savedStayIds", JSON.stringify(savedStayIds));
  }, [savedStayIds]);
  const [showMap, setShowMap] = useState(false);
  const [selectedPaymentPrefs, setSelectedPaymentPrefs] = useState([]);
  const [selectedLocalities, setSelectedLocalities] = useState([]);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState("hotels");
  const [activeQueryPill, setActiveQueryPill] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleTogglePropertyType = (typeId) => {
    setSelectedPropertyType((prev) => (prev === typeId ? "" : typeId));
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
          cityId: internalCityId ? Number(internalCityId) : null,
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
            { adults: totalAdults, children: totalChildren, rooms: roomsCount },
          ),
        };
      })
      .filter((hotelRecord) => {
        if (collectionKey === "favourites" && !savedStayIds.includes(hotelRecord.id)) {
          return false;
        }

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

        if (selectedPropertyType) {
          const matchProperty = (() => {
            const type = selectedPropertyType;
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
          })();
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
  }, [apiHotels, collectionKey, destination, sortKey, selectedPaymentPrefs, selectedLocalities, selectedRatings, selectedPriceRanges, selectedAmenities, savedStayIds, selectedPropertyType]);
 
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
        rooms: String(roomsCount),
        adults: String(totalAdults),
        children: String(totalChildren),
        guests,
      },
    };
 
    const searchString = buildPassengerDetailsQuery(hotel, "", nextState.searchContext);
    navigate(`/hotel/passenger-details${searchString}`, { state: nextState });
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
            <source src="/hotel-11.mp4" type="video/mp4" />
          </video>
          <div className="hotel-hero-wallpaper-overlay" />
        </div>

        <div className="hero-content-wrapper">
          <div className="hotel-discover-copy">
            <span className="hotel-discover-kicker" style={{ display: "inline-flex", alignItems: "center", background: "rgba(0,0,0,0.5)", border: "1px solid #dc1e26", padding: "4px 12px", borderRadius: "20px", color: "#fff", fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase" }}><Star size={12} fill="#eab308" color="#eab308" style={{ marginRight: 6 }} /> HOTEL BOOKING, REIMAGINED</span>
            <h1 style={{ color: "#ffffff", whiteSpace: "nowrap", textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)" }}>
              Compare smarter. Save more. Book with confidence.
            </h1>
            <p style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>
              Discover verified hotels, exclusive offers, and seamless booking—all in one place.
            </p>
          </div>

          {isModifying ? (
            <div className="inline-modify-container" style={{ padding: 0 }}>
              <HotelSearchWidget
                isInline={true}
                initialDestination={destination}
                initialInternalCityId={internalCityId}
                initialCheckIn={checkInDate}
                initialCheckOut={checkOutDate}
                initialRoomsConfig={roomsConfig}
                onSearch={handleModifySearch}
              />
            </div>
          ) : (
            <div className="hotel-discover-searchbar" style={{ background: "rgba(255, 255, 255, 0.18)", backdropFilter: "blur(20px)", borderRadius: "40px", padding: "10px 16px", border: "1px solid rgba(255, 255, 255, 0.25)", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
              <div className="hotel-discover-searchcell">
                <MapPin size={18} color="#ffffff" />
                <div>
                  <span style={{ color: "#cbd5e1", fontWeight: 500 }}>STAY DESTINATION</span>
                  <strong style={{ fontSize: "1rem", color: "#ffffff" }}>{destination}</strong>
                  <span style={{ fontSize: "0.75rem", color: "#e2e8f0" }}>Enter city, area or hotel</span>
                </div>
              </div>
              <div className="hotel-discover-searchcell" style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "20px" }}>
                <CalendarRange size={18} color="#ffffff" />
                <div>
                  <span style={{ color: "#cbd5e1", fontWeight: 500 }}>TIMELINE</span>
                  <strong style={{ fontSize: "1rem", color: "#ffffff" }}>
                    {toDisplayDate(checkInDate) || "Select"} - {toDisplayDate(checkOutDate) || "dates"}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "#e2e8f0" }}>2 Nights</span>
                </div>
              </div>
              <div className="hotel-discover-searchcell" style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "20px" }}>
                <Users size={18} color="#ffffff" />
                <div>
                  <span style={{ color: "#cbd5e1", fontWeight: 500 }}>GUESTS</span>
                  <strong style={{ fontSize: "1rem", color: "#ffffff" }}>{guests}</strong>
                  <span style={{ fontSize: "0.75rem", color: "#e2e8f0" }}>Rooms & Guests</span>
                </div>
              </div>
              <button type="button" className="hotel-discover-searchbutton" onClick={() => setIsModifying(true)} style={{ borderRadius: "32px", padding: "0 24px", height: "46px", fontSize: "0.95rem", background: "linear-gradient(135deg, #dc1e26, #991b1b)", boxShadow: "0 4px 15px rgba(220, 30, 38, 0.4)", color: "#ffffff" }}>
                <Search size={18} />
                <span>Search Hotels</span>
              </button>
            </div>
          )}


  

          </div>
        </section>

      <div className="hotel-discover-shell-wrapper">
        <div className="hotel-discover-shell">
          {actionError && <div className="hotel-inline-alert hotel-inline-alert--error">{actionError}</div>}

        <div className="hotel-discover-results-container">          <section className={`hotel-discover-results ${isFilterOpen ? "has-sidebar" : ""} ${showMap ? "hotel-split-layout" : ""}`}>
            {isFilterOpen && (
              <aside className="hotel-sidebar-filters-inline">
                <div className="hotel-sidebar-filters-header">
                  <h3>Filters</h3>
                  <button type="button" className="hotel-sort-close" onClick={() => setIsFilterOpen(false)}>&times;</button>
                </div>
                <div className="hotel-sidebar-filters-body">
                  <div className="hotel-sidebar-filter-group">
                    <h4>Property Type</h4>
                    <div className="hotel-sidebar-checklist">
                      {[
                        { id: "hotels", label: "Hotels" },
                        { id: "resorts", label: "Resorts" },
                        { id: "villas", label: "Villas" },
                        { id: "apartments", label: "Apartments" },
                        { id: "boutique", label: "Boutique Hotels" },
                        { id: "serviced", label: "Serviced Apartments" },
                        { id: "vacation", label: "Vacation Homes" },
                        { id: "business", label: "Business Hotels" },
                        { id: "beach", label: "Beach Resorts" },
                      ].map((type) => {
                        const isChecked = selectedPropertyType === type.id;
                        return (
                          <label key={type.id} className="hotel-sidebar-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePropertyType(type.id)}
                            />
                            <span>{type.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

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
              </aside>
            )}            <div className="hotel-split-left">
              <header className="hotel-discover-resultshead" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", color: "#dc1e26", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Hotel results</span>
                    <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      {loading ? "Finding the Best Hotels for You..." : "Best Hotels for You"}
                    </h2>
                    <div style={{ width: "32px", height: "3px", backgroundColor: "#dc1e26", marginTop: "6px", borderRadius: "2px" }} />
                  </div>
                  
                  {!loading && (
                    <button
                      type="button"
                      className={`hotel-map-toggle-btn${showMap ? " is-active" : ""}`}
                      onClick={() => setShowMap(!showMap)}
                      title={showMap ? "Switch to list view" : "Switch to split map view"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "transparent",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        cursor: "pointer",
                        marginBottom: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <Map size={14} color="#dc1e26" />
                      <span style={{ color: "#0f172a" }}>MAP</span>
                    </button>
                  )}
                </div>

                {!loading && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "4px" }}>
                    <button
                      type="button"
                      className={`hotel-map-toggle-btn${isFilterOpen ? " is-active" : ""}`}
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      title="Toggle Filters Sidebar"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "transparent",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <Filter size={14} color="#dc1e26" />
                      <span style={{ color: "#0f172a" }}>FILTER</span>
                    </button>
                    
                    <button
                      type="button"
                      className={`hotel-map-toggle-btn${collectionKey === "favourites" ? " is-active" : ""}`}
                      onClick={() => setCollectionKey(collectionKey === "favourites" ? "all" : "favourites")}
                      title="Toggle Saved Favourites"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "transparent",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <Heart size={14} fill={collectionKey === "favourites" ? "#dc1e26" : "none"} color="#dc1e26" />
                      <span style={{ color: "#0f172a" }}>FAVOURITES ({savedStayIds.length})</span>
                    </button>

                    <select
                      value={sortKey}
                      onChange={(event) => setSortKey(event.target.value)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "none",
                        background: "transparent",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#0f172a",
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      <option value="recommended">Sort: Recommended</option>
                      <option value="price">Sort: Lowest Price</option>
                      <option value="rating">Sort: Highest Rating</option>
                    </select>
                  </div>
                )}
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
                {hotels.map((hotel, index) => {
                  const isSaved = savedStayIds.includes(hotel.id);
                  const isSelected = selectedHotelId === hotel.id;
 
                  // Determine entry animation class based on horizontal column position in desktop
                  let animClass = "hotel-card-anim-middle";
                  const posInRow = index % 5;
                  if (posInRow === 0) {
                    animClass = "hotel-card-anim-left";
                  } else if (posInRow === 4) {
                    animClass = "hotel-card-anim-right";
                  }
 
                  return (
                    <article
                      key={hotel.id}
                      className={`hotel-stay-card ${animClass} ${isSelected ? "is-selected-card" : ""}`}
                      onClick={() => {
                        setSelectedHotelId(hotel.id);
                        setTimeout(() => {
                          handleSelectHotel(hotel);
                        }, 350);
                      }}
                      style={{ 
                        cursor: "pointer",
                        animationDelay: `${index * 0.15}s`
                      }}
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
                        
                        {/* Rating Overlay top-left */}
                        <div className="hotel-stay-rating-overlay-topleft">
                          <Star size={12} fill="#eab308" color="#eab308" />
                          <strong>{hotel.rating.toFixed(1)}</strong>
                        </div>
 
                        {/* Save Button top-right */}
                        <button
                          type="button"
                          className={`hotel-save-button-topright${isSaved ? " is-active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSavedStay(hotel.id);
                          }}
                          aria-label={isSaved ? "Remove saved stay" : "Save stay"}
                        >
                          <Heart size={16} fill={isSaved ? "#dc1e26" : "none"} color="#dc1e26" />
                        </button>
                      </div>
  
                      <div className="hotel-stay-content" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <div style={{ flexGrow: 1 }}>
                          <h3 className="hotel-stay-title" style={{ fontSize: "0.92rem", fontWeight: 500, color: "#0f172a", margin: 0 }}>{hotel.name}</h3>
                          <p className="hotel-stay-address" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.78rem" }}>
                            <MapPin size={12} color="#dc1e26" />
                            <span>{hotel.area}, {hotel.city}</span>
                          </p>
                        </div>
                        <hr style={{ border: "0", borderTop: "1px solid rgba(0, 0, 0, 0.06)", margin: "8px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ color: "#dc1e26", fontWeight: "700", fontSize: "1rem" }}>
                              ₹{hotel.price.toLocaleString()}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: "500" }}>
                              {roomsCount > 1 ? `total for ${roomsCount} Rooms` : "total per night"}
                            </span>
                          </div>
                          <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.8rem" }}>
                            ₹{Math.round(hotel.price * 1.25).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: "2px", backgroundColor: "#dc1e26", width: "100%" }} />
                    </article>
                  );
                })}
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
    </div>
   </main>
  );
}