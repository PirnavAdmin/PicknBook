/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "../../B2C BUS MANAGEMENT/MarkupList/BusMarkupList.css";
import "./FlightMarkupList.css";
import { formatDateTime, csvCell } from "../../../utils/adminPortalUtils";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";
import {
  listFlightMarkups,
  createFlightMarkup,
  updateFlightMarkup,
  deleteFlightMarkup,
  toFlightMarkupRequestPayload,
  normalizeFlightMarkupResponse,
} from "../../../services/adminFlightService";
import AdminPagination from "../../../components/AdminPagination";

const INITIAL_FLIGHT_MARKUP_ROWS = [
  {
    id: 2,
    airlineCode: "7",
    tripType: "OneWay",
    cabinClass: "*",
    markupType: "Percentage",
    markupValue: 10.0,
    priority: 1,
    isActive: true,
    createdAtUtc: "2026-07-23T07:24:53.03729",
    updatedAtUtc: "2026-09-29T09:56:06.142318",
  },
  {
    id: 3,
    airlineCode: "6E",
    tripType: "RoundTrip",
    cabinClass: "*",
    markupType: "Flat",
    markupValue: 9.0,
    priority: 1,
    isActive: true,
    createdAtUtc: "2026-09-29T09:55:28.928688",
    updatedAtUtc: "2026-09-29T09:55:28.928706",
  },
];

const DEFAULT_MARKUP_FORM = {
  airlineCode: "",
  tripType: "OneWay",
  cabinClass: "*",
  markupType: "Percentage",
  markupValue: "",
  priority: "1",
  isActive: true,
};

const getNextFlightMarkupId = (rows) => {
  const numericRows = rows.map((row) => ({
    id: Number(String(row.id || "").replace(/\D/g, "")) || 0,
  }));
  const nextValue = getNextNumericId(numericRows, 100);
  return `F${nextValue}`;
};

const isServerMarkupId = (value) => /^\d+$/.test(String(value ?? "").trim());

const sanitizeAirlineCode = (value) => {
  const text = String(value || "").trim();
  if (!text || text === "*") {
    return "*";
  }
  return text.replace(/^\*+/, "").toUpperCase() || "*";
};

const toBackendMarkupType = (value) => {
  if (typeof value === "number") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "fixed" || normalized === "flat" || normalized === "0" ? "Flat" : "Percentage";
};

