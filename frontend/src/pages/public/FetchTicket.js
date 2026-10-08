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
  Tag,
  Ticket,
  ArrowRight,
  Lock
} from "lucide-react";
import { fetchTicketByContact, normalizeBookingType } from "../../services/ticketService";
import hotelPreview from "../../assets/images/illustrations/hotel-section-banner.png";
import busPreview from "../../assets/images/illustrations/bus-hero-theme.png";
import flightPreview from "../../assets/images/illustrations/flight-hero-theme.jpg";
import "../../STYLES/FetchTicket.css";

// Category data for Left Side - UNCHANGED
const CATEGORIES = {
  hotel: {
    id: "hotel",
    label: "HOTELS",
    title: "Comfortable stays, memorable experiences",
    image: hotelPreview,
    icon: Hotel
  },
  bus: {
    id: "bus",
    label: "BUSES",
    title: "Premium bus journeys, on-time arrivals",
    image: busPreview,
    icon: BusFront
  },
  flight: {
    id: "flight",
    label: "FLIGHTS",
    title: "Seamless flights, unlimited destinations",
    image: flightPreview,
    icon: Plane
  }
};

const FetchTicket = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State mapping
  const [bookingType, setBookingType] = useState(
    normalizeBookingType(location.state?.bookingType, "hotel")
  );
  const [mobile, setMobile] = useState(location.state?.mobile || "");
  const [email, setEmail] = useState(location.state?.email || "");
  const [filterType] = useState(location.state?.filterType || "all");
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

      const selectedBookingType = normalizeBookingType(bookingType, "hotel");
      const tickets = (Array.isArray(resolvedTickets) ? resolvedTickets : [resolvedTickets])
        .filter(Boolean)
        .map((ticket) => ({
          ...ticket,
          bookingType: normalizeBookingType(ticket?.bookingType || ticket?.ticketType, selectedBookingType),
          ticketType: normalizeBookingType(ticket?.ticketType || ticket?.bookingType, selectedBookingType),
        }));

      if (tickets.length === 0) {
        setError("No booking found for the provided details.");
        return;
      }

      setError("");
      navigate("/print-ticket", {
        state: {
          pnr: "",
          mobile: trimmedMobile,
          email: trimmedEmail,
          bookingType: selectedBookingType,
          ticket: tickets.length === 1 ? tickets[0] : null,
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
        {/* Left Section: Curved Category Navigation, Dynamic Image with Overlay and Benefits - UNCHANGED */}
        <div className="fetch-redesign-left">
          {/* Top Curved Arc Navigation Panel */}
          <div className="left-arc-header">
            {/* SVG Arc path behind the buttons */}
            <svg className="arc-path-svg" viewBox="0 0 320 80" fill="none">
              <path d="M15,48 Q160,18 305,48" stroke="#ff0000" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
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

        {/* Right Section: Clean Fetch Booking Form matching reference screenshot */}
        <div className="fetch-redesign-right">
          <div className="fetch-right-header">
            <div className="fetch-ticket-icon-box">
              <Ticket size={22} color="#ff0000" />
            </div>
            <h2>Fetch your booking</h2>
          </div>

          <p className="fetch-right-subtitle">
            Enter the contact details used when booking.<br />
            We'll bring all your bookings together.
          </p>

          <hr className="fetch-right-divider" />

          <form onSubmit={handleFetchBooking} className="fetch-right-form">
            <div className="fetch-input-group">
              <label htmlFor="fetch-mobile-input">Mobile number</label>
              <div className="fetch-input-field-wrap">
                <Phone size={18} className="fetch-input-icon" />
                <input
                  id="fetch-mobile-input"
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 15));
                    if (error) setError("");
                  }}
                  maxLength={15}
                  placeholder="Enter your mobile number"
                  className={error.toLowerCase().includes("mobile") ? "error-input" : ""}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="fetch-input-group">
              <label htmlFor="fetch-email-input">Email address</label>
              <div className="fetch-input-field-wrap">
                <Mail size={18} className="fetch-input-icon" />
                <input
                  id="fetch-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your email address"
                  className={error.toLowerCase().includes("email") ? "error-input" : ""}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="fetch-info-message">
              <div className="fetch-info-check-circle">
                <Check size={12} color="#ffffff" strokeWidth={3} />
              </div>
              <span className="fetch-info-text">
                All your bookings — upcoming, completed and cancelled — in one place.
              </span>
            </div>

            {error && <div className="stepper-error-banner">⚠️ {error}</div>}

            <button type="submit" className="fetch-main-submit-btn" disabled={loading}>
              <span>{loading ? "FETCHING BOOKINGS..." : "Fetch all bookings"}</span>
              <ArrowRight size={18} />
            </button>

            <div className="fetch-security-footer">
              <Lock size={15} className="fetch-security-icon" />
              <span>Your information is safe and secure.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FetchTicket;
