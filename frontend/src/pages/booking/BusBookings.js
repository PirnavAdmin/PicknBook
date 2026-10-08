/* eslint-disable */
import BookingStatusTabs from "../../components/booking/BookingStatusTabs";
import { bookingStatusOptions, bookingStatusLabel, bookingStatusClass } from "../../utils/bookingStatus";
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
  cancelBusBooking,
  getBusBookingById,
  listBusBookings,
  cancelBusPassengers,
} from "../../services/busBookingService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import CancellationModal from "./CancellationModal";
import BookingPagination, { paginateBookings } from "../../components/booking/BookingPagination";
import BookingLifecycle from "../../components/booking/BookingLifecycle";
import "../../STYLES/BusOpsDashboard.css";
import "../../STYLES/BookingDetailsScrollbar.css";
import "../../STYLES/BookingTableRows.css";
import "../../STYLES/TransportBookingDetails.css";
import { getBusBookingStatus, matchesBusFilters } from "../../utils/busBookingFilters";
import { formatDateTime } from "../../utils/apiDateFormat";

const emptyBusFilters = () => ({ passengerPhone: "", status: "All", bookingReference: "", passengerName: "", fromCity: "", toCity: "", departureDate: "" });

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

export default function BusBookings() {
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(emptyBusFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyBusFilters);

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loadingDetailFor, setLoadingDetailFor] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingPassengers, setIsCancellingPassengers] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);
  const [refundPreference, setRefundPreference] = useState("Original");

  const bookingRequestId = useRef(0);
  const fetchBookings = async () => {
    const requestId = ++bookingRequestId.current;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listBusBookings({ status: "all", passengerPhone: appliedFilters.passengerPhone });
      if (requestId !== bookingRequestId.current) return;
      setBookings(result);
    } catch (error) {
      if (requestId !== bookingRequestId.current) return;
      setBookings([]);
      const status = Number(error?.status);
      const msg = String(error?.message || "").toLowerCase();
      if (status === 401 || status === 403 || msg.includes("unauthorized") || msg.includes("please login")) {
        setErrorMessage("Please log in to view your bus bookings.");
      } else {
        setErrorMessage(error.message || "Unable to load bus bookings.");
      }
    } finally {
      if (requestId === bookingRequestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    return () => { bookingRequestId.current += 1; };
  }, [appliedFilters.passengerPhone]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => matchesBusFilters(booking, appliedFilters)), [bookings, appliedFilters]);

  const handleSearch = () => { setAppliedFilters({ ...filters }); setPage(1); };
  const paginated = paginateBookings(filteredBookings, page);
  useEffect(() => { setPage(1); }, [appliedFilters]);
  useEffect(() => { if (page !== paginated.currentPage) setPage(paginated.currentPage); }, [page, paginated.currentPage]);

  const handleReset = () => {
    setPage(1);
    setFilters(emptyBusFilters());
    setAppliedFilters(emptyBusFilters());
    setErrorMessage("");
    setActionMessage("");
  };

  const handleViewDetails = async (bookingId) => {
    setLoadingDetailFor(bookingId);
    setErrorMessage("");

    try {
      const detail = await getBusBookingById(bookingId);
      setSelectedBooking(detail);
      setSelectedPassengerIds([]);
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

  const handleCancelBooking = async (reason, refundPreference = "Original") => {
    const bookingId = cancelModalBookingId;
    if (!bookingId) return;
    setIsCancelModalOpen(false);

    setCancellingBookingId(bookingId);
    setErrorMessage("");
    setActionMessage("");

    try {
      const result = await cancelBusBooking(bookingId, reason || undefined, refundPreference);
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
    if (selectedPassengerIds.length === 0) return;

    setIsCancellingPassengers(true);
    setErrorMessage("");
    setActionMessage("");

    try {
      const updatedBooking = await cancelBusPassengers(
        selectedBooking.bookingId,
        selectedPassengerIds,
        cancelReason || undefined,
        refundPreference
      );

      setSelectedBooking(updatedBooking);
      setSelectedPassengerIds([]);
      setCancelReason("");
      setActionMessage("Selected passengers cancelled successfully.");
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Failed to cancel selected passengers.");
    } finally {
      setIsCancellingPassengers(false);
    }
  };


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

      <BookingStatusTabs value={appliedFilters.status} onChange={(status) => { setFilters(previous => ({ ...previous, status })); setAppliedFilters(previous => ({ ...previous, status })); setPage(1); }} />

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
                { const status = event.target.value; setFilters(previous => ({ ...previous, status })); setAppliedFilters(previous => ({ ...previous, status })); setPage(1); }
              }
            >
              {bookingStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
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
            <button type="button" className="primary" onClick={handleSearch}>
              <Search size={14} />
              <span>SEARCH</span>
            </button>
            <button type="button" className="secondary" onClick={handleReset}>
              <X size={14} />
              <span>CLEAR</span>
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
            <table className="ops-table booking-table-rows">
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
                {paginated.rows.map((booking) => {
                  const displayStatus = bookingStatusLabel(booking);
                  const bookedAt = formatBookedAt(booking.bookingTime ?? booking.bookedAtUtc ?? booking.createdAt ?? booking.createdAtUtc ?? booking.bookingDate ?? booking.bookedAt ?? booking.entryDate ?? booking.entryDateUtc);
                  const totalFormatted = Number(booking.totalFare ?? booking.totalPriceInr ?? booking.totalAmount ?? 0).toLocaleString("en-IN");

                  return (
                  <tr key={booking.bookingId || booking.bookingReference}>
                    <td>
                      <strong>{booking.bookingReference}</strong>
                      <small>ID: {booking.bookingId ?? "--"}</small>
                      {booking.pnr && <small>PNR: {booking.pnr}</small>}
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
                      <strong>{booking.seatsBooked ?? "--"}</strong>
                    </td>
                    <td>
                      <strong>INR {totalFormatted}</strong>
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

                        <button
                          type="button"
                          className="ops-btn-action-cancel"
                          title="Cancel booking"
                          onClick={() => triggerCancelBooking(booking.bookingId)}
                          disabled={
                            ["cancelled", "past", "completed", "payment failed"].includes(getBusBookingStatus(booking)) ||
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
        {!isLoading && filteredBookings.length > 0 && <BookingPagination page={paginated.currentPage} pageCount={paginated.pageCount} onChange={setPage} />}

      {selectedBooking && (
        <div className="ops-modal-backdrop booking-details-scrollbar transport-booking-details" onClick={() => { setSelectedBooking(null); setSelectedPassengerIds([]); setCancelReason(""); }}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Bus Booking Details</h3>
              <button type="button" onClick={() => { setSelectedBooking(null); setSelectedPassengerIds([]); setCancelReason(""); }}>
                <X size={16} />
              </button>
            </header>
            <div className="booking-details-body">
            <BookingLifecycle booking={selectedBooking} />
            <div className="ops-modal-grid">
              <div>
                <span>Booking Ref</span>
                <strong>{selectedBooking.bookingReference}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{bookingStatusLabel(selectedBooking)}</strong>
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
                  <span style={{ color: "#ff0000" }}>Cancellation Fee</span>
                  <strong style={{ color: "#ff0000" }}>{formatCurrency(selectedBooking.cancellationChargeInr)}</strong>
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
              <div><span>PNR</span><strong>{selectedBooking.pnr ?? "--"}</strong></div>
              <div><span>Bus / Trip Number</span><strong>{selectedBooking.tripNumber || "--"}</strong></div>
              <div><span>Departure</span><strong>{formatDateTime(selectedBooking.departureTimeUtc)}</strong></div>
              <div><span>Arrival</span><strong>{formatDateTime(selectedBooking.arrivalTimeUtc)}</strong></div>
                <div className="booking-payment-field">
                  <span>Payment Transaction ID</span>
                  <strong>{selectedBooking.paymentId ?? "--"}</strong>
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
                                checked={selectedPassengerIds.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPassengerIds([...selectedPassengerIds, p.id]);
                                  } else {
                                    setSelectedPassengerIds(selectedPassengerIds.filter((id) => id !== p.id));
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

                {selectedPassengerIds.length > 0 && (
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
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#4b5563" }}>
                        Refund To:
                        <select
                          value={refundPreference}
                          onChange={(e) => setRefundPreference(e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", marginTop: 4, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 11.5 }}
                        >
                          <option value="Original">Original Payment Method</option>
                          <option value="Wallet">Pick&book Wallet</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="ops-icon-btn primary"
                        style={{ padding: "6px 12px", background: "#ff0000", color: "#ffffff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11.5, alignSelf: "flex-end" }}
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
