/* eslint-disable */
import React, { useEffect, useState, useMemo } from "react";
import { Check, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import "./MenuList.css";
import { getAdminMenuItems, updateMenuItem, deleteMenuItem } from "../../../services/menuService";
import AdminPagination from "../../../components/AdminPagination";
import AdminDynamicModal from '../../../components/AdminDynamicModal';
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
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'view', data: null });
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
    const itemToDelete = modalState.data || deleteItem;
    if (!itemToDelete) return;

    try {
      await deleteMenuItem(itemToDelete.id);
      setDeleteItem(null);
      setModalState({ isOpen: false, mode: 'view', data: null });
      setViewItem((previous) => (previous?.id === itemToDelete.id ? null : previous));
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
                      <td className="action-col" style={{ verticalAlign: 'middle' }}>
                        <div className="admin-actions-cell-row">
                          <button
                            type="button"
                            className="admin-action-btn view"
                            title="View"
                            aria-label={`View menu ${item.name}`}
                            onClick={() => setModalState({ isOpen: true, mode: 'view', data: item })}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn edit"
                            title="Edit"
                            aria-label={`Edit menu ${item.name}`}
                            onClick={() => onEditMenu ? onEditMenu(item) : openEditModal(item)}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn delete"
                            title="Delete"
                            aria-label={`Delete menu ${item.name}`}
                            onClick={() => setModalState({ isOpen: true, mode: 'delete', data: item })}
                          >
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

      <AdminDynamicModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        moduleName="Menu"
        data={modalState.data}
        schema={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'slug', label: 'Slug', type: 'text', required: true },
          { name: 'displayTitle', label: 'Display Title', type: 'text', required: true },
          { name: 'order', label: 'Order', type: 'number' },
          { name: 'module', label: 'Module', type: 'select', options: ['B2C', 'B2B', 'Admin'] },
          { name: 'location', label: 'Menu Location', type: 'select', options: ['header', 'footer', 'sidebar'] },
          { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
        ]}
        onClose={() => setModalState({ isOpen: false, mode: 'view', data: null })}
        onSave={(updatedData) => {
          openEditModal({ ...modalState.data, ...updatedData });
          setModalState({ isOpen: false, mode: 'view', data: null });
        }}
        onDelete={() => handleDeleteConfirm()}
      />
    </>
  );
}
