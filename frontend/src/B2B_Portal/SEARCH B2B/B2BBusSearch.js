import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, Calendar, ArrowRight } from "lucide-react";
import B2BPlaceAutocomplete from "./B2BPlaceAutocomplete";
import "../../STYLES/B2BLayout.css";

export default function B2BBusSearch() {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const busParams = new URLSearchParams();

    const payload = {
      fromCity,
      toCity,
      departureDate,
    };

    busParams.set("fromCity", fromCity);
    busParams.set("toCity", toCity);
    busParams.set("departureDate", departureDate);

    navigate(
      `/search/buses?${busParams.toString()}`,
      { state: payload }
    );
  };

  return (
    <div style={{ color: "#1f2937" }}>
      <form onSubmit={handleSearch} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
        <B2BPlaceAutocomplete
          label="From City"
          value={fromCity}
          onChange={setFromCity}
          tripType="bus"
          field="from"
          placeholder="Origin City"
        />

        <B2BPlaceAutocomplete
          label="To City"
          value={toCity}
          onChange={setToCity}
          tripType="bus"
          field="to"
          placeholder="Destination City"
        />

        <div className="b2b-form-group">
          <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Departure Date</label>
          <input
            type="date"
            className="b2b-input-field"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            style={{ background: "white", color: "#1f2937" }}
            min={new Date().toISOString().split("T")[0]}
          />
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
          <span>Search Buses</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
