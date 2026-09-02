/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, Home, MapPin, ShieldCheck, Sparkles, Star, UserRound, Loader2, BedDouble
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import BookingConfirmationModal from "../../components/booking/BookingConfirmationModal";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { blockRoom, getHotelInfo, getHotelRoom } from "../../services/hotelBookingService";
import { listTravelers } from "../../services/travelerService";
import { buildGuestSummary, buildStayFacts, buildStayHighlights, formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import BookingTimer from "./BookingTimer";
import HotelDetail from "./HotelDetail";
import "../../STYLES/HotelCheckoutExperience.css";
import { readHotelBookingFlowState, writeHotelBookingFlowState } from "./hotelBookingFlowStore";

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => String(mobile || "").replace(/\D/g, "").length >= 10 && String(mobile || "").replace(/\D/g, "").length <= 13;
const readQueryValue = (params, key, fallback = "") => String(params.get(key) ?? "").trim() || fallback;
const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function HotelDetailsPremiumLoader() {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Contacting properties for real-time rates...",
    "Verifying room availability...",
    "Securing exclusive PickNBook discounts...",
    "Initializing checkout workflow...",
    "Polishing layout templates..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hotel-details-premium-loader" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 30px",
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.5)",
      borderRadius: "24px",
      boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
      maxWidth: "500px",
      width: "100%",
      margin: "40px auto",
      textAlign: "center"
    }}>
      {/* Animated glowing loader ring */}
      <div style={{ position: "relative", width: "80px", height: "80px", marginBottom: "24px" }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: "50%",
          border: "4px solid #f1f5f9",
          borderTopColor: "#dc1e26",
          animation: "hotel-spin 1s linear infinite"
        }} />
        <div style={{
          position: "absolute",
          top: "-6px",
          left: "-6px",
          right: "-6px",
          bottom: "-6px",
          borderRadius: "50%",
          border: "4px solid transparent",
          borderBottomColor: "#991b1b",
          opacity: 0.6,
          animation: "hotel-spin 1.8s linear infinite reverse"
        }} />
      </div>

      <h3 style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: "1.3rem",
        fontWeight: 700,
        color: "#0f172a",
        margin: "0 0 8px 0"
      }}>
        Loading Stay Details
      </h3>

      <div style={{
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        marginBottom: "20px"
      }}>
        <p style={{
          fontSize: "0.9rem",
          color: "#64748b",
          margin: 0,
          animation: "hotel-slide-up 0.5s ease-out"
        }} key={statusIdx}>
          {statuses[statusIdx]}
        </p>
      </div>

      {/* Progress Bar indicator */}
      <div style={{
        width: "100%",
        height: "4px",
        background: "#e2e8f0",
        borderRadius: "2px",
        overflow: "hidden"
      }}>
        <div style={{
          width: "70%",
          height: "100%",
          background: "linear-gradient(90deg, #dc1e26, #991b1b)",
          borderRadius: "2px",
          animation: "hotel-pulse-progress 2s ease-in-out infinite"
        }} />
      </div>

      <style>{`
        @keyframes hotel-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hotel-slide-up {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes hotel-pulse-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
      );
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
  const [selectedMultiRooms, setSelectedMultiRooms] = useState([]);
  const roomsCount = searchContext?.roomsConfig ? searchContext.roomsConfig.length : 1;
  const [currentStep, setCurrentStep] = useState(1);
  const [specialRequests, setSpecialRequests] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // Parse roomsConfig and guest counts
  const roomsConfig = useMemo(() => {
    const raw = searchContext?.roomsConfig || searchContext?.rooms;
    if (raw && typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    if (Array.isArray(raw)) return raw;
    return null;
  }, [searchContext]);

  const totalAdults = useMemo(() => {
    if (roomsConfig && Array.isArray(roomsConfig)) {
      return roomsConfig.reduce((sum, r) => sum + (Number(r.adults) || 0), 0);
    }
    return Number(searchContext?.adults || 1);
  }, [searchContext, roomsConfig]);

  const totalChildren = useMemo(() => {
    if (roomsConfig && Array.isArray(roomsConfig)) {
      return roomsConfig.reduce((sum, r) => sum + (Number(r.children) || 0), 0);
    }
    return Number(searchContext?.children || 0);
  }, [searchContext, roomsConfig]);

  const [guests, setGuests] = useState(() => {
    let initAdults = 1;
    let initChildren = 0;
    
    const rawSearch = incomingState.searchContext || parseSearchContext(searchParams);
    const raw = rawSearch?.roomsConfig || rawSearch?.rooms;
    let parsedRooms = null;
    if (raw && typeof raw === "string") {
      try { parsedRooms = JSON.parse(raw); } catch(e){}
    } else if (Array.isArray(raw)) {
      parsedRooms = raw;
    }
    
    if (parsedRooms && Array.isArray(parsedRooms)) {
      initAdults = parsedRooms.reduce((sum, r) => sum + (Number(r.adults) || 0), 0);
      initChildren = parsedRooms.reduce((sum, r) => sum + (Number(r.children) || 0), 0);
    } else {
      initAdults = Number(rawSearch?.adults || 1);
      initChildren = Number(rawSearch?.children || 0);
    }

    const list = [];
    list.push({
      index: 0,
      type: "adult",
      title: incomingState.guestTitle || "",
      fullName: incomingState.guestName || "",
      age: incomingState.guestAge || "",
      gender: "",
      nationality: "India",
      idProofType: "Aadhaar",
      idProofNumber: "",
      email: incomingState.guestEmail || "",
      mobile: incomingState.guestPhone || "",
      pan: incomingState.guestPAN || "",
    });
    for (let i = 1; i < initAdults; i++) {
      list.push({
        index: i,
        type: "adult",
        title: "",
        fullName: "",
        age: "",
        gender: "",
        nationality: "India",
        idProofType: "Aadhaar",
        idProofNumber: "",
        email: "",
        mobile: "",
        pan: "",
      });
    }
    for (let i = 0; i < initChildren; i++) {
      list.push({
        index: initAdults + i,
        type: "child",
        title: "Mstr",
        fullName: "",
        age: "",
        gender: "",
        nationality: "India",
        idProofType: "Aadhaar",
        idProofNumber: "",
        email: "",
        mobile: "",
        pan: "",
      });
    }
    return list;
  });

  const updateGuest = (index, field, value) => {
    setFormError("");
    setGuests((current) => {
      const next = [...current];
      let updated = { ...next[index], [field]: value };
      if (field === "fullName") {
        const cleanVal = String(value || "").trim();
        const parts = cleanVal.split(/\s+/);
        updated.firstName = toTitleCase(parts[0] || "");
        updated.lastName = toTitleCase(parts.slice(1).join(" ") || "");
        updated.fullName = toTitleCase(cleanVal);
      }
      next[index] = updated;
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[`guest_${index}_${field}`];
      delete next[`guest_${index}_firstName`];
      delete next[`guest_${index}_lastName`];
      return next;
    });
  };

  const applyTravellerToGuest = (traveler, index) => {
    setGuests((current) => {
      const next = [...current];
      const fName = toTitleCase(traveler.firstName || "");
      const lName = toTitleCase(traveler.lastName || "");
      next[index] = {
        ...next[index],
        title: traveler.title || "Mr",
        firstName: fName,
        lastName: lName,
        fullName: `${fName} ${lName}`.trim(),
        age: traveler.age || "",
        gender: traveler.gender || "Male",
        email: traveler.email || "",
        mobile: traveler.mobile || traveler.phone || "",
      };
      return next;
    });
  };

  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [agreedToAll, setAgreedToAll] = useState(false);
  const [showReqPopup, setShowReqPopup] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState("");
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(incomingState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [activeImageTab, setActiveImageTab] = useState("All");
  
  // Validation Flags from blockRoom
  const [isPANMandatory, setIsPANMandatory] = useState(incomingState.isPANMandatory || false);
  const [isPassportMandatory, setIsPassportMandatory] = useState(incomingState.isPassportMandatory || false);
  
  // Storing original block room response
  const [blockRoomResponse, setBlockRoomResponse] = useState(incomingState.blockRoomResponse || null);

  // Coupon State
  const [couponCode, setCouponCode] = useState(incomingState.couponCode || "");
  const [couponSuccess, setCouponSuccess] = useState(incomingState.couponSuccess || "");
  const [couponError, setCouponError] = useState(incomingState.couponError || "");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [showChildAgeAlert, setShowChildAgeAlert] = useState(false);
  const [alertChildIndex, setAlertChildIndex] = useState(null);

  const [rulePets, setRulePets] = useState(false);
  const [ruleFood, setRuleFood] = useState(false);
  const [rulePolicy, setRulePolicy] = useState(false);
  const [ruleSmoking, setRuleSmoking] = useState(false);
  const [expandedGuestIndex, setExpandedGuestIndex] = useState(null);

  const handleChildAgeChange = (index, val) => {
    const numericAge = parseInt(val, 10);
    updateGuest(index, "age", val);
    if (!isNaN(numericAge) && numericAge > 11) {
      setAlertChildIndex(index);
      setShowChildAgeAlert(true);
    }
  };

  const handleNameChange = (index, field, value) => {
    setGuests((current) => {
      const next = [...current];
      const updatedGuest = { ...next[index], [field]: value };
      const fName = field === "firstName" ? value : (updatedGuest.firstName || "");
      const lName = field === "lastName" ? value : (updatedGuest.lastName || "");
      updatedGuest.fullName = `${fName} ${lName}`.trim();
      next[index] = updatedGuest;
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[`guest_${index}_firstName`];
      delete next[`guest_${index}_lastName`];
      delete next[`guest_${index}_fullName`];
      return next;
    });
  };

  // Compatibility getters/setters for legacy code
  const guestName = guests[0]?.fullName || "";
  const guestTitle = guests[0]?.title || "";
  const guestAge = guests[0]?.age || "";
  const guestPAN = guests[0]?.pan || "";
  const guestPassportNo = "";
  const guestEmail = guests[0]?.email || "";
  const guestPhone = guests[0]?.mobile || "";

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
    const rawImages = hotel?.images && hotel.images.length > 0 ? hotel.images : gallery;
    const tab = activeImageTab;
    if (!rawImages || rawImages.length === 0) return [];
    
    const hasCategoryObj = rawImages[0] && typeof rawImages[0] === "object" && (rawImages[0].Category || rawImages[0].category || rawImages[0].Caption || rawImages[0].caption);
    
    if (hasCategoryObj) {
      const filtered = rawImages.filter(img => {
        const cat = String(img.Category || img.category || img.Caption || img.caption || "").toLowerCase();
        if (tab === "All") return true;
        if (tab === "Rooms") return cat.includes("room") || cat.includes("bed") || cat.includes("deluxe") || cat.includes("suite") || cat.includes("interior");
        if (tab === "Property Views") return cat.includes("view") || cat.includes("exterior") || cat.includes("garden") || cat.includes("landscape");
        if (tab === "Facilities") return cat.includes("facility") || cat.includes("pool") || cat.includes("gym") || cat.includes("lobby") || cat.includes("spa") || cat.includes("parking");
        if (tab === "Dining") return cat.includes("dining") || cat.includes("restaurant") || cat.includes("food") || cat.includes("breakfast") || cat.includes("bar");
        if (tab === "Nearby Attractions") return cat.includes("attraction") || cat.includes("nearby") || cat.includes("city") || cat.includes("location");
        return false;
      }).map(img => img.ImageUrl || img.imageUrl || img.Url || img.url || img);
      
      if (filtered.length > 0) return filtered;
    }

    const urlStrings = rawImages.map(img => typeof img === "object" ? (img.ImageUrl || img.imageUrl || img.Url || img.url || "") : String(img)).filter(Boolean);

    if (tab === "All") return urlStrings;

    const filtered = urlStrings.filter(url => {
      const lower = url.toLowerCase();
      if (tab === "Rooms") return lower.includes("room") || lower.includes("bed") || lower.includes("deluxe") || lower.includes("suite") || lower.includes("bedroom") || lower.includes("interior");
      if (tab === "Property Views") return lower.includes("view") || lower.includes("exterior") || lower.includes("garden") || lower.includes("terrace") || lower.includes("building");
      if (tab === "Facilities") return lower.includes("pool") || lower.includes("gym") || lower.includes("lobby") || lower.includes("spa") || lower.includes("facility") || lower.includes("fitness") || lower.includes("reception");
      if (tab === "Dining") return lower.includes("dining") || lower.includes("restaurant") || lower.includes("food") || lower.includes("breakfast") || lower.includes("bar") || lower.includes("cafe");
      if (tab === "Nearby Attractions") return lower.includes("attraction") || lower.includes("nearby") || lower.includes("city") || lower.includes("map") || lower.includes("street");
      return false;
    });

    if (filtered.length === 0) {
      const tabIndex = ["All", "Rooms", "Property Views", "Facilities", "Dining", "Nearby Attractions"].indexOf(tab);
      if (tabIndex > 0 && urlStrings.length > 0) {
        const offset = tabIndex % urlStrings.length;
        return [...urlStrings.slice(offset), ...urlStrings.slice(0, offset)];
      }
    }

    return filtered.length > 0 ? filtered : urlStrings;
  }, [hotel?.images, gallery, activeImageTab]);

  const stayFacts = useMemo(() => buildStayFacts(hotel || {}, offer || {}, searchContext || {}), [hotel, offer, searchContext]);
  const stayHighlights = useMemo(() => buildStayHighlights(hotel || {}, offer || {}, nights), [hotel, offer, nights]);

  useEffect(() => {
    let isMounted = true;
    async function fetchRoomsAndInfo() {
      if (!hotel?.hotelId) { setIsLoadingOffer(false); return; }
      // If we already have the actual API room offers, we can skip fetching again to prevent loops
      if (hotel.offers?.length > 0 && hotel.offers[0]?.RatePlanCode) {
          setIsLoadingOffer(false); 
          return;
      }
      
      setIsLoadingOffer(true);
      try {
        const infoPayload = {
          TraceId: String(hotel.TraceId || hotel.traceId || ""),
          ResultIndex: String(hotel.ResultIndex || hotel.resultIndex || ""),
          SrdvType: String(hotel.SrdvType || hotel.srdvType || "MixAPI"),
          SrdvIndex: String(hotel.SrdvIndex || hotel.srdvIndex || ""),
          HotelCode: String(hotel.hotelId || hotel.hotelCode || ""),
          EndUserIp: "192.168.10.10"
        };
        
        // 1. Get Hotel Info
        const info = await getHotelInfo(infoPayload);
        const fetchedHotelCode = info?.HotelDetails?.HotelCode || hotel.hotelId;
        
        if (info?.HotelDetails) {
            setHotel(current => ({
                ...current,
                images: info.HotelDetails.Images || current.images,
                latitude: info.HotelDetails.Latitude || current.latitude,
                longitude: info.HotelDetails.Longitude || current.longitude,
                address: info.HotelDetails.Address || current.address,
                amenities: info.HotelDetails.HotelFacilities || current.amenities,
                hotelId: fetchedHotelCode
            }));
        }
        
        // 2. Get Hotel Rooms
        const roomPayload = { ...infoPayload, HotelCode: fetchedHotelCode };
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
                setHotel(current => ({
                    ...current,
                    offers: allRooms.map((r, i) => {
                        const priceObj = r.price || r.Price || {};
                        const cancelPolicies = r.cancellationPolicies || r.CancellationPolicies || [];
                        
                        const extractedPrice = priceObj.b2cFinalFare || priceObj.B2CFinalFare || priceObj.offeredPriceRoundedOff || priceObj.OfferedPriceRoundedOff || priceObj.publishedPriceRoundedOff || priceObj.PublishedPriceRoundedOff || priceObj.roomPrice || priceObj.RoomPrice || (typeof priceObj === 'number' ? priceObj : 0);

                        return {
                            ...r,
                            offerId: r.roomId || r.RatePlanCode || `room-${i}`,
                            price: extractedPrice,
                            currency: priceObj.currencyCode || priceObj.CurrencyCode || "INR",
                            roomCategory: r.roomTypeName || r.RoomTypeName || r.roomTypeCategory || r.RoomTypeCategory || r._categoryName || "Room",
                            cancellationPolicy: cancelPolicies?.[0]?.charge || cancelPolicies?.[0]?.Charge ? `Charge: ${cancelPolicies[0].charge || cancelPolicies[0].Charge}` : "Refundable thresholds apply",
                            bedType: r.bedTypes || r.BedTypes || "Double",
                            isPANMandatory: hotelRoomResult.isPANMandatory || hotelRoomResult.IsPANMandatory || r.isPANMandatory || false,
                            isPassportMandatory: hotelRoomResult.isPassportMandatory || hotelRoomResult.IsPassportMandatory || r.isPassportMandatory || false
                        };
                    })
                }));
            }
        } else if (!roomsResult) {
            throw new Error("Unable to fetch room availability from the live API.");
        }
      } catch (err) {
        if (isMounted) setOfferLoadError(err.message || "Unable to reload stay details from the backend.");
      } finally {
        if (isMounted) setIsLoadingOffer(false);
      }
    }
    fetchRoomsAndInfo();
    return () => { isMounted = false; };
  }, [hotel?.hotelId]);

  useEffect(() => {
    let isMounted = true;
    listTravelers()
      .then((apiList) => { if (isMounted) { setSavedTravelers(Array.isArray(apiList) ? apiList : []); setTravelerLoadError(""); } })
      .catch(() => { if (isMounted) { setSavedTravelers([]); setTravelerLoadError("Unable to load saved travelers from the backend."); } });
    return () => { isMounted = false; };
  }, []);

  // Restore pending hotel offer selection after logging in
  useEffect(() => {
    const activePortal = sessionStorage.getItem("active_portal");
    const isAgentUser = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
    const token = isAgentUser ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
    const isLoggedIn = token && !isTokenExpired(token);

    if (isLoggedIn && hotel?.hotelId) {
      const pendingRaw = sessionStorage.getItem("pending_hotel_offer");
      if (pendingRaw) {
        try {
          const pendingOffer = JSON.parse(pendingRaw);
          sessionStorage.removeItem("pending_hotel_offer");
          handleSelectOffer(pendingOffer).then(() => {
            setCurrentStep(2);
          }).catch((err) => {
            console.error("Failed to select restored pending offer:", err);
          });
        } catch (e) {
          console.error("Error restoring pending hotel offer:", e);
        }
      }
    }
  }, [hotel?.hotelId]);

  useEffect(() => {
    if (hotel || offer) {
      writeHotelBookingFlowState({
        hotel,
        offer,
        searchContext,
        guestName,
        guestTitle,
        guestAge,
        guestPAN,
        guestPassportNo,
        guestEmail,
        guestPhone,
        agreedToTerms,
        isPANMandatory,
        isPassportMandatory,
        blockRoomResponse,
      });
    }
  }, [hotel, offer, searchContext, guestName, guestTitle, guestAge, guestPAN, guestPassportNo, guestEmail, guestPhone, agreedToTerms, isPANMandatory, isPassportMandatory, blockRoomResponse]);

  const handleSelectOffer = async (roomOffer, couponToApply = couponCode) => {
    const activePortal = sessionStorage.getItem("active_portal");
    const isAgentUser = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
    const token = isAgentUser ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      sessionStorage.setItem("pending_hotel_offer", JSON.stringify(roomOffer));
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const newSelection = [...selectedMultiRooms, roomOffer];
    
    if (newSelection.length < roomsCount) {
        setSelectedMultiRooms(newSelection);
        return; // wait for next room selection
    }

    setSelectingOfferId(roomOffer.offerId);
    setOfferLoadError("");
    try {
      const blockPayload = {
        TraceId: String(hotel?.TraceId || hotel?.traceId || ""),
        ResultIndex: String(hotel?.ResultIndex || hotel?.resultIndex || ""),
        SrdvType: String(hotel?.SrdvType || hotel?.srdvType || "MixAPI"),
        SrdvIndex: String(hotel?.SrdvIndex || hotel?.srdvIndex || ""),
        HotelCode: String(hotel?.hotelId || hotel?.hotelCode || ""),
        HotelName: hotel?.name || "",
        GuestNationality: "IN",
        NoOfRooms: roomsCount,
        ClientReferenceNo: 0,
        IsVoucherBooking: true,
        EndUserIp: "192.168.10.10",
        CouponCode: couponToApply || "",
        HotelRoomsDetails: newSelection.map(room => {
          const roomPrice = Number(room.price || room.Price?.OfferedPrice || 0);
          return {
            ChildCount: room.childCount || 0,
            RequireAllPaxDetails: room.requireAllPaxDetails || false,
            RoomId: room.roomId || "",
            RoomStatus: room.roomStatus || "Active",
            RoomIndex: room.roomIndex || "",
            RoomTypeCode: room.roomTypeCode || "",
            RoomTypeName: room.roomTypeName || "",
            RatePlanCode: room.ratePlanCode || "",
            RatePlan: room.ratePlan || "",
            InfoSource: room.infoSource || "",
            SequenceNo: room.sequenceNo || "",
            DayRates: room.dayRates || [],
            SupplierPrice: room.supplierPrice || "",
            RoomPromotion: room.roomPromotion || "",
            Amenities: room.amenities || [],
            SmokingPreference: room.smokingPreference || "",
            BedTypes: room.bedTypes || room.bedType || "",
            HotelSupplements: room.hotelSupplements || "",
            LastCancellationDate: room.lastCancellationDate || "",
            IsPassportMandatory: room.isPassportMandatory || false,
            IsPANMandatory: room.isPANMandatory || false,
            FullRefundAllowed: room.fullRefundAllowed || false,
            CancellationPolicies: room.cancellationPolicies || [],
            CancellationPolicy: room.cancellationPolicy || "",
            Inclusion: room.inclusion || [],
            BedTypeCode: room.bedTypeCode || "",
            Supplements: room.supplements || "",
            OfferedPrice: roomPrice,
            Price: {
              CurrencyCode: "INR",
              RoomPrice: roomPrice,
              PublishedPrice: roomPrice,
              PublishedPriceRoundedOff: roomPrice,
              OfferedPrice: roomPrice,
              OfferedPriceRoundedOff: roomPrice
            }
          };
        })
      };
      
      const blockResp = await blockRoom(blockPayload);

      if (blockResp?.BlockRoomResult?.Error?.ErrorCode === 0 || blockResp?.BlockRoomResult?.IsPriceChanged || blockResp?.blockRoomResult?.error?.errorCode === 0 || blockResp?.blockRoomResult?.isPriceChanged) {
          // If price changed or success
          const blockedRoom = blockResp?.BlockRoomResult?.HotelRoomsDetails?.[0] || blockResp?.blockRoomResult?.hotelRoomsDetails?.[0] || {};
          setIsPANMandatory(blockResp?.BlockRoomResult?.IsPANMandatory || blockResp?.blockRoomResult?.isPANMandatory || blockedRoom.isPANMandatory || false);
          setIsPassportMandatory(blockResp?.BlockRoomResult?.IsPassportMandatory || blockResp?.blockRoomResult?.isPassportMandatory || blockedRoom.isPassportMandatory || false);
          setBlockRoomResponse(blockResp);
      } else if (blockResp?.HotelRoomsDetails?.[0] || blockResp?.hotelRoomsDetails?.[0]) {
          const blockedRoom = blockResp?.HotelRoomsDetails?.[0] || blockResp?.hotelRoomsDetails?.[0] || {};
          setIsPANMandatory(blockedRoom.isPANMandatory || false);
          setIsPassportMandatory(blockedRoom.isPassportMandatory || false);
          setBlockRoomResponse(blockResp);
      }
      
      // Since we don't have getOfferDetails anymore, use the blocked room info or selected room offer directly
      setOffer({
        ...roomOffer,
        checkInDate: roomOffer.checkInDate || checkInDate,
        checkOutDate: roomOffer.checkOutDate || checkOutDate,
      });
    } catch (err) {
      setOfferLoadError(err.message || "Unable to hold the selected rooms.");
      setSelectedMultiRooms([]); // reset on error
    } finally {
      setSelectingOfferId("");
    }
  };

  const blockedRooms = blockRoomResponse?.BlockRoomResult?.HotelRoomsDetails || 
                       blockRoomResponse?.blockRoomResult?.hotelRoomsDetails || 
                       blockRoomResponse?.HotelRoomsDetails || 
                       blockRoomResponse?.hotelRoomsDetails || [];
  
  let basePrice = 0;
  let tax = 0;
  let convenienceFee = 0;
  let markupValue = 0;
  let couponDiscount = 0;
  let finalPayable = 0;

  const activePortal = sessionStorage.getItem("active_portal");
  const isAgent = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
  const tokenVal = isAgent ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
  const hasValidToken = !!(tokenVal && !isTokenExpired(tokenVal));

  if (blockedRooms.length > 0) {
      blockedRooms.forEach(room => {
          const price = room.Price || room.price || {};
          let roomBase = Number(price.RoomPrice ?? price.roomPrice ?? price.PublishedPrice ?? price.publishedPrice ?? 0);
          let roomTax = Number(price.Tax ?? price.tax ?? price.TotalGSTAmount ?? price.totalGSTAmount ?? 0);
          let roomMarkup = Number(price.AgentMarkUp ?? price.agentMarkUp ?? price.agentMarkup ?? 0);
          
          if (!isAgent) {
              roomBase = Number(price.b2CBasePrice ?? price.b2cBasePrice ?? (roomBase + roomMarkup));
              roomMarkup = 0;
          }
          
          basePrice += roomBase;
          tax += roomTax;
          markupValue += roomMarkup;
          couponDiscount += Number(price.CouponDiscount ?? price.couponDiscount ?? 0);
          convenienceFee += Number(price.ConvenienceFee ?? price.convenienceFee ?? 0);
          
          const rawTotal = price.b2CTotalPrice ?? price.b2cTotalPrice ?? price.OfferedPrice ?? price.offeredPrice ?? price.PublishedPrice ?? price.publishedPrice ?? 0;
          finalPayable += Number(rawTotal);
      });
  } else {
      // Fallback if no block room response yet, use offer price (base)
      basePrice = selectedMultiRooms.reduce((sum, r) => sum + (Number(r.price) || 0), 0) * nights;
      finalPayable = basePrice;
  }

  // Fallback for manual markup if backend didn't provide AgentMarkUp and user is not an agent
  if (markupValue === 0 && !isAgent) {
      const rawMarkup = localStorage.getItem("b2b_markup_settings");
      if (rawMarkup) {
          try {
              const parsedMarkup = JSON.parse(rawMarkup);
              if (parsedMarkup.hotelType === "percentage") {
                  markupValue = basePrice * (Number(parsedMarkup.hotelValue) / 100);
              } else if (parsedMarkup.hotelType === "fixed") {
                  markupValue = Number(parsedMarkup.hotelValue) * Number(roomsCount);
              }
              finalPayable += markupValue; // Add to final payable if calculated manually
          } catch (e) {}
      }
  }

  const tierDiscount = 0;
  const volumeDiscount = 0;
  const isPrimaryAdultValid = useMemo(() => {
    const primary = guests[0];
    if (!primary) return false;
    const fullNameOk = !!primary.fullName?.trim();
    const ageOk = !!primary.age && Number(primary.age) >= 18;
    const genderOk = !!primary.gender;
    const emailOk = !!primary.email?.trim() && isValidEmail(primary.email);
    const phoneOk = !!primary.mobile?.trim() && isValidMobile(primary.mobile);
    const panOk = !isPANMandatory || (!!primary.pan?.trim() && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(primary.pan.toUpperCase()));
    return fullNameOk && ageOk && genderOk && emailOk && phoneOk && panOk;
  }, [guests, isPANMandatory]);

  const selectExistingTraveler = (travelerId) => {
    setSelectedTravelerId(travelerId);
    const found = savedTravelers.find((traveler) => String(traveler.id) === travelerId);
    if (!travelerId || !found) return;
    applyTravellerToGuest(found, 0);
  };

  const validateForm = () => {
    const nextErrors = {};
    
    // Primary Adult
    const primary = guests[0];
    if (!primary) return false;

    if (!primary.fullName?.trim()) {
      nextErrors.guest_0_fullName = "Full name is required.";
    }
    if (!primary.age) {
      nextErrors.guest_0_age = "Please enter age.";
    } else if (Number(primary.age) < 18) {
      nextErrors.guest_0_age = "Primary guest must be 18 years or older.";
    }
    if (!primary.gender) {
      nextErrors.guest_0_gender = "Please select gender.";
    }
    if (!primary.email?.trim()) {
      nextErrors.guest_0_email = "Please enter email.";
    } else if (!isValidEmail(primary.email)) {
      nextErrors.guest_0_email = "Enter a valid email.";
    }
    if (!primary.mobile?.trim()) {
      nextErrors.guest_0_mobile = "Please enter phone number.";
    } else if (!isValidMobile(primary.mobile)) {
      nextErrors.guest_0_mobile = "Enter a valid mobile.";
    }

    if (isPANMandatory) {
      if (!primary.pan?.trim()) {
        nextErrors.guest_0_pan = "PAN Card is mandatory for this booking.";
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(primary.pan.toUpperCase())) {
        nextErrors.guest_0_pan = "Enter a valid PAN Card (e.g. ABCDE1234F).";
      }
    }

    // Co-Travelers validation (mandatory for children, optional for additional adults)
    guests.forEach((guest, idx) => {
      if (idx > 0) {
        if (guest.type === "child") {
          if (!guest.title) {
            nextErrors[`guest_${idx}_title`] = "Select title.";
          }
          if (!guest.fullName?.trim()) {
            nextErrors[`guest_${idx}_fullName`] = "Full name is required.";
          }
          if (!guest.age) {
            nextErrors[`guest_${idx}_age`] = "Enter child age.";
          }
        } else {
          if (guest.firstName?.trim() || guest.lastName?.trim()) {
            if (!guest.title) {
              nextErrors[`guest_${idx}_title`] = "Select title.";
            }
            if (!guest.fullName?.trim()) {
              nextErrors[`guest_${idx}_fullName`] = "Full name is required.";
            }
            if (!guest.age) {
              nextErrors[`guest_${idx}_age`] = "Enter age.";
            }
            if (!guest.gender) {
              nextErrors[`guest_${idx}_gender`] = "Select gender.";
            }
          }
        }
      }
    });

    if (!agreedToAll) {
      nextErrors.agreedToAll = "Please review selection and check the agreement box to proceed.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) { 
      setFormError("Please correct the highlighted guest details."); 
      return; 
    }
    const token = isAgent ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
    if (!token || isTokenExpired(token)) { 
      alert("Login is mandatory to proceed to payment. Opening login window.");
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`); 
      return; 
    }
    const hotelImg = hotel?.image || hotel?.cardImage || (Array.isArray(hotel?.images) ? hotel.images[0] : null) || offer?.image || null;
    const hotelImgs = Array.isArray(hotel?.images) && hotel.images.length > 0 ? hotel.images : (hotelImg ? [hotelImg] : []);

    const activeCheckIn = offer?.checkInDate || checkInDate || searchContext?.checkInDate || hotel?.checkInDate;
    const activeCheckOut = offer?.checkOutDate || checkOutDate || searchContext?.checkOutDate || hotel?.checkOutDate;

    const payloadState = { 
      hotel, 
      offer, 
      hotelImage: hotelImg,
      hotelImages: hotelImgs,
      checkInDate: activeCheckIn,
      checkOutDate: activeCheckOut,
      searchContext, 
      guestTitle: guests[0]?.title || "Mr",
      guestName: guests[0]?.fullName?.trim() || "Primary Guest", 
      guestEmail: guests[0]?.email?.trim() || "", 
      guestPhone: guests[0]?.mobile?.trim() || "", 
      guestAge: guests[0]?.age || 26,
      guestPAN: guests[0]?.pan || "",
      guests, 
      agreedToTerms, 
      blockRoomResponse,
      payableAmount: finalPayable, 
      fareSummary: { 
        baseFare: basePrice, 
        tax, 
        convenienceFee, 
        markup: markupValue, 
        couponDiscount, 
        tierDiscount: 0, 
        volumeDiscount: 0, 
        totalFare: finalPayable 
      } 
    };

    writeHotelBookingFlowState(payloadState);
    setCheckoutPayload(payloadState);
    setIsModalOpen(true);
  };
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const uppercaseCode = couponCode.trim().toUpperCase();
      // Wait for re-selection with the new coupon code to re-trigger blockRoom
      await handleSelectOffer(offer, uppercaseCode);
      
      // Look at the new block room response to verify coupon success
      setCouponCode(uppercaseCode);
      // We rely on the React state update loop to populate couponDiscount, 
      // but if the API returns blockRoomResponse with couponDiscount > 0 on the next render, it's successful.
      // We can also just set a generic success message.
      setCouponSuccess(`Coupon "${uppercaseCode}" applied! Check the breakdown below.`);
    } catch (err) {
      setCouponError(err.message || "Failed to apply coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    setIsApplyingCoupon(true);
    try {
      // Re-block room without coupon
      await handleSelectOffer(offer, "");
    } catch (err) {
      console.error("Error removing coupon", err);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (!hotel) {
    return (
      <main className="hotel-checkout-page">
        <div className="hotel-checkout-shell hotel-checkout-shell--empty">
          <section className="hotel-checkout-empty">
            <h2>Stay details missing</h2>
            <p>Select a stay before entering guest details.</p>
            <button type="button" onClick={() => navigate("/search/hotels")}>Go to hotel search</button>
          </section>
        </div>
      </main>
    );
  }

  if (isLoadingOffer) {
    return (
      <main className="hotel-checkout-page">
        <div className="hotel-checkout-shell hotel-checkout-shell--empty">
          <section className="hotel-checkout-empty" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
            <HotelDetailsPremiumLoader />
          </section>
        </div>
      </main>
    );
  }

  const handleSetCurrentStep = (step) => {
    if (step === 2) {
      const activePortal = sessionStorage.getItem("active_portal");
      const isAgentUser = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
      const token = isAgentUser ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
      if (!token || isTokenExpired(token)) {
        navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
    }
    setCurrentStep(step);
  };

  const guestSummary = `${roomsCount} Room${roomsCount > 1 ? "s" : ""}, ${totalAdults} Adult${totalAdults > 1 ? "s" : ""}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren > 1 ? "ren" : ""}` : ""}`;
  const stayLocation = hotel.address || [hotel.area, hotel.city].filter(Boolean).join(", ");
  return (
    <main className="hotel-checkout-page">
      <BookingTimer hideBanner={true} />
      <div className="hotel-checkout-shell">
        
        {/* Top bar: Breadcrumbs on the left, Timer on the right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap", gap: "10px" }}>
          {/* Breadcrumbs trail */}
          <div className="hotel-breadcrumbs" style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.82rem", color: "var(--hotel-muted)", margin: 0 }}>
            <span onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Search</span>
            <span>&gt;</span>
            <span onClick={() => navigate("/search/hotels")} style={{ cursor: "pointer" }}>Hotel</span>
            <span>&gt;</span>
            <span 
              onClick={() => {
                if (currentStep === 2) {
                  setCurrentStep(1);
                  setOffer(null);
                }
              }} 
              style={{ cursor: currentStep === 2 ? "pointer" : "default", fontWeight: currentStep === 1 ? 700 : 500, color: currentStep === 1 ? "var(--hotel-ink)" : "inherit" }}
            >
              Hotel Details
            </span>
            {currentStep === 2 && (
              <>
                <span>&gt;</span>
                <span style={{ fontWeight: 700, color: "var(--hotel-ink)" }}>Passenger Details</span>
              </>
            )}
          </div>

          {/* Compact Timer Container */}
          <BookingTimer mode="compact" />
        </div>

        {currentStep === 1 ? (
          <HotelDetail
            hotel={hotel}
            offer={offer}
            roomsCount={roomsCount}
            selectedMultiRooms={selectedMultiRooms}
            selectingOfferId={selectingOfferId}
            handleSelectOffer={handleSelectOffer}
            formatCurrency={formatCurrency}
            formatNightLabel={formatNightLabel}
            toDisplayDate={toDisplayDate}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guestSummary={guestSummary}
            basePrice={basePrice}
            tax={tax}
            finalPayable={finalPayable}
            convenienceFee={convenienceFee}
            setCurrentStep={handleSetCurrentStep}
            gallery={gallery}
            activeImageTab={activeImageTab}
            setActiveImageTab={setActiveImageTab}
            displayedImages={displayedImages}
            stayLocation={stayLocation}
            stayFacts={stayFacts}
            stayHighlights={stayHighlights}
            visuals={visuals}
            nights={nights}
          />
        ) : (
          <div className="hotel-checkout-layout">
            
            {/* Left Column Content */}
            <div className="hotel-checkout-main">
              {/* Hotel Summary Card (Search Result Style) */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", padding: "16px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "20px", background: "#fff", marginBottom: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
                <div style={{ width: "100%", height: "110px", borderRadius: "14px", overflow: "hidden" }}>
                  <img src={gallery[0]} alt={hotel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ 
                      textTransform: "uppercase", 
                      fontSize: "0.62rem", 
                      fontWeight: 800, 
                      color: "var(--hotel-rose)", 
                      background: "rgba(220,30,38,0.05)", 
                      padding: "3px 8px", 
                      borderRadius: "4px", 
                      display: "inline-block", 
                      letterSpacing: "0.5px",
                      marginBottom: "6px"
                    }}>
                      {visuals.propertyLabel || "PREMIUM STAY"}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>{hotel.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.78rem", color: "var(--hotel-muted)", marginTop: "4px" }}>
                      {hotel.rating > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <span style={{ color: "#ffb000" }}>★</span> <strong>{Number(hotel.rating).toFixed(1)}</strong>
                        </span>
                      )}
                      <span>📍 {stayLocation}</span>
                      <span>📅 {formatNightLabel(nights)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                    {stayFacts.map((fact) => (
                      <span key={fact} style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "6px", background: "rgba(0,0,0,0.03)", color: "var(--hotel-ink)" }}>
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Primary Guest Form Card */}
              <section className="hotel-panel" style={{ padding: "24px", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "24px" }}>
                <div className="form-title-section" style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "14px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Primary Guest Details</h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--hotel-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#10b981" }}>🛡️</span> Booking confirmation and payment receipt will be sent to this guest.
                    </p>
                  </div>
                  <span className="form-title-badge">Primary Guest</span>
                </div>

                {/* Dynamic counts summary panel if multiple rooms are selected */}
                {roomsCount > 1 && (
                  <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(220,30,38,0.08)", marginBottom: "16px", fontSize: "0.8rem", color: "var(--hotel-ink)", alignItems: "center" }}>
                    <span>👥 <strong>Guest Count for {roomsCount} Rooms:</strong></span>
                    <span style={{ background: "#fff", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.04)" }}><strong>Adults:</strong> {totalAdults}</span>
                    {totalChildren > 0 && (
                      <span style={{ background: "#fff", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.04)" }}><strong>Children:</strong> {totalChildren}</span>
                    )}
                  </div>
                )}

                {/* Checkbox selector container for saved profiles */}
                <div style={{ marginBottom: "10px", padding: "6px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.04)" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", fontSize: "0.85rem", fontWeight: 600, color: "var(--hotel-ink)", cursor: "pointer", margin: 0, width: "100%" }}>
                    <input 
                      type="checkbox" 
                      checked={isExistingGuest} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsExistingGuest(checked);
                        if (!checked) {
                          setSelectedTravelerId("");
                          selectExistingTraveler("");
                        }
                      }}
                      style={{ margin: 0, width: "16px", height: "16px" }}
                    />
                    <span style={{ whiteSpace: "nowrap" }}>Book using a saved traveler profile</span>
                  </label>
                  
                  {isExistingGuest && (
                    <div className="hotel-traveler-picker" style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      <select 
                        id="hotel-existing-traveler" 
                        value={selectedTravelerId} 
                        onChange={(event) => selectExistingTraveler(event.target.value)} 
                        style={{ height: "28px", padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%", maxWidth: "260px", fontSize: "0.76rem" }}
                      >
                        <option value="">Choose profile</option>
                        {savedTravelers.map((traveler) => (
                          <option key={traveler.id} value={String(traveler.id)}>
                            {[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}
                          </option>
                        ))}
                      </select>
                      {travelerLoadError && <p className="hotel-helper hotel-helper--warning" style={{ margin: 0, color: "red", fontSize: "0.72rem" }}>{travelerLoadError}</p>}
                    </div>
                  )}
                </div>

                <div className="guest-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px" }}>
                  {/* Title */}
                  <div className="floating-field" style={{ gridColumn: "span 1" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Title <span style={{ color: "red" }}>*</span></label>
                    <select
                      value={guests[0]?.title || ""}
                      onChange={(e) => updateGuest(0, "title", e.target.value)}
                      className={errors.guest_0_title ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="">Select</option>
                      <option value="Mr">Mr.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Dr">Dr.</option>
                    </select>
                    {errors.guest_0_title && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_title}</span>}
                  </div>

                  {/* Full Name */}
                  <div className="floating-field" style={{ gridColumn: "span 3" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Full Name <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={guests[0]?.fullName || ""}
                      onChange={(e) => updateGuest(0, "fullName", e.target.value)}
                      className={errors.guest_0_fullName ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", textTransform: "capitalize" }}
                    />
                    {errors.guest_0_fullName && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_fullName}</span>}
                  </div>

                  {/* Gender */}
                  <div className="floating-field" style={{ gridColumn: "span 1" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Gender <span style={{ color: "red" }}>*</span></label>
                    <select
                      value={guests[0]?.gender || "Male"}
                      onChange={(e) => updateGuest(0, "gender", e.target.value)}
                      className={errors.guest_0_gender ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.guest_0_gender && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_gender}</span>}
                  </div>

                  {/* Age */}
                  <div className="floating-field" style={{ gridColumn: "span 1" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Age <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="number"
                      placeholder="Age"
                      value={guests[0]?.age || ""}
                      onChange={(e) => updateGuest(0, "age", e.target.value)}
                      className={errors.guest_0_age ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    {errors.guest_0_age && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_age}</span>}
                  </div>

                  {/* Email */}
                  <div className="floating-field" style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Email Address <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={guests[0]?.email || ""}
                      onChange={(e) => updateGuest(0, "email", e.target.value)}
                      className={errors.guest_0_email ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    {errors.guest_0_email && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_email}</span>}
                  </div>

                  {/* Mobile */}
                  <div className="floating-field" style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Mobile Number <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={guests[0]?.mobile || ""}
                      onChange={(e) => updateGuest(0, "mobile", e.target.value)}
                      className={errors.guest_0_mobile ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    {errors.guest_0_mobile && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_mobile}</span>}
                  </div>

                  {/* PAN Card */}
                  <div className="floating-field" style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>PAN Number {isPANMandatory ? <span style={{ color: "red" }}>*</span> : null}</label>
                    <input
                      type="text"
                      placeholder="PAN Card Number (e.g. ABCDE1234F)"
                      value={guests[0]?.pan || ""}
                      onChange={(e) => updateGuest(0, "pan", e.target.value.toUpperCase())}
                      className={errors.guest_0_pan ? "is-error" : ""}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", textTransform: "uppercase" }}
                    />
                    {errors.guest_0_pan && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_pan}</span>}
                  </div>
                </div>
              </section>

              {/* Optional Co-Traveler Details Accordions */}
              {guests.length > 1 && (
                <section className="hotel-panel" style={{ padding: "24px", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "24px" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Other Guest Details</h3>
                  {guests.slice(1).map((guest, index) => {
                    const actualIdx = index + 1;
                    return (
                      <div key={guest.index} style={{ border: "1px solid #f1f5f9", borderRadius: "12px", padding: "16px", marginBottom: "12px", background: "#fcfdfe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--hotel-ink)" }}>
                            Traveler #{actualIdx + 1} ({guest.type === "adult" ? "Adult" : "Child"})
                          </span>
                          <span style={{ fontSize: "0.7rem", color: guest.type === "child" ? "var(--hotel-rose)" : "#64748b", background: guest.type === "child" ? "rgba(220,30,38,0.05)" : "#f1f5f9", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                            {guest.type === "child" ? "Mandatory" : "Optional"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: guest.type === "child" ? "100px 1.5fr 1fr" : "100px 1.5fr 1fr 1fr", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                              Title {guest.type === "child" && <span style={{ color: "red" }}>*</span>}
                            </label>
                            <select
                              value={guest.title || ""}
                              onChange={(e) => updateGuest(actualIdx, "title", e.target.value)}
                              style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_title`] ? "1.5px solid red" : "1px solid #cbd5e1" }}
                            >
                              <option value="">Select</option>
                              {guest.type === "child" ? (
                                <>
                                  <option value="Mstr">Mstr</option>
                                  <option value="Miss">Miss</option>
                                </>
                              ) : (
                                <>
                                  <option value="Mr">Mr.</option>
                                  <option value="Mrs">Mrs.</option>
                                  <option value="Ms">Ms.</option>
                                </>
                              )}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                              Full Name {guest.type === "child" && <span style={{ color: "red" }}>*</span>}
                            </label>
                            <input
                              type="text"
                              placeholder="Name"
                              value={guest.fullName || ""}
                              onChange={(e) => updateGuest(actualIdx, "fullName", e.target.value)}
                              style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_fullName`] ? "1.5px solid red" : "1px solid #cbd5e1", textTransform: "capitalize" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                              Age {guest.type === "child" && <span style={{ color: "red" }}>*</span>}
                            </label>
                            <input
                              type="number"
                              placeholder="Age"
                              value={guest.age || ""}
                              onChange={(e) => {
                                if (guest.type === "child") {
                                  handleChildAgeChange(actualIdx, e.target.value);
                                } else {
                                  updateGuest(actualIdx, "age", e.target.value);
                                }
                              }}
                              style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_age`] ? "1.5px solid red" : "1px solid #cbd5e1" }}
                            />
                          </div>
                          {guest.type === "adult" && (
                            <div>
                              <label style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "4px" }}>Gender</label>
                              <select
                                value={guest.gender || "Male"}
                                onChange={(e) => updateGuest(actualIdx, "gender", e.target.value)}
                                style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
      );
                  })}
                </section>
              )}

              {/* Special Requests Grid */}
              <section className="hotel-panel" style={{ padding: "24px", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.15rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Special Requests (Optional)</h3>
                <p style={{ margin: "0 0 16px 0", fontSize: "0.8rem", color: "var(--hotel-muted)" }}>Select preferences to share with the hotel host. Requests are subject to availability.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {["Smoking Room", "Non-Smoking Room", "Large Bed", "Twin Beds", "Late Check-in", "Early Check-in", "High Floor", "Quiet Room", "Wheelchair Accessible"].map((req) => {
                    const isSelected = specialRequests.includes(req);
                    return (
                      <button
                        type="button"
                        key={req}
                        onClick={() => {
                          setSpecialRequests((prev) => 
                            prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
                          );
                        }}
                        className={`special-request-pill ${isSelected ? "is-selected" : ""}`}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: isSelected ? "1.5px solid var(--hotel-rose)" : "1px solid #e2e8f0",
                          background: isSelected ? "rgba(220,30,38,0.03)" : "#fff",
                          color: isSelected ? "var(--hotel-rose)" : "var(--hotel-ink)",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>{req}</span>
                        {isSelected && <span style={{ fontSize: "0.85rem", color: "var(--hotel-rose)" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label htmlFor="hotel-additional-notes" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--hotel-ink)", display: "block", marginBottom: "6px" }}>Any other requests or comments?</label>
                  <textarea
                    id="hotel-additional-notes"
                    placeholder="Enter special instructions or requests..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    style={{ width: "100%", height: "80px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "10px", fontSize: "0.85rem", resize: "none" }}
                  />
                </div>
              </section>

              {/* Review Selection Container */}
              <section className="hotel-panel" style={{ padding: "20px", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Review Stay & Guest Details</h3>
                
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", fontSize: "0.82rem", color: "var(--hotel-muted)", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", border: "1px solid rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🏨 <strong>Hotel:</strong></span>
                    <span style={{ color: "var(--hotel-ink)", fontWeight: 700 }}>{hotel.name}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span>🛏️ <strong>Selected Room:</strong></span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", color: "var(--hotel-ink)", fontWeight: 700 }}>
                        {offer?.roomCategory ? offer.roomCategory.split(",")[0].trim().replace(/_/g, " ") : "Standard Room"}
                      </span>
                      {offer?.roomCategory && offer.roomCategory.includes(",") && (
                        <span style={{ display: "block", fontSize: "0.74rem", color: "var(--hotel-muted)", marginTop: "2px" }}>
                          {offer.roomCategory.split(",").slice(1).join(", ").trim().replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>📅 <strong>Stay Period:</strong></span>
                    <span style={{ color: "var(--hotel-ink)", fontWeight: 700 }}>
                      {checkInDate ? toDisplayDate(String(checkInDate).split("T")[0]) : ""} to {checkOutDate ? toDisplayDate(String(checkOutDate).split("T")[0]) : ""} ({nights} {nights > 1 ? "Nights" : "Night"})
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>👤 <strong>Primary Guest:</strong></span>
                    <span style={{ color: "var(--hotel-ink)", fontWeight: 700 }}>
                      {guests[0]?.fullName ? `${guests[0].title || "Mr."} ${guests[0].fullName}` : "(Awaiting guest details)"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "10px", marginTop: "4px" }}>
                    <span>💰 <strong>Total Amount:</strong></span>
                    <strong style={{ color: "#10b981", fontSize: "1rem" }}>{formatCurrency(finalPayable)}</strong>
                  </div>
                </div>

                {specialRequests.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", background: "#f8fafc", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", fontSize: "0.82rem" }}>
                    <span 
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--hotel-muted)" }}
                      onClick={() => setShowReqPopup(true)}
                    >
                      ✨ <strong style={{ textDecoration: "underline", color: "var(--hotel-ink)" }}>Special Requests:</strong>
                    </span>
                    <span style={{ color: "var(--hotel-ink)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{specialRequests.slice(0, 2).join(", ")}</span>
                      {specialRequests.length > 2 && (
                        <button 
                          type="button"
                          onClick={() => setShowReqPopup(true)}
                          style={{
                            background: "rgba(220, 30, 38, 0.08)",
                            border: "1px solid rgba(220, 30, 38, 0.15)",
                            color: "var(--hotel-rose)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            marginLeft: "4px"
                          }}
                        >
                          +{specialRequests.length - 2} more
                        </button>
                      )}
                    </span>
                  </div>
                )}

                <label className={`hotel-checkbox ${errors.agreedToAll ? "is-error" : ""}`} style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--hotel-ink)", margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={agreedToAll} 
                    onChange={(event) => {
                      setAgreedToAll(event.target.checked);
                      setErrors((current) => { const next = { ...current }; delete next.agreedToAll; return next; });
                      setFormError("");
                    }} 
                  />
                  <span>
                    I have reviewed my hotel selection and guest info, verify they are correct, and agree to the hotel booking policy, guest rules, and cancellation terms (
                    <span style={{ color: "var(--hotel-rose)", fontWeight: 700 }}>
                      {offer?.cancellationPolicy || "Standard cancellation terms apply"}
                    </span>
                    ) for this stay.
                  </span>
                </label>
                {errors.agreedToAll && <p style={{ margin: "4px 0 0 0", color: "red", fontSize: "0.74rem" }}>{errors.agreedToAll}</p>}
                {formError && <p className="hotel-helper hotel-helper--error" style={{ margin: "8px 0 0 0", color: "red", fontSize: "0.78rem" }}>{formError}</p>}
              </section>

              {/* Bottom Actions Row */}
              <div className="booking-action-buttons-row" style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  {agreedToAll && (
                    <button
                      type="button"
                      className="hotel-primary-button"
                      style={{ minHeight: "44px", padding: "0 22px", borderRadius: "12px", fontWeight: 700, background: "var(--hotel-rose)" }}
                      onClick={handleContinue}
                    >
                      Continue to Payment →
                    </button>
                  )}
                  {!hasValidToken && agreedToAll && (
                    <span style={{ fontSize: "0.72rem", color: "var(--hotel-rose)", marginTop: "4px", fontWeight: 600 }}>
                      * Login mandatory to pay
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column Booking Sidebar */}
            <aside className="hotel-reserve-rail" style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Booking Summary Card */}
              <div className="hotel-reserve-card hotel-your-stay-card" style={{ background: "var(--hotel-surface)", borderRadius: "24px", border: "1px solid var(--hotel-border)", padding: "24px", boxShadow: "var(--hotel-shadow)" }}>
                <div className="hotel-your-stay-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Booking Summary</h3>
                </div>

                {offer && (
                  <>
                    {/* Hotel Mini details */}
                    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "12px", marginBottom: "16px" }}>
                      <img 
                        src={gallery[0]} 
                        alt={hotel.name} 
                        style={{ width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover" }} 
                      />
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--hotel-ink)", lineHeight: "1.3" }}>{hotel.name}</h4>
                        {hotel.rating > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", margin: "4px 0" }}>
                            <span style={{ color: "#f59e0b" }}>★</span>
                            <strong style={{ color: "var(--hotel-ink)" }}>{Number(hotel.rating).toFixed(1)}</strong>
                          </div>
                        )}
                        <span style={{ fontSize: "0.78rem", color: "var(--hotel-muted)" }}>📍 {hotel.city || hotel.area || "Location"}</span>
                      </div>
                    </div>

                    {/* Stay Dates Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: "16px", position: "relative" }}>
                      <div style={{ borderRight: "1px solid rgba(0,0,0,0.06)", paddingRight: "8px" }}>
                        <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase" }}>Check-in</span>
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--hotel-ink)", marginTop: "4px" }}>
                          {checkInDate ? toDisplayDate(String(checkInDate).split("T")[0]) : ""}
                        </strong>
                      </div>
                      <div style={{ paddingLeft: "8px" }}>
                        <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase" }}>Check-out</span>
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--hotel-ink)", marginTop: "4px" }}>
                          {checkOutDate ? toDisplayDate(String(checkOutDate).split("T")[0]) : ""}
                        </strong>
                      </div>
                    </div>

                    {/* Guest Summary & Room Type info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--hotel-muted)" }}>Stay Length</span>
                        <strong style={{ color: "var(--hotel-ink)" }}>{formatNightLabel(nights)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--hotel-muted)" }}>Guests &amp; Rooms</span>
                        <strong style={{ color: "var(--hotel-ink)" }}>{guestSummary}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--hotel-muted)" }}>Selected Room</span>
                        <div style={{ textAlign: "right" }}>
                          <strong style={{ display: "block", color: "var(--hotel-ink)" }}>
                            {offer.roomCategory ? offer.roomCategory.split(",")[0].trim().replace(/_/g, " ") : "Standard Room"}
                          </strong>
                          {offer.roomCategory && offer.roomCategory.includes(",") && (
                            <span style={{ display: "block", fontSize: "0.74rem", color: "var(--hotel-muted)", marginTop: "2px" }}>
                              {offer.roomCategory.split(",").slice(1).join(", ").trim().replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="hotel-fare-breakdown" style={{ display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "14px" }}>
                      <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--hotel-muted)" }}>
                        <span>Room base charges</span>
                        <strong style={{ color: "var(--hotel-ink)" }}>{formatCurrency(basePrice)}</strong>
                      </div>
                      <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--hotel-muted)" }}>
                        <span>Taxes and GST (12%)</span>
                        <strong style={{ color: "var(--hotel-ink)" }}>{formatCurrency(tax)}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Total Price</span>
                      <strong style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>{formatCurrency(finalPayable)}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* Need Help Card */}
              <div className="hotel-reserve-card need-help-card" style={{ padding: "20px", borderRadius: "20px", border: "1px solid var(--hotel-border)", background: "#fff", boxShadow: "var(--hotel-shadow)" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--hotel-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📞</span> Need Help?
                </h3>
                <p style={{ margin: "0 0 14px 0", fontSize: "0.82rem", color: "var(--hotel-muted)", lineHeight: 1.5 }}>
                  Our customer experience specialists are available 24/7 to help you with your booking.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--hotel-ink)" }}>
                    <span>📱</span> <strong>+91 98765 43210</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--hotel-ink)" }}>
                    <span>✉️</span> <strong>support@picknbook.com</strong>
                  </div>
                </div>
                <button 
                  type="button" 
                  style={{
                    width: "100%",
                    background: "none",
                    border: "1px solid var(--hotel-rose)",
                    color: "var(--hotel-rose)",
                    borderRadius: "10px",
                    padding: "10px 0",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onClick={() => navigate("/contact")}
                >
                  Contact Us
                </button>
              </div>

            </aside>

          </div>
        )}

      </div>

      {showChildAgeAlert && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "20px",
            width: "90%",
            maxWidth: "450px",
            padding: "28px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
            textAlign: "center"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "1.8rem",
              margin: "0 auto 16px auto"
            }}>
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>
              Passenger is Considered an Adult
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "0.85rem", color: "var(--hotel-muted)", lineHeight: "1.5" }}>
              A child aged 12 or above is classified as an adult passenger. Please return to the search filters to search for this stay with the correct adult guest count.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowChildAgeAlert(false);
                  if (alertChildIndex !== null) {
                    updateGuest(alertChildIndex, "age", ""); // Clear the invalid age
                  }
                }}
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.88rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChildAgeAlert(false);
                  navigate("/");
                }}
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "10px",
                  border: "none",
                  background: "var(--hotel-rose)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.88rem"
                }}
              >
                Go to Search
              </button>
            </div>
          </div>
        </div>
      )}

      {showReqPopup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease"
        }} onClick={() => setShowReqPopup(false)}>
          <div style={{
            background: "#fff",
            borderRadius: "20px",
            width: "90%",
            maxWidth: "400px",
            padding: "24px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 800, color: "var(--hotel-rose)", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "10px" }}>
              Selected Special Requests
            </h3>
            <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "var(--hotel-ink)" }}>
              {specialRequests.map((req) => (
                <li key={req} style={{ fontWeight: 600 }}>✓ {req}</li>
              ))}
            </ul>
            <button 
              type="button" 
              onClick={() => setShowReqPopup(false)}
              style={{
                marginTop: "20px",
                width: "100%",
                height: "40px",
                borderRadius: "10px",
                background: "var(--hotel-rose)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.88rem"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
          {isModalOpen && checkoutPayload && (
        <BookingConfirmationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          bookingType="Hotel" 
          flowState={checkoutPayload} 
          onSuccess={(res) => {
            navigate("/ticket/confirmation", { state: checkoutPayload, replace: true });
          }} 
        />
      )}
    </main>
  );
}