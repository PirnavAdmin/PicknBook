/* eslint-disable */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  User, 
  Phone, 
  Mail, 
  Ticket, 
  Info, 
  Home, 
  Printer 
} from "lucide-react";
import "../../STYLES/BookingConfirmation.css";

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN").format(Number(amount) || 0)}`;
}

export default function BookingConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state;

  if (!bookingData) {
    return (
      <div className="booking-confirmation-page">
        <div className="booking-conf-container conf-fallback">
          <div className="success-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
            <Info size={40} />
          </div>
          <h2>No Booking Details Found</h2>
          <p>We couldn't retrieve the details of your booking. Please try again or go back to home.</p>
          <div className="conf-actions">
            <button className="btn-primary" onClick={() => navigate("/")}>
              <Home size={18} />
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    bookingId,
    priceBreakdown = {},
    journeyDetails = {},
    passengers = [],
    contact = {}
  } = bookingData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="booking-confirmation-page">
      <div className="booking-conf-container">
        <div className="success-header">
          <div className="success-icon-wrapper">
            <CheckCircle2 size={40} />
          </div>
          <h1>Booking Successful!</h1>
          <p>Your bus seats have been successfully reserved.</p>
          <div className="booking-ref-badge">
            PNR / Reference: {bookingId || "N/A"}
          </div>
        </div>

        {/* Journey Details */}
        <section className="conf-section">
          <h2>
            <Ticket size={20} className="text-primary" />
            Journey & Bus Details
          </h2>
          <div className="journey-info-grid">
            <div className="journey-route-summary">
              <div className="route-city">
                <span className="name">{journeyDetails.fromCity}</span>
                <span className="time">{journeyDetails.departureTime}</span>
              </div>
              <div className="route-connector">
                <span className="connector-duration">{journeyDetails.duration || "Direct"}</span>
                <div className="connector-line"></div>
              </div>
              <div className="route-city" style={{ textAlign: "right" }}>
                <span className="name">{journeyDetails.toCity}</span>
                <span className="time">{journeyDetails.arrivalTime}</span>
              </div>
            </div>

            <div className="info-item">
              <span>Bus Operator</span>
              <strong>{journeyDetails.operatorName || "N/A"}</strong>
            </div>

            <div className="info-item">
              <span>Bus Number / Type</span>
              <strong>{journeyDetails.busNumber || "N/A"} ({journeyDetails.busType || "N/A"})</strong>
            </div>

            <div className="info-item">
              <span>Boarding Point</span>
              <strong>{journeyDetails.boardingPoint || "N/A"}</strong>
            </div>

            <div className="info-item">
              <span>Dropping Point</span>
              <strong>{journeyDetails.droppingPoint || "N/A"}</strong>
            </div>

            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <span>Booked Seats</span>
              <strong style={{ color: "var(--conf-primary)", fontSize: "1.05rem" }}>
                {journeyDetails.seatsBooked || "N/A"}
              </strong>
            </div>
          </div>
        </section>

        {/* Passenger details */}
        <section className="conf-section">
          <h2>
            <User size={20} className="text-primary" />
            Passenger Information
          </h2>
          <div className="passenger-list">
            {passengers.length > 0 ? (
              passengers.map((passenger, index) => (
                <div className="passenger-card" key={index}>
                  <div className="passenger-icon">
                    <User size={18} />
                  </div>
                  <div className="passenger-details">
                    <span className="name">
                      {passenger.title ? `${passenger.title}. ` : ""}
                      {passenger.firstName || passenger.fullName || `Passenger ${index + 1}`} {passenger.lastName || ""}{passenger.gender && ` (${passenger.gender[0].toUpperCase()})`}
                    </span>
                    <span className="meta">
                      Age: {passenger.age || "N/A"} | {passenger.gender || "N/A"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted" style={{ margin: 0 }}>No passenger information available.</p>
            )}
          </div>
        </section>

        {/* Contact details */}
        <section className="conf-section">
          <h2>
            <Phone size={20} className="text-primary" />
            Contact Information
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Mail size={16} className="text-muted" />
              <div className="info-item">
                <span>Email Address</span>
                <strong>{contact.email || "N/A"}</strong>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Phone size={16} className="text-muted" />
              <div className="info-item">
                <span>Mobile Number</span>
                <strong>{contact.phone || contact.mobile || "N/A"}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing breakdown */}
        <section className="conf-section">
          <h2>
            <span style={{ fontSize: "1.2rem", fontWeight: "700" }}>₹</span>
            Fare Breakup
          </h2>
          <div className="price-breakdown-list">
            <div className="price-row">
              <span>Base Fare (including GST & Fees)</span>
              <strong>{formatCurrency(priceBreakdown.basePrice)}</strong>
            </div>

            {Number(priceBreakdown.autoDiscount) > 0 && (
              <div className="price-row discount">
                <span>Auto Applied Discount</span>
                <strong>-{formatCurrency(priceBreakdown.autoDiscount)}</strong>
              </div>
            )}

            {Number(priceBreakdown.promoDiscount) > 0 && (
              <div className="price-row discount">
                <span>Promotion/Offer Applied</span>
                <strong>-{formatCurrency(priceBreakdown.promoDiscount)}</strong>
              </div>
            )}

            <div className="price-row total">
              <span>Total Paid</span>
              <strong>{formatCurrency(priceBreakdown.finalPrice)}</strong>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="conf-actions">
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={18} />
            Print Receipt
          </button>
          <button className="btn-primary" onClick={() => navigate("/")}>
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
