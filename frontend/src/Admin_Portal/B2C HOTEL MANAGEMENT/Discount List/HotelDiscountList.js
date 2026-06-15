import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import "./HotelDiscountList.css";
import { csvCell, formatCouponDate } from "../../../utils/adminPortalUtils";
import {
  listHotelPromotions,
  createHotelPromotion,
  updateHotelPromotion,
  deleteHotelPromotion,
} from "../../../services/adminHotelService";

const DEFAULT_SORT_BY = "createdAtUtc";
const DEFAULT_SORT_ORDER = "desc";

function getSortValue(promo, sortBy) {
  if (sortBy === "id") return Number(promo.id) || 0;
  if (sortBy === "discountValue") return Number(promo.discountValue) || 0;
  if (sortBy === "startDateUtc" || sortBy === "endDateUtc" || sortBy === "createdAtUtc") {
    const ts = new Date(promo[sortBy]).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  return String(promo[sortBy] || "").toLowerCase();
}

function generatePromoCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "HTLAUTO_" + code;
}

function toInputDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function createDefaultForm() {
  return {
    code: generatePromoCode(),
    title: "",
    description: "",
    promotionType: "AutoApply",
    discountType: "Percentage",
    discountValue: "",
    maxDiscountAmount: "",
    minBookingAmount: "0",
    isActive: true,
    isExclusive: false,
    isAutoApply: true,
    priority: "1",
    maxUsage: "",
    maxUsagePerUser: "1",
    startDateUtc: "",
    endDateUtc: "",
    conditions: []
  };
}

