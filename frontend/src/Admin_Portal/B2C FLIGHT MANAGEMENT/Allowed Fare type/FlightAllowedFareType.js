import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./FlightAllowedFareType.css";

const ALLOWED_FARE_TYPE_STORAGE_KEY = "admin_flight_allowed_fare_types";

const FARE_TYPE_OPTIONS = [
  "Publish",
  "Corporate",
  "Coupon",
  "SME",
  "Other",
  "Promo",
  "Tactical",
  "Flexi",
  "Special",
  "SpecialReturn",
  "SpecialOneWay",
  "SeniorCitizen",
  "Student",
  "ArmedForce",
  "Plus",
  "Request",
  "Refundable",
  "Standard",
  "Regular",
  "Prestige",
  "Saver",
  "Simple",
  "Discount",
  "Value",
  "Flex",
  "Comfort",
  "NDC",
  "CorporateT",
  "SOTO",
  "Classic",
  "SUPER 6E",
  "FULL REFUND*",
  "Light",
  "Xpress Lite",
  "Stretch Fare",
  "NDC Value",
  "Basic",
  "Private",
  "UpFront",
  "StretchPlus",
];

const normalizeText = (value) => String(value ?? "").trim();

function uniqueValues(values) {
  const seen = new Set();
  const unique = [];

  values.forEach((value) => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
}

function readAllowedFareTypes() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ALLOWED_FARE_TYPE_STORAGE_KEY) || "";
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const allowedOptionSet = new Set(FARE_TYPE_OPTIONS);
    const sanitized = uniqueValues(parsed).filter((value) => allowedOptionSet.has(value));
    return sanitized;
  } catch {
    return [];
  }
}

function writeAllowedFareTypes(selectedTypes) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      ALLOWED_FARE_TYPE_STORAGE_KEY,
      JSON.stringify(uniqueValues(selectedTypes))
    );
    return true;
  } catch {
    return false;
  }
}

export default function AdminFlightAllowedFareTypePage() {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [selectedTypes, setSelectedTypes] = useState(() => readAllowedFareTypes());
  const [searchText, setSearchText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  const filteredOptions = useMemo(() => {
    const query = normalizeText(searchText).toLowerCase();
    if (!query) {
      return FARE_TYPE_OPTIONS;
    }

    return FARE_TYPE_OPTIONS.filter((option) => option.toLowerCase().includes(query));
  }, [searchText]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const openDropdown = () => {
    setIsDropdownOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const toggleSelection = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return;
    }

    setSelectedTypes((previous) => {
      const next = previous.includes(normalized)
        ? previous.filter((item) => item !== normalized)
        : [...previous, normalized];

      return uniqueValues(next);
    });
    setSuccessMessage("");
    setErrorMessage("");
  };

  const removeSelection = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return;
    }

    setSelectedTypes((previous) => previous.filter((item) => item !== normalized));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleUpdate = () => {
    setSuccessMessage("");
    setErrorMessage("");

    if (selectedTypes.length === 0) {
      setErrorMessage("Select at least one fare type.");
      return;
    }

    const saved = writeAllowedFareTypes(selectedTypes);
    if (!saved) {
      setErrorMessage("Unable to update allowed fare types.");
      return;
    }

    setSuccessMessage("Successfully Updated!");
    setSearchText("");
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (event.key === "Backspace" && !normalizeText(searchText) && selectedTypes.length > 0) {
      removeSelection(selectedTypes[selectedTypes.length - 1]);
    }
  };

  return (
    <section className="admin-b2c-page admin-flight-fare-type-page">
      <header className="admin-b2c-header admin-flight-fare-type-header">
        <h1 style={{ fontWeight: 500 }}>
          <span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Allowed Fare Type
        </h1>
      </header>

      {successMessage ? (
        <div className="admin-flight-fare-type-success" role="status">
          <span>{successMessage}</span>
          <button
            type="button"
            className="admin-flight-fare-type-success-close"
            aria-label="Dismiss message"
            onClick={() => setSuccessMessage("")}
          >
            Ã—
          </button>
        </div>
      ) : null}

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      <section className="admin-flight-fare-type-shell">
        <div className="admin-flight-fare-type-row">
          <div className="admin-flight-fare-type-label">Allowed Fare Type</div>
          <div className="admin-flight-fare-type-field">
            <div
              ref={containerRef}
              className={`admin-flight-fare-type-multi ${isDropdownOpen ? "open" : ""}`}
              onMouseDown={(event) => {
                if (event.target.closest("button")) {
                  return;
                }
                openDropdown();
              }}
            >
              <div className="admin-flight-fare-type-chips">
                {selectedTypes.map((value) => (
                  <span key={value} className="admin-flight-fare-type-chip">
                    <span className="admin-flight-fare-type-chip-text">{value}</span>
                    <button
                      type="button"
                      className="admin-flight-fare-type-chip-remove"
                      aria-label={`Remove ${value}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeSelection(value);
                      }}
                    >
                      Ã—
                    </button>
                  </span>
                ))}

                <input
                  ref={inputRef}
                  className="admin-flight-fare-type-input"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedTypes.length ? "" : "Select Some Options"}
                  autoComplete="off"
                />
              </div>

              <ChevronDown className="admin-flight-fare-type-chevron" size={16} />

              {isDropdownOpen ? (
                <div className="admin-flight-fare-type-dropdown" role="listbox">
                  {filteredOptions.length === 0 ? (
                    <div className="admin-flight-fare-type-empty">No matching fare types.</div>
                  ) : (
                    filteredOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`admin-flight-fare-type-option ${
                          selectedSet.has(option) ? "selected" : ""
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggleSelection(option)}
                        role="option"
                        aria-selected={selectedSet.has(option)}
                      >
                        <span>{option}</span>
                        {selectedSet.has(option) ? (
                          <span className="admin-flight-fare-type-option-mark">âœ“</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="admin-flight-fare-type-actions">
          <button type="button" className="admin-flight-fare-type-update-btn" onClick={handleUpdate}>
            UPDATE
          </button>
        </div>
      </section>
    </section>
  );
}


