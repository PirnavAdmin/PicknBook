/* eslint-disable */
import { toAuthUrl, readApiMessage } from "./authService";
import { fetchCouponsAndOffers } from "./unifiedCouponService";

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
    CouponCode: String(payload.CouponCode || payload.couponCode || "").trim().toUpperCase(),
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

export async function getMyHotelBookings({ status = "all" } = {}) {
  try {
    const response = await requestHotelJson(
      `/api/hotel/my-bookings?${new URLSearchParams({ status: String(status).trim().toLowerCase() })}`,
      { method: "GET" },
      "Unable to load hotel bookings."
    );
    const records = Array.isArray(response) ? response : response?.tickets ?? response?.bookings ?? response?.data;
    return Array.isArray(records) ? records.filter(Boolean).map(record => ({ ...record, status: record.canonicalStatus ?? record.bookingStatus ?? record.tripState ?? record.status ?? "Unknown", createdAt: record.bookingTime ?? record.createdAt })) : [];
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

// ==========================================
// HOTEL COUPONS & OFFERS ENDPOINTS
// ==========================================

function normalizeHotelCouponRecord(record) {
  const code = String(record?.couponCode || record?.CouponCode || "").trim().toUpperCase();
  const rawType = String(record?.couponType || record?.CouponType || record?.discountType || "Percentage");
  const isPercent = rawType.toLowerCase().includes("percent");
  const value = Number(record?.value ?? record?.Value ?? record?.discountValue ?? 0);
  const minAmount = Number(record?.minBookingAmount ?? record?.MinBookingAmount ?? 0);
  const maxDiscount = Number(record?.maxDiscountAmount ?? record?.MaxDiscountAmount ?? 0);
  const expiry = record?.expiryDate || record?.ExpiryDate || record?.endDateUtc || record?.EndDateUtc;

  return {
    id: record?.id ?? record?.Id ?? record?.offerId ?? code,
    couponCode: code,
    title: record?.title || record?.Title || (code ? `Hotel Coupon: ${code}` : "Hotel Promotion"),
    description: record?.description || record?.Description || record?.remark || record?.Remark || "",
    couponType: rawType,
    discountType: rawType,
    value,
    discountValue: value,
    isPercentageDiscount: isPercent,
    minBookingAmount: minAmount,
    maxDiscountAmount: maxDiscount,
    startDate: record?.startDate || record?.StartDate,
    expiryDate: expiry,
    validTill: expiry,
    serviceType: "hotel",
    bookingType: "hotel",
    category: record?.promotionCategory || record?.category || "Coupon",
    type: "coupon",
    isActive: String(record?.status || "Active").toLowerCase() !== "inactive",
    isFirstTimeUserOnly: Boolean(record?.isFirstTimeUserOnly ?? record?.IsFirstTimeUserOnly),
    isExclusive: Boolean(record?.isExclusive ?? record?.IsExclusive),
    conditions: Array.isArray(record?.conditions) ? record.conditions : (Array.isArray(record?.Conditions) ? record.Conditions : []),
    imageUrl: record?.imageUrl || null,
    remark: record?.remark || ""
  };
}

export async function listAvailableHotelCoupons() {
  const response = await requestHotelJson(
    "/api/Coupons?serviceType=hotel&category=Coupon",
    { method: "GET" },
    "Unable to fetch hotel coupons."
  );
  const rawList = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
  return rawList
    .map(normalizeHotelCouponRecord)
    .filter((c) => c.couponCode && c.isActive);
}

export async function getFeaturedHotelOffers() {
  const response = await requestHotelJson(
    "/api/Coupons?serviceType=hotel&category=Offer",
    { method: "GET" },
    "Unable to fetch hotel offers."
  );
  const rawList = Array.isArray(response) ? response : (Array.isArray(response?.offers) ? response.offers : (Array.isArray(response?.data) ? response.data : []));
  return rawList
    .map((item) => {
      const normalized = normalizeHotelCouponRecord(item);
      return {
        ...normalized,
        type: "offer",
        subtitle: item.subtitle || normalized.title
      };
    })
    .filter((o) => o.isActive);
}

export async function getHotelActiveCoupons() {
  return listAvailableHotelCoupons();
}

/**
 * Validates hotel offer/coupon conditions locally (min amount, date range, day-of-week, etc.)
 */
export function validateOfferConditions(offer, { totalAmount = 0, checkInDate = "" } = {}) {
  if (!offer) {
    return { isValid: false, message: "Offer or coupon not found." };
  }

  // 1. Active status
  if (offer.isActive === false || String(offer.status || "Active").toLowerCase() === "inactive") {
    return { isValid: false, message: "This offer is currently inactive." };
  }

  // 2. Minimum booking amount
  const minAmount = Number(offer.minBookingAmount || 0);
  if (minAmount > 0 && totalAmount < minAmount) {
    return {
      isValid: false,
      message: `Minimum booking amount of ₹${new Intl.NumberFormat("en-IN").format(minAmount)} is required to apply this offer (current total: ₹${new Intl.NumberFormat("en-IN").format(Math.round(totalAmount))}).`
    };
  }

  // 3. Date validity (StartDate & ExpiryDate)
  const todayStr = new Date().toISOString().split("T")[0];
  if (offer.startDate) {
    const startStr = String(offer.startDate).split("T")[0];
    if (todayStr < startStr) {
      return { isValid: false, message: "This offer is not yet active." };
    }
  }
  if (offer.expiryDate) {
    const expiryStr = String(offer.expiryDate).split("T")[0];
    if (todayStr > expiryStr) {
      return { isValid: false, message: "This offer has expired." };
    }
  }

  // 4. Check-in Day of Week & Weekend conditions
  const titleOrCode = `${offer.couponCode || ""} ${offer.title || ""} ${offer.description || ""}`.toUpperCase();
  const isWeekendOffer = titleOrCode.includes("WEEKEND");

  if (isWeekendOffer || (Array.isArray(offer.conditions) && offer.conditions.length > 0)) {
    let parsedCin = null;
    if (checkInDate) {
      parsedCin = new Date(checkInDate);
      // Support DD-MM-YYYY format
      if (Number.isNaN(parsedCin.getTime())) {
        const parts = String(checkInDate).match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (parts) {
          parsedCin = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
        }
      }
    }

    if (!parsedCin || Number.isNaN(parsedCin.getTime())) {
      if (isWeekendOffer) {
        return {
          isValid: false,
          message: "Check-in date is required to verify weekend eligibility for this offer."
        };
      }
    } else {
      const dayIndex = parsedCin.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = dayNames[dayIndex];

      if (isWeekendOffer) {
        const isWeekend = dayIndex === 0 || dayIndex === 5 || dayIndex === 6; // Fri, Sat, Sun
        if (!isWeekend) {
          return {
            isValid: false,
            message: `This weekend offer is only valid for check-in on Friday, Saturday, or Sunday (your check-in is on ${currentDay}).`
          };
        }
      }

      // Check explicit conditions list if present
      if (Array.isArray(offer.conditions) && offer.conditions.length > 0) {
        for (const cond of offer.conditions) {
          const type = String(cond.conditionType || cond.ConditionType || "").toLowerCase();
          if (type === "dayofweek") {
            const rawVal = String(cond.value1 || cond.Value1 || "").trim();
            if (rawVal && rawVal.toUpperCase() !== "ALL") {
              const allowedDays = rawVal.split(/[,;]/).map((d) => d.trim().toLowerCase());
              if (!allowedDays.includes(currentDay.toLowerCase())) {
                return {
                  isValid: false,
                  message: `This offer is not valid for check-in on ${currentDay}. Valid days: ${rawVal}.`
                };
              }
            }
          }

          if (type === "traveldate" || type === "checkindate") {
            const startDate = cond.value1 || cond.Value1;
            const endDate = cond.value2 || cond.Value2;
            const cinIso = parsedCin.toISOString().split("T")[0];
            if (startDate && cinIso < String(startDate).split("T")[0]) {
              return {
                isValid: false,
                message: `This offer is only valid for check-in on or after ${startDate}.`
              };
            }
            if (endDate && cinIso > String(endDate).split("T")[0]) {
              return {
                isValid: false,
                message: `This offer is only valid for check-in on or before ${endDate}.`
              };
            }
          }

          if (type === "minbookingamount" || type === "minamount") {
            const condMin = Number(cond.value1 || cond.Value1 || 0);
            if (condMin > 0 && totalAmount < condMin) {
              return {
                isValid: false,
                message: `Minimum booking amount of ₹${new Intl.NumberFormat("en-IN").format(condMin)} is required for this offer.`
              };
            }
          }
        }
      }
    }
  }

  // Calculate discount amount
  let discount = 0;
  if (offer.isPercentageDiscount || String(offer.couponType || offer.discountType || "").toLowerCase().includes("percent")) {
    discount = (totalAmount * Number(offer.discountValue || offer.value || 0)) / 100;
    const maxDiscount = Number(offer.maxDiscountAmount || 0);
    if (maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = Number(offer.discountValue || offer.value || 0);
  }

  discount = Math.min(discount, totalAmount);
  discount = Math.round(discount * 100) / 100;

  return {
    isValid: true,
    discountAmount: discount,
    message: "Offer applied successfully!"
  };
}

export async function validateHotelCoupon(payload) {
  const formattedPayload = {
    CouponCode: String(payload.CouponCode || payload.couponCode || "").trim().toUpperCase(),
    TotalAmount: Number(payload.TotalAmount || payload.totalAmount || 0),
    CheckInDate: payload.CheckInDate || payload.checkInDate || null,
  };

  try {
    const response = await requestHotelJson(
      "/api/Hotels/coupons/validate",
      { method: "POST", body: JSON.stringify(formattedPayload) },
      "Unable to validate hotel coupon."
    );
    return response;
  } catch (err) {
    console.error("Backend validate coupon failed on /api/Hotels/coupons/validate:", err);
    throw err;
  }
}

export async function getHotelBookingById(id) {
  let cleanId = id;
  if (typeof id === "string") {
    cleanId = id.replace(/\D/g, "");
  }
  return await requestHotelJson(`/api/Hotels/bookings/${cleanId}`, { method: "GET" }, "Unable to fetch hotel booking details.");
}

export async function getHotelCancellationQuote(id) {
  let cleanId = id;
  if (typeof id === "string") {
    cleanId = id.replace(/\D/g, "");
  }
  return await requestHotelJson(`/api/Hotels/bookings/${cleanId}/cancellation-quote`, { method: "GET" }, "Unable to calculate cancellation quote.");
}

export async function downloadHotelVoucher(id, bookingRef) {
  let cleanId = id;
  if (typeof id === "string") {
    cleanId = id.replace(/\D/g, "");
  }
  const token = (typeof window !== "undefined" && window.sessionStorage.getItem("active_portal") === "b2b"
    ? window.localStorage.getItem("b2b_token") : "") || (typeof window !== "undefined" ? window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token") : "");
  const response = await fetch(toAuthUrl(`/api/Hotels/bookings/${cleanId}/voucher`), {
    method: "GET",
    headers: {
      Accept: "application/pdf",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error("Failed to download hotel voucher.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hotel-voucher-${bookingRef || cleanId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function resendHotelConfirmationEmail(id) {
  let cleanId = id;
  if (typeof id === "string") {
    cleanId = id.replace(/\D/g, "");
  }
  return await requestHotelJson(`/api/Hotels/bookings/${cleanId}/resend-confirmation-email`, { method: "POST" }, "Unable to resend hotel confirmation email.");
}

