import React from "react";
import "../STYLES/HotelEmailStyleTicket.css";

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

const formatDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  const match = raw.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  const time = match ? `${match[1].padStart(2, "0")}:${match[2]}` : raw;
  const timeParts = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeParts) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  const hour = Number(timeParts[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${String(hour % 12 || 12).padStart(2, "0")}:${timeParts[2]} ${suffix}`;
};

const formatDateTimeIst = (value, fallbackTime = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const dateStr = parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = fallbackTime || parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${timeStr} IST`;
};

function parseHotelCancellationPolicies(policyJson, totalPrice) {
  if (!policyJson) return [];
  try {
    let raw = typeof policyJson === "string" ? JSON.parse(policyJson) : policyJson;
    if (typeof raw === "string") raw = JSON.parse(raw);
    
    // In case the JSON has a wrapped list e.g. { policies: [...] } or { cancellationPolicies: [...] }
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.policies)
      ? raw.policies
      : Array.isArray(raw?.cancellationPolicies)
      ? raw.cancellationPolicies
      : Array.isArray(raw?.CancellationPolicies)
      ? raw.CancellationPolicies
      : raw ? [raw] : [];

    const total = numberValue(totalPrice);

    return list.map((p, idx) => {
      // Dynamic window extraction
      let timeWindow = pick(p, ["PolicyString", "policyString", "Condition", "condition", "Description", "description"]);
      
      const fromDate = pick(p, ["FromDate", "fromDate", "From", "from"]);
      const toDate = pick(p, ["ToDate", "toDate", "To", "to"]);

      if (!timeWindow && fromDate) {
        const fromStr = formatDate(fromDate);
        const toStr = toDate ? formatDate(toDate) : "";
        timeWindow = toStr ? `${fromStr} - ${toStr}` : `From ${fromStr}`;
      } else if (!timeWindow) {
        timeWindow = `Tier ${idx + 1}`;
      }

      // Dynamic refund / charge calculation
      const chargeType = String(pick(p, ["ChargeType", "chargeType", "CancellationChargeType", "cancellationChargeType"], "Percentage")).toLowerCase();
      const chargeVal = numberValue(pick(p, ["Charge", "charge", "CancellationCharge", "cancellationCharge", "Amount", "amount"], 0));
      
      let refundPercent = 0;
      let refundAmount = 0;

      if (chargeType.includes("fixed") || chargeType.includes("flat") || chargeType.includes("inr") || chargeType.includes("currency")) {
        refundAmount = Math.max(0, total - chargeVal);
        refundPercent = total > 0 ? Math.round((refundAmount / total) * 100) : 0;
      } else {
        refundPercent = Math.max(0, Math.min(100, 100 - chargeVal));
        refundAmount = Math.round((total * refundPercent) / 100);
      }

      return {
        timeWindow,
        refundPct: `${refundPercent}%`,
        refundAmt: formatMoney(refundAmount),
        refundPercentNum: refundPercent,
      };
    });
  } catch (err) {
    return [];
  }
}

