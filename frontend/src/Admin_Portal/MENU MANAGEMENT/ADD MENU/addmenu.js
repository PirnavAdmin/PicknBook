import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, List, RotateCcw } from "lucide-react";
import "./addmenu.css";
import { createMenuItem, updateMenuItem } from "../../../services/menuService";

const DEFAULT_FORM = {
  name: "",
  slug: "",
  displayTitle: "",
  order: "",
  module: "B2C",
  location: "header",
  status: "active",
  icon: "",
};

export default function AdminMenuAddPage({ onBack }) {
  const locationState = useLocation();
  const navigate = useNavigate();
  const editItem = locationState.state?.editItem;

  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormValues({
        name: editItem.name || "",
        slug: editItem.slug || "",
        displayTitle: editItem.displayTitle || "",
        order: String(editItem.order ?? ""),
        module: editItem.module || "B2C",
        location: editItem.location || "header",
        status: editItem.status || "active",
        icon: editItem.icon || "",
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
  }, [editItem]);

  const handleChange = (field) => (event) => {
    setFormValues((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleReset = () => {
    if (editItem) {
      setFormValues({
        name: editItem.name || "",
        slug: editItem.slug || "",
        displayTitle: editItem.displayTitle || "",
        order: String(editItem.order ?? ""),
        module: editItem.module || "B2C",
        location: editItem.location || "header",
        status: editItem.status || "active",
        icon: editItem.icon || "",
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
    setFormError("");
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setFormError("");

    const name = String(formValues.name || "").trim();
    const slug = String(formValues.slug || "").trim();
    const displayTitle = String(formValues.displayTitle || "").trim();
    const orderValue = Number(formValues.order);
    const moduleValue = String(formValues.module || "").trim();
    const locationVal = String(formValues.location || "").trim();
    const icon = String(formValues.icon || "").trim();

    if (!name || !slug || !displayTitle) {
      setFormError("Menu Name, Menu Title, and Menu Slug are required.");
      return;
    }

    if (!Number.isFinite(orderValue) || orderValue < 0) {
      setFormError("Enter a valid Menu Order number.");
      return;
    }

    if (!moduleValue || !locationVal) {
      setFormError("Menu Site Type and Menu Type are required.");
      return;
    }

    const payload = {
      name,
      slug,
      displayTitle,
      order: orderValue,
      module: moduleValue,
      location: locationVal,
      status: formValues.status === "inactive" ? "inactive" : "active",
      icon,
    };

    try {
      if (editItem) {
        await updateMenuItem(editItem.id, payload);
        setSaved(true);
        setTimeout(() => {
          if (onBack) onBack();
          else navigate("/admin/menu-management/menus");
        }, 1500);
      } else {
        await createMenuItem(payload);
        setSaved(true);
        setFormValues(DEFAULT_FORM);
      }
    } catch (error) {
      console.error("Error saving menu item:", error);
      setFormError(
        error.response?.data?.message ||
        "Failed to save menu. Check for duplicate Name/Slug/Location combination under the same module."
      );
    }
  };

  return (
    <section className="flight-markup-panel menu-management-panel">
      <header className="flight-markup-toolbar">
        <div className="flight-markup-title">
          <h1>{editItem ? "Edit Menu" : "Add Menu"}</h1>
        </div>

        {onBack && (
          <div className="flight-markup-actions">
            <button type="button" className="flight-markup-action-btn primary" onClick={onBack}>
              <List size={16} />
              <span>Menu List</span>
            </button>
          </div>
        )}
      </header>

      <section className="menu-form-shell">
        <form onSubmit={handleSubmit}>
          <div className="basic-details-ribbon-bar">
            <div className="basic-details-ribbon">Basic Details</div>
          </div>

          <div className="menu-form-grid">
            <label>
              <span>Menu Name</span>
              <input type="text" placeholder="Enter menu name" value={formValues.name} onChange={handleChange("name")} />
            </label>
            <label>
              <span>Menu Title</span>
              <input
                type="text"
                placeholder="Enter menu title"
                value={formValues.displayTitle}
                onChange={handleChange("displayTitle")}
              />
            </label>
            <label>
              <span>Menu Slug</span>
              <input type="text" placeholder="Enter menu slug" value={formValues.slug} onChange={handleChange("slug")} />
            </label>
            <label>
              <span>Menu Status</span>
              <select value={formValues.status} onChange={handleChange("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              <span>Menu Order</span>
              <input
                type="number"
                min="0"
                placeholder="Enter order number"
                value={formValues.order}
                onChange={handleChange("order")}
              />
            </label>
            <label>
              <span>Menu Site Type</span>
              <select value={formValues.module} onChange={handleChange("module")}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
            <label>
              <span>Menu Type</span>
              <select value={formValues.location} onChange={handleChange("location")}>
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="sidebar">Sidebar</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Menu Icon</span>
              <input type="text" placeholder="Enter icon name" value={formValues.icon} onChange={handleChange("icon")} />
            </label>
          </div>

          {formError && <p className="admin-markup-form-error">{formError}</p>}
          {saved && (
            <p className="menu-form-success">
              {editItem ? "Menu item updated successfully! Redirecting..." : "Menu item saved successfully."}
            </p>
          )}

          <div className="admin-markup-modal-actions menu-form-actions">
            <button type="button" className="secondary" onClick={handleReset}>
              <RotateCcw size={14} />
              Reset
            </button>
            <button type="submit" className="primary">
              <Check size={14} />
              {editItem ? "Save Changes" : "Save Menu"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
