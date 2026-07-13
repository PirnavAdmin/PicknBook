import React, { useState, useEffect, useMemo } from "react";
import { Download, Pencil, Plus, Trash2, X, Filter, Eye } from "lucide-react";
import "./FlightUsedCoupon.css";
import AdminPagination from "../../../components/AdminPagination";
import { csvCell, formatCouponDateTime, formatCurrency } from "../../../utils/adminPortalUtils";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";
import { listUsedCoupons } from "../../../services/flightBookingService";

export default function AdminFlightUsedCouponListPage() {
  const [usedCoupons, setUsedCoupons] = useAdminList("flight-used-coupons", []);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [filters, setFilters] = useState({
    sortBy: "bookingId",
    order: "asc",
    bookingStatus: "All",
    cpnType: "All",
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await listUsedCoupons();
        if (isMounted && Array.isArray(data)) {
          setUsedCoupons(data);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "Failed to load used coupons.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [setUsedCoupons]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    bookingId: "",
    couponCode: "",
    usedDate: "",
    totalFare: "",
    cpnType: "Fix",
    cpnValue: "",
    cpnAmount: "",
    bookingStatus: "Confirmed",
  });
  const [editRecord, setEditRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [formError, setFormError] = useState("");
  const colWidths = ["8%", "10%", "11%", "11%", "9%", "9%", "9%", "9%", "11%", "13%"];
  const headers = [
    "ID",
    "Booking ID",
    "Coupon Code",
    "Used Date",
    "Total Fare",
    "CPN Type",
    "CPN Value",
    "CPN Amount",
    "Booking Status",
    "Action",
  ];

  const filteredUsedCoupons = usedCoupons.filter((record) => {
    if (filters.bookingStatus !== "All" && record.bookingStatus !== filters.bookingStatus) {
      return false;
    }
    if (filters.cpnType !== "All" && record.cpnType !== filters.cpnType) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    let valA = a[filters.sortBy];
    let valB = b[filters.sortBy];

    if (filters.sortBy === "usedDate") {
      valA = new Date(valA).getTime() || 0;
      valB = new Date(valB).getTime() || 0;
    } else if (filters.sortBy === "bookingId") {
      const numA = parseInt(String(valA).replace(/\D/g, "")) || 0;
      const numB = parseInt(String(valB).replace(/\D/g, "")) || 0;
      return filters.order === "asc" ? numA - numB : numB - numA;
    } else if (typeof valA === "string") {
      return filters.order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    }

    return filters.order === "asc" ? valA - valB : valB - valA;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalItems = filteredUsedCoupons.length;
  const paginatedUsedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsedCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsedCoupons, currentPage]);

  const handleExport = () => {
    if (usedCoupons.length === 0) {
      return;
    }

    const header = [
      "Booking ID",
      "Coupon Code",
      "Used Date",
      "Total Fare",
      "CPN Type",
      "CPN Value",
      "CPN Amount",
      "Booking Status",
    ];

    const csvRows = usedCoupons.map((record) => {
      const isPercent = String(record.cpnType || "").toLowerCase().includes("percent");
      const cpnValueLabel = isPercent ? `${Number(record.cpnValue) || 0}%` : formatCurrency(record.cpnValue);

      return [
        record.bookingId,
        record.couponCode,
        formatCouponDateTime(record.usedDate),
        formatCurrency(record.totalFare),
        record.cpnType,
        cpnValueLabel,
        formatCurrency(record.cpnAmount),
        record.bookingStatus,
      ];
    });

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = `flight-used-coupon-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const openAddModal = () => {
    setFormError("");
    setAddForm({
      bookingId: "",
      couponCode: "",
      usedDate: "",
      totalFare: "",
      cpnType: "Fix",
      cpnValue: "",
      cpnAmount: "",
      bookingStatus: "Confirmed",
    });
    setIsAddOpen(true);
  };

  const handleSaveNew = () => {
    const bookingId = String(addForm.bookingId || "").trim();
    const couponCode = String(addForm.couponCode || "").trim();
    const usedDate = addForm.usedDate ? new Date(addForm.usedDate).toISOString() : new Date().toISOString();
    const totalFare = Number(addForm.totalFare);
    const cpnValue = Number(addForm.cpnValue);
    const cpnAmount = Number(addForm.cpnAmount);

    if (!bookingId || !couponCode) {
      setFormError("Booking ID and Coupon Code are required.");
      return;
    }

    if (!Number.isFinite(totalFare) || totalFare <= 0) {
      setFormError("Enter a valid total fare.");
      return;
    }

    if (!Number.isFinite(cpnValue) || cpnValue <= 0) {
      setFormError("Enter a valid coupon value.");
      return;
    }

    const newRecord = {
      id: getNextNumericId(usedCoupons, 1),
      bookingId,
      couponCode,
      usedDate,
      totalFare,
      cpnType: addForm.cpnType,
      cpnValue,
      cpnAmount: Number.isFinite(cpnAmount) ? cpnAmount : cpnValue,
      bookingStatus: addForm.bookingStatus,
    };

    setUsedCoupons((previous) => [newRecord, ...previous]);
    setIsAddOpen(false);
    setFormError("");
  };

  const openEditModal = (record) => {
    setFormError("");
    setEditRecord({
      ...record,
      totalFare: String(record.totalFare ?? ""),
      cpnValue: String(record.cpnValue ?? ""),
      cpnAmount: String(record.cpnAmount ?? ""),
      usedDate: record.usedDate ? record.usedDate.slice(0, 16) : "",
    });
  };

  const handleSaveEdit = () => {
    if (!editRecord) {
      return;
    }

    const bookingId = String(editRecord.bookingId || "").trim();
    const couponCode = String(editRecord.couponCode || "").trim();
    const totalFare = Number(editRecord.totalFare);
    const cpnValue = Number(editRecord.cpnValue);
    const cpnAmount = Number(editRecord.cpnAmount);

    if (!bookingId || !couponCode) {
      setFormError("Booking ID and Coupon Code are required.");
      return;
    }

    if (!Number.isFinite(totalFare) || totalFare <= 0) {
      setFormError("Enter a valid total fare.");
      return;
    }

    if (!Number.isFinite(cpnValue) || cpnValue <= 0) {
      setFormError("Enter a valid coupon value.");
      return;
    }

    setUsedCoupons((previous) =>
      previous.map((record) =>
        record.id === editRecord.id
          ? {
              ...record,
              bookingId,
              couponCode,
              usedDate: editRecord.usedDate ? new Date(editRecord.usedDate).toISOString() : record.usedDate,
              totalFare,
              cpnType: editRecord.cpnType,
              cpnValue,
              cpnAmount: Number.isFinite(cpnAmount) ? cpnAmount : cpnValue,
              bookingStatus: editRecord.bookingStatus,
            }
          : record
      )
    );

    setEditRecord(null);
    setFormError("");
  };

  const handleDelete = () => {
    if (!deleteRecord) {
      return;
    }

    setUsedCoupons((previous) => previous.filter((record) => record.id !== deleteRecord.id));
    setDeleteRecord(null);
  };

  return (
    <>
      <section className="admin-b2c-page flight-markup-panel">
      <header className="flight-markup-toolbar">
        <div className="flight-markup-title">
          <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Used Coupon List</h1>
          <div className="flight-markup-title-underline" aria-hidden="true" />
        </div>

        <div className="flight-markup-actions">
          <button
            type="button"
            className={`flight-markup-action-btn filter-btn ${isFilterOpen ? "active" : ""}`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
          >
            <Filter size={16} />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="flight-markup-action-btn clear-btn"
            onClick={() => setFilters({
              sortBy: "usedDate",
              order: "desc",
              bookingStatus: "All",
              cpnType: "All"
            })}
            disabled={
              filters.sortBy === "usedDate" &&
              filters.order === "desc" &&
              filters.bookingStatus === "All" &&
              filters.cpnType === "All"
            }
          >
            <X size={16} />
            <span>Clear Filter</span>
          </button>
          <button type="button" className="flight-markup-action-btn primary" onClick={handleExport}>
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {isFilterOpen && (
        <section className="flight-used-coupon-filter-panel">
          <div className="flight-used-coupon-filter-grid">
            <label>
              <span>Sort By</span>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              >
                <option value="usedDate">Used Date</option>
                <option value="bookingId">Booking ID</option>
                <option value="couponCode">Coupon Code</option>
                <option value="totalFare">Total Fare</option>
                <option value="cpnType">CPN Type</option>
                <option value="cpnAmount">CPN Amount</option>
                <option value="bookingStatus">Booking Status</option>
              </select>
            </label>

            <label>
              <span>Order</span>
              <select
                value={filters.order}
                onChange={(e) => setFilters((prev) => ({ ...prev, order: e.target.value }))}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>

            <label>
              <span>Booking Status</span>
              <select
                value={filters.bookingStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, bookingStatus: e.target.value }))}
              >
                <option value="All">All</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processed">Processed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>

            <label>
              <span>CPN Type</span>
              <select
                value={filters.cpnType}
                onChange={(e) => setFilters((prev) => ({ ...prev, cpnType: e.target.value }))}
              >
                <option value="All">All</option>
                <option value="Fix">Fix</option>
                <option value="Percent">Percent</option>
              </select>
            </label>
          </div>
        </section>
      )}

      <section className="flight-markup-table-wrap">
        <div className="flight-markup-table-scroll">
          <table className="flight-markup-table">
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headers.map((headerLabel) => (
                  <th key={headerLabel}>
                    <span>{headerLabel}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="flight-markup-empty-cell">
                    <span className="flight-markup-empty">No Record Found...</span>
                  </td>
                </tr>
              ) : (
                paginatedUsedCoupons.map((record, index) => {
                  const isPercent = String(record.cpnType || "").toLowerCase().includes("percent");
                  const cpnValueLabel = isPercent
                    ? `${Number(record.cpnValue) || 0}%`
                    : formatCurrency(record.cpnValue);

                  return (
                    <tr key={`${record.bookingId}-${record.usedDate}`}>
                      <td>{record.id ?? "--"}</td>
                      <td>{record.bookingId}</td>
                      <td>
                        <span className="flight-coupon-code">{record.couponCode}</span>
                      </td>
                      <td>{formatCouponDateTime(record.usedDate)}</td>
                      <td>{formatCurrency(record.totalFare)}</td>
                      <td>{record.cpnType}</td>
                      <td>{cpnValueLabel}</td>
                      <td>{formatCurrency(record.cpnAmount)}</td>
                      <td>
                        <span className="flight-booking-status">{record.bookingStatus || "--"}</span>
                      </td>
                      <td className="action-col">
                        <div className="markup-action-group">
                          <button
                            type="button"
                            title="View"
                            aria-label={`View used coupon ${record.bookingId}`}
                            onClick={() => setViewRecord(record)}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            title="Delete"
                            aria-label={`Delete used coupon ${record.bookingId}`}
                            className="danger"
                            onClick={() => setDeleteRecord(record)}
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
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="used coupons"
        />
      </section>
    </section>

      {isAddOpen && (
        <div className="admin-markup-modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Add used coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Add Used Coupon</h2>
              <button type="button" onClick={() => setIsAddOpen(false)} aria-label="Close add used coupon">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              <label>
                <span>Booking ID</span>
                <input
                  type="text"
                  value={addForm.bookingId}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, bookingId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Coupon Code</span>
                <input
                  type="text"
                  value={addForm.couponCode}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, couponCode: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Used Date</span>
                <input
                  type="datetime-local"
                  value={addForm.usedDate}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, usedDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Total Fare</span>
                <input
                  type="number"
                  min="1"
                  value={addForm.totalFare}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, totalFare: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>CPN Type</span>
                <select
                  value={addForm.cpnType}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, cpnType: event.target.value }))
                  }
                >
                  <option value="Fix">Fix</option>
                  <option value="Percent">Percent</option>
                </select>
              </label>
              <label>
                <span>CPN Value</span>
                <input
                  type="number"
                  min="1"
                  value={addForm.cpnValue}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, cpnValue: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>CPN Amount</span>
                <input
                  type="number"
                  min="0"
                  value={addForm.cpnAmount}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, cpnAmount: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Booking Status</span>
                <select
                  value={addForm.bookingStatus}
                  onChange={(event) =>
                    setAddForm((previous) => ({ ...previous, bookingStatus: event.target.value }))
                  }
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processed">Processed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            {formError && <p className="admin-markup-form-error">{formError}</p>}

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleSaveNew}>
                Save
              </button>
            </div>
          </section>
        </div>
      )}

      {editRecord && (
        <div className="admin-markup-modal-backdrop" onClick={() => setEditRecord(null)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Edit used coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Edit Used Coupon</h2>
              <button type="button" onClick={() => setEditRecord(null)} aria-label="Close edit used coupon">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              <label>
                <span>ID</span>
                <input type="text" value={editRecord.id} disabled />
              </label>
              <label>
                <span>Booking ID</span>
                <input
                  type="text"
                  value={editRecord.bookingId}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, bookingId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Coupon Code</span>
                <input
                  type="text"
                  value={editRecord.couponCode}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, couponCode: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Used Date</span>
                <input
                  type="datetime-local"
                  value={editRecord.usedDate}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, usedDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Total Fare</span>
                <input
                  type="number"
                  min="1"
                  value={editRecord.totalFare}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, totalFare: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>CPN Type</span>
                <select
                  value={editRecord.cpnType}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, cpnType: event.target.value }))
                  }
                >
                  <option value="Fix">Fix</option>
                  <option value="Percent">Percent</option>
                </select>
              </label>
              <label>
                <span>CPN Value</span>
                <input
                  type="number"
                  min="1"
                  value={editRecord.cpnValue}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, cpnValue: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>CPN Amount</span>
                <input
                  type="number"
                  min="0"
                  value={editRecord.cpnAmount}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, cpnAmount: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Booking Status</span>
                <select
                  value={editRecord.bookingStatus}
                  onChange={(event) =>
                    setEditRecord((previous) => ({ ...previous, bookingStatus: event.target.value }))
                  }
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processed">Processed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            {formError && <p className="admin-markup-form-error">{formError}</p>}

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditRecord(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteRecord && (
        <div className="admin-markup-modal-backdrop" onClick={() => setDeleteRecord(null)}>
          <section
            className="admin-markup-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete used coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Used Coupon</h2>
              <button type="button" onClick={() => setDeleteRecord(null)} aria-label="Close delete dialog">
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-delete-copy">
              Are you sure you want to delete coupon <strong>{deleteRecord.couponCode}</strong>?
            </p>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteRecord(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}

      {viewRecord && (
        <div className="admin-markup-modal-backdrop" onClick={() => setViewRecord(null)}>
          <section
            className="admin-markup-modal fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="View used coupon details"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Used Coupon Details</h2>
              <button type="button" onClick={() => setViewRecord(null)} aria-label="Close details">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-form-grid">
              <label>
                <span>ID</span>
                <input type="text" value={viewRecord.id} disabled />
              </label>
              <label>
                <span>Booking ID</span>
                <input type="text" value={viewRecord.bookingId} disabled />
              </label>
              <label>
                <span>Coupon Code</span>
                <input type="text" value={viewRecord.couponCode} disabled />
              </label>
              <label>
                <span>Used Date</span>
                <input
                  type="text"
                  value={formatCouponDateTime(viewRecord.usedDate)}
                  disabled
                />
              </label>
              <label>
                <span>Total Fare</span>
                <input
                  type="text"
                  value={formatCurrency(viewRecord.totalFare)}
                  disabled
                />
              </label>
              <label>
                <span>CPN Type</span>
                <input type="text" value={viewRecord.cpnType} disabled />
              </label>
              <label>
                <span>CPN Value</span>
                <input
                  type="text"
                  value={
                    String(viewRecord.cpnType || "").toLowerCase().includes("percent")
                      ? `${viewRecord.cpnValue}%`
                      : formatCurrency(viewRecord.cpnValue)
                  }
                  disabled
                />
              </label>
              <label>
                <span>CPN Amount</span>
                <input
                  type="text"
                  value={formatCurrency(viewRecord.cpnAmount)}
                  disabled
                />
              </label>
              <label>
                <span>Booking Status</span>
                <input type="text" value={viewRecord.bookingStatus} disabled />
              </label>
            </div>

            <div className="admin-markup-modal-actions">
              <button type="button" className="secondary" onClick={() => setViewRecord(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}



