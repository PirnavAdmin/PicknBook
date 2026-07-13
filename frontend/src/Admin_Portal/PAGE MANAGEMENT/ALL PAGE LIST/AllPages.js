import React, { useEffect, useState } from "react";
import "./AllPages.css";
import { useNavigate } from "react-router-dom";
import { getAdminPages, deleteAdminPage } from "../../../services/cmsPageService";
import { Eye, Edit2, Trash2, X } from 'lucide-react';
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
  const [selectedPage, setSelectedPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


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
    if (window.confirm("Are you sure you want to delete this page?")) {
      try {
        await deleteAdminPage(id);
        setPages(pages.filter((page) => page.id !== id));
      } catch (err) {
        console.error("Error deleting page:", err);
        alert("Failed to delete the page. Please try again.");
      }
    }
  };

  const handleEdit = (page) => {
    navigate(pageCreatePath, { state: { page } });
  };

  const handleView = (page) => {
    setSelectedPage(page);
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
        <h2>All Page List</h2>
        <button className="add-btn" onClick={() => navigate(pageCreatePath)}>
          + Add New Page
        </button>
      </div>

      {selectedPage && (
        <div style={{
          padding: '16px',
          borderRadius: '14px',
          border: '1.5px solid var(--border)',
          background: 'var(--panel)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
          display: 'grid',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Page Details</div>
            <button
              type="button"
              className="action-btn delete-btn-icon"
              style={{ width: '28px', height: '28px' }}
              onClick={() => setSelectedPage(null)}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Title</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPage.title}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Slug</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPage.slug}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Module</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPage.module}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Status</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPage.status || 'Active'}</div>
            </div>
          </div>
        </div>
      )}

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
              <th>Action</th>
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
                  <td>{indexOfFirstItem + index + 1}</td>
                  <td>{page.title}</td>
                  <td>{page.slug}</td>
                  <td>
                    {page.imagePath ? (
                      <span className="file-link" title={page.imagePath}>
                        {page.imagePath.split(/[/\\]/).pop()}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{page.module}</td>
                  <td>{formatDateTime(page.updatedAtUtc || page.updateDate)}</td>
                  <td>{formatDateTime(page.createdAtUtc || page.entryDate)}</td>
                  <td>
                    <span className={`status ${(page.status || "Active").toLowerCase() === "inactive" ? "inactive" : "active"}`}>
                      {page.status || "Active"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button className="action-btn view-btn-icon" title="View Details" onClick={() => handleView(page)}>
                        <Eye size={16} />
                      </button>
                      <button className="action-btn edit-btn-icon" title="Edit Page" onClick={() => handleEdit(page)}>
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn delete-btn-icon"
                        title="Delete Page"
                        onClick={() => handleDelete(page.id)}
                      >
                        <Trash2 size={16} />
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

    </div>
  );
};

export default AllPages;