export default function HotelDiscountList() {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createDefaultForm);
  const [formError, setFormError] = useState("");
  const [editPromoId, setEditPromoId] = useState(null);
  const [deletePromo, setDeletePromo] = useState(null);

  // Conditions temp states
  const [condType, setCondType] = useState("HotelCity");
  const [condVal, setCondVal] = useState("");

  const loadPromotions = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await listHotelPromotions();
      // Filter for auto apply promotions
      setPromotions(data.filter(p => p.isAutoApply));
    } catch (error) {
      setPromotions([]);
      setLoadError(error.message || "Unable to load hotel discounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const visiblePromotions = useMemo(() => {
    const filtered = promotions.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive);
      const matchesType =
        discountTypeFilter === "all" ||
        String(p.discountType).toLowerCase() === discountTypeFilter.toLowerCase();
      return matchesStatus && matchesType;
    });

    return [...filtered].sort((left, right) => {
      const leftVal = getSortValue(left, sortBy);
      const rightVal = getSortValue(right, sortBy);

      let result = 0;
      if (typeof leftVal === "number" && typeof rightVal === "number") {
        result = leftVal - rightVal;
      } else {
        result = String(leftVal).localeCompare(String(rightVal), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [promotions, discountTypeFilter, sortBy, sortOrder, statusFilter]);

  const handleClearFilters = () => {
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
    setStatusFilter("all");
    setDiscountTypeFilter("all");
  };

  const handleExport = () => {
    if (visiblePromotions.length === 0) return;
    const header = [
      "ID",
      "Discount Code",
      "Title",
      "Discount Type",
      "Value",
      "Max Discount",
      "Min Booking Amount",
      "Priority",
      "Status",
      "Start Date",
      "Expiry Date"
    ];

    const csvRows = visiblePromotions.map((p) => [
      p.id,
      p.code,
      p.title,
      p.discountType,
      p.discountValue,
      p.maxDiscountAmount || "N/A",
      p.minBookingAmount,
      p.priority,
      p.isActive ? "Active" : "Inactive",
      formatCouponDate(p.startDateUtc),
      formatCouponDate(p.endDateUtc)
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `admin-hotel-discounts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const openAddModal = () => {
    setFormError("");
    setEditPromoId(null);
    setForm(createDefaultForm());
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setFormError("");
    setEditPromoId(p.id);
    setForm({
      code: p.code,
      title: p.title,
      description: p.description || "",
      promotionType: p.promotionType || "AutoApply",
      discountType: p.discountType,
      discountValue: String(p.discountValue),
      maxDiscountAmount: p.maxDiscountAmount ? String(p.maxDiscountAmount) : "",
      minBookingAmount: String(p.minBookingAmount),
      isActive: p.isActive,
      isExclusive: p.isExclusive,
      isAutoApply: p.isAutoApply,
      priority: String(p.priority || 1),
      maxUsage: p.maxUsage ? String(p.maxUsage) : "",
      maxUsagePerUser: String(p.maxUsagePerUser || 1),
      startDateUtc: toInputDate(p.startDateUtc),
      endDateUtc: toInputDate(p.endDateUtc),
      conditions: p.conditions ? p.conditions.map(c => ({
        conditionType: c.conditionType,
        conditionOperator: c.conditionOperator || "Equals",
        value1: c.value1,
        value2: c.value2 || null
      })) : []
    });
    setIsModalOpen(true);
  };

  const handleAddCondition = () => {
    if (!condVal.trim()) return;
    setForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        conditionType: condType,
        conditionOperator: "Equals",
        value1: condVal.trim()
      }]
    }));
    setCondVal("");
  };

  const handleRemoveCondition = (idx) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async () => {
    setFormError("");
    const amount = Number(form.discountValue);
    const code = String(form.code || "").trim().toUpperCase().replace(/\s+/g, "");

    if (!code) {
      setFormError("Discount code reference is required.");
      return;
    }
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid discount value.");
      return;
    }

    const payload = {
      code,
      title: form.title.trim(),
      description: form.description.trim(),
      promotionType: form.promotionType,
      discountType: form.discountType,
      discountValue: amount,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      minBookingAmount: Number(form.minBookingAmount) || 0,
      isActive: form.isActive,
      isExclusive: form.isExclusive,
      isAutoApply: form.isAutoApply,
      priority: Number(form.priority) || 1,
      maxUsage: form.maxUsage ? Number(form.maxUsage) : null,
      maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
      startDateUtc: form.startDateUtc ? new Date(form.startDateUtc).toISOString() : null,
      endDateUtc: form.endDateUtc ? new Date(form.endDateUtc).toISOString() : null,
      conditions: form.conditions
    };

    try {
      if (editPromoId) {
        await updateHotelPromotion(editPromoId, payload);
      } else {
        await createHotelPromotion(payload);
      }
      setIsModalOpen(false);
      loadPromotions();
    } catch (err) {
      setFormError(err.message || "Failed to save hotel discount.");
    }
  };

  const handleDelete = async () => {
    if (!deletePromo) return;
    try {
      await deleteHotelPromotion(deletePromo.id);
      setDeletePromo(null);
      loadPromotions();
    } catch (err) {
      setLoadError(err.message || "Failed to delete discount.");
    }
  };

  const handleStatusToggle = async (promo) => {
    try {
      const payload = {
        code: promo.code,
        title: promo.title,
        description: promo.description,
        promotionType: promo.promotionType || "AutoApply",
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscountAmount: promo.maxDiscountAmount,
        minBookingAmount: promo.minBookingAmount,
        isActive: !promo.isActive,
        isExclusive: promo.isExclusive,
        isAutoApply: promo.isAutoApply,
        priority: promo.priority,
        maxUsage: promo.maxUsage,
        maxUsagePerUser: promo.maxUsagePerUser,
        startDateUtc: promo.startDateUtc,
        endDateUtc: promo.endDateUtc,
        conditions: promo.conditions || []
      };
      await updateHotelPromotion(promo.id, payload);
      loadPromotions();
    } catch (err) {
      setLoadError(err.message || "Failed to update discount status.");
    }
  };

  return (
    <>
      <section className="admin-b2c-page admin-hotel-discount-shell">
        <header className="admin-markup-coupon-header">
          <div className="admin-markup-coupon-title-wrap">
            <h1>B2C Hotel Auto Discount List</h1>
          </div>

          <div className="admin-markup-coupon-actions">
            <button
              type="button"
              className={`admin-markup-coupon-btn filter ${isFilterPanelOpen ? "active" : ""}`}
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            >
              <SlidersHorizontal size={15} />
              <span>Filter</span>
            </button>

            <button
              type="button"
              className="admin-markup-coupon-btn clear"
              onClick={handleClearFilters}
              disabled={sortBy === DEFAULT_SORT_BY && statusFilter === "all" && discountTypeFilter === "all"}
            >
              <X size={15} />
              <span>Clear Filter</span>
            </button>

            <button
              type="button"
              className="admin-markup-coupon-btn generate"
              onClick={openAddModal}
            >
              <Plus size={15} />
              <span>Add Hotel Discount</span>
            </button>

            <button
              type="button"
              className="admin-markup-coupon-btn export"
              onClick={handleExport}
              disabled={visiblePromotions.length === 0}
            >
              <Download size={15} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {isFilterPanelOpen && (
          <section className="admin-markup-coupon-filter">
            <div className="admin-markup-coupon-filter-grid">
              <label>
                <span>Sort By</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="createdAtUtc">Date Created</option>
                  <option value="id">ID</option>
                  <option value="discountValue">Value</option>
                  <option value="priority">Priority</option>
                </select>
              </label>

              <label>
                <span>Order</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label>
                <span>Discount Type</span>
                <select value={discountTypeFilter} onChange={(e) => setDiscountTypeFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="Flat">Flat</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {loadError && <p className="admin-markup-coupon-error">{loadError}</p>}

        <section className="admin-markup-coupon-table-wrap">
          <div className="admin-markup-coupon-table-scroll">
            <table className="admin-markup-coupon-table">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Reference Code</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Min Booking</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9}>
                      <p className="admin-markup-coupon-empty">Loading discounts from database...</p>
                    </td>
                  </tr>
                ) : visiblePromotions.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <p className="admin-markup-coupon-empty">No auto discounts found.</p>
                    </td>
                  </tr>
                ) : (
                  visiblePromotions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        <span className="admin-markup-coupon-code">{p.code}</span>
                      </td>
                      <td>{p.title}</td>
                      <td>{p.discountType}</td>
                      <td>{p.discountType === "Percentage" ? `${p.discountValue}%` : `₹${p.discountValue}`}</td>
                      <td>₹{p.minBookingAmount}</td>
                      <td>{p.priority}</td>
                      <td>
                        <button
                          type="button"
                          className={`admin-markup-coupon-status ${p.isActive ? "active" : "inactive"}`}
                          onClick={() => handleStatusToggle(p)}
                        >
                          {p.isActive ? <Check size={14} /> : <X size={14} />}
                          <span>{p.isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>
                      <td className="action-col">
                        <div className="admin-markup-coupon-action-group" style={{ justifyContent: "center" }}>
                          <button type="button" title="Edit" onClick={() => openEditModal(p)}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="danger" title="Delete" onClick={() => setDeletePromo(p)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {/* Add / Edit Discount Modal */}
      {isModalOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsModalOpen(false)}>
          <section
            className="admin-markup-coupon-modal"
            style={{ maxWidth: "600px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="generate-header">
              <h2>{editPromoId ? "Edit Auto Discount" : "Add B2C Hotel Discount"}</h2>
            </header>

            <div className="admin-markup-coupon-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "20px" }}>
              <label>
                <span>Reference Code:</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HTLAUTO_WINTER"
                />
              </label>
              
              <label>
                <span>Title:</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Winter Special Offer"
                />
              </label>

              <label style={{ gridColumn: "span 2" }}>
                <span>Description:</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details about the promotion terms..."
                  style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "8px", width: "100%", height: "50px", fontFamily: "inherit" }}
                />
              </label>

              <label>
                <span>Discount Type:</span>
                <select value={form.discountType} onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}>
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Flat">Flat (INR)</option>
                </select>
              </label>

              <label>
                <span>Discount Value:</span>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                  placeholder="e.g. 10 or 200"
                />
              </label>

              <label>
                <span>Max Discount (Percentage only):</span>
                <input
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                  placeholder="e.g. 1500"
                />
              </label>

              <label>
                <span>Min Booking Amount:</span>
                <input
                  type="number"
                  value={form.minBookingAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, minBookingAmount: e.target.value }))}
                />
              </label>

              <label>
                <span>Start Date:</span>
                <input
                  type="date"
                  value={form.startDateUtc}
                  onChange={(e) => setForm(prev => ({ ...prev, startDateUtc: e.target.value }))}
                />
              </label>

              <label>
                <span>Expiry Date:</span>
                <input
                  type="date"
                  value={form.endDateUtc}
                  onChange={(e) => setForm(prev => ({ ...prev, endDateUtc: e.target.value }))}
                />
              </label>

              <label>
                <span>Priority (higher applies first):</span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                />
              </label>

              <div style={{ display: "flex", gap: "15px", gridColumn: "span 2", marginTop: "5px" }}>
                <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span>Active</span>
                </label>

                <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={form.isExclusive}
                    onChange={(e) => setForm(prev => ({ ...prev, isExclusive: e.target.checked }))}
                  />
                  <span>Exclusive (runs solo)</span>
                </label>
              </div>

              {/* Conditions Sub-form */}
              <div style={{ gridColumn: "span 2", borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "5px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>Promotion Conditions (Optional):</span>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <select value={condType} onChange={(e) => setCondType(e.target.value)} style={{ padding: "6px", fontSize: "0.8rem", borderRadius: "6px" }}>
                    <option value="HotelCity">Hotel City Code</option>
                    <option value="HotelName">Hotel Name Match</option>
                    <option value="MinNights">Min Nights Required</option>
                  </select>
                  <input
                    type="text"
                    value={condVal}
                    onChange={(e) => setCondVal(e.target.value)}
                    placeholder="Value (e.g. DEL or 3)"
                    style={{ flex: 1, padding: "6px", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)" }}
                  />
                  <button type="button" onClick={handleAddCondition} style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                    Add
                  </button>
                </div>
                {form.conditions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {form.conditions.map((c, idx) => (
                      <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px", background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.75rem" }}>
                        <strong>{c.conditionType}</strong> = {c.value1}
                        <X size={12} style={{ cursor: "pointer", color: "red" }} onClick={() => handleRemoveCondition(idx)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {formError && <p className="admin-markup-coupon-error" style={{ margin: "0 20px 10px" }}>{formError}</p>}

            <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" onClick={handleSave}>Save</button>
            </footer>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePromo && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeletePromo(null)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <header className="generate-header">
              <h2>Confirm Delete</h2>
            </header>
            <div style={{ padding: "20px", fontSize: "0.9rem" }}>
              Are you sure you want to delete the discount <strong>{deletePromo.title}</strong>? This action cannot be undone.
            </div>
            <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setDeletePromo(null)}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" style={{ backgroundColor: "#d32f2f", borderColor: "#d32f2f" }} onClick={handleDelete}>Delete</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
