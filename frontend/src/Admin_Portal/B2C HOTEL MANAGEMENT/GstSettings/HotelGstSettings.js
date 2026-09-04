/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { Check, Edit, Trash2, Plus, ArrowLeft, X, Eye } from "lucide-react";
import "./HotelGstSettings.css";
import AdminPagination from "../../../components/AdminPagination";
import {
  listHotelPricingRules,
  createHotelPricingRule,
  updateHotelPricingRule,
  deleteHotelPricingRule
} from "../../../services/adminHotelService";

function createDefaultForm() {
  return {
    markupType: "Flat",
    markupValue: "",
    convenienceFeeType: "Flat",
    convenienceFeeValue: "",
    gstPercent: "",
    isActive: true
  };
}

export default function HotelGstSettings() {
  const [rows, setRows] = useState([]);
  const [viewingGstRecord, setViewingGstRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);

  // Toolbar state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Separated view states with sessionStorage persistence
  const [isFormViewOpen, setIsFormViewOpen] = useState(() => {
    return sessionStorage.getItem("hotel_gst_form_open") === "true";
  });
  const [editId, setEditId] = useState(() => {
    const savedId = sessionStorage.getItem("hotel_gst_edit_id");
    return savedId ? Number(savedId) : null;
  });
  const [form, setForm] = useState(() => {
    const savedForm = sessionStorage.getItem("hotel_gst_form_data");
    return savedForm ? JSON.parse(savedForm) : createDefaultForm();
  });

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listHotelPricingRules();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load GST & pricing settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Close actions dropdown on clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Synchronize states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("hotel_gst_form_open", isFormViewOpen);
    if (editId !== null) {
      sessionStorage.setItem("hotel_gst_edit_id", editId);
    } else {
      sessionStorage.removeItem("hotel_gst_edit_id");
    }
    sessionStorage.setItem("hotel_gst_form_data", JSON.stringify(form));
  }, [isFormViewOpen, editId, form]);

  // Search & Filter Memo
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchesSearch =
        String(r.id).includes(searchTerm) ||
        String(r.markupValue).includes(searchTerm) ||
        String(r.convenienceFeeValue).includes(searchTerm) ||
        String(r.gstPercent).includes(searchTerm) ||
        String(r.updatedBy || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.isActive) ||
        (statusFilter === "inactive" && !r.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const openAddForm = () => {
    setError("");
    setValidationErrors({});
    setEditId(null);
    setForm(createDefaultForm());
    setIsFormViewOpen(true);
  };

  const loadRowToForm = (row) => {
    setError("");
    setValidationErrors({});
    setEditId(row.id);
    setForm({
      markupType: row.markupType || "Flat",
      markupValue: String(row.markupValue || ""),
      convenienceFeeType: row.convenienceFeeType || "Flat",
      convenienceFeeValue: String(row.convenienceFeeValue || ""),
      gstPercent: String(row.gstPercent || ""),
      isActive: !!row.isActive
    });
    setIsFormViewOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormViewOpen(false);
    sessionStorage.removeItem("hotel_gst_form_open");
    sessionStorage.removeItem("hotel_gst_edit_id");
    sessionStorage.removeItem("hotel_gst_form_data");
    setValidationErrors({});
    setError("");
  };

  const handleSave = async () => {
    setError("");
    const mValue = Number(form.markupValue);
    const cfValue = Number(form.convenienceFeeValue);
    const gstVal = Number(form.gstPercent);

    const errors = {};
    if (form.markupValue === "" || !Number.isFinite(mValue) || mValue < 0) errors.markupValue = true;
    if (form.convenienceFeeValue === "" || !Number.isFinite(cfValue) || cfValue < 0) errors.convenienceFeeValue = true;
    if (form.gstPercent === "" || !Number.isFinite(gstVal) || gstVal < 0 || gstVal > 100) errors.gstPercent = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError("Please fill in all compulsory fields with valid values.");
      return;
    }
    setValidationErrors({});

    const payload = {
      markupType: form.markupType,
      markupValue: mValue,
      convenienceFeeType: form.convenienceFeeType,
      convenienceFeeValue: cfValue,
      gstPercent: gstVal,
      isActive: form.isActive
    };

    setIsSubmitting(true);
    try {
      if (editId) {
        await updateHotelPricingRule(editId, payload);
      } else {
        await createHotelPricingRule(payload);
      }
      handleCancelForm();
      await loadSettings();
    } catch (err) {
      setError(err.message || "Failed to save pricing rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setError("");
    try {
      await deleteHotelPricingRule(deleteRecord.id);
      if (editId === deleteRecord.id) {
        handleCancelForm();
      }
      setDeleteRecord(null);
      await loadSettings();
    } catch (err) {
      setError(err.message || "Failed to delete pricing rule.");
    }
  };

  const handleToggleStatus = async (row) => {
    setError("");
    // Optimistic status update
    setRows(prevRows =>
      prevRows.map(r => r.id === row.id ? { ...r, isActive: !r.isActive } : r)
    );
    const payload = {
      markupType: row.markupType,
      markupValue: Number(row.markupValue),
      convenienceFeeType: row.convenienceFeeType,
      convenienceFeeValue: Number(row.convenienceFeeValue),
      gstPercent: Number(row.gstPercent),
      isActive: !row.isActive
    };
    try {
      await updateHotelPricingRule(row.id, payload);
      await loadSettings();
    } catch (err) {
      // Revert status on error
      setRows(prevRows =>
        prevRows.map(r => r.id === row.id ? { ...r, isActive: r.isActive } : r)
      );
      setError(err.message || "Failed to toggle status.");
    }
  };

  const handleExport = () => {
    const headers = ["ID", "Markup Type", "Markup Value", "Convenience Fee Type", "Convenience Fee Value", "GST Percent", "Status", "Updated On", "Updated By"];
    const csvContent = [
      headers.join(","),
      ...filteredRows.map(r => [
        r.id,
        r.markupType,
        r.markupValue,
        r.convenienceFeeType,
        r.convenienceFeeValue,
        r.gstPercent,
        r.isActive ? "Active" : "Inactive",
        new Date(r.updatedAtUtc || r.createdAtUtc).toISOString(),
        r.updatedBy || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-gst-settings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-b2c-page admin-b2c-hotel-page bus-gst-settings-page-container">
      <style>{`
        .bus-gst-settings-page-container {
          padding-top: 4px !important;
        }
        .markup-primary-btn {
          transition: all 0.2s ease !important;
        }
        .markup-primary-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
        .markup-export-btn {
          transition: all 0.2s ease !important;
        }
        .markup-export-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
          background-color: #15803d !important;
          border-color: #15803d !important;
        }
        .admin-markup-table tbody tr {
          transition: background-color 0.2s ease !important;
        }
        .admin-markup-table tbody tr:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }
        .action-btn {
          transition: all 0.2s ease !important;
        }
        .action-btn:hover {
          background-color: rgba(165, 28, 73, 0.08) !important;
          border-color: #A51C49 !important;
          color: #A51C49 !important;
        }
        
        .admin-markup-coupon-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(4px) !important;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000 !important;
        }
        
        .discount-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(4px) !important;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000 !important;
        }

        /* Pill style for active and inactive status */
        .status-pill-btn {
          border-radius: 8px !important;
          padding: 6px 12px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          outline: none !important;
          transition: all 0.2s ease !important;
        }
        .status-pill-btn.active {
          border: 1px solid #10b981 !important;
          background-color: #ecfdf5 !important;
          color: #047857 !important;
        }
        .status-pill-btn.inactive {
          border: 1px solid #ef4444 !important;
          background-color: #fef2f2 !important;
          color: #b91c1c !important;
        }
        .status-pill-btn:hover {
          transform: scale(1.02) !important;
        }
      `}</style>
      {isFormViewOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={handleCancelForm}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ fontSize: "1.6rem", margin: 0, fontWeight: "700", color: "#A51C49" }}>
                Configure B2C Hotel GST Settings
              </h1>
              <button
                type="button"
                className="admin-markup-coupon-btn generate"
                onClick={handleCancelForm}
                style={{ backgroundColor: "#A51C49", borderColor: "#A51C49", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>Close Form</span>
              </button>
            </div>

          {error && <div className="admin-data-error" style={{ marginBottom: "15px", color: "red", fontSize: "0.85rem" }}>{error}</div>}

          <div className="admin-markup-coupon-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span>Markup Type: <span style={{ color: "red" }}>*</span></span>
              <select value={form.markupType} onChange={(e) => setForm(prev => ({ ...prev, markupType: e.target.value }))}>
                <option value="Flat">Flat</option>
                <option value="Percentage">Percentage</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span>Markup Value: <span style={{ color: "red" }}>*</span></span>
              <input
                type="number"
                className={validationErrors.markupValue ? "validation-error" : ""}
                value={form.markupValue}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, markupValue: e.target.value }));
                  if (e.target.value.trim()) {
                    setValidationErrors(prev => ({ ...prev, markupValue: false }));
                  }
                }}
                placeholder="e.g. 499.50"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span>Convenience Fee Type: <span style={{ color: "red" }}>*</span></span>
              <select value={form.convenienceFeeType} onChange={(e) => setForm(prev => ({ ...prev, convenienceFeeType: e.target.value }))}>
                <option value="Flat">Flat</option>
                <option value="Percentage">Percentage</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span>Convenience Fee Value: <span style={{ color: "red" }}>*</span></span>
              <input
                type="number"
                className={validationErrors.convenienceFeeValue ? "validation-error" : ""}
                value={form.convenienceFeeValue}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, convenienceFeeValue: e.target.value }));
                  if (e.target.value.trim()) {
                    setValidationErrors(prev => ({ ...prev, convenienceFeeValue: false }));
                  }
                }}
                placeholder="e.g. 200.00"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", gridColumn: "span 2" }}>
              <span>GST Percentage (%): <span style={{ color: "red" }}>*</span></span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={validationErrors.gstPercent ? "validation-error" : ""}
                value={form.gstPercent}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, gstPercent: e.target.value }));
                  if (e.target.value.trim()) {
                    setValidationErrors(prev => ({ ...prev, gstPercent: false }));
                  }
                }}
                placeholder="e.g. 18"
              />
            </label>

            <div style={{ display: "flex", gap: "12px", gridColumn: "span 2", marginTop: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#be185d", marginRight: "10px" }}>Status: <span style={{ color: "red" }}>*</span></span>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, isActive: true }))}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid " + (form.isActive ? "#10b981" : "#e2e8f0"),
                  backgroundColor: form.isActive ? "#10b981" : "transparent",
                  color: form.isActive ? "#ffffff" : "#000000",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s"
                }}
              >
                <Check size={16} style={{ display: form.isActive ? "inline" : "none" }} />
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, isActive: false }))}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid " + (!form.isActive ? "#ef4444" : "#e2e8f0"),
                  backgroundColor: !form.isActive ? "#ef4444" : "transparent",
                  color: !form.isActive ? "#ffffff" : "#000000",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s"
                }}
              >
                <X size={16} style={{ display: !form.isActive ? "inline" : "none" }} />
                Inactive
              </button>
            </div>

          </div>

          <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="admin-markup-coupon-btn clear" onClick={handleCancelForm} style={{ backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
            <button type="button" className="admin-markup-coupon-btn generate" onClick={handleSave} disabled={isSubmitting} style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}>
              {isSubmitting ? "Saving..." : editId ? "Save Changes" : "Save Settings"}
            </button>
          </footer>
        </section>
      </div>
      )}

      <>
          <section className="markup-heading" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '28px' }}>
              <span style={{ color: '#A51C49' }}>B2C Hotel</span> GST Settings
            </h2>
          </section>

          {/* ── STATS ROW ── */}
          <section className="stats-row">
            <div className="stat-card total" style={{ borderLeft: "4px solid #3b82f6" }}>
              <div className="stat-label">Total GST Settings</div>
              <div className="stat-value">{rows.length}</div>
              <div className="stat-meta">Across all hotel pricing rules</div>
            </div>
            <div className="stat-card active" style={{ borderLeft: "4px solid #10b981" }}>
              <div className="stat-label">Active</div>
              <div className="stat-value">{rows.filter(r => r.isActive).length}</div>
              <div className="stat-meta">Currently applied to bookings</div>
            </div>
            <div className="stat-card inactive" style={{ borderLeft: "4px solid #ef4444" }}>
              <div className="stat-label">Inactive</div>
              <div className="stat-value">{rows.filter(r => !r.isActive).length}</div>
              <div className="stat-meta">Paused GST rules</div>
            </div>
          </section>

          {/* ── TOOLBAR ── */}
          <section className="markup-toolbar" style={{ marginBottom: '20px' }}>
            <div className="markup-toolbar-group">
              <label className="markup-field">
                <span>Search GST Settings</span>
                <div className="search-input-wrapper">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by ID, values, updated by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
              <label className="markup-field">
                <span>Status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="markup-toolbar-actions">
              <button type="button" className="markup-primary-btn" onClick={openAddForm} style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}>
                <Plus size={14} aria-hidden="true" />
                Add GST Setting
              </button>
              <button type="button" className="markup-export-btn" onClick={handleExport} disabled={filteredRows.length === 0} style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#ffffff" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>
            </div>
          </section>

          {/* ── TABLE ── */}
          <section className="admin-markup-table-wrap">
            <table className="admin-markup-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Markup</th>
                  <th>Conv. Fee</th>
                  <th>GST Percent</th>
                  <th>Updated On</th>
                  <th>Updated By</th>
                  <th>Status</th>
                  <th className="action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8">
                      <p className="admin-markup-empty">Loading GST settings...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8">
                      <p className="admin-markup-empty" style={{ color: "red", fontWeight: "600" }}>{error}</p>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="8">
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
                            onClick={() => loadRowToForm(row)}
                            aria-label={`Open details for ${row.id}`}
                          >
                            <span>{row.id}</span>
                          </button>
                        </td>
                        <td style={{ fontWeight: 600 }}>{row.markupValue} ({row.markupType})</td>
                        <td>{row.convenienceFeeValue} ({row.convenienceFeeType})</td>
                        <td>{row.gstPercent}%</td>
                        <td>{new Date(row.updatedAtUtc || row.createdAtUtc).toLocaleString()}</td>
                        <td>{row.updatedBy || '--'}</td>
                        <td>
                          <button
                            type="button"
                            className={`status-pill-btn ${row.isActive ? "active" : "inactive"}`}
                            onClick={() => handleToggleStatus(row)}
                            aria-label={`Set ${row.id} status`}
                          >
                            {row.isActive ? "Active" : "Inactive"}
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
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                            {activeDropdownId === row.id && (
                              <div className="actions-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingGstRecord(row);
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
                                    loadRowToForm(row);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                  </svg>
                                  <span>Edit Setting</span>
                                </button>
                                <button
                                  type="button"
                                  className="dropdown-item delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteRecord(row);
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
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <AdminPagination
                currentPage={currentPage}
                totalItems={filteredRows.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemName="records"
              />
            </div>
          </section>
        </>

      {/* View Details Modal */}
      {viewingGstRecord && (
        <div className="discount-modal-overlay" onClick={() => setViewingGstRecord(null)}>
          <div className="discount-modal-container view-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>GST Setting Details</h3>
              <button
                type="button"
                onClick={() => setViewingGstRecord(null)}
                style={{
                  border: 'none',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'flex-start' }}>
              <span style={{ 
                background: viewingGstRecord.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                color: viewingGstRecord.isActive ? '#10b981' : '#64748b', 
                padding: '4px 12px', 
                borderRadius: '100px', 
                fontWeight: '600', 
                fontSize: '11px' 
              }}>
                {viewingGstRecord.isActive ? 'Active' : 'Inactive'}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A51C49', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                GST Rule ID: {viewingGstRecord.id}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MARKUP TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingGstRecord.markupType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MARKUP VALUE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingGstRecord.markupValue}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVENIENCE FEE TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingGstRecord.convenienceFeeType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVENIENCE FEE VALUE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingGstRecord.convenienceFeeValue}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GST PERCENT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingGstRecord.gstPercent}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED ON</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{new Date(viewingGstRecord.updatedAtUtc || viewingGstRecord.createdAtUtc).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED BY</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingGstRecord.updatedBy || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRecord && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeleteRecord(null)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <header className="generate-header">
              <h2>Confirm Delete</h2>
            </header>
            <div style={{ padding: "20px", fontSize: "0.9rem" }}>
              Are you sure you want to delete GST Setting ID <strong>{deleteRecord.id}</strong>? This action cannot be undone.
            </div>
            <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setDeleteRecord(null)} style={{ backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" style={{ backgroundColor: "#ef4444", borderColor: "#ef4444", color: "#ffffff" }} onClick={handleDelete}>Delete</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

