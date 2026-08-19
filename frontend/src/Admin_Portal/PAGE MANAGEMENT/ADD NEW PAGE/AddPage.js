/* eslint-disable */
import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
  List, Info, Image as ImageIcon, Globe, FileText, ChevronDown, Check, AlertCircle 
} from "lucide-react";
import "./AddPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { createAdminPage, updateAdminPage } from "../../../services/cmsPageService";

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

const MODULE_OPTIONS = [
  { value: "All", label: "All" },
  { value: "B2C", label: "B2C" },
  { value: "B2B", label: "B2B" },
  { value: "Admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active", dotClass: "active" },
  { value: "Inactive", label: "Inactive", dotClass: "inactive" },
];

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
  
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_FORM,
    title: editingPage?.title || "",
    slug: editingPage?.slug || "",
    status: editingPage?.status || "Active",
    module: editingPage?.module || "All",
    metaTitle: editingPage?.metaTitle || "",
    metaKeyword: editingPage?.metaKeyword || "",
    metaDescription: editingPage?.metaDescription || "",
    description: editingPage?.description || "",
    imageName: editingPage?.imagePath ? editingPage.imagePath.split(/[/\\]/).pop() : (editingPage?.imageName || ""),
    bannerName: editingPage?.bannerPath ? editingPage.bannerPath.split(/[/\\]/).pop() : (editingPage?.bannerName || ""),
  }));

  useEffect(() => {
    if (editingPage) {
      setFormData({
        title: editingPage.title || "",
        slug: editingPage.slug || "",
        status: editingPage.status || "Active",
        module: editingPage.module || "All",
        metaTitle: editingPage.metaTitle || "",
        metaKeyword: editingPage.metaKeyword || "",
        metaDescription: editingPage.metaDescription || "",
        description: editingPage.description || "",
        imageName: editingPage.imagePath ? editingPage.imagePath.split(/[/\\]/).pop() : (editingPage.imageName || ""),
        bannerName: editingPage.bannerPath ? editingPage.bannerPath.split(/[/\\]/).pop() : (editingPage.bannerName || ""),
      });
    }
  }, [editingPage]);

  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  // Dropdown States
  const [moduleOpen, setModuleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const moduleRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (moduleRef.current && !moduleRef.current.contains(event.target)) {
        setModuleOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files?.[0];
    if (file && file.size > 1024 * 1024) {
      setFormError("File size must be within 1MB limit.");
      event.target.value = "";
      if (field === "image") {
        setImageFile(null);
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
    } else if (field === "banner") {
      setBannerFile(file || null);
      setFormData((previous) => ({ ...previous, bannerName: file ? file.name : "" }));
    }
  };

  const handleRemoveFile = (field) => {
    if (field === "image") {
      setImageFile(null);
      setFormData((previous) => ({ ...previous, imageName: "" }));
      const fileInput = document.getElementById("image-input");
      if (fileInput) fileInput.value = "";
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

    if (!formData.imageName) {
      data.append("DeleteImage", "true");
      data.append("RemoveImage", "true");
      data.append("ClearImage", "true");
      data.append("IsImageDeleted", "true");
      data.append("imageDeleted", "true");
      data.append("removeImage", "true");
    }

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
    }
    if (bannerFile) {
      data.append("Banner", bannerFile);
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

  const currentModuleOpt = MODULE_OPTIONS.find(o => o.value === formData.module) || MODULE_OPTIONS[0];
  const currentStatusOpt = STATUS_OPTIONS.find(o => o.value === formData.status) || STATUS_OPTIONS[0];

  return (
    <div className="add-container">
      {/* Top Header */}
      <div className="page-add-header-wrapper">
        <div className="page-add-title-box">
          <h1>{editingPage ? "Edit Page Content" : "Add New Page"}</h1>
          <p>Configure dynamic content and SEO details for website pages</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="page-new-badge">{editingPage ? "# EDIT" : "# NEW"}</span>
          <button 
            type="button" 
            className="page-btn-cancel" 
            style={{ height: '36px', padding: '0 16px' }}
            onClick={() => navigate(pageListPath)}
          >
            <List size={16} /> All Page List
          </button>
        </div>
      </div>

      <form className="page-form-layout" onSubmit={handleSubmit}>
        
        {/* 1. Basic Details */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">1</span>
            <h2>Basic Information</h2>
          </div>
          <div className="form-grid-2">
            <div className="form-field-wrapper">
              <label htmlFor="page-title">Title <span>*</span></label>
              <input
                id="page-title"
                type="text"
                placeholder="Enter page title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-field-wrapper">
              <label htmlFor="page-slug">Slug</label>
              <input
                id="page-slug"
                type="text"
                placeholder="Enter slug path (automatically generated if empty)"
                value={formData.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-field-wrapper" ref={statusRef}>
              <label>Status <span>*</span></label>
              <div 
                className={`custom-select-trigger ${statusOpen ? "active" : ""}`}
                onClick={() => setStatusOpen(!statusOpen)}
              >
                <div className="trigger-value-box">
                  <span className={`status-dot ${currentStatusOpt.dotClass}`} />
                  <span>{currentStatusOpt.label}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              {statusOpen && (
                <div className="custom-select-options">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = opt.value === formData.status;
                    return (
                      <div
                        key={opt.value}
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          handleChange("status", opt.value);
                          setStatusOpen(false);
                        }}
                      >
                        <div className="option-value-box">
                          <span className={`status-dot ${opt.dotClass}`} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-field-wrapper" ref={moduleRef}>
              <label>Module <span>*</span></label>
              <div 
                className={`custom-select-trigger ${moduleOpen ? "active" : ""}`}
                onClick={() => setModuleOpen(!moduleOpen)}
              >
                <div className="trigger-value-box">
                  <Globe size={16} />
                  <span>{currentModuleOpt.label}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              {moduleOpen && (
                <div className="custom-select-options">
                  {MODULE_OPTIONS.map((opt) => {
                    const isSelected = opt.value === formData.module;
                    return (
                      <div
                        key={opt.value}
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          handleChange("module", opt.value);
                          setModuleOpen(false);
                        }}
                      >
                        <div className="option-value-box">
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Page Media */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">2</span>
            <h2>Page Media</h2>
          </div>
          
          <div className="form-grid-2">
            {/* Image Upload */}
            <div className="form-field-wrapper">
              <label>Page Thumbnail Image [max_size: 1MB]</label>
              <div className="page-image-section-body">
                {formData.imageName && (
                  <div className="current-image-preview-card">
                    <div style={{ padding: '24px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', wordBreak: 'break-all' }}>
                      <ImageIcon size={24} style={{ display: 'block', margin: '0 auto 6px auto', color: '#be185d' }} />
                      {formData.imageName}
                    </div>
                    <button 
                      type="button" 
                      className="remove-image-badge"
                      onClick={() => handleRemoveFile("image")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div 
                  className="drag-drop-upload-zone"
                  onClick={() => document.getElementById("image-input").click()}
                >
                  <ImageIcon size={28} className="upload-icon-box" />
                  <span className="upload-prompt-text">Choose Thumbnail Image</span>
                  <span className="upload-hint-text">PNG, JPG up to 1MB</span>
                  
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange("image")}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* OG Banner Upload */}
            <div className="form-field-wrapper">
              <label>OG Share Banner [max_size: 1MB]</label>
              <div className="page-image-section-body">
                {formData.bannerName && (
                  <div className="current-image-preview-card">
                    <div style={{ padding: '24px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', wordBreak: 'break-all' }}>
                      <ImageIcon size={24} style={{ display: 'block', margin: '0 auto 6px auto', color: '#be185d' }} />
                      {formData.bannerName}
                    </div>
                    <button 
                      type="button" 
                      className="remove-image-badge"
                      onClick={() => handleRemoveFile("banner")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div 
                  className="drag-drop-upload-zone"
                  onClick={() => document.getElementById("banner-input").click()}
                >
                  <ImageIcon size={28} className="upload-icon-box" />
                  <span className="upload-prompt-text">Choose OG Banner</span>
                  <span className="upload-hint-text">PNG, JPG up to 1MB</span>
                  
                  <input
                    id="banner-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange("banner")}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SEO Details */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">3</span>
            <h2>SEO Meta Information</h2>
          </div>
          <div className="form-grid-3">
            <div className="form-field-wrapper">
              <label htmlFor="meta-title">Meta Title</label>
              <textarea
                id="meta-title"
                placeholder="Enter Meta Title for Search Engines"
                value={formData.metaTitle}
                onChange={(e) => handleChange("metaTitle", e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="meta-keyword">Meta Keyword</label>
              <textarea
                id="meta-keyword"
                placeholder="Enter Keywords (comma separated)"
                value={formData.metaKeyword}
                onChange={(e) => handleChange("metaKeyword", e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="meta-desc">Meta Description</label>
              <textarea
                id="meta-desc"
                placeholder="Enter Meta Description summary"
                value={formData.metaDescription}
                onChange={(e) => handleChange("metaDescription", e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 4. Description Content */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">4</span>
            <h2>Page Description & Content</h2>
          </div>
          <div className="form-field-wrapper">
            <label htmlFor="page-desc">Content Description</label>
            <div className="textarea-count-wrapper">
              <textarea
                id="page-desc"
                placeholder="Write full description and HTML page content here..."
                rows={8}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Logs */}
        {formError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem', padding: '0 8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        {saved && (
          <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', padding: '0 8px' }}>
            Page content saved successfully.
          </div>
        )}

        {/* Actions Footer */}
        <div className="page-form-actions-bar">
          <button 
            type="button" 
            className="page-btn-cancel"
            onClick={() => navigate(pageListPath)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="page-btn-save"
            disabled={loading}
          >
            {loading ? "Saving Content..." : (editingPage ? "Update Page" : "Create Page")}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddPage;
