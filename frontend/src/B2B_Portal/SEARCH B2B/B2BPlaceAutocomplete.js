/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { Plane, Bus, Building2 } from "lucide-react";
import "../../STYLES/B2BLayout.css";

const PLACES_API_URL = process.env.NODE_ENV === "production" ? "/api/Places" : process.env.REACT_APP_PLACES_API_URL || "/api/Places";

const FALLBACK_CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Pune",
  "Vijayawada",
  "Visakhapatnam",
  "Delhi",
  "Kolkata",
  "Ahmedabad",
  "Proddatur",  
];

export default function B2BPlaceAutocomplete({
  label,
  value,
  onChange,
  tripType,
  field,
  placeholder,
  className,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = inputValue.trim();

    if (!open || query.length === 0) {
      setResults([]);
      setLoading(false);
      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }
      return;
    }

    const controller = new AbortController();
    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
    }
    requestAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = new URL(PLACES_API_URL, window.location.origin);
        endpoint.searchParams.set("query", query);
        endpoint.searchParams.set("tripType", tripType === "hotel" ? "all" : tripType);
        endpoint.searchParams.set("field", field);
        endpoint.searchParams.set("limit", "20");

        const needsNgrokBypass =
          endpoint.hostname.includes("ngrok-free.dev") ||
          endpoint.hostname.includes("ngrok.io");

        const response = await fetch(endpoint.toString(), {
          signal: controller.signal,
          headers: needsNgrokBypass
            ? { "ngrok-skip-browser-warning": "true" }
            : undefined,
        });

        if (!response.ok) {
          throw new Error(`Place API failed with status ${response.status}`);
        }

        const payload = await response.json();
        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.value)
            ? payload.value
            : [];

        const normalized = rawList
          .map((item) => ({
            cityName: typeof item === "string" ? item : item?.cityName || "",
            usageCount: typeof item === "object" && item?.usageCount ? item.usageCount : 0,
          }))
          .filter((item) => item.cityName);

        setResults(normalized);
      } catch (error) {
        if (error.name !== "AbortError") {
          const normalizedQuery = query.toLowerCase();
          const fallbackMatches = FALLBACK_CITIES.filter((city) =>
            city.toLowerCase().includes(normalizedQuery)
          ).map((cityName, index) => ({
            cityName,
            usageCount: 100 - index,
          }));
          setResults(fallbackMatches);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, open, tripType, field]);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange(nextValue);
    setOpen(nextValue.trim().length > 0);
  };

  const handleSelect = (cityName) => {
    setInputValue(cityName);
    onChange(cityName);
    setOpen(false);
  };

  return (
    <div className={`b2b-form-group place-autocomplete ${className || ""}`} ref={wrapperRef} style={{ position: "relative" }}>
      <label style={{ fontSize: "0.8rem", color: "var(--b2b-text-secondary)", marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 12, color: "var(--b2b-text-secondary)", zIndex: 2 }}>
          {tripType === "flight" ? (
            <Plane size={16} />
          ) : tripType === "hotel" ? (
            <Building2 size={16} />
          ) : (
            <Bus size={16} />
          )}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(inputValue.trim().length > 0)}
          className="b2b-input-field"
          style={{ paddingLeft: 38, background: "white", color: "#1f2937" }}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          zIndex: 50,
          marginTop: 4,
          maxHeight: 240,
          overflowY: "auto"
        }}>
          {loading ? (
            <div style={{ padding: 10, fontSize: "0.85rem", color: "#6b7280" }}>Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={`${item.cityName}-${item.usageCount}`}
                type="button"
                className="place-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item.cityName)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: "0.85rem",
                  color: "#1f2937",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer"
                }}
              >
                {item.cityName}
              </button>
            ))
          ) : (
            <div style={{ padding: 10, fontSize: "0.85rem", color: "#6b7280" }}>No matching places found</div>
          )}
        </div>
      )}
    </div>
  );
}
