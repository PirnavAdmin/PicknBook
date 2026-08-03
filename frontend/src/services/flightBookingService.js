const FALLBACK_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";
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

const ADMIN_FLIGHT_ROOT = "/api/admin/flight";


// ─── SRDV API Root ─────────────────────────────────────────────────────────
const SRDV_ROOT = "/api/flight/srdv";

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




function extractFlightSearchList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.flat(Infinity);

  // SRDV MixAPI returns Results as array-of-arrays: Results = [[{...}, {...}], [{...}]]
  // where each inner array is one journey segment (onward, return, etc.)
  // We flatten to get all flight objects from the first segment (Results[0])
  const rawList =
    data?.Response?.Results ||
    data?.response?.results ||
    data?.Results ||
    data?.results ||
    data?.data ||
    data?.items ||
    data?.flights ||
    data?.records;

  if (Array.isArray(rawList)) {
    // SRDV MixAPI: Results = [[flight, flight, ...], [returnFlight, ...]]
    // For search results we take Results[0] (onward flights)
    if (rawList.length > 0 && Array.isArray(rawList[0])) {
      // It's an array of arrays — flatten the first segment
      return rawList[0].flat(Infinity);
    }
    return rawList.flat(Infinity);
  }

  return [];
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

function extractPrice(record) {
  if (!record) return 0;

  const directFields = [
    "price", "Price", "priceInr", "PriceInr", "fareInr", "FareInr", 
    "publishedFare", "PublishedFare", "offeredFare", "OfferedFare",
    "grandTotal", "GrandTotal", "totalFare", "TotalFare", "totalPrice", "TotalPrice",
    "amount", "Amount"
  ];

  for (const field of directFields) {
    const val = record[field];
    if (typeof val === "number" && val > 0) return val;
    if (typeof val === "string" && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
      return parseFloat(val);
    }
  }

  const rawFare = record.fare ?? record.Fare ?? record.fareDetails ?? record.FareDetails;
  if (typeof rawFare === "number" && rawFare > 0) return rawFare;
  if (typeof rawFare === "string") {
    const parsed = parseFloat(rawFare);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    try {
      const fareJson = JSON.parse(rawFare);
      if (typeof fareJson === "object" && fareJson) return extractPrice(fareJson);
    } catch {
      // ignore
    }
  }

  if (typeof rawFare === "object" && rawFare !== null) {
    const nestedFields = [
      "PublishedFare", "publishedFare", "OfferedFare", "offeredFare",
      "GrandTotal", "grandTotal", "TotalFare", "totalFare", "BaseFare", "baseFare",
      "Price", "price", "Amount", "amount", "Total", "total"
    ];
    for (const field of nestedFields) {
      const val = rawFare[field];
      if (typeof val === "number" && val > 0) return val;
      if (typeof val === "string" && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
        return parseFloat(val);
      }
    }
    const base = Number(rawFare.BaseFare || rawFare.baseFare || 0);
    const tax = Number(rawFare.Tax || rawFare.tax || 0);
    if (base + tax > 0) return base + tax;
  }

  const opts = record.classOptions || record.ClassOptions;
  if (Array.isArray(opts) && opts.length > 0) {
    const p = Number(opts[0]?.priceInr || opts[0]?.PriceInr || opts[0]?.price || opts[0]?.Price || 0);
    if (p > 0) return p;
  }

  return 0;
}

function extractSegmentsList(record) {
  if (!record) return [];
  let raw = record.segments ?? record.Segments ?? record.segmentsJson ?? record.SegmentsJson ?? record.FareSegments ?? record.fareSegments;
  if (!raw && record.FareDataMultiple && record.FareDataMultiple.length > 0) {
    raw = record.FareDataMultiple[0]?.FareSegments;
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.flat(Infinity);
  }
  return [];
}

function extractDepartureTime(record) {
  const directKeys = [
    "departureTimeUtc", "DepartureTimeUtc",
    "departureTimeIst", "DepartureTimeIst",
    "departureTime", "DepartureTime",
    "depTime", "DepTime",
    "departureDateTime", "DepartureDateTime",
    "depDate", "DepDate"
  ];

  for (const k of directKeys) {
    if (record[k]) return record[k];
  }

  const segs = extractSegmentsList(record);
  if (segs.length > 0) {
    const first = segs[0];
    const segDep =
      first?.Origin?.DepTime || first?.origin?.depTime || first?.origin?.DepTime ||
      first?.DepTime || first?.depTime || first?.DepartureTime || first?.departureTime;
    if (segDep) return segDep;
  }

  return null;
}

function extractArrivalTime(record) {
  const directKeys = [
    "arrivalTimeUtc", "ArrivalTimeUtc",
    "arrivalTimeIst", "ArrivalTimeIst",
    "arrivalTime", "ArrivalTime",
    "arrTime", "ArrTime",
    "arrivalDateTime", "ArrivalDateTime",
    "arrDate", "ArrDate"
  ];

  for (const k of directKeys) {
    if (record[k]) return record[k];
  }

  const segs = extractSegmentsList(record);
  if (segs.length > 0) {
    const last = segs[segs.length - 1];
    const segArr =
      last?.Destination?.ArrTime || last?.destination?.arrTime || last?.destination?.ArrTime ||
      last?.ArrTime || last?.arrTime || last?.ArrivalTime || last?.arrivalTime;
    if (segArr) return segArr;
  }

  return null;
}

function extractDuration(record) {
  const direct = Number(pickFirst(record, [
    "durationMinutes", "DurationMinutes",
    "duration", "Duration",
    "flightDuration", "FlightDuration"
  ], 0)) || 0;
  if (direct > 0) return direct;

  const segs = extractSegmentsList(record);
  if (segs.length > 0) {
    const totalDuration = segs.reduce((sum, seg) => {
      const segDur = Number(pickFirst(seg, ["duration", "Duration", "durationMinutes", "DurationMinutes"], 0)) || 0;
      return sum + segDur;
    }, 0);
    if (totalDuration > 0) return totalDuration;
  }

  return 0;
}

function extractFlightNumber(record) {
  const direct = String(
    pickFirst(record, ["flightNumber", "FlightNumber", "tripNumber", "TripNumber"], "")
  ).trim();
  if (direct) return direct;

  const segs = extractSegmentsList(record);
  if (segs.length > 0) {
    const first = segs[0];
    const airline = first?.Airline || first?.airline;
    const code = String(airline?.AirlineCode || airline?.airlineCode || first?.AirlineCode || first?.airlineCode || "").trim();
    const num = String(airline?.FlightNumber || airline?.flightNumber || first?.FlightNumber || first?.flightNumber || "").trim();
    if (code && num) return `${code} ${num}`;
    if (num) return num;
  }

  return "--";
}

