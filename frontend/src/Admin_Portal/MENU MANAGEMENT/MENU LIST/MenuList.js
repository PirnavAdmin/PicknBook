import React, { useEffect, useState, useMemo } from "react";
import { Check, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import "./MenuList.css";
import { getAdminMenuItems, updateMenuItem, deleteMenuItem } from "../../../services/menuService";
import AdminPagination from "../../../components/AdminPagination";

const DEFAULT_EDIT_FORM = {
  name: "",
  slug: "",
  displayTitle: "",
  order: "",
  module: "B2C",
  location: "header",
  status: "active",
};

const colWidths = ["5%", "18%", "12%", "14%", "8%", "8%", "11%", "9%", "15%"];
const headers = [
  "SN",
  "Name",
  "Slug",
  "Display Title",
  "Order",
  "Module",
  "Menu Location",
  "Status",
  "Action",
];

export default function AdminMenuListPage({ onAddMenu, onEditMenu }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedMenus = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return menuItems.slice(startIndex, startIndex + itemsPerPage);
  }, [menuItems, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(menuItems.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [menuItems.length]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const data = await getAdminMenuItems();
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleToggleStatus = async (itemToToggle) => {
    try {
      const updatedItem = {
        name: itemToToggle.name,
        slug: itemToToggle.slug,
        displayTitle: itemToToggle.displayTitle,
        order: itemToToggle.order,
        module: itemToToggle.module,
        location: itemToToggle.location,
        status: itemToToggle.status === "active" ? "inactive" : "active",
      };
      await updateMenuItem(itemToToggle.id, updatedItem);
      fetchMenus();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert(error.response?.data?.message || "Failed to toggle status.");
    }
  };

  const openEditModal = (item) => {
    setEditError("");
    setEditItem(item);
    setEditForm({
      name: item.name || "",
      slug: item.slug || "",
      displayTitle: item.displayTitle || "",
      order: String(item.order ?? ""),
      module: item.module || "B2C",
      location: item.location || "header",
      status: item.status || "active",
    });
  };

  const handleEditSave = async () => {
    if (!editItem) {
      return;
    }

    const name = String(editForm.name || "").trim();
    const slug = String(editForm.slug || "").trim();
    const displayTitle = String(editForm.displayTitle || "").trim();
    const orderValue = Number(editForm.order);
    const module = String(editForm.module || "").trim();
    const location = String(editForm.location || "").trim();
    const status = String(editForm.status || "active").trim().toLowerCase();

    if (!name || !slug || !displayTitle) {
      setEditError("Name, slug, and display title are required.");
      return;
    }

    if (!Number.isFinite(orderValue) || orderValue < 0) {
      setEditError("Enter a valid order number.");
      return;
    }

    if (!module) {
      setEditError("Module is required.");
      return;
    }

    if (!location) {
      setEditError("Menu location is required.");
      return;
    }

    try {
      await updateMenuItem(editItem.id, {
        name,
        slug,
        displayTitle,
        order: orderValue,
        module,
        location,
        status,
      });
      setEditItem(null);
      setEditError("");
      fetchMenus();
    } catch (error) {
      console.error("Error saving changes:", error);
      setEditError(error.response?.data?.message || "Failed to save menu changes. Ensure composite unique constraint is not violated.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      await deleteMenuItem(deleteItem.id);
      setDeleteItem(null);
      setViewItem((previous) => (previous?.id === deleteItem.id ? null : previous));
      fetchMenus();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      alert("Failed to delete menu item.");
    }
  };

  return (
    <>
      <section className="flight-markup-panel menu-management-panel">
        {/* ── Header outside table container ── */}
        <div className="menu-list-header">
          <h1 className="menu-list-heading">Menu List</h1>
          <button
            type="button"
            className="menu-list-add-btn"
            onClick={onAddMenu}
          >
            <Plus size={16} />
            Add Menu
          </button>
        </div>

        <section className="admin-markup-table-wrap menu-list-container">
          {loading ? (
            <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading menus...</p>
          ) : (
            <table className="admin-markup-table menu-list-table">
              <colgroup>
                {colWidths.map((width, index) => (
                  <col key={`${width}-${index}`} style={{ width }} />
                ))}
              </colgroup>
              <thead style={{ background: '#A51C49', backgroundColor: '#A51C49' }}>
                <tr style={{ background: '#A51C49', backgroundColor: '#A51C49' }}>
                  {headers.map((header) => (
                    <th key={header} className={header === "Action" ? "action-col" : undefined} style={{ background: '#A51C49', backgroundColor: '#A51C49', color: '#ffffff' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuItems.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length}>
                      <p className="admin-markup-empty">No menu records found.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMenus.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.slug}</td>
                      <td>{item.displayTitle}</td>
                      <td>{item.order}</td>
                      <td>{item.module}</td>
                      <td>{item.location}</td>
                      <td>
                        <button
                          type="button"
                          className={`markup-status-toggle ${item.status}`}
                          onClick={() => handleToggleStatus(item)}
                          aria-label={`Set menu ${item.id} status to ${
                            item.status === "active" ? "inactive" : "active"
                          }`}
                        >
                          {item.status === "active" ? <Check size={14} /> : <X size={14} />}
                          <span>{item.status === "active" ? "Active" : "Inactive"}</span>
                        </button>
                      </td>
                      <td className="action-col">
                        <div className="markup-action-group" aria-label="Menu actions">
                          <button
                            type="button"
                            title="View"
                            aria-label={`View menu ${item.name}`}
                            onClick={() => setViewItem(item)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            aria-label={`Edit menu ${item.name}`}
                            onClick={() => onEditMenu ? onEditMenu(item) : openEditModal(item)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            aria-label={`Delete menu ${item.name}`}
                            className="danger"
                            onClick={() => setDeleteItem(item)}
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
          )}

          <div style={{ marginTop: '16px', padding: '0 20px 20px' }}>
            <AdminPagination
              currentPage={currentPage}
              totalItems={menuItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemName="menus"
            />
          </div>
        </section>
      </section>

      {viewItem && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewItem(null)}>
          <section
            className="admin-markup-modal"
            role="dialog"
            aria-modal="true"
            aria-label="View menu details"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Menu Details</h2>
              <button type="button" onClick={() => setViewItem(null)} aria-label="Close view dialog">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-modal-grid">
              <div>
                <span>Name</span>
                <strong>{viewItem.name}</strong>
              </div>
              <div>
                <span>Slug</span>
                <strong>{viewItem.slug}</strong>
              </div>
              <div>
                <span>Display Title</span>
                <strong>{viewItem.displayTitle}</strong>
              </div>
              <div>
                <span>Order</span>
                <strong>{viewItem.order}</strong>
              </div>
              <div>
                <span>Module</span>
                <strong>{viewItem.module}</strong>
              </div>
              <div>
                <span>Menu Location</span>
                <strong>{viewItem.location}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{viewItem.status}</strong>
              </div>
            </div>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setViewItem(null)}>
                Close
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  if (onEditMenu) {
                    onEditMenu(viewItem);
                  } else {
                    openEditModal(viewItem);
                  }
                  setViewItem(null);
                }}
              >
                Edit
              </button>
            </div>
          </section>
        </div>
      )}

      {editItem && (
        <div className="admin-markup-modal-backdrop" onClick={() => setEditItem(null)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Edit menu"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Edit Menu</h2>
              <button type="button" onClick={() => setEditItem(null)} aria-label="Close edit dialog">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, slug: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Display Title</span>
                <input
                  type="text"
                  value={editForm.displayTitle}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, displayTitle: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Order</span>
                <input
                  type="number"
                  min="0"
                  value={editForm.order}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, order: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Module</span>
                <select
                  value={editForm.module}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, module: event.target.value }))
                  }
                >
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <label>
                <span>Menu Location</span>
                <select
                  value={editForm.location}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, location: event.target.value }))
                  }
                >
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                  <option value="sidebar">Sidebar</option>
                </select>
              </label>
              <label className="wide">
                <span>Status</span>
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, status: event.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            {editError && <p className="admin-markup-form-error">{editError}</p>}

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteItem && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteItem(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete menu"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Menu</h2>
              <button type="button" onClick={() => setDeleteItem(null)} aria-label="Close delete dialog">
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete <strong>{deleteItem.name}</strong>?
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteItem(null)}>
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
