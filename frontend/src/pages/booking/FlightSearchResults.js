import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowDown,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  IndianRupee,
  Loader2,
  MapPin,
  Moon,
  Plane,
  PlaneTakeoff,
  Sun,
  Sunrise,
  Sunset,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Briefcase,
  Undo,
  Utensils,
  Armchair,
  ZapOff,
  Check,
  ShieldAlert,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";
import { bookFlight, searchFlights, getFareRule, getCalendarFare } from "../../services/flightBookingService";
import { resetBookingSessionTimer } from "./BookingTimer";
import FareCalendarModal from "../../components/FareCalendarModal";
import FlightLoadingScreen from "../../components/FlightLoadingScreen";
import "../../STYLES/FlightSearchResults.css";
import { toDisplayDate, toYyyyMmDd } from "../../utils/apiDateFormat";
import { writeFlightBookingFlowState, clearFlightBookingFlowState } from "./flightBookingFlowStore";
import airIndiaExpress from "../../assets/images/airlines/Air-India_express.jpg";
import airIndia from "../../assets/images/airlines/air-india.png";
import akasaAir from "../../assets/images/airlines/AkasaAir.png";
import emirates from "../../assets/images/airlines/Emirates.png";
import indigo from "../../assets/images/airlines/indigo.png";
import qatarAirways from "../../assets/images/airlines/qatarairways.png";
import spiceJet from "../../assets/images/airlines/Spicejet.png";

const LOADING_STATUSES = [
  "Connecting to major airline databases...",
  "Scanning seat maps and class options...",
  "Finding lowest fare guarantees...",
  "Checking luggage allowances and policy...",
  "Applying student and corporate deals...",
  "Securing optimal route options..."
];

const FLIGHT_PROMO_ITEMS = [
  {
    id: "route-offers",
    icon: IndianRupee,
    title: "Route Offers",
    text: "Check coupons before payment",
  },
  {
    id: "seat-sync",
    icon: Armchair,
    title: "Live Seats",
    text: "Fresh seat availability",
  },
  {
    id: "trusted-travels",
    icon: ShieldAlert,
    title: "Trusted Travels",
    text: "Compare verified operators",
  },
  {
    id: "quick-ticket",
    icon: Plane,
    title: "Quick Ticket",
    text: "Print ticket after booking",
  },
  {
    id: "time-picks",
    icon: Clock3,
    title: "Smart Timings",
    text: "Sort flights by departure",
  },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEPARTURE_WINDOWS = [
  { key: "morning", label: "6am to 12pm", min: 6, max: 12, Icon: Sunrise },
  { key: "afternoon", label: "12pm to 6pm", min: 12, max: 18, Icon: Sun },
  { key: "evening", label: "6pm to 12am", min: 18, max: 24, Icon: Sunset },
  { key: "night", label: "12am to 6am", min: 0, max: 6, Icon: Moon },
];

const FARE_TYPE_FILTERS = [
  { key: "refundable", label: "Refundable" },
  { key: "nonRefundable", label: "Non Refundable" },
];

const STOP_FILTERS = [
  { key: "nonStop", label: "Non Stop" },
  { key: "oneStop", label: "1 Stop" },
];

const TRAVEL_CLASS_ORDER = [
  "Economy",
  "Premium Economy",
  "Business",
  "Premium Business",
  "First Class",
];

const AIRLINE_LOGOS = {
  "air india": airIndia,
  "air india express": airIndiaExpress,
  "ai express": airIndiaExpress,
  indigo,
  spicejet: spiceJet,
  "akasa air": akasaAir,
  emirates,
  "qatar airways": qatarAirways,
};

function readValue(params, state, key) {
  const queryValue = params.get(key);

  if (typeof queryValue === "string" && queryValue.trim()) {
    return queryValue.trim();
  }

  const stateValue = state?.[key];
  return typeof stateValue === "string" ? stateValue.trim() : "";
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  return new Date(year, month - 1, day);
}

function addDays(date, offset) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function formatDateInput(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatLongDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]
    } ${date.getFullYear()}, ${WEEKDAYS[date.getDay()]}`;
}

function formatCardDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${String(date.getDate()).padStart(
    2,
    "0"
  )} ${MONTHS[date.getMonth()]}`;
}

function formatFlightDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)
    }`;
}

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
}

const CITY_TO_IATA = {
  hyderabad: "HYD",
  bengaluru: "BLR",
  bangalore: "BLR",
  mumbai: "BOM",
  delhi: "DEL",
  "new delhi": "DEL",
  goa: "GOI",
  jaipur: "JAI",
  chennai: "MAA",
  kolkata: "CCU",
  pune: "PNQ",
  ahmedabad: "AMD",
  kochi: "COK",
  cochin: "COK",
  tirupati: "TIR",
  madras: "MAA",
  calcutta: "CCU",
  bombay: "BOM",
  dubai: "DXB",
  dxb: "DXB",
  london: "LHR",
  singapore: "SIN",
  bangkok: "BKK",
  "kuala lumpur": "KUL",
  doha: "DOH",
  "abu dhabi": "AUH",
  sharjah: "SHJ",
  muscat: "MCT",
  jeddah: "JED",
  riyadh: "RUH",
};

function cityCode(name, fallback) {
  if (!name) return fallback;
  const cleanInput = String(name).trim().toLowerCase();

  const bracketMatch = cleanInput.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1].trim().length === 3) {
    return bracketMatch[1].trim().toUpperCase();
  }

  if (cleanInput.length === 3) {
    return cleanInput.toUpperCase();
  }

  const cityNameOnly = cleanInput.split(",")[0].split("(")[0].trim();
  if (CITY_TO_IATA[cityNameOnly]) {
    return CITY_TO_IATA[cityNameOnly];
  }

  const clean = cityNameOnly.replace(/[^a-zA-Z ]/g, " ").trim();
  if (!clean) {
    return fallback;
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}${parts[parts.length - 1][0]}`
      .slice(0, 3)
      .toUpperCase();
  }

  return clean.slice(0, 3).toUpperCase();
}

function parseTimeValue(dateString) {
  if (!dateString) {
    return null;
  }

  if (dateString instanceof Date) {
    return Number.isNaN(dateString.getTime()) ? null : dateString;
  }

  const str = String(dateString).trim();
  if (!str) return null;

  const wcfMatch = str.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (wcfMatch) {
    return new Date(parseInt(wcfMatch[1], 10));
  }

  let normalizedStr = str;
  if (!str.includes("T") && str.includes(" ")) {
    normalizedStr = str.replace(" ", "T");
  }

  const date = new Date(normalizedStr);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const now = new Date();
    now.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || "0", 10), 0);
    return now;
  }

  return null;
}

