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
import "./HotelDiscountList.css";
import AdminPagination from "../../../components/AdminPagination";
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
    code: "", // Removed auto-generation based on user request for empty fields
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
  const navigate = useNavigate();
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
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [viewingDiscount, setViewingDiscount] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Conditions temp states
  const [condType, setCondType] = useState("HotelCity");
  const [condVal, setCondVal] = useState("");

  const loadPromotions = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await listHotelPromotions();
      const normalized = (data || []).map((item) => ({
        id: item.id || '',
        code: item.couponCode || item.code || '',
        title: item.title || item.couponCode || item.code || '',
        description: item.remark || item.description || '',
        discountValue: Number(item.value !== undefined ? item.value : item.discountValue) || 0,
        discountType: item.couponType || item.discountType || 'Percentage',
        isAutoApply: item.isAutoApply !== undefined && item.isAutoApply !== null ? item.isAutoApply : false,
        isExclusive: item.isExclusive !== undefined ? item.isExclusive : false,
        priority: Number(item.priority) || 1,
        minBookingAmount: Number(item.minBookingAmount) || 0,
        maxDiscountAmount: item.maxDiscountAmount ? Number(item.maxDiscountAmount) : null,
        startDateUtc: item.startDate || item.startDateUtc || null,
        endDateUtc: item.expiryDate || item.endDateUtc || null,
        maxUsage: item.useLimit !== undefined ? item.useLimit : item.maxUsage || null,
        maxUsagePerUser: Number(item.maxUsagePerUser) || 1,
        isActive: item.status ? item.status === "Active" : (item.isActive !== undefined ? item.isActive : true),
        conditions: item.conditions || []
      }));
      setPromotions(normalized.filter(p => p.isAutoApply));
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
    setValidationErrors({});
    setEditPromoId(null);
    setForm(createDefaultForm());
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setFormError("");
    setValidationErrors({});
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

    const errors = {};
    if (!form.title.trim()) errors.title = true;
    if (!Number.isFinite(amount) || amount <= 0) errors.discountValue = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setFormError("Please fill in all compulsory fields with valid values.");
      return;
    }
    setValidationErrors({});

    const finalCode = code || generatePromoCode();

    const payload = {
      couponCode: finalCode,
      couponType: form.discountType,
      value: amount,
      minBookingAmount: Number(form.minBookingAmount) || 0,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : 0,
      startDate: form.startDateUtc ? new Date(form.startDateUtc).toISOString() : null,
      expiryDate: form.endDateUtc ? new Date(form.endDateUtc).toISOString() : null,
      useLimit: form.maxUsage ? Number(form.maxUsage) : 0,
      maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
      status: form.isActive ? "Active" : "Inactive",
      isFirstTimeUserOnly: false,
      remark: form.description.trim() || null,
      isAutoApply: true,
      promotionType: form.promotionType || "AutoApply",
      isExclusive: form.isExclusive,
      priority: Number(form.priority) || 1,
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
    // Optimistic status update
    setPromotions(prev =>
      prev.map(p => p.id === promo.id ? { ...p, isActive: !promo.isActive } : p)
    );
    try {
      const payload = {
        couponCode: promo.code,
        couponType: promo.discountType,
        value: promo.discountValue,
        minBookingAmount: promo.minBookingAmount,
        maxDiscountAmount: promo.maxDiscountAmount || 0,
        startDate: promo.startDateUtc || null,
        expiryDate: promo.endDateUtc || null,
        useLimit: promo.maxUsage || 0,
        maxUsagePerUser: promo.maxUsagePerUser || 1,
        status: !promo.isActive ? "Active" : "Inactive",
        isFirstTimeUserOnly: false,
        remark: promo.description || null,
        isAutoApply: true,
        isExclusive: promo.isExclusive,
        priority: promo.priority,
        conditions: promo.conditions || []
      };
      await updateHotelPromotion(promo.id, payload);
      loadPromotions();
    } catch (err) {
      // Revert status on error
      setPromotions(prev =>
        prev.map(p => p.id === promo.id ? { ...p, isActive: promo.isActive } : p)
      );
      setLoadError(err.message || "Failed to update discount status.");
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
      {isModalOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsModalOpen(false)}>
          <section className="admin-markup-coupon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)", width: "100%" }}>
              <h1 className="form-title" style={{ color: "#A51C49", fontSize: "1.5rem", margin: 0, fontWeight: "700" }}>
                {editPromoId ? "Edit Auto Discount" : "Add B2C Hotel Discount"}
              </h1>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  type="button" 
                  className="admin-markup-coupon-btn" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ backgroundColor: "#A51C49", borderColor: "#A51C49", color: "#ffffff" }}
                >
                  Close Form
                </button>
              </div>
            </div>

            <div className="admin-markup-coupon-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Reference Code:</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  style={{ padding: "10px", borderRadius: "8px", border: validationErrors.code ? "1px solid red" : "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>
              
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Title:</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: validationErrors.title ? "1px solid red" : "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Discount Type:</span>
                <select value={form.discountType} onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}>
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Flat">Flat (INR)</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Discount Value:</span>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: validationErrors.discountValue ? "1px solid red" : "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Max Discount (Percentage only):</span>
                <input
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Min Booking Amount:</span>
                <input
                  type="number"
                  value={form.minBookingAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, minBookingAmount: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Start Date:</span>
                <input
                  type="date"
                  value={form.startDateUtc}
                  onChange={(e) => setForm(prev => ({ ...prev, startDateUtc: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Expiry Date:</span>
                <input
                  type="date"
                  value={form.endDateUtc}
                  onChange={(e) => setForm(prev => ({ ...prev, endDateUtc: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Priority (higher applies first):</span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>

              {/* Conditions and Toggles strictly on one line */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>Promotion Conditions (Optional):</span>
                
                <div style={{ display: "flex", gap: "16px", flexWrap: "nowrap", alignItems: "center", width: "100%", overflowX: "auto" }}>
                  <select value={condType} onChange={(e) => setCondType(e.target.value)} style={{ padding: "10px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid var(--border)", minWidth: "180px", width: "auto", flex: "0 0 auto", backgroundColor: "transparent" }}>
                    <option value="HotelCity">Hotel City Code</option>
                    <option value="HotelName">Hotel Name Match</option>
                    <option value="MinNights">Min Nights Required</option>
                  </select>
                  <input
                    type="text"
                    value={condVal}
                    onChange={(e) => setCondVal(e.target.value)}
                    style={{ flex: 1, padding: "10px", fontSize: "0.9rem", borderRadius: "8px", border: "1px solid var(--border)", minWidth: "150px", width: "auto", backgroundColor: "transparent" }}
                  />
                  <button type="button" onClick={handleAddCondition} style={{ padding: "10px 20px", fontSize: "0.9rem", backgroundColor: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "0.2s", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                    Add Condition
                  </button>
                  
                  {/* Toggles appended immediately inline */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)" }}>Active</span>
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
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)" }}>Exclusive</span>
                    <button 
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, isExclusive: !prev.isExclusive }))}
                      style={{
                        position: "relative",
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        backgroundColor: form.isExclusive ? "#A51C49" : "#cbd5e1",
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
                        left: form.isExclusive ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                        transition: "left 0.3s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                      }} />
                    </button>
                  </div>
                </div>

                {form.conditions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                    {form.conditions.map((c, idx) => (
                      <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "500" }}>
                        <strong>{c.conditionType}</strong> = {c.value1}
                        <X size={14} style={{ cursor: "pointer", color: "var(--danger)" }} onClick={() => handleRemoveCondition(idx)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Description:</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", width: "100%", minHeight: "80px", fontFamily: "inherit", boxSizing: "border-box", fontSize: "0.95rem", backgroundColor: "transparent" }}
                />
              </label>
            </div>

            {formError && <p className="admin-markup-coupon-error" style={{ margin: "20px 0 0", color: "var(--danger)", fontWeight: "500" }}>{formError}</p>}

            <footer style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 24px", fontSize: "1rem", backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" onClick={handleSave} style={{ padding: "10px 24px", fontSize: "1rem", backgroundColor: "#A51C49", borderColor: "#A51C49" }}>Save Changes</button>
            </footer>
          </section>
        </div>
      )}

      <section className="admin-b2c-page admin-b2c-hotel-page admin-hotel-discount-shell">
          <header className="admin-markup-coupon-header">
            <div className="admin-markup-coupon-title-wrap" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '28px' }}>
                <span style={{ color: '#A51C49' }}>B2C Hotel</span> Discount List
              </h2>
            </div>

            <div className="admin-markup-coupon-actions">
              <button
                type="button"
                className="admin-markup-coupon-btn btn-hover"
                style={{ backgroundColor: '#A51C49', borderColor: '#A51C49', color: '#ffffff' }}
                onClick={() => navigate('/admin/b2c-bus/discount-mapping', { state: { from: 'hotel' } })}
              >
                <SlidersHorizontal size={15} />
                <span>Discount Mapping</span>
              </button>

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
                  ) : loadError ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-coupon-empty" style={{ color: "red", fontWeight: "600" }}>{loadError}</p>
                      </td>
                    </tr>
                  ) : visiblePromotions.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <p className="admin-markup-coupon-empty">No auto discounts found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPromotions.map((p, index) => (
                      <tr key={p.id}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                            className={`status-pill-btn ${p.isActive ? "active" : "inactive"}`}
                            onClick={() => handleStatusToggle(p)}
                          >
                            {p.isActive ? "Active" : "Inactive"}
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
                                    setViewingDiscount(p);
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
                                  <span>Edit Discount</span>
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
                                  <span>Delete Discount</span>
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
                itemName="discounts"
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
              Are you sure you want to delete the discount <strong>{deletePromo.title}</strong>? This action cannot be undone.
            </div>
            <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="admin-markup-coupon-btn clear" onClick={() => setDeletePromo(null)} style={{ backgroundColor: "#f97316", borderColor: "#f97316", color: "#ffffff" }}>Cancel</button>
              <button type="button" className="admin-markup-coupon-btn generate" style={{ backgroundColor: "#ef4444", borderColor: "#ef4444", color: "#ffffff" }} onClick={handleDelete}>Delete</button>
            </footer>
          </section>
        </div>
      )}

      {/* Discount Details View Modal */}
      {viewingDiscount && (
        <div className="discount-modal-overlay" onClick={() => setViewingDiscount(null)}>
          <div className="discount-modal-container view-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>Discount Detail View</h3>
              <button
                type="button"
                onClick={() => setViewingDiscount(null)}
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
                background: viewingDiscount.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                color: viewingDiscount.isActive ? '#10b981' : '#64748b', 
                padding: '4px 12px', 
                borderRadius: '100px', 
                fontWeight: '600', 
                fontSize: '11px' 
              }}>
                {viewingDiscount.isActive ? 'Active' : 'Inactive'}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A51C49', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                {viewingDiscount.code}
              </span>
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewingDiscount.discountType === 'Percentage' ? `${viewingDiscount.discountValue}%` : `INR ${viewingDiscount.discountValue}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISCOUNT ID</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingDiscount.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROMOTION TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingDiscount.promotionType || "AutoApply"}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIORITY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingDiscount.priority || 1}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>START DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingDiscount.startDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingDiscount.endDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIN BOOKING AMOUNT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>INR {viewingDiscount.minBookingAmount || 0}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TITLE</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingDiscount.title || '--'}</span>
              </div>
              {viewingDiscount.conditions && viewingDiscount.conditions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {viewingDiscount.conditions.map((cond, idx) => (
                      <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                        {cond.conditionType} = {cond.value1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESCRIPTION</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingDiscount.description || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

