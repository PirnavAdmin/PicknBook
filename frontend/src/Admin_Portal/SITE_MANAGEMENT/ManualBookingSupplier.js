/* eslint-disable */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Check, Pencil, Trash2, X, Plus, Search, RotateCcw, Save, 
  ChevronLeft, ChevronRight, User, Phone, Mail, MapPin, Shield, Info, AlertTriangle, Upload
} from "lucide-react";
import { useAdminList } from "../../utils/adminPortalStorage";

const DEFAULT_SUPPLIERS = [
  { id: 1, supplierName: "Global Connect Travels", contactPerson: "Ravi Kumar", phone: "9876543210", email: "ravi@globalconnect.com", status: "Active", address: "Hyderabad, India" },
  { id: 2, supplierName: "Skyline Holidays", contactPerson: "Anita Sharma", phone: "9123456780", email: "anita@skyline.com", status: "Active", address: "Mumbai, India" },
  { id: 3, supplierName: "Quick Bookings", contactPerson: "Michael Johnson", phone: "9868776655", email: "info@quickbookers.com", status: "Inactive", address: "Bangalore, India" },
  { id: 4, supplierName: "Travel Point India", contactPerson: "Suresh Reddy", phone: "9000090000", email: "suresh@travelpoint.com", status: "Active", address: "Chennai, India" }
];

