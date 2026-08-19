/* eslint-disable */
import React, { useState, useMemo } from "react";
import { 
  Check, Pencil, Trash2, X, Plus, Search, RotateCcw, Save, 
  ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminList } from "../../utils/adminPortalStorage";

const DEFAULT_SEO_LINKS = [
  { id: 1, pageKeyword: "Flights", seoUrl: "/flights", redirectType: "301 Permanent", status: "Active", description: "Main flights booking directory" },
  { id: 2, pageKeyword: "Hotels", seoUrl: "/hotels", redirectType: "301 Permanent", status: "Active", description: "Hotels search index page" },
  { id: 3, pageKeyword: "Buses", seoUrl: "/buses", redirectType: "301 Permanent", status: "Active", description: "Bus booking search route" },
  { id: 4, pageKeyword: "Blog", seoUrl: "/blog", redirectType: "302 Temporary", status: "Active", description: "Travel updates and articles blog feed" },
  { id: 5, pageKeyword: "About Us", seoUrl: "/about-us", redirectType: "301 Permanent", status: "Inactive", description: "Corporate info page" }
];

function SeoLinkList() {
  const [items, setItems] = useAdminList("placeholder-admin-site-management-seo-link-list", DEFAULT_SEO_LINKS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [crudError, setCrudError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  // Filter items based on search input
  const filteredItems = useMemo(() => {
    return items.filter(x => 
      String(x.pageKeyword || "").toLowerCase().includes(search.toLowerCase()) ||
      String(x.seoUrl || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);
  const paginatedItems = filteredItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleOpenAdd = () => {
    setEditItem({
      id: Date.now(),
      pageKeyword: "",
      seoUrl: "",
      redirectType: "301 Permanent",
      status: "Active",
      description: "",
      isNew: true
    });
    setShowForm(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem({ ...item, isNew: false });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editItem.pageKeyword) {
      setCrudError("Page / Keyword is required.");
      return;
    }
    if (!editItem.seoUrl) {
      setCrudError("SEO Friendly URL is required.");
      return;
    }

    // Sanitize SEO Friendly URL: ensure it starts with /
    let sanitizedUrl = editItem.seoUrl.trim();
    if (!sanitizedUrl.startsWith("/")) {
      sanitizedUrl = "/" + sanitizedUrl;
    }

    const updatedItem = {
      ...editItem,
      seoUrl: sanitizedUrl
    };

    if (editItem.isNew) {
      setItems(prev => [...prev, updatedItem]);
      showToast("SEO link redirect added successfully!");
    } else {
      setItems(prev => prev.map(x => x.id === editItem.id ? updatedItem : x));
      showToast("SEO link redirect updated successfully!");
    }

    setShowForm(false);
    setEditItem(null);
    setCrudError("");
  };

  const performDelete = () => {
    if (deleteItem) {
      setItems(prev => prev.filter(x => x.id !== deleteItem.id));
      showToast("SEO link redirect deleted successfully!");
      setDeleteItem(null);
    }
  };

  return (
    <div style={{ padding: "24px 32px", minHeight: "100%", width: "100%", boxSizing: "border-box" }}>
      {/* Toast */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "#ecfdf5",
          border: "1px solid #10b981",
          color: "#065f46",
          padding: "12px 24px",
          borderRadius: "10px",
          fontSize: "0.88rem",
          fontWeight: "bold",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
          zIndex: 9999
        }}>
          ✅ {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, display: "flex", gap: "6px", alignItems: "center" }}>
        <Link to="/admin" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
        <span>&gt;</span>
        <Link to="/admin/site-management" style={{ color: "#64748b", textDecoration: "none" }}>Site Management</Link>
        <span>&gt;</span>
        {showForm ? (
          <>
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => { setShowForm(false); setEditItem(null); }}>SEO Links</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Add / Edit</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>SEO Links</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {showForm ? "Add / Edit SEO Link" : "SEO Links"}
          </h1>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              background: "#A51C49",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
            }}
          >
            <Plus size={16} /> Add SEO Link
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSave} style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.01)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 32px", marginBottom: "28px" }}>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              PAGE / KEYWORD *
              <input
                type="text"
                required
                placeholder="Enter page name or keyword"
                value={editItem.pageKeyword}
                onChange={e => setEditItem(prev => ({ ...prev, pageKeyword: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              SEO FRIENDLY URL *
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{
                  padding: "10px 14px",
                  borderRadius: "8px 0 0 8px",
                  border: "1px solid #cbd5e1",
                  borderRight: "none",
                  background: "#f1f5f9",
                  fontSize: "0.88rem",
                  color: "#475569",
                  fontWeight: "bold"
                }}>/</span>
                <input
                  type="text"
                  required
                  placeholder="Enter seo url"
                  value={editItem.seoUrl.startsWith("/") ? editItem.seoUrl.substring(1) : editItem.seoUrl}
                  onChange={e => setEditItem(prev => ({ ...prev, seoUrl: e.target.value }))}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: "0 8px 8px 0", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                />
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              REDIRECT TYPE
              <select
                value={editItem.redirectType}
                onChange={e => setEditItem(prev => ({ ...prev, redirectType: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff" }}
              >
                <option value="301 Permanent">301 Permanent</option>
                <option value="302 Temporary">302 Temporary</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              STATUS *
              <select
                value={editItem.status}
                onChange={e => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff" }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600, gridColumn: "1 / -1" }}>
              DESCRIPTION
              <textarea
                placeholder="Enter description (optional)"
                rows={3}
                value={editItem.description}
                onChange={e => setEditItem(prev => ({ ...prev, description: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", resize: "none" }}
              />
            </label>
          </div>

          {crudError && (
            <p style={{ margin: "0 0 16px", color: "#ef4444", fontSize: "0.78rem", fontWeight: "bold" }}>⚠️ {crudError}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #edf2f7", paddingTop: "20px" }}>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditItem(null); setCrudError(""); }}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontWeight: 600,
                fontSize: "0.84rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#A51C49",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.84rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(165, 28, 73, 0.2)"
              }}
            >
              Save Link
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Search Filter Bar */}
          <div style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center"
          }}>
            <div style={{ position: "relative", minWidth: "300px" }}>
              <input
                type="text"
                placeholder="Search page or keyword..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a" }}
              />
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            </div>
          </div>

          {/* SEO links redirect table */}
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.01)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#A51C49", color: "#ffffff" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "60px" }}>#</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "200px" }}>Page / Keyword</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "220px" }}>SEO Friendly URL</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Redirect Type</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px" }}>Status</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                      No SEO Friendly URLs configured. Click "Add SEO Link" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const serialNum = (page - 1) * rowsPerPage + idx + 1;
                    const isActive = item.status === "Active";
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px", color: "#475569", fontWeight: 500 }}>{serialNum}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{item.pageKeyword}</td>
                        <td style={{ padding: "14px 16px", color: "#16a34a", fontWeight: 600 }}>{item.seoUrl}</td>
                        <td style={{ padding: "14px 16px", color: "#475569" }}>{item.redirectType || "301 Permanent"}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: isActive ? "#dcfce7" : "#fee2e2",
                            color: isActive ? "#15803d" : "#b91c1c"
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              style={{
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                padding: "6px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: "#475569",
                                display: "inline-flex"
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteItem(item)}
                              style={{
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                background: "rgba(239, 68, 68, 0.04)",
                                padding: "6px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: "#ef4444",
                                display: "inline-flex"
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff"
              }}>
                <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                  Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredItems.length)} of {filteredItems.length} entries
                </div>

                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      cursor: page === 1 ? "default" : "pointer",
                      color: page === 1 ? "#cbd5e1" : "#334155"
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    const isActive = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: isActive ? "none" : "1px solid #e2e8f0",
                          background: isActive ? "#A51C49" : "#ffffff",
                          color: isActive ? "#ffffff" : "#334155",
                          fontWeight: isActive ? 700 : 500,
                          fontSize: "0.78rem",
                          cursor: "pointer"
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      cursor: page === totalPages ? "default" : "pointer",
                      color: page === totalPages ? "#cbd5e1" : "#334155"
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Custom Full-Screen Delete Modal */}
      {deleteItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "grid",
          placeItems: "center"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "400px",
            padding: "32px 28px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Confirm Delete</h3>
            <p style={{ margin: "0 0 28px", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.45 }}>
              Are you sure you want to delete the SEO link for <strong>{deleteItem.pageKeyword}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performDelete}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeoLinkList;
