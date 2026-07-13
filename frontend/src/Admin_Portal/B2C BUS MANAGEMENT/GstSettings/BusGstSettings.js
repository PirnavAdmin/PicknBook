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
  Search,
} from "lucide-react";
import "./BusGstSettings.css";
import { csvCell, formatDateTime, toViewId } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  getBusGstSettings,
  createBusGstSetting,
  updateBusGstSetting,
  deleteBusGstSetting,
} from "../../../services/adminBusService";

const DEFAULT_SORT_BY = "updateDateUtc";
const DEFAULT_SORT_ORDER = "desc";

function getSortValue(row, sortBy) {
  if (sortBy === "id") {
    return String(row.id ?? "");
  }

  if (sortBy === "gstPercent") {
    return Number(row.gstPercent) || 0;
  }

  if (sortBy === "updateDateUtc") {
    const timestamp = new Date(row.updateDateUtc).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  return String(row[sortBy] ?? "").toLowerCase();
}

export default function AdminBusGstSettingsPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const sortBy = DEFAULT_SORT_BY;
  const sortOrder = DEFAULT_SORT_ORDER;
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getBusGstSettings();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load GST settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const availableCategories = useMemo(() => {
    const uniqueCategories = new Set(
      rows.map((row) => String(row.gstCategory || "").trim()).filter(Boolean)
    );
    return Array.from(uniqueCategories);
  }, [rows]);

  const availableStatuses = useMemo(() => {
    const uniqueStatuses = new Set(
      rows.map((row) => String(row.status || "").trim()).filter(Boolean)
    );
    return Array.from(uniqueStatuses);
  }, [rows]);

  const visibleRows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filteredRows = rows.filter((row) => {
      const rowStatus = String(row.status || "").toLowerCase();
      const rowCategory = String(row.gstCategory || "").toLowerCase();

      const matchesStatus = statusFilter === "all" || rowStatus === statusFilter.toLowerCase();
      const matchesCategory = categoryFilter === "all" || rowCategory === categoryFilter.toLowerCase();
      const matchesSearch = !term ||
        String(row.gstCategory || "").toLowerCase().includes(term) ||
        String(row.gstPercent || "").toLowerCase().includes(term) ||
        String(row.updatedBy || "").toLowerCase().includes(term) ||
        String(row.remark || "").toLowerCase().includes(term) ||
        String(row.id || "").toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesSearch;
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
  }, [rows, searchTerm, categoryFilter, sortBy, sortOrder, statusFilter]);

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
      "GST Category",
      "GST Percent",
      "Updated On",
      "Updated By",
      "Remark",
      "Status",
    ];

    const csvRows = visibleRows.map((row) => [
      row.id,
      row.gstCategory,
      `${row.gstPercent}%`,
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
    link.download = `admin-gst-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const handleStatusToggle = async (id) => {
    const targetRow = rows.find(r => r.id === id);
    if (!targetRow) return;

    const newStatus = targetRow.status === "Active" ? "Inactive" : "Active";
    
    try {
      await updateBusGstSetting(id, {
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
      gstCategory: "AC",
      gstPercent: "",
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
      gstPercent: String(row.gstPercent),
      remark: row.remark || "",
      updatedBy: row.updatedBy || "",
    });
    setIsAdding(false);
  };

  const handleEditSave = async () => {
    if (!editRow) {
      return;
    }

    const percent = Number(editRow.gstPercent);
    if (!Number.isFinite(percent) || percent <= 0) {
      setEditError("Enter a valid GST percentage greater than 0.");
      return;
    }

    if (!String(editRow.updatedBy).trim()) {
      setEditError("Updated by is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        gstCategory: editRow.gstCategory,
        gstPercent: percent,
        status: editRow.status,
        updatedBy: editRow.updatedBy.trim(),
        remark: editRow.remark?.trim() || "",
      };

      if (isAdding) {
        await createBusGstSetting(payload);
      } else {
        await updateBusGstSetting(editRow.id, payload);
      }
      
      setEditRow(null);
      setEditError("");
      fetchSettings();
    } catch (err) {
      setEditError(err.message || "Failed to save GST setting.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) {
      return;
    }

    try {
      await deleteBusGstSetting(deleteRow.id);
      setDeleteRow(null);
      setViewRow((previous) => (previous?.id === deleteRow.id ? null : previous));
      fetchSettings();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <>
      {viewRow ? (
        <section className="admin-markup-view-screen">
          <header className="admin-markup-view-top">
            <h2>
              <strong>View B2C Bus</strong> GST Details
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
                <span>Edit GST Setting</span>
              </button>
              <button type="button" className="admin-markup-view-btn secondary" onClick={() => setViewRow(null)}>
                <List size={14} />
                <span>GST Settings List</span>
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
                    <td className="label">GST Category</td>
                    <td className="value">{viewRow.gstCategory}</td>
                    <td className="label">GST Percent</td>
                    <td className="value">{Number(viewRow.gstPercent) || 0}%</td>
                    <td className="label">Status</td>
                    <td className="value">{viewRow.status}</td>
                  </tr>
                  <tr>
                    <td className="label">Entry Date</td>
                    <td className="value">{formatDateTime(viewRow.entryDateUtc)}</td>
                    <td className="label">Update Date</td>
                    <td className="value">{formatDateTime(viewRow.updateDateUtc)}</td>
                    <td className="label">Updated By</td>
                    <td className="value" colSpan={3}>{viewRow.updatedBy}</td>
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
        <div className="admin-b2c-page bus-gst-settings-page-container">
          {/* ── PAGE HEADING ── */}
          <section className="markup-heading">
            <p className="markup-heading-main">
              B2C Bus <span className="markup-heading-sub">GST Settings</span>
            </p>
          </section>

          {/* ── STATS ROW ── */}
          <section className="stats-row">
            <div className="stat-card total">
              <div className="stat-label">Total GST Settings</div>
              <div className="stat-value">{rows.length}</div>
              <div className="stat-meta">Across all bus categories</div>
            </div>
            <div className="stat-card active">
              <div className="stat-label">Active</div>
              <div className="stat-value">{rows.filter(r => r.status === 'Active').length}</div>
              <div className="stat-meta">Currently applied to bookings</div>
            </div>
            <div className="stat-card inactive">
              <div className="stat-label">Inactive</div>
              <div className="stat-value">{rows.filter(r => r.status === 'Inactive').length}</div>
              <div className="stat-meta">Paused GST rules</div>
            </div>
          </section>

          {/* ── TOOLBAR ── */}
          <section className="markup-toolbar">
            <div className="markup-toolbar-group">
              <label className="markup-field">
                <span>Search GST Settings</span>
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by category, percent, updated by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
              <label className="markup-field">
                <span>Category</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
                <Plus size={14} aria-hidden="true" />
                Add GST Setting
              </button>
              <button type="button" className="markup-export-btn" onClick={handleExport} disabled={visibleRows.length === 0}>
                <Download size={14} aria-hidden="true" />
                Export
              </button>
            </div>
          </section>

          {/* ── TABLE ── */}
          <section className="admin-markup-table-wrap">
            {isLoading ? (
              <p className="admin-markup-empty">Loading GST settings...</p>
            ) : error ? (
              <p className="admin-markup-empty" style={{ color: 'red' }}>{error}</p>
            ) : (
              <table className="admin-markup-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>GST Category</th>
                    <th>GST Percent</th>
                    <th>Updated On</th>
                    <th>Updated By</th>
                    <th>Remark</th>
                    <th>Status</th>
                    <th className="action-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <p className="admin-markup-empty">No GST records found.</p>
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
                        <td style={{ fontWeight: 600 }}>{row.gstCategory}</td>
                        <td>{row.gstPercent}%</td>
                        <td>{formatDateTime(row.updateDateUtc)}</td>
                        <td>{row.updatedBy || '--'}</td>
                        <td className="markup-remark-cell">
                          <span className="markup-remark-text">{row.remark || '--'}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`markup-status-toggle ${String(row.status || '').toLowerCase()}`}
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
                                  <span>Edit Setting</span>
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
                                  <span>Delete Setting</span>
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
                  itemName="GST records"
                />
              </div>
            )}
          </section>
        </div>
      )}

      {editRow && (
        <div className="admin-markup-modal-backdrop" onClick={() => !isSaving && setEditRow(null)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Edit GST setting"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>{isAdding ? "Add GST Setting" : "Edit GST Setting"}</h2>
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
                <span>GST Category</span>
                <select
                  value={editRow.gstCategory}
                  onChange={(event) =>
                    setEditRow((previous) => ({
                      ...previous,
                      gstCategory: event.target.value,
                    }))
                  }
                  disabled={isSaving}
                >
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                  <option value="VOLVO">VOLVO</option>
                </select>
              </label>
              <label>
                <span>GST Percent</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRow.gstPercent}
                  onChange={(event) =>
                    setEditRow((previous) => ({ ...previous, gstPercent: event.target.value }))
                  }
                  disabled={isSaving}
                />
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
      )}

      {deleteRow && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteRow(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete GST setting"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete GST Setting</h2>
              <button type="button" onClick={() => setDeleteRow(null)} aria-label="Close delete dialog">
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete GST Setting <strong>{deleteRow.id}</strong>?
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
    </>
  );
}
