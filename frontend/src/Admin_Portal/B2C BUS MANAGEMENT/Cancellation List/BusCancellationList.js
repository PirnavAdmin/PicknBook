import React, { useEffect, useMemo, useState } from "react";
import "./BusCancellationList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import { getCancellationReports, listAdminBusBookings } from "../../../services/adminBusService";

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_FILTERS = {
  bookingId: "",
  pnr: "",
  passengerName: "",
  passengerPhone: "",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

function shouldUseFallbackBusBookings(error) {
  const message = String(error?.message || "").toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("cannot get /api/busbookings") ||
    message.includes("cannot get /api/admin/bus/bookings/all") ||
    message.includes("err_ngrok_3200") ||
    (message.includes("endpoint") && message.includes("offline")) ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

const toDateKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();

  // 1. Try to match YYYY-MM-DD directly
  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  // 2. Try to parse with standard Date but don't convert to ISO if it shifts
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    // Fallback: slice first 10 chars
    return normalizeText(value, "").slice(0, 10);
  }

  // To avoid timezone shifting, format in local timezone parts
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function pickFirst(source, keys, fallback = null) {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return fallback;
}

function normalizeBusPassenger(passenger, index = 0) {
  return {
    fullName: String(
      pickFirst(
        passenger,
        ["fullName", "FullName", "name", "Name"],
        `Passenger ${index + 1}`
      )
    ),
    gender: String(pickFirst(passenger, ["gender", "Gender"], "")),
    seatNumber: pickFirst(passenger, ["seatNumber", "SeatNumber"], null),
  };
}

function normalizeBusBookingRecord(record) {
  const passengersRaw = pickFirst(record, ["passengers", "Passengers"], []);
  const passengers = Array.isArray(passengersRaw)
    ? passengersRaw.map((passenger, index) =>
        normalizeBusPassenger(passenger, index)
      )
    : [];
  const seatsBookedFallback = passengers.length;

  // Define potential nested structures to search for fields
  const sources = [
    record,
    record?.bus,
    record?.busDetails,
    record?.ticket,
    record?.trip,
    record?.journey,
    record?.raw,
    record?.bookingDetails,
    record?.details,
    record?.ticketDetails,
  ].filter(Boolean);

  const getFieldValue = (keys, fallback = "") => {
    for (const source of sources) {
      const val = pickFirst(source, keys, null);
      if (val !== undefined && val !== null && val !== "") {
        return val;
      }
    }
    return fallback;
  };

  // Dynamically resolve segment, fromCity, and toCity
  const rawSegment = getFieldValue(["segment", "Segment", "route", "Route"], null);
  let fromCity = "";
  let toCity = "";
  let segment = "";

  if (rawSegment) {
    segment = String(rawSegment).trim();
    const parts = segment.split(/[-–]| to /i);
    if (parts.length === 2) {
      fromCity = parts[0].trim();
      toCity = parts[1].trim();
    }
  }

  if (!fromCity) {
    fromCity = String(
      getFieldValue(
        [
          "fromCity",
          "FromCity",
          "source",
          "Source",
          "from",
          "From",
          "origin",
          "Origin",
          "sourceCity",
          "SourceCity",
        ],
        ""
      )
    ).trim();
  }

  if (!toCity) {
    toCity = String(
      getFieldValue(
        [
          "toCity",
          "ToCity",
          "destination",
          "Destination",
          "to",
          "To",
          "arrivalCity",
          "ArrivalCity",
          "destinationCity",
          "DestinationCity",
        ],
        ""
      )
    ).trim();
  }

  if (!segment && fromCity && toCity) {
    segment = `${fromCity} - ${toCity}`;
  }

  // Resolve departure date/time
  const departureTimeUtc = getFieldValue(
    [
      "departureTimeUtc",
      "DepartureTimeUtc",
      "departureDateTimeUtc",
      "DepartureDateTimeUtc",
      "departureTimeIst",
      "DepartureTimeIst",
      "departureTime",
      "DepartureTime",
      "departureDateTime",
      "DepartureDateTime",
      "journeyDateTime",
      "JourneyDateTime",
      "journeyDate",
      "JourneyDate",
      "departDate",
      "DepartDate",
    ],
    null
  );

  return {
    bookingId: getFieldValue(["bookingId", "BookingId"], null),
    bookingReference: String(
      getFieldValue(["bookingReference", "BookingReference"], "")
    ),
    tripType: String(getFieldValue(["tripType", "TripType"], "Bus")),
    tripId: getFieldValue(["tripId", "TripId"], null),
    passengerName: String(
      getFieldValue(["passengerName", "PassengerName"], "")
    ),
    passengerPhone: String(
      getFieldValue([
        "passengerPhone",
        "PassengerPhone",
        "phone",
        "Phone",
        "mobile",
        "Mobile",
        "phoneNumber",
        "PhoneNumber",
        "phoneNo",
        "PhoneNo",
        "contactNumber",
        "ContactNumber"
      ], "") ||
      pickFirst(record?.contact, ["phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo"], "")
    ),
    passengerEmail: String(
      getFieldValue(["passengerEmail", "PassengerEmail"], "")
    ),
    fromCity,
    toCity,
    segment,
    providerName: String(
      getFieldValue(
        [
          "providerName",
          "ProviderName",
          "operatorName",
          "OperatorName",
          "operator",
          "Operator",
        ],
        ""
      )
    ),
    departureTimeUtc,
    arrivalTimeUtc: getFieldValue(
      [
        "arrivalTimeUtc",
        "ArrivalTimeUtc",
        "arrivalDateTimeUtc",
        "ArrivalDateTimeUtc",
        "arrivalTimeIst",
        "ArrivalTimeIst",
        "arrivalTime",
        "ArrivalTime",
        "arrivalDateTime",
        "ArrivalDateTime",
        "dropTime",
        "DropTime",
        "droppingTime",
        "DroppingTime",
      ],
      null
    ),
    travelClass: String(
      getFieldValue(
        [
          "travelClass",
          "TravelClass",
          "busType",
          "BusType",
          "className",
          "ClassName",
          "class",
          "Class",
          "vehicleType",
          "VehicleType",
        ],
        "Not Applicable"
      )
    ),
    adults: Number(getFieldValue(["adults", "Adults"], 0)) || 0,
    children: Number(getFieldValue(["children", "Children"], 0)) || 0,
    infants: Number(getFieldValue(["infants", "Infants"], 0)) || 0,
    seatsBooked:
      Number(getFieldValue(["seatsBooked", "SeatsBooked", "seats", "Seats"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(
        getFieldValue(
          [
            "totalPriceInr",
            "TotalPriceInr",
            "totalPaid",
            "TotalPaid",
            "totalFare",
            "TotalFare",
            "amountInr",
            "AmountInr",
            "amount",
            "Amount",
            "fare",
            "Fare",
          ],
          0
        )
      ) || 0,
    status: String(getFieldValue(["status", "Status"], "Unknown") || "Unknown"),
    bookedAtUtc: getFieldValue(
      [
        "bookedAtUtc",
        "BookedAtUtc",
        "bookedAt",
        "BookedAt",
        "createdAt",
        "CreatedAt",
        "createdDate",
        "CreatedDate",
        "createdDateUtc",
        "CreatedDateUtc",
        "timestamp",
        "Timestamp",
      ],
      null
    ),
    cancelledAtUtc: getFieldValue(
      [
        "cancelledAtUtc",
        "CancelledAtUtc",
        "cancelledAt",
        "CancelledAt",
        "cancelledDateUtc",
        "CancelledDateUtc",
      ],
      null
    ),
    cancellationReason: String(
      getFieldValue(["cancellationReason", "CancellationReason", "reason", "Reason"], "")
    ),
    tripNumber: String(
      getFieldValue(
        [
          "tripNumber",
          "TripNumber",
          "busNumber",
          "BusNumber",
          "busNo",
          "BusNo",
        ],
        ""
      )
    ),
    passengers,
  };
}

const parseNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toTimeKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();

  // 1. Try regex match for HH:MM (e.g. 15:30)
  const timeMatch = raw.match(/(?:T|\s|^)(\d{1,2}:\d{2})/);
  if (timeMatch?.[1]) {
    // Pad single-digit hours if any, like "5:30" -> "05:30"
    const [h, m] = timeMatch[1].split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const text = normalizeText(value, "");
    if (text.includes("T")) {
      return text.split("T")[1]?.slice(0, 5) || "";
    }
    return text.slice(11, 16);
  }

  // Format local parts to avoid timezone shifting
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const BOOKED_STATUS_SET = new Set(["booked", "success", "confirmed", "ticketed"]);
const PENDING_STATUS_SET = new Set(["pending", "onhold", "processing"]);
const CANCELLED_STATUS_SET = new Set(["cancelled", "canceled"]);

const toAdminStatusLabel = (statusValue) => {
  const normalized = normalizeText(statusValue, "Unknown");
  const key = normalized.toLowerCase();

  if (CANCELLED_STATUS_SET.has(key)) {
    return "Cancelled";
  }

  if (PENDING_STATUS_SET.has(key)) {
    return "Pending";
  }

  if (BOOKED_STATUS_SET.has(key)) {
    return "Booked";
  }

  return normalized;
};

const mapAdminStatusClass = (statusValue) => {
  const key = normalizeText(statusValue, "").toLowerCase();

  if (CANCELLED_STATUS_SET.has(key)) {
    return "cancelled";
  }

  if (PENDING_STATUS_SET.has(key)) {
    return "pending";
  }

  if (BOOKED_STATUS_SET.has(key)) {
    return "success";
  }

  return "pending";
};

const toUnifiedAdminBooking = (record, sourceType) => {
  const safeSourceType = normalizeText(sourceType, "Bus");
  const status = toAdminStatusLabel(record?.status);
  const bookingReference = normalizeText(record?.bookingReference || record?.pnr, "");
  const bookingId = normalizeText(record?.bookingId || record?.id, "");
  const tripNumber = normalizeText(record?.tripNumber || record?.pnr, "");
  const bookedAtValue = record?.bookedAtUtc || record?.cancelledDateUtc || null;
  const departureValue = record?.departureTimeUtc || record?.journeyDateIst || null;
  const arrivalValue = record?.arrivalTimeUtc || record?.arrivalTime || record?.arrivalDateTime || record?.droppingTime || record?.dropTime || null;

  const depTime = toTimeKey(departureValue);
  const arrTime = toTimeKey(arrivalValue);
  const journeyTime = depTime && arrTime ? `${depTime} - ${arrTime}` : (depTime || arrTime || "--");

  const fare = Math.max(parseNumber(record?.totalPriceInr ?? record?.amountInr, 0), 0);
  const inferredProfit = Math.round(fare * 0.04);
  const profit = parseNumber(record?.profit, inferredProfit);

  let fromCity = record?.fromCity || "";
  let toCity = record?.toCity || "";
  if (record?.segment && (!fromCity || !toCity)) {
    const parts = record.segment.split("-");
    if (parts.length === 2) {
      fromCity = parts[0].trim();
      toCity = parts[1].trim();
    } else {
      fromCity = record.segment;
    }
  }

  return {
    id: bookingReference || bookingId || "--",
    bookingId,
    bookingReference,
    tripType: safeSourceType,
    createdAt: toDateKey(bookedAtValue),
    createdAtValue: bookedAtValue,
    passengerName: normalizeText(record?.passengerName, "--"),
    passengerPhone: normalizeText(record?.passengerPhone, "--"),
    from: normalizeText(fromCity, "--"),
    to: normalizeText(toCity, "--"),
    journeyDate: toDateKey(departureValue),
    journeyTime,
    pnr: bookingReference || tripNumber || bookingId || "--",
    status,
    operator: normalizeText(record?.providerName, "--"),
    vehicleType: normalizeText(record?.travelClass, safeSourceType),
    fare,
    profit,
    cancellationReason: normalizeText(record?.cancellationReason, ""),
    cancelledAtValue: record?.cancelledAtUtc || record?.cancelledDateUtc || null,
    raw: record,
  };
};

const toCancellationRecord = (unifiedBooking) => {
  const fare = Math.max(parseNumber(unifiedBooking?.fare, 0), 0);
  const raw = unifiedBooking?.raw || {};

  const cancellationChargeRaw = parseNumber(
    raw.cancellationCharge ?? raw.CancellationCharge ?? raw.cancellationChargeInr,
    Number.NaN
  );
  const refundAmountRaw = parseNumber(
    raw.refundAmount ?? raw.RefundAmount ?? raw.refundAmountInr,
    Number.NaN
  );

  const cancellationCharge = Number.isFinite(cancellationChargeRaw)
    ? Math.max(cancellationChargeRaw, 0)
    : Math.round(fare * 0.18);

  const refundAmount = Number.isFinite(refundAmountRaw)
    ? Math.max(refundAmountRaw, 0)
    : Math.max(fare - cancellationCharge, 0);

  return {
    ...unifiedBooking,
    cancellationCharge,
    refundAmount,
  };
};

const toNumberDate = (value) => {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export default function AdminCancellationListPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [selectedCancellation, setSelectedCancellation] = useState(null);
  const [cancellationBookings, setCancellationBookings] = useAdminList(
    "b2c-cancellation-bookings",
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCancellationBookings(activeFilters) {
      setIsLoading(true);
      setErrorMessage("");

      const passengerPhone = String(activeFilters.passengerPhone || "").trim() || undefined;

      try {
        let rawResults = [];
        try {
          const reports = await getCancellationReports();
          if (Array.isArray(reports)) {
            rawResults = reports;
          }
        } catch (apiError) {
          console.warn("getCancellationReports failed, falling back to full bookings query:", apiError.message);
          let rawBookings = [];
          try {
            rawBookings = await listAdminBusBookings({ passengerPhone, status: "Cancelled" });
          } catch (listError) {
            if (shouldUseFallbackBusBookings(listError)) {
              rawBookings = [];
            } else {
              throw listError;
            }
          }
          rawResults = Array.isArray(rawBookings)
            ? rawBookings.map((record) => normalizeBusBookingRecord(record))
            : [];
        }

        const merged = rawResults
          .map((record) => toUnifiedAdminBooking(record, "Bus"))
          .filter((record) => mapAdminStatusClass(record.status) === "cancelled")
          .map((record) => toCancellationRecord(record))
          .sort((first, second) => {
            const firstTime = toNumberDate(first.cancelledAtValue || first.createdAtValue || first.createdAt);
            const secondTime = toNumberDate(second.cancelledAtValue || second.createdAtValue || second.createdAt);
            return secondTime - firstTime;
          });

        setCancellationBookings(merged);
      } catch (error) {
        setErrorMessage(error?.message || "Unable to load cancellation bookings.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCancellationBookings(filters);
  }, [filters, setCancellationBookings]);

  const filteredCancellations = useMemo(() => {
    return cancellationBookings.filter((booking) => {
      if (filters.bookingId) {
        const idQuery = filters.bookingId.toLowerCase();
        if (!String(booking.id || "").toLowerCase().includes(idQuery)) {
          return false;
        }
      }

      if (filters.pnr) {
        const pnrQuery = filters.pnr.toLowerCase();
        if (!String(booking.pnr || "").toLowerCase().includes(pnrQuery)) {
          return false;
        }
      }

      if (filters.passengerName) {
        const passengerQuery = filters.passengerName.toLowerCase();
        if (!String(booking.passengerName || "").toLowerCase().includes(passengerQuery)) {
          return false;
        }
      }

      if (filters.passengerPhone) {
        if (!String(booking.passengerPhone || "").includes(filters.passengerPhone)) {
          return false;
        }
      }

      return true;
    });
  }, [cancellationBookings, filters]);

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
  };

  const handleExport = () => {
    const headers = [
      "Trip Type",
      "ID",
      "PNR",
      "Date",
      "From",
      "To",
      "Journey Date",
      "Journey Time",
      "Passenger Name",
      "Passenger Phone",
      "Cancellation Charge",
      "Refund Amount",
      "Status",
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredCancellations.map((booking) => [
      booking.tripType,
      booking.id,
      booking.pnr,
      booking.createdAt,
      booking.from,
      booking.to,
      booking.journeyDate,
      booking.journeyTime,
      booking.passengerName,
      booking.passengerPhone,
      booking.cancellationCharge,
      booking.refundAmount,
      booking.status,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-bus-cancellations.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-b2c-page admin-cancel-page">
      <header className="admin-b2c-header admin-cancel-header">
        <h1>B2C Bus Cancellation List</h1>
      </header>

      <div className="admin-toolbar-row admin-cancel-toolbar">
        <div className="admin-chip-row">
          <span className="admin-chip admin-cancel-chip">
            Cancelled Records: {filteredCancellations.length}
          </span>
        </div>

        <div className="admin-actions-row">
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Hide Filter" : "Filter"}
          </button>
          <button type="button" className="admin-cancel-clear-btn" onClick={clearFilters}>
            Clear Filter
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters admin-cancel-filters">
          <label>
            <span>ID</span>
            <input
              type="text"
              placeholder="Search by booking id"
              value={draftFilters.bookingId}
              onChange={(event) => handleFilterChange("bookingId", event.target.value)}
            />
          </label>
          <label>
            <span>PNR</span>
            <input
              type="text"
              placeholder="Search by PNR"
              value={draftFilters.pnr}
              onChange={(event) => handleFilterChange("pnr", event.target.value)}
            />
          </label>
          <label>
            <span>Passenger Name</span>
            <input
              type="text"
              placeholder="Search by passenger"
              value={draftFilters.passengerName}
              onChange={(event) => handleFilterChange("passengerName", event.target.value)}
            />
          </label>
          <label>
            <span>Passenger Phone</span>
            <input
              type="text"
              placeholder="Search by mobile"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleFilterChange("passengerPhone", event.target.value)}
            />
          </label>

          <div className="filters-actions admin-cancel-filter-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Reset
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-cancel-table-shell">
        <header className="admin-cancel-table-head">
          <span>ID</span>
          <span>PNR / Date</span>
          <span>Segment / Journey</span>
          <span>Passenger Name</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : filteredCancellations.length ? (
          <div className="admin-cancel-table-body">
            {filteredCancellations.map((booking) => (
              <article key={`${booking.tripType}-${booking.id}-${booking.createdAt}`} className="admin-cancel-table-row">
                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.id)}</strong>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.pnr)}</strong>
                  <small>{safeValue(booking.createdAt)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>
                    {safeValue(booking.from)} to {safeValue(booking.to)}
                  </strong>
                  <small>
                    {safeValue(booking.journeyDate)} | {safeValue(booking.journeyTime)}
                  </small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.passengerName)}</strong>
                  <small>{safeValue(booking.passengerPhone)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>RA {adminCurrencyFormatter.format(booking.refundAmount)}</strong>
                  <small>CC {adminCurrencyFormatter.format(booking.cancellationCharge)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <span className="admin-status-pill cancelled">Cancelled</span>
                  <small>C / R</small>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => setSelectedCancellation(booking)}
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-cancel-empty">Result Not Found.</div>
        )}

        <footer className="admin-cancel-footnote">
          <strong>CC :-</strong> Cancellation Charge, <strong>RA :-</strong> Refund Amount,
          <strong> C :-</strong> Cancel, <strong>R :-</strong> Refund.
        </footer>
      </section>

      {selectedCancellation ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Cancellation details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Cancellation Detail View</h2>
                <p className="admin-view-header-subtitle">
                  {safeValue(selectedCancellation.id)} | {safeValue(selectedCancellation.passengerName)}
                </p>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip cancelled">Cancelled</span>
                  <span className="admin-view-meta-chip">
                    RA {adminCurrencyFormatter.format(selectedCancellation.refundAmount)}
                  </span>
                  <span className="admin-view-meta-chip">
                    CC {adminCurrencyFormatter.format(selectedCancellation.cancellationCharge)}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCancellation(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Trip Type</span>
                <strong>{safeValue(selectedCancellation.tripType)}</strong>
              </div>
              <div>
                <span>Passenger Phone</span>
                <strong>{safeValue(selectedCancellation.passengerPhone)}</strong>
              </div>
              <div>
                <span>Booking ID</span>
                <strong>{safeValue(selectedCancellation.id)}</strong>
              </div>
              <div>
                <span>PNR / Date</span>
                <strong>{safeValue(selectedCancellation.pnr)}</strong>
                <small>{safeValue(selectedCancellation.createdAt)}</small>
              </div>
              <div>
                <span>Segment</span>
                <strong>
                  {safeValue(selectedCancellation.from)} to {safeValue(selectedCancellation.to)}
                </strong>
              </div>
              <div>
                <span>Journey Date & Time</span>
                <strong>
                  {safeValue(selectedCancellation.journeyDate)} | {safeValue(selectedCancellation.journeyTime)}
                </strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Refund Amount</span>
                <strong>{adminCurrencyFormatter.format(selectedCancellation.refundAmount)}</strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Cancellation Charge</span>
                <strong>{adminCurrencyFormatter.format(selectedCancellation.cancellationCharge)}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

