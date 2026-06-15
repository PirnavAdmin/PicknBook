import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PlaneTakeoff,
  X,
  XCircle,
} from "lucide-react";
import Lottie from "lottie-react";
import { useLocation, useNavigate } from "react-router-dom";
import airIndiaExpress from "../../assets/images/airlines/Air-India_express.jpg";
import airIndia from "../../assets/images/airlines/air-india.png";
import akasaAir from "../../assets/images/airlines/AkasaAir.png";
import emirates from "../../assets/images/airlines/Emirates.png";
import indigo from "../../assets/images/airlines/indigo.png";
import qatarAirways from "../../assets/images/airlines/qatarairways.png";
import spiceJet from "../../assets/images/airlines/Spicejet.png";
import flightLoadingAnimation from "../../assets/images/animations/flightLoadingPaperplane.json";
import { bookFlight, searchFlights } from "../../services/flightBookingService";
import "../../STYLES/FlightSearchResults.css";
import { toDisplayDate, toYyyyMmDd } from "../../utils/apiDateFormat";

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
  { key: "morning", label: "6am to 12pm", min: 6, max: 12 },
  { key: "afternoon", label: "12pm to 6pm", min: 12, max: 18 },
  { key: "evening", label: "6pm to 12am", min: 18, max: 24 },
  { key: "night", label: "12am to 6am", min: 0, max: 6 },
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
  return `${String(date.getDate()).padStart(2, "0")} ${
    MONTHS[date.getMonth()]
  } ${date.getFullYear()}, ${WEEKDAYS[date.getDay()]}`;
}

function formatCardDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${
    date.getFullYear()
  }`;
}

function formatFlightDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${
    String(date.getFullYear()).slice(-2)
  }`;
}

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
}

