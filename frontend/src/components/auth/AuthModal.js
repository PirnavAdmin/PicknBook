/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Facebook, LockKeyhole, Mail, Phone, ShieldCheck, X, Eye, EyeOff, User } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import "../../STYLES/AuthModal.css";
import brandLogo from "../../assets/images/brand/pick-n-book-logo.png";
import { requestAuth, readApiMessage, loginUser, sendRegistrationOtp, verifyRegistrationOtp, registerCustomer } from "../../services/authService";
import { AUTH_MODAL_EVENT } from "../../utils/authModalEvents";

const OTP_LENGTH = 6;

function pickFirst(source, keys, fallback = "") {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }

  return fallback;
}

function buildGuestUserFromMobile(mobile) {
  return {
    userId: `mobile-${mobile}`,
    name: `User ${mobile.slice(-4)}`,
    firstName: "User",
    lastName: "",
    email: "",
    mobile,
    role: "Customer",
    authType: "mobile-otp",
  };
}

function buildUserFromEmailLogin(payload, email) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested =
    root.user ||
    root.User ||
    root.profile ||
    root.Profile ||
    root.data ||
    root.Data ||
    root.result ||
    root.Result ||
    {};
  const source = nested.user || nested.User || nested;

  return {
    userId: String(
      pickFirst(source, ["userId", "UserId", "id", "Id", "uid", "Uid"], "") ||
      pickFirst(root, ["userId", "UserId", "id", "Id"], `email-${email}`)
    ),
    name: String(
      pickFirst(
        source,
        ["name", "Name", "fullName", "FullName", "firstName", "FirstName"],
        email.split("@")[0]
      )
    ),
    firstName: String(pickFirst(source, ["firstName", "FirstName"], "")),
    lastName: String(pickFirst(source, ["lastName", "LastName"], "")),
    email: String(pickFirst(source, ["email", "Email", "emailAddress", "EmailAddress"], email)),
    mobile: String(pickFirst(source, ["mobile", "Mobile", "phoneNumber", "PhoneNumber"], "")),
    role: String(pickFirst(source, ["role", "Role"], "Customer")),
    authType: "email",
  };
}

