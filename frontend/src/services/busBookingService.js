import { toDdMmYyyy } from "../utils/apiDateFormat";

const FALLBACK_API_BASE_URL =
  "https://undogmatically-knotlike-evita.ngrok-free.dev";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
function getAuthHeaders() {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.toLowerCase().startsWith("/admin");
  const activePortal = typeof window !== "undefined" ? window.sessionStorage.getItem("active_portal") || "b2c" : "b2c";
  const token = isAdminRoute
    ? localStorage.getItem("adminToken") || localStorage.getItem("token")
    : activePortal === "b2b"
      ? (localStorage.getItem("b2b_token") || localStorage.getItem("token"))
      : (localStorage.getItem("token") || localStorage.getItem("b2b_token"));

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
    process.env.REACT_APP_BUS_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
  }

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
const BUS_BOOKINGS_ROOT = "/api/BusBookings";
const LEGACY_BUS_BOOKINGS_ROOT = "/api/bus";
const ADMIN_BUS_ROOT = "/api/admin/bus";

function toAbsoluteUrl(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/+$/, "")}/${urlOrPath.replace(
      /^\/+/,
      ""
    )}`;
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

function shouldUseFallbackBuses(error) {
  const status = Number(error?.status);
  if ([401, 403, 404, 405, 502, 503, 504].includes(status)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("cannot get /api/busbookings") ||
    message.includes("cannot get /api/bus") ||
    message.includes("err_ngrok_3200") ||
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

function normalizePointList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : String(value).split(",");

  return values
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        return String(
          pickFirst(
            item,
            [
              "name",
              "Name",
              "point",
              "Point",
              "pointName",
              "PointName",
              "stopName",
              "StopName",
              "address",
              "Address",
              "boardingPoint",
              "BoardingPoint",
              "droppingPoint",
              "DroppingPoint",
              "cityName",
              "CityName",
              "location",
              "Location",
            ],
            ""
          ) || ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeBusSearchRecord(record, index = 0) {
  const boardingPoint = String(
    pickFirst(record, ["boardingPoint", "BoardingPoint"], "") || ""
  ).trim();
  const droppingPoint = String(
    pickFirst(record, ["droppingPoint", "DroppingPoint"], "") || ""
  ).trim();
  const boardingPoints = normalizePointList(
    pickFirst(
      record,
      [
        "boardingPoints",
        "BoardingPoints",
        "boardingPointList",
        "BoardingPointList",
        "boardingStops",
        "BoardingStops",
        "pickupPointList",
        "PickupPointList",
        "pickupPoints",
        "PickupPoints",
        "pickUpPoints",
        "PickUpPoints",
        "boardingLocations",
        "BoardingLocations",
      ],
      null
    )
  );
  const droppingPoints = normalizePointList(
    pickFirst(
      record,
      [
        "droppingPoints",
        "DroppingPoints",
        "droppingPointList",
        "DroppingPointList",
        "droppingStops",
        "DroppingStops",
        "dropPointList",
        "DropPointList",
        "dropPoints",
        "DropPoints",
        "dropOffPoints",
        "DropOffPoints",
        "droppingLocations",
        "DroppingLocations",
      ],
      null
    )
  );

  return {
    id: pickFirst(record, ["id", "Id", "busId", "BusId"], null) || `bus-${index + 1}`,
    busNumber: String(
      pickFirst(record, ["busNumber", "BusNumber", "tripNumber", "TripNumber"], "--") || "--"
    ),
    operatorName: String(
      pickFirst(record, ["operatorName", "OperatorName", "providerName", "ProviderName"], "") ||
        ""
    ),
    busType: String(pickFirst(record, ["busType", "BusType"], "") || ""),
    fromCity: String(pickFirst(record, ["fromCity", "FromCity", "source", "Source"], "") || ""),
    toCity: String(
      pickFirst(record, ["toCity", "ToCity", "destination", "Destination"], "") || ""
    ),
    boardingPoint,
    droppingPoint,
    boardingPoints: Array.from(new Set([boardingPoint, ...boardingPoints].filter(Boolean))),
    droppingPoints: Array.from(new Set([droppingPoint, ...droppingPoints].filter(Boolean))),
    departureTimeIst: pickFirst(
      record,
      [
        "departureTimeIst",
        "DepartureTimeIst",
        "departureDateTimeIst",
        "DepartureDateTimeIst",
        "departureTime",
        "DepartureTime",
        "departureDateTime",
        "DepartureDateTime",
      ],
      null
    ),
    arrivalTimeIst: pickFirst(
      record,
      [
        "arrivalTimeIst",
        "ArrivalTimeIst",
        "arrivalDateTimeIst",
        "ArrivalDateTimeIst",
        "arrivalTime",
        "ArrivalTime",
        "arrivalDateTime",
        "ArrivalDateTime",
      ],
      null
    ),
    departureTimeUtc: pickFirst(
      record,
      [
        "departureTimeUtc",
        "DepartureTimeUtc",
        "departureDateTimeUtc",
        "DepartureDateTimeUtc",
        "departureTime",
        "DepartureTime",
        "departureDateTime",
        "DepartureDateTime",
      ],
      null
    ),
    arrivalTimeUtc: pickFirst(
      record,
      [
        "arrivalTimeUtc",
        "ArrivalTimeUtc",
        "arrivalDateTimeUtc",
        "ArrivalDateTimeUtc",
        "arrivalTime",
        "ArrivalTime",
        "arrivalDateTime",
        "ArrivalDateTime",
      ],
      null
    ),
    priceInr: Number(pickFirst(record, ["priceInr", "PriceInr"], 0)) || 0,
    availableSeats:
      Number(pickFirst(record, ["availableSeats", "AvailableSeats"], 0)) || 0,
    totalSeats: Number(pickFirst(record, ["totalSeats", "TotalSeats"], 0)) || 0,
  };
}

const FALLBACK_BUS_TEMPLATES = [
  {
    operatorName: "PickNBook Express",
    busNumber: "PNB 2401",
    busType: "A/C Sleeper",
    departureHour: 21,
    departureMinute: 30,
    durationMinutes: 510,
    priceInr: 899,
    availableSeats: 18,
    totalSeats: 36,
  },
  {
    operatorName: "Atlas Roadways",
    busNumber: "AR 118",
    busType: "A/C Seater Sleeper",
    departureHour: 22,
    departureMinute: 15,
    durationMinutes: 480,
    priceInr: 749,
    availableSeats: 24,
    totalSeats: 42,
  },
  {
    operatorName: "MetroLine Travels",
    busNumber: "ML 702",
    busType: "Non A/C Seater",
    departureHour: 6,
    departureMinute: 45,
    durationMinutes: 465,
    priceInr: 599,
    availableSeats: 31,
    totalSeats: 44,
  },
];

function getFallbackBusTemplate(busId) {
  const match = String(busId || "").match(/fallback-bus-(\d+)/i);
  const index = match ? Number(match[1]) - 1 : 0;
  return FALLBACK_BUS_TEMPLATES[index] || FALLBACK_BUS_TEMPLATES[0];
}

function buildFallbackBusSearchRecords({ from, to, date }) {
  const source = String(from || "").trim() || "Hyderabad";
  const destination = String(to || "").trim() || "Bengaluru";
  const [year, month, day] = String(date || "")
    .split("-")
    .map((part) => Number(part));
  const tripDate =
    year && month && day
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date();

  return FALLBACK_BUS_TEMPLATES.map((template, index) => {
    const departure = new Date(tripDate);
    departure.setHours(template.departureHour, template.departureMinute, 0, 0);
    const arrival = new Date(departure.getTime() + template.durationMinutes * 60000);

    return normalizeBusSearchRecord(
      {
        id: `fallback-bus-${index + 1}`,
        ...template,
        fromCity: source,
        toCity: destination,
        boardingPoint: `${source} Main Boarding Point`,
        droppingPoint: `${destination} Central Drop`,
        boardingPoints: [`${source} Main Boarding Point`, `${source} Bypass`, `${source} Bus Stand`],
        droppingPoints: [`${destination} Central Drop`, `${destination} Bypass`, `${destination} Bus Stand`],
        departureTimeIst: departure.toISOString(),
        arrivalTimeIst: arrival.toISOString(),
      },
      index
    );
  });
}

function normalizeBusSeatRecord(seat) {
  const seatCode = String(pickFirst(seat, ["seatCode", "SeatCode"], "") || "");
  const seatType = String(pickFirst(seat, ["seatType", "SeatType"], "") || "");
  const baseFare = Number(pickFirst(seat, ["baseFare", "BaseFare"], 0)) || 0;
  const markupAmount = Number(pickFirst(seat, ["markupAmount", "MarkupAmount"], 0)) || 0;
  const priceInr = Number(pickFirst(seat, ["priceInr", "PriceInr"], 0)) || 0;
  const fareBeforeTax =
    Number(pickFirst(seat, ["fareBeforeTax", "FareBeforeTax"], 0)) ||
    priceInr ||
    baseFare + markupAmount;

  return {
    seatCode,
    seatType,
    priceInr,
    baseFare,
    markupAmount,
    fareBeforeTax,
    isBooked: String(pickFirst(seat, ["isBooked", "IsBooked"], false)).toLowerCase() === "true",
    gender:
      pickFirst(
        seat,
        [
          "gender",
          "Gender",
          "passengerGender",
          "PassengerGender",
          "bookedGender",
          "BookedGender",
        ],
        ""
      ) || "",
  };
}

function normalizeBusSeatDefinitionRecord(definition) {
  const seatCode = String(
    pickFirst(definition, ["seatCode", "SeatCode", "code", "Code"], "") || ""
  ).trim();
  const seatType = String(pickFirst(definition, ["seatType", "SeatType"], "") || "");
  const deck = String(pickFirst(definition, ["deck", "Deck"], "") || "");

  return {
    seatCode,
    seatType,
    deck,
    row: Number(pickFirst(definition, ["row", "Row"], 0)) || 0,
    column: Number(pickFirst(definition, ["column", "Column"], 0)) || 0,
    isSleeper:
      String(pickFirst(definition, ["isSleeper", "IsSleeper"], false)).toLowerCase() ===
      "true",
    isUpper:
      String(pickFirst(definition, ["isUpper", "IsUpper"], false)).toLowerCase() ===
      "true",
    variant: pickFirst(definition, ["variant", "Variant"], null),
    sectionLabel: String(
      pickFirst(definition, ["sectionLabel", "SectionLabel", "section", "Section"], "") || ""
    ),
  };
}

function normalizeBusSeatSectionRecord(section) {
  const seatCodesRaw = pickFirst(section, ["seatCodes", "SeatCodes"], []);
  const seatCodes = Array.isArray(seatCodesRaw)
    ? seatCodesRaw.map((seatCode) => String(seatCode || "").trim()).filter(Boolean)
    : [];

  return {
    label: String(pickFirst(section, ["label", "Label", "name", "Name"], "") || ""),
    deck: String(pickFirst(section, ["deck", "Deck"], "") || ""),
    columnsPerRow:
      Number(pickFirst(section, ["columnsPerRow", "ColumnsPerRow"], 0)) || 0,
    aisleAfterColumn:
      Number(pickFirst(section, ["aisleAfterColumn", "AisleAfterColumn"], -1)),
    seatCodes,
  };
}

function normalizePointOptionList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : String(value).split(",");

  return values
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, address: "" } : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const name = String(
        pickFirst(
          item,
          [
            "name",
            "Name",
            "point",
            "Point",
            "pointName",
            "PointName",
            "stopName",
            "StopName",
            "boardingPoint",
            "BoardingPoint",
            "droppingPoint",
            "DroppingPoint",
            "cityName",
            "CityName",
            "location",
            "Location",
          ],
          ""
        ) || ""
      ).trim();
      const address = String(
        pickFirst(item, ["address", "Address", "landmark", "Landmark"], "") || ""
      ).trim();

      return name ? { name, address } : null;
    })
    .filter(Boolean);
}

function createFallbackBookedIndexes(totalSeats, bookedSeats, seedText) {
  const bookedIndexes = new Set();
  let cursor = Math.max(0, String(seedText || "").length);

  while (bookedIndexes.size < Math.min(bookedSeats, Math.max(0, totalSeats - 1))) {
    cursor = (cursor + 7) % totalSeats;
    bookedIndexes.add(cursor);
  }

  return bookedIndexes;
}

function createFallbackSeatCodes(template) {
  const totalSeats = Number(template?.totalSeats) || 0;
  const busType = String(template?.busType || "").toLowerCase();

  if (busType.includes("sleeper") && !busType.includes("seater")) {
    const lowerCount = Math.ceil(totalSeats / 2);
    const upperCount = totalSeats - lowerCount;
    return [
      ...Array.from({ length: lowerCount }, (_, index) => ({
        code: `L${index + 1}`,
        deck: "Lower",
        sectionLabel: "Lower deck",
        isSleeper: true,
        isUpper: false,
      })),
      ...Array.from({ length: upperCount }, (_, index) => ({
        code: `U${index + 1}`,
        deck: "Upper",
        sectionLabel: "Upper deck",
        isSleeper: true,
        isUpper: true,
      })),
    ];
  }

  if (busType.includes("seater") && busType.includes("sleeper")) {
    const lowerCount = Math.ceil(totalSeats * 0.67);
    const upperCount = totalSeats - lowerCount;
    return [
      ...Array.from({ length: lowerCount }, (_, index) => ({
        code: `L${index + 1}`,
        deck: "Lower",
        sectionLabel: "Lower deck",
        isSleeper: false,
        isUpper: false,
      })),
      ...Array.from({ length: upperCount }, (_, index) => ({
        code: `U${index + 1}`,
        deck: "Upper",
        sectionLabel: "Upper deck",
        isSleeper: true,
        isUpper: true,
      })),
    ];
  }

  return Array.from({ length: totalSeats }, (_, index) => ({
    code: `L${index + 1}`,
    deck: "Main",
    sectionLabel: "Main deck",
    isSleeper: false,
    isUpper: false,
  }));
}

function buildFallbackSeatMap(busId) {
  const template = getFallbackBusTemplate(busId);
  const seatCodes = createFallbackSeatCodes(template);
  const totalSeats = seatCodes.length;
  const availableSeats = Math.min(
    Number(template.availableSeats) || totalSeats,
    totalSeats
  );
  const bookedIndexes = createFallbackBookedIndexes(
    totalSeats,
    totalSeats - availableSeats,
    `${busId}-${template.busNumber}`
  );
  const fare = Number(template.priceInr) || 0;

  const seats = seatCodes.map((seat, index) => ({
    seatCode: seat.code,
    seatType: seat.isSleeper ? "Sleeper" : "Seat",
    priceInr: fare,
    baseFare: fare,
    markupAmount: 0,
    fareBeforeTax: fare,
    isBooked: bookedIndexes.has(index),
    gender: "",
  }));
  const seatDefinitions = seatCodes.map((seat, index) => {
    const columnsPerRow = seat.isSleeper ? 3 : 4;

    return {
      seatCode: seat.code,
      seatType: seat.isSleeper ? "Sleeper" : "Seat",
      deck: seat.deck,
      row: Math.floor(index / columnsPerRow) + 1,
      column: (index % columnsPerRow) + 1,
      isSleeper: seat.isSleeper,
      isUpper: seat.isUpper,
      sectionLabel: seat.sectionLabel,
    };
  });
  const sectionsByLabel = new Map();

  seatCodes.forEach((seat) => {
    if (!sectionsByLabel.has(seat.sectionLabel)) {
      sectionsByLabel.set(seat.sectionLabel, {
        label: seat.sectionLabel,
        deck: seat.deck,
        columnsPerRow: seat.isSleeper ? 3 : 4,
        aisleAfterColumn: seat.isSleeper ? 0 : 1,
        seatCodes: [],
      });
    }

    sectionsByLabel.get(seat.sectionLabel).seatCodes.push(seat.code);
  });

  return {
    tripId: busId,
    tripType: "Bus",
    travelClass: null,
    layoutType: template.busType,
    totalSeats,
    bookedSeats: totalSeats - availableSeats,
    availableSeats,
    priceInr: fare,
    seats,
    seatDefinitions,
    sections: [...sectionsByLabel.values()],
    boardingPoints: [],
    droppingPoints: [],
  };
}

function buildFallbackPricingPreview(busId, normalizedSeatCodes) {
  const template = getFallbackBusTemplate(busId);
  const fare = Number(template.priceInr) || 0;
  const subtotalBeforeCoupon = normalizedSeatCodes.length * fare;
  const gstAmount = Math.round(subtotalBeforeCoupon * 0.05);
  const convenienceFee = normalizedSeatCodes.length > 0 ? 50 : 0;
  const finalAmount = subtotalBeforeCoupon + gstAmount + convenienceFee;

  return normalizeBusPricingPreview({
    busId,
    subtotalBeforeCoupon,
    taxableFare: subtotalBeforeCoupon,
    gstPercent: 5,
    gstAmount,
    convenienceFee,
    finalAmount,
    grandTotal: finalAmount,
    seats: normalizedSeatCodes.map((seatCode) => ({
      seatCode,
      seatType: "Seat",
      baseFare: fare,
      markupAmount: 0,
      fareBeforeTax: fare,
    })),
  });
}

function normalizeBusPricingPreview(payload) {
  const seatsRaw = pickFirst(payload, ["seats", "Seats"], []);
  const seats = Array.isArray(seatsRaw) ? seatsRaw.map((seat) => ({
    seatCode: String(pickFirst(seat, ["seatCode", "SeatCode"], "") || ""),
    seatType: String(pickFirst(seat, ["seatType", "SeatType"], "") || ""),
    baseFare: Number(pickFirst(seat, ["baseFare", "BaseFare"], 0)) || 0,
    markupAmount: Number(pickFirst(seat, ["markupAmount", "MarkupAmount"], 0)) || 0,
    fareBeforeTax: Number(pickFirst(seat, ["fareBeforeTax", "FareBeforeTax"], 0)) || 0,
  })) : [];

  const finalAmount =
    Number(pickFirst(payload, ["finalAmount", "FinalAmount", "grandTotal", "GrandTotal"], 0)) ||
    0;
  const subtotalBeforeCoupon =
    Number(pickFirst(payload, ["subtotalBeforeCoupon", "SubtotalBeforeCoupon"], 0)) || 0;
  const taxableFare =
    Number(pickFirst(payload, ["taxableFare", "TaxableFare"], 0)) || 0;
  const gstAmount =
    Number(pickFirst(payload, ["gstAmount", "GstAmount"], 0)) || 0;
  const convenienceFee =
    Number(pickFirst(payload, ["convenienceFee", "ConvenienceFee"], 0)) || 0;
  const couponDiscountAmount =
    Number(
      pickFirst(
        payload,
        ["couponDiscountAmount", "CouponDiscountAmount", "couponDiscountAmountInr", "CouponDiscountAmountInr"],
        0
      )
    ) || 0;
  const autoDiscountAmount =
    Number(
      pickFirst(
        payload,
        ["autoDiscountAmount", "AutoDiscountAmount", "autoDiscountAmountInr", "AutoDiscountAmountInr"],
        0
      )
    ) || 0;
  const manualDiscountAmount =
    Number(pickFirst(payload, ["manualDiscountAmount", "ManualDiscountAmount"], 0)) || 0;
  const totalDiscount =
    Number(pickFirst(payload, ["totalDiscount", "TotalDiscount"], 0)) ||
    couponDiscountAmount + autoDiscountAmount + manualDiscountAmount;
  const rawCouponAmount = pickFirst(payload, ["couponAmount", "CouponAmount"], null);
  const couponAmount =
    rawCouponAmount !== null && rawCouponAmount !== undefined && rawCouponAmount !== ""
      ? Number(rawCouponAmount) || 0
      : Math.max(
          couponDiscountAmount,
          manualDiscountAmount,
          Math.max(0, totalDiscount - autoDiscountAmount)
        );

  return {
    busId: pickFirst(payload, ["busId", "BusId"], null),
    gstCategory: pickFirst(payload, ["gstCategory", "GstCategory"], null),
    subtotalBeforeCoupon,
    couponAmount,
    taxableFare,
    gstPercent:
      Number(pickFirst(payload, ["gstPercent", "GstPercent"], 0)) || 0,
    gstAmount,
    convenienceFee,
    grandTotal: finalAmount,
    finalAmount,
    totalDiscount,
    discountSource: pickFirst(payload, ["discountSource", "DiscountSource"], null),
    discountLabel: pickFirst(payload, ["discountLabel", "DiscountLabel"], null),
    couponDiscountAmount,
    autoDiscountAmount,
    manualDiscountAmount,
    appliedPromotionCode: pickFirst(payload, ["appliedPromotionCode", "AppliedPromotionCode"], null),
    autoPromotionCode: pickFirst(payload, ["autoPromotionCode", "AutoPromotionCode"], null),
    appliedPromotionTitle: pickFirst(payload, ["appliedPromotionTitle", "AppliedPromotionTitle"], null),
    appliedPromotionType: pickFirst(payload, ["appliedPromotionType", "AppliedPromotionType"], null),
    couponAllowed: pickFirst(payload, ["couponAllowed", "CouponAllowed"], true) !== false,
    seats,
  };
}

export function getBusPromotionDiscountAmount(pricingPreview, fallbackDiscount = 0) {
  const totalDiscount = Number(pricingPreview?.totalDiscount) || 0;
  const autoDiscount = Number(pricingPreview?.autoDiscountAmount) || 0;
  const nonAutoDiscount = Math.max(0, totalDiscount - autoDiscount);

  const explicitNonAuto =
    (Number(pricingPreview?.couponDiscountAmount) || 0) +
    (Number(pricingPreview?.manualDiscountAmount) || 0);

  if (explicitNonAuto > 0) {
    return explicitNonAuto;
  }

  return nonAutoDiscount || Number(fallbackDiscount) || 0;
}

export function calculateBusPayableAmount(pricingPreview, fallbackTotal = 0) {
  return Number(pricingPreview?.finalAmount || pricingPreview?.grandTotal) || Number(fallbackTotal) || 0;
}

function normalizeBusPassenger(passenger, index = 0) {
  return {
    id: pickFirst(passenger, ["id", "Id"], null),
    fullName: String(
      pickFirst(passenger, ["fullName", "FullName", "name", "Name"], `Passenger ${index + 1}`)
    ),
    gender: String(pickFirst(passenger, ["gender", "Gender"], "")),
    seatNumber: pickFirst(passenger, ["seatNumber", "SeatNumber"], null),
    age: Number(pickFirst(passenger, ["age", "Age"], 0)) || 0,
    isCancelled: Boolean(pickFirst(passenger, ["isCancelled", "IsCancelled"], false)),
    cancelledAtUtc: pickFirst(passenger, ["cancelledAtUtc", "CancelledAtUtc"], null),
  };
}

function normalizeBusBookingRecord(record) {
  const passengersRaw = pickFirst(record, ["passengers", "Passengers"], []);
  const passengers = Array.isArray(passengersRaw)
    ? passengersRaw.map((passenger, index) => normalizeBusPassenger(passenger, index))
    : [];
  const seatsBookedFallback = passengers.length;

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
      pickFirst(record, ["providerName", "ProviderName", "operatorName", "OperatorName"], "") ||
        ""
    ),
    departureTimeUtc: pickFirst(
      record,
      [
        "departureTimeUtc",
        "DepartureTimeUtc",
        "departureDateTimeUtc",
        "DepartureDateTimeUtc",
        "departureTime",
        "DepartureTime",
        "departureDateTime",
        "DepartureDateTime",
        "departureTimeIst",
        "DepartureTimeIst",
      ],
      null
    ),
    arrivalTimeUtc: pickFirst(
      record,
      [
        "arrivalTimeUtc",
        "ArrivalTimeUtc",
        "arrivalDateTimeUtc",
        "ArrivalDateTimeUtc",
        "arrivalTime",
        "ArrivalTime",
        "arrivalDateTime",
        "ArrivalDateTime",
        "arrivalTimeIst",
        "ArrivalTimeIst",
      ],
      null
    ),
    seatsBooked:
      Number(pickFirst(record, ["seatsBooked", "SeatsBooked"], null)) ||
      seatsBookedFallback,
    totalPriceInr:
      Number(pickFirst(record, ["totalPriceInr", "TotalPriceInr"], 0)) || 0,
    cancellationChargeInr:
      Number(pickFirst(record, ["cancellationChargeInr", "CancellationChargeInr"], 0)) || 0,
    refundAmountInr:
      Number(pickFirst(record, ["refundAmountInr", "RefundAmountInr"], 0)) || 0,
    status: String(pickFirst(record, ["status", "Status"], "Unknown") || "Unknown"),
    bookedAtUtc: pickFirst(record, ["bookedAtUtc", "BookedAtUtc"], null),
    cancelledAtUtc: pickFirst(record, ["cancelledAtUtc", "CancelledAtUtc"], null),
    cancellationReason: String(
      pickFirst(record, ["cancellationReason", "CancellationReason"], "") || ""
    ),
    tripNumber: String(
      pickFirst(record, ["tripNumber", "TripNumber", "busNumber", "BusNumber"], "") || ""
    ),
    maleCount: Number(pickFirst(record, ["maleCount", "MaleCount"], 0)) || 0,
    femaleCount: Number(pickFirst(record, ["femaleCount", "FemaleCount"], 0)) || 0,
    passengers,
  };
}

function normalizeBusCouponRecord(record) {
  const couponType = normalizeCouponTypeForApi(
    pickFirst(record, ["couponType", "CouponType", "cpnType", "CpnType"], "")
  );
  const rawStatus = String(pickFirst(record, ["status", "Status"], "Active") || "Active");

  return {
    id: pickFirst(record, ["id", "Id", "couponId", "CouponId"], null),
    sourceId: pickFirst(record, ["sourceId", "SourceId"], null),
    busPromotionId: pickFirst(record, ["busPromotionId", "BusPromotionId", "promotionId", "PromotionId"], null),
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
    status: rawStatus.toLowerCase() === "inactive" ? "inactive" : "active",
    maxUsagePerUser:
      Number(pickFirst(record, ["maxUsagePerUser", "MaxUsagePerUser"], 0)) || 0,
    minBookingAmount:
      Number(pickFirst(record, ["minBookingAmount", "MinBookingAmount"], 0)) || 0,
    isAutoApply:
      String(pickFirst(record, ["isAutoApply", "IsAutoApply"], false)).toLowerCase() === "true",
    isExclusive:
      String(pickFirst(record, ["isExclusive", "IsExclusive"], false)).toLowerCase() === "true",
    priority: Number(pickFirst(record, ["priority", "Priority"], 0)) || 0,
    triggerType: String(
      pickFirst(record, ["triggerType", "TriggerType"], "ManualCode") || "ManualCode"
    ),
    promotionCategory: String(
      pickFirst(record, ["promotionCategory", "PromotionCategory"], "Coupon") || "Coupon"
    ),
    remark: String(
      pickFirst(record, ["remark", "Remark", "description", "Description"], "") || ""
    ),
    entryDate: pickFirst(
      record,
      ["entryDate", "EntryDate", "entryDateUtc", "EntryDateUtc", "createdAt", "CreatedAt"],
      null
    ),
  };
}

function normalizeCouponTypeForApi(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "fix" || normalized === "fixed") {
    return "Fixed";
  }

  if (
    normalized === "percent" ||
    normalized === "percentage" ||
    normalized.includes("%")
  ) {
    return "Percentage";
  }

  return String(value || "").trim();
}

function normalizeBusCouponPayload(coupon) {
  const couponType = normalizeCouponTypeForApi(coupon?.cpnType || coupon?.couponType);
  const useLimit = Number(coupon?.useLimit) || 0;
  const maxUsagePerUser = Number(coupon?.maxUsagePerUser) || useLimit;
  const minBookingAmount = Number(coupon?.minBookingAmount) || 0;
  const normalizedStatus = String(coupon?.status || "Active").trim().toLowerCase();
  const apiStatus = normalizedStatus === "inactive" ? "Inactive" : "Active";

  return {
    value: Number(coupon?.value) || 0,
    couponType,
    couponCode: String(coupon?.couponCode || "").trim().toUpperCase(),
    startDate: coupon?.startDate || "",
    expiryDate: coupon?.expiryDate || "",
    useLimit: useLimit,
    usedCount: Number(coupon?.usedCount) || 0,
    status: apiStatus,
    remark: String(coupon?.remark || "").trim(),
    maxUsagePerUser: maxUsagePerUser,
    minBookingAmount: minBookingAmount,
    isAutoApply: Boolean(coupon?.isAutoApply),
    isExclusive: Boolean(coupon?.isExclusive),
    priority: Number(coupon?.priority) || 0,
    triggerType: String(coupon?.triggerType || "ManualCode").trim() || "ManualCode",
    promotionCategory: String(coupon?.promotionCategory || "Coupon").trim() || "Coupon",
  };
}

function unwrapArrayResponse(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.value,
    data?.Value,
    data?.items,
    data?.Items,
    data?.data,
    data?.Data,
    data?.results,
    data?.Results,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizeCouponType(coupon) {
  return String(coupon?.couponType || coupon?.cpnType || "")
    .trim()
    .toLowerCase();
}

function getCouponDiscountAmount(coupon, totalFare) {
  const couponValue = Number(coupon?.value ?? coupon?.cpnValue) || 0;
  const fare = Number(totalFare) || 0;
  const couponType = normalizeCouponType(coupon);

  if (couponType.includes("%") || couponType.includes("percent")) {
    return Math.min(fare, Math.round((fare * couponValue) / 100));
  }

  return Math.min(fare, couponValue);
}

function isDateWithinCouponRange(coupon, now = new Date()) {
  const startDate = coupon?.startDate ? new Date(coupon.startDate) : null;
  const expiryDate = coupon?.expiryDate ? new Date(coupon.expiryDate) : null;

  if (startDate && Number.isFinite(startDate.getTime())) {
    startDate.setHours(0, 0, 0, 0);
    if (now < startDate) {
      return false;
    }
  }

  if (expiryDate && Number.isFinite(expiryDate.getTime())) {
    expiryDate.setHours(23, 59, 59, 999);
    if (now > expiryDate) {
      return false;
    }
  }

  return true;
}

function validateCouponRecord(coupon, { couponCode, totalFare } = {}) {
  const normalizedCode = String(couponCode || "").trim().toUpperCase();
  const fare = Number(totalFare) || 0;

  if (!normalizedCode) {
    return { valid: false, message: "Enter a coupon code." };
  }

  if (!coupon) {
    return { valid: false, message: "Coupon code not found." };
  }

  const couponStatus = String(coupon.status || "").trim().toLowerCase();
  if (couponStatus && couponStatus !== "active") {
    return { valid: false, message: "This coupon is not active." };
  }

  if (!isDateWithinCouponRange(coupon)) {
    return { valid: false, message: "This coupon is expired or not yet valid." };
  }

  const useLimit = Number(coupon.useLimit) || 0;
  const usedCount = Number(coupon.usedCount) || 0;
  if (useLimit > 0 && usedCount >= useLimit) {
    return { valid: false, message: "This coupon usage limit is reached." };
  }

  const minBookingAmount = Number(coupon.minBookingAmount) || 0;
  if (minBookingAmount > 0 && fare < minBookingAmount) {
    return {
      valid: false,
      message: `Minimum booking amount for this coupon is ₹ ${new Intl.NumberFormat(
        "en-IN"
      ).format(minBookingAmount)}.`,
    };
  }

  const discountAmount = getCouponDiscountAmount(coupon, fare);
  if (discountAmount <= 0) {
    return { valid: false, message: "This coupon cannot be applied to this fare." };
  }

  return {
    valid: true,
    message: "Coupon applied successfully.",
    coupon: {
      ...coupon,
      couponType: coupon.couponType || coupon.cpnType,
      cpnType: coupon.cpnType || coupon.couponType,
    },
    discountAmount,
  };
}

function normalizeBusActionResponse(response) {
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

function isFallbackBusId(busId) {
  return String(busId ?? "").trim().toLowerCase().startsWith("fallback-bus-");
}

function buildLocalBusBookingResponse(busId) {
  const suffix = Date.now().toString().slice(-8);

  return normalizeBusActionResponse({
    bookingId: `local-${busId}-${suffix}`,
    bookingReference: `PNB-${suffix}`,
    status: "Booked",
    message: "Booking completed locally.",
  });
}

function normalizeBusUsedCouponRecord(record) {
  return {
    id: pickFirst(record, ["id", "Id"], null),
    bookingId: String(
      pickFirst(record, ["bookingId", "BookingId", "busReservationId", "BusReservationId"], "") ||
        ""
    ),
    couponCode: String(pickFirst(record, ["couponCode", "CouponCode"], "") || "")
      .trim()
      .toUpperCase(),
    userId: String(pickFirst(record, ["userId", "UserId"], "") || ""),
    usedDate: pickFirst(record, ["usedDate", "UsedDate", "usedDateUtc", "UsedDateUtc"], null),
    totalFare: Number(pickFirst(record, ["totalFare", "TotalFare", "totalFareInr", "TotalFareInr"], 0)) || 0,
    cpnType: normalizeCouponTypeForApi(
      pickFirst(record, ["cpnType", "CpnType", "couponType", "CouponType"], "")
    ),
    cpnValue: Number(pickFirst(record, ["cpnValue", "CpnValue", "couponValue", "CouponValue"], 0)) || 0,
    cpnAmount:
      Number(
        pickFirst(record, ["cpnAmount", "CpnAmount", "couponAmountInr", "CouponAmountInr"], 0)
      ) || 0,
    bookingStatus: String(
      pickFirst(record, ["bookingStatus", "BookingStatus"], "") || ""
    ),
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json") || contentType.includes("+json")) {
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

    if (isDatabaseCapacityError(text)) {
      return "Search is temporarily unavailable because the booking server is busy. Please try again in a few minutes.";
    }

    // Filter style and script tags and their content to prevent CSS/JS from spilling into error message
    const cleaned = text.replace(/<(style|script)\b[^>]*>([\s\S]*?)<\/\1>/gi, "");

    const preMatch = cleaned.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch?.[1]) {
      return preMatch[1].replace(/\s+/g, " ").trim().slice(0, 250);
    }

    const noTags = cleaned.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (noTags) {
      return noTags.slice(0, 250);
    }

    return text.slice(0, 250);
  }

  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) {
      if (isDatabaseCapacityError(payload.message)) {
        return "Search is temporarily unavailable because the booking server is busy. Please try again in a few minutes.";
      }
      return payload.message.trim();
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      if (isDatabaseCapacityError(payload.error)) {
        return "Search is temporarily unavailable because the booking server is busy. Please try again in a few minutes.";
      }
      return payload.error.trim();
    }
    if (typeof payload.title === "string" && payload.title.trim()) {
      const validationMessages =
        payload.errors && typeof payload.errors === "object"
          ? Object.values(payload.errors).flat().filter(Boolean)
          : [];
      return [payload.title, ...validationMessages].join(" ").trim();
    }
    if (typeof payload.exception === "string" && payload.exception.trim()) {
      if (isDatabaseCapacityError(payload.exception)) {
        return "Search is temporarily unavailable because the booking server is busy. Please try again in a few minutes.";
      }
      return payload.exception.trim();
    }
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      if (isDatabaseCapacityError(payload.detail)) {
        return "Search is temporarily unavailable because the booking server is busy. Please try again in a few minutes.";
      }
      return payload.detail.trim();
    }
  }

  return "";
}

function isDatabaseCapacityError(value) {
  const message = String(value || "").toLowerCase();
  return (
    message.includes("max_connections_per_hour") ||
    message.includes("too many connections") ||
    message.includes("mysqlconnector") ||
    message.includes("mysql exception")
  );
}

async function requestJson(urlOrPath, options = {}) {
  const {
    skipAuth = false,
    allowAuthFallback: _allowAuthFallback,
    headers: optionHeaders,
    ...fetchOptions
  } = options || {};
  const headers = {
    ...(skipAuth ? { Accept: "application/json", "Content-Type": "application/json" } : getAuthHeaders()),
    ...(optionHeaders || {}),
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
      const error = new Error(normalizedMessage);
      error.status = response.status;
      throw error;
    }

    const error = new Error("Request failed. Please try again.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function shouldFallbackRequest(error, options = {}) {
  const status = Number(error?.status);
  if (status) {
    const fallbackStatuses = options.allowAuthFallback ? [401, 403, 404, 405, 502, 503, 504] : [404, 405, 502, 503, 504];
    return fallbackStatuses.includes(status);
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("cannot get") ||
    message.includes("endpoint")
  );
}

async function requestJsonWithFallback(paths, options = {}) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  let lastError = null;

  for (const path of candidates) {
    try {
      return await requestJson(path, options);
    } catch (error) {
      lastError = error;
      if (!shouldFallbackRequest(error, options)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed. Please try again.");
}

export async function searchBuses({ from, to, date }) {
  const url = buildUrl(BUS_BOOKINGS_ROOT, {
    from,
    fromCity: from,
    to,
    toCity: to,
    date: toDdMmYyyy(date),
  });
  const legacyUrl = buildUrl(LEGACY_BUS_BOOKINGS_ROOT, {
    from,
    fromCity: from,
    to,
    toCity: to,
    date: toDdMmYyyy(date),
  });

  try {
    const data = await requestJsonWithFallback([url, legacyUrl], {
      method: "GET",
      skipAuth: true,
      allowAuthFallback: true,
    });

    const records = Array.isArray(data)
      ? data
      : Array.isArray(data?.buses)
      ? data.buses
      : Array.isArray(data?.Buses)
      ? data.Buses
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.Items)
      ? data.Items
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.Data)
      ? data.Data
      : Array.isArray(data?.value)
      ? data.value
      : Array.isArray(data?.Value)
      ? data.Value
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.Results)
      ? data.Results
      : null;

    if (records) {
      return records.map((record, index) => normalizeBusSearchRecord(record, index));
    }

    const responseText = String(data || "").toLowerCase();
    if (
      responseText.includes("<!doctype html") ||
      responseText.includes("<html") ||
      responseText.includes("cannot get /api/busbookings")
    ) {
      throw new Error(
        "Bus API returned an unexpected HTML response. Check backend/proxy configuration."
      );
    }

    throw new Error("Bus API returned an unexpected response format.");
  } catch (error) {
    if (shouldUseFallbackBuses(error)) {
      return buildFallbackBusSearchRecords({ from, to, date });
    }

    throw error;
  }
}

export async function getBusSeatMap(busId) {
  if (isFallbackBusId(busId)) {
    return buildFallbackSeatMap(busId);
  }

  try {
    const data = await requestJsonWithFallback(
      [`${BUS_BOOKINGS_ROOT}/${busId}/seats`, `${LEGACY_BUS_BOOKINGS_ROOT}/${busId}/seats`],
      { method: "GET", allowAuthFallback: true }
    );

    return {
      tripId: pickFirst(data, ["tripId", "TripId"], busId),
      tripType: pickFirst(data, ["tripType", "TripType"], "Bus"),
      travelClass: pickFirst(data, ["travelClass", "TravelClass"], null),
      layoutType: String(pickFirst(data, ["layoutType", "LayoutType"], "") || ""),
      totalSeats: Number(pickFirst(data, ["totalSeats", "TotalSeats"], 0)) || 0,
      bookedSeats: Number(pickFirst(data, ["bookedSeats", "BookedSeats"], 0)) || 0,
      availableSeats: Number(pickFirst(data, ["availableSeats", "AvailableSeats"], 0)) || 0,
      priceInr: Number(pickFirst(data, ["priceInr", "PriceInr"], 0)) || 0,
      seats: Array.isArray(data.seats || data.Seats)
        ? (data.seats || data.Seats).map(normalizeBusSeatRecord)
        : [],
      seatDefinitions: Array.isArray(data.seatDefinitions || data.SeatDefinitions)
        ? (data.seatDefinitions || data.SeatDefinitions).map(normalizeBusSeatDefinitionRecord)
        : [],
      sections: Array.isArray(data.sections || data.Sections)
        ? (data.sections || data.Sections).map(normalizeBusSeatSectionRecord)
        : [],
      boardingPoints: normalizePointOptionList(
        pickFirst(
          data,
          [
            "boardingPoints",
            "BoardingPoints",
            "boardingPointList",
            "BoardingPointList",
            "boardingStops",
            "BoardingStops",
            "pickupPoints",
            "PickupPoints",
          ],
          []
        )
      ),
      droppingPoints: normalizePointOptionList(
        pickFirst(
          data,
          [
            "droppingPoints",
            "DroppingPoints",
            "droppingPointList",
            "DroppingPointList",
            "droppingStops",
            "DroppingStops",
            "dropPoints",
            "DropPoints",
          ],
          []
        )
      ),
    };
  } catch (error) {
    console.error("Error fetching bus seat map:", error);
    if (shouldUseFallbackBuses(error)) {
      return buildFallbackSeatMap(busId);
    }

    throw error;
  }
}

export async function getBusPricingPreview({ busId, seatCodes, couponCode, promotionId, selectedFeaturedOfferId } = {}) {
  const normalizedSeatCodes = Array.isArray(seatCodes)
    ? seatCodes.map((seatCode) => String(seatCode || "").trim()).filter(Boolean)
    : [];

  let finalCouponCode = couponCode ? String(couponCode).trim().toUpperCase() : null;
  let finalFeaturedOfferId =
    selectedFeaturedOfferId !== undefined &&
    selectedFeaturedOfferId !== null &&
    selectedFeaturedOfferId !== ""
      ? Number(selectedFeaturedOfferId)
      : promotionId !== undefined && promotionId !== null && promotionId !== ""
      ? Number(promotionId)
      : null;
  if (finalFeaturedOfferId !== null && Number.isNaN(finalFeaturedOfferId)) {
    finalFeaturedOfferId = null;
  }

  if (finalFeaturedOfferId) {
    finalCouponCode = null;
  } else if (finalCouponCode) {
    finalFeaturedOfferId = null;
  }

  if (isFallbackBusId(busId)) {
    return buildFallbackPricingPreview(busId, normalizedSeatCodes);
  }

  try {
    const data = await requestJsonWithFallback(
      [`${BUS_BOOKINGS_ROOT}/pricing-preview`, `${LEGACY_BUS_BOOKINGS_ROOT}/pricing-preview`],
      {
        method: "POST",
        allowAuthFallback: true,
        body: JSON.stringify({
          busId,
          seatCodes: normalizedSeatCodes,
          couponCode: finalCouponCode,
          promotionId: null,
          selectedFeaturedOfferId: finalFeaturedOfferId,
        }),
      }
    );

    return normalizeBusPricingPreview(data && typeof data === "object" ? data : {});
  } catch (error) {
    if (!shouldUseFallbackBuses(error)) {
      throw error;
    }

    return buildFallbackPricingPreview(busId, normalizedSeatCodes);
  }
}

export async function bookBus({ busId, payload }) {
  if (isFallbackBusId(busId)) {
    return buildLocalBusBookingResponse(busId);
  }

  const updatedPayload = { ...payload };
  const featuredOfferId = updatedPayload.selectedFeaturedOfferId || updatedPayload.promotionId;
  if (featuredOfferId) {
    updatedPayload.couponCode = null;
    const numericId = Number(featuredOfferId);
    updatedPayload.selectedFeaturedOfferId = Number.isNaN(numericId) ? null : numericId;
    updatedPayload.promotionId = null;
  } else if (updatedPayload.couponCode) {
    updatedPayload.promotionId = null;
    updatedPayload.selectedFeaturedOfferId = null;
  }

  try {
    const data = await requestJsonWithFallback(
      [`${BUS_BOOKINGS_ROOT}/${busId}/book`, `${LEGACY_BUS_BOOKINGS_ROOT}/${busId}/book`],
      {
        method: "POST",
        body: JSON.stringify(updatedPayload),
        allowAuthFallback: true,
      }
    );

    return normalizeBusActionResponse(data);
  } catch (error) {
    if (shouldUseFallbackBuses(error)) {
      return buildLocalBusBookingResponse(busId);
    }

    throw error;
  }
}

export async function listBusCoupons() {
  try {
    const data = await requestJson(`${ADMIN_BUS_ROOT}/coupons`, { method: "GET" });

    return unwrapArrayResponse(data).map((record) => normalizeBusCouponRecord(record));
  } catch {
    return listAvailableBusCoupons();
  }
}

export async function listAvailableBusCoupons() {
  const data = await requestJsonWithFallback(
    [`${BUS_BOOKINGS_ROOT}/user/available`, `${LEGACY_BUS_BOOKINGS_ROOT}/user/available`],
    { method: "GET", skipAuth: true, allowAuthFallback: true }
  );

  return unwrapArrayResponse(data).map((record) => normalizeBusCouponRecord(record));
}

export async function validateBusCoupon({ couponCode, totalFare }) {
  const normalizedCode = String(couponCode || "").trim().toUpperCase();
  const coupons = await listAvailableBusCoupons();

  const coupon = coupons.find(
    (item) => String(item.couponCode || "").toUpperCase() === normalizedCode
  );

  return validateCouponRecord(coupon, {
    couponCode: normalizedCode,
    totalFare,
  });
}

export async function createBusCoupon(coupon) {
  const data = await requestJson(`${ADMIN_BUS_ROOT}/coupons`, {
    method: "POST",
    body: JSON.stringify(normalizeBusCouponPayload(coupon)),
  });

  return normalizeBusCouponRecord(data && typeof data === "object" ? data : coupon);
}

export async function updateBusCoupon(couponId, coupon) {
  const data = await requestJson(`${ADMIN_BUS_ROOT}/coupons/${couponId}`, {
    method: "PUT",
    body: JSON.stringify(normalizeBusCouponPayload({ ...coupon, id: couponId })),
  });

  return normalizeBusCouponRecord(data && typeof data === "object" ? data : coupon);
}

export async function deleteBusCoupon(couponId) {
  await requestJson(`${ADMIN_BUS_ROOT}/coupons/${couponId}`, { method: "DELETE" });
  return true;
}

export async function listBusUsedCoupons({ couponCode, userId, limit = 200 } = {}) {
  const url = buildUrl(`${ADMIN_BUS_ROOT}/coupons/used`, {
    couponCode,
    userId,
    limit,
  });

  const data = await requestJson(url, { method: "GET" });
  return Array.isArray(data)
    ? data.map((record) => normalizeBusUsedCouponRecord(record))
    : [];
}

export async function listBusBookings({ passengerPhone, status } = {}) {
  const url = buildUrl(`${BUS_BOOKINGS_ROOT}/bookings`, {
    passengerPhone,
    status,
  });
  const legacyUrl = buildUrl(`${LEGACY_BUS_BOOKINGS_ROOT}/bookings`, {
    passengerPhone,
    status,
  });

  try {
    const data = await requestJsonWithFallback([url, legacyUrl], { method: "GET" });
    return Array.isArray(data)
      ? data.map((record) => normalizeBusBookingRecord(record))
      : [];
  } catch (error) {
    if (shouldUseFallbackBuses(error)) {
      return [];
    }

    throw error;
  }
}

export async function getBusBookingById(bookingId) {
  const data = await requestJsonWithFallback(
    [`${BUS_BOOKINGS_ROOT}/bookings/${bookingId}`, `${LEGACY_BUS_BOOKINGS_ROOT}/bookings/${bookingId}`],
    { method: "GET" }
  );

  return normalizeBusBookingRecord(data);
}

export async function cancelBusBooking(bookingId, reason) {
  const url = buildUrl(`${BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel`, {
    reason,
  });
  const legacyUrl = buildUrl(`${LEGACY_BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel`, {
    reason,
  });

  const data = await requestJsonWithFallback([url, legacyUrl], { method: "POST" });
  return normalizeBusActionResponse(data);
}

export async function listHotBusRoutes({ metric = "score" } = {}) {
  try {
    const url = buildUrl(`${BUS_BOOKINGS_ROOT}/hot-routes`, { metric });
    const legacyUrl = buildUrl(`${LEGACY_BUS_BOOKINGS_ROOT}/hot-routes`, { metric });
    const data = await requestJsonWithFallback([url, legacyUrl], { method: "GET", skipAuth: true });

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((record, index) => ({
      routeId: pickFirst(record, ["routeId", "RouteId"], null) || `bus-hot-${index + 1}`,
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

function normalizeFeaturedOffer(record) {
  const imageUrl = String(pickFirst(record, ["imageUrl", "ImageUrl"], "") || "");
  const apiBase = resolveApiBaseUrl();

  const absoluteImageUrl =
    imageUrl && !imageUrl.startsWith("http")
      ? `${apiBase.replace(/\/+$/, "")}/${imageUrl.replace(/^\/+/, "")}`
      : imageUrl;

  const rawId = pickFirst(record, ["id", "Id"], null);
  const rawOfferId = pickFirst(record, ["offerId", "OfferId"], null);

  const promo = record?.promotion || record?.Promotion || null;

  const rawPromotionId = promo
    ? pickFirst(promo, ["id", "Id"], null)
    : pickFirst(record, ["promotionId", "PromotionId"], null);

  const couponCode = promo
    ? String(pickFirst(promo, ["code", "Code"], "") || "").toUpperCase()
    : String(pickFirst(record, ["couponCode", "CouponCode"], "") || "").toUpperCase();

  const isPercentageDiscount = promo
    ? String(pickFirst(promo, ["discountType", "DiscountType"], "")).toLowerCase() === "percentage"
    : Boolean(pickFirst(record, ["isPercentageDiscount", "IsPercentageDiscount"], false));

  const discountValue = promo
    ? Number(pickFirst(promo, ["discountValue", "DiscountValue"], 0)) || 0
    : Number(pickFirst(record, ["discountValue", "DiscountValue"], 0)) || 0;

  const couponExpiresAtUtc = promo
    ? pickFirst(promo, ["endDateUtc", "EndDateUtc"], null)
    : pickFirst(record, ["couponExpiresAtUtc", "CouponExpiresAtUtc"], null);

  return {
    id: rawId !== null ? Number(rawId) : null,
    offerId: rawOfferId || rawId,
    selectedFeaturedOfferId: rawId || rawOfferId,
    promotionId:
      rawPromotionId !== null &&
      rawPromotionId !== undefined &&
      rawPromotionId !== "" &&
      Number.isFinite(Number(rawPromotionId))
        ? Number(rawPromotionId)
        : null,
    title: String(pickFirst(record, ["title", "Title"], "") || ""),
    subtitle: String(pickFirst(record, ["subtitle", "Subtitle"], "") || ""),
    description: String(pickFirst(record, ["description", "Description"], "") || ""),
    couponCode,
    basePrice: Number(pickFirst(record, ["basePrice", "BasePrice"], 0)) || 0,
    isPercentageDiscount,
    discountValue,
    couponExpiresAtUtc,
    isCouponActive: pickFirst(record, ["isCouponActive", "IsCouponActive"], true) !== false,
    bookingType: String(pickFirst(record, ["bookingType", "BookingType"], "") || ""),
    imageUrl: absoluteImageUrl,
    previewFinalPrice: Number(pickFirst(record, ["previewFinalPrice", "PreviewFinalPrice"], 0)) || 0,
  };
}

export async function getFeaturedBusOffers() {
  try {
    const data = await requestJson("/api/FeaturedOffers", {
      method: "GET",
      skipAuth: true,
    });
    const rawOffers = Array.isArray(data)
      ? data
      : Array.isArray(data?.offers)
      ? data.offers
      : [];

    return rawOffers
      .map(normalizeFeaturedOffer)
      .filter(
        (offer) =>
          (offer.id || offer.offerId || offer.selectedFeaturedOfferId) &&
          offer.isCouponActive &&
          String(offer.bookingType).toLowerCase() === "bus"
      );
  } catch {
    return [];
  }
}

export async function cancelBusPassengers(bookingId, passengerIds, reason) {
  const url = `${BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel-passengers`;
  const legacyUrl = `${LEGACY_BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel-passengers`;

  const data = await requestJsonWithFallback([url, legacyUrl], {
    method: "POST",
    body: JSON.stringify({ passengerIds, reason }),
  });
  return normalizeBusBookingRecord(data);
}
