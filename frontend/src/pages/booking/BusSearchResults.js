
/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Armchair,
  Bed,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Fan,
  IndianRupee,
  Loader2,
  Moon,
  RotateCw,
  Search,
  ShieldAlert,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Wind,
  Zap,
  Square,
  XCircle,
} from "lucide-react";
import { searchBuses, searchBusCities, getBoardingPointsProxy } from "../../services/busBookingService";
import { getActiveOffers } from "../../services/adminFeaturedOffersService";
import busExteriorImg from "../../assets/images/buses/luxury_bus_exterior.png";
import busSleeperImg from "../../assets/images/buses/luxury_bus_interior_sleeper.png";
import busSeatsImg from "../../assets/images/buses/luxury_bus_interior_seats.png";
import BusSeatSelectionPage from "./BusSeatSelectionPage";
import "../../STYLES/BusSearchResults.css";

const USE_DIRECT_API_IN_DEV =
  String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() ===
  "true";
const IS_LOCAL_DEV =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const PLACES_API_URL =
  IS_LOCAL_DEV && !USE_DIRECT_API_IN_DEV
    ? "/api/Places"
    : process.env.REACT_APP_PLACES_API_URL || "/api/Places";
const FALLBACK_CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Pune",
  "Vijayawada",
  "Visakhapatnam",
  "Delhi",
  "Kolkata",
  "Ahmedabad",
];

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const TIME_WINDOWS = [
  { key: "morning", label: "6am to 12pm", min: 6, max: 12, icon: Sunrise },
  { key: "afternoon", label: "12pm to 6pm", min: 12, max: 18, icon: Sun },
  { key: "evening", label: "6pm to 12am", min: 18, max: 24, icon: Sunset },
  { key: "night", label: "12am to 6am", min: 0, max: 6, icon: Moon },
];

const SORT_OPTIONS = [
  { key: "departure", label: "Departure", icon: BusFront },
  { key: "duration", label: "Duration", icon: Clock3 },
  { key: "arrival", label: "Arrival", icon: BusFront },
  { key: "fare", label: "Fare", icon: IndianRupee },
  { key: "seats", label: "Seats Available", icon: Armchair },
];

const BUS_TYPE_FILTERS = [
  { key: "ac", label: "AC", icon: Snowflake },
  { key: "nonac", label: "Non AC", icon: Fan },
  { key: "seater", label: "Seater", icon: Armchair },
  { key: "sleeper", label: "Sleeper", icon: Bed },
];

const AMENITIES = [
  { key: "blankets", label: "Blankets", icon: Wind },
  { key: "charging", label: "Charging Point", icon: Zap },
  { key: "pillow", label: "Pillow", icon: Square },
];

const BUS_PROMO_ITEMS = [
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
    icon: BusFront,
    title: "Quick Ticket",
    text: "Print ticket after booking",
  },
  {
    id: "time-picks",
    icon: Clock3,
    title: "Smart Timings",
    text: "Sort buses by departure",
  },
];

const BUS_RESULTS_CACHE_VERSION = 2;

const DEFAULT_BUS_TYPES = {
  ac: false,
  nonac: false,
  seater: false,
  sleeper: false,
};

const DEFAULT_TIME_WINDOWS = {
  morning: false,
  afternoon: false,
  evening: false,
  night: false,
};

const DEFAULT_AMENITIES = {
  blankets: false,
  charging: false,
  pillow: false,
};

function readValue(params, state, key, aliases = []) {
  const keysToTry = [key, ...aliases];
  for (const k of keysToTry) {
    const queryValue = params.get(k);
    if (typeof queryValue === "string" && queryValue.trim()) {
      return queryValue.trim();
    }
    const stateValue = state?.[k];
    if (typeof stateValue === "string" && stateValue.trim()) {
      return stateValue.trim();
    }
  }
  return "";
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

function formatDateInput(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatDdMmYyyy(value) {
  if (!value) return "";
  const cleanStr = String(value).split("T")[0];
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return value;
}

function parseTimeValue(dateString) {
  const raw = String(dateString || "").trim();
  if (!raw) {
    return null;
  }

  // 1. Handle 12-hour AM/PM format (e.g. "07:30 PM", "7:00:00 AM", "12:15 PM")
  const ampmMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const seconds = parseInt(ampmMatch[3] || "0", 10);
    const mod = ampmMatch[4].toUpperCase();

    if (mod === "PM" && hours < 12) hours += 12;
    if (mod === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  // 2. Extract time directly from ISO string (e.g., "2024-05-14T15:30:00Z")
  const isoTimeMatch = raw.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
  if (isoTimeMatch) {
    const hours = parseInt(isoTimeMatch[1], 10);
    const minutes = parseInt(isoTimeMatch[2], 10);
    const seconds = parseInt(isoTimeMatch[3] || "0", 10);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  // 3. Handle plain time or space-separated date/time (e.g. "15:30", "09:45:00", "2026-07-31 15:30:00")
  const time24Match = raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$)/);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    const seconds = parseInt(time24Match[3] || "0", 10);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applyTimeToDate(baseDate, timeDate) {
  if (!baseDate || !timeDate) {
    return null;
  }

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    timeDate.getHours(),
    timeDate.getMinutes(),
    timeDate.getSeconds(),
    timeDate.getMilliseconds()
  );
}

function resolveArrivalDate(departureDate, arrivalTimeDate, durationMinutes) {
  if (departureDate && Number.isFinite(durationMinutes) && durationMinutes >= 0) {
    return new Date(departureDate.getTime() + durationMinutes * 60000);
  }

  const arrivalDate = applyTimeToDate(departureDate, arrivalTimeDate);

  if (!departureDate || !arrivalDate) {
    return arrivalDate;
  }

  if (arrivalDate < departureDate) {
    arrivalDate.setDate(arrivalDate.getDate() + 1);
  }

  return arrivalDate;
}

function formatTime(date) {
  if (!date) {
    return "--:--";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatShortDate(date) {
  if (!date) {
    return "-- ---";
  }

  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`;
}

function formatLongDate(date) {
  if (!date) {
    return "--";
  }

  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${
    date.getFullYear()
  }`;
}

function formatDuration(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return "--";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h : ${minutes}m`;
}

function formatCurrency(value) {
  const numeric = Number(value) || 0;

  if (Number.isInteger(numeric)) {
    return `INR ${new Intl.NumberFormat("en-IN").format(numeric)}`;
  }

  return `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(numeric)}`;
}

function hourInWindow(hour, window) {
  if (window.min < window.max) {
    return hour >= window.min && hour < window.max;
  }

  return hour >= window.min || hour < window.max;
}

function getBusTags(busType) {
  const normalized = String(busType || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const hasNonAc = /\bnon[-\s]?a\/?c\b|\bnon[-\s]?ac\b/.test(normalized);
  const hasAc = /\ba\/?c\b|\bac\b/.test(normalized);

  return {
    ac: hasAc && !hasNonAc,
    nonac: hasNonAc,
    seater: normalized.includes("seater"),
    sleeper: normalized.includes("sleeper"),
  };
}

function getRtcOperatorGroupKey(operatorName) {
  const normalized = String(operatorName || "").toUpperCase().replace(/\s+/g, "");

  if (normalized.includes("TGSRTC")) {
    return "TGSRTC";
  }

  if (normalized.includes("TSRTC")) {
    return "TSRTC";
  }

  return "";
}

function getDurationInMinutes(bus) {
  if (!bus) return 0;
  if (typeof bus.durationMinutes === "number" && bus.durationMinutes > 0) return bus.durationMinutes;
  if (typeof bus.duration === "number" && bus.duration > 0) return bus.duration;
  if (bus.duration && !isNaN(Number(bus.duration)) && Number(bus.duration) > 0) return Number(bus.duration);

  const departureUtc = parseTimeValue(bus.departureTimeUtc || bus.departureTimeIst || bus.departureTime || bus.DepartureTime);
  const arrivalUtc = parseTimeValue(bus.arrivalTimeUtc || bus.arrivalTimeIst || bus.arrivalTime || bus.ArrivalTime);

  if (departureUtc && arrivalUtc) {
    let minutes = Math.round((arrivalUtc - departureUtc) / 60000);
    if (minutes < 0) {
      minutes += 24 * 60;
    }
    return minutes;
  }

  return 0;
}

function createToggleMap(items, previous = {}) {
  const next = {};

  items.forEach((item) => {
    next[item] = previous[item] ?? false;
  });

  return next;
}

function uniqueSortedValues(values) {
  return Array.from(
    new Set(
      values
        .flat()
        .map((item) => {
          if (!item) return "";
          if (typeof item === "object") {
            return String(item.Name || item.name || item.Location || item.location || item.Address || item.address || "").trim();
          }
          return String(item).trim();
        })
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

function ModifyPlaceAutocomplete({
  label,
  value,
  onChange,
  tripType,
  field,
  placeholder,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = inputValue.trim();

    if (!open || query.length === 0) {
      setResults([]);
      setLoading(false);

      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }

      return;
    }

    const controller = new AbortController();

    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
    }

    requestAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        if (tripType === "bus" || tripType === "buses") {
          const busCities = await searchBusCities(query);
          if (controller.signal.aborted) return;
          const normalized = (Array.isArray(busCities) ? busCities : [])
            .map((item) => {
              if (typeof item === "string") return { cityName: item, cityId: item, stateName: "" };
              return {
                cityName: item.cityName || item.CityName || item.cityNameWithState || item.name || item.description || item.label || "",
                cityId: String(item.cityId || item.CityId || item.cico_id || item.id || item.place_id || ""),
                stateName: item.stateName || item.StateName || "",
              };
            })
            .filter((item) => item.cityName);
          setResults(normalized);
        } else {
          const endpoint = new URL(PLACES_API_URL, window.location.origin);
          endpoint.searchParams.set("query", query);
          endpoint.searchParams.set("tripType", tripType);
          endpoint.searchParams.set("field", field);
          endpoint.searchParams.set("limit", "20");

          const response = await fetch(endpoint.toString(), {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Place API failed with status ${response.status}`);
          }

          const payload = await response.json();
          const rawList = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.value)
              ? payload.value
              : [];

          const normalized = rawList
            .map((item) => ({
              cityName: typeof item === "string" ? item : item?.cityName || "",
            }))
            .filter((item) => item.cityName);

          setResults(normalized);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [field, inputValue, open, tripType]);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange(nextValue);
    setOpen(nextValue.trim().length > 0);
  };

  const handleSelect = (cityName) => {
    setInputValue(cityName);
    onChange(cityName);
    setOpen(false);
  };

  return (
    <label className="bus-modify-field bus-modify-place" ref={wrapperRef}>
      <span>{label}</span>
      <div className="bus-modify-control-wrap">
        <BusFront size={18} />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(inputValue.trim().length > 0)}
          className="bus-modify-place-input with-leading-icon"
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="bus-place-dropdown">
          {loading ? (
            <div className="bus-place-meta">Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={`${item.cityName}-${item.usageCount}`}
                type="button"
                className="bus-place-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item.cityName)}
              >
                {item.cityName}
              </button>
            ))
          ) : (
            <div className="bus-place-meta">No matching places found</div>
          )}
        </div>
      )}
    </label>
  );
}

