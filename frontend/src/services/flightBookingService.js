/* eslint-disable */
const FALLBACK_API_BASE_URL =
  "https://undogmatically-knotlike-evita.ngrok-free.dev";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
function isLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

function resolveApiBaseUrl() {
  const preferProxyInDev =
    isLocalDevelopment() &&
    String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() !==
    "true";

  if (preferProxyInDev) {
    return "";
  }

  const explicitBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_FLIGHT_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

  // Reuse the Places API host when present, so all APIs stay on the same backend.
  const placesUrl = process.env.REACT_APP_PLACES_API_URL;
  if (placesUrl && placesUrl.trim()) {
    try {
      return new URL(placesUrl.trim()).origin;
    } catch {
      // Fall through to default.
    }
  }

  return FALLBACK_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

const FLIGHT_BOOKINGS_ROOT = "/api/FlightBookings";
const ADMIN_FLIGHT_ROOT = "/api/admin/flight";
const ADMIN_FLIGHT_MARKUPS_ROOT = "/api/admin/flight-markups";
const ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT =
  "/api/admin/flight-convenience-fee-rules";

const FALLBACK_FLIGHT_TEMPLATES = [
  {
    airline: "IndiGo",
    flightNumber: "6E 6782",
    departureOffsetMinutes: 60,
    durationMinutes: 115,
    classOptions: [
      { travelClass: "Economy", priceInr: 4820, availableSeats: 18, totalSeats: 120 },
      { travelClass: "Business", priceInr: 10340, availableSeats: 7, totalSeats: 18 },
    ],
  },
  {
    airline: "Air India",
    flightNumber: "AI 502",
    departureOffsetMinutes: 120,
    durationMinutes: 130,
    classOptions: [
      { travelClass: "Economy", priceInr: 5390, availableSeats: 14, totalSeats: 128 },
      { travelClass: "Premium Economy", priceInr: 7280, availableSeats: 9, totalSeats: 24 },
      { travelClass: "Business", priceInr: 11920, availableSeats: 4, totalSeats: 16 },
    ],
  },
  {
    airline: "Akasa Air",
    flightNumber: "QP 1456",
    departureOffsetMinutes: 175,
    durationMinutes: 125,
    classOptions: [
      { travelClass: "Economy", priceInr: 4540, availableSeats: 22, totalSeats: 140 },
      { travelClass: "Premium Economy", priceInr: 6920, availableSeats: 8, totalSeats: 22 },
    ],
  },
  {
    airline: "Air India Express",
    flightNumber: "IX 912",
    departureOffsetMinutes: 230,
    durationMinutes: 140,
    classOptions: [
      { travelClass: "Economy", priceInr: 4180, availableSeats: 26, totalSeats: 132 },
      { travelClass: "Business", priceInr: 10890, availableSeats: 5, totalSeats: 14 },
    ],
  },
];

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/${urlOrPath.replace(/^\/+/, "")}`;
  }

  return urlOrPath;
}

function shouldUseNgrokBypass(urlOrPath) {
  try {
    const parsed = new URL(toAbsoluteUrl(urlOrPath), window.location.origin);
    return (
      parsed.hostname.includes("ngrok-free.dev") ||
      parsed.hostname.includes("ngrok.io")
    );
  } catch {
    return false;
  }
}

function buildUrl(path, query = {}) {
  const base = toAbsoluteUrl(path);
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue =
      typeof value === "string" ? value.trim() : String(value);

    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });

  return params.toString() ? `${base}?${params.toString()}` : base;
}

function parseDateStart(dateText) {
  const [year, month, day] = String(dateText || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
  }

  return new Date(year, month - 1, day, 6, 0, 0, 0);
}

function formatIso(date) {
  const value = date instanceof Date ? date : new Date(date || "");
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function buildFallbackFlights({ from, to, date }) {
  const source = String(from || "").trim() || "Hyderabad";
  const destination = String(to || "").trim() || "Bengaluru";
  const dateStart = parseDateStart(date);

  return FALLBACK_FLIGHT_TEMPLATES.map((template, index) => {
    const departureDate = new Date(
      dateStart.getTime() + template.departureOffsetMinutes * 60000
    );
    const arrivalDate = new Date(
      departureDate.getTime() + template.durationMinutes * 60000
    );
    const totalAvailableSeats = template.classOptions.reduce(
      (sum, option) => sum + Number(option.availableSeats || 0),
      0
    );

    return {
      id: `fallback-flight-${index + 1}`,
      airline: template.airline,
      flightNumber: template.flightNumber,
      fromCity: source,
      toCity: destination,
      departureTimeIst: formatIso(departureDate),
      arrivalTimeIst: formatIso(arrivalDate),
      departureTimeUtc: formatIso(departureDate),
      arrivalTimeUtc: formatIso(arrivalDate),
      classOptions: template.classOptions,
      selectedTravelClass: template.classOptions[0].travelClass,
      selectedTravelClassPriceInr: template.classOptions[0].priceInr,
      selectedTravelClassAvailableSeats: template.classOptions[0].availableSeats,
      selectedTravelClassTotalSeats: template.classOptions[0].totalSeats,
      supportedTravelClasses: template.classOptions.map((option) => option.travelClass),
      totalAvailableSeats,
      totalSeats: totalAvailableSeats,
      isFallback: true,
    };
  });
}

function shouldUseFallbackFlights(error) {
  const status = Number(error?.status);
  if ([401, 403, 404, 405, 502, 503, 504].includes(status)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("cannot get /api/flightbookings") ||
    message.includes("err_ngrok_3200") ||
    message.includes("err_ngrok_3004") ||
    message.includes("err_ngrok_8012") ||
    message.includes("bad gateway") ||
    message.includes("service unavailable") ||
    (message.includes("endpoint") && message.includes("offline")) ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
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

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function resolveAuthToken(urlOrPath = "") {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const isUrlAdmin = String(urlOrPath || "").toLowerCase().includes("/admin/") ||
      window.location.pathname.toLowerCase().startsWith("/admin");
    if (isUrlAdmin) {
      const adminToken = window.localStorage.getItem("adminToken");
      if (adminToken && adminToken !== "undefined" && adminToken !== "null") {
        return normalizeText(adminToken, "");
      }
    }
    const activePortal = window.sessionStorage.getItem("active_portal") || "b2c";
    const resolvedToken = activePortal === "b2b"
      ? (window.localStorage.getItem("b2b_token") || window.localStorage.getItem("token"))
      : (window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token"));
    return normalizeText(
      resolvedToken || window.localStorage.getItem("adminToken"),
      ""
    );
  } catch {
    return "";
  }
}

function normalizeFlightClassOption(option) {
  const travelClass = String(
    pickFirst(option, ["travelClass", "TravelClass"], "")
  ).trim();

  return {
    travelClass,
    priceInr: Number(pickFirst(option, ["priceInr", "PriceInr"], 0)) || 0,
    availableSeats:
      Number(pickFirst(option, ["availableSeats", "AvailableSeats"], 0)) || 0,
    totalSeats: Number(pickFirst(option, ["totalSeats", "TotalSeats"], 0)) || 0,
  };
}

function normalizeFlightSearchRecord(record, index = 0) {
  const classOptionsRaw = pickFirst(
    record,
    ["classOptions", "ClassOptions", "travelClassOptions", "TravelClassOptions"],
    []
  );
  const classOptions = Array.isArray(classOptionsRaw)
    ? classOptionsRaw
      .map((option) => normalizeFlightClassOption(option))
      .filter((option) => option.travelClass)
    : [];
  const selectedTravelClass = String(
    pickFirst(
      record,
      ["selectedTravelClass", "SelectedTravelClass", "travelClass", "TravelClass"],
      classOptions[0]?.travelClass || ""
    ) || ""
  ).trim();

  const selectedOption =
    classOptions.find((option) => option.travelClass === selectedTravelClass) ||
    classOptions[0] ||
    null;

  const seatsFromOptions = classOptions.reduce(
    (sum, option) => sum + Number(option.availableSeats || 0),
    0
  );

  const supportedTravelClassesRaw = pickFirst(
    record,
    ["supportedTravelClasses", "SupportedTravelClasses"],
    []
  );
  const supportedTravelClasses = Array.isArray(supportedTravelClassesRaw)
    ? supportedTravelClassesRaw.map((value) => String(value || "").trim()).filter(Boolean)
    : classOptions.map((option) => option.travelClass);

  return {
    id:
      pickFirst(record, ["id", "Id", "flightId", "FlightId"], null) ||
      `flight-${index + 1}`,
    airline: String(
      pickFirst(
        record,
        ["airline", "Airline", "airlineName", "AirlineName", "providerName", "ProviderName"],
        "Unknown Airline"
      ) || "Unknown Airline"
    ),
    flightNumber: String(
      pickFirst(record, ["flightNumber", "FlightNumber", "tripNumber", "TripNumber"], "--") ||
      "--"
    ),
    cabinClass: String(pickFirst(record, ["cabinClass", "CabinClass"], "") || ""),
    fromCity: String(pickFirst(record, ["fromCity", "FromCity", "source", "Source"], "") || ""),
    toCity: String(
      pickFirst(record, ["toCity", "ToCity", "destination", "Destination"], "") || ""
    ),
    departureTimeIst: pickFirst(
      record,
      ["departureTimeIst", "DepartureTimeIst", "departureDateTimeIst", "DepartureDateTimeIst"],
      null
    ),
    arrivalTimeIst: pickFirst(
      record,
      ["arrivalTimeIst", "ArrivalTimeIst", "arrivalDateTimeIst", "ArrivalDateTimeIst"],
      null
    ),
    departureTimeUtc: pickFirst(
      record,
      ["departureTimeUtc", "DepartureTimeUtc", "departureDateTimeUtc", "DepartureDateTimeUtc"],
      null
    ),
    arrivalTimeUtc: pickFirst(
      record,
      ["arrivalTimeUtc", "ArrivalTimeUtc", "arrivalDateTimeUtc", "ArrivalDateTimeUtc"],
      null
    ),
    classOptions,
    selectedTravelClass:
      selectedTravelClass || selectedOption?.travelClass || "Economy",
    selectedTravelClassPriceInr:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0),
    selectedTravelClassAvailableSeats:
      Number(
        pickFirst(
          record,
          ["selectedTravelClassAvailableSeats", "SelectedTravelClassAvailableSeats"],
          null
        )
      ) ||
      Number(selectedOption?.availableSeats || 0),
    selectedTravelClassTotalSeats:
      Number(
        pickFirst(
          record,
          ["selectedTravelClassTotalSeats", "SelectedTravelClassTotalSeats"],
          null
        )
      ) ||
      Number(selectedOption?.totalSeats || 0),
    totalAvailableSeats:
      Number(pickFirst(record, ["totalAvailableSeats", "TotalAvailableSeats"], null)) ||
      seatsFromOptions,
    totalSeats:
      Number(pickFirst(record, ["totalSeats", "TotalSeats"], null)) ||
      Number(pickFirst(record, ["totalAvailableSeats", "TotalAvailableSeats"], null)) ||
      seatsFromOptions,
    supportedTravelClasses,
  };
}

function normalizeFlightPassenger(passenger, index = 0) {
  return {
    fullName: String(
      pickFirst(passenger, ["fullName", "FullName", "name", "Name"], `Passenger ${index + 1}`)
    ),
    passengerType: String(
      pickFirst(passenger, ["passengerType", "PassengerType"], "Adult")
    ),
    gender: String(pickFirst(passenger, ["gender", "Gender"], "")),
    seatNumber: pickFirst(passenger, ["seatNumber", "SeatNumber"], null),
  };
}

function normalizeFlightBookingRecord(record) {
  const passengersRaw = pickFirst(record, ["passengers", "Passengers"], []);
  const passengers = Array.isArray(passengersRaw)
    ? passengersRaw.map((passenger, index) => normalizeFlightPassenger(passenger, index))
    : [];
  const seatsBookedFallback = passengers.filter(
    (passenger) => String(passenger.passengerType || "").toLowerCase() !== "infant"
  ).length;

  return {
    bookingId: pickFirst(record, ["bookingId", "BookingId"], null),
    bookingReference: String(
      pickFirst(record, ["bookingReference", "BookingReference"], "") || ""
    ),
    passengerName: String(
      pickFirst(record, ["passengerName", "PassengerName"], "") || ""
    ),
    passengerPhone: String(
      pickFirst(record, ["passengerPhone", "PassengerPhone"], "") || ""
    ),
    passengerEmail: String(
      pickFirst(record, ["passengerEmail", "PassengerEmail"], "") || ""
    ),
    fromCity: String(pickFirst(record, ["fromCity", "FromCity"], "") || ""),
    toCity: String(pickFirst(record, ["toCity", "ToCity"], "") || ""),
    providerName: String(
      pickFirst(record, ["providerName", "ProviderName", "airline", "Airline"], "") || ""
    ),
    departureTimeUtc: pickFirst(
      record,
      ["departureTimeUtc", "DepartureTimeUtc", "departureDateTimeUtc", "DepartureDateTimeUtc"],
      null
    ),
    travelClass: String(
      pickFirst(record, ["travelClass", "TravelClass"], "") || ""
    ),
    seatsBooked:
      Number(pickFirst(record, ["seatsBooked", "SeatsBooked"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Unknown") || "Unknown"),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
    tripNumber: String(
      pickFirst(record, ["tripNumber", "TripNumber", "flightNumber", "FlightNumber"], "") ||
      ""
    ),
    passengers,
  };
}

function normalizeFlightCouponRecord(record) {
  const couponType = String(
    pickFirst(record, ["couponType", "CouponType", "cpnType", "CpnType"], "") || ""
  );
  const status = String(pickFirst(record, ["status", "Status"], "") || "")
    .trim()
    .toLowerCase();

  return {
    id: pickFirst(record, ["id", "Id"], null),
    value: Number(pickFirst(record, ["value", "Value"], 0)) || 0,
    couponType,
    cpnType: couponType,
    couponCode: String(
      pickFirst(record, ["couponCode", "CouponCode"], "") || ""
    ).toUpperCase(),
    startDate: String(pickFirst(record, ["startDate", "StartDate"], "") || ""),
    expiryDate: String(pickFirst(record, ["expiryDate", "ExpiryDate"], "") || ""),
    useLimit: Number(pickFirst(record, ["useLimit", "UseLimit"], 0)) || 0,
    usedCount: Number(pickFirst(record, ["usedCount", "UsedCount"], 0)) || 0,
    status,
    entryDate: pickFirst(
      record,
      ["entryDate", "EntryDate", "entryDateUtc", "EntryDateUtc", "insertDateUtc", "InsertDateUtc"],
      null
    ),
    remark: String(pickFirst(record, ["remark", "Remark"], "") || ""),
  };
}

function toCouponRequestDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function toFlightCouponRequestPayload(coupon) {
  return {
    value: Number(pickFirst(coupon, ["value", "Value"], 0)) || 0,
    couponType: String(
      pickFirst(coupon, ["couponType", "CouponType", "cpnType", "CpnType"], "") || ""
    ).trim(),
    couponCode: String(pickFirst(coupon, ["couponCode", "CouponCode"], "") || "")
      .trim()
      .toUpperCase(),
    startDate: toCouponRequestDate(pickFirst(coupon, ["startDate", "StartDate"], "")),
    expiryDate: toCouponRequestDate(pickFirst(coupon, ["expiryDate", "ExpiryDate"], "")),
    useLimit: Number(pickFirst(coupon, ["useLimit", "UseLimit"], 0)) || 0,
    status: String(pickFirst(coupon, ["status", "Status"], "active") || "active").trim(),
    remark: String(pickFirst(coupon, ["remark", "Remark"], "") || "").trim(),
  };
}

function normalizeFlightDiscountRecord(record) {
  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    value: Number(pickFirst(record, ["value", "Value"], 0)) || 0,
    discountType: String(
      pickFirst(record, ["discountType", "DiscountType"], "Percentage") ||
      "Percentage"
    ),
    name: String(pickFirst(record, ["name", "Name"], "") || ""),
    entryDate: pickFirst(
      record,
      ["entryDate", "EntryDate", "entryDateUtc", "EntryDateUtc", "insertDateUtc", "InsertDateUtc"],
      null
    ),
    updateDate: pickFirst(
      record,
      ["updateDate", "UpdateDate", "updateDateUtc", "UpdateDateUtc", "updatedAtUtc", "UpdatedAtUtc"],
      null
    ),
    updatedBy: String(pickFirst(record, ["updatedBy", "UpdatedBy"], "Admin") || "Admin"),
    remark: String(pickFirst(record, ["remark", "Remark"], "") || ""),
    status: String(pickFirst(record, ["status", "Status"], "Active") || "Active"),
  };
}

function toFlightDiscountRequestPayload(discount) {
  const discountType = String(
    pickFirst(discount, ["discountType", "DiscountType", "type"], "Percentage") ||
    "Percentage"
  ).trim();
  const value = Number(pickFirst(discount, ["value", "Value"], 0)) || 0;

  return {
    value,
    discountType,
    name: String(
      pickFirst(discount, ["name", "Name"], `${discountType || "Flight"} Discount`) ||
      `${discountType || "Flight"} Discount`
    ).trim(),
    status: String(pickFirst(discount, ["status", "Status"], "Active") || "Active").trim(),
    updatedBy: String(
      pickFirst(discount, ["updatedBy", "UpdatedBy"], "Admin") || "Admin"
    ).trim(),
    remark: String(pickFirst(discount, ["remark", "Remark"], "") || "").trim(),
  };
}

function normalizeDiscountConditionRecord(record) {
  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    flightDiscountId: pickFirst(
      record,
      ["flightDiscountId", "FlightDiscountId", "discountId", "DiscountId"],
      null
    ),
    conditionType: String(
      pickFirst(record, ["conditionType", "ConditionType"], "") || ""
    ),
    conditionOperator: String(
      pickFirst(
        record,
        ["conditionOperator", "ConditionOperator", "operator", "Operator"],
        ""
      ) || ""
    ),
    value1: String(pickFirst(record, ["value1", "Value1"], "") || ""),
    value2: pickFirst(record, ["value2", "Value2"], null),
  };
}

function normalizeAirlineWebCheckRecord(record) {
  const airline = String(
    pickFirst(record, ["airline", "Airline", "airlineName", "AirlineName"], "") || ""
  );
  const airlineCode = String(
    pickFirst(record, ["airlineCode", "AirlineCode", "code", "Code"], "") || ""
  );
  const url = String(
    pickFirst(record, ["url", "Url", "webCheckinUrl", "WebCheckinUrl"], "") || ""
  );

  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    airline,
    airlineName: airline,
    airlineCode,
    code: airlineCode,
    url,
    webCheckinUrl: url,
  };
}

function toAirlineWebCheckRequestPayload(link) {
  const airline = String(
    pickFirst(link, ["airline", "Airline", "airlineName", "AirlineName", "name"], "") ||
    ""
  ).trim();
  const airlineCode = String(
    pickFirst(link, ["airlineCode", "AirlineCode", "code", "Code"], "") ||
    airline.slice(0, 2)
  )
    .trim()
    .toUpperCase();
  const url = String(
    pickFirst(link, ["url", "Url", "webCheckinUrl", "WebCheckinUrl"], "") || ""
  ).trim();

  return {
    airline,
    airlineCode,
    url,
  };
}

function normalizePopularDestinationRecord(record) {
  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    title: String(
      pickFirst(record, ["title", "Title", "destinationName", "DestinationName"], "") ||
      ""
    ),
    subTitle: String(pickFirst(record, ["subTitle", "SubTitle"], "") || ""),
    category: String(pickFirst(record, ["category", "Category"], "") || ""),
    placement: String(pickFirst(record, ["placement", "Placement"], "main") || "main"),
    url: String(pickFirst(record, ["url", "Url"], "") || ""),
    imageUrl: String(pickFirst(record, ["imageUrl", "ImageUrl"], "") || ""),
    status: String(pickFirst(record, ["status", "Status"], "Active") || "Active"),
    entryDate: pickFirst(
      record,
      ["entryDate", "EntryDate", "createdAt", "CreatedAt", "createdAtUtc", "CreatedAtUtc"],
      null
    ),
  };
}

function toPopularDestinationRequestPayload(destination) {
  return {
    title: String(
      pickFirst(destination, ["title", "Title", "destinationName", "DestinationName"], "") ||
      ""
    ).trim(),
    subTitle: String(pickFirst(destination, ["subTitle", "SubTitle"], "") || "").trim(),
    imageUrl: String(pickFirst(destination, ["imageUrl", "ImageUrl"], "") || "").trim(),
    category: String(
      pickFirst(destination, ["category", "Category"], "Domestic") || "Domestic"
    ).trim(),
    placement: String(
      pickFirst(destination, ["placement", "Placement"], "main") || "main"
    ).trim(),
    url: String(pickFirst(destination, ["url", "Url"], "") || "").trim(),
    status: String(pickFirst(destination, ["status", "Status"], "Active") || "Active").trim(),
  };
}

function normalizeTripType(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "roundtrip" || key === "round trip" || key === "int" || key === "international") {
    return "RoundTrip";
  }

  return "OneWay";
}

function normalizeFlatPercentage(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "percentage" || key === "percent" || key === "%") {
    return "Percentage";
  }

  return "Flat";
}

function normalizeConvenienceFeeRuleRecord(record) {
  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    tripType: normalizeTripType(pickFirst(record, ["tripType", "TripType"], "OneWay")),
    feeType: normalizeFlatPercentage(
      pickFirst(record, ["feeType", "FeeType", "amountType", "AmountType"], "Flat")
    ),
    feeValue: Number(
      pickFirst(record, ["feeValue", "FeeValue", "value", "Value"], 0)
    ) || 0,
    isActive: pickFirst(record, ["isActive", "IsActive"], true) !== false,
  };
}

function toConvenienceFeeRuleRequestPayload(rule) {
  return {
    tripType: normalizeTripType(pickFirst(rule, ["tripType", "TripType"], "OneWay")),
    feeType: normalizeFlatPercentage(
      pickFirst(rule, ["feeType", "FeeType", "amountType", "AmountType"], "Flat")
    ),
    feeValue: Number(pickFirst(rule, ["feeValue", "FeeValue", "value", "Value"], 0)) || 0,
    isActive: pickFirst(rule, ["isActive", "IsActive"], true) !== false,
  };
}

function normalizeFlightMarkupRecord(record) {
  return {
    ...record,
    id: pickFirst(record, ["id", "Id"], null),
    airlineCode: String(pickFirst(record, ["airlineCode", "AirlineCode"], "*") || "*"),
    tripType: normalizeTripType(pickFirst(record, ["tripType", "TripType"], "OneWay")),
    markupType: normalizeFlatPercentage(
      pickFirst(record, ["markupType", "MarkupType"], "Flat")
    ),
    markupValue: Number(pickFirst(record, ["markupValue", "MarkupValue"], 0)) || 0,
    priority: Number(pickFirst(record, ["priority", "Priority"], 5)) || 5,
    isActive: pickFirst(record, ["isActive", "IsActive"], true) !== false,
    createdAtUtc: pickFirst(record, ["createdAtUtc", "CreatedAtUtc"], null),
    updatedAtUtc: pickFirst(record, ["updatedAtUtc", "UpdatedAtUtc"], null),
  };
}

function toFlightMarkupRequestPayload(markup) {
  return {
    airlineCode: String(pickFirst(markup, ["airlineCode", "AirlineCode", "code"], "*") || "*")
      .trim()
      .toUpperCase(),
    tripType: normalizeTripType(pickFirst(markup, ["tripType", "TripType"], "OneWay")),
    markupType: normalizeFlatPercentage(
      pickFirst(markup, ["markupType", "MarkupType"], "Flat")
    ),
    markupValue: Number(pickFirst(markup, ["markupValue", "MarkupValue", "value"], 0)) || 0,
    priority: Number(pickFirst(markup, ["priority", "Priority"], 5)) || 5,
    isActive: pickFirst(markup, ["isActive", "IsActive"], true) !== false,
  };
}

function mergeAdminCancellationPayload(payload) {
  return {
    flightReservationId: Number(
      pickFirst(payload, ["flightReservationId", "FlightReservationId"], 0)
    ) || 0,
    cancellationStatus: String(
      pickFirst(payload, ["cancellationStatus", "CancellationStatus", "status"], "Pending") ||
      "Pending"
    ),
    customerRefundStatus: String(
      pickFirst(payload, ["customerRefundStatus", "CustomerRefundStatus"], "Pending") ||
      "Pending"
    ),
    adminRefundStatus: String(
      pickFirst(payload, ["adminRefundStatus", "AdminRefundStatus"], "Pending") ||
      "Pending"
    ),
    customerRefundAmountInr:
      Number(pickFirst(payload, ["customerRefundAmountInr", "CustomerRefundAmountInr"], 0)) ||
      0,
    customerCancellationChargeInr:
      Number(
        pickFirst(
          payload,
          ["customerCancellationChargeInr", "CustomerCancellationChargeInr"],
          0
        )
      ) || 0,
    customerServiceChargeInr:
      Number(pickFirst(payload, ["customerServiceChargeInr", "CustomerServiceChargeInr"], 0)) ||
      0,
    adminRefundAmountInr:
      Number(pickFirst(payload, ["adminRefundAmountInr", "AdminRefundAmountInr"], 0)) || 0,
    adminCancellationChargeInr:
      Number(
        pickFirst(payload, ["adminCancellationChargeInr", "AdminCancellationChargeInr"], 0)
      ) || 0,
    adminServiceChargeInr:
      Number(pickFirst(payload, ["adminServiceChargeInr", "AdminServiceChargeInr"], 0)) || 0,
    supplierRemark: pickFirst(payload, ["supplierRemark", "SupplierRemark"], null),
    customerRemark: pickFirst(payload, ["customerRemark", "CustomerRemark"], null),
    adminRemark: pickFirst(payload, ["adminRemark", "AdminRemark"], null),
  };
}

function mergeAdminAmendmentPayload(payload) {
  return {
    flightReservationId: Number(
      pickFirst(payload, ["flightReservationId", "FlightReservationId"], 0)
    ) || 0,
    amendmentStatus: String(
      pickFirst(payload, ["amendmentStatus", "AmendmentStatus", "status"], "Pending") ||
      "Pending"
    ),
    supplierRemark: pickFirst(payload, ["supplierRemark", "SupplierRemark"], null),
    customerRemark: pickFirst(payload, ["customerRemark", "CustomerRemark"], null),
    adminRemark: pickFirst(payload, ["adminRemark", "AdminRemark"], null),
  };
}

function normalizeFlightActionResponse(response) {
  if (!response || typeof response !== "object") {
    return response;
  }

  return {
    ...response,
    bookingId: pickFirst(response, ["bookingId", "BookingId"], response.bookingId),
    bookingReference: pickFirst(
      response,
      ["bookingReference", "BookingReference"],
      response.bookingReference
    ),
    status: pickFirst(response, ["status", "Status"], response.status),
    message: pickFirst(response, ["message", "Message"], response.message),
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text;
}

function normalizeErrorMessage(payload) {
  if (typeof payload === "string") {
    const text = payload.trim();
    if (!text) {
      return "";
    }

    // ngrok / express error pages may return HTML with a <pre> message.
    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch?.[1]) {
      return preMatch[1].replace(/\s+/g, " ").trim();
    }

    const noTags = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (noTags) {
      return noTags;
    }

    return text;
  }

  if (payload && typeof payload?.message === "string") {
    return payload.message.trim();
  }

  return "";
}

async function requestJson(urlOrPath, options = {}) {
  const {
    skipAuth = false,
    userId: _userId,
    requireUserId: _requireUserId,
    ...fetchOptions
  } = options || {};
  const resolvedToken = skipAuth ? "" : resolveAuthToken(urlOrPath);
  const headers = {
    Accept: "application/json",
    ...(resolvedToken && !options?.headers?.Authorization
      ? { Authorization: `Bearer ${resolvedToken}` }
      : {}),
    ...(options.headers || {}),
  };

  if (fetchOptions.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (shouldUseNgrokBypass(urlOrPath)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(toAbsoluteUrl(urlOrPath), {
    ...fetchOptions,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const normalizedMessage = normalizeErrorMessage(payload);
    if (normalizedMessage) {
      throw new Error(normalizedMessage);
    }

    throw new Error("Request failed. Please try again.");
  }

  return payload;
}

export async function searchFlights({ from, to, date, travelClass }) {
  const url = buildUrl(FLIGHT_BOOKINGS_ROOT, {
    from,
    fromCity: from,
    to,
    toCity: to,
    date,
    class: travelClass,
    travelClass,
  });

  try {
    const data = await requestJson(url, { method: "GET" });

    const records = Array.isArray(data)
      ? data
      : Array.isArray(data?.flights)
      ? data.flights
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results)
      ? data.results
      : [];

    return records.map((record, index) => normalizeFlightSearchRecord(record, index));
  } catch (error) {
    console.error("[flightBookingService] searchFlights Error:", error);
    throw error;
  }
}

export function isFallbackFlightId(flightId) {
  const normalized = String(flightId || "").toLowerCase();
  return normalized.startsWith("fallback-flight-") || normalized.startsWith("fallback_flight-") || normalized.startsWith("fallback_flight_");
}

export async function bookFlight({ flightId, payload, userId } = {}) {
  if (isFallbackFlightId(flightId)) {
    throw new Error("Invalid flight selection. Please go back and re-select your flight.");
  }

  const data = await requestJson(`${FLIGHT_BOOKINGS_ROOT}/${flightId}/book`, {
    method: "POST",
    body: JSON.stringify(payload),
    userId,
    requireUserId: true,
  });

  return normalizeFlightActionResponse(data);
}

export async function listFlightCoupons() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/coupons`, { method: "GET" });

  return Array.isArray(data)
    ? data.map((record) => normalizeFlightCouponRecord(record))
    : [];
}

