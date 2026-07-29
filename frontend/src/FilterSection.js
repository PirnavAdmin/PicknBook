/* eslint-disable */
import React from 'react';
import "./STYLES/Filters.css";
 
const FilterSection = ({ isOpen, children, onSearch, onClear }) => {
  if (!isOpen) return null;
 
  const s = {
    container: {
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      animation: 'fadeIn 0.3s ease-in-out'
    },
    headerUnderline: {
      borderBottom: '1px solid #f3f4f6',
      marginBottom: '20px',
      paddingBottom: '10px'
    },
    headerText: {
      fontSize: '14.4px',
      fontWeight: '600',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      alignItems: 'flex-end'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    searchButton: {
      background: '#1d63bf',
      color: '#ffffff',
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '12.6px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s',
      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
    }
  };
 
  return (
    <div style={s.container}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .search-button-hover:hover { background: #1858ab !important; }
        `}
      </style>
     
      <div style={s.headerUnderline}>
        <h2 style={s.headerText}>
          <span>Search</span> Search By Details
        </h2>
      </div>
 
      <div style={s.grid}>
        {children}
        <div style={s.buttonGroup}>
          <button
            style={s.searchButton}
            className="search-button-hover"
            onClick={onSearch}
          >
            <span style={{ marginRight: '8px' }}>Go</span> Search
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default FilterSection;
 


