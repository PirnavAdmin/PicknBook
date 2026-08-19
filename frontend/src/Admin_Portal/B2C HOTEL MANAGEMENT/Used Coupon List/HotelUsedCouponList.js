/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Filter as FilterIcon, X, Plus, Download, Eye, Trash2, Edit, Calendar, DollarSign, Clock, Users, ArrowRight, Tag, CheckCircle2 } from "lucide-react";
import AdminPagination from "../../../components/AdminPagination";
import { csvCell, formatCouponDateTime, formatCurrency } from "../../../utils/adminPortalUtils";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";

const defaultMockHotelUsedCoupons = [
  {
    id: 101,
    couponCode: "SUMMER25",
    userName: "Rahul Sharma",
    userEmail: "rahul@gmail.com",
    userPhone: "+91 98765 43210",
    bookingId: "BK45872",
    bookingType: "Hotel",
    cpnType: "Percentage Discount",
    cpnValue: 25,
    cpnAmount: 2000,
    totalFare: 8000,
    usedDate: "2026-07-22T10:30:00Z",
    bookingStatus: "Active",
    usedFrom: "Website",
    paymentStatus: "Paid",
    discountType: "Percentage (%)",
    route: "Mumbai Gateway Hotel",
    createdBy: "Admin"
  },
  {
    id: 102,
    couponCode: "FLAT500",
    userName: "Priya Patel",
    userEmail: "priya@gmail.com",
    userPhone: "+91 87654 32109",
    bookingId: "BK45871",
    bookingType: "Hotel",
    cpnType: "Flat Discount",
    cpnValue: 500,
    cpnAmount: 500,
    totalFare: 2500,
    usedDate: "2026-07-22T09:15:00Z",
    bookingStatus: "Active",
    usedFrom: "Mobile App",
    paymentStatus: "Paid",
    discountType: "Flat Amount (₹)",
    route: "Goa Beach Resort",
    createdBy: "Super Admin"
  },
  {
    id: 103,
    couponCode: "HOTEL20",
    userName: "Amit Verma",
    userEmail: "amit@gmail.com",
    userPhone: "+91 76543 21098",
    bookingId: "BK45870",
    bookingType: "Hotel",
    cpnType: "Percentage Discount",
    cpnValue: 20,
    cpnAmount: 1000,
    totalFare: 5000,
    usedDate: "2026-07-21T08:45:00Z",
    bookingStatus: "Active",
    usedFrom: "Website",
    paymentStatus: "Paid",
    discountType: "Percentage (%)",
    route: "Delhi Palace Inn",
    createdBy: "System Generated"
  },
  {
    id: 104,
    couponCode: "WELCOME15",
    userName: "Sneha Reddy",
    userEmail: "sneha@gmail.com",
    userPhone: "+91 65432 10987",
    bookingId: "BK45869",
    bookingType: "Hotel",
    cpnType: "First Booking Coupon",
    cpnValue: 15,
    cpnAmount: 1800,
    totalFare: 12000,
    usedDate: "2026-07-21T18:20:00Z",
    bookingStatus: "Active",
    usedFrom: "Website",
    paymentStatus: "Paid",
    discountType: "Percentage (%)",
    route: "Bangalore Suites",
    createdBy: "Marketing Team"
  },
  {
    id: 105,
    couponCode: "BUS100",
    userName: "Vikram Singh",
    userEmail: "vikram@gmail.com",
    userPhone: "+91 54321 09876",
    bookingId: "BK45868",
    bookingType: "Hotel",
    cpnType: "Seasonal Offer",
    cpnValue: 100,
    cpnAmount: 100,
    totalFare: 900,
    usedDate: "2026-07-21T17:10:00Z",
    bookingStatus: "Expired",
    usedFrom: "Agent Portal",
    paymentStatus: "Paid",
    discountType: "Flat Amount (₹)",
    route: "Kolkata Plaza",
    createdBy: "Operations Team"
  }
];

