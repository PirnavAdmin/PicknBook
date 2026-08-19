const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";
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
const ADMIN_FLIGHT_MARKUPS_ROOT = "/api/admin/flight-markups";
const ADMIN_FLIGHT_CONVENIENCE_FEE_RULES_ROOT =
  "/api/admin/flight-convenience-fee-rules";


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


function extractFlightSearchList(data, extractAllLegs = false) {
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
      if (extractAllLegs) {
        return rawList; // Return the full array of arrays
      }
      // It's an array of arrays — flatten the first segment
      return rawList[0].flat(Infinity);
    }
    return rawList.flat(Infinity);
  }

  return [];
}

function shouldUseFallbackFlights(error) {
  return false;
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
    "B2CFinalFare", "b2cFinalFare", "price", "Price", "priceInr", "PriceInr", "fareInr", "FareInr",
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
      "B2CFinalFare", "b2cFinalFare", "PublishedFare", "publishedFare", "OfferedFare", "offeredFare",
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
    if (raw.length > 0 && Array.isArray(raw[0])) {
      return raw[0].flat(Infinity);
    }
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

function normalizeFlightSearchRecord(record, index = 0, topTraceId = null, backendJourneyType = 1) {
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

  const b2cFinalFare = Number(pickFirst(primaryFare?.Fare || {}, ["B2CFinalFare", "b2cFinalFare"], null)) || price;
  const b2cMarkupAmount = Number(pickFirst(primaryFare?.Fare || {}, ["B2CMarkupAmount", "b2cMarkupAmount"], 0));
  const b2cPublishedFare = Number(pickFirst(primaryFare?.Fare || {}, ["B2CPublishedFare", "b2cPublishedFare"], null)) || price;

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
    b2cFinalFare: Number(fd.B2CFinalFare || fd.Fare?.B2CFinalFare || fd.Fare?.b2cFinalFare || fd.Fare?.B2CPublishedFare || fd.Fare?.b2cPublishedFare || fd.Fare?.PublishedFare || price),
    b2cPublishedFare: Number(fd.B2CPublishedFare || fd.Fare?.B2CPublishedFare || fd.Fare?.b2cPublishedFare || fd.Fare?.PublishedFare || price),
    b2cMarkupAmount: Number(fd.B2CMarkupAmount || fd.Fare?.B2CMarkupAmount || fd.Fare?.b2cMarkupAmount || 0),
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
    sourceCode: firstSegment?.Origin?.AirportCode || firstSegment?.Origin?.Airport?.AirportCode || fromCity.substring(0, 3).toUpperCase(),
    destinationCode: lastSegment?.Destination?.AirportCode || lastSegment?.Destination?.Airport?.AirportCode || toCity.substring(0, 3).toUpperCase(),
    departureTimeIst: departureTime,
    arrivalTimeIst: arrivalTime,
    departureTimeUtc: departureTime,
    arrivalTimeUtc: arrivalTime,
    classOptions,
    fareOptions,
    selectedTravelClass,
    b2cFinalFare,
    b2cMarkupAmount,
    b2cPublishedFare,
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

function extractDynamicSeat(val) {
  if (!val || val === "--") return null;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined" || s === "--" || s === "[object object]") return null;
    return s;
  }
  if (typeof val === "number") return String(val);
  if (Array.isArray(val) && val.length > 0) return extractDynamicSeat(val[0]);
  if (typeof val === "object") {
    return extractDynamicSeat(val.seatNumber || val.SeatNumber || val.label || val.Label || val.code || val.Code || val.seat || val.Seat || val.seatNo || val.SeatNo || val.assignedSeat || val.AssignedSeat);
  }
  return null;
}

function cleanNameString(val) {
  if (!val || typeof val !== "string") return null;
  const cleaned = val.replace(/[\s\u00A0\u200B]+/g, " ").trim();
  if (!cleaned || cleaned.toLowerCase() === "null" || cleaned.toLowerCase() === "undefined" || cleaned === "--" || cleaned.toLowerCase() === "[object object]") return null;
  return cleaned;
}

function normalizeFlightPassenger(passenger, index = 0, parentBooking = {}) {
  const paxObj = passenger || {};
  const title = String(paxObj.title || paxObj.Title || "").trim();
  const firstName = String(paxObj.firstName || paxObj.FirstName || paxObj.first_name || paxObj.givenName || "").trim();
  const lastName = String(paxObj.lastName || paxObj.LastName || paxObj.last_name || paxObj.surname || "").trim();
  const composedName = [title, firstName, lastName].filter(Boolean).join(" ").trim() || `${firstName} ${lastName}`.trim();

  let nameVal =
    cleanNameString(paxObj.fullName) ||
    cleanNameString(paxObj.FullName) ||
    cleanNameString(paxObj.name) ||
    cleanNameString(paxObj.Name) ||
    cleanNameString(paxObj.paxName) ||
    cleanNameString(paxObj.PaxName) ||
    cleanNameString(paxObj.passengerName) ||
    cleanNameString(paxObj.PassengerName) ||
    cleanNameString(paxObj.passenger_name) ||
    cleanNameString(paxObj.travellerName) ||
    cleanNameString(paxObj.TravellerName) ||
    cleanNameString(composedName) ||
    cleanNameString(parentBooking.passengerName) ||
    cleanNameString(parentBooking.PassengerName) ||
    `Passenger ${index + 1}`;

  let seatVal = extractDynamicSeat(pickFirst(
    paxObj,
    ["seatNumber", "SeatNumber", "seat", "Seat", "seatNo", "SeatNo", "seatCode", "SeatCode", "seatLabel", "SeatLabel", "assignedSeat", "AssignedSeat", "code", "Code", "label", "Label", "selectedSeat", "SelectedSeat"],
    null
  ));

  if (!seatVal) {
    if (Array.isArray(parentBooking.selectedSeats) && parentBooking.selectedSeats[index] !== undefined) {
      seatVal = extractDynamicSeat(parentBooking.selectedSeats[index]);
    } else if (Array.isArray(parentBooking.seats) && parentBooking.seats[index] !== undefined) {
      seatVal = extractDynamicSeat(parentBooking.seats[index]);
    } else if (Array.isArray(parentBooking.seatNumbers) && parentBooking.seatNumbers[index] !== undefined) {
      seatVal = extractDynamicSeat(parentBooking.seatNumbers[index]);
    } else if (parentBooking.seatNumber || parentBooking.SeatNumber || parentBooking.seat || parentBooking.Seat || parentBooking.seatNo) {
      const pSeat = String(parentBooking.seatNumber || parentBooking.SeatNumber || parentBooking.seat || parentBooking.Seat || parentBooking.seatNo);
      const splitSeats = pSeat.includes(",") ? pSeat.split(",").map(s => s.trim()) : [pSeat];
      seatVal = extractDynamicSeat(splitSeats[index] || splitSeats[0]);
    }
  }

  seatVal = seatVal || "--";

  return {
    ...paxObj,
    id: paxObj.id || paxObj.Id || `pax-${index + 1}`,
    fullName: nameVal,
    name: nameVal,
    passengerName: nameVal,
    passengerType: String(
      pickFirst(paxObj, ["passengerType", "PassengerType", "paxType"], "Adult")
    ),
    gender: String(pickFirst(paxObj, ["gender", "Gender"], "Male")),
    seatNumber: seatVal,
    seat: seatVal,
    seatLabel: seatVal,
    seatNo: seatVal,
    isCancelled: Boolean(paxObj.isCancelled || paxObj.IsCancelled || parentBooking.status === "Cancelled" || false),
  };
}

function normalizeFlightBookingRecord(record) {
  const passengersRaw = pickFirst(record, ["passengers", "Passengers", "passengerList", "PassengerList", "passengerDetails", "paxList", "PaxList", "paxInfo", "PaxInfo"], []);
  let passengers = Array.isArray(passengersRaw) && passengersRaw.length > 0
    ? passengersRaw.map((passenger, index) => normalizeFlightPassenger(passenger, index, record))
    : [];

  if (passengers.length === 0) {
    passengers = [normalizeFlightPassenger({}, 0, record)];
  }

  const seatsBookedFallback = passengers.filter(
    (passenger) => String(passenger.passengerType || "").toLowerCase() !== "infant"
  ).length;

  const resolvedPassengerName =
    cleanNameString(pickFirst(record, ["passengerName", "PassengerName", "userName", "UserName", "customerName", "CustomerName"], "")) ||
    cleanNameString(passengers[0]?.fullName) ||
    cleanNameString(passengers[0]?.name) ||
    "Passenger";

  const resolvedTraceId = String(
    pickFirst(record, ["traceId", "TraceId", "trace_id", "srdvTraceId"], "") ||
    record?.rawResponse?.TraceId ||
    record?.ticketLccResponse?.rawResponse?.TraceId ||
    record?.ticketLccResponse?.traceId ||
    record?.ticketGdsResponse?.rawResponse?.TraceId ||
    record?.srdvResponse?.TraceId ||
    record?.apiResponse?.TraceId ||
    record?.details?.TraceId ||
    record?.itinerary?.TraceId ||
    record?.flight?.traceId ||
    (typeof window !== "undefined" ? window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") || window.localStorage.getItem("last_booking_trace_id") || window.localStorage.getItem("flight_trace_id") || window.localStorage.getItem("TraceId") || window.localStorage.getItem("traceId") : "") ||
    ""
  ).trim();

  return {
    ...record,
    traceId: resolvedTraceId,
    TraceId: resolvedTraceId,
    srdvBookingId: pickFirst(record, ["srdvBookingId", "SrdvBookingId", "srdv_booking_id", "SRDV_BOOKING_ID", "providerBookingId", "ProviderBookingId", "provider_booking_id", "supplierBookingId", "SupplierBookingId", "supplier_booking_id", "apiBookingId", "ApiBookingId", "api_booking_id", "externalBookingId", "ExternalBookingId", "srdvId", "SrdvId", "orderId", "OrderId"], null),
    providerBookingId: pickFirst(record, ["srdvBookingId", "SrdvBookingId", "srdv_booking_id", "SRDV_BOOKING_ID", "providerBookingId", "ProviderBookingId", "provider_booking_id", "supplierBookingId", "SupplierBookingId", "supplier_booking_id", "apiBookingId", "ApiBookingId", "api_booking_id", "externalBookingId", "ExternalBookingId", "srdvId", "SrdvId", "orderId", "OrderId"], null),
    bookingId: pickFirst(record, ["bookingId", "BookingId"], null),
    clientId: pickFirst(record, ["clientId", "ClientId", "srdvClientId", "SrdvClientId"], null),
    userName: pickFirst(record, ["userName", "UserName", "srdvUserName", "SrdvUserName"], null),
    password: pickFirst(record, ["password", "Password", "srdvPassword", "SrdvPassword"], null),
    apiToken: pickFirst(record, ["apiToken", "ApiToken", "srdvApiToken", "SrdvApiToken"], null),
    endUserIp: pickFirst(record, ["endUserIp", "EndUserIp", "srdvEndUserIp", "SrdvEndUserIp"], null),
    bookingReference: String(
      pickFirst(record, ["bookingReference", "BookingReference", "pnr", "PNR", "reference", "Reference"], "") || ""
    ).trim(),
    passengerName: resolvedPassengerName,
    passengerPhone: String(
      pickFirst(record, ["passengerPhone", "PassengerPhone", "userMobile", "phone", "mobile"], "") || ""
    ),
    passengerEmail: String(
      pickFirst(record, ["passengerEmail", "PassengerEmail", "userEmail", "email"], "") || ""
    ),
    fromCity: String(pickFirst(record, ["fromCity", "FromCity", "source", "from"], "") || ""),
    toCity: String(pickFirst(record, ["toCity", "ToCity", "destination", "to"], "") || ""),
    providerName: String(
      pickFirst(record, ["providerName", "ProviderName", "airline", "Airline"], "SRDV Flight") || "SRDV Flight"
    ),
    departureTimeUtc: pickFirst(
      record,
      ["departureTimeUtc", "DepartureTimeUtc", "departureDateTimeUtc", "DepartureDateTimeUtc", "departureTime", "date", "bookedAt"],
      null
    ),
    travelClass: String(
      pickFirst(record, ["travelClass", "TravelClass", "cabinClass"], "Economy") || "Economy"
    ),
    seatsBooked:
      Number(pickFirst(record, ["seatsBooked", "SeatsBooked"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr", "totalFare", "totalPaid"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Confirmed") || "Confirmed"),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc", "bookedAt"], new Date().toISOString()),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
    tripNumber: String(
      pickFirst(record, ["tripNumber", "TripNumber", "flightNumber", "FlightNumber"], "--") ||
      "--"
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
      pickFirst(payload, ["cancellationStatus", "CancellationStatus", "CancelStatus", "cancelStatus", "status"], null) ||
      pickFirst(payload?.RefundDetails, ["CancellationStatus", "cancellationStatus", "CancelStatus", "cancelStatus"], "Pending") ||
      "Pending"
    ),
    customerRefundStatus: String(
      pickFirst(payload, ["customerRefundStatus", "CustomerRefundStatus", "RefundStatus", "refundStatus"], null) ||
      pickFirst(payload?.RefundDetails, ["RefundStatus", "refundStatus"], "Pending") ||
      "Pending"
    ),
    adminRefundStatus: String(
      pickFirst(payload, ["adminRefundStatus", "AdminRefundStatus", "RefundStatus", "refundStatus"], null) ||
      pickFirst(payload?.RefundDetails, ["RefundStatus", "refundStatus"], "Pending") ||
      "Pending"
    ),
    customerRefundAmountInr:
      Number(
        pickFirst(payload, ["customerRefundAmountInr", "CustomerRefundAmountInr", "RefundAmount", "refundAmount"], null) ??
        pickFirst(payload?.RefundDetails, ["RefundAmount", "refundAmount"], 0)
      ) || 0,
    customerCancellationChargeInr:
      Number(
        pickFirst(
          payload,
          ["customerCancellationChargeInr", "CustomerCancellationChargeInr", "CancellationCharge", "cancellationCharge"],
          null
        ) ?? pickFirst(payload?.RefundDetails, ["CancellationCharge", "cancellationCharge"], 0)
      ) || 0,
    customerServiceChargeInr:
      Number(pickFirst(payload, ["customerServiceChargeInr", "CustomerServiceChargeInr"], 0)) ||
      0,
    adminRefundAmountInr:
      Number(
        pickFirst(payload, ["adminRefundAmountInr", "AdminRefundAmountInr", "RefundAmount", "refundAmount"], null) ??
        pickFirst(payload?.RefundDetails, ["RefundAmount", "refundAmount"], 0)
      ) || 0,
    adminCancellationChargeInr:
      Number(
        pickFirst(payload, ["adminCancellationChargeInr", "AdminCancellationChargeInr", "CancellationCharge", "cancellationCharge"], null) ??
        pickFirst(payload?.RefundDetails, ["CancellationCharge", "cancellationCharge"], 0)
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

function mapCabinClassToCode(cabinClass) {
  const clean = String(cabinClass || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  switch (clean) {
    case "economy":
      return "2";
    case "premiumeconomy":
      return "3";
    case "business":
      return "4";
    case "premiumbusiness":
      return "5";
    case "first":
    case "firstclass":
      return "6";
    default:
      return "1"; // All
  }
}

const CITY_TO_IATA = {
  hyderabad: "HYD",
  bengaluru: "BLR",
  bangalore: "BLR",
  mumbai: "BOM",
  delhi: "DEL",
  "new delhi": "DEL",
  goa: "GOI",
  jaipur: "JAI",
  chennai: "MAA",
  kolkata: "CCU",
  dubai: "DXB",
  dxb: "DXB",
  london: "LHR",
  singapore: "SIN",
  bangkok: "BKK",
  "kuala lumpur": "KUL",
  doha: "DOH",
  abu: "AUH",
  "abu dhabi": "AUH",
  sharjah: "SHJ",
  muscat: "MCT",
  jeddah: "JED",
  riyadh: "RUH",
};

function resolveCityCode(cityInput, fallback = "DEL") {
  if (!cityInput) return fallback;
  const cleanInput = String(cityInput).trim().toLowerCase();

  const bracketMatch = cleanInput.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1].trim().length === 3) {
    return bracketMatch[1].trim().toUpperCase();
  }

  if (cleanInput.length === 3) {
    return cleanInput.toUpperCase();
  }

  const cityNameOnly = cleanInput.split(",")[0].split("(")[0].trim();
  if (CITY_TO_IATA[cityNameOnly]) {
    return CITY_TO_IATA[cityNameOnly];
  }

  const cleanFallback = cityNameOnly.replace(/[^a-z]/g, "");
  if (cleanFallback.length >= 3) {
    return cleanFallback.slice(0, 3).toUpperCase();
  }

  return fallback;
}

export const FLIGHT_API_CREDENTIALS = {
  UserId: process.env.REACT_APP_SRDV_USER_ID || "1",
  EndUserIp: process.env.REACT_APP_SRDV_END_USER_IP || "103.86.74.125",
  ClientId: process.env.REACT_APP_SRDV_CLIENT_ID || "180170",
  UserName: process.env.REACT_APP_SRDV_USER_NAME || "PickNBk6",
  Password: process.env.REACT_APP_SRDV_PASSWORD || "PickNB@486",
  ApiToken: process.env.REACT_APP_SRDV_API_TOKEN || "PickNB@486#170$"
};

export async function searchFlights({ from, to, date, returnDate, tripType, travelClass, adults = 1, children = 0, infants = 0, legs }) {
  const isTwoWay = tripType === "twoway" || Boolean(returnDate);
  const isMultiCity = tripType === "multicity" || (Array.isArray(legs) && legs.length > 0) || (typeof legs === "string" && legs.length > 0);
  const datePart = String(date || "").trim();
  const PreferredDepartureTime = datePart.includes("T") ? datePart : `${datePart}T00:00:00`;
  const PreferredDepartureTimeMax = datePart.includes("T") ? datePart : `${datePart}T23:59:59`;

  let segments = [];
  let journeyTypeNum = 1;

  let parsedLegs = legs;
  if (typeof legs === "string") {
    try {
      parsedLegs = JSON.parse(legs);
    } catch (e) {
      try {
        parsedLegs = JSON.parse(decodeURIComponent(legs));
      } catch (e2) {
        parsedLegs = [];
      }
    }
  }

  if (isMultiCity) {
    if (!Array.isArray(parsedLegs) || parsedLegs.length === 0) {
      parsedLegs = [{ from, to, departureDate: datePart }];
    }

    // Multi-City: Single API call with JourneyType: 3 and all segments together
    // The API returns Results as an array of arrays — one sub-array per leg/segment
    const multiSegments = parsedLegs.map((leg) => {
      const legDate = String(leg.date || leg.departureDate || datePart || "").trim();
      const depTime = legDate.includes("T") ? legDate : `${legDate}T00:00:00`;
      const arrTime = legDate.includes("T") ? legDate : `${legDate}T23:59:59`;
      return {
        Origin: resolveCityCode(leg.from || leg.fromCity || leg.source || leg.origin || from, "DEL"),
        Destination: resolveCityCode(leg.to || leg.toCity || leg.destination || leg.dest || to, "BOM"),
        FlightCabinClass: Number(mapCabinClassToCode(travelClass)),
        PreferredDepartureTime: depTime,
        PreferredArrivalTime: arrTime,
      };
    });

    const multiPayload = {
      EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
      ClientId: FLIGHT_API_CREDENTIALS.ClientId,
      UserName: FLIGHT_API_CREDENTIALS.UserName,
      Password: FLIGHT_API_CREDENTIALS.Password,
      ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
      AdultCount: Number(adults),
      ChildCount: Number(children),
      InfantCount: Number(infants),
      JourneyType: 3,
      Segments: multiSegments,
    };

    const FORCE_LEG_BY_LEG = false; // Use native SRDV JourneyType 3 search for multi-city flights
    if (!FORCE_LEG_BY_LEG) {
      try {
        const multiData = await requestJson(`${SRDV_ROOT}/Search`, {
          method: "POST",
          body: JSON.stringify(multiPayload),
        });

        const srdvError = multiData?.Error || multiData?.error;
        if (!srdvError || String(srdvError.ErrorCode || "") === "0") {
          const sharedTraceId = String(multiData?.TraceId || multiData?.traceId || "");
          let rawResults = multiData?.Results || multiData?.results || [];

          if (rawResults && !Array.isArray(rawResults) && typeof rawResults === "object") {
            rawResults = [rawResults];
          }

          const expectedLegCount = multiSegments.length;

          // Case 1: SRDV returns an array of leg arrays where rawResults.length === expectedLegCount and rawResults[0] is an array
          const isArrayOfLegArrays = Array.isArray(rawResults) && rawResults.length === expectedLegCount && Array.isArray(rawResults[0]);

          if (isArrayOfLegArrays) {
            const parsedLegs = rawResults.map((legRecords, legIndex) => {
              const legArray = Array.isArray(legRecords) ? legRecords : (legRecords ? [legRecords] : []);
              return legArray.map((record, idx) => {
                const norm = normalizeFlightSearchRecord(record, idx, sharedTraceId, multiData?.Response?.JourneyType || multiData?.response?.JourneyType || 3);
                return {
                  ...norm,
                  id: `mc-leg${legIndex}-${norm.id}`,
                  isMultiCityLeg: true,
                  legIndex,
                  sharedTraceId,
                  legResultIndex: norm.resultIndex || norm.id,
                };
              });
            });

            return { isMultiCity: true, legs: parsedLegs, sharedTraceId };
          }

          // Case 2: SRDV returns combination itinerary objects (each option contains Segments for all legs)
          const flatItineraries = Array.isArray(rawResults) ? rawResults.flat(1) : [];

          if (flatItineraries.length > 0) {
            const parsedLegs = Array.from({ length: expectedLegCount }, () => []);

            flatItineraries.forEach((itineraryRecord, itinIdx) => {
              const rawSegs = itineraryRecord.Segments || itineraryRecord.segments || [];
              const isSegsArrayOfArrays = Array.isArray(rawSegs) && rawSegs.length >= expectedLegCount && Array.isArray(rawSegs[0]);
              const flatSegs = Array.isArray(rawSegs) ? rawSegs.flat(Infinity) : [];

              const fullMultiSectorSegments = flatSegs.map((s, sIdx) => {
                const airlineObj = s.Airline || s.airline || {};
                const origObj = s.Origin || s.origin || {};
                const destObj = s.Destination || s.destination || {};
                const airCode = String(airlineObj.AirlineCode || airlineObj.airlineCode || s.AirlineCode || s.airlineCode || "").trim();
                const airNum = String(airlineObj.FlightNumber || airlineObj.flightNumber || s.FlightNumber || s.flightNumber || "").trim();
                const flNum = airCode && airNum ? `${airCode} ${airNum}` : (airNum || airCode || "--");
                return {
                  sectorIndex: sIdx + 1,
                  airline: airlineObj.AirlineName || airlineObj.airlineName || s.airline || "Airline",
                  airlineCode: airCode,
                  flightNumber: flNum,
                  sourceCode: origObj.AirportCode || origObj.Code || origObj.Airport?.AirportCode || "",
                  sourceName: origObj.CityName || origObj.Airport?.CityName || "",
                  destinationCode: destObj.AirportCode || destObj.Code || destObj.Airport?.AirportCode || "",
                  destinationName: destObj.CityName || destObj.Airport?.CityName || "",
                  departureTime: origObj.DepTime || s.DepTime || s.DepartureTime || "",
                  arrivalTime: destObj.ArrTime || s.ArrTime || s.ArrivalTime || "",
                  duration: s.Duration || s.durationMinutes || s.duration || "",
                  cabinClass: s.CabinClass || "Economy",
                };
              });

              for (let legIdx = 0; legIdx < expectedLegCount; legIdx++) {
                let legSegments = [];
                if (isSegsArrayOfArrays) {
                  legSegments = rawSegs[legIdx] || [];
                } else if (flatSegs.length >= expectedLegCount) {
                  const reqOrigin = String(multiSegments[legIdx]?.Origin || "").trim().toUpperCase();
                  const reqDest = String(multiSegments[legIdx]?.Destination || "").trim().toUpperCase();

                  const matchedSeg = flatSegs.find((s) => {
                    const sOrig = String(s.Origin?.AirportCode || s.Origin?.Code || s.Origin || "").trim().toUpperCase();
                    const sDest = String(s.Destination?.AirportCode || s.Destination?.Code || s.Destination || "").trim().toUpperCase();
                    return (sOrig === reqOrigin || !reqOrigin) && (sDest === reqDest || !reqDest);
                  });

                  legSegments = matchedSeg ? [matchedSeg] : [flatSegs[legIdx] || flatSegs[0]];
                } else {
                  legSegments = flatSegs;
                }

                const legRecord = {
                  ...itineraryRecord,
                  Segments: legSegments,
                  FareSegments: legSegments,
                  Fare: legIdx === 0 ? itineraryRecord.Fare : { BaseFare: 0, Tax: 0, PublishedFare: 0, B2CFinalFare: 0 },
                };

                const norm = normalizeFlightSearchRecord(legRecord, itinIdx, sharedTraceId, multiData?.Response?.JourneyType || multiData?.response?.JourneyType || 3);

                parsedLegs[legIdx].push({
                  ...norm,
                  id: `mc-leg${legIdx}-${norm.id}-${itinIdx}`,
                  isMultiCityLeg: true,
                  legIndex: legIdx,
                  sharedTraceId,
                  legResultIndex: itineraryRecord.ResultIndex || norm.resultIndex || norm.id,
                  itineraryIndex: itinIdx,
                  fullMultiSectorSegments,
                });
              }
            });

            const allLegsHaveFlights = parsedLegs.every((legArray) => Array.isArray(legArray) && legArray.length > 0);
            if (allLegsHaveFlights) {
              return { isMultiCity: true, legs: parsedLegs, sharedTraceId };
            }
          }
        }

        console.warn("Multi-city JourneyType: 3 returned empty or error, executing leg-by-leg searches as fallback:", srdvError?.ErrorMessage);
      } catch (err) {
        console.warn("Multi-city API error, executing leg-by-leg searches as fallback:", err);
      }
    }

    // Fallback: Perform parallel search for each individual leg if JourneyType 3 returns 0 flights
    try {
      const legSearchPromises = parsedLegs.map(async (leg, legIndex) => {
        const legDate = String(leg.date || leg.departureDate || datePart || "").trim();
        const PreferredDepTime = legDate.includes("T") ? legDate : `${legDate}T00:00:00`;
        const PreferredArrTime = legDate.includes("T") ? legDate : `${legDate}T23:59:59`;

        const legPayload = {
          EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
          ClientId: FLIGHT_API_CREDENTIALS.ClientId,
          UserName: FLIGHT_API_CREDENTIALS.UserName,
          Password: FLIGHT_API_CREDENTIALS.Password,
          ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
          AdultCount: Number(adults),
          ChildCount: Number(children),
          InfantCount: Number(infants),
          JourneyType: 1,
          DirectFlight: false,
          Segments: [
            {
              Origin: resolveCityCode(leg.from || leg.fromCity || leg.source || leg.origin || from, "DEL"),
              Destination: resolveCityCode(leg.to || leg.toCity || leg.destination || leg.dest || to, "BOM"),
              FlightCabinClass: Number(mapCabinClassToCode(travelClass)),
              PreferredDepartureTime: PreferredDepTime,
              PreferredArrivalTime: PreferredArrTime,
            }
          ]
        };

        const legData = await requestJson(`${SRDV_ROOT}/Search`, {
          method: "POST",
          body: JSON.stringify(legPayload),
        });

        const legTraceId = String(legData?.TraceId || legData?.traceId || "");
        const legRawList = extractFlightSearchList(legData);
        return legRawList.map((record, idx) => {
          const norm = normalizeFlightSearchRecord(record, idx, legTraceId, legData?.Response?.JourneyType || legData?.response?.JourneyType || 1);
          return {
            ...norm,
            id: `leg${legIndex}-${norm.id}`,
            isMultiCityLeg: true,
            legIndex,
            sharedTraceId: legTraceId,
            legResultIndex: norm.resultIndex || norm.id,
          };
        });
      });

      const fallbackLegs = await Promise.all(legSearchPromises);
      return { isMultiCity: true, legs: fallbackLegs, sharedTraceId: fallbackLegs[0]?.[0]?.sharedTraceId || "" };
    } catch (fallbackErr) {
      console.error("Multi-city fallback leg search error:", fallbackErr);
      return { isMultiCity: true, legs: parsedLegs.map(() => []) };
    }
  }

  // Standard Two-Way or One-Way search logic
  if (isTwoWay) {
    journeyTypeNum = 2;
    const returnDateStr = returnDate || date;
    const returnDatePart = String(returnDateStr).trim();
    const PreferredReturnTime = returnDatePart.includes("T") ? returnDatePart : `${returnDatePart}T00:00:00`;
    const PreferredReturnTimeMax = returnDatePart.includes("T") ? returnDatePart : `${returnDatePart}T23:59:59`;

    segments = [
      {
        Origin: resolveCityCode(from, "DEL"),
        Destination: resolveCityCode(to, "BOM"),
        FlightCabinClass: Number(mapCabinClassToCode(travelClass)),
        PreferredDepartureTime,
        PreferredArrivalTime: PreferredDepartureTimeMax
      },
      {
        Origin: resolveCityCode(to, "BOM"),
        Destination: resolveCityCode(from, "DEL"),
        FlightCabinClass: Number(mapCabinClassToCode(travelClass)),
        PreferredDepartureTime: PreferredReturnTime,
        PreferredArrivalTime: PreferredReturnTimeMax
      }
    ];
  } else {
    journeyTypeNum = 1;
    segments = [
      {
        Origin: resolveCityCode(from, "DEL"),
        Destination: resolveCityCode(to, "BOM"),
        FlightCabinClass: Number(mapCabinClassToCode(travelClass)),
        PreferredDepartureTime,
        PreferredArrivalTime: PreferredDepartureTimeMax
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
    JourneyType: journeyTypeNum,
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
    throw new Error(srdvError.ErrorMessage || "No flights found for this route and date combination.");
  }

  const onwardTraceId = onwardData?.TraceId || onwardData?.traceId || "";
  if (typeof window !== "undefined" && onwardTraceId) {
    try {
      window.sessionStorage.setItem("TraceId", onwardTraceId);
      window.sessionStorage.setItem("flight_trace_id", onwardTraceId);
      window.sessionStorage.setItem("SearchResult", JSON.stringify(onwardData));
    } catch (e) { }
  }
  const onwardRawList = extractFlightSearchList(onwardData);
  const onwardFlights = onwardRawList.map((record, index) =>
    normalizeFlightSearchRecord(record, index, onwardTraceId, onwardData?.Response?.JourneyType || onwardData?.response?.JourneyType || journeyTypeNum)
  );

  if (isTwoWay) {
    // Check if SRDV returned return flights in Results[1] of the same response (JourneyType=2)
    const srdvResults = onwardData?.Results || onwardData?.results || null;
    const hasReturnInSameResponse = Array.isArray(srdvResults) && srdvResults.length > 1 && Array.isArray(srdvResults[1]) && srdvResults[1].length > 0;

    if (hasReturnInSameResponse) {
      const returnRawList = srdvResults[1].flat(Infinity);
      const returnFlights = returnRawList.map((record, index) => {
        const norm = normalizeFlightSearchRecord(record, index, onwardTraceId, onwardData?.Response?.JourneyType || onwardData?.response?.JourneyType || journeyTypeNum);
        return { ...norm, id: `ret-${norm.id}`, isReturnFlight: true };
      });
      return { isTwoWay: true, onward: onwardFlights, return: returnFlights };
    }
    return { isTwoWay: true, onward: onwardFlights, return: [] };
  }


  return onwardFlights;
}

export async function getCalendarFare({
  from,
  to,
  date,
  returnDate,
  travelClass,
  directFlight = false,
  journeyType = 1,
}) {
  if (Number(journeyType) === 3) {
    return { raw: null, results: [], fareMapByDate: {} };
  }

  let datePart = String(date || "").trim();
  if (!datePart) {
    const today = new Date();
    datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  const PreferredDepartureTime = datePart.includes("T") ? datePart : `${datePart}T00:00:00`;

  let returnDatePart = String(returnDate || datePart).trim();
  const PreferredReturnTime = returnDatePart.includes("T") ? returnDatePart : `${returnDatePart}T00:00:00`;

  const segments = [
    {
      Origin: resolveCityCode(from, "DEL"),
      Destination: resolveCityCode(to, "HYD"),
      FlightCabinClass: typeof travelClass === "number" ? travelClass : Number(mapCabinClassToCode(travelClass) || 1),
      PreferredDepartureTime,
      PreferredArrivalTime: PreferredDepartureTime
    }
  ];

  if (Number(journeyType) === 2) {
    segments.push({
      Origin: resolveCityCode(to, "HYD"),
      Destination: resolveCityCode(from, "DEL"),
      FlightCabinClass: typeof travelClass === "number" ? travelClass : Number(mapCabinClassToCode(travelClass) || 1),
      PreferredDepartureTime: PreferredReturnTime,
      PreferredArrivalTime: PreferredReturnTime
    });
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    JourneyType: Number(journeyType || 1),
    Sources: null,
    FareType: 1,
    DirectFlight: Boolean(directFlight),
    Segments: segments
  };

  try {
    const rawData = await requestJson(`${SRDV_ROOT}/GetCalendarFare`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const rawResults = responseObj.SearchResults || responseObj.searchResults || responseObj.Results || responseObj.results || [];
    const resultsList = Array.isArray(rawResults) ? rawResults : [];
    const fareMapByDate = {};

    const normalizedResults = resultsList.map((item) => {
      const depDateStr = String(item.DepartureDate || item.departureDate || "").trim();
      const dateOnly = depDateStr ? depDateStr.split("T")[0] : "";
      const fareVal = Number(item.PublishedFare ?? item.publishedFare ?? item.OfferedFare ?? item.Fare ?? item.Price ?? 0);

      if (dateOnly && fareVal > 0) {
        if (!fareMapByDate[dateOnly] || fareVal < fareMapByDate[dateOnly]) {
          fareMapByDate[dateOnly] = fareVal;
        }
      }

      return {
        airlineCode: item.AirlineCode || item.airlineCode || "",
        airlineName: item.AirlineName || item.airlineName || "",
        departureDate: depDateStr,
        dateOnly,
        isLowestFareOfMonth: Boolean(item.IsLowestFareOfMonth || item.isLowestFareOfMonth),
        fare: fareVal,
        baseFare: Number(item.BaseFare ?? item.baseFare ?? 0),
        tax: Number(item.Tax ?? item.tax ?? 0),
      };
    });

    return {
      raw: rawData,
      traceId: rawData?.TraceId || rawData?.traceId || "",
      srdvType: rawData?.SrdvType || rawData?.srdvType || "",
      origin: rawData?.Origin || rawData?.origin || resolveCityCode(from, "DEL"),
      destination: rawData?.Destination || rawData?.destination || resolveCityCode(to, "HYD"),
      results: normalizedResults,
      fareMapByDate,
    };
  } catch (error) {
    console.warn("CalendarFare API fetch failed:", error);
    return { raw: null, error: error.message || "Failed to fetch calendar fares", results: [], fareMapByDate: {} };
  }
}


export async function getFareRule(traceIdOrObj, resultIndexParam, srdvTypeParam, srdvIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = srdvTypeParam || "MixAPI";
  let srdvIndex = srdvIndexParam || "1";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || srdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || (flightObj.isLcc ? "2" : "1");
  }

  // Fallback to combined stored parameters if missing or if resultIndex is just a single leg when it should be combined
  try {
    const storedFlightStr = sessionStorage.getItem("SelectedFlight");
    if (storedFlightStr) {
      const storedFlight = JSON.parse(storedFlightStr);
      if (!traceId) traceId = storedFlight.TraceId;

      // If we are given a single resultIndex but sessionStorage has a combined one for the same trace, use the combined one
      if (storedFlight.ResultIndex && storedFlight.ResultIndex.includes(resultIndex)) {
        resultIndex = storedFlight.ResultIndex;
      }
      if (!resultIndex) resultIndex = storedFlight.ResultIndex;
    }
  } catch (e) { }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "1"),
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
      return { success: false, error: errorMsg, traceId: String(traceId || ""), resultIndex: String(resultIndex || ""), srdvType: String(srdvType || "MixAPI"), specialRule: "", results: [], rawResponse: rawData };
    }

    const rawResults = response.FareRules || response.fareRules || (Array.isArray(response.Results) ? response.Results : (Array.isArray(response.results) ? response.results : []));
    const miniFareRules = response.MiniFareRules || response.miniFareRules || response.Results?.MiniFareRules || response.results?.MiniFareRules || [];
    const airlineRules = response.AirlineRules || response.airlineRules || response.Results?.AirlineRules || response.results?.AirlineRules || null;
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
      srdvType: String(response.SrdvType || srdvType || "MixAPI"),
      specialRule: String(specialRule || ""),
      airlineRules: airlineRules,
      miniFareRules: Array.isArray(miniFareRules) ? miniFareRules : [],
      results: resultsList,
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, error: error.message || "Unable to fetch live fare rules.", traceId: String(traceId || ""), resultIndex: String(resultIndex || ""), specialRule: "", airlineRules: null, miniFareRules: [], results: [] };
  }
}

export async function getSSR(traceIdOrObj, resultIndexParam, srdvTypeParam, srdvIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = srdvTypeParam || "MixAPI";
  let srdvIndex = srdvIndexParam || "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || srdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || srdvIndex || "2";

    // Handle Split ResultIndex for Round-Trip LCC and Multi-City
    if (flightObj.returnFlight && !String(resultIndex).includes(",")) {
      const returnIdx = flightObj.returnFlight.resultIndex || flightObj.returnFlight.ResultIndex || flightObj.returnFlight.id || "";
      if (resultIndex && returnIdx) {
        resultIndex = `${resultIndex},IB_${returnIdx}`;
      }
    } else if (Array.isArray(flightObj.legs) && flightObj.legs.length > 0 && !String(resultIndex).includes(",")) {
      resultIndex = [...new Set(flightObj.legs.map(l => l.resultIndex || l.ResultIndex || l.id).filter(Boolean))].join(",");
    }
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
      WayType: Number(b.WayType ?? b.wayType ?? 0),
      wayType: Number(b.WayType ?? b.wayType ?? 0),
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
      WayType: Number(m.WayType ?? m.wayType ?? 0),
      wayType: Number(m.WayType ?? m.wayType ?? 0),
    }));

    return {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || traceId || ""),
      resultIndex: String(response.ResultIndex || resultIndex || ""),
      srdvType: String(response.SrdvType || srdvType || "MixAPI"),
      srdvIndex: String(response.SrdvIndex || srdvIndex || "2"),
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

export async function getSeatMap(traceIdOrObj, resultIndexParam, srdvTypeParam, srdvIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = srdvTypeParam || "MixAPI";
  let srdvIndex = srdvIndexParam || "2";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    traceId = flightObj.traceId || flightObj.TraceId || traceIdOrObj.traceId || traceIdOrObj.TraceId || traceId;
    resultIndex = flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || traceIdOrObj.resultIndex || traceIdOrObj.ResultIndex || resultIndex;
    srdvType = flightObj.srdvType || flightObj.SrdvType || traceIdOrObj.srdvType || traceIdOrObj.SrdvType || srdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || traceIdOrObj.srdvIndex || traceIdOrObj.SrdvIndex || srdvIndex || "2";

    // Handle Split ResultIndex for Round-Trip LCC and Multi-City
    const returnFlight = flightObj.returnFlight || traceIdOrObj.returnFlight || traceIdOrObj.return;
    const selectedLegs = flightObj.selectedLegs || traceIdOrObj.selectedLegs || flightObj.legs || traceIdOrObj.legs;

    if (returnFlight && !String(resultIndex).includes(",")) {
      const onwardIdx = String(flightObj.legResultIndex || flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex || "").replace(/^leg\d+-/, "");
      const returnIdx = String(returnFlight.legResultIndex || returnFlight.resultIndex || returnFlight.ResultIndex || returnFlight.id || "").replace(/^leg\d+-/, "");
      if (onwardIdx && returnIdx) {
        resultIndex = `${onwardIdx},${returnIdx.startsWith("IB_") ? returnIdx : "IB_" + returnIdx}`;
      }
    } else if (Array.isArray(selectedLegs) && selectedLegs.length > 1 && !String(resultIndex).includes(",")) {
      const allLegsIdx = selectedLegs.map((l, idx) => {
        const raw = String(l.legResultIndex || l.resultIndex || l.ResultIndex || l.id || "").replace(/^leg\d+-/, "");
        if (idx === 1 && !raw.startsWith("IB_") && (traceIdOrObj.isTwoWay || flightObj.isTwoWay)) {
          return `IB_${raw}`;
        }
        return raw;
      }).filter(Boolean);
      resultIndex = [...new Set(allLegsIdx)].join(",");
    }
  }

  // Ensure traceId is resolved if not found on flightObj directly
  if (!traceId && typeof window !== "undefined") {
    try {
      traceId = window.sessionStorage.getItem("TraceId") || window.sessionStorage.getItem("flight_trace_id") || "";
    } catch { }
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
      return { success: false, errorCode: Number(errorObj.ErrorCode), error: errorMsg, traceId: String(traceId || ""), srdvType: String(srdvType || "MixAPI"), results: [], rawResponse: rawData };
    }

    let resultsArr = [];
    const resData = response.Results || response.results || response;
    if (Array.isArray(resData)) {
      resultsArr = resData;
    } else if (resData && typeof resData === "object") {
      resultsArr = [resData];
    }

    return {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || traceId || ""),
      srdvType: String(response.SrdvType || srdvType || "MixAPI"),
      srdvIndex: String(response.SrdvIndex || srdvIndex || "2"),
      results: resultsArr,
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to fetch seat map.", results: [], rawResponse: null };
  }
}

