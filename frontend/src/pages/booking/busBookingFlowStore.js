

const BUS_BOOKING_FLOW_STORAGE_KEY = "bus_booking_flow_state_v1";

// How long (ms) the provider holds a blocked seat.
// We use 10 min conservatively (provider allows 10–15 min).
const BLOCK_HOLD_MS = 10 * 60 * 1000;

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

/**
 * Saves blockKey and stamps blockExpiresAt (now + 10 min) atomically.
 * Always call this instead of writing blockKey manually after a successful block.
 */
export function saveBlockKey(blockKey) {
  writeBusBookingFlowState({
    blockKey,
    blockExpiresAt: blockKey ? Date.now() + BLOCK_HOLD_MS : null,
  });
}

/**
 * Returns true if:
 *   - flowState has a non-empty blockKey, AND
 *   - blockExpiresAt is in the future (hold not yet expired)
 */
export function isBlockStillActive(flowState) {
  if (!flowState) return false;
  const { blockKey, blockExpiresAt } = flowState;
  if (!blockKey) return false;
  if (!blockExpiresAt) return false;
  return Date.now() < Number(blockExpiresAt);
}

/**
 * Clears only the block-related fields from the flow state.
 * Does NOT wipe passenger details, seat selection, pricing, etc.
 */
export function clearBlockKey() {
  writeBusBookingFlowState({
    blockKey: null,
    blockExpiresAt: null,
  });
}

/**
 * Returns the ms remaining on the active hold, or 0 if expired / not active.
 */
export function getBlockMsRemaining(flowState) {
  if (!isBlockStillActive(flowState)) return 0;
  return Math.max(0, Number(flowState.blockExpiresAt) - Date.now());
}