function normalizeFlightSearchRecord(record, index = 0, topTraceId = null) {
  const segs = extractSegmentsList(record);
  const firstSegment = segs[0] || null;
  const lastSegment = segs.length > 0 ? segs[segs.length - 1] : firstSegment;

  const fareDataList = Array.isArray(record?.FareDataMultiple) && record.FareDataMultiple.length > 0
    ? record.FareDataMultiple
    : [record];

  const primaryFare = fareDataList[0] || record;
  const primaryFareSegment = Array.isArray(primaryFare?.FareSegments) ? primaryFare.FareSegments[0] : null;

  const classOptionsRaw = pickFirst(
    record,
    ["classOptions", "ClassOptions", "travelClassOptions", "TravelClassOptions"],
    []
  );
  let classOptions = Array.isArray(classOptionsRaw)
    ? classOptionsRaw
      .map((option) => normalizeFlightClassOption(option))
      .filter((option) => option.travelClass)
    : [];

  const price = extractPrice(primaryFare) || extractPrice(record);
  const availableSeats =
    Number(pickFirst(primaryFareSegment || {}, ["NoOfSeatAvailable", "noOfSeatAvailable"], 0)) ||
    Number(pickFirst(record, ["availableSeats", "AvailableSeats"], 0)) ||
    Number(firstSegment?.NoOfSeatAvailable || firstSegment?.noOfSeatAvailable || 0) ||
    0;

  const cabin = String(
    pickFirst(primaryFareSegment || {}, ["CabinClassName", "cabinClassName"], "") ||
    pickFirst(record, ["cabin", "Cabin", "cabinClass", "CabinClass"], "") ||
    (firstSegment?.CabinClass === 2 ? "Economy" : firstSegment?.CabinClass === 4 ? "Business" : "") ||
    ""
  ).trim();

  // If backend returns a flat or nested object without classOptions array, dynamically build it
  if (classOptions.length === 0) {
    classOptions = [
      {
        travelClass: cabin || "Economy",
        priceInr: price,
        availableSeats: availableSeats || 9,
        totalSeats: availableSeats || 9,
      }
    ];
  }

  const selectedTravelClass = String(
    pickFirst(
      record,
      ["selectedTravelClass", "SelectedTravelClass", "travelClass", "TravelClass", "cabin", "Cabin"],
      classOptions[0]?.travelClass || "Economy"
    ) || "Economy"
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

  const exactTraceId = String(
    pickFirst(record, ["traceId", "TraceId"], null) ||
    pickFirst(primaryFare, ["traceId", "TraceId"], null) ||
    topTraceId ||
    ""
  ).trim();

  const exactResultIndex = String(
    pickFirst(primaryFare, ["ResultIndex", "resultIndex", "ResultId", "resultId"], "") ||
    pickFirst(record, ["resultIndex", "ResultIndex", "resultId", "ResultId"], "")
  ).trim();

  const srdvType = pickFirst(record, ["srdvType", "SrdvType"], null) || "MixAPI";
  const isLcc = pickFirst(primaryFare, ["IsLCC", "isLcc", "IsLcc"], null) ?? pickFirst(record, ["isLcc", "IsLcc"], false);
  const srdvIndex = pickFirst(primaryFare, ["SrdvIndex", "srdvIndex"], null) || pickFirst(record, ["srdvIndex", "SrdvIndex"], null) || (isLcc ? "2" : "1");

  const duration = extractDuration(record);
  const stops =
    Number(pickFirst(record, ["stopsCount", "StopsCount", "stops", "Stops"], 0)) ||
    (segs.length > 0 ? segs.length - 1 : 0);

  const departureTime = extractDepartureTime(record);
  const arrivalTime = extractArrivalTime(record);

  const fromCity =
    String(
      pickFirst(record, ["fromCity", "FromCity", "source", "Source", "origin", "Origin"], "") ||
      firstSegment?.Origin?.CityName ||
      firstSegment?.Origin?.Airport?.CityName ||
      firstSegment?.Origin?.AirportCode ||
      firstSegment?.Origin?.Code ||
      ""
    );

  const toCity =
    String(
      pickFirst(record, ["toCity", "ToCity", "destination", "Destination"], "") ||
      lastSegment?.Destination?.CityName ||
      lastSegment?.Destination?.Airport?.CityName ||
      lastSegment?.Destination?.AirportCode ||
      lastSegment?.Destination?.Code ||
      ""
    );

  const rawId = pickFirst(primaryFare, ["Id", "id"], null) || pickFirst(record, ["id", "Id", "flightId", "FlightId"], null) || exactResultIndex;
  const finalResultIndex = exactResultIndex || (rawId ? String(rawId) : `flight-${index + 1}`);

  const isRefundable = pickFirst(primaryFare, ["IsRefundable", "isRefundable"], null) ?? pickFirst(record, ["isRefundable", "IsRefundable"], true);

  const fareOptions = fareDataList.map((fd) => ({
    srdvIndex: String(fd.SrdvIndex || srdvIndex || "2"),
    resultIndex: String(fd.ResultIndex || finalResultIndex),
    isLcc: Boolean(fd.IsLCC ?? isLcc),
    isRefundable: Boolean(fd.IsRefundable ?? isRefundable),
    source: fd.Source || "Publish",
    buttonColor: fd.ButtonColor || "#0000ff",
    textColor: fd.TextColor || "#ffffff",
    offeredFare: Number(fd.OfferedFare || fd.Fare?.OfferedFare || price),
    publishedFare: Number(fd.Fare?.PublishedFare || price),
    baseFare: Number(fd.Fare?.BaseFare || 0),
    tax: Number(fd.Fare?.Tax || 0),
    currency: fd.Fare?.Currency || "INR",
    fareSegments: fd.FareSegments || []
  }));

  return {
    id: finalResultIndex,
    rawId: finalResultIndex,
    traceId: exactTraceId,
    resultIndex: finalResultIndex,
    srdvIndex: String(srdvIndex),
    srdvType: String(srdvType),
    airline: String(
      pickFirst(
        record,
        ["airline", "Airline", "airlineName", "AirlineName", "providerName", "ProviderName"],
        firstSegment?.Airline?.AirlineName || firstSegment?.airline?.airlineName || "Unknown Airline"
      ) || "Unknown Airline"
    ),
    flightNumber: extractFlightNumber(record),
    cabinClass: cabin || selectedTravelClass,
    fromCity,
    toCity,
    departureTimeIst: departureTime,
    arrivalTimeIst: arrivalTime,
    departureTimeUtc: departureTime,
    arrivalTimeUtc: arrivalTime,
    classOptions,
    fareOptions,
    selectedTravelClass,
    fare:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0) ||
      price,
    price:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0) ||
      price,
    priceInr:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0) ||
      price,
    offeredFare:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0) ||
      price,
    selectedTravelClassPriceInr:
      Number(
        pickFirst(record, ["selectedTravelClassPriceInr", "SelectedTravelClassPriceInr"], null)
      ) ||
      Number(selectedOption?.priceInr || 0) ||
      price,
    selectedTravelClassAvailableSeats:
      Number(
        pickFirst(
          record,
          ["selectedTravelClassAvailableSeats", "SelectedTravelClassAvailableSeats"],
          null
        )
      ) ||
      Number(selectedOption?.availableSeats || 0) ||
      availableSeats,
    selectedTravelClassTotalSeats:
      Number(
        pickFirst(
          record,
          ["selectedTravelClassTotalSeats", "SelectedTravelClassTotalSeats"],
          null
        )
      ) ||
      Number(selectedOption?.totalSeats || 0) ||
      availableSeats ||
      9,
    totalAvailableSeats:
      Number(pickFirst(record, ["totalAvailableSeats", "TotalAvailableSeats"], null)) ||
      seatsFromOptions ||
      availableSeats,
    totalSeats:
      Number(pickFirst(record, ["totalSeats", "TotalSeats"], null)) ||
      Number(pickFirst(record, ["totalAvailableSeats", "TotalAvailableSeats"], null)) ||
      seatsFromOptions ||
      availableSeats,
    supportedTravelClasses,
    durationMinutes: duration,
    stopsCount: stops,
    checkedBagsWeight: primaryFareSegment?.Baggage || pickFirst(record, ["checkedBagsWeight", "CheckedBagsWeight"], null),
    checkedBagsUnit: "Kg",
    cabinBagsWeight: primaryFareSegment?.CabinBaggage || pickFirst(record, ["cabinBagsWeight", "CabinBagsWeight"], null),
    cabinBagsUnit: "Kg",
    brandedFare: pickFirst(record, ["brandedFare", "BrandedFare"], ""),
    brandedFareLabel: pickFirst(record, ["brandedFareLabel", "BrandedFareLabel"], null),
    isLcc: Boolean(isLcc),
    isRefundable: Boolean(isRefundable),
    segmentsJson: pickFirst(record, ["segmentsJson", "SegmentsJson"], null),
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



const CITY_TO_IATA = {
  "DELHI": "DEL",
  "NEW DELHI": "DEL",
  "MUMBAI": "BOM",
  "BOMBAY": "BOM",
  "BANGALORE": "BLR",
  "BENGALURU": "BLR",
  "HYDERABAD": "HYD",
  "CHENNAI": "MAA",
  "MADRAS": "MAA",
  "KOLKATA": "CCU",
  "CALCUTTA": "CCU",
  "PUNE": "PNQ",
  "AHMEDABAD": "AMD",
  "GOA": "GOI",
  "JAIPUR": "JAI",
  "KOCHI": "COK",
  "COCHIN": "COK",
  "TRIVANDRUM": "TRV",
  "THIRUVANANTHAPURAM": "TRV",
  "LUCKNOW": "LKO",
  "GUWAHATI": "GAU",
  "PATNA": "PAT",
  "BHUBANESWAR": "BBI",
  "CHANDIGARH": "IXC",
  "AMRITSAR": "ATQ",
  "VARANASI": "VNS",
  "SRINAGAR": "SXR",
  "INDORE": "IDR",
  "NAGPUR": "NAG",
  "COIMBATORE": "CJB",
  "MANGALORE": "IXE",
  "PORT BLAIR": "IXZ",
  "DUBAI": "DXB",
  "SINGAPORE": "SIN",
  "LONDON": "LHR",
  "NEW YORK": "JFK",
  "BANGKOK": "BKK",
  "KUALA LUMPUR": "KUL",
  "COLOMBO": "CMB",
  "DOHA": "DOH",
  "ABU DHABI": "AUH"
};

