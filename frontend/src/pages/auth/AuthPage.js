/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { getPendingBookingReturn, clearPendingBookingReturn } from "../../utils/authNavigation";
import {
  LockKeyhole, Mail, Phone, ShieldCheck,
  Eye, EyeOff, User, ArrowLeft, Facebook,
  Plane, Bus, Building2, MapPin,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import "../../STYLES/AuthPage.css";
import brandLogo from "../../assets/images/brand/pick-n-book-logo.png";
import loginBg from "../../assets/images/illustrations/image.png";
import {
  requestAuth,
  readApiMessage,
  loginUser,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  sendLoginOtp,
  verifyLoginOtp,
  registerCustomer,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
} from "../../services/authService";

const OTP_LENGTH = 6;

/* ─── Helpers (unchanged) ─────────────────────────────────── */
function pickFirst(source, keys, fallback = "") {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return fallback;
}
function buildGuestUserFromMobile(mobile) {
  return { userId: `mobile-${mobile}`, name: `User ${mobile.slice(-4)}`, firstName: "User", lastName: "", email: "", mobile, role: "Customer", authType: "mobile-otp" };
}
function buildUserFromEmailLogin(payload, email) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.user || root.User || root.profile || root.Profile || root.data || root.Data || root.result || root.Result || {};
  const source = nested.user || nested.User || nested;
  return {
    userId: String(pickFirst(source, ["userId","UserId","id","Id","uid","Uid"], "") || pickFirst(root, ["userId","UserId","id","Id"], `email-${email}`)),
    name: String(pickFirst(source, ["name","Name","fullName","FullName","firstName","FirstName"], email.split("@")[0])),
    firstName: String(pickFirst(source, ["firstName","FirstName"], "")),
    lastName: String(pickFirst(source, ["lastName","LastName"], "")),
    email: String(pickFirst(source, ["email","Email","emailAddress","EmailAddress"], email)),
    mobile: String(pickFirst(source, ["mobile","Mobile","phoneNumber","PhoneNumber"], "")),
    role: String(pickFirst(source, ["role","Role"], "Customer")),
    authType: "email",
  };
}
function extractToken(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.data || root.Data || root.result || root.Result || root.user || root.User || {};
  return String(
    pickFirst(root, ["token","Token","accessToken","AccessToken","jwtToken","JwtToken"], "") ||
    pickFirst(nested, ["token","Token","accessToken","AccessToken","jwtToken","JwtToken"], "")
  );
}

function validateEmailAddress(emailStr) {
  const trimmed = String(emailStr || "").trim();
  if (!trimmed) {
    return { valid: false, error: "Enter an email address." };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Enter a valid email address (e.g., name@example.com)." };
  }

  const parts = trimmed.toLowerCase().split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Enter a valid email address." };
  }

  const localPart = parts[0];
  const domain = parts[1];

  const typoSuggestions = {
    "gail.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmai.com": "gmail.com",
    "gmil.com": "gmail.com",
    "gmaii.com": "gmail.com",
    "g-mail.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahoo.co": "yahoo.com",
    "yaho.co": "yahoo.com",
    "yahoomail.co": "yahoo.com",
    "hotmai.com": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "outloo.com": "outlook.com",
    "outlook.co": "outlook.com",
    "outlok.com": "outlook.com",
    "iclou.com": "icloud.com",
    "icloud.co": "icloud.com",
    "rediffmaill.com": "rediffmail.com",
  };

  if (typoSuggestions[domain]) {
    const suggested = `${localPart}@${typoSuggestions[domain]}`;
    return {
      valid: false,
      error: `Invalid email domain. Did you mean ${typoSuggestions[domain]}? (${suggested})`,
    };
  }

  return { valid: true, error: "" };
}

/* ─── Spinner ─────────────────────────────────────────────── */
function Spinner() { return <span className="auth-spinner" aria-hidden="true" />; }

/* ─── Step Dots ───────────────────────────────────────────── */
function StepDots({ total, current }) {
  return (
    <div className="auth-step-dots" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={["auth-step-dot", i < current - 1 ? "auth-step-dot--done" : "", i === current - 1 ? "auth-step-dot--active" : ""].filter(Boolean).join(" ")} />
      ))}
    </div>
  );
}

/* ─── Status Banner ───────────────────────────────────────── */
function StatusBanner({ status }) {
  if (!status?.message) return null;
  return <div className={`auth-page-status ${status.type === "success" ? "is-success" : "is-error"}`} role="alert">{status.message}</div>;
}

