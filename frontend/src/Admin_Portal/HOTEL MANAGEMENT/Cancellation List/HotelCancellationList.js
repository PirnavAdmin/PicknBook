import React, { useEffect, useState, useMemo } from "react";
import { listHotelCancellations } from "../../../services/adminHotelService";
import "../../B2C BUS MANAGEMENT/Cancellation List/BusCancellationList.css";
import AdminPagination from "../../../components/AdminPagination";

const DEFAULT_FILTERS = {
  bookingId: "",
  bookingReference: "",
  passengerName: "",
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export default function HotelCancellationList() {
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);

  // Selected cancellation for detail modal
  const [selectedCancellation, setSelectedCancellation] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchCancellations = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listHotelCancellations();
      const mapped = (Array.isArray(data) ? data : []).map((c) => {
        const rawPayload = c?.raw || c || {};
        return {
          ...c,
          paymentMethod: c?.paymentMethod || rawPayload?.paymentMethod || rawPayload?.paymentType || rawPayload?.gatewayName || "--",
          paymentDetails: c?.paymentDetails || rawPayload?.transactionId || rawPayload?.txnId || rawPayload?.paymentId || "--",
          paymentStatus: c?.paymentStatus || rawPayload?.paymentStatus || "Completed",
        };
      });
      setCancellations(mapped);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || "Failed to load hotel cancellations.");
      setCancellations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, []);

  const handleUpdatePaymentStatus = (bookingId, newStatus) => {
    setCancellations((prev) =>
      prev.map((c) => (c.bookingId === bookingId ? { ...c, paymentStatus: newStatus } : c))
    );
    if (selectedCancellation && selectedCancellation.bookingId === bookingId) {
      setSelectedCancellation((prev) => ({ ...prev, paymentStatus: newStatus }));
    }
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  // Client-side search filtering
  const filteredCancellations = useMemo(() => {
    return cancellations.filter((c) => {
      if (filters.bookingId) {
        const idQuery = filters.bookingId.toLowerCase();
        if (!String(c.bookingId || "").toLowerCase().includes(idQuery)) {
          return false;
        }
      }
      if (filters.bookingReference) {
        const refQuery = filters.bookingReference.toLowerCase();
        if (!String(c.bookingReference || "").toLowerCase().includes(refQuery)) {
          return false;
        }
      }
      if (filters.passengerName) {
        const passQuery = filters.passengerName.toLowerCase();
        if (!String(c.passengerName || "").toLowerCase().includes(passQuery)) {
          return false;
        }
      }
      return true;
    });
  }, [cancellations, filters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCancellations.length / itemsPerPage) || 1;
  const paginatedCancellations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCancellations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCancellations, currentPage, itemsPerPage]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const formatAdminDate = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleDateString("en-IN");
    } catch {
      return value;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString();
    } catch {
      return value;
    }
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Booking Reference",
      "Hotel Name",
      "Passenger Name",
      "Passenger Phone",
      "Total Price",
      "Cancellation Charges",
      "Refund Amount",
      "Payment Method",
      "Payment Details",
      "Payment Status",
      "Cancellation Reason",
      "Booked At",
      "Cancelled At",
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredCancellations.map((c) => [
      c.bookingId,
      c.bookingReference,
      c.hotelName,
      c.passengerName,
      c.passengerPhone,
      c.totalPriceInr,
      c.cancellationChargesInr,
      c.refundAmountInr,
      c.paymentMethod,
      c.paymentDetails,
      c.paymentStatus,
      c.cancellationReason,
      c.bookedAtUtc,
      c.cancelledAtUtc,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-cancellations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-b2c-page admin-b2c-hotel-page admin-cancel-page" style={{ padding: "28px 32px", fontFamily: "'Inter', sans-serif" }}>
      <header className="admin-b2c-header admin-cancel-header" style={{ marginBottom: "5px" }}>
        <h2 style={{ fontWeight: 500, margin: 0, fontSize: "1.6rem" }}>
          <span style={{ color: "#A51C49", fontWeight: 500 }}>B2C Hotel </span>
          <span style={{ color: "#000000", fontWeight: 500 }}>Cancellation List</span>
        </h2>
      </header>

      {/* Toolbar row */}
      <div className="admin-toolbar-row admin-cancel-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip admin-cancel-chip" style={{ color: "#A51C49", borderColor: "#A51C49", backgroundColor: "rgba(194, 24, 91, 0.05)", fontWeight: "600", padding: "6px 14px", borderRadius: "100px", fontSize: "0.85rem" }}>
            Cancelled Records: {filteredCancellations.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #A51C49",
              background: "transparent",
              color: "#A51C49",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {isFiltersOpen ? "Hide Filter" : "Filter"}
          </button>
          <button
            type="button"
            className="admin-cancel-clear-btn"
            onClick={clearFilters}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #A51C49",
              background: "transparent",
              color: "#A51C49",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Clear Filter
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #A51C49",
              background: "transparent",
              color: "#A51C49",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
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
        <section className="flight-ops-filters admin-ops-filters admin-cancel-filters" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>ID</span>
            <input
              type="text"
              placeholder="Search by booking id"
              value={draftFilters.bookingId}
              onChange={(e) => handleFilterChange("bookingId", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Reference</span>
            <input
              type="text"
              placeholder="Search by PNR / Reference"
              value={draftFilters.bookingReference}
              onChange={(e) => handleFilterChange("bookingReference", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Passenger Name</span>
            <input
              type="text"
              placeholder="Search by passenger"
              value={draftFilters.passengerName}
              onChange={(e) => handleFilterChange("passengerName", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>

          <div className="filters-actions admin-cancel-filter-actions" style={{ gridColumn: "span 3", display: "flex", gap: "10px", marginTop: "10px" }}>
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
      <section className="admin-cancel-table-shell">
        <header className="admin-cancel-table-head" style={{ gridTemplateColumns: "1fr 1.2fr 1.5fr 1.2fr 1fr 1.2fr 1fr 0.8fr" }}>
          <span>ID</span>
          <span>Reference / Date</span>
          <span>Hotel Property / Check-in</span>
          <span>Passenger Name</span>
          <span>Amount</span>
          <span>Payment Info</span>
          <span>Payment Status</span>
          <span>Action</span>
        </header>

        {loading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : filteredCancellations.length ? (
          <div className="admin-cancel-table-body">
            {paginatedCancellations.map((booking) => (
              <article key={booking.bookingId} className="admin-cancel-table-row" style={{ gridTemplateColumns: "1fr 1.2fr 1.5fr 1.2fr 1fr 1.2fr 1fr 0.8fr" }}>
                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.bookingId)}</strong>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.bookingReference)}</strong>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">📅</span>
                    <span>{formatAdminDate(booking.cancelledAtUtc)}</span>
                  </div>
                </div>

                <div className="admin-cancel-cell">
                  <div className="admin-route-segment">
                    <span style={{ fontWeight: "700" }}>{safeValue(booking.hotelName)}</span>
                  </div>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">📅</span>
                    <span>{formatAdminDate(booking.bookedAtUtc)}</span>
                  </div>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.passengerName)}</strong>
                  <small>{safeValue(booking.passengerPhone)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>RA {formatCurrency(booking.refundAmountInr)}</strong>
                  <small>CC {formatCurrency(booking.cancellationChargesInr)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>Method:</strong> {safeValue(booking.paymentMethod)}
                  <small style={{ wordBreak: "break-all" }}><strong>Txn:</strong> {safeValue(booking.paymentDetails)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <select
                    value={booking.paymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(booking.bookingId, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      backgroundColor: booking.paymentStatus === "Completed" ? "#ecfdf5" : "#fffbeb",
                      color: booking.paymentStatus === "Completed" ? "#10b981" : "#d97706",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button onClick={() => setSelectedCancellation(booking)} className="admin-view-btn">View</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-cancel-empty">No records found.</div>
        )}

        {filteredCancellations.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredCancellations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="cancellations"
          />
        )}
      </section>

      {/* View Detail Backdrop Modal */}
      {selectedCancellation && (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)} style={{ zIndex: 1000 }}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Cancellation details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Cancellation Detail View</h2>
                <p className="admin-view-header-subtitle">
                  {safeValue(selectedCancellation.bookingId)} | {safeValue(selectedCancellation.passengerName)}
                </p>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip cancelled">Cancelled</span>
                  <span className="admin-view-meta-chip">
                    RA {formatCurrency(selectedCancellation.refundAmountInr)}
                  </span>
                  <span className="admin-view-meta-chip">
                    CC {formatCurrency(selectedCancellation.cancellationChargesInr)}
                  </span>
                </div>
              </div>
              <button type="button" className="admin-view-close" aria-label="Close" onClick={() => setSelectedCancellation(null)}>
                &times;
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Hotel Property</span>
                <strong>{safeValue(selectedCancellation.hotelName)}</strong>
              </div>
              <div>
                <span>Passenger Phone</span>
                <strong>{safeValue(selectedCancellation.passengerPhone)}</strong>
              </div>
              <div>
                <span>Booking Reference</span>
                <strong>{safeValue(selectedCancellation.bookingReference)}</strong>
              </div>
              <div>
                <span>Booked Date</span>
                <strong>{formatDateTime(selectedCancellation.bookedAtUtc)}</strong>
              </div>
              <div>
                <span>Cancelled Date</span>
                <strong>{formatDateTime(selectedCancellation.cancelledAtUtc)}</strong>
              </div>
              <div>
                <span>Cancellation Reason</span>
                <strong>{selectedCancellation.cancellationReason || "No reason given"}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{safeValue(selectedCancellation.paymentMethod)}</strong>
              </div>
              <div>
                <span>Payment Details (Txn)</span>
                <strong>{safeValue(selectedCancellation.paymentDetails)}</strong>
              </div>
              <div>
                <span>Payment Status</span>
                <select
                  value={selectedCancellation.paymentStatus}
                  onChange={(e) => handleUpdatePaymentStatus(selectedCancellation.bookingId, e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1.5px solid var(--border)",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="admin-view-highlight-card">
                <span>Refund Amount</span>
                <strong>{formatCurrency(selectedCancellation.refundAmountInr)}</strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Cancellation Charge</span>
                <strong>{formatCurrency(selectedCancellation.cancellationChargesInr)}</strong>
              </div>
            </section>
          </article>
        </div>
      )}
    </section>
  );
}

