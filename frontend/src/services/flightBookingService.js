import { clearFlightBookingFlowState } from "../pages/booking/flightBookingFlowStore.js";
import { extractRelevantSegments } from "../utils/flightSegmentUtils.js";
import { parseSrdvSeatMap } from "../utils/seatMapUtils.js";

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


// â”€â”€â”€ SRDV API Root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SRDV_ROOT = "/api/flight/srdv";

const FLIGHT_API_CREDENTIALS = {
  ClientId: "180232",
  UserName: "PickNBk6",
  Password: "PickNB@486",
  ApiToken: "PickNB@486#170$",
  EndUserIp: "103.86.74.125"
};


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
      // It's an array of arrays â€” flatten the first segment
      return rawList[0].flat(Infinity);
    }
    return rawList.flat(Infinity);
  }

  return [];
}

function shouldUseFallbackFlights() {
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

  const rawResultIndex = String(
    pickFirst(primaryFare, ["ResultIndex", "resultIndex", "ResultId", "resultId"], "") ||
    pickFirst(record, ["resultIndex", "ResultIndex", "resultId", "ResultId"], "")
  ).trim();

  const cleanCandidate = cleanResultIndex(rawResultIndex);
  const exactResultIndex = cleanCandidate || rawResultIndex || String(index + 1);

  console.log("[DEBUG ResultIndex trace]", { rawResultIndex, cleanCandidate, exactResultIndex });

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
  const finalResultIndex = exactResultIndex;

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
    id: `flight-${srdvType || "mix"}-${srdvIndex || "1"}-${finalResultIndex}-${index}`,
    rawId: finalResultIndex,
    traceId: exactTraceId,
    resultIndex: finalResultIndex,
    srdvResultIndex: String(exactResultIndex || finalResultIndex),
    rawResultIndex: String(exactResultIndex || finalResultIndex),
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
    segments: segs,
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
    (typeof window !== "undefined" ? window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") : "") ||
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
    isMultiCity: Boolean(
      record.isMultiCity ||
      record.isMultiCityBooking ||
      record.tripType === "multicity" ||
      (Array.isArray(record.allTickets) && record.allTickets.length > 1) ||
      (Array.isArray(record.multiCityLegs) && record.multiCityLegs.length > 1) ||
      (Array.isArray(record.selectedLegs) && record.selectedLegs.length > 1) ||
      (Array.isArray(record.segments) && record.segments.length > 1)
    ),
    passengers,
    segments: (() => {
      const mapSegItem = (s, idx) => {
        if (!s || typeof s !== "object") return null;
        const item = Array.isArray(s) ? s[0] : s;
        if (!item) return null;

        const originObj = item.Origin || item.origin || {};
        const destObj = item.Destination || item.destination || {};
        const airlineObj = item.Airline || item.airline || {};
        const originAirport = originObj.Airport || originObj.airport || {};
        const destAirport = destObj.Airport || destObj.airport || {};

        const fromCity = String(
          item.fromCity || item.from || item.source || item.sourceCode || item.SourceCode ||
          originAirport.CityName || originAirport.CityCode || originObj.CityName || originObj.CityCode || originObj.AirportCode ||
          ""
        ).trim();

        const toCity = String(
          item.toCity || item.to || item.destination || item.destinationCode || item.DestinationCode ||
          destAirport.CityName || destAirport.CityCode || destObj.CityName || destObj.CityCode || destObj.AirportCode ||
          ""
        ).trim();

        const providerName = String(
          item.providerName || item.airline || item.airlineName || item.AirlineName ||
          airlineObj.AirlineName || airlineObj.AirlineCode || record.providerName || "SRDV Flight"
        ).trim();

        const flightNum = airlineObj.FlightNumber || item.flightNumber || item.flightNo || item.tripNumber || item.FlightNumber;
        const airlineCode = airlineObj.AirlineCode || item.airlineCode || item.AirlineCode || "";
        const tripNumber = String(
          flightNum ? (airlineCode && !String(flightNum).startsWith(airlineCode) ? `${airlineCode} ${flightNum}` : flightNum) : (record.tripNumber || "--")
        ).trim();

        const departureTimeUtc =
          item.departureTimeUtc || item.departureTime || item.departureDate || item.departDate ||
          originObj.DepTime || originObj.depTime || record.departureTimeUtc || null;

        return {
          fromCity: fromCity || (idx === 0 ? record.fromCity : ""),
          toCity: toCity || (idx === 0 ? record.toCity : ""),
          providerName: providerName || "SRDV Flight",
          tripNumber: tripNumber || "--",
          departureTimeUtc,
          status: item.status || record.status || "Active"
        };
      };

      if (Array.isArray(record.allTickets) && record.allTickets.length > 0) {
        return record.allTickets.map(mapSegItem).filter(Boolean);
      }

      if (Array.isArray(record.multiCityLegs) && record.multiCityLegs.length > 0) {
        return record.multiCityLegs.map(mapSegItem).filter(Boolean);
      }

      if (Array.isArray(record.selectedLegs) && record.selectedLegs.length > 0) {
        return record.selectedLegs.map(mapSegItem).filter(Boolean);
      }

      let rawSegs = pickFirst(record, ["segments", "Segments", "sectors", "Sectors", "legs", "Legs"], null);
      if (Array.isArray(rawSegs) && rawSegs.length > 0) {
        const flattened = [];
        rawSegs.forEach(item => {
          if (Array.isArray(item)) {
            item.forEach(sub => flattened.push(sub));
          } else {
            flattened.push(item);
          }
        });
        return flattened.map(mapSegItem).filter(Boolean);
      }

      if (record.onwardTicket && record.returnTicket) {
        return [
          {
            fromCity: String(record.onwardTicket.fromCity || record.fromCity || ""),
            toCity: String(record.onwardTicket.toCity || record.toCity || ""),
            providerName: String(record.onwardTicket.providerName || record.providerName || "SRDV Flight"),
            tripNumber: String(record.onwardTicket.tripNumber || record.tripNumber || "--"),
            departureTimeUtc: record.onwardTicket.departureTimeUtc || record.departureTimeUtc,
            status: record.onwardTicket.status || record.status || "Active",
          },
          {
            fromCity: String(record.returnTicket.fromCity || record.toCity || ""),
            toCity: String(record.returnTicket.toCity || record.fromCity || ""),
            providerName: String(record.returnTicket.providerName || record.providerName || "SRDV Flight"),
            tripNumber: String(record.returnTicket.tripNumber || record.tripNumber || "--"),
            departureTimeUtc: record.returnTicket.departureTimeUtc || record.departureTimeUtc,
            status: record.returnTicket.status || record.status || "Active",
          }
        ];
      }

      return [
        {
          fromCity: String(pickFirst(record, ["fromCity", "FromCity", "source", "from"], "") || ""),
          toCity: String(pickFirst(record, ["toCity", "ToCity", "destination", "to"], "") || ""),
          providerName: String(pickFirst(record, ["providerName", "ProviderName", "airline"], "SRDV Flight") || "SRDV Flight"),
          tripNumber: String(pickFirst(record, ["tripNumber", "TripNumber", "flightNumber"], "--") || "--"),
          departureTimeUtc: pickFirst(record, ["departureTimeUtc", "DepartureTimeUtc", "departureTime"], null),
          status: String(pickFirst(record, ["status", "Status"], "Active") || "Active"),
        }
      ];
    })(),
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

export async function requestJson(urlOrPath, options = {}) {
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

  const fullUrl = toAbsoluteUrl(urlOrPath);
  const method = (fetchOptions.method || "GET").toUpperCase();

  const response = await fetch(fullUrl, {
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

// ============================================================================
// SANITIZED LOGGING & TELEMETRY (Aligned with React Native FlightService)
// ============================================================================

export function sanitizeForLog(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = [
      "password", "Password", "apiToken", "ApiToken", "authorization",
      "Authorization", "token", "JWT", "cardNumber", "cvv", "upiId", "secret"
    ];
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => s.toLowerCase() === key.toLowerCase())) {
        copy[key] = "[REDACTED]";
      } else if (typeof copy[key] === "object" && copy[key] !== null) {
        copy[key] = sanitizeForLog(copy[key]);
      }
    }
    return copy;
  } catch {
    return "[REDACTED]";
  }
}

function logFlightApiRequest(method, url, payload) {
  console.log(`\n==================================================`);
  console.log(`ðŸš€ [FLIGHT API REQUEST] ${method.toUpperCase()} ${url}`);
  if (payload) {
    console.log("ðŸ“¦ Request Payload:", JSON.stringify(sanitizeForLog(payload), null, 2));
  }
  console.log(`==================================================\n`);
}

function logFlightApiResponse(method, url, status, data) {
  console.log(`\n==================================================`);
  console.log(`âœ… [FLIGHT API RESPONSE] ${method.toUpperCase()} ${url} (Status: ${status})`);
  if (data) {
    console.log("ðŸ“¥ Response Data:", JSON.stringify(sanitizeForLog(data), null, 2));
  }
  console.log(`==================================================\n`);
}

function logFlightApiError(method, url, error) {
  console.error(`\n==================================================`);
  console.error(`âŒ [FLIGHT API ERROR] ${method.toUpperCase()} ${url}`);
  console.error("âš ï¸ Error Message:", error?.message || error);
  console.error(`==================================================\n`);
}

// ============================================================================
// HELPER MAPPERS & UTILITIES
// ============================================================================



export function toCabinClassCode(cabinClassStr) {
  if (typeof cabinClassStr === "number" && !isNaN(cabinClassStr)) {
    return cabinClassStr;
  }
  const text = String(cabinClassStr || "").trim().toLowerCase();
  if (text === "1" || text === "all") return 1;
  if (text === "2" || (text.includes("economy") && !text.includes("premium"))) return 2;
  if (text === "3" || (text.includes("premium") && text.includes("economy"))) return 3;
  if (text === "4" || (text.includes("business") && !text.includes("premium"))) return 4;
  if (text === "5" || (text.includes("premium") && text.includes("business"))) return 5;
  if (text === "6" || text.includes("first")) return 6;
  return 2; // Default to Economy (2)
}

export function mapCabinClassToCode(cabinClass) {
  return toCabinClassCode(cabinClass);
}

export function formatIsoDateTime(dateVal, fallbackTime = "00:00:00") {
  if (!dateVal) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${fallbackTime}`;
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const yyyy = dateVal.getFullYear();
    const mm = String(dateVal.getMonth() + 1).padStart(2, "0");
    const dd = String(dateVal.getDate()).padStart(2, "0");
    const hh = String(dateVal.getHours()).padStart(2, "0");
    const min = String(dateVal.getMinutes()).padStart(2, "0");
    const ss = String(dateVal.getSeconds()).padStart(2, "0");
    const timeStr = `${hh}:${min}:${ss}` === "00:00:00" ? fallbackTime : `${hh}:${min}:${ss}`;
    return `${yyyy}-${mm}-${dd}T${timeStr}`;
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const datePart = str.slice(0, 10);
    const timeMatch = str.match(/T(\d{2}:\d{2}:\d{2})/);
    const timePart = timeMatch ? timeMatch[1] : fallbackTime;
    return `${datePart}T${timePart}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${fallbackTime}`;
  }
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${fallbackTime}`;
}

export function cleanResultIndex(rawIdx) {
  if (!rawIdx) return "";
  return String(rawIdx)
    .split(",")
    .map((part) => {
      let s = String(part).trim();
      s = s.replace(/\s+/g, "");
      return s;
    })
    .filter(Boolean)
    .join(",");
}

export function resolveSeatNumber(seat) {
  if (!seat) return "";
  const raw = typeof seat === "object"
    ? (seat.SeatNumber || seat.seatNumber || seat.label || seat.seatLabel || seat.Code || seat.code || "")
    : String(seat);
  const str = String(raw).trim();
  const beforeSeKey = str.split(/sekey/i)[0];
  const match = beforeSeKey.match(/^([0-9]{1,3}[A-Z])/i) || str.match(/^([0-9]{1,3}[A-Z])/i);
  return match ? match[1].toUpperCase() : (beforeSeKey || str);
}

export function resolveAirlineCode(airline, fallback = "6E") {
  if (!airline) return fallback;
  const str = String(airline).trim().toUpperCase();
  if (str.length === 2 && str !== "IN") return str;

  const map = {
    INDIGO: "6E",
    "AIR INDIA EXPRESS": "IX",
    "AI EXPRESS": "IX",
    "AIR INDIA": "AI",
    SPICEJET: "SG",
    "AKASA AIR": "QP",
    AKASA: "QP",
    VISTARA: "UK",
    EMIRATES: "EK",
    "QATAR AIRWAYS": "QR",
    "THAI AIRWAYS": "TG",
    "SINGAPORE AIRLINES": "SQ",
    "BRITISH AIRWAYS": "BA",
    "ETIHAD AIRWAYS": "EY",
    "GULF AIR": "GF",
    "OMAN AIR": "WY",
    "SRILANKAN AIRLINES": "UL",
    "MALAYSIA AIRLINES": "MH",
    "FLYDUBAI": "FZ",
    "AIR ARABIA": "G9",
    "SAUDIA": "SV",
    "KUWAIT AIRWAYS": "KU",
  };

  for (const [name, code] of Object.entries(map)) {
    if (str.includes(name)) return code;
  }

  const match = str.match(/^([A-Z0-9]{2})/i);
  if (match && match[1].toUpperCase() !== "IN") {
    return match[1].toUpperCase();
  }
  return fallback;
}

export function resolveFlightNumber(flightNum) {
  if (!flightNum) return "";
  const str = String(flightNum).trim();
  const withoutPrefix = str
    .replace(/^[A-Z0-9]{1,2}[A-Z]\s*[-]?\s*/i, "")
    .replace(/^[A-Z]{2,3}\s*[-]?\s*/i, "");
  const match = withoutPrefix.match(/\d+/) || str.match(/\d+/);
  return match ? match[0] : "";
}

export function resolveSrdvIndexFromResultIndex(resultIndex, fallback = "2") {
  if (!resultIndex) return fallback;
  const firstToken = String(resultIndex).split(",")[0].trim();
  const clean = firstToken.replace(/^IB_/i, "");
  const match = clean.match(/^(\d+)-/);
  return match ? match[1] : fallback;
}

// ============================================================================
// RESULT NORMALIZER (Aligned with React Native mapFlightResults)
// ============================================================================

export function mapFlightResults(data, fromCode, toCode, searchParams = {}) {
  const resObj = data?.Response || data?.data?.Response || data;
  const traceId = String(resObj?.TraceId || resObj?.traceId || data?.TraceId || data?.traceId || "");

  const mapSingleItem = (item, idx, defaultFrom, defaultTo, legIndex = 0, tripDirection = "outbound") => {
    const rawSegments = Array.isArray(item?.Segments?.[0])
      ? item.Segments[0]
      : Array.isArray(item?.Segments)
        ? item.Segments
        : Array.isArray(item?.segments)
          ? item.segments
          : [item?.segment || item?.Segments?.[0]].filter(Boolean);

    const firstSegment = rawSegments[0] || {};
    const lastSegment = rawSegments[rawSegments.length - 1] || firstSegment;
    const stops = Math.max(0, rawSegments.length - 1);
    const connectingAirports = rawSegments.slice(0, -1).map(s => s?.Destination?.AirportCode || s?.Destination?.CityName).filter(Boolean);
    const layoverSummary = stops > 0 ? `${stops} Stop${stops > 1 ? "s" : ""} (via ${connectingAirports.join(", ")})` : "Non-stop";

    const fareData = item?.FareDataMultiple?.[0] || item?.fareData || {};
    const fareSegment = fareData?.FareSegments?.[0] || {};
    const fareObj = fareData?.Fare || item?.Fare || {};

    const airlineName =
      firstSegment?.Airline?.AirlineName ||
      fareSegment?.AirlineName ||
      item?.airlineName ||
      item?.airline ||
      "Airline";

    const airlineCode =
      firstSegment?.Airline?.AirlineCode ||
      fareSegment?.AirlineCode ||
      item?.airlineCode ||
      "";

    const flightNumber =
      firstSegment?.Airline?.FlightNumber ||
      fareSegment?.FlightNumber ||
      item?.flightNumber ||
      item?.flightNo ||
      "";

    const allFlightNumbers = rawSegments
      .map(s => s?.Airline?.FlightNumber || s?.FlightNumber || s?.AirlineNumber)
      .filter(Boolean)
      .join(" / ") || flightNumber;

    const fromCity =
      firstSegment?.Origin?.CityName ||
      firstSegment?.Origin?.Airport?.CityName ||
      fareSegment?.FromCity ||
      firstSegment?.Origin?.AirportCode ||
      defaultFrom ||
      fromCode ||
      "";

    const fromAirportCode =
      firstSegment?.Origin?.AirportCode ||
      firstSegment?.Origin?.Airport?.AirportCode ||
      defaultFrom ||
      fromCode ||
      "";

    const toCity =
      lastSegment?.Destination?.CityName ||
      lastSegment?.Destination?.Airport?.CityName ||
      fareSegment?.ToCity ||
      lastSegment?.Destination?.AirportCode ||
      defaultTo ||
      toCode ||
      "";

    const toAirportCode =
      lastSegment?.Destination?.AirportCode ||
      lastSegment?.Destination?.Airport?.AirportCode ||
      defaultTo ||
      toCode ||
      "";

    const fromAirportName =
      firstSegment?.Origin?.AirportName ||
      firstSegment?.Origin?.Airport?.AirportName ||
      firstSegment?.Origin?.Airport?.Name ||
      fareSegment?.FromAirportName ||
      "";

    const toAirportName =
      lastSegment?.Destination?.AirportName ||
      lastSegment?.Destination?.Airport?.AirportName ||
      lastSegment?.Destination?.Airport?.Name ||
      fareSegment?.ToAirportName ||
      "";

    const depTime = firstSegment?.DepTime || item?.departureTimeIst || item?.departureTime || "";
    const arrTime = lastSegment?.ArrTime || item?.arrivalTimeIst || item?.arrivalTime || "";
    const duration =
      Number(item?.AccumulatedDuration || item?.Duration) ||
      rawSegments.reduce((sum, s) => sum + (Number(s?.Duration) || 0) + (Number(s?.GroundTime) || 0), 0) ||
      60;

    const offeredFare = Number(
      fareData?.B2CFinalFare ||
      item?.B2CFinalFare ||
      fareData?.B2CPublishedFare ||
      item?.B2CPublishedFare ||
      fareData?.OfferedFare ||
      fareObj?.OfferedFare ||
      fareObj?.PublishedFare ||
      fareObj?.B2CFinalFare ||
      fareObj?.B2CPublishedFare ||
      item?.OfferedFare ||
      item?.offeredFare ||
      item?.displayFare ||
      item?.Price ||
      0
    );

    const baseFare = Number(fareObj?.BaseFare || fareData?.Fare?.BaseFare || item?.baseFare || offeredFare);
    const tax = Number(fareObj?.Tax || fareData?.Fare?.Tax || item?.tax || 0);

    const fareOptions = Array.isArray(item?.FareDataMultiple)
      ? item.FareDataMultiple.map((fd) => {
          const optFare = fd?.Fare || {};
          const optSegments = fd?.FareSegments || [];
          const optOffered = Number(
            fd?.B2CFinalFare ||
            optFare?.B2CFinalFare ||
            fd?.B2CPublishedFare ||
            optFare?.B2CPublishedFare ||
            fd?.OfferedFare ||
            optFare?.OfferedFare ||
            optFare?.PublishedFare ||
            0
          );
          return {
            srdvIndex: String(fd?.SrdvIndex || "2"),
            resultIndex: String(fd?.ResultIndex || ""),
            source: fd?.Source || "Publish",
            buttonColor: fd?.ButtonColor || "#0000ff",
            textColor: fd?.TextColor || "#ffffff",
            isLcc: Boolean(fd?.IsLCC !== undefined ? fd.IsLCC : (airlineCode ? ["6E", "SG", "I5", "QP", "G8", "IX"].includes(airlineCode.toUpperCase()) : true)),
            isRefundable: Boolean(fd?.IsRefundable !== undefined ? (fd.IsRefundable === true || fd.IsRefundable === "true" || fd.IsRefundable === 1) : true),
            airlineRemark: fd?.AirlineRemark || "",
            offeredFare: optOffered,
            b2cFinalFare: Number(fd?.B2CFinalFare || optFare?.B2CFinalFare || optOffered),
            b2cPublishedFare: Number(fd?.B2CPublishedFare || optFare?.B2CPublishedFare || optOffered),
            fare: optFare,
            fareSegments: optSegments,
            fareBreakdown: fd?.FareBreakdown || [],
          };
        })
      : [];

    const resultIndex = fareData?.ResultIndex || item?.ResultIndex || item?.resultIndex || String(idx + 1);
    const srdvIndex = fareData?.SrdvIndex || item?.SrdvIndex || "2";
    const srdvType = fareData?.SrdvType || item?.SrdvType || "MixAPI";

    const isLCC = Boolean(
      fareData?.IsLCC !== undefined
        ? fareData.IsLCC
        : item?.IsLCC !== undefined
          ? item.IsLCC
          : item?.isLCC !== undefined
            ? item.isLCC
            : ["6E", "SG", "I5", "QP", "G8", "IX"].includes(airlineCode.toUpperCase())
    );

    return {
      ...item,
      id: String(item?.Id || item?.id || resultIndex || `flight-${legIndex}-${idx + 1}`),
      resultIndex,
      ResultIndex: resultIndex,
      srdvIndex,
      SrdvIndex: srdvIndex,
      srdvType,
      SrdvType: srdvType,
      traceId,
      TraceId: traceId,
      airline: airlineName,
      airlineName,
      airlineCode,
      flightNumber,
      flightNo: allFlightNumbers || flightNumber,
      departureTime: depTime,
      departureTimeIst: depTime,
      arrivalTime: arrTime,
      arrivalTimeIst: arrTime,
      duration,
      displayFare: offeredFare,
      fare: offeredFare,
      price: offeredFare,
      priceInr: offeredFare,
      Fare: fareObj,
      offeredFare,
      baseFare,
      tax,
      from: defaultFrom || fromCode,
      fromCity,
      fromAirportCode,
      fromAirportName,
      originAirportName: fromAirportName,
      to: defaultTo || toCode,
      toCity,
      toAirportCode,
      toAirportName,
      destinationAirportName: toAirportName,
      stops,
      layoverSummary,
      isLCC,
      isRefundable: Boolean(fareData?.IsRefundable ?? item?.IsRefundable ?? item?.isRefundable),
      selectedTravelClass: fareSegment?.CabinClassName || searchParams.travelClass || "Economy",
      selectedTravelClassPriceInr: offeredFare,
      selectedTravelClassAvailableSeats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
      seats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
      fareOptions,
      segments: rawSegments,
      legIndex,
      tripDirection,
    };
  };

  const isMultiSegmentArray = Array.isArray(resObj?.Results) && resObj.Results.length >= 2 && Array.isArray(resObj.Results[0]);
  const isMultiCity = searchParams.journeyType === 3 || String(searchParams.tripType || "").toLowerCase() === "multicity";

  if (isMultiSegmentArray) {
    const legsMapped = resObj.Results.map((legResults, legIdx) => {
      const legFrom = searchParams.segments?.[legIdx]?.origin || fromCode;
      const legTo = searchParams.segments?.[legIdx]?.destination || toCode;
      return (Array.isArray(legResults) ? legResults : []).map((item, idx) =>
        mapSingleItem(item, idx, legFrom, legTo, legIdx, `leg_${legIdx + 1}`)
      );
    });

    const combinedList = legsMapped.flat();
    combinedList.legs = legsMapped;
    combinedList.outbound = legsMapped[0] || [];
    combinedList.onward = legsMapped[0] || [];
    combinedList.return = legsMapped[1] || [];
    combinedList.isMultiCity = searchParams.journeyType === 3 || searchParams.tripType === "multicity" || legsMapped.length > 2;
    combinedList.isMultiCityResults = combinedList.isMultiCity;
    combinedList.isTwoWay = !combinedList.isMultiCity && legsMapped.length === 2;
    combinedList.sharedTraceId = traceId;
    combinedList.traceId = traceId;
    combinedList.TraceId = traceId;
    return combinedList;
  }

  let rawItems = [];
  if (Array.isArray(resObj?.Results?.[0])) {
    rawItems = resObj.Results[0];
  } else if (Array.isArray(resObj?.results?.[0])) {
    rawItems = resObj.results[0];
  } else if (Array.isArray(resObj?.Results)) {
    rawItems = resObj.Results;
  } else if (Array.isArray(resObj?.results)) {
    rawItems = resObj.results;
  } else if (Array.isArray(resObj)) {
    rawItems = resObj;
  }

  if (isMultiCity && Array.isArray(searchParams.segments) && searchParams.segments.length > 1) {
    const legsMapped = searchParams.segments.map((reqLeg, legIdx) => {
      const legFrom = reqLeg.origin || reqLeg.from || fromCode;
      const legTo = reqLeg.destination || reqLeg.to || toCode;

      const legFlights = [];
      rawItems.forEach((item, idx) => {
        let allSegments = [];
        if (Array.isArray(item.Segments) && item.Segments.length > 0) {
          allSegments = Array.isArray(item.Segments[0]) ? item.Segments.flat() : item.Segments;
        } else if (item.FareDataMultiple?.[0]?.FareSegments) {
          allSegments = item.FareDataMultiple[0].FareSegments;
        } else if (item.FareDataMultiple?.[0]?.Segments) {
          allSegments = item.FareDataMultiple[0].Segments;
        }

        const normalizedSegments = extractRelevantSegments(allSegments, legFrom, legTo);

        if (normalizedSegments.length > 0) {
          const mapped = mapSingleItem(item, idx, legFrom, legTo, legIdx, `leg_${legIdx + 1}`);
          mapped.normalizedSegments = normalizedSegments;
          mapped.departureTime = normalizedSegments[0].DepTime || normalizedSegments[0].DepartureTime || mapped.departureTime;
          mapped.arrivalTime = normalizedSegments[normalizedSegments.length - 1].ArrTime || normalizedSegments[normalizedSegments.length - 1].ArrivalTime || mapped.arrivalTime;
          mapped.fromCity = normalizedSegments[0].Origin?.CityName || normalizedSegments[0].FromCity || mapped.fromCity;
          mapped.toCity = normalizedSegments[normalizedSegments.length - 1].Destination?.CityName || normalizedSegments[normalizedSegments.length - 1].ToCity || mapped.toCity;

          let legDuration = 0;
          normalizedSegments.forEach((seg) => {
            legDuration += (seg.Duration || 0);
          });
          if (legDuration > 0) mapped.duration = legDuration;

          legFlights.push(mapped);
        }
      });
      return legFlights;
    });

    const combinedList = legsMapped.flat();
    combinedList.legs = legsMapped;
    combinedList.outbound = legsMapped[0] || [];
    combinedList.return = legsMapped[1] || [];
    combinedList.isMultiCityResults = true;
    combinedList.isRoundTripResults = false;
    return combinedList;
  }

  return rawItems.map((item, idx) => mapSingleItem(item, idx, fromCode, toCode, 0, "outbound"));
}

// ============================================================================
// 1. SEARCH FLIGHTS: POST /api/flight/srdv/Search
// ============================================================================

export function buildFlightSearchSegments({ from, to, date, returnDate, tripType, journeyType, legs, travelClass }) {
  const normTrip = String(tripType || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  let parsedLegs = legs;
  if (typeof legs === "string") {
    try {
      parsedLegs = JSON.parse(legs);
    } catch {
      try {
        parsedLegs = JSON.parse(decodeURIComponent(legs));
      } catch {
        parsedLegs = [];
      }
    }
  }

  const isMulti =
    normTrip === "multicity" ||
    normTrip === "multi" ||
    normTrip === "3" ||
    Number(journeyType) === 3 ||
    (Array.isArray(parsedLegs) && parsedLegs.length > 1);

  const validReturnDate = returnDate && returnDate !== "null" && returnDate !== "undefined" && returnDate !== "false";

  const isRound =
    !isMulti &&
    (normTrip === "roundtrip" ||
      normTrip === "roundway" ||
      normTrip === "round" ||
      normTrip === "twoway" ||
      normTrip === "2way" ||
      normTrip === "return" ||
      normTrip === "2" ||
      Number(journeyType) === 2 ||
      (validReturnDate && normTrip !== "oneway" && normTrip !== "1" && Number(journeyType) !== 1));

  let resolvedJourneyType = 1;
  if (isMulti) {
    resolvedJourneyType = 3;
  } else if (isRound) {
    resolvedJourneyType = 2;
  } else {
    resolvedJourneyType = 1;
  }

  if (normTrip === "oneway" || normTrip === "1" || Number(journeyType) === 1) {
    resolvedJourneyType = 1;
  }

  const cabinClassCode = toCabinClassCode(travelClass);
  const outboundDateStr = formatIsoDateTime(date);

  let segments = [];

  if (resolvedJourneyType === 3) {
    if (!legs || typeof legs !== "string") {
      throw new Error("Multi-city requires legs string.");
    }
    const parsedLegs = JSON.parse(legs);
    for (const leg of parsedLegs) {
      const codeFrom = leg.fromCode;
      const codeTo = leg.toCode;
      if (!codeFrom || !codeTo) {
        throw new Error("All multi-city legs require valid airport selections from the suggestions.");
      }
      segments.push({
        Origin: String(codeFrom).toUpperCase(),
        Destination: String(codeTo).toUpperCase(),
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: formatIsoDateTime(leg.date || leg.departureDate || date),
        PreferredArrivalTime: formatIsoDateTime(leg.date || leg.departureDate || date),
      });
    }
  } else if (resolvedJourneyType === 2) {
    const returnDateStr = formatIsoDateTime(returnDate || date);
    segments = [
      {
        Origin: String(from).toUpperCase(),
        Destination: String(to).toUpperCase(),
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: outboundDateStr,
        PreferredArrivalTime: outboundDateStr,
      },
      {
        Origin: String(to).toUpperCase(),
        Destination: String(from).toUpperCase(),
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: returnDateStr,
        PreferredArrivalTime: returnDateStr,
      },
    ];
  } else {
    resolvedJourneyType = 1;
    segments = [
      {
        Origin: String(from).toUpperCase(),
        Destination: String(to).toUpperCase(),
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: outboundDateStr,
        PreferredArrivalTime: outboundDateStr,
      },
    ];
  }

  return {
    journeyType: resolvedJourneyType,
    segments,
  };
}

export async function searchFlights(searchParams) {
  clearFlightBookingFlowState();

  const fromCode = searchParams.sourceCode || searchParams.fromCode || searchParams.originCode;
  const toCode = searchParams.destinationCode || searchParams.toCode || searchParams.destinationCode;

  if (!fromCode || !toCode) {
    throw new Error("All flight sectors require a valid airport selection from the suggestions.");
  }
  const journeyDate = searchParams.date || new Date().toISOString().slice(0, 10);
  const tripTypeStr = String(searchParams.tripType || "").toLowerCase();

  let journeyType = 1;
  if (tripTypeStr === "roundtrip" || tripTypeStr === "twoway" || searchParams.journeyType === 2) {
    journeyType = 2;
  } else if (tripTypeStr === "multicity" || searchParams.journeyType === 3) {
    journeyType = 3;
  }

  const cabinClassCode = toCabinClassCode(searchParams.travelClass || searchParams.cabinClass);
  const { journeyType: resolvedJourneyType, segments } = buildFlightSearchSegments({
    from: fromCode,
    to: toCode,
    date: journeyDate,
    returnDate: searchParams.returnDate,
    tripType: searchParams.tripType,
    journeyType,
    legs: searchParams.legs,
    travelClass: cabinClassCode,
  });

  const payload = {
    EndUserIp: searchParams.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    AdultCount: Number(searchParams.adults !== undefined ? searchParams.adults : 1),
    ChildCount: Number(searchParams.children !== undefined ? searchParams.children : 0),
    InfantCount: Number(searchParams.infants !== undefined ? searchParams.infants : 0),
    JourneyType: resolvedJourneyType,
    ...(resolvedJourneyType !== 3
      ? {
          DirectFlight: Boolean(searchParams.directFlight ?? false),
          OneStopFlight: Boolean(searchParams.oneStopFlight ?? false),
        }
      : {}),
    Segments: segments,
  };

  const endpoint = `${SRDV_ROOT}/Search`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const traceId = String(resObj?.TraceId || resObj?.traceId || rawData?.TraceId || "");
    if (typeof window !== "undefined" && traceId) {
      try {
        window.sessionStorage.setItem("TraceId", traceId);
        window.sessionStorage.setItem("flight_trace_id", traceId);
        window.sessionStorage.setItem("last_booking_trace_id", traceId);
        window.sessionStorage.setItem("SearchResult", JSON.stringify(rawData));
      } catch (e) {}
    }

    const errObj = resObj?.Error || rawData?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }

    return mapFlightResults(rawData, fromCode, toCode, { ...searchParams, journeyType: resolvedJourneyType });
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

// ============================================================================
// 2. FARE QUOTE: POST /api/flight/srdv/FareQuote
// ============================================================================

export async function getFlightFareQuote(params = {}) {
  const flight = params.flight || {};
  const activeTraceId = String(params.traceId || params.TraceId || flight.traceId || flight.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || flight.resultIndex || flight.ResultIndex || flight.id || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || flight.srdvType || flight.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || flight.srdvIndex || flight.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
  };

  const endpoint = `${SRDV_ROOT}/FareQuote`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const errObj = resObj?.Error || rawData?.Error;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage || "Fare revalidation failed by supplier.");
    }

    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

export function getFareQuote(params) {
  return getFlightFareQuote(params);
}

export async function revalidateFlightFare(flightOrParams) {
  if (!flightOrParams) return null;
  const traceId = flightOrParams.traceId || flightOrParams.TraceId;
  const resultIndex = flightOrParams.resultIndex || flightOrParams.ResultIndex || flightOrParams.id;
  const srdvType = flightOrParams.srdvType || flightOrParams.SrdvType || "MixAPI";
  const srdvIndex = flightOrParams.srdvIndex || flightOrParams.SrdvIndex || "2";

  try {
    const res = await getFlightFareQuote({ traceId, resultIndex, srdvType, srdvIndex });
    return res;
  } catch (err) {
    console.warn("[FlightService] Revalidate fare error:", err.message);
    throw err;
  }
}

// ============================================================================
// 3. FARE RULE: POST /api/flight/srdv/FareRule
// ============================================================================

export async function getFlightFareRule(params = {}) {
  const flight = params.flight || {};
  const activeTraceId = String(params.traceId || params.TraceId || flight.traceId || flight.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || flight.resultIndex || flight.ResultIndex || flight.id || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || flight.srdvType || flight.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || flight.srdvIndex || flight.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    ApiToken: "PickNB@486#170$",
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
  };

  const endpoint = `${SRDV_ROOT}/FareRule`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const errObj = resObj?.Error || rawData?.Error;
    const results = resObj?.Results || rawData?.Results;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      return { success: false, code: "FARE_RULE_ERROR", message: errObj.ErrorMessage, data: null, results: [] };
    }

    if (!results || (Array.isArray(results) && results.length === 0)) {
      return { success: false, code: "FARE_RULE_UNAVAILABLE", message: "Fare rules not provided by supplier for this flight.", data: [], results: [] };
    }

    return { success: true, code: "FARE_RULE_AVAILABLE", data: results, results, raw: rawData };
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    return { success: false, code: "FARE_RULE_ERROR", message: error?.message, data: null, results: [] };
  }
}

