import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAdminQueries, updateQueryStatus, deleteAdminQuery } from "../../../services/queryService";
import { Eye, Edit2, Trash2, X, Search, ChevronDown, Filter, Download, Mail, Send } from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString || dateString === "-") return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const formatted = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `🗓️ ${formatted}`;
  } catch {
    return dateString;
  }
};

export default function AdminQueryList() {
  const toastTimerRef = useRef(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterMobile, setFilterMobile] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewQuery, setViewQuery] = useState(null);
  const [editStatusQuery, setEditStatusQuery] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Email Format Reply Modal states
  const [emailModalQuery, setEmailModalQuery] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState("Replied");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (message, tone = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  };

  const loadQueries = async () => {
    try {
      setLoading(true);
      const data = await getAdminQueries();
      setQueries(data || []);
    } catch (err) {
      showToast("Failed to load queries.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, typeFilter, filterName, filterMobile]);

  const openEmailModal = (query, defaultStatus = "Replied") => {
    setEmailModalQuery(query);
    setEmailStatus(defaultStatus);
    setEmailSubject(`Re: ${query.subject || "Support Inquiry"}`);
    setEmailMessage(
      query.replyMessage ||
        `Hello ${query.name || "Customer"},\n\nThank you for reaching out to PickNBook Support regarding "${query.subject || "your inquiry"}".\n\nWe have reviewed your request. If you have any further questions, please let us know.\n\nWarm regards,\nPickNBook Support Team`
    );
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailModalQuery) return;
    try {
      setSendingEmail(true);
      await updateQueryStatus(emailModalQuery.id, {
        status: emailStatus,
        replyMessage: emailMessage,
      });
      setQueries((prev) =>
        prev.map((q) =>
          q.id === emailModalQuery.id
            ? { ...q, status: emailStatus, replyMessage: emailMessage }
            : q
        )
      );
      showToast("Reply email sent and query status updated successfully.", "success");
      setEmailModalQuery(null);
    } catch {
      showToast("Failed to send reply email.", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editStatusQuery) return;

    if (newStatus === "Replied" || newStatus === "Resolved") {
      const targetQuery = editStatusQuery;
      setEditStatusQuery(null);
      openEmailModal(targetQuery, newStatus);
      return;
    }

    try {
      await updateQueryStatus(editStatusQuery.id, newStatus);
      setQueries((prev) =>
        prev.map((q) => (q.id === editStatusQuery.id ? { ...q, status: newStatus } : q))
      );
      showToast("Status updated successfully.", "success");
      setEditStatusQuery(null);
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;
    try {
      await deleteAdminQuery(id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
      showToast("Query deleted successfully.", "success");
      if (viewQuery && viewQuery.id === id) {
        setViewQuery(null);
      }
      if (editStatusQuery && editStatusQuery.id === id) {
        setEditStatusQuery(null);
      }
    } catch {
      showToast("Failed to delete query.", "error");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterName("");
    setFilterMobile("");
    setStatusFilter("All");
    setTypeFilter("All");
    setFilterOpen(false);
  };

  const filteredQueries = queries
    .filter((q) => {
      if (!searchQuery || !searchQuery.trim()) return true;
      const s = searchQuery.trim().toLowerCase();
      return (
        (q.name || "").toLowerCase().includes(s) ||
        (q.email || "").toLowerCase().includes(s) ||
        (q.phoneNo || "").toLowerCase().includes(s) ||
        (q.subject || "").toLowerCase().includes(s) ||
        (q.message || "").toLowerCase().includes(s) ||
        (q.status || "").toLowerCase().includes(s)
      );
    })
    .filter((q) => (!filterName.trim() ? true : (q.name || "").toLowerCase().includes(filterName.trim().toLowerCase())))
    .filter((q) => (!filterMobile.trim() ? true : (q.phoneNo || "").toLowerCase().includes(filterMobile.trim().toLowerCase())))
    .filter((q) => (statusFilter === "All" || !statusFilter ? true : (q.status || "").toLowerCase() === statusFilter.toLowerCase()))
    .filter((q) => (typeFilter === "All" || !typeFilter ? true : (q.subject || "").toLowerCase() === typeFilter.toLowerCase()));

  // Unique query types (subjects) for dropdown filter
  const queryTypes = Array.from(new Set(queries.map((q) => q.subject).filter(Boolean)));

  const handleExport = () => {
    const header = ["ID", "Entry Date", "Query Type", "Module", "Name", "Email", "Mobile", "Message", "Status"];
    const rows = filteredQueries.map((q) => [
      q.id,
      formatDate(q.createdAtUtc || q.entryDate),
      q.subject || "ContactUs",
      "B2C",
      q.name,
      q.email,
      q.phoneNo || "-",
      q.message,
      q.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "queries_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Export completed.", "success");
  };

  const styles = {
    container: {
      padding: "12px 16px",
      background: "var(--page-bg)",
      minHeight: "100vh",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
      gap: "16px",
      flexWrap: "wrap",
    },
    titleWrapper: {
      display: "flex",
      alignItems: "baseline",
      gap: "8px",
    },
    titleMain: {
      fontSize: "1.8rem",
      fontWeight: 400,
      color: "var(--text-primary)",
      margin: 0,
    },
    titleSub: {
      fontSize: "1.8rem",
      fontWeight: 400,
      color: "var(--text-secondary)",
      margin: 0,
    },
    actions: {
      display: "flex",
      gap: "10px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    button: {
      padding: "8px 14px",
      borderRadius: "8px",
      border: "1px solid transparent",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "0.85rem",
    },
    filterBtn: {
      background: "var(--primary)",
      color: "#ffffff",
      borderColor: "var(--primary)",
    },
    clearBtn: {
      background: "var(--panel)",
      color: "var(--text-primary)",
      borderColor: "var(--border)",
    },
    exportBtn: {
      background: "var(--success)",
      color: "#ffffff",
      borderColor: "var(--success)",
    },
    searchBox: {
      padding: "8px 12px",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "0.85rem",
      width: "200px",
      outline: "none",
      transition: "all 0.2s ease",
      background: "var(--panel)",
      color: "var(--text-primary)",
    },
    filterPanel: {
      marginTop: "12px",
      padding: "14px",
      borderRadius: "12px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      boxShadow: "var(--shadow-sm)",
      display: "grid",
      gap: "12px",
      marginBottom: "16px",
    },
    filterRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "12px",
    },
    filterGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    filterLabel: {
      fontSize: "0.8rem",
      fontWeight: 700,
      color: "var(--text-secondary)",
    },
    filterSelect: {
      padding: "8px 10px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      color: "var(--text-primary)",
      fontSize: "0.85rem",
      outline: "none",
    },
    tableWrapper: {
      background: "var(--panel)",
      borderRadius: "14px",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.78rem",
    },
    thead: {
      background: "linear-gradient(90deg, var(--primary), var(--primary-strong))",
      color: "#ffffff",
      fontWeight: 700,
    },
    th: {
      padding: "8px 6px",
      textAlign: "center",
      borderRight: "1px solid rgba(255, 255, 255, 0.2)",
      whiteSpace: "nowrap",
      fontSize: "0.78rem",
      fontWeight: 600,
      height: "36px",
      verticalAlign: "middle",
      color: "#ffffff",
    },
    td: {
      padding: "6px 8px",
      borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
      color: "var(--text-primary)",
      textAlign: "center",
      height: "40px",
      fontSize: "0.78rem",
      whiteSpace: "nowrap",
    },
    tr: {
      transition: "background-color 0.2s ease",
      height: "40px",
    },
    sn: {
      fontWeight: 600,
      color: "var(--primary)",
      minWidth: "22px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "22px",
      height: "22px",
      background: "rgba(74, 15, 26, 0.08)",
      borderRadius: "6px",
      fontSize: "0.75rem",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: "6px",
      fontWeight: 600,
      fontSize: "0.72rem",
      border: "1px solid",
      textTransform: "capitalize",
    },
    statusResolved: {
      background: "rgba(30, 142, 62, 0.12)",
      color: "var(--success)",
      borderColor: "rgba(30, 142, 62, 0.3)",
    },
    statusPending: {
      background: "rgba(217, 48, 37, 0.12)",
      color: "var(--danger)",
      borderColor: "rgba(217, 48, 37, 0.3)",
    },
    statusReplied: {
      background: "rgba(0, 123, 255, 0.12)",
      color: "#007bff",
      borderColor: "rgba(0, 123, 255, 0.3)",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
      flexWrap: "nowrap",
      justifyContent: "center",
    },
    actionBtn: {
      width: "32px",
      height: "32px",
      borderRadius: "8px",
      border: "1.5px solid var(--border)",
      fontWeight: 700,
      fontSize: "0.8rem",
      cursor: "pointer",
      transition: "all 0.3s ease",
      background: "var(--surface-soft)",
      color: "var(--text-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      padding: "0",
    },
    deleteBtn: {
      background: "rgba(217, 48, 37, 0.15)",
      color: "var(--danger)",
      borderColor: "rgba(217, 48, 37, 0.35)",
    },
    toast: {
      padding: "10px 14px",
      borderRadius: "10px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      color: "var(--text-primary)",
      fontWeight: 600,
      fontSize: "0.85rem",
      marginBottom: "16px",
      boxShadow: "var(--shadow-sm)",
    },
    toastSuccess: {
      borderColor: "rgba(30, 142, 62, 0.4)",
      background: "rgba(30, 142, 62, 0.1)",
      color: "var(--success)",
    },
    toastError: {
      borderColor: "rgba(217, 48, 37, 0.4)",
      background: "rgba(217, 48, 37, 0.1)",
      color: "var(--danger)",
    },
    toastInfo: {
      borderColor: "rgba(74, 15, 26, 0.25)",
      background: "rgba(74, 15, 26, 0.08)",
      color: "var(--primary)",
    },
    paginationContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 24px",
      background: "var(--panel)",
      borderTop: "1px solid var(--border)",
      gap: "16px",
      flexWrap: "wrap",
    },
    paginationInfo: {
      fontSize: "0.85rem",
      color: "var(--text-secondary)",
      fontWeight: 600,
    },
    paginationButtons: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    pageBtn: {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      color: "var(--text-primary)",
      fontSize: "0.85rem",
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--text-secondary)",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    },
    modalContent: {
      background: "var(--panel)",
      border: "1.5px solid var(--border)",
      borderRadius: "14px",
      width: "90%",
      maxWidth: "500px",
      padding: "24px",
      boxShadow: "var(--shadow)",
      position: "relative",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    modalTitle: {
      fontSize: "1.25rem",
      fontWeight: 700,
      color: "var(--text-primary)",
      margin: 0,
    },
    modalCloseBtn: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modalBody: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    detailItem: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    detailLabel: {
      fontSize: "0.75rem",
      color: "var(--text-soft)",
      fontWeight: 700,
    },
    detailVal: {
      fontSize: "0.9rem",
      color: "var(--text-primary)",
      background: "var(--surface-soft)",
      padding: "8px 12px",
      borderRadius: "8px",
      wordBreak: "break-all",
    },
    submitBtn: {
      background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
      color: "#ffffff",
      padding: "10px 16px",
      border: "none",
      borderRadius: "8px",
      fontWeight: 600,
      cursor: "pointer",
      marginTop: "12px",
      width: "100%",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
  };

  const getStatusBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    let specificStyle = styles.statusPending;
    if (s === "resolved") {
      specificStyle = styles.statusResolved;
    } else if (s === "replied") {
      specificStyle = styles.statusReplied;
    }
    return {
      ...styles.statusBadge,
      ...specificStyle,
    };
  };

  const totalPages = Math.ceil(filteredQueries.length / pageSize) || 1;

  return (
    <>
      <style>{`
        select:hover {
          background-color: rgba(74, 15, 26, 0.05) !important;
          border-color: var(--primary) !important;
        }
        select:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(74, 15, 26, 0.15) !important;
        }
        th, .admin-table-head th {
          color: #ffffff !important;
        }
      `}</style>
      <div style={styles.container}>
        {toast && (
          <div
            style={{
              ...styles.toast,
              ...(toast.tone === "success"
                ? styles.toastSuccess
                : toast.tone === "error"
                ? styles.toastError
                : styles.toastInfo),
            }}
          >
            {toast.message}
          </div>
        )}
        <div style={styles.header}>
          <div style={styles.titleWrapper}>
            <h1 style={styles.titleMain}>Query</h1>
            <h2 style={styles.titleSub}>List</h2>
          </div>
          <div style={styles.actions}>
            <input
              type="text"
              placeholder="Search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchBox}
            />
            <button
              style={{ ...styles.button, ...styles.filterBtn, display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--success)",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Total Records : {filteredQueries.length}
            </div>
            <button
              type="button"
              style={{ ...styles.button, ...styles.exportBtn, display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={handleExport}
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {filterOpen && (
          <div style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            marginBottom: "20px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              flexWrap: "wrap",
              width: "100%"
            }}>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Name</label>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--surface-soft)", color: "var(--text-primary)", fontSize: "0.82rem", outline: "none", height: "38px"
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Mobile Number</label>
                <input
                  type="text"
                  placeholder="Filter by mobile..."
                  value={filterMobile}
                  onChange={(e) => setFilterMobile(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--surface-soft)", color: "var(--text-primary)", fontSize: "0.82rem", outline: "none", height: "38px"
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--surface-soft)", color: "var(--text-primary)", fontSize: "0.82rem", outline: "none", height: "38px"
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Query Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--surface-soft)", color: "var(--text-primary)", fontSize: "0.82rem", outline: "none", height: "38px"
                  }}
                >
                  <option value="All">All Types</option>
                  {queryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", height: "38px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  style={{
                    height: "38px",
                    padding: "0 18px",
                    borderRadius: "8px",
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                    whiteSpace: "nowrap"
                  }}
                >
                  Apply Filter
                </button>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    height: "38px",
                    padding: "0 18px",
                    borderRadius: "8px",
                    border: "1px solid #64748b",
                    background: "#64748b",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(100, 116, 139, 0.2)",
                    whiteSpace: "nowrap"
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={{ ...styles.th, color: "#ffffff" }}>ID</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Entry Date</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Query Type</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Module</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Name</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Email</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Mobile</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Message</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Status</th>
                  <th style={{ ...styles.th, color: "#ffffff" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      Data not found
                    </td>
                  </tr>
                ) : (
                  filteredQueries.slice((page - 1) * pageSize, page * pageSize).map((q, index) => (
                    <tr
                      key={q.id}
                      style={styles.tr}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(74, 15, 26, 0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={styles.td}><span style={styles.sn}>{q.id}</span></td>
                      <td style={styles.td}>{formatDate(q.createdAtUtc || q.entryDate)}</td>
                      <td style={styles.td}>{q.subject || "ContactUs"}</td>
                      <td style={styles.td}>B2C</td>
                      <td style={{ ...styles.td, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }} title={q.name}>{q.name}</td>
                      <td style={{ ...styles.td, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }} title={q.email}>{q.email}</td>
                      <td style={styles.td}>{q.phoneNo || "-"}</td>
                      <td style={{ ...styles.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }} title={q.message}>
                        {q.message}
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(q.status)}>
                          {q.status || "Pending"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            className={`actions-trigger-btn ${openMenuId === q.id ? "active" : ""}`}
                            onClick={() => setOpenMenuId(openMenuId === q.id ? null : q.id)}
                          >
                            <span>Actions</span> <ChevronDown size={14} />
                          </button>

                          {openMenuId === q.id && (
                            <div
                              style={{
                                position: 'absolute',
                                ...(index >= filteredQueries.slice((page - 1) * pageSize, page * pageSize).length - 2 || filteredQueries.slice((page - 1) * pageSize, page * pageSize).length <= 3
                                  ? { bottom: '100%', marginBottom: '6px' }
                                  : { top: '100%', marginTop: '6px' }),
                                right: 0,
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 99999,
                                minWidth: '160px',
                                width: 'max-content',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                  borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#334155',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                                }}
                                onClick={() => { setOpenMenuId(null); setViewQuery(q); }}
                              >
                                <Eye size={15} /> <span>View Details</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                  borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#2563eb',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                                }}
                                onClick={() => { setOpenMenuId(null); openEmailModal(q, "Replied"); }}
                              >
                                <Mail size={15} /> <span>Reply Email</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                  borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#334155',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                                }}
                                onClick={() => { setOpenMenuId(null); setEditStatusQuery(q); setNewStatus(q.status || "Pending"); }}
                              >
                                <Edit2 size={15} /> <span>Edit Status</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                  borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#ef4444',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                                }}
                                onClick={() => { setOpenMenuId(null); handleDelete(q.id); }}
                              >
                                <Trash2 size={15} /> <span>Delete Query</span>
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

          {totalPages >= 1 && (
            <div style={styles.paginationContainer}>
              <div style={styles.paginationInfo}>
                Showing {filteredQueries.length === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredQueries.length)} of {filteredQueries.length} queries
              </div>
              <div style={styles.paginationButtons}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ ...styles.pageBtn, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? "default" : "pointer" }}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, padding: "0 8px" }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? "default" : "pointer" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {viewQuery && createPortal(
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999999, backdropFilter: "blur(4px)", padding: "20px", boxSizing: "border-box" }} onClick={() => setViewQuery(null)}>
            <div style={{ background: "var(--panel)", padding: "24px", borderRadius: "14px", width: "600px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Query Details</h3>
                <button type="button" onClick={() => setViewQuery(null)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text-primary)" }}>
                  Close
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Name</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{viewQuery.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Email</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{viewQuery.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Mobile</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{viewQuery.phoneNo || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Query Type</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{viewQuery.subject || "ContactUs"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Status</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{viewQuery.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Entry Date</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{formatDate(viewQuery.createdAtUtc || viewQuery.entryDate)}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Message</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", background: "var(--surface-soft)", padding: "12px", borderRadius: "8px", marginTop: "4px", wordBreak: "break-all" }}>{viewQuery.message}</div>
                </div>
                {viewQuery.replyMessage && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "0.75rem", color: "#007bff", fontWeight: 700 }}>Admin Reply Message</div>
                    <div style={{ fontSize: "0.9rem", color: "#1e293b", background: "rgba(0, 123, 255, 0.08)", border: "1px solid rgba(0, 123, 255, 0.2)", padding: "12px", borderRadius: "8px", marginTop: "4px", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{viewQuery.replyMessage}</div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {editStatusQuery && createPortal(
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999999, backdropFilter: "blur(4px)", padding: "20px", boxSizing: "border-box" }} onClick={() => setEditStatusQuery(null)}>
            <div style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "650px",
              maxWidth: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
            }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{
                background: "#A51C49",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative"
              }}>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.2rem", fontWeight: "700" }}>Edit Query</h3>
                <button
                  type="button"
                  onClick={() => setEditStatusQuery(null)}
                  style={{
                    position: "absolute",
                    right: "20px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleStatusUpdateSubmit}
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: "#ffffff"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Name</label>
                    <input type="text" value={editStatusQuery.name || ""} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Email</label>
                    <input type="email" value={editStatusQuery.email || ""} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Mobile</label>
                    <input type="text" value={editStatusQuery.phoneNo || ""} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Query Type</label>
                    <input type="text" value={editStatusQuery.subject || "ContactUs"} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Status</label>
                    <select
                      value={newStatus || editStatusQuery.status || "Pending"}
                      onChange={(e) => setNewStatus(e.target.value)}
                      style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#ffffff", color: "#111827", cursor: "pointer" }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved (Send Email)</option>
                      <option value="Replied">Replied (Send Email)</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Entry Date</label>
                    <input type="text" value={formatDate(editStatusQuery.createdAtUtc || editStatusQuery.entryDate)} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827" }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Message</label>
                  <textarea rows="3" value={editStatusQuery.message || ""} disabled style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#f9fafb", color: "#111827", resize: "none" }} />
                </div>
                <button type="submit" style={{ background: "#A51C49", color: "#ffffff", padding: "10px 16px", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", marginTop: "8px" }}>
                  {(newStatus === "Replied" || newStatus === "Resolved") ? "Continue to Compose Reply Email →" : "Save Changes"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

        {emailModalQuery && createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 999999,
              backdropFilter: "blur(4px)",
              padding: "20px",
              boxSizing: "border-box",
            }}
            onClick={() => setEmailModalQuery(null)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                width: "680px",
                maxWidth: "95%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
                border: "1px solid #e2e8f0",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #A51C49 0%, #7A1234 100%)",
                  padding: "16px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Mail size={22} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#ffffff" }}>
                      Send Reply Email
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModalQuery(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendEmailSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>To (Customer Email)</label>
                  <div style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc", fontSize: "13px", fontWeight: 600, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📧</span>
                    <span>{emailModalQuery.name} &lt;{emailModalQuery.email}&gt;</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", color: "#111827", outline: "none" }}
                  />
                </div>

                <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", padding: "12px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#856404", textTransform: "uppercase", marginBottom: "4px" }}>
                    📌 Customer Inquiry Reference
                  </div>
                  <div style={{ fontSize: "13px", color: "#333333", fontStyle: "italic", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    "{emailModalQuery.message}"
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Email Response Body</label>
                  <textarea
                    rows={7}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    required
                    style={{
                      padding: "12px",
                      border: "1.5px solid #94a3b8",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#0f172a",
                      lineHeight: "1.5",
                      resize: "vertical",
                      fontFamily: "inherit",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Set Query Status To</label>
                  <select
                    value={emailStatus}
                    onChange={(e) => setEmailStatus(e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", color: "#111827", cursor: "pointer", background: "#ffffff" }}
                  >
                    <option value="Replied">Replied</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setEmailModalQuery(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={sendingEmail}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #A51C49 0%, #7A1234 100%)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: sendingEmail ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(165, 28, 73, 0.3)"
                    }}
                  >
                    <Send size={15} />
                    <span>{sendingEmail ? "Sending Email..." : "Send Email & Update Status"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
