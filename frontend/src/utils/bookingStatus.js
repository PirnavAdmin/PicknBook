export const bookingStatusOptions = ["All", "Upcoming", "Past", "Cancelled", "Payment Failed"];

export function bookingCategory(booking) {
  const value = String(booking?.canonicalStatus ?? booking?.bookingStatus ?? booking?.tripState ?? booking?.status ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("fail") || value.includes("expir")) return "payment failed";
  if (["past", "completed", "traveled", "travelled"].includes(value)) return "past";
  if (["upcoming", "confirmed", "booked", "success", "active"].includes(value)) return "upcoming";
  return value;
}

export function matchesBookingStatus(booking, status) {
  const requested = String(status ?? "all").trim().toLowerCase();
  return requested === "all" || bookingCategory(booking) === (requested === "completed" ? "past" : requested);
}

export function bookingStatusLabel(booking) {
  return booking?.tripState ?? "--";
}

export function bookingStatusClass(booking) {
  return ({ upcoming: "success", past: "default", cancelled: "danger", "payment failed": "danger" })[bookingCategory({ tripState: booking?.tripState })] || "default";
}