function resolveCityCode(cityInput, fallback = "DEL") {
  if (!cityInput) return fallback;
  const cleanInput = String(cityInput).trim().toUpperCase();

  // If the input contains a bracket, e.g. "Delhi (DEL)"
  const bracketMatch = cleanInput.match(/\(([A-Z]{3})\)/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // If it's already exactly 3 letters (e.g. "DEL")
  if (cleanInput.length === 3) {
    return cleanInput;
  }

  // Fallback to extraction if format is "New Delhi, DEL" or similar
  const codeMatch = cleanInput.match(/\b([A-Z]{3})\b/);
  if (codeMatch) {
      return codeMatch[1];
  }

  // Fallback to dictionary mapping
  if (CITY_TO_IATA[cleanInput]) {
    return CITY_TO_IATA[cleanInput];
  }

  throw new Error(`Invalid city input: ${cityInput}. Expected a 3-letter IATA airport code.`);
}

export const FLIGHT_API_CREDENTIALS = {
  UserId: process.env.REACT_APP_SRDV_USER_ID || "1",
  EndUserIp: process.env.REACT_APP_SRDV_END_USER_IP || "127.0.0.1",
  ClientId: process.env.REACT_APP_SRDV_CLIENT_ID || "180170",
  UserName: process.env.REACT_APP_SRDV_USER_NAME || "PickNBk6",
  Password: process.env.REACT_APP_SRDV_PASSWORD || "PickNB@486",
  ApiToken: process.env.REACT_APP_SRDV_API_TOKEN || "PickNB@486#170$"
};

export async function searchFlights({ from, to, date, returnDate, tripType, travelClass, adults = 1, children = 0, infants = 0 }) {
  const isTwoWay = tripType === "twoway" || Boolean(returnDate);
  const isMultiCity = tripType === "multicity" || tripType === "multi";
  const datePart = String(date || "").trim();
  const PreferredDepartureTime = datePart.includes("T") ? datePart : `${datePart}T00:00:00`;
  const PreferredArrivalTime = datePart.includes("T") ? datePart : `${datePart}T23:59:59`;

  let segments = [];
  if (isTwoWay) {
    const returnDateStr = returnDate || date;
    const returnDatePart = String(returnDateStr).trim();
    const PreferredReturnDeptTime = returnDatePart.includes("T") ? returnDatePart : `${returnDatePart}T00:00:00`;
    const PreferredReturnArrTime = returnDatePart.includes("T") ? returnDatePart : `${returnDatePart}T23:59:59`;

    segments = [
      {
        Origin: resolveCityCode(from, "DEL"),
        Destination: resolveCityCode(to, "BOM"),
        FlightCabinClass: 1,
        PreferredDepartureTime,
        PreferredArrivalTime
      },
      {
        Origin: resolveCityCode(to, "BOM"),
        Destination: resolveCityCode(from, "DEL"),
        FlightCabinClass: 1,
        PreferredDepartureTime: PreferredReturnDeptTime,
        PreferredArrivalTime: PreferredReturnArrTime
      }
    ];
  } else {
    segments = [
      {
        Origin: resolveCityCode(from, "DEL"),
        Destination: resolveCityCode(to, "BOM"),
        FlightCabinClass: 1,
        PreferredDepartureTime,
        PreferredArrivalTime
      }
    ];
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    AdultCount: Number(adults),
    ChildCount: Number(children),
    InfantCount: Number(infants),
    JourneyType: isMultiCity ? 3 : (isTwoWay ? 2 : 1),
    DirectFlight: false,
    Segments: segments
  };

  const onwardData = await requestJson(`${SRDV_ROOT}/Search`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Check for SRDV API-level error
  const srdvError = onwardData?.Error || onwardData?.error;
  if (srdvError && String(srdvError.ErrorCode || "") !== "0") {
    throw new Error(srdvError.ErrorMessage || "No flights found for this route and date.");
  }

  const onwardTraceId = onwardData?.TraceId || onwardData?.traceId || "";
  if (typeof window !== "undefined" && onwardTraceId) {
    try {
      window.sessionStorage.setItem("TraceId", onwardTraceId);
      window.sessionStorage.setItem("flight_trace_id", onwardTraceId);
      window.sessionStorage.setItem("SearchResult", JSON.stringify(onwardData));
    } catch (e) {}
  }

  const srdvResults = onwardData?.Results || onwardData?.results || null;

  if (isTwoWay) {
    let onwardRawList = [];
    let returnRawList = [];

    if (Array.isArray(srdvResults) && srdvResults.length > 0) {
      onwardRawList = Array.isArray(srdvResults[0]) ? srdvResults[0].flat(Infinity) : [srdvResults[0]];
      if (srdvResults.length > 1) {
        returnRawList = Array.isArray(srdvResults[1]) ? srdvResults[1].flat(Infinity) : [srdvResults[1]];
      }
    } else {
      onwardRawList = extractFlightSearchList(onwardData);
    }

    const onwardFlights = onwardRawList.map((record, index) =>
      normalizeFlightSearchRecord(record, index, onwardTraceId)
    );

    const returnFlights = returnRawList.map((record, index) => {
      const norm = normalizeFlightSearchRecord(record, index, onwardTraceId);
      return { ...norm, id: `ret-${norm.id}`, isReturnFlight: true };
    });

    if (onwardFlights.length > 0 || returnFlights.length > 0) {
      return {
        isTwoWay: true,
        onward: onwardFlights,
        return: returnFlights
      };
    }
  }

  const onwardRawList = extractFlightSearchList(onwardData);
  const onwardFlights = onwardRawList.map((record, index) =>
    normalizeFlightSearchRecord(record, index, onwardTraceId)
  );

  return onwardFlights;
}

export async function getCalendarFare() {
  console.warn("[flightBookingService] Endpoint removed: getCalendarFare");
  return { raw: null, error: null, results: [], fareMapByDate: {} };
}


export async function getFareRule(traceIdOrObj, resultIndexParam, srdvTypeParam, srdvIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = "MixAPI";
  let srdvIndex = "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || srdvTypeParam || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || srdvIndexParam || "2";
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    TraceId: String(traceId || ""),
    ResultIndex: String(resultIndex || ""),
  };

  try {
    const rawData = await requestJson(`${SRDV_ROOT}/FareRule`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = response?.Error || response?.error || rawData?.Error || rawData?.error;

    if (errorObj && typeof errorObj === "object" && String(errorObj.ErrorCode || "0") !== "0") {
      const errorMsg = errorObj.ErrorMessage || "Fare rule key or trace ID expired.";
      return { success: false, error: errorMsg, traceId: String(traceId || ""), resultIndex: String(resultIndex || ""), specialRule: "", results: [], rawResponse: rawData };
    }

    const rawResults = response.Results || response.results || [];
    const specialRule = response.SpecialRule || response.specialRule || "";
    const resultsList = Array.isArray(rawResults)
      ? rawResults.filter((r) => r && (typeof r === "object" || typeof r === "string"))
      : typeof rawResults === "string" && rawResults.trim()
      ? [{ FareRuleDetail: rawResults }]
      : [];

    return {
      success: true,
      traceId: String(response.TraceId || traceId || ""),
      resultIndex: String(response.ResultIndex || resultIndex || ""),
      specialRule: String(specialRule || ""),
      results: resultsList,
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, error: error.message || "Unable to fetch live fare rules.", traceId: String(traceId || ""), resultIndex: String(resultIndex || ""), specialRule: "", results: [] };
  }
}

export async function getSSR(traceIdOrObj, resultIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = "MixAPI";
  let srdvIndex = "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || "2";
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    TraceId: String(traceId || ""),
    ResultIndex: String(resultIndex || ""),
  };

  try {
    const rawData = await requestJson(`${SRDV_ROOT}/SSR`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = response?.Error || response?.error || rawData?.Error || rawData?.error;

    if (errorObj && typeof errorObj === "object" && String(errorObj.ErrorCode || "0") !== "0") {
      const errorMsg = errorObj.ErrorMessage || "SSR add-ons unavailable.";
      return { success: false, errorCode: Number(errorObj.ErrorCode), error: errorMsg, baggage: [], meal: [], Baggage: [], MealDynamic: [], Meal: [], rawResponse: rawData };
    }

    const rawBaggage = response.Baggage || response.baggage || [];
    const rawMealDynamic = response.MealDynamic || response.mealDynamic || [];
    const rawMeal = response.Meal || response.meal || [];
    const flattenList = (list) => Array.isArray(list) ? list.flat(Infinity) : [];

    const baggageList = flattenList(rawBaggage).map((b) => ({
      code: b.Code || b.code || "",
      Code: b.Code || b.code || "",
      weight: Number(b.Weight || b.weight || 0),
      Weight: Number(b.Weight || b.weight || 0),
      description: b.Description || b.description || `${b.Weight || 0} Kg Baggage`,
      Description: b.Description || b.description || `${b.Weight || 0} Kg Baggage`,
      price: Number(b.Price ?? b.price ?? b.Amount ?? 0),
      Price: Number(b.Price ?? b.price ?? b.Amount ?? 0),
      origin: b.Origin || b.origin || "",
      destination: b.Destination || b.destination || "",
    }));

    const mergedMeals = [...flattenList(rawMealDynamic), ...flattenList(rawMeal)].map((m) => ({
      code: m.Code || m.code || "",
      Code: m.Code || m.code || "",
      description: m.Description || m.description || m.Details || m.AirlineDescription || "Standard Meal",
      Description: m.Description || m.description || m.Details || m.AirlineDescription || "Standard Meal",
      price: Number(m.Price ?? m.price ?? m.Amount ?? 0),
      Price: Number(m.Price ?? m.price ?? m.Amount ?? 0),
      origin: m.Origin || m.origin || "",
      destination: m.Destination || m.destination || "",
      airlineCode: m.AirlineCode || m.airlineCode || "",
    }));

    return {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || traceId || ""),
      resultIndex: String(response.ResultIndex || resultIndex || ""),
      Baggage: rawBaggage,
      MealDynamic: rawMealDynamic,
      Meal: rawMeal,
      baggage: baggageList,
      meal: mergedMeals,
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to fetch SSR options.", baggage: [], meal: [], Baggage: [], MealDynamic: [], Meal: [], rawResponse: null };
  }
}

export async function getSeatMap(traceIdOrObj, resultIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = "MixAPI";
  let srdvIndex = "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || "2";
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    TraceId: String(traceId || ""),
    ResultIndex: String(resultIndex || ""),
  };

  try {
    const rawData = await requestJson(`${SRDV_ROOT}/SeatMap`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = response?.Error || response?.error || rawData?.Error || rawData?.error;

    if (errorObj && typeof errorObj === "object" && String(errorObj.ErrorCode || "0") !== "0") {
      const errorMsg = errorObj.ErrorMessage || "Seat map request returned error.";
      return { success: false, errorCode: Number(errorObj.ErrorCode), error: errorMsg, traceId: String(traceId || ""), results: [], rawResponse: rawData };
    }

    return {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || traceId || ""),
      results: Array.isArray(response.Results || response.results) ? (response.Results || response.results) : [],
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to fetch seat map.", results: [], rawResponse: null };
  }
}

export async function getFareQuote(traceIdOrObj, resultIndexParam, couponCodeParam) {
  let traceId = "";
  let resultIndex = "";
  let couponCode = "";
  let srdvType = "MixAPI";
  let srdvIndex = "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || (typeof window !== "undefined" ? window.sessionStorage.getItem("flight_trace_id") : "") || "";
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.flightId || flightObj.id || resultIndexParam || "";
    couponCode = traceIdOrObj.couponCode || traceIdOrObj.CouponCode || couponCodeParam || "";
    srdvType = flightObj.srdvType || flightObj.SrdvType || traceIdOrObj.srdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || traceIdOrObj.srdvIndex || "2";
  } else {
    traceId = String(traceIdOrObj || "");
    resultIndex = String(resultIndexParam || "");
    couponCode = String(couponCodeParam || "");
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    TraceId: String(traceId || ""),
    ResultIndex: String(resultIndex || ""),
    CouponCode: String(couponCode || ""),
  };

  try {
    const rawData = await requestJson(`${SRDV_ROOT}/FareQuote`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = response?.Error || response?.error || rawData?.Error || rawData?.error;

    if (errorObj && typeof errorObj === "object" && String(errorObj.ErrorCode || "0") !== "0") {
      const errorMsg = errorObj.ErrorMessage || "Fare quote unavailable.";
      return { success: false, errorCode: Number(errorObj.ErrorCode), error: errorMsg, isPriceChanged: Boolean(response.IsPriceChanged), traceId: String(traceId || ""), results: null, rawResponse: rawData };
    }

    const results = response.Results || response.results || response.Fare || response.fare || null;
    const quotedFare = results?.Fare || results?.fare || results || {};
    const isLcc = Boolean(results?.IsLCC ?? results?.isLCC ?? results?.IsLcc ?? results?.isLcc ?? false);

    const fareQuoteResult = {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || rawData?.TraceId || traceId || ""),
      srdvType: String(response.SrdvType || rawData?.SrdvType || srdvType),
      srdvIndex: String(results?.SrdvIndex || response.SrdvIndex || srdvIndex),
      resultIndex: String(results?.ResultIndex || response.ResultIndex || resultIndex),
      isPriceChanged: Boolean(response.IsPriceChanged),
      holdAllowed: Boolean(results?.HoldAllowed ?? response.HoldAllowed ?? false),
      isLcc,
      results,
      fare: quotedFare,
      rawResponse: rawData,
      b2cFinalFare: Number(results?.B2CFinalFare || quotedFare.OfferedFare || quotedFare.PublishedFare || 0),
      markup: Number(results?.PickNBookMarkup || 0),
      discount: Number(results?.PickNBookDiscount || 0),
      availableOffers: results?.PickNBookAvailableOffers || []
    };

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("FareQuote", JSON.stringify(rawData || fareQuoteResult));
        window.sessionStorage.setItem("last_fare_quote", JSON.stringify(fareQuoteResult));
      } catch (e) {}
    }

    return fareQuoteResult;
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to fetch fare quote.", results: null, rawResponse: null };
  }
}

