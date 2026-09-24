/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  listHotelSearchHistory,
  normalizeHotelSearchHistoryItem,
  formatStayInfo,
} from "../../../services/adminHotelService";
import { toDdMmYyyy } from "../../../utils/apiDateFormat";
import AdminPagination from "../../../components/AdminPagination";
import "../../B2C BUS MANAGEMENT/Search History/BusSearchHistory.css";

const DEFAULT_FILTERS = {
  query: "",
  customerName: "",
  checkInDate: "",
  checkOutDate: "",
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export default function HotelSearchHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletedRecordIds, setDeletedRecordIds] = useState([]);

  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get("highlightId");

  useEffect(() => {
    if (highlightId && logs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.backgroundColor = "#fef08a";
          el.style.transition = "background-color 1s ease";
          setTimeout(() => {
            el.style.backgroundColor = "transparent";
          }, 3000);
        }
      }, 350);
    }
  }, [location.search, highlightId, logs]);

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
      const responseData = await listHotelSearchHistory({
        searchTerm: activeSearch,
      });

      const dataList = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData?.items)
        ? responseData.items
        : Array.isArray(responseData?.$values)
        ? responseData.$values
        : Array.isArray(responseData?.records)
        ? responseData.records
        : Array.isArray(responseData?.results)
        ? responseData.results
        : [];

      const normalizedList = dataList
        .map((item) => normalizeHotelSearchHistoryItem(item))
        .filter(Boolean);

      setLogs(normalizedList);
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
    setDeletedRecordIds([]);
    setIsFiltersOpen(false);
  };

  const handleDeleteAll = () => {
    if (!filteredLogs.length) return;
    if (!window.confirm("Delete all visible search history records?")) return;
    setDeletedRecordIds((prev) => [...prev, ...filteredLogs.map((r) => r.searchId)]);
  };

  // Client-side local filtering as backup/refinement
  const filteredLogs = useMemo(() => {
    const deletedSet = new Set(deletedRecordIds);
    return logs.filter((log) => {
      if (deletedSet.has(log.searchId)) return false;
      const query = filters.query.toLowerCase().trim();
      const customer = filters.customerName.toLowerCase().trim();

      const matchesQuery =
        !query ||
        String(log.cityName || "").toLowerCase().includes(query) ||
        String(log.searchQuery || "").toLowerCase().includes(query) ||
        String(log.cityId || "").toLowerCase().includes(query) ||
        String(log.searchId || "").toLowerCase().includes(query);

      const matchesCustomer =
        !customer || String(log.userId || "").toLowerCase().includes(customer);

      const matchesCheckIn =
        !filters.checkInDate || String(log.checkInDate || "").startsWith(filters.checkInDate);

      const matchesCheckOut =
        !filters.checkOutDate || String(log.checkOutDate || "").startsWith(filters.checkOutDate);

      return matchesQuery && matchesCustomer && matchesCheckIn && matchesCheckOut;
    });
  }, [logs, filters, deletedRecordIds]);

  // Pagination calculation
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const formatSearchDate = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const timeStr = date.toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      return `${day}-${month}-${year}, ${timeStr}`;
    } catch {
      return value;
    }
  };

  const handleExport = () => {
    const headers = [
      "Search ID",
      "City Name",
      "Provider City ID",
      "Search Query",
      "Check-In Date",
      "Check-Out Date",
      "Stay Info",
      "Adults",
      "Rooms",
      "User / Guest ID",
      "Searched At (UTC)"
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredLogs.map((log) => {
      const stay = formatStayInfo(log);
      return [
        log.searchId,
        log.cityName,
        log.cityId || "",
        log.searchQuery,
        log.checkInDate,
        log.checkOutDate,
        stay.dates,
        log.adults,
        log.rooms,
        log.userId || "Guest",
        log.searchedAtUtc
      ];
    });

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
    <section className="admin-b2c-page admin-b2c-hotel-page admin-search-history-page" style={{ padding: "16px 24px", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .admin-actions-row button {
          transition: all 0.2s ease !important;
        }
        .admin-actions-row button:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }

        .admin-search-history-page .admin-search-history-toolbar .admin-actions-row button.search-history-filter-btn {
          background-color: #A51C49 !important;
          background: #A51C49 !important;
          border: 1.5px solid #A51C49 !important;
          color: #ffffff !important;
          padding: 6px 16px !important;
          border-radius: 20px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          font-size: 13px !important;
        }
        .admin-search-history-page .admin-search-history-toolbar .admin-actions-row button.search-history-filter-btn:hover {
          background-color: #851237 !important;
          background: #851237 !important;
          border-color: #851237 !important;
          color: #ffffff !important;
        }
        
        .admin-search-history-page .admin-search-history-toolbar .admin-actions-row button.search-history-export-btn {
          background-color: #10b981 !important;
          background: #10b981 !important;
          border: 1.5px solid #10b981 !important;
          color: #ffffff !important;
          padding: 6px 16px !important;
          border-radius: 20px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          font-size: 13px !important;
        }
        .admin-search-history-page .admin-search-history-toolbar .admin-actions-row button.search-history-export-btn:hover {
          background-color: #059669 !important;
          background: #059669 !important;
          border-color: #059669 !important;
          color: #ffffff !important;
        }
        
        /* Small page design overrides */
        .admin-search-history-chip {
          padding: 4px 10px !important;
          font-size: 11px !important;
          border-radius: 6px !important;
        }
        .admin-search-history-table-head,
        .admin-search-history-row {
          display: grid !important;
          grid-template-columns: 0.35fr 0.85fr 1.2fr 1.4fr 0.9fr 0.65fr !important;
          gap: 8px !important;
        }

        .admin-search-history-table-head {
          padding: 6px 14px !important;
          min-height: 28px !important;
          background: #A51C49 !important;
          border-radius: 12px 12px 0 0 !important;
          align-items: center !important;
        }
        .admin-search-history-table-head span {
          color: #ffffff !important;
          font-size: 0.73rem !important;
          font-weight: 600 !important;
          text-transform: none !important;
          letter-spacing: 0.02em !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
        }
        .admin-search-history-row {
          padding: 12px 16px !important;
          font-size: 12px !important;
          font-family: 'Inter', sans-serif !important;
          color: #334155 !important;
          transition: background-color 0.2s ease !important;
          cursor: pointer !important;
        }
        .admin-search-history-row:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }
        .admin-search-history-cell {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          padding: 8px !important;
          box-sizing: border-box !important;
        }
        .admin-search-history-cell strong {
          font-weight: 700 !important;
          font-size: 0.81rem !important;
        }
        .admin-search-history-empty {
          padding: 24px !important;
          font-size: 13px !important;
          color: #64748b !important;
          text-align: center !important;
        }
        .admin-search-history-view-btn {
          background: #fff0f3 !important;
          color: #A51C49 !important;
          border: 1.5px solid #A51C49 !important;
          border-radius: 8px !important;
          padding: 5px 14px !important;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease-in-out !important;
        }
        .admin-search-history-view-btn:hover {
          background: #A51C49 !important;
          color: #ffffff !important;
          box-shadow: 0 3px 10px rgba(165, 28, 73, 0.25) !important;
        }
        .city-id-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 500;
          background-color: #f1f5f9;
          color: #475569;
          font-family: monospace;
          margin-top: 3px;
        }
      `}</style>
      <header className="admin-b2c-header admin-search-history-header" style={{ margin: 0, paddingTop: '16px', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>
          <span style={{ color: '#A51C49' }}>B2C Hotel </span>
          <span style={{ color: 'black' }}>Search List</span>
        </h1>
      </header>

      {/* Toolbar row */}
      <div className="admin-toolbar-row admin-search-history-toolbar">
        <div className="admin-chip-row">
          <span className="admin-search-history-chip">
            Total Records - {filteredLogs.length}
          </span>
        </div>

        <div className="admin-actions-row">
          <button
            type="button"
            className="search-history-filter-btn"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            {isFiltersOpen ? "Close Filter" : "Filter"}
          </button>
          <button
            type="button"
            className="search-history-export-btn"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            type="button"
            className="admin-search-history-delete"
            onClick={handleDeleteAll}
          >
            Delete All Records
          </button>
        </div>
      </div>

      {/* Filters Form */}
      {isFiltersOpen && (
        <section className="admin-search-filters">
          <label>
            <span>Search Query</span>
            <input
              type="text"
              value={draftFilters.query}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="City name, City ID, or log ID"
            />
          </label>
          <label>
            <span>Customer / User</span>
            <input
              type="text"
              value={draftFilters.customerName}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="User ID or Guest"
            />
          </label>
          <label>
            <span>Check-In Date</span>
            <input
              type="date"
              value={draftFilters.checkInDate || ""}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, checkInDate: e.target.value }))}
            />
          </label>
          <label>
            <span>Check-Out Date</span>
            <input
              type="date"
              value={draftFilters.checkOutDate || ""}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, checkOutDate: e.target.value }))}
            />
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
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
          <span>City Name & City ID</span>
          <span>Stay Dates & Guests</span>
          <span>Customer / User</span>
          <span>Action</span>
        </header>

        {loading ? (
          <div className="admin-search-history-empty">Loading search history...</div>
        ) : error ? (
          <div className="admin-search-history-empty" style={{ color: "red", fontWeight: "600" }}>Error: {error}</div>
        ) : paginatedLogs.length ? (
          <div className="admin-search-history-table-body">
            {paginatedLogs.map((row, idx) => (
              <HotelSearchHistoryRow
                key={row.searchId || idx}
                item={row}
                index={(currentPage - 1) * itemsPerPage + idx}
                onView={setSelectedRecord}
              />
            ))}
          </div>
        ) : (
          <div className="admin-search-history-empty">Result Not Found.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="search history records"
        />
      </section>

      {/* Details View Modal */}
      {selectedRecord ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "16px",
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <article
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "min(600px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.28rem", color: "#0f172a", fontWeight: 700 }}>
                  Hotel Search Log Details
                </h3>
                <small style={{ color: "#64748b", fontSize: "0.83rem" }}>
                  Record ID: #{selectedRecord.searchId || "--"}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#334155",
                  fontSize: "0.83rem",
                  transition: "all 0.15s ease",
                }}
              >
                Close
              </button>
            </header>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Log ID</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.92rem" }}>#{selectedRecord.searchId || "--"}</p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>User / Guest ID</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", wordBreak: "break-all" }}>
                  {selectedRecord.userId || "N/A (Guest)"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>City Name</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500, color: "#A51C49", fontSize: "0.95rem" }}>
                  {selectedRecord.cityName || selectedRecord.searchQuery || "--"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Provider City ID</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.92rem", fontFamily: "monospace" }}>
                  {selectedRecord.cityId ? `ID: ${selectedRecord.cityId}` : "--"}
                </p>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Search Query</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.92rem" }}>{selectedRecord.searchQuery || "--"}</p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-In Date</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{toDdMmYyyy(selectedRecord.checkInDate) || "--"}</p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-Out Date</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{toDdMmYyyy(selectedRecord.checkOutDate) || "--"}</p>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stay Summary</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>
                  {formatStayInfo(selectedRecord).dates} | {formatStayInfo(selectedRecord).guests}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Search Type</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>Hotel</p>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Search Date & Time (IST)</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#A51C49", fontSize: "0.95rem" }}>{formatSearchDate(selectedRecord.searchedAtUtc)}</p>
              </div>
            </section>

            <details style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "4px" }}>
              <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                View Raw API Response JSON
              </summary>
              <pre
                style={{
                  margin: "10px 0 0",
                  padding: "12px",
                  background: "#0f172a",
                  color: "#38bdf8",
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(selectedRecord.raw || selectedRecord, null, 2)}
              </pre>
            </details>
          </article>
        </div>
      ) : null}
    </section>
  );
}

export const HotelSearchHistoryRow = ({ item, index, onView }) => {
  const displayCity = item?.cityName || item?.searchQuery || "N/A";

  const formatDate = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const timeStr = date.toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      return `${day}-${month}-${year}, ${timeStr}`;
    } catch {
      return value;
    }
  };

  const rawUserId = String(item?.userId ?? "").trim();
  const isGuest =
    !rawUserId ||
    rawUserId === "0" ||
    rawUserId.toLowerCase() === "no login" ||
    rawUserId.toLowerCase().includes("guest") ||
    rawUserId.includes(":") ||
    rawUserId.includes(".");

  const userLabel = isGuest
    ? rawUserId && rawUserId.toLowerCase().startsWith("guest_")
      ? rawUserId
      : rawUserId
      ? `Guest (${rawUserId})`
      : "Guest"
    : `User #${rawUserId}`;

  const stay = formatStayInfo(item);

  return (
    <article
      id={`row-${item?.searchId || item?.id}`}
      className="admin-search-history-row"
      style={{ cursor: "pointer" }}
      onClick={() => onView && onView(item)}
    >
      {/* S.NO */}
      <div className="admin-search-history-cell admin-cell-centered">
        <span style={{ fontWeight: 500, color: "#1e293b" }}>{index + 1}</span>
      </div>

      {/* SEARCH DATE */}
      <div className="admin-search-history-cell">
        <span style={{ fontWeight: 500, color: "#1e293b" }}>
          {formatDate(item?.searchedAtUtc)}
        </span>
      </div>

      {/* CITY NAME & CITY ID */}
      <div className="admin-search-history-cell">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
          <span className="font-medium text-gray-900 text-sm tracking-wide" style={{ fontWeight: 500, color: "#0f172a" }}>
            {displayCity}
          </span>
          {item?.cityId && (
            <span className="city-id-badge">
              ID: {item.cityId}
            </span>
          )}
        </div>
      </div>

      {/* STAY DATES & GUESTS */}
      <div className="admin-search-history-cell">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
          <span style={{ fontWeight: 500, color: "#0f172a" }}>
            {safeValue(toDdMmYyyy(item?.checkInDate))} to {safeValue(toDdMmYyyy(item?.checkOutDate))}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>
            {stay.guests}
          </span>
        </div>
      </div>

      {/* CUSTOMER / USER */}
      <div className="admin-search-history-cell">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 500,
              backgroundColor: isGuest ? "#fef3c7" : "#e0f2fe",
              color: isGuest ? "#92400e" : "#075985",
            }}
          >
            {isGuest ? "Guest" : "User"}
          </span>
          <span style={{ fontWeight: 500, color: "#334155" }}>{userLabel}</span>
        </div>
      </div>

      {/* ACTION */}
      <div className="admin-search-history-cell admin-cell-centered">
        <button
          type="button"
          className="admin-search-history-view-btn"
          onClick={(e) => {
            e.stopPropagation();
            onView && onView(item);
          }}
        >
          View
        </button>
      </div>
    </article>
  );
};


