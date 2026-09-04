/* eslint-disable */
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Pencil, Trash2, Check, X, Eye } from "lucide-react";
import {
  listHotelPricingRules,
  deleteHotelPricingRule,
  updateHotelPricingRule,
  createHotelPricingRule,
} from "../../../services/adminHotelService";
import AdminPagination from "../../../components/AdminPagination";
import "../../B2C BUS MANAGEMENT/Coupon list/BusCouponList.css";
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

export default function HotelMarkupList() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal and form states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState(null);
  const [formError, setFormError] = useState("");
  const [viewingRule, setViewingRule] = useState(null);
  const [form, setForm] = useState({
    markupType: "Percentage",
    markupValue: "",
    isActive: false,
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

  const handleDelete = async (rule) => {
    const confirmed = window.confirm(
      `Delete pricing rule #${rule.id}? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteHotelPricingRule(rule.id);
      showToast("Rule deleted successfully.");
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
      const hasOtherActive = rules.some(r => r.isActive && r.id !== editRuleId);
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

  const paginatedRules = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rules.slice(startIndex, startIndex + itemsPerPage);
  }, [rules, currentPage]);

  return (
    <div className="hml-page">
      <style>{`
        /* Pill style for active and inactive status */
        .status-pill-btn {
          border-radius: 6px !important;
          padding: 4px 10px !important;
          font-weight: 500 !important;
          font-size: 11px !important;
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
      {/* Header */}
      <div className="hml-header">
        <div>
          <h2 className="hml-title" style={{ fontWeight: 600, color: '#000000' }}>
            <span style={{ color: '#A51C49', fontWeight: 600 }}>B2C Hotel</span> Markup List
          </h2>
          <p className="hml-subtitle">
            Manage markup, convenience fee &amp; GST settings for hotel bookings.
          </p>
        </div>
        <button
          className="hml-add-btn"
          onClick={openAddModal}
        >
          + Add Markup
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="hml-table-wrap">
        <table className="hml-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Markup Type</th>
              <th>Markup Value</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Updated By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                  Loading pricing rules...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                  No pricing rules found. Click "Add Markup" to create one.
                </td>
              </tr>
            ) : (
              paginatedRules.map((rule) => (
                <tr
                  key={rule.id}
                  style={
                    rule.isActive
                      ? { background: "#f0fdf4", borderLeft: "3px solid #16a34a" }
                      : {}
                  }
                >
                  <td className="hml-supplier">{rule.id}</td>
                  <td>
                    <span className="hml-cat-badge">{rule.markupType}</span>
                  </td>
                  <td>
                    <span className="hml-markup">
                      {fmtValue(rule.markupType, rule.markupValue)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-pill-btn ${rule.isActive ? "active" : "inactive"}`}
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>
                    {fmtDate(rule.createdAtUtc)}
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>
                    {fmtDate(rule.updatedAtUtc || rule.createdAtUtc)}
                  </td>
                  <td style={{ fontSize: 12.5 }}>{rule.updatedBy || "—"}</td>
                  <td className="action-col">
                    <div className="actions-dropdown-container">
                      <button
                        type="button"
                        className={`actions-trigger-btn ${activeDropdownId === rule.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === rule.id ? null : rule.id);
                        }}
                      >
                        <span>Actions</span>
                        <ChevronDown className="chevron-icon" size={12} />
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
                            <Eye className="item-icon" size={12} />
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
                            <Pencil className="item-icon" size={12} />
                          </button>
                          <button
                            type="button"
                            className="dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(rule);
                              setActiveDropdownId(null);
                            }}
                          >
                            <span>Delete Rule</span>
                            <Trash2 className="item-icon" size={12} />
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
        <AdminPagination
          currentPage={currentPage}
          totalItems={rules.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="rules"
        />
      </div>

      {/* React Portal Overlay Add/Edit Modal */}
      {isModalOpen && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsModalOpen(false)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "760px", width: "90%", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)", width: "100%" }}>
              <h1 className="form-title" style={{ color: "#000000", fontSize: "1.5rem", margin: 0, fontWeight: "700" }}>
                {editRuleId ? (
                  <>
                    Edit <span style={{ color: '#A51C49' }}>B2C Hotel</span> Markup
                  </>
                ) : (
                  <>
                    Add <span style={{ color: '#A51C49' }}>B2C Hotel</span> Markup
                  </>
                )}
              </h1>
            </div>

            <div className="admin-markup-coupon-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Markup Type:</span>
                <select value={form.markupType} onChange={(e) => setForm(prev => ({ ...prev, markupType: e.target.value }))} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}>
                  <option value="Percentage">Percentage</option>
                  <option value="Flat">Flat</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Markup Value:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.markupValue}
                  onChange={(e) => setForm(prev => ({ ...prev, markupValue: e.target.value }))}
                  placeholder={form.markupType === "Percentage" ? "e.g. 10.00" : "e.g. 500.00"}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Active Status:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px" }}>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
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
                  <span style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-primary)" }}>{form.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>

            {formError && <p className="admin-markup-coupon-error" style={{ margin: "20px 0 0", color: "var(--danger)", fontWeight: "500" }}>{formError}</p>}

            <footer style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 24px", fontSize: "1rem", backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" onClick={handleSave} style={{ padding: "10px 24px", fontSize: "1rem", backgroundColor: "#A51C49", borderColor: "#A51C49" }}>Save Changes</button>
            </footer>
          </section>
        </div>,
        document.body
      )}

      {/* React Portal Overlay Detail View Modal */}
      {viewingRule && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setViewingRule(null)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", width: "90%", maxHeight: "80vh", overflowY: "auto", background: "#ffffff", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)", width: "100%" }}>
              <h1 className="form-title" style={{ color: "#000000", fontSize: "1.5rem", margin: 0, fontWeight: "700" }}>
                <span style={{ color: '#A51C49' }}>B2C Hotel</span> Markup Detail View
              </h1>
              <button
                type="button"
                onClick={() => setViewingRule(null)}
                style={{
                  border: 'none',
                  background: '#A51C49',
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.95rem", lineHeight: "1.5" }}>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Rule ID:</strong>
                <div>#{viewingRule.id}</div>
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Active Status:</strong>
                <div>
                  <span className={`status-pill-btn ${viewingRule.isActive ? "active" : "inactive"}`} style={{ padding: '3px 10px', fontSize: '11.5px', borderRadius: '100px', cursor: 'default' }}>
                    {viewingRule.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Markup Type:</strong>
                <div>{viewingRule.markupType}</div>
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Markup Value:</strong>
                <div>{fmtValue(viewingRule.markupType, viewingRule.markupValue)}</div>
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Updated At:</strong>
                <div>{fmtDate(viewingRule.updatedAtUtc || viewingRule.createdAtUtc)}</div>
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Updated By:</strong>
                <div>{viewingRule.updatedBy || "—"}</div>
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

