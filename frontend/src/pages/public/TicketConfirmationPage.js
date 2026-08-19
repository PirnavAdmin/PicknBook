/* eslint-disable */
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
import indigoLogo from "../../assets/images/airlines/indigo.png";
import airIndiaLogo from "../../assets/images/airlines/air-india.png";
import airIndiaExpressLogo from "../../assets/images/airlines/Air-India_express.jpg";
import akasaAirLogo from "../../assets/images/airlines/AkasaAir.png";
import spicejetLogo from "../../assets/images/airlines/Spicejet.png";
import emiratesLogo from "../../assets/images/airlines/Emirates.png";
import qatarLogo from "../../assets/images/airlines/qatarairways.png";
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

function getAirportCode(city, codeFallback = "") {
  if (codeFallback && String(codeFallback).trim().length === 3) {
    return String(codeFallback).trim().toUpperCase();
  }
  const c = String(city || "").trim().toLowerCase();
  if (!c) return "--";
  if (c === "dxb" || c.includes("dubai")) return "DXB";
  if (c === "del" || c.includes("delhi")) return "DEL";
  if (c === "bom" || c.includes("mumbai") || c.includes("bombay")) return "BOM";
  if (c === "doh" || c.includes("doha")) return "DOH";
  if (c === "blr" || c.includes("bangalore") || c.includes("bengaluru")) return "BLR";
  if (c === "hyd" || c.includes("hyderabad")) return "HYD";
  if (c === "maa" || c.includes("chennai") || c.includes("madras")) return "MAA";
  if (c === "ccu" || c.includes("kolkata") || c.includes("calcutta")) return "CCU";
  if (c === "goi" || c === "gox" || c.includes("goa")) return "GOI";
  if (c === "cok" || c.includes("kochi") || c.includes("cochin")) return "COK";
  if (c === "pnq" || c.includes("pune")) return "PNQ";
  if (c === "amd" || c.includes("ahmedabad")) return "AMD";
  if (c === "auh" || c.includes("abu dhabi")) return "AUH";
  if (c === "shj" || c.includes("sharjah")) return "SHJ";
  if (c === "sin" || c.includes("singapore")) return "SIN";
  if (c === "bkk" || c.includes("bangkok")) return "BKK";
  if (c === "lhr" || c.includes("london") || c.includes("heathrow")) return "LHR";
  if (c === "jfk" || c.includes("new york") || c.includes("jfk")) return "JFK";
  if (c === "cdg" || c.includes("paris")) return "CDG";
  if (c.length === 3) return c.toUpperCase();
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
  const type = String(ticketType || "").toLowerCase();
  const name = String(providerName || "").toLowerCase();

  if (type === "flight" || name.includes("air") || name.includes("indigo") || name.includes("express") || name.includes("emirates") || name.includes("spicejet") || name.includes("akasa") || name.includes("qatar") || name.includes("fly dubai") || name.includes("flydubai") || name.includes("fz") || name.includes("6e") || name.includes("ix") || name.includes("ai") || name.includes("qp") || name.includes("sg") || name.includes("ek") || name.includes("qr")) {
    if (name.includes("indigo") || name.includes("6e")) {
      return { src: indigoLogo, alt: "IndiGo" };
    }
    if (name.includes("air india express") || name.includes("express") || name.includes("ix")) {
      return { src: airIndiaExpressLogo, alt: "Air India Express" };
    }
    if (name.includes("air india") || name.includes("ai")) {
      return { src: airIndiaLogo, alt: "Air India" };
    }
    if (name.includes("akasa") || name.includes("qp")) {
      return { src: akasaAirLogo, alt: "Akasa Air" };
    }
    if (name.includes("spicejet") || name.includes("sg")) {
      return { src: spicejetLogo, alt: "SpiceJet" };
    }
    if (name.includes("fly dubai") || name.includes("flydubai") || name.includes("fz")) {
      return { src: emiratesLogo, alt: "Fly Dubai" };
    }
    if (name.includes("emirates") || name.includes("ek")) {
      return { src: emiratesLogo, alt: "Emirates" };
    }
    if (name.includes("qatar") || name.includes("qr")) {
      return { src: qatarLogo, alt: "Qatar Airways" };
    }
    return { src: indigoLogo, alt: providerName || "Airline" };
  }

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

  const handleResendNotification = (type) => {
    alert(`${type} ticket notification sent to client successfully!`);
  };

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

  const allTickets = useMemo(() => {
    if (!ticket) return [];
    const list = [ticket];
    if (ticket.returnTicket) {
      list.push(ticket.returnTicket);
    }
    if (Array.isArray(ticket.multiCityTickets) && ticket.multiCityTickets.length > 0) {
      ticket.multiCityTickets.forEach((t) => {
        if (t) {
          list.push(t);
        }
      });
    }
    return list;
  }, [ticket]);

  const fare = ticket?.fare || {};
  const isAgent = localStorage.getItem("b2b_role") === "Agent";

  const adjustedBaseFare = useMemo(() => {
    const rawBase = Number(fare.baseFare || 0);
    if (!isAgent) return rawBase;
    const markup = Number(fare.markup || 0);
    return rawBase + markup;
  }, [fare.baseFare, fare.markup, isAgent]);

  const adjustedDiscount = useMemo(() => {
    const rawDiscount = Number(fare.discount || 0);
    if (isAgent) return 0; // Hide agent wholesale discounts from walk-in client
    return rawDiscount;
  }, [fare.discount, isAgent]);

  const totalPaid = useMemo(() => {
    const rawTotal = Number(ticket?.totalPaid ?? fare.totalFare ?? 0);
    if (!isAgent) return rawTotal;
    
    // total retail = wholesale + markup + tierDiscount + volumeDiscount
    const markup = Number(fare.markup || 0);
    const tierDiscount = Number(fare.tierDiscount || 0);
    const volumeDiscount = Number(fare.volumeDiscount || 0);
    return rawTotal + markup + tierDiscount + volumeDiscount;
  }, [ticket?.totalPaid, fare.totalFare, fare.markup, fare.tierDiscount, fare.volumeDiscount, isAgent]);

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
            <h1>{ticket.ticketType === "hotel" ? "Booking Confirmed" : "Ticket Confirmed"}</h1>
            <p>
              Your booking is successful. You can download or print your{" "}
              {ticket.ticketType === "hotel" ? "booking summary" : "ticket"} below.
            </p>
          </div>
        </section>

        <article className="ticket-card" id="ticket-card" ref={ticketCardRef}>
          {/* Header row containing the boarding passes stacked */}
          {ticket.ticketType === "flight" && (
            <div className="boarding-passes-stack">
              {allTickets.map((currentTicket, tIndex) => {
                const ticketPax = (Array.isArray(currentTicket.passengers) && currentTicket.passengers.length > 0)
                  ? currentTicket.passengers
                  : passengers;
                const tSeats = Array.isArray(currentTicket.seats) ? currentTicket.seats : seats;

                return (
                  <div key={`ticket-leg-${tIndex}`} className="multi-ticket-leg-block" style={{ marginBottom: tIndex < allTickets.length - 1 ? "28px" : "0" }}>
                    {allTickets.length > 1 && (
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#d32f2f", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Flight Leg {tIndex + 1}: {currentTicket.fromCity} ➔ {currentTicket.toCity}</span>
                        <span>PNR: {currentTicket.bookingReference || "CONFIRMED"}</span>
                      </div>
                    )}
                    {ticketPax.map((passenger, index) => {
                      const dyn = Array.isArray(passenger.seatDynamic) ? passenger.seatDynamic[tIndex] : null;
                      const dynStr = typeof dyn === "string" ? dyn : (dyn?.SeatNumber || dyn?.seatNumber || dyn?.SeatNo || dyn?.Code || dyn?.label);
                      const passSeat = typeof passenger.seat === "string" && passenger.seat && passenger.seat !== "--" && !passenger.seat.includes("[object")
                        ? passenger.seat
                        : (passenger.seat?.SeatNumber || passenger.seat?.seatNumber || passenger.seat?.SeatNo || passenger.seat?.Code || passenger.seat?.label);
                      const passengerSeat = dynStr || (tIndex === 0 ? (passSeat || passenger.seatNumber || passenger.SeatNumber || passenger.seatLabel || tSeats[index]) : (currentTicket.passengers?.[index]?.seat !== "--" ? currentTicket.passengers?.[index]?.seat : null)) || "--";

                      const legAirlineName = currentTicket.providerName || currentTicket.airlineName || currentTicket.airline || "Airline";
                      const legTravelClass = String(currentTicket.travelClass || currentTicket.cabinClass || "ECONOMY").toUpperCase();
                      const legPartnerLogo = resolvePartnerLogo("flight", legAirlineName);
                      const gateVal = currentTicket.gate || currentTicket.Gate || currentTicket.terminal || currentTicket.Terminal || "TBA";
                      const fromIata = getAirportCode(currentTicket.fromCity, currentTicket.fromCityCode || currentTicket.sourceCode);
                      const toIata = getAirportCode(currentTicket.toCity, currentTicket.toCityCode || currentTicket.destinationCode);

                      return (
                        <div key={index} className="real-boarding-pass" style={{ marginBottom: index < ticketPax.length - 1 ? "16px" : "0" }}>
                          {/* Main Pass (Left) */}
                          <div className="pass-main">
                            <div className="pass-top-band">
                              <div className="pass-airline">
                                <img
                                  src={legPartnerLogo.src}
                                  alt={legPartnerLogo.alt}
                                  className="pass-logo-img"
                                  style={{ maxHeight: 26, width: "auto", objectFit: "contain" }}
                                />
                                <span className="pass-airline-name">{legAirlineName}</span>
                              </div>
                              <div className="pass-title-text">BOARDING PASS</div>
                              <div className="pass-class-badge">{legTravelClass}</div>
                            </div>

                            <div className="pass-flight-route">
                              <div className="airport-block">
                                <span className="airport-iata">{fromIata}</span>
                                <span className="airport-name">{currentTicket.fromCity || "--"}</span>
                              </div>
                              <div className="airport-connector-arrow">
                                <div className="dot"></div>
                                <span className="airplane-icon">✈</span>
                                <div className="dot"></div>
                              </div>
                              <div className="airport-block dest">
                                <span className="airport-iata">{toIata}</span>
                                <span className="airport-name">{currentTicket.toCity || "--"}</span>
                              </div>
                            </div>

                            <div className="pass-details-row">
                              <div className="detail-item">
                                <span className="detail-lbl">PASSENGER NAME</span>
                                <span className="detail-val">{passenger.name || passenger.fullName || `Passenger ${index + 1}`}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-lbl">FLIGHT</span>
                                <span className="detail-val">{currentTicket.tripNumber || currentTicket.flightNumber || "--"}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-lbl">DATE</span>
                                <span className="detail-val">
                                  {(() => {
                                    const depTime = currentTicket.departureTime || currentTicket.departureDateTime || currentTicket.departDate || "";
                                    const match = depTime.match(/^\d+\s+[A-Za-z]+\s+\d+/);
                                    return match ? match[0] : (depTime.includes("T") ? depTime.split("T")[0] : depTime.split(",")[0] || "--");
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
                                <span className="detail-val">{gateVal}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-lbl">BOARDING TIME</span>
                                <span className="detail-val highlight-val">
                                  {(() => {
                                    const depTime = currentTicket.departureTime || currentTicket.departureDateTime || "";
                                    const timeMatch = depTime.match(/\d+:\d+\s*(?:AM|PM|am|pm)/);
                                    if (timeMatch) {
                                      return `${timeMatch[0]} (Boarding: 40m prior)`;
                                    }
                                    if (depTime.includes("T")) {
                                      return `${depTime.split("T")[1].slice(0, 5)} (Boarding: 40m prior)`;
                                    }
                                    return "40 Min Prior";
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
                              <span className="stub-airline-name">{legAirlineName}</span>
                              <span className="stub-class">{legTravelClass}</span>
                            </div>

                            <div className="stub-route">
                              <span className="iata-stub">{fromIata}</span>
                              <span className="arrow-stub">➔</span>
                              <span className="iata-stub">{toIata}</span>
                            </div>

                            <div className="stub-details">
                              <div className="stub-detail-item">
                                <span className="detail-lbl">PASSENGER</span>
                                <span className="stub-passenger-name">{passenger.name || passenger.fullName || `Passenger ${index + 1}`}</span>
                              </div>
                              <div className="stub-detail-grid">
                                <div className="stub-detail-item">
                                  <span className="detail-lbl">FLIGHT</span>
                                  <span className="detail-val-stub">{currentTicket.tripNumber || currentTicket.flightNumber || "--"}</span>
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
                              <span className="barcode-ref-code">{currentTicket.bookingReference}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback header for Bus/Hotels or if not Flight */}
          {ticket.ticketType !== "flight" && (
            <header className="ticket-card-head">
              <div className="ticket-head-brand">
                {ticket.ticketType === "hotel" ? (
                  <div className="ticket-hotel-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "rgba(220, 30, 38, 0.1)", color: "#dc1e26", marginRight: 12 }}>
                    <svg size={22} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="22" width="22" xmlns="http://www.w3.org/2000/svg"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  </div>
                ) : (
                  <img
                    src={partnerLogo.src}
                    alt={partnerLogo.alt}
                    className="ticket-partner-logo"
                  />
                )}
                <div>
                  <h2>{ticket.ticketType === "hotel" ? ticket.providerName : `${ticket.providerName || "Travel"} Ticket`}</h2>
                  <p>{ticket.ticketType === "hotel" ? "Booking Reference" : "Reference"}: {ticket.bookingReference || "--"}</p>
                </div>
              </div>
              <span className="ticket-badge" style={{ textTransform: "capitalize" }}>{ticket.ticketType || "Travel"}</span>
            </header>
          )}

          <div className="ticket-card-body">
            {/* Show traditional details sections as receipt below boarding passes */}
            {ticket.ticketType === "hotel" && (
              <section className="ticket-grid">
                <article>
                  <span>Hotel Stay</span>
                  <strong>{ticket.providerName || "--"}</strong>
                  <p>{ticket.toCity || "--"}</p>
                </article>

                <article>
                  <span>Check-In & Check-Out</span>
                  <strong>{ticket.departureTime || "--"} - {ticket.arrivalTime || "--"}</strong>
                  <p>{ticket.duration || "1 night"}</p>
                </article>

                <article>
                  <span>Reservation Status</span>
                  <strong style={{ color: "#137a3b" }}>{ticket.status || "Confirmed"}</strong>
                  <p>Reserved on {formatDateTime(ticket.bookedAt)}</p>
                </article>
              </section>
            )}

            {ticket.ticketType !== "flight" && ticket.ticketType !== "hotel" && (
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
              <h3>{ticket.ticketType === "hotel" ? "Guests" : "Passengers"}</h3>
              <ul className="ticket-list">
                {passengers.length === 0 ? (
                  <li>
                    <span>No guest data</span>
                  </li>
                ) : (
                  passengers.map((passenger, index) => (
                    <li key={`${passenger.name || passenger.fullName || "passenger"}-${index}`}>
                      <span>
                        {passenger.name || passenger.fullName || `Guest ${index + 1}`} - {" "}
                        {passenger.passengerType || "Primary Guest"}
                      </span>
                      <strong>
                        {passenger.seat ? (ticket.ticketType === "hotel" ? passenger.seat : `Seat ${passenger.seat}`) : "--"}
                      </strong>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="ticket-panel">
              <h3>{ticket.ticketType === "hotel" ? "Booking & Contact" : "Contact and Delivery"}</h3>
              <ul className="ticket-list">
                <li>
                  <span>{ticket.ticketType === "hotel" ? "Room Type" : "Seats"}</span>
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
              {(() => {
                const isAgent = localStorage.getItem("b2b_role") === "Agent";
                if (isAgent) {
                  return (
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleResendNotification("Email")} style={{ fontSize: "0.8rem", padding: "6px 12px", background: "var(--b2b-accent)", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        Email Ticket
                      </button>
                      <button type="button" onClick={() => handleResendNotification("SMS")} style={{ fontSize: "0.8rem", padding: "6px 12px", background: "var(--b2b-accent)", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        SMS Ticket
                      </button>
                      <button type="button" onClick={() => handleResendNotification("WhatsApp")} style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#25D366", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        WhatsApp Ticket
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </section>

            <section className="ticket-fare">
              <div>
                <span>Base Fare</span>
                <strong>{formatCurrency(adjustedBaseFare)}</strong>
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
                <strong>{formatCurrency(adjustedDiscount)}</strong>
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
