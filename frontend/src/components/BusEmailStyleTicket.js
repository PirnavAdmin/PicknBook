import React from "react";
import "../STYLES/BusEmailStyleTicket.css";

const pick = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
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
    weekday: "short",
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

const formatDateTime = (value) => {
  const raw = String(value || "").trim();
  return raw ? `${formatDate(raw)} ${formatTime(raw)}` : "--";
};

const getPointName = (point, fallback) =>
  typeof point === "string"
    ? point
    : pick(point, ["name", "pointName", "Name", "PointName"], fallback || "--");

function getDiscountRows(ticket, paidAmount) {
  const autoDiscount = numberValue(pick(ticket, ["autoDiscountAmount", "AutoDiscountAmount"], 0));
  const couponDiscount = numberValue(pick(ticket, ["couponDiscountAmount", "CouponDiscountAmount"], 0));
  let discount = autoDiscount + couponDiscount;
  if (!discount) discount = numberValue(pick(ticket, ["discountAmount", "DiscountAmount"], 0));
  if (!discount) return [];

  return [{
    label: "Offer / Coupon Discount",
    value: `- ${formatMoney(discount)}`,
    isDiscount: true,
    gross: numberValue(pick(ticket, ["totalFareBeforeDiscount", "TotalFareBeforeDiscount"], 0)) || paidAmount + discount,
  }];
}

function getCancellationPolicies(ticket, paidAmount) {
  const rawPolicies = pick(ticket, [
    "cancellationPoliciesJson",
    "CancellationPoliciesJson",
    "cancellationPolicyJson",
    "CancellationPolicyJson",
  ]);
  if (!rawPolicies) return [];

  try {
    let parsed = typeof rawPolicies === "string" ? JSON.parse(rawPolicies) : rawPolicies;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const policies = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];

    return policies.map((policy) => {
      const charge = numberValue(pick(policy, ["cancellationCharge", "CancellationCharge"], 0));
      const chargeType = String(pick(policy, ["cancellationChargeType", "CancellationChargeType"])).toLowerCase();
      const isPercentage = chargeType.includes("percentage");
      const refundPercent = isPercentage ? Math.max(0, 100 - charge) : null;
      const refundAmount = isPercentage
        ? paidAmount * refundPercent / 100
        : Math.max(0, paidAmount - charge);
      const beforeDeparture = pick(policy, ["timeBeforeDept", "TimeBeforeDept"]);

      return {
        time: pick(policy, ["policyString", "PolicyString"]) ||
          (String(beforeDeparture) === "-1" ? "Before departure" : `${beforeDeparture || "--"} hrs before departure`),
        refund: isPercentage ? `${refundPercent}%` : formatMoney(refundAmount),
        amount: formatMoney(refundAmount),
        refundPercent: isPercentage ? refundPercent : (refundAmount / Math.max(paidAmount, 1)) * 100,
      };
    });
  } catch (error) {
    return [];
  }
}