function cityCode(name, fallback) {
  const clean = String(name || "")
    .replace(/[^a-zA-Z ]/g, " ")
    .trim();

  if (!clean) {
    return fallback;
  }

  if (clean.length <= 3) {
    return clean.toUpperCase();
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

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
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
    tripType: initialTripType,
    travellers: initialTravellerText,
    cabinClass: initialCabinClass,
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInput(initialOnwardDateInput)
  );
  const [searchVersion, setSearchVersion] = useState(0);
  const [apiFlights, setApiFlights] = useState([]);
  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const [selectedClassByFlight, setSelectedClassByFlight] = useState({});
  const [expandedFlightId, setExpandedFlightId] = useState(null);

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [timeMin, setTimeMin] = useState(0);
  const [timeMax, setTimeMax] = useState(23);
  const [departureWindows, setDepartureWindows] = useState(() => ({
    morning: true,
    afternoon: true,
    evening: true,
    night: true,
  }));
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
  const sourceCode = cityCode(sourceName, "DEL");
  const destinationCode = cityCode(destinationName, "BOM");

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
        const result = await searchFlights({
          from: normalizeCity(sourceName),
          to: normalizeCity(destinationName),
          date: formatDateInput(selectedDate),
          travelClass: cabinClass,
        });

        if (!isCurrent) {
          return;
        }

        setApiFlights(result);
        setExpandedFlightId(null);

        setSelectedClassByFlight((previous) => {
          const next = {};

          result.forEach((flight) => {
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
  }, [sourceName, destinationName, selectedDate, cabinClass, searchVersion]);

  const flights = useMemo(
    () =>
      apiFlights.map((flight) => {
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

        return {
          id: flight.id,
          airlineName: flight.airline || "Unknown Airline",
          logo: resolveAirlineLogo(flight.airline),
          flightNumber: flight.flightNumber || "--",
          sourceCode: cityCode(flight.fromCity || sourceName, sourceCode),
          destinationCode: cityCode(
            flight.toCity || destinationName,
            destinationCode
          ),
          departDate: formatFlightDate(departureIst || selectedDate),
          departureTime: formatTime(departureIst),
          arrivalTime: formatTime(arrivalIst),
          departureHour: departureIst ? departureIst.getHours() : 0,
          duration: durationLabel(durationMinutes),
          fare: selectedClassOption?.priceInr ?? flight.selectedTravelClassPriceInr ?? 0,
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
        };
      }),
    [
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
    setPriceMax(maxFare);
  }, [minFare, maxFare]);

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
        if (flight.fare < priceMin || flight.fare > priceMax) {
          return false;
        }

        if (flight.departureHour < timeMin || flight.departureHour > timeMax) {
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

        return airlineFilters[flight.airlineName];
      }),
    [flights, priceMin, priceMax, timeMin, timeMax, departureWindows, airlineFilters]
  );

  const dateStrip = useMemo(() => {
    const offsets = [-1, 0, 1, 2, 3, 4];
    return offsets.map((offset) => ({
      id: `${selectedDate.getTime()}-${offset}`,
      date: addDays(selectedDate, offset),
      offset,
    }));
  }, [selectedDate]);

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
  const loadingSearchDetails = [
    {
      id: "from",
      label: "From",
      value: `${sourceName} (${sourceCode})`,
    },
    {
      id: "to",
      label: "To",
      value: `${destinationName} (${destinationCode})`,
    },
    {
      id: "date",
      label: "Departure",
      value: formatLongDate(selectedDate),
    },
    {
      id: "trip",
      label: "Trip",
      value: tripLabel,
    },
    {
      id: "travellers",
      label: "Travellers",
      value: `${travellerCounts.adults} Adult | ${travellerCounts.children} Child | ${travellerCounts.infants} Infant`,
    },
    {
      id: "cabin",
      label: "Cabin",
      value: cabinClass,
    },
  ];
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

  const toggleAirline = (name) => {
    setAirlineFilters((previous) => ({ ...previous, [name]: !previous[name] }));
  };

  const handleClassChange = (flightId, travelClass) => {
    setSelectedClassByFlight((previous) => ({ ...previous, [flightId]: travelClass }));

    if (bookingFlightId === flightId) {
      setBookingForm((previous) => ({ ...previous, travelClass }));
    }
  };

  const handleStartBookingJourney = (flight) => {
    setBookingError("");
    setBookingSuccess("");

    navigate("/flight/seats", {
      state: {
        flight,
        searchContext: {
          source: sourceName,
          destination: destinationName,
          tripType,
          departureDate: formatDateInput(selectedDate),
          travellers: travellerText,
          cabinClass: flight.className || cabinClass,
        },
      },
    });
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
        <section className="flight-loading-screen" aria-live="polite" aria-busy="true">
          <div className="flight-loading-lottie" aria-label="Searching flights">
            <Lottie
              animationData={flightLoadingAnimation}
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </section>
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

          <button
            type="button"
            className="modify-btn"
            onClick={toggleModifySearch}
          >
            Modify Search
          </button>
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
                  <option value="multicity">Multi City</option>
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

        <div className="results-layout">
            <aside className="filters-rail">
              <header className="flights-count">
                <strong>{flightsFoundCount} Flights Found.</strong>
              </header>

              <section className="filter-group">
                <h3>INR Price</h3>
                <div className="range-head">
                  <span>{formatCurrency(priceMin)}</span>
                  <span>{formatCurrency(priceMax)}</span>
                </div>
                <div className="range-stack">
                  <input
                    type="range"
                    min={minFare}
                    max={maxFare}
                    value={priceMin}
                    disabled={minFare === maxFare}
                    onChange={(event) =>
                      setPriceMin(Math.min(Number(event.target.value), priceMax))
                    }
                  />
                  <input
                    type="range"
                    min={minFare}
                    max={maxFare}
                    value={priceMax}
                    disabled={minFare === maxFare}
                    onChange={(event) =>
                      setPriceMax(Math.max(Number(event.target.value), priceMin))
                    }
                  />
                </div>
              </section>

              <section className="filter-group">
                <h3>Departure Time</h3>
                <div className="range-head">
                  <span>{getTimeDisplay(timeMin)}</span>
                  <span>{getTimeDisplay(timeMax)}</span>
                </div>
                <div className="range-stack">
                  <input
                    type="range"
                    min={0}
                    max={23}
                    value={timeMin}
                    onChange={(event) =>
                      setTimeMin(Math.min(Number(event.target.value), timeMax))
                    }
                  />
                  <input
                    type="range"
                    min={0}
                    max={23}
                    value={timeMax}
                    onChange={(event) =>
                      setTimeMax(Math.max(Number(event.target.value), timeMin))
                    }
                  />
                </div>
              </section>

              <section className="filter-group">
                <h3>Time Buckets</h3>
                <div className="departure-grid">
                  {DEPARTURE_WINDOWS.map((window) => (
                    <button
                      type="button"
                      key={window.key}
                      className={`departure-chip ${
                        departureWindows[window.key] ? "active" : ""
                      }`}
                      onClick={() => toggleDepartureWindow(window.key)}
                    >
                      {window.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="filter-group">
                <h3>Airlines</h3>
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

            <section className="results-column">
              <div className="fare-date-strip">
                {dateStrip.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`fare-date-card ${
                      item.date.toDateString() === selectedDate.toDateString()
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setSelectedDate(item.date)}
                  >
                    <strong>{formatCardDate(item.date)}</strong>
                    <span>
                      {item.offset === 0 && flights.length > 0
                        ? `Best fare ${formatCurrency(minFare)}`
                        : "Tap to search fares"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="day-navigation">
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                >
                  Previous Day
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  Next Day
                </button>
              </div>

              <div className="table-head">
                <span>Airline</span>
                <span>Depart</span>
                <span>Class / Seats</span>
                <span>Price</span>
              </div>

              <div className="flight-list">
                {filteredFlights.length === 0 ? (
                  <div className="no-results">
                    <PlaneTakeoff size={18} />
                    <p>No flights match the selected filters for this date.</p>
                  </div>
                ) : (
                  filteredFlights.map((flight) => (
                    <article className="flight-card" key={flight.id}>
                      <div className="airline-cell">
                        <img src={flight.logo} alt={flight.airlineName} />
                        <h4>{flight.airlineName}</h4>
                        <p>({flight.flightNumber})</p>
                        <span className="good">
                          {flight.totalAvailableSeats > 0
                            ? `${flight.totalAvailableSeats} seats available`
                            : "Sold out"}
                        </span>
                      </div>

                      <div className="timeline-cell">
                        <div className="city-time">
                          <strong>{flight.sourceCode}</strong>
                          <span>{flight.departDate}</span>
                          <em>{flight.departureTime}</em>
                        </div>

                        <div className="duration-line">
                          <span>{flight.duration}</span>
                        </div>

                        <div className="city-time">
                          <strong>{flight.destinationCode}</strong>
                          <span>{flight.departDate}</span>
                          <em>{flight.arrivalTime}</em>
                        </div>
                      </div>

                      <div className="service-cell">
                        <span className={`fare-tag ${flight.fareTagTone}`}>
                          {flight.className}
                        </span>
                        <p>
                          Seats: {flight.availableSeats}/{flight.totalSeats}
                        </p>
                        <p>
                          Classes:{" "}
                          {flight.supportedTravelClasses.length > 0
                            ? flight.supportedTravelClasses.join(", ")
                            : "--"}
                        </p>
                        <div className="flight-action-row">
                          <button
                            type="button"
                            className="class-toggle-btn"
                            onClick={() =>
                              setExpandedFlightId((previous) =>
                                previous === flight.id ? null : flight.id
                              )
                            }
                          >
                            {expandedFlightId === flight.id
                              ? "Hide Class Fares"
                              : "Show Class Fares"}
                          </button>
                          <button
                            type="button"
                            className="book-btn"
                            onClick={() => handleStartBookingJourney(flight)}
                            disabled={flight.availableSeats <= 0}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>

                      <div className="price-cell">
                        <div className="price-line">
                          <strong>{formatCurrency(flight.fare)}</strong>
                        </div>
                        <p className="price-caption">on selected class</p>
                      </div>

                      {expandedFlightId === flight.id && (
                        <div className="class-options-panel">
                          {flight.classOptions.length === 0 ? (
                            <p>No class options available for this flight.</p>
                          ) : (
                            flight.classOptions.map((option) => (
                              <button
                                type="button"
                                key={`${flight.id}-${option.travelClass}`}
                                className={`class-option ${
                                  flight.className === option.travelClass ? "active" : ""
                                } ${
                                  option.availableSeats <= 0 ? "out-of-stock" : ""
                                }`}
                                onClick={() =>
                                  handleClassChange(flight.id, option.travelClass)
                                }
                              >
                                <span>{option.travelClass}</span>
                                <strong>{formatCurrency(option.priceInr)}</strong>
                                <em>
                                  {option.availableSeats}/{option.totalSeats} seats
                                </em>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
      </div>

      {activeBookingFlight && !isLoadingFlights && (
        <div className="booking-modal-backdrop" onClick={closeBookingModal}>
          <section
            className="booking-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="booking-modal-header">
              <div>
                <h3>Book {activeBookingFlight.airlineName}</h3>
                <p>
                  {activeBookingFlight.flightNumber} | {activeBookingFlight.sourceCode} to{" "}
                  {activeBookingFlight.destinationCode}
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={closeBookingModal}
              >
                <X size={16} />
              </button>
            </header>

            <form className="booking-form" onSubmit={handleBookingSubmit}>
              <div className="booking-form-grid">
                <label className="booking-form-group">
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
                    placeholder="Enter full name"
                  />
                </label>

                <label className="booking-form-group">
                  <span>Passenger Phone</span>
                  <input
                    type="text"
                    value={bookingForm.passengerPhone}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        passengerPhone: event.target.value,
                      }))
                    }
                    placeholder="+91XXXXXXXXXX"
                  />
                </label>

                <label className="booking-form-group">
                  <span>Passenger Email</span>
                  <input
                    type="email"
                    value={bookingForm.passengerEmail}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        passengerEmail: event.target.value,
                      }))
                    }
                    placeholder="name@example.com"
                  />
                </label>

                <label className="booking-form-group">
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
                    {activeBookingFlight.classOptions.map((option) => (
                      <option key={option.travelClass} value={option.travelClass}>
                        {option.travelClass}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="booking-form-group small">
                  <span>Adults</span>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.adults}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        adults: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="booking-form-group small">
                  <span>Children</span>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.children}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        children: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="booking-form-group small">
                  <span>Infants</span>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.infants}
                    onChange={(event) =>
                      setBookingForm((previous) => ({
                        ...previous,
                        infants: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              {bookingError && (
                <div className="booking-error">
                  <XCircle size={15} />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="booking-submit-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeBookingModal}
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
                      <span>Booking...</span>
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
