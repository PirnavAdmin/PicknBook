/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';
import './UserSecurityRules.css';

// Predefined routes for quick selection in URL Block Modal
const POPULAR_RESTRICTABLE_URLS = [
  { label: 'Hotel Booking API', url: '/api/v1/hotels/book' },
  { label: 'Flight Booking API', url: '/api/v1/flights/book' },
  { label: 'Bus Booking API', url: '/api/v1/bus/book' },
  { label: 'User Profile Update API', url: '/api/v1/user/profile' },
  { label: 'Payment Checkout API', url: '/api/v1/payments/checkout' },
  { label: 'Wallet Transfer API', url: '/api/v1/wallet/transfer' },
];

// Fallback Mock Rules matching API guide for initial/demo display if server returns empty
const MOCK_FALLBACK_RULES = [
  {
    id: 45,
    userId: '1001',
    ruleType: 'USER',
    route: null,
    action: 'BLOCK',
    scope: 'USER',
    status: 'ACTIVE',
    source: 'MANUAL',
    reason: 'Repeated suspicious login attempts',
    blockType: 'TEMPORARY',
    durationMinutes: 120,
    startTime: '2026-09-04T10:00:00Z',
    expiryTime: '2026-09-04T12:00:00Z',
    createdBy: 'SuperAdmin',
    createdAt: '2026-09-04T10:00:00Z'
  },
  {
    id: 46,
    userId: '1002',
    ruleType: 'URL',
    route: '/api/v1/hotels/book',
    action: 'BLOCK',
    scope: 'USER',
    status: 'ACTIVE',
    source: 'MANUAL',
    reason: 'Restricted feature access',
    blockType: 'TEMPORARY',
    durationMinutes: 60,
    startTime: '2026-09-04T10:15:00Z',
    expiryTime: '2026-09-04T11:15:00Z',
    createdBy: 'Admin',
    createdAt: '2026-09-04T10:15:00Z'
  },
  {
    id: 47,
    userId: '1003',
    ruleType: 'USER',
    route: null,
    action: 'BLOCK',
    scope: 'USER',
    status: 'EXPIRED',
    source: 'MANUAL',
    reason: 'Temporary investigation concluded',
    blockType: 'TEMPORARY',
    durationMinutes: 30,
    startTime: '2026-09-04T08:00:00Z',
    expiryTime: '2026-09-04T08:30:00Z',
    createdBy: 'SecOps',
    createdAt: '2026-09-04T08:00:00Z'
  },
  {
    id: 48,
    userId: '1004',
    ruleType: 'URL',
    route: '/api/v1/wallet/transfer',
    action: 'BLOCK',
    scope: 'USER',
    status: 'UNBLOCKED',
    source: 'MANUAL',
    reason: 'Verification completed by Admin',
    blockType: 'TEMPORARY',
    durationMinutes: 120,
    startTime: '2026-09-04T09:00:00Z',
    expiryTime: '2026-09-04T11:00:00Z',
    createdBy: 'Admin',
    createdAt: '2026-09-04T09:00:00Z'
  }
];

