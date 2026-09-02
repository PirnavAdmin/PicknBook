import React, { useState, useEffect, useRef } from "react";
import { Plane, Building2, Bus } from "lucide-react";


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
              cityName: typeof item === "string" ? item : item?.cityName || "",
              cityId: typeof item === "object" ? String(item.cityId || item.CityId || item.cico_id || item.id || item.place_id || "") : "",
              usageCount:
                typeof item === "object" && item?.usageCount
                  ? item.usageCount
                  : 0,
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
    <div className={`${isInline ? "" : "field"} place-autocomplete ${className || ""}`} ref={wrapperRef} style={isInline ? { width: '100%', position: 'relative' } : {}}>
      {label && <label>{label}</label>}
      <div className={isInline ? "inline-autocomplete-wrap" : "control-wrap"} style={isInline ? { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' } : {}}>
        {tripType === "flight" ? (
          <Plane size={18} color={isInline ? "var(--hotel-muted)" : "currentColor"} />
        ) : tripType === "hotel" ? (
          <Building2 size={18} color={isInline ? "var(--hotel-muted)" : "currentColor"} />
        ) : (
          <Bus size={18} color={isInline ? "var(--hotel-muted)" : "currentColor"} />
        )}
        {isInline ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#222' }}>Stay destination</span>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setOpen(inputValue.trim().length > 0)}
              className={`inline-autocomplete-input ${error ? "error" : ""}`}
              placeholder={placeholder}
              autoComplete="off"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                color: 'var(--hotel-muted)',
                fontWeight: 600,
                fontSize: '1.02rem',
                padding: 0,
                marginTop: '5px',
                width: '100%'
              }}
            />
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
                className={isBusMode ? "bus-place-option" : "place-option"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                {item.cityName}
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
