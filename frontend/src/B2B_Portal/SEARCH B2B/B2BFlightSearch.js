/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Calendar, Users, ArrowRight, Plus, Trash2 } from "lucide-react";
import B2BPlaceAutocomplete from "./B2BPlaceAutocomplete";
import "../../STYLES/B2BLayout.css";

const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

export default function B2BFlightSearch() {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState("oneway");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const [cabinClass, setCabinClass] = useState("economy");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [showTravelerDropdown, setShowTravelerDropdown] = useState(false);

  // Multi-city legs state — start empty
  const [multiCityLegs, setMultiCityLegs] = useState([
    { id: 1, from: "", to: "", departureDate: "" },
    { id: 2, from: "", to: "", departureDate: "" },
  ]);

  const handleSearch = (e) => {
    e.preventDefault();
    const flightParams = new URLSearchParams();

    let payload = {};
    if (tripType === "multicity") {
      const legsData = multiCityLegs.map((leg) => ({
        fromCity: leg.from,
        toCity: leg.to,
        departureDate: leg.departureDate,
      }));
      payload = {
        tripType: "multicity",
        legs: legsData,
        adults,
        children,
        infants,
        cabinClass,
      };
      flightParams.set("tripType", "multicity");
      flightParams.set("legs", JSON.stringify(legsData));
      flightParams.set("adults", adults.toString());
      flightParams.set("children", children.toString());
      flightParams.set("infants", infants.toString());
      flightParams.set("cabinClass", cabinClass);
    } else {
      payload = {
        tripType,
        fromCity,
        toCity,
        departureDate,
        returnDate: tripType === "roundtrip" ? returnDate : undefined,
        adults,
        children,
        infants,
        cabinClass,
      };
      flightParams.set("tripType", tripType);
      flightParams.set("fromCity", fromCity);
      flightParams.set("toCity", toCity);
      flightParams.set("departureDate", departureDate);
      if (tripType === "roundtrip") {
        flightParams.set("returnDate", returnDate);
      }
      flightParams.set("adults", adults.toString());
      flightParams.set("children", children.toString());
      flightParams.set("infants", infants.toString());
      flightParams.set("cabinClass", cabinClass);
    }

    navigate(
      `/search/flights?${flightParams.toString()}`,
      { state: payload }
    );
  };

  const addMultiCityLeg = () => {
    if (multiCityLegs.length >= 6) return;
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    const nextDate = new Date(lastLeg.departureDate);
    nextDate.setDate(nextDate.getDate() + 3);
    setMultiCityLegs([
      ...multiCityLegs,
      {
        id: Date.now(),
        from: lastLeg.to,
        to: "",
        departureDate: nextDate.toISOString().split("T")[0],
      },
    ]);
  };

  const removeMultiCityLeg = (id) => {
    if (multiCityLegs.length <= 2) return;
    setMultiCityLegs(multiCityLegs.filter((leg) => leg.id !== id));
  };

  const updateMultiCityLeg = (id, key, val) => {
    setMultiCityLegs(multiCityLegs.map((leg) => leg.id === id ? { ...leg, [key]: val } : leg));
  };

  return (
    <div style={{ color: "#1f2937" }}>
      <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
        {["oneway", "roundtrip", "multicity"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTripType(type)}
            className="b2b-sidebar-item"
            style={{
              padding: "8px 16px",
              fontSize: "0.85rem",
              background: tripType === type ? "rgba(37, 99, 235, 0.08)" : "transparent",
              color: tripType === type ? "var(--b2b-accent)" : "#4b5563",
              border: "none",
              borderRadius: 6,
              fontWeight: tripType === type ? 600 : 500,
            }}
          >
            {type === "oneway" ? "One Way" : type === "roundtrip" ? "Round Trip" : "Multi City"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {tripType !== "multicity" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <B2BPlaceAutocomplete
              label="From City"
              value={fromCity}
              onChange={setFromCity}
              tripType="flight"
              field="from"
              placeholder="Origin Airport/City"
            />
            <B2BPlaceAutocomplete
              label="To City"
              value={toCity}
              onChange={setToCity}
              tripType="flight"
              field="to"
              placeholder="Destination Airport/City"
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
            {tripType === "roundtrip" && (
              <div className="b2b-form-group">
                <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Return Date</label>
                <input
                  type="date"
                  className="b2b-input-field"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  style={{ background: "white", color: "#1f2937" }}
                  min={departureDate}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {multiCityLegs.map((leg, idx) => (
              <div key={leg.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
                <B2BPlaceAutocomplete
                  label={`Leg ${idx + 1} - From`}
                  value={leg.from}
                  onChange={(val) => updateMultiCityLeg(leg.id, "from", val)}
                  tripType="flight"
                  field="from"
                  placeholder="Origin"
                />
                <B2BPlaceAutocomplete
                  label={`Leg ${idx + 1} - To`}
                  value={leg.to}
                  onChange={(val) => updateMultiCityLeg(leg.id, "to", val)}
                  tripType="flight"
                  field="to"
                  placeholder="Destination"
                />
                <div className="b2b-form-group">
                  <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Departure</label>
                  <input
                    type="date"
                    className="b2b-input-field"
                    value={leg.departureDate}
                    onChange={(e) => updateMultiCityLeg(leg.id, "departureDate", e.target.value)}
                    style={{ background: "white", color: "#1f2937" }}
                    min={idx > 0 ? multiCityLegs[idx - 1].departureDate : new Date().toISOString().split("T")[0]}
                  />
                </div>
                {multiCityLegs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeMultiCityLeg(leg.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 10,
                      alignSelf: "center",
                      marginTop: 20
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMultiCityLeg}
              className="b2b-sidebar-item"
              style={{
                width: "fit-content",
                background: "transparent",
                border: "1px dashed var(--b2b-accent)",
                color: "var(--b2b-accent)",
                padding: "6px 14px",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.8rem"
              }}
            >
              <Plus size={14} />
              <span>Add Destination</span>
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
          {/* Travelers dropdown */}
          <div className="b2b-form-group" style={{ position: "relative" }}>
            <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Travelers</label>
            <button
              type="button"
              onClick={() => setShowTravelerDropdown(!showTravelerDropdown)}
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
              <span>{adults + children + infants} Traveler(s)</span>
              <Users size={16} style={{ color: "#6b7280" }} />
            </button>

            {showTravelerDropdown && (
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
                marginTop: 4
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>Adults</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>12+ years</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" disabled={adults <= 1} onClick={() => setAdults(adults - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                    <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{adults}</span>
                    <button type="button" onClick={() => setAdults(adults + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>Children</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>2-12 years</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" disabled={children <= 0} onClick={() => setChildren(children - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                    <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{children}</span>
                    <button type="button" onClick={() => setChildren(children + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>Infants</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Under 2 years</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" disabled={infants <= 0} onClick={() => setInfants(infants - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>-</button>
                    <span style={{ fontSize: "0.85rem", color: "#1f2937", width: 20, textAlign: "center" }}>{infants}</span>
                    <button type="button" onClick={() => setInfants(infants + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}>+</button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTravelerDropdown(false)}
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

          {/* Cabin class select */}
          <div className="b2b-form-group">
            <label style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: 6, display: "block" }}>Cabin Class</label>
            <select
              className="b2b-input-field"
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value)}
              style={{ background: "white", color: "#1f2937" }}
            >
              {CABIN_CLASSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              padding: "10px 24px"
            }}
          >
            <span>Search Flights</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
