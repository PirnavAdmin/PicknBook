/* eslint-disable */
import BookingStatusTabs from "../../components/booking/BookingStatusTabs";
import { bookingStatusOptions, bookingStatusLabel, bookingStatusClass, bookingCategory } from "../../utils/bookingStatus";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import "../../STYLES/BookingTableRows.css";
import CancellationModal from "./CancellationModal";
import BookingPagination, { paginateBookings } from "../../components/booking/BookingPagination";
import BookingLifecycle from "../../components/booking/BookingLifecycle";
import { matchesHotelFilters } from "../../utils/hotelBookingFilters";
import { formatDateTime } from "../../utils/apiDateFormat";

const emptyHotelFilters = () => ({ status: "All", bookingReference: "", hotelName: "", guestName: "" });

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

export default function HotelBookings() {
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(emptyHotelFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyHotelFilters);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);

  const bookingRequestId = useRef(0);
  const fetchBookings = async () => {
    const requestId = ++bookingRequestId.current;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyHotelBookings({ status: "all" });
      if (requestId !== bookingRequestId.current) return;
      setBookings(Array.isArray(result) ? result : []);
    } catch (error) {
      if (requestId !== bookingRequestId.current) return;
      setBookings([]);
      setErrorMessage(error.message || "Unable to load hotel bookings.");
    } finally {
      if (requestId === bookingRequestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    return () => { bookingRequestId.current += 1; };
  }, []);

  const filteredBookings = useMemo(() => bookings.filter((booking) => matchesHotelFilters(booking, appliedFilters)), [bookings, appliedFilters]);

  const handleSearch = () => { setAppliedFilters({ ...filters }); setPage(1); };
  const paginated = paginateBookings(filteredBookings, page);
  useEffect(() => { setPage(1); }, [appliedFilters]);
  useEffect(() => { if (page !== paginated.currentPage) setPage(paginated.currentPage); }, [page, paginated.currentPage]);

  const handleReset = () => {
    setPage(1);
    setFilters(emptyHotelFilters());
    setAppliedFilters(emptyHotelFilters());
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

  const handleCancelBooking = async (reason, refundPreference = "Original") => {
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
      const result = await cancelHotelBooking(booking, reason || undefined, { refundPreference });
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

      <BookingStatusTabs className="booking-status-tabs--bus-aligned" value={appliedFilters.status} onChange={(status) => { setFilters(previous => ({ ...previous, status })); setAppliedFilters(previous => ({ ...previous, status })); setPage(1); }} />

        {isFilterOpen && (
          <section className="hotel-bookings-filters">
            <label>
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  { const status = event.target.value; setFilters(previous => ({ ...previous, status })); setAppliedFilters(previous => ({ ...previous, status })); setPage(1); }
                }
              >
              {bookingStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
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
              <button type="button" className="hotel-bookings-btn hotel-bookings-btn--primary" onClick={handleSearch}>
                <Search size={14} />
                <span>SEARCH</span>
              </button>
              <button type="button" className="hotel-bookings-btn" onClick={handleReset}>
                <X size={14} />
                <span>CLEAR</span>
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
            <div className="ops-empty">
              <p>No hotel bookings found for current filters.</p>
            </div>
          ) : (
            <div className="ops-table-scroll">
              <table className="ops-table booking-table-rows">
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
                  {paginated.rows.map((booking) => {
                    const bookingStatus = String(booking.status || "").trim();
                    const isCancelled = ["cancelled", "payment failed"].includes(bookingCategory(booking));
                    const isCompleted = bookingCategory(booking) === "past";
                    const bookedAt = formatBookedAt(booking.bookingTime ?? booking.createdAt ?? booking.bookingDate ?? booking.bookedAt);
                    const checkIn = formatHotelDate(booking.checkInDate || booking.dates, booking.checkInTime || "14:00");
                    const checkOut = formatHotelDate(booking.checkOutDate, booking.checkOutTime || "11:00");
                    const totalFormatted = Number(booking.amount ?? booking.totalPrice ?? booking.price ?? 0).toLocaleString("en-IN");
                    const displayStatus = bookingStatusLabel(booking);

                    return (
                      <tr key={booking.id || booking.bookingReference}>
                        <td>
                          <strong>{booking.bookingReference || booking.id}</strong>
                          {bookedAt && <small>Booked: {bookedAt}</small>}
                        </td>
                        <td>
                          <strong>{booking.hotelName}</strong>
                          {(booking.city || booking.address || booking.destination) && (
                            <small>{booking.city || booking.address || booking.destination}</small>
                          )}
                        </td>
                        <td>
                          <strong>{booking.guestName || "--"}</strong>
                          <small>{booking.guestPhone || booking.contactNumber || "--"}</small>
                        </td>
                        <td>
                          <strong>{checkIn}</strong>
                          {booking.checkOutDate && <small>Check-out: {checkOut}</small>}
                        </td>
                        <td>
                          <strong>INR {totalFormatted}</strong>
                          {(booking.roomType || booking.roomTypeName || booking.mealPlan) && (
                            <small>{booking.roomType || booking.roomTypeName || booking.mealPlan}</small>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${bookingStatusClass(booking)}`}>
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
                              disabled={
                                isCancelled ||
                                isCompleted ||
                                cancellingBookingId === (booking.id || booking.Id || booking.bookingId)
                              }
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
        {!isLoading && filteredBookings.length > 0 && <BookingPagination page={paginated.currentPage} pageCount={paginated.pageCount} onChange={setPage} />}

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
                <BookingLifecycle booking={selectedBooking} />
                <div className="hotel-modal-field">
                  <label>Booking Reference</label>
                  <strong>{selectedBooking.bookingReference}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Status</label>
                  <strong>{bookingStatusLabel(selectedBooking)}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Booking ID</label>
                  <strong>{selectedBooking.bookingId ?? selectedBooking.BookingId ?? "--"}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Booked At</label>
                  <strong>{selectedBooking.createdAt ? formatDateTime(selectedBooking.createdAt) : "--"}</strong>
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
                  <strong>{String(selectedBooking.providerBookingId ?? selectedBooking.ProviderBookingId ?? "").trim() || "--"}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Total Amount Paid</label>
                  <strong>{formatCurrency(selectedBooking.amount ?? selectedBooking.price)}</strong>
                </div>
                <div className="hotel-modal-field">
                  <label>Payment Transaction ID</label>
                  <strong>{selectedBooking.paymentId ?? "--"}</strong>
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
