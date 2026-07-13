import React, { useMemo, useState, useEffect } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  List,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import "./BusMarkupList.css";
import { csvCell, formatCurrency, formatDateTime, toViewId } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  getBusMarkupSettings,
  createBusMarkupSetting,
  updateBusMarkupSetting,
  deleteBusMarkupSetting,
} from "../../../services/adminBusService";

const DEFAULT_SORT_BY = "updateDateUtc";
const DEFAULT_SORT_ORDER = "desc";

function getSortValue(row, sortBy) {
  if (sortBy === "id") {
    return String(row.id ?? "");
  }

  if (sortBy === "value") {
    return Number(row.value) || 0;
  }

  if (sortBy === "updateDateUtc") {
    const timestamp = new Date(row.updateDateUtc).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  return String(row[sortBy] ?? "").toLowerCase();
}

export default function AdminBusMarkupListPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [markupTypeFilter, setMarkupTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, markupTypeFilter, sortBy, sortOrder]);
  
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getBusMarkupSettings();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load markup settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const availableMarkupTypes = useMemo(() => {
    const uniqueTypes = new Set(
      rows.map((row) => String(row.markupType || "").trim()).filter(Boolean)
    );
    return Array.from(uniqueTypes);
  }, [rows]);

  const availableStatuses = useMemo(() => {
    const uniqueStatuses = new Set(
      rows.map((row) => String(row.status || "").trim()).filter(Boolean)
    );
    return Array.from(uniqueStatuses);
  }, [rows]);

  const visibleRows = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      const rowStatus = String(row.status || "").toLowerCase();
      const rowMarkupType = String(row.markupType || "").toLowerCase();

      const matchesStatus = statusFilter === "all" || rowStatus === statusFilter.toLowerCase();
      const matchesMarkupType = markupTypeFilter === "all" || rowMarkupType === markupTypeFilter.toLowerCase();

      return matchesStatus && matchesMarkupType;
    });

    const sortedRows = [...filteredRows].sort((leftRow, rightRow) => {
      const leftValue = getSortValue(leftRow, sortBy);
      const rightValue = getSortValue(rightRow, sortBy);

      let result = 0;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else {
        result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortOrder === "asc" ? result : -result;
    });

    return sortedRows;
  }, [rows, markupTypeFilter, sortBy, sortOrder, statusFilter]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleRows.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleRows, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPerPage));

  const handleExport = () => {
    if (visibleRows.length === 0) {
      return;
    }

    const header = [
      "ID",
      "Seat Type",
      "Value",
      "Markup Type",
      "Updated On",
      "Updated By",
      "Remark",
      "Status",
    ];

    const csvRows = visibleRows.map((row) => [
      row.id,
      row.seatType,
      formatCurrency(row.value),
      row.markupType,
      formatDateTime(row.updateDateUtc),
      row.updatedBy,
      row.remark,
      row.status,
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = `admin-markup-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const handleStatusToggle = async (id) => {
    const targetRow = rows.find(r => r.id === id);
    if (!targetRow) return;

    const newStatus = targetRow.status === "Active" ? "Inactive" : "Active";
    
    try {
      await updateBusMarkupSetting(id, {
        ...targetRow,
        status: newStatus
      });
      fetchSettings();
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const openAddModal = () => {
    setEditError("");
    setEditRow({
      seatType: "SEATER",
      value: "",
      markupType: "Fixed",
      status: "Active",
      updatedBy: "",
      remark: ""
    });
    setIsAdding(true);
  };

  const openEditModal = (row) => {
    setEditError("");
    setEditRow({
      ...row,
      value: String(row.value),
      remark: row.remark || "",
      updatedBy: row.updatedBy || "",
    });
    setIsAdding(false);
  };

  const handleEditSave = async () => {
    if (!editRow) {
      return;
    }

    const amount = Number(editRow.value);
    if (!Number.isFinite(amount) || amount < 0) {
      setEditError("Enter a valid markup value.");
      return;
    }

    if (!String(editRow.updatedBy).trim()) {
      setEditError("Updated by is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        seatType: editRow.seatType,
        value: amount,
        markupType: editRow.markupType,
        status: editRow.status,
        updatedBy: editRow.updatedBy.trim(),
        remark: editRow.remark?.trim() || "",
      };

      if (isAdding) {
        await createBusMarkupSetting(payload);
      } else {
        await updateBusMarkupSetting(editRow.id, payload);
      }
      
      setEditRow(null);
      setEditError("");
      fetchSettings();
    } catch (err) {
      setEditError(err.message || "Failed to save markup setting.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) {
      return;
    }

    try {
      await deleteBusMarkupSetting(deleteRow.id);
      setDeleteRow(null);
      setViewRow((previous) => (previous?.id === deleteRow.id ? null : previous));
      fetchSettings();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="admin-b2c-page bus-markup-list-page-container">
      {editRow ? (
        <div className="admin-markup-edit-page-container" style={{ width: '100%' }}>
          {/* ── PAGE HEADING ── */}
          <section className="markup-heading" style={{ marginBottom: '16px' }}>
            <p className="markup-heading-main">
              B2C Bus <span className="markup-heading-sub">{isAdding ? "Add Markup" : "Edit Markup"}</span>
            </p>
          </section>

          <section
            className="admin-markup-modal fullscreen inline-card-container"
            role="dialog"
            aria-modal="true"
            aria-label="Edit markup"
          >
            <header>
              <h2>{isAdding ? "Add Markup Setting" : "Edit Markup Setting"}</h2>
              <button type="button" onClick={() => !isSaving && setEditRow(null)} aria-label="Close dialog" disabled={isSaving}>
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              {!isAdding && (
                <label>
                  <span>ID</span>
                  <input type="text" value={editRow.id} disabled />
                </label>
              )}
              <label>
                <span>Seat Type</span>
                <select
                  value={editRow.seatType}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      seatType: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                >
                  <option value="SEATER">SEATER</option>
                  <option value="SLEEPER">SLEEPER</option>
                </select>
              </label>
              <label>
                <span>Value</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRow.value}
                  onChange={(event) =>
                    setEditRow((previous) => ({ ...previous, value: event.target.value }))
                  }
                  disabled={isSaving}
                />
              </label>
              <label>
                <span>Markup Type</span>
                <select
                  value={editRow.markupType}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      markupType: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={editRow.status}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label>
                <span>Updated By</span>
                <input
                  type="text"
                  value={editRow.updatedBy}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      updatedBy: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </label>
              <label className="wide">
                <span>Remark</span>
                <textarea
                  value={editRow.remark}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      remark: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </label>
            </div>

            {editError && <p className="admin-markup-form-error">{editError}</p>}

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditRow(null)} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleEditSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      ) : viewRow ? (
        <section className="admin-markup-view-screen">
          <header className="admin-markup-view-top">
            <h2>
              <strong>View B2C Bus</strong> Markup Details
            </h2>

            <div className="admin-markup-view-actions">
              <button
                type="button"
                className="admin-markup-view-btn primary"
                onClick={() => {
                  openEditModal(viewRow);
                  setViewRow(null);
                }}
              >
                <Pencil size={14} />
                <span>Edit B2C Markup</span>
              </button>
              <button type="button" className="admin-markup-view-btn secondary" onClick={() => setViewRow(null)}>
                <List size={14} />
                <span>B2C Bus Markup List</span>
              </button>
            </div>
          </header>

          <div className="admin-markup-view-underline" />

          <div className="admin-markup-view-card">
            <div className="admin-markup-view-band">
              <span>Basic</span>
              <strong>Details</strong>
            </div>

            <div className="admin-markup-view-table-wrap">
              <table className="admin-markup-view-table">
                <tbody>
                  <tr>
                    <td className="label">ID</td>
                    <td className="value">{toViewId(viewRow.id)}</td>
                    <td className="label">Markup Type</td>
                    <td className="value">{viewRow.markupType}</td>
                    <td className="label">Seat Type</td>
                    <td className="value">{viewRow.seatType}</td>
                    <td className="label">Status</td>
                    <td className="value">{viewRow.status}</td>
                  </tr>
                  <tr>
                    <td className="label">Value</td>
                    <td className="value">{Number(viewRow.value) || 0}</td>
                    <td className="label">Entry Date</td>
                    <td className="value">{formatDateTime(viewRow.entryDateUtc)}</td>
                    <td className="label">Update Date</td>
                    <td className="value">{formatDateTime(viewRow.updateDateUtc)}</td>
                    <td className="label">Updated By</td>
                    <td className="value">{viewRow.updatedBy}</td>
                  </tr>
                  <tr>
                    <td className="label">Remark</td>
                    <td className="value remark-value" colSpan={7}>
                      <span className="remark-text">{viewRow.remark || "--"}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* ── PAGE HEADING ── */}
          <section className="markup-heading">
            <p className="markup-heading-main">
              B2C Bus <span className="markup-heading-sub">Markup List</span>
            </p>
          </section>

          {/* ── STATS ROW ── */}
          <section className="stats-row">
            <div className="stat-card total">
              <div className="stat-label">Total Markups</div>
              <div className="stat-value">{rows.length}</div>
              <div className="stat-meta">All seat type records</div>
            </div>
            <div className="stat-card active">
              <div className="stat-label">Active</div>
              <div className="stat-value">{rows.filter(r => r.status === 'Active').length}</div>
              <div className="stat-meta">Currently applied</div>
            </div>
            <div className="stat-card inactive">
              <div className="stat-label">Inactive</div>
              <div className="stat-value">{rows.filter(r => r.status === 'Inactive').length}</div>
              <div className="stat-meta">Paused markups</div>
            </div>
          </section>

          {/* ── TOOLBAR ── */}
          <section className="markup-toolbar">
            <div className="markup-toolbar-group">
              <label className="markup-field">
                <span>Sort By</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="updateDateUtc">Updated On</option>
                  <option value="id">ID</option>
                  <option value="value">Value</option>
                  <option value="markupType">Markup Type</option>
                  <option value="seatType">Seat Type</option>
                  <option value="updatedBy">Updated By</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <label className="markup-field">
                <span>Order</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
              <label className="markup-field">
                <span>Markup Type</span>
                <select value={markupTypeFilter} onChange={(e) => setMarkupTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {availableMarkupTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="markup-toolbar-actions">
              <label className="markup-field">
                <span>Status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="markup-primary-btn" onClick={openAddModal}>
                <Plus size={14} />
                Add New
              </button>
              <button
                type="button"
                className="markup-export-btn"
                onClick={handleExport}
                disabled={visibleRows.length === 0}
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </section>

          <section className="admin-markup-table-wrap">
            {isLoading ? (
              <p className="admin-markup-empty">Loading settings...</p>
            ) : error ? (
              <p className="admin-markup-empty" style={{ color: "red" }}>{error}</p>
            ) : (
              <table className="admin-markup-table">
                <colgroup>
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Seat Type</th>
                    <th>Value</th>
                    <th>Markup Type</th>
                    <th>Updated On</th>
                    <th>Updated By</th>
                    <th>Remark</th>
                    <th>Status</th>
                    <th className="action-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-empty">No markup records found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <button
                            type="button"
                            className="markup-id-chip"
                            onClick={() => setViewRow(row)}
                            aria-label={`Open basic details for ${row.id}`}
                          >
                            <span>{row.id}</span>
                          </button>
                        </td>
                        <td>{row.seatType}</td>
                        <td>{row.markupType === "Fixed" ? formatCurrency(row.value) : `${row.value}%`}</td>
                        <td>{row.markupType}</td>
                        <td>{formatDateTime(row.updateDateUtc)}</td>
                        <td>{row.updatedBy}</td>
                        <td className="markup-remark-cell">
                          <span className="markup-remark-text">{row.remark || "--"}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`markup-status-toggle ${String(row.status || "").toLowerCase()}`}
                            onClick={() => handleStatusToggle(row.id)}
                            aria-label={`Set ${row.id} status`}
                          >
                            {row.status === "Active" ? <Check size={14} /> : <X size={14} />}
                            <span>{row.status}</span>
                          </button>
                        </td>
                        <td className="action-col">
                          <div className="actions-dropdown-container">
                            <button
                              type="button"
                              className={`actions-trigger-btn ${activeDropdownId === row.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === row.id ? null : row.id);
                              }}
                            >
                              <span>Actions</span>
                              <ChevronDown size={12} className="chevron-icon" />
                            </button>
                            {activeDropdownId === row.id && (
                              <div className="actions-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewRow(row);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <Eye size={13} className="item-icon" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  className="dropdown-item edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(row);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <Pencil size={13} className="item-icon" />
                                  <span>Edit Markup</span>
                                </button>
                                <button
                                  type="button"
                                  className="dropdown-item delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteRow(row);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <Trash2 size={13} className="item-icon" />
                                  <span>Delete Markup</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div style={{ marginTop: "16px" }}>
                <AdminPagination
                  currentPage={currentPage}
                  totalItems={visibleRows.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="markup records"
                />
              </div>
            )}
          </section>
        </>
      )}



      {deleteRow && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteRow(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete markup"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Markup</h2>
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
    </div>
  );
}