function formatTime(date) {
  if (!date) {
    return "--:--";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function durationLabel(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return "--";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hour : ${minutes} mins`;
}

function getDurationInMinutes(flight) {
  const departureUtc = parseTimeValue(flight.departureTimeUtc);
  const arrivalUtc = parseTimeValue(flight.arrivalTimeUtc);

  if (departureUtc && arrivalUtc) {
    const minutes = Math.round((arrivalUtc - departureUtc) / 60000);
    if (minutes >= 0) {
      return minutes;
    }
  }

  const departureIst = parseTimeValue(flight.departureTimeIst);
  const arrivalIst = parseTimeValue(flight.arrivalTimeIst);

  if (!departureIst || !arrivalIst) {
    return null;
  }

  let minutes = Math.round((arrivalIst - departureIst) / 60000);
  if (minutes < 0) {
    minutes += 24 * 60;
  }

  return minutes;
}

function normalizeClassOptions(flight) {
  const fromApi = Array.isArray(flight.classOptions)
    ? flight.classOptions
      .map((option) => ({
        travelClass: String(option?.travelClass || "").trim(),
        priceInr: Number(option?.priceInr ?? 0),
        availableSeats: Number(option?.availableSeats ?? 0),
        totalSeats: Number(option?.totalSeats ?? 0),
      }))
      .filter((option) => option.travelClass)
    : [];

  if (fromApi.length > 0) {
    return fromApi.sort((a, b) => {
      const indexA = TRAVEL_CLASS_ORDER.indexOf(a.travelClass);
      const indexB = TRAVEL_CLASS_ORDER.indexOf(b.travelClass);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }

  if (flight.selectedTravelClass) {
    return [
      {
        travelClass: flight.selectedTravelClass,
        priceInr: Number(flight.selectedTravelClassPriceInr ?? 0),
        availableSeats: Number(flight.selectedTravelClassAvailableSeats ?? 0),
        totalSeats: Number(flight.selectedTravelClassTotalSeats ?? 0),
      },
    ];
  }

  return [];
}

function resolveAirlineLogo(airlineName) {
  const normalized = String(airlineName || "").trim().toLowerCase();

  if (AIRLINE_LOGOS[normalized]) {
    return AIRLINE_LOGOS[normalized];
  }

  if (normalized.includes("air india express")) {
    return airIndiaExpress;
  }

  if (normalized.includes("air india")) {
    return airIndia;
  }

  if (normalized.includes("indigo")) {
    return indigo;
  }

  if (normalized.includes("spice")) {
    return spiceJet;
  }

  if (normalized.includes("akasa")) {
    return akasaAir;
  }

  if (normalized.includes("emirates")) {
    return emirates;
  }

  if (normalized.includes("qatar")) {
    return qatarAirways;
  }

  return indigo;
}

function hourInWindow(hour, window) {
  if (window.min < window.max) {
    return hour >= window.min && hour < window.max;
  }

  return hour >= window.min || hour < window.max;
}

function getTravellerCounts(summary) {
  const adultsMatch = summary.match(/(\d+)\s*Adult/i);
  const childrenMatch = summary.match(/(\d+)\s*Child/i);
  const infantsMatch = summary.match(/(\d+)\s*Infant/i);

  return {
    adults: adultsMatch ? Number(adultsMatch[1]) : 1,
    children: childrenMatch ? Number(childrenMatch[1]) : 0,
    infants: infantsMatch ? Number(infantsMatch[1]) : 0,
  };
}

function getTimeDisplay(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getAirportName(code, city) {
  const c = String(code || "").toUpperCase().trim();
  const nameMap = {
    DEL: "Indira Gandhi International Airport",
    BOM: "Chhatrapati Shivaji Maharaj International Airport",
    BLR: "Kempegowda International Airport",
    MAA: "Chennai International Airport",
    HYD: "Rajiv Gandhi International Airport",
    CCU: "Netaji Subhas Chandra Bose International Airport",
    COK: "Cochin International Airport",
    GOI: "Dabolim Airport",
    DXB: "Dubai International Airport",
    JFK: "John F. Kennedy International Airport",
  };
  return nameMap[c] || `${city || c} Airport`;
}

function getClassBadgeTone(travelClass) {
  if (travelClass.includes("First")) {
    return "elite";
  }

  if (travelClass.includes("Business")) {
    return "premium";
  }

  return "economy";
}

function buildPassengersFromCounts(baseName, adults, children, infants) {
  const normalizedBaseName = String(baseName || "").trim() || "Passenger";
  const passengers = [];

  for (let index = 0; index < adults; index += 1) {
    passengers.push({
      fullName: adults === 1 ? normalizedBaseName : `${normalizedBaseName} Adult ${index + 1}`,
      passengerType: "Adult",
      gender: index % 2 === 0 ? "Male" : "Female",
    });
  }

  for (let index = 0; index < children; index += 1) {
    passengers.push({
      fullName: `${normalizedBaseName} Child ${index + 1}`,
      passengerType: "Child",
      gender: index % 2 === 0 ? "Male" : "Female",
    });
  }

  for (let index = 0; index < infants; index += 1) {
    passengers.push({
      fullName: `${normalizedBaseName} Infant ${index + 1}`,
      passengerType: "Infant",
      gender: index % 2 === 0 ? "Male" : "Female",
    });
  }

  return passengers;
}

function normalizeTripType(value) {
  if (value === "twoway" || value === "multicity") {
    return value;
  }

  return "oneway";
}

function normalizeTravellerSummary(value) {
  const text = String(value || "").trim();
  return text || "1 Adult";
}

function getSelectedFarePrice(basePrice, type) {
  if (type === "flexi") {
    return Math.round(basePrice * 1.066);
  }
  if (type === "upfront") {
    return Math.round(basePrice * 1.203);
  }
  return basePrice;
}

export default function FlightSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const state = location.state || {};

  const initialSourceName = readValue(params, state, "source") || "Delhi";
  const initialDestinationName =
    readValue(params, state, "destination") || "Mumbai";
  const initialTripType =
    normalizeTripType(readValue(params, state, "tripType")) || "oneway";
  const initialCabinClass =
    readValue(params, state, "cabinClass") || "Economy";
  const initialTravellerText = normalizeTravellerSummary(
    readValue(params, state, "travellers") || "1 Adult"
  );
  const initialOnwardDateInput = toYyyyMmDd(
    readValue(params, state, "departureDate") ||
    new Date().toISOString().slice(0, 10)
  );
  const initialReturnDateInput = toYyyyMmDd(
    readValue(params, state, "returnDate") ||
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  );

  const [sourceName, setSourceName] = useState(initialSourceName);
  const [destinationName, setDestinationName] = useState(initialDestinationName);
  const [tripType, setTripType] = useState(initialTripType);
  const [cabinClass, setCabinClass] = useState(initialCabinClass);
  const [travellerText, setTravellerText] = useState(initialTravellerText);
  const [isModifySearchOpen, setIsModifySearchOpen] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    source: initialSourceName,
    destination: initialDestinationName,
    departureDate: initialOnwardDateInput,
    returnDate: initialReturnDateInput,
    tripType: initialTripType,
    travellers: initialTravellerText,
    cabinClass: initialCabinClass,
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInput(initialOnwardDateInput)
  );
  const [selectedReturnDate] = useState(() =>
    parseDateInput(initialReturnDateInput)
  );
  const [searchVersion, setSearchVersion] = useState(0);
  const [apiFlights, setApiFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [selectedOnwardFlightId, setSelectedOnwardFlightId] = useState(null);
  const [selectedReturnFlightId, setSelectedReturnFlightId] = useState(null);
  const [twoWayActiveTab, setTwoWayActiveTab] = useState("onward"); // "onward" | "return"

  // Multicity state
  const [multiCityActiveTab, setMultiCityActiveTab] = useState(0);
  const [selectedMultiCityFlightIds, setSelectedMultiCityFlightIds] = useState({});

  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const [selectedClassByFlight, setSelectedClassByFlight] = useState({});
  const [selectedFareTypeByFlight, setSelectedFareTypeByFlight] = useState({});
  const [selectedFareOptionIndexByFlight, setSelectedFareOptionIndexByFlight] = useState({});
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  const [selectedFareType, setSelectedFareType] = useState("saver");

  const [isFareCalendarOpen, setIsFareCalendarOpen] = useState(false);
  const [calendarFareMap, setCalendarFareMap] = useState({});
  const [lowestFareOfMonthDates, setLowestFareOfMonthDates] = useState(new Set());

  useEffect(() => {
    let isCurrent = true;
    async function loadCalendarFare() {
      if (tripType === "multicity") return;

      try {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dd = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        let returnDateStr = dateStr;
        if (selectedReturnDate) {
          const ryyyy = selectedReturnDate.getFullYear();
          const rmm = String(selectedReturnDate.getMonth() + 1).padStart(2, "0");
          const rdd = String(selectedReturnDate.getDate()).padStart(2, "0");
          returnDateStr = `${ryyyy}-${rmm}-${rdd}`;
        }

        const res = await getCalendarFare({
          from: sourceName,
          to: destinationName,
          date: dateStr,
          returnDate: returnDateStr,
          travelClass: cabinClass,
          journeyType: tripType === "twoway" ? 2 : 1,
        });

        if (isCurrent && res && res.fareMapByDate) {
          setCalendarFareMap(res.fareMapByDate);
          if (Array.isArray(res.results)) {
            const lowestSet = new Set(
              res.results.filter((r) => r.isLowestFareOfMonth).map((r) => r.dateOnly)
            );
            setLowestFareOfMonthDates(lowestSet);
          }
        }
      } catch (e) {
        console.warn("Calendar fare fetch error:", e);
      }
    }

    loadCalendarFare();

    return () => {
      isCurrent = false;
    };
  }, [sourceName, destinationName, selectedDate, cabinClass, travellerText]);

  const getFareMultiplier = (type) => {
    if (type === "flexi") return 1.066;
    if (type === "upfront") return 1.203;
    return 1.0;
  };

  const sourceCode = cityCode(sourceName, "DEL");
  const destinationCode = cityCode(destinationName, "BOM");

  const parsedMultiCityLegs = useMemo(() => {
    if (tripType !== "multicity") return [];
    let initialLegsParam = state.legs || params.get("legs");
    if (!initialLegsParam && typeof window !== "undefined") {
      try { initialLegsParam = sessionStorage.getItem("multiCityLegs"); } catch (e) { }
    }
    if (typeof initialLegsParam === "string") {
      try {
        const decoded = decodeURIComponent(initialLegsParam);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        try {
          const parsed = JSON.parse(initialLegsParam);
          if (Array.isArray(parsed)) return parsed;
        } catch (e2) { }
      }
    } else if (Array.isArray(initialLegsParam)) {
      return initialLegsParam;
    }
    return [];
  }, [tripType, state.legs, location.search]);

  let displaySourceName = sourceName;
  let displayDestinationName = destinationName;
  let displaySourceCode = sourceCode;
  let displayDestinationCode = destinationCode;

  if (tripType === "multicity") {
    if (parsedMultiCityLegs.length > 0) {
      const activeLegInfo = parsedMultiCityLegs[multiCityActiveTab] || parsedMultiCityLegs[0];
      const sRaw = activeLegInfo.from || activeLegInfo.fromCity || activeLegInfo.source || sourceName;
      const dRaw = activeLegInfo.to || activeLegInfo.toCity || activeLegInfo.destination || destinationName;
      displaySourceName = sRaw;
      displayDestinationName = dRaw;
      displaySourceCode = cityCode(sRaw, "DEL");
      displayDestinationCode = cityCode(dRaw, "BOM");
    }
    if (apiFlights && apiFlights[multiCityActiveTab] && apiFlights[multiCityActiveTab].length > 0) {
      const sampleLeg = apiFlights[multiCityActiveTab][0];
      displaySourceCode = sampleLeg.sourceCode || displaySourceCode;
      displayDestinationCode = sampleLeg.destinationCode || displayDestinationCode;
      displaySourceName = sampleLeg.sourceName || sampleLeg.fromCity || displaySourceName;
      displayDestinationName = sampleLeg.destinationName || sampleLeg.toCity || displayDestinationName;
    }
  }

  const normalizedOnwardList = useMemo(() => {
    return apiFlights.map((flight) => {
      const classOptions = normalizeClassOptions(flight);
      const selectedClass =
        selectedClassByFlight[flight.id] ||
        flight.selectedTravelClass ||
        classOptions[0]?.travelClass ||
        cabinClass;

      const fallbackOption = {
        travelClass: selectedClass,
        priceInr: Number(flight.selectedTravelClassPriceInr ?? 0),
      };
      const resolvedClassOptions = classOptions.length > 0 ? classOptions : [fallbackOption];
      const selectedClassOption = resolvedClassOptions.find((o) => o.travelClass === selectedClass) || resolvedClassOptions[0];
      const departureIst = parseTimeValue(flight.departureTimeIst);

      const baseFarePrice = Number(selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? flight.fare ?? 0);
      const fareType = selectedFareTypeByFlight[flight.id] || "saver";
      const finalPrice = Math.round(baseFarePrice * getFareMultiplier(fareType));

      return {
        ...flight,
        airline: flight.airline || "IndiGo",
        airlineName: flight.airline || "IndiGo",
        flightNumber: flight.flightNumber || "6E-101",
        sourceCode: cityCode(flight.fromCity || sourceName, sourceCode),
        destinationCode: cityCode(flight.toCity || destinationName, destinationCode),
        departureTime: formatTime(departureIst) || "06:30",
        fare: finalPrice,
        baseFarePrice,
        fareType,
        className: selectedClass
      };
    });
  }, [apiFlights, selectedClassByFlight, selectedFareTypeByFlight, cabinClass, sourceName, destinationName, sourceCode, destinationCode]);

  const normalizedReturnList = useMemo(() => {
    return returnFlights.map((flight) => {
      const classOptions = normalizeClassOptions(flight);
      const selectedClass =
        selectedClassByFlight[flight.id] ||
        flight.selectedTravelClass ||
        classOptions[0]?.travelClass ||
        cabinClass;

      const fallbackOption = {
        travelClass: selectedClass,
        priceInr: Number(flight.selectedTravelClassPriceInr ?? 0),
      };
      const resolvedClassOptions = classOptions.length > 0 ? classOptions : [fallbackOption];
      const selectedClassOption = resolvedClassOptions.find((o) => o.travelClass === selectedClass) || resolvedClassOptions[0];
      const departureIst = parseTimeValue(flight.departureTimeIst);

      const baseFarePrice = Number(selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? flight.fare ?? 0);
      const fareType = selectedFareTypeByFlight[flight.id] || "saver";
      const finalPrice = Math.round(baseFarePrice * getFareMultiplier(fareType));

      return {
        ...flight,
        airline: flight.airline || "IndiGo",
        airlineName: flight.airline || "IndiGo",
        flightNumber: flight.flightNumber || "6E-201",
        sourceCode: cityCode(flight.fromCity || destinationName, destinationCode),
        destinationCode: cityCode(flight.toCity || sourceName, sourceCode),
        departureTime: formatTime(departureIst) || "18:30",
        fare: finalPrice,
        baseFarePrice,
        fareType,
        className: selectedClass
      };
    });
  }, [returnFlights, selectedClassByFlight, selectedFareTypeByFlight, cabinClass, sourceName, destinationName, sourceCode, destinationCode]);

  const [activeFareRuleModal, setActiveFareRuleModal] = useState({
    isOpen: false,
    isLoading: false,
    error: "",
    data: null,
    flight: null,
  });

  const handleOpenFareRule = async (flightObj) => {
    setActiveFareRuleModal({
      isOpen: true,
      isLoading: true,
      error: "",
      data: null,
      flight: flightObj,
    });

    try {
      const response = await getFareRule({
        traceId: flightObj.traceId,
        resultIndex: flightObj.resultIndex || flightObj.id,
        srdvType: flightObj.srdvType,
        srdvIndex: flightObj.srdvIndex,
      });
      setActiveFareRuleModal({
        isOpen: true,
        isLoading: false,
        error: "",
        data: response,
        flight: flightObj,
      });
    } catch (err) {
      setActiveFareRuleModal({
        isOpen: true,
        isLoading: false,
        error: err.message || "Failed to fetch live fare rules.",
        data: null,
        flight: flightObj,
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

  const [priceMin, setPriceMin] = useState(0);
  const [timeMin, setTimeMin] = useState(0);
  const [departureWindows, setDepartureWindows] = useState(() => ({
    morning: true,
    afternoon: true,
    evening: true,
    night: true,
  }));
  const [fareTypeFilters, setFareTypeFilters] = useState(() => ({
    refundable: true,
    nonRefundable: true,
  }));
  const [stopFilters, setStopFilters] = useState(() => ({
    nonStop: true,
    oneStop: true,
  }));
  const [sortBy, setSortBy] = useState("departure");
  const [airlineFilters, setAirlineFilters] = useState({});

  const [sharedMultiCityTraceId, setSharedMultiCityTraceId] = useState("");
  const [bookingFlightId, setBookingFlightId] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    passengerName: "",
    passengerPhone: "",
    passengerEmail: "",
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: cabinClass,
  });
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);

  useEffect(() => {
    if (!isLoadingFlights) return;
    setLoadingStatusIndex(0);
    const interval = setInterval(() => {
      setLoadingStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoadingFlights]);

  useEffect(() => {
    setSourceName(initialSourceName);
    setDestinationName(initialDestinationName);
    setTripType(initialTripType);
    setCabinClass(initialCabinClass);
    setTravellerText(initialTravellerText);
    setSelectedDate(parseDateInput(initialOnwardDateInput));
    setModifyForm({
      source: initialSourceName,
      destination: initialDestinationName,
      departureDate: initialOnwardDateInput,
      tripType: initialTripType,
      travellers: initialTravellerText,
      cabinClass: initialCabinClass,
    });
  }, [
    initialSourceName,
    initialDestinationName,
    initialTripType,
    initialCabinClass,
    initialTravellerText,
    initialOnwardDateInput,
  ]);

  useEffect(() => {
    let isCurrent = true;

    async function runSearch() {
      const startedAt = Date.now();
      setIsLoadingFlights(true);
      setSearchError("");

      const normalizeCity = (city) => {
        if (!city) return "";
        const clean = city.trim().toLowerCase();
        if (clean === "bangalore") return "Bengaluru";
        if (clean === "new delhi") return "Delhi";
        if (clean === "cochin") return "Kochi";
        return city.trim();
      };

      try {
        const travellerCounts = getTravellerCounts(travellerText);

        // For multi-city, prefer the already-parsed legs array over re-reading state/sessionStorage
        let legsParam;
        if (tripType === "multicity") {
          legsParam = parsedMultiCityLegs.length > 0
            ? parsedMultiCityLegs
            : (state.legs || params.get("legs") || sessionStorage.getItem("multiCityLegs") || []);
        } else {
          legsParam = undefined;
        }
        if (typeof legsParam === "string" && legsParam.includes("%")) {
          try { legsParam = decodeURIComponent(legsParam); } catch (e) { }
        }

        const result = await searchFlights({
          from: normalizeCity(sourceName),
          to: normalizeCity(destinationName),
          date: formatDateInput(selectedDate),
          returnDate: tripType === "twoway" ? formatDateInput(selectedReturnDate) : undefined,
          tripType,
          travelClass: cabinClass,
          adults: travellerCounts.adults,
          children: travellerCounts.children,
          infants: travellerCounts.infants,
          legs: legsParam,
        });

        if (!isCurrent) {
          return;
        }

        if (result && result.isTwoWay) {
          const onwardList = result.onward || [];
          const returnList = result.return || [];
          setApiFlights(onwardList);
          setReturnFlights(returnList);
          if (onwardList.length > 0) setSelectedOnwardFlightId(onwardList[0].id);
          if (returnList.length > 0) setSelectedReturnFlightId(returnList[0].id);
        } else if (result && result.isMultiCity) {
          const multicityLegs = Array.isArray(result.legs) ? result.legs : [];
          setApiFlights(multicityLegs);
          setReturnFlights([]);
          // Store the shared TraceId from JourneyType: 3 response
          if (result.sharedTraceId) setSharedMultiCityTraceId(result.sharedTraceId);
          const initialSelections = {};
          multicityLegs.forEach((legArray, index) => {
            if (Array.isArray(legArray) && legArray.length > 0) {
              initialSelections[index] = legArray[0].id;
            }
          });
          setSelectedMultiCityFlightIds(initialSelections);
          setMultiCityActiveTab(0);
        } else {
          const list = Array.isArray(result) ? result : [];
          setApiFlights(list);
          setReturnFlights([]);
          if (list.length > 0) setSelectedOnwardFlightId(list[0].id);
        }
        setExpandedFlightId(null);

        setSelectedClassByFlight((previous) => {
          const next = {};
          const allList = (result && result.isTwoWay) ? [...(result.onward || []), ...(result.return || [])] :
            (result && result.isMultiCity) ? (Array.isArray(result.legs) ? result.legs.flat() : []) :
              (Array.isArray(result) ? result : []);
          allList.forEach((flight) => {
            const classOptions = normalizeClassOptions(flight);
            const fallbackClass =
              previous[flight.id] ||
              flight.selectedTravelClass ||
              cabinClass ||
              classOptions[0]?.travelClass ||
              "Economy";
            next[flight.id] = fallbackClass;
          });

          return next;
        });
      } catch (error) {
        if (isCurrent) {
          setApiFlights([]);
          setSearchError(error.message || "Unable to load flights right now.");
        }
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = 3500 - elapsed;
        if (remaining > 0 && isCurrent) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (isCurrent) {
          setIsLoadingFlights(false);
        }
      }
    }

    runSearch();
    return () => {
      isCurrent = false;
    };
  }, [sourceName, destinationName, selectedDate, selectedReturnDate, tripType, cabinClass, travellerText, searchVersion, parsedMultiCityLegs]);

  const activeFlightList = useMemo(() => {
    if (tripType === "twoway" && twoWayActiveTab === "return") {
      return returnFlights;
    }
    if (tripType === "multicity") {
      return apiFlights[multiCityActiveTab] || [];
    }
    return apiFlights;
  }, [tripType, twoWayActiveTab, multiCityActiveTab, returnFlights, apiFlights]);

  const selectedOnwardFlightObj = useMemo(() => {
    return normalizedOnwardList.find((f) => f.id === selectedOnwardFlightId) || normalizedOnwardList[0] || null;
  }, [normalizedOnwardList, selectedOnwardFlightId]);

  const selectedReturnFlightObj = useMemo(() => {
    return normalizedReturnList.find((f) => f.id === selectedReturnFlightId) || normalizedReturnList[0] || null;
  }, [normalizedReturnList, selectedReturnFlightId]);

  const combinedFare = useMemo(() => {
    if (tripType === "multicity") {
      let total = 0;
      apiFlights.forEach((legArray, index) => {
        const selectedId = selectedMultiCityFlightIds[index];
        const selectedObj = legArray?.find(f => f.id === selectedId) || legArray?.[0];
        if (selectedObj) total += Number(selectedObj.fare || 0);
      });
      return total;
    }
    const onwardFare = selectedOnwardFlightObj ? Number(selectedOnwardFlightObj.fare || 0) : 0;
    const returnFare = selectedReturnFlightObj ? Number(selectedReturnFlightObj.fare || 0) : 0;
    return onwardFare + returnFare;
  }, [tripType, apiFlights, selectedMultiCityFlightIds, selectedOnwardFlightObj, selectedReturnFlightObj]);

  const flights = useMemo(
    () =>
      activeFlightList.map((flight) => {
        const classOptions = normalizeClassOptions(flight);
        const selectedClass =
          selectedClassByFlight[flight.id] ||
          flight.selectedTravelClass ||
          classOptions[0]?.travelClass ||
          cabinClass;

        const fallbackOption = {
          travelClass: selectedClass,
          priceInr: Number(flight.selectedTravelClassPriceInr ?? 0),
          availableSeats: Number(flight.selectedTravelClassAvailableSeats ?? 0),
          totalSeats: Number(flight.selectedTravelClassTotalSeats ?? 0),
        };
        const resolvedClassOptions =
          classOptions.length > 0 ? classOptions : [fallbackOption];

        const selectedClassOption =
          resolvedClassOptions.find(
            (option) => option.travelClass === selectedClass
          ) || resolvedClassOptions[0];

        const departureIst = parseTimeValue(flight.departureTimeIst);
        const arrivalIst = parseTimeValue(flight.arrivalTimeIst);
        const durationMinutes = getDurationInMinutes(flight);
        const travelClass =
          selectedClassOption?.travelClass ||
          flight.selectedTravelClass ||
          cabinClass;

        const currentSource = (tripType === "twoway" && twoWayActiveTab === "return") ? destinationName : sourceName;
        const currentDestination = (tripType === "twoway" && twoWayActiveTab === "return") ? sourceName : destinationName;
        const currentSourceCode = (tripType === "twoway" && twoWayActiveTab === "return") ? destinationCode : sourceCode;
        const currentDestinationCode = (tripType === "twoway" && twoWayActiveTab === "return") ? sourceCode : destinationCode;

        return {
          id: flight.id,
          traceId: flight.traceId || "",
          resultIndex: flight.resultIndex || flight.rawId || flight.id || "",
          airlineName: flight.airline || "Unknown Airline",
          logo: resolveAirlineLogo(flight.airline),
          flightNumber: flight.flightNumber || "--",
          sourceCode: cityCode(flight.fromCity || currentSource, currentSourceCode),
          destinationCode: cityCode(
            flight.toCity || currentDestination,
            currentDestinationCode
          ),
          departDate: formatFlightDate(departureIst || selectedDate),
          departureTime: formatTime(departureIst),
          arrivalTime: formatTime(arrivalIst),
          departureHour: departureIst ? departureIst.getHours() : 0,
          duration: durationLabel(durationMinutes),
          durationMinutes,
          fare: selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? 0,
          isRefundable: Boolean(flight.isRefundable),
          stops: Number(flight.stops || 0),
          className: travelClass,
          classOptions: resolvedClassOptions,
          supportedTravelClasses:
            flight.supportedTravelClasses && flight.supportedTravelClasses.length > 0
              ? flight.supportedTravelClasses
              : resolvedClassOptions.map((option) => option.travelClass),
          availableSeats:
            selectedClassOption?.availableSeats ??
            flight.selectedTravelClassAvailableSeats ??
            0,
          totalSeats:
            selectedClassOption?.totalSeats ??
            flight.selectedTravelClassTotalSeats ??
            0,
          totalAvailableSeats: Number(flight.totalAvailableSeats ?? 0),
          fareTagTone: getClassBadgeTone(travelClass),
          srdvType: flight.srdvType || "MixAPI",
          srdvIndex: flight.srdvIndex || "2",
          isLcc: Boolean(flight.isLcc),
          checkedBagsWeight: flight.checkedBagsWeight,
          checkedBagsUnit: flight.checkedBagsUnit,
          cabinBagsWeight: flight.cabinBagsWeight,
          cabinBagsUnit: flight.cabinBagsUnit,
          fareOptions: Array.isArray(flight.fareOptions) ? flight.fareOptions : [],
          fullMultiSectorSegments: Array.isArray(flight.fullMultiSectorSegments) ? flight.fullMultiSectorSegments : [],
        };
      }),
    [
      activeFlightList,
      twoWayActiveTab,
      returnFlights,
      apiFlights,
      selectedClassByFlight,
      cabinClass,
      sourceName,
      destinationName,
      sourceCode,
      destinationCode,
      selectedDate,
    ]
  );

  const minFare = useMemo(() => {
    if (flights.length === 0) {
      return 0;
    }
    return Math.min(...flights.map((flight) => Number(flight.fare) || 0));
  }, [flights]);

  const maxFare = useMemo(() => {
    if (flights.length === 0) {
      return 0;
    }
    return Math.max(...flights.map((flight) => Number(flight.fare) || 0));
  }, [flights]);

  useEffect(() => {
    setPriceMin(minFare);
  }, [minFare]);

  useEffect(() => {
    const airlineNames = Array.from(
      new Set(flights.map((flight) => flight.airlineName))
    );

    setAirlineFilters((previous) => {
      const next = {};

      airlineNames.forEach((name) => {
        next[name] = previous[name] ?? true;
      });

      return next;
    });
  }, [flights]);

  const filteredFlights = useMemo(
    () =>
      flights.filter((flight) => {
        if (flight.fare < priceMin) {
          return false;
        }

        if (flight.departureHour < timeMin) {
          return false;
        }

        const matchesWindow = DEPARTURE_WINDOWS.some((window) => {
          if (!departureWindows[window.key]) {
            return false;
          }
          return hourInWindow(flight.departureHour, window);
        });

        if (!matchesWindow) {
          return false;
        }

        const fareTypeKey = flight.isRefundable ? "refundable" : "nonRefundable";
        if (!fareTypeFilters[fareTypeKey]) {
          return false;
        }

        const stopKey = flight.stops > 0 ? "oneStop" : "nonStop";
        if (!stopFilters[stopKey]) {
          return false;
        }

        return airlineFilters[flight.airlineName];
      }),
    [
      flights,
      priceMin,
      timeMin,
      departureWindows,
      fareTypeFilters,
      stopFilters,
      airlineFilters,
    ]
  );

  const dateStrip = useMemo(() => {
    const offsets = [-1, 0, 1, 2, 3, 4];
    return offsets.map((offset) => ({
      id: `${selectedDate.getTime()}-${offset}`,
      date: addDays(selectedDate, offset),
      offset,
    }));
  }, [selectedDate]);

  const sortedFlights = useMemo(() => {
    const nextFlights = [...filteredFlights];

    nextFlights.sort((a, b) => {
      if (sortBy === "price") {
        return a.fare - b.fare;
      }

      if (sortBy === "fastest") {
        return a.durationMinutes - b.durationMinutes;
      }

      if (sortBy === "departure") {
        return a.departureHour - b.departureHour || a.fare - b.fare;
      }

      return (
        a.stops - b.stops ||
        a.fare - b.fare ||
        a.durationMinutes - b.durationMinutes
      );
    });

    return nextFlights;
  }, [filteredFlights, sortBy]);

  const currentExpandedFlight = useMemo(() => {
    return flights.find((f) => f.id === expandedFlightId) || null;
  }, [flights, expandedFlightId]);

  const selectedFarePrice = useMemo(() => {
    if (!currentExpandedFlight) return 0;
    if (Array.isArray(currentExpandedFlight.fareOptions) && currentExpandedFlight.fareOptions.length > 0) {
      const optIdx = selectedFareOptionIndexByFlight[currentExpandedFlight.id] ?? 0;
      const opt = currentExpandedFlight.fareOptions[optIdx] || currentExpandedFlight.fareOptions[0];
      return Number(opt?.b2cFinalFare || opt?.b2cPublishedFare || opt?.offeredFare || currentExpandedFlight.fare || 0);
    }
    return getSelectedFarePrice(currentExpandedFlight.fare, selectedFareType);
  }, [currentExpandedFlight, selectedFareType, selectedFareOptionIndexByFlight]);

  const travellerCounts = getTravellerCounts(travellerText);
  const flightsFoundCount = filteredFlights.length;
  const activeBookingFlight =
    flights.find((flight) => flight.id === bookingFlightId) || null;
  const tripLabel =
    tripType === "twoway"
      ? "Two Way"
      : tripType === "multicity"
        ? "Multi City"
        : "One Way";

  const toggleModifySearch = () => {
    setModifyForm({
      source: sourceName,
      destination: destinationName,
      departureDate: formatDateInput(selectedDate),
      tripType,
      travellers: travellerText,
      cabinClass,
    });
    setIsModifySearchOpen((previous) => !previous);
  };

  const handleSwapModifyCities = () => {
    setModifyForm((previous) => ({
      ...previous,
      source: previous.destination,
      destination: previous.source,
    }));
  };

  const handleApplyModifySearch = () => {
    const nextSource = modifyForm.source.trim();
    const nextDestination = modifyForm.destination.trim();
    const nextDateInput = modifyForm.departureDate || formatDateInput(selectedDate);
    const nextTripType = normalizeTripType(modifyForm.tripType);
    const nextTravellerText = normalizeTravellerSummary(modifyForm.travellers);
    const nextCabinClass = modifyForm.cabinClass || "Economy";

    if (!nextSource || !nextDestination) {
      setSearchError("Source and destination are required to update search.");
      return;
    }

    setSearchError("");
    setBookingSuccess("");
    setSourceName(nextSource);
    setDestinationName(nextDestination);
    setTripType(nextTripType);
    setTravellerText(nextTravellerText);
    setCabinClass(nextCabinClass);
    setSelectedDate(parseDateInput(nextDateInput));
    setSearchVersion((previous) => previous + 1);
    setIsModifySearchOpen(false);

    const nextParams = new URLSearchParams(location.search);
    nextParams.set("source", nextSource);
    nextParams.set("destination", nextDestination);
    nextParams.set("tripType", nextTripType);
    nextParams.set("departureDate", nextDateInput);
    nextParams.set("travellers", nextTravellerText);
    nextParams.set("cabinClass", nextCabinClass);

    navigate(
      `${location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
      {
        replace: true,
        state: {
          ...state,
          source: nextSource,
          destination: nextDestination,
          tripType: nextTripType,
          departureDate: nextDateInput,
          travellers: nextTravellerText,
          cabinClass: nextCabinClass,
        },
      }
    );
  };

  const toggleDepartureWindow = (key) => {
    setDepartureWindows((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleFareType = (key) => {
    setFareTypeFilters((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleStopFilter = (key) => {
    setStopFilters((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleAirline = (name) => {
    setAirlineFilters((previous) => ({ ...previous, [name]: !previous[name] }));
  };



  const handleToggleFlightExpand = (flightId) => {
    if (expandedFlightId === flightId) {
      setExpandedFlightId(null);
    } else {
      setExpandedFlightId(flightId);
      setSelectedFareType(selectedFareTypeByFlight[flightId] || "saver");
    }
  };


  const resolveFlightFareOption = (baseFlight) => {
    if (!baseFlight) return null;
    if (Array.isArray(baseFlight.fareOptions) && baseFlight.fareOptions.length > 0) {
      const optIdx = selectedFareOptionIndexByFlight[baseFlight.id] ?? 0;
      const chosenOpt = baseFlight.fareOptions[optIdx] || baseFlight.fareOptions[0];
      if (chosenOpt) {
        return {
          ...baseFlight,
          resultIndex: chosenOpt.resultIndex || baseFlight.resultIndex,
          ResultIndex: chosenOpt.ResultIndex || baseFlight.ResultIndex || chosenOpt.resultIndex || baseFlight.resultIndex,
          srdvIndex: chosenOpt.srdvIndex || baseFlight.srdvIndex,
          isLcc: chosenOpt.isLcc !== undefined ? chosenOpt.isLcc : baseFlight.isLcc,
          IsLCC: chosenOpt.isLcc !== undefined ? chosenOpt.isLcc : baseFlight.IsLCC,
          isRefundable: chosenOpt.isRefundable,
          fare: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare || baseFlight.fare,
          price: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare || baseFlight.price,
          priceInr: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare || baseFlight.priceInr,
          selectedTravelClassPriceInr: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare || baseFlight.selectedTravelClassPriceInr,
          baseFarePrice: chosenOpt.baseFare || baseFlight.baseFarePrice || 0,
          taxPrice: chosenOpt.tax || baseFlight.taxPrice || 0,
          b2cMarkupAmount: chosenOpt.b2cMarkupAmount || baseFlight.b2cMarkupAmount || 0,
          source: chosenOpt.source || baseFlight.source,
          className: chosenOpt.className || baseFlight.className || "Economy",
        };
      }
    }
    return baseFlight;
  };

  const handleStartBookingJourney = (flight, selectedPrice = null, selectedClass = null, explicitMultiCitySelections = null) => {
    resetBookingSessionTimer();
    setBookingError("");
    setBookingSuccess("");
    const bookingTravellerCounts = getTravellerCounts(travellerText);
    const seatRequired = Math.max(1, bookingTravellerCounts.adults + bookingTravellerCounts.children);

    let allSelectedLegs = [];
    if (tripType === "multicity") {
      const targetSelections = explicitMultiCitySelections || selectedMultiCityFlightIds || {};
      allSelectedLegs = apiFlights.map((legArray, index) => {
        const selectedId = targetSelections[index];
        const selectedObj = Array.isArray(legArray)
          ? (legArray.find(f => f.id === selectedId) || legArray[0])
          : (legArray?.id ? legArray : null);
        if (!selectedObj) return null;
        let resolvedObj = resolveFlightFareOption(selectedObj);
        const rawResultIndex = resolvedObj.legResultIndex || resolvedObj.resultIndex || resolvedObj.id || "";
        return {
          ...resolvedObj,
          resultIndex: rawResultIndex,
          ResultIndex: rawResultIndex,
          traceId: sharedMultiCityTraceId || resolvedObj.traceId || resolvedObj.sharedTraceId || "",
          TraceId: sharedMultiCityTraceId || resolvedObj.traceId || resolvedObj.sharedTraceId || "",
        };
      }).filter(Boolean);
    } else {
      const onwardFlight = resolveFlightFareOption(flight);
      if (onwardFlight) {
        allSelectedLegs.push({
          ...onwardFlight,
          resultIndex: onwardFlight.resultIndex || onwardFlight.id || "",
          ResultIndex: onwardFlight.ResultIndex || onwardFlight.resultIndex || onwardFlight.id || "",
        });
      }

      if (tripType === "twoway" && returnFlights.length > 0) {
        const rawReturnObj = returnFlights.find(f => f.id === selectedReturnFlightId) || returnFlights[0];
        if (rawReturnObj) {
          const returnFlightObj = resolveFlightFareOption(rawReturnObj);
          allSelectedLegs.push({
            ...returnFlightObj,
            resultIndex: returnFlightObj.resultIndex || returnFlightObj.id || "",
            ResultIndex: returnFlightObj.ResultIndex || returnFlightObj.resultIndex || returnFlightObj.id || "",
          });
        }
      }
    }

    const combinedPrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.fare || leg.price || 0), 0);
    const combinedBaseFarePrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.baseFarePrice || 0), 0);
    const combinedTaxPrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.taxPrice || 0), 0);
    const combinedB2cMarkup = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.b2cMarkupAmount || 0), 0);

    const baseFare = combinedBaseFarePrice || Number(combinedPrice || 0);
    const tax = combinedTaxPrice || 0;
    const platformMarkup = combinedB2cMarkup || 0;

    let markupValue = 0;
    const rawMarkup = localStorage.getItem("b2b_markup_settings");
    if (rawMarkup) {
      try {
        const parsedMarkup = JSON.parse(rawMarkup);
        if (parsedMarkup.flightType === "percentage") {
          markupValue = Number(combinedPrice || 0) * (Number(parsedMarkup.flightValue) / 100);
        } else if (parsedMarkup.flightType === "fixed") {
          markupValue = Number(parsedMarkup.flightValue);
        }
      } catch (e) { }
    }

    const isAgent = localStorage.getItem("b2b_role") === "Agent" && !localStorage.getItem("token");
    const b2bMarkup = isAgent ? markupValue : 0;
    const displayTotal = isAgent ? (Number(combinedPrice || 0) + markupValue) : Number(combinedPrice || 0);

    const onwardFlightObj = allSelectedLegs[0] || null;
    const returnFlightObj = allSelectedLegs[1] || null;

    const flowPayload = {
      flight: onwardFlightObj ? {
        ...onwardFlightObj,
        className: selectedClass || onwardFlightObj.className || "Economy",
      } : {},
      returnFlight: returnFlightObj ? {
        ...returnFlightObj,
        className: returnFlightObj.className || "Economy",
      } : null,
      isTwoWay: tripType === "twoway" && allSelectedLegs.length > 1,
      isMultiCity: tripType === "multicity",
      selectedLegs: allSelectedLegs,
      resultIndex: allSelectedLegs.map(l => l.resultIndex || l.id).filter(Boolean).join(","),
      ResultIndex: allSelectedLegs.map(l => l.resultIndex || l.id).filter(Boolean).join(","),
      traceId: sharedMultiCityTraceId || onwardFlightObj?.traceId || onwardFlightObj?.TraceId || "",
      TraceId: sharedMultiCityTraceId || onwardFlightObj?.traceId || onwardFlightObj?.TraceId || "",
      searchContext: {
        source: sourceName,
        destination: destinationName,
        tripType,
        departureDate: formatDateInput(selectedDate),
        returnDate: tripType === "twoway" ? formatDateInput(selectedReturnDate) : undefined,
        travellers: travellerText,
        cabinClass: selectedClass || cabinClass,
      },
      selectedSeatLabels: [],
      selectedSeats: [],
      mealPreference: "standard",
      baggagePlan: "20kg",
      fareSummary: {
        baseFare,
        seatSurcharge: 0,
        mealFee: 0,
        baggageFee: 0,
        tax,
        convenienceFee: 0,
        markup: platformMarkup + b2bMarkup,
        tierDiscount: 0,
        volumeDiscount: 0,
        totalFare: displayTotal,
      },
    };

    try {
      const combinedResultIndex = allSelectedLegs.map(l => l.resultIndex || l.id).filter(Boolean).join(",");
      const resolvedTraceId = sharedMultiCityTraceId || onwardFlightObj?.traceId || onwardFlightObj?.TraceId || sessionStorage.getItem("TraceId") || "";
      sessionStorage.setItem("SelectedFlight", JSON.stringify({
        TraceId: resolvedTraceId,
        ResultIndex: combinedResultIndex,
        IsLCC: Boolean(onwardFlightObj?.isLcc || onwardFlightObj?.IsLCC)
      }));
      if (resolvedTraceId) sessionStorage.setItem("flight_trace_id", resolvedTraceId);
    } catch (e) { }

    clearFlightBookingFlowState();
    writeFlightBookingFlowState(flowPayload);
    navigate("/flight/passenger-details", { state: flowPayload });
  };
  const handleStartBookingJourneyMultiCity = (selectionsMap, firstLegFlight) => {
    setBookingError("");
    setBookingSuccess("");
    const bookingTravellerCounts = getTravellerCounts(travellerText);
    const seatRequired = Math.max(1, bookingTravellerCounts.adults + bookingTravellerCounts.children);

    // Build all selected legs synchronously using the passed selectionsMap
    const allSelectedLegs = apiFlights.map((legArray, index) => {
      const selectedId = selectionsMap[index];
      const selectedObj = legArray?.find(f => f.id === selectedId) || legArray?.[0];
      if (!selectedObj) return null;
      const rawResultIndex = selectedObj.legResultIndex || selectedObj.resultIndex || selectedObj.id || "";
      return {
        ...selectedObj,
        resultIndex: rawResultIndex,
        ResultIndex: rawResultIndex,
        traceId: sharedMultiCityTraceId || selectedObj.traceId || selectedObj.sharedTraceId || "",
        TraceId: sharedMultiCityTraceId || selectedObj.traceId || selectedObj.sharedTraceId || "",
      };
    }).filter(Boolean);

    const combinedPrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.fare || 0), 0);
    const combinedBaseFarePrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.baseFarePrice || 0), 0);
    const combinedTaxPrice = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.taxPrice || 0), 0);
    const combinedB2cMarkup = allSelectedLegs.reduce((sum, leg) => sum + Number(leg.b2cMarkupAmount || 0), 0);

    let markupValue = 0;
    const rawMarkup = localStorage.getItem("b2b_markup_settings");
    if (rawMarkup) {
      try {
        const parsedMarkup = JSON.parse(rawMarkup);
        if (parsedMarkup.flightType === "percentage") {
          markupValue = Number(combinedPrice || 0) * (Number(parsedMarkup.flightValue) / 100);
        } else if (parsedMarkup.flightType === "fixed") {
          markupValue = Number(parsedMarkup.flightValue);
        }
      } catch (e) { }
    }
    const isAgent = localStorage.getItem("b2b_role") === "Agent" && !localStorage.getItem("token");
    const baseFare = combinedBaseFarePrice || Number(combinedPrice || 0);
    const tax = combinedTaxPrice || 0;
    const platformMarkup = combinedB2cMarkup || 0;
    const b2bMarkup = isAgent ? markupValue : 0;
    const displayTotal = isAgent ? (Number(combinedPrice || 0) + markupValue) : Number(combinedPrice || 0);

    const flowPayload = {
      flight: {
        ...(firstLegFlight || {}),
        fare: Number(firstLegFlight?.fare || 0),
        price: Number(firstLegFlight?.fare || 0),
        priceInr: Number(firstLegFlight?.fare || 0),
        selectedTravelClassPriceInr: Number(firstLegFlight?.fare || 0),
        traceId: sharedMultiCityTraceId || firstLegFlight?.traceId || "",
        TraceId: sharedMultiCityTraceId || firstLegFlight?.traceId || "",
      },
      returnFlight: null,
      isTwoWay: false,
      isMultiCity: true,
      selectedLegs: allSelectedLegs,
      searchContext: {
        source: sourceName,
        destination: destinationName,
        tripType,
        departureDate: formatDateInput(selectedDate),
        travellers: travellerText,
        cabinClass,
      },
      selectedSeatLabels: [],
      selectedSeats: [],
      mealPreference: "standard",
      baggagePlan: "20kg",
      fareSummary: {
        baseFare,
        seatSurcharge: 0,
        mealFee: 0,
        baggageFee: 0,
        tax,
        convenienceFee: 0,
        markup: platformMarkup + b2bMarkup,
        tierDiscount: 0,
        volumeDiscount: 0,
        totalFare: displayTotal,
      },
    };

    try {
      const combinedResultIndex = allSelectedLegs.map(l => l.resultIndex || l.id).filter(Boolean).join(",");
      const resolvedTraceId = sharedMultiCityTraceId || firstLegFlight?.traceId || "";
      sessionStorage.setItem("SelectedFlight", JSON.stringify({
        TraceId: resolvedTraceId,
        ResultIndex: combinedResultIndex,
        IsLCC: Boolean(firstLegFlight?.isLcc || firstLegFlight?.IsLCC)
      }));
      if (resolvedTraceId) sessionStorage.setItem("flight_trace_id", resolvedTraceId);
    } catch (e) { }

    clearFlightBookingFlowState();
    writeFlightBookingFlowState(flowPayload);
    navigate("/flight/passenger-details", { state: flowPayload });
  };

  const closeBookingModal = () => {
    if (isBookingSubmitting) {
      return;
    }
    setBookingFlightId(null);
    setBookingError("");
  };

  const validateBookingForm = () => {
    if (!bookingForm.passengerName.trim()) {
      return "Passenger name is required.";
    }

    if (!bookingForm.passengerPhone.trim()) {
      return "Passenger phone is required.";
    }

    const adults = Number(bookingForm.adults);
    const children = Number(bookingForm.children);
    const infants = Number(bookingForm.infants);

    if (adults < 0 || children < 0 || infants < 0) {
      return "Adults, children, and infants cannot be negative.";
    }

    if (adults + children <= 0) {
      return "At least one adult or child is required for seat booking.";
    }

    if ((children > 0 || infants > 0) && adults < 1) {
      return "At least one adult is required when children or infants are present.";
    }

    if (infants > adults) {
      return "Infants cannot exceed adults.";
    }

    if (!bookingForm.travelClass) {
      return "Please select a travel class.";
    }

    return "";
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();

    if (!activeBookingFlight) {
      return;
    }

    const validationMessage = validateBookingForm();
    if (validationMessage) {
      setBookingError(validationMessage);
      return;
    }

    setIsBookingSubmitting(true);
    setBookingError("");

    try {
      const adults = Number(bookingForm.adults);
      const children = Number(bookingForm.children);
      const infants = Number(bookingForm.infants);

      const payload = {
        passengerName: bookingForm.passengerName.trim(),
        passengerPhone: bookingForm.passengerPhone.trim(),
        passengerEmail: bookingForm.passengerEmail.trim(),
        travelClass: bookingForm.travelClass,
        passengers: buildPassengersFromCounts(
          bookingForm.passengerName,
          adults,
          children,
          infants
        ),
      };

      const bookingResponse = await bookFlight({
        flightId: activeBookingFlight.id,
        payload,
      });

      const reference = bookingResponse?.bookingReference
        ? ` (${bookingResponse.bookingReference})`
        : "";

      setBookingSuccess(`Flight booked successfully${reference}.`);
      setBookingFlightId(null);
      setSearchVersion((previous) => previous + 1);
    } catch (error) {
      setBookingError(error.message || "Unable to complete booking.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <main className={`flight-results-page${isLoadingFlights ? " is-loading" : ""}`}>
      {isLoadingFlights && (
        <FlightLoadingScreen
          sourceCity={sourceName}
          destinationCity={destinationName}
          customMessage={LOADING_STATUSES[loadingStatusIndex]}
        />
      )}
      <div className="flight-results-shell">
        <section className="summary-strip">
          <div className="route-summary">
            <article className="route-block">
              <h2>{displaySourceCode}</h2>
              <p>{displaySourceName}</p>
            </article>
            <article className="route-block">
              <h2>{displayDestinationCode}</h2>
              <p>{displayDestinationName}</p>
            </article>
          </div>

          <div className="journey-meta">
            <div className="meta-line">
              <CalendarDays size={15} />
              <span>
                ONWARD <strong>{formatLongDate(selectedDate)}</strong>
              </span>
            </div>
            <p>
              Trip {tripLabel}{" "}
              | Adults {travellerCounts.adults} | Child {travellerCounts.children} |
              Infant {travellerCounts.infants}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="modify-btn"
              style={{ backgroundColor: "#dc1e26", borderColor: "#dc1e26", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => setIsFareCalendarOpen(true)}
            >
              <CalendarDays size={16} />
              Calendar Fare
            </button>
            <button
              type="button"
              className="modify-btn"
              onClick={toggleModifySearch}
            >
              Modify Search
            </button>
          </div>
        </section>

        {isModifySearchOpen && (
          <section className="modify-search-panel">
            <div className="modify-search-grid">
              <label className="modify-field">
                <span>Source</span>
                <input
                  type="text"
                  value={modifyForm.source}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      source: event.target.value,
                    }))
                  }
                  placeholder="Enter source city"
                />
              </label>

              <button
                type="button"
                className="modify-swap-btn"
                onClick={handleSwapModifyCities}
                aria-label="Swap source and destination"
              >
                <ArrowLeftRight size={16} />
              </button>

              <label className="modify-field">
                <span>Destination</span>
                <input
                  type="text"
                  value={modifyForm.destination}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      destination: event.target.value,
                    }))
                  }
                  placeholder="Enter destination city"
                />
              </label>

              <label className="modify-field" style={{ position: "relative" }}>
                <span>Departure Date</span>
                <input
                  type="text"
                  readOnly
                  value={toDisplayDate(modifyForm.departureDate)}
                  placeholder="DD/MM/YYYY"
                  style={{ cursor: "pointer" }}
                  onClick={() => document.getElementById("flight-date-hidden").showPicker?.()}
                />
                <input
                  id="flight-date-hidden"
                  type="date"
                  value={modifyForm.departureDate}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      departureDate: event.target.value,
                    }))
                  }
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                />
              </label>
              <label className="modify-field">
                <span>Trip Type</span>
                <select
                  value={modifyForm.tripType}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      tripType: normalizeTripType(event.target.value),
                    }))
                  }
                >
                  <option value="oneway">One Way</option>
                  <option value="twoway">Two Way</option>
                </select>
              </label>

              <label className="modify-field">
                <span>Travellers</span>
                <input
                  type="text"
                  value={modifyForm.travellers}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      travellers: event.target.value,
                    }))
                  }
                  placeholder="1 Adult"
                />
              </label>

              <label className="modify-field">
                <span>Cabin Class</span>
                <select
                  value={modifyForm.cabinClass}
                  onChange={(event) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      cabinClass: event.target.value,
                    }))
                  }
                >
                  {TRAVEL_CLASS_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modify-search-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setIsModifySearchOpen(false)}
              >
                Close
              </button>
              <button type="button" className="primary" onClick={handleApplyModifySearch}>
                Apply Search
              </button>
            </div>
          </section>
        )}

        {searchError && (
          <div className="search-feedback error">
            <XCircle size={16} />
            <span>{searchError}</span>
          </div>
        )}

        {bookingSuccess && (
          <div className="search-feedback success">
            <CheckCircle2 size={16} />
            <span>{bookingSuccess}</span>
          </div>
        )}

        <section className="flight-promo-scroller" aria-label="Travel booking highlights">
          {FLIGHT_PROMO_ITEMS.map((item) => (
            <article className="flight-promo-chip" key={item.id}>
              <span className="flight-promo-icon" aria-hidden="true">
                <item.icon size={16} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </article>
          ))}
        </section>

        <div className="results-layout">
          <aside className="filters-rail">
            <header className="flights-count">
              <strong>{flightsFoundCount} Flights Found.</strong>
            </header>

            <section className="filter-group">
              <h3>
                <IndianRupee size={17} />
                <span>Price</span>
              </h3>
              <div className="range-head">
                <span>{formatCurrency(priceMin)}</span>
                <span>{formatCurrency(maxFare)}</span>
              </div>
              <div className="range-stack">
                <input
                  type="range"
                  min={minFare}
                  max={maxFare}
                  value={priceMin}
                  disabled={minFare === maxFare}
                  onChange={(event) => setPriceMin(Number(event.target.value))}
                />
              </div>
            </section>

            <section className="filter-group">
              <h3>
                <Clock3 size={17} />
                <span>Time</span>
              </h3>
              <div className="range-head">
                <span>{getTimeDisplay(timeMin)}</span>
                <span>{getTimeDisplay(23)}</span>
              </div>
              <div className="range-stack">
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={timeMin}
                  onChange={(event) => setTimeMin(Number(event.target.value))}
                />
              </div>
            </section>

            <section className="filter-group">
              <h3>
                <Clock3 size={17} />
                <span>Departure</span>
              </h3>
              <div className="departure-grid">
                {DEPARTURE_WINDOWS.map(({ key, label, Icon }) => (
                  <button
                    type="button"
                    key={key}
                    className={`departure-chip ${departureWindows[key] ? "active" : ""
                      }`}
                    onClick={() => toggleDepartureWindow(key)}
                  >
                    <Icon size={25} strokeWidth={2.3} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="filter-group">
              <h3>
                <MapPin size={17} />
                <span>Fare Type</span>
              </h3>
              {FARE_TYPE_FILTERS.map((fareType) => (
                <label className="check-row" key={fareType.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(fareTypeFilters[fareType.key])}
                    onChange={() => toggleFareType(fareType.key)}
                  />
                  <span>{fareType.label}</span>
                </label>
              ))}
            </section>

            <section className="filter-group">
              <h3>
                <MapPin size={17} />
                <span>Stop</span>
              </h3>
              {STOP_FILTERS.map((stop) => (
                <label className="check-row" key={stop.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(stopFilters[stop.key])}
                    onChange={() => toggleStopFilter(stop.key)}
                  />
                  <span>{stop.label}</span>
                </label>
              ))}
            </section>

            <section className="filter-group">
              <h3>
                <Plane size={17} />
                <span>Airlines</span>
              </h3>
              {Object.keys(airlineFilters).length === 0 ? (
                <p className="empty-filter-state">No airline data yet.</p>
              ) : (
                Object.keys(airlineFilters).map((name) => (
                  <label className="check-row" key={name}>
                    <input
                      type="checkbox"
                      checked={Boolean(airlineFilters[name])}
                      onChange={() => toggleAirline(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))
              )}
            </section>
          </aside>

          <section className="results-column" style={{ paddingBottom: tripType === "twoway" ? "100px" : "20px" }}>
            {tripType !== "multicity" && (
              <div className="fare-date-strip">
                <button
                  type="button"
                  className="fare-date-nav"
                  aria-label="Previous day"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                >
                  <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                {dateStrip.map((item) => {
                  const yyyy = item.date.getFullYear();
                  const mm = String(item.date.getMonth() + 1).padStart(2, "0");
                  const dd = String(item.date.getDate()).padStart(2, "0");
                  const dateKey = `${yyyy}-${mm}-${dd}`;
                  const liveFare = calendarFareMap[dateKey];
                  const isLowestOfMonth = lowestFareOfMonthDates.has(dateKey);
                  const displayFareText = liveFare
                    ? `₹${new Intl.NumberFormat("en-IN").format(liveFare)}`
                    : item.offset === 0 && flights.length > 0
                      ? `Best fare ₹${new Intl.NumberFormat("en-IN").format(minFare)}`
                      : "Tap to search";

                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`fare-date-card ${item.date.toDateString() === selectedDate.toDateString()
                          ? "active"
                          : ""
                        } ${isLowestOfMonth ? "lowest-month-fare" : ""}`}
                      aria-label={`Search fares for ${formatLongDate(item.date)}`}
                      onClick={() => setSelectedDate(item.date)}
                    >
                      <strong>{formatCardDate(item.date)}</strong>
                      <span style={{ fontWeight: liveFare ? 700 : 400, color: isLowestOfMonth ? "#16a34a" : undefined }}>
                        {displayFareText}
                      </span>
                      {isLowestOfMonth && (
                        <span style={{ fontSize: "0.6rem", background: "#dcfce7", color: "#166534", padding: "1px 4px", borderRadius: "3px", marginTop: "2px", fontWeight: 700 }}>
                          Lowest Fare
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="fare-date-nav"
                  aria-label="Next day"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <ChevronRight size={24} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {tripType === "twoway" && returnFlights.length > 0 && (
              <div
                id="two-way-tabs-strip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                  backgroundColor: "#ffffff",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #cbd5e1"
                }}
              >
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: twoWayActiveTab === "onward" ? "2px solid #d32f2f" : "1px solid #cbd5e1",
                    backgroundColor: twoWayActiveTab === "onward" ? "#fff5f5" : "#ffffff",
                    color: twoWayActiveTab === "onward" ? "#d32f2f" : "#475569",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onClick={() => setTwoWayActiveTab("onward")}
                >
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", display: "block" }}>1. ONWARD FLIGHT</span>
                    <strong>{sourceName} ➔ {destinationName}</strong>
                    {selectedOnwardFlightObj && (
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#d32f2f", fontWeight: 700, marginTop: "2px" }}>
                        Selected: ₹{new Intl.NumberFormat("en-IN").format(selectedOnwardFlightObj.fare)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.85rem", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" }}>
                    {apiFlights.length} Available
                  </span>
                </button>

                <div style={{ textAlign: "center", padding: "0 8px" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, display: "block" }}>
                    TOTAL FARE
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#16a34a" }}>
                    ₹{new Intl.NumberFormat("en-IN").format(combinedFare)}
                  </span>
                </div>

                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: twoWayActiveTab === "return" ? "2px solid #dc1e26" : "1px solid #cbd5e1",
                    backgroundColor: twoWayActiveTab === "return" ? "#fef2f2" : "#ffffff",
                    color: twoWayActiveTab === "return" ? "#dc1e26" : "#475569",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onClick={() => setTwoWayActiveTab("return")}
                >
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", display: "block" }}>2. RETURN FLIGHT</span>
                    <strong>{destinationName} ➔ {sourceName}</strong>
                    {selectedReturnFlightObj && (
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#dc1e26", fontWeight: 700, marginTop: "2px" }}>
                        Selected: ₹{new Intl.NumberFormat("en-IN").format(selectedReturnFlightObj.fare)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.85rem", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" }}>
                    {returnFlights.length} Available
                  </span>
                </button>
              </div>
            )}

            {tripType === "multicity" && (apiFlights.length > 0 ? apiFlights : parsedMultiCityLegs).length > 0 && (
              <div
                id="multi-city-tabs-strip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                  backgroundColor: "#ffffff",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #cbd5e1",
                  overflowX: "auto"
                }}
              >
                {(apiFlights.length > 0 ? apiFlights : parsedMultiCityLegs).map((legItemOrArray, index) => {
                  const legArray = Array.isArray(legItemOrArray) ? legItemOrArray : (apiFlights[index] || []);
                  const selectedId = selectedMultiCityFlightIds[index];
                  const selectedObj = legArray?.find(f => f.id === selectedId) || legArray?.[0];
                  const isActive = multiCityActiveTab === index;
                  const legInfo = parsedMultiCityLegs[index] || {};
                  const displaySrc = cityCode(selectedObj?.sourceCode || legInfo.from || legInfo.fromCity || legInfo.source || "SRC");
                  const displayDest = cityCode(selectedObj?.destinationCode || legInfo.to || legInfo.toCity || legInfo.destination || "DEST");
                  const displayAirline = selectedObj?.airline || selectedObj?.airlineName || "Select Flight";
                  const displayFare = selectedObj?.fare;

                  return (
                    <button
                      key={`mc-top-tab-${index}`}
                      type="button"
                      style={{
                        flex: 1,
                        minWidth: "210px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: isActive ? "2px solid #e11d48" : "1px solid #cbd5e1",
                        backgroundColor: isActive ? "#fff1f2" : "#ffffff",
                        color: isActive ? "#e11d48" : "#475569",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px"
                      }}
                      onClick={() => setMultiCityActiveTab(index)}
                    >
                      <div style={{ textAlign: "left" }}>
                        <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: isActive ? "#e11d48" : "#64748b", display: "block", fontWeight: 800 }}>
                          {index + 1}. FLIGHT LEG {index + 1}
                        </span>
                        <strong style={{ color: "#0f172a" }}>{displaySrc} ➔ {displayDest}</strong>
                        {selectedObj && (
                          <span style={{ display: "block", fontSize: "0.78rem", color: "#e11d48", fontWeight: 700, marginTop: "2px" }}>
                            {displayAirline} {displayFare ? `· ₹${new Intl.NumberFormat("en-IN").format(displayFare)}` : ""}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.8rem", background: isActive ? "#ffe4e6" : "#f1f5f9", color: isActive ? "#9f1239" : "#475569", padding: "4px 8px", borderRadius: "6px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {legArray.length} Available
                      </span>
                    </button>
                  );
                })}

                <div style={{ textAlign: "center", padding: "0 12px", borderLeft: "1px solid #e2e8f0", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, display: "block" }}>
                    TOTAL FARE
                  </span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 900, color: "#16a34a" }}>
                    ₹{new Intl.NumberFormat("en-IN").format(combinedFare)}
                  </span>
                </div>
              </div>
            )}

            <div className="flight-sort-panel">
              <div className="sort-meta-row">
                <strong>Sort by</strong>
                <span>{flightsFoundCount} Flights Available</span>
              </div>
              <div className="flight-sort-strip" role="radiogroup" aria-label="Sort flights">
                {[
                  { key: "price", title: "Price", subtitle: "Low to High" },
                  { key: "fastest", title: "Fastest", subtitle: "Shortest First" },
                  { key: "departure", title: "Departure", subtitle: "Earliest First" },
                  { key: "smart", title: "Smart", subtitle: "Recommended" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`flight-sort-pill ${sortBy === option.key ? "active" : ""}`}
                    role="radio"
                    aria-checked={sortBy === option.key}
                    onClick={() => setSortBy(option.key)}
                  >
                    <span className="sort-title">
                      {option.title}
                      {option.key === "departure" && <ArrowDown size={15} />}
                    </span>
                    <span className="sort-subtitle">{option.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="table-head">
              <span>Airline</span>
              <span>Depart</span>
              <span>Duration</span>
              <span>Arrive</span>
              <span>Price</span>
            </div>

            <div className="flight-list">
              {sortedFlights.length === 0 ? (
                <div className="no-results">
                  <PlaneTakeoff size={18} />
                  <p>No flights match the selected filters for this date.</p>
                </div>
              ) : (
                sortedFlights.map((flight) => {
                  const isExpanded = expandedFlightId === flight.id;
                  const isSelectedInTwoWay = tripType === "twoway" && (
                    (twoWayActiveTab === "onward" && selectedOnwardFlightId === flight.id) ||
                    (twoWayActiveTab === "return" && selectedReturnFlightId === flight.id)
                  );
                  const flightCardJsx = (
                    <article
                      className={`flight-card-modern ${isExpanded ? "expanded" : ""} ${isSelectedInTwoWay ? "selected-two-way" : ""}`}
                      key={flight.id}
                      onClick={() => {
                        handleToggleFlightExpand(flight.id);
                      }}
                    >
                      <div className="flight-card-main-row">
                        {/* Top Meta Line */}
                        <div className="flight-card-meta-line">
                          <div className="flight-identity">
                            <img src={flight.logo} alt={flight.airlineName} className="airline-logo-mini" />
                            <span className="flight-number-mini">{flight.airlineName} ({flight.flightNumber})</span>
                          </div>
                          <div className="flight-badge-gold">
                            {flight.totalAvailableSeats <= 5 && flight.totalAvailableSeats > 0 ? "Only a few seats left" : "Filling Fast"}
                          </div>
                        </div>

                        {/* Center Flight Info Row */}
                        <div className="flight-card-info-grid">
                          {/* Departure Block */}
                          <div className="airport-info-block departure">
                            <div className="time-code-row">
                              <span className="large-time">{flight.departureTime}</span>
                              <span className="city-code">{flight.sourceCode}</span>
                            </div>
                            <span className="airport-name-sub">{getAirportName(flight.sourceCode, sourceName)}</span>
                          </div>

                          {/* Route Path Block */}
                          <div className="route-path-block">
                            <span className="duration-label">{flight.duration}</span>
                            <div className="path-visual-line">
                              <div className="dashed-line"></div>
                              <Plane className="plane-icon-mini" size={14} style={{ transform: "rotate(90deg)" }} />
                              <div className="dashed-line"></div>
                              <div className="end-dot"></div>
                            </div>
                            <span className="stops-label">{flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}</span>
                          </div>

                          {/* Arrival Block */}
                          <div className="airport-info-block arrival">
                            <div className="time-code-row">
                              <span className="city-code">{flight.destinationCode}</span>
                              <span className="large-time">{flight.arrivalTime}</span>
                            </div>
                            <span className="airport-name-sub">{getAirportName(flight.destinationCode, destinationName)}</span>
                          </div>

                          {/* Price & Action Block */}
                          <div className="price-action-block" onClick={(e) => e.stopPropagation()}>
                            <div className="starts-at-label">
                              {tripType === "twoway" ? "Flight Fare" : "Starts at"}
                            </div>
                            <div className="price-caret-row" onClick={() => handleToggleFlightExpand(flight.id)}>
                              <span className="starts-price">₹{new Intl.NumberFormat("en-IN").format(flight.fare)}</span>
                              <span className="caret-icon-wrapper">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </span>
                            </div>
                            {tripType === "twoway" && (
                              <div style={{ fontSize: "0.76rem", color: "#16a34a", fontWeight: 800, marginTop: "4px" }}>
                                Total: ₹{new Intl.NumberFormat("en-IN").format(
                                  flight.fare + (twoWayActiveTab === "onward" ? (selectedReturnFlightObj?.fare || 0) : (selectedOnwardFlightObj?.fare || 0))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {Array.isArray(flight.fullMultiSectorSegments) && flight.fullMultiSectorSegments.length > 1 && (
                        <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>All Flights in this Multi-City Journey ({flight.fullMultiSectorSegments.length} Sectors)</span>
                            <span style={{ color: "#e11d48", fontWeight: 800 }}>Total Combined Fare: ₹{new Intl.NumberFormat("en-IN").format(flight.fare)}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(${flight.fullMultiSectorSegments.length}, minmax(0, 1fr))`, gap: "8px" }}>
                            {flight.fullMultiSectorSegments.map((sec, secIdx) => (
                              <div key={`mc-sec-${secIdx}`} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "0.78rem" }}>
                                <div style={{ fontWeight: 800, color: "#e11d48", fontSize: "0.7rem" }}>LEG {secIdx + 1}</div>
                                <strong style={{ color: "#0f172a", fontSize: "0.82rem" }}>{sec.sourceCode} ➔ {sec.destinationCode}</strong>
                                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>{sec.airline} ({sec.flightNumber})</div>
                                <div style={{ color: "#334155", fontSize: "0.72rem", marginTop: "2px", fontWeight: 600 }}>
                                  {sec.departureTime ? (sec.departureTime.includes("T") ? sec.departureTime.split("T")[1].slice(0, 5) : sec.departureTime.slice(11, 16)) : "--:--"} ➔ {sec.arrivalTime ? (sec.arrivalTime.includes("T") ? sec.arrivalTime.split("T")[1].slice(0, 5) : sec.arrivalTime.slice(11, 16)) : "--:--"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="fare-selection-zone" onClick={(e) => e.stopPropagation()}>
                          {/* Main Fare Comparison Table Layout */}
                          <div className="fare-table-container">
                            {/* Features List Column (Left) */}
                            <div className="fare-features-labels-column">
                              <div className="feature-label-cell header-cell">
                                <span className="fare-types-title">Fare Types</span>
                                <button
                                  type="button"
                                  className="know-more-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenFareRule(flight);
                                  }}
                                >
                                  Know more
                                </button>
                              </div>
                              <div className="feature-label-cell group-title">Baggage</div>
                              <div className="feature-label-cell group-title">Change/cancellation</div>
                              <div className="feature-label-cell group-title">Add-ons and services</div>
                            </div>

                            {/* Fare Cards Columns (Right) */}
                            <div className="fare-columns-container">
                              {Array.isArray(flight.fareOptions) && flight.fareOptions.length > 0 ? (
                                flight.fareOptions.map((opt, optIdx) => {
                                  const isSelectedOpt = (selectedFareOptionIndexByFlight[flight.id] ?? 0) === optIdx;
                                  const optBaggage = opt.fareSegments?.[0]?.Baggage || (flight.checkedBagsWeight ? `${flight.checkedBagsWeight} ${flight.checkedBagsUnit || "kg"}` : "15 kg");
                                  const optCabinBaggage = opt.fareSegments?.[0]?.CabinBaggage || (flight.cabinBagsWeight ? `${flight.cabinBagsWeight} ${flight.cabinBagsUnit || "kg"}` : "7 kg");

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`fare-column-card ${isSelectedOpt ? 'active' : ''}`}
                                      onClick={() => {
                                        setSelectedFareOptionIndexByFlight(prev => ({ ...prev, [flight.id]: optIdx }));
                                        if (tripType === "twoway" && returnFlights.length > 0) {
                                          if (twoWayActiveTab === "onward") {
                                            setSelectedOnwardFlightId(flight.id);
                                            setTwoWayActiveTab("return");
                                            setTimeout(() => {
                                              const el = document.getElementById("two-way-tabs-strip");
                                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                            }, 100);
                                          } else {
                                            setSelectedReturnFlightId(flight.id);
                                          }
                                        } else if (tripType === "multicity") {
                                          const totalLegsCount = (apiFlights && apiFlights.length > 0) ? apiFlights.length : parsedMultiCityLegs.length;
                                          setSelectedMultiCityFlightIds(prev => ({ ...prev, [multiCityActiveTab]: flight.id }));
                                          if (multiCityActiveTab < totalLegsCount - 1) {
                                            setMultiCityActiveTab(prev => prev + 1);
                                            setTimeout(() => {
                                              window.scrollTo({ top: 0, behavior: "smooth" });
                                            }, 100);
                                          }
                                        }
                                      }}
                                    >
                                      <div className="fare-column-header">
                                        <span
                                          style={{
                                            backgroundColor: opt.buttonColor || "#0000ff",
                                            color: opt.textColor || "#ffffff",
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            fontSize: "0.78rem",
                                            fontWeight: 700,
                                            display: "inline-block"
                                          }}
                                        >
                                          <span
                                            className="fare-column-title"
                                            title={opt.source || "Fare Option"}
                                          >
                                            {opt.source || "Fare Option"}
                                          </span>
                                        </span>
                                        <div className="fare-column-price">
                                          ₹{new Intl.NumberFormat("en-IN").format(opt.b2cFinalFare || opt.b2cPublishedFare || opt.offeredFare)}
                                        </div>
                                      </div>

                                      <div className="fare-column-features-group baggage">
                                        <div className="feature-item">
                                          <Lock size={14} className="feature-icon" />
                                          <span>{optCabinBaggage} Cabin bag allowance</span>
                                        </div>
                                        <div className="feature-item">
                                          <Briefcase size={14} className="feature-icon" />
                                          <span>{optBaggage} Check-in bag allowance</span>
                                        </div>
                                      </div>

                                      <div className="fare-column-features-group changes">
                                        <div className="feature-item">
                                          <Undo size={14} className="feature-icon" />
                                          <span>Cancellation & Changes: <strong>{opt.isRefundable ? "Refundable" : "Non-Refundable"}</strong></span>
                                        </div>
                                        {opt.airlineRemark && (
                                          <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "4px" }}>
                                            Remark: {opt.airlineRemark}
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          style={{ background: "none", border: "none", color: "#d32f2f", cursor: "pointer", padding: "4px 0", fontSize: "0.82rem", textDecoration: "underline", fontWeight: 600 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenFareRule({ ...flight, resultIndex: opt.resultIndex, srdvIndex: opt.srdvIndex, isLcc: opt.isLcc });
                                          }}
                                        >
                                          View Live Fare Rules ➔
                                        </button>
                                      </div>

                                      <div className="fare-column-features-group addons">
                                        <div className="feature-item">
                                          <Utensils size={14} className="feature-icon" />
                                          <span>{opt.isLcc ? "LCC Direct Ticket" : "GDS Standard Fare"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <>
                                  {/* Fallback Saver Fare */}
                                  <div
                                    className={`fare-column-card ${(selectedFareTypeByFlight[flight.id] || 'saver') === 'saver' ? 'active' : ''}`}
                                    onClick={() => {
                                      setSelectedFareTypeByFlight(prev => ({ ...prev, [flight.id]: 'saver' }));
                                      setSelectedFareType('saver');
                                      if (tripType === "multicity") {
                                        const totalLegsCount = (apiFlights && apiFlights.length > 0) ? apiFlights.length : parsedMultiCityLegs.length;
                                        setSelectedMultiCityFlightIds(prev => ({ ...prev, [multiCityActiveTab]: flight.id }));
                                        if (multiCityActiveTab < totalLegsCount - 1) {
                                          setMultiCityActiveTab(prev => prev + 1);
                                          setTimeout(() => {
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                          }, 100);
                                        }
                                      }
                                    }}
                                  >
                                    <div className="fare-column-header">
                                      <span className="fare-badge saver">Saver fare</span>
                                      <div className="fare-column-price">₹{new Intl.NumberFormat("en-IN").format(flight.baseFarePrice || flight.fare)}</div>
                                    </div>

                                    <div className="fare-column-features-group baggage">
                                      <div className="feature-item">
                                        <Lock size={14} className="feature-icon" />
                                        <span>{flight.cabinBagsWeight ? `${flight.cabinBagsWeight} ${flight.cabinBagsUnit || "kg"}` : "7 kg"} Cabin bag allowance</span>
                                      </div>
                                      <div className="feature-item">
                                        <Briefcase size={14} className="feature-icon" />
                                        <span>{flight.checkedBagsWeight ? `${flight.checkedBagsWeight} ${flight.checkedBagsUnit || "kg"}` : "15 kg"} Check-in bag allowance</span>
                                      </div>
                                    </div>

                                    <div className="fare-column-features-group changes">
                                      <div className="feature-item">
                                        <Undo size={14} className="feature-icon" />
                                        <span>Cancellation & Changes: <strong>{flight.isRefundable ? "Refundable" : "Non-Refundable"}</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Bottom Sticky/Action Bar */}
                          <div className="fare-selection-footer-bar">
                            <div className="total-fare-display-block">
                              <span className="total-fare-label">TOTAL FARE</span>
                              <span className="total-fare-amount">
                                ₹{new Intl.NumberFormat("en-IN").format(selectedFarePrice)}
                              </span>
                              <button type="button" className="view-details-link-btn">View Details</button>
                            </div>
                            <button
                              type="button"
                              className="fare-next-btn"
                              onClick={() => {
                                let targetFlight = flight;
                                let chosenPrice = selectedFarePrice;
                                let chosenClass = flight.className || "Economy";

                                if (Array.isArray(flight.fareOptions) && flight.fareOptions.length > 0) {
                                  const optIdx = selectedFareOptionIndexByFlight[flight.id] ?? 0;
                                  const chosenOpt = flight.fareOptions[optIdx] || flight.fareOptions[0];
                                  if (chosenOpt) {
                                    targetFlight = {
                                      ...flight,
                                      resultIndex: chosenOpt.resultIndex,
                                      srdvIndex: chosenOpt.srdvIndex,
                                      isLcc: chosenOpt.isLcc,
                                      isRefundable: chosenOpt.isRefundable,
                                      fare: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare,
                                      price: chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare,
                                      baseFarePrice: chosenOpt.baseFare || flight.baseFarePrice || 0,
                                      taxPrice: chosenOpt.tax || flight.taxPrice || 0,
                                      b2cMarkupAmount: chosenOpt.b2cMarkupAmount || flight.b2cMarkupAmount || 0,
                                      source: chosenOpt.source,
                                    };
                                    chosenPrice = chosenOpt.b2cFinalFare || chosenOpt.b2cPublishedFare || chosenOpt.offeredFare;
                                    chosenClass = `${flight.airlineName} (${chosenOpt.source})`;
                                  }
                                } else {
                                  chosenClass = selectedFareType === "saver" ? "Economy (Saver)" :
                                    selectedFareType === "flexi" ? "Economy (Flexi Plus)" :
                                      `${flight.airlineName} UpFront`;
                                }
                                if (tripType === "twoway" && returnFlights.length > 0) {
                                  if (twoWayActiveTab === "onward") {
                                    setSelectedOnwardFlightId(targetFlight.id);
                                    setTwoWayActiveTab("return");
                                    setTimeout(() => {
                                      const el = document.getElementById("two-way-tabs-strip");
                                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }, 100);
                                  } else {
                                    setSelectedReturnFlightId(targetFlight.id);
                                    if (selectedOnwardFlightObj) {
                                      handleStartBookingJourney(selectedOnwardFlightObj, selectedOnwardFlightObj.fare, selectedOnwardFlightObj.className);
                                    }
                                  }
                                } else if (tripType === "multicity") {
                                  // Update selection for current leg
                                  const updatedSelections = { ...selectedMultiCityFlightIds, [multiCityActiveTab]: targetFlight.id };
                                  setSelectedMultiCityFlightIds(updatedSelections);
                                  if (multiCityActiveTab < apiFlights.length - 1) {
                                    // Jump to next leg
                                    setMultiCityActiveTab(prev => prev + 1);
                                    setTimeout(() => {
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }, 100);
                                  } else {
                                    // Last leg selected — use first-leg flight as the primary flight object
                                    // but all legs will be read from updatedSelections + apiFlights by handleStartBookingJourney
                                    const firstLegFlight = apiFlights[0]?.find(f => f.id === updatedSelections[0]) || apiFlights[0]?.[0];
                                    if (firstLegFlight) {
                                      // Temporarily update state and call with the first-leg flight
                                      // handleStartBookingJourney reads from apiFlights + selectedMultiCityFlightIds
                                      // but since React batches — pass all legs explicitly
                                      handleStartBookingJourney(firstLegFlight, null, null, updatedSelections);
                                    }
                                  }
                                } else {
                                  handleStartBookingJourney(targetFlight, chosenPrice, chosenClass);
                                }
                              }}
                            >
                              {tripType === "twoway" && returnFlights.length > 0 && twoWayActiveTab === "onward" ? "Select Return Flight →" :
                                (tripType === "multicity" && multiCityActiveTab < apiFlights.length - 1) ? "Select Next Leg →" : "Next"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );

                  if (isExpanded) {
                    return (
                      <div className="expanded-flight-wrapper" key={flight.id}>
                        <div className="expanded-flight-header">
                          <span>{flight.sourceCode}</span>
                          <span className="expanded-header-line"></span>
                          <span>{flight.destinationCode}</span>
                        </div>
                        {flightCardJsx}
                      </div>
                    );
                  }

                  return flightCardJsx;
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {((tripType === "twoway" && returnFlights.length > 0) || tripType === "multicity") && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#090d16",
          color: "#ffffff",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 9999,
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.45)",
          borderTop: "3px solid #e11d48",
          backdropFilter: "blur(12px)",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflowX: "auto", flexShrink: 1 }}>
            {tripType === "twoway" && returnFlights.length > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: twoWayActiveTab === "onward" ? "rgba(225, 29, 72, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: twoWayActiveTab === "onward" ? "1.5px solid #e11d48" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer"
                  }}
                  onClick={() => setTwoWayActiveTab("onward")}
                >
                  <div style={{ background: "#e11d48", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
                    1. ONWARD
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap" }}>
                      {selectedOnwardFlightObj ? `${selectedOnwardFlightObj.airline} (${selectedOnwardFlightObj.sourceCode || sourceName} → ${selectedOnwardFlightObj.destinationCode || destinationName})` : "Select Onward Flight"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600, marginTop: "1px", whiteSpace: "nowrap" }}>
                      {selectedOnwardFlightObj ? `Depart ${selectedOnwardFlightObj.departureTime || "--:--"} | ₹${new Intl.NumberFormat("en-IN").format(selectedOnwardFlightObj.fare)}` : "Not selected"}
                    </div>
                  </div>
                </div>

                <div style={{ width: "1px", height: "30px", background: "#334155", flexShrink: 0 }} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: twoWayActiveTab === "return" ? "rgba(220, 30, 38, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: twoWayActiveTab === "return" ? "1.5px solid #dc1e26" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer"
                  }}
                  onClick={() => setTwoWayActiveTab("return")}
                >
                  <div style={{ background: "#dc1e26", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
                    2. RETURN
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap" }}>
                      {selectedReturnFlightObj ? `${selectedReturnFlightObj.airline} (${selectedReturnFlightObj.sourceCode || destinationName} → ${selectedReturnFlightObj.destinationCode || sourceName})` : "Select Return Flight"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600, marginTop: "1px", whiteSpace: "nowrap" }}>
                      {selectedReturnFlightObj ? `Depart ${selectedReturnFlightObj.departureTime || "--:--"} | ₹${new Intl.NumberFormat("en-IN").format(selectedReturnFlightObj.fare)}` : "Not selected"}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tripType === "multicity" && (apiFlights.length > 0 ? apiFlights : parsedMultiCityLegs).map((legItemOrArray, index) => {
              const legArray = Array.isArray(legItemOrArray) ? legItemOrArray : (apiFlights[index] || []);
              const selectedId = selectedMultiCityFlightIds[index];
              const selectedObj = legArray?.find(f => f.id === selectedId) || legArray?.[0];
              const isActive = multiCityActiveTab === index;

              const legInfo = parsedMultiCityLegs[index] || {};
              const displayAirline = selectedObj?.airline || "Select Flight";
              const displaySrc = cityCode(selectedObj?.sourceCode || legInfo.from || legInfo.fromCity || legInfo.source || "SRC");
              const displayDest = cityCode(selectedObj?.destinationCode || legInfo.to || legInfo.toCity || legInfo.destination || "DEST");
              const displayTime = selectedObj?.departureTime || legInfo.date || legInfo.departureDate || "--:--";
              const displayFare = selectedObj?.fare;

              return (
                <div key={`mc-tab-${index}`} style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: isActive ? "rgba(225, 29, 72, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: isActive ? "1.5px solid #e11d48" : "1px solid rgba(255, 255, 255, 0.1)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setMultiCityActiveTab(index);
                    }}
                  >
                    <div style={{ background: isActive ? "#e11d48" : "#334155", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
                      {index + 1}. LEG {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap" }}>
                        {selectedObj ? `${displayAirline} (${displaySrc} → ${displayDest})` : "Select Flight"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600, marginTop: "1px", whiteSpace: "nowrap" }}>
                        {selectedObj ? `Depart ${displayTime} ${displayFare ? `| ₹${new Intl.NumberFormat("en-IN").format(displayFare)}` : ""}` : "Not selected"}
                      </div>
                    </div>
                  </div>
                  {index < (apiFlights.length > 0 ? apiFlights.length : parsedMultiCityLegs.length) - 1 && (
                    <div style={{ width: "1px", height: "30px", background: "#334155", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto", flexShrink: 0 }}>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#94a3b8", display: "block", letterSpacing: "0.5px", fontWeight: 700 }}>
                {tripType === "multicity" ? "TOTAL MULTI-CITY FARE" : "TOTAL ROUNDTRIP FARE"}
              </span>
              <strong style={{ fontSize: "1.25rem", color: "#4ade80", fontWeight: 900, textShadow: "0 2px 10px rgba(74, 222, 128, 0.3)" }}>
                ₹{new Intl.NumberFormat("en-IN").format(combinedFare)}
              </strong>
            </div>

            <button
              type="button"
              style={{
                backgroundColor: "#e11d48",
                color: "#ffffff",
                border: "2px solid #f43f5e",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(225, 29, 72, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                letterSpacing: "0.4px",
                whiteSpace: "nowrap"
              }}
              onClick={() => {
                if (tripType === "multicity") {
                  // Build all legs from current selections + api flights synchronously
                  const firstLegFlight = apiFlights[0]?.find(f => f.id === selectedMultiCityFlightIds[0]) || apiFlights[0]?.[0];
                  if (firstLegFlight) {
                    handleStartBookingJourney(firstLegFlight, null, null, selectedMultiCityFlightIds);
                  }
                } else if (selectedOnwardFlightObj) {
                  handleStartBookingJourney(selectedOnwardFlightObj, selectedOnwardFlightObj.fare, selectedOnwardFlightObj.className);
                }
              }}
            >
              Continue to Traveller Details →
            </button>
          </div>
        </div>
      )}

      {activeBookingFlight && (
        <div className="booking-modal-backdrop" onClick={closeBookingModal}>
          <div
            className="booking-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="booking-modal-header">
              <div>
                <h3>
                  Book {activeBookingFlight.airlineName} (
                  {activeBookingFlight.flightNumber})
                </h3>
                <p>
                  {activeBookingFlight.sourceCode} →{" "}
                  {activeBookingFlight.destinationCode} |{" "}
                  {activeBookingFlight.departDate} at{" "}
                  {activeBookingFlight.departureTime}
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={closeBookingModal}
                aria-label="Close booking modal"
              >
                <X size={14} />
              </button>
            </div>

            <form className="booking-form" onSubmit={handleBookingSubmit}>
              <div className="booking-form-grid">
                <div className="booking-form-group">
                  <span>Passenger Name</span>
                  <input
                    type="text"
                    value={bookingForm.passengerName}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        passengerName: event.target.value,
                      }))
                    }
                    placeholder="Full name"
                  />
                </div>

                <div className="booking-form-group">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={bookingForm.passengerPhone}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        passengerPhone: event.target.value,
                      }))
                    }
                    placeholder="Mobile number"
                  />
                </div>

                <div className="booking-form-group">
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={bookingForm.passengerEmail}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        passengerEmail: event.target.value,
                      }))
                    }
                    placeholder="Email address"
                  />
                </div>

                <div className="booking-form-group">
                  <span>Travel Class</span>
                  <select
                    value={bookingForm.travelClass}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        travelClass: event.target.value,
                      }))
                    }
                  >
                    {activeBookingFlight.supportedTravelClasses.map(
                      (travelClass) => (
                        <option key={travelClass} value={travelClass}>
                          {travelClass}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="booking-form-group small">
                  <span>Adults</span>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={bookingForm.adults}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        adults: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="booking-form-group small">
                  <span>Children</span>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={bookingForm.children}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        children: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="booking-form-group small">
                  <span>Infants</span>
                  <input
                    type="number"
                    min={0}
                    value={bookingForm.infants}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        infants: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {bookingError && (
                <div className="booking-error">
                  <XCircle size={14} />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="booking-submit-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeBookingModal}
                  disabled={isBookingSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isBookingSubmitting}
                >
                  {isBookingSubmitting ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Fare Rules Modal */}
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
            <div className="booking-modal-header" style={{ borderBottom: "1px solid #eee", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Plane size={22} color="#d32f2f" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    {activeFareRuleModal.flight?.airlineName} ({activeFareRuleModal.flight?.flightNumber}) — Fare Rules
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    {activeFareRuleModal.flight?.sourceCode} ➔ {activeFareRuleModal.flight?.destinationCode}
                  </span>
                </div>
              </div>
              <button type="button" className="close-modal-btn" onClick={handleCloseFareRule}>
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
                <div className="booking-error" style={{ padding: "16px", borderRadius: "8px" }}>
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
                    const flight = activeFareRuleModal.flight || {};

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
                              <span>{rule.Airline || flight.airlineName || "Airline Fare Rules"}</span>
                              <span style={{ color: "#d32f2f" }}>{rule.Origin || flight.sourceCode || "Origin"} ➔ {rule.Destination || flight.destinationCode || "Destination"}</span>
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

            <div className="booking-submit-row" style={{ padding: "14px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button type="button" className="primary-btn" onClick={handleCloseFareRule}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <FareCalendarModal
        isOpen={isFareCalendarOpen}
        onClose={() => setIsFareCalendarOpen(false)}
        onSelectDate={(dateYyyyMmDd) => {
          setSelectedDate(parseDateInput(dateYyyyMmDd));
          setSearchVersion((prev) => prev + 1);
        }}
        from={sourceCode}
        to={destinationCode}
        initialDate={formatDateInput(selectedDate)}
        travelClass={cabinClass}
        adults={travellerCounts.adults}
        children={travellerCounts.children}
        infants={travellerCounts.infants}
      />
    </main>
  );
}