export async function createFlightCoupon(coupon) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/coupons`, {
    method: "POST",
    body: JSON.stringify(toFlightCouponRequestPayload(coupon)),
  });

  return normalizeFlightCouponRecord(data);
}

export async function updateFlightCoupon(couponId, coupon) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/coupons/${couponId}`, {
    method: "PUT",
    body: JSON.stringify(toFlightCouponRequestPayload(coupon)),
  });

  return normalizeFlightCouponRecord(data);
}

export async function deleteFlightCoupon(couponId) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/coupons/${couponId}`, {
    method: "DELETE",
  });
}

export async function listFlightDiscounts() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/discounts`, { method: "GET" });

  return Array.isArray(data)
    ? data.map((record) => normalizeFlightDiscountRecord(record))
    : [];
}

export async function createFlightDiscount(discount) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/discounts`, {
    method: "POST",
    body: JSON.stringify(toFlightDiscountRequestPayload(discount)),
  });

  return normalizeFlightDiscountRecord(data);
}

export async function updateFlightDiscount(discountId, discount) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/discounts/${discountId}`, {
    method: "PUT",
    body: JSON.stringify(toFlightDiscountRequestPayload(discount)),
  });

  return normalizeFlightDiscountRecord(data);
}

export async function deleteFlightDiscount(discountId) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/discounts/${discountId}`, {
    method: "DELETE",
  });
}

export async function listDiscountConditions(discountId) {
  const data = await requestJson(
    `${ADMIN_FLIGHT_ROOT}/discounts/${discountId}/conditions`,
    { method: "GET" }
  );

  return Array.isArray(data)
    ? data.map((record) => normalizeDiscountConditionRecord(record))
    : [];
}

export async function addDiscountCondition(discountId, condition) {
  const data = await requestJson(
    `${ADMIN_FLIGHT_ROOT}/discounts/${discountId}/conditions`,
    {
      method: "POST",
      body: JSON.stringify(condition),
    }
  );

  return normalizeDiscountConditionRecord(data?.condition || data);
}

export async function deleteDiscountCondition(conditionId) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/discounts/conditions/${conditionId}`, {
    method: "DELETE",
  });
}

