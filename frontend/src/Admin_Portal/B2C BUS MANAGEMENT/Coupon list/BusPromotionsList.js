/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  ChevronDown,
  Eye,
  Settings
} from "lucide-react";
import "./BusPromotionsList.css";
import { csvCell, formatCouponDateTime } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
  getBusCouponConditions,
  createBusCouponCondition,
  deleteBusCouponCondition,
} from "../../../services/busPromotionsService";

const DEFAULT_COUPON_SORT_BY = "entryDate";
const DEFAULT_COUPON_SORT_ORDER = "desc";

const CONDITION_TYPES = [
  { value: "OperatorName", label: "Operator Name" },
  { value: "BusType", label: "Bus Type" },
  { value: "SeatType", label: "Seat Type (Seater/Sleeper)" },
  { value: "SourceCity", label: "Source City" },
  { value: "DestinationCity", label: "Destination City" },
  { value: "DayOfWeek", label: "Day Of Week" },
  { value: "TravelDate", label: "Travel Date" },
  { value: "MinimumFare", label: "Minimum Fare" },
];

const CONDITION_OPERATORS = [
  "Equals",
  "NotEquals",
  "Contains",
  ">",
  ">=",
  "<",
  "<=",
  "Between",
];

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

function toInputDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function createEmptyCouponForm(category = "Offer") {
  return {
    promotionCategory: category,
    title: "",
    description: "",
    value: "",
    cpnType: "Fixed",
    maxDiscountAmount: "",
    startDate: "",
    expiryDate: "",
    couponCode: "",
    useLimit: "",
    maxUsagePerUser: "",
    isAutoApply: false,
    isExclusive: false,
    isFirstTimeUserOnly: false,
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

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState(DEFAULT_COUPON_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_COUPON_SORT_ORDER);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cpnTypeFilter, setCpnTypeFilter] = useState("all");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(() => createEmptyCouponForm("Offer"));
  const [generateError, setGenerateError] = useState("");
  const [editCoupon, setEditCoupon] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteCoupon, setDeleteCoupon] = useState(null);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingCoupon, setViewingCoupon] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionDropdownId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // Conditions Modal state
  const [conditionsCoupon, setConditionsCoupon] = useState(null);
  const [conditionsList, setConditionsList] = useState([]);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);
  const [conditionError, setConditionError] = useState("");
  const [newConditionForm, setNewConditionForm] = useState({
    conditionType: "OperatorName",
    conditionOperator: "Equals",
    value1: "",
    value2: "",
  });

  const itemsPerPage = 10;

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
  }, []);

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
      const matchesCategory =
        categoryFilter === "all" ||
        String(coupon.promotionCategory || "Offer").toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" || String(coupon.status || "").toLowerCase() === statusFilter;
      const matchesType =
        cpnTypeFilter === "all" || String(coupon.cpnType || "").toLowerCase() === cpnTypeFilter;

      return matchesCategory && matchesStatus && matchesType;
    });

    return [...filteredCoupons].sort((leftCoupon, rightCoupon) => {
      const leftVal = getCouponSortValue(leftCoupon, sortBy);
      const rightVal = getCouponSortValue(rightCoupon, sortBy);

      if (leftVal < rightVal) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (leftVal > rightVal) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [coupons, categoryFilter, statusFilter, cpnTypeFilter, sortBy, sortOrder]);

  const totalItems = visibleCoupons.length;

  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleCoupons, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, cpnTypeFilter, sortBy, sortOrder]);

  const openAddOfferModal = () => {
    setGenerateError("");
    setGenerateForm(createEmptyCouponForm("Offer"));
    setIsGenerateModalOpen(true);
  };

  const openAddCouponModal = () => {
    setGenerateError("");
    setGenerateForm(createEmptyCouponForm("Coupon"));
    setIsGenerateModalOpen(true);
  };

  const handleGenerateCoupon = async () => {
    setGenerateError("");

    const amount = Number(generateForm.value);
    const useLimit = Number(generateForm.useLimit);
    const couponCode = generateForm.couponCode.trim().toUpperCase();
    const startTimestamp = new Date(generateForm.startDate).getTime();
    const expiryTimestamp = new Date(generateForm.expiryDate).getTime();

    if (!couponCode) {
      setGenerateError("Coupon Code is required.");
      return;
    }

    if (!generateForm.title.trim()) {
      setGenerateError("Title is required.");
      return;
    }

    if (!generateForm.cpnType) {
      setGenerateError("Please select an amount type (Fixed or Percentage).");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setGenerateError("Enter a valid coupon value greater than zero.");
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

    const newCoupon = {
      promotionCategory: generateForm.promotionCategory || "Offer",
      title: generateForm.title.trim(),
      description: generateForm.description.trim(),
      value: amount,
      couponType: generateForm.cpnType,
      cpnType: generateForm.cpnType,
      couponCode,
      maxDiscountAmount: generateForm.maxDiscountAmount !== "" ? Number(generateForm.maxDiscountAmount) : null,
      startDate: generateForm.startDate,
      expiryDate: generateForm.expiryDate,
      useLimit,
      maxUsagePerUser: generateForm.maxUsagePerUser !== "" ? Number(generateForm.maxUsagePerUser) : 1,
      isAutoApply: Boolean(generateForm.isAutoApply),
      isExclusive: Boolean(generateForm.isExclusive),
      isFirstTimeUserOnly: Boolean(generateForm.isFirstTimeUserOnly),
      priority: generateForm.priority !== "" ? Number(generateForm.priority) : 0,
      minBookingAmount: generateForm.minBookingAmount !== "" ? Number(generateForm.minBookingAmount) : 0,
      status: generateForm.status || "Active",
      remark: generateForm.remark ? generateForm.remark.trim() : null,
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
      promotionCategory: coupon.promotionCategory || "Offer",
      title: coupon.title || "",
      description: coupon.description || "",
      value: String(coupon.value ?? ""),
      maxDiscountAmount: coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined ? String(coupon.maxDiscountAmount) : "",
      useLimit: String(coupon.useLimit ?? ""),
      maxUsagePerUser: String(coupon.maxUsagePerUser ?? 1),
      isAutoApply: Boolean(coupon.isAutoApply),
      isExclusive: Boolean(coupon.isExclusive),
      isFirstTimeUserOnly: Boolean(coupon.isFirstTimeUserOnly),
      priority: String(coupon.priority ?? 0),
      minBookingAmount: String(coupon.minBookingAmount ?? 0),
      startDate: toInputDate(coupon.startDate),
      expiryDate: toInputDate(coupon.expiryDate),
      status: coupon.status === "active" ? "Active" : coupon.status === "inactive" ? "Inactive" : (coupon.status || "Active"),
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
      promotionCategory: editCoupon.promotionCategory || "Offer",
      title: editCoupon.title?.trim() || "",
      description: editCoupon.description?.trim() || "",
      value: amount,
      couponType: editCoupon.cpnType,
      cpnType: editCoupon.cpnType,
      maxDiscountAmount: editCoupon.maxDiscountAmount !== "" && editCoupon.maxDiscountAmount !== null ? Number(editCoupon.maxDiscountAmount) : null,
      startDate: editCoupon.startDate,
      expiryDate: editCoupon.expiryDate,
      useLimit,
      maxUsagePerUser: Number(editCoupon.maxUsagePerUser) || 1,
      isAutoApply: Boolean(editCoupon.isAutoApply),
      isExclusive: Boolean(editCoupon.isExclusive),
      isFirstTimeUserOnly: Boolean(editCoupon.isFirstTimeUserOnly),
      priority: Number(editCoupon.priority) || 0,
      minBookingAmount: Number(editCoupon.minBookingAmount) || 0,
      status: editCoupon.status,
      remark: editCoupon.remark ? editCoupon.remark.trim() : null,
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

  // Conditions Handlers
  const openConditionsModal = async (coupon) => {
    setConditionsCoupon(coupon);
    setConditionError("");
    setIsLoadingConditions(true);
    setNewConditionForm({
      conditionType: "OperatorName",
      conditionOperator: "Equals",
      value1: "",
      value2: "",
    });

    try {
      const conditions = await getBusCouponConditions(coupon.id);
      setConditionsList(Array.isArray(conditions) ? conditions : []);
    } catch (error) {
      setConditionsList(coupon.conditions || []);
      setConditionError(error.message || "Unable to fetch conditions.");
    } finally {
      setIsLoadingConditions(false);
    }
  };

  const handleAddCondition = async (e) => {
    e.preventDefault();
    if (!conditionsCoupon) return;
    setConditionError("");

    if (!newConditionForm.value1.trim()) {
      setConditionError("Primary Value (Value 1) is required. Use 'ALL' to reset restrictions.");
      return;
    }

    try {
      const payload = {
        conditionType: newConditionForm.conditionType,
        conditionOperator: newConditionForm.conditionOperator,
        value1: newConditionForm.value1.trim(),
        value2: newConditionForm.value2.trim() || null,
      };

      const result = await createBusCouponCondition(conditionsCoupon.id, payload);

      if (newConditionForm.value1.trim().toUpperCase() === "ALL") {
        setConditionsList((prev) =>
          prev.filter((item) => item.conditionType !== newConditionForm.conditionType)
        );
      } else {
        const refreshed = await getBusCouponConditions(conditionsCoupon.id);
        setConditionsList(Array.isArray(refreshed) ? refreshed : [result, ...conditionsList]);
      }

      setNewConditionForm({
        conditionType: "OperatorName",
        conditionOperator: "Equals",
        value1: "",
        value2: "",
      });
    } catch (error) {
      setConditionError(error.message || "Failed to save condition rule.");
    }
  };

  const handleDeleteCondition = async (conditionId) => {
    try {
      await deleteBusCouponCondition(conditionId);
      setConditionsList((prev) => prev.filter((item) => item.id !== conditionId));
    } catch (error) {
      setConditionError(error.message || "Unable to delete condition.");
    }
  };

  const handleExport = () => {
    if (visibleCoupons.length === 0) return;
    const headers = [
      "ID",
      "Category",
      "Code",
      "Title",
      "Type",
      "Value",
      "Max Discount",
      "Start Date",
      "Expiry Date",
      "Use Limit",
      "Used Count",
      "Status",
      "Auto Apply",
      "Exclusive",
      "First Time Only",
      "Min Fare",
      "Priority",
      "Remark"
    ];

    const rows = visibleCoupons.map((c) => [
      csvCell(c.id),
      csvCell(c.promotionCategory || "Offer"),
      csvCell(c.couponCode),
      csvCell(c.title || ""),
      csvCell(c.cpnType),
      csvCell(c.value),
      csvCell(c.maxDiscountAmount ?? ""),
      csvCell(c.startDate),
      csvCell(c.expiryDate),
      csvCell(c.useLimit),
      csvCell(c.usedCount),
      csvCell(c.status),
      csvCell(c.isAutoApply ? "Yes" : "No"),
      csvCell(c.isExclusive ? "Yes" : "No"),
      csvCell(c.isFirstTimeUserOnly ? "Yes" : "No"),
      csvCell(c.minBookingAmount),
      csvCell(c.priority),
      csvCell(c.remark ?? ""),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bus_promotions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="admin-b2c-page admin-markup-coupon-container">
      <header className="admin-markup-coupon-header">
        <div className="admin-markup-coupon-title-wrap">
          <h1>
            <span style={{ color: '#A51C49' }}>B2C </span>
            <span style={{ color: '#000000' }}>Promotions List</span>
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

          <div
            className="category-view-btn-group"
            style={{
              display: "inline-flex",
              gap: "4px",
              background: "#f1f5f9",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              className={`cat-view-btn ${categoryFilter === "all" ? "active" : ""}`}
              onClick={() => setCategoryFilter("all")}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                background: categoryFilter === "all" ? "#A51C49" : "transparent",
                color: categoryFilter === "all" ? "#ffffff" : "#475569",
                transition: "all 0.2s"
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`cat-view-btn ${categoryFilter === "Coupon" ? "active" : ""}`}
              onClick={() => setCategoryFilter("Coupon")}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                background: categoryFilter === "Coupon" ? "#A51C49" : "transparent",
                color: categoryFilter === "Coupon" ? "#ffffff" : "#475569",
                transition: "all 0.2s"
              }}
            >
              Coupon List
            </button>
            <button
              type="button"
              className={`cat-view-btn ${categoryFilter === "Offer" ? "active" : ""}`}
              onClick={() => setCategoryFilter("Offer")}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                background: categoryFilter === "Offer" ? "#A51C49" : "transparent",
                color: categoryFilter === "Offer" ? "#ffffff" : "#475569",
                transition: "all 0.2s"
              }}
            >
              Offer List
            </button>
          </div>

          <button
            type="button"
            className="admin-markup-coupon-btn generate"
            onClick={openAddCouponModal}
            style={{ background: "#A51C49", borderColor: "#A51C49" }}
          >
            <Plus size={15} />
            <span>Add Coupon</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn generate"
            onClick={openAddOfferModal}
          >
            <Plus size={15} />
            <span>Add Offer</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn export"
            onClick={handleExport}
            disabled={visibleCoupons.length === 0}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {isFilterPanelOpen && (
        <section className="admin-markup-coupon-filter" id="admin-markup-coupon-filter">
          <div className="admin-markup-coupon-filter-grid">
            <label>
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Coupon">Coupon</option>
                <option value="Offer">Offer</option>
              </select>
            </label>

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

      <section className="admin-markup-coupon-table-wrap">
        <div className="admin-markup-coupon-table-scroll">
          <table className="admin-markup-coupon-table">
            <colgroup>
              <col className="col-id" style={{ width: "35px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "115px" }} />
              <col style={{ width: "115px" }} />
              <col className="col-value" style={{ width: "70px" }} />
              <col className="col-type" style={{ width: "65px" }} />
              <col style={{ width: "170px" }} />
              <col className="col-limit" style={{ width: "65px" }} />
              <col className="col-status" style={{ width: "75px" }} />
              <col className="col-entry" style={{ width: "135px" }} />
              <col className="col-action" style={{ width: "115px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Code</th>
                <th>Title</th>
                <th>Value</th>
                <th>Type</th>
                <th>Start / Expiry Date</th>
                <th>Use Limit</th>
                <th className="status-col">Status</th>
                <th>Entry Date</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingCoupons ? (
                <tr>
                  <td colSpan={11}>
                    <p className="admin-markup-coupon-empty">Loading promotions from backend...</p>
                  </td>
                </tr>
              ) : couponLoadError ? (
                <tr>
                  <td colSpan={11}>
                    <p className="admin-markup-coupon-empty" style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "30px 20px" }}>Data not found</p>
                  </td>
                </tr>
              ) : visibleCoupons.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <p className="admin-markup-coupon-empty" style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "30px 20px" }}>No promotions found</p>
                  </td>
                </tr>
              ) : (
                paginatedCoupons.map((coupon, index) => (
                  <tr key={coupon.id} className={activeActionDropdownId === coupon.id ? "active-dropdown-row" : ""}>
                    <td>{coupon.id}</td>
                    <td>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "500",
                        background: coupon.promotionCategory === "Offer" ? "#eff6ff" : "#fdf2f8",
                        color: coupon.promotionCategory === "Offer" ? "#2563eb" : "#A51C49",
                        border: coupon.promotionCategory === "Offer" ? "1px solid #bfdbfe" : "1px solid #fbcfe8"
                      }}>
                        {coupon.promotionCategory || "Offer"}
                      </span>
                    </td>
                    <td>
                      <span className="admin-markup-coupon-code-highlight" style={{
                        display: "inline-flex",
                        padding: "4px 10px",
                        borderRadius: "14px",
                        background: "#fce7f3",
                        color: "#A51C49",
                        border: "1px solid #fbcfe8",
                        fontWeight: "700",
                        fontSize: "11px",
                        letterSpacing: "0.5px"
                      }}>
                        {coupon.couponCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: "#334155", fontWeight: "500" }}>
                        {coupon.title || "--"}
                      </span>
                    </td>
                    <td>
                      {coupon.cpnType === "Percentage"
                        ? `${coupon.value}%${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ""}`
                        : `₹${coupon.value}`}
                    </td>
                    <td>{coupon.cpnType}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "10.5px", textAlign: "center", padding: "2px 0", fontWeight: "400" }}>
                        <span style={{ color: "#047857", fontWeight: "500" }}>
                          Start: {formatCouponDateTime(coupon.startDate)}
                        </span>
                        <span style={{ color: "#b91c1c", fontWeight: "500" }}>
                          Expiry: {formatCouponDateTime(coupon.expiryDate)}
                        </span>
                      </div>
                    </td>
                    <td>{`${coupon.usedCount || 0} / ${coupon.useLimit || "∞"}`}</td>
                    <td className="status-col">
                      <button
                        type="button"
                        className={`admin-markup-coupon-status ${coupon.status}`}
                        onClick={() => handleCouponStatusToggle(coupon.id)}
                        aria-label={`Set coupon ${coupon.couponCode} to ${
                          coupon.status === "active" ? "inactive" : "active"
                        }`}
                      >
                        <span>{coupon.status === "active" ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td>{formatCouponDateTime(coupon.entryDate)}</td>
                    <td className="action-col">
                      <div className="actions-dropdown-container">
                        <button
                          type="button"
                          className={`actions-trigger-btn ${activeActionDropdownId === coupon.id ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionDropdownId((prev) => (prev === coupon.id ? null : coupon.id));
                          }}
                        >
                          <span>Actions</span>
                          <ChevronDown className="chevron-icon" size={12} />
                        </button>

                        {activeActionDropdownId === coupon.id && (
                          <div 
                            className={`actions-dropdown-menu ${index >= Math.max(1, paginatedCoupons.length - 2) ? "drop-up" : ""}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="dropdown-item view"
                              onClick={() => {
                                setViewingCoupon(coupon);
                                setActiveActionDropdownId(null);
                              }}
                            >
                              <span>View Details</span>
                              <Eye size={14} className="item-icon" />
                            </button>

                            <button
                              type="button"
                              className="dropdown-item conditions"
                              onClick={() => {
                                openConditionsModal(coupon);
                                setActiveActionDropdownId(null);
                              }}
                            >
                              <span>Manage Conditions</span>
                              <Settings size={14} className="item-icon" />
                            </button>

                            <button
                              type="button"
                              className="dropdown-item edit"
                              onClick={() => {
                                openEditModal(coupon);
                                setActiveActionDropdownId(null);
                              }}
                            >
                              <span>Edit Promotion</span>
                              <Pencil size={14} className="item-icon" />
                            </button>

                            <button
                              type="button"
                              className="dropdown-item delete"
                              onClick={() => {
                                setDeleteCoupon(coupon);
                                setActiveActionDropdownId(null);
                              }}
                            >
                              <span>Delete Promotion</span>
                              <Trash2 size={14} className="item-icon" />
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

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="promotions"
        />
      </section>

      {/* CREATE MODAL */}
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
          <div 
            className="discount-modal-container edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>Create Promo / Offer</h3>
              <button 
                type="button" 
                className="close-x" 
                onClick={() => setIsGenerateModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {generateError && <div className="modal-form-error">{generateError}</div>}

            <form onSubmit={(e) => { e.preventDefault(); handleGenerateCoupon(); }}>
              <div className="discount-form-grid">
                <div className="modal-field">
                  <span>Promotion Category *</span>
                  <select
                    value={generateForm.promotionCategory}
                    onChange={(e) => setGenerateForm({ ...generateForm, promotionCategory: e.target.value })}
                  >
                    <option value="Offer">Promotional Offer</option>
                    <option value="Coupon">Coupon</option>
                  </select>
                </div>

                <div className="modal-field">
                  <span>Coupon Code *</span>
                  <input
                    type="text"
                    value={generateForm.couponCode}
                    onChange={(e) => setGenerateForm({ ...generateForm, couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. 2W275DVH"
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Title *</span>
                  <input
                    type="text"
                    value={generateForm.title}
                    onChange={(e) => setGenerateForm({ ...generateForm, title: e.target.value })}
                    placeholder="e.g. Guru"
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Amount Type *</span>
                  <select
                    value={generateForm.cpnType}
                    onChange={(e) => setGenerateForm({ ...generateForm, cpnType: e.target.value })}
                  >
                    <option value="Fixed">Fixed Amount (₹)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="modal-field">
                  <span>Value / Discount Amount *</span>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.value}
                    onChange={(e) => setGenerateForm({ ...generateForm, value: e.target.value })}
                    placeholder="e.g. 100.00"
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Max Discount Cap (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.maxDiscountAmount}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxDiscountAmount: e.target.value })}
                    placeholder="Optional max discount"
                  />
                </div>

                <div className="modal-field">
                  <span>Total Use Limit *</span>
                  <input
                    type="number"
                    value={generateForm.useLimit}
                    onChange={(e) => setGenerateForm({ ...generateForm, useLimit: e.target.value })}
                    placeholder="e.g. 100"
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Max Usage Per User</span>
                  <input
                    type="number"
                    value={generateForm.maxUsagePerUser}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxUsagePerUser: e.target.value })}
                    placeholder="e.g. 1"
                  />
                </div>

                <div className="modal-field">
                  <span>Min Booking Amount (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.minBookingAmount}
                    onChange={(e) => setGenerateForm({ ...generateForm, minBookingAmount: e.target.value })}
                    placeholder="e.g. 0.00"
                  />
                </div>

                <div className="modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    value={generateForm.priority}
                    onChange={(e) => setGenerateForm({ ...generateForm, priority: e.target.value })}
                    placeholder="e.g. 0"
                  />
                </div>

                <div className="modal-field">
                  <span>Start Date *</span>
                  <input
                    type="date"
                    value={generateForm.startDate}
                    onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Expiry Date *</span>
                  <input
                    type="date"
                    value={generateForm.expiryDate}
                    onChange={(e) => setGenerateForm({ ...generateForm, expiryDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Status *</span>
                  <select
                    value={generateForm.status}
                    onChange={(e) => setGenerateForm({ ...generateForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="modal-field wide" style={{ display: "flex", flexDirection: "row", gap: "20px", alignItems: "center", paddingTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={generateForm.isFirstTimeUserOnly}
                      onChange={(e) => setGenerateForm({ ...generateForm, isFirstTimeUserOnly: e.target.checked })}
                    />
                    <span>First Time User Only</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={generateForm.isAutoApply}
                      onChange={(e) => setGenerateForm({ ...generateForm, isAutoApply: e.target.checked })}
                    />
                    <span>Auto Apply</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={generateForm.isExclusive}
                      onChange={(e) => setGenerateForm({ ...generateForm, isExclusive: e.target.checked })}
                    />
                    <span>Is Exclusive</span>
                  </label>
                </div>

                <div className="modal-field wide">
                  <span>Description / Terms</span>
                  <textarea
                    value={generateForm.description}
                    onChange={(e) => setGenerateForm({ ...generateForm, description: e.target.value })}
                    placeholder="e.g. Gurupournami offer"
                  />
                </div>

                <div className="modal-field wide">
                  <span>Remark</span>
                  <input
                    type="text"
                    value={generateForm.remark}
                    onChange={(e) => setGenerateForm({ ...generateForm, remark: e.target.value })}
                    placeholder="Internal remarks or notes..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setIsGenerateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn save-btn"
                >
                  Create Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingCoupon && (
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setViewingCoupon(null)}
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
          <div 
            className="discount-modal-container edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
          >
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", fontWeight: 700 }}>
                Promotion Details — <span style={{ color: "#A51C49" }}>{viewingCoupon.couponCode}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setViewingCoupon(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", color: "#334155" }}>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Category</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>{viewingCoupon.promotionCategory || "Offer"}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Title</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>{viewingCoupon.title || "--"}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Discount Value</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#047857" }}>
                  {viewingCoupon.cpnType === "Percentage" ? `${viewingCoupon.value}%` : `₹${viewingCoupon.value}`}
                  {viewingCoupon.maxDiscountAmount ? ` (Max Cap: ₹${viewingCoupon.maxDiscountAmount})` : ""}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Amount Type</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>{viewingCoupon.cpnType || "Fixed"}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Start Date</span>
                <div style={{ fontWeight: 600, marginTop: "4px", color: "#047857" }}>{formatCouponDateTime(viewingCoupon.startDate)}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Expiry Date</span>
                <div style={{ fontWeight: 600, marginTop: "4px", color: "#b91c1c" }}>{formatCouponDateTime(viewingCoupon.expiryDate)}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Usage Limit / Count</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>{viewingCoupon.usedCount || 0} / {viewingCoupon.useLimit || "∞"}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Max Usage Per User</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>{viewingCoupon.maxUsagePerUser || 1}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Min Booking Amount</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: "#0f172a" }}>₹{viewingCoupon.minBookingAmount || 0}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Status</span>
                <div style={{ fontWeight: 700, marginTop: "4px", color: viewingCoupon.status === "active" ? "#047857" : "#b91c1c" }}>
                  {viewingCoupon.status === "active" ? "Active" : "Inactive"}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Conditions & Rules</span>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  <span style={{ background: viewingCoupon.isFirstTimeUserOnly ? "#dcfce7" : "#f1f5f9", color: viewingCoupon.isFirstTimeUserOnly ? "#15803d" : "#64748b", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                    First Time User Only: {viewingCoupon.isFirstTimeUserOnly ? "Yes" : "No"}
                  </span>
                  <span style={{ background: viewingCoupon.isAutoApply ? "#dcfce7" : "#f1f5f9", color: viewingCoupon.isAutoApply ? "#15803d" : "#64748b", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                    Auto Apply: {viewingCoupon.isAutoApply ? "Yes" : "No"}
                  </span>
                  <span style={{ background: viewingCoupon.isExclusive ? "#dcfce7" : "#f1f5f9", color: viewingCoupon.isExclusive ? "#15803d" : "#64748b", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                    Is Exclusive: {viewingCoupon.isExclusive ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {viewingCoupon.description && (
                <div style={{ gridColumn: "1 / -1", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Description</span>
                  <div style={{ marginTop: "4px", color: "#334155" }}>{viewingCoupon.description}</div>
                </div>
              )}

              {viewingCoupon.remark && (
                <div style={{ gridColumn: "1 / -1", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Remark</span>
                  <div style={{ marginTop: "4px", color: "#334155" }}>{viewingCoupon.remark}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setViewingCoupon(null)}
                style={{ background: "#A51C49", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE CONDITIONS MODAL */}
      {conditionsCoupon && (
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setConditionsCoupon(null)}
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
          <div 
            className="discount-modal-container edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
          >
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", fontWeight: 700 }}>
                Manage Conditions — <span style={{ color: "#A51C49" }}>{conditionsCoupon.couponCode}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setConditionsCoupon(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            {conditionError && (
              <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {conditionError}
              </div>
            )}

            <form onSubmit={handleAddCondition} style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>Add New Condition Rule</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Condition Type</label>
                  <select
                    value={newConditionForm.conditionType}
                    onChange={(e) => setNewConditionForm({ ...newConditionForm, conditionType: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="OperatorName">Bus Operator Name</option>
                    <option value="Route">Route (Origin-Destination)</option>
                    <option value="BusType">Bus Seating / AC Type</option>
                    <option value="DepartureTime">Departure Time Range</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Operator</label>
                  <select
                    value={newConditionForm.conditionOperator}
                    onChange={(e) => setNewConditionForm({ ...newConditionForm, conditionOperator: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="Equals">Equals / Matches</option>
                    <option value="NotEquals">Not Equals / Exclude</option>
                    <option value="Contains">Contains</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Primary Value (Value 1) *</label>
                  <input
                    type="text"
                    value={newConditionForm.value1}
                    onChange={(e) => setNewConditionForm({ ...newConditionForm, value1: e.target.value })}
                    placeholder="e.g. VRL Travels (or 'ALL' for no restriction)"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Secondary Value (Value 2)</label>
                  <input
                    type="text"
                    value={newConditionForm.value2}
                    onChange={(e) => setNewConditionForm({ ...newConditionForm, value2: e.target.value })}
                    placeholder="Optional secondary value"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  style={{ background: "#A51C49", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  + Add Condition
                </button>
              </div>
            </form>

            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>
              Active Conditions ({conditionsList.length})
            </h4>

            {isLoadingConditions ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>Loading conditions...</p>
            ) : conditionsList.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic", background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center" }}>
                No conditions applied. This promotion applies to all bookings by default.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {conditionsList.map((cond, idx) => (
                  <div key={cond.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "13px", color: "#334155" }}>
                      <strong style={{ color: "#A51C49" }}>{cond.conditionType}</strong> — {cond.conditionOperator} <span style={{ background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>{cond.value1}</span>
                      {cond.value2 ? ` (${cond.value2})` : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCondition(cond.id)}
                      style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConditionsCoupon(null)}
                style={{ background: "#64748b", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editCoupon && (
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
            zIndex: 10000
          }}
        >
          <div 
            className="discount-modal-container edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>Edit Promotion — {editCoupon.couponCode}</h3>
              <button type="button" className="close-x" onClick={() => setEditCoupon(null)}>
                &times;
              </button>
            </div>

            {editError && <div className="modal-form-error">{editError}</div>}

            <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}>
              <div className="discount-form-grid">
                <div className="modal-field">
                  <span>Promotion Category *</span>
                  <select
                    value={editCoupon.promotionCategory || "Offer"}
                    onChange={(e) => setEditCoupon({ ...editCoupon, promotionCategory: e.target.value })}
                  >
                    <option value="Offer">Promotional Offer</option>
                    <option value="Coupon">Coupon</option>
                  </select>
                </div>

                <div className="modal-field">
                  <span>Coupon Code *</span>
                  <input
                    type="text"
                    value={editCoupon.couponCode || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, couponCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Title *</span>
                  <input
                    type="text"
                    value={editCoupon.title || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, title: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Amount Type *</span>
                  <select
                    value={editCoupon.cpnType || "Fixed"}
                    onChange={(e) => setEditCoupon({ ...editCoupon, cpnType: e.target.value })}
                  >
                    <option value="Fixed">Fixed Amount (₹)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="modal-field">
                  <span>Value / Discount Amount *</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editCoupon.value || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, value: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Max Discount Cap (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editCoupon.maxDiscountAmount ?? ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, maxDiscountAmount: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <span>Total Use Limit *</span>
                  <input
                    type="number"
                    value={editCoupon.useLimit || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, useLimit: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Max Usage Per User</span>
                  <input
                    type="number"
                    value={editCoupon.maxUsagePerUser ?? 1}
                    onChange={(e) => setEditCoupon({ ...editCoupon, maxUsagePerUser: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <span>Min Booking Amount (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editCoupon.minBookingAmount ?? 0}
                    onChange={(e) => setEditCoupon({ ...editCoupon, minBookingAmount: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    value={editCoupon.priority ?? 0}
                    onChange={(e) => setEditCoupon({ ...editCoupon, priority: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <span>Start Date *</span>
                  <input
                    type="date"
                    value={editCoupon.startDate || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Expiry Date *</span>
                  <input
                    type="date"
                    value={editCoupon.expiryDate || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, expiryDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <span>Status *</span>
                  <select
                    value={editCoupon.status || "Active"}
                    onChange={(e) => setEditCoupon({ ...editCoupon, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="modal-field wide" style={{ display: "flex", flexDirection: "row", gap: "20px", alignItems: "center", paddingTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editCoupon.isFirstTimeUserOnly)}
                      onChange={(e) => setEditCoupon({ ...editCoupon, isFirstTimeUserOnly: e.target.checked })}
                    />
                    <span>First Time User Only</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editCoupon.isAutoApply)}
                      onChange={(e) => setEditCoupon({ ...editCoupon, isAutoApply: e.target.checked })}
                    />
                    <span>Auto Apply</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editCoupon.isExclusive)}
                      onChange={(e) => setEditCoupon({ ...editCoupon, isExclusive: e.target.checked })}
                    />
                    <span>Is Exclusive</span>
                  </label>
                </div>

                <div className="modal-field wide">
                  <span>Description / Terms</span>
                  <textarea
                    value={editCoupon.description || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, description: e.target.value })}
                  />
                </div>

                <div className="modal-field wide">
                  <span>Remark</span>
                  <input
                    type="text"
                    value={editCoupon.remark || ""}
                    onChange={(e) => setEditCoupon({ ...editCoupon, remark: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setEditCoupon(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn save-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteCoupon && (
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setDeleteCoupon(null)}
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
          <div 
            className="discount-modal-container edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "480px", background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
          >
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#b91c1c", fontWeight: 700 }}>Delete Promotion</h3>
              <button 
                type="button" 
                onClick={() => setDeleteCoupon(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5", margin: "0 0 24px 0" }}>
              Are you sure you want to delete promotion code <strong style={{ color: "#A51C49" }}>{deleteCoupon.couponCode}</strong> ({deleteCoupon.title})? This action cannot be undone.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setDeleteCoupon(null)}
                style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCoupon}
                style={{ background: "#ef4444", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)" }}
              >
                Delete Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
