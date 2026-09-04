/* eslint-disable */
import { requestAuth } from "./authService";

/**
 * 1. Request Admin Login OTP (Step 1)
 * Endpoint: POST /api/Auth/admin/login/request-otp
 * Request Body: { email, password }
 * Response: { message, challengeId, expiresInMinutes }
 */
export async function adminLoginRequestOtp(payload) {
  return requestAuth("/api/Auth/admin/login/request-otp", {
    method: "POST",
    body: JSON.stringify({
      email: payload?.email || "",
      password: payload?.password || "",
    }),
  }, "Failed to request admin OTP.");
}

export const requestAdminLoginOtp = adminLoginRequestOtp;

/**
 * 2. Verify Admin Login OTP (Step 2)
 * Endpoint: POST /api/Auth/admin/login/verify-otp
 * Request Body: { challengeId, otp }
 * Response: { token, userId, role }
 */
export async function adminLoginVerifyOtp(payload) {
  return requestAuth("/api/Auth/admin/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      challengeId: payload?.challengeId || "",
      otp: payload?.otp || "",
    }),
  }, "Failed to verify admin OTP.");
}

export const verifyAdminLoginOtp = adminLoginVerifyOtp;

/**
 * 3. Admin Forgot Password (Step 1: Request OTP)
 * Endpoint: POST /api/Auth/admin/forgot-password
 * Request Body: { email }
 * Response: 200 OK plain text ("If the email is registered, an OTP has been sent.")
 */
export async function adminForgotPassword(payload) {
  return requestAuth("/api/Auth/admin/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: payload?.email || "",
    }),
  }, "Failed to process forgot password request.");
}

/**
 * 4. Admin Verify OTP & Set New Password (Step 2: Verify OTP & Reset Password)
 * Endpoint: POST /api/Auth/admin/forgot-password/verify-otp
 * Request Body: { email, otp, newPassword }
 * Response: { success: true, message: "Password has been reset successfully." }
 */
export async function adminResetPassword(payload) {
  return requestAuth("/api/Auth/admin/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      email: payload?.email || "",
      otp: payload?.otp || "",
      newPassword: payload?.newPassword || "",
    }),
  }, "Failed to reset admin password.");
}

export const adminVerifyOtpAndResetPassword = adminResetPassword;

