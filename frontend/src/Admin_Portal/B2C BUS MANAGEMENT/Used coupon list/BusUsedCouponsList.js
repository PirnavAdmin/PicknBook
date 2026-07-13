import React, { useEffect, useMemo, useState } from "react";
import { Download, Loader2, SlidersHorizontal, X } from "lucide-react";
import "./BusUsedCouponsList.css";
import { csvCell, formatCouponDateTime, formatCurrency } from "../../../utils/adminPortalUtils";
import { listBusUsedCoupons } from "../../../services/busBookingService";
import AdminPagination from "../../../components/AdminPagination";

const DEFAULT_USED_COUPON_SORT_BY = "usedDate";
const DEFAULT_USED_COUPON_SORT_ORDER = "desc";

function getUsedCouponSortValue(record, sortBy) {
  if (sortBy === "id") {
    return Number(record.id) || 0;
  }

  if (sortBy === "totalFare" || sortBy === "cpnValue" || sortBy === "cpnAmount") {
    return Number(record[sortBy]) || 0;
  }

  if (sortBy === "usedDate") {
    const timestamp = new Date(record.usedDate).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  return String(record[sortBy] || "").toLowerCase();
}

export default function AdminBusUsedCouponListPage() {
  const [usedCoupons, setUsedCoupons] = useState([]);
  const [isLoadingUsedCoupons, setIsLoadingUsedCoupons] = useState(false);
  const [usedCouponError, setUsedCouponError] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState(DEFAULT_USED_COUPON_SORT_BY);
  const [sortOrder, setSortOrder] = useState(DEFAULT_USED_COUPON_SORT_ORDER);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [cpnTypeFilter, setCpnTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [bookingStatusFilter, cpnTypeFilter, sortBy, sortOrder]);

  useEffect(() => {
    let isMounted = true;

    async function loadUsedCoupons() {
      setIsLoadingUsedCoupons(true);
      setUsedCouponError("");

      try {
        const backendRows = await listBusUsedCoupons({ limit: 500 });
        if (isMounted) {
          setUsedCoupons(backendRows);
        }
      } catch (error) {
        if (isMounted) {
          setUsedCoupons([]);
          setUsedCouponError(error.message || "Unable to load used coupons from backend.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsedCoupons(false);
        }
      }
    }

    loadUsedCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableBookingStatuses = useMemo(() => {
    const uniqueStatuses = new Set(
      usedCoupons.map((record) => String(record.bookingStatus || "").toLowerCase()).filter(Boolean)
    );

    return Array.from(uniqueStatuses);
  }, [usedCoupons]);

  const availableCouponTypes = useMemo(() => {
    const uniqueTypes = new Set(
      usedCoupons.map((record) => String(record.cpnType || "").toLowerCase()).filter(Boolean)
    );

    return Array.from(uniqueTypes);
  }, [usedCoupons]);

  const visibleUsedCoupons = useMemo(() => {
    const filteredRecords = usedCoupons.filter((record) => {
      const matchesBookingStatus =
        bookingStatusFilter === "all" ||
        String(record.bookingStatus || "").toLowerCase() === bookingStatusFilter;
      const matchesCouponType =
        cpnTypeFilter === "all" || String(record.cpnType || "").toLowerCase() === cpnTypeFilter;

      return matchesBookingStatus && matchesCouponType;
    });

    return [...filteredRecords].sort((leftRecord, rightRecord) => {
      const leftValue = getUsedCouponSortValue(leftRecord, sortBy);
      const rightValue = getUsedCouponSortValue(rightRecord, sortBy);

      let result = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else {
        result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortOrder === "asc" ? result : -result;
    });
  }, [usedCoupons, bookingStatusFilter, cpnTypeFilter, sortBy, sortOrder]);

  const paginatedUsedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleUsedCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleUsedCoupons, currentPage]);

  const totalPages = Math.max(1, Math.ceil(visibleUsedCoupons.length / itemsPerPage));

  const hasActiveFilters =
    sortBy !== DEFAULT_USED_COUPON_SORT_BY ||
    sortOrder !== DEFAULT_USED_COUPON_SORT_ORDER ||
    bookingStatusFilter !== "all" ||
    cpnTypeFilter !== "all";

  const handleClearFilters = () => {
    setSortBy(DEFAULT_USED_COUPON_SORT_BY);
    setSortOrder(DEFAULT_USED_COUPON_SORT_ORDER);
    setBookingStatusFilter("all");
    setCpnTypeFilter("all");
  };

  const handleExport = () => {
    if (visibleUsedCoupons.length === 0) {
      return;
    }

    const header = [
      "ID",
      "Booking ID",
      "Coupon Code",
      "User ID",
      "Used Date",
      "Total Fare",
      "CPN Type",
      "CPN Value",
      "CPN Amount",
      "Booking Status",
    ];

    const csvRows = visibleUsedCoupons.map((record) => [
      record.id,
      record.bookingId,
      record.couponCode,
      record.userId,
      formatCouponDateTime(record.usedDate),
      formatCurrency(record.totalFare),
      record.cpnType,
      formatCurrency(record.cpnValue),
      formatCurrency(record.cpnAmount),
      record.bookingStatus,
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
    link.download = `admin-used-coupon-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  return (
    <section className="admin-b2c-page admin-markup-used-shell">
      <header className="admin-markup-used-header">
        <div className="admin-markup-used-title-wrap">
          <h1>
            <span style={{ color: '#A51C49' }}>B2C Bus </span>
            <span style={{ color: '#000000' }}>Used Coupon List</span>
          </h1>
        </div>

        <div className="admin-markup-used-actions">
          <button
            type="button"
            className={`admin-markup-used-btn filter ${isFilterPanelOpen ? "active" : ""}`}
            onClick={() => setIsFilterPanelOpen((previous) => !previous)}
            aria-expanded={isFilterPanelOpen}
            aria-controls="admin-markup-used-filter"
          >
            <SlidersHorizontal size={15} />
            <span>Filter</span>
          </button>

          <button
            type="button"
            className="admin-markup-used-btn clear"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            <X size={15} />
            <span>Clear Filter</span>
          </button>

          <button
            type="button"
            className="admin-markup-used-btn export"
            onClick={handleExport}
            disabled={visibleUsedCoupons.length === 0}
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {isFilterPanelOpen && (
        <section className="admin-markup-used-filter" id="admin-markup-used-filter">
          <div className="admin-markup-used-filter-grid">
            <label>
              <span>Sort By</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="usedDate">Used Date</option>
                <option value="id">ID</option>
                <option value="bookingId">Booking ID</option>
                <option value="couponCode">Coupon Code</option>
                <option value="userId">User ID</option>
                <option value="totalFare">Total Fare</option>
                <option value="cpnType">CPN Type</option>
                <option value="cpnValue">CPN Value</option>
                <option value="cpnAmount">CPN Amount</option>
                <option value="bookingStatus">Booking Status</option>
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
              <span>Booking Status</span>
              <select
                value={bookingStatusFilter}
                onChange={(event) => setBookingStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                {availableBookingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>CPN Type</span>
              <select
                value={cpnTypeFilter}
                onChange={(event) => setCpnTypeFilter(event.target.value)}
              >
                <option value="all">All</option>
                {availableCouponTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {usedCouponError && <p className="admin-markup-form-error">{usedCouponError}</p>}

      <section className="admin-markup-used-table-wrap">
        <div className="admin-markup-used-table-scroll">
          <table className="admin-markup-used-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking ID</th>
                <th>Coupon Code</th>
                <th>User ID</th>
                <th>Used Date</th>
                <th>Total Fare</th>
                <th>CPN Type</th>
                <th>CPN Value</th>
                <th>CPN Amount</th>
                <th>Booking Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUsedCoupons ? (
                <tr>
                  <td colSpan={10}>
                    <p className="admin-markup-used-empty">
                      <Loader2 size={16} className="spin" />
                      <span>Loading used coupons from backend...</span>
                    </p>
                  </td>
                </tr>
              ) : paginatedUsedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <p className="admin-markup-used-empty">No used coupons found.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsedCoupons.map((record) => (
                  <tr key={`${record.id}-${record.bookingId}`}>
                    <td>{record.id}</td>
                    <td>{record.bookingId}</td>
                    <td>{record.couponCode}</td>
                    <td>{record.userId || "--"}</td>
                    <td>{formatCouponDateTime(record.usedDate)}</td>
                    <td>{formatCurrency(record.totalFare)}</td>
                    <td>{record.cpnType}</td>
                    <td>{formatCurrency(record.cpnValue)}</td>
                    <td>{formatCurrency(record.cpnAmount)}</td>
                    <td>
                      <span
                        className={`admin-markup-used-status ${String(
                          record.bookingStatus || ""
                        ).toLowerCase()}`}
                      >
                        {record.bookingStatus || "--"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={visibleUsedCoupons.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="records"
          />
        )}
      </section>
    </section>
  );
}