const toDisplayMarkupType = (value) => {
  if (typeof value === "number") {
    return value === 0 ? "Flat" : "Percentage";
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "fixed" || normalized === "flat" || normalized === "0" ? "Flat" : "Percentage";
};

const getMarkupTypeBadgeClass = (markupType) => {
  const t = String(markupType || "").toLowerCase();
  if (t === "flat" || t === "fixed" || t === "0") return "markup-type-badge type-flat";
  return "markup-type-badge type-percentage";
};

const getTripTypeBadgeClass = (tripType) => {
  const t = String(tripType || "").toLowerCase();
  if (t === "oneway" || t === "0") return "col-trip-type-badge trip-oneway";
  if (t === "roundtrip" || t === "1") return "col-trip-type-badge trip-roundtrip";
  if (t === "multicity" || t === "2") return "col-trip-type-badge trip-multicity";
  return "col-trip-type-badge";
};

const getCabinClassBadgeClass = (cabinClass) => {
  const c = String(cabinClass || "").toLowerCase().replace(/\s+/g, "");
  if (c === "economy" || c === "0") return "col-cabin-class-badge cabin-economy";
  if (c === "premiumeconomy" || c === "1") return "col-cabin-class-badge cabin-premiumeconomy";
  if (c === "business" || c === "2") return "col-cabin-class-badge cabin-business";
  if (c === "first" || c === "3") return "col-cabin-class-badge cabin-first";
  return "col-cabin-class-badge cabin-all";
};

const normalizeMarkupRow = (markup) => {
  if (!markup) return null;
  const norm = normalizeFlightMarkupResponse ? normalizeFlightMarkupResponse(markup) : markup;
  return {
    id: norm.id,
    airlineCode: String(norm.airlineCode ?? "*"),
    tripType: String(norm.tripType ?? "OneWay"),
    cabinClass: String(norm.cabinClass ?? "*"),
    markupType: toDisplayMarkupType(norm.markupType ?? "Percentage"),
    markupValue: Number(norm.markupValue ?? 0),
    priority: Number(norm.priority ?? 1),
    isActive: Boolean(norm.isActive),
    createdAtUtc: norm.createdAtUtc || null,
    updatedAtUtc: norm.updatedAtUtc || null,
    raw: norm,
  };
};

const normalizeMarkupCollection = (rows) =>
  Array.isArray(rows) ? rows.map(normalizeMarkupRow).filter(Boolean) : [];

const mergeMarkupRows = (serverRows, fallbackRows) => {
  const normalizedServerRows = normalizeMarkupCollection(serverRows);
  const normalizedFallbackRows = normalizeMarkupCollection(fallbackRows);
  const serverIds = new Set(normalizedServerRows.map((row) => String(row.id)));
  const localOnlyRows = normalizedFallbackRows.filter(
    (row) => !serverIds.has(String(row.id))
  );
  return [...localOnlyRows, ...normalizedServerRows];
};

const toMarkupPayload = (values) => toFlightMarkupRequestPayload(values);


const getMarkupValueLabel = (row) => {
  const markupType = String(row.markupType || "").toLowerCase();
  const amount = Number(row.markupValue) || 0;
  return markupType === "percentage" ? `${amount}%` : `₹${amount.toFixed(2)}`;
};

const DEFAULT_SORT_BY = "id";
const DEFAULT_SORT_ORDER = "desc";

function getSortValue(row, sortBy) {
  if (sortBy === "id") return Number(String(row.id).replace(/\D/g, "")) || 0;
  if (sortBy === "markupValue" || sortBy === "value") return Number(row.markupValue) || 0;
  if (sortBy === "priority") return Number(row.priority) || 0;
  if (sortBy === "updatedAtUtc") {
    const ts = new Date(row.updatedAtUtc || row.createdAtUtc).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  return String(row[sortBy] ?? "").toLowerCase();
}

export default function AdminFlightMarkupListPage() {
  const [flightRows, setFlightRows] = useState([]);
  const [serverRows, setServerRows] = useState([]);
  const [localRows, setLocalRows] = useAdminList("flight-markup", INITIAL_FLIGHT_MARKUP_ROWS);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [markupTypeFilter, setMarkupTypeFilter] = useState("all");
  const [tripTypeFilter, setTripTypeFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempSortBy, setTempSortBy] = useState(sortBy);
  const [tempSortOrder, setTempSortOrder] = useState(sortOrder);
  const [tempStatusFilter, setTempStatusFilter] = useState(statusFilter);
  const [tempMarkupTypeFilter, setTempMarkupTypeFilter] = useState(markupTypeFilter);
  const [tempTripTypeFilter, setTempTripTypeFilter] = useState(tripTypeFilter);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formValues, setFormValues] = useState(DEFAULT_MARKUP_FORM);
  const [addError, setAddError] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [editError, setEditError] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const loadMarkups = async () => {
    try {
      const data = await listFlightMarkups();
      setServerRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Failed to load markups from backend, falling back to local storage", error);
      setServerRows([]);
    }
  };

  useEffect(() => {
    loadMarkups();
  }, []);

  useEffect(() => {
    setFlightRows(mergeMarkupRows(serverRows, localRows));
  }, [serverRows, localRows]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const openFilterModal = () => {
    setTempSortBy(sortBy);
    setTempSortOrder(sortOrder);
    setTempStatusFilter(statusFilter);
    setTempMarkupTypeFilter(markupTypeFilter);
    setTempTripTypeFilter(tripTypeFilter);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilter = () => {
    setSortBy(tempSortBy);
    setSortOrder(tempSortOrder);
    setStatusFilter(tempStatusFilter);
    setMarkupTypeFilter(tempMarkupTypeFilter);
    setTripTypeFilter(tempTripTypeFilter);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilter = () => {
    setTempSortBy(DEFAULT_SORT_BY);
    setTempSortOrder(DEFAULT_SORT_ORDER);
    setTempStatusFilter("all");
    setTempMarkupTypeFilter("all");
    setTempTripTypeFilter("all");
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
    setStatusFilter("all");
    setMarkupTypeFilter("all");
    setTripTypeFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const visibleRows = useMemo(() => {
    const filtered = flightRows.filter((row) => {
      const isAct = Boolean(row.isActive);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isAct) ||
        (statusFilter === "inactive" && !isAct);

      const mType = String(row.markupType || "").toLowerCase();
      const matchesMarkupType =
        markupTypeFilter === "all" || mType === markupTypeFilter.toLowerCase();

      const tType = String(row.tripType || "").toLowerCase();
      const matchesTripType =
        tripTypeFilter === "all" || tType === tripTypeFilter.toLowerCase();

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [
          String(row.id || ""),
          String(row.airlineCode || ""),
          String(row.tripType || ""),
          String(row.cabinClass || ""),
          String(row.markupType || ""),
          String(row.markupValue || ""),
          String(row.priority || ""),
          isAct ? "active" : "inactive",
          formatDateTime(row.updatedAtUtc || row.createdAtUtc),
        ].some((f) => f.toLowerCase().includes(query));

      return matchesStatus && matchesMarkupType && matchesTripType && matchesSearch;
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftVal = getSortValue(left, sortBy);
      const rightVal = getSortValue(right, sortBy);

      let res = 0;
      if (typeof leftVal === "number" && typeof rightVal === "number") {
        res = leftVal - rightVal;
      } else {
        res = String(leftVal).localeCompare(String(rightVal), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sortOrder === "asc" ? res : -res;
    });

    return sorted;
  }, [flightRows, statusFilter, markupTypeFilter, tripTypeFilter, searchTerm, sortBy, sortOrder]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleRows.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleRows, currentPage, itemsPerPage]);

  const handleExport = () => {
    if (visibleRows.length === 0) return;

    const header = [
      "ID",
      "Airline Code",
      "Trip Type",
      "Cabin Class",
      "Markup Type",
      "Markup Value",
      "Priority",
      "Status",
      "Updated On",
    ];

    const csvRows = visibleRows.map((row) => [
      row.id,
      row.airlineCode,
      row.tripType,
      row.cabinClass || "*",
      row.markupType,
      getMarkupValueLabel(row),
      row.priority,
      row.isActive ? "Active" : "Inactive",
      formatDateTime(row.updatedAtUtc || row.createdAtUtc),
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
    link.download = `admin-flight-markup-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const handleToggleActive = async (row) => {
    const nextActive = !row.isActive;
    const payload = toMarkupPayload({ ...row, isActive: nextActive });

    if (isServerMarkupId(row.id)) {
      try {
        await updateFlightMarkup(row.id, payload);
        await loadMarkups();
        return;
      } catch (error) {
        console.warn("Failed to update status on server, updating local state", error);
      }
    }

    setLocalRows((prevRows) =>
      prevRows.map((item) =>
        String(item.id) === String(row.id)
          ? { ...item, isActive: nextActive, updatedAtUtc: new Date().toISOString() }
          : item
      )
    );
  };

  const handleCreateMarkup = async (e) => {
    e.preventDefault();
    setAddError("");

    const val = Number(formValues.markupValue);
    if (!Number.isFinite(val) || val < 0) {
      setAddError("Enter a valid markup value.");
      return;
    }

    const payload = toMarkupPayload(formValues);

    try {
      const response = await createFlightMarkup(payload);
      if (response && response.id) {
        await loadMarkups();
      } else {
        const newLocalRow = {
          id: getNextFlightMarkupId(localRows),
          ...payload,
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        };
        setLocalRows((prev) => [newLocalRow, ...prev]);
      }
      setIsAddOpen(false);
      setFormValues(DEFAULT_MARKUP_FORM);
    } catch (err) {
      console.warn("Failed to save to server, saving locally", err);
      const newLocalRow = {
        id: getNextFlightMarkupId(localRows),
        ...payload,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      setLocalRows((prev) => [newLocalRow, ...prev]);
      setIsAddOpen(false);
      setFormValues(DEFAULT_MARKUP_FORM);
    }
  };

  const handleUpdateMarkup = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setEditError("");

    const val = Number(editRow.markupValue);
    if (!Number.isFinite(val) || val < 0) {
      setEditError("Enter a valid markup value.");
      return;
    }

    const payload = toMarkupPayload(editRow);

    if (isServerMarkupId(editRow.id)) {
      try {
        await updateFlightMarkup(editRow.id, payload);
        setEditRow(null);
        await loadMarkups();
        return;
      } catch (err) {
        console.warn("Failed to update on server, updating local storage", err);
      }
    }

    setLocalRows((prev) =>
      prev.map((item) =>
        String(item.id) === String(editRow.id)
          ? { ...item, ...payload, updatedAtUtc: new Date().toISOString() }
          : item
      )
    );
    setEditRow(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;

    if (isServerMarkupId(deleteRow.id)) {
      try {
        await deleteFlightMarkup(deleteRow.id);
        setDeleteRow(null);
        await loadMarkups();
        return;
      } catch (err) {
        console.warn("Failed to delete on server, deleting from local storage", err);
      }
    }

    setLocalRows((prev) => prev.filter((item) => String(item.id) !== String(deleteRow.id)));
    setDeleteRow(null);
  };

  return (
    <div className="admin-b2c-page bus-markup-list-page-container">
      {/* ── PAGE HEADING ── */}
      <section className="markup-heading">
        <p className="markup-heading-main">
          B2C Flight <span className="markup-heading-sub">Markup List</span>
        </p>
      </section>

      {/* ── STATS ROW ── */}
      <section className="stats-row">
        <div className="stat-card total">
          <div className="stat-label">Total Markups</div>
          <div className="stat-value">{flightRows.length}</div>
          <div className="stat-meta">All flight records</div>
        </div>
        <div className="stat-card active">
          <div className="stat-label">Active</div>
          <div className="stat-value">{flightRows.filter((r) => r.isActive).length}</div>
          <div className="stat-meta">Currently applied</div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{flightRows.filter((r) => !r.isActive).length}</div>
          <div className="stat-meta">Paused markups</div>
        </div>
      </section>

      {/* ── TOOLBAR (ALL IN ONE LINE) ── */}
      <section className="markup-toolbar">
        <div className="markup-search-wrap">
          <Search size={15} className="markup-search-icon" />
          <input
            type="text"
            className="markup-search-input"
            placeholder="Search markups..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button type="button" className="markup-search-clear" onClick={() => setSearchTerm("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="markup-toolbar-actions">
          <button data-admin-action="primary" type="button" className="markup-primary-btn" onClick={() => { setIsAddOpen(true); setAddError(""); setFormValues(DEFAULT_MARKUP_FORM); }}>
            <Plus size={14} />
            Add New
          </button>
          <button data-admin-action="primary" type="button" className="markup-filter-btn" onClick={openFilterModal}>
            <Filter size={14} />
            Filter
          </button>
          <button data-admin-action="export"
            type="button"
            className="markup-export-btn"
            onClick={handleExport}
            disabled={visibleRows.length === 0}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </section>

                  {/* ── FILTER FORM PANEL (INLINE ABOVE TABLE, ALL IN ONE LINE, NO DIVIDER LINES) ── */}
      {isFilterModalOpen && (
        <div className="admin-markup-filter-panel">
          <div className="admin-markup-filter-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} style={{ color: '#A41B48' }} />
              <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Filter Markups</h4>
            </div>
            <button type="button" className="close-x" onClick={() => setIsFilterModalOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="admin-markup-filter-row">
            <label className="markup-filter-field">
              <span>Markup Type</span>
              <select value={tempMarkupTypeFilter} onChange={(e) => setTempMarkupTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="Percentage">Percentage</option>
                <option value="Fixed">Fixed / Flat</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Status</span>
              <select value={tempStatusFilter} onChange={(e) => setTempStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Trip Type</span>
              <select value={tempTripTypeFilter} onChange={(e) => setTempTripTypeFilter(e.target.value)}>
                <option value="all">All Trip Types</option>
                <option value="OneWay">OneWay</option>
                <option value="RoundTrip">RoundTrip</option>
                    <option value="MultiCity">MultiCity</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Sort By</span>
              <select value={tempSortBy} onChange={(e) => setTempSortBy(e.target.value)}>
                <option value="id">ID</option>
                <option value="markupValue">Markup Value</option>
                <option value="priority">Priority</option>
                <option value="updatedAtUtc">Updated On</option>
              </select>
            </label>

            <label className="markup-filter-field">
              <span>Order</span>
              <select value={tempSortOrder} onChange={(e) => setTempSortOrder(e.target.value)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>

            <div className="markup-filter-actions-inline">
              <button data-admin-action="reset" type="button" className="markup-btn-reset" onClick={handleResetFilter}>
                Reset
              </button>
              <button data-admin-action="primary" type="button" className="markup-btn-apply" onClick={handleApplyFilter}>
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE WRAPPER ── */}
      <section className="admin-markup-table-wrap">
        <table className="admin-markup-table">
          <colgroup>
            <col style={{ width: "7%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Airline Code</th>
              <th>Trip Type</th>
              <th>Cabin Class</th>
              <th>Markup Type</th>
              <th>Markup Value</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated Date</th>
              <th className="action-col">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <p className="admin-markup-empty">No flight markups found.</p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="markup-id-chip"
                      onClick={() => setViewRow(row)}
                      aria-label={`Open basic details for ${row.id}`}
                    >
                      <span>{String(row.id).replace(/\D/g, "") || row.id}</span>
                    </button>
                  </td>
                  <td>{row.airlineCode}</td>
                  <td><span className={getTripTypeBadgeClass(row.tripType)}>{row.tripType}</span></td>
                  <td><span className={getCabinClassBadgeClass(row.cabinClass)}>{row.cabinClass || "*"}</span></td>
                  <td><span className={getMarkupTypeBadgeClass(row.markupType)}>{row.markupType}</span></td>
                  <td>{getMarkupValueLabel(row)}</td>
                  <td className="col-priority-text">{row.priority}</td>
                  <td>
                    <button
                      type="button"
                      className={`markup-status-toggle ${row.isActive ? "active" : "inactive"}`}
                      onClick={() => handleToggleActive(row)}
                    >
                      <span>{row.isActive ? "Active" : "Inactive"}</span>
                    </button>
                  </td>
                  <td className="markup-date-text">{formatDateTime(row.updatedAtUtc || row.createdAtUtc)}</td>
                  <td className="action-col">
                    <div className="actions-dropdown-container">
                      <button
                        type="button"
                        className={`actions-trigger-btn ${activeDropdownId === row.id ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === row.id ? null : row.id);
                        }}
                      >
                        <span>Actions</span>
                        <ChevronDown size={12} className="chevron-icon" />
                      </button>
                      {activeDropdownId === row.id && (
                        <div className="actions-dropdown-menu">
                          <button
                            type="button"
                            className="dropdown-item view admin-view-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewRow(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <span>View Details</span>
                            <Eye size={13} className="item-icon" />
                          </button>
                          <button
                            type="button"
                            className="dropdown-item edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditRow(row);
                              setEditError("");
                              setActiveDropdownId(null);
                            }}
                          >
                            <span>Edit Markup</span>
                            <Pencil size={13} className="item-icon" />
                          </button>
                          <button
                            type="button"
                            className="dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteRow(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <span>Delete Markup</span>
                            <Trash2 size={13} className="item-icon" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {visibleRows.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <AdminPagination
              currentPage={currentPage}
              totalItems={visibleRows.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemName="markup records"
            />
          </div>
        )}
      </section>

      {/* ── ADD MODAL ── */}
      {isAddOpen && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="admin-markup-filter-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="admin-markup-filter-header">
              <h3 style={{ color: "#A51C49", fontSize: "1.2rem", margin: 0, fontWeight: "700" }}>
                Add B2C Flight Markup
              </h3>
              <button type="button" className="close-x" onClick={() => setIsAddOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {addError && (
              <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem" }}>
                {addError}
              </p>
            )}

            <form onSubmit={handleCreateMarkup}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
                <label className="markup-filter-field">
                  <span>AIRLINE CODE (* FOR ALL)</span>
                  <input
                    type="text"
                    value={formValues.airlineCode}
                    onChange={(e) => setFormValues((p) => ({ ...p, airlineCode: e.target.value }))}
                    placeholder="e.g. 6E, AI or *"
                  />
                </label>

                <label className="markup-filter-field">
                  <span>TRIP TYPE</span>
                  <select
                    value={formValues.tripType}
                    onChange={(e) => setFormValues((p) => ({ ...p, tripType: e.target.value }))}
                  >
                    <option value="OneWay">OneWay</option>
                    <option value="RoundTrip">RoundTrip</option>
                    <option value="MultiCity">MultiCity</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>CABIN CLASS (* FOR ALL)</span>
                  <select
                    value={formValues.cabinClass || "*"}
                    onChange={(e) => setFormValues((p) => ({ ...p, cabinClass: e.target.value }))}
                  >
                    <option value="*">All (*)</option>
                    <option value="Economy">Economy</option>
                    <option value="PremiumEconomy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>MARKUP TYPE</span>
                  <select
                    value={formValues.markupType}
                    onChange={(e) => setFormValues((p) => ({ ...p, markupType: e.target.value }))}
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Flat">Flat / Fixed</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>MARKUP VALUE <span data-admin-required className="admin-required-indicator">*</span></span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formValues.markupValue}
                    onChange={(e) => setFormValues((p) => ({ ...p, markupValue: e.target.value }))}
                    placeholder="Enter value"
                    required
                  />
                </label>

                <label className="markup-filter-field">
                  <span>PRIORITY</span>
                  <input
                    type="number"
                    min="1"
                    value={formValues.priority}
                    onChange={(e) => setFormValues((p) => ({ ...p, priority: e.target.value }))}
                  />
                </label>

                <div className="markup-filter-field">
                  <span>STATUS</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px" }}>
                    <button
                      type="button"
                      onClick={() => setFormValues((p) => ({ ...p, isActive: !p.isActive }))}
                      style={{
                        position: "relative",
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        backgroundColor: formValues.isActive ? "#A51C49" : "#cbd5e1",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        padding: 0,
                        outline: "none"
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        top: "2px",
                        left: formValues.isActive ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                        transition: "left 0.3s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                      }} />
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                      {formValues.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-markup-filter-footer">
                <button data-admin-action="reset" type="button" className="markup-btn-reset" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button data-admin-action="primary" type="submit" className="markup-btn-apply" style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}>
                  Save Markup
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── EDIT MODAL ── */}
      {editRow && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setEditRow(null)}>
          <div className="admin-markup-filter-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="admin-markup-filter-header">
              <h3 style={{ color: "#A51C49", fontSize: "1.2rem", margin: 0, fontWeight: "700" }}>
                Edit B2C Flight Markup #{editRow.id}
              </h3>
              <button type="button" className="close-x" onClick={() => setEditRow(null)}>
                <X size={18} />
              </button>
            </div>

            {editError && (
              <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem" }}>
                {editError}
              </p>
            )}

            <form onSubmit={handleUpdateMarkup}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
                <label className="markup-filter-field">
                  <span>AIRLINE CODE</span>
                  <input
                    type="text"
                    value={editRow.airlineCode}
                    onChange={(e) => setEditRow((p) => ({ ...p, airlineCode: e.target.value }))}
                  />
                </label>

                <label className="markup-filter-field">
                  <span>TRIP TYPE</span>
                  <select
                    value={editRow.tripType}
                    onChange={(e) => setEditRow((p) => ({ ...p, tripType: e.target.value }))}
                  >
                    <option value="OneWay">OneWay</option>
                    <option value="RoundTrip">RoundTrip</option>
                    <option value="MultiCity">MultiCity</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>CABIN CLASS (* FOR ALL)</span>
                  <select
                    value={editRow.cabinClass || "*"}
                    onChange={(e) => setEditRow((p) => ({ ...p, cabinClass: e.target.value }))}
                  >
                    <option value="*">All (*)</option>
                    <option value="Economy">Economy</option>
                    <option value="PremiumEconomy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>MARKUP TYPE</span>
                  <select
                    value={editRow.markupType}
                    onChange={(e) => setEditRow((p) => ({ ...p, markupType: e.target.value }))}
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Flat">Flat / Fixed</option>
                  </select>
                </label>

                <label className="markup-filter-field">
                  <span>MARKUP VALUE <span data-admin-required className="admin-required-indicator">*</span></span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editRow.markupValue}
                    onChange={(e) => setEditRow((p) => ({ ...p, markupValue: e.target.value }))}
                    required
                  />
                </label>

                <label className="markup-filter-field">
                  <span>PRIORITY</span>
                  <input
                    type="number"
                    min="1"
                    value={editRow.priority}
                    onChange={(e) => setEditRow((p) => ({ ...p, priority: e.target.value }))}
                  />
                </label>

                <div className="markup-filter-field">
                  <span>STATUS</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px" }}>
                    <button
                      type="button"
                      onClick={() => setEditRow((p) => ({ ...p, isActive: !p.isActive }))}
                      style={{
                        position: "relative",
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        backgroundColor: editRow.isActive ? "#A51C49" : "#cbd5e1",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        padding: 0,
                        outline: "none"
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        top: "2px",
                        left: editRow.isActive ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                        transition: "left 0.3s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                      }} />
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                      {editRow.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-markup-filter-footer">
                <button data-admin-action="reset" type="button" className="markup-btn-reset" onClick={() => setEditRow(null)}>
                  Cancel
                </button>
                <button data-admin-action="primary" type="submit" className="markup-btn-apply" style={{ backgroundColor: "#A51C49", borderColor: "#A51C49" }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── DETAIL VIEW MODAL ── */}
      {viewRow && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setViewRow(null)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "540px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "20px 24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ color: "#1e293b", fontWeight: "700", fontSize: "18px", margin: 0 }}>
                Flight Markup Detail View
              </h3>
              <button data-admin-close
                type="button"
                onClick={() => setViewRow(null)}
                style={{
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              <span className={`markup-status-toggle ${viewRow.isActive ? "active" : "inactive"}`}>
                {viewRow.isActive ? "Active" : "Inactive"}
              </span>
              <span style={{ background: "#fdf2f8", color: "#A41B48", padding: "4px 12px", borderRadius: "100px", fontWeight: "700", fontSize: "11px", border: "1px solid rgba(165, 28, 73, 0.15)" }}>
                {viewRow.airlineCode}
              </span>
              <span style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", padding: "4px 12px", borderRadius: "100px", fontWeight: "600", fontSize: "11px" }}>
                {getMarkupValueLabel(viewRow)}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", textAlign: "left" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MARKUP ID</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{viewRow.id}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>AIRLINE CODE</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{viewRow.airlineCode}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>TRIP TYPE</span>
                <div><span className={getTripTypeBadgeClass(viewRow.tripType)}>{viewRow.tripType}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>CABIN CLASS</span>
                <div><span className={getCabinClassBadgeClass(viewRow.cabinClass)}>{viewRow.cabinClass || "*"}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MARKUP TYPE</span>
                <div><span className={getMarkupTypeBadgeClass(viewRow.markupType)}>{viewRow.markupType}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>MARKUP VALUE</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{getMarkupValueLabel(viewRow)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>PRIORITY</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{viewRow.priority}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>CREATED ON</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{viewRow.createdAtUtc ? formatDateTime(viewRow.createdAtUtc) : "N/A"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>UPDATED ON</span>
                <span style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{formatDateTime(viewRow.updatedAtUtc || viewRow.createdAtUtc)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteRow && createPortal(
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeleteRow(null)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '480px', 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Delete Flight Markup</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setDeleteRow(null)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '8px 0 20px', textAlign: 'left', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete flight markup <strong>#{deleteRow.id}</strong> ({deleteRow.airlineCode})?
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setDeleteRow(null)} 
                style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "6px 14px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
