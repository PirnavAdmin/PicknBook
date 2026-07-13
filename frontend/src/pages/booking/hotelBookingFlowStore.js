const HOTEL_BOOKING_FLOW_STORAGE_KEY = "hotel_booking_flow_state_v1";
 
function readRawState() {
  if (typeof window === "undefined") {
    return null;
  }
 
  try {
    const raw = window.sessionStorage.getItem(HOTEL_BOOKING_FLOW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
 
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
 
export function readHotelBookingFlowState() {
  return readRawState();
}
 
export function writeHotelBookingFlowState(partialState) {
  if (typeof window === "undefined" || !partialState || typeof partialState !== "object") {
    return null;
  }
 
  const current = readRawState() || {};
  const next = { ...current, ...partialState };
 
  try {
    window.sessionStorage.setItem(HOTEL_BOOKING_FLOW_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors.
  }
 
  return next;
}
 
export function clearHotelBookingFlowState() {
  if (typeof window === "undefined") {
    return;
  }
 
  try {
    window.sessionStorage.removeItem(HOTEL_BOOKING_FLOW_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
 