import React from "react";
import "../STYLES/FlightEmailStyleTicket.css";

const pick = (source, keys, fallback = "") => {
  if (!source) return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value))}`;

const getAirlineCode = (airline, flightNumber) => {
  const al = String(airline || "").toLowerCase();
  const fn = String(flightNumber || "").toUpperCase();

  if (al.includes("fly91")) return "IC";
  if (al.includes("vistara")) return "UK";
  if (al.includes("indigo") || fn.startsWith("6E")) return "6E";
  if (al.includes("air india express") || fn.startsWith("IX")) return "IX";
  if (al.includes("air india") || fn.startsWith("AI")) return "AI";
  if (al.includes("spicejet") || fn.startsWith("SG")) return "SG";
  if (al.includes("akasa") || fn.startsWith("QP")) return "QP";
  if (al.includes("alliance") || fn.startsWith("9I")) return "9I";

  if (fn && fn.length >= 2) {
    const prefix = fn.substring(0, 2);
    if (/^[A-Z0-9]{2}$/.test(prefix)) return prefix;
  }
  return "6E";
};

const getAirportCode = (city) => {
  const c = String(city || "").trim().toLowerCase();
  if (c.includes("delhi")) return "DEL";
  if (c.includes("mumbai")) return "BOM";
  if (c.includes("bangalore") || c.includes("bengaluru")) return "BLR";
  if (c.includes("hyderabad")) return "HYD";
  if (c.includes("chennai")) return "MAA";
  if (c.includes("kolkata")) return "CCU";
  if (c.includes("goa") || c.includes("dabolim")) return "GOI";
  if (c.includes("mopa")) return "GOX";
  if (c.includes("kochi") || c.includes("cochin")) return "COK";
  if (c.includes("pune")) return "PNQ";
  if (c.includes("ahmedabad")) return "AMD";
  if (c.includes("jaipur")) return "JAI";
  if (c.includes("lucknow")) return "LKO";
  if (c.includes("patna")) return "PAT";
  if (c.includes("chandigarh")) return "IXC";
  if (c.includes("varanasi")) return "VNS";
  if (c.includes("guwahati")) return "GAU";
  if (c.includes("bhubaneswar")) return "BBI";
  if (c.includes("srinagar")) return "SXR";
  if (c.length === 3) return c.toUpperCase();
  return c.slice(0, 3).toUpperCase();
};

const getAirportName = (city) => {
  const c = String(city || "").trim().toLowerCase();
  if (c.includes("delhi")) return "Indira Gandhi International Airport, T3";
  if (c.includes("mumbai")) return "Chhatrapati Shivaji Maharaj International Airport, T2";
  if (c.includes("bangalore") || c.includes("bengaluru")) return "Kempegowda International Airport, T1";
  if (c.includes("hyderabad")) return "Rajiv Gandhi International Airport, Shamshabad";
  if (c.includes("chennai")) return "Chennai International Airport";
  if (c.includes("kolkata")) return "Netaji Subhash Chandra Bose International Airport";
  if (c.includes("goa")) return "Goa International Airport";
  if (c.includes("kochi")) return "Cochin International Airport";
  if (c.includes("pune")) return "Pune Airport";
  if (c.includes("ahmedabad")) return "Sardar Vallabhbhai Patel International Airport";
  return `${city || "Domestic"} Airport`;
};

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return "--:--";
  const str = String(timeStr).trim();
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2];
    const ampm = timeMatch[3];
    if (ampm) {
      return `${hour.toString().padStart(2, "0")}:${minute} ${ampm.toUpperCase()}`;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:${minute} ${suffix}`;
  }
  return str;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "--";
  const str = String(dateStr).trim();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {}
  return str.split(",")[0] || str;
};

