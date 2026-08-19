/* eslint-disable */
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Check, Pencil, Trash2, X, Plus, Search, RotateCcw, Save, 
  ChevronLeft, ChevronRight, FileText, Type, AlignLeft, Tag, Shield, Info, AlertTriangle, Upload
} from "lucide-react";
import { useAdminList } from "../../utils/adminPortalStorage";

const DEFAULT_META_DATA = [
  { id: 1, pageName: "Home Page", metaTitle: "Best Travel Deals | PickNBook", metaDescription: "Book flights, hotels, buses at best price. Experience seamless travel booking.", metaKeywords: "flights, hotels, buses, travel booking", status: "Active" },
  { id: 2, pageName: "Flight Search", metaTitle: "Book Cheap Flights Online", metaDescription: "Search and book cheapest flights online. Compare airlines and get the best offers.", metaKeywords: "cheap flights, airline tickets, flight booking", status: "Active" },
  { id: 3, pageName: "Hotel Search", metaTitle: "Best Hotel Deals Online", metaDescription: "Find and book best hotels at lowest price. Check customer reviews and ratings.", metaKeywords: "hotel booking, cheap hotels, hotels online", status: "Active" },
  { id: 4, pageName: "About Us", metaTitle: "About PickNBook", metaDescription: "Know more about PickNBook history, team, values and our mission to simplify travel.", metaKeywords: "about us, corporate travel, picknbook profile", status: "Inactive" },
  { id: 5, pageName: "Contact Us", metaTitle: "Contact PickNBook", metaDescription: "Get in touch with PickNBook support team for any queries or help with bookings.", metaKeywords: "contact support, picknbook help, email support", status: "Active" }
];

