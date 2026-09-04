/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldX,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import {
  getMyHotelBookings,
  cancelHotelBooking,
} from "../../services/hotelBookingService";
import { getHotelVisuals } from "./hotelPresentation";
import "../../STYLES/HotelBookings.css";
import "../../STYLES/FlightOpsDashboard.css";
import CancellationModal from "./CancellationModal";
import { formatDateTime } from "../../utils/apiDateFormat";

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
}

function formatBookedAt(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year}, ${hours}:${mins}`;
  } catch {
    return String(dateStr);
  }
}

function formatHotelDate(dateStr, defaultTime = "14:00") {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (String(dateStr).includes(",")) return String(dateStr);
      return `${dateStr}, ${defaultTime}`;
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const time = (hours !== "00" || mins !== "00") ? `${hours}:${mins}` : defaultTime;
    return `${day}-${month}-${year}, ${time}`;
  } catch {
    return String(dateStr);
  }
}

function getStatusClassName(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized.includes("cancel")) {
    return "danger";
  }
  if (
    normalized.includes("confirm") ||
    normalized.includes("success") ||
    normalized.includes("complete") ||
    normalized.includes("booked")
  ) {
    return "success";
  }
  return "default";
}

export default function HotelBookings() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "All",
    bookingReference: "",
    hotelName: "",
    guestName: "",
  });
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyHotelBookings();
      setBookings(Array.isArray(result) ? result : []);
    } catch (error) {
      setBookings([]);
      setErrorMessage(error.message || "Unable to load hotel bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (
        filters.bookingReference &&
        !String(booking.bookingReference || "")
          .toLowerCase()
          .includes(filters.bookingReference.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.hotelName &&
        !String(booking.hotelName || "")
          .toLowerCase()
          .includes(filters.hotelName.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.guestName &&
        !String(booking.guestName || "")
          .toLowerCase()
          .includes(filters.guestName.toLowerCase())
      ) {
        return false;
      }

      if (filters.status !== "All") {
        const statusLower = String(booking.status || "").toLowerCase();
        const filterLower = filters.status.toLowerCase();
        if (!statusLower.includes(filterLower)) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, filters]);

  const handleReset = () => {
    setFilters({
      status: "All",
      bookingReference: "",
      hotelName: "",
      guestName: "",
    });
    setErrorMessage("");
    setActionMessage("");
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
  };

  const triggerCancelBooking = (booking) => {
    setCancelModalBookingId(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancelBooking = async (reason) => {
    setIsCancelModalOpen(false);
    
    const booking = cancelModalBookingId;
    if (!booking) return;

    let actualId = booking.id || booking.Id || booking.bookingId;
    if (!actualId) {
      setErrorMessage("Unable to find booking ID to cancel.");
      setCancelModalBookingId(null);
      return;
    }

    // The backend `my-bookings` DTO returns `BookingId` as a string like "bk-24".
    // We need to strip the prefix and send the raw integer ID to `CancelRoom`.
    if (typeof actualId === 'string' && actualId.startsWith('bk-')) {
      actualId = parseInt(actualId.replace('bk-', ''), 10);
    } else if (typeof actualId === 'string') {
      actualId = parseInt(actualId.replace(/\D/g, ''), 10);
    }

    setCancellingBookingId(actualId);
    setErrorMessage("");
    setActionMessage("");

    try {
      const result = await cancelHotelBooking(booking, reason || undefined);
      setActionMessage(
        `Hotel Booking ${result.bookingReference || actualId} cancelled successfully.`
      );
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel hotel booking.");
    } finally {
      setCancellingBookingId(null);
      setCancelModalBookingId(null);
    }
  };

  return (
    <main className="hotel-bookings-page">
      <div className="hotel-bookings-shell">
        <header className="hotel-bookings-header">
          <h1>Hotel Stays & Reservations</h1>
          <div className="hotel-bookings-header-actions">
            <button type="button" onClick={fetchBookings} className="hotel-bookings-btn">
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen((previous) => !previous)}
              className="hotel-bookings-btn"
            >
              <SlidersHorizontal size={14} />
              <span>{isFilterOpen ? "Hide filters" : "Show filters"}</span>
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="hotel-helper hotel-helper--error">
            <span>{errorMessage}</span>
          </div>
        )}

        {actionMessage && (
          <div className="hotel-helper hotel-helper--success">
            <span>{actionMessage}</span>
          </div>
        )}

        {isFilterOpen && (
          <section className="hotel-bookings-filters">
            <label>
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, status: event.target.value }))
                }
              >
                <option value="All">All</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>

            <label>
              <span>Booking reference</span>
              <input
                type="text"
                value={filters.bookingReference}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    bookingReference: event.target.value,
                  }))
                }
                placeholder="HT-2026..."
              />
            </label>

            <label>
              <span>Hotel name</span>
              <input
                type="text"
                value={filters.hotelName}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    hotelName: event.target.value,
                  }))
                }
                placeholder="Ambassador"
              />
            </label>

            <label>
              <span>Guest name</span>
              <input
                type="text"
                value={filters.guestName}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    guestName: event.target.value,
                  }))
                }
                placeholder="John Doe"
              />
            </label>

            <div className="hotel-bookings-filters-actions">
              <button type="button" className="hotel-bookings-btn hotel-bookings-btn--primary" onClick={fetchBookings}>
                <Search size={14} />
                <span>Search</span>
              </button>
              <button type="button" className="hotel-bookings-btn" onClick={handleReset}>
                <X size={14} />
                <span>Clear</span>
              </button>
            </div>
          </section>
        )}

        <section className="hotel-bookings-content-wrap">
          {isLoading ? (
            <div className="hotel-bookings-loading">
              <Loader2 size={24} className="hotel-spin" />
              <h3>Loading your trips...</h3>
              <p>Fetching active stay reservations from the API.</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="hotel-bookings-empty">
              <h3>No stay reservations found</h3>
              <p>Try clearing filters or search different keywords.</p>
            </div>
          ) : (
            <div className="ops-table-scroll">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>BOOKING REF / DATE</th>
                    <th>HOTEL NAME</th>
                    <th>GUEST NAME</th>
                    <th>CHECKIN DATE / TIME</th>
                    <th>TOTAL PRICE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const isCancelled = String(booking.status || "").toLowerCase().includes("cancel");
                    const bookedAt = formatBookedAt(booking.createdAt || booking.bookingDate || booking.bookedAt);
                    const checkIn = formatHotelDate(booking.checkInDate || booking.dates, booking.checkInTime || "14:00");
                    const checkOut = formatHotelDate(booking.checkOutDate, booking.checkOutTime || "11:00");
                    const totalFormatted = Number(booking.amount || booking.totalPrice || booking.price || 0).toLocaleString("en-IN");
                    const displayStatus = booking.status || "Confirmed";

                    return (
                      <tr key={booking.id || booking.bookingReference}>
                        <td>
                          <strong>{booking.bookingReference || booking.id}</strong>
                          {bookedAt && <small>Booked: {bookedAt}</small>}
                        </td>
                        <td>
                          <strong>{booking.hotelName}</strong>
                          <small>{booking.city || booking.address || booking.destination || "Vijayawada"}</small>
                        </td>
                        <td>
                          <strong>{booking.guestName || "SURESH REDDY AVULA"}</strong>
                          <small>{booking.guestPhone || booking.contactNumber || "+91 9876543210"}</small>
                        </td>
                        <td>
                          <strong>{checkIn}</strong>
                          {booking.checkOutDate && <small>Check-out: {checkOut}</small>}
                        </td>
                        <td>
                          <strong>INR {totalFormatted}</strong>
                          <small>{booking.roomType || booking.roomTypeName || booking.mealPlan || "Deluxe King Room"}</small>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClassName(displayStatus)}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="ops-btn-action"
                              title="View details"
                              onClick={() => handleViewDetails(booking)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="ops-btn-action"
                              title="Cancel booking"
                              onClick={() => triggerCancelBooking(booking)}
                              disabled={isCancelled || cancellingBookingId === (booking.id || booking.Id || booking.bookingId)}
                            >
                              {cancellingBookingId === (booking.id || booking.Id || booking.bookingId) ? (
                                <Loader2 size={15} className="hotel-spin" />
                              ) : (
                                <ShieldX size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedBooking && (
          <div className="hotel-modal-backdrop" onClick={() => setSelectedBooking(null)}>
            <div className="hotel-modal" onClick={(event) => event.stopPropagation()}>
              <header className="hotel-modal-header">
                <h3>Hotel Stay Details</h3>
                <button type="button" onClick={() => setSelectedBooking(null)}>
                  <X size={18} />
                </button>
              </header>
              <div className="hotel-modal-body">
                <div className="hotel-modal-field">
                  <label>Booking Reference</label>
                  <strong>{selectedBooking.bookingReference}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Status</label>
                  <strong>{selectedBooking.status}</strong>
                </div>
                <div className="hotel-modal-field full-width">
                  <label>Guest Name</label>
                  <strong>{selectedBooking.guestName || "Primary Guest"}</strong>
                </div>
                <div className="hotel-modal-field full-width">
                  <label>Hotel Property</label>
                  <strong>{selectedBooking.hotelName}</strong>
                </div>
                <div className="hotel-modal-field full-width">
                  <label>Dates of Stay</label>
                  <strong>{selectedBooking.dates || `${selectedBooking.checkInDate} - ${selectedBooking.checkOutDate}`}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Provider booking ID</label>
                  <strong>{selectedBooking.providerBookingId || "--"}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Total Amount Paid</label>
                  <strong>{formatCurrency(selectedBooking.amount || selectedBooking.price)}</strong>
                </div>
                <div className="hotel-modal-field full-width">
                  <label>Booked At</label>
                  <strong>{selectedBooking.createdAt ? formatDateTime(selectedBooking.createdAt) : "--"}</strong>
                </div>
                {selectedBooking.cancellationReason && (
                  <div className="hotel-modal-field full-width">
                    <label>Cancellation Reason</label>
                    <strong>{selectedBooking.cancellationReason}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <CancellationModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setCancelModalBookingId(null);
          }}
          onConfirm={handleCancelBooking}
          title="Cancel Hotel Reservation"
          message="Are you sure you want to cancel this hotel reservation? WARNING: Hotel cancellation policies will apply. Refunds are subject to the provider's terms and conditions, and you may incur cancellation charges."
        />
      </div>
    </main>
  );
}
