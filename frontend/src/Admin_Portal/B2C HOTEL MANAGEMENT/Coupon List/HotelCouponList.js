/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, Pencil, Plus, Trash2, X, Eye, Tag, DollarSign, CheckCircle2, Clock, Users, SlidersHorizontal } from "lucide-react";
import "./HotelCouponList.css";
import { csvCell, formatCouponDate, formatCouponDateTime, formatCurrency } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  listHotelPromotions,
  createHotelPromotion,
  updateHotelPromotion,
  deleteHotelPromotion,
} from "../../../services/adminHotelService";

const DEFAULT_SORT_BY = "createdAtUtc";
const DEFAULT_SORT_ORDER = "desc";

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
    code: generatePromoCode(),
    title: "",
    description: "",
    promotionType: "Coupon",
    discountType: "Percentage (%)",
    discountValue: "",
    maxDiscountAmount: "2000",
    minBookingAmount: "500",
    isActive: true,
    isExclusive: true,
    isAutoApply: false,
    priority: "0",
    maxUsage: "100",
    maxUsagePerUser: "1",
    startDateUtc: "",
    endDateUtc: "",
    conditions: [],
    createdBy: "Admin",
    route: "All Routes"
  };
}

export default function HotelCouponList() {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [addForm, setAddForm] = useState(createDefaultForm);
  const [editRecord, setEditRecord] = useState(null);
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteRecord, setDeleteRecord] = useState(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await listHotelPromotions();
      setPromotions(data);
    } catch (err) {
      setLoadError(err.message || "Failed to load promotions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
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

  const filteredRecords = useMemo(() => {
    return promotions.filter((promo) => {
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        const matchesCode = String(promo.code || "").toLowerCase().includes(term);
        const matchesTitle = String(promo.title || "").toLowerCase().includes(term);
        const matchesDesc = String(promo.description || "").toLowerCase().includes(term);
        if (!matchesCode && !matchesTitle && !matchesDesc) return false;
      }
      if (filterCouponCode && !String(promo.code || "").toLowerCase().includes(filterCouponCode.toLowerCase())) return false;
      if (filterCouponType !== "All Types" && promo.promotionType !== filterCouponType) return false;
      if (filterDiscountType !== "All Types") {
        const isFlat = filterDiscountType.includes("Flat");
        const typeMatch = isFlat ? "Flat" : "Percentage";
        if (!String(promo.discountType || "").toLowerCase().includes(typeMatch.toLowerCase())) return false;
      }
      if (filterDiscountValue && Number(promo.discountValue) !== Number(filterDiscountValue)) return false;
      if (filterStatus !== "All Status") {
        const isActive = filterStatus === "Active";
        if (promo.isActive !== isActive) return false;
      }
      if (filterRoute !== "All Routes" && promo.route && promo.route !== filterRoute) return false;
      if (filterCreatedBy !== "All" && promo.createdBy && promo.createdBy !== filterCreatedBy) return false;

      return true;
    });
  }, [promotions, filterSearch, filterCouponCode, filterCouponType, filterDiscountType, filterDiscountValue, filterRoute, filterStatus, filterCreatedBy]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const totalCount = filteredRecords.length;
    const activeCount = filteredRecords.filter(p => p.isActive).length;
    const expiredCount = filteredRecords.filter(p => !p.isActive).length;
    const totalRedemptions = filteredRecords.reduce((sum, p) => sum + (Number(p.maxUsage) || 0), 0);
    const totalSavings = filteredRecords.reduce((sum, p) => sum + (Number(p.discountValue) * (Number(p.maxUsage) || 0)), 0);

    return { totalCount, activeCount, expiredCount, totalRedemptions, totalSavings };
  }, [filteredRecords]);

  // Create Save handler
  const handleSaveAdd = async () => {
    setAddError("");
    if (!addForm.discountValue || !addForm.startDateUtc || !addForm.endDateUtc) {
      setAddError("Please fill in required fields (Discount Value, Dates).");
      return;
    }
    try {
      const payload = {
        ...addForm,
        discountValue: Number(addForm.discountValue),
        minBookingAmount: Number(addForm.minBookingAmount || 0),
        maxDiscountAmount: Number(addForm.maxDiscountAmount || 0),
        maxUsage: Number(addForm.maxUsage || 0),
        maxUsagePerUser: Number(addForm.maxUsagePerUser || 1),
        priority: Number(addForm.priority || 0),
        startDateUtc: new Date(addForm.startDateUtc).toISOString(),
        endDateUtc: new Date(addForm.endDateUtc).toISOString()
      };
      await createHotelPromotion(payload);
      setIsAddOpen(false);
      setAddForm(createDefaultForm());
      fetchPromotions();
    } catch (err) {
      setAddError(err.message || "Failed to create promotion.");
    }
  };

  // Edit Save handler
  const handleSaveEdit = async () => {
    setEditError("");
    if (!editRecord.discountValue || !editRecord.startDateUtc || !editRecord.endDateUtc) {
      setEditError("Please fill in required fields (Discount Value, Dates).");
      return;
    }
    try {
      const payload = {
        ...editRecord,
        discountValue: Number(editRecord.discountValue),
        minBookingAmount: Number(editRecord.minBookingAmount || 0),
        maxDiscountAmount: Number(editRecord.maxDiscountAmount || 0),
        maxUsage: Number(editRecord.maxUsage || 0),
        maxUsagePerUser: Number(editRecord.maxUsagePerUser || 1),
        priority: Number(editRecord.priority || 0),
        startDateUtc: new Date(editRecord.startDateUtc).toISOString(),
        endDateUtc: new Date(editRecord.endDateUtc).toISOString()
      };
      await updateHotelPromotion(editRecord.id, payload);
      setIsEditOpen(false);
      setEditRecord(null);
      fetchPromotions();
    } catch (err) {
      setEditError(err.message || "Failed to update promotion.");
    }
  };

  // Delete handler
  const handleSaveDelete = async () => {
    if (!deleteRecord) return;
    try {
      await deleteHotelPromotion(deleteRecord.id);
      setDeleteRecord(null);
      fetchPromotions();
    } catch (err) {
      alert(err.message || "Failed to delete promotion.");
    }
  };

  const handleToggleStatus = async (promo) => {
    try {
      const payload = {
        ...promo,
        isActive: !promo.isActive,
        discountValue: Number(promo.discountValue),
        minBookingAmount: Number(promo.minBookingAmount || 0),
        maxDiscountAmount: Number(promo.maxDiscountAmount || 0),
        maxUsage: Number(promo.maxUsage || 0),
        maxUsagePerUser: Number(promo.maxUsagePerUser || 1),
        priority: Number(promo.priority || 0),
        startDateUtc: promo.startDateUtc ? new Date(promo.startDateUtc).toISOString() : "",
        endDateUtc: promo.endDateUtc ? new Date(promo.endDateUtc).toISOString() : ""
      };
      await updateHotelPromotion(promo.id, payload);
      fetchPromotions();
    } catch (err) {
      alert(err.message || "Failed to toggle status.");
    }
  };

  const handleExport = () => {
    const header = ["ID", "Coupon Code", "Coupon Title", "Discount Type", "Discount Value", "Min. Booking", "Valid From", "Valid To", "Routes", "Status", "Redemptions", "Created On"];
    const csvRows = filteredRecords.map((c) => [
      c.id, c.code, c.title || "Hotel Discount", c.discountType, c.discountValue, c.minBookingAmount, formatCouponDate(c.startDateUtc), formatCouponDate(c.endDateUtc), c.route || "All Routes", c.isActive ? "Active" : "Inactive", c.maxUsage, formatCouponDateTime(c.createdAtUtc)
    ]);
    const csv = [header, ...csvRows].map(row => row.map(cell => csvCell(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
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
    statusPill: (isActive) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '8px',
      background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(217, 48, 37, 0.1)',
      color: isActive ? '#10B981' : '#D93027',
      fontWeight: 600,
      fontSize: '0.75rem'
    })
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.titleMain}>B2C Hotel Coupon List</h1>
          <p style={styles.titleSub}>Manage all B2C hotel coupons and promotions</p>
        </div>
        <div style={styles.actionGroup}>
          <button 
            onClick={() => setIsAddOpen(true)}
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
            to="/admin/b2c-hotel/used-coupon-list"
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
            <span style={styles.statSubtext}>All hotel coupons</span>
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
              <span style={styles.filterLabel}>Applicable Hotel/Routes</span>
              <select 
                value={filterRoute}
                onChange={e => setFilterRoute(e.target.value)}
                style={styles.filterInput}
              >
                <option value="All Routes">All Routes</option>
                <option value="Mumbai Gateway Hotel">Mumbai Gateway Hotel</option>
                <option value="Goa Beach Resort">Goa Beach Resort</option>
                <option value="Delhi Palace Inn">Delhi Palace Inn</option>
                <option value="Bangalore Suites">Bangalore Suites</option>
                <option value="Kolkata Plaza">Kolkata Plaza</option>
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
              onClick={fetchPromotions}
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
              <th style={styles.th}>Routes/Hotels</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Redemptions</th>
              <th style={styles.th}>Created On</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary }}>
                  Loading promotions...
                </td>
              </tr>
            ) : paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary }}>
                  No coupons found matching search criteria.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((promo) => (
                <tr key={promo.id}>
                  <td style={styles.td}>{promo.id}</td>
                  <td style={styles.td}>
                    <span style={styles.couponCodePill}>{promo.code}</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{promo.title || "Hotel Promotion"}</td>
                  <td style={{ ...styles.td, color: '#10B981', fontWeight: 600 }}>
                    {promo.discountValue}{String(promo.discountType).toLowerCase().includes("percent") ? "% OFF" : " OFF"}
                  </td>
                  <td style={styles.td}>₹{promo.minBookingAmount || 0}</td>
                  <td style={styles.td}>{formatCouponDate(promo.startDateUtc)}</td>
                  <td style={styles.td}>{formatCouponDate(promo.endDateUtc)}</td>
                  <td style={styles.td}>
                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: colors.blue, fontSize: '0.75rem', fontWeight: 600 }}>
                      {promo.route || "All Hotels"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span 
                      onClick={() => handleToggleStatus(promo)}
                      style={{ ...styles.statusPill(promo.isActive), cursor: 'pointer' }}
                      title="Click to toggle status"
                    >
                      {promo.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{promo.maxUsage || 0}</td>
                  <td style={styles.td}>{formatCouponDateTime(promo.createdAtUtc)}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          setEditRecord(promo);
                          setIsEditOpen(true);
                        }}
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
                        onClick={() => setDeleteRecord(promo)}
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
          totalItems={filteredRecords.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="promotions"
        />
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '550px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 20px 0' }}>Generate Hotel Promotion</h3>
            {addError && <div style={{ color: '#D93027', marginBottom: '12px', fontWeight: 600 }}>{addError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Promotion Code
                <input 
                  type="text" value={addForm.code}
                  onChange={e => setAddForm({...addForm, code: e.target.value.toUpperCase()})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Promotion Title
                <input 
                  type="text" value={addForm.title}
                  onChange={e => setAddForm({...addForm, title: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Discount Value
                <input 
                  type="number" value={addForm.discountValue}
                  onChange={e => setAddForm({...addForm, discountValue: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Min Booking Amount
                <input 
                  type="number" value={addForm.minBookingAmount}
                  onChange={e => setAddForm({...addForm, minBookingAmount: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Max Usage Limit
                <input 
                  type="number" value={addForm.maxUsage}
                  onChange={e => setAddForm({...addForm, maxUsage: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid From
                  <input 
                    type="date" value={addForm.startDateUtc}
                    onChange={e => setAddForm({...addForm, startDateUtc: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid To
                  <input 
                    type="date" value={addForm.endDateUtc}
                    onChange={e => setAddForm({...addForm, endDateUtc: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Status
                <select 
                  value={addForm.isActive ? "true" : "false"}
                  onChange={e => setAddForm({...addForm, isActive: e.target.value === "true"})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setIsAddOpen(false)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveAdd} style={{ padding: '10px 20px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create Promotion</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '550px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 20px 0' }}>Edit Hotel Promotion</h3>
            {editError && <div style={{ color: '#D93027', marginBottom: '12px', fontWeight: 600 }}>{editError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Promotion Code
                <input 
                  type="text" value={editRecord.code}
                  onChange={e => setEditRecord({...editRecord, code: e.target.value.toUpperCase()})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Promotion Title
                <input 
                  type="text" value={editRecord.title || ""}
                  onChange={e => setEditRecord({...editRecord, title: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Discount Value
                <input 
                  type="number" value={editRecord.discountValue}
                  onChange={e => setEditRecord({...editRecord, discountValue: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Min Booking Amount
                <input 
                  type="number" value={editRecord.minBookingAmount || ""}
                  onChange={e => setEditRecord({...editRecord, minBookingAmount: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Max Usage Limit
                <input 
                  type="number" value={editRecord.maxUsage || ""}
                  onChange={e => setEditRecord({...editRecord, maxUsage: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid From
                  <input 
                    type="date" value={toInputDate(editRecord.startDateUtc)}
                    onChange={e => setEditRecord({...editRecord, startDateUtc: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Valid To
                  <input 
                    type="date" value={toInputDate(editRecord.endDateUtc)}
                    onChange={e => setEditRecord({...editRecord, endDateUtc: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Status
                <select 
                  value={editRecord.isActive ? "true" : "false"}
                  onChange={e => setEditRecord({...editRecord, isActive: e.target.value === "true"})}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setEditRecord(null)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: '10px 20px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', width: '450px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 12px 0' }}>Delete Promotion</h3>
            <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '20px' }}>
              Are you sure you want to delete promotion <strong style={{ color: colors.textPrimary }}>{deleteRecord.code}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDeleteRecord(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveDelete} style={{ padding: '8px 16px', background: '#D93027', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
