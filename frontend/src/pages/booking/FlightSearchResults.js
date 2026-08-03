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
import { getFareQuote, searchFlights, getFareRule, getCalendarFare } from "../../services/flightBookingService";
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
  bombay: "BOM"
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
      try {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dd = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const counts = getTravellerCounts(travellerText);

        const res = await getCalendarFare({
          from: sourceName,
          to: destinationName,
          date: dateStr,
          travelClass: cabinClass,
          adults: counts.adults,
          children: counts.children,
          infants: counts.infants,
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
        } else {
          const list = Array.isArray(result) ? result : [];
          setApiFlights(list);
          setReturnFlights([]);
          if (list.length > 0) setSelectedOnwardFlightId(list[0].id);
        }
        setExpandedFlightId(null);

        setSelectedClassByFlight((previous) => {
          const next = {};
          const allList = (result && result.isTwoWay) ? [...(result.onward || []), ...(result.return || [])] : (Array.isArray(result) ? result : []);
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
  }, [sourceName, destinationName, selectedDate, selectedReturnDate, tripType, cabinClass, searchVersion]);

  const activeFlightList = useMemo(() => {
    if (tripType === "twoway" && twoWayActiveTab === "return") {
      return returnFlights;
    }
    return apiFlights;
  }, [tripType, twoWayActiveTab, returnFlights, apiFlights]);

  const selectedOnwardFlightObj = useMemo(() => {
    return normalizedOnwardList.find((f) => f.id === selectedOnwardFlightId) || normalizedOnwardList[0] || null;
  }, [normalizedOnwardList, selectedOnwardFlightId]);

  const selectedReturnFlightObj = useMemo(() => {
    return normalizedReturnList.find((f) => f.id === selectedReturnFlightId) || normalizedReturnList[0] || null;
  }, [normalizedReturnList, selectedReturnFlightId]);

  const combinedTwoWayFare = useMemo(() => {
    const onwardFare = selectedOnwardFlightObj ? Number(selectedOnwardFlightObj.fare || 0) : 0;
    const returnFare = selectedReturnFlightObj ? Number(selectedReturnFlightObj.fare || 0) : 0;
    return onwardFare + returnFare;
  }, [selectedOnwardFlightObj, selectedReturnFlightObj]);

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
      return Number(opt?.offeredFare || currentExpandedFlight.fare || 0);
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

  const handleStartBookingJourney = async (flight, selectedPrice = null, selectedClass = null) => {
    setBookingError("");
    setBookingSuccess("");
    const bookingTravellerCounts = getTravellerCounts(travellerText);
    const seatRequired = Math.max(
      1,
      bookingTravellerCounts.adults + bookingTravellerCounts.children
    );

    const traceId = flight.traceId || flight.TraceId || sessionStorage.getItem("TraceId") || "";
    const resultIndex = flight.resultIndex || flight.ResultIndex || flight.id || "";
    const isLcc = Boolean(flight.isLcc || flight.IsLCC);
    const srdvType = flight.srdvType || flight.SrdvType || "MixAPI";
    const srdvIndex = flight.srdvIndex || flight.SrdvIndex || "2";

    if (!traceId || !resultIndex) {
      setBookingError("Invalid flight selection. TraceId or ResultIndex is missing.");
      return;
    }

    setIsLoadingFlights(true); // Reuse loading state for quote
    try {
      // 1. Trigger FareQuote strictly before navigating
      const fareQuoteResponse = await getFareQuote({
        traceId,
        resultIndex,
        srdvType,
        srdvIndex
      });

      if (!fareQuoteResponse?.success) {
        setBookingError(fareQuoteResponse?.error || "Fare quote unavailable. Please try another flight.");
        setIsLoadingFlights(false);
        return;
      }

      const res = fareQuoteResponse.results || fareQuoteResponse.Results || fareQuoteResponse.Fare || fareQuoteResponse.fare || {};
      const fData = res.Fare || res.fare || {};

      const basePrice = Number(fData.BaseFare || selectedPrice || flight.fare || flight.price || 0);
      const tax = Number(fData.Tax || 0);
      const combinedPrice = basePrice + tax;
      const resolvedClass = selectedClass !== null ? selectedClass : (flight ? (flight.className || flight.cabinClass || "Economy") : "Economy");

      const flowPayload = {
        flight: {
          ...flight,
          fare: combinedPrice,
          price: combinedPrice,
          priceInr: combinedPrice,
          selectedTravelClassPriceInr: combinedPrice,
          className: resolvedClass,
        },
        returnFlight: null,
        isTwoWay: false,
        searchContext: {
          source: sourceName,
          destination: destinationName,
          tripType,
          departureDate: formatDateInput(selectedDate),
          returnDate: undefined,
          travellers: travellerText,
          cabinClass: resolvedClass || cabinClass,
        },
        selectedSeatLabels: [],
        selectedSeats: [],
        mealPreference: "standard",
        baggagePlan: "20kg",
        fareSummary: (() => {
          let markupValue = 0;
          const rawMarkup = localStorage.getItem("b2b_markup_settings");
          if (rawMarkup) {
            try {
              const parsedMarkup = JSON.parse(rawMarkup);
              if (parsedMarkup.flightType === "percentage") {
                markupValue = (Number(combinedPrice || 0) * seatRequired) * (Number(parsedMarkup.flightValue) / 100);
              } else if (parsedMarkup.flightType === "fixed") {
                markupValue = Number(parsedMarkup.flightValue) * seatRequired;
              }
            } catch (e) {
              console.error("Error reading B2B flight markup", e);
            }
          }

          const isAgent = localStorage.getItem("b2b_role") === "Agent" && !localStorage.getItem("token");
          const totalFareBase = (basePrice + tax) * seatRequired;
          const displayTotal = isAgent ? (totalFareBase + markupValue) : (totalFareBase + markupValue);

          return {
            baseFare: basePrice * seatRequired,
            tax: tax * seatRequired,
            seatSurcharge: 0,
            mealFee: 0,
            baggageFee: 0,
            convenienceFee: 0,
            markup: markupValue,
            tierDiscount: 0,
            volumeDiscount: 0,
            totalFare: displayTotal,
          };
        })(),
      };

      try {
        sessionStorage.setItem("SelectedFlight", JSON.stringify({
          TraceId: traceId,
          ResultIndex: resultIndex,
          IsLCC: isLcc
        }));
      } catch (e) {}

      clearFlightBookingFlowState();
      writeFlightBookingFlowState(flowPayload);
      setIsLoadingFlights(false);
      navigate("/flight/passenger-details", { state: flowPayload });

    } catch (err) {
      console.error("Fare Quote failed:", err);
      setBookingError("Failed to fetch live fare quote. Please try again.");
      setIsLoadingFlights(false);
    }
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

      // The legacy modal booking is disabled. Modern flow uses handleStartBookingJourney.
      throw new Error("This offline booking form is deprecated.");

      setBookingSuccess(`Flight booked successfully.`);
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
              <h2>{sourceCode}</h2>
              <p>{sourceName}</p>
            </article>
            <article className="route-block">
              <h2>{destinationCode}</h2>
              <p>{destinationName}</p>
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
                    className={`fare-date-card ${
                      item.date.toDateString() === selectedDate.toDateString()
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

            {tripType === "twoway" && (
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
                    ₹{new Intl.NumberFormat("en-IN").format(combinedTwoWayFare)}
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
                                        if (tripType === "twoway") {
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
                                          {opt.source || "Fare Option"}
                                        </span>
                                        <div className="fare-column-price">
                                          ₹{new Intl.NumberFormat("en-IN").format(opt.offeredFare)}
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
                                      fare: chosenOpt.offeredFare,
                                      price: chosenOpt.offeredFare,
                                      source: chosenOpt.source,
                                    };
                                    chosenPrice = chosenOpt.offeredFare;
                                    chosenClass = `${flight.airlineName} (${chosenOpt.source})`;
                                  }
                                } else {
                                  chosenClass = selectedFareType === "saver" ? "Economy (Saver)" :
                                    selectedFareType === "flexi" ? "Economy (Flexi Plus)" :
                                      `${flight.airlineName} UpFront`;
                                }

                                if (tripType === "twoway") {
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
                                } else {
                                  handleStartBookingJourney(targetFlight, chosenPrice, chosenClass);
                                }
                              }}
                            >
                              {tripType === "twoway" && twoWayActiveTab === "onward" ? "Select Return Flight ➔" : "Next"}
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

      {tripType === "twoway" && (selectedOnwardFlightObj || selectedReturnFlightObj) && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#090d16",
          color: "#ffffff",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 9999,
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.45)",
          borderTop: "3px solid #e11d48",
          backdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            {/* Onward summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: twoWayActiveTab === "onward" ? "rgba(225, 29, 72, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: twoWayActiveTab === "onward" ? "1.5px solid #e11d48" : "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer"
              }}
              onClick={() => setTwoWayActiveTab("onward")}
            >
              <div style={{ background: "#e11d48", color: "#ffffff", padding: "5px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                1. ONWARD
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>
                  {selectedOnwardFlightObj ? `${selectedOnwardFlightObj.airline} (${selectedOnwardFlightObj.sourceCode || sourceName} ➔ ${selectedOnwardFlightObj.destinationCode || destinationName})` : "Select Onward Flight"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600 }}>
                  {selectedOnwardFlightObj ? `Depart ${selectedOnwardFlightObj.departureTime || "--:--"} • ₹${new Intl.NumberFormat("en-IN").format(selectedOnwardFlightObj.fare)}` : "Not selected"}
                </div>
              </div>
            </div>

            <div style={{ width: "2px", height: "36px", background: "#334155" }} />

            {/* Return summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: twoWayActiveTab === "return" ? "rgba(220, 30, 38, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: twoWayActiveTab === "return" ? "1.5px solid #dc1e26" : "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer"
              }}
              onClick={() => setTwoWayActiveTab("return")}
            >
              <div style={{ background: "#dc1e26", color: "#ffffff", padding: "5px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                2. RETURN
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>
                  {selectedReturnFlightObj ? `${selectedReturnFlightObj.airline} (${selectedReturnFlightObj.sourceCode || destinationName} ➔ ${selectedReturnFlightObj.destinationCode || sourceName})` : "Select Return Flight"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600 }}>
                  {selectedReturnFlightObj ? `Depart ${selectedReturnFlightObj.departureTime || "--:--"} • ₹${new Intl.NumberFormat("en-IN").format(selectedReturnFlightObj.fare)}` : "Not selected"}
                </div>
              </div>
            </div>
          </div>

          {/* Combined Total & Action */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", display: "block", letterSpacing: "0.6px", fontWeight: 700 }}>
                TOTAL ROUNDTRIP FARE
              </span>
              <strong style={{ fontSize: "1.6rem", color: "#4ade80", fontWeight: 900, textShadow: "0 2px 10px rgba(74, 222, 128, 0.3)" }}>
                ₹{new Intl.NumberFormat("en-IN").format(combinedTwoWayFare)}
              </strong>
            </div>

            <button
              type="button"
              style={{
                backgroundColor: "#e11d48",
                color: "#ffffff",
                border: "2px solid #f43f5e",
                borderRadius: "10px",
                padding: "14px 32px",
                fontSize: "1.08rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(225, 29, 72, 0.5)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                letterSpacing: "0.4px"
              }}
              onClick={() => {
                if (selectedOnwardFlightObj) {
                  handleStartBookingJourney(selectedOnwardFlightObj, selectedOnwardFlightObj.fare, selectedOnwardFlightObj.className);
                }
              }}
            >
              Continue to Traveller Details ➔
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
                    const isRefundable = activeFareRuleModal.flight?.isRefundable ?? true;
                    const flight = activeFareRuleModal.flight || {};

                    if (Array.isArray(rules) && rules.length > 0) {
                      return rules.map((rule, idx) => (
                        <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
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
                              Check-in: {flight.checkInBaggage || "15 Kg"}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "4px" }}>
                              Cabin Baggage: {flight.cabinBaggage || "7 Kg"}
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
