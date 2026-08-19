/* eslint-disable */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Check, Pencil, Trash2, X, Plus, Search, RotateCcw, Save, 
  ChevronLeft, ChevronRight, Facebook, Instagram, Twitter, Linkedin, Youtube,
  Globe, Link as LinkIcon, Image as ImageIcon, List, Shield, Info, AlertTriangle, Upload
} from "lucide-react";
import { useAdminList } from "../../utils/adminPortalStorage";

const DEFAULT_SOCIAL_LINKS = [
  { id: 1, platform: "Facebook", url: "https://www.facebook.com/picknbook", displayOrder: 1, status: "Active" },
  { id: 2, platform: "Instagram", url: "https://www.instagram.com/picknbook", displayOrder: 2, status: "Active" },
  { id: 3, platform: "Twitter", url: "https://twitter.com/picknbook", displayOrder: 3, status: "Active" },
  { id: 4, platform: "Linkedin", url: "https://www.linkedin.com/company/picknbook", displayOrder: 4, status: "Active" },
  { id: 5, platform: "YouTube", url: "https://www.youtube.com/picknbook", displayOrder: 5, status: "Inactive" }
];

function SocialLinks() {
  const [items, setItems] = useAdminList("placeholder-admin-site-management-social-links", DEFAULT_SOCIAL_LINKS);
  
  // View states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ platform: "Facebook", url: "", displayOrder: "", status: "Active" });
  
  // Edit & Delete popups (centered modals)
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  
  const [toast, setToast] = useState({ show: false, message: "" });
  const [crudError, setCrudError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(items.length / rowsPerPage);
  const paginatedItems = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const getPlatformIcon = (platform) => {
    const p = String(platform || "").toLowerCase();
    const style = { width: "18px", height: "18px" };
    if (p.includes("facebook")) return <Facebook style={{ ...style, color: "#1877f2" }} />;
    if (p.includes("instagram")) return <Instagram style={{ ...style, color: "#e1306c" }} />;
    if (p.includes("twitter")) return <Twitter style={{ ...style, color: "#1da1f2" }} />;
    if (p.includes("linkedin")) return <Linkedin style={{ ...style, color: "#0a66c2" }} />;
    if (p.includes("youtube")) return <Youtube style={{ ...style, color: "#ff0000" }} />;
    return <Globe style={{ ...style, color: "#64748b" }} />;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!addForm.url) {
      setCrudError("URL is required.");
      return;
    }
    const newItem = {
      id: Date.now(),
      platform: addForm.platform,
      url: addForm.url,
      displayOrder: Number(addForm.displayOrder || items.length + 1),
      status: addForm.status
    };
    setItems(prev => [...prev, newItem]);
    showToast("Social link added successfully!");
    setShowAddForm(false);
    setAddForm({ platform: "Facebook", url: "", displayOrder: "", status: "Active" });
    setCrudError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editItem.url) {
      setCrudError("URL is required.");
      return;
    }
    setItems(prev => prev.map(x => x.id === editItem.id ? {
      ...x,
      platform: editItem.platform,
      url: editItem.url,
      displayOrder: Number(editItem.displayOrder),
      status: editItem.status
    } : x));
    showToast("Social link updated successfully!");
    setEditItem(null);
    setCrudError("");
  };

  const performDelete = () => {
    if (deleteItem) {
      setItems(prev => prev.filter(x => x.id !== deleteItem.id));
      showToast("Social link deleted successfully!");
      setDeleteItem(null);
    }
  };

  return (
    <div style={{ padding: "24px 32px", minHeight: "100%", width: "100%", boxSizing: "border-box", background: "#f8fafc" }}>
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
        {showAddForm ? (
          <>
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => setShowAddForm(false)}>Social Links</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Add</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>Social Links</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {showAddForm ? "Add Social Link" : "Social Links"}
          </h1>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setCrudError(""); }}
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
            <Plus size={16} /> Add Social Link
          </button>
        )}
      </div>

      {showAddForm ? (
        /* New Add Form Page matching Image-2 card style (Full-Width) */
        <div style={{
          width: "100%",
          margin: "0 0 32px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}>
          {/* Crimson Header Bar */}
          <div style={{
            background: "linear-gradient(135deg, #A51C49 0%, #7e1236 100%)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            position: "relative"
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}>
              <Globe size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                Add Social Link
              </div>
              <div style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.2 }}>
                Add a new social media platform link
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex"
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCreate} style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px", marginBottom: "20px" }}>
              
              {/* Platform Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  color: "#A51C49",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Globe size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#9f1239", letterSpacing: "0.02em" }}>Platform *</span>
                  <select
                    value={addForm.platform}
                    onChange={e => setAddForm(prev => ({ ...prev, platform: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.85rem",
                      background: "#ffffff",
                      height: "38px"
                    }}
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter">Twitter</option>
                    <option value="Linkedin">Linkedin</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>
              </div>

              {/* Icon Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  color: "#A51C49",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <ImageIcon size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#9f1239", letterSpacing: "0.02em" }}>Icon *</span>
                  <select
                    value={addForm.platform} // default to Platform icon
                    disabled
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.85rem",
                      background: "#f1f5f9",
                      height: "38px",
                      color: "#64748b"
                    }}
                  >
                    <option value={addForm.platform}>Select {addForm.platform} Icon</option>
                  </select>
                </div>
              </div>

              {/* URL Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  color: "#A51C49",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <LinkIcon size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#9f1239", letterSpacing: "0.02em" }}>URL *</span>
                  <input
                    type="text"
                    required
                    placeholder="https://example.com/your-profile"
                    value={addForm.url}
                    onChange={e => setAddForm(prev => ({ ...prev, url: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.85rem",
                      height: "38px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Display Order Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  color: "#A51C49",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <List size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#9f1239", letterSpacing: "0.02em" }}>Display Order *</span>
                  <input
                    type="number"
                    required
                    placeholder="Enter display order"
                    value={addForm.displayOrder}
                    onChange={e => setAddForm(prev => ({ ...prev, displayOrder: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.85rem",
                      height: "38px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  color: "#A51C49",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Shield size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", height: "40px" }}>
                  <button
                    type="button"
                    onClick={() => setAddForm(prev => ({ ...prev, status: prev.status === "Active" ? "Inactive" : "Active" }))}
                    style={{
                      position: "relative",
                      width: "46px",
                      height: "22px",
                      borderRadius: "11px",
                      background: addForm.status === "Active" ? "#A51C49" : "#cbd5e1",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      padding: 0,
                      outline: "none"
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: "2px",
                      left: addForm.status === "Active" ? "26px" : "2px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "left 0.2s"
                    }} />
                  </button>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>Active</span>
                </div>
              </div>

            </div>

            {crudError && (
              <p style={{ margin: "0 0 16px", color: "#ef4444", fontSize: "0.78rem", fontWeight: "bold" }}>⚠️ {crudError}</p>
            )}

            {/* Pink Notice Box */}
            <div style={{
              background: "#fff1f2",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#9f1239",
              fontSize: "0.78rem",
              fontWeight: 500,
              border: "1px solid #fecdd3",
              marginBottom: "20px"
            }}>
              <Info size={14} style={{ color: "#e11d48", flexShrink: 0 }} />
              <span>Only active social links will be displayed on the website.</span>
            </div>

            {/* Form Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(165, 28, 73, 0.2)"
                }}
              >
                Save Social Link &rarr;
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Social Links List Table */
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.01)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#A51C49", color: "#ffffff" }}>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "60px" }}>#</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Platform</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "80px", textAlign: "center" }}>Icon</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>URL</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "140px" }}>Display Order</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px" }}>Status</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, idx) => {
                const serialNum = (page - 1) * rowsPerPage + idx + 1;
                const isActive = item.status === "Active";
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", color: "#475569", fontWeight: 500 }}>{serialNum}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{item.platform}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0"
                      }}>
                        {getPlatformIcon(item.platform)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                        {item.url}
                      </a>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>{item.displayOrder}</td>
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
                          onClick={() => setEditItem({ ...item })}
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
              })}
            </tbody>
          </table>

          {/* Pagination */}
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
                Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, items.length)} of {items.length} entries
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
      )}

      {/* Centered Modal Dialog with Backdrop Overlay for EDIT (Matching Image-3 Top) */}
      {editItem && (
        <div 
          onClick={() => setEditItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 9998,
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center"
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "580px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "24px 28px 20px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderBottom: "1px solid #f1f5f9"
            }}>
              {/* Circular network logo */}
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fff1f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#A51C49",
                flexShrink: 0
              }}>
                <Globe size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Edit Social Link
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Update the social media platform details.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditItem(null)} 
                style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 2-Column Form Fields */}
            <form onSubmit={handleUpdate} style={{ padding: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", marginBottom: "28px" }}>
                
                {/* Column 1 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Platform */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Platform *</span>
                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", display: "inline-flex" }}>
                        {getPlatformIcon(editItem.platform)}
                      </span>
                      <select
                        value={editItem.platform}
                        onChange={e => setEditItem(prev => ({ ...prev, platform: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff", height: "42px", fontWeight: 500 }}
                      >
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Linkedin">Linkedin</option>
                        <option value="YouTube">YouTube</option>
                      </select>
                    </div>
                  </label>

                  {/* URL */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>URL *</span>
                    <input
                      type="text"
                      required
                      value={editItem.url}
                      onChange={e => setEditItem(prev => ({ ...prev, url: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>

                  {/* Status */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Status *</span>
                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                      <span style={{
                        position: "absolute",
                        left: "14px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: editItem.status === "Active" ? "#22c55e" : "#ef4444"
                      }} />
                      <select
                        value={editItem.status}
                        onChange={e => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px 10px 30px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff", height: "42px", fontWeight: 500 }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </label>
                </div>

                {/* Column 2 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Icon Selection */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Icon *</span>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", height: "42px" }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#fff1f2",
                        border: "1px solid #cbd5e1"
                      }}>
                        {getPlatformIcon(editItem.platform)}
                      </div>
                      <button 
                        type="button" 
                        style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "6px", 
                          border: "1px solid #cbd5e1", 
                          padding: "8px 16px", 
                          borderRadius: "8px", 
                          background: "#fff", 
                          cursor: "pointer", 
                          fontSize: "0.8rem", 
                          fontWeight: 600,
                          color: "#334155" 
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Display Order */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Display Order *</span>
                    <input
                      type="number"
                      required
                      value={editItem.displayOrder}
                      onChange={e => setEditItem(prev => ({ ...prev, displayOrder: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>
                </div>

              </div>

              {crudError && (
                <p style={{ margin: "0 0 16px", color: "#ef4444", fontSize: "0.78rem", fontWeight: "bold" }}>⚠️ {crudError}</p>
              )}

              {/* Form Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.82rem",
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
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
                  }}
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Centered Delete Modal Dialog with Backdrop Overlay (Matching Image-3 Bottom) */}
      {deleteItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "grid",
          placeItems: "center"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "20px",
            width: "90%",
            maxWidth: "460px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              padding: "28px 32px 16px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "16px"
            }}>
              {/* Circular trash icon inside light red badge */}
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fff1f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e11d48",
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Delete Social Link
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Are you sure you want to delete this social link?
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteItem(null)} 
                style={{ position: "absolute", top: "28px", right: "28px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pink Warning notice box */}
            <div style={{ padding: "0 32px 12px" }}>
              <div style={{
                background: "#fff1f2",
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#9f1239",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "1px solid #fecdd3"
              }}>
                <Info size={16} style={{ color: "#e11d48", flexShrink: 0 }} />
                <span>Deleting this social link will remove it from the website.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              padding: "16px 32px 28px",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end"
            }}>
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                style={{
                  padding: "10px 24px",
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
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
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

export default SocialLinks;
