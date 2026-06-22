import React, { useEffect, useState } from "react";
import "./AllPages.css";
import { useNavigate } from "react-router-dom";
import { getAdminPages, deleteAdminPage } from "../../../services/cmsPageService";
import { Eye, Edit2, Trash2, X } from 'lucide-react';

const AllPages = () => {
  const navigate = useNavigate();
  const pageCreatePath = "/admin/page-management/pages/new";

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await getAdminPages();
      setPages(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching admin pages:", err);
      setError("Failed to fetch pages from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

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
        <h2>All Page <span>List</span></h2>
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
            {pages.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>No pages found.</td>
              </tr>
            ) : (
              pages.map((page, index) => (
                <tr key={page.id}>
                  <td>{index + 1}</td>
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
    </div>
  );
};

export default AllPages;
