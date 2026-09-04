/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "./BusCouponList.css";
import { csvCell, formatCouponDate, formatCouponDateTime } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
} from "../../../services/busBookingService";

const DEFAULT_COUPON_SORT_BY = "entryDate";
const DEFAULT_COUPON_SORT_ORDER = "desc";

function getCouponSortValue(coupon, sortBy) {
  if (sortBy === "id") {
    return Number(coupon.id) || 0;
  }

  if (sortBy === "value") {
    return Number(coupon.value) || 0;
  }

  if (sortBy === "useLimit") {
    return Number(coupon.useLimit) || 0;
  }

  if (sortBy === "startDate" || sortBy === "expiryDate" || sortBy === "entryDate") {
    const timestamp = new Date(coupon[sortBy]).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  return String(coupon[sortBy] || "").toLowerCase();
}

function generateCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function toInputDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function createDefaultCouponForm() {
  return {
    value: "",
    cpnType: "",
    startDate: "",
    expiryDate: "",
    couponCode: "",
    useLimit: "",
    maxUsagePerUser: "",
    isAutoApply: false,
    isExclusive: true,
    priority: "",
    minBookingAmount: "",
    status: "Active",
    remark: "",
  };
}


export default function AdminBusCouponListPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponLoadError, setCouponLoadError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState(DEFAULT_COUPON_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_COUPON_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cpnTypeFilter, setCpnTypeFilter] = useState("all");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(createDefaultCouponForm);
  const [generateError, setGenerateError] = useState("");
  const [editCoupon, setEditCoupon] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteCoupon, setDeleteCoupon] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [viewingCoupon, setViewingCoupon] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCoupons = async () => {
      setIsLoadingCoupons(true);
      setCouponLoadError("");

      try {
        const backendCoupons = await listBusCoupons();
        if (isMounted) {
          setCoupons(backendCoupons);
        }
      } catch (error) {
        if (isMounted) {
          setCoupons([]);
          setCouponLoadError(error.message || "Unable to load coupons from backend.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCoupons(false);
        }
      }
    };

    loadCoupons();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const availableStatuses = useMemo(() => {
    const uniqueStatus = new Set(
      coupons.map((coupon) => String(coupon.status || "").toLowerCase()).filter(Boolean)
    );

    return Array.from(uniqueStatus);
  }, [coupons]);

  const availableCouponTypes = useMemo(() => {
    const uniqueTypes = new Set(
      coupons.map((coupon) => String(coupon.cpnType || "").toLowerCase()).filter(Boolean)
    );

    return Array.from(uniqueTypes);
  }, [coupons]);

  const visibleCoupons = useMemo(() => {
    const filteredCoupons = coupons.filter((coupon) => {
      const matchesStatus =
        statusFilter === "all" || String(coupon.status || "").toLowerCase() === statusFilter;
      const matchesType =
        cpnTypeFilter === "all" || String(coupon.cpnType || "").toLowerCase() === cpnTypeFilter;

      return matchesStatus && matchesType;
    });

    return [...filteredCoupons].sort((leftCoupon, rightCoupon) => {
      const leftValue = getCouponSortValue(leftCoupon, sortBy);
      const rightValue = getCouponSortValue(rightCoupon, sortBy);

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
  }, [coupons, cpnTypeFilter, sortBy, sortOrder, statusFilter]);

  const totalItems = visibleCoupons.length;
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleCoupons, currentPage]);

  const hasActiveFilters =
    sortBy !== DEFAULT_COUPON_SORT_BY ||
    sortOrder !== DEFAULT_COUPON_SORT_ORDER ||
    statusFilter !== "all" ||
    cpnTypeFilter !== "all";

  const handleClearFilters = () => {
    setSortBy(DEFAULT_COUPON_SORT_BY);
    setSortOrder(DEFAULT_COUPON_SORT_ORDER);
    setStatusFilter("all");
    setCpnTypeFilter("all");
    setCurrentPage(1);
  };


  const handleExport = () => {
    if (visibleCoupons.length === 0) {
      return;
    }

    const header = [
      "ID",
      "CPN Value",
      "CPN Type",
      "Coupon Code",
      "Start Date",
      "Expiry Date",
      "Use Limit",
      "Max Usage Per User",
      "Auto Apply",
      "Exclusive",
      "Priority",
      "Min Booking Amount",
      "Status",
      "Entry Date",
      "Remark",
    ];

    const csvRows = visibleCoupons.map((coupon) => [
      coupon.id,
      `INR ${coupon.value}`,
      coupon.cpnType,
      coupon.couponCode,
      formatCouponDate(coupon.startDate),
      formatCouponDate(coupon.expiryDate),
      coupon.useLimit,
      coupon.maxUsagePerUser,
      coupon.isAutoApply ? "Yes" : "No",
      coupon.isExclusive ? "Yes" : "No",
      coupon.priority,
      coupon.minBookingAmount,
      coupon.status,
      formatCouponDateTime(coupon.entryDate),
      coupon.remark,
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
    link.download = `admin-coupon-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const openGenerateModal = () => {
    setGenerateError("");
    setGenerateForm(createDefaultCouponForm());
    setIsGenerateModalOpen(true);
  };

  const handleGenerateCoupon = async () => {
    const amount = Number(generateForm.value);
    const useLimit = Number(generateForm.useLimit);
    const couponCode = String(generateForm.couponCode || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const startTimestamp = new Date(generateForm.startDate).getTime();
    const expiryTimestamp = new Date(generateForm.expiryDate).getTime();

    if (!String(generateForm.cpnType || "").trim()) {
      setGenerateError("Select coupon type.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setGenerateError("Enter a valid coupon value.");
      return;
    }

    if (!Number.isFinite(useLimit) || useLimit <= 0) {
      setGenerateError("Use limit must be greater than zero.");
      return;
    }

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(expiryTimestamp)) {
      setGenerateError("Choose valid start and expiry dates.");
      return;
    }

    if (startTimestamp > expiryTimestamp) {
      setGenerateError("Expiry date should be the same or after start date.");
      return;
    }

    if (!couponCode) {
      setGenerateError("Coupon code is required.");
      return;
    }

    const newCoupon = {
      value: amount,
      couponType: generateForm.cpnType,
      cpnType: generateForm.cpnType,
      couponCode,
      startDate: generateForm.startDate,
      expiryDate: generateForm.expiryDate,
      useLimit,
      maxUsagePerUser: Number(generateForm.maxUsagePerUser) || 1,
      isAutoApply: Boolean(generateForm.isAutoApply),
      isExclusive: Boolean(generateForm.isExclusive),
      priority: Number(generateForm.priority) || 0,
      minBookingAmount: Number(generateForm.minBookingAmount) || 0,
      status: generateForm.status,
      remark: generateForm.remark.trim(),
    };

    try {
      const savedCoupon = await createBusCoupon(newCoupon);
      setCoupons((previous) => [savedCoupon, ...previous]);
      setIsGenerateModalOpen(false);
      setGenerateError("");
    } catch (error) {
      setGenerateError(error.message || "Unable to save coupon to backend.");
    }
  };

  const openEditModal = (coupon) => {
    setEditError("");
    setEditCoupon({
      ...coupon,
      value: String(coupon.value),
      useLimit: String(coupon.useLimit),
      maxUsagePerUser: String(coupon.maxUsagePerUser || 1),
      isAutoApply: Boolean(coupon.isAutoApply),
      isExclusive: Boolean(coupon.isExclusive),
      priority: String(coupon.priority || 0),
      minBookingAmount: String(coupon.minBookingAmount || 0),
      startDate: toInputDate(coupon.startDate),
      expiryDate: toInputDate(coupon.expiryDate),
      remark: coupon.remark || "",
    });
  };

  const handleEditSave = async () => {
    if (!editCoupon) {
      return;
    }

    const amount = Number(editCoupon.value);
    const useLimit = Number(editCoupon.useLimit);
    const startTimestamp = new Date(editCoupon.startDate).getTime();
    const expiryTimestamp = new Date(editCoupon.expiryDate).getTime();

    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError("Enter a valid coupon value.");
      return;
    }

    if (!Number.isFinite(useLimit) || useLimit <= 0) {
      setEditError("Use limit must be greater than zero.");
      return;
    }

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(expiryTimestamp)) {
      setEditError("Choose valid start and expiry dates.");
      return;
    }

    if (startTimestamp > expiryTimestamp) {
      setEditError("Expiry date should be the same or after start date.");
      return;
    }

    const nextCoupon = {
      ...editCoupon,
      value: amount,
      couponType: editCoupon.cpnType,
      cpnType: editCoupon.cpnType,
      startDate: editCoupon.startDate,
      expiryDate: editCoupon.expiryDate,
      useLimit,
      maxUsagePerUser: Number(editCoupon.maxUsagePerUser) || 1,
      isAutoApply: Boolean(editCoupon.isAutoApply),
      isExclusive: Boolean(editCoupon.isExclusive),
      priority: Number(editCoupon.priority) || 0,
      minBookingAmount: Number(editCoupon.minBookingAmount) || 0,
      status: editCoupon.status,
      remark: editCoupon.remark.trim(),
    };

    try {
      const savedCoupon = await updateBusCoupon(editCoupon.id, nextCoupon);
      setCoupons((previous) =>
        previous.map((coupon) => (coupon.id === editCoupon.id ? savedCoupon : coupon))
      );
      setEditCoupon(null);
      setEditError("");
    } catch (error) {
      setEditError(error.message || "Unable to update coupon in backend.");
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteCoupon) {
      return;
    }

    try {
      await deleteBusCoupon(deleteCoupon.id);
      setCoupons((previous) => previous.filter((coupon) => coupon.id !== deleteCoupon.id));
      setDeleteCoupon(null);
    } catch (error) {
      setCouponLoadError(error.message || "Unable to delete coupon from backend.");
    }
  };

  const handleCouponStatusToggle = async (couponId) => {
    const currentCoupon = coupons.find((coupon) => coupon.id === couponId);
    if (!currentCoupon) {
      return;
    }

    const nextCoupon = {
      ...currentCoupon,
      status: currentCoupon.status === "active" ? "inactive" : "active",
    };

    try {
      const savedCoupon = await updateBusCoupon(couponId, nextCoupon);
      setCoupons((previous) =>
        previous.map((coupon) => (coupon.id === couponId ? savedCoupon : coupon))
      );
    } catch (error) {
      setCouponLoadError(error.message || "Unable to update coupon status.");
    }
  };

  if (couponLoadError) {
    return (
      <section className="admin-b2c-page admin-markup-coupon-shell">
        <header className="admin-markup-coupon-header">
          <div className="admin-markup-coupon-title-wrap">
            <h1>
              <span style={{ color: '#A51C49' }}>B2C Bus </span>
              <span style={{ color: '#000000' }}>Coupon List</span>
            </h1>
          </div>
        </header>
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
            onClick={() => setRefreshTrigger(prev => prev + 1)}
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
      </section>
    );
  }

  return (
    <section className="admin-b2c-page admin-markup-coupon-container">
      <header className="admin-markup-coupon-header">
            <div className="admin-markup-coupon-title-wrap">
              <h1>
                <span style={{ color: '#A51C49' }}>B2C Bus </span>
                <span style={{ color: '#000000' }}>Coupon List</span>
              </h1>
            </div>

            <div className="admin-markup-coupon-actions">
              <button
                type="button"
                className={`admin-markup-coupon-btn filter ${isFilterPanelOpen ? "active" : ""}`}
                onClick={() => setIsFilterPanelOpen((previous) => !previous)}
                aria-expanded={isFilterPanelOpen}
                aria-controls="admin-markup-coupon-filter"
              >
                <SlidersHorizontal size={15} />
                <span>Filter</span>
              </button>

              <button
                type="button"
                className="admin-markup-coupon-btn clear"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                <X size={15} />
                <span>Clear Filter</span>
              </button>

              <button
                type="button"
                className="admin-markup-coupon-btn used-coupons-nav-btn"
                onClick={() => navigate("/admin/b2c-bus/used-coupon-list")}
              >
                <span>Used Coupons List</span>
              </button>

              <button
                type="button"
                className="admin-markup-coupon-btn generate"
                onClick={openGenerateModal}
              >
                <Plus size={15} />
                <span>Generate Coupon</span>
              </button>

              <button
                type="button"
                className="admin-markup-coupon-btn export"
                onClick={handleExport}
                disabled={visibleCoupons.length === 0}
              >
                <Download size={15} />
                <span>Export</span>
              </button>
            </div>
          </header>

          {isFilterPanelOpen && (
            <section className="admin-markup-coupon-filter" id="admin-markup-coupon-filter">
              <div className="admin-markup-coupon-filter-grid">
                <label>
                  <span>Sort By</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="entryDate">Entry Date</option>
                    <option value="id">ID</option>
                    <option value="value">CPN Value</option>
                    <option value="startDate">Start Date</option>
                    <option value="expiryDate">Expiry Date</option>
                    <option value="useLimit">Use Limit</option>
                    <option value="couponCode">Coupon Code</option>
                    <option value="status">Status</option>
                  </select>
                </label>

                <label>
                  <span>Order</span>
                  <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All</option>
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>CPN Type</span>
                  <select
                    value={cpnTypeFilter}
                    onChange={(event) => setCpnTypeFilter(event.target.value)}
                  >
                    <option value="all">All</option>
                    {availableCouponTypes.map((couponType) => (
                      <option key={couponType} value={couponType}>
                        {couponType}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}

          {couponLoadError && <p className="admin-markup-coupon-error">{couponLoadError}</p>}

          <section className="admin-markup-coupon-table-wrap">
            <div className="admin-markup-coupon-table-scroll">
              <table className="admin-markup-coupon-table">
                <colgroup>
                  <col className="col-id" />
                  <col className="col-value" />
                  <col className="col-type" />
                  <col className="col-code" />
                  <col className="col-start" />
                  <col className="col-expiry" />
                  <col className="col-limit" />
                  <col className="col-status" />
                  <col className="col-entry" />
                  <col className="col-remark" />
                  <col className="col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>CPN Value</th>
                    <th>CPN Type</th>
                    <th>Coupon Code</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Use Limit</th>
                    <th className="status-col">Status</th>
                    <th>Entry Date</th>
                    <th>Remark</th>
                    <th className="action-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCoupons ? (
                    <tr>
                      <td colSpan={11}>
                        <p className="admin-markup-coupon-empty">Loading coupons from backend...</p>
                      </td>
                    </tr>
                  ) : visibleCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={11}>
                        <p className="admin-markup-coupon-empty">No coupons found for current filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCoupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td>{coupon.id}</td>
                        <td>{`INR ${coupon.value}`}</td>
                        <td>{coupon.cpnType}</td>
                        <td>
                          <span className="admin-markup-coupon-code">{coupon.couponCode}</span>
                        </td>
                        <td>{formatCouponDate(coupon.startDate)}</td>
                        <td>{formatCouponDate(coupon.expiryDate)}</td>
                        <td>{coupon.useLimit}</td>
                        <td className="status-col">
                          <button
                            type="button"
                            className={`admin-markup-coupon-status ${coupon.status}`}
                            onClick={() => handleCouponStatusToggle(coupon.id)}
                            aria-label={`Set coupon ${coupon.couponCode} to ${coupon.status === "active" ? "inactive" : "active"
                              }`}
                          >
                            <span>{coupon.status === "active" ? "Active" : "Inactive"}</span>
                          </button>
                        </td>
                        <td>{formatCouponDateTime(coupon.entryDate)}</td>
                        <td className="admin-markup-coupon-remark">
                          <span>{coupon.remark || "--"}</span>
                        </td>
                        <td className="action-col">
                          <div className="actions-dropdown-container">
                            <button
                              type="button"
                              className={`actions-trigger-btn ${activeDropdownId === coupon.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === coupon.id ? null : coupon.id);
                              }}
                            >
                              <span>Actions</span>
                              <ChevronDown className="chevron-icon" size={12} />
                            </button>
                            {activeDropdownId === coupon.id && (
                              <div className="actions-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingCoupon(coupon);
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
                                    openEditModal(coupon);
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
                                    setDeleteCoupon(coupon);
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

            {visibleCoupons.length > 0 && (
              <AdminPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemName="bus coupons"
              />
            )}
          </section>

      {isGenerateModalOpen && (
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setIsGenerateModalOpen(false)}
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
            zIndex: 10000
          }}
        >
          <section 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "800px", 
              width: "90%", 
              maxHeight: "90vh", 
              overflowY: "auto", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "24px" 
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 style={{ color: "#A51C49", fontSize: "1.6rem", margin: 0, fontWeight: "700" }}>
                Generate B2C Bus Coupon
              </h1>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                style={{ 
                  backgroundColor: "#A51C49", 
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Close Form
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleGenerateCoupon(); }}>
              {generateError && (
                <p style={{ color: "red", margin: "15px 0", fontWeight: "600", fontSize: "0.9rem" }}>
                  {generateError}
                </p>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <label className="modal-field">
                  <span>Coupon Code *</span>
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={generateForm.couponCode}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({
                        ...previous,
                        couponCode: event.target.value.toUpperCase().replace(/\s+/g, ""),
                      }))
                    }
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Coupon Type *</span>
                  <select
                    value={generateForm.cpnType}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, cpnType: event.target.value }))
                    }
                    required
                  >
                    <option value="">---Select Amount Type---</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Value *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter value"
                    value={generateForm.value}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, value: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Coupon Use Limit *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter use limit"
                    value={generateForm.useLimit}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, useLimit: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Max Usage Per User</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 1"
                    value={generateForm.maxUsagePerUser}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, maxUsagePerUser: event.target.value }))
                    }
                  />
                </label>
                <label className="modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 0"
                    value={generateForm.priority}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, priority: event.target.value }))
                    }
                  />
                </label>
                <label className="modal-field">
                  <span>Auto Apply</span>
                  <select
                    value={String(generateForm.isAutoApply)}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({
                        ...previous,
                        isAutoApply: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Exclusive</span>
                  <select
                    value={String(generateForm.isExclusive)}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({
                        ...previous,
                        isExclusive: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Status</span>
                  <select
                    value={generateForm.status}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, status: event.target.value }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Start Date *</span>
                  <input
                    type="date"
                    value={generateForm.startDate}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, startDate: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Expiry Date *</span>
                  <input
                    type="date"
                    value={generateForm.expiryDate}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({
                        ...previous,
                        expiryDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Min Booking Amount (INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 1000"
                    value={generateForm.minBookingAmount}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, minBookingAmount: event.target.value }))
                    }
                  />
                </label>
                <label className="modal-field wide" style={{ gridColumn: "span 3" }}>
                  <span>Coupon Remark</span>
                  <textarea
                    placeholder="Enter remark"
                    value={generateForm.remark}
                    onChange={(event) =>
                      setGenerateForm((previous) => ({ ...previous, remark: event.target.value }))
                    }
                    rows={3}
                    style={{ borderRadius: "10px", padding: "8px", width: "100%", height: "75px", fontFamily: "inherit" }}
                  />
                </label>
              </div>

              <footer style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => setIsGenerateModalOpen(false)} 
                  style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: "#A51C49", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" }}
                >
                  Generate
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {editCoupon && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setEditCoupon(null)}
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
          <section 
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
              <h1 style={{ color: "#A51C49", fontSize: "1.3rem", margin: 0, fontWeight: "700" }}>
                Edit B2C Bus Coupon
              </h1>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}>
              {editError && (
                <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem", textAlign: "left" }}>
                  {editError}
                </p>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>ID</span>
                  <input type="text" value={editCoupon.id} disabled style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none", backgroundColor: "#f1f5f9" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Coupon Code</span>
                  <input type="text" value={editCoupon.couponCode} disabled style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none", backgroundColor: "#f1f5f9" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Coupon Type *</span>
                  <select
                    value={editCoupon.cpnType}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, cpnType: event.target.value }))
                    }
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Value *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editCoupon.value}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, value: event.target.value }))
                    }
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Coupon Use Limit *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editCoupon.useLimit}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, useLimit: event.target.value }))
                    }
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Max Usage Per User</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editCoupon.maxUsagePerUser}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, maxUsagePerUser: event.target.value }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Auto Apply</span>
                  <select
                    value={String(editCoupon.isAutoApply)}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({
                        ...previous,
                        isAutoApply: event.target.value === "true",
                      }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Exclusive</span>
                  <select
                    value={String(editCoupon.isExclusive)}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({
                        ...previous,
                        isExclusive: event.target.value === "true",
                      }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Status</span>
                  <select
                    value={editCoupon.status}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, status: event.target.value }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Start Date *</span>
                  <input
                    type="date"
                    value={editCoupon.startDate}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, startDate: event.target.value }))
                    }
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Expiry Date *</span>
                  <input
                    type="date"
                    value={editCoupon.expiryDate}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, expiryDate: event.target.value }))
                    }
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Min Booking Amount (INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editCoupon.minBookingAmount}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, minBookingAmount: event.target.value }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Priority</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editCoupon.priority}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, priority: event.target.value }))
                    }
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b", gridColumn: "span 2" }}>
                  <span>Coupon Remark</span>
                  <textarea
                    value={editCoupon.remark}
                    onChange={(event) =>
                      setEditCoupon((previous) => ({ ...previous, remark: event.target.value }))
                    }
                    rows={2}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "44px", minHeight: "44px", boxSizing: "border-box", width: "100%", outline: "none", fontFamily: "inherit" }}
                  />
                </label>
              </div>

              <footer style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button 
                  type="button" 
                  onClick={() => setEditCoupon(null)} 
                  style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: "#A51C49", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                >
                  Save Changes
                </button>
              </footer>
            </form>
          </section>
        </div>,
        document.body
      )}

      {viewingCoupon && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container view-modal" style={{ maxWidth: '680px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>Coupon Detail View</h3>
              <button
                type="button"
                onClick={() => setViewingCoupon(null)}
                style={{
                  border: '1.5px solid #2563eb',
                  background: '#ffffff',
                  color: '#2563eb',
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
              <span style={{ background: viewingCoupon.status === 'active' || viewingCoupon.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: viewingCoupon.status === 'active' || viewingCoupon.status === 'Active' ? '#10b981' : '#64748b', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewingCoupon.status === 'active' || viewingCoupon.status === 'Active' ? 'Active' : 'Inactive'}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A41B48', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                {viewingCoupon.couponCode}
              </span>
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewingCoupon.cpnType === 'Percentage' ? `${viewingCoupon.value}%` : `INR ${viewingCoupon.value}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COUPON ID</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COUPON TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.cpnType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USE LIMIT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.useLimit}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>START DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingCoupon.startDate)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDate(viewingCoupon.expiryDate)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MAX USAGE PER USER</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.maxUsagePerUser}</span>
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
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingCoupon.priority}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIN BOOKING AMOUNT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>INR {viewingCoupon.minBookingAmount}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ENTRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatCouponDateTime(viewingCoupon.entryDate)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED BY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>--</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMARK</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingCoupon.remark || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteCoupon && (
        <div className="discount-modal-overlay" onClick={() => setDeleteCoupon(null)}>
          <div className="discount-modal-container delete-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>Delete Coupon</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setDeleteCoupon(null)}
                aria-label="Close delete dialog"
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '8px 0 20px', textAlign: 'left', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete coupon <strong>{deleteCoupon.couponCode}</strong>?
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn" onClick={() => setDeleteCoupon(null)} style={{ background: '#f97316', color: '#ffffff' }}>
                Cancel
              </button>
              <button type="button" className="modal-btn delete-confirm-btn" onClick={handleDeleteCoupon} style={{ background: '#ef4444', color: '#ffffff' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



