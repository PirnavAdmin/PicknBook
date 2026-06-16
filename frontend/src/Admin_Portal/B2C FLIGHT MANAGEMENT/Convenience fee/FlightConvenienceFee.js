import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, PencilLine, PlusCircle, Power, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deleteConvenienceFee,
  getConvenienceFee,
  updateConvenienceFeeById,
} from "../../../services/flightBookingService";
import "./FlightConvenienceFee.css";
import AdminPagination from "../../../components/AdminPagination";

const FLIGHT_CONVENIENCE_FEE_STORAGE_KEY = "admin_flight_convenience_fee_records";

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

const readFeeRecords = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FLIGHT_CONVENIENCE_FEE_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((record, index) => normalizeFeeRecord(record, index));
  } catch {
    return [];
  }
};

const writeFeeRecords = (records) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      FLIGHT_CONVENIENCE_FEE_STORAGE_KEY,
      JSON.stringify(records.map((record, index) => normalizeFeeRecord(record, index)))
    );
  } catch {
    // Ignore localStorage write failures.
  }
};

const listFlightConvenienceFees = () => {
  const records = readFeeRecords();
  writeFeeRecords(records);
  return records;
};

const updateFlightConvenienceFeeById = (feeId, updates) => {
  const normalizedId = normalizeText(feeId, "");
  if (!normalizedId) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const currentRecords = listFlightConvenienceFees();
  let updatedRecord = null;

  const nextRecords = currentRecords.map((record, index) => {
    if (normalizeText(record.id, "") !== normalizedId) {
      return record;
    }

    updatedRecord = normalizeFeeRecord(
      {
        ...record,
        ...updates,
        updatedAtUtc: nowIso,
      },
      index
    );

    return updatedRecord;
  });

  writeFeeRecords(nextRecords);
  return updatedRecord;
};

const formatConvenienceDateTime = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatFeeLabel(record) {
  const amountType = safeValue(record?.amountType, "Fixed").toLowerCase();
  const value = Number(record?.value) || 0;

  if (amountType === "percentage") {
    return `${value}%`;
  }

  return inrFormatter.format(value);
}

function resolveStatusKey(status) {
  const key = String(status || "").trim().toLowerCase();
  return key.includes("inactive") ? "inactive" : "active";
}

