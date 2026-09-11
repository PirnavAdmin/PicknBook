/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  Building2,
  CalendarRange,
  Navigation,
  Map,
  Trees,
  Home,
  BellRing,
  Building,
  Briefcase,
  Umbrella,
  Wifi,
  Car,
  Star,
  Filter,
  Heart,
  MapPin,
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

const PROPERTY_TYPE_FILTERS = [
  { id: "hotels", label: "Hotels" },
  { id: "resorts", label: "Resorts" },
  { id: "villas", label: "Villas" },
  { id: "apartments", label: "Apartments" },
  { id: "boutique", label: "Boutique Hotels" },
  { id: "serviced", label: "Serviced Apartments" },
  { id: "vacation", label: "Vacation Homes" },
  { id: "business", label: "Business Hotels" },
  { id: "beach", label: "Beach Resorts" },
];

const PRICE_FILTERS = [
  { id: "under-4k", label: "Under INR 4,000" },
  { id: "4k-8k", label: "INR 4,000 - INR 8,000" },
  { id: "8k-15k", label: "INR 8,000 - INR 15,000" },
  { id: "over-15k", label: "Over INR 15,000" },
];

const RATING_FILTERS = [
  { id: "5", label: "5 Stars (Excellent 4.8+)" },
  { id: "4", label: "4 Stars (Very Good 4.5+)" },
  { id: "3", label: "3 Stars (Good 4.0+)" },
  { id: "2", label: "2 Stars (Fair 3.0+)" },
  { id: "1", label: "1 Star (Budget <3.0)" },
];

const AMENITY_FILTERS = [
  { id: "Breakfast|Dining", label: "Breakfast Included" },
  { id: "Transfer|Airport|Shuttle", label: "Airport Transfer" },
  { id: "Wi-Fi|Internet", label: "Free Wi-Fi" },
  { id: "Air Conditioning|AC", label: "Air Conditioning" },
  { id: "Early Check-In", label: "Early Check-In" },
  { id: "Late Check-Out", label: "Late Check-Out" },
  { id: "Parking", label: "Parking" },
  { id: "Family-Friendly|Kid", label: "Family-Friendly" },
];

const PAYMENT_FILTERS = [
  { id: "Free Cancellation", label: "Free Cancellation" },
  { id: "Pay at Hotel", label: "Pay at Hotel" },
  { id: "Pay Now", label: "Pay Now" },
  { id: "Book Without Credit Card", label: "Book Without Credit Card" },
];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getHotelRoomCategory(hotel) {
  return String(
    hotel?.roomCategory || hotel?.RoomCategory ||
    hotel?.rooms?.[0]?.cateogry || hotel?.rooms?.[0]?.category ||
    hotel?.cateogry || hotel?.category || ""
  ).trim();
}

function hotelHasBreakfast(hotel) {
  const promotion = String(hotel?.hotelPromotion || hotel?.HotelPromotion || hotel?.hotelPolicy || hotel?.HotelPolicy || "");
  const roomCategory = getHotelRoomCategory(hotel);
  const amenities = rawHotelAmenities(hotel);
  const combined = [promotion, roomCategory, ...amenities].join(" ");
  return /breakfast/i.test(combined);
}

function getHotelPropertyCategory(hotel) {
  const explicit = String(
    hotel?.hotelCategory || hotel?.HotelCategory || hotel?.propertyType || hotel?.propertyCategory || hotel?.hotelType || ""
  ).trim();
  if (explicit) return explicit;
  const name = rawHotelName(hotel);
  if (/resort/i.test(name)) return "Resort";
  if (/villa/i.test(name)) return "Villa";
  if (/apartment/i.test(name)) return "Apartment";
  if (/boutique/i.test(name)) return "Boutique Hotel";
  if (/serviced/i.test(name)) return "Serviced Apartment";
  if (/homestay|vacation|guest house/i.test(name)) return "Vacation Home";
  return "Hotel";
}

function rawHotelName(hotel) {
  return hotel.hotelName || hotel.name || "";
}

function rawHotelPrice(hotel) {
  const price = hotel.price ?? {};
  return Number(
    price.b2cDisplayFare ?? price.B2CDisplayFare ?? price.b2cFinalFare ??
    price.B2CFinalFare ?? price.offeredPriceRoundedOff ?? price.OfferedPriceRoundedOff ??
    price.offeredPrice ?? price.OfferedPrice ?? hotel.offeredFare ?? 0
  );
}

function rawHotelRating(hotel) {
  return Number(hotel.starRating ?? hotel.rating ?? 0) || 0;
}

