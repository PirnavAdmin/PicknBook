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

function getMockHotels(city) {
  const cleanCity = String(city || "Delhi").trim();
  const capitalizedCity = cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1).toLowerCase();

  const mockTemplates = [
    {
      nameSuffix: "Grand Plaza & Suites",
      starRating: 5,
      price: 4500,
      oldPrice: 5300,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Parking", "Room service"],
      address: "102, Central Business District",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=60",
      lat: 28.6139,
      lng: 77.2090
    },
    {
      nameSuffix: "Palm Cove Resort & Spa",
      starRating: 5,
      price: 8900,
      oldPrice: 11000,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Parking", "Swimming Pool"],
      address: "Plot 14, Beachside Promenade",
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=60",
      lat: 28.6250,
      lng: 77.2200
    },
    {
      nameSuffix: "Heritage Luxury Villas",
      starRating: 5,
      price: 12500,
      oldPrice: 15600,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Parking", "Private Pool"],
      address: "Lane 4, Green Meadows Estate",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=60",
      lat: 28.6010,
      lng: 77.1890
    },
    {
      nameSuffix: "Skyline Views Apartment",
      starRating: 4,
      price: 3200,
      oldPrice: 3800,
      facilities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Washing Machine"],
      address: "Suite 405, Downtown Heights",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=60",
      lat: 28.6300,
      lng: 77.2150
    },
    {
      nameSuffix: "The Velvet Boutique Hotel",
      starRating: 4,
      price: 6800,
      oldPrice: 8500,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Bar", "Room service"],
      address: "18, Arts & Culture District",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&auto=format&fit=crop&q=60",
      lat: 28.5900,
      lng: 77.2300
    },
    {
      nameSuffix: "Urban Stay Serviced Apartments",
      starRating: 4,
      price: 5200,
      oldPrice: 6100,
      facilities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Parking"],
      address: "B-Block, Financial District",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=60",
      lat: 28.6100,
      lng: 77.2400
    },
    {
      nameSuffix: "Cozy Valley Vacation Home",
      starRating: 4,
      price: 7500,
      oldPrice: 9400,
      facilities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Parking", "Garden"],
      address: "House 9, Scenic Hills Outlook",
      image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=60",
      lat: 28.5800,
      lng: 77.2000
    },
    {
      nameSuffix: "Executive Business Hotel",
      starRating: 4,
      price: 4900,
      oldPrice: 5800,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Meeting Rooms", "Gym"],
      address: "Tech Park Central",
      image: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&auto=format&fit=crop&q=60",
      lat: 28.6200,
      lng: 77.2500
    },
    {
      nameSuffix: "Sunset Beach Resort",
      starRating: 5,
      price: 11000,
      oldPrice: 13750,
      facilities: ["Wi-Fi", "Breakfast", "Air Conditioning", "Beach Access", "Bar"],
      address: "Plot 88, Golden Sands Shoreline",
      image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&auto=format&fit=crop&q=60",
      lat: 28.6400,
      lng: 77.2600
    }
  ];

  return mockTemplates.map((template, idx) => ({
    hotelId: `mock-hotel-${idx}-${cleanCity.toLowerCase()}`,
    hotelCode: `mock-hotel-${idx}-${cleanCity.toLowerCase()}`,
    hotelName: `${capitalizedCity} ${template.nameSuffix}`,
    starRating: template.starRating,
    price: {
      offeredPrice: template.price,
      b2CBasePrice: template.price
    },
    oldPrice: template.oldPrice,
    facilities: [
      {
        facilitiesNames: template.facilities
      }
    ],
    hotelAddress: `${template.address}, ${capitalizedCity}`,
    hotelPicture: template.image,
    latitude: template.lat,
    longitude: template.lng,
    city: capitalizedCity,
    area: template.address.split(",")[1]?.trim() || "City center",
    traceId: "mock-trace-id",
    srdvType: "MixAPI",
    resultIndex: String(idx + 1)
  }));
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
    let traceId = response?.traceId || response?.TraceId || response?.HotelSearchResult?.TraceId || "mock-trace-id";
    let srdvType = response?.srdvType || response?.SrdvType || response?.HotelSearchResult?.SrdvType || "MixAPI";

    if (response?.results && Array.isArray(response.results) && response.results.length > 0) {
      hotels = response.results;
    } else if (response?.HotelSearchResult?.HotelResults && response.HotelSearchResult.HotelResults.length > 0) {
      hotels = response.HotelSearchResult.HotelResults;
    } else if (Array.isArray(response) && response.length > 0) {
      hotels = response;
    }

    if (hotels.length === 0) {
      console.warn("TBO search returned empty results or error. Falling back to local mock hotels.");
      return getMockHotels(city);
    }

    return hotels.map(h => ({
      ...h,
      TraceId: h.TraceId || h.traceId || traceId,
      traceId: h.traceId || h.TraceId || traceId,
      SrdvType: h.SrdvType || h.srdvType || srdvType,
      srdvType: h.srdvType || h.SrdvType || srdvType
    }));
  } catch (err) {
    console.error("Backend hotel search failed, falling back to local mock hotels:", err);
    return getMockHotels(city);
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
  // Use ProviderBookingId/SrdvBookingId (which is the supplier's ID) if available, otherwise fallback to internal ID
  const supplierBookingId = booking.providerBookingId || booking.srdvBookingId || booking.id || booking.bookingId;
  let numericId = parseInt(String(supplierBookingId).replace(/\D/g, ''), 10);
  
  const payload = {
    BookingId: numericId,
    RequestType: 3,
    Remarks: reason,
    SrdvType: booking.srdvType || "B2C",
    SrdvIndex: booking.srdvIndex || "0",
    TraceId: booking.traceId || ""
  };
  try {
    return await requestHotelJson(
      `/api/Hotels/CancelRoom`,
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to cancel hotel booking."
    );
  } catch (err) {
    console.error("Backend cancellation failed:", err);
    throw err;
  }
}