function MetaDataList() {
  const [items, setItems] = useAdminList("placeholder-admin-site-management-meta-data-list", DEFAULT_META_DATA);
  
  // View states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ pageName: "Home Page", metaTitle: "", metaDescription: "", metaKeywords: "", status: "Active" });

  // Edit & Delete popups (centered modals)
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [crudError, setCrudError] = useState("");

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  // Filter items based on search input
  const filteredItems = useMemo(() => {
    return items.filter(x => 
      String(x.pageName || "").toLowerCase().includes(search.toLowerCase()) ||
      String(x.metaTitle || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);
  const paginatedItems = filteredItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!addForm.pageName) {
      setCrudError("Page Name is required.");
      return;
    }
    if (!addForm.metaTitle) {
      setCrudError("Meta Title is required.");
      return;
    }
    const newItem = {
      id: Date.now(),
      pageName: addForm.pageName,
      metaTitle: addForm.metaTitle,
      metaDescription: addForm.metaDescription || "",
      metaKeywords: addForm.metaKeywords || "",
      status: addForm.status
    };
    setItems(prev => [...prev, newItem]);
    showToast("Meta data added successfully!");
    setShowAddForm(false);
    setAddForm({ pageName: "Home Page", metaTitle: "", metaDescription: "", metaKeywords: "", status: "Active" });
    setCrudError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editItem.pageName) {
      setCrudError("Page Name is required.");
      return;
    }
    if (!editItem.metaTitle) {
      setCrudError("Meta Title is required.");
      return;
    }
    setItems(prev => prev.map(x => x.id === editItem.id ? {
      ...x,
      pageName: editItem.pageName,
      metaTitle: editItem.metaTitle,
      metaDescription: editItem.metaDescription,
      metaKeywords: editItem.metaKeywords,
      status: editItem.status
    } : x));
    showToast("Meta data updated successfully!");
    setEditItem(null);
    setCrudError("");
  };

  const performDelete = () => {
    if (deleteItem) {
      setItems(prev => prev.filter(x => x.id !== deleteItem.id));
      showToast("Meta data deleted successfully!");
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
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => setShowAddForm(false)}>SEO / Meta Data</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Add</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>SEO / Meta Data</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {showAddForm ? "Add SEO / Meta Data" : "SEO / Meta Data"}
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
            <Plus size={16} /> Add Meta Data
          </button>
        )}
      </div>

      {showAddForm ? (
        /* New Add Form Page matching Image-2 card style (Teal, Full-Width) */
        <div style={{
          width: "100%",
          margin: "0 0 32px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}>
          {/* Teal Header Bar */}
          <div style={{
            background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
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
              <FileText size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                Add SEO / Meta Data
              </div>
              <div style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.2 }}>
                Add meta data for a specific page
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
              
              {/* Page Name Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#ccfbf1",
                  color: "#0f766e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0f766e", letterSpacing: "0.02em" }}>Page Name *</span>
                  <select
                    value={addForm.pageName}
                    onChange={e => setAddForm(prev => ({ ...prev, pageName: e.target.value }))}
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
                    <option value="Home Page">Home Page</option>
                    <option value="Flight Search">Flight Search</option>
                    <option value="Hotel Search">Hotel Search</option>
                    <option value="About Us">About Us</option>
                    <option value="Contact Us">Contact Us</option>
                  </select>
                </div>
              </div>

              {/* Meta Title Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#ccfbf1",
                  color: "#0f766e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Type size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0f766e", letterSpacing: "0.02em" }}>Meta Title *</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter meta title"
                    value={addForm.metaTitle}
                    onChange={e => setAddForm(prev => ({ ...prev, metaTitle: e.target.value }))}
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
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Recommended length: 50-60 characters</span>
                </div>
              </div>

              {/* Meta Description Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", gridColumn: "1 / -1" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#ccfbf1",
                  color: "#0f766e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "4px"
                }}>
                  <AlignLeft size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0f766e", letterSpacing: "0.02em" }}>Meta Description *</span>
                  <textarea
                    required
                    placeholder="Enter meta description"
                    rows={3}
                    value={addForm.metaDescription}
                    onChange={e => setAddForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.85rem",
                      resize: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Recommended length: 120-160 characters</span>
                </div>
              </div>

              {/* Meta Keywords Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#ccfbf1",
                  color: "#0f766e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Tag size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0f766e", letterSpacing: "0.02em" }}>Meta Keywords</span>
                  <input
                    type="text"
                    placeholder="Enter meta keywords"
                    value={addForm.metaKeywords}
                    onChange={e => setAddForm(prev => ({ ...prev, metaKeywords: e.target.value }))}
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
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Separate keywords with commas</span>
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#ccfbf1",
                  color: "#0f766e",
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
                      background: addForm.status === "Active" ? "#0d9488" : "#cbd5e1",
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

            {/* Teal Notice Box */}
            <div style={{
              background: "#ccfbf1",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#0f766e",
              fontSize: "0.78rem",
              fontWeight: 500,
              border: "1px solid #99f6e4",
              marginBottom: "20px"
            }}>
              <Info size={14} style={{ color: "#0d9488", flexShrink: 0 }} />
              <span>These meta details will help improve SEO and search visibility.</span>
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
                  background: "#0d9488",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)"
                }}
              >
                Save Meta Data &rarr;
              </button>
            </div>
          </form>
        </div>
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
                placeholder="Search page name or meta title..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a" }}
              />
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            </div>
          </div>

          {/* Meta Data list table */}
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.01)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#A51C49", color: "#ffffff" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "60px" }}>#</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "180px" }}>Page Name</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, width: "260px" }}>Meta Title</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Meta Description</th>
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
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{item.pageName}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{item.metaTitle}</td>
                      <td style={{ padding: "14px 16px", color: "#64748b", lineHeight: 1.4 }}>{item.metaDescription}</td>
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

      {/* Centered Modal Dialog for EDIT */}
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
            {/* Header */}
            <div style={{
              padding: "24px 28px 20px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderBottom: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#ccfbf1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0d9488",
                flexShrink: 0
              }}>
                <FileText size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Edit SEO / Meta Data
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Update search engine metadata parameters.
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

            {/* Form Fields */}
            <form onSubmit={handleUpdate} style={{ padding: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", marginBottom: "20px" }}>
                
                {/* Column 1 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Page Name *</span>
                    <select
                      value={editItem.pageName}
                      onChange={e => setEditItem(prev => ({ ...prev, pageName: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff", height: "42px", fontWeight: 500 }}
                    >
                      <option value="Home Page">Home Page</option>
                      <option value="Flight Search">Flight Search</option>
                      <option value="Hotel Search">Hotel Search</option>
                      <option value="About Us">About Us</option>
                      <option value="Contact Us">Contact Us</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Meta Title *</span>
                    <input
                      type="text"
                      required
                      value={editItem.metaTitle}
                      onChange={e => setEditItem(prev => ({ ...prev, metaTitle: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>
                </div>

                {/* Column 2 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Meta Keywords</span>
                    <input
                      type="text"
                      placeholder="comma, separated, keywords"
                      value={editItem.metaKeywords || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, metaKeywords: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>

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
              </div>

              {/* Full Width Description Area */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700, marginBottom: "28px" }}>
                <span>Meta Description *</span>
                <textarea
                  rows={3}
                  required
                  value={editItem.metaDescription}
                  onChange={e => setEditItem(prev => ({ ...prev, metaDescription: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, resize: "none", boxSizing: "border-box" }}
                />
              </label>

              {crudError && (
                <p style={{ margin: "0 0 16px", color: "#ef4444", fontSize: "0.78rem", fontWeight: "bold" }}>⚠️ {crudError}</p>
              )}

              {/* Action Buttons */}
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
                    background: "#0d9488",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)"
                  }}
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Centered Delete Modal Dialog with Backdrop Overlay */}
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
                  Delete SEO / Meta Data
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Are you sure you want to delete this metadata config?
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

            {/* Warning notice box */}
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
                <span>Deleting this record will remove page level SEO parameters.</span>
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
                  background: "#0d9488",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)"
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

export default MetaDataList;