function rawHotelAmenities(hotel) {
  const facilities = hotel.facilities?.[0]?.facilitiesNames;
  return Array.isArray(facilities) ? facilities : (Array.isArray(hotel.amenities) ? hotel.amenities : []);
}

function hotelMatchesPropertyType(hotel, type) {
  const name = rawHotelName(hotel);
  const category = normalizeText(getHotelPropertyCategory(hotel));
  if (type === "hotels") return !/resort|villa|apartment|boutique|home|serviced|guest house|vacation/i.test(name) && !/resort|villa|apartment|boutique|home|serviced|guest house|vacation/i.test(category);
  if (type === "resorts") return /resort/i.test(name) || /resort/i.test(category);
  if (type === "villas") return /villa/i.test(name) || /villa/i.test(category);
  if (type === "apartments") return /apartment/i.test(name) || /apartment/i.test(category);
  if (type === "boutique") return /boutique/i.test(name) || /boutique/i.test(category);
  if (type === "serviced") return /serviced/i.test(name) || /serviced/i.test(category);
  if (type === "vacation") return /vacation|home|guest house/i.test(name) || /vacation|home|guest house/i.test(category);
  if (type === "business") return /business/i.test(name) || /business/i.test(category);
  if (type === "beach") return /beach/i.test(name) || /beach/i.test(category);
  return false;
}

function hotelMatchesPrice(hotel, range) {
  const price = rawHotelPrice(hotel);
  if (range === "under-4k") return price < 4000;
  if (range === "4k-8k") return price >= 4000 && price <= 8000;
  if (range === "8k-15k") return price >= 8000 && price <= 15000;
  return price > 15000;
}

function hotelMatchesRating(hotel, rating) {
  const value = rawHotelRating(hotel);
  if (rating === "5") return value >= 4.8;
  if (rating === "4") return value >= 4.5 && value < 4.8;
  if (rating === "3") return value >= 4 && value < 4.5;
  if (rating === "2") return value >= 3 && value < 4;
  return value < 3;
}

