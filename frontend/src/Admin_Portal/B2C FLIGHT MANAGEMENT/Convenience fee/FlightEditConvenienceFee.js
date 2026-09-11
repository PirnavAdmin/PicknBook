import React, { useEffect, useMemo, useState } from "react";
import { List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createConvenienceFee,
  getConvenienceFee,
  updateConvenienceFeeById,
} from "../../../services/flightBookingService";
import "./FlightEditConvenienceFee.css";

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAmountType = (value, fallback = "Fixed") => {
  const text = normalizeText(value, fallback);
  const key = text.toLowerCase();
  if (key === "percentage" || key === "percent") {
    return "Percentage";
  }
  return "Fixed";
};

const normalizeStatus = (value, fallback = "Active") => {
  const text = normalizeText(value, fallback);
  const key = text.toLowerCase();
  if (key.includes("inactive") || key.includes("disabled") || key.includes("deactive")) {
    return "Inactive";
  }
  return "Active";
};

const normalizeFeeRecord = (record, index = 0) => {
  return {
    id: normalizeText(record?.id, `${index + 1}`),
    amountType: normalizeAmountType(record?.amountType, "Fixed"),
    value: toSafeNumber(record?.value, 0),
    entryDateUtc: normalizeText(record?.entryDateUtc, ""),
    updateDateUtc: normalizeText(record?.updateDateUtc || record?.updatedAtUtc, ""),
    updatedBy: normalizeText(record?.updatedBy, "system"),
    status: normalizeStatus(record?.status, "Active"),
  };
};

function resolveHeading(isEditing) {
  return isEditing ? "Edit B2C Flight Convenience Fee" : "Add B2C Flight Convenience Fee";
}

const DEFAULT_FORM = {
  id: "",
  amountType: "Fixed",
  value: "",
  entryDateUtc: "",
  updateDateUtc: "",
  updatedBy: "",
  status: "Active",
};

const toConveniencePayload = (values, { includeId = false } = {}) => {
  const normalized = {
    amountType: normalizeAmountType(values.amountType, "Fixed"),
    value: toSafeNumber(values.value, 0),
    updatedBy: normalizeText(values.updatedBy, "system"),
    status: normalizeStatus(values.status, "Active"),
  };

  if (includeId) {
    normalized.id = values.id;
    normalized.entryDateUtc = values.entryDateUtc || null;
    normalized.updateDateUtc = values.updateDateUtc || new Date().toISOString();
  }

  return normalized;
};

export default function AdminFlightEditConvenienceFeePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = normalizeText(searchParams.get("ref_id"), "");
  const isEditing = Boolean(refId);
  const [feeRecord, setFeeRecord] = useState(null);
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRecord = async () => {
      if (!isEditing) {
        setFeeRecord(null);
        setFormValues(DEFAULT_FORM);
        setIsLoading(false);
        return;
      }

      try {
        const data = await getConvenienceFee();
        const normalized = Array.isArray(data)
          ? data.map((item, index) => normalizeFeeRecord(item, index)).find(
              (item) => normalizeText(item.id, "") === refId
            ) || null
          : data && typeof data === "object"
            ? normalizeFeeRecord(data)
            : null;

        if (!cancelled) {
          setFeeRecord(normalized);
          setFormValues(
            normalized
              ? {
                  id: normalized.id,
                  amountType: normalized.amountType,
                  value: normalized.value ? String(normalized.value) : "",
                  entryDateUtc: normalized.entryDateUtc,
                  updateDateUtc: normalized.updateDateUtc,
                  updatedBy: normalized.updatedBy,
                  status: normalized.status,
                }
              : DEFAULT_FORM
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error?.message || "Failed to load convenience fee.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRecord();

    return () => {
      cancelled = true;
    };
  }, [isEditing, refId]);

  const handleChange = (field) => (event) => {
    setFormValues((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleUpdate = async () => {
    setStatusMessage("");
    setErrorMessage("");

    const numericValue = Number(formValues.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setErrorMessage("Enter a valid value greater than 0.");
      return;
    }

    if (String(formValues.amountType || "").toLowerCase() === "percentage" && numericValue > 100) {
      setErrorMessage("Percentage value must be between 0 and 100.");
      return;
    }

    try {
      if (isEditing) {
        await updateConvenienceFeeById(
          refId,
          toConveniencePayload(
            {
              ...formValues,
              value: numericValue,
              updateDateUtc: new Date().toISOString(),
            },
            { includeId: true }
          )
        );
      } else {
        try {
          await createConvenienceFee(
            toConveniencePayload({
              ...formValues,
              value: numericValue,
            })
          );
        } catch (error) {
          if (Number(error?.status) === 400) {
            await updateConvenienceFeeById(
              formValues.id || 1,
              toConveniencePayload(
                {
                  ...formValues,
                  id: formValues.id || 1,
                  value: numericValue,
                  entryDateUtc: formValues.entryDateUtc || new Date().toISOString(),
                  updateDateUtc: new Date().toISOString(),
                },
                { includeId: true }
              )
            );
          } else {
            throw error;
          }
        }
      }

      navigate("/admin/b2c-flight/convenience-fee");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to save convenience fee.");
    }
  };

  if (isLoading) {
    return (
      <section className="admin-b2c-page admin-flight-fee-edit-page">
        <div className="admin-data-info">Loading convenience fee...</div>
      </section>
    );
  }

  if (isEditing && !feeRecord) {
    return (
      <section className="admin-b2c-page admin-flight-fee-edit-page">
        <div className="admin-flight-fee-edit-head-row">
          <header className="admin-b2c-header admin-flight-fee-edit-header">
            <h1>{resolveHeading(true)}</h1>
          </header>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="admin-flight-fee-list-btn"
              onClick={() => navigate("/admin/b2c-flight/convenience-fee")}
            >
              <List size={14} />
              B2C Flight Convenience Fee
            </button>
          </div>
        </div>

        <div className="admin-data-error">Convenience fee record not found.</div>
      </section>
    );
  }

  return (
    <section className="admin-b2c-page admin-flight-fee-edit-page">
      <div className="admin-flight-fee-edit-head-row">
        <header className="admin-b2c-header admin-flight-fee-edit-header">
          <h1>{resolveHeading(isEditing)}</h1>
        </header>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="admin-flight-fee-list-btn"
            onClick={() => navigate("/admin/b2c-flight/convenience-fee")}
          >
            <List size={14} />
            B2C Flight Convenience Fee
          </button>
        </div>
      </div>

      <section className="admin-flight-fee-edit-shell">
        <div className="admin-flight-fee-edit-row">
          {isEditing && (
            <>
              <div className="admin-flight-fee-edit-label">ID</div>
              <div className="admin-flight-fee-edit-field">
                <input type="text" value={formValues.id} disabled />
              </div>
            </>
          )}

          <div className="admin-flight-fee-edit-label">Amount Type</div>
          <div className="admin-flight-fee-edit-field">
            <select value={formValues.amountType} onChange={handleChange("amountType")}>
              <option value="Fixed">Fixed</option>
              <option value="Percentage">Percentage</option>
            </select>
          </div>

          <div className="admin-flight-fee-edit-label">Value</div>
          <div className="admin-flight-fee-edit-field">
            <input
              type="number"
              min="0"
              step={String(formValues.amountType || "").toLowerCase() === "percentage" ? "0.01" : "1"}
              value={formValues.value}
              onChange={handleChange("value")}
              placeholder={formValues.amountType === "Percentage" ? "Enter percentage" : "Enter fixed value"}
            />
          </div>

          {isEditing && (
            <>
              <div className="admin-flight-fee-edit-label">Entry Date</div>
              <div className="admin-flight-fee-edit-field">
                <input type="text" value={formValues.entryDateUtc} disabled />
              </div>

              <div className="admin-flight-fee-edit-label">Update Date</div>
              <div className="admin-flight-fee-edit-field">
                <input type="text" value={formValues.updateDateUtc} disabled />
              </div>
            </>
          )}

          <div className="admin-flight-fee-edit-label">Updated By</div>
          <div className="admin-flight-fee-edit-field">
            <input type="text" value={formValues.updatedBy} onChange={handleChange("updatedBy")} />
          </div>

          <div className="admin-flight-fee-edit-label">Status</div>
          <div className="admin-flight-fee-edit-field">
            <select value={formValues.status} onChange={handleChange("status")}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="admin-flight-fee-edit-actions">
          <button type="button" className="admin-flight-fee-update-btn" onClick={handleUpdate}>
            {isEditing ? "Update" : "Submit"}
          </button>
        </div>
      </section>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-data-info">{statusMessage}</div> : null}
    </section>
  );
}

