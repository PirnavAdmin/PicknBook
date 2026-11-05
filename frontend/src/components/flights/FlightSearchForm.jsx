import React, { useState, useEffect, useRef } from "react";
import {
  Plane,
  ArrowLeftRight,
  Route,
  CalendarDays,
  Users,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  Minus,
  Sparkles
} from "lucide-react";
import PlaceAutocomplete from "../PlaceAutocomplete";
import CustomDatePicker from "../CustomDatePicker";

const FLIGHT_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Round Trip" },
  { value: "multicity", label: "Multi City" },
];

const CABIN_CLASSES = [
  "Economy",
  "Premium Economy",
  "Business",
  "First Class",
];

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "DD/MM/YYYY";
  try {
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function cleanCityName(str) {
  return String(str || "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toLowerCase();
}

export default function FlightSearchForm({ onSearch, initialValues = {} }) {
  const today = getTodayString();
  const [tripType, setTripType] = useState(initialValues.tripType || "oneway");
  const [source, setSource] = useState(initialValues.source || "");
  const [destination, setDestination] = useState(initialValues.destination || "");
  const [departureDate, setDepartureDate] = useState(initialValues.departureDate || today);
  const [returnDate, setReturnDate] = useState(initialValues.returnDate || "");

  // Travellers & Class
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState("Economy");

  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [activeCalendarField, setActiveCalendarField] = useState(null);

  // Multi-City Legs
  const [multiCityLegs, setMultiCityLegs] = useState([
    { id: 1, from: "Delhi (DEL)", to: "Mumbai (BOM)", departureDate: today },
    { id: 2, from: "Mumbai (BOM)", to: "Goa (GOI)", departureDate: today },
  ]);

  // Validation Errors
  const [errors, setErrors] = useState({});

  const travellerRef = useRef(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (travellerRef.current && !travellerRef.current.contains(e.target)) {
        setShowTravellerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalTravellers = adults + children + infants;
  const travellerSummaryLabel = `${totalTravellers} Traveller${totalTravellers > 1 ? "s" : ""}, ${cabinClass}`;

  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
    setErrors((prev) => ({ ...prev, source: "", destination: "", sameCity: "" }));
  };

  const handleAddLeg = () => {
    if (multiCityLegs.length >= 5) return;
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    setMultiCityLegs((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: lastLeg ? lastLeg.to : "",
        to: "",
        departureDate: lastLeg ? lastLeg.departureDate : today,
      },
    ]);
  };

  const handleRemoveLeg = (id) => {
    if (multiCityLegs.length <= 2) return;
    setMultiCityLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const updateLeg = (id, field, value) => {
    setMultiCityLegs((prev) =>
      prev.map((leg) => (leg.id === id ? { ...leg, [field]: value } : leg))
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (tripType === "multicity") {
      multiCityLegs.forEach((leg, idx) => {
        if (!leg.from?.trim()) {
          newErrors[`leg_${idx}_from`] = `Leg ${idx + 1} Source is required.`;
        }
        if (!leg.to?.trim()) {
          newErrors[`leg_${idx}_to`] = `Leg ${idx + 1} Destination is required.`;
        }
        if (leg.from?.trim() && leg.to?.trim()) {
          if (cleanCityName(leg.from) === cleanCityName(leg.to)) {
            newErrors[`leg_${idx}_same`] = `Leg ${idx + 1} Source and Destination cannot be the same city.`;
          }
        }
        if (!leg.departureDate) {
          newErrors[`leg_${idx}_date`] = `Leg ${idx + 1} Departure Date is required.`;
        } else if (leg.departureDate < today) {
          newErrors[`leg_${idx}_date`] = `Departure date cannot be in the past.`;
        }
      });
    } else {
      // Source & Destination validation [PNB_FLT_075]
      if (!source?.trim()) {
        newErrors.source = "Source city is required.";
      }
      if (!destination?.trim()) {
        newErrors.destination = "Destination city is required.";
      }
      if (source?.trim() && destination?.trim()) {
        if (cleanCityName(source) === cleanCityName(destination)) {
          newErrors.sameCity = "Source and Destination cannot be the same city.";
        }
      }

      // Date validation [PNB_FLT_076]
      if (!departureDate) {
        newErrors.departureDate = "Departure date is required.";
      } else if (departureDate < today) {
        newErrors.departureDate = "Departure date cannot be in the past.";
      }

      if (tripType === "twoway") {
        if (!returnDate) {
          newErrors.returnDate = "Return date is required for round trip.";
        } else if (returnDate < departureDate) {
          newErrors.returnDate = "Return date must be on or after departure date.";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      tripType,
      source: tripType === "multicity" ? multiCityLegs[0]?.from : source.trim(),
      destination:
        tripType === "multicity"
          ? multiCityLegs[multiCityLegs.length - 1]?.to
          : destination.trim(),
      departureDate:
        tripType === "multicity" ? multiCityLegs[0]?.departureDate : departureDate,
      returnDate: tripType === "twoway" ? returnDate : "",
      travellers: `${totalTravellers} Traveller${totalTravellers > 1 ? "s" : ""}`,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabinClass,
      legs: tripType === "multicity" ? JSON.stringify(multiCityLegs) : "",
    };

    if (onSearch) {
      onSearch(payload);
    } else {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      window.location.href = `/search/flights?${params.toString()}`;
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 transition-all duration-300">
      {/* ── 1. Trip Type Switch Tabs with Approved Brand Red Palette [PNB_FLT_081] ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        {FLIGHT_TRIP_TYPES.map((t) => {
          const isActive = tripType === t.value;
          let IconComponent = Plane;
          if (t.value === "twoway") IconComponent = ArrowLeftRight;
          if (t.value === "multicity") IconComponent = Route;

          return (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTripType(t.value);
                setErrors({});
              }}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2 ${
                isActive
                  ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
            >
              <IconComponent size={14} className={isActive ? "text-rose-600" : "text-slate-400"} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Same City Error Alert Banner ── */}
      {errors.sameCity && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{errors.sameCity}</span>
        </div>
      )}

      {/* ── 2. Dynamic Trip Type Form Fields [PNB_FLT_079, PNB_FLT_078, PNB_FLT_077] ── */}
      {tripType === "multicity" ? (
        /* Multi-City Leg Rows */
        <div className="space-y-4">
          {multiCityLegs.map((leg, index) => (
            <div
              key={leg.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
            >
              {/* Source */}
              <div className="lg:col-span-4 min-w-0">
                <PlaceAutocomplete
                  label={`LEG ${index + 1} FROM`}
                  value={leg.from}
                  onChange={(val) => updateLeg(leg.id, "from", val)}
                  tripType="flight"
                  field="from"
                  placeholder="Source Airport"
                  error={Boolean(errors[`leg_${index}_from`])}
                />
                {errors[`leg_${index}_from`] && (
                  <p className="text-rose-500 text-xs mt-1">{errors[`leg_${index}_from`]}</p>
                )}
              </div>

              {/* Destination */}
              <div className="lg:col-span-4 min-w-0">
                <PlaceAutocomplete
                  label={`LEG ${index + 1} TO`}
                  value={leg.to}
                  onChange={(val) => updateLeg(leg.id, "to", val)}
                  tripType="flight"
                  field="to"
                  placeholder="Destination Airport"
                  error={Boolean(errors[`leg_${index}_to`])}
                />
                {errors[`leg_${index}_to`] && (
                  <p className="text-rose-500 text-xs mt-1">{errors[`leg_${index}_to`]}</p>
                )}
              </div>

              {/* Departure Date */}
              <div className="lg:col-span-3 min-w-0">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  DEPARTURE
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-slate-400"
                  onClick={() =>
                    setActiveCalendarField((prev) =>
                      prev === `leg-${leg.id}` ? null : `leg-${leg.id}`
                    )
                  }
                >
                  <CalendarDays size={16} className="text-rose-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                    {formatDateDisplay(leg.departureDate)}
                  </span>
                </div>
                {activeCalendarField === `leg-${leg.id}` && (
                  <CustomDatePicker
                    isOpen={true}
                    value={leg.departureDate}
                    minDate={today}
                    onChange={(newDate) => {
                      updateLeg(leg.id, "departureDate", newDate);
                      setActiveCalendarField(null);
                    }}
                    onClose={() => setActiveCalendarField(null)}
                  />
                )}
                {errors[`leg_${index}_date`] && (
                  <p className="text-rose-500 text-xs mt-1">{errors[`leg_${index}_date`]}</p>
                )}
              </div>

              {/* Delete Leg Button */}
              <div className="lg:col-span-1 flex items-center justify-end pb-1">
                {multiCityLegs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLeg(leg.id)}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove city leg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {errors[`leg_${index}_same`] && (
                <div className="lg:col-span-12 text-rose-500 text-xs mt-1">
                  {errors[`leg_${index}_same`]}
                </div>
              )}
            </div>
          ))}

          {/* Add Leg & Footer Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {multiCityLegs.length < 5 && (
              <button
                type="button"
                onClick={handleAddLeg}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                <span>Add Another City</span>
              </button>
            )}

            {/* Travellers & Search Controls */}
            <div className="flex flex-wrap items-center gap-3 ml-auto w-full sm:w-auto">
              {/* Travellers & Class Pill Dropdown */}
              <div className="relative min-w-0" ref={travellerRef}>
                <button
                  type="button"
                  onClick={() => setShowTravellerDropdown((prev) => !prev)}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2"
                >
                  <Users size={16} className="text-rose-600" />
                  <span className="truncate max-w-[150px]">{travellerSummaryLabel}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showTravellerDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Adults</p>
                          <p className="text-[10px] text-slate-500">12+ years</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{adults}</span>
                          <button
                            type="button"
                            onClick={() => setAdults(adults + 1)}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Children</p>
                          <p className="text-[10px] text-slate-500">2-11 years</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{children}</span>
                          <button
                            type="button"
                            onClick={() => setChildren(children + 1)}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Infants</p>
                          <p className="text-[10px] text-slate-500">Under 2 years</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInfants(Math.max(0, infants - 1))}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{infants}</span>
                          <button
                            type="button"
                            onClick={() => setInfants(Math.min(adults, infants + 1))}
                            className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cabin Class</label>
                        <select
                          value={cabinClass}
                          onChange={(e) => setCabinClass(e.target.value)}
                          className="w-full text-xs font-semibold p-2 border rounded bg-slate-50 outline-none cursor-pointer"
                        >
                          {CABIN_CLASSES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTravellerDropdown(false)}
                        className="w-full mt-2 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs rounded transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Flights Button [PNB_FLT_081] */}
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-md transition-all duration-200"
              >
                <Search size={16} />
                <span>Search Flights</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* One Way & Round Trip Balanced Responsive Grid Layout [PNB_FLT_078, PNB_FLT_077] */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Source Field: lg:col-span-3 */}
          <div className={`${tripType === "twoway" ? "lg:col-span-3" : "lg:col-span-3"} min-w-0 relative`}>
            <PlaceAutocomplete
              label="FROM"
              value={source}
              onChange={(val) => {
                setSource(val);
                setErrors((prev) => ({ ...prev, source: "", sameCity: "" }));
              }}
              tripType="flight"
              field="from"
              placeholder="Source City or Airport"
              error={Boolean(errors.source || errors.sameCity)}
            />
            {errors.source && (
              <p className="text-rose-500 text-xs mt-1">{errors.source}</p>
            )}
          </div>

          {/* Swap Button (Compact) */}
          <div className="hidden lg:flex lg:col-span-1 justify-center -mx-4 z-10">
            <button
              type="button"
              onClick={handleSwap}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center text-slate-500"
              title="Swap origin and destination"
            >
              <ArrowLeftRight size={14} />
            </button>
          </div>

          {/* Destination Field: lg:col-span-3 */}
          <div className={`${tripType === "twoway" ? "lg:col-span-3" : "lg:col-span-3"} min-w-0`}>
            <PlaceAutocomplete
              label="TO"
              value={destination}
              onChange={(val) => {
                setDestination(val);
                setErrors((prev) => ({ ...prev, destination: "", sameCity: "" }));
              }}
              tripType="flight"
              field="to"
              placeholder="Destination City or Airport"
              error={Boolean(errors.destination || errors.sameCity)}
            />
            {errors.destination && (
              <p className="text-rose-500 text-xs mt-1">{errors.destination}</p>
            )}
          </div>

          {/* Departure Date: lg:col-span-2 */}
          <div className="lg:col-span-2 min-w-0 relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              DEPARTURE
            </label>
            <div
              className={`flex items-center gap-2 px-3 py-2.5 bg-white border ${
                errors.departureDate ? "border-rose-500" : "border-slate-300"
              } rounded-lg cursor-pointer hover:border-slate-400 transition-colors`}
              onClick={() => {
                setShowTravellerDropdown(false);
                setActiveCalendarField((prev) => (prev === "departure" ? null : "departure"));
              }}
            >
              <CalendarDays size={16} className="text-rose-600 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {formatDateDisplay(departureDate)}
              </span>
            </div>
            {activeCalendarField === "departure" && (
              <CustomDatePicker
                isOpen={true}
                value={departureDate}
                minDate={today}
                onChange={(newDate) => {
                  setDepartureDate(newDate);
                  if (returnDate && newDate && returnDate < newDate) {
                    setReturnDate(newDate);
                  }
                  setErrors((prev) => ({ ...prev, departureDate: "" }));
                  setActiveCalendarField(null);
                }}
                onClose={() => setActiveCalendarField(null)}
              />
            )}
            {errors.departureDate && (
              <p className="text-rose-500 text-xs mt-1">{errors.departureDate}</p>
            )}
          </div>

          {/* Return Date (Shown only in Round Trip): lg:col-span-2 */}
          {tripType === "twoway" && (
            <div className="lg:col-span-2 min-w-0 relative">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                RETURN
              </label>
              <div
                className={`flex items-center gap-2 px-3 py-2.5 bg-white border ${
                  errors.returnDate ? "border-rose-500" : "border-slate-300"
                } rounded-lg cursor-pointer hover:border-slate-400 transition-colors`}
                onClick={() => {
                  setShowTravellerDropdown(false);
                  setActiveCalendarField((prev) => (prev === "return" ? null : "return"));
                }}
              >
                <CalendarDays size={16} className="text-rose-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                  {returnDate ? formatDateDisplay(returnDate) : "Select Date"}
                </span>
              </div>
              {activeCalendarField === "return" && (
                <CustomDatePicker
                  isOpen={true}
                  value={returnDate}
                  minDate={departureDate || today}
                  onChange={(newDate) => {
                    setReturnDate(newDate);
                    setErrors((prev) => ({ ...prev, returnDate: "" }));
                    setActiveCalendarField(null);
                  }}
                  onClose={() => setActiveCalendarField(null)}
                />
              )}
              {errors.returnDate && (
                <p className="text-rose-500 text-xs mt-1">{errors.returnDate}</p>
              )}
            </div>
          )}

          {/* Travellers & Class Pill: lg:col-span-2 / lg:col-span-3 */}
          <div
            className={`${
              tripType === "twoway" ? "lg:col-span-12 xl:col-span-8 mt-2" : "lg:col-span-2"
            } min-w-0 relative`}
            ref={travellerRef}
          >
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              TRAVELLERS &amp; CLASS
            </label>
            <div
              onClick={() => setShowTravellerDropdown((prev) => !prev)}
              className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Users size={16} className="text-rose-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={travellerSummaryLabel}>
                  {tripType === "twoway" ? travellerSummaryLabel : `${totalTravellers} Pax, ${cabinClass}`}
                </span>
              </div>
              <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
            </div>

            {showTravellerDropdown && (
              <div className="absolute left-0 lg:right-0 lg:left-auto top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Adults</p>
                      <p className="text-[10px] text-slate-500">12+ years</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Children</p>
                      <p className="text-[10px] text-slate-500">2-11 years</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Infants</p>
                      <p className="text-[10px] text-slate-500">Under 2 years</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{infants}</span>
                      <button
                        type="button"
                        onClick={() => setInfants(Math.min(adults, infants + 1))}
                        className="w-7 h-7 rounded border flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cabin Class</label>
                    <select
                      value={cabinClass}
                      onChange={(e) => setCabinClass(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border rounded bg-slate-50 outline-none cursor-pointer"
                    >
                      {CABIN_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTravellerDropdown(false)}
                    className="w-full mt-2 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Button (One Way: lg:col-span-1 / inline, Round Trip: lg:col-span-4) */}
          <div className={`${tripType === "twoway" ? "lg:col-span-12 xl:col-span-4 mt-2" : "lg:col-span-12 xl:col-span-12 mt-4"} flex items-center justify-end`}>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-8 py-3 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all duration-200"
            >
              <Search size={18} />
              <span>Search Flights</span>
            </button>
          </div>
        </div>
      )}

      {/* Popular Quick Searches */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Popular Searches:</span>
        {[
          ["Delhi (DEL)", "Mumbai (BOM)"],
          ["Bengaluru (BLR)", "Goa (GOI)"],
          ["Hyderabad (HYD)", "Chennai (MAA)"],
          ["Chennai (MAA)", "Dubai (DXB)"],
        ].map(([s, d]) => (
          <button
            key={`${s}-${d}`}
            type="button"
            onClick={() => {
              setSource(s);
              setDestination(d);
              setErrors({});
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 transition-colors"
          >
            {s.split(" ")[0]} → {d.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

