/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AddPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { createAdminPage, updateAdminPage, resolveCmsImageUrl } from "../../../services/cmsPageService";

const DEFAULT_FORM = {
  title: "",
  slug: "",
  status: "Active",
  module: "All",
  metaTitle: "",
  metaKeyword: "",
  metaDescription: "",
  description: "",
  imageName: "",
  bannerName: "",
};

const buildSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const AddPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageListPath = "/admin/page-management/all-pages";

  const editingPage = useMemo(() => location.state?.page || null, [location.state]);
  const descriptionRef = useRef(null);

  const autoResizeTextarea = (element, minHeight = 70) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
  };

  const [formData, setFormData] = useState(() => {
    const initialImgPath = editingPage?.imagePath || editingPage?.image || "";
    const initialImgName = initialImgPath
      ? initialImgPath.split(/[/\\]/).pop()
      : (editingPage?.imageName || "");

    const initialBnrPath = editingPage?.bannerPath || editingPage?.banner || "";
    const initialBnrName = initialBnrPath
      ? initialBnrPath.split(/[/\\]/).pop()
      : (editingPage?.bannerName || "");

    return {
      ...DEFAULT_FORM,
      title: editingPage?.title || "",
      slug: editingPage?.slug || "",
      status: editingPage?.status || "Active",
      module: editingPage?.module || "All",
      metaTitle: editingPage?.metaTitle || "",
      metaKeyword: editingPage?.metaKeyword || "",
      metaDescription: editingPage?.metaDescription || "",
      description: editingPage?.description || "",
      imageName: initialImgName,
      bannerName: initialBnrName,
    };
  });

  const [imagePreview, setImagePreview] = useState(() => {
    const existingImg = editingPage?.imagePath || editingPage?.image || editingPage?.imageUrl || "";
    if (existingImg) {
      return resolveCmsImageUrl(existingImg, "image") || existingImg;
    }
    return "";
  });

  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isBannerRemoved, setIsBannerRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      autoResizeTextarea(descriptionRef.current, 100);
    }
  }, [formData.description]);

  useEffect(() => {
    if (editingPage) {
      const initialImgPath = editingPage.imagePath || editingPage.image || "";
      const initialImgName = initialImgPath
        ? initialImgPath.split(/[/\\]/).pop()
        : (editingPage.imageName || "");

      const initialBnrPath = editingPage.bannerPath || editingPage.banner || "";
      const initialBnrName = initialBnrPath
        ? initialBnrPath.split(/[/\\]/).pop()
        : (editingPage.bannerName || "");

      setFormData({
        title: editingPage.title || "",
        slug: editingPage.slug || "",
        status: editingPage.status || "Active",
        module: editingPage.module || "All",
        metaTitle: editingPage.metaTitle || "",
        metaKeyword: editingPage.metaKeyword || "",
        metaDescription: editingPage.metaDescription || "",
        description: editingPage.description || "",
        imageName: initialImgName,
        bannerName: initialBnrName,
      });

      setIsImageRemoved(false);
      setIsBannerRemoved(false);
      setImageFile(null);
      setBannerFile(null);

      const existingImg = editingPage.imagePath || editingPage.image || editingPage.imageUrl || "";
      if (existingImg) {
        setImagePreview(resolveCmsImageUrl(existingImg, "image") || existingImg);
      } else {
        setImagePreview("");
      }
    }
  }, [editingPage]);

  const handleChange = (field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files?.[0];
    if (file && file.size > 4 * 1024 * 1024) {
      setFormError("File size must be within 4MB limit.");
      event.target.value = ""; // Clear file input
      if (field === "image") {
        setImageFile(null);
        setImagePreview("");
        setFormData((previous) => ({ ...previous, imageName: "" }));
      } else if (field === "banner") {
        setBannerFile(null);
        setFormData((previous) => ({ ...previous, bannerName: "" }));
      }
      return;
    }
    setFormError("");
    if (field === "image") {
      setImageFile(file || null);
      setIsImageRemoved(false);
      setFormData((previous) => ({ ...previous, imageName: file ? file.name : "" }));
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result || "");
        reader.readAsDataURL(file);
      } else {
        setImagePreview("");
      }
    } else if (field === "banner") {
      setBannerFile(file || null);
      setIsBannerRemoved(false);
      setFormData((previous) => ({ ...previous, bannerName: file ? file.name : "" }));
    }
  };

  const handleRemoveFile = (field) => {
    if (field === "image") {
      setImageFile(null);
      setIsImageRemoved(true);
      setImagePreview("");
      setFormData((previous) => ({ ...previous, imageName: "" }));
      const fileInput = document.getElementById("image-input");
      if (fileInput) fileInput.value = "";
    } else if (field === "banner") {
      setBannerFile(null);
      setIsBannerRemoved(true);
      setFormData((previous) => ({ ...previous, bannerName: "" }));
      const fileInput = document.getElementById("banner-input");
      if (fileInput) fileInput.value = "";
    }
  };

  const handleReset = () => {
    if (editingPage) {
      const initialImgPath = editingPage.imagePath || editingPage.image || "";
      const initialImgName = initialImgPath
        ? initialImgPath.split(/[/\\]/).pop()
        : (editingPage.imageName || "");

      const initialBnrPath = editingPage.bannerPath || editingPage.banner || "";
      const initialBnrName = initialBnrPath
        ? initialBnrPath.split(/[/\\]/).pop()
        : (editingPage.bannerName || "");

      setFormData({
        title: editingPage.title || "",
        slug: editingPage.slug || "",
        status: editingPage.status || "Active",
        module: editingPage.module || "All",
        metaTitle: editingPage.metaTitle || "",
        metaKeyword: editingPage.metaKeyword || "",
        metaDescription: editingPage.metaDescription || "",
        description: editingPage.description || "",
        imageName: initialImgName,
        bannerName: initialBnrName,
      });

      setIsImageRemoved(false);
      setIsBannerRemoved(false);
      setImageFile(null);
      setBannerFile(null);

      const existingImg = editingPage.imagePath || editingPage.image || editingPage.imageUrl || "";
      if (existingImg) {
        setImagePreview(resolveCmsImageUrl(existingImg, "image") || existingImg);
      } else {
        setImagePreview("");
      }
    } else {
      setFormData(DEFAULT_FORM);
      setImageFile(null);
      setBannerFile(null);
      setImagePreview("");
      setIsImageRemoved(false);
      setIsBannerRemoved(false);
    }

    setFormError("");
    const imgInput = document.getElementById("image-input");
    if (imgInput) imgInput.value = "";
    const bnrInput = document.getElementById("banner-input");
    if (bnrInput) bnrInput.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setSaved(false);
    setFormError("");

    const title = String(formData.title || "").trim();
    if (!title) {
      setFormError("Page title is required.");
      return;
    }

    const slug = formData.slug?.trim() ? formData.slug.trim() : buildSlug(title);

    const data = new FormData();
    data.append("Title", title);
    data.append("Slug", slug);
    data.append("Status", formData.status || "Active");
    data.append("Module", formData.module || "All");
    data.append("MetaTitle", formData.metaTitle || "");
    data.append("MetaKeyword", formData.metaKeyword || "");
    data.append("MetaDescription", formData.metaDescription || "");
    data.append("Description", formData.description || "");

    // 1. Handle Main Image
    if (imageFile) {
      data.append("Image", imageFile);
      data.append("RemoveImage", "false");
    } else if (isImageRemoved) {
      data.append("RemoveImage", "true");
    } else {
      data.append("RemoveImage", "false");
    }

    // 2. Handle Banner
    if (bannerFile) {
      data.append("Banner", bannerFile);
      data.append("RemoveBanner", "false");
    } else if (isBannerRemoved) {
      data.append("RemoveBanner", "true");
    } else {
      data.append("RemoveBanner", "false");
    }

    setLoading(true);
    try {
      if (editingPage && editingPage.id && !String(editingPage.id).startsWith("default-")) {
        await updateAdminPage(editingPage.id, data);
      } else {
        await createAdminPage(data);
      }

      setSaved(true);
      navigate(pageListPath);
    } catch (err) {
      console.error("Error saving page:", err);
      setFormError(
        err.response?.data?.message ||
        err.message ||
        "Failed to save the page. Please check your inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-container">
      <form onSubmit={handleSubmit}>
        <div className="section">
          {/* ── Header inside container ── */}
          <div className="add-page-header">
            <h2 className="add-page-heading">{editingPage ? "Edit Page" : "Add New Page"}</h2>
            <button 
              type="button" 
              className="add-page-list-btn" 
              onClick={() => navigate(pageListPath)}
            >
              All Page List
            </button>
          </div>

          <h3><span className="title-tab">Basic Details</span></h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Title <span style={{ color: "#d93025" }}>*</span></label>
              <input
                placeholder="Page title"
                value={formData.title}
                onChange={handleChange("title")}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input
                placeholder="Page Slug"
                value={formData.slug}
                onChange={handleChange("slug")}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>
                Image [max_size: 1MB]{" "}
                {formData.imageName && (
                  <span className="current-file">
                    ({formData.imageName}){" "}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("image")}
                      className="remove-file-btn"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d93025",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "0.8rem",
                        padding: "0 4px",
                        fontWeight: "600",
                      }}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </label>
              <input
                type="file"
                id="image-input"
                onChange={handleFileChange("image")}
                disabled={loading}
                accept="image/*"
              />
              {imagePreview && (
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <img
                    src={imagePreview}
                    alt="Image Preview"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Selected Image Preview</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                OG Image [max_size: 1MB]{" "}
                {formData.bannerName && (
                  <span className="current-file">
                    ({formData.bannerName}){" "}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("banner")}
                      className="remove-file-btn"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d93025",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "0.8rem",
                        padding: "0 4px",
                        fontWeight: "600",
                      }}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </label>
              <input
                type="file"
                id="banner-input"
                onChange={handleFileChange("banner")}
                disabled={loading}
                accept="image/*"
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={handleChange("status")} disabled={loading}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Module</label>
              <select value={formData.module} onChange={handleChange("module")} disabled={loading}>
                <option value="All">All</option>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Meta Title</label>
              <textarea
                placeholder="Meta Title"
                value={formData.metaTitle}
                onChange={handleChange("metaTitle")}
                onInput={(e) => autoResizeTextarea(e.target, 70)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Meta Keyword</label>
              <textarea
                placeholder="Meta Keyword"
                value={formData.metaKeyword}
                onChange={handleChange("metaKeyword")}
                onInput={(e) => autoResizeTextarea(e.target, 70)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Meta Description</label>
              <textarea
                placeholder="Meta Description"
                value={formData.metaDescription}
                onChange={handleChange("metaDescription")}
                onInput={(e) => autoResizeTextarea(e.target, 70)}
                disabled={loading}
              />
            </div>

            {/* Description section inside the same grid spanning 3 columns */}
            <div className="form-group" style={{ gridColumn: 'span 3', marginTop: '2px' }}>
              <label>Description</label>
              <textarea
                ref={descriptionRef}
                className="editor"
                rows={4}
                placeholder="Write description..."
                value={formData.description}
                onChange={handleChange("description")}
                onInput={(e) => autoResizeTextarea(e.target, 100)}
                disabled={loading}
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>

          {formError && <p className="admin-markup-form-error" style={{ marginTop: '16px' }}>{formError}</p>}
          {saved && <p className="menu-form-success" style={{ marginTop: '16px' }}>Page saved successfully.</p>}

          <div className="submit-area" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", flexWrap: "nowrap" }}>
            <button
              type="button"
              className="reset-btn"
              onClick={handleReset}
              disabled={loading}
              style={{
                height: "36px",
                minHeight: "36px",
                maxHeight: "36px",
                margin: 0,
                padding: "0 22px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontSize: "0.84rem",
                fontWeight: 500,
                borderRadius: "6px",
                verticalAlign: "middle",
                boxSizing: "border-box"
              }}
            >
              RESET
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              style={{
                height: "36px",
                minHeight: "36px",
                maxHeight: "36px",
                margin: 0,
                padding: "0 22px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                fontSize: "0.84rem",
                fontWeight: 500,
                borderRadius: "6px",
                verticalAlign: "middle",
                boxSizing: "border-box"
              }}
            >
              {loading ? "SAVING..." : (editingPage ? "UPDATE" : "SUBMIT")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPage;
