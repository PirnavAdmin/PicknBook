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
} from "lucide-react";
import "./AdminPaymentsList.css";
import { csvCell, formatCouponDate, formatCouponDateTime } from "../../utils/adminPortalUtils";
import AdminPagination from "../../components/AdminPagination";
import {
  getAdminPaymentMetrics,
  getAdminPayments,
  getAdminPaymentById,
  initiateAdminPaymentRefund,
} from "../../services/adminPaymentService";

function formatCurrency(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [bookingTypeFilter, setBookingTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
          setPayments(list);
          setTotalRecords(Number(res?.totalRecords || list.length));
        }
      } catch (err) {
        if (isMounted) {
          setPayments([]);
          setPaymentError(err.message || "Failed to load payments from server.");
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
      if (res?.data) {
        setViewingPayment(res.data);
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
    const s = String(status || "").trim().toUpperCase();
    if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "CONFIRMED") {
      return (
        <span className="payment-status-badge success">
          <CheckCircle2 size={12} />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (s === "FAILED" || s === "FAILURE") {
      return (
        <span className="payment-status-badge failed">
          <XCircle size={12} />
          <span>FAILED</span>
        </span>
      );
    }
    if (s === "USER_DROPPED" || s === "CANCELLED") {
      return (
        <span className="payment-status-badge dropped">
          <XCircle size={12} />
          <span>DROPPED</span>
        </span>
      );
    }
    return (
      <span className="payment-status-badge pending">
        <Clock size={12} />
        <span>{s || "PENDING"}</span>
      </span>
    );
  };

  return (
    <section className="admin-b2c-page admin-payments-container">
      {/* Page Header */}
      <header className="admin-markup-coupon-header">
        <div className="admin-markup-coupon-title-wrap">
          <h1>
            <span style={{ color: "#A51C49" }}>Admin </span>
            <span style={{ color: "#000000" }}>Payments & Transactions</span>
          </h1>
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
            disabled={!hasActiveFilters}
          >
            <X size={15} />
            <span>Clear Filter</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn generate"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-markup-coupon-btn export"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Metric Summary Cards */}
      <div className="admin-payments-metrics-grid">
        <div className="payment-metric-card revenue">
          <div className="metric-icon">
            <DollarSign size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Revenue</span>
            <span className="metric-value">{formatCurrency(metrics.totalRevenue)}</span>
          </div>
        </div>

        <div className="payment-metric-card total">
          <div className="metric-icon">
            <CreditCard size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Payments</span>
            <span className="metric-value">{metrics.totalPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card success">
          <div className="metric-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Successful</span>
            <span className="metric-value">{metrics.successfulPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card failed">
          <div className="metric-icon">
            <XCircle size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Failed Payments</span>
            <span className="metric-value">{metrics.failedPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card pending">
          <div className="metric-icon">
            <Clock size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending</span>
            <span className="metric-value">{metrics.pendingPayments}</span>
          </div>
        </div>

        <div className="payment-metric-card refunds">
          <div className="metric-icon">
            <RotateCcw size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pending Refunds</span>
            <span className="metric-value">{metrics.pendingRefunds}</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <section className="admin-markup-coupon-filter">
          <div className="admin-markup-coupon-filter-grid" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr" }}>
            <label>
              <span>Search (Ref / Order ID / User ID)</span>
              <input
                type="text"
                placeholder="Search payment reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "12px" }}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "12px" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Successful Only</option>
                <option value="FAILED">Failed Only</option>
                <option value="USER_DROPPED">User Dropped</option>
                <option value="PENDING">Pending</option>
              </select>
            </label>

            <label>
              <span>Booking Type</span>
              <select
                value={bookingTypeFilter}
                onChange={(e) => setBookingTypeFilter(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "12px" }}
              >
                <option value="ALL">All Types</option>
                <option value="Bus">Bus</option>
                <option value="Flight">Flight</option>
                <option value="Hotel">Hotel</option>
              </select>
            </label>

            <label>
              <span>From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "12px" }}
              />
            </label>

            <label>
              <span>To Date</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "12px" }}
              />
            </label>
          </div>
        </section>
      )}

      {paymentError && <p className="admin-markup-coupon-error">{paymentError}</p>}

      {/* Main Table */}
      <section className="admin-markup-coupon-table-wrap">
        <div className="admin-markup-coupon-table-scroll">
          <table className="admin-markup-coupon-table">
            <thead>
              <tr>
                <th style={{ minWidth: "120px" }}>Ref / ID</th>
                <th style={{ minWidth: "140px" }}>Cashfree Order ID</th>
                <th style={{ minWidth: "90px" }}>User ID</th>
                <th style={{ minWidth: "110px" }}>Type / Booking ID</th>
                <th style={{ minWidth: "100px" }}>Original Fare</th>
                <th style={{ minWidth: "90px" }}>Markup / Fee</th>
                <th style={{ minWidth: "80px" }}>Discount</th>
                <th style={{ minWidth: "110px" }}>Final Payable</th>
                <th style={{ minWidth: "80px" }}>Method</th>
                <th className="status-col" style={{ minWidth: "100px" }}>Status</th>
                <th style={{ minWidth: "120px" }}>Refund Status</th>
                <th style={{ minWidth: "130px" }}>Date</th>
                <th className="action-col" style={{ minWidth: "90px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPayments ? (
                <tr>
                  <td colSpan={13}>
                    <p className="admin-markup-coupon-empty">Loading payment transactions...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <p className="admin-markup-coupon-empty">No payment records match your filters.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const refText = p.paymentReference || "--";
                  const orderIdText = p.cashfreeOrderId || "--";
                  const userIdText = p.userId || "--";
                  const refundText = p.refundStatus === "NotRequired" ? "Not Required" : (p.refundStatus || "None");

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", maxWidth: "130px" }}>
                          <span style={{ fontWeight: "700", color: "#A51C49", fontSize: "12px" }}>
                            #{p.id}
                          </span>
                          <span
                            title={refText}
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {refText}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          title={orderIdText}
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11px",
                            background: "#f1f5f9",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            maxWidth: "140px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            verticalAlign: "middle",
                          }}
                        >
                          {orderIdText}
                        </span>
                      </td>
                      <td>
                        <span
                          title={userIdText}
                          style={{
                            fontSize: "12px",
                            color: "#334155",
                            display: "inline-block",
                            maxWidth: "100px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {userIdText}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "12px" }}>
                          {p.bookingId ? `${p.bookingType || "Bus"} #${p.bookingId}` : (p.bookingType || "Bus")}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px" }}>{formatCurrency(p.originalAmount)}</td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                          +₹{Number(p.markupAmount || 0) + Number(p.convenienceFee || 0)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                          -₹{Number(p.discountAmount || 0)}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#A51C49", fontSize: "13px" }}>
                          {formatCurrency(p.finalPayableAmount)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "600", color: "#475569" }}>
                          {p.paymentMethod ? String(p.paymentMethod).toUpperCase() : "--"}
                        </span>
                      </td>
                      <td className="status-col">{renderStatusBadge(p.status)}</td>
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
                            className={`actions-trigger-btn ${activeDropdownId === p.id ? "active" : ""}`}
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
            onPageChange={setCurrentPage}
            itemName="payments"
          />
        )}
      </section>

      {/* DETAIL MODAL (ALL DATA DISPLAYED CLEANLY) */}
      {viewingPayment && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container view-modal" style={{ maxWidth: "780px" }}>
            <div className="modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ color: "#1e293b", fontWeight: "700", margin: 0 }}>Full Payment Transaction Details</h3>
                <span style={{ fontSize: "12px", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                  ID #{viewingPayment.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                style={{
                  border: "1.5px solid #A51C49",
                  background: "#ffffff",
                  color: "#A51C49",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px", alignItems: "center" }}>
              {renderStatusBadge(viewingPayment.status)}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "65vh", overflowY: "auto", paddingRight: "6px" }}>
                
                {/* Identifiers Section */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px" }}>
                    Transaction Identifiers
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>TRANSACTION ID</span>
                      <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700" }}>#{viewingPayment.id}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PAYMENT REFERENCE</span>
                      <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all" }}>{viewingPayment.paymentReference || "--"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>USER ID</span>
                      <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>{viewingPayment.userId || "--"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CASHFREE ORDER ID</span>
                      <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all" }}>{viewingPayment.cashfreeOrderId || "--"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CASHFREE PAYMENT ID</span>
                      <span style={{ fontSize: "12px", color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all" }}>{viewingPayment.cashfreePaymentId || "--"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>BOOKING TYPE & ID</span>
                      <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600" }}>
                        {viewingPayment.bookingType || "Bus"} {viewingPayment.bookingId ? `#${viewingPayment.bookingId}` : "(No Booking ID)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown Section */}
                <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
                    Financial Breakdown ({viewingPayment.currency || "INR"})
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>ORIGINAL FARE</span>
                      <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600" }}>{formatCurrency(viewingPayment.originalAmount)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>MARKUP AMOUNT</span>
                      <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600" }}>+{formatCurrency(viewingPayment.markupAmount)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CONVENIENCE FEE</span>
                      <span style={{ fontSize: "13px", color: "#334155", fontWeight: "600" }}>+{formatCurrency(viewingPayment.convenienceFee)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>DISCOUNT AMOUNT</span>
                      <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "700" }}>-{formatCurrency(viewingPayment.discountAmount)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1.5px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700" }}>FINAL PAYABLE AMOUNT</span>
                    <span style={{ fontSize: "16px", color: "#A51C49", fontWeight: "800" }}>{formatCurrency(viewingPayment.finalPayableAmount)}</span>
                  </div>
                </div>

                {/* Status & Audit Info */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginTop: 0, marginBottom: "12px", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px" }}>
                    Status & Timeline Audit
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>PAYMENT STATUS</span>
                      <span style={{ fontSize: "12px", fontWeight: "700" }}>{viewingPayment.status || "--"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>FULFILLMENT STATUS</span>
                      <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600" }}>{viewingPayment.fulfillmentStatus || "Pending"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>REFUND STATUS</span>
                      <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600" }}>{viewingPayment.refundStatus === "NotRequired" ? "Not Required" : (viewingPayment.refundStatus || "None")}</span>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", display: "block" }}>CREATED TIMESTAMP</span>
                      <span style={{ fontSize: "12px", color: "#334155" }}>{formatCouponDateTime(viewingPayment.createdAt)} ({viewingPayment.createdAt})</span>
                    </div>
                  </div>
                </div>

                {viewingPayment.lastError && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                    <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "700" }}>LAST GATEWAY / SYSTEM ERROR</span>
                    <span style={{ fontSize: "12px", color: "#991b1b", fontFamily: "monospace" }}>{viewingPayment.lastError}</span>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundPayment && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container edit-modal" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ color: "#1e293b", fontWeight: "700" }}>Initiate / Update Payment Refund</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setRefundPayment(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProcessRefund} style={{ padding: "16px 0 0" }}>
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
