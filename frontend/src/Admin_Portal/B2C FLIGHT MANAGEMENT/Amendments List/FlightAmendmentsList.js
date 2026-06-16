import React, { useMemo, useState, useEffect } from "react";
import "./FlightAmendmentsList.css";
import { listAdminAmendments } from "../../../services/flightBookingService";
import AdminPagination from "../../../components/AdminPagination";

const FLIGHT_AMENDMENTS_STORAGE_KEY = "admin_flight_amendments_records";

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeAmendmentRecord = (record, index = 0) => {
  return {
    id: normalizeText(record?.id, `${index + 1}`),
    requestDateUtc: normalizeText(record?.requestDateUtc || record?.requestDate, ""),
    from: normalizeText(record?.from, ""),
    to: normalizeText(record?.to, ""),
    segment: normalizeText(record?.segment, ""),
    customerName: normalizeText(record?.customerName, ""),
    customerPhone: normalizeText(record?.customerPhone, ""),
    status: normalizeText(record?.status, "Pending"),
    supplierRemark: normalizeText(record?.supplierRemark, ""),
    customerRemark: normalizeText(record?.customerRemark, ""),
    adminRemark: normalizeText(record?.adminRemark, ""),
    updatedBy: normalizeText(record?.updatedBy, "Travel Admin"),
  };
};

const readAmendmentRecords = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FLIGHT_AMENDMENTS_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((record, index) => normalizeAmendmentRecord(record, index));
  } catch {
    return [];
  }
};

const writeAmendmentRecords = (records) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      FLIGHT_AMENDMENTS_STORAGE_KEY,
      JSON.stringify(records.map((record, index) => normalizeAmendmentRecord(record, index)))
    );
  } catch {
    // Ignore localStorage write failures.
  }
};

const listFlightAmendments = () => {
  const records = readAmendmentRecords();
  writeAmendmentRecords(records);
  return records;
};

const formatAmendmentDateTime = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const DEFAULT_FILTERS = {
  id: "",
  customer: "",
  status: "all",
  fromDate: "",
  toDate: "",
};

const safeValue = (value, fallback = "--") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toNumberDate = (value) => {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
};

function normalizeStatusKey(status) {
  const key = String(status || "").trim().toLowerCase();
  if (!key) {
    return "pending";
  }

  if (key.includes("approve") || key.includes("success") || key.includes("done")) {
    return "success";
  }

  if (key.includes("reject") || key.includes("fail") || key.includes("cancel")) {
    return "cancelled";
  }

  return "pending";
}

function buildSegment(record) {
  const direct = safeValue(record?.segment, "");
  if (direct) {
    return direct;
  }

  const from = safeValue(record?.from, "");
  const to = safeValue(record?.to, "");
  if (from && to) {
    return `${from} → ${to}`;
  }

  return "--";
}

function buildRemark(record) {
  const supplierRemark = safeValue(record?.supplierRemark, "");
  const customerRemark = safeValue(record?.customerRemark, "");
  const adminRemark = safeValue(record?.adminRemark, "");

  const parts = [];
  if (supplierRemark) parts.push(`SR: ${supplierRemark}`);
  if (customerRemark) parts.push(`CR: ${customerRemark}`);
  if (adminRemark) parts.push(`AR: ${adminRemark}`);

  return parts.length ? parts.join(" | ") : "--";
}

