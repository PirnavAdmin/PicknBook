function validActionPath(actionUrl) {
  return typeof actionUrl === "string" && actionUrl.startsWith("/") && !actionUrl.startsWith("//")
    ? actionUrl
    : "";
}

export function getNotificationActionPath(item) {
  const actionPath = validActionPath(item?.actionUrl);
  if (!/^\/(?:bookings|payments)\/[^/]+\/?$/i.test(actionPath)) {
    return actionPath;
  }

  const bookingDetails = `${item?.title || ""} ${item?.message || ""} ${item?.type || ""}`;
  if (/\bflight\b/i.test(bookingDetails)) return "/dashboard/flight-bookings";
  if (/\bhotel\b/i.test(bookingDetails)) return "/dashboard/hotel-bookings";
  if (/\bbus\b/i.test(bookingDetails)) return "/dashboard/bus-bookings";
  return "/dashboard";
}
