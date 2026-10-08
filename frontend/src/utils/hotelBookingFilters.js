const normalize = (value) => String(value ?? "").trim().toLowerCase();

export function matchesHotelFilters(booking, filters) {
  const requestedStatus = normalize(filters.status) || "all";
  const tripState = normalize(booking?.tripState);
  if (requestedStatus !== "all" && !(requestedStatus === "past"
    ? tripState === "past" || tripState === "completed"
    : tripState === requestedStatus)) return false;
  return ["bookingReference", "hotelName", "guestName"].every((field) =>
    !normalize(filters[field]) || normalize(booking[field]).includes(normalize(filters[field]))
  );
}