export default function FlightEmailStyleTicket({ ticket, data = {}, id }) {
  const isCancelled =
    ticket?.isCancelled ||
    String(ticket?.status || data?.status || "").toUpperCase().includes("CANCEL") ||
    String(ticket?.status || data?.status || "").toUpperCase().includes("REFUND");

  const bookingReference = pick(ticket, ["bookingReference", "BookingReference"], data?.pnr || "--");
  const pnr = pick(ticket, ["pnr", "PNR", "gdsPnr", "GdsPnr"], data?.pnr || "--");
  const gdsPnr = pick(ticket, ["gdsPnr", "GdsPnr"], "");

  const airline = pick(ticket, ["airline", "Airline", "providerName", "ProviderName"], data?.airline || "Airline Service");
  const flightNumber = pick(ticket, ["flightNumber", "FlightNumber", "flightNo", "FlightNo", "tripNumber", "TripNumber"], data?.flightNumber || "--");
  const airCode = getAirlineCode(airline, flightNumber);
  const logoUrl = `https://images.kiwi.com/airlines/64/${airCode}.png`;
  const fallbackLogoUrl = `https://imgak.mmtcdn.com/flights/assets/media/dt/common/icons/${airCode}.png`;

  const travelClass = pick(ticket, ["travelClass", "TravelClass", "className", "ClassName", "class", "Class"], data?.travelClass || "ECONOMY");
  const bookedAtDisplay = pick(ticket, ["bookedAtDisplay", "BookedAtDisplay", "bookedAtIst", "BookedAtIst", "bookedAt", "BookedAt"], data?.date || "Confirmed Booking");

  const fromCity = pick(ticket, ["fromCity", "FromCity", "source", "Source"], data?.from || "--");
  const toCity = pick(ticket, ["toCity", "ToCity", "destination", "Destination"], data?.to || "--");

  const departureDisplay = pick(ticket, ["departureTimeDisplay", "DepartureTimeDisplay", "departureTimeIst", "DepartureTimeIst", "departureTime"], data?.departure || "");
  const arrivalDisplay = pick(ticket, ["arrivalTimeDisplay", "ArrivalTimeDisplay", "arrivalTimeIst", "ArrivalTimeIst", "arrivalTime"], data?.arrival || "");
  const duration = pick(ticket, ["duration", "Duration"], data?.duration || "--");

  // Passengers
  const rawPassengers = Array.isArray(ticket?.passengers)
    ? ticket.passengers
    : Array.isArray(ticket?.Passengers)
      ? ticket.Passengers
      : Array.isArray(data?.passengers)
        ? data.passengers
        : [];

  const passengers = rawPassengers.length > 0
    ? rawPassengers.map((p, idx) => ({
        name: pick(p, ["fullName", "FullName", "name", "Name", "passengerName"], `Passenger ${idx + 1}`),
        seat: pick(p, ["seatNumber", "SeatNumber", "seat", "Seat", "seatLabel"], "--"),
        ticketNumber: pick(p, ["ticketNumber", "TicketNumber", "ticketNo", "TicketNo"], "--"),
        gender: pick(p, ["gender", "Gender", "passengerType", "PassengerType"], "Adult"),
        isCancelled: Boolean(p?.isCancelled || isCancelled),
      }))
    : [{ name: pick(ticket, ["passengerName"], "Primary Passenger"), seat: "--", ticketNumber: "--", gender: "Adult", isCancelled }];

  // Payment Breakdown
  const totalPrice = numberValue(pick(ticket, ["totalFare", "TotalFare", "totalPaid", "TotalPaid", "totalPriceInr", "TotalPriceInr", "fare"], data?.fare || 0));
  const cancellationCharges = numberValue(pick(ticket, ["cancellationCharges", "CancellationCharges", "cancellationCharge", "CancellationCharge"], Math.max(0, totalPrice - numberValue(pick(ticket, ["refundAmount", "RefundAmount"], 0)))));
  const refundAmount = numberValue(pick(ticket, ["refundAmount", "RefundAmount"], Math.max(0, totalPrice - cancellationCharges)));
  const cancellationReason = pick(ticket, ["cancellationReason", "CancellationReason"], "");
  const cancelledAtDisplay = pick(ticket, ["cancelledAtDisplay", "CancelledAtDisplay", "cancelledAtIst", "CancelledAtIst"], "Recently");

  // Segments (multi-leg)
  const segments = Array.isArray(ticket?.segments) && ticket.segments.length > 0
    ? ticket.segments
    : [
        {
          airline,
          flightNumber,
          fromCity,
          toCity,
          departureTimeDisplay,
          arrivalTimeDisplay,
          duration,
          pnr,
        },
      ];

  const qrData = `PickNBook Flight Ticket\nBooking Ref: ${bookingReference}\nPNR: ${pnr}\nAirline: ${airline} ${flightNumber}\nRoute: ${fromCity} -> ${toCity}\nStatus: ${isCancelled ? "CANCELLED" : "CONFIRMED"}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;

  return (
    <article id={id} className="pb-flight-email-ticket">
      {/* 1. BRAND HEADER */}
      <header className="pb-flight-email-ticket-header">
        <div>
          <img
            src="https://www.picknbook.in/assets/picknbook-login-q5fv1iRs.png"
            alt="Pick&book"
            className="pb-flight-email-ticket-logo"
          />
          <div className="pb-flight-email-ticket-heading">
            {isCancelled ? "Flight Booking Cancelled" : "Flight E-Ticket / Voucher"}
          </div>
          <div className="pb-flight-email-ticket-booked">
            Booked on <strong>{bookedAtDisplay}</strong>
          </div>
        </div>
        <div className="pb-flight-email-ticket-reference">
          <div>Booking ID: <strong>{bookingReference}</strong></div>
          <div>Airline PNR: <strong>{pnr}</strong></div>
          {gdsPnr && gdsPnr !== "--" && gdsPnr !== pnr && (
            <div>GDS PNR: <strong>{gdsPnr}</strong></div>
          )}
          <span className={`pb-flight-status-badge ${isCancelled ? "cancelled" : "confirmed"}`}>
            {isCancelled ? "Cancelled" : "Confirmed"}
          </span>
        </div>
      </header>

      {/* 2. AIRLINE & SERVICE STRIP */}
      <section className="pb-flight-email-ticket-airline">
        <div className="pb-flight-airline-info">
          <div className="pb-flight-airline-logo-box">
            <img
              src={logoUrl}
              alt={airline}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackLogoUrl;
              }}
            />
          </div>
          <div>
            <div className="pb-flight-airline-name">{airline}</div>
            <div className="pb-flight-badges-row">
              <span className="pb-flight-number-tag">{flightNumber}</span>
              <span className="pb-flight-class-badge">{travelClass}</span>
              <span className="pb-flight-fare-badge">Regular Fare</span>
            </div>
          </div>
        </div>
        <div className="pb-flight-baggage-note">
          Check-in: <strong>15 Kgs (1 PC)</strong> • Cabin: <strong>7 Kgs</strong> per Adult
        </div>
      </section>

      {/* 3. FLIGHT ROUTE & JOURNEY */}
      <section className="pb-flight-email-ticket-route">
        {segments.map((seg, sIdx) => {
          const segAirline = seg.airline || airline;
          const segFlightNo = seg.flightNumber || flightNumber;
          const segFrom = seg.fromCity || fromCity;
          const segTo = seg.toCity || toCity;
          const segFromCode = getAirportCode(segFrom);
          const segToCode = getAirportCode(segTo);
          const segFromAirport = getAirportName(segFrom);
          const segToAirport = getAirportName(segTo);
          const segDep = seg.departureTimeDisplay || departureDisplay;
          const segArr = seg.arrivalTimeDisplay || arrivalDisplay;
          const segDur = seg.duration || duration;

          return (
            <div key={`seg-${sIdx}`} className="pb-flight-segment-card">
              {segments.length > 1 && (
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#2563eb", marginBottom: 6 }}>
                  Flight Leg {sIdx + 1}: {segAirline} ({segFlightNo})
                </div>
              )}
              <div className="pb-flight-route-columns">
                <div className="pb-flight-route-col">
                  <label>DEPARTURE</label>
                  <div className="pb-flight-route-time">
                    {formatTimeDisplay(segDep)} <span>hrs</span>
                  </div>
                  <div className="pb-flight-route-city">
                    {segFrom} ({segFromCode})
                  </div>
                  <div className="pb-flight-route-airport">{segFromAirport}</div>
                  <div className="pb-flight-route-date">{formatDateDisplay(segDep)}</div>
                </div>

                <div className="pb-flight-route-mid">
                  <div className="pb-flight-duration">{segDur}</div>
                  <div className="pb-flight-connector-line">✈ ➔</div>
                  <span className="pb-flight-stop-pill">Non-Stop</span>
                </div>

                <div className="pb-flight-route-col dest">
                  <label>ARRIVAL</label>
                  <div className="pb-flight-route-time">
                    {formatTimeDisplay(segArr)} <span>hrs</span>
                  </div>
                  <div className="pb-flight-route-city">
                    {segTo} ({segToCode})
                  </div>
                  <div className="pb-flight-route-airport">{segToAirport}</div>
                  <div className="pb-flight-route-date">{formatDateDisplay(segArr)}</div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pb-flight-reporting-note">
          Reporting time at airport: <strong>At least 2 hours prior</strong> to scheduled departure. Boarding gate closes 25 minutes prior to takeoff.
        </div>
      </section>

      {/* 4. NOTICE BANNER */}
      <div className={`pb-flight-notice-banner ${isCancelled ? "cancelled" : "confirmed"}`}>
        {isCancelled ? (
          <div>
            <strong>Cancellation Notice:</strong> This flight booking was cancelled on {cancelledAtDisplay}.
            {cancellationReason && ` Reason: ${cancellationReason}.`} A net refund of{" "}
            <strong>{formatMoney(refundAmount)}</strong> has been initiated and will reflect in your original payment method / Pick&amp;book wallet within 3–5 business days.
          </div>
        ) : (
          <div>
            <strong>Mandatory Travel Advisory:</strong> A valid government-issued photo ID (Aadhaar Card, Passport, or Voter ID) is mandatory for web check-in and airport security clearance. Web check-in is mandatory before arrival at the airport.
          </div>
        )}
      </div>

      {/* 5. PASSENGER & PAYMENT DETAILS */}
      <section className="pb-flight-email-ticket-details">
        {/* Left: Passenger Details */}
        <div>
          <h3>Passenger Details</h3>
          <table className="pb-flight-table">
            <thead>
              <tr>
                <th>Passenger Name</th>
                <th>Gender / Type</th>
                <th>Seat No</th>
                <th>Ticket No</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((pax, pIdx) => (
                <tr key={`pax-${pIdx}`}>
                  <td>
                    <strong style={{ color: pax.isCancelled ? "#94a3b8" : "#0f172a", textDecoration: pax.isCancelled ? "line-through" : "none" }}>
                      {pax.name}
                    </strong>
                  </td>
                  <td>{pax.gender}</td>
                  <td>
                    <span className="pb-flight-pax-seat">{pax.seat && pax.seat !== "--" ? pax.seat : "--"}</span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "10.5px" }}>
                    {pax.ticketNumber && pax.ticketNumber !== "--" ? pax.ticketNumber : pnr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Payment Details */}
        <div>
          <h3>Payment Details</h3>
          <table className="pb-flight-table pb-flight-payment-table">
            <tbody>
              <tr>
                <td>Base Airfare:</td>
                <td>{formatMoney(Math.round(totalPrice * 0.82))}</td>
              </tr>
              <tr>
                <td>Taxes &amp; Airport Fees:</td>
                <td>{formatMoney(Math.round(totalPrice * 0.18))}</td>
              </tr>
              <tr className="total-row">
                <td>Total Paid:</td>
                <td>{formatMoney(totalPrice)}</td>
              </tr>
              {isCancelled && (
                <>
                  <tr style={{ color: "#dc2626" }}>
                    <td style={{ color: "#dc2626" }}>Cancellation Charges:</td>
                    <td>- {formatMoney(cancellationCharges)}</td>
                  </tr>
                  <tr className="total-row refund-row">
                    <td>Refund Amount Processed:</td>
                    <td>{formatMoney(refundAmount)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. IMPORTANT TRAVEL INFORMATION */}
      <section className="pb-flight-email-ticket-important">
        <h3>Important Travel Information</h3>
        <ul>
          <li>Web check-in is mandatory and opens 48 hours to 60 minutes before scheduled departure.</li>
          <li>Cabin baggage allowance is 7 Kgs per passenger. Excess baggage will be charged as per airline rates.</li>
          <li>Check-in counters close 60 minutes and boarding gates close 25 minutes prior to departure.</li>
          <li>For flight cancellations or rescheduling, visit our portal or contact us at <a href="https://picknbook.in/contact" target="_blank" rel="noreferrer">https://picknbook.in/contact</a>.</li>
        </ul>
      </section>

      {/* 7. POLICIES & TERMS */}
      <section className="pb-flight-email-ticket-policies">
        <div>
          <h3>Terms and Conditions</h3>
          <ul>
            <li>Fares and flight schedules are subject to airline operational requirements.</li>
            <li>Government-issued photo identification matching passenger names is mandatory at airport entry.</li>
            <li>Pick&amp;book is not liable for airline schedule modifications or baggage delays.</li>
          </ul>
        </div>
        <div>
          <h3>Cancellation &amp; Refund Policy</h3>
          <p>
            {ticket?.nonRefundable ? (
              "This ticket is non-refundable as per airline rules."
            ) : (
              "Cancellations and date amendments are permitted up to 2 hours prior to scheduled departure subject to standard airline cancellation fees and service charges. Refund proceeds will be credited to your original payment method."
            )}
          </p>
        </div>
      </section>
    </article>
  );
}

