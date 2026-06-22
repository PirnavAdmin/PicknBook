import React, { useEffect, useMemo, useState } from "react";
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

const buildSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const AddPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageListPath = "/admin/page-management/pages";

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

    if (imageFile) {
      data.append("Image", imageFile);
    }
    if (bannerFile) {
      data.append("Banner", bannerFile);
    }

    try {
      setLoading(true);
      if (editingPage && editingPage.id) {
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
      <div className="top-bar">
        <h2>{editingPage ? "Edit Page" : "Add New Page"}</h2>
        <button className="list-btn" onClick={() => navigate(pageListPath)}>
          All Page List
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="section">
          <h3><span className="title-tab">Basic Details</span></h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Title</label>
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
              <label>Image [max_size: 1MB] {formData.imageName && <span className="current-file">({formData.imageName})</span>}</label>
              <input type="file" onChange={handleFileChange("image")} disabled={loading} accept="image/*" />
            </div>

            <div className="form-group">
              <label>OG Image [max_size: 1MB] {formData.bannerName && <span className="current-file">({formData.bannerName})</span>}</label>
              <input type="file" onChange={handleFileChange("banner")} disabled={loading} accept="image/*" />
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
          </div>
        </div>

        <div className="section">
          <h3><span className="title-tab">Description</span></h3>
          <textarea
            className="editor"
            rows={4}
            placeholder="Write description..."
            value={formData.description}
            onChange={handleChange("description")}
            disabled={loading}
          />
        </div>

        {formError && <p className="admin-markup-form-error">{formError}</p>}
        {saved && <p className="menu-form-success">Page saved successfully.</p>}

        <div className="submit-area">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "SAVING..." : (editingPage ? "UPDATE" : "SUBMIT")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPage;
