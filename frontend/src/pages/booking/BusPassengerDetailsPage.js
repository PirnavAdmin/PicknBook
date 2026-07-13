import React, { useMemo, useState, useEffect, useRef } from "react";
import { Check, Copy, Mail, Phone, User, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/BusBookingFlow.css";
import BookingTimer from "./BookingTimer";
import {
  readBusBookingFlowState,
  writeBusBookingFlowState,
} from "./busBookingFlowStore";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { listTravelers, normalizeTraveler } from "../../services/travelerService";
import {
  getBusPricingPreview,
  listAvailableBusCoupons,
  getFeaturedBusOffers,
  calculateBusPayableAmount,
  getBusPromotionDiscountAmount,
} from "../../services/busBookingService";
import { usePromo } from "../../contexts/PromoContext";

const TRAVELER_STORAGE_KEY = "my_traveler_data";

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN").format(Number(amount) || 0)}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return "";
  try {
    const match = String(dateString).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    let date;
    if (match) {
      date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
    } else {
      date = new Date(dateString);
    }
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function buildPassengerSeed(selectedSeats, passengers) {
  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.map((passenger, index) => {
      const matchingSeat = selectedSeats?.[index] || {};
      const seatLabel =
        passenger.seatLabel ||
        passenger.seatNumber ||
        passenger.seat ||
        matchingSeat.label ||
        "";

      const fullNameParts = String(passenger.fullName || passenger.name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const gender = String(passenger.gender || "").trim();
      const title =
        passenger.title ||
        (gender === "Female" ? "Ms" : gender === "Male" ? "Mr" : "Mr");

      const savedAge = passenger.age ?? passenger.Age ?? "";

      return {
        ...passenger,
        seatLabel,
        title,
        firstName: passenger.firstName || fullNameParts[0] || "",
        lastName:
          passenger.lastName ||
          (fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : ""),
        age: savedAge ? String(savedAge) : "",
        gender,
        email: passenger.email || "",
        mobile: passenger.mobile || passenger.phone || "",
        phone: passenger.phone || passenger.mobile || "",
        selectedTravelerId: "",
        id: passenger.id || `p-${seatLabel || index + 1}-${index + 1}`,
      };
    });
  }

  return (selectedSeats || []).map((seat, index) => {
    const isFemaleRestricted = seat.bookedGender === "Female" || hasAdjacentFemaleSeat(seat);
    const isMaleRestricted = seat.bookedGender === "Male" || hasAdjacentMaleSeat(seat);
    return {
      seatLabel: seat.label,
      title: isFemaleRestricted ? "Ms" : "Mr",
      firstName: "",
      lastName: "",
      age: "",
      gender: isFemaleRestricted ? "Female" : (isMaleRestricted ? "Male" : ""),
      email: "",
      mobile: "",
      phone: "",
      selectedTravelerId: "",
      id: `p-${seat.label}-${index + 1}`,
    };
  });
}

function getTravelerMobile(traveler) {
  return String(traveler?.mobile || traveler?.phone || traveler?.phoneNo || "").trim();
}

function getTravelerEmail(traveler) {
  return String(traveler?.email || "").trim();
}

function buildContactFromPassenger(passenger, fallback = {}) {
  const email = String(passenger?.email || fallback.email || "").trim();
  const mobile = String(passenger?.mobile || passenger?.phone || fallback.mobile || "").trim();
  const whatsappNumber = fallback.whatsappUpdates
    ? String(fallback.whatsappNumber || mobile || "").trim()
    : String(fallback.whatsappNumber || "").trim();

  return {
    ...fallback,
    email,
    mobile,
    whatsappNumber,
  };
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function normalizeGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  return "";
}

function hasAdjacentFemaleSeat(seat) {
  return Array.isArray(seat?.adjacentBookedGenders)
    ? seat.adjacentBookedGenders.some((gender) => normalizeGender(gender) === "Female")
    : false;
}

function hasAdjacentMaleSeat(seat) {
  return Array.isArray(seat?.adjacentBookedGenders)
    ? seat.adjacentBookedGenders.some((gender) => normalizeGender(gender) === "Male")
    : false;
}



function getCouponDescription(coupon) {
  const code = String(coupon?.couponCode || "").trim().toUpperCase();
  const value = Number(coupon?.value) || 0;
  const isPercent = String(coupon?.couponType || coupon?.cpnType || "")
    .toLowerCase()
    .includes("percent");

  if (coupon?.remark) {
    return coupon.remark;
  }

  if (isPercent) {
    return `Use Coupon ${code} & Get ${value}% OFF`;
  }

  return `Use Coupon ${code} & Get ${formatCurrency(value)} OFF`;
}

function formatCouponErrorMessage(rawMessage) {
  const msg = String(rawMessage || "").trim();
  if (!msg) {
    return "";
  }

  // Check if this is a raw backend stack trace / exception details
  if (
    msg.includes("System.Exception:") ||
    msg.includes("Exception:") ||
    msg.includes("at PickNBook") ||
    msg.includes("Stack trace") ||
    msg.includes("PromotionEngine")
  ) {
    if (msg.includes("Featured offer conditions not met")) {
      return "Featured offer conditions not met. Please review seats, routes, or eligibility criteria.";
    }
    return "This coupon or offer cannot be applied to your current booking. Please check terms.";
  }

  return msg;
}

function getCouponStatus(coupon) {
  return String(coupon.status || "").trim().toLowerCase();
}

function isCouponVisible(coupon) {
  const code = String(coupon?.couponCode || "").trim();
  const status = getCouponStatus(coupon);

  return Boolean(code) && (!status || status === "active");
}

function getFeaturedOfferIdentity(offer) {
  return String(
    offer?.selectedFeaturedOfferId ||
      offer?.id ||
      offer?.offerId ||
      offer?.promotionId ||
      offer?.offerCode ||
      offer?.couponCode ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isSameFeaturedOffer(leftOffer, rightOffer) {
  const leftIdentity = getFeaturedOfferIdentity(leftOffer);
  const rightIdentity = getFeaturedOfferIdentity(rightOffer);

  if (leftIdentity && rightIdentity && leftIdentity === rightIdentity) {
    return true;
  }

  const leftCode = String(leftOffer?.offerCode || leftOffer?.couponCode || "").trim().toLowerCase();
  const rightCode = String(rightOffer?.offerCode || rightOffer?.couponCode || "").trim().toLowerCase();
  if (leftCode && rightCode && leftCode === rightCode) {
    return true;
  }

  const leftTitle = String(leftOffer?.title || "").trim().toLowerCase();
  const rightTitle = String(rightOffer?.title || "").trim().toLowerCase();
  return Boolean(leftTitle && rightTitle && leftTitle === rightTitle);
}

function getPromotionDiscountAmount(pricingPreview, fallbackDiscount = 0) {
  return getBusPromotionDiscountAmount(pricingPreview, fallbackDiscount);
}

function hasBackendConfirmedPromotion(pricingPreview) {
  return Boolean(
    pricingPreview?.appliedPromotionCode ||
      pricingPreview?.appliedPromotionTitle ||
      getPromotionDiscountAmount(pricingPreview, 0) > 0
  );
}

/** Read + normalize travelers from localStorage so structure always matches API shape */
function readLocalTravelers() {
  try {
    const raw = localStorage.getItem(TRAVELER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Run normalizeTraveler on every record so fields are consistent
    return parsed.map((t) => normalizeTraveler(t));
  } catch {
    return [];
  }
}

function attachHorizontalAutoScroller(track) {
  if (!track || typeof window === "undefined") return undefined;

  let frameId = 0;
  let resumeTimer = 0;
  let lastFrameTime = 0;
  let direction = 1;
  let isPaused = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  const hasHorizontalOverflow = () => track.scrollWidth > track.clientWidth + 4;

  const pause = () => {
    isPaused = true;
    window.clearTimeout(resumeTimer);
  };

  const resume = () => {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      isPaused = false;
    }, 700);
  };

  const onPointerDown = (event) => {
    const target = event.target;
    if (
      event.button !== 0 ||
      (target instanceof Element && target.closest("button,a,input,select,textarea"))
    ) {
      return;
    }

    isDragging = true;
    pause();
    dragStartX = event.clientX;
    dragStartScrollLeft = track.scrollLeft;
    track.classList.add("is-dragging");
    track.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!isDragging) return;
    event.preventDefault();
    track.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX);
  };

  const onPointerEnd = (event) => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
    track.releasePointerCapture?.(event.pointerId);
    resume();
  };

  const tick = (time) => {
    if (!lastFrameTime) lastFrameTime = time;
    const delta = Math.min(time - lastFrameTime, 48);
    lastFrameTime = time;

    if (!isPaused && !isDragging && hasHorizontalOverflow()) {
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      track.scrollLeft += delta * 0.035 * direction;

      if (track.scrollLeft >= maxScrollLeft - 1) {
        direction = -1;
      } else if (track.scrollLeft <= 1) {
        direction = 1;
      }
    }

    frameId = window.requestAnimationFrame(tick);
  };

  track.addEventListener("mouseenter", pause);
  track.addEventListener("mouseleave", resume);
  track.addEventListener("focusin", pause);
  track.addEventListener("focusout", resume);
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerEnd);
  track.addEventListener("pointercancel", onPointerEnd);
  frameId = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(resumeTimer);
    track.removeEventListener("mouseenter", pause);
    track.removeEventListener("mouseleave", resume);
    track.removeEventListener("focusin", pause);
    track.removeEventListener("focusout", resume);
    track.removeEventListener("pointerdown", onPointerDown);
    track.removeEventListener("pointermove", onPointerMove);
    track.removeEventListener("pointerup", onPointerEnd);
    track.removeEventListener("pointercancel", onPointerEnd);
  };
}

