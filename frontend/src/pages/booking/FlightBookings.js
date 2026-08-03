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
  getFlightBookingById,
  listFlightBookings,
  sendChangeRequest,
  getCancelStatus
} from "../../services/flightBookingService";
import "../../STYLES/FlightOpsDashboard.css";
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
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingPassengers, setIsCancellingPassengers] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

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

  const handleCancelSelectedPassengers = async () => {
    if (selectedPassengerIds.length === 0) return;

    setIsCancellingPassengers(true);
    setErrorMessage("");
    setActionMessage("");

    try {
      const ticketsToCancel = (selectedBooking.passengers || [])
        .filter(p => selectedPassengerIds.includes(p.id))
        .map(p => {
          const name = p.name || p.fullName || "Passenger";
          const parts = name.trim().split(/\s+/);
          return { TicketId: selectedBooking.pnr || selectedBooking.bookingId, FirstName: parts[0] || "Passenger", LastName: parts.slice(1).join(" ") || "User" };
        });

      if (ticketsToCancel.length === 0) {
        throw new Error("No valid passenger details found for cancellation.");
      }

      const changeRes = await sendChangeRequest({
        bookingId: String(selectedBooking.bookingId),
        pnr: selectedBooking.pnr || selectedBooking.bookingId,
        requestType: 2, // Partial Cancellation
        cancellationType: 2, 
        remarks: cancelReason || "User request for partial cancellation",
        sectors: [{ Origin: selectedBooking.fromCity, Destination: selectedBooking.toCity }],
        ticketData: ticketsToCancel,
        srdvType: selectedBooking.srdvType || "MixAPI",
        srdvIndex: selectedBooking.srdvIndex || "2"
      });

      if (changeRes?.error) {
        throw new Error(changeRes.error.errorMessage || changeRes.error);
      }
      const changeRequestId = changeRes?.changeRequestId || changeRes?.ChangeRequestId;
      
      if (!changeRequestId || changeRequestId === 0) {
        throw new Error("Change Request ID not returned by SRDV.");
      }

      let finalStatus = "Pending";
      let attempts = 0;
      while (attempts < 4) {
        const statusRes = await getCancelStatus({ changeRequestId, srdvType: selectedBooking.srdvType || "MixAPI" });
        if (statusRes?.changeRequestStatus === 3 || statusRes?.ChangeRequestStatus === 3 || statusRes?.refundStatus === "Processed") {
          finalStatus = "Processed";
          break;
        }
        if (statusRes?.error) {
           break;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
      }

      setSelectedBooking({ ...selectedBooking });
      setSelectedPassengerIds([]);
      setCancelReason("");
      setActionMessage(`Selected passengers cancellation requested. Status: ${finalStatus}`);
      await fetchBookings();
    } catch (error) {
      setErrorMessage(error.message || "Failed to cancel selected passengers.");
    } finally {
      setIsCancellingPassengers(false);
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
                      <strong>
                        {booking.fromCity} to {booking.toCity}
                      </strong>
                      <small>{booking.providerName || booking.travelClass || "--"}</small>
                    </td>
                    <td>
                      <strong>{formatDateTime(booking.departureTimeUtc)}</strong>
                    </td>
                    <td>
                      <strong>{booking.seatsBooked || "--"}</strong>
                      <small>{booking.tripNumber || booking.travelClass || "--"}</small>
                    </td>
                    <td>
                      <strong>{formatCurrency(booking.totalPriceInr)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClassName(booking.status)}`}>
                        {booking.status}
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
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Flight Booking Details</h3>
              <button type="button" onClick={() => { setSelectedBooking(null); setSelectedPassengerIds([]); setCancelReason(""); }}>
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
            </div>

            {selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
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
                                    setSelectedPassengerIds(selectedPassengerIds.filter(id => id !== p.id));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td style={{ textDecoration: p.isCancelled ? "line-through" : "none" }}>
                            {p.fullName}
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
    </div>
  );
}
