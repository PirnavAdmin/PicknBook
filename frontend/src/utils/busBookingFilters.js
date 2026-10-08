const normalize = (value) => String(value ?? "").trim().toLowerCase();
export const getBusBookingStatus = (booking) => normalize(booking?.tripState);

export function matchesBusFilters(booking, filters) {
  const requestedStatus = normalize(filters.status) || "all";
  const tripState = getBusBookingStatus(booking);
  if (requestedStatus !== "all" && !(requestedStatus === "past"
    ? tripState === "past" || tripState === "completed"
    : tripState === requestedStatus)) return false;
  for (const field of ["bookingReference", "passengerName", "fromCity", "toCity"]) {
    if (normalize(filters[field]) && !normalize(booking[field]).includes(normalize(filters[field]))) return false;
  }
  if (normalize(filters.passengerPhone)) {
    const digits = (value) => String(value ?? "").replace(/\D/g, "");
    const query = digits(filters.passengerPhone);
    if (!query || !digits(booking.passengerPhone).includes(query)) return false;
  }
  if (filters.departureDate && String(booking.departureTimeUtc || "").slice(0, 10) !== filters.departureDate) return false;
  return true;
}
