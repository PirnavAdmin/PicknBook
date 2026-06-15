import React from "react";
import "../../STYLES/SeatSelection.css";

// SVG representing a standard bus seater seat (facing left/front towards driver, upright text)
function SeaterIcon({ label }) {
  return (
    <svg
      className="seat-icon seat-icon--seater"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="40" height="40" rx="6" className="seat-body" strokeWidth="2" />
      {/* Headrest on the right (so passenger faces left/driver side) */}
      <rect x="34" y="12" width="5" height="20" rx="1.5" className="seat-headrest" />
      {/* Armrests on top and bottom */}
      <rect x="10" y="5" width="20" height="4" rx="1.5" className="seat-armrest" />
      <rect x="10" y="35" width="20" height="4" rx="1.5" className="seat-armrest" />
      {/* Label text remains upright and direct */}
      <text x="18" y="26" className="seat-label" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

// SVG representing a bus sleeper seat (horizontal rectangle, pillow on the left/front)
function SleeperIcon({ label }) {
  return (
    <svg
      className="seat-icon seat-icon--sleeper"
      viewBox="0 0 92 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="88" height="36" rx="6" className="seat-body" strokeWidth="2" />
      <rect x="6" y="6" width="16" height="28" rx="3" className="sleeper-pillow" />
      <text x="50" y="22" className="seat-label" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

// SVG representing a flight seat (curved top backrest, slim armrests)
function FlightSeatIcon({ label }) {
  return (
    <svg
      className="seat-icon seat-icon--flight"
      viewBox="0 0 40 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 9C6 4 34 4 34 9V38C34 40 32 42 30 42H10C8 42 6 40 6 38V9Z"
        className="seat-body"
        strokeWidth="2"
      />
      <rect x="12" y="6" width="16" height="7" rx="3.5" className="seat-headrest" />
      <line x1="3" y1="16" x2="3" y2="34" className="seat-armrest" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="37" y1="16" x2="37" y2="34" className="seat-armrest" strokeWidth="2.2" strokeLinecap="round" />
      <text x="20" y="26" className="seat-label" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

export default function SeatSelection({
  vehicleType = "bus",
  selectedSeatLabels = [],
  onSeatToggle,
  
  // Flight Props
  cabinData = null,
  seatsByLabel = new Map(),

  // Bus Props
  layoutKind = "seater",
  hasDeckSections = false,
  hasBackendSections = false,
  seatDeckGroups = [],
  lowerDeckRows = [],
  upperDeckRows = [],
  mainDeckRows = [],
  allSeatRows = [],
  activeFareFilter = "all",
  onSeatHover = () => {},
  onSeatMouseLeave = () => {},
}) {
  // --- BUS RENDERERS ---

  const renderBusSeatButton = (seat) => {
    if (!seat) {
      return <div className="seat-gap-placeholder" key={Math.random()} />;
    }

    const isSelected = selectedSeatLabels.includes(seat.label);
    const isDimmed = activeFareFilter !== "all" && Number(activeFareFilter) !== seat.fare;
    const isBooked = seat.status === "booked";

    const isBookedFemale = isBooked && seat.bookedGender === "Female";
    const isBookedMale = isBooked && seat.bookedGender === "Male";

    const isNextToBookedFemale =
      !isBooked &&
      (seat.bookedGender === "Female" ||
        getAdjacentSeatLabelsFromRows(seat.label, allSeatRows).some((adjacentLabel) => {
          const adj = seatsByLabel.get(adjacentLabel);
          return adj?.status === "booked" && adj?.bookedGender === "Female";
        }));

    const isNextToBookedMale =
      !isBooked &&
      (seat.bookedGender === "Male" ||
        getAdjacentSeatLabelsFromRows(seat.label, allSeatRows).some((adjacentLabel) => {
          const adj = seatsByLabel.get(adjacentLabel);
          return adj?.status === "booked" && adj?.bookedGender === "Male";
        }));

    const statusClass = isSelected
      ? "status-selected"
      : isBooked
      ? "status-booked"
      : seat.status === "extra"
      ? "status-extra"
      : "status-available";

    const hoverClass = isBookedFemale
      ? "status-booked-female"
      : isBookedMale
      ? "status-booked-male"
      : isNextToBookedFemale
      ? "status-female-adjacent"
      : isNextToBookedMale
      ? "status-male-adjacent"
      : "";

    const seatWrapperClass = [
      "seat-button-wrapper",
      seat.kind === "sleeper" ? "sleeper-seat" : "seater-seat",
      statusClass,
      hoverClass,
      isDimmed ? "opacity-40" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={seat.id}
        type="button"
        className={seatWrapperClass}
        onClick={() => onSeatToggle(seat)}
        onMouseEnter={(event) =>
          onSeatHover({
            label: seat.label,
            displayLabel: seat.displayLabel,
            fare: seat.fare,
            status: seat.status,
            bookedGender: seat.bookedGender,
            isNextToBookedFemale,
            isNextToBookedMale,
            x: event.clientX,
            y: event.clientY,
          })
        }
        onMouseMove={(event) =>
          onSeatHover((previous) =>
            previous && previous.label === seat.label
              ? { ...previous, x: event.clientX, y: event.clientY }
              : previous
          )
        }
        onMouseLeave={onSeatMouseLeave}
        disabled={isBooked}
        title={`Seat: ${seat.displayLabel || seat.label} | Fare: ₹${seat.fare}`}
      >
        {seat.kind === "sleeper" ? (
          <SleeperIcon label={seat.displayLabel || seat.label} />
        ) : (
          <SeaterIcon label={seat.displayLabel || seat.label} />
        )}
      </button>
    );
  };

  const getAdjacentSeatLabelsFromRows = (seatLabel, rows) => {
    const normalized = String(seatLabel || "").trim();
    if (!normalized) return [];

    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const idx = row.findIndex((s) => s?.label === normalized);
      if (idx === -1) continue;

      const rowAnchor = row.find(Boolean);
      const configuredAisleAfterColumn = Number(rowAnchor?.aisleAfterColumn);
      const aisleIndex = Number.isFinite(configuredAisleAfterColumn)
        ? configuredAisleAfterColumn
        : row.length === 4
        ? 1
        : -1;

      return [idx - 1, idx + 1]
        .filter((adjacentIndex) => {
          if (adjacentIndex < 0 || adjacentIndex >= row.length || !row[adjacentIndex]) {
            return false;
          }
          return aisleIndex < 0 || Math.min(idx, adjacentIndex) !== aisleIndex;
        })
        .map((adjacentIndex) => row[adjacentIndex].label);
    }
    return [];
  };

  const renderBusDeckContent = (rows) => {
    if (!rows || rows.length === 0) {
      return <div className="text-center p-8 text-slate-400">No seats available on this deck</div>;
    }

    const firstSeat = rows.flat().find(Boolean);
    const configuredAisleAfterColumn = Number(firstSeat?.aisleAfterColumn);
    const aisleAfterColumn = Number.isFinite(configuredAisleAfterColumn) ? configuredAisleAfterColumn : -1;

    return (
      <div className="seats-grid-layout">
        {rows.map((row, rowIndex) => {
          if (!row) return null;
          
          // Standard generated seater deck (usually 4 seats with aisle in center)
          if (row.length === 4 && aisleAfterColumn === -1) {
            return (
              <div className="seat-row-wrapper" key={`row-${rowIndex}`}>
                {renderBusSeatButton(row[0])}
                {renderBusSeatButton(row[1])}
                <div className="aisle-spacer-col bus-horizontal-aisle" />
                {renderBusSeatButton(row[2])}
                {renderBusSeatButton(row[3])}
              </div>
            );
          }

          // Otherwise, render seats and insert aisle spacer column after aisleAfterColumn
          return (
            <div className="seat-row-wrapper" key={`row-${rowIndex}`}>
              {row.map((seat, colIndex) => (
                <React.Fragment key={`cell-${rowIndex}-${colIndex}`}>
                  {renderBusSeatButton(seat)}
                  {colIndex === aisleAfterColumn && (
                    <div className="aisle-spacer-col bus-horizontal-aisle" />
                  )}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBusVerticalSection = (section) => {
    if (!section || !section.rows) return null;

    return (
      <React.Fragment key={section.name}>
        {renderBusDeckContent(section.rows)}
      </React.Fragment>
    );
  };

  const renderBusShell = (content, deckLabel) => (
    <div className="bus-coach-container">
      {deckLabel && (
        <div className="bus-deck-label-container">
          <span className="bus-deck-label-text">{deckLabel}</span>
          <div className="bus-deck-steering-wheel">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#475569" strokeWidth="2.2" />
              <circle cx="12" cy="12" r="2.5" fill="#475569" />
              <path d="M4 12h16" stroke="#475569" strokeWidth="1.8" />
              <path d="M12 12v8" stroke="#475569" strokeWidth="1.8" />
            </svg>
          </div>
        </div>
      )}
      {/* Bus Coach floor containing actual grid running left-to-right */}
      <div className="bus-coach-floor">{content}</div>
    </div>
  );  const renderBusWidget = () => {
    // 1. Backend sections rendering (complex API mapping)
    if (hasDeckSections && hasBackendSections && seatDeckGroups.length > 0) {
      return (
        <div className="bus-decks-container">
          {seatDeckGroups.map((deckGroup) => (
            <div key={deckGroup.name} className="bus-deck-wrapper">
              {renderBusShell(
                deckGroup.sections.map((sec) => renderBusVerticalSection(sec)),
                deckGroup.name.replace(/ Deck/gi, '')
              )}
            </div>
          ))}
        </div>
      );
    }

    // 2. Multi-deck generated fallback (Lower Deck on top / Upper Deck below it)
    if (hasDeckSections) {
      return (
        <div className="bus-decks-container">
          {lowerDeckRows.length > 0 && (
            <div className="bus-deck-wrapper">
              {renderBusShell(renderBusDeckContent(lowerDeckRows), "Lower")}
            </div>
          )}
          {upperDeckRows.length > 0 && (
            <div className="bus-deck-wrapper">
              {renderBusShell(renderBusDeckContent(upperDeckRows), "Upper")}
            </div>
          )}
        </div>
      );
    }

    // 3. Single deck generated layout (Main Deck)
    return (
      <div className="bus-deck-wrapper">
        {renderBusShell(renderBusDeckContent(mainDeckRows), "Main")}
      </div>
    );
  };

  // --- FLIGHT RENDERERS ---

  const renderFlightSeatButton = (seat, seatLetter) => {
    if (!seat) {
      return <div className="seat-gap-placeholder" key={Math.random()} />;
    }

    const isSelected = selectedSeatLabels.includes(seat.label);
    const isBooked = seat.status === "booked";
    const isBusiness = cabinData.seatLetters.length === 4;

    const statusClass = isSelected
      ? "status-selected"
      : isBooked
      ? "status-booked"
      : seat.status === "extra"
      ? "status-extra"
      : "status-available";

    const seatWrapperClass = [
      "seat-button-wrapper",
      isBusiness ? "business-seat" : "economy-seat",
      statusClass,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={seat.id}
        type="button"
        className={seatWrapperClass}
        onClick={() => onSeatToggle(seat)}
        disabled={isBooked}
        title={`Seat: ${seat.label} | ${seat.status === "extra" ? "Extra Legroom (+₹720)" : "Standard"}`}
      >
        <FlightSeatIcon label={seatLetter} />
      </button>
    );
  };

  const renderFlightWidget = () => {
    if (!cabinData || !cabinData.rows) {
      return <div className="text-center p-8 text-slate-400">Loading flight layout...</div>;
    }

    const exitRows = new Set([12, 15]); // Emergency exits standard rows

    return (
      <div className="flight-fuselage-container">
        {/* Curved Airplane Nose Cone */}
        <div className="flight-nose-cone">
          <div className="flight-cockpit-window">Cockpit</div>
        </div>

        <div className="seats-grid-layout mt-4">
          {cabinData.rows.map((rowNumber) => {
            const aisleIndex = Math.ceil(cabinData.seatLetters.length / 2);
            
            // Draw horizontal exit row break
            const isExitRow = exitRows.has(rowNumber);

            return (
              <React.Fragment key={`row-wrapper-${rowNumber}`}>
                {isExitRow && (
                  <div className="exit-row-divider">
                    ◄ EXIT ROW ── EMERGENCY EXIT ◄
                  </div>
                )}
                <div className="seat-row-wrapper">
                  {/* Row Number left */}
                  <div className="seat-row-number">{rowNumber}</div>

                  {/* Seat columns */}
                  {cabinData.seatLetters.map((letter, idx) => {
                    const seat = seatsByLabel.get(`${rowNumber}${letter}`);

                    return (
                      <React.Fragment key={`${rowNumber}-${letter}`}>
                        {idx === aisleIndex && (
                          <div className="aisle-spacer-col" />
                        )}
                        {renderFlightSeatButton(seat, letter)}
                      </React.Fragment>
                    );
                  })}

                  {/* Row Number right */}
                  <div className="seat-row-number">{rowNumber}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDER MAIN COMPONENT ---

  return (
    <div className="seat-selection-component">
      {/* Legend Block */}
      {vehicleType !== "bus" && (
        <div className="seat-selection-legends-container">
          <div className="seat-selection-legend main-legend-pill">
            <div className="legend-item">
              <div className="legend-color available" />
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-color selected" />
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="legend-color booked" />
              <span>Booked</span>
            </div>
            {vehicleType === "flight" && (
              <div className="legend-item">
                <div className="legend-color extra-legroom" />
                <span>Extra Legroom (+₹720)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Seat Layout Widget */}
      {vehicleType === "bus" ? renderBusWidget() : renderFlightWidget()}
    </div>
  );
}
