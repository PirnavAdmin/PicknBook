import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./AllPages.css";
import { useNavigate } from "react-router-dom";
import { getAdminPages, createAdminPage, deleteAdminPage, updateAdminPage, resolveCmsImageUrl } from "../../../services/cmsPageService";
import { NgrokSafeImage } from "../../../services/apiClient";
import AdminPagination from "../../../components/AdminPagination";
import { Eye, Edit2, Trash2, X, ChevronDown, FileText, AlertTriangle, Upload, Check, Image as ImageIcon } from 'lucide-react';


const AllPages = () => {
  const navigate = useNavigate();
  const pageCreatePath = "/admin/page-management/add-page";

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [deletingPage, setDeletingPage] = useState(null);
  const [activePopupImage, setActivePopupImage] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editFormData, setEditFormData] = useState({
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
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editBannerFile, setEditBannerFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editBannerPreview, setEditBannerPreview] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const normalizeKey = (str) => String(str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const getStoredStatusOverrides = () => {
    try {
      return JSON.parse(localStorage.getItem("cms_page_status_overrides") || "{}");
    } catch {
      return {};
    }
  };

  const setStoredStatusOverride = (slugOrId, status) => {
    try {
      const current = getStoredStatusOverrides();
      if (slugOrId) {
        current[slugOrId] = status;
        const norm = normalizeKey(slugOrId);
        if (norm) current[norm] = status;
      }
      localStorage.setItem("cms_page_status_overrides", JSON.stringify(current));
    } catch (e) {
      console.warn("Failed to save status override:", e);
    }
  };

  const getStoredImageOverrides = () => {
    try {
      return JSON.parse(localStorage.getItem("cms_page_image_overrides") || "{}");
    } catch {
      return {};
    }
  };

  const setStoredImageOverride = (slugOrId, imagePath) => {
    try {
      const current = getStoredImageOverrides();
      if (slugOrId) {
        current[slugOrId] = imagePath;
        const norm = normalizeKey(slugOrId);
        if (norm) current[norm] = imagePath;
      }
      localStorage.setItem("cms_page_image_overrides", JSON.stringify(current));
    } catch (e) {
      console.warn("Failed to save image override:", e);
    }
  };

  const getStoredDeletedSlugs = () => {
    try {
      return JSON.parse(localStorage.getItem("cms_page_deleted_slugs") || "[]");
    } catch {
      return [];
    }
  };

  const addStoredDeletedSlug = (slugOrId) => {
    try {
      const current = getStoredDeletedSlugs();
      if (slugOrId && !current.includes(slugOrId)) {
        current.push(slugOrId);
        const norm = normalizeKey(slugOrId);
        if (norm && !current.includes(norm)) current.push(norm);
        localStorage.setItem("cms_page_deleted_slugs", JSON.stringify(current));
      }
    } catch (e) {
      console.warn("Failed to save deleted slug:", e);
    }
  };

  const handleToggleStatus = async (pageToUpdate) => {
    const currentStatus = String(pageToUpdate.status || "Active").toLowerCase();
    const newStatus = currentStatus === "active" ? "Inactive" : "Active";
    const slugKey = pageToUpdate.slug || pageToUpdate.id;

    // Persist status override locally so it stays across page refreshes
    setStoredStatusOverride(slugKey, newStatus);
    if (pageToUpdate.id) {
      setStoredStatusOverride(pageToUpdate.id, newStatus);
    }

    // Optimistic state update
    setPages(prevPages =>
      prevPages.map(p => (p.slug === pageToUpdate.slug || p.id === pageToUpdate.id) ? { ...p, status: newStatus } : p)
    );

    if (pageToUpdate.id && !String(pageToUpdate.id).startsWith("default-")) {
      try {
        const formData = new FormData();
        formData.append("Title", pageToUpdate.title || "");
        formData.append("Slug", pageToUpdate.slug || "");
        formData.append("Status", newStatus);
        formData.append("Module", pageToUpdate.module || "All");
        formData.append("Description", pageToUpdate.description || "");
        if (pageToUpdate.imagePath) formData.append("ImagePath", pageToUpdate.imagePath);
        if (pageToUpdate.bannerPath) formData.append("BannerPath", pageToUpdate.bannerPath);

        await updateAdminPage(pageToUpdate.id, formData);
      } catch (err) {
        console.error("Error toggling page status on backend:", err);
      }
    }
  };


  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await getAdminPages();
      const normalizedData = Array.isArray(data) ? data : (data?.data || data?.pages || data?.list || []);

      const deletedSlugs = getStoredDeletedSlugs();

      // Filter out deleted items from backend API records
      const filteredMerged = normalizedData.filter(
        (p) => !deletedSlugs.includes(p.slug) && !deletedSlugs.includes(p.id) && !deletedSlugs.includes(normalizeKey(p.slug))
      );

      const overrides = getStoredStatusOverrides();
      const imageOverrides = getStoredImageOverrides();
      const finalPages = filteredMerged.map((p) => {
        const pSlug = p.slug || "";
        const pTitle = p.title || "";
        const pId = p.id || "";

        const overrideStatus =
          overrides[pSlug] ||
          overrides[normalizeKey(pSlug)] ||
          overrides[normalizeKey(pTitle)] ||
          overrides[pId];

        const overrideImg =
          imageOverrides[pSlug] ||
          imageOverrides[normalizeKey(pSlug)] ||
          imageOverrides[normalizeKey(pTitle)] ||
          imageOverrides[pId];

        const finalImg = overrideImg || getPageImageVal(p);

        return {
          ...p,
          ...(overrideStatus ? { status: overrideStatus } : {}),
          ...(finalImg ? { imagePath: finalImg } : {}),
        };
      });

      setPages(finalPages);
      setError(null);
    } catch (err) {
      console.error("Error fetching admin pages from backend:", err);
      setError(err?.message || "Failed to load admin pages from backend.");
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
    setCurrentPage(1);
  }, []);

  const totalItems = pages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = pages.slice(indexOfFirstItem, indexOfLastItem);


  const getPageImageVal = (page) => {
    if (!page) return "";
    return (
      page.imagePath ||
      page.ImagePath ||
      page.image ||
      page.Image ||
      page.imageUrl ||
      page.ImageUrl ||
      page.bannerPath ||
      page.BannerPath ||
      page.banner ||
      page.Banner ||
      ""
    );
  };

  const handleOpenEdit = (pageToEdit) => {
    setEditingPage(pageToEdit);
    const imgPath = getPageImageVal(pageToEdit);
    const bnrPath = pageToEdit.bannerPath || pageToEdit.BannerPath || pageToEdit.banner || pageToEdit.Banner || "";
    setEditFormData({
      title: pageToEdit.title || pageToEdit.Title || "",
      slug: pageToEdit.slug || pageToEdit.Slug || "",
      status: pageToEdit.status || pageToEdit.Status || "Active",
      module: pageToEdit.module || pageToEdit.Module || "All",
      metaTitle: pageToEdit.metaTitle || pageToEdit.MetaTitle || "",
      metaKeyword: pageToEdit.metaKeyword || pageToEdit.MetaKeyword || "",
      metaDescription: pageToEdit.metaDescription || pageToEdit.MetaDescription || "",
      description: pageToEdit.description || pageToEdit.Description || "",
      imageName: imgPath ? imgPath.split(/[/\\]/).pop() : "",
      bannerName: bnrPath ? bnrPath.split(/[/\\]/).pop() : "",
    });
    setEditImageFile(null);
    setEditBannerFile(null);
    setEditImagePreview(imgPath ? resolveCmsImageUrl(imgPath, "image") : "");
    setEditBannerPreview(bnrPath ? resolveCmsImageUrl(bnrPath, "banner") : "");
    setEditError("");
    setActiveDropdownId(null);
  };

  const handleEditInputChange = (field) => (e) => {
    setEditFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleEditFileChange = (field) => (e) => {
    const file = e.target.files?.[0];
    if (file && file.size > 1024 * 1024) {
      setEditError("File size must be within 1MB limit.");
      return;
    }
    setEditError("");
    if (field === "image") {
      setEditImageFile(file || null);
      if (file) {
        setEditImagePreview(URL.createObjectURL(file));
        setEditFormData((prev) => ({ ...prev, imageName: file.name }));
      }
    } else if (field === "banner") {
      setEditBannerFile(file || null);
      if (file) {
        setEditBannerPreview(URL.createObjectURL(file));
        setEditFormData((prev) => ({ ...prev, bannerName: file.name }));
      }
    }
  };

  const fileToDataURL = (file) => {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPage) return;

    if (!editFormData.title.trim()) {
      setEditError("Page title is required.");
      return;
    }

    setEditLoading(true);
    setEditError("");

    const slug = editFormData.slug.trim() || editFormData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const updatedData = {
      ...editingPage,
      title: editFormData.title.trim(),
      slug: slug,
      status: editFormData.status,
      module: editFormData.module,
      metaTitle: editFormData.metaTitle,
      metaKeyword: editFormData.metaKeyword,
      metaDescription: editFormData.metaDescription,
      description: editFormData.description,
      updatedAtUtc: new Date().toISOString(),
    };

    setStoredStatusOverride(slug, editFormData.status);
    if (editingPage.id) {
      setStoredStatusOverride(editingPage.id, editFormData.status);
    }

    if (editImageFile) {
      const localDataUrl = await fileToDataURL(editImageFile);
      if (localDataUrl) {
        updatedData.imagePath = localDataUrl;
        setStoredImageOverride(slug, localDataUrl);
        if (editingPage.id) setStoredImageOverride(editingPage.id, localDataUrl);
      }
    }

    try {
      const formData = new FormData();
      formData.append("Title", updatedData.title);
      formData.append("Slug", updatedData.slug);
      formData.append("Status", updatedData.status);
      formData.append("Module", updatedData.module);
      formData.append("MetaTitle", updatedData.metaTitle || "");
      formData.append("MetaKeyword", updatedData.metaKeyword || "");
      formData.append("MetaDescription", updatedData.metaDescription || "");
      formData.append("Description", updatedData.description || "");

      if (editImageFile) {
        formData.append("Image", editImageFile);
        formData.append("image", editImageFile);
        formData.append("PageImage", editImageFile);
        formData.append("file", editImageFile);
      }
      if (editBannerFile) {
        formData.append("Banner", editBannerFile);
        formData.append("banner", editBannerFile);
        formData.append("BannerImage", editBannerFile);
      }

      let res = null;
      if (editingPage.id && !String(editingPage.id).startsWith("default-")) {
        res = await updateAdminPage(editingPage.id, formData);
      } else {
        res = await createAdminPage(formData);
      }

      if (res) {
        const savedImg = res.imagePath || res.ImagePath || res.image || res.Image;
        const savedBnr = res.bannerPath || res.BannerPath || res.banner || res.Banner;
        if (savedImg) {
          updatedData.imagePath = savedImg;
          setStoredImageOverride(slug, savedImg);
          if (editingPage.id) setStoredImageOverride(editingPage.id, savedImg);
        }
        if (savedBnr) {
          updatedData.bannerPath = savedBnr;
        }
        if (res.id) {
          updatedData.id = res.id;
        }
      }
    } catch (err) {
      console.error("Error saving page image on server:", err);
    }

    setPages((prev) => prev.map((p) => (p.id === editingPage.id || p.slug === slug ? { ...p, ...updatedData } : p)));
    setEditLoading(false);
    setEditingPage(null);
  };

  const handleOpenDelete = (pageToDelete) => {
    setDeletingPage(pageToDelete);
    setActiveDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPage) return;
    setDeleteLoading(true);
    try {
      const slugKey = deletingPage.slug || deletingPage.id;
      if (slugKey) addStoredDeletedSlug(slugKey);
      if (deletingPage.id) addStoredDeletedSlug(deletingPage.id);

      if (deletingPage.id && !String(deletingPage.id).startsWith("default-")) {
        await deleteAdminPage(deletingPage.id);
      }

      setPages((prev) => prev.filter((p) => p.id !== deletingPage.id && p.slug !== deletingPage.slug));
      setDeletingPage(null);
    } catch (err) {
      console.error("Error deleting page:", err);
      alert("Failed to delete page. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = (page) => {
    setSelectedPage(page);
    setShowFullDescription(false);
    setActiveDropdownId(null);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour12: true,
      }).replace(",", "");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="page-container">
      <div className="header">
        <h2 style={{ fontWeight: 500 }}>All Page List</h2>
        <button className="add-btn" onClick={() => navigate(pageCreatePath)}>
          + Add New Page
        </button>
      </div>



      <div className="admin-markup-table-wrap">
        <table className="page-table">
          <thead>
            <tr>
              <th>SN.</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Image</th>
              <th>Module</th>
              <th>Update Date</th>
              <th>Entry Date</th>
              <th>Status</th>
              <th className="action-header">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                  Loading pages...
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>No pages found.</td>
              </tr>
            ) : (
                currentItems.map((page, index) => (
                  <tr key={page.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{page.title}</td>
                    <td>{page.slug}</td>
                    <td>
                      {getPageImageVal(page) ? (
                        <div
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          onClick={() => {
                            const src = resolveCmsImageUrl(getPageImageVal(page), "image");
                            if (src) setActivePopupImage(src);
                          }}
                        >
                          <NgrokSafeImage
                            src={resolveCmsImageUrl(getPageImageVal(page), "image")}
                            alt={page.title}
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "8px",
                              objectFit: "cover",
                              border: "1px solid #cbd5e1",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                              transition: "transform 0.2s"
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>-</span>
                      )}
                    </td>
                    <td>{page.module}</td>
                    <td>{formatDateTime(page.updatedAtUtc || page.updateDate)}</td>
                    <td>{formatDateTime(page.createdAtUtc || page.entryDate)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(page)}
                        style={{
                          background: (page.status || "Active").toLowerCase() === "inactive" ? "#ffebee" : "#e8f5e9",
                          color: (page.status || "Active").toLowerCase() === "inactive" ? "#d93025" : "#00bfa5",
                          border: (page.status || "Active").toLowerCase() === "inactive" ? "1px solid #ffcdd2" : "1px solid #a5d6a7",
                          borderRadius: "8px",
                          padding: "5px 14px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {page.status || "Active"}
                      </button>
                    </td>
                    <td className="action-cell">
                      <div style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
                        <button
                          type="button"
                          className={`actions-trigger-btn ${activeDropdownId === page.id ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === page.id ? null : page.id);
                          }}
                        >
                          <span>Actions</span>
                          <ChevronDown size={14} />
                        </button>
                        {activeDropdownId === page.id && (
                          <div
                            style={{
                              position: "absolute",
                              ...(index >= currentItems.length - 2 || currentItems.length <= 3
                                ? { bottom: "100%", marginBottom: "6px" }
                                : { top: "100%", marginTop: "6px" }),
                              right: 0,
                              background: "#ffffff",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                              zIndex: 99999,
                              minWidth: "155px",
                              overflow: "hidden"
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(page);
                                setActiveDropdownId(null);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "10px 14px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#334155"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <Eye size={14} /> <span>View Page</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                navigate(pageCreatePath, { state: { page } });
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "10px 14px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#334155"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <Edit2 size={14} /> <span>Edit Page</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete(page);
                                setActiveDropdownId(null);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "10px 14px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#ef4444"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <Trash2 size={14} /> <span>Delete Page</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* AdminPagination inside table card */}
          <AdminPagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemName="pages"
          />
        </div>

      {/* Full-size Image Preview Popup Modal */}
      {activePopupImage && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 1000000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
          onClick={() => setActivePopupImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePopupImage(null)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#0f172a",
                color: "#ffffff",
                border: "2px solid #ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
              }}
            >
              <X size={18} />
            </button>
            <img
              src={activePopupImage}
              alt="CMS Page Asset Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "10px",
                objectFit: "contain"
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* 1. View Details Modal Popup */}
      {selectedPage && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedPage(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={20} color="#A51C49" />
                <span>Page Details: <span style={{ color: "#A51C49" }}>{selectedPage.title}</span></span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPage(null)}
                style={{
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Page ID</span>
                <div style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{selectedPage.id}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Slug</span>
                <div style={{ fontSize: "0.9rem", color: "#2563eb", fontWeight: 600 }}>{selectedPage.slug}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Module</span>
                <div style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{selectedPage.module || "B2C"}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Status</span>
                <div>
                  <span style={{
                    background: (selectedPage.status || "Active").toLowerCase() === "inactive" ? "#ffebee" : "#e8f5e9",
                    color: (selectedPage.status || "Active").toLowerCase() === "inactive" ? "#d93025" : "#00bfa5",
                    border: (selectedPage.status || "Active").toLowerCase() === "inactive" ? "1px solid #ffcdd2" : "1px solid #a5d6a7",
                    borderRadius: "6px",
                    padding: "3px 10px",
                    fontSize: "11px",
                    fontWeight: 600
                  }}>
                    {selectedPage.status || "Active"}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Entry Date</span>
                <div style={{ fontSize: "0.85rem", color: "#334155" }}>{formatDateTime(selectedPage.createdAtUtc || selectedPage.entryDate)}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Update Date</span>
                <div style={{ fontSize: "0.85rem", color: "#334155" }}>{formatDateTime(selectedPage.updatedAtUtc || selectedPage.updateDate)}</div>
              </div>
            </div>

            {(selectedPage.metaTitle || selectedPage.metaKeyword || selectedPage.metaDescription) && (
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#A51C49", fontWeight: 700, textTransform: "uppercase" }}>SEO Details</h4>
                <div style={{ display: "grid", gap: "8px", fontSize: "0.85rem" }}>
                  {selectedPage.metaTitle && <div><strong>Meta Title:</strong> {selectedPage.metaTitle}</div>}
                  {selectedPage.metaKeyword && <div><strong>Meta Keywords:</strong> {selectedPage.metaKeyword}</div>}
                  {selectedPage.metaDescription && <div><strong>Meta Description:</strong> {selectedPage.metaDescription}</div>}
                </div>
              </div>
            )}

            {(getPageImageVal(selectedPage) || selectedPage.bannerPath || selectedPage.BannerPath) && (
              <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                {getPageImageVal(selectedPage) && (
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>Page Image</span>
                    <NgrokSafeImage
                      src={resolveCmsImageUrl(getPageImageVal(selectedPage))}
                      alt="Page Image"
                      style={{ width: "100px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                      onClick={() => setActivePopupImage(resolveCmsImageUrl(getPageImageVal(selectedPage)))}
                    />
                  </div>
                )}
                {(selectedPage.bannerPath || selectedPage.BannerPath) && (
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>Banner Image</span>
                    <NgrokSafeImage
                      src={resolveCmsImageUrl(selectedPage.bannerPath || selectedPage.BannerPath)}
                      alt="Banner Image"
                      style={{ width: "140px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                      onClick={() => setActivePopupImage(resolveCmsImageUrl(selectedPage.bannerPath || selectedPage.BannerPath))}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Page Description / Content</span>
              <div style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "0.88rem",
                color: "#1e293b",
                lineHeight: "1.6",
                maxHeight: "300px",
                overflowY: "auto",
                whiteSpace: "pre-wrap"
              }}>
                {selectedPage.description ? (
                  /<[a-z][\s\S]*>/i.test(selectedPage.description) ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedPage.description }} />
                  ) : (
                    <div>
                      {showFullDescription || selectedPage.description.length <= 350
                        ? selectedPage.description
                        : `${selectedPage.description.slice(0, 350)}...`}
                      {selectedPage.description.length > 350 && (
                        <div style={{ marginTop: "12px" }}>
                          <button
                            type="button"
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            style={{
                              background: "#A51C49",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 12px",
                              fontWeight: 600,
                              fontSize: "0.78rem",
                              cursor: "pointer"
                            }}
                          >
                            {showFullDescription ? "View Less ▲" : "View More ▼"}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <span style={{ color: "#94a3b8" }}>No description available.</span>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Edit Page Modal Popup with Pre-populated Data */}
      {editingPage && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setEditingPage(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "750px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit2 size={20} color="#A51C49" />
                <span>Edit Page: <span style={{ color: "#A51C49" }}>{editingPage.title}</span></span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                style={{ border: "none", background: "#f1f5f9", color: "#475569", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", border: "1px solid #fecaca" }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Page Title *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={handleEditInputChange("title")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Slug</label>
                  <input
                    type="text"
                    value={editFormData.slug}
                    onChange={handleEditInputChange("slug")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Module</label>
                  <select
                    value={editFormData.module}
                    onChange={handleEditInputChange("module")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", background: "#ffffff" }}
                  >
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={handleEditInputChange("status")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", background: "#ffffff" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Page Image [max 1MB]</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {editImagePreview && (
                      <NgrokSafeImage src={editImagePreview} alt="Page Image Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                    )}
                    <div>
                      <label style={{ padding: "6px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                        Choose File
                        <input type="file" accept="image/*" onChange={handleEditFileChange("image")} style={{ display: "none" }} />
                      </label>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                        {editFormData.imageName || "No file chosen"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Banner Image [max 1MB]</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {editBannerPreview && (
                      <NgrokSafeImage src={editBannerPreview} alt="Banner Image Preview" style={{ width: "90px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                    )}
                    <div>
                      <label style={{ padding: "6px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                        Choose File
                        <input type="file" accept="image/*" onChange={handleEditFileChange("banner")} style={{ display: "none" }} />
                      </label>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                        {editFormData.bannerName || "No file chosen"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#A51C49", color: "#ffffff", padding: "8px 14px", fontWeight: 700, borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
                SEO Details
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Meta Title</label>
                  <input
                    type="text"
                    value={editFormData.metaTitle}
                    onChange={handleEditInputChange("metaTitle")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Meta Keywords</label>
                  <input
                    type="text"
                    value={editFormData.metaKeyword}
                    onChange={handleEditInputChange("metaKeyword")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Meta Description</label>
                  <textarea
                    rows="2"
                    value={editFormData.metaDescription}
                    onChange={handleEditInputChange("metaDescription")}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ background: "#A51C49", color: "#ffffff", padding: "8px 14px", fontWeight: 700, borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
                Description / Page Content
              </div>

              <div style={{ marginBottom: "20px" }}>
                <textarea
                  rows="6"
                  value={editFormData.description}
                  onChange={handleEditInputChange("description")}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  style={{ padding: "8px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{ padding: "8px 20px", background: "#A51C49", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", opacity: editLoading ? 0.7 : 1 }}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Delete Confirmation Modal Popup */}
      {deletingPage && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setDeletingPage(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e2e8f0",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>

            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
              Delete Page Confirmation
            </h3>

            <p style={{ margin: "0 0 16px 0", fontSize: "0.88rem", color: "#64748b" }}>
              Are you sure you want to delete this page? This action cannot be undone.
            </p>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "24px", textAlign: "left", fontSize: "0.85rem" }}>
              <div style={{ marginBottom: "4px" }}><strong>Page ID:</strong> <span style={{ color: "#2563eb" }}>{deletingPage.id}</span></div>
              <div style={{ marginBottom: "4px" }}><strong>Title:</strong> {deletingPage.title}</div>
              <div><strong>Slug:</strong> {deletingPage.slug}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setDeletingPage(null)}
                disabled={deleteLoading}
                style={{ padding: "8px 18px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{ padding: "8px 20px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete Page"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AllPages;
