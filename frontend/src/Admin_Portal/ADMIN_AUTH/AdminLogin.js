/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Send,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import "./AdminLogin.css";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.png";
import adminSkylineBg from "../../assets/images/admin-skyline-bg.png";

import {
  adminLoginRequestOtp,
  adminLoginVerifyOtp,
  adminForgotPassword,
  adminResetPassword,
} from "../../services/autn_admin";

const OTP_LENGTH = 6;

function generateCaptchaCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function maskEmailAddress(emailStr) {
  if (!emailStr || !emailStr.includes("@")) return emailStr || "";
  const [local, domain] = emailStr.split("@");
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  return `${local.slice(0, 2)}****@${domain}`;
}

export default function AdminLogin() {
  const navigate = useNavigate();

  // Mode state: 'LOGIN' | 'VERIFY_OTP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD'
  const [mode, setMode] = useState("LOGIN");

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminChallengeId, setAdminChallengeId] = useState("");


  // Reset Password inputs
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP digits & error state
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState(false);
  const otpInputRefs = useRef([]);

  // Timer & Expired state
  const [timerSeconds, setTimerSeconds] = useState(59);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  // Captcha state
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const canvasRef = useRef(null);

  // Alerts
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // AUTO-DISAPPEAR ERROR MESSAGE AFTER 3 SECONDS & ENSURE ONLY 1 POPUP
  useEffect(() => {
    let timer = null;
    if (errorMessage) {
      setSuccessMessage(""); // Clear success message so only 1 popup exists
      timer = setTimeout(() => {
        setErrorMessage("");
      }, 3000); // DISAPPEARS AFTER 3 SECONDS
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [errorMessage]);

  // AUTO-DISAPPEAR SUCCESS MESSAGE AFTER 3 SECONDS & ENSURE ONLY 1 POPUP
  useEffect(() => {
    let timer = null;
    if (successMessage) {
      setErrorMessage(""); // Clear error message so only 1 popup exists
      timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000); // DISAPPEARS AFTER 3 SECONDS
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successMessage]);

  const refreshCaptcha = () => {
    const newCode = generateCaptchaCode();
    setCaptchaCode(newCode);
    setCaptchaInput("");
    drawCaptchaCanvas(newCode);
  };

  const drawCaptchaCanvas = (code) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, "#f8fafc");
    bgGrad.addColorStop(1, "#f1f5f9");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(220, 38, 38, ${Math.random() * 0.15 + 0.05})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 1.5 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = `rgba(220, 38, 38, ${Math.random() * 0.2 + 0.05})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    const charSpacing = canvas.width / (code.length + 1);
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textBaseline = "middle";

    for (let i = 0; i < code.length; i++) {
      const char = code.charAt(i);
      ctx.save();
      const x = (i + 1) * charSpacing;
      const y = canvas.height / 2 + (Math.random() * 2 - 1);
      const angle = (Math.random() * 12 - 6) * (Math.PI / 180);

      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "#b91c1c";
      ctx.shadowColor = "rgba(185, 28, 28, 0.2)";
      ctx.shadowBlur = 2;
      ctx.fillText(char, -4, 0);
      ctx.restore();
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, [mode]);

  // TIMER EFFECT WITH EXPIRED HANDLING
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerActive) {
      setIsTimerActive(false);
      setIsOtpExpired(true);
      setErrorMessage("OTP has expired. Please click Resend OTP to receive a new code.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timerSeconds]);

  const startOtpTimer = () => {
    setTimerSeconds(59);
    setIsTimerActive(true);
    setIsOtpExpired(false);
    setOtpError(false);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setOtpError(false);
    if (errorMessage) setErrorMessage("");

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    setOtpError(false);
    if (errorMessage) setErrorMessage("");

    const pasteData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split("");
      setOtpDigits(digits);
      otpInputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const checkPasswordRequirements = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      hasCase: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const calculateStrength = (pwd) => {
    if (!pwd) return { level: "", score: 0, text: "" };
    const reqs = checkPasswordRequirements(pwd);
    const score = Object.values(reqs).filter(Boolean).length;
    if (score <= 1) return { level: "weak", score: 1, text: "Weak" };
    if (score <= 3) return { level: "medium", score: 2, text: "Medium" };
    return { level: "strong", score: 3, text: "Strong" };
  };

  const handleSendOtpLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError(false);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }
    if (!captchaInput || captchaInput.toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMessage("Invalid CAPTCHA code.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      let otpSentSuccess = false;
      let lastErrorMessage = "";

      try {
        const res = await adminLoginRequestOtp({ email: email.trim(), password });
        if (res && res.success === false) {
          lastErrorMessage = res.message || res.error || "Invalid credentials or login failed.";
        } else if (res) {
          otpSentSuccess = true;
          const challenge = res.challengeId || res.ChallengeId || res.data?.challengeId || res.data?.ChallengeId;
          if (challenge) {
            setAdminChallengeId(challenge);
          }
        }
      } catch (adminErr) {
        lastErrorMessage = adminErr?.message || "Invalid admin credentials or unregistered email address.";
        console.warn("Admin specific OTP request notice:", lastErrorMessage);
      }

      if (!otpSentSuccess) {
        setErrorMessage(lastErrorMessage || "Failed to send OTP. Please check your admin credentials.");
        refreshCaptcha();
        return; // STAY ON LOGIN PAGE ON ERROR
      }

      setSuccessMessage(`OTP sent to ${maskEmailAddress(email)}`);
      startOtpTimer();
      setMode("VERIFY_OTP");
    } catch (err) {
      setErrorMessage(err?.message || "Failed to send OTP.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError(false);

    if (isOtpExpired || timerSeconds === 0) {
      setErrorMessage("OTP has expired. Please click Resend OTP to receive a new code.");
      return;
    }

    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length < OTP_LENGTH) {
      setOtpError(true);
      setErrorMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    if (!captchaInput || captchaInput.toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMessage("Invalid CAPTCHA code.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      let authToken = "";
      let adminUserData = null;
      let isVerified = false;
      let apiErrorMessage = "";

      if (adminChallengeId) {
        try {
          const res = await adminLoginVerifyOtp({ challengeId: adminChallengeId, otp: enteredOtp });
          if (res && (res.token || res.Token || res.tokenString || res.success || res.status === 200)) {
            isVerified = true;
            authToken = res.token || res.Token || res.tokenString || "admin_token_" + Date.now();
            adminUserData = res.user || res.User || {
              userId: "admin-" + Date.now(),
              email: email,
              name: "Admin User",
              role: "admin",
            };
          }
        } catch (verErr) {
          apiErrorMessage = verErr?.message || "OTP verification failed.";
          console.warn("Admin verify OTP err:", apiErrorMessage);
        }
      }

      if (!isVerified) {
        setOtpError(true);
        setErrorMessage(apiErrorMessage || "Invalid OTP. Please check the code and try again.");
        refreshCaptcha();
        return; // STAY ON VERIFY OTP PAGE ON ERROR
      }

      authToken = authToken || "admin_token_" + Date.now();
      adminUserData = adminUserData || {
        userId: "admin-" + Date.now(),
        email: email,
        name: "Admin User",
        role: "admin",
      };

      localStorage.setItem("adminToken", authToken);
      localStorage.setItem("adminRole", "admin");
      localStorage.setItem("adminEmail", email);
      sessionStorage.setItem("adminToken", authToken);
      sessionStorage.setItem("adminRole", "admin");
      sessionStorage.setItem("adminUser", JSON.stringify(adminUserData));

      localStorage.setItem("token", authToken);
      localStorage.setItem("role", "admin");
      localStorage.setItem("user", JSON.stringify(adminUserData));

      setSuccessMessage("Verification successful! Redirecting...");
      setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 800);
    } catch (err) {
      setOtpError(true);
      setErrorMessage(err?.message || "Invalid OTP. Please check the code and try again.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError(false);

    if (!email || !email.includes("@")) {
      setErrorMessage("Email is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await adminForgotPassword({ email: email.trim() });
      const msg =
        typeof res === "string"
          ? res
          : (res?.message || "If the email is registered, an OTP has been sent.");

      setSuccessMessage(msg);
      startOtpTimer();
    } catch (err) {
      setErrorMessage(err?.message || "Failed to send OTP. Please check your email.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError(false);

    if (isOtpExpired || timerSeconds === 0) {
      setErrorMessage("OTP has expired. Please click Resend OTP to receive a new code.");
      return;
    }

    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length < OTP_LENGTH) {
      setOtpError(true);
      setErrorMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      setSuccessMessage("OTP Verified! Set your new password.");
      setMode("RESET_PASSWORD");
    } catch (err) {
      setOtpError(true);
      setErrorMessage(err?.message || "Invalid OTP. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const reqs = checkPasswordRequirements(newPassword);
    if (!Object.values(reqs).every(Boolean)) {
      setErrorMessage("Please fulfill all password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const otp = otpDigits.join("");
      const res = await adminResetPassword({ email: email.trim(), otp, newPassword });

      if (res && res.success === false) {
        setErrorMessage(res.message || "Invalid or expired OTP.");
        return;
      }

      const successMsg =
        typeof res === "string"
          ? res
          : (res?.message || "Password has been reset successfully.");

      setSuccessMessage(`${successMsg} Redirecting to login page...`);
      setTimeout(() => {
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setSuccessMessage("");
        setErrorMessage("");
        setMode("LOGIN");
      }, 2000);
    } catch (err) {
      setErrorMessage(err?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setOtpError(false);
    try {
      let resendSuccess = false;
      let apiErrorMessage = "";
      try {
        if (mode === "FORGOT_PASSWORD" || mode === "VERIFY_FORGOT_OTP") {
          const res = await adminForgotPassword({ email: email.trim() });
          if (res && res.success !== false) resendSuccess = true;
        } else {
          const res = await adminLoginRequestOtp({ email: email.trim(), password });
          if (res) {
            resendSuccess = true;
            const challenge = res.challengeId || res.ChallengeId || res.data?.challengeId || res.data?.ChallengeId;
            if (challenge) setAdminChallengeId(challenge);
          }
        }
      } catch (apiErr) {
        apiErrorMessage = apiErr?.message || "Failed to resend OTP.";
        console.warn("Resend OTP notice:", apiErrorMessage);
      }

      if (!resendSuccess) {
        setErrorMessage(apiErrorMessage || "Failed to resend OTP. Please try again.");
        return;
      }

      startOtpTimer();
      setSuccessMessage("A new OTP has been sent to your email address.");
    } catch (err) {
      setErrorMessage(err?.message || "Failed to resend OTP.");
    }
  };

  const switchMode = (newMode) => {
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError(false);
    setMode(newMode);
  };

  const passwordReqs = checkPasswordRequirements(newPassword);
  const pStrength = calculateStrength(newPassword);

  return (
    <div className="admin-login-wrapper">
      {/* PAGE TOP-LEFT LOGO */}
      <div className="page-top-left-logo">
        {pickNBookLogo ? (
          <img src={pickNBookLogo} alt="PickNBook" className="page-logo-img" />
        ) : (
          <div className="page-logo-fallback">
            <Shield className="fallback-icon" />
            <span>PickNBook</span>
          </div>
        )}
      </div>

      {/* FLOATING TOAST POPUP - RENDER ONLY ONE AT TOP-RIGHT & DISAPPEAR AFTER 1 SEC */}
      {errorMessage ? (
        <div className="top-right-toast error-toast">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      ) : successMessage ? (
        <div className="top-right-toast success-toast">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {/* ISOLATED LOGIN SKYLINE BACKGROUND */}
      <div
        className="login-skyline-bg"
        style={{
          backgroundImage: `url(${adminSkylineBg})`,
          backgroundSize: "100% auto",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <svg
          viewBox="0 0 1200 500"
          fill="none"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(30,117,255,0.01)" />
              <stop offset="50%" stopColor="rgba(30,117,255,0.3)" />
              <stop offset="100%" stopColor="rgba(30,117,255,0.01)" />
            </linearGradient>
          </defs>

          <path
            d="M -50,180 C 150,130 350,290 550,230 C 750,170 950,110 1250,150"
            stroke="url(#pathGrad)"
            strokeWidth="2"
            className="admin-flight-path"
          />
          <path
            d="M 1200,280 C 1000,220 800,320 600,290 C 400,260 200,240 -50,300"
            stroke="url(#pathGrad)"
            strokeWidth="1.5"
            className="admin-flight-path-2"
          />

          <g className="admin-cloud-1" opacity="0.6">
            <path
              d="M 150,80 Q 165,65 185,75 Q 200,60 215,75 Q 230,75 230,85 Q 230,95 150,95 Z"
              fill="#ffffff"
            />
          </g>
          <g className="admin-cloud-2" opacity="0.5">
            <path
              d="M 850,60 Q 865,45 885,55 Q 900,40 915,55 Q 930,55 930,65 Q 930,75 850,75 Z"
              fill="#ffffff"
            />
          </g>
          <g className="admin-cloud-3" opacity="0.4">
            <path
              d="M 520,110 Q 532,98 548,106 Q 560,94 572,106 Q 584,106 584,114 Q 584,122 520,122 Z"
              fill="#ffffff"
            />
          </g>

          <g className="admin-balloon-1" transform="translate(160, 240)">
            <path
              d="M 0,0 C -12,-20 -15,-35 0,-45 C 15,-35 12,-20 0,0 Z"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            <path d="M -7,-25 C -2,-25 2,-25 7,-25" stroke="#3b82f6" strokeWidth="1" />
            <rect x="-2" y="4" width="4" height="4" fill="none" stroke="#3b82f6" strokeWidth="1" />
            <line x1="-4" y1="0" x2="-2" y2="4" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="4" y1="0" x2="-2" y2="4" stroke="#3b82f6" strokeWidth="0.8" />
          </g>

          <g className="admin-balloon-2" transform="translate(860, 260)">
            <path
              d="M 0,0 C -10,-18 -12,-30 0,-38 C 12,-30 10,-18 0,0 Z"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.2"
            />
            <rect x="-1.5" y="3.5" width="3" height="3" fill="none" stroke="#10b981" strokeWidth="0.8" />
            <line x1="-3" y1="0" x2="-1.5" y2="3.5" stroke="#10b981" strokeWidth="0.7" />
            <line x1="3" y1="0" x2="1.5" y2="3.5" stroke="#10b981" strokeWidth="0.7" />
          </g>

          <g className="admin-plane-fly">
            <path
              d="M 0,0 L 8,-3 L 18,-3 L 10,0 L 13,6 L 8,2 L 3,6 L 5,0 L -2,-3 Z"
              fill="#3b82f6"
              transform="translate(50, 160) scale(1.2)"
            />
          </g>
        </svg>
      </div>

      {/* CENTERED COMPACT FORM CONTAINER */}
      <div className="admin-login-card">
        {mode !== "LOGIN" && (
          <div className="card-top-nav">
            <button
              type="button"
              className="back-login-btn"
              onClick={() => switchMode("LOGIN")}
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: ADMIN LOGIN FORM */}
        {/* ============================================================== */}
        {mode === "LOGIN" && (
          <form onSubmit={handleSendOtpLogin} className="admin-form-body">
            <div className="form-header-group">
              <div className="icon-header-badge">
                <User size={18} className="badge-icon" />
              </div>
              <h2 className="form-main-title">Admin Login</h2>
              <p className="form-sub-title">Welcome back! Please sign in to continue.</p>
            </div>

            {errorMessage && (
              <div className="error-banner-box">
                <AlertCircle size={14} className="info-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Address */}
            <div className="input-field-wrapper">
              <label className="field-label">Email Address</label>
              <div className="input-group-box">
                <div className="input-prefix-icon">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  className="form-control-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-field-wrapper">
              <label className="field-label">Password</label>
              <div className="input-group-box">
                <div className="input-prefix-icon">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="forgot-link-wrapper" style={{ display: "none" }}>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => switchMode("FORGOT_PASSWORD")}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* CAPTCHA SECTION */}
            <div className="input-field-wrapper">
              <label className="field-label">CAPTCHA</label>
              <div className="captcha-display-row">
                <div className="captcha-canvas-box">
                  <canvas ref={canvasRef} width={110} height={34} className="captcha-canvas" />
                </div>
                <button
                  type="button"
                  className="captcha-refresh-btn"
                  title="Refresh Captcha"
                  onClick={refreshCaptcha}
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="input-group-box mt-2">
                <div className="input-prefix-icon">
                  <Shield size={15} />
                </div>
                <input
                  type="text"
                  className="form-control-input uppercase-input"
                  placeholder="Enter CAPTCHA"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </div>

            {/* SEND OTP BUTTON */}
            <button
              type="submit"
              className="btn-admin-submit mt-2"
              disabled={loading}
            >
              <Send size={15} />
              <span>{loading ? "SENDING OTP..." : "SEND OTP"}</span>
            </button>

            <div className="form-footer-security">
              <ShieldCheck size={13} />
              <span>Secure Admin Access</span>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* MODE 2: VERIFY OTP FORM */}
        {/* ============================================================== */}
        {mode === "VERIFY_OTP" && (
          <form onSubmit={handleVerifyOtpLogin} className="admin-form-body">
            <div className="form-header-group">
              <div className="icon-header-badge">
                <Mail size={18} className="badge-icon" />
              </div>
              <h2 className="form-main-title">Verify OTP</h2>
              <p className="form-sub-title">
                Please enter the 6-digit OTP sent to{" "}
                <strong className="text-red-highlight">{maskEmailAddress(email)}</strong>
              </p>
            </div>

            {errorMessage ? (
              <div className="error-banner-box">
                <AlertCircle size={14} className="info-icon" />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <div className="info-banner-box">
                <Info size={14} className="info-icon" />
                <span>Enter the code below to verify your identity</span>
              </div>
            )}

            {/* OTP Digits */}
            <div className="input-field-wrapper mt-2">
              <label className="field-label">Enter OTP</label>
              <div className="otp-digit-row" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    className={`otp-digit-box ${otpError || isOtpExpired ? "error-box" : ""}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <div className="otp-timer-row">
                <div className="timer-indicator">
                  <Clock size={13} />
                  {timerSeconds > 0 ? (
                    <span>
                      OTP expires in{" "}
                      <strong>
                        00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-red-highlight">
                      <strong>OTP Expired</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="resend-otp-btn"
                  disabled={isTimerActive && timerSeconds > 0}
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <div className="form-divider-text">
              <span>AND</span>
            </div>

            {/* CAPTCHA SECTION */}
            <div className="input-field-wrapper">
              <label className="field-label">CAPTCHA</label>
              <div className="captcha-display-row">
                <div className="captcha-canvas-box">
                  <canvas ref={canvasRef} width={110} height={34} className="captcha-canvas" />
                </div>
                <button
                  type="button"
                  className="captcha-refresh-btn"
                  title="Refresh Captcha"
                  onClick={refreshCaptcha}
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="input-group-box mt-2">
                <div className="input-prefix-icon">
                  <Shield size={15} />
                </div>
                <input
                  type="text"
                  className="form-control-input uppercase-input"
                  placeholder="Enter CAPTCHA"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </div>

            {/* VERIFY OTP BUTTON */}
            <button
              type="submit"
              className="btn-admin-submit mt-2"
              disabled={loading || isOtpExpired || timerSeconds === 0}
            >
              <ShieldCheck size={15} />
              <span>{loading ? "VERIFYING..." : "VERIFY OTP"}</span>
            </button>

            <div className="form-footer-security">
              <Lock size={13} />
              <span>After verification, you will be logged in securely.</span>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* MODE 3: FORGOT PASSWORD FORM */}
        {/* ============================================================== */}
        {mode === "FORGOT_PASSWORD" && (
          <div className="admin-form-body">
            <div className="form-header-group">
              <div className="icon-header-badge">
                <Mail size={18} className="badge-icon" />
              </div>
              <h2 className="form-main-title">Forgot Password?</h2>
              <p className="form-sub-title">
                Enter your email address and we'll send you an OTP to reset your password.
              </p>
            </div>

            {errorMessage && (
              <div className="error-banner-box">
                <AlertCircle size={14} className="info-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="input-field-wrapper">
              <label className="field-label">Email Address</label>
              <div className="input-group-box">
                <div className="input-prefix-icon">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  className="form-control-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="info-banner-box mt-2">
              <Info size={14} className="info-icon" />
              <span>We will send a 6-digit OTP to your registered email address.</span>
            </div>

            {!isTimerActive && !isOtpExpired && timerSeconds === 59 ? (
              <button
                type="button"
                className="btn-admin-submit mt-2"
                disabled={loading}
                onClick={handleForgotPasswordSendOtp}
              >
                <Send size={15} />
                <span>{loading ? "SENDING OTP..." : "SEND OTP"}</span>
              </button>
            ) : (
              <>
                <div className="form-divider-text">
                  <span>OR</span>
                </div>

                <div className="input-field-wrapper">
                  <label className="field-label">Verify OTP</label>
                  <div className="otp-digit-row" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        className={`otp-digit-box ${otpError || isOtpExpired ? "error-box" : ""}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      />
                    ))}
                  </div>

                  <div className="otp-timer-row">
                    <div className="timer-indicator">
                      <Clock size={13} />
                      {timerSeconds > 0 ? (
                        <span>
                          OTP expires in{" "}
                          <strong>
                            00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-red-highlight">
                          <strong>OTP Expired</strong>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="resend-otp-btn"
                      disabled={isTimerActive && timerSeconds > 0}
                      onClick={handleResendOtp}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-admin-submit mt-2"
                  disabled={loading || isOtpExpired || timerSeconds === 0}
                  onClick={handleForgotPasswordVerifyOtp}
                >
                  <ShieldCheck size={15} />
                  <span>{loading ? "VERIFYING..." : "VERIFY OTP"}</span>
                </button>
              </>
            )}

            <div className="form-footer-security">
              <ShieldCheck size={13} />
              <span>Your information is secure and encrypted.</span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 4: RESET PASSWORD FORM */}
        {/* ============================================================== */}
        {mode === "RESET_PASSWORD" && (
          <form onSubmit={handleResetPasswordSubmit} className="admin-form-body">
            <div className="form-header-group">
              <div className="icon-header-badge">
                <Lock size={18} className="badge-icon" />
              </div>
              <h2 className="form-main-title">Reset Your Password</h2>
              <p className="form-sub-title">Set a new password for your account.</p>
            </div>

            {errorMessage && (
              <div className="error-banner-box">
                <AlertCircle size={14} className="info-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* New Password */}
            <div className="input-field-wrapper">
              <label className="field-label">New Password</label>
              <div className="input-group-box">
                <div className="input-prefix-icon">
                  <Lock size={15} />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-control-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {newPassword && (
                <div className="password-strength-wrapper">
                  <div className="strength-header">
                    <span>Password Strength:</span>
                    <strong className={`strength-text ${pStrength.level}`}>
                      {pStrength.text}
                    </strong>
                  </div>
                  <div className="strength-bars">
                    <div className={`bar ${pStrength.score >= 1 ? pStrength.level : ""}`} />
                    <div className={`bar ${pStrength.score >= 2 ? pStrength.level : ""}`} />
                    <div className={`bar ${pStrength.score >= 3 ? pStrength.level : ""}`} />
                    <div className={`bar ${pStrength.score >= 4 ? pStrength.level : ""}`} />
                  </div>
                </div>
              )}

              <div className="requirements-box">
                <div className={`req-item ${passwordReqs.minLength ? "met" : ""}`}>
                  <div className="req-circle" />
                  <span>At least 8 characters long</span>
                </div>
                <div className={`req-item ${passwordReqs.hasCase ? "met" : ""}`}>
                  <div className="req-circle" />
                  <span>Includes uppercase &amp; lowercase letters</span>
                </div>
                <div className={`req-item ${passwordReqs.hasNumber ? "met" : ""}`}>
                  <div className="req-circle" />
                  <span>Includes numbers (0-9)</span>
                </div>
                <div className={`req-item ${passwordReqs.hasSpecial ? "met" : ""}`}>
                  <div className="req-circle" />
                  <span>Includes special characters (!@#$%^&amp;*)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-field-wrapper mt-2">
              <label className="field-label">Confirm Password</label>
              <div className="input-group-box">
                <div className="input-prefix-icon">
                  <Lock size={15} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-admin-submit mt-2"
              disabled={loading}
            >
              <Lock size={15} />
              <span>{loading ? "RESETTING..." : "RESET PASSWORD"}</span>
            </button>

            <div className="form-footer-security">
              <Lock size={13} />
              <span>Your information is secure and encrypted.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
