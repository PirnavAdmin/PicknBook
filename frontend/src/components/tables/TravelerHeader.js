/* eslint-disable */
import React from "react";
import "../../STYLES/traveller.css";

const TravelerHeader = ({ onAdd, onFilter }) => {
  return (
    <div className="flex-between">
      <div className="section-heading-block">
        <span className="section-kicker">Traveler Directory</span>
        <h2 className="title-text">Traveler List</h2>
        <p className="section-subtitle">
          Manage passenger profiles, contact details, and reusable traveler records.
        </p>
      </div>
      <div className="header-actions">
        <button onClick={onFilter} className="btn btn-gray" type="button">
          Filter
        </button>
        <button onClick={onAdd} className="btn btn-blue" type="button">
          + Add Traveler
        </button>
      </div>
    </div>
  );
};

export default TravelerHeader;
