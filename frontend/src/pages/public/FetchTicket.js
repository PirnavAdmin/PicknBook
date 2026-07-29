/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BusFront,
  CalendarCheck,
  Clock3,
  Download,
  Mail,
  MapPinned,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import logo from "../../assets/images/illustrations/printticket.png";
import "../../STYLES/FetchTicket.css";
import { fetchTicketByContact } from "../../services/ticketService";

const TICKET_PROMOS = [
  { id: "active", icon: TicketCheck, title: "Active Tickets", text: "Find current bus bookings" },
  { id: "secure", icon: ShieldCheck, title: "Secure Lookup", text: "Matched with contact details" },
  { id: "quick", icon: Clock3, title: "Fast Access", text: "Open and print in seconds" },
  { id: "bus", icon: BusFront, title: "Bus Desk", text: "Route and passenger details" },
];

const TICKET_HELPERS = [
  { id: "route", icon: MapPinned, title: "Route Details", text: "Boarding, dropping and timing in one view" },
  { id: "receipt", icon: ReceiptText, title: "Booking Receipt", text: "Fare, passenger and operator details ready" },
  { id: "download", icon: Download, title: "Print Ready", text: "Open the ticket and download whenever needed" },
];

const TICKET_STEPS = [
  { id: "match", label: "Match contact", icon: Phone },
  { id: "verify", label: "Verify active ticket", icon: ShieldCheck },
  { id: "open", label: "Open printable copy", icon: TicketCheck },
];

const FetchTicket = () => {
  const navigate = useNavigate();
  const bookingType = "bus";
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
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
      nextError = nextError || "Email is required";
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
      // fetchTicketByContact now returns an array of tickets
      const resolvedTickets = await fetchTicketByContact({
        mobile: trimmedMobile,
        email: trimmedEmail,
        bookingType,
        activeOnly: true,
      });

      // resolvedTickets is always an array now
      const tickets = Array.isArray(resolvedTickets) ? resolvedTickets : [resolvedTickets];

      if (tickets.length === 0) {
        setError("No active booking found.");
        return;
      }

      // Validate at least the first ticket has a reference
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
          ticket: tickets[0],       // first ticket (for backwards compat)
          tickets: tickets,          // ALL tickets
        },
      });
    } catch (fetchError) {
      setError(fetchError.message || "No active booking found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fetch-ticket-page">
      <div className="fetch-ticket-shell">
        <section className="fetch-ticket-marquee" aria-label="Ticket lookup benefits">
          {[...TICKET_PROMOS, ...TICKET_PROMOS].map((item, index) => (
            <article className="fetch-ticket-marquee-item" key={`${item.id}-${index}`}>
              <span>
                <item.icon size={16} />
              </span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </article>
          ))}
        </section>

        <section className="fetch-ticket-card">
          <div className="fetch-ticket-visual">
            <div className="fetch-ticket-visual-copy">
              <span>Travel Desk</span>
              <strong>Your bus ticket is a click away</strong>
            </div>
            <img src={logo} alt="Fetch ticket" />
            <div className="fetch-ticket-visual-strip" aria-hidden="true">
              <span>PNR</span>
              <span>Seat</span>
              <span>Fare</span>
            </div>
          </div>

          <div className="fetch-ticket-form-wrap">
            <span className="fetch-ticket-kicker">Ticket Access</span>
            <h1>Fetch Ticket</h1>
            <p>Use the same mobile number and email used during booking.</p>

            <div className="fetch-ticket-mini-steps">
              <span><Phone size={14} /> Mobile</span>
              <span><Mail size={14} /> Email</span>
              <span><Search size={14} /> Match</span>
            </div>

            <form onSubmit={handleFetchBooking} className="fetch-ticket-form">
              <label htmlFor="fetch-ticket-mobile">Mobile Number</label>
              <div className="fetch-ticket-input-wrap">
                <Phone size={16} />
                <input
                  id="fetch-ticket-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(event) => {
                    setMobile(event.target.value.replace(/\D/g, "").slice(0, 15));
                    if (error) setError("");
                  }}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="Enter mobile number"
                  className={error.toLowerCase().includes("mobile") ? "input-error" : ""}
                  disabled={loading}
                />
              </div>

              <label htmlFor="fetch-ticket-email">Email</label>
              <div className="fetch-ticket-input-wrap">
                <Mail size={16} />
                <input
                  id="fetch-ticket-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter booking email"
                  className={error.toLowerCase().includes("email") ? "input-error" : ""}
                  disabled={loading}
                />
              </div>

              {error && <div className="fetch-ticket-error">{error}</div>}

              <button type="submit" className="fetch-ticket-submit" disabled={loading}>
                {loading ? "Fetching..." : "Fetch Booking"}
              </button>
            </form>
          </div>
        </section>

        <section className="fetch-ticket-info-grid" aria-label="Fetch ticket information">
          <article className="fetch-ticket-route-card">
            <div>
              <span className="fetch-ticket-pill"><BusFront size={15} /> Bus Ticket</span>
              <h2>Find active journeys from your booking contact</h2>
            </div>
            <div className="fetch-ticket-route-line" aria-hidden="true">
              <span>Booked</span>
              <i />
              <span>Verified</span>
              <i />
              <span>Printable</span>
            </div>
          </article>

          <article className="fetch-ticket-calendar-card">
            <CalendarCheck size={24} />
            <strong>Keep travel dates handy</strong>
            <span>Use the email and mobile number from your confirmed booking.</span>
          </article>

          <div className="fetch-ticket-helper-list">
            {TICKET_HELPERS.map((item) => (
              <article key={item.id} className="fetch-ticket-helper-card">
                <span>
                  <item.icon size={18} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="fetch-ticket-step-row" aria-label="Ticket lookup steps">
          {TICKET_STEPS.map((step) => (
            <article key={step.id}>
              <span><step.icon size={17} /></span>
              <strong>{step.label}</strong>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default FetchTicket;
