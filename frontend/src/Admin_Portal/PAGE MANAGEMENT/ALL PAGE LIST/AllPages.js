/* eslint-disable */
import React, { useEffect, useState } from "react";
import "./AllPages.css";
import { useNavigate } from "react-router-dom";
import { getAdminPages, deleteAdminPage } from "../../../services/cmsPageService";
import { toApiAssetUrl, NgrokSafeImage } from "../../../services/apiClient";
import { Eye, Pencil, Trash2 } from 'lucide-react';
import AdminDynamicModal from '../../../components/AdminDynamicModal';
import {
  TERMS_CONDITIONS_TEXT,
  PRIVACY_POLICY_TEXT,
  REFUND_CANCELLATION_POLICY_TEXT,
} from "../../../data/legalPages";

const DEFAULT_PAGES = [
  {
    id: "default-privacy",
    title: "Privacy Policy",
    slug: "privacy-policy",
    description: PRIVACY_POLICY_TEXT,
    module: "B2C",
    status: "Active",
    entryDate: new Date().toISOString(),
    updateDate: new Date().toISOString(),
  },
  {
    id: "default-refund",
    title: "Refund & Cancellation Policy",
    slug: "refund-cancellation-policy",
    description: REFUND_CANCELLATION_POLICY_TEXT,
    module: "B2C",
    status: "Active",
    entryDate: new Date().toISOString(),
    updateDate: new Date().toISOString(),
  },
  {
    id: "default-terms",
    title: "Terms & Conditions",
    slug: "terms-conditions",
    description: TERMS_CONDITIONS_TEXT,
    module: "B2C",
    status: "Active",
    entryDate: new Date().toISOString(),
    updateDate: new Date().toISOString(),
  }
];

const AllPages = () => {
  const navigate = useNavigate();
  const pageCreatePath = "/admin/page-management/add-page";

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'view', data: null });

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await getAdminPages();

      const merged = [...(data || [])];
      DEFAULT_PAGES.forEach(defPage => {
        const alreadyExists = merged.some(p => p.slug === defPage.slug);
        if (!alreadyExists) {
          merged.push(defPage);
        }
      });

      setPages(merged);
      setError(null);
    } catch (err) {
      console.warn("Error fetching admin pages, using static default pages list:", err);
      setPages(DEFAULT_PAGES);
      setError(null);
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

  const handleDelete = async (id) => {
    try {
      await deleteAdminPage(id);
      setPages(pages.filter((page) => page.id !== id));
      setModalState({ isOpen: false, mode: 'view', data: null });
    } catch (err) {
      console.error("Error deleting page:", err);
      alert("Failed to delete the page. Please try again.");
    }
  };

  const handleEdit = (page) => {
    navigate(pageCreatePath, { state: { page } });
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

  // Schema for Edit mode
  const pageSchema = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'module', label: 'Module', type: 'select', options: ['B2C', 'B2B'], required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: false },
  ];

  return (
    <div className="page-container">
      <div className="header">
        <h2>All Page List</h2>
        <button className="add-btn" onClick={() => navigate(pageCreatePath)}>
          + Add New Page
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading pages...</div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button className="retry-btn" onClick={loadPages}>Retry</button>
        </div>
      ) : (
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
              <th className="action-col" style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>No pages found.</td>
              </tr>
            ) : (
              currentItems.map((page, index) => (
                <tr key={page.id}>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>{indexOfFirstItem + index + 1}</td>
                  <td style={{ verticalAlign: "middle" }}>{page.title}</td>
                  <td style={{ verticalAlign: "middle" }}>{page.slug}</td>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                    {(page.imageUrl || page.imagePath || page.image) && (page.imageUrl || page.imagePath || page.image) !== '-' ? (
                      <NgrokSafeImage
                        src={toApiAssetUrl(page.imageUrl || page.imagePath || page.image)}
                        alt={page.title}
                        style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", display: "block", margin: "0 auto" }}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>{page.module}</td>
                  <td style={{ verticalAlign: "middle" }}>{formatDateTime(page.updatedAtUtc || page.updateDate)}</td>
                  <td style={{ verticalAlign: "middle" }}>{formatDateTime(page.createdAtUtc || page.entryDate)}</td>
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                    <span className={`status ${(page.status || "Active").toLowerCase() === "inactive" ? "inactive" : "active"}`} style={{ display: 'inline-flex', margin: '0 auto' }}>
                      {page.status || "Active"}
                    </span>
                  </td>
                  <td className="action-col" style={{ verticalAlign: "middle" }}>
                    <div className="admin-actions-cell-row">
                      <button className="admin-action-btn view" title="View Details" onClick={() => setModalState({ isOpen: true, mode: 'view', data: page })}>
                        <Eye size={18} />
                      </button>
                      <button className="admin-action-btn edit" title="Edit Page" onClick={() => handleEdit(page)}>
                        <Pencil size={18} />
                      </button>
                      <button className="admin-action-btn delete" title="Delete Page" onClick={() => setModalState({ isOpen: true, mode: 'delete', data: page })}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages >= 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
          </div>
          <div className="page-numbers">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="page-btn"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`page-no-btn ${currentPage === pageNum ? "active" : ""}`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Modal for View / Edit / Delete */}
      <AdminDynamicModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        moduleName="Page"
        data={modalState.data}
        schema={pageSchema}
        onClose={() => setModalState({ isOpen: false, mode: 'view', data: null })}
        onSave={(updatedData) => {
          // Navigate to edit page with pre-filled data
          handleEdit({ ...modalState.data, ...updatedData });
          setModalState({ isOpen: false, mode: 'view', data: null });
        }}
        onDelete={() => {
          if (modalState.data) {
            handleDelete(modalState.data.id);
          }
        }}
      />

    </div>
  );
};

export default AllPages;
