/* eslint-disable */
import React from "react";

export default function AdminPagination({
  currentPage,
  page,
  totalItems,
  total,
  itemsPerPage,
  pageSize,
  onPageChange,
  onItemsPerPageChange,
  onPageSizeChange,
  itemName = "entries",
  showPerPage = true
}) {
  const activePage = typeof currentPage === "number" ? currentPage : (typeof page === "number" ? page : 1);
  const activeTotal = typeof totalItems === "number" ? totalItems : (typeof total === "number" ? total : 0);
  const activeItemsPerPage = Number(itemsPerPage || pageSize || 20);

  const totalPages = Math.ceil(activeTotal / activeItemsPerPage);

  const startItem = activeTotal === 0 ? 0 : (activePage - 1) * activeItemsPerPage + 1;
  const endItem = Math.min(activePage * activeItemsPerPage, activeTotal);

  // Generate dynamic dropdown options according to data reach thresholds:
  // Base: 5, 10, 15, 20, 25, 50, 100
  // After reach 100: 200, 300, 400, 500, 1000
  // After reach 1000: 1500, 2000, 2500... (increases with total data)
  const getPageSizeOptions = () => {
    const baseOptions = [5, 10, 15, 20, 25, 50, 100];
    const optsSet = new Set(baseOptions);

    if (activeTotal > 100) optsSet.add(200);
    if (activeTotal > 200) optsSet.add(300);
    if (activeTotal > 300) optsSet.add(400);
    if (activeTotal > 400) optsSet.add(500);
    if (activeTotal > 500) optsSet.add(1000);

    if (activeTotal > 1000) {
      const upperCap = Math.ceil(activeTotal / 500) * 500;
      for (let s = 1500; s <= upperCap; s += 500) {
        optsSet.add(s);
      }
    }

    if (activeItemsPerPage && !isNaN(activeItemsPerPage)) {
      optsSet.add(activeItemsPerPage);
    }

    return Array.from(optsSet).sort((a, b) => a - b);
  };

  const handleSizeChange = (e) => {
    const newSize = Number(e.target.value);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newSize);
    }
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
    if (onPageChange) {
      onPageChange(1);
    }
  };

  const options = getPageSizeOptions();

  return (
    <div className="admin-pagination-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', flexWrap: 'nowrap', gap: '12px' }}>
      {/* Left side: Showing X-Y of Z info */}
      <div className="admin-pagination-info" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize: '11px', color: '#475569' }}>
        <span>Showing {startItem}-{endItem} of {activeTotal} {itemName}</span>
      </div>

      {/* Right side: Per page dropdown + Previous / Page X of Y / Next controls all in one line */}
      <div className="admin-pagination-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
        {showPerPage && (
          <div className="admin-pagination-size" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="admin-per-page-select" style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', margin: 0, whiteSpace: 'nowrap' }}>
              Per page:
            </label>
            <select
              id="admin-per-page-select"
              className="admin-pagination-select"
              value={activeItemsPerPage}
              onChange={handleSizeChange}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                height: '26px'
              }}
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={activePage === 1}
            onClick={() => onPageChange && onPageChange(activePage - 1)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              cursor: activePage === 1 ? 'not-allowed' : 'pointer',
              opacity: activePage === 1 ? 0.6 : 1
            }}
          >
            &lt; Previous
          </button>
          <span className="admin-pagination-page-num" style={{ fontSize: '11px', fontWeight: 500, color: '#334155' }}>
            Page {activePage} of {totalPages || 1}
          </span>
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={activePage === totalPages || totalPages === 0}
            onClick={() => onPageChange && onPageChange(activePage + 1)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              cursor: (activePage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
              opacity: (activePage === totalPages || totalPages === 0) ? 0.6 : 1
            }}
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
