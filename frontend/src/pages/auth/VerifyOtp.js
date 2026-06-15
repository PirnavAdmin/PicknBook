import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaPlaneDeparture, FaEye, FaEyeSlash,FaBus } from "react-icons/fa";
import "../../STYLES/Login.css";
import "../../STYLES/Verify.css";
import { readApiMessage, requestAuth } from "../../services/authService";
import {
  validateLowercaseEmail,
  validateStrongPassword,
} from "../../utils/authValidation";
// import flightCarImage from "../../assets/images/flightcar.png";
import flightCarImage from "../../assets/images/loginimage.png";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    otp: "",
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const authPageStyle = {
    backgroundImage: `url(${flightCarImage})`
  };
  const resetEmail = String(
    location.state?.email ||
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem("passwordResetEmail")
        : "") ||
      ""
  ).trim();
  const hasOtp = Boolean(form.otp.trim());
  const normalizeOtp = (value) => String(value || "").replace(/\D/g, "").slice(0, 6);
  const resetEmailError = resetEmail ? validateLowercaseEmail(resetEmail) : "";

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "otp" ? normalizeOtp(value) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue
    }));

    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "otp" && nextValue && nextValue.length !== 6
          ? "OTP must be 6 numbers"
          : name === "password" && nextValue
          ? validateStrongPassword(nextValue, "New password")
          : name === "confirmPassword" && /\s/.test(value)
            ? "Confirm password cannot contain spaces"
            : ""
    }));

    setApiMessage("");
    setIsSuccess(false);
  };

  const validate = () => {
    const newErrors = {};
    const otpValue = form.otp.trim();

    if (!otpValue) {
      newErrors.otp = "OTP is required.";
    } else if (!/^\d{6}$/.test(otpValue)) {
      newErrors.otp = "OTP must be 6 numbers";
    }

    const passwordError = validateStrongPassword(form.password, "New password");

    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required.";
    } else if (/\s/.test(form.confirmPassword)) {
      newErrors.confirmPassword = "Confirm password cannot contain spaces";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendOtp = async () => {
    if (!resetEmail) {
      setIsSuccess(false);
      setApiMessage("Please go back to Forgot Page and enter your email first.");
      return;
    }

    if (resetEmailError) {
      setIsSuccess(false);
      setApiMessage(resetEmailError);
      return;
    }

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);
    setErrors((prev) => ({ ...prev, otp: "" }));

    try {
      const payload = await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: resetEmail })
        },
        "Failed to resend OTP."
      );
      setIsSuccess(true);
      setApiMessage(readApiMessage(payload, "OTP resent successfully."));
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Failed to resend OTP.");
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    try {
      const payload = await requestAuth(
        "/api/Auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            otp: form.otp,
            newPassword: form.password
          })
        },
        "Reset failed. Please try again."
      );
      setIsSuccess(true);
      setApiMessage(readApiMessage(payload, "Password reset successful."));
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("passwordResetEmail");
      }
      navigate("/login", { replace: true });
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="travel-auth-page travel-auth-verify"
      style={authPageStyle}
    >
      <div className="travel-auth-card">
        <aside className="travel-auth-brand">
          <p className="travel-auth-kicker">Welcome to</p>
          <div className="travel-auth-logo">
            <FaPlaneDeparture />< FaBus/>
          </div>
          <h1 className="travel-auth-brand-name">Travling</h1>
          <p className="travel-auth-brand-copy">
            Verify OTP and set a secure password to access your account.
          </p>
          <p className="travel-auth-brand-meta">Safe password reset</p>
        </aside>

        <section className="travel-auth-form-panel">
          <h2 className="travel-auth-heading">Verify OTP</h2>
          <p className="travel-auth-subheading">
            Enter OTP and set your new account password.
          </p>

          {apiMessage && (
            <p
              className={`travel-auth-status ${isSuccess ? "is-success" : "is-error"}`}
            >
              {apiMessage}
            </p>
          )}

          <form className="travel-auth-form" onSubmit={handleSubmit}>
            <div className="travel-field">
              <label htmlFor="verify-otp">OTP</label>
              <div className="travel-field-line travel-otp-line">
                <input
                  id="verify-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="\d{6}"
                  name="otp"
                  placeholder="Enter OTP"
                  value={form.otp}
                  onChange={handleChange}
                />
                <button
                  type={hasOtp ? "submit" : "button"}
                  className="travel-inline-otp-btn"
                  onClick={hasOtp ? undefined : handleResendOtp}
                  disabled={loading}
                >
                  {loading
                    ? hasOtp
                      ? "Verifying..."
                      : "Resending..."
                    : hasOtp
                      ? "Verify OTP"
                      : "Resend OTP"}
                </button>
              </div>
              <p className="travel-field-error">{errors.otp || "\u00A0"}</p>
            </div>

            <div className="travel-field">
              <label htmlFor="verify-new-password">New Password</label>
              <div className="travel-field-line">
                <input
                  id="verify-new-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter new password"
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="travel-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p className="travel-field-error">{errors.password || "\u00A0"}</p>
            </div>

            <div className="travel-field">
              <label htmlFor="verify-confirm-password">Confirm Password</label>
              <div className="travel-field-line">
                <input
                  id="verify-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="travel-eye-btn"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p className="travel-field-error">
                {errors.confirmPassword || "\u00A0"}
              </p>
            </div>

            <div className="travel-auth-links">
              <button type="button" onClick={() => navigate("/Forget")}>
                Back to Forgot Page
              </button>
              <button type="button" onClick={() => navigate("/login")}>
                Back to Login
              </button>
            </div>

            <div className="travel-auth-actions">
              <button
                type="submit"
                className="travel-btn travel-btn-primary"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default VerifyOtp;