function hotelMatchesAmenity(hotel, amenity) {
  const regex = new RegExp(amenity, "i");
  return rawHotelAmenities(hotel).some((item) => regex.test(typeof item === "object" ? item.name || item.Name || "" : item));
}

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

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  if (diffTime <= 0) return 1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    ["hotelAmenities", Array.isArray(hotel?.amenities) ? hotel.amenities.map((a) => typeof a === "object" && a !== null ? String(a.name || a.Name || a.title || "").trim() : String(a || "").trim()).filter(Boolean).join("|") : ""],
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
    const localitySources = [
      hotelRecord?.hotelLocation,
      hotelRecord?.hotelAddress,
      hotelRecord?.hotelDescription,
      hotelRecord?.address,
      hotelRecord?.area,
      hotelRecord?.location,
      hotelRecord?.name,
      hotelRecord?.hotelName,
      hotelRecord?.city
    ].filter(Boolean);

    const localityText = localitySources.join(" ");
    const normalize = (value) => String(value || "").toLowerCase();

    const matches = [
      ["nanakramguda", "Financial District", "Nanakramguda"],
      ["hitech city", "Hitech City", "Hitech City"],
      ["gachibowli", "Gachibowli", "Gachibowli"],
      ["madhapur", "Madhapur", "Madhapur"],
      ["kondapur", "Kondapur", "Kondapur"],
      ["kukatpally", "Kukatpally", "Kukatpally"],
      ["secunderabad", "Secunderabad", "Secunderabad"],
      ["banjara hills", "Banjara Hills", "Banjara Hills"],
      ["shamshabad", "Shamshabad", "Shamshabad"],
      ["nampally", "Nampally", "Nampally"],
      ["abids", "Abids", "Abids"],
      ["khairatabad", "Khairatabad", "Khairatabad"],
      ["saifabad", "Saifabad", "Saifabad"],
      ["begumpet", "Begumpet", "Begumpet"],
      ["himayatnagar", "Himayatnagar", "Himayatnagar"],
      ["charminar", "Charminar", "Charminar"],
      ["miyapur", "Miyapur", "Miyapur"],
      ["hafeezpet", "Hafeezpet", "Hafeezpet"],
      ["kothaguda", "Kothaguda", "Kothaguda"],
      ["kothapet", "Kothapet", "Kothapet"],
      ["mehdipatnam", "Mehdipatnam", "Mehdipatnam"],
      ["attapur", "Attapur", "Attapur"],
      ["uppal", "Uppal", "Uppal"],
      ["falaknuma", "Falaknuma", "Falaknuma"],
      ["panaji", "Panaji", "Panaji"],
      ["candolim", "Candolim", "Candolim"],
      ["majorda", "Majorda", "Majorda"],
      ["vagator", "Vagator", "Vagator"],
      ["baga beach", "Baga Beach", "Baga Beach"],
      ["chanakyapuri", "Chanakyapuri", "Chanakyapuri"],
      ["lodhi road", "Lodhi Road", "Lodhi Road"],
      ["mahipalpur", "Mahipalpur", "Mahipalpur"],
      ["connaught place", "Connaught Place", "Connaught Place"],
      ["mansingh road", "Mansingh Road", "Mansingh Road"]
    ];

    for (const [needle, fallback, output] of matches) {
      if (normalize(localityText).includes(normalize(needle))) return output;
      if (normalize(hotelRecord?.hotelDescription || "").includes(normalize(needle))) return output;
      if (normalize(hotelRecord?.address || "").includes(normalize(needle))) return output;
      if (normalize(hotelRecord?.name || "").includes(normalize(needle))) return output;
      if (normalize(hotelRecord?.hotelName || "").includes(normalize(needle))) return output;
      if (normalize(fallback).includes(normalize(needle))) return output;
    }

    return hotelRecord?.area || hotelRecord?.hotelLocation || hotelRecord?.hotelAddress || "City centre";
  };

  const availableLocalities = useMemo(() => {
    const list = apiHotels.map(h => getHotelLocality(h));
    return Array.from(new Set(list.filter(Boolean)));
  }, [apiHotels]);

  const filterCounts = useMemo(() => {
    const count = (matcher) => apiHotels.filter(matcher).length;
    return {
      propertyType: Object.fromEntries(PROPERTY_TYPE_FILTERS.map((item) => [item.id, count((hotel) => hotelMatchesPropertyType(hotel, item.id))])),
      price: Object.fromEntries(PRICE_FILTERS.map((item) => [item.id, count((hotel) => hotelMatchesPrice(hotel, item.id))])),
      rating: Object.fromEntries(RATING_FILTERS.map((item) => [item.id, count((hotel) => hotelMatchesRating(hotel, item.id))])),
      amenities: Object.fromEntries(AMENITY_FILTERS.map((item) => [item.id, count((hotel) => hotelMatchesAmenity(hotel, item.id))])),
      payment: Object.fromEntries(
        PAYMENT_FILTERS.map((item) => [item.id, count((hotel) => {
          const policy = String(hotel.hotelPolicy || "");
          if (item.id === "Free Cancellation") return /free cancellation|refundable/i.test(policy) && !/non-refundable/i.test(policy);
          if (item.id === "Pay at Hotel" || item.id === "Book Without Credit Card") return /guarantee|pay at hotel/i.test(policy);
          return /prepayment|pay now/i.test(policy);
        })])
      ),
      localities: Object.fromEntries(availableLocalities.map((locality) => [locality, count((hotel) => getHotelLocality(hotel) === locality)])),
    };
  }, [apiHotels, availableLocalities]);
 
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
        // Use ?? (nullish coalescing) to avoid skipping valid 0 values from the API
        const priceObj = hotelRecord.price ?? {};
        const basePrice = Number(
          priceObj.b2cDisplayFare ?? priceObj.B2CDisplayFare ??
          priceObj.b2cFinalFare ?? priceObj.B2CFinalFare ??
          priceObj.offeredPriceRoundedOff ?? priceObj.OfferedPriceRoundedOff ??
          priceObj.offeredPrice ?? priceObj.OfferedPrice ??
          priceObj.publishedPriceRoundedOff ?? priceObj.PublishedPriceRoundedOff ??
          priceObj.roomPrice ?? priceObj.RoomPrice ??
          priceObj.b2CBasePrice ?? priceObj.b2cBasePrice ??
          hotelRecord.offeredFare ?? 0
        );
        // Published price from API for strikethrough (only if genuinely provided)
        const publishedPrice = Number(
          priceObj.publishedPriceRoundedOff ?? priceObj.PublishedPriceRoundedOff ??
          priceObj.publishedPrice ?? priceObj.PublishedPrice ?? 0
        );
        const visuals = getHotelVisuals(`${hotelRecord.hotelCode || hotelRecord.hotelId || hotelName}-${destination}-${index}`);
        const rating = Number(hotelRecord.starRating ?? hotelRecord.rating ?? 0) || 0;
        const reviewCount = Number(hotelRecord.reviewCount ?? hotelRecord.ReviewCount ?? 0);
        const apiImage = hotelRecord.hotelPicture || (hotelRecord.images && hotelRecord.images.length > 0 ? hotelRecord.images[0] : null);
        
        // Build a preliminary offer structure from the search price — real rooms come from getHotelRoom
        const searchOffer = {
          price: basePrice,
          cancellationPolicy: hotelRecord.hotelPolicy || "",
        };
        const mappedOffers = [searchOffer];