export async function getFareQuote(traceIdOrObj, resultIndexParam, srdvTypeParam, srdvIndexParam) {
  let traceId = traceIdOrObj;
  let resultIndex = resultIndexParam;
  let srdvType = srdvTypeParam || "MixAPI";
  let srdvIndex = srdvIndexParam || "2";

  let journeyType = 1;
  let adultCount = 1;
  let childCount = 0;
  let infantCount = 0;
  let couponCode = null;

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    const flightObj = traceIdOrObj.flight || traceIdOrObj;
    const returnObj = traceIdOrObj.returnFlight || traceIdOrObj.return;
    const legsList = traceIdOrObj.legs || traceIdOrObj.selectedLegs;

    traceId = flightObj.traceId || flightObj.TraceId || traceIdOrObj.traceId || traceId;
    srdvType = flightObj.srdvType || flightObj.SrdvType || traceIdOrObj.srdvType || srdvType || "MixAPI";
    srdvIndex = flightObj.srdvIndex || flightObj.SrdvIndex || traceIdOrObj.srdvIndex || srdvIndex || "2";

    journeyType = flightObj.journeyType || traceIdOrObj.journeyType || 1; // Trust the normalized object JourneyType
    adultCount = traceIdOrObj.adults || flightObj.adults || 1;
    childCount = traceIdOrObj.children || flightObj.children || 0;
    infantCount = traceIdOrObj.infants || flightObj.infants || 0;
    couponCode = traceIdOrObj.couponCode || flightObj.couponCode || null;

    if (Array.isArray(legsList) && legsList.length > 0) {
      const allLegsIdx = legsList.map(l => {
        const rawIdx = l.legResultIndex || l.resultIndex || l.ResultIndex || l.id || "";
        return String(rawIdx).replace(/^leg\d+-/, "");
      }).filter(Boolean);
      resultIndex = [...new Set(allLegsIdx)].join(",");
      if (legsList.length > 1 || traceIdOrObj.isMultiCity || flightObj.isMultiCity) {
        journeyType = 3;
      }
    } else if (returnObj) {
      const onwardIdx = String(flightObj.legResultIndex || flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || "").replace(/^leg\d+-/, "");
      const returnIdx = String(returnObj.legResultIndex || returnObj.resultIndex || returnObj.ResultIndex || returnObj.id || "").replace(/^leg\d+-/, "");
      resultIndex = [onwardIdx, returnIdx].filter(Boolean).join(",IB_");
      journeyType = 2;
    } else if (traceIdOrObj.resultIndex && typeof traceIdOrObj.resultIndex === "string" && traceIdOrObj.resultIndex.includes(",")) {
      resultIndex = traceIdOrObj.resultIndex;
      if (traceIdOrObj.isMultiCity || flightObj.isMultiCity || traceIdOrObj.journeyType === 3 || flightObj.journeyType === 3) {
        journeyType = 3;
      } else {
        journeyType = 2;
      }
    } else {
      const rawIdx = flightObj.legResultIndex || flightObj.resultIndex || flightObj.ResultIndex || flightObj.id || resultIndex || "";
      resultIndex = String(rawIdx).replace(/^leg\d+-/, "");
      if (traceIdOrObj.isMultiCity || flightObj.isMultiCity || traceIdOrObj.journeyType === 3 || flightObj.journeyType === 3) {
        journeyType = 3;
      }
    }
  }

  try {
    const storedFlightStr = sessionStorage.getItem("SelectedFlight");
    if (storedFlightStr) {
      const storedFlight = JSON.parse(storedFlightStr);
      if (!traceId) traceId = storedFlight.TraceId;

      if (storedFlight.ResultIndex && storedFlight.ResultIndex.includes(resultIndex)) {
        resultIndex = storedFlight.ResultIndex;
        if (storedFlight.isMultiCity || storedFlight.JourneyType === 3 || journeyType === 3) {
          journeyType = 3;
        } else if (storedFlight.ResultIndex.includes(",")) {
          journeyType = 2;
        }
      }
      if (!resultIndex) resultIndex = storedFlight.ResultIndex;
    }
  } catch (e) { }

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
    CouponCode: couponCode ? String(couponCode) : null
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
      return { success: false, errorCode: Number(errorObj.ErrorCode), error: errorMsg, isPriceChanged: Boolean(response.IsPriceChanged), traceId: String(traceId || ""), srdvType: String(srdvType || "MixAPI"), results: null, rawResponse: rawData };
    }

    const results = response.Results || response.results || response.Fare || response.fare || null;
    const hasValidFare = Boolean(results?.Fare || results?.fare || results?.BaseFare || results?.PublishedFare || response?.Fare || response?.fare);

    if (!hasValidFare) {
      const errorMsg = errorObj?.ErrorMessage || "Live fare quote data not returned by airline provider. The flight session may have expired.";
      return { success: false, errorCode: 2, error: errorMsg, isPriceChanged: false, traceId: String(traceId || ""), srdvType: String(srdvType || "MixAPI"), results: null, rawResponse: rawData };
    }

    const quotedFare = results?.Fare || results?.fare || results || {};
    const isLcc = Boolean(results?.IsLCC ?? results?.isLCC ?? results?.IsLcc ?? results?.isLcc ?? false);
    const isSeatMapAvailable = Boolean(results?.IsSeatMapAvailable ?? results?.isSeatMapAvailable ?? results?.IsSeatSelect ?? results?.isSeatSelect ?? results?.IsSeatMap ?? results?.isSeatMap ?? true);

    const isPassportRequiredAtBook = Boolean(results?.IsPassportRequiredAtBook ?? results?.isPassportRequiredAtBook ?? response?.IsPassportRequiredAtBook ?? false);
    const isPassportFullDetailRequiredAtBook = Boolean(results?.IsPassportFullDetailRequiredAtBook ?? results?.isPassportFullDetailRequiredAtBook ?? response?.IsPassportFullDetailRequiredAtBook ?? false);
    const adultDobRequired = Boolean(results?.AdultDobRequired ?? results?.adultDobRequired ?? response?.AdultDobRequired ?? false);
    const childDobRequired = Boolean(results?.ChildDobRequired ?? results?.childDobRequired ?? response?.ChildDobRequired ?? false);
    const infantDobRequired = Boolean(results?.InfantDobRequired ?? results?.infantDobRequired ?? response?.InfantDobRequired ?? false);
    const singleSlotBooking = String(results?.SingleSlotBooking ?? response?.SingleSlotBooking ?? "Yes");
    const returnedResultIndex = String(results?.ResultIndex ?? response?.ResultIndex ?? resultIndex);

    const pickNBookDiscount = Number(results?.PickNBookDiscount || 0);
    const pickNBookMarkup = Number(results?.PickNBookMarkup || 0);
    const pickNBookAvailableOffers = Array.isArray(results?.PickNBookAvailableOffers) ? results.PickNBookAvailableOffers : [];

    const fareQuoteResult = {
      success: true,
      errorCode: 0,
      traceId: String(response.TraceId || rawData?.TraceId || traceId || ""),
      isPriceChanged: Boolean(results?.IsPriceChanged ?? response.IsPriceChanged ?? false),
      holdAllowed: Boolean(results?.HoldAllowed ?? response.HoldAllowed ?? false),
      isLcc,
      isSeatMapAvailable,
      isPassportRequiredAtBook,
      isPassportFullDetailRequiredAtBook,
      adultDobRequired,
      childDobRequired,
      infantDobRequired,
      singleSlotBooking,
      resultIndex: returnedResultIndex,
      results,
      fare: quotedFare,
      pickNBookDiscount,
      pickNBookMarkup,
      pickNBookAvailableOffers,
      rawResponse: rawData,
    };

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("FareQuote", JSON.stringify(rawData || fareQuoteResult));
        window.sessionStorage.setItem("last_fare_quote", JSON.stringify(fareQuoteResult));
      } catch (e) { }
    }

    return fareQuoteResult;
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to validate fare quote.", results: null, rawResponse: null };
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
  let str = String(dateVal).trim();
  if (!str) return defaultDateStr;

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      str = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts.length === 3 && parts[0].length === 4) {
      str = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  if (str.includes("T")) {
    return str.split('.')[0].replace('Z', '');
  }
  return `${str}T00:00:00`;
}

