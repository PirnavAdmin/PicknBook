/* eslint-disable */
import React, { useState, useEffect } from "react";
import { Loader2, Copy, Check, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  bookBus,
  getBusPricingPreview,
  calculateBusPayableAmount,
  getBusPromotionDiscountAmount,
  listAvailableBusCoupons,
  getFeaturedBusOffers,
  isBusCategoryOfferOrCoupon,
} from "../../services/busBookingService";
import { sendBookingNotifications } from "../../services/bookingNotificationsService";
import "../../STYLES/BusBookingFlow.css";
import BookingTimer from "./BookingTimer";
import { saveBookingPassengersToTravelers } from "../../utils/travelerStorage";
import {
  clearBusBookingFlowState,
  readBusBookingFlowState,
} from "./busBookingFlowStore";
import { getAccountProfile } from "../../services/accountProfileService";
import { getLedgerStatement } from "../../services/b2bService";
import {
  UpiIcon,
  CardIcon,
  NetBankingIcon,
  WalletIcon,
  PaytmIcon,
  PhonePeIcon,
  AmazonPayIcon,
  CustomWalletSelect,
} from "../../components/PaymentIcons";

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN").format(Number(amount) || 0)}`;
}

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: UpiIcon },
  { id: "card", label: "Credit / Debit Card", icon: CardIcon },
  { id: "netbanking", label: "Net Banking", icon: NetBankingIcon },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

const WALLET_OPTIONS = [
  { id: "paytm", label: "Paytm", icon: PaytmIcon },
  { id: "amazonpay", label: "Amazon Pay", icon: AmazonPayIcon },
  { id: "phonepe", label: "PhonePe Wallet", icon: PhonePeIcon },
];

function buildBookingPayload(flowState) {
  const firstPassenger = flowState.passengers?.[0] || {};
  const mobile = String(flowState.contact?.mobile || "").trim();

  const selectedSeats = Array.isArray(flowState.selectedSeats)
    ? flowState.selectedSeats
    : [];

  const fallbackPassengers = selectedSeats.map((seat, index) => {
    const seatNumber = String(seat?.label || "").trim();

    return {
      fullName: `Passenger ${index + 1}`,
      FullName: `Passenger ${index + 1}`,
      age: 25,
      Age: 25,
      gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      Gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
      BaseFare: Number(seat?.srdvBaseFare !== undefined ? seat?.srdvBaseFare : (seat?.fare || seat?.baseFare || 0)),
      SeatType: String(seat?.kind || seat?.seatType || "Seater").charAt(0).toUpperCase() + String(seat?.kind || seat?.seatType || "Seater").slice(1),
      ExternalGst: Number(seat?.srdvTax !== undefined ? seat?.srdvTax : (seat?.tax || 0))
    };
  });

  const normalizedPassengers =
    Array.isArray(flowState.passengers) && flowState.passengers.length > 0
      ? flowState.passengers.map((passenger, index) => {
          const fullName = `${passenger.title || ""} ${
            passenger.firstName || ""
          } ${passenger.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim();

          const rawSeat =
            selectedSeats[index]?.label || passenger.seatLabel || "";
          const seatNumber = String(rawSeat).trim();

          const normalizedTitle = String(passenger.title || "").toLowerCase();
          const passengerGender = String(passenger.gender || "").trim();

          const ageNumber = Number(passenger.age ?? passenger.Age);

          return {
            fullName: fullName || `Passenger ${index + 1}`,
            FullName: fullName || `Passenger ${index + 1}`,
            age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            Age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            Gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
            BaseFare: Number(selectedSeats[index]?.srdvBaseFare !== undefined ? selectedSeats[index]?.srdvBaseFare : (selectedSeats[index]?.fare || selectedSeats[index]?.baseFare || 0)),
            SeatType: String(selectedSeats[index]?.kind || selectedSeats[index]?.seatType || "Seater").charAt(0).toUpperCase() + String(selectedSeats[index]?.kind || selectedSeats[index]?.seatType || "Seater").slice(1),
            ExternalGst: Number(selectedSeats[index]?.srdvTax !== undefined ? selectedSeats[index]?.srdvTax : (selectedSeats[index]?.tax || 0))
          };
        })
      : fallbackPassengers;

  return {
    passengerName: `${firstPassenger.title || ""} ${
      firstPassenger.firstName || ""
    } ${firstPassenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim(),
    passengerPhone: mobile,
    passengerEmail: String(flowState.contact?.email || "").trim(),
    couponCode: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      const hasPromo = pId !== undefined && pId !== null && pId !== "";
      return hasPromo ? null : (flowState.couponCode || null);
    })(),
    promotionId: null,
    selectedFeaturedOfferId: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      if (pId !== undefined && pId !== null && pId !== "") {
        const numericId = Number(pId);
        return Number.isNaN(numericId) ? null : numericId;
      }
      return null;
    })(),
    seats: normalizedPassengers.length,
    seatCodes: selectedSeats
      .map((seat) => seat.label || seat.seatCode || seat)
      .map((seatCode) => String(seatCode || "").trim())
      .filter(Boolean),
    passengerWhatsapp: String(
      flowState.contact?.whatsappNumber || flowState.contact?.mobile || ""
    ).trim(),
    sendEmailUpdates: Boolean(flowState.contact?.email),
    sendSmsUpdates: Boolean(flowState.contact?.mobile),
    sendWhatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    passengers: normalizedPassengers,
    routeId: String(flowState.bus?.routeId || ""),
    traceId: String(flowState.bus?.traceId || ""),
    resultIndex: String(flowState.bus?.resultIndex || flowState.bus?.id || ""),
    srdvIndex: Number(flowState.bus?.srdvIndex || 0),
    srdvBlockKey: String(flowState.blockKey || ""),
    fromCity: String(flowState.bus?.fromCity || flowState.searchContext?.fromCity?.name || flowState.searchContext?.fromCity || ""),
    toCity: String(flowState.bus?.toCity || flowState.searchContext?.toCity?.name || flowState.searchContext?.toCity || ""),
    departureTime: [flowState.searchContext?.departureDate, flowState.bus?.departureTimeUtc || flowState.bus?.departureTimeIst || flowState.bus?.departureTime || ""].filter(Boolean).join(" "),
    arrivalTime: String(flowState.bus?.arrivalTimeUtc || flowState.bus?.arrivalTimeIst || flowState.bus?.arrivalTime || ""),
    operatorName: String(flowState.bus?.operatorName || ""),
    busType: String(flowState.bus?.busType || ""),
    isIdProofRequired: Boolean(flowState.bus?.idProofRequired || flowState.bus?.IdProofRequired || flowState.bus?.isIdProofRequired || flowState.bus?.IsIdProofRequired),
    totalFare: Number(flowState.bus?.priceInr || flowState.bus?.displayFare || flowState.bus?.fare || 0),
    BoardingPointId: flowState.boardingPoint?.id ? String(flowState.boardingPoint.id) : null,
    boardingPointName: String(flowState.boardingPoint?.name || flowState.boardingPointName || ""),
    boardingPointTime: flowState.boardingPoint?.time ? String(flowState.boardingPoint.time) : null,
    DroppingPointId: flowState.droppingPoint?.id ? String(flowState.droppingPoint.id) : null,
    droppingPointName: String(flowState.droppingPoint?.name || flowState.droppingPointName || ""),
    droppingPointTime: flowState.droppingPoint?.time ? String(flowState.droppingPoint.time) : null,
  };
}