export default function AdminFlightAmendmentsListPage() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [records, setRecords] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    async function loadAmendments() {
      try {
        const data = await listAdminAmendments();
        if (Array.isArray(data)) {
          setRecords(data.map((record, index) => normalizeAmendmentRecord(record, index)));
        } else {
          setRecords(listFlightAmendments());
        }
      } catch (error) {
        console.warn("Failed to load amendments from backend, falling back to local storage", error);
        setRecords(listFlightAmendments());
      }
    }
    loadAmendments();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.id) {
        const query = filters.id.toLowerCase();
        if (!String(record.id || "").toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.customer) {
        const query = filters.customer.toLowerCase();
        const lookup = `${record.customerName || ""} ${record.customerPhone || ""}`.toLowerCase();
        if (!lookup.includes(query)) {
          return false;
        }
      }

      const statusFilterKey = String(filters.status || "").toLowerCase();
      if (statusFilterKey && statusFilterKey !== "all") {
        if (String(record.status || "").toLowerCase() !== statusFilterKey) {
          return false;
        }
      }

      const requestTime = toNumberDate(record.requestDateUtc);
      if (filters.fromDate) {
        const fromTime = toNumberDate(filters.fromDate);
        if (Number.isFinite(fromTime) && (!Number.isFinite(requestTime) || requestTime < fromTime)) {
          return false;
        }
      }

      if (filters.toDate) {
        const toTime = toNumberDate(filters.toDate);
        if (Number.isFinite(toTime) && (!Number.isFinite(requestTime) || requestTime > toTime)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, records]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalItems = filteredRecords.length;

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFiltersOpen(false);
  };

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const headers = [
      "id",
      "requestDate",
      "segment",
      "customerName",
      "customerPhone",
      "status",
      "supplierRemark",
      "customerRemark",
      "adminRemark",
      "updatedBy",
    ];

    const lines = [
      headers.join(","),
      ...filteredRecords.map((record) =>
        [
          record.id,
          record.requestDateUtc,
          buildSegment(record),
          record.customerName,
          record.customerPhone,
          record.status,
          record.supplierRemark,
          record.customerRemark,
          record.adminRemark,
          record.updatedBy,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `flight-amendments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-flight-amend-page">
      <header className="admin-b2c-header admin-flight-amend-header">
        <h1>
          <strong>B2C Flight</strong> Amendments List
        </h1>
      </header>

      <div className="admin-toolbar-row admin-flight-amend-toolbar">
        <div className="admin-chip-row">
          <span className="admin-chip">Total Records: {filteredRecords.length}</span>
        </div>

        <div className="admin-actions-row">
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
            {isFiltersOpen ? "Close Filter" : "Filter"}
          </button>
          <button type="button" onClick={clearFilters}>
            Clear Filter
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      {isFiltersOpen ? (
        <section className="flight-ops-filters admin-ops-filters admin-flight-amend-filters">
          <label>
            <span>ID</span>
            <input
              type="text"
              placeholder="Search by request id"
              value={draftFilters.id}
              onChange={(event) => handleFilterChange("id", event.target.value)}
            />
          </label>

          <label>
            <span>Customer</span>
            <input
              type="text"
              placeholder="Search by customer"
              value={draftFilters.customer}
              onChange={(event) => handleFilterChange("customer", event.target.value)}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={draftFilters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>

          <label>
            <span>From Date</span>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => handleFilterChange("fromDate", event.target.value)}
            />
          </label>

          <label>
            <span>To Date</span>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => handleFilterChange("toDate", event.target.value)}
            />
          </label>

          <div className="filters-actions admin-flight-amend-filter-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Reset
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-cancel-table-shell admin-flight-amend-table-shell">
        <header className="admin-cancel-table-head admin-flight-amend-table-head">
          <span>Id &amp; Request Date</span>
          <span>Segment</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Remark</span>
          <span>Details</span>
        </header>

        {paginatedRecords.length ? (
          <div className="admin-cancel-table-body">
            {paginatedRecords.map((record) => (
              <article
                key={`flight-amend-${record.id}-${record.requestDateUtc}`}
                className="admin-cancel-table-row admin-flight-amend-table-row"
              >
                <div className="admin-cancel-cell">
                  <strong>{safeValue(record.id)}</strong>
                  <small>RD: {formatAmendmentDateTime(record.requestDateUtc)}</small>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{buildSegment(record)}</strong>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{safeValue(record.customerName)}</strong>
                  <small>{safeValue(record.customerPhone)}</small>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <span className={`admin-status-pill ${normalizeStatusKey(record.status)}`}>
                    {safeValue(record.status)}
                  </span>
                </div>

                <div className="admin-cancel-cell">
                  <strong>{buildRemark(record)}</strong>
                </div>

                <div className="admin-cancel-cell admin-cell-centered">
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => setSelectedRecord(record)}
                  >
                    View
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
          itemName="amendment requests"
        />

        <footer className="admin-flight-amend-footnote">
          <strong>RD :-</strong> Request Date, <strong>AS :-</strong> Amendments Status,{" "}
          <strong>SR :-</strong> Supplier Remark, <strong>CR :-</strong> Customer Remark,{" "}
          <strong>AR :-</strong> Admin Remark
        </footer>
      </section>

      {selectedRecord ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedRecord(null)}>
          <article
            className="admin-view-card"
            role="dialog"
            aria-modal="true"
            aria-label="Amendment request details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-view-header">
              <div className="admin-view-header-main">
                <h2>Amendment Request Detail</h2>
                <p className="admin-view-header-subtitle">
                  {safeValue(selectedRecord.id)} | {safeValue(selectedRecord.customerName)}
                </p>
                <div className="admin-view-meta-row">
                  <span className={`admin-view-meta-chip ${normalizeStatusKey(selectedRecord.status)}`}>
                    {safeValue(selectedRecord.status)}
                  </span>
                  <span className="admin-view-meta-chip">{buildSegment(selectedRecord)}</span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </header>

            <section className="admin-view-grid">
              <div>
                <span>Request Date</span>
                <strong>{formatAmendmentDateTime(selectedRecord.requestDateUtc)}</strong>
              </div>
              <div>
                <span>Customer Phone</span>
                <strong>{safeValue(selectedRecord.customerPhone)}</strong>
              </div>
              <div>
                <span>Segment</span>
                <strong>{buildSegment(selectedRecord)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{safeValue(selectedRecord.status)}</strong>
              </div>
              <div>
                <span>Supplier Remark</span>
                <strong>{safeValue(selectedRecord.supplierRemark, "--")}</strong>
              </div>
              <div>
                <span>Customer Remark</span>
                <strong>{safeValue(selectedRecord.customerRemark, "--")}</strong>
              </div>
              <div className="admin-view-highlight-card">
                <span>Admin Remark</span>
                <strong>{safeValue(selectedRecord.adminRemark, "--")}</strong>
              </div>
              <div>
                <span>Updated By</span>
                <strong>{safeValue(selectedRecord.updatedBy)}</strong>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}

