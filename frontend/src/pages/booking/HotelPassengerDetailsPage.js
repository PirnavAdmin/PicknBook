/* eslint-disable */
import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, Home, MapPin, ShieldCheck, Sparkles, Star, UserRound, Loader2, BedDouble, Info, X
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate, toYyyyMmDd } from "../../utils/apiDateFormat";
import BookingConfirmationModal from "../../components/booking/BookingConfirmationModal";
import { navigateWithAuth, isUserAuthenticated } from "../../utils/authNavigation";
import { isTokenExpired } from "../../services/authSession";
import {
  blockRoom,
  getHotelInfo,
  getHotelRoom,
  bookHotelRoom,
  listAvailableHotelCoupons,
  getFeaturedHotelOffers,
  validateHotelCoupon,
  validateOfferConditions,
} from "../../services/hotelBookingService";
import { listTravelers } from "../../services/travelerService";
import { buildGuestSummary, buildStayFacts, buildStayHighlights, formatNightLabel, getHotelVisuals } from "./hotelPresentation";

import HotelDetail from "./HotelDetail";
import CancellationPolicySection from "../../components/booking/CancellationPolicySection";
import "../../STYLES/HotelCheckoutExperience.css";
import { clearHotelBookingFlowState, readHotelBookingFlowState, writeHotelBookingFlowState } from "./hotelBookingFlowStore";

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const getHotelPromoDiscountLabel = (promo) => {
  const value = Number(promo?.value || 0);
  if (!value) return "HOTEL DEAL";
  return String(promo?.couponType || "").toLowerCase().includes("percent")
    ? `${value}% OFF`
    : `${formatCurrency(value)} OFF`;
};

function getOfferMainHeading(offer) {
  const isPercent = Boolean(
    offer?.isPercentageDiscount ||
    String(offer?.discountType || offer?.promotionType || offer?.couponType || "").toLowerCase().includes("percent")
  );
  const val = Number(offer?.discountValue ?? offer?.value ?? 0);
  if (val > 0) {
    return isPercent ? `GET ${val}% OFF!` : `FLAT ₹${val} OFF!`;
  }
  const titleText = String(offer?.title || offer?.Title || "");
  const percentMatch = titleText.match(/(\d+)\s*%/);
  if (percentMatch) {
    return `GET ${percentMatch[1]}% OFF!`;
  }
  const flatMatch = titleText.match(/(?:flat|rs\.?|inr|₹)\s*(\d+)|(\d+)\s*(?:rs|inr|off)/i);
  if (flatMatch) {
    const num = flatMatch[1] || flatMatch[2];
    if (num) return `FLAT ₹${num} OFF!`;
  }
  return isPercent ? "GET % OFF!" : "SPECIAL OFFER!";
}

function getCouponMainHeading(coupon) {
  const val = Number(coupon?.value || coupon?.discountValue || 0);
  const isPercent = String(coupon?.couponType || coupon?.cpnType || coupon?.discountType || "")
    .toLowerCase()
    .includes("percent");
  if (val > 0) {
    return isPercent ? `GET ${val}% OFF!` : `FLAT ₹${val} OFF!`;
  }
  const desc = String(coupon?.title || coupon?.Title || coupon?.description || "");
  const percentMatch = desc.match(/(\d+)\s*%/);
  if (percentMatch) {
    return `GET ${percentMatch[1]}% OFF!`;
  }
  const flatMatch = desc.match(/(?:flat|rs\.?|inr|₹)\s*(\d+)|(\d+)\s*(?:rs|inr|off)/i);
  if (flatMatch) {
    const num = flatMatch[1] || flatMatch[2];
    if (num) return `FLAT ₹${num} OFF!`;
  }
  return isPercent ? "GET % OFF!" : "COUPON OFFER!";
}