export async function listAirlineWebChecks() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/airline-webcheck`, {
    method: "GET",
  });

  return Array.isArray(data)
    ? data.map((record) => normalizeAirlineWebCheckRecord(record))
    : [];
}

export async function createAirlineWebCheck(link) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/airline-webcheck`, {
    method: "POST",
    body: JSON.stringify(toAirlineWebCheckRequestPayload(link)),
  });

  return normalizeAirlineWebCheckRecord(data);
}

export async function deleteAirlineWebCheck(linkId) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/airline-webcheck/${linkId}`, {
    method: "DELETE",
  });
}

export async function listPopularDestinations() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations`, {
    method: "GET",
  });

  return Array.isArray(data)
    ? data.map((record) => normalizePopularDestinationRecord(record))
    : [];
}

export async function createPopularDestination(destination) {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations`, {
    method: "POST",
    body: JSON.stringify(toPopularDestinationRequestPayload(destination)),
  });

  return normalizePopularDestinationRecord(data);
}

export async function updatePopularDestination(destinationId, destination) {
  const data = await requestJson(
    `${ADMIN_FLIGHT_ROOT}/popular-destinations/${destinationId}`,
    {
      method: "PUT",
      body: JSON.stringify(toPopularDestinationRequestPayload(destination)),
    }
  );

  return normalizePopularDestinationRecord(data);
}

export async function deletePopularDestination(destinationId) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/popular-destinations/${destinationId}`, {
    method: "DELETE",
  });
}

