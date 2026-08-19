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
  getFlightBookingById,
  listFlightBookings,
  cancelFlightPassengers,
  cancelFlightBooking,
  cancelFlightPartial,
  getCancellationCharges,
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

  if (status === "Pending") {
    return "warning";
  }

  return "default";
}

export default function FlightBookings() {
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
  const [loadingDetailFor, setLoadingDetailFor] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedLegIndexes, setSelectedLegIndexes] = useState([]);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingPassengers, setIsCancellingPassengers] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [isFetchingCharges, setIsFetchingCharges] = useState(false);
  const [cancelCharges, setCancelCharges] = useState(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listFlightBookings({
        passengerPhone: filters.passengerPhone || undefined,
        status: filters.status === "All" ? undefined : filters.status,
      });
      setBookings(Array.isArray(result) ? result : []);
    } catch (error) {
      setBookings([]);
      setErrorMessage(error.message || "Unable to load flight bookings.");
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
    }).sort((a, b) => {
      if (typeof a._localRank === "number" && typeof b._localRank === "number") {
        if (a._localRank !== b._localRank) return a._localRank - b._localRank;
      }
      if (typeof a._localRank === "number") return -1;
      if (typeof b._localRank === "number") return 1;

      const getNumId = (val) => {
        if (typeof val === "number" && !isNaN(val)) return val;
        const str = String(val || "").trim();
        const numMatch = str.match(/\d+/g);
        if (numMatch) {
          return parseInt(numMatch.join(""), 10) || 0;
        }
        return 0;
      };

      const idA = getNumId(a.bookingReference || a.bookingId || a.id || a.Id);
      const idB = getNumId(b.bookingReference || b.bookingId || b.id || b.Id);
      if (idA !== idB && idA > 0 && idB > 0) {
        return idB - idA;
      }

      const getTimestamp = (obj) => {
        const ts = obj.bookedAtUtc || obj.BookedAtUtc || obj.bookedAt || obj.createdAt || obj.CreatedAt || obj.bookingDate || obj.BookingDate || 0;
        const val = new Date(ts).getTime();
        return isNaN(val) || val < 946684800000 ? 0 : val;
      };
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (timeA > 0 && timeB > 0 && Math.abs(timeA - timeB) > 1000) return timeB - timeA;
      if (timeA > 0 && timeB === 0) return -1;
      if (timeB > 0 && timeA === 0) return 1;

      return 0;
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
  };

  const handleViewDetails = async (bookingItem) => {
    const targetBooking = typeof bookingItem === "object" ? bookingItem : null;
    const bookingId = typeof bookingItem === "object" ? (bookingItem.bookingId || bookingItem.bookingReference) : bookingItem;
    setLoadingDetailFor(bookingId);
    setErrorMessage("");

    try {
      const detail = await getFlightBookingById(bookingId);
      setSelectedBooking(detail || targetBooking);
      setSelectedLegIndexes([]);
      setSelectedPassengerIds([]);
      setCancelReason("");
      setActionMessage("");
    } catch (error) {
      if (targetBooking) {
        setSelectedBooking(targetBooking);
      } else {
        setErrorMessage(error.message || "Unable to fetch booking details.");
      }
    } finally {
      setLoadingDetailFor(null);
    }
  };

  const handleCancelPartialSelection = async () => {
    if (selectedLegIndexes.length === 0 && selectedPassengerIds.length === 0) return;

    setIsCancellingPassengers(true);
    setErrorMessage("");
    setActionMessage("");

    try {
      const updatedBooking = await cancelFlightPartial(selectedBooking, {
        selectedLegIndexes,
        selectedPassengerIds,
        reason: cancelReason || "Customer requested partial flight cancellation"
      });

      setSelectedBooking(updatedBooking);
      setSelectedLegIndexes([]);
      setSelectedPassengerIds([]);
      setCancelReason("");
      setActionMessage("✅ Partial cancellation processed successfully! Provider verified and database status updated.");
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Failed to cancel selected flight legs / passengers.");
    } finally {
      setIsCancellingPassengers(false);
    }
  };

  const handleCancelSelectedPassengers = async () => {
    return handleCancelPartialSelection();
  };

  const triggerCancelBooking = async (booking) => {
    setCancelModalBooking(booking);
    setIsCancelModalOpen(true);
    setCancelCharges(null);
    setIsFetchingCharges(true);
    try {
      const result = await getCancellationCharges(booking);
      if (result && result.success) {
        setCancelCharges(result.result || result.rawResponse);
      } else {
        setCancelCharges(null);
      }
    } catch (err) {
      console.warn("Failed to fetch cancellation charges:", err);
      setCancelCharges(null);
    } finally {
      setIsFetchingCharges(false);
    }
  };

  const handleCancelBooking = async (reason) => {
    const targetBooking = cancelModalBooking;
    const bookingId = targetBooking?.bookingId || targetBooking?.bookingReference;
    if (!bookingId) return;
    setIsCancelModalOpen(false);

    setCancellingBookingId(bookingId);
    setErrorMessage("");
    setActionMessage("");

    try {
      const result = await cancelFlightBooking(targetBooking || bookingId, reason || undefined);
      setActionMessage(
        `✅ Booking ${result.bookingReference || bookingId} cancelled successfully! Database updated & cancellation confirmation email triggered.`
      );
      setSelectedBooking(result);
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel flight booking.");
    } finally {
      setCancellingBookingId(null);
      setCancelModalBooking(null);
    }
  };

  return (
    <div className="flight-ops-page">
      <header className="flight-ops-header">
        <div>
          <h1>Flight Bookings</h1>
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
              placeholder="FL-2026..."
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
              placeholder="Delhi"
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
            <p>Loading flight bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="ops-empty">
            <p>No flight bookings found for current filters.</p>
          </div>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Passenger</th>
                  <th>Segment</th>
                  <th>Departure</th>
                  <th>Seats</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td>
                      <strong>{booking.bookingReference}</strong>
                      <small>ID: {booking.bookingId}</small>
                    </td>
                    <td>
                      <strong>{booking.passengerName || "--"}</strong>
                      <small>{booking.passengerPhone || "--"}</small>
                    </td>
                    <td>
                      {booking.isMultiCity || (Array.isArray(booking.segments) && booking.segments.length > 1) ? (
                        <>
                          <strong style={{ color: "#0f172a" }}>
                            {booking.segments && booking.segments.length > 0
                              ? booking.segments.map(s => s.fromCity || s.sourceCode).join(" → ") + " → " + (booking.toCity || booking.segments[booking.segments.length - 1]?.toCity)
                              : `${booking.fromCity} to ${booking.toCity}`}
                          </strong>
                          <small style={{ color: "#e11d48", fontWeight: 700, display: "block" }}>
                            {booking.providerName || booking.airline || "Flight Service"} · Multi-City ({booking.segments?.length || 2} Legs)
                          </small>
                        </>
                      ) : (
                        <>
                          <strong>
                            {booking.fromCity} to {booking.toCity}
                          </strong>
                          <small>{booking.providerName || booking.travelClass || "--"}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <strong>{formatDateTime(booking.departureTimeUtc)}</strong>
                    </td>
                    <td>
                      <strong>{booking.seatsBooked || "--"}</strong>
                      <small>
                        {Array.isArray(booking.segments) && booking.segments.length > 1
                          ? booking.segments.map(s => s.tripNumber || s.flightNumber).filter(Boolean).join(" / ") || `${booking.segments.length} Flights`
                          : (booking.tripNumber || booking.travelClass || "--")}
                      </small>
                    </td>
                    <td>
                      <strong>{formatCurrency(booking.totalPriceInr)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClassName(booking.status)}`}>
                        {booking.status === "Pending" ? "Processing" : booking.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => handleViewDetails(booking)}
                          disabled={loadingDetailFor === booking.bookingId || loadingDetailFor === booking.bookingReference}
                        >
                          {loadingDetailFor === booking.bookingId ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                        {booking.status !== "Pending" && (
                          <button
                            type="button"
                            title="Cancel flight booking"
                            onClick={() => triggerCancelBooking(booking)}
                            disabled={
                              booking.status === "Cancelled" ||
                              cancellingBookingId === (booking.bookingId || booking.bookingReference)
                            }
                          >
                            {cancellingBookingId === (booking.bookingId || booking.bookingReference) ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <ShieldX size={15} />
                            )}
                          </button>
                        )}
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
        <div className="ops-modal-backdrop" onClick={() => { setSelectedBooking(null); setSelectedPassengerIds([]); setCancelReason(""); }}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 650 }}>
            <header>
              <h3>{selectedBooking.status === "Cancelled" ? "Flight Cancellation Details" : "Flight Booking Details"}</h3>
              <button type="button" onClick={() => { setSelectedBooking(null); setSelectedPassengerIds([]); setCancelReason(""); }}>
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
                  {selectedBooking.isMultiCity || (Array.isArray(selectedBooking.segments) && selectedBooking.segments.length > 1)
                    ? (selectedBooking.segments?.map(s => s.fromCity).join(" → ") + " → " + (selectedBooking.toCity || selectedBooking.segments[selectedBooking.segments.length - 1]?.toCity))
                    : `${selectedBooking.fromCity} to ${selectedBooking.toCity}`}
                </strong>
              </div>
              <div>
                <span>Seats Booked</span>
                <strong>{selectedBooking.seatsBooked || "--"}</strong>
              </div>
              <div>
                <span>Travel Class</span>
                <strong>{selectedBooking.travelClass || "--"}</strong>
              </div>
              <div>
                <span>Total Price</span>
                <strong>{formatCurrency(selectedBooking.totalPriceInr)}</strong>
              </div>
              {(selectedBooking.refundAmountInr > 0 || selectedBooking.refundAmount > 0 || selectedBooking?.RefundAmount > 0 || selectedBooking?.RefundDetails?.RefundAmount > 0 || selectedBooking.status === "Cancelled") && (
                <div>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>Refund Processed</span>
                  <strong style={{ color: "#16a34a", fontSize: "1.05rem" }}>
                    {formatCurrency(selectedBooking.refundAmountInr ?? selectedBooking.refundAmount ?? selectedBooking?.RefundAmount ?? selectedBooking?.RefundDetails?.RefundAmount ?? Math.round(Number(selectedBooking.totalPriceInr || 0) * 0.85))}
                  </strong>
                </div>
              )}
              {(selectedBooking.cancellationChargeInr > 0 || selectedBooking.cancellationCharge > 0 || selectedBooking?.CancellationCharge > 0 || selectedBooking?.RefundDetails?.CancellationCharge > 0 || selectedBooking.status === "Cancelled") && (
                <div>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>Cancellation Fee</span>
                  <strong style={{ color: "#dc2626" }}>
                    {formatCurrency(selectedBooking.cancellationChargeInr ?? selectedBooking.cancellationCharge ?? selectedBooking?.CancellationCharge ?? selectedBooking?.RefundDetails?.CancellationCharge ?? Math.round(Number(selectedBooking.totalPriceInr || 0) * 0.15))}
                  </strong>
                </div>
              )}
              <div>
                <span>Booked At</span>
                <strong>{formatDateTime(selectedBooking.bookedAtUtc)}</strong>
              </div>
            </div>

            {Array.isArray(selectedBooking.segments) && selectedBooking.segments.length > 1 && (
              <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 14, paddingLeft: 14, paddingRight: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#1f2a44" }}>
                    Multi-City Flight Itinerary ({selectedBooking.segments.length} Legs)
                  </h4>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Select legs below to cancel specific sectors</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedBooking.segments.map((seg, sIdx) => {
                    const isLegCancelled = seg.status === "Cancelled" || seg.isCancelled;
                    return (
                      <div key={`seg-item-${sIdx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isLegCancelled ? "#fef2f2" : "#f8fafc", border: `1px solid ${isLegCancelled ? "#fecaca" : "#e2e8f0"}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, opacity: isLegCancelled ? 0.7 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {!isLegCancelled && (
                            <input
                              type="checkbox"
                              checked={selectedLegIndexes.includes(sIdx)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLegIndexes([...selectedLegIndexes, sIdx]);
                                } else {
                                  setSelectedLegIndexes(selectedLegIndexes.filter(idx => idx !== sIdx));
                                }
                              }}
                              style={{ cursor: "pointer", width: 15, height: 15 }}
                            />
                          )}
                          <span style={{ background: isLegCancelled ? "#991b1b" : "#e11d48", color: "#ffffff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                            LEG {sIdx + 1}
                          </span>
                          <strong style={{ color: "#0f172a", textDecoration: isLegCancelled ? "line-through" : "none" }}>{seg.fromCity} → {seg.toCity}</strong>
                          <span style={{ color: "#64748b", marginLeft: 4 }}>({seg.providerName || selectedBooking.providerName || "Airline"} {seg.tripNumber || seg.flightNumber || ""})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
                            {seg.departureTimeUtc ? formatDateTime(seg.departureTimeUtc) : (seg.departureTime || "--")}
                          </span>
                          {isLegCancelled ? (
                            <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Cancelled</span>
                          ) : (
                            <span style={{ background: "#ecfdf5", color: "#16a34a", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Active</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedBooking.status !== "Pending" && selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 16, paddingLeft: 14, paddingRight: 14 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1f2a44" }}>
                  Passengers &amp; Cancellation
                </h4>
                <div className="ops-table-scroll" style={{ maxHeight: 200, marginBottom: 12, maxWidth: "100%", overflowX: "auto" }}>
                  <table className="ops-table" style={{ fontSize: 11.5, minWidth: "100%" }}>
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
                      {selectedBooking.passengers.map((p, pIdx) => {
                        const pId = p.id || `pax-${pIdx}`;
                        const cleanStr = (v) => (v && typeof v === "string" && v.replace(/[\s\u00A0\u200B]+/g, "").length > 0 && !v.toLowerCase().includes("undefined") && !v.toLowerCase().includes("null") && !v.toLowerCase().includes("[object object]")) ? v.trim() : null;
                        const extractSeat = (s) => {
                          if (!s || s === "--") return null;
                          if (typeof s === "string") {
                            const str = s.trim();
                            return (str && str !== "--" && !str.toLowerCase().includes("undefined") && !str.toLowerCase().includes("null") && !str.toLowerCase().includes("[object")) ? str : null;
                          }
                          if (typeof s === "object") return extractSeat(s.seatNumber || s.SeatNumber || s.label || s.Label || s.code || s.Code || s.seat || s.Seat || s.seatNo || s.SeatNo || s.assignedSeat || s.AssignedSeat);
                          return String(s);
                        };

                        const displayName =
                          cleanStr(p.fullName) ||
                          cleanStr(p.FullName) ||
                          cleanStr(p.name) ||
                          cleanStr(p.Name) ||
                          cleanStr(p.passengerName) ||
                          cleanStr([p.title, p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ")) ||
                          cleanStr(selectedBooking.passengerName) ||
                          `Passenger ${pIdx + 1}`;

                        let displaySeat =
                          extractSeat(Array.isArray(p.seatDynamic) ? p.seatDynamic.join(", ") : null) ||
                          extractSeat(p.seatNumber || p.SeatNumber || p.seat || p.Seat || p.seatLabel || p.seatNo || p.seatCode || p.assignedSeat || p.AssignedSeat) ||
                          extractSeat(Array.isArray(selectedBooking.selectedSeats) ? selectedBooking.selectedSeats[pIdx] : null) ||
                          extractSeat(Array.isArray(selectedBooking.seats) ? selectedBooking.seats[pIdx] : null) ||
                          extractSeat(Array.isArray(selectedBooking.seatNumbers) ? selectedBooking.seatNumbers[pIdx] : null) ||
                          extractSeat(selectedBooking.seatNumber || selectedBooking.SeatNumber || selectedBooking.seat || selectedBooking.seatNo) ||
                          "--";

                        return (
                          <tr key={pId} style={{ opacity: p.isCancelled ? 0.6 : 1 }}>
                            <td>
                              {!p.isCancelled && (
                                <input
                                  type="checkbox"
                                  checked={selectedPassengerIds.includes(p.id || pId)}
                                  onChange={(e) => {
                                    const targetId = p.id || pId;
                                    if (e.target.checked) {
                                      setSelectedPassengerIds([...selectedPassengerIds, targetId]);
                                    } else {
                                      setSelectedPassengerIds(selectedPassengerIds.filter(id => id !== targetId));
                                    }
                                  }}
                                />
                              )}
                            </td>
                            <td style={{ textDecoration: p.isCancelled ? "line-through" : "none", fontWeight: 600, color: "#1f2a44" }}>
                              {displayName}
                            </td>
                            <td style={{ fontWeight: 600, color: displaySeat !== "--" ? "#2563eb" : "#64748b" }}>
                              {displaySeat}
                            </td>
                            <td>{p.age > 0 ? `${p.age} / ` : ""}{p.gender || "Male"}</td>
                            <td>
                              {p.isCancelled ? (
                                <span className="status-badge danger" style={{ fontSize: 9, padding: "2px 6px" }}>Cancelled</span>
                              ) : (
                                <span className="status-badge success" style={{ fontSize: 9, padding: "2px 6px" }}>Active</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(selectedLegIndexes.length > 0 || selectedPassengerIds.length > 0) && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 14, marginTop: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#991b1b" }}>
                        ⚠️ Selected Items for Partial Cancellation:
                      </div>
                      <div style={{ fontSize: 11.5, color: "#7f1d1d" }}>
                        {selectedLegIndexes.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <strong>Flight Legs ({selectedLegIndexes.length}):</strong>{" "}
                            {selectedLegIndexes.map(idx => {
                              const s = selectedBooking.segments?.[idx];
                              return s ? `${s.fromCity} → ${s.toCity}` : `Leg ${idx + 1}`;
                            }).join(", ")}
                          </div>
                        )}
                        {selectedPassengerIds.length > 0 && (
                          <div>
                            <strong>Passengers ({selectedPassengerIds.length}):</strong> {selectedPassengerIds.length} selected
                          </div>
                        )}
                      </div>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#4b5563" }}>
                        Cancellation Reason:
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="e.g. Flight leg schedule change"
                          style={{ width: "100%", padding: "6px 10px", marginTop: 4, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 11.5 }}
                        />
                      </label>
                      <button
                        type="button"
                        className="ops-icon-btn primary"
                        style={{ padding: "8px 16px", background: "#dc1e26", color: "#ffffff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11.5, alignSelf: "flex-end" }}
                        onClick={handleCancelPartialSelection}
                        disabled={isCancellingPassengers}
                      >
                        {isCancellingPassengers ? "Processing Cancellation..." : "Cancel Selected Legs / Passengers"}
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
          setCancelModalBooking(null);
        }}
        onConfirm={handleCancelBooking}
        title="Cancel Flight Booking"
        message={`Are you sure you want to cancel flight booking ${cancelModalBooking?.bookingReference || cancelModalBooking?.bookingId || ""}?`}
        isLoadingCharges={isFetchingCharges}
        cancellationDetails={cancelCharges}
      />
    </div>
  );
}
