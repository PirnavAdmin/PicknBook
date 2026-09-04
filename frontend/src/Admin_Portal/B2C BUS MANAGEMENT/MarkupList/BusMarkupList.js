/* eslint-disable */
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  RefreshCw,
  AlertCircle,
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



      seatType: "",
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

  if (error) {
    return (
      <div className="admin-b2c-page bus-markup-list-page-container">
        <section className="markup-heading">
          <p className="markup-heading-main">
            B2C Bus <span className="markup-heading-sub">Markup List</span>
          </p>
        </section>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>Network Error</span>
          </div>
          <button 
            type="button" 
            onClick={fetchSettings}
            style={{
              background: '#A41B48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(164, 27, 72, 0.2)',
              transition: 'all 0.2s'
            }}
            title="Retry Connection"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-b2c-page bus-markup-list-page-container">
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
                                  <span>View Details</span>
                                  <Eye size={13} className="item-icon" />
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
                                  <span>Edit Markup</span>
                                  <Pencil size={13} className="item-icon" />
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
                                  <span>Delete Markup</span>
                                  <Trash2 size={13} className="item-icon" />
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
            {visibleRows.length > 0 && (
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

      {editRow && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setEditRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
            padding: "16px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "760px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "16px 20px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ color: "#A51C49", fontSize: "1.3rem", margin: 0, fontWeight: "700" }}>
                {isAdding ? "Add B2C Markup" : "Edit B2C Markup"}
              </h3>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}>
              {editError && (
                <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem", textAlign: "left" }}>
                  {editError}
                </p>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 12px" }}>
                {!isAdding && (
                  <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                    <span>Markup ID</span>
                    <input 
                      type="text" 
                      value={editRow.id} 
                      disabled 
                      style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none", backgroundColor: "#f1f5f9" }}
                    />
                  </label>
                )}
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Seat Type *</span>
                  <select
                    value={editRow.seatType}
                    onChange={(event) =>
                      setEditRow((previous) => ({
                        ...previous,
                        seatType: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="">---Select Seat Type---</option>
                    <option value="SEATER">SEATER</option>
                    <option value="SLEEPER">SLEEPER</option>
                    <option value="Semi-Sleeper">Semi-Sleeper</option>
                    <option value="AC Sleeper">AC Sleeper</option>
                    <option value="AC Seater">AC Seater</option>
                    <option value="AC Semi-Sleeper">AC Semi-Sleeper</option>
                    <option value="Multi-Axle">Multi-Axle</option>
                    <option value="Volvo">Volvo</option>
                    <option value="ALL">ALL SEATS</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Value *</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Enter value"
                    value={editRow.value}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, value: event.target.value }))
                    }
                    disabled={isSaving}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Markup Type *</span>
                  <select
                    value={editRow.markupType}
                    onChange={(event) =>
                      setEditRow((previous) => ({
                        ...previous,
                        markupType: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Status *</span>
                  <select
                    value={editRow.status}
                    onChange={(event) =>
                      setEditRow((previous) => ({
                        ...previous,
                        status: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Updated By *</span>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={editRow.updatedBy}
                    onChange={(event) =>
                      setEditRow((previous) => ({
                        ...previous,
                        updatedBy: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b", gridColumn: "span 3" }}>
                  <span>Remark</span>
                  <textarea
                    placeholder="Enter any notes or remark"
                    value={editRow.remark}
                    onChange={(event) =>
                      setEditRow((previous) => ({
                        ...previous,
                        remark: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    rows={2}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "44px", minHeight: "44px", boxSizing: "border-box", width: "100%", outline: "none", fontFamily: "inherit" }}
                  />
                </label>
              </div>
              
              <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button 
                  type="button" 
                  onClick={() => setEditRow(null)} 
                  disabled={isSaving}
                  style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  style={{ backgroundColor: "#A51C49", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                >
                  {isSaving ? "Saving..." : isAdding ? "Add Markup" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewRow && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setViewRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
            padding: "16px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "540px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "20px 24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Markup Detail View</h3>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                style={{
                  border: 'none',
                  background: '#A51C49',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', justifyContent: 'flex-start' }}>
              <span style={{ background: viewRow.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: viewRow.status === 'Active' ? '#10b981' : '#64748b', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewRow.status}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A41B48', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                {viewRow.seatType}
              </span>
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewRow.markupType === 'Fixed' ? `INR ${viewRow.value}` : `${viewRow.value}%`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MARKUP ID</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SEAT TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.seatType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VALUE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.value}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MARKUP TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.markupType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED BY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewRow.updatedBy || '--'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED ON</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatDateTime(viewRow.updateDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMARK</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewRow.remark || '--'}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteRow && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setDeleteRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
            padding: "16px"
          }}
        >
          <div 
            onClick={(event) => event.stopPropagation()} 
            style={{ 
              maxWidth: '480px', 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Delete Markup</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setDeleteRow(null)}
                aria-label="Close delete dialog"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '8px 0 20px', textAlign: 'left', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete markup <strong>{deleteRow.id}</strong> ({deleteRow.seatType})?
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setDeleteRow(null)} 
                style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn delete-confirm-btn"
                onClick={handleDeleteConfirm}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px', height: 'auto' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}