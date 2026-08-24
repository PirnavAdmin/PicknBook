/* eslint-disable */
/**
 * SearchWidget.js — Standalone search widget extracted from HomePage.
 * Uses identical CSS classes (search-panel, tabs, tab, trip-chip, etc.)
 * and imports HomePage.css so it looks exactly the same.
 * Used by both B2BBookingEngine and can be dropped into any page.
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  BedDouble,
  Building2,
  Bus,
  CalendarDays,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toDisplayDate } from "../utils/apiDateFormat";
import "../STYLES/HomePage.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS = [
  "Economy",
  "Premium Economy",
  "Business",
  "Premium Business",
  "First Class",
];

const FLIGHT_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Two Way" },
  { value: "multicity", label: "Multi City" },
];

const BUS_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Two Way" },
];

const USE_DIRECT_API_IN_DEV =
  String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() === "true";
const IS_LOCAL_DEV =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const PLACES_API_URL =
  IS_LOCAL_DEV && !USE_DIRECT_API_IN_DEV
    ? "/api/Places"
    : process.env.REACT_APP_PLACES_API_URL || "/api/Places";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTravellerSummary(adults, children, infants) {
  if (adults === 0 && children === 0 && infants === 0) return "";
  const parts = [];
  if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? "s" : ""}`);
  if (children > 0) parts.push(`${children} Child${children !== 1 ? "ren" : ""}`);
  if (infants > 0) parts.push(`${infants} Infant${infants !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

function formatHotelGuestSummary(rooms, adults, children) {
  if (rooms === 0 && adults === 0) return "";
  const parts = [];
  if (rooms > 0) parts.push(`${rooms} Room${rooms !== 1 ? "s" : ""}`);
  if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? "s" : ""}`);
  if (children > 0) parts.push(`${children} Child${children !== 1 ? "ren" : ""}`);
  return parts.join(", ");
}

function createMultiCityLeg(from = "", to = "", offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return {
    id: Date.now() + Math.random(),
    from,
    to,
    departureDate: offsetDays > 0 ? d.toISOString().split("T")[0] : "",
  };
}

// ─── PlaceAutocomplete ────────────────────────────────────────────────────────

function PlaceAutocomplete({ label, value, onChange, tripType, field, placeholder, className, error, onSelectOption }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => { setInputValue((prev) => (prev !== (value || "") ? (value || "") : prev)); }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = inputValue.trim();
    if (!open || query.length === 0) {
      setResults((prev) => (prev.length === 0 ? prev : []));
      setLoading((prev) => (prev ? false : prev));
      if (requestAbortRef.current) requestAbortRef.current.abort();
      return;
    }

    const controller = new AbortController();
    if (requestAbortRef.current) requestAbortRef.current.abort();
    requestAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {

          const endpoint = new URL(PLACES_API_URL, window.location.origin);
          endpoint.searchParams.set("query", query);
          endpoint.searchParams.set("tripType", tripType === "hotel" ? "all" : tripType);
          endpoint.searchParams.set("field", field);
          endpoint.searchParams.set("limit", "20");

          const response = await fetch(endpoint.toString(), { signal: controller.signal });
          if (!response.ok) throw new Error(`Places API ${response.status}`);
          const payload = await response.json();
          const rawList = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
          const normalized = rawList
            .map((item) => ({ 
               cityName: typeof item === "string" ? item : item?.cityName || "", 
               cityId: typeof item === "object" ? String(item.cityId || item.CityId || item.cico_id || item.id || item.place_id || "") : "",
               usageCount: typeof item === "object" && item?.usageCount ? item.usageCount : 0 
            }))
            .filter((item) => item.cityName);
          setResults(normalized);
      } catch (err) {
        if (err.name !== "AbortError") {
          setResults((prev) => (prev.length === 0 ? prev : []));
        }
      } finally {
        if (!controller.signal.aborted) setLoading((prev) => (prev ? false : prev));
      }
    }, 220);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [inputValue, open, tripType, field]);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInputValue(v);
    if (typeof onChange === "function") {
      onChange(v);
    }
    setOpen(v.trim().length > 0);
  };

  const handleSelect = (item) => {
    const name = typeof item === "string" ? item : item.cityName;
    setInputValue(name);
    onChange(name, item.cityId);
    setOpen(false);
  };

  return (
    <div className={`field place-autocomplete ${className || ""}`} ref={wrapperRef}>
      <label>{label}</label>
      <div className="control-wrap">
        {tripType === "flight" ? <Plane size={18} /> : tripType === "hotel" ? <Building2 size={18} /> : <Bus size={18} />}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(inputValue.trim().length > 0)}
          className="field-control place-input with-leading-icon"
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {error && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4, display: "block" }}>{error}</span>}
      {open && (
        <div className={tripType === "bus" || tripType === "buses" ? "bus-place-dropdown" : "place-dropdown"}>
          {loading ? (
            <div className={tripType === "bus" || tripType === "buses" ? "bus-place-meta" : "place-meta"}>Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={`${item.cityName}-${item.usageCount}`}
                type="button"
                className={tripType === "bus" || tripType === "buses" ? "bus-place-option" : "place-option"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                {item.cityName}
              </button>
            ))
          ) : (
            <div className={tripType === "bus" || tripType === "buses" ? "bus-place-meta" : "place-meta"}>No matching places found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SearchWidget (main export) ───────────────────────────────────────────────

/**
 * Props:
 *   defaultTab: "flights" | "buses" | "hotels"  (default: "flights")
 *   showTabBar: boolean  (default: true)
 */
