import React, { useState, useEffect, useRef } from "react";
import { Plane, Building2, Bus, MapPin } from "lucide-react";


const USE_DIRECT_API_IN_DEV =
  String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() ===
  "true";
const IS_LOCAL_DEV =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const PLACES_API_URL =
  IS_LOCAL_DEV && !USE_DIRECT_API_IN_DEV
    ? "/api/Places"
    : process.env.REACT_APP_PLACES_API_URL || "/api/Places";



export default function PlaceAutocomplete({
  label,
  value,
  onChange,
  tripType,
  field,
  placeholder,
  className,
  error,
  isInline = false,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => {
    setInputValue((prev) => (prev !== (value || "") ? (value || "") : prev));
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
      setResults((prev) => (prev.length === 0 ? prev : []));
      setLoading((prev) => (prev ? false : prev));

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
          endpoint.searchParams.set("tripType", tripType);
          endpoint.searchParams.set("field", "all");
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
              cityName:    typeof item === "string" ? item : item?.cityName    || "",
              cityId:      typeof item === "object"  ? String(item.cityId || item.CityId || item.cico_id || item.id || item.place_id || "") : "",
              stateName:   typeof item === "object"  ? (item.stateName   || item.StateName   || "") : "",
              airportCode: typeof item === "object"  ? (item.airportCode || item.AirportCode || item.iataCode || "") : "",
              airportName: typeof item === "object"  ? (item.airportName || item.AirportName || "") : "",
              usageCount:  typeof item === "object" && item?.usageCount ? item.usageCount : 0,
            }))
            .filter((item) => item.cityName);

          setResults(normalized);

      } catch (error) {
        if (error.name !== "AbortError") {
          setResults((prev) => (prev.length === 0 ? prev : []));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => (prev ? false : prev));
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
    if (typeof onChange === "function") {
      onChange(nextValue);
    }
    setOpen(nextValue.trim().length > 0);
  };

  const handleSelect = (item) => {
    const name = item.cityName || item;
    setInputValue(name);
    onChange(name, item.cityId);
    setOpen(false);
  };

  const isBusMode = tripType === "bus" || tripType === "buses";

  return (
    <div className={`${isInline ? "" : "field"} place-autocomplete ${className || ""}`} ref={wrapperRef} style={{ position: "relative", width: isInline ? "100%" : undefined }}>
      {label && <label>{label}</label>}
      <div className={isInline ? "inline-autocomplete-wrap" : "control-wrap"} style={isInline ? { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' } : {}}>
        {tripType === "flight" ? (
          <Plane size={18} color={isInline ? "#ffffff" : "currentColor"} />
        ) : tripType === "hotel" ? (
          <MapPin size={18} color={isInline ? "#ffffff" : "#dc2626"} />
        ) : (
          <Bus size={18} color={isInline ? "#ffffff" : "currentColor"} />
        )}
        {isInline ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {label || "STAY DESTINATION"}
            </span>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setOpen(inputValue.trim().length > 0)}
              className={`inline-autocomplete-input ${error ? "error" : ""}`}
              placeholder={placeholder || "Enter city, area or hotel"}
              autoComplete="off"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.02rem',
                padding: 0,
                margin: '2px 0',
                width: '100%'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              ENTER CITY, AREA OR HOTEL
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(inputValue.trim().length > 0)}
            className={`field-control place-input ${error ? "error" : ""} with-leading-icon`}
            placeholder={placeholder}
            autoComplete="off"
          />
        )}
      </div>

      {open && (
        <div className={isBusMode ? "bus-place-dropdown" : "place-dropdown"}>
          {loading ? (
            <div className={isBusMode ? "bus-place-meta" : "place-meta"}>Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={`${item.cityName}-${item.usageCount || idx}`}
                type="button"
                className="pnb-place-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <div className="pnb-place-icon-wrap">
                  {tripType === "flight" ? (
                    <Plane size={15} />
                  ) : tripType === "hotel" ? (
                    <Building2 size={15} />
                  ) : (
                    <Bus size={15} />
                  )}
                </div>
                <div className="pnb-place-text">
                  <div className="pnb-place-primary">
                    <span className="pnb-place-city">{item.cityName}</span>
                    {tripType === "flight" && item.airportCode && (
                      <span className="pnb-place-code">{item.airportCode}</span>
                    )}
                  </div>
                  {(tripType === "flight"
                    ? [item.airportName, item.stateName].filter(Boolean).join(", ")
                    : item.stateName
                  ) && (
                    <div className="pnb-place-secondary">
                      {tripType === "flight"
                        ? [item.airportName, item.stateName].filter(Boolean).join(", ")
                        : item.stateName}
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className={isBusMode ? "bus-place-meta" : "place-meta"}>No matching places found</div>
          )}
        </div>
      )}
    </div>
  );
}
