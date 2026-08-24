
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
        childAges: Array(children || 0).fill(4)
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
              <input
                type="date"
                value={checkInDate}
                onChange={(event) => setCheckInDate(event.target.value)}
                style={{
                  cursor: "pointer",
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--hotel-muted)',
                  fontWeight: 600,
                  fontSize: '1.02rem',
                  padding: 0,
                  width: '120px'
                }}
              />
              <span style={{ color: 'var(--hotel-muted)', fontWeight: 600 }}>-</span>
              <input
                type="date"
                value={checkOutDate}
                onChange={(event) => setCheckOutDate(event.target.value)}
                style={{
                  cursor: "pointer",
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--hotel-muted)',
                  fontWeight: 600,
                  fontSize: '1.02rem',
                  padding: 0,
                  width: '120px'
                }}
              />
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
              <strong style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--hotel-muted)', marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestSummary}</strong>
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
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem", fontWeight: 600, textTransform: "none" }}>{guestSummary}</span>
            </div>
            <ChevronDown size={16} className={`traveller-caret ${showGuestsDropdown ? "open" : ""}`} style={{ flexShrink: 0 }} />
          </div>
        )}

        {showGuestsDropdown && (
          <div
            className="traveller-dropdown hotel-guests-dropdown"
            style={{
              width: "380px",
              left: 0,
              right: "auto",
              border: "1px solid #cfcfcf",
              borderRadius: "16px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
              padding: "20px",
              zIndex: 1400,
              background: "#ffffff",
              color: "#1e293b",
              position: "absolute",
              top: isInline ? 'calc(100% + 10px)' : undefined,
            }}
          >
            {/* Rooms Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "#f8fafc", borderRadius: "10px", color: "#d32f2f" }}>
                <BedDouble size={22} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#1e293b" }}>ROOMS</span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>How many rooms do you need?</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setRooms(Math.max(0, rooms - 1))}
                  disabled={rooms <= 0}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: rooms <= 0 ? "not-allowed" : "pointer", opacity: rooms <= 0 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontSize: "1.05rem", fontWeight: "700", minWidth: "16px", textAlign: "center", color: "#0f172a" }}>{rooms}</span>
                <button
                  type="button"
                  onClick={() => setRooms(Math.min(8, rooms + 1))}
                  disabled={rooms >= 8}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: rooms >= 8 ? "not-allowed" : "pointer", opacity: rooms >= 8 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Adults Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "#f8fafc", borderRadius: "10px", color: "#d32f2f" }}>
                <User size={22} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#1e293b" }}>ADULTS</span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>18 years and above</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setAdults(Math.max(0, adults - 1))}
                  disabled={adults <= 0}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: adults <= 0 ? "not-allowed" : "pointer", opacity: adults <= 0 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontSize: "1.05rem", fontWeight: "700", minWidth: "16px", textAlign: "center", color: "#0f172a" }}>{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults(Math.min(30, adults + 1))}
                  disabled={adults >= 30}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: adults >= 30 ? "not-allowed" : "pointer", opacity: adults >= 30 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Children Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "#f8fafc", borderRadius: "10px", color: "#d32f2f" }}>
                <Baby size={22} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#1e293b" }}>CHILDREN</span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>0 - 17 years</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setChildren(Math.max(0, children - 1))}
                  disabled={children <= 0}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: children <= 0 ? "not-allowed" : "pointer", opacity: children <= 0 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontSize: "1.05rem", fontWeight: "700", minWidth: "16px", textAlign: "center", color: "#0f172a" }}>{children}</span>
                <button
                  type="button"
                  onClick={() => setChildren(Math.min(10, children + 1))}
                  disabled={children >= 10}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: children >= 10 ? "not-allowed" : "pointer", opacity: children >= 10 ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <Plus size={16} />
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
                  padding: "12px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 10px rgba(211,47,47,0.3)",
                  transition: "all 0.2s",
                  textTransform: "uppercase"
                }}
              >
                Done
              </button>
            </div>

            {/* Bedding Info Note */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "16px", padding: "8px", background: "#f8fafc", borderRadius: "8px" }}>
              <Info size={14} color="#64748b" style={{ marginTop: "2px" }} />
              <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: "normal", textTransform: "none", whiteSpace: "nowrap" }}>
                Children under 6 years may stay free with existing bedding.
              </span>
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
