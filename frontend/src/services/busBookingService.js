/* eslint-disable */
import { toDdMmYyyy } from "../utils/apiDateFormat";

const FALLBACK_API_BASE_URL =
  "https://www.picknbook.in";

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
    "ngrok-skip-browser-warning": "true",
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
  const explicitBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BUS_API_BASE_URL;

  if (explicitBase && explicitBase.trim()) {
    return explicitBase.trim();
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
    priceInr: Number(pickFirst(record, ["b2CDisplayFare", "B2CDisplayFare", "b2cDisplayFare"], 0)) || Number(pickFirst(record, ["priceInr", "PriceInr", "DisplayFare"], 0)) || 0,
    availableSeats:
      Number(pickFirst(record, ["availableSeats", "AvailableSeats"], 0)) || 0,
    totalSeats: Number(pickFirst(record, ["totalSeats", "TotalSeats"], 0)) || 0,
    idProofRequired: Boolean(
      pickFirst(record, ["idProofRequired", "IdProofRequired", "isIdProofRequired", "IsIdProofRequired"], false)
    ),
    IdProofRequired: Boolean(
      pickFirst(record, ["idProofRequired", "IdProofRequired", "isIdProofRequired", "IsIdProofRequired"], false)
    ),
  };
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
  const gstAmount =
    Number(pickFirst(payload, ["gstAmount", "GstAmount"], 0)) || 0;
    
  // Use the actual subtotalBeforeCoupon from the API when available.
  // Only fall back to (finalAmount - gstAmount) when the API doesn't provide it
  // (e.g. no coupon applied, so finalAmount already equals base + gst).
  const rawSubtotalBeforeCoupon =
    Number(pickFirst(payload, ["subtotalBeforeCoupon", "SubtotalBeforeCoupon"], 0)) || 0;
  const subtotalBeforeCoupon = rawSubtotalBeforeCoupon > 0
    ? rawSubtotalBeforeCoupon
    : finalAmount - gstAmount;

  const taxableFare =
    Number(pickFirst(payload, ["taxableFare", "TaxableFare"], 0)) || 0;
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
  if (!pricingPreview) return Number(fallbackDiscount) || 0;

  const couponDiscount = Number(pricingPreview.couponDiscountAmount) || 0;
  const manualDiscount = Number(pricingPreview.manualDiscountAmount) || 0;
  const promoDiscount = Number(pricingPreview.promotionDiscountAmount) || Number(pricingPreview.discountAmount) || 0;
  const rawCouponAmount = Number(pricingPreview.couponAmount) || 0;

  const totalDiscount = Number(pricingPreview.totalDiscount) || 0;
  const autoDiscount = Number(pricingPreview.autoDiscountAmount) || 0;
  const nonAutoDiscount = Math.max(0, totalDiscount - autoDiscount);

  if (couponDiscount + manualDiscount > 0) {
    return couponDiscount + manualDiscount;
  }

  if (promoDiscount > 0) {
    return promoDiscount;
  }

  if (rawCouponAmount > 0) {
    return rawCouponAmount;
  }

  if (nonAutoDiscount > 0) {
    return nonAutoDiscount;
  }

  if (totalDiscount > 0) {
    return totalDiscount;
  }

  return Number(fallbackDiscount) || 0;
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
      message: `Minimum booking amount for this coupon is â‚¹ ${new Intl.NumberFormat(
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

function toYyyyMmDdDate(inputDate) {
  if (!inputDate) return "";
  if (typeof inputDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(inputDate.trim())) {
    return inputDate.trim();
  }
  const d = new Date(inputDate);
  if (Number.isNaN(d.getTime())) return String(inputDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}



async function resolveCityCode(cityStrOrCode) {
  if (!cityStrOrCode) return "";
  const trimmed = String(cityStrOrCode).trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  
  try {
    const cities = await searchBusCities(trimmed);
    const match = cities.find(c => (c.cityName || c.name || "").toLowerCase() === trimmed.toLowerCase()) || cities[0];
    if (match) {
      return String(match.cityId || match.code || match.id || "").trim();
    }
  } catch(e) {
    console.error("resolveCityCode error:", e);
  }
  return trimmed;
}

export async function searchBuses({ from, to, date, fromCityCode, toCityCode, sourceCode, destinationCode }) {
  const formattedDate = toYyyyMmDdDate(date);
  
  const rawFromCode = fromCityCode || sourceCode || from;
  const rawToCode = toCityCode || destinationCode || to;

  const finalFromCode = await resolveCityCode(rawFromCode);
  const finalToCode = await resolveCityCode(rawToCode);

  if (!finalFromCode || !finalToCode) {
    throw new Error("A valid source and destination city must be selected from the suggestions.");
  }

  const postSearchUrl = `${BUS_BOOKINGS_ROOT}/search`;

  try {
    const data = await requestJson(postSearchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromCityCode: finalFromCode,
        toCityCode: finalToCode,
        departDate: formattedDate,
      }),
    });

    const topTraceId = String(data?.TraceId || data?.traceId || "");
    if (topTraceId) {
      try {
        sessionStorage.setItem("last_bus_trace_id", topTraceId);
      } catch (e) {}
    }

    const extractArray = (obj) => {
      if (!obj || typeof obj !== "object") return null;
      if (Array.isArray(obj)) return obj;
      // Check Result first â€” the SRDV response wraps the bus list in "Result"
      const priorityKeys = [
        "Result", "result",
        "buses", "Buses", "busList", "BusList", "items", "Items",
        "data", "Data", "value", "Value", "results", "Results",
        "trips", "Trips", "availableBuses", "AvailableBuses",
        "busSearchList", "BusSearchList", "searchResult", "SearchResult"
      ];
      for (const key of priorityKeys) {
        if (Array.isArray(obj[key])) return obj[key];
      }
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) return obj[key];
      }
      return null;
    };

    const normalizeBusSearchRecord = (record, index) => {
      if (!record || typeof record !== "object") return null;

      // Map SRDV field names to frontend-expected fields
      const operatorName =
        record.TravelsName || record.OperatorName || record.travelsName || record.operatorName || "Unknown Operator";
      const busType =
        record.BusType || record.busType || record.type || "";
      const boardingPoints =
        Array.isArray(record.BoardingPoints) ? record.BoardingPoints :
        Array.isArray(record.boardingPoints) ? record.boardingPoints : [];
      const droppingPoints =
        Array.isArray(record.DroppingPoints) ? record.DroppingPoints :
        Array.isArray(record.droppingPoints) ? record.droppingPoints : [];

      let departureTime = record.DepartureTime || record.departureTime || record.departure || "";
      if (boardingPoints.length > 0) {
        const firstB = boardingPoints[0];
        if (firstB && (firstB.Time || firstB.time)) {
          departureTime = firstB.Time || firstB.time;
        }
      }

      let arrivalTime = record.ArrivalTime || record.arrivalTime || record.arrival || "";
      if (droppingPoints.length > 0) {
        const lastD = droppingPoints[droppingPoints.length - 1];
        if (lastD && (lastD.Time || lastD.time)) {
          arrivalTime = lastD.Time || lastD.time;
        }
      }

      let busNumber = String(
        record.BusNumber ||
          record.busNumber ||
          record.BusNo ||
          record.busNo ||
          record.VehicleNumber ||
          record.vehicleNumber ||
          record.RegNo ||
          record.regNo ||
          record.RouteNo ||
          record.routeNo ||
          record.ServiceId ||
          record.serviceId ||
          record.TripId ||
          record.tripId ||
          ""
      ).trim();

      if (!busNumber || busNumber === "--" || busNumber === "null" || busNumber === "undefined") {
        const words = String(operatorName).trim().split(/\s+/).filter(Boolean);
        let prefix = "PNB";
        if (words.length >= 2) {
          prefix = (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1 && words[0].length >= 2) {
          prefix = words[0].slice(0, 3).toUpperCase();
        }
        const numId = parseInt(String(record.Id || record.id || index + 1).replace(/\D/g, ""), 10) || (index + 1);
        busNumber = `${prefix}-${1000 + (numId % 9000)}`;
      }

      const isSleeper =
        String(record.Sleeper ?? record.sleeper ?? "false").toLowerCase() === "true" ||
        String(busType).toLowerCase().includes("sleeper");

      const availableSeats =
        parseInt(record.AvailableSeats ?? record.availableSeats ?? record.seatsAvailable ?? 0, 10);
      let totalSeats =
        parseInt(record.TotalSeats ?? record.totalSeats ?? record.TotalSeatCount ?? record.MaxSeats ?? record.Capacity ?? 0, 10);

      if (!totalSeats || totalSeats <= availableSeats) {
        totalSeats = isSleeper
          ? Math.max(availableSeats + 14, 36)
          : Math.max(availableSeats + 18, 44);
      }

      const priceList =
        Array.isArray(record.Price) ? record.Price :
        Array.isArray(record.price) ? record.price : [];

      const getB2CDisplayFare = (p) => {
        if (!p || typeof p !== "object") return 0;
        const b2cKey = Object.keys(p).find((k) => k.toLowerCase() === "b2cdisplayfare");
        if (b2cKey && parseFloat(p[b2cKey]) > 0) return parseFloat(p[b2cKey]);
        const baseKey = Object.keys(p).find((k) => k.toLowerCase() === "basefare");
        const markupKey = Object.keys(p).find((k) => k.toLowerCase() === "agentmarkup" || k.toLowerCase() === "markup");
        const base = baseKey ? parseFloat(p[baseKey]) : 0;
        const markup = markupKey ? parseFloat(p[markupKey]) : 0;
        if (base > 0) return base + markup;
        const priceInr = parseFloat(p.PriceInr ?? p.priceInr ?? p.DisplayFare ?? p.displayFare ?? 0);
        if (priceInr > 0) return priceInr;
        const pub = parseFloat(p.PublishedFare ?? p.publishedFare ?? p.fare ?? 0);
        return pub > 0 ? pub : 0;
      };

      let displayFare = 0;
      if (priceList.length > 0) {
        const validB2CFares = priceList.map(getB2CDisplayFare).filter((f) => f > 0);
        if (validB2CFares.length > 0) {
          displayFare = Math.min(...validB2CFares);
        }
      }
      if (!displayFare || displayFare <= 0) {
        displayFare = getB2CDisplayFare(record) || parseFloat(record.B2CDisplayFare ?? record.b2CDisplayFare ?? record.DisplayFare ?? record.displayFare ?? record.fare ?? 0);
      }

      const resultIndex =
        String(record.ResultIndex || record.resultIndex || record.Id || index);
      const traceId =
        String(record.TraceId || record.traceId || topTraceId || "");
      const srdvIndex =
        String(record.SrdvIndex ?? record.srdvIndex ?? "0");
      const routeId =
        record.RouteId || record.routeId || "";
      const operatorId =
        record.OperatorId || record.operatorId || "";
      const isAC =
        String(record.IsAC ?? record.isAC ?? "false").toLowerCase() === "true";
      const isSeater =
        String(record.Seater ?? record.seater ?? "false").toLowerCase() === "true";

      const amenities =
        Array.isArray(record.Amenities) ? record.Amenities :
        Array.isArray(record.amenities) ? record.amenities : [];
      const cancellationPolicies =
        Array.isArray(record.CancellationPolicies) ? record.CancellationPolicies :
        Array.isArray(record.cancellationPolicies) ? record.cancellationPolicies : [];

      return {
        id: record.Id || record.id || index,
        resultIndex,
        traceId,
        srdvIndex,
        routeId,
        operatorId,
        operatorName,
        busNumber,
        busType,
        departureTime,
        arrivalTime,
        departureTimeIst: departureTime,
        arrivalTimeIst: arrivalTime,
        departureTimeUtc: departureTime,
        arrivalTimeUtc: arrivalTime,
        duration: record.Duration || record.duration || 0,
        availableSeats,
        totalSeats,
        maxSeatsPerTicket: parseInt(record.MaxSeatsPerTicket ?? record.maxSeatsPerTicket ?? 6, 10),
        fare: displayFare,
        displayFare,
        b2cDisplayFare: displayFare,
        isAC,
        isSleeper,
        isSeater,
        mTicketEnabled: String(record.MTicketEnabled ?? "false").toLowerCase() === "true",
        idProofRequired: String(record.IdProofRequired ?? "false").toLowerCase() === "true",
        liveTracking: String(record.LiveTracking ?? "false").toLowerCase() === "true",
        boardingPoints,
        droppingPoints,
        amenities: amenities.map((a) => (typeof a === "string" ? a : a?.Name || a?.name || "")),
        priceList,
        cancellationPolicies,
        partialCancellationAllowed: String(record.PartialCancellationAllowed ?? "false").toLowerCase() === "true",
        isArrivingNextDay: String(record.IsArrivingNextDay ?? "false").toLowerCase() === "true",
      };
    };

    const records = extractArray(data) || [];

    if (Array.isArray(records)) {
      return records
        .map((record, index) => normalizeBusSearchRecord(record, index))
        .filter(Boolean);
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

    throw new Error(`Bus API returned an invalid response format: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("[busBookingService] searchBuses Error:", error);
    throw error;
  }
}

