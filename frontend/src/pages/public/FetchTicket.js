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
  Lock,
  HelpCircle,
  Loader2,
  Download
} from "lucide-react";
import { fetchTicketByContact, normalizeBookingType } from "../../services/ticketService";
import hotelPreview from "../../assets/images/illustrations/hotel-section-banner.png";
import busPreview from "../../assets/images/illustrations/bus-hero-theme.png";
import flightPreview from "../../assets/images/illustrations/flight-hero-theme.jpg";
import "../../STYLES/FetchTicket.css";

// Category data for Left Side
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

const getRefFieldConfig = (type) => {
  switch (type) {
    case "hotel":
      return {
        label: "Hotel Booking Reference",
        placeholder: "e.g., HT-20261021114642-440 or Confirmation No.",
        helper: "Found on your hotel booking confirmation email or SMS voucher."
      };
    case "flight":
      return {
        label: "PNR / Ticket Number",
        placeholder: "e.g., 6-character PNR (ABCDEF)",
        helper: "Found on your airline e-ticket or booking confirmation."
      };
    case "bus":
      return {
        label: "Bus Ticket / PNR Number",
        placeholder: "e.g., Ticket or Booking ID",
        helper: "Found on your bus m-ticket or SMS confirmation."
      };
    default:
      return {
        label: "Booking Reference or PNR",
        placeholder: "e.g., Booking Reference or PNR",
        helper: "Found in your booking confirmation message."
      };
  }
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
  const [mobileError, setMobileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundTicket, setFoundTicket] = useState(null);
  const [foundTicketsList, setFoundTicketsList] = useState([]);

  // Dynamic reference field details based on active tab [PNB/HOTEL/BOOKING_005]
  const refConfig = getRefFieldConfig(bookingType);

  const handleMobileChange = (e) => {
    // Restrict input to digits and valid country code characters (+, spaces, hyphens) [PNB/USER/BOOKING_003]
    const val = e.target.value.replace(/[^\d+ -]/g, "").slice(0, 16);
    setMobile(val);
    if (mobileError) setMobileError("");
    if (error) setError("");
  };

  const handleMobileBlur = () => {
    const digits = mobile.replace(/\D/g, "");
    if (!mobile.trim()) {
      if (!bookingReference.trim()) {
        setMobileError("Please enter your registered mobile number.");
      }
    } else if (digits.length < 10) {
      setMobileError("Please enter a valid 10-digit mobile number.");
    } else {
      setMobileError("");
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
    if (error) setError("");
  };

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      if (!bookingReference.trim()) {
        setEmailError("Please enter your registered email address.");
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const validateForm = () => {
    let hasErr = false;
    const mobileDigits = mobile.replace(/\D/g, "");
    const trimmedRef = bookingReference.trim();
    const trimmedEmail = email.trim();

    // If booking reference is directly supplied, lookup can proceed
    if (trimmedRef) {
      setError("");
      setMobileError("");
      setEmailError("");
      return true;
    }

    if (!mobileDigits) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      hasErr = true;
    } else if (mobileDigits.length < 10) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      hasErr = true;
    } else {
      setMobileError("");
    }

    if (!trimmedEmail) {
      setEmailError("Please enter your registered email address.");
      hasErr = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      hasErr = true;
    } else {
      setEmailError("");
    }

    if (hasErr) {
      setError("Please provide all required fields to locate your reservation.");
      return false;
    }

    setError("");
    return true;
  };

  const handleFetchBooking = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setFoundTicket(null);
    setError("");

    const trimmedMobile = mobile.replace(/\D/g, "");
    const trimmedEmail = email.trim();
    const trimmedRef = bookingReference.trim();
    const phoneOrEmailVal = trimmedMobile || trimmedEmail;

    try {
      const resolvedTickets = await fetchTicketByContact({
        bookingId: trimmedRef,
        phoneOrEmail: phoneOrEmailVal,
        mobile: trimmedMobile,
        email: trimmedEmail,
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
        setError("No active booking found with the provided details. Please verify your reference number.");
        return;
      }

      setError("");
      setFoundTicket(tickets[0]);
      setFoundTicketsList(tickets);
    } catch (fetchError) {
      setError("No active booking found with the provided details. Please verify your reference number.");
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = CATEGORIES[bookingType] || CATEGORIES.hotel;

  return (
    <div className="fetch-redesign-container">
      <div className="fetch-redesign-shell">
        {/* Left Section: Category Navigation, Dynamic Image, Value-Add Guide, and Benefits [PNB/USER/UI_006] */}
        <div className="fetch-redesign-left h-full flex flex-col justify-between">
          {/* Top Curved Arc Navigation Panel */}
          <div className="left-arc-header">
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
                  onClick={() => {
                    setBookingType(cat.id);
                    if (error) setError("");
                  }}
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

          {/* Dynamic visual preview area [PNB/USER/UI_006] */}
          <div className="left-visual-preview flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <img
              src="/assets/images/fetch-ticket-illustration.svg"
              alt="Fetch Ticket"
              className="w-56 h-auto object-contain my-auto"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = currentCategory.image;
              }}
            />
            <div className="visual-overlay-content mt-2 text-center">
              <h3>{currentCategory.title}</h3>
              <div className="red-accent-bar mx-auto" />
            </div>
          </div>

          {/* Value-Add Section: Need help finding your booking ID? [PNB/USER/UI_006] */}
          <div className="left-help-card p-3.5 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle size={15} />
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              <strong className="text-slate-800 block text-xs font-bold mb-0.5">
                Need help finding your booking ID?
              </strong>
              <span>
                Check your booking SMS or confirmation email. {bookingType === "hotel" ? "Hotel references start with HT-." : bookingType === "bus" ? "Bus tickets start with BS-." : "Flight PNRs are 6 alphanumeric characters."}
              </span>
            </div>
          </div>

          {/* Bottom Benefits Row */}
          <div className="left-benefits-footer">
            <div className="benefit-item">
              <div className="benefit-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="benefit-text">
                <strong>Secure &amp; Safe</strong>
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
                <span>We're here for you anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Standardized Form [PNB/USER/BOOKING_001, BOOKING_003, BOOKING_005, UI_007] */}
        <div className="fetch-redesign-right">
          <div className="fetch-right-header">
            <div className="fetch-ticket-icon-box">
              <Ticket size={22} color="#ff0000" />
            </div>
            <h2>Fetch your booking</h2>
          </div>

          <p className="fetch-right-subtitle">
            Enter the contact details used when booking.<br />
            We'll bring all your bookings together in one place.
          </p>

          <hr className="fetch-right-divider" />

          <form onSubmit={handleFetchBooking} className="fetch-right-form space-y-4">
            {/* Helper Notice for Mandatory Fields [PNB/USER/BOOKING_001] */}
            <div className="text-xs text-slate-500 font-medium -mt-1">
              * Required fields to locate your reservation (or provide Booking Reference).
            </div>

            {/* Mobile Number Field [PNB/USER/BOOKING_001, BOOKING_003, UI_007] */}
            <div className="fetch-input-group">
              <label htmlFor="fetch-mobile-input" className="flex items-center text-sm font-bold text-slate-900">
                <span>Mobile number</span>
                <span className="text-red-500 ml-1 font-bold" style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="fetch-input-field-wrap relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  id="fetch-mobile-input"
                  type="tel"
                  value={mobile}
                  onChange={handleMobileChange}
                  onBlur={handleMobileBlur}
                  placeholder="+91 98765 43210 or 10-digit mobile number"
                  className={`fetch-input-field h-11 md:h-12 w-full rounded-lg border pl-11 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none transition-all ${
                    mobileError ? "border-red-500 bg-red-50/30" : "border-slate-300 focus:border-rose-500"
                  }`}
                  disabled={loading}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Enter the mobile number registered at the time of booking.
              </div>
              {mobileError && (
                <div className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <span>⚠️</span> {mobileError}
                </div>
              )}
            </div>

            {/* Email Address Field [PNB/USER/BOOKING_001, UI_007] */}
            <div className="fetch-input-group">
              <label htmlFor="fetch-email-input" className="flex items-center text-sm font-bold text-slate-900">
                <span>Email address</span>
                <span className="text-red-500 ml-1 font-bold" style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="fetch-input-field-wrap relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="fetch-email-input"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="Enter your email address"
                  className={`fetch-input-field h-11 md:h-12 w-full rounded-lg border pl-11 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none transition-all ${
                    emailError ? "border-red-500 bg-red-50/30" : "border-slate-300 focus:border-rose-500"
                  }`}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <div className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <span>⚠️</span> {emailError}
                </div>
              )}
            </div>

            {/* Dynamic Booking Reference Field [PNB/HOTEL/BOOKING_005, UI_007] */}
            <div className="fetch-input-group">
              <label htmlFor="fetch-ref-input" className="flex items-center text-sm font-bold text-slate-900">
                <span>{refConfig.label}</span>
                <span className="text-slate-400 font-normal text-xs ml-1.5">(Optional)</span>
              </label>
              <div className="fetch-input-field-wrap relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Ticket size={18} />
                </div>
                <input
                  id="fetch-ref-input"
                  type="text"
                  value={bookingReference}
                  onChange={(e) => {
                    setBookingReference(e.target.value.trim());
                    if (error) setError("");
                  }}
                  placeholder={refConfig.placeholder}
                  className="fetch-input-field h-11 md:h-12 w-full rounded-lg border border-slate-300 focus:border-rose-500 pl-11 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {refConfig.helper}
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

            {/* Standardized Submit Button [PNB/USER/UI_007] */}
            <button
              type="submit"
              className="fetch-main-submit-btn w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl mt-6 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>FETCHING TICKET...</span>
                </>
              ) : (
                <>
                  <span>Fetch all bookings</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Active Ticket Card Summary with Quick Actions */}
            {foundTicket && (
              <div className="found-ticket-card p-5 mt-6 bg-white border border-slate-200 rounded-2xl shadow-md text-left">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                      {foundTicket.bookingType || "Booking"}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {foundTicket.bookingReference || foundTicket.pnr || "Active Ticket"}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {foundTicket.status || "Confirmed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400 font-medium">Passenger</span>
                    <strong className="text-slate-800 text-xs font-semibold">
                      {foundTicket.passengers?.[0]?.name || foundTicket.guestName || "Primary Passenger"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">From / Hotel</span>
                    <strong className="text-slate-800 text-xs font-semibold">
                      {foundTicket.fromCity || foundTicket.hotelName || "--"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">To / Destination</span>
                    <strong className="text-slate-800 text-xs font-semibold">
                      {foundTicket.toCity || foundTicket.city || "--"}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    className="flex-1 min-h-[42px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => {
                      navigate("/print-ticket", {
                        state: {
                          pnr: foundTicket.bookingReference || foundTicket.pnr,
                          bookingReference: foundTicket.bookingReference || foundTicket.pnr,
                          ticket: foundTicket,
                          tickets: foundTicketsList,
                          autoDownload: true,
                        },
                      });
                    }}
                  >
                    <Download size={15} />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    className="flex-1 min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => {
                      navigate("/print-ticket", {
                        state: {
                          pnr: foundTicket.bookingReference || foundTicket.pnr,
                          bookingReference: foundTicket.bookingReference || foundTicket.pnr,
                          ticket: foundTicket,
                          tickets: foundTicketsList,
                        },
                      });
                    }}
                  >
                    <Ticket size={15} />
                    <span>Print Ticket</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default FetchTicket;
