/* eslint-disable */
import { toAuthUrl, readApiMessage } from "./authService";

async function requestHotelJson(urlOrPath, options = {}, fallbackMessage = "Hotel request failed.") {
  const activePortal = window.sessionStorage.getItem("active_portal") || "b2c";
  const token = activePortal === "b2b"
    ? (window.localStorage.getItem("b2b_token") || window.localStorage.getItem("token"))
    : (window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token"));
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

// ==========================================
// NEW HOTEL API ENDPOINTS
// ==========================================

const CITY_TO_TBO_CODE = {
  hyderabad: "HYD",
  bengaluru: "BLR",
  bangalore: "BLR",
  mumbai: "BOM",
  delhi: "725862",
  "new delhi": "725862",
  noida: "725862",
  gurgaon: "725862",
  gurugram: "725862",
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
  const rawInput = String(cityInput).trim();
  if (/^\d+$/.test(rawInput)) return rawInput;
  const cleanInput = rawInput.toLowerCase();
  const bracketMatch = cleanInput.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1].trim().length === 3) {
    return bracketMatch[1].trim().toUpperCase();
  }
  if (cleanInput.length === 3) return cleanInput.toUpperCase();
  const cityNameOnly = cleanInput.split(",")[0].split("(")[0].trim();
  if (CITY_TO_TBO_CODE[cityNameOnly]) return CITY_TO_TBO_CODE[cityNameOnly];
  const alphaOnly = cityNameOnly.replace(/[^a-z0-9]/g, "");
  return alphaOnly.slice(0, 6).toUpperCase() || "HYD";
}

export async function searchHotels(options) {
  const { city, checkInDate, checkOutDate, roomsConfig } = options;
  
  // Default to 1 room, 2 adults if no config provided
  const config = Array.isArray(roomsConfig) && roomsConfig.length > 0 
    ? roomsConfig 
    : [{ adults: 2, children: 0, childAges: [] }];
    
  const nights = Math.max(1, Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / 86400000));
  
  const payload = {
    CheckInDate: checkInDate,
    CheckOutDate: checkOutDate,
    NoOfNights: String(nights),
    BookingMode: "5",
    CountryCode: "IN",
    CityId: resolveCityCode(city),
    ResultCount: "0",
    PreferredCurrency: "INR",
    GuestNationality: "IN",
    RequestType: "1",
    NoOfRooms: String(config.length),
    RoomGuests: config.map(room => ({
      NoOfAdults: String(room.adults || 1),
      NoOfChild: String(room.children || 0),
      ChildAge: Array.isArray(room.childAges) ? room.childAges : []
    })),
    PreferredHotel: "",
    MaxRating: "5",
    MinRating: "1",
    ReviewScore: 0,
    IsNearBySearchAllowed: true
  };

  try {
    const response = await requestHotelJson(
      `/api/Hotels/SearchHotels`,
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to search hotels."
    );
    
    let hotels = [];
    let traceId = response?.traceId || response?.TraceId || response?.HotelSearchResult?.TraceId || "";
    let srdvType = response?.srdvType || response?.SrdvType || response?.HotelSearchResult?.SrdvType || "MixAPI";

    if (response?.results && Array.isArray(response.results)) {
      hotels = response.results;
    } else if (response?.HotelSearchResult?.HotelResults) {
      hotels = response.HotelSearchResult.HotelResults;
    } else if (Array.isArray(response)) {
      hotels = response;
    }

    return hotels.map(h => ({
      ...h,
      TraceId: h.TraceId || h.traceId || traceId,
      traceId: h.traceId || h.TraceId || traceId,
      SrdvType: h.SrdvType || h.srdvType || srdvType,
      srdvType: h.srdvType || h.SrdvType || srdvType
    }));
  } catch (err) {
    console.error("Backend hotel search failed:", err);
    throw err;
  }
}

export async function getHotelInfo(payload) {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/GetHotelInfo",
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to fetch hotel info."
    );
    return response;
  } catch (err) {
    console.error("Backend getHotelInfo failed", err);
    throw err;
  }
}

export async function getHotelRoom(payload) {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/GetHotelRoom",
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to fetch hotel rooms."
    );
    return response;
  } catch (err) {
    console.error("Backend getHotelRoom failed", err);
    throw err;
  }
}

export async function blockRoom(payload) {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/BlockRoom",
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to block room."
    );
    return response;
  } catch (err) {
    console.error("Backend blockRoom failed", err);
    throw err;
  }
}

export async function bookHotelRoom(payload) {
  try {
    return await requestHotelJson(
      "/api/Hotels/BookRoom",
      { method: "POST", body: JSON.stringify(payload) },
      "Hotel booking failed."
    );
  } catch (err) {
    console.error("Backend booking API failed:", err);
    throw err;
  }
}

export async function getMyHotelBookings() {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/my-bookings",
      { method: "GET" },
      "Unable to load hotel bookings."
    );
    return response?.data || response || [];
  } catch (err) {
    console.error("Backend loading of hotel bookings failed:", err);
    throw err;
  }
}

export async function cancelHotelBooking(booking, reason = "User requested cancellation") {
  const internalId = booking.id || booking.bookingId;
  
  if (!internalId) {
    throw new Error("Unable to identify internal booking ID for cancellation.");
  }

  try {
    const url = `/api/Hotels/bookings/${internalId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`;
    return await requestHotelJson(
      url,
      { method: "POST" },
      "Unable to cancel hotel booking."
    );
  } catch (err) {
    console.error("Backend cancellation failed:", err);
    throw err;
  }
}