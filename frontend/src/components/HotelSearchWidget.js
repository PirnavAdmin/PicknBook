
import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Search, Users, MapPin, ChevronDown, Plus, Minus, Trash2 } from "lucide-react";
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
  onSearch,
  isInline = false
}) {
  const [destination, setDestination] = useState(() => initialDestination || "");
  const [destinationError, setDestinationError] = useState("");

  const [checkInDate, setCheckInDate] = useState(() => initialCheckIn || "");
  const [checkOutDate, setCheckOutDate] = useState(() => initialCheckOut || "");

  const [roomsConfig, setRoomsConfig] = useState(() => {
    if (initialRoomsConfig && typeof initialRoomsConfig === "string") {
      try {
        const parsed = JSON.parse(initialRoomsConfig);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    if (initialRoomsConfig && Array.isArray(initialRoomsConfig) && initialRoomsConfig.length > 0) {
      return initialRoomsConfig;
    }
    return [{ adults: 2, children: 0, childAges: [] }];
  });

  useEffect(() => {
    sessionStorage.setItem("hotelSearchDestination", destination);
  }, [destination]);

  useEffect(() => {
    sessionStorage.setItem("hotelSearchCheckIn", checkInDate);
  }, [checkInDate]);

  useEffect(() => {
    sessionStorage.setItem("hotelSearchCheckOut", checkOutDate);
  }, [checkOutDate]);

  useEffect(() => {
    sessionStorage.setItem("hotelSearchRooms", JSON.stringify(roomsConfig));
  }, [roomsConfig]);

  const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
  const guestsFieldRef = useRef(null);

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

  const handleDestinationChange = (value) => {
    setDestination(value);
    setDestinationError("");
  };

  const addRoom = () => {
    if (roomsConfig.length < 8) {
      setRoomsConfig([...roomsConfig, { adults: 2, children: 0, childAges: [] }]);
    }
  };

  const removeRoom = (index) => {
    if (roomsConfig.length > 1) {
      setRoomsConfig(roomsConfig.filter((_, i) => i !== index));
    }
  };

  const updateRoom = (index, field, value) => {
    const updated = [...roomsConfig];
    updated[index][field] = value;
    if (field === "children") {
      const currentAges = updated[index].childAges;
      if (value > currentAges.length) {
        updated[index].childAges = [...currentAges, ...Array(value - currentAges.length).fill(4)];
      } else if (value < currentAges.length) {
        updated[index].childAges = currentAges.slice(0, value);
      }
    }
    setRoomsConfig(updated);
  };

  const updateChildAge = (roomIndex, childIndex, age) => {
    const updated = [...roomsConfig];
    updated[roomIndex].childAges[childIndex] = age;
    setRoomsConfig(updated);
  };

  const totalRooms = roomsConfig.length;
  const totalAdults = roomsConfig.reduce((sum, r) => sum + (Number(r.adults) || 0), 0);
  const totalChildren = roomsConfig.reduce((sum, r) => sum + (Number(r.children) || 0), 0);
  const guestSummary = (totalAdults === 0 && totalChildren === 0)
    ? "Add Guests"
    : `${totalRooms} Room${totalRooms > 1 ? 's' : ''}, ${totalAdults} Adult${totalAdults > 1 ? 's' : ''}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren > 1 ? 'ren' : ''}` : ""}`;

  const handleSubmit = () => {
    const destVal = destination.trim();
    if (!destVal) {
      setDestinationError("Destination city is required.");
      return;
    }
    setDestinationError("");

    if (onSearch) {
      onSearch({
        destination: destVal,
        checkInDate,
        checkOutDate,
        roomsConfig,
        rooms: String(totalRooms),
        adults: String(totalAdults),
        children: String(totalChildren),
        guests: guestSummary,
        roomsConfigStr: JSON.stringify(roomsConfig)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', cursor: 'pointer' }} onClick={() => setShowGuestsDropdown((prev) => !prev)}>
            <Users size={18} color="var(--hotel-muted)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#222' }}>Guests</span>
              <strong style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--hotel-muted)', marginTop: '5px' }}>{guestSummary}</strong>
            </div>
          </div>
        ) : (
          <div
            className={`traveller-trigger ${showGuestsDropdown ? "open" : ""}`}
            onClick={() => setShowGuestsDropdown((prev) => !prev)}
            style={{ cursor: "pointer" }}
          >
            <div className="traveller-trigger-content">
              <Users size={18} />
              <span>{guestSummary}</span>
            </div>
            <ChevronDown size={16} className={`traveller-caret ${showGuestsDropdown ? "open" : ""}`} />
          </div>
        )}

        {showGuestsDropdown && (
          <div
            className="traveller-dropdown hotel-guests-dropdown"
            style={{
              maxHeight: "450px",
              overflowY: "auto",
              top: isInline ? 'calc(100% + 10px)' : undefined,
              width: "320px",
              right: 0,
              left: "auto",
              border: "1px solid #cfcfcf",
              borderRadius: "12px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
              padding: "16px",
              zIndex: 1400,
              background: "#ffffff",
              color: "#1e293b",
              position: "absolute"
            }}
          >
            {roomsConfig.map((room, roomIndex) => (
              <div key={roomIndex} style={{ paddingBottom: roomIndex !== roomsConfig.length - 1 ? "8px" : "0px", marginBottom: roomIndex !== roomsConfig.length - 1 ? "8px" : "8px", borderBottom: roomIndex !== roomsConfig.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "0.85rem", color: "#d32f2f" }}>Room {roomIndex + 1}</strong>
                  {roomsConfig.length > 1 && (
                    <button type="button" onClick={() => removeRoom(roomIndex)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                <div className="traveller-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div className="traveller-type" style={{ display: "flex", flexDirection: "column" }}>
                    <span className="type-name" style={{ fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase", color: "#111" }}>Adults</span>
                  </div>
                  <div className="traveller-counter" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button type="button" onClick={() => updateRoom(roomIndex, "adults", Math.max(1, room.adults - 1))} disabled={room.adults <= 1} style={{ background: "transparent", border: "1px solid #d32f2f", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: room.adults <= 1 ? "not-allowed" : "pointer", opacity: room.adults <= 1 ? 0.4 : 1 }}>
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", minWidth: "16px", textAlign: "center", color: "#000" }}>{room.adults}</span>
                    <button type="button" onClick={() => updateRoom(roomIndex, "adults", Math.min(4, room.adults + 1))} disabled={room.adults >= 4} style={{ background: "transparent", border: "1px solid #d32f2f", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: room.adults >= 4 ? "not-allowed" : "pointer", opacity: room.adults >= 4 ? 0.4 : 1 }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="traveller-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="traveller-type" style={{ display: "flex", flexDirection: "column" }}>
                    <span className="type-name" style={{ fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase", color: "#111" }}>Children</span>
                  </div>
                  <div className="traveller-counter" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button type="button" onClick={() => updateRoom(roomIndex, "children", Math.max(0, room.children - 1))} disabled={room.children <= 0} style={{ background: "transparent", border: "1px solid #d32f2f", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: room.children <= 0 ? "not-allowed" : "pointer", opacity: room.children <= 0 ? 0.4 : 1 }}>
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", minWidth: "16px", textAlign: "center", color: "#000" }}>{room.children}</span>
                    <button type="button" onClick={() => updateRoom(roomIndex, "children", Math.min(4, room.children + 1))} disabled={room.children >= 4} style={{ background: "transparent", border: "1px solid #d32f2f", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", cursor: room.children >= 4 ? "not-allowed" : "pointer", opacity: room.children >= 4 ? 0.4 : 1 }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {roomsConfig.length < 4 && (
              <button type="button" onClick={addRoom} style={{ width: "100%", padding: "6px", background: "#fff", border: "1px dashed #d32f2f", borderRadius: "8px", color: "#d32f2f", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "4px", fontSize: "0.8rem", transition: "all 0.2s" }}>
                <Plus size={14} /> Add another room
              </button>
            )}

            <div style={{ marginTop: "8px" }}>
              <button type="button" onClick={() => setShowGuestsDropdown(false)} style={{ width: "100%", padding: "8px", background: "#d32f2f", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 10px rgba(211,47,47,0.3)" }}>
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
