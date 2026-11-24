/* eslint-disable */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HotelDatePicker from "../../components/HotelDatePicker";
import {
  ArrowLeft,
  Home,
  MapPin,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  UserRound,
  CheckCircle2,
  Wifi,
  Waves,
  Utensils,
  Dumbbell,
  Bus,
  Headphones,
  BedDouble,
  X,
  Camera,
  Plane,
  Car,
  Sparkles,
  Wind,
  Coffee,
  Plus,
  Minus,
  Loader2
} from "lucide-react";
import { getAmenityIcon, getAmenityName } from "../../utils/amenityIconMap";
import { searchHotels, getHotelRoom } from "../../services/hotelBookingService";

const DEFAULT_HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatRupee = (val) => {
  const num = Math.round(Number(val) || 0);
  return `₹${new Intl.NumberFormat("en-IN").format(num)}`;
};

function parseToDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateIso(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const formatFriendlyDate = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = parseToDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return String(dateVal);
  }
};

const AMENITY_SPECS = [
  {
    key: "wifi",
    label: "Free Wi-Fi",
    icon: (props) => <Wifi {...props} />,
    match: ["wifi", "wi-fi", "internet", "wireless"]
  },
  {
    key: "pool",
    label: "Swimming Pool",
    icon: (props) => <Waves {...props} />,
    match: ["pool", "swimming"]
  },
  {
    key: "dining",
    label: "Restaurant",
    icon: (props) => <Utensils {...props} />,
    match: ["restaurant", "dining", "cafe", "coffee", "bistro", "eatery", "breakfast"]
  },
  {
    key: "fitness",
    label: "Fitness Center",
    icon: (props) => <Dumbbell {...props} />,
    match: ["gym", "fitness", "exercise", "health club", "workout"]
  },
  {
    key: "shuttle",
    label: "Airport Shuttle",
    icon: (props) => <Bus {...props} />,
    match: ["shuttle", "airport transfer", "transportation", "pickup", "drop", "transfer"]
  },
  {
    key: "frontdesk",
    label: "24/7 Front Desk",
    icon: (props) => <Headphones {...props} />,
    match: ["front desk", "reception", "24-hour", "24/7", "concierge", "bellhop", "help desk", "desk"]
  },
  {
    key: "parking",
    label: "Free Parking",
    icon: (props) => <Car {...props} />,
    match: ["parking", "valet", "garage"]
  },
  {
    key: "spa",
    label: "Spa & Wellness",
    icon: (props) => <Sparkles {...props} />,
    match: ["spa", "sauna", "massage", "wellness", "steam"]
  },
  {
    key: "ac",
    label: "Air Conditioning",
    icon: (props) => <Wind {...props} />,
    match: ["air conditioning", "air condition", "ac", "climate control", "cooling"]
  },
  {
    key: "bar",
    label: "Bar & Lounge",
    icon: (props) => <Coffee {...props} />,
    match: ["bar", "lounge", "cocktail", "pub", "drinks"]
  }
];

