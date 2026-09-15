/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { listHotelCancellations } from "../../../services/adminHotelService";
import "../../B2C BUS MANAGEMENT/Cancellation List/BusCancellationList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";
import AdminPagination from "../../../components/AdminPagination";
import { Filter, Download } from "lucide-react";

const DEFAULT_FILTERS = {
  bookingId: "",
  bookingReference: "",
  passengerName: "",
  passengerPhone: "",
  passengerEmail: "",
  checkIn: "",
  checkOut: "",
  paymentStatus: "all",
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const formatAdminDate = (value) => {
  if (!value || value === "--" || value === "-") return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
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
        let calcProfit = c?.calculatedProfit;
        if (calcProfit === undefined || calcProfit === null) {
          const totalFare = Number(c?.totalPriceInr ?? c?.totalAmountInr ?? c?.fare ?? rawPayload?.totalPriceInr ?? 0);
          const refundAmt = Number(c?.refundAmountInr ?? c?.refundAmount ?? rawPayload?.refundAmountInr ?? 0);
          const cancelChg = Number(c?.cancellationChargesInr ?? c?.cancellationCharge ?? rawPayload?.cancellationChargesInr ?? 0);

          if (cancelChg > 0 && refundAmt === 0) {
            calcProfit = cancelChg;
          } else if (totalFare > 0) {
            calcProfit = totalFare - refundAmt;
          } else {
            calcProfit = cancelChg - refundAmt;
          }
        }
        return {
          ...c,
          calculatedProfit: calcProfit,
          paymentMethod: c?.paymentMethod || rawPayload?.paymentMethod || rawPayload?.paymentType || rawPayload?.gatewayName || "--",
          paymentDetails: c?.paymentDetails || rawPayload?.transactionId || rawPayload?.txnId || rawPayload?.paymentId || "--",
          paymentStatus: c?.paymentStatus || rawPayload?.paymentStatus || "Completed",
        };
      });
      setCancellations(mapped);
      setCurrentPage(1);
    } catch (err) {
      setError("");
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
        if (!String(c.bookingId || "").toLowerCase().includes(idQuery)) return false;
      }
      if (filters.bookingReference) {
        const refQuery = filters.bookingReference.toLowerCase();
        if (!String(c.bookingReference || "").toLowerCase().includes(refQuery)) return false;
      }
      if (filters.passengerName) {
        const passQuery = filters.passengerName.toLowerCase();
        if (!String(c.passengerName || "").toLowerCase().includes(passQuery)) return false;
      }
      if (filters.passengerPhone) {
        const phoneQuery = filters.passengerPhone.trim();
        if (!String(c.passengerPhone || "").includes(phoneQuery)) return false;
      }
      if (filters.passengerEmail) {
        const emailQuery = filters.passengerEmail.toLowerCase();
        const guestEmail = c.guestEmail || c.passengerEmail || c.email || "";
        if (!String(guestEmail).toLowerCase().includes(emailQuery)) return false;
      }
      if (filters.checkIn) {
        const fromDate = new Date(filters.checkIn);
        const bookingDate = new Date(c.checkInDate || c.bookedAtUtc || c.cancelledAtUtc);
        if (bookingDate < fromDate) return false;
      }
      if (filters.checkOut) {
        const toDate = new Date(filters.checkOut);
        const bookingDate = new Date(c.checkInDate || c.bookedAtUtc || c.cancelledAtUtc);
        if (bookingDate > toDate) return false;
      }
      if (filters.paymentStatus && filters.paymentStatus !== "all") {
        const statusQuery = filters.paymentStatus.toLowerCase();
        if (String(c.paymentStatus || "").toLowerCase() !== statusQuery) return false;
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

  const formatProfitDisplay = (profitVal) => {
    const num = Number(profitVal) || 0;
    const absFormatted = formatCurrency(Math.abs(num));
    if (num > 0) {
      return { text: `+${absFormatted}`, color: "#10b981" };
    } else if (num < 0) {
      return { text: `-${absFormatted}`, color: "#ef4444" };
    } else {
      return { text: `+${absFormatted}`, color: "#64748b" };
    }
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
      <style>{`
        .admin-actions-row button, .admin-cancel-clear-btn, .admin-cancel-filters-expanded button {
          transition: all 0.2s ease !important;
        }
        .admin-actions-row button:hover, .admin-cancel-clear-btn:hover, .admin-cancel-filters-expanded button:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
        .admin-cancel-table-body tr, .admin-cancel-table-body article {
          transition: background-color 0.2s ease !important;
        }
        .admin-cancel-table-body tr:hover, .admin-cancel-table-body article:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }
      `}</style>
      <header className="admin-b2c-header admin-cancel-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Hotel</span> Cancellation List
        </h1>
      </header>

      {/* Toolbar row */}
      <div className="admin-toolbar-row admin-cancel-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Today Cancelled: {filteredCancellations.filter(c => c.paymentStatus === "Completed").length}</span>
          <span className="admin-chip">Today Pending: {filteredCancellations.filter(c => c.paymentStatus === "Pending").length}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredCancellations.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#A51C49",
              color: "#ffffff",
              fontSize: "0.88rem",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s"
            }}
          >
            <Filter size={15} />
            <span>{isFiltersOpen ? "Close Filter" : "Filter"}</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#10b981",
              color: "#ffffff",
              fontSize: "0.88rem",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s"
            }}
          >
            <Download size={15} />
            <span>Export</span>
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
        <section className="admin-cancel-filters-expanded" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>ID</label>
              <input
                type="text"
                placeholder="Search ID..."
                value={draftFilters.bookingId}
                onChange={(e) => handleFilterChange("bookingId", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Reference</label>
              <input
                type="text"
                placeholder="Search PNR..."
                value={draftFilters.bookingReference}
                onChange={(e) => handleFilterChange("bookingReference", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Passenger Name</label>
              <input
                type="text"
                placeholder="Search name..."
                value={draftFilters.passengerName}
                onChange={(e) => handleFilterChange("passengerName", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Mobile</label>
              <input
                type="text"
                placeholder="Search phone..."
                value={draftFilters.passengerPhone || ""}
                onChange={(e) => handleFilterChange("passengerPhone", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Email</label>
              <input
                type="email"
                placeholder="Search email..."
                value={draftFilters.passengerEmail || ""}
                onChange={(e) => handleFilterChange("passengerEmail", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Check-in</label>
              <input
                type="date"
                value={draftFilters.checkIn || ""}
                onChange={(e) => handleFilterChange("checkIn", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Check-out</label>
              <input
                type="date"
                value={draftFilters.checkOut || ""}
                onChange={(e) => handleFilterChange("checkOut", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ color: "#000000", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px", display: "block" }}>Status</label>
              <select
                value={draftFilters.paymentStatus || "all"}
                onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "11.5px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", height: "32px", cursor: "pointer", color: "#374151" }}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
            <button
              type="button"
              onClick={applyFilters}
              style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease" }}
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={{ background: "#64748b", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease" }}
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {/* Grid Table Card-Rows */}
      <section className="admin-cancel-table-shell">
        <header className="admin-cancel-table-head" style={{ gridTemplateColumns: "1.1fr 1.3fr 1.8fr 1.3fr 1.4fr 1.1fr 1.1fr 0.8fr" }}>
          <span>B. ID / B.D.</span>
          <span>Name</span>
          <span>Check-in / Check-out</span>
          <span>PNR / R.F Status</span>
          <span>Cancellation Reason</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {loading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : filteredCancellations.length ? (
          <div className="admin-cancel-table-body">
            {paginatedCancellations.map((booking) => (
              <article key={booking.bookingId} className="admin-cancel-table-row" style={{ gridTemplateColumns: "1.1fr 1.3fr 1.8fr 1.3fr 1.4fr 1.1fr 1.1fr 0.8fr" }}>
                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.bookingId)}</strong>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">🗓️</span>
                    <span>{formatAdminDate(booking.cancelledAtUtc)}</span>
                  </div>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.passengerName)}</strong>
                  {booking.passengerPhone ? <small>{safeValue(booking.passengerPhone)}</small> : null}
                </div>

                <div className="admin-cancel-cell">
                  <div className="admin-route-segment">
                    <span style={{ fontWeight: "700" }}>{safeValue(booking.hotelName)}</span>
                  </div>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">🗓️</span>
                    <span>{formatAdminDate(booking.checkInDate || booking.bookedAtUtc)}</span>
                  </div>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.bookingReference || booking.pnr)}</strong>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                      marginTop: "4px",
                      display: "inline-block"
                    }}
                  >
                    {safeValue(booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Cancelled")}
                  </span>
                </div>

                <div className="admin-cancel-cell">
                  <span style={{ fontSize: "0.74rem", fontWeight: "600", color: "#334155" }}>
                    {safeValue(booking.cancellationReason, "N/A")}
                  </span>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <strong>{formatCurrency(booking.totalPriceInr || booking.totalAmountInr || booking.fare || 0)}</strong>
                  <small>Refund: {formatCurrency(booking.refundAmountInr)}</small>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <strong style={{ color: formatProfitDisplay(booking.calculatedProfit).color }}>
                    {formatProfitDisplay(booking.calculatedProfit).text}
                  </strong>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button
                    onClick={() => setSelectedCancellation(booking)}
                    style={{
                      backgroundColor: "#eff6ff",
                      border: "1.5px solid #dbeafe",
                      color: "#2563eb",
                      padding: "5px 14px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      outline: "none"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#2563eb";
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "#2563eb";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                      e.currentTarget.style.color = "#2563eb";
                      e.currentTarget.style.borderColor = "#dbeafe";
                    }}
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-cancel-empty">No cancellation records found.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredCancellations.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="cancellations"
        />
      </section>

      {/* View Detail Backdrop Modal */}
      {selectedCancellation && (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Hotel Cancellation Details"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(900px, 95vw)", padding: "20px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Hotel Cancellation Detail View</h2>
                <p className="admin-view-header-subtitle">
                  Booking ID: <strong>{safeValue(selectedCancellation.bookingId)}</strong> | Ref: <strong>{safeValue(selectedCancellation.bookingReference)}</strong> | Guest: <strong>{safeValue(selectedCancellation.passengerName)}</strong>
                </p>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip">
                    Status: {safeValue(selectedCancellation.status || "Cancelled")}
                  </span>
                  <span className="admin-view-meta-chip">
                    Refund Amount: {formatCurrency(selectedCancellation.refundAmountInr)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Calculated Profit: {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                  </span>
                </div>
              </div>
              <button type="button" className="admin-view-close-btn" onClick={() => setSelectedCancellation(null)}>
                ✕
              </button>
            </header>

            {/* Section 1: Hotel & Guest Details Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Hotel &amp; Guest Details</h3>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Booking ID</th>
                    <td>{safeValue(selectedCancellation.bookingId)}</td>
                    <th>Booking Reference</th>
                    <td>{safeValue(selectedCancellation.bookingReference)}</td>
                  </tr>
                  <tr>
                    <th>Hotel Property</th>
                    <td>{safeValue(selectedCancellation.hotelName)}</td>
                    <th>Primary Guest</th>
                    <td>{safeValue(selectedCancellation.passengerName)}</td>
                  </tr>
                  <tr>
                    <th>Guest Phone</th>
                    <td>{safeValue(selectedCancellation.passengerPhone)}</td>
                    <th>Cancellation Reason</th>
                    <td>{selectedCancellation.cancellationReason || "No reason given"}</td>
                  </tr>
                  <tr>
                    <th>Booked Date</th>
                    <td>{formatDateTime(selectedCancellation.bookedAtUtc)}</td>
                    <th>Cancelled Date</th>
                    <td>{formatDateTime(selectedCancellation.cancelledAtUtc)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Financial & Payment Details Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Financial &amp; Payment Details</h3>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Amount / Status</th>
                    <th>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Price</strong></td>
                    <td><strong>{formatCurrency(selectedCancellation.totalPriceInr || selectedCancellation.totalAmountInr || selectedCancellation.fare || 0)}</strong></td>
                    <td>Total booking price</td>
                  </tr>
                  <tr>
                    <td><strong>Refund Amount</strong></td>
                    <td><strong style={{ color: "#10b981" }}>{formatCurrency(selectedCancellation.refundAmountInr)}</strong></td>
                    <td>Refund amount credited</td>
                  </tr>
                  <tr>
                    <td><strong>Cancellation Charge</strong></td>
                    <td><strong style={{ color: "#d97706" }}>{formatCurrency(selectedCancellation.cancellationChargesInr)}</strong></td>
                    <td>Cancellation charges applied</td>
                  </tr>
                  <tr>
                    <td><strong>Payment Method</strong></td>
                    <td>{safeValue(selectedCancellation.paymentMethod)}</td>
                    <td>Payment gateway method</td>
                  </tr>
                  <tr className="admin-view-highlight-row">
                    <td><strong>Calculated Net Profit / Loss</strong></td>
                    <td>
                      <strong style={{ color: formatProfitDisplay(selectedCancellation.calculatedProfit).color }}>
                        {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                      </strong>
                    </td>
                    <td>Net profit margin calculated on hotel cancellation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

