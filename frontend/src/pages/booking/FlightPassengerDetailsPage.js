import React, { useMemo, useState, useEffect } from "react";
import { Info, Tag, Mail, Check, X, Shield, ArrowRight, ShieldCheck, User, Loader2, XCircle, Plane } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/FlightBookingFlow.css";
import BookingTimer from "./BookingTimer";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getFlightPricingPreview, getFlightPromotions, listFlightCoupons, getFareRule, getFareQuote, getSSR } from "../../services/flightBookingService";
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
      email: "",
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
      email: "",
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
  return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]{2,}\.[a-zA-Z]{2,}$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  return digits.length === 10;
}



export default function FlightPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const b2bToken = localStorage.getItem("b2b_token");
  const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
  const isAgent = !localStorage.getItem("token") && b2bToken && b2bRole === "agent";

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
    setActivePassengerIndexForAssistance(prev => prev === index ? null : index);
  };

  const handleTogglePassengerAssistance = (pIdx, val) => {
    const updatedPassengers = passengers.map((p, idx) => {
      if (idx === pIdx) {
        const currentList = p.specialAssistance || [];
        const nextList = currentList.includes(val)
          ? currentList.filter(x => x !== val)
          : [...currentList, val];
        return { ...p, specialAssistance: nextList };
      }
      return p;
    });
    setPassengers(updatedPassengers);
    const compiled = compileCombinedSpecialAssistance(updatedPassengers);
    setSpecialAssistance(compiled);
  };
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(flowState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [tripSecureAdded, setTripSecureAdded] = useState(
    flowState.tripSecureAdded !== undefined ? Boolean(flowState.tripSecureAdded) : true
  );

  const [activeFareRuleModal, setActiveFareRuleModal] = useState({
    isOpen: false,
    isLoading: false,
    error: "",
    data: null,
    flight: null,
  });

  const handleOpenFareRule = async (flightObj) => {
    const targetFlight = flightObj || flight;
    if (!targetFlight) return;
    setActiveFareRuleModal({
      isOpen: true,
      isLoading: true,
      error: "",
      data: null,
      flight: targetFlight,
    });

    try {
      const response = await getFareRule({
        traceId: targetFlight.traceId,
        resultIndex: targetFlight.resultIndex || targetFlight.id,
        srdvType: targetFlight.srdvType,
        srdvIndex: targetFlight.srdvIndex,
        flight: targetFlight,
      });
      setActiveFareRuleModal({
        isOpen: true,
        isLoading: false,
        error: response.error || "",
        data: response,
        flight: targetFlight,
      });
    } catch (err) {
      setActiveFareRuleModal({
        isOpen: true,
        isLoading: false,
        error: err.message || "Failed to fetch live fare rules.",
        data: null,
        flight: targetFlight,
      });
    }
  };

  const handleCloseFareRule = () => {
    setActiveFareRuleModal({
      isOpen: false,
      isLoading: false,
      error: "",
      data: null,
      flight: null,
    });
  };

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

  useEffect(() => {
    let isCurrent = true;
    async function runFareQuoteAndSSR() {
      if (!flight) return;
      try {
        const quoteRes = await getFareQuote({
          flight,
          traceId: flight.traceId,
          resultIndex: flight.resultIndex || flight.id,
          srdvType: flight.srdvType,
          srdvIndex: flight.srdvIndex,
        });
        if (isCurrent && quoteRes && quoteRes.success) {
          console.log("FareQuote API validated successfully:", quoteRes);
        }
        const ssrRes = await getSSR({
          flight,
          traceId: flight.traceId,
          resultIndex: flight.resultIndex || flight.id,
          srdvType: flight.srdvType,
          srdvIndex: flight.srdvIndex,
        });
        if (isCurrent && ssrRes && ssrRes.success) {
          console.log("SSR API loaded successfully:", ssrRes);
        }
      } catch (err) {
        console.warn("FareQuote / SSR fetch error:", err);
      }
    }
    runFareQuoteAndSSR();
    return () => { isCurrent = false; };
  }, [flight]);

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
      const code = (c.couponCode || c.CouponCode || c.code || c.Code || c.name || c.Name || c.promoCode || "").toString().toUpperCase();
      const title = c.remark || c.Remark || c.title || c.Title || c.description || c.Description || c.couponName || c.name || code;
      const val = Number(
        c.value ?? c.Value ??
        c.discountValue ?? c.DiscountValue ??
        c.couponValue ?? c.CouponValue ??
        c.cpnValue ?? c.CpnValue ??
        c.discountAmount ?? c.DiscountAmount ??
        c.cpnAmount ?? c.CpnAmount ??
        c.amount ?? c.Amount ?? 0
      );
      const rawType = (
        c.couponType || c.CouponType ||
        c.cpnType || c.CpnType ||
        c.discountType || c.DiscountType ||
        c.type || "Fixed"
      ).toString();
      const status = (c.status || c.Status || "").toString().toLowerCase();

      // Dynamic date & usage limit checks
      const todayStr = new Date().toISOString().slice(0, 10);
      let isExpired = false;
      const expDateStr = c.expiryDate || c.ExpiryDate;
      if (expDateStr) {
        const expClean = String(expDateStr).slice(0, 10);
        if (expClean < todayStr) {
          isExpired = true;
        }
      }

      let isNotStarted = false;
      const startDateStr = c.startDate || c.StartDate;
      if (startDateStr) {
        const startClean = String(startDateStr).slice(0, 10);
        if (startClean > todayStr) {
          isNotStarted = true;
        }
      }

      const useLimit = Number(c.useLimit ?? c.UseLimit ?? 0);
      const usedCount = Number(c.usedCount ?? c.UsedCount ?? 0);
      const isLimitReached = useLimit > 0 && usedCount >= useLimit;

      const rawIsActive = c.isActive === true || c.isActive === 1 || String(c.isActive).toLowerCase() === "true" || status === "active" || status === "" || c.isActive === undefined;

      const isActive = rawIsActive && !isExpired && !isNotStarted && !isLimitReached;

      return {
        id: c.id || c.couponId || code,
        couponCode: code,
        title,
        value: val,
        couponType: rawType,
        startDate: startDateStr,
        expiryDate: expDateStr,
        useLimit,
        usedCount,
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
          backendPromos = (Array.isArray(promos) ? promos : []).map(normalizeCoupon);
        } catch (err) {
          console.error("Failed to load flight promotions from backend", err);
        }

        // 2. Fetch dynamic flight coupons (admin / backend)
        try {
          const coupons = await listFlightCoupons();
          adminCoupons = (Array.isArray(coupons) ? coupons : []).map(normalizeCoupon);
        } catch (err) {
          console.error("Failed to load flight coupons from admin", err);
        }

        // 3. Fetch from local storage fallbacks
        let localCoupons = [];
        try {
          const rawCoupons = localStorage.getItem("admin_portal:flight-coupons");
          if (rawCoupons) {
            const parsed = JSON.parse(rawCoupons);
            if (Array.isArray(parsed)) {
              localCoupons = parsed.map(c => normalizeCoupon({
                ...c,
                title: c.remark || c.couponCode,
                couponType: c.cpnType || c.couponType || "Fixed",
                status: c.status || "active"
              }));
            }
          }
        } catch (e) {
          console.warn("Failed to load local coupons", e);
        }

        let localDiscounts = [];
        try {
          const rawDiscounts = localStorage.getItem("admin_b2c_flight_discounts");
          if (rawDiscounts) {
            const parsed = JSON.parse(rawDiscounts);
            if (Array.isArray(parsed)) {
              localDiscounts = parsed.map(d => normalizeCoupon({
                ...d,
                couponCode: d.id,
                title: d.remark || d.id,
                couponType: d.type || "Fixed",
                status: d.status || "active"
              }));
            }
          }
        } catch (e) {
          console.warn("Failed to load local discounts", e);
        }

        // Merge dynamic admin coupons/discounts
        const mergedMap = new Map();

        // 1. Admin coupons take priority for exact codes
        adminCoupons.forEach(c => {
          if (c.couponCode) {
            mergedMap.set(c.couponCode, c);
          }
        });

        backendPromos.forEach(c => {
          if (c.couponCode && !mergedMap.has(c.couponCode)) {
            mergedMap.set(c.couponCode, c);
          }
        });

        localCoupons.forEach(c => {
          if (c.couponCode && !mergedMap.has(c.couponCode)) {
            mergedMap.set(c.couponCode, c);
          }
        });

        localDiscounts.forEach(c => {
          if (c.couponCode && !mergedMap.has(c.couponCode)) {
            mergedMap.set(c.couponCode, c);
          }
        });

        const mergedCoupons = Array.from(mergedMap.values()).filter(c => c.isActive);
        console.log("Final merged dynamic coupons list:", mergedCoupons);
        setAvailableCoupons(mergedCoupons);
        
        try {
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
          console.error("Failed to load featured offers", err);
        }
      } catch (err) {
        console.error("Failed to load flight coupons and offers", err);
      }
    }
    loadPromoData();
  }, []);

  // Sync pricing preview from backend
  const loadPricing = async (code = "") => {
    setIsApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const payload = {
        traceId: flight?.traceId || "",
        resultIndex: flight?.resultIndex || flight?.id || "",
        srdvType: flight?.srdvType || "MixAPI",
        srdvIndex: flight?.srdvIndex || "2",
        couponCode: code ? code.trim().toUpperCase() : ""
      };

      const pricing = await getFareQuote(payload);

      if (!pricing || !pricing.success) {
        throw new Error(pricing?.error || "Failed to fetch live pricing.");
      }

      setPricingBreakdown(pricing);
      
      // Update available offers dynamically from FareQuote response
      if (pricing.availableOffers && Array.isArray(pricing.availableOffers)) {
        setFeaturedOffers(pricing.availableOffers);
      }

      if (code) {
        if (pricing.discount > 0) {
          setCouponSuccess(`Coupon "${code.toUpperCase()}" applied! Discount: ${formatCurrency(pricing.discount)}`);
          setCouponCode(code.toUpperCase());
        } else {
          setCouponError("Coupon is valid but offers no discount for this booking.");
          setCouponCode("");
        }
      }
    } catch (err) {
      console.error(err);
      setCouponError(err.message || "Unable to validate coupon.");
      if (code) setCouponCode("");
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
  const baseFare = Number(pricingBreakdown?.fare?.BaseFare || pricingBreakdown?.fare?.baseFare || preservedFareSummary.baseFare || 0);
  const tax = Number(pricingBreakdown?.fare?.Tax || pricingBreakdown?.fare?.tax || preservedFareSummary.tax || 0);
  const convenienceFee = Number(preservedFareSummary.convenienceFee || 0);
  const markup = Number(pricingBreakdown?.markup || preservedFareSummary.markup || 0);
  
  const totalDiscount = pricingBreakdown
    ? Number(pricingBreakdown.discount || 0)
    : Number(preservedFareSummary.discount || flowState.couponDiscount || 0);
    
  const preservedTotal =
    Number(pricingBreakdown?.fare?.PublishedFare || pricingBreakdown?.fare?.OfferedFare || preservedFareSummary.totalFare || 0) ||
    baseFare + tax + convenienceFee + markup;
    
  const tripSecureFee = tripSecureAdded ? 249 * passengers.length : 0;
  
  // Use authoritative B2CFinalFare if available
  const b2cFinalFare = pricingBreakdown?.b2cFinalFare
    ? Number(pricingBreakdown.b2cFinalFare) + convenienceFee
    : Math.max(0, preservedTotal - totalDiscount);
    
  const finalPayable = b2cFinalFare + tripSecureFee;
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
    const isAgent = !localStorage.getItem("token") && b2bToken && b2bRole === "agent";

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
    handleSelectAssured(false);
  };

  const assuredFeePerTraveller = Number(flight?.assuredFeePerTraveller || flight?.cancellationProtectionFee) || 1649;

  const handleSelectAssured = async (secured) => {
    
    const count = passengers.length || 1;
    const assuredFee = secured ? assuredFeePerTraveller * count : 0;
    
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
        isValidation: true,
        passengerName: passengers[0]?.firstName ? `${passengers[0].title || "Mr"} ${passengers[0].firstName} ${passengers[0].lastName || ""}`.trim() : "Passenger",
        passengerPhone: String(contact?.mobile || "").trim(),
        passengerEmail: "", // Prevent backend from sending email notifications during the pre-validation step before payment is completed
        travelClass: resolveCleanTravelClass(flight?.selectedTravelClass || flight?.className || searchContext?.cabinClass || "Economy"),
        passengers: passengers.map((p, idx) => ({
          title: p.title || "Mr",
          firstName: `${p.firstName || ""}`.trim() || `Passenger`,
          lastName: `${p.lastName || ""}`.trim() || `${idx + 1}`,
          fullName: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`.replace(/\s+/g, " ").trim() || `Passenger ${idx + 1}`,
          passengerType: p.passengerType || "Adult",
          gender: p.gender || (p.title === "Mrs" || p.title === "Ms" ? "Female" : "Male"),
          nationality: p.nationality || "Indian",
          email: p.email || contact?.email || "",
          passengerEmail: p.email || contact?.email || "",
          contactNo: p.contactNo || contact?.mobile || "",
          ...(p.dob ? { dob: ddMmYyyyToYyyyMmDd(p.dob) } : {}),
        })),
        couponCode: couponCode.trim().toUpperCase() || null,
        selectedFeaturedOfferId: selectedFeaturedOfferId || null,
        selectedPromotionId: selectedFeaturedOfferId || null,
        adults: passengers.filter(p => p.passengerType === "Adult").length || 1,
        children: passengers.filter(p => p.passengerType === "Child").length || 0,
        infants: passengers.filter(p => p.passengerType === "Infant").length || 0,
      };


      try {
        sessionStorage.setItem("Passengers", JSON.stringify(passengers));
      } catch (e) {}

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
          onChange={(event) => {
            const val = event.target.value;
            updatePassenger(index, "title", val);
            if (val === "Mrs" || val === "Ms") {
              updatePassenger(index, "gender", "Female");
            } else if (val === "Mr") {
              updatePassenger(index, "gender", "Male");
            }
          }}
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
        <span>Gender *</span>
        <select
          value={passenger.gender || (passenger.title === "Mrs" || passenger.title === "Ms" ? "Female" : "Male")}
          onChange={(event) => updatePassenger(index, "gender", event.target.value)}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
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

      <label className="passenger-field passenger-field--full">
        <span>Passenger Email (Optional)</span>
        <input
          type="email"
          placeholder="Email Address"
          value={passenger.email || ""}
          onChange={(event) => updatePassenger(index, "email", event.target.value)}
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

      {activePassengerIndexForAssistance === index && (
        <div className="special-assistance-inline-panel" style={{
          gridColumn: "1 / -1",
          marginTop: "12px",
          padding: "16px",
          backgroundColor: "#f8fafc",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <p className="drawer-instruction" style={{ margin: 0 }}>Please select option for Special Assistance</p>
          <div className="assistance-options-list" style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px"
          }}>
            {ASSISTANCE_OPTIONS.map((option) => {
              const isChecked = (passenger.specialAssistance || []).includes(option.value);
              return (
                <div key={option.value} className={`assistance-option-card ${isChecked ? "selected" : ""}`} style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left"
                }} onClick={() => handleTogglePassengerAssistance(index, option.value)}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                  />
                  <span className="option-checkbox-custom" style={{
                    width: "16px",
                    height: "16px",
                    marginRight: "8px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {isChecked && <Check size={10} />}
                  </span>
                  <span className="option-label-text" style={{
                    fontSize: "0.78rem",
                    fontWeight: isChecked ? 600 : 500,
                    lineHeight: "1.2",
                    textAlign: "left"
                  }}>{option.label}</span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", height: "40px", marginTop: "8px" }}
            onClick={() => setActivePassengerIndexForAssistance(null)}
          >
            Done
          </button>
        </div>
      )}
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
            <h3 className="sidebar-card-title">{flowState.isTwoWay ? "Your Flights (Roundtrip)" : "Your Flight"}</h3>
            
            {/* Onward Flight Segment */}
            <div style={{ marginBottom: flowState.isTwoWay ? 16 : 0 }}>
              {flowState.isTwoWay && (
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d32f2f", textTransform: "uppercase", marginBottom: 6 }}>
                  1. Onward Flight
                </div>
              )}
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
              <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{flight.airlineName || flight.airline} ({flight.flightNumber})</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="flight-date-badge">{flight.departDate || searchContext?.departureDate || "--"}</span>
                  <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                    ₹{new Intl.NumberFormat("en-IN").format(Number(flight.fare || flight.price || flight.priceInr || flight.selectedTravelClassPriceInr || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Return Flight Segment */}
            {flowState.isTwoWay && flowState.returnFlight && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc1e26", textTransform: "uppercase", marginBottom: 6 }}>
                  2. Return Flight
                </div>
                <div className="flight-segment">
                  <div className="flight-city-info">
                    <span className="flight-city-code">{flowState.returnFlight.sourceCode || "--"}</span>
                    <span className="flight-city-name">{searchContext?.destination || "--"}</span>
                  </div>
                  <div className="flight-stops-indicator">
                    <span className="stops-text">{Number(flowState.returnFlight.stops || 0) > 0 ? `${flowState.returnFlight.stops} stop` : "Non stop"}</span>
                    <div className="stops-line"></div>
                  </div>
                  <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                    <span className="flight-city-code">{flowState.returnFlight.destinationCode || "--"}</span>
                    <span className="flight-city-name">{searchContext?.source || "--"}</span>
                  </div>
                </div>
                <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{flowState.returnFlight.airlineName || flowState.returnFlight.airline} ({flowState.returnFlight.flightNumber})</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="flight-date-badge">{flowState.returnFlight.departDate || searchContext?.returnDate || "--"}</span>
                    <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                      ₹{new Intl.NumberFormat("en-IN").format(Number(flowState.returnFlight.fare || flowState.returnFlight.price || flowState.returnFlight.priceInr || flowState.returnFlight.selectedTravelClassPriceInr || 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
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

            <button
              type="button"
              className="btn-action-outline"
              style={{ width: "100%", marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              onClick={() => handleOpenFareRule(flight)}
            >
              <Info size={15} />
              View Fare Rules & Policy
            </button>
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
                    {availableCoupons.map((coupon) => {
                      const isPercentage =
                        !String(coupon.couponCode || "").toUpperCase().includes("FLAT") &&
                        !String(coupon.title || "").toUpperCase().includes("FLAT") &&
                        !String(coupon.couponCode || "").toUpperCase().includes("INR") &&
                        coupon.value > 0 &&
                        coupon.value <= 100 &&
                        (String(coupon.couponType || "").toLowerCase().includes("percent") ||
                         String(coupon.couponType || "").toLowerCase().includes("percentage"));

                      const formattedDiscount = isPercentage ? `${coupon.value}% Off` : `₹${coupon.value} Off`;
                      return (
                        <div
                          key={coupon.id || coupon.couponCode}
                          style={{
                            minWidth: 220,
                            border: "1px dashed var(--border-color)",
                            borderRadius: 8,
                            padding: 12,
                            backgroundColor: "#f8fafc",
                            position: "relative"
                          }}
                        >
                          <strong style={{ display: "block", fontSize: "0.875rem", color: "#1e293b", marginBottom: 4 }}>
                            {coupon.couponCode}
                          </strong>
                          {coupon.title && coupon.title !== coupon.couponCode && (
                            <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>
                              {coupon.title}
                            </span>
                          )}
                          <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>
                            {formattedDiscount}
                          </span>
                          <button
                            type="button"
                            className="btn-action-outline"
                            style={{ width: "100%", height: 32, padding: 0, marginTop: 4, fontSize: "0.75rem" }}
                            onClick={() => loadPricing(coupon.couponCode, null)}
                            disabled={isApplying || selectedFeaturedOfferId !== null}
                          >
                            Apply
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Featured offers list */}
              {featuredOffers.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.875rem" }}>Featured Offers</h4>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
                    {featuredOffers.map((offer, idx) => (
                      <div
                        key={offer.Code || offer.id || idx}
                        style={{
                          minWidth: 200,
                          border: "1px solid var(--border-color)",
                          borderRadius: 8,
                          padding: 10,
                          backgroundColor: "#fff",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.875rem" }}>{offer.Title || offer.title}</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0" }}>{offer.Description || offer.subtitle}</p>
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ width: "100%", height: 30, padding: 0, marginTop: 4, fontSize: "0.75rem" }}
                          onClick={() => loadPricing(offer.Code || offer.couponCode)}
                          disabled={isApplying || (couponCode !== "" && couponCode === (offer.Code || offer.couponCode))}
                        >
                          {couponCode === (offer.Code || offer.couponCode) ? "Applied" : "Apply"}
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

      {/* ── MODAL 3: FARE RULES MODAL ── */}
      {activeFareRuleModal.isOpen && (
        <div
          className="booking-modal-backdrop"
          onClick={handleCloseFareRule}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            className="booking-modal-card fare-rule-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: "650px",
              width: "92%",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              position: "relative",
              zIndex: 100000,
              color: "#1e293b",
            }}
          >
            <div className="booking-modal-header" style={{ borderBottom: "1px solid #eee", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Plane size={22} color="#d32f2f" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    {activeFareRuleModal.flight?.airlineName || activeFareRuleModal.flight?.airline || "Flight"} ({activeFareRuleModal.flight?.flightNumber}) — Fare Rules
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    {activeFareRuleModal.flight?.sourceCode} ➔ {activeFareRuleModal.flight?.destinationCode}
                  </span>
                </div>
              </div>
              <button type="button" className="close-modal-btn" onClick={handleCloseFareRule} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div className="booking-modal-body" style={{ padding: "20px", maxHeight: "65vh", overflowY: "auto" }}>
              {activeFareRuleModal.isLoading ? (
                <div style={{ textAlign: "center", padding: "40px 10px" }}>
                  <Loader2 size={32} className="spin" color="#d32f2f" />
                  <p style={{ marginTop: "12px", color: "#555", fontWeight: 500 }}>Fetching live fare rules from airline API...</p>
                </div>
              ) : activeFareRuleModal.error ? (
                <div className="booking-error" style={{ padding: "16px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", display: "flex", alignItems: "center", gap: "10px" }}>
                  <XCircle size={18} />
                  <span>{activeFareRuleModal.error}</span>
                </div>
              ) : (
                <div className="fare-rule-details-container">
                  {(activeFareRuleModal.data?.specialRule || activeFareRuleModal.data?.SpecialRule) && (
                    <div
                      style={{ background: "#fff8e1", borderLeft: "4px solid #ffa000", padding: "12px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.9rem", color: "#795548" }}
                      dangerouslySetInnerHTML={{ __html: `<strong>Special Note:</strong> ${activeFareRuleModal.data?.specialRule || activeFareRuleModal.data?.SpecialRule}` }}
                    />
                  )}

                  {(() => {
                    const rules = activeFareRuleModal.data?.results || activeFareRuleModal.data?.Results || [];
                    const isRefundable = activeFareRuleModal.flight?.isRefundable ?? true;
                    const fl = activeFareRuleModal.flight || {};

                    if (Array.isArray(rules) && rules.length > 0) {
                      return rules.map((rule, idx) => (
                        <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                            <span>{rule.Airline || fl.airlineName || fl.airline || "Airline Fare Rules"}</span>
                            <span style={{ color: "#d32f2f" }}>{rule.Origin || fl.sourceCode || "Origin"} ➔ {rule.Destination || fl.destinationCode || "Destination"}</span>
                          </div>
                          {rule.FareBasisCode && (
                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "10px" }}>
                              Fare Basis: <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>{rule.FareBasisCode}</code>
                            </div>
                          )}
                          <div
                            className="fare-rule-html-content"
                            dangerouslySetInnerHTML={{
                              __html: rule.FareRuleDetail || rule.FareRules || "Cancellation and date change penalties apply as per airline tariff rules."
                            }}
                          />
                        </div>
                      ));
                    }

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Refund Status</div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: isRefundable ? "#16a34a" : "#dc2626" }}>
                              {isRefundable ? "Refundable Fare" : "Non-Refundable Fare"}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "4px" }}>
                              {isRefundable ? "Refunds permitted minus airline cancellation fees." : "Base fare is non-refundable upon cancellation."}
                            </div>
                          </div>

                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Baggage Policy</div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                              Check-in: {fl.checkInBaggage || "15 Kg"}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "4px" }}>
                              Cabin Baggage: {fl.cabinBaggage || "7 Kg"}
                            </div>
                          </div>
                        </div>

                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px", fontSize: "0.95rem" }}>Cancellation & Reschedule Charges</div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.88rem", color: "#334155", lineHeight: "1.6" }}>
                            <li><strong>Cancellation Fee:</strong> Standard airline cancellation fee + agency service charge applies if cancelled &gt; 4 hours before departure.</li>
                            <li><strong>Date Change / Reschedule:</strong> Airline change fee + fare difference (if any) applies per sector per passenger.</li>
                            <li><strong>No Show:</strong> No refund for cancellations within 4 hours of scheduled departure time.</li>
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="booking-submit-row" style={{ padding: "14px 20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-primary" onClick={handleCloseFareRule}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