function ManualBookingSupplier() {
  const [items, setItems] = useAdminList("placeholder-admin-site-management-manual-booking-supplier", DEFAULT_SUPPLIERS);
  
  // View states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ supplierName: "", contactPerson: "", phone: "", email: "", address: "", status: "Active" });

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

  const handleCreate = (e) => {
    e.preventDefault();
    if (!addForm.supplierName) {
      setCrudError("Supplier Name is required.");
      return;
    }
    if (!addForm.email) {
      setCrudError("Email is required.");
      return;
    }
    const newItem = {
      id: Date.now(),
      supplierName: addForm.supplierName,
      contactPerson: addForm.contactPerson || "",
      phone: addForm.phone || "",
      email: addForm.email,
      address: addForm.address || "",
      status: addForm.status
    };
    setItems(prev => [...prev, newItem]);
    showToast("Supplier added successfully!");
    setShowAddForm(false);
    setAddForm({ supplierName: "", contactPerson: "", phone: "", email: "", address: "", status: "Active" });
    setCrudError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editItem.supplierName) {
      setCrudError("Supplier Name is required.");
      return;
    }
    if (!editItem.email) {
      setCrudError("Email is required.");
      return;
    }
    setItems(prev => prev.map(x => x.id === editItem.id ? {
      ...x,
      supplierName: editItem.supplierName,
      contactPerson: editItem.contactPerson,
      phone: editItem.phone,
      email: editItem.email,
      address: editItem.address,
      status: editItem.status
    } : x));
    showToast("Supplier updated successfully!");
    setEditItem(null);
    setCrudError("");
  };

  const performDelete = () => {
    if (deleteItem) {
      setItems(prev => prev.filter(x => x.id !== deleteItem.id));
      showToast("Supplier deleted successfully!");
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
            <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => setShowAddForm(false)}>Manual Booking Suppliers</span>
            <span>&gt;</span>
            <span style={{ color: "#0f172a" }}>Add</span>
          </>
        ) : (
          <span style={{ color: "#0f172a" }}>Manual Booking Suppliers</span>
        )}
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {showAddForm ? "Add Booking Supplier" : "Manual Booking Suppliers"}
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
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {showAddForm ? (
        /* New Add Form Page matching Image-2 card style (Purple, Full-Width) */
        <div style={{
          width: "100%",
          margin: "0 0 32px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}>
          {/* Purple Header Bar */}
          <div style={{
            background: "linear-gradient(135deg, #4c1d95 0%, #2e0854 100%)",
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
              <User size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                Add Manual Booking Supplier
              </div>
              <div style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.2 }}>
                Add a new supplier for manual bookings
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
              
              {/* Supplier Name Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <User size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6b21a8", letterSpacing: "0.02em" }}>Supplier Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter supplier name"
                    value={addForm.supplierName}
                    onChange={e => setAddForm(prev => ({ ...prev, supplierName: e.target.value }))}
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

              {/* Contact Person Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <User size={18} style={{ opacity: 0.8 }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6b21a8", letterSpacing: "0.02em" }}>Contact Person *</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter contact person name"
                    value={addForm.contactPerson}
                    onChange={e => setAddForm(prev => ({ ...prev, contactPerson: e.target.value }))}
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

              {/* Phone Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Phone size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6b21a8", letterSpacing: "0.02em" }}>Phone *</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter phone number"
                    value={addForm.phone}
                    onChange={e => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
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

              {/* Email Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Mail size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6b21a8", letterSpacing: "0.02em" }}>Email *</span>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={addForm.email}
                    onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
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

              {/* Address Field */}
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "4px"
                }}>
                  <MapPin size={18} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6b21a8", letterSpacing: "0.02em" }}>Address *</span>
                  <textarea
                    required
                    placeholder="Enter full address"
                    rows={3}
                    value={addForm.address}
                    onChange={e => setAddForm(prev => ({ ...prev, address: e.target.value }))}
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
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
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
                      background: addForm.status === "Active" ? "#6b21a8" : "#cbd5e1",
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

            {/* Purple Notice Box */}
            <div style={{
              background: "#f3e8ff",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#6b21a8",
              fontSize: "0.78rem",
              fontWeight: 500,
              border: "1px solid #e9d5ff",
              marginBottom: "20px"
            }}>
              <Info size={14} style={{ color: "#7c3aed", flexShrink: 0 }} />
              <span>Suppliers will be available for manual booking selection.</span>
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
                  background: "#6b21a8",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(107, 33, 168, 0.2)"
                }}
              >
                Save Supplier &rarr;
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Suppliers Table */
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.01)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#A51C49", color: "#ffffff" }}>
                <th style={{ padding: "14px 16px", fontWeight: 600, width: "60px" }}>#</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Supplier Name</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Contact Person</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Phone</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Email</th>
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
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{item.supplierName}</td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>{item.contactPerson}</td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>{item.phone}</td>
                    <td style={{ padding: "14px 16px", color: "#64748b" }}>{item.email}</td>
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
                background: "#f3e8ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b21a8",
                flexShrink: 0
              }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Edit Booking Supplier
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Update supplier profile details.
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
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Supplier Name *</span>
                    <input
                      type="text"
                      required
                      value={editItem.supplierName}
                      onChange={e => setEditItem(prev => ({ ...prev, supplierName: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Phone *</span>
                    <input
                      type="text"
                      required
                      value={editItem.phone}
                      onChange={e => setEditItem(prev => ({ ...prev, phone: e.target.value }))}
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

                {/* Column 2 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Contact Person *</span>
                    <input
                      type="text"
                      required
                      value={editItem.contactPerson}
                      onChange={e => setEditItem(prev => ({ ...prev, contactPerson: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Email *</span>
                    <input
                      type="email"
                      required
                      value={editItem.email}
                      onChange={e => setEditItem(prev => ({ ...prev, email: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", height: "42px", fontWeight: 500, boxSizing: "border-box" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", color: "#0f172a", fontWeight: 700 }}>
                    <span>Address *</span>
                    <textarea
                      required
                      rows={2}
                      value={editItem.address}
                      onChange={e => setEditItem(prev => ({ ...prev, address: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", fontWeight: 500, resize: "none", boxSizing: "border-box" }}
                    />
                  </label>
                </div>

              </div>

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
                    background: "#6b21a8",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(107, 33, 168, 0.15)"
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
                  Delete Booking Supplier
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                  Are you sure you want to delete this supplier?
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
                <span>Deleting this supplier will remove it from manual bookings.</span>
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
                  background: "#6b21a8",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(107, 33, 168, 0.15)"
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

export default ManualBookingSupplier;