<<<<<<< HEAD
=======
        const roomCategory = getHotelRoomCategory(hotelRecord);
        const breakfastIncluded = hotelHasBreakfast(hotelRecord);
        const propertyCategory = getHotelPropertyCategory(hotelRecord);
>>>>>>> cf14845 (update on changes mentioned on 9th date)

        return {
          id: hotelRecord.hotelCode || hotelRecord.hotelId || `hotel-${String(hotelName).toLowerCase().replace(/\s+/g, "-")}`,
          hotelId: hotelRecord.hotelCode || hotelRecord.hotelId,
          TraceId: hotelRecord.traceId || hotelRecord.TraceId,
          ResultIndex: hotelRecord.resultIndex || hotelRecord.ResultIndex,
          SrdvType: hotelRecord.srdvType || hotelRecord.SrdvType || "MixAPI",
          SrdvIndex: hotelRecord.srdvIndex || hotelRecord.SrdvIndex,
          name: hotelName,
          city: hotelRecord.city || hotelRecord.cityCode || destination,
          area: getHotelLocality(hotelRecord),
          address: hotelRecord.hotelAddress || hotelRecord.address || hotelRecord.hotelLocation || destination,
          rating,
          reviewCount,
          tag:
            hotelRecord.tag ||
            (rating >= 4.5 ? "Top Rated" : rating >= 3.5 ? "Popular" : ""),
          price: basePrice,
<<<<<<< HEAD
          // Only set oldPrice if the API returned a published price that is higher than offered price
          oldPrice: (publishedPrice > basePrice) ? publishedPrice : 0,
          amenities: hotelRecord.facilities && hotelRecord.facilities.length > 0 && hotelRecord.facilities[0].facilitiesNames
            ? hotelRecord.facilities[0].facilitiesNames 
            : (Array.isArray(hotelRecord.amenities) ? hotelRecord.amenities : []),
          note: searchOffer.cancellationPolicy,
=======
          oldPrice: (publishedPrice > basePrice) ? publishedPrice : 0,
          amenities: hotelRecord.facilities && hotelRecord.facilities.length > 0 && hotelRecord.facilities[0].facilitiesNames
            ? hotelRecord.facilities[0].facilitiesNames
            : (Array.isArray(hotelRecord.amenities) ? hotelRecord.amenities : []),
          note: searchOffer.cancellationPolicy,
          roomCategory,
          breakfastIncluded,
          propertyCategory,
>>>>>>> cf14845 (update on changes mentioned on 9th date)
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
            searchOffer,
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

<<<<<<< HEAD
        if (collectionKey === "breakfast" && !hotelRecord.amenities.some((item) => /breakfast/i.test(typeof item === "object" && item !== null ? String(item.name || item.Name || "") : String(item || "")))) {
=======
        if (collectionKey === "breakfast" && !hotelRecord.breakfastIncluded) {
>>>>>>> cf14845 (update on changes mentioned on 9th date)
          return false;
        }

        if (collectionKey === "work-ready" && !hotelRecord.amenities.some((item) => /wi-?fi|desk|workspace/i.test(typeof item === "object" && item !== null ? String(item.name || item.Name || "") : String(item || "")))) {
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
            const category = normalizeText(hotelRecord.propertyCategory || getHotelPropertyCategory(hotelRecord));
            const name = normalizeText(hotelRecord.name || "");
            if (type === "hotels") return !/resort|villa|apartment|boutique|home|serviced|guest house|vacation/i.test(name) && !/resort|villa|apartment|boutique|home|serviced|guest house|vacation/i.test(category);
            if (type === "resorts") return /resort/i.test(name) || /resort/i.test(category);
            if (type === "villas") return /villa/i.test(name) || /villa/i.test(category);
            if (type === "apartments") return /apartment/i.test(name) || /apartment/i.test(category);
            if (type === "boutique") return /boutique/i.test(name) || /boutique/i.test(category);
            if (type === "serviced") return /serviced/i.test(name) || /serviced/i.test(category);
            if (type === "vacation") return /vacation|home|guest house/i.test(name) || /vacation|home|guest house/i.test(category);
            if (type === "business") return /business/i.test(name) || /business/i.test(category);
            if (type === "beach") return /beach/i.test(name) || /beach/i.test(category);
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
            const hasAmenity = hotelRecord.amenities.some((hAmenity) => regex.test(typeof hAmenity === "object" && hAmenity !== null ? String(hAmenity.name || hAmenity.Name || "") : String(hAmenity || "")));
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
        amenities: Array.isArray(hotel.amenities)
          ? hotel.amenities.map((a) => typeof a === "object" && a !== null ? String(a.name || a.Name || a.title || "").trim() : String(a || "").trim()).filter(Boolean)
          : (hotel.amenities || []),
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

          <div className="inline-modify-container" style={{ padding: 0, width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
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
                      {PROPERTY_TYPE_FILTERS.map((type) => {
                        const isChecked = selectedPropertyType === type.id;
                        const resultCount = filterCounts.propertyType[type.id] || 0;
                        return (
                          <label key={type.id} className="hotel-sidebar-checkbox-label">
                            <input type="checkbox" checked={isChecked} disabled={resultCount === 0 && !isChecked} onChange={() => handleTogglePropertyType(type.id)} />
                            <span>{type.label} ({resultCount})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hotel-sidebar-filter-group">
                    <h4>Price Range</h4>
                    <div className="hotel-sidebar-checklist">
                      {PRICE_FILTERS.map((range) => {
                        const isChecked = selectedPriceRanges.includes(range.id);
                        const resultCount = filterCounts.price[range.id] || 0;
                        return (
                          <label key={range.id} className="hotel-sidebar-checkbox-label">
                            <input type="checkbox" checked={isChecked} disabled={resultCount === 0 && !isChecked} onChange={() => handleTogglePriceRange(range.id)} />
                            <span>{range.label} ({resultCount})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hotel-sidebar-filter-group">
                    <h4>Star Rating</h4>
                    <div className="hotel-sidebar-checklist">
                      {RATING_FILTERS.map((rating) => {
                        const isChecked = selectedRatings.includes(rating.id);
                        const resultCount = filterCounts.rating[rating.id] || 0;
                        return (
                          <label key={rating.id} className="hotel-sidebar-checkbox-label">
                            <input type="checkbox" checked={isChecked} disabled={resultCount === 0 && !isChecked} onChange={() => handleToggleRating(rating.id)} />
                            <span>{rating.label} ({resultCount})</span>
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
                        const resultCount = filterCounts.amenities[amenity.id] || 0;
                        return (
                          <label key={amenity.id} className="hotel-sidebar-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={resultCount === 0 && !isChecked}
                              onChange={() => handleToggleAmenity(amenity.id)}
                            />
                            <span>{amenity.label} ({resultCount})</span>
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
                          const resultCount = filterCounts.localities[loc] || 0;
                          return (
                            <label key={loc} className="hotel-sidebar-checkbox-label">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={resultCount === 0 && !isChecked}
                                onChange={() => handleToggleLocality(loc)}
                              />
                              <span>{loc} ({resultCount})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="hotel-sidebar-filter-group">
                    <h4>Payment Preferences</h4>
                    <div className="hotel-sidebar-checklist">
                      {PAYMENT_FILTERS.map((pref) => {
                        const isChecked = selectedPaymentPrefs.includes(pref.id);
                        const resultCount = filterCounts.payment[pref.id] || 0;
                        return (
                          <label key={pref.id} className="hotel-sidebar-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={resultCount === 0 && !isChecked}
                              onChange={() => handleTogglePaymentPref(pref.id)}
                            />
                            <span>{pref.label} ({resultCount})</span>
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
                    <div className="hotel-results-count-group">
                      <span className="hotel-results-count">
                        Showing <strong>{hotels.length}</strong> of <strong>{apiHotels.length}</strong> hotels
                      </span>
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
                    </div>
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
                        animationDelay: `${Math.min(index, 10) * 0.1}s`
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
                          <div className="hotel-result-badges" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                            {hotel.breakfastIncluded && <span className="hotel-meal-badge">Breakfast Included</span>}
                            {hotel.roomCategory && <span className="hotel-room-category-badge">{hotel.roomCategory}</span>}
                          </div>
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
                          {hotel.oldPrice > 0 && hotel.oldPrice > hotel.price && (
                            <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.8rem" }}>
                              ₹{hotel.oldPrice.toLocaleString()}
                            </span>
                          )}
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