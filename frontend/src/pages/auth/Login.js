import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaSyncAlt,
  FaPlaneDeparture,
  FaCheckCircle, FaBus,
} from "react-icons/fa";
import "../../STYLES/Login.css";
import { requestAuth } from "../../services/authService";
import {
  validateLowercaseEmail,
  validateStrongPassword,
} from "../../utils/authValidation";
import { generateMixedCaptcha, validateCaptcha } from "../../utils/captcha";
// import flightCarImage from "../../assets/images/flightcar.png";
import flightCarImage from "../../assets/images/loginimage.png";


function decodeJwtPayload(token) {
  
  if (!token || typeof token !== "string") {
    return {};
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return {};
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = atob(padded);
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function pickFirst(values, fallback = "") {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }
  return fallback;
}

function buildUserFromLoginResponse(responseData, emailInput) {
  const token = responseData?.token || responseData?.Token || "";
  const tokenPayload = decodeJwtPayload(token);
  const nestedUser =
    responseData?.user ||
    responseData?.User ||
    responseData?.data?.user ||
    responseData?.data?.User ||
    {};

  const email = pickFirst(
    [
      nestedUser.email,
      nestedUser.Email,
      responseData?.email,
      responseData?.Email,
      tokenPayload.email,
      tokenPayload.upn,
      tokenPayload.unique_name,
      emailInput,
    ],
    ""
  );

  const firstName = pickFirst(
    [
      nestedUser.firstName,
      nestedUser.FirstName,
      responseData?.firstName,
      responseData?.FirstName,
      tokenPayload.given_name,
      tokenPayload.firstName,
    ],
    ""
  );

  const lastName = pickFirst(
    [
      nestedUser.lastName,
      nestedUser.LastName,
      responseData?.lastName,
      responseData?.LastName,
      tokenPayload.family_name,
      tokenPayload.lastName,
    ],
    ""
  );

  const name = pickFirst(
    [
      nestedUser.name,
      nestedUser.Name,
      responseData?.name,
      responseData?.Name,
      tokenPayload.name,
      `${firstName} ${lastName}`.trim(),
      email.split("@")[0],
    ],
    "User"
  );

  return {
    userId: pickFirst(
      [
        nestedUser.userId,
        nestedUser.UserId,
        nestedUser.id,
        nestedUser.Id,
        responseData?.userId,
        responseData?.UserId,
        tokenPayload.sub,
        tokenPayload.nameid,
      ],
      ""
    ),
    role: pickFirst(
      [
        nestedUser.role,
        nestedUser.Role,
        responseData?.role,
        responseData?.Role,
      ],
      ""
    ),
    firstName,
    lastName,
    name,
    email,
    mobile: pickFirst(
      [
        nestedUser.mobile,
        nestedUser.Mobile,
        nestedUser.phoneNo,
        nestedUser.PhoneNo,
        nestedUser.phoneNumber,
        nestedUser.PhoneNumber,
      ],
      ""
    ),
  };
}

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const authPageStyle = {
    backgroundImage: `url(${flightCarImage})`
  };

  const generateCaptcha = () => {
    setGeneratedCaptcha(generateMixedCaptcha());
    setCaptcha("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleCaptchaManualOnly = (event) => {
    event.preventDefault();
    setErrors((prev) => ({
      ...prev,
      captcha: "Please type the captcha manually",
    }));
  };

  const showEmailSpaceError = () => {
    setErrors((prev) => ({
      ...prev,
      email: "Email cannot contain spaces",
    }));
    setApiMessage("");
    setIsSuccess(false);
  };

  const handleEmailKeyDown = (event) => {
    if (event.key === " ") {
      event.preventDefault();
      showEmailSpaceError();
    }
  };

  const handleEmailPaste = (event) => {
    if (/\s/.test(event.clipboardData.getData("text"))) {
      event.preventDefault();
      showEmailSpaceError();
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailError = validateLowercaseEmail(email);
    const passwordError = validateStrongPassword(password);

    if (emailError) {
      newErrors.email = emailError;
    }

    if (passwordError) {
      newErrors.password = passwordError;
    }

    const captchaError = validateCaptcha(captcha, generatedCaptcha);

    if (captchaError) {
      newErrors.captcha = captchaError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!validate()) return;

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    try {
      const data = await requestAuth(
        "/api/Auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        },
        "Invalid credentials"
      );
      const token = data?.token || data?.Token || "";
      const userProfile = buildUserFromLoginResponse(data, email.trim());
      const resolvedUserId = pickFirst(
        [userProfile.userId, data?.userId, data?.UserId],
        ""
      );
      const persistedProfile = {
        ...userProfile,
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      };

      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }

      if (resolvedUserId) {
        localStorage.setItem("userId", resolvedUserId);
      } else {
        localStorage.removeItem("userId");
      }

      // Keep admin-only flags from leaking into a normal user session.
      localStorage.removeItem("role");
      localStorage.removeItem("challengeId");
      localStorage.setItem("user", JSON.stringify(persistedProfile));

      sessionStorage.removeItem("role");
      sessionStorage.removeItem("challengeId");

      setIsSuccess(true);
      setApiMessage("Login successful.");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Something went wrong. Please try again.");
      setCaptcha("");
      generateCaptcha();
    }

    setLoading(false);
  };

  return (
    <div
      className="travel-auth-page travel-auth-login"
      style={authPageStyle}
    >
       {/* <div className="travel-bg-text">LOGIN</div> */}
      <div className="travel-auth-card">
        <aside className="travel-auth-brand">
          <p className="travel-auth-kicker">Welcome to</p>
          <div className="travel-auth-logo">
            <FaPlaneDeparture />< FaBus/>
          </div>
          <h1 className="travel-auth-brand-name">Travling</h1>
          <p className="travel-auth-brand-copy">
            Plan flights,buses hotels and holiday trips with one secure traveler
            account.
          </p>
          <p className="travel-auth-brand-meta">
            Travel smarter. Manage bookings faster.
          </p>
        </aside>

        <section className="travel-auth-form-panel">
          <h2 className="travel-auth-heading">Sign in to your account</h2>
          <p className="travel-auth-subheading">
            Access tickets, vouchers and trip updates instantly.
          </p>

          {apiMessage && (
            <p
              className={`travel-auth-status ${isSuccess ? "is-success" : "is-error"}`}
            >
              {apiMessage}
            </p>
          )}

          <form className="travel-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="travel-field">
              <label htmlFor="login-email">E-mail Address <span>*</span></label>
              <div className="travel-field-line">
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your e-mail"
                  value={email}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  onKeyDown={handleEmailKeyDown}
                  onPaste={handleEmailPaste}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      email: validateLowercaseEmail(e.target.value) || "",
                    }));
                    setApiMessage("");
                    setIsSuccess(false);
                  }}
                />
                {email.trim() && (
                  <FaCheckCircle className="travel-field-check" aria-hidden="true" />
                )}
              </div>
              <p className="travel-field-error">{errors.email || "\u00A0"}</p>
            </div>

            <div className="travel-field">
              <label htmlFor="login-password">Password <span>*</span></label>
              <div className="travel-field-line">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      password: e.target.value
                        ? validateStrongPassword(e.target.value)
                        : "",
                    }));
                    setApiMessage("");
                    setIsSuccess(false);
                  }}
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
              <label htmlFor="login-captcha">Captcha <span>*</span></label>
              <div className="travel-captcha-row">
                <div
                  className="travel-captcha-display"
                  aria-label="Captcha code"
                  onCopy={handleCaptchaManualOnly}
                  onCut={handleCaptchaManualOnly}
                  onContextMenu={handleCaptchaManualOnly}
                  onDragStart={handleCaptchaManualOnly}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <span className="captcha-text">{generatedCaptcha}</span>
                </div>
                <button
                  type="button"
                  className="travel-captcha-refresh"
                  onClick={generateCaptcha}
                >
                  <FaSyncAlt />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="travel-field-line">
                <input
                  id="login-captcha"
                  type="text"
                  placeholder="Enter captcha code"
                  value={captcha}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={generatedCaptcha.length || 5}
                  onPaste={handleCaptchaManualOnly}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onDrop={handleCaptchaManualOnly}
                  onChange={(e) => {
                    const nextCaptcha = e.target.value;
                    setCaptcha(nextCaptcha);
                    setErrors((prev) => ({
                      ...prev,
                      captcha: /\s/.test(nextCaptcha)
                        ? "Captcha cannot contain spaces"
                        : "",
                    }));
                  }}
                />
              </div>
              <p className="travel-field-error">{errors.captcha || "\u00A0"}</p>
            </div>

            <div className="travel-auth-links">
              <button type="button" onClick={() => navigate("/Forget")}>
                Forgot Password
              </button>
              <button type="button" onClick={() => navigate("/register")}>
                Create Account
              </button>
            </div>

            <div className="travel-auth-actions">
              <button
                type="submit"
                className="travel-btn travel-btn-primary"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <p className="travel-auth-footnote">
              Your details are protected with secure authentication.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
