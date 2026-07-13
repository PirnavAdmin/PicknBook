import React, { useEffect, useState, useMemo } from "react";
import { listHotelBookings, cancelHotelBookingByAdmin } from "../../../services/adminHotelService";
import { formatDateTime } from "../../../utils/apiDateFormat";
import AdminPagination from "../../../components/AdminPagination";
import "./HotelBookingList.css";

export default function HotelBookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const data = await listHotelBookings({
        passengerPhone: phoneFilter.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setBookings(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || "Failed to load hotel bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, phoneFilter]);

  // Client-side search filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(b.bookingReference || "").toLowerCase().includes(term) ||
        String(b.hotelName || "").toLowerCase().includes(term) ||
        String(b.guestName || "").toLowerCase().includes(term) ||
        String(b.guestEmail || "").toLowerCase().includes(term)
      );
    });
  }, [bookings, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const active = filteredBookings.filter((b) => b.status !== "Cancelled").length;
    const cancelled = total - active;
    const revenue = filteredBookings
      .filter((b) => b.status !== "Cancelled")
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    return { total, active, cancelled, revenue };
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
    <div className="hbl-page admin-b2c-hotel-page">
      <header className="hbl-header">
        <div>
          <h2 className="hbl-title" style={{ fontWeight: 500, margin: 0, fontSize: "1.6rem" }}>
            <span style={{ color: '#A51C49', fontWeight: 500 }}>Hotel</span> <span style={{ color: '#000000', fontWeight: 500 }}>Booking List</span>
          </h2>
          <p className="hbl-subtitle">View and manage B2C hotel stays and reservations.</p>
        </div>
      </header>

      {/* Stats row */}
      <section className="hbl-stats">
        <div className="hbl-stat-card">
          <span className="hbl-stat-label">Total Reservations</span>
          <strong className="hbl-stat-value">{stats.total}</strong>
        </div>
        <div className="hbl-stat-card hbl-stat-green">
          <span className="hbl-stat-label">Active Bookings</span>
          <strong className="hbl-stat-value">{stats.active}</strong>
        </div>
        <div className="hbl-stat-card hbl-stat-orange">
          <span className="hbl-stat-label">Cancelled Bookings</span>
          <strong className="hbl-stat-value">{stats.cancelled}</strong>
        </div>
        <div className="hbl-stat-card hbl-stat-blue">
          <span className="hbl-stat-label">Total Revenue</span>
          <strong className="hbl-stat-value">{formatCurrency(stats.revenue)}</strong>
        </div>
      </section>

      {/* Filters row */}
      <section className="hbl-filters">
        <div className="hbl-filter-group search">
          <label className="hbl-filter-label">Search Bookings</label>
          <div className="hbl-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="hbl-search"
              placeholder="Search by reference, hotel, guest name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="hbl-filter-group select" style={{ marginLeft: "auto" }}>
          <label className="hbl-filter-label">Status Filter</label>
          <select
            className="hbl-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Booked">Booked</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="hbl-filter-group action">
          <label className="hbl-filter-label" style={{ opacity: 0 }}>Action</label>
          <button
            type="button"
            className="hbl-pg-btn export-btn"
            onClick={() => {
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
            }}
            disabled={filteredBookings.length === 0}
          >
            Export CSV
          </button>
        </div>
      </section>

      {error && (
        <div className="hbl-badge hbl-badge-cancelled" style={{ width: "100%", padding: "10px 15px", marginBottom: "15px", borderRadius: "8px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {actionSuccess && (
        <div className="hbl-badge hbl-badge-success" style={{ width: "100%", padding: "10px 15px", marginBottom: "15px", borderRadius: "8px" }}>
          {actionSuccess}
        </div>
      )}

      {/* Table wrap */}
      <div className="hbl-table-wrap">
        <table className="hbl-table">
          <thead>
            <tr>
              <th>Ref / ID</th>
              <th>Hotel Property</th>
              <th>Guest Details</th>
              <th>Stay Dates</th>
              <th>Rooms / Adults</th>
              <th>Total Paid</th>
              <th>Status</th>
              <th>Booked At</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="hbl-empty">Loading reservations...</td>
              </tr>
            ) : paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan="9" className="hbl-empty">No reservations found.</td>
              </tr>
            ) : (
              paginatedBookings.map((b) => (
                <tr key={b.bookingId}>
                  <td>
                    <strong className="hbl-id">{b.bookingReference}</strong>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>ID: {b.bookingId}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.hotelName}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>City: {b.cityCode}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.guestName}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{b.guestPhone} | {b.guestEmail}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: "13px" }}>
                      {b.checkInDate} to {b.checkOutDate}
                    </div>
                  </td>
                  <td>
                    {b.rooms} Room{b.rooms > 1 ? "s" : ""} / {b.adults} Guest{b.adults > 1 ? "s" : ""}
                  </td>
                  <td className="hbl-amount">{formatCurrency(b.totalPrice)}</td>
                  <td>
                    <span className={getStatusBadgeClass(b.status)}>{b.status}</span>
                  </td>
                  <td style={{ color: "#64748b", fontSize: "12px" }}>
                    {b.createdAt ? formatDateTime(b.createdAt) : "--"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="hbl-pg-btn"
                      style={{ padding: "4px 8px", fontSize: "11px", borderColor: "#fee2e2", color: "#b91c1c" }}
                      disabled={b.status === "Cancelled" || loading}
                      onClick={() => handleCancelClick(b)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div style={{ marginTop: '16px' }}>
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredBookings.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="bookings"
        />
      </div>
    </div>
  );
}

