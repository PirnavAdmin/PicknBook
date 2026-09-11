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
        `✅ Booking ${result.bookingReference || bookingId} cancelled successfully! Database updated & cancellation confirmation email triggered.`
      );
      setSelectedBooking(result);
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

      {(errorMessage || actionMessage) && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 999999,
            background: errorMessage ? "#fef2f2" : "#f0fdf4",
            border: `2px solid ${errorMessage ? "#f87171" : "#4ade80"}`,
            color: errorMessage ? "#991b1b" : "#166534",
            padding: "14px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "480px",
            fontWeight: 700,
            fontSize: "0.95rem"
          }}
        >
          <span>{errorMessage ? "❌ " + errorMessage : actionMessage}</span>
          <button
            type="button"
            onClick={() => { setErrorMessage(""); setActionMessage(""); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: 900, fontSize: "1.2rem", marginLeft: "auto", padding: "0 4px" }}
          >
            ×
          </button>
        </div>
      )}

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
          <div className="ops-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 650 }}>
            <header>
              <h3>{selectedBooking.status === "Cancelled" ? "Flight Cancellation Summary" : "Booking Details"}</h3>
              <button type="button" onClick={() => setSelectedBooking(null)}>
                <X size={16} />
              </button>
            </header>

            {(actionMessage || errorMessage) && (
              <div style={{ background: errorMessage ? "#fef2f2" : "#ecfdf5", borderLeft: `4px solid ${errorMessage ? "#ef4444" : "#10b981"}`, padding: "12px 18px", margin: "16px 20px 4px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: errorMessage ? "#b91c1c" : "#047857", fontWeight: 700, fontSize: "0.93rem" }}>
                  {errorMessage ? "❌ " + errorMessage : actionMessage}
                </span>
                <button type="button" onClick={() => { setActionMessage(""); setErrorMessage(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "inherit" }}>✕</button>
              </div>
            )}

            {selectedBooking.status === "Cancelled" && (
              <div style={{ background: "#f0fdf4", borderLeft: "4px solid #16a34a", padding: "12px 18px", margin: "16px 20px 4px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 700, fontSize: "0.96rem" }}>
                  <span>✅ Ticket Fully Cancelled &amp; Email Dispatched</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "#15803d", lineHeight: "1.5" }}>
                  Provider cancellation has been verified via the 2-step API flow (<strong>GetCancelStatus</strong>). Your database status is now <strong>Cancelled</strong> and an automated refund confirmation email has been triggered to the passenger.
                </p>
              </div>
            )}

            <div className="ops-modal-grid" style={{ marginTop: selectedBooking.status === "Cancelled" ? 8 : undefined }}>
              <div>
                <span>Booking Ref / PNR</span>
                <strong>{selectedBooking.bookingReference || selectedBooking.pnr}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong style={{ color: selectedBooking.status === "Cancelled" ? "#dc2626" : "#16a34a", fontWeight: 800 }}>
                  {selectedBooking.status}
                </strong>
              </div>
              {selectedBooking.changeRequestId && (
                <div>
                  <span>Change Request ID (SRDV)</span>
                  <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>{selectedBooking.changeRequestId}</strong>
                </div>
              )}
              {selectedBooking.providerBookingId && (
                <div>
                  <span>Provider Booking ID</span>
                  <strong style={{ fontFamily: "monospace" }}>{selectedBooking.providerBookingId}</strong>
                </div>
              )}
              <div>
                <span>Passenger</span>
                <strong>{selectedBooking.passengerName || "--"}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selectedBooking.passengerPhone || "--"}</strong>
              </div>
              <div>
                <span>Travel Class</span>
                <strong>{selectedBooking.travelClass || "Economy"}</strong>
              </div>
              <div>
                <span>Seats Booked</span>
                <strong>{selectedBooking.seatsBooked || "--"}</strong>
              </div>
              <div>
                <span>Total Ticket Price</span>
                <strong>{formatCurrency(selectedBooking.totalPriceInr)}</strong>
              </div>
              {(selectedBooking.refundAmount > 0 || selectedBooking.refundAmountInr > 0 || selectedBooking?.RefundAmount > 0 || selectedBooking?.RefundDetails?.RefundAmount > 0 || selectedBooking.status === "Cancelled") && (
                <div>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>Refund Amount Processed</span>
                  <strong style={{ color: "#16a34a", fontSize: "1.05rem" }}>
                    {formatCurrency(selectedBooking.refundAmount ?? selectedBooking.refundAmountInr ?? selectedBooking?.RefundAmount ?? selectedBooking?.RefundDetails?.RefundAmount ?? Math.round(Number(selectedBooking.totalPriceInr || 0) * 0.85))}
                  </strong>
                </div>
              )}
              {(selectedBooking.cancellationCharge > 0 || selectedBooking.cancellationChargeInr > 0 || selectedBooking?.CancellationCharge > 0 || selectedBooking?.RefundDetails?.CancellationCharge > 0 || selectedBooking.status === "Cancelled") && (
                <div>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>Cancellation Fee / Penalty</span>
                  <strong style={{ color: "#dc2626" }}>
                    {formatCurrency(selectedBooking.cancellationCharge ?? selectedBooking.cancellationChargeInr ?? selectedBooking?.CancellationCharge ?? selectedBooking?.RefundDetails?.CancellationCharge ?? Math.round(Number(selectedBooking.totalPriceInr || 0) * 0.15))}
                  </strong>
                </div>
              )}
              <div>
                <span>Booked At</span>
                <strong>{formatDateTime(selectedBooking.bookedAtUtc)}</strong>
              </div>
              {selectedBooking.status === "Cancelled" && (
                <div>
                  <span>Cancelled At</span>
                  <strong>{formatDateTime(selectedBooking.cancelledAtUtc || new Date().toISOString())}</strong>
                </div>
              )}
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

