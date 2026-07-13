import React, { useState, useEffect } from "react";
import "./adminpin.css";
import brandLogo from "../../../assets/images/brand/pick-n-book-logo.png";
import travelSkylineBg from "../../../assets/images/illustrations/travel-skyline-bg-2.png";

import { useNavigate } from "react-router-dom";
import { requestAuth } from "../../../services/authService";

const generateCaptchaCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"; // Omit confusing characters like O, I, l
  const digits = "23456789"; // Omit confusing characters like 0, 1
  const all = letters + digits;

  let code = "";
  // Ensure at least one digit is selected
  code += digits[Math.floor(Math.random() * digits.length)];
  // Ensure at least one letter is selected
  code += letters[Math.floor(Math.random() * letters.length)];
  // Select the remaining 3 characters randomly
  for (let i = 0; i < 3; i++) {
    code += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the selected characters to ensure random positioning
  return code.split("").sort(() => Math.random() - 0.5).join("");
};

export default function AdminPin() {
  const navigate = useNavigate();
  const [captcha, setCaptcha] = useState(generateCaptchaCode);
  const [pin, setPin] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [resendStatus, setResendStatus] = useState("");

  const challengeId = localStorage.getItem("adminChallengeId") || localStorage.getItem("challengeId");

  useEffect(() => {
    if (timeLeft === 0) {
      alert("You can now resend the OTP message");
      return;
    }
    if (timeLeft < 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const formattedTime = `${minutes}:${seconds}`;

  const refreshCaptcha = () => {
    setCaptcha(generateCaptchaCode());
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError("");
      setResendStatus("");

      const email = sessionStorage.getItem("temp_admin_email");
      const password = sessionStorage.getItem("temp_admin_password");

      if (!email || !password) {
        setError("Session expired or invalid login. Please go back and try again.");
        return;
      }

      const data = await requestAuth(
        "/api/Auth/admin/login/request-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        },
        "Failed to resend OTP"
      );

      const newChallengeId = data?.challengeId || data?.ChallengeId || "";
      if (newChallengeId) {
        localStorage.setItem("challengeId", newChallengeId);
        localStorage.setItem("adminChallengeId", newChallengeId);
      }

      alert("OTP resent successfully to your email!");
      setResendStatus("OTP resent successfully to your email!");
      setTimeLeft(60);
    } catch (err) {
      setError(err?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!pin) {
      setError("Enter OTP");
      return;
    }

    if (captchaInput !== captcha) {
      setError("Captcha incorrect");
      return;
    }

    try {
      setLoading(true);

      const data = await requestAuth(
        "/api/Auth/admin/login/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({
            challengeId: challengeId,
            otp: pin,
          }),
        },
        "Invalid OTP"
      );

      const rawToken = data?.token || data?.Token || data?.tokenString || data?.data?.token || "";
      const rawRole = data?.role || data?.Role || data?.data?.role || "admin";
      const rawId = data?.adminId || data?.userId || data?.id || data?.AdminId || data?.UserId || data?.Id || data?.data?.adminId || data?.data?.userId || data?.data?.id || "";
      const rawName = data?.name || data?.fullName || data?.email || data?.data?.name || "Admin";
      const rawEmail = data?.email || data?.data?.email || localStorage.getItem("adminLoginEmail") || "";

      const sanitize = (val) => {
        const text = String(val ?? "").trim();
        return (text === "undefined" || text === "null") ? "" : text;
      };

      localStorage.setItem("adminToken", sanitize(rawToken));
      localStorage.setItem("adminRole", sanitize(rawRole) || "admin");
      localStorage.setItem("adminId", sanitize(rawId));
      localStorage.setItem("adminName", sanitize(rawName) || "Admin");
      localStorage.setItem("adminEmail", sanitize(rawEmail));
      localStorage.removeItem("adminChallengeId");
      localStorage.removeItem("challengeId");
      sessionStorage.removeItem("temp_admin_email");
      sessionStorage.removeItem("temp_admin_password");

      navigate("/admin");
    } catch (err) {
      setError(err?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pin-wrapper">
      {/* Unified Next-Level Travel Skyline Background */}
      <div className="skyline-background" aria-hidden="true">
        <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>{`
              .lm { fill:none; stroke:#dc2626; stroke-width:1.4; stroke-linecap:round; stroke-linejoin:round; }
              .lm-thin { fill:none; stroke:#fca5a5; stroke-width:1; stroke-linecap:round; stroke-linejoin:round; }
              .lm-dot { fill:none; stroke:#fca5a5; stroke-width:1.1; stroke-linecap:round; stroke-dasharray:4 5; }
            `}</style>
          </defs>

          {/* ── Background Image Layer (Landmarks Sketch) ── */}
          <image href={travelSkylineBg} x="0" y="0" width="1440" height="520" preserveAspectRatio="xMidYMax slice" />

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

      <div className="pin-box">
        <div className="logo-container-card">
          <img src={brandLogo} alt="Pick N Book Logo" className="logo-img-hd" />
        </div>
        <h2 className="pin-title">Verify OTP</h2>
        <div className="info">Please enter the PIN sent to your email</div>
        <form onSubmit={handleVerify}>
          <div className="otp-input-wrapper">
            <input
              placeholder="Enter OTP"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              style={{ paddingRight: timeLeft > 0 ? "75px" : "80px" }}
            />
            <div className="otp-input-action">
              {timeLeft > 0 ? (
                <button type="button" className="otp-input-timer-btn" disabled>
                  {formattedTime}
                </button>
              ) : (
                <button
                  type="button"
                  className="otp-input-resend-btn"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Resending..." : "Resend"}
                </button>
              )}
            </div>
          </div>

          <div className="captcha-row">
            <div className="captcha-code">{captcha}</div>
            <button
              type="button"
              className="refresh-btn"
              onClick={refreshCaptcha}
            >
              Refresh
            </button>
          </div>

          <input
            placeholder="Enter Captcha"
            value={captchaInput}
            onChange={(e) => {
              setCaptchaInput(e.target.value);
              setError("");
            }}
          />


          {resendStatus && <div className="resend-success-msg">{resendStatus}</div>}

          {error && <div className="error">{error}</div>}

          <button className="verify-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
