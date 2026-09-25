import React, { useEffect, useMemo, useState } from "react";
import { Download, PencilLine, PlusCircle, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./PendingAirlinesList.css";
import { listFlightPendingAirlines, deleteFlightPendingAirline } from "../../../services/flightBookingService";
import AdminPagination from "../../../components/AdminPagination";

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

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

const formatPendingAirlineDateTime = (value) => {
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

export default function AdminFlightPendingAirlineListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalItems = records.length;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return records.slice(startIndex, startIndex + itemsPerPage);
  }, [records, currentPage]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await listFlightPendingAirlines();
        if (Array.isArray(data)) {
          setRecords(data.map((record, index) => normalizePendingAirlineRecord(record, index)));
        } else {
          setRecords(readPendingAirlinesFallback());
        }
      } catch (error) {
        console.warn("Failed to load pending airlines from backend, using fallback storage", error);
        setRecords(readPendingAirlinesFallback());
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [refreshKey]);

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const headers = [
      "sn",
      "id",
      "airlineCode",
      "fareType",
      "updatedBy",
      "updatedOn",
      "remark",
    ];

    const lines = [
      headers.join(","),
      ...records.map((record, index) =>
        [
          index + 1,
          record.id,
          record.airlineCode,
          record.fareType,
          record.updatedBy,
          record.updatedAtUtc,
          record.remark,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `pending-airlines-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDelete = async (record) => {
    const ok = window.confirm(`Delete pending airline ${safeValue(record?.airlineCode)}?`);
    if (!ok) {
      return;
    }

    try {
      await deleteFlightPendingAirline(record?.id);
    } catch (error) {
      console.error("Failed to delete record from API", error);
      // Fallback local deletion
      const remaining = records.filter((r) => r.id !== record.id);
      window.localStorage.setItem(FLIGHT_PENDING_AIRLINE_STORAGE_KEY, JSON.stringify(remaining));
    }
    setRefreshKey((value) => value + 1);
  };

  return (
    <section className="admin-b2c-page admin-flight-pending-page">
      <div className="admin-flight-pending-toolbar">
        <header className="admin-b2c-header admin-flight-pending-header">
          <h1>
            <span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Pending Airline List
          </h1>
        </header>

        <div className="admin-actions-row admin-flight-pending-actions-row">
          <button
            type="button"
            className="admin-flight-pending-btn"
            onClick={() => navigate("/admin/b2c-flight/pending-airline-edit-list")}
          >
            <PlusCircle size={15} />
            Add Pending Airline
          </button>
          <button type="button" className="admin-flight-pending-btn secondary" onClick={handleExport}>
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {errorMessage ? <div className="admin-data-error">{errorMessage}</div> : null}

      <section className="admin-cancel-table-shell admin-flight-pending-table-shell">
        <header className="admin-cancel-table-head admin-flight-pending-table-head">
          <span>SN</span>
          <span>ID</span>
          <span>Airline Code</span>
          <span>Fare Type</span>
          <span>Updated by</span>
          <span>Updated On</span>
          <span>Remark</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-cancel-empty">Loading pending airlines...</div>
        ) : paginatedRecords.length ? (
          <div className="admin-cancel-table-body">
            {paginatedRecords.map((record, index) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
              return (
                <article
                  key={`pending-airline-${record.id}-${record.updatedAtUtc}`}
                  className="admin-cancel-table-row admin-flight-pending-table-row"
                >
                  <div className="admin-cancel-cell admin-cell-centered">
                    <span>{globalIndex}</span>
                  </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <span>{safeValue(record.id)}</span>
                </div>

                <div className="admin-cancel-cell">
                  <span>{safeValue(record.airlineCode)}</span>
                </div>

                <div className="admin-cancel-cell">
                  <span>{safeValue(record.fareType)}</span>
                </div>

                <div className="admin-cancel-cell">
                  <span>{safeValue(record.updatedBy)}</span>
                </div>

                <div className="admin-cancel-cell">
                  <span>{formatPendingAirlineDateTime(record.updatedAtUtc)}</span>
                </div>

                <div className="admin-cancel-cell">
                  <span>{safeValue(record.remark, "--")}</span>
                </div>

                <div className="admin-cancel-cell admin-cell-centered admin-flight-pending-action-cell">
                  <button
                    type="button"
                    className="admin-flight-pending-icon-btn view"
                    aria-label={`View pending airline ${record.id}`}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-pending-icon-btn edit"
                    aria-label={`Edit pending airline ${record.id}`}
                    onClick={() =>
                      navigate(
                        `/admin/b2c-flight/pending-airline-edit-list?ref_id=${encodeURIComponent(
                          String(record.id)
                        )}`
                      )
                    }
                  >
                    <PencilLine size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-pending-icon-btn delete"
                    aria-label={`Delete pending airline ${record.id}`}
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          </div>
        ) : (
          <div className="admin-cancel-empty">not found any record.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="pending airlines"
        />
      </section>

      {selectedRecord ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedRecord(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Pending airline details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Pending Airline Detail</h2>
                <p className="admin-view-header-subtitle">
                  ID {safeValue(selectedRecord.id)} | {safeValue(selectedRecord.updatedBy)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Airline Code</span>
                <strong>{safeValue(selectedRecord.airlineCode)}</strong>
              </div>
              <div>
                <span>Fare Type</span>
                <strong>{safeValue(selectedRecord.fareType)}</strong>
              </div>
              <div>
                <span>Updated By</span>
                <strong>{safeValue(selectedRecord.updatedBy)}</strong>
              </div>
              <div>
                <span>Updated On</span>
                <strong>{formatPendingAirlineDateTime(selectedRecord.updatedAtUtc)}</strong>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span>Remark</span>
                <strong>{safeValue(selectedRecord.remark, "--")}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