export default function BusSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const state = location.state || {};

  const initialSourceName = readValue(params, state, "source", ["from", "fromCity", "sourceCity", "origin"]) || "";
  const initialDestinationName =
    readValue(params, state, "destination", ["to", "toCity", "destinationCity", "dest"]) || "";
  const initialDepartureDateInput =
    readValue(params, state, "departureDate", ["date", "departDate", "journeyDate", "depart"]) ||
    new Date().toISOString().slice(0, 10);
  const initialTripType = readValue(params, state, "tripType", ["type"]) || "oneway";

  const [sourceName, setSourceName] = useState(initialSourceName);
  const [destinationName, setDestinationName] = useState(initialDestinationName);
  const [tripType, setTripType] = useState(initialTripType);
  const [modifyForm, setModifyForm] = useState({
    source: initialSourceName,
    destination: initialDestinationName,
    departureDate: initialDepartureDateInput,
    tripType: initialTripType,
  });

  const cachedFilters = useMemo(() => {
    try {
      const saved = sessionStorage.getItem("bus_search_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.version === 2 &&
          parsed.source === initialSourceName &&
          parsed.destination === initialDestinationName &&
          parsed.departureDate === initialDepartureDateInput
        ) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }, [initialSourceName, initialDestinationName, initialDepartureDateInput]);

  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInput(initialDepartureDateInput)
  );
  const [searchVersion, setSearchVersion] = useState(0);
  const [apiBuses, setApiBuses] = useState([]);
  const [isLoadingBuses, setIsLoadingBuses] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [sortBy, setSortBy] = useState(() => cachedFilters?.sortBy ?? "departure");
  const [sortDirection, setSortDirection] = useState(() => cachedFilters?.sortDirection ?? "asc");
  const [priceMin, setPriceMin] = useState(() => cachedFilters?.priceMin ?? 0);
  const [priceMax, setPriceMax] = useState(() => cachedFilters?.priceMax ?? 0);
  const [busTypeFilters, setBusTypeFilters] = useState(() => cachedFilters?.busTypeFilters ?? DEFAULT_BUS_TYPES);
  const [departureWindows, setDepartureWindows] = useState(() => cachedFilters?.departureWindows ?? DEFAULT_TIME_WINDOWS);
  const [arrivalWindows, setArrivalWindows] = useState(() => cachedFilters?.arrivalWindows ?? DEFAULT_TIME_WINDOWS);
  const [amenitiesFilters, setAmenitiesFilters] = useState(() => cachedFilters?.amenitiesFilters ?? DEFAULT_AMENITIES);
  const [boardingFilters, setBoardingFilters] = useState(() => cachedFilters?.boardingFilters ?? {});
  const [droppingFilters, setDroppingFilters] = useState(() => cachedFilters?.droppingFilters ?? {});
  const [travelFilters, setTravelFilters] = useState(() => cachedFilters?.travelFilters ?? {});
  const [boardingSearchText, setBoardingSearchText] = useState(() => cachedFilters?.boardingSearchText ?? "");
  const [droppingSearchText, setDroppingSearchText] = useState(() => cachedFilters?.droppingSearchText ?? "");
  const [travelSearchText, setTravelSearchText] = useState(() => cachedFilters?.travelSearchText ?? "");
  const [openFilterPanel, setOpenFilterPanel] = useState("travels");
  const [expandedCard, setExpandedCard] = useState(() => cachedFilters?.expandedCard ?? null);
  const [expandedOperatorGroups, setExpandedOperatorGroups] = useState(() => cachedFilters?.expandedOperatorGroups ?? {});
  const [seatLoadingBusId, setSeatLoadingBusId] = useState(null);

  const [activeDetailTab, setActiveDetailTab] = useState("boarding");
  const [detailsBoardingData, setDetailsBoardingData] = useState(null);
  const [loadingBoardingData, setLoadingBoardingData] = useState(false);
  const [detailsOffersData, setDetailsOffersData] = useState([]);
  const [loadingOffersData, setLoadingOffersData] = useState(false);

  useEffect(() => {
    if (expandedCard?.panel === "details" && expandedCard?.busId) {
      const targetBus = apiBuses.find((b) => b.id === expandedCard.busId);
      if (targetBus) {
        setLoadingBoardingData(true);
        getBoardingPointsProxy({
          traceId: targetBus.traceId || targetBus.TraceId || "",
          srdvIndex: targetBus.srdvIndex || targetBus.SrdvIndex || targetBus.id,
          resultIndex: targetBus.resultIndex || targetBus.ResultIndex || targetBus.id,
        })
          .then((res) => setDetailsBoardingData(res))
          .catch((err) => {
            console.warn("Failed to fetch boarding points from backend:", err);
            setDetailsBoardingData(null);
          })
          .finally(() => setLoadingBoardingData(false));

        setLoadingOffersData(true);
        getActiveOffers("Bus")
          .then((res) => {
            const list = Array.isArray(res) ? res : (res?.data || res?.offers || []);
            setDetailsOffersData(list);
          })
          .catch((err) => {
            console.warn("Failed to fetch active bus offers from backend:", err);
            setDetailsOffersData([]);
          })
          .finally(() => setLoadingOffersData(false));
      }
    }
  }, [expandedCard?.busId, expandedCard?.panel, apiBuses]);

  const didRestoreFiltersRef = useRef(false);
  useEffect(() => {
    if (cachedFilters) {
      didRestoreFiltersRef.current = true;
    } else {
      didRestoreFiltersRef.current = false;
    }
  }, [cachedFilters]);

  // Save filter state to sessionStorage whenever it changes
  useEffect(() => {
    const filterState = {
      version: 2,
      source: sourceName,
      destination: destinationName,
      departureDate: formatDateInput(selectedDate),
      sortBy,
      sortDirection,
      priceMin,
      priceMax,
      busTypeFilters,
      departureWindows,
      arrivalWindows,
      amenitiesFilters,
      boardingFilters,
      droppingFilters,
      travelFilters,
      boardingSearchText,
      droppingSearchText,
      travelSearchText,
      expandedCard,
      expandedOperatorGroups,
    };
    try {
      sessionStorage.setItem("bus_search_filters", JSON.stringify(filterState));
    } catch (e) {
      // ignore
    }
  }, [
    sourceName,
    destinationName,
    selectedDate,
    sortBy,
    sortDirection,
    priceMin,
    priceMax,
    busTypeFilters,
    departureWindows,
    arrivalWindows,
    amenitiesFilters,
    boardingFilters,
    droppingFilters,
    travelFilters,
    boardingSearchText,
    droppingSearchText,
    travelSearchText,
    expandedCard,
    expandedOperatorGroups,
  ]);
  const seatLoadingTimerRef = useRef(null);

  useEffect(() => {
    setSourceName(initialSourceName);
    setDestinationName(initialDestinationName);
    setTripType(initialTripType);
    setSelectedDate(parseDateInput(initialDepartureDateInput));
    setModifyForm({
      source: initialSourceName,
      destination: initialDestinationName,
      departureDate: initialDepartureDateInput,
      tripType: initialTripType,
    });
  }, [
    initialSourceName,
    initialDestinationName,
    initialTripType,
    initialDepartureDateInput,
  ]);

  useEffect(
    () => () => {
      if (seatLoadingTimerRef.current) {
        window.clearTimeout(seatLoadingTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    let isCurrent = true;

    async function runSearch() {
      if (!sourceName.trim() || !destinationName.trim()) {
        setApiBuses([]);
        setIsLoadingBuses(false);
        return;
      }

      setIsLoadingBuses(true);
      setSearchError("");

      const normalizeCity = (city) => {
        if (!city) return "";
        return city.trim();
      };

      try {
        const result = await searchBuses({
          from: normalizeCity(sourceName),
          to: normalizeCity(destinationName),
          date: formatDateInput(selectedDate),
        });

        if (!isCurrent) {
          return;
        }

        setApiBuses(result);
        setExpandedCard(null);
      } catch (error) {
        if (isCurrent) {
          setApiBuses([]);
          setSearchError(error.message || "Unable to load buses right now.");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingBuses(false);
        }
      }
    }

    runSearch();
    return () => {
      isCurrent = false;
    };
  }, [sourceName, destinationName, selectedDate, searchVersion]);

  const buses = useMemo(
    () =>
      apiBuses.map((bus) => {
        const rawDepartureDate =
          parseTimeValue(bus.departureTimeUtc) ||
          parseTimeValue(bus.departureTimeIst) ||
          parseTimeValue(bus.departureTime) ||
          parseTimeValue(bus.DepartureTime);
        const rawArrivalDate =
          parseTimeValue(bus.arrivalTimeUtc) ||
          parseTimeValue(bus.arrivalTimeIst) ||
          parseTimeValue(bus.arrivalTime) ||
          parseTimeValue(bus.ArrivalTime);
        const durationMinutes = getDurationInMinutes(bus);
        const departureDate =
          applyTimeToDate(selectedDate, rawDepartureDate) || selectedDate;
        const arrivalDate =
          resolveArrivalDate(departureDate, rawArrivalDate, durationMinutes) ||
          selectedDate;

        return {
          id: bus.id,
          busNumber: bus.busNumber || "--",
          operatorName: bus.operatorName || "Unknown Travels",
          busType: bus.busType || "Bus Service",
          fromCity: bus.fromCity || sourceName,
          toCity: bus.toCity || destinationName,
          boardingPoint: bus.boardingPoint || sourceName,
          droppingPoint: bus.droppingPoint || destinationName,
          boardingPoints:
            Array.isArray(bus.boardingPoints) && bus.boardingPoints.length > 0
              ? bus.boardingPoints
              : [bus.boardingPoint || sourceName],
          droppingPoints:
            Array.isArray(bus.droppingPoints) && bus.droppingPoints.length > 0
              ? bus.droppingPoints
              : [bus.droppingPoint || destinationName],
          departureDate: departureDate || selectedDate,
          arrivalDate: arrivalDate || selectedDate,
          departureHour: departureDate ? departureDate.getHours() : 0,
          arrivalHour: arrivalDate ? arrivalDate.getHours() : 0,
          departureSortValue: departureDate ? departureDate.getTime() : 0,
          arrivalSortValue: arrivalDate ? arrivalDate.getTime() : 0,
          departureTime: formatTime(departureDate),
          arrivalTime: formatTime(arrivalDate),
          durationMinutes: durationMinutes ?? 0,
          duration: formatDuration(durationMinutes),
          fare: Number(bus.displayFare || bus.fare || bus.DisplayFare || bus.Price?.[0]?.PublishedFare || bus.priceInr || 0) || 0,
          availableSeats: Number(bus.availableSeats ?? bus.AvailableSeats ?? bus.seatsAvailable ?? 0) || 0,
          totalSeats: Number(bus.totalSeats || bus.availableSeats) || 0,
          resultIndex: bus.resultIndex || "",
          traceId: bus.traceId || "",
          srdvIndex: bus.srdvIndex || 0,
          priceList: bus.priceList || [],
          cancellationPolicies: bus.cancellationPolicies || [],
          amenities: bus.amenities || [],
          isAC: bus.isAC || false,
          isSleeper: bus.isSleeper || false,
          isSeater: bus.isSeater || false,
          tags: getBusTags(bus.busType),
        };
      }),
    [apiBuses, sourceName, destinationName, selectedDate]
  );

  const priceFloor = 0;
  const maxFare = useMemo(() => {
    if (!buses || buses.length === 0) return 20000;
    const max = Math.max(...buses.map((bus) => Number(bus.fare) || 0));
    return max > 0 ? Math.ceil(max) : 20000;
  }, [buses]);

  const isPriceRangeDisabled = maxFare <= priceFloor;
  const priceRangeSpread = Math.max(1, maxFare - priceFloor);
  const priceMinPercent = Math.min(100, Math.max(0, ((priceMin - priceFloor) / priceRangeSpread) * 100));
  const priceMaxPercent = Math.min(100, Math.max(0, ((priceMax - priceFloor) / priceRangeSpread) * 100));

  useEffect(() => {
    if (!priceMax || priceMax <= priceFloor || priceMax > maxFare || !didRestoreFiltersRef.current) {
      setPriceMin(priceFloor);
      setPriceMax(maxFare);
    }
  }, [maxFare]);

  const boardingList = useMemo(
    () => uniqueSortedValues(buses.map((bus) => bus.boardingPoints || bus.boardingPoint)),
    [buses]
  );
  const droppingList = useMemo(
    () => uniqueSortedValues(buses.map((bus) => bus.droppingPoints || bus.droppingPoint)),
    [buses]
  );
  const travelList = useMemo(
    () => uniqueSortedValues(buses.map((bus) => bus.operatorName)),
    [buses]
  );

  useEffect(() => {
    setBoardingFilters((previous) => createToggleMap(boardingList, previous));
  }, [boardingList]);

  useEffect(() => {
    setDroppingFilters((previous) => createToggleMap(droppingList, previous));
  }, [droppingList]);

  useEffect(() => {
    setTravelFilters((previous) => createToggleMap(travelList, previous));
  }, [travelList]);

  const filteredBuses = useMemo(() => {
    const activeTypes = Object.keys(busTypeFilters || {}).filter((key) => busTypeFilters[key]);
    const activeBoarding = Object.keys(boardingFilters || {}).filter((key) => boardingFilters[key]);
    const activeDropping = Object.keys(droppingFilters || {}).filter((key) => droppingFilters[key]);
    const activeTravels = Object.keys(travelFilters || {}).filter((key) => travelFilters[key]).map(k => String(k).trim().toLowerCase());
    const activeAmenities = Object.keys(amenitiesFilters || {}).filter((key) => amenitiesFilters[key]);
    const hasActiveDepartureWindow = TIME_WINDOWS.some(
      (window) => Boolean(departureWindows?.[window.key])
    );
    const hasActiveArrivalWindow = TIME_WINDOWS.some(
      (window) => Boolean(arrivalWindows?.[window.key])
    );

    const getPointNames = (points, singlePoint) => {
      const list = Array.isArray(points) && points.length > 0 ? points : [singlePoint];
      return list.map((item) => {
        if (!item) return "";
        if (typeof item === "object") {
          return String(item.Name || item.name || item.Location || item.location || item.Address || item.address || "").trim();
        }
        return String(item).trim();
      }).filter(Boolean);
    };

    const result = buses.filter((bus) => {
      const busFare = Number(bus.fare) || 0;
      if (priceMin > priceFloor && busFare < priceMin) {
        return false;
      }
      if (priceMax > priceFloor && priceMax < maxFare && busFare > priceMax) {
        return false;
      }

      if (activeTypes.length > 0) {
        const matchesType = activeTypes.some((typeKey) => {
          if (typeKey === "ac") return bus.isAC === true;
          if (typeKey === "nonac") return bus.isAC === false;
          if (typeKey === "seater") return bus.isSeater === true || String(bus.busType).toLowerCase().includes("seater");
          if (typeKey === "sleeper") return bus.isSleeper === true || String(bus.busType).toLowerCase().includes("sleeper");
          return bus.tags?.[typeKey];
        });
        if (!matchesType) {
          return false;
        }
      }

      if (hasActiveDepartureWindow) {
        const departureMatch = TIME_WINDOWS.some((window) => {
          if (!departureWindows[window.key]) {
            return false;
          }
          return hourInWindow(bus.departureHour, window);
        });

        if (!departureMatch) {
          return false;
        }
      }

      if (hasActiveArrivalWindow) {
        const arrivalMatch = TIME_WINDOWS.some((window) => {
          if (!arrivalWindows[window.key]) {
            return false;
          }
          return hourInWindow(bus.arrivalHour, window);
        });

        if (!arrivalMatch) {
          return false;
        }
      }

      const busBoardingNames = getPointNames(bus.boardingPoints, bus.boardingPoint);
      const busDroppingNames = getPointNames(bus.droppingPoints, bus.droppingPoint);

      if (
        activeBoarding.length > 0 &&
        !activeBoarding.some((point) => busBoardingNames.includes(point))
      ) {
        return false;
      }

      if (
        activeDropping.length > 0 &&
        !activeDropping.some((point) => busDroppingNames.includes(point))
      ) {
        return false;
      }

      if (activeTravels.length > 0) {
        const busTravel = String(bus.operatorName || "").trim().toLowerCase();
        if (!activeTravels.includes(busTravel)) {
          return false;
        }
      }

      if (activeAmenities.length > 0) {
        const busAmenities = bus.amenities || {};
        const hasAllSelectedAmenities = activeAmenities.every((amenity) => {
          const amenityMap = {
            blankets: busAmenities.blankets,
            charging: busAmenities.chargingPoint,
            pillow: busAmenities.pillow,
          };
          return amenityMap[amenity];
        });

        if (!hasAllSelectedAmenities) {
          return false;
        }
      }

      return true;
    });

    const directionMultiplier = sortDirection === "desc" ? -1 : 1;

    return [...result].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "duration") {
        valA = Number(a.durationMinutes) || 0;
        valB = Number(b.durationMinutes) || 0;
      } else if (sortBy === "arrival") {
        valA = Number(a.arrivalSortValue) || 0;
        valB = Number(b.arrivalSortValue) || 0;
      } else if (sortBy === "fare") {
        valA = parseFloat(a.fare) || 0;
        valB = parseFloat(b.fare) || 0;
      } else if (sortBy === "seats") {
        valA = parseInt(a.availableSeats, 10) || 0;
        valB = parseInt(b.availableSeats, 10) || 0;
      } else {
        valA = parseFloat(a.departureSortValue) || 0;
        valB = parseFloat(b.departureSortValue) || 0;
      }

      const primaryDiff = valA - valB;
      if (primaryDiff !== 0) {
        return primaryDiff * directionMultiplier;
      }

      // Tie-breaker 1: earliest departure time
      const depDiff = (parseFloat(a.departureSortValue) || 0) - (parseFloat(b.departureSortValue) || 0);
      if (depDiff !== 0) {
        return depDiff;
      }

      // Tie-breaker 2: lowest fare
      return (parseFloat(a.fare) || 0) - (parseFloat(b.fare) || 0);
    });
  }, [
    buses,
    busTypeFilters,
    boardingFilters,
    droppingFilters,
    travelFilters,
    amenitiesFilters,
    priceMin,
    priceMax,
    departureWindows,
    arrivalWindows,
    sortBy,
    sortDirection,
  ]);

  const visibleBoarding = useMemo(() => {
    const query = boardingSearchText.trim().toLowerCase();
    return query
      ? boardingList.filter((item) => item.toLowerCase().includes(query))
      : boardingList;
  }, [boardingList, boardingSearchText]);

  const visibleDropping = useMemo(() => {
    const query = droppingSearchText.trim().toLowerCase();
    return query
      ? droppingList.filter((item) => item.toLowerCase().includes(query))
      : droppingList;
  }, [droppingList, droppingSearchText]);

  const visibleTravels = useMemo(() => {
    const query = travelSearchText.trim().toLowerCase();
    return query
      ? travelList.filter((item) => item.toLowerCase().includes(query))
      : travelList;
  }, [travelList, travelSearchText]);

  const resultItems = useMemo(() => {
    const items = [];
    const groups = new Map();

    filteredBuses.forEach((bus) => {
      const groupKey = getRtcOperatorGroupKey(bus.operatorName);

      if (!groupKey) {
        items.push({ type: "bus", bus });
        return;
      }

      if (!groups.has(groupKey)) {
        const group = {
          type: "operator-group",
          key: groupKey,
          operatorName: bus.operatorName,
          buses: [],
          minFare: bus.fare,
          totalAvailableSeats: 0,
        };

        groups.set(groupKey, group);
        items.push(group);
      }

      const group = groups.get(groupKey);
      group.buses.push(bus);
      group.minFare = Math.min(group.minFare, bus.fare);
      group.totalAvailableSeats += bus.availableSeats;
    });

    return items;
  }, [filteredBuses]);

  const tripLabel = tripType === "twoway" ? "Round Trip" : "One Way";
  const loadingSearchDetails = [
    { id: "from", label: "From", value: sourceName },
    { id: "to", label: "To", value: destinationName },
    { id: "date", label: "Departure Date", value: formatLongDate(selectedDate) },
    { id: "trip", label: "Trip Type", value: tripLabel },
    { id: "fare-scan", label: "Fare Scan", value: "Checking best operator fares" },
    { id: "seat-sync", label: "Seat Sync", value: "Syncing latest seat availability" },
  ];

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
    const nextTripType = modifyForm.tripType || "oneway";

    if (!nextSource || !nextDestination) {
      setSearchError("Source and destination are required to update search.");
      return;
    }

    setSearchError("");
    setActionMessage("");
    setSourceName(nextSource);
    setDestinationName(nextDestination);
    setTripType(nextTripType);
    setSelectedDate(parseDateInput(nextDateInput));
    setSearchVersion((previous) => previous + 1);

    const nextParams = new URLSearchParams(location.search);
    nextParams.set("source", nextSource);
    nextParams.set("destination", nextDestination);
    nextParams.set("departureDate", nextDateInput);
    nextParams.set("tripType", nextTripType);

    navigate(
      `${location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
      {
        replace: true,
        state: {
          ...state,
          source: nextSource,
          destination: nextDestination,
          departureDate: nextDateInput,
          tripType: nextTripType,
        },
      }
    );
  };

  const toggleSimpleFilter = (setter, key) => {
    setter((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const resetFilters = () => {
    setPriceMin(priceFloor);
    setPriceMax(maxFare);
    setBusTypeFilters(DEFAULT_BUS_TYPES);
    setDepartureWindows(DEFAULT_TIME_WINDOWS);
    setArrivalWindows(DEFAULT_TIME_WINDOWS);
    setAmenitiesFilters(DEFAULT_AMENITIES);
    setBoardingFilters(createToggleMap(boardingList));
    setDroppingFilters(createToggleMap(droppingList));
    setTravelFilters(createToggleMap(travelList));
    setBoardingSearchText("");
    setDroppingSearchText("");
    setTravelSearchText("");
    setSortBy("departure");
    setSortDirection("asc");
  };

  const handleSortSelect = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortDirection((previousDirection) =>
        previousDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(nextSortBy);
      setSortDirection(nextSortBy === "seats" ? "desc" : "asc");
    }
  };

  const openDetailCard = (busId, panel) => {
    setActiveDetailTab("boarding");
    setExpandedCard((previous) => {
      if (previous && previous.busId === busId && previous.panel === panel) {
        return null;
      }
      return { busId, panel };
    });
  };

  const toggleOperatorGroup = (groupKey) => {
    setExpandedOperatorGroups((previous) => ({
      ...previous,
      [groupKey]: !previous[groupKey],
    }));
  };

  const openBooking = (bus) => {
    if (seatLoadingBusId || bus.availableSeats <= 0) {
      return;
    }

    if (expandedCard?.busId === bus.id && expandedCard?.panel === "seats") {
      setExpandedCard(null);
      return;
    }

    if (seatLoadingTimerRef.current) {
      window.clearTimeout(seatLoadingTimerRef.current);
      seatLoadingTimerRef.current = null;
    }

    setActionMessage("");
    setSeatLoadingBusId(bus.id);

    const searchContext = {
      source: sourceName,
      destination: destinationName,
      departureDate: formatDateInput(selectedDate),
      tripType,
    };

    seatLoadingTimerRef.current = window.setTimeout(() => {
      setExpandedCard({
        busId: bus.id,
        panel: "seats",
        searchContext,
      });
      setSeatLoadingBusId(null);
      seatLoadingTimerRef.current = null;
    }, 1100);
  };

  const subtractMinutes = (timeStr, mins) => {
    try {
      const parts = timeStr.split(" ");
      const time = parts[0];
      const modifier = parts[1] || "";
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
      
      let date = new Date();
      date.setHours(hours, minutes - mins, 0, 0);
      
      let newHours = date.getHours();
      let newMinutes = date.getMinutes();
      let newModifier = newHours >= 12 ? "PM" : "AM";
      newHours = newHours % 12;
      if (newHours === 0) newHours = 12;
      
      return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")} ${newModifier}`;
    } catch (max) {
      return timeStr;
    }
  };

  const resolveOperatorLogo = (operatorName) => {
    const name = String(operatorName || "").toLowerCase();
    let bgColor = "#e0f2fe"; // default blue
    let textColor = "#0284c7";
    let letter = name.charAt(0).toUpperCase();

    if (name.includes("morning")) {
      bgColor = "#fff7ed"; // orange
      textColor = "#ea580c";
    } else if (name.includes("atlas")) {
      bgColor = "#f0fdf4"; // green
      textColor = "#16a34a";
    } else if (name.includes("metro")) {
      bgColor = "#faf5ff"; // purple
      textColor = "#9333ea";
    } else if (name.includes("picknbook")) {
      bgColor = "#fef2f2"; // red
      textColor = "#dc1e26";
    }

    return (
      <div className="operator-logo-img" style={{
        width: "40px",
        height: "40px",
        borderRadius: "8px",
        background: bgColor,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "850",
        fontSize: "18px",
        border: "1px solid rgba(0,0,0,0.06)",
        flexShrink: 0
      }}>
        {letter}
      </div>
    );
  };

  const renderPromotionalBanner = () => (
    <div className="bus-promo-banner" style={{
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      borderRadius: "16px",
      padding: "20px",
      color: "#ffffff",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 10px 25px rgba(59, 130, 246, 0.15)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ zIndex: 2 }}>
        <span style={{
          background: "rgba(255, 255, 255, 0.2)",
          padding: "4px 8px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>Limited Offer</span>
        <h2 style={{ fontSize: "20px", margin: "10px 0 4px", fontWeight: "800", color: "#ffffff" }}>Save Flat 20% on Your First Bus Ride!</h2>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Use Coupon Code <strong style={{ color: "#fcd34d", fontSize: "14px" }}>FIRSTBUS</strong> at checkout.</p>
      </div>
      <div className="banner-art" style={{
        fontSize: "72px",
        opacity: 0.15,
        position: "absolute",
        right: "10px",
        bottom: "-10px",
        userSelect: "none"
      }}>
        🚌
      </div>
    </div>
  );

  const DETAIL_TABS = [
    { key: "boarding", label: "Boarding & Dropping" },
    { key: "policy", label: "Cancellation Policy" },
    { key: "amenities", label: "Amenities" },
    { key: "travel", label: "Travel Policies" },
    { key: "reviews", label: "Insights & Reviews" },
    { key: "photos", label: "Bus Photos" },
    { key: "offers", label: "Available Offers" }
  ];

  const renderBusDetailsPanel = (bus) => {
    const tab = activeDetailTab || "boarding";

    const boardingList = (
      detailsBoardingData?.BoardingPoints ||
      detailsBoardingData?.boardingPoints ||
      detailsBoardingData?.Result?.BoardingPoints ||
      bus?.boardingPoints ||
      bus?.BoardingPoints ||
      []
    ).map((p) => ({
      time: p.CityPointTime || p.time || p.Time || bus.departureTime || "",
      name: p.CityPointName || p.name || p.Name || p.locationName || bus.boardingPoint || "",
      location: p.CityPointLocation || p.location || p.Location || p.address || "",
    }));

    const droppingList = (
      detailsBoardingData?.DroppingPoints ||
      detailsBoardingData?.droppingPoints ||
      detailsBoardingData?.Result?.DroppingPoints ||
      bus?.droppingPoints ||
      bus?.DroppingPoints ||
      []
    ).map((p) => ({
      time: p.CityPointTime || p.time || p.Time || bus.arrivalTime || "",
      name: p.CityPointName || p.name || p.Name || p.locationName || bus.droppingPoint || "",
      location: p.CityPointLocation || p.location || p.Location || p.address || "",
    }));

    return (
      <div className="bus-details-expanded-card">
        <div className="bus-details-tabs-header">
          {DETAIL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveDetailTab(t.key)}
              className={`bus-details-tab-btn ${tab === t.key ? "active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bus-details-tabs-body" style={{ minHeight: "120px" }}>
          {tab === "boarding" && (
            <div className="bus-details-grid-2col">
              <div>
                <h4 className="bus-details-section-title">Boarding Points</h4>
                {loadingBoardingData ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px", padding: "12px 0" }}>
                    <Loader2 size={16} className="animate-spin" /> Fetching boarding points from backend...
                  </div>
                ) : boardingList.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {boardingList.map((bp, idx) => (
                      <div key={idx} style={{ borderLeft: "3px solid #3b82f6", paddingLeft: "12px" }}>
                        <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>{bp.time}</strong>
                        <span style={{ display: "block", fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>{bp.name}</span>
                        {bp.location && <small style={{ color: "#64748b", fontSize: "12px" }}>{bp.location}</small>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ borderLeft: "3px solid #3b82f6", paddingLeft: "12px" }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>{bus.departureTime}</strong>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>{bus.boardingPoint || bus.source || "Main Boarding Stand"}</span>
                      <small style={{ color: "#64748b", fontSize: "12px" }}>Main Bus Stand Pick-up</small>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="bus-details-section-title">Dropping Points</h4>
                {loadingBoardingData ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px", padding: "12px 0" }}>
                    <Loader2 size={16} className="animate-spin" /> Fetching dropping points from backend...
                  </div>
                ) : droppingList.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {droppingList.map((dp, idx) => (
                      <div key={idx} style={{ borderLeft: "3px solid #ef4444", paddingLeft: "12px" }}>
                        <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>{dp.time}</strong>
                        <span style={{ display: "block", fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>{dp.name}</span>
                        {dp.location && <small style={{ color: "#64748b", fontSize: "12px" }}>{dp.location}</small>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ borderLeft: "3px solid #ef4444", paddingLeft: "12px" }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>{bus.arrivalTime}</strong>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>{bus.droppingPoint || bus.destination || "Main Dropping Stand"}</span>
                      <small style={{ color: "#64748b", fontSize: "12px" }}>Main Drop-off Point</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "policy" && (
            <div>
              <h4 className="bus-details-section-title">Cancellation Charges & Timeline</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "320px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Cancellation Time</th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Refund Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>More than 24 hours before departure</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#16a34a", fontWeight: "700" }}>90% Refund</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>12 to 24 hours before departure</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#eab308", fontWeight: "700" }}>75% Refund</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>6 to 12 hours before departure</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#ea580c", fontWeight: "700" }}>50% Refund</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>Less than 6 hours before departure</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#dc2626", fontWeight: "700" }}>No Refund</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "amenities" && (
            <div>
              <h4 className="bus-details-section-title">Available Amenities</h4>
              <div className="bus-details-grid-3col">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>⚡</span> Charging Point
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>📶</span> WiFi Internet
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>💧</span> Mineral Water Bottle
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>🛌</span> Blankets & Pillow
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>💡</span> Individual Reading Lights
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>⚠️</span> First Aid Kit
                </div>
              </div>
            </div>
          )}

          {tab === "travel" && (
            <div>
              <h4 className="bus-details-section-title">Operator Travel Policies</h4>
              <ul style={{ fontSize: "13px", paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "8px", color: "#334155" }}>
                <li><strong>Luggage:</strong> Each passenger is allowed up to 2 items of personal luggage (max total weight 20 kg). Excess baggage may be charged.</li>
                <li><strong>ID Verification:</strong> Passengers must show a valid government-issued photo ID (Aadhaar, PAN, Passport) during boarding.</li>
                <li><strong>Onboarding Policy:</strong> Boarding closes exactly 10 minutes prior to scheduled departure. Passengers arriving late will be treated as no-show.</li>
                <li><strong>Safety Policy:</strong> Smoking, consumption of alcohol, or carry of hazardous materials is strictly prohibited inside the coach.</li>
              </ul>
            </div>
          )}

          {tab === "reviews" && (
            <div className="bus-details-grid-2col">
              <div style={{ textAlign: "center", borderRight: "1px solid #e2e8f0", paddingRight: "16px" }}>
                <div style={{ fontSize: "36px", fontWeight: "900", color: "#16a34a" }}>{bus.rating || "4.2"}</div>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>out of 5 stars</div>
                <div style={{ color: "#fbbf24", margin: "6px 0", fontSize: "18px" }}>★★★★☆</div>
                <small style={{ color: "#64748b" }}>Based on {bus.reviewCount || 124} customer reviews</small>

                <div style={{ marginTop: "12px", textAlign: "left", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>Punctuality</span>
                    <strong style={{ color: "#16a34a" }}>88%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>Cleanliness</span>
                    <strong style={{ color: "#16a34a" }}>91%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Staff Behavior</span>
                    <strong style={{ color: "#eab308" }}>82%</strong>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="bus-details-section-title">Recent Reviews</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <strong>Ramesh K.</strong>
                      <span style={{ color: "#16a34a" }}>★★★★★</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#475569" }}>"The bus was on-time and the seats were exceptionally clean. Best sleeper coach experience."</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <strong>Sruthi M.</strong>
                      <span style={{ color: "#fbbf24" }}>★★★★☆</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#475569" }}>"Comfortable journey. Charging point was functioning properly. Staff was helpful."</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "photos" && (
            <div>
              <h4 className="bus-details-section-title">Bus Gallery</h4>
              <div className="bus-details-photos-grid">
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={busExteriorImg} alt="Luxury Bus Exterior" style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "8px 10px", fontSize: "12px", background: "#f8fafc", fontWeight: "600", color: "#334155" }}>Coach Exterior</div>
                </div>
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={busSleeperImg} alt="Luxury Sleeper Berths" style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "8px 10px", fontSize: "12px", background: "#f8fafc", fontWeight: "600", color: "#334155" }}>Sleeper Berths</div>
                </div>
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={busSeatsImg} alt="Reclining Seats" style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "8px 10px", fontSize: "12px", background: "#f8fafc", fontWeight: "600", color: "#334155" }}>Comfortable Seating</div>
                </div>
              </div>
            </div>
          )}

          {tab === "offers" && (
            <div>
              <h4 className="bus-details-section-title">Available Offers & Coupons</h4>
              {loadingOffersData ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px", padding: "12px 0" }}>
                  <Loader2 size={16} className="animate-spin" /> Loading active backend offers...
                </div>
              ) : detailsOffersData.length > 0 ? (
                <div className="bus-details-grid-2col">
                  {detailsOffersData.map((offer, idx) => (
                    <div key={idx} style={{ border: "1.5px dashed #16a34a", borderRadius: "10px", padding: "12px", background: "#f0fdf4", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <strong style={{ color: "#15803d", fontSize: "13px" }}>{offer.title || offer.offerTitle || "Special Offer"}</strong>
                      <span style={{ fontSize: "12px", color: "#334155" }}>{offer.description || offer.offerDescription || "Save on your booking."}</span>
                      {(offer.code || offer.couponCode) && (
                        <div style={{ background: "#16a34a", color: "#fff", padding: "3px 8px", borderRadius: "4px", fontWeight: "800", fontSize: "11px", width: "fit-content", letterSpacing: "1px", marginTop: "4px" }}>
                          CODE: {offer.code || offer.couponCode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bus-details-grid-2col">
                  <div style={{ border: "1.5px dashed #16a34a", borderRadius: "10px", padding: "12px", background: "#f0fdf4", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "#15803d", fontSize: "13px" }}>Flat Rs. 50 Discount</strong>
                    <span style={{ fontSize: "12px" }}>Get flat Rs. 50 off on this booking. Valid on all seats.</span>
                    <div style={{ background: "#16a34a", color: "#fff", padding: "3px 8px", borderRadius: "4px", fontWeight: "800", fontSize: "11px", width: "fit-content", letterSpacing: "1px", marginTop: "4px" }}>CODE: PNB50</div>
                  </div>
                  <div style={{ border: "1.5px dashed #3b82f6", borderRadius: "10px", padding: "12px", background: "#eff6ff", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "#1d4ed8", fontSize: "13px" }}>First Bus Booking Offer</strong>
                    <span style={{ fontSize: "12px" }}>Save up to 20% on your first booking with PickNBook.</span>
                    <div style={{ background: "#3b82f6", color: "#fff", padding: "3px 8px", borderRadius: "4px", fontWeight: "800", fontSize: "11px", width: "fit-content", letterSpacing: "1px", marginTop: "4px" }}>CODE: FIRSTBUS</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBusCard = (bus, className = "") => (
    <article className={`bus-result-card ${className}`.trim()} key={bus.id}>
      <div className="bus-operator-cell" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {resolveOperatorLogo(bus.operatorName)}
        <div>
          <h4 style={{ margin: 0, fontSize: "14.5px" }}>{bus.operatorName}</h4>
          <p style={{ margin: "2px 0 0", fontSize: "12px" }}>{bus.busType}</p>
          <small style={{ display: "block", marginTop: "2px" }}>Bus No: {bus.busNumber}</small>
        </div>
      </div>

      <div className="bus-depart-cell">
        <strong>{bus.departureTime}</strong>
        <span>{formatShortDate(bus.departureDate)}</span>
        <p>{bus.boardingPoint}</p>
      </div>

      <div className="bus-duration-cell">
        <span>{bus.duration}</span>
        <div className="duration-dash">
          <i />
        </div>
      </div>

      <div className="bus-arrive-cell">
        <strong>{bus.arrivalTime}</strong>
        <span>{formatShortDate(bus.arrivalDate)}</span>
        <p>{bus.droppingPoint}</p>
      </div>

      <div className="bus-fare-cell">
        <span>Starts from</span>
        <strong>{formatCurrency(bus.fare)}</strong>
      </div>

      <div className="bus-seat-cell">
        <strong>{bus.availableSeats} Seats Available</strong>
        <span>Total {bus.totalSeats}</span>
      </div>

      <div className="bus-action-cell">
        <button
          type="button"
          className="subtle"
          onClick={() => openDetailCard(bus.id, "details")}
        >
          {expandedCard?.busId === bus.id && expandedCard?.panel === "details" ? "Hide Details" : "Bus Details"}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => openBooking(bus)}
          disabled={bus.availableSeats <= 0 || Boolean(seatLoadingBusId)}
        >
          {seatLoadingBusId === bus.id ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Loading Seats...</span>
            </>
          ) : expandedCard?.busId === bus.id && expandedCard?.panel === "seats" ? (
            "Hide Seat"
          ) : (
            "View Seats"
          )}
        </button>
      </div>

      {expandedCard?.busId === bus.id && (
        <div className="flow-modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="flow-modal" style={{ width: '95vw', maxWidth: '1200px', height: '90vh', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <header className="flow-modal-header" style={{ flexShrink: 0 }}>
              <h3>{expandedCard.panel === "seats" ? "Select Seats" : expandedCard.panel === "details" ? "Bus Details" : "Details"}</h3>
              <button type="button" onClick={() => setExpandedCard(null)} aria-label="Close modal">
                &times;
              </button>
            </header>
            <div className="flow-modal-main" style={{ flex: '1 1 0', overflowY: 'auto', overflowX: 'hidden', padding: 0, position: 'relative', background: 'var(--bus-bg, #F3F4F6)' }}>
              {expandedCard.panel === "details" ? (
                <div style={{ padding: '16px' }}>{renderBusDetailsPanel(bus)}</div>
              ) : expandedCard.panel === "boarding" ? (
                <div style={{ padding: '16px' }}>
                  <p>
                    Boarding: <strong>{bus.boardingPoint}</strong> | Dropping:{" "}
                    <strong>{bus.droppingPoint}</strong>
                  </p>
                </div>
              ) : expandedCard.panel === "policy" ? (
                <div style={{ padding: '16px' }}>
                  <p>
                    Free cancellation available up to 6 hours before departure. Partial refund
                    may apply afterwards.
                  </p>
                </div>
              ) : (
                <div style={{ position: 'relative', minHeight: '600px' }}>
                  <BusSeatSelectionPage
                    embedded
                    embeddedState={{
                      bus,
                      searchContext: expandedCard.searchContext,
                    }}
                    onClose={() => setExpandedCard(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {seatLoadingBusId === bus.id && (
        <div className="bus-seat-loading-panel" aria-live="polite">
          <div className="bus-seat-loading-bars">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </article>
  );

  return (
    <main className="bus-results-page">
      <div className="bus-results-shell">
        <section className="bus-search-summary">
          <div className="bus-search-card">
            <ModifyPlaceAutocomplete
              label="From"
              value={modifyForm.source}
              onChange={(nextValue) =>
                setModifyForm((previous) => ({
                  ...previous,
                  source: nextValue,
                }))
              }
              tripType="bus"
              field="from"
              placeholder="Source"
            />

            <button
              type="button"
              className="bus-modify-swap"
              onClick={handleSwapModifyCities}
              aria-label="Swap source and destination"
            >
              <ArrowLeftRight size={20} />
            </button>

            <ModifyPlaceAutocomplete
              label="To"
              value={modifyForm.destination}
              onChange={(nextValue) =>
                setModifyForm((previous) => ({
                  ...previous,
                  destination: nextValue,
                }))
              }
              tripType="bus"
              field="to"
              placeholder="Destination"
            />

            <label className="bus-modify-field bus-modify-date">
              <span>Date</span>
              <div className="bus-modify-control-wrap">
                <CalendarDays size={18} />
                <input
                  type="text"
                  readOnly
                  value={formatDdMmYyyy(modifyForm.departureDate)}
                  placeholder="DD/MM/YYYY"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const hiddenInput = document.getElementById("bus-date-hidden");
                    if (hiddenInput) {
                      try {
                        hiddenInput.showPicker();
                      } catch (err) {
                        hiddenInput.click();
                      }
                    }
                  }}
                />
                <input
                  id="bus-date-hidden"
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
              </div>
            </label>

            <button type="button" className="bus-modify-btn" onClick={handleApplyModifySearch}>
              Modify Search
            </button>
          </div>
        </section>

        {searchError && (
          <div className="bus-feedback error">
            <XCircle size={16} />
            <span>{searchError}</span>
          </div>
        )}

        {actionMessage && (
          <div className="bus-feedback success">
            <CheckCircle2 size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        <section className="bus-promo-scroller" aria-label="Travel booking highlights">
          {BUS_PROMO_ITEMS.map((item) => (
            <article className="bus-promo-chip" key={item.id}>
              <span className="bus-promo-icon" aria-hidden="true">
                <item.icon size={16} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </article>
          ))}
        </section>        {isLoadingBuses ? (
          <section className="bus-loading-screen" aria-live="polite" aria-busy="true">
            <div className="bus-map-animation">
              <svg viewBox="0 0 1000 500" className="bus-map-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef3eb" />
                      <stop offset="40%" stopColor="#F3F4F6" />
                      <stop offset="100%" stopColor="#ffeee4" />
                    </linearGradient>
                    <linearGradient id="roadFill" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fcd5c8" />
                      <stop offset="100%" stopColor="#f9c0ac" />
                    </linearGradient>
                    <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#dc1e26" />
                      <stop offset="50%" stopColor="#ff6b3d" />
                      <stop offset="100%" stopColor="#b8141b" />
                    </linearGradient>
                    <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffdd57" />
                      <stop offset="70%" stopColor="#ffcc33" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow3"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="pinShadow"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#dc1e26" floodOpacity="0.3" /></filter>
                  </defs>


                  {/* Sun */}
                  <g className="bus-sun">
                    <circle cx="920" cy="60" r="50" fill="url(#sunGrad)" />
                    <circle cx="920" cy="60" r="24" fill="#ffcc33" opacity="0.8" />
                    {[0,45,90,135,180,225,270,315].map((a,i) => (
                      <line key={`r-${i}`} x1="920" y1="60"
                        x2={920+Math.cos(a*Math.PI/180)*55} y2={60+Math.sin(a*Math.PI/180)*55}
                        stroke="#ffcc33" strokeWidth="1.5" opacity="0.3" className="bus-sun-ray" />
                    ))}
                  </g>

                  {/* Mountains */}
                  <polygon points="0,350 80,200 160,280 240,180 340,260 420,190 500,300 580,220 660,280 740,200 820,260 900,210 1000,320 1000,500 0,500" fill="#fde8dc" opacity="0.4" />
                  <polygon points="0,380 100,280 200,320 300,250 400,310 500,260 600,330 700,270 800,330 900,280 1000,360 1000,500 0,500" fill="#fce0d0" opacity="0.35" />

                  {/* Clouds */}
                  <g className="bus-cloud bus-cloud-1" opacity="0.35">
                    <ellipse cx="120" cy="70" rx="50" ry="16" fill="#fff" /><ellipse cx="148" cy="60" rx="34" ry="14" fill="#fff" />
                  </g>
                  <g className="bus-cloud bus-cloud-2" opacity="0.3">
                    <ellipse cx="480" cy="50" rx="45" ry="14" fill="#fff" /><ellipse cx="510" cy="42" rx="30" ry="12" fill="#fff" />
                  </g>
                  <g className="bus-cloud bus-cloud-3" opacity="0.25">
                    <ellipse cx="720" cy="80" rx="38" ry="12" fill="#fff" /><ellipse cx="745" cy="72" rx="25" ry="10" fill="#fff" />
                  </g>

                  {/* Birds */}
                  <g className="bus-birds bus-birds-1" opacity="0.3">
                    <path d="M 200 110 Q 205 104,210 110 Q 215 104,220 110" fill="none" stroke="#1f2a44" strokeWidth="1.5" />
                    <path d="M 230 105 Q 234 100,238 105 Q 242 100,246 105" fill="none" stroke="#1f2a44" strokeWidth="1.2" />
                  </g>
                  <g className="bus-birds bus-birds-2" opacity="0.25">
                    <path d="M 650 90 Q 654 85,658 90 Q 662 85,666 90" fill="none" stroke="#1f2a44" strokeWidth="1.3" />
                    <path d="M 675 95 Q 678 91,681 95 Q 684 91,687 95" fill="none" stroke="#1f2a44" strokeWidth="1" />
                  </g>

                  {/* Snake Road */}
                  <path id="snakeRoad" d="M 80 120 C 200 120,280 200,220 240 C 140 290,100 310,180 340 C 300 380,450 280,520 310 C 600 340,550 380,650 390 C 750 400,800 360,850 370 C 900 380,910 400,910 410" fill="none" stroke="url(#roadFill)" strokeWidth="22" strokeLinecap="round" opacity="0.45" />
                  <path d="M 80 120 C 200 120,280 200,220 240 C 140 290,100 310,180 340 C 300 380,450 280,520 310 C 600 340,550 380,650 390 C 750 400,800 360,850 370 C 900 380,910 400,910 410" fill="none" stroke="#f9c4b2" strokeWidth="2.5" strokeDasharray="10 8" strokeLinecap="round" />
                  <path d="M 80 120 C 200 120,280 200,220 240 C 140 290,100 310,180 340 C 300 380,450 280,520 310 C 600 340,550 380,650 390 C 750 400,800 360,850 370 C 900 380,910 400,910 410" fill="none" stroke="url(#trailGrad)" strokeWidth="3" strokeLinecap="round" className="bus-route-trail" />

                  {/* Palm Trees */}
                  {[[30,160],[310,200],[170,370],[460,260],[700,350],[580,430],[850,340],[120,130]].map(([x,y],i) => (
                    <g key={`p-${i}`} className={`bus-palm bus-palm-${i%4}`} opacity="0.45">
                      <rect x={x-1.5} y={y} width="3" height="22" rx="1.5" fill="#8b6b4a" />
                      <path d={`M ${x} ${y-2} Q ${x-18} ${y-18},${x-24} ${y-8}`} fill="none" stroke="#3da85c" strokeWidth="3" strokeLinecap="round" />
                      <path d={`M ${x} ${y-2} Q ${x+18} ${y-18},${x+24} ${y-8}`} fill="none" stroke="#4abe6a" strokeWidth="3" strokeLinecap="round" />
                      <path d={`M ${x} ${y-4} Q ${x-10} ${y-24},${x-16} ${y-16}`} fill="none" stroke="#48c76e" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={`M ${x} ${y-4} Q ${x+10} ${y-24},${x+16} ${y-16}`} fill="none" stroke="#3da85c" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                  ))}

                  {/* Buildings */}
                  {[[80,280],[380,230],[690,290],[820,310],[550,370]].map(([x,y],i) => (
                    <g key={`b-${i}`} opacity="0.18">
                      <rect x={x} y={y} width={12+i*2} height={18+i*3} rx="2" fill="#e8a88c" />
                      <rect x={x+2} y={y+3} width="3" height="3" rx="0.5" fill="#fff" />
                      <rect x={x+7} y={y+3} width="3" height="3" rx="0.5" fill="#fff" />
                      <rect x={x+2} y={y+9} width="3" height="3" rx="0.5" fill="#fff" />
                    </g>
                  ))}

                  {/* Origin (top-left) */}
                  <g filter="url(#pinShadow)">
                    <g className="bus-landmark bus-landmark-origin">
                      <rect x="54" y="70" width="52" height="4" rx="2" fill="#dc1e26" opacity="0.7" />
                      <rect x="68" y="62" width="24" height="12" rx="2" fill="#dc1e26" opacity="0.6" />
                      <polygon points="80,58 87,65 73,65" fill="#dc1e26" opacity="0.8" />
                      <rect x="73" y="74" width="3" height="9" fill="#dc1e26" opacity="0.5" />
                      <rect x="84" y="74" width="3" height="9" fill="#dc1e26" opacity="0.5" />
                    </g>
                    <circle cx="80" cy="120" r="18" fill="#fff" stroke="#dc1e26" strokeWidth="3" />
                    <circle cx="80" cy="120" r="7" fill="#dc1e26" className="bus-map-pulse" />
                    <text x="80" y="152" textAnchor="middle" fill="#1f2a44" fontSize="13" fontWeight="900" fontFamily="inherit">{sourceName}</text>
                    <text x="80" y="165" textAnchor="middle" fill="#dc1e26" fontSize="8" fontWeight="800" letterSpacing="2" fontFamily="inherit">START</text>
                  </g>

                  {/* Milestone 1 - Fort */}
                  <g className="bus-milestone bus-milestone-1">
                    <rect x="210" y="196" width="20" height="24" rx="2" fill="#f9a88c" />
                    <rect x="207" y="193" width="5" height="7" rx="1" fill="#f9a88c" /><rect x="226" y="193" width="5" height="7" rx="1" fill="#f9a88c" />
                    <rect x="217" y="203" width="6" height="7" rx="1" fill="#fff" opacity="0.8" />
                    <circle cx="220" cy="220" r="5" fill="#fff" stroke="#dc1e26" strokeWidth="1.5" /><circle cx="220" cy="220" r="2" fill="#dc1e26" />
                  </g>
                  {/* Milestone 2 - Mosque */}
                  <g className="bus-milestone bus-milestone-2">
                    <ellipse cx="180" cy="318" rx="12" ry="7" fill="#f9a88c" />
                    <rect x="171" y="320" width="18" height="14" rx="1" fill="#f9a88c" />
                    <ellipse cx="180" cy="314" rx="4" ry="7" fill="#fbc4af" />
                    <circle cx="180" cy="309" r="2" fill="#dc1e26" />
                    <circle cx="180" cy="340" r="5" fill="#fff" stroke="#dc1e26" strokeWidth="1.5" /><circle cx="180" cy="340" r="2" fill="#dc1e26" />
                  </g>
                  {/* Milestone 3 - Gateway */}
                  <g className="bus-milestone bus-milestone-3">
                    <rect x="510" y="286" width="5" height="20" rx="1" fill="#f9a88c" /><rect x="535" y="286" width="5" height="20" rx="1" fill="#f9a88c" />
                    <path d="M 510 288 Q 525 275,540 288" fill="none" stroke="#f9a88c" strokeWidth="3.5" />
                    <circle cx="525" cy="278" r="3" fill="#dc1e26" opacity="0.6" />
                    <circle cx="525" cy="310" r="5" fill="#fff" stroke="#dc1e26" strokeWidth="1.5" /><circle cx="525" cy="310" r="2" fill="#dc1e26" />
                  </g>
                  {/* Milestone 4 - Tower */}
                  <g className="bus-milestone bus-milestone-4">
                    <rect x="644" y="386" width="14" height="24" rx="2" fill="#f9a88c" />
                    <polygon points="651,381 660,390 642,390" fill="#f9a88c" />
                    <rect x="647" y="394" width="7" height="4" rx="1" fill="#fff" opacity="0.6" />
                    <circle cx="651" cy="410" r="5" fill="#fff" stroke="#dc1e26" strokeWidth="1.5" /><circle cx="651" cy="410" r="2" fill="#dc1e26" />
                  </g>

                  {/* Destination (bottom-right) */}
                  <g filter="url(#pinShadow)">
                    <g className="bus-landmark bus-landmark-dest">
                      <rect x="884" y="370" width="52" height="5" rx="2" fill="#b8141b" opacity="0.7" />
                      <path d="M 894 370 Q 910 354,926 370" fill="none" stroke="#b8141b" strokeWidth="3" opacity="0.8" />
                      <rect x="892" y="370" width="3.5" height="11" fill="#b8141b" opacity="0.5" />
                      <rect x="924" y="370" width="3.5" height="11" fill="#b8141b" opacity="0.5" />
                    </g>
                    <circle cx="910" cy="410" r="18" fill="#fff" stroke="#b8141b" strokeWidth="3" />
                    <circle cx="910" cy="410" r="7" fill="#b8141b" className="bus-map-pulse" />
                    <text x="910" y="442" textAnchor="middle" fill="#1f2a44" fontSize="13" fontWeight="900" fontFamily="inherit">{destinationName}</text>
                    <text x="910" y="455" textAnchor="middle" fill="#b8141b" fontSize="8" fontWeight="800" letterSpacing="2" fontFamily="inherit">END</text>
                  </g>

                  {/* Opposing Traffic */}
                  <g className="bus-traffic bus-traffic-1">
                    <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                      <mpath href="#snakeRoad" />
                    </animateMotion>
                    <rect x="-12" y="-14" width="24" height="12" rx="4" fill="#5b9bd5" opacity="0.55" />
                    <rect x="-8" y="-12" width="6" height="5" rx="1" fill="#fff" opacity="0.7" />
                    <rect x="1" y="-12" width="6" height="5" rx="1" fill="#fff" opacity="0.7" />
                    <circle cx="-6" cy="0" r="2.5" fill="#333" opacity="0.5" /><circle cx="6" cy="0" r="2.5" fill="#333" opacity="0.5" />
                  </g>
                  <g className="bus-traffic bus-traffic-2">
                    <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="2s">
                      <mpath href="#snakeRoad" />
                    </animateMotion>
                    <rect x="-10" y="-14" width="20" height="11" rx="5" fill="#4caf50" opacity="0.5" />
                    <rect x="-6" y="-12" width="5" height="4" rx="1" fill="#fff" opacity="0.6" />
                    <circle cx="-5" cy="-1" r="2.5" fill="#333" opacity="0.4" /><circle cx="5" cy="-1" r="2.5" fill="#333" opacity="0.4" />
                  </g>
                  <g className="bus-traffic bus-traffic-3">
                    <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="3.5s">
                      <mpath href="#snakeRoad" />
                    </animateMotion>
                    <rect x="-14" y="-14" width="28" height="12" rx="3" fill="#ff9800" opacity="0.45" />
                    <rect x="-14" y="-14" width="10" height="10" rx="2" fill="#ffb74d" opacity="0.5" />
                    <circle cx="-8" cy="0" r="3" fill="#333" opacity="0.4" /><circle cx="8" cy="0" r="3" fill="#333" opacity="0.4" />
                  </g>

                  {/* Main Bus */}
                  <g className="bus-map-vehicle" filter="url(#glow3)">
                    <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.25 0.1 0.25 1">
                      <mpath href="#snakeRoad" />
                    </animateMotion>
                    <rect x="-22" y="-11" width="44" height="22" rx="6" fill="#dc1e26" />
                    <rect x="-18" y="-8" width="12" height="10" rx="2" fill="#fff" opacity="0.9" />
                    <rect x="-3" y="-8" width="12" height="10" rx="2" fill="#fff" opacity="0.9" />
                    <circle cx="-14" cy="13" r="4" fill="#1f2a44" /><circle cx="12" cy="13" r="4" fill="#1f2a44" />
                    <circle cx="-14" cy="13" r="1.8" fill="#fff" /><circle cx="12" cy="13" r="1.8" fill="#fff" />
                    <rect x="18" y="-4" width="4" height="6" rx="1.5" fill="#ffd700" opacity="0.85" />
                  </g>

                  {/* Route Label */}
                  {(() => {
                    const routeText = `${sourceName} → ${destinationName}`;
                    const calculatedWidth = Math.max(160, Math.min(520, routeText.length * 8.5 + 36));
                    const calculatedX = 470 - calculatedWidth / 2;
                    return (
                      <g className="bus-route-label">
                        <rect
                          x={calculatedX}
                          y="155"
                          width={calculatedWidth}
                          height="30"
                          rx="15"
                          fill="#fff"
                          stroke="#fcd5c8"
                          strokeWidth="1.5"
                          opacity="0.9"
                        />
                        <text
                          x="470"
                          y="175"
                          textAnchor="middle"
                          fill="#dc1e26"
                          fontSize="10.5"
                          fontWeight="800"
                          fontFamily="inherit"
                        >
                          {routeText}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
          </section>
        ) : (
          <div className="bus-results-layout">
            <aside className="bus-filters-rail">
              <header className="bus-filters-header">
                <div>
                  <Filter size={14} />
                  <span>Filters</span>
                </div>
                <button type="button" onClick={resetFilters}>
                  <RotateCw size={13} />
                  Reset
                </button>
              </header>

              <section className="bus-filter-card">
                <h3 className="bus-price-title">
                  <IndianRupee size={17} />
                  <strong>Price</strong> Range
                </h3>
                <div
                  className="bus-price-slider"
                  style={{
                    "--range-min": `${priceMinPercent}%`,
                    "--range-max": `${priceMaxPercent}%`,
                  }}
                >
                  <div className="bus-range-stack">
                    <span className="bus-range-track" />
                    <input
                      type="range"
                      min={priceFloor}
                      max={maxFare}
                      value={priceMin}
                      disabled={isPriceRangeDisabled}
                      onChange={(event) =>
                        setPriceMin(
                          Math.max(
                            priceFloor,
                            Math.min(Number(event.target.value), priceMax)
                          )
                        )
                      }
                    />
                    <input
                      type="range"
                      min={priceFloor}
                      max={maxFare}
                      value={priceMax}
                      disabled={isPriceRangeDisabled}
                      onChange={(event) =>
                        setPriceMax(
                          Math.min(
                            maxFare,
                            Math.max(Number(event.target.value), priceMin)
                          )
                        )
                      }
                    />
                  </div>
                  <div className="bus-range-endpoints">
                    <span>{formatCurrency(priceMin)}</span>
                    <span>{formatCurrency(priceMax)}</span>
                  </div>
                </div>
              </section>

              <section className="bus-filter-card">
                <h3>Bus Type</h3>
                <div className="bus-type-grid">
                  {BUS_TYPE_FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`bus-type-chip ${busTypeFilters[item.key] ? "active" : ""}`}
                      onClick={() => toggleSimpleFilter(setBusTypeFilters, item.key)}
                    >
                      <item.icon size={22} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bus-filter-card">
                <h3>Departure Time</h3>
                <div className="time-chip-grid">
                  {TIME_WINDOWS.map((window) => (
                    <button
                      key={window.key}
                      type="button"
                      className={`time-chip ${departureWindows[window.key] ? "active" : ""}`}
                      onClick={() => toggleSimpleFilter(setDepartureWindows, window.key)}
                    >
                      <window.icon size={15} />
                      <span>{window.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bus-filter-card">
                <h3>Arrival Time</h3>
                <div className="time-chip-grid">
                  {TIME_WINDOWS.map((window) => (
                    <button
                      key={window.key}
                      type="button"
                      className={`time-chip ${arrivalWindows[window.key] ? "active" : ""}`}
                      onClick={() => toggleSimpleFilter(setArrivalWindows, window.key)}
                    >
                      <window.icon size={15} />
                      <span>{window.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bus-filter-card">
                <h3>Amenities</h3>
                <div className="amenities-grid">
                  {AMENITIES.map((amenity) => (
                    <label
                      key={amenity.key}
                      className={`amenity-checkbox ${amenitiesFilters[amenity.key] ? "checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(amenitiesFilters[amenity.key])}
                        onChange={() => toggleSimpleFilter(setAmenitiesFilters, amenity.key)}
                      />
                      <span className="checkbox-icon">
                        <amenity.icon size={18} />
                      </span>
                      <span className="checkbox-label">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className={`bus-filter-card bus-collapse-card ${openFilterPanel === "travels" ? "open" : ""}`}>
                <button
                  type="button"
                  className="bus-collapse-head"
                  onClick={() => setOpenFilterPanel(openFilterPanel === "travels" ? "" : "travels")}
                >
                  <span>Travels</span>
                  <ChevronDown size={16} />
                </button>
                {openFilterPanel === "travels" && (
                  <div className="bus-collapse-body">
                    <div className="point-search">
                      <input
                        type="text"
                        value={travelSearchText}
                        onChange={(event) => setTravelSearchText(event.target.value)}
                        placeholder="Search here"
                      />
                      <Search size={20} />
                    </div>
                    <div className="point-list">
                      {visibleTravels.map((name) => (
                        <label
                          key={name}
                          className={`point-row ${travelFilters[name] ? "active" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(travelFilters[name])}
                            onChange={() => toggleSimpleFilter(setTravelFilters, name)}
                          />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className={`bus-filter-card bus-collapse-card ${openFilterPanel === "boarding" ? "open" : ""}`}>
                <button
                  type="button"
                  className="bus-collapse-head"
                  onClick={() => setOpenFilterPanel(openFilterPanel === "boarding" ? "" : "boarding")}
                >
                  <span>Boarding Point</span>
                  <ChevronDown size={16} />
                </button>
                {openFilterPanel === "boarding" && (
                  <div className="bus-collapse-body">
                    <div className="point-search">
                      <input
                        type="text"
                        value={boardingSearchText}
                        onChange={(event) => setBoardingSearchText(event.target.value)}
                        placeholder="Search here"
                      />
                      <Search size={20} />
                    </div>
                    <div className="point-list">
                      {visibleBoarding.map((point) => (
                        <label
                          key={point}
                          className={`point-row ${boardingFilters[point] ? "active" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(boardingFilters[point])}
                            onChange={() => toggleSimpleFilter(setBoardingFilters, point)}
                          />
                          <span>{point}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className={`bus-filter-card bus-collapse-card ${openFilterPanel === "dropping" ? "open" : ""}`}>
                <button
                  type="button"
                  className="bus-collapse-head"
                  onClick={() => setOpenFilterPanel(openFilterPanel === "dropping" ? "" : "dropping")}
                >
                  <span>Dropping Point</span>
                  <ChevronDown size={16} />
                </button>
                {openFilterPanel === "dropping" && (
                  <div className="bus-collapse-body">
                    <div className="point-search">
                      <input
                        type="text"
                        value={droppingSearchText}
                        onChange={(event) => setDroppingSearchText(event.target.value)}
                        placeholder="Search here"
                      />
                      <Search size={20} />
                    </div>
                    <div className="point-list">
                      {visibleDropping.map((point) => (
                        <label
                          key={point}
                          className={`point-row ${droppingFilters[point] ? "active" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(droppingFilters[point])}
                            onChange={() => toggleSimpleFilter(setDroppingFilters, point)}
                          />
                          <span>{point}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </aside>

            <section className="bus-results-column">
              {renderPromotionalBanner()}
              <header className="bus-sort-strip">
                <div className="bus-found-count">
                  <strong>{filteredBuses.length} Buses</strong> found
                </div>
                <div className="sort-controls">
                  <span>Sort by:</span>
                  <div className="sort-control-list">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={sortBy === option.key ? "active" : ""}
                        onClick={() => handleSortSelect(option.key)}
                        aria-label={
                          sortBy === option.key
                            ? sortDirection === "asc"
                              ? `Sort by ${option.label} ascending`
                              : `Sort by ${option.label} descending`
                            : `Sort by ${option.label}`
                        }
                      >
                        <option.icon size={17} />
                        <span>{option.label}</span>
                        <span className="sort-direction-arrow" aria-hidden="true">
                          {sortBy === option.key && sortDirection === "desc" ? "\u2193" : "\u2191"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              <div className="bus-card-list">
                {!sourceName.trim() || !destinationName.trim() ? (
                  <div className="bus-empty-state">
                    <Search size={18} />
                    <p>Please enter both source and destination cities to search for buses.</p>
                  </div>
                ) : filteredBuses.length === 0 ? (
                  <div className="bus-empty-state">
                    <ShieldAlert size={18} />
                    <p>No buses match the selected filters.</p>
                  </div>
                ) : (
                  resultItems.map((item) => {
                    if (item.type === "bus") {
                      return renderBusCard(item.bus);
                    }

                    const isExpanded = Boolean(expandedOperatorGroups[item.key]);
                    const busLabel =
                      item.buses.length === 1 ? "1 Bus Available" : `${item.buses.length} Buses Available`;

                    return (
                      <div className="operator-group-block" key={item.key}>
                        <article className="operator-group-card">
                          <div className="operator-group-icon" aria-hidden="true">
                            <BusFront size={24} />
                          </div>

                          <div className="operator-group-copy">
                            <h4>{item.operatorName}</h4>
                            <p>{busLabel}</p>
                          </div>

                          <button
                            type="button"
                            className="operator-group-toggle"
                            onClick={() => toggleOperatorGroup(item.key)}
                          >
                            {isExpanded ? "Hide" : "View All"}
                          </button>

                          <strong className="operator-group-fare">
                            {formatCurrency(item.minFare)}
                          </strong>

                        </article>

                        {isExpanded && (
                          <div className="operator-group-buses">
                            {item.buses.map((bus) =>
                              renderBusCard(bus, "operator-group-bus-card")
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
