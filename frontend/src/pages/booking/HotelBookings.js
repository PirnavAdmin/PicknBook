import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
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
import CancellationModal from "./CancellationModal";
import { formatDateTime } from "../../utils/apiDateFormat";

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
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

  const triggerCancelBooking = (bookingId) => {
    setCancelModalBookingId(bookingId);
    setIsCancelModalOpen(true);
  };

  const handleCancelBooking = async (reason) => {
    const bookingId = cancelModalBookingId;
    if (!bookingId) return;
    setIsCancelModalOpen(false);

    setCancellingBookingId(bookingId);
    setErrorMessage("");
    setActionMessage("");

    try {
      const result = await cancelHotelBooking(bookingId, reason || undefined);
      setActionMessage(
        `Hotel Booking ${result.bookingReference || bookingId} cancelled successfully.`
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
            <div className="hotel-bookings-grid">
              {filteredBookings.map((booking) => {
                const visuals = getHotelVisuals(booking.hotelId || booking.hotelName || "hotel");
                const isCancelled = String(booking.status || "").toLowerCase().includes("cancel");
                return (
                  <article key={booking.bookingId} className="hotel-booking-card">
                    <div className="hotel-booking-media">
                      <img src={visuals.cardImage} alt={booking.hotelName} />
                      <span className={`hotel-booking-badge hotel-booking-badge--${getStatusClassName(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="hotel-booking-ref">
                        {booking.bookingReference}
                      </span>
                    </div>

                    <div className="hotel-booking-info">
                      <span className="hotel-stay-label">{visuals.propertyLabel}</span>
                      <h3>{booking.hotelName}</h3>
                      <p className="hotel-booking-dates">
                        {booking.dates || `${booking.checkInDate} - ${booking.checkOutDate}`}
                      </p>

                      <div className="hotel-booking-meta">
                        <span>Guest: {booking.guestName || "Primary Guest"}</span>
                      </div>

                      <div className="hotel-booking-price-row">
                        <div className="hotel-booking-price">
                          <span>Total Paid</span>
                          <strong>{formatCurrency(booking.amount || booking.price)}</strong>
                        </div>

                        <div className="hotel-booking-actions">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => handleViewDetails(booking)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            title="Cancel booking"
                            onClick={() => triggerCancelBooking(booking.bookingId)}
                            disabled={isCancelled || cancellingBookingId === booking.bookingId}
                          >
                            {cancellingBookingId === booking.bookingId ? (
                              <Loader2 size={16} className="hotel-spin" />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
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
          message="Are you sure you want to cancel this hotel reservation?"
        />
      </div>
    </main>
  );
}
