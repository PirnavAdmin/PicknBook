import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Printer, Ticket } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { sendBookingNotifications } from "../../services/bookingNotificationsService";
import apsrtcLogo from "../../assets/images/buses/apsrtc-logo.svg";
import gsrtcLogo from "../../assets/images/buses/gsrtc-logo.svg";
import keralaRtcLogo from "../../assets/images/buses/kerala-rtc-logo.svg";
import ksrtcLogo from "../../assets/images/buses/ksrtc-logo.svg";
import tgsrtcLogo from "../../assets/images/buses/tgsrtc-logo.svg";
import privatePrimeLogo from "../../assets/images/buses/private-prime-logo.svg";
import privateRoyalLogo from "../../assets/images/buses/private-royal-logo.svg";
import privateSkylineLogo from "../../assets/images/buses/private-skyline-logo.svg";
import rtcBusLogo from "../../assets/images/buses/rtc-bus-logo.svg";
import {
  readLatestStoredTicket,
  upsertStoredTicket,
  writeLatestStoredTicket,
} from "../../utils/ticketStorage";
import "../../STYLES/TicketConfirmation.css";

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`;
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAirportCode(city) {
  const c = String(city || "").trim().toLowerCase();
  if (c.includes("delhi")) return "DEL";
  if (c.includes("mumbai")) return "BOM";
  if (c.includes("bangalore") || c.includes("bengaluru")) return "BLR";
  if (c.includes("hyderabad")) return "HYD";
  if (c.includes("chennai")) return "MAA";
  if (c.includes("kolkata")) return "CCU";
  if (c.includes("goa")) return "GOI";
  if (c.includes("kochi")) return "COK";
  if (c.includes("pune")) return "PNQ";
  if (c.includes("ahmedabad")) return "AMD";
  return c.slice(0, 3).toUpperCase();
}

function resolveStatus(value, fallback) {
  const normalized = String(value || fallback || "queued").toLowerCase();

  if (normalized.includes("deliver")) {
    return "Delivered";
  }

  if (normalized.includes("sent")) {
    return "Sent";
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return "Failed";
  }

  if (normalized.includes("skip")) {
    return "Skipped";
  }

  return "Queued";
}

function resolvePartnerLogo(ticketType, providerName) {
  const name = String(providerName || "").toLowerCase();

  if (name.includes("apsrtc")) {
    return { src: apsrtcLogo, alt: "APSRTC" };
  }

  if (name.includes("gsrtc")) {
    return { src: gsrtcLogo, alt: "GSRTC" };
  }

  if (name.includes("kerala")) {
    return { src: keralaRtcLogo, alt: "Kerala RTC" };
  }

  if (name.includes("ksrtc")) {
    return { src: ksrtcLogo, alt: "KSRTC" };
  }

  if (name.includes("tgsrtc")) {
    return { src: tgsrtcLogo, alt: "TGSRTC" };
  }

  if (name.includes("prime")) {
    return { src: privatePrimeLogo, alt: "Prime Travels" };
  }

  if (name.includes("royal")) {
    return { src: privateRoyalLogo, alt: "Royal Travels" };
  }

  if (name.includes("skyline")) {
    return { src: privateSkylineLogo, alt: "Skyline Travels" };
  }

  return { src: rtcBusLogo, alt: "Bus Partner" };
}

export default function TicketConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketCardRef = useRef(null);

  const incomingTicket =
    location.state && typeof location.state === "object" ? location.state : null;

  const [ticket, setTicket] = useState(
    () => incomingTicket || readLatestStoredTicket()
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDispatchingNotifications, setIsDispatchingNotifications] = useState(false);

  useEffect(() => {
    if (incomingTicket) {
      writeLatestStoredTicket(incomingTicket);
      upsertStoredTicket(incomingTicket);
      setTicket(incomingTicket);
    }
  }, [incomingTicket]);

  useEffect(() => {
    if (!ticket) {
      return;
    }

    const ticketType = String(ticket.ticketType || "").trim().toLowerCase();
    if (ticketType !== "bus") {
      return;
    }

    const bookingReference = String(
      ticket.bookingReference || ticket.pnr || ticket.reference || ""
    ).trim();

    if (!bookingReference) {
      return;
    }

    navigate("/print-ticket", {
      replace: true,
      state: {
        pnr: bookingReference,
        mobile: String(ticket.contact?.mobile || "").trim(),
        email: String(ticket.contact?.email || "").trim(),
        bookingType: "bus",
        ticket: {
          ...ticket,
          bookingReference,
          ticketType: "bus",
        },
      },
    });
  }, [navigate, ticket]);

  const passengers = useMemo(
    () => (Array.isArray(ticket?.passengers) ? ticket.passengers : []),
    [ticket]
  );

  const seats = useMemo(
    () => (Array.isArray(ticket?.seats) ? ticket.seats : []),
    [ticket]
  );

  const fare = ticket?.fare || {};
  const totalPaid = Number(ticket?.totalPaid ?? fare.totalFare ?? 0);
  const partnerLogo = useMemo(
    () => resolvePartnerLogo(ticket?.ticketType, ticket?.providerName),
    [ticket?.ticketType, ticket?.providerName]
  );

  const notifications = {
    email: resolveStatus(
      ticket?.notifications?.email,
      ticket?.contact?.email ? "queued" : "skipped"
    ),
    sms: resolveStatus(
      ticket?.notifications?.sms,
      ticket?.contact?.mobile ? "queued" : "skipped"
    ),
    whatsapp: resolveStatus(
      ticket?.notifications?.whatsapp,
      ticket?.contact?.whatsappUpdates ? "queued" : "skipped"
    ),
  };

  const handleOpenPrintFormat = () => {
    if (!ticket) {
      return;
    }

    const bookingReference = String(
      ticket.bookingReference || ticket.pnr || ticket.reference || ""
    ).trim();
    const bookingType = "bus";

    if (!bookingReference) {
      window.print();
      return;
    }

    navigate("/print-ticket", {
      state: {
        pnr: bookingReference,
        mobile: String(ticket.contact?.mobile || "").trim(),
        email: String(ticket.contact?.email || "").trim(),
        bookingType,
        ticket: {
          ...ticket,
          bookingReference,
          ticketType: bookingType,
        },
      },
    });
  };

  const handleDownloadPdf = async () => {
    if (!ticket || !ticketCardRef.current || isDownloadingPdf) {
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const canvas = await html2canvas(ticketCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imageData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 6;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;

      let heightLeft = imageHeight;
      let positionY = margin;

      doc.addImage(
        imageData,
        "PNG",
        margin,
        positionY,
        printableWidth,
        imageHeight,
        undefined,
        "FAST"
      );

      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        positionY = margin - (imageHeight - heightLeft);
        doc.addPage();
        doc.addImage(
          imageData,
          "PNG",
          margin,
          positionY,
          printableWidth,
          imageHeight,
          undefined,
          "FAST"
        );
        heightLeft -= printableHeight;
      }

      const safeReference = String(ticket.bookingReference || "ticket")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 40);

      doc.save(`${safeReference}.pdf`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!ticket || isDispatchingNotifications) {
      return;
    }

    setIsDispatchingNotifications(true);

    try {
      const notificationStatus = await sendBookingNotifications({
        bookingReference: ticket.bookingReference,
        ticketType: ticket.ticketType,
        providerName: ticket.providerName,
        fromCity: ticket.fromCity,
        toCity: ticket.toCity,
        departureTime: ticket.departureTime || ticket.departureDateTime,
        contact: ticket.contact,
        preferClientDispatch: true,
      });

      setTicket((previous) => {
        const next = { ...previous, notifications: notificationStatus };
        writeLatestStoredTicket(next);
        upsertStoredTicket(next);
        return next;
      });
    } finally {
      setIsDispatchingNotifications(false);
    }
  };

  if (!ticket) {
    return (
      <main className="ticket-confirmation-page">
        <div className="ticket-shell">
          <section className="ticket-empty">
            <h2>Ticket information not found</h2>
            <p>Complete a booking to view and download your ticket confirmation.</p>
            <button type="button" onClick={() => navigate("/")}>Home</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ticket-confirmation-page">
      <div className="ticket-shell">
        <section className="ticket-banner">
          <CheckCircle2 size={24} />
          <div>
            <h1>Ticket Confirmed</h1>
            <p>Your booking is successful. You can download or print this ticket below.</p>
          </div>
        </section>

        <article className="ticket-card" id="ticket-card" ref={ticketCardRef}>
          {/* Header row containing the boarding passes stacked */}
          {ticket.ticketType === "flight" && (
            <div className="boarding-passes-stack">
              {passengers.map((passenger, index) => {
                const passengerSeat = passenger.seat || seats[index] || "--";
                return (
                  <div key={index} className="real-boarding-pass">
                    {/* Main Pass (Left) */}
                    <div className="pass-main">
                      <div className="pass-top-band">
                        <div className="pass-airline">
                          <img
                            src={partnerLogo.src}
                            alt={partnerLogo.alt}
                            className="pass-logo-img"
                          />
                          <span className="pass-airline-name">{ticket.providerName || "Airline"}</span>
                        </div>
                        <div className="pass-title-text">BOARDING PASS</div>
                        <div className="pass-class-badge">{ticket.travelClass || "ECONOMY"}</div>
                      </div>

                      <div className="pass-flight-route">
                        <div className="airport-block">
                          <span className="airport-iata">{getAirportCode(ticket.fromCity)}</span>
                          <span className="airport-name">{ticket.fromCity || "--"}</span>
                        </div>
                        <div className="airport-connector-arrow">
                          <div className="dot"></div>
                          <span className="airplane-icon">✈</span>
                          <div className="dot"></div>
                        </div>
                        <div className="airport-block dest">
                          <span className="airport-iata">{getAirportCode(ticket.toCity)}</span>
                          <span className="airport-name">{ticket.toCity || "--"}</span>
                        </div>
                      </div>

                      <div className="pass-details-row">
                        <div className="detail-item">
                          <span className="detail-lbl">PASSENGER NAME</span>
                          <span className="detail-val">{passenger.name || passenger.fullName || `Passenger ${index + 1}`}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-lbl">FLIGHT</span>
                          <span className="detail-val">{ticket.tripNumber || "--"}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-lbl">DATE</span>
                          <span className="detail-val">
                            {(() => {
                              const depTime = ticket.departureTime || ticket.departureDateTime || "";
                              const match = depTime.match(/^\d+\s+[A-Za-z]+\s+\d+/);
                              return match ? match[0] : depTime.split(",")[0] || "--";
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="pass-details-row highlight-row">
                        <div className="detail-item">
                          <span className="detail-lbl">SEAT</span>
                          <span className="detail-val seat-glow">{passengerSeat}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-lbl">GATE</span>
                          <span className="detail-val">12A</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-lbl">BOARDING TIME</span>
                          <span className="detail-val highlight-val">
                            {(() => {
                              const depTime = ticket.departureTime || ticket.departureDateTime || "";
                              const timeMatch = depTime.match(/\d+:\d+\s*(?:AM|PM|am|pm)/);
                              if (timeMatch) {
                                return `${timeMatch[0]} (Boarding: 40m prior)`;
                              }
                              return "35 Min Prior";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Perforation Separation */}
                    <div className="pass-perforation">
                      <div className="notch top"></div>
                      <div className="line"></div>
                      <div className="notch bottom"></div>
                    </div>

                    {/* Stub Pass (Right) */}
                    <div className="pass-stub">
                      <div className="stub-top-band">
                        <span className="stub-airline-name">{ticket.providerName || "Airline"}</span>
                        <span className="stub-class">{ticket.travelClass || "ECONOMY"}</span>
                      </div>

                      <div className="stub-route">
                        <span className="iata-stub">{getAirportCode(ticket.fromCity)}</span>
                        <span className="arrow-stub">➔</span>
                        <span className="iata-stub">{getAirportCode(ticket.toCity)}</span>
                      </div>

                      <div className="stub-details">
                        <div className="stub-detail-item">
                          <span className="detail-lbl">PASSENGER</span>
                          <span className="stub-passenger-name">{passenger.name || passenger.fullName || `Passenger ${index + 1}`}</span>
                        </div>
                        <div className="stub-detail-grid">
                          <div className="stub-detail-item">
                            <span className="detail-lbl">FLIGHT</span>
                            <span className="detail-val-stub">{ticket.tripNumber || "--"}</span>
                          </div>
                          <div className="stub-detail-item">
                            <span className="detail-lbl">SEAT</span>
                            <span className="detail-val-stub seat-glow">{passengerSeat}</span>
                          </div>
                        </div>
                      </div>

                      <div className="stub-barcode-area">
                        <svg className="barcode-svg" viewBox="0 0 100 36">
                          <rect x="2" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="6" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="9" y="2" width="3" height="32" fill="currentColor"/>
                          <rect x="14" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="17" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="21" y="2" width="4" height="32" fill="currentColor"/>
                          <rect x="27" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="30" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="34" y="2" width="3" height="32" fill="currentColor"/>
                          <rect x="39" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="42" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="46" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="49" y="2" width="4" height="32" fill="currentColor"/>
                          <rect x="55" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="59" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="62" y="2" width="3" height="32" fill="currentColor"/>
                          <rect x="67" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="70" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="74" y="2" width="4" height="32" fill="currentColor"/>
                          <rect x="80" y="2" width="1" height="32" fill="currentColor"/>
                          <rect x="83" y="2" width="2" height="32" fill="currentColor"/>
                          <rect x="87" y="2" width="3" height="32" fill="currentColor"/>
                          <rect x="92" y="2" width="1" height="32" fill="currentColor"/>
                        </svg>
                        <span className="barcode-ref-code">{ticket.bookingReference}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback header for Bus/Hotels or if not Flight */}
          {ticket.ticketType !== "flight" && (
            <header className="ticket-card-head">
              <div className="ticket-head-brand">
                <img
                  src={partnerLogo.src}
                  alt={partnerLogo.alt}
                  className="ticket-partner-logo"
                />
                <div>
                  <h2>{ticket.providerName || "Travel"} Ticket</h2>
                  <p>Reference: {ticket.bookingReference || "--"}</p>
                </div>
              </div>
              <span className="ticket-badge">{ticket.ticketType || "Travel"}</span>
            </header>
          )}

          <div className="ticket-card-body">
            {/* Show traditional details sections as receipt below boarding passes */}
            {ticket.ticketType !== "flight" && (
              <section className="ticket-grid">
                <article>
                  <span>Route</span>
                  <strong>
                    {ticket.fromCity || "--"} to {ticket.toCity || "--"}
                  </strong>
                  <p>{ticket.tripNumber || "--"}</p>
                </article>

                <article>
                  <span>Departure</span>
                  <strong>{ticket.departureTime || ticket.departureDateTime || "--"}</strong>
                  <p>Arrival: {ticket.arrivalTime || "--"}</p>
                </article>

                <article>
                  <span>Status</span>
                  <strong>{ticket.status || "Booked"}</strong>
                  <p>Booked at {formatDateTime(ticket.bookedAt)}</p>
                </article>
              </section>
            )}

            {/* Rest of the panels for Passengers, Contact, Fare breakup */}
            <section className="ticket-panel">
              <h3>Passengers</h3>
              <ul className="ticket-list">
                {passengers.length === 0 ? (
                  <li>
                    <span>No passenger data</span>
                  </li>
                ) : (
                  passengers.map((passenger, index) => (
                    <li key={`${passenger.name || passenger.fullName || "passenger"}-${index}`}>
                      <span>
                        {passenger.name || passenger.fullName || `Passenger ${index + 1}`} - {" "}
                        {passenger.passengerType || "Adult"}
                      </span>
                      <strong>{passenger.seat ? `Seat ${passenger.seat}` : "--"}</strong>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="ticket-panel">
              <h3>Contact and Delivery</h3>
              <ul className="ticket-list">
                <li>
                  <span>Seats</span>
                  <strong>{seats.length > 0 ? seats.join(", ") : "--"}</strong>
                </li>
                <li>
                  <span>Email</span>
                  <strong>{ticket.contact?.email || "--"}</strong>
                </li>
                <li>
                  <span>Mobile</span>
                  <strong>{ticket.contact?.mobile || "--"}</strong>
                </li>
                <li>
                  <span>WhatsApp</span>
                  <strong>
                    {ticket.contact?.whatsappUpdates
                      ? ticket.contact?.whatsappNumber || ticket.contact?.mobile || "--"
                      : "Not selected"}
                  </strong>
                </li>
                <li>
                  <span>Payment Method</span>
                  <strong>{ticket.paymentMethod || "--"}</strong>
                </li>
              </ul>
            </section>

            <section className="ticket-panel">
              <h3>Confirmation Delivery Status</h3>
              <ul className="ticket-list">
                <li>
                  <span>Email Confirmation</span>
                  <strong>{notifications.email}</strong>
                </li>
                <li>
                  <span>SMS Confirmation</span>
                  <strong>{notifications.sms}</strong>
                </li>
                <li>
                  <span>WhatsApp Confirmation</span>
                  <strong>{notifications.whatsapp}</strong>
                </li>
              </ul>
            </section>

            <section className="ticket-fare">
              <div>
                <span>Base Fare</span>
                <strong>{formatCurrency(fare.baseFare)}</strong>
              </div>
              <div>
                <span>Taxes</span>
                <strong>{formatCurrency(fare.tax || fare.taxes || 0)}</strong>
              </div>
              <div>
                <span>Convenience Fee</span>
                <strong>{formatCurrency(fare.convenienceFee || 0)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{formatCurrency(fare.discount || 0)}</strong>
              </div>
              <div className="total">
                <span>Total Paid</span>
                <strong>{formatCurrency(totalPaid)}</strong>
              </div>
            </section>
          </div>
        </article>

        <section className="ticket-actions">
          <button
            type="button"
            className="primary"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
          >
            <Download size={16} />
            <span>{isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleSendNotifications}
            disabled={isDispatchingNotifications}
          >
            <Ticket size={16} />
            <span>
              {isDispatchingNotifications
                ? "Sending Confirmations..."
                : "Send Email/SMS/WhatsApp"}
            </span>
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleOpenPrintFormat}
          >
            <Printer size={16} />
            <span>Print Ticket Format</span>
          </button>
          <button type="button" className="secondary" onClick={() => navigate("/")}>
            <Ticket size={16} />
            <span>Back to Home</span>
          </button>
        </section>
      </div>
    </main>
  );
}
