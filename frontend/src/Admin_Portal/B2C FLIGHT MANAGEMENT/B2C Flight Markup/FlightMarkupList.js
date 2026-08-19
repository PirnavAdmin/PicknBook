/* eslint-disable */
import React, { useState, useEffect } from "react";
import { Download, Eye, Pencil, PlaneTakeoff, Plus, Trash2, X } from "lucide-react";
import "./FlightMarkupList.css";
import { formatDateTime } from "../../../utils/adminPortalUtils";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";
import { listFlightMarkups, createFlightMarkup, updateFlightMarkup, deleteFlightMarkup } from "../../../services/flightBookingService";

const INITIAL_FLIGHT_MARKUP_ROWS = [
  {
    id: 1,
    airlineCode: "*",
    tripType: "OneWay",
    markupType: "Percentage",
    markupValue: 10,
    priority: 1,
    isActive: true,
    createdAtUtc: "2026-06-12T04:42:06.854006",
    updatedAtUtc: "2026-06-12T04:42:06.854165",
  },
];

const DEFAULT_MARKUP_FORM = {
  airlineCode: "",
  tripType: "OneWay",
  markupType: "Percentage",
  markupValue: "",
  priority: "",
  isActive: true,
};

const getNextFlightMarkupId = (rows) => {
  const numericRows = rows.map((row) => ({
    id: Number(String(row.id || "").replace(/\D/g, "")) || 0,
  }));
  const nextValue = getNextNumericId(numericRows, 100);
  return `F${nextValue}`;
};

const isServerMarkupId = (value) => /^\d+$/.test(String(value ?? "").trim());

const sanitizeAirlineCode = (value) => {
  const text = String(value || "").trim();
  if (!text || text === "*") {
    return "*";
  }

  return text.replace(/^\*+/, "").toUpperCase() || "*";
};

const toBackendMarkupType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "fixed" || normalized === "flat" ? "Flat" : "Percentage";
};

const toDisplayMarkupType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "fixed" || normalized === "flat" ? "Fixed" : "Percentage";
};

const normalizeMarkupRow = (markup) => {
  return {
    id: markup.id,
    airlineCode: String(markup.airlineCode ?? "*"),
    tripType: String(markup.tripType ?? "OneWay"),
    markupType: toDisplayMarkupType(markup.markupType ?? "Percentage"),
    markupValue: Number(markup.markupValue ?? 0),
    priority: Number(markup.priority ?? 1),
    isActive: Boolean(markup.isActive),
    createdAtUtc: markup.createdAtUtc || null,
    updatedAtUtc: markup.updatedAtUtc || null,
    raw: markup,
  };
};

const normalizeMarkupCollection = (rows) =>
  Array.isArray(rows) ? rows.map(normalizeMarkupRow) : [];

const mergeMarkupRows = (serverRows, fallbackRows) => {
  const normalizedServerRows = normalizeMarkupCollection(serverRows);
  const normalizedFallbackRows = normalizeMarkupCollection(fallbackRows);
  const serverIds = new Set(normalizedServerRows.map((row) => String(row.id)));
  const localOnlyRows = normalizedFallbackRows.filter(
    (row) => !serverIds.has(String(row.id))
  );
  return [...localOnlyRows, ...normalizedServerRows];
};

const toMarkupPayload = (values) => ({
  airlineCode: sanitizeAirlineCode(values.airlineCode),
  tripType: String(values.tripType || "OneWay").trim() || "OneWay",
  markupType: toBackendMarkupType(values.markupType),
  markupValue: Number(values.markupValue ?? 0),
  priority: Number(values.priority ?? 1),
  isActive: Boolean(values.isActive),
});

const getMarkupValueLabel = (row) => {
  const markupType = String(row.markupType || "").toLowerCase();
  const amount = Number(row.markupValue) || 0;
  return markupType === "percentage" ? `${amount}%` : amount.toFixed(2);
};

