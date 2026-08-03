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
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [adminChallengeId, setAdminChallengeId] = useState("");

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
      setMobile("");
      setEmail("");
      setPassword("");
      setFullName("");
      setOtp("");
      setOtpSent(false);
      setTimeLeft(0);
      setViewMode("login");
      setAuthMethod("mobile");
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
    setAdminChallengeId("");
  };

  const completeLogin = (message) => {
    window.dispatchEvent(new Event("storage"));
    setStatus({ type: "success", message });
    window.setTimeout(() => {
      closeModal();
      
      const role = (localStorage.getItem("role") || sessionStorage.getItem("role")) || "";
      const isAgent = role === "Agent" || role === "B2B";
      const isAdmin = role === "Admin";

      if (isAdmin) {
        window.location.href = "/admin";
      } else if (isAgent) {
        window.location.href = "/b2b/dashboard";
      } else if (returnTo) {
        window.location.href = returnTo;
      } else {
        window.location.href = "/";
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
    setAdminChallengeId("");
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

      const storage = keepSignedIn ? localStorage : sessionStorage;
      const guestUser = buildGuestUserFromMobile(mobile);
      storage.setItem("user", JSON.stringify(guestUser));
      storage.setItem("userId", guestUser.userId);
      storage.setItem("token", "otp-verified-session");
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

  const sendRegisterOtp = async (event) => {
    if (event) event.preventDefault();
    if (loading) return;

    if (!fullName || !mobile || !email || !password) {
      setStatus({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrors({ mobile: "Enter a valid 10-digit mobile number" });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await sendRegistrationOtp({
        email: email,
        channel: "Email",
      });

      setOtpSent(true);
      setOtp("");
      setTimeLeft(300);
      setViewMode("register-otp");
      setStatus({
        type: "success",
        message: readApiMessage(payload, "OTP sent to your email address."),
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Failed to send OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit OTP" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      // 1. Verify OTP first (Email)
      await verifyRegistrationOtp({
        email: email,
        channel: "Email",
        otp,
      });

      // 2. Complete Registration
      const payload = await registerCustomer({
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || "",
        phoneNumber: mobile,
        email: email,
        password: password,
      });

      setStatus({
        type: "success",
        message: readApiMessage(payload, "Registration successful! You can now log in."),
      });
      
      setTimeout(() => {
        setOtpSent(false);
        setViewMode("login");
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Invalid OTP or Registration failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (adminChallengeId) {
      if (!otp) {
        setErrors({ otp: "Enter the OTP" });
        return;
      }
      setLoading(true);
      setStatus({ type: "", message: "" });
      try {
        const data = await requestAuth("/api/Auth/admin/login/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            challengeId: adminChallengeId,
            otp: otp,
          }),
        }, "Invalid OTP");

        const rawToken = data?.token || data?.Token || data?.tokenString || data?.data?.token || "";
        const rawRole = data?.role || data?.Role || data?.data?.role || "admin";
        const rawName = data?.name || data?.fullName || data?.email || data?.data?.name || "Admin";

        const storage = keepSignedIn ? localStorage : sessionStorage;
        storage.setItem("adminToken", rawToken);
        storage.setItem("adminRole", rawRole);
        storage.setItem("adminName", rawName);
        storage.setItem("role", "Admin");
        localStorage.removeItem("challengeId");
        sessionStorage.removeItem("challengeId");

        completeLogin("Admin login successful.");
      } catch (error) {
        setStatus({ type: "error", message: error?.message || "Invalid OTP" });
      } finally {
        setLoading(false);
      }
      return;
    }

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
      const userRole = user.role || "Customer";
      const roleLower = userRole.toLowerCase();
      const storage = keepSignedIn ? localStorage : sessionStorage;

      if (roleLower === "agent" || roleLower === "b2b") {
        storage.setItem("b2b_user", JSON.stringify(user));
        storage.setItem("b2b_userId", user.userId);
        storage.setItem("b2b_role", "Agent");
        if (token) storage.setItem("b2b_token", token);
        storage.setItem("role", "Agent");
      } else if (roleLower === "admin") {
        storage.setItem("adminRole", "admin");
        if (token) storage.setItem("adminToken", token);
        storage.setItem("role", "Admin");
      } else {
        storage.setItem("user", JSON.stringify(user));
        storage.setItem("userId", user.userId);
        storage.setItem("role", userRole);
        if (token) {
          storage.setItem("token", token);
        } else {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
        }
      }

      localStorage.removeItem("challengeId");
      sessionStorage.removeItem("challengeId");

      completeLogin(readApiMessage(payload, "Login successful."));
    } catch (error) {
      const errorMsg = String(error?.message || "");
      if (errorMsg.toLowerCase().includes("admin") || errorMsg.toLowerCase().includes("otp")) {
        try {
          const data = await requestAuth("/api/Auth/admin/login/request-otp", {
            method: "POST",
            body: JSON.stringify({ email: trimmedEmail, password })
          }, "Admin login failed");
          setAdminChallengeId(data.challengeId || data.ChallengeId);
          setOtp("");
          setStatus({ type: "success", message: "Admin OTP sent to your email." });
          return;
        } catch (adminErr) {
          setStatus({ type: "error", message: adminErr?.message || "Admin login failed." });
          return;
        }
      }
      
      setStatus({
        type: "error",
        message: errorMsg || "Invalid email or password.",
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

          <h2>
            {viewMode === "login" && "Login to PickNBook"}
            {viewMode === "register" && "Create your account"}
            {viewMode === "register-otp" && "Verify OTP"}
            {viewMode === "forgot-password" && "Forgot Password?"}
          </h2>
          <p className="pnb-auth-copy">
            {viewMode === "login" && (
              authMethod === "email"
                ? "Enter your email and password to continue."
                : "Enter your mobile number. New users can continue with OTP automatically."
            )}
            {viewMode === "register" && "Register to enjoy a seamless booking experience."}
            {viewMode === "register-otp" && "Please enter the OTP sent to your registration channel."}
            {viewMode === "forgot-password" && (
              authMethod === "mobile" 
                ? "No worries! Enter your mobile number and we'll send you an OTP to reset your password." 
                : "No worries! Enter your email address and we'll send you a link to reset your password."
            )}
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
                  {!adminChallengeId ? (
                    <>
                      <label>
                        Email
                        <span className="pnb-auth-input">
                          <Mail size={16} />
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={handleEmailChange}
                            autoComplete="off"
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
                            autoComplete="new-password"
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
                    </>
                  ) : (
                    <>
                      <label>
                        Admin Verification OTP
                        <span className="pnb-auth-input">
                          <ShieldCheck size={16} />
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter OTP sent to your email"
                            value={otp}
                            onChange={handleOtpChange}
                            autoComplete="one-time-code"
                          />
                        </span>
                        {errors.otp && <small>{errors.otp}</small>}
                      </label>
                      
                      <button
                        type="button"
                        className="pnb-auth-text-action"
                        onClick={() => {
                           setAdminChallengeId("");
                           setOtp("");
                           setStatus({ type: "", message: "" });
                        }}
                        style={{ marginTop: "-8px", marginBottom: "16px", alignSelf: "flex-start", padding: 0 }}
                      >
                        Cancel admin login
                      </button>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    <input 
                      type="checkbox" 
                      id="keepSignedInEmail" 
                      checked={keepSignedIn} 
                      onChange={(e) => setKeepSignedIn(e.target.checked)} 
                      style={{ cursor: 'pointer', width: 'auto', margin: 0 }}
                    />
                    <label htmlFor="keepSignedInEmail" style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', cursor: 'pointer', fontWeight: 400, display: 'inline', width: 'auto', whiteSpace: 'nowrap' }}>
                      Keep me signed in
                    </label>
                  </div>

                  <button type="submit" className="pnb-auth-primary" disabled={loading}>
                    {loading ? "Please wait..." : (adminChallengeId ? "Verify & Login" : "Login with email")}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    <input 
                      type="checkbox" 
                      id="keepSignedInMobile" 
                      checked={keepSignedIn} 
                      onChange={(e) => setKeepSignedIn(e.target.checked)} 
                      style={{ cursor: 'pointer', width: 'auto', margin: 0 }}
                    />
                    <label htmlFor="keepSignedInMobile" style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', cursor: 'pointer', fontWeight: 400, display: 'inline', width: 'auto', whiteSpace: 'nowrap' }}>
                      Keep me signed in
                    </label>
                  </div>

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
            </>
          )}

          {viewMode === "register" && (
            <form className="pnb-auth-form" onSubmit={sendRegisterOtp}>
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
                {errors.mobile && <small style={{ color: "red", fontSize: "0.75rem" }}>{errors.mobile}</small>}
              </label>

              <label>
                Email Address
                <span className="pnb-auth-input">
                  <Mail size={16} />
                  <input type="email" placeholder="Enter your email address" value={email} onChange={handleEmailChange} />
                </span>
                {errors.email && <small style={{ color: "red", fontSize: "0.75rem" }}>{errors.email}</small>}
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

              <div className="pnb-auth-secondary-grid" style={{ marginBottom: "12px", marginTop: "16px" }}>
                <button type="button" className="pnb-auth-back-link" onClick={() => switchView("login")} style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", cursor: "pointer", background: "#fff" }}>
                  Back to Login
                </button>
              </div>

              <button type="submit" className="pnb-auth-primary" disabled={loading}>
                {loading ? "Please wait..." : "Send OTP"}
              </button>
              <div className="pnb-auth-terms">
                By continuing, you agree to our <a href="#">Terms & Privacy Policy</a>
              </div>
            </form>
          )}

          {viewMode === "register-otp" && (
            <form className="pnb-auth-form" onSubmit={handleRegister}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 6px 0", color: "#333", fontSize: "1.1rem" }}>Verify OTP</h3>
                <p style={{ margin: 0, color: "#666", fontSize: "0.85rem", lineHeight: "1.4" }}>
                  An OTP has been sent to your email address: <strong>{email}</strong>
                </p>
              </div>

              <label>
                Enter OTP
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
                {errors.otp && <small style={{ color: "red", fontSize: "0.75rem" }}>{errors.otp}</small>}
              </label>

              <div className="travel-auth-register" style={{ marginTop: "8px", marginBottom: "16px" }}>
                {timeLeft > 0 ? (
                  <p className="travel-otp-timer-text" style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                    OTP will expire in <span className="travel-otp-timer-highlight" style={{ fontWeight: "600", color: "#a51c49" }}>{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <p className="travel-otp-resend-text" style={{ margin: 0, color: "#a51c49", fontWeight: "700", fontSize: "0.85rem" }}>
                    OTP expired.{" "}
                    <button
                      type="button"
                      className="pnb-auth-text-action"
                      style={{ margin: 0, padding: 0, display: "inline", textDecoration: "underline", background: "none", border: "none", color: "#a51c49", cursor: "pointer", fontWeight: "700" }}
                      onClick={sendRegisterOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </p>
                )}
              </div>

              <button type="submit" className="pnb-auth-primary" disabled={loading || timeLeft === 0}>
                {loading ? "Please wait..." : "Verify & Register"}
              </button>

              <div className="pnb-auth-secondary-grid" style={{ marginTop: "12px", marginBottom: "8px" }}>
                <button
                  type="button"
                  className="pnb-auth-back-link"
                  onClick={() => { setViewMode("register"); setOtpSent(false); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", cursor: "pointer", background: "#fff" }}
                >
                  Back to Edit Details
                </button>
              </div>
            </form>
          )}

          {viewMode === "forgot-password" && (
            <form className="pnb-auth-form" onSubmit={(e) => { e.preventDefault(); setStatus({ type: 'error', message: 'Password reset not implemented yet.' }); }}>
              {authMethod === "mobile" ? (
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
              ) : (
                <label>
                  Email Address
                  <span className="pnb-auth-input">
                    <Mail size={16} />
                    <input type="email" placeholder="Enter your email address" />
                  </span>
                </label>
              )}

              <button type="submit" className="pnb-auth-primary" style={{ marginTop: '10px' }}>
                {authMethod === "mobile" ? "Send OTP" : "Send Reset Link"}
              </button>

              <div className="pnb-auth-divider">
                <span>OR</span>
              </div>

              <div className="pnb-auth-secondary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {authMethod === "mobile" ? (
                  <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchAuthMethod("email")}>
                    <Mail size={16} /> Use Email
                  </button>
                ) : (
                  <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchAuthMethod("mobile")}>
                    <Phone size={16} /> Use Mobile
                  </button>
                )}
                <button type="button" className="pnb-auth-secondary-btn" onClick={() => switchView("register")}>
                  <User size={16} /> Create Account
                </button>
              </div>

              <button type="button" className="pnb-auth-back-link" onClick={() => switchView("login")} style={{ width: "100%", padding: "8px", marginTop: "4px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                &larr; Back to Login
              </button>
            </form>
          )}

        </section>
      </div>
    </div>
  );
}
