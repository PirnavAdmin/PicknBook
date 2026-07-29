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
  cancelFlightBooking,
  getFlightBookingById,
  listFlightBookings,
} from "../../services/flightBookingService";
import "../../STYLES/FlightOpsDashboard.css";
import CancellationModal from "./CancellationModal";
import { formatDateTime } from "../../utils/apiDateFormat";


function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
}

function getStatusClassName(status) {
  if (status === "Cancelled") {
    return "danger";
  }

  if (status === "Booked") {
    return "success";
  }

  return "default";
}

export default function FlightCancelRequest() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "All",
    fromDate: "",
    toDate: "",
    bookingReference: "",
    passengerPhone: "",
  });
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loadingDetailFor, setLoadingDetailFor] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listFlightBookings({
        passengerPhone: filters.passengerPhone || undefined,
        status: filters.status === "All" ? undefined : filters.status,
      });
      setBookings(result);
    } catch (error) {
      setBookings([]);
      setErrorMessage(error.message || "Unable to load cancellation data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const departureDate = String(booking.departureTimeUtc || "").slice(0, 10);

      if (filters.fromDate && departureDate < filters.fromDate) {
        return false;
      }

      if (filters.toDate && departureDate > filters.toDate) {
        return false;
      }

      return true;
    });
  }, [bookings, filters]);

  const handleSearch = () => {
    fetchBookings();
  };

  const handleReset = () => {
    setFilters({
      status: "All",
      fromDate: "",
      toDate: "",
      bookingReference: "",
      passengerPhone: "",
    });
    setErrorMessage("");
    setActionMessage("");
  };

  const handleViewDetails = async (bookingId) => {
    setLoadingDetailFor(bookingId);
    setErrorMessage("");

    try {
      const detail = await getFlightBookingById(bookingId);
      setSelectedBooking(detail);
    } catch (error) {
      setErrorMessage(error.message || "Unable to fetch booking details.");
    } finally {
      setLoadingDetailFor(null);
    }
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
      const result = await cancelFlightBooking(bookingId, reason || undefined);
      setActionMessage(
        `Booking ${result.bookingReference || bookingId} cancelled successfully.`
      );
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel booking.");
    } finally {
      setCancellingBookingId(null);
      setCancelModalBookingId(null);
    }
  };

  return (
    <div className="flight-ops-page">
      <header className="flight-ops-header">
        <div>
          <h1>Flight Cancel Requests</h1>
        </div>
        <div className="flight-ops-header-actions">
          <button type="button" onClick={fetchBookings} className="ops-icon-btn">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen((previous) => !previous)}
            className="ops-icon-btn"
          >
            <SlidersHorizontal size={15} />
            <span>{isFilterOpen ? "Hide Filters" : "Show Filters"}</span>
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="ops-feedback error">
          <XCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {actionMessage && (
        <div className="ops-feedback success">
          <span>{actionMessage}</span>
        </div>
      )}

      {isFilterOpen && (
        <section className="flight-ops-filters">
          <label>
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            >
              <option value="All">All</option>
              <option value="Booked">Booked</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span>Passenger Phone</span>
            <input
              type="text"
              value={filters.passengerPhone}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  passengerPhone: event.target.value,
                }))
              }
              placeholder="+91XXXXXXXXXX"
            />
          </label>

          <label>
            <span>From Date</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, fromDate: event.target.value }))
              }
            />
          </label>

          <label>
            <span>To Date</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, toDate: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Booking Reference</span>
            <input
              type="text"
              value={filters.bookingReference}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  bookingReference: event.target.value,
                }))
              }
              placeholder="FL-202602..."
            />
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={handleSearch}>
              <Search size={14} />
              <span>Search</span>
            </button>
            <button type="button" className="secondary" onClick={handleReset}>
              <X size={14} />
              <span>Clear</span>
            </button>
          </div>
        </section>
      )}

      <section className="flight-ops-table-wrap">
        {isLoading ? (
          <div className="ops-empty">
            <Loader2 size={18} className="spin" />
            <p>Loading cancellation records...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="ops-empty">
            <p>No records found for selected filters.</p>
          </div>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Booking & Date</th>
                  <th>Segment</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td>
                      <strong>{booking.bookingId}</strong>
                      <small>{formatDateTime(booking.bookedAtUtc)}</small>
                    </td>
                    <td>
                      <strong>
                        {booking.fromCity} to {booking.toCity}
                      </strong>
                      <small>{booking.tripNumber}</small>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClassName(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      <strong>{formatCurrency(booking.totalPriceInr)}</strong>
                    </td>
                    <td>{booking.cancellationReason || "--"}</td>
                    <td>{booking.bookingReference}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => handleViewDetails(booking.bookingId)}
                          disabled={loadingDetailFor === booking.bookingId}
                        >
                          {loadingDetailFor === booking.bookingId ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Cancel booking"
                          onClick={() => triggerCancelBooking(booking.bookingId)}
                          disabled={
                            booking.status === "Cancelled" ||
                            cancellingBookingId === booking.bookingId
                          }
                        >
                          {cancellingBookingId === booking.bookingId ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <ShieldX size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBooking && (
        <div className="ops-modal-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Cancellation Details</h3>
              <button type="button" onClick={() => setSelectedBooking(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="ops-modal-grid">
              <div>
                <span>Booking Ref</span>
                <strong>{selectedBooking.bookingReference}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedBooking.status}</strong>
              </div>
              <div>
                <span>Passenger</span>
                <strong>{selectedBooking.passengerName}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selectedBooking.passengerPhone || "--"}</strong>
              </div>
              <div>
                <span>Travel Class</span>
                <strong>{selectedBooking.travelClass}</strong>
              </div>
              <div>
                <span>Seats Booked</span>
                <strong>{selectedBooking.seatsBooked}</strong>
              </div>
              <div>
                <span>Total Price</span>
                <strong>{formatCurrency(selectedBooking.totalPriceInr)}</strong>
              </div>
              <div>
                <span>Booked At</span>
                <strong>{formatDateTime(selectedBooking.bookedAtUtc)}</strong>
              </div>
              <div>
                <span>Cancelled At</span>
                <strong>{formatDateTime(selectedBooking.cancelledAtUtc)}</strong>
              </div>
              <div>
                <span>Cancellation Reason</span>
                <strong>{selectedBooking.cancellationReason || "--"}</strong>
              </div>
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
        title="Cancel Flight Ticket"
        message="Are you sure you want to cancel this ticket?"
      />
    </div>
  );
}

