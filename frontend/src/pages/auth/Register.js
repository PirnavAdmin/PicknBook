import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaCheckCircle
} from "react-icons/fa";
import "../../STYLES/Login.css";
import "../../STYLES/Register.css";
import { requestAuth } from "../../services/authService";
import {
  validateLowercaseEmail,
  validateStrongPassword,
} from "../../utils/authValidation";
// import flightCarImage from "../../assets/images/flightcar.png";
import flightCarImage from "../../assets/images/loginimage.png";

const COUNTRY_CODE_OPTIONS = [
  { value: "", label: "Select code", mobileLength: null },
  { value: "+91", label: "+91 (India)", mobileLength: 10 },
  // { value: "+1", label: "+1 (USA/Canada)", mobileLength: 10 },
  // { value: "+44", label: "+44 (UK)", mobileLength: 10 },
  // { value: "+61", label: "+61 (Australia)", mobileLength: 9 },
  // { value: "+971", label: "+971 (UAE)", mobileLength: 9 }
];

const COUNTRY_CODE_MAP = COUNTRY_CODE_OPTIONS.reduce((map, option) => {
  if (option.value) {
    map.set(option.value, option);
  }
  return map;
}, new Map());

const NAME_REGEX = /^[A-Za-z]+$/;
const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 60;
const REQUIRED_FIELD_NAMES = new Set([
  "firstName",
  "lastName",
  "countryCode",
  "mobile",
  "password",
  "confirmPassword",
  "email",
  "emailOtp",
  "agree",
]);

const formatOtpTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

const normalizeForm = (form) => ({
  ...form,
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  mobile: form.mobile.trim(),
  email: form.email,
  password: form.password,
  confirmPassword: form.confirmPassword,
  emailOtp: (form.emailOtp || "").trim()
});

const REQUIRED_FIELDS_MESSAGE = "Please fill all required";

const hasAnyEnteredRegisterDetail = (form, { includeOtp = false } = {}) => {
  return Boolean(
    form.firstName ||
      form.lastName ||
      form.countryCode ||
      form.mobile ||
      form.email ||
      form.password ||
      form.confirmPassword ||
      (includeOtp && form.emailOtp)
  );
};

const validateRegisterForm = (form, { requireOtp = false } = {}) => {
  const nextErrors = {};

  if (!form.firstName) {
    nextErrors.firstName = "First name is required";
  } else if (form.firstName.length > 18) {
    nextErrors.firstName = "First name cannot exceed 18 characters";
  } else if (!NAME_REGEX.test(form.firstName)) {
    nextErrors.firstName = "Only letters are allowed";
  }

  if (!form.lastName) {
    nextErrors.lastName = "Last name is required";
  }  else if (form.lastName.length > 18) {
    nextErrors.lastName = "Last name cannot exceed 18 characters";
  } else if (!NAME_REGEX.test(form.lastName)) {
    nextErrors.lastName = "Only letters are allowed";
  }

  if (!form.countryCode) {
    nextErrors.countryCode = "Please select a country code";
  } else if (!COUNTRY_CODE_MAP.has(form.countryCode)) {
    nextErrors.countryCode = "Invalid country code";
  }

  if (!form.mobile) {
    nextErrors.mobile = "Mobile number is required";
  } else if (!/^\d+$/.test(form.mobile)) {
    nextErrors.mobile = "Only numbers are allowed";
  } else {
    const countryConfig = COUNTRY_CODE_MAP.get(form.countryCode);
    const expectedLength = countryConfig?.mobileLength;

    if (expectedLength && form.mobile.length !== expectedLength) {
      nextErrors.mobile = `Mobile number must contain ${expectedLength} digits`;
    } else if (form.countryCode === "+91" && !/^[6-9]/.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid mobile number";
    } else if (!expectedLength && (form.mobile.length < 6 || form.mobile.length > 15)) {
      nextErrors.mobile = "Enter a valid mobile number";
    }
  }

  const emailError = validateLowercaseEmail(
    form.email,
    "Email address is required"
  );

  if (emailError) {
    nextErrors.email = emailError;
  }

  const passwordError = validateStrongPassword(form.password);
  if (passwordError) {
    nextErrors.password = passwordError;
  }

  if (!form.confirmPassword) {
    nextErrors.confirmPassword = "Please confirm your password";
  } else if (/\s/.test(form.confirmPassword)) {
    nextErrors.confirmPassword = "Confirm password cannot contain spaces";
  } else if (form.confirmPassword !== form.password) {
    nextErrors.confirmPassword = "Passwords do not match";
  }

  if (requireOtp) {
    if (!form.emailOtp) {
      nextErrors.emailOtp = "OTP is required";
    } else if (!/^\d{6}$/.test(form.emailOtp)) {
      nextErrors.emailOtp = "Enter the 6 digit OTP";
    }
  }

  if (!form.agree) {
    nextErrors.agree = "Please accept terms & conditions";
  }

  return nextErrors;
};

