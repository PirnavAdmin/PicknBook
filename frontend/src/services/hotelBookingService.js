import { toAuthUrl, readApiMessage } from "./authService";

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.Data)) {
    return payload.Data;
  }

  if (Array.isArray(payload?.hotels)) {
    return payload.hotels;
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

function normalizeHotelOffer(offer = {}, index = 0) {
  const price = pickFirst(offer, ["price", "Price", "totalPrice", "TotalPrice"], 0);
  const currency = pickFirst(offer, ["currency", "Currency"], "INR");
  const roomCategory = pickFirst(offer, ["roomCategory", "RoomCategory", "roomType", "RoomType"], "Standard Room");

  return {
    ...offer,
    offerId: String(pickFirst(offer, ["offerId", "OfferId", "id", "Id"], `hotel-offer-${index + 1}`)),
    price: Number(price) || 0,
    currency,
    roomCategory,
    bedType: pickFirst(offer, ["bedType", "BedType"], "Double"),
    roomDescription: pickFirst(offer, ["roomDescription", "RoomDescription", "description", "Description"], roomCategory),
    cancellationPolicy: pickFirst(offer, ["cancellationPolicy", "CancellationPolicy"], "Cancellation policy applies"),
    paymentType: pickFirst(offer, ["paymentType", "PaymentType"], ""),
    checkInDate: pickFirst(offer, ["checkInDate", "CheckInDate"], ""),
    checkOutDate: pickFirst(offer, ["checkOutDate", "CheckOutDate"], ""),
  };
}

function normalizeHotelRecord(hotel = {}, index = 0) {
  const name = pickFirst(hotel, ["name", "Name", "hotelName", "HotelName"], `Hotel stay ${index + 1}`);
  const cityCode = pickFirst(hotel, ["cityCode", "CityCode", "city", "City"], "");
  const rawOffers = pickFirst(hotel, ["offers", "Offers"], []);
  const offers = Array.isArray(rawOffers)
    ? rawOffers.map((offer, offerIndex) => normalizeHotelOffer(offer, offerIndex))
    : [];

  return {
    ...hotel,
    hotelId: String(pickFirst(hotel, ["hotelId", "HotelId", "id", "Id"], `hotel-${index + 1}`)),
    name,
    cityCode,
    address: pickFirst(hotel, ["address", "Address"], cityCode),
    rating: Number(pickFirst(hotel, ["rating", "Rating"], 4.4)) || 4.4,
    amenities: pickFirst(hotel, ["amenities", "Amenities"], ["Wi-Fi", "Breakfast"]),
    offers,
  };
}

async function requestHotelJson(urlOrPath, options = {}, fallbackMessage = "Hotel request failed.") {
  const token = window.localStorage.getItem("token");
  const resolvedUrl = toAuthUrl(urlOrPath);
  const headers = {
    Accept: "application/json, text/plain, */*",
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const parsed = new URL(resolvedUrl, window.location.origin);
    if (parsed.hostname.includes("ngrok-free.dev") || parsed.hostname.includes("ngrok.io")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }
  } catch {
    // Keep the request usable for relative URLs.
  }

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(readApiMessage(payload, fallbackMessage) || fallbackMessage);
  }

  return payload;
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
  pune: "PNQ",
  ahmedabad: "AMD",
  kochi: "COK",
  cochin: "COK",
  tirupati: "TIR",
};

function resolveCityCode(cityInput) {
  if (!cityInput) return "HYD";
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

  const alphaOnly = cityNameOnly.replace(/[^a-z]/g, "");
  return alphaOnly.slice(0, 3).toUpperCase() || "HYD";
}

export async function searchHotelOffers({ cityCode, checkInDate, checkOutDate, adults = 1, rooms = 1 }) {
  const resolvedCode = resolveCityCode(cityCode);
  const params = new URLSearchParams({
    cityCode: resolvedCode,
    checkInDate,
    checkOutDate,
    adults: String(Math.max(1, Number(adults) || 1)),
    rooms: String(Math.max(1, Number(rooms) || 1)),
  });

  const payload = await requestHotelJson(
    `/api/hotels/search?${params.toString()}`,
    { method: "GET" },
    "Unable to search hotels."
  );

  return normalizePayload(payload);
}

export async function searchHotels({ city, cityCode, destination, checkInDate, checkOutDate, adults = 1, rooms = 1 }) {
  const hotels = await searchHotelOffers({
    cityCode: cityCode || city || destination,
    checkInDate,
    checkOutDate,
    adults,
    rooms,
  });

  return hotels.map((hotel, index) => normalizeHotelRecord(hotel, index));
}

export async function getHotelOfferDetails(offerId) {
  const payload = await requestHotelJson(
    `/api/hotels/offers/${encodeURIComponent(offerId)}`,
    { method: "GET" },
    "Selected hotel offer is no longer available."
  );

  const offer =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.data || payload.Data || payload.offer || payload.Offer || payload
      : payload;

  return normalizeHotelOffer(offer);
}

export function getOfferDetails(offerId) {
  return getHotelOfferDetails(offerId);
}

export async function bookHotelOffer({ offerId, guestName, guestEmail, guestPhone, couponCode, selectedFeaturedOfferId }) {
  return requestHotelJson(
    "/api/hotels/book",
    {
      method: "POST",
      body: JSON.stringify({
        offerId,
        guestName,
        guestEmail,
        guestPhone,
        couponCode,
        selectedFeaturedOfferId,
      }),
    },
    "Hotel booking failed."
  );
}

export async function getHotelPricingPreview(payload) {
  return requestHotelJson(
    "/api/hotels/pricing-preview",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Unable to calculate pricing preview."
  );
}

export function bookHotel(payload) {
  return bookHotelOffer(payload);
}

export async function getMyHotelBookings() {
  const payload = await requestHotelJson(
    "/api/hotels/my-bookings",
    { method: "GET" },
    "Unable to load hotel bookings."
  );

  return normalizePayload(payload);
}

export async function cancelHotelBooking(bookingId, reason = "") {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return requestHotelJson(
    `/api/hotels/bookings/${encodeURIComponent(bookingId)}/cancel${query}`,
    { method: "POST" },
    "Unable to cancel hotel booking."
  );
}

export async function getHotelPromotions() {
  const payload = await requestHotelJson(
    "/api/hotels/promotions",
    { method: "GET" },
    "Unable to load active hotel promotions."
  );

  return normalizePayload(payload);
}