export async function listConvenienceFeeRules() {
  const data = await requestJson(ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT, {
    method: "GET",
  });

  return Array.isArray(data)
    ? data.map((record) => normalizeConvenienceFeeRuleRecord(record))
    : [];
}

export async function createConvenienceFeeRule(rule) {
  const data = await requestJson(ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT, {
    method: "POST",
    body: JSON.stringify(toConvenienceFeeRuleRequestPayload(rule)),
  });

  return normalizeConvenienceFeeRuleRecord(data);
}

export async function updateConvenienceFeeRule(ruleId, rule) {
  const data = await requestJson(
    `${ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT}/${ruleId}`,
    {
      method: "PUT",
      body: JSON.stringify(toConvenienceFeeRuleRequestPayload(rule)),
    }
  );

  return normalizeConvenienceFeeRuleRecord(data);
}

export async function listFlightMarkups() {
  const data = await requestJson(ADMIN_FLIGHT_MARKUPS_ROOT, { method: "GET" });

  return Array.isArray(data)
    ? data.map((record) => normalizeFlightMarkupRecord(record))
    : [];
}

export async function createFlightMarkup(markup) {
  const data = await requestJson(ADMIN_FLIGHT_MARKUPS_ROOT, {
    method: "POST",
    body: JSON.stringify(toFlightMarkupRequestPayload(markup)),
  });

  return normalizeFlightMarkupRecord(data);
}

