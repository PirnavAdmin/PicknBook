/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Download, PencilLine, PlusCircle, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./FlightRemarkList.css";
import AdminPagination from "../../../components/AdminPagination";
import { getFlightRemarks, deleteFlightRemark } from "../../../services/flightBookingService";

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeStatusKey = (status) => {
  const key = String(status || "").trim().toLowerCase();
  return key.includes("inactive") ? "inactive" : "active";
};

const FLIGHT_REMARKS_STORAGE_KEY = "admin_flight_remarks_records";

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

const listFlightRemarks = () => {
  const records = readRemarkRecords();
  writeRemarkRecords(records);
  return records;
};

const deleteFlightRemarkById = (remarkId) => {
  const normalizedId = normalizeText(remarkId, "");
  if (!normalizedId) {
    return false;
  }

  const current = listFlightRemarks();
  const next = current.filter((record) => normalizeText(record.id, "") !== normalizedId);
  writeRemarkRecords(next);
  return next.length !== current.length;
};

const formatRemarkDateTime = (value) => {
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

export default function AdminFlightRemarkListPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getFlightRemarks();
        if (active) {
          if (Array.isArray(data)) {
            setRecords(data.map((record, index) => normalizeRemarkRecord(record, index)));
          } else {
            setRecords(listFlightRemarks());
          }
        }
      } catch (err) {
        console.warn("Failed to fetch flight remarks from server, falling back to local storage", err);
        if (active) {
          setRecords(listFlightRemarks());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => { active = false; };
  }, [refreshKey]);

  const sortedAllRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, "")) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [records]);

  const totalItems = sortedAllRecords.length;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAllRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAllRecords, currentPage]);

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const headers = [
      "sn",
      "id",
      "entryDateUtc",
      "updatedAtUtc",
      "sourceType",
      "updatedBy",
      "remark",
      "status",
    ];

    const lines = [
      headers.join(","),
      ...records.map((record, index) =>
        [
          index + 1,
          record.id,
          record.entryDateUtc,
          record.updatedAtUtc,
          record.sourceType,
          record.updatedBy,
          record.remark,
          record.status,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `flight-remarks-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDelete = async (record) => {
    const ok = window.confirm(`Delete remark ${safeValue(record?.id)}?`);
    if (!ok) {
      return;
    }

    try {
      await deleteFlightRemark(record.id);
    } catch (e) {
      console.warn("Failed to delete remark on server, running local fallback", e);
      deleteFlightRemarkById(record?.id);
    }
    setRefreshKey((value) => value + 1);
  };

  return (
    <section className="admin-b2c-page admin-flight-remark-page">
      <div className="admin-flight-remark-toolbar">
        <header className="admin-b2c-header admin-flight-remark-header">
          <h1>
            <span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Remark List
          </h1>
        </header>

        <div className="admin-actions-row admin-flight-remark-actions-row">
          <button
            type="button"
            className="admin-flight-remark-btn"
            onClick={() => navigate("/admin/b2c-flight/remark-edit-list")}
          >
            <PlusCircle size={15} />
            Add Remark
          </button>
          <button type="button" className="admin-flight-remark-btn secondary" onClick={handleExport}>
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <section className="admin-cancel-table-shell admin-flight-remark-table-shell">
        <header className="admin-cancel-table-head admin-flight-remark-table-head">
          <span>ID</span>
          <span>Entry Date</span>
          <span>Update Date</span>
          <span>Source Type</span>
          <span>Updated By</span>
          <span>Remark</span>
          <span>Status</span>
          <span>Action</span>
        </header>

        {paginatedRecords.length ? (
          <div className="admin-cancel-table-body">
            {paginatedRecords.map((record) => (
              <article
                key={`flight-remark-${record.id}-${record.updatedAtUtc}`}
                className="admin-cancel-table-row admin-flight-remark-table-row"
              >
                <div className="admin-cancel-cell admin-cell-centered">
                  <span>{safeValue(record.id)}</span>
                </div>
                <div className="admin-cancel-cell">
                  <span>{formatRemarkDateTime(record.entryDateUtc)}</span>
                </div>
                <div className="admin-cancel-cell">
                  <span>{formatRemarkDateTime(record.updatedAtUtc)}</span>
                </div>
                <div className="admin-cancel-cell">
                  <span>{safeValue(record.sourceType, "--")}</span>
                </div>
                <div className="admin-cancel-cell">
                  <span>{safeValue(record.updatedBy)}</span>
                </div>
                <div className="admin-cancel-cell" style={{ wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "break-word" }}>
                  <span>{safeValue(record.remark, "--")}</span>
                </div>
                <div className="admin-cancel-cell admin-cell-centered">
                  <span className={`admin-flight-remark-status ${normalizeStatusKey(record.status)}`}>
                    {safeValue(record.status, "Active")}
                  </span>
                </div>
                <div className="admin-cancel-cell admin-cell-centered admin-flight-remark-action-cell">
                  <button
                    type="button"
                    className="admin-flight-remark-icon-btn view"
                    aria-label={`View remark ${record.id}`}
                    onClick={() => setViewRecord(record)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-remark-icon-btn edit"
                    aria-label={`Edit remark ${record.id}`}
                    onClick={() =>
                      navigate(
                        `/admin/b2c-flight/remark-edit-list?ref_id=${encodeURIComponent(
                          String(record.id)
                        )}`
                      )
                    }
                  >
                    <PencilLine size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-flight-remark-icon-btn delete"
                    aria-label={`Delete remark ${record.id}`}
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-cancel-empty">not found any record.</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="remarks"
        />
      </section>

      {viewRecord && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewRecord(null)}>
          <div className="admin-markup-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--panel)", borderRadius: "16px", padding: "24px", boxSizing: "border-box" }}>
            <header className="flight-markup-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>View B2C Flight Remark</h2>
              <button className="flight-markup-modal-close" onClick={() => setViewRecord(null)}>X</button>
            </header>
            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Remark ID</span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{viewRecord.id}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Source Type</span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{viewRecord.sourceType}</span>
              </div>
              <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Remark Content</span>
                <p style={{ fontSize: "13px", margin: "0", background: "var(--surface-soft)", color: "var(--text-primary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", wordBreak: "break-word" }}>{viewRecord.remark}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Status</span>
                <div>
                  <span className={`admin-flight-remark-status ${normalizeStatusKey(viewRecord.status)}`}>{viewRecord.status}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Updated By</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{viewRecord.updatedBy}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Created Date</span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{formatRemarkDateTime(viewRecord.entryDateUtc)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Updated Date</span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{formatRemarkDateTime(viewRecord.updatedAtUtc)}</span>
              </div>
            </div>
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button className="admin-flight-remark-btn" onClick={() => setViewRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



