/* eslint-disable */
import React from "react";
import "../../STYLES/traveller.css";

const TravelerFilter = ({ filters, setFilters, onSearch, onClear }) => {
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="filter-box">
      <div className="search-badge">Search By Details</div>
      <div className="grid-3">
        <input name="name" placeholder="Enter Name" value={filters.name} onChange={handleChange} className="input-field" />
        <input name="email" placeholder="Enter Email" value={filters.email} onChange={handleChange} className="input-field" />
        <input name="phone" placeholder="Enter Phone" value={filters.phone} onChange={handleChange} className="input-field" />
      </div>
      <div className="filter-actions">
        <button onClick={onSearch} className="btn btn-blue" type="button">
          Search
        </button>
        <button onClick={onClear} className="btn btn-gray" type="button">
          Clear
        </button>
      </div>
    </div>
  );
};

export default TravelerFilter;
