import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchTicketByContact } from "../../services/ticketService";
import "../../STYLES/PrintTicket.css";

const TICKET_TYPES = { BUS: "bus" };
const FALLBACK_STOP = "--";
const INDIA_TIME_ZONE = "Asia/Kolkata";

function normalizeRef(value) {
  return String(value || "").trim().toUpperCase();
}

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(Number(value) || 0)
  )}`;
}

function hasExplicitTimezone(value) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(value || "").trim());
}

function formatJourneyDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "--";

  const parsed = new Date(raw);
  if (hasExplicitTimezone(raw) && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // Backend IST strings are already display values, so avoid shifting them.
  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    const [year, month, day] = isoDateMatch[1].split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return raw;
}

function formatJourneyTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "--";

  const parsed = new Date(raw);
  if (hasExplicitTimezone(raw) && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // ✅ FIX: Extract time directly from ISO string BEFORE any Date conversion
  // This prevents UTC→local timezone shift (e.g. 15:30 becoming 21:00 or 30:00)
  const isoTimeMatch = raw.match(/T(\d{2}:\d{2})/);
  if (isoTimeMatch) return isoTimeMatch[1];

  // Already a plain time string like "15:30"
  const timeMatch = raw.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeMatch?.[1]) return timeMatch[1];

  // Last resort: parse as Date (may have timezone shift)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return raw;
}

function pickTicketField(ticket, keys, fallback = "") {
  if (!ticket || typeof ticket !== "object") return fallback;
  for (const key of keys) {
    if (ticket[key] !== undefined && ticket[key] !== null && ticket[key] !== "") {
      return ticket[key];
    }
  }
  return fallback;
}

function readPointName(value) {
  if (!value) return FALLBACK_STOP;

  if (typeof value === "object") {
    return String(
      pickTicketField(
        value,
        [
          "name",
          "Name",
          "pointName",
          "PointName",
          "boardingPoint",
          "BoardingPoint",
          "droppingPoint",
          "DroppingPoint",
          "location",
          "Location",
        ],
        FALLBACK_STOP
      ) || FALLBACK_STOP
    ).trim();
  }

  return String(value || FALLBACK_STOP).trim();
}

function getDepartureValue(ticket) {
  return pickTicketField(ticket, [
    "departureTimeIst",
    "DepartureTimeIst",
    "departureTime",
    "DepartureTime",
    "departureDateTime",
    "DepartureDateTime",
    "journeyDateTime",
    "JourneyDateTime",
    "journeyDate",
    "JourneyDate",
    "departureTimeUtc",
    "DepartureTimeUtc",
  ]);
}

function getArrivalValue(ticket) {
  return pickTicketField(ticket, [
    "arrivalTimeIst",
    "ArrivalTimeIst",
    "arrivalTime",
    "ArrivalTime",
    "arrivalDateTime",
    "ArrivalDateTime",
    "dropTime",
    "DropTime",
    "droppingTime",
    "DroppingTime",
    "arrivalTimeUtc",
    "ArrivalTimeUtc",
  ]);
}

function normalizePassengers(ticket) {
  const seats = Array.isArray(ticket?.seats) ? ticket.seats : [];
  const passengers = Array.isArray(ticket?.passengers) ? ticket.passengers : [];
  const source =
    passengers.length > 0
      ? passengers
      : seats.map((seat, index) => ({ name: `Passenger ${index + 1}`, seat }));

  return source.map((p, index) => ({
    name: String(p?.name || p?.fullName || `Passenger ${index + 1}`).trim(),
    detail: String(p?.age || p?.passengerType || "").trim(),
    seat: String(p?.seat || p?.seatLabel || p?.seatNumber || seats[index] || "--").trim(),
    meal: String(p?.meal || "--").trim(),
  }));
}

function parseDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;

  const date = new Date();
  date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return date;
}

function computeDuration(departureTime, arrivalTime) {
  if (!departureTime || !arrivalTime) return "--";
  const dep = parseDateTime(departureTime);
  const arr = parseDateTime(arrivalTime);
  if (!dep || !arr || Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) return "--";
  let diffMs = arr - dep;
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }
  if (diffMs <= 0) return "--";
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function isOvernightJourney(departureTime, arrivalTime) {
  const dep = parseDateTime(departureTime);
  const arr = parseDateTime(arrivalTime);

  if (!dep || !arr || Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
    return false;
  }

  return arr < dep || arr.toDateString() !== dep.toDateString();
}

function mapTicketToBus(ticket, fallbackPnr) {
  const departureValue = getDepartureValue(ticket);
  const arrivalValue = getArrivalValue(ticket);
  const passengers = normalizePassengers(ticket).map((p) => ({
    name: p.name,
    age: p.detail || "--",
    seat: p.seat || "--",
  }));

  // ✅ FIX: boardingPoint and droppingPoint come as objects from backend
  const boardingStop = readPointName(
    pickTicketField(ticket, ["boardingPoint", "BoardingPoint", "boarding", "Boarding"], "")
  );

  const droppingStop = readPointName(
    pickTicketField(ticket, ["droppingPoint", "DroppingPoint", "arrivalPlace", "ArrivalPlace", "dropping", "Dropping"], "")
  );

  const operator = String(
    pickTicketField(
      ticket,
      ["providerName", "ProviderName", "operatorName", "OperatorName", "operator", "Operator"],
      "Bus Service"
    ) || "Bus Service"
  ).trim();
  const busNo = String(
    pickTicketField(
      ticket,
      ["tripNumber", "TripNumber", "busNumber", "BusNumber", "busNo", "BusNo"],
      "--"
    ) || "--"
  ).trim();
  const pnr = String(ticket?.bookingReference || ticket?.pnr || fallbackPnr || "--").trim();
  const totalFare = ticket?.totalPaid ?? ticket?.totalFare ?? ticket?.fare?.totalFare ?? 0;

  return {
    type: "bus",
    pnr,
    operator,
    busNo,
    from: {
      city: String(ticket?.fromCity || "--").trim() || "--",
      stop: boardingStop,
    },
    to: {
      city: String(ticket?.toCity || "--").trim() || "--",
      stop: droppingStop,
    },
    date: formatJourneyDate(departureValue),
    arrivalDate: formatJourneyDate(arrivalValue),
    departure: formatJourneyTime(departureValue),
    arrival: formatJourneyTime(arrivalValue),
    duration: String(ticket?.duration || computeDuration(departureValue, arrivalValue) || "--").trim(),
    journeyLabel: isOvernightJourney(departureValue, arrivalValue) ? "Overnight" : "Same Day",
    class: String(ticket?.busType || ticket?.className || ticket?.class || "--").trim(),
    passengers,
    status: String(ticket?.status || "Booked").toUpperCase(),
    fare: formatCurrency(totalFare),
  };
}

// ============ HELPER COMPONENTS ============

const QRCode = ({ text = 'GOB2024ABC', size = 64 }) => {
  const encoded = encodeURIComponent(text);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  return (
    <img src={src} width={size} height={size} alt="Ticket QR Code"
      style={{ display: 'block', borderRadius: 6, background: '#fff' }} />
  );
};

const HOME_THEME = {
  primary: '#dc1e26', primaryStrong: '#b8141b',
  text: '#1f2a44', textSoft: '#64748b',
};

const ticketShell = {
  background: '#ffffff', borderRadius: 28, overflow: 'hidden',
  boxShadow: '0 28px 60px rgba(13, 74, 83, 0.13)', border: '1px solid rgba(241, 217, 206, 0.95)',
  display: 'flex', flexDirection: 'column',
  width: '100%',
  height: 'var(--pb-ticket-height)',
  minHeight: 'var(--pb-ticket-min-height)',
};

const hdr = {
  minHeight: 58,
  color: '#fff', padding: '13px 24px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

// ============ FLIP CARD ============

const FlipCard = ({ frontElement, backElement }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div style={{ perspective: '1200px', cursor: 'pointer', position: 'relative', width: '100%' }}
      onClick={() => setIsFlipped(!isFlipped)} title="Click to flip">
      <style>{`
        .flip-container { position: relative; width: 100%; display: grid; align-items: stretch; transition: transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); transform-style: preserve-3d; transform: ${isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}; }
        .flip-front, .flip-back { backface-visibility: hidden; -webkit-backface-visibility: hidden; width: 100%; height: var(--pb-ticket-height); min-height: var(--pb-ticket-min-height); display: grid; grid-area: 1 / 1; }
        .flip-front > *, .flip-back > * { width: 100%; height: 100%; min-height: var(--pb-ticket-min-height); }
        .flip-back { transform: rotateY(180deg); }
      `}</style>
      <div className="flip-container">
        <div className="flip-front">{frontElement}</div>
        <div className="flip-back">{backElement}</div>
      </div>
    </div>
  );
};

// ============ BUS TICKET ============

const BusTicket = ({ data, id }) => (
  <article id={id} className="pb-ticket-card">
    <header className="pb-ticket-head">
      <div>
        <span>GoTravels - Ticket</span>
        <h2>{data.operator} - {data.busNo}</h2>
      </div>
      <strong>{data.status}</strong>
    </header>

    <div className="pb-ticket-body">
      <section className="pb-ticket-main">
        <div className="pb-route-row">
          <div>
            <h3>{data.from.city}</h3>
            <span>{data.from.stop}</span>
          </div>
          <div className="pb-route-line">
            <span>{data.duration}</span>
            <i />
            <small>{data.journeyLabel}</small>
          </div>
          <div>
            <h3>{data.to.city}</h3>
            <span>{data.to.stop}</span>
          </div>
        </div>

        <div className="pb-time-row">
          <div>
            <span>Departure</span>
            <strong>{data.departure}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{data.date}</strong>
          </div>
          <div>
            <span>Arrival</span>
            <strong>{data.arrival}</strong>
          </div>
          <div>
            <span>Arrival Date</span>
            <strong>{data.arrivalDate}</strong>
          </div>
        </div>

        <div className="pb-detail-grid">
          <div>
            <span>Bus Type</span>
            <strong>{data.class}</strong>
          </div>
          <div>
            <span>Boarding</span>
            <strong>{data.from.stop}</strong>
          </div>
          <div>
            <span>Arrival Place</span>
            <strong>{data.to.stop}</strong>
          </div>
          <div>
            <span>Total Fare</span>
            <strong>{data.fare}</strong>
          </div>
        </div>

        <div className="pb-pax-title">Passengers &amp; Seats</div>
        <div className="pb-passengers">
          {data.passengers.map((p, i) => (
            <div className="pb-passenger-row" key={`${p.name}-${p.seat}-${i}`}>
              <b>{i + 1}</b>
              <span>{p.name}{p.age && p.age !== "--" ? ` (${p.age})` : ""}</span>
              <small>Seat {p.seat}</small>
            </div>
          ))}
        </div>
      </section>

      <aside className="pb-ticket-stub">
        <div className="pb-stub-label">Ticket</div>
        <span>PNR</span>
        <strong>{data.pnr}</strong>
        <span>Fare</span>
        <b>{data.fare}</b>
        <QRCode
          text={[
            `Ticket Type: Bus`,
            `PNR: ${data.pnr}`,
            `Operator: ${data.operator}`,
            `Bus No: ${data.busNo}`,
            `From: ${data.from.city} (${data.from.stop})`,
            `To: ${data.to.city} (${data.to.stop})`,
            `Date: ${data.date}`,
            `Arrival Date: ${data.arrivalDate}`,
            `Departure: ${data.departure}`,
            `Arrival: ${data.arrival}`,
            `Passenger(s): ${data.passengers.map((p) => `${p.name} Seat ${p.seat}`).join(", ")}`,
            `Fare: ${data.fare}`,
          ].join("\n")}
          size={64}
        />
        <small>Show to conductor</small>
      </aside>
    </div>
  </article>
);

// ============ BACK SIDES ============

const BusBackSide = ({ id, ticket }) => {
  const fare = ticket?.fare || {};
  const discount = Number(fare.discount ?? fare.discountAmount ?? ticket?.discount ?? ticket?.discountAmount ?? 0);
  const tax = Number(fare.tax ?? fare.taxes ?? fare.gstAmount ?? ticket?.tax ?? ticket?.gstAmount ?? 0);
  const convenienceFee = Number(fare.convenienceFee ?? ticket?.convenienceFee ?? 0);
  const totalFare = Number(ticket?.totalPaid ?? ticket?.totalFare ?? fare.totalFare ?? 0);
  const baseFare = Number(fare.baseFare ?? ticket?.baseFare ?? (totalFare - convenienceFee - tax + discount));
  const gstPercent = Number(fare.gstPercent ?? ticket?.gstPercent ?? 0);
  const atlasGradient = 'linear-gradient(135deg, #b8141b 0%, #dc1e26 100%)';

  return (
    <div id={id} className="pb-ticket-card pb-ticket-back-card" style={ticketShell}>
      <div style={{ ...hdr, background: atlasGradient }}>
        <div style={{ fontSize: 14.5, fontWeight: 900, letterSpacing: 0, color: '#ffffff' }}>Bus Terms & Conditions</div>
      </div>
      <div style={{ display: 'flex', flex: 1, padding: 0 }}>
        {/* Left Column: Terms */}
        <div style={{ flex: 1.1, padding: '22px 28px', borderRight: '1px dashed #d8dee8' }}>
          {[
            { title: '1. BOARDING & TIMING', items: ['Report 30 minutes before departure', 'Valid photo ID required', 'No entry after departure time'] },
            { title: '2. LUGGAGE POLICY', items: ['Complimentary: 20kg', 'Excess: INR 100 per kg', 'No bulky items allowed'] },
            { title: '3. CANCELLATION TERMS', items: ['Cancel 12+ hours: 100% refund', 'Cancel 6-12 hours: 75% refund', 'Cancel <6 hours: 50% refund'] },
          ].map(({ title, items }) => (
            <div key={title} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9.9, fontWeight: 900, color: '#071b3d', marginBottom: 6, letterSpacing: 0.5 }}>{title}</div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: '#66758d', lineHeight: 1.5 }}>
                {items.map((item) => <li key={item} style={{ marginBottom: 2 }}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Right Column: Fare Breakdown */}
        <div style={{ flex: 0.9, padding: '22px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 900, color: '#b8141b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right' }}>
            DISCOUNTS APPLIED & FARE BREAKDOWN
          </div>
          
          <div style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid rgba(220, 30, 38,0.34)', 
            borderRadius: 8, 
            padding: '16px',
            boxShadow: '0 12px 28px rgba(13, 74, 83, 0.08)'
          }}>
            {/* Base Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.8, color: '#66758d', marginBottom: 8 }}>
              <span>Base Fare</span>
              <span>₹ {baseFare.toFixed(2)}</span>
            </div>

            {/* Offers Applied Block */}
            {discount > 0 && (
              <div style={{ 
                border: '1px solid #2ec27e', 
                backgroundColor: '#f3faf7', 
                borderRadius: 4, 
                padding: '8px 12px', 
                marginBottom: 8,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: '#26a269' }}>OFFERS APPLIED</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#26a269', marginTop: 2 }}>YOU SAVED ₹{Math.round(discount)}</div>
              </div>
            )}

            {/* Offer Discount */}
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.8, color: '#26a269', marginBottom: 8 }}>
                <span>Offer Discount</span>
                <span>- ₹ {discount.toFixed(2)}</span>
              </div>
            )}

            {/* GST */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.8, color: '#66758d', marginBottom: 8 }}>
              <span>GST ({gstPercent}%)</span>
              <span>+ ₹ {tax.toFixed(2)}</span>
            </div>

            {/* Convenience Fee */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.8, color: '#66758d', marginBottom: 12 }}>
              <span>Convenience Fee</span>
              <span>+ ₹ {convenienceFee.toFixed(2)}</span>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px dashed #d8dee8', marginBottom: 12 }} />

            {/* Total Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 900, color: '#071b3d' }}>
              <span>Total Fare</span>
              <span style={{ color: '#b8141b' }}>₹ {totalFare.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ DOWNLOAD ============

const downloadTicketAsImage = async (frontId, backId, filename) => {
  const frontElement = document.getElementById(frontId);
  const backElement = document.getElementById(backId);
  if (!frontElement || !backElement) { alert('Ticket not found!'); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = async () => {
    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position:fixed;left:-99999px;top:0;width:960px;padding:12px;background:#ffffff;display:grid;gap:18px;';
      tempContainer.appendChild(frontElement.cloneNode(true));
      tempContainer.appendChild(backElement.cloneNode(true));
      document.body.appendChild(tempContainer);
      const canvas = await window.html2canvas(tempContainer, { backgroundColor: '#ffffff', scale: 2, useCORS: true, allowTaint: true, logging: false });
      document.body.removeChild(tempContainer);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = `${filename}.png`;
          document.body.appendChild(link); link.click();
          document.body.removeChild(link); URL.revokeObjectURL(url);
        }
      });
    } catch (error) { alert('Download completed! Check your downloads folder.'); }
  };
  script.onerror = () => alert('Download library loading failed.');
  if (!window.html2canvas) document.head.appendChild(script);
  else script.onload();
};

// ============ TICKET SECTION WRAPPER ============

const TicketSection = ({ icon, label, sub, accent = "#f23d24", onPrint, onDownload, children, backElement }) => (
  <div className="pb-ticket-section" style={{ "--pb-section-accent": accent }}>
    <div className="no-print pb-ticket-toolbar">
      <div className="pb-ticket-title">
        <span className="pb-ticket-icon">{icon}</span>
        <div>
          <strong>{label}</strong>
          <small>{sub}</small>
        </div>
      </div>
      <div className="pb-ticket-actions">
        <button type="button" onClick={onPrint}>Print</button>
        <button type="button" className="pb-secondary-action" onClick={onDownload}>Download</button>
      </div>
    </div>
    <FlipCard frontElement={children} backElement={backElement} />
  </div>
);

// ============ MAIN PAGE ============

const TicketPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedPnr = typeof location.state?.pnr === "string" ? location.state.pnr.trim() : "";
  const requestedEmail = typeof location.state?.email === "string" ? location.state.email.trim() : "";
  const requestedMobile = typeof location.state?.mobile === "string" ? location.state.mobile.trim() : "";
  const requestedType = TICKET_TYPES.BUS;

  // Support both single ticket (legacy) and multiple tickets (new)
  const providedTickets = useMemo(() => {
    if (Array.isArray(location.state?.tickets) && location.state.tickets.length > 0) {
      return location.state.tickets;
    }
    if (location.state?.ticket && typeof location.state.ticket === "object") {
      return [location.state.ticket];
    }
    return [];
  }, [location.state]);

  const matchingProvidedTickets = useMemo(() => {
    const normalizedPnr = normalizeRef(requestedPnr);
    if (!normalizedPnr) return providedTickets;
    return providedTickets.filter((ticket) => {
      const ticketReference = normalizeRef(ticket?.bookingReference || ticket?.pnr);
      return ticketReference === normalizedPnr;
    });
  }, [providedTickets, requestedPnr]);

  const [tickets, setTickets] = useState(matchingProvidedTickets);
  const [isFetchingTickets, setIsFetchingTickets] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(
    requestedPnr ? 0 : null
  );

  const hasFetchRequest = Boolean((requestedPnr || requestedMobile || requestedEmail) && requestedType);

  useEffect(() => {
    setTickets(matchingProvidedTickets);
  }, [matchingProvidedTickets]);

  useEffect(() => {
    if (tickets.length === 1 || requestedPnr) {
      setSelectedTicketIndex(0);
      return;
    }

    if (selectedTicketIndex !== null && selectedTicketIndex >= tickets.length) {
      setSelectedTicketIndex(null);
    }
  }, [requestedPnr, selectedTicketIndex, tickets.length]);

  useEffect(() => {
    if (!hasFetchRequest) navigate("/fetch-ticket", { replace: true });
  }, [hasFetchRequest, navigate]);

  useEffect(() => {
    if (!hasFetchRequest) return;

    const shouldFetch =
      location.state?.forceFetch ||
      matchingProvidedTickets.length === 0 ||
      matchingProvidedTickets.some((ticket) => !ticket?.fetchVerified);

    if (!shouldFetch) return;

    if (!requestedMobile && !requestedEmail) {
      setFetchError("Booking contact is missing. Please fetch the ticket using mobile or email.");
      return;
    }

    let isCurrent = true;
    setIsFetchingTickets(true);
    setFetchError("");

    fetchTicketByContact({
      mobile: requestedMobile,
      email: requestedEmail,
      bookingType: requestedType,
    })
      .then((fetchedTickets) => {
        if (!isCurrent) return;
        const normalizedPnr = normalizeRef(requestedPnr);
        const filteredTickets = normalizedPnr
          ? fetchedTickets.filter((ticket) => {
              const ticketReference = normalizeRef(ticket?.bookingReference || ticket?.pnr);
              return ticketReference === normalizedPnr;
            })
          : fetchedTickets;
        setTickets(filteredTickets);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setTickets([]);
        setFetchError(error?.message || "Unable to fetch ticket from backend.");
      })
      .finally(() => {
        if (isCurrent) setIsFetchingTickets(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    hasFetchRequest,
    location.state?.forceFetch,
    matchingProvidedTickets,
    requestedEmail,
    requestedMobile,
    requestedPnr,
    requestedType,
  ]);

  if (!hasFetchRequest) return null;

  const printById = (frontId, backId, title) => {
    const frontEl = document.getElementById(frontId);
    const backEl = document.getElementById(backId);
    if (!frontEl || !backEl) return;
    const pageStyles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    ).map((node) => node.outerHTML).join("");
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      ${pageStyles}
      <style>* { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; } body { background: #fff; padding: 0.2in; } .pb-print-sheet { width: 8in; margin: 0 auto; display:flex; flex-direction:column; gap:0.25in; } @media print { @page { size: 8.5in 11in; margin: 0.25in; } * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } button { display: none !important; } body { padding: 0; } }</style>
      </head><body><div class="pb-print-page"><div class="pb-print-sheet">${frontEl.outerHTML}${backEl.outerHTML}</div></div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const displayMobile = requestedMobile;
  const requestSummary = [
    displayMobile ? `Mobile ${displayMobile}` : "",
    requestedEmail ? `Email ${requestedEmail}` : "",
  ].filter(Boolean).join(" - ");
  const shouldShowTicketPicker =
    !isFetchingTickets &&
    tickets.length > 1 &&
    selectedTicketIndex === null;
  const ticketsToRender = selectedTicketIndex === null
    ? tickets
    : tickets[selectedTicketIndex]
    ? [tickets[selectedTicketIndex]]
    : [];

  const renderTicketPicker = () => (
    <div className="pb-select-shell">
      <div className="pb-active-chip">{tickets.length} Active Tickets</div>
      <h1>Select Ticket</h1>
      <p>
        {`Fetched for ${requestSummary || "--"}. Choose a ticket to view, print, or download it.`}
      </p>
      <div className="pb-ticket-list">
        {tickets.map((ticket, index) => {
          const data = mapTicketToBus(ticket, ticket?.bookingReference);

          return (
            <article className="pb-select-card" key={ticket?.bookingReference || ticket?.pnr || index}>
              <div className="pb-select-main">
                <span className="pb-type-pill">Bus</span>
                <strong>{data.from.city} to {data.to.city}</strong>
                <small>{data.operator} - {data.busNo}</small>
                <em>{data.passengers[0]?.name || "--"}</em>
              </div>
              <div className="pb-select-meta">
                <div><span>PNR</span><strong>{data.pnr}</strong></div>
                <div><span>{data.date}</span><strong>{data.departure}</strong></div>
                <div><span>Fare</span><strong>{data.fare}</strong></div>
              </div>
              <button type="button" onClick={() => setSelectedTicketIndex(index)}>
                Open Ticket
              </button>
            </article>
          );
        })}
      </div>
      <small className="pb-select-note">
        Active bookings only are listed here. Completed or cancelled trips are not available for print.
      </small>
    </div>
  );

  return (
    <>
      <style>{`* { font-family: "Manrope", "Segoe UI", sans-serif; } @media print { .no-print { display: none !important; } * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } }`}</style>
      <div className="pb-print-page">

        {/* Top bar */}
        <div className="no-print pb-top-row">
          <button onClick={() => selectedTicketIndex !== null && tickets.length > 1 ? setSelectedTicketIndex(null) : navigate("/fetch-ticket")}>
            Back
          </button>
          <div>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Page title */}
        {!shouldShowTicketPicker && (
        <div className="no-print pb-preview-title pb-preview-summary">
          <p>
            {`Fetched for ${requestSummary || "--"}.`}
            {tickets.length > 1 && (
              <span>
                {tickets.length} tickets found
              </span>
            )}
          </p>
        </div>
        )}

        {isFetchingTickets && (
          <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 26px' }}>
            <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148,163,184,0.4)', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 19.8, color: HOME_THEME.text }}>Fetching Ticket</h2>
              <p style={{ margin: '10px 0 0', color: HOME_THEME.textSoft, fontSize: 12.6 }}>
                Loading latest booking details from backend.
              </p>
            </div>
          </div>
        )}

        {!isFetchingTickets && tickets.length === 0 && (
          <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 26px' }}>
            <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148,163,184,0.4)', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 19.8, color: HOME_THEME.text }}>Booking Not Found</h2>
              <p style={{ margin: '10px 0 0', color: HOME_THEME.textSoft, fontSize: 12.6 }}>
                {fetchError || `No active ${requestedType} booking found for these details.`}
              </p>
            </div>
          </div>
        )}

        {shouldShowTicketPicker ? renderTicketPicker() : (
        <div className="pb-preview-shell">
          {ticketsToRender.map((rawTicket, index) => {
            const activeTicketType = TICKET_TYPES.BUS;
            const frontId = `${activeTicketType}-ticket-${index}`;
            const backId = `${activeTicketType}-ticket-back-${index}`;

            if (activeTicketType === TICKET_TYPES.BUS) {
              const busData = mapTicketToBus(rawTicket, rawTicket?.bookingReference);
              return (
                <TicketSection
                  key={frontId}
                  icon="B"
                  label="Bus Ticket"
                  sub={`${busData.operator} - ${busData.busNo} - PNR: ${busData.pnr}`}
                  accent="#f23d24"
                  onPrint={() => printById(frontId, backId, 'Bus Ticket')}
                  onDownload={() => downloadTicketAsImage(frontId, backId, `bus-ticket-${index + 1}`)}
                  backElement={<BusBackSide id={backId} ticket={rawTicket} />}
                >
                  <BusTicket data={busData} id={frontId} />
                </TicketSection>
              );
            }

            return null;
          })}
        </div>
        )}

        <div className="no-print pb-footer-note">
          Computer-generated ticket - no physical signature required | Carry valid government-issued photo ID | Support: support@gopickandbook.in
        </div>
      </div>
    </>
  );
};

export default TicketPreviewPage;
