/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { listHotelBookings, cancelHotelBookingByAdmin } from "../../../services/adminHotelService";
import { formatDateTime } from "../../../utils/apiDateFormat";
import AdminPagination from "../../../components/AdminPagination";
import { Filter, Download } from "lucide-react";
import "./HotelBookingList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";


export default function HotelBookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  const getAdminStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("cancel")) return "cancelled";
    if (s.includes("fail")) return "failed";
    if (s.includes("confirm")) return "confirmed";
    if (s.includes("book")) return "success";
    return "pending";
  };

  const safeValue = (val, fallback = "--") =>
    val !== undefined && val !== null && String(val).trim() !== ""
      ? String(val).trim()
      : fallback;

  const formatDateCell = (value) => {
    if (!value || value === "--" || value === "-") return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const formatted = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    return formatted;
  };

  const getStatusStyle = (status) => {
    const s = String(status || "").toLowerCase();
    const baseStyle = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: "600",
      display: "inline-block",
      textAlign: "center"
    };

    if (s.includes("confirm")) {
      // Confirmed -> Blue
      return {
        ...baseStyle,
        backgroundColor: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #dbeafe"
      };
    } else if (s.includes("book")) {
      // Booked -> Green
      return {
        ...baseStyle,
        backgroundColor: "#ecfdf5",
        color: "#10b981",
        border: "1px solid #a7f3d0"
      };
    } else if (s.includes("cancel") || s.includes("fail")) {
      // Cancelled or Failed -> Red
      return {
        ...baseStyle,
        backgroundColor: "#fef2f2",
        color: "#ef4444",
        border: "1px solid #fee2e2"
      };
    } else {
      // Pending / Other -> Yellow
      return {
        ...baseStyle,
        backgroundColor: "#fffbeb",
        color: "#d97706",
        border: "1px solid #fef3c7"
      };
    }
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Temporary filter form inputs
  const [tempCheckInFrom, setTempCheckInFrom] = useState("");
  const [tempCheckInTo, setTempCheckInTo] = useState("");
  const [tempPassengerName, setTempPassengerName] = useState("");
  const [tempMobileNumber, setTempMobileNumber] = useState("");
  const [tempMail, setTempMail] = useState("");
  const [tempStatus, setTempStatus] = useState("all");

  // Applied filters (used in client-side filtering)
  const [appliedCheckInFrom, setAppliedCheckInFrom] = useState("");
  const [appliedCheckInTo, setAppliedCheckInTo] = useState("");
  const [appliedPassengerName, setAppliedPassengerName] = useState("");
  const [appliedMobileNumber, setAppliedMobileNumber] = useState("");
  const [appliedMail, setAppliedMail] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handleExport = () => {
    if (filteredBookings.length === 0) return;
    const csvHeaders = ["Ref ID", "Hotel Property", "Guest Name", "Guest Phone", "Guest Email", "Check In", "Check Out", "Total Price", "Status"];
    const csvRows = filteredBookings.map((b) => [
      b.bookingReference,
      b.hotelName,
      b.guestName,
      b.guestPhone,
      b.guestEmail,
      b.checkInDate,
      b.checkOutDate,
      b.totalPrice,
      b.status
    ]);
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const data = await listHotelBookings();
      setBookings(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      const msg = String(err?.message || "");
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes("not found") ||
        lowerMsg.includes("404") ||
        lowerMsg.includes("failed to fetch") ||
        lowerMsg.includes("networkerror") ||
        lowerMsg.includes("network error") ||
        lowerMsg.includes("econnrefused") ||
        lowerMsg.includes("bad gateway") ||
        lowerMsg.includes("gateway") ||
        lowerMsg.includes("502") ||
        lowerMsg.includes("503") ||
        lowerMsg.includes("500") ||
        lowerMsg.includes("504") ||
        lowerMsg.includes("internal server error")
      ) {
        setBookings([]);
        setError("");
      } else {
        setError(msg || "Failed to load hotel bookings.");
        setBookings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedBooking]);

  const handleApplyFilters = () => {
    setAppliedCheckInFrom(tempCheckInFrom);
    setAppliedCheckInTo(tempCheckInTo);
    setAppliedPassengerName(tempPassengerName);
    setAppliedMobileNumber(tempMobileNumber);
    setAppliedMail(tempMail);
    setAppliedStatus(tempStatus);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setTempCheckInFrom("");
    setTempCheckInTo("");
    setTempPassengerName("");
    setTempMobileNumber("");
    setTempMail("");
    setTempStatus("all");

    setAppliedCheckInFrom("");
    setAppliedCheckInTo("");
    setAppliedPassengerName("");
    setAppliedMobileNumber("");
    setAppliedMail("");
    setAppliedStatus("all");
    setCurrentPage(1);
  };

  // Client-side search filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Search term (Search bookings)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
          String(b.bookingReference || "").toLowerCase().includes(term) ||
          String(b.hotelName || "").toLowerCase().includes(term) ||
          String(b.guestName || "").toLowerCase().includes(term) ||
          String(b.guestEmail || "").toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      }

      // 2. Check-in Date From
      if (appliedCheckInFrom) {
        const fromDate = new Date(appliedCheckInFrom);
        const bookingDate = new Date(b.checkInDate);
        if (bookingDate < fromDate) return false;
      }

      // 3. Check-in Date To
      if (appliedCheckInTo) {
        const toDate = new Date(appliedCheckInTo);
        const bookingDate = new Date(b.checkInDate);
        if (bookingDate > toDate) return false;
      }

      // 4. Guest (Passenger) Name
      if (appliedPassengerName.trim()) {
        const nameTerm = appliedPassengerName.toLowerCase();
        if (!String(b.guestName || "").toLowerCase().includes(nameTerm)) return false;
      }

      // 5. Mobile Number
      if (appliedMobileNumber.trim()) {
        const phoneTerm = appliedMobileNumber.trim();
        if (!String(b.guestPhone || "").includes(phoneTerm)) return false;
      }

      // 6. Mail
      if (appliedMail.trim()) {
        const mailTerm = appliedMail.toLowerCase();
        if (!String(b.guestEmail || "").toLowerCase().includes(mailTerm)) return false;
      }

      // 7. Status
      if (appliedStatus !== "all") {
        const statusTerm = appliedStatus.toLowerCase();
        if (String(b.status || "").toLowerCase() !== statusTerm) return false;
      }

      return true;
    });
  }, [
    bookings,
    searchTerm,
    appliedCheckInFrom,
    appliedCheckInTo,
    appliedPassengerName,
    appliedMobileNumber,
    appliedMail,
    appliedStatus
  ]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const active = filteredBookings.filter((b) => b.status !== "Cancelled").length;
    const cancelled = total - active;
    const revenue = filteredBookings
      .filter((b) => b.status !== "Cancelled")
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const profit = filteredBookings
      .filter((b) => b.status !== "Cancelled")
      .reduce((sum, b) => sum + (Number(b.profit || b.calculatedProfit || Math.round(Number(b.totalPrice || 0) * 0.06)) || 0), 0);

    return { total, active, cancelled, revenue, profit };
  }, [filteredBookings]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  const handleCancelClick = async (booking) => {
    const reason = window.prompt(
      `Enter reason to cancel booking ${booking.bookingReference}:`,
      "Client request"
    );
    if (reason === null) return; // User cancelled prompt

    const chargesInput = window.prompt(
      `Enter cancellation charges (INR) for booking ${booking.bookingReference}:`,
      "0"
    );
    if (chargesInput === null) return;
    const cancellationCharges = parseFloat(chargesInput) || 0;

    setError("");
    setActionSuccess("");
    try {
      await cancelHotelBookingByAdmin(booking.bookingId, {
        reason: reason.trim() || "Cancelled by admin",
        cancellationCharges,
      });
      setActionSuccess(`Booking ${booking.bookingReference} cancelled successfully.`);
      fetchBookings();
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("cancel")) return "hbl-badge hbl-badge-cancelled";
    if (s.includes("confirm") || s.includes("booked")) return "hbl-badge hbl-badge-success";
    return "hbl-badge hbl-badge-pending";
  };

  return (
    <div className="hbl-page admin-b2c-hotel-page admin-booking-page" style={{ paddingTop: "60px" }}>
      <style>{`
        .hbl-header-btn {
          transition: all 0.2s ease !important;
        }
        .hbl-header-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
        .hbl-table tbody tr {
          transition: background-color 0.2s ease !important;
        }
        .hbl-table tbody tr:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }
        .hbl-btn-apply, .hbl-btn-reset {
          transition: all 0.2s ease !important;
        }
        .hbl-btn-apply:hover, .hbl-btn-reset:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
      `}</style>
      <header className="admin-b2c-header" style={{ marginTop: "20px", marginBottom: "18px", paddingTop: "8px", paddingBottom: "8px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "700", marginTop: "6px", marginBottom: "10px" }}>
          <span className="admin-heading-red">B2C Hotel</span> Booking List
        </h1>
      </header>

      <div className="admin-toolbar-row" style={{ marginBottom: "14px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Today Booked: {stats.active}</span>
          <span className="admin-chip">Today Pending: {stats.cancelled}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredBookings.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setIsFiltersOpen(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '4px 14px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: '#A51C49',
              color: '#FFFFFF',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={13} />
            <span>{isFiltersOpen ? "Close Filter" : "Filter"}</span>
          </button>
          <button 
            type="button" 
            onClick={handleExport}
            disabled={filteredBookings.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '4px 14px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: '#10b981',
              color: '#FFFFFF',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>



      {/* Filters Form (Inside collapsible filters panel) */}
      {isFiltersOpen && (
        <section className="hbl-filters-expanded">
          <div className="hbl-filters-grid">
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Check-in</label>
              <input
                type="date"
                className="hbl-input-field"
                value={tempCheckInFrom}
                onChange={(e) => setTempCheckInFrom(e.target.value)}
              />
            </div>
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Check-out</label>
              <input
                type="date"
                className="hbl-input-field"
                value={tempCheckInTo}
                onChange={(e) => setTempCheckInTo(e.target.value)}
              />
            </div>
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Passenger Name</label>
              <input
                type="text"
                className="hbl-input-field"
                placeholder="Enter guest name..."
                value={tempPassengerName}
                onChange={(e) => setTempPassengerName(e.target.value)}
              />
            </div>
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Mobile Number</label>
              <input
                type="text"
                className="hbl-input-field"
                placeholder="Enter phone..."
                value={tempMobileNumber}
                onChange={(e) => setTempMobileNumber(e.target.value)}
              />
            </div>
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Email</label>
              <input
                type="email"
                className="hbl-input-field"
                placeholder="Enter email..."
                value={tempMail}
                onChange={(e) => setTempMail(e.target.value)}
              />
            </div>
            <div className="hbl-filter-field">
              <label className="hbl-field-label">Status</label>
              <select
                className="hbl-select-field"
                value={tempStatus}
                onChange={(e) => setTempStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Booked">Booked</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="hbl-filter-actions">
            <button
              type="button"
              className="hbl-btn-apply"
              onClick={handleApplyFilters}
            >
              Apply Filter
            </button>
            <button
              type="button"
              className="hbl-btn-reset"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {error && !error.toLowerCase().includes("gateway") && !error.toLowerCase().includes("502") && (
        <div className="hbl-badge hbl-badge-cancelled" style={{ width: "100%", padding: "10px 15px", marginBottom: "15px", borderRadius: "8px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {actionSuccess && (
        <div className="hbl-badge hbl-badge-success" style={{ width: "100%", padding: "10px 15px", marginBottom: "15px", borderRadius: "8px" }}>
          {actionSuccess}
        </div>
      )}

      <section className="admin-table-shell">
        <header className="admin-table-head">
          <span>
            <span className="admin-hdr-tooltip" title="Booking ID">
              B. ID
              <span className="admin-tooltip-text">Booking ID</span>
            </span>{" "}
            /{" "}
            <span className="admin-hdr-tooltip" title="Booking Date">
              B.D.
              <span className="admin-tooltip-text">Booking Date</span>
            </span>
          </span>
          <span>Name</span>
          <span>Check-in / Check-out</span>
          <span>Rooms / Guests</span>
          <span>
            <span className="admin-hdr-tooltip" title="Passenger Name Record">
              PNR
              <span className="admin-tooltip-text">Passenger Name Record</span>
            </span>{" "}
            / Status
          </span>
          <span>Hotel / Property</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {loading ? (
          <div className="admin-table-empty">Loading reservations...</div>
        ) : paginatedBookings.length === 0 ? (
          <div className="admin-table-empty">No reservations found.</div>
        ) : (
          <div className="admin-table-body">
            {paginatedBookings.map((b) => {
              const statusClass = getAdminStatusClass(b.status);
              const profitVal = Number(b.profit || b.totalPrice * 0.1) || 0;

              return (
                <article key={b.bookingId || b.id} className="admin-table-row">
                  <div className="admin-table-cell" title={`Booking Ref: ${safeValue(b.bookingReference)}`}>
                    <strong title={safeValue(b.bookingReference)}>{safeValue(b.bookingReference)}</strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatDateCell(b.createdAt)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" title={`Guest: ${safeValue(b.guestName)} (${safeValue(b.guestPhone)})`}>
                    <strong title={safeValue(b.guestName)}>{safeValue(b.guestName)}</strong>
                    <small title={safeValue(b.guestPhone)}>{safeValue(b.guestPhone)}</small>
                  </div>

                  <div className="admin-table-cell" title={`Stay Dates: ${formatDateCell(b.checkInDate)} → ${formatDateCell(b.checkOutDate)}`}>
                    <div className="admin-route-segment">
                      <span>{formatDateCell(b.checkInDate)}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{formatDateCell(b.checkOutDate)}</span>
                    </div>
                    <small>Stay Dates</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" title={`Rooms: ${b.rooms} | Guests: ${b.adults}`}>
                    <strong title={`${b.rooms} Room(s)`}>{b.rooms} Room{b.rooms > 1 ? "s" : ""}</strong>
                    <small title={`${b.adults} Guest(s)`}>{b.adults} Guest{b.adults > 1 ? "s" : ""}</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" title={`Booking ID: ${safeValue(b.bookingId)} | Status: ${safeValue(b.status)}`}>
                    <strong title={safeValue(b.bookingId)} style={{ fontSize: "0.82rem", marginBottom: "3px" }}>{safeValue(b.bookingId)}</strong>
                    <span className={`admin-status-pill ${statusClass}`}>
                      {safeValue(b.status)}
                    </span>
                  </div>

                  <div className="admin-table-cell" title={`Hotel: ${b.hotelName} | ID: ${b.hotelId || "--"}`}>
                    <strong title={b.hotelName} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block" }}>{b.hotelName}</strong>
                    <small title={`ID: ${b.hotelId || "--"}`}>ID: {b.hotelId || "--"}</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" title={`Total Price: ${formatCurrency(b.totalPrice)}`}>
                    <strong title={formatCurrency(b.totalPrice)}>{formatCurrency(b.totalPrice)}</strong>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" title={`Profit: ${formatCurrency(profitVal)}`}>
                    <strong title={`Calculated Profit: ${formatCurrency(profitVal)}`} style={{ color: "#10b981" }}>
                      {formatCurrency(profitVal)}
                    </strong>
                    <small style={{ color: "#10b981", fontWeight: "600" }}>Profit</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => setSelectedBooking(b)}
                      title="View details"
                    >
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredBookings.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          itemName="bookings"
        />
      </section>

      {/* Booking Detail Backdrop Modal */}
      {selectedBooking && (
        <div className="admin-view-backdrop" onClick={() => setSelectedBooking(null)} style={{ zIndex: 999999, backgroundColor: "rgba(0, 0, 0, 0.45)" }}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Booking details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Booking Detail View</h2>
                <p className="admin-view-header-subtitle">
                  {selectedBooking.bookingId} | {selectedBooking.guestName}
                </p>
                <div className="admin-view-meta-row">
                  <span className={`admin-view-meta-chip ${getAdminStatusClass(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                  <span className="admin-view-meta-chip">
                    Paid {formatCurrency(selectedBooking.totalPrice)}
                  </span>
                  <span className="admin-view-meta-chip success">
                    Profit {formatCurrency(Number(selectedBooking.profit || selectedBooking.calculatedProfit || Math.round(Number(selectedBooking.totalPrice || 0) * 0.06)))}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedBooking(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Trip Type</span>
                <strong>Hotel</strong>
              </div>
              <div>
                <span>Guest Name & Email</span>
                <strong>{selectedBooking.guestName || "--"}</strong>
                {selectedBooking.guestEmail && <small>{selectedBooking.guestEmail}</small>}
              </div>
              <div>
                <span>Guest Phone</span>
                <strong>{selectedBooking.guestPhone || "--"}</strong>
              </div>
              <div>
                <span>Booking Reference</span>
                <strong>{selectedBooking.bookingReference || "--"}</strong>
              </div>

              <div>
                <span>Booking ID / Provider ID</span>
                <strong>{selectedBooking.bookingId || "--"}</strong>
                {selectedBooking.providerBookingId && <small>Provider ID: {selectedBooking.providerBookingId}</small>}
              </div>
              <div>
                <span>Booking Date</span>
                <strong>{selectedBooking.createdAt ? formatDateTime(selectedBooking.createdAt) : (selectedBooking.bookedAt ? formatDateTime(selectedBooking.bookedAt) : "--")}</strong>
              </div>
              <div>
                <span>Hotel Property</span>
                <strong>{selectedBooking.hotelName || "--"}</strong>
                {selectedBooking.hotelId && <small>ID: {selectedBooking.hotelId}</small>}
              </div>
              <div>
                <span>Check-in / Check-out</span>
                <strong>{selectedBooking.checkInDate || "--"} to {selectedBooking.checkOutDate || "--"}</strong>
              </div>

              <div>
                <span>Confirmation No</span>
                <strong>{selectedBooking.confirmationNo || "--"}</strong>
              </div>
              <div>
                <span>Invoice No</span>
                <strong>{selectedBooking.invoiceNumber || "--"}</strong>
              </div>
              <div>
                <span>Rooms & Guests</span>
                <strong>{selectedBooking.rooms || 1} Room(s)</strong>
                <small>{selectedBooking.totalGuests || selectedBooking.adults || 1} Guest(s) ({selectedBooking.adults || 0} Adult{selectedBooking.children > 0 ? `, ${selectedBooking.children} Child` : ""})</small>
              </div>
              <div>
                <span>Last Cancel Date</span>
                <strong>{selectedBooking.lastCancellationDate || "--"}</strong>
              </div>

              <div>
                <span>Payment Status</span>
                <strong>{selectedBooking.paymentStatus || "N/A"}</strong>
              </div>
              <div>
                <span>Refund Status</span>
                <strong>{selectedBooking.refundStatus || "N/A"}</strong>
              </div>
              <div>
                <span>Fulfillment Status</span>
                <strong>{selectedBooking.fulfillmentStatus || "N/A"}</strong>
              </div>
              <div>
                <span>Status</span>
                <div>
                  <span className={`admin-status-pill ${getAdminStatusClass(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              <div className="admin-view-highlight-card">
                <span>Total Paid</span>
                <strong>{formatCurrency(selectedBooking.totalPaid || selectedBooking.totalPrice)}</strong>
                {selectedBooking.srdvOfferedPrice ? <small>Offered: {formatCurrency(selectedBooking.srdvOfferedPrice)}</small> : null}
              </div>
              <div className="admin-view-highlight-card">
                <span>Calculated Profit</span>
                <strong className="admin-profit-value gain">
                  {formatCurrency(Number(selectedBooking.profit || selectedBooking.calculatedProfit || Math.round(Number(selectedBooking.totalPrice || 0) * 0.06)))}
                </strong>
                <small>Profit</small>
              </div>
            </section>
          </article>
        </div>
      )}
    </div>
  );
}

