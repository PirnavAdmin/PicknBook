import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowRight,
  Activity,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  IndianRupee,
  LineChart,
  Loader2,
  MapPin,
  Minus,
  Moon,
  Plane,
  PlaneTakeoff,
  Plus,
  Search,
  Sun,
  Sunrise,
  Sunset,
  Users,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
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
import { searchFlights, getFareRule } from "../../services/flightBookingService";
import { supplierBoolean } from "../../utils/flightContract";

import FareCalendarModal from "../../components/FareCalendarModal";
import FlightLoadingScreen from "../../components/FlightLoadingScreen";
import PlaceAutocomplete from "../../components/PlaceAutocomplete";
import CustomDatePicker from "../../components/CustomDatePicker";
import "../../STYLES/FlightSearchResults.css";
import { toDisplayDate, toYyyyMmDd } from "../../utils/apiDateFormat";
import { writeFlightBookingFlowState, clearFlightBookingFlowState } from "./flightBookingFlowStore";

function formatFlightPillDate(dateStr) {
  if (!dateStr) return { date: "Select Date", day: "DATE OF TRAVEL" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, day: "DATE OF TRAVEL" };
  const dateFormatted = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  return { date: dateFormatted, day: dayName };
}

function isDayTime(timeStr) {
  if (!timeStr) return true;
  const hr = parseInt(timeStr.split(":")[0], 10);
  return hr >= 5 && hr < 18;
}

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

function cityCode(name, fallback) {
  if (!name) return fallback || "";
  const cleanInput = String(name).trim().toLowerCase();

  const bracketMatch = cleanInput.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1].trim().length === 3) {
    return bracketMatch[1].trim().toUpperCase();
  }

  if (cleanInput.length === 3) {
    return cleanInput.toUpperCase();
  }

  return fallback || "";
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

  return null;
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
  return city || c;
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

