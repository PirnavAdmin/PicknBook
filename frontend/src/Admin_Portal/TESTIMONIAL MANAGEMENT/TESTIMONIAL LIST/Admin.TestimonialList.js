/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Edit2, Trash2, Star, Search, Plus, Download, ChevronDown } from "lucide-react";
import { getAdminTestimonials, deleteAdminTestimonial, toggleTestimonialStatus } from "../../../services/testimonialService";
import { toApiAssetUrl } from "../../../services/apiClient";
import AdminPagination from "../../../components/AdminPagination";

export default function AdminTestimonialList() {
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
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
      const res = await getAdminTestimonials();
      const list = Array.isArray(res)
        ? res
        : (res?.testimonials || res?.data || res?.items || res?.results || res?.result || []);
      setTestimonials(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast("Failed to load testimonials.", "error");
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  // Close actions dropdown when clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const handleToggleStatus = async (id) => {
    try {
      await toggleTestimonialStatus(id);
      setTestimonials((prev) =>
        (Array.isArray(prev) ? prev : []).map((t) =>
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
      setTestimonials((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id));
      showToast("Testimonial deleted successfully.", "success");
      if (selectedTestimonial && selectedTestimonial.id === id) {
        setSelectedTestimonial(null);
      }
    } catch {
      showToast("Failed to delete testimonial.", "error");
    }
  };

  const safeTestimonials = Array.isArray(testimonials) ? testimonials : [];
  const filteredTestimonials = safeTestimonials
    .filter((t) => {
      if (!t || typeof t !== "object") return false;
      const s = searchQuery.trim().toLowerCase();
      if (!s) return true;
      const name = (t.name || t.Name || "").toLowerCase();
      const designation = (t.designation || t.Designation || t.role || t.Role || "").toLowerCase();
      const comment = (t.comment || t.Comment || t.message || t.Message || t.preview || "").toLowerCase();
      const category = (t.category || t.Category || t.categoryName || "").toLowerCase();
      const status = (t.status || t.Status || "").toLowerCase();
      const rating = String(t.rating ?? t.Rating ?? "");

      return (
        name.includes(s) ||
        designation.includes(s) ||
        comment.includes(s) ||
        category.includes(s) ||
        status.includes(s) ||
        rating.includes(s)
      );
    })
    .filter((t) => (statusFilter === "All" ? true : (t.status || t.Status || "").toLowerCase() === statusFilter.toLowerCase()));

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
    titleWrapper: {
      display: "flex",
      alignItems: "baseline",
      gap: "8px",
    },
    button: {
      padding: "6px 14px",
      borderRadius: "10px",
      border: "1px solid transparent",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "0.85rem",
      height: "36px",
      boxSizing: "border-box",
      whiteSpace: "nowrap",
    },
    addBtn: {
      background: "#fdf2f4",
      color: "#A51C49",
      borderColor: "#fbcfe8",
    },
    exportBtn: {
      background: "#ecfdf5",
      color: "#047857",
      borderColor: "#a7f3d0",
    },
    searchBox: {
      padding: "6px 12px 6px 36px",
      border: "1.5px solid var(--border, #cbd5e1)",
      borderRadius: "10px",
      fontSize: "0.85rem",
      width: "240px",
      outline: "none",
      transition: "all 0.2s ease",
      background: "var(--panel, #ffffff)",
      color: "var(--text-primary, #0f172a)",
      height: "36px",
      boxSizing: "border-box",
    },
    tableWrapper: {
      background: "var(--panel, #ffffff)",
      borderRadius: "14px",
      border: "1px solid var(--border, #e2e8f0)",
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
      background: "#A51C49",
      color: "#ffffff",
      fontWeight: 700,
    },
    th: {
      padding: "10px 14px",
      textAlign: "center",
      borderRight: "1px solid rgba(255, 255, 255, 0.2)",
      borderBottom: "1.5px solid #831843",
      whiteSpace: "nowrap",
      fontSize: "0.85rem",
      fontWeight: 600,
      height: "38px",
      verticalAlign: "middle",
      background: "#A51C49",
      color: "#ffffff",
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
      color: "#A51C49",
      minWidth: "26px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "26px",
      height: "26px",
      background: "rgba(165, 28, 73, 0.08)",
      borderRadius: "8px",
      fontSize: "0.8rem",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 12px",
      borderRadius: "8px",
      fontWeight: 600,
      fontSize: "0.8rem",
      border: "1px solid",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    statusActive: {
      background: "#ecfdf5",
      color: "#10b981",
      borderColor: "#a7f3d0",
    },
    statusInactive: {
      background: "#fef2f2",
      color: "#ef4444",
      borderColor: "#fecaca",
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

  const currentItems = filteredTestimonials.slice((page - 1) * pageSize, page * pageSize);

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

        {/* Title Heading */}
        <div style={{ marginBottom: "12px" }}>
          <div style={styles.titleWrapper}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Testimonial</h1>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-secondary)", margin: 0 }}>List</h2>
          </div>
        </div>

        {/* Action Controls Bar: Left Side Search, Right Side All Status, Export, + Add Testimonial */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <Search size={16} color="var(--text-secondary, #64748b)" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search testimonials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchBox}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 14px",
                borderRadius: "10px",
                border: "1.5px solid var(--border, #cbd5e1)",
                fontSize: "0.85rem",
                outline: "none",
                background: "var(--panel, #ffffff)",
                color: "var(--text-primary, #0f172a)",
                fontWeight: 600,
                cursor: "pointer",
                height: "36px",
                boxSizing: "border-box",
              }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              type="button"
              style={{ ...styles.button, ...styles.exportBtn }}
              onClick={handleExport}
            >
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button
              type="button"
              style={{ ...styles.button, ...styles.addBtn }}
              onClick={() => navigate("/admin/testimonial-management/add-testimonial")}
            >
              <Plus size={17} strokeWidth={2.5} />
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
              {currentItems.length > 0 ? (
                currentItems.map((t, index) => {
                  const rawImg = t.imageUrl || t.image || t.photo || t.imagePath || t.photoUrl || t.avatar || t.picture || t.url || t.filePath;
                  const imgSrc = rawImg ? toApiAssetUrl(rawImg) : "";
                  return (
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
                        <div style={{ position: "relative", width: "36px", height: "36px", margin: "0 auto" }}>
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={t.name || "Testimonial"}
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                display: "block",
                                border: "1px solid var(--border, #cbd5e1)",
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #A51C49, #851237)",
                              color: "#ffffff",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              display: imgSrc ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto",
                              textTransform: "uppercase",
                              boxShadow: "0 2px 6px rgba(165, 28, 73, 0.25)",
                            }}
                          >
                            {(t.name && t.name.trim()) ? t.name.trim().charAt(0) : "T"}
                          </div>
                        </div>
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
                        <div style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === t.id ? null : t.id);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 14px",
                              borderRadius: "8px",
                              border: "1.5px solid var(--border, #cbd5e1)",
                              background: activeDropdownId === t.id ? "#fdf2f4" : "var(--panel, #ffffff)",
                              color: activeDropdownId === t.id ? "#A51C49" : "var(--text-primary, #0f172a)",
                              borderColor: activeDropdownId === t.id ? "#fbcfe8" : "var(--border, #cbd5e1)",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <span>Actions</span>
                            <ChevronDown size={14} />
                          </button>

                          {activeDropdownId === t.id && (
                            <div
                              style={{
                                position: "absolute",
                                ...(index >= currentItems.length - 2 || currentItems.length <= 3
                                  ? { bottom: "100%", marginBottom: "6px" }
                                  : { top: "100%", marginTop: "6px" }),
                                right: 0,
                                background: "#ffffff",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                                zIndex: 99999,
                                minWidth: "150px",
                                overflow: "hidden",
                                padding: "4px 0",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTestimonial(t);
                                  setActiveDropdownId(null);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "9px 14px",
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#334155",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <Eye size={14} color="#64748b" />
                                <span>View Details</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  navigate("/admin/testimonial-management/add-testimonial", {
                                    state: { editItem: t },
                                  });
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "9px 14px",
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#334155",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <Edit2 size={14} color="#64748b" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDelete(t.id);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "9px 14px",
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#ef4444",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <Trash2 size={14} color="#ef4444" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary, #64748b)" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>No data</div>
                    <div>No testimonials found matching search criteria.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Attached AdminPagination directly inside tableWrapper card */}
          <div style={{ borderTop: "1px solid var(--border, #e2e8f0)", padding: "4px 12px", background: "var(--panel, #ffffff)" }}>
            <AdminPagination
              currentPage={page}
              totalItems={filteredTestimonials.length}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              itemName="testimonials"
            />
          </div>
        </div>
      </div>
    </>
  );
}
