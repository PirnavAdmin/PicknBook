import React, { useMemo, useState, useEffect } from "react";
import { Info, Ticket, Tag, Mail, Phone, Check, X, Shield, ArrowRight, ShieldCheck, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/FlightBookingFlow.css";
import BookingTimer from "./BookingTimer";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getFlightPricingPreview, getFlightPromotions, bookFlight, listFlightCoupons } from "../../services/flightBookingService";
import { toApiUrl } from "../../services/apiClient";
import { listTravelers, normalizeTraveler } from "../../services/travelerService";

const TRAVELER_STORAGE_KEY = "my_traveler_data";

function yyyyMmDdToDdMmYyyy(val) {
  if (!val) return "";
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return val;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function ddMmYyyyToYyyyMmDd(val) {
  if (!val) return "";
  const match = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return val;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function resolveCleanTravelClass(travelClass) {
  if (!travelClass || typeof travelClass !== "string") {
    return "Economy";
  }
  const clean = travelClass.toLowerCase();
  if (clean.includes("premium economy")) return "Premium Economy";
  if (clean.includes("premium business")) return "Premium Business";
  if (clean.includes("economy")) return "Economy";
  if (clean.includes("business")) return "Business";
  if (clean.includes("first")) return "First Class";
  return travelClass;
}

function formatDobInput(value) {
  const digits = value.replace(/\D/g, "");
  let formatted = "";
  if (digits.length > 0) {
    formatted += digits.slice(0, 2);
  }
  if (digits.length > 2) {
    formatted += "/" + digits.slice(2, 4);
  }
  if (digits.length > 4) {
    formatted += "/" + digits.slice(4, 8);
  }
  return formatted;
}

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

function parseTravellerSummary(summary) {
  const text = String(summary || "");
  const adults = Number((text.match(/(\d+)\s*Adult/i) || [])[1] || 1);
  const children = Number((text.match(/(\d+)\s*Child/i) || [])[1] || 0);
  const infants = Number((text.match(/(\d+)\s*Infant/i) || [])[1] || 0);

  return {
    adults,
    children,
    infants,
  };
}

function buildPassengerSeed(selectedSeats, travellerCounts, existingPassengers) {
  if (Array.isArray(existingPassengers) && existingPassengers.length > 0) {
    return existingPassengers.map(p => ({
      ...p,
      specialAssistance: p.specialAssistance || []
    }));
  }

  const seatLabels = Array.isArray(selectedSeats)
    ? selectedSeats.map((seat) => seat?.label || "")
    : [];

  const passengers = [];
  let seatIndex = 0;

  for (let index = 0; index < travellerCounts.adults; index += 1) {
    passengers.push({
      id: `adult-${index + 1}`,
      passengerType: "Adult",
      title: "",
      firstName: "",
      lastName: "",
      nationality: "",
      dob: "",
      seatLabel: seatLabels[seatIndex] || "",
      specialAssistance: [],
    });
    seatIndex += 1;
  }

  for (let index = 0; index < travellerCounts.children; index += 1) {
    passengers.push({
      id: `child-${index + 1}`,
      passengerType: "Child",
      title: "",
      firstName: "",
      lastName: "",
      nationality: "",
      dob: "",
      seatLabel: seatLabels[seatIndex] || "",
      specialAssistance: [],
    });
    seatIndex += 1;
  }

  for (let index = 0; index < travellerCounts.infants; index += 1) {
    passengers.push({
      id: `infant-${index + 1}`,
      passengerType: "Infant",
      title: "",
      firstName: "",
      lastName: "",
      nationality: "",
      dob: "",
      seatLabel: "",
      specialAssistance: [],
    });
  }

  return passengers;
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  return digits.length === 10;
}

function isPassengerValid(passenger) {
  return (
    passenger.title &&
    String(passenger.firstName || "").trim() &&
    String(passenger.lastName || "").trim() &&
    String(passenger.nationality || "").trim() &&
    String(passenger.dob || "").trim()
  );
}

export default function FlightPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const b2bToken = localStorage.getItem("b2b_token");
  const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
  const isAgent = b2bToken && b2bRole === "agent";

  const flight = flowState.flight || null;
  const selectedSeats = flowState.selectedSeats || [];
  const searchContext = flowState.searchContext || null;
  const travellers = parseTravellerSummary(searchContext?.travellers);

  const [passengers, setPassengers] = useState(() =>
    buildPassengerSeed(selectedSeats, travellers, flowState.passengers)
  );

  const filledPassengers = useMemo(() => {
    return passengers.filter(p => p.firstName.trim() || p.lastName.trim());
  }, [passengers]);
  const [contact, setContact] = useState(() => ({
    email: flowState.contact?.email || "",
    mobile: flowState.contact?.mobile || "",
    whatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    whatsappNumber: flowState.contact?.whatsappNumber || "",
  }));

  const [couponCode, setCouponCode] = useState(flowState.couponCode || "");
  const [selectedFeaturedOfferId, setSelectedFeaturedOfferId] = useState(flowState.selectedFeaturedOfferId || null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [specialAssistance, setSpecialAssistance] = useState(
    flowState.specialAssistance || ""
  );
  const [activePassengerIndexForAssistance, setActivePassengerIndexForAssistance] = useState(null);
  const [tempAssistance, setTempAssistance] = useState([]);
  const [isAssistanceDrawerOpen, setIsAssistanceDrawerOpen] = useState(false);

  const ASSISTANCE_OPTIONS = [
    { value: "Person with intellectual or developmental disability (DPNA)", label: "Person with intellectual or developmental disability (DPNA)" },
    { value: "Speech impaired", label: "Speech impaired" },
    { value: "Visually impaired (BLND)", label: "Visually impaired (BLND)" },
    { value: "Hearing impaired (DEAF)", label: "Hearing impaired (DEAF)" },
    { value: "Wheelchair (WCHR/WCHS/WCHC)", label: "Wheelchair (WCHR/WCHS/WCHC)" },
  ];

  const compileCombinedSpecialAssistance = (updatedPassengers) => {
    const list = [];
    updatedPassengers.forEach((p, idx) => {
      if (p.specialAssistance && p.specialAssistance.length > 0) {
        list.push(`Passenger ${idx + 1}: ${p.specialAssistance.join(", ")}`);
      }
    });
    return list.join("; ");
  };

  const handleOpenSpecialAssistance = (index) => {
    setActivePassengerIndexForAssistance(index);
    setTempAssistance(passengers[index].specialAssistance || []);
    setIsAssistanceDrawerOpen(true);
  };

  const handleToggleAssistanceOption = (val) => {
    setTempAssistance(prev => {
      if (prev.includes(val)) {
        return prev.filter(x => x !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleSaveSpecialAssistance = () => {
    if (activePassengerIndexForAssistance !== null) {
      const updatedPassengers = passengers.map((p, idx) => {
        if (idx === activePassengerIndexForAssistance) {
          return { ...p, specialAssistance: tempAssistance };
        }
        return p;
      });
      setPassengers(updatedPassengers);
      const compiled = compileCombinedSpecialAssistance(updatedPassengers);
      setSpecialAssistance(compiled);
    }
    setIsAssistanceDrawerOpen(false);
    setActivePassengerIndexForAssistance(null);
  };
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(flowState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAssuredModal, setShowAssuredModal] = useState(false);
  const [tripSecureAdded, setTripSecureAdded] = useState(
    flowState.tripSecureAdded !== undefined ? Boolean(flowState.tripSecureAdded) : true
  );

  const [passengerModes, setPassengerModes] = useState(() =>
    passengers.map(() => false)
  );
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

  const setPassengerMode = (index, isExisting) => {
    setPassengerModes((prev) =>
      prev.map((mode, i) => (i === index ? isExisting : mode))
    );
    setPassengers((prev) =>
      prev.map((passenger, i) => {
        if (i !== index) return passenger;
        return {
          ...passenger,
          selectedTravelerId: "",
          title: "",
          firstName: "",
          lastName: "",
          nationality: "",
          dob: "",
        };
      })
    );
  };

  const handleSelectExistingTraveler = (index, travelerId) => {
    if (!travelerId) {
      setPassengers((prev) =>
        prev.map((passenger, i) =>
          i === index
            ? {
                ...passenger,
                selectedTravelerId: "",
                firstName: "",
                lastName: "",
                dob: "",
              }
            : passenger
        )
      );
      return;
    }

    const found = savedTravelers.find((t) => String(t.id) === travelerId);
    if (!found) return;

    setPassengers((prev) =>
      prev.map((passenger, i) =>
        i === index
          ? {
              ...passenger,
              selectedTravelerId: travelerId,
              title: found.title || "Mr",
              firstName: found.firstName || "",
              lastName: found.lastName || "",
              nationality: found.country || "",
              dob: yyyyMmDdToDdMmYyyy(found.dobInput) || "",
            }
          : passenger
      )
    );
  };

  // Load available coupons and featured offers on mount
  useEffect(() => {
    const normalizeCoupon = (c) => {
      const code = (c.couponCode || c.CouponCode || c.code || c.Code || c.name || c.Name || "").toString().toUpperCase();
      const val = Number(c.value || c.Value || c.discountValue || c.DiscountValue || 0);
      const type = (c.couponType || c.CouponType || c.cpnType || c.CpnType || c.discountType || c.DiscountType || "Percentage").toString();
      const status = (c.status || c.Status || "").toString().toLowerCase();
      const isActive = c.isActive === true || c.isActive === 1 || String(c.isActive).toLowerCase() === "true" || status === "active" || status === "" || c.isActive === undefined;
      return {
        couponCode: code,
        value: val,
        couponType: type,
        status: status,
        isActive: isActive
      };
    };

    async function loadPromoData() {
      try {
        let backendPromos = [];
        let adminCoupons = [];

        // 1. Fetch from public promotions (backend)
        try {
          const promos = await getFlightPromotions();
          console.log("Loaded flight promotions from backend:", promos);
          backendPromos = (Array.isArray(promos) ? promos : []).map(normalizeCoupon);
        } catch (err) {
          console.error("Failed to load flight promotions from backend", err);
        }

        // 2. Fetch from admin coupons (admin)
        try {
          const coupons = await listFlightCoupons();
          console.log("Loaded flight coupons from admin:", coupons);
          adminCoupons = (Array.isArray(coupons) ? coupons : []).map(normalizeCoupon);
        } catch (err) {
          console.error("Failed to load flight coupons from admin (expected for regular users)", err);
        }

        // 3. Merge results
        const mergedMap = new Map();

        backendPromos.forEach(c => {
          if (c.couponCode) {
            mergedMap.set(c.couponCode, c);
          }
        });

        adminCoupons.forEach(c => {
          if (c.couponCode) {
            mergedMap.set(c.couponCode, c);
          }
        });

        const mergedCoupons = Array.from(mergedMap.values()).filter(c => c.isActive);
        console.log("Final merged available coupons list:", mergedCoupons);
        setAvailableCoupons(mergedCoupons);
        
        const response = await fetch(toApiUrl("/api/FeaturedOffers"), {
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true"
          }
        });
        const offersData = await response.json();
        if (offersData && Array.isArray(offersData.offers)) {
          setFeaturedOffers(offersData.offers.filter(o => o.bookingType === "Flight" && o.isActive));
        }
      } catch (err) {
        console.error("Failed to load flight coupons and offers", err);
      }
    }
    loadPromoData();
  }, []);

  // Sync pricing preview from backend
  const loadPricing = async (code = "", offerId = null) => {
    if (!flight) return;
    setIsApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const passengerCount = travellers.adults + travellers.children;
      const payload = {
        flightId: flight.id,
        travelClass: flight.className || searchContext?.cabinClass || "Economy",
        tripType: searchContext?.tripType || "OneWay",
        passengerCount,
        couponCode: null, // do NOT pass code here to prevent server error in pricing-preview
        selectedFeaturedOfferId: offerId || null
      };

      let pricing;
      try {
        pricing = await getFlightPricingPreview(payload);
      } catch (err) {
        console.warn("Pricing preview endpoint failed/not found, using local fare summary fallback:", err);
        pricing = {
          baseFare: baseFare,
          tax: tax,
          convenienceFee: convenienceFee,
          markup: markup,
          totalFare: preservedTotal,
          couponDiscount: 0,
          promotionDiscount: 0
        };
      }

      if (code) {
        const uppercaseCode = code.trim().toUpperCase();
        const foundCoupon = availableCoupons.find(c => c.couponCode === uppercaseCode);
        if (foundCoupon) {
          let discount = 0;
          const fareTotal = pricing.totalFare || (pricing.baseFare + pricing.tax + pricing.convenienceFee);
          if (foundCoupon.couponType.toLowerCase().includes("percentage")) {
            discount = Math.round((pricing.baseFare || fareTotal) * (foundCoupon.value / 100));
          } else {
            discount = foundCoupon.value;
          }

          if (discount > 0) {
            const localPricing = {
              ...pricing,
              couponDiscount: discount,
              totalFare: Math.max(0, (pricing.totalFare || fareTotal) - discount)
            };
            setPricingBreakdown(localPricing);
            setCouponSuccess(`Coupon "${uppercaseCode}" applied! Discount: ${formatCurrency(discount)}`);
            setCouponCode(uppercaseCode);
            setSelectedFeaturedOfferId(null);
          } else {
            setPricingBreakdown(pricing);
            setCouponError("Coupon is valid but offers no discount for this booking.");
          }
        } else {
          setPricingBreakdown(pricing);
          setCouponError("Invalid or expired coupon code.");
          setCouponCode("");
        }
      } else if (offerId) {
        setPricingBreakdown(pricing);
        const disc = pricing.couponDiscount > 0 ? pricing.couponDiscount : pricing.promotionDiscount;
        if (disc > 0) {
          setCouponSuccess(`Offer applied successfully! Discount: ${formatCurrency(disc)}`);
          setSelectedFeaturedOfferId(offerId);
          setCouponCode("");
        } else {
          setCouponError("Offer is valid but offers no discount for this booking.");
        }
      } else {
        setPricingBreakdown(pricing);
      }
    } catch (err) {
      console.error(err);
      setCouponError(err.message || "Unable to validate coupon / offer.");
      setCouponCode("");
      setSelectedFeaturedOfferId(null);
      // fallback calculation
      setPricingBreakdown(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    loadPricing(couponCode.trim().toUpperCase(), null);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    setPricingBreakdown(null);
    setFormError("");
  };

  const handleSelectOffer = (offerId) => {
    loadPricing("", offerId);
  };

  const handleRemoveOffer = () => {
    setSelectedFeaturedOfferId(null);
    setCouponSuccess("");
    setCouponError("");
    setPricingBreakdown(null);
  };

  if (!flight) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Flight selection missing</h2>
            <p>Select a flight before filling traveller details.</p>
            <button type="button" onClick={() => navigate("/search/flights")}>Back to Flight Search</button>
          </section>
        </div>
      </main>
    );
  }

  const updatePassenger = (index, field, value) => {
    setPassengers((previous) =>
      previous.map((passenger, passengerIndex) =>
        passengerIndex === index ? { ...passenger, [field]: value } : passenger
      )
    );
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`passenger_${index}_${field}`];
      return copy;
    });
  };

  const preservedFareSummary = flowState.fareSummary || {};
  const baseFare = Number(preservedFareSummary.baseFare || 0);
  const tax = Number(preservedFareSummary.tax || 0);
  const convenienceFee = Number(preservedFareSummary.convenienceFee || 0);
  const markup = Number(preservedFareSummary.markup || 0);
  const totalDiscount = pricingBreakdown
    ? Number(pricingBreakdown.promotionDiscount || 0) +
      Number(pricingBreakdown.couponDiscount || 0)
    : Number(preservedFareSummary.discount || flowState.couponDiscount || 0);
  const preservedTotal =
    Number(preservedFareSummary.totalFare || 0) ||
    baseFare + tax + convenienceFee + markup;
  const tripSecureFee = tripSecureAdded ? 249 * passengers.length : 0;
  const finalPayable = Math.max(0, preservedTotal - totalDiscount) + tripSecureFee;
  const isPassengerValid = (p) => p.title && p.firstName && p.lastName && p.nationality && p.dob;
  const allPassengersValid = passengers.every(isPassengerValid);

  const validateForm = () => {
    const newErrors = {};
    passengers.forEach((p, idx) => {
      if (!p.title) newErrors[`passenger_${idx}_title`] = "Required";
      if (!p.firstName || !p.firstName.trim()) newErrors[`passenger_${idx}_firstName`] = "Required";
      if (!p.lastName || !p.lastName.trim()) newErrors[`passenger_${idx}_lastName`] = "Required";
      if (!p.nationality || !p.nationality.trim()) newErrors[`passenger_${idx}_nationality`] = "Required";
      
      if (!p.dob || !p.dob.trim()) {
        newErrors[`passenger_${idx}_dob`] = "Required";
      } else {
        const parts = p.dob.split("/");
        if (parts.length !== 3 || p.dob.length !== 10) {
          newErrors[`passenger_${idx}_dob`] = "Format: DD/MM/YYYY";
        } else {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          const dateObj = new Date(year, month - 1, day);
          const isValidDate = dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day;
          const currentYear = new Date().getFullYear();
          if (!isValidDate || year < currentYear - 120 || year > currentYear) {
            newErrors[`passenger_${idx}_dob`] = "Invalid Date";
          }
        }
      }
    });

    if (!contact.email || !contact.email.trim()) {
      newErrors.contact_email = "Required";
    } else if (!isValidEmail(contact.email)) {
      newErrors.contact_email = "Invalid";
    }

    if (!contact.mobile || !contact.mobile.trim()) {
      newErrors.contact_mobile = "Required";
    } else if (!isValidMobile(contact.mobile)) {
      newErrors.contact_mobile = "Invalid";
    }

    if (contact.whatsappUpdates) {
      const waNum = contact.whatsappNumber || contact.mobile;
      if (!waNum || !waNum.trim()) {
        newErrors.contact_whatsappNumber = "Required";
      } else if (!isValidMobile(waNum)) {
        newErrors.contact_whatsappNumber = "Invalid";
      }
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

    const b2bToken = localStorage.getItem("b2b_token");
    const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
    const isAgent = b2bToken && b2bRole === "agent";

    if (!isAgent) {
      const token = localStorage.getItem("token");
      if (!token || isTokenExpired(token)) {
        openAuthModal("login");
        return;
      }
    }

    setFormError("");
    setShowReviewModal(true);
  };

  const handleConfirmReview = () => {
    setShowReviewModal(false);
    setShowAssuredModal(true);
  };

  const handleSelectAssured = async (secured) => {
    setShowAssuredModal(false);
    
    const count = passengers.length;
    const assuredFee = secured ? 1649 * count : 0;
    
    const finalFareSummary = {
      baseFare,
      seatSurcharge: flowState.fareSummary?.seatSurcharge || 0,
      mealFee: flowState.fareSummary?.mealFee || 0,
      baggageFee: flowState.fareSummary?.baggageFee || 0,
      tax,
      markup,
      convenienceFee,
      discount: totalDiscount,
      assuredFee,
      tripSecureFee,
      totalFare: finalPayable + assuredFee,
    };
    
    const payload = {
      ...flowState,
      passengers,
      contact,
      specialAssistance,
      couponCode: couponCode.trim().toUpperCase(),
      selectedFeaturedOfferId,
      couponDiscount: totalDiscount,
      agreedToTerms,
      payableAmount: finalPayable + assuredFee,
      fareSummary: finalFareSummary,
      assuredSecured: secured,
      tripSecureAdded,
      tripSecureFee,
    };

    setIsApplying(true);
    setFormError("");

    try {
      const bookingPayload = {
        passengerName: passengers[0]?.firstName ? `${passengers[0].title || "Mr"} ${passengers[0].firstName} ${passengers[0].lastName || ""}`.trim() : "Passenger",
        passengerPhone: String(contact?.mobile || "").trim(),
        passengerEmail: String(contact?.email || "").trim(),
        travelClass: resolveCleanTravelClass(flight?.selectedTravelClass || flight?.className || searchContext?.cabinClass || "Economy"),
        passengers: passengers.map((p, idx) => ({
          fullName: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`.replace(/\s+/g, " ").trim() || `Passenger ${idx + 1}`,
          passengerType: p.passengerType || "Adult",
          gender: p.gender || "Male",
          nationality: p.nationality || "Indian",
          ...(p.dob ? { dob: ddMmYyyyToYyyyMmDd(p.dob) } : {}),
        })),
        couponCode: couponCode.trim().toUpperCase() || null,
        selectedFeaturedOfferId: selectedFeaturedOfferId || null,
        selectedPromotionId: selectedFeaturedOfferId || null,
        adults: passengers.filter(p => p.passengerType === "Adult").length || 1,
        children: passengers.filter(p => p.passengerType === "Child").length || 0,
        infants: passengers.filter(p => p.passengerType === "Infant").length || 0,
      };

      await bookFlight({
        flightId: flight.id,
        payload: bookingPayload,
      });

      writeFlightBookingFlowState(payload);
      navigate("/flight/seats", { state: payload });
    } catch (error) {
      console.error("Booking validation failed:", error);
      setFormError(error.message || "Failed to validate booking. Please check coupon and details.");
    } finally {
      setIsApplying(false);
    }
  };

  const renderPassengerFields = (passenger, index) => (
    <div className="passenger-fields flight-passenger-fields">
      <label className="passenger-field">
        <span>Title *</span>
        <select
          value={passenger.title || ""}
          onChange={(event) => updatePassenger(index, "title", event.target.value)}
          className={errors[`passenger_${index}_title`] ? "field-has-error" : ""}
        >
          <option value="">Title *</option>
          <option value="Mr">Mr</option>
          <option value="Mrs">Mrs</option>
          <option value="Ms">Ms</option>
        </select>
        {errors[`passenger_${index}_title`] && (
          <span className="field-error-text">{errors[`passenger_${index}_title`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>First Name *</span>
        <input
          type="text"
          placeholder="First Name *"
          value={passenger.firstName}
          onChange={(event) =>
            updatePassenger(index, "firstName", event.target.value)
          }
          className={errors[`passenger_${index}_firstName`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_firstName`] && (
          <span className="field-error-text">{errors[`passenger_${index}_firstName`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Last Name *</span>
        <input
          type="text"
          placeholder="Last Name *"
          value={passenger.lastName}
          onChange={(event) =>
            updatePassenger(index, "lastName", event.target.value)
          }
          className={errors[`passenger_${index}_lastName`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_lastName`] && (
          <span className="field-error-text">{errors[`passenger_${index}_lastName`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Nationality *</span>
        <input
          type="text"
          placeholder="Nationality *"
          value={passenger.nationality || ""}
          onChange={(event) =>
            updatePassenger(index, "nationality", event.target.value)
          }
          className={errors[`passenger_${index}_nationality`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_nationality`] && (
          <span className="field-error-text">{errors[`passenger_${index}_nationality`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Date of Birth *</span>
        <input
          type="text"
          placeholder="DD/MM/YYYY"
          value={passenger.dob || ""}
          onChange={(event) => {
            const formatted = formatDobInput(event.target.value);
            updatePassenger(index, "dob", formatted);
          }}
          className={errors[`passenger_${index}_dob`] ? "field-has-error" : ""}
        />
      </label>

      <div className="special-assistance-grid-row">
        <span>Special Assistance</span>
        <div className="special-assistance-trigger-box" onClick={() => handleOpenSpecialAssistance(index)}>
          <span className="special-assistance-trigger-text">
            {passenger.specialAssistance && passenger.specialAssistance.length > 0
              ? passenger.specialAssistance.join(", ")
              : "Special Assistance"}
          </span>
          <span className="special-assistance-trigger-icon">
            {passenger.specialAssistance && passenger.specialAssistance.length > 0 ? (
              <Check size={14} className="icon-check" />
            ) : (
              <span className="plus-icon-symbol">+</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );  // Sidebar helpers

  return (
    <main className="flight-flow-page">
      <BookingTimer />
      {/* ── STEPPER PROGRESS HEADER ── */}
      <div className="flight-stepper-header">
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Flight Selection</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
          <span className="step-circle">2</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">3</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">4</span>
          <span>Payment</span>
        </div>
      </div>

      <div className="flight-booking-container">
        {/* ── LEFT COLUMN SIDEBAR ── */}
        <aside className="flight-checkout-sidebar">
          {/* Your Flight Details */}
          <div className="sidebar-card your-flight-card">
            <h3 className="sidebar-card-title">Your Flight</h3>
            <div className="flight-segment">
              <div className="flight-city-info">
                <span className="flight-city-code">{flight.sourceCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.source || "--"}</span>
              </div>
              <div className="flight-stops-indicator">
                <span className="stops-text">{Number(flight.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                <div className="stops-line"></div>
              </div>
              <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                <span className="flight-city-code">{flight.destinationCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.destination || "--"}</span>
              </div>
            </div>
            <div className="flight-meta-info">
              <span>{flight.airlineName} ({flight.flightNumber})</span>
              <span className="flight-date-badge">{flight.departDate || "--"}</span>
            </div>
          </div>

          {/* Travellers Details */}
          {filledPassengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {filledPassengers.map((p, idx) => (
                <div key={p.id} className="traveller-item">
                  {idx + 1}. {p.title} {p.firstName} {p.lastName}
                </div>
              ))}
            </div>
          )}

          {/* Fare Summary */}
          <div className="sidebar-card fare-summary-card">
            <h3 className="sidebar-card-title">Fare Summary</h3>
            <div className="fare-row">
              <span>Fare Type</span>
              <span className="refundable-tag">{flight.isRefundable ? "Refundable" : "Non-Refundable"}</span>
            </div>
            <div className="fare-row">
              <span>Base Fare</span>
              <span>₹ {baseFare.toLocaleString("en-IN")}</span>
            </div>
            {tax > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {tax.toLocaleString("en-IN")}</span>
              </div>
            )}
            {markup > 0 && (
              <div className="fare-row">
                <span>Service Markup</span>
                <span>₹ {markup.toLocaleString("en-IN")}</span>
              </div>
            )}
            {convenienceFee > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {convenienceFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {tripSecureFee > 0 && (
              <div className="fare-row">
                <span>Trip Secure Fee</span>
                <span>₹ {tripSecureFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {totalDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {finalPayable.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          {/* Passenger Details input */}
          <div className="flight-main-card flight-main-card--compact">
            <h2 className="flight-main-card-title">
              <User size={20} className="header-icon" />
              Enter Traveller Details
            </h2>
            
            {passengers.map((passenger, index) => {
              const isExisting = passengerModes[index];
              return (
                <div key={passenger.id} className="flight-passenger-row">
                  <header className="flight-passenger-row-header">
                    <h4 className="flight-passenger-row-title">
                      Passenger {index + 1} ({passenger.passengerType})
                    </h4>
                    
                    <div className="passenger-mode-toggle">
                      <button
                        type="button"
                        className={`btn-action-outline ${isExisting ? "active" : ""}`}
                        onClick={() => setPassengerMode(index, true)}
                      >
                        Existing Traveler
                      </button>
                      <button
                        type="button"
                        className={`btn-action-outline ${!isExisting ? "active" : ""}`}
                        onClick={() => setPassengerMode(index, false)}
                      >
                        Add New
                      </button>
                    </div>
                  </header>

                  <div className="flight-passenger-row-body">
                    {isExisting ? (
                      <div className="passenger-existing-wrap">
                        {travelerLoadError && (
                          <p className="pmode-warn">{travelerLoadError}</p>
                        )}
                        <select
                          className="input-control"
                          value={passenger.selectedTravelerId || ""}
                          onChange={(e) => handleSelectExistingTraveler(index, e.target.value)}
                        >
                          <option value="">-- Select Existing Traveler --</option>
                          {savedTravelers.length === 0 ? (
                            <option disabled>No saved travelers found</option>
                          ) : (
                            savedTravelers.map((t) => (
                              <option key={t.id} value={String(t.id)}>
                                {[t.title, t.firstName, t.lastName].filter(Boolean).join(" ")}
                              </option>
                            ))
                          )}
                        </select>

                        {passenger.selectedTravelerId && renderPassengerFields(passenger, index)}
                      </div>
                    ) : (
                      renderPassengerFields(passenger, index)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Details */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">
              <Mail size={20} className="header-icon" />
              Contact Details
            </h2>
            <p style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "-12px", marginBottom: 16 }}>
              Your ticket and flight information will be sent here
            </p>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Email Address *</label>
                <input
                  className={`input-control ${errors.contact_email ? "error-state" : ""}`}
                  type="email"
                  placeholder="Email ID"
                  value={contact.email}
                  onChange={(e) => {
                    setContact(prev => ({ ...prev, email: e.target.value }));
                    setErrors(prev => { const c = { ...prev }; delete c.contact_email; return c; });
                  }}
                />
                {errors.contact_email && <span className="input-error-msg">{errors.contact_email}</span>}
              </div>

              <div className="input-group">
                <label>Mobile Number *</label>
                <div className="contact-phone-row">
                  <select
                    className="phone-code-select"
                    disabled
                  >
                    <option>+91</option>
                  </select>
                  <input
                    className={`input-control contact-phone-input ${errors.contact_mobile ? "error-state" : ""}`}
                    type="text"
                    maxLength={10}
                    placeholder="Mobile Number"
                    value={contact.mobile}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/\D/g, "");
                      setContact(prev => ({ ...prev, mobile: cleanValue }));
                      setErrors(prev => { const c = { ...prev }; delete c.contact_mobile; return c; });
                    }}
                  />
                </div>
                {errors.contact_mobile && <span className="input-error-msg">{errors.contact_mobile}</span>}
              </div>
            </div>

            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={contact.whatsappUpdates}
                  onChange={(e) => {
                    setContact(prev => ({
                      ...prev,
                      whatsappUpdates: e.target.checked,
                      whatsappNumber: e.target.checked ? prev.whatsappNumber || prev.mobile : ""
                    }));
                    setErrors(prev => { const c = { ...prev }; delete c.contact_whatsappNumber; return c; });
                  }}
                  style={{ width: "16px", height: "16px", margin: 0, padding: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--text-main)", marginLeft: "8px", fontWeight: "normal" }}>
                  Send updates on WhatsApp
                </span>
              </label>
              {contact.whatsappUpdates && (
                <div style={{ marginTop: "8px" }}>
                  <input
                    className="input-control"
                    type="text"
                    maxLength={10}
                    placeholder="WhatsApp number (defaults to mobile)"
                    value={contact.whatsappNumber}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/\D/g, "");
                      setContact(prev => ({ ...prev, whatsappNumber: cleanValue }));
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Trip Secure Benefits */}
          <div className="trip-secure-card">
            <h2 className="flight-main-card-title">
              <Shield size={20} className="header-icon" style={{ color: "var(--secondary-color)" }} />
              Trip Secure Benefits
            </h2>
            <p className="trip-secure-tagline">
              Secure your journey with comprehensive travel protection services for just ₹249 per traveller
            </p>

            <div className="trip-secure-benefits-grid">
              <div className="trip-secure-benefit-item">
                <span className="trip-secure-benefit-icon">
                  <Shield size={16} strokeWidth={2.5} />
                </span>
                <div className="trip-secure-benefit-text-wrap">
                  <span className="trip-secure-benefit-title">Delayed/Lost Baggage Assistance</span>
                  <span className="trip-secure-benefit-desc">Get instant baggage tracking assistance and compensation support.</span>
                </div>
              </div>

              <div className="trip-secure-benefit-item">
                <span className="trip-secure-benefit-icon">
                  <Shield size={16} strokeWidth={2.5} />
                </span>
                <div className="trip-secure-benefit-text-wrap">
                  <span className="trip-secure-benefit-title">Personal Accident Coverage</span>
                  <span className="trip-secure-benefit-desc">Accident insurance coverage up to ₹5,00,000 for emergency medical expenses.</span>
                </div>
              </div>

              <div className="trip-secure-benefit-item">
                <span className="trip-secure-benefit-icon">
                  <Shield size={16} strokeWidth={2.5} />
                </span>
                <div className="trip-secure-benefit-text-wrap">
                  <span className="trip-secure-benefit-title">Loss of Checked-In Baggage</span>
                  <span className="trip-secure-benefit-desc">Reimbursement for total loss of checked-in baggage up to ₹20,000.</span>
                </div>
              </div>

              <div className="trip-secure-benefit-item">
                <span className="trip-secure-benefit-icon">
                  <Shield size={16} strokeWidth={2.5} />
                </span>
                <div className="trip-secure-benefit-text-wrap">
                  <span className="trip-secure-benefit-title">Delay of Checked-In Baggage</span>
                  <span className="trip-secure-benefit-desc">Compensation up to ₹10,000 for checked baggage delay beyond 6 hours.</span>
                </div>
              </div>
            </div>

            <div className="trip-secure-options">
              <div 
                className={`trip-secure-option ${tripSecureAdded ? "selected recommended" : ""}`}
                onClick={() => setTripSecureAdded(true)}
              >
                <div className="trip-secure-option-input-wrap">
                  <div className="trip-secure-radio-circle">
                    <div className="trip-secure-radio-inner"></div>
                  </div>
                </div>
                <div className="trip-secure-option-content">
                  <span className="trip-secure-option-title">
                    Yes, secure my trip with Trip Secure Benefits
                    <span className="trip-secure-badge-rec">Recommended</span>
                  </span>
                  <span className="trip-secure-option-subtitle">
                    I want travel protection covering lost/delayed baggage and personal accidents.
                  </span>
                </div>
                <div className="trip-secure-option-price">
                  ₹ {(249 * passengers.length).toLocaleString("en-IN")}
                </div>
              </div>

              <div 
                className={`trip-secure-option ${!tripSecureAdded ? "selected" : ""}`}
                onClick={() => setTripSecureAdded(false)}
              >
                <div className="trip-secure-option-input-wrap">
                  <div className="trip-secure-radio-circle">
                    <div className="trip-secure-radio-inner"></div>
                  </div>
                </div>
                <div className="trip-secure-option-content">
                  <span className="trip-secure-option-title">
                    No, I will travel without protection
                  </span>
                  <span className="trip-secure-option-subtitle">
                    I understand the risks and agree to pay for baggage delays, loss, and accident expenses myself.
                  </span>
                </div>
                <div className="trip-secure-option-price">
                  ₹ 0
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="flight-main-card important-info-card">
            <h2 className="flight-main-card-title">
              <Info size={20} className="header-icon" />
              Important Information
            </h2>
            <div className="important-info-content">
              <div className="info-grid">
                <div className="info-section">
                  <h4 className="info-section-title">Travel Guidelines</h4>
                  <ul className="info-list">
                    <li>Carry a valid government-issued Photo ID (Aadhaar, Passport, Driving License, or Voter ID).</li>
                    <li>For international travel, make sure your passport is valid for at least 6 months and you have all required visas.</li>
                    <li>Report at the airport at least 2 hours before domestic departures and 3 hours before international departures.</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h4 className="info-section-title">Baggage Rules</h4>
                  <ul className="info-list">
                    <li><strong>Cabin Baggage:</strong> Standard allowance is 1 cabin bag of up to 7 kg per passenger.</li>
                    <li><strong>Check-in Baggage:</strong> Generally 15 kg per passenger is allowed for domestic flights. Limits may vary by airline and fare class.</li>
                    <li>Prohibited items (like power banks, batteries, liquids above 100ml) must not be carried in check-in baggage.</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h4 className="info-section-title">Boarding Pass & Check-in</h4>
                  <ul className="info-list">
                    <li><strong>Web Check-in:</strong> Mandated by airlines. Web check-in opens 48 hours to 60 minutes before departure.</li>
                    <li>Boarding pass will be generated after successful check-in. You can download or print it before arriving at the airport.</li>
                    <li>Alternatively, boarding passes can be collected at the airline's airport check-in counter (fees may apply).</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h4 className="info-section-title">Unaccompanied Minors</h4>
                  <ul className="info-list">
                    <li>Children aged 5–12 years traveling alone are classified as Unaccompanied Minors.</li>
                    <li>Direct booking and separate coordination with the airline is required to request escort services.</li>
                    <li>Special forms and parent/guardian contact details must be provided at the airport check-in counter.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Special Requests & Terms */}
          <div className="flight-main-card additional-details-card">
            <h2 className="flight-main-card-title">Additional Details</h2>
            <div className="input-group additional-request-field">
              <label>Special Requests / Assistance (Optional)</label>
              <input
                className="input-control"
                type="text"
                value={specialAssistance}
                onChange={(e) => setSpecialAssistance(e.target.value)}
                placeholder="Wheelchair, diabetic meal, etc."
              />
            </div>

            <div className="terms-consent-field">
              <label className="terms-consent-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    setErrors(prev => { const c = { ...prev }; delete c.agreedToTerms; return c; });
                  }}
                />
                <span>
                  I agree to the flight cancellation rules, booking terms & policies. <strong>*</strong>
                </span>
              </label>
              {errors.agreedToTerms && <span className="input-error-msg">{errors.agreedToTerms}</span>}
            </div>

            {formError && (
              <p className="form-error-message">
                {formError}
              </p>
            )}
          </div>

          {/* Coupons & Offers */}
          {!isAgent && (
            <div className="flight-main-card">
              <h2 className="flight-main-card-title">
                <Tag size={20} className="header-icon" />
                Apply Coupons & Offers
              </h2>

              <div style={{ display: "flex", gap: 12 }}>
                <input
                  className="input-control"
                  style={{ textTransform: "uppercase" }}
                  type="text"
                  placeholder="Enter promo code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={isApplying || selectedFeaturedOfferId !== null}
                />
                {couponCode ? (
                  <button type="button" className="btn-secondary" onClick={handleRemoveCoupon}>Remove</button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleApplyCoupon}
                    disabled={isApplying || selectedFeaturedOfferId !== null}
                  >
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                )}
              </div>

              {couponError && <p style={{ color: "var(--danger-color)", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponError}</p>}
              {couponSuccess && <p style={{ color: "var(--success-color)", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponSuccess}</p>}

              {/* Coupons list */}
              {availableCoupons.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.875rem" }}>Available Coupons</h4>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
                    {availableCoupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        style={{
                          minWidth: 200,
                          border: "1px dashed var(--border-color)",
                          borderRadius: 8,
                          padding: 10,
                          backgroundColor: "#f8fafc",
                          position: "relative"
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.875rem", color: "var(--secondary-color)" }}>{coupon.couponCode}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {String(coupon.couponType || coupon.cpnType || "Percentage").toLowerCase().includes("percentage") ? `${coupon.value}%` : `₹${coupon.value}`} Off
                        </span>
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ width: "100%", height: 30, padding: 0, marginTop: 8, fontSize: "0.75rem" }}
                          onClick={() => loadPricing(coupon.couponCode, null)}
                          disabled={isApplying || selectedFeaturedOfferId !== null}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured offers list */}
              {featuredOffers.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.875rem" }}>Featured Offers</h4>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
                    {featuredOffers.map((offer) => (
                      <div
                        key={offer.id}
                        style={{
                          minWidth: 200,
                          border: "1px solid var(--border-color)",
                          borderRadius: 8,
                          padding: 10,
                          backgroundColor: "#fff",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.875rem" }}>{offer.title}</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0" }}>{offer.subtitle}</p>
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ width: "100%", height: 30, padding: 0, marginTop: 4, fontSize: "0.75rem" }}
                          onClick={() => handleSelectOffer(offer.id)}
                          disabled={isApplying || couponCode !== ""}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Total Fare</span>
          <span className="bottom-price-amount">₹ {finalPayable.toLocaleString("en-IN")}</span>
        </div>

        <button type="button" className="btn-primary" onClick={handleContinue}>
          Continue <ArrowRight size={16} />
        </button>
      </div>

      {/* ── MODAL 1: REVIEW DETAILS POPUP ── */}
      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">Review Details</h3>
              <p className="modal-subtitle">
                Please ensure that your name matches your govt. ID such as Aadhaar, Passport or Driver's License
              </p>
            </div>
            <div className="modal-body">
              {passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-color)"
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "rgba(37,99,235,0.1)",
                      color: "var(--secondary-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      {passenger.passengerType}
                    </span>
                    <strong style={{ display: "block", fontSize: "0.95rem", marginTop: 2 }}>
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                Edit
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmReview}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FREE CANCELLATION (ASSURED) POPUP ── */}
      {showAssuredModal && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--secondary-color)" }}>
                <ShieldCheck size={26} />
                PickNBook
              </h3>
              <p className="modal-subtitle">Free Cancellation protection, only @ ₹1,649/traveller</p>
            </div>
            <div className="modal-body">
              <table className="assured-comparison-table">
                <thead>
                  <tr>
                    <th>Benefit</th>
                    <th className="highlight-col">With PickNBook</th>
                    <th>Without PickNBook</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Refund on cancellation</td>
                    <td className="highlight-col" style={{ color: "var(--success-color)", fontWeight: 800 }}>
                      ₹ {Math.round(finalPayable).toLocaleString("en-IN")} (Full Refund)
                    </td>
                    <td>₹ {Math.round(finalPayable * 0.5).toLocaleString("en-IN")} (Standard Refund)</td>
                  </tr>
                  <tr>
                    <td>Instant Refund</td>
                    <td className="highlight-col">
                      <span className="check-icon-green">✓ Yes</span>
                    </td>
                    <td>
                      <span className="cross-icon-red">✗ No</span>
                    </td>
                  </tr>
                  <tr>
                    <td>24x7 Priority Support</td>
                    <td className="highlight-col">
                      <span className="check-icon-green">✓ Yes</span>
                    </td>
                    <td>
                      <span className="cross-icon-red">✗ No</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "16px 0 0 0" }}>
                By securing your trip, you agree to the Terms of Service for PickNBook cancellation.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ border: "none", color: "var(--text-muted)" }}
                onClick={() => handleSelectAssured(false)}
              >
                No, Thanks
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSelectAssured(true)}>
                Secure My Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL / DRAWER 3: SPECIAL ASSISTANCE DRAWER ── */}
      {isAssistanceDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsAssistanceDrawerOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-header">
              <button type="button" className="drawer-close-btn" onClick={() => setIsAssistanceDrawerOpen(false)}>
                <X size={20} />
              </button>
              <h3 className="drawer-title">SPECIAL ASSISTANCE</h3>
              <p className="drawer-subtitle">For a <span>seamless journey</span></p>
            </header>
            
            <div className="drawer-body">
              <p className="drawer-instruction">Please select option for Special Assistance</p>
              
              <div className="assistance-options-list">
                {ASSISTANCE_OPTIONS.map((option) => {
                  const isChecked = tempAssistance.includes(option.value);
                  return (
                    <label key={option.value} className={`assistance-option-card ${isChecked ? "selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAssistanceOption(option.value)}
                      />
                      <span className="option-checkbox-custom">
                        {isChecked && <Check size={12} />}
                      </span>
                      <span className="option-label-text">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <footer className="drawer-footer">
              <button type="button" className="btn-primary drawer-done-btn" onClick={handleSaveSpecialAssistance}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