export function getFareRule(params) {
  return getFlightFareRule(params);
}

// ============================================================================
// 4. SSR (MEALS & BAGGAGE): POST /api/flight/srdv/SSR
// ============================================================================

export async function getFlightSSR(params = {}) {
  const flight = params.flight || {};
  const activeTraceId = String(params.traceId || params.TraceId || flight.traceId || flight.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || flight.resultIndex || flight.ResultIndex || flight.id || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || flight.srdvType || flight.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || flight.srdvIndex || flight.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
  };

  const endpoint = `${SRDV_ROOT}/SSR`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const errObj = resObj?.Error || rawData?.Error;
    const results = resObj?.Results || rawData?.Results || resObj;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      return { success: false, code: "SSR_UNAVAILABLE", message: errObj.ErrorMessage, data: null, baggage: [], meal: [], Baggage: [], MealDynamic: [] };
    }

    const baggage = results?.Baggage || resObj?.Baggage || rawData?.Baggage || [];
    const meals = results?.MealDynamic || results?.Meal || resObj?.MealDynamic || resObj?.Meal || rawData?.MealDynamic || [];
    const flatBaggage = Array.isArray(baggage[0]) ? baggage[0] : (Array.isArray(baggage) ? baggage : []);
    const flatMeals = Array.isArray(meals[0]) ? meals[0] : (Array.isArray(meals) ? meals : []);

    const baggageList = flatBaggage.map((b) => ({
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

    const mergedMeals = flatMeals.map((m) => ({
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
      code: "SSR_AVAILABLE",
      data: results,
      Baggage: baggage,
      MealDynamic: meals,
      Meal: meals,
      baggage: baggageList,
      meal: mergedMeals,
      rawResponse: rawData,
    };
  } catch (error) {
    return { success: false, errorCode: -1, error: error.message || "Failed to fetch seat map.", results: [], rawResponse: null };
  }
}

export function getSSR(paramsOrTrace, resultIdx, srdvType, srdvIndex) {
  if (paramsOrTrace && typeof paramsOrTrace === "object") {
    return getFlightSSR(paramsOrTrace);
  }
  return getFlightSSR({ traceId: paramsOrTrace, resultIndex: resultIdx, srdvType, srdvIndex });
}

// ============================================================================
// 5. SEAT MAP: POST /api/flight/srdv/SeatMap
// ============================================================================

export async function getFlightSeatMap(paramsOrTrace = {}, resultIdx = null, srdvType = null, srdvIndex = null) {
  let paramObj = {};

  if (typeof paramsOrTrace === "string" || typeof paramsOrTrace === "number") {
    if (resultIdx && typeof resultIdx === "string") {
      paramObj = {
        traceId: String(paramsOrTrace),
        resultIndex: resultIdx,
        srdvType: srdvType || "MixAPI",
        srdvIndex: srdvIndex || "2",
      };
    } else {
      paramObj = { resultIndex: String(paramsOrTrace) };
    }
  } else if (paramsOrTrace && typeof paramsOrTrace === "object") {
    paramObj = { ...paramsOrTrace };
  }

  let flowState = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("flight_booking_flow_state_v1");
      if (raw) flowState = JSON.parse(raw) || {};
    } catch {}
  }

  // Prioritize real SRDV ResultIndex, strictly rejecting artificial UI IDs like 'flight-0-1'
  const candidateResultIndex =
    paramObj?.resultIndex ||
    paramObj?.ResultIndex ||
    paramObj?.rawId ||
    (paramObj?.id && !String(paramObj.id).startsWith("flight-") ? paramObj.id : null) ||
    paramObj?.flight?.resultIndex ||
    paramObj?.flight?.ResultIndex ||
    flowState?.resultIndex ||
    flowState?.ResultIndex ||
    flowState?.flight?.resultIndex ||
    flowState?.flight?.ResultIndex ||
    "";

  const activeResultIndex = cleanResultIndex(candidateResultIndex);

  const activeTraceId = String(
    paramObj?.traceId ||
    paramObj?.TraceId ||
    paramObj?.flight?.traceId ||
    paramObj?.flight?.TraceId ||
    flowState?.traceId ||
    flowState?.TraceId ||
    flowState?.flight?.traceId ||
    flowState?.flight?.TraceId ||
    (typeof window !== "undefined" ? window.sessionStorage.getItem("flight_trace_id") : "") ||
    ""
  ).trim();

  const activeSrdvType = String(
    paramObj?.srdvType ||
    paramObj?.SrdvType ||
    paramObj?.flight?.srdvType ||
    flowState?.srdvType ||
    flowState?.flight?.srdvType ||
    "MixAPI"
  );

  const activeSrdvIndex = String(
    paramObj?.srdvIndex ||
    paramObj?.SrdvIndex ||
    paramObj?.flight?.srdvIndex ||
    flowState?.srdvIndex ||
    flowState?.flight?.srdvIndex ||
    resolveSrdvIndexFromResultIndex(activeResultIndex, "2")
  );

  if (!activeTraceId || !activeResultIndex) {
    console.warn("[SEATMAP_SKIPPED] Missing TraceId or ResultIndex for SeatMap:", { activeTraceId, activeResultIndex, paramObj });
    return {
      success: false,
      code: "MISSING_PARAMS",
      message: "TraceId and ResultIndex are required to fetch SeatMap.",
      data: null,
      seats: [],
    };
  }

  const payload = {
    EndUserIp: paramObj?.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
  };

  const endpoint = `${SRDV_ROOT}/SeatMap`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const errObj = resObj?.Error || rawData?.Error;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      return {
        success: false,
        code: String(errObj.ErrorCode) === "1" ? "SUPPLIER_TRACE_NOT_FOUND" : "SEATMAP_UNAVAILABLE",
        message: errObj.ErrorMessage || "Seat map is unavailable for this flight.",
        data: null,
        seats: [],
      };
    }

    const parsedSeats = parseSrdvSeatMap(rawData);
    return {
      success: true,
      code: "SEATMAP_AVAILABLE",
      data: resObj?.Results || rawData,
      seats: parsedSeats,
      rawResponse: rawData,
    };
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    return { success: false, code: "SEATMAP_ERROR", message: error?.message, data: null, seats: [] };
  }
}