export default function HotelDetail({
  hotel = {},
  setHotel,
  offer,
  setOffer,
  searchContext = {},
  roomsCount = 1,
  selectedMultiRooms = [],
  selectingOfferId,
  handleSelectOffer,
  formatCurrency = formatRupee,
  formatNightLabel,
  toDisplayDate,
  checkInDate: initialCheckInDate,
  checkOutDate: initialCheckOutDate,
  guestSummary: initialGuestSummary,
  basePrice,
  tax,
  finalPayable,
  convenienceFee,
  setCurrentStep,
  gallery = [],
  displayedImages = [],
  stayLocation,
  stayFacts = [],
  stayHighlights = [],
  visuals,
  nights: initialNights = 1
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [heroImgIndex, setHeroImgIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [showAllDesc, setShowAllDesc] = useState(false);
  const [openPolicySection, setOpenPolicySection] = useState(false);
  const [openFacilitiesSection, setOpenFacilitiesSection] = useState(false);

  // Active popup state: null | "checkin" | "checkout" | "guests"
  const [activePopup, setActivePopup] = useState(null);

  // Controlled Check-in & Check-out dates
  const defaultInStr = useMemo(() => {
    if (initialCheckInDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(initialCheckInDate)) return initialCheckInDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(initialCheckInDate)) {
        const [d, m, y] = initialCheckInDate.split("-");
        return `${y}-${m}-${d}`;
      }
    }
    const today = new Date();
    return formatDateIso(today);
  }, [initialCheckInDate]);

  const defaultOutStr = useMemo(() => {
    if (initialCheckOutDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(initialCheckOutDate)) return initialCheckOutDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(initialCheckOutDate)) {
        const [d, m, y] = initialCheckOutDate.split("-");
        return `${y}-${m}-${d}`;
      }
    }
    const inDate = parseToDate(defaultInStr);
    const tomorrow = new Date(inDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateIso(tomorrow);
  }, [initialCheckOutDate, defaultInStr]);

  const [selectedCheckIn, setSelectedCheckIn] = useState(defaultInStr);
  const [selectedCheckOut, setSelectedCheckOut] = useState(defaultOutStr);

  useEffect(() => {
    if (defaultInStr) setSelectedCheckIn(defaultInStr);
  }, [defaultInStr]);

  useEffect(() => {
    if (defaultOutStr) setSelectedCheckOut(defaultOutStr);
  }, [defaultOutStr]);

  // Controlled Rooms, Adults, Children
  const [roomsCountState, setRoomsCountState] = useState(() => Math.max(1, Number(roomsCount) || 1));
  const [adultsCountState, setAdultsCountState] = useState(() => {
    const val = Number(searchContext?.adults);
    return !isNaN(val) && val >= 1 ? val : 2;
  });
  const [childrenCountState, setChildrenCountState] = useState(() => {
    const val = Number(searchContext?.children);
    return !isNaN(val) && val >= 0 ? val : 0;
  });

  // Temp state for Guests popup
  const [tempRooms, setTempRooms] = useState(roomsCountState);
  const [tempAdults, setTempAdults] = useState(adultsCountState);
  const [tempChildren, setTempChildren] = useState(childrenCountState);

  const openGuestsPopup = () => {
    setTempRooms(roomsCountState);
    setTempAdults(adultsCountState);
    setTempChildren(childrenCountState);
    setActivePopup("guests");
  };

  const guestsDropdownRef = useRef(null);
  useEffect(() => {
    if (activePopup !== "guests") return;
    const handleOutside = (e) => {
      if (guestsDropdownRef.current && !guestsDropdownRef.current.contains(e.target)) {
        setActivePopup(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [activePopup]);

  // Dynamic guest summary string
  const currentGuestSummary = useMemo(() => {
    const rText = `${roomsCountState} Room${roomsCountState > 1 ? "s" : ""}`;
    const aText = `${adultsCountState} Adult${adultsCountState > 1 ? "s" : ""}`;
    const cText = childrenCountState > 0 ? `, ${childrenCountState} Child${childrenCountState > 1 ? "ren" : ""}` : "";
    return `${rText}, ${aText}${cText}`;
  }, [roomsCountState, adultsCountState, childrenCountState]);

  // Live availability search state
  const [isSearchingAvailability, setIsSearchingAvailability] = useState(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState("");

  // Function to refresh room availability and live pricing via API
  const handleRefreshAvailability = async (ci, co, rms, adl, chd) => {
    setIsSearchingAvailability(true);
    setSearchStatusMsg("Checking live room availability & prices...");

    try {
      const cityName = hotel.city || hotel.area || searchContext?.destination || "Mumbai";
      const dynamicRoomsConfig = Array.from({ length: rms }, () => ({
        adults: Math.max(1, Math.floor(adl / rms)),
        children: Math.floor(chd / rms),
        childAges: []
      }));
      const remainderAdults = adl % rms;
      if (remainderAdults > 0 && dynamicRoomsConfig[0]) {
        dynamicRoomsConfig[0].adults += remainderAdults;
      }

      // Update URL query parameters so values persist across navigation/reload
      const params = new URLSearchParams(window.location.search);
      params.set("checkInDate", ci);
      params.set("checkOutDate", co);
      params.set("rooms", String(rms));
      params.set("adults", String(adl));
      params.set("children", String(chd));
      params.set("roomsConfig", JSON.stringify(dynamicRoomsConfig));
      window.history.replaceState(null, "", `?${params.toString()}`);

      // Call searchHotels for updated TraceId & ResultIndex
      const hotels = await searchHotels({
        destination: cityName,
        checkInDate: ci,
        checkOutDate: co,
        roomsConfig: dynamicRoomsConfig
      });

      const currentCode = String(hotel.hotelId || hotel.hotelCode || hotel.id || "").toLowerCase();
      const currentName = String(hotel.name || "").toLowerCase().trim();
      const matched = (Array.isArray(hotels) ? hotels : []).find(h => {
        const code = String(h.hotelCode || h.hotelId || h.HotelCode || "").toLowerCase();
        const name = String(h.name || h.HotelName || "").toLowerCase().trim();
        return (currentCode && code === currentCode) || (currentName && name && (name.includes(currentName) || currentName.includes(name)));
      });

      const newTraceId = matched?.TraceId || matched?.traceId || hotel.TraceId || hotel.traceId;
      const newResultIndex = matched?.ResultIndex || matched?.resultIndex || hotel.ResultIndex || hotel.resultIndex;
      const newSrdvType = matched?.SrdvType || matched?.srdvType || hotel.SrdvType || hotel.srdvType || "MixAPI";
      const newSrdvIndex = matched?.SrdvIndex || matched?.srdvIndex || hotel.SrdvIndex || hotel.srdvIndex;
      const targetHotelCode = matched?.hotelCode || matched?.HotelCode || hotel.hotelId || hotel.hotelCode;

      // Call getHotelRoom for live room availability and pricing
      const roomPayload = {
        TraceId: String(newTraceId || ""),
        ResultIndex: String(newResultIndex || ""),
        SrdvType: String(newSrdvType || "MixAPI"),
        SrdvIndex: String(newSrdvIndex || ""),
        HotelCode: String(targetHotelCode || "")
      };

      const roomsResult = await getHotelRoom(roomPayload);
      const hotelRoomResult = roomsResult?.getHotelRoomResult || roomsResult?.GetHotelRoomResult || roomsResult?.HotelRoomResult || {};
      const hotelRoomsDetails = hotelRoomResult?.hotelRoomsDetails || hotelRoomResult?.HotelRoomsDetails;

      if (hotelRoomsDetails && Array.isArray(hotelRoomsDetails)) {
        const allRooms = [];
        hotelRoomsDetails.forEach((category) => {
          const catName = category.categoryName || category.CategoryName || "";
          if (category.rooms || category.Rooms) {
            const catRooms = category.rooms || category.Rooms;
            if (Array.isArray(catRooms)) {
              catRooms.forEach(r => allRooms.push({ ...r, _categoryName: catName }));
            }
          } else {
            allRooms.push({ ...category, _categoryName: catName });
          }
        });

        if (allRooms.length > 0) {
          const newOffers = allRooms.map((r, i) => {
            const priceObj = r.price || r.Price || {};
            const cancelPolicies = r.cancellationPolicies || r.CancellationPolicies || [];
            const extractedPrice = Number(
              priceObj.b2cDisplayFare ?? priceObj.B2CDisplayFare ??
              priceObj.b2cFinalFare ?? priceObj.B2CFinalFare ??
              priceObj.offeredPriceRoundedOff ?? priceObj.OfferedPriceRoundedOff ??
              priceObj.offeredPrice ?? priceObj.OfferedPrice ??
              priceObj.publishedPriceRoundedOff ?? priceObj.PublishedPriceRoundedOff ??
              priceObj.roomPrice ?? priceObj.RoomPrice ??
              (typeof priceObj === 'number' ? priceObj : 0)
            );

            const cancellationObj = r.cancellation || r.Cancellation || null;
            const lastCancelDate = r.lastCancellationDate || r.LastCancellationDate || cancellationObj?.freeCancellationUntil || "";
            const isFullRefund = r.fullRefundAllowed ?? r.FullRefundAllowed ?? (cancelPolicies.some(p => Number(p.charge || p.Charge || 0) === 0));

            let policySummary = "Cancellation terms apply";
            if (isFullRefund) {
              policySummary = "Free cancellation available";
            } else if (r.cancellationPolicy) {
              policySummary = r.cancellationPolicy;
            } else {
              policySummary = "Non-refundable / Cancellation charges apply";
            }

            return {
              ...r,
              offerId: r.roomId || r.RatePlanCode || `room-${i}`,
              selectionKey: `room-${i}-${r.roomId || r.RatePlanCode || r.roomTypeName || r.RoomTypeName || "option"}`,
              price: extractedPrice,
              originalPrice: priceObj,
              currency: priceObj.currencyCode || priceObj.CurrencyCode || "INR",
              roomCategory: r.roomTypeName || r.RoomTypeName || r.roomTypeCategory || r.RoomTypeCategory || r._categoryName || "Room",
              cancellationPolicy: policySummary,
              cancellationPolicies: cancelPolicies,
              cancellation: cancellationObj,
              lastCancellationDate: lastCancelDate,
              fullRefundAllowed: isFullRefund,
              isRefundable: isFullRefund,
              bedType: r.bedTypes || r.BedTypes || "",
              amenities: r.amenities || r.Amenities || [],
              checkInDate: ci,
              checkOutDate: co
            };
          });

          const updatedHotel = {
            ...hotel,
            TraceId: newTraceId,
            ResultIndex: newResultIndex,
            offers: newOffers
          };

          if (setHotel) setHotel(updatedHotel);
          if (setOffer && newOffers[0]) setOffer(newOffers[0]);
          setSearchStatusMsg("");
        }
      }
    } catch (err) {
      console.warn("[HotelDetail] Availability refresh note:", err.message);
      setSearchStatusMsg("");
    } finally {
      setIsSearchingAvailability(false);
    }
  };

  // Date selection handlers
  const handleCheckInSelect = (newInDate) => {
    setSelectedCheckIn(newInDate);
    const inDate = parseToDate(newInDate);
    const outDate = parseToDate(selectedCheckOut);

    let nextOutStr = selectedCheckOut;
    if (outDate <= inDate) {
      const nextDay = new Date(inDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextOutStr = formatDateIso(nextDay);
      setSelectedCheckOut(nextOutStr);
    }

    setActivePopup("checkout");
    handleRefreshAvailability(newInDate, nextOutStr, roomsCountState, adultsCountState, childrenCountState);
  };

  const handleCheckOutSelect = (newOutDate) => {
    setSelectedCheckOut(newOutDate);
    setActivePopup(null);
    handleRefreshAvailability(selectedCheckIn, newOutDate, roomsCountState, adultsCountState, childrenCountState);
  };

  // Guests Apply handler
  const handleGuestsApply = () => {
    setRoomsCountState(tempRooms);
    setAdultsCountState(tempAdults);
    setChildrenCountState(tempChildren);
    setActivePopup(null);
    handleRefreshAvailability(selectedCheckIn, selectedCheckOut, tempRooms, tempAdults, tempChildren);
  };

  // Favorites logic persisted in localStorage
  const hotelId = hotel.id || hotel.code || hotel.name || "stay-1";
  const [savedStayIds, setSavedStayIds] = useState(() => {
    try {
      const saved = localStorage.getItem("savedStayIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const isFavourite = savedStayIds.includes(hotelId);

  const toggleFavourite = () => {
    setSavedStayIds((current) => {
      const next = current.includes(hotelId)
        ? current.filter(id => id !== hotelId)
        : [...current, hotelId];
      try {
        localStorage.setItem("savedStayIds", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: hotel.name, url: window.location.href }).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (e) {
        prompt("Copy link:", window.location.href);
      }
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowRight") {
        setLightboxIndex((curr) => (curr + 1) % allImages.length);
      }
      if (event.key === "ArrowLeft") {
        setLightboxIndex((curr) => (curr - 1 + allImages.length) % allImages.length);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  // Consolidate images — guarantee at least 4 consistent images
  const allImages = useMemo(() => {
    const combined = [
      ...(Array.isArray(displayedImages) ? displayedImages : []),
      ...(Array.isArray(hotel.images) ? hotel.images : []),
      ...(Array.isArray(gallery) ? gallery : [])
    ].filter(Boolean);

    const unique = Array.from(new Set(combined));
    if (unique.length < 4) {
      DEFAULT_HOTEL_IMAGES.forEach(img => {
        if (!unique.includes(img)) unique.push(img);
      });
    }
    return unique.length > 0 ? unique : DEFAULT_HOTEL_IMAGES;
  }, [displayedImages, hotel.images, gallery]);

  // Raw amenities array extracted cleanly from API data
  const rawAmenitiesList = useMemo(() => {
    const raw = Array.isArray(hotel.amenities)
      ? hotel.amenities
      : (typeof hotel.amenities === "string" ? hotel.amenities.split(",").map(a => a.trim()) : []);

    return raw
      .map((item) => {
        if (!item) return "";
        if (typeof item === "object" && item !== null) {
          return String(item.name || item.Name || item.title || "").trim();
        }
        const s = String(item).trim();
        return s === "[object Object]" ? "" : s;
      })
      .filter(Boolean);
  }, [hotel.amenities]);

  // Detect available key amenities dynamically from the API data
  const availableKeyAmenities = useMemo(() => {
    if (rawAmenitiesList.length === 0) {
      return AMENITY_SPECS.slice(0, 6).map(spec => ({
        label: spec.label,
        icon: spec.icon({ size: 22, color: "#e11d48" })
      }));
    }

    const lowerList = rawAmenitiesList.map(a => a.toLowerCase());
    const matched = [];

    AMENITY_SPECS.forEach(spec => {
      const isMatch = lowerList.some(item =>
        spec.match.some(m => item.includes(m))
      );
      if (isMatch) {
        matched.push({
          label: spec.label,
          icon: spec.icon({ size: 22, color: "#e11d48" })
        });
      }
    });

    if (matched.length >= 3) {
      return matched.slice(0, 6);
    }

    rawAmenitiesList.forEach(item => {
      if (matched.length >= 6) return;
      const name = getAmenityName(item);
      if (name && !matched.some(m => m.label.toLowerCase() === name.toLowerCase())) {
        matched.push({
          label: name,
          icon: <Wifi size={22} color="#e11d48" />
        });
      }
    });

    return matched.length > 0 ? matched.slice(0, 6) : AMENITY_SPECS.slice(0, 6).map(spec => ({
      label: spec.label,
      icon: spec.icon({ size: 22, color: "#e11d48" })
    }));
  }, [rawAmenitiesList]);

  // Clean description extraction without raw JSON or duplicates
  const cleanDescription = useMemo(() => {
    if (typeof hotel.description === "string" && hotel.description.trim()) {
      return hotel.description.trim();
    }
    if (Array.isArray(hotel.description)) {
      const texts = [];
      hotel.description.forEach(group => {
        if (!group) return;
        if (group.name === "Default" || group.name === "Attractions") return;
        if (Array.isArray(group.detail)) {
          texts.push(...group.detail.filter(Boolean));
        } else if (typeof group.detail === "string" && group.detail.trim()) {
          texts.push(group.detail.trim());
        }
      });
      const filtered = texts.filter(t => !t.startsWith("{") && !t.endsWith("}"));
      if (filtered.length > 0) {
        return filtered.join(" ");
      }
    }
    return `A premium 5-star hotel in ${hotel.area || hotel.city || "the city"}, offering a perfect blend of luxury, comfort, and warm hospitality. Ideal for both business and leisure travellers.`;
  }, [hotel.description, hotel.area, hotel.city]);

  // Primary landmark / airport detection from API attractions
  const primaryLandmark = useMemo(() => {
    let rawAttractions = Array.isArray(hotel.attractions)
      ? hotel.attractions.map(a => typeof a === "object" ? (a.name || a.Name || "") : String(a)).filter(Boolean)
      : [];

    const airportItem = rawAttractions.find(item => item.toLowerCase().includes("airport"));
    if (airportItem) {
      return airportItem.replace(/-\s*\d+.*$/, "").replace(/Distances are.*$/i, "").trim();
    }
    return hotel.city ? `${hotel.city} International Airport (T2)` : "Mumbai International Airport (T2)";
  }, [hotel.attractions, hotel.city]);

  // Key Highlights list
  const highlightsList = useMemo(() => {
    const list = [
      "Spacious & modern rooms",
      "Multiple dining options"
    ];
    if (primaryLandmark) {
      list.push(`Close to ${primaryLandmark}`);
    } else {
      list.push("Close to Airport & Transit Hubs");
    }
    list.push("Business & meeting facilities");
    return list;
  }, [primaryLandmark]);

  // Free cancellation & Breakfast included detection
  const hasFreeCancellation = useMemo(() => {
    if (!hotel.offers || hotel.offers.length === 0) return true;
    return hotel.offers.some(o => o.isRefundable || o.fullRefundAllowed);
  }, [hotel.offers]);

  const hasBreakfast = useMemo(() => {
    const fromOffers = hotel.offers?.some(o => {
      const mb = (o.MealBasis || o.mealBasis || o.boardBasis || "").toLowerCase();
      return mb.includes("breakfast") || mb.includes("bed & breakfast") || mb.includes("bb");
    });
    if (fromOffers) return true;
    return rawAmenitiesList.some(a => a.toLowerCase().includes("breakfast"));
  }, [hotel.offers, rawAmenitiesList]);

  // Starting Price
  const startingPrice = useMemo(() => {
    if (hotel.offers && hotel.offers.length > 0) {
      const validPrices = hotel.offers.map(o => Number(o.price)).filter(p => p > 0);
      if (validPrices.length > 0) {
        return Math.min(...validPrices);
      }
    }
    if (basePrice && Number(basePrice) > 0) return Number(basePrice);
    return 10237;
  }, [hotel.offers, basePrice]);

  // Distinct room categories
  const distinctRoomCategories = useMemo(() => {
    if (!hotel.offers || hotel.offers.length === 0) {
      return [
        {
          categoryName: "Deluxe King Room",
          lowestPrice: startingPrice,
          offer: { price: startingPrice, roomCategory: "Deluxe King Room", bedType: "Queen Bed" },
          roomImg: allImages[1] || DEFAULT_HOTEL_IMAGES[1],
          bedType: "Queen Bed"
        },
        {
          categoryName: "Executive Room",
          lowestPrice: Math.round(startingPrice * 1.2),
          offer: { price: Math.round(startingPrice * 1.2), roomCategory: "Executive Room", bedType: "Queen Bed" },
          roomImg: allImages[2] || DEFAULT_HOTEL_IMAGES[2],
          bedType: "Queen Bed"
        },
        {
          categoryName: "Orchid Club Room",
          lowestPrice: Math.round(startingPrice * 1.35),
          offer: { price: Math.round(startingPrice * 1.35), roomCategory: "Orchid Club Room", bedType: "Queen Bed" },
          roomImg: allImages[3] || DEFAULT_HOTEL_IMAGES[3],
          bedType: "Queen Bed"
        }
      ];
    }

    const grouped = {};
    hotel.offers.forEach((roomOffer, index) => {
      const rawCat = roomOffer.roomCategory || roomOffer.roomTypeName || roomOffer._categoryName || "Standard Room";
      const categoryName = rawCat.replace(/_/g, " ").trim();
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push({ offer: roomOffer, originalIndex: index });
    });

    return Object.entries(grouped).map(([categoryName, items], catIdx) => {
      const prices = items.map(i => Number(i.offer.price)).filter(p => p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : (items[0].offer.price || startingPrice);
      const firstOffer = items[0].offer;

      let roomImg = firstOffer.images?.[0];
      if (!roomImg && allImages.length > catIdx + 1) {
        roomImg = allImages[catIdx + 1];
      }
      if (!roomImg) {
        roomImg = DEFAULT_HOTEL_IMAGES[(catIdx + 1) % DEFAULT_HOTEL_IMAGES.length];
      }

      let bedType = firstOffer.bedType || firstOffer.BedTypes || "";
      if (!bedType) {
        const lower = categoryName.toLowerCase();
        if (lower.includes("king")) bedType = "King Bed";
        else if (lower.includes("queen")) bedType = "Queen Bed";
        else if (lower.includes("twin")) bedType = "Twin Bed";
        else if (lower.includes("suite")) bedType = "King Suite";
        else bedType = "Queen Bed";
      }

      return {
        categoryName,
        lowestPrice,
        offer: firstOffer,
        roomImg,
        bedType,
        items
      };
    });
  }, [hotel.offers, startingPrice, allImages]);

  const visibleRoomCategories = showAllRooms
    ? distinctRoomCategories
    : distinctRoomCategories.slice(0, 3);

  const scrollToRooms = () => {
    const el = document.getElementById("section-rooms");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Back to Hotel Search Results handler
  const handleBackToSearch = () => {
    // 1. Prefer React Router's navigation history when the previous route is the search results page
    const hasHistoryEntry = typeof window.history.state?.idx === "number" && window.history.state.idx > 0;
    const isDirectVisit = location.key === "default";
    const cameFromSearch = Boolean(
      location.state?.fromSearchResults ||
      searchContext?.fromSearchResults ||
      (typeof document !== "undefined" && (
        document.referrer?.includes("/search/hotels") ||
        document.referrer?.includes("/hotel/search")
      ))
    );

    if (hasHistoryEntry && !isDirectVisit && cameFromSearch) {
      navigate(-1);
      return;
    }

    // 2. If saved search URL exists in state or sessionStorage, navigate there
    const savedSearchUrl =
      location.state?.searchUrl ||
      searchContext?.searchUrl ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("last_hotel_search_url") : null);

    if (savedSearchUrl && (savedSearchUrl.includes("/search/hotels") || savedSearchUrl.includes("/hotel/search"))) {
      navigate(savedSearchUrl);
      return;
    }

    // 3. Fallback: navigate to /search/hotels with all preserved search parameters
    const targetDest = searchContext?.destination || hotel?.city || hotel?.area || "";
    const targetCheckIn = selectedCheckIn || searchContext?.checkInDate || "";
    const targetCheckOut = selectedCheckOut || searchContext?.checkOutDate || "";
    const targetRooms = String(roomsCountState || searchContext?.rooms || 1);
    const targetAdults = String(adultsCountState || searchContext?.adults || 2);
    const targetChildren = String(childrenCountState || searchContext?.children || 0);

    let targetRoomsConfig = searchContext?.roomsConfig;
    if (!targetRoomsConfig) {
      const numR = Math.max(1, Number(targetRooms) || 1);
      const numA = Math.max(1, Number(targetAdults) || 2);
      const numC = Math.max(0, Number(targetChildren) || 0);
      const adlPerRoom = Math.max(1, Math.floor(numA / numR));
      const extraAdl = numA % numR;
      const chdPerRoom = Math.floor(numC / numR);
      const extraChd = numC % numR;
      targetRoomsConfig = Array.from({ length: numR }, (_, i) => ({
        adults: adlPerRoom + (i === 0 ? extraAdl : 0),
        children: chdPerRoom + (i === 0 ? extraChd : 0),
        childAges: Array(chdPerRoom + (i === 0 ? extraChd : 0)).fill(4)
      }));
    }

    const params = new URLSearchParams();
    if (targetDest) params.set("destination", targetDest);
    if (targetCheckIn) params.set("checkInDate", targetCheckIn);
    if (targetCheckOut) params.set("checkOutDate", targetCheckOut);
    params.set("rooms", targetRooms);
    params.set("adults", targetAdults);
    params.set("children", targetChildren);
    params.set("roomsConfig", typeof targetRoomsConfig === "string" ? targetRoomsConfig : JSON.stringify(targetRoomsConfig));
    if (searchContext?.guests) params.set("guests", searchContext.guests);

    navigate(`/search/hotels?${params.toString()}`);
  };

  // Reserve Now button handler
  const handleReserveClick = () => {
    if (!selectedCheckIn || !selectedCheckOut) {
      alert("Please select valid check-in and check-out dates.");
      return;
    }

    // Persist values into search parameters & storage
    const params = new URLSearchParams(window.location.search);
    params.set("checkInDate", selectedCheckIn);
    params.set("checkOutDate", selectedCheckOut);
    params.set("rooms", String(roomsCountState));
    params.set("adults", String(adultsCountState));
    params.set("children", String(childrenCountState));
    window.history.replaceState(null, "", `?${params.toString()}`);

    if (hotel.offers && hotel.offers.length > 0) {
      const chosenOffer = offer || hotel.offers[0];
      handleSelectOffer({
        ...chosenOffer,
        checkInDate: selectedCheckIn,
        checkOutDate: selectedCheckOut
      });
      setCurrentStep(2);
    } else {
      scrollToRooms();
    }
  };

  const starsCount = Math.max(1, Math.min(5, Math.floor(hotel.rating || 5)));
  const displayAddress = stayLocation || hotel.address || `${hotel.area || ""}, ${hotel.city || ""}, India`;

  return (
    <div className="hotel-detail-wrapper" style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Embedded CSS for strict image sizing, responsive grid, and interactive fields */}
      <style>{`
        .hotel-hero-container {
          display: grid;
          grid-template-columns: minmax(0, 1.85fr) minmax(320px, 350px);
          gap: 20px;
          margin-bottom: 20px;
          align-items: stretch;
          height: 410px;
        }
        .hotel-hero-gallery {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
          gap: 12px;
          height: 100%;
          min-height: 0;
          min-width: 0;
        }
        .hotel-gallery-main {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #e2e8f0;
        }
        .hotel-gallery-main img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .hotel-gallery-stack {
          display: grid;
          grid-template-rows: repeat(3, 1fr);
          gap: 10px;
          height: 100%;
          min-height: 0;
          min-width: 0;
        }
        .hotel-gallery-stack-item {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          background: #e2e8f0;
        }
        .hotel-gallery-stack-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .hotel-quick-amenities-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          align-items: center;
        }
        .hotel-two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
          align-items: stretch;
        }
        .hotel-room-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: stretch;
        }
        .hotel-room-img-box {
          width: 100%;
          height: 190px;
          min-height: 190px;
          max-height: 190px;
          position: relative;
          overflow: hidden;
          background: #f1f5f9;
        }
        .hotel-room-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .booking-control-field {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }
        .booking-control-field:hover {
          border-color: #e11d48;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(225, 29, 72, 0.08);
        }
        .booking-control-field.is-active {
          border-color: #e11d48;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15);
        }
        @media (max-width: 1040px) {
          .hotel-hero-container {
            grid-template-columns: 1fr;
            height: auto;
          }
          .hotel-hero-gallery {
            height: 380px;
          }
          .hotel-room-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .hotel-hero-gallery {
            grid-template-columns: 1fr;
            height: 270px;
          }
          .hotel-gallery-stack {
            display: none !important;
          }
          .hotel-quick-amenities-row {
            grid-template-columns: repeat(3, 1fr);
            row-gap: 16px;
          }
          .hotel-two-col-grid {
            grid-template-columns: 1fr;
          }
          .hotel-room-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Top-left Back Button to Search Results */}
      <div className="hotel-back-action-bar hotel-back-action-bar--details">
        <button
          type="button"
          onClick={handleBackToSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBackToSearch();
            }
          }}
          className="hotel-back-btn"
          aria-label="Back to Search Results"
          tabIndex={0}
        >
          <ArrowLeft size={16} strokeWidth={2.2} className="hotel-back-btn-icon" />
          <span>Back to Search Results</span>
        </button>
      </div>

      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b", marginBottom: "16px", flexWrap: "wrap" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#64748b", textDecoration: "none" }} aria-label="Home">
          <Home size={15} />
        </a>
        <span style={{ color: "#cbd5e1" }}>&gt;</span>
        <a href="/hotels" style={{ color: "#64748b", textDecoration: "none" }}>Hotels</a>
        <span style={{ color: "#cbd5e1" }}>&gt;</span>
        <span style={{ color: "#64748b" }}>{hotel.city || hotel.area || "City"}</span>
        <span style={{ color: "#cbd5e1" }}>&gt;</span>
        <span style={{ color: "#1e293b", fontWeight: 600 }}>{hotel.name}</span>
      </nav>

      {/* 2. Hotel Header (View on Map removed beside address) */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
              {hotel.name}
            </h1>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
              {[...Array(starsCount)].map((_, i) => (
                <span key={i} style={{ color: "#f59e0b", fontSize: "1.2rem", lineHeight: 1 }}>★</span>
              ))}
            </div>
          </div>

          {/* Clean address without View on Map link */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#475569", flexWrap: "wrap" }}>
            <MapPin size={16} color="#e11d48" style={{ flexShrink: 0 }} />
            <span>{displayAddress}</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            type="button"
            onClick={toggleFavourite}
            style={{ background: "none", border: "none", color: "#e11d48", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "opacity 0.2s" }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.75"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            <Heart size={18} color="#e11d48" fill={isFavourite ? "#e11d48" : "none"} />
            {isFavourite ? "Added to Favourites" : "Add to Favourites"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            style={{ background: "none", border: "none", color: "#e11d48", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "opacity 0.2s" }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.75"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            <Share2 size={18} color="#e11d48" />
            Share
          </button>
        </div>
      </section>

      {/* 3. Hotel Image Gallery & Booking Details Card Grid (Side-by-Side) */}
      <section className="hotel-hero-container">
        {/* Left Side: 2-Column Gallery Layout (70% main, 30% vertical stack) */}
        <div className="hotel-hero-gallery">
          {/* Main Hotel Image (approx 70% width) */}
          <div className="hotel-gallery-main">
            <img
              src={allImages[heroImgIndex] || DEFAULT_HOTEL_IMAGES[0]}
              alt={hotel.name}
              onClick={() => setLightboxIndex(heroImgIndex)}
              style={{ cursor: "pointer" }}
            />
            {/* Prev Navigation Arrow */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHeroImgIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
              }}
              aria-label="Previous Image"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
                zIndex: 2,
                transition: "background 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "#ffffff"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.92)"}
            >
              <ChevronLeft size={20} color="#1e293b" />
            </button>
            {/* Next Navigation Arrow */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHeroImgIndex((prev) => (prev + 1) % allImages.length);
              }}
              aria-label="Next Image"
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
                zIndex: 2,
                transition: "background 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "#ffffff"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.92)"}
            >
              <ChevronRight size={20} color="#1e293b" />
            </button>
          </div>

          {/* Right 30%: Smaller Images Arranged Vertically */}
          <div className="hotel-gallery-stack">
            {/* Stack Image 1 */}
            <div
              className="hotel-gallery-stack-item"
              onClick={() => setLightboxIndex(1)}
            >
              <img src={allImages[1] || DEFAULT_HOTEL_IMAGES[1]} alt={`${hotel.name} room`} />
            </div>

            {/* Stack Image 2 */}
            <div
              className="hotel-gallery-stack-item"
              onClick={() => setLightboxIndex(2)}
            >
              <img src={allImages[2] || DEFAULT_HOTEL_IMAGES[2]} alt={`${hotel.name} dining`} />
            </div>

            {/* Stack Image 3 with Total Photo Count */}
            <div
              className="hotel-gallery-stack-item"
              onClick={() => setLightboxIndex(3)}
            >
              <img src={allImages[3] || DEFAULT_HOTEL_IMAGES[3]} alt={`${hotel.name} facility`} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  gap: "6px",
                  backdropFilter: "blur(2px)",
                  transition: "background 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,0,0.55)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(0,0,0,0.45)"}
              >
                <Camera size={16} />
                <span>+{Math.max(1, allImages.length > 4 ? allImages.length - 4 : 32)} Photos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Booking Details Card (Aligned with Gallery Height) */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minHeight: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>Starting from</span>
              {isSearchingAvailability && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#e11d48", fontWeight: 600 }}>
                  <Loader2 size={12} className="animate-spin" /> Updating...
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "1.9rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                {formatRupee(startingPrice)}
              </span>
              <span style={{ fontSize: "0.9rem", color: "#64748b" }}>/ night</span>
            </div>

            {/* Status Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px", marginBottom: "16px" }}>
              {hasFreeCancellation && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", fontWeight: 600, color: "#16a34a" }}>
                  <CheckCircle2 size={15} color="#16a34a" /> Free Cancellation
                </span>
              )}
              {hasBreakfast && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", fontWeight: 600, color: "#16a34a" }}>
                  <CheckCircle2 size={15} color="#16a34a" /> Breakfast Included
                </span>
              )}
            </div>

            {/* Check-in & Check-out Date Pickers (Interactive) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px", position: "relative" }}>
              {/* Check-in Field */}
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Check-in</label>
                <div
                  className={`booking-control-field ${activePopup === "checkin" ? "is-active" : ""}`}
                  onClick={() => setActivePopup(activePopup === "checkin" ? null : "checkin")}
                >
                  <CalendarDays size={16} color="#e11d48" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {formatFriendlyDate(selectedCheckIn) || "Select Date"}
                  </span>
                </div>

                <HotelDatePicker
                  isOpen={activePopup === "checkin"}
                  onClose={() => setActivePopup(null)}
                  value={selectedCheckIn}
                  minDate={formatDateIso(new Date())}
                  mode="checkin"
                  onSelect={handleCheckInSelect}
                  title="Select Check-in Date"
                  align="left"
                />
              </div>

              {/* Check-out Field */}
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Check-out</label>
                <div
                  className={`booking-control-field ${activePopup === "checkout" ? "is-active" : ""}`}
                  onClick={() => setActivePopup(activePopup === "checkout" ? null : "checkout")}
                >
                  <CalendarDays size={16} color="#e11d48" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {formatFriendlyDate(selectedCheckOut) || "Select Date"}
                  </span>
                </div>

                <HotelDatePicker
                  isOpen={activePopup === "checkout"}
                  onClose={() => setActivePopup(null)}
                  value={selectedCheckOut}
                  checkInDate={selectedCheckIn}
                  mode="checkout"
                  onSelect={handleCheckOutSelect}
                  title="Select Check-out Date"
                  align="right"
                />
              </div>
            </div>

            {/* Guests & Rooms Field (Interactive) */}
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Guests &amp; Rooms</label>
              <div
                className={`booking-control-field ${activePopup === "guests" ? "is-active" : ""}`}
                style={{ justifyContent: "space-between" }}
                onClick={() => {
                  if (activePopup === "guests") {
                    setActivePopup(null);
                  } else {
                    openGuestsPopup();
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  <UserRound size={16} color="#e11d48" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentGuestSummary}
                  </span>
                </div>
                <ChevronDown size={16} color="#64748b" style={{ transform: activePopup === "guests" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </div>

              {/* Guests & Rooms Dropdown */}
              {activePopup === "guests" && (
                <div
                  ref={guestsDropdownRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
                    padding: "16px 18px",
                    zIndex: 9999,
                    color: "#1e293b"
                  }}
                >
                  {/* Rooms Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <BedDouble size={18} color="#e11d48" />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "#0f172a", display: "block" }}>Rooms</strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Min 1, max 8</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "2px 8px" }}>
                      <button
                        type="button"
                        disabled={tempRooms <= 1}
                        onClick={() => setTempRooms(Math.max(1, tempRooms - 1))}
                        style={{ background: "none", border: "none", cursor: tempRooms <= 1 ? "not-allowed" : "pointer", opacity: tempRooms <= 1 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Minus size={14} color="#e11d48" />
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>{tempRooms}</span>
                      <button
                        type="button"
                        disabled={tempRooms >= 8}
                        onClick={() => setTempRooms(Math.min(8, tempRooms + 1))}
                        style={{ background: "none", border: "none", cursor: tempRooms >= 8 ? "not-allowed" : "pointer", opacity: tempRooms >= 8 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Plus size={14} color="#e11d48" />
                      </button>
                    </div>
                  </div>

                  {/* Adults Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <UserRound size={18} color="#e11d48" />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "#0f172a", display: "block" }}>Adults</strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>12+ years</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "2px 8px" }}>
                      <button
                        type="button"
                        disabled={tempAdults <= 1}
                        onClick={() => setTempAdults(Math.max(1, tempAdults - 1))}
                        style={{ background: "none", border: "none", cursor: tempAdults <= 1 ? "not-allowed" : "pointer", opacity: tempAdults <= 1 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Minus size={14} color="#e11d48" />
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>{tempAdults}</span>
                      <button
                        type="button"
                        disabled={tempAdults >= 30}
                        onClick={() => setTempAdults(Math.min(30, tempAdults + 1))}
                        style={{ background: "none", border: "none", cursor: tempAdults >= 30 ? "not-allowed" : "pointer", opacity: tempAdults >= 30 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Plus size={14} color="#e11d48" />
                      </button>
                    </div>
                  </div>

                  {/* Children Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <UserRound size={18} color="#e11d48" />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "#0f172a", display: "block" }}>Children</strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>0 - 11 years</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "2px 8px" }}>
                      <button
                        type="button"
                        disabled={tempChildren <= 0}
                        onClick={() => setTempChildren(Math.max(0, tempChildren - 1))}
                        style={{ background: "none", border: "none", cursor: tempChildren <= 0 ? "not-allowed" : "pointer", opacity: tempChildren <= 0 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Minus size={14} color="#e11d48" />
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>{tempChildren}</span>
                      <button
                        type="button"
                        disabled={tempChildren >= 10}
                        onClick={() => setTempChildren(Math.min(10, tempChildren + 1))}
                        style={{ background: "none", border: "none", cursor: tempChildren >= 10 ? "not-allowed" : "pointer", opacity: tempChildren >= 10 ? 0.3 : 1, padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Plus size={14} color="#e11d48" />
                      </button>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    type="button"
                    onClick={handleGuestsApply}
                    style={{
                      width: "100%",
                      background: "#e11d48",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginTop: "14px",
                      transition: "background 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "#be123c"}
                    onMouseOut={e => e.currentTarget.style.background = "#e11d48"}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Full-width Reserve Now Button */}
          <button
            type="button"
            onClick={handleReserveClick}
            style={{
              width: "100%",
              background: "#e11d48",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "13px 20px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "18px",
              boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#be123c"}
            onMouseOut={e => e.currentTarget.style.background = "#e11d48"}
          >
            Reserve Now →
          </button>
        </div>
      </section>

      {/* 4. Hotel Amenities (Compact Horizontal Section Below Gallery and Card) */}
      {availableKeyAmenities.length > 0 && (
        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div className="hotel-quick-amenities-row">
            {availableKeyAmenities.map((item, idx, arr) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRight: idx < arr.length - 1 ? "1px solid #f1f5f9" : "none"
                }}
              >
                {item.icon}
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", textAlign: "center" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. About Hotel and Location (Side-by-Side Equal Height Containers) */}
      <section className="hotel-two-col-grid">
        {/* Left Card: About this Hotel */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: "0 0 10px 0" }}>About this hotel</h3>
          <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: "1.6", margin: "0 0 16px 0" }}>
            {showAllDesc || cleanDescription.length <= 220
              ? cleanDescription
              : `${cleanDescription.slice(0, 220)}...`}
          </p>
          {cleanDescription.length > 220 && (
            <button
              type="button"
              onClick={() => setShowAllDesc(!showAllDesc)}
              style={{ background: "none", border: "none", color: "#e11d48", padding: 0, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", marginBottom: "16px" }}
            >
              {showAllDesc ? "Show Less" : "Read More"}
            </button>
          )}

          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: "0 0 12px 0" }}>Key Highlights</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {highlightsList.map((hl, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>{hl}</span>
              </div>
            ))}
          </div>

          {rawAmenitiesList.length > 0 && (
            <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Important Facilities:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {rawAmenitiesList.slice(0, 5).map((a, i) => (
                  <span key={i} style={{ fontSize: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "6px", color: "#334155" }}>
                    {getAmenityName(a) || a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Card: Location */}
        <div id="section-location" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Location</h3>
            <button
              type="button"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address || hotel.name || "Mumbai")}`, "_blank")}
              style={{ border: "1.5px solid #e11d48", color: "#e11d48", background: "transparent", borderRadius: "8px", padding: "5px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "#fff1f2"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              View on Map
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#475569", marginBottom: "12px" }}>
            <MapPin size={15} color="#e11d48" style={{ flexShrink: 0 }} />
            <span>{hotel.address || displayAddress}</span>
          </div>

          {/* Map Preview Container (Strictly bounds the map inside) */}
          <div style={{ position: "relative", width: "100%", flex: 1, minHeight: "205px", borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.address || hotel.name || "Mumbai")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
              allowFullScreen=""
              loading="lazy"
              title="Hotel Location Map"
            />
            {/* Overlay badges matching reference screenshot */}
            <div style={{ position: "absolute", right: "12px", top: "12px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "260px", pointerEvents: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(4px)", padding: "7px 12px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={16} color="#e11d48" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.2 }}>
                  {hotel.area || hotel.city ? `${hotel.area || ""}, ${hotel.city || ""}` : "Vile Parle East, Mumbai - 400099"}
                </span>
              </div>
              {primaryLandmark && (
                <div style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(4px)", padding: "7px 12px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Plane size={12} color="#fff" />
                  </div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.2 }}>
                    {primaryLandmark}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Room Options Section */}
      <section id="section-rooms" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Room Options</h3>
            {searchStatusMsg && (
              <span style={{ fontSize: "0.78rem", color: "#e11d48", fontWeight: 600 }}>{searchStatusMsg}</span>
            )}
          </div>
          {distinctRoomCategories.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllRooms(!showAllRooms)}
              style={{ background: "none", border: "none", color: "#e11d48", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              {showAllRooms ? "Show Fewer Rooms <" : "View All Rooms >"}
            </button>
          )}
        </div>

        {/* 3-Column Card Grid (Desktop) */}
        <div className="hotel-room-cards-grid">
          {visibleRoomCategories.map((room, idx) => {
            const isSelected = offer && (offer.selectionKey === room.offer.selectionKey || offer.offerId === room.offer.offerId);
            return (
              <div
                key={room.offer.selectionKey || idx}
                style={{
                  background: "#fff",
                  border: isSelected ? "2px solid #e11d48" : "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Room Image Container (Consistent Dimensions) */}
                <div className="hotel-room-img-box">
                  <img
                    src={room.roomImg}
                    alt={room.categoryName}
                  />
                </div>

                {/* Room Details Body */}
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0", lineHeight: 1.3, minHeight: "44px" }}>
                    {room.categoryName}
                  </h4>

                  {/* Occupancy and Bed Type */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "0.82rem", color: "#64748b", marginBottom: "16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <UserRound size={15} color="#64748b" />
                      {adultsCountState} Adult{adultsCountState > 1 ? "s" : ""}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <BedDouble size={15} color="#64748b" />
                      {room.bedType || "Queen Bed"}
                    </span>
                  </div>

                  {/* Bottom: Price and Select Button */}
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                    <div>
                      <strong style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                        {formatRupee(room.lowestPrice)}
                      </strong>
                      <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "4px" }}>/ night</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectOffer({
                          ...room.offer,
                          checkInDate: selectedCheckIn,
                          checkOutDate: selectedCheckOut
                        });
                        setCurrentStep(2);
                      }}
                      style={{
                        border: isSelected ? "none" : "1.5px solid #e11d48",
                        background: isSelected ? "#e11d48" : "transparent",
                        color: isSelected ? "#fff" : "#e11d48",
                        borderRadius: "8px",
                        padding: "6px 20px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "#fff1f2";
                        }
                      }}
                      onMouseOut={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Hotel Policies and Information (Collapsed by Default Accordions) */}
      <section style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        {/* Accordion 1: Policies & House Rules */}
        {(hotel.hotelPolicy || (hotel.policyAndInstruction && hotel.policyAndInstruction.length > 0)) && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px 20px" }}>
            <button
              type="button"
              onClick={() => setOpenPolicySection(!openPolicySection)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Hotel Policies &amp; House Rules</h4>
              <span style={{ fontSize: "0.85rem", color: "#64748b", transform: openPolicySection ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </button>

            {openPolicySection && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "10px" }}>
                {hotel.hotelPolicy && (
                  <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.5", margin: 0 }}>
                    {hotel.hotelPolicy}
                  </p>
                )}
                {hotel.policyAndInstruction && hotel.policyAndInstruction.map((pol, pIdx) => {
                  const polName = pol.name || pol.Name || "Policy";
                  return (
                    <div key={pIdx}>
                      <strong style={{ fontSize: "0.85rem", color: "#1e293b", display: "block", marginBottom: "4px" }}>{polName}</strong>
                      {(pol.data || []).map((sub, sIdx) => (
                        <div key={sIdx}>
                          {(sub.detail || []).map((det, dIdx) => (
                            <p key={dIdx} style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 2px 8px" }}>• {det}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Accordion 2: All Amenities & Facilities */}
        {rawAmenitiesList.length > 6 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px 20px" }}>
            <button
              type="button"
              onClick={() => setOpenFacilitiesSection(!openFacilitiesSection)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                All Property Amenities &amp; Facilities ({rawAmenitiesList.length})
              </h4>
              <span style={{ fontSize: "0.85rem", color: "#64748b", transform: openFacilitiesSection ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </button>

            {openFacilitiesSection && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {rawAmenitiesList.map((item, idx) => {
                  const name = getAmenityName(item) || item;
                  const { icon, color } = getAmenityIcon(item);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        color: "#1e293b"
                      }}
                    >
                      <i className={icon} style={{ color, fontSize: "0.9rem" }}></i>
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 8. Full Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${hotel.name} Photo Gallery`}
          onClick={() => setLightboxIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(6px)"
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close Gallery"
            style={{
              position: "absolute",
              top: "20px",
              right: "24px",
              border: 0,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10
            }}
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          {/* Prev button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length);
            }}
            aria-label="Previous Image"
            style={{
              position: "absolute",
              left: "20px",
              border: 0,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10
            }}
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          {/* Large Image Frame */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(88vw, 980px)",
              height: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "14px",
              overflow: "hidden",
              background: "#0f172a",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
              flexShrink: 0
            }}
          >
            <img
              src={allImages[lightboxIndex]}
              alt={`${hotel.name} - ${lightboxIndex + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % allImages.length);
            }}
            aria-label="Next Image"
            style={{
              position: "absolute",
              right: "20px",
              border: 0,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10
            }}
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>

          {/* Thumbnail strip */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}
          >
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", fontWeight: 500 }}>
              {lightboxIndex + 1} / {allImages.length}
            </span>
            <div style={{ display: "flex", gap: "6px", maxWidth: "min(88vw, 980px)", overflowX: "auto", padding: "0 4px" }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  style={{
                    flexShrink: 0,
                    width: "56px",
                    height: "40px",
                    border: idx === lightboxIndex ? "2px solid #fff" : "2px solid transparent",
                    borderRadius: "6px",
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    opacity: idx === lightboxIndex ? 1 : 0.55,
                    transition: "opacity 0.2s, border 0.2s"
                  }}
                >
                  <img src={img} alt={`thumb-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
