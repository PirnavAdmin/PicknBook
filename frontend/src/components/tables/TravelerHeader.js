/* eslint-disable */
import React from "react";
import { SlidersHorizontal, Plus } from "lucide-react";
import "../../STYLES/FlightOpsDashboard.css";

const TravelerHeader = ({ onAdd, onFilter, filterOpen }) => {
  return (
    <div className="customer-flight-bookings" style={{ padding: 0 }}>
      <header className="flight-ops-header" style={{ marginBottom: 12 }}>
        <div>
          <h1>Traveler List</h1>
        </div>
        <div className="flight-ops-header-actions">
          <button onClick={onFilter} className="ops-icon-btn" type="button">
            <SlidersHorizontal size={15} />
            <span>{filterOpen ? "Hide Filters" : "Filter"}</span>
          </button>
          <button onClick={onAdd} className="ops-icon-btn" type="button">
            <Plus size={15} />
            <span>Add Traveler</span>
          </button>
        </div>
      </header>
    </div>
  );
};

export default TravelerHeader;
