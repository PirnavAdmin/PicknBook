import React, { useEffect, useMemo, useState } from "react";
import { List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./FlightRemarkEditList.css";
import {
  createFlightRemark as apiCreateFlightRemark,
  getFlightRemarkById as apiGetFlightRemarkById,
  updateFlightRemark as apiUpdateFlightRemark
} from "../../../services/flightBookingService";

const FLIGHT_REMARKS_STORAGE_KEY = "admin_flight_remarks_records";

const SOURCE_TYPE_OPTIONS = [
  "Publish",
  "Corporate",
  "Coupon",
  "SME",
  "Other",
  "Promo",
  "Tactical",
  "Flexi",
  "Special",
  "SpecialReturn",
  "SeniorCitizen",
  "Student",
  "ArmedForce",
  "Plus",
  "Request",
  "Refundable",
  "Standard",
  "Simple",
  "Discount",
  "Value",
  "Flex",
  "Comfort",
  "NDC",
  "CorporateT",
  "SOTO",
  "Classic",
  "SUPER 6E",
  "FULL REFUND*",
  "Light",
  "Xpress Lite",
  "Stretch Fare",
  "NDC Value",
  "Basic",
  "Private",
  "UpFront",
  "StretchPlus",
];

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeStatus = (value, fallback = "Active") => {
  const text = normalizeText(value, fallback);
  const key = text.toLowerCase();
  if (key.includes("inactive") || key.includes("disable") || key.includes("deactive")) {
    return "Inactive";
  }
  return "Active";
};

const normalizeRemarkRecord = (record, index = 0) => {
  const entryDateUtc = normalizeText(
    record?.entryDateUtc || record?.entryDate || record?.EntryDate,
    ""
  );
  const updatedAtUtc = normalizeText(
    record?.updatedAtUtc || record?.updateDate || record?.updatedOn || record?.UpdateDate,
    entryDateUtc
  );

  return {
    id: normalizeText(record?.id, `${index + 1}`),
    sourceType: normalizeText(record?.sourceType || record?.SourceType, ""),
    remark: normalizeText(record?.remark || record?.Remark, ""),
    status: normalizeStatus(record?.status || record?.Status, "Active"),
    entryDateUtc,
    updatedAtUtc,
    updatedBy: normalizeText(record?.updatedBy || record?.UpdatedBy, "Travel Admin"),
  };
};

const readRemarkRecords = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FLIGHT_REMARKS_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((record, index) => normalizeRemarkRecord(record, index));
  } catch {
    return [];
  }
};

const writeRemarkRecords = (records) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      FLIGHT_REMARKS_STORAGE_KEY,
      JSON.stringify(records.map((record, index) => normalizeRemarkRecord(record, index)))
    );
  } catch {
    // Ignore localStorage write failures.
  }
};

const resolveNextRemarkId = (records) => {
  const numericIds = records
    .map((record) => Number(record?.id))
    .filter((value) => Number.isFinite(value));

  if (numericIds.length === 0) {
    return String(Date.now());
  }

  return String(Math.max(...numericIds) + 1);
};

const listFlightRemarks = () => {
  const records = readRemarkRecords();
  writeRemarkRecords(records);
  return records;
};

const getFlightRemarkById = (remarkId) => {
  const normalizedId = normalizeText(remarkId, "");
  if (!normalizedId) {
    return null;
  }

  return (
    listFlightRemarks().find((record) => normalizeText(record.id, "") === normalizedId) ||
    null
  );
};

const createFlightRemark = ({ sourceType, status, remark, updatedBy } = {}) => {
  const nowIso = new Date().toISOString();
  const records = listFlightRemarks();
  const id = resolveNextRemarkId(records);

  const nextRecord = normalizeRemarkRecord(
    {
      id,
      sourceType,
      status: status || "Active",
      remark,
      updatedBy,
      entryDateUtc: nowIso,
      updatedAtUtc: nowIso,
    },
    records.length
  );

  const nextRecords = [nextRecord, ...records];
  writeRemarkRecords(nextRecords);
  return nextRecord;
};

const updateFlightRemarkById = (remarkId, updates) => {
  const normalizedId = normalizeText(remarkId, "");
  if (!normalizedId) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const currentRecords = listFlightRemarks();
  let updatedRecord = null;

  const nextRecords = currentRecords.map((record, index) => {
    if (normalizeText(record.id, "") !== normalizedId) {
      return record;
    }

    updatedRecord = normalizeRemarkRecord(
      {
        ...record,
        ...updates,
        updatedAtUtc: nowIso,
      },
      index
    );

    return updatedRecord;
  });

  writeRemarkRecords(nextRecords);
  return updatedRecord;
};

