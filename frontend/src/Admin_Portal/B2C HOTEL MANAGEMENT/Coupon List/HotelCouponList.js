/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Download,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
  ChevronDown,
  Eye,
} from "lucide-react";
import "./HotelCouponList.css";
import AdminPagination from "../../../components/AdminPagination";
import { csvCell, formatCouponDate, formatCouponDateTime } from "../../../utils/adminPortalUtils";
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
  if (sortBy === "discountValue") return Number(promo.value !== undefined ? promo.value : promo.discountValue) || 0;
  if (sortBy === "maxUsage") return Number(promo.useLimit !== undefined ? promo.useLimit : promo.maxUsage) || 999999;
  if (sortBy === "startDateUtc") {
    const val = promo.startDate || promo.startDateUtc;
    const ts = new Date(val).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  if (sortBy === "endDateUtc") {
    const val = promo.expiryDate || promo.endDateUtc;
    const ts = new Date(val).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  if (sortBy === "createdAtUtc") {
    const val = promo.entryDateUtc || promo.createdAtUtc;
    const ts = new Date(val).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  if (sortBy === "code") {
    return String(promo.couponCode || promo.code || "").toLowerCase();
  }
  return String(promo[sortBy] || "").toLowerCase();
}

function generatePromoCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "HTL" + code;
}

function toInputDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function createDefaultForm() {
  return {
    code: "",
    title: "",
    description: "",
    promotionType: "Coupon",
    discountType: "Flat",
    discountValue: "",
    maxDiscountAmount: "",
    minBookingAmount: "",
    isActive: true,
    isExclusive: true,
    isAutoApply: false,
    priority: "",
    maxUsage: "",
    maxUsagePerUser: "",
    startDateUtc: "",
    endDateUtc: "",
    conditions: []
  };
}

export default function HotelCouponList() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [viewingCoupon, setViewingCoupon] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("all");
  const [isFormViewOpen, setIsFormViewOpen] = useState(() => {
    return sessionStorage.getItem("hotel_coupon_form_open") === "true";
  });
  const [form, setForm] = useState(() => {
    const savedForm = sessionStorage.getItem("hotel_coupon_form_data");
    return savedForm ? JSON.parse(savedForm) : createDefaultForm();
  });
  const [formError, setFormError] = useState("");
  const [editPromoId, setEditPromoId] = useState(() => {
    const saved = sessionStorage.getItem("hotel_coupon_edit_id");
    return saved ? Number(saved) : null;
  });
  const [deletePromo, setDeletePromo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Synchronize form states to sessionStorage to persist across page reloads
  useEffect(() => {
    sessionStorage.setItem("hotel_coupon_form_open", isFormViewOpen);
    if (editPromoId !== null) {
      sessionStorage.setItem("hotel_coupon_edit_id", editPromoId);
    } else {
      sessionStorage.removeItem("hotel_coupon_edit_id");
    }
    sessionStorage.setItem("hotel_coupon_form_data", JSON.stringify(form));
  }, [isFormViewOpen, editPromoId, form]);

  // Conditions temp states
  const [condType, setCondType] = useState("HotelCity");
  const [condVal, setCondVal] = useState("");

  const loadPromotions = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await listHotelPromotions();
      // Filter for manual coupons (isAutoApply === false or null/undefined)
      setPromotions((data || []).filter(p => p.isAutoApply === false || p.isAutoApply === null || p.isAutoApply === undefined));
    } catch (error) {
      setPromotions([]);
      setLoadError(error.message || "Unable to load hotel coupons.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const visiblePromotions = useMemo(() => {
    const filtered = promotions.filter((p) => {
      const isPromoActive = p.status === "Active" || p.isActive;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isPromoActive) ||
        (statusFilter === "inactive" && !isPromoActive);
      const distType = p.couponType || p.discountType;
      const matchesType =
        discountTypeFilter === "all" ||
        String(distType).toLowerCase() === discountTypeFilter.toLowerCase();
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

  const paginatedPromotions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visiblePromotions.slice(startIndex, startIndex + itemsPerPage);
  }, [visiblePromotions, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [discountTypeFilter, sortBy, sortOrder, statusFilter]);

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
      "Coupon Code",
      "Title",
      "Discount Type",
      "Value",
      "Max Discount",
      "Min Booking Amount",
      "Start Date",
      "Expiry Date",
      "Use Limit",
      "Status",
      "Used Count"
    ];

    const csvRows = visiblePromotions.map((p) => [
      p.id,
      p.couponCode || p.code,
      p.title || p.couponCode || p.code,
      p.couponType || p.discountType,
      p.value !== undefined ? p.value : p.discountValue,
      p.maxDiscountAmount || "N/A",
      p.minBookingAmount,
      formatCouponDate(p.startDateUtc || p.startDate),
      formatCouponDate(p.endDateUtc || p.expiryDate),
      (p.useLimit !== undefined ? p.useLimit : p.maxUsage) || "Unlimited",
      (p.status === "Active" || p.isActive) ? "Active" : "Inactive",
      p.usedCount
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `admin-hotel-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const openAddModal = () => {
    setFormError("");
    setValidationErrors({});
    setEditPromoId(null);
    setForm(createDefaultForm());
    setIsFormViewOpen(true);
  };

  const openEditModal = (p) => {
    setFormError("");
    setValidationErrors({});
    setEditPromoId(p.id);
    setForm({
      code: p.code || p.couponCode || "",
      title: p.title || p.couponCode || p.code || "",
      description: p.remark || p.description || "",
      promotionType: p.promotionType || "Coupon",
      discountType: p.discountType || p.couponType || "Flat",
      discountValue: String(p.discountValue !== undefined ? p.discountValue : (p.value !== undefined ? p.value : "")),
      maxDiscountAmount: p.maxDiscountAmount ? String(p.maxDiscountAmount) : "",
      minBookingAmount: String(p.minBookingAmount || 0),
      isActive: p.status ? p.status === "Active" : (p.isActive !== undefined ? p.isActive : true),
      isExclusive: p.isExclusive !== undefined ? p.isExclusive : true,
      isAutoApply: p.isAutoApply !== undefined ? p.isAutoApply : false,
      priority: String(p.priority || 0),
      maxUsage: p.maxUsage ? String(p.maxUsage) : (p.useLimit ? String(p.useLimit) : ""),
      maxUsagePerUser: String(p.maxUsagePerUser || 1),
      startDateUtc: toInputDate(p.startDateUtc || p.startDate),
      endDateUtc: toInputDate(p.endDateUtc || p.expiryDate),
      conditions: p.conditions ? p.conditions.map(c => ({
        conditionType: c.conditionType,
        conditionOperator: c.conditionOperator || "Equals",
        value1: c.value1,
        value2: c.value2 || null
      })) : []
    });
    setIsFormViewOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormViewOpen(false);
    sessionStorage.removeItem("hotel_coupon_form_open");
    sessionStorage.removeItem("hotel_coupon_edit_id");
    sessionStorage.removeItem("hotel_coupon_form_data");
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

    const errors = {};
    if (!code) errors.code = true;
    if (!form.title.trim()) errors.title = true;
    if (!Number.isFinite(amount) || amount <= 0) errors.discountValue = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setFormError("Please fill in all compulsory fields with valid values.");
      return;
    }
    setValidationErrors({});

    const payload = {
      couponCode: code,
      couponType: form.discountType,
      value: amount,
      minBookingAmount: Number(form.minBookingAmount) || 0,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : 0,
      startDate: form.startDateUtc || null,
      expiryDate: form.endDateUtc || null,
      useLimit: form.maxUsage ? Number(form.maxUsage) : 0,
      maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
      status: form.isActive ? "Active" : "Inactive",
      isFirstTimeUserOnly: false,
      remark: form.description.trim() || null,
      isAutoApply: false,
      promotionType: form.promotionType || "Coupon",
      priority: Number(form.priority) || 1,
      isExclusive: form.isExclusive,
      conditions: form.conditions
    };

    try {
      if (editPromoId) {
        await updateHotelPromotion(editPromoId, payload);
      } else {
        await createHotelPromotion(payload);
      }
      setIsFormViewOpen(false);
      sessionStorage.removeItem("hotel_coupon_form_open");
      sessionStorage.removeItem("hotel_coupon_edit_id");
      sessionStorage.removeItem("hotel_coupon_form_data");
      loadPromotions();
    } catch (err) {
      setFormError(err.message || "Failed to save hotel coupon.");
    }
  };

  const handleDelete = async () => {
    if (!deletePromo) return;
    try {
      await deleteHotelPromotion(deletePromo.id);
      setDeletePromo(null);
      loadPromotions();
    } catch (err) {
      setLoadError(err.message || "Failed to delete coupon.");
    }
  };

  const handleStatusToggle = async (promo) => {
    const isCurrentlyActive = promo.status === "Active" || promo.isActive;
    // Optimistic status update
    setPromotions(prev =>
      prev.map(p => p.id === promo.id ? { ...p, isActive: !isCurrentlyActive, status: !isCurrentlyActive ? "Active" : "Inactive" } : p)
    );
    try {
      const payload = {
        couponCode: promo.couponCode || promo.code,
        couponType: promo.couponType || promo.discountType,
        value: promo.value !== undefined ? promo.value : promo.discountValue,
        minBookingAmount: promo.minBookingAmount || 0,
        maxDiscountAmount: promo.maxDiscountAmount || 0,
        startDate: promo.startDate || promo.startDateUtc || null,
        expiryDate: promo.expiryDate || promo.endDateUtc || null,
        useLimit: promo.useLimit !== undefined ? promo.useLimit : (promo.maxUsage || 0),
        maxUsagePerUser: promo.maxUsagePerUser || 1,
        status: !isCurrentlyActive ? "Active" : "Inactive",
        isFirstTimeUserOnly: promo.isFirstTimeUserOnly || false,
        remark: promo.remark || promo.description || null
      };
      await updateHotelPromotion(promo.id, payload);
      loadPromotions();
    } catch (err) {
      // Revert status on error
      setPromotions(prev =>
        prev.map(p => p.id === promo.id ? { ...p, isActive: isCurrentlyActive, status: isCurrentlyActive ? "Active" : "Inactive" } : p)
      );
      setLoadError(err.message || "Failed to update coupon status.");
    }
  };

  return (
    <>
      <style>{`
        .btn-hover {
          transition: all 0.2s ease !important;
        }
        .btn-hover:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12) !important;
        }
        .admin-markup-coupon-table tbody tr {
          transition: background-color 0.2s ease !important;
        }
        .admin-markup-coupon-table tbody tr:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }
        .actions-trigger-btn {
          transition: all 0.2s ease !important;
        }
        .actions-trigger-btn:hover {
          background-color: rgba(165, 28, 73, 0.08) !important;
          border-color: #A51C49 !important;
          color: #A51C49 !important;
        }
        .admin-markup-coupon-btn {
          transition: all 0.2s ease !important;
        }
        .admin-markup-coupon-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 className="form-title" style={{ color: "#A51C49", fontSize: "1.6rem", margin: 0, fontWeight: "700" }}>
                {editPromoId ? "Edit Hotel B2C Hotel coupon" : "Add Hotel B2C Hotel coupon"}
              </h1>
              <button
                type="button"
                className="admin-markup-coupon-btn generate"
                onClick={handleCancelForm}
                style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}
              >
                Close Form
              </button>
            </div>

            <div className="admin-markup-coupon-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label>
                <span>Coupon Code: <span style={{ color: "red" }}>*</span></span>
                <input
                  type="text"
                  className={validationErrors.code ? "validation-error" : ""}
                  value={form.code}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }));
                    if (e.target.value.trim()) {
                      setValidationErrors(prev => ({ ...prev, code: false }));
                    }
                  }}
                  placeholder="e.g. HOTEL500"
                />
              </label>
              
              <label>
                <span>Title: <span style={{ color: "red" }}>*</span></span>
                <input
                  type="text"
                  className={validationErrors.title ? "validation-error" : ""}
                  value={form.title}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, title: e.target.value }));
                    if (e.target.value.trim()) {
                      setValidationErrors(prev => ({ ...prev, title: false }));
                    }
                  }}
                  placeholder="e.g. Save flat ₹500"
                />
              </label>

              <label>
                <span>Discount Type: <span style={{ color: "red" }}>*</span></span>
                <select value={form.discountType} onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}>
                  <option value="Flat">Flat (INR)</option>
                  <option value="Percentage">Percentage (%)</option>
                </select>
              </label>

              <label>
                <span>Discount Value: <span style={{ color: "red" }}>*</span></span>
                <input
                  type="number"
                  className={validationErrors.discountValue ? "validation-error" : ""}
                  value={form.discountValue}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, discountValue: e.target.value }));
                    if (e.target.value.trim()) {
                      setValidationErrors(prev => ({ ...prev, discountValue: false }));
                    }
                  }}
                  placeholder="e.g. 500 or 10"
                />
              </label>

              <label>
                <span>Max Discount (Percentage only):</span>
                <input
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                  placeholder="e.g. 1000"
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
                <span>Max Total Usages (Optional):</span>
                <input
                  type="number"
                  value={form.maxUsage}
                  onChange={(e) => setForm(prev => ({ ...prev, maxUsage: e.target.value }))}
                  placeholder="e.g. 100"
                />
              </label>

              <label>
                <span>Max Usages Per User:</span>
                <input
                  type="number"
                  value={form.maxUsagePerUser}
                  onChange={(e) => setForm(prev => ({ ...prev, maxUsagePerUser: e.target.value }))}
                />
              </label>

              {/* Conditions Sub-form and Priority in one line side-by-side without borderTop */}
              <div style={{ gridColumn: "span 2", display: "flex", gap: "24px", marginTop: "5px" }}>
                
                {/* Promotion Conditions column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#000000" }}>Promotion Conditions (Optional):</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <select value={condType} onChange={(e) => setCondType(e.target.value)} style={{ width: "180px", minWidth: "140px", padding: "8px 10px", fontSize: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <option value="HotelCity">Hotel City Code</option>
                      <option value="HotelName">Hotel Name Match</option>
                      <option value="MinNights">Min Nights Required</option>
                    </select>
                    <input
                      type="text"
                      value={condVal}
                      onChange={(e) => setCondVal(e.target.value)}
                      placeholder="Value (e.g. DEL or 3)"
                      style={{ flex: 1, minWidth: "100px", padding: "8px 10px", fontSize: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}
                    />
                    <button type="button" onClick={handleAddCondition} style={{ padding: "8px 16px", fontSize: "0.85rem", backgroundColor: "#be185d", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>
                      Add
                    </button>
                  </div>
                </div>

                {/* Priority column */}
                <div style={{ width: "120px", display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#be185d" }}>Priority:</span>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}
                  />
                </div>

              </div>

              {form.conditions.length > 0 && (
                <div style={{ gridColumn: "span 2", display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {form.conditions.map((c, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px", background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.75rem" }}>
                      <strong>{c.conditionType}</strong> = {c.value1}
                      <X size={12} style={{ cursor: "pointer", color: "red" }} onClick={() => handleRemoveCondition(idx)} />
                    </span>
                  ))}
                </div>
              )}

              {/* Description - placed MIDDLE */}
              <label style={{ gridColumn: "span 2" }}>
                <span>Description:</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details about the promotion terms..."
                  rows={3}
                  style={{ borderRadius: "10px", padding: "8px", width: "100%", height: "75px", fontFamily: "inherit" }}
                />
              </label>

              {/* Options - placed BELOW description */}
              <div style={{ display: "flex", gap: "12px", gridColumn: "span 2", marginTop: "5px", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#be185d", marginRight: "10px" }}>Options:</span>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid " + (form.isActive ? "#be185d" : "#e2e8f0"),
                    backgroundColor: form.isActive ? "#be185d" : "transparent",
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
                  onClick={() => setForm(prev => ({ ...prev, isExclusive: !prev.isExclusive }))}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid " + (form.isExclusive ? "#be185d" : "#e2e8f0"),
                    backgroundColor: form.isExclusive ? "#be185d" : "transparent",
                    color: form.isExclusive ? "#ffffff" : "#000000",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <Check size={16} style={{ display: form.isExclusive ? "inline" : "none" }} />
                  Exclusive
                </button>
              </div>
            </div>

            {formError && <p className="admin-markup-coupon-error" style={{ margin: "15px 0" }}>{formError}</p>}

            <footer style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={handleCancelForm} style={{ backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" onClick={handleSave} style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}>Save Changes</button>
            </footer>
          </section>
        </div>
      )}

      <section className="admin-b2c-page admin-b2c-hotel-page admin-hotel-coupon-shell">
          <header className="admin-markup-coupon-header">
            <div className="admin-markup-coupon-title-wrap" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '28px' }}>
                <span style={{ color: '#A51C49' }}>B2C Hotel</span> Coupon List
              </h2>
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
                className="admin-markup-coupon-btn used-coupons-nav-btn"
                onClick={() => navigate("/admin/b2c-hotel/used-coupon-list")}
                style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}
              >
                <span>Used Coupon List</span>
              </button>

              <button
                type="button"
                className="admin-markup-coupon-btn generate"
                onClick={openAddModal}
              >
                <Plus size={15} />
                <span>Add Hotel Coupon</span>
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
                    <option value="code">Coupon Code</option>
                    <option value="discountValue">Value</option>
                    <option value="startDateUtc">Start Date</option>
                    <option value="endDateUtc">Expiry Date</option>
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



          <section className="admin-markup-coupon-table-wrap">
            <div className="admin-markup-coupon-table-scroll">
              <table className="admin-markup-coupon-table">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Coupon Code</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Min Booking</th>
                    <th>Used Count</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-coupon-empty">Loading coupons from database...</p>
                      </td>
                    </tr>
                  ) : loadError ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-coupon-empty" style={{ color: "red", fontWeight: "600" }}>{loadError}</p>
                      </td>
                    </tr>
                  ) : visiblePromotions.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-coupon-empty">No hotel coupons found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPromotions.map((p, index) => (
                      <tr key={p.id}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>
                          <span className="admin-markup-coupon-code">{p.couponCode || p.code}</span>
                        </td>
                        <td>{p.title || p.couponCode || p.code}</td>
                        <td>{p.couponType || p.discountType}</td>
                        <td>
                          {(p.couponType || p.discountType) === "Percentage" 
                            ? `${p.value !== undefined ? p.value : p.discountValue}%` 
                            : `₹${p.value !== undefined ? p.value : p.discountValue}`}
                        </td>
                        <td>₹{p.minBookingAmount}</td>
                        <td>{p.usedCount} / {p.useLimit !== undefined ? (p.useLimit || "∞") : (p.maxUsage || "∞")}</td>
                        <td>
                          <button
                            type="button"
                            className={`status-pill-btn ${(p.status === "Active" || p.isActive) ? "active" : "inactive"}`}
                            onClick={() => handleStatusToggle(p)}
                          >
                            {(p.status === "Active" || p.isActive) ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="action-col">
                          <div className="actions-dropdown-container">
                            <button
                              type="button"
                              className={`actions-trigger-btn ${activeDropdownId === p.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === p.id ? null : p.id);
                              }}
                            >
                              <span>Actions</span>
                              <ChevronDown className="chevron-icon" size={12} />
                            </button>
                            {activeDropdownId === p.id && (
                              <div className="actions-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingCoupon(p);
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
                                    openEditModal(p);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <span>Edit Coupon</span>
                                  <Pencil className="item-icon" size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="dropdown-item delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletePromo(p);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  <span>Delete Coupon</span>
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
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <AdminPagination
                currentPage={currentPage}
                totalItems={visiblePromotions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemName="coupons"
              />
            </div>
          </section>
        </section>

      {/* Delete Confirmation Modal */}
      {deletePromo && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeletePromo(null)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <header className="generate-header">
              <h2>Confirm Delete</h2>
            </header>
            <div style={{ padding: "20px", fontSize: "0.9rem" }}>
              Are you sure you want to delete the coupon code <strong>{deletePromo.code || deletePromo.couponCode}</strong>? This action cannot be undone.
            </div>
            <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setDeletePromo(null)} style={{ backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" style={{ backgroundColor: "#ef4444", borderColor: "#ef4444", color: "#ffffff" }} onClick={handleDelete}>Delete</button>
            </footer>
          </section>
        </div>
      )}

      {/* Coupon Details View Modal */}
      {viewingCoupon && (
        <div className="discount-modal-overlay" onClick={() => setViewingCoupon(null)}>
          <div className="discount-modal-container view-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>Coupon Detail View</h3>
              <button
                type="button"
                onClick={() => setViewingCoupon(null)}
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
                background: (viewingCoupon.status === 'Active' || viewingCoupon.isActive) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                color: (viewingCoupon.status === 'Active' || viewingCoupon.isActive) ? '#10b981' : '#64748b', 
                padding: '4px 12px', 
                borderRadius: '100px', 
                fontWeight: '600', 
                fontSize: '11px' 
              }}>
                {(viewingCoupon.status === 'Active' || viewingCoupon.isActive) ? 'Active' : 'Inactive'}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A51C49', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                {viewingCoupon.couponCode || viewingCoupon.code}
              </span>
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {(viewingCoupon.couponType || viewingCoupon.discountType) === 'Percentage' ? `${viewingCoupon.value !== undefined ? viewingCoupon.value : viewingCoupon.discountValue}%` : `INR ${viewingCoupon.value !== undefined ? viewingCoupon.value : viewingCoupon.discountValue}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COUPON ID</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COUPON TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.couponType || viewingCoupon.discountType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USE LIMIT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.useLimit !== undefined ? (viewingCoupon.useLimit || "Unlimited") : (viewingCoupon.maxUsage || "Unlimited")}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>START DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingCoupon.startDate || viewingCoupon.startDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingCoupon.expiryDate || viewingCoupon.endDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MAX USAGE PER USER</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.maxUsagePerUser || 1}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUTO APPLY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.isAutoApply ? "Yes" : "No"}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXCLUSIVE APPLY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.isExclusive ? "Yes" : "No"}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIORITY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.priority || 0}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIN BOOKING AMOUNT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>INR {viewingCoupon.minBookingAmount || 0}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ENTRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDateTime(viewingCoupon.entryDateUtc || viewingCoupon.createdAtUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED BY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>--</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TITLE</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingCoupon.title || '--'}</span>
              </div>
              {viewingCoupon.conditions && viewingCoupon.conditions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {viewingCoupon.conditions.map((cond, idx) => (
                      <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                        {cond.conditionType} = {cond.value1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESCRIPTION</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingCoupon.description || '--'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMARK</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingCoupon.remark || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

