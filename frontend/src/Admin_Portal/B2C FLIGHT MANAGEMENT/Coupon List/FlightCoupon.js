/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, Pencil, Plus, Trash2, X, Eye, Tag, DollarSign, CheckCircle2, Clock, Users, SlidersHorizontal } from "lucide-react";
import "./FlightCoupon.css";
import { csvCell, formatCouponDate, formatCouponDateTime, formatCurrency } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  createFlightCoupon,
  deleteFlightCoupon,
  listFlightCoupons,
  updateFlightCoupon,
} from "../../../services/flightBookingService";

const DEFAULT_COUPON_SORT_BY = "entryDate";
const DEFAULT_COUPON_SORT_ORDER = "desc";

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
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function createDefaultCouponForm() {
  return {
    value: "",
    cpnType: "Percentage Discount",
    startDate: "",
    expiryDate: "",
    couponCode: generateCouponCode(),
    useLimit: "100",
    maxUsagePerUser: "1",
    isAutoApply: false,
    isExclusive: true,
    priority: "0",
    minBookingAmount: "0",
    status: "Active",
    remark: "",
    discountType: "Percentage (%)",
    route: "All Routes",
    createdBy: "Admin"
  };
}

export default function AdminFlightCouponListPage() {
  const [coupons, setCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponLoadError, setCouponLoadError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter States
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCouponCode, setFilterCouponCode] = useState("");
  const [filterCouponType, setFilterCouponType] = useState("All Types");
  const [filterDiscountType, setFilterDiscountType] = useState("All Types");
  const [filterDiscountValue, setFilterDiscountValue] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxDiscount, setFilterMaxDiscount] = useState("");
  const [filterRoute, setFilterRoute] = useState("All Routes");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterCreatedBy, setFilterCreatedBy] = useState("All");
  const [filterValidFrom, setFilterValidFrom] = useState("");
  const [filterValidTo, setFilterValidTo] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState("All Coupons");

  // Pagination & Modals
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(createDefaultCouponForm);
  const [generateError, setGenerateError] = useState("");
  const [editCoupon, setEditCoupon] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteCouponRecord, setDeleteCouponRecord] = useState(null);

  // Load coupons from backend
  const loadCoupons = async () => {
    setIsLoadingCoupons(true);
    setCouponLoadError("");
    try {
      const backendCoupons = await listFlightCoupons();
      setCoupons(backendCoupons);
    } catch (error) {
      setCouponLoadError(error.message || "Unable to load coupons from backend.");
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleApplyQuickFilter = (type) => {
    setActiveQuickFilter(type);
    if (type === "All Coupons") {
      setFilterStatus("All Status");
      setFilterDiscountType("All Types");
      setFilterCouponType("All Types");
    } else if (type === "Active") {
      setFilterStatus("Active");
    } else if (type === "Expired") {
      setFilterStatus("Expired");
    } else if (type === "Upcoming") {
      setFilterStatus("Scheduled");
    } else if (type === "Percentage") {
      setFilterDiscountType("Percentage (%)");
    } else if (type === "Flat Amount") {
      setFilterDiscountType("Flat Amount (₹)");
    } else if (type === "Weekend") {
      setFilterCouponType("Weekend Offer");
    } else if (type === "Festival") {
      setFilterCouponType("Festival Offer");
    } else if (type === "First Booking") {
      setFilterCouponType("First Booking Coupon");
    }
  };

  const handleResetFilters = () => {
    setFilterSearch("");
    setFilterCouponCode("");
    setFilterCouponType("All Types");
    setFilterDiscountType("All Types");
    setFilterDiscountValue("");
    setFilterMinAmount("");
    setFilterMaxDiscount("");
    setFilterRoute("All Routes");
    setFilterStatus("All Status");
    setFilterCreatedBy("All");
    setFilterValidFrom("");
    setFilterValidTo("");
    setActiveQuickFilter("All Coupons");
  };

  // Filter logic over coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        const matchesCode = String(coupon.couponCode || "").toLowerCase().includes(term);
        const matchesName = String(coupon.couponCode || "").toLowerCase().includes(term);
        const matchesDesc = String(coupon.remark || "").toLowerCase().includes(term);
        if (!matchesCode && !matchesName && !matchesDesc) return false;
      }
      if (filterCouponCode && !String(coupon.couponCode || "").toLowerCase().includes(filterCouponCode.toLowerCase())) return false;
      if (filterCouponType !== "All Types") {
        if (coupon.cpnType !== filterCouponType) return false;
      }
      if (filterDiscountType !== "All Types") {
        const type = filterDiscountType.includes("Percentage") ? "Percentage" : "Fixed";
        if ((coupon.cpnType || "").toLowerCase() !== type.toLowerCase()) return false;
      }
      if (filterDiscountValue && Number(coupon.value) !== Number(filterDiscountValue)) return false;
      if (filterStatus !== "All Status") {
        if (String(coupon.status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
      }
      if (filterRoute !== "All Routes" && coupon.route && coupon.route !== filterRoute) return false;
      if (filterCreatedBy !== "All" && coupon.createdBy && coupon.createdBy !== filterCreatedBy) return false;

      return true;
    });
  }, [coupons, filterSearch, filterCouponCode, filterCouponType, filterDiscountType, filterDiscountValue, filterRoute, filterStatus, filterCreatedBy]);

  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoupons.slice(start, start + itemsPerPage);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const totalCount = filteredCoupons.length;
    const activeCount = filteredCoupons.filter(c => String(c.status).toLowerCase() === "active").length;
    const expiredCount = filteredCoupons.filter(c => String(c.status).toLowerCase() === "expired" || String(c.status).toLowerCase() === "inactive").length;
    const totalRedemptions = filteredCoupons.reduce((sum, c) => sum + (Number(c.useLimit) || 0), 0);
    const totalSavings = filteredCoupons.reduce((sum, c) => sum + (Number(c.value) * (Number(c.useLimit) || 0)), 0);

    return { totalCount, activeCount, expiredCount, totalRedemptions, totalSavings };
  }, [filteredCoupons]);

  // Create Save handler
  const handleSaveGenerate = async () => {
    setGenerateError("");
    if (!generateForm.value || !generateForm.startDate || !generateForm.expiryDate) {
      setGenerateError("Please enter Discount Value, Start Date, and Expiry Date.");
      return;
    }
    try {
      const payload = {
        ...generateForm,
        value: Number(generateForm.value),
        useLimit: Number(generateForm.useLimit || 0),
        maxUsagePerUser: Number(generateForm.maxUsagePerUser || 1),
        priority: Number(generateForm.priority || 0),
        minBookingAmount: Number(generateForm.minBookingAmount || 0),
        entryDate: new Date().toISOString()
      };
      await createFlightCoupon(payload);
      setIsGenerateModalOpen(false);
      setGenerateForm(createDefaultCouponForm());
      loadCoupons();
    } catch (err) {
      setGenerateError(err.message || "Failed to create coupon.");
    }
  };

  // Edit Save handler
  const handleSaveEdit = async () => {
    setEditError("");
    if (!editCoupon.value || !editCoupon.startDate || !editCoupon.expiryDate) {
      setEditError("Please enter Discount Value, Start Date, and Expiry Date.");
      return;
    }
    try {
      const payload = {
        ...editCoupon,
        value: Number(editCoupon.value),
        useLimit: Number(editCoupon.useLimit || 0),
        maxUsagePerUser: Number(editCoupon.maxUsagePerUser || 1),
        priority: Number(editCoupon.priority || 0),
        minBookingAmount: Number(editCoupon.minBookingAmount || 0)
      };
      await updateFlightCoupon(editCoupon.id, payload);
      setEditCoupon(null);
      loadCoupons();
    } catch (err) {
      setEditError(err.message || "Failed to update coupon.");
    }
  };

  // Delete handler
  const handleSaveDelete = async () => {
    if (!deleteCouponRecord) return;
    try {
      await deleteFlightCoupon(deleteCouponRecord.id);
      setDeleteCouponRecord(null);
      loadCoupons();
    } catch (err) {
      alert(err.message || "Failed to delete coupon.");
    }
  };

  const handleExport = () => {
    const header = ["ID", "Coupon Code", "Coupon Title", "Discount Type", "Discount Value", "Min. Booking", "Valid From", "Valid To", "Routes", "Status", "Redemptions", "Created On"];
    const csvRows = filteredCoupons.map((c) => [
      c.id, c.couponCode, c.remark || "Flight Discount", c.cpnType, c.value, c.minBookingAmount, formatCouponDate(c.startDate), formatCouponDate(c.expiryDate), c.route || "All Routes", c.status, c.useLimit, formatCouponDateTime(c.entryDate)
    ]);
    const csv = [header, ...csvRows].map(row => row.map(cell => csvCell(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flight-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const colors = {
    primary: "#D81B60",
    primaryHover: "#C2185B",
    blue: "#2563EB",
    blueHover: "#1D4ED8",
    green: "#10B981",
    greenHover: "#059669",
    slateBg: "#F8FAFC",
    border: "#E2E8F0",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    panel: "#FFFFFF"
  };

  const styles = {
    container: {
      padding: '24px 32px',
      background: colors.slateBg,
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      boxSizing: 'border-box'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    titleSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    titleMain: {
      fontSize: '1.75rem',
      fontWeight: 700,
      color: colors.textPrimary,
      margin: 0
    },
    titleSub: {
      fontSize: '0.875rem',
      color: colors.textSecondary,
      margin: 0
    },
    actionGroup: {
      display: 'flex',
      gap: '12px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    },
    statCard: {
      background: colors.panel,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${colors.border}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    statInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    statLabel: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: colors.textSecondary
    },
    statValue: {
      fontSize: '1.75rem',
      fontWeight: 700,
      color: colors.textPrimary
    },
    statSubtext: {
      fontSize: '0.75rem',
      color: '#94A3B8'
    },
    statIconWrapper: (bgColor, iconColor) => ({
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: bgColor,
      color: iconColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    filterPanel: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    },
    filterItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    filterLabel: {
      fontSize: '0.75rem',
      fontWeight: 700,
      color: colors.textSecondary,
      textTransform: 'uppercase'
    },
    filterInput: {
      padding: '10px 14px',
      borderRadius: '10px',
      border: `1px solid #CBD5E1`,
      fontSize: '0.875rem',
      color: colors.textPrimary,
      outline: 'none',
      background: colors.panel
    },
    quickFilterContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '24px'
    },
    quickFilterChip: (active) => ({
      padding: '8px 16px',
      borderRadius: '20px',
      border: `1px solid ${active ? colors.blue : colors.border}`,
      background: active ? colors.blue : colors.panel,
      color: active ? '#FFFFFF' : colors.textSecondary,
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s'
    }),
    tableCard: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '16px 20px',
      background: '#F8FAFC',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: '0.875rem',
      fontWeight: 600,
      color: colors.textSecondary,
      textAlign: 'left'
    },
    td: {
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: '0.875rem',
      color: '#334155',
      verticalAlign: 'middle'
    },
    couponCodePill: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '8px',
      background: 'rgba(216, 27, 96, 0.1)',
      color: colors.primary,
      fontWeight: 700,
      fontSize: '0.75rem',
      letterSpacing: '0.05em',
      border: `1px dashed rgba(216, 27, 96, 0.3)`
    },
    statusPill: (status) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '8px',
      background: String(status).toLowerCase() === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(217, 48, 37, 0.1)',
      color: String(status).toLowerCase() === 'active' ? '#10B981' : '#D93027',
      fontWeight: 600,
      fontSize: '0.75rem'
    })
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.titleMain}>B2C Flight Coupon List</h1>
          <p style={styles.titleSub}>Manage all B2C flight coupons and offers</p>
        </div>
        <div style={styles.actionGroup}>
          <button 
            onClick={() => setIsGenerateModalOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: colors.primary,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Generate Coupon
          </button>
          <Link 
            to="/admin/b2c-flight/used-coupon-list"
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: '#7C3AED',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            Used Coupon List
          </Link>
          <button 
            onClick={handleExport}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.15)'
            }}
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: isFilterOpen
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isFilterOpen
                ? '0 4px 6px rgba(220, 38, 38, 0.15)'
                : '0 4px 6px rgba(37, 99, 235, 0.15)'
            }}
          >
            <SlidersHorizontal size={16} />
            {isFilterOpen ? 'Hide Filter' : 'Filter'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total Coupons</span>
            <span style={styles.statValue}>{stats.totalCount}</span>
            <span style={styles.statSubtext}>All flight coupons</span>
          </div>
          <div style={styles.statIconWrapper("rgba(139, 92, 246, 0.12)", "#8B5CF6")}>
            <Tag size={24} />
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Active Coupons</span>
            <span style={styles.statValue}>{stats.activeCount}</span>
            <span style={styles.statSubtext}>Currently active</span>
          </div>
          <div style={styles.statIconWrapper("rgba(59, 130, 246, 0.12)", "#2563EB")}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Expired Coupons</span>
            <span style={styles.statValue}>{stats.expiredCount}</span>
            <span style={styles.statSubtext}>Already expired</span>
          </div>
          <div style={styles.statIconWrapper("rgba(217, 48, 37, 0.12)", "#D93027")}>
            <Clock size={24} />
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total Redemptions</span>
            <span style={styles.statValue}>{stats.totalRedemptions}</span>
            <span style={styles.statSubtext}>Total times used</span>
          </div>
          <div style={styles.statIconWrapper("rgba(124, 58, 237, 0.12)", "#7C3AED")}>
            <Users size={24} />
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total Savings</span>
            <span style={styles.statValue}>₹{stats.totalSavings.toLocaleString()}</span>
            <span style={styles.statSubtext}>Total amount saved</span>
          </div>
          <div style={styles.statIconWrapper("rgba(16, 185, 129, 0.12)", "#10B981")}>
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div style={styles.filterPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Search Coupon</span>
              <input 
                type="text" 
                placeholder="Search by code or title..." 
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Coupon Code</span>
              <input 
                type="text" 
                placeholder="Enter coupon code" 
                value={filterCouponCode}
                onChange={e => setFilterCouponCode(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Coupon Type</span>
              <select 
                value={filterCouponType}
                onChange={e => setFilterCouponType(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All Types">All Types</option>
                <option value="Percentage Discount">Percentage Discount</option>
                <option value="Flat Discount">Flat Discount</option>
                <option value="Cashback Coupon">Cashback Coupon</option>
                <option value="First Booking Coupon">First Booking Coupon</option>
                <option value="Festival Offer">Festival Offer</option>
                <option value="Weekend Offer">Weekend Offer</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Discount Type</span>
              <select 
                value={filterDiscountType}
                onChange={e => setFilterDiscountType(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All Types">All Types</option>
                <option value="Percentage (%)">Percentage (%)</option>
                <option value="Flat Amount (₹)">Flat Amount (₹)</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Discount Value</span>
              <input 
                type="number" 
                placeholder="Enter discount value" 
                value={filterDiscountValue}
                onChange={e => setFilterDiscountValue(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Min. Booking Amount</span>
              <input 
                type="number" 
                placeholder="₹ Min Amount" 
                value={filterMinAmount}
                onChange={e => setFilterMinAmount(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Max. Discount Amount</span>
              <input 
                type="number" 
                placeholder="₹ Max Discount" 
                value={filterMaxDiscount}
                onChange={e => setFilterMaxDiscount(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Applicable Sectors</span>
              <select 
                value={filterRoute}
                onChange={e => setFilterRoute(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All Routes">All Routes</option>
                <option value="Delhi → Jaipur">Delhi → Jaipur</option>
                <option value="Hyderabad → Bangalore">Hyderabad → Bangalore</option>
                <option value="Mumbai → Pune">Mumbai → Pune</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Status</span>
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Created By</span>
              <select 
                value={filterCreatedBy}
                onChange={e => setFilterCreatedBy(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All">All</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Marketing Team">Marketing Team</option>
                <option value="Operations Team">Operations Team</option>
                <option value="System Generated">System Generated</option>
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Valid From</span>
              <input 
                type="date" 
                value={filterValidFrom}
                onChange={e => setFilterValidFrom(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Valid To</span>
              <input 
                type="date" 
                value={filterValidTo}
                onChange={e => setFilterValidTo(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              onClick={handleResetFilters}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#64748B',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reset
            </button>
            <button 
              onClick={loadCoupons}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: colors.primary,
                color: '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div style={styles.quickFilterContainer}>
        {["All Coupons", "Active", "Expired", "Upcoming", "Percentage", "Flat Amount", "Weekend", "Festival", "First Booking"].map((name) => (
          <button 
            key={name}
            onClick={() => handleApplyQuickFilter(name)}
            style={styles.quickFilterChip(activeQuickFilter === name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Coupons Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Coupon Code</th>
              <th style={styles.th}>Coupon Title</th>
              <th style={styles.th}>Discount</th>
              <th style={styles.th}>Min. Booking</th>
              <th style={styles.th}>Valid From</th>
              <th style={styles.th}>Valid To</th>
              <th style={styles.th}>Routes</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Redemptions</th>
              <th style={styles.th}>Created On</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingCoupons ? (
              <tr>
                <td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary }}>
                  Loading coupons...
                </td>
              </tr>
            ) : paginatedCoupons.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary }}>
                  No coupons found matching search criteria.
                </td>
              </tr>
            ) : (
              paginatedCoupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td style={styles.td}>{coupon.id}</td>
                  <td style={styles.td}>
                    <span style={styles.couponCodePill}>{coupon.couponCode}</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{coupon.remark || "Flight Discount"}</td>
                  <td style={{ ...styles.td, color: '#10B981', fontWeight: 600 }}>
                    {coupon.value}{String(coupon.cpnType).toLowerCase().includes("percent") ? "% OFF" : " OFF"}
                  </td>
                  <td style={styles.td}>₹{coupon.minBookingAmount || 0}</td>
                  <td style={styles.td}>{formatCouponDate(coupon.startDate)}</td>
                  <td style={styles.td}>{formatCouponDate(coupon.expiryDate)}</td>
                  <td style={styles.td}>
                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: colors.blue, fontSize: '0.75rem', fontWeight: 600 }}>
                      {coupon.route || "All Routes"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusPill(coupon.status)}>{coupon.status}</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{coupon.useLimit || 0}</td>
                  <td style={styles.td}>{formatCouponDateTime(coupon.entryDate)}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditCoupon(coupon)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: `1px solid ${colors.border}`,
                          background: '#FFFFFF',
                          color: colors.textSecondary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Edit Coupon"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteCouponRecord(coupon)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: `1px solid ${colors.border}`,
                          background: '#FFFFFF',
                          color: '#D93027',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete Coupon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <AdminPagination 
          currentPage={currentPage}
          totalItems={filteredCoupons.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="coupons"
        />
      </div>

      {/* Generate Modal */}
      {isGenerateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '550px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 20px 0' }}>Generate Coupon</h3>
            {generateError && <div style={{ color: '#D93027', marginBottom: '12px', fontWeight: 600 }}>{generateError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Coupon Code
                <input 
                  type="text" value={generateForm.couponCode}
                  onChange={e => setGenerateForm({...generateForm, couponCode: e.target.value.toUpperCase()})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Coupon Title (Description)
                <input 
                  type="text" value={generateForm.remark}
                  onChange={e => setGenerateForm({...generateForm, remark: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Coupon Type
                <select 
                  value={generateForm.cpnType}
                  onChange={e => setGenerateForm({...generateForm, cpnType: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                >
                  <option value="Percentage Discount">Percentage Discount</option>
                  <option value="Flat Discount">Flat Discount</option>
                  <option value="Cashback Coupon">Cashback Coupon</option>
                  <option value="First Booking Coupon">First Booking Coupon</option>
                  <option value="Festival Offer">Festival Offer</option>
                  <option value="Weekend Offer">Weekend Offer</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Discount Value (Amount or Percentage)
                <input 
                  type="number" value={generateForm.value}
                  onChange={e => setGenerateForm({...generateForm, value: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Min Booking Amount
                <input 
                  type="number" value={generateForm.minBookingAmount}
                  onChange={e => setGenerateForm({...generateForm, minBookingAmount: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Redemption Limit (Total Uses)
                <input 
                  type="number" value={generateForm.useLimit}
                  onChange={e => setGenerateForm({...generateForm, useLimit: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid From
                  <input 
                    type="date" value={generateForm.startDate}
                    onChange={e => setGenerateForm({...generateForm, startDate: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid To
                  <input 
                    type="date" value={generateForm.expiryDate}
                    onChange={e => setGenerateForm({...generateForm, expiryDate: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setIsGenerateModalOpen(false)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveGenerate} style={{ padding: '10px 20px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create Coupon</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editCoupon && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '550px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 20px 0' }}>Edit Coupon</h3>
            {editError && <div style={{ color: '#D93027', marginBottom: '12px', fontWeight: 600 }}>{editError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Coupon Code
                <input 
                  type="text" value={editCoupon.couponCode}
                  onChange={e => setEditCoupon({...editCoupon, couponCode: e.target.value.toUpperCase()})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Coupon Title (Description)
                <input 
                  type="text" value={editCoupon.remark || ""}
                  onChange={e => setEditCoupon({...editCoupon, remark: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Discount Value
                <input 
                  type="number" value={editCoupon.value}
                  onChange={e => setEditCoupon({...editCoupon, value: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Min Booking Amount
                <input 
                  type="number" value={editCoupon.minBookingAmount || ""}
                  onChange={e => setEditCoupon({...editCoupon, minBookingAmount: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Redemption Limit (Total Uses)
                <input 
                  type="number" value={editCoupon.useLimit || ""}
                  onChange={e => setEditCoupon({...editCoupon, useLimit: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid From
                  <input 
                    type="date" value={toInputDate(editCoupon.startDate)}
                    onChange={e => setEditCoupon({...editCoupon, startDate: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid To
                  <input 
                    type="date" value={toInputDate(editCoupon.expiryDate)}
                    onChange={e => setEditCoupon({...editCoupon, expiryDate: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setEditCoupon(null)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: '10px 20px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCouponRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', width: '450px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 12px 0' }}>Delete Coupon</h3>
            <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '20px' }}>
              Are you sure you want to delete coupon <strong style={{ color: colors.textPrimary }}>{deleteCouponRecord.couponCode}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDeleteCouponRecord(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveDelete} style={{ padding: '8px 16px', background: '#D93027', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