export async function searchBusCities(query) {
  const q = String(query || "").trim();
  if (!q) return [];

  try {
    const data = await requestJson(`${BUS_BOOKINGS_ROOT}/search-cities?query=${encodeURIComponent(q)}`, {
      method: "GET",
      skipAuth: true,
    });
    let list = Array.isArray(data) ? data : (data?.Cities || data?.Result || data?.data || data?.value || []);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error("[busBookingService] searchBusCities Error:", error);
    return [];
  }
}

export async function getBusSeatLayoutProxy({ traceId, srdvIndex, resultIndex }) {
  try {
    const data = await requestJson(`${BUS_BOOKINGS_ROOT}/seat-layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traceId: String(traceId),
        srdvIndex: String(srdvIndex),
        resultIndex: String(resultIndex),
      }),
    });
    return data;
  } catch (error) {
    console.error("[busBookingService] getBusSeatLayoutProxy Error:", error);
    throw error;
  }
}

export async function getBoardingPointsProxy({ traceId, srdvIndex, resultIndex }) {
  try {
    const data = await requestJson(`${BUS_BOOKINGS_ROOT}/boarding-points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traceId: String(traceId),
        srdvIndex: String(srdvIndex),
        resultIndex: String(resultIndex),
      }),
    });
    return data;
  } catch (error) {
    console.error("[busBookingService] getBoardingPointsProxy Error:", error);
    throw error;
  }
}