function isPaymentInputValid(method, formValues) {
  if (method === "agent_wallet") {
    return true;
  }

  if (method === "upi") {
    return /\S+@\S+/.test(formValues.upiId || "");
  }

  if (method === "card") {
    return (
      String(formValues.cardNumber || "").replace(/\D/g, "").length >= 12 &&
      String(formValues.nameOnCard || "").trim().length >= 2 &&
      String(formValues.expiry || "").trim().length >= 4 &&
      String(formValues.cvv || "").replace(/\D/g, "").length >= 3
    );
  }

  if (method === "netbanking") {
    return Boolean(formValues.bankName);
  }

  if (method === "wallet") {
    return Boolean(formValues.walletProvider);
  }

  return false;
}

function isAuthError(error) {
  const status = Number(error?.status);
  if (status === 401 || status === 403) return true;
  const message = String(error?.message || "").toLowerCase();
  return message.includes("unauthorized") || message.includes("please login") || message.includes("forbidden");
}

function isNetworkError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline")
  );
}

function buildBusTicketPayload(
  flowState,
  bookingReference,
  paymentMethod,
  mode = "live"
) {
  const bus = flowState.bus || {};
  const selectedSeats = Array.isArray(flowState.selectedSeats)
    ? flowState.selectedSeats
    : [];
  const passengers = Array.isArray(flowState.passengers)
    ? flowState.passengers
    : [];
  const fareSummary = flowState.fareSummary || {};
  const hasAppliedFareDiscount = Boolean(
    flowState.couponCode ||
      flowState.appliedCoupon ||
      flowState.selectedFeaturedOfferId ||
      flowState.selectedOffer?.selectedFeaturedOfferId ||
      flowState.selectedOffer?.id ||
      flowState.selectedOffer?.offerId ||
      flowState.pricingPreview?.appliedPromotionCode
  );

  return {
    ticketType: "bus",
    bookingReference,
    status: "Booked",
    providerName: bus.operatorName || "Bus Service",
    tripNumber: bus.busNumber || "--",
    fromCity: bus.fromCity || flowState.searchContext?.source || "--",
    toCity: bus.toCity || flowState.searchContext?.destination || "--",
    departureTime: [flowState.searchContext?.departureDate, bus.departureTime]
      .filter(Boolean)
      .join(" "),
    arrivalTime: bus.arrivalTime || "--",
    duration: bus.duration || "--",
    bookedAt: new Date().toISOString(),
    passengers: passengers.map((passenger) => ({
      name: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
        .replace(/\s+/g, " ")
        .trim(),
      passengerType: "Adult",
      seat: passenger.seatLabel || passenger.seat || "",
      gender: passenger.gender || "",
      age: passenger.age || passenger.Age || "",
    })),
    seats: selectedSeats.map((seat) => seat.label || seat),
    contact: flowState.contact || {},
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label || paymentMethod),
    fare: {
      subtotalBeforeCoupon: Number(flowState.pricingPreview?.subtotalBeforeCoupon || fareSummary.subtotalBeforeCoupon || fareSummary.baseFare || 0),
      autoDiscountAmount: Number(flowState.pricingPreview?.autoDiscountAmount || 0),
      couponDiscountAmount: hasAppliedFareDiscount
        ? getBusPromotionDiscountAmount(flowState.pricingPreview, flowState.couponDiscount)
        : 0,
      taxableFare: Number(flowState.pricingPreview?.taxableFare || fareSummary.taxableFare || 0),
      gstPercent: Number(flowState.pricingPreview?.gstPercent || fareSummary.gstPercent || 0),
      gstAmount: Number(flowState.pricingPreview?.gstAmount || fareSummary.gstAmount || fareSummary.tax || 0),
      convenienceFee: Number(flowState.pricingPreview?.convenienceFee || fareSummary.convenienceFee || 0),
      totalFare: calculateBusPayableAmount(
        flowState.pricingPreview,
        flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
      ),
    },
    totalPaid: calculateBusPayableAmount(
      flowState.pricingPreview,
      flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
    ),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: flowState.contact?.whatsappUpdates ? "Queued" : "Skipped",
    },
    mode,
  };
}

