/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { listHotelBookings, cancelHotelBookingByAdmin } from "../../../services/adminHotelService";
import { formatDateTime } from "../../../utils/apiDateFormat";
import AdminPagination from "../../../components/AdminPagination";
import { getAdminItemsPerPage } from "../../../utils/adminPortalStorage";
import { Filter, Download } from "lucide-react";
import "./HotelBookingList.css";
import "../../B2C BUS MANAGEMENT/Booking List/BookingList.css";


export default function HotelBookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const resolveGuestName = (b) => {
    const val = b?.guestName || b?.GuestName || b?.passengerName || b?.PassengerName || b?.customerName || b?.CustomerName || b?.userName || b?.UserName || b?.name || b?.Name || b?.leadGuestName || b?.leadPassengerName;
    return val && String(val).trim() ? String(val).trim() : "--";
  };

  const resolveGuestPhone = (b) => {
    const val = b?.guestPhone || b?.GuestPhone || b?.passengerPhone || b?.PassengerPhone || b?.phone || b?.Phone || b?.mobile || b?.Mobile || b?.phoneNumber || b?.PhoneNumber || b?.phoneNo || b?.contactNumber;
    return val && String(val).trim() ? String(val).trim() : "--";
  };

  const resolveGuestEmail = (b) => {
    const val = b?.guestEmail || b?.GuestEmail || b?.passengerEmail || b?.PassengerEmail || b?.email || b?.Email || b?.customerEmail || b?.CustomerEmail || b?.userEmail || b?.UserEmail || b?.contactEmail;
    return val && String(val).trim() ? String(val).trim() : "--";
  };

  const resolveCheckInDate = (b) => {
    return b?.checkInDate || b?.CheckInDate || b?.checkInDateIst || b?.CheckInDateIst || b?.checkIn || b?.CheckIn || b?.fromDate || b?.FromDate || b?.arrivalDate || b?.ArrivalDate || "";
  };

  const resolveCheckOutDate = (b) => {
    return b?.checkOutDate || b?.CheckOutDate || b?.checkOutDateIst || b?.CheckOutDateIst || b?.checkOut || b?.CheckOut || b?.toDate || b?.ToDate || b?.departureDate || b?.DepartureDate || "";
  };

  const safeValue = (val, fallback = "--") =>
    val !== undefined && val !== null && String(val).trim() !== ""
      ? String(val).trim()
      : fallback;

  const formatAdminDate = (dateString) => {
    if (!dateString || dateString === "--" || dateString === "N/A" || String(dateString).startsWith("0001")) return "--";
    try {
      const raw = String(dateString).trim();
      if (raw.startsWith("0001-01-01")) return "--";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoDateMatch) {
        const [, year, monthStr, dayStr] = isoDateMatch;
        if (year === "0001") return "--";
        const monthIdx = parseInt(monthStr, 10) - 1;
        const day = parseInt(dayStr, 10);
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
        }
      }

      const formattedMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
      if (formattedMatch) {
        const [, dayStr, monthStr, year] = formattedMatch;
        if (year === "0001") return "--";
        const monthIdx = parseInt(monthStr, 10) - 1;
        const day = parseInt(dayStr, 10);
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
        }
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        if (parsed.getFullYear() <= 1) return "--";
        const day = parsed.getDate();
        const monthIdx = parsed.getMonth();
        const year = parsed.getFullYear();
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatDateCell = (value) => formatAdminDate(value);

  const formatSingleTimeAmPm = (timeStr) => {
    if (!timeStr || timeStr === "--" || timeStr === "00:00") return "";
    const raw = String(timeStr).trim();

    const hhmmMatch = raw.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
      let hours = parseInt(hhmmMatch[1], 10);
      const minutes = hhmmMatch[2];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
      return `${hoursStr}:${minutes} ${ampm}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      let hours = parsed.getHours();
      const minutes = String(parsed.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
      return `${hoursStr}:${minutes} ${ampm}`;
    }

    return raw;
  };

  const formatJourneyTimeAmPm = (journeyTime) => {
    if (!journeyTime || journeyTime === "--" || journeyTime === "00:00") return "--:--";
    const str = String(journeyTime).trim();
    if (str.includes("-")) {
      const parts = str.split("-");
      const dep = formatSingleTimeAmPm(parts[0].trim());
      const arr = formatSingleTimeAmPm(parts[1].trim());
      if (dep && arr) {
        return `${dep} - ${arr}`;
      }
    }
    const single = formatSingleTimeAmPm(str);
    return single || journeyTime || "--:--";
  };

  const getAdminStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("complet")) return "completed";
    if (s.includes("cancel")) return "cancelled";
    if (s.includes("expir") || s.includes("fail")) return "expired";
    if (s.includes("book") || s.includes("confirm") || s.includes("success")) return "success";
    return "pending";
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

    if (s.includes("complet")) {
      return {
        ...baseStyle,
        backgroundColor: "#e0f2fe",
        color: "#0284c7",
        border: "1px solid #0284c7"
      };
    } else if (s.includes("book") || s.includes("confirm") || s.includes("success")) {
      return {
        ...baseStyle,
        backgroundColor: "#e6f4ea",
        color: "#137333",
        border: "1px solid #137333"
      };
    } else if (s.includes("cancel")) {
      return {
        ...baseStyle,
        backgroundColor: "#fce8e6",
        color: "#c5221f",
        border: "1px solid #c5221f"
      };
    } else if (s.includes("expir") || s.includes("fail")) {
      return {
        ...baseStyle,
        backgroundColor: "#fef3c7",
        color: "#d97706",
        border: "1px solid #d97706"
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: "#f1f5f9",
        color: "#475569",
        border: "1px solid #cbd5e1"
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
  const [itemsPerPage, setItemsPerPage] = useState(() => getAdminItemsPerPage(50));

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

  const fetchBookings = async (overridePhone, overrideStatus) => {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const phoneParam = overridePhone !== undefined ? overridePhone : (appliedMobileNumber || tempMobileNumber || undefined);
      const statusParam = overrideStatus !== undefined ? overrideStatus : (appliedStatus !== "all" ? appliedStatus : undefined);
      const data = await listHotelBookings({
        passengerPhone: phoneParam ? String(phoneParam).trim() : undefined,
        status: statusParam,
      });
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
    fetchBookings(tempMobileNumber, tempStatus !== "all" ? tempStatus : undefined);
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
    fetchBookings("", undefined);
  };

  // Client-side search filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const s = String(b.status || "").toLowerCase();
      if (s.includes("expir") || s.includes("fail") || s.includes("hold") || s.includes("pend")) {
        return false;
      }

      // 1. Search Term (ref, hotel, guest, email)
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
    <section className="admin-b2c-page admin-booking-page admin-b2c-hotel-page">
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
      <header className="admin-b2c-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Hotel</span> Booking List
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
        <header className="admin-table-head" style={{ gridTemplateColumns: "1.1fr 1.3fr 1.7fr 1.2fr 1.3fr 1.4fr 0.9fr 1.2fr 0.8fr" }}>
          <span>B. ID / B.D.</span>
          <span>Passenger Details</span>
          <span>Check-in / Check-out</span>
          <span>Rooms / Guests</span>
          <span>PNR / Status</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {loading ? (
          <div className="admin-table-empty">Loading reservations...</div>
        ) : paginatedBookings.length === 0 ? (
          <div className="admin-table-empty">No records found.</div>
        ) : (
          <div className="admin-table-body">
            {paginatedBookings.map((b) => {
              const statusClass = getAdminStatusClass(b.paymentStatus || b.status);
              const profitVal = (b.srdvOfferedPrice !== undefined && b.srdvOfferedPrice !== null)
                ? (Number(b.totalPrice || 0) - Number(b.srdvOfferedPrice || 0))
                : (Number(b.profit || b.calculatedProfit || Math.round(Number(b.totalPrice || 0) * 0.06)) || 0);

              const isLossOrZero = profitVal <= 0;

              return (
                <article key={b.bookingId || b.id} className="admin-table-row" style={{ gridTemplateColumns: "1.1fr 1.3fr 1.7fr 1.2fr 1.3fr 1.4fr 0.9fr 1.2fr 0.8fr" }}>
                  <div className="admin-table-cell">
                    <strong style={{ color: "#A51C49", fontWeight: 700, fontSize: "0.80rem", wordBreak: "break-all" }}>{safeValue(b.bookingId || b.id || b.bookingReference)}</strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatDateCell(b.createdAt || b.bookedAt)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong className="admin-name-text" style={{ color: "#000000", fontWeight: 800, fontSize: "0.76rem", display: "block", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                      {resolveGuestName(b)}
                    </strong>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#475569" }}>
                      {resolveGuestPhone(b)}
                    </small>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#64748b", fontSize: "0.68rem" }}>
                      {resolveGuestEmail(b)}
                    </small>
                  </div>

                  <div className="admin-table-cell">
                    <div className="admin-route-segment">
                      <span>{formatDateCell(resolveCheckInDate(b))}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{formatDateCell(resolveCheckOutDate(b))}</span>
                    </div>
                    <small>Stay Dates</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{b.rooms || 1} Room{Number(b.rooms) > 1 ? "s" : ""}</strong>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                      {Number(b.children || 0) > 0
                        ? `${b.adults || 0} Adult${Number(b.adults) !== 1 ? "s" : ""}, ${b.children} Child${Number(b.children) !== 1 ? "ren" : ""}`
                        : `${b.adults || b.totalGuests || 1} Guest${Number(b.adults || b.totalGuests || 1) !== 1 ? "s" : ""}`}
                    </small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700, marginBottom: "3px", wordBreak: "break-all" }}>
                      {safeValue(b.bookingReference || b.confirmationNo || b.providerBookingId || b.bookingId)}
                    </strong>
                    <span className={`admin-status-pill ${statusClass}`}>
                      {safeValue(b.paymentStatus || b.status)}
                    </span>
                  </div>

                  <div className="admin-table-cell">
                    <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block" }}>{b.hotelName}</strong>
                    <small>ID: {b.hotelId || "--"}</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{formatCurrency(b.totalPrice)}</strong>
                  </div>

                  <div className="admin-table-cell admin-cell-centered" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      color: profitVal < 0 ? "#dc2626" : "#16a34a",
                      lineHeight: "1.2"
                    }}>
                      {profitVal < 0 ? `-₹${Math.abs(profitVal).toFixed(2)}` : `₹${profitVal.toFixed(2)}`}
                    </span>
                    <span style={{
                      fontSize: "0.68rem",
                      color: "#64748b",
                      fontWeight: "500",
                      marginTop: "2px"
                    }}>
                      {profitVal < 0 ? "Loss" : "Profit"}
                    </span>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => setSelectedBooking(b)}
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
        <div className="admin-view-backdrop" onClick={() => setSelectedBooking(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Hotel booking details"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(860px, 94vw)", padding: "20px" }}
          >
            <header className="admin-view-header" style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div className="admin-view-header-main">
                <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px", fontWeight: "700", color: "#1e293b" }}>Hotel Booking Detail View</h2>
                <p className="admin-view-header-subtitle" style={{ fontSize: "0.82rem", margin: 0, color: "#64748b" }}>
                  ID: <strong>{safeValue(selectedBooking.bookingId || selectedBooking.id)}</strong> | Ref: <strong>{safeValue(selectedBooking.bookingReference, "--")}</strong>
                </p>
                <div className="admin-view-meta-row" style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span className="admin-view-meta-chip">
                    Status: {safeValue(selectedBooking.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Customer Fare: {formatCurrency(selectedBooking.totalPrice || selectedBooking.totalPaid)}
                  </span>
                  <span className="admin-view-meta-chip">
                    {(Number(selectedBooking.profit || selectedBooking.calculatedProfit) || 0) < 0
                      ? `Loss: -₹${Math.abs(Number(selectedBooking.profit || selectedBooking.calculatedProfit)).toLocaleString("en-IN")}`
                      : `Profit: ${formatCurrency(Number(selectedBooking.profit || selectedBooking.calculatedProfit || Math.round(Number(selectedBooking.totalPrice || 0) * 0.06)))}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{
                  padding: "6px 18px",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(165, 28, 73, 0.3)"
                }}
              >
                Close
              </button>
            </header>

            <div style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "4px" }}>
              {/* SECTION 1: GENERAL & RESERVATION DETAILS */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "14px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                GENERAL & RESERVATION DETAILS
              </div>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Booking ID</th>
                    <td>{safeValue(selectedBooking.bookingId || selectedBooking.id)}</td>
                    <th>Booking Reference</th>
                    <td>{safeValue(selectedBooking.bookingReference, "--")}</td>
                  </tr>
                  <tr>
                    <th>PNR / Conf No</th>
                    <td>{safeValue(selectedBooking.confirmationNo || selectedBooking.bookingReference, "--")}</td>
                    <th>Booking Date (B.D.)</th>
                    <td>{formatAdminDate(selectedBooking.createdAt || selectedBooking.bookedAt)}</td>
                  </tr>
                  <tr>
                    <th>Booking Status</th>
                    <td>
                      <span className={`admin-status-pill ${getAdminStatusClass(selectedBooking.status)}`}>
                        {safeValue(selectedBooking.status)}
                      </span>
                    </td>
                    <th>Pax / Guests</th>
                    <td>
                      {selectedBooking.rooms || 1} Room(s) / {Number(selectedBooking.children || 0) > 0
                        ? `${selectedBooking.adults || 0} Adult(s), ${selectedBooking.children} Child(ren)`
                        : `${selectedBooking.adults || selectedBooking.totalGuests || 1} Guest(s)`}
                    </td>
                  </tr>
                  <tr>
                    <th>Hotel Property</th>
                    <td>{safeValue(selectedBooking.hotelName, "--")}</td>
                    <th>Check-in Date (Jd)</th>
                    <td>{formatAdminDate(selectedBooking.checkInDate)}</td>
                  </tr>
                  <tr>
                    <th>Check-out Date</th>
                    <td>{formatAdminDate(selectedBooking.checkOutDate)}</td>
                    <th>Last Cancel Date</th>
                    <td>{formatAdminDate(selectedBooking.lastCancellationDate)}</td>
                  </tr>
                  <tr>
                    <th>Invoice No</th>
                    <td>{safeValue(selectedBooking.invoiceNumber, "--")}</td>
                    <th>Booked By</th>
                    <td>{safeValue(selectedBooking.bookedBy || selectedBooking.guestName, "--")}</td>
                  </tr>
                  <tr>
                    <th>Guest Name</th>
                    <td>{safeValue(selectedBooking.guestName, "--")}</td>
                    <th>Phone Number (P.no)</th>
                    <td>{safeValue(selectedBooking.guestPhone, "--")}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 2: FINANCIAL & FARE BREAKDOWN */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                FINANCIAL & FARE BREAKDOWN
              </div>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Fare Parameter</th>
                    <th style={{ width: "30%" }}>Amount (INR)</th>
                    <th style={{ width: "40%" }}>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Customer Fare</strong></td>
                    <td><strong>{formatCurrency(selectedBooking.totalPrice || selectedBooking.totalPaid)}</strong></td>
                    <td>Total fare charged to customer</td>
                  </tr>
                  <tr>
                    <td>Net Fare</td>
                    <td>{selectedBooking.srdvOfferedPrice ? formatCurrency(selectedBooking.srdvOfferedPrice) : formatCurrency(selectedBooking.totalPrice)}</td>
                    <td>Net payable fare amount</td>
                  </tr>
                  <tr>
                    <td>Base Fare</td>
                    <td>{formatCurrency(selectedBooking.totalPrice || selectedBooking.totalPaid)}</td>
                    <td>Base room tariff cost</td>
                  </tr>
                  <tr>
                    <td>Taxable Fare</td>
                    <td>₹0.00</td>
                    <td>Fare amount subject to taxes</td>
                  </tr>
                  <tr>
                    <td>Markup Amount</td>
                    <td>₹0.00</td>
                    <td>Admin markup added</td>
                  </tr>
                  <tr>
                    <td>Discount Amount</td>
                    <td>₹0.00</td>
                    <td>Applied coupon / promo discount</td>
                  </tr>
                  <tr>
                    <td>Convenience Fee</td>
                    <td>₹0.00</td>
                    <td>Platform convenience fee</td>
                  </tr>
                  <tr>
                    <td>GST Percent / Amount</td>
                    <td>0.00% / ₹0.00</td>
                    <td>Applicable GST taxes</td>
                  </tr>
                  <tr className="admin-view-highlight-row" style={{ background: "#f8fafc" }}>
                    <td><strong>Calculated Profit / Loss</strong></td>
                    <td>
                      <strong style={{ color: (Number(selectedBooking.profit || selectedBooking.calculatedProfit) || 0) < 0 ? "#ef4444" : "#10b981" }}>
                        {formatCurrency(Number(selectedBooking.profit || selectedBooking.calculatedProfit || Math.round(Number(selectedBooking.totalPrice || 0) * 0.06)))}
                      </strong>
                    </td>
                    <td style={{ color: (Number(selectedBooking.profit || selectedBooking.calculatedProfit) || 0) < 0 ? "#ef4444" : "#10b981", fontWeight: "700" }}>
                      {(Number(selectedBooking.profit || selectedBooking.calculatedProfit) || 0) < 0 ? "Loss" : "Profit"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 3: PAYMENT INFORMATION */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                PAYMENT INFORMATION
              </div>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Payment Status</th>
                    <td>
                      <span className={`admin-ps-pill ${getAdminStatusClass(selectedBooking.paymentStatus || selectedBooking.status) === "success" ? "ps-success" : "ps-na"}`}>
                        {safeValue(selectedBooking.paymentStatus || selectedBooking.status || "N/A")}
                      </span>
                    </td>
                    <th>Refund Status</th>
                    <td>
                      <span className="admin-ps-pill ps-na">
                        {safeValue(selectedBooking.refundStatus, "N/A")}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Fulfillment Status</th>
                    <td colSpan="3">
                      <span className="admin-ps-pill ps-na">
                        {safeValue(selectedBooking.fulfillmentStatus, "N/A")}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 4: GUEST & ROOM DETAILS */}
              <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#A51C49", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#A51C49", borderRadius: "2px" }}></span>
                GUEST & ROOM DETAILS ({Array.isArray(selectedBooking.guests) ? selectedBooking.guests.length : (Array.isArray(selectedBooking.passengers) ? selectedBooking.passengers.length : 1)})
              </div>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>#</th>
                    <th style={{ width: "40%" }}>Guest Full Name</th>
                    <th style={{ width: "25%" }}>Phone Number</th>
                    <th style={{ width: "25%" }}>Room Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(selectedBooking.guests) && selectedBooking.guests.length > 0 ? (
                    selectedBooking.guests.map((g, gIdx) => (
                      <tr key={`g-${gIdx}`}>
                        <td>{gIdx + 1}</td>
                        <td><strong>{safeValue(g.fullName || g.name || g.guestName, selectedBooking.guestName)}</strong></td>
                        <td>{safeValue(g.phone || g.phoneNumber, selectedBooking.guestPhone)}</td>
                        <td>{safeValue(g.roomType || g.roomNo, `${selectedBooking.rooms || 1} Room(s)`)}</td>
                      </tr>
                    ))
                  ) : Array.isArray(selectedBooking.passengers) && selectedBooking.passengers.length > 0 ? (
                    selectedBooking.passengers.map((p, pIdx) => (
                      <tr key={`p-${pIdx}`}>
                        <td>{pIdx + 1}</td>
                        <td><strong>{safeValue(p.fullName || p.name, selectedBooking.guestName)}</strong></td>
                        <td>{safeValue(p.phone || p.phoneNumber, selectedBooking.guestPhone)}</td>
                        <td>{safeValue(p.roomType || p.seatNumber, `${selectedBooking.rooms || 1} Room(s)`)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td>1</td>
                      <td><strong>{safeValue(selectedBooking.guestName)}</strong></td>
                      <td>{safeValue(selectedBooking.guestPhone)}</td>
                      <td>{selectedBooking.rooms || 1} Room(s) / {selectedBooking.adults || 1} Guest(s)</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* SECTION 5: HOTEL CANCELLATION & REFUND BREAKDOWN */}
              {(selectedBooking.status === "Cancelled" || selectedBooking.cancelledAtUtc || selectedBooking.cancellationReason) && (
                <>
                  <div className="admin-view-section-title" style={{ fontSize: "0.85rem", margin: "16px 0 8px", fontWeight: "700", color: "#ef4444", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "3px", height: "14px", background: "#ef4444", borderRadius: "2px" }}></span>
                    HOTEL CANCELLATION & REFUND BREAKDOWN
                  </div>
                  <table className="admin-view-table">
                    <tbody>
                      <tr>
                        <th>Cancelled Date (UTC)</th>
                        <td>{formatAdminDate(selectedBooking.cancelledAtUtc || selectedBooking.cancelledAt)}</td>
                        <th>Cancellation Reason</th>
                        <td>{safeValue(selectedBooking.cancellationReason || selectedBooking.reason)}</td>
                      </tr>
                      <tr>
                        <th>Cancellation Penalty Fee</th>
                        <td>{formatCurrency(Number(selectedBooking.cancellationChargeInr || selectedBooking.cancellationCharge || selectedBooking.cancellationPenalty) || 0)}</td>
                        <th>Refund Amount</th>
                        <td>{formatCurrency(Number(selectedBooking.refundAmountInr || selectedBooking.refundAmount) || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

