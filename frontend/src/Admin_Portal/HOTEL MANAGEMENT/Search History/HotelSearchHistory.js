/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { listHotelSearchHistory } from "../../../services/adminHotelService";
import { formatDateTime } from "../../../utils/apiDateFormat";
import AdminPagination from "../../../components/AdminPagination";
import "../../B2C BUS MANAGEMENT/Search History/BusSearchHistory.css";

const DEFAULT_FILTERS = {
  query: "",
  customerName: "",
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export default function HotelSearchHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const activeSearch = filters.query.trim() || filters.customerName.trim() || undefined;
      const data = await listHotelSearchHistory({
        searchTerm: activeSearch,
      });
      setLogs(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || "Failed to load hotel search logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
  };

  // Client-side local filtering as backup/refinement
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // If we want additional client-side filtering
      const query = filters.query.toLowerCase().trim();
      const customer = filters.customerName.toLowerCase().trim();
      
      const matchesQuery = !query || 
        String(log.searchQuery || "").toLowerCase().includes(query) ||
        String(log.searchId || "").toLowerCase().includes(query);
        
      const matchesCustomer = !customer || 
        String(log.userId || "").toLowerCase().includes(customer);

      return matchesQuery && matchesCustomer;
    });
  }, [logs, filters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const formatSearchDate = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString("en-IN");
    } catch {
      return value;
    }
  };

  const handleExport = () => {
    const headers = [
      "Log ID",
      "Destination Query",
      "Check-In Date",
      "Check-Out Date",
      "Rooms",
      "Adults",
      "User / Guest ID",
      "Searched At"
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredLogs.map((log) => [
      log.searchId,
      log.searchQuery,
      log.checkInDate,
      log.checkOutDate,
      log.rooms,
      log.adults,
      log.userId,
      log.searchedAtUtc
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-search-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <section className="admin-b2c-page admin-b2c-hotel-page admin-search-history-page" style={{ padding: "28px 32px", fontFamily: "'Inter', sans-serif" }}>
      <header className="admin-b2c-header admin-search-history-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontWeight: 500, margin: 0, fontSize: "1.6rem" }}>
          <span style={{ color: "#A51C49", fontWeight: 500 }}>B2C Hotel </span>
          <span style={{ color: "#000000", fontWeight: 500 }}>Search List</span>
        </h2>
      </header>

      {/* Toolbar row */}
      <div className="admin-toolbar-row admin-search-history-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="admin-chip-row">
          <span className="admin-search-history-chip" style={{ color: "#A51C49", borderColor: "#A51C49", backgroundColor: "rgba(194, 24, 91, 0.05)" }}>
            Total Records {filteredLogs.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Close Filter" : "Filter"}
          </button>
          <button type="button" className="admin-cancel-clear-btn" onClick={clearFilters}>
            Clear Filter
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "red", padding: "10px", marginBottom: "15px", border: "1px solid red", borderRadius: "8px", background: "#fef2f2" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Filters Form */}
      {isFiltersOpen && (
        <section className="flight-ops-filters admin-ops-filters admin-search-filters" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Search Query</span>
            <input
              type="text"
              value={draftFilters.query}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="City, destination or log ID"
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Customer / User</span>
            <input
              type="text"
              value={draftFilters.customerName}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer or user ID"
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>

          <div className="filters-actions" style={{ gridColumn: "span 2", display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="primary"
              onClick={applyFilters}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "none", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
            >
              Apply Filter
            </button>
            <button
              type="button"
              className="secondary"
              onClick={clearFilters}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer" }}
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {/* Grid Table Card-Rows */}
      <section className="admin-search-history-table-shell">
        <header className="admin-search-history-table-head">
          <span>S.No</span>
          <span>Search Date</span>
          <span>Stay Dates</span>
          <span>Segment</span>
          <span>Customer / User</span>
        </header>

        {loading ? (
          <div className="admin-search-history-empty">Loading search history...</div>
        ) : paginatedLogs.length ? (
          <div className="admin-search-history-table-body">
            {paginatedLogs.map((row, idx) => (
              <article key={row.searchId} className="admin-search-history-row">
                <div className="admin-search-history-cell admin-cell-centered">
                  <strong>{startIndex + idx + 1}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{formatSearchDate(row.searchedAtUtc)}</strong>
                </div>
                <div className="admin-search-history-cell">
                  <strong>
                    {safeValue(row.checkInDate)} to {safeValue(row.checkOutDate)}
                  </strong>
                </div>
                <div className="admin-search-history-cell">
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <strong style={{ fontWeight: "700" }}>{safeValue(row.searchQuery)}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {row.rooms} Room{row.rooms > 1 ? "s" : ""} | {row.adults} Guest{row.adults > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="admin-search-history-cell">
                  <strong>{row.userId || "No Login"}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-search-history-empty">Result Not Found.</div>
        )}

        {filteredLogs.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="search history records"
          />
        )}
      </section>
    </section>
  );
}