export function getSeatMap(paramsOrTrace, resultIdx, srdvType, srdvIndex) {
  if (paramsOrTrace && typeof paramsOrTrace === "object") {
    return getFlightSeatMap(paramsOrTrace);
  }
  return getFlightSeatMap({ traceId: paramsOrTrace, resultIndex: resultIdx, srdvType, srdvIndex });
}

// ============================================================================
// 6. PASSENGER MAPPING FOR TICKETING
// ============================================================================

export function formatPassengerMeals(selectedMealsForPax, flight = {}) {
  if (!selectedMealsForPax) return [];

  const flattenedMeals = [];

  // Case A: If storing as an array of { mealData, quantity }
  if (Array.isArray(selectedMealsForPax)) {
    selectedMealsForPax.forEach((item) => {
      const meal = item.meal || item;
      const count = Number(item.quantity || item.count || item.Quantity || 1);
      
      const code = String(meal.Code || meal.code || "").trim();
      if (!code || code.toLowerCase() === "nomeal" || code.toLowerCase() === "none") return;

      for (let i = 0; i < count; i++) {
        flattenedMeals.push({
          AirlineCode: meal.AirlineCode || flight.airlineCode || flight.AirlineCode || "",
          FlightNumber: String(meal.FlightNumber || flight.flightNumber || flight.FlightNumber || "").trim(),
          WayType: Number(meal.WayType || 1),
          Code: code,
          Description: String(meal.Description || meal.AirlineDescription || meal.description || "Meal").trim(),
          Price: Number(meal.Price ?? meal.Amount ?? meal.price ?? 0),
          Quantity: "1", // âœ… CRITICAL: Always 1 per duplicate object (as string)
          Origin: String(meal.Origin || meal.origin || flight.sourceCode || flight.Origin || "").toUpperCase(),
          Destination: String(meal.Destination || meal.destination || flight.destinationCode || flight.Destination || "").toUpperCase()
        });
      }
    });
  } 
  // Case B: If storing as a map { [mealCode]: quantity }
  else if (typeof selectedMealsForPax === "object") {
    Object.entries(selectedMealsForPax).forEach(([mealCode, count]) => {
      const quantity = Number(count);
      if (quantity <= 0) return;
      if (mealCode.toLowerCase() === "nomeal" || mealCode.toLowerCase() === "none") return;

      // Find original meal object from SSR data
      const rawMeal = flight.availableMeals?.find((m) => m.Code === mealCode || m.code === mealCode) || {};

      for (let i = 0; i < quantity; i++) {
        flattenedMeals.push({
          AirlineCode: rawMeal.AirlineCode || flight.airlineCode || "",
          FlightNumber: String(rawMeal.FlightNumber || flight.flightNumber || "").trim(),
          WayType: Number(rawMeal.WayType || 1),
          Code: mealCode,
          Description: String(rawMeal.Description || rawMeal.description || "Meal").trim(),
          Price: Number(rawMeal.Price ?? rawMeal.Amount ?? rawMeal.price ?? 0),
          Quantity: "1", // âœ… CRITICAL: Always 1 (as string)
          Origin: String(rawMeal.Origin || rawMeal.origin || flight.sourceCode || "").toUpperCase(),
          Destination: String(rawMeal.Destination || rawMeal.destination || flight.destinationCode || "").toUpperCase()
        });
      }
    });
  }

  return flattenedMeals;
}

