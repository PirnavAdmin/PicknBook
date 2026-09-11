import { isTokenExpired, getAuthToken } from "../services/authSession";

const PENDING_RETURN_KEY = "pending_auth_return_to";
const PENDING_CONTEXT_KEY = "pending_auth_booking_context";

let isNavigatingLock = false;
let navigationTimer = null;

/**
 * Checks if the current user/agent has a valid, non-expired authentication session.
 * 
 * @returns {boolean} true if authenticated, false otherwise.
 */
export function isUserAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  // 1. Check B2B Agent session
  const activePortal = window.sessionStorage.getItem("active_portal") || "b2c";
  const b2bToken = window.localStorage.getItem("b2b_token") || window.sessionStorage.getItem("b2b_token");
  const b2bRole = (window.localStorage.getItem("b2b_role") || window.sessionStorage.getItem("b2b_role") || "").toLowerCase();
  if (activePortal === "b2b" && b2bToken && b2bRole === "agent" && !isTokenExpired(b2bToken)) {
    return true;
  }

  // 2. Check Standard Customer token
  const token =
    window.localStorage.getItem("token") ||
    window.sessionStorage.getItem("token") ||
    getAuthToken();

  if (token && !isTokenExpired(token)) {
    return true;
  }

  return false;
}

/**
 * Prevents rapid double-clicks on Continue buttons.
 */
export function isAuthNavigationBusy() {
  return isNavigatingLock;
}

/**
 * Centralized authentication gate for booking navigation.
 * 
 * Concept:
 * If authenticated: returns true, allowing caller to continue normally.
 * If unauthenticated: preserves the destination and booking context,
 * locks against duplicate clicks, navigates to /login, and returns false.
 * 
 * @param {Object} params
 * @param {Function} params.navigate - React Router navigate function
 * @param {Object} [params.location] - React Router location object
 * @param {string} params.nextRoute - The intended target route
 * @param {Object} [params.bookingContext] - In-memory state/data to preserve
 * @param {string} [params.bookingType] - Optional type e.g. "bus" | "flight" | "hotel"
 * @returns {boolean} true if authenticated to proceed; false if redirected to login
 */
export function navigateWithAuth({
  navigate,
  location,
  nextRoute,
  bookingContext = null,
  bookingType = "",
}) {
  if (!navigate || !nextRoute) {
    return false;
  }

  // Double-click protection
  if (isNavigatingLock) {
    return false;
  }

  // 1. User IS authenticated -> proceed normally without showing Login
  if (isUserAuthenticated()) {
    return true;
  }

  // 2. User is NOT authenticated -> gate and redirect to Login
  isNavigatingLock = true;
  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }
  navigationTimer = setTimeout(() => {
    isNavigatingLock = false;
  }, 1500);

  // Preserve in sessionStorage as fallback across page reloads
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PENDING_RETURN_KEY, nextRoute);
      if (bookingContext) {
        window.sessionStorage.setItem(
          PENDING_CONTEXT_KEY,
          JSON.stringify(bookingContext)
        );
      } else {
        window.sessionStorage.removeItem(PENDING_CONTEXT_KEY);
      }
    }
  } catch (e) {
    // Ignore private browsing storage errors
  }

  // Navigate to existing Login page with state & search query
  const queryParam = encodeURIComponent(nextRoute);
  navigate(`/login?returnTo=${queryParam}`, {
    state: {
      returnTo: nextRoute,
      bookingContext,
      bookingType,
      fromBookingGate: true,
    },
  });

  return false;
}

/**
 * Safely extracts pending return destination and context for Login page.
 * 
 * @param {Object} [location] - React Router location object
 * @param {URLSearchParams} [searchParams] - URLSearchParams object
 * @returns {{ returnTo: string, bookingContext: Object|null }}
 */
export function getPendingBookingReturn(location = null, searchParams = null) {
  let returnTo = "";
  let bookingContext = null;

  // 1. Check React Router location.state
  if (location?.state?.returnTo) {
    returnTo = String(location.state.returnTo).trim();
    if (location.state.bookingContext) {
      bookingContext = location.state.bookingContext;
    }
  }

  // 2. Check search params
  if (!returnTo && searchParams) {
    returnTo = String(searchParams.get("returnTo") || "").trim();
  }

  // 3. Fallback to sessionStorage
  if (typeof window !== "undefined") {
    if (!returnTo) {
      returnTo = String(window.sessionStorage.getItem(PENDING_RETURN_KEY) || "").trim();
    }
    if (!bookingContext) {
      try {
        const raw = window.sessionStorage.getItem(PENDING_CONTEXT_KEY);
        if (raw) {
          bookingContext = JSON.parse(raw);
        }
      } catch (e) {}
    }
  }

  return {
    returnTo,
    bookingContext,
  };
}

/**
 * Clears pending booking return storage once consumed.
 */
export function clearPendingBookingReturn() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(PENDING_RETURN_KEY);
    window.sessionStorage.removeItem(PENDING_CONTEXT_KEY);
  } catch (e) {}
}
