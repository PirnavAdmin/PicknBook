import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, LockKeyhole, Eye, EyeOff, User, Phone, Briefcase, Building, MapPin, CheckCircle2, ShieldCheck } from "lucide-react";
import "../../../STYLES/B2BAuth.css";
import brandLogo from "../../../assets/images/brand/pick-n-book-logo.png";
import { requestAuth, readApiMessage } from "../../../services/authService";

const BUSINESS_TYPES = [
  { value: "Retail Agent", label: "Travel Agent / Sub-Agent" },
  { value: "Corporate Partner", label: "Corporate Enterprise" },
  { value: "Tour Operator", label: "Tour Operator / DMC" },
  { value: "Wholesaler", label: "Wholesaler / API Client" },
];

export default function B2BRegister() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("Retail Agent");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstin, setGstin] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const nextErrors = {};
    const cleanEmail = email.trim();
    const cleanMobile = mobile.trim();

    if (!companyName.trim()) nextErrors.companyName = "Company/Agency name is required";
    if (!contactName.trim()) nextErrors.contactName = "Contact person's name is required";
    
    if (!cleanEmail) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = "Enter a valid corporate email";
    }

    if (!cleanMobile) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number";
    }

    const cleanGstin = gstin.trim();
    if (!cleanGstin) {
      nextErrors.gstin = "GSTIN is required";
    } else if (cleanGstin.length !== 15) {
      nextErrors.gstin = "GSTIN must be exactly 15 characters";
    }

    if (!city.trim()) nextErrors.city = "City/State is required";

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters long";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!validateForm()) return;

    setLoading(true);
    setStatus({ type: "", message: "" });

    const payload = {
      companyName: companyName.trim(),
      businessType,
      contactName: contactName.trim(),
      email: email.trim(),
      phoneNumber: mobile.trim(),
      gstin: gstin.trim().toUpperCase(),
      city: city.trim(),
      password,
    };

    try {
      // Direct API Request
      const response = await requestAuth(
        "/api/Auth/b2b/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        "B2B Partner Registration failed."
      );

      setStatus({
        type: "success",
        message: readApiMessage(response, "Registration request submitted. Redirecting to login..."),
      });

      setTimeout(() => {
        navigate("/b2b/login");
      }, 2000);

    } catch (error) {
      const message = error?.message || "Registration failed.";

      // Demo/Local Fallback
      if (message.includes("Failed to fetch") || message.includes("Temporary database issue") || message.includes("404")) {
        setStatus({
          type: "success",
          message: "Demo Mode: Registration request simulated successfully. Redirecting to login...",
        });

        setTimeout(() => {
          navigate("/b2b/login");
        }, 2000);
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
          <h1>Partner with India's Leading B2B Travel Portal</h1>
          <p>Get access to a high-yield travel agent framework that delivers maximum commissions and enterprise stability.</p>
          
          <div className="b2b-auth-features">
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Instant API and White Label integrations</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Real-time seat mapping & booking hold services</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Unlimited sub-agent structure creation</span>
            </div>
            <div className="b2b-auth-feature-item">
              <CheckCircle2 size={18} className="b2b-auth-feature-icon" />
              <span>Automated GST invoicing and tax claim tracking</span>
            </div>
          </div>
        </div>

        <div className="b2b-auth-hero-footer">
          <span>© 2026 PickNBook B2B Portal</span>
          <span>Terms & Privacy</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="b2b-auth-form-panel" style={{ padding: "40px 24px" }}>
        <div className="b2b-auth-card" style={{ maxWidth: 500 }}>
          <div className="b2b-auth-card-header" style={{ marginBottom: 24 }}>
            <h2>Create B2B Partner Account</h2>
            <p>Become an authorized booking agent. Register your travel agency or enterprise.</p>
          </div>

          {status.message && (
            <div className={`b2b-status-alert ${status.type}`} style={{ marginBottom: 20 }}>
              <ShieldCheck size={16} />
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="b2b-auth-form" style={{ gap: 16 }}>
            <div className="b2b-form-group">
              <label htmlFor="b2b-company">Agency / Company Name</label>
              <div className="b2b-input-wrapper">
                <Building size={18} className="b2b-input-icon" />
                <input
                  id="b2b-company"
                  type="text"
                  placeholder="e.g. Star Travels Pvt Ltd"
                  className="b2b-input-field"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>
              {errors.companyName && <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>{errors.companyName}</span>}
            </div>

            <div className="b2b-form-group">
              <label htmlFor="b2b-business-type">Business Type</label>
              <div className="b2b-input-wrapper">
                <Briefcase size={18} className="b2b-input-icon" />
                <select
                  id="b2b-business-type"
                  className="b2b-input-field"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  disabled={loading}
                  style={{ appearance: "none", cursor: "pointer", background: "white" }}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="b2b-form-group">
              <label htmlFor="b2b-contact">Contact Person Name</label>
              <div className="b2b-input-wrapper">
                <User size={18} className="b2b-input-icon" />
                <input
                  id="b2b-contact"
                  type="text"
                  placeholder="e.g. John Doe"
                  className="b2b-input-field"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={loading}
                />
              </div>
              {errors.contactName && <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>{errors.contactName}</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="b2b-form-group">
                <label htmlFor="b2b-reg-email">Email Address</label>
                <div className="b2b-input-wrapper">
                  <Mail size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-reg-email"
                    type="email"
                    placeholder="email@company.com"
                    className="b2b-input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.email && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.email}</span>}
              </div>

              <div className="b2b-form-group">
                <label htmlFor="b2b-reg-mobile">Mobile Number</label>
                <div className="b2b-input-wrapper">
                  <Phone size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-reg-mobile"
                    type="tel"
                    placeholder="10-digit number"
                    className="b2b-input-field"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.mobile && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.mobile}</span>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="b2b-form-group">
                <label htmlFor="b2b-gst">GSTIN</label>
                <div className="b2b-input-wrapper">
                  <Building size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-gst"
                    type="text"
                    placeholder="15-digit GSTIN"
                    className="b2b-input-field"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.gstin && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.gstin}</span>}
              </div>

              <div className="b2b-form-group">
                <label htmlFor="b2b-city">City / State</label>
                <div className="b2b-input-wrapper">
                  <MapPin size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-city"
                    type="text"
                    placeholder="e.g. Hyderabad, TS"
                    className="b2b-input-field"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.city && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.city}</span>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="b2b-form-group">
                <label htmlFor="b2b-reg-password">Password</label>
                <div className="b2b-input-wrapper">
                  <LockKeyhole size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="b2b-input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.password && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.password}</span>}
              </div>

              <div className="b2b-form-group">
                <label htmlFor="b2b-reg-confirm">Confirm Password</label>
                <div className="b2b-input-wrapper">
                  <LockKeyhole size={18} className="b2b-input-icon" />
                  <input
                    id="b2b-reg-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm"
                    className="b2b-input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                {errors.confirmPassword && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="b2b-form-row">
              <label className="b2b-remember-me" style={{ fontSize: "0.8rem" }}>
                <input type="checkbox" required />
                <span>I accept the partner terms and service level agreements.</span>
              </label>
            </div>

            <button type="submit" className="b2b-submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              <span>{loading ? "Submitting Request..." : "Register Partner Account"}</span>
            </button>
          </form>

          <div className="b2b-auth-footer">
            Already registered?
            <Link to="/b2b/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
