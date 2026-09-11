/* eslint-disable */
import {
  normalizeResponseMessage,
  readResponsePayload,
  toApiUrl,
  withNgrokSkipWarningHeader,
} from "./apiClient";

const TICKET_FETCH_ENDPOINT = "/api/tickets/fetch";

function pickFirst(source, keys, fallback = null) {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return fallback;
}

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {};
  }

  const activePortal = window.sessionStorage.getItem("active_portal") || "b2c";
  const token = activePortal === "b2b"
    ? (window.localStorage.getItem("b2b_token") || window.localStorage.getItem("token"))
    : (window.localStorage.getItem("token") || window.localStorage.getItem("b2b_token"));
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeSuccess(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value || "").trim().toLowerCase() === "true";
}

function toFareNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizePassenger(passenger, index) {
  const fullName = String(
    pickFirst(passenger, ["fullName", "FullName", "name", "Name"], "") ||
      `Passenger ${index + 1}`
  ).trim();
  const seatNumber = String(
    pickFirst(
      passenger,
      ["seatNumber", "SeatNumber", "seat", "Seat", "seatLabel", "SeatLabel"],
      ""
    ) || ""
  ).trim();

  return {
    ...passenger,
    fullName,
    name: fullName,
    seatNumber,
    seat: seatNumber,
  };
}

function normalizeBusType(ticket) {
  return String(
    pickFirst(
      ticket,
      [
        "busType",
        "BusType",
        "bus_type",
        "coachType",
        "CoachType",
        "vehicleType",
        "VehicleType",
        "serviceType",
        "ServiceType",
        "className",
        "ClassName",
        "class",
        "Class",
      ],
      ""
    ) || ""
  ).trim();
}

function normalizeFetchedTicket(ticket, request) {
  const bookingType = String(request.bookingType || "").trim().toLowerCase();
  const bookingReference = String(
    pickFirst(
      ticket,
      ["bookingReference", "BookingReference", "pnr", "PNR", "reference", "Reference"],
      ""
    ) || ""
  ).trim();
  const fareValue = pickFirst(
    ticket,
    ["totalPaid", "TotalPaid", "totalFare", "TotalFare"],
    pickFirst(ticket?.fare, ["totalFare", "TotalFare"], 0)
  );
  const passengers = Array.isArray(ticket?.passengers)
    ? ticket.passengers
    : Array.isArray(ticket?.Passengers)
      ? ticket.Passengers
      : [];
  const busType = bookingType === "bus" ? normalizeBusType(ticket) : "";

  return {
    ...ticket,
    bookingReference,
    pnr: bookingReference,
    ticketType: String(
      pickFirst(ticket, ["ticketType", "TicketType", "type", "Type"], bookingType) ||
        bookingType
    )
      .trim()
      .toLowerCase(),
    providerName: String(
      pickFirst(
        ticket,
        ["providerName", "ProviderName", "operator", "Operator", "airline", "Airline"],
        bookingType === "bus" ? "Bus Service" : "Flight Service"
      ) || ""
    ).trim(),
    tripNumber: String(
      pickFirst(
        ticket,
        ["tripNumber", "TripNumber", "busNo", "BusNo", "flightNo", "FlightNo"],
        "--"
      ) || "--"
    ).trim(),
    ...(busType ? { busType } : {}),
    fromCity: String(
      pickFirst(ticket, ["fromCity", "FromCity", "source", "Source"], "--") || "--"
    ).trim(),
    toCity: String(
      pickFirst(ticket, ["toCity", "ToCity", "destination", "Destination"], "--") ||
        "--"
    ).trim(),
    departureTime: pickFirst(
      ticket,
      ["departureTime", "DepartureTime", "departureDateTime", "DepartureDateTime"],
      ""
    ),
    arrivalTime: pickFirst(
      ticket,
      ["arrivalTime", "ArrivalTime", "arrivalDateTime", "ArrivalDateTime"],
      ""
    ),
    status: String(pickFirst(ticket, ["status", "Status"], "Booked") || "Booked"),
    passengers: passengers.map(normalizePassenger),
    contact: {
      ...(ticket.contact && typeof ticket.contact === "object" ? ticket.contact : {}),
      ...(ticket.Contact && typeof ticket.Contact === "object" ? ticket.Contact : {}),
      mobile: request.mobile,
      email: request.email,
    },
    fare: {
      ...(ticket.fare && typeof ticket.fare === "object" ? ticket.fare : {}),
      totalFare: toFareNumber(fareValue),
    },
    totalFare: toFareNumber(fareValue),
    totalPaid: toFareNumber(fareValue),
    fetchVerified: true,
  };
}

function readTicketsFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const ticket = pickFirst(payload, ["ticket", "Ticket", "data", "Data"], null);
  if (ticket && typeof ticket === "object" && !Array.isArray(ticket)) {
    return [ticket];
  }

  const tickets = pickFirst(payload, ["tickets", "Tickets"], null);
  if (Array.isArray(tickets)) {
    return tickets.filter((item) => item && typeof item === "object");
  }

  if (Array.isArray(ticket)) {
    return ticket.filter((item) => item && typeof item === "object");
  }

  if (Array.isArray(payload)) {
    return payload.filter((item) => item && typeof item === "object");
  }

  return [];
}

export async function fetchTicketByContact({
  mobile,
  email,
  bookingType,
  activeOnly = true,
}) {
  const request = {
    mobile: String(mobile || "").trim(),
    email: String(email || "").trim(),
    bookingType: String(bookingType || "").trim().toLowerCase(),
    activeOnly: activeOnly !== false,
  };

  const response = await fetch(toApiUrl(TICKET_FETCH_ENDPOINT), {
    method: "POST",
    headers: withNgrokSkipWarningHeader(TICKET_FETCH_ENDPOINT, {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    }),
    body: JSON.stringify(request),
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(normalizeResponseMessage(payload, "Unable to fetch booking."));
  }

  const hasSuccessField =
    payload &&
    typeof payload === "object" &&
    ("success" in payload || "Success" in payload);
  const successValue = pickFirst(payload, ["success", "Success"], false);
  const tickets = readTicketsFromPayload(payload);

  if (hasSuccessField && !normalizeSuccess(successValue)) {
    throw new Error(
      normalizeResponseMessage(payload, "No active booking found")
    );
  }

  if (tickets.length === 0) {
    throw new Error("No active booking found");
  }

  const normalizedTickets = tickets.map((ticket) =>
    normalizeFetchedTicket(ticket, request)
  );

  return {
    ...normalizedTickets[0],
    matchingTickets: normalizedTickets,
  };
}