export default function AdminFlightMarkupListPage() {
  const ITEMS_PER_PAGE = 5;
  const [flightRows, setFlightRows] = useState([]);
  const [localRows, setLocalRows] = useAdminList("flight-markup", INITIAL_FLIGHT_MARKUP_ROWS);

  const loadMarkups = async () => {
    try {
      const data = await listFlightMarkups();
      let merged = [];
      if (Array.isArray(data)) {
        merged = mergeMarkupRows(data, localRows);
      } else {
        merged = normalizeMarkupCollection(localRows);
      }
      // Sort by ID low to high (ascending)
      merged.sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D/g, "")) || 0;
        const numB = parseInt(String(b.id).replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      setFlightRows(merged);
    } catch (error) {
      console.warn("Failed to load markups from backend, falling back to local storage", error);
      const fallback = normalizeMarkupCollection(localRows);
      fallback.sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D/g, "")) || 0;
        const numB = parseInt(String(b.id).replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      setFlightRows(fallback);
    }
  };

  useEffect(() => {
    loadMarkups();
  }, [localRows]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formValues, setFormValues] = useState(DEFAULT_MARKUP_FORM);
  const [addError, setAddError] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [editError, setEditError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const colWidths = [
    "8%",
    "11%",
    "12%",
    "12%",
    "12%",
    "8%",
    "12%",
    "12%",
    "12%",
    "10%",
  ];
  const headers = [
    "ID",
    "Airline Code",
    "Trip Type",
    "Markup Type",
    "Markup Value",
    "Priority",
    "Status",
    "Created At",
    "Updated At",
    "Action",
  ];

  const totalItems = flightRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = flightRows.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalItems);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const handleOpenAdd = () => {
    setAddError("");
    setFormValues(DEFAULT_MARKUP_FORM);
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setAddError("");
  };

  const handleFormChange = (field) => (event) => {
    const nextValue =
      field === "isActive" ? event.target.value === "true" : event.target.value;
    setFormValues((previous) => ({ ...previous, [field]: nextValue }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(formValues.markupValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setAddError("Enter a valid markup value.");
      return;
    }

    const priority = Number(formValues.priority);
    if (!Number.isInteger(priority) || priority < 1) {
      setAddError("Priority must be 1 or more.");
      return;
    }

    const newMarkupPayload = toMarkupPayload({
      ...formValues,
      markupValue: amount,
      priority,
    });

    try {
      const created = await createFlightMarkup(newMarkupPayload);
      setFlightRows((previous) => [normalizeMarkupRow(created), ...previous]);
    } catch (e) {
      console.warn("Failed to create markup on backend, saving locally", e);
      const newRow = {
        id: getNextFlightMarkupId(flightRows),
        ...newMarkupPayload,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      setFlightRows((previous) => [newRow, ...previous]);
      setLocalRows((previous) => [newRow, ...previous]);
    }

    setCurrentPage(1);
    setIsAddOpen(false);
    setAddError("");
    setFormValues(DEFAULT_MARKUP_FORM);
  };

  const handleReset = () => {
    setAddError("");
    setFormValues(DEFAULT_MARKUP_FORM);
  };

  const openEditModal = (row) => {
    setEditError("");
    setEditRow({
      ...row,
      airlineCode: String(row.airlineCode ?? "*"),
      tripType: String(row.tripType ?? "OneWay"),
      markupType: toDisplayMarkupType(row.markupType ?? "Percentage"),
      markupValue: String(row.markupValue ?? ""),
      priority: String(row.priority ?? 1),
      isActive: Boolean(row.isActive),
    });
  };

  const handleEditSave = async () => {
    if (!editRow) {
      return;
    }

    const amount = Number(editRow.markupValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setEditError("Enter a valid markup value.");
      return;
    }

    const priority = Number(editRow.priority);
    if (!Number.isInteger(priority) || priority < 1) {
      setEditError("Priority must be 1 or more.");
      return;
    }

    const updatedPayload = toMarkupPayload({
      ...editRow,
      markupValue: amount,
      priority,
    });

    if (isServerMarkupId(editRow.id)) {
      try {
        await updateFlightMarkup(editRow.id, updatedPayload);
      } catch (e) {
        console.warn("Failed to update markup on backend", e);
      }
    }

    const updatedRow = {
      ...editRow,
      ...updatedPayload,
      updatedAtUtc: new Date().toISOString(),
    };

    setFlightRows((previous) =>
      previous.map((row) => (row.id === editRow.id ? updatedRow : row))
    );
    setLocalRows((previous) =>
      previous.map((row) => (row.id === editRow.id ? updatedRow : row))
    );
    setCurrentPage(1);
    setEditRow(null);
    setEditError("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) {
      return;
    }

    if (isServerMarkupId(deleteRow.id)) {
      try {
        await deleteFlightMarkup(deleteRow.id);
      } catch (e) {
        console.warn("Failed to delete markup on backend", e);
      }
    }

    setFlightRows((previous) => previous.filter((row) => row.id !== deleteRow.id));
    setLocalRows((previous) => previous.filter((row) => row.id !== deleteRow.id));
    setDeleteRow(null);
    setViewRow((previous) => (previous?.id === deleteRow.id ? null : previous));
    setEditRow((previous) => (previous?.id === deleteRow.id ? null : previous));
  };

  return (
    <section className="admin-b2c-page flight-markup-panel">
      <header className="flight-markup-toolbar">
        <div className="flight-markup-title">
          <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Markup List</h1>
          <div className="flight-markup-title-underline" aria-hidden="true" />
        </div>

        <div className="flight-markup-actions">
          <button type="button" className="flight-markup-action-btn primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add Flight Markup</span>
          </button>
          <button type="button" className="flight-markup-action-btn secondary">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {isAddOpen && (
        <div className="flight-markup-modal-backdrop" onClick={handleCloseAdd}>
          <section
            className="flight-markup-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add B2C Flight Markup"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flight-markup-modal-header">
              <h2>Add B2C Flight Markup</h2>
              <button
                type="button"
                className="flight-markup-modal-close"
                onClick={handleCloseAdd}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <form className="flight-markup-modal-form" onSubmit={handleSubmit}>
              <div className="flight-markup-modal-grid">
                <label className="flight-markup-modal-field">
                  <span>Airline Code</span>
                  <input
                    type="text"
                    value={formValues.airlineCode}
                    onChange={handleFormChange("airlineCode")}
                    placeholder="Enter airline code or *"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Trip Type</span>
                  <select value={formValues.tripType} onChange={handleFormChange("tripType")}>
                    <option value="OneWay">OneWay</option>
                    <option value="RoundTrip">RoundTrip</option>
                    <option value="MultiCity">MultiCity</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Markup Type</span>
                  <select value={formValues.markupType} onChange={handleFormChange("markupType")}>
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed">Fixed</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Markup Value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValues.markupValue}
                    onChange={handleFormChange("markupValue")}
                    placeholder="Enter value"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formValues.priority}
                    onChange={handleFormChange("priority")}
                    placeholder="Enter priority"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Status</span>
                  <select value={String(formValues.isActive)} onChange={handleFormChange("isActive")}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Created At</span>
                  <input type="text" value="Will be set after submit" disabled />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Updated At</span>
                  <input type="text" value="Will be set after submit" disabled />
                </label>
              </div>

              {addError && <p className="admin-markup-form-error">{addError}</p>}

              <div className="flight-markup-modal-actions">
                <button type="submit" className="primary">
                  Submit
                </button>
                <button type="button" className="secondary" onClick={handleReset}>
                  Reset
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="flight-markup-table-wrap">
        <div className="flight-markup-table-scroll">
          <table className="flight-markup-table">
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>
                    <div className="flight-markup-th-pill">
                      {header === "Code" ? (
                        <>
                          <PlaneTakeoff size={14} />
                          <span>{header}</span>
                        </>
                      ) : (
                        <span>{header}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flightRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="flight-markup-empty-cell">
                    <span className="flight-markup-empty">No Record Found...</span>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.airlineCode}</td>
                      <td>{row.tripType}</td>
                      <td>{row.markupType}</td>
                      <td>{getMarkupValueLabel(row)}</td>
                      <td>{row.priority}</td>
                      <td>
                        <span
                          className={`status-badge ${row.isActive ? "active" : "inactive"}`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{row.createdAtUtc ? formatDateTime(row.createdAtUtc) : "--"}</td>
                      <td>{row.updatedAtUtc ? formatDateTime(row.updatedAtUtc) : "--"}</td>
                      <td>
                        <div className="flight-markup-row-actions" aria-label="Row actions">
                          <button
                            type="button"
                            title="View"
                            aria-label={`View ${row.id}`}
                            onClick={() => setViewRow(row)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            aria-label={`Edit ${row.id}`}
                            onClick={() => openEditModal(row)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            aria-label={`Delete ${row.id}`}
                            className="danger"
                            onClick={() => setDeleteRow(row)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalItems ? (
          <div className="admin-pagination-container">
            <span className="admin-pagination-info">
              Showing {startItem}-{endItem} of {totalItems} markups
            </span>
            <div className="admin-pagination-controls">
              <button
                type="button"
                className="admin-pagination-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                &lt; Previous
              </button>
              <span className="admin-pagination-page-num">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-pagination-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next &gt;
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {viewRow && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewRow(null)}>
          <section
            className="admin-markup-modal"
            role="dialog"
            aria-modal="true"
            aria-label="View flight markup details"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>View Flight Markup</h2>
              <button type="button" onClick={() => setViewRow(null)} aria-label="Close view dialog">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-modal-grid">
              <div>
                <span>ID</span>
                <strong>{viewRow.id}</strong>
              </div>
              <div>
                <span>Airline Code</span>
                <strong>{viewRow.airlineCode}</strong>
              </div>
              <div>
                <span>Trip Type</span>
                <strong>{viewRow.tripType}</strong>
              </div>
              <div>
                <span>Markup Type</span>
                <strong>{viewRow.markupType}</strong>
              </div>
              <div>
                <span>Markup Value</span>
                <strong>{getMarkupValueLabel(viewRow)}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>{viewRow.priority}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{viewRow.isActive ? "Active" : "Inactive"}</strong>
              </div>
              <div>
                <span>Created At</span>
                <strong>{viewRow.createdAtUtc ? formatDateTime(viewRow.createdAtUtc) : "--"}</strong>
              </div>
              <div>
                <span>Updated At</span>
                <strong>{viewRow.updatedAtUtc ? formatDateTime(viewRow.updatedAtUtc) : "--"}</strong>
              </div>
            </div>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setViewRow(null)}>
                Close
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  openEditModal(viewRow);
                  setViewRow(null);
                }}
              >
                Edit
              </button>
            </div>
          </section>
        </div>
      )}

      {editRow && (
        <div className="flight-markup-modal-backdrop" onClick={() => setEditRow(null)}>
          <section
            className="flight-markup-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit flight markup"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flight-markup-modal-header">
              <h2>Edit Flight Markup</h2>
              <button
                type="button"
                className="flight-markup-modal-close"
                onClick={() => setEditRow(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <form
              className="flight-markup-modal-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleEditSave();
              }}
            >
              <div className="flight-markup-modal-grid">
                <label className="flight-markup-modal-field">
                  <span>Airline Code</span>
                  <input
                    type="text"
                    value={editRow.airlineCode}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, airlineCode: event.target.value }))
                    }
                    placeholder="Enter airline code or *"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Trip Type</span>
                  <select
                    value={editRow.tripType}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, tripType: event.target.value }))
                    }
                  >
                    <option value="OneWay">OneWay</option>
                    <option value="RoundTrip">RoundTrip</option>
                    <option value="MultiCity">MultiCity</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Markup Type</span>
                  <select
                    value={editRow.markupType}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, markupType: event.target.value }))
                    }
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed">Fixed</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Markup Value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editRow.markupValue}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, markupValue: event.target.value }))
                    }
                    placeholder="Enter value"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editRow.priority}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, priority: event.target.value }))
                    }
                    placeholder="Enter priority"
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Status</span>
                  <select
                    value={String(editRow.isActive)}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, isActive: event.target.value === "true" }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                <label className="flight-markup-modal-field">
                  <span>Created At</span>
                  <input
                    type="text"
                    value={editRow.createdAtUtc ? formatDateTime(editRow.createdAtUtc) : "--"}
                    disabled
                  />
                </label>

                <label className="flight-markup-modal-field">
                  <span>Updated At</span>
                  <input
                    type="text"
                    value={editRow.updatedAtUtc ? formatDateTime(editRow.updatedAtUtc) : "--"}
                    disabled
                  />
                </label>
              </div>

              {editError && <p className="admin-markup-form-error">{editError}</p>}

              <div className="flight-markup-modal-actions">
                <button type="submit" className="primary">
                  Save Changes
                </button>
                <button type="button" className="secondary" onClick={() => setEditRow(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteRow && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteRow(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete flight markup"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Flight Markup</h2>
              <button type="button" onClick={() => setDeleteRow(null)} aria-label="Close delete dialog">
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete <strong>{deleteRow.id}</strong>?
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteRow(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

