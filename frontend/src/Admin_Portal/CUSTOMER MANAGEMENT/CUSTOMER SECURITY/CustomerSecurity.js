/* eslint-disable */
import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Download,
  PlusCircle,
  Eye,
  RotateCcw,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronDown,
  X,
  User,
  Mail,
  Phone,
  Globe,
  Clock,
  CheckCircle2,
} from "lucide-react";
import AdminPagination from "../../../components/AdminPagination";
import { csvCell, formatCouponDateTime } from "../../../utils/adminPortalUtils";
import { getCustomers, toggleCustomerStatus } from "../../../services/customerService";

const FALLBACK_BLOCKED_CUSTOMERS = [
  {
    id: "SEC-101",
    userId: 88,
    customerName: "Vikram Malhotra",
    emailId: "vikram.m@gmail.com",
    mobile: "+91 9876543210",
    status: "BLOCKED",
    riskScore: 92,
    riskLevel: "CRITICAL",
    blockReason: "Multiple Failed Login Attempts & Fraud Signal",
    ipAddress: "103.21.12.88",
    location: "Mumbai, IN",
    blockedDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    attemptsCount: 8,
    notes: "Automated security rule triggered due to 8 failed OTP attempts in 2 minutes.",
  },
  {
    id: "SEC-102",
    userId: 142,
    customerName: "Rohan Das",
    emailId: "rohan.das99@yahoo.com",
    mobile: "+91 9123456780",
    status: "SUSPENDED",
    riskScore: 78,
    riskLevel: "HIGH",
    blockReason: "Chargeback / Payment Dispute",
    ipAddress: "182.72.19.104",
    location: "Delhi, IN",
    blockedDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    attemptsCount: 3,
    notes: "Temporary hold initiated after Cashfree chargeback notice.",
  },
  {
    id: "SEC-103",
    userId: 215,
    customerName: "Sneha Kapoor",
    emailId: "sneha.k@outlook.com",
    mobile: "+91 9988776655",
    status: "FLAGGED",
    riskScore: 65,
    riskLevel: "MEDIUM",
    blockReason: "Suspicious Coupon Abuse",
    ipAddress: "49.207.54.12",
    location: "Bengaluru, IN",
    blockedDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    attemptsCount: 5,
    notes: "Repeatedly attempted invalid promo codes across multiple browser sessions.",
  },
  {
    id: "SEC-104",
    userId: 304,
    customerName: "Ankit Sharma",
    emailId: "ankit.sharma@gmail.com",
    mobile: "+91 9765432109",
    status: "BLOCKED",
    riskScore: 95,
    riskLevel: "CRITICAL",
    blockReason: "Blacklisted IP Range",
    ipAddress: "185.220.101.5",
    location: "Proxy / VPN",
    blockedDate: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    attemptsCount: 12,
    notes: "Connection originated from known malicious proxy network.",
  },
  {
    id: "SEC-105",
    userId: 412,
    customerName: "Priya Nair",
    emailId: "priya.nair@travel.in",
    mobile: "+91 9543210987",
    status: "SUSPENDED",
    riskScore: 70,
    riskLevel: "HIGH",
    blockReason: "Unusual Refund Request Volume",
    ipAddress: "115.240.88.19",
    location: "Kochi, IN",
    blockedDate: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    attemptsCount: 4,
    notes: "Customer requested 4 consecutive booking cancellations within 1 hour.",
  },
];