function mapPassengerTypeToPaxType(typeString) {
  const clean = String(typeString || "").toLowerCase();
  if (clean.includes("child")) return 2;
  if (clean.includes("infant")) return 3;
  return 1; // Adult
}

function mapGenderToCode(genderValue) {
  if (typeof genderValue === "number") {
    return genderValue;
  }
  const clean = String(genderValue || "").toLowerCase();
  if (clean.startsWith("f") || clean === "female" || clean === "2") return 2;
  return 1;
}

function formatIsoDateTime(dateVal, defaultDateStr = "2000-01-01T00:00:00") {
  if (!dateVal) return defaultDateStr;
  const str = String(dateVal).trim();
  if (!str) return defaultDateStr;
  if (str.includes("T")) return str;
  return `${str}T00:00:00`;
}

function parseSeatLabelAndCode(s, defaultAirlineCode = "6E", defaultFlightNumber = "101", defaultOrigin = "DEL", defaultDestination = "BOM") {
  if (!s) return null;

  if (typeof s !== "object") {
    const rawStr = String(s || "").trim();
    if (!rawStr) return null;
    const match = rawStr.match(/^(\d+[A-Z]+)/i);
    const seatNumber = match ? match[1].toUpperCase() : rawStr;
    const code = rawStr; // Exact unmodified SSR string required by MixAPI supplier
    return {
      Code: code,
      SeatNumber: seatNumber,
      AirlineCode: defaultAirlineCode,
      FlightNumber: defaultFlightNumber,
      AirlineNumber: defaultFlightNumber,
      Origin: defaultOrigin,
      Destination: defaultDestination,
      Amount: 0,
      IsBooked: true,
      IsAisle: false,
      IsLegroom: false,
    };
  }

  // Exact unmodified SSR string for Code (e.g., "15ASeKey25")
  const rawCode = String(s.Code || s.code || s.rawCode || s.SeatNumber || s.seatNumber || s.label || s.seatLabel || "").trim();

  // Extracted human-readable label for SeatNumber (e.g., "15A")
  let cleanSeatLabel = String(s.SeatNumber || s.seatNumber || s.label || s.seatLabel || rawCode).trim();
  const match = cleanSeatLabel.match(/^(\d+[A-Z]+)/i);
  if (match) {
    cleanSeatLabel = match[1].toUpperCase();
  } else {
    cleanSeatLabel = cleanSeatLabel.toUpperCase();
  }

  const finalCode = rawCode || cleanSeatLabel;
  const finalSeatNumber = cleanSeatLabel;

  const fltNo = String(s.FlightNumber || s.flightNumber || s.AirlineNumber || s.airlineNumber || defaultFlightNumber).trim();
  const airline = String(s.AirlineCode || s.airlineCode || defaultAirlineCode).trim();
  const orig = String(s.Origin || s.origin || defaultOrigin).trim();
  const dest = String(s.Destination || s.destination || defaultDestination).trim();
  const amount = Number(s.Amount ?? s.amount ?? s.Price ?? s.price ?? 0);
  const isBooked = s.IsBooked !== undefined ? Boolean(s.IsBooked) : (s.isBooked !== undefined ? Boolean(s.isBooked) : true);
  const isAisle = s.IsAisle !== undefined ? Boolean(s.IsAisle) : (s.isAisle !== undefined ? Boolean(s.isAisle) : false);
  const isLegroom = s.IsLegroom !== undefined ? Boolean(s.IsLegroom) : (s.isLegroom !== undefined ? Boolean(s.isLegroom) : false);

  return {
    Code: finalCode,
    SeatNumber: finalSeatNumber,
    AirlineCode: airline,
    FlightNumber: fltNo,
    AirlineNumber: fltNo,
    Origin: orig,
    Destination: dest,
    Amount: amount,
    IsBooked: isBooked,
    IsAisle: isAisle,
    IsLegroom: isLegroom,
  };
}