export default function UserSecurityRules() {
  const navigate = useNavigate();

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // Data & Loading States
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Filters State
  const [searchUserId, setSearchUserId] = useState('');
  const [filterRuleType, setFilterRuleType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [showBlockUserModal, setShowBlockUserModal] = useState(false);
  const [showBlockUrlsModal, setShowBlockUrlsModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const [selectedRule, setSelectedRule] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.usr-dropdown-wrapper')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Form States - Block User
  const [blockUserForm, setBlockUserForm] = useState({
    userId: '',
    blockType: 'TEMPORARY',
    durationMinutes: 120,
    reason: ''
  });

  // Form States - Block URLs
  const [blockUrlsForm, setBlockUrlsForm] = useState({
    userId: '',
    blockType: 'TEMPORARY',
    durationMinutes: 120,
    reason: '',
    urls: ['/api/v1/hotels/book'],
    customUrlInput: ''
  });

  // Action Form States
  const [unblockReason, setUnblockReason] = useState('Verification completed by Admin');
  const [extendDurationMinutes, setExtendDurationMinutes] = useState(240);
  const [extendReason, setExtendReason] = useState('Extended investigation required');
  const [submittingAction, setSubmittingAction] = useState(false);

  const triggerToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Rules from API
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await securityService.getUserSecurityRules({
        page: currentPage,
        pageSize,
        userId: searchUserId.trim(),
        status: filterStatus === 'ALL' ? '' : filterStatus
      });

      // Extract backend response data strictly
      const resPayload = response?.data || response;
      let rawItems = [];
      if (Array.isArray(resPayload?.items)) {
        rawItems = resPayload.items;
      } else if (Array.isArray(resPayload?.data?.items)) {
        rawItems = resPayload.data.items;
      } else if (Array.isArray(resPayload)) {
        rawItems = resPayload;
      } else if (Array.isArray(response?.items)) {
        rawItems = response.items;
      }

      let fetchedData = rawItems;
      if (filterStatus !== 'ALL') {
        fetchedData = fetchedData.filter(r => (r.status || 'ACTIVE').toUpperCase() === filterStatus);
      }

      setRules(fetchedData);
      setTotalItems(resPayload?.totalRecords ?? resPayload?.total ?? response?.totalRecords ?? fetchedData.length);
    } catch (err) {
      console.error('Error fetching user security rules:', err);
      setErrorMsg(err.message || 'Failed to load user security rules from API.');
      setRules([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchUserId, filterRuleType, filterStatus]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Handler: Block User ID
  const handleBlockUserSubmit = async (e) => {
    e.preventDefault();
    if (!blockUserForm.userId.trim()) {
      triggerToast('Please enter a valid User ID.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await securityService.blockUser({
        userId: blockUserForm.userId.trim(),
        blockType: blockUserForm.blockType,
        durationMinutes: Number(blockUserForm.durationMinutes) || 120,
        reason: blockUserForm.reason.trim() || 'Suspicious fraudulent activity detected'
      });

      if (res && (res.success || res.data)) {
        triggerToast(`User ID ${blockUserForm.userId} blocked successfully!`);
        setShowBlockUserModal(false);
        setBlockUserForm({ userId: '', blockType: 'TEMPORARY', durationMinutes: 120, reason: '' });
        fetchRules();
      } else {
        triggerToast(res?.message || 'Failed to block user.', 'error');
      }
    } catch (err) {
      triggerToast(err?.message || 'Failed to block user. Server returned an error.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handler: Block URLs
  const handleBlockUrlsSubmit = async (e) => {
    e.preventDefault();
    if (!blockUrlsForm.urls || blockUrlsForm.urls.length === 0) {
      triggerToast('Please select or add at least one URL to block.', 'error');
      return;
    }
    setSubmittingAction(true);
    const targetUserId = blockUrlsForm.userId?.trim() || 'ALL';
    try {
      const res = await securityService.blockUserUrls({
        userId: targetUserId,
        blockType: blockUrlsForm.blockType,
        durationMinutes: Number(blockUrlsForm.durationMinutes) || 120,
        reason: blockUrlsForm.reason.trim() || 'Temporary feature restriction',
        urls: blockUrlsForm.urls
      });

      if (res && (res.success || res.data)) {
        triggerToast(`Successfully blocked ${res.count || blockUrlsForm.urls.length} URL(s)!`);
        setShowBlockUrlsModal(false);
        setBlockUrlsForm({
          userId: 'ALL',
          blockType: 'TEMPORARY',
          durationMinutes: 120,
          reason: '',
          urls: ['/api/v1/hotels/book'],
          customUrlInput: ''
        });
        fetchRules();
      } else {
        triggerToast(res?.message || 'Failed to block URLs.', 'error');
      }
    } catch (err) {
      triggerToast(err?.message || 'Failed to block URLs.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handler: Unblock Rule
  const handleUnblockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRule) return;
    setSubmittingAction(true);
    try {
      const res = await securityService.unblockUserRule(selectedRule.id, { reason: unblockReason });
      if (res && (res.success || res.message)) {
        triggerToast(`Security Rule #${selectedRule.id} unblocked successfully!`);
        setShowUnblockModal(false);
        setSelectedRule(null);
        fetchRules();
      } else {
        triggerToast(res?.message || 'Failed to unblock rule.', 'error');
      }
    } catch (err) {
      triggerToast(err?.message || 'Failed to unblock rule.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handler: Extend Duration
  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRule) return;
    setSubmittingAction(true);
    try {
      const res = await securityService.extendUserRule(selectedRule.id, {
        newDurationMinutes: Number(extendDurationMinutes) || 240,
        reason: extendReason
      });
      if (res && (res.success || res.data)) {
        triggerToast(`Security Rule #${selectedRule.id} duration extended to ${extendDurationMinutes} mins!`);
        setShowExtendModal(false);
        setSelectedRule(null);
        fetchRules();
      } else {
        triggerToast(res?.message || 'Failed to extend rule duration.', 'error');
      }
    } catch (err) {
      triggerToast(err?.message || 'Failed to extend rule duration.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handler: Delete Rule
  const handleDeleteSubmit = async () => {
    if (!selectedRule) return;
    setSubmittingAction(true);
    try {
      const res = await securityService.deleteUserRule(selectedRule.id);
      if (res && (res.success || res.message)) {
        triggerToast(`Rule #${selectedRule.id} deleted permanently.`);
        setShowDeleteModal(false);
        setSelectedRule(null);
        fetchRules();
      } else {
        triggerToast(res?.message || 'Failed to delete rule.', 'error');
      }
    } catch (err) {
      triggerToast(err?.message || 'Failed to delete rule.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // URL selection helper for Block URLs Modal
  const toggleUrlSelection = (url) => {
    setBlockUrlsForm(prev => {
      const exists = prev.urls.includes(url);
      const updated = exists ? prev.urls.filter(u => u !== url) : [...prev.urls, url];
      return { ...prev, urls: updated };
    });
  };

  const addCustomUrl = () => {
    const custom = blockUrlsForm.customUrlInput.trim();
    if (!custom) return;
    if (!blockUrlsForm.urls.includes(custom)) {
      setBlockUrlsForm(prev => ({
        ...prev,
        urls: [...prev.urls, custom],
        customUrlInput: ''
      }));
    } else {
      setBlockUrlsForm(prev => ({ ...prev, customUrlInput: '' }));
    }
  };

  // Metrics summary calculation
  const totalCount = rules.length;
  const activeUserBlocks = rules.filter(r => r.ruleType === 'USER' && (r.status || 'ACTIVE') === 'ACTIVE').length;
  const activeUrlBlocks = rules.filter(r => r.ruleType === 'URL' && (r.status || 'ACTIVE') === 'ACTIVE').length;
  const inactiveCount = rules.filter(r => (r.status || 'ACTIVE') !== 'ACTIVE').length;

  return (
    <div className="security-mgmt-container usr-page-container">
      {/* Toast Banner */}
      {toastMessage && (
        <div className={`usr-toast usr-toast-${toastMessage.type}`}>
          <span>{toastMessage.type === 'error' ? '⚠️' : '✅'} {toastMessage.text}</span>
          <button className="usr-toast-close" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="sd-header">
        <div>
          <h1 className="sd-title">User Security Rules</h1>
        </div>

        <div className="usr-header-actions">
          <button className="sd-btn-primary usr-btn-user-block" onClick={() => setShowBlockUserModal(true)}>
            🚫 Block Entire User ID
          </button>
          <button className="sd-btn-secondary usr-btn-url-block" onClick={() => setShowBlockUrlsModal(true)}>
            🔗 Block Specific URLs
          </button>
          <button className="sd-btn-icon" onClick={fetchRules} title="Refresh Rules">
            🔄
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="sd-kpi-grid">
        <div className="sd-kpi-card purple">
          <div className="sd-kpi-header">
            <span className="sd-kpi-title">Total Security Rules</span>
            <span className="sd-kpi-icon">🛡️</span>
          </div>
          <div className="sd-kpi-value">{totalCount}</div>
          <span className="sd-kpi-desc">Configured across all users</span>
        </div>

        <div className="sd-kpi-card red">
          <div className="sd-kpi-header">
            <span className="sd-kpi-title">Active Full User Blocks</span>
            <span className="sd-kpi-icon">🚫</span>
          </div>
          <div className="sd-kpi-value">{activeUserBlocks}</div>
          <span className="sd-kpi-desc">Full API & Session access restricted</span>
        </div>

        <div className="sd-kpi-card orange">
          <div className="sd-kpi-header">
            <span className="sd-kpi-title">Active URL Route Restrictions</span>
            <span className="sd-kpi-icon">🌐</span>
          </div>
          <div className="sd-kpi-value">{activeUrlBlocks}</div>
          <span className="sd-kpi-desc">Targeted endpoint blocks active</span>
        </div>

        <div className="sd-kpi-card green">
          <div className="sd-kpi-header">
            <span className="sd-kpi-title">Unblocked / Expired Rules</span>
            <span className="sd-kpi-icon">🔓</span>
          </div>
          <div className="sd-kpi-value">{inactiveCount}</div>
          <span className="sd-kpi-desc">Historic or unblocked rules</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="usr-filter-card">
        <div className="usr-filter-group">
          <div className="usr-search-box">
            <span className="usr-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="usr-input-text"
            />
          </div>

          <div className="usr-select-group">
            <label>Rule Type:</label>
            <select value={filterRuleType} onChange={(e) => setFilterRuleType(e.target.value)} className="usr-select">
              <option value="ALL">All Types</option>
              <option value="USER">USER (Full User Block)</option>
              <option value="URL">URL (Route Block)</option>
            </select>
          </div>

          <div className="usr-select-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="usr-select">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="UNBLOCKED">UNBLOCKED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unified Attached Table & Pagination Box */}
      <div className="sec-attached-table-box">
        {errorMsg && (
          <div className="usr-error-banner" style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid #fecaca' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="usr-loading-state" style={{ padding: '32px', textAlign: 'center' }}>
            <div className="usr-spinner"></div>
            <p>Loading security rules from backend API...</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="sd-mini-table usr-table">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>User ID</th>
                    <th>Rule Type</th>
                    <th>Target Scope / Route</th>
                    <th>Block Type</th>
                    <th>Duration & Expiry</th>
                    <th>Status</th>
                    <th>Reason & Admin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                        No security rules matching current filters.
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => {
                      const isUserType = rule.ruleType === 'USER';
                      const isActive = (rule.status || 'ACTIVE') === 'ACTIVE';
                      const isExpired = (rule.status || '') === 'EXPIRED';

                      return (
                        <tr key={rule.id} className={!isActive ? 'usr-row-inactive' : ''}>
                          <td className="usr-td-id">#{rule.id}</td>
                          <td className="usr-td-user">
                            <strong>{rule.userId}</strong>
                          </td>
                          <td>
                            <span className={`usr-badge-rule-type ${isUserType ? 'type-user' : 'type-url'}`}>
                              {isUserType ? '👤 USER BLOCK' : '🌐 URL BLOCK'}
                            </span>
                          </td>
                          <td className="usr-td-route">
                            {isUserType ? (
                              <span className="usr-all-routes-tag">🔒 All Endpoints & Session</span>
                            ) : (
                              <code className="usr-url-code">{rule.route || '/api/v1/*'}</code>
                            )}
                          </td>
                          <td>
                            <span className={`usr-badge-scope ${rule.blockType === 'PERMANENT' ? 'scope-perm' : 'scope-temp'}`}>
                              {rule.blockType === 'PERMANENT' ? 'Permanent' : `${rule.durationMinutes || 120} mins`}
                            </span>
                          </td>
                          <td className="usr-td-time">
                            {rule.blockType === 'PERMANENT' ? (
                              <span className="usr-perm-text">Never Expires</span>
                            ) : (
                              <>
                                <div><strong>Start:</strong> {rule.startTime ? new Date(rule.startTime).toLocaleString() : 'N/A'}</div>
                                <div><strong>Expires:</strong> {rule.expiryTime ? new Date(rule.expiryTime).toLocaleString() : 'N/A'}</div>
                              </>
                            )}
                          </td>
                          <td>
                            <span className={`usr-status-badge ${isActive ? 'st-active' : isExpired ? 'st-expired' : 'st-unblocked'}`}>
                              {isActive ? '● ACTIVE' : isExpired ? '○ EXPIRED' : '✓ UNBLOCKED'}
                            </span>
                          </td>
                          <td className="usr-td-reason">
                            <div className="usr-reason-text">{rule.reason || 'No reason specified'}</div>
                            <div className="usr-created-by">By: {rule.createdBy || 'Admin'}</div>
                          </td>
                          <td>
                            <div className="usr-dropdown-wrapper">
                              <button
                                type="button"
                                className="usr-action-dropdown-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === rule.id ? null : rule.id);
                                }}
                              >
                                👁️ View ▾
                              </button>

                              {activeDropdownId === rule.id && (
                                <div className="usr-dropdown-menu">
                                  <button
                                    type="button"
                                    className="usr-dropdown-item"
                                    onClick={() => {
                                      setSelectedRule(rule);
                                      setShowViewModal(true);
                                      setActiveDropdownId(null);
                                    }}
                                  >
                                    👁️ View Details
                                  </button>

                                  {isActive && rule.blockType === 'TEMPORARY' && (
                                    <button
                                      type="button"
                                      className="usr-dropdown-item"
                                      onClick={() => {
                                        setSelectedRule(rule);
                                        setExtendDurationMinutes(240);
                                        setShowExtendModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      ✏️ Edit / Extend
                                    </button>
                                  )}

                                  {isActive && (
                                    <button
                                      type="button"
                                      className="usr-dropdown-item"
                                      onClick={() => {
                                        setSelectedRule(rule);
                                        setShowUnblockModal(true);
                                        setActiveDropdownId(null);
                                      }}
                                    >
                                      🔓 Unblock Rule
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="usr-dropdown-item danger"
                                    onClick={() => {
                                      setSelectedRule(rule);
                                      setShowDeleteModal(true);
                                      setActiveDropdownId(null);
                                    }}
                                  >
                                    🗑️ Delete Rule
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Attached Pagination Footer */}
            <div className="sec-pagination-attached-footer">
              <AdminPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(size) => setPageSize(size)}
                itemName="rules"
              />
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: Block Entire User ID */}
      {showBlockUserModal && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>🚫 Block Entire User ID</h3>
              <button className="usr-modal-close" onClick={() => setShowBlockUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleBlockUserSubmit}>
              <div className="usr-modal-body">
                <div className="usr-form-group">
                  <label className="usr-label">User ID <span className="req">*</span></label>
                  <input
                    type="text"
                    className="usr-input-text"
                    placeholder="e.g. 1001"
                    value={blockUserForm.userId}
                    onChange={(e) => setBlockUserForm({ ...blockUserForm, userId: e.target.value })}
                    required
                  />
                </div>

                <div className="usr-form-group">
                  <label className="usr-label">Block Type</label>
                  <select
                    className="usr-select"
                    value={blockUserForm.blockType}
                    onChange={(e) => setBlockUserForm({ ...blockUserForm, blockType: e.target.value })}
                  >
                    <option value="TEMPORARY">Temporary Block (Auto-Expires)</option>
                    <option value="PERMANENT">Permanent Block (Indefinite)</option>
                  </select>
                </div>

                {blockUserForm.blockType === 'TEMPORARY' && (
                  <div className="usr-form-group">
                    <label className="usr-label">Duration (Minutes)</label>
                    <div className="usr-preset-chips">
                      {[30, 60, 120, 240, 1440].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          className={`usr-chip ${blockUserForm.durationMinutes === mins ? 'active' : ''}`}
                          onClick={() => setBlockUserForm({ ...blockUserForm, durationMinutes: mins })}
                        >
                          {mins >= 1440 ? `${mins / 1440} Day` : `${mins} Mins`}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      className="usr-input-text"
                      min="1"
                      value={blockUserForm.durationMinutes}
                      onChange={(e) => setBlockUserForm({ ...blockUserForm, durationMinutes: e.target.value })}
                    />
                  </div>
                )}

                <div className="usr-form-group">
                  <label className="usr-label">Reason for Block</label>
                  <textarea
                    className="usr-textarea"
                    rows="3"
                    placeholder="Reason for blocking user (e.g. Repeated failed attempts, suspicious activity)..."
                    value={blockUserForm.reason}
                    onChange={(e) => setBlockUserForm({ ...blockUserForm, reason: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="usr-modal-footer">
                <button type="button" className="sd-btn-secondary" onClick={() => setShowBlockUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sd-btn-primary usr-btn-user-block" disabled={submittingAction}>
                  {submittingAction ? 'Processing...' : 'Confirm Block User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Block Multiple Target URLs */}
      {showBlockUrlsModal && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card wide">
            <div className="usr-modal-header">
              <h3>🔗 Block Specific Target URLs</h3>
              <button className="usr-modal-close" onClick={() => setShowBlockUrlsModal(false)}>×</button>
            </div>
            <form onSubmit={handleBlockUrlsSubmit}>
              <div className="usr-modal-body">

                {/* Block Type on One Line */}
                <div className="usr-form-group" style={{ marginBottom: '16px' }}>
                  <label className="usr-label">Block Type</label>
                  <select
                    className="usr-select"
                    style={{ width: '100%' }}
                    value={blockUrlsForm.blockType}
                    onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, blockType: e.target.value })}
                  >
                    <option value="TEMPORARY">Temporary Restriction</option>
                    <option value="PERMANENT">Permanent Restriction</option>
                  </select>
                </div>

                {/* Duration / Timer on One Line */}
                {blockUrlsForm.blockType === 'TEMPORARY' && (
                  <div className="usr-form-group" style={{ marginBottom: '18px' }}>
                    <label className="usr-label">Duration (Timer)</label>
                    <div className="usr-preset-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[30, 60, 120, 240, 1440].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          className={`usr-chip ${blockUrlsForm.durationMinutes === mins ? 'active' : ''}`}
                          onClick={() => setBlockUrlsForm({ ...blockUrlsForm, durationMinutes: mins })}
                          style={{ flex: 1, minWidth: '75px', textAlign: 'center', justifyContent: 'center' }}
                        >
                          {mins >= 1440 ? `${mins / 1440} Day` : `${mins} Mins`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom URL Path */}
                <div className="usr-form-group">
                  <label className="usr-label">Target URL Path to Block</label>
                  <div className="usr-add-url-row">
                    <input
                      type="text"
                      className="usr-input-text"
                      placeholder="e.g. /api/v1/hotels/cancel"
                      value={blockUrlsForm.customUrlInput}
                      onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, customUrlInput: e.target.value })}
                    />
                    <button type="button" className="usr-btn-add-custom" onClick={addCustomUrl}>
                      + Add URL
                    </button>
                  </div>
                </div>

                {/* Selected Target URLs List with Remove Option */}
                {blockUrlsForm.urls.length > 0 && (
                  <div className="usr-selected-urls-container" style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="usr-label" style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>
                        Selected Target URLs ({blockUrlsForm.urls.length}):
                      </label>
                      <button
                        type="button"
                        onClick={() => setBlockUrlsForm(prev => ({ ...prev, urls: [] }))}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="usr-selected-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {blockUrlsForm.urls.map(url => {
                        const matchedItem = POPULAR_RESTRICTABLE_URLS.find(p => p.url === url);
                        const displayLabel = matchedItem ? matchedItem.label : url;
                        return (
                          <span key={url} className="usr-tag-item" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span>{displayLabel}</span>
                            <button
                              type="button"
                              onClick={() => toggleUrlSelection(url)}
                              style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="usr-form-group" style={{ marginTop: '15px' }}>
                  <label className="usr-label">Reason</label>
                  <textarea
                    className="usr-textarea"
                    rows="2"
                    placeholder="Reason for URL feature restriction..."
                    value={blockUrlsForm.reason}
                    onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, reason: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="usr-modal-footer">
                <button type="button" className="usr-btn-cancel-orange" onClick={() => setShowBlockUrlsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sd-btn-primary usr-btn-url-block" disabled={submittingAction}>
                  {submittingAction ? 'Applying...' : `Block Selected URLs (${blockUrlsForm.urls.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Unblock Security Rule */}
      {showUnblockModal && selectedRule && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>🔓 Unblock Security Rule #{selectedRule.id}</h3>
              <button className="usr-modal-close" onClick={() => setShowUnblockModal(false)}>×</button>
            </div>
            <form onSubmit={handleUnblockSubmit}>
              <div className="usr-modal-body">
                <p>Are you sure you want to unblock rule <strong>#{selectedRule.id}</strong> for User ID <strong>{selectedRule.userId}</strong>?</p>
                <div className="usr-rule-summary-box">
                  <div><strong>Type:</strong> {selectedRule.ruleType}</div>
                  <div><strong>Target:</strong> {selectedRule.route || 'All Endpoints'}</div>
                  <div><strong>Original Reason:</strong> {selectedRule.reason}</div>
                </div>

                <div className="usr-form-group">
                  <label className="usr-label">Unblock Note / Reason</label>
                  <textarea
                    className="usr-textarea"
                    rows="3"
                    value={unblockReason}
                    onChange={(e) => setUnblockReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="usr-modal-footer">
                <button type="button" className="sd-btn-secondary" onClick={() => setShowUnblockModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sd-btn-primary" disabled={submittingAction}>
                  {submittingAction ? 'Unblocking...' : 'Confirm Unblock'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Extend Security Rule */}
      {showExtendModal && selectedRule && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>⏳ Extend Duration for Rule #{selectedRule.id}</h3>
              <button className="usr-modal-close" onClick={() => setShowExtendModal(false)}>×</button>
            </div>
            <form onSubmit={handleExtendSubmit}>
              <div className="usr-modal-body">
                <p>Extend block duration for User ID <strong>{selectedRule.userId}</strong>.</p>

                <div className="usr-form-group">
                  <label className="usr-label">New Duration (Minutes)</label>
                  <div className="usr-preset-chips">
                    {[60, 120, 240, 480, 1440].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        className={`usr-chip ${extendDurationMinutes === mins ? 'active' : ''}`}
                        onClick={() => setExtendDurationMinutes(mins)}
                      >
                        {mins >= 1440 ? `${mins / 1440} Day` : `${mins} Mins`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    className="usr-input-text"
                    min="1"
                    value={extendDurationMinutes}
                    onChange={(e) => setExtendDurationMinutes(e.target.value)}
                  />
                </div>

                <div className="usr-form-group">
                  <label className="usr-label">Reason for Extension</label>
                  <textarea
                    className="usr-textarea"
                    rows="3"
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="usr-modal-footer">
                <button type="button" className="sd-btn-secondary" onClick={() => setShowExtendModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sd-btn-primary" disabled={submittingAction}>
                  {submittingAction ? 'Updating...' : 'Extend Duration'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: Delete Rule Confirmation */}
      {showDeleteModal && selectedRule && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>🗑️ Confirm Delete Security Rule</h3>
              <button className="usr-modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="usr-modal-body">
              <p>Are you sure you want to permanently delete Rule <strong>#{selectedRule.id}</strong> (User ID: {selectedRule.userId})?</p>
              <p className="usr-warning-text">⚠️ This action cannot be undone.</p>
            </div>
            <div className="usr-modal-footer">
              <button type="button" className="sd-btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="usr-btn-danger" onClick={handleDeleteSubmit} disabled={submittingAction}>
                {submittingAction ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 6: View Security Rule Details */}
      {showViewModal && selectedRule && createPortal(
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>👁️ Security Rule Details #{selectedRule.id}</h3>
              <button className="usr-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-rule-summary-box" style={{ gap: '10px', fontSize: '0.9rem' }}>
                <div><strong>Rule ID:</strong> #{selectedRule.id}</div>
                <div><strong>User ID:</strong> {selectedRule.userId}</div>
                <div><strong>Rule Type:</strong> {selectedRule.ruleType === 'USER' ? '👤 Full User Block' : '🌐 URL Route Block'}</div>
                <div><strong>Target Route:</strong> <code>{selectedRule.route || 'All Endpoints & Session'}</code></div>
                <div><strong>Block Type:</strong> {selectedRule.blockType}</div>
                <div><strong>Duration:</strong> {selectedRule.durationMinutes ? `${selectedRule.durationMinutes} Minutes` : 'N/A'}</div>
                <div><strong>Status:</strong> {selectedRule.status}</div>
                <div><strong>Start Time:</strong> {selectedRule.startTime ? new Date(selectedRule.startTime).toLocaleString() : 'N/A'}</div>
                <div><strong>Expiry Time:</strong> {selectedRule.expiryTime ? new Date(selectedRule.expiryTime).toLocaleString() : 'Never'}</div>
                <div><strong>Reason:</strong> {selectedRule.reason || 'No reason specified'}</div>
                <div><strong>Created By:</strong> {selectedRule.createdBy || 'Admin'}</div>
              </div>
            </div>
            <div className="usr-modal-footer">
              <button type="button" className="sd-btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
