/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Edit2, Trash2, Star } from "lucide-react";
import { getAdminTestimonials, deleteAdminTestimonial, toggleTestimonialStatus } from "../../../services/testimonialService";
import { toApiAssetUrl } from "../../../services/apiClient";

export default function AdminTestimonialList() {
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [toast, setToast] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (message, tone = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  };

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      const data = await getAdminTestimonials();
      setTestimonials(data || []);
    } catch (err) {
      showToast("Failed to load testimonials.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const handleToggleStatus = async (id) => {
    try {
      await toggleTestimonialStatus(id);
      setTestimonials((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: t.status === "Active" ? "Inactive" : "Active" } : t
        )
      );
      showToast("Testimonial status updated.", "success");
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this testimonial?")) return;
    try {
      await deleteAdminTestimonial(id);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      showToast("Testimonial deleted successfully.", "success");
      if (selectedTestimonial && selectedTestimonial.id === id) {
        setSelectedTestimonial(null);
      }
    } catch {
      showToast("Failed to delete testimonial.", "error");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setPage(1);
    showToast("Filters cleared.", "info");
  };

  const filteredTestimonials = testimonials
    .filter((t) => {
      const s = searchQuery.toLowerCase();
      return (
        (t.name || "").toLowerCase().includes(s) ||
        (t.designation || "").toLowerCase().includes(s) ||
        (t.comment || t.message || "").toLowerCase().includes(s)
      );
    })
    .filter((t) => (statusFilter === "All" ? true : (t.status || "").toLowerCase() === statusFilter.toLowerCase()));

  const handleExport = () => {
    const header = ["ID", "Name", "Designation", "Rating", "Comment", "Status"];
    const rows = filteredTestimonials.map((t) => [
      t.id,
      t.name,
      t.designation,
      t.rating,
      t.comment || t.message,
      t.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "testimonials_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Export completed.", "success");
  };

  const styles = {
    container: {
      padding: "12px 24px",
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
      fontWeight: 500,
      color: "var(--text-primary)",
      margin: 0,
    },
    titleSub: {
      fontSize: "1.8rem",
      fontWeight: 500,
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
    addBtn: {
      background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
      color: "#ffffff",
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
      fontSize: "0.85rem",
    },
    thead: {
      background: "linear-gradient(90deg, var(--primary), var(--primary-strong))",
      color: "#ffffff",
      fontWeight: 700,
    },
    th: {
      padding: "6px 10px",
      textAlign: "center",
      borderRight: "1px solid rgba(255, 255, 255, 0.2)",
      whiteSpace: "nowrap",
      fontSize: "0.85rem",
      fontWeight: 600,
      height: "34px",
      verticalAlign: "middle",
    },
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
      color: "var(--text-primary)",
      textAlign: "center",
      height: "48px",
    },
    tr: {
      transition: "background-color 0.2s ease",
      height: "48px",
    },
    sn: {
      fontWeight: 600,
      color: "var(--primary)",
      minWidth: "26px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "26px",
      height: "26px",
      background: "rgba(74, 15, 26, 0.08)",
      borderRadius: "8px",
      fontSize: "0.8rem",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: "6px",
      fontWeight: 600,
      fontSize: "0.75rem",
      border: "1px solid",
      cursor: "pointer",
    },
    statusActive: {
      background: "rgba(30, 142, 62, 0.12)",
      color: "var(--success)",
      borderColor: "rgba(30, 142, 62, 0.3)",
    },
    statusInactive: {
      background: "rgba(217, 48, 37, 0.12)",
      color: "var(--danger)",
      borderColor: "rgba(217, 48, 37, 0.3)",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
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
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--text-secondary)",
    },
    detailCard: {
      padding: "16px",
      borderRadius: "14px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      boxShadow: "var(--shadow-sm)",
      marginBottom: "16px",
      display: "grid",
      gap: "12px",
    },
    detailHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    detailTitle: {
      fontWeight: 700,
      color: "var(--text-primary)",
    },
    detailGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "12px",
    },
    detailLabel: {
      fontSize: "0.75rem",
      color: "var(--text-secondary)",
      fontWeight: 700,
    },
    detailValue: {
      fontSize: "0.9rem",
      color: "var(--text-primary)",
      wordBreak: "break-word",
    },
    secondaryBtn: {
      padding: "6px 10px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      background: "var(--panel)",
      color: "var(--text-primary)",
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  const getStatusStyle = (status) => ({
    ...styles.statusBadge,
    ...(status === "Active" ? styles.statusActive : styles.statusInactive),
  });

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          fill={i <= rating ? "#f59e0b" : "transparent"}
          color={i <= rating ? "#f59e0b" : "#cbd5e1"}
          style={{ marginRight: "2px" }}
        />
      );
    }
    return <div style={{ display: "inline-flex" }}>{stars}</div>;
  };

  const totalPages = Math.ceil(filteredTestimonials.length / pageSize) || 1;

  return (
    <>
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
            <h1 style={styles.titleMain}>Testimonial</h1>
            <h2 style={styles.titleSub}>List</h2>
          </div>
          <div style={styles.actions}>
            <input
              type="text"
              placeholder="Search testimonials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchBox}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--border)",
                fontSize: "0.85rem",
                outline: "none",
                background: "var(--panel)",
                color: "var(--text-primary)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              type="button"
              style={{ ...styles.button, ...styles.clearBtn }}
              onClick={handleClearFilters}
            >
              Clear
            </button>
            <button
              type="button"
              style={{ ...styles.button, ...styles.exportBtn }}
              onClick={handleExport}
            >
              Export
            </button>
            <button
              type="button"
              style={{ ...styles.button, ...styles.addBtn }}
              onClick={() => navigate("/admin/testimonial-management/add-testimonial")}
            >
              Add Testimonial
            </button>
          </div>
        </div>

        {selectedTestimonial && (
          <div style={styles.detailCard}>
            <div style={styles.detailHeader}>
              <div style={styles.detailTitle}>Testimonial Details</div>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setSelectedTestimonial(null)}
              >
                Close
              </button>
            </div>
            <div style={styles.detailGrid}>
              <div>
                <div style={styles.detailLabel}>Name</div>
                <div style={styles.detailValue}>{selectedTestimonial.name}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Designation</div>
                <div style={styles.detailValue}>{selectedTestimonial.designation}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Rating</div>
                <div style={styles.detailValue}>{renderStars(selectedTestimonial.rating)}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Comment / Message</div>
                <div style={styles.detailValue}>{selectedTestimonial.comment || selectedTestimonial.message}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Status</div>
                <div style={styles.detailValue}>{selectedTestimonial.status}</div>
              </div>
            </div>
          </div>
        )}

        <div style={styles.tableWrapper}>
          {filteredTestimonials.length > 0 ? (
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>SN.</th>
                  <th style={styles.th}>Photo</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Designation</th>
                  <th style={styles.th}>Rating</th>
                  <th style={styles.th}>Comment</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTestimonials.slice((page - 1) * pageSize, page * pageSize).map((t, index) => (
                  <tr
                    key={t.id}
                    style={styles.tr}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(74, 15, 26, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={styles.td}>
                      <span style={styles.sn}>{((page - 1) * pageSize) + index + 1}</span>
                    </td>
                    <td style={styles.td}>
                      {t.imageUrl || t.image ? (
                        <img
                          src={toApiAssetUrl(t.imageUrl || t.image)}
                          alt={t.name}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={styles.td}>{t.name}</td>
                    <td style={styles.td}>{t.designation}</td>
                    <td style={styles.td}>{renderStars(t.rating)}</td>
                    <td
                      style={{
                        ...styles.td,
                        maxWidth: "240px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={t.comment || t.message}
                    >
                      {t.comment || t.message}
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={getStatusStyle(t.status)}
                        onClick={() => handleToggleStatus(t.id)}
                      >
                        {t.status || "Active"}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          type="button"
                          style={styles.actionBtn}
                          title="View Details"
                          onClick={() => setSelectedTestimonial(t)}
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          style={styles.actionBtn}
                          title="Edit"
                          onClick={() =>
                            navigate(`/admin/testimonial-management/add-testimonial`, {
                              state: { editItem: t },
                            })
                          }
                        >
                          <Edit2 size={16} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                          title="Delete"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "10px" }}>No data</div>
              <p>No testimonials found matching search criteria.</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  cursor: "pointer",
                }}
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
