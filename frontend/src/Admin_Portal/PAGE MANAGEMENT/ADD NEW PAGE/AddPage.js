/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
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

  const isImageRemovedInOverrides = (page) => {
    if (!page) return false;
    try {
      const overrides = JSON.parse(localStorage.getItem("cms_page_image_overrides") || "{}");
      const keys = [
        page.slug,
        page.slug ? buildSlug(page.slug) : "",
        page.title,
        page.title ? buildSlug(page.title) : "",
        page.id,
        page.id ? String(page.id) : ""
      ].filter(Boolean);
      return keys.some(k => overrides[k] === "__REMOVED__" || overrides[k] === "");
    } catch {
      return false;
    }
  };

  const [formData, setFormData] = useState(() => {
    const isRemoved = isImageRemovedInOverrides(editingPage);
    const initialImgPath = isRemoved ? "" : (editingPage?.imagePath || editingPage?.image || "");
    const initialImgName = isRemoved
      ? ""
      : initialImgPath
      ? initialImgPath.split(/[/\\]/).pop()
      : (editingPage?.imageName || "");

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
      bannerName: editingPage?.bannerPath ? editingPage.bannerPath.split(/[/\\]/).pop() : (editingPage?.bannerName || ""),
    };
  });

  const [imagePreview, setImagePreview] = useState(() => {
    if (isImageRemovedInOverrides(editingPage)) return "";
    const existingImg = editingPage?.imagePath || editingPage?.image || editingPage?.imageUrl || "";
    if (existingImg) {
      return resolveCmsImageUrl(existingImg, "image") || existingImg;
    }
    return "";
  });

  useEffect(() => {
    if (editingPage) {
      const isRemoved = isImageRemovedInOverrides(editingPage);
      const initialImgPath = isRemoved ? "" : (editingPage.imagePath || editingPage.image || "");
      const initialImgName = isRemoved
        ? ""
        : initialImgPath
        ? initialImgPath.split(/[/\\]/).pop()
        : (editingPage.imageName || "");

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
        bannerName: editingPage.bannerPath ? editingPage.bannerPath.split(/[/\\]/).pop() : (editingPage.bannerName || ""),
      });

      if (isRemoved) {
        setImagePreview("");
      } else {
        const existingImg = editingPage.imagePath || editingPage.image || editingPage.imageUrl || "";
        if (existingImg) {
          setImagePreview(resolveCmsImageUrl(existingImg, "image") || existingImg);
        } else {
          setImagePreview("");
        }
      }
    }
  }, [editingPage]);

  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files?.[0];
    if (file && file.size > 1024 * 1024) {
      setFormError("File size must be within 1MB limit.");
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
      setFormData((previous) => ({ ...previous, bannerName: file ? file.name : "" }));
    }
  };

  const handleRemoveFile = (field) => {
    if (field === "image") {
      setImageFile(null);
      setImagePreview("");
      setFormData((previous) => ({ ...previous, imageName: "" }));
      const fileInput = document.getElementById("image-input");
      if (fileInput) fileInput.value = "";
      try {
        const pageSlug = formData.slug?.trim() || formData.title?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const pageTitle = formData.title?.trim();
        const current = JSON.parse(localStorage.getItem("cms_page_image_overrides") || "{}");
        if (pageSlug) {
          current[pageSlug] = "__REMOVED__";
          const norm = pageSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
          if (norm) current[norm] = "__REMOVED__";
        }
        if (pageTitle) {
          current[pageTitle] = "__REMOVED__";
          const normTitle = pageTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
          if (normTitle) current[normTitle] = "__REMOVED__";
        }
        if (editingPage?.id) {
          current[editingPage.id] = "__REMOVED__";
          current[String(editingPage.id)] = "__REMOVED__";
        }
        if (editingPage?.slug) {
          current[editingPage.slug] = "__REMOVED__";
          const normEditSlug = editingPage.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
          if (normEditSlug) current[normEditSlug] = "__REMOVED__";
        }
        if (editingPage?.title) {
          current[editingPage.title] = "__REMOVED__";
          const normEditTitle = editingPage.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
          if (normEditTitle) current[normEditTitle] = "__REMOVED__";
        }
        localStorage.setItem("cms_page_image_overrides", JSON.stringify(current));
      } catch (e) {}
    } else if (field === "banner") {
      setBannerFile(null);
      setFormData((previous) => ({ ...previous, bannerName: "" }));
      const fileInput = document.getElementById("banner-input");
      if (fileInput) fileInput.value = "";
    }
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
    data.append("ImageName", formData.imageName || "");
    data.append("BannerName", formData.bannerName || "");
    data.append("ImagePath", formData.imageName ? (editingPage?.imagePath || "") : "");
    data.append("BannerPath", formData.bannerName ? (editingPage?.bannerPath || "") : "");

    // Deletion flags for image
    if (!formData.imageName) {
      data.append("DeleteImage", "true");
      data.append("RemoveImage", "true");
      data.append("ClearImage", "true");
      data.append("IsImageDeleted", "true");
      data.append("imageDeleted", "true");
      data.append("removeImage", "true");
    }

    // Deletion flags for banner
    if (!formData.bannerName) {
      data.append("DeleteBanner", "true");
      data.append("RemoveBanner", "true");
      data.append("ClearBanner", "true");
      data.append("IsBannerDeleted", "true");
      data.append("bannerDeleted", "true");
      data.append("removeBanner", "true");
    }

    if (imageFile) {
      data.append("Image", imageFile);
      data.append("image", imageFile);
      data.append("PageImage", imageFile);
      data.append("file", imageFile);
    }
    if (bannerFile) {
      data.append("Banner", bannerFile);
      data.append("banner", bannerFile);
      data.append("BannerImage", bannerFile);
    }

    setLoading(true);
    try {
      const pageSlug = formData.slug.trim() || formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const pageTitle = formData.title.trim();

      const setOverrideValue = (val) => {
        try {
          const current = JSON.parse(localStorage.getItem("cms_page_image_overrides") || "{}");
          if (pageSlug) {
            current[pageSlug] = val;
            const norm = pageSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            if (norm) current[norm] = val;
          }
          if (pageTitle) {
            current[pageTitle] = val;
            const normTitle = pageTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            if (normTitle) current[normTitle] = val;
          }
          if (editingPage?.id) {
            current[editingPage.id] = val;
            current[String(editingPage.id)] = val;
          }
          if (editingPage?.slug) {
            current[editingPage.slug] = val;
            const normEditSlug = editingPage.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            if (normEditSlug) current[normEditSlug] = val;
          }
          if (editingPage?.title) {
            current[editingPage.title] = val;
            const normEditTitle = editingPage.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
            if (normEditTitle) current[normEditTitle] = val;
          }
          localStorage.setItem("cms_page_image_overrides", JSON.stringify(current));
        } catch (e) {}
      };

      if (imageFile) {
        try {
          const base64Url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result || null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(imageFile);
          });
          if (base64Url) {
            setOverrideValue(base64Url);
          }
        } catch (e) {}
      } else if (!formData.imageName) {
        setOverrideValue("__REMOVED__");
      }

      let res = null;
      if (editingPage && editingPage.id && !String(editingPage.id).startsWith("default-")) {
        res = await updateAdminPage(editingPage.id, data);
      } else {
        res = await createAdminPage(data);
      }

      if (res) {
        const savedImg = res.imagePath || res.ImagePath || res.image || res.Image;
        if (savedImg) {
          setOverrideValue(savedImg);
        }
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
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Meta Keyword</label>
              <textarea
                placeholder="Meta Keyword"
                value={formData.metaKeyword}
                onChange={handleChange("metaKeyword")}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Meta Description</label>
              <textarea
                placeholder="Meta Description"
                value={formData.metaDescription}
                onChange={handleChange("metaDescription")}
                disabled={loading}
              />
            </div>

            {/* Description section inside the same grid spanning 3 columns */}
            <div className="form-group" style={{ gridColumn: 'span 3', marginTop: '2px' }}>
              <label>Description</label>
              <textarea
                className="editor"
                rows={4}
                placeholder="Write description..."
                value={formData.description}
                onChange={handleChange("description")}
                disabled={loading}
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>

          {formError && <p className="admin-markup-form-error" style={{ marginTop: '16px' }}>{formError}</p>}
          {saved && <p className="menu-form-success" style={{ marginTop: '16px' }}>Page saved successfully.</p>}

          <div className="submit-area">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "SAVING..." : (editingPage ? "UPDATE" : "SUBMIT")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPage;
