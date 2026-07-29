/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./BookingList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import { listAdminBusBookings } from "../../../services/adminBusService";
import AdminPagination from "../../../components/AdminPagination";

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const adminProfitFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DEFAULT_FILTERS = {
  status: "all",
  bookingReference: "",
  passengerPhone: "",
  fromDate: "",
  toDate: "",
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

function pickFinancialNumber(record, keys, fallback = 0) {
  const sources = [
    record,
    record?.fare,
    record?.pricing,
    record?.pricingPreview,
    record?.payment,
  ].filter(Boolean);

  for (const source of sources) {
    const value = pickFirst(source, keys, null);
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return fallback;
}

function sumFinancialCollection(record, collectionKeys, valueKeys) {
  for (const collectionKey of collectionKeys) {
    const collection = record?.[collectionKey];

    if (!Array.isArray(collection)) {
      continue;
    }

    return collection.reduce((sum, item) => {
      const value = pickFirst(item, valueKeys, 0);
      const numberValue = Number(value);
      return sum + (Number.isFinite(numberValue) ? numberValue : 0);
    }, 0);
  }

  return 0;
}

const getTaxableFareInr = (record) => {
  return pickFinancialNumber(
    record,
    [
      "taxableFareInr",
      "TaxableFareInr",
      "taxableFare",
      "TaxableFare",
      "fareBeforeTax",
      "FareBeforeTax",
    ],
    0
  );
};

const getNetFareInr = (record) => {
  return pickFinancialNumber(
    record,
    ["netFareInr", "NetFareInr", "netFare", "NetFare"],
    0
  );
};

const getDiscountAmountInr = (record) => {
  return pickFinancialNumber(
    record,
    [
      "discountAmountInr",
      "DiscountAmountInr",
      "discountAmount",
      "DiscountAmount",
      "discount",
      "Discount",
      "couponAmount",
      "CouponAmount"
    ],
    0
  );
};

const getBaseFareInr = (record) => {
  const directBaseFare = pickFinancialNumber(
    record,
    ["baseFareInr", "BaseFareInr", "baseFare", "BaseFare"],
    0
  );

  if (directBaseFare > 0) {
    return directBaseFare;
  }

  return sumFinancialCollection(
    record,
    ["seats", "Seats", "passengers", "Passengers"],
    ["baseFareInr", "BaseFareInr", "baseFare", "BaseFare"]
  );
};

function calculateBookingProfit(record) {
  const netFareInr = getNetFareInr(record);
  const discountAmountInr = getDiscountAmountInr(record);
  const baseFareInr = getBaseFareInr(record);

  // If netFareInr is not present or zero, fallback to taxableFareInr - baseFareInr
  if (netFareInr <= 0) {
    const taxableFareInr = getTaxableFareInr(record);
    return taxableFareInr - baseFareInr;
  }

  return (netFareInr - discountAmountInr) - baseFareInr;
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
    bookingId: getFieldValue(["bookingId", "BookingId", "id", "Id"], null),
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
    taxableFareInr: getTaxableFareInr(record),
    baseFareInr: getBaseFareInr(record),
    calculatedProfit: calculateBookingProfit(record),
    markupAmount: pickFinancialNumber(record, [
      "markupAmount",
      "MarkupAmount",
      "totalMarkupAmount",
      "TotalMarkupAmount",
      "markupAmountInr",
      "MarkupAmountInr",
    ]),
    gstAmount: pickFinancialNumber(record, [
      "gstAmount",
      "GstAmount",
      "tax",
      "Tax",
      "taxes",
      "Taxes",
      "taxAmount",
      "TaxAmount",
    ]),
    discountAmount: pickFinancialNumber(record, [
      "discount",
      "Discount",
      "discountAmount",
      "DiscountAmount",
      "couponAmount",
      "CouponAmount",
      "couponAmountInr",
      "CouponAmountInr",
      "cpnAmount",
      "CpnAmount",
    ]),
    convenienceFee: pickFinancialNumber(record, [
      "convenienceFee",
      "ConvenienceFee",
      "convenienceFeeInr",
      "ConvenienceFeeInr",
      "serviceFee",
      "ServiceFee",
      "platformFee",
      "PlatformFee",
    ]),
    profit: calculateBookingProfit(record),
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

const formatAdminDate = (dateString) => {
  if (!dateString || dateString === "--") return "--";
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const parseNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

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

const mapBookingFilterStatusToApi = (filterStatus) => {
  const key = normalizeText(filterStatus, "").toLowerCase();

  if (!key || key === "all") {
    return undefined;
  }

  if (key === "booked" || key === "success") {
    return "Booked";
  }

  if (key === "pending") {
    return "Pending";
  }

  if (key === "cancelled") {
    return "Cancelled";
  }

  return undefined;
};

const toUnifiedAdminBooking = (record, sourceType) => {
  const safeSourceType = normalizeText(sourceType, "Bus");
  const status = toAdminStatusLabel(record?.status);
  const bookingReference = normalizeText(record?.bookingReference, "");
  const bookingId = normalizeText(record?.bookingId || record?.id, "");
  const tripNumber = normalizeText(record?.tripNumber, "");
  const bookedAtValue = record?.bookedAtUtc || null;
  const departureValue = record?.departureTimeUtc || record?.departureTime || record?.departureDateTime || null;
  const arrivalValue = record?.arrivalTimeUtc || record?.arrivalTime || record?.arrivalDateTime || record?.droppingTime || record?.dropTime || null;

  const depTime = toTimeKey(departureValue);
  const arrTime = toTimeKey(arrivalValue);
  const journeyTime = depTime && arrTime ? `${depTime} - ${arrTime}` : (depTime || arrTime || "--");

  const fare = Math.max(parseNumber(record?.totalPriceInr, 0), 0);
  const calculatedProfit = parseNumber(record?.calculatedProfit, calculateBookingProfit(record));
  const profit = calculatedProfit;

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
    id: bookingId || bookingReference || "--",
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
    taxableFareInr: parseNumber(record?.taxableFareInr, 0),
    baseFareInr: parseNumber(record?.baseFareInr, 0),
    calculatedProfit,
    profit,
    cancellationReason: normalizeText(record?.cancellationReason, ""),
    cancelledAtValue: record?.cancelledAtUtc || null,
    raw: record,
  };
};

const isBookingOnDate = (booking, dateKey) => {
  return normalizeText(booking?.createdAt, "") === normalizeText(dateKey, "");
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

const getProfitClassName = (profit) =>
  Number(profit) < 0 ? "admin-profit-value loss" : "admin-profit-value gain";

const getProfitLabel = (profit) => (Number(profit) < 0 ? "Loss" : "Profit");

export default function AdminB2CBookingListPage() {
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useAdminList("b2c-bookings", []);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const todayDate = new Date().toISOString().slice(0, 10);

  const loadAdminBookings = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setErrorMessage("");

    const apiStatus = mapBookingFilterStatusToApi(activeFilters.status);
    const passengerPhone = String(activeFilters.passengerPhone || "").trim() || undefined;

    try {
      let busResultsRaw = [];
      try {
        busResultsRaw = await listAdminBusBookings({ passengerPhone, status: apiStatus });
      } catch (apiError) {
        if (shouldUseFallbackBusBookings(apiError)) {
          busResultsRaw = [];
        } else {
          throw apiError;
        }
      }

      const busResults = Array.isArray(busResultsRaw)
        ? busResultsRaw.map((record) => normalizeBusBookingRecord(record))
        : [];

      const unifiedBookings = [
        ...busResults.map((record) => toUnifiedAdminBooking(record, "Bus")),
      ].sort((first, second) => {
        const firstTime = toNumberDate(first.createdAtValue || first.createdAt);
        const secondTime = toNumberDate(second.createdAtValue || second.createdAt);
        return secondTime - firstTime;
      });

      setBookings(unifiedBookings);
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load admin bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [setBookings]);

  useEffect(() => {
    loadAdminBookings(filters);
  }, [filters, loadAdminBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusFromFilter = mapBookingFilterStatusToApi(filters.status);
      if (statusFromFilter && safeValue(booking.status, "").toLowerCase() !== statusFromFilter.toLowerCase()) {
        return false;
      }

      if (filters.bookingReference) {
        const query = filters.bookingReference.toLowerCase();
        const lookup = `${booking.id} ${booking.pnr} ${booking.passengerName}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (filters.passengerPhone && !String(booking.passengerPhone || "").includes(filters.passengerPhone)) {
        return false;
      }

      if (filters.fromDate) {
        const journeyTime = toNumberDate(booking.journeyDate);
        if (!Number.isFinite(journeyTime) || journeyTime < toNumberDate(filters.fromDate)) {
          return false;
        }
      }

      if (filters.toDate) {
        const journeyTime = toNumberDate(booking.journeyDate);
        if (!Number.isFinite(journeyTime) || journeyTime > toNumberDate(filters.toDate)) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, filters]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBookings.slice(startIndex, startIndex + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;

  const todayBookedCount = bookings.filter(
    (item) => isBookingOnDate(item, todayDate) && mapAdminStatusClass(item.status) === "success"
  ).length;
  const todayPendingCount = bookings.filter(
    (item) => isBookingOnDate(item, todayDate) && mapAdminStatusClass(item.status) === "pending"
  ).length;

  const filteredProfit = filteredBookings.reduce((sum, item) => sum + (Number(item.calculatedProfit) || 0), 0);
  const todayProfit = bookings
    .filter(
      (item) =>
        mapAdminStatusClass(item.status) === "success" &&
        isBookingOnDate(item, todayDate)
    )
    .reduce((sum, item) => sum + (Number(item.calculatedProfit) || 0), 0);
  const currentMonth = todayDate.slice(0, 7);
  const monthProfit = bookings
    .filter(
      (item) =>
        mapAdminStatusClass(item.status) === "success" &&
        String(item.createdAt || "").startsWith(currentMonth)
    )
    .reduce((sum, item) => sum + (Number(item.calculatedProfit) || 0), 0);

  const handleDraftChange = (field, value) => {
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
      "Booking ID",
      "Created Date",
      "Passenger Name",
      "Passenger Phone",
      "From",
      "To",
      "Journey Date",
      "Journey Time",
      "PNR",
      "Status",
      "Operator",
      "Vehicle Type",
      "Fare",
      "Calculated Profit",
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = bookings.map((booking) => [
      booking.tripType,
      booking.id,
      booking.createdAt,
      booking.passengerName,
      booking.passengerPhone,
      booking.from,
      booking.to,
      booking.journeyDate,
      booking.journeyTime,
      booking.pnr,
      booking.status,
      booking.operator,
      booking.vehicleType,
      booking.fare,
      booking.calculatedProfit,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `admin-b2c-bookings-${todayDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-booking-page">
      <header className="admin-b2c-header">
        <h1><span className="admin-heading-red">B2C Bus</span> Booking List</h1>
      </header>

      <div className="admin-toolbar-row">
        <div className="admin-chip-row">
          <span className="admin-chip">Today Booked: {todayBookedCount}</span>
          <span className="admin-chip">Today Pending: {todayPendingCount}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredBookings.length}
          </span>
        </div>

        <div className="admin-actions-row">
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Close Filter" : "Open Filter"}
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters">
          <label>
            <span>Status</span>
            <select
              value={draftFilters.status}
              onChange={(event) => handleDraftChange("status", event.target.value)}
            >
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span>Booking Ref / PNR</span>
            <input
              type="text"
              value={draftFilters.bookingReference}
              onChange={(event) => handleDraftChange("bookingReference", event.target.value)}
              placeholder="Search booking id, PNR or name"
            />
          </label>

          <label>
            <span>Passenger Phone</span>
            <input
              type="text"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleDraftChange("passengerPhone", event.target.value)}
              placeholder="Enter mobile number"
            />
          </label>

          <label>
            <span>Journey From</span>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => handleDraftChange("fromDate", event.target.value)}
            />
          </label>

          <label>
            <span>Journey To</span>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => handleDraftChange("toDate", event.target.value)}
            />
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Clear Filter
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-stat-grid" aria-label="Booking summary cards">
        <article className="admin-stat-card">
          <strong className="text-success">{filteredBookings.filter((item) => mapAdminStatusClass(item.status) === "success").length}</strong>
          <span>Filtered Booked</span>
        </article>
        <article className="admin-stat-card">
          <strong className="text-warning">{filteredBookings.filter((item) => mapAdminStatusClass(item.status) === "pending").length}</strong>
          <span>Filtered Pending</span>
        </article>
        <article className="admin-stat-card">
          <strong className={getProfitClassName(filteredProfit)}>{adminProfitFormatter.format(filteredProfit)}</strong>
          <span>Current Filter Profit</span>
        </article>
        <div className="admin-stat-stack">
          <button type="button">Today Profit {adminProfitFormatter.format(todayProfit)}</button>
          <button type="button">Month Profit {adminProfitFormatter.format(monthProfit)}</button>
        </div>
      </section>

      <section className="admin-table-shell">
        <header className="admin-table-head">
          <span>B. ID / Date</span>
          <span>Name</span>
          <span>Segment / Date</span>
          <span>Time</span>
          <span>PNR / Status</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading bookings...</div>
        ) : filteredBookings.length ? (
          <>
            <div className="admin-table-body">
              {paginatedBookings.map((booking) => (
                <article key={`${booking.tripType}-${booking.id}-${booking.createdAt}`} className="admin-table-row">
                  <div className="admin-table-cell">
                    <strong>{safeValue(booking.id)}</strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">📅</span>
                      <span>{formatAdminDate(booking.createdAt)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell">
                    <strong>{safeValue(booking.passengerName)}</strong>
                    <small>{safeValue(booking.passengerPhone)}</small>
                  </div>

                  <div className="admin-table-cell">
                    <div className="admin-route-segment">
                      <span>{safeValue(booking.from)}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{safeValue(booking.to)}</span>
                    </div>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">📅</span>
                      <span>{formatAdminDate(booking.journeyDate)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{safeValue(booking.journeyTime)}</strong>
                  </div>

                  <div className="admin-table-cell">
                    <strong>{safeValue(booking.pnr)}</strong>
                    <span className={`admin-status-pill ${mapAdminStatusClass(booking.status)}`}>
                      {safeValue(booking.status)}
                    </span>
                  </div>

                  <div className="admin-table-cell">
                    <strong>{safeValue(booking.operator)}</strong>
                    <small>
                      {safeValue(booking.tripType)} | {safeValue(booking.vehicleType)}
                    </small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong>{adminCurrencyFormatter.format(Number(booking.fare) || 0)}</strong>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong className={getProfitClassName(booking.calculatedProfit)}>
                      {adminProfitFormatter.format(Number(booking.calculatedProfit) || 0)}
                    </strong>
                    <small>{getProfitLabel(booking.calculatedProfit)}</small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <AdminPagination
              currentPage={currentPage}
              totalItems={filteredBookings.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemName="bookings"
            />
          </>
        ) : (
          <div className="admin-table-empty">No bookings available for the selected filters.</div>
        )}

        <footer className="admin-table-footnote">
          JD: Journey Date, CF: Customer Fare, NF: Net Fare, D: Depart A: Arrive.
        </footer>
      </section>

      {selectedBooking ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedBooking(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Booking details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Booking Detail View</h2>
                <p className="admin-view-header-subtitle">
                  {safeValue(selectedBooking.id)} | {safeValue(selectedBooking.passengerName)}
                </p>
                <div className="admin-view-meta-row">
                  <span className={`admin-view-meta-chip ${mapAdminStatusClass(selectedBooking.status)}`}>
                    {safeValue(selectedBooking.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Fare {adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}
                  </span>
                  <span className={`admin-view-meta-chip ${getProfitClassName(selectedBooking.calculatedProfit)}`}>
                    {getProfitLabel(selectedBooking.calculatedProfit)}{" "}
                    {adminProfitFormatter.format(Number(selectedBooking.calculatedProfit) || 0)}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedBooking(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Trip Type</span>
                <strong>{safeValue(selectedBooking.tripType)}</strong>
              </div>
              <div>
                <span>Passenger Phone</span>
                <strong>{safeValue(selectedBooking.passengerPhone)}</strong>
              </div>
              <div>
                <span>Booking ID</span>
                <strong>{safeValue(selectedBooking.id)}</strong>
              </div>
              <div>
                <span>Booking Date</span>
                <strong>{safeValue(selectedBooking.createdAt)}</strong>
              </div>
              <div>
                <span>Segment</span>
                <strong>
                  {safeValue(selectedBooking.from)} to {safeValue(selectedBooking.to)}
                </strong>
              </div>
              <div>
                <span>Journey Date & Time</span>
                <strong>
                  {safeValue(selectedBooking.journeyDate)} | {safeValue(selectedBooking.journeyTime)}
                </strong>
              </div>
              <div>
                <span>PNR</span>
                <strong>{safeValue(selectedBooking.pnr)}</strong>
              </div>
              <div>
                <span>Status</span>
                <div>
                  <span className={`admin-status-pill ${mapAdminStatusClass(selectedBooking.status)}`}>
                    {safeValue(selectedBooking.status)}
                  </span>
                </div>
              </div>
              <div>
                <span>Operator / Type</span>
                <strong>{safeValue(selectedBooking.operator)}</strong>
                <small>
                  {safeValue(selectedBooking.tripType)} | {safeValue(selectedBooking.vehicleType)}
                </small>
              </div>
              <div className="admin-view-highlight-card">
                <span>Fare</span>
                <strong>{adminCurrencyFormatter.format(Number(selectedBooking.fare) || 0)}</strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Calculated Profit</span>
                <strong className={getProfitClassName(selectedBooking.calculatedProfit)}>
                  {adminProfitFormatter.format(Number(selectedBooking.calculatedProfit) || 0)}
                </strong>
                <small>{getProfitLabel(selectedBooking.calculatedProfit)}</small>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}