export async function updateFlightMarkup(markupId, markup) {
  const data = await requestJson(`${ADMIN_FLIGHT_MARKUPS_ROOT}/${markupId}`, {
    method: "PUT",
    body: JSON.stringify(toFlightMarkupRequestPayload(markup)),
  });

  return normalizeFlightMarkupRecord(data);
}

export async function deleteFlightMarkup(markupId) {
  return requestJson(`${ADMIN_FLIGHT_MARKUPS_ROOT}/${markupId}`, {
    method: "DELETE",
  });
}

export async function listAdminCancellations() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/cancellations`, {
    method: "GET",
  });

  return Array.isArray(data) ? data : [];
}

export async function updateAdminCancellation(cancellationId, payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/cancellations/${cancellationId}`, {
    method: "PUT",
    body: JSON.stringify(mergeAdminCancellationPayload(payload)),
  });
}

export async function listAdminAmendments() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/amendments`, {
    method: "GET",
  });

  return Array.isArray(data) ? data : [];
}

export async function updateAdminAmendment(amendmentId, payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/amendments/${amendmentId}`, {
    method: "PUT",
    body: JSON.stringify(mergeAdminAmendmentPayload(payload)),
  });
}

export async function listFlightBookings({ passengerPhone, status, userId } = {}) {
  const url = buildUrl(`${FLIGHT_BOOKINGS_ROOT}/bookings`, {
    passengerPhone,
    status,
  });

  let apiBookings = [];
  try {
    const data = await requestJson(url, { method: "GET", userId, requireUserId: true });
    if (Array.isArray(data)) {
      apiBookings = data.map((record) => normalizeFlightBookingRecord(record));
    }
  } catch (error) {
    console.warn("Backend listFlightBookings failed, relying on mock storage", error);
  }

  // Get local mock bookings
  let mockBookings = [];
  try {
    const mockStr = localStorage.getItem("mock_tickets");
    if (mockStr) {
      const mockList = JSON.parse(mockStr);
      if (Array.isArray(mockList)) {
        mockBookings = mockList
          .filter((t) => String(t.ticketType || "").toLowerCase() === "flight")
          .map((t) => {
            const passengersRaw = Array.isArray(t.passengers) ? t.passengers : [];
            const passengersMapped = passengersRaw.map((p, idx) => ({
              passengerId: p.passengerId || idx + 1,
              name: p.name || "",
              gender: p.gender || "",
              status: p.status || t.status || "Booked",
              age: p.age || "",
              passengerType: p.passengerType || "Adult",
              seatNumber: p.seat || "",
            }));

            return {
              bookingId: t.bookingReference || `MOCK-${t.bookingReference}`,
              bookingReference: t.bookingReference || "",
              passengerName: passengersMapped[0]?.name || t.contact?.name || "Passenger",
              passengerPhone: t.contact?.mobile || t.contact?.phone || "",
              passengerEmail: t.contact?.email || "",
              fromCity: t.fromCity || "",
              toCity: t.toCity || "",
              providerName: t.providerName || "Airlines",
              departureTimeUtc: t.departureTime || null,
              arrivalTimeUtc: t.arrivalTime || null,
              travelClass: t.travelClass || "",
              seatsBooked: passengersMapped.length || 1,
              totalPriceInr: Number(t.totalPaid || t.fare?.totalFare || 0),
              status: t.status || "Booked",
              bookedAtUtc: t.bookedAt || null,
              cancelledAtUtc: null,
              cancellationReason: "",
              tripNumber: t.tripNumber || "",
              passengers: passengersMapped,
            };
          });
      }
    }
  } catch (e) {
    console.error("Error reading mock flight bookings:", e);
  }

  // Filter mock bookings by passengerPhone if supplied
  if (passengerPhone) {
    const cleanPhone = String(passengerPhone).replace(/\D/g, "");
    if (cleanPhone) {
      mockBookings = mockBookings.filter((b) => {
        const bPhone = String(b.passengerPhone || "").replace(/\D/g, "");
        return bPhone.includes(cleanPhone);
      });
    }
  }

  // Filter by status if supplied
  if (status && status !== "All") {
    mockBookings = mockBookings.filter((b) => {
      return String(b.status || "").toLowerCase() === String(status).toLowerCase();
    });
  }

  // Merge, avoiding duplicates by bookingReference
  const apiRefs = new Set(apiBookings.map((b) => b.bookingReference).filter(Boolean));
  const uniqueMocks = mockBookings.filter((b) => !apiRefs.has(b.bookingReference));

  return [...apiBookings, ...uniqueMocks];
}

