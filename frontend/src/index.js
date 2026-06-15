import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { clearAuthSession } from './services/authSession';
import { openAuthModal } from './utils/authModalEvents';

const USER_PROTECTED_PATH_PREFIXES = [
  "/bus/payment",
  "/flight/payment",
  "/hotel/payment",
  "/dashboard",
  "/change-password",
  "/edit-profile",
  "/booking-confirmation",
];

function isUserProtectedPath(pathname) {
  const normalizedPath = String(pathname || "").toLowerCase();
  return USER_PROTECTED_PATH_PREFIXES.some((prefix) =>
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
}

// Initialize Guest ID on startup if user is not authenticated
function initializeGuestId() {
  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage.getItem("token") || window.localStorage.getItem("adminToken");
      if (!token) {
        let guestId = window.localStorage.getItem("guest_id");
        if (!guestId) {
          const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });
          guestId = `guest_${uuid}`;
          window.localStorage.setItem("guest_id", guestId);
        }
      }
    } catch (e) {
      console.error("Failed to initialize Guest ID:", e);
    }
  }
}
initializeGuestId();

// Global Fetch Interceptor to handle session completion/expiration (401 Unauthorized) and Guest ID
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  let options = init || {};
  let headers = {};

  if (options.headers) {
    if (options.headers instanceof Headers) {
      for (const [key, value] of options.headers.entries()) {
        headers[key] = value;
      }
    } else {
      headers = { ...options.headers };
    }
  }

  // Check if authenticated (via Authorization header or localStorage token)
  const authHeader = headers["Authorization"] || headers["authorization"];
  const token = authHeader || (typeof window !== "undefined" ? window.localStorage.getItem("token") : null);

  if (!token) {
    if (typeof window !== "undefined") {
      let guestId = window.localStorage.getItem("guest_id");
      if (!guestId) {
        const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
        guestId = `guest_${uuid}`;
        window.localStorage.setItem("guest_id", guestId);
      }
      headers["X-Guest-Id"] = guestId;
    }
  }

  options = { ...options, headers };

  try {
    const response = await originalFetch(input, options);
    if (response) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname.toLowerCase();
          const isAdmin = currentPath.startsWith("/admin");

          if (isAdmin) {
            clearAuthSession();
            const loginPath = "/admin/login";
            if (currentPath !== loginPath) {
              window.location.href = loginPath;
            }
          } else {
            if (!isUserProtectedPath(currentPath)) {
              return response;
            }

            clearAuthSession();
            if (currentPath !== "/") {
              window.history.replaceState(null, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
            openAuthModal("login");
          }
        }
      } else if (response.ok) {
        const urlString = typeof input === "string" ? input : (input?.url || "");
        const lowerUrl = urlString.toLowerCase();
        if (
          lowerUrl.includes("/login") ||
          lowerUrl.includes("/register") ||
          lowerUrl.includes("/verify-otp") ||
          lowerUrl.includes("/auth")
        ) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("guest_id");
          }
        }
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
      <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
