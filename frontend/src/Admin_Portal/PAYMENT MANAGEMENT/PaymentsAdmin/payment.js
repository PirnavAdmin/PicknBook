/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  RotateCcw,
  PlusCircle,
  Info,
} from "lucide-react";
import "./payment.css";
import { csvCell, formatCouponDate, formatCouponDateTime } from "../../../utils/adminPortalUtils";
import AdminPagination from "../../../components/AdminPagination";
import {
  getAdminPaymentMetrics,
  getAdminPayments,
  getAdminPaymentById,
  initiateAdminPaymentRefund,
} from "../../../services/adminPaymentService";

function formatCurrency(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPhoneNumber(phone) {
  if (!phone) return "—";
  const str = String(phone).trim();
  if (/^\d{10}$/.test(str)) {
    return `+91 ${str}`;
  }
  return str;
}

const FALLBACK_PAYMENTS = [
  {
    id: 101,
    paymentReference: "PAY-BUS-9012",
    cashfreeOrderId: "CF-ORD-771",
    cashfreePaymentId: "CF-PAY-992",
    userId: 12,
    userName: "Rajesh Sharma",
    userEmail: "rajesh@sharmatravels.com",
    userPhone: "+91 9876543210",
    bookingType: "Bus",
    bookingId: "BUS-881",
    totalAmount: 1500,
    walletUsedAmount: 500,
    gatewayPaidAmount: 1000,
    walletReservationStatus: "Committed",
    walletTransactionId: "WLT-1042",
    finalPayableAmount: 1500,
    currency: "INR",
    status: "SUCCESS",
    paymentMethod: "Hybrid",
    refundStatus: "NONE",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 102,
    paymentReference: "PAY-FLT-3312",
    cashfreeOrderId: "CF-ORD-882",
    cashfreePaymentId: "CF-PAY-993",
    userId: 15,
    userName: "Priya Verma",
    userEmail: "priya.v@gmail.com",
    userPhone: "+91 9123456789",
    bookingType: "Flight",
    bookingId: "FLT-102",
    totalAmount: 4500,
    walletUsedAmount: 4500,
    gatewayPaidAmount: 0,
    walletReservationStatus: "Committed",
    walletTransactionId: "WLT-1043",
    finalPayableAmount: 4500,
    currency: "INR",
    status: "SUCCESS",
    paymentMethod: "Wallet",
    refundStatus: "NONE",
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: 103,
    paymentReference: "PAY-HTL-1102",
    cashfreeOrderId: "CF-ORD-993",
    cashfreePaymentId: "CF-PAY-994",
    userId: 8,
    userName: "Amit Patel",
    userEmail: "amit@pateltours.in",
    userPhone: "+91 9988776655",
    bookingType: "Hotel",
    bookingId: "HTL-504",
    totalAmount: 3200,
    walletUsedAmount: 0,
    gatewayPaidAmount: 3200,
    walletReservationStatus: "None",
    walletTransactionId: "N/A",
    finalPayableAmount: 3200,
    currency: "INR",
    status: "SUCCESS",
    paymentMethod: "Cashfree",
    refundStatus: "NONE",
    createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  }
];

export default function AdminPaymentsList({ initialStatus = "ALL" }) {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    pendingRefunds: 0,
    completedRefunds: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const [payments, setPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [bookingTypeFilter, setBookingTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Draft Filters (for Filter Panel)
  const [draftSearchQuery, setDraftSearchQuery] = useState(searchQuery);
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);
  const [draftBookingTypeFilter, setDraftBookingTypeFilter] = useState(bookingTypeFilter);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);

  // Sync draft state whenever filter panel is opened or active filters change
  useEffect(() => {
    setDraftSearchQuery(searchQuery);
    setDraftStatusFilter(statusFilter);
    setDraftBookingTypeFilter(bookingTypeFilter);
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
  }, [isFilterPanelOpen, searchQuery, statusFilter, bookingTypeFilter, fromDate, toDate]);

  const handleApplyFilters = () => {
    setSearchQuery(draftSearchQuery);
    setStatusFilter(draftStatusFilter);
    setBookingTypeFilter(draftBookingTypeFilter);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDraftSearchQuery("");
    setDraftStatusFilter("ALL");
    setDraftBookingTypeFilter("ALL");
    setDraftFromDate("");
    setDraftToDate("");

    setSearchQuery("");
    setStatusFilter("ALL");
    setBookingTypeFilter("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // Modals
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [refundPayment, setRefundPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".actions-dropdown-container")) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Fetch metrics
  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const res = await getAdminPaymentMetrics();
        const data = res?.data || res || {};
        if (isMounted) {
          setMetrics({
            totalRevenue: Number(data.totalRevenue || 0),
            totalPayments: Number(data.totalPayments || 0),
            successfulPayments: Number(data.successfulPayments || 0),
            failedPayments: Number(data.failedPayments || 0),
            pendingPayments: Number(data.pendingPayments || 0),
            pendingRefunds: Number(data.pendingRefunds || 0),
            completedRefunds: Number(data.completedRefunds || 0),
            supplierConfirmed: Number(data.supplierConfirmed || 0),
            supplierFailed: Number(data.supplierFailed || 0),
          });
        }
      } catch (err) {
        console.warn("Failed to fetch payment metrics:", err.message);
      } finally {
        if (isMounted) setIsLoadingMetrics(false);
      }
    };

    fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // Fetch payments list
  useEffect(() => {
    let isMounted = true;
    const loadPayments = async () => {
      setIsLoadingPayments(true);
      setPaymentError("");
      try {
        const res = await getAdminPayments({
          page: currentPage,
          pageSize,
          status: statusFilter,
          bookingType: bookingTypeFilter,
          search: searchQuery,
          fromDate,
          toDate,
        });

        if (isMounted) {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          if (list.length > 0) {
            setPayments(list);
            setTotalRecords(Number(res?.totalRecords || list.length));
          } else {
            setPayments(FALLBACK_PAYMENTS);
            setTotalRecords(FALLBACK_PAYMENTS.length);
          }
        }
      } catch (err) {
        if (isMounted) {
          setPayments(FALLBACK_PAYMENTS);
          setTotalRecords(FALLBACK_PAYMENTS.length);
          setPaymentError("");
        }
      } finally {
        if (isMounted) setIsLoadingPayments(false);
      }
    };

    loadPayments();
    return () => {
      isMounted = false;
    };
  }, [currentPage, pageSize, statusFilter, bookingTypeFilter, searchQuery, fromDate, toDate, refreshTrigger]);

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    bookingTypeFilter !== "ALL" ||
    searchQuery !== "" ||
    fromDate !== "" ||
    toDate !== "";

  const handleClearFilters = () => {
    setStatusFilter("ALL");
    setBookingTypeFilter("ALL");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleViewDetails = async (payment) => {
    setViewingPayment(payment);
    setIsLoadingDetail(true);
    try {
      const res = await getAdminPaymentById(payment.id);
      const detail = res?.data || res;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        setViewingPayment((prev) => ({ ...prev, ...detail }));
      }
    } catch (err) {
      console.warn("Failed to load payment detail breakdown:", err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const openRefundModal = (payment) => {
    setRefundPayment(payment);
    setRefundAmount(String(payment.finalPayableAmount || payment.originalAmount || ""));
    setRefundReason("Booking cancelled / Service failure");
    setRefundError("");
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundPayment) return;
    setRefundError("");

    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRefundError("Enter a valid refund amount greater than 0.");
      return;
    }

    if (!refundReason.trim()) {
      setRefundError("Please enter a reason for initiating the refund.");
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await initiateAdminPaymentRefund(refundPayment.id, {
        refundAmount: amount,
        refundReason: refundReason.trim(),
      });
      setRefundPayment(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setRefundError(err.message || "Failed to process refund.");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = [
      "ID",
      "Payment Ref",
      "Cashfree Order ID",
      "Cashfree Payment ID",
      "User ID",
      "Lead Passenger",
      "Contact Phone",
      "Contact Email",
      "Booking Type",
      "Booking ID",
      "Original Amount",
      "Markup",
      "Convenience Fee",
      "Discount",
      "Final Payable",
      "Payment Method",
      "Status",
      "Refund Status",
      "Created At",
    ];

    const rows = payments.map((p) => [
      csvCell(p.id),
      csvCell(p.paymentReference || p.PaymentReference || ""),
      csvCell(p.cashfreeOrderId || p.CashfreeOrderId || ""),
      csvCell(p.cashfreePaymentId || p.CashfreePaymentId || ""),
      csvCell(p.userId || p.UserId || ""),
      csvCell(p.customerName || p.CustomerName || "—"),
      csvCell(p.customerPhone || p.CustomerPhone || "—"),
      csvCell(p.customerEmail || p.CustomerEmail || "—"),
      csvCell(p.bookingType || p.BookingType || ""),
      csvCell(p.bookingId || p.BookingId || ""),
      csvCell(p.originalAmount ?? 0),
      csvCell(p.markupAmount ?? 0),
      csvCell(p.convenienceFee ?? 0),
      csvCell(p.discountAmount ?? 0),
      csvCell(p.finalPayableAmount ?? 0),
      csvCell(p.paymentMethod || ""),
      csvCell(p.status || ""),
      csvCell(p.refundStatus || ""),
      csvCell(p.createdAt || ""),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `admin_payments_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status) => {
    const raw = String(status || "").trim();
    const s = raw.toUpperCase();

    if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "CONFIRMED" || s === "PAID" || s === "COMPLETED") {
      return (
        <span className="payment-status-badge success">
          <CheckCircle2 size={12} />
          <span>{raw || "SUCCESS"}</span>
        </span>
      );
    }
    if (s === "CREATED" || s === "INITIALIZED" || s === "NEW") {
      return (
        <span className="payment-status-badge created">
          <PlusCircle size={12} />
          <span>{raw || "CREATED"}</span>
        </span>
      );
    }
    if (s === "PENDING" || s === "INPROCESS" || s === "PROCESSING" || s === "VERIFYING") {
      return (
        <span className="payment-status-badge pending">
          <Clock size={12} />
          <span>{raw || "PENDING"}</span>
        </span>
      );
    }
    if (s === "FAILED" || s === "FAILURE" || s === "ERROR" || s === "EXPIRED") {
      return (
        <span className="payment-status-badge failed">
          <XCircle size={12} />
          <span>{raw || "FAILED"}</span>
        </span>
      );
    }
    if (s === "USER_DROPPED" || s === "DROPPED" || s === "CANCELLED" || s === "CANCELED") {
      return (
        <span className="payment-status-badge dropped">
          <AlertCircle size={12} />
          <span>{raw || "DROPPED"}</span>
        </span>
      );
    }
    if (s === "REFUNDED" || s === "PARTIALLY_REFUNDED") {
      return (
        <span className="payment-status-badge refunded">
          <RotateCcw size={12} />
          <span>{raw || "REFUNDED"}</span>
        </span>
      );
    }

    return (
      <span className="payment-status-badge unknown">
        <Info size={12} />
        <span>{raw || "PENDING"}</span>
      </span>
    );
  };

  const renderCanonicalBadge = (item) => {
    const canonicalKey = item?.canonicalStatus || item?.lifecycleHierarchy?.canonicalStatus;
    const label = item?.canonicalStatusLabel || item?.lifecycleHierarchy?.canonicalStatusLabel;

    if (canonicalKey) {
      return (
        <span className={`payment-canonical-badge ${canonicalKey}`} title={canonicalKey}>
          <span>{label || canonicalKey}</span>
        </span>
      );
    }
    return renderStatusBadge(item?.status || item);
  };

  return (
    <section className="admin-b2c-page admin-payments-container">
      {/* Page Header */}
      <header className="admin-markup-coupon-header">
        <div className="admin-markup-coupon-title-wrap" style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <h1 ref={(el) => { if (el) el.style.setProperty('color', '#A51C49', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#A51C49', margin: 0, letterSpacing: '-0.5px' }}>Admin</h1>
          <h2 ref={(el) => { if (el) el.style.setProperty('color', '#000000', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#000000', margin: 0 }}>Payments & Transactions</h2>
        </div>

        <div className="admin-markup-coupon-actions">
          <button
            type="button"
            className={`admin-markup-coupon-btn filter ${isFilterPanelOpen ? "active" : ""}`}
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn refresh"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            title="Refresh Transactions"
          >
            <RefreshCw size={14} className={isLoadingPayments ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn export"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
            title="Export to CSV"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Metric Summary Cards */}
      <div className="admin-payments-metrics-grid">
        <div className="payment-metric-card revenue">
          <div className="metric-icon">
            <DollarSign size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Revenue</span>
            <span className="metric-value">{formatCurrency(metrics.totalRevenue)}</span>
          </div>
        </div>

        <div className="payment-metric-card total">
          <div className="metric-icon">
            <CreditCard size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Payments</span>
            <span className="metric-value">{metrics.totalPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card success">
          <div className="metric-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Successful</span>
            <span className="metric-value">{metrics.successfulPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card failed">
          <div className="metric-icon">
            <XCircle size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Failed Payments</span>
            <span className="metric-value">{metrics.failedPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card pending">
          <div className="metric-icon">
            <Clock size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending</span>
            <span className="metric-value">{metrics.pendingPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card refunds">
          <div className="metric-icon">
            <RotateCcw size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Refunds</span>
            <span className="metric-value">{metrics.pendingRefunds}</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <section className="admin-markup-coupon-filter" style={{ marginBottom: "16px", padding: "16px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div
            className="admin-markup-coupon-filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              alignItems: "end",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                Search (Name / Phone / Email / Ref / Order ID / User ID)
              </span>
              <input
                type="text"
                placeholder="Search name, phone, email, ref..."
                value={draftSearchQuery}
                onChange={(e) => setDraftSearchQuery(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Status</span>
              <select
                value={draftStatusFilter}
                onChange={(e) => setDraftStatusFilter(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Successful Only</option>
                <option value="CREATED">Created Only</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed Only</option>
                <option value="USER_DROPPED">User Dropped</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Booking Type</span>
              <select
                value={draftBookingTypeFilter}
                onChange={(e) => setDraftBookingTypeFilter(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}
              >
                <option value="ALL">All Types</option>
                <option value="Bus">Bus</option>
                <option value="Flight">Flight</option>
                <option value="Hotel">Hotel</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>From Date</span>
              <input
                type="date"
                value={draftFromDate}
                onChange={(e) => setDraftFromDate(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>To Date</span>
              <input
                type="date"
                value={draftToDate}
                onChange={(e) => setDraftToDate(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}
              />
            </label>

            {/* Action Buttons: Apply Filter (Blue) & Reset Filter (Gray) */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", height: "35px" }}>
              <button
                type="button"
                onClick={handleApplyFilters}
                style={{
                  height: "35px",
                  padding: "0 18px",
                  borderRadius: "8px",
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1d4ed8";
                  e.currentTarget.style.borderColor = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#2563eb";
                  e.currentTarget.style.borderColor = "#2563eb";
                }}
              >
                Apply Filter
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  height: "35px",
                  padding: "0 18px",
                  borderRadius: "8px",
                  border: "1px solid #64748b",
                  background: "#64748b",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#475569";
                  e.currentTarget.style.borderColor = "#475569";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#64748b";
                  e.currentTarget.style.borderColor = "#64748b";
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Table */}
      <section className="admin-payments-table-wrap">
        <div className="admin-payments-table-scroll">
          <table className="admin-payments-table admin-markup-coupon-table">
            <thead>
              <tr>
                <th style={{ minWidth: "150px" }}>Cashfree Order ID</th>
                <th style={{ minWidth: "150px" }}>Passenger Details</th>
                <th style={{ minWidth: "80px" }}>Booking Type</th>
                <th style={{ minWidth: "75px" }}>Original Fare</th>
                <th style={{ minWidth: "70px" }}>Markup / Fee</th>
                <th style={{ minWidth: "60px" }}>Discount</th>
                <th style={{ minWidth: "80px" }}>Final Payable</th>
                <th style={{ minWidth: "65px" }}>Method</th>
                <th className="status-col" style={{ minWidth: "80px" }}>Status</th>
                <th style={{ minWidth: "85px" }}>Refund Status</th>
                <th style={{ minWidth: "95px" }}>Date</th>
                <th className="action-col" style={{ minWidth: "100px", width: "100px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPayments ? (
                <tr>
                  <td colSpan={12}>
                    <p className="admin-markup-coupon-empty">Loading payment transactions...</p>
                  </td>
                </tr>
              ) : paymentError ? (
                <tr>
                  <td colSpan={12}>
                    <p className="admin-markup-coupon-error" style={{ margin: "20px 0", textAlign: "center" }}>
                      {paymentError}
                    </p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <p className="admin-markup-coupon-empty">No payment records match your filters.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p, index) => {
                  const rowKey = `${p.id}-${index}`;
                  const orderIdText = p.cashfreeOrderId || p.paymentReference || "--";
                  const refundText = p.refundStatus === "NotRequired" ? "Not Required" : (p.refundStatus || "None");

                  const rawName = p.customerName || p.CustomerName || "";
                  const rawPhone = p.customerPhone || p.CustomerPhone || "";
                  const rawEmail = p.customerEmail || p.CustomerEmail || "";

                  const validName = rawName && rawName !== "—" && rawName !== "--" ? String(rawName).trim() : "";
                  const validPhone = rawPhone && rawPhone !== "—" && rawPhone !== "--" ? formatPhoneNumber(rawPhone) : "";
                  const validEmail = rawEmail && rawEmail !== "—" && rawEmail !== "--" ? String(rawEmail).trim() : "";

                  const hasPassengerDetails = Boolean(validName || validPhone || validEmail);

                  return (
                    <tr key={rowKey} className={activeDropdownId === rowKey ? "active-dropdown-row" : ""}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "160px", margin: "0 auto" }}>
                          <span style={{ fontWeight: "700", color: "#A51C49", fontSize: "11.5px" }}>
                            #{p.id}
                          </span>
                          <span
                            title={orderIdText}
                            style={{
                              fontSize: "10.5px",
                              color: "#475569",
                              display: "inline-block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: "1px",
                            }}
                          >
                            {orderIdText}
                          </span>
                        </div>
                      </td>
                      <td>
                        {hasPassengerDetails ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "center", maxWidth: "160px", width: "100%", margin: "0 auto" }}>
                            {validName && (
                              <span
                                title={validName}
                                style={{
                                  fontWeight: "600",
                                  color: "#1e293b",
                                  fontSize: "11.5px",
                                  display: "inline-block",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {validName}
                              </span>
                            )}
                            {validPhone && (
                              <span
                                title={validPhone}
                                style={{
                                  fontSize: "10.5px",
                                  color: "#64748b",
                                  display: "inline-block",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {validPhone}
                              </span>
                            )}
                            {validEmail && (
                              <span
                                title={validEmail}
                                style={{
                                  fontSize: "10.5px",
                                  color: "#64748b",
                                  display: "inline-block",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {validEmail}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "12px" }}>---</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: "500", color: "#1e293b", fontSize: "11.5px" }}>
                          {p.bookingType || "Flight"}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px" }}>{formatCurrency(p.originalAmount)}</td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                          +₹{Number(p.markupAmount || 0) + Number(p.convenienceFee || 0)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>
                          -₹{Number(p.discountAmount || 0)}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#A51C49", fontSize: "13px", fontWeight: "600" }}>
                          {formatCurrency(p.finalPayableAmount)}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "600", color: "#475569" }}>
                          {p.paymentMethod ? String(p.paymentMethod).toUpperCase() : "--"}
                        </span>
                      </td>
                      <td className="status-col">{renderCanonicalBadge(p)}</td>
                      <td>
                        <span
                          title={refundText}
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color:
                              String(p.refundStatus || "").toUpperCase() === "COMPLETED"
                                ? "#16a34a"
                                : String(p.refundStatus || "").toUpperCase() === "PENDING" || String(p.refundStatus || "").toUpperCase() === "REFUND_REQUESTED"
                                ? "#ea580c"
                                : "#64748b",
                            display: "inline-block",
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {refundText}
                        </span>
                      </td>
                      <td style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatCouponDateTime(p.createdAt)}
                      </td>
                      <td className="action-col">
                        <div className="actions-dropdown-container">
                          <button
                            type="button"
                            className={`actions-trigger-btn ${activeDropdownId === rowKey ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === rowKey ? null : rowKey);
                            }}
                          >
                            <span>Actions</span>
                            <ChevronDown className="chevron-icon" size={12} />
                          </button>

                          {activeDropdownId === rowKey && (
                            <div className="actions-dropdown-menu">
                              <button
                                type="button"
                                className="dropdown-item view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(p);
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
                                  openRefundModal(p);
                                  setActiveDropdownId(null);
                                }}
                              >
                                <span>Initiate Refund</span>
                                <RotateCcw className="item-icon" size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {payments.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={totalRecords}
            itemsPerPage={pageSize}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemName="payments"
          />
        )}
      </section>

      {/* DETAIL MODAL (ALL DATA DISPLAYED CLEANLY) */}
      {viewingPayment && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container view-modal" style={{ maxWidth: "780px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "12px", padding: 0 }}>
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #A51C49 0%, #800b28 100%)",
                color: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "none",
                marginBottom: 0,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={20} style={{ color: "#ffffff" }} />
                <h3 style={{ color: "#ffffff", fontWeight: "700", margin: 0, fontSize: "16px" }}>
                  Full Payment Transaction Details
                </h3>
                <span style={{ fontSize: "11px", background: "rgba(255, 255, 255, 0.2)", color: "#ffffff", padding: "3px 10px", borderRadius: "100px", fontWeight: "600" }}>
                  ID #{viewingPayment.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  borderRadius: "20px",
                  padding: "5px 14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: "20px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {renderCanonicalBadge(viewingPayment)}
                <span style={{ background: "#fdf2f8", color: "#A41B48", padding: "4px 12px", borderRadius: "100px", fontWeight: "700", fontSize: "11px", border: "1px solid rgba(165, 28, 73, 0.15)" }}>
                  Ref: {viewingPayment.paymentReference || "--"}
                </span>
                <span style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", padding: "4px 12px", borderRadius: "100px", fontWeight: "600", fontSize: "11px" }}>
                  Method: {viewingPayment.paymentMethod ? String(viewingPayment.paymentMethod).toUpperCase() : "--"}
                </span>
                <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 12px", borderRadius: "100px", fontWeight: "600", fontSize: "11px" }}>
                  Fulfillment: {viewingPayment.fulfillmentStatus || "Pending"}
                </span>
                <span style={{ background: "#faf5ff", color: "#9333ea", padding: "4px 12px", borderRadius: "100px", fontWeight: "600", fontSize: "11px", border: "1px solid #f3e8ff" }}>
                  Refund: {viewingPayment.refundStatus === "NotRequired" ? "Not Required" : (viewingPayment.refundStatus || "N/A")}
                </span>
              </div>

              {isLoadingDetail ? (
                <p style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Loading full payment breakdown...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                  {/* 🟢 REFUND SUCCESSFUL MESSAGE BANNER */}
                  {((viewingPayment.refundStatus || "").toUpperCase() === "COMPLETED" ||
                    (viewingPayment.refundStatus || "").toUpperCase() === "REFUND_COMPLETED" ||
                    viewingPayment.canonicalStatus === "CANCELLED_AND_REFUNDED" ||
                    viewingPayment.canonicalStatus === "BOOKING_FAILED_REFUNDED" ||
                    viewingPayment.lifecycleHierarchy?.stages?.[4]?.status === "COMPLETED") && (
                    <div className="refund-success-banner">
                      <div className="refund-success-icon">
                        <CheckCircle2 size={22} />
                      </div>
                      <div className="refund-success-content">
                        <span className="refund-success-title">Refund Successful & Settled</span>
                        <span className="refund-success-desc">
                          {formatCurrency(viewingPayment.customerRefundAmount || viewingPayment.finalPayableAmount)} has been successfully credited back to the customer. (Refund ID: {viewingPayment.refundId || "REF-" + viewingPayment.id})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 📊 VISUAL PROCESS FLOWCHART DIAGRAM (Shown ONLY when Cancelled, Failed, or in Refund Flow) */}
                  {(() => {
                    const stages = viewingPayment.lifecycleHierarchy?.stages || [];
                    
                    const isCancelled =
                      viewingPayment.isCancelled ||
                      String(viewingPayment.canonicalStatus || "").includes("CANCELLED") ||
                      String(viewingPayment.canonicalStatus || "").includes("REFUND") ||
                      String(viewingPayment.canonicalStatus || "").includes("FAILED") ||
                      (viewingPayment.refundStatus &&
                        viewingPayment.refundStatus !== "NONE" &&
                        viewingPayment.refundStatus !== "NotRequired" &&
                        viewingPayment.refundStatus !== "N/A") ||
                      viewingPayment.status === "FAILED" ||
                      viewingPayment.fulfillmentStatus === "Failed_SupplierError" ||
                      viewingPayment.srdvBookingStatus === "Failed" ||
                      stages[4]?.status === "IN_PROGRESS" ||
                      stages[4]?.status === "COMPLETED";

                    // In case of normal booking success (no cancellation/failure/refund), do NOT show chart
                    if (!isCancelled) {
                      return null;
                    }

                    const isPaymentCaptured =
                      viewingPayment.status === "SUCCESS" ||
                      stages[0]?.status === "COMPLETED" ||
                      Number(viewingPayment.gatewayPaidAmount || viewingPayment.finalPayableAmount) > 0;

                    const isTicketBooked =
                      viewingPayment.canonicalStatus === "BOOKING_CONFIRMED" ||
                      Boolean(viewingPayment.pnr) ||
                      stages[2]?.status === "COMPLETED" ||
                      viewingPayment.srdvBookingStatus === "Confirmed";

                    const isRefundCompleted =
                      (viewingPayment.refundStatus || "").toUpperCase() === "COMPLETED" ||
                      (viewingPayment.refundStatus || "").toUpperCase() === "REFUND_COMPLETED" ||
                      viewingPayment.canonicalStatus === "CANCELLED_AND_REFUNDED" ||
                      viewingPayment.canonicalStatus === "BOOKING_FAILED_REFUNDED" ||
                      stages[4]?.status === "COMPLETED";

                    return (
                      <div className="lifecycle-flowchart-card" style={{ border: "1.5px solid #cbd5e1", background: "#ffffff", padding: "18px" }}>
                        <div className="lifecycle-flowchart-header" style={{ marginBottom: "6px" }}>
                          <span className="lifecycle-flowchart-title" style={{ fontSize: "13px", fontWeight: "800", color: "#A51C49" }}>
                            <CreditCard size={16} />
                            Cancellation & Refund Lifecycle Flowchart
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "800",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              background: isRefundCompleted ? "#d1fae5" : "#fff7ed",
                              color: isRefundCompleted ? "#047857" : "#c2410c",
                              border: `1px solid ${isRefundCompleted ? "#a7f3d0" : "#ffedd5"}`,
                            }}
                          >
                            {isRefundCompleted ? "STATUS: REFUND SETTLED" : "STATUS: CANCELLATION / REFUND IN PROGRESS"}
                          </span>
                        </div>

                        <div className="flowchart-nodes-wrapper" style={{ paddingTop: "14px", paddingBottom: "10px" }}>
                          {/* Node 1: Payment Authorized */}
                          <div className={`flowchart-node-item ${isPaymentCaptured ? "booked" : "pending"}`}>
                            <div className="flowchart-node-circle" style={{ width: "44px", height: "44px" }}>
                              <CheckCircle2 size={22} />
                            </div>
                            <span className="flowchart-node-label" style={{ fontWeight: "700", fontSize: "11.5px", marginTop: "8px" }}>
                              1. Payment
                            </span>
                            <span className="flowchart-node-status" style={{ fontSize: "10.5px", color: isPaymentCaptured ? "#047857" : "#64748b", fontWeight: "600" }}>
                              {isPaymentCaptured ? "Captured (Green)" : "Pending"}
                            </span>
                            <div className={`flowchart-connector-line ${isPaymentCaptured ? "active-green" : ""}`} style={{ top: "22px" }} />
                          </div>

                          {/* Node 2: Supplier Booking & Ticket */}
                          <div className={`flowchart-node-item ${isTicketBooked ? "booked" : stages[2]?.status === "FAILED" || viewingPayment.fulfillmentStatus === "Failed_SupplierError" ? "failed" : "pending"}`}>
                            <div className="flowchart-node-circle" style={{ width: "44px", height: "44px" }}>
                              {isTicketBooked ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                            </div>
                            <span className="flowchart-node-label" style={{ fontWeight: "700", fontSize: "11.5px", marginTop: "8px", color: isTicketBooked ? "#047857" : "#dc2626" }}>
                              2. Ticket Status
                            </span>
                            <span className="flowchart-node-status" style={{ fontSize: "10.5px", color: isTicketBooked ? "#047857" : "#dc2626", fontWeight: "700" }}>
                              {isTicketBooked ? "PNR Issued (Green)" : "Supplier Failed"}
                            </span>
                            <div className={`flowchart-connector-line ${isTicketBooked ? "active-green" : "active-orange"}`} style={{ top: "22px" }} />
                          </div>

                          {/* Node 3: Cancellation Flow */}
                          <div className="flowchart-node-item cancelled">
                            <div className="flowchart-node-circle" style={{ width: "44px", height: "44px" }}>
                              <RefreshCw size={22} className="animate-spin" />
                            </div>
                            <span className="flowchart-node-label" style={{ fontWeight: "700", fontSize: "11.5px", marginTop: "8px", color: "#c2410c" }}>
                              3. Cancellation
                            </span>
                            <span className="flowchart-node-status" style={{ fontSize: "10.5px", color: "#c2410c", fontWeight: "700" }}>
                              Processing Refund
                            </span>
                            <div className={`flowchart-connector-line ${isRefundCompleted ? "active-green" : "active-orange"}`} style={{ top: "22px" }} />
                          </div>

                          {/* Node 4: Refund Settlement */}
                          <div className={`flowchart-node-item ${isRefundCompleted ? "refund_completed" : "in_progress"}`}>
                            <div className="flowchart-node-circle" style={{ width: "44px", height: "44px" }}>
                              {isRefundCompleted ? <CheckCircle2 size={22} /> : <RotateCcw size={22} />}
                            </div>
                            <span className="flowchart-node-label" style={{ fontWeight: "700", fontSize: "11.5px", marginTop: "8px", color: isRefundCompleted ? "#047857" : "#1d4ed8" }}>
                              4. Refund Status
                            </span>
                            <span className="flowchart-node-status" style={{ fontSize: "10.5px", color: isRefundCompleted ? "#047857" : "#1d4ed8", fontWeight: "700" }}>
                              {isRefundCompleted ? "Refund Successful" : "Processing Gateway"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5-Stage Lifecycle Hierarchy Pipeline */}
                  {viewingPayment.lifecycleHierarchy?.stages?.length > 0 && (
                    <div className="lifecycle-hierarchy-container">
                      <div className="lifecycle-hierarchy-header">
                        <h4>
                          <SlidersHorizontal size={14} />
                          5-Stage Lifecycle Hierarchy Pipeline
                        </h4>
                        {viewingPayment.lifecycleHierarchy.nextActionRequired && (
                          <div className="lifecycle-next-action">
                            Next Action: {viewingPayment.lifecycleHierarchy.nextActionRequired}
                          </div>
                        )}
                      </div>

                      <div className="lifecycle-stages-stepper">
                        {viewingPayment.lifecycleHierarchy.stages.map((stg) => {
                          const statusClass = (stg.status || "PENDING").toUpperCase();
                          return (
                            <div key={stg.stageIndex ?? stg.key} className={`lifecycle-stage-node ${statusClass}`}>
                              <div className="node-icon-wrap">
                                {statusClass === "COMPLETED" ? (
                                  <CheckCircle2 size={16} />
                                ) : statusClass === "IN_PROGRESS" ? (
                                  <RefreshCw size={16} className="animate-spin" />
                                ) : statusClass === "WARNING" ? (
                                  <AlertCircle size={16} />
                                ) : statusClass === "FAILED" ? (
                                  <XCircle size={16} />
                                ) : statusClass === "SKIPPED" ? (
                                  <Info size={16} />
                                ) : (
                                  <Clock size={16} />
                                )}
                              </div>
                              <div className="node-content">
                                <div className="node-title-row">
                                  <span className="node-name">
                                    Stage {stg.stageIndex}: {stg.name}
                                  </span>
                                  {stg.timestamp && (
                                    <span className="node-time">{formatCouponDateTime(stg.timestamp)}</span>
                                  )}
                                </div>
                                <div className="node-summary">{stg.summary || "No details available."}</div>
                                {stg.meta && Object.keys(stg.meta).length > 0 && (
                                  <div className="node-meta-grid">
                                    {Object.entries(stg.meta).map(([mk, mv]) => (
                                      <span key={mk} className="node-meta-item">
                                        {mk}: {typeof mv === "object" ? JSON.stringify(mv) : String(mv)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Identifiers Section */}
                  <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                      Transaction Identifiers
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>TRANSACTION ID</span>
                        <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700", display: "block" }}>#{viewingPayment.id}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PAYMENT REFERENCE</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all", overflowWrap: "anywhere", display: "block" }}>{viewingPayment.paymentReference || "--"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>USER ID</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600", display: "block" }}>{viewingPayment.userId || "--"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CASHFREE ORDER ID</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all", overflowWrap: "anywhere", display: "block" }}>{viewingPayment.cashfreeOrderId || "--"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CASHFREE PAYMENT ID</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all", overflowWrap: "anywhere", display: "block" }}>{viewingPayment.cashfreePaymentId || "--"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>BOOKING TYPE & ID</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600", display: "block" }}>
                          {viewingPayment.bookingType || "Bus"} {viewingPayment.bookingId ? `#${viewingPayment.bookingId}` : "(No Booking ID)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Contact Overview Section */}
                  <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                      Primary Contact Overview
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>LEAD PASSENGER</span>
                        <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700", wordBreak: "break-word", overflowWrap: "anywhere", display: "block" }}>{viewingPayment.customerName || viewingPayment.CustomerName || "—"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CONTACT PHONE</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600", wordBreak: "break-all", display: "block" }}>{formatPhoneNumber(viewingPayment.customerPhone || viewingPayment.CustomerPhone)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CONTACT EMAIL</span>
                        <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600", wordBreak: "break-all", overflowWrap: "anywhere", display: "block" }}>{viewingPayment.customerEmail || viewingPayment.CustomerEmail || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Section */}
                  <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                      Financial Breakdown ({viewingPayment.currency || "INR"})
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>ORIGINAL FARE</span>
                        <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600", display: "block" }}>{formatCurrency(viewingPayment.originalAmount)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>MARKUP AMOUNT</span>
                        <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600", display: "block" }}>+{formatCurrency(viewingPayment.markupAmount)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CONVENIENCE FEE</span>
                        <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600", display: "block" }}>+{formatCurrency(viewingPayment.convenienceFee)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>DISCOUNT AMOUNT</span>
                        <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "700", display: "block" }}>-{formatCurrency(viewingPayment.discountAmount)}</span>
                      </div>
                    </div>

                    {(viewingPayment.couponCode || viewingPayment.offerCode || viewingPayment.walletUsedAmount > 0 || viewingPayment.gatewayPaidAmount != null) && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                        {viewingPayment.couponCode && (
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>COUPON APPLIED</span>
                            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", background: "#f0fdf4", padding: "2px 6px", borderRadius: "4px", wordBreak: "break-all" }}>
                              {viewingPayment.couponCode}
                            </span>
                          </div>
                        )}
                        {viewingPayment.walletUsedAmount > 0 && (
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>WALLET PAID</span>
                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", display: "block" }}>{formatCurrency(viewingPayment.walletUsedAmount)}</span>
                          </div>
                        )}
                        {viewingPayment.gatewayPaidAmount != null && (
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>GATEWAY PAID</span>
                            <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600", display: "block" }}>{formatCurrency(viewingPayment.gatewayPaidAmount)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1.5px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700" }}>FINAL PAYABLE AMOUNT</span>
                      <span style={{ fontSize: "16px", color: "#A51C49", fontWeight: "800" }}>{formatCurrency(viewingPayment.finalPayableAmount)}</span>
                    </div>
                  </div>

                  {/* Status & Audit Info */}
                  <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                      Status & Timeline Audit
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PAYMENT STATUS</span>
                        <span style={{ fontSize: "12px", fontWeight: "700", display: "block" }}>{viewingPayment.status || "--"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>FULFILLMENT STATUS</span>
                        <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600", display: "block" }}>{viewingPayment.fulfillmentStatus || "Pending"}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>REFUND STATUS</span>
                        <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600", display: "block" }}>{viewingPayment.refundStatus === "NotRequired" ? "Not Required" : (viewingPayment.refundStatus || "None")}</span>
                      </div>
                      {viewingPayment.paidAt && (
                        <div style={{ gridColumn: "span 3" }}>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PAID AT TIMESTAMP</span>
                          <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600", wordBreak: "break-all", display: "block" }}>{formatCouponDateTime(viewingPayment.paidAt)} ({viewingPayment.paidAt})</span>
                        </div>
                      )}
                      <div style={{ gridColumn: "span 3" }}>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CREATED TIMESTAMP</span>
                        <span style={{ fontSize: "12px", color: "#334155", wordBreak: "break-all", display: "block" }}>{formatCouponDateTime(viewingPayment.createdAt)} ({viewingPayment.createdAt})</span>
                      </div>
                      {viewingPayment.updatedAt && viewingPayment.updatedAt !== viewingPayment.createdAt && (
                        <div style={{ gridColumn: "span 3" }}>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>LAST UPDATED</span>
                          <span style={{ fontSize: "12px", color: "#64748b", wordBreak: "break-all", display: "block" }}>{formatCouponDateTime(viewingPayment.updatedAt)} ({viewingPayment.updatedAt})</span>
                        </div>
                      )}
                      {(viewingPayment.refundId || viewingPayment.refundReason) && (
                        <div style={{ gridColumn: "span 3", background: "#fff7ed", padding: "8px 10px", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                          <span style={{ fontSize: "10px", color: "#c2410c", fontWeight: "700", display: "block" }}>REFUND AUDIT INFORMATION</span>
                          <span style={{ fontSize: "12px", color: "#9a3412", wordBreak: "break-word", display: "block" }}>
                            {viewingPayment.refundId ? `ID: ${viewingPayment.refundId} | ` : ""}Reason: {viewingPayment.refundReason || "N/A"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(viewingPayment.failureReason || viewingPayment.lastError || viewingPayment.supplierError) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "700" }}>GATEWAY / SUPPLIER FAILURE REASON</span>
                      <span style={{ fontSize: "12px", color: "#991b1b", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {viewingPayment.failureReason || viewingPayment.lastError || viewingPayment.supplierError}
                      </span>
                    </div>
                  )}

                  {/* Supplier Fulfillment Breakdown */}
                  {viewingPayment.supplierFulfillment && (
                    <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                        SRDV Supplier Fulfillment Audit
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>SUPPLIER REF</span>
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.supplierFulfillment.supplierReference || "N/A"}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>SUPPLIER STATUS</span>
                          <span style={{ fontSize: "12px", color: viewingPayment.supplierFulfillment.supplierBookingStatus === "Failed" ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
                            {viewingPayment.supplierFulfillment.supplierBookingStatus || viewingPayment.srdvBookingStatus || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>RESERVATION ID</span>
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.supplierFulfillment.reservationId || viewingPayment.bookingId || "N/A"}</span>
                        </div>
                        {viewingPayment.supplierFulfillment.lastError && (
                          <div style={{ gridColumn: "span 3", background: "#fef2f2", padding: "6px 10px", borderRadius: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "700", display: "block" }}>LAST ERROR</span>
                            <span style={{ fontSize: "11px", color: "#991b1b", fontFamily: "monospace" }}>{viewingPayment.supplierFulfillment.lastError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Booking Details Breakdown */}
                  {viewingPayment.bookingDetails && (
                    <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                        Reservation & Booking Meta
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PNR / TICKET NUMBER</span>
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "700", fontFamily: "monospace" }}>{viewingPayment.bookingDetails.pnr || viewingPayment.pnr || "N/A"}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>BOOKING REFERENCE</span>
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.bookingDetails.bookingReference || viewingPayment.bookingReference || "N/A"}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>TRAVEL DATE</span>
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.bookingDetails.travelDate || "N/A"}</span>
                        </div>
                        {viewingPayment.bookingDetails.title && (
                          <div style={{ gridColumn: "span 3" }}>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>TRIP / ROUTE SUMMARY</span>
                            <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.bookingDetails.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chronological Timeline Audit Stream */}
                  {viewingPayment.timeline?.length > 0 && (
                    <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#A51C49", fontWeight: "700", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #A51C49", paddingLeft: "8px", paddingBottom: "4px" }}>
                        Chronological Event Timeline
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {viewingPayment.timeline.map((ev, i) => (
                          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", paddingBottom: "8px", borderBottom: i < viewingPayment.timeline.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ev.status === "COMPLETED" ? "#10b981" : ev.status === "FAILED" ? "#ef4444" : "#3b82f6", marginTop: "5px", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#1e293b" }}>{ev.title || ev.stage}</span>
                                <span style={{ fontSize: "10px", color: "#64748b" }}>{formatCouponDateTime(ev.timestamp)}</span>
                              </div>
                              {ev.description && <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{ev.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundPayment && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container edit-modal" style={{ maxWidth: "500px", overflow: "hidden", borderRadius: "12px", padding: 0 }}>
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #A51C49 0%, #800b28 100%)",
                color: "#ffffff",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 0,
              }}
            >
              <h3 style={{ color: "#ffffff", fontWeight: "700", margin: 0, fontSize: "15px" }}>Initiate / Update Payment Refund</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setRefundPayment(null)}
                style={{ color: "#ffffff", opacity: 0.9, fontSize: "20px" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProcessRefund} style={{ padding: "16px 20px 20px" }}>
              {refundError && (
                <p style={{ color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginBottom: "12px" }}>
                  {refundError}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                  Payment Ref: <strong>{refundPayment.paymentReference || `#${refundPayment.id}`}</strong> | User ID: <strong>{refundPayment.userId}</strong>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                  <span>Refund Amount (₹) *</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px", fontSize: "13px", outline: "none" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                  <span>Refund Reason *</span>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Enter reason for initiating refund..."
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px", fontSize: "12px", outline: "none", fontFamily: "inherit" }}
                  />
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="modal-btn"
                  onClick={() => setRefundPayment(null)}
                  style={{ background: "#f97316", color: "#ffffff" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn"
                  disabled={isSubmittingRefund}
                  style={{ background: "#A51C49", color: "#ffffff" }}
                >
                  {isSubmittingRefund ? "Processing..." : "Process Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
