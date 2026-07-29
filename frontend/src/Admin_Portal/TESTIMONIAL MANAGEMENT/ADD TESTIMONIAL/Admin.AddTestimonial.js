/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createAdminTestimonial, updateAdminTestimonial } from "../../../services/testimonialService";

export default function AdminAddTestimonial() {
  const navigate = useNavigate();
  const location = useLocation();
  const editItem = location.state?.editItem || null;
  const isEditMode = !!editItem;

  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    rating: 5,
    comment: "",
    status: "Active",
    image: null,
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (isEditMode && editItem) {
      setFormData({
        name: editItem.name || "",
        designation: editItem.designation || "",
        rating: editItem.rating || 5,
        comment: editItem.comment || editItem.message || "",
        status: editItem.status || "Active",
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
      data.append("Designation", formData.designation.trim());
      data.append("Rating", formData.rating);
      data.append("Comment", formData.comment.trim());
      data.append("Status", formData.status);
      if (formData.image) {
        data.append("Image", formData.image);
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
            <h1 style={styles.titleMain}>{isEditMode ? "Edit" : "Add"}</h1>
            <h2 style={styles.titleSub}>Testimonial</h2>
          </div>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name *</label>
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
              <label style={styles.label}>Designation *</label>
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

            <div style={styles.formGroup}>
              <label style={styles.label}>Rating (1 - 5) *</label>
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

            <div style={styles.formGroup}>
              <label style={styles.label}>Comment / Message *</label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                required
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? "Saving..." : "Save Testimonial"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