function getPromotionSubHeading(item) {
  const rawTitle = String(item?.title || item?.Title || item?.remark || item?.description || "").trim();
  if (!rawTitle) {
    return item?.promotionCategory === "Offer" || item?.category === "Offer" || item?.itemType === "offer"
      ? "Featured Offer"
      : "Exclusive Coupon";
  }
  const cleanedTitle = rawTitle
    .replace(/\s*[-–—:]?\s*(?:get\s*)?(?:\d+%\s*off|\d+%|flat\s*₹?\s*\d+|₹\s*\d+\s*off)\s*$/i, "")
    .trim();

  return cleanedTitle || rawTitle;
}
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);
const isValidEmail = (email) => {
  const value = String(email || "").trim();
  return value.length <= 254 &&
    !value.includes("..") &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*\.[A-Z]{2,24}$/i.test(value);
};
const isValidGuestName = (name) => {
  const value = String(name || "").trim();
  return value.length <= 50 && /^[A-Za-z]+([ '-][A-Za-z]+)*$/.test(value);
};
const invalidGuestMobileNumbers = new Set([
  "0000000000", "1111111111", "2222222222", "3333333333",
  "4444444444", "5555555555", "6666666666", "7777777777",
  "8888888888", "9999999999", "1234567890", "9876543210",
]);
const isValidMobile = (mobile) => {
  let digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) &&
    !invalidGuestMobileNumbers.has(digits);
};
const getTitleGenderError = (title, gender) => {
  if (!title || !gender || gender === "Other" || title === "Dr") return "";
  const femaleTitles = ["Ms", "Mrs", "Miss"];
  const maleTitles = ["Mr", "Mstr"];
  if (femaleTitles.includes(title) && gender !== "Female") {
    return `${title === "Miss" ? "Miss" : title === "Mrs" ? "Mrs." : "Ms."} title requires Female gender.`;
  }
  if (maleTitles.includes(title) && gender !== "Male") {
    return `${title === "Mstr" ? "Mstr" : "Mr."} title requires Male gender.`;
  }
  return "";
};
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
    "Securing exclusive Pick&book discounts...",
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
          borderTopColor: "#ff0000",
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
          borderBottomColor: "#ff0000",
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
          background: "linear-gradient(90deg, #ff0000, #ff0000)",
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
    const hasDifferentBookingFlow = Boolean(
      routerState?.bookingFlowId && routerState.bookingFlowId !== storedState.bookingFlowId
    );
    const merged = hasDifferentBookingFlow ? { ...routerState } : { ...storedState, ...routerState };
    if (hasDifferentBookingFlow) clearHotelBookingFlowState();
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
  const [selectedMultiRooms, setSelectedMultiRooms] = useState(() => incomingState.selectedMultiRooms || []);
  const roomsCount = searchContext?.roomsConfig ? searchContext.roomsConfig.length : 1;
  const [currentStep, setCurrentStep] = useState(() => incomingState.currentStep || 1);
  const [specialRequests, setSpecialRequests] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState(null);

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.getElementById("root")?.scrollTo(0, 0);
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.key, location.pathname, location.search]);

  const autoContinueProcessed = useRef(false);
  useEffect(() => {
    const isAutoContinue =
      location.state?.autoContinue ||
      searchParams.get("autoContinue") === "true";

    if (isAutoContinue && isUserAuthenticated() && !autoContinueProcessed.current) {
      autoContinueProcessed.current = true;
      // Clean the autoContinue param from the URL without auto-triggering blockRoom/handleContinue.
      // The user must click Continue manually after returning from login.
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("autoContinue");
      const nextSearch = nextParams.toString() ? `?${nextParams.toString()}` : "";
      navigate(`/hotel/passenger-details${nextSearch}`, { replace: true, state: {} });
    }
  }, [location, searchParams]);

  useEffect(() => {
    if (searchParams.get("autoStep2") === "true" && isUserAuthenticated()) {
      setCurrentStep(2);
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("autoStep2");
      const nextSearch = nextParams.toString() ? `?${nextParams.toString()}` : "";
      navigate(`/hotel/passenger-details${nextSearch}`, { replace: true, state: {} });
    }
  }, [searchParams, location.search, navigate]);

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

    const savedGuests = Array.isArray(incomingState.guests) ? incomingState.guests : [];
    const savedPrimaryGuest = savedGuests[0] || {};
    const list = [];
    list.push({
      ...savedPrimaryGuest,
      index: 0,
      type: "adult",
      title: savedPrimaryGuest.title || incomingState.guestTitle || "",
      fullName: savedPrimaryGuest.fullName || incomingState.guestName || "",
      age: savedPrimaryGuest.age || incomingState.guestAge || "",
      gender: savedPrimaryGuest.gender || incomingState.guestGender || "",
      nationality: savedPrimaryGuest.nationality || "India",
      idProofType: savedPrimaryGuest.idProofType || "Aadhaar",
      idProofNumber: savedPrimaryGuest.idProofNumber || "",
      email: savedPrimaryGuest.email || incomingState.guestEmail || "",
      mobile: savedPrimaryGuest.mobile || incomingState.guestPhone || "",
    });
    for (let i = 1; i < initAdults; i++) {
      const savedGuest = savedGuests[i] || {};
      list.push({
        ...savedGuest,
        index: i,
        type: "adult",
        title: savedGuest.title || "",
        fullName: savedGuest.fullName || "",
        age: savedGuest.age || "",
        gender: savedGuest.gender || "",
        nationality: savedGuest.nationality || "India",
        idProofType: savedGuest.idProofType || "Aadhaar",
        idProofNumber: savedGuest.idProofNumber || "",
        email: savedGuest.email || "",
        mobile: savedGuest.mobile || "",
      });
    }
    for (let i = 0; i < initChildren; i++) {
      const guestIndex = initAdults + i;
      const savedGuest = savedGuests[guestIndex] || {};
      list.push({
        ...savedGuest,
        index: guestIndex,
        type: "child",
        title: savedGuest.title || "Mstr",
        fullName: savedGuest.fullName || "",
        age: savedGuest.age || "",
        gender: savedGuest.gender || "",
        nationality: savedGuest.nationality || "India",
        idProofType: savedGuest.idProofType || "Aadhaar",
        idProofNumber: savedGuest.idProofNumber || "",
        email: savedGuest.email || "",
        mobile: savedGuest.mobile || "",
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
      const nextGuest = { ...guests[index], [field]: value };
      const titleGenderError = getTitleGenderError(nextGuest.title, nextGuest.gender);
      if (titleGenderError) {
        next[`guest_${index}_titleGender`] = titleGenderError;
      } else {
        delete next[`guest_${index}_titleGender`];
      }
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
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const featuredOffersScrollerRef = useRef(null);
  const couponScrollerRef = useRef(null);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [copiedPromoCode, setCopiedPromoCode] = useState("");

  useEffect(() => {
    if (!detailModalItem) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setDetailModalItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailModalItem]);

  const [showChildAgeAlert, setShowChildAgeAlert] = useState(false);
  const [alertChildIndex, setAlertChildIndex] = useState(null);
  const [isOtherGuestsOpen, setIsOtherGuestsOpen] = useState(false);

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

  const roomsFetchedRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    async function fetchRoomsAndInfo() {
      if (!hotel?.hotelId) { setIsLoadingOffer(false); return; }
      // Prevent duplicate fetches — only fetch once per hotel
      if (roomsFetchedRef.current) {
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
        const hotelDetailsObj = info?.HotelDetails || info?.hotelInfoResult?.hotelDetails || info?.HotelInfoResult?.HotelDetails;
        const fetchedHotelCode = hotelDetailsObj?.HotelCode || hotelDetailsObj?.hotelCode || hotel.hotelId;
        
        if (hotelDetailsObj) {
            const rawFacilities = hotelDetailsObj.HotelFacilities || hotelDetailsObj.hotelFacilities || [];

            const normalizedAmenities = Array.isArray(rawFacilities)
              ? rawFacilities.filter(f => f)
              : [];
              
            const rawAttractions = hotelDetailsObj.Attractions || hotelDetailsObj.attractions || [];

            setHotel(current => ({
                ...current,
                images: hotelDetailsObj.Images || hotelDetailsObj.images || current.images,
                latitude: hotelDetailsObj.Latitude || hotelDetailsObj.latitude || current.latitude,
                longitude: hotelDetailsObj.Longitude || hotelDetailsObj.longitude || current.longitude,
                address: hotelDetailsObj.Address || hotelDetailsObj.address || current.address,
                amenities: normalizedAmenities.length > 0 ? normalizedAmenities : current.amenities,
                attractions: rawAttractions,
                description: hotelDetailsObj.Description || hotelDetailsObj.description || [],
                hotelPolicy: hotelDetailsObj.HotelPolicy || hotelDetailsObj.hotelPolicy || "",
                policyAndInstruction: hotelDetailsObj.PolicyAndInstruction || hotelDetailsObj.policyAndInstruction || [],
                hotelId: fetchedHotelCode
            }));
        }
        
        // 2. Get Hotel Rooms — this is the critical call for live room pricing
        const roomPayload = { ...infoPayload, HotelCode: fetchedHotelCode };
        console.log("[HotelBooking] Calling getHotelRoom with payload:", roomPayload);
        const roomsResult = await getHotelRoom(roomPayload);
        console.log("[HotelBooking] getHotelRoom response:", roomsResult);
        
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
                        
                        // Use ?? to avoid skipping valid 0 values; prioritize b2cDisplayFare
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
                        
                        // Compute customer-friendly cancellation policy summary
                        let policySummary = "Cancellation terms apply";
                        const freeSlab = cancelPolicies.find(p => Number(p.charge || p.Charge || 0) === 0);
                        if (freeSlab && freeSlab.toDate) {
                          try {
                            const d = new Date(freeSlab.toDate);
                            const dateFormatted = isNaN(d.getTime()) ? freeSlab.toDate : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                            policySummary = `Free cancellation until ${dateFormatted}`;
                          } catch {
                            policySummary = `Free cancellation until ${freeSlab.toDate}`;
                          }
                        } else if (lastCancelDate) {
                          try {
                            const d = new Date(lastCancelDate);
                            const dateFormatted = isNaN(d.getTime()) ? lastCancelDate : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                            policySummary = `Free cancellation until ${dateFormatted}`;
                          } catch {
                            policySummary = `Free cancellation until ${lastCancelDate}`;
                          }
                        } else if (isFullRefund) {
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
                            cancellationPoliciesData: cancelPolicies,
                            cancellation: cancellationObj,
                            lastCancellationDate: lastCancelDate,
                            fullRefundAllowed: isFullRefund,
                            isRefundable: isFullRefund,
                            bedType: r.bedTypes || r.BedTypes || "",
                            amenities: r.amenities || r.Amenities || [],
                            hotelSupplements: r.hotelSupplements || r.HotelSupplements || "",
                            servicesStatus: r.servicesStatus || r.ServicesStatus || [],
                            isPANMandatory: hotelRoomResult.isPANMandatory || hotelRoomResult.IsPANMandatory || r.isPANMandatory || false,
                            isPassportMandatory: hotelRoomResult.isPassportMandatory || hotelRoomResult.IsPassportMandatory || r.isPassportMandatory || false
                        };
                    })
                }));
                // Mark as fetched so we don't re-fetch on state updates
                roomsFetchedRef.current = true;
            }
        } else if (!roomsResult) {
            throw new Error("Unable to fetch room availability from the live API.");
        }
      } catch (err) {
        console.error("[HotelBooking] fetchRoomsAndInfo error:", err);
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
  }, [currentStep]);

  // Restore pending hotel offer after login — but do NOT auto-trigger blockRoom.
  // Instead, restore the selection state and let the user click "Choose room" or "Continue" manually.
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
          // Just store the offer in state — don't call blockRoom automatically
          console.log("[HotelBooking] Restored pending offer after login (user must click Choose room):", pendingOffer);
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
        guestGender: guests[0]?.gender || "",
        guestPassportNo,
        guestEmail,
        guestPhone,
        guests,
        agreedToTerms,
        isPANMandatory,
        isPassportMandatory,
        blockRoomResponse,
        currentStep,
        selectedMultiRooms,
      });
    }
  }, [hotel, offer, searchContext, guestName, guestTitle, guestAge, guestPassportNo, guestEmail, guestPhone, guests, agreedToTerms, isPANMandatory, isPassportMandatory, blockRoomResponse, currentStep, selectedMultiRooms]);

  const handleSelectOffer = async (roomOffer, couponToApply = couponCode) => {
    // If user is re-selecting (replacing an already chosen room), drop the previous
    // selection for that slot so we don't accumulate beyond roomsCount.
    const alreadyPicked = selectedMultiRooms.some(r => r.selectionKey === roomOffer.selectionKey);
    const cleanedSelection = roomsCount === 1
      ? []
      : alreadyPicked
      ? selectedMultiRooms.filter(r => r.selectionKey !== roomOffer.selectionKey)
      : selectedMultiRooms;
    const newSelection = [...cleanedSelection, roomOffer];
    
    if (newSelection.length < roomsCount) {
        setSelectedMultiRooms(newSelection);
        return; // wait for next room selection
    }

    setSelectingOfferId(roomOffer.selectionKey);
    setOfferLoadError("");
  setSelectedMultiRooms(newSelection);
  setBlockRoomResponse(null);
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
        ClientReferenceNo: "0",
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
          const rawTotal = Number(
            room.B2CTotalPrice || room.b2cTotalPrice ||
            price.B2CTotalPrice || price.b2cTotalPrice || price.b2cFinalFare || price.B2CFinalFare ||
            price.b2cDisplayFare || price.B2CDisplayFare || price.OfferedPrice || price.offeredPrice ||
            price.PublishedPrice || price.publishedPrice || 0
          );
          
          let roomMarkup = Number(price.AgentMarkUp ?? price.agentMarkUp ?? price.agentMarkup ?? 0);
          let roomBase = 0;
          let roomTax = 0;

          const supplierPricing = room.SupplierPricing || room.supplierPricing;
          const supplierTotal = Number(supplierPricing?.TotalPrice ?? supplierPricing?.totalPrice ?? 0);
          
          if (supplierPricing && supplierTotal > 0) {
              const supplierBase = Number(supplierPricing.BasePrice ?? supplierPricing.basePrice ?? 0);
              
              if (!isAgent) {
                  const hiddenMarkup = rawTotal - supplierTotal;
                  roomBase = supplierBase + hiddenMarkup;
                  roomMarkup = 0;
              } else {
                  roomBase = supplierBase;
              }
              
              roomTax = rawTotal - roomBase - roomMarkup;
          } else {
              // Legacy fallback
              roomBase = Number(
                room.B2CBasePrice || room.b2CBasePrice ||
                price.B2CBasePrice || price.b2cBasePrice ||
                price.RoomPrice || price.roomPrice || price.PublishedPrice || price.publishedPrice || 0
              );
              const gst = price.GST || price.gst || {};
              const gstBreakupTotal = [
                gst.CGSTAmount, gst.cgstAmount, gst.SGSTAmount, gst.sgstAmount,
                gst.IGSTAmount, gst.igstAmount, gst.CessAmount, gst.cessAmount
              ].reduce((sum, value) => sum + (Number(value) || 0), 0);
              
              const totalGstAmount = Number(price.TotalGSTAmount ?? price.totalGSTAmount ?? 0);
              const declaredTax = Number(price.Tax ?? price.tax ?? 0);
              roomTax = totalGstAmount || declaredTax || gstBreakupTotal;
              
              if (!isAgent) {
                  roomBase = Number(price.b2CBasePrice ?? price.b2cBasePrice ?? (roomBase + roomMarkup));
                  roomMarkup = 0;
              }
          }
          
          basePrice += roomBase;
          tax += roomTax;
          markupValue += roomMarkup;
          couponDiscount += Number(price.CouponDiscount ?? price.couponDiscount ?? 0);
          convenienceFee += Number(price.ConvenienceFee ?? price.convenienceFee ?? 0);
          finalPayable += Number(rawTotal);
      });
  } else if (offer) {
      // Use the selected offer's price until blockRoom confirms the final rate
      const rawTotal = Number(offer.price ?? 0);
      if (offer.originalPrice) {
          const op = offer.originalPrice;
          let markup = Number(op.AgentMarkUp ?? op.agentMarkUp ?? op.agentMarkup ?? 0);
          
          const supplierPricing = offer.SupplierPricing || offer.supplierPricing;
          const supplierTotal = Number(supplierPricing?.TotalPrice ?? supplierPricing?.totalPrice ?? 0);
          
          if (supplierPricing && supplierTotal > 0) {
              const supplierBase = Number(supplierPricing.BasePrice ?? supplierPricing.basePrice ?? 0);
              
              if (!isAgent) {
                  const hiddenMarkup = rawTotal - supplierTotal;
                  basePrice = supplierBase + hiddenMarkup;
                  markup = 0;
              } else {
                  basePrice = supplierBase;
              }
              
              tax = rawTotal - basePrice - markup;
          } else {
              // Legacy fallback
              tax = Number(op.Tax ?? op.tax ?? op.TotalGSTAmount ?? op.totalGSTAmount ?? 0);
              basePrice = Number(op.RoomPrice ?? op.roomPrice ?? op.PublishedPrice ?? op.publishedPrice ?? 0);
              
              if (!isAgent) {
                  basePrice = Number(op.b2CBasePrice ?? op.b2cBasePrice ?? (basePrice + markup));
                  markup = 0;
              }
          }

          markupValue = markup;
          couponDiscount = Number(op.CouponDiscount ?? op.couponDiscount ?? 0);
          convenienceFee = Number(op.ConvenienceFee ?? op.convenienceFee ?? 0);
          
          finalPayable = rawTotal;
      } else {
          basePrice = offerPrice > 0 ? offerPrice : 0;
          finalPayable = basePrice;
      }
  }
  // If no offer selected and no blocked rooms, all prices remain 0 — UI shows "Select a room"

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
    const fullNameOk = isValidGuestName(primary.fullName);
    const age = Number(primary.age);
    const ageOk = Number.isInteger(age) && age >= 18 && age <= 120;
    const genderOk = !!primary.gender;
    const titleOk = !!primary.title;
    const emailOk = !!primary.email?.trim() && isValidEmail(primary.email);
    const phoneOk = !!primary.mobile?.trim() && isValidMobile(primary.mobile);
    return fullNameOk && ageOk && genderOk && titleOk && emailOk && phoneOk;
  }, [guests]);

  const selectExistingTraveler = (travelerId) => {
    setSelectedTravelerId(travelerId);
    const found = savedTravelers.find((traveler) => String(traveler.id) === travelerId);
    if (!travelerId || !found) return;
    applyTravellerToGuest(found, 0);
  };

  const validateGuestField = (index, field) => {
    const guest = guests[index];
    if (!guest) return;

    const guestStarted = Boolean(guest.fullName?.trim() || guest.age || guest.title);
    const required = index === 0 || guest.type === "child" || guestStarted;
    let message = "";

    if (field === "title" && required && !guest.title) {
      message = "Please select a title.";
    } else if (field === "title" && guest.title && !["Mr", "Mrs", "Ms", "Dr", "Mstr", "Miss"].includes(guest.title)) {
      message = "Select a valid title.";
    } else if (field === "fullName") {
      const name = String(guest.fullName || "").trim();
      if (required && !name) message = "Full name is required.";
      else if (name && !isValidGuestName(name)) message = "Enter a valid name using letters, spaces, hyphens, or apostrophes (max 50 characters).";
    } else if (field === "age") {
      const age = Number(guest.age);
      if (required && String(guest.age ?? "").trim() === "") {
        message = guest.type === "child" ? "Child age is required." : "Age is required.";
      } else if (String(guest.age ?? "").trim() !== "" && (!Number.isInteger(age) || age < 0 || age > 120)) {
        message = "Enter a whole-number age between 0 and 120.";
      } else if (String(guest.age ?? "").trim() !== "" && guest.type === "adult" && age < 18) {
        message = "Adult guests must be 18 years or older.";
      } else if (guest.type === "child" && age > 17) {
        message = "Child age must be between 0 and 17.";
      }
    } else if (field === "gender" && (index === 0 || (required && guest.type === "adult"))) {
      if (!guest.gender) message = "Please select gender.";
      else if (!["Male", "Female", "Other"].includes(guest.gender)) message = "Select a valid gender.";
    } else if (field === "email" && index === 0) {
      if (!guest.email?.trim()) message = "Please enter email.";
      else if (!isValidEmail(guest.email)) message = "Enter a valid email.";
    } else if (field === "mobile" && index === 0) {
      if (!guest.mobile?.trim()) message = "Please enter phone number.";
      else if (!isValidMobile(guest.mobile)) message = "Enter a valid 10-digit Indian mobile number.";
    }

    const updatedGuest = { ...guest, [field]: guest[field] };
    const titleGenderError = getTitleGenderError(updatedGuest.title, updatedGuest.gender);
    setErrors((current) => {
      const next = { ...current };
      const errorKey = `guest_${index}_${field}`;
      delete next[errorKey];
      if (message) next[errorKey] = message;
      if (field === "title" || field === "gender") {
        delete next[`guest_${index}_titleGender`];
        if (titleGenderError) next[`guest_${index}_titleGender`] = titleGenderError;
      }
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    
    // Primary Adult
    const primary = guests[0];
    if (!primary) return false;

    if (!primary.title) {
      nextErrors.guest_0_title = "Please select a title.";
    } else if (!["Mr", "Mrs", "Ms", "Dr", "Mstr", "Miss"].includes(primary.title)) {
      nextErrors.guest_0_title = "Select a valid title.";
    }
    if (!primary.fullName?.trim()) {
      nextErrors.guest_0_fullName = "Full name is required.";
    } else if (!isValidGuestName(primary.fullName)) {
      nextErrors.guest_0_fullName = "Enter a valid name using letters, spaces, hyphens, or apostrophes (max 50 characters).";
    }
    if (String(primary.age ?? "").trim() === "") {
      nextErrors.guest_0_age = "Please enter age.";
    } else if (!Number.isInteger(Number(primary.age)) || Number(primary.age) > 120 || Number(primary.age) < 0) {
      nextErrors.guest_0_age = "Enter a whole-number age between 0 and 120.";
    } else if (Number(primary.age) < 18) {
      nextErrors.guest_0_age = "Primary guest must be 18 years or older.";
    }
    if (!primary.gender) {
      nextErrors.guest_0_gender = "Please select gender.";
    } else if (!["Male", "Female", "Other"].includes(primary.gender)) {
      nextErrors.guest_0_gender = "Select a valid gender.";
    }
    const primaryTitleGenderError = getTitleGenderError(primary.title, primary.gender);
    if (primaryTitleGenderError) {
      nextErrors.guest_0_titleGender = primaryTitleGenderError;
    }
    if (!primary.email?.trim()) {
      nextErrors.guest_0_email = "Please enter email.";
    } else if (!isValidEmail(primary.email)) {
      nextErrors.guest_0_email = "Enter a valid email.";
    }
    if (!primary.mobile?.trim()) {
      nextErrors.guest_0_mobile = "Please enter phone number.";
    } else if (!isValidMobile(primary.mobile)) {
      nextErrors.guest_0_mobile = "Enter a valid 10-digit Indian mobile number.";
    }

    // Co-Travelers validation (mandatory for children, optional for additional adults)
    guests.forEach((guest, idx) => {
      const guestStarted = Boolean(guest.fullName?.trim() || guest.age || guest.title);
      const guestRequired = guest.type === "child" || guestStarted;
      if (idx > 0) {
        if (guest.type === "child") {
          if (!guest.title) {
            nextErrors[`guest_${idx}_title`] = "Select title.";
          }
          if (!guest.fullName?.trim()) {
            nextErrors[`guest_${idx}_fullName`] = "Full name is required.";
          } else if (!isValidGuestName(guest.fullName)) {
            nextErrors[`guest_${idx}_fullName`] = "Enter a valid name using letters, spaces, hyphens, or apostrophes (max 50 characters).";
          }
          if (String(guest.age ?? "").trim() === "") {
            nextErrors[`guest_${idx}_age`] = "Enter child age.";
          } else if (!Number.isInteger(Number(guest.age)) || Number(guest.age) < 0 || Number(guest.age) > 17) {
            nextErrors[`guest_${idx}_age`] = "Child age must be a whole number between 0 and 17.";
          }
        } else {
          if (guestRequired) {
            if (!guest.title) {
              nextErrors[`guest_${idx}_title`] = "Select title.";
            }
            if (!guest.fullName?.trim()) {
              nextErrors[`guest_${idx}_fullName`] = "Full name is required.";
            } else if (!isValidGuestName(guest.fullName)) {
              nextErrors[`guest_${idx}_fullName`] = "Enter a valid name using letters, spaces, hyphens, or apostrophes (max 50 characters).";
            }
            if (String(guest.age ?? "").trim() === "") {
              nextErrors[`guest_${idx}_age`] = "Enter age.";
            } else if (!Number.isInteger(Number(guest.age)) || Number(guest.age) < 18 || Number(guest.age) > 120) {
              nextErrors[`guest_${idx}_age`] = "Adult guests must be between 18 and 120 years old.";
            }
            if (!guest.gender) {
              nextErrors[`guest_${idx}_gender`] = "Select gender.";
            }
          }
        }
      }
      const titleGenderError = getTitleGenderError(guest.title, guest.gender);
      if (titleGenderError && (guest.fullName?.trim() || guest.type === "child")) {
        nextErrors[`guest_${idx}_titleGender`] = titleGenderError;
      }
    });

    if (!agreedToAll) {
      nextErrors.agreedToAll = "Please review selection and check the agreement box to proceed.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    let isMounted = true;

    if (currentStep !== 2) return undefined;

    const loadHotelPromos = async () => {
      setIsLoadingCoupons(true);
      setIsLoadingOffers(true);

      try {
        const [couponsData, offersData] = await Promise.all([
          listAvailableHotelCoupons().catch(() => []),
          getFeaturedHotelOffers().catch(() => []),
        ]);

        if (isMounted) {
          const validCoupons = Array.isArray(couponsData) ? couponsData : [];
          const validOffers = Array.isArray(offersData) ? offersData : [];

          setAvailableCoupons(validCoupons.slice(0, 8));
          setFeaturedOffers(validOffers.slice(0, 8));
        }
      } catch (error) {
        console.error("Failed to load hotel coupons and offers", error);
        if (isMounted) {
          setAvailableCoupons([]);
          setFeaturedOffers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCoupons(false);
          setIsLoadingOffers(false);
        }
      }
    };

    loadHotelPromos();
    return () => { isMounted = false; };
  }, [currentStep]);

  const handleContinue = () => {
    if (!validateForm()) { 
      setFormError("Please correct the highlighted guest details."); 
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
      bookingFlowId: incomingState.bookingFlowId,
      guestTitle: guests[0]?.title || "Mr",
      guestGender: guests[0]?.gender || "",
      guestName: guests[0]?.fullName?.trim() || "Primary Guest", 
      guestEmail: guests[0]?.email?.trim() || "", 
      guestPhone: guests[0]?.mobile?.trim() || "", 
      guestAge: guests[0]?.age || "",
      guests, 
      agreedToTerms, 
      blockRoomResponse,
      currentStep,
      selectedMultiRooms,
      payableAmount: Math.max(0, finalPayable - (couponDiscount > 0 ? 0 : appliedDiscount)), 
      finalPayableAmount: Math.max(0, finalPayable - (couponDiscount > 0 ? 0 : appliedDiscount)),
      couponDiscount: couponDiscount > 0 ? couponDiscount : appliedDiscount,
      couponCode: couponCode.trim().toUpperCase(),
      appliedCouponCode: couponCode || "",
      fareSummary: { 
        baseFare: basePrice, 
        tax, 
        convenienceFee, 
        markup: markupValue, 
        couponDiscount: couponDiscount > 0 ? couponDiscount : appliedDiscount,
        discount: couponDiscount > 0 ? couponDiscount : appliedDiscount,
        tierDiscount: 0, 
        volumeDiscount: 0, 
        totalFare: Math.max(0, finalPayable - (couponDiscount > 0 ? 0 : appliedDiscount))
      } 
    };

    // Save in-progress state FIRST
    writeHotelBookingFlowState(payloadState);

    const currentParams = new URLSearchParams(location.search);
    currentParams.set("autoContinue", "true");
    const nextRoute = `/hotel/passenger-details?${currentParams.toString()}`;

    const authenticated = navigateWithAuth({
      navigate,
      location,
      nextRoute,
      bookingContext: { autoContinue: true, ...payloadState },
      bookingType: "hotel",
    });

    if (!authenticated) {
      return; 
    }

    setCheckoutPayload(payloadState);
    setIsModalOpen(true);
  };
  const handleApplyCoupon = async (overrideCode = couponCode) => {
    const nextCode = String(overrideCode || couponCode || "").trim();
    if (!nextCode) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const uppercaseCode = nextCode.toUpperCase();
      setCouponCode(uppercaseCode);

      const totalBeforeDiscount = (basePrice || 0) + (tax || 0);
      const activeCheckIn = offer?.checkInDate || checkInDate || searchContext?.checkInDate || hotel?.checkInDate || "";
      const formattedCheckIn = toYyyyMmDd(activeCheckIn);

      // 1. Look up in preloaded offers and coupons
      const matched = [...availableCoupons, ...featuredOffers].find(
        (c) => String(c.couponCode || "").toUpperCase() === uppercaseCode
      );

      // 2. Strict client-side condition validation
      if (matched) {
        const clientVal = validateOfferConditions(matched, {
          totalAmount: totalBeforeDiscount,
          checkInDate: formattedCheckIn || activeCheckIn,
        });

        if (!clientVal.isValid) {
          setAppliedDiscount(0);
          setCouponError(clientVal.message);
          return;
        }
      }

      // 3. Validate against backend endpoint
      let validatedDiscount = 0;
      let backendValidated = false;

      try {
        const valRes = await validateHotelCoupon({
          CouponCode: uppercaseCode,
          TotalAmount: totalBeforeDiscount,
          CheckInDate: formattedCheckIn || null,
        });

        if (valRes && valRes.isValid === false) {
          // Explicit backend rejection — do NOT bypass or calculate a discount!
          setAppliedDiscount(0);
          setCouponError(valRes.message || "Invalid hotel coupon or conditions not met.");
          return;
        }

        if (valRes && valRes.isValid) {
          validatedDiscount = Number(valRes.discountAmount || 0);
          backendValidated = true;
        }
      } catch (valErr) {
        const errMsg = String(valErr?.message || "");
        // If the server responded with an explicit domain error message, respect it and stop!
        const isNetworkOrAuthIssue =
          errMsg.toLowerCase().includes("failed to fetch") ||
          errMsg.toLowerCase().includes("networkerror") ||
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("unable to validate");

        if (!isNetworkOrAuthIssue && errMsg) {
          setAppliedDiscount(0);
          setCouponError(errMsg);
          return;
        }
      }

      // 4. If backend was unreachable or returned auth error, fallback to strictly verified matched offer discount
      if (!backendValidated && matched) {
        const recheck = validateOfferConditions(matched, {
          totalAmount: totalBeforeDiscount,
          checkInDate: formattedCheckIn || activeCheckIn,
        });

        if (!recheck.isValid) {
          setAppliedDiscount(0);
          setCouponError(recheck.message);
          return;
        }

        validatedDiscount = recheck.discountAmount;
      }

      if (validatedDiscount <= 0) {
        setAppliedDiscount(0);
        setCouponError("This coupon could not be applied to the current booking.");
        return;
      }

      setAppliedDiscount(validatedDiscount);

      // Re-trigger blockRoom with uppercaseCode
      try {
        await handleSelectOffer(offer, uppercaseCode);
      } catch (blockErr) {
        console.warn("blockRoom coupon update notice:", blockErr);
      }

      setCouponSuccess(`Coupon "${uppercaseCode}" applied! Check the breakdown below.`);
    } catch (err) {
      setAppliedDiscount(0);
      setCouponError(err.message || "Failed to apply coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCopyPromoCode = async (code) => {
    if (!code || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPromoCode(code);
      window.setTimeout(() => setCopiedPromoCode(""), 1800);
    } catch (error) {
      console.error("Unable to copy hotel promo code", error);
    }
  };

  const scrollPromotionCards = (scrollerRef, direction, totalCount) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cardWidth = scroller.clientWidth;
    if (!cardWidth) return;

    const cardsCount = totalCount || scroller.children?.length || Math.max(1, Math.round(scroller.scrollWidth / cardWidth));
    const currentScroll = scroller.scrollLeft;
    const currentIndex = Math.round(currentScroll / cardWidth);

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) {
      nextIndex = cardsCount - 1;
    } else if (nextIndex >= cardsCount) {
      nextIndex = 0;
    }

    scroller.scrollTo({
      left: nextIndex * cardWidth,
      behavior: "smooth",
    });
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setAppliedDiscount(0);
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
      const nextParams = new URLSearchParams(location.search);
      nextParams.set("autoStep2", "true");
      const nextRoute = `/hotel/passenger-details?${nextParams.toString()}`;
      
      const canProceed = navigateWithAuth({
        navigate,
        location,
        nextRoute,
        bookingContext: { hotel, offer, searchContext },
        bookingType: "hotel"
      });
      
      if (!canProceed) return;
    }
    setCurrentStep(step);
  };

  const guestSummary = `${roomsCount} Room${roomsCount > 1 ? "s" : ""}, ${totalAdults} Adult${totalAdults > 1 ? "s" : ""}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren > 1 ? "ren" : ""}` : ""}`;
  const stayLocation = hotel.address || [hotel.area, hotel.city].filter(Boolean).join(", ");
  return (
    <main className="hotel-checkout-page">

      <div className="hotel-checkout-shell">
        
        {/* Top bar removed as per user request */}

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
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", padding: "16px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "20px", background: "#fff", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
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
              <section className="hotel-panel" style={{ padding: "24px", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
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
                      onBlur={() => validateGuestField(0, "title")}
                      className={errors.guest_0_title || errors.guest_0_titleGender ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_title || errors.guest_0_titleGender)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_title || errors.guest_0_titleGender ? "1.5px solid red" : "1px solid #cbd5e1" }}
                    >
                      <option value="">Select</option>
                      <option value="Mr">Mr.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Dr">Dr.</option>
                    </select>
                    {errors.guest_0_title && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_title}</span>}
                    {errors.guest_0_titleGender && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_titleGender}</span>}
                  </div>

                  {/* Full Name */}
                  <div className="floating-field" style={{ gridColumn: "span 3" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Full Name <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={guests[0]?.fullName || ""}
                      onChange={(e) => updateGuest(0, "fullName", e.target.value)}
                      onBlur={() => validateGuestField(0, "fullName")}
                      className={errors.guest_0_fullName ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_fullName)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_fullName ? "1.5px solid red" : "1px solid #cbd5e1", textTransform: "capitalize" }}
                    />
                    {errors.guest_0_fullName && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_fullName}</span>}
                  </div>

                  {/* Gender */}
                  <div className="floating-field" style={{ gridColumn: "span 1" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Gender <span style={{ color: "red" }}>*</span></label>
                    <select
                      value={guests[0]?.gender || ""}
                      onChange={(e) => updateGuest(0, "gender", e.target.value)}
                      onBlur={() => validateGuestField(0, "gender")}
                      className={errors.guest_0_gender || errors.guest_0_titleGender ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_gender || errors.guest_0_titleGender)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_gender || errors.guest_0_titleGender ? "1.5px solid red" : "1px solid #cbd5e1" }}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.guest_0_gender && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_gender}</span>}
                    {errors.guest_0_titleGender && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_titleGender}</span>}
                  </div>

                  {/* Age */}
                  <div className="floating-field" style={{ gridColumn: "span 1" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Age <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="number"
                      placeholder="Age"
                      value={guests[0]?.age || ""}
                      onChange={(e) => updateGuest(0, "age", e.target.value)}
                      onBlur={() => validateGuestField(0, "age")}
                      className={errors.guest_0_age ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_age)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_age ? "1.5px solid red" : "1px solid #cbd5e1" }}
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
                      onBlur={() => validateGuestField(0, "email")}
                      className={errors.guest_0_email ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_email)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_email ? "1.5px solid red" : "1px solid #cbd5e1" }}
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
                      onBlur={() => validateGuestField(0, "mobile")}
                      className={errors.guest_0_mobile ? "is-error" : ""}
                      aria-invalid={Boolean(errors.guest_0_mobile)}
                      style={{ width: "100%", height: "42px", padding: "8px 12px", borderRadius: "10px", border: errors.guest_0_mobile ? "1.5px solid red" : "1px solid #cbd5e1" }}
                    />
                    {errors.guest_0_mobile && <span className="field-error" style={{ color: "red", fontSize: "0.72rem", display: "block", marginTop: "4px" }}>{errors.guest_0_mobile}</span>}
                  </div>

                </div>
              </section>

              {/* Optional Co-Traveler Details Dropdown */}
              {guests.length > 1 && (
                <section className="hotel-panel" style={{ padding: "0", borderRadius: "20px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <button
                    type="button"
                    onClick={() => setIsOtherGuestsOpen((current) => !current)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "20px 24px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Other Guest Details</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#475569",
                          background: "#f1f5f9",
                          borderRadius: "999px",
                          padding: "6px 12px",
                          lineHeight: 1,
                        }}
                      >
                        Optional
                      </span>
                      <span style={{ fontSize: "1.1rem", color: "#64748b", transform: isOtherGuestsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                        ▾
                      </span>
                    </span>
                  </button>

                  {isOtherGuestsOpen && (
                    <div style={{ padding: "0 24px 24px" }}>
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
                                  onBlur={() => validateGuestField(actualIdx, "title")}
                                  aria-invalid={Boolean(errors[`guest_${actualIdx}_title`] || errors[`guest_${actualIdx}_titleGender`])}
                                  style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_title`] || errors[`guest_${actualIdx}_titleGender`] ? "1.5px solid red" : "1px solid #cbd5e1" }}
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
                                {errors[`guest_${actualIdx}_title`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_title`]}</span>}
                                {errors[`guest_${actualIdx}_titleGender`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_titleGender`]}</span>}
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
                                  onBlur={() => validateGuestField(actualIdx, "fullName")}
                                  aria-invalid={Boolean(errors[`guest_${actualIdx}_fullName`])}
                                  style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_fullName`] ? "1.5px solid red" : "1px solid #cbd5e1", textTransform: "capitalize" }}
                                />
                                {errors[`guest_${actualIdx}_fullName`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_fullName`]}</span>}
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
                                  onBlur={() => validateGuestField(actualIdx, "age")}
                                  aria-invalid={Boolean(errors[`guest_${actualIdx}_age`])}
                                  style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_age`] ? "1.5px solid red" : "1px solid #cbd5e1" }}
                                />
                                {errors[`guest_${actualIdx}_age`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_age`]}</span>}
                              </div>
                              {guest.type === "adult" && (
                                <div>
                                  <label style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", fontWeight: 700, display: "block", marginBottom: "4px" }}>Gender</label>
                                  <select
                                    value={guest.gender || "Male"}
                                    onChange={(e) => updateGuest(actualIdx, "gender", e.target.value)}
                                    onBlur={() => validateGuestField(actualIdx, "gender")}
                                    aria-invalid={Boolean(errors[`guest_${actualIdx}_gender`] || errors[`guest_${actualIdx}_titleGender`])}
                                    style={{ width: "100%", height: "38px", padding: "6px 10px", borderRadius: "8px", border: errors[`guest_${actualIdx}_gender`] || errors[`guest_${actualIdx}_titleGender`] ? "1.5px solid red" : "1px solid #cbd5e1" }}
                                  >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  {errors[`guest_${actualIdx}_gender`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_gender`]}</span>}
                                  {errors[`guest_${actualIdx}_titleGender`] && <span className="field-error" style={{ color: "red", fontSize: "0.68rem", display: "block", marginTop: "4px" }}>{errors[`guest_${actualIdx}_titleGender`]}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}


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
                        {offer?.roomCategory ? offer.roomCategory.split(",")[0].trim().replace(/_/g, " ") : ""}
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
                      {guests[0]?.fullName ? `${guests[0].title || ""} ${guests[0].fullName}`.trim() : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "10px", marginTop: "4px" }}>
                    <span>💰 <strong>Total Amount:</strong></span>
                    <strong style={{ color: "#10b981", fontSize: "1rem" }}>{formatCurrency(Math.max(0, finalPayable - (couponDiscount > 0 ? 0 : appliedDiscount)))}</strong>
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

                {/* Hotel Cancellation Policy Section */}
                {offer && (
                  <div style={{ marginBottom: "16px" }}>
                    <CancellationPolicySection
                      booking={offer}
                      bookingType="hotel"
                      policyData={offer?.cancellationPolicies || offer?.cancellationPoliciesData}
                    />
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
                {agreedToAll && (
                  <div className="booking-action-buttons-row" style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <button
                        type="button"
                        className="hotel-primary-button"
                        style={{ minHeight: "44px", padding: "0 22px", borderRadius: "12px", fontWeight: 700, background: "var(--hotel-rose)" }}
                        onClick={handleContinue}
                      >
                        Continue to Payment →
                      </button>
                      {!hasValidToken && (
                        <span style={{ fontSize: "0.72rem", color: "var(--hotel-rose)", marginTop: "4px", fontWeight: 600 }}>
                          * Login mandatory to pay
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column Booking Sidebar */}
            <aside className="hotel-reserve-rail hotel-checkout-side" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Booking Summary Card */}
              <div className="hotel-reserve-card hotel-your-stay-card" style={{ background: "var(--hotel-surface)", borderRadius: "24px", border: "1px solid var(--hotel-border)", padding: "24px", boxShadow: "var(--hotel-shadow)" }}>
                <div className="hotel-your-stay-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Booking Summary</h3>
                </div>

                {(offer || hotel) && (
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
                        <span style={{ fontSize: "0.78rem", color: "var(--hotel-muted)" }}>📍 {[hotel.city, hotel.area].filter(Boolean).join(", ")}</span>
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
                            {offer?.roomCategory ? offer.roomCategory.split(",")[0].trim().replace(/_/g, " ") : ""}
                          </strong>
                          {offer?.roomCategory && offer.roomCategory.includes(",") && (
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
                      {(couponDiscount > 0 || appliedDiscount > 0) && (
                        <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#16a34a" }}>
                          <span>Coupon Discount {couponCode ? `(${couponCode})` : ""}</span>
                          <strong style={{ color: "#16a34a" }}>(-) {formatCurrency(couponDiscount > 0 ? couponDiscount : appliedDiscount)}</strong>
                        </div>
                      )}
                      <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--hotel-muted)" }}>
                        <span>Taxes & GST</span>
                        <strong style={{ color: "var(--hotel-ink)" }}>{formatCurrency(tax)}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Total Price</span>
                      <strong style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>
                        {formatCurrency(Math.max(0, finalPayable - (couponDiscount > 0 ? 0 : appliedDiscount)))}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* Coupons & Featured Offers */}
              {(!isAgent || activePortal !== "b2b") && (
                <article className="flow-card coupon-sheet-card hotel-coupon-sheet-card" style={{ marginBottom: "1rem" }}>
                  <header className="coupon-sheet-header">
                    <span className="header-icon-wrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </span>
                    <span className="coupon-sheet-header-title">
                      {(isLoadingCoupons || isLoadingOffers || isApplyingCoupon) && (
                        <span className="coupon-sheet-loading">Loading...</span>
                      )}
                      <span>Apply Coupon</span>
                    </span>
                  </header>
                  <div className="flow-card-body coupon-sheet-body">
                    <div className="coupon-manual-row">
                      <input
                        type="text"
                        placeholder="ENTER COUPON CODE"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={isApplyingCoupon}
                      />
                      {couponSuccess || couponDiscount > 0 ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          disabled={isApplyingCoupon}
                          className="coupon-action-button is-remove"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon(couponCode)}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="coupon-action-button is-apply"
                        >
                          {isApplyingCoupon ? "Applying..." : "APPLY"}
                        </button>
                      )}
                    </div>

                    {(couponError || couponSuccess) && (
                      <div className="coupon-feedback-group">
                        {couponError && (
                          <p className="coupon-sheet-message is-error">
                            {couponError}
                          </p>
                        )}
                        {couponSuccess && (
                          <p className="coupon-sheet-message is-success">
                            {couponSuccess}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── 1. Featured Offers Section ── */}
                    {featuredOffers.length > 0 && (
                      <div className="coupon-featured-block">
                        <p className="coupon-section-label">Featured Offers:</p>
                        <div className="coupon-carousel-frame">
                          {featuredOffers.length > 1 && (
                            <div className="coupon-carousel-controls">
                              <button
                                type="button"
                                onClick={() => scrollPromotionCards(featuredOffersScrollerRef, -1, featuredOffers.length)}
                                aria-label="Scroll featured offers left"
                                title="Previous offer"
                              >
                                <ChevronLeft size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollPromotionCards(featuredOffersScrollerRef, 1, featuredOffers.length)}
                                aria-label="Scroll featured offers right"
                                title="Next offer"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          )}
                          <div
                            className="coupon-featured-list"
                            ref={featuredOffersScrollerRef}
                            aria-label="Featured offers carousel"
                          >
                            {featuredOffers.map((offerItem) => {
                              const code = offerItem.couponCode || "";
                              const isThisSelected = Boolean(code) && couponCode.toUpperCase() === code.toUpperCase();
                              const anotherOfferSelected = Boolean(couponCode) && !isThisSelected;
                              const mainHeading = getOfferMainHeading(offerItem);
                              const subHeading = getPromotionSubHeading(offerItem);

                              return (
                                <div
                                  key={offerItem.id || code || offerItem.title}
                                  className={`coupon-voucher-card${isThisSelected ? " is-selected" : ""}${anotherOfferSelected ? " is-muted" : ""}`}
                                >
                                  {/* Top Row: Main Heading & "i" Info Icon */}
                                  <div className="voucher-card-top">
                                    <div className="voucher-main-heading">{mainHeading}</div>
                                    <button
                                      type="button"
                                      className="voucher-info-btn"
                                      title="View Details"
                                      aria-label="View offer details"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailModalItem({ ...offerItem, type: "offer" });
                                      }}
                                    >
                                      <Info size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>

                                  {/* Sub Heading */}
                                  <div className="voucher-sub-heading" title={subHeading}>
                                    {subHeading}
                                  </div>

                                  {/* Bottom Row */}
                                  <div className="voucher-bottom-row">
                                    <div className="voucher-code-wrapper">
                                      <span className="voucher-code-prefix">Code:</span>
                                      <span className="voucher-code-badge">{code || "OFFER"}</span>
                                      {code && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyPromoCode(code);
                                          }}
                                          className="voucher-copy-btn"
                                          title="Copy Coupon Code"
                                        >
                                          {copiedPromoCode === code ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                      )}
                                    </div>

                                    <div className="voucher-action-btn-wrap">
                                      {isThisSelected ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCoupon();
                                          }}
                                          disabled={isApplyingCoupon}
                                          className="voucher-remove-btn"
                                        >
                                          Remove
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplyCoupon(code);
                                          }}
                                          disabled={isApplyingCoupon}
                                          className="voucher-apply-btn"
                                        >
                                          <span>APPLY</span>
                                          <Sparkles size={11} style={{ marginLeft: "4px" }} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── 2. Available Coupons Section ── */}
                    {availableCoupons.length > 0 && (
                      <div className="coupon-chip-block">
                        <p className="coupon-section-label">Available Coupons:</p>
                        <div className="coupon-carousel-frame">
                          {availableCoupons.length > 1 && (
                            <div className="coupon-carousel-controls">
                              <button
                                type="button"
                                onClick={() => scrollPromotionCards(couponScrollerRef, -1, availableCoupons.length)}
                                aria-label="Scroll available coupons left"
                                title="Previous coupon"
                              >
                                <ChevronLeft size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollPromotionCards(couponScrollerRef, 1, availableCoupons.length)}
                                aria-label="Scroll available coupons right"
                                title="Next coupon"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          )}
                          <div
                            className="coupon-chip-list"
                            ref={couponScrollerRef}
                            aria-label="Available coupons carousel"
                          >
                            {availableCoupons.map((couponItem, idx) => {
                              const code = couponItem.couponCode || `Promo #${couponItem.id || idx}`;
                              const isThisSelected = Boolean(code) && couponCode.toUpperCase() === code.toUpperCase();
                              const anotherOfferSelected = Boolean(couponCode) && !isThisSelected;
                              const mainHeading = getCouponMainHeading(couponItem);
                              const subHeading = getPromotionSubHeading(couponItem);

                              return (
                                <div
                                  key={couponItem.id || code || idx}
                                  className={`coupon-voucher-card${isThisSelected ? " is-selected" : ""}${anotherOfferSelected ? " is-muted" : ""}`}
                                >
                                  {/* Top Row: Main Heading & "i" Info Icon */}
                                  <div className="voucher-card-top">
                                    <div className="voucher-main-heading">{mainHeading}</div>
                                    <button
                                      type="button"
                                      className="voucher-info-btn"
                                      title="View Details"
                                      aria-label="View coupon details"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailModalItem({ ...couponItem, type: "coupon" });
                                      }}
                                    >
                                      <Info size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>

                                  {/* Sub Heading */}
                                  <div className="voucher-sub-heading" title={subHeading}>
                                    {subHeading}
                                  </div>

                                  {/* Bottom Row */}
                                  <div className="voucher-bottom-row">
                                    <div className="voucher-code-wrapper">
                                      <span className="voucher-code-prefix">Code:</span>
                                      <span className="voucher-code-badge">{code}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyPromoCode(code);
                                        }}
                                        className="voucher-copy-btn"
                                        title="Copy Coupon Code"
                                      >
                                        {copiedPromoCode === code ? <Check size={12} /> : <Copy size={12} />}
                                      </button>
                                    </div>

                                    <div className="voucher-action-btn-wrap">
                                      {isThisSelected ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCoupon();
                                          }}
                                          disabled={isApplyingCoupon}
                                          className="voucher-remove-btn"
                                        >
                                          Remove
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplyCoupon(code);
                                          }}
                                          disabled={isApplyingCoupon}
                                          className="voucher-apply-btn"
                                        >
                                          <span>APPLY</span>
                                          <Sparkles size={11} style={{ marginLeft: "4px" }} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )}
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
          onSuccess={async (res) => {
            if (res.paymentMethod === "Wallet" || res.paymentMethod === "Agent Wallet") {
              try {
                const { guestName, guestPhone, guestEmail, blockRoomResponse, hotel, offer, checkInDate, checkOutDate } = checkoutPayload;
                const firstName = guestName?.split(" ")[0] || "";
                const lastName = guestName?.split(" ").slice(1).join(" ") || "";
                const cleanPhone = String(guestPhone || "9876543210").replace(/\D/g, "").slice(-10);
                const cleanEmail = String(guestEmail || "guest@gopickandbook.in").trim();
                
                const rawCheckIn = offer?.checkInDate || checkoutPayload.searchContext?.checkInDate || checkInDate || "";
                const rawCheckOut = offer?.checkOutDate || checkoutPayload.searchContext?.checkOutDate || checkOutDate || "";
                const checkInStr = typeof rawCheckIn === "string" ? rawCheckIn.split("T")[0] : "";
                const checkOutStr = typeof rawCheckOut === "string" ? rawCheckOut.split("T")[0] : "";

                const totalPayable = checkoutPayload?.payableAmount || checkoutPayload?.finalPayableAmount || 0;

                const blockedRoom = blockRoomResponse?.BlockRoomResult?.HotelRoomsDetails?.[0] || 
                                    blockRoomResponse?.blockRoomResult?.hotelRoomsDetails?.[0] || 
                                    blockRoomResponse?.HotelRoomsDetails?.[0] || {};
                const cancelPolicies = blockedRoom?.CancellationPolicies || blockedRoom?.cancellationPolicies || offer?.cancellationPoliciesData || [];
                const lastCancellationDate = blockedRoom?.LastCancellationDate || blockedRoom?.lastCancellationDate || "";

                const bookPayload = {
                  CheckInDate: checkInStr,
                  CheckOutDate: checkOutStr,
                  checkInDate: checkInStr,
                  checkOutDate: checkOutStr,
                  TraceId: String(blockRoomResponse?.TraceId || blockRoomResponse?.traceId || hotel?.TraceId || ""),
                  ResultIndex: String(hotel?.ResultIndex || ""),
                  SrdvType: String(hotel?.SrdvType || "MixAPI"),
                  SrdvIndex: String(hotel?.SrdvIndex || ""),
                  HotelCode: String(hotel?.hotelId || hotel?.hotelCode || ""),
                  HotelName: hotel?.name || "",
                  GuestNationality: "IN",
                  NoOfRooms: 1,
                  ClientReferenceNo: 0,
                  IsVoucherBooking: true,
                  GuestName: `${firstName} ${lastName}`.trim(),
                  GuestTitle: checkoutPayload.guestTitle || "Mr",
                  GuestGender: checkoutPayload.guestGender || "Male",
                  GuestAge: Number(checkoutPayload.guestAge) || 30,
                  GuestEmail: String(checkoutPayload.guestEmail || "").trim(),
                  GuestPhone: String(checkoutPayload.guestPhone || "").trim(),
                  CouponCode: checkoutPayload.couponCode || checkoutPayload.appliedCouponCode || "",
                  Price: Number(totalPayable || 0),
                  EndUserIp: "192.168.10.10",
                  PaymentMethod: res.paymentMethod,
                  HotelRoomsDetails: [
                    {
                      RoomIndex: "1",
                      RoomTypeCode: String(offer?.roomTypeCode || offer?.RoomTypeCode || "1"),
                      RoomTypeName: offer?.roomCategory || offer?.roomTypeName || "Room",
                      RatePlanCode: offer?.ratePlanCode || offer?.RatePlanCode || "",
                      LastCancellationDate: lastCancellationDate,
                      CancellationPolicies: cancelPolicies,
                      HotelPassenger: [
                        {
                          Title: checkoutPayload.guestTitle || "Mr",
                          FirstName: firstName,
                          LastName: lastName || firstName,
                          Phoneno: cleanPhone,
                          Email: cleanEmail,
                          PaxType: "1",
                          Age: Number(checkoutPayload.guestAge) || 30,
                          LeadPassenger: true
                        }
                      ]
                    }
                  ]
                };
                
                const bookRes = await bookHotelRoom(bookPayload);
                clearHotelBookingFlowState();
                navigate("/ticket/confirmation", { state: bookRes.response || bookRes.Response || bookRes, replace: true });
              } catch (err) {
                console.error("Hotel Booking failed", err);
                alert("Hotel Booking failed: " + (err.response?.data?.message || err.message));
                setIsModalOpen(false);
              }
            } else {
              clearHotelBookingFlowState();
              navigate("/ticket/confirmation", { state: checkoutPayload, replace: true });
            }
          }} 
        />
      )}
      {/* ── Detail Information Modal when "i" icon is clicked ── */}
      {detailModalItem && typeof document !== "undefined" && createPortal(
        <div
          className="coupon-info-modal-backdrop"
          role="presentation"
          onClick={() => setDetailModalItem(null)}
        >
          <div
            className="coupon-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="coupon-info-header">
              <span className="coupon-info-header-badge">
                {detailModalItem.type === "offer" ? "FEATURED OFFER" : "COUPON DETAILS"}
              </span>
              <button
                type="button"
                className="coupon-info-close-btn"
                onClick={() => setDetailModalItem(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </header>

            <div className="coupon-info-body">
              <div className="coupon-info-main-badge">
                {detailModalItem.type === "offer"
                  ? getOfferMainHeading(detailModalItem)
                  : getCouponMainHeading(detailModalItem)}
              </div>

              <h3 id="coupon-info-title" className="coupon-info-title">
                {detailModalItem.title || detailModalItem.Title || detailModalItem.couponCode}
              </h3>

              {/* Promo code box with copy button */}
              <div className="coupon-info-code-row">
                <div className="coupon-info-code-chip">
                  <span className="code-label">Coupon Code:</span>
                  <code className="code-val">{detailModalItem.couponCode || "OFFER"}</code>
                </div>
                <button
                  type="button"
                  className="coupon-info-copy-btn"
                  onClick={() => {
                    const codeToCopy = detailModalItem.couponCode || "OFFER";
                    handleCopyPromoCode(codeToCopy);
                  }}
                >
                  {copiedPromoCode === (detailModalItem.couponCode || "OFFER") ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Code
                    </>
                  )}
                </button>
              </div>

              {/* Important details grid */}
              <div className="coupon-info-details-grid">
                <div className="coupon-info-detail-item">
                  <span className="detail-item-label">Discount Benefit</span>
                  <span className="detail-item-value highlight">
                    {detailModalItem.discountValue
                      ? (detailModalItem.isPercentageDiscount
                        ? `${detailModalItem.discountValue}% OFF`
                        : `₹${detailModalItem.discountValue} OFF`)
                      : detailModalItem.value
                        ? `₹${detailModalItem.value} OFF`
                        : (detailModalItem.type === "offer"
                          ? getOfferMainHeading(detailModalItem)
                          : getCouponMainHeading(detailModalItem))}
                  </span>
                </div>

                {(detailModalItem.minBookingAmount || detailModalItem.minAmount) && (
                  <div className="coupon-info-detail-item">
                    <span className="detail-item-label">Min Booking Amount</span>
                    <span className="detail-item-value">
                      ₹{detailModalItem.minBookingAmount || detailModalItem.minAmount}
                    </span>
                  </div>
                )}

                {(detailModalItem.maxDiscountAmount || detailModalItem.maxDiscount) && (
                  <div className="coupon-info-detail-item">
                    <span className="detail-item-label">Max Discount</span>
                    <span className="detail-item-value">
                      ₹{detailModalItem.maxDiscountAmount || detailModalItem.maxDiscount}
                    </span>
                  </div>
                )}

                {(detailModalItem.validTill || detailModalItem.expiryDate) && (
                  <div className="coupon-info-detail-item">
                    <span className="detail-item-label">Valid Till</span>
                    <span className="detail-item-value">
                      {new Date(
                        detailModalItem.validTill || detailModalItem.expiryDate
                      ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              {(detailModalItem.description || detailModalItem.subtitle || detailModalItem.remark) && (
                <div className="coupon-info-terms-box">
                  <h4 className="terms-title">Terms & Conditions:</h4>
                  <ul className="terms-list">
                    {(detailModalItem.description || detailModalItem.subtitle || detailModalItem.remark)
                      .split(/[•\n]+/)
                      .map((term) => term.trim())
                      .filter(Boolean)
                      .map((term, tIdx) => (
                        <li key={tIdx}>{term}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="coupon-info-footer">
              <button
                type="button"
                className="coupon-info-apply-btn"
                onClick={() => {
                  handleApplyCoupon(detailModalItem.couponCode);
                  setDetailModalItem(null);
                }}
                disabled={isApplyingCoupon}
              >
                {isApplyingCoupon ? "Applying..." : "Apply This Offer"}
              </button>
            </footer>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}