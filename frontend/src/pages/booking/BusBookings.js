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
  cancelBusBooking,
  getBusBookingById,
  listBusBookings,
  cancelBusPassengers,
} from "../../services/busBookingService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import CancellationModal from "./CancellationModal";
import "../../STYLES/BusOpsDashboard.css";
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

function getStatusClassName(status) {
  const norm = String(status || "").trim().toLowerCase();
  if (norm.includes("cancel")) {
    return "danger";
  }
  if (
    norm.includes("confirm") ||
    norm.includes("success") ||
    norm.includes("complete") ||
    norm.includes("booked") ||
    norm.includes("active")
  ) {
    return "success";
  }
  return "default";
}

function hasJourneyCompleted(booking) {
  const departureTime = booking?.departureTimeUtc
    ? new Date(booking.departureTimeUtc)
    : null;

  return Boolean(
    departureTime &&
      !Number.isNaN(departureTime.getTime()) &&
      departureTime.getTime() < Date.now()
  );
}

function getDisplayStatus(booking) {
  const status = String(booking?.status || "").trim();

  if (status === "Cancelled") {
    return "Cancelled";
  }

  if (hasJourneyCompleted(booking)) {
    return "Completed";
  }

  return status || "Booked";
}

export default function BusBookings() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    passengerPhone: "",
    status: "All",
    bookingReference: "",
    passengerName: "",
    fromCity: "",
    toCity: "",
    departureDate: "",
  });

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loadingDetailFor, setLoadingDetailFor] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingPassengers, setIsCancellingPassengers] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listBusBookings({
        passengerPhone: filters.passengerPhone || undefined,
        status:
          filters.status === "All" || filters.status === "Completed"
            ? undefined
            : filters.status,
      });
      setBookings(result);
    } catch (error) {
      setBookings([]);
      const status = Number(error?.status);
      const msg = String(error?.message || "").toLowerCase();
      if (status === 401 || status === 403 || msg.includes("unauthorized") || msg.includes("please login")) {
        setErrorMessage("Please log in to view your bus bookings.");
      } else {
        setErrorMessage(error.message || "Unable to load bus bookings.");
      }
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
      const displayStatus = getDisplayStatus(booking);

      if (filters.status !== "All" && displayStatus !== filters.status) {
        return false;
      }

      if (
        filters.bookingReference &&
        !String(booking.bookingReference || "")
          .toLowerCase()
          .includes(filters.bookingReference.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.passengerName &&
        !String(booking.passengerName || "")
          .toLowerCase()
          .includes(filters.passengerName.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.fromCity &&
        !String(booking.fromCity || "")
          .toLowerCase()
          .includes(filters.fromCity.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.toCity &&
        !String(booking.toCity || "")
          .toLowerCase()
          .includes(filters.toCity.toLowerCase())
      ) {
        return false;
      }

      if (filters.departureDate) {
        const departureDate = String(booking.departureTimeUtc || "").slice(0, 10);
        if (departureDate !== filters.departureDate) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, filters]);

  const handleReset = () => {
    setFilters({
      passengerPhone: "",
      status: "All",
      bookingReference: "",
      passengerName: "",
      fromCity: "",
      toCity: "",
      departureDate: "",
    });
    setErrorMessage("");
    setActionMessage("");
  };

  const handleViewDetails = async (bookingId) => {
    setLoadingDetailFor(bookingId);
    setErrorMessage("");

    try {
      const detail = await getBusBookingById(bookingId);
      setSelectedBooking(detail);
      setSelectedSeatNumbers([]);
      setCancelReason("");
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
      const result = await cancelBusBooking(bookingId, reason || undefined);
      setActionMessage(
        `Booking ${result.bookingReference || bookingId} has been cancelled.`
      );
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel booking.");
    } finally {
      setCancellingBookingId(null);
      setCancelModalBookingId(null);
    }
  };

  const handleCancelSelectedPassengers = async () => {
    if (selectedSeatNumbers.length === 0) return;

    setIsCancellingPassengers(true);
    setErrorMessage("");
    setActionMessage("");

    try {
      const updatedBooking = await cancelBusPassengers(
        selectedBooking.bookingId,
        selectedSeatNumbers,
        cancelReason || undefined
      );

      setSelectedBooking(updatedBooking);
      setSelectedSeatNumbers([]);
      setCancelReason("");
      setActionMessage("Selected passengers cancelled successfully.");
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Failed to cancel selected passengers.");
    } finally {
      setIsCancellingPassengers(false);
    }
  };

  if (isLoading) {
    return (
      <TravelLoadingScreen
        title="Loading bus bookings..."
        message="Fetching your latest bus trips and ticket details."
        variant="bus"
        icon="bus"
      />
    );
  }

  return (
    <div className="flight-ops-page bus-booking-status-page">
      <header className="flight-ops-header">
        <div>
          <h1>Bus Bookings</h1>
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
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            >
              <option value="All">All</option>
              <option value="Booked">Booked</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
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
              placeholder="BS-2026..."
            />
          </label>

          <label>
            <span>Passenger Name</span>
            <input
              type="text"
              value={filters.passengerName}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  passengerName: event.target.value,
                }))
              }
              placeholder="Passenger name"
            />
          </label>

          <label>
            <span>From City</span>
            <input
              type="text"
              value={filters.fromCity}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  fromCity: event.target.value,
                }))
              }
              placeholder="Hyderabad"
            />
          </label>

          <label>
            <span>To City</span>
            <input
              type="text"
              value={filters.toCity}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, toCity: event.target.value }))
              }
              placeholder="Vijayawada"
            />
          </label>

          <label>
            <span>Departure Date</span>
            <input
              type="date"
              value={filters.departureDate}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  departureDate: event.target.value,
                }))
              }
            />
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={fetchBookings}>
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
            <p>Loading bus bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="ops-empty">
            <p>No bus bookings found for current filters.</p>
          </div>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>BOOKING REF / DATE</th>
                  <th>PASSENGER</th>
                  <th>ROUTE</th>
                  <th>DEPARTURE</th>
                  <th>SEATS</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const displayStatus = getDisplayStatus(booking);
                  const bookedAt = formatBookedAt(booking.createdAt || booking.bookingDate || booking.bookedAt);
                  const totalFormatted = Number(booking.totalPriceInr || booking.totalAmount || 0).toLocaleString("en-IN");

                  return (
                  <tr key={booking.bookingId || booking.bookingReference}>
                    <td>
                      <strong>{booking.bookingReference}</strong>
                      <small>ID: {booking.bookingId}</small>
                      {bookedAt && <small>Booked: {bookedAt}</small>}
                    </td>
                    <td>
                      <strong>{booking.passengerName || "--"}</strong>
                      <small>{booking.passengerPhone || "--"}</small>
                    </td>
                    <td>
                      <strong>
                        {booking.fromCity} to {booking.toCity}
                      </strong>
                      <small>{booking.providerName || "Bus Service"}</small>
                    </td>
                    <td>
                      <strong>{formatDateTime(booking.departureTimeUtc || booking.departureDate)}</strong>
                    </td>
                    <td>
                      <strong>{booking.seatsBooked || "1"}</strong>
                      <small>{booking.tripNumber || booking.seatNumbers || "--"}</small>
                    </td>
                    <td>
                      <strong>INR {totalFormatted}</strong>
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
                          className="ops-btn-action-view"
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
        <div className="ops-modal-backdrop" onClick={() => { setSelectedBooking(null); setSelectedSeatNumbers([]); setCancelReason(""); }}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Bus Booking Details</h3>
              <button type="button" onClick={() => { setSelectedBooking(null); setSelectedSeatNumbers([]); setCancelReason(""); }}>
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
                <strong>{getDisplayStatus(selectedBooking)}</strong>
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
                <span>Email</span>
                <strong>{selectedBooking.passengerEmail || "--"}</strong>
              </div>
              <div>
                <span>Route</span>
                <strong>
                  {selectedBooking.fromCity} to {selectedBooking.toCity}
                </strong>
              </div>
              <div>
                <span>Seats Booked</span>
                <strong>{selectedBooking.seatsBooked}</strong>
              </div>
              <div>
                <span>Total Price</span>
                <strong>{formatCurrency(selectedBooking.totalPriceInr)}</strong>
              </div>
              {selectedBooking.refundAmountInr > 0 && (
                <div>
                  <span style={{ color: "#16a34a" }}>Refund Processed</span>
                  <strong style={{ color: "#16a34a" }}>{formatCurrency(selectedBooking.refundAmountInr)}</strong>
                </div>
              )}
              {selectedBooking.cancellationChargeInr > 0 && (
                <div>
                  <span style={{ color: "#dc2626" }}>Cancellation Fee</span>
                  <strong style={{ color: "#dc2626" }}>{formatCurrency(selectedBooking.cancellationChargeInr)}</strong>
                </div>
              )}
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
              <div>
                <span>Operator</span>
                <strong>{selectedBooking.providerName || "--"}</strong>
              </div>
            </div>

            {selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1f2a44" }}>
                  Passengers &amp; Cancellation
                </h4>
                <div className="ops-table-scroll" style={{ maxHeight: 200, marginBottom: 12 }}>
                  <table className="ops-table" style={{ fontSize: 11.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Select</th>
                        <th>Name</th>
                        <th>Seat</th>
                        <th>Age / Gender</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBooking.passengers.map((p) => (
                        <tr key={p.id} style={{ opacity: p.isCancelled ? 0.6 : 1 }}>
                          <td>
                            {!p.isCancelled && (
                              <input
                                type="checkbox"
                                checked={selectedSeatNumbers.includes(p.seatNumber)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSeatNumbers([...selectedSeatNumbers, p.seatNumber]);
                                  } else {
                                    setSelectedSeatNumbers(selectedSeatNumbers.filter(sn => sn !== p.seatNumber));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td style={{ textDecoration: p.isCancelled ? "line-through" : "none" }}>
                            {p.fullName}{p.gender && ` (${p.gender[0].toUpperCase()})`}
                          </td>
                          <td>{p.seatNumber || "--"}</td>
                          <td>{p.age > 0 ? `${p.age} / ` : ""}{p.gender}</td>
                          <td>
                            {p.isCancelled ? (
                              <span className="status-badge danger" style={{ fontSize: 9, padding: "2px 6px" }}>Cancelled</span>
                            ) : (
                              <span className="status-badge success" style={{ fontSize: 9, padding: "2px 6px" }}>Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedSeatNumbers.length > 0 && (
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#4b5563" }}>
                        Cancellation Reason:
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="e.g. Change of plans"
                          style={{ width: "100%", padding: "6px 10px", marginTop: 4, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 11.5 }}
                        />
                      </label>
                      <button
                        type="button"
                        className="ops-icon-btn primary"
                        style={{ padding: "6px 12px", background: "#dc1e26", color: "#ffffff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11.5, alignSelf: "flex-end" }}
                        onClick={handleCancelSelectedPassengers}
                        disabled={isCancellingPassengers}
                      >
                        {isCancellingPassengers ? "Cancelling..." : "Cancel Selected Tickets"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
        title="Cancel Bus Booking"
        message="Are you sure you want to cancel this booking?"
      />
    </div>
  );
}