export default function BusEmailStyleTicket({ ticket, data, id }) {
  const bookingReference = pick(ticket, ["bookingReference", "BookingReference"], data.pnr);
  const partnerPnr = pick(ticket, ["pnr", "PNR"], bookingReference);
  const departure = pick(ticket, ["departureTimeIst", "DepartureTimeIst", "departureTime", "DepartureTime"]);
  const arrival = pick(ticket, ["arrivalTimeIst", "ArrivalTimeIst", "arrivalTime", "ArrivalTime"]);
  const boardingPoint = pick(ticket, ["boardingPoint", "BoardingPoint"]);
  const droppingPoint = pick(ticket, ["droppingPoint", "DroppingPoint", "arrivalPoint", "ArrivalPoint"]);
  const boardingDateTime = pick(
    boardingPoint,
    ["dateTimeIst", "dateTime", "DateTime"],
    departure
  );
  const droppingDateTime = pick(
    droppingPoint,
    ["dateTimeIst", "dateTime", "DateTime"],
    arrival
  );
  const boardingTime = pick(boardingPoint, ["timeDisplay", "time", "TimeDisplay", "Time"],
    pick(ticket, ["boardingPointTime", "BoardingPointTime"], departure));
  const paidAmount = numberValue(pick(ticket, [
    "totalFare", "TotalFare", "totalPriceInr", "TotalPriceInr", "price", "Price",
  ], data.fare));
  const discounts = getDiscountRows(ticket, paidAmount);
  const grossFare = discounts[0]?.gross ||
    numberValue(pick(ticket, ["totalFareBeforeDiscount", "TotalFareBeforeDiscount"], paidAmount));
  const passengers = Array.isArray(ticket?.passengers)
    ? ticket.passengers
    : Array.isArray(ticket?.Passengers) ? ticket.Passengers : [];
  const policies = getCancellationPolicies(ticket, paidAmount);
  const bookedAt = pick(ticket, ["bookedAtDisplay", "BookedAtDisplay", "bookedAtUtc", "BookedAtUtc"]);
  const busStartTime = departure ? formatTime(departure) : data.originDeparture;

  return (
    <article id={id} className="pb-email-ticket">
      <header className="pb-email-ticket-header">
        <div>
          <img
            src="https://www.picknbook.in/assets/picknbook-login-q5fv1iRs.png"
            alt="Pick&book"
            className="pb-email-ticket-logo"
          />
          <div className="pb-email-ticket-heading">Bus Ticket</div>
          <div className="pb-email-ticket-booked">Booked on <strong>{bookedAt || "--"}</strong></div>
        </div>
        <div className="pb-email-ticket-reference">
          <div>Booking ID: <strong>{bookingReference}</strong></div>
          <div>Bus Partner PNR: <strong>{partnerPnr}</strong></div>
          <span>Confirmed</span>
        </div>
      </header>

      <section className="pb-email-ticket-operator">
        <div>
          <strong>{data.operator}</strong>
          <span>{data.class}</span>
          <small>Bus Start Time: <b>{busStartTime || "--"}</b></small>
        </div>
        <div className="pb-email-ticket-service">
          <strong>Service # {partnerPnr}</strong>
          <span>{data.operator}</span>
        </div>
      </section>

      <section className="pb-email-ticket-route">
        <div className="pb-email-ticket-route-city">
          <label>Departure</label>
          <strong>{data.from.city}</strong>
          <span>{formatDateTime(boardingDateTime)}</span>
          <small><b>Boarding Point:</b><br />{getPointName(boardingPoint, data.from.stop)}</small>
        </div>
        <div className="pb-email-ticket-arrow" aria-hidden="true">➜</div>
        <div className="pb-email-ticket-route-city">
          <label>Arrival</label>
          <strong>{data.to.city}</strong>
          <span>{formatDateTime(droppingDateTime)}</span>
          <small><b>Dropping Point:</b><br />{getPointName(droppingPoint, data.to.stop)}</small>
        </div>
        <div className="pb-email-ticket-reporting">
          Reporting time at the boarding point: <strong>{formatTime(boardingTime)}</strong> (15 minutes prior to departure)
        </div>
      </section>

      <section className="pb-email-ticket-details">
        <div>
          <h3>Passenger Details</h3>
          <table>
            <thead><tr><th>Name</th><th>Gender</th><th>Seat No</th></tr></thead>
            <tbody>
              {(passengers.length ? passengers : data.passengers).map((passenger, index) => (
                <tr key={`${pick(passenger, ["fullName", "FullName", "name", "Name"], `Passenger ${index + 1}`)}-${index}`}>
                  <td>{pick(passenger, ["fullName", "FullName", "name", "Name"], `Passenger ${index + 1}`)}</td>
                  <td>{pick(passenger, ["gender", "Gender"], "-") || "-"}</td>
                  <td>{pick(passenger, ["seatNumber", "SeatNumber", "seat", "Seat"], "--") || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Payment Details</h3>
          <table className="pb-email-ticket-payment">
            <tbody>
              <tr><td>Total Fare:</td><td>{formatMoney(grossFare)}</td></tr>
              {discounts.map((discount) => (
                <tr className="pb-email-ticket-discount" key={discount.label}>
                  <td>{discount.label}:</td><td>{discount.value}</td>
                </tr>
              ))}
              <tr className="pb-email-ticket-paid"><td>Amount Paid:</td><td>{formatMoney(paidAmount)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="pb-email-ticket-important">
        <h3>Important Information</h3>
        <ul>
          <li>Please reach the boarding point by the reporting time (at least 15 mins prior to scheduled departure).</li>
          <li>Chat with us for live tracking &amp; trip updates at <a href="https://picknbook.in/contact">https://picknbook.in/contact</a></li>
        </ul>
      </section>

      <section className="pb-email-ticket-policies">
        <div>
          <h3>Terms and Conditions</h3>
          <ul>
            <li>The arrival and departure times mentioned on the ticket are tentative.</li>
            <li>Passengers are requested to arrive at the boarding point at least 15 mins prior.</li>
            <li>Pick&amp;book is not responsible for any accidents or loss of passenger belongings.</li>
            <li>Pick&amp;book is not responsible for any delay or vehicle breakdown beyond control.</li>
            <li>Cancellation charges are applicable on Original fare but not on the Discounted Fare.</li>
            <li>For detailed terms, please visit <a href="https://picknbook.in/contact">https://picknbook.in/contact</a></li>
          </ul>
        </div>
        <div>
          <h3>Cancellation Policy</h3>
          {policies.length ? (
            <table>
              <thead><tr><th>Cancellation Time</th><th>Refund (%)</th><th>Refund Amount</th></tr></thead>
              <tbody>
                {policies.map((policy, index) => (
                  <tr key={`${policy.time}-${index}`}>
                    <td>{policy.time}</td>
                    <td className={policy.refundPercent >= 50 ? "is-good-refund" : "is-low-refund"}>{policy.refund}</td>
                    <td>{policy.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="pb-email-ticket-no-policy">Cancellation policy details are not available.</p>}
          <small>*Refund amount is indicative.</small>
        </div>
      </section>
    </article>
  );
}
