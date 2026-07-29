/* eslint-disable */
import React, { useState } from "react";
import { List } from "lucide-react";
import "./AddOffercategory.css";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";

const DEFAULT_FORM = {
  name: "",
};

const getCurrentStamp = () => {
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
};

export default function AdminAddOfferCategoryPage({ onBack }) {
  const [categories, setCategories] = useAdminList("offer-categories", []);
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaved(false);

    const name = String(formValues.name || "").trim();

    if (!name) {
      setFormError("Category name is required.");
      return;
    }

    const timestamp = getCurrentStamp();
    const newCategory = {
      id: getNextNumericId(categories, 1),
      name,
      entryDate: timestamp,
      updatedDate: timestamp,
      status: "active",
      description: "",
    };

    setCategories((previous) => [newCategory, ...previous]);
    setFormError("");
    setSaved(true);
  };

  return (
    <section className="flight-markup-panel">
      <header className="flight-markup-toolbar">
        <div className="flight-markup-title">
          <h1>
            <strong>Add Offer</strong> Category
          </h1>
          <div className="flight-markup-title-underline" aria-hidden="true" />
        </div>

        {onBack && (
          <div className="flight-markup-actions">
            <button type="button" className="flight-markup-action-btn primary" onClick={onBack}>
              <List size={16} />
              <span>Offer Category List</span>
            </button>
          </div>
        )}
      </header>

      <section className="menu-form-shell offer-category-add-shell">
        <form className="offer-category-add-form" onSubmit={handleSubmit}>
          <div className="offer-category-add-row">
            <label htmlFor="offer-category-name" className="offer-category-add-label">
              Category Name <span aria-hidden="true">*</span>
            </label>
            <div className="offer-category-add-input-wrap">
              <input
                id="offer-category-name"
                type="text"
                placeholder="Enter category name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((previous) => ({ ...previous, name: event.target.value }))
                }
              />
            </div>
          </div>

          {formError && <p className="admin-markup-form-error">{formError}</p>}
          {saved && <p className="menu-form-success">Offer category saved locally.</p>}

          <div className="admin-markup-modal-actions menu-form-actions offer-category-add-actions">
            <button type="submit" className="primary">
              Submit
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
