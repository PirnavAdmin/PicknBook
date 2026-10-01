/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  listHotelPricingRules,
  deleteHotelPricingRule,
  updateHotelPricingRule,
  createHotelPricingRule,
} from "../../../services/adminHotelService";
import { csvCell, formatDateTime } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import "../../B2C BUS MANAGEMENT/MarkupList/BusMarkupList.css";
import "./HotelMarkupList.css";

const fmtDate = (isoStr) => {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
};

const fmtValue = (type, value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return type === "Percentage" ? `${num.toFixed(2)}%` : `₹${num.toFixed(2)}`;
};

const DEFAULT_SORT_BY = "updatedAtUtc";
const DEFAULT_SORT_ORDER = "desc";

function getSortValue(row, sortBy) {
  if (sortBy === "id") return String(row.id ?? "");
  if (sortBy === "value" || sortBy === "markupValue") return Number(row.markupValue) || 0;
  if (sortBy === "updatedAtUtc" || sortBy === "updateDateUtc") {
    const ts = new Date(row.updatedAtUtc || row.createdAtUtc).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  return String(row[sortBy] ?? "").toLowerCase();
}

const getMarkupTypeBadgeClass = (markupType) => {
  const t = String(markupType || "").toLowerCase();
  if (t === "flat" || t === "fixed" || t === "0") return "markup-type-badge type-flat";
  return "markup-type-badge type-percentage";
};

export default function HotelMarkupList() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [markupTypeFilter, setMarkupTypeFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempSortBy, setTempSortBy] = useState(sortBy);
  const [tempSortOrder, setTempSortOrder] = useState(sortOrder);
  const [tempStatusFilter, setTempStatusFilter] = useState(statusFilter);
  const [tempMarkupTypeFilter, setTempMarkupTypeFilter] = useState(markupTypeFilter);

  // Modal and form states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState(null);
  const [formError, setFormError] = useState("");
  const [viewingRule, setViewingRule] = useState(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);
  const [form, setForm] = useState({
    markupType: "Percentage",
    markupValue: "",
    isActive: false,
    updatedBy: "Admin",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listHotelPricingRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const openFilterModal = () => {
    setTempSortBy(sortBy);
    setTempSortOrder(sortOrder);
    setTempStatusFilter(statusFilter);
    setTempMarkupTypeFilter(markupTypeFilter);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilter = () => {
    setSortBy(tempSortBy);
    setSortOrder(tempSortOrder);
    setStatusFilter(tempStatusFilter);
    setMarkupTypeFilter(tempMarkupTypeFilter);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilter = () => {
    setTempSortBy(DEFAULT_SORT_BY);
    setTempSortOrder(DEFAULT_SORT_ORDER);
    setTempStatusFilter("all");
    setTempMarkupTypeFilter("all");
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
    setStatusFilter("all");
    setMarkupTypeFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const visibleRules = useMemo(() => {
    const filtered = rules.filter((rule) => {
      const isAct = Boolean(rule.isActive);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isAct) ||
        (statusFilter === "inactive" && !isAct);

      const mType = String(rule.markupType || "").toLowerCase();
      const matchesMarkupType =
        markupTypeFilter === "all" || mType === markupTypeFilter.toLowerCase();

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [
          String(rule.id || ""),
          String(rule.markupType || ""),
          String(rule.markupValue || ""),
          String(rule.updatedBy || ""),
          isAct ? "active" : "inactive",
          formatDateTime(rule.createdAtUtc),
          fmtDate(rule.updatedAtUtc),
        ].some((f) => f.toLowerCase().includes(query));

      return matchesStatus && matchesMarkupType && matchesSearch;
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftVal = getSortValue(left, sortBy);
      const rightVal = getSortValue(right, sortBy);

      let res = 0;
      if (typeof leftVal === "number" && typeof rightVal === "number") {
        res = leftVal - rightVal;
      } else {
        res = String(leftVal).localeCompare(String(rightVal), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sortOrder === "asc" ? res : -res;
    });

    return sorted;
  }, [rules, statusFilter, markupTypeFilter, searchTerm, sortBy, sortOrder]);

  const paginatedRules = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleRules.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleRules, currentPage, itemsPerPage]);

  const handleExport = () => {
    if (visibleRules.length === 0) return;

    const header = [
      "ID",
      "Markup Type",
      "Markup Value",
      "Status",
      "Created At",
      "Updated At",
      "Updated By",
    ];

    const csvRows = visibleRules.map((rule) => [
      rule.id,
      rule.markupType,
      fmtValue(rule.markupType, rule.markupValue),
      rule.isActive ? "Active" : "Inactive",
      formatDateTime(rule.createdAtUtc),
      formatDateTime(rule.updatedAtUtc || rule.createdAtUtc),
      rule.updatedBy || "—",
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
    link.download = `admin-hotel-markup-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRuleTarget) return;
    try {
      await deleteHotelPricingRule(deleteRuleTarget.id);
      showToast("Rule deleted successfully.");
      setDeleteRuleTarget(null);
      setViewingRule((prev) => (prev?.id === deleteRuleTarget.id ? null : prev));
      fetchRules();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (rule) => {
    const nextActive = !rule.isActive;
    if (nextActive) {
      const confirmed = window.confirm(
        "Activating this rule will deactivate all other rules. Continue?"
      );
      if (!confirmed) return;
    }
    try {
      await updateHotelPricingRule(rule.id, {
        markupType: rule.markupType,
        markupValue: rule.markupValue,
        isActive: nextActive,
      });
      showToast(nextActive ? "Rule activated." : "Rule deactivated.");
      fetchRules();
    } catch (err) {
      showToast(`Toggle failed: ${err.message}`);
    }
  };

  const openAddModal = () => {
    setFormError("");
    setEditRuleId(null);
    setForm({
      markupType: "Percentage",
      markupValue: "",
      isActive: false,
      updatedBy: "Admin",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setFormError("");
    setEditRuleId(rule.id);
    setForm({
      markupType: rule.markupType || "Percentage",
      markupValue: rule.markupValue != null ? String(rule.markupValue) : "",
      isActive: Boolean(rule.isActive),
      updatedBy: rule.updatedBy || "Admin",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setFormError("");
    const markupVal = Number(form.markupValue);

    if (!Number.isFinite(markupVal) || markupVal < 0) {
      setFormError("Markup value must be a number >= 0.");
      return;
    }
    if (form.markupType === "Percentage" && markupVal > 100) {
      setFormError("Markup percentage cannot exceed 100%.");
      return;
    }

    if (form.isActive) {
      const hasOtherActive = rules.some((r) => r.isActive && r.id !== editRuleId);
      if (hasOtherActive) {
        const confirmed = window.confirm(
          "Setting this rule as active will automatically deactivate all other pricing rules. Continue?"
        );
        if (!confirmed) return;
      }
    }

    const payload = {
      markupType: form.markupType,
      markupValue: markupVal,
      isActive: form.isActive,
      updatedBy: form.updatedBy || "Admin",
    };

    try {
      if (editRuleId) {
        await updateHotelPricingRule(editRuleId, payload);
        showToast("Pricing rule updated successfully.");
      } else {
        await createHotelPricingRule(payload);
        showToast("Pricing rule created successfully.");
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      setFormError(err.message || "Failed to save pricing rule.");
    }
  };

  if (error) {
    return (
      <div className="admin-b2c-page bus-markup-list-page-container">
        <section className="markup-heading">
          <p className="markup-heading-main">
            B2C Hotel <span className="markup-heading-sub">Markup List</span>
          </p>
        </section>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginTop: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>Network Error</span>
          </div>
          <button 
            type="button" 
            onClick={fetchRules}
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
          B2C Hotel <span className="markup-heading-sub">Markup List</span>
        </p>
      </section>

      {/* ── STATS ROW ── */}
      <section className="stats-row">
        <div className="stat-card total">
          <div className="stat-label">Total Markups</div>
          <div className="stat-value">{rules.length}</div>
          <div className="stat-meta">All pricing rules</div>
        </div>
        <div className="stat-card active">
          <div className="stat-label">Active</div>
          <div className="stat-value">{rules.filter((r) => r.isActive).length}</div>
          <div className="stat-meta">Currently applied</div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{rules.filter((r) => !r.isActive).length}</div>
          <div className="stat-meta">Paused rules</div>
        </div>
      </section>

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#047857",
            fontSize: "13px",
            fontWeight: "600",
            marginBottom: "12px",
          }}
        >
          {toast}
        </div>
      )}

      {/* ── TOOLBAR (ALL IN ONE LINE) ── */}
      <section className="markup-toolbar">
        <div className="markup-search-wrap">
          <Search size={15} className="markup-search-icon" />
          <input
            type="text"
            className="markup-search-input"
            placeholder="Search markups..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button type="button" className="markup-search-clear" onClick={() => setSearchTerm("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="markup-toolbar-actions">
          <button type="button" className="markup-primary-btn" onClick={openAddModal}>
            <Plus size={14} />
            Add New
          </button>
          <button type="button" className="markup-filter-btn" onClick={openFilterModal}>
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            className="markup-export-btn"
            onClick={handleExport}
            disabled={visibleRules.length === 0}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </section>

                  {/* ── FILTER FORM PANEL (INLINE ABOVE TABLE, ALL IN ONE LINE, NO DIVIDER LINES) ── */}
      {isFilterModalOpen && (
        <div className="admin-markup-filter-panel">
          <div className="admin-markup-filter-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} style={{ color: '#A41B48' }} />
              <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Filter Markups</h4>
            </div>
            <button type="button" className="close-x" onClick={() => setIsFilterModalOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="admin-markup-filter-row">
            <label className="markup-filter-field">
              <span>Markup Type</span>
              <select value={tempMarkupTypeFilter} onChange={(e) => setTempMarkupTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="Percentage">Percentage</option>
                <option value="Flat">Flat</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Status</span>
              <select value={tempStatusFilter} onChange={(e) => setTempStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Sort By</span>
              <select value={tempSortBy} onChange={(e) => setTempSortBy(e.target.value)}>
                <option value="updatedAtUtc">Updated On</option>
                <option value="id">ID</option>
                <option value="value">Markup Value</option>
                <option value="markupType">Markup Type</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Order</span>
              <select value={tempSortOrder} onChange={(e) => setTempSortOrder(e.target.value)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>

            <div className="markup-filter-actions-inline">
              <button type="button" className="markup-btn-reset" onClick={handleResetFilter}>
                Reset
              </button>
              <button type="button" className="markup-btn-apply" onClick={handleApplyFilter}>
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE WRAPPER ── */}
      <section className="admin-markup-table-wrap">
        {loading ? (
          <p className="admin-markup-empty">Loading pricing rules...</p>
        ) : error ? (
          <p className="admin-markup-empty" style={{ color: "red" }}>{error}</p>
        ) : (
          <table className="admin-markup-table">
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Markup Type</th>
                <th>Markup Value</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Updated Date</th>
                <th>Updated By</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <p className="admin-markup-empty">No pricing rules found.</p>
                  </td>
                </tr>
              ) : (
                paginatedRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <button
                        type="button"
                        className="markup-id-chip col-id-text"
                        onClick={() => setViewingRule(rule)}
                        aria-label={`Open basic details for ${rule.id}`}
                      >
                        <span>{rule.id}</span>
                      </button>
                    </td>
                    <td>
                      <span className={getMarkupTypeBadgeClass(rule.markupType)}>{rule.markupType}</span>
                    </td>
                    <td className="col-value-text">
                      {fmtValue(rule.markupType, rule.markupValue)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`markup-status-toggle ${rule.isActive ? "active" : "inactive"}`}
                        onClick={() => handleToggleActive(rule)}
                      >
                        <span>{rule.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td className="col-created-date-text">{formatDateTime(rule.createdAtUtc)}</td>
                    <td className="col-updated-date-text">{formatDateTime(rule.updatedAtUtc || rule.createdAtUtc)}</td>
                    <td className="col-updatedby-text">{rule.updatedBy || "—"}</td>
                    <td className="action-col">
                      <div className="actions-dropdown-container">
                        <button
                          type="button"
                          className={`actions-trigger-btn ${activeDropdownId === rule.id ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === rule.id ? null : rule.id);
                          }}
                        >
                          <span>Actions</span>
                          <ChevronDown size={12} className="chevron-icon" />
                        </button>
                        {activeDropdownId === rule.id && (
                          <div className="actions-dropdown-menu">
                            <button
                              type="button"
                              className="dropdown-item view"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingRule(rule);
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
                                openEditModal(rule);
                                setActiveDropdownId(null);
                              }}
                            >
                              <span>Edit Rule</span>
                              <Pencil size={13} className="item-icon" />
                            </button>
                            <button
                              type="button"
                              className="dropdown-item delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRuleTarget(rule);
                                setActiveDropdownId(null);
                              }}
                            >
                              <span>Delete Rule</span>
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
        {visibleRules.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <AdminPagination
              currentPage={currentPage}
              totalItems={visibleRules.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemName="pricing rules"
            />
          </div>
        )}
      </section>

      

      {/* ── ADD / EDIT MODAL ── */}
      {isModalOpen && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-markup-filter-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="admin-markup-filter-header">
              <h3 style={{ color: "#A51C49", fontSize: "1.2rem", margin: 0, fontWeight: "700" }}>
                {editRuleId ? "Edit B2C Hotel Markup" : "Add B2C Hotel Markup"}
              </h3>
              <button type="button" className="close-x" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem" }}>
                {formError}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
              <label className="markup-filter-field">
                <span>MARKUP TYPE *</span>
                <select
                  value={form.markupType}
                  onChange={(e) => setForm((prev) => ({ ...prev, markupType: e.target.value }))}
                >
                  <option value="Percentage">Percentage</option>
                  <option value="Flat">Flat</option>
                </select>
              </label>

              <label className="markup-filter-field">
                <span>MARKUP VALUE *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.markupValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, markupValue: e.target.value }))}
                  placeholder={form.markupType === "Percentage" ? "e.g. 10.00" : "e.g. 500.00"}
                />
              </label>

              <label className="markup-filter-field">
                <span>UPDATED BY</span>
                <input
                  type="text"
                  value={form.updatedBy}
                  onChange={(e) => setForm((prev) => ({ ...prev, updatedBy: e.target.value }))}
                  placeholder="Enter name"
                />
              </label>

              <div className="markup-filter-field">
                <span>ACTIVE STATUS</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px" }}>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    style={{
                      position: "relative",
                      width: "44px",
                      height: "24px",
                      borderRadius: "12px",
                      backgroundColor: form.isActive ? "#A51C49" : "#cbd5e1",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.3s",
                      padding: 0,
                      outline: "none"
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: "2px",
                      left: form.isActive ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      transition: "left 0.3s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                    }} />
                  </button>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-markup-filter-footer">
              <button
                type="button"
                className="markup-btn-reset"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="markup-btn-apply"
                onClick={handleSave}
                style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DETAIL VIEW MODAL ── */}
      {viewingRule && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setViewingRule(null)}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "700", fontSize: "18px", margin: 0 }}>
                Hotel Markup Detail View
              </h3>
              <button
                type="button"
                onClick={() => setViewingRule(null)}
                style={{
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              <span className={`markup-status-toggle ${viewingRule.isActive ? "active" : "inactive"}`}>
                {viewingRule.isActive ? "Active" : "Inactive"}
              </span>
              <span style={{ background: "#fdf2f8", color: "#A41B48", padding: "4px 12px", borderRadius: "100px", fontWeight: "700", fontSize: "11px", border: "1px solid rgba(165, 28, 73, 0.15)" }}>
                {viewingRule.markupType}
              </span>
              <span style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", padding: "4px 12px", borderRadius: "100px", fontWeight: "600", fontSize: "11px" }}>
                {fmtValue(viewingRule.markupType, viewingRule.markupValue)}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", textAlign: "left" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>RULE ID</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>#{viewingRule.id}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MARKUP TYPE</span>
                <div><span className={getMarkupTypeBadgeClass(viewingRule.markupType)}>{viewingRule.markupType}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MARKUP VALUE</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{fmtValue(viewingRule.markupType, viewingRule.markupValue)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>UPDATED BY</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{viewingRule.updatedBy || "—"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>CREATED AT</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{formatDateTime(viewingRule.createdAtUtc)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>UPDATED AT</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{formatDateTime(viewingRule.updatedAtUtc || viewingRule.createdAtUtc)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteRuleTarget && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeleteRuleTarget(null)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Delete Rule</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setDeleteRuleTarget(null)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '8px 0 20px', textAlign: 'left', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete pricing rule <strong>#{deleteRuleTarget.id}</strong>? This action cannot be undone.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setDeleteRuleTarget(null)} 
                style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "6px 14px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
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