export async function getFlightBookingById(bookingId, { userId } = {}) {
  try {
    const data = await requestJson(`${FLIGHT_BOOKINGS_ROOT}/bookings/${bookingId}`, {
      method: "GET",
      userId,
      requireUserId: true,
    });
    return normalizeFlightBookingRecord(data);
  } catch (error) {
    console.warn(`Backend getFlightBookingById for ${bookingId} failed, checking mock storage`, error);

    // Check localStorage
    try {
      const mockStr = localStorage.getItem("mock_tickets");
      if (mockStr) {
        const mockList = JSON.parse(mockStr);
        if (Array.isArray(mockList)) {
          const found = mockList.find(
            (t) =>
              (t.bookingReference === bookingId || `MOCK-${t.bookingReference}` === bookingId) &&
              String(t.ticketType || "").toLowerCase() === "flight"
          );
          if (found) {
            const passengersRaw = Array.isArray(found.passengers) ? found.passengers : [];
            const passengersMapped = passengersRaw.map((p, idx) => ({
              passengerId: p.passengerId || idx + 1,
              name: p.name || "",
              gender: p.gender || "",
              status: p.status || found.status || "Booked",
              age: p.age || "",
              passengerType: p.passengerType || "Adult",
              seatNumber: p.seat || "",
            }));

            return {
              bookingId: found.bookingReference || `MOCK-${found.bookingReference}`,
              bookingReference: found.bookingReference || "",
              passengerName: passengersMapped[0]?.name || found.contact?.name || "Passenger",
              passengerPhone: found.contact?.mobile || found.contact?.phone || "",
              passengerEmail: found.contact?.email || "",
              fromCity: found.fromCity || "",
              toCity: found.toCity || "",
              providerName: found.providerName || "Airlines",
              departureTimeUtc: found.departureTime || null,
              arrivalTimeUtc: found.arrivalTime || null,
              travelClass: found.travelClass || "",
              seatsBooked: passengersMapped.length || 1,
              totalPriceInr: Number(found.totalPaid || found.fare?.totalFare || 0),
              status: found.status || "Booked",
              bookedAtUtc: found.bookedAt || null,
              cancelledAtUtc: null,
              cancellationReason: "",
              tripNumber: found.tripNumber || "",
              passengers: passengersMapped,
            };
          }
        }
      }
    } catch (e) {
      console.error("Error reading mock ticket detail:", e);
    }

    throw error;
  }
}