export default function BusPassengerDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const persistedState = readBusBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.bus ? incomingState : persistedState || {};

  const b2bToken = localStorage.getItem("b2b_token");
  const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
  const isAgent = b2bToken && b2bRole === "agent";

  const bus = flowState.bus || null;
  const selectedSeats = flowState.selectedSeats || [];
  const boardingPoint = flowState.boardingPoint || null;
  const droppingPoint = flowState.droppingPoint || null;

  const { selectedOffer: contextOffer, clearSelectedOffer } = usePromo();

  const validatedContextOffer = useMemo(() => {
    if (!contextOffer) return null;
    const expiryStr = contextOffer.expiry || contextOffer.couponExpiresAtUtc;
    const isExpired = expiryStr ? new Date(expiryStr) < new Date() : false;
    const isBus = String(contextOffer.bookingType || "").toLowerCase() === "bus";
    if (isExpired || !isBus) {
      return null;
    }
    return contextOffer;
  }, [contextOffer]);

  useEffect(() => {
    if (contextOffer && !validatedContextOffer) {
      clearSelectedOffer();
    }
  }, [contextOffer, validatedContextOffer, clearSelectedOffer]);

  const initialFareSummary = flowState.fareSummary || {
    baseFare: selectedSeats.reduce(
      (sum, seat) => sum + (Number(seat.fare) || 0),
      0
    ),
    tax: 0,
    convenienceFee: 0,
    totalFare: selectedSeats.reduce(
      (sum, seat) => sum + (Number(seat.fare) || 0),
      0
    ),
  };
  const [pricingPreview, setPricingPreview] = useState(
    flowState.pricingPreview || {
      subtotalBeforeCoupon:
        Number(initialFareSummary.subtotalBeforeCoupon) ||
        Number(initialFareSummary.baseFare) ||
        0,
      couponAmount:
        Number(initialFareSummary.couponAmount) ||
        Number(flowState.pricingPreview?.couponDiscountAmount) ||
        Number(flowState.couponDiscount) ||
        0,
      taxableFare:
        Number(initialFareSummary.taxableFare) ||
        Math.max(
          0,
          (Number(initialFareSummary.baseFare) || 0) -
            (Number(flowState.couponDiscount) || 0)
        ),
      gstPercent: Number(initialFareSummary.gstPercent) || 0,
      gstAmount:
        Number(initialFareSummary.gstAmount) ||
        Number(initialFareSummary.tax) ||
        0,
      convenienceFee: Number(initialFareSummary.convenienceFee) || 0,
      grandTotal:
        Number(initialFareSummary.grandTotal) ||
        Number(flowState.payableAmount) ||
        Number(initialFareSummary.totalFare) ||
        0,
      seats: Array.isArray(flowState.pricingPreview?.seats)
        ? flowState.pricingPreview.seats
        : [],
    }
  );
  const [basePricingPreview, setBasePricingPreview] = useState(
    flowState.basePricingPreview || flowState.pricingPreview || null
  );
  const fareSummary = useMemo(
    () => {
      let markupValue = 0;
      if (isAgent) {
        const rawMarkup = localStorage.getItem("b2b_markup_settings");
        if (rawMarkup) {
          try {
            const parsedMarkup = JSON.parse(rawMarkup);
            if (parsedMarkup.busType === "percentage") {
              markupValue = (Number(pricingPreview.subtotalBeforeCoupon) || 0) * (Number(parsedMarkup.busValue) / 100);
            } else if (parsedMarkup.busType === "fixed") {
              const seatCount = Array.isArray(selectedSeats) ? selectedSeats.length : 1;
              markupValue = Number(parsedMarkup.busValue) * seatCount;
            }
          } catch (e) {
            console.error("Error reading B2B bus markup in details page", e);
          }
        }
      }

      const calculatedTotal = calculateBusPayableAmount(
        pricingPreview,
        Number(pricingPreview.finalAmount || pricingPreview.grandTotal) || 0
      ) + markupValue;

      return {
        baseFare: Number(pricingPreview.subtotalBeforeCoupon) || 0,
        subtotalBeforeCoupon: Number(pricingPreview.subtotalBeforeCoupon) || 0,
        couponAmount: getPromotionDiscountAmount(pricingPreview, 0),
        taxableFare: Number(pricingPreview.taxableFare) || 0,
        gstPercent: Number(pricingPreview.gstPercent) || 0,
        gstAmount: Number(pricingPreview.gstAmount) || 0,
        tax: Number(pricingPreview.gstAmount) || 0,
        convenienceFee: Number(pricingPreview.convenienceFee) || 0,
        markup: markupValue,
        tierDiscount: 0,
        volumeDiscount: 0,
        grandTotal: calculatedTotal,
        totalFare: calculatedTotal,
      };
    },
    [pricingPreview, isAgent, selectedSeats.length]
  );

  const [passengers, setPassengers] = useState(() =>
    buildPassengerSeed(selectedSeats, flowState.passengers)
  );

  // true = Existing Traveler mode, false = Add New Traveler mode
  const [passengerModes, setPassengerModes] = useState(
    selectedSeats.map(() => false)
  );

  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      // Step 1: Load from localStorage immediately so dropdown is never empty
      const localList = readLocalTravelers();
      if (isMounted && localList.length > 0) {
        setSavedTravelers(localList);
      }

      // Step 2: Try API — merge results with local so nothing is lost
      try {
        const apiList = await listTravelers();
        if (!isMounted) return;

        if (Array.isArray(apiList) && apiList.length > 0) {
          // Merge: API wins on conflict, keep local-only records
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
          // API returned empty but we have local data — keep local
          setSavedTravelers(localList);
        }
      } catch (err) {
        if (!isMounted) return;
        // API failed — already showing local data, just log the warning
        setTravelerLoadError("Using locally saved travelers.");
        console.warn("listTravelers API error:", err.message);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);




  const [contact, setContact] = useState(() => ({
    email: flowState.contact?.email || "",
    mobile: flowState.contact?.mobile || "",
    whatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    whatsappNumber: flowState.contact?.whatsappNumber || "",
  }));
  // ── Separate state for Featured Offer vs Manual Coupon ──
  const [selectedFeaturedOffer, setSelectedFeaturedOffer] = useState(() => {
    if (validatedContextOffer) {
      return {
        ...validatedContextOffer,
        isFeaturedOffer: true,
        promotionId: null,
        selectedFeaturedOfferId:
          validatedContextOffer.selectedFeaturedOfferId ||
          validatedContextOffer.id ||
          validatedContextOffer.offerId ||
          validatedContextOffer.promotionId ||
          null,
        couponCode: null,
      };
    }
    const saved = flowState.selectedOffer;
    if (
      saved?.isFeaturedOffer ||
      Boolean(saved?.selectedFeaturedOfferId) ||
      Boolean(flowState.selectedFeaturedOfferId) ||
      Boolean(saved?.promotionId) ||
      Boolean(flowState.promotionId)
    ) {
      return saved;
    }
    return null;
  });
  const [manualCouponCode, setManualCouponCode] = useState(() => {
    const isFeatured =
      validatedContextOffer !== null ||
      flowState.selectedOffer?.isFeaturedOffer ||
      Boolean(flowState.selectedOffer?.selectedFeaturedOfferId) ||
      Boolean(flowState.selectedFeaturedOfferId) ||
      Boolean(flowState.selectedOffer?.promotionId) ||
      Boolean(flowState.promotionId);
    if (isFeatured) return "";
    return flowState.selectedOffer?.couponCode || flowState.couponCode || "";
  });
  const [couponDiscount, setCouponDiscount] = useState(() => {
    return Number(flowState.couponDiscount) || 0;
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    const isFeatured =
      validatedContextOffer !== null ||
      flowState.selectedOffer?.isFeaturedOffer ||
      Boolean(flowState.selectedOffer?.selectedFeaturedOfferId) ||
      Boolean(flowState.selectedFeaturedOfferId) ||
      Boolean(flowState.selectedOffer?.promotionId) ||
      Boolean(flowState.promotionId);
    if (isFeatured) return null;
    return flowState.appliedCoupon || (flowState.selectedOffer?.couponCode ? { couponCode: flowState.selectedOffer.couponCode } : null);
  });

  useEffect(() => {
    if (validatedContextOffer) {
      clearSelectedOffer();
    }
  }, [validatedContextOffer, clearSelectedOffer]);

  const [couponMessage, setCouponMessage] = useState("");
  const [couponMessageType, setCouponMessageType] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [agreedToFare, setAgreedToFare] = useState(
    Boolean(flowState.agreedToFare)
  );
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formErrorList, setFormErrorList] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const featuredOffersScrollerRef = useRef(null);
  const couponScrollerRef = useRef(null);



  useEffect(() => {
    const cleanups = [
      attachHorizontalAutoScroller(featuredOffersScrollerRef.current),
      attachHorizontalAutoScroller(couponScrollerRef.current),
    ].filter(Boolean);

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [featuredOffers.length, availableCoupons.length]);

  useEffect(() => {
    let isMounted = true;

    const loadCoupons = async () => {
      setIsLoadingCoupons(true);

      try {
        const coupons = await listAvailableBusCoupons();
        if (isMounted) {
          setAvailableCoupons(
            coupons
              .filter((coupon) => isCouponVisible(coupon))
              .sort((firstCoupon, secondCoupon) => {
                const firstDate = new Date(firstCoupon.expiryDate || "").getTime();
                const secondDate = new Date(secondCoupon.expiryDate || "").getTime();
                return (Number.isFinite(firstDate) ? firstDate : 0) -
                  (Number.isFinite(secondDate) ? secondDate : 0);
              })
          );
        }
      } catch {
        if (isMounted) {
          setAvailableCoupons([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCoupons(false);
        }
      }
    };

    loadCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingOffers(true);

    getFeaturedBusOffers()
      .then((offers) => {
        if (isMounted) setFeaturedOffers(offers);
      })
      .catch(() => {
        if (isMounted) setFeaturedOffers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOffers(false);
      });

    return () => { isMounted = false; };
  }, []);

  const totalAfterDiscount = Number(fareSummary.grandTotal) || 0;

  const loadPricingPreview = async (
    { selectedFeaturedOfferId = null, promotionId = null, couponCode = null } = {}
  ) => {
    const busId = bus?.id ?? bus?.busId;
    const seatCodes = selectedSeats
      .map((seat) => seat.label || seat.seatCode || seat)
      .map((seatCode) => String(seatCode || "").trim())
      .filter(Boolean);

    if (!busId || seatCodes.length === 0) {
      throw new Error("Seat selection is missing. Please select seats again.");
    }

    const featuredOfferIdParam =
      selectedFeaturedOfferId !== null && selectedFeaturedOfferId !== undefined && selectedFeaturedOfferId !== ""
        ? selectedFeaturedOfferId
        : promotionId !== null && promotionId !== undefined && promotionId !== ""
        ? promotionId
        : null;
    const couponCodeParam = featuredOfferIdParam
      ? null
      : couponCode
      ? String(couponCode).trim().toUpperCase()
      : null;

    setIsCalculatingPrice(true);
    try {
      const preview = await getBusPricingPreview({
        busId,
        seatCodes,
        couponCode: couponCodeParam,
        promotionId: null,
        selectedFeaturedOfferId: featuredOfferIdParam,
      });

      if (!couponCodeParam && !featuredOfferIdParam) {
        setBasePricingPreview(preview);
      }

      const hasAppliedPromotion = Boolean(couponCodeParam || featuredOfferIdParam);
      const backendCouponDiscount = hasAppliedPromotion
        ? getPromotionDiscountAmount(preview, 0)
        : 0;
      const activeOffer =
        featuredOfferIdParam
          ? selectedFeaturedOffer ||
            featuredOffers.find(
              (offer) =>
                Number(offer.id) === Number(featuredOfferIdParam) ||
                Number(offer.offerId) === Number(featuredOfferIdParam) ||
                Number(offer.selectedFeaturedOfferId) === Number(featuredOfferIdParam)
            ) ||
            validatedContextOffer
          : null;

      setPricingPreview(preview);
      setCouponDiscount(backendCouponDiscount);
      writeBusBookingFlowState({
        pricingPreview: preview,
        couponCode: featuredOfferIdParam ? null : couponCodeParam,
        promotionId: null,
        selectedFeaturedOfferId: featuredOfferIdParam,
        couponDiscount: backendCouponDiscount,
        appliedCoupon: featuredOfferIdParam || !couponCodeParam ? null : { couponCode: couponCodeParam },
        selectedOffer: featuredOfferIdParam ? activeOffer : null,
      });

      return preview;
    } catch (err) {
      console.error("Pricing preview error:", err);
      throw err;
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialFeaturedOfferId = validatedContextOffer
      ? (
          validatedContextOffer.selectedFeaturedOfferId ||
          validatedContextOffer.id ||
          validatedContextOffer.offerId ||
          validatedContextOffer.promotionId ||
          null
        )
      : (
          flowState.selectedFeaturedOfferId ||
          flowState.selectedOffer?.selectedFeaturedOfferId ||
          flowState.selectedOffer?.id ||
          flowState.selectedOffer?.offerId ||
          flowState.promotionId ||
          flowState.selectedOffer?.promotionId ||
          null
        );
    const initialCouponCode = initialFeaturedOfferId ? null : (flowState.couponCode || null);
    loadPricingPreview({ selectedFeaturedOfferId: initialFeaturedOfferId, couponCode: initialCouponCode })
      .then((preview) => {
        if (isMounted) {
          setPricingPreview(preview);
        }
      })
      .catch((error) => {
        if (isMounted) {
          const errMsg = String(error.message || "");
          if (
            errMsg.includes("conditions not met") ||
            errMsg.includes("PromotionEngine") ||
            errMsg.includes("System.Exception")
          ) {
            clearSelectedOffer();
            setSelectedFeaturedOffer(null);
            setAppliedCoupon(null);
            setManualCouponCode("");
            loadPricingPreview();
          } else {
            setFormError(error.message || "Unable to refresh pricing.");
          }
        }
      });

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  if (!bus || selectedSeats.length === 0 || !boardingPoint || !droppingPoint) {
    return (
      <main className="bus-flow-page">
        <div className="bus-flow-shell">
          <section className="bus-flow-empty">
            <h2>Seat selection data missing</h2>
            <p>
              Select seats, boarding, and dropping points before filling
              passenger details.
            </p>
            <button type="button" onClick={() => navigate("/bus/seats")}>
              Back to Seat Selection
            </button>
          </section>
        </div>
      </main>
    );
  }

  const updatePassenger = (index, field, value) => {
    const seat = selectedSeats[index] || {};
    const nextValue = field === "mobile" || field === "phone"
      ? String(value || "").replace(/\D/g, "").slice(0, 13)
      : value;

    // Synchronize title and gender to prevent mismatches
    let targetTitle = field === "title" ? nextValue : undefined;
    let targetGender = field === "gender" ? nextValue : undefined;

    if (field === "title") {
      if (nextValue === "Mr") {
        targetGender = "Male";
      } else if (nextValue === "Mrs" || nextValue === "Ms") {
        targetGender = "Female";
      }
    } else if (field === "gender") {
      if (nextValue === "Male") {
        targetTitle = "Mr";
      } else if (nextValue === "Female") {
        const currentTitle = passengers[index]?.title || "";
        if (currentTitle !== "Mrs" && currentTitle !== "Ms") {
          targetTitle = "Ms";
        }
      }
    }

    const checkGender = targetGender !== undefined ? targetGender : (passengers[index]?.gender || "");

    if (
      normalizeGender(checkGender) === "Male" &&
      (seat.bookedGender === "Female" || hasAdjacentFemaleSeat(seat))
    ) {
      const isReserved = seat.bookedGender === "Female";
      setFormError(
        isReserved
          ? `Seat ${seat.label || seat.seatLabel || ""} is reserved for females. Only female passengers can book this seat.`
          : `Seat ${seat.label || seat.seatLabel || ""} is beside a female-booked seat. Only female passengers can book this seat.`
      );
      return;
    }

    if (
      normalizeGender(checkGender) === "Female" &&
      (seat.bookedGender === "Male" || hasAdjacentMaleSeat(seat))
    ) {
      const isReserved = seat.bookedGender === "Male";
      setFormError(
        isReserved
          ? `Seat ${seat.label || seat.seatLabel || ""} is reserved for males. Only male passengers can book this seat.`
          : `Seat ${seat.label || seat.seatLabel || ""} is beside a male-booked seat. Only male passengers can book this seat.`
      );
      return;
    }

    setFormError("");
    setPassengers((previous) =>
      previous.map((passenger, i) =>
        i === index
          ? {
              ...passenger,
              [field]: nextValue,
              ...(field === "mobile" ? { phone: nextValue } : {}),
              ...(targetTitle !== undefined ? { title: targetTitle } : {}),
              ...(targetGender !== undefined ? { gender: targetGender } : {}),
            }
          : passenger
      )
    );

    if (index === 0 && (field === "email" || field === "mobile" || field === "phone")) {
      const contactField = field === "email" ? "email" : "mobile";
      setContact((prev) => {
        const nextContact = { ...prev, [contactField]: nextValue };
        if (contactField === "mobile" && prev.whatsappUpdates && !prev.whatsappNumber) {
          nextContact.whatsappNumber = nextValue;
        }
        return nextContact;
      });
    }

    if (submitAttempted) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`passenger_${index}_${field}`];
        if (field === "mobile") {
          delete copy[`passenger_${index}_phone`];
        }
        if (index === 0 && (field === "email" || field === "mobile" || field === "phone")) {
          delete copy[`contact_${field === "email" ? "email" : "mobile"}`];
        }
        return copy;
      });
    }
  };

  const updateContactField = (field, value) => {
    setContact((prev) => {
      const copy = { ...prev, [field]: value };
      if (field === "mobile" && prev.whatsappUpdates && !prev.whatsappNumber) {
        copy.whatsappNumber = value;
      }
      return copy;
    });

    if (submitAttempted) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`contact_${field}`];
        if (field === "mobile") {
          delete copy.contact_whatsappNumber;
        }
        return copy;
      });
    }
  };

  const toggleWhatsappUpdates = (checked) => {
    setContact((prev) => ({
      ...prev,
      whatsappUpdates: checked,
      whatsappNumber: checked && !prev.whatsappNumber ? prev.mobile : prev.whatsappNumber,
    }));

    if (submitAttempted) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.contact_whatsappNumber;
        return copy;
      });
    }
  };

  const handleToggleAgree = (checked) => {
    setAgreedToFare(checked);
    if (submitAttempted) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.agreedToFare;
        return copy;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const errorDetails = [];

    // Validate passengers
    passengers.forEach((passenger, index) => {
      const seat = selectedSeats[index] || {};
      const seatLabel = passenger.seatNumber || seat.label || `Seat ${index + 1}`;
      const prefix = `passenger_${index}_`;

      if (!passenger.title) {
        newErrors[`${prefix}title`] = "Required";
        errorDetails.push(`${seatLabel}: Title is required to verify the salutation.`);
      }

      const firstName = String(passenger.firstName || "").trim();
      if (!firstName) {
        newErrors[`${prefix}firstName`] = "Required";
        errorDetails.push(`${seatLabel}: First name is required.`);
      } else if (!/^[A-Za-z\s]+$/.test(firstName)) {
        newErrors[`${prefix}firstName`] = "Letters only";
        errorDetails.push(`${seatLabel}: First name must contain only alphabetical letters.`);
      }

      const lastName = String(passenger.lastName || "").trim();
      if (!lastName) {
        newErrors[`${prefix}lastName`] = "Required";
        errorDetails.push(`${seatLabel}: Last name is required.`);
      } else if (!/^[A-Za-z\s]+$/.test(lastName)) {
        newErrors[`${prefix}lastName`] = "Letters only";
        errorDetails.push(`${seatLabel}: Last name must contain only alphabetical letters.`);
      }

      const ageVal = passenger.age;
      if (ageVal === undefined || ageVal === null || String(ageVal).trim() === "") {
        newErrors[`${prefix}age`] = "Required";
        errorDetails.push(`${seatLabel}: Age is required.`);
      } else {
        const age = Number(ageVal);
        if (Number.isNaN(age) || age < 1 || age > 120) {
          newErrors[`${prefix}age`] = "1-120";
          errorDetails.push(`${seatLabel}: Age must be a number between 1 and 120.`);
        }
      }

      if (!passenger.gender) {
        newErrors[`${prefix}gender`] = "Required";
        errorDetails.push(`${seatLabel}: Gender selection is required.`);
      }


    });

    // Gender Seat Adjacent restriction checks
    passengers.forEach((passenger, index) => {
      const seat = selectedSeats[index] || {};
      const seatLabel = passenger.seatNumber || seat.label || `Seat ${index + 1}`;
      const prefix = `passenger_${index}_`;

      if (passenger.gender) {
        const normGen = normalizeGender(passenger.gender);
        if (normGen === "Male" && (seat.bookedGender === "Female" || hasAdjacentFemaleSeat(seat))) {
          newErrors[`${prefix}gender`] = "Conflict";
          errorDetails.push(
            seat.bookedGender === "Female"
              ? `${seatLabel}: Seat is strictly reserved for females.`
              : `${seatLabel}: Seat is adjacent to a female-only booking. Male passengers cannot book this adjacent seat.`
          );
        }
        if (normGen === "Female" && (seat.bookedGender === "Male" || hasAdjacentMaleSeat(seat))) {
          newErrors[`${prefix}gender`] = "Conflict";
          errorDetails.push(
            seat.bookedGender === "Male"
              ? `${seatLabel}: Seat is strictly reserved for males.`
              : `${seatLabel}: Seat is adjacent to a male-only booking. Female passengers cannot book this adjacent seat.`
          );
        }
      }
    });

    // Validate contact
    if (!contact.email) {
      newErrors.contact_email = "Required";
      errorDetails.push("Contact Email: Email address is required.");
    } else if (!isValidEmail(contact.email)) {
      newErrors.contact_email = "Invalid";
      errorDetails.push("Contact Email: Enter a valid email address (e.g. name@example.com) to receive the e-ticket.");
    }

    if (!contact.mobile) {
      newErrors.contact_mobile = "Required";
      errorDetails.push("Contact Mobile: Mobile number is required.");
    } else if (!isValidMobile(contact.mobile)) {
      newErrors.contact_mobile = "Invalid";
      errorDetails.push("Contact Mobile: Mobile number must be exactly 10 digits to receive SMS updates.");
    }

    if (contact.whatsappUpdates) {
      const whatsappValue = contact.whatsappNumber || contact.mobile;
      if (!whatsappValue) {
        newErrors.contact_whatsappNumber = "Required";
        errorDetails.push("WhatsApp Updates: WhatsApp number is required when WhatsApp updates are enabled.");
      } else if (!isValidMobile(whatsappValue)) {
        newErrors.contact_whatsappNumber = "Invalid";
        errorDetails.push("WhatsApp Updates: WhatsApp number must be exactly 10 digits.");
      }
    }

    // Validate agreement
    if (!agreedToFare) {
      newErrors.agreedToFare = "Required";
      errorDetails.push("Terms Agreement: You must accept the fare rules and booking terms to proceed.");
    }

    // Validate coupon
    if (manualCouponCode.trim() && !appliedCoupon) {
      newErrors.coupon = "Action Needed";
      errorDetails.push("Coupon Code: You entered a coupon code. Click 'APPLY' to redeem the discount, or clear it.");
    }

    setErrors(newErrors);
    setFormErrorList(errorDetails);
    return Object.keys(newErrors).length === 0;
  };

  const setPassengerMode = (index, isExisting) => {
    setPassengerModes((prev) =>
      prev.map((mode, i) => (i === index ? isExisting : mode))
    );
    setPassengers((prev) =>
      prev.map((passenger, i) => {
        if (i !== index) return passenger;
        const isFemaleRestricted = selectedSeats[index]?.bookedGender === "Female" || hasAdjacentFemaleSeat(selectedSeats[index]);
        const isMaleRestricted = selectedSeats[index]?.bookedGender === "Male" || hasAdjacentMaleSeat(selectedSeats[index]);
        return {
          ...passenger,
          selectedTravelerId: "",
          title: isFemaleRestricted ? "Ms" : "Mr",
          firstName: "",
          lastName: "",
          age: "",
          gender: isFemaleRestricted ? "Female" : (isMaleRestricted ? "Male" : ""),
          email: "",
          mobile: "",
          phone: "",
        };
      })
    );

    if (index === 0) {
      setContact((prev) => ({
        ...prev,
        email: "",
        mobile: "",
        whatsappNumber: prev.whatsappUpdates ? "" : prev.whatsappNumber,
      }));
    }
  };

  const handleSelectExistingTraveler = (index, travelerId) => {
    if (!travelerId) {
      setPassengers((prev) =>
        prev.map((passenger, i) =>
          i === index
            ? {
                ...passenger,
                selectedTravelerId: "",
                email: "",
                mobile: "",
                phone: "",
              }
            : passenger
        )
      );
      if (index === 0) {
        setContact((prev) => ({
          ...prev,
          email: "",
          mobile: "",
          whatsappNumber: prev.whatsappUpdates ? "" : prev.whatsappNumber,
        }));
      }
      return;
    }

    const found = savedTravelers.find((t) => String(t.id) === travelerId);
    if (!found) return;

    const seat = selectedSeats[index] || {};
    const travelerGender = normalizeGender(found.gender);

    if (travelerGender === "Male" && (seat.bookedGender === "Female" || hasAdjacentFemaleSeat(seat))) {
      const isReserved = seat.bookedGender === "Female";
      setFormError(
        isReserved
          ? `Seat ${seat.label || seat.seatLabel || ""} is reserved for females. Only female passengers can book this seat.`
          : `Seat ${seat.label || seat.seatLabel || ""} is beside a female-booked seat. Only female passengers can book this seat.`
      );
      return;
    }

    if (travelerGender === "Female" && (seat.bookedGender === "Male" || hasAdjacentMaleSeat(seat))) {
      const isReserved = seat.bookedGender === "Male";
      setFormError(
        isReserved
          ? `Seat ${seat.label || seat.seatLabel || ""} is reserved for males. Only male passengers can book this seat.`
          : `Seat ${seat.label || seat.seatLabel || ""} is beside a male-booked seat. Only male passengers can book this seat.`
      );
      return;
    }

    setFormError("");
    const travelerEmail = getTravelerEmail(found);
    const travelerMobile = getTravelerMobile(found);
    let finalTitle = found.title || "";
    let finalGender = travelerGender || "";
    if (finalTitle === "Mr") {
      finalGender = "Male";
    } else if (finalTitle === "Mrs" || finalTitle === "Ms") {
      finalGender = "Female";
    } else if (finalGender === "Male") {
      finalTitle = "Mr";
    } else if (finalGender === "Female") {
      finalTitle = "Ms";
    }

    setPassengers((prev) =>
      prev.map((passenger, i) =>
        i === index
          ? {
              ...passenger,
              selectedTravelerId: travelerId,
              title:     finalTitle || "Mr",
              firstName: found.firstName || "",
              lastName:  found.lastName  || "",
              gender:    finalGender || "Male",
              age:       found.age       ? String(found.age) : "",
              email:     travelerEmail,
              mobile:    travelerMobile,
              phone:     travelerMobile,
            }
          : passenger
      )
    );

    if (index === 0 || (!contact.email && !contact.mobile)) {
      setContact((prev) =>
        buildContactFromPassenger(
          { email: travelerEmail, mobile: travelerMobile },
          prev
        )
      );
    }
  };

  const handleSelectOffer = async (offer) => {
    const snapshotBase = basePricingPreview;
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");

    const featuredOfferId = offer?.id || offer?.selectedFeaturedOfferId || offer?.offerId || offer?.promotionId;
    if (!featuredOfferId) {
      setCouponMessage("Offer is missing an ID.");
      setCouponMessageType("error");
      setIsApplyingCoupon(false);
      return;
    }

    const pendingOffer = {
      ...offer,
      selectedFeaturedOfferId: featuredOfferId,
      promotionId: null,
      isFeaturedOffer: true,
    };

    setManualCouponCode("");
    setCouponDiscount(0);
    setAppliedCoupon(null);
    if (snapshotBase) setPricingPreview(snapshotBase);

    try {
      const preview = await loadPricingPreview(
        { selectedFeaturedOfferId: featuredOfferId, couponCode: null }
      );

      if (hasBackendConfirmedPromotion(preview)) {
        setSelectedFeaturedOffer(pendingOffer);
        setManualCouponCode("");
        setAppliedCoupon(null);
        setCouponMessage("Offer discount applied successfully.");
        setCouponMessageType("success");
      } else {
        setSelectedFeaturedOffer(null);
        if (snapshotBase) setPricingPreview(snapshotBase);
        setCouponMessage("Offer could not be applied.");
        setCouponMessageType("error");
      }
    } catch (error) {
      setSelectedFeaturedOffer(null);
      if (snapshotBase) setPricingPreview(snapshotBase);
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to apply offer.");
      setCouponMessageType("error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveOffer = async () => {
    clearSelectedOffer();
    setSelectedFeaturedOffer(null);
    setManualCouponCode("");
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponMessageType("");
    try {
      await loadPricingPreview();
    } catch (err) {
      if (basePricingPreview) setPricingPreview(basePricingPreview);
      setCouponMessage(formatCouponErrorMessage(err.message) || "Unable to refresh pricing.");
      setCouponMessageType("error");
    }
  };

  const handleCouponCodeChange = (event) => {
    clearSelectedOffer();
    setSelectedFeaturedOffer(null);
    setManualCouponCode(event.target.value);
    setCouponDiscount(0);
    setAppliedCoupon(null);
    if (basePricingPreview) {
      setPricingPreview(basePricingPreview);
    }
    setCouponMessage("");
    setCouponMessageType("");
  };

  const applyCouponCode = async (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      setCouponMessage("Enter a coupon code.");
      setCouponMessageType("error");
      return null;
    }

    setManualCouponCode(normalized);
    clearSelectedOffer();
    setSelectedFeaturedOffer(null);
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");

    try {
      const snapshotBase = basePricingPreview;
      const preview = await loadPricingPreview(
        { selectedFeaturedOfferId: null, couponCode: normalized }
      );

      const effectiveDiscount = getPromotionDiscountAmount(preview, 0);

      if (effectiveDiscount <= 0) {
        setAppliedCoupon(null);
        if (snapshotBase) setPricingPreview(snapshotBase);
        setCouponMessage("Coupon could not be applied.");
        setCouponMessageType("error");
        return { valid: false, message: "Coupon could not be applied." };
      }

      setAppliedCoupon({ couponCode: normalized });
      setCouponMessage("Coupon applied successfully.");
      setCouponMessageType("success");
      return { valid: true, preview };
    } catch (error) {
      setAppliedCoupon(null);
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to apply coupon right now.");
      setCouponMessageType("error");
      return null;
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSelectCoupon = async (coupon) => {
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");

    const snapshotBase = basePricingPreview;

    try {
      const couponCodeValue = coupon.couponCode ? String(coupon.couponCode).trim().toUpperCase() : null;

      if (couponCodeValue) {
        // This is a manual coupon applied via chip
        clearSelectedOffer();
        setSelectedFeaturedOffer(null);
        setManualCouponCode(couponCodeValue);

        const preview = await loadPricingPreview(
          { selectedFeaturedOfferId: null, couponCode: couponCodeValue }
        );

        const effectiveDiscount = getPromotionDiscountAmount(preview, 0);

        if (effectiveDiscount <= 0) {
          setManualCouponCode("");
          setAppliedCoupon(null);
          if (snapshotBase) setPricingPreview(snapshotBase);
          setCouponMessage("Coupon could not be applied.");
          setCouponMessageType("error");
          return;
        }

        setAppliedCoupon({ couponCode: couponCodeValue });
        setCouponMessage("Coupon applied successfully.");
        setCouponMessageType("success");
      } else {
        // No coupon code — skip
        setCouponMessage("Invalid coupon.");
        setCouponMessageType("error");
      }
    } catch (error) {
      setSelectedFeaturedOffer(null);
      setManualCouponCode("");
      setAppliedCoupon(null);
      if (snapshotBase) setPricingPreview(snapshotBase);
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to apply coupon.");
      setCouponMessageType("error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleApplyCoupon = async () => applyCouponCode(manualCouponCode);

  const handleRemoveCoupon = async () => {
    clearSelectedOffer();
    setSelectedFeaturedOffer(null);
    setManualCouponCode("");
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponMessageType("");
    try {
      await loadPricingPreview();
    } catch (error) {
      if (basePricingPreview) setPricingPreview(basePricingPreview);
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to refresh pricing.");
      setCouponMessageType("error");
    }
  };



  const handleOpenConfirmation = async () => {
    setSubmitAttempted(true);
    const isValid = validateForm();
    if (!isValid) {
      setFormError("Please correct the errors in the form to proceed.");
      return;
    }
    setFormError("");
    setShowConfirmation(true);
  };

  const handleProceedPayment = async () => {
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

    const cleanedPassengers = passengers.map((passenger) => {
      const ageNumber = Number(passenger.age);
      return {
        ...passenger,
        firstName: String(passenger.firstName || "").trim(),
        lastName: String(passenger.lastName || "").trim(),
        email: String(passenger.email || "").trim(),
        mobile: String(passenger.mobile || passenger.phone || "").trim(),
        phone: String(passenger.mobile || passenger.phone || "").trim(),
        age: ageNumber,
        Age: ageNumber,
      };
    });
    const bookingContact = buildContactFromPassenger(cleanedPassengers[0], contact);

    const isFeatured = Boolean(selectedFeaturedOffer);
    const finalCouponCode = isFeatured ? null : (appliedCoupon?.couponCode || manualCouponCode || null);
    const finalFeaturedOfferId = isFeatured
      ? (
          selectedFeaturedOffer.selectedFeaturedOfferId ||
          selectedFeaturedOffer.id ||
          selectedFeaturedOffer.offerId ||
          selectedFeaturedOffer.promotionId ||
          null
        )
      : null;

    const payload = {
      ...flowState,
      passengers: cleanedPassengers,
      contact: bookingContact,
      couponCode: finalCouponCode,
      promotionId: null,
      selectedFeaturedOfferId: finalFeaturedOfferId,
      couponDiscount,
      appliedCoupon: isFeatured ? null : (appliedCoupon || (finalCouponCode ? { couponCode: finalCouponCode } : null)),
      selectedOffer: isFeatured ? selectedFeaturedOffer : null,
      pricingPreview,
      basePricingPreview,
      agreedToFare,
      payableAmount: totalAfterDiscount,
      fareSummary,
    };

    writeBusBookingFlowState(payload);
    navigate("/bus/payment", { state: payload });
  };

  const renderPassengerFields = (passenger, index) => {
    const seat = selectedSeats[index] || {};
    const isFemaleOnlySeat = hasAdjacentFemaleSeat(seat);
    const isMaleOnlySeat = hasAdjacentMaleSeat(seat);

    return (
      <div className="passenger-fields">
        <label className="passenger-field">
          <span>Title *</span>
          <select
            value={passenger.title}
            onChange={(e) => updatePassenger(index, "title", e.target.value)}
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
            onChange={(e) => updatePassenger(index, "firstName", e.target.value)}
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
            onChange={(e) => updatePassenger(index, "lastName", e.target.value)}
            className={errors[`passenger_${index}_lastName`] ? "field-has-error" : ""}
          />
          {errors[`passenger_${index}_lastName`] && (
            <span className="field-error-text">{errors[`passenger_${index}_lastName`]}</span>
          )}
        </label>

        <label className="passenger-field">
          <span>Age *</span>
          <input
            type="number"
            placeholder="Age *"
            value={passenger.age}
            onChange={(e) => updatePassenger(index, "age", e.target.value)}
            className={errors[`passenger_${index}_age`] ? "field-has-error" : ""}
          />
          {errors[`passenger_${index}_age`] && (
            <span className="field-error-text">{errors[`passenger_${index}_age`]}</span>
          )}
        </label>

        <label className="passenger-field">
          <span>Gender *</span>
          <select
            value={passenger.gender}
            onChange={(e) => updatePassenger(index, "gender", e.target.value)}
            className={errors[`passenger_${index}_gender`] ? "field-has-error" : ""}
          >
            <option value="">Gender *</option>
            <option value="Male" disabled={isFemaleOnlySeat}>Male</option>
            <option value="Female" disabled={isMaleOnlySeat}>Female</option>
          </select>
          {errors[`passenger_${index}_gender`] && (
            <span className="field-error-text">{errors[`passenger_${index}_gender`]}</span>
          )}
          {isFemaleOnlySeat && !errors[`passenger_${index}_gender`] && (
            <small className="passenger-restriction-note">
              Female passenger required.
            </small>
          )}
          {isMaleOnlySeat && !errors[`passenger_${index}_gender`] && (
            <small className="passenger-restriction-note">
              Male passenger required.
            </small>
          )}
        </label>


      </div>
    );
  };

  return (
    <main className="bus-flow-page">
      <BookingTimer />
      <div className="bus-flow-shell">
        <section className="bus-passenger-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="bus-passenger-main">

            {/* Bus Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M4 18v2a1 1 0 0 0 1 1h1" />
                    <path d="M18 18v2a1 1 0 0 0 1 1h1" />
                    <path d="M4 10h16" />
                  </svg>
                </span>
                Bus Details
              </header>
              <div className="flow-card-body">
                <div className="bus-journey-grid">
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold', display: 'block' }}>
                      {bus.fromCity} → {bus.toCity}
                    </strong>
                    <span className="date-badge">
                      {formatDateLabel(
                        flowState.searchContext?.departureDate || bus.departureDate
                      )}
                    </span>
                  </div>
                  <div>
                    <small>Depart Time</small>
                    <strong>{bus.departureTime}</strong>
                  </div>
                  <div className="journey-timeline-center">
                    <div className="timeline-line-wrap">
                      <div className="timeline-dot"></div>
                      <div className="timeline-line"></div>
                      <span className="timeline-bus-icon">🚌</span>
                      <div className="timeline-line"></div>
                      <div className="timeline-dot"></div>
                    </div>
                    <span className="timeline-duration">{bus.duration}</span>
                  </div>
                  <div>
                    <small>Arrival Time</small>
                    <strong>{bus.arrivalTime}</strong>
                  </div>
                  <div>
                    <small>Seat No</small>
                    <strong>
                      {selectedSeats.map((s) => s.label).join(", ")}
                    </strong>
                  </div>
                </div>

                <div className="bus-journey-points-row">
                  <div className="journey-point">
                    <span className="point-header">Bus Operator</span>
                    <p>{bus.operatorName}</p>
                    <small>{bus.busType}</small>
                  </div>
                  <div className="journey-point">
                    <span className="point-header">Boarding Time &amp; Address</span>
                    <strong>{boardingPoint.time}</strong>
                    <p>{boardingPoint.name}</p>
                    <small>{boardingPoint.address}</small>
                  </div>
                  <div className="journey-point">
                    <span className="point-header">Dropping Time &amp; Address</span>
                    <strong>{droppingPoint.time}</strong>
                    <p>{droppingPoint.name}</p>
                    <small>{droppingPoint.address}</small>
                  </div>
                </div>
              </div>
            </article>

            {/* Passenger Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Passenger Details
              </header>
              <div className="flow-card-body">
                {passengers.map((passenger, index) => {
                  const isExisting = passengerModes[index];

                  return (
                    <div className="passenger-row" key={passenger.id}>

                      <h4>
                        Passenger {index + 1}
                        <span>(Seat {passenger.seatLabel})</span>
                      </h4>

                      {/* ── Mode Toggle ── */}
                      <div className="passenger-mode-toggle">
                        <button
                          type="button"
                          className={`pmode-btn${isExisting ? " pmode-btn--active" : ""}`}
                          onClick={() => setPassengerMode(index, true)}
                        >
                          Existing Traveler
                        </button>
                        <button
                          type="button"
                          className={`pmode-btn${!isExisting ? " pmode-btn--active" : ""}`}
                          onClick={() => setPassengerMode(index, false)}
                        >
                          Add New Traveler
                        </button>
                      </div>

                      {/* ── Existing Traveler ── */}
                      {isExisting ? (
                        <div className="passenger-existing-wrap">
                          {travelerLoadError && (
                            <p className="pmode-warn">{travelerLoadError}</p>
                          )}

                          <select
                            className="passenger-existing-select"
                            value={passenger.selectedTravelerId || ""}
                            onChange={(e) =>
                              handleSelectExistingTraveler(index, e.target.value)
                            }
                          >
                            <option value="">-- Select Existing Traveler --</option>
                            {savedTravelers.length === 0 ? (
                              <option disabled>No saved travelers found</option>
                            ) : (
                              savedTravelers.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                  {[t.title, t.firstName, t.lastName]
                                    .filter(Boolean)
                                    .join(" ")}
                                  {t.mobile
                                    ? ` — ${t.mobile}`
                                    : t.email
                                    ? ` — ${t.email}`
                                    : ""}
                                </option>
                              ))
                            )}
                          </select>

                          {passenger.selectedTravelerId &&
                            renderPassengerFields(passenger, index)}
                        </div>
                      ) : (
                        renderPassengerFields(passenger, index)
                      )}
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Contact Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                Contact Details
              </header>
              <div className="flow-card-body contact-grid">
                <label>
                  <span>Enter Your Email: *</span>
                  <div className={`contact-input ${errors.contact_email ? "field-has-error" : ""}`}>
                    <Mail size={14} />
                    <input
                      type="email"
                      placeholder="Email id *"
                      value={contact.email}
                      onChange={(e) => updateContactField("email", e.target.value)}
                    />
                  </div>
                  {errors.contact_email && (
                    <span className="field-error-text">{errors.contact_email}</span>
                  )}
                </label>

                <label>
                  <span>Enter Your Mobile: *</span>
                  <div className={`contact-input ${errors.contact_mobile ? "field-has-error" : ""}`}>
                    <Phone size={14} />
                    <input
                      type="text"
                      placeholder="Mobile *"
                      value={contact.mobile}
                      onChange={(e) => updateContactField("mobile", e.target.value)}
                    />
                  </div>
                  {errors.contact_mobile && (
                    <span className="field-error-text">{errors.contact_mobile}</span>
                  )}
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span>WhatsApp Updates:</span>
                  <div
                    className={`contact-input ${errors.contact_whatsappNumber ? "field-has-error" : ""}`}
                    style={{ gridTemplateColumns: "auto 1fr" }}
                  >
                    <input
                      type="checkbox"
                      checked={contact.whatsappUpdates}
                      onChange={(e) => toggleWhatsappUpdates(e.target.checked)}
                      style={{ width: 16, height: 16, margin: 0 }}
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp no. (defaults to mobile)"
                      value={contact.whatsappNumber}
                      onChange={(e) => updateContactField("whatsappNumber", e.target.value)}
                      disabled={!contact.whatsappUpdates}
                    />
                  </div>
                  {errors.contact_whatsappNumber && (
                    <span className="field-error-text">{errors.contact_whatsappNumber}</span>
                  )}
                </label>
              </div>
            </article>

            {/* Acknowledgement */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                Acknowledgement
              </header>
              <div className="flow-card-body acknowledgement">
                <label className={`ack-checkbox ${errors.agreedToFare ? "field-has-error-text" : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreedToFare}
                    onChange={(e) => handleToggleAgree(e.target.checked)}
                  />
                  <span>
                    I agree to the rules and restrictions of this fare, and the
                    terms of this fare. <span className="mandatory-star" style={{ color: 'red', fontWeight: 'bold', marginLeft: '4px' }}>*</span>
                  </span>
                </label>
                {errors.agreedToFare && (
                  <span className="field-error-text" style={{ marginTop: '2px' }}>{errors.agreedToFare}</span>
                )}

                <div className="ack-pay-strip">
                  <span>Travel....</span>
                  <small>VISA Mastercard RuPay UPI</small>
                </div>

                {formError && (
                  <div className="form-error-summary-box">
                    <div className="error-summary-header">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>Please correct the following issues to proceed:</span>
                    </div>
                    <ul className="error-summary-list">
                      {formErrorList.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="flow-continue-btn align-right"
                  onClick={handleOpenConfirmation}
                >
                  Continue
                </button>
              </div>
            </article>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="bus-passenger-side">
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
                </span>
                Fare Details
              </header>
              <div className="flow-card-body fare-list">
                {isCalculatingPrice ? (
                  <div className="skeleton-loader-container" style={{ padding: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "120px" }}></div>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "60px" }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "90px" }}></div>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "50px" }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "100px" }}></div>
                      <div className="skeleton-line pulse" style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "40px" }}></div>
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div className="skeleton-line pulse" style={{ height: "20px", backgroundColor: "#d1d5db", borderRadius: "4px", width: "80px" }}></div>
                      <div className="skeleton-line pulse" style={{ height: "20px", backgroundColor: "#d1d5db", borderRadius: "4px", width: "70px" }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <span>Base Fare</span>
                      <strong>{formatCurrency(pricingPreview.subtotalBeforeCoupon)}</strong>
                    </div>
                    {Number(pricingPreview.autoDiscountAmount) > 0 && (
                      <div>
                        <span>Auto Discount</span>
                        <strong>(-) {formatCurrency(pricingPreview.autoDiscountAmount)}</strong>
                      </div>
                    )}
                    {/* Coupon Discount Row */}
                    {(() => {
                      const appliedCode = pricingPreview.appliedPromotionCode || appliedCoupon?.couponCode;
                      const hasCoupon = Boolean(appliedCoupon || appliedCode) && !selectedFeaturedOffer;
                      const couponAmount = hasCoupon
                        ? getPromotionDiscountAmount(pricingPreview, couponDiscount)
                        : 0;
                      return hasCoupon && couponAmount > 0 ? (
                        <div>
                          <span>Coupon Discount ({appliedCode})</span>
                          <strong>(-) {formatCurrency(couponAmount)}</strong>
                        </div>
                      ) : null;
                    })()}

                    {/* Offer Discount Row */}
                    {(() => {
                      const isFeaturedActive = Boolean(selectedFeaturedOffer);
                      const offerAmount = isFeaturedActive
                        ? getPromotionDiscountAmount(pricingPreview, couponDiscount)
                        : 0;
                      return isFeaturedActive && offerAmount > 0 ? (
                        <div>
                          <span>Offer Discount ({selectedFeaturedOffer?.title || ""})</span>
                          <strong>(-) {formatCurrency(offerAmount)}</strong>
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <span>Tax</span>
                      <strong>(+) {formatCurrency(pricingPreview.gstAmount)}</strong>
                    </div>
                    <div>
                      <span>Convenience Fee</span>
                      <strong>(+) {formatCurrency(pricingPreview.convenienceFee)}</strong>
                    </div>
                    <div className="grand-total">
                      <span>Grand Total</span>
                      <strong>{formatCurrency(fareSummary.grandTotal)}</strong>
                    </div>
                  </>
                )}
              </div>
            </article>

            {/* Coupons & Featured Offers */}
            {!isAgent && (
              <article className="flow-card coupon-sheet-card">
                <header className="coupon-sheet-header">
                  <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </span>
                  <span>Apply Coupon</span>
                  {(isLoadingCoupons || isLoadingOffers || isApplyingCoupon) && (
                    <span className="coupon-sheet-loading">Loading...</span>
                  )}
                </header>
                <div className="flow-card-body coupon-sheet-body">

                  <div className={`coupon-manual-row ${errors.coupon ? "field-has-error" : ""}`}>
                    <input
                      type="text"
                      placeholder="Enter Coupon code"
                      value={manualCouponCode}
                      onChange={handleCouponCodeChange}
                      disabled={isApplyingCoupon || Boolean(selectedFeaturedOffer)}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="coupon-action-button is-remove"
                      >Remove</button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !manualCouponCode.trim() || Boolean(selectedFeaturedOffer)}
                        className="coupon-action-button is-apply"
                      >{isApplyingCoupon ? "Applying..." : "APPLY"}</button>
                    )}
                  </div>
                  {errors.coupon && (
                    <span className="field-error-text" style={{ marginTop: '2px' }}>{errors.coupon}</span>
                  )}
                  {selectedFeaturedOffer && (
                    <p className="coupon-featured-note">
                      Featured offer applied. Remove it to use a manual coupon.
                    </p>
                  )}

                  {couponMessage && (
                    <p className={`coupon-sheet-message ${couponMessageType === "success" ? "is-success" : "is-error"}`}>
                      {couponMessage}
                    </p>
                  )}

                  {/* ── Featured Offer Cards ── */}
                  {featuredOffers.length > 0 && (
                    <div className="coupon-featured-block">
                      <p className="coupon-section-label">Featured Offers:</p>
                      <div
                        className="coupon-featured-list"
                        ref={featuredOffersScrollerRef}
                        aria-label="Featured offers carousel"
                      >
                        {featuredOffers.map((offer) => {
                          const isThisSelected = isSameFeaturedOffer(selectedFeaturedOffer, offer);
                          const anotherOfferSelected = Boolean(selectedFeaturedOffer) && !isThisSelected;
                          const discountLabel = offer.isPercentageDiscount
                              ? `${offer.discountValue}% OFF`
                              : `₹${offer.discountValue} OFF`;
                          const appliedTitle = isThisSelected && pricingPreview.appliedPromotionTitle
                              ? pricingPreview.appliedPromotionTitle
                              : offer.title;

                          const code = offer.couponCode || "OFFER";

                          return (
                            <div
                              key={offer.offerId || offer.id || offer.couponCode}
                              className={`coupon-voucher-card coupon-featured-offer${isThisSelected ? " is-selected" : ""}${
                                anotherOfferSelected ? " is-muted" : ""
                              }`}
                            >
                              <div className="voucher-header">
                                <span className="voucher-discount">{discountLabel}</span>
                                <div className="voucher-code-wrapper">
                                  <span className="voucher-code-badge">{code}</span>
                                  <button
                                    type="button"
                                    className="voucher-copy-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(code);
                                      setCopiedCode(code);
                                      setTimeout(() => setCopiedCode(null), 2000);
                                    }}
                                    title="Copy Coupon Code"
                                  >
                                    {copiedCode === code ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </div>
                              <div className="voucher-body">
                                <div className="voucher-title">{appliedTitle}</div>
                                <p className="voucher-description">{offer.subtitle || offer.description}</p>
                                <div className="voucher-action-row">
                                  {isThisSelected ? (
                                    <button
                                      type="button"
                                      onClick={handleRemoveOffer}
                                      disabled={isApplyingCoupon}
                                      className="voucher-remove-btn"
                                    >Remove</button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectOffer(offer)}
                                      disabled={isApplyingCoupon || anotherOfferSelected}
                                      className="voucher-apply-btn"
                                    >{isApplyingCoupon && isThisSelected ? "Applying..." : "Apply"}</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Coupon Cards ── */}
                  {availableCoupons.length > 0 && (
                    <div className="coupon-chip-block">
                      <p className="coupon-section-label">Available Coupons:</p>
                      <div
                        className="coupon-chip-list"
                        ref={couponScrollerRef}
                        aria-label="Available coupons carousel"
                      >
                        {availableCoupons.map((coupon, idx) => {
                          const code = coupon.couponCode || `Promo #${coupon.id}`;
                          const value = Number(coupon?.value) || 0;
                          const isPercent = String(coupon?.couponType || coupon?.cpnType || "")
                              .toLowerCase()
                              .includes("percent");
                          const discountLabel = isPercent
                              ? `${value}% OFF`
                              : `₹${value} OFF`;
                          const description = getCouponDescription(coupon);
                          const isChipSelected = appliedCoupon?.couponCode === coupon.couponCode;
                          const anotherOfferSelected = Boolean(selectedFeaturedOffer);

                          return (
                            <div
                              key={coupon.id || idx}
                              className={`coupon-voucher-card${isChipSelected ? " is-selected" : ""}${
                                anotherOfferSelected ? " is-muted" : ""
                              }`}
                            >
                              <div className="voucher-header">
                                <span className="voucher-discount">{discountLabel}</span>
                                <div className="voucher-code-wrapper">
                                  <span className="voucher-code-badge">{code}</span>
                                  <button
                                    type="button"
                                    className="voucher-copy-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(code);
                                      setCopiedCode(code);
                                      setTimeout(() => setCopiedCode(null), 2000);
                                    }}
                                    title="Copy Coupon Code"
                                  >
                                    {copiedCode === code ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </div>
                              <div className="voucher-body">
                                <div className="voucher-title">{code}</div>
                                <p className="voucher-description">{description}</p>
                                <div className="voucher-action-row">
                                  {isChipSelected ? (
                                    <button
                                      type="button"
                                      onClick={handleRemoveCoupon}
                                      disabled={isApplyingCoupon}
                                      className="voucher-remove-btn"
                                    >Remove</button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCoupon(coupon)}
                                      disabled={isApplyingCoupon || anotherOfferSelected}
                                      className="voucher-apply-btn"
                                    >Apply</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )}
          </aside>

        </section>

        {/* ── Confirmation Modal ── */}
        {showConfirmation && (
          <div
            className="flow-modal-backdrop"
            onClick={() => setShowConfirmation(false)}
          >
            <section
              className="flow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flow-modal-header">
                <h3>Please Confirm your Bus</h3>
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flow-modal-grid">
                <div className="flow-modal-main">
                  <article className="flow-card compact">
                    <header>Journey Details</header>
                    <div className="flow-card-body">
                      <p><strong>{bus.fromCity} - {bus.toCity}</strong></p>
                      <p>{bus.departureTime} to {bus.arrivalTime} | {bus.duration}</p>
                      <p>Boarding: {boardingPoint.name} ({boardingPoint.time})</p>
                      <p>Dropping: {droppingPoint.name} ({droppingPoint.time})</p>
                    </div>
                  </article>

                  <article className="flow-card compact">
                    <header>Passenger Detail</header>
                    <div className="flow-card-body detail-list">
                      {passengers.map((passenger) => (
                        <div key={passenger.id}>
                          <User size={14} />
                          <span>
                            {passenger.title} {passenger.firstName}{" "}
                            {passenger.lastName} (Seat {passenger.seatLabel})
                            {passenger.gender && ` (${passenger.gender[0].toUpperCase()})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="flow-card compact">
                    <header>Contact Detail</header>
                    <div className="flow-card-body detail-list">
                      <div>
                        <Mail size={14} />
                        <span>{contact.email}</span>
                      </div>
                      <div>
                        <Phone size={14} />
                        <span>{contact.mobile}</span>
                      </div>
                    </div>
                  </article>
                </div>

                <aside className="flow-modal-side">
                  <article className="flow-card compact">
                    <header>Fare Details</header>
                    <div className="flow-card-body fare-list">
                      <div>
                        <span>Base Fare</span>
                                <strong>{formatCurrency(pricingPreview.subtotalBeforeCoupon)}</strong>
                      </div>
                      {Number(pricingPreview.autoDiscountAmount) > 0 && (
                        <div>
                          <span>Auto Discount</span>
                          <strong>(-) {formatCurrency(pricingPreview.autoDiscountAmount)}</strong>
                        </div>
                      )}
                      {/* Coupon Discount Row */}
                      {(() => {
                        const appliedCode = pricingPreview.appliedPromotionCode || appliedCoupon?.couponCode;
                        const hasCoupon = Boolean(appliedCoupon || appliedCode) && !selectedFeaturedOffer;
                        const couponAmount = hasCoupon
                          ? getPromotionDiscountAmount(pricingPreview, couponDiscount)
                          : 0;
                        return hasCoupon && couponAmount > 0 ? (
                          <div>
                            <span>Coupon Discount ({appliedCode})</span>
                            <strong>(-) {formatCurrency(couponAmount)}</strong>
                          </div>
                        ) : null;
                      })()}

                      {/* Offer Discount Row */}
                      {(() => {
                        const isFeaturedActive = Boolean(selectedFeaturedOffer);
                        const offerAmount = isFeaturedActive
                          ? getPromotionDiscountAmount(pricingPreview, couponDiscount)
                          : 0;
                        return isFeaturedActive && offerAmount > 0 ? (
                          <div>
                            <span>Offer Discount ({selectedFeaturedOffer?.title || ""})</span>
                            <strong>(-) {formatCurrency(offerAmount)}</strong>
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <span>Tax</span>
                        <strong>(+) {formatCurrency(pricingPreview.gstAmount)}</strong>
                      </div>
                      <div>
                        <span>Convenience Fee</span>
                        <strong>(+) {formatCurrency(pricingPreview.convenienceFee)}</strong>
                      </div>
                      <div className="grand-total">
                        <span>Total Fare</span>
                        <strong>{formatCurrency(fareSummary.grandTotal)}</strong>
                      </div>
                    </div>
                  </article>

                  <div className="flow-modal-actions">
                    <button
                      type="button"
                      className="cancel"
                      onClick={() => setShowConfirmation(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="proceed"
                      onClick={handleProceedPayment}
                    >
                      Proceed Payment
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
