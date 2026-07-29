/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import "./BusCancellationList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import { getCancellationReports, listAdminBusBookings } from "../../../services/adminBusService";
import AdminPagination from "../../../components/AdminPagination";

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
        "ContactNumber",
        "contactPhone",
        "ContactPhone",
        "mobileNo",
        "MobileNo"
      ], "") ||
      pickFirst(record?.contact, ["phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo"], "") ||
      pickFirst(passengersRaw?.[0], ["passengerPhone", "passengerPhoneNo", "phone", "Phone", "mobile", "Mobile", "phoneNumber", "PhoneNumber", "phoneNo", "PhoneNo", "mobileNo", "MobileNo"], "")
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
  const bookedAtValue = pickFirst(record, [
    "bookedAtUtc", "BookedAtUtc", "bookedAt", "BookedAt",
    "createdAt", "CreatedAt", "createdDate", "CreatedDate",
    "createdDateUtc", "CreatedDateUtc", "cancelledDateUtc",
    "CancelledDateUtc", "cancelledAtUtc", "CancelledAtUtc",
    "cancelledAt", "CancelledAt", "timestamp", "Timestamp"
  ], null);
  const departureValue = pickFirst(record, [
    "departureTimeUtc", "DepartureTimeUtc", "departureTime", "DepartureTime",
    "journeyDateIst", "JourneyDateIst", "departureDateTimeUtc", "DepartureDateTimeUtc",
    "departureDateTime", "DepartureDateTime", "journeyDateTime", "JourneyDateTime",
    "journeyDate", "JourneyDate", "departDate", "DepartDate",
    "journeyTime", "JourneyTime"
  ], null);
  const arrivalValue = pickFirst(record, [
    "arrivalTimeUtc", "ArrivalTimeUtc", "arrivalTime", "ArrivalTime",
    "arrivalDateTimeUtc", "ArrivalDateTimeUtc", "arrivalDateTime", "ArrivalDateTime",
    "droppingTime", "DroppingTime", "dropTime", "DropTime"
  ], null);

  const depTime = toTimeKey(departureValue);
  const arrTime = toTimeKey(arrivalValue);
  const journeyTime = depTime && arrTime ? `${depTime} - ${arrTime}` : (depTime || arrTime || "--");

  const fare = Math.max(parseNumber(record?.totalPriceInr ?? record?.amountInr, 0), 0);
  const inferredProfit = Math.round(fare * 0.04);
  const profit = parseNumber(record?.profit, inferredProfit);

  const rawPayload = record?.raw || record || {};
  const rawPaymentMethod = rawPayload?.paymentMethod || rawPayload?.paymentType || rawPayload?.gatewayName || rawPayload?.paymentMode || "--";
  const rawPaymentDetails = rawPayload?.paymentDetails || rawPayload?.transactionId || rawPayload?.txnId || rawPayload?.paymentId || "--";
  const initialPaymentStatus = rawPayload?.paymentStatus || (mapAdminStatusClass(record?.status) === "cancelled" ? "Completed" : "Pending");

  // Get fromCity and toCity safely
  const fromCity = record?.fromCity || rawPayload?.fromCity || rawPayload?.source || rawPayload?.sourceCity || "--";
  const toCity = record?.toCity || rawPayload?.toCity || rawPayload?.destination || rawPayload?.destinationCity || "--";

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
    paymentMethod: rawPaymentMethod,
    paymentDetails: rawPaymentDetails,
    paymentStatus: initialPaymentStatus,
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const handleUpdatePaymentStatus = (id, newStatus) => {
    setCancellationBookings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, paymentStatus: newStatus } : item))
    );
    if (selectedCancellation && selectedCancellation.id === id) {
      setSelectedCancellation((prev) => ({ ...prev, paymentStatus: newStatus }));
    }
  };

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

  // Compute pagination limits
  const totalPages = Math.ceil(filteredCancellations.length / itemsPerPage) || 1;
  const paginatedCancellations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCancellations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCancellations, currentPage, itemsPerPage]);

  const handleFilterChange = (field, value) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = [
      "bookingId",
      "bookingReference",
      "tripType",
      "pnr",
      "createdAt",
      "passengerName",
      "passengerPhone",
      "segmentFrom",
      "segmentTo",
      "journeyDate",
      "journeyTime",
      "operator",
      "vehicleType",
      "fare",
      "profit",
      "cancellationCharges",
      "refundAmount",
      "paymentMethod",
      "paymentDetails",
      "paymentStatus",
      "reason",
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredCancellations.map((booking) => [
      booking.bookingId,
      booking.bookingReference,
      booking.tripType,
      booking.pnr,
      booking.createdAt,
      booking.passengerName,
      booking.passengerPhone,
      booking.from,
      booking.to,
      booking.journeyDate,
      booking.journeyTime,
      booking.operator,
      booking.vehicleType,
      booking.fare,
      booking.profit,
      booking.cancellationCharge,
      booking.refundAmount,
      booking.paymentMethod,
      booking.paymentDetails,
      booking.paymentStatus,
      booking.cancellationReason,
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `admin-b2c-bus-cancellations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-cancel-page" style={{ padding: "28px 32px", fontFamily: "'Inter', sans-serif" }}>
      <header className="admin-b2c-header admin-cancel-header" style={{ marginBottom: "5px" }}>
        <h1 style={{ fontWeight: 700, margin: 0, fontSize: "1.85rem" }}>
          <span style={{ color: "#be185d" }}>B2C Bus </span>
          <span style={{ color: "black" }}>Cancellation List</span>
        </h1>
      </header>

      {/* Toolbar controls */}
      <div className="admin-toolbar-row admin-cancel-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip admin-cancel-chip" style={{ color: "#be185d", borderColor: "#be185d", backgroundColor: "rgba(190, 24, 93, 0.05)", fontWeight: "600", padding: "6px 14px", borderRadius: "100px", fontSize: "0.85rem" }}>
            Cancelled Records: {filteredCancellations.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #be185d",
              background: "#be185d",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {isFiltersOpen ? "Hide Filter" : "Filter"}
          </button>
          <button
            type="button"
            className="admin-cancel-clear-btn"
            onClick={clearFilters}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid var(--border, #cbd5e1)",
              background: "transparent",
              color: "var(--text-secondary, #475569)",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Clear Filter
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Export
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: "red", padding: "10px", marginBottom: "15px", border: "1px solid red", borderRadius: "8px", background: "#fef2f2" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Filters options panel */}
      {isFiltersOpen && (
        <section className="flight-ops-filters admin-ops-filters admin-cancel-filters" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>ID</span>
            <input
              type="text"
              placeholder="Search by booking id"
              value={draftFilters.bookingId}
              onChange={(e) => handleFilterChange("bookingId", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>PNR</span>
            <input
              type="text"
              placeholder="Search by PNR"
              value={draftFilters.pnr}
              onChange={(e) => handleFilterChange("pnr", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Passenger Name</span>
            <input
              type="text"
              placeholder="Search by passenger"
              value={draftFilters.passengerName}
              onChange={(e) => handleFilterChange("passengerName", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Passenger Mobile</span>
            <input
              type="text"
              placeholder="Search by mobile"
              value={draftFilters.passengerPhone}
              onChange={(e) => handleFilterChange("passengerPhone", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none" }}
            />
          </label>

          <div className="filters-actions admin-cancel-filter-actions" style={{ gridColumn: "span 4", display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="primary"
              onClick={applyFilters}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "none", backgroundColor: "#be185d", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
            >
              Apply Filter
            </button>
            <button
              type="button"
              className="secondary"
              onClick={clearFilters}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer" }}
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {/* Grid Table Card-Rows */}
      <section className="admin-cancel-table-shell">
        <header className="admin-cancel-table-head" style={{ gridTemplateColumns: "1fr 1.2fr 1.5fr 1.2fr 1fr 1.2fr 1fr 0.8fr" }}>
          <span>ID</span>
          <span>PNR / Date</span>
          <span>Segment / Journey</span>
          <span>Passenger Name</span>
          <span>Amount</span>
          <span>Payment Info</span>
          <span>Payment Status</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-cancel-empty">Loading cancellation records...</div>
        ) : filteredCancellations.length ? (
          <div className="admin-cancel-table-body">
            {paginatedCancellations.map((booking) => (
              <article key={booking.id} className="admin-cancel-table-row" style={{ gridTemplateColumns: "1fr 1.2fr 1.5fr 1.2fr 1fr 1.2fr 1fr 0.8fr" }}>
                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.id)}</strong>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(booking.pnr)}</strong>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">📅</span>
                    <span>{booking.createdAt}</span>
                  </div>
                </div>

                <div className="admin-cancel-cell">
                  <div className="admin-route-segment">
                    <span style={{ fontWeight: "700" }}>{booking.from} to {booking.to}</span>
                  </div>
                  <div className="admin-date-badge">
                    <span className="admin-calendar-emoji">📅</span>
                    <span>{booking.journeyDate} | {booking.journeyTime}</span>
                  </div>
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
                  <strong>Method:</strong> {safeValue(booking.paymentMethod)}
                  <small style={{ wordBreak: "break-all" }}><strong>Txn:</strong> {safeValue(booking.paymentDetails)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <select
                    value={booking.paymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(booking.id, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      backgroundColor: booking.paymentStatus === "Completed" ? "#ecfdf5" : "#fffbeb",
                      color: booking.paymentStatus === "Completed" ? "#10b981" : "#d97706",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => setSelectedCancellation(booking)}
                    style={{
                      backgroundColor: "#be185d",
                      borderColor: "#be185d",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 16px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
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

        {filteredCancellations.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredCancellations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="cancellations"
          />
        )}
      </section>

      {/* View Detail Backdrop Modal */}
      {selectedCancellation && (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)} style={{ zIndex: 1000 }}>
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
                <span>Trip segment</span>
                <strong>{safeValue(selectedCancellation.from)} to {safeValue(selectedCancellation.to)}</strong>
              </div>
              <div>
                <span>Passenger Phone</span>
                <strong>{safeValue(selectedCancellation.passengerPhone)}</strong>
              </div>
              <div>
                <span>Booking Reference</span>
                <strong>{safeValue(selectedCancellation.bookingReference)}</strong>
              </div>
              <div>
                <span>Journey Date</span>
                <strong>{safeValue(selectedCancellation.journeyDate)} | {safeValue(selectedCancellation.journeyTime)}</strong>
              </div>
              <div>
                <span>Operator</span>
                <strong>{safeValue(selectedCancellation.operator)}</strong>
              </div>
              <div>
                <span>Travel Class</span>
                <strong>{safeValue(selectedCancellation.vehicleType)}</strong>
              </div>
              <div>
                <span>Cancellation Reason</span>
                <strong>{selectedCancellation.cancellationReason || "No reason given"}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{safeValue(selectedCancellation.paymentMethod)}</strong>
              </div>
              <div>
                <span>Payment Details (Txn)</span>
                <strong>{safeValue(selectedCancellation.paymentDetails)}</strong>
              </div>
              <div>
                <span>Payment Status</span>
                <select
                  value={selectedCancellation.paymentStatus}
                  onChange={(e) => handleUpdatePaymentStatus(selectedCancellation.id, e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1.5px solid var(--border)",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
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
      )}
    </section>
  );
}