/* ─── Password Requirements ───────────────────────────────── */
function PasswordRequirements({ password }) {
  if (!password) return null;
  const reqs = [
    { label: "8-64 characters", valid: password.length >= 8 && password.length <= 64 },
    { label: "1 uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", valid: /[a-z]/.test(password) },
    { label: "1 number", valid: /\d/.test(password) },
    { label: "1 special character", valid: /[\W_]/.test(password) },
    { label: "No spaces", valid: !/\s/.test(password) && password.length > 0 }
  ];

  return (
    <div style={{ marginTop: "6px", padding: "10px", background: "#f8fafc", borderRadius: "8px", fontSize: "0.75rem", color: "#64748b" }}>
      <div style={{ fontWeight: 600, marginBottom: "8px", color: "#334155" }}>Password Requirements:</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {reqs.map((req, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", color: req.valid ? "#10b981" : "#64748b" }}>
            {req.valid ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1px solid #cbd5e1" }} />
            )}
            <span style={{ lineHeight: 1 }}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { returnTo: pendingReturnTo, bookingContext: pendingBookingContext } = getPendingBookingReturn(location, searchParams);
  const returnTo = pendingReturnTo || searchParams.get("returnTo") || "";
  const initialMode = searchParams.get("mode") || "login";

  /* ── Existing login/register state (UNCHANGED) ─────────── */
  const [authMethod, setAuthMethod]       = useState("mobile");
  const [fullName, setFullName]           = useState("");
  const [mobile, setMobile]               = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [otp, setOtp]                     = useState("");
  const [otpSent, setOtpSent]             = useState(false);
  const [timeLeft, setTimeLeft]           = useState(0);
  const [status, setStatus]               = useState({ type: "", message: "" });
  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [viewMode, setViewMode]           = useState(initialMode === "register" ? "register" : "login");
  const [showPassword, setShowPassword]   = useState(false);
  const [keepSignedIn, setKeepSignedIn]   = useState(false);
  const [adminChallengeId, setAdminChallengeId] = useState("");

  /* ── NEW: Forgot-password state ─────────────────────────── */
  const [fpStep, setFpStep]                     = useState(1);
  const [fpChannel, setFpChannel]               = useState("email");
  const [fpEmail, setFpEmail]                   = useState("");
  const [fpMobile, setFpMobile]                 = useState("");
  const [fpOtp, setFpOtp]                       = useState("");
  const [fpNewPassword, setFpNewPassword]       = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpShowNewPwd, setFpShowNewPwd]         = useState(false);
  const [fpShowConfirmPwd, setFpShowConfirmPwd] = useState(false);
  const [fpTimeLeft, setFpTimeLeft]             = useState(0);
  const [fpLoading, setFpLoading]               = useState(false);
  const [fpStatus, setFpStatus]                 = useState({ type: "", message: "" });
  const [fpErrors, setFpErrors]                 = useState({});
  const [fpResetToken, setFpResetToken]         = useState("");

  /* ── Animation key ─────────────────────────────────────── */
  const [stepKey, setStepKey] = useState(0);
  const bump = () => setStepKey((k) => k + 1);

  /* ── Timers (UNCHANGED) ─────────────────────────────────── */
  useEffect(() => {
    if (!otpSent || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(id);
  }, [otpSent, timeLeft <= 0]);

  useEffect(() => {
    if (fpStep !== 2 || fpTimeLeft <= 0) return;
    const id = setInterval(() => setFpTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(id);
  }, [fpStep, fpTimeLeft <= 0]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const goBack = () => { 
    if (returnTo && returnTo.startsWith("/")) {
      navigate(returnTo, { state: pendingBookingContext || undefined });
    } else {
      navigate(-1);
    }
  };

  /* ── completeLogin ────────────────────────────────────────── */
  const completeLogin = (message) => {
    window.dispatchEvent(new Event("storage"));
    setStatus({ type: "success", message });

    const targetReturn = returnTo;
    const targetContext = pendingBookingContext;
    clearPendingBookingReturn();

    window.setTimeout(() => {
      const role = (localStorage.getItem("role") || sessionStorage.getItem("role")) || "";
      if (targetReturn && targetReturn.startsWith("/")) {
        navigate(targetReturn, { state: targetContext || undefined, replace: true });
      } else if (role === "Admin") {
        navigate("/admin", { replace: true });
      } else if (role === "Agent" || role === "B2B") {
        navigate("/b2b/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }, 400);
  };

  /* ── Input handlers (UNCHANGED) ─────────────────────────── */
  const handleMobileChange   = (e) => { setMobile(e.target.value.replace(/\D/g,"").slice(0,10)); setErrors({}); setStatus({type:"",message:""}); };
  const handleEmailChange    = (e) => { setEmail(e.target.value.trimStart()); setErrors({}); setStatus({type:"",message:""}); };
  const handlePasswordChange = (e) => { setPassword(e.target.value); setErrors({}); setStatus({type:"",message:""}); };
  const handleOtpChange      = (e) => { setOtp(e.target.value.replace(/\D/g,"").slice(0,OTP_LENGTH)); setErrors({}); setStatus({type:"",message:""}); };
  const switchAuthMethod = (method) => { setAuthMethod(method); setOtpSent(false); setOtp(""); setErrors({}); setStatus({type:"",message:""}); setTimeLeft(0); };

  /* ── switchView ─────────────────────────────────────────── */
  const switchView = (mode) => {
    setViewMode(mode);
    setErrors({}); setStatus({type:"",message:""});
    setOtpSent(false); setTimeLeft(0); setAdminChallengeId("");
    if (mode === "forgot-password") {
      setFpStep(1); setFpEmail(""); setFpMobile(""); setFpOtp("");
      setFpNewPassword(""); setFpConfirmPassword("");
      setFpStatus({type:"",message:""}); setFpErrors({});
      setFpTimeLeft(0); setFpResetToken("");
    }
    bump();
  };

  /* ── sendOtp ────────────────────────────────────────────── */
  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) { setErrors({ mobile: "Enter a valid 10-digit mobile number" }); return; }
    setLoading(true); setStatus({type:"",message:""});
    try {
      const payload = await sendLoginOtp({ phoneNumber: mobile });
      setOtpSent(true); setOtp(""); setTimeLeft(300);
      setStatus({ type:"success", message: readApiMessage(payload, "OTP sent to your mobile number.") });
    } catch (error) {
      setStatus({ type:"error", message: error?.message || "Mobile number not registered." });
    } finally { setLoading(false); }
  };

  /* ── verifyOtp ───────────────────────────────────────────── */
  const verifyOtp = async (e) => {
    e.preventDefault(); if (loading) return;
    if (!/^\d{6}$/.test(otp)) { setErrors({ otp: "Enter the 6-digit OTP" }); return; }
    setLoading(true); setStatus({type:"",message:""});
    try {
      const guestId = localStorage.getItem("guest_id") || sessionStorage.getItem("guest_id") || null;
      const payload = await verifyLoginOtp({ phoneNumber: mobile, otp }, guestId);
      
      const token = extractToken(payload);
      const user = buildUserFromEmailLogin(payload, mobile);
      const userRole = user.role || "Customer";
      
      localStorage.setItem("user", JSON.stringify(user)); 
      localStorage.setItem("userId", user.userId); 
      localStorage.setItem("role", userRole);
      sessionStorage.setItem("user", JSON.stringify(user)); 
      sessionStorage.setItem("userId", user.userId); 
      sessionStorage.setItem("role", userRole);
      
      if (token) {
        localStorage.setItem("token", token);
        sessionStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
      }
      
      localStorage.removeItem("challengeId"); 
      sessionStorage.removeItem("challengeId");
      completeLogin(readApiMessage(payload, "Mobile verified. Login successful."));
    } catch (error) {
      setStatus({ type:"error", message: error?.message || "Invalid or expired OTP." });
    } finally { setLoading(false); }
  };

  /* ── sendRegisterOtp (UNCHANGED) ────────────────────────── */
  const sendRegisterOtp = async (e) => {
    if (e) e.preventDefault(); if (loading) return;
    if (!fullName || !mobile || !email || !password) { setStatus({type:"error", message:"Please fill in all required fields."}); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { setErrors({ mobile:"Enter a valid 10-digit mobile number" }); return; }
    const registerEmailVal = validateEmailAddress(email);
    if (!registerEmailVal.valid) { setErrors({ email: registerEmailVal.error }); return; }
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[^\s]{8,64}$/;
    if (!pwdRegex.test(password)) {
      setErrors({ password: "Password does not meet all requirements." });
      setStatus({type:"error", message:"Please fix the password requirements."});
      return;
    }
    setLoading(true); setStatus({type:"",message:""});
    try {
      const payload = await sendRegistrationOtp({ email, channel: "Email" });
      setOtpSent(true); setOtp(""); setTimeLeft(300); setViewMode("register-otp");
      setStatus({ type:"success", message: readApiMessage(payload, "OTP sent to your email address.") });
    } catch (error) {
      setStatus({ type:"error", message: error?.message || "Failed to send OTP. Please try again." });
    } finally { setLoading(false); }
  };

  /* ── handleRegister (UNCHANGED) ─────────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault(); if (loading) return;
    if (!/^\d{6}$/.test(otp)) { setErrors({ otp:"Enter the 6-digit OTP" }); return; }
    setLoading(true); setStatus({type:"",message:""});
    try {
      await verifyRegistrationOtp({ email, channel:"Email", otp });
      const payload = await registerCustomer({ firstName: fullName.split(" ")[0] || fullName, lastName: fullName.split(" ").slice(1).join(" ") || "", phoneNumber: mobile, email, password });
      setStatus({ type:"success", message: readApiMessage(payload, "Registration successful! You can now log in.") });
      setTimeout(() => { setOtpSent(false); setViewMode("login"); }, 2000);
    } catch (error) {
      setStatus({ type:"error", message: error?.message || "Invalid OTP or Registration failed." });
    } finally { setLoading(false); }
  };

  /* ── loginWithEmail (UNCHANGED) ─────────────────────────── */
  const loginWithEmail = async (e) => {
    e.preventDefault(); if (loading) return;
    if (adminChallengeId) {
      if (!otp) { setErrors({ otp:"Enter the OTP" }); return; }
      setLoading(true); setStatus({type:"",message:""});
      try {
        const data = await requestAuth("/api/Auth/admin/login/verify-otp", { method:"POST", body:JSON.stringify({ challengeId:adminChallengeId, otp }) }, "Invalid OTP");
        const rawToken = data?.token || data?.Token || data?.tokenString || data?.data?.token || "";
        const rawRole  = data?.role  || data?.Role  || data?.data?.role  || "admin";
        const rawName  = data?.name  || data?.fullName || data?.email || data?.data?.name || "Admin";
        localStorage.setItem("adminToken", rawToken); localStorage.setItem("adminRole", rawRole); localStorage.setItem("adminName", rawName); localStorage.setItem("role", "Admin");
        sessionStorage.setItem("adminToken", rawToken); sessionStorage.setItem("adminRole", rawRole); sessionStorage.setItem("adminName", rawName); sessionStorage.setItem("role", "Admin");
        localStorage.removeItem("challengeId"); sessionStorage.removeItem("challengeId");
        completeLogin("Admin login successful.");
      } catch (error) { setStatus({type:"error", message: error?.message || "Invalid OTP"}); } finally { setLoading(false); }
      return;
    }
    const trimmedEmail = email.trim();
    const nextErrors = {};
    const loginEmailVal = validateEmailAddress(trimmedEmail);
    if (!loginEmailVal.valid) nextErrors.email = loginEmailVal.error;
    if (!password) nextErrors.password = "Enter your password";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setLoading(true); setStatus({type:"",message:""});
    try {
      const payload  = await loginUser({ email: trimmedEmail, password });
      const token    = extractToken(payload);
      const user     = buildUserFromEmailLogin(payload, trimmedEmail);
      const userRole = user.role || "Customer";
      const roleLower = userRole.toLowerCase();
      if (roleLower === "agent" || roleLower === "b2b") {
        localStorage.setItem("b2b_user", JSON.stringify(user)); localStorage.setItem("b2b_userId", user.userId);
        localStorage.setItem("b2b_role", "Agent"); if (token) localStorage.setItem("b2b_token", token); localStorage.setItem("role", "Agent");
        sessionStorage.setItem("b2b_user", JSON.stringify(user)); sessionStorage.setItem("b2b_userId", user.userId);
        sessionStorage.setItem("b2b_role", "Agent"); if (token) sessionStorage.setItem("b2b_token", token); sessionStorage.setItem("role", "Agent");
      } else if (roleLower === "admin") {
        localStorage.setItem("adminRole", "admin"); if (token) localStorage.setItem("adminToken", token); localStorage.setItem("role", "Admin");
        sessionStorage.setItem("adminRole", "admin"); if (token) sessionStorage.setItem("adminToken", token); sessionStorage.setItem("role", "Admin");
      } else {
        localStorage.setItem("user", JSON.stringify(user)); localStorage.setItem("userId", user.userId); localStorage.setItem("role", userRole);
        sessionStorage.setItem("user", JSON.stringify(user)); sessionStorage.setItem("userId", user.userId); sessionStorage.setItem("role", userRole);
        if (token) { 
          localStorage.setItem("token", token); 
          sessionStorage.setItem("token", token); 
        } else { 
          localStorage.removeItem("token"); 
          sessionStorage.removeItem("token"); 
        }
      }
      localStorage.removeItem("challengeId"); sessionStorage.removeItem("challengeId");
      completeLogin(readApiMessage(payload, "Login successful."));
    } catch (error) {
      const errorMsg = String(error?.message || "");
      if (errorMsg.toLowerCase().includes("admin") || errorMsg.toLowerCase().includes("otp")) {
        try {
          const data = await requestAuth("/api/Auth/admin/login/request-otp", { method:"POST", body:JSON.stringify({ email:trimmedEmail, password }) }, "Admin login failed");
          setAdminChallengeId(data.challengeId || data.ChallengeId); setOtp("");
          setStatus({type:"success", message:"Admin OTP sent to your email."}); return;
        } catch (adminErr) { setStatus({type:"error", message: adminErr?.message || "Admin login failed."}); return; }
      }
      setStatus({type:"error", message: errorMsg || "Invalid email or password."});
    } finally { setLoading(false); }
  };

  const handleSocialLogin = (provider) => setStatus({ type:"error", message:`${provider} login is not configured yet.` });

  /* ── NEW: Forgot-password handlers ─────────────────────── */
  const fpSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (fpLoading) return;
    setFpErrors({});
    if (fpChannel === "email") {
      const fpEmailVal = validateEmailAddress(fpEmail.trim());
      if (!fpEmailVal.valid) { setFpErrors({ contact: fpEmailVal.error }); return; }
    } else {
      if (!/^[6-9]\d{9}$/.test(fpMobile)) { setFpErrors({ contact:"Enter a valid 10-digit mobile number" }); return; }
    }
    setFpLoading(true); setFpStatus({type:"",message:""});
    try {
      const payload = fpChannel === "email"
        ? await forgotPasswordSendOtp({ email: fpEmail.trim(), channel:"Email" })
        : await forgotPasswordSendOtp({ phoneNumber: fpMobile, channel:"Mobile" });
      setFpStep(2); setFpOtp(""); setFpTimeLeft(300); bump();
      setFpStatus({ type:"success", message: readApiMessage(payload, `OTP sent to your ${fpChannel === "email" ? "email" : "mobile"}.`) });
    } catch (error) {
      setFpStatus({ type:"error", message: error?.message || "Failed to send OTP. Please try again." });
    } finally { setFpLoading(false); }
  };

  const fpVerifyOtp = async (e) => {
    e.preventDefault(); if (fpLoading) return;
    if (!/^\d{6}$/.test(fpOtp)) { setFpErrors({ otp:"Enter the 6-digit OTP" }); return; }
    setFpLoading(true); setFpStatus({type:"",message:""}); setFpErrors({});
    try {
      const verifyPayload = fpChannel === "email"
        ? { email: fpEmail.trim(), otp: fpOtp, channel:"Email" }
        : { phoneNumber: fpMobile, otp: fpOtp, channel:"Mobile" };
      const payload = await forgotPasswordVerifyOtp(verifyPayload);
      const token = payload?.token || payload?.Token || payload?.resetToken || payload?.ResetToken || "";
      setFpResetToken(token);
      setFpStep(3); setFpNewPassword(""); setFpConfirmPassword(""); bump();
      setFpStatus({ type:"success", message:"OTP verified. Set your new password below." });
    } catch (error) {
      setFpStatus({ type:"error", message: error?.message || "Invalid or expired OTP." });
    } finally { setFpLoading(false); }
  };

  const fpDoResetPassword = async (e) => {
    e.preventDefault(); if (fpLoading) return;
    const errs = {};
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[^\s]{8,64}$/;
    if (!pwdRegex.test(fpNewPassword)) {
      errs.newPassword = "Password does not meet all requirements.";
    }
    if (fpNewPassword !== fpConfirmPassword) errs.confirmPassword = "Passwords do not match";
    if (Object.keys(errs).length) { setFpErrors(errs); return; }
    setFpLoading(true); setFpStatus({type:"",message:""}); setFpErrors({});
    try {
      const resetPayload = fpChannel === "email"
        ? { email: fpEmail.trim(), newPassword: fpNewPassword, token: fpResetToken, otp: fpOtp }
        : { phoneNumber: fpMobile, newPassword: fpNewPassword, token: fpResetToken, otp: fpOtp };
      const payload = await resetPassword(resetPayload);
      setFpStatus({ type:"success", message: readApiMessage(payload, "Password reset successful! Redirecting to login…") });
      setTimeout(() => switchView("login"), 2200);
    } catch (error) {
      setFpStatus({ type:"error", message: error?.message || "Failed to reset password. Please try again." });
    } finally { setFpLoading(false); }
  };

  /* ── Dynamic title/subtitle ─────────────────────────────── */
  const getTitle = () => {
    if (viewMode === "login")         return "Welcome back";
    if (viewMode === "register")      return "Create account";
    if (viewMode === "register-otp")  return "Verify email";
    if (viewMode === "forgot-password") {
      if (fpStep === 1) return "Forgot password?";
      if (fpStep === 2) return "Enter OTP";
      return "Set new password";
    }
    return "";
  };
  const getSubtitle = () => {
    if (viewMode === "login") return authMethod === "email" ? "Enter your email and password to continue." : "Enter your mobile — new users can continue with OTP.";
    if (viewMode === "register") return "Register to enjoy a seamless booking experience.";
    if (viewMode === "register-otp") return `OTP sent to ${email}. Please check and enter below.`;
    if (viewMode === "forgot-password") {
      if (fpStep === 1) return "Enter your registered email or mobile to receive a reset OTP.";
      if (fpStep === 2) return `Enter the OTP sent to your ${fpChannel === "email" ? "email" : "mobile"}.`;
      return "Create a new secure password for your account.";
    }
    return "";
  };

  /* ══════════════════════ RENDER ══════════════════════════ */
  return (
    <div className="auth-page-shell">

      {/* ── Travel Image Background ── */}
      <div className="auth-bg" aria-hidden="true" style={{ backgroundImage: `url(${loginBg})` }}></div>

      {/* ── Centered Glass Card ── */}
      <div className="scenic-overlay"></div>
      <div className="scenic-layout">
        
        {/* =========================================
            LEFT PANEL: Value Proposition & Brand
        =========================================== */}
        <div className="scenic-left-pane">
          {/* Logo - single element */}
          <img src={brandLogo} alt="Pick N Book" className="scenic-logo" />

          {/* Typography */}
          <h1 className="scenic-headline">
            Your Journey,<br />
            <span className="scenic-text-black">All in </span>
            <span className="scenic-text-red">One Place.</span>
          </h1>
          <p className="scenic-subtitle">
            Flights, Hotels, Buses and more — Book with ease, travel with confidence.
          </p>

          <h3 className="scenic-section-title">Explore Our Services</h3>

          {/* 4 Service Cards */}
          <div className="scenic-services-grid">
            <div className="scenic-service-card" style={{ cursor: "pointer" }} onClick={() => navigate("/?tab=buses")}>
              <div className="scenic-icon-circle" style={{ backgroundColor: "#f97316", color: "#fff" }}>
                <Bus size={24} />
              </div>
              <h4 className="scenic-service-title">Buses</h4>
              <p className="scenic-service-desc">Find buses to your<br/>destinations</p>
            </div>

            <div className="scenic-service-card" style={{ cursor: "pointer" }} onClick={() => navigate("/?tab=flights")}>
              <div className="scenic-icon-circle" style={{ backgroundColor: "#ef4444", color: "#fff" }}>
                <Plane size={24} />
              </div>
              <h4 className="scenic-service-title">Flights</h4>
              <p className="scenic-service-desc">Book domestic &<br/>international flights</p>
            </div>

            <div className="scenic-service-card" style={{ cursor: "pointer" }} onClick={() => navigate("/?tab=hotels")}>
              <div className="scenic-icon-circle" style={{ backgroundColor: "#8b5cf6", color: "#fff" }}>
                <Building2 size={24} />
              </div>
              <h4 className="scenic-service-title">Hotels</h4>
              <p className="scenic-service-desc">Find comfortable stays at<br/>best prices</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="scenic-trust-row">
            <span className="scenic-trust-badge"><ShieldCheck size={14} color="#dc1e26" /> Best Prices Guaranteed</span>
            <span className="scenic-trust-badge"><ShieldCheck size={14} color="#dc1e26" /> Safe & Secure Payments</span>
            <span className="scenic-trust-badge"><Phone size={14} color="#dc1e26" /> 24/7 Customer Support</span>
            <span className="scenic-trust-badge"><ShieldCheck size={14} color="#dc1e26" /> Easy Booking Experience</span>
          </div>
        </div>

        {/* RIGHT PANEL: Auth Card Wrap */}
      <div className="auth-card-wrap">
        <div className="auth-card">


          {/* Step dots — forgot-password only */}
          {viewMode === "forgot-password" && <StepDots total={3} current={fpStep} />}

          {/* Title + subtitle */}
          <div className="auth-card-header">
            <h2 className="auth-card-title">{getTitle()}</h2>
            <p className="auth-card-subtitle">{getSubtitle()}</p>
          </div>

          {/* Animated content area */}
          <div className="auth-step-enter" key={stepKey}>

            {/* ══ LOGIN ══════════════════════════════════════ */}
            {viewMode === "login" && (
              <>
                <StatusBanner status={status} />
                {authMethod === "email" ? (
                  <form className="auth-page-form" onSubmit={loginWithEmail} noValidate>
                    {!adminChallengeId ? (
                      <>
                        <div className="auth-field-group">
                          <label className="auth-field-label" htmlFor="l-email">Email</label>
                          <div className="auth-field-input-wrap">
                            <Mail size={15} className="auth-field-icon" />
                            <input id="l-email" type="email" placeholder="Enter email address" value={email} onChange={handleEmailChange} autoComplete="email" className="auth-field-input" />
                          </div>
                          {errors.email && <span className="auth-field-error">{errors.email}</span>}
                        </div>
                        <div className="auth-field-group">
                          <label className="auth-field-label" htmlFor="l-pwd">Password</label>
                          <div className="auth-field-input-wrap">
                            <LockKeyhole size={15} className="auth-field-icon" />
                            <input id="l-pwd" type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={handlePasswordChange} autoComplete="current-password" className="auth-field-input" />
                            <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide" : "Show"}>
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {errors.password && <span className="auth-field-error">{errors.password}</span>}
                        </div>
                      </>
                    ) : (
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="admin-otp">Admin Verification OTP</label>
                        <div className="auth-field-input-wrap">
                          <ShieldCheck size={15} className="auth-field-icon" />
                          <input id="admin-otp" type="text" inputMode="numeric" placeholder="Enter OTP sent to your email" value={otp} onChange={handleOtpChange} autoComplete="one-time-code" className="auth-field-input auth-otp-input" />
                        </div>
                        {errors.otp && <span className="auth-field-error">{errors.otp}</span>}
                        <button type="button" className="auth-text-link" style={{marginTop:"4px"}} onClick={() => { setAdminChallengeId(""); setOtp(""); setStatus({type:"",message:""}); }}>
                          Cancel admin login
                        </button>
                      </div>
                    )}
                    <div className="auth-remember-row">
                      <label className="auth-keep-signed-row" htmlFor="keep-email">
                        <input type="checkbox" id="keep-email" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} className="auth-checkbox" />
                        <span className="auth-checkbox-custom" />
                        <span>Keep me signed in</span>
                      </label>
                      <button type="button" className="auth-text-link" onClick={() => switchView("forgot-password")}>
                        Forgot Password?
                      </button>
                    </div>
                    <button type="submit" className="auth-primary-btn" disabled={loading}>
                      {loading ? <><Spinner />Please wait…</> : adminChallengeId ? "Verify & Login" : "Login with Email"}
                    </button>
                  </form>
                ) : (
                  <form className="auth-page-form" onSubmit={otpSent ? verifyOtp : sendOtp} noValidate>
                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="l-mobile">Mobile Number</label>
                      <div className="auth-phone-joined">
                        <span className="auth-country-code">IN +91</span>
                        <div className="auth-phone-input-inner">
                          <Phone size={15} className="auth-field-icon" />
                          <input id="l-mobile" type="tel" placeholder="Enter 10-digit mobile" value={mobile} onChange={handleMobileChange} disabled={otpSent || loading} autoComplete="tel" className="auth-field-input" />
                        </div>
                      </div>
                      {errors.mobile && <span className="auth-field-error">{errors.mobile}</span>}
                    </div>
                    {otpSent && (
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="l-otp">OTP</label>
                        <div className="auth-field-input-wrap">
                          <ShieldCheck size={15} className="auth-field-icon" />
                          <input id="l-otp" type="text" inputMode="numeric" placeholder="Enter 6-digit OTP" value={otp} onChange={handleOtpChange} autoComplete="one-time-code" className="auth-field-input auth-otp-input" />
                        </div>
                        {errors.otp && <span className="auth-field-error">{errors.otp}</span>}
                        <div className="auth-otp-timer">
                          {timeLeft > 0 ? <span>Expires in <strong>{formatTime(timeLeft)}</strong></span> : <span>OTP expired. <button type="button" className="auth-text-link" onClick={() => sendOtp()} disabled={loading}>Resend OTP</button></span>}
                        </div>
                      </div>
                    )}
                    <label className="auth-keep-signed-row" htmlFor="keep-mobile">
                      <input type="checkbox" id="keep-mobile" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} className="auth-checkbox" />
                      <span className="auth-checkbox-custom" />
                      <span>Keep me signed in</span>
                    </label>
                    <button type="submit" className="auth-primary-btn" disabled={loading || (otpSent && timeLeft === 0)}>
                      {loading ? <><Spinner />Please wait…</> : otpSent ? "Verify & Continue" : "Continue"}
                    </button>
                    {otpSent && (
                      <button type="button" className="auth-text-link" style={{marginTop:"6px",textAlign:"center"}} onClick={() => { setOtpSent(false); setTimeLeft(0); }} disabled={loading}>
                        ← Change mobile number
                      </button>
                    )}
                  </form>
                )}

                <div className="auth-divider"><span>or continue with</span></div>
                <div className="auth-social-row">
                  {authMethod === "mobile"
                    ? <button type="button" className="auth-social-btn" onClick={() => switchAuthMethod("email")}><Mail size={16}/><span>Email</span></button>
                    : <button type="button" className="auth-social-btn" onClick={() => switchAuthMethod("mobile")}><Phone size={16}/><span>Mobile</span></button>
                  }
                  <button type="button" className="auth-social-btn auth-google-btn" onClick={() => handleSocialLogin("Google")}><FcGoogle size={18}/><span>Google</span></button>
                  <button type="button" className="auth-social-btn auth-facebook-btn" onClick={() => handleSocialLogin("Facebook")}><Facebook size={17}/><span>Facebook</span></button>
                </div>
                <div className="auth-divider auth-divider-thin"><span>New here?</span></div>
                <div className="auth-secondary-actions">
                  <button type="button" className="auth-secondary-btn" onClick={() => switchView("register")}><User size={14}/> Create an Account (Sign Up)</button>
                </div>
              </>
            )}

            {/* ══ REGISTER ═══════════════════════════════════ */}
            {viewMode === "register" && (
              <form className="auth-page-form" onSubmit={sendRegisterOtp} noValidate>
                <StatusBanner status={status} />
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="r-name">Full Name</label>
                  <div className="auth-field-input-wrap">
                    <User size={15} className="auth-field-icon" />
                    <input id="r-name" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrors({}); setStatus({type:"",message:""}); }} className="auth-field-input" />
                  </div>
                </div>
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="r-mobile">Mobile Number</label>
                  <div className="auth-phone-joined">
                    <span className="auth-country-code">IN +91</span>
                    <div className="auth-phone-input-inner">
                      <Phone size={15} className="auth-field-icon" />
                      <input id="r-mobile" type="tel" placeholder="Enter 10-digit mobile" value={mobile} onChange={handleMobileChange} className="auth-field-input" />
                    </div>
                  </div>
                  {errors.mobile && <span className="auth-field-error">{errors.mobile}</span>}
                </div>
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="r-email">Email Address</label>
                  <div className="auth-field-input-wrap">
                    <Mail size={15} className="auth-field-icon" />
                    <input id="r-email" type="email" placeholder="Enter your email address" value={email} onChange={handleEmailChange} className="auth-field-input" />
                  </div>
                  {errors.email && <span className="auth-field-error">{errors.email}</span>}
                </div>
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="r-pwd">Set Password</label>
                  <div className="auth-field-input-wrap">
                    <LockKeyhole size={15} className="auth-field-icon" />
                    <input id="r-pwd" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={password} onChange={handlePasswordChange} className="auth-field-input" />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  <PasswordRequirements password={password} />
                </div>
                <button type="submit" className="auth-primary-btn" disabled={loading}>
                  {loading ? <><Spinner />Please wait…</> : "Send OTP"}
                </button>
                <p className="auth-terms">By continuing you agree to our <a href="/online/terms">Terms &amp; Privacy Policy</a></p>
                <button
                  type="button"
                  className="auth-back-btn"
                  style={{ marginTop: "10px", width: "100%", justifyContent: "center" }}
                  onClick={() => switchView("login")}
                >
                  ← Back to Login
                </button>
              </form>
            )}

            {/* ══ REGISTER OTP ═══════════════════════════════ */}
            {viewMode === "register-otp" && (
              <form className="auth-page-form" onSubmit={handleRegister} noValidate>
                <StatusBanner status={status} />
                <div className="auth-otp-info">
                  <span className="auth-otp-info-icon"><ShieldCheck size={20}/></span>
                  <div><strong>OTP sent to your email</strong><p>{email}</p></div>
                </div>
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="ro-otp">Enter OTP</label>
                  <div className="auth-field-input-wrap">
                    <ShieldCheck size={15} className="auth-field-icon" />
                    <input id="ro-otp" type="text" inputMode="numeric" placeholder="Enter 6-digit OTP" value={otp} onChange={handleOtpChange} autoComplete="one-time-code" className="auth-field-input auth-otp-input" />
                  </div>
                  {errors.otp && <span className="auth-field-error">{errors.otp}</span>}
                  <div className="auth-otp-timer">
                    {timeLeft > 0 ? <span>Expires in <strong>{formatTime(timeLeft)}</strong></span> : <span>OTP expired. <button type="button" className="auth-text-link" onClick={sendRegisterOtp} disabled={loading}>Resend OTP</button></span>}
                  </div>
                </div>
                <button type="submit" className="auth-primary-btn" disabled={loading || timeLeft === 0}>
                  {loading ? <><Spinner />Please wait…</> : "Verify & Register"}
                </button>
                <button type="button" className="auth-back-btn" style={{marginTop:"6px"}} onClick={() => { setViewMode("register"); setOtpSent(false); }}>
                  ← Back to Edit Details
                </button>
              </form>
            )}

            {/* ══ FORGOT PASSWORD — 3-step ═══════════════════ */}
            {viewMode === "forgot-password" && (
              <>
                <StatusBanner status={fpStatus} />

                {/* Step 1: Contact */}
                {fpStep === 1 && (
                  <form className="auth-page-form" onSubmit={fpSendOtp} noValidate>
                    <div className="auth-channel-toggle">
                      <button type="button" className={`auth-channel-btn${fpChannel === "email" ? " auth-channel-btn--active" : ""}`} onClick={() => { setFpChannel("email"); setFpErrors({}); }}>
                        <Mail size={13}/> Email
                      </button>
                      <button type="button" className={`auth-channel-btn${fpChannel === "mobile" ? " auth-channel-btn--active" : ""}`} onClick={() => { setFpChannel("mobile"); setFpErrors({}); }}>
                        <Phone size={13}/> Mobile
                      </button>
                    </div>
                    {fpChannel === "email" ? (
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="fp-email">Email Address</label>
                        <div className="auth-field-input-wrap">
                          <Mail size={15} className="auth-field-icon" />
                          <input id="fp-email" type="email" placeholder="Enter your registered email" value={fpEmail} onChange={(e) => { setFpEmail(e.target.value.trimStart()); setFpErrors({}); setFpStatus({type:"",message:""}); }} autoComplete="email" className="auth-field-input" />
                        </div>
                        {fpErrors.contact && <span className="auth-field-error">{fpErrors.contact}</span>}
                      </div>
                    ) : (
                      <div className="auth-field-group">
                        <label className="auth-field-label" htmlFor="fp-mobile">Mobile Number</label>
                        <div className="auth-phone-joined">
                          <span className="auth-country-code">IN +91</span>
                          <div className="auth-phone-input-inner">
                            <Phone size={15} className="auth-field-icon" />
                            <input id="fp-mobile" type="tel" placeholder="Enter registered mobile" value={fpMobile} onChange={(e) => { setFpMobile(e.target.value.replace(/\D/g,"").slice(0,10)); setFpErrors({}); setFpStatus({type:"",message:""}); }} autoComplete="tel" className="auth-field-input" />
                          </div>
                        </div>
                        {fpErrors.contact && <span className="auth-field-error">{fpErrors.contact}</span>}
                      </div>
                    )}
                    <button type="submit" className="auth-primary-btn" disabled={fpLoading}>
                      {fpLoading ? <><Spinner />Sending OTP…</> : "Send Reset OTP"}
                    </button>
                    <button
                      type="button"
                      className="auth-back-btn"
                      style={{ marginTop: "14px", width: "100%", justifyContent: "center" }}
                      onClick={() => switchView("login")}
                    >
                      ← Back to Login
                    </button>
                  </form>
                )}

                {/* Step 2: Verify OTP */}
                {fpStep === 2 && (
                  <form className="auth-page-form" onSubmit={fpVerifyOtp} noValidate>
                    <div className="auth-otp-info">
                      <span className="auth-otp-info-icon"><ShieldCheck size={20}/></span>
                      <div>
                        <strong>OTP sent to your {fpChannel === "email" ? "email" : "mobile"}</strong>
                        <p>{fpChannel === "email" ? fpEmail : `+91 ${fpMobile}`}</p>
                      </div>
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="fp-otp">Enter OTP</label>
                      <div className="auth-field-input-wrap">
                        <ShieldCheck size={15} className="auth-field-icon" />
                        <input id="fp-otp" type="text" inputMode="numeric" placeholder="Enter 6-digit OTP" value={fpOtp} onChange={(e) => { setFpOtp(e.target.value.replace(/\D/g,"").slice(0,6)); setFpErrors({}); setFpStatus({type:"",message:""}); }} autoComplete="one-time-code" className="auth-field-input auth-otp-input" />
                      </div>
                      {fpErrors.otp && <span className="auth-field-error">{fpErrors.otp}</span>}
                      <div className="auth-otp-timer">
                        {fpTimeLeft > 0 ? <span>Expires in <strong>{formatTime(fpTimeLeft)}</strong></span> : <span>OTP expired. <button type="button" className="auth-text-link" onClick={fpSendOtp} disabled={fpLoading}>Resend OTP</button></span>}
                      </div>
                    </div>
                    <button type="submit" className="auth-primary-btn" disabled={fpLoading || fpTimeLeft === 0}>
                      {fpLoading ? <><Spinner />Verifying…</> : "Verify OTP"}
                    </button>
                    <button type="button" className="auth-back-btn" onClick={() => { setFpStep(1); setFpOtp(""); setFpStatus({type:"",message:""}); bump(); }}>
                      ← Change contact
                    </button>
                  </form>
                )}

                {/* Step 3: New password */}
                {fpStep === 3 && (
                  <form className="auth-page-form" onSubmit={fpDoResetPassword} noValidate>
                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="fp-newpwd">New Password</label>
                      <div className="auth-field-input-wrap">
                        <LockKeyhole size={15} className="auth-field-icon" />
                        <input id="fp-newpwd" type={fpShowNewPwd ? "text" : "password"} placeholder="Min 6 characters" value={fpNewPassword} onChange={(e) => { setFpNewPassword(e.target.value); setFpErrors({}); setFpStatus({type:"",message:""}); }} className="auth-field-input" />
                        <button type="button" className="auth-eye-btn" onClick={() => setFpShowNewPwd(!fpShowNewPwd)}>
                          {fpShowNewPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                        </button>
                      </div>
                      <PasswordRequirements password={fpNewPassword} />
                      {fpErrors.newPassword && <span className="auth-field-error">{fpErrors.newPassword}</span>}
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-field-label" htmlFor="fp-confirmpwd">Confirm Password</label>
                      <div className="auth-field-input-wrap">
                        <LockKeyhole size={15} className="auth-field-icon" />
                        <input id="fp-confirmpwd" type={fpShowConfirmPwd ? "text" : "password"} placeholder="Re-enter new password" value={fpConfirmPassword} onChange={(e) => { setFpConfirmPassword(e.target.value); setFpErrors({}); setFpStatus({type:"",message:""}); }} className="auth-field-input" />
                        <button type="button" className="auth-eye-btn" onClick={() => setFpShowConfirmPwd(!fpShowConfirmPwd)}>
                          {fpShowConfirmPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                        </button>
                      </div>
                      {fpErrors.confirmPassword && <span className="auth-field-error">{fpErrors.confirmPassword}</span>}
                    </div>
                    <button type="submit" className="auth-primary-btn" disabled={fpLoading}>
                      {fpLoading ? <><Spinner />Resetting…</> : "Reset Password"}
                    </button>
                    <button
                      type="button"
                      className="auth-back-btn"
                      style={{ marginTop: "14px", width: "100%", justifyContent: "center" }}
                      onClick={() => switchView("login")}
                    >
                      ← Back to Login
                    </button>
                  </form>
                )}
              </>
            )}

          </div>{/* /auth-step-enter */}

          {/* Bottom back button - login view only */}
          {viewMode === "login" && (
            <button type="button" className="auth-back-pill auth-back-bottom" onClick={goBack} aria-label="Go back">
              <ArrowLeft size={14} /><span>Back</span>
            </button>
          )}

        </div>{/* /auth-card */}
      </div>{/* /auth-card-wrap */}
      </div>{/* /scenic-layout */}

    </div>
  );
}
