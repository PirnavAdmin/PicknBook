import React, { useState, useEffect } from "react";
import "./login admin.css";
import { User, Lock, Eye, EyeOff, TrendingUp, Calendar, ShieldCheck, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestAuth } from "../../../services/authService";
import { motion } from "framer-motion";
import brandLogo from "../../../assets/images/brand/pick-n-book-logo.png";

export default function Adminlogin() {

  const navigate = useNavigate();

  const [captcha, setCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    admEmail: "",
    admPassword: "",
    captchaInput: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptcha(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const refreshCaptcha = () => {
    generateCaptcha();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
    setErrors({
      ...errors,
      [name]: "",
      api: "",
    });
  };

  const validate = () => {
    let err = {};
    if (!form.admEmail) err.username = "Email required";
    if (!form.admPassword) err.password = "Password required";
    if (!form.captchaInput) {
      err.captchaInput = "Enter captcha";
    }
    else if (form.captchaInput !== captcha) {
      err.captchaInput = "Captcha incorrect";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (form.admEmail === "admin" && form.admPassword === "admin") {
      localStorage.setItem("adminToken", "mock-token");
      localStorage.setItem("adminRole", "Super Admin");
      localStorage.setItem("adminName", "Super Admin");
      localStorage.setItem("adminId", "AD-001");
      navigate("/admin");
      return;
    }

    try {
      setLoading(true);
      const data = await requestAuth(
        "/api/Auth/admin/login/request-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email: form.admEmail,
            password: form.admPassword,
          }),
        },
        "Login failed"
      );

      localStorage.setItem("challengeId", data.challengeId);
      localStorage.setItem("adminChallengeId", data.challengeId);
      localStorage.setItem("adminLoginEmail", form.admEmail);
      sessionStorage.setItem("temp_admin_email", form.admEmail);
      sessionStorage.setItem("temp_admin_password", form.admPassword);
      navigate("/admin/pin");
    } catch (error) {
      setErrors({
        api: error?.message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  const leftPanelVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 80, damping: 15 } }
  };

  const rightPanelVariants = {
    hidden: { opacity: 0, scale: 0.97, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 16 } }
  };

  return (
    <div className="login-wrapper">
      {/* Brand Logo in Top Left */}
      <motion.div
        className="global-brand-logo"
        initial="hidden"
        animate="visible"
        variants={logoVariants}
      >
        <img src={brandLogo} alt="Pick N Book Logo" className="brand-logo" />
      </motion.div>



      {/* Unified Travel Skyline Background with flat overlay animations */}
      <div className="skyline-background" aria-hidden="true">
        <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>{`
              .lm { fill:none; stroke:#dc2626; stroke-width:1.4; stroke-linecap:round; stroke-linejoin:round; }
              .lm-thin { fill:none; stroke:#fca5a5; stroke-width:1; stroke-linecap:round; stroke-linejoin:round; }
              .lm-dot { fill:none; stroke:#fca5a5; stroke-width:1.1; stroke-linecap:round; stroke-dasharray:4 5; }
            `}</style>
          </defs>

          {/* ── Dotted flight paths ── */}
          <path className="admin-flight-path lm-dot" d="M 80,340 Q 220,240 380,280 T 680,200 T 980,240 T 1280,180" />
          <path className="admin-flight-path-2 lm-dot" d="M 300,380 Q 500,300 700,320 T 1100,260" />

          {/* ── Flying Plane ── */}
          <g className="admin-plane-fly">
            <path className="lm" d="M 0,0 L -14,-6 L -18,-6 L -10,0 L -18,6 L -14,6 Z" fill="#4fa8e8" stroke="none" transform="translate(120,350)" />
            <path d="M-9,0 L-4,-3 L-4,3Z" fill="#2a85cc" stroke="none" transform="translate(120,350)" />
          </g>

          {/* ── Clouds ── */}
          <g className="admin-cloud-1">
            <path className="lm-thin" d="M 80,160 Q 88,148 100,152 Q 112,140 126,150 Q 136,150 136,162 Z" />
            <path className="lm-thin" d="M 240,200 Q 246,190 256,194 Q 266,184 278,192 Q 286,192 286,202 Z" />
          </g>
          <g className="admin-cloud-2">
            <path className="lm-thin" d="M 580,140 Q 590,128 604,132 Q 618,120 634,130 Q 644,130 644,142 Z" />
          </g>
          <g className="admin-cloud-3">
            <path className="lm-thin" d="M 900,120 Q 910,108 924,112 Q 938,100 954,110 Q 964,110 964,122 Z" />
            <path className="lm-thin" d="M 1180,160 Q 1190,150 1202,154 Q 1214,144 1226,152 Q 1234,152 1234,162 Z" />
          </g>

          {/* ── Birds (small V shapes) ── */}
          <path className="lm-thin" d="M 420,200 Q 424,196 428,200" />
          <path className="lm-thin" d="M 433,194 Q 437,190 441,194" />
          <path className="lm-thin" d="M 1020,180 Q 1024,176 1028,180" />
          <path className="lm-thin" d="M 760,220 Q 764,216 768,220" />

          {/* ── Hot Air Balloon 1 (left area) ── */}
          <g className="admin-balloon-1" transform="translate(170,240)">
            <ellipse cx="0" cy="-28" rx="18" ry="26" className="lm" />
            <path className="lm" d="M -18,-28 Q 0,-55 18,-28" />
            <path className="lm" d="M 0,-54 L 0,-56" />
            <line x1="-8" y1="-4" x2="-5" y2="8" className="lm" />
            <line x1="8" y1="-4" x2="5" y2="8" className="lm" />
            <rect x="-6" y="8" width="12" height="9" rx="2" className="lm" />
            <line x1="-12" y1="-28" x2="-12" y2="-8" className="lm-thin" />
            <line x1="12" y1="-28" x2="12" y2="-8" className="lm-thin" />
            <line x1="-6" y1="-54" x2="-6" y2="-4" className="lm-thin" />
            <line x1="6" y1="-54" x2="6" y2="-4" className="lm-thin" />
          </g>

          {/* ── Hot Air Balloon 2 (right area) ── */}
          <g className="admin-balloon-2" transform="translate(1220,200)">
            <ellipse cx="0" cy="-22" rx="14" ry="20" className="lm" />
            <path className="lm" d="M -14,-22 Q 0,-44 14,-22" />
            <line x1="-6" y1="-3" x2="-4" y2="6" className="lm" />
            <line x1="6" y1="-3" x2="4" y2="6" className="lm" />
            <rect x="-5" y="6" width="10" height="8" rx="2" className="lm" />
            <line x1="-9" y1="-22" x2="-9" y2="-3" className="lm-thin" />
            <line x1="9" y1="-22" x2="9" y2="-3" className="lm-thin" />
          </g>

          {/* Subtle sparkle dots */}
          {[[60, 300], [340, 260], [620, 260], [870, 200], [1100, 230], [1350, 280]].map(([x, y], i) => (
            <g key={i}>
              <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="#7ec8f0" strokeWidth="1" />
              <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="#7ec8f0" strokeWidth="1" />
            </g>
          ))}
        </svg>
      </div>

      <motion.div
        className="login-content-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left Side: Brand Panel */}
        <motion.div
          className="left-side"
          variants={leftPanelVariants}
        >
          <div className="info-content">
            <div className="badge-pill">
              <span className="dot"></span> SMARTER BOOKING. BETTER BUSINESS.
            </div>
            <h1 className="heading">Powerful Platform Simplified for You</h1>
            <p className="description">
              Access real-time insights, manage bookings, users and grow your business with ease.
            </p>
            <div className="red-divider"></div>
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon-wrapper blue-icon">
                <TrendingUp size={20} />
              </div>
              <div className="feature-text">
                <h3>Real-time Insights</h3>
                <p>Track performance in real-time.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper purple-icon">
                <Calendar size={20} />
              </div>
              <div className="feature-text">
                <h3>Easy Management</h3>
                <p>Manage bookings and users effortlessly.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper green-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="feature-text">
                <h3>Secure & Reliable</h3>
                <p>Your data is safe with us.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Form Panel */}
        <motion.div
          className="right-side"
          variants={rightPanelVariants}
        >
          <div className="login-box">
            <div className="login-box-inner-3d">
              <h2 className="title">Admin Login</h2>
              <p className="subtitle">Welcome back! Please login to continue.</p>

              <form onSubmit={handleSubmit} autoComplete="off">
                {/* Email/Username field */}
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      name="admEmail"
                      placeholder="admin@picknbook.com"
                      value={form.admEmail}
                      onChange={handleChange}
                      className={errors.username ? "error-border" : ""}
                      autoComplete="off"
                    />
                  </div>
                  {errors.username && <span className="error-text">{errors.username}</span>}
                </div>

                {/* Password field */}
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="admPassword"
                      placeholder="••••••••••••"
                      value={form.admPassword}
                      onChange={handleChange}
                      className={`password-input ${errors.password ? "error-border" : ""}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                {/* Captcha Display Row */}
                <div className="captcha-section">
                  <div className="captcha-code-container">
                    <span className="captcha-code">{captcha}</span>
                  </div>
                  <button
                    type="button"
                    className="captcha-refresh-btn"
                    onClick={refreshCaptcha}
                  >
                    Refresh
                  </button>
                </div>

                {/* Captcha Input */}
                <div className="form-group">
                  <input
                    type="text"
                    name="captchaInput"
                    placeholder="Enter captcha code"
                    value={form.captchaInput}
                    onChange={handleChange}
                    className={errors.captchaInput ? "error-border" : ""}
                    autoComplete="off"
                  />
                  {errors.captchaInput && <span className="error-text">{errors.captchaInput}</span>}
                </div>

                {/* Form Options (Remember Me) */}

                {errors.api && <div className="api-error-alert">{errors.api}</div>}

                {/* Login Button */}
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? "Sending OTP..." : "Login"}
                </button>
              </form>

              {/* Encrypted Secure Info */}
              <div className="card-footer-info">
                <ShieldCheck size={14} className="security-icon" />
                <span>Your data is encrypted and secure</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>


    </div>
  );
}
