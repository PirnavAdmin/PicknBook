const FLIGHT_BOOKING_FLOW_STORAGE_KEY = "flight_booking_flow_state_v1";

function readRawState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(FLIGHT_BOOKING_FLOW_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function readFlightBookingFlowState() {
  return readRawState();
}

export function writeFlightBookingFlowState(partialState) {
  if (typeof window === "undefined" || !partialState || typeof partialState !== "object") {
    return null;
  }

  const current = readRawState() || {};
  const next = { ...current, ...partialState };

  try {
    window.sessionStorage.setItem(FLIGHT_BOOKING_FLOW_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }

  return next;
}

export function clearFlightBookingFlowState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(FLIGHT_BOOKING_FLOW_STORAGE_KEY);
    window.sessionStorage.removeItem("BookingResponse");
    window.sessionStorage.removeItem("last_completed_booking_ref");
    window.sessionStorage.removeItem("last_booking_trace_id");
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}

// ─── Explicit Helpers for SRDV Flow ───────────────────────────────────────

export function getSrdvFlightState() {
  const state = readFlightBookingFlowState() || {};
  return {
    TraceId: state.TraceId || "",
    ResultIndex: state.ResultIndex || "",
    SrdvType: state.SrdvType || "",
    SrdvIndex: state.SrdvIndex || "",
    PNR: state.PNR || "",
    BookingId: state.BookingId || "",
    IsLcc: state.IsLcc || false,
  };
}

export function setSrdvFlightState(updates) {
  writeFlightBookingFlowState(updates);
}