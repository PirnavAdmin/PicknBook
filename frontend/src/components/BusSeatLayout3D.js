import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import "../STYLES/BusSeatLayout3D.css";

/**
 * Generates seat layout based on bus type and sections
 * @param {Array} sections - Backend seat sections data
 * @returns {Array} Formatted seat layout
 */
function generateSeatLayout(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return [];
  }

  return sections.map((section) => ({
    id: section.id || `section-${Math.random()}`,
    name: section.name || "Section",
    type: section.type || "seater", // 'seater' or 'sleeper'
    rows: section.rows || 0,
    columns: section.columns || 0,
    seats: section.seats || [],
  }));
}

/**
 * Get seat status class
 */
function getSeatStatusClass(seat, selectedSeats) {
  if (!seat) return "seat-invalid";
  
  const isSelected = selectedSeats.some(
    (s) => s.seatId === seat.seatId && s.sectionId === seat.sectionId
  );
  if (isSelected) return "seat-selected";
  
  if (seat.status === "booked") return "seat-booked";
  if (seat.status === "blocked") return "seat-blocked";
  if (seat.gender === "female") return "seat-female";
  
  return "seat-available";
}

/**
 * Get seat position label (Top/Bottom for sleeper)
 */
function getSeatPositionLabel(seat, type) {
  if (type !== "sleeper") return "";
  return seat.position === "top" ? "T" : "B";
}

/**
 * Main 3D Seat Layout Component
 */
export default function BusSeatLayout3D({
  sections = [],
  selectedSeats = [],
  onSeatSelect = () => {},
  maxSeats = 6,
}) {
  const layoutSections = useMemo(() => generateSeatLayout(sections), [sections]);

  const handleSeatClick = (seat, sectionId) => {
    if (!seat || seat.status === "booked" || seat.status === "blocked") {
      return;
    }

    const seatData = {
      seatId: seat.seatId,
      sectionId,
      label: seat.label,
      price: seat.price || 0,
      position: seat.position,
    };

    const isSelected = selectedSeats.some(
      (s) => s.seatId === seat.seatId && s.sectionId === sectionId
    );

    if (isSelected) {
      // Deselect
      onSeatSelect(selectedSeats.filter(
        (s) => !(s.seatId === seat.seatId && s.sectionId === sectionId)
      ));
    } else {
      // Select (respecting max seats)
      if (selectedSeats.length < maxSeats) {
        onSeatSelect([...selectedSeats, seatData]);
      }
    }
  };

  return (
    <div className="bus-seat-layout-3d">
      <div className="seat-layout-header">
        <h2>Select Your Seats</h2>
        <p className="seat-count-info">
          {selectedSeats.length} of {maxSeats} seats selected
        </p>
      </div>

      <div className="seat-layout-sections">
        {layoutSections.map((section) => (
          <SeatLayoutSection
            key={section.id}
            section={section}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
          />
        ))}
      </div>

      <SeatLegend />
    </div>
  );
}

/**
 * Individual Section Component
 */
function SeatLayoutSection({ section, selectedSeats, onSeatClick }) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="seat-section">
      <button
        type="button"
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="section-title">
          <span className={`section-badge ${section.type}`}>
            {section.type === "sleeper" ? "Sleeper" : "Seater"}
          </span>
          <span className="section-name">{section.name}</span>
        </div>
        <ChevronDown
          size={18}
          className={`section-chevron ${isExpanded ? "expanded" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="section-content">
          {section.type === "sleeper" ? (
            <SleeperLayout
              section={section}
              selectedSeats={selectedSeats}
              onSeatClick={onSeatClick}
            />
          ) : (
            <SeaterLayout
              section={section}
              selectedSeats={selectedSeats}
              onSeatClick={onSeatClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Seater Layout (normal seats in rows)
 */
function SeaterLayout({ section, selectedSeats, onSeatClick }) {
  if (!section.seats || section.seats.length === 0) {
    return <div className="no-seats">No seats available</div>;
  }

  // Group seats by row
  const seatsByRow = {};
  section.seats.forEach((seat) => {
    const row = seat.row || 1;
    if (!seatsByRow[row]) seatsByRow[row] = [];
    seatsByRow[row].push(seat);
  });

  const sortedRows = Object.keys(seatsByRow).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="seater-layout">
      <div className="seats-grid seater-grid">
        {sortedRows.map((rowNum) => (
          <div key={`row-${rowNum}`} className="seat-row">
            <span className="row-label">{rowNum}</span>
            <div className="row-seats">
              {seatsByRow[rowNum].map((seat) => (
                <SeatButton
                  key={seat.seatId}
                  seat={seat}
                  sectionId={section.id}
                  selectedSeats={selectedSeats}
                  onSeatClick={onSeatClick}
                  type="seater"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Sleeper Layout (top/bottom bunk style)
 */
function SleeperLayout({ section, selectedSeats, onSeatClick }) {
  if (!section.seats || section.seats.length === 0) {
    return <div className="no-seats">No seats available</div>;
  }

  // Group seats by position (top/bottom pairs)
  const seatsByPosition = {};
  section.seats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    if (!seatsByPosition[key]) seatsByPosition[key] = [];
    seatsByPosition[key].push(seat);
  });

  const sortedPositions = Object.keys(seatsByPosition).sort();

  return (
    <div className="sleeper-layout">
      <div className="sleeper-grid">
        {sortedPositions.map((key) => {
          const [rowNum] = key.split("-");
          const pair = seatsByPosition[key].sort(
            (a, b) =>
              (a.position === "top" ? 0 : 1) - (b.position === "top" ? 0 : 1)
          );

          return (
            <div key={key} className="sleeper-bunk">
              <span className="bunk-label">{rowNum}</span>
              <div className="bunk-seats">
                {pair.map((seat) => (
                  <SeatButton
                    key={seat.seatId}
                    seat={seat}
                    sectionId={section.id}
                    selectedSeats={selectedSeats}
                    onSeatClick={onSeatClick}
                    type="sleeper"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Individual Seat Button Component
 */
function SeatButton({ seat, sectionId, selectedSeats, onSeatClick, type }) {
  const statusClass = getSeatStatusClass(seat, selectedSeats);
  const positionLabel = getSeatPositionLabel(seat, type);
  const isDisabled =
    seat.status === "booked" || seat.status === "blocked";

  const handleClick = () => {
    if (!isDisabled) {
      onSeatClick(seat, sectionId);
    }
  };

  return (
    <button
      type="button"
      className={`seat-button ${statusClass}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={`Seat ${seat.label} - ₹${seat.price || 0}`}
      aria-label={`Seat ${seat.label}`}
    >
      <div className="seat-inner">
        <span className="seat-label">{seat.label}</span>
        {positionLabel && <span className="seat-position">{positionLabel}</span>}
      </div>
    </button>
  );
}

/**
 * Seat Legend
 */
function SeatLegend() {
  return (
    <div className="seat-legend">
      <div className="legend-title">Seat Status</div>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-seat seat-available" />
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-selected" />
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-booked" />
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-female" />
          <span>Female</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat seat-blocked" />
          <span>Blocked</span>
        </div>
      </div>
    </div>
  );
}
