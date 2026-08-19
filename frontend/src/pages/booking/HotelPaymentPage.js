/* eslint-disable */
import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle2, Loader2, MessageSquareText, ShieldCheck, Star, Clock3, ChevronDown, Info
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { bookHotelRoom } from "../../services/hotelBookingService";
import { formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import BookingTimer from "./BookingTimer";
import "../../STYLES/HotelCheckoutExperience.css";
import { readHotelBookingFlowState, writeHotelBookingFlowState, clearHotelBookingFlowState } from "./hotelBookingFlowStore";
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
import { getAccountProfile } from "../../services/accountProfileService";
import { getLedgerStatement } from "../../services/b2bService";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: UpiIcon },
  { id: "card", label: "Card", icon: CardIcon },
  { id: "netbanking", label: "Net banking", icon: NetBankingIcon },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

const WALLET_OPTIONS = [
  { id: "paytm", label: "Paytm", icon: PaytmIcon },
  { id: "amazonpay", label: "Amazon Pay", icon: AmazonPayIcon },
  { id: "phonepe", label: "PhonePe Wallet", icon: PhonePeIcon },
];

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);

function isPaymentInputValid(method, formValues) {
  if (method === "agent_wallet") return true;
  if (method === "upi") return /\S+@\S+/.test(formValues.upiId || "");
  if (method === "card") return String(formValues.cardNumber || "").replace(/\D/g, "").length >= 12 && String(formValues.nameOnCard || "").trim().length >= 2 && String(formValues.expiry || "").trim().length >= 4 && String(formValues.cvv || "").replace(/\D/g, "").length >= 3;
  if (method === "netbanking") return Boolean(formValues.bankName);
  if (method === "wallet") return Boolean(formValues.walletProvider);
  return false;
}

function parseGuestName(rawName, rawTitle) {
  let nameStr = String(rawName || "").trim();
  let titleStr = String(rawTitle || "").trim();

  // Strip prefix title if present in name string (e.g. "Mr. Supriya Yadav" -> "Supriya Yadav")
  const titleMatch = nameStr.match(/^(Mr|Mrs|Ms|Miss|Dr|Mstr)\.?\s+/i);
  if (titleMatch) {
    if (!titleStr) {
      titleStr = titleMatch[1];
    }
    nameStr = nameStr.replace(/^(Mr|Mrs|Ms|Miss|Dr|Mstr)\.?\s+/i, "").trim();
  }

  // Normalize Title
  const validTitles = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Mstr"];
  let finalTitle = validTitles.find((t) => t.toLowerCase() === titleStr.toLowerCase()) || "Mr";

  // Split name tokens by whitespace
  const tokens = nameStr.split(/\s+/).filter(Boolean);

  // Clean first name: ONLY letters, STRICTLY NO WHITESPACE and NOT BLANK
  let firstName = (tokens[0] || "").replace(/[^a-zA-Z]/g, "").trim();
  if (!firstName) {
    firstName = "Guest";
  }

  // Clean last name: ONLY letters, STRICTLY NO WHITESPACE and NOT BLANK
  let lastName = tokens.slice(1).map((t) => t.replace(/[^a-zA-Z]/g, "")).filter(Boolean).join("") || "User";
  if (!lastName) {
    lastName = "User";
  }

  return {
    title: finalTitle,
    firstName,
    lastName,
  };
}

function extractBookingReference(bookingResponse) {
  if (!bookingResponse) return "";

  const bRes = bookingResponse.BookResult || bookingResponse.bookResult || bookingResponse.data || bookingResponse;

  const candidate =
    bRes.ConfirmationNo ||
    bRes.confirmationNo ||
    bRes.BookingRefNo ||
    bRes.bookingRefNo ||
    bRes.BookingId ||
    bRes.bookingId ||
    bRes.BookingReference ||
    bRes.bookingReference ||
    bookingResponse.ConfirmationNo ||
    bookingResponse.confirmationNo ||
    bookingResponse.BookingRefNo ||
    bookingResponse.bookingRefNo ||
    bookingResponse.BookingId ||
    bookingResponse.bookingId ||
    bookingResponse.bookingReference;

  return candidate ? String(candidate).trim() : "";
}

