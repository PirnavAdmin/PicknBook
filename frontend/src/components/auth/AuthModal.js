import React, { useEffect, useState } from "react";
import { Facebook, LockKeyhole, Mail, Phone, ShieldCheck, X, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import "../../STYLES/AuthModal.css";
import brandLogo from "../../assets/images/brand/pick-n-book-logo.png";
import { requestAuth, readApiMessage } from "../../services/authService";
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
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  };

  const sendOtp = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrors({ mobile: "Enter a valid 10-digit mobile number" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await requestAuth(
        "/api/Auth/send-registration-otp",
        {
          method: "POST",
          body: JSON.stringify({
            phoneNumber: mobile,
            channel: "Mobile",
          }),
        },
        "Unable to send OTP."
      );

      setOtpSent(true);
      setOtp("");
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
      await requestAuth(
        "/api/Auth/verify-registration-otp",
        {
          method: "POST",
          body: JSON.stringify({
            phoneNumber: mobile,
            channel: "Mobile",
            otp,
          }),
        },
        "OTP verification failed."
      );

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
      const payload = await requestAuth(
        "/api/Auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        },
        "Email login failed."
      );

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
          <span className="pnb-auth-pill">PICKNBOOK ACCESS</span>
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
            <span>Secure Access</span>
          </div>

          <h2>Login to PickNBook</h2>
          <p className="pnb-auth-copy">
            {authMethod === "email"
              ? "Enter your email and password to continue."
              : "Enter your mobile number. New users can continue with OTP automatically."}
          </p>

          {status.message && (
            <p className={`pnb-auth-status ${status.type === "success" ? "is-success" : "is-error"}`}>
              {status.message}
            </p>
          )}

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
              )}

              <button type="submit" className="pnb-auth-primary" disabled={loading}>
                {loading ? "Please wait..." : otpSent ? "Verify & Continue" : "Continue"}
              </button>
            </form>
          )}

          {otpSent && authMethod === "mobile" && (
            <button type="button" className="pnb-auth-text-action" onClick={() => setOtpSent(false)} disabled={loading}>
              Change mobile number
            </button>
          )}

          {authMethod === "email" && (
            <button type="button" className="pnb-auth-text-action" onClick={() => switchAuthMethod("mobile")} disabled={loading}>
              Use mobile OTP
            </button>
          )}

          <div className="pnb-auth-divider">
            <span>or continue with</span>
          </div>

          <div className="pnb-auth-socials">
            <button
              type="button"
              className={authMethod === "email" ? "is-active" : ""}
              onClick={() => switchAuthMethod("email")}
              aria-label="Continue with email"
              title="Email"
            >
              <Mail size={20} />
              <span>Email</span>
            </button>
            <button type="button" className="pnb-auth-social-google" onClick={() => handleSocialLogin("Google")} aria-label="Continue with Google" title="Google">
              <FcGoogle size={22} />
              <span>Google</span>
            </button>
            <button type="button" className="pnb-auth-social-facebook" onClick={() => handleSocialLogin("Facebook")} aria-label="Continue with Facebook" title="Facebook">
              <Facebook size={21} />
              <span>Facebook</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
