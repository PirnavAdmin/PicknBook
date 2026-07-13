import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, LockKeyhole, Eye, EyeOff, LogIn, ShieldCheck, CheckCircle2 } from "lucide-react";
import "../../../STYLES/B2BAuth.css";
import brandLogo from "../../../assets/images/brand/pick-n-book-logo.png";
import { requestAuth, readApiMessage } from "../../../services/authService";

export default function B2BLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!validateForm()) return;

    setLoading(true);
    setStatus({ type: "", message: "" });

    const payload = {
      email: email.trim(),
      password: password,
    };

    try {
      // Direct API Request
      const response = await requestAuth(
        "/api/Auth/login",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        "B2B Login failed."
      );

      // Successfully authenticated
      const resolvedRole = response?.user?.role || response?.role || "Agent";
      if (resolvedRole.toLowerCase() !== "agent") {
        throw new Error("Access denied. Only travel agents are allowed to access the B2B portal.");
      }

      const src = response?.user || response || {};
      const user = {
        userId: src.userId || src.id || `b2b-${email}`,
        // Agency/Business name — distinct from contact person name
        agencyName: src.agencyName || src.companyName || src.businessName || "",
        // The logged-in person's name
        name: src.name || src.fullName || email.split("@")[0],
        // contactName is the business contact person (may differ from login name)
        contactName: src.contactName || src.contactPersonName || src.name || src.fullName || "",
        email: email.trim(),
        phone: src.phoneNumber || src.phone || src.mobile || "",
        city: src.city || src.region || src.address || "",
        membershipTier: src.membershipTier || src.tier || src.plan || "",
        role: resolvedRole,
        authType: "b2b-email",
      };

      localStorage.setItem("b2b_user", JSON.stringify(user));
      localStorage.setItem("b2b_userId", user.userId);
      localStorage.setItem("b2b_role", user.role);
      if (response?.token || src?.token) {
        localStorage.setItem("b2b_token", response.token || src.token);
      }

      setStatus({ type: "success", message: "Login successful. Redirecting..." });
      setTimeout(() => {
        navigate("/b2b/dashboard");
      }, 1500);

    } catch (error) {
      const message = error?.message || "Invalid credentials.";

      // Demo/Local Fallback
      if (message.includes("Failed to fetch") || message.includes("Temporary database issue") || message.includes("404")) {
        // Fallback for visual demo continuity
        const mockAgentUser = {
          userId: `mock-agent-${Date.now()}`,
          name: "Star Travels Co.",
          email: email.trim(),
          role: "Agent",
          authType: "b2b-mock",
        };

        localStorage.setItem("b2b_user", JSON.stringify(mockAgentUser));
        localStorage.setItem("b2b_userId", mockAgentUser.userId);
        localStorage.setItem("b2b_role", "Agent");
        localStorage.setItem("b2b_token", "mock-agent-session-token");

        setStatus({
          type: "success",
          message: "Demo Mode: Signed in successfully as Travel Agent.",
        });

        setTimeout(() => {
          navigate("/b2b/dashboard");
        }, 1500);
      } else {
        setStatus({ type: "error", message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="b2b-auth-container">
      {/* Left panel */}
      <div className="b2b-auth-hero">
        <div className="b2b-auth-hero-header">
          <img src={brandLogo} alt="Pick N Book Logo" className="b2b-auth-hero-logo" />
        </div>

        <div className="b2b-auth-hero-content">
          <h1>Grow Your Travel Business with PickNBook</h1>
          <p>Join thousands of agents and corporate clients who rely on us for seamless, high-margin travel bookings.</p>
          
          <div className="b2b-auth-features">
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Special discounted fares for flights and buses</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Dedicated agent wallet with quick top-ups</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Sub-agent management and analytics panel</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>24/7 priority support desk for B2B partners</span>
            </div>
          </div>
        </div>

        <div className="b2b-auth-hero-footer">
          <span>© 2026 PickNBook B2B Portal</span>
          <span>Terms & Privacy</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="b2b-auth-form-panel">
        <div className="b2b-auth-card">
          <div className="b2b-auth-card-header">
            <h2>B2B Partner Sign In</h2>
            <p>Welcome back! Please enter your agent details to access your dashboard.</p>
          </div>

          {status.message && (
            <div className={`b2b-status-alert ${status.type}`} style={{ marginBottom: 20 }}>
              <ShieldCheck size={16} />
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="b2b-auth-form">
            <div className="b2b-form-group">
              <label htmlFor="b2b-email">Corporate Email Address</label>
              <div className="b2b-input-wrapper">
                <Mail size={18} className="b2b-input-icon" />
                <input
                  id="b2b-email"
                  type="email"
                  placeholder="name@company.com"
                  className="b2b-input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {errors.email && <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>{errors.email}</span>}
            </div>

            <div className="b2b-form-group">
              <label htmlFor="b2b-password">Password</label>
              <div className="b2b-input-wrapper">
                <LockKeyhole size={18} className="b2b-input-icon" />
                <input
                  id="b2b-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="b2b-input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="b2b-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>{errors.password}</span>}
            </div>

            <div className="b2b-form-row">
              <label className="b2b-remember-me">
                <input type="checkbox" />
                <span>Keep me signed in</span>
              </label>
              <Link to="/b2b/forgot-password" className="b2b-forgot-link">Forgot password?</Link>
            </div>

            <button type="submit" className="b2b-submit-btn" disabled={loading}>
              <LogIn size={18} />
              <span>{loading ? "Signing in..." : "Partner Sign In"}</span>
            </button>
          </form>

          <div className="b2b-auth-footer">
            Don't have a partner account?
            <Link to="/b2b/register">Register Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