export default function FlightSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const state = location.state || {};

  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const initialSourceName = readValue(params, state, "source");
  const initialDestinationName = readValue(params, state, "destination");
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

  const [showTravellersDropdown, setShowTravellersDropdown] = useState(false);
  const travellersRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (travellersRef.current && !travellersRef.current.contains(e.target)) {
        setShowTravellersDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const currentTravellerCounts = useMemo(() => {
    return getTravellerCounts(modifyForm.travellers || "1 Adult");
  }, [modifyForm.travellers]);

  const updateTravellerCount = (type, delta) => {
    const counts = { ...currentTravellerCounts };
    if (type === "adults") {
      counts.adults = Math.max(1, counts.adults + delta);
    } else if (type === "children") {
      counts.children = Math.max(0, counts.children + delta);
    } else if (type === "infants") {
      counts.infants = Math.max(0, Math.min(counts.adults, counts.infants + delta));
    }
    const parts = [];
    parts.push(`${counts.adults} Adult${counts.adults > 1 ? 's' : ''}`);
    if (counts.children > 0) parts.push(`${counts.children} Child${counts.children > 1 ? 'ren' : ''}`);
    if (counts.infants > 0) parts.push(`${counts.infants} Infant${counts.infants > 1 ? 's' : ''}`);
    setModifyForm((prev) => ({ ...prev, travellers: parts.join(", ") }));
  };

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

  // useRef to synchronously hold the latest selected flights — avoids React's async
  // state-batching bug where setSelectedReturnFlightId() + handleStartBookingJourney()
  // would read stale state for the return flight id.
  const latestSelectedOnwardFlightRef = useRef(null);
  const latestSelectedReturnFlightRef = useRef(null);

  // Multicity state
  const [multiCityActiveTab, setMultiCityActiveTab] = useState(0);
  const [selectedMultiCityFlightIds, setSelectedMultiCityFlightIds] = useState({});

  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const [selectedClassByFlight, setSelectedClassByFlight] = useState({});
  const [selectedFareTypeByFlight, setSelectedFareTypeByFlight] = useState({});
  const [selectedFareOptionIndexByFlight, setSelectedFareOptionIndexByFlight] = useState({});
  const latestFareOptionIndexRef = useRef({});

  const handleSelectFareOption = (flightId, idx) => {
    latestFareOptionIndexRef.current[flightId] = idx;
    setSelectedFareOptionIndexByFlight(prev => ({ ...prev, [flightId]: idx }));
  };
  const [activeFareSelectionModal, setActiveFareSelectionModal] = useState({ isOpen: false, flight: null });
  const [selectedFareType, setSelectedFareType] = useState("saver");

  const [isFareCalendarOpen, setIsFareCalendarOpen] = useState(false);


  const getFareMultiplier = (type) => {
    return 1.0;
  };

  const sourceCode = cityCode(sourceName, "");
  const destinationCode = cityCode(destinationName, "");

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
      displaySourceCode = cityCode(sRaw, "");
      displayDestinationCode = cityCode(dRaw, "");
    }
    if (apiFlights && apiFlights[multiCityActiveTab] && apiFlights[multiCityActiveTab].length > 0) {
      const firstApiLeg = apiFlights[multiCityActiveTab][0];
      displaySourceCode = firstApiLeg.sourceCode || displaySourceCode;
      displayDestinationCode = firstApiLeg.destinationCode || displayDestinationCode;
      displaySourceName = firstApiLeg.sourceName || firstApiLeg.fromCity || displaySourceName;
      displayDestinationName = firstApiLeg.destinationName || firstApiLeg.toCity || displayDestinationName;
    }
  }

  const normalizedOnwardList = useMemo(() => {
    return apiFlights.map((flight) => {
      const classOptions = normalizeClassOptions(flight);
      if (!flight.traceId || !flight.resultIndex || !flight.srdvType || !flight.srdvIndex || classOptions.length === 0) return null;
      const selectedClass =
        selectedClassByFlight[flight.id] ||
        flight.selectedTravelClass ||
        classOptions[0]?.travelClass ||
        cabinClass;

      const resolvedClassOptions = classOptions;
      const selectedClassOption = resolvedClassOptions.find((o) => o.travelClass === selectedClass) || resolvedClassOptions[0];
      const departureIst = parseTimeValue(flight.departureTimeIst);

      const baseFarePrice = Number(selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? flight.fare ?? 0);
      const fareType = selectedFareTypeByFlight[flight.id] || "saver";
      const finalPrice = Math.round(baseFarePrice * getFareMultiplier(fareType));

      return {
        ...flight,
        airline: flight.airline || "",
        airlineName: flight.airline || "",
        flightNumber: flight.flightNumber || "",
        sourceCode: cityCode(flight.fromCity || sourceName, sourceCode),
        destinationCode: cityCode(flight.toCity || destinationName, destinationCode),
        departureTime: formatTime(departureIst) || "",
        fare: finalPrice,
        baseFarePrice,
        fareType,
        className: selectedClass
      };
    }).filter(Boolean);
  }, [apiFlights, selectedClassByFlight, selectedFareTypeByFlight, cabinClass, sourceName, destinationName, sourceCode, destinationCode]);

  const normalizedReturnList = useMemo(() => {
    return returnFlights.map((flight) => {
      const classOptions = normalizeClassOptions(flight);
      if (!flight.traceId || !flight.resultIndex || !flight.srdvType || !flight.srdvIndex || classOptions.length === 0) return null;
      const selectedClass =
        selectedClassByFlight[flight.id] ||
        flight.selectedTravelClass ||
        classOptions[0]?.travelClass ||
        cabinClass;

      const resolvedClassOptions = classOptions;
      const selectedClassOption = resolvedClassOptions.find((o) => o.travelClass === selectedClass) || resolvedClassOptions[0];
      const departureIst = parseTimeValue(flight.departureTimeIst);

      const baseFarePrice = Number(selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? flight.fare ?? 0);
      const fareType = selectedFareTypeByFlight[flight.id] || "saver";
      const finalPrice = Math.round(baseFarePrice * getFareMultiplier(fareType));

      return {
        ...flight,
        airline: flight.airline || "",
        airlineName: flight.airline || "",
        flightNumber: flight.flightNumber || "",
        sourceCode: cityCode(flight.fromCity || destinationName, destinationCode),
        destinationCode: cityCode(flight.toCity || sourceName, sourceCode),
        departureTime: formatTime(departureIst) || "",
        fare: finalPrice,
        baseFarePrice,
        fareType,
        className: selectedClass
      };
    }).filter(Boolean);
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
        resultIndex: flightObj.resultIndex,
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

  const [activeFareDetailsModal, setActiveFareDetailsModal] = useState({ isOpen: false, flight: null });
  const handleOpenFareDetails = (flightObj) => {
    setActiveFareDetailsModal({ isOpen: true, flight: flightObj });
  };
  const handleCloseFareDetails = () => {
    setActiveFareDetailsModal({ isOpen: false, flight: null });
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
  const [sortBy, setSortBy] = useState("price");
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

      try {
        if (!sourceName.trim() || !destinationName.trim() || !formatDateInput(selectedDate)) {
          setApiFlights([]);
          setSearchError("Origin, destination and travel date are required.");
          return;
        }
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
        if (typeof legsParam === "string") {
          try { legsParam = JSON.parse(legsParam); } catch (e) { }
        }

        if (Array.isArray(legsParam)) {
          legsParam = legsParam.map((leg) => ({
            ...leg,
            fromCode: leg.fromCode || cityCode(leg.from || "", ""),
            toCode: leg.toCode || cityCode(leg.to || "", "")
          }));
        }

        const result = await searchFlights({
          from: sourceName.trim(),
          to: destinationName.trim(),
          fromCode: cityCode(sourceName, ""),
          toCode: cityCode(destinationName, ""),
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
        setActiveFareSelectionModal({ isOpen: false, flight: null });

        setSelectedClassByFlight((previous) => {
          const next = {};
          const allList = (result && result.isTwoWay) ? [...(result.onward || []), ...(result.return || [])] :
            (result && result.isMultiCity) ? (Array.isArray(result.legs) ? result.legs.flat() : []) :
              (Array.isArray(result) ? result : []);
          allList.forEach((flight) => {
            const classOptions = normalizeClassOptions(flight);
            const resolvedClass =
              previous[flight.id] ||
              flight.selectedTravelClass ||
              cabinClass ||
              classOptions[0]?.travelClass ||
              "";
            next[flight.id] = resolvedClass;
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

  const resolveFlightFareOption = useCallback((baseFlight) => {
    if (!baseFlight) return null;
    if (Array.isArray(baseFlight.fareOptions) && baseFlight.fareOptions.length > 0) {
      const optIdx = latestFareOptionIndexRef.current[baseFlight.id] ?? selectedFareOptionIndexByFlight[baseFlight.id] ?? 0;
      const chosenOpt = baseFlight.fareOptions[optIdx] || baseFlight.fareOptions[0];
      if (chosenOpt) {
        return {
          ...baseFlight,
          resultIndex: chosenOpt.resultIndex || baseFlight.resultIndex,
          ResultIndex: chosenOpt.ResultIndex || chosenOpt.resultIndex,
          srdvIndex: chosenOpt.srdvIndex || baseFlight.srdvIndex,
          Fare: chosenOpt.fare,
          FareBreakdown: chosenOpt.fareBreakdown,
          isLCC: chosenOpt.isLcc,
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
          className: chosenOpt.className || baseFlight.className || "",
        };
      }
    }
    return baseFlight;
  }, [selectedFareOptionIndexByFlight]);

  const selectedOnwardFlightObj = useMemo(() => {
    const raw = normalizedOnwardList.find((f) => f.id === selectedOnwardFlightId) || normalizedOnwardList[0] || null;
    return resolveFlightFareOption(raw);
  }, [normalizedOnwardList, selectedOnwardFlightId, resolveFlightFareOption]);

  const selectedReturnFlightObj = useMemo(() => {
    const raw = normalizedReturnList.find((f) => f.id === selectedReturnFlightId) || normalizedReturnList[0] || null;
    return resolveFlightFareOption(raw);
  }, [normalizedReturnList, selectedReturnFlightId, resolveFlightFareOption]);

  const combinedFare = useMemo(() => {
    if (tripType === "multicity") {
      let total = 0;
      apiFlights.forEach((legArray, index) => {
        const selectedId = selectedMultiCityFlightIds[index];
        const selectedObj = legArray?.find(f => f.id === selectedId) || legArray?.[0];
        const resolvedObj = resolveFlightFareOption(selectedObj);
        if (resolvedObj) total += Number(resolvedObj.fare || 0);
      });
      return total;
    }
    const onwardFare = selectedOnwardFlightObj ? Number(selectedOnwardFlightObj.fare || 0) : 0;
    const returnFare = selectedReturnFlightObj ? Number(selectedReturnFlightObj.fare || 0) : 0;
    return onwardFare + returnFare;
  }, [tripType, apiFlights, selectedMultiCityFlightIds, selectedOnwardFlightObj, selectedReturnFlightObj, resolveFlightFareOption]);

  const flights = useMemo(
    () =>
      activeFlightList.map((flight) => {
        const classOptions = normalizeClassOptions(flight);
        const selectedClass =
          selectedClassByFlight[flight.id] ||
          flight.selectedTravelClass ||
          classOptions[0]?.travelClass ||
          cabinClass;

        if (flight.isLcc !== true || !flight.traceId || !flight.resultIndex || !flight.srdvType || !flight.srdvIndex || classOptions.length === 0) return null;
        const resolvedClassOptions = classOptions;

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
          resultIndex: flight.resultIndex,
          airlineName: flight.airline || "",
          logo: resolveAirlineLogo(flight.airline),
          flightNumber: flight.flightNumber || "",
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
          isRefundable: supplierBoolean(flight.isRefundable),
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
          srdvType: flight.srdvType,
          srdvIndex: flight.srdvIndex,
          isLcc: Boolean(flight.isLcc),
          checkedBagsWeight: flight.checkedBagsWeight,
          checkedBagsUnit: flight.checkedBagsUnit,
          cabinBagsWeight: flight.cabinBagsWeight,
          cabinBagsUnit: flight.cabinBagsUnit,
          fareOptions: Array.isArray(flight.fareOptions) ? flight.fareOptions : [],
          fullMultiSectorSegments: Array.isArray(flight.fullMultiSectorSegments) ? flight.fullMultiSectorSegments : [],
        };
      }).filter(Boolean),
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

        // 1. Departure Window Filter
        const hasAnyDepartureFilter = Object.values(departureWindows).some(Boolean);
        if (hasAnyDepartureFilter) {
          const matchesWindow = DEPARTURE_WINDOWS.some((window) => {
            return departureWindows[window.key] && hourInWindow(flight.departureHour, window);
          });
          if (!matchesWindow) return false;
        }

        // 2. Fare Type Filter
        const hasAnyFareTypeFilter = Object.values(fareTypeFilters).some(Boolean);
        if (hasAnyFareTypeFilter) {
          const fareTypeKey = flight.isRefundable ? "refundable" : "nonRefundable";
          if (!fareTypeFilters[fareTypeKey]) return false;
        }

        // 3. Stops Filter
        const hasAnyStopFilter = Object.values(stopFilters).some(Boolean);
        if (hasAnyStopFilter) {
          const stopKey = flight.stops > 0 ? "oneStop" : "nonStop";
          if (!stopFilters[stopKey]) return false;
        }

        // 4. Airlines Filter
        const hasAnyAirlineFilter = Object.values(airlineFilters).some(Boolean);
        if (hasAnyAirlineFilter) {
          if (!airlineFilters[flight.airlineName]) return false;
        }

        return true;
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

      if (sortBy === "departure") {
        return a.departureHour - b.departureHour || a.fare - b.fare;
      }

      if (sortBy === "arrival") {
        const arrHourA = parseTimeValue(a.arrivalTimeIst)?.getHours() || 0;
        const arrHourB = parseTimeValue(b.arrivalTimeIst)?.getHours() || 0;
        return arrHourA - arrHourB || a.fare - b.fare;
      }

      if (sortBy === "duration") {
        return a.durationMinutes - b.durationMinutes || a.fare - b.fare;
      }

      if (sortBy === "airline") {
        return a.airlineName.localeCompare(b.airlineName) || a.fare - b.fare;
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
    return activeFareSelectionModal.flight || null;
  }, [activeFareSelectionModal.flight]);

  const selectedFarePrice = useMemo(() => {
    if (!currentExpandedFlight) return 0;
    if (Array.isArray(currentExpandedFlight.fareOptions) && currentExpandedFlight.fareOptions.length > 0) {
      const optIdx = selectedFareOptionIndexByFlight[currentExpandedFlight.id] ?? 0;
      const opt = currentExpandedFlight.fareOptions[optIdx] || currentExpandedFlight.fareOptions[0];
      return Number(opt?.b2cFinalFare || opt?.b2cPublishedFare || opt?.offeredFare || currentExpandedFlight.fare || 0);
    }
    return Number(currentExpandedFlight.fare || 0);
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



  const handleOpenFareSelection = (flightObj) => {
    setActiveFareSelectionModal({ isOpen: true, flight: flightObj });
    setSelectedFareType(selectedFareTypeByFlight[flightObj.id] || "saver");
  };

  const handleCloseFareSelection = () => {
    setActiveFareSelectionModal({ isOpen: false, flight: null });
  };

  const handleFinalizeFlightSelection = (flight) => {
    let targetFlight = flight;
    let chosenPrice = flight.fare;
    let chosenClass = flight.className || "";

    if (Array.isArray(flight.fareOptions) && flight.fareOptions.length > 0) {
      const optIdx = latestFareOptionIndexRef.current[flight.id] ?? selectedFareOptionIndexByFlight[flight.id] ?? 0;
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
    }

    if (tripType === "twoway" && returnFlights.length > 0) {
      if (twoWayActiveTab === "onward") {
        // Store onward flight in ref for synchronous access later
        latestSelectedOnwardFlightRef.current = targetFlight;
        setSelectedOnwardFlightId(targetFlight.id);
        setTwoWayActiveTab("return");
        setTimeout(() => {
          const el = document.getElementById("two-way-tabs-strip");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        // FIX: Store return flight in ref BEFORE calling handleStartBookingJourney.
        // React's state updates are async — setSelectedReturnFlightId() won't have
        // updated by the time handleStartBookingJourney runs, so we pass the flight
        // directly via ref to avoid using stale state.
        latestSelectedReturnFlightRef.current = targetFlight;
        setSelectedReturnFlightId(targetFlight.id);

        // Use latestSelectedOnwardFlightRef (sync) as the source of truth for onward
        const onwardFlight = latestSelectedOnwardFlightRef.current || selectedOnwardFlightObj;
        if (onwardFlight) {
          handleStartBookingJourney(
            onwardFlight,
            onwardFlight.fare,
            onwardFlight.className,
            null,
            targetFlight // returnFlightOverride — passed synchronously, bypasses stale state
          );
        }
      }
    } else if (tripType === "multicity") {
      const updatedSelections = { ...selectedMultiCityFlightIds, [multiCityActiveTab]: targetFlight.id };
      setSelectedMultiCityFlightIds(updatedSelections);
      if (multiCityActiveTab < apiFlights.length - 1) {
        setMultiCityActiveTab(prev => prev + 1);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } else {
        const firstLegFlight = apiFlights[0]?.find(f => f.id === updatedSelections[0]) || apiFlights[0]?.[0];
        if (firstLegFlight) {
          handleStartBookingJourney(firstLegFlight, null, null, updatedSelections);
        }
      }
    } else {
      handleStartBookingJourney(targetFlight, chosenPrice, chosenClass);
    }
  };




  // returnFlightOverride: when provided, skips reading stale selectedReturnFlightId state.
  // This is the production-safe approach: pass the just-clicked return flight object
  // directly rather than relying on React state that may not have flushed yet.
  const handleStartBookingJourney = (
    flight,
    selectedPrice = null,
    selectedClass = null,
    explicitMultiCitySelections = null,
    returnFlightOverride = null
  ) => {

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
        const rawResultIndex = resolvedObj.legResultIndex || resolvedObj.resultIndex || resolvedObj.ResultIndex || "";
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
          resultIndex: onwardFlight.resultIndex || onwardFlight.ResultIndex || "",
          ResultIndex: onwardFlight.ResultIndex || onwardFlight.resultIndex || "",
        });
      }

      if (tripType === "twoway") {
        // Priority: use returnFlightOverride (synchronous, freshly clicked) >
        //           latestSelectedReturnFlightRef (sync ref) >
        //           find by selectedReturnFlightId in returnFlights (may be stale) >
        //           fallback to returnFlights[0]
        const rawReturnObj =
          returnFlightOverride ||
          latestSelectedReturnFlightRef.current ||
          (returnFlights.length > 0
            ? (returnFlights.find(f => f.id === selectedReturnFlightId) || returnFlights[0])
            : null);
        if (rawReturnObj) {
          const returnFlightObj = resolveFlightFareOption(rawReturnObj);
          allSelectedLegs.push({
            ...returnFlightObj,
            resultIndex: returnFlightObj.resultIndex || returnFlightObj.ResultIndex || "",
            ResultIndex: returnFlightObj.ResultIndex || returnFlightObj.resultIndex || "",
          });
        }
      }
    }

    if (!allSelectedLegs.length || allSelectedLegs.some((leg) => !leg.traceId || !leg.resultIndex || !leg.srdvType || !leg.srdvIndex)) {
      setBookingError("The selected flight is missing a live supplier reference. Please select another result.");
      return;
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
        className: selectedClass || onwardFlightObj.className || "",
      } : {},
      returnFlight: returnFlightObj ? {
        ...returnFlightObj,
        className: returnFlightObj.className || "",
      } : null,
      isTwoWay: tripType === "twoway" && allSelectedLegs.length > 1,
      isMultiCity: tripType === "multicity",
      selectedLegs: allSelectedLegs,
      resultIndex: allSelectedLegs.map(l => l.resultIndex || l.ResultIndex).filter(Boolean).join(","),
      ResultIndex: allSelectedLegs.map(l => l.resultIndex || l.ResultIndex).filter(Boolean).join(","),
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
      mealPreference: "none",
      baggagePlan: "none",
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
      const combinedResultIndex = allSelectedLegs.map(l => l.resultIndex || l.ResultIndex).filter(Boolean).join(",");
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
      const rawResultIndex = selectedObj.legResultIndex || selectedObj.resultIndex || selectedObj.ResultIndex || "";
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
      mealPreference: "none",
      baggagePlan: "none",
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
      const combinedResultIndex = allSelectedLegs.map(l => l.resultIndex || l.ResultIndex).filter(Boolean).join(",");
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
      handleStartBookingJourney(activeBookingFlight);
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
        <section className="flight-search-hero">
          <div className="flight-hero-wallpaper-overlay" />
          <div className="flight-hero-content-wrapper">
            <div className="flight-hero-top-row">
              <div className="flight-trip-types">
                <button
                  type="button"
                  className={`flight-trip-chip ${modifyForm.tripType !== "twoway" ? "active" : ""}`}
                  onClick={() => setModifyForm((prev) => ({ ...prev, tripType: "oneway" }))}
                >
                  One Way
                </button>
                <button
                  type="button"
                  className={`flight-trip-chip ${modifyForm.tripType === "twoway" ? "active" : ""}`}
                  onClick={() => setModifyForm((prev) => ({ ...prev, tripType: "twoway" }))}
                >
                  Two Way
                </button>
              </div>


            </div>

            <form
              className="flight-discover-searchbar"
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyModifySearch();
              }}
            >
              {/* FROM FIELD */}
              <div className="flight-discover-searchcell" style={{ flex: '1.2 1 auto' }}>
                <PlaceAutocomplete
                  label="FROM"
                  sublabel="ORIGIN AIRPORT"
                  value={modifyForm.source}
                  onChange={(nextValue) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      source: nextValue,
                    }))
                  }
                  tripType="flight"
                  field="source"
                  placeholder="Enter source city"
                  isInline={true}
                />
              </div>

              {/* SWAP BUTTON */}
              <button
                type="button"
                className="flight-discover-swap"
                onClick={handleSwapModifyCities}
                aria-label="Swap source and destination"
              >
                <ArrowLeftRight size={16} />
              </button>

              {/* TO FIELD */}
              <div className="flight-discover-searchcell with-divider" style={{ flex: '1.2 1 auto' }}>
                <PlaceAutocomplete
                  label="TO"
                  sublabel="DESTINATION AIRPORT"
                  value={modifyForm.destination}
                  onChange={(nextValue) =>
                    setModifyForm((previous) => ({
                      ...previous,
                      destination: nextValue,
                    }))
                  }
                  tripType="flight"
                  field="destination"
                  placeholder="Enter destination city"
                  isInline={true}
                />
              </div>

              {/* TIMELINE / DEPARTURE (+ RETURN) FIELD */}
              <div className="flight-discover-searchcell with-divider" style={{ flex: '1.2 1 auto', cursor: 'pointer', position: 'relative' }}
                onClick={() => setActiveDatePicker("flight-discover-dep-date")}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    TIMELINE
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarRange size={14} color="#000000" style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{ cursor: "pointer", color: '#000000', fontWeight: 400, fontSize: '13px', whiteSpace: 'nowrap', display: 'inline-block' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDatePicker("flight-discover-dep-date");
                        }}
                      >
                        {formatFlightPillDate(modifyForm.departureDate).date}
                      </span>
                      {modifyForm.tripType === "twoway" && (
                        <>
                          <span style={{ color: '#000000', fontWeight: 700 }}>-</span>
                          <span
                            style={{ cursor: "pointer", color: '#000000', fontWeight: 400, fontSize: '13px', whiteSpace: 'nowrap', display: 'inline-block' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDatePicker("flight-discover-ret-date");
                            }}
                          >
                            {formatFlightPillDate(modifyForm.returnDate).date}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {modifyForm.tripType === "twoway" ? "ROUND TRIP" : formatFlightPillDate(modifyForm.departureDate).day}
                  </span>
                  <CustomDatePicker
                    isOpen={activeDatePicker === "flight-discover-dep-date"}
                    onClose={() => setActiveDatePicker(null)}
                    value={modifyForm.departureDate}
                    onChange={(val) => {
                      setModifyForm((previous) => ({
                        ...previous,
                        departureDate: val,
                      }));
                      setActiveDatePicker(null);
                    }}
                  />
                  {modifyForm.tripType === "twoway" && (
                    <CustomDatePicker
                      isOpen={activeDatePicker === "flight-discover-ret-date"}
                      onClose={() => setActiveDatePicker(null)}
                      value={modifyForm.returnDate}
                      minDate={modifyForm.departureDate}
                      onChange={(val) => {
                        setModifyForm((previous) => ({
                          ...previous,
                          returnDate: val,
                        }));
                        setActiveDatePicker(null);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* TRAVELLERS & CABIN CLASS FIELD */}
              <div
                className="flight-discover-searchcell with-divider"
                ref={travellersRef}
                style={{ flex: '1.1 1 auto', cursor: 'pointer' }}
                onClick={() => setShowTravellersDropdown((prev) => !prev)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    TRAVELLERS &amp; CLASS
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#000000" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 400, color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentTravellerCounts.adults + currentTravellerCounts.children + currentTravellerCounts.infants} Traveller{(currentTravellerCounts.adults + currentTravellerCounts.children + currentTravellerCounts.infants) > 1 ? 's' : ''}, {modifyForm.cabinClass || "Economy"}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    CABIN &amp; SEATS
                  </span>
                </div>

                {showTravellersDropdown && (
                  <div
                    className="flight-travellers-popover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flight-counter-row">
                      <div className="flight-counter-label">
                        <strong>Adults</strong>
                        <span>12+ years</span>
                      </div>
                      <div className="flight-counter-actions">
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("adults", -1)}
                          disabled={currentTravellerCounts.adults <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{currentTravellerCounts.adults}</span>
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("adults", 1)}
                          disabled={currentTravellerCounts.adults >= 9}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flight-counter-row">
                      <div className="flight-counter-label">
                        <strong>Children</strong>
                        <span>2 - 11 years</span>
                      </div>
                      <div className="flight-counter-actions">
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("children", -1)}
                          disabled={currentTravellerCounts.children <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{currentTravellerCounts.children}</span>
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("children", 1)}
                          disabled={currentTravellerCounts.children >= 8}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flight-counter-row">
                      <div className="flight-counter-label">
                        <strong>Infants</strong>
                        <span>Under 2 years</span>
                      </div>
                      <div className="flight-counter-actions">
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("infants", -1)}
                          disabled={currentTravellerCounts.infants <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{currentTravellerCounts.infants}</span>
                        <button
                          type="button"
                          onClick={() => updateTravellerCount("infants", 1)}
                          disabled={currentTravellerCounts.infants >= currentTravellerCounts.adults}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flight-class-select-row">
                      <label>Cabin Class</label>
                      <select
                        value={modifyForm.cabinClass}
                        onChange={(e) => setModifyForm((prev) => ({ ...prev, cabinClass: e.target.value }))}
                      >
                        {TRAVEL_CLASS_ORDER.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="flight-popover-done-btn"
                      onClick={() => setShowTravellersDropdown(false)}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              {/* SEARCH BUTTON */}
              <button
                type="button"
                className="flight-discover-searchbutton"
                onClick={handleApplyModifySearch}
              >
                <Search size={18} />
                <span>Search Flights</span>
              </button>
            </form>
          </div>
        </section>

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




            {(() => {
              const cheapestFlight = [...filteredFlights].sort((a, b) => a.fare - b.fare)[0];
              const fastestFlight = [...filteredFlights].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
              const nonStopFlights = filteredFlights.filter((f) => f.stops === 0);
              const cheapestNonStopFlight = [...nonStopFlights].sort((a, b) => a.fare - b.fare)[0];

              const formatDuration = (mins) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `${h}h ${m}m`;
              };

              return (
                <div className="modern-metrics-sort-container">
                  <div className="top-metrics-row">
                    <button
                      type="button"
                      className={`metric-chip ${sortBy === "price" ? "active" : ""}`}
                      onClick={() => setSortBy("price")}
                    >
                      <div className="metric-icon-box"><LineChart size={18} /></div>
                      <div className="metric-content">
                        <span className="metric-title">CHEAPEST</span>
                        <div className="metric-value">
                          <strong>{cheapestFlight ? `₹${new Intl.NumberFormat("en-IN").format(cheapestFlight.fare)}` : "--"}</strong>
                          <span className="metric-sub">{cheapestFlight ? formatDuration(cheapestFlight.durationMinutes) : ""}</span>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`metric-chip ${sortBy === "duration" ? "active" : ""}`}
                      onClick={() => setSortBy("duration")}
                    >
                      <div className="metric-icon-box"><Clock size={18} /></div>
                      <div className="metric-content">
                        <span className="metric-title">FASTEST</span>
                        <div className="metric-value">
                          <strong>{fastestFlight ? `₹${new Intl.NumberFormat("en-IN").format(fastestFlight.fare)}` : "--"}</strong>
                          <span className="metric-sub">{fastestFlight ? formatDuration(fastestFlight.durationMinutes) : ""}</span>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`metric-chip ${stopFilters.nonStop && !stopFilters.oneStop ? "active" : ""}`}
                      onClick={() => {
                        if (stopFilters.nonStop && !stopFilters.oneStop) {
                          setStopFilters({ nonStop: true, oneStop: true });
                        } else {
                          setStopFilters({ nonStop: true, oneStop: false });
                          setSortBy("price");
                        }
                      }}
                    >
                      <div className="metric-icon-box"><ArrowRight size={18} /></div>
                      <div className="metric-content">
                        <span className="metric-title">NON STOP</span>
                        <div className="metric-value">
                          <strong>{cheapestNonStopFlight ? `₹${new Intl.NumberFormat("en-IN").format(cheapestNonStopFlight.fare)}` : "--"}</strong>
                          <span className="metric-sub">{cheapestNonStopFlight ? formatDuration(cheapestNonStopFlight.durationMinutes) : ""}</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="bottom-sort-row">
                    <strong className="sort-by-label">SORT BY</strong>
                    <div className="sort-pills">
                      <button type="button" className={`sort-pill ${sortBy === "price" ? "active" : ""}`} onClick={() => setSortBy("price")}>
                        <LineChart size={14} /> Price {sortBy === "price" && "↑"}
                      </button>
                      <button type="button" className={`sort-pill ${sortBy === "departure" ? "active" : ""}`} onClick={() => setSortBy("departure")}>
                        <Calendar size={14} /> Departure
                      </button>
                      <button type="button" className={`sort-pill ${sortBy === "arrival" ? "active" : ""}`} onClick={() => setSortBy("arrival")}>
                        <MapPin size={14} /> Arrival
                      </button>
                      <button type="button" className={`sort-pill ${sortBy === "duration" ? "active" : ""}`} onClick={() => setSortBy("duration")}>
                        <Clock size={14} /> Duration
                      </button>
                      <button type="button" className={`sort-pill ${sortBy === "airline" ? "active" : ""}`} onClick={() => setSortBy("airline")}>
                        <Activity size={14} /> Airline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flight-list">
              {sortedFlights.length === 0 ? (
                <div className="no-results">
                  <PlaneTakeoff size={18} />
                  <p>No flights match the selected filters for this date.</p>
                </div>
              ) : (
                (() => {
                  const globalCheapestFlightId = [...filteredFlights].sort((a, b) => a.fare - b.fare)[0]?.id;
                  
                  return sortedFlights.map((flight) => {
                  const isSelectedInTwoWay = tripType === "twoway" && (
                    (twoWayActiveTab === "onward" && selectedOnwardFlightId === flight.id) ||
                    (twoWayActiveTab === "return" && selectedReturnFlightId === flight.id)
                  );
                  const flightCardJsx = (
                    <article
                      className={`flight-card-modern ${isSelectedInTwoWay ? "selected-two-way" : ""}`}
                      key={flight.id}
                    >
                      <div className="premium-flight-card-inner">
                        {/* Top Bar */}
                        <div className="premium-top-bar">
                          <div className="premium-airline-info">
                            <img src={flight.logo} alt={flight.airlineName} className="premium-logo" />
                            <div className="premium-airline-details">
                              <div className="premium-airline-title-row">
                                <span className="premium-airline-name">{flight.airlineName}</span>
                                {globalCheapestFlightId === flight.id && (
                                  <span className="premium-cheapest-badge"><LineChart size={12} /> CHEAPEST</span>
                                )}
                              </div>
                              <div className="premium-flight-numbers">
                                {flight.flightNumber} {flight.equipment ? `· 🛠 Aircraft ${flight.equipment}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="premium-top-actions">

                            <span className={`premium-tag ${flight.isRefundable == null ? "" : flight.isRefundable ? "green" : "red"}`}>
                              <CheckCircle2 size={12} /> {flight.isRefundable == null ? "Refund status unavailable" : flight.isRefundable ? "Refundable" : "Non-Refundable"}
                            </span>
                            <span className="premium-tag grey"><Armchair size={12} /> {cabinClass || "ECONOMY"}</span>
                          </div>
                        </div>

                        {/* Middle Schedule Row */}
                        <div className="premium-schedule-row">
                          <div className="premium-dept-block">
                            <div className="premium-time-code">
                              <span className="premium-large-time">{flight.departureTime}</span>
                              <span className="premium-city-code">{flight.sourceCode}</span>
                            </div>
                            {/* Dynamic tag for time of day */}
                            <div className="premium-time-tag">
                              {isDayTime(flight.departureTime) ? <><Sun size={12} /> DAY</> : <><Moon size={12} /> NIGHT</>}
                            </div>
                            <div className="premium-airport-desc">
                              <strong>{getAirportName(flight.sourceCode, sourceName)}</strong>
                            </div>
                          </div>

                          <div className="premium-duration-block">
                            <span className="premium-duration-text">{flight.duration}</span>
                            <div className="premium-path-line">
                              <div className="premium-circle-start"></div>
                              <div className="premium-solid-line"></div>
                              <ArrowRight size={14} className="premium-arrow-end" />
                            </div>
                            <span className="premium-stops-text">
                              {flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}
                            </span>
                          </div>

                          <div className="premium-arr-block">
                            <div className="premium-time-code">
                              <span className="premium-large-time">{flight.arrivalTime}</span>
                              <span className="premium-city-code">{flight.destinationCode}</span>
                            </div>
                            {/* Dynamic tag for time of day */}
                            <div className="premium-time-tag">
                              {isDayTime(flight.arrivalTime) ? <><Sun size={12} /> DAY</> : <><Moon size={12} /> NIGHT</>}
                            </div>
                            <div className="premium-airport-desc">
                              <strong>{getAirportName(flight.destinationCode, destinationName)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Metadata & Price Row */}
                        <div className="premium-bottom-info-row">
                          <div className="premium-baggage-chips">
                            <span className="premium-bag-chip"><Briefcase size={12} /> Check-in {flight.checkedBagsWeight || "Not provided"}</span>
                            <span className="premium-bag-chip"><Briefcase size={12} /> Cabin {flight.cabinBagsWeight || "Not provided"}</span>
                            <span className="premium-bag-chip"><Armchair size={12} /> Class {flight.bookingClass || "Not provided"}</span>
                            <span className="premium-bag-chip"><Users size={12} /> Seats left {flight.totalAvailableSeats || "Not provided"}</span>
                          </div>
                          
                          <div className="premium-price-block">
                            <div className="premium-huge-price">
                              ₹{new Intl.NumberFormat("en-IN").format(flight.fare)} <span className="info-circle">i</span>
                            </div>
                            <div className="premium-fare-type-tag">
                              <Check size={12} /> Saver Fare
                            </div>
                            <div className="premium-published-fare">
                              Published ₹{new Intl.NumberFormat("en-IN").format(flight.fare + 150)}
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="premium-action-bar">
                          <button 
                            type="button" 
                            className="premium-more-fares-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFareSelection(flight);
                            }}
                          >
                            <span className="dot"></span> {flight.fareOptions?.length > 1 ? `${flight.fareOptions.length - 1} More Fare >` : "View Details >"}
                          </button>
                          
                          <button 
                            type="button" 
                            className="premium-select-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (flight.fareOptions?.length > 1) {
                                handleOpenFareSelection(flight);
                              } else {
                                handleFinalizeFlightSelection(flight);
                              }
                            }}
                          >
                            <ArrowRight size={18} /> Select
                          </button>
                        </div>
                      </div>

                      {Array.isArray(flight.fullMultiSectorSegments) && flight.fullMultiSectorSegments.length > 1 && (
                        <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>All Flights in this Multi-City Journey ({flight.fullMultiSectorSegments.length} Sectors)</span>
                            <span style={{ color: "#ff0000", fontWeight: 800 }}>Total Combined Fare: ₹{new Intl.NumberFormat("en-IN").format(flight.fare)}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(${flight.fullMultiSectorSegments.length}, minmax(0, 1fr))`, gap: "8px" }}>
                            {flight.fullMultiSectorSegments.map((sec, secIdx) => (
                              <div key={`mc-sec-${secIdx}`} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "0.78rem" }}>
                                <div style={{ fontWeight: 800, color: "#ff0000", fontSize: "0.7rem" }}>LEG {secIdx + 1}</div>
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

                    </article>
                  );

                  return flightCardJsx;
                });
              })()
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
          borderTop: "3px solid #ff0000",
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
                    border: twoWayActiveTab === "onward" ? "1.5px solid #ff0000" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer"
                  }}
                  onClick={() => setTwoWayActiveTab("onward")}
                >
                  <div style={{ background: "#ff0000", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
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
                    border: twoWayActiveTab === "return" ? "1.5px solid #ff0000" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer"
                  }}
                  onClick={() => setTwoWayActiveTab("return")}
                >
                  <div style={{ background: "#ff0000", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
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
              const displaySrc = cityCode(selectedObj?.sourceCode || legInfo.from || legInfo.fromCity || legInfo.source || "");
              const displayDest = cityCode(selectedObj?.destinationCode || legInfo.to || legInfo.toCity || legInfo.destination || "");
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
                      border: isActive ? "1.5px solid #ff0000" : "1px solid rgba(255, 255, 255, 0.1)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setMultiCityActiveTab(index);
                    }}
                  >
                    <div style={{ background: isActive ? "#ff0000" : "#334155", color: "#ffffff", padding: "4px 8px", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>
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
                backgroundColor: "#ff0000",
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
                  // For two-way, pass the currently selected return flight synchronously via ref.
                  // This ensures the latest selected return flight is always used, even if
                  // React state hasn't flushed yet at the time of button click.
                  const returnOverride = latestSelectedReturnFlightRef.current
                    || (selectedReturnFlightId
                        ? returnFlights.find(f => f.id === selectedReturnFlightId)
                        : null)
                    || (returnFlights.length > 0 ? returnFlights[0] : null);
                  handleStartBookingJourney(
                    selectedOnwardFlightObj,
                    selectedOnwardFlightObj.fare,
                    selectedOnwardFlightObj.className,
                    null,
                    returnOverride
                  );
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

      {/* Fare Selection Modal */}
      {activeFareSelectionModal.isOpen && activeFareSelectionModal.flight && (
        <div className="booking-modal-backdrop" onClick={handleCloseFareSelection} style={{ zIndex: 99999 }}>
          <div className="booking-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%", boxSizing: "border-box", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="booking-modal-header" style={{ background: "var(--theme-primary, #ff0000)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "12px 12px 0 0", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#ffffff", textTransform: "uppercase" }}>FLIGHT FARE LIST</h3>
              <button type="button" onClick={handleCloseFareSelection} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", cursor: "pointer", color: "#ffffff", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <X size={16} /> Close
              </button>
            </div>
            
            <div className="booking-modal-body" style={{ padding: "0", overflowY: "auto", flex: 1 }}>
              <div style={{ padding: "16px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.9rem", color: "#0f172a" }}>
                  <img src={activeFareSelectionModal.flight.logo} alt="airline" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                  <strong style={{ fontWeight: 800 }}>{activeFareSelectionModal.flight.airlineName} {activeFareSelectionModal.flight.flightNumber}</strong>
                  <span style={{ color: "#cbd5e1" }}>|</span>
                  <span style={{ fontWeight: 600 }}>{activeFareSelectionModal.flight.sourceCode} {activeFareSelectionModal.flight.departureTime} → {activeFareSelectionModal.flight.destinationCode} {activeFareSelectionModal.flight.arrivalTime}</span>
                  <span style={{ color: "#cbd5e1" }}>|</span>
                  <span style={{ color: "#64748b" }}>{activeFareSelectionModal.flight.duration} · {activeFareSelectionModal.flight.stops === 0 ? "Non-stop" : `${activeFareSelectionModal.flight.stops} Stop`}</span>
                </div>
              </div>

              <div style={{ padding: "0 20px 20px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr 2fr", gap: "16px", padding: "12px 0", borderBottom: "2px solid #e2e8f0", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                  <div>Fare</div>
                  <div>Baggage</div>
                  <div>Refund</div>
                  <div>Price</div>
                </div>

                {Array.isArray(activeFareSelectionModal.flight.fareOptions) && activeFareSelectionModal.flight.fareOptions.length > 0 ? (
                  activeFareSelectionModal.flight.fareOptions.map((opt, optIdx) => {
                    const optBaggage = opt.fareSegments?.[0]?.Baggage || (activeFareSelectionModal.flight.checkedBagsWeight ? `${activeFareSelectionModal.flight.checkedBagsWeight} ${activeFareSelectionModal.flight.checkedBagsUnit || "kg"}` : "");
                    const optCabinBaggage = opt.fareSegments?.[0]?.CabinBaggage || (activeFareSelectionModal.flight.cabinBagsWeight ? `${activeFareSelectionModal.flight.cabinBagsWeight} ${activeFareSelectionModal.flight.cabinBagsUnit || "kg"}` : "");
                    const dMarkup = opt?.b2cMarkupAmount || activeFareSelectionModal.flight?.b2cMarkupAmount || 0;
                    const dTotal = opt.b2cFinalFare || opt.b2cPublishedFare || opt.offeredFare || 0;
                    let dTax = (opt?.tax || opt?.Fare?.Tax || opt?.fareBreakdown?.Tax || activeFareSelectionModal.flight?.taxPrice || activeFareSelectionModal.flight?.Fare?.Tax || activeFareSelectionModal.flight?.FareBreakdown?.Tax || 0) + dMarkup;
                    let dBaseFare = opt?.baseFare || opt?.Fare?.BaseFare || opt?.fareBreakdown?.BaseFare || activeFareSelectionModal.flight?.baseFarePrice || activeFareSelectionModal.flight?.Fare?.BaseFare || activeFareSelectionModal.flight?.FareBreakdown?.BaseFare || 0;
                    if (dBaseFare === 0 && dTotal > 0) dBaseFare = Math.max(0, dTotal - dTax);

                    return (
                      <div key={optIdx} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr 2fr", gap: "16px", padding: "16px 0", borderBottom: "1px solid #e2e8f0", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "inline-block", background: "#fee2e2", color: "var(--theme-primary, #ff0000)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                            {opt.source || "FARE"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>{activeFareSelectionModal.flight.className || "Cabin not provided"} · {opt.fareSegments?.[0]?.Class || "Fare class not provided"}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{optBaggage || "Not provided"} check-in</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{optCabinBaggage || "Not provided"} cabin</div>
                        </div>

                        <div>
                          <span style={{ display: "inline-block", background: opt.isRefundable == null ? "#f1f5f9" : opt.isRefundable ? "#dcfce7" : "#fee2e2", color: opt.isRefundable == null ? "#475569" : opt.isRefundable ? "#166534" : "#991b1b", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700 }}>
                            {opt.isRefundable == null ? "Refund status unavailable" : opt.isRefundable ? "Refundable" : "Non-Refundable"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFareRule({ ...activeFareSelectionModal.flight, resultIndex: opt.resultIndex || opt.ResultIndex || opt.legResultIndex, srdvIndex: opt.srdvIndex, isLcc: opt.isLcc });
                            }}
                            style={{ display: "block", marginTop: "8px", background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, padding: 0 }}
                          >
                            View Fare Rules
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Since FareDetails modal looks at selectedFareOptionIndexByFlight to calculate prices,
                              // we need to set the index explicitly before opening so it calculates for this exact row.
                              handleSelectFareOption(activeFareSelectionModal.flight.id, optIdx);
                              handleOpenFareDetails({ ...activeFareSelectionModal.flight, resultIndex: opt.resultIndex || opt.ResultIndex || opt.legResultIndex, srdvIndex: opt.srdvIndex, isLcc: opt.isLcc });
                            }}
                            style={{ display: "block", marginTop: "4px", background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, padding: 0 }}
                          >
                            View Fare Details
                          </button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ textAlign: "right", marginRight: "16px", flex: 1 }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a" }}>₹{new Intl.NumberFormat("en-IN").format(opt.b2cFinalFare || opt.b2cPublishedFare || opt.offeredFare)}</div>
                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Base ₹{new Intl.NumberFormat("en-IN").format(dBaseFare)} · Tax ₹{new Intl.NumberFormat("en-IN").format(dTax)}</div>
                            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>{opt.seatsRemaining || "Not provided"} seat(s) left</div>
                          </div>
                          <button
                            type="button"
                            style={{ background: "var(--theme-primary, #ff0000)", color: "#ffffff", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}
                            onClick={() => {
                              handleSelectFareOption(activeFareSelectionModal.flight.id, optIdx);
                              // Use setTimeout to ensure the state update processes first
                              setTimeout(() => {
                                handleFinalizeFlightSelection(activeFareSelectionModal.flight);
                                handleCloseFareSelection();
                              }, 0);
                            }}
                          >
                            <ArrowRight size={16} /> Select
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b" }}>No live fare options available.</div>
                )}
              </div>
            </div>
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
            zIndex: 1000000,
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

      {/* Fare Details Modal */}
      {activeFareDetailsModal.isOpen && (
        <div className="booking-modal-backdrop" onClick={handleCloseFareDetails} style={{ zIndex: 1000000 }}>
          <div className="booking-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px", width: "95%", background: "#ffffff", borderRadius: "8px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            <div className="booking-modal-header" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900, color: "#1e293b", textTransform: "uppercase" }}>
                FARE BREAKDOWN
              </h3>
              <button type="button" className="close-modal-btn" onClick={handleCloseFareDetails} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="booking-modal-body" style={{ padding: "0" }}>
              {(() => {
                const flt = activeFareDetailsModal.flight;
                const optIdx = latestFareOptionIndexRef.current[flt?.id] ?? selectedFareOptionIndexByFlight[flt?.id] ?? 0;
                const chosenOpt = flt?.fareOptions?.[optIdx] || flt?.fareOptions?.[0];
                const segments = Array.isArray(flt?.fullMultiSectorSegments) && flt.fullMultiSectorSegments.length > 0 
                  ? flt.fullMultiSectorSegments 
                  : [flt];

                return (
                  <div style={{ background: "#f8fafc", padding: "16px 20px 20px 20px", borderBottom: "1px solid #e2e8f0", marginBottom: "20px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.5px" }}>
                      Flight Details
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {segments.map((sec, secIdx) => {
                        const optBaggage = chosenOpt?.fareSegments?.[secIdx]?.Baggage || chosenOpt?.fareSegments?.[0]?.Baggage || (flt?.checkedBagsWeight ? `${flt.checkedBagsWeight} ${flt.checkedBagsUnit || "kg"}` : "Not provided");
                        const optCabinBaggage = chosenOpt?.fareSegments?.[secIdx]?.CabinBaggage || chosenOpt?.fareSegments?.[0]?.CabinBaggage || (flt?.cabinBagsWeight ? `${flt.cabinBagsWeight} ${flt.cabinBagsUnit || "kg"}` : "Not provided");
                        const fClass = chosenOpt?.fareSegments?.[secIdx]?.Class || chosenOpt?.fareSegments?.[0]?.Class || "Not provided";
                        const seats = chosenOpt?.seatsRemaining || "Not provided";
                        
                        const sourceCode = sec.sourceCode || flt.sourceCode;
                        const destCode = sec.destinationCode || flt.destinationCode;
                        const depTimeStr = sec.departureTime || flt.departureTime || "";
                        const arrTimeStr = sec.arrivalTime || flt.arrivalTime || "";
                        
                        const parseTimeDate = (dateStr) => {
                          if (!dateStr) return { time: "", date: "" };
                          if (dateStr.includes("T")) {
                            return {
                              time: dateStr.split("T")[1].slice(0, 5),
                              date: new Date(dateStr).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: '2-digit'})
                            };
                          }
                          if (dateStr.length >= 16) { 
                            const timeMatch = dateStr.match(/\d{2}:\d{2}/);
                            return {
                              time: timeMatch ? timeMatch[0] : "",
                              date: new Date(dateStr.replace(/-/g, "/")).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: '2-digit'})
                            };
                          }
                          return { time: dateStr, date: "" };
                        };
                        const dep = parseTimeDate(depTimeStr);
                        const arr = parseTimeDate(arrTimeStr);
                        
                        const fareIdentifier = chosenOpt?.fareIdentifier || chosenOpt?.FareIdentifier || flt?.fareIdentifier || "Not provided";

                        return (
                          <div key={secIdx} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {flt.logo && <img src={flt.logo} alt="airline" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>{sec.airline || flt.airlineName} <span style={{ color: "#64748b", fontWeight: 600 }}>{sec.flightNumber || flt.flightNumber}</span></div>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                                {sec.duration || flt.duration || "--"}
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Departure</div>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{sourceCode} {dep.time && <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>• {dep.time} {dep.date ? `• ${dep.date}` : ""}</span>}</div>
                              </div>
                              <div style={{ flex: 1, textAlign: "right" }}>
                                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Arrival</div>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{destCode} {arr.time && <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>• {arr.time} {arr.date ? `• ${arr.date}` : ""}</span>}</div>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0", fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Aircraft:</strong> {sec.equipment || flt.equipment || "Not provided"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Cabin:</strong> {flt.className || "Not provided"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Fare Class:</strong> {fClass}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Fare Type:</strong> <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>{fareIdentifier}</span></span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Check-in:</strong> {optBaggage}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Cabin bag:</strong> {optCabinBaggage}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><strong>Seats left:</strong> {seats}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div style={{ padding: "0 20px 20px 20px" }}>
              {(() => {
                const flt = activeFareDetailsModal.flight;
                const optIdx = latestFareOptionIndexRef.current[flt?.id] ?? selectedFareOptionIndexByFlight[flt?.id] ?? 0;
                const chosenOpt = flt?.fareOptions?.[optIdx] || flt?.fareOptions?.[0];
                const dMarkup = chosenOpt?.b2cMarkupAmount || flt?.b2cMarkupAmount || 0;
                const dTotal = chosenOpt?.b2cFinalFare || chosenOpt?.b2cPublishedFare || chosenOpt?.offeredFare || flt?.fare || 0;
                let rawTax = chosenOpt?.tax || chosenOpt?.Fare?.Tax || chosenOpt?.fareBreakdown?.Tax || flt?.taxPrice || flt?.Fare?.Tax || flt?.FareBreakdown?.Tax || 0;
                let dBaseFare = chosenOpt?.baseFare || chosenOpt?.Fare?.BaseFare || chosenOpt?.fareBreakdown?.BaseFare || flt?.baseFarePrice || flt?.Fare?.BaseFare || flt?.FareBreakdown?.BaseFare || 0;
                if (dBaseFare === 0 && dTotal > 0) dBaseFare = Math.max(0, dTotal - rawTax - dMarkup);
                
                const breakdownList = Array.isArray(chosenOpt?.fareBreakdown) ? chosenOpt.fareBreakdown : 
                                      Array.isArray(chosenOpt?.FareBreakdown) ? chosenOpt.FareBreakdown : 
                                      Array.isArray(flt?.FareBreakdown) ? flt.FareBreakdown : [];

                let sumPaxTotal = 0;
                if (breakdownList.length > 0) {
                  sumPaxTotal = breakdownList.reduce((acc, fb) => acc + ((fb.BaseFare || 0) + (fb.Tax || 0)) * (fb.PassengerCount || 1), 0);
                } else {
                  sumPaxTotal = dBaseFare + rawTax;
                }
                
                // There are often un-tabulated taxes (like YQTax, Convenience Fees, Markups) that cause a discrepancy
                // between the sum of passenger rows and the actual grand total. We explicitly capture the difference.
                const remainingFees = Math.max(0, dTotal - sumPaxTotal);

                const getPaxName = (type) => {
                  if (type == 1 || type === "Adult") return "Adult";
                  if (type == 2 || type === "Child") return "Child";
                  if (type == 3 || type === "Infant") return "Infant";
                  return "Passenger";
                };
                
                return (
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      <thead>
                        <tr style={{ background: "var(--theme-primary, #ff0000)", color: "#ffffff", textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 800 }}>
                          <th style={{ padding: "16px 16px" }}>PASSENGER</th>
                          <th style={{ padding: "16px 8px" }}>COUNT</th>
                          <th style={{ padding: "16px 8px" }}>BASE FARE</th>
                          <th style={{ padding: "16px 8px" }}>TAXES</th>
                          <th style={{ padding: "16px 16px", textAlign: "right" }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownList.length > 0 ? (
                          breakdownList.map((fb, idx) => {
                            const bFare = fb.BaseFare || 0;
                            const tFare = fb.Tax || 0;
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "16px 16px", fontWeight: 700, color: "#1e293b" }}>{getPaxName(fb.PassengerType)}</td>
                                <td style={{ padding: "16px 8px", color: "#334155", fontWeight: 600 }}>{fb.PassengerCount || 1}</td>
                                <td style={{ padding: "16px 8px", color: "#334155" }}>₹{new Intl.NumberFormat("en-IN").format(bFare)}</td>
                                <td style={{ padding: "16px 8px", color: "#334155" }}>₹{new Intl.NumberFormat("en-IN").format(tFare)}</td>
                                <td style={{ padding: "16px 16px", fontWeight: 800, color: "#0f172a", textAlign: "right" }}>₹{new Intl.NumberFormat("en-IN").format((bFare + tFare) * (fb.PassengerCount || 1))}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "16px 16px", fontWeight: 700, color: "#1e293b" }}>All Passengers</td>
                            <td style={{ padding: "16px 8px", color: "#334155", fontWeight: 600 }}>{travellerCounts.adults + travellerCounts.children + travellerCounts.infants}</td>
                            <td style={{ padding: "16px 8px", color: "#334155" }}>₹{new Intl.NumberFormat("en-IN").format(dBaseFare)}</td>
                            <td style={{ padding: "16px 8px", color: "#334155" }}>₹{new Intl.NumberFormat("en-IN").format(rawTax)}</td>
                            <td style={{ padding: "16px 16px", fontWeight: 800, color: "#0f172a", textAlign: "right" }}>₹{new Intl.NumberFormat("en-IN").format(dBaseFare + rawTax)}</td>
                          </tr>
                        )}
                        {remainingFees > 0 && (
                          <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                            <td style={{ padding: "16px 16px", fontWeight: 700, color: "#1e293b" }}>Other Taxes & Fees</td>
                            <td style={{ padding: "16px 8px", color: "#334155" }}>-</td>
                            <td style={{ padding: "16px 8px", color: "#334155" }}>-</td>
                            <td style={{ padding: "16px 8px", color: "#334155" }}>-</td>
                            <td style={{ padding: "16px 16px", fontWeight: 800, color: "#0f172a", textAlign: "right" }}>₹{new Intl.NumberFormat("en-IN").format(remainingFees)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ padding: "20px 16px", fontWeight: 800, color: "#1e293b", fontSize: "1rem" }}>GRAND TOTAL</td>
                          <td style={{ padding: "20px 16px", fontWeight: 900, color: "var(--theme-primary, #ff0000)", fontSize: "1.2rem", textAlign: "right" }}>₹{new Intl.NumberFormat("en-IN").format(dTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>
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