const Register = () => {
  const navigate = useNavigate();
  const firstNameRef = useRef(null);
  const otpInputRefs = useRef([]);
  const authPageStyle = {
    backgroundImage: `url(${flightCarImage})`
  };

  useEffect(() => {
    firstNameRef.current.focus();
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [highlightRequiredFields, setHighlightRequiredFields] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    countryCode: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    emailOtp: "",
    agree: false
  });

  const [touched, setTouched] = useState({});

  const normalizedForm = useMemo(() => normalizeForm(form), [form]);
  const validationErrors = useMemo(
    () => validateRegisterForm(normalizedForm, { requireOtp: emailOtpSent }),
    [normalizedForm, emailOtpSent]
  );
  const selectedCountry = COUNTRY_CODE_MAP.get(form.countryCode);
  const mobileMaxLength = selectedCountry?.mobileLength || 15;
  const accountFieldsLocked = emailOtpSent || loading;
  const otpTimerExpired = emailOtpSent && otpSecondsLeft === 0;

  useEffect(() => {
    if (!emailOtpSent || otpSecondsLeft <= 0) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setOtpSecondsLeft((secondsLeft) => Math.max(secondsLeft - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [emailOtpSent, otpSecondsLeft]);

  const getFieldError = (fieldName) => {
    if (serverErrors[fieldName]) {
      return serverErrors[fieldName];
    }

    if (!touched[fieldName]) {
      return "";
    }

    return touched[fieldName] && validationErrors[fieldName];
  };

  const shouldHighlightRequiredField = (fieldName) =>
    highlightRequiredFields &&
    REQUIRED_FIELD_NAMES.has(fieldName) &&
    (fieldName !== "emailOtp" || emailOtpSent);

  const getFieldHasError = (fieldName) =>
    shouldHighlightRequiredField(fieldName) || Boolean(getFieldError(fieldName));

  const getStatusMessage = () => {
    if (apiMessage) {
      return apiMessage;
    }

    return "";
  };

  const statusMessage = getStatusMessage();
  const showGlobalError = statusMessage && !isSuccess;

  const sanitizeValue = (name, value) => {
    if (name === "firstName" || name === "lastName") {
      return value.replace(/\s+/g, "").slice(0, 18);
    }

    if (name === "mobile") {
      return value.replace(/\s+/g, "").slice(0, 15);
    }

    if (name === "email") {
      return value;
    }

    if (name === "emailOtp") {
      return value.replace(/\D+/g, "").slice(0, 6);
    }

    return value;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : sanitizeValue(name, value);

    setForm((prev) => ({
      ...prev,
      [name]: nextValue
    }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setServerErrors((prev) => ({ ...prev, [name]: "" }));
    setHighlightRequiredFields(false);
    setApiMessage("");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const showEmailSpaceError = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    setServerErrors((prev) => ({
      ...prev,
      email: "Email cannot contain spaces",
    }));
    setHighlightRequiredFields(false);
    setApiMessage("");
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

  const updateEmailOtp = (nextOtp) => {
    setForm((prev) => ({
      ...prev,
      emailOtp: nextOtp
    }));
    setTouched((prev) => ({ ...prev, emailOtp: true }));
    setServerErrors((prev) => ({ ...prev, emailOtp: "" }));
    setHighlightRequiredFields(false);
    setApiMessage("");
  };

  const handleOtpBoxChange = (index, value) => {
    const digits = value.replace(/\D+/g, "");

    if (!digits) {
      const otpDigits = form.emailOtp.split("");
      otpDigits.splice(index, 1);
      updateEmailOtp(otpDigits.join("").slice(0, OTP_LENGTH));
      return;
    }

    const otpDigits = form.emailOtp.split("");
    digits.split("").forEach((digit, offset) => {
      const nextIndex = index + offset;
      if (nextIndex < OTP_LENGTH) {
        otpDigits[nextIndex] = digit;
      }
    });

    updateEmailOtp(otpDigits.join("").slice(0, OTP_LENGTH));

    const focusIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !form.emailOtp[index] && index > 0) {
      event.preventDefault();
      const otpDigits = form.emailOtp.split("");
      otpDigits.splice(index - 1, 1);
      updateEmailOtp(otpDigits.join("").slice(0, OTP_LENGTH));
      otpInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (index, event) => {
    event.preventDefault();
    handleOtpBoxChange(index, event.clipboardData.getData("text"));
  };

  const markAllTouched = (includeOtp = false) => {
    setTouched({
      firstName: true,
      lastName: true,
      countryCode: true,
      mobile: true,
      email: true,
      password: true,
      confirmPassword: true,
      emailOtp: includeOtp,
      agree: true
    });
  };

  const showValidationErrors = (formToCheck, includeOtp = false) => {
    if (!hasAnyEnteredRegisterDetail(formToCheck, { includeOtp })) {
      setTouched({});
      setServerErrors({});
      setHighlightRequiredFields(true);
      setApiMessage(REQUIRED_FIELDS_MESSAGE);
      setIsSuccess(false);
      return;
    }

    setHighlightRequiredFields(false);
    markAllTouched(includeOtp);
    setApiMessage("");
    setIsSuccess(false);
  };

  const sendRegistrationOtp = async () => {
    if (loading) return;

    const cleanedForm = normalizeForm(form);
    setForm(cleanedForm);

    const nextErrors = validateRegisterForm(cleanedForm);
    const formIsValid = Object.keys(nextErrors).length === 0;
    if (!formIsValid) {
      showValidationErrors(cleanedForm);
      return;
    }

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);
    setServerErrors({});

    try {
      await requestAuth(
        "/api/Auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            firstName: cleanedForm.firstName,
            lastName: cleanedForm.lastName,
            phoneNumber: cleanedForm.countryCode + cleanedForm.mobile,
            email: cleanedForm.email,
            password: cleanedForm.password
          })
        },
        "Registration failed"
      );

      await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: cleanedForm.email
          })
        },
        "Failed to send OTP"
      );

      setEmailOtpSent(true);
      setOtpSecondsLeft(OTP_TIMER_SECONDS);
      setTouched((prev) => ({ ...prev, emailOtp: false }));
      setIsSuccess(true);
      setApiMessage(
        "OTP sent to your email. Enter it below and click Sign Up."
      );
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 0);
    } catch (error) {
      const message = error?.message || "Something went wrong. Please try again.";

      setIsSuccess(false);

      if (/already/i.test(message)) {
        setServerErrors({
          email: "Email already registered"
        });
        setTouched((prev) => ({ ...prev, email: true }));
        setApiMessage("Email already registered");
      } else {
        setApiMessage(message);
      }
    }

    setLoading(false);
  };

  const resendEmailOtp = async () => {
    if (loading || resendingOtp || !emailOtpSent || otpSecondsLeft > 0) return;

    const cleanedForm = normalizeForm(form);
    setLoading(true);
    setResendingOtp(true);
    setApiMessage("");
    setIsSuccess(false);
    setServerErrors((prev) => ({ ...prev, emailOtp: "" }));

    try {
      await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: cleanedForm.email
          })
        },
        "Failed to resend OTP"
      );

      setForm((prev) => ({ ...prev, emailOtp: "" }));
      setTouched((prev) => ({ ...prev, emailOtp: false }));
      setOtpSecondsLeft(OTP_TIMER_SECONDS);
      setIsSuccess(true);
      setApiMessage("OTP resent to your email. Enter it before the timer ends.");
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 0);
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Failed to resend OTP");
    }

    setResendingOtp(false);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!emailOtpSent) {
      await sendRegistrationOtp();
      return;
    }

    const cleanedForm = normalizeForm(form);
    setForm(cleanedForm);

    if (otpTimerExpired) {
      setServerErrors({
        emailOtp: "OTP expired. Please resend OTP"
      });
      setTouched((prev) => ({ ...prev, emailOtp: true }));
      setApiMessage("OTP expired. Please resend OTP");
      setIsSuccess(false);
      return;
    }

    const nextErrors = validateRegisterForm(cleanedForm, {
      requireOtp: true
    });
    const formIsValid = Object.keys(nextErrors).length === 0;
    if (!formIsValid) {
      showValidationErrors(cleanedForm, true);
      return;
    }

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);
    setServerErrors({});

    try {
      await requestAuth(
        "/api/Auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            otp: cleanedForm.emailOtp,
            newPassword: cleanedForm.password
          })
        },
        "Invalid or expired OTP"
      );

      setIsSuccess(true);
      setApiMessage("OTP verified. Account created successfully.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      const message = error?.message || "Something went wrong. Please try again.";

      setIsSuccess(false);

      if (/otp/i.test(message)) {
        const otpMessage = /invalid|expire/i.test(message)
          ? "Invalid or expired OTP. Please resend OTP"
          : message;

        setServerErrors({
          emailOtp: otpMessage
        });
        setTouched((prev) => ({ ...prev, emailOtp: true }));
        setApiMessage(otpMessage);
      } else {
        setApiMessage(message);
      }
    }

    setLoading(false);
  };

  const hasValue = (value) => value.trim().length > 0;

  return (
    <div className="travel-auth-page travel-auth-register" style={authPageStyle}>
      <div className="travel-auth-card">
        <section className="travel-auth-form-panel">
          <h2 className="travel-auth-heading">Create Account</h2>
          <p className="travel-auth-subheading">
            Sign up to book bus seats, flights and more
          </p>

          {statusMessage && isSuccess && (
            <p
              className={`travel-auth-status ${isSuccess ? "is-success" : "is-error"}`}
            >
              {statusMessage}
            </p>
          )}

          <form className="travel-auth-form" onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className="travel-register-grid">
              <div className="travel-field">
                <label htmlFor="register-first-name">First Name <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("firstName") ? "has-error" : ""}`}>
                  <input
                    ref={firstNameRef}
                    id="register-first-name"
                    name="firstName"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="off"
                    maxLength={18}
                    disabled={accountFieldsLocked}
                  />
                  {hasValue(form.firstName) && !getFieldHasError("firstName") && (
                    <FaCheckCircle className="travel-field-check" aria-hidden="true" />
                  )}
                </div>
                <p className="travel-field-error">{getFieldError("firstName") || "\u00A0"}</p>
              </div>

              <div className="travel-field">
                <label htmlFor="register-last-name">Last Name <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("lastName") ? "has-error" : ""}`}>
                  <input
                    id="register-last-name"
                    name="lastName"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="off"
                    maxLength={18}
                    disabled={accountFieldsLocked}
                  />
                  {hasValue(form.lastName) && !getFieldHasError("lastName") && (
                    <FaCheckCircle className="travel-field-check" aria-hidden="true" />
                  )}
                </div>
                <p className="travel-field-error">{getFieldError("lastName") || "\u00A0"}</p>
              </div>

              <div className="travel-field">
                <label htmlFor="register-country-code">Country Code <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("countryCode") ? "has-error" : ""}`}>
                  <select
                    id="register-country-code"
                    name="countryCode"
                    value={form.countryCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={accountFieldsLocked}
                  >
                    {COUNTRY_CODE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="travel-field-error">{getFieldError("countryCode") || "\u00A0"}</p>
              </div>

              <div className="travel-field">
                <label htmlFor="register-mobile">Mobile Number <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("mobile") ? "has-error" : ""}`}>
                  <input
                    id="register-mobile"
                    name="mobile"
                    placeholder="Mobile number"
                    value={form.mobile}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={mobileMaxLength}
                    disabled={accountFieldsLocked}
                  />
                  {hasValue(form.mobile) && !getFieldHasError("mobile") && (
                    <FaCheckCircle className="travel-field-check" aria-hidden="true" />
                  )}
                </div>
                <p className="travel-field-error">{getFieldError("mobile") || "\u00A0"}</p>
              </div>

              <div className="travel-field">
                <label htmlFor="register-password">Password <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("password") ? "has-error" : ""}`}>
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    maxLength={64}
                    disabled={accountFieldsLocked}
                  />
                  <button
                    type="button"
                    className="travel-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={accountFieldsLocked}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="travel-field-error">{getFieldError("password") || "\u00A0"}</p>
              </div>

              <div className="travel-field">
                <label htmlFor="register-confirm-password">Confirm Password <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line ${getFieldHasError("confirmPassword") ? "has-error" : ""}`}>
                  <input
                    id="register-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    maxLength={64}
                    disabled={accountFieldsLocked}
                  />
                  <button
                    type="button"
                    className="travel-eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    disabled={accountFieldsLocked}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="travel-field-error">{getFieldError("confirmPassword") || "\u00A0"}</p>
              </div>

              <div className="travel-field travel-email-field">
                <label htmlFor="register-email">E-mail Address <span className="travel-required-star">*</span></label>
                <div className={`travel-field-line travel-email-otp-line ${getFieldHasError("email") ? "has-error" : ""}`}>
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleEmailKeyDown}
                    onPaste={handleEmailPaste}
                    autoComplete="new-email"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={accountFieldsLocked}
                  />
                  {!emailOtpSent ? (
                    <button
                      type="button"
                      className="travel-send-otp-btn"
                      onClick={sendRegistrationOtp}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  ) : hasValue(form.email) && !getFieldHasError("email") && (
                    <FaCheckCircle className="travel-field-check" aria-hidden="true" />
                  )}
                </div>
                <p className="travel-field-error">{getFieldError("email") || "\u00A0"}</p>
              </div>

              {emailOtpSent && (
                <div className="travel-field travel-otp-field">
                  <label htmlFor="register-email-otp">Enter OTP <span className="travel-required-star">*</span></label>
                  <div className={`travel-otp-boxes ${getFieldHasError("emailOtp") ? "has-error" : ""}`}>
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpInputRefs.current[index] = element;
                        }}
                        id={index === 0 ? "register-email-otp" : undefined}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`OTP digit ${index + 1}`}
                        value={form.emailOtp[index] || ""}
                        onChange={(event) => handleOtpBoxChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={(event) => handleOtpPaste(index, event)}
                        onBlur={handleBlur}
                        name="emailOtp"
                        maxLength={1}
                        disabled={loading}
                      />
                    ))}
                  </div>
                  <div className="travel-otp-meta">
                    <span className={`travel-otp-timer ${otpTimerExpired ? "is-expired" : ""}`}>
                      {otpTimerExpired
                        ? "OTP time expired"
                        : `OTP expires in ${formatOtpTime(otpSecondsLeft)}`}
                    </span>
                    {otpTimerExpired && (
                      <button
                        type="button"
                        className="travel-resend-otp-btn"
                        onClick={resendEmailOtp}
                        disabled={loading || resendingOtp}
                      >
                        {resendingOtp ? "Resending..." : "Resend OTP"}
                      </button>
                    )}
                  </div>
                  <p className="travel-field-error">{getFieldError("emailOtp") || "\u00A0"}</p>
                </div>
              )}
            </div>

            <div className="travel-terms-wrap">
              <label className={`travel-terms ${getFieldHasError("agree") ? "has-error" : ""}`}>
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={accountFieldsLocked}
                />
                <span>
                  I agree with{" "}
                  <span className="travel-terms-link">Terms & Conditions</span>
                  <span className="travel-required-star"> *</span>
                </span>
              </label>
              <p className="travel-field-error">{getFieldError("agree") || "\u00A0"}</p>
            </div>

            {showGlobalError && (
              <p className="form-global-error">{statusMessage}</p>
            )}

            <div className="travel-auth-actions">
              <button
                type="submit"
                className="travel-btn travel-btn-primary travel-signup-otp-btn"
                disabled={loading}
              >
                {loading
                  ? resendingOtp
                    ? "Resending OTP..."
                    : emailOtpSent
                      ? "Signing Up..."
                      : "Sending OTP..."
                  : "Sign Up"}
              </button>
            </div>

            <p className="travel-auth-footnote">
              Already have account?{" "}
              <button
                type="button"
                className="travel-footnote-link"
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Register;
