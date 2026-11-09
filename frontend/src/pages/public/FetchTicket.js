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

// Category data for Left Side
const CATEGORIES = {
  bus: {
    id: "bus",
    label: "BUSES",
    title: "Premium bus journeys, on-time arrivals",
    image: busPreview,
    icon: BusFront
  },
  hotel: {
    id: "hotel",
    label: "HOTELS",
    title: "Comfortable stays, memorable experiences",
    image: hotelPreview,
    icon: Hotel
  },
  flight: {
    id: "flight",
    label: "FLIGHTS",
    title: "Seamless flights, unlimited destinations",
    image: flightPreview,
    icon: Plane
  }
};

const validateMobile = (value) => {
  const trimmed = (value ?? "").trim();

  // 1. Empty -> "Mobile number is required"
  if (!trimmed) {
    return "Mobile number is required";
  }

  // 2. Any non-digit /\D/ -> "Mobile number must contain digits only (no spaces, letters or symbols)"
  if (/\D/.test(trimmed)) {
    return "Mobile number must contain digits only (no spaces, letters or symbols)";
  }

  // 3. Length is not 10 -> "Mobile number must be exactly 10 digits (you entered N)"
  if (trimmed.length !== 10) {
    return `Mobile number must be exactly 10 digits (you entered ${trimmed.length})`;
  }

  // 4. Doesn't start 6-9 -> "Mobile number must start with 6, 7, 8 or 9" (test: /^[6-9]/)
  if (!/^[6-9]/.test(trimmed)) {
    return "Mobile number must start with 6, 7, 8 or 9";
  }

  // 5. Same digit 10 times -> "Enter a valid mobile number" (test: /^(\d)\1{9}$/)
  if (/^(\d)\1{9}$/.test(trimmed)) {
    return "Enter a valid mobile number";
  }

  return null;
};

const validateEmail = (value) => {
  const trimmed = (value ?? "").trim();

  // 1. Empty -> "Email is required"
  if (!trimmed) {
    return "Email is required";
  }

  // 2. Has a space -> "Email cannot contain spaces"
  if (/\s/.test(trimmed)) {
    return "Email cannot contain spaces";
  }

  // 3. No "@" -> "Email must contain '@' (for example: name@gmail.com)"
  if (!trimmed.includes("@")) {
    return "Email must contain '@' (for example: name@gmail.com)";
  }

  // 4. More than one "@" -> "Email can contain only one '@'"
  if ((trimmed.match(/@/g) || []).length > 1) {
    return "Email can contain only one '@'";
  }

  const atIndex = trimmed.indexOf("@");
  const namePart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  // 5. Nothing before "@" -> "Enter the part before '@' (for example: name@gmail.com)"
  if (!namePart || namePart.length === 0) {
    return "Enter the part before '@' (for example: name@gmail.com)";
  }

  // 6. Nothing after "@" -> "Enter the domain after '@' (for example: gmail.com)"
  if (!domainPart || domainPart.length === 0) {
    return "Enter the domain after '@' (for example: gmail.com)";
  }

  // 7. Over 100 characters -> "Email must not exceed 100 characters"
  if (trimmed.length > 100) {
    return "Email must not exceed 100 characters";
  }

  // 8. Name part has characters outside A-Za-z0-9 . _ % + - -> "Email contains invalid characters. Use only letters, numbers and . _ % + -"
  if (/[^a-zA-Z0-9._%+\-]/.test(namePart)) {
    return "Email contains invalid characters. Use only letters, numbers and . _ % + -";
  }

  // 9. Name part starts/ends with "." or has ".." -> "Email cannot start or end with a dot, or have two dots in a row"
  if (namePart.startsWith(".") || namePart.endsWith(".") || namePart.includes("..")) {
    return "Email cannot start or end with a dot, or have two dots in a row";
  }

  // 10. Domain has no "." -> "Domain must have an ending like .com or .in"
  if (!domainPart.includes(".")) {
    return "Domain must have an ending like .com or .in";
  }

  // 11. Domain has characters outside A-Za-z0-9 . - -> "Domain contains invalid characters"
  if (/[^a-zA-Z0-9.\-]/.test(domainPart)) {
    return "Domain contains invalid characters";
  }

  // 12. Domain starts/ends with "." or "-", or has "..", ".-", "-." -> "Enter a valid domain (for example: gmail.com)"
  if (
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    domainPart.startsWith("-") ||
    domainPart.endsWith("-") ||
    domainPart.includes("..") ||
    domainPart.includes(".-") ||
    domainPart.includes("-.")
  ) {
    return "Enter a valid domain (for example: gmail.com)";
  }

  const domainLabels = domainPart.split(".");
  const tld = domainLabels[domainLabels.length - 1];

  // 13. TLD is under 2 letters -> "Domain ending must be at least 2 letters (for example: .com)"
  if (tld.length < 2) {
    return "Domain ending must be at least 2 letters (for example: .com)";
  }

  // 14. TLD has characters other than letters -> "Domain ending can contain letters only" (test: /^[a-zA-Z]+$/)
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return "Domain ending can contain letters only";
  }

  return null;
};

