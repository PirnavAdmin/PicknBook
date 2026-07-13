import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Calendar, ArrowRight, Users } from "lucide-react";
import B2BPlaceAutocomplete from "./B2BPlaceAutocomplete";
import "../../STYLES/B2BLayout.css";

export default function B2BHotelSearch() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(2);
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const hotelParams = new URLSearchParams();

    const payload = {
      city,
      checkIn,
      checkOut,
      rooms,
      guests,
    };

    hotelParams.set("city", city);
    hotelParams.set("checkIn", checkIn);
    hotelParams.set("checkOut", checkOut);
    hotelParams.set("rooms", rooms.toString());
    hotelParams.set("guests", guests.toString());

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
            <span>{guests} Guest(s), {rooms} Room(s)</span>
            <Users size={16} style={{ color: "#6b7280" }} />
          </button>

          {showConfigDropdown && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              zIndex: 40,
              marginTop: 4,
              width: 220
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>Rooms</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" disabled={rooms <= 1} onClick={() => setRooms(rooms - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                  <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{rooms}</span>
                  <button type="button" onClick={() => setRooms(rooms + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>Guests</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" disabled={guests <= 1} onClick={() => setGuests(guests - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                  <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{guests}</span>
                  <button type="button" onClick={() => setGuests(guests + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigDropdown(false)}
                className="b2b-signout-btn"
                style={{
                  background: "var(--b2b-accent)",
                  color: "white",
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                  width: "100%",
                  marginTop: 8
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