export default function HotelEmailStyleTicket({ ticket, data = {}, id }) {
  const isCancelled =
    ticket?.isCancelled ||
    String(ticket?.status || data?.status || "").toUpperCase().includes("CANCEL");

  const bookingReference = pick(ticket, ["bookingReference", "BookingReference"], data?.pnr || "--");
  const confirmationNo = pick(
    ticket,
    ["confirmationNo", "ConfirmationNo", "providerBookingId", "ProviderBookingId", "confirmationNumber"],
    data?.confirmationNo || "--"
  );
  const bookedAt = pick(ticket, ["bookedAt", "BookedAt", "createdAt", "CreatedAt"]);
  const bookedAtDisplay = bookedAt ? formatDateTimeIst(bookedAt) : (data?.date || "Confirmed Booking");

  const hotelName = pick(ticket, ["hotelName", "HotelName"], data?.hotelName || "Hotel Reservation");
  const roomTypeName = pick(
    ticket,
    ["roomTypeName", "RoomTypeName", "roomType", "RoomType"],
    data?.roomType || "Standard Room"
  );
  const nights = numberValue(pick(ticket, ["nights", "Nights"], 1)) || 1;
  const city = pick(ticket, ["city", "City", "cityCode", "CityCode"], data?.city || "--");

  const checkInDate = pick(ticket, ["checkInDate", "CheckInDate"]);
  const checkOutDate = pick(ticket, ["checkOutDate", "CheckOutDate"]);
  const checkInDisplay = checkInDate ? formatDateTimeIst(checkInDate, "12:00 PM") : (data?.checkIn || "--");
  const checkOutDisplay = checkOutDate ? formatDateTimeIst(checkOutDate, "11:00 AM") : (data?.checkOut || "--");

  const guestName = pick(ticket, ["guestName", "GuestName", "primaryGuest"], data?.guestName || "--");
  const guestEmail = pick(ticket, ["guestEmail", "GuestEmail"], data?.guestEmail || "--");
  const guestPhone = pick(ticket, ["guestPhone", "GuestPhone"], data?.guestPhone || "--");
  const guestNationality = pick(ticket, ["guestNationality", "GuestNationality"], "Indian");

  const basePrice = numberValue(pick(ticket, ["basePrice", "BasePrice"], 0));
  const taxes = numberValue(pick(ticket, ["taxes", "Taxes", "srdvGstAmount", "SrdvGstAmount"], 0));
  const couponDiscount = numberValue(pick(ticket, ["couponDiscount", "CouponDiscount", "discountAmount", "DiscountAmount"], 0));
  const totalPrice = numberValue(pick(ticket, ["totalPrice", "TotalPrice", "totalPaid", "TotalPaid", "fare", "Fare"], data?.fare || 0));

  const cancellationRefundAmount = numberValue(pick(ticket, ["cancellationRefundAmount", "CancellationRefundAmount", "refundAmount", "RefundAmount"], 0));
  const cancellationCharge = numberValue(pick(ticket, ["cancellationCharge", "CancellationCharge"], Math.max(0, totalPrice - cancellationRefundAmount)));
  const cancelledAt = pick(ticket, ["cancelledAt", "CancelledAt"]);
  const cancelledAtDisplay = cancelledAt ? formatDateTimeIst(cancelledAt) : "Recently";

  // Dynamic cancellation policy strictly from booking JSON
  const cancellationPolicyJson = pick(ticket, [
    "cancellationPolicyJson",
    "CancellationPolicyJson",
    "cancellationPoliciesJson",
    "CancellationPoliciesJson",
  ]);
  const parsedPolicies = parseHotelCancellationPolicies(cancellationPolicyJson, totalPrice);

  const qrData = `PickNBook Hotel Ticket\nRef: ${bookingReference}\nConf: ${confirmationNo}\nHotel: ${hotelName}\nCheck-in: ${checkInDisplay}\nGuest: ${guestName}\nStatus: ${isCancelled ? "CANCELLED" : "CONFIRMED"}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;

  return (
    <article id={id} className="pb-hotel-email-ticket">
      {/* 1. HEADER */}
      <header className="pb-hotel-email-ticket-header">
        <div>
          <img
            src="https://www.picknbook.in/assets/picknbook-login-q5fv1iRs.png"
            alt="Pick&book"
            className="pb-hotel-email-ticket-logo"
          />
          <div className="pb-hotel-email-ticket-heading">
            {isCancelled ? "Hotel Booking Cancelled" : "Hotel Ticket"}
          </div>
          <div className="pb-hotel-email-ticket-booked">
            Booked on <strong>{bookedAtDisplay}</strong>
          </div>
        </div>
        <div className="pb-hotel-email-ticket-reference">
          <div>Booking ID: <strong>{bookingReference}</strong></div>
          <div>Voucher / Conf #: <strong>{confirmationNo}</strong></div>
          <span className={`pb-hotel-status-badge ${isCancelled ? "cancelled" : "confirmed"}`}>
            {isCancelled ? "Cancelled" : "Confirmed"}
          </span>
        </div>
      </header>

      {/* 2. PROPERTY & ROOM DETAILS */}
      <section className="pb-hotel-email-ticket-property">
        <div>
          <strong className="pb-hotel-name">{hotelName}</strong>
          <div className="pb-hotel-room-line">
            <span>{roomTypeName}</span>
            <span className="pb-hotel-stay-nights-badge">• [ {nights} {nights === 1 ? "NIGHT" : "NIGHTS"} STAY ]</span>
          </div>
          <span className="pb-hotel-timing-note">
            Standard Check-in: 12:00 PM | Standard Check-out: 11:00 AM
          </span>
        </div>
        <div className="pb-hotel-voucher-meta">
          <strong>Voucher # {confirmationNo}</strong>
          <span>Location: {city}</span>
        </div>
      </section>

      {/* 3. STAY TIMELINE & QR CODE */}
      <section className="pb-hotel-email-ticket-stay">
        <div className="pb-hotel-stay-columns">
          <div className="pb-hotel-stay-col">
            <label>Check-in</label>
            <strong>{checkInDisplay}</strong>
            <span>Standard 12:00 PM Check-in</span>
            <small>Property Front Desk</small>
          </div>
          <div className="pb-hotel-stay-col">
            <label>Check-out</label>
            <strong>{checkOutDisplay}</strong>
            <span>Standard 11:00 AM Check-out</span>
            <small>Express Checkout Available</small>
          </div>
          <div className="pb-hotel-qr-box">
            <img src={qrUrl} alt="Hotel Voucher QR" />
            <span>SCAN VOUCHER</span>
          </div>
        </div>

        {/* Notice Banner */}
        <div className={`pb-hotel-stay-banner ${isCancelled ? "cancelled" : "confirmed"}`}>
          {isCancelled ? (
            <div>
              <strong>Cancellation Notice:</strong> This reservation was cancelled on {cancelledAtDisplay}. Refund of <strong>{formatMoney(cancellationRefundAmount)}</strong> has been processed to the original payment source.
            </div>
          ) : (
            <div>
              <strong>Mandatory Check-in Requirement:</strong> A valid government-issued photo ID (Aadhaar Card, Passport, or Voter ID) is required for every guest upon check-in. PAN cards are not accepted by hotels as valid photo ID.
            </div>
          )}
        </div>
      </section>

      {/* 4. GUEST & PAYMENT DETAILS */}
      <section className="pb-hotel-email-ticket-details">
        {/* Left: Guest Details */}
        <div>
          <h3>Guest Details</h3>
          <table className="pb-hotel-table">
            <tbody>
              <tr>
                <td>Primary Guest:</td>
                <td><strong>{guestName}</strong></td>
              </tr>
              <tr>
                <td>Guest Email:</td>
                <td>{guestEmail}</td>
              </tr>
              <tr>
                <td>Guest Mobile:</td>
                <td>{guestPhone}</td>
              </tr>
              <tr>
                <td>Nationality:</td>
                <td>{guestNationality}</td>
              </tr>
              <tr>
                <td>Rooms / Stay:</td>
                <td>1 Room • {nights} {nights === 1 ? "Night" : "Nights"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Payment Details */}
        <div>
          <h3>Payment Details</h3>
          <table className="pb-hotel-table">
            <tbody>
              <tr>
                <td>Room Base Price:</td>
                <td>{formatMoney(basePrice > 0 ? basePrice : totalPrice - taxes)}</td>
              </tr>
              <tr>
                <td>Taxes &amp; GST:</td>
                <td>{formatMoney(taxes)}</td>
              </tr>
              {couponDiscount > 0 && (
                <tr style={{ color: "#15803d" }}>
                  <td>Coupon Discount:</td>
                  <td>- {formatMoney(couponDiscount)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td>Total Paid:</td>
                <td>{formatMoney(totalPrice)}</td>
              </tr>
              {isCancelled && (
                <>
                  <tr style={{ color: "#dc2626" }}>
                    <td>Cancellation Charges:</td>
                    <td>- {formatMoney(cancellationCharge)}</td>
                  </tr>
                  <tr className="total-row refund-row">
                    <td>Refund Amount:</td>
                    <td>{formatMoney(cancellationRefundAmount)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. IMPORTANT INFORMATION */}
      <section className="pb-hotel-email-ticket-important">
        <h3>Important Stay Information</h3>
        <ul>
          <li>Carry a valid government-approved photo ID with address for all staying guests at check-in.</li>
          <li>Early check-in and late check-out requests are subject to hotel availability and may incur extra fees.</li>
          <li>For live support or check-in assistance, visit <a href="https://picknbook.in/contact" target="_blank" rel="noreferrer">https://picknbook.in/contact</a>.</li>
        </ul>
      </section>

      {/* 6. POLICIES & TERMS */}
      <section className="pb-hotel-email-ticket-policies">
        {/* Left: Terms and Conditions */}
        <div>
          <h3>Hotel Terms and Conditions</h3>
          <ul>
            <li>Primary guest must be at least 18 years of age with a valid government photo ID.</li>
            <li>Early check-in or late check-out is strictly subject to hotel room availability.</li>
            <li>Any incidental charges (mini-bar, room service, laundry) must be settled directly with the hotel.</li>
            <li>Pick&amp;Book is not liable for property service disputes or amenity outages.</li>
            <li>For cancellation or modification inquiries, visit <a href="https://picknbook.in/contact" target="_blank" rel="noreferrer">https://picknbook.in/contact</a>.</li>
          </ul>
        </div>

        {/* Right: Dynamic Cancellation Policy */}
        <div>
          <h3>Cancellation Policy</h3>
          {parsedPolicies.length > 0 ? (
            <>
              <table className="pb-hotel-policy-table">
                <thead>
                  <tr>
                    <th>Cancellation Window</th>
                    <th>Refund (%)</th>
                    <th>Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedPolicies.map((cp, idx) => (
                    <tr key={`${cp.timeWindow}-${idx}`}>
                      <td>{cp.timeWindow}</td>
                      <td style={{ color: cp.refundPercentNum >= 50 ? "#15803d" : "#dc2626" }}>
                        {cp.refundPct}
                      </td>
                      <td>{cp.refundAmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pb-hotel-policy-note">
                *Calculated per hotel cancellation policy
              </div>
            </>
          ) : (
            <div className="pb-hotel-policy-note" style={{ fontSize: "11px", color: "#334155", marginTop: "8px" }}>
              Cancellation terms subject to hotel property rules.
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
