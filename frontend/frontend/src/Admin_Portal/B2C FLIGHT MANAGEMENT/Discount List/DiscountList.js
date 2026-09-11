import { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaEye, FaPlus, FaTrashAlt, FaFileExport, FaChevronDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { listFlightPromotions, deleteFlightPromotion } from '../../../services/flightBookingService';
import './DiscountList.css';
import AdminPagination from '../../../components/AdminPagination';
import { Percent, CheckCircle2, XCircle } from 'lucide-react';

const initialRows = [
  {
    id: 'FLD-1401',
    value: 1200,
    type: 'Fixed',
    entryDate: '12 Mar 2026, 10:20 AM',
    updateDate: '12 Mar 2026, 10:20 AM',
    updatedBy: 'Pick N Book',
    remark: 'Early bird saver fare',
    status: 'Active',
  },
];

const STORAGE_KEY = 'admin_b2c_flight_discounts';

const readStoredRows = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return [];
  }
  return [];
};

const escapeCsvValue = (value) => {
  const safeValue = String(value ?? '');
  if (/[",\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
};

const renderDateTime = (dateStr) => {
  if (!dateStr) return '--';
  const parts = String(dateStr).split(', ');
  if (parts.length === 2) {
    return (
      <div style={{ whiteSpace: 'nowrap' }}>
        {parts[0]}
        <br />
        <span style={{ fontSize: '11px', color: 'var(--admin-muted)', fontWeight: 'normal' }}>{parts[1]}</span>
      </div>
    );
  }
  return dateStr;
};

const highlightText = (text, search) => {
  if (!search || !text) return text;
  const str = String(text);
  const index = str.toLowerCase().indexOf(search.toLowerCase());
  if (index === -1) return text;

  const parts = [];
  let remaining = str;
  while (remaining) {
    const idx = remaining.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) {
      parts.push(remaining);
      break;
    }
    if (idx > 0) {
      parts.push(remaining.substring(0, idx));
    }
    parts.push(
      <span
        key={remaining.length + idx}
        style={{
          backgroundColor: '#ffeb3b',
          color: '#000',
          fontWeight: 'bold',
          borderRadius: '2px',
          padding: '0 2px'
        }}
      >
        {remaining.substring(idx, idx + search.length)}
      </span>
    );
    remaining = remaining.substring(idx + search.length);
  }
  return parts;
};

const normalizePromotionRow = (promo) => {
  const isFlat = promo.discountType === 1 || promo.discountType === "Flat" || promo.discountType === "Fixed";
  const isActive = promo.isActive === true || promo.isActive === 1 || String(promo.isActive).toLowerCase() === 'true' || String(promo.status).toLowerCase() === 'active';
  return {
    id: promo.id,
    value: promo.discountValue,
    type: isFlat ? "Fixed" : "Percentage",
    entryDate: promo.createdAtUtc ? new Date(promo.createdAtUtc).toLocaleString() : "",
    updateDate: promo.updatedAtUtc ? new Date(promo.updatedAtUtc).toLocaleString() : "",
    updatedBy: promo.updatedBy || "Admin",
    remark: promo.remark || promo.remarks || promo.description || promo.name || "",
    status: isActive ? "Active" : "Inactive",
    raw: promo
  };
};

function DiscountList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadPromotions = async () => {
    setRefreshing(true);
    try {
      const data = await listFlightPromotions();
      if (Array.isArray(data)) {
        setRows(data.map(normalizePromotionRow));
      } else {
        const local = readStoredRows();
        setRows(local.length ? local : initialRows);
      }
    } catch (error) {
      console.warn("Failed to load promotions from backend, falling back to local storage", error);
      const local = readStoredRows();
      setRows(local.length ? local : initialRows);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
      if (!event.target.closest('.custom-dropdown-container')) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const filteredDiscounts = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) {
        return numA - numB;
      }
      return String(a.id).localeCompare(String(b.id));
    });

    return sorted.filter((row) => {
      const matchesSearch =
        String(row.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.remark).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || row.status === statusFilter;

      const matchesDate = !dateFilter || (() => {
        const rowEntry = row.raw?.createdAtUtc || row.raw?.entryDate || row.entryDate;
        const rowUpdate = row.raw?.updatedAtUtc || row.raw?.updateDate || row.updateDate;
        const checkMatch = (dStr) => {
          if (!dStr) return false;
          const d = new Date(dStr);
          if (Number.isNaN(d.getTime())) return false;
          return d.toISOString().slice(0, 10) === dateFilter;
        };
        return checkMatch(rowEntry) || checkMatch(rowUpdate);
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [rows, searchTerm, statusFilter, dateFilter]);

  const paginatedDiscounts = useMemo(() => {
    return filteredDiscounts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredDiscounts, currentPage, itemsPerPage]);

  const activeCount = rows.filter((row) => row.status === 'Active').length;
  const inactiveCount = rows.filter((row) => row.status === 'Inactive').length;

  const handleExport = () => {
    const headers = [
      'ID',
      'Value',
      'Discount Type',
      'Entry Date',
      'Update Date',
      'Updated By',
      'Remark',
      'Status',
    ];

    const csvContent = [
      headers,
      ...filteredDiscounts.map((row) => [
        row.id,
        row.value,
        row.type,
        row.entryDate,
        row.updateDate,
        row.updatedBy,
        row.remark,
        row.status,
      ]),
    ]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `b2c-flight-discount-list-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleView = (row) => {
    setSelectedRow(row);
  };

  const handleEdit = (row) => {
    navigate('/admin/b2c-flight/add-discount', { state: { mode: 'edit', row } });
  };

  const handleDelete = async (rowId) => {
    try {
      await deleteFlightPromotion(rowId);
    } catch (e) {
      console.warn("Failed to delete promotion from server", e);
    }
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    if (selectedRow?.id === rowId) {
      setSelectedRow(null);
    }
  };

  return (
    <div className="discount-list-page-container">
      <style>{`
        .discount-list-page-container .field span {
          color: var(--admin-text) !important;
        }
        .discount-list-page-container .custom-dropdown-trigger {
          background: var(--admin-surface) !important;
          color: var(--admin-text) !important;
          border-color: var(--admin-border) !important;
        }
        .discount-list-page-container .custom-dropdown-menu {
          background: var(--admin-surface) !important;
          border-color: var(--admin-border) !important;
        }
        .discount-list-page-container .custom-dropdown-item {
          color: var(--admin-text) !important;
        }
        .discount-list-page-container .custom-dropdown-item:hover,
        .discount-list-page-container .custom-dropdown-item.active {
          background: var(--admin-danger-soft, #fef2f2) !important;
          color: var(--admin-danger, #ef4444) !important;
        }
        /* Light Theme (White Mode) - Red buttons */
        .admin-shell.light-theme .discount-list-page-container .primary-btn,
        .admin-shell.light-theme .discount-list-page-container .export-btn {
          background: #A51C49 !important;
          border-color: #A51C49 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(194, 24, 91, 0.2) !important;
        }
        .admin-shell.light-theme .discount-list-page-container .primary-btn:hover,
        .admin-shell.light-theme .discount-list-page-container .export-btn:hover {
          background: #9c1048 !important;
          border-color: #9c1048 !important;
        }

        /* Dark Theme (Black/Dark Mode) - Blue buttons */
        .admin-shell.dark-theme .discount-list-page-container .primary-btn,
        .admin-shell.dark-theme .discount-list-page-container .export-btn {
          background: #1e75ff !important;
          border-color: #1e75ff !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(30, 117, 255, 0.2) !important;
        }
        .admin-shell.dark-theme .discount-list-page-container .primary-btn:hover,
        .admin-shell.dark-theme .discount-list-page-container .export-btn:hover {
          background: #0052d9 !important;
          border-color: #0052d9 !important;
        }
      `}</style>
      <section className="discount-heading">
        <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 700 }}>
          <span style={{ color: '#A51C49' }}>B2C Flight</span>{' '}
          <span style={{ color: '#1a1a2e' }}>Discount List</span>
        </h1>
      </section>

      {selectedRow ? (
        <section className="details-panel">
          <div className="details-header">
            <div>
              <p className="details-title">View B2C Flight Discount Details</p>
              <p className="details-subtitle">Basic Details</p>
            </div>
            <div className="details-actions">
              <button type="button" className="ghost-btn" onClick={() => handleEdit(selectedRow)}>
                Edit B2C Discount
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedRow(null)}
              >
                B2C Flight Discount List
              </button>
            </div>
          </div>
          <div className="details-grid">
            <div className="details-item">
              <span className="details-label">ID</span>
              <span className="details-value">{selectedRow.id}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Discount Type</span>
              <span className="details-value">{selectedRow.type}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Value</span>
              <span className="details-value">INR {selectedRow.value}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Status</span>
              <span className="details-value">{selectedRow.status}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Entry Date</span>
              <span className="details-value">{selectedRow.entryDate}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Update Date</span>
              <span className="details-value">{selectedRow.updateDate}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Updated By</span>
              <span className="details-value">{selectedRow.updatedBy}</span>
            </div>
            <div className="details-item wide">
              <span className="details-label">Remark</span>
              <span className="details-value">{selectedRow.remark}</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="stats-row">
        <div className="stat-card total">
          <div className="stat-label">Total Discounts</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-meta">Across all active airlines</div>
        </div>
        <div className="stat-card active">
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-meta">Currently visible to users</div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{inactiveCount}</div>
          <div className="stat-meta">Hidden from checkout</div>
        </div>
      </section>

      <section className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            <span>Search discounts</span>
            <input
              type="text"
              placeholder="Search by ID, type, remark"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Updated</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>
        </div>
        <div className="toolbar-actions">
          <div className="field custom-dropdown-container">
            <span>Status</span>
            <button
              type="button"
              className="custom-dropdown-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setStatusDropdownOpen(!statusDropdownOpen);
              }}
            >
              <span>{statusFilter}</span>
              <FaChevronDown className={`chevron-icon ${statusDropdownOpen ? 'open' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <div className="custom-dropdown-menu">
                {['All', 'Active', 'Inactive'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`custom-dropdown-item ${statusFilter === opt ? 'active' : ''}`}
                    onClick={() => {
                      setStatusFilter(opt);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="primary-btn" onClick={() => navigate('/admin/b2c-flight/add-discount')}>
            <FaPlus aria-hidden="true" />
            Add B2C Discount
          </button>
          <button type="button" className="primary-btn export-btn" onClick={handleExport}>
            <FaFileExport aria-hidden="true" />
            Export
          </button>
        </div>
      </section>

      <section className="discount-table-wrapper">
        <table className="discount-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Discount Type</th>
              <th>Value</th>
              <th>Status</th>
              <th>Entry Date</th>
              <th>Update Date</th>
              <th>Updated By</th>
              <th>Remark</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiscounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No discounts match your filters.
                </td>
              </tr>
            ) : (
              paginatedDiscounts.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="id-chip">{highlightText(row.id, searchTerm)}</div>
                  </td>
                  <td>{highlightText(row.type, searchTerm)}</td>
                  <td className="amount-cell">INR {highlightText(row.value, searchTerm)}</td>
                  <td className="status-cell">
                    <span className={`discount-status-pill ${row.status.toLowerCase()}`}>
                      <span className="discount-status-dot" />
                      {row.status}
                    </span>
                  </td>
                  <td>{renderDateTime(row.entryDate)}</td>
                  <td>{renderDateTime(row.updateDate)}</td>
                  <td>{highlightText(row.updatedBy, searchTerm)}</td>
                  <td className="remark-cell" title={row.remark}>{highlightText(row.remark, searchTerm)}</td>
                  <td>
                    <div className="actions-dropdown-container">
                      <button
                        type="button"
                        className={`actions-trigger-btn ${activeDropdownId === row.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === row.id ? null : row.id);
                        }}
                      >
                        <span>Actions</span>
                        <FaChevronDown className="chevron-icon" />
                      </button>
                      {activeDropdownId === row.id && (
                        <div className="actions-dropdown-menu">
                          <button
                            type="button"
                            className="dropdown-item view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <FaEye className="item-icon" />
                            <span>View Mapping</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-item edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <FaEdit className="item-icon" />
                            <span>Edit Discount</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(row.id);
                              setActiveDropdownId(null);
                            }}
                          >
                            <FaTrashAlt className="item-icon" />
                            <span>Delete Discount</span>
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
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredDiscounts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="discounts"
        />
      </section>
    </div>
  );
}

export default DiscountList;