export async function cancelFlightBooking(bookingId, reason, { userId } = {}) {
  const url = buildUrl(`${FLIGHT_BOOKINGS_ROOT}/bookings/${bookingId}/cancel`, {
    reason,
  });

  const data = await requestJson(url, { method: "POST", userId, requireUserId: true });
  return normalizeFlightActionResponse(data);
}

export async function cancelFlightPassengers(bookingId, passengerIds, reason, { userId } = {}) {
  const data = await requestJson(
    `${FLIGHT_BOOKINGS_ROOT}/bookings/${bookingId}/cancel-passengers`,
    {
      method: "POST",
      body: JSON.stringify({ passengerIds, reason }),
      userId,
      requireUserId: true,
    }
  );

  return normalizeFlightBookingRecord(data);
}


export async function listHotFlightRoutes({ metric = "score" } = {}) {
  try {
    const url = buildUrl(`${FLIGHT_BOOKINGS_ROOT}/hot-routes`, { metric });
    const data = await requestJson(url, { method: "GET", skipAuth: true });

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((record, index) => ({
      routeId:
        pickFirst(record, ["routeId", "RouteId"], null) || `flight-hot-${index + 1}`,
      fromCity: String(
        pickFirst(record, ["fromCity", "FromCity", "source", "Source"], "") || ""
      ),
      toCity: String(
        pickFirst(record, ["toCity", "ToCity", "destination", "Destination"], "") || ""
      ),
      score: Number(pickFirst(record, ["score", "Score"], 0)) || 0,
      searchCount: Number(pickFirst(record, ["searchCount", "SearchCount"], 0)) || 0,
      bookingCount:
        Number(pickFirst(record, ["bookingCount", "BookingCount"], 0)) || 0,
      ...record,
    }));
  } catch {
    return [];
  }
}

