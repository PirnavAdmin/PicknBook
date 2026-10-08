const normalize = (value) => String(value ?? "").trim().toLowerCase();
const normalizeRoute = (value) => normalize(value).replace(/\s*(?:→|->|\bto\b)\s*/g, " to ").replace(/\s+/g, " ");

export function matchesFlightFilters(booking, filters) {
  const phone = (value) => String(value ?? "").replace(/\D/g, "");
  if (filters.passengerPhone.trim() && !phone(booking.passengerPhone).includes(phone(filters.passengerPhone))) return false;
  if (filters.bookingReference.trim() && !normalize(booking.bookingReference).includes(normalize(filters.bookingReference))) return false;
  const passengerNames = [booking.passengerName, ...(Array.isArray(booking.passengers) ? booking.passengers.map((passenger) => passenger.name || [passenger.firstName, passenger.lastName].filter(Boolean).join(" ")) : [])];
  if (filters.passengerName.trim() && !passengerNames.some((name) => normalize(name).includes(normalize(filters.passengerName)))) return false;
  const requestedStatus = normalize(filters.status) || "all";
  const tripState = normalize(booking?.tripState);
  if (requestedStatus !== "all" && !(requestedStatus === "past"
    ? tripState === "past" || tripState === "completed"
    : tripState === requestedStatus)) return false;
  for (const field of ["fromCity", "toCity"]) {
    if (filters[field].trim() && !normalize(booking[field]).includes(normalize(filters[field]))) return false;
  }
  if (filters.departureDate && String(booking.departureTimeUtc || booking.departureDate || "").slice(0, 10) !== filters.departureDate) return false;
  if (filters.route?.trim()) {
    const segments = Array.isArray(booking.segments) ? booking.segments : [];
    const routes = [booking.route, `${booking.fromCity || ""} to ${booking.toCity || ""}`, ...segments.flatMap((segment) => [
      `${segment.fromCity || ""} to ${segment.toCity || ""}`,
      `${segment.sourceCode || ""} to ${segment.destinationCode || ""}`,
    ])];
    if (!routes.some((route) => normalizeRoute(route).includes(normalizeRoute(filters.route)))) return false;
  }
  return true;
}
