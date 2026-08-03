import React, { useState, useEffect } from "react";
import {
  Loader2,
  X,
  ShieldCheck,
  ArrowRight,
  Info,
  XCircle,
  Plane
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ticketLCC, holdGDS, ticketGDS, extractSrdvPnrAndBookingId, getFareRule, listFlightBookings, searchFlights } from "../../services/flightBookingService";
import { sendBookingNotifications } from "../../services/bookingNotificationsService";
import "../../STYLES/FlightBookingFlow.css";
import BookingTimer from "./BookingTimer";
import { saveBookingPassengersToTravelers } from "../../utils/travelerStorage";
import {
  clearFlightBookingFlowState,
  readFlightBookingFlowState,
} from "./flightBookingFlowStore";
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
  MobiKwikIcon
} from "../../components/PaymentIcons";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: UpiIcon },
  { id: "card", label: "Credit / Debit Card", icon: CardIcon },
  { id: "netbanking", label: "Net Banking", icon: NetBankingIcon },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

function isPaymentInputValid(method, formValues, upiSubMethod = "qr") {
  if (method === "agent_wallet") {
    return true;
  }

  if (method === "upi") {
    if (upiSubMethod === "qr") return true;
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

function ddMmYyyyToYyyyMmDd(val) {
  if (!val) return "";
  const match = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return val;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function mapPassengersForApi(passengers, contact = null) {
  return (Array.isArray(passengers) ? passengers : []).map((passenger, index) => {
    const seatNumber = passenger.seatNumber || passenger.seatLabel || passenger.SeatNumber || "";
    return {
    ...passenger,
    fullName: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim() || `Passenger ${index + 1}`,
    title: passenger.title || passenger.Title || "Mr",
    firstName: passenger.firstName || passenger.FirstName || "",
    lastName: passenger.lastName || passenger.LastName || "",
    passengerType: passenger.passengerType || "Adult",
    gender: passenger.gender || "Male",
    nationality: passenger.nationality || "Indian",
    email: passenger.email || passenger.Email || contact?.email || "",
    contactNo: passenger.contactNo || passenger.ContactNo || contact?.mobile || "",
    ...(passenger.dob ? { dob: ddMmYyyyToYyyyMmDd(passenger.dob) } : {}),
    ...(seatNumber ? { seatNumber } : {}),
  };
  });
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

function buildFlightBookingPayload(flowState) {
  const selectedSeats = Array.isArray(flowState.selectedSeats) ? flowState.selectedSeats : [];
  const selectedMeal = flowState.selectedMeal || null;
  const selectedBaggage = flowState.selectedBaggage || null;
  const passengers = mapPassengersForApi((flowState.passengers || []).map((passenger, index) => ({
    ...passenger,
    seatCode: passenger.seatCode || selectedSeats[index]?.code || "",
    baggage: passenger.baggage || (selectedBaggage ? [selectedBaggage] : []),
    mealDynamic: passenger.mealDynamic || (selectedMeal ? [selectedMeal] : []),
  })), flowState.contact);
  const rawClass =
    flowState.flight?.selectedTravelClass ||
    flowState.flight?.className ||
    flowState.searchContext?.cabinClass ||
    "Economy";

  const adults = (flowState.passengers || []).filter(p => p.passengerType === "Adult").length;
  const children = (flowState.passengers || []).filter(p => p.passengerType === "Child").length;
  const infants = (flowState.passengers || []).filter(p => p.passengerType === "Infant").length;

  return {
    flight: flowState.flight || null,
    passengerName: passengers[0]?.fullName || "Passenger",
    passengerPhone: String(flowState.contact?.mobile || "").trim(),
    passengerEmail: String(flowState.contact?.email || "").trim(),
    travelClass: resolveCleanTravelClass(rawClass),
    passengers,
    couponCode: flowState.couponCode ? flowState.couponCode.trim().toUpperCase() : null,
    selectedFeaturedOfferId: flowState.selectedFeaturedOfferId || null,
    selectedPromotionId: flowState.selectedFeaturedOfferId || null,
    adults: adults || 1,
    children: children || 0,
    infants: infants || 0,
  };
}

function shouldUseDemoFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("cannot")
  );
}

function formatDisplayDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildTicketPayload(flowState, bookingResponse, paymentMethod, mode = "live") {
  const flight = flowState.flight || {};
  const fareSummary = flowState.fareSummary || {};
  const passengers = Array.isArray(flowState.passengers) ? flowState.passengers : [];
  const selectedSeats = Array.isArray(flowState.selectedSeats) ? flowState.selectedSeats : [];

  const bookingReference =
    bookingResponse?.bookingReference || bookingResponse?.PNR || bookingResponse?.pnr || `FL-${Date.now().toString().slice(-8)}`;
  const apiPassengers = Array.isArray(bookingResponse?.passengers)
    ? bookingResponse.passengers
    : [];
  const apiSeatAssignments = apiPassengers
    .map((passenger) => passenger?.seatNumber)
    .filter(Boolean);

  const isReturn = Boolean(flowState.isReturnFlight);
  const flightObj = flowState.flight || flight;

  const departureDate = isReturn
    ? (flowState.searchContext?.returnDate || flightObj.departDate || flowState.searchContext?.departureDate || "")
    : (flowState.searchContext?.departureDate || flightObj.departDate || "");

  const departureTimeRaw = isReturn
    ? [departureDate, flightObj.departureTime || ""].join(" ").trim()
    : (bookingResponse?.departureTimeUtc || bookingResponse?.departureTimeIst || [departureDate, flightObj.departureTime || ""].join(" ").trim());

  const arrivalTimeRaw =
    bookingResponse?.arrivalTimeUtc || bookingResponse?.arrivalTimeIst || flightObj.arrivalTime || "";
  const bookedAtRaw = bookingResponse?.bookedAtUtc || new Date().toISOString();

  const fromCity = isReturn
    ? (flightObj.sourceCode || flightObj.source || flightObj.fromCity || flowState.searchContext?.destination || "MAA")
    : (flowState.searchContext?.source || flightObj.sourceCode || flightObj.source || flightObj.fromCity || bookingResponse?.fromCity || "DEL");

  const toCity = isReturn
    ? (flightObj.destinationCode || flightObj.destination || flightObj.toCity || flowState.searchContext?.source || "DEL")
    : (flowState.searchContext?.destination || flightObj.destinationCode || flightObj.destination || flightObj.toCity || bookingResponse?.toCity || "MAA");

  const providerName = isReturn
    ? (flightObj.airlineName || flightObj.airline || "Flight Service")
    : (bookingResponse?.providerName || flightObj.airlineName || flightObj.airline || "Flight Service");

  const tripNumber = isReturn
    ? (flightObj.flightNumber || "QP-1102")
    : (bookingResponse?.tripNumber || bookingResponse?.flightNumber || flightObj.flightNumber || "--");

  return {
    ticketType: "flight",
    bookingReference,
    status: bookingResponse?.status || "Booked",
    providerName,
    tripNumber,
    fromCity,
    toCity,
    departureTime: formatDisplayDateTime(departureTimeRaw) || departureTimeRaw,
    arrivalTime: formatDisplayDateTime(arrivalTimeRaw) || arrivalTimeRaw,
    duration: flightObj.duration || "--",
    bookedAt: bookedAtRaw,
    passengers:
      apiPassengers.length > 0
        ? apiPassengers.map((passenger, index) => {
            const originalPassenger = passengers[index] || {};
            return {
              name: passenger.fullName || `Passenger ${index + 1}`,
              passengerType: passenger.passengerType || originalPassenger.passengerType || "Adult",
              seat: isReturn ? (originalPassenger.returnSeatLabel || passenger.seatNumber || originalPassenger.seatLabel || "") : (passenger.seatNumber || originalPassenger.seatLabel || ""),
              gender: passenger.gender || originalPassenger.gender || "Male",
              title: passenger.title || originalPassenger.title || "",
            };
          })
        : passengers.map((passenger) => ({
            name: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
              .replace(/\s+/g, " ")
              .trim(),
            passengerType: passenger.passengerType || "Adult",
            seat: isReturn ? (passenger.returnSeatLabel || passenger.seatLabel || "") : (passenger.seatLabel || ""),
            gender: passenger.gender || "Male",
            title: passenger.title || "",
          })),
    seats:
      apiSeatAssignments.length > 0
        ? apiSeatAssignments
        : selectedSeats.map((seat) => seat.label || seat),
    contact: flowState.contact || {},
    userId: String(flowState.contact?.userId || localStorage.getItem("userId") || "123"),
    userEmail: String(flowState.contact?.email || "").trim(),
    userMobile: String(flowState.contact?.mobile || "").trim(),
    passengerName:
      apiPassengers[0]?.fullName ||
      (passengers[0]
        ? `${passengers[0].title || ""} ${passengers[0].firstName || ""} ${passengers[0].lastName || ""}`.trim()
        : "Passenger"),
    passengerPhone: String(flowState.contact?.mobile || "").trim(),
    passengerEmail: String(flowState.contact?.email || "").trim(),
    totalPriceInr: Number(flowState.payableAmount || fareSummary.totalFare || 0),
    departureTimeUtc: departureTimeRaw,
    arrivalTimeUtc: arrivalTimeRaw,
    bookedAtUtc: bookedAtRaw,
    pnr: bookingReference,
    bookingId: bookingResponse?.bookingId || bookingResponse?.BookingId || bookingReference,
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label || paymentMethod),
    fare: {
      baseFare: Number(fareSummary.baseFare || 0),
      tax: Number(fareSummary.tax || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(flowState.couponDiscount || fareSummary.discount || 0),
      totalFare: Number(flowState.payableAmount || fareSummary.totalFare || 0),
      tripSecureFee: Number(fareSummary.tripSecureFee || 0),
      travelAssistanceFee: Number(fareSummary.travelAssistanceFee || 0),
      zeroCancellationFee: Number(fareSummary.zeroCancellationFee || 0),
    },
    totalPaid: Number(flowState.payableAmount || fareSummary.totalFare || 0),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: flowState.contact?.whatsappUpdates ? "Queued" : "Skipped",
    },
    mode,
  };
}

export default function FlightPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const flight = flowState.flight || null;
  const passengers = flowState.passengers || [];
  const selectedSeats = flowState.selectedSeats || [];
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);

  const isAgent = localStorage.getItem("b2b_role") === "Agent" && !localStorage.getItem("token");
  const [agentProfile, setAgentProfile] = useState(null);

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

  const availableMethods = PAYMENT_METHODS;
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [upiSubMethod, setUpiSubMethod] = useState("qr");
  const [activeField, setActiveField] = useState("");
  const [qrTimer, setQrTimer] = useState(300);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setQrTimer((t) => (t > 0 ? t - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCardNumberInput = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 16);
    const groups = value.match(/.{1,4}/g) || [];
    setFormValues((prev) => ({ ...prev, cardNumber: groups.join(" ") }));
  };

  const handleExpiryInput = (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setFormValues((prev) => ({ ...prev, expiry: value }));
  };

  const getCardNetworkLogo = (cardNumber) => {
    const clean = String(cardNumber || "").replace(/\D/g, "");
    if (clean.startsWith("4")) return <span className="network-logo visa">VISA</span>;
    if (clean.startsWith("5")) return <span className="network-logo mastercard">Mastercard</span>;
    if (clean.startsWith("6")) return <span className="network-logo rupay">RuPay</span>;
    return <span className="network-logo generic">CARD</span>;
  };

  const formatCardNumberDisplay = (cardNumber) => {
    const clean = String(cardNumber || "").replace(/\D/g, "");
    const padded = clean.padEnd(16, "•");
    const groups = padded.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };

  // Seats are optional for LCC flights — only block if there are no passengers or no flight selected
  if (!flight || passengers.length === 0) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Payment details unavailable</h2>
            <p>Complete passenger details before opening payment.</p>
            <button type="button" onClick={() => navigate("/flight/passenger-details")}>Back to Passenger Details</button>
          </section>
        </div>
      </main>
    );
  }
  const handlePayNow = async () => {
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
    } else {
      if (!isPaymentInputValid(selectedMethod, formValues, upiSubMethod)) {
        setPaymentError("Enter valid payment details for the selected method.");
        return;
      }
    }

    setPaymentError("");
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });

      let response = null;
      try {
        const traceId = flight?.traceId || flight?.TraceId || sessionStorage.getItem("last_booking_trace_id") || sessionStorage.getItem("flight_trace_id") || "";
        const resultIndex = flight?.resultIndex || flight?.ResultIndex || flight?.id || "";
        
        let storedSelectedFlight = {};
        try { storedSelectedFlight = JSON.parse(sessionStorage.getItem("SelectedFlight")||"{}"); } catch(e){}
        const isLcc = flight?.isLcc ?? flight?.IsLcc ?? storedSelectedFlight?.IsLCC ?? true;
        const srdvType = flight?.srdvType || flight?.SrdvType || "MixAPI";
        const srdvIndex = flight?.srdvIndex || flight?.SrdvIndex || "2";

        const baseFare = flowState.fareSummary?.baseFare || 0;
        const tax = flowState.fareSummary?.tax || 0;
        const passengers = flowState.passengers || [];
        const contactNo = flowState.contact?.mobile || formValues?.passengerPhone || "";

        if (isLcc) {
          const lccResponse = await ticketLCC({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, contactNo, couponCode: flowState.couponCode });
          if (!lccResponse || (lccResponse.error && !lccResponse.success)) {
            throw new Error(lccResponse?.error || "TicketLCC request failed.");
          }
          const extracted = extractSrdvPnrAndBookingId(lccResponse?.rawResponse || lccResponse);
          response = {
            ...lccResponse,
            pnr: extracted.pnr || lccResponse.pnr || lccResponse.bookingId,
            bookingReference: extracted.pnr || lccResponse.pnr || lccResponse.bookingId,
            bookingId: extracted.bookingId || lccResponse.bookingId,
            status: "Confirmed"
          };
        } else {
          const holdResponse = await holdGDS({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, contactNo, couponCode: flowState.couponCode });
          if (holdResponse?.error) {
             throw new Error(holdResponse?.error || "HoldGDS request failed.");
          }
          const { pnr, bookingId } = extractSrdvPnrAndBookingId(holdResponse?.rawResponse || holdResponse);
          if (!pnr || !bookingId) {
             throw new Error("HoldGDS succeeded but did not return a valid PNR.");
          }
          const gdsResponse = await ticketGDS({ traceId, resultIndex, srdvType, srdvIndex, pnr, bookingId, couponCode: flowState.couponCode });
          if (!gdsResponse || (gdsResponse.error && !gdsResponse.success)) {
             throw new Error(gdsResponse?.error || "TicketGDS request failed.");
          }
          const gdsExtracted = extractSrdvPnrAndBookingId(gdsResponse?.rawResponse || gdsResponse);
          response = {
            ...gdsResponse,
            pnr: gdsExtracted.pnr || pnr,
            bookingReference: gdsExtracted.pnr || pnr,
            bookingId: gdsExtracted.bookingId || bookingId,
            status: "Confirmed"
          };
        }

        if (response?.bookingReference || response?.pnr) {
          try {
            const bookingRef = response.bookingReference || response.pnr;
            sessionStorage.setItem("last_completed_booking_ref", bookingRef);
            sessionStorage.setItem("last_booking_trace_id", String(traceId || ""));
          } catch {}
        }
      } catch (bookErr) {
        console.error("Booking API Error from SRDV Backend:", bookErr);
        const displayMsg = String(bookErr?.message || "Booking failed. Please verify passenger details and try again.");
        setPaymentError(displayMsg);
        setIsSubmitting(false);
        return;
      }

      // Strict Response Payload Verification:
      // Verify ErrorCode is "0" or ResponseStatus is 1 or valid PNR/BookingReference exists
      const respStatus = response?.responseStatus ?? response?.ResponseStatus ?? response?.rawResponse?.ResponseStatus ?? null;
      const errObj = response?.Error || response?.error || response?.rawResponse?.Error || response?.rawResponse?.Response?.Error;
      const errCode = errObj?.ErrorCode !== undefined && errObj?.ErrorCode !== null ? String(errObj.ErrorCode) : "0";

      const isBookingConfirmed =
        Boolean(response?.bookingReference || response?.pnr || response?.bookingId) ||
        respStatus === 1 ||
        respStatus === "1" ||
        errCode === "0" ||
        errCode === "000" ||
        errCode === "";

      if (!response || !isBookingConfirmed) {
        const errorMessage = errObj?.ErrorMessage || response?.error || "Flight booking failed on supplier system.";
        setPaymentError(errorMessage);
        setIsSubmitting(false);
        return;
      }

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

      const ticketPayload = buildTicketPayload(
        flowState,
        response,
        selectedMethod,
        "live"
      );

      let currentUser = {};
      try {
        const userStr = localStorage.getItem("user") || localStorage.getItem("b2b_user");
        if (userStr) currentUser = JSON.parse(userStr);
      } catch {}

      ticketPayload.userId = currentUser?.id || currentUser?.userId || "";
      ticketPayload.userEmail = currentUser?.email || flowState.contact?.email || "";
      ticketPayload.userMobile = currentUser?.mobile || currentUser?.phone || flowState.contact?.mobile || "";

      let returnTicketPayload = null;
      if (flowState.isTwoWay && flowState.returnFlight) {
        const returnFlight = flowState.returnFlight;
        const returnFlowState = {
          ...flowState,
          flight: returnFlight,
          isReturnFlight: true,
          searchContext: {
            ...flowState.searchContext,
            source: flowState.searchContext?.destination || returnFlight.sourceCode,
            destination: flowState.searchContext?.source || returnFlight.destinationCode,
            departureDate: flowState.searchContext?.returnDate || returnFlight.departDate
          }
        };

        try {
          let returnResponse = null;
          const retTraceId = returnFlight?.traceId || returnFlight?.TraceId || "";
          const retResultIndex = returnFlight?.resultIndex || returnFlight?.ResultIndex || returnFlight?.id || "";
          const retIsLcc = Boolean(returnFlight?.isLcc || returnFlight?.IsLcc || returnFlight?.IsLCC || true);
          const retSrdvType = returnFlight?.srdvType || returnFlight?.SrdvType || "MixAPI";
          const retSrdvIndex = returnFlight?.srdvIndex || returnFlight?.SrdvIndex || "2";
          
          if (retIsLcc) {
            const lccRet = await ticketLCC({ traceId: retTraceId, resultIndex: retResultIndex, srdvType: retSrdvType, srdvIndex: retSrdvIndex, passengers: flowState.passengers || [], baseFare: flowState.fareSummary?.baseFare || 0, tax: flowState.fareSummary?.tax || 0, flight: returnFlight, contactNo: flowState.contact?.mobile || formValues?.passengerPhone || "", couponCode: flowState.couponCode });
            if (!lccRet || (lccRet.error && !lccRet.success)) throw new Error(lccRet?.error || "Return TicketLCC failed");
            const ext = extractSrdvPnrAndBookingId(lccRet?.rawResponse || lccRet);
            returnResponse = { ...lccRet, pnr: ext.pnr || lccRet.pnr || lccRet.bookingId, bookingReference: ext.pnr || lccRet.pnr || lccRet.bookingId, bookingId: ext.bookingId || lccRet.bookingId, status: "Confirmed" };
          } else {
            const holdRet = await holdGDS({ traceId: retTraceId, resultIndex: retResultIndex, srdvType: retSrdvType, srdvIndex: retSrdvIndex, passengers: flowState.passengers || [], baseFare: flowState.fareSummary?.baseFare || 0, tax: flowState.fareSummary?.tax || 0, flight: returnFlight, contactNo: flowState.contact?.mobile || formValues?.passengerPhone || "", couponCode: flowState.couponCode });
            if (holdRet?.error) throw new Error(holdRet?.error || "Return HoldGDS failed");
            const { pnr, bookingId } = extractSrdvPnrAndBookingId(holdRet?.rawResponse || holdRet);
            if (!pnr || !bookingId) throw new Error("Return HoldGDS failed to return PNR");
            const gdsRet = await ticketGDS({ traceId: retTraceId, resultIndex: retResultIndex, srdvType: retSrdvType, srdvIndex: retSrdvIndex, pnr, bookingId, couponCode: flowState.couponCode });
            if (!gdsRet || (gdsRet.error && !gdsRet.success)) throw new Error(gdsRet?.error || "Return TicketGDS failed");
            const extGds = extractSrdvPnrAndBookingId(gdsRet?.rawResponse || gdsRet);
            returnResponse = { ...gdsRet, pnr: extGds.pnr || pnr, bookingReference: extGds.pnr || pnr, bookingId: extGds.bookingId || bookingId, status: "Confirmed" };
          }

          returnTicketPayload = buildTicketPayload(
            returnFlowState,
            returnResponse,
            selectedMethod,
            "live"
          );
        } catch (returnErr) {
          console.error("Return flight booking API failed:", returnErr);
          throw new Error("Return flight booking failed: " + (returnErr.message || "Unknown error"));
        }

        returnTicketPayload.userId = ticketPayload.userId;
        returnTicketPayload.userEmail = ticketPayload.userEmail;
        returnTicketPayload.userMobile = ticketPayload.userMobile;
        returnTicketPayload.isReturnFlight = true;
      }

      const notificationStatus = await sendBookingNotifications({
        bookingReference: ticketPayload.bookingReference,
        ticketType: "flight",
        providerName: ticketPayload.providerName,
        fromCity: ticketPayload.fromCity,
        toCity: ticketPayload.toCity,
        departureTime: ticketPayload.departureTime,
        contact: ticketPayload.contact,
      });
      ticketPayload.notifications = notificationStatus;

      try {
        const ticketKeys = ["mock_tickets", "my_flight_bookings", "user_flight_tickets", "stored_tickets"];
        ticketKeys.forEach((key) => {
          try {
            const existingStr = localStorage.getItem(key);
            const existing = existingStr ? JSON.parse(existingStr) : [];
            if (Array.isArray(existing)) {
              if (returnTicketPayload) {
                existing.unshift(returnTicketPayload);
              }
              existing.unshift(ticketPayload);
              localStorage.setItem(key, JSON.stringify(existing));
            }
          } catch {}
        });
        localStorage.setItem("latest_ticket", JSON.stringify(ticketPayload));
      } catch (e) {
        console.error("Error saving flight booking to local caches:", e);
      }

      // Primary backend booking endpoints (TicketLCC / TicketGDS / HoldGDS) automatically persist
      // the reservation to the database. Secondary HTTP calls are omitted to avoid 404 errors.

      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      sessionStorage.removeItem("booking_session_expiry");
      clearFlightBookingFlowState();

      const confirmationState = {
        ...ticketPayload,
        isTwoWay: Boolean(returnTicketPayload),
        onwardTicket: ticketPayload,
        returnTicket: returnTicketPayload,
      };

      try {
        sessionStorage.setItem("BookingResponse", JSON.stringify(confirmationState));
      } catch (e) {}

      navigate("/ticket/confirmation", { state: confirmationState, replace: true });
    } catch (error) {
      const fallbackMessage = shouldUseDemoFallback(error)
        ? "Booking could not be saved to the server. Please check your connection or backend API and try again."
        : "Unable to process payment right now.";

      setPaymentError(error.message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
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
                  <span className="flight-city-name">{flowState.searchContext?.source || "--"}</span>
                </div>
                <div className="flight-stops-indicator">
                  <span className="stops-text">{Number(flight.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                  <div className="stops-line"></div>
                </div>
                <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                  <span className="flight-city-code">{flight.destinationCode || "--"}</span>
                  <span className="flight-city-name">{flowState.searchContext?.destination || "--"}</span>
                </div>
              </div>
              <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{flight.airlineName || flight.airline} ({flight.flightNumber})</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="flight-date-badge">{flight.departDate || flowState.searchContext?.departureDate || "--"}</span>
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
                    <span className="flight-city-name">{flowState.searchContext?.destination || "--"}</span>
                  </div>
                  <div className="flight-stops-indicator">
                    <span className="stops-text">{Number(flowState.returnFlight.stops || 0) > 0 ? `${flowState.returnFlight.stops} stop` : "Non stop"}</span>
                    <div className="stops-line"></div>
                  </div>
                  <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                    <span className="flight-city-code">{flowState.returnFlight.destinationCode || "--"}</span>
                    <span className="flight-city-name">{flowState.searchContext?.source || "--"}</span>
                  </div>
                </div>
                <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{flowState.returnFlight.airlineName || flowState.returnFlight.airline} ({flowState.returnFlight.flightNumber})</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="flight-date-badge">{flowState.returnFlight.departDate || flowState.searchContext?.returnDate || "--"}</span>
                    <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                      ₹{new Intl.NumberFormat("en-IN").format(Number(flowState.returnFlight.fare || flowState.returnFlight.price || flowState.returnFlight.priceInr || flowState.returnFlight.selectedTravelClassPriceInr || 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Travellers Details */}
          {passengers && passengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {passengers.map((p, idx) => (
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
              <span>Base Fare</span>
              <span>₹ {(Number(fareSummary.baseFare) || 0).toLocaleString("en-IN")}</span>
            </div>
            {Number(fareSummary.seatSurcharge) > 0 && (
              <div className="fare-row">
                <span>Seat Surcharge</span>
                <span>₹ {Number(fareSummary.seatSurcharge).toLocaleString("en-IN")}</span>
              </div>
            )}
            {(Number(fareSummary.mealFee) + Number(fareSummary.baggageFee)) > 0 && (
              <div className="fare-row">
                <span>Meals & Baggage</span>
                <span>₹ {(Number(fareSummary.mealFee) + Number(fareSummary.baggageFee)).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.tax) > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {Number(fareSummary.tax).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.markup) > 0 && (
              <div className="fare-row">
                <span>Service Markup</span>
                <span>₹ {Number(fareSummary.markup).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.convenienceFee) > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {Number(fareSummary.convenienceFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.assuredFee) > 0 && (
              <div className="fare-row">
                <span>PickNBook Fee</span>
                <span>₹ {Number(fareSummary.assuredFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.tripSecureFee) > 0 && (
              <div className="fare-row">
                <span>Trip Secure Fee</span>
                <span>₹ {Number(fareSummary.tripSecureFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.travelAssistanceFee) > 0 && (
              <div className="fare-row">
                <span>Travel Assistance</span>
                <span>₹ {Number(fareSummary.travelAssistanceFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(fareSummary.zeroCancellationFee) > 0 && (
              <div className="fare-row">
                <span>Zero Cancellation</span>
                <span>₹ {Number(fareSummary.zeroCancellationFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {Number(flowState.couponDiscount || fareSummary.discount) > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {Number(flowState.couponDiscount || fareSummary.discount).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {payableAmount.toLocaleString("en-IN")}</span>
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
          {/* Payment Selection Card */}
          <div className="flight-main-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <h2 className="flight-main-card-title" style={{ margin: 0 }}>Select Payment Method</h2>
              <div className="qr-timer" style={{ margin: 0 }}>
                ⏳ Expiration time: <span className="timer-countdown">{formatTimer(qrTimer)}</span>
              </div>
            </div>
            
            <div className="flight-payment-methods" style={{ padding: 0, marginBottom: 24 }}>
              {availableMethods.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  className={`payment-method-tab-btn ${selectedMethod === method.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMethod(method.id);
                    setPaymentError("");
                  }}
                >
                  <method.icon size={16} />
                  <span>{method.label}</span>
                </button>
              ))}
            </div>

            <div className="flight-payment-form" style={{ padding: 0 }}>
              {/* Agent Wallet Section */}
              {selectedMethod === "agent_wallet" && (() => {
                const markup = Number(flowState.fareSummary?.markup || 0);
                const tierDiscount = Number(flowState.fareSummary?.tierDiscount || 0);
                const volumeDiscount = Number(flowState.fareSummary?.volumeDiscount || 0);
                const wholesalePrice = payableAmount - markup - tierDiscount - volumeDiscount;
                const balance = Number(agentProfile?.walletBalance ?? 0);
                const hasSufficient = balance >= wholesalePrice;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 0" }}>
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

              {/* 1. UPI Payment Section */}
              {selectedMethod === "upi" && (
                <div className="upi-payment-container">
                  <div className="upi-sub-tabs">
                    <button
                      type="button"
                      className={`upi-sub-tab-btn ${upiSubMethod === "qr" ? "active" : ""}`}
                      onClick={() => setUpiSubMethod("qr")}
                    >
                      Instant QR Code
                    </button>
                    <button
                      type="button"
                      className={`upi-sub-tab-btn ${upiSubMethod === "vpa" ? "active" : ""}`}
                      onClick={() => setUpiSubMethod("vpa")}
                    >
                      Enter UPI ID
                    </button>
                  </div>

                  {upiSubMethod === "qr" ? (
                    <div className="upi-qr-scanner-box">
                      <div className="qr-code-placeholder">
                        <svg viewBox="0 0 100 100" className="mock-qr-svg">
                          <rect x="5" y="5" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="11" y="11" width="13" height="13" fill="#1e293b" />
                          <rect x="70" y="5" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="76" y="11" width="13" height="13" fill="#1e293b" />
                          <rect x="5" y="70" width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <rect x="11" y="76" width="13" height="13" fill="#1e293b" />
                          <path d="M40 5h10v10H40zm15 0h10v5H55zm15 15h10v10H70zm-30 15h10v10H40zm15 0h10v5H55zm15 0h5v10h-5zm-30 15h10v10H40zm15 0h10v10H55zm15 0h10v5H70zm-30 15h5v5h-5zm10 5h10v10H50zm15 0h5v5h-5zm15 0h10v10H80z" fill="#1e293b" />
                          <path d="M5 40h10v10H5zm15 0h10v5H20zm15 15h10v10H35zm-30 15h10v10H5zm15 0h10v5H20zm15 0h10v10H35z" fill="#1e293b" />
                        </svg>
                        <div className="qr-scanner-line"></div>
                      </div>
                      <div className="qr-instructions">
                        <p className="qr-main-text">Scan & Pay using GPay, PhonePe, Paytm or BHIM</p>
                        <p className="qr-sub-text">Generate secure dynamic checkout code</p>
                      </div>
                    </div>
                  ) : (
                    <div className="upi-vpa-box">
                      <div className="input-group">
                        <label>UPI ID (VPA) *</label>
                        <div className="upi-input-wrapper">
                          <input
                            className="input-control"
                            type="text"
                            placeholder="username@bank"
                            value={formValues.upiId}
                            onChange={(event) =>
                              setFormValues((previous) => ({ ...previous, upiId: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="upi-suffixes-row">
                        {["@okhdfcbank", "@okicici", "@okaxis", "@ybl", "@paytm"].map((suffix) => (
                          <button
                            key={suffix}
                            type="button"
                            className="upi-suffix-pill"
                            onClick={() => {
                              const prefix = formValues.upiId.split("@")[0] || "";
                              setFormValues((prev) => ({ ...prev, upiId: `${prefix}${suffix}` }));
                            }}
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="upi-apps-row">
                    <div className="upi-app-badge">
                      <span className="app-logo gpay">G</span>
                      <span className="app-label">Google Pay</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo phonepe">P</span>
                      <span className="app-label">PhonePe</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo paytm">Py</span>
                      <span className="app-label">Paytm</span>
                    </div>
                    <div className="upi-app-badge">
                      <span className="app-logo bhim">B</span>
                      <span className="app-label">BHIM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Card Payment Section */}
              {selectedMethod === "card" && (
                <div className="card-payment-container">
                  {/* Credit Card Preview */}
                  <div className="visual-card-wrapper">
                    <div className={`visual-card-preview ${activeField === "cvv" ? "flipped" : ""}`}>
                      <div className="card-face front">
                        <div className="card-glare"></div>
                        <div className="card-header-row">
                          <div className="card-chip">
                            <span className="chip-line"></span>
                            <span className="chip-line"></span>
                            <span className="chip-line"></span>
                          </div>
                          <div className="card-network-logo">
                            {getCardNetworkLogo(formValues.cardNumber)}
                          </div>
                        </div>
                        <div className="card-number-display">
                          {formatCardNumberDisplay(formValues.cardNumber)}
                        </div>
                        <div className="card-footer-row">
                          <div className="card-holder-display">
                            <span className="card-label">CARD HOLDER</span>
                            <span className="card-value">{formValues.nameOnCard.toUpperCase() || "HOLDER NAME"}</span>
                          </div>
                          <div className="card-expiry-display">
                            <span className="card-label">EXPIRES</span>
                            <span className="card-value">{formValues.expiry || "MM/YY"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-face back">
                        <div className="card-magnetic-stripe"></div>
                        <div className="card-signature-area">
                          <span className="signature-lines"></span>
                          <div className="card-cvv-display">{formValues.cvv || "•••"}</div>
                        </div>
                        <div className="card-back-info">
                          PCI-DSS Certified Simulated Gateway Checkout.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="card-inputs-grid">
                    <div className="input-group">
                      <label>Card Number *</label>
                      <input
                        className="input-control"
                        type="text"
                        maxLength="19"
                        placeholder="XXXX XXXX XXXX XXXX"
                        value={formValues.cardNumber}
                        onFocus={() => setActiveField("number")}
                        onBlur={() => setActiveField("")}
                        onChange={handleCardNumberInput}
                      />
                    </div>
                    <div className="input-group">
                      <label>Name on Card *</label>
                      <input
                        className="input-control"
                        type="text"
                        placeholder="Card holder name"
                        value={formValues.nameOnCard}
                        onFocus={() => setActiveField("name")}
                        onBlur={() => setActiveField("")}
                        onChange={(event) =>
                          setFormValues((previous) => ({
                            ...previous,
                            nameOnCard: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Expiry (MM/YY) *</label>
                        <input
                          className="input-control"
                          type="text"
                          maxLength="5"
                          placeholder="MM/YY"
                          value={formValues.expiry}
                          onFocus={() => setActiveField("expiry")}
                          onBlur={() => setActiveField("")}
                          onChange={handleExpiryInput}
                        />
                      </div>
                      <div className="input-group">
                        <label>CVV *</label>
                        <input
                          className="input-control"
                          type="password"
                          maxLength="4"
                          placeholder="CVV"
                          value={formValues.cvv}
                          onFocus={() => setActiveField("cvv")}
                          onBlur={() => setActiveField("")}
                          onChange={(event) =>
                            setFormValues((previous) => ({ ...previous, cvv: event.target.value.replace(/\D/g, "") }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Net Banking Payment Section */}
              {selectedMethod === "netbanking" && (
                <div className="netbanking-payment-container">
                  <label className="section-subtitle-label">Popular Banks</label>
                  <div className="popular-banks-grid">
                    {[
                      { id: "hdfc", label: "HDFC Bank", logo: "🏦" },
                      { id: "icici", label: "ICICI Bank", logo: "🏛️" },
                      { id: "sbi", label: "State Bank of India", logo: "💼" },
                      { id: "axis", label: "Axis Bank", logo: "🏬" },
                    ].map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        className={`bank-card-btn ${formValues.bankName === bank.id ? "active" : ""}`}
                        onClick={() => setFormValues((prev) => ({ ...prev, bankName: bank.id }))}
                      >
                        <span className="bank-logo-icon">{bank.logo}</span>
                        <span className="bank-label-text">{bank.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="input-group" style={{ marginTop: 16 }}>
                    <label>Or Select Other Bank</label>
                    <select
                      className="input-control"
                      value={formValues.bankName}
                      onChange={(event) =>
                        setFormValues((previous) => ({ ...previous, bankName: event.target.value }))
                      }
                    >
                      <option value="">-- Choose Other Bank --</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                      <option value="yesbank">Yes Bank</option>
                      <option value="pnb">Punjab National Bank</option>
                      <option value="indusind">IndusInd Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Wallet Payment Section */}
              {selectedMethod === "wallet" && (
                <div className="wallet-payment-container">
                  <label className="section-subtitle-label">Select Digital Wallet</label>
                  <div className="popular-wallets-grid">
                    {[
                      { id: "paytm", label: "Paytm", icon: PaytmIcon },
                      { id: "amazonpay", label: "Amazon Pay", icon: AmazonPayIcon },
                      { id: "phonepe", label: "PhonePe Wallet", icon: PhonePeIcon },
                      { id: "mobikwik", label: "MobiKwik", icon: MobiKwikIcon },
                    ].map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        className={`wallet-card-btn ${formValues.walletProvider === wallet.id ? "active" : ""}`}
                        onClick={() => setFormValues((prev) => ({ ...prev, walletProvider: wallet.id }))}
                      >
                        <span className="wallet-logo-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                          <wallet.icon size={24} />
                        </span>
                        <span className="wallet-label-text">{wallet.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {paymentError && (
              <p style={{ color: "var(--danger-color)", fontSize: "0.813rem", fontWeight: 700, margin: "16px 0 0 0" }}>
                {paymentError}
              </p>
            )}

            {/* Payment security badges */}
            <div className="payment-security-badges">
              <div className="security-badge">
                <ShieldCheck size={14} />
                <span>PCI-DSS Compliant</span>
              </div>
              <div className="security-badge">
                <span>🔒 256-bit SSL Secured</span>
              </div>
              <div className="security-badge">
                <span>Verified by VISA / Mastercard</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Payable Amount</span>
          <span className="bottom-price-amount">₹ {payableAmount.toLocaleString("en-IN")}</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handlePayNow}
          disabled={isSubmitting}
          style={{ minWidth: 160 }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Pay ₹ {payableAmount.toLocaleString("en-IN")}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* ── FARE RULES MODAL ── */}
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
