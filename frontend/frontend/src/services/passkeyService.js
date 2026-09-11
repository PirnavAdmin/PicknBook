import { requestAuth } from "./authService";
import { getAuthToken } from "./authSession";
import { toApiUrl } from "./apiClient";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Helper for authenticated passkey management API calls (list, delete, rename).
 */
async function requestPasskeyApi(path, options = {}) {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(toApiUrl(path), { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const msg = (payload && typeof payload === "object")
      ? (payload.message || payload.Message || "Request failed")
      : String(payload || "Request failed");
    throw new Error(msg);
  }

  return payload;
}

/**
 * Register a new Passkey for the currently logged-in user.
 * @param {string|null} deviceName  Optional label for this passkey (e.g. "iPhone 15")
 * @returns {Promise<boolean>} True if registration succeeded
 */
export const registerPasskey = async (deviceName = null) => {
  try {
    // 1. Get creation options from server (send deviceName so it can be stored)
    const options = await requestPasskeyApi("/api/auth/passkey/register-options", {
      method: "POST",
      body: JSON.stringify({ deviceName: deviceName || null }),
    });

    // 2. Pass options to browser to create a passkey
    const attestationResponse = await startRegistration({ optionsJSON: options });

    // 3. Send the attestation response + deviceName back to the server for verification
    const verification = await requestPasskeyApi("/api/auth/passkey/register-complete", {
      method: "POST",
      body: JSON.stringify({
        attestationResponse,
        deviceName: deviceName || null,
      }),
    });

    return verification && verification.verified;
  } catch (error) {
    console.error("Passkey Registration Error:", error);
    throw error;
  }
};

/**
 * Authenticate (Log in) using a Passkey.
 * @param {string|null} email  Optional — restrict assertion to a specific user's passkeys
 * @returns {Promise<any>}  The login response containing JWT token and user info
 */
export const loginWithPasskey = async (email = null) => {
  try {
    // 1. Get assertion options from server — response is { sessionId, options }
    const body = email ? JSON.stringify({ email }) : null;
    const loginOptionsResponse = await requestPasskeyApi("/api/auth/passkey/login-options", {
      method: "POST",
      body,
    });

    // Extract sessionId and the actual WebAuthn assertion options separately
    const { sessionId, options } = loginOptionsResponse;

    if (!sessionId || !options) {
      throw new Error("Invalid login options received from server.");
    }

    // 2. Ask browser for passkey signature — pass only the flat AssertionOptions
    const assertionResponse = await startAuthentication({ optionsJSON: options });

    // 3. Send assertionResponse + sessionId to server for verification
    const loginData = await requestPasskeyApi("/api/auth/passkey/login-complete", {
      method: "POST",
      body: JSON.stringify({ sessionId, assertionResponse }),
    });

    return loginData;
  } catch (error) {
    console.error("Passkey Login Error:", error);
    throw error;
  }
};

/**
 * List all passkeys registered by the current user.
 * @returns {Promise<Array<{ id, deviceName, createdAt, lastUsedAt }>>}
 */
export const listPasskeys = async () => {
  return requestPasskeyApi("/api/auth/passkey", { method: "GET" });
};

/**
 * Delete a passkey by ID.
 * @param {number} passkeyId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const deletePasskey = async (passkeyId) => {
  return requestPasskeyApi(`/api/auth/passkey/${passkeyId}`, { method: "DELETE" });
};

/**
 * Rename a passkey's device label.
 * @param {number} passkeyId
 * @param {string} deviceName  New label for the passkey
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const renamePasskey = async (passkeyId, deviceName) => {
  return requestPasskeyApi(`/api/auth/passkey/${passkeyId}`, {
    method: "PUT",
    body: JSON.stringify({ deviceName }),
  });
};