function extractToken(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.data || root.Data || root.result || root.Result || root.user || root.User || {};
  return String(
    pickFirst(root, ["token", "Token", "accessToken", "AccessToken", "jwtToken", "JwtToken"], "") ||
    pickFirst(nested, ["token", "Token", "accessToken", "AccessToken", "jwtToken", "JwtToken"], "")
  );
}

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [authMethod, setAuthMethod] = useState("mobile");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("login"); // 'login', 'register', 'forgot-password'
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen || !otpSent || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isOpen, otpSent, timeLeft <= 0]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const handleOpen = (event) => {
      setReturnTo(
        typeof event.detail?.returnTo === "string" &&
          event.detail.returnTo.startsWith("/") &&
          !event.detail.returnTo.startsWith("//")
          ? event.detail.returnTo
          : ""
      );
      setIsOpen(true);
      setStatus({ type: "", message: "" });
      setErrors({});
    };

    window.addEventListener(AUTH_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(AUTH_MODAL_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const closeModal = () => {
    setIsOpen(false);
    setStatus({ type: "", message: "" });
    setErrors({});
    setOtpSent(false);
    setOtp("");
    setTimeLeft(0);
    setViewMode("login");
  };

  const completeLogin = (message) => {
    window.dispatchEvent(new Event("storage"));
    setStatus({ type: "success", message });
    window.setTimeout(() => {
      closeModal();
      if (returnTo) {
        window.history.replaceState(null, "", returnTo);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }, 450);
  };

  const handleMobileChange = (event) => {
    setMobile(event.target.value.replace(/\D/g, "").slice(0, 10));
    setErrors({});
    setStatus({ type: "", message: "" });
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value.trimStart());
    setErrors({});
    setStatus({ type: "", message: "" });
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setErrors({});
    setStatus({ type: "", message: "" });
  };

  const handleOtpChange = (event) => {
    setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    setErrors({});
    setStatus({ type: "", message: "" });
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setOtpSent(false);
    setOtp("");
    setErrors({});
    setStatus({ type: "", message: "" });
    setTimeLeft(0);
  };

  const switchView = (mode) => {
    setViewMode(mode);
    setErrors({});
    setStatus({ type: "", message: "" });
    setOtpSent(false);
    setTimeLeft(0);
  };

  const sendOtp = async (event) => {
    if (event) event.preventDefault();
    if (loading) return;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrors({ mobile: "Enter a valid 10-digit mobile number" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await sendRegistrationOtp({
        phoneNumber: mobile,
        channel: "Mobile",
      });

      setOtpSent(true);
      setOtp("");
      setTimeLeft(300);
      setStatus({
        type: "success",
        message: readApiMessage(payload, "OTP sent to your mobile number."),
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.message ||
          "Mobile OTP login is not available for this number yet.",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit OTP" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await verifyRegistrationOtp({
        phoneNumber: mobile,
        channel: "Mobile",
        otp,
      });

      const guestUser = buildGuestUserFromMobile(mobile);
      localStorage.setItem("user", JSON.stringify(guestUser));
      localStorage.setItem("userId", guestUser.userId);
      localStorage.setItem("token", "otp-verified-session");
      localStorage.removeItem("role");
      localStorage.removeItem("challengeId");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("challengeId");
      completeLogin("Mobile verified. Login successful.");
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Invalid or expired OTP.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!fullName || !mobile || !password) {
      setStatus({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await registerCustomer({
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || "",
        phoneNumber: mobile,
        email: email || null,
        password: password,
      });

      setStatus({
        type: "success",
        message: readApiMessage(payload, "Registration successful! You can now log in."),
      });
      
      setTimeout(() => {
        switchView("login");
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (event) => {
    event.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    const nextErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Enter your password";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await loginUser({
        email: trimmedEmail,
        password,
      });

      const token = extractToken(payload);
      const user = buildUserFromEmailLogin(payload, trimmedEmail);

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", user.userId);
      localStorage.setItem("role", user.role || "Customer");
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
      localStorage.removeItem("challengeId");
      sessionStorage.removeItem("challengeId");

      completeLogin(readApiMessage(payload, "Login successful."));
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Invalid email or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    setStatus({
      type: "error",
      message: `${provider} login is not configured yet.`,
    });
  };

  return (
    <div className="pnb-auth-modal-shell" role="dialog" aria-modal="true" aria-label="Login to PickNBook">
      <button type="button" className="pnb-auth-modal-backdrop" onClick={closeModal} aria-label="Close login popup" />

      <div className="pnb-auth-modal">
        <aside className="pnb-auth-promo">
          <img src={brandLogo} alt="Pick N Book" className="pnb-auth-promo-logo" />

          <h2>Travel Smarter with PickNBook</h2>
          <p>Book buses, flights and hotels in one place.</p>

          <div className="pnb-auth-benefits">
            <span>Best Prices</span>
            <span>Instant Booking</span>
            <span>Secure Payments</span>
            <span>24/7 Support</span>
          </div>

          <div className="pnb-auth-offer">
            <strong>Welcome Offer</strong>
            <b>Get up to Rs.500 OFF</b>
            <span>CODE: PICKNBOOK500</span>
          </div>
        </aside>

        <section className="pnb-auth-panel">
          <button type="button" className="pnb-auth-close" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>

          <div className="pnb-auth-secure">
            <ShieldCheck size={13} />
            <span>
              {viewMode === "login" && "SECURE ACCESS"}
              {viewMode === "register" && "SECURE REGISTRATION"}
              {viewMode === "forgot-password" && "RESET PASSWORD"}
            </span>
          </div>

          <h2>
            {viewMode === "login" && "Login to PickNBook"}
            {viewMode === "register" && "Create your account"}
            {viewMode === "forgot-password" && "Forgot Password?"}
          </h2>
          <p className="pnb-auth-copy">
            {viewMode === "login" && (
              authMethod === "email"
                ? "Enter your email and password to continue."
                : "Enter your mobile number. New users can continue with OTP automatically."
            )}
            {viewMode === "register" && "Register to enjoy a seamless booking experience."}
            {viewMode === "forgot-password" && "No worries! Enter your mobile number and we'll send you an OTP to reset your password."}
          </p>

          {status.message && (
            <p className={`pnb-auth-status ${status.type === "success" ? "is-success" : "is-error"}`}>
              {status.message}
            </p>
          )}

          {viewMode === "login" && (
            <>
              {authMethod === "email" ? (
                <form className="pnb-auth-form" onSubmit={loginWithEmail}>
                  <label>
                    Email
                    <span className="pnb-auth-input">
                      <Mail size={16} />
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={handleEmailChange}
                        autoComplete="email"
                      />
                    </span>
                    {errors.email && <small>{errors.email}</small>}
                  </label>

                  <label>
                    Password
                    <span className="pnb-auth-input">
                      <LockKeyhole size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="pnb-auth-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                    {errors.password && <small>{errors.password}</small>}
                  </label>

                  <button type="submit" className="pnb-auth-primary" disabled={loading}>
                    {loading ? "Please wait..." : "Login with email"}
                  </button>
                </form>
              ) : (
                <form className="pnb-auth-form" onSubmit={otpSent ? verifyOtp : sendOtp}>
                  <label>
                    Mobile Number
                    <span className="pnb-auth-phone-row">
                      <span className="pnb-auth-country">IN +91</span>
                      <span className="pnb-auth-input">
                        <Phone size={16} />
                        <input
                          type="tel"
                          placeholder="Enter 10-digit mobile number"
                          value={mobile}
                          onChange={handleMobileChange}
                          disabled={otpSent || loading}
                          autoComplete="tel"
                        />
                      </span>
                    </span>
                    {errors.mobile && <small>{errors.mobile}</small>}
                  </label>

                  {otpSent && (
                    <>
                      <label>
                        OTP
                        <span className="pnb-auth-input">
                          <ShieldCheck size={16} />
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={handleOtpChange}
                            autoComplete="one-time-code"
                          />
                        </span>
                        {errors.otp && <small>{errors.otp}</small>}
                      </label>
                      <div className="travel-auth-register" style={{ marginTop: "4px", marginBottom: "8px" }}>
                        {timeLeft > 0 ? (
                          <p className="travel-otp-timer-text" style={{ margin: 0 }}>
                            OTP will expire in <span className="travel-otp-timer-highlight">{formatTime(timeLeft)}</span>
                          </p>
                        ) : (
                          <p className="travel-otp-resend-text" style={{ margin: 0, color: "#901143", fontWeight: "700" }}>
                            OTP expired.{" "}
                            <button
                              type="button"
                              className="pnb-auth-text-action"
                              style={{ margin: 0, padding: 0, display: "inline", textDecoration: "underline" }}
                              onClick={() => sendOtp()}
                              disabled={loading}
                            >
                              Resend OTP
                            </button>
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <button type="submit" className="pnb-auth-primary" disabled={loading || (otpSent && timeLeft === 0)}>
                    {loading ? "Please wait..." : otpSent ? "Verify & Continue" : "Continue"}
                  </button>
                </form>
              )}

              {otpSent && authMethod === "mobile" && (
                <button
                  type="button"
                  className="pnb-auth-text-action"
                  onClick={() => {
                    setOtpSent(false);
                    setTimeLeft(0);
                  }}
                  disabled={loading}
                >
                  Change mobile number
                </button>
              )}

              <div className="pnb-auth-divider">
                <span>or continue with</span>
              </div>

              <div className="pnb-auth-socials">
                {authMethod === "mobile" ? (
                  <button
                    type="button"
                    onClick={() => switchAuthMethod("email")}
                    aria-label="Continue with email"
                    title="Email"
                  >
                    <Mail size={20} />
                    <span>Email</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchAuthMethod("mobile")}
                    aria-label="Continue with mobile"
                    title="Mobile"
                  >
                    <Phone size={20} />
                    <span>Mobile</span>
                  </button>
                )}
                <button type="button" className="pnb-auth-social-google" onClick={() => handleSocialLogin("Google")} aria-label="Continue with Google" title="Google">
                  <FcGoogle size={22} />
                  <span>Google</span>
                </button>
                <button type="button" className="pnb-auth-social-facebook" onClick={() => handleSocialLogin("Facebook")} aria-label="Continue with Facebook" title="Facebook">
                  <Facebook size={21} />
                  <span>Facebook</span>
                </button>
              </div>

              <div className="pnb-auth-divider pnb-auth-divider-thin">
                <span>New here?</span>
              </div>

              <div className="pnb-auth-actions-group">
                <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchView("register")}>
                  <User size={16} />
                  Sign Up
                </button>
                <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchView("forgot-password")}>
                  <LockKeyhole size={16} />
                  Forgot Password?
                </button>
              </div>

              <div className="pnb-auth-footer-note">
                <ShieldCheck size={14} />
                Your data is safe and secure with us.
              </div>
            </>
          )}

          {viewMode === "register" && (
            <form className="pnb-auth-form" onSubmit={handleRegister}>
              <label>
                Full Name
                <span className="pnb-auth-input">
                  <User size={16} />
                  <input type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrors({}); setStatus({ type: "", message: "" }); }} />
                </span>
              </label>

              <label>
                Mobile Number
                <span className="pnb-auth-phone-row">
                  <span className="pnb-auth-country">IN +91</span>
                  <span className="pnb-auth-input">
                    <Phone size={16} />
                    <input type="tel" placeholder="Enter 10-digit mobile" value={mobile} onChange={handleMobileChange} />
                  </span>
                </span>
              </label>

              <label>
                Email (Optional)
                <span className="pnb-auth-input">
                  <Mail size={16} />
                  <input type="email" placeholder="Enter your email address" value={email} onChange={handleEmailChange} />
                </span>
              </label>

              <label>
                Set Password
                <span className="pnb-auth-input">
                  <LockKeyhole size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="pnb-auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>

              <div className="pnb-auth-checklist">
                <span className="pnb-auth-check-item is-valid"><span className="check-icon">✓</span> At least 8 characters</span>
                <span className="pnb-auth-check-item is-valid"><span className="check-icon">✓</span> 1 number</span>
                <span className="pnb-auth-check-item is-valid"><span className="check-icon">✓</span> 1 special char</span>
              </div>

              <div className="pnb-auth-secondary-grid" style={{ marginBottom: "12px" }}>
                <button type="button" className="pnb-auth-back-link" onClick={() => switchView("login")} style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                  Back to Login
                </button>
              </div>

              <button type="submit" className="pnb-auth-primary">
                Register
              </button>
              <div className="pnb-auth-terms">
                By continuing, you agree to our <a href="#">Terms & Privacy Policy</a>
              </div>
            </form>
          )}

          {viewMode === "forgot-password" && (
            <form className="pnb-auth-form" onSubmit={(e) => { e.preventDefault(); setStatus({ type: 'error', message: 'Password reset not implemented yet.' }); }}>
              <label>
                Mobile Number
                <span className="pnb-auth-phone-row">
                  <span className="pnb-auth-country">IN +91</span>
                  <span className="pnb-auth-input">
                    <Phone size={16} />
                    <input type="tel" placeholder="Enter 10-digit mobile" />
                  </span>
                </span>
              </label>

              <button type="submit" className="pnb-auth-primary" style={{ marginTop: '10px' }}>
                Send OTP
              </button>

              <div className="pnb-auth-divider">
                <span>OR</span>
              </div>

              <div className="pnb-auth-secondary-grid">
                <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchView("register")}>
                  <User size={16} /> Register
                </button>
                <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchView("register")}>
                  <User size={16} /> Sign Up
                </button>
              </div>

              <button type="button" className="pnb-auth-back-link" onClick={() => switchView("login")}>
                &larr; Back to Login
              </button>
            </form>
          )}

        </section>
      </div>
    </div>
  );
}