function resolveHeading(isEditing) {
  return isEditing ? "Edit B2C Remark" : "Add B2C Remark";
}

export default function AdminFlightRemarkEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = normalizeText(searchParams.get("ref_id"), "");
  const isEditing = Boolean(refId);

  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("Active");
  const [remark, setRemark] = useState("");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!refId) return;
    let active = true;
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const data = await apiGetFlightRemarkById(refId);
        if (active && data) {
          setRecord(data);
          setSourceType(data.sourceType || "");
          setStatus(data.status || "Active");
          setRemark(data.remark || "");
        }
      } catch (err) {
        console.warn("Failed to load remark from server, using local fallback", err);
        const local = getFlightRemarkById(refId);
        if (active && local) {
          setRecord(local);
          setSourceType(local.sourceType || "");
          setStatus(local.status || "Active");
          setRemark(local.remark || "");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecord();
    return () => { active = false; };
  }, [refId]);

  const handleReset = () => {
    setSourceType("");
    setStatus("Active");
    setRemark("");
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    const cleanedSourceType = normalizeText(sourceType, "");
    const cleanedRemark = normalizeText(remark, "");

    if (!cleanedSourceType) {
      setErrorMessage("Select source type.");
      return;
    }

    if (!cleanedRemark) {
      setErrorMessage("Enter remark.");
      return;
    }

    const payload = {
      sourceType: cleanedSourceType,
      status,
      remark: cleanedRemark,
      updatedBy: "Travel Admin",
    };

    try {
      if (isEditing) {
        await apiUpdateFlightRemark(refId, payload);
        updateFlightRemarkById(refId, payload);
      } else {
        await apiCreateFlightRemark(payload);
        createFlightRemark(payload);
      }
      setStatusMessage(isEditing ? "Remark updated successfully." : "Remark added successfully.");
      setTimeout(() => {
        navigate("/admin/b2c-flight/remark-list");
      }, 800);
    } catch (err) {
      console.warn("API call failed, running local backup write", err);
      const saved = isEditing
        ? updateFlightRemarkById(refId, payload)
        : createFlightRemark(payload);
      if (saved) {
        setStatusMessage(isEditing ? "Remark updated successfully (offline backup)." : "Remark added successfully (offline backup).");
        setTimeout(() => {
          navigate("/admin/b2c-flight/remark-list");
        }, 800);
      } else {
        setErrorMessage("Unable to save remark.");
      }
    }
  };

  if (isEditing && !record) {
    return (
      <section className="admin-b2c-page admin-flight-remark-edit-page">
        <div className="admin-flight-remark-edit-head-row">
          <header className="admin-b2c-header admin-flight-remark-edit-header">
            <h1>{resolveHeading(true)}</h1>
          </header>

          <button
            type="button"
            className="admin-flight-remark-edit-list-btn"
            onClick={() => navigate("/admin/b2c-flight/remark-list")}
          >
            <List size={14} />
            Remark List
          </button>
        </div>

        <div className="admin-data-error">Remark record not found.</div>
      </section>
    );
  }

  return (
    <section className="admin-b2c-page admin-flight-remark-edit-page">
      <div className="admin-flight-remark-edit-head-row">
        <header className="admin-b2c-header admin-flight-remark-edit-header">
          <h1>
            <span style={{ color: '#A51C49', fontWeight: 700 }}>
              {isEditing ? 'Edit B2C Flight Remark' : 'Add B2C Flight Remark'}
            </span>
          </h1>
        </header>

        <button
          type="button"
          className="admin-flight-remark-edit-list-btn"
          onClick={() => navigate("/admin/b2c-flight/remark-list")}
        >
          <List size={14} />
          Remark List
        </button>
      </div>

      <section className="admin-flight-remark-edit-shell">
        <div className="admin-flight-remark-edit-grid">
          <div className="admin-flight-remark-edit-label">Source Type</div>
          <div className="admin-flight-remark-edit-field">
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="">Select Source Type</option>
              {SOURCE_TYPE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-flight-remark-edit-label">Status</div>
          <div className="admin-flight-remark-edit-field">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="admin-flight-remark-edit-label">Remark</div>
          <div className="admin-flight-remark-edit-field admin-flight-remark-edit-remark">
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Remark"
              rows={4}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--admin-border)",
                background: "var(--admin-panel)",
                color: "var(--admin-text)",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: "80px",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        <div className="admin-flight-remark-edit-actions">
          <button type="button" className="admin-flight-remark-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
          <button type="button" className="admin-flight-remark-reset-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-data-info">{statusMessage}</div> : null}
    </section>
  );
}



