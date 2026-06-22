import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, Pencil, Plus, SlidersHorizontal, Trash2, X, Loader2 } from "lucide-react";
import "./FlightPopularDestination.css";
import { formatCouponDateTime } from "../../../utils/adminPortalUtils";
import {
  getPopularDestinations,
  createPopularDestination,
  updatePopularDestination,
  deletePopularDestination,
} from "../../../services/flightBookingService";

function createDefaultFlightPopularDestinationForm() {
  return {
    title: "",
    subTitle: "",
    category: "",
    placement: "main",
    url: "",
    status: "active",
    imageName: "",
    imageUrl: "",
  };
}

function safeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

export default function AdminFlightPopularDestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("entryDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(createDefaultFlightPopularDestinationForm);
  const [addError, setAddError] = useState("");
  const [viewDestination, setViewDestination] = useState(null);
  const [editDestination, setEditDestination] = useState(null);
  const [editForm, setEditForm] = useState(createDefaultFlightPopularDestinationForm);
  const [editError, setEditError] = useState("");
  const [deleteDestination, setDeleteDestination] = useState(null);

  const colWidths = ["4%", "14%", "12%", "12%", "8%", "10%", "8%", "16%", "8%", "8%"];
  const headers = [
    "#",
    "Entry Date",
    "Title",
    "Sub Title",
    "Image",
    "Category",
    "Side/Main",
    "Url",
    "Status",
    "Action",
  ];

  const fetchDestinations = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getPopularDestinations();
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load destinations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const availableCategories = useMemo(() => {
    const unique = new Set(
      destinations.map((item) => String(item.category || "").trim()).filter(Boolean)
    );

    return Array.from(unique);
  }, [destinations]);

  const visibleDestinations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedStatusFilter = String(statusFilter || "all").toLowerCase();
    const normalizedCategoryFilter = String(categoryFilter || "all").toLowerCase();
    const normalizedPlacementFilter = String(placementFilter || "all").toLowerCase();

    const filtered = destinations.filter((destination) => {
      const title = String(destination.title || "").toLowerCase();
      const subTitle = String(destination.subTitle || "").toLowerCase();
      const category = String(destination.category || "").toLowerCase();
      const placement = String(destination.placement || "").toLowerCase();
      const url = String(destination.url || "").toLowerCase();
      const status = String(destination.status || "").toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        title.includes(normalizedQuery) ||
        subTitle.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        url.includes(normalizedQuery);

      const matchesStatus =
        normalizedStatusFilter === "all" || status === normalizedStatusFilter;
      const matchesCategory =
        normalizedCategoryFilter === "all" || category === normalizedCategoryFilter;
      const matchesPlacement =
        normalizedPlacementFilter === "all" || placement === normalizedPlacementFilter;

      return matchesQuery && matchesStatus && matchesCategory && matchesPlacement;
    });

    const getSortValue = (destination) => {
      if (sortBy === "entryDate") {
        const timestamp = new Date(destination.entryDate).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      }

      if (sortBy === "title") {
        return String(destination.title || "").toLowerCase();
      }

      if (sortBy === "category") {
        return String(destination.category || "").toLowerCase();
      }

      if (sortBy === "placement") {
        return String(destination.placement || "").toLowerCase();
      }

      if (sortBy === "status") {
        return String(destination.status || "").toLowerCase();
      }

      return String(destination[sortBy] || "").toLowerCase();
    };

    const sorted = [...filtered].sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);

      let result = 0;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else {
        result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return String(sortOrder).toLowerCase() === "asc" ? result : -result;
    });

    return sorted;
  }, [categoryFilter, destinations, placementFilter, query, sortBy, sortOrder, statusFilter]);

  const hasActiveFilters =
    query.trim() ||
    sortBy !== "entryDate" ||
    sortOrder !== "desc" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    placementFilter !== "all";

  const handleClearFilters = () => {
    setQuery("");
    setSortBy("entryDate");
    setSortOrder("desc");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPlacementFilter("all");
    setIsFilterPanelOpen(false);
  };

  const handleOpenAddModal = () => {
    setAddError("");
    setAddForm(createDefaultFlightPopularDestinationForm());
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddError("");
    setAddForm(createDefaultFlightPopularDestinationForm());
  };

  const handleAddFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAddForm((previous) => ({ ...previous, imageName: "", imageUrl: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAddForm((previous) => ({
        ...previous,
        imageName: file.name,
        imageUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddDestination = async () => {
    const title = String(addForm.title || "").trim();
    const subTitle = String(addForm.subTitle || "").trim();
    const category = String(addForm.category || "").trim();
    const placement = String(addForm.placement || "").trim().toLowerCase();
    const normalizedUrl = safeExternalUrl(addForm.url);
    const status = String(addForm.status || "active").trim().toLowerCase();

    if (!title) {
      setAddError("Title is required.");
      return;
    }

    if (!category) {
      setAddError("Category is required.");
      return;
    }

    if (placement !== "main" && placement !== "side") {
      setAddError("Choose Side or Main placement.");
      return;
    }

    if (!normalizedUrl) {
      setAddError("Enter a valid URL.");
      return;
    }

    if (!addForm.imageUrl) {
      setAddError("Image is required.");
      return;
    }

    const payload = {
      title,
      subTitle,
      category,
      placement,
      url: normalizedUrl,
      status: status === "inactive" ? "inactive" : "active",
      imageName: addForm.imageName,
      imageUrl: addForm.imageUrl,
    };

    setAddError("");
    try {
      const newDest = await createPopularDestination(payload);
      setDestinations((prev) => [newDest, ...prev]);
      setIsAddModalOpen(false);
      setAddForm(createDefaultFlightPopularDestinationForm());
    } catch (err) {
      setAddError(err.message || "Failed to add popular destination.");
    }
  };

  const handleOpenEditModal = (destination) => {
    setEditError("");
    setEditDestination(destination);
    setEditForm({
      title: destination.title || "",
      subTitle: destination.subTitle || "",
      category: destination.category || "",
      placement: destination.placement || "main",
      url: destination.url || "",
      status: destination.status || "active",
      imageName: destination.imageName || "",
      imageUrl: destination.imageUrl || "",
    });
  };

  const handleCloseEditModal = () => {
    setEditError("");
    setEditDestination(null);
    setEditForm(createDefaultFlightPopularDestinationForm());
  };

  const handleEditFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setEditForm((previous) => ({
        ...previous,
        imageName: editDestination?.imageName || "",
        imageUrl: editDestination?.imageUrl || "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((previous) => ({
        ...previous,
        imageName: file.name,
        imageUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditDestination = async () => {
    if (!editDestination) {
      return;
    }

    const title = String(editForm.title || "").trim();
    const subTitle = String(editForm.subTitle || "").trim();
    const category = String(editForm.category || "").trim();
    const placement = String(editForm.placement || "").trim().toLowerCase();
    const normalizedUrl = safeExternalUrl(editForm.url);
    const status = String(editForm.status || "active").trim().toLowerCase();

    if (!title) {
      setEditError("Title is required.");
      return;
    }

    if (!category) {
      setEditError("Category is required.");
      return;
    }

    if (placement !== "main" && placement !== "side") {
      setEditError("Choose Side or Main placement.");
      return;
    }

    if (!normalizedUrl) {
      setEditError("Enter a valid URL.");
      return;
    }

    if (!editForm.imageUrl) {
      setEditError("Image is required.");
      return;
    }

    const payload = {
      title,
      subTitle,
      category,
      placement,
      url: normalizedUrl,
      status: status === "inactive" ? "inactive" : "active",
      imageName: editForm.imageName,
      imageUrl: editForm.imageUrl,
    };

    setEditError("");
    try {
      const updatedDest = await updatePopularDestination(editDestination.id, payload);
      setDestinations((prev) =>
        prev.map((item) => (item.id === editDestination.id ? updatedDest : item))
      );
      setEditDestination(null);
      setEditForm(createDefaultFlightPopularDestinationForm());
    } catch (err) {
      setEditError(err.message || "Failed to update popular destination.");
    }
  };

  const handleToggleStatus = async (id) => {
    const target = destinations.find((item) => item.id === id);
    if (!target) return;

    const newStatus = target.status === "active" ? "inactive" : "active";
    const payload = {
      title: target.title,
      subTitle: target.subTitle,
      category: target.category,
      placement: target.placement,
      url: target.url,
      status: newStatus,
      imageName: target.imageName,
      imageUrl: target.imageUrl,
    };

    try {
      const updated = await updatePopularDestination(id, payload);
      setDestinations((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      alert(err.message || "Failed to toggle status.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDestination) {
      return;
    }

    try {
      await deletePopularDestination(deleteDestination.id);
      setDestinations((prev) => prev.filter((item) => item.id !== deleteDestination.id));
      setViewDestination((previous) => (previous?.id === deleteDestination.id ? null : previous));
      setDeleteDestination(null);
    } catch (err) {
      alert(err.message || "Failed to delete destination.");
    }
  };

  return (
    <>
      <section className="admin-b2c-page flight-markup-panel">
        <header className="flight-markup-toolbar">
          <div className="flight-markup-title">
            <h1>Popular Destination List</h1>
            <div className="flight-markup-title-underline" aria-hidden="true" />
          </div>

          <div className="flight-markup-actions">
            <button
              type="button"
              className={`flight-markup-action-btn filter ${isFilterPanelOpen ? "active" : ""}`}
              onClick={() => setIsFilterPanelOpen((previous) => !previous)}
              aria-expanded={isFilterPanelOpen}
              aria-controls="flight-popular-destination-filters"
            >
              <SlidersHorizontal size={16} />
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="flight-markup-action-btn secondary"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <X size={16} />
              <span>Clear Filter</span>
            </button>
            <button type="button" className="flight-markup-action-btn primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>Add Popular Destination</span>
            </button>
          </div>
        </header>

        {isFilterPanelOpen && (
          <section className="flight-destination-filter-panel" id="flight-popular-destination-filters">
            <div className="flight-destination-filter-grid">
              <label className="wide">
                <span>Search</span>
                <input
                  type="text"
                  placeholder="Search title, category, url..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <label>
                <span>Sort By</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="entryDate">Entry Date</option>
                  <option value="title">Title</option>
                  <option value="category">Category</option>
                  <option value="placement">Side/Main</option>
                  <option value="status">Status</option>
                </select>
              </label>

              <label>
                <span>Order</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Side/Main</span>
                <select
                  value={placementFilter}
                  onChange={(event) => setPlacementFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {errorMessage && (
          <div style={{ color: "red", padding: "10px", fontWeight: "bold" }}>
            {errorMessage}
          </div>
        )}

        <section className="flight-markup-table-wrap">
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px", gap: "10px", alignItems: "center" }}>
              <Loader2 className="spin" size={24} />
              <span>Loading popular destinations...</span>
            </div>
          ) : (
            <div className="flight-markup-table-scroll">
              <table className="flight-markup-table flight-destinations-table">
                <colgroup>
                  {colWidths.map((width, index) => (
                    <col key={`${width}-${index}`} style={{ width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {headers.map((headerLabel) => (
                      <th key={headerLabel}>
                        <div className="flight-markup-th-pill">
                          <span>{headerLabel}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDestinations.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="flight-markup-empty-cell">
                        <span className="flight-markup-empty">No Record Found...</span>
                      </td>
                    </tr>
                  ) : (
                    visibleDestinations.map((destination, index) => {
                      const placementLabel =
                        String(destination.placement || "").toLowerCase() === "side" ? "Side" : "Main";
                      const url = safeExternalUrl(destination.url);

                      return (
                        <tr key={destination.id}>
                          <td>{index + 1}</td>
                          <td>{formatCouponDateTime(destination.entryDate)}</td>
                          <td>{destination.title}</td>
                          <td>{destination.subTitle || "--"}</td>
                          <td>
                            <div className="markup-action-group">
                              <button
                                type="button"
                                title="View"
                                aria-label={`View image for ${destination.title}`}
                                onClick={() => setViewDestination(destination)}
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                          <td>{destination.category}</td>
                          <td>{placementLabel}</td>
                          <td className="flight-destination-url">
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                {destination.url}
                              </a>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`flight-route-status-btn ${destination.status}`}
                              onClick={() => handleToggleStatus(destination.id)}
                              aria-label={`Set destination ${destination.id} status to ${
                                destination.status === "active" ? "inactive" : "active"
                              }`}
                            >
                              {destination.status === "active" ? <Check size={14} /> : <X size={14} />}
                              <span>{destination.status === "active" ? "Active" : "Inactive"}</span>
                            </button>
                          </td>
                          <td>
                            <div className="markup-action-group" aria-label="Destination actions">
                              <button
                                type="button"
                                title="Edit"
                                aria-label={`Edit destination ${destination.id}`}
                                onClick={() => handleOpenEditModal(destination)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                aria-label={`Delete destination ${destination.id}`}
                                className="danger"
                                onClick={() => setDeleteDestination(destination)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {isAddModalOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={handleCloseAddModal}>
          <section
            className="admin-markup-coupon-modal generate"
            role="dialog"
            aria-modal="true"
            aria-label="Add popular destination"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="generate-header">
              <h2>Add Popular Destination</h2>
            </header>

            <div className="admin-markup-coupon-form admin-markup-coupon-generate-form">
              <label>
                <span>Title :</span>
                <input
                  type="text"
                  placeholder="Enter title"
                  value={addForm.title}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Sub Title :</span>
                <input
                  type="text"
                  placeholder="Enter sub title"
                  value={addForm.subTitle}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, subTitle: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Category :</span>
                <input
                  type="text"
                  placeholder="Enter category"
                  value={addForm.category}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Side/Main :</span>
                <select
                  value={addForm.placement}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, placement: event.target.value }))
                  }
                >
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                </select>
              </label>

              <label>
                <span>Url :</span>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={addForm.url}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, url: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Status :</span>
                <select
                  value={addForm.status}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, status: event.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="wide">
                <span>Image :</span>
                <input type="file" accept="image/*" onChange={handleAddFileChange} />
              </label>
            </div>

            {addError && <p className="admin-markup-coupon-error">{addError}</p>}

            <div className="admin-markup-coupon-modal-actions generate-actions">
              <button type="button" className="primary generate-submit" onClick={handleAddDestination}>
                <Check size={16} />
                <span>Submit</span>
              </button>
              <button type="button" className="danger generate-cancel" onClick={handleCloseAddModal}>
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {viewDestination && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewDestination(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="View destination image"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Destination Image</h2>
              <button
                type="button"
                onClick={() => setViewDestination(null)}
                aria-label="Close image"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flight-route-image-body">
              {viewDestination.imageUrl ? (
                <img src={viewDestination.imageUrl} alt="Popular destination" />
              ) : (
                <p>No image uploaded.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {editDestination && (
        <div className="admin-markup-coupon-backdrop" onClick={handleCloseEditModal}>
          <section
            className="admin-markup-coupon-modal generate"
            role="dialog"
            aria-modal="true"
            aria-label="Edit popular destination"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="generate-header">
              <h2>Edit Popular Destination</h2>
            </header>

            <div className="admin-markup-coupon-form admin-markup-coupon-generate-form">
              <label>
                <span>Title :</span>
                <input
                  type="text"
                  placeholder="Enter title"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Sub Title :</span>
                <input
                  type="text"
                  placeholder="Enter sub title"
                  value={editForm.subTitle}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, subTitle: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Category :</span>
                <input
                  type="text"
                  placeholder="Enter category"
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Side/Main :</span>
                <select
                  value={editForm.placement}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, placement: event.target.value }))
                  }
                >
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                </select>
              </label>

              <label>
                <span>Url :</span>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={editForm.url}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, url: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Status :</span>
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

              <label className="wide">
                <span>Image :</span>
                <input type="file" accept="image/*" onChange={handleEditFileChange} />
              </label>
            </div>

            {editError && <p className="admin-markup-coupon-error">{editError}</p>}

            <div className="admin-markup-coupon-modal-actions generate-actions">
              <button type="button" className="primary generate-submit" onClick={handleEditDestination}>
                <Check size={16} />
                <span>Save</span>
              </button>
              <button type="button" className="danger generate-cancel" onClick={handleCloseEditModal}>
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteDestination && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteDestination(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete popular destination"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Popular Destination</h2>
              <button
                type="button"
                onClick={() => setDeleteDestination(null)}
                aria-label="Close delete destination dialog"
              >
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete <strong>{deleteDestination.title}</strong>?
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteDestination(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