const FetchTicket = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // State mapping
  const [bookingType, setBookingType] = useState(
    normalizeBookingType(
      location.state?.bookingType || searchParams.get("bookingType") || searchParams.get("type"),
      "hotel"
    )
  );
  const [mobile, setMobile] = useState(location.state?.mobile || searchParams.get("mobile") || "");
  const [email, setEmail] = useState(location.state?.email || searchParams.get("email") || "");
  const [bookingReference, setBookingReference] = useState(
    location.state?.bookingReference || location.state?.pnr || searchParams.get("bookingReference") || searchParams.get("pnr") || ""
  );
  const [filterType] = useState(location.state?.filterType || searchParams.get("filterType") || "all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({
    mobile: false,
    email: false,
  });

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 15);
    setMobile(val);
    if (error) setError("");
    if (touched.mobile) {
      const err = validateMobile(val);
      setFieldErrors((prev) => ({ ...prev, mobile: err }));
    }
  };

  const handleMobileBlur = () => {
    const trimmed = mobile.trim();
    setMobile(trimmed);
    setTouched((prev) => ({ ...prev, mobile: true }));
    const err = validateMobile(trimmed);
    setFieldErrors((prev) => ({ ...prev, mobile: err }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value.slice(0, 100);
    setEmail(val);
    if (error) setError("");
    if (touched.email) {
      const err = validateEmail(val);
      setFieldErrors((prev) => ({ ...prev, email: err }));
    }
  };

  const handleEmailBlur = () => {
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);
    setTouched((prev) => ({ ...prev, email: true }));
    const err = validateEmail(trimmed);
    setFieldErrors((prev) => ({ ...prev, email: err }));
  };

  const handleFetchBooking = async (event) => {
    event.preventDefault();

    const trimmedMobile = mobile.trim();
    const lowercasedEmail = email.trim().toLowerCase();
    setMobile(trimmedMobile);
    setEmail(lowercasedEmail);

    setTouched({ mobile: true, email: true });

    const mobileErr = validateMobile(trimmedMobile);
    const emailErr = validateEmail(lowercasedEmail);

    const nextFieldErrors = {};
    if (mobileErr) nextFieldErrors.mobile = mobileErr;
    if (emailErr) nextFieldErrors.email = emailErr;
    setFieldErrors(nextFieldErrors);

    // Block the fetch request while either field has an error, and focus the first invalid field.
    if (mobileErr) {
      const el = document.getElementById("fetch-mobile-input");
      if (el) el.focus();
      return;
    }

    if (emailErr) {
      const el = document.getElementById("fetch-email-input");
      if (el) el.focus();
      return;
    }

    setLoading(true);
    setError("");
    const trimmedRef = bookingReference.trim();

    try {
      const resolvedTickets = await fetchTicketByContact({
        mobile: trimmedMobile,
        email: lowercasedEmail,
        bookingType,
        bookingReference: trimmedRef,
        activeOnly: filterType === "upcoming",
      });

      const selectedBookingType = normalizeBookingType(bookingType, "hotel");
      const tickets = (Array.isArray(resolvedTickets) ? resolvedTickets : [resolvedTickets])
        .filter(Boolean)
        .map((ticket) => {
          const status = String(ticket?.status ?? ticket?.Status ?? "Booked").trim();
          return {
            ...ticket,
            status,
            isCancelled: Boolean(ticket?.isCancelled) || status.toUpperCase() === "CANCELLED",
            bookingType: normalizeBookingType(ticket?.bookingType || ticket?.ticketType, selectedBookingType),
            ticketType: normalizeBookingType(ticket?.ticketType || ticket?.bookingType, selectedBookingType),
          };
        });

      if (tickets.length === 0) {
        setError("No booking found for the provided details.");
        return;
      }

      setError("");
      navigate("/print-ticket", {
        state: {
          pnr: trimmedRef,
          bookingReference: trimmedRef,
          mobile: trimmedMobile,
          email: lowercasedEmail,
          bookingType: selectedBookingType,
          ticket: tickets.length === 1 ? tickets[0] : null,
          tickets: tickets,
        },
      });
    } catch (fetchError) {
      let msg = fetchError.message || "No booking found matching the provided details.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.message) {
          msg = parsed.message;
        }
      } catch (_) { }
      setError(msg);
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
              <path d="M48,50 Q160,18 272,50" stroke="#fecdd3" strokeWidth="1.5" strokeDasharray="4 4" />
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
                    <cat.icon size={bookingType === cat.id ? 28 : 22} />
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
                <ShieldCheck size={18} color="#ff0000" />
              </div>
              <div className="benefit-text">
                <strong>Secure &amp; Safe</strong>
                <span>Your data is always protected</span>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Tag size={18} color="#ff0000" />
              </div>
              <div className="benefit-text">
                <strong>Best Prices</strong>
                <span>Get the best deals on every booking</span>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Mail size={18} color="#ff0000" />
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

          <form onSubmit={handleFetchBooking} className="fetch-right-form" noValidate>
            <div className="fetch-input-group">
              <label htmlFor="fetch-mobile-input">Mobile number</label>
              <div className={`fetch-input-field-wrap ${fieldErrors.mobile ? "is-error" : ""}`}>
                <Phone size={18} className="fetch-input-icon" />
                <input
                  id="fetch-mobile-input"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={handleMobileChange}
                  onBlur={handleMobileBlur}
                  maxLength={15}
                  placeholder="Enter your mobile number"
                  className={fieldErrors.mobile ? "is-error" : ""}
                  aria-invalid={Boolean(fieldErrors.mobile)}
                  aria-describedby={fieldErrors.mobile ? "fetch-mobile-error" : undefined}
                  disabled={loading}
                />
              </div>
              {fieldErrors.mobile && (
                <div id="fetch-mobile-error" className="fetch-field-error" role="alert">
                  {fieldErrors.mobile}
                </div>
              )}
            </div>

            <div className="fetch-input-group">
              <label htmlFor="fetch-email-input">Email address</label>
              <div className={`fetch-input-field-wrap ${fieldErrors.email ? "is-error" : ""}`}>
                <Mail size={18} className="fetch-input-icon" />
                <input
                  id="fetch-email-input"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  maxLength={100}
                  placeholder="Enter your email address"
                  className={fieldErrors.email ? "is-error" : ""}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "fetch-email-error" : undefined}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <div id="fetch-email-error" className="fetch-field-error" role="alert">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="fetch-input-group">
              <label htmlFor="fetch-ref-input">
                Booking Reference or PNR <span className="fetch-optional-tag">(Optional)</span>
              </label>
              <div className="fetch-input-field-wrap">
                <Ticket size={18} className="fetch-input-icon" />
                <input
                  id="fetch-ref-input"
                  type="text"
                  value={bookingReference}
                  onChange={(e) => {
                    setBookingReference(e.target.value.trim());
                    if (error) setError("");
                  }}
                  placeholder="e.g. BS-20261016... or PNR"
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

            {error && <div className="stepper-error-banner" role="alert">⚠️ {error}</div>}

            <button type="submit" className="fetch-main-submit-btn" disabled={loading}>
              <span>{loading ? "FETCHING BOOKINGS..." : "Fetch all bookings"}</span>
              <ArrowRight size={19} color="#ffffff" />
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
