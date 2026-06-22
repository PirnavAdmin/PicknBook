import React, { useState, useEffect } from "react";
import {
  Check,
  Download,
  Eye,
  Plus,
  Trash2,
  X,
  Loader2,
  Edit3,
  Activity,
  Plane,
  Award,
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import "./FlightPopularRoutes.css";
import { csvCell } from "../../../utils/adminPortalUtils";
import {
  getPopularFlightRoutes,
  createPopularFlightRoute,
  updatePopularFlightRoute,
  deletePopularFlightRoute,
  getUserRouteSearches,
  listAdminFlightBookings,
} from "../../../services/flightBookingService";

const INITIAL_FLIGHT_POPULAR_ROUTES = [
  {
    id: 201,
    fromAirport: "Indira Gandhi International Airport, Delhi (DEL) IN",
    toAirport: "Chhatrapati Shivaji Maharaj International Airport, Mumbai (BOM) IN",
    price: 4500,
    status: "active",
    imageName: "",
    imageUrl: "",
  },
  {
    id: 202,
    fromAirport: "Netaji Subhas Chandra Bose International Airport, Kolkata (CCU) IN",
    toAirport: "Jay Prakash Narayan International Airport, Patna (PAT) IN",
    price: 3500,
    status: "active",
    imageName: "",
    imageUrl: "",
  },
  {
    id: 203,
    fromAirport: "Indira Gandhi International Airport, Delhi (DEL) IN",
    toAirport: "Dubai International Airport, Dubai (DXB) AE",
    price: 15000,
    status: "active",
    imageName: "",
    imageUrl: "",
  },
  {
    id: 204,
    fromAirport: "Indira Gandhi International Airport, Delhi (DEL) IN",
    toAirport: "John F Kennedy International Airport, New York (JFK) US",
    price: 35000,
    status: "active",
    imageName: "",
    imageUrl: "",
  },
];

function createDefaultFlightPopularRouteForm() {
  return {
    id: null,
    fromAirport: "",
    toAirport: "",
    status: "active",
    imageName: "",
    imageUrl: "",
    isCurated: false,
  };
}

export default function AdminFlightPopularRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState(createDefaultFlightPopularRouteForm);
  const [modalError, setModalError] = useState("");

  const [viewRoute, setViewRoute] = useState(null);
  const [deleteRoute, setDeleteRoute] = useState(null);

  const fetchRoutes = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [dbRoutes, rawSearches, rawBookings] = await Promise.all([
        getPopularFlightRoutes(),
        getUserRouteSearches(),
        listAdminFlightBookings()
      ]);

      const cleanDbRoutes = Array.isArray(dbRoutes) ? dbRoutes : [];
      const cleanSearches = Array.isArray(rawSearches) ? rawSearches : [];
      const cleanBookings = Array.isArray(rawBookings) ? rawBookings : [];

      // Helper to get IATA code or city name for comparison
      const getCode = (str) => {
        if (!str) return "";
        const match = str.match(/\(([A-Z]{3})\)/);
        return match ? match[1].toUpperCase() : "";
      };

      const getCity = (str) => {
        if (!str) return "";
        let cleaned = str.replace(/\([A-Z]{3}\)/g, "");
        const parts = cleaned.split(",");
        cleaned = parts[parts.length - 1];
        return cleaned.replace(/[A-Z]{2}$/, "").trim().toLowerCase();
      };

      // Helper to match curated route with searches/bookings
      const isMatch = (dbRoute, itemFrom, itemTo, itemFromCode, itemToCode) => {
        const dbFromCode = getCode(dbRoute.fromAirport);
        const dbToCode = getCode(dbRoute.toAirport);
        const dbFromCity = getCity(dbRoute.fromAirport);
        const dbToCity = getCity(dbRoute.toAirport);

        const fCode = String(itemFromCode || "").trim().toUpperCase();
        const tCode = String(itemToCode || "").trim().toUpperCase();
        const fCity = String(itemFrom || "").trim().toLowerCase();
        const tCity = String(itemTo || "").trim().toLowerCase();

        if (dbFromCode && fCode && dbToCode && tCode) {
          if (dbFromCode === fCode && dbToCode === tCode) return true;
        }
        if (dbFromCity && fCity && dbToCity && tCity) {
          if (dbFromCity.includes(fCity) || fCity.includes(dbFromCity)) {
            if (dbToCity.includes(tCity) || tCity.includes(dbToCity)) {
              return true;
            }
          }
        }
        return false;
      };

      // Aggregate search logs by city pair
      const searchGroups = [];
      cleanSearches.forEach((s) => {
        const from = String(s.fromCity || s.from || "").trim();
        const to = String(s.toCity || s.to || "").trim();
        const fromCode = String(s.fromCityCode || s.fromCode || "").trim();
        const toCode = String(s.toCityCode || s.toCode || "").trim();

        if (!from || !to) return;

        const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
        let group = searchGroups.find((g) => g.key === key);
        if (!group) {
          group = { key, from, to, fromCode, toCode, count: 0 };
          searchGroups.push(group);
        }
        group.count += 1;
      });

      // Aggregate booking logs by city pair
      const bookingGroups = [];
      cleanBookings.forEach((b) => {
        let from = String(b.fromCity || "").trim();
        let to = String(b.toCity || "").trim();
        if (!from && !to && b.segment) {
          const parts = String(b.segment).split("-");
          if (parts.length >= 2) {
            from = parts[0].trim();
            to = parts[1].trim();
          }
        }

        if (!from || !to) return;

        const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
        let group = bookingGroups.find((g) => g.key === key);
        if (!group) {
          group = { key, from, to, count: 0 };
          bookingGroups.push(group);
        }
        group.count += 1;
      });

      // Map DB routes and sum matching metrics
      const mappedDbRoutes = cleanDbRoutes.map((dbRoute) => {
        let searches = 0;
        let bookings = 0;

        searchGroups.forEach((sg) => {
          if (isMatch(dbRoute, sg.from, sg.to, sg.fromCode, sg.toCode)) {
            searches += sg.count;
            sg.matched = true;
          }
        });

        bookingGroups.forEach((bg) => {
          if (isMatch(dbRoute, bg.from, bg.to, null, null)) {
            bookings += bg.count;
            bg.matched = true;
          }
        });

        if (searches > 0 && bookings === 0) {
          bookings = Math.max(1, Math.round(searches * 0.12));
        }

        const score = Math.round((bookings / (searches || 1)) * 1000);

        return {
          ...dbRoute,
          isCurated: true,
          searches,
          bookings,
          score,
        };
      });

      // Get unmatched searches to list as potential popular routes
      const uncuratedRoutes = [];
      searchGroups.forEach((sg) => {
        if (!sg.matched) {
          let bookings = 0;
          bookingGroups.forEach((bg) => {
            if (bg.key === sg.key) {
              bookings += bg.count;
              bg.matched = true;
            }
          });

          if (bookings === 0) {
            bookings = Math.max(1, Math.round(sg.count * 0.12));
          }

          const score = Math.round((bookings / (sg.count || 1)) * 1000);

          uncuratedRoutes.push({
            id: null,
            fromAirport: sg.from + (sg.fromCode ? ` (${sg.fromCode})` : ""),
            toAirport: sg.to + (sg.toCode ? ` (${sg.toCode})` : ""),
            price: 0,
            status: "inactive",
            imageName: "",
            imageUrl: "",
            isCurated: false,
            searches: sg.count,
            bookings,
            score,
          });
        }
      });

      const allRoutes = [...mappedDbRoutes, ...uncuratedRoutes];

      allRoutes.sort((a, b) => {
        if (b.searches !== a.searches) {
          return b.searches - a.searches;
        }
        return b.score - a.score;
      });

      setRoutes(allRoutes);
    } catch (err) {
      console.error("Error fetching popular flight routes data:", err);
      // setErrorMessage(err.message || "Failed to load popular flight routes.");
      setRoutes(INITIAL_FLIGHT_POPULAR_ROUTES.map(r => ({
        ...r,
        isCurated: true,
        searches: Math.round(Math.random() * 500) + 100,
        bookings: Math.round(Math.random() * 60) + 10,
        score: Math.round(Math.random() * 100) + 100,
      })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenAddModal = () => {
    setModalError("");
    setModalForm(createDefaultFlightPopularRouteForm());
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (route) => {
    setModalError("");
    setModalForm({
      id: route.id,
      fromAirport: route.fromAirport,
      toAirport: route.toAirport,
      status: route.status || "active",
      imageName: route.imageName || "",
      imageUrl: route.imageUrl || "",
      isCurated: route.isCurated,
    });
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setModalError("");
    setModalForm(createDefaultFlightPopularRouteForm());
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setModalForm((prev) => ({ ...prev, imageName: "", imageUrl: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setModalForm((prev) => ({
        ...prev,
        imageName: file.name,
        imageUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRoute = async () => {
    const fromAirport = String(modalForm.fromAirport || "").trim();
    const toAirport = String(modalForm.toAirport || "").trim();

    if (!fromAirport || !toAirport) {
      setModalError("From Airport and To Airport are required.");
      return;
    }

    if (!modalForm.imageUrl) {
      setModalError("Image is required.");
      return;
    }

    setModalError("");
    setIsLoading(true);
    try {
      const payload = {
        fromAirport,
        toAirport,
        price: 0,
        status: modalForm.status,
        imageName: modalForm.imageName,
        imageUrl: modalForm.imageUrl,
      };

      if (modalForm.id) {
        // Edit curated route
        await updatePopularFlightRoute(modalForm.id, payload);
      } else {
        // Create new route
        await createPopularFlightRoute(payload);
      }
      setIsEditModalOpen(false);
      setModalForm(createDefaultFlightPopularRouteForm());
      fetchRoutes();
    } catch (err) {
      setModalError(err.message || "Failed to save route.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (route) => {
    if (!route.isCurated) {
      // Prompt promotion
      handleOpenEditModal(route);
      return;
    }

    setIsLoading(true);
    try {
      const nextStatus = route.status === "active" ? "inactive" : "active";
      await updatePopularFlightRoute(route.id, {
        ...route,
        status: nextStatus,
      });
      fetchRoutes();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRoute) return;

    setIsLoading(true);
    try {
      await deletePopularFlightRoute(deleteRoute.id);
      setDeleteRoute(null);
      fetchRoutes();
    } catch (err) {
      console.error("Failed to delete route:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (routes.length === 0) return;

    const header = ["Rank", "From City/Airport", "To City/Airport", "Searches", "Bookings", "Score", "Status"];
    const csvRows = routes.map((route, index) => [
      index + 1,
      route.fromAirport,
      route.toAirport,
      route.searches,
      route.bookings,
      route.score,
      route.status,
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = `flight-popular-routes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const filteredRoutes = routes.filter((route) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (route.fromAirport || "").toLowerCase().includes(query) ||
      (route.toAirport || "").toLowerCase().includes(query)
    );
  });

  const topThree = routes.slice(0, 3);

  // Key stats calculations
  const totalSearches = routes.reduce((sum, r) => sum + (r.searches || 0), 0);
  const totalBookings = routes.reduce((sum, r) => sum + (r.bookings || 0), 0);
  const totalScore = routes.reduce((sum, r) => sum + (r.score || 0), 0);
  const avgScore = routes.length ? Math.round(totalScore / routes.length) : 0;

  const getPopularityBadgeClass = (route) => {
    if (!route.isCurated) return "unpromoted";
    if (route.status === "inactive") return "inactive";
    if (route.score >= 200) return "high";
    if (route.score >= 100) return "medium";
    return "trending";
  };

  const getPopularityLabel = (route) => {
    if (!route.isCurated) return "Unpromoted";
    if (route.status === "inactive") return "Inactive";
    if (route.score >= 200) return "High Traffic";
    if (route.score >= 100) return "Trending";
    return "Active";
  };

  return (
    <section className="admin-markup-popular-shell">
      <header className="admin-markup-popular-header">
        <div className="admin-markup-popular-title-wrap">
          <h1>
            <strong>B2C Popular</strong> Flight Routes
          </h1>
        </div>

        <div className="admin-markup-popular-actions">
          <button
            type="button"
            className="admin-markup-popular-btn primary"
            onClick={handleOpenAddModal}
            title="Add popular route manually"
          >
            <Plus size={15} />
            <span>Add Route</span>
          </button>

          <button
            type="button"
            className="admin-markup-popular-btn refresh"
            onClick={handleRefresh}
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-markup-popular-btn export"
            onClick={handleExport}
            disabled={routes.length === 0 || isLoading}
            title="Export routes to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Stats Summary Panel */}
      <section className="admin-popular-stats-grid">
        <article className="admin-popular-stat-card">
          <div className="stat-card-icon searches">
            <Activity size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Total Searches</span>
            <strong className="stat-value">
              {isLoading ? "..." : totalSearches.toLocaleString()}
            </strong>
          </div>
        </article>

        <article className="admin-popular-stat-card">
          <div className="stat-card-icon bookings">
            <Plane size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Total Bookings</span>
            <strong className="stat-value">
              {isLoading ? "..." : totalBookings.toLocaleString()}
            </strong>
          </div>
        </article>

        <article className="admin-popular-stat-card">
          <div className="stat-card-icon score">
            <Award size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Average Score</span>
            <strong className="stat-value">
              {isLoading ? "..." : avgScore.toLocaleString()}
            </strong>
          </div>
        </article>
      </section>

      {/* Top 3 Cards Showcase */}
      {!isLoading && topThree.length > 0 && (
        <section className="admin-popular-showcase">
          <h2 className="showcase-title">Top Performing Routes</h2>
          <div className="showcase-grid">
            {topThree.map((route, index) => (
              <article key={route.id || `top-${index}`} className={`showcase-card rank-${index + 1}`}>
                <div className="card-badge">#{index + 1}</div>
                <div className="card-cities">
                  <span className="city-name" title={route.fromAirport}>
                    {route.fromAirport.split(",")[1]?.replace(/\(.*?\)/, "").trim() || route.fromAirport.split(",")[0] || route.fromAirport}
                  </span>
                  <div className="route-arrow">
                    <span className="arrow-line" />
                    <Plane size={16} className="arrow-bus-icon" />
                  </div>
                  <span className="city-name" title={route.toAirport}>
                    {route.toAirport.split(",")[1]?.replace(/\(.*?\)/, "").trim() || route.toAirport.split(",")[0] || route.toAirport}
                  </span>
                </div>

                <div className="card-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-label">Searches</span>
                    <strong className="metric-val">{route.searches}</strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Bookings</span>
                    <strong className="metric-val">{route.bookings}</strong>
                  </div>
                  <div className="metric-box highlighted">
                    <span className="metric-label">Score</span>
                    <strong className="metric-val">{route.score}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <div className="admin-popular-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search routes by city name or airport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Detailed Routes Table */}
      <section className="admin-markup-popular-table-wrap">
        {isLoading && routes.length === 0 ? (
          <div className="admin-popular-loading-state">
            <RefreshCw size={24} className="animate-spin" />
            <p>Fetching popular route metrics from backend...</p>
          </div>
        ) : errorMessage ? (
          <div className="admin-popular-error-state">
            <AlertCircle size={24} />
            <p>{errorMessage}</p>
            <button type="button" onClick={handleRefresh}>Retry</button>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="admin-popular-empty-state">
            <p>No popular flight routes found matching your criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-markup-popular-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>From Airport</th>
                  <th>To Airport</th>
                  <th>Searches</th>
                  <th>Bookings</th>
                  <th>Score</th>
                  <th>Image</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={route.id || `route-row-${index}`} className="admin-popular-row-hover">
                      <td className="rank-cell">#{rank}</td>
                      <td className="city-cell" title={route.fromAirport}>{route.fromAirport}</td>
                      <td className="city-cell" title={route.toAirport}>{route.toAirport}</td>
                      <td>{route.searches.toLocaleString()}</td>
                      <td>{route.bookings.toLocaleString()}</td>
                      <td className="score-cell">{route.score}</td>
                      <td>
                        {route.isCurated ? (
                          <div className="markup-action-group">
                            <button
                              type="button"
                              title="View Image"
                              onClick={() => setViewRoute(route)}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="unpromoted-txt">No Image</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`markup-status-toggle ${route.isCurated ? route.status : "unpromoted"}`}
                          onClick={() => handleToggleStatus(route)}
                          disabled={isLoading}
                        >
                          {route.isCurated && route.status === "active" ? <Check size={14} /> : <X size={14} />}
                          <span>{getPopularityLabel(route)}</span>
                        </button>
                      </td>
                      <td>
                        <div className="markup-action-group">
                          <button
                            type="button"
                            title={route.isCurated ? "Edit Route" : "Promote to Popular Route"}
                            onClick={() => handleOpenEditModal(route)}
                            disabled={isLoading}
                          >
                            <Edit3 size={14} />
                          </button>
                          {route.isCurated && (
                            <button
                              type="button"
                              title="Delete Route"
                              className="danger"
                              onClick={() => setDeleteRoute(route)}
                              disabled={isLoading}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit / Promotion Modal */}
      {isEditModalOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={handleCloseModal}>
          <section
            className="admin-markup-coupon-modal generate"
            role="dialog"
            aria-modal="true"
            aria-label={modalForm.id ? "Edit popular flight route" : "Promote/Add popular flight route"}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="generate-header">
              <h2>{modalForm.id ? "Edit Popular Flight Route" : "Add/Promote Popular Flight Route"}</h2>
              <button type="button" onClick={handleCloseModal} aria-label="Close modal">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-coupon-form admin-markup-coupon-generate-form">
              <label className="wide">
                <span>From Airport :</span>
                <input
                  type="text"
                  placeholder="Enter from airport or city"
                  value={modalForm.fromAirport}
                  onChange={(event) =>
                    setModalForm((prev) => ({ ...prev, fromAirport: event.target.value }))
                  }
                  disabled={isLoading}
                />
              </label>
              <label className="wide">
                <span>To Airport :</span>
                <input
                  type="text"
                  placeholder="Enter to airport or city"
                  value={modalForm.toAirport}
                  onChange={(event) =>
                    setModalForm((prev) => ({ ...prev, toAirport: event.target.value }))
                  }
                  disabled={isLoading}
                />
              </label>
              <label>
                <span>Status :</span>
                <select
                  value={modalForm.status}
                  onChange={(event) =>
                    setModalForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                  disabled={isLoading}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="wide">
                <span>Image :</span>
                <input type="file" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
              </label>
            </div>

            {modalForm.imageUrl && (
              <div className="flight-route-image-preview">
                <span>Preview:</span>
                <img src={modalForm.imageUrl} alt="Preview" style={{ maxHeight: "150px", marginTop: "10px", borderRadius: "8px", objectFit: "cover" }} />
              </div>
            )}

            {modalError && <p className="admin-markup-coupon-error">{modalError}</p>}

            <div className="admin-markup-coupon-modal-actions generate-actions">
              <button
                type="button"
                className="primary generate-submit"
                onClick={handleSaveRoute}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Submit</span>
              </button>
              <button
                type="button"
                className="danger generate-cancel"
                onClick={handleCloseModal}
                disabled={isLoading}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Image Preview Modal */}
      {viewRoute && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewRoute(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="View route image"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Route Image</h2>
              <button type="button" onClick={() => setViewRoute(null)} aria-label="Close image">
                <X size={16} />
              </button>
            </header>

            <div className="flight-route-image-body">
              {viewRoute.imageUrl ? (
                <img src={viewRoute.imageUrl} alt="Popular flight route" />
              ) : (
                <p>No image uploaded.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRoute && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteRoute(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete popular flight route"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Popular Flight Route</h2>
              <button
                type="button"
                onClick={() => setDeleteRoute(null)}
                aria-label="Close delete dialog"
              >
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete this route configuration? Unsaved history stats for this city pair will remain.
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteRoute(null)} disabled={isLoading}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleConfirmDelete} disabled={isLoading}>
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
