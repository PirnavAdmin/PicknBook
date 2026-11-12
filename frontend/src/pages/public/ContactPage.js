/* eslint-disable */
import React, { useState } from "react";
import { Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { createQuery } from "../../services/queryService";
import "../../STYLES/ContactPage.css";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setAlert({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    try {
      setLoading(true);
      setAlert(null);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNo: formData.phoneNo.trim(),
        subject: formData.subject.trim() || "General Query",
        message: formData.message.trim(),
        status: "Pending"
      };

      await createQuery(payload);

      setAlert({ type: "success", message: "Thank you! Your message has been sent successfully." });
      setFormData({
        name: "",
        email: "",
        phoneNo: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setAlert({ type: "error", message: error.message || "Failed to send message. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-wrapper">
      <div className="contact-outer-card">

        {/* Left Side: Contact Info */}
        <div className="contact-info-col">

          {/* Have Questions Box */}
          <div className="info-box-item">
            <div className="info-icon-wrapper">
              <Phone size={20} />
            </div>
            <div className="info-text-content">
              <h4>Have Questions? Call Us !</h4>
              <p>+91 999-999-9999</p>
            </div>
          </div>

          {/* Write Us Box */}
          <div className="info-box-item">
            <div className="info-icon-wrapper">
              <Mail size={20} />
            </div>
            <div className="info-text-content">
              <h4>Write us on !</h4>
              <p>contact@picknbook.in</p>
            </div>
          </div>

          {/* Address Box */}
          <div className="info-box-item">
            <div className="info-icon-wrapper">
              <MapPin size={20} />
            </div>
            <div className="info-text-content">
              <h4>Address</h4>
              <p>
                Pirnav Software Solutions Private Limited, 4th Floor, Jain Sadguru Images Capital Park,
                Madhapur Hyderabad, Telangana, India, 500081
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Form */}
        <div
          className="contact-form-col"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=1080&auto=format&fit=crop')` }}
        >
          <div className="contact-form-content">

            <div className="contact-title-section">
              <h2>Contact<span>Us</span></h2>
            </div>

            {alert && (
              <div className={`contact-toast ${alert.type}`}>
                {alert.message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="contact-form-grid">

                {/* Your Name */}
                <div className="form-field-group">
                  <label htmlFor="name">Your Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-field-input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Your Email */}
                <div className="form-field-group">
                  <label htmlFor="email">Your Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-field-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="form-field-group">
                  <label htmlFor="phoneNo">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNo"
                    name="phoneNo"
                    className="form-field-input"
                    value={formData.phoneNo}
                    onChange={handleChange}
                  />
                </div>

                {/* Subject */}
                <div className="form-field-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="form-field-input"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>

                {/* Message */}
                <div className="form-field-group full-width">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    className="form-field-input form-field-textarea"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

              </div>

              <button
                type="submit"
                className="btn-contact-submit"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
