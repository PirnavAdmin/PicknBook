import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../../contexts/UserContext";
import { submitContactQuery } from "../../services/queryService";
import {
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  ShieldCheck,
  Headphones,
  MessageSquare,
  Edit3,
  Send,
  User,
  Shield,
  Clock3
} from "lucide-react";
import contactBanner from "../../assets/images/contact-banner.png";
import journeyIllustration from "../../assets/images/journey-illustration.png";

export default function ContactUsPage() {
  const { userData } = useContext(UserContext);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  // Pre-fill user data if logged in
  useEffect(() => {
    if (userData) {
      const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(" ");
      setFormData((prev) => ({
        ...prev,
        name: fullName || prev.name,
        email: userData.email || prev.email,
        phoneNo: userData.mobile || prev.phoneNo,
      }));
    }
  }, [userData]);

  const validateField = (name, value) => {
    let errMsg = "";
    if (name === "name") {
      if (!value.trim()) {
        errMsg = "Name is required.";
      } else if (value.trim().length < 3) {
        errMsg = "Name must be at least 3 characters long.";
      }
    } else if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) {
        errMsg = "Email is required.";
      } else if (!emailRegex.test(value.trim())) {
        errMsg = "Please enter a valid email address.";
      }
    } else if (name === "phoneNo") {
      if (value.trim()) {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(value.trim())) {
          errMsg = "Enter a valid 10-digit number starting with 6-9.";
        }
      }
    } else if (name === "message") {
      if (!value.trim()) {
        errMsg = "Message is required.";
      } else if (value.trim().length < 10) {
        errMsg = "Message must be at least 10 characters long.";
      }
    }
    setErrors((prev) => ({ ...prev, [name]: errMsg }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phoneNo = formData.phoneNo.trim();
    const message = formData.message.trim();

    const newErrors = {};
    if (!name) newErrors.name = "Name is required.";
    else if (name.length < 3) newErrors.name = "Name must be at least 3 characters long.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = "Email is required.";
    else if (!emailRegex.test(email)) newErrors.email = "Please enter a valid email address.";

    if (phoneNo) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNo)) newErrors.phoneNo = "Enter a valid 10-digit number starting with 6-9.";
    }

    if (!message) newErrors.message = "Message is required.";
    else if (message.length < 10) newErrors.message = "Message must be at least 10 characters long.";

    setErrors(newErrors);

    if (Object.values(newErrors).some((msg) => msg)) {
      setError("Please correct the errors in the form before submitting.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = {
        ...formData,
        subject: formData.subject.trim() || "General Inquiry",
      };
      await submitContactQuery(payload);
      setSuccess(true);
      setFormData((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
      setErrors({});
    } catch (err) {
      setError("Failed to submit support query. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .contact-page-container {
          background-color: #fcfbfb;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding-bottom: 60px;
        }

        /* Banner Section styling */
        .contact-banner-section {
          background: url(${contactBanner}) center/cover no-repeat;
          height: 280px;
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 10%;
          overflow: hidden;
        }

        .contact-banner-overlay {
          max-width: 600px;
          z-index: 2;
          padding-bottom: 20px;
        }

        .contact-banner-overlay h1 {
          font-size: 2.4rem;
          font-weight: 800;
          color: #880d4f;
          margin: 0 0 12px 0;
          position: relative;
          display: inline-block;
          padding-bottom: 8px;
        }

        .contact-banner-overlay h1::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 55px;
          height: 3px;
          background: #fbbf24;
          border-radius: 2px;
        }

        .contact-banner-overlay p {
          font-size: 0.92rem;
          line-height: 1.5;
          color: #333333;
          margin: 0;
          font-weight: 500;
        }

        /* Content Layout */
        .contact-content-grid {
          max-width: 1200px;
          margin: -60px auto 40px auto;
          padding: 0 20px;
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 30px;
          position: relative;
          z-index: 10;
        }

        /* Common Cards styling */
        .contact-card-box {
          background: #ffffff;
          border-radius: 12px;
          padding: 35px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1eeed;
        }

        .contact-card-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #880d4f;
          margin: 0 0 25px 0;
          position: relative;
          padding-bottom: 10px;
        }

        .contact-card-title::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 60px;
          height: 3px;
          background: #fbbf24;
          border-radius: 2px;
        }

        /* Form styling */
        .contact-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .contact-full-width {
          grid-column: 1 / -1;
        }

        .contact-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .contact-input-icon {
          position: absolute;
          left: 14px;
          color: #880d4f;
          pointer-events: none;
        }

        .contact-field {
          width: 100%;
          padding: 13px 15px 13px 44px;
          border: 1px solid #e1dbda;
          border-radius: 8px;
          font-size: 0.92rem;
          outline: none;
          color: #333333;
          background: #faf9f9;
          transition: all 0.25s ease;
        }

        .contact-field::placeholder {
          color: #a39c9b;
        }

        .contact-field:focus {
          border-color: #880d4f;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(136, 13, 79, 0.1);
        }

        .contact-field.has-error {
          border-color: #ef4444 !important;
          background-color: #fffafb !important;
        }

        .contact-field.has-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }

        .contact-select-field {
          appearance: none;
          cursor: pointer;
        }

        .contact-select-chevron {
          position: absolute;
          right: 14px;
          color: #666666;
          pointer-events: none;
        }

        .contact-textarea {
          min-height: 140px;
          resize: vertical;
          padding-top: 13px;
        }

        .contact-submit-btn {
          background: #880d4f;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
          box-shadow: 0 4px 15px rgba(136, 13, 79, 0.2);
          width: fit-content;
        }

        .contact-submit-btn:hover:not(:disabled) {
          background: #70073e;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(136, 13, 79, 0.3);
        }

        .contact-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .contact-privacy-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #7a706f;
          margin-top: 15px;
        }

        /* Right Panel Info items styling */
        .contact-info-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .contact-info-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .contact-info-icon-box {
          background: #faf3f5;
          color: #880d4f;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-info-text-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-info-text-box h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #333333;
          margin: 0;
        }

        .contact-info-text-box p {
          font-size: 0.88rem;
          color: #666666;
          margin: 0;
          line-height: 1.5;
        }

        .contact-ill-card {
          margin-top: 24px;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #f1eeed;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
        }

        .contact-ill-img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Bottom Row Badges styling */
        .contact-badges-row {
          max-width: 1200px;
          margin: 40px auto 0 auto;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .contact-badge-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #f3eff0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        .contact-badge-icon-box {
          background: #faf3f5;
          color: #880d4f;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-badge-info h5 {
          font-size: 0.9rem;
          font-weight: 700;
          color: #333333;
          margin: 0 0 3px 0;
        }

        .contact-badge-info p {
          font-size: 0.78rem;
          color: #777777;
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 900px) {
          .contact-banner-section {
            height: 200px;
            padding: 0 4%;
            background-position: left center;
          }
          .contact-banner-overlay h1 {
            font-size: 2.2rem;
          }
          .contact-banner-overlay p {
            font-size: 0.95rem;
          }
          .contact-content-grid {
            grid-template-columns: 1fr;
            margin-top: -30px;
          }
          .contact-card-box {
            padding: 24px;
          }
        }

        @media (max-width: 600px) {
          .contact-form-grid {
            grid-template-columns: 1fr;
          }
          .contact-badges-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="contact-page-container">

        {/* Banner Section */}
        <div className="contact-banner-section">
          <div className="contact-banner-overlay">
            <h1>Contact Us</h1>
            <p>We're here to help! Reach out to us for any queries, support or travel assistance.</p>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="contact-content-grid">

          {/* Left Panel: Send Us a Message */}
          <div className="contact-card-box">
            <h3 className="contact-card-title">Send Us a Message</h3>

            {success ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <CheckCircle size={56} style={{ color: "#880d4f", marginBottom: "16px" }} />
                <h4 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#333333", margin: "0 0 10px 0" }}>Thank You!</h4>
                <p style={{ color: "#666666", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
                  Your message has been sent successfully. We will check it and get back to you soon.
                </p>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="contact-submit-btn"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {error && (
                  <div style={{ color: "#ef4444", background: "#fef2f2", padding: "10px 14px", borderRadius: "8px", fontSize: "0.88rem", fontWeight: 600, border: "1px solid #fee2e2" }}>
                    {error}
                  </div>
                )}

                <div className="contact-form-grid">
                  <div className="contact-input-wrapper">
                    <User className="contact-input-icon" size={18} />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`contact-field ${errors.name ? "has-error" : ""}`}
                    />
                    {errors.name && <span style={{ position: "absolute", bottom: "-18px", left: "0", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600 }}>{errors.name}</span>}
                  </div>

                  <div className="contact-input-wrapper">
                    <Mail className="contact-input-icon" size={18} />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`contact-field ${errors.email ? "has-error" : ""}`}
                    />
                    {errors.email && <span style={{ position: "absolute", bottom: "-18px", left: "0", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600 }}>{errors.email}</span>}
                  </div>

                  <div className="contact-input-wrapper contact-full-width">
                    <Phone className="contact-input-icon" size={18} />
                    <input
                      type="tel"
                      name="phoneNo"
                      placeholder="Phone Number"
                      value={formData.phoneNo}
                      onChange={handleChange}
                      className={`contact-field ${errors.phoneNo ? "has-error" : ""}`}
                    />
                    {errors.phoneNo && <span style={{ position: "absolute", bottom: "-18px", left: "0", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600 }}>{errors.phoneNo}</span>}
                  </div>

                  <div className="contact-input-wrapper contact-full-width">
                    <MessageSquare className="contact-input-icon" size={18} />
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="contact-field contact-select-field"
                    >
                      <option value="">Select Subject</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Booking Support">Booking Support</option>
                      <option value="Refund Status">Refund Status</option>
                      <option value="Feedback">Feedback</option>
                    </select>
                    <div className="contact-select-chevron">&#9662;</div>
                  </div>

                  <div className="contact-input-wrapper contact-full-width">
                    <Edit3 className="contact-input-icon" style={{ top: "16px" }} size={18} />
                    <textarea
                      name="message"
                      placeholder="Write your message here..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className={`contact-field contact-textarea ${errors.message ? "has-error" : ""}`}
                    />
                    {errors.message && <span style={{ position: "absolute", bottom: "-18px", left: "0", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600 }}>{errors.message}</span>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="contact-submit-btn"
                >
                  <Send size={16} />
                  {loading ? "Sending..." : "Send Message"}
                </button>

                <div className="contact-privacy-note" style={{ marginBottom: "16px" }}>
                  <Shield size={14} style={{ color: "#10b981" }} />
                  <span>We respect your privacy. Your information is safe with us.</span>
                </div>

                {/* Inner Badges row inside left container */}
                <div className="contact-badges-row-inner" style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: "10px",
                  borderTop: "1px solid #f1eeed",
                  paddingTop: "20px",
                  marginTop: "10px"
                }}>
                  <div className="contact-badge-card" style={{ padding: "10px", gap: "8px", borderRadius: "8px", border: "1px solid #f3eff0" }}>
                    <div className="contact-badge-icon-box" style={{ width: "32px", height: "32px" }}>
                      <Headphones size={14} />
                    </div>
                    <div className="contact-badge-info">
                      <h5 style={{ fontSize: "0.72rem", margin: "0 0 2px 0" }}>24/7 Support</h5>
                      <p style={{ fontSize: "0.6rem", margin: 0, color: "#777777", lineHeight: "1.2" }}>We are here to help you anytime</p>
                    </div>
                  </div>

                  <div className="contact-badge-card" style={{ padding: "10px", gap: "8px", borderRadius: "8px", border: "1px solid #f3eff0" }}>
                    <div className="contact-badge-icon-box" style={{ width: "32px", height: "32px" }}>
                      <ShieldCheck size={14} />
                    </div>
                    <div className="contact-badge-info">
                      <h5 style={{ fontSize: "0.72rem", margin: "0 0 2px 0" }}>Secure & Safe</h5>
                      <p style={{ fontSize: "0.6rem", margin: 0, color: "#777777", lineHeight: "1.2" }}>Your information is 100% protected</p>
                    </div>
                  </div>

                  <div className="contact-badge-card" style={{ padding: "10px", gap: "8px", borderRadius: "8px", border: "1px solid #f3eff0" }}>
                    <div className="contact-badge-icon-box" style={{ width: "32px", height: "32px" }}>
                      <Clock3 size={14} />
                    </div>
                    <div className="contact-badge-info">
                      <h5 style={{ fontSize: "0.72rem", margin: "0 0 2px 0" }}>Quick Response</h5>
                      <p style={{ fontSize: "0.6rem", margin: 0, color: "#777777", lineHeight: "1.2" }}>We respond to all queries within 24 hrs</p>
                    </div>
                  </div>

                  <div className="contact-badge-card" style={{ padding: "10px", gap: "8px", borderRadius: "8px", border: "1px solid #f3eff0" }}>
                    <div className="contact-badge-icon-box" style={{ width: "32px", height: "32px" }}>
                      <User size={14} />
                    </div>
                    <div className="contact-badge-info">
                      <h5 style={{ fontSize: "0.72rem", margin: "0 0 2px 0" }}>Customer First</h5>
                      <p style={{ fontSize: "0.6rem", margin: 0, color: "#777777", lineHeight: "1.2" }}>Your satisfaction is our top priority</p>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Right Panel: Contact Information */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="contact-card-box" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <h3 className="contact-card-title">Contact Information</h3>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon-box">
                    <Phone size={18} />
                  </div>
                  <div className="contact-info-text-box">
                    <h4>Phone</h4>
                    <p>+91 999-999-9999</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-box">
                    <Mail size={18} />
                  </div>
                  <div className="contact-info-text-box">
                    <h4>Email</h4>
                    <p>contact@picknbook.in</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-box">
                    <MapPin size={18} />
                  </div>
                  <div className="contact-info-text-box">
                    <h4>Address</h4>
                    <p>
                      Pirnav Software Solutions Private Limited,<br />
                      4th Floor, Jain Sadguru Images Capital Park,<br />
                      Madhapur, Hyderabad, Telangana, India ( 500081 )
                    </p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-box">
                    <Clock size={18} />
                  </div>
                  <div className="contact-info-text-box">
                    <h4>Working Hours</h4>
                    <p>Mon - Sat : 9:00 AM - 7:00 PM<br />Sunday : 10:00 AM - 5:00 PM</p>
                  </div>
                </div>
              </div>

              {/* Suitcase Illustration inside the same card box - pushed to bottom */}
              <div style={{ marginTop: "auto", paddingTop: "24px", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #f1eeed" }}>
                  <img src={journeyIllustration} alt="Journey Suitcase Illustration" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
