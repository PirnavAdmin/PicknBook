import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlaneDeparture, FaSyncAlt,FaBus } from "react-icons/fa";
import "../../STYLES/Login.css";
import "../../STYLES/RESETPASSWORD.css";
import { readApiMessage, requestAuth } from "../../services/authService";
import { validateLowercaseEmail } from "../../utils/authValidation";
import { generateMixedCaptcha, validateCaptcha } from "../../utils/captcha";
// import flightCarImage from "../../assets/images/flightcar.png";
import flightCarImage from "../../assets/images/loginimage.png";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const authPageStyle = {
    backgroundImage: `url(${flightCarImage})`
  };

  const generateCaptcha = () => {
    setGeneratedCaptcha(generateMixedCaptcha());
    setCaptchaInput("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

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

    if (emailError) {
      newErrors.email = emailError;
    }

    const captchaError = validateCaptcha(captchaInput, generatedCaptcha);

    if (captchaError) {
      newErrors.captcha = captchaError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    try {
      const resetEmail = email.trim();
      const payload = await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: resetEmail })
        },
        "Failed to send OTP."
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("passwordResetEmail", resetEmail);
      }
      setIsSuccess(true);
      setApiMessage(
        readApiMessage(payload, "If the email is registered, an OTP has been sent.")
      );
      setTimeout(() => {
        navigate("/verify", { state: { email: resetEmail } });
      }, 1200);
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="travel-auth-page travel-auth-forgot"
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
            Recover your traveler account and continue managing your bookings.
          </p>
          <p className="travel-auth-brand-meta">Secure account recovery</p>
        </aside>

        <section className="travel-auth-form-panel">
          <h2 className="travel-auth-heading">Forgot password</h2>
          <p className="travel-auth-subheading">
            Enter your registered email and we will send an OTP.
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
              <label htmlFor="forgot-email">E-mail Address</label>
              <div className="travel-field-line">
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your registered e-mail"
                  value={email}
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
              </div>
              <p className="travel-field-error">{errors.email || "\u00A0"}</p>
            </div>

            <div className="travel-field">
              <label htmlFor="forgot-captcha">Captcha</label>
              <div className="travel-captcha-row">
                <div className="travel-captcha-display" aria-label="Captcha code">
                  {generatedCaptcha.split("").map((char, index) => (
                    <span key={`${char}-${index}`}>{char}</span>
                  ))}
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
                  id="forgot-captcha"
                  type="text"
                  placeholder="Enter captcha code"
                  value={captchaInput}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={generatedCaptcha.length || 5}
                  onChange={(e) => {
                    const nextCaptcha = e.target.value;
                    setCaptchaInput(nextCaptcha);
                    setErrors((prev) => ({
                      ...prev,
                      captcha: /\s/.test(nextCaptcha)
                        ? "Captcha cannot contain spaces"
                        : "",
                    }));
                    setApiMessage("");
                    setIsSuccess(false);
                  }}
                />
              </div>
              <p className="travel-field-error">{errors.captcha || "\u00A0"}</p>
            </div>

            <div className="travel-auth-links">
              <button type="button" onClick={() => navigate("/login")}>
                Back to Login
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
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ResetPassword;
