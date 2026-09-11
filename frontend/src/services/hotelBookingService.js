/* eslint-disable */
import { toAuthUrl, readApiMessage } from "./authService";
import mockHyderabadHotels from "../data/mockHyderabadHotels.json";

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



export async function searchHotels(options) {
  const { cityId, countryCode, city, destination, checkInDate, checkOutDate, roomsConfig } = options;

  const cityName = String(destination || city || "").trim();
  if (!cityName) {
    throw new Error("A valid destination city must be provided.");
  }

  const normalizedCityId = String(cityId || "");
  const isHyderabadFallback = /hyderabad/i.test(cityName) || normalizedCityId === "2947514";

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
    CityId: normalizedCityId,
    ResultCount: "500",
    PreferredCurrency: "INR",
    GuestNationality: "IN",
    NoOfRooms: String(config.length),
    RoomGuests: config.map(room => ({
      NoOfAdults: String(room.adults || 1),
      NoOfChild: String(room.children || 0),
      ChildAge: Array.isArray(room.childAges) ? room.childAges.map(String) : []
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

    if (!Array.isArray(hotels) || hotels.length === 0) {
      const fallbackHotels = Array.isArray(mockHyderabadHotels)
        ? mockHyderabadHotels
        : (mockHyderabadHotels?.hotels || []);
      if (isHyderabadFallback && Array.isArray(fallbackHotels) && fallbackHotels.length > 0) {
        hotels = fallbackHotels;
      }
    }

    return hotels.map(h => {
      const normalizedHotel = {
        ...h,
        hotelLocation: h.hotelLocation || h.hotelAddress || h.hotelDescription || h.location || h.area || "",
        hotelAddress: h.hotelAddress || h.hotelLocation || h.hotelDescription || h.address || "",
        hotelDescription: h.hotelDescription || h.hotelAddress || h.location || h.description || "",
        hotelPromotion: h.hotelPromotion || h.HotelPromotion || h.hotelPolicy || h.HotelPolicy || "",
        hotelCategory: h.hotelCategory || h.HotelCategory || h.propertyType || h.propertyCategory || "",
        roomCategory: h.roomCategory || h.RoomCategory || h.cateogry || h.category || h.rooms?.[0]?.cateogry || h.rooms?.[0]?.category || "",
        TraceId: h.TraceId || h.traceId || traceId,
        traceId: h.traceId || h.TraceId || traceId,
        SrdvType: h.SrdvType || h.srdvType || srdvType || "MixAPI",
        srdvType: h.srdvType || h.SrdvType || srdvType || "MixAPI"
      };
      return normalizedHotel;
    });
  } catch (err) {
    console.error("Backend hotel search failed:", err);
    if (isHyderabadFallback) {
      const fallbackHotels = Array.isArray(mockHyderabadHotels)
        ? mockHyderabadHotels
        : (mockHyderabadHotels?.hotels || []);
      if (Array.isArray(fallbackHotels) && fallbackHotels.length > 0) {
        return fallbackHotels.map(h => ({
          ...h,
          hotelLocation: h.hotelLocation || h.hotelAddress || h.hotelDescription || h.location || h.area || "",
          hotelAddress: h.hotelAddress || h.hotelLocation || h.hotelDescription || h.address || "",
          hotelDescription: h.hotelDescription || h.hotelAddress || h.location || h.description || "",
          hotelPromotion: h.hotelPromotion || h.HotelPromotion || h.hotelPolicy || h.HotelPolicy || "",
          hotelCategory: h.hotelCategory || h.HotelCategory || h.propertyType || h.propertyCategory || "",
          roomCategory: h.roomCategory || h.RoomCategory || h.cateogry || h.category || h.rooms?.[0]?.cateogry || h.rooms?.[0]?.category || "",
          SrdvType: h.SrdvType || h.srdvType || "MixAPI",
          srdvType: h.srdvType || h.SrdvType || "MixAPI",
        }));
      }
    }
    throw err;
  }
}

export async function getHotelInfo(payload) {
  const fullPayload = {
    TraceId: payload.TraceId || payload.traceId || "",
    SrdvType: payload.SrdvType || payload.srdvType || "MixAPI",
    SrdvIndex: payload.SrdvIndex || payload.srdvIndex || "",
    ResultIndex: payload.ResultIndex || payload.resultIndex || "",
    HotelCode: payload.HotelCode || payload.hotelCode || ""
  };
  try {
    const response = await requestHotelJson(
      "/api/Hotels/GetHotelInfo",
      { method: "POST", body: JSON.stringify(fullPayload) },
      "Unable to fetch hotel info."
    );
    return response;
  } catch (err) {
    console.error("Backend getHotelInfo failed", err);
    throw err;
  }
}

export async function getHotelRoom(payload) {
  const fullPayload = {
    TraceId: payload.TraceId || payload.traceId || "",
    SrdvType: payload.SrdvType || payload.srdvType || "MixAPI",
    SrdvIndex: payload.SrdvIndex || payload.srdvIndex || "",
    ResultIndex: payload.ResultIndex || payload.resultIndex || "",
    HotelCode: payload.HotelCode || payload.hotelCode || ""
  };
  try {
    const response = await requestHotelJson(
      "/api/Hotels/GetHotelRoom",
      { method: "POST", body: JSON.stringify(fullPayload) },
      "Unable to fetch hotel rooms."
    );
    return response;
  } catch (err) {
    console.error("Backend getHotelRoom failed", err);
    throw err;
  }
}

export async function blockRoom(payload) {
  const fullPayload = {
    TraceId: payload.TraceId || payload.traceId || "",
    SrdvType: payload.SrdvType || payload.srdvType || "MixAPI",
    SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || ""),
    ResultIndex: payload.ResultIndex || payload.resultIndex || "",
    HotelCode: payload.HotelCode || payload.hotelCode || "",
    HotelName: payload.HotelName || payload.hotelName || "",
    GuestNationality: payload.GuestNationality || payload.guestNationality || "IN",
    NoOfRooms: Number(payload.NoOfRooms || payload.noOfRooms || 1),
    ClientReferenceNo: String(payload.ClientReferenceNo || payload.clientReferenceNo || "0"),
    IsVoucherBooking: Boolean(payload.IsVoucherBooking === undefined ? payload.isVoucherBooking : payload.IsVoucherBooking) || false,
    CouponCode: payload.CouponCode || payload.couponCode || "",
    HotelRoomsDetails: Array.isArray(payload.HotelRoomsDetails || payload.hotelRoomsDetails) ? (payload.HotelRoomsDetails || payload.hotelRoomsDetails) : []
  };
  try {
    const response = await requestHotelJson(
      "/api/Hotels/BlockRoom",
      { method: "POST", body: JSON.stringify(fullPayload) },
      "Unable to block room."
    );
    return response;
  } catch (err) {
    console.error("Backend blockRoom failed", err);
    throw err;
  }
}

export async function bookHotelRoom(payload) {
  const fullPayload = {
    TraceId: payload.TraceId || payload.traceId || "",
    SrdvType: payload.SrdvType || payload.srdvType || "MixAPI",
    SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || ""),
    ResultIndex: payload.ResultIndex || payload.resultIndex || "",
    HotelCode: payload.HotelCode || payload.hotelCode || "",
    HotelName: payload.HotelName || payload.hotelName || "",
    GuestNationality: payload.GuestNationality || payload.guestNationality || "IN",
    NoOfRooms: Number(payload.NoOfRooms || payload.noOfRooms || 1),
    ClientReferenceNo: String(payload.ClientReferenceNo || payload.clientReferenceNo || "0"),
    IsVoucherBooking: Boolean(payload.IsVoucherBooking === undefined ? payload.isVoucherBooking : payload.IsVoucherBooking) || true,
    GuestName: payload.GuestName || payload.guestName || "",
    GuestEmail: payload.GuestEmail || payload.guestEmail || "",
    GuestPhone: String(payload.GuestPhone || payload.guestPhone || ""),
    Price: Number(payload.Price || payload.price || 0),
    HotelRoomsDetails: Array.isArray(payload.HotelRoomsDetails || payload.hotelRoomsDetails) ? (payload.HotelRoomsDetails || payload.hotelRoomsDetails) : [],
    PaymentMethod: payload.PaymentMethod || payload.paymentMethod || ""
  };
  try {
    return await requestHotelJson(
      "/api/Hotels/BookRoom",
      { method: "POST", body: JSON.stringify(fullPayload) },
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

export async function cancelHotelBooking(booking, reason = "User requested cancellation", { refundPreference = "Original" } = {}) {
  const internalId = booking.id || booking.bookingId;
  
  if (!internalId) {
    throw new Error("Unable to identify internal booking ID for cancellation.");
  }

  try {
    const url = `/api/Hotels/bookings/${internalId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}&refundPreference=${encodeURIComponent(refundPreference)}` : `?refundPreference=${encodeURIComponent(refundPreference)}`}`;
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

export async function getHotelActiveCoupons() {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/coupons/active",
      { method: "GET" },
      "Unable to fetch active hotel coupons."
    );
    return response;
  } catch (err) {
    console.error("Backend fetch active coupons failed:", err);
    throw err;
  }
}

export async function validateHotelCoupon(payload) {
  try {
    const response = await requestHotelJson(
      "/api/Hotels/coupons/validate",
      { method: "POST", body: JSON.stringify(payload) },
      "Unable to validate hotel coupon."
    );
    return response;
  } catch (err) {
    console.error("Backend validate coupon failed:", err);
    throw err;
  }
}