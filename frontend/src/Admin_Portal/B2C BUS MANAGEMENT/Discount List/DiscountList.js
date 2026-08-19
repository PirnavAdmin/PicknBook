/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaEye, FaPlus, FaTrashAlt, FaFileExport, FaChevronDown, FaSearch, FaLink } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './DiscountList.css';
import AdminPagination from '../../../components/AdminPagination';
import {
  listDiscounts,
  deleteDiscount,
  getDiscount,
  updateDiscount
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

const toInputDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const toUtcIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormValues, setEditFormValues] = useState({
    code: '',
    title: '',
    description: '',
    value: '',
    discountType: 'Percentage',
    isAutoApply: true,
    isExclusive: false,
    priority: '0',
    minBookingAmount: '0',
    startDateUtc: '',
    endDateUtc: '',
    status: 'Active',
    remark: '',
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

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

  const handleViewDetails = (row) => {
    setSelectedRow(row);
  };

  const handleEditClick = async (row) => {
    setEditError('');
    setEditSubmitting(false);
    setSelectedRow(row);
    setIsEditModalOpen(true);

    setEditFormValues({
      code: row.code || '',
      title: row.title || row.remark || '',
      description: row.description || '',
      value: row.value !== undefined && row.value !== null ? String(row.value) : '',
      discountType: row.type || row.discountType || 'Percentage',
      isAutoApply: toBoolean(row.isAutoApply, true),
      isExclusive: toBoolean(row.isExclusive, false),
      priority: row.priority !== undefined && row.priority !== null ? String(row.priority) : '0',
      minBookingAmount: row.minBookingAmount !== undefined && row.minBookingAmount !== null ? String(row.minBookingAmount) : '0',
      startDateUtc: toInputDateTimeLocal(row.startDateUtc),
      endDateUtc: toInputDateTimeLocal(row.endDateUtc),
      status: row.status || 'Active',
      remark: row.remark || '',
    });

    try {
      const item = await getDiscount(row.id);
      if (item) {
        setEditFormValues({
          code: item.code || item.discountCode || '',
          title: item.title || item.name || item.remark || '',
          description: item.description || '',
          value: item.value !== undefined && item.value !== null ? String(item.value) : '',
          discountType: item.discountType || item.type || 'Percentage',
          isAutoApply: toBoolean(item.isAutoApply, true),
          isExclusive: toBoolean(item.isExclusive, false),
          priority: item.priority !== undefined && item.priority !== null ? String(item.priority) : '0',
          minBookingAmount: item.minBookingAmount !== undefined && item.minBookingAmount !== null ? String(item.minBookingAmount) : '0',
          startDateUtc: toInputDateTimeLocal(item.startDateUtc || item.startDate),
          endDateUtc: toInputDateTimeLocal(item.endDateUtc || item.endDate),
          status: item.status || 'Active',
          remark: item.remark || '',
        });
      }
    } catch (e) {
      console.warn("Failed to fetch fresh discount details, using local data", e);
    }
  };

  const handleEdit = (row) => {
    handleEditClick(row);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    const code = String(editFormValues.code || '').trim().toUpperCase();
    const title = String(editFormValues.title || '').trim();
    const val = Number(editFormValues.value);
    const priority = Number(editFormValues.priority) || 0;
    const minBookingAmount = Number(editFormValues.minBookingAmount) || 0;
    const startTimestamp = editFormValues.startDateUtc ? new Date(editFormValues.startDateUtc).getTime() : null;
    const endTimestamp = editFormValues.endDateUtc ? new Date(editFormValues.endDateUtc).getTime() : null;

    if (!code) {
      setEditError('Discount code is required.');
      return;
    }
    if (!title) {
      setEditError('Discount title is required.');
      return;
    }
    if (Number.isNaN(val) || val <= 0) {
      setEditError('Please enter a valid value greater than 0.');
      return;
    }
    if (minBookingAmount < 0) {
      setEditError('Minimum booking amount cannot be negative.');
      return;
    }
    if (startTimestamp && endTimestamp && startTimestamp > endTimestamp) {
      setEditError('End date should be after start date.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        code,
        title,
        description: String(editFormValues.description || '').trim(),
        value: val,
        discountType: editFormValues.discountType,
        isAutoApply: Boolean(editFormValues.isAutoApply),
        isExclusive: Boolean(editFormValues.isExclusive),
        priority,
        minBookingAmount,
        startDateUtc: toUtcIso(editFormValues.startDateUtc),
        endDateUtc: toUtcIso(editFormValues.endDateUtc),
        status: editFormValues.status,
        updatedBy: 'admin',
        remark: String(editFormValues.remark || '').trim(),
      };

      await updateDiscount(selectedRow.id, payload);
      setIsEditModalOpen(false);
      loadDiscounts();
      setSelectedRow(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update discount.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteClick = (row) => {
    setRowToDelete(row);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!rowToDelete) return;
    try {
      await deleteDiscount(rowToDelete.id);
      setRows((prev) => prev.filter((row) => row.id !== rowToDelete.id));
      if (selectedRow?.id === rowToDelete.id) {
        setSelectedRow(null);
      }
      setIsDeleteModalOpen(false);
      setRowToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete discount.');
    }
  };

  const handleDelete = (row) => {
    handleDeleteClick(row);
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
          <button type="button" className="primary-btn mapping-btn" onClick={() => navigate('/admin/b2c-bus/discount-mapping')}>
            <FaLink aria-hidden="true" />
            Discount Mapping
          </button>
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
                              handleViewDetails(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <FaEye className="item-icon" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-item view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(row);
                              setActiveDropdownId(null);
                            }}
                          >
                            <FaLink className="item-icon" />
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
                              handleDelete(row);
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

      {/* View Details Modal */}
      {selectedRow && !isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">View B2C Bus Discount Details</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedRow(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="details-item">
                  <span className="details-label">ID</span>
                  <span className="details-value">{selectedRow.id}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Discount Code</span>
                  <span className="details-value">{selectedRow.code || '--'}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Title</span>
                  <span className="details-value">{selectedRow.title || '--'}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Discount Type</span>
                  <span className="details-value">{selectedRow.type}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Value</span>
                  <span className="details-value">
                    {selectedRow.type === 'Percentage' ? `${selectedRow.value}%` : `INR ${selectedRow.value}`}
                  </span>
                </div>
                <div className="details-item">
                  <span className="details-label">Auto Apply</span>
                  <span className="details-value">{selectedRow.isAutoApply ? 'Yes' : 'No'}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Exclusive</span>
                  <span className="details-value">{selectedRow.isExclusive ? 'Yes' : 'No'}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Priority</span>
                  <span className="details-value">{selectedRow.priority}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Min Booking Amount</span>
                  <span className="details-value">INR {selectedRow.minBookingAmount}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Start Date & Time</span>
                  <span className="details-value">{formatDate(selectedRow.startDateUtc)}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">End Date & Time</span>
                  <span className="details-value">{formatDate(selectedRow.endDateUtc)}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Status</span>
                  <span className={`discount-status-pill ${selectedRow.status.toLowerCase()}`} style={{ width: 'fit-content', marginTop: '4px' }}>
                    <span className="discount-status-dot" />
                    {selectedRow.status}
                  </span>
                </div>
                <div className="details-item">
                  <span className="details-label">Updated By</span>
                  <span className="details-value">{selectedRow.updatedBy}</span>
                </div>
                <div className="details-item">
                  <span className="details-label">Entry Date</span>
                  <span className="details-value">{formatDate(selectedRow.entryDate)}</span>
                </div>
                <div className="details-item wide">
                  <span className="details-label">Description</span>
                  <span className="details-value">{selectedRow.description || '--'}</span>
                </div>
                <div className="details-item wide">
                  <span className="details-label">Remark</span>
                  <span className="details-value">{selectedRow.remark || '--'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  handleEditClick(selectedRow);
                }}
              >
                <FaEdit /> Edit Discount
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSelectedRow(null)}
                style={{ borderColor: '#cbd5e1', color: '#475569', background: 'transparent' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit B2C Bus Discount</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="add-discount-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Discount Code</span>
                    <input
                      type="text"
                      value={editFormValues.code}
                      onChange={(event) =>
                        setEditFormValues((previous) => ({
                          ...previous,
                          code: event.target.value.toUpperCase().replace(/\s+/g, ''),
                        }))
                      }
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Title</span>
                    <input
                      type="text"
                      value={editFormValues.title}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, title: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Discount Type</span>
                    <select
                      value={editFormValues.discountType}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, discountType: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', height: '38px' }}
                      disabled={editSubmitting}
                    >
                      <option value="Percentage">Percentage</option>
                      <option value="Fixed">Fixed</option>
                    </select>
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Value</span>
                    <input
                      type="number"
                      min="0"
                      value={editFormValues.value}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, value: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Min Booking Amount</span>
                    <input
                      type="number"
                      min="0"
                      value={editFormValues.minBookingAmount}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, minBookingAmount: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Priority</span>
                    <input
                      type="number"
                      min="0"
                      value={editFormValues.priority}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, priority: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Auto Apply</span>
                    <select
                      value={String(editFormValues.isAutoApply)}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, isAutoApply: e.target.value === 'true' }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', height: '38px' }}
                      disabled={editSubmitting}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Exclusive</span>
                    <select
                      value={String(editFormValues.isExclusive)}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, isExclusive: e.target.value === 'true' }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', height: '38px' }}
                      disabled={editSubmitting}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Start Date & Time</span>
                    <input
                      type="datetime-local"
                      value={editFormValues.startDateUtc}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, startDateUtc: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>End Date & Time</span>
                    <input
                      type="datetime-local"
                      value={editFormValues.endDateUtc}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, endDateUtc: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</span>
                    <select
                      value={editFormValues.status}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, status: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', height: '38px' }}
                      disabled={editSubmitting}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Description</span>
                    <textarea
                      value={editFormValues.description}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, description: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                      rows={2}
                    />
                  </label>

                  <label className="add-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Remark</span>
                    <textarea
                      value={editFormValues.remark}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, remark: e.target.value }))}
                      style={{ border: '1px solid var(--admin-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}
                      disabled={editSubmitting}
                      rows={2}
                    />
                  </label>
                </div>

                {editError && <p style={{ color: 'red', marginTop: '12px', fontSize: '13px' }}>{editError}</p>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="primary-btn" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ borderColor: '#cbd5e1', color: '#475569', background: 'transparent' }}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Discount</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsDeleteModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                Are you sure you want to delete the discount{' '}
                <strong style={{ color: '#0f172a' }}>
                  {rowToDelete?.title || rowToDelete?.code || 'this discount'}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="primary-btn"
                onClick={handleDeleteConfirm}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                Delete
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ borderColor: '#cbd5e1', color: '#475569', background: 'transparent' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscountList;