export async function getFlightSeatMap(flightId, travelClass, { userId } = {}) {
  const url = buildUrl(`${FLIGHT_BOOKINGS_ROOT}/${flightId}/seats`, {
    travelClass,
  });

  return requestJson(url, { method: "GET", userId });
}

export async function getFlightPricingPreview(payload, { userId } = {}) {
  return requestJson(`${FLIGHT_BOOKINGS_ROOT}/pricing-preview`, {
    method: "POST",
    body: JSON.stringify(payload),
    userId,
  });
}

export async function getFlightPromotions() {
  return requestJson("/api/FlightPromotions", {
    method: "GET",
    skipAuth: true,
  });
}

export async function listAirlineWebCheckins() {
  return listAirlineWebChecks();
}

export async function createAirlineWebCheckin(link) {
  return createAirlineWebCheck(link);
}

export async function deleteAirlineWebCheckin(linkId) {
  return deleteAirlineWebCheck(linkId);
}

export async function getConvenienceFee() {
  return listConvenienceFeeRules();
}

export async function createConvenienceFee(rule) {
  return createConvenienceFeeRule(rule);
}

export async function deleteConvenienceFee(ruleId) {
  return requestJson(`${ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT}/${ruleId}`, {
    method: "DELETE",
  });
}

export async function updateConvenienceFeeById(ruleId, rule) {
  return updateConvenienceFeeRule(ruleId, rule);
}

export async function listFlightPromotions() {
  return requestJson("/api/FlightPromotions", {
    method: "GET",
  });
}

export async function deleteFlightPromotion(id) {
  return requestJson(`/api/FlightPromotions/${id}`, {
    method: "DELETE",
  });
}

export async function getFlightPromotionById(id) {
  return requestJson(`/api/FlightPromotions/${id}`, {
    method: "GET",
  });
}

export async function createFlightPromotion(payload) {
  return requestJson("/api/FlightPromotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightPromotion(id, payload) {
  return requestJson(`/api/FlightPromotions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getPopularFlightRoutes() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/popular-routes`, {
    method: "GET",
  });
  return data || [];
}

export async function createPopularFlightRoute(payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/popular-routes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePopularFlightRoute(id, payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/popular-routes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePopularFlightRoute(id) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/popular-routes/${id}`, {
    method: "DELETE",
  });
}

export async function getUserRouteSearches() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/search-history`, {
    method: "GET",
  });
  return data || [];
}

export async function listAdminFlightBookings() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/bookings`, {
    method: "GET",
  });
  return Array.isArray(data)
    ? data.map((record) => normalizeFlightBookingRecord(record))
    : [];
}

export async function listFlightPendingAirlines() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines`, {
    method: "GET",
  });
  return data || [];
}

export async function deleteFlightPendingAirline(id) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, {
    method: "DELETE",
  });
}

export async function getFlightPendingAirlineById(id) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, {
    method: "GET",
  });
}

export async function createFlightPendingAirline(payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightPendingAirline(id, payload) {
  return requestJson(`${ADMIN_FLIGHT_ROOT}/pending-airlines/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getPopularDestinations() {
  return listPopularDestinations();
}

export async function listUsedCoupons() {
  const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/coupons/used`, {
    method: "GET",
  });
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((record) => ({
    id: record.id,
    bookingId: record.bookingId,
    couponCode: record.couponCode,
    usedDate: record.usedDateUtc || record.usedDate || "",
    totalFare: record.totalFareInr ?? record.totalFare ?? 0,
    cpnType: record.couponType || record.cpnType || "Fixed",
    cpnValue: record.couponValue ?? record.cpnValue ?? 0,
    cpnAmount: record.couponAmountInr ?? record.cpnAmount ?? 0,
    bookingStatus: record.bookingStatus || "Confirmed",
  }));
}

export async function getFlightRemarks() {
  return requestJson("/api/admin/flight/remarks", {
    method: "GET",
  });
}

export async function createFlightRemark(payload) {
  return requestJson("/api/admin/flight/remarks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFlightRemarkById(id) {
  return requestJson(`/api/admin/flight/remarks/${id}`, {
    method: "GET",
  });
}

export async function updateFlightRemark(id, payload) {
  return requestJson(`/api/admin/flight/remarks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightRemark(id) {
  return requestJson(`/api/admin/flight/remarks/${id}`, {
    method: "DELETE",
  });
}


