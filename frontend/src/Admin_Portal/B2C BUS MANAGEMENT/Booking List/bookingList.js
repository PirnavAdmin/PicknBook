/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./BookingList.css";
import { Filter, Download, CreditCard, RefreshCw, CheckCircle } from "lucide-react";
import { useAdminList, getAdminItemsPerPage } from "../../../utils/adminPortalStorage";
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

  let firstValidZero = null;

  for (const source of sources) {
    for (const key of keys) {
      if (source?.[key] !== null && source?.[key] !== undefined && source?.[key] !== "") {
        const numberValue = Number(source[key]);

        if (Number.isFinite(numberValue)) {
          if (numberValue !== 0) {
            return numberValue;
          }
          if (firstValidZero === null) {
            firstValidZero = numberValue;
          }
        }
      }
    }
  }

  return firstValidZero !== null ? firstValidZero : fallback;
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
  const directProfit = pickFinancialNumber(
    record,
    ["profitInr", "ProfitInr", "profit", "Profit", "calculatedProfit", "CalculatedProfit"],
    null
  );

  if (directProfit !== null && directProfit !== undefined && Number.isFinite(Number(directProfit))) {
    return Number(directProfit);
  }

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

function resolvePassengerName(record) {
  if (!record || typeof record !== "object") return "B2C Customer";

  const sources = [
    record,
    record?.raw,
    record?.bus,
    record?.busDetails,
    record?.ticket,
    record?.trip,
    record?.journey,
    record?.bookingDetails,
    record?.details,
    record?.ticketDetails,
    record?.contact,
    record?.user,
    record?.bookingContact,
    record?.contactDetails,
    record?.passengerDetails,
    record?.leadPassenger,
    record?.primaryPassenger,
  ].filter(Boolean);

  for (const src of sources) {
    const val = pickFirst(
      src,
      [
        "passengerName", "PassengerName", "passenger_name", "Passenger_Name",
        "customerName", "CustomerName", "customer_name", "Customer_Name",
        "userName", "UserName", "user_name", "User_Name",
        "leadPassengerName", "LeadPassengerName", "leadPassenger", "LeadPassenger",
        "contactName", "ContactName", "contact_name",
        "bookedBy", "BookedBy", "booked_by",
        "primaryPassenger", "PrimaryPassenger",
        "fullName", "FullName", "full_name", "Full_Name",
        "name", "Name", "passenger", "Passenger"
      ],
      null
    );
    if (val && typeof val === "string" && val.trim() && val.trim() !== "--" && !val.toLowerCase().includes("unknown")) {
      return val.trim();
    }
  }

  const passengersRaw = pickFirst(
    record,
    ["passengers", "Passengers", "travelers", "Travelers", "paxList", "PaxList", "passengerList"],
    record?.raw?.passengers || record?.raw?.Passengers || []
  );

  if (Array.isArray(passengersRaw) && passengersRaw.length > 0) {
    for (const pax of passengersRaw) {
      if (!pax) continue;
      const firstName = pickFirst(pax, ["firstName", "first_name", "FirstName", "fname", "givenName"], "");
      const lastName = pickFirst(pax, ["lastName", "last_name", "LastName", "lname", "surname"], "");
      const combined = `${firstName} ${lastName}`.trim();
      const pName = pickFirst(pax, ["fullName", "FullName", "name", "Name", "passengerName", "PassengerName"], combined);
      if (pName && typeof pName === "string" && pName.trim() && !pName.trim().startsWith("Passenger ") && pName.trim() !== "--") {
        return pName.trim();
      }
    }
  }

  const seatsRaw = pickFirst(record, ["seats", "Seats"], record?.raw?.seats || []);
  if (Array.isArray(seatsRaw) && seatsRaw.length > 0) {
    for (const seat of seatsRaw) {
      const sName = pickFirst(seat, ["passengerName", "PassengerName", "name", "Name", "fullName"], null);
      if (sName && typeof sName === "string" && sName.trim() && sName.trim() !== "--") {
        return sName.trim();
      }
    }
  }

  const email = pickFirst(
    record,
    ["passengerEmail", "PassengerEmail", "email", "Email", "userEmail", "UserEmail", "customerEmail", "CustomerEmail"],
    record?.contact?.email || record?.user?.email || record?.raw?.passengerEmail || ""
  );

  if (email && typeof email === "string" && email.includes("@")) {
    const handle = email.split("@")[0].replace(/[._-]/g, " ").trim();
    if (handle) {
      return handle.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  return "--";
}

function resolvePassengerPhone(record) {
  if (!record || typeof record !== "object") return "--";

  const sources = [
    record,
    record?.raw,
    record?.bus,
    record?.busDetails,
    record?.ticket,
    record?.trip,
    record?.journey,
    record?.bookingDetails,
    record?.details,
    record?.ticketDetails,
    record?.contact,
    record?.user,
    record?.bookingContact,
    record?.contactDetails,
    record?.passengerDetails,
    record?.leadPassenger,
    record?.primaryPassenger,
  ].filter(Boolean);

  for (const src of sources) {
    const val = pickFirst(
      src,
      [
        "passengerPhone", "PassengerPhone", "passenger_phone", "Passenger_Phone",
        "passengerMobile", "PassengerMobile", "passenger_mobile", "Passenger_Mobile",
        "phone", "Phone", "mobile", "Mobile",
        "phoneNumber", "PhoneNumber", "phone_number", "Phone_Number",
        "phoneNo", "PhoneNo", "phone_no", "Phone_No",
        "mobileNo", "MobileNo", "mobile_no", "Mobile_No",
        "contactNumber", "ContactNumber", "contact_number",
        "contactPhone", "ContactPhone", "contact_phone",
        "contactNo", "ContactNo", "contact_no",
        "userPhone", "UserPhone", "userMobile", "UserMobile",
        "customerPhone", "CustomerPhone", "customerMobile", "CustomerMobile"
      ],
      null
    );
    if (val && String(val).trim() && String(val).trim() !== "--") {
      const clean = String(val).trim();
      return clean.startsWith("+") ? clean : `+91 ${clean}`;
    }
  }

  const passengersRaw = pickFirst(
    record,
    ["passengers", "Passengers", "travelers", "Travelers", "paxList", "PaxList", "passengerList"],
    record?.raw?.passengers || record?.raw?.Passengers || []
  );

  if (Array.isArray(passengersRaw) && passengersRaw.length > 0) {
    for (const pax of passengersRaw) {
      if (!pax) continue;
      const pPhone = pickFirst(pax, ["phone", "Phone", "mobile", "Mobile", "phoneNumber", "phoneNo", "mobileNo", "contactNo"], null);
      if (pPhone && String(pPhone).trim() && String(pPhone).trim() !== "--") {
        const clean = String(pPhone).trim();
        return clean.startsWith("+") ? clean : `+91 ${clean}`;
      }
    }
  }

  const seatsRaw = pickFirst(record, ["seats", "Seats"], record?.raw?.seats || []);
  if (Array.isArray(seatsRaw) && seatsRaw.length > 0) {
    for (const seat of seatsRaw) {
      const sPhone = pickFirst(seat, ["phone", "Phone", "mobile", "Mobile", "phoneNo"], null);
      if (sPhone && String(sPhone).trim() && String(sPhone).trim() !== "--") {
        const clean = String(sPhone).trim();
        return clean.startsWith("+") ? clean : `+91 ${clean}`;
      }
    }
  }

  return "--";
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
      "departureTimeIst",
      "DepartureTimeIst",
      "journeyDateIst",
      "JourneyDateIst",
      "departureTimeUtc",
      "DepartureTimeUtc",
      "departureDateTimeUtc",
      "DepartureDateTimeUtc",
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

  const pax = Number(getFieldValue(["pax", "Pax", "seatsBooked", "SeatsBooked", "seats", "Seats"], null)) || seatsBookedFallback;

  const firstPassengerName = passengers[0]?.fullName && !passengers[0]?.fullName.startsWith("Passenger ") ? passengers[0].fullName : "";
  const passengerName = String(
    getFieldValue(
      [
        "passengerName",
        "PassengerName",
        "customerName",
        "CustomerName",
        "userName",
        "UserName",
        "name",
        "Name",
        "leadPassengerName",
        "LeadPassengerName",
        "contactName",
        "ContactName",
        "bookedBy",
        "BookedBy",
        "primaryPassenger",
        "PrimaryPassenger",
        "passenger",
        "Passenger",
      ],
      ""
    ) ||
    firstPassengerName ||
    pickFirst(record?.contact, ["name", "Name", "customerName", "CustomerName", "fullName", "FullName"], "") ||
    pickFirst(record?.user, ["name", "Name", "fullName", "FullName"], "")
  );

  return {
    bookingId: getFieldValue(["bookingId", "BookingId", "id", "Id"], null),
    bookingReference: String(
      getFieldValue(["bookingReference", "BookingReference", "referenceNumber"], "")
    ),
    pnr: String(
      getFieldValue(["pnr", "PNR", "Pnr", "pnrNumber", "PnrNumber"], "")
    ),
    tripType: String(getFieldValue(["tripType", "TripType"], "Bus")),
    tripId: getFieldValue(["tripId", "TripId"], null),
    passengerName: resolvePassengerName(record),
    passengerPhone: resolvePassengerPhone(record),
    passengerEmail: String(
      getFieldValue(["passengerEmail", "PassengerEmail", "email", "Email"], "")
    ),
    fromCity,
    toCity,
    segment,
    providerName: String(
      getFieldValue(
        [
          "busOperator",
          "BusOperator",
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
        "arrivalTimeIst",
        "ArrivalTimeIst",
        "arrivalTimeUtc",
        "ArrivalTimeUtc",
        "arrivalDateTimeUtc",
        "ArrivalDateTimeUtc",
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
          "busType",
          "BusType",
          "travelClass",
          "TravelClass",
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
    seatsBooked: pax,
    pax,
    totalPriceInr: pickFinancialNumber(record, [
      "customerFareInr",
      "CustomerFareInr",
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
      "netFareInr",
      "NetFareInr"
    ], 0),
    customerFareInr: pickFinancialNumber(record, [
      "customerFareInr",
      "CustomerFareInr",
      "customerFare",
      "CustomerFare",
      "totalPriceInr",
      "TotalPriceInr"
    ], 0),
    netFareInr: getNetFareInr(record),
    taxableFareInr: getTaxableFareInr(record),
    baseFareInr: getBaseFareInr(record),
    calculatedProfit: calculateBookingProfit(record),
    markupAmount: pickFinancialNumber(record, [
      "markupAmountInr",
      "MarkupAmountInr",
      "markupAmount",
      "MarkupAmount",
      "totalMarkupAmount",
      "TotalMarkupAmount",
      "markup",
      "Markup"
    ], 0),
    gstAmount: pickFinancialNumber(record, [
      "gstAmountInr",
      "GstAmountInr",
      "gstAmount",
      "GstAmount",
      "tax",
      "Tax",
      "taxes",
      "Taxes",
      "taxAmount",
      "TaxAmount"
    ], 0),
    gstPercent: pickFinancialNumber(record, [
      "gstPercent",
      "GstPercent",
      "gstRate",
      "GstRate"
    ], 0),
    discountAmount: getDiscountAmountInr(record),
    convenienceFee: pickFinancialNumber(record, [
      "convenienceFeeInr",
      "ConvenienceFeeInr",
      "convenienceFee",
      "ConvenienceFee",
      "serviceFee",
      "ServiceFee",
      "platformFee",
      "PlatformFee"
    ], 0),
    profit: calculateBookingProfit(record),
    status: String(getFieldValue(["status", "Status"], "Unknown") || "Unknown"),
    paymentStatus: getFieldValue(["paymentStatus", "PaymentStatus"], null),
    refundStatus: getFieldValue(["refundStatus", "RefundStatus"], null),
    fulfillmentStatus: getFieldValue(["fulfillmentStatus", "FulfillmentStatus"], null),
    bookedAtUtc: getFieldValue(
      [
        "bookingDateIst",
        "BookingDateIst",
        "bookingDateUtc",
        "BookingDateUtc",
        "bookingDate",
        "BookingDate",
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
  if (!dateString || dateString === "--" || dateString === "N/A") return "--";
  try {
    const raw = String(dateString).trim();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. If it matches YYYY-MM-DD
    const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const [, year, monthStr, dayStr] = isoDateMatch;
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }

    // 2. If it matches DD-MM-YYYY
    const formattedMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (formattedMatch) {
      const [, dayStr, monthStr, year] = formattedMatch;
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }

    // 3. Fallback standard Date parsing
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const day = parsed.getDate();
      const monthIdx = parsed.getMonth();
      const year = parsed.getFullYear();
      return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const formatSingleTimeAmPm = (timeStr) => {
  if (!timeStr || timeStr === "--") return "";
  const raw = String(timeStr).trim();

  const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    let hours = parseInt(hhmmMatch[1], 10);
    const minutes = hhmmMatch[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }

  return raw;
};

const formatJourneyTimeAmPm = (journeyTime) => {
  if (!journeyTime || journeyTime === "--") return "--";
  const str = String(journeyTime).trim();
  if (str.includes("-")) {
    const parts = str.split("-");
    const dep = formatSingleTimeAmPm(parts[0].trim());
    const arr = formatSingleTimeAmPm(parts[1].trim());
    if (dep && arr) {
      return `${dep} - ${arr}`;
    }
  }
  return formatSingleTimeAmPm(str) || journeyTime;
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

const BOOKED_STATUS_SET = new Set(["booked", "success", "confirmed", "ticketed", "completed", "finished"]);
const CANCELLED_STATUS_SET = new Set(["cancelled", "canceled", "cancel"]);

const toAdminStatusLabel = (statusValue) => {
  const normalized = normalizeText(statusValue, "Booked");
  const key = normalized.toLowerCase();

  if (CANCELLED_STATUS_SET.has(key) || key.includes("cancel")) {
    return "Cancelled";
  }

  if (BOOKED_STATUS_SET.has(key) || key.includes("book") || key.includes("success") || key.includes("confirm") || key.includes("complet")) {
    return "Booked";
  }

  return "Expired";
};

const mapAdminStatusClass = (statusValue) => {
  const label = toAdminStatusLabel(statusValue);
  if (label === "Cancelled") return "cancelled";
  if (label === "Booked") return "success";
  return "expired";
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
  const pnrValue = normalizeText(record?.pnr, "");
  const bookingId = normalizeText(record?.bookingId || record?.id, "");
  const tripNumber = normalizeText(record?.tripNumber, "");
  const bookedAtValue = record?.bookedAtUtc || null;
  const rawDepartureValue = record?.departureTimeUtc || record?.departureTime || record?.departureDateTime || record?.journeyDateIst || null;
  const isInvalidDeparture = !rawDepartureValue || rawDepartureValue === "0001-01-01" || String(rawDepartureValue).startsWith("0001");
  const departureValue = isInvalidDeparture ? (record?.bookingDateIst || record?.bookedAtUtc || record?.bookingDateUtc || null) : rawDepartureValue;
  const arrivalValue = record?.arrivalTimeUtc || record?.arrivalTime || record?.arrivalDateTime || record?.droppingTime || record?.dropTime || null;

  const depTime = toTimeKey(departureValue);
  const arrTime = toTimeKey(arrivalValue);
  const journeyTime = depTime && arrTime ? `${depTime} - ${arrTime}` : (depTime || arrTime || "--");

  const fare = Math.max(
    parseNumber(record?.customerFareInr, 0) ||
    parseNumber(record?.totalPriceInr, 0) ||
    parseNumber(record?.customerFare, 0) ||
    parseNumber(record?.totalFare, 0) ||
    parseNumber(record?.netFareInr, 0) ||
    parseNumber(record?.baseFareInr, 0),
    0
  );
  const calculatedProfit = parseNumber(record?.calculatedProfit, calculateBookingProfit(record));
  const profit = calculatedProfit;

  let fromCity = record?.fromCity || "";
  let toCity = record?.toCity || "";
  if (record?.segment && (!fromCity || !toCity)) {
    const parts = record.segment.split(/[-–]| to /i);
    if (parts.length === 2) {
      fromCity = parts[0].trim();
      toCity = parts[1].trim();
    } else {
      fromCity = record.segment;
    }
  }

  const ticketNo = normalizeText(
    record?.ticketNo ||
    record?.ticketNumber ||
    record?.ticket_no ||
    record?.ticket_number ||
    record?.tin ||
    record?.TIN ||
    record?.passengers?.[0]?.ticketNumber ||
    record?.bookingReference,
    ""
  );

  return {
    id: bookingId || bookingReference || pnrValue || "--",
    bookingId,
    bookingReference,
    pnr: pnrValue || bookingReference || tripNumber || bookingId || "--",
    ticketNo: ticketNo || bookingReference || "--",
    tripType: safeSourceType,
    createdAt: toDateKey(bookedAtValue),
    createdAtValue: bookedAtValue,
    passengerName: resolvePassengerName(record),
    passengerPhone: resolvePassengerPhone(record),
    passengerEmail: normalizeText(record?.passengerEmail, "--"),
    pax: record?.pax || record?.seatsBooked || 1,
    from: normalizeText(fromCity, "--"),
    to: normalizeText(toCity, "--"),
    segment: normalizeText(record?.segment || (fromCity && toCity ? `${fromCity} - ${toCity}` : ""), "--"),
    journeyDate: toDateKey(departureValue),
    journeyTime,
    departureTime: depTime || "--",
    arrivalTime: arrTime || "--",
    status,
    paymentStatus: record?.paymentStatus ?? null,
    refundStatus: record?.refundStatus ?? null,
    fulfillmentStatus: record?.fulfillmentStatus ?? null,
    operator: normalizeText(record?.providerName, "--"),
    vehicleType: normalizeText(record?.travelClass, safeSourceType),
    fare,
    customerFareInr: parseNumber(record?.customerFareInr, fare),
    netFareInr: parseNumber(record?.netFareInr, fare),
    baseFareInr: parseNumber(record?.baseFareInr, 0),
    taxableFareInr: parseNumber(record?.taxableFareInr, 0),
    discountAmountInr: parseNumber(record?.discountAmount, 0),
    markupAmountInr: parseNumber(record?.markupAmount, 0),
    convenienceFeeInr: parseNumber(record?.convenienceFee, 0),
    gstPercent: parseNumber(record?.gstPercent, 0),
    gstAmountInr: parseNumber(record?.gstAmount, 0),
    calculatedProfit,
    profit,
    cancellationReason: normalizeText(record?.cancellationReason, ""),
    cancelledAtValue: record?.cancelledAtUtc || null,
    passengers: record?.passengers || [],
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
  const [pageSize, setPageSize] = useState(() => getAdminItemsPerPage(10));

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
        busResultsRaw = await listAdminBusBookings({
          passengerPhone,
          status: apiStatus,
          pnr: String(activeFilters.bookingReference || activeFilters.pnr || "").trim() || undefined,
          journeyDate: String(activeFilters.fromDate || activeFilters.journeyDate || "").trim() || undefined,
          limit: 200,
        });
      } catch (apiError) {
        throw apiError;
      }

      const rawRecords = Array.isArray(busResultsRaw) && busResultsRaw.length > 0
        ? busResultsRaw
        : Array.isArray(busResultsRaw?.data)
        ? busResultsRaw.data
        : Array.isArray(busResultsRaw?.result)
        ? busResultsRaw.result
        : Array.isArray(busResultsRaw?.items)
        ? busResultsRaw.items
        : Array.isArray(busResultsRaw?.bookings)
        ? busResultsRaw.bookings
        : Array.isArray(busResultsRaw?.content)
        ? busResultsRaw.content
        : [];

      const busResults = rawRecords.map((record) => normalizeBusBookingRecord(record));

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
      const resolvedStatus = toAdminStatusLabel(booking.status);
      if (resolvedStatus === "Expired") {
        return false;
      }

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
      "Passenger Email",
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
      booking.passengerEmail,
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
      <header className="admin-b2c-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Bus</span> Booking List
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
        <header className="admin-table-head" style={{ gridTemplateColumns: "0.8fr 1.3fr 1.3fr 1.2fr 1.3fr 1.1fr 1fr 1fr 0.7fr" }}>
          <span>B. ID / B.D.</span>
          <span>Passenger Details</span>
          <span>Segment / Journey Date</span>
          <span>Journey Timings</span>
          <span>PNR / Status</span>
          <span>Operator / Type</span>
          <span>Fare</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading bookings...</div>
        ) : errorMessage ? (
          <div className="admin-table-empty">No records found.</div>
        ) : filteredBookings.length ? (
          <div className="admin-table-body">
            {paginatedBookings.map((booking) => (
              <article key={`${booking.tripType}-${booking.id}-${booking.createdAt}`} className="admin-table-row" style={{ gridTemplateColumns: "0.8fr 1.3fr 1.3fr 1.2fr 1.3fr 1.1fr 1fr 1fr 0.7fr" }}>
                <div className="admin-table-cell">
                  <strong>{safeValue(booking.id)}</strong>
                  <small>🗓️ {formatAdminDate(booking.createdAt)}</small>
                </div>

                <div className="admin-table-cell admin-cell-centered">
                  <strong className="admin-name-text" style={{ color: "#000000", fontWeight: 800, fontSize: "0.76rem", display: "block", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                    {safeValue(booking.passengerName)}
                  </strong>
                  <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center" }}>
                    {safeValue(booking.passengerPhone)}
                  </small>
                  <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#6b7280", fontSize: "0.70rem" }}>
                    {safeValue(booking.passengerEmail)}
                  </small>
                </div>

                <div className="admin-table-cell">
                  <div className="admin-route-segment">
                    <span>{safeValue(booking.from)}</span>
                    <span className="admin-segment-arrow">➔</span>
                    <span>{safeValue(booking.to)}</span>
                  </div>
                  <small>🗓️ {formatAdminDate(booking.journeyDate)}</small>
                </div>

                <div className="admin-table-cell admin-cell-centered">
                  <strong>{formatJourneyTimeAmPm(booking.journeyTime)}</strong>
                </div>

                <div className="admin-table-cell">
                  <strong>{safeValue(booking.pnr)}</strong>
                  {booking.ticketNo && booking.ticketNo !== "--" && booking.ticketNo !== booking.pnr && (
                    <small style={{ display: "block", color: "#475569", fontWeight: "600", fontSize: "0.72rem", marginTop: "1px" }}>
                      Tkt No: {safeValue(booking.ticketNo)}
                    </small>
                  )}
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

                <div className="admin-table-cell admin-cell-centered" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    color: Number(booking.calculatedProfit) < 0 ? "#dc2626" : "#16a34a",
                    lineHeight: "1.2"
                  }}>
                    {Number(booking.calculatedProfit) < 0
                      ? `-₹${Math.abs(Number(booking.calculatedProfit)).toFixed(2)}`
                      : `₹${Number(booking.calculatedProfit || 0).toFixed(2)}`}
                  </span>
                  <span style={{
                    fontSize: "0.68rem",
                    color: "#64748b",
                    fontWeight: "500",
                    marginTop: "2px"
                  }}>
                    {Number(booking.calculatedProfit) < 0 ? "Loss" : "Profit"}
                  </span>
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
          <div className="admin-table-empty">No records found.</div>
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
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Bus Booking Detail View</h2>
                <p className="admin-view-header-subtitle">
                  ID: <strong>{safeValue(selectedBooking.id)}</strong> | PNR: <strong>{safeValue(selectedBooking.pnr)}</strong> | Ref: <strong>{safeValue(selectedBooking.bookingReference)}</strong>
                </p>
                <div className="admin-view-meta-row">
                  <span className={`admin-view-meta-chip ${mapAdminStatusClass(selectedBooking.status)}`}>
                    Status: {safeValue(selectedBooking.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Customer Fare: {adminProfitFormatter.format(Number(selectedBooking.customerFareInr || selectedBooking.fare) || 0)}
                  </span>
                  <span className={`admin-view-meta-chip ${getProfitClassName(selectedBooking.calculatedProfit)}`}>
                    {getProfitLabel(selectedBooking.calculatedProfit)}:{" "}
                    {adminProfitFormatter.format(Number(selectedBooking.calculatedProfit) || 0)}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedBooking(null)} className="admin-view-close-btn">
                Close
              </button>
            </header>

            {/* Section 1: General & Journey Details Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">General & Journey Details</h3>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Booking ID</th>
                    <td>{safeValue(selectedBooking.id)}</td>
                    <th>Booking Reference</th>
                    <td>{safeValue(selectedBooking.bookingReference)}</td>
                  </tr>
                  <tr>
                    <th>PNR</th>
                    <td>{safeValue(selectedBooking.pnr)}</td>
                    <th>Booking Date (B.D.)</th>
                    <td>{formatAdminDate(selectedBooking.createdAt)}</td>
                  </tr>
                  <tr>
                    <th>Booking Status</th>
                    <td>
                      <span className={`admin-status-pill ${mapAdminStatusClass(selectedBooking.status)}`}>
                        {safeValue(selectedBooking.status)}
                      </span>
                    </td>
                    <th>Pax / Passengers</th>
                    <td>{selectedBooking.pax} Pax</td>
                  </tr>
                  <tr>
                    <th>Segment / Route</th>
                    <td>{safeValue(selectedBooking.segment)}</td>
                    <th>Journey Date (Jd)</th>
                    <td>{formatAdminDate(selectedBooking.journeyDate)}</td>
                  </tr>
                  <tr>
                    <th>Departure Time</th>
                    <td>{safeValue(selectedBooking.departureTime || selectedBooking.journeyTime?.split("-")[0]?.trim())}</td>
                    <th>Arrival Time</th>
                    <td>{safeValue(selectedBooking.arrivalTime || selectedBooking.journeyTime?.split("-")[1]?.trim())}</td>
                  </tr>
                  <tr>
                    <th>Bus Operator</th>
                    <td>{safeValue(selectedBooking.operator)}</td>
                    <th>Bus Type</th>
                    <td>{safeValue(selectedBooking.vehicleType)}</td>
                  </tr>
                  <tr>
                    <th>Passenger Name</th>
                    <td>{safeValue(selectedBooking.passengerName)}</td>
                    <th>Phone Number (P.no)</th>
                    <td>{safeValue(selectedBooking.passengerPhone)}</td>
                  </tr>
                  <tr>
                    <th>Passenger Email</th>
                    <td colSpan="3">{safeValue(selectedBooking.passengerEmail)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Financial & Fare Breakdown Table */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Financial & Fare Breakdown</h3>
              <table className="admin-view-table">
                <thead>
                  <tr>
                    <th>Fare Parameter</th>
                    <th>Amount (INR)</th>
                    <th>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Customer Fare</strong></td>
                    <td><strong>{adminProfitFormatter.format(Number(selectedBooking.customerFareInr || selectedBooking.fare) || 0)}</strong></td>
                    <td>Total fare charged to customer</td>
                  </tr>
                  <tr>
                    <td><strong>Net Fare</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.netFareInr || selectedBooking.fare) || 0)}</td>
                    <td>Net payable fare amount</td>
                  </tr>
                  <tr>
                    <td><strong>Base Fare</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.baseFareInr) || 0)}</td>
                    <td>Base ticket fare cost</td>
                  </tr>
                  <tr>
                    <td><strong>Taxable Fare</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.taxableFareInr) || 0)}</td>
                    <td>Fare amount subject to taxes</td>
                  </tr>
                  <tr>
                    <td><strong>Markup Amount</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.markupAmountInr) || 0)}</td>
                    <td>Admin markup added</td>
                  </tr>
                  <tr>
                    <td><strong>Discount Amount</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.discountAmountInr) || 0)}</td>
                    <td>Applied coupon / promo discount</td>
                  </tr>
                  <tr>
                    <td><strong>Convenience Fee</strong></td>
                    <td>{adminProfitFormatter.format(Number(selectedBooking.convenienceFeeInr) || 0)}</td>
                    <td>Platform convenience fee</td>
                  </tr>
                  <tr>
                    <td><strong>GST Percent / Amount</strong></td>
                    <td>{selectedBooking.gstPercent ? `${selectedBooking.gstPercent}%` : "0.00%"} / {adminProfitFormatter.format(Number(selectedBooking.gstAmountInr) || 0)}</td>
                    <td>Applicable GST taxes</td>
                  </tr>
                  <tr className="admin-view-highlight-row">
                    <td><strong>Calculated Profit / Loss</strong></td>
                    <td>
                      <strong className={getProfitClassName(selectedBooking.calculatedProfit)}>
                        {adminProfitFormatter.format(Number(selectedBooking.calculatedProfit) || 0)}
                      </strong>
                    </td>
                    <td>
                      <span className={getProfitClassName(selectedBooking.calculatedProfit)}>
                        {getProfitLabel(selectedBooking.calculatedProfit)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Payment & Fulfillment Information */}
            <div className="admin-view-section">
              <h3 className="admin-view-section-title">Payment Information</h3>
              <table className="admin-view-table">
                <tbody>
                  <tr>
                    <th>Payment Status</th>
                    <td>
                      <span className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.paymentStatus)}`}>
                        {getPaymentStatusDisplay(selectedBooking.paymentStatus)}
                      </span>
                    </td>
                    <th>Refund Status</th>
                    <td>
                      <span className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.refundStatus)}`}>
                        {getPaymentStatusDisplay(selectedBooking.refundStatus)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Fulfillment Status</th>
                    <td colSpan="3">
                      <span className={`admin-ps-badge ${getPaymentStatusClass(selectedBooking.fulfillmentStatus)}`}>
                        {getPaymentStatusDisplay(selectedBooking.fulfillmentStatus)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 4: Passengers Table */}
            {selectedBooking.passengers && selectedBooking.passengers.length > 0 ? (
              <div className="admin-view-section">
                <h3 className="admin-view-section-title">Passenger Details (P.d)</h3>
                <table className="admin-view-table">
                  <thead>
                    <tr>
                      <th style={{ width: "10%" }}>#</th>
                      <th style={{ width: "40%" }}>Full Name</th>
                      <th style={{ width: "25%" }}>Gender</th>
                      <th style={{ width: "25%" }}>Seat Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking.passengers.map((p, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{safeValue(p.fullName)}</td>
                        <td>{safeValue(p.gender)}</td>
                        <td>{safeValue(p.seatNumber)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Section 5: Cancellation & Refund Breakdown */}
            {selectedBooking.status === "Cancelled" || selectedBooking.cancelledAtUtc ? (
              <div className="admin-view-section">
                <h3 className="admin-view-section-title" style={{ color: "#ef4444" }}>Cancellation & Refund Breakdown</h3>
                <table className="admin-view-table">
                  <tbody>
                    <tr>
                      <th>Cancelled Date (UTC)</th>
                      <td>{formatAdminDate(selectedBooking.cancelledAtUtc || selectedBooking.cancelledAt)}</td>
                      <th>Cancellation Reason</th>
                      <td>{safeValue(selectedBooking.cancellationReason)}</td>
                    </tr>
                    <tr>
                      <th>Cancellation Fee</th>
                      <td>{adminProfitFormatter.format(Number(selectedBooking.cancellationChargeInr || selectedBooking.cancellationCharge) || 0)}</td>
                      <th>Refund Amount</th>
                      <td>{adminProfitFormatter.format(Number(selectedBooking.refundAmountInr || selectedBooking.refundAmount) || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
