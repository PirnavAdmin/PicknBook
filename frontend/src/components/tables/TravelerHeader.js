/* eslint-disable */
import React from "react";
import "../../STYLES/traveller.css";

const TravelerHeader = ({ onAdd, onFilter }) => {
  return (
    <div className="flex-between">
      <div className="section-heading-block">
        <span className="section-kicker">TRAVELER DIRECTORY</span>
        <h2 className="title-text">Traveler List</h2>
        <p className="section-subtitle">
          Manage passenger profiles, contact details, and reusable traveler records.
        </p>
      </div>
      <div className="header-actions">
        <button onClick={onFilter} className="btn btn-filter" type="button">
          Filter
        </button>
        <button onClick={onAdd} className="btn btn-add-traveler" type="button">
          + Add Traveler
        </button>
      </div>
    </div>
  );
};

export default TravelerHeader;