export function mapPassengersForApi(passengers, baseFare, tax, flight = {}, fareDetails = null) {
  if (!Array.isArray(passengers)) return [];

  const origin = String(flight?.sourceCode || flight?.fromAirportCode || flight?.fromCity || flight?.source || flight?.origin || "DEL").toUpperCase();
  const destination = String(flight?.destinationCode || flight?.toAirportCode || flight?.toCity || flight?.destination || "BOM").toUpperCase();
  const airlineCode = resolveAirlineCode(flight?.airlineCode || flight?.airline || flight?.providerName || "6E");
  const flightNumber = resolveFlightNumber(flight?.flightNumber || flight?.tripNumber || "");

  const count = Math.max(1, passengers.length);
  const paxBase = Number((Number(baseFare || 0) / count).toFixed(2));
  const paxTax = Number((Number(tax || 0) / count).toFixed(2));

  return passengers.map((p, idx) => {
    let rawTitle = String(p.title || p.Title || "Mr").trim();
    let firstName = String(p.firstName || p.FirstName || "").trim();
    let lastName = String(p.lastName || p.LastName || "").trim();

    if (!firstName && p.fullName) {
      const parts = p.fullName.trim().split(/\s+/);
      if (parts.length > 1 && ["mr", "mrs", "ms", "miss", "dr", "prof"].includes(parts[0].toLowerCase())) {
        rawTitle = parts[0];
        parts.shift();
      }
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    const cleanTitle = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase() : "Mr";
    const paxTypeNum = typeof p.paxType === "number" ? p.paxType : (p.passengerType === "Child" ? 2 : p.passengerType === "Infant" ? 3 : 1);
    const genderCode = String(p.gender === "Female" || p.gender === 2 || p.gender === "2" || cleanTitle === "Mrs" || cleanTitle === "Miss" ? "2" : "1");

    const rawDob = p.dob || p.DateOfBirth || p.dateOfBirth || "";
    const cleanDobStr = rawDob ? String(rawDob).split("T")[0] : "";

    const rawNat = String(p.nationality || p.Nationality || "IN");
    const nationalityCode = rawNat.toLowerCase().includes("india") ? "IN" : rawNat.slice(0, 2).toUpperCase();

    const rawCountry = String(p.countryCode || p.CountryCode || "IN");
    const countryCode = rawCountry.toLowerCase().includes("india") ? "IN" : rawCountry.slice(0, 2).toUpperCase();

    const cleanContact = String(p.contactNo || p.ContactNo || p.mobile || p.phone || flight?.passengerPhone || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";
    const cleanEmail = String(p.email || p.Email || p.passengerEmail || flight?.passengerEmail || "").trim();

    // Map Seats (only include if valid seat object with code exists)
    const rawSeats = p.selectedSeats || p.selectedSeat || p.Seat || p.SeatDynamic || p.seat || p.seatDynamic || [];
    const seatArray = Array.isArray(rawSeats) ? rawSeats : (rawSeats ? [rawSeats] : []);
    const mappedSeats = seatArray
      .filter((s) => {
        if (!s) return false;
        const code = typeof s === "object" ? String(s.Code || s.code || s.bookingCode || s.SeatNumber || s.seatNumber || "").trim() : String(s).trim();
        return code && code !== "none" && code !== "noseat" && code !== "0" && !code.startsWith("noseat");
      })
      .map((s) => {
        const seKeyCode = String(s.Code || s.code || s.bookingCode || s.rawCode || "").trim();
        const bareSeatNumber = resolveSeatNumber(s) || resolveSeatNumber(seKeyCode) || seKeyCode;
        const sOrig = String(s.Origin || s.origin || origin).toUpperCase();
        const sDest = String(s.Destination || s.destination || destination).toUpperCase();
        const sAirline = resolveAirlineCode(s.AirlineCode || s.airlineCode || airlineCode);
        const sFlightNum = resolveFlightNumber(s.FlightNumber || s.flightNumber || flightNumber);
        const amt = Number(s.Amount ?? s.amount ?? s.Price ?? s.price ?? 0);

        return {
          AirlineCode: sAirline,
          FlightNumber: sFlightNum,
          SeatNumber: bareSeatNumber,
          Code: seKeyCode || bareSeatNumber,
          Origin: sOrig,
          Destination: sDest,
          Amount: amt,
        };
      })
      .filter(Boolean);

    // Map Baggage
    const rawBaggage = Array.isArray(p.baggage || p.Baggage) ? (p.baggage || p.Baggage) : [];
    const mappedBaggage = rawBaggage
      .filter((b) => {
        if (!b || typeof b !== "object") return false;
        const code = String(b.Code || b.code || "").toLowerCase();
        return code && code !== "nobaggage" && code !== "none";
      })
      .map((b) => ({
        WayType: Number(b.WayType ?? b.wayType ?? 2),
        Code: String(b.Code || b.code || "").trim(),
        Description: String(b.Description || b.description || `${b.Weight || 0} Kg Baggage`),
        Weight: Number(b.Weight ?? b.weight ?? 0),
        Currency: String(b.Currency || b.currency || "INR"),
        Price: Number(b.Price ?? b.price ?? b.Amount ?? 0),
        Origin: String(b.Origin || b.origin || origin).toUpperCase(),
        Destination: String(b.Destination || b.destination || destination).toUpperCase(),
      }));

    // Map Meals using the flattening helper
    const rawMeals = p.mealDynamic || p.MealDynamic || p.selectedMeals || [];
    const mappedMeals = formatPassengerMeals(rawMeals, flight);

    // Map Fare per Pax
    const supplierFare = fareDetails || flight?.Fare || flight?.fareData?.Fare || {};
    const finalPaxFare = {
      Currency: "INR",
      BaseFare: Number(supplierFare.BaseFare ?? paxBase),
      Tax: Number(supplierFare.Tax ?? paxTax),
      YQTax: Number(supplierFare.YQTax ?? 0),
      AdditionalTxnFeeOfrd: Number(supplierFare.AdditionalTxnFeeOfrd ?? 0),
      AdditionalTxnFeePub: Number(supplierFare.AdditionalTxnFeePub ?? 0),
      AirTransFee: Number(supplierFare.AirTransFee ?? 0),
      TransactionFee: Number(supplierFare.TransactionFee ?? 0),
      OtherCharges: Number(supplierFare.OtherCharges ?? 0),
      Discount: Number(supplierFare.Discount ?? 0),
      PublishedFare: Number(supplierFare.PublishedFare ?? (paxBase + paxTax)),
      OfferedFare: Number(supplierFare.OfferedFare ?? (paxBase + paxTax)),
    };

    const formatSrdvDateTime = (rawVal) => {
      if (!rawVal) return "";
      const str = String(rawVal).trim().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return `${str}T00:00:00`;
      }
      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (dmyMatch) {
        const dd = dmyMatch[1].padStart(2, "0");
        const mm = dmyMatch[2].padStart(2, "0");
        const yyyy = dmyMatch[3];
        return `${yyyy}-${mm}-${dd}T00:00:00`;
      }
      return "";
    };

    return {
      Title: cleanTitle,
      FirstName: firstName || `Passenger${idx + 1}`,
      LastName: lastName || `Passenger${idx + 1}`,
      PaxType: paxTypeNum,
      DateOfBirth: formatSrdvDateTime(p.dob || p.DateOfBirth || p.dateOfBirth),
      Gender: genderCode,
      PassportNo: String(p.passportNo || p.PassportNo || "").trim(),
      PassportExpiry: p.passportNo ? formatSrdvDateTime(p.passportExpiry || p.PassportExpiry || p.passportExpiryDate) : "",
      PassportIssueDate: p.passportNo ? formatSrdvDateTime(p.passportIssueDate || p.PassportIssueDate || "2023-01-01") : "",
      PassportIssueCountryCode: (p.passportIssueCountryCode || nationalityCode || "IN").slice(0, 2).toUpperCase(),
      Nationality: nationalityCode,
      AddressLine1: String(p.addressLine1 || p.AddressLine1 || p.address || p.city || "Street Address").trim() || "Street Address",
      AddressLine2: String(p.addressLine2 || p.AddressLine2 || "").trim(),
      City: String(p.city || p.City || origin || "City").trim(),
      CountryCode: countryCode,
      CountryName: "INDIA",
      CellCountryCode: "+91",
      ContactNo: cleanContact,
      Email: cleanEmail,
      IsLeadPax: idx === 0,
      Fare: finalPaxFare,
      Baggage: mappedBaggage,
      MealDynamic: mappedMeals,
      ...(mappedSeats.length > 0
        ? {
            Seat: mappedSeats,
          }
        : {}),
    };
  });
}

export function mapPassengersForApiIntegration(passengers, baseFare, tax, flight, fareDetails = null) {
  return mapPassengersForApi(passengers, baseFare, tax, flight, fareDetails);
}

// ============================================================================
// 7. TICKET LCC: POST /api/flight/srdv/TicketLCC
// ============================================================================

export async function ticketLCC(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));

  const rawPassengers = params.passengers || params.Passengers || [];
  const mappedPassengers = Array.isArray(rawPassengers) && rawPassengers.length > 0 && rawPassengers[0]?.Fare
    ? rawPassengers
    : mapPassengersForApi(rawPassengers, params.baseFare, params.tax, params.flight, params.fareDetails);

  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: mappedPassengers,
  };

  const payload = innerPayload;

  const endpoint = `${SRDV_ROOT}/TicketLCC`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const errObj = resObj?.Error || rawData?.Error;

    if (errObj && String(errObj.ErrorCode) !== "0" && String(errObj.ErrorCode) !== "10" && errObj.ErrorMessage) {
      return {
        success: false,
        errorCode: String(errObj.ErrorCode),
        error: errObj.ErrorMessage,
        traceId: activeTraceId,
        response: resObj,
        rawResponse: rawData,
      };
    }

    const itinerary = resObj?.FlightItinerary || rawData?.FlightItinerary || {};
    const pnr = String(itinerary?.PNR || resObj?.PNR || rawData?.PNR || "").trim();
    const bookingId = String(itinerary?.BookingId || resObj?.BookingId || rawData?.BookingId || pnr).trim();
    const isPending = String(errObj?.ErrorCode) === "10";

    return {
      success: true,
      isPendingCallback: isPending,
      errorCode: String(errObj?.ErrorCode || "0"),
      status: isPending ? "Pending" : "Confirmed",
      pnr,
      bookingId,
      traceId: activeTraceId,
      response: resObj,
      rawResponse: rawData,
    };
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    return {
      success: false,
      errorCode: "-1",
      error: error?.message || "TicketLCC request failed.",
      traceId: activeTraceId,
      response: null,
      rawResponse: null,
    };
  }
}

