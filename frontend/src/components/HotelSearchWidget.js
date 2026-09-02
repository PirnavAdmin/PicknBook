
import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Search, Users, MapPin, ChevronDown, Plus, Minus, BedDouble, User, Baby, Info } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";

function getDateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

function toDisplayDate(isoString) {
  if (!isoString) return "";
  const parts = isoString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoString;
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
    ? "Add Guests"
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
      <PlaceAutocomplete
        label={isInline ? "" : "Destination"}
        value={destination}
        onChange={handleDestinationChange}
        tripType="hotel"
        field="destination"
        placeholder="City or hotel area"
        error={destinationError}
        className={isInline ? "hotel-discover-searchcell" : "hotel-destination-field"}
        isInline={isInline}
      />

      {isInline ? (
        <div className="hotel-discover-searchcell" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <CalendarDays size={18} color="var(--hotel-muted)" />
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#222' }}>Timeline</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
              <div style={{ position: "relative" }}>
                <span
                  style={{ cursor: "pointer", color: 'var(--hotel-muted)', fontWeight: 600, fontSize: '1.02rem', whiteSpace: 'nowrap', display: 'inline-block' }}
                  onClick={() => document.getElementById("inline-checkin-date").showPicker?.()}
                >
                  {toDisplayDate(checkInDate) || "Select dates"}
                </span>
                <input
                  id="inline-checkin-date"
                  type="date"
                  value={checkInDate}
                  onChange={(event) => setCheckInDate(event.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }}
                />
              </div>
              <span style={{ color: 'var(--hotel-muted)', fontWeight: 600, margin: '0 4px' }}>-</span>
              <div style={{ position: "relative" }}>
                <span
                  style={{ cursor: "pointer", color: 'var(--hotel-muted)', fontWeight: 600, fontSize: '1.02rem', whiteSpace: 'nowrap', display: 'inline-block' }}
                  onClick={() => document.getElementById("inline-checkout-date").showPicker?.()}
                >
                  {toDisplayDate(checkOutDate) || "Select dates"}
                </span>
                <input
                  id="inline-checkout-date"
                  type="date"
                  value={checkOutDate}
                  onChange={(event) => setCheckOutDate(event.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field field-with-icon checkin-field" style={{ position: "relative" }}>
            <label>Check-in</label>
            <div className="control-wrap">
              <CalendarDays size={18} />
              <input
                type="text"
                readOnly
                value={toDisplayDate(checkInDate)}
                placeholder="DD-MM-YYYY"
                className="field-control with-leading-icon"
                style={{ cursor: "pointer" }}
                onClick={() => document.getElementById("hotel-checkin-date").showPicker?.()}
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
            <label>Check-out</label>
            <div className="control-wrap">
              <CalendarDays size={18} />
              <input
                type="text"
                readOnly
                value={toDisplayDate(checkOutDate)}
                placeholder="DD-MM-YYYY"
                className="field-control with-leading-icon"
                style={{ cursor: "pointer" }}
                onClick={() => document.getElementById("hotel-checkout-date").showPicker?.()}
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

      <div className={isInline ? "hotel-discover-searchcell" : "field traveller-field"} ref={guestsFieldRef} style={{ position: "relative" }}>
        {!isInline && <label>Rooms & Guests</label>}

        {isInline ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', cursor: 'pointer', minWidth: 0 }} onClick={toggleGuestsDropdown}>
            <Users size={18} color="var(--hotel-muted)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#222' }}>Guests</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--hotel-muted)', marginTop: '5px', whiteSpace: 'nowrap' }}>{guestSummary}</span>
            </div>
          </div>
        ) : (
          <div
            className={`traveller-trigger ${showGuestsDropdown ? "open" : ""}`}
            onClick={toggleGuestsDropdown}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1, overflow: "hidden" }}>
              <Users size={18} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem", fontWeight: 500, textTransform: "none" }}>{guestSummary}</span>
            </div>
            <ChevronDown size={16} className={`traveller-caret ${showGuestsDropdown ? "open" : ""}`} style={{ flexShrink: 0 }} />
          </div>
        )}

        {showGuestsDropdown && (
          <div
            className="traveller-dropdown hotel-guests-dropdown"
            style={{
              width: "260px",
              left: 0,
              right: "auto",
              border: "1px solid #cfcfcf",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "12px",
              zIndex: 1400,
              background: "#ffffff",
              color: "#1e293b",
              position: "absolute",
              top: isInline ? 'calc(100% + 10px)' : undefined,
            }}
          >
            {/* Rooms Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>
                <BedDouble size={18} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "#1e293b", textTransform: "uppercase" }}>ROOMS</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>Minimum 1</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleRoomsChange(Math.max(0, rooms - 1))}
                  disabled={rooms <= 0}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: rooms <= 0 ? "not-allowed" : "pointer", opacity: rooms <= 0 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
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
                <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "#1e293b", textTransform: "uppercase" }}>ADULTS</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>13 years & above</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d32f2f", borderRadius: "6px", padding: "2px 6px", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleAdultsChange(Math.max(0, adults - 1))}
                  disabled={adults <= 0}
                  style={{ background: "transparent", border: "none", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: adults <= 0 ? "not-allowed" : "pointer", opacity: adults <= 0 ? 0.4 : 1, transition: "all 0.2s", padding: 0 }}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: children > 0 ? "1px solid #e2e8f0" : "none", marginBottom: children > 0 ? "10px" : "6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", color: "#475569" }}>
                <Baby size={18} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "#1e293b", textTransform: "uppercase" }}>CHILDREN</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>0-12 years</span>
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
            <div>
              <button
                type="button"
                onClick={() => setShowGuestsDropdown(false)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 10px rgba(211,47,47,0.3)",
                  transition: "all 0.2s",
                  textTransform: "none"
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {isInline ? (
        <button type="button" className="hotel-discover-searchbutton" onClick={handleSubmit}>
          <Search size={17} />
          <span>Search</span>
        </button>
      ) : (
        <button type="button" className="search-btn" onClick={handleSubmit}>
          <Search size={16} />
          <span>Search Hotels</span>
        </button>
      )}
    </>
  );

  if (isInline) {
    return (
      <form
        className="hotel-discover-searchbar"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        style={{ overflow: 'visible' }}
      >
        {innerContent}
      </form>
    );
  }

  return (
    <div className="booking-content hotel-booking-content">
      <div className="search-grid hotel-standard-grid">
        {innerContent}
      </div>
    </div>
  );
}
