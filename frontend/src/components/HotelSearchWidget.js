
import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, CalendarRange, Search, Users, ChevronDown, Plus, Minus, BedDouble, Baby } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";

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

  const [checkInDate, setCheckInDate] = useState(() => initialCheckIn || "");
  const [checkOutDate, setCheckOutDate] = useState(() => initialCheckOut || "");

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
    return 0;
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
    return 0;
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

  const guestSummary = (rooms === 0 && adults === 0)
    ? "Add Gues..."
    : `${rooms} Room${rooms > 1 ? 's' : ''}, ${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ""}`;

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

  const innerContent = (
    <>
      <div className={isInline ? "hotel-discover-searchcell" : ""} style={isInline ? { display: 'flex', alignItems: 'center', gap: '12px', flex: '1.3 1 auto', minWidth: 0, position: 'relative' } : {}}>
        <PlaceAutocomplete
          label={isInline ? "STAY DESTINATION" : "DESTINATION"}
          value={destination}
          onChange={handleDestinationChange}
          tripType="hotel"
          field="destination"
          placeholder="Enter city, area or hotel"
          error={destinationError}
          className={isInline ? "hotel-discover-searchcell-autocomplete" : "hotel-destination-field"}
          isInline={isInline}
        />
      </div>

      {isInline ? (
        <div
          className="hotel-discover-searchcell"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '1.2 1 auto',
            borderLeft: "1px solid rgba(255,255,255,0.15)",
            paddingLeft: "20px",
            cursor: 'pointer',
            minWidth: 0,
            position: 'relative'
          }}
          onClick={() => document.getElementById("inline-checkin-date")?.showPicker?.()}
        >
          <CalendarRange size={18} color="#ffffff" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              TIMELINE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
              <span
                style={{ cursor: "pointer", color: '#ffffff', fontWeight: 700, fontSize: '1.02rem', whiteSpace: 'nowrap', display: 'inline-block' }}
                onClick={(e) => { e.stopPropagation(); document.getElementById("inline-checkin-date")?.showPicker?.(); }}
              >
                {toDisplayDate(checkInDate) || "Select"}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>-</span>
              <span
                style={{ cursor: "pointer", color: '#ffffff', fontWeight: 700, fontSize: '1.02rem', whiteSpace: 'nowrap', display: 'inline-block' }}
                onClick={(e) => { e.stopPropagation(); document.getElementById("inline-checkout-date")?.showPicker?.(); }}
              >
                {toDisplayDate(checkOutDate) || "dates"}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {calculateNights(checkInDate, checkOutDate)} {calculateNights(checkInDate, checkOutDate) === 1 ? 'NIGHT' : 'NIGHTS'}
            </span>
            <input
              id="inline-checkin-date"
              type="date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }}
            />
            <input
              id="inline-checkout-date"
              type="date"
              value={checkOutDate}
              onChange={(event) => setCheckOutDate(event.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="field field-with-icon checkin-field" style={{ position: "relative" }}>
            <label>CHECK-IN</label>
            <div className="control-wrap" onClick={() => document.getElementById("hotel-checkin-date")?.showPicker?.()} style={{ cursor: "pointer" }}>
              <CalendarDays size={18} color="#dc2626" />
              <input
                type="text"
                readOnly
                value={toDisplayDate(checkInDate)}
                placeholder="DD-MM-YYYY"
                className="field-control with-leading-icon"
                style={{ cursor: "pointer" }}
              />
            </div>
            <input
              id="hotel-checkin-date"
              type="date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            />
          </div>

          <div className="field field-with-icon checkout-field" style={{ position: "relative" }}>
            <label>CHECK-OUT</label>
            <div className="control-wrap" onClick={() => document.getElementById("hotel-checkout-date")?.showPicker?.()} style={{ cursor: "pointer" }}>
              <CalendarDays size={18} color="#dc2626" />
              <input
                type="text"
                readOnly
                value={toDisplayDate(checkOutDate)}
                placeholder="DD-MM-YYYY"
                className="field-control with-leading-icon"
                style={{ cursor: "pointer" }}
              />
            </div>
            <input
              id="hotel-checkout-date"
              type="date"
              value={checkOutDate}
              onChange={(event) => setCheckOutDate(event.target.value)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            />
          </div>
        </>
      )}

      <div className={isInline ? "hotel-discover-searchcell" : "field traveller-field hotel-guests-field"} ref={guestsFieldRef} style={isInline ? { display: 'flex', alignItems: 'center', gap: '12px', flex: '1.1 1 auto', borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "20px", cursor: 'pointer', minWidth: 0, position: 'relative' } : { position: "relative" }}>
        {!isInline && <label>ROOMS & GUESTS</label>}

        {isInline ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', cursor: 'pointer', minWidth: 0 }} onClick={toggleGuestsDropdown}>
            <Users size={18} color="#ffffff" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GUESTS</span>
              <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#ffffff', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestSummary}</span>
              <span style={{ fontSize: '0.72rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>ROOMS & GUESTS</span>
            </div>
          </div>
        ) : (
          <div
            className={`traveller-trigger ${showGuestsDropdown ? "open" : ""}`}
            onClick={toggleGuestsDropdown}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1, overflow: "hidden" }}>
              <Users size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <span className="hotel-guest-summary-text" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.92rem", fontWeight: 500, color: (rooms === 0 && adults === 0) ? "#64748b" : "#0f172a" }}>
                {guestSummary}
              </span>
            </div>
            <ChevronDown size={14} color="#64748b" className={`traveller-caret ${showGuestsDropdown ? "open" : ""}`} style={{ flexShrink: 0 }} />
          </div>
        )}

        {showGuestsDropdown && (
          <div
            className="traveller-dropdown hotel-guests-dropdown"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "280px",
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
              top: isInline ? 'calc(100% + 14px)' : undefined,
            }}
          >
            {/* Rooms Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>
                <BedDouble size={18} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>ROOMS</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal" }}>Max 8 rooms</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleRoomsChange(Math.max(1, rooms - 1))}
                  disabled={rooms <= 1}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: rooms <= 1 ? "not-allowed" : "pointer", opacity: rooms <= 1 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Minus size={14} strokeWidth={2} />
                </button>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "16px", textAlign: "center", color: "#d32f2f" }}>{rooms}</span>
                <button
                  type="button"
                  onClick={() => handleRoomsChange(Math.min(8, rooms + 1))}
                  disabled={rooms >= 8}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: rooms >= 8 ? "not-allowed" : "pointer", opacity: rooms >= 8 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Adults Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>
                <Users size={18} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>ADULTS</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>13 years & above</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleAdultsChange(Math.max(1, adults - 1))}
                  disabled={adults <= 1}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: adults <= 1 ? "not-allowed" : "pointer", opacity: adults <= 1 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Minus size={14} strokeWidth={2} />
                </button>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "16px", textAlign: "center", color: "#d32f2f" }}>{adults}</span>
                <button
                  type="button"
                  onClick={() => handleAdultsChange(Math.min(30, adults + 1))}
                  disabled={adults >= 30}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: adults >= 30 ? "not-allowed" : "pointer", opacity: adults >= 30 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Children Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>
                <Baby size={18} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>CHILDREN</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>0 - 12 years</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleChildrenChange(Math.max(0, children - 1))}
                  disabled={children <= 0}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: children <= 0 ? "not-allowed" : "pointer", opacity: children <= 0 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Minus size={14} strokeWidth={2} />
                </button>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "16px", textAlign: "center", color: "#d32f2f" }}>{children}</span>
                <button
                  type="button"
                  onClick={() => handleChildrenChange(Math.min(10, children + 1))}
                  disabled={children >= 10}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: children >= 10 ? "not-allowed" : "pointer", opacity: children >= 10 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Done Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowGuestsDropdown(false)}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 18px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 10px rgba(220,38,38,0.3)",
                  transition: "all 0.2s",
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {isInline ? (
        <button
          type="button"
          className="hotel-discover-searchbutton"
          onClick={handleSubmit}
          style={{
            borderRadius: "32px",
            padding: "0 24px",
            height: "46px",
            fontSize: "0.95rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, #dc1e26, #991b1b)",
            boxShadow: "0 4px 15px rgba(220, 30, 38, 0.4)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            border: "none",
            flexShrink: 0
          }}
        >
          <Search size={18} />
          <span>Search Hotels</span>
        </button>
      ) : (
        <button type="button" className="search-btn hotel-search-submit-btn" onClick={handleSubmit}>
          <Search size={16} strokeWidth={2.5} />
          <span>SEARCH HOTELS</span>
        </button>
      )}
    </>
  );

  if (isInline) {
    return (
      <form
        className="hotel-discover-searchbar"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        style={{
          background: "rgba(255, 255, 255, 0.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "40px",
          padding: "10px 16px",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
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
        {innerContent}
      </form>
    );
  }

  return (
    <div className="booking-content hotel-booking-content">
      <div className="flight-search-bar-row hotel-search-bar-row">
        {innerContent}
      </div>
    </div>
  );
}