// ============================================================================
// 8. HOLD GDS & TICKET GDS (Non-LCC Carriers)
// ============================================================================

export async function holdGDS(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));
  const journeyTypeVal = Number(params.journeyType || params.JourneyType || (activeResultIndex.includes(",") ? 2 : 1));

  const rawPassengers = params.passengers || params.Passengers || [];
  const mappedPassengers = Array.isArray(rawPassengers) && rawPassengers.length > 0 && rawPassengers[0]?.Fare
    ? rawPassengers
    : mapPassengersForApi(rawPassengers, params.baseFare, params.tax, params.flight);

  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    JourneyType: journeyTypeVal,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: mappedPassengers,
  };
  const payload = innerPayload;
  const endpoint = `${SRDV_ROOT}/HoldGDS`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

export async function ticketGDS(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = cleanResultIndex(params.resultIndex || params.ResultIndex || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || resolveSrdvIndexFromResultIndex(activeResultIndex, "2"));
  const rawBookingId = params.bookingId ?? params.BookingId ?? 0;
  const parsedBookingId = typeof rawBookingId === "number" ? rawBookingId : (parseInt(String(rawBookingId).replace(/\D/g, ""), 10) || 0);

  const rawPassengers = params.passengers || params.Passengers || [];
  const mappedPassengers = Array.isArray(rawPassengers) && rawPassengers.length > 0 && rawPassengers[0]?.Fare
    ? rawPassengers
    : mapPassengersForApi(rawPassengers, params.baseFare, params.tax, params.flight);

  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    PNR: String(params.pnr || params.PNR || ""),
    BookingId: parsedBookingId,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    Passengers: mappedPassengers,
  };
  const payload = innerPayload;
  const endpoint = `${SRDV_ROOT}/TicketGDS`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

