/* eslint-disable */
import React from "react";

export default function AdminPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = "entries"
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="admin-pagination-container">
      <div className="admin-pagination-info">
        Showing {startItem}-{endItem} of {totalItems} {itemName}
      </div>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          &lt; Previous
        </button>
        <span className="admin-pagination-page-num">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          type="button"
          className="admin-pagination-btn"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
}
