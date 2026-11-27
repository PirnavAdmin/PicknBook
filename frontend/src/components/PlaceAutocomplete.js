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
  sublabel,
  hideLabel = false,
  hideIcon = false,
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
          .map((item) => {
            const isObj = typeof item === "object" && item !== null;
            const locationType = isObj
              ? String(item.locationType || item.LocationType || (item.hotelId || item.HotelId ? "HOTEL" : "CITY")).toUpperCase()
              : "CITY";
            const hotelId = isObj
              ? String(item.hotelId || item.HotelId || item.hotelCode || item.HotelCode || "")
              : "";
            const hotelName = isObj
              ? (item.hotelName || item.HotelName || "")
              : "";
            const parentCityName = isObj
              ? (item.parentCityName || item.ParentCityName || "")
              : "";
            const fullName = isObj
              ? (item.fullName || item.FullName || "")
              : "";
            const searchCityId = isObj
              ? String(item.searchCityId || item.SearchCityId || "")
              : "";
            const source = isObj
              ? (item.source || item.Source || "")
              : "";

            const rawCityName = typeof item === "string" ? item : (item?.cityName || item?.CityName || item?.name || item?.Name || hotelName || "");
            const rawCityId = isObj ? String(item.cityId || item.cityCode || item.CityId || item.cico_id || item.id || item.place_id || searchCityId || "") : "";

            return {
              cityName: rawCityName,
              cityId: rawCityId,
              stateName: isObj ? (item.stateName || item.StateName || "") : "",
              airportCode: isObj ? (item.airportCode || item.AirportCode || item.iataCode || "") : "",
              airportName: isObj ? (item.airportName || item.AirportName || "") : "",
              usageCount: isObj && item?.usageCount ? item.usageCount : 0,
              locationType,
              hotelId,
              hotelName,
              fullName,
              parentCityName,
              searchCityId,
              source,
              rawItem: item,
            };
          })
          .filter((item) => item.cityName || item.hotelName);

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
    console.log(`[DEBUG PlaceAutocomplete] handleSelect: item=`, item);
    const name = (item.locationType === "HOTEL" && item.hotelName) ? item.hotelName : (item.cityName || item);
    const displayName = tripType === "flight" && item.airportCode ? `${item.cityName} (${item.airportCode})` : name;
    setInputValue(displayName);
    if (typeof onChange === "function") {
      onChange(displayName, item.cityId, item);
    }
    setOpen(false);
  };

  const isBusMode = tripType === "bus" || tripType === "buses";

  return (
    <div className={`${isInline ? "" : "field"} place-autocomplete ${className || ""}`} ref={wrapperRef} style={{ position: "relative", width: isInline ? "100%" : undefined, minWidth: 0 }}>
      {label && !isInline && !hideLabel && <label>{label}</label>}
      <div className={isInline ? "inline-autocomplete-wrap" : "control-wrap"} style={isInline ? { display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 } : {}}>
        {!isInline && !hideIcon && (
          tripType === "flight" ? (
            <Plane size={18} color="currentColor" style={{ flexShrink: 0 }} />
          ) : tripType === "hotel" ? (
            <MapPin size={18} color="#ff0000" style={{ flexShrink: 0 }} />
          ) : isBusMode && (field === "to" || field === "destination") ? (
            <MapPin size={18} color="currentColor" style={{ flexShrink: 0 }} />
          ) : (
            <Bus size={18} color="currentColor" style={{ flexShrink: 0 }} />
          )
        )}
        {isInline ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {label || (tripType === "hotel" ? "STAY DESTINATION" : (field === "to" || field === "destination") ? "TO" : "FROM")}
            </span>
            {tripType === "flight" ? (
              <Plane size={14} color="#000000" style={{ flexShrink: 0 }} />
            ) : tripType === "hotel" ? (
              <MapPin size={14} color="#000000" style={{ flexShrink: 0 }} />
            ) : isBusMode && (field === "to" || field === "destination") ? (
              <MapPin size={14} color="#000000" style={{ flexShrink: 0 }} />
            ) : (
              <Bus size={14} color="#000000" style={{ flexShrink: 0 }} />
            )}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setOpen(inputValue.trim().length > 0)}
              className={`inline-autocomplete-input ${error ? "error" : ""}`}
              placeholder={placeholder || (tripType === "hotel" ? "Enter city, area or hotel" : "Enter city")}
              autoComplete="off"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                color: '#000000',
                fontWeight: 400,
                fontSize: '13px',
                padding: 0,
                margin: 0,
                width: '100%',
                flex: 1,
                minWidth: 0
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
        <div
          className={isBusMode ? "bus-place-dropdown" : "place-dropdown"}
          style={isInline ? {
            position: 'absolute',
            top: 'calc(100% + 14px)',
            left: 0,
            zIndex: 9999,
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
            border: '1px solid #e2e8f0',
            maxHeight: '480px',
            overflowY: 'auto',
            width: '100%',
            minWidth: '240px',
            maxWidth: '100%',
            color: '#0f172a'
          } : {}}
        >
          {loading ? (
            <div className={isBusMode ? "bus-place-meta" : "place-meta"} style={isInline ? { color: '#64748b', padding: '12px 16px' } : {}}>Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={`${item.locationType || "place"}-${item.hotelId || item.cityId || idx}-${item.cityName || item.hotelName}`}
                type="button"
                className="pnb-place-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <div className="pnb-place-icon-wrap">
                  {tripType === "flight" ? (
                    <Plane size={15} color="#ff0000" strokeWidth={2.5} />
                  ) : tripType === "hotel" ? (
                    item.locationType === "LOCALITY" ? (
                      <MapPin size={15} color="#ff0000" strokeWidth={2.5} />
                    ) : (
                      <Building2 size={15} color="#ff0000" strokeWidth={2.5} />
                    )
                  ) : (
                    <Bus size={15} color="#ff0000" strokeWidth={2.5} />
                  )}
                </div>
                <div className="pnb-place-text">
                  <div className="pnb-place-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="pnb-place-city">
                      {tripType === "hotel" && item.locationType === "HOTEL" && item.hotelName
                        ? item.hotelName
                        : item.cityName}
                    </span>
                    {tripType === "flight" && item.airportCode && (
                      <span className="pnb-place-code">{item.airportCode}</span>
                    )}
                    {tripType === "hotel" && item.locationType === "HOTEL" && (
                      <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>HOTEL</span>
                    )}
                    {tripType === "hotel" && item.locationType === "LOCALITY" && (
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#d97706', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>AREA</span>
                    )}
                  </div>
                  {tripType === "hotel" ? (
                    <div className="pnb-place-secondary">
                      {item.locationType === "HOTEL"
                        ? (item.cityName ? `Hotel • ${item.cityName}` : "Hotel")
                        : item.locationType === "LOCALITY"
                          ? `Area • ${[item.parentCityName || item.cityName, item.stateName].filter(Boolean).join(", ")}`
                          : [item.stateName, item.source ? `(${item.source})` : ""].filter(Boolean).join(" ")}
                    </div>
                  ) : (
                    (tripType === "flight"
                      ? [item.airportName, item.stateName].filter(Boolean).join(", ")
                      : item.stateName
                    ) && (
                      <div className="pnb-place-secondary">
                        {tripType === "flight"
                          ? [item.airportName, item.stateName].filter(Boolean).join(", ")
                          : item.stateName}
                      </div>
                    )
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className={isBusMode ? "bus-place-meta" : "place-meta"} style={isInline ? { color: '#64748b', padding: '12px 16px' } : {}}>No matching places found</div>
          )}
        </div>
      )}
    </div>
  );
}