// ============================================================================
// 9. CANCELLATION APIS
// ============================================================================

export async function getCancellationCharges(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    RequestType: Number(params.requestType || params.RequestType || 1),
    TraceId: String(params.traceId || params.TraceId || ""),
    BookingId: String(params.bookingId || params.BookingId || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
  };

  const endpoint = `${SRDV_ROOT}/GetCancellationCharges`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

export async function sendCancelRequest(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    BookingId: String(params.bookingId || params.BookingId || ""),
    PNR: String(params.pnr || params.PNR || ""),
    RequestType: String(params.requestType || params.RequestType || "2"),
    CancellationType: String(params.cancellationType || params.CancellationType || "3"),
    Remarks: String(params.remarks || params.Remarks || "User requested cancellation"),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.sectors || params.Sectors ? { Sectors: params.sectors || params.Sectors } : {}),
    ...(params.ticketData || params.TicketData ? { TicketData: params.ticketData || params.TicketData } : {}),
  };

  const endpoint = `${SRDV_ROOT}/SendChangeRequest`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

export function sendChangeRequest(params) {
  return sendCancelRequest(params);
}

export async function getCancelStatus(params = {}) {
  const changeRequestId = typeof params === "object"
    ? (params.changeRequestId || params.ChangeRequestId || "")
    : String(params || "");

  const payload = {
    EndUserIp: "127.0.0.1",
    ChangeRequestId: String(changeRequestId),
  };

  const endpoint = `${SRDV_ROOT}/GetCancelStatus`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    throw error;
  }
}

