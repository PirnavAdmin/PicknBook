/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaEdit, FaEye, FaPlus, FaTrashAlt, FaFileExport, FaChevronDown, FaSearch, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './DiscountList.css';
import AdminPagination from '../../../components/AdminPagination';
import {
  listDiscounts,
  deleteDiscount,
  updateDiscount,
  createDiscount
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

  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const [editFormValues, setEditFormValues] = useState(null);
  const [editFormError, setEditFormError] = useState('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormValues, setAddFormValues] = useState({
    code: '',
    title: '',
    description: '',
    value: '',
    discountType: 'Percentage',
    isAutoApply: true,
    isExclusive: false,
    priority: '',
    minBookingAmount: '',
    startDateUtc: '',
    endDateUtc: '',
    status: 'Active',
    remark: '',
  });
  const [addFormError, setAddFormError] = useState('');
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);

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
        code: item.code || item.discountCode || item.discountcode || item.discount_code || item.couponCode || item.coupon_code || item.promoCode || item.promocode || item.promo_code || '',
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
      const dateA = new Date(a.entryDate);
      const dateB = new Date(b.entryDate);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateB - dateA;
      }
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) {
        return numB - numA;
      }
      return String(b.id).localeCompare(String(a.id));
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

  const toInputDateTimeLocal = (val) => {
    if (!val) return '';
    const date = new Date(val);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const toUtcIso = (val) => {
    if (!val) return null;
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const startEdit = (row) => {
    setEditingRow(row);
    setEditFormError('');
    setEditFormValues({
      code: row.code || '',
      title: row.title || row.remark || '',
      description: row.description || '',
      value: row.value !== undefined && row.value !== null ? String(row.value) : '',
      discountType: row.type || row.discountType || 'Percentage',
      isAutoApply: row.isAutoApply,
      isExclusive: row.isExclusive,
      priority: row.priority !== undefined && row.priority !== null ? String(row.priority) : '0',
      minBookingAmount: row.minBookingAmount !== undefined && row.minBookingAmount !== null ? String(row.minBookingAmount) : '0',
      startDateUtc: toInputDateTimeLocal(row.startDateUtc),
      endDateUtc: toInputDateTimeLocal(row.endDateUtc),
      status: row.status || 'Active',
      remark: row.remark || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError('');
    const code = String(editFormValues.code || '').trim().toUpperCase();
    const title = String(editFormValues.title || '').trim();
    const val = Number(editFormValues.value);
    const priority = Number(editFormValues.priority) || 0;
    const minBookingAmount = Number(editFormValues.minBookingAmount) || 0;
    const startTimestamp = editFormValues.startDateUtc ? new Date(editFormValues.startDateUtc).getTime() : null;
    const endTimestamp = editFormValues.endDateUtc ? new Date(editFormValues.endDateUtc).getTime() : null;

    if (!editFormValues.isAutoApply && !code) {
      setEditFormError('Discount code is required for manual apply (coupons).');
      return;
    }
    if (!title) {
      setEditFormError('Discount title is required.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setEditFormError('Please enter a valid value greater than 0.');
      return;
    }
    if (minBookingAmount < 0) {
      setEditFormError('Minimum booking amount cannot be negative.');
      return;
    }
    if (startTimestamp && endTimestamp && startTimestamp > endTimestamp) {
      setEditFormError('End date should be after start date.');
      return;
    }

    setEditFormSubmitting(true);
    try {
      const payload = {
        code,
        title,
        description: editFormValues.description || '',
        value: val,
        discountType: editFormValues.discountType,
        isAutoApply: editFormValues.isAutoApply,
        isExclusive: editFormValues.isExclusive,
        priority,
        minBookingAmount,
        startDateUtc: toUtcIso(editFormValues.startDateUtc),
        endDateUtc: toUtcIso(editFormValues.endDateUtc),
        status: editFormValues.status,
        remark: editFormValues.remark || '',
      };

      await updateDiscount(editingRow.id, payload);
      setRows((prev) =>
        prev.map((item) =>
          item.id === editingRow.id
            ? {
                ...item,
                ...payload,
                type: payload.discountType,
                title: payload.title,
                startDateUtc: payload.startDateUtc,
                endDateUtc: payload.endDateUtc,
              }
            : item
        )
      );
      setEditingRow(null);
    } catch (err) {
      setEditFormError(err.message || 'Failed to update discount.');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  const handleStatusToggle = async (id) => {
    const targetRow = rows.find(r => r.id === id);
    if (!targetRow) return;

    const newStatus = targetRow.status === "Active" ? "Inactive" : "Active";
    
    try {
      const payload = {
        code: targetRow.code || "",
        title: targetRow.title || "",
        description: targetRow.description || "",
        value: parseFloat(targetRow.value) || 0,
        discountType: targetRow.discountType || targetRow.type || "Percentage",
        isAutoApply: toBoolean(targetRow.isAutoApply),
        isExclusive: toBoolean(targetRow.isExclusive),
        priority: parseInt(targetRow.priority) || 0,
        minBookingAmount: parseFloat(targetRow.minBookingAmount) || 0,
        startDateUtc: targetRow.startDateUtc || "",
        endDateUtc: targetRow.endDateUtc || "",
        status: newStatus,
        remark: targetRow.remark || "",
      };
      await updateDiscount(id, payload);
      setRows((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const openAddModal = () => {
    setAddFormError('');
    setAddFormValues({
      code: '',
      title: '',
      description: '',
      value: '',
      discountType: 'Percentage',
      isAutoApply: true,
      isExclusive: false,
      priority: '',
      minBookingAmount: '',
      startDateUtc: '',
      endDateUtc: '',
      status: 'Active',
      remark: '',
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddFormError('');
    const code = String(addFormValues.code || '').trim().toUpperCase();
    const title = String(addFormValues.title || '').trim();
    const val = Number(addFormValues.value);
    const priority = Number(addFormValues.priority) || 0;
    const minBookingAmount = Number(addFormValues.minBookingAmount) || 0;
    const startTimestamp = addFormValues.startDateUtc ? new Date(addFormValues.startDateUtc).getTime() : null;
    const endTimestamp = addFormValues.endDateUtc ? new Date(addFormValues.endDateUtc).getTime() : null;

    if (!code) {
      setAddFormError('Discount code is required.');
      return;
    }
    if (!title) {
      setAddFormError('Discount title is required.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setAddFormError('Please enter a valid value greater than 0.');
      return;
    }
    if (minBookingAmount < 0) {
      setAddFormError('Minimum booking amount cannot be negative.');
      return;
    }
    if (startTimestamp && endTimestamp && startTimestamp > endTimestamp) {
      setAddFormError('End date should be after start date.');
      return;
    }

    setAddFormSubmitting(true);
    try {
      const payload = {
        code,
        title,
        description: addFormValues.description || '',
        value: val,
        discountType: addFormValues.discountType,
        isAutoApply: addFormValues.isAutoApply,
        isExclusive: addFormValues.isExclusive,
        priority,
        minBookingAmount,
        startDateUtc: toUtcIso(addFormValues.startDateUtc),
        endDateUtc: toUtcIso(addFormValues.endDateUtc),
        status: addFormValues.status,
        remark: addFormValues.remark || '',
      };

      const savedDiscount = await createDiscount(payload);
      
      const normalized = {
        id: savedDiscount.id || savedDiscount.discountId || '',
        code: savedDiscount.code || savedDiscount.discountCode || '',
        title: savedDiscount.title || savedDiscount.name || savedDiscount.remark || '',
        description: savedDiscount.description || '',
        value: Number(savedDiscount.value) || 0,
        type: savedDiscount.discountType || savedDiscount.type || 'Percentage',
        isAutoApply: toBoolean(savedDiscount.isAutoApply, true),
        isExclusive: toBoolean(savedDiscount.isExclusive, false),
        priority: Number(savedDiscount.priority) || 0,
        minBookingAmount: Number(savedDiscount.minBookingAmount) || 0,
        startDateUtc: savedDiscount.startDateUtc || savedDiscount.startDate || null,
        endDateUtc: savedDiscount.endDateUtc || savedDiscount.endDate || null,
        entryDate: savedDiscount.entryDate || 'N/A',
        status: savedDiscount.status || 'Active',
        remark: savedDiscount.remark || '',
        updatedBy: savedDiscount.updatedBy || 'Pick N Book',
      };

      setRows((prev) => [normalized, ...prev]);
      setIsAddModalOpen(false);
    } catch (err) {
      setAddFormError(err.message || 'Failed to create discount.');
    } finally {
      setAddFormSubmitting(false);
    }
  };

  const handleView = (row) => {
    setViewingRow(row);
  };

  const handleEdit = (row) => {
    startEdit(row);
  };

  const handleDelete = (row) => {
    setDeletingRow(row);
  };

  if (error) {
    return (
      <div className="discount-list-page-container bus-discount-list-page-container">
        <section className="discount-heading">
          <p className="discount-heading-main">
            B2C Bus <span className="discount-heading-sub">Discount List</span>
          </p>
        </section>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            <span>Network Error</span>
          </div>
          <button 
            type="button" 
            onClick={loadDiscounts}
            style={{
              background: '#A41B48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(164, 27, 72, 0.2)',
              transition: 'all 0.2s'
            }}
            title="Retry Connection"
          >
            <FaSync />
          </button>
        </div>
      </div>
    );
  }

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
          <button type="button" className="primary-btn mapping-nav-btn" onClick={() => navigate('/admin/b2c-bus/discount-mapping')}>
            Discount Mapping
          </button>
           <button type="button" className="primary-btn" onClick={() => navigate('/admin/b2c-bus/discounts/new')}>
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
                    <button
                      type="button"
                      className={`discount-status-pill ${row.status.toLowerCase()}`}
                      onClick={() => handleStatusToggle(row.id)}
                      aria-label={`Set status for ${row.code} to ${row.status === "Active" ? "Inactive" : "Active"}`}
                    >
                      {String(row.status || '').charAt(0).toUpperCase() + String(row.status || '').slice(1).toLowerCase()}
                    </button>
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
                            <span>View Details</span>
                            <FaEye className="item-icon" />
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
                            <span>Edit Discount</span>
                            <FaEdit className="item-icon" />
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
                            <span>Delete Discount</span>
                            <FaTrashAlt className="item-icon" />
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

      {/* VIEW DETAILS MODAL */}
      {viewingRow && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setViewingRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
            zIndex: 100000,
            padding: "40px 16px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "680px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              marginTop: "40px",
              marginBottom: "40px"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Discount Detail View</h3>
              <button
                type="button"
                onClick={() => setViewingRow(null)}
                style={{
                  border: 'none',
                  background: '#A51C49',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'flex-start' }}>
              <span style={{ background: viewingRow.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: viewingRow.status === 'Active' ? '#10b981' : '#64748b', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewingRow.status}
              </span>
              <span style={{ background: '#fdf2f8', color: '#A41B48', padding: '4px 12px', borderRadius: '100px', fontWeight: '700', fontSize: '11px', border: '1px solid rgba(165, 28, 73, 0.15)' }}>
                {viewingRow.code}
              </span>
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '4px 12px', borderRadius: '100px', fontWeight: '600', fontSize: '11px' }}>
                {viewingRow.type === 'Percentage' ? `${viewingRow.value}%` : `INR ${viewingRow.value}`}
              </span>
            </div>
 
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISCOUNT ID</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISCOUNT TITLE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISCOUNT TYPE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.type}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APPLY RULE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.isAutoApply ? 'Auto Apply' : 'Manual Apply (Coupon)'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXCLUSIVE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.isExclusive ? 'Yes' : 'No'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIORITY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.priority}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIN BOOKING AMOUNT</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>INR {viewingRow.minBookingAmount}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>START DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatDate(viewingRow.startDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>END DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatDate(viewingRow.endDateUtc)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ENTRY DATE</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{formatDate(viewingRow.entryDate)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED BY</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.updatedBy}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMARK</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{viewingRow.remark || '--'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESCRIPTION</span>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{viewingRow.description || '--'}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD DISCOUNT FORM MODAL */}
      {isAddModalOpen && (
        <div className="discount-modal-overlay">
          <div className="discount-modal-container edit-modal">
            <div className="modal-header">
              <h3 style={{ color: '#1e293b', fontWeight: '700' }}>Add B2C Discount</h3>
              <button type="button" className="close-x" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-body-scroll">
              {addFormError && <p className="modal-form-error">{addFormError}</p>}
              <div className="discount-form-grid">
                <label className="modal-field">
                  <span>Discount Code *</span>
                  <input
                    type="text"
                    placeholder="e.g. SAVE10"
                    value={addFormValues.code}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, code: e.target.value }))}
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Discount Title *</span>
                  <input
                    type="text"
                    placeholder="e.g. 10% Off Special Promo"
                    value={addFormValues.title}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Discount Value *</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter discount amount or percentage"
                    value={addFormValues.value}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, value: e.target.value }))}
                    required
                  />
                </label>
                <label className="modal-field">
                  <span>Discount Type</span>
                  <select
                    value={addFormValues.discountType}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, discountType: e.target.value }))}
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (INR)</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Apply Rule</span>
                  <select
                    value={addFormValues.isAutoApply ? 'true' : 'false'}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, isAutoApply: e.target.value === 'true' }))}
                  >
                    <option value="true">Auto Apply</option>
                    <option value="false">Manual Apply (Coupon)</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Exclusive Apply</span>
                  <select
                    value={addFormValues.isExclusive ? 'true' : 'false'}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, isExclusive: e.target.value === 'true' }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    value={addFormValues.priority}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, priority: e.target.value }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Min Booking Amount</span>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    value={addFormValues.minBookingAmount}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, minBookingAmount: e.target.value }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Start Date</span>
                  <input
                    type="datetime-local"
                    value={addFormValues.startDateUtc}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, startDateUtc: e.target.value }))}
                  />
                </label>
                <label className="modal-field">
                  <span>End Date</span>
                  <input
                    type="datetime-local"
                    value={addFormValues.endDateUtc}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, endDateUtc: e.target.value }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Status</span>
                  <select
                    value={addFormValues.status}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label className="modal-field">
                  <span>Remark</span>
                  <input
                    type="text"
                    placeholder="Enter remark"
                    value={addFormValues.remark}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </label>
                <label className="modal-field wide">
                  <span>Description</span>
                  <textarea
                    placeholder="Enter description details"
                    value={addFormValues.description}
                    onChange={(e) => setAddFormValues(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addFormSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn save-btn"
                  disabled={addFormSubmitting}
                >
                  {addFormSubmitting ? 'Adding...' : 'Add Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DISCOUNT FORM MODAL */}
      {editingRow && editFormValues && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setEditingRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
            padding: "16px"
          }}
        >
          <section 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "760px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "16px 20px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h1 style={{ color: "#A51C49", fontSize: "1.3rem", margin: 0, fontWeight: "700" }}>
                Edit B2C Bus Discount
              </h1>
            </div>

            <form onSubmit={handleEditSubmit}>
              {editFormError && (
                <p style={{ color: "red", margin: "8px 0", fontWeight: "600", fontSize: "0.85rem" }}>
                  {editFormError}
                </p>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Discount Code {!editFormValues.isAutoApply && '*'}</span>
                  <input
                    type="text"
                    value={editFormValues.code}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, code: e.target.value }))}
                    required={!editFormValues.isAutoApply}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Discount Title *</span>
                  <input
                    type="text"
                    value={editFormValues.title}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, title: e.target.value }))}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Discount Type</span>
                  <select
                    value={editFormValues.discountType}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, discountType: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (INR)</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Discount Value *</span>
                  <input
                    type="number"
                    step="any"
                    value={editFormValues.value}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, value: e.target.value }))}
                    required
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Min Booking Amount</span>
                  <input
                    type="number"
                    value={editFormValues.minBookingAmount}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, minBookingAmount: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Priority</span>
                  <input
                    type="number"
                    value={editFormValues.priority}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Apply Rule</span>
                  <select
                    value={editFormValues.isAutoApply ? 'true' : 'false'}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, isAutoApply: e.target.value === 'true' }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="true">Auto Apply</option>
                    <option value="false">Manual Apply (Coupon)</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Exclusive Apply</span>
                  <select
                    value={editFormValues.isExclusive ? 'true' : 'false'}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, isExclusive: e.target.value === 'true' }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Status</span>
                  <select
                    value={editFormValues.status}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, status: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Start Date</span>
                  <input
                    type="datetime-local"
                    value={editFormValues.startDateUtc}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, startDateUtc: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>End Date</span>
                  <input
                    type="datetime-local"
                    value={editFormValues.endDateUtc}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, endDateUtc: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                  <span>Remark</span>
                  <input
                    type="text"
                    value={editFormValues.remark}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, remark: e.target.value }))}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "28px", minHeight: "28px", boxSizing: "border-box", width: "100%", outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", fontWeight: "600", color: "#64748b", gridColumn: "span 3" }}>
                  <span>Description</span>
                  <textarea
                    value={editFormValues.description}
                    onChange={(e) => setEditFormValues(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", height: "44px", minHeight: "44px", boxSizing: "border-box", width: "100%", outline: "none", fontFamily: "inherit" }}
                  />
                </label>
              </div>

              <footer style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button 
                  type="button" 
                  onClick={() => setEditingRow(null)} 
                  style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                  disabled={editFormSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: "#A51C49", color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                  disabled={editFormSubmitting}
                >
                  {editFormSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE MODAL (styled like image-1) */}
      {deletingRow && createPortal(
        <div 
          className="admin-markup-coupon-backdrop" 
          onClick={() => setDeletingRow(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
            zIndex: 100000,
            padding: "40px 16px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "480px", 
              width: "100%", 
              background: "#ffffff", 
              borderRadius: "12px", 
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              marginTop: "100px",
              marginBottom: "40px"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', marginBottom: '8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Delete Discount</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setDeletingRow(null)}
                aria-label="Close delete dialog"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '8px 0 20px', textAlign: 'left', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete the discount master <strong>{deletingRow.code}</strong> ({deletingRow.title})?
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setDeletingRow(null)} 
                style={{ backgroundColor: "#f97316", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn delete-confirm-btn"
                onClick={async () => {
                  try {
                    await deleteDiscount(deletingRow.id);
                    setRows((prev) => prev.filter((row) => row.id !== deletingRow.id));
                    setDeletingRow(null);
                  } catch (err) {
                    alert(err.message || 'Failed to delete discount.');
                  }
                }}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px', height: 'auto' }}
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

export default DiscountList;
