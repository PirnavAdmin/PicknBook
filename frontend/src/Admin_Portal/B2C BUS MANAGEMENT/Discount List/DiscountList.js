import { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaEye, FaPlus, FaTrashAlt, FaFileExport, FaChevronDown, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './DiscountList.css';
import AdminPagination from '../../../components/AdminPagination';
import {
  listDiscounts,
  deleteDiscount
} from '../../../services/adminBusService';

const escapeCsvValue = (value) => {
  const safeValue = String(value ?? '');
  if (/[",\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
};

const formatDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).trim().toLowerCase() === 'true';
};

function DiscountList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const data = await listDiscounts();
      const normalized = (data || []).map((item) => ({
        id: item.id || item.discountId || '',
        code: item.code || item.discountCode || '',
        title: item.title || item.name || item.remark || '',
        description: item.description || '',
        value: Number(item.value) || 0,
        type: item.discountType || item.type || 'Percentage',
        isAutoApply: toBoolean(item.isAutoApply, true),
        isExclusive: toBoolean(item.isExclusive, false),
        priority: Number(item.priority) || 0,
        minBookingAmount: Number(item.minBookingAmount) || 0,
        startDateUtc: item.startDateUtc || item.startDate || null,
        endDateUtc: item.endDateUtc || item.endDate || null,
        entryDate: item.entryDate || item.entryDateUtc || item.createdDate || item.createdAt || 'N/A',
        updateDate: item.updateDate || item.updateDateUtc || item.updatedDate || item.updatedAt || 'N/A',
        updatedBy: item.updatedBy || 'Pick N Book',
        remark: item.remark || '',
        status: item.status || 'Active',
      }));
      setRows(normalized);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load discounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const filteredDiscounts = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) {
        return numA - numB;
      }
      const dateA = new Date(a.entryDate);
      const dateB = new Date(b.entryDate);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateA - dateB;
      }
      return String(a.id).localeCompare(String(b.id));
    });

    return sorted.filter((row) => {
      const matchesSearch =
        String(row.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.remark || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const paginatedDiscounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDiscounts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDiscounts, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredDiscounts.length / itemsPerPage));

  const activeCount = rows.filter((row) => row.status === 'Active').length;
  const inactiveCount = rows.filter((row) => row.status === 'Inactive').length;

  const handleExport = () => {
    const headers = [
      'ID',
      'Code',
      'Title',
      'Value',
      'Discount Type',
      'Auto Apply',
      'Exclusive',
      'Priority',
      'Min Booking Amount',
      'Start Date',
      'End Date',
      'Entry Date',
      'Update Date',
      'Updated By',
      'Description',
      'Remark',
      'Status',
    ];

    const csvContent = [
      headers,
      ...filteredDiscounts.map((row) => [
        row.id,
        row.code,
        row.title,
        row.value,
        row.type,
        row.isAutoApply ? 'Yes' : 'No',
        row.isExclusive ? 'Yes' : 'No',
        row.priority,
        row.minBookingAmount,
        formatDate(row.startDateUtc),
        formatDate(row.endDateUtc),
        formatDate(row.entryDate),
        formatDate(row.updateDate),
        row.updatedBy,
        row.description,
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
    link.download = `b2c-bus-discount-list-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleView = (row) => {
    navigate('/admin/b2c-bus/discount-mapping', { state: { discountId: row.id } });
  };

  const handleEdit = (row) => {
    navigate('/admin/b2c-bus/add-discount', { state: { mode: 'edit', row } });
  };

  const handleDelete = async (rowId) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) {
      return;
    }
    try {
      await deleteDiscount(rowId);
      setRows((prev) => prev.filter((row) => row.id !== rowId));
    } catch (err) {
      alert(err.message || 'Failed to delete discount.');
    }
  };

  return (
    <div className="discount-list-page-container bus-discount-list-page-container">
      <section className="discount-heading">
        <p className="discount-heading-main">
          B2C Bus <span className="discount-heading-sub">Discount List</span>
        </p>
      </section>

      <section className="stats-row">
        <div className="stat-card total">
          <div className="stat-label">Total Discounts</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-meta">Across all active routes</div>
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

      {error && <p className="form-error" style={{ color: 'red', margin: '16px 0' }}>{error}</p>}

      <section className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            <span>Search discounts</span>
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by ID, code, title, type, remark"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </label>
        </div>
        <div className="toolbar-actions">
          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={() => navigate('/admin/b2c-bus/add-discount')}>
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
              <th>Discount / Code</th>
              <th>Value</th>
              <th>Apply Rules</th>
              <th>Min Booking</th>
              <th>Validity</th>
              <th>Status</th>
              <th>Updated By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  Loading discounts...
                </td>
              </tr>
            ) : paginatedDiscounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No discounts match your filters.
                </td>
              </tr>
            ) : (
              paginatedDiscounts.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="id-chip">{row.id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.title || '--'}</div>
                    <small style={{ color: 'var(--admin-muted)', fontSize: '10px' }}>
                      {row.code || '--'} &bull; {row.type}
                    </small>
                  </td>
                  <td className="amount-cell">
                    {row.type === 'Percentage' ? `${row.value}%` : `INR ${row.value}`}
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>{row.isAutoApply ? 'Auto' : 'Manual'}{row.isExclusive ? ' · Excl.' : ''}</div>
                    <small style={{ color: 'var(--admin-muted)', fontSize: '10px' }}>Pri: {row.priority}</small>
                  </td>
                  <td style={{ fontSize: '11px' }}>{row.minBookingAmount ? `INR ${row.minBookingAmount}` : '--'}</td>
                  <td style={{ fontSize: '10px', lineHeight: 1.5 }}>
                    {formatDate(row.startDateUtc)}
                    <br />
                    {formatDate(row.endDateUtc)}
                  </td>
                  <td className="status-cell">
                    <span className={`discount-status-pill ${row.status.toLowerCase()}`}>
                      <span className="discount-status-dot" />
                      {row.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.updatedBy}</td>
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

        <div style={{ marginTop: '16px' }}>
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredDiscounts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="discounts"
          />
        </div>
      </section>
    </div>
  );
}

export default DiscountList;