function mapPassengersForApiIntegration(passengers = [], baseFare = 8000, tax = 2016.5, flight = null, defaultContactNo = "") {
  const paxList = Array.isArray(passengers) && passengers.length > 0 ? passengers : [{}];
  const count = paxList.length;
  const paxBase = Number((baseFare / count).toFixed(2));
  const paxTax = Number((tax / count).toFixed(2));

  const origin = String(flight?.fromCity || flight?.sourceCode || flight?.source || flight?.origin || "DEL").toUpperCase();
  const destination = String(flight?.toCity || flight?.destinationCode || flight?.destination || "BOM").toUpperCase();
  const airlineCode = String(flight?.airlineCode || flight?.airline || flight?.providerName || "6E").toUpperCase().slice(0, 2);
  const flightNumber = String(flight?.flightNumber || flight?.tripNumber || "").replace(/\D/g, "") || "101";

  return paxList.map((p, index) => {
    const titles = ["mr", "mrs", "miss", "ms", "dr", "prof"];
    let rawTitle = String(p.title || p.Title || "Mr").trim();

    let firstName = String(p.firstName || p.FirstName || "").trim();
    let lastName = String(p.lastName || p.LastName || "").trim();

    if (!firstName && p.fullName) {
      let name = p.fullName.trim();
      const parts = name.split(/\s+/);
      if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
        rawTitle = parts[0];
        parts.shift();
      }
      firstName = parts[0] || "Passenger";
      lastName = parts.slice(1).join(" ") || "User";
    }

    if (firstName) {
      const parts = firstName.split(/\s+/);
      if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
        rawTitle = parts[0];
        firstName = parts.slice(1).join(" ");
      } else if (titles.includes(firstName.toLowerCase())) {
        firstName = "Passenger";
      }
    }

    const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

    const dobRaw = p.dob || p.DateOfBirth || p.dateOfBirth || "";
    const dobFormatted = dobRaw ? formatIsoDateTime(dobRaw, "1995-01-01T00:00:00") : "1995-01-01T00:00:00";

    const passportExpiryRaw = p.passportExpiryDate || p.PassportExpiryDate || p.passportExpiry || p.PassportExpiry || "";
    const passportExpiryFormatted = passportExpiryRaw ? formatIsoDateTime(passportExpiryRaw, "2030-01-01T00:00:00") : undefined;

    const isLead = p.isLeadPax !== undefined ? Boolean(p.isLeadPax) : (p.IsLeadPax !== undefined ? Boolean(p.IsLeadPax) : index === 0);

    const seatCode = String(p.seatCode || p.SeatCode || p.seatNumber || p.SeatNumber || p.seatLabel || "").trim();
    const rawSeats = Array.isArray(p.seat || p.Seat) ? (p.seat || p.Seat) : [];

    const rawPassportNo = String(p.passportNo || p.PassportNo || "").trim();

    const rawContact = String(p.contactNo || p.ContactNo || p.passengerPhone || p.phone || p.mobile || defaultContactNo || "9812345678").replace(/\D/g, "");
    const cleanContact = rawContact.length >= 10 ? rawContact.slice(-10) : (defaultContactNo.replace(/\D/g, "").slice(-10) || "9812345678");

    const cleanEmail = String(p.email || p.Email || p.passengerEmail || "passenger@gmail.com").trim() || "passenger@gmail.com";

    let mappedSeats = [];
    if (rawSeats.length > 0) {
      mappedSeats = rawSeats
        .map(s => parseSeatLabelAndCode(s, airlineCode, flightNumber, origin, destination))
        .filter(s => s && s.SeatNumber && s.Code && s.Origin && s.Destination);
    } else if (seatCode) {
      const parsedSingle = parseSeatLabelAndCode(seatCode, airlineCode, flightNumber, origin, destination);
      if (parsedSingle) mappedSeats = [parsedSingle];
    }

    const passengerObj = {
      Title: cleanTitle || "Mr",
      FirstName: firstName || "Passenger",
      LastName: lastName || "User",
      MiddleName: String(p.middleName || p.MiddleName || "").trim(),
      PaxType: typeof p.paxType === "number" ? p.paxType : (typeof p.PaxType === "number" ? p.PaxType : mapPassengerTypeToPaxType(p.passengerType || p.PaxType)),
      DateOfBirth: dobFormatted ? dobFormatted : "1995-01-01T00:00:00",
      Gender: String(mapGenderToCode(p.gender ?? p.Gender)),
      AddressLine1: String(p.addressLine1 || p.AddressLine1 || "456 Park Avenue").trim(),
      City: String(p.city || p.City || "Hyderabad").trim(),
      CountryCode: String(p.countryCode || p.CountryCode || "IN").trim(),
      CountryName: String(p.countryName || p.CountryName || "India").trim(),
      CellCountryCode: "+91",
      ContactNo: cleanContact,
      Email: cleanEmail,
      IsLeadPax: isLead,
      Fare: {
        BaseFare: Number(p.fare?.baseFare ?? p.Fare?.BaseFare ?? paxBase),
        Tax: Number(p.fare?.tax ?? p.Fare?.Tax ?? paxTax),
        TransactionFee: Number(p.fare?.transactionFee ?? p.Fare?.TransactionFee ?? 0),
        YQTax: Number(p.fare?.yqTax ?? p.Fare?.YQTax ?? 0),
        AdditionalTxnFeeOfrd: Number(p.fare?.additionalTxnFeeOfrd ?? p.Fare?.AdditionalTxnFeeOfrd ?? 0),
        AdditionalTxnFeePub: Number(p.fare?.additionalTxnFeePub ?? p.Fare?.AdditionalTxnFeePub ?? 0),
        AirTransFee: Number(p.fare?.airTransFee ?? p.Fare?.AirTransFee ?? 0)
      },
      Baggage: (() => {
        const raw = Array.isArray(p.baggage || p.Baggage) ? (p.baggage || p.Baggage) : [];
        return raw.map(b => ({
          WayType: Number(b.WayType ?? b.wayType ?? 0),
          Code: String(b.Code || b.code || ""),
          Description: String(b.Description || b.description || b.Details || ""),
          Weight: String(b.Weight || b.weight || ""),
          Currency: String(b.Currency || b.currency || "INR"),
          Price: Number(b.Price ?? b.price ?? b.Amount ?? 0),
          Origin: String(b.Origin || b.origin || ""),
          Destination: String(b.Destination || b.destination || ""),
        }));
      })(),
      MealDynamic: (() => {
        const raw = Array.isArray(p.mealDynamic || p.MealDynamic) ? (p.mealDynamic || p.MealDynamic) : [];
        return raw.map(m => ({
          WayType: Number(m.WayType ?? m.wayType ?? 0),
          Code: String(m.Code || m.code || ""),
          Description: String(m.Description || m.description || m.AirlineDescription || m.Details || ""),
          AirlineDescription: String(m.AirlineDescription || m.airlineDescription || m.Description || m.description || ""),
          Quantity: String(m.Quantity || m.quantity || "1"),
          Currency: String(m.Currency || m.currency || "INR"),
          Price: Number(m.Price ?? m.price ?? m.Amount ?? 0),
          Origin: String(m.Origin || m.origin || ""),
          Destination: String(m.Destination || m.destination || ""),
        }));
      })(),
      Seat: mappedSeats,
      PassportNo: rawPassportNo || "",
      PassportExpiry: (passportExpiryFormatted && rawPassportNo) ? passportExpiryFormatted.split("T")[0] : "",
      PassportIssueDate: "",
      PassportIssueCountryCode: String(p.passportIssueCountryCode || p.PassportIssueCountryCode || "").trim(),
      DocumentType: String(p.documentType || p.DocumentType || "").trim(),
      DocumentId: String(p.documentId || p.DocumentId || "").trim(),
      GSTNumber: String(p.gstNumber || p.GSTNumber || "").trim(),
      GSTCompanyName: String(p.gstCompanyName || p.GSTCompanyName || "").trim(),
      GSTCompanyAddress: String(p.gstCompanyAddress || p.GSTCompanyAddress || "").trim(),
      GSTCompanyContactNumber: String(p.gstCompanyContactNumber || p.GSTCompanyContactNumber || "").trim(),
      GSTCompanyEmail: String(p.gstCompanyEmail || p.GSTCompanyEmail || "").trim()
    };

    return passengerObj;
  });
}

/**
 * Extracts PNR and BookingId from a SRDV TicketLCC/HoldGDS/TicketGDS response.
 * SRDV MixAPI may wrap fields under FlightItinerary or return them at root level.
 */
export function extractSrdvPnrAndBookingId(rawData) {
  const responseObj = rawData?.Response || rawData?.response || rawData || {};
  const itinerary = responseObj?.FlightItinerary || rawData?.FlightItinerary || null;
  const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;
  const errorMsg = String(errorObj?.ErrorMessage || errorObj?.errorMessage || "");

  let duplicateRef = "";
  const dupMatch = errorMsg.match(/duplicate booking of\s+([A-Z0-9]+)/i);
  if (dupMatch && dupMatch[1]) {
    duplicateRef = dupMatch[1].trim();
  }

  const pnr =
    itinerary?.PNR ||
    responseObj?.PNR ||
    responseObj?.pnr ||
    rawData?.PNR ||
    rawData?.pnr ||
    duplicateRef ||
    "";

  const bookingId =
    itinerary?.BookingId ||
    responseObj?.BookingId ||
    responseObj?.bookingId ||
    rawData?.BookingId ||
    rawData?.bookingId ||
    pnr ||
    duplicateRef ||
    "";

  return { pnr: String(pnr), bookingId: String(bookingId) };
}

export async function ticketLCC({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, contactNo, couponCode }) {
  const endpoint = `${SRDV_ROOT}/TicketLCC`;
  const mappedPassengers = mapPassengersForApiIntegration(passengers, baseFare, tax, flight, contactNo);

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || flight?.srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || flight?.srdvIndex || "2"),
    TraceId: String(traceId || flight?.traceId || flight?.TraceId || ""),
    ResultIndex: String(resultIndex || flight?.resultIndex || flight?.ResultIndex || ""),
    CouponCode: String(couponCode || ""),
    Passengers: mappedPassengers
  };

  let rawData = null;
  try {
    rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      errorCode: "-1",
      error: err.message || "TicketLCC request failed.",
      response: null,
      rawResponse: null,
    };
  }

  const responseObj = rawData?.Response || rawData?.response || rawData || {};
  const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

  // Extract error code — SRDV uses 0 = success
  const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null
    ? String(errorObj.ErrorCode)
    : "0";

  // ResponseStatus: 1 = success, 0/missing = failure (per SRDV spec)
  const responseStatus = rawData?.ResponseStatus ?? responseObj?.ResponseStatus ?? null;
  const hasSuccessStatus = responseStatus === 1 || responseStatus === "1";

  // Extract PNR and BookingId — if they are present, the booking was at least partially created
  const { pnr, bookingId } = extractSrdvPnrAndBookingId(rawData);
  const hasPnrOrBookingId = Boolean(pnr || bookingId);

  // Success conditions:
  // 1. ErrorCode is "0" OR
  // 2. ResponseStatus is 1 OR
  // 3. PNR or BookingId is present (SRDV sometimes returns error alongside a PNR on LCC)
  const isError = errorCodeVal !== "0" && errorCodeVal !== "000" && !hasSuccessStatus && !hasPnrOrBookingId;

  if (isError) {
    const errorMsg = errorObj?.ErrorMessage || errorObj?.errorMessage || "TicketLCC booking failed on the airline system.";
    console.warn("TicketLCC API error response:", errorCodeVal, errorMsg, rawData);
    return {
      success: false,
      errorCode: errorCodeVal,
      error: errorMsg,
      traceId: String(rawData?.TraceId || responseObj?.TraceId || traceId || ""),
      responseStatus: responseStatus ?? 0,
      response: responseObj,
      rawResponse: rawData,
    };
  }

  return {
    success: true,
    errorCode: "0",
    traceId: String(rawData?.TraceId || responseObj?.TraceId || traceId || ""),
    pnr,
    bookingId,
    responseStatus: responseStatus ?? 1,
    response: responseObj,
    rawResponse: rawData,
  };
}