export default function AdminFlightConvenienceFeePage() {
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadFees = async () => {
    try {
      const data = await getConvenienceFee();
      if (Array.isArray(data)) {
        setFees(data.map((item, index) => normalizeFeeRecord(item, index)));
      } else if (data && typeof data === "object") {
        setFees([normalizeFeeRecord(data)]);
      } else {
        setFees(listFlightConvenienceFees());
      }
    } catch (error) {
      console.warn("Failed to load convenience fee from backend, falling back to local storage", error);
      setFees(listFlightConvenienceFees());
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const hasRecords = fees.length > 0;
  const totalItems = fees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedFees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return fees.slice(startIndex, startIndex + itemsPerPage);
  }, [fees, currentPage]);

  const rows = useMemo(() => {
    return paginatedFees.map((item, index) => ({
      item,
      index: (currentPage - 1) * itemsPerPage + index,
      statusKey: resolveStatusKey(item?.status),
    }));
  }, [paginatedFees, currentPage]);

  const handleToggleStatus = async (record) => {
    const nextStatus = resolveStatusKey(record?.status) === "active" ? "Inactive" : "Active";
    const updatedPayload = {
      id: record.id,
      amountType: record.amountType || "Fixed",
      value: record.value,
      entryDateUtc: record.entryDateUtc || null,
      updateDateUtc: new Date().toISOString(),
      updatedBy: record.updatedBy || "system",
      status: nextStatus,
    };

    try {
      await updateConvenienceFeeById(record.id, updatedPayload);
    } catch (e) {
      console.warn("Failed to update status on server", e);
    }

    updateFlightConvenienceFeeById(record?.id, {
      status: nextStatus,
      updatedBy: record?.updatedBy || "system",
    });
    loadFees();
  };

  const handleDeleteFee = async (record) => {
    try {
      await deleteConvenienceFee(record.id);
    } catch (e) {
      console.warn("Failed to delete convenience fee on server", e);
    }

    const nextRecords = listFlightConvenienceFees().filter(
      (item) => normalizeText(item.id, "") !== normalizeText(record.id, "")
    );
    writeFeeRecords(nextRecords);
    setSelectedFee((previous) =>
      normalizeText(previous?.id, "") === normalizeText(record.id, "") ? null : previous
    );
    loadFees();
  };

  return (
    <section className="admin-b2c-page admin-flight-fee-page">
      <div className="admin-flight-fee-toolbar">
        <header className="admin-b2c-header admin-flight-fee-header">
          <h1>B2C Flight Convenience Fee</h1>
        </header>

        <div className="admin-actions-row">
          <button
            type="button"
            className="admin-flight-fee-add-btn"
            onClick={() => navigate("/admin/b2c-flight/convenience-fee/add")}
          >
            <PlusCircle size={15} />
            Add Convenience Fee
          </button>
        </div>
      </div>

      <section className="admin-flight-fee-table-shell">
        <header className="admin-flight-fee-table-head">
          <span>SN.</span>
          <span>Amount Type</span>
          <span>Value</span>
          <span>Entry Date</span>
          <span>Update Date</span>
          <span>Updated By</span>
          <span>Status</span>
          <span>Action</span>
        </header>

        {hasRecords ? (
          <div className="admin-flight-fee-table-body">
            {rows.map(({ item, index, statusKey }) => (
              <article key={item.id} className="admin-flight-fee-table-row">
                <div className="admin-flight-fee-cell admin-flight-fee-cell-center">
                  <strong>{index + 1}</strong>
                </div>

                <div className="admin-flight-fee-cell">
                  <strong>{safeValue(item.amountType, "Fixed")}</strong>
                </div>

                <div className="admin-flight-fee-cell">
                  <strong>{formatFeeLabel(item)}</strong>
                </div>

                <div className="admin-flight-fee-cell">
                  <strong>{formatConvenienceDateTime(item.entryDateUtc)}</strong>
                </div>

                <div className="admin-flight-fee-cell">
                  <strong>{formatConvenienceDateTime(item.updateDateUtc)}</strong>
                </div>

                <div className="admin-flight-fee-cell">
                  <strong>{safeValue(item.updatedBy)}</strong>
                </div>

                <div className="admin-flight-fee-cell admin-flight-fee-cell-center">
                  <span className={`admin-flight-fee-status ${statusKey}`}>
                    <CheckCircle2 size={14} />
                    {safeValue(item.status, "Active")}
                  </span>
                </div>

                <div className="admin-flight-fee-cell admin-flight-fee-actions">
                  <button
                    type="button"
                    className="admin-flight-fee-icon-btn view"
                    aria-label={`View convenience fee ${item.id}`}
                    onClick={() => setSelectedFee(item)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-fee-icon-btn edit"
                    aria-label={`Edit convenience fee ${item.id}`}
                    onClick={() =>
                      navigate(
                        `/admin/b2c-flight/convenience-fee/edit?ref_id=${encodeURIComponent(
                          String(item.id)
                        )}`
                      )
                    }
                  >
                    <PencilLine size={15} />
                  </button>
                  <button
                    type="button"
                    className={`admin-flight-fee-icon-btn toggle ${statusKey}`}
                    aria-label={`Toggle convenience fee ${item.id}`}
                    onClick={() => handleToggleStatus(item)}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-fee-icon-btn delete"
                    aria-label={`Delete convenience fee ${item.id}`}
                    onClick={() => handleDeleteFee(item)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-table-empty">not found any record.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="convenience fees"
        />
      </section>

      {selectedFee ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedFee(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Flight convenience fee details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Convenience Fee Detail</h2>
                <p className="admin-view-header-subtitle">
                  ID {safeValue(selectedFee.id)} | {safeValue(selectedFee.updatedBy)}
                </p>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip success">
                    {safeValue(selectedFee.status)}
                  </span>
                  <span className="admin-view-meta-chip">
                    Fee {formatFeeLabel(selectedFee)}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedFee(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>ID</span>
                <strong>{safeValue(selectedFee.id)}</strong>
              </div>
              <div>
                <span>Amount Type</span>
                <strong>{safeValue(selectedFee.amountType, "Fixed")}</strong>
              </div>
              <div>
                <span>Value</span>
                <strong>{formatFeeLabel(selectedFee)}</strong>
              </div>
              <div>
                <span>Entry Date</span>
                <strong>{formatConvenienceDateTime(selectedFee.entryDateUtc)}</strong>
              </div>
              <div>
                <span>Update Date</span>
                <strong>{formatConvenienceDateTime(selectedFee.updateDateUtc)}</strong>
              </div>
              <div>
                <span>Updated By</span>
                <strong>{safeValue(selectedFee.updatedBy)}</strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Status</span>
                <strong>{safeValue(selectedFee.status)}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

