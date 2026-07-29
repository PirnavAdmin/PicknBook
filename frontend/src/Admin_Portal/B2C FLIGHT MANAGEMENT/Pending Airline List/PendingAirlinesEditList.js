/* eslint-disable */
import React, { useEffect, useState } from "react";
import { List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./PendingAirlinesEditList.css";
import {
  getFlightPendingAirlineById,
  createFlightPendingAirline,
  updateFlightPendingAirline
} from "../../../services/flightBookingService";

const FLIGHT_PENDING_AIRLINE_STORAGE_KEY = "admin_flight_pending_airlines_records";

const DEFAULT_PENDING_AIRLINES = [
  {
    id: "35",
    airlineCode: "UK",
    fareType: "SpecialReturn",
    remark: "",
    updatedBy: "Pick N Book",
    updatedAtUtc: "2026-03-18T10:21:00+05:30",
  },
];

const AIRLINE_CODE_SUGGESTIONS = ["UK", "AI", "6E", "SG", "QP", "IX", "G8", "I5"];
const FARE_TYPE_SUGGESTIONS = [
  "SpecialReturn",
  "SpecialOneWay",
  "Published",
  "Corporate",
  "Student",
];

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizePendingAirlineRecord = (record, index = 0) => {
  const fallback = DEFAULT_PENDING_AIRLINES[index] || DEFAULT_PENDING_AIRLINES[0];

  return {
    id: normalizeText(record?.id, normalizeText(fallback?.id, `${index + 1}`)),
    airlineCode: normalizeText(
      record?.airlineCode || record?.AirlineCode || record?.airline_code,
      normalizeText(fallback?.airlineCode, "")
    ),
    fareType: normalizeText(
      record?.fareType || record?.sourceType || record?.FareType || record?.SourceType,
      normalizeText(fallback?.fareType, "")
    ),
    remark: normalizeText(record?.remark || record?.Remark, normalizeText(fallback?.remark, "")),
    updatedBy: normalizeText(
      record?.updatedBy || record?.UpdatedBy,
      normalizeText(fallback?.updatedBy, "Travel Admin")
    ),
    updatedAtUtc: normalizeText(
      record?.updatedAtUtc || record?.updatedOn || record?.UpdatedOn || record?.updatedOnUtc || record?.UpdatedOnUtc,
      normalizeText(fallback?.updatedAtUtc, "")
    ),
  };
};

const readPendingAirlinesFallback = () => {
  if (typeof window === "undefined") {
    return DEFAULT_PENDING_AIRLINES;
  }

  try {
    const raw = window.localStorage.getItem(FLIGHT_PENDING_AIRLINE_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PENDING_AIRLINES;
    }

    return parsed.map((record, index) => normalizePendingAirlineRecord(record, index));
  } catch {
    return DEFAULT_PENDING_AIRLINES;
  }
};

const getFlightPendingAirlineByIdFallback = (recordId) => {
  const normalizedId = normalizeText(recordId, "");
  if (!normalizedId) {
    return null;
  }

  return (
    readPendingAirlinesFallback().find((record) => normalizeText(record.id, "") === normalizedId) ||
    null
  );
};

function resolveHeading(isEditing) {
  return isEditing ? "Edit B2C Pending Airline" : "Add B2C Pending Airline";
}

export default function AdminFlightPendingAirlineEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = normalizeText(searchParams.get("ref_id"), "");
  const isEditing = Boolean(refId);

  const [record, setRecord] = useState(null);
  const [airlineCode, setAirlineCode] = useState("");
  const [fareType, setFareType] = useState("");
  const [remark, setRemark] = useState("");
  const [isLoading, setIsLoading] = useState(isEditing);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    async function loadRecord() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await getFlightPendingAirlineById(refId);
        if (data) {
          const norm = normalizePendingAirlineRecord(data);
          setRecord(norm);
          setAirlineCode(norm.airlineCode);
          setFareType(norm.fareType);
          setRemark(norm.remark);
        } else {
          setErrorMessage("Record not found on backend.");
        }
      } catch (error) {
        console.warn("Failed to load pending airline from API, using local fallback", error);
        const fb = getFlightPendingAirlineByIdFallback(refId);
        if (fb) {
          setRecord(fb);
          setAirlineCode(fb.airlineCode);
          setFareType(fb.fareType);
          setRemark(fb.remark);
        } else {
          setErrorMessage("Record not found.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadRecord();
  }, [refId, isEditing]);

  const handleSubmit = async () => {
    setStatusMessage("");
    setErrorMessage("");

    const cleanedAirlineCode = normalizeText(airlineCode, "").toUpperCase();
    const cleanedFareType = normalizeText(fareType, "");

    if (!cleanedAirlineCode) {
      setErrorMessage("Select/Enter an airline code.");
      return;
    }

    if (!cleanedFareType) {
      setErrorMessage("Select/Enter a fare type.");
      return;
    }

    const updatedBy = "Travel Admin";
    const payload = {
      airlineCode: cleanedAirlineCode,
      fareType: cleanedFareType,
      remark: normalizeText(remark, ""),
      updatedBy,
    };

    try {
      if (isEditing) {
        await updateFlightPendingAirline(refId, payload);
        setStatusMessage("Pending airline updated successfully.");
      } else {
        await createFlightPendingAirline(payload);
        setStatusMessage("Pending airline added.");
        setAirlineCode("");
        setFareType("");
        setRemark("");
      }
      setTimeout(() => {
        navigate("/admin/b2c-flight/pending-airline-list");
      }, 600);
    } catch (error) {
      console.error("Failed to save pending airline via API", error);
      setErrorMessage(error?.message || "Unable to save pending airline.");
    }
  };

  if (isEditing && isLoading) {
    return (
      <section className="admin-b2c-page admin-flight-pending-edit-page">
        <div className="admin-flight-pending-edit-head-row">
          <header className="admin-b2c-header admin-flight-pending-edit-header">
            <h1>{resolveHeading(true)}</h1>
          </header>
          <button
            type="button"
            className="admin-flight-pending-edit-list-btn"
            onClick={() => navigate("/admin/b2c-flight/pending-airline-list")}
          >
            <List size={14} />
            Pending Airline List
          </button>
        </div>
        <div className="admin-data-info">Loading pending airline details...</div>
      </section>
    );
  }

  if (isEditing && !record && !isLoading) {
    return (
      <section className="admin-b2c-page admin-flight-pending-edit-page">
        <div className="admin-flight-pending-edit-head-row">
          <header className="admin-b2c-header admin-flight-pending-edit-header">
            <h1>{resolveHeading(true)}</h1>
          </header>

          <button
            type="button"
            className="admin-flight-pending-edit-list-btn"
            onClick={() => navigate("/admin/b2c-flight/pending-airline-list")}
          >
            <List size={14} />
            Pending Airline List
          </button>
        </div>

        <div className="admin-data-error">Pending airline record not found.</div>
      </section>
    );
  }

  return (
    <section className="admin-b2c-page admin-flight-pending-edit-page">
      <div className="admin-flight-pending-edit-head-row">
        <header className="admin-b2c-header admin-flight-pending-edit-header">
          <h1>{resolveHeading(isEditing)}</h1>
        </header>

        <button
          type="button"
          className="admin-flight-pending-edit-list-btn"
          onClick={() => navigate("/admin/b2c-flight/pending-airline-list")}
        >
          <List size={14} />
          Pending Airline List
        </button>
      </div>

      <section className="admin-flight-pending-edit-shell">
        <div className="admin-flight-pending-edit-grid">
          <div className="admin-flight-pending-edit-label">Airline Code</div>
          <div className="admin-flight-pending-edit-field">
            <select
              value={airlineCode}
              onChange={(event) => setAirlineCode(event.target.value)}
            >
              <option value="">Select Some Options</option>
              {AIRLINE_CODE_SUGGESTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-flight-pending-edit-label">Fare Type</div>
          <div className="admin-flight-pending-edit-field">
            <select
              value={fareType}
              onChange={(event) => setFareType(event.target.value)}
            >
              <option value="">Select Some Options</option>
              {FARE_TYPE_SUGGESTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-flight-pending-edit-label">Remark</div>
          <div className="admin-flight-pending-edit-field admin-flight-pending-edit-field-wide">
            <input
              type="text"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Remark"
            />
          </div>
        </div>

        <div className="admin-flight-pending-edit-actions">
          <button type="button" className="admin-flight-pending-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </section>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-data-info">{statusMessage}</div> : null}
    </section>
  );
}
