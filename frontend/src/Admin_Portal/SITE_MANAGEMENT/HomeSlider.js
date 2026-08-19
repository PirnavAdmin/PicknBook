/* eslint-disable */
import React, { useState } from "react";
import { 
  Check, Pencil, Trash2, X, Plus, Search, RotateCcw, Save, 
  ChevronLeft, ChevronRight, Upload, Globe, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminList } from "../../utils/adminPortalStorage";

const DEFAULT_HOME_SLIDERS = [
  { id: 1, image: "explore.jpg", imageMobile: "explore-mobile.jpg", title: "Explore the World with PickNBook", subtitle: "Book flights, hotels, buses at best price", description: "Save up to 30% on booking.", buttonText: "Book Now", buttonUrl: "/flights", displayOrder: 1, status: "Active", startDate: "2024-05-01", endDate: "2025-12-31" },
  { id: 2, image: "deals.jpg", imageMobile: "deals-mobile.jpg", title: "Best Travel Deals & Offers", subtitle: "Weekend Getaways", description: "Get cashback on bookings.", buttonText: "Explore Offers", buttonUrl: "/offers", displayOrder: 2, status: "Active", startDate: "2024-05-01", endDate: "2025-12-31" },
  { id: 3, image: "journey.jpg", imageMobile: "journey-mobile.jpg", title: "Easy Booking, Happy Journey", subtitle: "Seamless planning", description: "Plan your trip in seconds.", buttonText: "Start Planning", buttonUrl: "/hotels", displayOrder: 3, status: "Inactive", startDate: "2024-03-01", endDate: "2024-04-30" },
  { id: 4, image: "save.jpg", imageMobile: "save-mobile.jpg", title: "Save More on Every Trip", subtitle: "Special discounts", description: "Apply coupons and save.", buttonText: "View Coupons", buttonUrl: "/coupons", displayOrder: 4, status: "Active", startDate: "2024-06-01", endDate: "2025-12-31" }
];

function HomeSlider() {
  const [items, setItems] = useAdminList("placeholder-admin-site-management-slider-image", DEFAULT_HOME_SLIDERS);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [crudError, setCrudError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(items.length / rowsPerPage);
  const paginatedItems = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleOpenAdd = () => {
    setEditItem({
      id: Date.now(),
      image: "explore.jpg",
      imageMobile: "explore-mobile.jpg",
      title: "",
      subtitle: "",
      description: "",
      buttonText: "",
      buttonUrl: "",
      displayOrder: items.length + 1,
      status: "Active",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "2025-12-31",
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
    if (!editItem.title) {
      setCrudError("Title is required.");
      return;
    }
    if (!editItem.displayOrder) {
      setCrudError("Display Order is required.");
      return;
    }

    if (editItem.isNew) {
      setItems(prev => [...prev, { ...editItem }]);
      showToast("Home slider added successfully!");
    } else {
      setItems(prev => prev.map(x => x.id === editItem.id ? { ...editItem } : x));
      showToast("Home slider updated successfully!");
    }

    setShowForm(false);
    setEditItem(null);
    setCrudError("");
  };

  const performDelete = () => {
    if (deleteItem) {
      setItems(prev => prev.filter(x => x.id !== deleteItem.id));
      showToast("Home slider deleted successfully!");
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
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => { setShowForm(false); setEditItem(null); }}>Home Slider</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Add / Edit</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>Home Slider</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {showForm ? "Add / Edit Home Slider" : "Home Slider"}
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
            <Plus size={16} /> Add Home Slider
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSave} style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.01)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 48px", marginBottom: "28px" }}>
            
            {/* COLUMN 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.82rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Slider Image (Desktop)</span>
                <div style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: "pointer"
                }}>
                  <Upload size={24} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
                  <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600, display: "block" }}>Click to upload or drag and drop</span>
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>PNG, JPG, JPEG (Max 2MB)</span>
                  <input
                    type="text"
                    value={editItem.image}
                    onChange={e => setEditItem(prev => ({ ...prev, image: e.target.value }))}
                    style={{ marginTop: "12px", width: "100%", padding: "6px 10px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                TITLE *
                <input
                  type="text"
                  required
                  placeholder="Enter title"
                  value={editItem.title}
                  onChange={e => setEditItem(prev => ({ ...prev, title: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                SUBTITLE
                <input
                  type="text"
                  placeholder="Enter subtitle"
                  value={editItem.subtitle}
                  onChange={e => setEditItem(prev => ({ ...prev, subtitle: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                DESCRIPTION
                <textarea
                  placeholder="Enter description"
                  rows={3}
                  value={editItem.description}
                  onChange={e => setEditItem(prev => ({ ...prev, description: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", resize: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                START DATE
                <input
                  type="date"
                  value={editItem.startDate}
                  onChange={e => setEditItem(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff" }}
                />
              </label>
            </div>

            {/* COLUMN 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.82rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Slider Image (Mobile)</span>
                <div style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: "pointer"
                }}>
                  <Upload size={24} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
                  <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600, display: "block" }}>Click to upload or drag and drop</span>
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>PNG, JPG, JPEG (Max 2MB)</span>
                  <input
                    type="text"
                    value={editItem.imageMobile}
                    onChange={e => setEditItem(prev => ({ ...prev, imageMobile: e.target.value }))}
                    style={{ marginTop: "12px", width: "100%", padding: "6px 10px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                BUTTON TEXT
                <input
                  type="text"
                  placeholder="Enter button text"
                  value={editItem.buttonText}
                  onChange={e => setEditItem(prev => ({ ...prev, buttonText: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                BUTTON URL
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Enter button url"
                    value={editItem.buttonUrl}
                    onChange={e => setEditItem(prev => ({ ...prev, buttonUrl: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", boxSizing: "border-box" }}
                  />
                  <Globe size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                </div>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                DISPLAY ORDER *
                <input
                  type="number"
                  required
                  placeholder="Enter display order"
                  value={editItem.displayOrder}
                  onChange={e => setEditItem(prev => ({ ...prev, displayOrder: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                END DATE
                <input
                  type="date"
                  value={editItem.endDate}
                  onChange={e => setEditItem(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                STATUS
                <select
                  value={editItem.status}
                  onChange={e => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", background: "#fff" }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

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
              Save Slider
            </button>
          </div>
        </form>
      ) : (
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.01)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#A51C49", color: "#ffffff" }}>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "60px" }}>#</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "80px" }}>Image</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Title</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px" }}>Display Order</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px" }}>Status</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "140px" }}>Start Date</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "140px" }}>End Date</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "120px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                    No home sliders configured. Click "Add Home Slider" to upload one.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const serialNum = (page - 1) * rowsPerPage + idx + 1;
                  const isActive = item.status === "Active";
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px", color: "#475569", fontWeight: 500 }}>{serialNum}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{
                          width: "48px",
                          height: "32px",
                          borderRadius: "4px",
                          background: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "#475569"
                        }}>
                          {String(item.image).split(".").pop().toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{item.title}</td>
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
                      <td style={{ padding: "14px 16px", color: "#64748b" }}>{item.startDate}</td>
                      <td style={{ padding: "14px 16px", color: "#64748b" }}>{item.endDate}</td>
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
              Are you sure you want to delete the home slider banner <strong>{deleteItem.title}</strong>? This action cannot be undone.
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

export default HomeSlider;