export default function HotelUsedCouponList() {
  const navigate = useNavigate();
  const [usedCoupons, setUsedCoupons] = useAdminList("hotel-used-coupons", defaultMockHotelUsedCoupons);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Custom Styles
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    splitLayout: {
      display: 'flex',
      gap: '24px',
      width: '100%'
    },
    mainContent: (hasSidebar) => ({
      width: hasSidebar ? '68%' : '100%',
      transition: 'width 0.3s ease'
    }),
    sidebarPanel: {
      width: '32%',
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
      height: 'fit-content',
      position: 'sticky',
      top: '24px'
    },
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
      padding: '14px 24px',
      background: 'linear-gradient(135deg, #A51C49 0%, #741032 100%)',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: '0.8rem',
      fontWeight: 700,
      color: '#FFFFFF',
      textAlign: 'left',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '14px 24px',
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
    bookingTypePill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '8px',
      background: 'rgba(139, 92, 246, 0.1)',
      color: '#8B5CF6',
      fontWeight: 600,
      fontSize: '0.75rem'
    },
    statusPill: (status) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '8px',
      background: status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(217, 48, 37, 0.1)',
      color: status === 'Active' ? '#10B981' : '#D93027',
      fontWeight: 600,
      fontSize: '0.75rem'
    }),
    eyeBtn: (active) => ({
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      border: `1px solid ${active ? 'rgba(216, 27, 96, 0.3)' : colors.border}`,
      background: active ? 'rgba(216, 27, 96, 0.1)' : colors.panel,
      color: active ? colors.primary : colors.textSecondary,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    }),
    timeline: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      marginTop: '16px'
    },
    timelineStep: {
      display: 'flex',
      gap: '16px',
      position: 'relative'
    },
    timelineLine: {
      position: 'absolute',
      left: '11px',
      top: '24px',
      bottom: '-16px',
      width: '2px',
      background: '#E2E8F0'
    },
    timelineDot: (active) => ({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '2px solid #FFFFFF',
      background: active ? colors.primary : '#E2E8F0',
      boxShadow: active ? `0 0 0 4px rgba(216, 27, 96, 0.15)` : 'none',
      zIndex: 1
    }),
    timelineContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    timelineTitle: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: colors.textPrimary
    },
    timelineTime: {
      fontSize: '0.75rem',
      color: '#94A3B8'
    }
  };

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

  // CRUD States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [addForm, setAddForm] = useState({
    couponCode: "",
    userName: "",
    userEmail: "",
    userPhone: "",
    bookingId: "",
    cpnType: "Percentage Discount",
    cpnValue: "",
    cpnAmount: "",
    totalFare: "",
    bookingStatus: "Active",
    usedFrom: "Website",
    paymentStatus: "Paid",
    discountType: "Percentage (%)",
    route: "Mumbai Gateway Hotel",
    createdBy: "Admin"
  });

  const handleApplyQuickFilter = (type) => {
    setActiveQuickFilter(type);
    if (type === "All Coupons") {
      setFilterStatus("All Status");
      setFilterDiscountType("All Types");
    } else if (type === "Active") {
      setFilterStatus("Active");
    } else if (type === "Expired") {
      setFilterStatus("Expired");
    } else if (type === "Percentage") {
      setFilterDiscountType("Percentage (%)");
    } else if (type === "Flat Amount") {
      setFilterDiscountType("Flat Amount (₹)");
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

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return usedCoupons.filter((record) => {
      if (filterSearch && !record.couponCode.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterCouponCode && !record.couponCode.toLowerCase().includes(filterCouponCode.toLowerCase())) return false;
      if (filterCouponType !== "All Types" && record.cpnType !== filterCouponType) return false;
      if (filterDiscountType !== "All Types" && record.discountType !== filterDiscountType) return false;
      if (filterDiscountValue && Number(record.cpnValue) !== Number(filterDiscountValue)) return false;
      if (filterRoute !== "All Routes" && record.route !== filterRoute) return false;
      if (filterStatus !== "All Status" && record.bookingStatus !== filterStatus) return false;
      if (filterCreatedBy !== "All" && record.createdBy !== filterCreatedBy) return false;
      
      return true;
    });
  }, [usedCoupons, filterSearch, filterCouponCode, filterCouponType, filterDiscountType, filterDiscountValue, filterRoute, filterStatus, filterCreatedBy]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalCount = filteredRecords.length;
    const totalSaved = filteredRecords.reduce((sum, r) => sum + r.cpnAmount, 0);
    const activeCount = filteredRecords.filter(r => r.bookingStatus === "Active").length;
    const expiredCount = filteredRecords.filter(r => r.bookingStatus === "Expired").length;

    return { totalCount, totalSaved, activeCount, expiredCount };
  }, [filteredRecords]);

  // Add / Edit / Delete handlers
  const handleSaveAdd = () => {
    if (!addForm.couponCode || !addForm.userName || !addForm.totalFare) {
      alert("Please fill in required fields.");
      return;
    }
    const newRecord = {
      ...addForm,
      id: getNextNumericId(usedCoupons, 101),
      cpnValue: Number(addForm.cpnValue),
      cpnAmount: Number(addForm.cpnAmount || addForm.cpnValue),
      totalFare: Number(addForm.totalFare),
      usedDate: new Date().toISOString()
    };
    setUsedCoupons([newRecord, ...usedCoupons]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editRecord.couponCode || !editRecord.userName) return;
    setUsedCoupons(usedCoupons.map(r => r.id === editRecord.id ? editRecord : r));
    if (selectedRecord && selectedRecord.id === editRecord.id) {
      setSelectedRecord(editRecord);
    }
    setIsEditOpen(false);
  };

  const handleDeleteRecord = (id) => {
    if (confirm("Delete this used coupon record?")) {
      setUsedCoupons(usedCoupons.filter(r => r.id !== id));
      if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  const handleExport = () => {
    const headersList = ["ID", "Coupon Code", "User Name", "Email", "Booking ID", "Discount", "Booking Amount", "Saved Amount", "Used Date", "Status"];
    const rows = filteredRecords.map(r => [
      r.id, r.couponCode, r.userName, r.userEmail, r.bookingId, r.cpnValue, r.totalFare, r.cpnAmount, formatCouponDateTime(r.usedDate), r.bookingStatus
    ]);
    const csv = [headersList, ...rows].map(row => row.map(cell => csvCell(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-used-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: '36px' }}>B2C Hotel Used Coupon List</h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Manage all B2C hotel coupons and offers</p>
        </div>
        <div style={styles.actionGroup}>
          <button 
            onClick={() => setIsAddOpen(true)}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'linear-gradient(135deg, #A51C49 0%, #741032 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px rgba(165, 28, 73, 0.15)'
            }}
          >
            <Plus size={16} /> Generate Coupon
          </button>
          <button 
            onClick={() => navigate('/admin/b2c-hotel/coupon-list')}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px rgba(79, 70, 229, 0.15)'
            }}
          >
            <Tag size={16} /> Coupon List
          </button>
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
              background: isFilterOpen ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isFilterOpen ? '0 4px 6px rgba(220, 38, 38, 0.15)' : '0 4px 6px rgba(37, 99, 235, 0.15)'
            }}
          >
            <FilterIcon size={16} /> {isFilterOpen ? 'Hide Filter' : 'Filter'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={styles.statsGrid}>
        {/* Card 1: Total Coupons */}
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#D81B60', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Coupons</span>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: '4px 0' }}>{stats.totalCount + 122}</span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>All hotel coupons</span>
          </div>
          <div style={styles.statIconWrapper("rgba(216, 27, 96, 0.08)", "#D81B60")}>
            <Tag size={20} />
          </div>
        </div>

        {/* Card 2: Active Coupons */}
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Active Coupons</span>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: '4px 0' }}>{stats.activeCount + 75}</span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Currently active</span>
          </div>
          <div style={styles.statIconWrapper("rgba(37, 99, 235, 0.08)", "#2563EB")}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Expired Coupons */}
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Expired Coupons</span>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: '4px 0' }}>{stats.expiredCount + 29}</span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Already expired</span>
          </div>
          <div style={styles.statIconWrapper("rgba(234, 88, 12, 0.08)", "#EA580C")}>
            <Clock size={20} />
          </div>
        </div>

        {/* Card 4: Total Redemptions */}
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Redemptions</span>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: '4px 0' }}>{1253 + stats.totalCount}</span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Total times used</span>
          </div>
          <div style={styles.statIconWrapper("rgba(139, 92, 246, 0.08)", "#8B5CF6")}>
            <Users size={20} />
          </div>
        </div>

        {/* Card 5: Total Savings */}
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Savings</span>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: '4px 0' }}>₹{(245480 + stats.totalSaved).toLocaleString()}</span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Total amount saved</span>
          </div>
          <div style={styles.statIconWrapper("rgba(16, 185, 129, 0.08)", "#10B981")}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div style={styles.filterPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Search Coupons</span>
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
                <option value="Referral Coupon">Referral Coupon</option>
                <option value="Seasonal Offer">Seasonal Offer</option>
                <option value="Weekend Offer">Weekend Offer</option>
                <option value="Limited Time Offer">Limited Time Offer</option>
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
                placeholder="Enter min. amount" 
                value={filterMinAmount}
                onChange={e => setFilterMinAmount(e.target.value)}
                style={styles.filterInput} 
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Max. Discount Amount</span>
              <input 
                type="number" 
                placeholder="Enter max. discount" 
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <button 
              onClick={handleResetFilters}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Reset
            </button>
            <button 
              onClick={() => setIsFilterOpen(false)}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'linear-gradient(135deg, #A51C49 0%, #741032 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 6px rgba(165, 28, 73, 0.15)'
              }}
            >
              <FilterIcon size={14} />
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div style={styles.quickFilterContainer}>
        {["All Coupons", "Active", "Expired", "Percentage", "Flat Amount"].map((name) => (
          <button 
            key={name}
            onClick={() => handleApplyQuickFilter(name)}
            style={styles.quickFilterChip(activeQuickFilter === name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Main Split Screen Area */}
      <div style={styles.splitLayout}>
        {/* Main Content (Table) */}
        <div style={styles.mainContent(!!selectedRecord)}>
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Coupon Code</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Booking ID</th>
                  <th style={styles.th}>Booking Type</th>
                  <th style={styles.th}>Discount</th>
                  <th style={styles.th}>Booking Amount</th>
                  <th style={styles.th}>Saved Amount</th>
                  <th style={styles.th}>Used Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary }}>
                      No used coupons found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.id}</td>
                      <td style={styles.td}>
                        <span style={styles.couponCodePill}>{record.couponCode}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>{record.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{record.userEmail}</div>
                      </td>
                      <td style={{ ...styles.td, color: colors.primary, fontWeight: 600 }}>{record.bookingId}</td>
                      <td style={styles.td}>
                        <span style={styles.bookingTypePill}>
                          Hotel
                        </span>
                      </td>
                      <td style={styles.td}>{record.cpnValue}{record.discountType === "Percentage (%)" ? "% OFF" : " OFF"}</td>
                      <td style={styles.td}>{formatCurrency(record.totalFare)}</td>
                      <td style={{ ...styles.td, color: '#10B981', fontWeight: 600 }}>{formatCurrency(record.cpnAmount)}</td>
                      <td style={styles.td}>{formatCouponDateTime(record.usedDate)}</td>
                      <td style={styles.td}>
                        <span style={styles.statusPill(record.bookingStatus)}>{record.bookingStatus}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                            style={styles.eyeBtn(selectedRecord?.id === record.id)}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setEditRecord(record);
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
                            title="Edit Record"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecord(record.id)}
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
                            title="Delete Record"
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
              itemName="used coupons"
            />
          </div>
        </div>

        {/* Sidebar Details Drawer */}
        {selectedRecord && (
          <div style={styles.sidebarPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: colors.textPrimary }}>Coupon Usage Details</span>
              <button 
                onClick={() => setSelectedRecord(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper details */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: colors.slateBg, borderRadius: '12px', marginBottom: '20px' }}>
              <div>
                <span style={styles.couponCodePill}>{selectedRecord.couponCode}</span>
                <div style={{ fontSize: '0.85rem', color: colors.textSecondary, marginTop: '6px' }}>Summer Special Offer</div>
              </div>
              <span style={styles.statusPill(selectedRecord.bookingStatus)}>{selectedRecord.bookingStatus}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking & User Details</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>User Name</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{selectedRecord.userName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Email</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{selectedRecord.userEmail}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Mobile Number</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{selectedRecord.userPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Booking ID</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{selectedRecord.bookingId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Booking Type</span>
                <span style={styles.bookingTypePill}>Hotel</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Booking Amount</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{formatCurrency(selectedRecord.totalFare)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Discount Amount</span>
                <span style={{ fontWeight: 600, color: '#D81B60' }}>{formatCurrency(selectedRecord.cpnAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
                <span style={{ fontWeight: 700, color: colors.textPrimary }}>Final Paid Amount</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{formatCurrency(selectedRecord.totalFare - selectedRecord.cpnAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Used Date & Time</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{formatCouponDateTime(selectedRecord.usedDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: colors.textSecondary }}>Used From</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>{selectedRecord.usedFrom}</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: colors.textPrimary, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coupon Timeline</div>
              <div style={styles.timeline}>
                <div style={styles.timelineStep}>
                  <div style={styles.timelineLine} />
                  <div style={styles.timelineDot(true)} />
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineTitle}>Created</span>
                    <span style={styles.timelineTime}>20 Jul 2026, 09:00 AM</span>
                  </div>
                </div>

                <div style={styles.timelineStep}>
                  <div style={styles.timelineLine} />
                  <div style={styles.timelineDot(true)} />
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineTitle}>Published</span>
                    <span style={styles.timelineTime}>20 Jul 2026, 09:30 AM</span>
                  </div>
                </div>

                <div style={styles.timelineStep}>
                  <div style={styles.timelineLine} />
                  <div style={styles.timelineDot(true)} />
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineTitle}>Applied</span>
                    <span style={styles.timelineTime}>{formatCouponDateTime(selectedRecord.usedDate)}</span>
                  </div>
                </div>

                <div style={styles.timelineStep}>
                  <div style={styles.timelineDot(selectedRecord.bookingStatus === "Active")} />
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineTitle}>Coupon Redeemed</span>
                    <span style={styles.timelineTime}>{formatCouponDateTime(selectedRecord.usedDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', width: '500px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px 0' }}>Add Used Coupon</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="text" placeholder="Coupon Code" value={addForm.couponCode}
                onChange={e => setAddForm({...addForm, couponCode: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="User Name" value={addForm.userName}
                onChange={e => setAddForm({...addForm, userName: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="Email" value={addForm.userEmail}
                onChange={e => setAddForm({...addForm, userEmail: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="Booking ID" value={addForm.bookingId}
                onChange={e => setAddForm({...addForm, bookingId: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="number" placeholder="Discount Value" value={addForm.cpnValue}
                onChange={e => setAddForm({...addForm, cpnValue: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="number" placeholder="Booking Amount" value={addForm.totalFare}
                onChange={e => setAddForm({...addForm, totalFare: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsAddOpen(false)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveAdd} style={{ padding: '8px 16px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', width: '500px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px 0' }}>Edit Used Coupon</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="text" placeholder="Coupon Code" value={editRecord.couponCode}
                onChange={e => setEditRecord({...editRecord, couponCode: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="User Name" value={editRecord.userName}
                onChange={e => setEditRecord({...editRecord, userName: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="Email" value={editRecord.userEmail}
                onChange={e => setEditRecord({...editRecord, userEmail: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="text" placeholder="Booking ID" value={editRecord.bookingId}
                onChange={e => setEditRecord({...editRecord, bookingId: e.target.value})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="number" placeholder="Discount Value" value={editRecord.cpnValue}
                onChange={e => setEditRecord({...editRecord, cpnValue: Number(e.target.value)})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <input 
                type="number" placeholder="Booking Amount" value={editRecord.totalFare}
                onChange={e => setEditRecord({...editRecord, totalFare: Number(e.target.value)})}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsEditOpen(false)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: '8px 16px', background: colors.primary, color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
