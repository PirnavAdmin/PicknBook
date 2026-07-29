/* eslint-disable */
import React, { useMemo, useState, useEffect } from "react";
import { Check, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import "./OfferCategoryList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import AdminPagination from "../../../components/AdminPagination";

const INITIAL_CATEGORIES = [
  {
    id: 1,
    name: "Bus Offer",
    entryDate: "13 Sep 2025, 03:19 PM",
    updatedDate: "13 Sep 2025, 03:19 PM",
    status: "active",
    description: "Category covering all bus-related promotional campaigns.",
  },
];

const DEFAULT_FILTERS = {
  query: "",
  status: "all",
};

const DEFAULT_EDIT_FORM = {
  name: "",
  entryDate: "",
  updatedDate: "",
  status: "active",
  description: "",
};

const COL_WIDTHS = ["6%", "44%", "17%", "17%", "8%", "8%"];
const HEADERS = ["SN", "Category Name", "Entry Date", "Updated Date", "Status", "Action"];

function getCurrentStamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("en-US", { month: "short" });
  const year = now.getFullYear();
  let hour = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const meridiem = hour >= 12 ? "PM" : "AM";

  hour %= 12;
  hour = hour || 12;

  return `${day} ${month} ${year}, ${String(hour).padStart(2, "0")}:${minutes} ${meridiem}`;
}

export default function AdminOfferCategoryListPage({ onAddCategory }) {
  const [categories, setCategories] = useAdminList("offer-categories", INITIAL_CATEGORIES);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [editCategory, setEditCategory] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredCategories = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesQuery = !query || category.name.toLowerCase().includes(query);
      const matchesStatus = filters.status === "all" || category.status === filters.status;

      return matchesQuery && matchesStatus;
    });
  }, [categories, filters]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCategories.length]);

  const handleFilterChange = (field) => (event) => {
    setFilters((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  const handleToggleStatus = (id) => {
    const updatedDate = getCurrentStamp();

    setCategories((previous) =>
      previous.map((category) =>
        category.id === id
          ? {
              ...category,
              status: category.status === "active" ? "inactive" : "active",
              updatedDate,
            }
          : category
      )
    );
  };

  const openEditModal = (category) => {
    setEditError("");
    setEditCategory(category);
    setEditForm({
      name: category.name || "",
      entryDate: category.entryDate || "",
      updatedDate: category.updatedDate || "",
      status: category.status || "active",
      description: category.description || "",
    });
  };

  const handleEditSave = () => {
    const name = String(editForm.name || "").trim();
    const entryDate = String(editForm.entryDate || "").trim();

    if (!name || !entryDate) {
      setEditError("Category name and entry date are required.");
      return;
    }

    const updatedDate = getCurrentStamp();

    setCategories((previous) =>
      previous.map((category) =>
        category.id === editCategory.id
          ? {
              ...category,
              name,
              entryDate,
              updatedDate,
              status: editForm.status,
              description: String(editForm.description || "").trim(),
            }
          : category
      )
    );

    setEditCategory(null);
    setEditError("");
  };

  const handleDeleteConfirm = () => {
    if (!deleteCategory) {
      return;
    }

    setCategories((previous) => previous.filter((category) => category.id !== deleteCategory.id));
    setDeleteCategory(null);
  };

  return (
    <>
      <section className="flight-markup-panel">
        <header className="flight-markup-toolbar">
          <div className="flight-markup-title">
            <h1>
              <strong>Offer Category</strong> List
            </h1>
            <div className="flight-markup-title-underline" aria-hidden="true" />
          </div>

          <div className="admin-markup-coupon-actions">
            <button
              type="button"
              className={`admin-markup-coupon-btn filter ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((previous) => !previous)}
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <button type="button" className="admin-markup-coupon-btn clear" onClick={handleClearFilters}>
              <X size={16} />
              <span>Clear Filter</span>
            </button>
            {onAddCategory && (
              <button type="button" className="admin-markup-coupon-btn generate" onClick={onAddCategory}>
                <Plus size={16} />
                <span>Add Category</span>
              </button>
            )}
          </div>
        </header>

        {showFilters && (
          <section className="flight-destination-filter-panel">
            <div className="flight-destination-filter-grid">
              <label>
                <span>Category Name</span>
                <input
                  type="text"
                  value={filters.query}
                  onChange={handleFilterChange("query")}
                  placeholder="Search category..."
                />
              </label>
              <label>
                <span>Status</span>
                <select value={filters.status} onChange={handleFilterChange("status")}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </section>
        )}

        <section className="admin-markup-table-wrap">
          <table className="admin-markup-table">
            <colgroup>
              {COL_WIDTHS.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th key={header} className={header === "Action" ? "action-col" : undefined}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={HEADERS.length}>
                    <p className="admin-markup-empty">No offer categories found.</p>
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{category.name}</td>
                    <td>{category.entryDate}</td>
                    <td>{category.updatedDate}</td>
                    <td>
                      <button
                        type="button"
                        className={`markup-status-toggle ${category.status}`}
                        onClick={() => handleToggleStatus(category.id)}
                        aria-label={`Set category ${category.id} status to ${
                          category.status === "active" ? "inactive" : "active"
                        }`}
                      >
                        {category.status === "active" ? <Check size={14} /> : <X size={14} />}
                        <span>{category.status === "active" ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td className="action-col">
                      <div className="markup-action-group" aria-label="Offer category actions">
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEditModal(category)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete ${category.name}`}
                          className="danger"
                          onClick={() => setDeleteCategory(category)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: "16px", padding: "0 24px 24px" }}>
            <AdminPagination
              currentPage={currentPage}
              totalItems={filteredCategories.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemName="categories"
            />
          </div>
        </section>
      </section>

      {editCategory && (
        <div className="admin-markup-modal-backdrop" onClick={() => setEditCategory(null)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Edit offer category"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Edit Offer Category</h2>
              <button type="button" onClick={() => setEditCategory(null)} aria-label="Close edit category">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              <label>
                <span>Category Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
                />
              </label>
              <label>
                <span>Entry Date</span>
                <input
                  type="text"
                  value={editForm.entryDate}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, entryDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                <span>Updated Date</span>
                <input type="text" value={editForm.updatedDate} disabled />
              </label>
              <label className="wide">
                <span>Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                />
              </label>
            </div>

            {editError && <p className="admin-markup-form-error">{editError}</p>}

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditCategory(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteCategory && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteCategory(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete offer category"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Offer Category</h2>
              <button type="button" onClick={() => setDeleteCategory(null)} aria-label="Close delete category">
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete <strong>{deleteCategory.name}</strong>?
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteCategory(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
