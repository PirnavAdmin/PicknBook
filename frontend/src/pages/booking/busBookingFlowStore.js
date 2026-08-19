import { resetBookingSessionTimer } from "./BookingTimer";

const BUS_BOOKING_FLOW_STORAGE_KEY = "bus_booking_flow_state_v1";

function readRawState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(BUS_BOOKING_FLOW_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function readBusBookingFlowState() {
  return readRawState();
}

export function writeBusBookingFlowState(partialState) {
  if (typeof window === "undefined" || !partialState || typeof partialState !== "object") {
    return null;
  }

  const current = readRawState() || {};
  const next = { ...current, ...partialState };

  try {
    window.sessionStorage.setItem(BUS_BOOKING_FLOW_STORAGE_KEY, JSON.stringify(next));
    resetBookingSessionTimer();
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }

  return next;
}

export function clearBusBookingFlowState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(BUS_BOOKING_FLOW_STORAGE_KEY);
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}
