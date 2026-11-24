import React, { useMemo } from "react";
import "../STYLES/FlightSearchResults.css";
import {
  Plane,
  Briefcase,
  Calendar,
  XCircle,
  Receipt,
  AlertCircle,
  Clock,
  CheckCircle2,
  Tag,
  ShieldAlert,
  Info,
  ShieldCheck,
  Check,
} from "lucide-react";

/**
 * Normalizes and strips HTML tags, decoding common HTML entities
 */
function stripHtml(input) {
  if (!input) return "";
  return String(input)
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&bull;/gi, "•")
    .replace(/&#8377;/gi, "₹")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extracts fee and time period from a rule line if present
 */
function parseRulePoint(line, sectorLabel = "") {
  if (!line) return null;
  const trimmed = String(line).trim();
  if (!trimmed) return null;

  // Pattern matching for fee amounts like "INR 3,000", "Rs. 3500", "₹2500", "USD 50", "Free", "Non-refundable", "No-show"
  const feeMatch = trimmed.match(
    /\b((?:INR|Rs\.?|₹|USD|EUR|AED|GBP)\s*[\d,]+(?:\.\d{1,2})?|Non-refundable|No[\s-]show|Free|Nil|100%|50%)\b/i
  );
  const fee = feeMatch ? feeMatch[0] : null;

  // Pattern matching for time windows like "Within 2 hours", "Before 24 hrs", "2 to 72 hours", "0 - 2 hours"
  const timeMatch = trimmed.match(
    /\b((?:Within|Before|After|More than|Between|Up to)\s+[\d\w\s-]+(?:hours?|hrs?|days?)|0\s*-\s*\d+\s*(?:hours?|hrs?)|[\d\s]+to[\d\s]+(?:hours?|hrs?|days?)|prior\s+to\s+departure)\b/i
  );
  const timeWindow = timeMatch ? timeMatch[0] : null;

  return {
    raw: trimmed,
    fee,
    timeWindow,
    sectorLabel: sectorLabel || "",
  };
}

/**
 * Parses raw fare rule strings and structured miniFareRules into clean categories
 */
export function parseFareRuleDetails({ data, flight = {} }) {
  // 1. Resolve rawRuleList from all plausible structures and casings
  let rawRuleList = [];
  if (Array.isArray(data)) {
    rawRuleList = data;
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.results)) rawRuleList = data.results;
    else if (Array.isArray(data.Results)) rawRuleList = data.Results;
    else if (Array.isArray(data.FareRules)) rawRuleList = data.FareRules;
    else if (Array.isArray(data.fareRules)) rawRuleList = data.fareRules;
    else if (Array.isArray(data.data?.results)) rawRuleList = data.data.results;
    else if (Array.isArray(data.data?.Results)) rawRuleList = data.data.Results;
    else if (Array.isArray(data.data?.FareRules)) rawRuleList = data.data.FareRules;
    else if (Array.isArray(data.raw?.Response?.Results)) rawRuleList = data.raw.Response.Results;
    else if (Array.isArray(data.rawResponse?.Results)) rawRuleList = data.rawResponse.Results;
    else if (Array.isArray(data.data) && data.data.length > 0) rawRuleList = data.data;
    else if (data.FareRuleDetail || data.fareRuleDetail || data.FareRules || data.fareRules) {
      rawRuleList = [data];
    }
  } else if (typeof data === "string" && data.trim()) {
    rawRuleList = [{ FareRuleDetail: data }];
  }

  // Fallback to flight-level fare rules if API response didn't supply rule text
  if (rawRuleList.length === 0 && flight) {
    if (Array.isArray(flight.fareRules) && flight.fareRules.length > 0) {
      rawRuleList = flight.fareRules;
    } else if (Array.isArray(flight.FareRules) && flight.FareRules.length > 0) {
      rawRuleList = flight.FareRules;
    } else if (typeof flight.fareRules === "string" && flight.fareRules.trim()) {
      rawRuleList = [{ FareRuleDetail: flight.fareRules }];
    }
  }

  // 2. Resolve miniFareRules
  let miniFareRules = [];
  if (Array.isArray(data?.miniFareRules)) miniFareRules = data.miniFareRules;
  else if (Array.isArray(data?.MiniFareRules)) miniFareRules = data.MiniFareRules;
  else if (Array.isArray(data?.data?.MiniFareRules)) miniFareRules = data.data.MiniFareRules;
  else if (Array.isArray(data?.data?.miniFareRules)) miniFareRules = data.data.miniFareRules;
  else if (Array.isArray(flight?.miniFareRules)) miniFareRules = flight.miniFareRules;
  else if (Array.isArray(flight?.MiniFareRules)) miniFareRules = flight.MiniFareRules;

  const airlineRules = data?.airlineRules || data?.AirlineRules || null;
  const specialRule = data?.specialRule || data?.SpecialRule || "";

  // 3. Resolve flight connecting segments & labels
  const segments = Array.isArray(flight?.segments) && flight.segments.length > 0
    ? flight.segments
    : (Array.isArray(flight?.Segments) && flight.Segments.length > 0
      ? flight.Segments
      : (Array.isArray(flight?.fareSegments) ? flight.fareSegments : []));

  const originCode = flight.sourceCode || flight.fromAirportCode || flight.from ||
    (segments[0]?.originAirportCode || segments[0]?.origin || "Origin");
  const destCode = flight.destinationCode || flight.toAirportCode || flight.to ||
    (segments[segments.length - 1]?.destAirportCode || segments[segments.length - 1]?.destination || "Destination");

  const flightNumberFormatted = flight.flightNumber ||
    (segments.length > 0
      ? segments.map((s) => (s.airlineCode ? `${s.airlineCode} ` : "") + (s.flightNumber || "")).filter(Boolean).join(" / ")
      : "");

  const info = {
    airlineName: flight.airlineName || flight.airline || segments[0]?.airline || "Airline",
    flightNumber: flightNumberFormatted,
    source: originCode,
    destination: destCode,
    sourceCity: flight.sourceCity || flight.fromCity || segments[0]?.originCity || "",
    destinationCity: flight.destinationCity || flight.toCity || segments[segments.length - 1]?.destCity || "",
    fareBasis: flight.fareBasis || flight.fareBasisCode || "",
    cabinClass: flight.cabinClass || flight.fareClass || flight.selectedTravelClass || "Economy",
    isRefundable:
      typeof flight.isRefundable === "boolean"
        ? flight.isRefundable
          ? "Refundable"
          : "Non-Refundable"
        : flight.isRefundable === "true" || flight.isRefundable === "Refundable"
          ? "Refundable"
          : flight.isRefundable === "false" || flight.isRefundable === "Non-Refundable"
            ? "Non-Refundable"
            : null,
    isConnecting: segments.length > 1,
    segmentCount: segments.length,
  };

  const baggagePoints = [];
  const cancellationPoints = [];
  const dateChangePoints = [];
  const additionalChargesPoints = [];
  const generalRules = [];

  // 4. Check flight properties for baggage
  if (flight.baggage) {
    const val = String(flight.baggage);
    baggagePoints.push(
      parseRulePoint(`Check-in Baggage: ${val}${/kg|piece/i.test(val) ? "" : " per adult"}`)
    );
  }
  if (flight.cabinBaggage) {
    const val = String(flight.cabinBaggage);
    baggagePoints.push(
      parseRulePoint(`Cabin Baggage: ${val}${/kg|piece/i.test(val) ? "" : " per adult"}`)
    );
  }

  // Baggage per segment for connecting flights
  if (segments.length > 1) {
    segments.forEach((seg, sIdx) => {
      const segOrigin = seg.originAirportCode || seg.origin || `Sector ${sIdx + 1}`;
      const segDest = seg.destAirportCode || seg.dest || `Sector ${sIdx + 1}`;
      const segLabel = `${segOrigin} ➔ ${segDest}`;
      if (seg.baggage && (!flight.baggage || seg.baggage !== flight.baggage)) {
        baggagePoints.push(parseRulePoint(`Check-in Baggage (${segLabel}): ${seg.baggage}`));
      }
      if (seg.cabinBaggage && (!flight.cabinBaggage || seg.cabinBaggage !== flight.cabinBaggage)) {
        baggagePoints.push(parseRulePoint(`Cabin Baggage (${segLabel}): ${seg.cabinBaggage}`));
      }
    });
  }

  // 5. Parse results array from API
  const multipleSectorsInRules = rawRuleList.length > 1 && rawRuleList.some(r => r?.Origin && r?.Destination);

  rawRuleList.forEach((r) => {
    if (!r) return;

    if (r.FareBasisCode && !info.fareBasis) {
      info.fareBasis = r.FareBasisCode;
    }
    if (r.Airline && (!info.airlineName || info.airlineName === "Airline")) {
      info.airlineName = r.Airline;
    }
    if (r.Origin && (!info.source || info.source === "Origin")) {
      info.source = r.Origin;
    }
    if (r.Destination && (!info.destination || info.destination === "Destination")) {
      info.destination = r.Destination;
    }

    const sectorLabel = multipleSectorsInRules && r.Origin && r.Destination
      ? `${r.Origin} ➔ ${r.Destination}`
      : "";

    const raw = r.FareRuleDetail || r.fareRuleDetail || r.FareRules || r.fareRules || (typeof r === "string" ? r : "");
    if (!raw) return;

    let text = stripHtml(raw);

    // Standardize concatenated section boundaries often used by airlines
    const headerRegex =
      /\b(CANCELLATION(?:\s+POLICY|\s+CHARGES|\s+FEE|\s+PENALTY)?|REFUND(?:\s+POLICY|\s+RULES)?|DATE\s+CHANGE(?:\s+POLICY|\s+CHARGES|\s+FEE|\s+PENALTY)?|RESCHEDULING(?:\s+POLICY|\s+CHARGES)?|REISSUE(?:\s+POLICY|\s+CHARGES)?|BAGGAGE(?:\s+ALLOWANCE|\s+POLICY)?|CABIN\s+BAGGAGE|CHECK-?IN\s+BAGGAGE|ADDITIONAL\s+CHARGES|OTHER\s+CHARGES|CONVENIENCE\s+FEE|SEAT\s+SELECTION|MEALS?\s+&\s+BEVERAGES?|IMPORTANT\s+NOTE|TERMS\s+&\s+CONDITIONS):/gi;

    text = text.replace(headerRegex, "\n###$1###\n");

    const rawLines = text
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let activeCategory = "general";

    rawLines.forEach((line) => {
      const headerMatch = line.match(/^###(.*)###$/);
      if (headerMatch) {
        const header = headerMatch[1].toUpperCase();
        if (/CANCEL|REFUND/.test(header)) activeCategory = "cancellation";
        else if (/DATE\s+CHANGE|RESCHEDUL|REISSUE/.test(header)) activeCategory = "dateChange";
        else if (/BAGGAGE|LUGGAGE/.test(header)) activeCategory = "baggage";
        else if (/ADDITIONAL|OTHER|CONVENIENCE|SEAT|MEAL/.test(header)) activeCategory = "additional";
        else activeCategory = "general";
        return;
      }

      // If line contains multiple semicolon-separated points, split them
      const points =
        line.includes(";") && line.length > 40
          ? line.split(";").map((p) => p.trim()).filter((p) => p.length > 2)
          : [line];

      points.forEach((pt) => {
        let cat = activeCategory;
        if (/^(cancellation|refund)/i.test(pt)) cat = "cancellation";
        else if (/^(date\s*change|reschedule|reissue)/i.test(pt)) cat = "dateChange";
        else if (/^(baggage|cabin|check-?in)/i.test(pt)) cat = "baggage";
        else if (/^(convenience|seat\s*selection|meal|additional|snack|beverage)/i.test(pt))
          cat = "additional";

        // Clean redundant leading labels
        const cleanedPt = pt
          .replace(
            /^(cancellation|refund|date\s*change|rescheduling|reissue|baggage|additional\s*charges):\s*/i,
            ""
          )
          .trim();

        if (!cleanedPt) return;
        const parsed = parseRulePoint(cleanedPt, sectorLabel);
        if (!parsed) return;

        if (cat === "baggage") baggagePoints.push(parsed);
        else if (cat === "dateChange") dateChangePoints.push(parsed);
        else if (cat === "cancellation") cancellationPoints.push(parsed);
        else if (cat === "additional") additionalChargesPoints.push(parsed);
        else generalRules.push(parsed);
      });
    });
  });

  // 6. Process MiniFareRules from API if available
  if (Array.isArray(miniFareRules) && miniFareRules.length > 0) {
    miniFareRules.forEach((m) => {
      if (!m) return;
      const cat = String(m.Type || m.Category || "").toLowerCase();
      const text = m.Details || m.Rule || m.Desc || "";
      if (!text) return;
      const parsed = parseRulePoint(text);
      if (!parsed) return;

      if (/cancel|refund/.test(cat)) cancellationPoints.push(parsed);
      else if (/date|change|resched/.test(cat)) dateChangePoints.push(parsed);
      else if (/baggage|luggage/.test(cat)) baggagePoints.push(parsed);
      else if (/fee|charge|seat|meal/.test(cat)) additionalChargesPoints.push(parsed);
      else generalRules.push(parsed);
    });
  }

  // Deduplicate points in each section by normalized text
  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((item) => {
      if (!item || !item.raw) return false;
      const key = `${item.sectorLabel || ""}_${item.raw.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    flightInfo: info,
    baggage: dedupe(baggagePoints),
    dateChange: dedupe(dateChangePoints),
    cancellation: dedupe(cancellationPoints),
    additional: dedupe(additionalChargesPoints),
    general: dedupe(generalRules),
    specialRule: specialRule ? stripHtml(specialRule) : null,
    airlineRules,
  };
}

export default function StructuredFareRules({ data, flight }) {
  const sections = useMemo(() => {
    return parseFareRuleDetails({ data, flight });
  }, [data, flight]);

  const {
    flightInfo,
    baggage,
    dateChange,
    cancellation,
    additional,
    general,
    specialRule,
    airlineRules,
  } = sections;

  const hasSpecificRules =
    dateChange.length > 0 ||
    cancellation.length > 0 ||
    additional.length > 0 ||
    general.length > 0 ||
    Boolean(specialRule) ||
    Boolean(airlineRules);

  return (
    <div className="structured-fare-rules-container">
      {/* 1. FLIGHT INFORMATION SECTION */}
      <div className="fare-rule-section-card flight-summary-section">
        <div className="fare-rule-section-header">
          <div className="section-title-wrap">
            <Plane size={18} className="section-icon flight-icon" />
            <h4>Flight Information</h4>
          </div>
          <span className="route-badge">
            {flightInfo.source} ➔ {flightInfo.destination}
          </span>
        </div>

        <div className="flight-info-grid">
          <div className="flight-info-item">
            <span className="info-label">Airline</span>
            <span className="info-value">
              {flightInfo.airlineName}{" "}
              {flightInfo.flightNumber ? `(${flightInfo.flightNumber})` : ""}
            </span>
          </div>

          <div className="flight-info-item">
            <span className="info-label">Sector</span>
            <span className="info-value">
              {flightInfo.sourceCity || flightInfo.source} to{" "}
              {flightInfo.destinationCity || flightInfo.destination}
            </span>
          </div>

          {flightInfo.fareBasis && (
            <div className="flight-info-item">
              <span className="info-label">Fare Basis</span>
              <span className="info-value">
                <code className="fare-basis-code">{flightInfo.fareBasis}</code>
              </span>
            </div>
          )}

          <div className="flight-info-item">
            <span className="info-label">Cabin Class</span>
            <span className="info-value">{flightInfo.cabinClass}</span>
          </div>

          {flightInfo.isRefundable && (
            <div className="flight-info-item">
              <span className="info-label">Refundability</span>
              <span
                className={`info-value refundable-badge ${flightInfo.isRefundable === "Refundable" ? "refundable" : "non-refundable"
                  }`}
              >
                {flightInfo.isRefundable}
              </span>
            </div>
          )}

          {flightInfo.isConnecting && (
            <div className="flight-info-item">
              <span className="info-label">Flight Type</span>
              <span className="info-value" style={{ color: "#d97706", fontWeight: 600 }}>
                Connecting ({flightInfo.segmentCount} segments)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SPECIAL RULE / AIRLINE ALERT */}
      {specialRule && (
        <div className="fare-rule-alert-banner">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-content">
            <strong>Important Airline Note:</strong>
            <p>{specialRule}</p>
          </div>
        </div>
      )}

      {/* 2. BAGGAGE ALLOWANCE SECTION */}
      <div className="fare-rule-section-card">
        <div className="fare-rule-section-header">
          <div className="section-title-wrap">
            <Briefcase size={18} className="section-icon baggage-icon" />
            <h4>Baggage Allowance</h4>
          </div>
          <span className="section-meta-badge">Per Passenger</span>
        </div>

        {baggage.length > 0 ? (
          <ul className="fare-rule-point-list">
            {baggage.map((item, idx) => (
              <li key={idx} className="fare-rule-point-row">
                <CheckCircle2 size={15} className="point-bullet-icon success" />
                <div className="point-text-wrap">
                  <span className="point-text">{item.raw}</span>
                  {item.fee && <span className="point-fee-pill">{item.fee}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fare-rule-empty-note">
            Standard airline baggage policy applies. Check-in and cabin baggage details will be confirmed on your e-ticket.
          </p>
        )}
      </div>

      {/* 3. DATE CHANGE / RESCHEDULING SECTION */}
      <div className="fare-rule-section-card">
        <div className="fare-rule-section-header">
          <div className="section-title-wrap">
            <Clock size={18} className="section-icon change-icon" />
            <h4>Date Change &amp; Rescheduling Policy</h4>
          </div>
          <span className="section-meta-badge change-badge">Per Sector / Pax</span>
        </div>

        {dateChange.length > 0 ? (
          <ul className="fare-rule-point-list">
            {dateChange.map((item, idx) => (
              <li key={idx} className="fare-rule-point-row">
                <Clock size={15} className="point-bullet-icon change" />
                <div className="point-text-wrap">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {item.sectorLabel && (
                      <span className="route-badge" style={{ fontSize: "0.72rem", padding: "1px 6px" }}>
                        {item.sectorLabel}
                      </span>
                    )}
                    <span className="point-text">{item.raw}</span>
                  </div>
                  <div className="point-tags-row">
                    {item.timeWindow && (
                      <span className="point-time-pill">
                        ⏱ {item.timeWindow}
                      </span>
                    )}
                    {item.fee && (
                      <span className="point-fee-pill change">
                        Fee: {item.fee}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fare-rule-empty-note">
            Date changes permitted subject to airline fare difference and standard rescheduling fee prior to scheduled flight departure.
          </p>
        )}
      </div>

      {/* 4. CANCELLATION POLICY SECTION */}
      <div className="fare-rule-section-card">
        <div className="fare-rule-section-header">
          <div className="section-title-wrap">
            <XCircle size={18} className="section-icon cancel-icon" />
            <h4>Cancellation &amp; Refund Policy</h4>
          </div>
          <span className="section-meta-badge cancel-badge">Per Sector / Pax</span>
        </div>

        {cancellation.length > 0 ? (
          <ul className="fare-rule-point-list">
            {cancellation.map((item, idx) => (
              <li key={idx} className="fare-rule-point-row">
                <XCircle size={15} className="point-bullet-icon cancel" />
                <div className="point-text-wrap">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {item.sectorLabel && (
                      <span className="route-badge" style={{ fontSize: "0.72rem", padding: "1px 6px" }}>
                        {item.sectorLabel}
                      </span>
                    )}
                    <span className="point-text">{item.raw}</span>
                  </div>
                  <div className="point-tags-row">
                    {item.timeWindow && (
                      <span className="point-time-pill cancel-time">
                        ⏳ {item.timeWindow}
                      </span>
                    )}
                    {item.fee && (
                      <span className="point-fee-pill cancel">
                        Fee: {item.fee}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fare-rule-empty-note">
            {flightInfo.isRefundable === "Refundable"
              ? "Cancellation is permitted subject to airline cancellation penalty. Applicable taxes are refundable. Convenience fees are non-refundable."
              : "Standard airline fare rules apply. Non-refundable fares are subject to airline terms; government taxes may be refunded upon cancellation."}
          </p>
        )}
      </div>

      {/* 5. ADDITIONAL CHARGES & SERVICES SECTION */}
      {additional.length > 0 && (
        <div className="fare-rule-section-card">
          <div className="fare-rule-section-header">
            <div className="section-title-wrap">
              <Receipt size={18} className="section-icon fee-icon" />
              <h4>Additional Charges &amp; Ancillary Services</h4>
            </div>
            <span className="section-meta-badge">Optional</span>
          </div>

          <ul className="fare-rule-point-list">
            {additional.map((item, idx) => (
              <li key={idx} className="fare-rule-point-row">
                <Tag size={14} className="point-bullet-icon fee" />
                <div className="point-text-wrap">
                  <span className="point-text">{item.raw}</span>
                  {item.fee && <span className="point-fee-pill fee">{item.fee}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. GENERAL RULES & CONDITIONS */}
      {general.length > 0 && (
        <div className="fare-rule-section-card general-rules-section">
          <div className="fare-rule-section-header">
            <div className="section-title-wrap">
              <Info size={18} className="section-icon general-icon" />
              <h4>General Terms &amp; Conditions</h4>
            </div>
          </div>

          <ul className="fare-rule-point-list general-list">
            {general.map((item, idx) => (
              <li key={idx} className="fare-rule-point-row">
                <span className="point-bullet-dot" />
                <div className="point-text-wrap">
                  <span className="point-text">{item.raw}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. AIRLINE PASSENGER CRITERIA */}
      {airlineRules && (
        <div className="fare-rule-section-card airline-criteria-section">
          <div className="fare-rule-section-header">
            <div className="section-title-wrap">
              <ShieldAlert size={18} className="section-icon" />
              <h4>Passenger Name Requirements</h4>
            </div>
          </div>
          <ul className="fare-rule-point-list">
            {airlineRules.FirstNameMinChar && (
              <li className="fare-rule-point-row">
                <span className="point-bullet-dot" />
                <span className="point-text">
                  First name must be at least {airlineRules.FirstNameMinChar} characters long.
                </span>
              </li>
            )}
            {airlineRules.LastNameMinChar && (
              <li className="fare-rule-point-row">
                <span className="point-bullet-dot" />
                <span className="point-text">
                  Last name must be at least {airlineRules.LastNameMinChar} characters long.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {!hasSpecificRules && (
        <div className="fare-rule-empty-state" style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "16px", marginTop: "12px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <Info size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
            <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>
              Standard Airline Policy Applies
            </strong>
            Standard airline fare rules and cancellation policies apply for this flight. Specific cancellation fees and date-change charges depend on airline fare class rules at the time of request. Baggage allowance is as indicated on your booking confirmation and e-ticket.
          </div>
        </div>
      )}
    </div>
  );
}