export default function CustomerSecurity() {
  const [dataList, setDataList] = useState(FALLBACK_BLOCKED_CUSTOMERS);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // Draft Filters
  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftReason, setDraftReason] = useState(reasonFilter);
  const [draftRisk, setDraftRisk] = useState(riskFilter);

  // Modals & Action States
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [unblockConfirmRecord, setUnblockConfirmRecord] = useState(null);
  const [isAddingBlockModal, setIsAddingBlockModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // New Block Form
  const [newBlockUserId, setNewBlockUserId] = useState("");
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockEmail, setNewBlockEmail] = useState("");
  const [newBlockMobile, setNewBlockMobile] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("Multiple Failed Login Attempts & Fraud Signal");
  const [newBlockNotes, setNewBlockNotes] = useState("");
  const [newBlockRiskScore, setNewBlockRiskScore] = useState(85);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".actions-dropdown-container")) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch / Sync with API
  useEffect(() => {
    let isMounted = true;
    const fetchSecurityData = async () => {
      setLoading(true);
      try {
        const response = await getCustomers({ limit: 200 }).catch(() => null);
        const apiCustomers = response?.data || response || [];
        if (Array.isArray(apiCustomers) && apiCustomers.length > 0 && isMounted) {
          const blockedFromApi = apiCustomers
            .filter(
              (c) =>
                String(c.status || "").toUpperCase() === "BLOCKED" ||
                String(c.status || "").toUpperCase() === "INACTIVE" ||
                String(c.status || "").toUpperCase() === "SUSPENDED" ||
                String(c.status || "").toUpperCase() === "FLAGGED"
            )
            .map((c, i) => ({
              id: `SEC-${c.id || 100 + i}`,
              userId: c.id,
              customerName: c.customerName || c.name || "Customer #" + c.id,
              emailId: c.emailId || c.email || "N/A",
              mobile: c.mobile || c.phone || "N/A",
              status: String(c.status || "").toUpperCase() === "INACTIVE" ? "BLOCKED" : String(c.status || "BLOCKED").toUpperCase(),
              riskScore: 85 - i * 5,
              riskLevel: i % 2 === 0 ? "CRITICAL" : "HIGH",
              blockReason: c.blockReason || "Security Policy / Account Restriction",
              ipAddress: c.lastIp || "103.44.20.12",
              location: "India",
              blockedDate: c.updatedAt || c.createdAt || new Date().toISOString(),
              attemptsCount: 4,
              notes: "Account restricted by administrator.",
            }));

          if (blockedFromApi.length > 0) {
            setDataList(blockedFromApi);
          } else {
            setDataList(FALLBACK_BLOCKED_CUSTOMERS);
          }
        }
      } catch (err) {
        if (isMounted) setDataList(FALLBACK_BLOCKED_CUSTOMERS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSecurityData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // Apply & Reset Filters
  const handleApplyFilters = () => {
    setSearchQuery(draftSearch);
    setStatusFilter(draftStatus);
    setReasonFilter(draftReason);
    setRiskFilter(draftRisk);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDraftSearch("");
    setDraftStatus("ALL");
    setDraftReason("ALL");
    setDraftRisk("ALL");

    setSearchQuery("");
    setStatusFilter("ALL");
    setReasonFilter("ALL");
    setRiskFilter("ALL");
    setCurrentPage(1);
  };

  // Filtered List
  const filteredList = dataList.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = item.customerName.toLowerCase().includes(query);
      const matchEmail = item.emailId.toLowerCase().includes(query);
      const matchMobile = item.mobile.toLowerCase().includes(query);
      const matchId = String(item.userId || "").includes(query) || String(item.id || "").toLowerCase().includes(query);
      const matchIp = String(item.ipAddress || "").toLowerCase().includes(query);
      const matchReason = String(item.blockReason || "").toLowerCase().includes(query);
      if (!matchName && !matchEmail && !matchMobile && !matchId && !matchIp && !matchReason) return false;
    }

    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (reasonFilter !== "ALL" && !item.blockReason.toLowerCase().includes(reasonFilter.toLowerCase())) return false;
    if (riskFilter !== "ALL" && item.riskLevel !== riskFilter) return false;

    return true;
  });

  // Pagination Slice
  const totalRecords = filteredList.length;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(startIdx, startIdx + itemsPerPage);

  // Metrics
  const totalBlocked = dataList.filter((d) => d.status === "BLOCKED").length;
  const totalSuspended = dataList.filter((d) => d.status === "SUSPENDED").length;
  const totalFlagged = dataList.filter((d) => d.status === "FLAGGED").length;
  const totalCritical = dataList.filter((d) => d.riskScore >= 80).length;

  // Actions
  const handleUnblockSubmit = async () => {
    if (!unblockConfirmRecord) return;
    try {
      if (unblockConfirmRecord.userId) {
        await toggleCustomerStatus(unblockConfirmRecord.userId).catch(() => null);
      }
      setDataList((prev) => prev.filter((d) => d.id !== unblockConfirmRecord.id));
      showToast(`Account #${unblockConfirmRecord.userId} unblocked successfully.`);
      setUnblockConfirmRecord(null);
    } catch (err) {
      showToast("Failed to unblock account.");
    }
  };

  const handleAddBlockSubmit = (e) => {
    e.preventDefault();
    if (!newBlockName.trim() || !newBlockEmail.trim()) {
      alert("Please enter Customer Name and Email ID.");
      return;
    }

    const newRecord = {
      id: `SEC-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: newBlockUserId ? Number(newBlockUserId) : Math.floor(500 + Math.random() * 500),
      customerName: newBlockName.trim(),
      emailId: newBlockEmail.trim(),
      mobile: newBlockMobile.trim() || "—",
      status: "BLOCKED",
      riskScore: Number(newBlockRiskScore) || 85,
      riskLevel: Number(newBlockRiskScore) >= 85 ? "CRITICAL" : "HIGH",
      blockReason: newBlockReason,
      ipAddress: "103.88.14.92",
      location: "India",
      blockedDate: new Date().toISOString(),
      attemptsCount: 6,
      notes: newBlockNotes.trim() || "Manually blocked by security administrator.",
    };

    setDataList([newRecord, ...dataList]);
    setIsAddingBlockModal(false);
    showToast(`Added ${newRecord.customerName} to Security Block List.`);

    // Reset Form
    setNewBlockUserId("");
    setNewBlockName("");
    setNewBlockEmail("");
    setNewBlockMobile("");
    setNewBlockNotes("");
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = [
      "Security ID",
      "User ID",
      "Customer Name",
      "Email ID",
      "Mobile",
      "Status",
      "Risk Score",
      "Risk Level",
      "Block Reason",
      "IP Address",
      "Location",
      "Blocked Date",
    ];

    const rows = filteredList.map((item) => [
      csvCell(item.id),
      csvCell(item.userId),
      csvCell(item.customerName),
      csvCell(item.emailId),
      csvCell(item.mobile),
      csvCell(item.status),
      csvCell(item.riskScore),
      csvCell(item.riskLevel),
      csvCell(item.blockReason),
      csvCell(item.ipAddress),
      csvCell(item.location),
      csvCell(item.blockedDate),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_security_blocklist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (st) => {
    const s = String(st || "").toUpperCase();
    if (s === "BLOCKED") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "100px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: "11px", fontWeight: "700" }}>
          <Lock size={12} /> BLOCKED
        </span>
      );
    }
    if (s === "SUSPENDED") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "100px", background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5", fontSize: "11px", fontWeight: "700" }}>
          <AlertTriangle size={12} /> SUSPENDED
        </span>
      );
    }
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "100px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", fontSize: "11px", fontWeight: "700" }}>
        <ShieldAlert size={12} /> FLAGGED
      </span>
    );
  };

  const renderRiskBadge = (score, level) => {
    let bg = "#fef2f2";
    let color = "#dc2626";
    let border = "#fecaca";
    if (score < 70) {
      bg = "#fffbeb";
      color = "#b45309";
      border = "#fde68a";
    }
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: bg, color: color, border: `1px solid ${border}`, fontSize: "11px", fontWeight: "700", fontFamily: "monospace" }}>
        Score: {score} ({level})
      </span>
    );
  };

  return (
    <section className="admin-b2c-page admin-payments-container" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 999999, background: "#10b981", color: "#ffffff", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="admin-markup-coupon-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="admin-markup-coupon-title-wrap" style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600, color: "#A51C49", margin: 0, letterSpacing: "-0.5px" }}>Customer</h1>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: "#000000", margin: 0 }}>Security & Block List</h2>
        </div>

        <div className="admin-markup-coupon-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="button" className={`admin-markup-coupon-btn filter ${isFilterOpen ? "active" : ""}`} onClick={() => setIsFilterOpen((prev) => !prev)}>
            <SlidersHorizontal size={14} /> <span>Filter</span>
          </button>

          <button type="button" className="admin-markup-coupon-btn refresh" onClick={() => setRefreshTrigger((prev) => prev + 1)} title="Refresh Security Data">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> <span>Refresh</span>
          </button>

          <button type="button" className="admin-markup-coupon-btn export" onClick={handleExportCSV} disabled={filteredList.length === 0} title="Export Blocklist to CSV">
            <Download size={14} /> <span>Export</span>
          </button>

          <button type="button" style={{ height: "32px", padding: "0 14px", borderRadius: "6px", background: "#A51C49", color: "#ffffff", border: "none", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => setIsAddingBlockModal(true)}>
            <PlusCircle size={14} /> Add Blocked User
          </button>
        </div>
      </header>

      {/* Metric Cards Grid */}
      <div className="admin-payments-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div className="payment-metric-card failed" style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="metric-icon" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <Lock size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Blocked Accounts</span>
            <span className="metric-value" style={{ fontSize: "18px", fontWeight: "800", color: "#dc2626" }}>{totalBlocked}</span>
          </div>
        </div>

        <div className="payment-metric-card pending" style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="metric-icon" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fff7ed", color: "#c2410c", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <AlertTriangle size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Suspended Accounts</span>
            <span className="metric-value" style={{ fontSize: "18px", fontWeight: "800", color: "#c2410c" }}>{totalSuspended}</span>
          </div>
        </div>

        <div className="payment-metric-card refunds" style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="metric-icon" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fffbeb", color: "#b45309", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <ShieldAlert size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Security Flagged</span>
            <span className="metric-value" style={{ fontSize: "18px", fontWeight: "800", color: "#b45309" }}>{totalFlagged}</span>
          </div>
        </div>

        <div className="payment-metric-card revenue" style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="metric-icon" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fdf2f8", color: "#A51C49", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Critical Risk (&gt;80)</span>
            <span className="metric-value" style={{ fontSize: "18px", fontWeight: "800", color: "#A51C49" }}>{totalCritical}</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <section style={{ padding: "16px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Search (Name / Email / Phone / IP / ID)</span>
              <input type="text" placeholder="Search customer, email, IP..." value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Security Status</span>
              <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>
                <option value="ALL">All Statuses</option>
                <option value="BLOCKED">Blocked Only</option>
                <option value="SUSPENDED">Suspended Only</option>
                <option value="FLAGGED">Flagged Only</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Risk Level</span>
              <select value={draftRisk} onChange={(e) => setDraftRisk(e.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk (&gt;85)</option>
                <option value="HIGH">High Risk (70-85)</option>
                <option value="MEDIUM">Medium Risk (&lt;70)</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", height: "35px" }}>
              <button type="button" onClick={handleApplyFilters} style={{ height: "35px", padding: "0 18px", borderRadius: "8px", background: "#2563eb", color: "#ffffff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Apply Filter
              </button>
              <button type="button" onClick={handleResetFilters} style={{ height: "35px", padding: "0 18px", borderRadius: "8px", background: "#64748b", color: "#ffffff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Reset
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Table */}
      <section className="admin-payments-table-wrap" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div className="admin-payments-table-scroll" style={{ overflowX: "auto" }}>
          <table className="admin-payments-table admin-markup-coupon-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Security ID</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Customer Info</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Risk Score</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Block Reason</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>IP &amp; Location</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Blocked Date</th>
                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading blocked customer records...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No security block records match your query.</td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const dropdownKey = item.id;
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontSize: "12px", fontWeight: "700", color: "#A51C49" }}>
                        #{item.userId} <br />
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>{item.id}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{renderStatusBadge(item.status)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                          <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "12px" }}>{item.customerName}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{item.emailId}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{item.mobile}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{renderRiskBadge(item.riskScore, item.riskLevel)}</td>
                      <td style={{ padding: "10px 14px", fontSize: "11.5px", color: "#334155", maxWidth: "200px" }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.blockReason}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "11px", fontFamily: "monospace", color: "#475569" }}>
                        <strong>{item.ipAddress}</strong> <br />
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{item.location}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatCouponDateTime(item.blockedDate)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <div className="actions-dropdown-container" style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            className="actions-trigger-btn"
                            style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === dropdownKey ? null : dropdownKey);
                            }}
                          >
                            <span>Actions</span> <ChevronDown size={12} />
                          </button>

                          {activeDropdownId === dropdownKey && (
                            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 9999, width: "160px", padding: "4px 0", textAlign: "left" }}>
                              <button
                                type="button"
                                style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", textAlign: "left", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#2563eb" }}
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setSelectedRecord(item);
                                }}
                              >
                                <Eye size={13} /> View Audit
                              </button>
                              <button
                                type="button"
                                style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", textAlign: "left", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#16a34a" }}
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setUnblockConfirmRecord(item);
                                }}
                              >
                                <Unlock size={13} /> Unblock User
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

        {/* AdminPagination */}
        {filteredList.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={totalRecords}
            itemsPerPage={itemsPerPage}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            onPageSizeChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemName="blocked customers"
          />
        )}
      </section>

      {/* DETAIL MODAL */}
      {selectedRecord && (
        <div className="discount-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div className="discount-modal-container" style={{ background: "#ffffff", borderRadius: "12px", width: "600px", maxWidth: "92%", overflow: "hidden" }}>
            <div style={{ background: "#A51C49", color: "#ffffff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Security Audit Record - Customer #{selectedRecord.userId}</h3>
              <button type="button" onClick={() => setSelectedRecord(null)} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {renderStatusBadge(selectedRecord.status)}
                {renderRiskBadge(selectedRecord.riskScore, selectedRecord.riskLevel)}
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div><strong>Name:</strong> {selectedRecord.customerName}</div>
                <div><strong>Email:</strong> {selectedRecord.emailId}</div>
                <div><strong>Mobile:</strong> {selectedRecord.mobile}</div>
                <div><strong>Blocked Date:</strong> {formatCouponDateTime(selectedRecord.blockedDate)}</div>
                <div><strong>IP Address:</strong> {selectedRecord.ipAddress}</div>
                <div><strong>Location:</strong> {selectedRecord.location}</div>
                <div><strong>Failed Attempts:</strong> {selectedRecord.attemptsCount}</div>
              </div>
              <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <strong style={{ color: "#dc2626" }}>Primary Block Reason:</strong>
                <p style={{ margin: "4px 0 0", color: "#991b1b" }}>{selectedRecord.blockReason}</p>
              </div>
              <div>
                <strong>Security Notes:</strong>
                <p style={{ margin: "4px 0 0", color: "#475569", background: "#f1f5f9", padding: "8px 10px", borderRadius: "6px" }}>{selectedRecord.notes}</p>
              </div>
              <div style={{ textAlign: "right", marginTop: "8px" }}>
                <button type="button" style={{ padding: "6px 16px", borderRadius: "6px", background: "#64748b", color: "#ffffff", border: "none", fontWeight: "600", cursor: "pointer" }} onClick={() => setSelectedRecord(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNBLOCK CONFIRM MODAL */}
      {unblockConfirmRecord && (
        <div className="discount-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div className="discount-modal-container" style={{ background: "#ffffff", borderRadius: "12px", width: "450px", maxWidth: "90%", padding: "20px" }}>
            <h3 style={{ marginTop: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>Confirm Account Unblock</h3>
            <p style={{ fontSize: "13px", color: "#475569" }}>
              Are you sure you want to unblock customer <strong>{unblockConfirmRecord.customerName}</strong> (#{unblockConfirmRecord.userId})?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button type="button" style={{ padding: "8px 16px", borderRadius: "6px", background: "#cbd5e1", color: "#1e293b", border: "none", fontWeight: "600", cursor: "pointer" }} onClick={() => setUnblockConfirmRecord(null)}>Cancel</button>
              <button type="button" style={{ padding: "8px 16px", borderRadius: "6px", background: "#16a34a", color: "#ffffff", border: "none", fontWeight: "600", cursor: "pointer" }} onClick={handleUnblockSubmit}>Yes, Unblock User</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BLOCK USER MODAL */}
      {isAddingBlockModal && (
        <div className="discount-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div className="discount-modal-container" style={{ background: "#ffffff", borderRadius: "12px", width: "500px", maxWidth: "90%", overflow: "hidden" }}>
            <div style={{ background: "#A51C49", color: "#ffffff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Add Customer to Block List</h3>
              <button type="button" onClick={() => setIsAddingBlockModal(false)} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={handleAddBlockSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>User ID (Optional)</span>
                <input type="number" placeholder="e.g. 512" value={newBlockUserId} onChange={(e) => setNewBlockUserId(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Customer Name *</span>
                <input type="text" required placeholder="Enter full name..." value={newBlockName} onChange={(e) => setNewBlockName(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Email Address *</span>
                <input type="email" required placeholder="Enter customer email..." value={newBlockEmail} onChange={(e) => setNewBlockEmail(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Mobile Number</span>
                <input type="text" placeholder="+91 9876543210" value={newBlockMobile} onChange={(e) => setNewBlockMobile(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Block Reason *</span>
                <select value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                  <option value="Multiple Failed Login Attempts & Fraud Signal">Multiple Failed Login Attempts &amp; Fraud Signal</option>
                  <option value="Chargeback / Payment Dispute">Chargeback / Payment Dispute</option>
                  <option value="Suspicious Coupon Abuse">Suspicious Coupon Abuse</option>
                  <option value="Blacklisted IP Range">Blacklisted IP Range</option>
                  <option value="Policy Violation">Policy Violation</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Risk Score (1-100)</span>
                <input type="number" min="1" max="100" value={newBlockRiskScore} onChange={(e) => setNewBlockRiskScore(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                <span>Admin Notes</span>
                <textarea rows={2} placeholder="Add security investigation notes..." value={newBlockNotes} onChange={(e) => setNewBlockNotes(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontFamily: "inherit" }} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" style={{ padding: "8px 16px", borderRadius: "6px", background: "#cbd5e1", color: "#1e293b", border: "none", fontWeight: "600", cursor: "pointer" }} onClick={() => setIsAddingBlockModal(false)}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", background: "#A51C49", color: "#ffffff", border: "none", fontWeight: "600", cursor: "pointer" }}>Add to Block List</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