export async function blockBusProxy({ traceId, resultIndex, srdvIndex, boardingPointId, droppingPointId, passengers }) {
  try {
    const data = await requestJson(`${BUS_BOOKINGS_ROOT}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traceId: String(traceId),
        resultIndex: String(resultIndex),
        srdvIndex: Number(srdvIndex),
        boardingPointId: String(boardingPointId),
        droppingPointId: String(droppingPointId),
        passengers,
      }),
    });
    return data;
  } catch (error) {
    console.error("[busBookingService] blockBusProxy Error:", error);
    throw error;
  }
}

export async function getBusSeatMap(busParam, proxyParams = null) {
  try {
    let traceId = "";
    let srdvIndex = "0";
    let resultIndex = "";

    if (proxyParams && (proxyParams.traceId || proxyParams.resultIndex)) {
      traceId = String(proxyParams.traceId || "");
      srdvIndex = String(proxyParams.srdvIndex ?? "0");
      resultIndex = String(proxyParams.resultIndex || "");
    } else if (typeof busParam === "object" && busParam !== null) {
      traceId = String(busParam.traceId || busParam.TraceId || busParam.searchContext?.traceId || "");
      srdvIndex = String(busParam.srdvIndex ?? busParam.SrdvIndex ?? "0");
      resultIndex = String(busParam.resultIndex || busParam.ResultIndex || busParam.id || "");
    } else if (typeof busParam === "string" || typeof busParam === "number") {
      resultIndex = String(busParam);
    }

    if (!traceId || !resultIndex) {
      throw new Error("Missing required TraceId or ResultIndex for seat layout.");
    }

    const payload = {
      traceId: String(traceId),
      srdvIndex: String(srdvIndex),
      resultIndex: String(resultIndex),
    };

    const data = await getBusSeatLayoutProxy(payload);

    let pointsData = null;
    try {
      pointsData = await getBoardingPointsProxy(payload);
    } catch (e) {
      console.warn("Failed to fetch boarding points proxy", e);
    }

    const extractPoints = (resp, key) => {
      if (!resp) return [];
      if (Array.isArray(resp[key])) return resp[key];
      
      const res = resp.Result || resp.result || resp.GetBoardingPointDetailsResult || resp.data;
      if (res && Array.isArray(res[key])) return res[key];
      if (res && Array.isArray(res[`${key}Details`])) return res[`${key}Details`];
      
      const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
      if (Array.isArray(resp[lowerKey])) return resp[lowerKey];
      if (res && Array.isArray(res[lowerKey])) return res[lowerKey];
      
      return [];
    };

    const bpFromPoints = extractPoints(pointsData, "BoardingPoints");
    const bpFromData = extractPoints(data, "BoardingPoints");
    const boardingPoints = bpFromPoints.length > 0 ? bpFromPoints : bpFromData;

    const dpFromPoints = extractPoints(pointsData, "DroppingPoints");
    const dpFromData = extractPoints(data, "DroppingPoints");
    const droppingPoints = dpFromPoints.length > 0 ? dpFromPoints : dpFromData;

    // Process raw SRDV / Provider seat object returned by POST /api/BusBookings/seat-layout
    const rawSeats = [];
    const extractRawSeatList = (container) => {
      if (!container || typeof container !== "object") return;
      Object.values(container).forEach((val) => {
        if (Array.isArray(val)) {
          val.forEach((s) => s && rawSeats.push(s));
        } else if (val && typeof val === "object") {
          Object.values(val).forEach((s) => s && rawSeats.push(s));
        }
      });
    };

    if (data && data.Result && typeof data.Result === "object" && !Array.isArray(data.Result)) {
      extractRawSeatList(data.Result);
      if (data.ResultUpperSeat) extractRawSeatList(data.ResultUpperSeat);
    } else if (Array.isArray(data?.Result)) {
      data.Result.forEach((s) => s && rawSeats.push(s));
    }

    const seats = rawSeats.map((s) => {
      const baseFare    = Number(s?.Price?.BaseFare || 0);
      const tax         = Number(s?.Price?.Tax || s?.Price?.GSTAmount || s?.Price?.ServiceTax || 0);
      const markup      = Number(s?.Price?.AgentMarkUp || s?.Price?.MarkUp || 0);

      // As per integration guide:
      // Price.B2CDisplayFare = Base + Markup only (no GST) - Show on seat icon
      // Price.PublishedFare = BaseFare + Tax + Markup = the full customer-facing price.
      const b2cDisplayFare = Number(s?.Price?.B2CDisplayFare || 0) || (baseFare + markup);
      const publishedFare = Number(s?.Price?.PublishedFare || 0) || (baseFare + tax + markup);

      const seatFare = b2cDisplayFare; // Show tax-exclusive on seat icon

      const isAvailable = String(s?.SeatStatus).toLowerCase() === "true";

      return {
        seatCode:      String(s?.SeatName || ""),
        seatType:      String(s?.SeatType || "Seater"),
        priceInr:      b2cDisplayFare,
        b2cDisplayFare: b2cDisplayFare,
        publishedFare,
        baseFare,
        tax,
        externalGst:   tax, // Added for Pricing Preview explicitly
        seatFare,
        markupAmount:  markup,
        fareBeforeTax: b2cDisplayFare,
        isBooked:      !isAvailable,
        gender:        String(s?.IsLadiesSeat).toLowerCase() === "true" ? "Female" : "",
      };
    });


    const seatDefinitions = rawSeats.map((s) => ({
      seatCode: String(s?.SeatName || ""),
      seatType: String(s?.SeatType || "Seater"),
      deck: s?.IsUpper ? "Upper" : "Lower",
      row: Number(s?.RowNo) || 0,
      column: Number(s?.ColumnNo) || 0,
      isSleeper:
        !String(s?.SeatType || "").toLowerCase().includes("semi") &&
        (String(s?.SeatType || "").toLowerCase().includes("sleeper") ||
          String(s?.DoubleBirth).toLowerCase() === "true"),
      isUpper: Boolean(s?.IsUpper),
      sectionLabel: s?.IsUpper ? "Upper deck" : "Lower deck",
    }));

    return {
      tripId: data?.TraceId || params.traceId,
      tripType: "Bus",
      travelClass: null,
      layoutType: seats.some((st) => st.seatType.toLowerCase().includes("sleeper")) ? "Sleeper" : "Seater",
      totalSeats: seats.length,
      bookedSeats: seats.filter((st) => st.isBooked).length,
      availableSeats: Number(data?.AvailableSeats) || seats.filter((st) => !st.isBooked).length,
      priceInr: seats[0]?.priceInr || 0,
      seats,
      seatDefinitions,
      sections: [],
      boardingPoints,
      droppingPoints,
      // Pass raw SRDV response so SeatSelection can use Result/ResultUpperSeat directly
      rawLayoutData: data,
    };
  } catch (error) {
    console.error("[busBookingService] getBusSeatMap Error:", error);
    throw error;
  }
}

export async function getBusPricingPreview({
  traceId,
  passengers = [],
  couponCode,
  promotionId,
  selectedFeaturedOfferId,
  fromCity,
  toCity,
  departureTime,
  operatorName,
  busType,
  totalFare
} = {}) {
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

  // Cross-reference couponCode with featured offers if not already set
  if (finalCouponCode && !finalFeaturedOfferId) {
    try {
      const offers = await getFeaturedBusOffers();
      const matchingOffer = offers.find(
        (o) => String(o.couponCode || "").toUpperCase() === finalCouponCode
      );
      if (matchingOffer) {
        finalFeaturedOfferId = matchingOffer.id || matchingOffer.offerId || matchingOffer.selectedFeaturedOfferId || null;
      }
    } catch {
      // Ignore lookup error
    }
  }

  const seatsPayload = passengers.map(p => ({
    seatCode: p.seatNumber || p.seatName || p.seatCode,
    seatType: p.seatType || "Seater",
    baseFare: Number(p.baseFare || p.fareBeforeTax || p.priceInr || 0),
    externalGst: Number(p.tax || p.externalGst || p.gstAmount || 0)
  }));

  const calculatedBaseFare = seatsPayload.reduce((sum, s) => sum + Number(s.baseFare || 0), 0) || Number(totalFare || 0);
  const calculatedTax = seatsPayload.reduce((sum, s) => sum + Number(s.externalGst || 0), 0);

  try {
    const data = await requestJsonWithFallback(
      [`${BUS_BOOKINGS_ROOT}/pricing-preview`, `${LEGACY_BUS_BOOKINGS_ROOT}/pricing-preview`],
      {
        method: "POST",
        allowAuthFallback: true,
        body: JSON.stringify({
          traceId: String(traceId || ""),
          couponCode: finalCouponCode,
          seats: seatsPayload,
          promotionId: finalFeaturedOfferId ? null : promotionId,
          selectedFeaturedOfferId: finalFeaturedOfferId,
          fromCity: String(fromCity || ""),
          toCity: String(toCity || ""),
          departureTime: String(departureTime || ""),
          operatorName: String(operatorName || ""),
          busType: String(busType || ""),
          totalFare: calculatedBaseFare
        }),
      }
    );

    return normalizeBusPricingPreview(data && typeof data === "object" ? data : {});
  } catch (error) {
    // If the API explicitly rejected the request (e.g. 400 validation error), throw it immediately.
    // Do not bypass the backend's validation by using local coupon calculation!
    if (error?.status >= 400 && error?.status < 500) {
      throw error;
    }

    console.warn("[busBookingService] Remote pricing-preview failed, checking local coupon catalog:", error?.message || error);

    // If coupon was provided and remote failed, validate locally against active coupons & offers
    if (finalCouponCode || finalFeaturedOfferId) {
      let matchedDiscount = 0;
      let appliedPromoCode = finalCouponCode;

      // 1. Check Bus Coupons
      if (finalCouponCode) {
        try {
          const availableCoupons = await listAvailableBusCoupons();
          const couponRecord = availableCoupons.find(
            (c) => String(c.couponCode || "").toUpperCase() === finalCouponCode
          );
          if (couponRecord) {
            const validation = validateCouponRecord(couponRecord, {
              couponCode: finalCouponCode,
              totalFare: calculatedBaseFare,
            });
            if (validation.valid && validation.discountAmount > 0) {
              matchedDiscount = validation.discountAmount;
              appliedPromoCode = finalCouponCode;
            } else if (!validation.valid) {
              throw new Error(validation.message || "Invalid or inactive coupon code.");
            }
          }
        } catch (valErr) {
          if (valErr.message && !valErr.message.includes("fetch")) {
            throw valErr;
          }
        }
      }

      // 2. Check Featured Offers if not matched yet
      if (matchedDiscount <= 0 && (finalFeaturedOfferId || finalCouponCode)) {
        try {
          const offers = await getFeaturedBusOffers();
          const offerRecord = offers.find(
            (o) =>
              (finalFeaturedOfferId && (o.id === finalFeaturedOfferId || o.offerId === finalFeaturedOfferId)) ||
              (finalCouponCode && String(o.couponCode || "").toUpperCase() === finalCouponCode)
          );
          if (offerRecord) {
            const isPercent = offerRecord.isPercentageDiscount;
            const val = Number(offerRecord.discountValue || 0);
            matchedDiscount = isPercent ? Math.round((calculatedBaseFare * val) / 100) : val;
            appliedPromoCode = offerRecord.couponCode || `OFFER-${offerRecord.id}`;
          }
        } catch {
          // Ignore
        }
      }

      if (matchedDiscount > 0) {
        const finalGrandTotal = Math.max(0, calculatedBaseFare - matchedDiscount + calculatedTax);
        return normalizeBusPricingPreview({
          subtotalBeforeCoupon: calculatedBaseFare,
          taxableFare: calculatedBaseFare,
          gstAmount: calculatedTax,
          couponDiscountAmount: matchedDiscount,
          promotionDiscountAmount: matchedDiscount,
          totalDiscount: matchedDiscount,
          finalAmount: finalGrandTotal,
          grandTotal: finalGrandTotal,
          appliedPromotionCode: appliedPromoCode,
          seats: seatsPayload,
        });
      }

      // If genuinely not found in active catalogs, throw clear error
      throw new Error(error?.message || "Invalid or inactive coupon code.");
    }

    // Fallback if no coupon was requested but preview failed
    const fallbackGrandTotal = calculatedBaseFare + calculatedTax;
    return normalizeBusPricingPreview({
      subtotalBeforeCoupon: calculatedBaseFare,
      taxableFare: calculatedBaseFare,
      gstAmount: calculatedTax,
      couponDiscountAmount: 0,
      totalDiscount: 0,
      finalAmount: fallbackGrandTotal,
      grandTotal: fallbackGrandTotal,
      seats: seatsPayload,
    });
  }
}

export async function bookBus({ busId, payload }) {

  const featuredOfferId = payload.selectedFeaturedOfferId || payload.promotionId;
  let finalCouponCode = payload.couponCode ? String(payload.couponCode).trim().toUpperCase() : null;
  let finalFeaturedOfferId = featuredOfferId ? Number(featuredOfferId) : null;
  if (Number.isNaN(finalFeaturedOfferId)) finalFeaturedOfferId = null;

  if (finalFeaturedOfferId) {
    finalCouponCode = null;
  } else if (finalCouponCode) {
    finalFeaturedOfferId = null;
  }

  const isIdProofRequired = Boolean(payload.isIdProofRequired);

  const passengersPayload = (payload.passengers || []).map((p) => {
    const rawGen = String(p.gender || p.Gender || "").trim().toLowerCase();
    const gender =
      rawGen === "female" || rawGen === "f" || rawGen === "2" || rawGen === "ms" || rawGen === "mrs"
        ? "Female"
        : "Male";

    const title = String(p.title || (gender === "Female" ? "Ms" : "Mr")).trim();

    const idProofProps = isIdProofRequired ? {
      idType: p.idType || p.idProofType || "Aadhar",
      idNumber: p.idNumber || p.idProofNumber || "123456789012"
    } : {};

    return {
      title,
      firstName: String(p.firstName || "").trim(),
      lastName: String(p.lastName || "").trim(),
      fullName: String(p.fullName || p.FullName || `${p.firstName || ""} ${p.lastName || ""}`).trim(),
      gender,
      age: Number(p.age || p.Age) || 25,
      seatCode: p.seatNumber || p.seatName || p.SeatNumber || p.seatCode,
      seatNumber: p.seatNumber || p.seatName || p.SeatNumber || p.seatCode,
      isLadiesSeat: Boolean(p.isLadiesSeat),
      baseFare: Number(p.baseFare || p.BaseFare || 0),
      seatType:
        String(p.seatType || p.SeatType || "Seater").charAt(0).toUpperCase() +
        String(p.seatType || p.SeatType || "Seater").slice(1),
      externalGst: Number(p.tax || p.externalGst || p.ExternalGst || 0),
      ...idProofProps
    };
  });

  const updatedPayload = {
    traceId: String(payload.traceId || payload.TraceId || ""),
    resultIndex: String(payload.resultIndex || payload.ResultIndex || ""),
    srdvIndex: Number(payload.srdvIndex || payload.SrdvIndex || 0),
    blockKey: String(payload.srdvBlockKey || payload.blockKey || payload.BlockKey || ""),
    fromCity: String(payload.fromCity || ""),
    toCity: String(payload.toCity || ""),
    departureTime: String(payload.departureTime || ""),
    arrivalTime: String(payload.arrivalTime || ""),
    operatorName: String(payload.operatorName || ""),
    busType: String(payload.busType || ""),
    totalFare: Number(payload.totalFare || 0),
    boardingPointId: String(payload.boardingPointId || payload.BoardingPointId || ""),
    boardingPointName: String(payload.boardingPointName || payload.BoardingPointName || ""),
    boardingPointTime: null,
    droppingPointId: String(payload.droppingPointId || payload.DroppingPointId || ""),
    droppingPointName: String(payload.droppingPointName || payload.DroppingPointName || ""),
    droppingPointTime: null,
    passengerName: String(payload.passengerName || payload.PassengerName || ""),
    passengerPhone: String(payload.passengerPhone || payload.PassengerPhone || ""),
    passengerEmail: String(payload.passengerEmail || payload.PassengerEmail || ""),
    couponCode: finalCouponCode,
    seats: Number(payload.seats || passengersPayload.length || 1),
    promotionId: finalFeaturedOfferId ? null : (payload.promotionId ? Number(payload.promotionId) : null),
    selectedFeaturedOfferId: finalFeaturedOfferId ? Number(finalFeaturedOfferId) : null,
    passengers: passengersPayload,
    paymentMethod: String(payload.paymentMethod || "")
  };

  console.log("SENDING_TO_BACKEND", JSON.stringify(updatedPayload, null, 2));

  try {
    const data = await requestJsonWithFallback(
      [`${BUS_BOOKINGS_ROOT}/book`, `${LEGACY_BUS_BOOKINGS_ROOT}/book`],
      {
        method: "POST",
        body: JSON.stringify(updatedPayload),
        allowAuthFallback: false,
      }
    );

    return normalizeBusActionResponse(data);
  } catch (error) {
    console.error("[busBookingService] bookBus Error:", error);
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

export function isBusCategoryOfferOrCoupon(item) {
  if (!item || typeof item !== "object") return false;

  const rawBookingType = String(
    item.bookingType ||
      item.BookingType ||
      item.serviceType ||
      item.ServiceType ||
      item.category ||
      item.Category ||
      ""
  )
    .trim()
    .toLowerCase();

  if (
    rawBookingType === "flight" ||
    rawBookingType === "flights" ||
    rawBookingType === "hotel" ||
    rawBookingType === "hotels"
  ) {
    return false;
  }

  const code = String(
    item.couponCode || item.CouponCode || item.code || item.Code || ""
  ).toUpperCase();
  const description = String(
    item.description ||
      item.Description ||
      item.remark ||
      item.Remark ||
      item.title ||
      item.Title ||
      item.subtitle ||
      item.Subtitle ||
      ""
  ).toUpperCase();

  if (
    code.includes("FLY") ||
    code.includes("FLIGHT") ||
    code.includes("HOTEL") ||
    code.includes("STAY") ||
    code.startsWith("AIR") ||
    description.includes("FLIGHT") ||
    description.includes("HOTEL")
  ) {
    if (
      !code.includes("BUS") &&
      !code.includes("WHEEL") &&
      !description.includes("BUS")
    ) {
      return false;
    }
  }

  return true;
}

export async function listAvailableBusCoupons() {
  const data = await requestJsonWithFallback(
    [`${BUS_BOOKINGS_ROOT}/user/available`, `${LEGACY_BUS_BOOKINGS_ROOT}/user/available`],
    { method: "GET", skipAuth: true, allowAuthFallback: true }
  );

  return unwrapArrayResponse(data)
    .map((record) => normalizeBusCouponRecord(record))
    .filter((coupon) => isBusCategoryOfferOrCoupon(coupon));
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

  const data = await requestJsonWithFallback([url, legacyUrl], { method: "GET" });
  return Array.isArray(data)
    ? data.map((record) => normalizeBusBookingRecord(record))
    : [];
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
          isBusCategoryOfferOrCoupon(offer) &&
          (String(offer.bookingType).toLowerCase() === "bus" ||
            !offer.bookingType ||
            String(offer.bookingType).toLowerCase() === "all")
      );
  } catch {
    return [];
  }
}

export async function cancelBusPassengers(bookingId, seatNumbers, reason) {
  const url = `${BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel-passengers`;
  const legacyUrl = `${LEGACY_BUS_BOOKINGS_ROOT}/bookings/${bookingId}/cancel-passengers`;

  const data = await requestJsonWithFallback([url, legacyUrl], {
    method: "POST",
    body: JSON.stringify({ seatNumbers, reason }),
  });
  return normalizeBusBookingRecord(data);
}