export async function holdGDS({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, contactNo, couponCode }) {
  const endpoint = `${SRDV_ROOT}/HoldGDS`;
  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || flight?.srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || flight?.srdvIndex || "2"),
    TraceId: String(traceId || flight?.traceId || flight?.TraceId || ""),
    ResultIndex: String(resultIndex || flight?.resultIndex || flight?.ResultIndex || ""),
    CouponCode: String(couponCode || ""),
    Passengers: mapPassengersForApiIntegration(passengers, baseFare, tax, flight, contactNo)
  };

  return requestJson(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function ticketGDS({ traceId, resultIndex, srdvType, srdvIndex, pnr, bookingId, couponCode }) {
  const endpoint = `${SRDV_ROOT}/TicketGDS`;
  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    TraceId: String(traceId || ""),
    ResultIndex: String(resultIndex || ""),
    PNR: String(pnr || ""),
    BookingId: String(bookingId || ""),
    CouponCode: String(couponCode || "")
  };

  return requestJson(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCancellationCharges(traceIdOrObj, bookingIdParam) {
  const endpoint = `${SRDV_ROOT}/GetCancellationCharges`;

  let bookingId = "";
  let traceId = "";
  let srdvType = "MixAPI";
  let srdvIndex = "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    bookingId = traceIdOrObj.bookingId || traceIdOrObj.BookingId || "";
    traceId = traceIdOrObj.traceId || traceIdOrObj.TraceId || "";
    srdvType = traceIdOrObj.srdvType || traceIdOrObj.SrdvType || "MixAPI";
    srdvIndex = traceIdOrObj.srdvIndex || traceIdOrObj.SrdvIndex || "2";
  } else {
    bookingId = String(traceIdOrObj || "");
    traceId = String(bookingIdParam || "");
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    RequestType: 1,
    TraceId: String(traceId || ""),
    BookingId: String(bookingId || ""),
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2")
  };

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

    const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null ? Number(errorObj.ErrorCode) : 0;
    const isError = errorCodeVal !== 0;

    if (isError) {
      const errorMsg = errorObj?.ErrorMessage || "Cancellation charges not found from supplier.";
      console.warn("GetCancellationCharges API error response:", errorCodeVal, errorMsg);
      return {
        success: false,
        errorCode: errorCodeVal,
        error: errorMsg,
        bookingId: String(bookingId || ""),
        result: null,
        rawResponse: rawData,
      };
    }

    const result = responseObj?.Result || responseObj?.result || rawData?.Result || rawData?.result || null;

    return {
      success: true,
      errorCode: 0,
      bookingId: String(bookingId || ""),
      result,
      rawResponse: rawData,
    };
  } catch (error) {
    console.warn("GetCancellationCharges failed:", error);
    return {
      success: false,
      errorCode: -1,
      error: error.message || "Failed to fetch cancellation charges.",
      bookingId: String(bookingId || ""),
      result: null,
      rawResponse: null,
    };
  }
}

export async function sendChangeRequest(paramsOrBookingId, requestTypeParam, remarksParam) {
  const srdvEndpoint = `${SRDV_ROOT}/SendChangeRequest`;

  let bookingId = "";
  let pnr = "";
  let remarks = "User requested cancellation";
  let requestType = "2";
  let cancellationType = "3";
  let srdvType = "MixAPI";
  let srdvIndex = "2";
  let sectors = [];
  let ticketData = [];

  if (paramsOrBookingId && typeof paramsOrBookingId === "object") {
    bookingId = paramsOrBookingId.bookingId || paramsOrBookingId.BookingId || "";
    pnr = paramsOrBookingId.pnr || paramsOrBookingId.PNR || paramsOrBookingId.bookingReference || "";
    remarks = paramsOrBookingId.remarks || paramsOrBookingId.Remarks || "User requested cancellation";
    requestType = String(paramsOrBookingId.requestType ?? paramsOrBookingId.RequestType ?? "2");
    cancellationType = String(paramsOrBookingId.cancellationType ?? paramsOrBookingId.CancellationType ?? "3");
    srdvType = paramsOrBookingId.srdvType || paramsOrBookingId.SrdvType || "MixAPI";
    srdvIndex = paramsOrBookingId.srdvIndex || paramsOrBookingId.SrdvIndex || "2";
    sectors = Array.isArray(paramsOrBookingId.sectors || paramsOrBookingId.Sectors) ? (paramsOrBookingId.sectors || paramsOrBookingId.Sectors) : [];
    ticketData = Array.isArray(paramsOrBookingId.ticketData || paramsOrBookingId.TicketData) ? (paramsOrBookingId.ticketData || paramsOrBookingId.TicketData) : [];
  } else {
    bookingId = String(paramsOrBookingId || "");
    remarks = remarksParam || "User requested cancellation";
    requestType = String(requestTypeParam || "2");
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    BookingId: String(bookingId || ""),
    PNR: String(pnr || ""),
    RequestType: String(requestType || "2"),
    CancellationType: String(cancellationType || "3"),
    Remarks: String(remarks || "User requested cancellation"),
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "2"),
    Sectors: sectors,
    TicketData: ticketData
  };

  try {
    const rawData = await requestJson(srdvEndpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

    const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null ? String(errorObj.ErrorCode) : "0";
    const isError = errorCodeVal !== "0" && errorCodeVal !== "000";

    if (isError) {
      const errorMsg = errorObj?.ErrorMessage || "Change request failed.";
      console.warn("SendChangeRequest API error response:", errorCodeVal, errorMsg);
      return {
        success: false,
        errorCode: errorCodeVal,
        error: errorMsg,
        responseStatus: rawData?.ResponseStatus ?? 0,
        ticketCRInfo: rawData?.TicketCRInfo || responseObj?.TicketCRInfo || [],
        rawResponse: rawData,
      };
    }

    const ticketCRInfo = rawData?.TicketCRInfo || responseObj?.TicketCRInfo || [];
    const changeRequestId = rawData?.ChangeRequestId || responseObj?.ChangeRequestId || ticketCRInfo?.[0]?.ChangeRequestId || "";

    return {
      success: true,
      errorCode: "0",
      responseStatus: rawData?.ResponseStatus ?? 1,
      ticketCRInfo,
      changeRequestId: String(changeRequestId || ""),
      rawResponse: rawData,
    };
  } catch (error) {
    console.warn("SendChangeRequest failed:", error);
    return {
      success: false,
      errorCode: "-1",
      error: error.message || "Failed to submit change request.",
      ticketCRInfo: [],
      rawResponse: null,
    };
  }
}

