/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createAdminTestimonial, updateAdminTestimonial, getAdminTestimonialCategories } from "../../../services/testimonialService";

export default function AdminAddTestimonial() {
  const navigate = useNavigate();
  const location = useLocation();
  const editItem = location.state?.editItem || null;
  const isEditMode = !!editItem;

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    rating: 5,
    categoryStatus: "Active",
    comment: "",
    status: "Published",
    categoryId: "",
    image: null,
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getAdminTestimonialCategories();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
    fetchCategories();

    if (isEditMode && editItem) {
      const catSt = editItem.categoryStatus || editItem.category?.status || (editItem.status === "Inactive" ? "Inactive" : "Active");
      setFormData({
        name: editItem.name || "",
        designation: editItem.designation || "",
        rating: editItem.rating || 5,
        categoryStatus: catSt,
        comment: editItem.comment || editItem.message || "",
        status: editItem.status || "Published",
        categoryId: editItem.categoryId || "",
        image: null,
      });
      if (editItem.imageUrl || editItem.image) {
        setPreviewUrl(editItem.imageUrl || editItem.image);
      }
    }
  }, [isEditMode, editItem]);

  const showToast = (message, tone = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainStatusChange = (e) => {
    const newStatus = e.target.value;
    const isInactiveType = newStatus === "Inactive" || newStatus === "Draft";
    setFormData((prev) => ({
      ...prev,
      status: newStatus,
      categoryStatus: isInactiveType ? "Inactive" : prev.categoryStatus === "Inactive" ? "Active" : prev.categoryStatus
    }));
  };

  const handleCategoryStatusChange = (e) => {
    const newCatStatus = e.target.value;
    setFormData((prev) => ({
      ...prev,
      categoryStatus: newCatStatus,
      status: newCatStatus === "Inactive" && (prev.status === "Published" || prev.status === "Active" || prev.status === "Approved") ? "Inactive" : prev.status
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.designation.trim() || !formData.comment.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      data.append("Name", formData.name.trim());
      data.append("name", formData.name.trim());
      data.append("Designation", formData.designation.trim());
      data.append("designation", formData.designation.trim());
      data.append("Rating", formData.rating);
      data.append("rating", formData.rating);
      data.append("Comment", formData.comment.trim());
      data.append("comment", formData.comment.trim());
      data.append("Status", formData.status);
      data.append("status", formData.status);
      data.append("CategoryStatus", formData.categoryStatus);
      data.append("categoryStatus", formData.categoryStatus);
      if (formData.categoryId) {
        data.append("CategoryId", formData.categoryId);
        data.append("categoryId", formData.categoryId);
      }
      if (formData.image) {
        data.append("Image", formData.image);
        data.append("image", formData.image);
      }

      if (isEditMode) {
        await updateAdminTestimonial(editItem.id, data);
        showToast("Testimonial updated successfully.", "success");
      } else {
        await createAdminTestimonial(data);
        showToast("Testimonial added successfully.", "success");
      }

      setTimeout(() => {
        navigate("/admin/testimonial-management/testimonial-list");
      }, 1500);
    } catch {
      showToast("Failed to save testimonial.", "error");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      padding: "24px",
      background: "var(--page-bg)",
      minHeight: "100vh",
      fontFamily: "var(--app-font-family)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
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
    card: {
      background: "var(--panel)",
      borderRadius: "14px",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      padding: "32px",
      maxWidth: "700px",
      margin: "0 auto",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginBottom: "20px",
    },
    label: {
      fontSize: "0.85rem",
      fontWeight: 700,
      color: "var(--text-primary)",
    },
    input: {
      padding: "12px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      fontSize: "0.95rem",
      background: "var(--surface)",
      color: "var(--text-primary)",
      outline: "none",
      transition: "all 0.2s ease",
    },
    textarea: {
      padding: "12px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      fontSize: "0.95rem",
      background: "var(--surface)",
      color: "var(--text-primary)",
      minHeight: "120px",
      resize: "vertical",
      outline: "none",
    },
    submitBtn: {
      background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
      color: "#ffffff",
      padding: "12px 24px",
      borderRadius: "8px",
      border: "none",
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(184, 20, 27, 0.2)",
    },
    cancelBtn: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
      padding: "12px 24px",
      borderRadius: "8px",
      fontWeight: 600,
      cursor: "pointer",
    },
    btnGroup: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "24px",
    },
    imagePreview: {
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "2px solid var(--border)",
      marginTop: "10px",
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
      maxWidth: "700px",
      margin: "0 auto 16px auto",
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
  };

  return (
    <>
      <div data-admin-surface style={styles.container}>
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
            <h1 style={styles.titleMain}>{isEditMode ? "Edit" : "Add"}</h1>
            <h2 style={styles.titleSub}>Testimonial</h2>
          </div>
        </div>

        <div data-admin-surface style={styles.card}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name <span data-admin-required className="admin-required-indicator">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Designation <span data-admin-required className="admin-required-indicator">*</span></label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                placeholder="e.g. Regular Customer"
                style={styles.input}
              />
            </div>

            {/* Rating and Category Status Button Chips in same row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div style={{ ...styles.formGroup, marginBottom: 0 }}>
                <label style={styles.label}>Rating (1 - 5) <span data-admin-required className="admin-required-indicator">*</span></label>
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>

              <div style={{ ...styles.formGroup, marginBottom: 0 }}>
                <label style={styles.label}>Category Status <span data-admin-required className="admin-required-indicator">*</span></label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: (formData.categoryStatus || "Active") === "Active" ? "1px solid #10b981" : "1px solid var(--border)",
                      background: (formData.categoryStatus || "Active") === "Active" ? "#dcfce7" : "var(--surface)",
                      color: (formData.categoryStatus || "Active") === "Active" ? "#15803d" : "var(--text-secondary)",
                      transition: "all 0.15s ease"
                    }}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        categoryStatus: "Active"
                      }));
                    }}
                  >
                    ● Active
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: (formData.categoryStatus || "Active") === "Inactive" ? "1px solid #ef4444" : "1px solid var(--border)",
                      background: (formData.categoryStatus || "Active") === "Inactive" ? "#fee2e2" : "var(--surface)",
                      color: (formData.categoryStatus || "Active") === "Inactive" ? "#b91c1c" : "var(--text-secondary)",
                      transition: "all 0.15s ease"
                    }}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        categoryStatus: "Inactive",
                        status: (prev.status === "Published" || prev.status === "Active" || prev.status === "Approved") ? "Inactive" : prev.status
                      }));
                    }}
                  >
                    ○ Inactive
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Comment / Message <span data-admin-required className="admin-required-indicator">*</span></label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                required
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Main Testimonial Status <span data-admin-required className="admin-required-indicator">*</span></label>
              <select
                name="status"
                value={formData.status}
                onChange={handleMainStatusChange}
                style={styles.input}
              >
                <optgroup label="Standard Statuses">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </optgroup>
                <optgroup label="Workflow Statuses">
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                </optgroup>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ ...styles.input, background: "transparent", border: "none", padding: 0 }}
              />
              {previewUrl && (
                <img
                  src={previewUrl.startsWith("blob:") ? previewUrl : `/assets/images/${previewUrl}`}
                  alt="Preview"
                  style={styles.imagePreview}
                  onError={(e) => {
                    // Fallback to absolute or exact image path if asset path isn't direct
                    e.target.src = previewUrl;
                  }}
                />
              )}
            </div>

            <div style={styles.btnGroup}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => navigate("/admin/testimonial-management/testimonial-list")}
              >
                Cancel
              </button>
              <button data-admin-action="primary" type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? "Saving..." : "Save Testimonial"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