function navigateToBusPrintTicket(navigate, bookingReference, contact) {
  const reference = String(bookingReference || "").trim();
  const contactEmail = String(contact?.email || "").trim();
  const contactMobile = String(contact?.mobile || "").trim();

  navigate("/print-ticket", {
    replace: true,
    state: {
      pnr: reference,
      email: contactEmail,
      mobile: contactMobile,
      bookingType: "bus",
      forceFetch: true,
    },
  });
}

export default function BusPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const persistedState = readBusBookingFlowState();
  const incomingState = location.state || {};
  const [flowState, setFlowState] = useState(incomingState.bus ? incomingState : persistedState || {});

  const bus = flowState.bus || null;
  const selectedSeats = flowState.selectedSeats || [];
  const boardingPoint = flowState.boardingPoint || null;
  const droppingPoint = flowState.droppingPoint || null;
  const contact = flowState.contact || {};
  const searchContext = flowState.searchContext || {};
  const passengers = flowState.passengers || [];
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = calculateBusPayableAmount(
    flowState.pricingPreview,
    flowState.payableAmount || fareSummary.grandTotal || fareSummary.totalFare || 0
  );

  const activePortal = sessionStorage.getItem("active_portal");
  const isAgent = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
  const [agentProfile, setAgentProfile] = useState(null);

  // --- Coupon & Offer States ---
  const [manualCouponCode, setManualCouponCode] = useState(flowState.couponCode || "");
  const [appliedCoupon, setAppliedCoupon] = useState(flowState.couponCode ? { couponCode: flowState.couponCode } : null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponMessageType, setCouponMessageType] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedFeaturedOffer, setSelectedFeaturedOffer] = useState(
    flowState.selectedFeaturedOfferId ? { offerId: flowState.selectedFeaturedOfferId } : null
  );
  useEffect(() => {
    let isMounted = true;
    if (flowState.blockKey) {
      getBusPricingPreview({
        traceId: bus?.tripId || bus?.traceId,
        passengers: flowState.passengers,
        couponCode: flowState.couponCode,
        selectedFeaturedOfferId: flowState.selectedFeaturedOfferId,
        fromCity: bus?.fromCity || flowState.searchContext?.fromCity?.name || flowState.searchContext?.fromCity,
        toCity: bus?.toCity || flowState.searchContext?.toCity?.name || flowState.searchContext?.toCity,
        departureTime: bus?.departureTimeUtc || bus?.departureTimeIst || bus?.departureTime,
        operatorName: bus?.operatorName,
        busType: bus?.busType,
        totalFare: bus?.priceInr || bus?.displayFare || bus?.fare,
      })
      .then(preview => {
        if (isMounted && preview) {
          setFlowState(prev => ({ ...prev, pricingPreview: preview }));
        }
      })
      .catch(err => console.error("Error fetching pricing preview on payment mount:", err));
    }
    return () => { isMounted = false; };
  }, [flowState.blockKey, bus, flowState.boardingPoint, flowState.passengers, flowState.couponCode, flowState.selectedFeaturedOfferId]);

  useEffect(() => {
    if (isAgent) {
      // 1. Initial cached profile load (if available)
      getAccountProfile()
        .then((profile) => {
          if (profile) setAgentProfile(profile);
        })
        .catch((err) => console.error("Error loading agent cached profile", err));

      // 2. Fetch live wallet balance from B2B Ledger statement
      getLedgerStatement()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) => {
              const dateA = new Date(a.createdAtUtc || a.createdAt || a.date || 0).getTime();
              const dateB = new Date(b.createdAtUtc || b.createdAt || b.date || 0).getTime();
              if (dateA !== dateB) return dateB - dateA;
              return (b.id || 0) - (a.id || 0);
            });
            const latest = sorted[0];
            if (latest && latest.runningBalance !== undefined) {
              setAgentProfile((prev) => ({
                ...(prev || {}),
                walletBalance: Number(latest.runningBalance)
              }));
            }
          }
        })
        .catch((err) => console.error("Error loading live agent ledger balance", err));
    }
  }, [isAgent]);

  const availableMethods = isAgent
    ? [{ id: "agent_wallet", label: "Agent Wallet", icon: WalletIcon }, ...PAYMENT_METHODS]
    : PAYMENT_METHODS;

  const [selectedMethod, setSelectedMethod] = useState(isAgent ? "agent_wallet" : "upi");
  const [formValues, setFormValues] = useState({
    upiId: "",
    cardNumber: "",
    nameOnCard: "",
    expiry: "",
    cvv: "",
    bankName: "",
    walletProvider: "",
  });
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isAgent) return;

    setIsLoadingCoupons(true);
    listAvailableBusCoupons()
      .then((data) => {
        if (isMounted) {
          const busCoupons = Array.isArray(data) ? data.filter((c) => isBusCategoryOfferOrCoupon(c)) : [];
          setAvailableCoupons(busCoupons);
        }
      })
      .catch((err) => console.error("Error loading coupons:", err))
      .finally(() => {
        if (isMounted) setIsLoadingCoupons(false);
      });

    setIsLoadingOffers(true);
    getFeaturedBusOffers()
      .then((data) => {
        if (isMounted) {
          const busOffers = Array.isArray(data) ? data.filter((o) => isBusCategoryOfferOrCoupon(o)) : [];
          setFeaturedOffers(busOffers);
        }
      })
      .catch((err) => console.error("Error loading featured offers:", err))
      .finally(() => {
        if (isMounted) setIsLoadingOffers(false);
      });

    return () => { isMounted = false; };
  }, [isAgent]);

  const fetchPricingPreview = async (overrides = {}) => {
    return getBusPricingPreview({
      busId: bus?.id || bus?.busId,
      traceId: bus?.tripId || bus?.traceId,
      resultIndex: bus?.resultIndex || bus?.id,
      srdvIndex: bus?.srdvIndex || 0,
      blockKey: flowState.blockKey,
      boardingPointId: flowState.boardingPoint?.id || flowState.boardingPoint?.pointId,
      passengers: flowState.passengers,
      couponCode: flowState.couponCode,
      selectedFeaturedOfferId: flowState.selectedFeaturedOfferId,
      ...overrides
    });
  };

  const handleCouponCodeChange = (e) => {
    setManualCouponCode(e.target.value.toUpperCase());
    setCouponMessage("");
    setCouponMessageType("");
  };

  const formatCouponErrorMessage = (msg) => {
    if (!msg) return "";
    const lower = msg.toLowerCase();
    if (lower.includes("invalid") || lower.includes("does not exist") || lower.includes("not found")) {
      return "Invalid coupon code. Please check and try again.";
    }
    if (lower.includes("expired")) {
      return "This coupon has expired.";
    }
    if (lower.includes("minimum")) {
      return "Booking amount is too low for this coupon.";
    }
    if (lower.includes("already used") || lower.includes("usage limit")) {
      return "Coupon usage limit reached.";
    }
    return msg;
  };



  const clearSelectedOffer = () => {
    setFlowState((prev) => ({
      ...prev,
      selectedFeaturedOfferId: null,
      selectedOffer: null,
    }));
  };

  const isSameFeaturedOffer = (selected, offer) => {
    if (!selected || !offer) return false;
    const sId = selected.offerId || selected.id || selected.selectedFeaturedOfferId;
    const oId = offer.offerId || offer.id || offer.selectedFeaturedOfferId;
    if (sId && oId && String(sId) === String(oId)) return true;
    if (selected.couponCode && offer.couponCode && selected.couponCode === offer.couponCode) return true;
    return false;
  };

  const applyCouponCode = async (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) {
      setFlowState(prev => ({ ...prev, couponDiscount: 0, couponCode: null }));
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
      const preview = await fetchPricingPreview({ selectedFeaturedOfferId: null, couponCode: normalized });
      const effectiveDiscount = getBusPromotionDiscountAmount(preview, 0);

      if (effectiveDiscount <= 0) {
        setAppliedCoupon(null);
        setCouponMessage("Coupon could not be applied.");
        setCouponMessageType("error");
        return { valid: false, message: "Coupon could not be applied." };
      }

      setAppliedCoupon({ couponCode: normalized });
      setFlowState(prev => ({
        ...prev,
        couponCode: normalized,
        couponDiscount: effectiveDiscount,
        pricingPreview: preview,
        selectedFeaturedOfferId: null,
      }));
      setCouponMessage("Coupon applied successfully.");
      setCouponMessageType("success");
      return { valid: true, preview };
    } catch (error) {
      setAppliedCoupon(null);
      setFlowState(prev => ({ ...prev, couponCode: null, couponDiscount: 0 }));
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

    try {
      const couponCodeValue = coupon.couponCode ? String(coupon.couponCode).trim().toUpperCase() : null;

      if (couponCodeValue) {
        clearSelectedOffer();
        setSelectedFeaturedOffer(null);
        setManualCouponCode(couponCodeValue);

        const preview = await fetchPricingPreview({ selectedFeaturedOfferId: null, couponCode: couponCodeValue });
        const effectiveDiscount = getBusPromotionDiscountAmount(preview, 0);

        if (effectiveDiscount <= 0) {
          setManualCouponCode("");
          setAppliedCoupon(null);
          setCouponMessage("Coupon could not be applied.");
          setCouponMessageType("error");
          return;
        }

        setAppliedCoupon({ couponCode: couponCodeValue });
        setFlowState(prev => ({
          ...prev,
          couponCode: couponCodeValue,
          couponDiscount: effectiveDiscount,
          pricingPreview: preview,
          selectedFeaturedOfferId: null,
        }));
        setCouponMessage("Coupon applied successfully.");
        setCouponMessageType("success");
      } else {
        setCouponMessage("Invalid coupon.");
        setCouponMessageType("error");
      }
    } catch (error) {
      setSelectedFeaturedOffer(null);
      setManualCouponCode("");
      setAppliedCoupon(null);
      setFlowState(prev => ({ ...prev, couponCode: null, couponDiscount: 0 }));
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to apply coupon.");
      setCouponMessageType("error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleApplyCoupon = async () => applyCouponCode(manualCouponCode);

  const handleRemoveCoupon = async () => {
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");
    try {
      const preview = await fetchPricingPreview({ couponCode: null, selectedFeaturedOfferId: null });
      setManualCouponCode("");
      setAppliedCoupon(null);
      setFlowState(prev => ({
        ...prev,
        couponCode: null,
        couponDiscount: 0,
        pricingPreview: preview,
      }));
      setCouponMessage("Coupon removed.");
      setCouponMessageType("success");
    } catch (error) {
      console.error("Error removing coupon", error);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSelectOffer = async (offer) => {
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");

    try {
      const offerId = offer.offerId || offer.id;
      const preview = await fetchPricingPreview({ selectedFeaturedOfferId: offerId, couponCode: null });
      const effectiveDiscount = getBusPromotionDiscountAmount(preview, 0);

      if (effectiveDiscount <= 0) {
        setSelectedFeaturedOffer(null);
        clearSelectedOffer();
        setCouponMessage("Offer could not be applied.");
        setCouponMessageType("error");
        return;
      }

      setManualCouponCode("");
      setAppliedCoupon(null);
      setSelectedFeaturedOffer(offer);
      setFlowState(prev => ({
        ...prev,
        couponCode: null,
        selectedFeaturedOfferId: offerId,
        selectedOffer: offer,
        couponDiscount: effectiveDiscount,
        pricingPreview: preview,
      }));
      setCouponMessage("Featured offer applied.");
      setCouponMessageType("success");
    } catch (error) {
      setSelectedFeaturedOffer(null);
      clearSelectedOffer();
      setFlowState(prev => ({ ...prev, selectedFeaturedOfferId: null, couponDiscount: 0 }));
      setCouponMessage(formatCouponErrorMessage(error.message) || "Unable to apply offer.");
      setCouponMessageType("error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveOffer = async () => {
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");
    try {
      const preview = await fetchPricingPreview({ couponCode: null, selectedFeaturedOfferId: null });
      setSelectedFeaturedOffer(null);
      clearSelectedOffer();
      setFlowState(prev => ({
        ...prev,
        selectedFeaturedOfferId: null,
        selectedOffer: null,
        couponDiscount: 0,
        pricingPreview: preview,
      }));
      setCouponMessage("Offer removed.");
      setCouponMessageType("success");
    } catch (error) {
      console.error("Error removing offer", error);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const getCouponDescription = (coupon) => {
    if (coupon.description) return coupon.description;
    const value = Number(coupon.value) || 0;
    const isPercent = String(coupon.couponType || coupon.cpnType || "").toLowerCase().includes("percent");
    if (isPercent) return `Get ${value}% off on your booking`;
    return `Get flat ₹${value} off on your booking`;
  };

  if (!bus || !boardingPoint || !droppingPoint || selectedSeats.length === 0) {
    return (
      <main className="bus-flow-page">
        <div className="bus-flow-shell">
          <section className="bus-flow-empty">
            <h2>Payment details unavailable</h2>
            <p>Complete seat and passenger details before opening payment.</p>
            <button
              type="button"
              onClick={() => navigate("/bus/passenger-details")}
            >
              Back to Passenger Details
            </button>
          </section>
        </div>
      </main>
    );
  }

  const handlePayNow = async () => {
    if (isSubmitting) return;

    if (!isPaymentInputValid(selectedMethod, formValues)) {
      setPaymentError("Enter valid payment details for the selected method.");
      return;
    }

    if (selectedMethod === "agent_wallet") {
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const markup = Number(flowState.fareSummary?.markup || 0);
      const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
      const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
      const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
      if (balance < wholesalePrice) {
        setPaymentError(`Insufficient wallet balance. You need ₹ ${wholesalePrice.toFixed(2)} (wholesale price) but only have ₹ ${balance.toFixed(2)}.`);
        return;
      }
    }

    setPaymentError("");
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });

      const busId = bus.id ?? bus.busId;

      if (!busId) {
        throw new Error(
          "Bus ID is missing. Cannot complete booking. Please go back and re-select your bus."
        );
      }

      const bookingPayload = buildBookingPayload(flowState);
      console.log("BUS BOOKING PAYLOAD:", bookingPayload);

      const response = await bookBus({
        busId,
        payload: bookingPayload,
      });

      const bookingReference =
        response?.bookingReference || `PNB-${Date.now().toString().slice(-8)}`;

      if (isAgent && agentProfile) {
        const markup = Number(flowState.fareSummary?.markup || 0);
        const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
        const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
        const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
        const updatedBalance = Number(agentProfile.walletBalance) - Number(wholesalePrice);
        const updatedProfile = { ...agentProfile, walletBalance: updatedBalance };

        if (localStorage.getItem("b2b_user")) {
          localStorage.setItem("b2b_user", JSON.stringify(updatedProfile));
        }
        localStorage.setItem("user", JSON.stringify(updatedProfile));

      }

      const ticketPayload = buildBusTicketPayload(
        flowState,
        bookingReference,
        selectedMethod,
        "live"
      );

      await sendBookingNotifications({
        bookingReference,
        ticketType: "bus",
        providerName: ticketPayload.providerName,
        fromCity: ticketPayload.fromCity,
        toCity: ticketPayload.toCity,
        departureTime: ticketPayload.departureTime,
        contact: ticketPayload.contact,
      });

      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      sessionStorage.removeItem("booking_session_expiry");
      clearBusBookingFlowState();
      navigateToBusPrintTicket(navigate, bookingReference, flowState.contact);
    } catch (error) {
      let displayMessage;
      if (isAuthError(error)) {
        displayMessage = "You must be logged in to complete a booking. Please sign in and try again.";
      } else if (isNetworkError(error)) {
        displayMessage = "Unable to reach the booking server. Please check your internet connection and try again.";
      } else {
        displayMessage = error.message || "Unable to process payment right now. Please try again.";
      }
      setPaymentError(displayMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bus-flow-page">
      <BookingTimer />
      <div className="bus-flow-shell">
        <section className="flow-payment-layout">
          <div className="flow-payment-main">
            <article className="flow-card">
              <header>Select Payment Method</header>

              <div className="flow-card-body">
                <div className="payment-method-grid">
                  {availableMethods.map((method) => (
                    <button
                      type="button"
                      key={method.id}
                      className={selectedMethod === method.id ? "active" : ""}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <method.icon size={20} active={selectedMethod === method.id} />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <article className="flow-card bus-payment-details-card" style={{ overflow: "visible" }}>
              <header style={{ borderTopLeftRadius: "8px", borderTopRightRadius: "8px" }}>Enter Payment Details</header>

              <div className="flow-card-body payment-form-grid bus-payment-form-grid" style={{ overflow: "visible" }}>
                {selectedMethod === "agent_wallet" && (() => {
                  const markup = Number(flowState.fareSummary?.markup || 0);
                  const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
                  const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
                  const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
                  const balance = Number(agentProfile?.walletBalance ?? 0);
                  const hasSufficient = balance >= wholesalePrice;
                  return (
                    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                          <span style={{ color: "var(--b2b-text-secondary)" }}>Customer Price (Collected):</span>
                          <span style={{ fontWeight: 600 }}>₹ {payableAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                          <span>Agent Markup (Your Profit):</span>
                          <span>+ ₹ {markup.toFixed(2)}</span>
                        </div>
                        {tierDiscount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                            <span>Tier Discount (Commission):</span>
                            <span>- ₹ {tierDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        {volumeDiscount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
                            <span>Bulk Volume Discount:</span>
                            <span>- ₹ {volumeDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                          <span style={{ fontWeight: 500 }}>Wholesale Price (To Deduct):</span>
                          <strong style={{ color: "var(--b2b-accent)" }}>₹ {wholesalePrice.toFixed(2)}</strong>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontWeight: 500 }}>Current Wallet Balance:</span>
                        <strong style={{ fontSize: "1.2rem", color: hasSufficient ? "#10b981" : "#ef4444" }}>
                          ₹ {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(balance)}
                        </strong>
                      </div>

                      {!hasSufficient ? (
                        <div style={{ color: "#ef4444", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                          <strong>Insufficient Balance:</strong> You need an additional ₹ {(wholesalePrice - balance).toFixed(2)} to complete this booking. Please top up your wallet in the B2B portal.
                        </div>
                      ) : (
                        <div style={{ color: "#10b981", fontSize: "0.85rem", background: "rgba(16, 185, 129, 0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                          ✔ Balance is sufficient. Click <strong>Pay Now</strong> to proceed (only ₹ {wholesalePrice.toFixed(2)} will be debited).
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedMethod === "upi" && (
                  <label>
                    <span>UPI ID</span>
                    <input
                      type="text"
                      placeholder="name@bank"
                      value={formValues.upiId}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          upiId: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}

                {selectedMethod === "card" && (
                  <>
                    <label>
                      <span>Card Number</span>
                      <input
                        type="text"
                        placeholder="XXXX XXXX XXXX XXXX"
                        value={formValues.cardNumber}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            cardNumber: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Name on Card</span>
                      <input
                        type="text"
                        placeholder="Card holder name"
                        value={formValues.nameOnCard}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            nameOnCard: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Expiry (MM/YY)</span>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={formValues.expiry}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            expiry: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>CVV</span>
                      <input
                        type="password"
                        placeholder="CVV"
                        value={formValues.cvv}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            cvv: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                )}

                {selectedMethod === "netbanking" && (
                  <label>
                    <span>Select Bank</span>
                    <select
                      value={formValues.bankName}
                      onChange={(event) =>
                        setFormValues((previous) => ({
                          ...previous,
                          bankName: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choose bank</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="axis">Axis Bank</option>
                    </select>
                  </label>
                )}

                {selectedMethod === "wallet" && (
                  <label>
                    <span>Select Wallet</span>
                    <CustomWalletSelect
                      value={formValues.walletProvider}
                      options={WALLET_OPTIONS}
                      onChange={(val) =>
                        setFormValues((previous) => ({
                          ...previous,
                          walletProvider: val,
                        }))
                      }
                    />
                  </label>
                )}
              </div>
            </article>
          </div>

          <aside className="flow-payment-side">
            <article className="flow-card">
              <header>Booking Summary</header>

              <div className="flow-card-body summary-list">
                <p>
                  <strong>{bus.operatorName}</strong>
                </p>
                <p>
                  {bus.fromCity} → {bus.toCity}
                </p>
                <p>
                  Seat(s): {selectedSeats.map((seat) => seat.label).join(", ")}
                </p>
                <p>
                  Boarding: {boardingPoint.name} ({boardingPoint.time})
                </p>
                <p>
                  Dropping: {droppingPoint.name} ({droppingPoint.time})
                </p>
                <p>Passengers: {passengers.length}</p>
              </div>
            </article>

            <article className="flow-card">
              <header>Fare Details</header>

              <div className="flow-card-body fare-list">
                <div>
                  <span>Subtotal Before Coupon</span>
                  <strong>
                    {formatCurrency(
                      flowState.pricingPreview?.subtotalBeforeCoupon ||
                        fareSummary.subtotalBeforeCoupon ||
                        fareSummary.baseFare
                    )}
                  </strong>
                </div>

                {Number(flowState.pricingPreview?.autoDiscountAmount) > 0 && (
                  <div>
                    <span>Auto Discount</span>
                    <strong>
                      (-) {formatCurrency(flowState.pricingPreview.autoDiscountAmount)}
                    </strong>
                  </div>
                )}

                {/* Coupon Discount */}
                {(() => {
                  const appliedCode = flowState.pricingPreview?.appliedPromotionCode || flowState.couponCode;
                  const isPromotion = Boolean(
                    flowState.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.id ||
                      flowState.selectedOffer?.offerId
                  );
                  const hasCoupon = Boolean(appliedCode || flowState.appliedCoupon) && !isPromotion;
                  const couponAmount = hasCoupon
                    ? getBusPromotionDiscountAmount(
                        flowState.pricingPreview,
                        flowState.couponDiscount
                      )
                    : 0;

                  return hasCoupon && couponAmount > 0 ? (
                    <div>
                      <span>Coupon Discount ({appliedCode})</span>
                      <strong>(-) {formatCurrency(couponAmount)}</strong>
                    </div>
                  ) : null;
                })()}

                {/* Offer Discount */}
                {(() => {
                  const isPromotion = Boolean(
                    flowState.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.selectedFeaturedOfferId ||
                      flowState.selectedOffer?.id ||
                      flowState.selectedOffer?.offerId
                  );
                  const offerAmount = isPromotion
                    ? getBusPromotionDiscountAmount(
                        flowState.pricingPreview,
                        flowState.couponDiscount
                      )
                    : 0;

                  return isPromotion && offerAmount > 0 ? (
                    <div>
                      <span>Offer Discount ({flowState.selectedOffer?.title || flowState.selectedFeaturedOfferId || ""})</span>
                      <strong>(-) {formatCurrency(offerAmount)}</strong>
                    </div>
                  ) : null;
                })()}

                <div>
                  <span>
                    GST{" "}
                    {flowState.pricingPreview?.gstPercent || fareSummary.gstPercent
                      ? `(${flowState.pricingPreview?.gstPercent || fareSummary.gstPercent}%)`
                      : ""}
                  </span>
                  <strong>
                    (+) {formatCurrency(
                      flowState.pricingPreview?.gstAmount ||
                        fareSummary.gstAmount ||
                        fareSummary.tax
                    )}
                  </strong>
                </div>


                <div className="grand-total">
                  <span>Payable Amount</span>
                  <strong>{formatCurrency(payableAmount)}</strong>
                </div>
              </div>
            </article>

            {/* Coupons & Featured Offers */}
            {!isAgent && (
              <article className="flow-card coupon-sheet-card" style={{ marginBottom: "1rem" }}>
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

                  <div className={`coupon-manual-row ${couponMessageType === "error" ? "field-has-error" : ""}`}>
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
                        aria-label="Featured offers carousel"
                      >
                        {featuredOffers.map((offer) => {
                          const isThisSelected = isSameFeaturedOffer(selectedFeaturedOffer, offer);
                          const anotherOfferSelected = Boolean(selectedFeaturedOffer) && !isThisSelected;
                          const discountLabel = offer.isPercentageDiscount
                              ? `${offer.discountValue}% OFF`
                              : `₹${offer.discountValue} OFF`;
                          const appliedTitle = isThisSelected && flowState.pricingPreview?.appliedPromotionTitle
                              ? flowState.pricingPreview.appliedPromotionTitle
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
                        aria-label="Available coupons carousel"
                      >
                        {availableCoupons.map((coupon, idx) => {
                          const code = coupon.couponCode || `Promo #${coupon.id}`;
                          const discountLabel = getCouponDescription(coupon).split(" on")[0];
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

            {paymentError && <p className="flow-error">{paymentError}</p>}

            <button
              type="button"
              className="flow-pay-btn"
              onClick={handlePayNow}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Processing...</span>
                </>
              ) : (
                `Pay ${formatCurrency(payableAmount)}`
              )}
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
