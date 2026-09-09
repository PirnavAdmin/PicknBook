/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./BookingList.css";
import { Filter, Download, CreditCard, RefreshCw, CheckCircle } from "lucide-react";
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
  passengerName: "",
  passengerPhone: "",
  fromCity: "",
  toCity: "",
  fromDate: "",
  toDate: "",
  journeyTime: "",
  operator: "",
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
    // --- NEW PAYMENT FIELDS ---
    paymentStatus: getFieldValue(["paymentStatus", "PaymentStatus"], null),
    refundStatus: getFieldValue(["refundStatus", "RefundStatus"], null),
    fulfillmentStatus: getFieldValue(["fulfillmentStatus", "FulfillmentStatus"], null),
    // --------------------------
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

// --- Payment Status Helpers ---
const getPaymentStatusDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

const getPaymentStatusClass = (value) => {
  if (value === null || value === undefined || value === "") return "ps-na";
  const key = String(value).toLowerCase();
  if (key === "success" || key === "completed") return "ps-success";
  if (key === "pending" || key === "processing" || key === "created") return "ps-pending";
  if (key === "failed" || key === "cancelled" || key === "expired") return "ps-failed";
  if (key === "notrequired") return "ps-notrequired";
  return "ps-default";
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
    // --- NEW PAYMENT FIELDS ---
    paymentStatus: record?.paymentStatus ?? null,
    refundStatus: record?.refundStatus ?? null,
    fulfillmentStatus: record?.fulfillmentStatus ?? null,
    // --------------------------
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
        const query = filters.bookingReference.trim().toLowerCase();
        const lookup = `${booking.id} ${booking.pnr} ${booking.bookingReference || ""} ${booking.raw?.tripNumber || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      if (filters.passengerName) {
        const query = filters.passengerName.trim().toLowerCase();
        const mainName = String(booking.passengerName || "").toLowerCase();
        const pNames = (booking.passengers || []).map((p) => String(p.fullName || "").toLowerCase()).join(" ");
        if (!mainName.includes(query) && !pNames.includes(query)) {
          return false;
        }
      }

      if (filters.passengerPhone) {
        const query = filters.passengerPhone.trim().toLowerCase();
        if (!String(booking.passengerPhone || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.fromCity) {
        const query = filters.fromCity.trim().toLowerCase();
        if (!String(booking.from || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.toCity) {
        const query = filters.toCity.trim().toLowerCase();
        if (!String(booking.to || "").toLowerCase().includes(query)) {
          return false;
        }
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

      if (filters.journeyTime) {
        const query = filters.journeyTime.trim().toLowerCase();
        if (!String(booking.journeyTime || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.operator) {
        const query = filters.operator.trim().toLowerCase();
        if (!String(booking.operator || "").toLowerCase().includes(query)) {
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
      "Payment Status",
      "Refund Status",
      "Fulfillment Status",
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
      getPaymentStatusDisplay(booking.paymentStatus),
      getPaymentStatusDisplay(booking.refundStatus),
      getPaymentStatusDisplay(booking.fulfillmentStatus),
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
      <header className="admin-b2c-header" style={{ marginBottom: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red">B2C Bus</span> Booking List
        </h1>
      </header>

      <div className="admin-toolbar-row" style={{ marginBottom: "6px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Today Booked: {todayBookedCount}</span>
          <span className="admin-chip">Today Pending: {todayPendingCount}</span>
          <span className="admin-chip admin-total-chip">
            Total Records: {filteredBookings.length}
          </span>
        </div>

        <div className="admin-actions-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setIsFiltersOpen((current) => !current)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#A51C49',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '4px 14px',
              height: '28px',
              fontWeight: '600',
              fontSize: '0.80rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(165, 28, 73, 0.2)'
            }}
          >
            <Filter size={13} />
            <span>{isFiltersOpen ? "Close Filter" : "Filter"}</span>
          </button>
          <button 
            type="button" 
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '4px 14px',
              height: '28px',
              fontWeight: '600',
              fontSize: '0.80rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters">
          <label>
            <span>Booking Ref / PNR</span>
            <input
              type="text"
              value={draftFilters.bookingReference}
              onChange={(event) => handleDraftChange("bookingReference", event.target.value)}
              placeholder="Search Ref / PNR"
            />
          </label>

          <label>
            <span>Passenger Name</span>
            <input
              type="text"
              value={draftFilters.passengerName}
              onChange={(event) => handleDraftChange("passengerName", event.target.value)}
              placeholder="Enter name"
            />
          </label>

          <label>
            <span>Mobile No</span>
            <input
              type="text"
              value={draftFilters.passengerPhone}
              onChange={(event) => handleDraftChange("passengerPhone", event.target.value)}
              placeholder="Enter mobile number"
            />
          </label>

          <label>
            <span>Journey Source</span>
            <input
              type="text"
              value={draftFilters.fromCity}
              onChange={(event) => handleDraftChange("fromCity", event.target.value)}
              placeholder="Source city"
            />
          </label>

          <label>
            <span>Destination</span>
            <input
              type="text"
              value={draftFilters.toCity}
              onChange={(event) => handleDraftChange("toCity", event.target.value)}
              placeholder="Destination city"
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

          <label>
            <span>Time</span>
            <input
              type="text"
              value={draftFilters.journeyTime}
              onChange={(event) => handleDraftChange("journeyTime", event.target.value)}
              placeholder="e.g. 10:00"
            />
          </label>

          <label>
            <span>Operator</span>
            <input
              type="text"
              value={draftFilters.operator}
              onChange={(event) => handleDraftChange("operator", event.target.value)}
              placeholder="Operator name"
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={draftFilters.status}
              onChange={(event) => handleDraftChange("status", event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="booked">Booked</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
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

      <section className="admin-table-shell">
        <header className="admin-table-head">
          <span>
            <span className="admin-hdr-tooltip" title="Booking ID">
              B. ID
              <span className="admin-tooltip-text">Booking ID</span>
            </span>{" "}
            /{" "}
            <span className="admin-hdr-tooltip" title="Booking Date">
              B.D.
              <span className="admin-tooltip-text">Booking Date</span>
            </span>
          </span>
          <span>Name</span>
          <span>
            <span className="admin-hdr-tooltip" title="Source & Destination">
              Segment
              <span className="admin-tooltip-text">Source & Destination</span>
            </span>{" "}
            /{" "}
            <span className="admin-hdr-tooltip" title="Journey Date">
              Jd
              <span className="admin-tooltip-text">Journey Date</span>
            </span>
          </span>
          <span>Time</span>
          <span>
            <span className="admin-hdr-tooltip" title="Passenger Name Record">
              PNR
              <span className="admin-tooltip-text">Passenger Name Record</span>
            </span>{" "}
            / Status
          </span>
          <span>Payment</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading bookings...</div>
        ) : errorMessage ? (
          <div className="admin-table-empty">Data not found</div>
        ) : filteredBookings.length ? (
          <div className="admin-table-body">
            {paginatedBookings.map((booking) => (
              <article key={`${booking.tripType}-${booking.id}-${booking.createdAt}`} className="admin-table-row">
                <div className="admin-table-cell">
                  <strong>{safeValue(booking.id)}</strong>
                  <div className="admin-date-badge" title="Booking Date">
                    <span className="admin-calendar-emoji">🗓️</span>
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
                  <div className="admin-date-badge" title="Journey Date">
                    <span className="admin-calendar-emoji">🗓️</span>
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

                <div className="admin-table-cell admin-payment-cell">
                  <span className={`admin-ps-pill ${getPaymentStatusClass(booking.paymentStatus)}`} title="Payment Status">
                    <CreditCard size={10} />
                    {getPaymentStatusDisplay(booking.paymentStatus)}
                  </span>
                  <span className={`admin-ps-pill ${getPaymentStatusClass(booking.refundStatus)}`} title="Refund Status">
                    <RefreshCw size={10} />
                    {getPaymentStatusDisplay(booking.refundStatus)}
                  </span>
                  <span className={`admin-ps-pill ${getPaymentStatusClass(booking.fulfillmentStatus)}`} title="Fulfillment Status">
                    <CheckCircle size={10} />
                    {getPaymentStatusDisplay(booking.fulfillmentStatus)}
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
        ) : (
          <div className="admin-table-empty">No bus bookings available.</div>
        )}

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

            {/* Payment Status Section */}
            <section className="admin-view-payment-section">
              <h3 className="admin-view-payment-title">Payment Information</h3>
              <div className="admin-view-payment-grid">
                <div className="admin-view-payment-card">
                  <div className="admin-view-payment-card-icon">
                    <CreditCard size={16} />
                  </div>
                  <span>Payment Status</span>
                  <strong className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.paymentStatus)}`}>
                    {getPaymentStatusDisplay(selectedBooking.paymentStatus)}
                  </strong>
                </div>
                <div className="admin-view-payment-card">
                  <div className="admin-view-payment-card-icon">
                    <RefreshCw size={16} />
                  </div>
                  <span>Refund Status</span>
                  <strong className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.refundStatus)}`}>
                    {getPaymentStatusDisplay(selectedBooking.refundStatus)}
                  </strong>
                </div>
                <div className="admin-view-payment-card">
                  <div className="admin-view-payment-card-icon">
                    <CheckCircle size={16} />
                  </div>
                  <span>Fulfillment Status</span>
                  <strong className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.fulfillmentStatus)}`}>
                    {getPaymentStatusDisplay(selectedBooking.fulfillmentStatus)}
                  </strong>
                </div>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}