export default function SearchWidget({ defaultTab = "flights", showTabBar = true }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(defaultTab);

  // ── Flight state ──
  const [flightTripType, setFlightTripType] = useState("oneway");
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightFromError, setFlightFromError] = useState("");
  const [flightToError, setFlightToError] = useState("");
  const [flightDepartureDate, setFlightDepartureDate] = useState("");
  const [flightReturnDate, setFlightReturnDate] = useState("");
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState("");
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const travellerFieldRef = useRef(null);
  const classFieldRef = useRef(null);
  const [multiCityLegs, setMultiCityLegs] = useState(() => [
    createMultiCityLeg("", "", 0),
    createMultiCityLeg("", "", 2),
  ]);

  // ── Bus state ──
  const [busTripType, setBusTripType] = useState("oneway");
  const [busFrom, setBusFrom] = useState("");
  const [busTo, setBusTo] = useState("");
  const [busFromError, setBusFromError] = useState("");
  const [busToError, setBusToError] = useState("");
  const [busDepartureDate, setBusDepartureDate] = useState("");
  const [busReturnDate, setBusReturnDate] = useState("");

  // ── Hotel state ──
  const [hotelDestination, setHotelDestination] = useState("");
  const [hotelCityId, setHotelCityId] = useState("");
  const [hotelDestinationError, setHotelDestinationError] = useState("");
  const [hotelCheckInDate, setHotelCheckInDate] = useState("");
  const [hotelCheckOutDate, setHotelCheckOutDate] = useState("");
  const [hotelRooms, setHotelRooms] = useState(1);
  const [hotelAdults, setHotelAdults] = useState(1);
  const [hotelChildren, setHotelChildren] = useState(0);
  const [showHotelGuestsDropdown, setShowHotelGuestsDropdown] = useState(false);
  const hotelGuestsFieldRef = useRef(null);

  // ── Click outside to close dropdowns ──
  useEffect(() => {
    const handler = (e) => {
      if (travellerFieldRef.current && !travellerFieldRef.current.contains(e.target)) setShowTravellerDropdown(false);
      if (hotelGuestsFieldRef.current && !hotelGuestsFieldRef.current.contains(e.target)) setShowHotelGuestsDropdown(false);
      if (classFieldRef.current && !classFieldRef.current.contains(e.target)) setShowClassDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setShowTravellerDropdown(false);
    setShowHotelGuestsDropdown(false);
    setShowClassDropdown(false);
  }, [activeTab, flightTripType]);

  // ── Derived ──
  const isFlightTwoWay = flightTripType === "twoway";
  const isBusTwoWay = busTripType === "twoway";
  const travellerSummary = formatTravellerSummary(adults, children, infants);
  const hasTravellerSelection = Boolean(travellerSummary);
  const hotelGuestSummary = formatHotelGuestSummary(hotelRooms, hotelAdults, hotelChildren);
  const hasHotelGuestSelection = Boolean(hotelGuestSummary);

  // ── Handlers ──
  const handleSwapFlights = () => { const t = flightFrom; setFlightFrom(flightTo); setFlightTo(t); };
  const handleSwapBuses = () => { const t = busFrom; setBusFrom(busTo); setBusTo(t); };

  const changeAdults = (delta) => {
    setAdults((prev) => {
      const next = Math.min(9, Math.max(0, prev + delta));
      if (next === 0) { setChildren(0); setInfants(0); }
      setInfants((pi) => Math.min(pi, next));
      return next;
    });
  };
  const changeChildren = (delta) => setChildren((p) => Math.min(8, Math.max(0, p + delta)));
  const changeInfants = (delta) => setInfants((p) => Math.max(0, Math.min(adults, p + delta)));
  const changeHotelRooms = (delta) => setHotelRooms((p) => Math.min(8, Math.max(1, p + delta)));
  const changeHotelAdults = (delta) => setHotelAdults((p) => Math.min(16, Math.max(1, p + delta)));
  const changeHotelChildren = (delta) => setHotelChildren((p) => Math.min(8, Math.max(0, p + delta)));

  const updateMultiCityLeg = (id, field, val) =>
    setMultiCityLegs((prev) => prev.map((leg) => (leg.id === id ? { ...leg, [field]: val } : leg)));

  const addMultiCityLeg = () =>
    setMultiCityLegs((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, createMultiCityLeg(last?.to || "", "", prev.length + 1)];
    });

  const removeMultiCityLeg = (id) =>
    setMultiCityLegs((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));

  const handleFlightFromChange = (v) => { setFlightFrom(v); if (v.trim()) setFlightFromError(""); };
  const handleFlightToChange = (v) => { setFlightTo(v); if (v.trim()) setFlightToError(""); };
  const handleBusFromChange = (v) => { setBusFrom(v); if (v.trim()) setBusFromError(""); };
  const handleBusToChange = (v) => { setBusTo(v); if (v.trim()) setBusToError(""); };
  const handleHotelDestinationChange = (v, id) => { setHotelDestination(v); if (id) setHotelCityId(id); if (v.trim()) setHotelDestinationError(""); };

  // ── Navigation helpers ──
  const navigateTo = (path, payload) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => { if (typeof v === "string" && v.trim()) params.set(k, v.trim()); });
    navigate(`${path}${params.toString() ? `?${params.toString()}` : ""}`, { state: payload });
  };

  const handleSearch = () => {
    if (activeTab === "hotels") {
      if (!hotelDestination.trim()) { setHotelDestinationError("Destination city is required."); return; }
      if (hotelRooms === 0 || hotelAdults === 0) { alert("Please select at least 1 room and 1 adult."); return; }
      setHotelDestinationError("");
      navigateTo("/search/hotels", {
        destination: hotelDestination.trim(),
        cityId: hotelCityId,
        checkInDate: hotelCheckInDate.trim(),
        checkOutDate: hotelCheckOutDate.trim(),
        rooms: String(hotelRooms),
        adults: String(hotelAdults),
        children: String(hotelChildren),
        guests: hotelGuestSummary,
      });
      return;
    }

    if (activeTab === "flights") {
      const isMultiCity = flightTripType === "multicity";
      let hasError = false;
      if (isMultiCity) {
        multiCityLegs.forEach((leg) => { if (!leg.from.trim() || !leg.to.trim()) hasError = true; });
        if (hasError) { alert("Please fill all source and destination cities for multi-city legs."); return; }
      } else {
        if (!flightFrom.trim()) { setFlightFromError("Source city is required."); hasError = true; } else setFlightFromError("");
        if (!flightTo.trim()) { setFlightToError("Destination city is required."); hasError = true; } else setFlightToError("");
        if (hasError) return;
      }
      if (!cabinClass) { alert("Please select a cabin class."); return; }

      const source = isMultiCity ? multiCityLegs[0]?.from || "" : flightFrom;
      const destination = isMultiCity ? multiCityLegs[multiCityLegs.length - 1]?.to || "" : flightTo;
      const departureDate = isMultiCity ? multiCityLegs[0]?.departureDate || "" : flightDepartureDate;

      navigateTo("/search/flights", {
        source: source.trim(),
        destination: destination.trim(),
        tripType: flightTripType,
        departureDate: departureDate.trim(),
        returnDate: flightTripType === "twoway" ? flightReturnDate.trim() : "",
        travellers: travellerSummary,
        cabinClass,
        ...(isMultiCity ? { legs: JSON.stringify(multiCityLegs) } : {}),
      });
      return;
    }

    // Bus
    const fromVal = busFrom.trim();
    const toVal = busTo.trim();
    let hasError = false;
    if (!fromVal) { setBusFromError("Source city is required."); hasError = true; } else setBusFromError("");
    if (!toVal) { setBusToError("Destination city is required."); hasError = true; } else setBusToError("");
    if (hasError) return;
    navigateTo("/search/buses", {
      source: fromVal,
      destination: toVal,
      tripType: busTripType,
      departureDate: busDepartureDate.trim(),
      returnDate: busTripType === "twoway" ? busReturnDate.trim() : "",
    });
  };

  // ─── Traveller field JSX ───
  const travellerField = (
    <div className="field traveller-field" ref={travellerFieldRef}>
      <label>Travellers</label>
      <button type="button" className={`traveller-trigger ${showTravellerDropdown ? "open" : ""}`} onClick={() => setShowTravellerDropdown((p) => !p)}>
        <span className={`traveller-summary ${hasTravellerSelection ? "" : "placeholder"}`}>
          <Users size={16} />
          <span>{hasTravellerSelection ? travellerSummary : "Select travellers"}</span>
        </span>
        <ChevronDown size={16} className={`traveller-caret ${showTravellerDropdown ? "open" : ""}`} />
      </button>
      {showTravellerDropdown && (
        <div className="traveller-dropdown">
          {[
            { label: "Adults", sub: "12 years and above", val: adults, change: changeAdults, min: 0 },
            { label: "Child", sub: "2 to 11 years", val: children, change: changeChildren, min: 0 },
            { label: "Infant", sub: "Under 2 years", val: infants, change: changeInfants, min: 0 },
          ].map(({ label, sub, val, change, min }) => (
            <div key={label} className="counter-row">
              <div className="counter-copy"><strong>{label}</strong><span>{sub}</span></div>
              <div className="counter-box">
                <button type="button" onClick={() => change(-1)} disabled={val <= min}><Minus size={14} /></button>
                <span>{val}</span>
                <button type="button" onClick={() => change(1)}><Plus size={14} /></button>
              </div>
            </div>
          ))}
          <button type="button" className="traveller-done" onClick={() => setShowTravellerDropdown(false)}>Done</button>
        </div>
      )}
    </div>
  );

  // ─── Class field JSX ───
  const classField = (
    <div className="field class-field" ref={classFieldRef}>
      <label>Class</label>
      <button type="button" className={`traveller-trigger ${showClassDropdown ? "open" : ""}`} onClick={() => setShowClassDropdown((p) => !p)}>
        <span className={`traveller-summary ${cabinClass ? "" : "placeholder"}`}>
          <Plane size={16} />
          <span>{cabinClass || "Select class"}</span>
        </span>
        <ChevronDown size={16} className={`traveller-caret ${showClassDropdown ? "open" : ""}`} />
      </button>
      {showClassDropdown && (
        <div className="traveller-dropdown class-dropdown">
          <ul className="class-options-list">
            {CLASS_OPTIONS.map((item) => (
              <li key={item}>
                <button type="button" className={`class-option-btn ${cabinClass === item ? "selected" : ""}`} onClick={() => { setCabinClass(item); setShowClassDropdown(false); }}>{item}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // ─── Hotel guest field JSX ───
  const hotelGuestField = (
    <div className="field traveller-field hotel-guests-field" ref={hotelGuestsFieldRef}>
      <label>Rooms &amp; Guests</label>
      <button type="button" className={`traveller-trigger ${showHotelGuestsDropdown ? "open" : ""}`} onClick={() => setShowHotelGuestsDropdown((p) => !p)}>
        <span className={`traveller-summary ${!hasHotelGuestSelection ? "placeholder" : ""}`}>
          <BedDouble size={16} />
          <span>{hotelGuestSummary || "SELECT ROOMS & GUESTS..."}</span>
        </span>
        <ChevronDown size={16} className={`traveller-caret ${showHotelGuestsDropdown ? "open" : ""}`} />
      </button>
      {showHotelGuestsDropdown && (
        <div className="traveller-dropdown hotel-guests-dropdown">
          {[
            { label: "Rooms", sub: "Hotel rooms required", val: hotelRooms, change: changeHotelRooms, min: 1 },
            { label: "Adults", sub: "12 years and above", val: hotelAdults, change: changeHotelAdults, min: 1 },
            { label: "Children", sub: "0 to 11 years", val: hotelChildren, change: changeHotelChildren, min: 0 },
          ].map(({ label, sub, val, change, min }) => (
            <div key={label} className="counter-row">
              <div className="counter-copy"><strong>{label}</strong><span>{sub}</span></div>
              <div className="counter-box">
                <button type="button" onClick={() => change(-1)} disabled={val <= min}><Minus size={14} /></button>
                <span>{val}</span>
                <button type="button" onClick={() => change(1)}><Plus size={14} /></button>
              </div>
            </div>
          ))}
          <button type="button" className="traveller-done" onClick={() => setShowHotelGuestsDropdown(false)}>Done</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="homepage homepage-flights" style={{ background: "transparent" }}>
      <style>{`
        .search-widget-wrap .search-panel {
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important;
          border-radius: 16px !important;
        }
        .search-widget-wrap .search-panel .tabs {
          background: #f3f4f6 !important;
          border-color: #e5e7eb !important;
        }
        .search-widget-wrap .search-panel .tab {
          color: #4b5563 !important;
          opacity: 1 !important;
        }
        .search-widget-wrap .search-panel .tab:hover {
          background: #e5e7eb !important;
        }
        .search-widget-wrap .search-panel .tab.active {
          background: #ffffff !important;
          color: #1f2937 !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12) !important;
        }
        .search-widget-wrap .search-panel label {
          color: #6b7280 !important;
        }
        .search-widget-wrap .search-panel .control-wrap {
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          color: #1f2937 !important;
        }
        .search-widget-wrap .search-panel .field-control {
          color: #1f2937 !important;
          background: transparent !important;
        }
        .search-widget-wrap .search-panel .traveller-trigger {
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          color: #1f2937 !important;
        }
        .search-widget-wrap .search-panel .trip-chip {
          color: #6b7280 !important;
          border: 1px solid #e5e7eb !important;
          background: transparent !important;
        }
        .search-widget-wrap .search-panel .trip-chip.active {
          background: #1f2937 !important;
          color: #ffffff !important;
          border-color: #1f2937 !important;
        }
        .search-widget-wrap .search-panel .search-btn {
          background: #2563eb !important;
          color: #fff !important;
        }
        .search-widget-wrap .search-panel .search-btn:hover {
          background: #1d4ed8 !important;
        }
      `}</style>

      <div className="search-widget-wrap">
        <div className={`search-panel ${activeTab === "flights" && flightTripType === "multicity" ? "multicity-active" : ""}`}>

          {showTabBar && (
            <div className="tabs-wrap">
              <div className="tabs" role="tablist">
                <button type="button" className={`tab ${activeTab === "flights" ? "active" : ""}`} onClick={() => setActiveTab("flights")}>
                  <Plane size={17} /><span>Flights</span>
                </button>
                <button type="button" className={`tab ${activeTab === "buses" ? "active" : ""}`} onClick={() => setActiveTab("buses")}>
                  <Bus size={17} /><span>Buses</span>
                </button>
                <button type="button" className={`tab ${activeTab === "hotels" ? "active" : ""}`} onClick={() => setActiveTab("hotels")}>
                  <Building2 size={17} /><span>Hotels</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Flights ── */}
          {activeTab === "flights" && (
            <div className="booking-content">
              <div className="trip-switch" role="tablist">
                {FLIGHT_TRIP_TYPES.map((t) => (
                  <button key={t.value} type="button" className={`trip-chip ${flightTripType === t.value ? "active" : ""}`} onClick={() => setFlightTripType(t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {flightTripType === "multicity" ? (
                <div className="multi-city-list">
                  {multiCityLegs.map((leg, idx) => (
                    <div className="multi-city-row" key={leg.id}>
                      <PlaceAutocomplete label={`Leg ${idx + 1} – From`} value={leg.from} onChange={(v) => updateMultiCityLeg(leg.id, "from", v)} tripType="flight" field="from" placeholder="Source" />
                      <PlaceAutocomplete label={`Leg ${idx + 1} – To`} value={leg.to} onChange={(v) => updateMultiCityLeg(leg.id, "to", v)} tripType="flight" field="to" placeholder="Destination" />
                      <div className="field field-with-icon" style={{ position: "relative" }}>
                        <label>Departure</label>
                        <div className="control-wrap">
                          <CalendarDays size={18} />
                          <input type="text" readOnly value={toDisplayDate(leg.departureDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById(`sw-leg-dep-${leg.id}`).showPicker?.()} />
                        </div>
                        <input id={`sw-leg-dep-${leg.id}`} type="date" value={leg.departureDate} onChange={(e) => updateMultiCityLeg(leg.id, "departureDate", e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                      </div>
                      <div className="multi-actions">
                        <button type="button" className="action-circle action-add" onClick={addMultiCityLeg} title="Add row"><Plus size={16} /></button>
                        <button type="button" className="action-circle action-delete" onClick={() => removeMultiCityLeg(leg.id)} title="Remove row" disabled={multiCityLegs.length === 1}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="multi-footer-row">{travellerField}{classField}</div>
                </div>
              ) : (
                <div className={`search-grid standard-grid ${isFlightTwoWay ? "two-way" : "one-way"}`}>
                  <PlaceAutocomplete label="Source" value={flightFrom} onChange={handleFlightFromChange} tripType="flight" field="from" placeholder="Source" error={flightFromError} className="source-field" />
                  <div className="swap-field">
                    <button type="button" className="swap-btn" onClick={handleSwapFlights} aria-label="Swap"><ArrowLeftRight size={16} /></button>
                  </div>
                  <PlaceAutocomplete label="Destination" value={flightTo} onChange={handleFlightToChange} tripType="flight" field="to" placeholder="Destination" error={flightToError} className="destination-field" />
                  <div className="field field-with-icon departure-field" style={{ position: "relative" }}>
                    <label>Departure</label>
                    <div className="control-wrap">
                      <CalendarDays size={18} />
                      <input type="text" readOnly value={toDisplayDate(flightDepartureDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-flight-dep").showPicker?.()} />
                    </div>
                    <input id="sw-flight-dep" type="date" value={flightDepartureDate} onChange={(e) => setFlightDepartureDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                  </div>
                  {isFlightTwoWay && (
                    <div className="field field-with-icon return-field" style={{ position: "relative" }}>
                      <label>Return</label>
                      <div className="control-wrap">
                        <CalendarDays size={18} />
                        <input type="text" readOnly value={toDisplayDate(flightReturnDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-flight-ret").showPicker?.()} />
                      </div>
                      <input id="sw-flight-ret" type="date" value={flightReturnDate} onChange={(e) => setFlightReturnDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                    </div>
                  )}
                  {travellerField}
                  {classField}
                </div>
              )}
            </div>
          )}

          {/* ── Buses ── */}
          {activeTab === "buses" && (
            <div className="booking-content">
              <div className={`search-grid bus-standard-grid ${isBusTwoWay ? "two-way" : "one-way"}`}>
                <PlaceAutocomplete label="Source" value={busFrom} onChange={handleBusFromChange} tripType="bus" field="from" placeholder="Source" error={busFromError} className="source-field" />
                <div className="swap-field">
                  <button type="button" className="swap-btn" onClick={handleSwapBuses} aria-label="Swap"><ArrowLeftRight size={16} /></button>
                </div>
                <PlaceAutocomplete label="Destination" value={busTo} onChange={handleBusToChange} tripType="bus" field="to" placeholder="Destination" error={busToError} className="destination-field" />
                <div className="field field-with-icon departure-field" style={{ position: "relative" }}>
                  <label>Departure</label>
                  <div className="control-wrap">
                    <CalendarDays size={18} />
                    <input type="text" readOnly value={toDisplayDate(busDepartureDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-bus-dep").showPicker?.()} />
                  </div>
                  <input id="sw-bus-dep" type="date" value={busDepartureDate} onChange={(e) => setBusDepartureDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                </div>
                {isBusTwoWay && (
                  <div className="field field-with-icon return-field" style={{ position: "relative" }}>
                    <label>Return</label>
                    <div className="control-wrap">
                      <CalendarDays size={18} />
                      <input type="text" readOnly value={toDisplayDate(busReturnDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-bus-ret").showPicker?.()} />
                    </div>
                    <input id="sw-bus-ret" type="date" value={busReturnDate} onChange={(e) => setBusReturnDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Hotels ── */}
          {activeTab === "hotels" && (
            <div className="booking-content hotel-booking-content">
              <div className="search-grid hotel-standard-grid">
                <PlaceAutocomplete label="Destination" value={hotelDestination} onChange={handleHotelDestinationChange} tripType="hotel" field="destination" placeholder="City or hotel area" error={hotelDestinationError} className="hotel-destination-field" />
                <div className="field field-with-icon checkin-field" style={{ position: "relative" }}>
                  <label>Check-in</label>
                  <div className="control-wrap">
                    <CalendarDays size={18} />
                    <input type="text" readOnly value={toDisplayDate(hotelCheckInDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-hotel-ci").showPicker?.()} />
                  </div>
                  <input id="sw-hotel-ci" type="date" value={hotelCheckInDate} onChange={(e) => setHotelCheckInDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                </div>
                <div className="field field-with-icon checkout-field" style={{ position: "relative" }}>
                  <label>Check-out</label>
                  <div className="control-wrap">
                    <CalendarDays size={18} />
                    <input type="text" readOnly value={toDisplayDate(hotelCheckOutDate)} placeholder="DD-MM-YYYY" className="field-control with-leading-icon" style={{ cursor: "pointer" }} onClick={() => document.getElementById("sw-hotel-co").showPicker?.()} />
                  </div>
                  <input id="sw-hotel-co" type="date" value={hotelCheckOutDate} onChange={(e) => setHotelCheckOutDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                </div>
                {hotelGuestField}
              </div>
            </div>
          )}

          <button type="button" className="search-btn" onClick={handleSearch}>
            <Search size={16} />
            <span>Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