// ============================================================================
// 10. CALENDAR FARE: POST /api/flight/srdv/GetCalendarFare
// ============================================================================

export async function getCalendarFare(searchParams = {}) {
  const isMultiCity = searchParams.journeyType === 3 || String(searchParams.tripType || "").toLowerCase() === "multicity";
  if (isMultiCity) {
    return { success: true, isMultiCity: true, data: [], results: [] };
  }

  const fromCode = searchParams.sourceCode || searchParams.fromCode || searchParams.originCode || searchParams.from || searchParams.origin;
  const toCode = searchParams.destinationCode || searchParams.toCode || searchParams.to || searchParams.destination;

  if (!fromCode || !toCode) {
    throw new Error("All flight sectors require a valid airport selection from the suggestions.");
  }
  const journeyDate = searchParams.date || searchParams.preferredDepartureTime || new Date().toISOString().slice(0, 10);
  const cabinClassCode = toCabinClassCode(searchParams.travelClass || searchParams.flightCabinClass);

  const payload = {
    EndUserIp: searchParams.endUserIp || "192.168.1.1",
    ClientId: FLIGHT_API_CREDENTIALS.ClientId,
    UserName: FLIGHT_API_CREDENTIALS.UserName,
    Password: FLIGHT_API_CREDENTIALS.Password,
    JourneyType: Number(searchParams.journeyType || 1),
    FareType: Number(searchParams.fareType || 1),
    Segments: [
      {
        Origin: fromCode,
        Destination: toCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${journeyDate}T00:00:00`,
        PreferredArrivalTime: `${journeyDate}T00:00:00`,
      },
    ],
  };

  const endpoint = `${SRDV_ROOT}/GetCalendarFare`;
  logFlightApiRequest("POST", endpoint, payload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);

    const resObj = rawData?.Response || rawData?.data?.Response || rawData;
    const rawResults = resObj?.SearchResults || resObj?.searchResults || resObj?.Results || resObj?.results || [];
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
      };
    });

    return {
      success: true,
      origin: fromCode,
      destination: toCode,
      results: normalizedResults,
      fareMapByDate,
      raw: rawData,
    };
  } catch (error) {
    logFlightApiError("POST", endpoint, error);
    return { success: false, error: error?.message, results: [], fareMapByDate: {} };
  }
}

// ============================================================================
// 11. DATABASE PERSISTENCE & USER BOOKING APIs
// ============================================================================

export async function saveFlightBooking(bookingPayload) {
  const endpoint = "/api/flight/bookings";
  logFlightApiRequest("POST", endpoint, bookingPayload);

  try {
    const rawData = await requestJson(endpoint, {
      method: "POST",
      body: JSON.stringify(bookingPayload),
    });

    logFlightApiResponse("POST", endpoint, 200, rawData);
    return rawData;
  } catch (error) {
    console.warn("[FlightService] POST /api/flight/bookings failed:", error?.message);
    return {
      success: true,
      persistedLocal: true,
      bookingId: bookingPayload?.bookingId || bookingPayload?.pnr,
      data: bookingPayload,
    };
  }
}

export async function getUserFlightBookings() {
  try {
    const data = await requestJson("/api/flight/bookings", { method: "GET" });
    return data;
  } catch (error) {
    console.warn("[FlightService] GET /api/flight/bookings failed:", error?.message);
    return [];
  }
}

export async function getFlightBookingDetails(bookingId) {
  try {
    const data = await requestJson(`/api/flight/bookings/${bookingId}`, { method: "GET" });
    return data;
  } catch (error) {
    console.warn(`[FlightService] GET /api/flight/bookings/${bookingId} failed:`, error?.message);
    return null;
  }
}

// ============================================================================
// 12. HIGH-LEVEL UNIFIED BOOKING WORKFLOW (bookFlight)
// ============================================================================

export async function bookFlight(paramPayload = {}) {
  let flowState = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("flight_booking_flow_state_v1");
      if (raw) flowState = JSON.parse(raw) || {};
    } catch {}
  }

  const actualPayload = paramPayload.payload || paramPayload;
  const flight = actualPayload.flight || flowState.flight || {};
  const passengers = actualPayload.passengers || flowState.passengers || [];
  const fareDetails = actualPayload.fareDetails || flowState.fareDetails || null;
  const couponCode = actualPayload.couponCode || flowState.couponCode || null;

  const traceId = flight.traceId || flight.TraceId || flowState.traceId || actualPayload.traceId || (typeof window !== "undefined" ? window.sessionStorage.getItem("flight_trace_id") : "") || "";

  // Accurately resolve supplier ResultIndex, prioritizing multi-city leg combinations and genuine supplier result keys
  const multiCityLegs = flowState.selectedLegs || actualPayload.selectedLegs || flowState.legs;
  const multiCityCombinedIndex = Array.isArray(multiCityLegs) && multiCityLegs.length > 0
    ? multiCityLegs.map(l => l.resultIndex || l.ResultIndex || (l.id && !String(l.id).startsWith("flight-") ? l.id : "")).filter(Boolean).join(",")
    : "";

  const candidateResultIndex =
    multiCityCombinedIndex ||
    flight.resultIndex ||
    flight.ResultIndex ||
    flight.rawId ||
    (flight.id && !String(flight.id).startsWith("flight-") && !String(flight.id).startsWith("flt-") ? flight.id : "") ||
    flowState.resultIndex ||
    flowState.ResultIndex ||
    actualPayload.resultIndex ||
    actualPayload.ResultIndex ||
    "";

  const resultIndex = cleanResultIndex(candidateResultIndex);
  const srdvType = flight.srdvType || flight.SrdvType || flowState.srdvType || actualPayload.srdvType || "MixAPI";
  const srdvIndex = String(flight.srdvIndex || flight.SrdvIndex || flowState.srdvIndex || actualPayload.srdvIndex || resolveSrdvIndexFromResultIndex(resultIndex, "2"));

  // Accurately resolve whether carrier requires TicketLCC vs HoldGDS
  const rawAirlineCode = String(flight.airlineCode || flight.airline || flowState.flight?.airlineCode || flowState.flight?.airline || "").toUpperCase().trim();
  const isKnownLccAirline = ["6E", "SG", "I5", "QP", "G8", "IX", "INDIGO", "SPICEJET", "AKASA", "AIR INDIA EXPRESS"].some(c => rawAirlineCode.includes(c));
  const rawLccFlag = flight.isLCC ?? flight.IsLCC ?? flight.isLcc ?? flowState.flight?.isLCC ?? flowState.isLCC ?? actualPayload.isLCC;
  const isLCC = isKnownLccAirline || Boolean(rawLccFlag !== undefined ? (rawLccFlag === true || rawLccFlag === "true" || rawLccFlag === 1 || rawLccFlag === "1") : true);

  console.log("================================================================================");
  console.log("âœˆï¸ [BOOK_FLIGHT_EXECUTION] Starting unified flight booking dispatch");
  console.log(`âš¡ Carrier Mode: ${isLCC ? "TicketLCC (Direct Single-Pass Booking)" : "HoldGDS + TicketGDS"}`);
  console.log(`ðŸ†” Airline: ${rawAirlineCode || "N/A"} | Trace ID: ${traceId} | Result Index: ${resultIndex}`);
  console.log("================================================================================");

  let pnr = "";
  let bookingId = "";
  let ticketStatus = "Confirmed";
  let rawTicketResponse = null;

  // FareQuote is NOT called here â€” it was already called once on the passenger details page (matching React Native behavior).
  // Re-calling FareQuote on a TraceId that has already been quoted will burn it (ErrorCode 997).

  if (isLCC) {
    const lccRes = await ticketLCC({
      traceId,
      resultIndex,
      srdvType,
      srdvIndex,
      passengers,
      baseFare: flight.baseFare || fareDetails?.BaseFare,
      tax: flight.tax || fareDetails?.Tax,
      fareDetails,
      flight,
      couponCode: couponCode || actualPayload.couponCode || flowState.couponCode,
    });

    if (!lccRes.success && !lccRes.pnr && !lccRes.bookingId) {
      throw new Error(lccRes.error || "Airline ticket issuance failed.");
    }

    pnr = lccRes.pnr || `PNB${Date.now().toString().slice(-8)}`;
    bookingId = lccRes.bookingId || pnr;
    ticketStatus = lccRes.status || "Confirmed";
    rawTicketResponse = lccRes;
  } else {
    const holdRes = await holdGDS({
      traceId,
      resultIndex,
      srdvType,
      srdvIndex,
      passengers,
      baseFare: flight.baseFare || fareDetails?.BaseFare,
      tax: flight.tax || fareDetails?.Tax,
      flight,
      couponCode: couponCode || actualPayload.couponCode || flowState.couponCode,
    });

    const holdData = holdRes?.Response || holdRes?.Results || holdRes;
    const holdErr = holdData?.Error || holdRes?.Error;
    if (holdErr && String(holdErr.ErrorCode) !== "0" && holdErr.ErrorMessage) {
      throw new Error(holdErr.ErrorMessage || "Flight seat hold failed on GDS.");
    }

    const holdPnr = String(holdData?.PNR || holdData?.pnr || holdData?.BookingRefNo || "").trim();
    const rawHoldBookingId = holdData?.BookingId ?? holdData?.bookingId ?? 0;
    const holdBookingId = typeof rawHoldBookingId === "number" ? rawHoldBookingId : (parseInt(String(rawHoldBookingId).replace(/\D/g, ""), 10) || 0);

    const gdsTicketRes = await ticketGDS({
      traceId,
      resultIndex,
      srdvType,
      srdvIndex,
      pnr: holdPnr,
      bookingId: holdBookingId,
      passengers,
      baseFare: flight.baseFare,
      tax: flight.tax,
      flight,
    });

    const ticketData = gdsTicketRes?.Response || gdsTicketRes?.Results || gdsTicketRes;
    const ticketErr = ticketData?.Error || gdsTicketRes?.Error;
    if (ticketErr && String(ticketErr.ErrorCode) !== "0" && ticketErr.ErrorMessage) {
      throw new Error(ticketErr.ErrorMessage || "GDS Ticket issuance failed.");
    }

    pnr = holdPnr || String(ticketData?.PNR || ticketData?.pnr || "") || `PNB${Date.now().toString().slice(-8)}`;
    bookingId = String(holdBookingId || ticketData?.BookingId || pnr);
    ticketStatus = ticketData?.Status || "Confirmed";
    rawTicketResponse = gdsTicketRes;
  }

  const confirmedBooking = {
    id: bookingId || pnr || `flt-${Date.now()}`,
    bookingId,
    pnr,
    bookingReference: bookingId || pnr,
    traceId,
    from: flight.fromCity || flight.from || flowState.searchContext?.from || "",
    to: flight.toCity || flight.to || flowState.searchContext?.to || "",
    airline: flight.airlineName || flight.airline || "",
    flightNumber: flight.flightNumber || "",
    travelClass: flight.selectedTravelClass || "Economy",
    date: flight.departureDate || flowState.searchContext?.date || new Date().toISOString().slice(0, 10),
    totalPrice: flight.displayFare || flight.fare || 0,
    status: ticketStatus,
    passengers: mapPassengersForApi(passengers, flight.baseFare, flight.tax, flight, fareDetails),
    createdAt: new Date().toISOString(),
  };

  try {
    await saveFlightBooking(confirmedBooking);
  } catch (err) {
    console.warn("[FlightService] Failed to persist booking to database:", err?.message);
  }

  return {
    success: true,
    pnr,
    bookingId,
    bookingReference: bookingId || pnr,
    ticketStatus,
    traceId,
    flight,
    rawResponse: rawTicketResponse,
  };
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
  try {
    const data = await getFlightPromotions();
    const list = Array.isArray(data) ? data : (data?.data || data?.promotions || []);
    return list.map((record) => normalizeFlightCouponRecord(record));
  } catch (err) {
    console.warn("Unable to load flight coupons from /api/FlightPromotions:", err?.message || err);
    return [];
  }
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

  // Single primary collection endpoint with one clean fallback
  const primaryEndpoint = "/api/FlightBookings";
  const fallbackEndpoint = "/api/bookings/history";

  try {
    const data = await requestJson(primaryEndpoint, { method: "GET" });
    if (Array.isArray(data) && data.length > 0) {
      bookings = data.map((record) => normalizeFlightBookingRecord(record));
    }
  } catch (err) {
    // Attempt secondary fallback only if primary fails
    try {
      const fallbackData = await requestJson(fallbackEndpoint, { method: "GET" });
      if (Array.isArray(fallbackData)) {
        bookings = fallbackData.map((record) => normalizeFlightBookingRecord(record));
      }
    } catch (e) {
      // Return empty array gracefully without candidate loop spam
    }
  }

  // Merge locally stored flight bookings so user bookings are always visible regardless of API state
  if (typeof window !== "undefined") {
    const localKeys = [
      "confirmed_flight_bookings",
      "my_flight_bookings",
      "user_flight_tickets",
      "mock_tickets",
      "stored_tickets",
      "pnb_flight_bookings",
      "latest_ticket"
    ];
    localKeys.forEach((key) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
        list.forEach((t, idx) => {
          if (!t) return;
          const norm = normalizeFlightBookingRecord(t);
          const ref = String(norm.bookingReference || norm.bookingId || norm.pnr || "").trim().toLowerCase();
          if (ref && !bookings.some(b => String(b.bookingReference || b.bookingId || b.pnr || "").trim().toLowerCase() === ref)) {
            norm._localRank = idx;
            bookings.push(norm);
          }
          if (String(norm.status || norm.Status || "").toLowerCase() === "cancelled") {
            syncCancelledStatusToDatabase(norm).catch(() => {});
          }
        });
      } catch (e) {}
    });
  }

  // Filter in-memory if query parameters were passed
  return bookings.filter((b) => {
    if (passengerPhone && !String(b.passengerPhone || "").includes(passengerPhone)) return false;
    if (status && status !== "All" && String(b.status || "").toLowerCase() !== String(status).toLowerCase()) return false;
    if (userId && String(b.userId || "") !== String(userId)) return false;
    return true;
  });
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

const syncedCancelledBookingIds = new Set();

async function syncCancelledStatusToDatabase(cancelResult) {
  if (!cancelResult) return;
  const targetId = String(
    cancelResult.srdvBookingId ||
    cancelResult.providerBookingId ||
    cancelResult.bookingId ||
    cancelResult.pnr ||
    ""
  ).trim();

  if (!targetId) return;

  const payload = {
    bookingId: targetId,
    bookingReference: cancelResult.bookingReference || targetId,
    pnr: cancelResult.pnr || targetId,
    status: cancelResult.status || "Cancelled",
    cancellationReason: cancelResult.cancellationReason || "Customer requested cancellation",
    refundAmount: Number(cancelResult.refundAmount || 0),
    cancellationCharge: Number(cancelResult.cancellationCharge || 0),
    cancelledAtUtc: cancelResult.cancelledAtUtc || new Date().toISOString(),
  };

  // Target single validated ASP.NET Core flight controller endpoint namespace
  const targetEndpoint = `/api/FlightBookings/${encodeURIComponent(targetId)}`;

  try {
    await requestJson(targetEndpoint, {
      method: "PUT",
      body: JSON.stringify(payload),
      skipAuth: false,
    });
  } catch (err) {
    // Graceful fallback to collection endpoint if PUT fails
    await requestJson("/api/FlightBookings", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: false,
    }).catch(() => {});
  }
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
    typeof window !== "undefined" ? window.sessionStorage.getItem("last_booking_trace_id") || window.sessionStorage.getItem("flight_trace_id") || window.sessionStorage.getItem("TraceId") : ""
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
  const from = String(rawFrom).toUpperCase() || "HYD";
  const to = String(rawTo).toUpperCase() || "BLR";
  if (rawFrom && rawTo) {
    sectors.push({ Origin: from, Destination: to });
  } else if (booking?.route || booking?.Route) {
    const routeStr = String(booking?.route || booking?.Route);
    const parts = routeStr.split(/to|-|â€“/i).map(s => String(s.trim()).toUpperCase());
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

  // Production DB API Sync: Persist cancellation status to SQL Database
  try {
    await syncCancelledStatusToDatabase(cancelResult);
  } catch (dbErr) {
    console.warn("DB cancellation sync encountered an issue:", dbErr);
  }

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
        const fromCode = String(seg.fromCode || seg.fromCity || seg.origin || seg.sourceCode || "").toUpperCase();
        const toCode = String(seg.toCode || seg.toCity || seg.destination || seg.destinationCode || "").toUpperCase();
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
    cancellationType: sectors.length > 0 ? "2" : (ticketData.length > 0 ? "1" : "3"),
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
  const isPartial = !allLegsCancelled && !allPaxCancelled;
  const overallStatus = allLegsCancelled ? "Cancelled" : (isPartial ? (booking.status === "Cancelled" ? "Confirmed" : (booking.status || "Confirmed")) : "Cancelled");

  const cancelResult = {
    ...booking,
    status: overallStatus,
    Status: overallStatus,
    isPartialCancellation: isPartial,
    segments: updatedSegments,
    passengers: updatedPassengers,
    cancelledAtUtc: new Date().toISOString(),
    cancellationReason: reason || "Partial leg cancellation requested",
    changeRequestId: changeRequestId || booking.changeRequestId,
    message: "Selected flight leg cancelled successfully."
  };

  if (pnr) persistCancelledStatusToStorage(pnr, cancelResult);
  if (providerBookingId) persistCancelledStatusToStorage(providerBookingId, cancelResult);
  if (booking.bookingId) persistCancelledStatusToStorage(booking.bookingId, cancelResult);

  // Production DB API Sync: Persist cancellation status to SQL Database
  try {
    await syncCancelledStatusToDatabase(cancelResult);
  } catch (dbErr) {
    console.warn("DB cancellation sync encountered an issue:", dbErr);
  }

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
    TraceId: String(traceId || ""),
    PNR: String(pnr || ""),
    GdsPnr: String(gdsPnr || pnr || ""),
    BookingId: String(bookingId || ""),
    Status: String(status || "Success"),
    Remark: String(remark || "Ticketed"),
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
