/* eslint-disable */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BusFront,
  Mail,
  Phone,
  ShieldCheck,
  Hotel,
  Plane,
  Check,
  Tag
} from "lucide-react";
import { fetchTicketByContact } from "../../services/ticketService";
import "../../STYLES/FetchTicket.css";

// Mockup 3 Category data
const CATEGORIES = {
  hotel: {
    id: "hotel",
    label: "HOTELS",
    title: "Comfortable stays, memorable experiences",
    image: "/hotel_preview.jpg",
    icon: Hotel
  },
  bus: {
    id: "bus",
    label: "BUSES",
    title: "Premium bus journeys, on-time arrivals",
    image: "/bus_preview.jpg",
    icon: BusFront
  },
  flight: {
    id: "flight",
    label: "FLIGHTS",
    title: "Seamless flights, unlimited destinations",
    image: "/flight_preview.jpg",
    icon: Plane
  }
};

const FetchTicket = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State mapping the mockup
  const [bookingType, setBookingType] = useState(location.state?.bookingType || "hotel");
  const [mobile, setMobile] = useState(location.state?.mobile || "");
  const [email, setEmail] = useState(location.state?.email || "");
  const [filterType, setFilterType] = useState("upcoming"); // "upcoming" = active, "all" = all
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    let nextError = "";
    const mobileDigits = mobile.replace(/\D/g, "");

    if (!mobileDigits) {
      nextError = "Mobile number is required";
    } else if (mobileDigits.length < 10 || mobileDigits.length > 15) {
      nextError = "Enter a valid mobile number";
    }

    if (!email.trim()) {
      nextError = nextError || "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextError = nextError || "Please enter a valid email";
    }

    setError(nextError);
    return !nextError;
  };

  const handleFetchBooking = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const trimmedMobile = mobile.replace(/\D/g, "");
    const trimmedEmail = email.trim();

    try {
      const resolvedTickets = await fetchTicketByContact({
        mobile: trimmedMobile,
        email: trimmedEmail,
        bookingType,
        activeOnly: filterType === "upcoming",
      });

      const tickets = Array.isArray(resolvedTickets) ? resolvedTickets : [resolvedTickets];

      if (tickets.length === 0) {
        setError("No booking found for the provided details.");
        return;
      }

      const firstRef = String(
        tickets[0].bookingReference || tickets[0].pnr || tickets[0].reference || ""
      ).trim();

      if (!firstRef) {
        setError("Booking found, but the ticket reference is missing.");
        return;
      }

      setError("");
      navigate("/print-ticket", {
        state: {
          pnr: tickets.length === 1 ? firstRef : "",
          mobile: trimmedMobile,
          email: trimmedEmail,
          bookingType: tickets[0].ticketType || bookingType,
          ticket: tickets[0],
          tickets: tickets,
        },
      });
    } catch (fetchError) {
      setError(fetchError.message || "No booking found matching the provided details.");
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = CATEGORIES[bookingType] || CATEGORIES.hotel;

  return (
    <div className="fetch-redesign-container">
      <div className="fetch-redesign-shell">

        {/* Left Section: Curved Category Navigation, Dynamic Image with Overlay and Benefits */}
        <div className="fetch-redesign-left">

          {/* Top Curved Arc Navigation Panel */}
          <div className="left-arc-header">
            {/* SVG Arc path behind the buttons */}
            <svg className="arc-path-svg" viewBox="0 0 320 80" fill="none">
              <path d="M15,48 Q160,18 305,48" stroke="#dc1e26" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
            </svg>

            <div className="arc-buttons-wrap">
              {[
                { id: "bus", label: "BUSES", icon: BusFront },
                { id: "hotel", label: "HOTELS", icon: Hotel },
                { id: "flight", label: "FLIGHTS", icon: Plane }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`arc-tab-btn ${bookingType === cat.id ? "active" : ""}`}
                  onClick={() => setBookingType(cat.id)}
                >
                  <div className="arc-circle-icon">
                    <cat.icon size={20} />
                    {bookingType === cat.id && <div className="arc-indicator-arrow" />}
                  </div>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic visual preview area */}
          <div className="left-visual-preview">
            <div className="visual-overlay-content">
              <h3>{currentCategory.title}</h3>
              <div className="red-accent-bar" />
            </div>
            <img src={currentCategory.image} alt={currentCategory.label} className="left-preview-img" />
          </div>

          {/* Bottom Benefits Row */}
          <div className="left-benefits-footer">
            <div className="benefit-item">
              <div className="benefit-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="benefit-text">
                <strong>Secure & Safe</strong>
                <span>Your data is always protected</span>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Tag size={16} />
              </div>
              <div className="benefit-text">
                <strong>Best Prices</strong>
                <span>Get the best deals on every booking</span>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Mail size={16} />
              </div>
              <div className="benefit-text">
                <strong>24/7 Support</strong>
                <span>We're here for you anytime, anywhere</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Form Stepper Card */}
        <div className="fetch-redesign-right">
          <div className="stepper-card-header">
            <h2>Fetch Your Booking</h2>
            <p>Retrieve your booking in a few simple steps.</p>
            <div className="airplane-divider">
              <span className="line" />
              <span className="plane-icon">✈️</span>
            </div>
          </div>

          <form onSubmit={handleFetchBooking} className="stepper-form-body">

            {/* Step 1: Enter Details */}
            <div className="stepper-step">
              <div className="step-label">
                <span className="step-number">1</span>
                <strong>Enter Details</strong>
              </div>

              <div className="input-group">
                <label htmlFor="fetch-mobile-input">Mobile Number</label>
                <div className="input-field-wrap">
                  <Phone size={15} />
                  <input
                    id="fetch-mobile-input"
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 15));
                      if (error) setError("");
                    }}
                    maxLength={15}
                    placeholder="Enter mobile number"
                    className={error.toLowerCase().includes("mobile") ? "error-input" : ""}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="fetch-email-input">Email</label>
                <div className="input-field-wrap">
                  <Mail size={15} />
                  <input
                    id="fetch-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter email address"
                    className={error.toLowerCase().includes("email") ? "error-input" : ""}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Show Bookings */}
            <div className="stepper-step">
              <div className="step-label">
                <span className="step-number">2</span>
                <strong>Show Bookings</strong>
              </div>
              <div className="step-filter-cards">
                <button
                  type="button"
                  className={`filter-card ${filterType === "upcoming" ? "selected" : ""}`}
                  onClick={() => setFilterType("upcoming")}
                >
                  {filterType === "upcoming" && (
                    <div className="checkmark-badge">
                      <Check size={12} color="#fff" />
                    </div>
                  )}
                  <strong>Active Bookings</strong>
                  <span>View your upcoming and current bookings</span>
                </button>

                <button
                  type="button"
                  className={`filter-card ${filterType === "all" ? "selected" : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  {filterType === "all" && (
                    <div className="checkmark-badge">
                      <Check size={12} color="#fff" />
                    </div>
                  )}
                  <strong>All Bookings</strong>
                  <span>View all bookings including completed and cancelled</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && <div className="stepper-error-banner">⚠️ {error}</div>}

            {/* Submit Button */}
            <button type="submit" className="stepper-submit-btn" disabled={loading}>
              <span>{loading ? "FETCHING BOOKINGS..." : "FETCH BOOKINGS"}</span>
              <span className="arrow">➔</span>
            </button>

            {/* Secure Note */}
            <div className="secure-footer-note">
              <span>🔒 Your information is safe and secure with us.</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default FetchTicket;
