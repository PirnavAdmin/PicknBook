import React, { useState, useEffect, useMemo } from "react";
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
import { bookFlight, getFareRule, listFlightBookings, searchFlights, getFareQuote } from "../../services/flightBookingService";
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

function mapPassengersForApi(passengers) {
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
      nationality: passenger.nationality || "IN",
      email: passenger.email || passenger.Email || "",
      contactNo: passenger.contactNo || passenger.ContactNo || "",
      passportNo: passenger.passportNo || passenger.PassportNo || "",
      passportExpiry: passenger.passportExpiry || passenger.PassportExpiry || passenger.passportExpiryDate || "",
      passportExpiryDate: passenger.passportExpiryDate || passenger.passportExpiry || passenger.PassportExpiry || "",
      passportIssueDate: passenger.passportIssueDate || passenger.PassportIssueDate || "2023-01-01",
      passportIssueCountryCode: passenger.passportIssueCountryCode || passenger.PassportIssueCountryCode || "IN",
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
  const flight = flowState.flight || {};

  // Normalize a seat object to the exact schema SRDV TicketLCC requires.
  // The C# backend model deserializes FlightNumber, AirlineCode, Origin, Destination.
  // If any are missing/empty, SRDV throws "Invalid seat ssr data".
  const selectedLegs = Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0
    ? flowState.selectedLegs
    : [flowState.flight, flowState.returnFlight].filter(Boolean);

  const normalizeSeatForPayload = (s, legHint) => {
    if (!s || typeof s !== 'object') return null;
    const code = String(s.Code || s.code || s.SeatNumber || s.seatNumber || "").trim();
    if (!code) return null; // Drop seats with no Code — they are from generated fallback layouts
    const airlineCode = String(s.AirlineCode || s.airlineCode || legHint?.airlineCode || legHint?.AirlineCode || legHint?.airline || flight.airlineCode || flight.airline || "6E").trim();
    const flightNum = String(s.AirlineNumber || s.FlightNumber || s.flightNumber || s.airlineNumber || legHint?.flightNumber || legHint?.FlightNumber || flight.flightNumber || "").replace(/\D/g, "") || (flight.flightNumber || "101");
    const origin = String(s.Origin || s.origin || legHint?.sourceCode || legHint?.fromCity || legHint?.origin || flight.sourceCode || flight.fromCity || "DEL").toUpperCase().trim();
    const destination = String(s.Destination || s.destination || legHint?.destinationCode || legHint?.toCity || legHint?.destination || flight.destinationCode || flight.toCity || "BOM").toUpperCase().trim();
    return {
      ...s,
      Code: code,
      SeatNumber: String(s.SeatNumber || s.seatNumber || code).trim(),
      AirlineCode: airlineCode,
      FlightNumber: flightNum,
      AirlineNumber: flightNum,
      Origin: origin,
      Destination: destination,
      Amount: Number(s.Amount ?? s.amount ?? 0),
      IsBooked: true,
      IsAisle: Boolean(s.IsAisle ?? s.isAisle ?? false),
      IsLegroom: Boolean(s.IsLegroom ?? s.isLegroom ?? false),
    };
  };

  const passengers = mapPassengersForApi((flowState.passengers || []).map((passenger, index) => {
    // Normalize seatDynamic — drop any seat without a valid Code (fallback/generated layout seats)
    const rawSeatDynamic = Array.isArray(passenger.seatDynamic) ? passenger.seatDynamic : [];
    const normalizedSeatDynamic = rawSeatDynamic
      .map((s, legIdx) => normalizeSeatForPayload(s, selectedLegs[legIdx]))
      .filter(Boolean);

    // Also try the legacy selectedSeats[index].code path
    const legacySeatCode = passenger.seatCode || selectedSeats[index]?.code || "";

    return {
      ...passenger,
      seatCode: legacySeatCode,
      seatDynamic: normalizedSeatDynamic,
      baggage: passenger.baggageDynamic || passenger.baggage || (selectedBaggage ? [selectedBaggage] : []),
      mealDynamic: passenger.mealDynamic || (selectedMeal ? [selectedMeal] : []),
    };
  }));

  const rawClass =
    flowState.flight?.selectedTravelClass ||
    flowState.flight?.className ||
    flowState.searchContext?.cabinClass ||
    "Economy";

  const adults = (flowState.passengers || []).filter(p => p.passengerType === "Adult").length;
  const children = (flowState.passengers || []).filter(p => p.passengerType === "Child").length;
  const infants = (flowState.passengers || []).filter(p => p.passengerType === "Infant").length;

  return {
    flight: {
      ...(flowState.flight || {}),
      passengerPhone: String(flowState.contact?.mobile || "").trim(),
      passengerEmail: String(flowState.contact?.email || "").trim(),
      contactPhone: String(flowState.contact?.mobile || "").trim(),
      contactEmail: String(flowState.contact?.email || "").trim(),
      contact: flowState.contact || {},
    },
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
    isMultiCity: Boolean(flowState.isMultiCity),
    selectedLegs: selectedLegs,
    contact: flowState.contact || {},
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
    ? (flightObj.sourceName || flightObj.fromCity || flightObj.sourceCode || flightObj.source || flowState.searchContext?.destination || "")
    : (flowState.searchContext?.source || flightObj.sourceName || flightObj.fromCity || flightObj.sourceCode || flightObj.source || bookingResponse?.fromCity || "");

  const toCity = isReturn
    ? (flightObj.destinationName || flightObj.toCity || flightObj.destinationCode || flightObj.destination || flowState.searchContext?.source || "")
    : (flowState.searchContext?.destination || flightObj.destinationName || flightObj.toCity || flightObj.destinationCode || flightObj.destination || bookingResponse?.toCity || "");

  const providerName = isReturn
    ? (flightObj.airlineName || flightObj.airline || "Flight Service")
    : (bookingResponse?.providerName || flightObj.airlineName || flightObj.airline || "Flight Service");

  const tripNumber = isReturn
    ? (flightObj.flightNumber || flightObj.tripNumber || flightObj.AirlineNumber || flightObj.FlightNumber || "--")
    : (bookingResponse?.tripNumber || bookingResponse?.flightNumber || flightObj.flightNumber || flightObj.tripNumber || "--");

  const returnPnr =
    bookingResponse?.returnPnr ||
    bookingResponse?.returnPNR ||
    bookingResponse?.ticketLccResponse?.rawResponse?.Response?.ReturnPNR ||
    "";

  const backendFare =
    bookingResponse?.backendFare ||
    bookingResponse?.itinerary?.Fare ||
    bookingResponse?.ticketLccResponse?.rawResponse?.Response?.FlightItinerary?.Fare ||
    bookingResponse?.rawResponse?.Response?.FlightItinerary?.Fare ||
    {};

  const rawItinSegments =
    (Array.isArray(bookingResponse?.segments) && bookingResponse.segments.length > 0) ? bookingResponse.segments :
    (Array.isArray(bookingResponse?.itinerary?.Segments) && bookingResponse.itinerary.Segments.length > 0) ? bookingResponse.itinerary.Segments :
    (Array.isArray(bookingResponse?.ticketLccResponse?.rawResponse?.Response?.FlightItinerary?.Segments) && bookingResponse.ticketLccResponse.rawResponse.Response.FlightItinerary.Segments.length > 0) ? bookingResponse.ticketLccResponse.rawResponse.Response.FlightItinerary.Segments :
    (Array.isArray(bookingResponse?.rawResponse?.Response?.FlightItinerary?.Segments) && bookingResponse.rawResponse.Response.FlightItinerary.Segments.length > 0) ? bookingResponse.rawResponse.Response.FlightItinerary.Segments :
    [];

  let multiCityTickets = [];
  if (rawItinSegments.length > 1) {
    // API returned multiple confirmed flight segments (e.g. multi-city or connecting flights)
    multiCityTickets = rawItinSegments.slice(1).map((seg, sliceIndex) => {
      const index = sliceIndex + 1;
      const legAirCode = seg.Airline?.AirlineCode || seg.airline?.airlineCode || "";
      const legAirNum = seg.Airline?.FlightNumber || seg.airline?.flightNumber || "";
      const legFlNum = legAirCode && legAirNum ? `${legAirCode} ${legAirNum}` : (legAirNum || legAirCode || "--");
      const legFromCity = seg.Origin?.CityName || seg.Origin?.AirportName || seg.Origin?.AirportCode || "Origin";
      const legToCity = seg.Destination?.CityName || seg.Destination?.AirportName || seg.Destination?.AirportCode || "Destination";
      const legFromCode = seg.Origin?.AirportCode || seg.Origin?.Code || "";
      const legToCode = seg.Destination?.AirportCode || seg.Destination?.Code || "";

      return {
        ticketType: "flight",
        bookingReference: bookingReference,
        pnr: bookingReference,
        status: "Booked",
        providerName: seg.Airline?.AirlineName || seg.Airline?.AirlineCode || "Airline",
        tripNumber: legFlNum,
        flightNumber: legFlNum,
        fromCity: legFromCity,
        toCity: legToCity,
        fromCityCode: legFromCode,
        toCityCode: legToCode,
        sourceCode: legFromCode,
        destinationCode: legToCode,
        departureTime: seg.DepTime || departureTimeRaw,
        arrivalTime: seg.ArrTime || arrivalTimeRaw,
        terminal: seg.Origin?.Terminal || "",
        destinationTerminal: seg.Destination?.Terminal || "",
        gate: seg.Origin?.Terminal || "TBA",
        baggage: seg.Baggage || "15 Kg",
        cabinBaggage: seg.CabinBaggage || "7 Kg",
        duration: seg.Duration ? `${Math.floor(seg.Duration / 60)}h ${seg.Duration % 60}m` : "--",
        passengers: passengers.map((p) => {
          const dyn = Array.isArray(p.seatDynamic) ? p.seatDynamic[index] : null;
          const sNo = typeof dyn === "string" ? dyn : (dyn?.SeatNumber || dyn?.Code || dyn?.label);
          return {
            name: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "Passenger",
            passengerType: p.passengerType || "Adult",
            seat: sNo || "--",
          };
        }),
        isMultiCityLeg: true,
        legIndex: index,
      };
    });
  } else if (flowState.isMultiCity && Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 1) {
    multiCityTickets = flowState.selectedLegs.slice(1).map((leg, sliceIndex) => {
      const index = sliceIndex + 1;
      return {
        ticketType: "flight",
        bookingReference: bookingReference,
        pnr: bookingReference,
        status: "Booked",
        providerName: leg.airlineName || leg.airline || flightObj.airline || "Airline",
        tripNumber: leg.flightNumber || flightObj.flightNumber || "--",
        flightNumber: leg.flightNumber || flightObj.flightNumber || "--",
        fromCity: leg.sourceName || leg.fromCity || leg.sourceCode || "Origin",
        toCity: leg.destinationName || leg.toCity || leg.destinationCode || "Destination",
        fromCityCode: leg.sourceCode || "",
        toCityCode: leg.destinationCode || "",
        sourceCode: leg.sourceCode || "",
        destinationCode: leg.destinationCode || "",
        departureTime: leg.departDate || leg.departureDate || departureTimeRaw,
        passengers: passengers.map((p) => {
          const dyn = Array.isArray(p.seatDynamic) ? p.seatDynamic[index] : null;
          const sNo = typeof dyn === "string" ? dyn : (dyn?.SeatNumber || dyn?.Code || dyn?.label);
          return {
            name: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "Passenger",
            passengerType: p.passengerType || "Adult",
            seat: sNo || "--",
          };
        }),
        isMultiCityLeg: true,
        legIndex: index,
      };
    });
  }

  // Primary Ticket (Leg 1 / Segment 0) details
  const seg0 = rawItinSegments[0] || null;
  const firstLeg = flowState.isMultiCity && Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0
    ? flowState.selectedLegs[0]
    : null;

  const seg0AirCode = seg0?.Airline?.AirlineCode || "";
  const seg0AirNum = seg0?.Airline?.FlightNumber || "";
  const seg0FlNum = seg0AirCode && seg0AirNum ? `${seg0AirCode} ${seg0AirNum}` : (seg0AirNum || seg0AirCode || "");

  const resolvedFromCity = seg0?.Origin?.CityName || (firstLeg ? (firstLeg.sourceName || firstLeg.fromCity || firstLeg.sourceCode) : fromCity);
  const resolvedToCity = seg0?.Destination?.CityName || (firstLeg ? (firstLeg.destinationName || firstLeg.toCity || firstLeg.destinationCode) : toCity);
  const resolvedFromCityCode = seg0?.Origin?.AirportCode || (firstLeg ? firstLeg.sourceCode : "") || "";
  const resolvedToCityCode = seg0?.Destination?.AirportCode || (firstLeg ? firstLeg.destinationCode : "") || "";
  const resolvedProvider = seg0?.Airline?.AirlineName || (firstLeg ? (firstLeg.airlineName || firstLeg.airline) : providerName);
  const resolvedTripNumber = seg0FlNum || (firstLeg ? firstLeg.flightNumber : tripNumber);
  const resolvedDepartureTime = seg0?.DepTime || departureTimeRaw;
  const resolvedArrivalTime = seg0?.ArrTime || arrivalTimeRaw;
  const resolvedTerminal = seg0?.Origin?.Terminal || "";

  return {
    ticketType: "flight",
    bookingReference,
    pnr: bookingReference,
    returnPnr,
    returnPNR: returnPnr,
    status: bookingResponse?.status || "Booked",
    providerName: resolvedProvider || providerName,
    tripNumber: resolvedTripNumber || tripNumber,
    fromCity: resolvedFromCity,
    toCity: resolvedToCity,
    fromCityCode: resolvedFromCityCode,
    toCityCode: resolvedToCityCode,
    sourceCode: resolvedFromCityCode,
    destinationCode: resolvedToCityCode,
    terminal: resolvedTerminal,
    gate: resolvedTerminal || "TBA",
    departureTime: formatDisplayDateTime(resolvedDepartureTime) || resolvedDepartureTime,
    arrivalTime: formatDisplayDateTime(resolvedArrivalTime) || resolvedArrivalTime,
    duration: flightObj.duration || "--",
    bookedAt: bookedAtRaw,
    passengers:
      apiPassengers.length > 0
        ? apiPassengers.map((passenger, index) => {
          const originalPassenger = passengers[index] || {};
          return {
            name: passenger.fullName || `Passenger ${index + 1}`,
            passengerType: passenger.passengerType || originalPassenger.passengerType || "Adult",
            seat: originalPassenger.seatDynamic?.[isReturn ? 1 : 0]?.SeatNumber || originalPassenger.seatDynamic?.[isReturn ? 1 : 0]?.Code || originalPassenger.seatDynamic?.[isReturn ? 1 : 0]?.label || (isReturn ? (originalPassenger.returnSeatLabel || passenger.seatNumber || originalPassenger.seatLabel || "") : (passenger.seatNumber || originalPassenger.seatLabel || "")),
            gender: passenger.gender || originalPassenger.gender || "Male",
            title: passenger.title || originalPassenger.title || "",
            ticketNumber: passenger.ticketNumber || passenger.ticketId || "",
            passportNo: passenger.passportNo || originalPassenger.passportNo || "",
            passportExpiry: passenger.passportExpiry || originalPassenger.passportExpiry || "",
          };
        })
        : passengers.map((passenger) => ({
          name: `${passenger.title || ""} ${passenger.firstName || ""} ${passenger.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim(),
          passengerType: passenger.passengerType || "Adult",
          seat: passenger.seatDynamic?.[isReturn ? 1 : 0]?.SeatNumber || passenger.seatDynamic?.[isReturn ? 1 : 0]?.Code || passenger.seatDynamic?.[isReturn ? 1 : 0]?.label || (isReturn ? (passenger.returnSeatLabel || passenger.seatLabel || "") : (passenger.seatLabel || "")),
          gender: passenger.gender || "Male",
          title: passenger.title || "",
          passportNo: passenger.passportNo || "",
          passportExpiry: passenger.passportExpiry || "",
        })),
    seats:
      apiSeatAssignments.length > 0
        ? apiSeatAssignments
        : passengers.map(p => p.seatDynamic?.[isReturn ? 1 : 0]?.SeatNumber || p.seatDynamic?.[isReturn ? 1 : 0]?.Code || p.seatDynamic?.[isReturn ? 1 : 0]?.label || p.seatLabel || "").filter(Boolean),
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
    totalPriceInr: Number(backendFare.PublishedFare || backendFare.OfferedFare || flowState.payableAmount || fareSummary.totalFare || 0),
    departureTimeUtc: departureTimeRaw,
    arrivalTimeUtc: arrivalTimeRaw,
    bookedAtUtc: bookedAtRaw,
    bookingId: bookingReference,
    paymentMethod:
      paymentMethod === "agent_wallet"
        ? "Agent Wallet"
        : (PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label || paymentMethod),
    fare: {
      baseFare: Number(backendFare.BaseFare || fareSummary.baseFare || 0),
      tax: Number(backendFare.Tax || fareSummary.tax || 0),
      seatCharges: Number(backendFare.TotalSeatCharges || fareSummary.seatSurcharge || 0),
      otherCharges: Number(backendFare.OtherCharges || 0),
      mealCharges: Number(backendFare.TotalMealCharges || fareSummary.mealFee || 0),
      baggageCharges: Number(backendFare.TotalBaggageCharges || fareSummary.baggageFee || 0),
      convenienceFee: Number(fareSummary.convenienceFee || 0),
      discount: Number(flowState.couponDiscount || fareSummary.discount || 0),
      totalFare: Number(backendFare.PublishedFare || backendFare.OfferedFare || flowState.payableAmount || fareSummary.totalFare || 0),
      offeredFare: Number(backendFare.OfferedFare || backendFare.PublishedFare || flowState.payableAmount || fareSummary.totalFare || 0),
      publishedFare: Number(backendFare.PublishedFare || backendFare.OfferedFare || flowState.payableAmount || fareSummary.totalFare || 0),
      currency: backendFare.Currency || "INR",
      tripSecureFee: Number(fareSummary.tripSecureFee || 0),
      travelAssistanceFee: Number(fareSummary.travelAssistanceFee || 0),
      zeroCancellationFee: Number(fareSummary.zeroCancellationFee || 0),
    },
    totalPaid: Number(backendFare.PublishedFare || backendFare.OfferedFare || flowState.payableAmount || fareSummary.totalFare || 0),
    notifications: {
      email: "Queued",
      sms: "Queued",
      whatsapp: flowState.contact?.whatsappUpdates ? "Queued" : "Skipped",
    },
    mode,
    selectedLegs: flowState.selectedLegs || [],
    isMultiCity: Boolean(flowState.isMultiCity),
    multiCityTickets,
    traceId: bookingResponse?.traceId || bookingResponse?.TraceId || bookingResponse?.ticketLccResponse?.traceId || bookingResponse?.ticketLccResponse?.rawResponse?.TraceId || bookingResponse?.rawResponse?.TraceId || flowState?.flight?.traceId || sessionStorage.getItem("last_booking_trace_id") || sessionStorage.getItem("flight_trace_id") || localStorage.getItem("last_booking_trace_id") || "",
    TraceId: bookingResponse?.traceId || bookingResponse?.TraceId || bookingResponse?.ticketLccResponse?.traceId || bookingResponse?.ticketLccResponse?.rawResponse?.TraceId || bookingResponse?.rawResponse?.TraceId || flowState?.flight?.traceId || sessionStorage.getItem("last_booking_trace_id") || sessionStorage.getItem("flight_trace_id") || localStorage.getItem("last_booking_trace_id") || "",
    ticketLccResponse: bookingResponse?.ticketLccResponse || null,
    rawResponse: bookingResponse?.rawResponse || null
  };
}

export default function FlightPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};

  const flowState = useMemo(() => {
    let fqObj = null;
    if (typeof window !== "undefined") {
      try {
        const rawFq = window.sessionStorage.getItem("last_fare_quote") || window.sessionStorage.getItem("FareQuote");
        if (rawFq) fqObj = JSON.parse(rawFq);
      } catch (e) { }
    }

    const fqRes = fqObj?.results || fqObj?.Results || fqObj?.rawResponse?.Results || fqObj?.rawResponse?.Response?.Results || {};
    const fqFare = fqRes?.Fare || fqObj?.fare || {};

    const liveTotal = Number(fqRes?.B2CFinalFare ?? fqRes?.B2CPublishedFare ?? fqRes?.OfferedFare ?? fqFare?.PublishedFare ?? fqFare?.OfferedFare ?? 0);
    const liveBase = Number(fqRes?.DisplayBaseFare ?? fqRes?.B2CBaseFare ?? fqRes?.BaseFare ?? fqFare?.BaseFare ?? 0);
    const liveTax = Number(fqRes?.DisplayTax ?? fqRes?.B2CTax ?? fqRes?.Tax ?? fqFare?.Tax ?? 0);

    const mergedSummary = {
      ...(incomingState?.fareSummary || {}),
      ...(persistedState?.fareSummary || {}),
    };

    if (liveTotal > 0) {
      mergedSummary.totalFare = liveTotal;
      if (liveBase > 0) mergedSummary.baseFare = liveBase;
      if (liveTax > 0) mergedSummary.tax = liveTax;
    }

    const finalPayable = liveTotal > 0 ? liveTotal : (persistedState?.payableAmount || incomingState?.payableAmount || mergedSummary.totalFare || 0);

    return {
      ...incomingState,
      ...persistedState,
      fareSummary: mergedSummary,
      payableAmount: finalPayable,
    };
  }, [incomingState, persistedState]);

  const flight = flowState.flight || null;
  const passengers = flowState.passengers || [];
  const selectedSeats = flowState.selectedSeats || [];
  const fareSummary = flowState.fareSummary || {};
  const payableAmount = Number(flowState.payableAmount || fareSummary.totalFare || 0);

  const displayBaseFare = Number(fareSummary.baseFare || 0);
  const displayTax = Number(fareSummary.tax || 0);

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
    // Guard: drop if a booking is already in flight (prevents double-click / React Strict Mode duplicates)
    if (isSubmitting) return;

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
        response = await bookFlight({
          flightId: flight?.id || "flight-1",
          payload: buildFlightBookingPayload(flowState),
        });

        // Store booking reference in sessionStorage immediately after success
        // so retries can recover it if the user accidentally re-submits
        if (response?.bookingReference || response?.pnr) {
          try {
            const bookingRef = response.bookingReference || response.pnr;
            sessionStorage.setItem("last_completed_booking_ref", bookingRef);
            sessionStorage.setItem("last_booking_trace_id", String(flight?.traceId || ""));
          } catch { }
        }
      } catch (bookErr) {
        console.error("bookFlight API Error from SRDV Backend:", bookErr);
        const rawMsg = String(bookErr?.message || "");

        // Detect SRDV ErrorCode 2 / Stale Session errors:
        // "Booking Confirm Fare Data Not Found", "Ticket Request already done", "Session expired", etc.
        const rawMsgLower = rawMsg.toLowerCase();
        const isAlreadyDone =
          rawMsgLower.includes("already done") ||
          rawMsgLower.includes("ticket request already");

        const isFareExpired =
          rawMsgLower.includes("fare data not found") ||
          rawMsgLower.includes("confirm fare") ||
          rawMsgLower.includes("session expired") ||
          rawMsgLower.includes("traceid") ||
          rawMsgLower.includes("no data found") ||
          rawMsgLower.includes("invalid traceid");

        const isSeatMismatch =
          rawMsgLower.includes("invalid seat") ||
          rawMsgLower.includes("seat ssr") ||
          rawMsgLower.includes("seat code mapping");

        if (isSeatMismatch) {
          setPaymentError("Booking failed: Seat code mapping issue with the provider. Please clear your selection and try again.");
          setIsSubmitting(false);
          return;
        }

        if (isAlreadyDone) {
          // 1. Check if we have any completed ticket stored in session or local storage
          let storedTicket = null;
          try {
            const rawLatest = localStorage.getItem("latest_ticket");
            if (rawLatest) storedTicket = JSON.parse(rawLatest);
          } catch (e) { }

          const storedRef = sessionStorage.getItem("last_completed_booking_ref") || storedTicket?.bookingReference || storedTicket?.pnr;

          // Verify that the stored ticket belongs to the current passenger and route
          const currentFrom = String(flight?.sourceCode || flight?.fromCity || flowState.searchContext?.source || "").trim().toUpperCase();
          const currentTo = String(flight?.destinationCode || flight?.toCity || flowState.searchContext?.destination || "").trim().toUpperCase();
          const storedFrom = String(storedTicket?.fromCity || "").trim().toUpperCase();
          const storedTo = String(storedTicket?.toCity || "").trim().toUpperCase();

          const currentPax = String(flowState.passengers?.[0]?.firstName || "").trim().toLowerCase();
          const storedPax = String(storedTicket?.passengerName || storedTicket?.passengers?.[0]?.name || "").trim().toLowerCase();

          const isMatchingTicket =
            storedTicket &&
            (currentFrom === storedFrom || storedFrom.includes(currentFrom) || currentFrom.includes(storedFrom)) &&
            (currentTo === storedTo || storedTo.includes(currentTo) || currentTo.includes(storedTo)) &&
            storedPax.includes(currentPax);

          if (storedRef && isMatchingTicket) {
            console.info("Recovering already-completed booking:", storedRef);
            const recoveryResponse = {
              bookingReference: storedRef,
              pnr: storedRef,
              status: "Confirmed",
            };
            const recoveryTicket = storedTicket || buildTicketPayload(flowState, recoveryResponse, selectedMethod, "live");
            sessionStorage.removeItem("last_completed_booking_ref");
            sessionStorage.removeItem("last_booking_trace_id");
            sessionStorage.removeItem("booking_session_expiry");
            clearFlightBookingFlowState();
            navigate("/ticket/confirmation", {
              state: { ...recoveryTicket, isTwoWay: false, onwardTicket: recoveryTicket, returnTicket: null },
              replace: true,
            });
            return;
          }
        }

        if (isAlreadyDone) {
          // The booking was already submitted once. We couldn't recover the stored ticket,
          // which means the confirmation page may have already been shown.
          // NEVER retry bookFlight here — it will cause a guaranteed duplicate.
          setPaymentError(
            "This booking was already processed by the airline. Please check 'My Bookings' for your ticket, or contact support."
          );
          setIsSubmitting(false);
          return;
        }

        if (isFareExpired) {
          // Stale or locked TraceId detected from SRDV.
          // Automatically fetch a fresh TraceId via searchFlights + getFareQuote and retry bookFlight seamlessly!
          console.info("Stale session/TraceId detected from SRDV, attempting automatic search & fare quote refresh...");
          try {
            // Clear cached FareQuote
            try { sessionStorage.removeItem("last_fare_quote"); sessionStorage.removeItem("FareQuote"); } catch { }

            const searchContext = flowState.searchContext || {};
            const isMultiCity = Boolean(flowState.isMultiCity || searchContext.tripType === "multicity");
            const fromCity = flight?.sourceCode || flight?.fromCity || searchContext.source || "DEL";
            const toCity = flight?.destinationCode || flight?.toCity || searchContext.destination || "BOM";
            const depDate = flight?.departDate || flight?.departureDate || searchContext.departureDate || new Date().toISOString().split("T")[0];

            const freshSearchResults = await searchFlights({
              from: fromCity,
              to: toCity,
              date: depDate,
              returnDate: searchContext.returnDate,
              tripType: isMultiCity ? "multicity" : (searchContext.tripType || "oneway"),
              travelClass: searchContext.cabinClass || flight?.selectedTravelClass || "Economy",
              adults: searchContext.adults || 1,
              children: searchContext.children || 0,
              infants: searchContext.infants || 0,
              legs: flowState.selectedLegs || searchContext.legs
            });

            const freshList = Array.isArray(freshSearchResults)
              ? freshSearchResults
              : (freshSearchResults?.onward || freshSearchResults?.legs?.[0] || []);

            const freshFlight = freshList[0] || flight;
            const freshTraceId = freshSearchResults?.traceId || freshSearchResults?.TraceId || freshFlight?.traceId || freshFlight?.TraceId || "";
            const freshResultIndex = freshFlight?.resultIndex || freshFlight?.ResultIndex || freshFlight?.id || "";

            if (freshTraceId) {
              console.info("Obtained fresh TraceId from auto-search:", freshTraceId);

              // 1. Explicitly invoke getFareQuote to register Fare Session on SRDV supplier server
              try {
                await getFareQuote({
                  ...freshFlight,
                  traceId: freshTraceId,
                  resultIndex: freshResultIndex,
                  selectedLegs: flowState.selectedLegs
                });
              } catch (fqErr) {
                console.warn("getFareQuote auto-refresh returned error, proceeding to bookFlight:", fqErr);
              }

              // 2. Update flowState with fresh TraceId & ResultIndex
              flowState.flight = {
                ...freshFlight,
                traceId: freshTraceId,
                TraceId: freshTraceId,
                resultIndex: freshResultIndex,
                ResultIndex: freshResultIndex,
              };
              flowState.traceId = freshTraceId;
              flowState.TraceId = freshTraceId;
              sessionStorage.setItem("flight_trace_id", freshTraceId);
              sessionStorage.setItem("last_booking_trace_id", freshTraceId);

              // 3. Retry booking with fresh TraceId and active FareQuote session!
              const retryResponse = await bookFlight({
                flightId: freshFlight?.id || flight?.id || "flight-1",
                payload: buildFlightBookingPayload(flowState),
              });

              if (retryResponse?.bookingReference || retryResponse?.pnr) {
                sessionStorage.setItem("last_completed_booking_ref", retryResponse.bookingReference || retryResponse.pnr);
              }

              response = retryResponse;
              // Proceed smoothly to payment completion below!
            } else {
              throw new Error("Unable to obtain fresh TraceId.");
            }
          } catch (refreshErr) {
            console.error("Auto-refresh TraceId failed:", refreshErr);
            setPaymentError(
              refreshErr.message?.includes("TicketLCC") || refreshErr.message?.includes("SRDV")
                ? refreshErr.message
                : "Your flight session expired. Please go back to Flight Search to select a fresh flight."
            );
            setIsSubmitting(false);
            return;
          }
        } else {
          const displayMsg = rawMsg || "Booking failed. Please verify passenger details and try again.";
          setPaymentError(displayMsg);
          setIsSubmitting(false);
          return;
        }
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
      } catch { }

      ticketPayload.userId = currentUser?.id || currentUser?.userId || "";
      ticketPayload.userEmail = currentUser?.email || flowState.contact?.email || "";
      ticketPayload.userMobile = currentUser?.mobile || currentUser?.phone || flowState.contact?.mobile || "";

      let returnTicketPayload = null;
      let multiCityTickets = [];

      if (flowState.isTwoWay && flowState.returnFlight) {
        const returnFlight = flowState.returnFlight;
        const returnFlowState = {
          ...flowState,
          flight: returnFlight,
          isReturnFlight: true,
          passengers: Array.isArray(flowState.passengers) ? flowState.passengers.map(p => ({
            ...p,
            seatLabel: "",
            seatDynamic: p.seatDynamic || []
          })) : [],
          searchContext: {
            ...flowState.searchContext,
            source: flowState.searchContext?.destination || returnFlight.sourceCode,
            destination: flowState.searchContext?.source || returnFlight.destinationCode,
            departureDate: flowState.searchContext?.returnDate || returnFlight.departDate
          }
        };
        // Skip redundant bookFlight call for LCC Round Trips because the first bookFlight call
        // already submitted the combined ResultIndex ("1,2") and booked both legs!
        const returnResponse = response;

        const respStatusRet = returnResponse?.responseStatus ?? returnResponse?.ResponseStatus ?? returnResponse?.rawResponse?.ResponseStatus ?? null;
        const errObjRet = returnResponse?.Error || returnResponse?.error || returnResponse?.rawResponse?.Error || returnResponse?.rawResponse?.Response?.Error;
        const errCodeRet = errObjRet?.ErrorCode !== undefined && errObjRet?.ErrorCode !== null ? String(errObjRet.ErrorCode) : "0";

        const isReturnConfirmed =
          Boolean(returnResponse?.bookingReference || returnResponse?.pnr || returnResponse?.bookingId) ||
          respStatusRet === 1 ||
          respStatusRet === "1" ||
          errCodeRet === "0" ||
          errCodeRet === "000" ||
          errCodeRet === "";

        if (!returnResponse || !isReturnConfirmed) {
          const returnErrorMsg = errObjRet?.ErrorMessage || returnResponse?.error || "Return flight booking failed on supplier system.";
          throw new Error(`Return Flight Booking Error: ${returnErrorMsg}`);
        }

        returnTicketPayload = buildTicketPayload(
          returnFlowState,
          returnResponse,
          selectedMethod,
          "live"
        );

        returnTicketPayload.userId = ticketPayload.userId;
        returnTicketPayload.userEmail = ticketPayload.userEmail;
        returnTicketPayload.userMobile = ticketPayload.userMobile;
        returnTicketPayload.isReturnFlight = true;
      } else if (flowState.isMultiCity && Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0) {
        multiCityTickets = ticketPayload.multiCityTickets || [];
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

      const confirmationState = {
        ...ticketPayload,
        isTwoWay: Boolean(returnTicketPayload),
        isMultiCity: flowState.isMultiCity,
        onwardTicket: ticketPayload,
        returnTicket: returnTicketPayload,
        multiCityTickets: multiCityTickets,
      };

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
              if (flowState.isMultiCity && Array.isArray(flowState.selectedLegs)) {
                ticketPayload.isMultiCity = true;
                ticketPayload.tripType = "multicity";
                ticketPayload.segments = flowState.selectedLegs.map((leg, idx) => ({
                  legIndex: idx + 1,
                  fromCity: leg.sourceName || leg.fromCity || leg.sourceCode,
                  toCity: leg.destinationName || leg.toCity || leg.destinationCode,
                  providerName: leg.airlineName || leg.airline || ticketPayload.providerName,
                  tripNumber: leg.flightNumber || ticketPayload.tripNumber,
                  departureTimeUtc: leg.departDate || leg.departureDate || ticketPayload.departureTimeUtc,
                  status: "Booked"
                }));
              }
              existing.unshift(ticketPayload);
              localStorage.setItem(key, JSON.stringify(existing));
            }
          } catch { }
        });
        localStorage.setItem("latest_ticket", JSON.stringify(confirmationState));
      } catch (e) {
        console.error("Error saving flight booking to local caches:", e);
      }

      // Primary backend booking endpoints (TicketLCC / TicketGDS / HoldGDS) automatically persist
      // the reservation to the database. Secondary HTTP calls are omitted to avoid 404 errors.

      saveBookingPassengersToTravelers(flowState.passengers, flowState.contact);

      sessionStorage.removeItem("booking_session_expiry");
      clearFlightBookingFlowState();

      try {
        sessionStorage.setItem("BookingResponse", JSON.stringify(confirmationState));
      } catch (e) { }

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
            <h3 className="sidebar-card-title">
              {flowState.isMultiCity
                ? "Your Flights (Multi-city)"
                : flowState.isTwoWay
                  ? "Your Flights (Roundtrip)"
                  : "Your Flight"}
            </h3>

            {flowState.isMultiCity && Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0 ? (
              flowState.selectedLegs.map((leg, index) => (
                <div key={`mc-pay-leg-${index}`} style={{ marginTop: index > 0 ? 16 : 0, paddingTop: index > 0 ? 16 : 0, borderTop: index > 0 ? "1px dashed #cbd5e1" : "none" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d32f2f", textTransform: "uppercase", marginBottom: 6 }}>
                    {index + 1}. Leg {index + 1}
                  </div>
                  <div className="flight-segment">
                    <div className="flight-city-info">
                      <span className="flight-city-code">{leg?.sourceCode || "--"}</span>
                      <span className="flight-city-name">{leg?.sourceName || leg?.fromCity || "--"}</span>
                    </div>
                    <div className="flight-stops-indicator">
                      <span className="stops-text">{Number(leg?.stops || 0) > 0 ? `${leg.stops} stop` : "Non stop"}</span>
                      <div className="stops-line"></div>
                    </div>
                    <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                      <span className="flight-city-code">{leg?.destinationCode || "--"}</span>
                      <span className="flight-city-name">{leg?.destinationName || leg?.toCity || "--"}</span>
                    </div>
                  </div>
                  <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{leg?.airlineName || leg?.airline || "Flight"} ({leg?.flightNumber || "--"})</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="flight-date-badge">{leg?.departDate || leg?.departureDate || "--"}</span>
                      <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                        ₹{new Intl.NumberFormat("en-IN").format(Number(leg?.fare || leg?.price || leg?.priceInr || leg?.selectedTravelClassPriceInr || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
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
              </>
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
              <span>₹ {displayBaseFare.toLocaleString("en-IN")}</span>
            </div>
            {displayTax > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {displayTax.toLocaleString("en-IN")}</span>
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
                    const miniFareRules = activeFareRuleModal.data?.miniFareRules || activeFareRuleModal.data?.MiniFareRules || [];
                    const airlineRules = activeFareRuleModal.data?.airlineRules || activeFareRuleModal.data?.AirlineRules || null;
                    const fl = activeFareRuleModal.flight || {};

                    const hasRules = Array.isArray(rules) && rules.length > 0;
                    const hasMiniRules = Array.isArray(miniFareRules) && miniFareRules.length > 0;
                    const hasAirlineRules = Boolean(airlineRules && typeof airlineRules === "object");

                    if (!hasRules && !hasMiniRules && !hasAirlineRules) {
                      return (
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", textAlign: "center", color: "#64748b" }}>
                          No detailed fare rules returned by the airline provider for this fare.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {hasRules && rules.map((rule, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
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
                                __html: rule.FareRuleDetail || rule.FareRules || ""
                              }}
                            />
                          </div>
                        ))}

                        {hasMiniRules && (
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Mini Fare Rules (API)</div>
                            {miniFareRules.map((m, idx) => (
                              <div key={idx} style={{ fontSize: "0.88rem", color: "#334155", marginBottom: "6px" }}>
                                <strong>{m.Type || m.Category || "Rule"}:</strong> {m.Details || m.Rule || JSON.stringify(m)}
                              </div>
                            ))}
                          </div>
                        )}

                        {hasAirlineRules && (
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Airline Passenger Rules (API)</div>
                            {airlineRules.FirstNameMinChar && (
                              <div style={{ fontSize: "0.88rem", color: "#334155", marginBottom: "4px" }}>
                                <strong>First Name Minimum Length:</strong> {airlineRules.FirstNameMinChar} characters
                              </div>
                            )}
                            {airlineRules.LastNameMinChar && (
                              <div style={{ fontSize: "0.88rem", color: "#334155" }}>
                                <strong>Last Name Minimum Length:</strong> {airlineRules.LastNameMinChar} characters
                              </div>
                            )}
                          </div>
                        )}
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
