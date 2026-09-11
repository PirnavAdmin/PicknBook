
import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Search, Users, ChevronDown, Plus, Minus, BedDouble, Baby, MapPin } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";
import { getDefaultDateString } from "../utils/apiDateFormat";

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

  // ── INLINE MODE (used in discover/hotel-listing page) ─────────────────────
  if (isInline) {
    return (
      <form
        className="hotel-discover-searchbar"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        style={{
          background: "#ffffff",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          borderRadius: "28px",
          padding: "8px 20px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
          boxSizing: "border-box",
          position: "relative",
          overflow: "visible"
        }}
      >
        {/* Destination */}
        <div className="hotel-discover-searchcell" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1.3 1 auto', minWidth: 0, position: 'relative' }}>
          <PlaceAutocomplete
            label="STAY DESTINATION"
            value={destination}
            onChange={handleDestinationChange}
            tripType="hotel"
            field="destination"
            placeholder="Enter city, area or hotel"
            error={destinationError}
            className="hotel-discover-searchcell-autocomplete"
            isInline={isInline}
          />
        </div>

        {/* Timeline (Check-in / Check-out) */}
        <div
          className="hotel-discover-searchcell"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1.2 1 auto', borderLeft: "1px solid rgba(15,23,42,0.08)", paddingLeft: "20px", cursor: 'pointer', minWidth: 0, position: 'relative' }}
          onClick={() => document.getElementById("inline-checkin-date")?.showPicker?.()}
        >
          <CalendarDays size={18} color="#dc1e26" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TIMELINE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
              <span style={{ cursor: "pointer", color: '#0f172a', fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap' }}
                onClick={(e) => { e.stopPropagation(); document.getElementById("inline-checkin-date")?.showPicker?.(); }}>
                {toDisplayDate(checkInDate) || "Select"}
              </span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>-</span>
              <span style={{ cursor: "pointer", color: '#0f172a', fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap' }}
                onClick={(e) => { e.stopPropagation(); document.getElementById("inline-checkout-date")?.showPicker?.(); }}>
                {toDisplayDate(checkOutDate) || "dates"}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {calculateNights(checkInDate, checkOutDate)} {calculateNights(checkInDate, checkOutDate) === 1 ? 'NIGHT' : 'NIGHTS'}
            </span>
            <input id="inline-checkin-date" type="date" min={getDefaultDateString(0)} value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }} />
            <input id="inline-checkout-date" type="date" min={checkInDate || getDefaultDateString(0)} value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Guests */}
        <div className="hotel-discover-searchcell" ref={guestsFieldRef}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1.1 1 auto', borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "20px", cursor: 'pointer', minWidth: 0, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', cursor: 'pointer', minWidth: 0 }} onClick={toggleGuestsDropdown}>
            <Users size={18} color="#dc1e26" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GUESTS</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestSummary}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>ROOMS & GUESTS</span>
            </div>
          </div>
          {showGuestsDropdown && <GuestsDropdown rooms={rooms} adults={adults} children={children} childAges={childAges}
            onRoomsChange={handleRoomsChange} onAdultsChange={handleAdultsChange} onChildrenChange={handleChildrenChange}
            onChildAgeChange={handleChildAgeChange} onClose={() => setShowGuestsDropdown(false)} isInline={true} />}
        </div>

        <button type="button" className="hotel-discover-searchbutton" onClick={handleSubmit}
          style={{ borderRadius: "32px", padding: "0 24px", height: "44px", fontSize: "0.95rem", fontWeight: 700,
            background: "linear-gradient(135deg, #dc1e26, #991b1b)", boxShadow: "0 4px 15px rgba(220, 30, 38, 0.4)",
            color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", border: "none", flexShrink: 0 }}>
          <Search size={18} />
          <span>Search Hotels</span>
        </button>
      </form>
    );
  }

  // ── HOMEPAGE MODE — horizontal pill bar matching reference ────────────────
  return (
    <div className="hotel-pill-searchbar-wrap">
      <div className="hotel-pill-searchbar">

        {/* DESTINATION */}
        <div className="hotel-pill-cell hotel-pill-destination">
          <MapPin size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-inner">
            <span className="hotel-pill-label">DESTINATION</span>
            <PlaceAutocomplete
              label=""
              value={destination}
              onChange={handleDestinationChange}
              tripType="hotel"
              field="destination"
              placeholder="City or hotel area"
              error={destinationError}
              className="hotel-pill-autocomplete"
            />
          </div>
        </div>

        <div className="hotel-pill-divider" />

        {/* CHECK-IN */}
        <div
          className="hotel-pill-cell hotel-pill-date"
          onClick={() => document.getElementById("hp-hotel-checkin")?.showPicker?.()}
          style={{ cursor: "pointer" }}
        >
          <CalendarDays size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-inner">
            <span className="hotel-pill-label">CHECK-IN</span>
            <span className={`hotel-pill-value ${!checkInDate ? "hotel-pill-placeholder" : ""}`}>
              {toDisplayDate(checkInDate) || "DD-MM-YYYY"}
            </span>
          </div>
          <input id="hp-hotel-checkin" type="date" min={getDefaultDateString(0)} value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
        </div>

        <div className="hotel-pill-divider" />

        {/* CHECK-OUT */}
        <div
          className="hotel-pill-cell hotel-pill-date"
          onClick={() => document.getElementById("hp-hotel-checkout")?.showPicker?.()}
          style={{ cursor: "pointer" }}
        >
          <CalendarDays size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-inner">
            <span className="hotel-pill-label">CHECK-OUT</span>
            <span className={`hotel-pill-value ${!checkOutDate ? "hotel-pill-placeholder" : ""}`}>
              {toDisplayDate(checkOutDate) || "DD-MM-YYYY"}
            </span>
          </div>
          <input id="hp-hotel-checkout" type="date" min={checkInDate || getDefaultDateString(0)} value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
        </div>

        <div className="hotel-pill-divider" />

        {/* ROOMS & GUESTS */}
        <div className="hotel-pill-cell hotel-pill-guests" ref={guestsFieldRef} onClick={toggleGuestsDropdown}
          style={{ cursor: "pointer", position: "relative" }}>
          <Users size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-inner" style={{ flex: 1 }}>
            <span className="hotel-pill-label">ROOMS &amp; GUESTS</span>
            <span className="hotel-pill-value">{guestSummary}</span>
          </div>
          <ChevronDown size={14} className={`hotel-pill-caret ${showGuestsDropdown ? "open" : ""}`} />

          {showGuestsDropdown && (
            <GuestsDropdown
              rooms={rooms} adults={adults} children={children} childAges={childAges}
              onRoomsChange={handleRoomsChange} onAdultsChange={handleAdultsChange}
              onChildrenChange={handleChildrenChange} onChildAgeChange={handleChildAgeChange}
              onClose={() => setShowGuestsDropdown(false)} isInline={false}
            />
          )}
        </div>

        {/* SEARCH BUTTON */}
        <button
          type="button"
          className="hotel-pill-search-btn"
          onClick={handleSubmit}
        >
          <Search size={18} />
          <span>SEARCH HOTELS</span>
        </button>
      </div>

      {destinationError && (
        <p style={{ color: "#dc2626", fontSize: "0.78rem", marginTop: "6px", paddingLeft: "12px" }}>
          {destinationError}
        </p>
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
          style={{ background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "8px", padding: "6px 20px",
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
