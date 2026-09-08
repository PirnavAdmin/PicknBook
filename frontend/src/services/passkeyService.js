import { requestAuth } from "./authService";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Register a new Passkey
 * @returns {Promise<boolean>} True if registration succeeded
 */
export const registerPasskey = async () => {
  try {
    // 1. Get creation options from server
    const options = await requestAuth("/api/auth/passkey/register-options", {
      method: "POST"
    }, "Failed to get passkey options");

    // 2. Pass options to browser to create a passkey
    const attestationResponse = await startRegistration({ optionsJSON: options });

    // 3. Send the attestation response back to the server for verification
    const verification = await requestAuth("/api/auth/passkey/register-complete", {
      method: "POST",
      body: JSON.stringify(attestationResponse),
    }, "Failed to verify passkey registration");

    return verification && verification.verified;
  } catch (error) {
    console.error("Passkey Registration Error:", error);
    throw error;
  }
};

/**
 * Authenticate (Log in) using a Passkey
 * @param {string} [email] Optional email if you want to restrict login to a specific user
 * @returns {Promise<any>} The login response (e.g. JWT token)
 */
export const loginWithPasskey = async (email = null) => {
  try {
    // 1. Get assertion options from server
    const body = email ? JSON.stringify({ email }) : null;
    const options = await requestAuth("/api/auth/passkey/login-options", {
      method: "POST",
      body: body
    }, "Failed to get login options");

    // 2. Ask browser for passkey signature
    const assertionResponse = await startAuthentication({ optionsJSON: options });

    // 3. Send signature to server for verification
    const loginData = await requestAuth("/api/auth/passkey/login-complete", {
      method: "POST",
      body: JSON.stringify(assertionResponse),
    }, "Failed to verify passkey authentication");

    return loginData;
  } catch (error) {
    console.error("Passkey Login Error:", error);
    throw error;
  }
};
