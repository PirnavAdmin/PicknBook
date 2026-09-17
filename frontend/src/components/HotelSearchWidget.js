
import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Search, Users, ChevronDown, Plus, Minus, BedDouble, Baby, MapPin } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";
import CustomDatePicker from "./CustomDatePicker";
import { getDefaultDateString } from "../utils/apiDateFormat";
import "../STYLES/HotelSearchWidget.css";

function toDisplayDate(isoString) {
  if (!isoString) return "";
  const parts = isoString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoString;
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate - inDate;
  if (diffTime <= 0) return 1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function HotelSearchWidget({
  initialDestination = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialRoomsConfig = null,
  initialInternalCityId = null,
  onSearch,
  isInline = false
}) {
  const [destination, setDestination] = useState(() => initialDestination || "");
  const [destinationError, setDestinationError] = useState("");
  const [internalCityId, setInternalCityId] = useState(() => initialInternalCityId || null);

  const [checkInDate, setCheckInDate] = useState(() => initialCheckIn || getDefaultDateString(0));
  const [checkOutDate, setCheckOutDate] = useState(() => initialCheckOut || getDefaultDateString(1));
  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const [rooms, setRooms] = useState(() => {
    if (initialRoomsConfig) {
      let parsed = null;
      if (typeof initialRoomsConfig === "string") {
        try { parsed = JSON.parse(initialRoomsConfig); } catch (e) {}
      } else if (Array.isArray(initialRoomsConfig)) {
        parsed = initialRoomsConfig;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.length;
      }
    }
    return 1;
  });

  const [adults, setAdults] = useState(() => {
    if (initialRoomsConfig) {
      let parsed = null;
      if (typeof initialRoomsConfig === "string") {
        try { parsed = JSON.parse(initialRoomsConfig); } catch (e) {}
      } else if (Array.isArray(initialRoomsConfig)) {
        parsed = initialRoomsConfig;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.reduce((sum, r) => sum + (r.adults || 0), 0);
      }
    }
    return 2;
  });

  const [children, setChildren] = useState(() => {
    if (initialRoomsConfig) {
      let parsed = null;
      if (typeof initialRoomsConfig === "string") {
        try { parsed = JSON.parse(initialRoomsConfig); } catch (e) {}
      } else if (Array.isArray(initialRoomsConfig)) {
        parsed = initialRoomsConfig;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.reduce((sum, r) => sum + (r.children || 0), 0);
      }
    }
    return 0;
  });

  const [childAges, setChildAges] = useState(() => {
    if (initialRoomsConfig) {
      let parsed = null;
      if (typeof initialRoomsConfig === "string") {
        try { parsed = JSON.parse(initialRoomsConfig); } catch (e) {}
      } else if (Array.isArray(initialRoomsConfig)) {
        parsed = initialRoomsConfig;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const ages = [];
        parsed.forEach(r => {
          if (r.childAges) ages.push(...r.childAges);
        });
        return ages;
      }
    }
    return [];
  });

  const handleRoomsChange = (newCount) => {
    setRooms(newCount);
    if (newCount === 0) {
      setAdults(0);
      setChildren(0);
      setChildAges([]);
    } else if (newCount > 0 && adults === 0) {
      setAdults(1);
    }
  };

  const handleAdultsChange = (newCount) => {
    setAdults(newCount);
    if (newCount > 0 && rooms === 0) {
      setRooms(1);
    }
  };

  const handleChildrenChange = (newCount) => {
    setChildren(newCount);
    if (newCount > 0 && rooms === 0) {
      setRooms(1);
      if (adults === 0) setAdults(1);
    }
    setChildAges(prev => {
      if (newCount > prev.length) {
        return [...prev, ...Array(newCount - prev.length).fill(4)];
      } else {
        return prev.slice(0, newCount);
      }
    });
  };

  const handleChildAgeChange = (index, age) => {
    setChildAges(prev => {
      const newAges = [...prev];
      newAges[index] = age;
      return newAges;
    });
  };

  const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
  const guestsFieldRef = useRef(null);

  const toggleGuestsDropdown = () => {
    setShowGuestsDropdown((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestsFieldRef.current && !guestsFieldRef.current.contains(event.target)) {
        setShowGuestsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (initialDestination) setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialInternalCityId) setInternalCityId(initialInternalCityId);
  }, [initialInternalCityId]);

  useEffect(() => {
    if (initialCheckIn) setCheckInDate(initialCheckIn);
  }, [initialCheckIn]);

  useEffect(() => {
    if (initialCheckOut) setCheckOutDate(initialCheckOut);
  }, [initialCheckOut]);

  const handleDestinationChange = (value, cityId) => {
    setDestination(value);
    setDestinationError("");
    if (cityId) {
      setInternalCityId(cityId);
    } else {
      setInternalCityId(null);
    }
  };

  const guestSummary = `${rooms} Room${rooms > 1 ? 's' : ''}, ${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ""}`;

  const handleSubmit = () => {
    const destVal = destination.trim();
    if (!destVal) {
      setDestinationError("Destination city is required.");
      return;
    }
    setDestinationError("");

    if (onSearch) {
      const dynamicRoomsConfig = [{
        adults: adults || 2,
        children: children || 0,
        childAges: childAges
      }];
      onSearch({
        destination: destVal,
        checkInDate,
        checkOutDate,
        rooms: String(rooms || 1),
        adults: String(adults || 2),
        children: String(children || 0),
        guests: guestSummary,
        roomsConfig: dynamicRoomsConfig,
        roomsConfigStr: JSON.stringify(dynamicRoomsConfig),
        internalCityId: internalCityId
      });
    }
  };

  // ── Sleek Hotel Capsule Search Bar (matches reference UI) ──
  return (
    <div className={`hotel-capsule-wrapper ${isInline ? "is-inline" : ""}`}>
      <div className={`hotel-capsule-searchbar ${isInline ? "is-inline" : ""}`}>
        {/* DESTINATION */}
        <div className="hotel-capsule-cell hotel-capsule-destination">
          <MapPin size={20} className="hotel-capsule-icon" color="#e51a2e" strokeWidth={1.8} />
          <div className="hotel-capsule-field">
            <PlaceAutocomplete
              label=""
              value={destination}
              onChange={handleDestinationChange}
              tripType="hotel"
              field="destination"
              placeholder="City or hotel area"
              error={destinationError}
              className="hotel-capsule-autocomplete"
              hideIcon={true}
            />
          </div>
        </div>

        <div className="hotel-capsule-divider" />

        {/* CHECK-IN */}
        <div
          className="hotel-capsule-cell hotel-capsule-date"
          style={{ position: "relative" }}
          onClick={() => setActiveDatePicker(activeDatePicker === "checkin" ? null : "checkin")}
        >
          <CalendarDays size={20} className="hotel-capsule-icon" color="#e51a2e" strokeWidth={1.8} />
          <div className="hotel-capsule-field">
            <span className="hotel-capsule-label">CHECK-IN</span>
            <span className="hotel-capsule-val">
              {toDisplayDate(checkInDate) || "DD-MM-YYYY"}
            </span>
          </div>
          <CustomDatePicker
            isOpen={activeDatePicker === "checkin"}
            onClose={() => setActiveDatePicker(null)}
            value={checkInDate}
            minDate={getDefaultDateString(0)}
            onChange={(val) => {
              setCheckInDate(val);
              setActiveDatePicker(null);
              if (!checkOutDate || checkOutDate <= val) {
                const d = new Date(val);
                d.setDate(d.getDate() + 1);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                setCheckOutDate(`${yyyy}-${mm}-${dd}`);
              }
            }}
            title="Check-in Date"
          />
        </div>

        <div className="hotel-capsule-divider" />

        {/* CHECK-OUT */}
        <div
          className="hotel-capsule-cell hotel-capsule-date"
          style={{ position: "relative" }}
          onClick={() => setActiveDatePicker(activeDatePicker === "checkout" ? null : "checkout")}
        >
          <CalendarDays size={20} className="hotel-capsule-icon" color="#e51a2e" strokeWidth={1.8} />
          <div className="hotel-capsule-field">
            <span className="hotel-capsule-label">CHECK-OUT</span>
            <span className="hotel-capsule-val">
              {toDisplayDate(checkOutDate) || "DD-MM-YYYY"}
            </span>
          </div>
          <CustomDatePicker
            isOpen={activeDatePicker === "checkout"}
            onClose={() => setActiveDatePicker(null)}
            value={checkOutDate}
            minDate={checkInDate || getDefaultDateString(0)}
            onChange={(val) => {
              setCheckOutDate(val);
              setActiveDatePicker(null);
            }}
            title="Check-out Date"
            align="right"
          />
        </div>

        <div className="hotel-capsule-divider" />

        {/* ROOMS & GUESTS */}
        <div
          className="hotel-capsule-cell hotel-capsule-guests"
          ref={guestsFieldRef}
          onClick={toggleGuestsDropdown}
        >
          <Users size={20} className="hotel-capsule-icon" color="#e51a2e" strokeWidth={1.8} />
          <div className="hotel-capsule-field">
            <span className="hotel-capsule-label">ROOMS &amp; GUESTS</span>
            <span className="hotel-capsule-val">{guestSummary}</span>
          </div>
          <ChevronDown size={16} className={`hotel-capsule-chevron ${showGuestsDropdown ? "open" : ""}`} />

          {showGuestsDropdown && (
            <GuestsDropdown
              rooms={rooms}
              adults={adults}
              children={children}
              childAges={childAges}
              onRoomsChange={handleRoomsChange}
              onAdultsChange={handleAdultsChange}
              onChildrenChange={handleChildrenChange}
              onChildAgeChange={handleChildAgeChange}
              onClose={() => setShowGuestsDropdown(false)}
              isInline={isInline}
            />
          )}
        </div>

        {/* SEARCH BUTTON */}
        <button
          type="button"
          className="hotel-capsule-btn"
          onClick={handleSubmit}
        >
          <Search size={18} strokeWidth={2.2} color="#ffffff" />
          <span>SEARCH HOTELS</span>
        </button>
      </div>

      {destinationError && (
        <span className="hotel-capsule-error-text">{destinationError}</span>
      )}
    </div>
  );
}


// Shared guests dropdown component
function GuestsDropdown({ rooms, adults, children, childAges, onRoomsChange, onAdultsChange, onChildrenChange, onChildAgeChange, onClose, isInline }) {
  return (
    <div
      className="traveller-dropdown hotel-guests-dropdown"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "290px",
        left: isInline ? "auto" : 0,
        right: isInline ? 0 : "auto",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
        padding: "16px",
        zIndex: 9999,
        background: "#ffffff",
        color: "#1e293b",
        position: "absolute",
        top: isInline ? "calc(100% + 14px)" : "calc(100% + 8px)",
      }}
    >
      {/* Rooms */}
      <GuestRow icon={<BedDouble size={18} strokeWidth={1.5} />} label="ROOMS" sub="Max 8 rooms"
        count={rooms} min={1} max={8} onChange={onRoomsChange} />
      {/* Adults */}
      <GuestRow icon={<Users size={18} strokeWidth={1.5} />} label="ADULTS" sub="13 years & above"
        count={adults} min={1} max={30} onChange={onAdultsChange} />
      {/* Children */}
      <GuestRow icon={<Baby size={18} strokeWidth={1.5} />} label="CHILDREN" sub="0 - 12 years"
        count={children} min={0} max={10} onChange={onChildrenChange} noBorder />

      {/* Child ages */}
      {children > 0 && (
        <div style={{ marginTop: "10px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Child ages</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
            {childAges.map((age, idx) => (
              <select key={idx} value={age} onChange={(e) => onChildAgeChange(idx, Number(e.target.value))}
                style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#1e293b", background: "#f8fafc" }}>
                {Array.from({ length: 13 }, (_, i) => (
                  <option key={i} value={i}>{i} yr{i !== 1 ? "s" : ""}</option>
                ))}
              </select>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
        <button type="button" onClick={onClose}
          style={{ background: "#ff0000", color: "#ffffff", border: "none", borderRadius: "8px", padding: "6px 20px",
            fontWeight: "600", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 10px rgba(220,38,38,0.3)" }}>
          Done
        </button>
      </div>
    </div>
  );
}

function GuestRow({ icon, label, sub, count, min, max, onChange, noBorder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px",
      borderBottom: noBorder ? "none" : "1px solid #e2e8f0", marginBottom: noBorder ? 0 : "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>{icon}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>{label}</span>
        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{sub}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
        <button type="button" onClick={() => onChange(Math.max(min, count - 1))} disabled={count <= min}
          style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#d32f2f", cursor: count <= min ? "not-allowed" : "pointer",
            opacity: count <= min ? 0.4 : 1, padding: 0 }}>
          <Minus size={14} strokeWidth={2} />
        </button>
        <span style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "16px", textAlign: "center", color: "#d32f2f" }}>{count}</span>
        <button type="button" onClick={() => onChange(Math.min(max, count + 1))} disabled={count >= max}
          style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#d32f2f", cursor: count >= max ? "not-allowed" : "pointer",
            opacity: count >= max ? 0.4 : 1, padding: 0 }}>
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
