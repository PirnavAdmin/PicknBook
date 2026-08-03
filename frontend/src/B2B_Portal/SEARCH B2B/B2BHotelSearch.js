/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, Trash2 } from "lucide-react";
import B2BPlaceAutocomplete from "./B2BPlaceAutocomplete";
import "../../STYLES/B2BLayout.css";

export default function B2BHotelSearch() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [roomsConfig, setRoomsConfig] = useState([
    { adults: 2, children: 0, childAges: [] }
  ]);
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);

  const totalRooms = roomsConfig.length;
  const totalGuests = roomsConfig.reduce((sum, r) => sum + r.adults + r.children, 0);

  const addRoom = () => {
    setRoomsConfig([...roomsConfig, { adults: 2, children: 0, childAges: [] }]);
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
      // Adjust childAges array length
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

  const handleSearch = (e) => {
    e.preventDefault();
    const hotelParams = new URLSearchParams();

    const payload = {
      city,
      checkIn,
      checkOut,
      roomsConfig,
    };

    hotelParams.set("city", city);
    hotelParams.set("checkIn", checkIn);
    hotelParams.set("checkOut", checkOut);
    hotelParams.set("rooms", JSON.stringify(roomsConfig));

    navigate(
      `/search/hotels?${hotelParams.toString()}`,
      { state: payload }
    );
  };

  return (
    <div style={{ color: "#1f2937" }}>
      <form onSubmit={handleSearch} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
        <B2BPlaceAutocomplete
          label="Destination / City"
          value={city}
          onChange={setCity}
          tripType="hotel"
          field="city"
          placeholder="Where are you staying?"
        />

        <div className="b2b-form-group">
          <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Check-in Date</label>
          <input
            type="date"
            className="b2b-input-field"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            style={{ background: "white", color: "#1f2937" }}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="b2b-form-group">
          <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Check-out Date</label>
          <input
            type="date"
            className="b2b-input-field"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            style={{ background: "white", color: "#1f2937" }}
            min={checkIn}
          />
        </div>

        {/* Guest & Room Configuration */}
        <div className="b2b-form-group" style={{ position: "relative" }}>
          <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Guests & Rooms</label>
          <button
            type="button"
            onClick={() => setShowConfigDropdown(!showConfigDropdown)}
            className="b2b-input-field"
            style={{
              background: "white",
              color: "#1f2937",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%"
            }}
          >
            <span>{totalGuests} Guest(s), {totalRooms} Room(s)</span>
            <Users size={16} style={{ color: "#6b7280" }} />
          </button>

          {showConfigDropdown && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              zIndex: 40,
              marginTop: 4,
              width: 320,
              maxHeight: "400px",
              overflowY: "auto"
            }}>
              {roomsConfig.map((room, rIndex) => (
                <div key={rIndex} style={{ paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1f2937" }}>Room {rIndex + 1}</span>
                    {roomsConfig.length > 1 && (
                      <button type="button" onClick={() => removeRoom(rIndex)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>Adults</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" disabled={room.adults <= 1} onClick={() => updateRoom(rIndex, "adults", room.adults - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                      <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{room.adults}</span>
                      <button type="button" onClick={() => updateRoom(rIndex, "adults", room.adults + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>Children</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" disabled={room.children <= 0} onClick={() => updateRoom(rIndex, "children", room.children - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                      <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{room.children}</span>
                      <button type="button" onClick={() => updateRoom(rIndex, "children", room.children + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                    </div>
                  </div>

                  {room.children > 0 && (
                    <div style={{ marginTop: 12, padding: 8, background: "#f9fafb", borderRadius: 6 }}>
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0 0 8px 0" }}>Ages of children (Mandatory)</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {room.childAges.map((age, cIndex) => (
                          <select 
                            key={cIndex}
                            value={age}
                            onChange={(e) => updateChildAge(rIndex, cIndex, Number(e.target.value))}
                            style={{ padding: 6, borderRadius: 4, border: "1px solid #d1d5db", fontSize: "0.8rem" }}
                          >
                            {[...Array(12).keys()].map(a => (
                              <option key={a + 1} value={a + 1}>{a + 1} years</option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addRoom}
                style={{
                  color: "var(--b2b-accent)",
                  background: "transparent",
                  border: "1px dashed var(--b2b-accent)",
                  fontSize: "0.85rem",
                  padding: "8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                + Add another room
              </button>

              <button
                type="button"
                onClick={() => setShowConfigDropdown(false)}
                className="b2b-signout-btn"
                style={{
                  background: "var(--b2b-accent)",
                  color: "white",
                  fontSize: "0.85rem",
                  padding: "8px 12px",
                  width: "100%",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="b2b-signout-btn"
          style={{
            background: "var(--b2b-accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            height: "fit-content"
          }}
        >
          <span>Search Hotels</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