export async function getCancelStatus(changeRequestIdOrObj) {
  const srdvEndpoint = `${SRDV_ROOT}/GetCancelStatus`;

  let changeRequestId = changeRequestIdOrObj;
  if (changeRequestIdOrObj && typeof changeRequestIdOrObj === "object") {
    changeRequestId = changeRequestIdOrObj.changeRequestId || changeRequestIdOrObj.ChangeRequestId || changeRequestId;
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    ChangeRequestId: String(changeRequestId || "")
  };

  try {
    const rawData = await requestJson(srdvEndpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

    const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null ? String(errorObj.ErrorCode) : "0";
    const isError = errorCodeVal !== "0" && errorCodeVal !== "000";

    if (isError) {
      const errorMsg = errorObj?.ErrorMessage || "Failed to retrieve cancellation status.";
      console.warn("GetCancelStatus API error response:", errorCodeVal, errorMsg);
      return {
        success: false,
        errorCode: errorCodeVal,
        error: errorMsg,
        changeRequestId: String(responseObj?.ChangeRequestId || changeRequestId || ""),
        cancelStatus: "Unknown",
        refundStatus: "Unknown",
        rawResponse: rawData,
      };
    }

    return {
      success: true,
      errorCode: "0",
      changeRequestId: String(responseObj?.ChangeRequestId || rawData?.ChangeRequestId || changeRequestId || ""),
      paxName: responseObj?.PaxName || responseObj?.paxName || rawData?.PaxName || "",
      pnr: responseObj?.PNR || responseObj?.pnr || rawData?.PNR || "",
      sector: responseObj?.Sector || responseObj?.sector || rawData?.Sector || "",
      departDate: responseObj?.DepartDate || responseObj?.departDate || rawData?.DepartDate || "",
      cancelStatus: responseObj?.CancelStatus || responseObj?.cancelStatus || rawData?.CancelStatus || "Pending",
      refundStatus: responseObj?.RefundStatus || responseObj?.refundStatus || rawData?.RefundStatus || "Pending",
      refundAmount: Number(responseObj?.RefundAmount || rawData?.RefundAmount || 0),
      cancellationCharge: Number(responseObj?.CancellationCharge || rawData?.CancellationCharge || 0),
      refundDate: responseObj?.RefundDate || responseObj?.refundDate || rawData?.RefundDate || "",
      adminRemark: responseObj?.AdminRemark || responseObj?.adminRemark || rawData?.AdminRemark || "",
      yourRemark: responseObj?.YourRemark || responseObj?.yourRemark || rawData?.YourRemark || "",
      rawResponse: rawData,
    };
  } catch (error) {
    console.warn("GetCancelStatus failed:", error);
    return {
      success: false,
      errorCode: "-1",
      error: error.message || "Failed to retrieve cancellation status.",
      changeRequestId: String(changeRequestId || ""),
      cancelStatus: "Unknown",
      refundStatus: "Unknown",
      rawResponse: null,
    };
  }
}



export async function listHotFlightRoutes({ metric = "score" } = {}) {
  return [];
}

export async function listFlightCoupons() {
  const token = typeof window !== "undefined"
    ? (localStorage.getItem("adminToken") || localStorage.getItem("b2b_token"))
    : null;

  // 1. Try admin endpoint ONLY if token exists
  if (token) {
    try {
      const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/coupons`, {
        method: "GET",
      });
      if (Array.isArray(data) && data.length > 0) {
        return data.map((record) => normalizeFlightCouponRecord(record));
      }
    } catch (err) {}
  }

  // 2. Try public endpoints
  try {
    const data = await requestJson("/api/FlightCoupons", {
      method: "GET",
      skipAuth: true,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((record) => normalizeFlightCouponRecord(record));
    }
  } catch (err) {}

  try {
    const data = await requestJson("/api/FlightPromotions", {
      method: "GET",
      skipAuth: true,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((record) => normalizeFlightCouponRecord(record));
    }
  } catch (err) {}

  try {
    const data = await requestJson("/api/flight/coupons", {
      method: "GET",
      skipAuth: true,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((record) => normalizeFlightCouponRecord(record));
    }
  } catch (err) {}

  // 3. Try localStorage fallback
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("admin_portal:flight-coupons");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((record) => normalizeFlightCouponRecord(record));
        }
      }
    }
  } catch (err) {}

  // No more mock fallback
  return [];
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
  console.warn("[flightBookingService] Endpoint removed: deleteFlightCoupon");
  return { success: true };
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
  console.warn("[flightBookingService] Endpoint removed: deleteDiscountCondition");
  return { success: true };
}

export async function listAirlineWebChecks() {
  console.warn("[flightBookingService] Endpoint removed: listAirlineWebChecks");
  return [];
}

export async function createAirlineWebCheck(link) {
  console.warn("[flightBookingService] Endpoint removed: createAirlineWebCheck");
  return { id: "mock-link-id", title: link?.title || "", webCheckinUrl: link?.webCheckinUrl || "" };
}

export async function deleteAirlineWebCheck(linkId) {
  console.warn("[flightBookingService] Endpoint removed: deleteAirlineWebCheck");
  return { success: true };
}

export async function listPopularDestinations() {
  console.warn("[flightBookingService] Endpoint removed: listPopularDestinations");
  return [];
}

export async function createPopularDestination(destination) {
  console.warn("[flightBookingService] Endpoint removed: createPopularDestination");
  return { id: "mock-dest-id", ...destination };
}

export async function updatePopularDestination(destinationId, destination) {
  console.warn("[flightBookingService] Endpoint removed: updatePopularDestination");
  return { id: destinationId, ...destination };
}

export async function deletePopularDestination(destinationId) {
  console.warn("[flightBookingService] Endpoint removed: deletePopularDestination");
  return { success: true };
}

export async function listConvenienceFeeRules() {
  console.warn("[flightBookingService] Endpoint removed: listConvenienceFeeRules");
  return [];
}

export async function createConvenienceFeeRule(rule) {
  console.warn("[flightBookingService] Endpoint removed: createConvenienceFeeRule");
  return { id: "mock-rule-id", ...rule };
}

export async function updateConvenienceFeeRule(ruleId, rule) {
  console.warn("[flightBookingService] Endpoint removed: updateConvenienceFeeRule");
  return { id: ruleId, ...rule };
}

export async function listFlightMarkups() {
  console.warn("[flightBookingService] Endpoint removed: listFlightMarkups");
  return [];
}

export async function createFlightMarkup(markup) {
  console.warn("[flightBookingService] Endpoint removed: createFlightMarkup");
  return { id: "mock-markup-id", ...markup };
}

export async function updateFlightMarkup(markupId, markup) {
  console.warn("[flightBookingService] Endpoint removed: updateFlightMarkup");
  return { id: markupId, ...markup };
}

export async function deleteFlightMarkup(markupId) {
  console.warn("[flightBookingService] Endpoint removed: deleteFlightMarkup");
  return { success: true };
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

export function updateLocalTicketStatus(bookingId, status = "Cancelled") {
  if (typeof window === "undefined" || !bookingId) return;
  const targetId = String(bookingId).trim().toLowerCase();

  if (status === "Cancelled") {
    try {
      const cancelledRefsRaw = localStorage.getItem("cancelled_flight_bookings") || "[]";
      const cancelledRefs = JSON.parse(cancelledRefsRaw);
      if (Array.isArray(cancelledRefs) && !cancelledRefs.includes(targetId)) {
        cancelledRefs.push(targetId);
        localStorage.setItem("cancelled_flight_bookings", JSON.stringify(cancelledRefs));
      }
    } catch (e) {}
  }

  const keys = ["mock_tickets", "my_flight_bookings", "user_flight_tickets", "stored_tickets", "pnb_flight_bookings"];

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          let updated = false;
          list.forEach((t) => {
            const ref = String(t.bookingReference || t.pnr || t.PNR || t.bookingId || t.id || "").trim().toLowerCase();
            if (ref && (ref === targetId || targetId.includes(ref) || ref.includes(targetId))) {
              t.status = status;
              t.Status = status;
              if (Array.isArray(t.passengers)) {
                t.passengers.forEach((p) => { p.status = status; });
              }
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }
    } catch (e) {}
  });

  try {
    const latestRaw = localStorage.getItem("latest_ticket");
    if (latestRaw) {
      const latest = JSON.parse(latestRaw);
      const ref = String(latest?.bookingReference || latest?.pnr || latest?.bookingId || "").trim().toLowerCase();
      if (ref && (ref === targetId || targetId.includes(ref) || ref.includes(targetId))) {
        latest.status = status;
        localStorage.setItem("latest_ticket", JSON.stringify(latest));
      }
    }
  } catch (e) {}
}

export async function listFlightBookings({ passengerPhone, status, userId } = {}) {
  let bookings = [];

  const isAdmin = typeof window !== "undefined" &&
    (window.location.pathname.toLowerCase().startsWith("/admin") || localStorage.getItem("adminToken"));

  if (isAdmin) {
    try {
      const data = await requestJson(`${ADMIN_FLIGHT_ROOT}/bookings`, { method: "GET" });
      if (Array.isArray(data)) {
        bookings = data.map((record) => normalizeFlightBookingRecord(record));
      }
    } catch (err) {
      console.warn("listFlightBookings: admin fetch failed:", err);
    }
  } else {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("tripType", "Flight");
      if (passengerPhone) {
        queryParams.append("passengerPhone", passengerPhone);
      }
      if (status && status !== "All") {
        queryParams.append("status", status);
      }

      const data = await requestJson(`/api/bookings/history?${queryParams.toString()}`, { method: "GET" });
      if (Array.isArray(data)) {
        bookings = data.filter(b => b.tripType === "Flight" || b.TripType === "Flight").map((t, index) => {
          const ref = String(t.bookingReference || t.BookingReference || t.bookingId || t.BookingId || `FL-${index + 1}`).trim();
          const bid = String(t.bookingId || t.BookingId || ref).trim();
          return {
            bookingId: bid,
            bookingReference: ref,
            passengerName: t.passengerName || "Passenger",
            passengerPhone: t.passengerPhone || "",
            passengerEmail: t.passengerEmail || "",
            fromCity: t.from || t.fromCity || "",
            toCity: t.to || t.toCity || "",
            providerName: t.providerName || "SRDV Flight",
            departureTimeUtc: t.date || null,
            arrivalTimeUtc: null,
            travelClass: t.travelClass || "Economy",
            seatsBooked: 1,
            totalPriceInr: Number(t.totalFare || t.totalPriceInr || 0),
            status: t.status || t.Status || "Confirmed",
            bookedAtUtc: new Date().toISOString(),
            tripNumber: "--",
            passengers: [],
          };
        });
      }
    } catch (err) {
      console.warn("listFlightBookings: user history fetch failed:", err);
    }
  }

  // Merge locally cached tickets from localStorage
  try {
    const localKeys = ["my_flight_bookings", "user_flight_tickets", "mock_tickets", "stored_tickets", "latest_ticket"];
    localKeys.forEach((key) => {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach((t) => {
          if (!t || typeof t !== "object") return;
          const isFlight = t.ticketType === "flight" || t.fromCity || t.toCity || t.providerName?.toLowerCase().includes("flight");
          if (!isFlight) return;

          const ref = String(t.bookingReference || t.pnr || t.bookingId || "").trim();
          if (!ref) return;

          const exists = bookings.some(
            (b) => String(b.bookingReference || "").toLowerCase() === ref.toLowerCase() ||
                   String(b.bookingId || "").toLowerCase() === ref.toLowerCase()
          );

          if (!exists) {
            bookings.push({
              bookingId: ref,
              bookingReference: ref,
              passengerName: t.passengerName || (t.passengers?.[0]?.name) || "Passenger",
              passengerPhone: t.passengerPhone || t.userMobile || "",
              passengerEmail: t.passengerEmail || t.userEmail || "",
              fromCity: t.fromCity || t.from || "",
              toCity: t.toCity || t.to || "",
              providerName: t.providerName || "SRDV Flight",
              departureTimeUtc: t.departureTimeUtc || t.departureTime || t.bookedAt || null,
              arrivalTimeUtc: t.arrivalTimeUtc || t.arrivalTime || null,
              travelClass: t.travelClass || "Economy",
              seatsBooked: Array.isArray(t.passengers) ? t.passengers.length : 1,
              totalPriceInr: Number(t.totalPriceInr || t.totalPaid || 0),
              status: t.status || "Booked",
              bookedAtUtc: t.bookedAtUtc || t.bookedAt || new Date().toISOString(),
              tripNumber: t.tripNumber || "--",
              passengers: Array.isArray(t.passengers) ? t.passengers : [],
            });
          }
        });
      } catch (e) {}
    });
  } catch (err) {}

  // Filter by passengerPhone if supplied
  if (passengerPhone) {
    const cleanPhone = String(passengerPhone).replace(/\D/g, "");
    if (cleanPhone) {
      bookings = bookings.filter((b) => String(b.passengerPhone || "").replace(/\D/g, "").includes(cleanPhone));
    }
  }

  // Override status to Cancelled if present in cancelled_flight_bookings list
  try {
    const cancelledRefsRaw = typeof window !== "undefined" ? localStorage.getItem("cancelled_flight_bookings") : null;
    if (cancelledRefsRaw) {
      const cancelledRefs = JSON.parse(cancelledRefsRaw);
      if (Array.isArray(cancelledRefs)) {
        bookings.forEach((b) => {
          const ref = String(b.bookingReference || b.bookingId || "").trim().toLowerCase();
          if (cancelledRefs.some(cRef => cRef === ref || ref.includes(cRef) || cRef.includes(ref))) {
            b.status = "Cancelled";
          }
        });
      }
    }
  } catch (e) {}

  // Filter by status if supplied
  if (status && status !== "All") {
    bookings = bookings.filter((b) => String(b.status || "").toLowerCase() === String(status).toLowerCase());
  }

  bookings.sort((a, b) => new Date(b.bookedAtUtc || 0) - new Date(a.bookedAtUtc || 0));
  return bookings;
}

export async function getFlightBookingById(bookingId, { userId } = {}) {
  const allBookings = await listFlightBookings({ userId });
  const found = allBookings.find(
    (b) => String(b.bookingId || "").toLowerCase() === String(bookingId || "").toLowerCase() ||
           String(b.bookingReference || "").toLowerCase() === String(bookingId || "").toLowerCase()
  );
  if (found) return found;

  return {
    bookingId: String(bookingId),
    bookingReference: String(bookingId),
    passengerName: "Passenger",
    fromCity: "",
    toCity: "",
    providerName: "SRDV Flight",
    status: "Confirmed",
    bookedAtUtc: new Date().toISOString(),
    passengers: []
  };
}

export async function getFlightSeatMap(flightParam) {
  let flowState = {};

  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("flight_booking_flow_state_v1");
      if (raw) flowState = JSON.parse(raw) || {};
    } catch {}
  }

  // If flightParam is not an object but a string (flightId), look it up in SearchResult or fallback to flowState.flight
  if (flightParam && typeof flightParam !== "object") {
    const flightId = String(flightParam);
    let foundFlight = null;
    if (typeof window !== "undefined") {
      try {
        const rawSearch = window.sessionStorage.getItem("SearchResult");
        if (rawSearch) {
          const searchResult = JSON.parse(rawSearch);
          const list = (searchResult && searchResult.isTwoWay)
            ? [...(searchResult.onward || []), ...(searchResult.return || [])]
            : (Array.isArray(searchResult) ? searchResult : []);
          foundFlight = list.find(f => String(f.id || f.resultIndex || f.ResultIndex) === flightId);
        }
      } catch (e) {}
    }
    const flight = foundFlight || flowState.flight || {};
  } else {
    // If flightParam is an object
    var flight = flightParam || flowState.flight || {};
  }

  const traceId = flight.traceId || flight.TraceId || flowState.traceId || flowState.TraceId || "";
  const resultIndex = flight.resultIndex || flight.ResultIndex || flight.id || "";

  return getSeatMap({ traceId, resultIndex });
}

export async function getFlightPricingPreview(payload, { userId } = {}) {
  return getFareQuote(payload);
}

export async function getFlightPromotions() {
  console.warn("[flightBookingService] Endpoint removed: getFlightPromotions");
  return [];
}

export async function listAirlineWebCheckins() {
  console.warn("[flightBookingService] Endpoint removed: listAirlineWebCheckins");
  return [];
}

export async function createAirlineWebCheckin(link) {
  console.warn("[flightBookingService] Endpoint removed: createAirlineWebCheckin");
  return { success: true };
}

export async function deleteAirlineWebCheckin(linkId) {
  console.warn("[flightBookingService] Endpoint removed: deleteAirlineWebCheckin");
  return { success: true };
}

export async function getConvenienceFee() {
  console.warn("[flightBookingService] Endpoint removed: getConvenienceFee");
  return [];
}

export async function createConvenienceFee(rule) {
  console.warn("[flightBookingService] Endpoint removed: createConvenienceFee");
  return { success: true };
}

export async function deleteConvenienceFee(ruleId) {
  console.warn("[flightBookingService] Endpoint removed: deleteConvenienceFee");
  return { success: true };
}

export async function updateConvenienceFeeById(ruleId, rule) {
  console.warn("[flightBookingService] Endpoint removed: updateConvenienceFeeById");
  return { success: true };
}

export async function listFlightPromotions() {
  console.warn("[flightBookingService] Endpoint removed: listFlightPromotions");
  return [];
}

export async function deleteFlightPromotion(id) {
  console.warn("[flightBookingService] Endpoint removed: deleteFlightPromotion");
  return { success: true };
}

export async function getFlightPromotionById(id) {
  console.warn("[flightBookingService] Endpoint removed: getFlightPromotionById");
  return null;
}

export async function createFlightPromotion(payload) {
  console.warn("[flightBookingService] Endpoint removed: createFlightPromotion");
  return { success: true };
}

export async function updateFlightPromotion(id, payload) {
  console.warn("[flightBookingService] Endpoint removed: updateFlightPromotion");
  return { success: true };
}

export async function getPopularFlightRoutes() {
  console.warn("[flightBookingService] Endpoint removed: getPopularFlightRoutes");
  return [];
}

export async function createPopularFlightRoute(payload) {
  console.warn("[flightBookingService] Endpoint removed: createPopularFlightRoute");
  return { success: true };
}

export async function updatePopularFlightRoute(id, payload) {
  console.warn("[flightBookingService] Endpoint removed: updatePopularFlightRoute");
  return { success: true };
}

export async function deletePopularFlightRoute(id) {
  console.warn("[flightBookingService] Endpoint removed: deletePopularFlightRoute");
  return { success: true };
}

export async function getUserRouteSearches() {
  console.warn("[flightBookingService] Endpoint removed: getUserRouteSearches");
  return [];
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
  console.warn("[flightBookingService] Endpoint removed: listFlightPendingAirlines");
  return [];
}

export async function deleteFlightPendingAirline(id) {
  console.warn("[flightBookingService] Endpoint removed: deleteFlightPendingAirline");
  return { success: true };
}

export async function getFlightPendingAirlineById(id) {
  console.warn("[flightBookingService] Endpoint removed: getFlightPendingAirlineById");
  return null;
}

export async function createFlightPendingAirline(payload) {
  console.warn("[flightBookingService] Endpoint removed: createFlightPendingAirline");
  return { success: true };
}

export async function updateFlightPendingAirline(id, payload) {
  console.warn("[flightBookingService] Endpoint removed: updateFlightPendingAirline");
  return { success: true };
}

export async function getPopularDestinations() {
  console.warn("[flightBookingService] Endpoint removed: getPopularDestinations");
  return [];
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
  console.warn("[flightBookingService] Endpoint removed: getFlightRemarks");
  return [];
}

export async function createFlightRemark(payload) {
  console.warn("[flightBookingService] Endpoint removed: createFlightRemark");
  return { success: true };
}

export async function getFlightRemarkById(id) {
  console.warn("[flightBookingService] Endpoint removed: getFlightRemarkById");
  return null;
}

export async function updateFlightRemark(id, payload) {
  console.warn("[flightBookingService] Endpoint removed: updateFlightRemark");
  return { success: true };
}

export async function processFlightBookingCallback({
  bookingId = "1876293",
  pnr = "UK8B9D",
  status = "Success",
  passengers = []
} = {}) {
  const url = `${SRDV_ROOT}/flight_callback`;

  const payload = {
    PNR: String(pnr || ""),
    BookingId: String(bookingId || ""),
    Status: String(status || "Success"),
    Passengers: Array.isArray(passengers) && passengers.length > 0
      ? passengers.map((p) => ({
          Title: p.Title || p.title || "Mr",
          FirstName: p.FirstName || p.firstName || "Passenger",
          LastName: p.LastName || p.lastName || "User",
          TicketNumber: p.TicketNumber || p.ticketNumber || ""
        }))
      : []
  };

  return requestJson(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteFlightRemark(id) {
  console.warn("[flightBookingService] Endpoint removed: deleteFlightRemark");
  return { success: true };
}