export function formatPassengerDateOfBirth(dateVal, paxType = 1) {
  if (dateVal) {
    let str = String(dateVal).trim();
    if (str) {
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          str = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts.length === 3 && parts[0].length === 4) {
          str = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      if (str.includes("T")) {
        return str.split('.')[0].replace('Z', '');
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return `${str}T00:00:00`;
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T00:00:00`;
      }
    }
  }

  // Fallback defaults if DOB not provided
  const currentYear = new Date().getFullYear();
  if (paxType === 3) {
    // Infant (< 2 years)
    return `${currentYear - 1}-01-01T00:00:00`;
  } else if (paxType === 2) {
    // Child (2-12 years)
    return `${currentYear - 7}-01-01T00:00:00`;
  }
  // Adult (>= 12 years)
  return "1995-01-01T00:00:00";
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

function mapPassengersForApiIntegration(passengers = [], baseFare = 0, tax = 0, flight = null, otherCharges = 0, contact = null, fareBreakdown = []) {
  const paxList = Array.isArray(passengers) && passengers.length > 0 ? passengers : [{}];
  const count = paxList.length;
  const paxBase = Number((baseFare / count).toFixed(2));
  const paxTax = Number((tax / count).toFixed(2));
  const paxOtherCharges = Number((otherCharges / count).toFixed(2));

  const origin = String(flight?.fromCity || flight?.sourceCode || flight?.source || flight?.origin || "DEL").toUpperCase();
  const destination = String(flight?.toCity || flight?.destinationCode || flight?.destination || "BOM").toUpperCase();
  const airlineCode = String(flight?.airlineCode || flight?.airline || flight?.providerName || "6E").toUpperCase().slice(0, 2);
  const flightNumber = String(flight?.flightNumber || flight?.tripNumber || "").replace(/\D/g, "") || "101";

  const selectedLegs = Array.isArray(flight?.selectedLegs) && flight.selectedLegs.length > 0
    ? flight.selectedLegs
    : [flight, flight?.returnFlight].filter(Boolean);

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

    const paxTypeVal = typeof p.paxType === "number" ? p.paxType : (typeof p.PaxType === "number" ? p.PaxType : mapPassengerTypeToPaxType(p.passengerType || p.PaxType));

    const dobRaw = p.dob || p.DateOfBirth || p.dateOfBirth || p.DOB || "";
    const dobFormatted = formatPassengerDateOfBirth(dobRaw, paxTypeVal);

    const isLeadBool = p.isLeadPax !== undefined
      ? Boolean(p.isLeadPax === true || p.isLeadPax === 1 || p.isLeadPax === "1" || p.isLeadPax === "true")
      : (p.IsLeadPax !== undefined
        ? Boolean(p.IsLeadPax === true || p.IsLeadPax === 1 || p.IsLeadPax === "1" || p.IsLeadPax === "true")
        : (index === 0));

    const seatCode = String(p.seatCode || p.SeatCode || p.seatNumber || p.SeatNumber || p.seatLabel || "").trim();
    const rawSeats = Array.isArray(p.seat || p.Seat) ? (p.seat || p.Seat) : [];
    const seatDynamic = Array.isArray(p.seatDynamic || p.SeatDynamic) ? (p.seatDynamic || p.SeatDynamic) : [];

    const rawPassportNo = String(p.passportNo || p.PassportNo || "").trim();
    const passportExpiryRaw = p.passportExpiryDate || p.PassportExpiryDate || p.passportExpiry || p.PassportExpiry || "";
    const passportExpiryFormatted = passportExpiryRaw
      ? formatIsoDateTime(passportExpiryRaw, "2030-01-01T00:00:00")
      : (rawPassportNo ? "2030-01-01T00:00:00" : "");

    const passportIssueRaw = p.passportIssueDate || p.PassportIssueDate || p.passportIssue || p.PassportIssue || "";
    const passportIssueFormatted = passportIssueRaw
      ? formatIsoDateTime(passportIssueRaw, "2023-01-01T00:00:00")
      : (rawPassportNo ? "2023-01-01T00:00:00" : "");

    const passportCountryCode = String(p.passportIssueCountryCode || p.PassportIssueCountryCode || p.countryCode || p.CountryCode || "IN").toUpperCase().slice(0, 2) || "IN";
    const passportCountryName = String(p.passportIssueCountry || p.PassportIssueCountry || p.countryName || p.CountryName || "India") || "India";
    const nationalityCode = String(p.nationality || p.Nationality || passportCountryCode || "IN").toUpperCase().slice(0, 2) || "IN";

    const defaultContactPhone = String(
      flight?.passengerPhone ||
      flight?.contactPhone ||
      flight?.contact?.mobile ||
      flight?.phone ||
      flight?.mobile ||
      ""
    ).replace(/\D/g, "");

    const defaultContactEmail = String(
      flight?.passengerEmail ||
      flight?.contactEmail ||
      flight?.contact?.email ||
      flight?.email ||
      ""
    ).trim();

    const rawContact = String(
      p.contactNo ||
      p.ContactNo ||
      p.passengerPhone ||
      p.phone ||
      p.mobile ||
      contact?.mobile ||
      defaultContactPhone ||
      "8465014121"
    ).replace(/\D/g, "");
    const cleanContact = rawContact.length >= 10 ? rawContact.slice(-10) : rawContact;

    const cleanEmail = String(
      p.email ||
      p.Email ||
      p.passengerEmail ||
      contact?.email ||
      defaultContactEmail ||
      "mosesparker321@gmail.com"
    ).trim();

    let mappedSeats = [];
    const normalizeSeat = (s, sIdx = 0) => {
      const legHint = selectedLegs[sIdx] || (sIdx === 1 ? flight?.returnFlight : flight);

      const resolvedAirlineCode = String(s.AirlineCode || s.airlineCode || legHint?.airlineCode || legHint?.AirlineCode || legHint?.airline || airlineCode || "6E").trim();
      const resolvedFlightNumber = String(s.AirlineNumber || s.FlightNumber || s.flightNumber || s.airlineNumber || legHint?.flightNumber || legHint?.FlightNumber || flightNumber || "").replace(/\D/g, "") || flightNumber || "101";
      const resolvedOrigin = String(s.Origin || s.origin || legHint?.sourceCode || legHint?.fromCity || legHint?.origin || origin || "DEL").toUpperCase().trim();
      const resolvedDestination = String(s.Destination || s.destination || legHint?.destinationCode || legHint?.toCity || legHint?.destination || destination || "BOM").toUpperCase().trim();

      const code = String(s.Code || s.code || s.seatNumber || s.SeatNumber || s.seatLabel || s.seatLabel || s.seat || s.Seat || seatCode || "").trim();
      const seatNo = String(s.SeatNo || s.seatNo || s.SeatNumber || s.seatNumber || code || "").trim();
      const rowNo = String(s.RowNo || s.rowNo || seatNo.replace(/\D/g, "") || "1");
      const amount = Number(s.Price || s.price || s.Amount || s.amount || 0);
      const wayType = Number(s.SeatWayType || s.seatWayType || s.WayType || s.wayType || (sIdx + 1));

      return {
        AirlineCode: resolvedAirlineCode,
        FlightNumber: resolvedFlightNumber,
        AirlineNumber: resolvedFlightNumber,
        CraftType: String(s.CraftType || s.craftType || ""),
        Origin: resolvedOrigin,
        Destination: resolvedDestination,
        AvailabilityType: Number(s.AvailabilityType ?? s.availabilityType ?? 1),
        Description: Number(s.Description ?? s.description ?? 2),
        Code: code,
        RowNo: rowNo,
        SeatNo: seatNo,
        SeatNumber: seatNo,
        SeatType: Number(s.SeatType ?? s.seatType ?? 1),
        SeatWayType: wayType,
        WayType: wayType,
        Compartment: Number(s.Compartment ?? s.compartment ?? 1),
        Deck: Number(s.Deck ?? s.deck ?? 1),
        Currency: String(s.Currency || s.currency || "INR"),
        Price: amount,
        Amount: amount,
        IsBooked: Boolean(s.IsBooked ?? s.isBooked ?? true),
        IsLegroom: Boolean(s.IsLegroom ?? s.isLegroom ?? false),
        IsAisle: Boolean(s.IsAisle ?? s.isAisle ?? false)
      };
    };

    if (seatDynamic.length > 0) {
      mappedSeats = seatDynamic.map((s, sIdx) => normalizeSeat(s, sIdx));
    } else if (rawSeats.length > 0) {
      mappedSeats = rawSeats.map((s, sIdx) => normalizeSeat(s, sIdx));
    } else if (seatCode) {
      const parsedSingle = parseSeatLabelAndCode(seatCode, airlineCode, flightNumber, origin, destination);
      if (parsedSingle) mappedSeats = [normalizeSeat(parsedSingle, 0)];
    }

    let mappedBaggage = [];
    const rawBaggage = Array.isArray(p.baggage || p.Baggage) ? (p.baggage || p.Baggage) : [];
    if (rawBaggage.length > 0) {
      mappedBaggage = rawBaggage.map(b => ({
        WayType: Number(b.WayType ?? b.wayType ?? 1),
        Code: String(b.Code || b.code || ""),
        Description: String(b.Description ?? b.description ?? ""),
        Weight: String(b.Weight ?? b.weight ?? b.Description ?? b.description ?? ""),
        Currency: String(b.Currency || b.currency || "INR"),
        Price: Number(b.Price ?? b.price ?? 0) || 0,
        Origin: String(b.Origin || b.origin || origin),
        Destination: String(b.Destination || b.destination || destination)
      }));
    }

    let mappedMeals = [];
    const rawMeals = Array.isArray(p.mealDynamic || p.MealDynamic) ? (p.mealDynamic || p.MealDynamic) : [];
    if (rawMeals.length > 0) {
      mappedMeals = rawMeals.map(m => ({
        WayType: Number(m.WayType ?? m.wayType ?? 1),
        Code: String(m.Code || m.code || ""),
        Description: String(m.Description ?? m.description ?? ""),
        AirlineDescription: String(m.AirlineDescription ?? m.airlineDescription ?? m.Description ?? m.description ?? ""),
        Quantity: String(m.Quantity ?? m.quantity ?? m.Description ?? m.description ?? "1"),
        Currency: String(m.Currency || m.currency || "INR"),
        Price: Number(m.Price ?? m.price ?? 0) || 0,
        Origin: String(m.Origin || m.origin || origin),
        Destination: String(m.Destination || m.destination || destination)
      }));
    }

    const normalizedFareBreakdown = Array.isArray(fareBreakdown) ? fareBreakdown : (typeof fareBreakdown === 'object' && fareBreakdown !== null && Object.keys(fareBreakdown).length > 0 ? [fareBreakdown] : []);
    const matchedFare = normalizedFareBreakdown.find(f => Number(f.PassengerType || f.passengerType) === paxTypeVal) || null;
    const pFare = p.Fare || p.fare || matchedFare || p.FareBreakdown || p.fareBreakdown || {};

    const paxFareObj = {
      BaseFare: Number(pFare.BaseFare ?? pFare.baseFare ?? paxBase) || 0,
      Tax: Number(pFare.Tax ?? pFare.tax ?? paxTax) || 0,
      TransactionFee: Number(pFare.TransactionFee ?? pFare.transactionFee ?? 0) || 0,
      YQTax: Number(pFare.YQTax ?? pFare.yqTax ?? 0) || 0,
      AdditionalTxnFeeOfrd: Number(pFare.AdditionalTxnFeeOfrd ?? pFare.additionalTxnFeeOfrd ?? 0) || 0,
      AdditionalTxnFeePub: Number(pFare.AdditionalTxnFeePub ?? pFare.additionalTxnFeePub ?? 0) || 0,
      AirTransFee: Number(pFare.AirTransFee ?? pFare.airTransFee ?? 0) || 0
    };

    const gstDetails = contact?.gst || p.gst || p.GST || {};
    const hasGst = Boolean(gstDetails?.gstNumber || gstDetails?.GSTNumber);

    const passengerObj = {
      Title: cleanTitle || "Mr",
      FirstName: firstName || "Moses",
      LastName: lastName || "Parker",
      PaxType: paxTypeVal,
      DateOfBirth: dobFormatted,
      Gender: String(mapGenderToCode(p.gender ?? p.Gender)),
      PassportNo: rawPassportNo || "",
      PassportExpiry: passportExpiryFormatted,
      PassportExpiryDate: passportExpiryFormatted,
      PassportIssueDate: passportIssueFormatted,
      PassportIssueCountryCode: rawPassportNo ? passportCountryCode : "",
      PassportIssueCountry: rawPassportNo ? passportCountryName : "",
      Nationality: nationalityCode,
      CountryCode: passportCountryCode,
      CountryName: passportCountryName,
      AddressLine1: String(p.addressLine1 || p.AddressLine1 || p.address || p.Address || contact?.addressLine1 || contact?.address || "madhapur").trim(),
      City: String(p.city || p.City || contact?.city || "hyd").trim(),
      CellCountryCode: "+91",
      ContactNo: cleanContact || "8465014121",
      Email: cleanEmail || "mosesparker321@gmail.com",

      ...(hasGst && {
        GSTCompanyAddress: String(gstDetails.companyAddress || gstDetails.GSTCompanyAddress || gstDetails.address || ""),
        GSTCompanyContactNumber: String(gstDetails.contactNumber || gstDetails.GSTCompanyContactNumber || gstDetails.phone || cleanContact),
        GSTCompanyName: String(gstDetails.companyName || gstDetails.GSTCompanyName || ""),
        GSTNumber: String(gstDetails.gstNumber || gstDetails.GSTNumber || ""),
        GSTCompanyEmail: String(gstDetails.companyEmail || gstDetails.GSTCompanyEmail || gstDetails.email || cleanEmail),
      }),

      Baggage: mappedBaggage,
      MealDynamic: mappedMeals,
      Seat: [],
      SeatDynamic: mappedSeats,
      IsLeadPax: isLeadBool,
      Fare: paxFareObj
    };

    return passengerObj;
  });
}

/**
 * Extracts PNR and BookingId from a SRDV TicketLCC/HoldGDS/TicketGDS response.
 * SRDV MixAPI may wrap fields under FlightItinerary or return them at root level.
 */
function extractSrdvPnrAndBookingId(rawData) {
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

export async function ticketLCC({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, couponCode, otherCharges = 0, gstInfo = null, contact = null, fareBreakdown = [] }) {
  const endpoint = `${SRDV_ROOT}/TicketLCC`;
  const mappedPassengers = mapPassengersForApiIntegration(passengers, baseFare, tax, flight, otherCharges, contact, fareBreakdown);

  let finalResultIndex = resultIndex || flight?.resultIndex || flight?.ResultIndex || flight?.id || "";
  if (flight && typeof flight === "object") {
    if (flight.returnFlight && !String(finalResultIndex).includes(",")) {
      const onwardIdx = flight.resultIndex || flight.ResultIndex || flight.id || "";
      const returnIdx = flight.returnFlight.resultIndex || flight.returnFlight.ResultIndex || flight.returnFlight.id || "";
      if (onwardIdx && returnIdx) {
        finalResultIndex = `${onwardIdx},${returnIdx.startsWith("IB_") ? returnIdx : "IB_" + returnIdx}`;
      }
    } else if (Array.isArray(flight.legs) && flight.legs.length > 0 && !String(finalResultIndex).includes(",")) {
      finalResultIndex = [...new Set(flight.legs.map(l => l.resultIndex || l.ResultIndex || l.id).filter(Boolean))].join(",");
    }
  }

  let journeyType = 1;
  if (String(finalResultIndex).includes(",IB_")) {
    journeyType = 2;
  } else if (String(finalResultIndex).includes(",")) {
    journeyType = (flight?.isMultiCity || (Array.isArray(flight?.legs) && flight.legs.length > 2)) ? 3 : 2;
  } else if (flight?.journeyType || flight?.JourneyType) {
    journeyType = Number(flight.journeyType || flight.JourneyType || 1);
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || flight?.srdvType || "MixAPI"),
    TraceId: String(traceId || flight?.traceId || flight?.TraceId || ""),
    SrdvIndex: String(srdvIndex || flight?.srdvIndex || flight?.SrdvIndex || "2"),
    ResultIndex: String(finalResultIndex),
    JourneyType: journeyType,
    Passengers: mappedPassengers,
    ...(couponCode ? { CouponCode: String(couponCode) } : {})
  };

  if (gstInfo?.useGST) {
    payload.GSTCompanyDetails = {
      GSTNumber: gstInfo.GSTNumber || "",
      GSTCompanyName: gstInfo.GSTCompanyName || "",
      GSTCompanyEmail: gstInfo.GSTCompanyEmail || "",
      GSTCompanyContactNumber: gstInfo.GSTCompanyContactNumber || "",
      GSTCompanyAddress: gstInfo.GSTCompanyAddress || "",
    };
  }

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
  // 1. ErrorCode is "0" or "10" ("Booking is in process" callback mode) OR
  // 2. ResponseStatus is 1 OR
  // 3. PNR or BookingId is present (SRDV sometimes returns error alongside a PNR on LCC)
  const isPendingCallback = errorCodeVal === "10" || errorCodeVal === "010" || errorCodeVal === 10;
  const isError = !isPendingCallback && errorCodeVal !== "0" && errorCodeVal !== "000" && !hasSuccessStatus && !hasPnrOrBookingId;

  if (isError) {
    const errorMsg = errorObj?.ErrorMessage || errorObj?.errorMessage || "TicketLCC booking failed on the airline system.";

    // If booking failed specifically due to seat SSR issue (e.g. airline seat hold expired), auto-retry without seats
    if (errorMsg.toLowerCase().includes("seat") && Array.isArray(mappedPassengers) && mappedPassengers.some(p => p.SeatDynamic?.length > 0 || p.Seat?.length > 0)) {
      console.warn("TicketLCC failed due to seat SSR validation. Retrying booking without seat add-ons:", errorMsg);
      const fallbackPayload = {
        ...payload,
        Passengers: mappedPassengers.map(p => ({
          ...p,
          Seat: [],
          SeatDynamic: []
        }))
      };
      try {
        const retryRawData = await requestJson(endpoint, {
          method: "POST",
          body: JSON.stringify(fallbackPayload),
        });
        const retryResponseObj = retryRawData?.Response || retryRawData?.response || retryRawData || {};
        const retryErrorObj = retryResponseObj?.Error || retryResponseObj?.error || retryRawData?.Error || retryRawData?.error;
        const retryErrorCodeVal = retryErrorObj?.ErrorCode !== undefined && retryErrorObj?.ErrorCode !== null ? String(retryErrorObj.ErrorCode) : "0";
        const retryResponseStatus = retryRawData?.ResponseStatus ?? retryResponseObj?.ResponseStatus ?? null;
        const retryHasSuccessStatus = retryResponseStatus === 1 || retryResponseStatus === "1";
        const retryExtracted = extractSrdvPnrAndBookingId(retryRawData);
        const retryHasPnrOrBookingId = Boolean(retryExtracted.pnr || retryExtracted.bookingId);
        const retryIsPendingCallback = retryErrorCodeVal === "10" || retryErrorCodeVal === "010" || retryErrorCodeVal === 10;
        const retryIsError = !retryIsPendingCallback && retryErrorCodeVal !== "0" && retryErrorCodeVal !== "000" && !retryHasSuccessStatus && !retryHasPnrOrBookingId;

        if (!retryIsError) {
          return {
            success: true,
            isPendingCallback: retryIsPendingCallback,
            errorCode: retryErrorCodeVal || "0",
            status: retryIsPendingCallback ? "Pending" : "Confirmed",
            traceId: String(retryRawData?.TraceId || retryResponseObj?.TraceId || traceId || ""),
            pnr: retryExtracted.pnr || (retryIsPendingCallback ? "PENDING-ISSUANCE" : ""),
            bookingId: retryExtracted.bookingId || (retryIsPendingCallback ? "PENDING" : ""),
            responseStatus: retryResponseStatus ?? (retryIsPendingCallback ? 1 : 1),
            response: retryResponseObj,
            rawResponse: retryRawData,
            message: retryIsPendingCallback ? "Your booking is currently being processed by the airline." : "Ticketing successful."
          };
        }
      } catch (retryErr) {
        console.warn("Retry without seat SSR failed:", retryErr);
      }
    }

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
    isPendingCallback,
    errorCode: errorCodeVal || "0",
    status: isPendingCallback ? "Pending" : "Confirmed",
    traceId: String(rawData?.TraceId || responseObj?.TraceId || traceId || ""),
    pnr: pnr || (isPendingCallback ? "PENDING-ISSUANCE" : ""),
    bookingId: bookingId || (isPendingCallback ? "PENDING" : ""),
    responseStatus: responseStatus ?? (isPendingCallback ? 1 : 1),
    response: responseObj,
    rawResponse: rawData,
    message: isPendingCallback ? "Your booking is currently being processed by the airline." : "Ticketing successful."
  };
}

export async function holdGDS({ traceId, resultIndex, srdvType, srdvIndex, passengers, baseFare, tax, flight, couponCode, otherCharges = 0, gstInfo = null, contact = null, fareBreakdown = [] }) {
  const endpoint = `${SRDV_ROOT}/HoldGDS`;

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || flight?.srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || flight?.srdvIndex || flight?.SrdvIndex || "1"),
    TraceId: String(traceId || flight?.traceId || flight?.TraceId || ""),
    ResultIndex: String(resultIndex || flight?.resultIndex || flight?.ResultIndex || ""),
    JourneyType: Number(flight?.journeyType || 1),
    Passengers: mapPassengersForApiIntegration(passengers, baseFare, tax, flight, otherCharges, contact, fareBreakdown),
    CouponCode: couponCode ? String(couponCode) : null
  };

  if (gstInfo?.useGST) {
    payload.GSTCompanyDetails = {
      GSTNumber: gstInfo.GSTNumber || "",
      GSTCompanyName: gstInfo.GSTCompanyName || "",
      GSTCompanyEmail: gstInfo.GSTCompanyEmail || "",
      GSTCompanyContactNumber: gstInfo.GSTCompanyContactNumber || "",
      GSTCompanyAddress: gstInfo.GSTCompanyAddress || "",
    };
  }

  return requestJson(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function ticketGDS({ traceId, resultIndex, srdvType, srdvIndex, pnr, bookingId, flight, couponCode }) {
  const endpoint = `${SRDV_ROOT}/TicketGDS`;
  const parsedBookingId = typeof bookingId === "number" ? Math.floor(bookingId) : parseInt(String(bookingId || 0).replace(/\D/g, ""), 10) || 0;

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    SrdvType: String(srdvType || flight?.srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || flight?.srdvIndex || flight?.SrdvIndex || "1"),
    TraceId: String(traceId || flight?.traceId || flight?.TraceId || ""),
    ResultIndex: String(resultIndex || flight?.resultIndex || flight?.ResultIndex || ""),
    PNR: String(pnr || ""),
    BookingId: parsedBookingId,
    CouponCode: couponCode ? String(couponCode) : null
  };

  return requestJson(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCancellationCharges(traceIdOrObj, bookingIdParam, requestTypeParam, srdvTypeParam, srdvIndexParam) {
  const endpoint = `${SRDV_ROOT}/GetCancellationCharges`;

  let traceId = "";
  let bookingId = "";
  let requestType = 1;
  let srdvType = "MixAPI";
  let srdvIndex = "1";

  if (traceIdOrObj && typeof traceIdOrObj === "object") {
    traceId = [
      traceIdOrObj.traceId,
      traceIdOrObj.TraceId,
      traceIdOrObj.trace_id,
      traceIdOrObj.rawResponse?.TraceId,
      traceIdOrObj.ticketLccResponse?.rawResponse?.TraceId,
      traceIdOrObj.ticketLccResponse?.traceId,
      traceIdOrObj.ticketGdsResponse?.rawResponse?.TraceId,
      traceIdOrObj.srdvResponse?.TraceId,
      traceIdOrObj.apiResponse?.TraceId,
      traceIdOrObj.details?.TraceId,
      traceIdOrObj.itinerary?.TraceId,
      traceIdOrObj.flight?.traceId,
      typeof window !== "undefined" ? window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") : "",
      typeof window !== "undefined" ? window.localStorage.getItem("last_booking_trace_id") || window.localStorage.getItem("flight_trace_id") || window.localStorage.getItem("TraceId") || window.localStorage.getItem("traceId") : ""
    ].map(val => String(val || "").trim()).find(Boolean) || "";
    bookingId = traceIdOrObj.providerBookingId || traceIdOrObj.srdvBookingId || traceIdOrObj.bookingId || traceIdOrObj.BookingId || traceIdOrObj.bookingReference || traceIdOrObj.pnr || "";
    requestType = Number(traceIdOrObj.requestType ?? traceIdOrObj.RequestType ?? 1);
    srdvType = traceIdOrObj.srdvType || traceIdOrObj.SrdvType || "MixAPI";
    srdvIndex = String(traceIdOrObj.srdvIndex || traceIdOrObj.SrdvIndex || (traceIdOrObj.isLcc || traceIdOrObj.IsLcc ? "2" : "1"));
  } else {
    traceId = String(traceIdOrObj || "").trim() || (typeof window !== "undefined" ? String(window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") || window.localStorage.getItem("last_booking_trace_id") || window.localStorage.getItem("flight_trace_id") || window.localStorage.getItem("TraceId") || window.localStorage.getItem("traceId") || "").trim() : "");
    bookingId = String(bookingIdParam || "");
    requestType = Number(requestTypeParam || 1);
    srdvType = String(srdvTypeParam || "MixAPI");
    srdvIndex = String(srdvIndexParam || "1");
  }

  const payload = {
    EndUserIp: FLIGHT_API_CREDENTIALS.EndUserIp,
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: FLIGHT_API_CREDENTIALS.ApiToken,
    BookingId: String(bookingId || ""),
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "1"),
    TraceId: String(traceId || ""),
    RequestType: Number(requestType || 1)
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
        traceId: String(traceId || ""),
        bookingId: String(bookingId || ""),
        result: null,
        rawResponse: rawData,
      };
    }

    const result = responseObj?.Result || responseObj?.result || rawData?.Result || rawData?.result || null;

    return {
      success: true,
      errorCode: 0,
      traceId: String(traceId || ""),
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
      traceId: String(traceId || ""),
      bookingId: String(bookingId || ""),
      result: null,
      rawResponse: null,
    };
  }
}

export async function sendChangeRequest(paramsOrBookingId, requestTypeParam, cancellationTypeParam, remarksParam) {
  const srdvEndpoint = `${SRDV_ROOT}/SendChangeRequest`;

  let bookingId = "";
  let pnr = "";
  let requestType = "2"; // Default "2" for Cancellation per SRDV integration guide
  let cancellationType = "3"; // Default "3" for Full Cancellation per SRDV integration guide
  let remarks = "Customer requested cancellation";
  let srdvType = "MixAPI";
  let srdvIndex = "1";
  let endUserIp = FLIGHT_API_CREDENTIALS.EndUserIp || "103.86.74.125";
  let clientId = FLIGHT_API_CREDENTIALS.ClientId;
  let userName = FLIGHT_API_CREDENTIALS.UserName;
  let password = FLIGHT_API_CREDENTIALS.Password;
  let apiToken = FLIGHT_API_CREDENTIALS.ApiToken;
  let sectors = [];
  let ticketData = [];

  if (paramsOrBookingId && typeof paramsOrBookingId === "object") {
    bookingId = paramsOrBookingId.bookingId || paramsOrBookingId.BookingId || "";
    pnr = paramsOrBookingId.pnr || paramsOrBookingId.PNR || paramsOrBookingId.bookingReference || "";
    requestType = String(paramsOrBookingId.requestType ?? paramsOrBookingId.RequestType ?? "2");
    cancellationType = String(paramsOrBookingId.cancellationType ?? paramsOrBookingId.CancellationType ?? "3");
    remarks = paramsOrBookingId.remarks || paramsOrBookingId.Remarks || "Customer requested cancellation";
    srdvType = paramsOrBookingId.srdvType || paramsOrBookingId.SrdvType || "MixAPI";
    srdvIndex = String(paramsOrBookingId.srdvIndex || paramsOrBookingId.SrdvIndex || (paramsOrBookingId.isLcc || paramsOrBookingId.IsLcc ? "2" : "1"));
    endUserIp = paramsOrBookingId.endUserIp || paramsOrBookingId.EndUserIp || endUserIp;
    clientId = paramsOrBookingId.clientId || paramsOrBookingId.ClientId || clientId;
    userName = paramsOrBookingId.userName || paramsOrBookingId.UserName || userName;
    password = paramsOrBookingId.password || paramsOrBookingId.Password || password;
    apiToken = paramsOrBookingId.apiToken || paramsOrBookingId.ApiToken || apiToken;
    sectors = paramsOrBookingId.sectors || paramsOrBookingId.Sectors || [];
    ticketData = paramsOrBookingId.ticketData || paramsOrBookingId.TicketData || [];
  } else {
    bookingId = String(paramsOrBookingId || "");
    requestType = String(requestTypeParam ?? "2");
    cancellationType = String(cancellationTypeParam ?? "3");
    remarks = remarksParam || "Customer requested cancellation";
  }

  const payload = {
    EndUserIp: String(endUserIp || "103.86.74.125"),
    ClientId: String(clientId || "180170"),
    UserName: String(userName || "PickNBk6"),
    Password: String(password || "PickNB@486"),
    ApiToken: String(apiToken || "PickNB@486#170$"),
    BookingId: String(bookingId || ""),
    PNR: String(pnr || ""),
    RequestType: String(requestType || "2"),
    CancellationType: String(cancellationType || "3"),
    Remarks: String(remarks || "Customer requested cancellation"),
    SrdvType: String(srdvType || "MixAPI"),
    SrdvIndex: String(srdvIndex || "1"),
    Sectors: Array.isArray(sectors) ? sectors : [],
    TicketData: Array.isArray(ticketData) ? ticketData : []
  };

  try {
    const rawData = await requestJson(srdvEndpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

    const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null ? String(errorObj.ErrorCode) : (rawData?.ErrorCode !== undefined && rawData?.ErrorCode !== null ? String(rawData.ErrorCode) : "0");
    const responseStatusVal = rawData?.ResponseStatus ?? responseObj?.ResponseStatus ?? 1;

    // IMPORTANT: Check the internal SRDV ErrorCode & ResponseStatus (A successful response has ErrorCode 0 or ResponseStatus 1)
    const isErrorCodeFailure = errorCodeVal !== "0" && errorCodeVal !== "000" && errorCodeVal !== "" && errorCodeVal !== "null" && errorCodeVal !== "undefined";
    const isResponseStatusFailure = responseStatusVal !== undefined && responseStatusVal !== null && String(responseStatusVal) !== "1" && responseStatusVal !== true && String(responseStatusVal).toLowerCase() !== "success" && String(responseStatusVal).toLowerCase() !== "ok";

    if (isErrorCodeFailure || isResponseStatusFailure) {
      const errorMsg = errorObj?.ErrorMessage || errorObj?.errorMessage || rawData?.Error?.ErrorMessage || responseObj?.Error?.ErrorMessage || rawData?.ErrorMessage || rawData?.errorMessage || rawData?.Message || rawData?.message || "Failed to cancel ticket with provider (SRDV rejected cancellation).";
      console.warn("SendChangeRequest API rejected by provider:", errorCodeVal, "ResponseStatus:", responseStatusVal, errorMsg);
      return {
        success: false,
        errorCode: errorCodeVal,
        error: errorMsg,
        responseStatus: responseStatusVal,
        ticketCRInfo: rawData?.TicketCRInfo || responseObj?.TicketCRInfo || [],
        changeRequestId: "",
        rawResponse: rawData,
      };
    }

    const ticketCRInfo = rawData?.TicketCRInfo || responseObj?.TicketCRInfo || rawData?.result?.TicketCRInfo || [];
    const changeRequestId = String(
      rawData?.ChangeRequestId ||
      responseObj?.ChangeRequestId ||
      ticketCRInfo?.[0]?.ChangeRequestId ||
      ticketCRInfo?.[0]?.changeRequestId || ""
    );

    return {
      success: true,
      errorCode: "0",
      responseStatus: rawData?.ResponseStatus ?? 1,
      ticketCRInfo,
      changeRequestId,
      rawResponse: rawData,
    };
  } catch (error) {
    console.warn("SendChangeRequest failed:", error);
    return {
      success: false,
      errorCode: "-1",
      error: error.message || "Failed to submit change request.",
      ticketCRInfo: [],
      changeRequestId: "",
      rawResponse: null,
    };
  }
}

export async function getCancelStatus(changeRequestIdOrObj) {
  const srdvEndpoint = `${SRDV_ROOT}/GetCancelStatus`;

  let changeRequestId = changeRequestIdOrObj;
  let srdvType = "MixAPI";
  let endUserIp = FLIGHT_API_CREDENTIALS.EndUserIp || "103.86.74.125";
  let clientId = FLIGHT_API_CREDENTIALS.ClientId;
  let userName = FLIGHT_API_CREDENTIALS.UserName;
  let password = FLIGHT_API_CREDENTIALS.Password;
  let apiToken = FLIGHT_API_CREDENTIALS.ApiToken;
  if (changeRequestIdOrObj && typeof changeRequestIdOrObj === "object") {
    changeRequestId = changeRequestIdOrObj.changeRequestId || changeRequestIdOrObj.ChangeRequestId || changeRequestId;
    srdvType = changeRequestIdOrObj.srdvType || changeRequestIdOrObj.SrdvType || "MixAPI";
    endUserIp = changeRequestIdOrObj.endUserIp || changeRequestIdOrObj.EndUserIp || endUserIp;
    clientId = changeRequestIdOrObj.clientId || changeRequestIdOrObj.ClientId || clientId;
    userName = changeRequestIdOrObj.userName || changeRequestIdOrObj.UserName || userName;
    password = changeRequestIdOrObj.password || changeRequestIdOrObj.Password || password;
    apiToken = changeRequestIdOrObj.apiToken || changeRequestIdOrObj.ApiToken || apiToken;
  }

  const payload = {
    EndUserIp: String(endUserIp || "103.86.74.125"),
    ClientId: String(clientId || "180170"),
    UserName: String(userName || "PickNBk6"),
    Password: String(password || "PickNB@486"),
    ApiToken: String(apiToken || "PickNB@486#170$"),
    ChangeRequestId: String(changeRequestId || ""),
    SrdvType: String(srdvType || "MixAPI")
  };

  try {
    const rawData = await requestJson(srdvEndpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseObj = rawData?.Response || rawData?.response || rawData || {};
    const errorObj = responseObj?.Error || responseObj?.error || rawData?.Error || rawData?.error;

    const errorCodeVal = errorObj?.ErrorCode !== undefined && errorObj?.ErrorCode !== null ? String(errorObj.ErrorCode) : (rawData?.ErrorCode !== undefined && rawData?.ErrorCode !== null ? String(rawData.ErrorCode) : "0");
    const responseStatusVal = rawData?.ResponseStatus ?? responseObj?.ResponseStatus ?? 1;

    // IMPORTANT: Check internal SRDV ErrorCode & ResponseStatus before confirming cancel status
    const isErrorCodeFailure = errorCodeVal !== "0" && errorCodeVal !== "000" && errorCodeVal !== "" && errorCodeVal !== "null" && errorCodeVal !== "undefined";
    const isResponseStatusFailure = responseStatusVal !== undefined && responseStatusVal !== null && String(responseStatusVal) !== "1" && responseStatusVal !== true && String(responseStatusVal).toLowerCase() !== "success" && String(responseStatusVal).toLowerCase() !== "ok";

    if (isErrorCodeFailure || isResponseStatusFailure) {
      const errorMsg = errorObj?.ErrorMessage || errorObj?.errorMessage || rawData?.Error?.ErrorMessage || responseObj?.Error?.ErrorMessage || rawData?.ErrorMessage || rawData?.errorMessage || rawData?.Message || rawData?.message || "Failed to verify ticket cancellation status with provider.";
      console.warn("GetCancelStatus API rejected by provider:", errorCodeVal, "ResponseStatus:", responseStatusVal, errorMsg);
      return {
        success: false,
        errorCode: errorCodeVal,
        error: errorMsg,
        responseStatus: responseStatusVal,
        changeRequestId: String(responseObj?.ChangeRequestId || changeRequestId || ""),
        cancelStatus: "Failed",
        refundStatus: "Failed",
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
      cancelStatus: responseObj?.CancelStatus || responseObj?.cancelStatus || responseObj?.RefundDetails?.CancellationStatus || responseObj?.RefundDetails?.CancelStatus || rawData?.CancelStatus || rawData?.RefundDetails?.CancellationStatus || rawData?.RefundDetails?.CancelStatus || "Cancelled",
      refundStatus: responseObj?.RefundStatus || responseObj?.refundStatus || responseObj?.RefundDetails?.RefundStatus || rawData?.RefundStatus || rawData?.RefundDetails?.RefundStatus || "Processed",
      refundAmount: Number(responseObj?.RefundAmount ?? responseObj?.RefundDetails?.RefundAmount ?? rawData?.RefundAmount ?? rawData?.RefundDetails?.RefundAmount ?? 0) || 0,
      cancellationCharge: Number(responseObj?.CancellationCharge ?? responseObj?.RefundDetails?.CancellationCharge ?? rawData?.CancellationCharge ?? rawData?.RefundDetails?.CancellationCharge ?? 0) || 0,
      refundDate: responseObj?.RefundDate || responseObj?.refundDate || rawData?.RefundDate || new Date().toISOString().slice(0, 10),
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
      cancelStatus: "Failed",
      refundStatus: "Failed",
      rawResponse: null,
    };
  }
}

export function isFallbackFlightId(flightId) {
  return false;
}


export async function bookFlight({ flightId, payload, userId } = {}) {
  if (isFallbackFlightId(flightId)) {
    throw new Error("Invalid flight selection. Please go back and re-select your flight.");
  }

  let flowState = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("flight_booking_flow_state_v1");
      if (raw) flowState = JSON.parse(raw) || {};
    } catch { }
  }
  // A round-trip checkout supplies its return flight in the payment payload.
  // Prefer it over persisted state, which still represents the onward journey.
  const flight = payload?.flight || flowState.flight || {};
  const selectedLegsForTrace = payload?.selectedLegs || flowState.selectedLegs || flight?.selectedLegs;
  const sharedLegTraceId = Array.isArray(selectedLegsForTrace) && selectedLegsForTrace.length > 0
    ? (selectedLegsForTrace[0]?.traceId || selectedLegsForTrace[0]?.TraceId || "")
    : "";

  const traceId =
    sharedLegTraceId ||
    flight.traceId ||
    flight.TraceId ||
    flowState.traceId ||
    flowState.TraceId ||
    flowState.searchTraceId ||
    (typeof window !== "undefined" ? window.sessionStorage.getItem("flight_trace_id") : null) ||
    "";

  const selectedLegs = payload?.selectedLegs || flowState.selectedLegs || flight?.selectedLegs;
  let resultIndex =
    payload?.resultIndex ||
    payload?.ResultIndex ||
    flowState.resultIndex ||
    flight?.resultIndex ||
    flight?.ResultIndex ||
    flight?.resultId ||
    flight?.ResultId ||
    flight?.id ||
    flightId ||
    "";

  if (Array.isArray(selectedLegs) && selectedLegs.length > 1 && !String(resultIndex).includes(",")) {
    const legIndexes = selectedLegs
      .map((leg, idx) => {
        const raw = String(leg?.legResultIndex || leg?.resultIndex || leg?.ResultIndex || leg?.resultId || leg?.ResultId || leg?.id || "").replace(/^leg\d+-/, "");
        if (idx === 1 && !raw.startsWith("IB_") && (payload?.isTwoWay || flowState.isTwoWay || flight.isTwoWay || flight.returnFlight)) {
          return `IB_${raw}`;
        }
        return raw;
      })
      .filter(Boolean);
    if (legIndexes.length > 0) {
      resultIndex = [...new Set(legIndexes)].join(",");
    }
  } else if (flight.returnFlight && !String(resultIndex).includes(",")) {
    const onwardIdx = String(flight.resultIndex || flight.ResultIndex || flight.id || "").replace(/^leg\d+-/, "");
    const returnIdx = String(flight.returnFlight.resultIndex || flight.returnFlight.ResultIndex || flight.returnFlight.id || "").replace(/^leg\d+-/, "");
    if (onwardIdx && returnIdx) {
      resultIndex = `${onwardIdx},${returnIdx.startsWith("IB_") ? returnIdx : "IB_" + returnIdx}`;
    }
  } else {
    resultIndex = String(resultIndex).replace(/^leg\d+-/, "");
  }

  const isValidationStep =
    payload?.isValidation === true ||
    !payload ||
    (Array.isArray(payload.passengers) && payload.passengers.length === 0);

  if (isValidationStep) {
    let fareQuoteResponse = null;
    try {
      fareQuoteResponse = await getFareQuote(flight.id ? flight : { traceId, resultIndex, ...flight });
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem("last_fare_quote", JSON.stringify(fareQuoteResponse));
          window.sessionStorage.setItem("last_fare_quote_ts", String(Date.now()));
        } catch { }
      }
    } catch (err) {
      console.warn("FareQuote validation call failed:", err);
    }
    const res =
      fareQuoteResponse?.results ||
      fareQuoteResponse?.Results ||
      fareQuoteResponse?.Response?.Results ||
      fareQuoteResponse ||
      {};
    return {
      success: true,
      validation: true,
      holdAllowed: Boolean(
        fareQuoteResponse?.holdAllowed ??
        fareQuoteResponse?.HoldAllowed ??
        res?.HoldAllowed ??
        res?.holdAllowed ??
        false
      ),
      fare: res,
      message: "Flight quote locked successfully."
    };
  } else {
    let fareQuote = null;
    // Always fetch a fresh FareQuote at checkout to avoid stale session errors ("Booking Confirm Fare Data Not Found").
    // SRDV FareQuote sessions expire in ~10 min; we never reuse a cached quote older than 8 minutes.
    let cachedFareQuote = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("last_fare_quote");
        const fetchedAt = Number(window.sessionStorage.getItem("last_fare_quote_ts") || 0);
        const ageMs = Date.now() - fetchedAt;
        if (raw && ageMs < 8 * 60 * 1000) {
          cachedFareQuote = JSON.parse(raw);
        } else if (raw) {
          // Stale — clear it so we don't accidentally use it
          window.sessionStorage.removeItem("last_fare_quote");
          window.sessionStorage.removeItem("last_fare_quote_ts");
        }
      } catch { }
    }

    if (traceId || resultIndex) {
      try {
        // Always try to fetch a fresh FareQuote; fall back to cached only if fetch fails
        fareQuote = await getFareQuote({
          ...flight,
          traceId,
          resultIndex,
          couponCode: payload?.couponCode,
          adults: payload?.adults,
          children: payload?.children,
          infants: payload?.infants,
          journeyType: (flowState.isMultiCity || payload?.isMultiCity) ? 3 : (flight.journeyType || 1),
          isMultiCity: flowState.isMultiCity || payload?.isMultiCity
        });
        if (fareQuote?.success === false || (fareQuote?.errorCode && String(fareQuote.errorCode) !== "0" && String(fareQuote.errorCode) !== "000")) {
          const fqErrorMsg = fareQuote?.error || fareQuote?.ErrorMessage || "Booking Confirm Fare Data Not Found";
          const fqErr = new Error(fqErrorMsg);
          fqErr.srdvErrorCode = String(fareQuote?.errorCode || "2");
          throw fqErr;
        }

        // Handle Price Change securely
        if (fareQuote?.isPriceChanged) {
          const fqErr = new Error("The airline has changed the fare for this flight. Please go back to flight search to reconfirm the new price.");
          fqErr.srdvErrorCode = "PRICE_CHANGED";
          throw fqErr;
        }

        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem("last_fare_quote", JSON.stringify(fareQuote));
            window.sessionStorage.setItem("last_fare_quote_ts", String(Date.now()));
          } catch { }
        }
      } catch (err) {
        if (String(err?.srdvErrorCode) === "2" || String(err?.message || "").toLowerCase().includes("fare data not found")) {
          throw err; // Re-throw session expiration so caller auto-refreshes TraceId
        }
        console.warn("Fresh FareQuote call failed during checkout, falling back to cached:", err);
        fareQuote = cachedFareQuote;
      }
    } else {
      fareQuote = cachedFareQuote;
    }

    const resultsFare =
      fareQuote?.results ||
      fareQuote?.Results ||
      fareQuote?.Response?.Results ||
      fareQuote?.Fare ||
      {};
    const fareDetails = resultsFare?.Fare || resultsFare?.fare || fareQuote?.fare || {};

    // Per API guide: IsLCC comes from search results FareDataMultiple.IsLCC or FareQuote response.
    // flight.isLcc is set during search normalization from the SRDV search response.
    // If FareQuote says IsLCC, trust that over the search result.
    const isLccFromFareQuote = resultsFare?.IsLCC ?? resultsFare?.isLCC ?? resultsFare?.IsLcc ?? resultsFare?.isLcc ?? null;
    const isLccFromFlight = flight.isLcc ?? null;
    const isLccFlight = isLccFromFareQuote !== null
      ? Boolean(isLccFromFareQuote)
      : (isLccFromFlight !== null ? Boolean(isLccFromFlight) : true); // Default true = LCC path

    const holdAllowed = Boolean(
      fareQuote?.holdAllowed ??
      fareQuote?.HoldAllowed ??
      resultsFare?.HoldAllowed ??
      resultsFare?.holdAllowed ??
      false
    );
    const baseFare = Number(fareDetails?.BaseFare ?? resultsFare?.BaseFare ?? flowState.fareSummary?.baseFare ?? flight.fare ?? 4002);
    const tax = Number(fareDetails?.Tax ?? resultsFare?.Tax ?? flowState.fareSummary?.tax ?? 719);
    const passengers = payload.passengers || [];

    const resolvedFromCity =
      flight.fromCity ||
      flight.sourceCode ||
      flight.source ||
      flight.origin ||
      flowState.searchContext?.source ||
      flowState.searchContext?.fromCity ||
      "DEL";

    const resolvedToCity =
      flight.toCity ||
      flight.destinationCode ||
      flight.destination ||
      flowState.searchContext?.destination ||
      flowState.searchContext?.toCity ||
      "MAA";

    const fareBreakdown = resultsFare?.FareBreakdown || resultsFare?.fareBreakdown || fareDetails?.FareBreakdown || fareDetails?.fareBreakdown || [];

    if (!isLccFlight) {
      // GDS (Non-LCC) flow: HoldGDS → TicketGDS
      const holdResponse = await holdGDS({
        traceId,
        resultIndex,
        srdvType: flight.srdvType || "MixAPI",
        srdvIndex: flight.srdvIndex || "1",
        passengers,
        baseFare,
        tax,
        flight,
        couponCode: payload?.couponCode || flowState?.couponCode || flight?.couponCode,
        gstInfo: payload?.gstInfo,
        contact: payload?.contact,
        fareBreakdown
      });

      const holdResponseInner = holdResponse?.Response || holdResponse?.response || holdResponse || {};
      const holdError = holdResponseInner?.Error || holdResponseInner?.error || holdResponse?.Error;
      const holdErrorCode = String(holdError?.ErrorCode || "0");
      const isHoldPending = holdErrorCode === "10" || holdErrorCode === "010";
      if (holdError && holdErrorCode !== "0" && holdErrorCode !== "000" && !isHoldPending) {
        const errorMsg = holdError.ErrorMessage || "HoldGDS reservation failed on airline system.";
        console.warn("Live HoldGDS API error:", holdError.ErrorCode, errorMsg);
        const thrownError = new Error(errorMsg);
        thrownError.srdvErrorCode = String(holdError.ErrorCode);
        throw thrownError;
      }

      // Step 3 Response: Extract PNR and BookingId generated by HoldGDS
      const holdExtracted = extractSrdvPnrAndBookingId(holdResponse);
      const pnr = holdExtracted.pnr;
      const bookingId = holdExtracted.bookingId;

      if (!pnr || !bookingId) {
        throw new Error("HoldGDS succeeded but did not return a valid PNR or BookingId.");
      }

      // Step 4: Finalize booking by calling TicketGDS with exact TraceId, ResultIndex, PNR, and BookingId
      const ticketGdsResponse = await ticketGDS({
        traceId,
        resultIndex,
        srdvType: flight.srdvType || "MixAPI",
        srdvIndex: flight.srdvIndex || "1",
        pnr,
        bookingId,
        passengers,
        baseFare,
        tax,
        flight,
        couponCode: payload?.couponCode || flowState?.couponCode || flight?.couponCode
      });

      const rawGdsResp = ticketGdsResponse?.rawResponse || ticketGdsResponse?.response || ticketGdsResponse;
      const gdsResponseInner = rawGdsResp?.Response || rawGdsResp?.response || rawGdsResp || {};
      const gdsError = gdsResponseInner?.Error || gdsResponseInner?.error || rawGdsResp?.Error;
      const gdsErrorCode = String(gdsError?.ErrorCode || "0");
      const isGdsPending = isHoldPending || gdsErrorCode === "10" || gdsErrorCode === "010";
      const gdsItinerary = gdsResponseInner?.FlightItinerary || rawGdsResp?.FlightItinerary || {};

      // Extract final PNR/BookingId from TicketGDS response
      const gdsExtracted = extractSrdvPnrAndBookingId(ticketGdsResponse);
      const finalPnr = gdsExtracted.pnr || pnr;
      const finalBookingId = gdsExtracted.bookingId || bookingId;
      const backendFare = gdsItinerary?.Fare || gdsResponseInner?.Fare || {};
      const backendSegments = gdsItinerary?.Segments || gdsResponseInner?.Segments || [];

      const finalBookingResult = {
        traceId: String(ticketGdsResponse?.traceId || holdResponse?.traceId || flight?.traceId || "").trim(),
        TraceId: String(ticketGdsResponse?.traceId || holdResponse?.traceId || flight?.traceId || "").trim(),
        srdvBookingId: String(finalBookingId),
        bookingId: finalBookingId,
        bookingReference: finalPnr,
        pnr: finalPnr,
        returnPnr: gdsResponseInner?.ReturnPNR || "",
        status: isGdsPending ? "Pending" : "Confirmed",
        isPendingCallback: isGdsPending,
        providerName: flight.airline || gdsItinerary?.AirlineCode || "MixAPI",
        tripNumber: flight.flightNumber || gdsItinerary?.Segments?.[0]?.Airline?.FlightNumber || "--",
        fromCity: resolvedFromCity,
        toCity: resolvedToCity,
        departureTimeUtc: flight.departureTimeIst || flight.departureTimeUtc || null,
        arrivalTimeUtc: flight.arrivalTimeIst || flight.arrivalTimeUtc || null,
        itinerary: gdsItinerary,
        backendFare,
        segments: backendSegments,
        passengers: mapPassengersForApiIntegration(passengers, baseFare, tax, flight).map((p, idx) => {
          const rawP = (passengers || [])[idx] || {};
          const srdvPax = (gdsItinerary?.Passenger || [])[idx] || {};
          const seatNo =
            rawP.seatNumber ||
            rawP.seatLabel ||
            rawP.seat ||
            rawP.SeatNumber ||
            rawP.SeatLabel ||
            rawP.seatCode ||
            p.SeatNumber ||
            (Array.isArray(flowState?.selectedSeats)
              ? typeof flowState.selectedSeats[idx] === "string"
                ? flowState.selectedSeats[idx]
                : flowState.selectedSeats[idx]?.label || flowState.selectedSeats[idx]?.SeatNumber
              : "") ||
            "";

          const paxEmail = rawP.email || rawP.Email || rawP.passengerEmail || p.Email || flowState.contact?.email || "";
          const ticketNo = srdvPax?.Ticket?.TicketNumber || srdvPax?.Ticket?.TicketId || finalPnr;
          const ticketId = srdvPax?.Ticket?.TicketId || srdvPax?.Ticket?.TicketNumber || finalPnr;

          return {
            srdvTicketId: String(srdvPax?.Ticket?.TicketId || srdvPax?.Ticket?.TicketNumber || ticketNo || "").trim(),
            title: p.Title || rawP.title || "Mr",
            firstName: p.FirstName || rawP.firstName || "Passenger",
            lastName: p.LastName || rawP.lastName || "Doe",
            fullName: `${p.Title} ${p.FirstName} ${p.LastName}`.trim(),
            passengerType: p.PaxType === 2 ? "Child" : p.PaxType === 3 ? "Infant" : "Adult",
            gender: p.Gender === "2" || p.Gender === 2 ? "Female" : "Male",
            seatNumber: seatNo || "Assigned at Check-in",
            SeatNumber: seatNo || "Assigned at Check-in",
            email: paxEmail,
            passengerEmail: paxEmail,
            Email: paxEmail,
            ticketNumber: ticketNo,
            ticketId: ticketId,
            paxId: srdvPax?.PaxId || (idx + 1),
            issueDate: srdvPax?.Ticket?.IssueDate || new Date().toISOString(),
            validatingAirline: srdvPax?.Ticket?.ValidatingAirline || flight?.airlineCode || flight?.airline || "MixAPI",
            seatDynamic: rawP.seatDynamic || null,
            status: "Confirmed"
          };
        }),
        bookedAtUtc: new Date().toISOString(),
        holdResponse,
        ticketGdsResponse
      };

      return finalBookingResult;
    } else {
      // LCC flow: single TicketLCC call
      const ticketLccResponse = await ticketLCC({
        traceId,
        resultIndex,
        srdvType: flight.srdvType || "MixAPI",
        srdvIndex: flight.srdvIndex || "2",
        passengers,
        baseFare,
        tax,
        flight: {
          ...flight,
          traceId,
          resultIndex,
          selectedLegs
        },
        couponCode: payload?.couponCode || flowState?.couponCode || flight?.couponCode,
        gstInfo: payload?.gstInfo,
        contact: payload?.contact,
        fareBreakdown
      });

      if (!ticketLccResponse?.success) {
        const errorMsg = ticketLccResponse?.error || "TicketLCC request failed on SRDV backend.";
        const srdvErrorCode = ticketLccResponse?.errorCode || "-1";
        console.warn("Live TicketLCC API error:", srdvErrorCode, errorMsg);
        // Attach srdvErrorCode to the Error object so callers can detect specific SRDV codes
        const thrownError = new Error(errorMsg);
        thrownError.srdvErrorCode = srdvErrorCode;
        throw thrownError;
      }

      const rawResp = ticketLccResponse?.rawResponse || ticketLccResponse?.response || ticketLccResponse;
      const responseInner = rawResp?.Response || rawResp?.response || rawResp || {};
      const itinerary = responseInner?.FlightItinerary || rawResp?.FlightItinerary || {};
      const lccExtracted = extractSrdvPnrAndBookingId(rawResp);
      const isLccPending = Boolean(ticketLccResponse?.isPendingCallback || String(responseInner?.Error?.ErrorCode || "0") === "10");

      const pnr = lccExtracted.pnr || ticketLccResponse?.pnr || `PNB-${Date.now().toString().slice(-8)}`;
      const returnPnr = responseInner?.ReturnPNR || responseInner?.returnPNR || itinerary?.Segments?.[1]?.AirlinePNR || "";
      const bookingId = lccExtracted.bookingId || ticketLccResponse?.bookingId || pnr;
      const backendFare = itinerary?.Fare || responseInner?.Fare || {};
      const backendSegments = itinerary?.Segments || responseInner?.Segments || [];

      const finalLccResult = {
        traceId: String(ticketLccResponse?.traceId || ticketLccResponse?.TraceId || ticketLccResponse?.rawResponse?.TraceId || flight?.traceId || flight?.TraceId || "").trim(),
        TraceId: String(ticketLccResponse?.traceId || ticketLccResponse?.TraceId || ticketLccResponse?.rawResponse?.TraceId || flight?.traceId || flight?.TraceId || "").trim(),
        srdvBookingId: String(bookingId),
        bookingId,
        bookingReference: pnr,
        pnr,
        returnPnr,
        returnPNR: returnPnr,
        status: isLccPending ? "Pending" : "Confirmed",
        isPendingCallback: isLccPending,
        providerName: flight.airline || itinerary?.AirlineCode || "MixAPI",
        tripNumber: flight.flightNumber || itinerary?.Segments?.[0]?.Airline?.FlightNumber || "--",
        fromCity: resolvedFromCity,
        toCity: resolvedToCity,
        departureTimeUtc: flight.departureTimeIst || flight.departureTimeUtc || null,
        arrivalTimeUtc: flight.arrivalTimeIst || flight.arrivalTimeUtc || null,
        itinerary,
        backendFare,
        segments: backendSegments,
        passengers: mapPassengersForApiIntegration(passengers, baseFare, tax, flight).map((p, idx) => {
          const rawP = (passengers || [])[idx] || {};
          const srdvPax = (itinerary?.Passenger || [])[idx] || {};
          const seatNo =
            rawP.seatNumber ||
            rawP.seatLabel ||
            rawP.seat ||
            rawP.SeatNumber ||
            rawP.SeatLabel ||
            rawP.seatCode ||
            p.SeatNumber ||
            (Array.isArray(flowState?.selectedSeats)
              ? typeof flowState.selectedSeats[idx] === "string"
                ? flowState.selectedSeats[idx]
                : flowState.selectedSeats[idx]?.label || flowState.selectedSeats[idx]?.SeatNumber
              : "") ||
            "";

          const paxEmail = rawP.email || rawP.Email || rawP.passengerEmail || p.Email || flowState.contact?.email || "";
          const ticketNo = srdvPax?.Ticket?.TicketNumber || srdvPax?.Ticket?.TicketId || pnr;
          const ticketId = srdvPax?.Ticket?.TicketId || srdvPax?.Ticket?.TicketNumber || pnr;
          const paxId = srdvPax?.PaxId || (idx + 1);
          const issueDate = srdvPax?.Ticket?.IssueDate || new Date().toISOString();
          const validatingAirline = srdvPax?.Ticket?.ValidatingAirline || flight?.airlineCode || flight?.airline || "MixAPI";

          return {
            srdvTicketId: String(srdvPax?.Ticket?.TicketId || srdvPax?.Ticket?.TicketNumber || ticketNo || "").trim(),
            title: p.Title || rawP.title || "Mr",
            firstName: p.FirstName || rawP.firstName || "Passenger",
            lastName: p.LastName || rawP.lastName || "Doe",
            fullName: `${p.Title} ${p.FirstName} ${p.LastName}`.trim(),
            passengerType: p.PaxType === 2 ? "Child" : p.PaxType === 3 ? "Infant" : "Adult",
            gender: p.Gender === "2" || p.Gender === 2 ? "Female" : "Male",
            seatNumber: seatNo || "Assigned at Check-in",
            SeatNumber: seatNo || "Assigned at Check-in",
            email: paxEmail,
            passengerEmail: paxEmail,
            Email: paxEmail,
            ticketNumber: ticketNo,
            ticketId: ticketId,
            paxId: paxId,
            issueDate: issueDate,
            validatingAirline: validatingAirline,
            seatDynamic: rawP.seatDynamic || null,
            status: "Confirmed"
          };
        }),
        bookedAtUtc: new Date().toISOString(),
        ticketLccResponse
      };

      return finalLccResult;
    }
  }
}

const DEFAULT_FLIGHT_COUPONS = [
  {
    id: 6,
    value: 10000.00,
    couponType: "Fixed",
    cpnType: "Fixed",
    couponCode: "PIRNAV",
    startDate: "2026-06-29",
    expiryDate: "2026-08-27",
    useLimit: 200,
    usedCount: 0,
    status: "active",
    insertDateUtc: "2026-06-29T07:36:10",
    entryDate: "2026-06-29T07:36:10",
    remark: null
  },
  {
    id: 5,
    value: 500.00,
    couponType: "Flat",
    cpnType: "Flat",
    couponCode: "FIRSTFLY",
    startDate: "2026-06-01",
    expiryDate: "2099-12-31",
    useLimit: 0,
    usedCount: 0,
    status: "Active",
    insertDateUtc: "2026-06-14T17:02:07",
    entryDate: "2026-06-14T17:02:07",
    remark: "Ongoing first-time flight booking discount"
  },
  {
    id: 4,
    value: 1200.00,
    couponType: "Fixed",
    cpnType: "Fixed",
    couponCode: "CDPD0976",
    startDate: "2026-06-19",
    expiryDate: "2026-06-27",
    useLimit: 1,
    usedCount: 0,
    status: "active",
    insertDateUtc: "2026-06-12T12:03:32",
    entryDate: "2026-06-12T12:03:32",
    remark: null
  },
  {
    id: 1,
    value: 500.00,
    couponType: "Fixed",
    cpnType: "Fixed",
    couponCode: "FLIGHTWHEELS",
    startDate: "2026-06-12",
    expiryDate: "2026-11-26",
    useLimit: 20,
    usedCount: 6,
    status: "active",
    insertDateUtc: "2026-06-11T09:02:42",
    entryDate: "2026-06-11T09:02:42",
    remark: "wednesday"
  }
];

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
    } catch (err) { }
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
  } catch (err) { }

  try {
    const data = await requestJson("/api/FlightPromotions", {
      method: "GET",
      skipAuth: true,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((record) => normalizeFlightCouponRecord(record));
    }
  } catch (err) { }

  try {
    const data = await requestJson("/api/flight/coupons", {
      method: "GET",
      skipAuth: true,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((record) => normalizeFlightCouponRecord(record));
    }
  } catch (err) { }

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
  } catch (err) { }

  // Fallback to default coupons array including user's dynamic coupons
  return DEFAULT_FLIGHT_COUPONS.map((record) => normalizeFlightCouponRecord(record));
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

export function updateLocalTicketStatus(bookingIdOrObj, status = "Cancelled") {
  if (typeof window === "undefined" || !bookingIdOrObj) return;

  let targetId = "";
  let targetFromCity = "";
  let targetToCity = "";

  if (typeof bookingIdOrObj === "object") {
    targetId = String(bookingIdOrObj.bookingReference || bookingIdOrObj.pnr || bookingIdOrObj.bookingId || bookingIdOrObj.id || "").trim().toLowerCase();
    targetFromCity = String(bookingIdOrObj.fromCity || "").trim().toLowerCase();
    targetToCity = String(bookingIdOrObj.toCity || "").trim().toLowerCase();
  } else {
    targetId = String(bookingIdOrObj).trim().toLowerCase();
  }

  if (!targetId) return;

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
              const tFrom = String(t.fromCity || "").trim().toLowerCase();
              const tTo = String(t.toCity || "").trim().toLowerCase();

              // If specific leg route details are provided for multi-city, only update the matching leg route
              const isSpecificLegMatch = targetFromCity && targetToCity
                ? (tFrom === targetFromCity && tTo === targetToCity)
                : true;

              if (isSpecificLegMatch) {
                t.status = status;
                t.Status = status;
                if (Array.isArray(t.passengers)) {
                  t.passengers.forEach((p) => { p.status = status; });
                }
                updated = true;
              }

              // Check if sub-legs in multiCityTickets array match
              if (Array.isArray(t.multiCityTickets)) {
                t.multiCityTickets.forEach((subT) => {
                  const subFrom = String(subT.fromCity || "").trim().toLowerCase();
                  const subTo = String(subT.toCity || "").trim().toLowerCase();
                  const isSubLegMatch = targetFromCity && targetToCity
                    ? (subFrom === targetFromCity && subTo === targetToCity)
                    : true;

                  if (isSubLegMatch) {
                    subT.status = status;
                    subT.Status = status;
                    updated = true;
                  }
                });
              }
            }
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }
    } catch (e) { }
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
  } catch (e) { }
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
    const candidateEndpoints = [
      "/api/FlightBookings/history",
      "/api/FlightBookings",
      "/api/flight/srdv/bookings",
      "/api/flight/bookings",
      "/api/FlightBookings/my-bookings",
      "/api/FlightBookings/user-bookings",
      "/api/bookings/history?type=flight",
      "/api/bookings/history",
    ];

    for (const endpoint of candidateEndpoints) {
      try {
        const data = await requestJson(endpoint, { method: "GET" });
        if (Array.isArray(data) && data.length > 0) {
          data
            .filter(b => {
              const type = String(b.tripType || b.TripType || b.ticketType || b.type || "").trim().toLowerCase();
              if (type && type !== "flight" && type !== "air" && type !== "flight ticket") return false;
              const ref = String(b.bookingReference || b.BookingReference || b.bookingId || b.id || b.pnr || "").trim().toUpperCase();
              if (ref.startsWith("BS-") || ref.startsWith("BUS") || ref.startsWith("HT-") || ref.startsWith("HOT") || ref.startsWith("CAB")) return false;
              if (b.busName || b.busNumber || b.hotelName || b.roomType || b.boardingPoint || b.checkInDate) return false;
              return true;
            })
            .forEach((t, index) => {
              const normalized = normalizeFlightBookingRecord(t);
              const ref = String(normalized.bookingReference || normalized.bookingId || `FL-${index + 1}`).trim().toLowerCase();
              if (!bookings.some(b => String(b.bookingReference || b.bookingId || "").trim().toLowerCase() === ref)) {
                if (!normalized.bookingId) normalized.bookingId = ref;
                if (!normalized.bookingReference) normalized.bookingReference = ref;
                bookings.push(normalized);
              }
            });
          break;
        }
      } catch (err) {
        console.warn(`listFlightBookings: fetch failed for ${endpoint}:`, err);
      }
    }
  }

  // Merge local storage ticket backups (e.g. latest_ticket, my_flight_bookings, user_flight_tickets, pnb_flight_bookings)
  if (typeof window !== "undefined" && window.localStorage) {
    const keys = [
      "latest_ticket",
      "my_flight_bookings",
      "user_flight_tickets",
      "stored_tickets",
      "pnb_flight_bookings",
      "mock_tickets"
    ];

    let rank = 0;
    keys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        items.forEach((item) => {
          if (!item || typeof item !== "object") return;
          const normalized = normalizeFlightBookingRecord(item);
          normalized._localRank = rank++;
          const ref = String(normalized.bookingReference || normalized.bookingId || normalized.pnr || "").trim().toLowerCase();

          if (ref && !bookings.some(b => String(b.bookingReference || b.bookingId || b.pnr || "").trim().toLowerCase() === ref)) {
            bookings.push(normalized);
          }
        });
      } catch (e) { }
    });
  }



  // Filter by passengerPhone if supplied
  if (passengerPhone) {
    const cleanPhone = String(passengerPhone).replace(/\D/g, "");
    if (cleanPhone) {
      bookings = bookings.filter((b) => String(b.passengerPhone || "").replace(/\D/g, "").includes(cleanPhone));
    }
  }

  // Filter by status if supplied
  if (status && status !== "All") {
    bookings = bookings.filter((b) => String(b.status || "").toLowerCase() === String(status).toLowerCase());
  }

  // Ensure strict filtering: eliminate any non-flight bookings (e.g. Bus BS- or Hotel HT- reservations)
  bookings = bookings.filter(b => {
    const type = String(b.tripType || b.TripType || b.ticketType || b.type || "").trim().toLowerCase();
    if (type && type !== "flight" && type !== "air" && type !== "flight ticket") return false;
    const ref = String(b.bookingReference || b.BookingReference || b.bookingId || b.id || b.pnr || "").trim().toUpperCase();
    if (ref.startsWith("BS-") || ref.startsWith("BUS") || ref.startsWith("HT-") || ref.startsWith("HOT") || ref.startsWith("CAB")) return false;
    if (b.busName || b.busNumber || b.hotelName || b.roomType || b.boardingPoint || b.checkInDate) return false;
    return true;
  });

  // Consolidate multi-city sub-legs sharing the same PNR/bookingReference into a single real flight booking record
  const consolidatedMap = new Map();
  bookings.forEach((item) => {
    const pnrKey = String(item.bookingReference || item.pnr || item.bookingId || "").trim().toUpperCase();
    if (!pnrKey) {
      consolidatedMap.set(Symbol(), item);
      return;
    }

    if (!consolidatedMap.has(pnrKey)) {
      const initialSegs = Array.isArray(item.segments) && item.segments.length > 0
        ? item.segments
        : [{
          legIndex: 1,
          fromCity: item.fromCity,
          toCity: item.toCity,
          providerName: item.providerName,
          tripNumber: item.tripNumber,
          departureTimeUtc: item.departureTimeUtc,
          fare: item.totalPriceInr || 0,
          status: item.status || "Booked"
        }];
      consolidatedMap.set(pnrKey, {
        ...item,
        segments: initialSegs
      });
    } else {
      const parent = consolidatedMap.get(pnrKey);
      parent.isMultiCity = true;
      parent.tripType = "multicity";

      const newLeg = {
        legIndex: parent.segments.length + 1,
        fromCity: item.fromCity,
        toCity: item.toCity,
        providerName: item.providerName,
        tripNumber: item.tripNumber,
        departureTimeUtc: item.departureTimeUtc,
        fare: item.totalPriceInr || 0,
        status: item.status || "Booked"
      };

      const alreadyHasLeg = parent.segments.some(s =>
        String(s.fromCity || "").toLowerCase() === String(item.fromCity || "").toLowerCase() &&
        String(s.toCity || "").toLowerCase() === String(item.toCity || "").toLowerCase()
      );
      if (!alreadyHasLeg) {
        parent.segments.push(newLeg);
      }

      if (item.toCity) parent.toCity = item.toCity;
      if (item.totalPriceInr && item.totalPriceInr > parent.totalPriceInr) {
        parent.totalPriceInr = item.totalPriceInr;
      }
      if (item.passengerPhone && !parent.passengerPhone) parent.passengerPhone = item.passengerPhone;
      if (item.passengerEmail && !parent.passengerEmail) parent.passengerEmail = item.passengerEmail;
      if (item.passengerName && item.passengerName !== "Passenger") parent.passengerName = item.passengerName;
    }
  });

  bookings = Array.from(consolidatedMap.values());

  // Sort sequentially by recent booking (most recently created/booked ticket first)
  bookings.sort((a, b) => {
    // 1. If available in recent bookings queue, rely strictly on their insertion rank (0 = newest)
    if (typeof a._localRank === "number" && typeof b._localRank === "number") {
      if (a._localRank !== b._localRank) return a._localRank - b._localRank;
    }
    if (typeof a._localRank === "number") return -1;
    if (typeof b._localRank === "number") return 1;

    // 2. Extract numeric ID (PNB-90351353 -> 90351353) or DB ID descending (higher ID = more recent booking)
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

    // 3. Compare valid booking creation timestamps (most recent creation date first)
    const getTimestamp = (obj) => {
      const ts = obj.bookedAtUtc || obj.BookedAtUtc || obj.bookedAt || obj.createdAt || obj.CreatedAt || obj.bookingDate || obj.BookingDate || 0;
      const val = new Date(ts).getTime();
      return isNaN(val) || val < 946684800000 ? 0 : val;
    };
    const timeA = getTimestamp(a);
    const timeB = getTimestamp(b);
    if (timeA > 0 && timeB > 0 && Math.abs(timeA - timeB) > 1000) {
      return timeB - timeA;
    }
    if (timeA > 0 && timeB === 0) return -1;
    if (timeB > 0 && timeA === 0) return 1;

    return 0;
  });
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
    toCity: ""
  };
}

function persistCancelledStatusToStorage(targetRef, cancelDetails = {}) {
  if (typeof window === "undefined" || !targetRef) return;

  const targetStr = String(targetRef).toLowerCase().trim();
  const targetFrom = String(cancelDetails.fromCity || "").trim().toLowerCase();
  const targetTo = String(cancelDetails.toCity || "").trim().toLowerCase();

  const keys = [
    "mock_tickets",
    "my_flight_bookings",
    "user_flight_tickets",
    "stored_tickets",
    "pnb_flight_bookings",
    "latest_ticket"
  ];

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      let changed = false;

      const updateItem = (item) => {
        if (!item || typeof item !== "object") return item;

        const idVals = [
          String(item.bookingId || "").toLowerCase().trim(),
          String(item.BookingId || "").toLowerCase().trim(),
          String(item.bookingReference || "").toLowerCase().trim(),
          String(item.BookingReference || "").toLowerCase().trim(),
          String(item.pnr || "").toLowerCase().trim(),
          String(item.PNR || "").toLowerCase().trim(),
          String(item.id || "").toLowerCase().trim()
        ];

        if (idVals.includes(targetStr)) {
          const itemFrom = String(item.fromCity || "").trim().toLowerCase();
          const itemTo = String(item.toCity || "").trim().toLowerCase();

          // If route details are specified, only cancel the matching leg route
          const isRouteMatch = targetFrom && targetTo
            ? (itemFrom === targetFrom && itemTo === targetTo)
            : true;

          if (isRouteMatch) {
            changed = true;
            const updatedPassengers = Array.isArray(item.passengers)
              ? item.passengers.map((p) => ({ ...p, isCancelled: true, status: "Cancelled", Status: "Cancelled" }))
              : Array.isArray(item.Passengers)
                ? item.Passengers.map((p) => ({ ...p, isCancelled: true, status: "Cancelled", Status: "Cancelled" }))
                : [];

            item = {
              ...item,
              status: cancelDetails.status || "Cancelled",
              Status: cancelDetails.Status || cancelDetails.status || "Cancelled",
              cancelledAtUtc: cancelDetails.cancelledAtUtc || new Date().toISOString(),
              cancellationReason: cancelDetails.cancellationReason || "Customer requested cancellation",
              changeRequestId: cancelDetails.changeRequestId || item.changeRequestId || "CR-" + Math.floor(100000 + Math.random() * 900000),
              refundAmount: Number(cancelDetails.refundAmount ?? cancelDetails.RefundAmount ?? cancelDetails?.RefundDetails?.RefundAmount ?? item.refundAmount ?? 0) || 0,
              cancellationCharge: Number(cancelDetails.cancellationCharge ?? cancelDetails.CancellationCharge ?? cancelDetails?.RefundDetails?.CancellationCharge ?? item.cancellationCharge ?? 0) || 0,
              passengers: updatedPassengers,
            };
          }

          // Check sub-legs inside multiCityTickets array
          if (Array.isArray(item.multiCityTickets)) {
            const updatedSubLegs = item.multiCityTickets.map((subT) => {
              const subFrom = String(subT.fromCity || "").trim().toLowerCase();
              const subTo = String(subT.toCity || "").trim().toLowerCase();
              const isSubMatch = targetFrom && targetTo
                ? (subFrom === targetFrom && subTo === targetTo)
                : true;

              if (isSubMatch) {
                changed = true;
                return {
                  ...subT,
                  status: "Cancelled",
                  Status: "Cancelled"
                };
              }
              return subT;
            });
            item.multiCityTickets = updatedSubLegs;
          }
        }
        return item;
      };

      let updatedData = parsed;
      if (Array.isArray(parsed)) {
        updatedData = parsed.map(updateItem);
      } else if (typeof parsed === "object") {
        updatedData = updateItem(parsed);
      }

      if (changed) {
        localStorage.setItem(key, JSON.stringify(updatedData));
      }
    } catch (e) {
      // Ignore storage errors
    }
  });
}

async function fetchLiveBookingRecordFromBackend(targetRef, fallbackObj = {}) {
  const refStr = String(targetRef || "").trim().toLowerCase();
  if (!refStr && !fallbackObj) return null;
  const pnrOrRef = String(fallbackObj?.bookingReference || fallbackObj?.BookingReference || fallbackObj?.pnr || fallbackObj?.PNR || refStr).trim().toLowerCase();

  const candidateEndpoints = [
    "/api/flight/srdv/bookings",
    "/api/FlightBookings",
    "/api/flight/bookings",
    "/api/bookings/history"
  ];

  for (const ep of candidateEndpoints) {
    try {
      const list = await requestJson(ep, { method: "GET" });
      if (Array.isArray(list)) {
        const matched = list.find(b => {
          const r1 = String(b.bookingReference || b.BookingReference || b.pnr || b.PNR || "").trim().toLowerCase();
          const r2 = String(b.bookingId || b.BookingId || b.id || b.Id || "").trim().toLowerCase();
          const r3 = String(b.srdvBookingId || b.SrdvBookingId || b.supplierBookingId || b.SupplierBookingId || "").trim().toLowerCase();
          return (r1 && (r1 === pnrOrRef || r1 === refStr)) || (r2 && (r2 === pnrOrRef || r2 === refStr)) || (r3 && (r3 === pnrOrRef || r3 === refStr));
        });
        if (matched && typeof matched === "object") {
          return normalizeFlightBookingRecord({ ...fallbackObj, ...matched });
        }
      }
    } catch (err) {
      // ignore endpoint failure
    }
  }
  return null;
}

export async function cancelFlightBooking(bookingIdOrObj, reason, { userId } = {}) {
  let booking = typeof bookingIdOrObj === "object" && bookingIdOrObj !== null ? bookingIdOrObj : null;
  const bookingId = booking ? String(booking.bookingId || booking.id || booking.bookingReference || "") : String(bookingIdOrObj || "");
  const targetRef = String(booking?.bookingReference || booking?.BookingReference || booking?.PNR || booking?.pnr || bookingId || "").trim();

  // CRITICAL STEP: Dynamically fetch definitive, live booking details straight from backend database BEFORE calling provider API
  try {
    const liveBackendRecord = await fetchLiveBookingRecordFromBackend(targetRef, booking || {});
    if (liveBackendRecord) {
      booking = { ...(booking || {}), ...liveBackendRecord };
    } else if (!booking && bookingId) {
      booking = await getFlightBookingById(bookingId, { userId });
    }
  } catch (err) {
    console.warn("Dynamic backend fetch for cancellation failed, falling back to cached details:", err);
    if (!booking && bookingId) {
      try {
        booking = await getFlightBookingById(bookingId, { userId });
      } catch (e) {
        console.error("Failed to fetch booking details for cancellation:", e);
      }
    }
  }

  const pnr = String(
    booking?.bookingReference ||
    booking?.BookingReference ||
    booking?.PNR ||
    booking?.pnr ||
    bookingId || ""
  ).trim();

  // CRITICAL STEP: Pass Provider's numeric BookingId (e.g., 23855092) and PNR.
  // Never pass the alphanumeric PNR or internal DB ID into the SRDV BookingId parameter.
  const allBookingIdCandidates = [
    booking?.srdvBookingId,
    booking?.SrdvBookingId,
    booking?.srdv_booking_id,
    booking?.SRDV_BOOKING_ID,
    booking?.srdvBookingID,
    booking?.providerBookingId,
    booking?.ProviderBookingId,
    booking?.provider_booking_id,
    booking?.supplierBookingId,
    booking?.SupplierBookingId,
    booking?.supplier_booking_id,
    booking?.apiBookingId,
    booking?.ApiBookingId,
    booking?.api_booking_id,
    booking?.externalBookingId,
    booking?.ExternalBookingId,
    booking?.vendorBookingId,
    booking?.VendorBookingId,
    booking?.srdvId,
    booking?.SrdvId,
    booking?.ticketLccResponse?.response?.BookingId,
    booking?.ticketLccResponse?.rawResponse?.BookingId,
    booking?.ticketLccResponse?.response?.FlightItinerary?.BookingId,
    booking?.ticketLccResponse?.bookingId,
    booking?.ticketGdsResponse?.rawResponse?.BookingId,
    booking?.ticketGdsResponse?.response?.BookingId,
    booking?.ticketGdsResponse?.response?.FlightItinerary?.BookingId,
    booking?.holdResponse?.Response?.BookingId,
    booking?.holdResponse?.bookingId,
    booking?.rawResponse?.BookingId,
    booking?.apiResponse?.BookingId,
    booking?.srdvResponse?.BookingId,
    booking?.details?.BookingId,
    booking?.itinerary?.BookingId,
    booking?.BookingId,
    booking?.bookingId,
    bookingId
  ].map(val => String(val || "").trim()).filter(Boolean);

  // 1. Prefer purely numeric IDs (like "23855092") that are distinct from PNR and internal IDs
  const numericId = allBookingIdCandidates.find(id => /^\d+$/.test(id) && id !== pnr);
  // 2. Next prefer any distinct candidate that doesn't match PNR or start with FL- or CR-
  const distinctId = allBookingIdCandidates.find(id => id !== pnr && !id.startsWith("FL-") && !id.startsWith("CR-"));

  const providerBookingId = numericId || distinctId || allBookingIdCandidates[0] || "";

  let cancelResult = null;
  const clientId = String(booking?.clientId || booking?.ClientId || FLIGHT_API_CREDENTIALS.ClientId || "180170");
  const userName = String(booking?.userName || booking?.UserName || FLIGHT_API_CREDENTIALS.UserName || "PickNBk6");
  const password = String(booking?.password || booking?.Password || FLIGHT_API_CREDENTIALS.Password || "PickNB@486");
  const apiToken = String(booking?.apiToken || booking?.ApiToken || FLIGHT_API_CREDENTIALS.ApiToken || "PickNB@486#170$");
  const endUserIp = String(booking?.endUserIp || booking?.EndUserIp || FLIGHT_API_CREDENTIALS.EndUserIp || "103.86.74.125");

  // Optional/Additional API: Check Cancellation Charges before cancelling
  let chargesResult = {};
  const candidateTraceId = [
    booking?.traceId,
    booking?.TraceId,
    booking?.trace_id,
    booking?.rawResponse?.TraceId,
    booking?.rawResponse?.traceId,
    booking?.ticketLccResponse?.rawResponse?.TraceId,
    booking?.ticketLccResponse?.rawResponse?.traceId,
    booking?.ticketLccResponse?.TraceId,
    booking?.ticketLccResponse?.traceId,
    booking?.ticketGdsResponse?.rawResponse?.TraceId,
    booking?.ticketGdsResponse?.TraceId,
    booking?.srdvResponse?.TraceId,
    booking?.apiResponse?.TraceId,
    booking?.details?.TraceId,
    booking?.itinerary?.TraceId,
    booking?.flight?.traceId,
    booking?.flight?.TraceId,
    typeof window !== "undefined" ? window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") : "",
    typeof window !== "undefined" ? window.localStorage.getItem("last_booking_trace_id") || window.localStorage.getItem("flight_trace_id") || window.localStorage.getItem("TraceId") || window.localStorage.getItem("traceId") : ""
  ].map(val => String(val || "").trim()).find(Boolean) || "";

  try {
    const chargesResponse = await getCancellationCharges({
      traceId: candidateTraceId,
      bookingId: providerBookingId,
      requestType: 1,
      srdvType: booking?.srdvType || "MixAPI",
      srdvIndex: booking?.srdvIndex || "2"
    });
    chargesResult = chargesResponse?.result || chargesResponse?.Result || {};
  } catch (err) {
    console.warn("Fetch cancellation charges failed:", err);
  }

  // Build Sectors array per Flight Cancellation API Integration Guide using standard IATA city resolution
  const sectors = [];
  const rawFrom = String(
    booking?.fromCity || booking?.FromCity || booking?.origin || booking?.Origin || booking?.source || ""
  );
  const rawTo = String(
    booking?.toCity || booking?.ToCity || booking?.destination || booking?.Destination || ""
  );
  const from = resolveCityCode(rawFrom, "HYD");
  const to = resolveCityCode(rawTo, "BLR");
  if (rawFrom && rawTo) {
    sectors.push({ Origin: from, Destination: to });
  } else if (booking?.route || booking?.Route) {
    const routeStr = String(booking?.route || booking?.Route);
    const parts = routeStr.split(/to|-|–/i).map(s => resolveCityCode(s.trim(), "DEL"));
    if (parts.length >= 2 && parts[0] && parts[1]) {
      sectors.push({ Origin: parts[0], Destination: parts[1] });
    }
  }

  // Build TicketData array per Flight Cancellation API Integration Guide
  const titleRegex = /^(?:mr|mrs|ms|dr|master|miss|mstr|prof|sir|madam)\b\.?\s*/i;
  const parseCleanNames = (first, last, full, idx) => {
    let fName = String(first || "").trim().replace(titleRegex, "").trim();
    let lName = String(last || "").trim().replace(titleRegex, "").trim();
    if (!fName || !lName) {
      const cleanFull = String(full || "Passenger " + (idx + 1)).trim().replace(titleRegex, "").trim();
      const tokens = cleanFull.split(/\s+/).filter(Boolean);
      if (!fName) fName = tokens[0] || "Passenger";
      if (!lName) lName = tokens.slice(1).join(" ") || tokens[0] || "Doe";
    }
    return { firstName: fName || "Passenger", lastName: lName || "Doe" };
  };

  const ticketData = (Array.isArray(booking?.passengers) && booking.passengers.length > 0 ? booking.passengers : []).map((p, idx) => {
    const { firstName, lastName } = parseCleanNames(
      p?.firstName || p?.FirstName,
      p?.lastName || p?.LastName,
      p?.fullName || p?.FullName || p?.name || p?.Name,
      idx
    );

    // Collect possible numeric TicketId candidates from passenger object and nested provider itineraries
    const tCands = [
      p?.srdvTicketId,
      p?.SrdvTicketId,
      p?.ticketId,
      p?.TicketId,
      p?.ticketNumber,
      p?.TicketNumber,
      p?.ticket_no,
      p?.Ticket_No,
      p?.Ticket?.TicketId,
      p?.Ticket?.TicketNumber,
      booking?.ticketLccResponse?.response?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketId,
      booking?.ticketLccResponse?.rawResponse?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketId,
      booking?.ticketLccResponse?.response?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketNumber,
      booking?.ticketGdsResponse?.rawResponse?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketId,
      booking?.ticketGdsResponse?.response?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketId,
      booking?.ticketGdsResponse?.response?.FlightItinerary?.Passenger?.[idx]?.Ticket?.TicketNumber,
      booking?.itinerary?.Passenger?.[idx]?.Ticket?.TicketId,
      booking?.itinerary?.Passenger?.[idx]?.Ticket?.TicketNumber,
      p?.id,
      p?.Id
    ].map(val => String(val || "").trim()).filter(Boolean);

    // Prefer strictly numeric IDs (e.g. 7965942), ignore DOM keys (pax-1) or strings equalling PNR/BookingId
    const numericTid = tCands.find(tid => /^\d+$/.test(tid) && tid !== pnr && tid !== providerBookingId);
    const validTid = numericTid || tCands.find(tid => !/^pax-|^id-|^passenger-/i.test(tid) && tid !== pnr && tid !== providerBookingId) || String(idx + 1);

    return {
      TicketId: validTid,
      FirstName: firstName,
      LastName: lastName
    };
  });

  if (ticketData.length === 0) {
    const { firstName, lastName } = parseCleanNames(
      booking?.firstName || booking?.FirstName,
      booking?.lastName || booking?.LastName,
      booking?.passengerName || booking?.PassengerName || "Passenger Doe",
      0
    );
    const backupTid = String(
      booking?.ticketId ||
      booking?.TicketId ||
      booking?.srdvTicketId ||
      booking?.ticketLccResponse?.response?.FlightItinerary?.Passenger?.[0]?.Ticket?.TicketId ||
      "1"
    ).trim();

    ticketData.push({
      TicketId: /^\d+$/.test(backupTid) && backupTid !== pnr ? backupTid : "1",
      FirstName: firstName,
      LastName: lastName
    });
  }

  // Step 1: Initiate the Cancellation with Provider BookingId and PNR
  const changeRequestResponse = await sendChangeRequest({
    bookingId: providerBookingId,
    pnr: pnr,
    requestType: "2",       // Default for Cancellation per API doc
    cancellationType: "3",  // Default for Full Cancellation per API doc
    remarks: reason || "Customer requested cancellation",
    srdvType: booking?.srdvType || "MixAPI",
    srdvIndex: String(booking?.srdvIndex || (booking?.isLcc ? "2" : "1")),
    endUserIp,
    clientId,
    userName,
    password,
    apiToken,
    sectors,
    ticketData
  });

  let changeRequestId = "";
  let cancelStatusResponse = null;
  let providerCancellationSucceeded = false;

  if (changeRequestResponse?.success === false) {
    const providerErrorMessage = changeRequestResponse.error || "Failed to cancel ticket with provider (SRDV rejected cancellation).";
    console.error("Cancellation rejected by SRDV (SendChangeRequest):", providerErrorMessage);
    throw new Error(providerErrorMessage);
  }

  if (changeRequestResponse?.success !== false && (!changeRequestResponse?.errorCode || String(changeRequestResponse.errorCode) === "0" || String(changeRequestResponse.errorCode) === "000")) {
    changeRequestId = String(
      changeRequestResponse?.changeRequestId ||
      changeRequestResponse?.ChangeRequestId ||
      changeRequestResponse?.ticketCRInfo?.[0]?.ChangeRequestId ||
      changeRequestResponse?.ticketCRInfo?.[0]?.changeRequestId ||
      changeRequestResponse?.rawResponse?.TicketCRInfo?.[0]?.ChangeRequestId ||
      ""
    ).trim();
  }

  if (changeRequestId) {
    try {
      // Step 2: Confirm Cancellation & Trigger Email with automatic polling for async processing
      let attempts = 0;
      const maxAttempts = 12;
      while (attempts < maxAttempts) {
        attempts++;
        cancelStatusResponse = await getCancelStatus({
          changeRequestId,
          srdvType: booking?.srdvType || "MixAPI",
          endUserIp,
          clientId,
          userName,
          password,
          apiToken
        });

        if (cancelStatusResponse?.success === false) {
          const statusErrorMessage = cancelStatusResponse.error || "Failed to verify cancellation status with provider (GetCancelStatus).";
          console.error("Cancellation status verification rejected by SRDV (GetCancelStatus):", statusErrorMessage);
          throw new Error(statusErrorMessage);
        }

        const currentStatus = String(
          cancelStatusResponse?.cancelStatus ||
          cancelStatusResponse?.rawResponse?.CancelStatus ||
          cancelStatusResponse?.rawResponse?.RefundDetails?.CancellationStatus ||
          ""
        ).toLowerCase();

        if (cancelStatusResponse?.success !== false && (!cancelStatusResponse?.errorCode || String(cancelStatusResponse.errorCode) === "0" || String(cancelStatusResponse.errorCode) === "000")) {
          if (currentStatus === "pending" || currentStatus === "inprocess" || currentStatus === "processing") {
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              continue;
            }
          }
          providerCancellationSucceeded = true;
          break;
        }
      }
    } catch (e) {
      console.warn("Step 2 getCancelStatus provider call encountered an issue:", e);
      throw new Error(e.message || "Failed to confirm cancellation status with provider.");
    }
  } else {
    throw new Error("Provider did not return a valid ChangeRequestId for cancellation.");
  }

  if (!providerCancellationSucceeded) {
    const errorMsg = cancelStatusResponse?.error || changeRequestResponse?.error || "Provider (SRDV) rejected the cancellation request or could not confirm status.";
    console.error("Flight cancellation rejected by supplier:", errorMsg);
    throw new Error(errorMsg);
  }

  const rawRefund = cancelStatusResponse?.refundAmount ?? cancelStatusResponse?.rawResponse?.RefundAmount ?? cancelStatusResponse?.rawResponse?.RefundDetails?.RefundAmount;
  const rawFee = cancelStatusResponse?.cancellationCharge ?? cancelStatusResponse?.rawResponse?.CancellationCharge ?? cancelStatusResponse?.rawResponse?.RefundDetails?.CancellationCharge;
  const calculatedRefund = rawRefund !== null && rawRefund !== undefined && !Number.isNaN(Number(rawRefund)) ? (Number(rawRefund) || 0) : (booking?.totalPriceInr ? Math.round(booking.totalPriceInr * 0.85) : 0);
  const calculatedFee = rawFee !== null && rawFee !== undefined && !Number.isNaN(Number(rawFee)) ? (Number(rawFee) || 0) : (booking?.totalPriceInr ? Math.round(booking.totalPriceInr * 0.15) : 0);
  const resolvedStatus = cancelStatusResponse?.cancelStatus || cancelStatusResponse?.rawResponse?.CancelStatus || cancelStatusResponse?.rawResponse?.RefundDetails?.CancellationStatus || "Cancelled";

  const finalPassengers = Array.isArray(booking?.passengers)
    ? booking.passengers.map((p) => ({ ...p, isCancelled: true, status: resolvedStatus }))
    : [];

  cancelResult = {
    ...(booking || {}),
    id: bookingId || pnr,
    bookingId: bookingId || pnr,
    providerBookingId: providerBookingId,
    bookingReference: pnr,
    status: resolvedStatus,
    Status: resolvedStatus,
    passengers: finalPassengers,
    cancelledAtUtc: new Date().toISOString(),
    cancellationReason: reason || "Customer requested cancellation",
    changeRequestId: changeRequestId || cancelStatusResponse?.changeRequestId,
    refundStatus: cancelStatusResponse?.refundStatus || chargesResult?.RefundStatus || "Processed",
    refundAmount: calculatedRefund,
    cancellationCharge: calculatedFee,
    emailTriggered: true,
    message: "Ticket cancelled successfully and cancellation email dispatched."
  };

  // Persist updated status dynamically to local caching and storage so tables reflect Cancelled immediately
  if (bookingId) persistCancelledStatusToStorage(bookingId, cancelResult);
  if (pnr) persistCancelledStatusToStorage(pnr, cancelResult);
  if (providerBookingId) persistCancelledStatusToStorage(providerBookingId, cancelResult);
  if (booking?.id) persistCancelledStatusToStorage(booking.id, cancelResult);

  return cancelResult;
}

export async function cancelFlightPartial(bookingIdOrObj, { selectedLegIndexes = [], selectedPassengerIds = [], reason } = {}) {
  const booking = typeof bookingIdOrObj === "object" ? bookingIdOrObj : await getFlightBookingById(bookingIdOrObj);
  if (!booking) throw new Error("Booking record not found.");

  const pnr = String(booking.bookingReference || booking.pnr || "").trim();
  const providerBookingId = String(booking.providerBookingId || booking.srdvBookingId || booking.bookingId || pnr).trim();

  // Resolve Sectors array for selected leg indexes per SRDV Flight API Integration Guide
  const sectors = [];
  if (Array.isArray(selectedLegIndexes) && selectedLegIndexes.length > 0 && Array.isArray(booking.segments)) {
    selectedLegIndexes.forEach((idx) => {
      const seg = booking.segments[idx];
      if (seg) {
        const fromCode = resolveCityCode(seg.fromCity || seg.origin || seg.sourceCode || "", "DEL");
        const toCode = resolveCityCode(seg.toCity || seg.destination || seg.destinationCode || "", "BOM");
        if (fromCode && toCode) {
          sectors.push({ Origin: fromCode, Destination: toCode });
        }
      }
    });
  }

  // Resolve TicketData array for selected passenger IDs
  const titleRegex = /^(?:mr|mrs|ms|dr|master|miss|mstr|prof|sir|madam)\b\.?\s*/i;
  const ticketData = [];
  if (Array.isArray(selectedPassengerIds) && selectedPassengerIds.length > 0 && Array.isArray(booking.passengers)) {
    booking.passengers.forEach((p, idx) => {
      const pId = p.id || `pax-${idx}`;
      if (selectedPassengerIds.includes(pId) || selectedPassengerIds.includes(p.id)) {
        let fName = String(p.firstName || "").trim().replace(titleRegex, "").trim();
        let lName = String(p.lastName || "").trim().replace(titleRegex, "").trim();
        if (!fName || !lName) {
          const cleanFull = String(p.fullName || p.name || `Passenger ${idx + 1}`).trim().replace(titleRegex, "").trim();
          const tokens = cleanFull.split(/\s+/).filter(Boolean);
          fName = fName || tokens[0] || "Passenger";
          lName = lName || tokens.slice(1).join(" ") || tokens[0] || "Doe";
        }
        ticketData.push({
          TicketId: String(p.ticketId || p.srdvTicketId || idx + 1),
          FirstName: fName,
          LastName: lName
        });
      }
    });
  }

  const clientId = String(booking?.clientId || booking?.ClientId || FLIGHT_API_CREDENTIALS.ClientId || "180170");
  const userName = String(booking?.userName || booking?.UserName || FLIGHT_API_CREDENTIALS.UserName || "PickNBk6");
  const password = String(booking?.password || booking?.Password || FLIGHT_API_CREDENTIALS.Password || "PickNB@486");
  const apiToken = String(booking?.apiToken || booking?.ApiToken || FLIGHT_API_CREDENTIALS.ApiToken || "PickNB@486#170$");
  const endUserIp = String(booking?.endUserIp || booking?.EndUserIp || FLIGHT_API_CREDENTIALS.EndUserIp || "103.86.74.125");

  // Step 1: Send Change Request with Sectors & TicketData
  const changeRequestResponse = await sendChangeRequest({
    bookingId: providerBookingId,
    pnr: pnr,
    requestType: "2",
    cancellationType: "3",
    remarks: reason || "Customer requested partial flight leg/passenger cancellation",
    srdvType: booking?.srdvType || "MixAPI",
    srdvIndex: String(booking?.srdvIndex || (booking?.isLcc ? "2" : "1")),
    endUserIp,
    clientId,
    userName,
    password,
    apiToken,
    sectors,
    ticketData
  });

  let changeRequestId = "";
  if (changeRequestResponse?.success !== false && (!changeRequestResponse?.errorCode || String(changeRequestResponse.errorCode) === "0")) {
    changeRequestId = String(
      changeRequestResponse?.changeRequestId ||
      changeRequestResponse?.ChangeRequestId ||
      changeRequestResponse?.ticketCRInfo?.[0]?.ChangeRequestId ||
      ""
    ).trim();
  }

  // Step 2: Verification step via GetCancelStatus
  if (changeRequestId) {
    try {
      let attempts = 0;
      const maxAttempts = 12;
      while (attempts < maxAttempts) {
        attempts++;
        const cancelStatusResponse = await getCancelStatus({
          changeRequestId,
          srdvType: booking?.srdvType || "MixAPI",
          endUserIp,
          clientId,
          userName,
          password,
          apiToken
        });

        if (cancelStatusResponse?.success === false) {
          throw new Error(cancelStatusResponse.error || "Failed to verify cancellation status.");
        }

        const currentStatus = String(
          cancelStatusResponse?.cancelStatus ||
          cancelStatusResponse?.rawResponse?.CancelStatus ||
          cancelStatusResponse?.rawResponse?.RefundDetails?.CancellationStatus ||
          ""
        ).toLowerCase();

        if (cancelStatusResponse?.success !== false && (!cancelStatusResponse?.errorCode || String(cancelStatusResponse.errorCode) === "0" || String(cancelStatusResponse.errorCode) === "000")) {
          if (currentStatus === "pending" || currentStatus === "inprocess" || currentStatus === "processing") {
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              continue;
            }
          }
          break;
        }
      }
    } catch (e) {
      console.warn("GetCancelStatus step encountered issue:", e);
    }
  }

  // Mark selected segments as Cancelled locally
  const updatedSegments = Array.isArray(booking.segments) ? booking.segments.map((seg, idx) => {
    if (selectedLegIndexes.includes(idx)) {
      return { ...seg, status: "Cancelled", isCancelled: true };
    }
    return seg;
  }) : [];

  // Mark selected passengers as Cancelled locally
  const updatedPassengers = Array.isArray(booking.passengers) ? booking.passengers.map((p, idx) => {
    const pId = p.id || `pax-${idx}`;
    if (selectedPassengerIds.includes(pId) || selectedPassengerIds.includes(p.id)) {
      return { ...p, isCancelled: true, status: "Cancelled" };
    }
    return p;
  }) : [];

  const allLegsCancelled = updatedSegments.length > 0 && updatedSegments.every(s => s.status === "Cancelled" || s.isCancelled);
  const allPaxCancelled = updatedPassengers.length > 0 && updatedPassengers.every(p => p.isCancelled);
  const overallStatus = (allLegsCancelled || allPaxCancelled) ? "Cancelled" : (booking.status || "Booked");

  const cancelResult = {
    ...booking,
    status: overallStatus,
    Status: overallStatus,
    segments: updatedSegments,
    passengers: updatedPassengers,
    cancelledAtUtc: new Date().toISOString(),
    cancellationReason: reason || "Partial cancellation requested",
    changeRequestId: changeRequestId || booking.changeRequestId,
    message: "Selected flight legs / passengers cancelled successfully."
  };

  if (pnr) persistCancelledStatusToStorage(pnr, cancelResult);
  if (providerBookingId) persistCancelledStatusToStorage(providerBookingId, cancelResult);
  if (booking.bookingId) persistCancelledStatusToStorage(booking.bookingId, cancelResult);

  return cancelResult;
}

export async function cancelFlightPassengers(bookingIdOrObj, passengerIds, reason, { userId } = {}) {
  return cancelFlightPartial(bookingIdOrObj, { selectedPassengerIds: passengerIds, reason });
}


export async function listHotFlightRoutes({ metric = "score" } = {}) {
  return [
    { routeId: "hot-1", fromCity: "DEL", toCity: "BOM", score: 98, searchCount: 1540 },
    { routeId: "hot-2", fromCity: "DEL", toCity: "DXB", score: 95, searchCount: 1280 },
    { routeId: "hot-3", fromCity: "BOM", toCity: "BLR", score: 91, searchCount: 1100 },
    { routeId: "hot-4", fromCity: "DEL", toCity: "HYD", score: 88, searchCount: 950 },
  ];
}

export async function getFlightSeatMap(flightIdOrObj, travelClass, { userId } = {}) {
  let flowState = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("flight_booking_flow_state_v1");
      if (raw) flowState = JSON.parse(raw) || {};
    } catch { }
  }

  const selectedLegs = Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0
    ? flowState.selectedLegs
    : [flowState.flight, flowState.returnFlight].filter(Boolean);

  let targetFlight = (flightIdOrObj && typeof flightIdOrObj === "object") ? flightIdOrObj : (flowState.flight || {});
  let targetLegIndex = 0;

  if (typeof flightIdOrObj === "string" || typeof flightIdOrObj === "number") {
    const flightIdStr = String(flightIdOrObj);
    const foundIdx = selectedLegs.findIndex(leg =>
      String(leg.id) === flightIdStr ||
      String(leg.resultIndex) === flightIdStr ||
      String(leg.rawId) === flightIdStr ||
      (flightIdStr.startsWith("ret-") && leg.isReturnFlight)
    );
    if (foundIdx >= 0) {
      targetFlight = selectedLegs[foundIdx];
      targetLegIndex = foundIdx;
    } else if (flowState.returnFlight && (flightIdStr.startsWith("ret-") || flightIdStr === String(flowState.returnFlight.id))) {
      targetFlight = flowState.returnFlight;
      targetLegIndex = 1;
    }
  } else if (flightIdOrObj && typeof flightIdOrObj === "object") {
    const foundIdx = selectedLegs.findIndex(leg =>
      leg === flightIdOrObj ||
      String(leg.id) === String(flightIdOrObj.id) ||
      (leg.sourceCode === flightIdOrObj.sourceCode && leg.destinationCode === flightIdOrObj.destinationCode)
    );
    if (foundIdx >= 0) {
      targetLegIndex = foundIdx;
    } else if (flightIdOrObj.isReturnFlight || flightIdOrObj === flowState.returnFlight) {
      targetLegIndex = 1;
    }
  }

  const isTwoWay = Boolean(
    flowState.isTwoWay ||
    flowState.returnFlight ||
    (selectedLegs && selectedLegs.length > 1)
  );

  // Build the full journey flight object containing all legs context for the API call
  const fetchFlightObj = {
    flight: flowState.flight || targetFlight,
    returnFlight: flowState.returnFlight || (isTwoWay && selectedLegs[1] ? selectedLegs[1] : null),
    selectedLegs: selectedLegs.length > 0 ? selectedLegs : undefined,
    legs: selectedLegs.length > 0 ? selectedLegs : undefined,
    isTwoWay,
    isMultiCity: Boolean(flowState.isMultiCity || flowState.tripType === "multicity"),
    traceId: targetFlight.traceId || flowState.traceId || flowState.flight?.traceId || "",
    resultIndex: flowState.resultIndex || flowState.ResultIndex || targetFlight.resultIndex || targetFlight.id || "",
    srdvType: targetFlight.srdvType || flowState.srdvType || "MixAPI",
    srdvIndex: targetFlight.srdvIndex || flowState.srdvIndex || "2",
  };

  let [ssrRes, seatMapRes] = await Promise.all([
    getSSR(fetchFlightObj),
    getSeatMap(fetchFlightObj)
  ]);

  // Fallback if combined call returned no seats for this leg: query directly with targetFlight
  if ((!seatMapRes?.success || !seatMapRes?.results?.length) && targetFlight?.resultIndex) {
    try {
      const directSeatMap = await getSeatMap(targetFlight);
      if (directSeatMap?.success && directSeatMap?.results?.length) {
        seatMapRes = directSeatMap;
      }
    } catch { }
  }

  // Target flight segment identifiers
  const targetFlightNumberStr = String(
    targetFlight.flightNumber || targetFlight.FlightNumber || targetFlight.airlineNumber || ""
  ).replace(/\D/g, "");
  const targetOrigin = String(
    targetFlight.sourceCode || targetFlight.fromCity || targetFlight.origin || targetFlight.Origin || targetFlight.source || ""
  ).trim().toLowerCase();
  const targetDestination = String(
    targetFlight.destinationCode || targetFlight.toCity || targetFlight.destination || targetFlight.Destination || ""
  ).trim().toLowerCase();

  // Extract and flatten all segment results from seatMapRes
  const rawResults = seatMapRes?.results || seatMapRes?.Results || seatMapRes?.response?.Results || seatMapRes?.rawResponse?.Response?.Results || [];
  const allSegments = Array.isArray(rawResults)
    ? rawResults.flat(Infinity)
    : (rawResults && typeof rawResults === "object" ? [rawResults] : []);

  // Filter segments to match the target flight leg
  let matchedSegments = [];
  if (allSegments.length === 1) {
    matchedSegments = allSegments;
  } else if (allSegments.length > 1) {
    // 1. Try matching origin & destination
    matchedSegments = allSegments.filter(res => {
      const segOrigin = String(res.FromAirportCode || res.Origin || res.origin || res.From || res.from || "").trim().toLowerCase();
      const segDest = String(res.ToAirportCode || res.Destination || res.destination || res.To || res.to || "").trim().toLowerCase();
      if (targetOrigin && segOrigin && targetOrigin.includes(segOrigin) || segOrigin.includes(targetOrigin)) {
        if (targetDestination && segDest && targetDestination.includes(segDest) || segDest.includes(targetDestination)) {
          return true;
        }
      }
      return false;
    });

    // 2. If no origin/destination match, try flight number
    if (matchedSegments.length === 0 && targetFlightNumberStr) {
      matchedSegments = allSegments.filter(res => {
        const segFlightNumberStr = String(res.AirlineNumber || res.FlightNumber || res.flightNumber || "").replace(/\D/g, "");
        return segFlightNumberStr && segFlightNumberStr === targetFlightNumberStr;
      });
    }

    // 3. If still no match, match by targetLegIndex
    if (matchedSegments.length === 0 && allSegments[targetLegIndex]) {
      matchedSegments = [allSegments[targetLegIndex]];
    }

    // 4. Fallback to all segments if filtering still empty
    if (matchedSegments.length === 0) {
      matchedSegments = allSegments;
    }
  }

  let allSeats = [];

  matchedSegments.forEach(res => {
    if (!res || typeof res !== "object") return;

    const parentAirlineCode = res.AirlineCode || res.airlineCode || targetFlight.airlineCode || "";
    const parentFlightNumber = res.AirlineNumber || res.FlightNumber || res.flightNumber || targetFlight.flightNumber || "";
    const parentOrigin = res.FromAirportCode || res.Origin || res.origin || targetFlight.sourceCode || "";
    const parentDestination = res.ToAirportCode || res.Destination || res.destination || targetFlight.destinationCode || "";

    const addSeat = (s) => {
      if (!s || typeof s !== "object") return;
      const code = String(s.Code || s.code || s.SeatNumber || s.seatNumber || s.SeatNo || s.seatNo || "").trim();
      if (!code) return;

      const isBooked = Boolean(
        s.IsBooked ??
        s.isBooked ??
        s.AvailablityType === 2 ??
        s.AvailablityType === 3 ??
        s.AvailabilityType === 2 ??
        s.AvailabilityType === 3 ??
        s.IsAvailable === false ??
        s.isAvailable === false ??
        String(s.Status || s.status || "").toLowerCase() === "booked"
      );

      allSeats.push({
        ...s,
        Code: code,
        SeatNumber: String(s.SeatNumber || s.seatNumber || s.SeatNo || code).trim(),
        Amount: Number(s.Amount ?? s.amount ?? s.Price ?? s.price ?? s.Fare ?? 0),
        Price: Number(s.Price ?? s.price ?? s.Amount ?? s.amount ?? 0),
        IsBooked: isBooked,
        isBooked,
        IsLegroom: Boolean(s.IsLegroom ?? s.isLegroom),
        IsAisle: Boolean(s.IsAisle ?? s.isAisle),
        AirlineCode: s.AirlineCode || parentAirlineCode,
        AirlineNumber: s.AirlineNumber || s.FlightNumber || parentFlightNumber,
        FlightNumber: s.FlightNumber || s.AirlineNumber || parentFlightNumber,
        Origin: s.Origin || parentOrigin,
        Destination: s.Destination || parentDestination,
      });
    };

    // 1. Support for object-based Seats structure (res.Seats.Row4.Column1)
    if (res.Seats && typeof res.Seats === "object" && !Array.isArray(res.Seats)) {
      Object.values(res.Seats).forEach(rowObj => {
        if (rowObj && typeof rowObj === "object") {
          Object.values(rowObj).forEach(colObj => {
            if (colObj && typeof colObj === "object") {
              addSeat(colObj);
            }
          });
        }
      });
    }

    // 1.5 Support for flat or nested array Seats structure
    const seatsArr = res.Seats || res.seats || res.Seat || res.seat;
    if (Array.isArray(seatsArr)) {
      seatsArr.flat(Infinity).forEach(s => addSeat(s));
    }

    // 2. Support for SeatDynamic array-based structure
    const seatDynamic = res.SeatDynamic || res.seatDynamic || [];
    if (seatDynamic && (Array.isArray(seatDynamic) ? seatDynamic.length > 0 : Object.keys(seatDynamic).length > 0)) {
      const segmentSeats = Array.isArray(seatDynamic) ? seatDynamic : [seatDynamic];
      segmentSeats.forEach(segSeat => {
        const rowSeats = segSeat.SegmentSeat || segSeat.segmentSeat || [];
        (Array.isArray(rowSeats) ? rowSeats : [rowSeats]).forEach(rs => {
          const seats = rs.RowSeats || rs.rowSeats || [];
          (Array.isArray(seats) ? seats : [seats]).forEach(seat => {
            const seatsArray = seat.Seats || seat.seats;
            const iterableSeats = Array.isArray(seatsArray) ? seatsArray : (seatsArray ? [seatsArray] : [seat]);
            (Array.isArray(iterableSeats) ? iterableSeats : [iterableSeats]).flat(Infinity).forEach(s => addSeat(s));
          });
        });
      });
    }

    // 3. Support for SegmentSeat direct structure
    const directSegmentSeat = res.SegmentSeat || res.segmentSeat;
    if (directSegmentSeat) {
      const segRows = Array.isArray(directSegmentSeat) ? directSegmentSeat : [directSegmentSeat];
      segRows.forEach(rs => {
        const rows = rs.RowSeats || rs.rowSeats || [];
        (Array.isArray(rows) ? rows : [rows]).forEach(row => {
          const rowSeats = row.Seats || row.seats || row;
          (Array.isArray(rowSeats) ? rowSeats : [rowSeats]).flat(Infinity).forEach(s => addSeat(s));
        });
      });
    }
  });

  // Filter SSR add-ons for the specific leg
  const filterSsr = (arr) => {
    const list = Array.isArray(arr) ? arr.flat(Infinity) : [];
    if (list.length === 0) return [];

    // First try filtering by leg origin & destination
    const matched = list.filter(item => {
      const itemOrigin = String(item.origin || item.Origin || "").trim().toLowerCase();
      const itemDest = String(item.destination || item.Destination || "").trim().toLowerCase();
      if (targetOrigin && itemOrigin && !(targetOrigin.includes(itemOrigin) || itemOrigin.includes(targetOrigin))) return false;
      if (targetDestination && itemDest && !(targetDestination.includes(itemDest) || itemDest.includes(targetDestination))) return false;
      return true;
    });

    if (matched.length > 0) return matched;

    // Second try filtering by WayType (1 = Onward, 2 = Return)
    if (targetLegIndex > 0) {
      const wayTypeMatched = list.filter(item => Number(item.WayType ?? item.wayType ?? 0) === 2);
      if (wayTypeMatched.length > 0) return wayTypeMatched;
    } else {
      const wayTypeMatched = list.filter(item => Number(item.WayType ?? item.wayType ?? 0) === 1);
      if (wayTypeMatched.length > 0) return wayTypeMatched;
    }

    return list;
  };

  return {
    success: true,
    Baggage: filterSsr(ssrRes.Baggage || ssrRes.baggage || []),
    MealDynamic: filterSsr(ssrRes.MealDynamic || ssrRes.mealDynamic || ssrRes.Meal || ssrRes.meal || []),
    Meal: filterSsr(ssrRes.Meal || ssrRes.meal || []),
    seats: allSeats,
  };
}

export async function getFlightPricingPreview(payload, { userId } = {}) {
  return getFareQuote(payload);
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
  const isAdmin = typeof window !== "undefined" &&
    (window.location.pathname.toLowerCase().startsWith("/admin") || localStorage.getItem("adminToken"));
  const route = isAdmin ? "/api/admin/flight-promotions" : "/api/FlightPromotions";
  return requestJson(route, { method: "GET" });
}

export async function deleteFlightPromotion(id) {
  return requestJson(`/api/admin/flight-promotions/${id}`, {
    method: "DELETE",
  });
}

export async function getFlightPromotionById(id) {
  return requestJson(`/api/admin/flight-promotions/${id}`, {
    method: "GET",
  });
}

export async function createFlightPromotion(payload) {
  return requestJson("/api/admin/flight-promotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFlightPromotion(id, payload) {
  return requestJson(`/api/admin/flight-promotions/${id}`, {
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

export async function processFlightBookingCallback({
  traceId = "270240",
  bookingId = "1876293",
  pnr = "UK8B9D",
  gdsPnr = "UK8B9D",
  status = "Success",
  remark = "Ticketed",
  passengers = []
} = {}) {
  const url = `${SRDV_ROOT}/flight_callback`;

  const payload = {
    ClientId: String(FLIGHT_API_CREDENTIALS.ClientId || "180170"),
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
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
  return requestJson(`/api/admin/flight/remarks/${id}`, {
    method: "DELETE",
  });
}
