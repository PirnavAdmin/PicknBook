import React from "react";
import { ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import PlaceAutocomplete from "../../../../components/PlaceAutocomplete";
import CustomDatePicker from "../../../../components/CustomDatePicker";

export default function BusSearchWidget({
  isBusTwoWay,
  busFrom,
  busFromError,
  handleBusFromChange,
  busTo,
  busToError,
  handleBusToChange,
  handleSwapBuses,
  activeCalendarField,
  setActiveCalendarField,
  busDepartureDate,
  toDisplayDate,
  setBusDepartureDate,
  busReturnDate,
  setBusReturnDate,
  handleSearch,
}) {
  return (
    <div className={`flight-search-bar-row ${isBusTwoWay ? "two-way" : "one-way"}`}>
      <PlaceAutocomplete
        label="Source"
        value={busFrom}
        onChange={handleBusFromChange}
        tripType="bus"
        field="from"
        placeholder="Source"
        error={busFromError}
        className="source-field"
      />

      <div className="swap-field">
        <button
          type="button"
          className="swap-btn"
          onClick={handleSwapBuses}
          aria-label="Swap bus origin and destination"
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>

      <PlaceAutocomplete
        label="Destination"
        value={busTo}
        onChange={handleBusToChange}
        tripType="bus"
        field="to"
        placeholder="Destination"
        error={busToError}
        className="destination-field"
      />

      <div className="field field-with-icon departure-field" style={{ position: "relative" }}>
        <label>Departure</label>
        <div
          className="control-wrap"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveCalendarField((prev) => (prev === "bus-dep" ? null : "bus-dep"))}
        >
          <CalendarDays size={18} />
          <input
            type="text"
            readOnly
            value={toDisplayDate(busDepartureDate)}
            placeholder="DD-MM-YYYY"
            className="field-control with-leading-icon"
            style={{ cursor: "pointer" }}
          />
        </div>
        {activeCalendarField === "bus-dep" && (
          <CustomDatePicker
            isOpen={true}
            value={busDepartureDate}
            onChange={(newDate) => {
              setBusDepartureDate(newDate);
              if (busReturnDate && newDate && busReturnDate < newDate) {
                setBusReturnDate("");
              }
            }}
            onClose={() => setActiveCalendarField(null)}
          />
        )}
      </div>

      {isBusTwoWay && (
        <div className="field field-with-icon return-field" style={{ position: "relative" }}>
          <label>Return</label>
          <div
            className="control-wrap"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveCalendarField((prev) => (prev === "bus-ret" ? null : "bus-ret"))}
          >
            <CalendarDays size={18} />
            <input
              type="text"
              readOnly
              value={toDisplayDate(busReturnDate)}
              placeholder="DD-MM-YYYY"
              className="field-control with-leading-icon"
              style={{ cursor: "pointer" }}
            />
          </div>
          {activeCalendarField === "bus-ret" && (
            <CustomDatePicker
              isOpen={true}
              value={busReturnDate}
              minDate={busDepartureDate || ""}
              onChange={(newDate) => setBusReturnDate(newDate)}
              onClose={() => setActiveCalendarField(null)}
            />
          )}
        </div>
      )}

      <button
        type="button"
        className="search-btn flight-grid-search-btn"
        onClick={handleSearch}
      >
        <Search size={16} />
        <span>Search Buses</span>
      </button>
    </div>
  );
}