function buildTicketPayload(flowState, bookingResponse, paymentMethod, nights, finalPaidAmount) {
  const hotel = flowState.hotel || {};
  const offer = flowState.offer || {};
  const fareSummary = flowState.fareSummary || {};
  const dynamicRef = extractBookingReference(bookingResponse);
  const reference = dynamicRef || `HT-${Date.now().toString().slice(-8)}`;
  const status = bookingResponse?.BookResult?.Status || bookingResponse?.status || bookingResponse?.hotelBookingStatus || "Confirmed";
  const checkInDate = offer.checkInDate ? new Date(offer.checkInDate) : new Date();
  const checkOutDate = offer.checkOutDate ? new Date(offer.checkOutDate) : new Date();

  const hImg = flowState.hotelImage || hotel.image || hotel.cardImage || (Array.isArray(hotel.images) ? hotel.images[0] : null) || offer.image || null;
  const hImgs = flowState.hotelImages || hotel.images || (hImg ? [hImg] : []);

  const roomsConfig = flowState.searchContext?.roomsConfig || flowState.roomsConfig || [];
  const noOfRooms = flowState.roomsCount || (Array.isArray(roomsConfig) && roomsConfig.length > 0 ? roomsConfig.length : Number(flowState.searchContext?.rooms || flowState.rooms || 1));
  const totalAdults = Array.isArray(roomsConfig) && roomsConfig.length > 0
    ? roomsConfig.reduce((sum, r) => sum + (Number(r.adults) || 0), 0)
    : Number(flowState.searchContext?.adults || flowState.adults || 1);
  const totalChildren = Array.isArray(roomsConfig) && roomsConfig.length > 0
    ? roomsConfig.reduce((sum, r) => sum + (Number(r.children) || 0), 0)
    : Number(flowState.searchContext?.children || flowState.children || 0);
  const totalGuests = totalAdults + totalChildren;

  const guestsSummary = flowState.searchContext?.guests || `${noOfRooms} Room${noOfRooms > 1 ? 's' : ''}, ${totalAdults} Adult${totalAdults > 1 ? 's' : ''}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren > 1 ? 'ren' : ''}` : ''}`;

  return {
    ticketType: "hotel",
    bookingReference: reference,
    status: status,
    providerName: hotel.name || "Hotel Stay",
    hotelImage: hImg,
    hotelImages: hImgs,
    tripNumber: offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Room Booking",
    fromCity: hotel.name || "Hotel",
    toCity: hotel.city || "Stay",
    departureTime: checkInDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    arrivalTime: checkOutDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    duration: formatNightLabel(nights),
    noOfRooms: noOfRooms,
    totalAdults: totalAdults,
    totalChildren: totalChildren,
    totalGuests: totalGuests,
    guestsSummary: guestsSummary,
    bookedAt: bookingResponse?.createdAt || new Date().toISOString(),
    passengers: Array.isArray(flowState.guests) && flowState.guests.length > 0
      ? flowState.guests 
      : [{ name: flowState.guestName || "Guest Occupant", passengerType: "Primary Guest", seat: offer.bedType ? `${offer.bedType} Bed` : `${noOfRooms} Room${noOfRooms > 1 ? 's' : ''}` }],
    seats: Array.from({ length: noOfRooms }, (_, i) => `${offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}${noOfRooms > 1 ? ` (Room ${i + 1})` : ""}`),
    contact: { email: flowState.guestEmail, mobile: flowState.guestPhone, whatsappUpdates: false },
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((entry) => entry.id === paymentMethod)?.label || paymentMethod),
    appliedCoupon: flowState.appliedCoupon || flowState.couponCode || flowState.promoCode || null,
    appliedOffer: flowState.appliedOffer || null,
    promoCode: flowState.promoCode || flowState.couponCode || (flowState.appliedCoupon ? (typeof flowState.appliedCoupon === 'object' ? flowState.appliedCoupon.code : flowState.appliedCoupon) : null),
    offersApplied: flowState.offersApplied || (flowState.appliedCoupon ? [typeof flowState.appliedCoupon === 'object' ? (flowState.appliedCoupon.code || flowState.appliedCoupon.title) : flowState.appliedCoupon] : []),
    fare: {
      baseFare: Number(fareSummary.baseFare || 0),
      tax: Number(fareSummary.tax || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(fareSummary.discount || 0) + (Number(fareSummary.totalFare || 0) - Number(finalPaidAmount)),
      totalFare: Number(finalPaidAmount)
    },
    totalPaid: Number(finalPaidAmount),
    notifications: { email: "Queued", sms: "Queued", whatsapp: "Skipped" },
    mode: "live",
  };
}

export default function HotelPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flowState = useMemo(() => {
    const routerState = location.state && location.state.hotel ? location.state : null;
    const storedState = readHotelBookingFlowState() || {};
    const merged = { ...storedState, ...routerState };
    if (merged.hotel) {
      writeHotelBookingFlowState(merged);
      return merged;
    }
    return {};
  }, [location.state]);
  const hotel = flowState.hotel || null;
  const offer = flowState.offer || null;
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);
  const nights = useMemo(() => calculateNights(offer?.checkInDate, offer?.checkOutDate), [offer]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${offer?.offerId || "offer"}`), [hotel?.hotelId, hotel?.name, offer?.offerId]);
  const activePortal = sessionStorage.getItem("active_portal");
  const isAgent = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";
  const [agentProfile, setAgentProfile] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);
  useEffect(() => {
    const targetTime = sessionStorage.getItem("booking_session_expiry");
    if (!targetTime) return;
    const updateTimeLeft = () => {
      const diff = Math.max(0, Math.round((Number(targetTime) - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const formattedTime = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;

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
  const [messageToHost, setMessageToHost] = useState("");
  const [formValues, setFormValues] = useState({ upiId: "", cardNumber: "", nameOnCard: "", expiry: "", cvv: "", bankName: "", walletProvider: "" });
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoType, setPromoType] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [dynamicCoupons, setDynamicCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    setLoadingCoupons(true);
    Promise.allSettled([
      import("../../services/flightBookingService").then((m) => m.listFlightCoupons()),
      import("../../services/busBookingService").then((m) => m.listBusCoupons())
    ]).then((results) => {
      let combined = [];
      results.forEach((res) => {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          res.value.forEach((c) => {
            if (c && c.couponCode) {
              combined.push({
                code: c.couponCode,
                desc: c.remark || c.description || `Save flat ₹${c.value || c.discount || 0} using ${c.couponCode}.`,
                discount: Number(c.value || c.discount || 0),
                img: c.imageUrl || c.image || null
              });
            }
          });
        }
      });
      const unique = Array.from(new Map(combined.map(c => [c.code.toUpperCase(), c])).values());
      if (unique.length > 0) {
        setDynamicCoupons(unique);
      } else {
        setDynamicCoupons([
          { code: "PICKNBOOK", desc: "Save flat ₹800 on all travel bookings.", discount: 800, img: null },
          { code: "FESTIVE15", desc: "Save flat ₹1,200 on all checkout payments.", discount: 1200, img: null }
        ]);
      }
    }).catch(err => {
      console.error("Error loading coupons", err);
      setDynamicCoupons([
        { code: "PICKNBOOK", desc: "Save flat ₹800 on all travel bookings.", discount: 800, img: null },
        { code: "FESTIVE15", desc: "Save flat ₹1,200 on all checkout payments.", discount: 1200, img: null }
      ]);
    }).finally(() => {
      setLoadingCoupons(false);
    });
  }, []);

  const handleApplyPromo = () => {
    setPromoError("");
    setPromoSuccess("");
    if (!promoCode.trim()) return;
    const code = promoCode.trim().toUpperCase();

    const matched = dynamicCoupons.find(c => c.code.toUpperCase() === code);
    if (matched) {
      setPromoDiscount(matched.discount);
      setPromoSuccess(`Promo code "${code}" applied successfully! You saved ${formatCurrency(matched.discount)}.`);
      return;
    }

    if (code === "WELCOME10" || code === "PNBSAVE" || code === "OFFER500" || code === "WELCOME500" || code === "HOTELDEAL" || code === "PICKNBOOK" || code === "FESTIVE15") {
      let discount = 500;
      if (code === "WELCOME500") discount = 500;
      else if (code === "HOTELDEAL") discount = 1000;
      else if (code === "PICKNBOOK") discount = 800;
      else if (code === "FESTIVE15") discount = 1200;
      else discount = Math.round(payableAmount * 0.1);

      setPromoDiscount(discount);
      setPromoSuccess(`Promo code "${code}" applied successfully! You saved ${formatCurrency(discount)}.`);
    } else {
      setPromoError("Invalid promo code. Try WELCOME500 or PICKNBOOK.");
      setPromoDiscount(0);
    }
  };

  const finalPayableAmount = Math.max(0, payableAmount - promoDiscount);

  const handleCardNumberChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 16);
    const formatted = clean.replace(/(\d{4})(?=\d)/g, "$1 ");
    setFormValues((current) => ({ ...current, cardNumber: formatted }));
  };

  const handleExpiryChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    setFormValues((current) => ({ ...current, expiry: formatted }));
  };

  const handleCvvChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setFormValues((current) => ({ ...current, cvv: clean }));
  };

  if (!hotel || !offer) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>Payment details unavailable</h2><p>Complete hotel guest details before entering payment.</p><button type="button" onClick={() => navigate("/search/hotels")}>Back to hotel search</button></section></div></main>;
  }

  const handlePayNow = async () => {
    if (selectedMethod === "agent_wallet") {
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const markup = Number(flowState.fareSummary?.markup || 0);
      const wholesalePrice = finalPayableAmount - markup;
      if (balance < wholesalePrice) {
        setPaymentError(`Insufficient wallet balance. You need ₹ ${wholesalePrice.toFixed(2)} (wholesale price) but only have ₹ ${balance.toFixed(2)}.`);
        return;
      }
    } else {
      if (!isPaymentInputValid(selectedMethod, formValues)) { setPaymentError("Enter valid payment details for the selected method."); return; }
    }
    setPaymentError("");
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => { window.setTimeout(resolve, 1200); });
      const { title, firstName, lastName } = parseGuestName(flowState.guestName, flowState.guestTitle);
      const cleanPhone = String(flowState.guestPhone || "9876543210").replace(/\D/g, "").slice(-10) || "9876543210";
      const cleanEmail = String(flowState.guestEmail || "guest@gopickandbook.in").trim();

      const roomsConfig = flowState.searchContext?.roomsConfig || [{ adults: 1, children: 0, childAges: [] }];
      const blockedRooms = flowState.blockRoomResponse?.BlockRoomResult?.HotelRoomsDetails ||
        flowState.blockRoomResponse?.blockRoomResult?.hotelRoomsDetails ||
        flowState.blockRoomResponse?.HotelRoomsDetails ||
        flowState.blockRoomResponse?.hotelRoomsDetails ||
        [offer];

      const flowGuests = Array.isArray(flowState.guests) ? flowState.guests : [];
      let guestPointer = 0;

      const mappedRoomsDetails = blockedRooms.map((room, roomIndex) => {
        const config = roomsConfig[roomIndex] || { adults: 1, children: 0, childAges: [] };
        const passengers = [];
        let isLeadSet = false;

        // Adults for this room
        for (let i = 0; i < config.adults; i++) {
          const g = flowGuests[guestPointer] || {};
          guestPointer++;

          const rawName = g.fullName || (i === 0 && roomIndex === 0 ? flowState.guestName : `Adult${i + 1}`);
          const rawTitle = g.title || (i === 0 && roomIndex === 0 ? flowState.guestTitle : "Mr");

          const { title: pTitle, firstName: pFirst, lastName: pLast } = parseGuestName(rawName, rawTitle);

          const pPhone = String(g.mobile || flowState.guestPhone || "9876543210").replace(/\D/g, "").slice(-10) || "9876543210";
          const pEmail = String(g.email || flowState.guestEmail || "guest@gopickandbook.in").trim();
          const pAge = Number(g.age || flowState.guestAge) || 26;

          const isLead = (roomIndex === 0 && i === 0) || (!isLeadSet);
          isLeadSet = true;

          const paxObj = {
            Title: pTitle,
            title: pTitle,
            FirstName: pFirst,
            firstName: pFirst,
            MiddleName: "",
            middleName: "",
            LastName: pLast,
            lastName: pLast,
            Phoneno: pPhone,
            phoneno: pPhone,
            Email: pEmail,
            email: pEmail,
            PaxType: "1", // String ("1" = Adult)
            paxType: "1",
            LeadPassenger: isLead,
            leadPassenger: isLead,
            Age: pAge,
            age: pAge,
            PassportNo: g.passportNo || flowState.guestPassportNo || "",
            passportNo: g.passportNo || flowState.guestPassportNo || "",
            PassportIssueDate: "1900-01-01T00:00:00",
            PassportExpDate: "1900-01-01T00:00:00",
            PAN: g.pan || flowState.guestPAN || "",
            pan: g.pan || flowState.guestPAN || ""
          };
          passengers.push(paxObj);
        }

        // Children for this room
        for (let i = 0; i < config.children; i++) {
          const g = flowGuests[guestPointer] || {};
          guestPointer++;

          const rawChildName = g.fullName || `Child${i + 1}`;
          const { title: cTitle, firstName: cFirst, lastName: cLast } = parseGuestName(rawChildName, "Mstr");
          const childAge = Number(g.age || (config.childAges && config.childAges[i])) || 4;

          const paxObj = {
            Title: "Mstr",
            title: "Mstr",
            FirstName: cFirst,
            firstName: cFirst,
            MiddleName: "",
            middleName: "",
            LastName: cLast,
            lastName: cLast,
            Phoneno: "",
            phoneno: "",
            Email: "",
            email: "",
            PaxType: "2", // String ("2" = Child)
            paxType: "2",
            LeadPassenger: false,
            leadPassenger: false,
            Age: childAge,
            age: childAge,
            PassportNo: "",
            passportNo: "",
            PassportIssueDate: "1900-01-01T00:00:00",
            PassportExpDate: "1900-01-01T00:00:00",
            PAN: "",
            pan: ""
          };
          passengers.push(paxObj);
        }

        let roomPrice = 0;
        if (typeof room.Price === 'object' && room.Price) {
          roomPrice = Number(room.Price.OfferedPrice || room.Price.RoomPrice || 0);
        } else if (typeof room.price === 'object' && room.price) {
          roomPrice = Number(room.price.offeredPrice || room.price.roomPrice || room.price.b2cTotalPrice || 0);
        } else {
          roomPrice = Number(room.price || room.OfferedPrice || 0);
        }
        if (isNaN(roomPrice)) roomPrice = 0;

        return {
          ChildCount: room.childCount || room.ChildCount || config.children || 0,
          RequireAllPaxDetails: room.requireAllPaxDetails || room.RequireAllPaxDetails || false,
          RoomId: room.roomId || room.RoomId || "",
          RoomStatus: room.roomStatus || room.RoomStatus || "Active",
          RoomIndex: room.roomIndex || room.RoomIndex || String(roomIndex + 1),
          RoomTypeCode: room.roomTypeCode || room.RoomTypeCode || "",
          RoomTypeName: room.roomTypeName || room.RoomTypeName || "",
          RatePlanCode: room.ratePlanCode || room.RatePlanCode || "",
          RatePlan: room.ratePlan || room.RatePlan || "",
          InfoSource: room.infoSource || room.InfoSource || "",
          SequenceNo: room.sequenceNo || room.SequenceNo || "",
          DayRates: room.dayRates || room.DayRates || [],
          SupplierPrice: room.supplierPrice || room.SupplierPrice || "",
          RoomPromotion: room.roomPromotion || room.RoomPromotion || "",
          Amenities: room.amenities || room.Amenities || [],
          SmokingPreference: room.smokingPreference || room.SmokingPreference || "",
          BedTypes: room.bedTypes || room.bedType || room.BedTypes || "",
          HotelSupplements: room.hotelSupplements || room.HotelSupplements || "",
          LastCancellationDate: room.lastCancellationDate || room.LastCancellationDate || "",
          IsPassportMandatory: room.isPassportMandatory || room.IsPassportMandatory || false,
          IsPANMandatory: room.isPANMandatory || room.IsPANMandatory || false,
          FullRefundAllowed: room.fullRefundAllowed || room.FullRefundAllowed || false,
          CancellationPolicies: room.cancellationPolicies || room.CancellationPolicies || [],
          CancellationPolicy: room.cancellationPolicy || room.CancellationPolicy || "",
          Inclusion: room.inclusion || room.Inclusion || [],
          BedTypeCode: room.bedTypeCode || room.BedTypeCode || "",
          Supplements: room.supplements || room.Supplements || "",
          OfferedPrice: roomPrice,
          Price: (typeof room.Price === 'object' && room.Price) ? room.Price :
            (typeof room.price === 'object' && room.price) ? room.price :
              {
                CurrencyCode: "INR",
                RoomPrice: roomPrice,
                PublishedPrice: roomPrice,
                PublishedPriceRoundedOff: roomPrice,
                OfferedPrice: roomPrice,
                OfferedPriceRoundedOff: roomPrice
              },
          HotelPassenger: passengers,
          HotelPassengers: passengers,
          RoomTravellerInfo: passengers,
          roomTravellerInfo: passengers,
          travellerInfo: passengers
        };
      });

      const rawCheckIn = offer?.checkInDate || flowState.searchContext?.checkInDate || flowState.checkInDate || "";
      const rawCheckOut = offer?.checkOutDate || flowState.searchContext?.checkOutDate || flowState.checkOutDate || "";
      const checkInStr = typeof rawCheckIn === "string" ? rawCheckIn.split("T")[0] : (rawCheckIn ? new Date(rawCheckIn).toISOString().split("T")[0] : "");
      const checkOutStr = typeof rawCheckOut === "string" ? rawCheckOut.split("T")[0] : (rawCheckOut ? new Date(rawCheckOut).toISOString().split("T")[0] : "");

      const bookPayload = {
        CheckInDate: checkInStr,
        CheckOutDate: checkOutStr,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        TraceId: String(flowState.blockRoomResponse?.BlockRoomResult?.TraceId || flowState.blockRoomResponse?.blockRoomResult?.traceId || flowState.blockRoomResponse?.TraceId || flowState.blockRoomResponse?.traceId || hotel?.TraceId || hotel?.traceId || ""),
        ResultIndex: String(hotel?.ResultIndex || hotel?.resultIndex || ""),
        SrdvType: String(hotel?.SrdvType || hotel?.srdvType || "MixAPI"),
        SrdvIndex: String(hotel?.SrdvIndex || hotel?.srdvIndex || ""),
        HotelCode: String(hotel?.hotelId || hotel?.hotelCode || ""),
        HotelName: hotel?.name || "",
        GuestNationality: "IN",
        NoOfRooms: blockedRooms.length,
        ClientReferenceNo: 0,
        IsVoucherBooking: true,
        GuestName: `${firstName} ${lastName}`,
        GuestEmail: cleanEmail,
        GuestPhone: cleanPhone,
        Price: Number(finalPayableAmount || 0),
        HotelRoomsDetails: mappedRoomsDetails,
        RoomTravellerInfo: mappedRoomsDetails,
        roomTravellerInfo: mappedRoomsDetails,
        EndUserIp: "192.168.10.10"
      };

      const response = await bookHotelRoom(bookPayload);
      const bookError = response?.BookResult?.Error?.ErrorMessage ||
        response?.bookResult?.error?.errorMessage ||
        response?.BookResult?.error?.errorMessage ||
        response?.Error?.ErrorMessage;

      if (bookError && response?.BookResult?.ResponseStatus !== 1 && response?.bookResult?.responseStatus !== 1) {
        throw new Error(`Hotel Booking Failed: ${bookError}`);
      }

      const bookingReference = extractBookingReference(response) || `PNB-${Date.now().toString().slice(-8)}`;

      if (isAgent && agentProfile) {
        const markup = Number(flowState.fareSummary?.markup || 0);
        const wholesalePrice = finalPayableAmount - markup;
        const updatedBalance = Number(agentProfile.walletBalance) - Number(wholesalePrice);
        const updatedProfile = { ...agentProfile, walletBalance: updatedBalance };

        if (localStorage.getItem("b2b_user")) {
          localStorage.setItem("b2b_user", JSON.stringify(updatedProfile));
        }
        localStorage.setItem("user", JSON.stringify(updatedProfile));

      }
      const ticketPayload = buildTicketPayload(flowState, response, selectedMethod, nights, finalPayableAmount);

      try {
        const existingStr = localStorage.getItem("mock_tickets");
        const existing = existingStr ? JSON.parse(existingStr) : [];
        existing.unshift(ticketPayload);
        localStorage.setItem("mock_tickets", JSON.stringify(existing));
      } catch (e) {
        console.error("Error saving mock hotel booking:", e);
      }

      sessionStorage.removeItem("booking_session_expiry");
      clearHotelBookingFlowState();
      navigate("/ticket/confirmation", { state: ticketPayload, replace: true });
    } catch (error) {
      setPaymentError(error.message || "Failed to confirm hotel booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldContent = selectedMethod === "agent_wallet"
    ? (() => {
      const markup = Number(flowState.fareSummary?.markup || 0);
      const wholesalePrice = finalPayableAmount - markup;
      const balance = Number(agentProfile?.walletBalance ?? 0);
      const hasSufficient = balance >= wholesalePrice;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "10px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--b2b-text-secondary)" }}>Customer Price (Collected):</span>
              <span style={{ fontWeight: 600 }}>₹ {finalPayableAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--b2b-success)" }}>
              <span>Agent Markup (Your Profit):</span>
              <span>+ ₹ {markup.toFixed(2)}</span>
            </div>
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
              ✔ Balance is sufficient. Click <strong>Confirm and pay</strong> to proceed (only ₹ {wholesalePrice.toFixed(2)} will be debited).
            </div>
          )}
        </div>
      );
    })()
    : selectedMethod === "upi"
      ? <label className="hotel-field"><span>UPI ID</span><input type="text" placeholder="name@bank" value={formValues.upiId} onChange={(event) => setFormValues((current) => ({ ...current, upiId: event.target.value }))} /></label>
      : selectedMethod === "card"
        ? <div className="hotel-form-grid"><label className="hotel-field"><span>Card number</span><input type="text" placeholder="XXXX XXXX XXXX XXXX" value={formValues.cardNumber} onChange={(event) => handleCardNumberChange(event.target.value)} /></label><label className="hotel-field"><span>Name on card</span><input type="text" placeholder="Card holder name" value={formValues.nameOnCard} onChange={(event) => setFormValues((current) => ({ ...current, nameOnCard: event.target.value }))} /></label><label className="hotel-field"><span>Expiry</span><input type="text" placeholder="MM/YY" value={formValues.expiry} onChange={(event) => handleExpiryChange(event.target.value)} /></label><label className="hotel-field"><span>CVV</span><input type="password" placeholder="CVV" value={formValues.cvv} onChange={(event) => handleCvvChange(event.target.value)} /></label></div>
        : selectedMethod === "netbanking"
          ? <label className="hotel-field"><span>Select bank</span><select value={formValues.bankName} onChange={(event) => setFormValues((current) => ({ ...current, bankName: event.target.value }))}><option value="">Choose bank</option><option value="hdfc">HDFC Bank</option><option value="icici">ICICI Bank</option><option value="sbi">State Bank of India</option><option value="axis">Axis Bank</option></select></label>
          : <label className="hotel-field"><span>Select wallet</span><CustomWalletSelect value={formValues.walletProvider} options={WALLET_OPTIONS} onChange={(val) => setFormValues((current) => ({ ...current, walletProvider: val }))} /></label>;

  const adults = Number(flowState.searchContext?.adults || 1);
  const children = Number(flowState.searchContext?.children || 0);
  const totalGuests = adults + children;
  const roomsCount = Number(flowState.searchContext?.roomsConfig?.length || flowState.searchContext?.rooms || 1);

  const checkInDisplay = offer?.checkInDate ? toDisplayDate(String(offer.checkInDate).split("T")[0]) : "";
  const checkOutDisplay = offer?.checkOutDate ? toDisplayDate(String(offer.checkOutDate).split("T")[0]) : "";
  const checkInDayStr = offer?.checkInDate ? new Date(offer.checkInDate).toLocaleDateString("en-IN", { weekday: "short" }) : "Wed";
  const checkOutDayStr = offer?.checkOutDate ? new Date(offer.checkOutDate).toLocaleDateString("en-IN", { weekday: "short" }) : "Fri";

  const stayLocation = hotel?.address || [hotel?.area, hotel?.city].filter(Boolean).join(", ");
  const reviewCount = hotel?.reviewCount || 1248;

  return (
    <main className="hotel-checkout-page hotel-checkout-page--confirm">
      <BookingTimer hideBanner={true} />
      <div className="hotel-checkout-shell">

        {/* Top Navbar: Breadcrumbs & Right Side Timer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "12px" }}>
          <div className="hotel-breadcrumbs" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.82rem", fontWeight: 600 }}>
            <span onClick={() => navigate("/")} className="breadcrumb-link" style={{ color: "var(--hotel-muted)", cursor: "pointer" }}>Search</span>
            <span style={{ color: "var(--hotel-muted)" }}>&gt;</span>
            <span onClick={() => navigate("/search/hotels")} className="breadcrumb-link" style={{ color: "var(--hotel-muted)", cursor: "pointer" }}>Hotel</span>
            <span style={{ color: "var(--hotel-muted)" }}>&gt;</span>
            <span onClick={() => navigate(-1)} className="breadcrumb-link" style={{ color: "var(--hotel-muted)", cursor: "pointer" }}>Hotel Details</span>
            <span style={{ color: "var(--hotel-muted)" }}>&gt;</span>
            <span onClick={() => navigate(-1)} className="breadcrumb-link" style={{ color: "var(--hotel-muted)", cursor: "pointer" }}>Passenger Details</span>
            <span style={{ color: "var(--hotel-muted)" }}>&gt;</span>
            <span style={{ color: "var(--hotel-ink)", fontWeight: 700 }}>Payment</span>
          </div>

          <BookingTimer mode="compact" />
        </div>

        {/* 70/30 Split Layout */}
        <div className="hotel-checkout-layout">

          {/* Left Column (70%) */}
          <div className="hotel-checkout-main">

            <section style={{ marginBottom: 20 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: "1.8rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Complete Your Payment</h1>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--hotel-muted)" }}>Almost there! Please review your booking and complete the payment.</p>
            </section>

            {/* Horizontal Hotel Details Card */}
            <div className="hotel-panel" style={{ padding: "20px", marginBottom: "24px" }}>
              <div className="payment-hotel-summary-card" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "20px", alignItems: "center" }}>
                <div className="hotel-img-block" style={{ width: "200px", height: "130px", borderRadius: "14px", overflow: "hidden" }}>
                  <img src={visuals.gallery[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"} alt={hotel?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="hotel-details-block" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--hotel-ink)" }}>{hotel?.name}</h2>
                  <div className="rating-row" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
                    <span className="rating-badge" style={{ background: "rgba(220, 30, 38, 0.08)", color: "var(--hotel-rose)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>{Number(hotel?.rating || 4.7).toFixed(1)}/5</span>
                    <span style={{ color: "var(--hotel-muted)" }}>({reviewCount} Reviews)</span>
                  </div>
                  <div className="location-text" style={{ fontSize: "0.8rem", color: "var(--hotel-muted)" }}>
                    📍 {stayLocation}
                  </div>
                  <div className="pills-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <span className="pill-tag wifi" style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem" }}>✓ Free Wi-Fi</span>
                    <span className="pill-tag breakfast" style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem" }}>🍳 Breakfast Included</span>
                    <span className="pill-tag freecancel" style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem" }}>✓ Free Cancellation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stay Details Card Container */}
            <div className="hotel-panel" style={{ padding: "20px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", fontWeight: 800, color: "var(--hotel-ink)", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "8px" }}>
                Stay Details
              </h3>
              <div className="stay-dates-block" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center" }}>
                <div>
                  <span className="stay-label" style={{ display: "block", fontSize: "0.78rem", color: "var(--hotel-muted)", fontWeight: 700 }}>Selected Room Type</span>
                  <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--hotel-ink)", marginTop: "4px" }}>
                    {offer?.roomCategory ? offer.roomCategory.split(",")[0].trim().replace(/_/g, " ") : "Standard Room"}
                  </strong>
                  {offer?.roomCategory && offer.roomCategory.includes(",") && (
                    <span style={{ display: "block", fontSize: "0.74rem", color: "var(--hotel-muted)", marginTop: "2px" }}>
                      {offer.roomCategory.split(",").slice(1).join(", ").trim().replace(/_/g, " ")}
                    </span>
                  )}

                  <span className="stay-label" style={{ display: "block", fontSize: "0.78rem", color: "var(--hotel-muted)", fontWeight: 700, marginTop: "12px" }}>Rooms & Guests</span>
                  <span className="stay-sub" style={{ display: "block", fontSize: "0.82rem", color: "var(--hotel-ink)", fontWeight: 700, marginTop: "2px" }}>
                    {roomsCount} {roomsCount > 1 ? "Rooms" : "Room"}, {adults} {adults > 1 ? "Adults" : "Adult"}{children > 0 ? `, ${children} ${children > 1 ? "Children" : "Child"}` : ""} ({nights} {nights > 1 ? "Nights" : "Night"})
                  </span>
                </div>

                <div className="dates-boxes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.04)" }}>
                  <div className="date-box" style={{ borderRight: "1px solid rgba(0,0,0,0.06)", paddingRight: "8px" }}>
                    <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase" }}>Check-in</span>
                    <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--hotel-ink)", marginTop: "4px" }}>{checkInDisplay}</strong>
                    <span style={{ display: "block", fontSize: "0.65rem", color: "var(--hotel-muted)", marginTop: "2px" }}>{checkInDayStr}, 02:00 PM</span>
                  </div>
                  <div className="date-box" style={{ paddingLeft: "8px" }}>
                    <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase" }}>Check-out</span>
                    <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--hotel-ink)", marginTop: "4px" }}>{checkOutDisplay}</strong>
                    <span style={{ display: "block", fontSize: "0.65rem", color: "var(--hotel-muted)", marginTop: "2px" }}>{checkOutDayStr}, 11:00 AM</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Apply Promo Code Card */}
            <div className="hotel-panel" style={{ padding: "20px", marginBottom: "16px" }}>
              <div className="payment-promo-card">
                <div className="promo-label" style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>🏷️</span>
                  <span style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--hotel-ink)" }}>
                    {promoType === "offers" ? "Apply Offers" : promoType === "coupons" ? "Apply Coupons" : "Apply Promo Code"}
                  </span>
                </div>

                <div style={{ marginBottom: promoType ? "14px" : "0px" }}>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--hotel-ink)",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">Select coupon or offer type...</option>
                    <option value="offers">Offers</option>
                    <option value="coupons">Coupons</option>
                    <option value="promocode">Promo Code (Manual Entry)</option>
                  </select>
                </div>

                {promoType === "offers" && (
                  <div style={{ display: "flex", overflowX: "auto", gap: "12px", paddingBottom: "10px", WebkitOverflowScrolling: "touch" }}>
                    {[
                      { code: "WELCOME500", desc: "Flat ₹500 discount on your first booking.", discount: 500, img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=80&q=80" },
                      { code: "HOTELDEAL", desc: "Get flat ₹1,000 off on select premium hotels.", discount: 1000, img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=80&q=80" }
                    ].map((item) => {
                      const isApplied = promoCode.toUpperCase() === item.code.toUpperCase() && promoDiscount > 0;
                      return (
                        <div
                          key={item.code}
                          onClick={() => {
                            if (isApplied) {
                              setPromoCode("");
                              setPromoDiscount(0);
                              setPromoSuccess("");
                              setPromoError("");
                            } else {
                              setPromoCode(item.code);
                              setPromoDiscount(item.discount);
                              setPromoSuccess(`Promo code "${item.code}" applied successfully! Saved ${formatCurrency(item.discount)}.`);
                              setPromoError("");
                            }
                          }}
                          style={{
                            minWidth: "260px",
                            flexShrink: 0,
                            border: isApplied ? "2px solid #2563eb" : "2px dashed #bfdbfe",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            background: isApplied ? "#eff6ff" : "#fff",
                            cursor: "pointer",
                            display: "grid",
                            gridTemplateColumns: "50px 1fr auto",
                            gap: "10px",
                            alignItems: "center"
                          }}
                        >
                          <div style={{ width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden" }}>
                            <img src={item.img} alt={item.code} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: "block", fontSize: "0.82rem", color: isApplied ? "#1e3a8a" : "var(--hotel-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.code}</strong>
                            <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.desc}</span>
                          </div>
                          <button
                            type="button"
                            style={{
                              background: isApplied ? "var(--hotel-rose)" : "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "4px 10px",
                              fontSize: "0.7rem",
                              fontWeight: 700
                            }}
                          >
                            {isApplied ? "Remove" : "Apply"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {promoType === "coupons" && (
                  <div style={{ display: "flex", overflowX: "auto", gap: "12px", paddingBottom: "10px", WebkitOverflowScrolling: "touch" }}>
                    {loadingCoupons ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--hotel-muted)", padding: "10px" }}>
                        <Loader2 className="hotel-spin" size={14} />
                        <span>Loading coupons...</span>
                      </div>
                    ) : (
                      dynamicCoupons.map((item) => {
                        const isApplied = promoCode.toUpperCase() === item.code.toUpperCase() && promoDiscount > 0;
                        const hasImg = !!item.img;
                        return (
                          <div
                            key={item.code}
                            onClick={() => {
                              if (isApplied) {
                                setPromoCode("");
                                setPromoDiscount(0);
                                setPromoSuccess("");
                                setPromoError("");
                              } else {
                                setPromoCode(item.code);
                                setPromoDiscount(item.discount);
                                setPromoSuccess(`Promo code "${item.code}" applied successfully! Saved ${formatCurrency(item.discount)}.`);
                                setPromoError("");
                              }
                            }}
                            style={{
                              minWidth: "260px",
                              flexShrink: 0,
                              border: isApplied ? "2px solid #16a34a" : "2px dashed #cbd5e1",
                              borderRadius: "12px",
                              padding: "10px 14px",
                              background: isApplied ? "#f0fdf4" : "#fff",
                              cursor: "pointer",
                              display: "grid",
                              gridTemplateColumns: hasImg ? "50px 1fr auto" : "1fr auto",
                              gap: "10px",
                              alignItems: "center"
                            }}
                          >
                            {hasImg && (
                              <div style={{ width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden" }}>
                                <img src={item.img} alt={item.code} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: "block", fontSize: "0.82rem", color: isApplied ? "#166534" : "var(--hotel-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.code}</strong>
                              <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.desc}</span>
                            </div>
                            <button
                              type="button"
                              style={{
                                background: isApplied ? "var(--hotel-rose)" : "#16a34a",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "4px 10px",
                                fontSize: "0.7rem",
                                fontWeight: 700
                              }}
                            >
                              {isApplied ? "Remove" : "Apply"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {promoType === "promocode" && (
                  <div className="payment-promo-input-row" style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={promoDiscount > 0}
                      style={{ textTransform: "uppercase", flex: 1, height: "38px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 12px", fontSize: "0.85rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (promoDiscount > 0) {
                          setPromoCode("");
                          setPromoDiscount(0);
                          setPromoSuccess("");
                          setPromoError("");
                        } else {
                          handleApplyPromo();
                        }
                      }}
                      style={{ background: promoDiscount > 0 ? "var(--hotel-rose)" : "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "0 16px", height: "38px", fontSize: "0.85rem", fontWeight: 700 }}
                    >
                      {promoDiscount > 0 ? "Remove" : "Apply"}
                    </button>
                  </div>
                )}

                {promoError && <p style={{ color: "var(--hotel-rose)", fontSize: "0.74rem", margin: "6px 0 0" }}>{promoError}</p>}
                {promoSuccess && <p style={{ color: "#16a34a", fontSize: "0.74rem", margin: "6px 0 0" }}>{promoSuccess}</p>}
              </div>
            </div>

            {/* Payment Options Accordion wrapped in a panel container */}
            <div className="hotel-panel" style={{ padding: "20px", marginBottom: "16px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.15rem", fontWeight: 800, color: "var(--hotel-ink)", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "10px" }}>
                Payment Options
              </h3>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "8px" }}>
                  Select Payment Method
                </label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--hotel-ink)",
                    background: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  <option value="">Choose a payment method...</option>
                  <option value="upi">UPI / QR (Pay using any UPI app)</option>
                  <option value="card">Credit / Debit / ATM Card</option>
                  <option value="netbanking">Net Banking (All major banks)</option>
                  <option value="wallet">Wallets (Paytm, PhonePe, Amazon)</option>
                  {isAgent && (
                    <option value="agent_wallet">Agent Wallet (Deduct from credit balance)</option>
                  )}
                </select>
              </div>

              {/* Dynamic details for chosen payment method */}
              {selectedMethod === "upi" && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  <label className="hotel-field">
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Enter UPI ID</span>
                    <input
                      type="text"
                      placeholder="username@bank"
                      value={formValues.upiId}
                      onChange={(event) => setFormValues((current) => ({ ...current, upiId: event.target.value }))}
                      style={{ width: "100%", height: "42px", borderRadius: 10, padding: "8px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>
              )}

              {selectedMethod === "card" && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  <div className="guest-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="hotel-field">
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Card Number</span>
                        <input
                          type="text"
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={formValues.cardNumber}
                          onChange={(event) => handleCardNumberChange(event.target.value)}
                          style={{ width: "100%", height: "42px", borderRadius: 10, padding: "8px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="hotel-field">
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Expiry</span>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={formValues.expiry}
                          onChange={(event) => handleExpiryChange(event.target.value)}
                          style={{ width: "100%", height: "42px", borderRadius: 10, padding: "8px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="hotel-field">
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>CVV</span>
                        <input
                          type="password"
                          placeholder="CVV"
                          value={formValues.cvv}
                          onChange={(event) => handleCvvChange(event.target.value)}
                          style={{ width: "100%", height: "42px", borderRadius: 10, padding: "8px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                        />
                      </label>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="hotel-field">
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Name on Card</span>
                        <input
                          type="text"
                          placeholder="Card holder name"
                          value={formValues.nameOnCard}
                          onChange={(event) => setFormValues((current) => ({ ...current, nameOnCard: event.target.value }))}
                          style={{ width: "100%", height: "42px", borderRadius: 10, padding: "8px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === "netbanking" && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  <label className="hotel-field">
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Select Bank</span>
                    <select
                      value={formValues.bankName}
                      onChange={(event) => setFormValues((current) => ({ ...current, bankName: event.target.value }))}
                      style={{ width: "100%", height: "42px", borderRadius: 10, padding: "6px 12px", fontSize: "0.85rem", border: "1px solid #cbd5e1" }}
                    >
                      <option value="">Choose bank</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="axis">Axis Bank</option>
                    </select>
                  </label>
                </div>
              )}

              {selectedMethod === "wallet" && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  <label className="hotel-field">
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hotel-muted)", display: "block", marginBottom: "6px" }}>Select Wallet Provider</span>
                    <CustomWalletSelect
                      value={formValues.walletProvider}
                      options={WALLET_OPTIONS}
                      onChange={(val) => setFormValues((current) => ({ ...current, walletProvider: val }))}
                    />
                  </label>
                </div>
              )}

              {selectedMethod === "agent_wallet" && isAgent && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  {fieldContent}
                </div>
              )}

              {selectedMethod === "paylater" && !isAgent && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                  <p style={{ fontSize: "0.82rem", color: "var(--hotel-muted)", margin: 0 }}>
                    Choose your card or EMI scheme on the next step redirection for processing.
                  </p>
                </div>
              )}

              {paymentError && <p className="hotel-helper hotel-helper--error" style={{ marginBottom: 16 }}>{paymentError}</p>}

              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.76rem", color: "var(--hotel-muted)", background: "#fafafa", padding: 12, borderRadius: 12, border: "1px solid #f1f5f9", marginTop: "16px" }}>
                <span>🔒 Secure 256-bit SSL encryption</span>
                <span>&bull;</span>
                <span>Your payment details are safe with us</span>
              </div>
            </div>

          </div>

          {/* Right Column Booking Sidebar (30%) */}
          <aside className="hotel-reserve-rail" style={{ display: "flex", flexDirection: "column", gap: "0px", marginTop: "85px" }}>

            {/* Consolidated Sidebar Container (Need Help, Important Info, We Accept, and Price Details) */}
            <div className="hotel-panel" style={{ padding: "20px", marginBottom: "20px" }}>
              {/* 1. Need Help sub-section */}
              <div
                onClick={() => navigate("/contact")}
                style={{ cursor: "pointer", display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "12px" }}
              >
                <span style={{ fontSize: "1.4rem" }}>📞</span>
                <div>
                  <strong style={{ textDecoration: "underline", color: "var(--hotel-rose)", fontSize: "1.05rem", display: "block" }}>Need help?</strong>
                  <span style={{ display: "block", marginTop: 4, fontSize: "0.78rem", color: "var(--hotel-muted)" }}>Click here to contact us, or reach us at support@picknbook.com</span>
                </div>
              </div>

              {/* 2. Important Payment Information sub-section */}
              <div style={{ marginBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "12px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.88rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Important Payment Information</h4>
                <ul style={{ paddingLeft: 14, fontSize: "0.76rem", color: "var(--hotel-muted)", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
                  <li>Full payment is required to confirm this booking request.</li>
                  <li>Rates are live and not guaranteed until checkout completes.</li>
                  <li>In case of transaction failures, your reservation is not held.</li>
                </ul>
              </div>

              {/* 3. We Accept sub-section */}
              <div style={{ marginBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "12px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.88rem", fontWeight: 800, color: "var(--hotel-ink)" }}>We Accept</h4>
                <div className="we-accept-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>VISA</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Mastercard</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>RuPay</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>UPI</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>AMEX</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Paytm</span>
                </div>
              </div>

              {/* 4. Price Details Card (At the bottom!) */}
              <div className="payment-price-card">
                <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Price Details</h3>
                <div className="payment-price-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.82rem" }}>
                  <span>Room Charges ({nights} {nights > 1 ? "Nights" : "Night"})</span>
                  <strong>{formatCurrency(fareSummary.baseFare)}</strong>
                </div>
                <div className="payment-price-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.82rem" }}>
                  <span>Taxes & Fees</span>
                  <strong>{formatCurrency(fareSummary.tax)}</strong>
                </div>
                <div className="payment-price-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.82rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Convenience Fee
                    <span title="Secured portal processing surcharge." style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 12, height: 12, borderRadius: "50%", background: "rgba(0,0,0,0.06)", fontSize: "0.6rem", fontWeight: "bold" }}>i</span>
                  </span>
                  <strong>{formatCurrency(fareSummary.convenienceFee)}</strong>
                </div>

                {(Number(fareSummary.discount || 0) + promoDiscount) > 0 && (
                  <div className="payment-price-row discount" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.82rem", color: "#16a34a" }}>
                    <span>Offer Discount</span>
                    <strong>-{formatCurrency(Number(fareSummary.discount || 0) + promoDiscount)}</strong>
                  </div>
                )}

                <div className="payment-price-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "10px", marginTop: "10px", fontSize: "1rem", fontWeight: 800, color: "var(--hotel-ink)" }}>
                  <span>Total Amount</span>
                  <strong>{formatCurrency(finalPayableAmount)}</strong>
                </div>
              </div>

            </div>

            {/* Red Pay CTA Button wrapper */}
            <div className="pay-cta-wrapper" style={{ marginTop: "10px", display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%" }}>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  height: "48px",
                  background: "var(--hotel-rose)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(220, 30, 38, 0.15)",
                  transition: "all 0.2s ease"
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="hotel-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <span>Pay {formatCurrency(finalPayableAmount)}</span>
                    <span>🔒</span>
                  </>
                )}
              </button>
              <span className="pay-cta-subtext" style={{ display: "block", textAlign: "center", marginTop: "8px", fontSize: "0.74rem", color: "var(--hotel-muted)", width: "100%" }}>
                You will be redirected to a secure payment gateway
              </span>
            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}

