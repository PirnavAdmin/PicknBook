/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedRule, setSelectedRule] = useState(null);

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
        ruleType: filterRuleType === 'ALL' ? '' : filterRuleType
      });

      if (response && response.success && Array.isArray(response.data)) {
        let fetchedData = response.data;
        // Filter locally if status filter selected
        if (filterStatus !== 'ALL') {
          fetchedData = fetchedData.filter(r => (r.status || 'ACTIVE').toUpperCase() === filterStatus);
        }
        setRules(fetchedData.length > 0 ? fetchedData : MOCK_FALLBACK_RULES);
        setTotalItems(response.pagination?.total || fetchedData.length || MOCK_FALLBACK_RULES.length);
      } else {
        // Fallback to mock data for presentation
        let filteredMock = MOCK_FALLBACK_RULES;
        if (searchUserId.trim()) {
          filteredMock = filteredMock.filter(r => r.userId.includes(searchUserId.trim()));
        }
        if (filterRuleType !== 'ALL') {
          filteredMock = filteredMock.filter(r => r.ruleType === filterRuleType);
        }
        if (filterStatus !== 'ALL') {
          filteredMock = filteredMock.filter(r => r.status === filterStatus);
        }
        setRules(filteredMock);
        setTotalItems(filteredMock.length);
      }
    } catch (err) {
      console.error('Error fetching user security rules:', err);
      setErrorMsg(err.message || 'Failed to load user security rules from API.');
      setRules(MOCK_FALLBACK_RULES);
      setTotalItems(MOCK_FALLBACK_RULES.length);
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
    if (!blockUrlsForm.userId.trim()) {
      triggerToast('Please enter a valid User ID.', 'error');
      return;
    }
    if (!blockUrlsForm.urls || blockUrlsForm.urls.length === 0) {
      triggerToast('Please select or add at least one URL to block.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await securityService.blockUserUrls({
        userId: blockUrlsForm.userId.trim(),
        blockType: blockUrlsForm.blockType,
        durationMinutes: Number(blockUrlsForm.durationMinutes) || 120,
        reason: blockUrlsForm.reason.trim() || 'Temporary feature restriction',
        urls: blockUrlsForm.urls
      });

      if (res && (res.success || res.data)) {
        triggerToast(`Successfully blocked ${res.count || blockUrlsForm.urls.length} URL(s) for User ID ${blockUrlsForm.userId}!`);
        setShowBlockUrlsModal(false);
        setBlockUrlsForm({
          userId: '',
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

      {/* Header & Breadcrumb */}
      <div className="sd-header">
        <div>
          <div className="sd-breadcrumb">
            <span className="crumb-link" onClick={() => navigate('/admin/security-management')}>Security Management</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">User Security Rules</span>
          </div>
          <h1 className="sd-title">User Security Rules</h1>
          <p className="sd-subtitle">
            Configure User ID restrictions, single/multi API route blocking, temporary vs permanent durations, and active security policies.
          </p>
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

        <button className="usr-reset-btn" onClick={() => { setSearchUserId(''); setFilterRuleType('ALL'); setFilterStatus('ALL'); }}>
          Clear Filters
        </button>
      </div>

      {/* Main Table Card */}
      <div className="sd-card usr-table-card">
        <div className="sd-card-header">
          <h2 className="sd-card-title">User Security Rules Registry</h2>
          <span className="usr-record-count">Showing {rules.length} entries</span>
        </div>

        {errorMsg && (
          <div className="usr-error-banner">
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="usr-loading-state">
            <div className="usr-spinner"></div>
            <p>Loading security rules from backend API...</p>
          </div>
        ) : (
          <div className="usr-table-wrapper">
            <table className="usr-table">
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="usr-empty-td">
                      No security rules matching current filters.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const isUserType = rule.ruleType === 'USER';
                    const isActive = (rule.status || 'ACTIVE') === 'ACTIVE';
                    const isExpired = (rule.status || '') === 'EXPIRED';
                    const isUnblocked = (rule.status || '') === 'UNBLOCKED';

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
                        <td style={{ textAlign: 'right' }}>
                          <div className="usr-action-btns">
                            {isActive && rule.blockType === 'TEMPORARY' && (
                              <button
                                className="usr-action-btn btn-extend"
                                title="Extend Duration"
                                onClick={() => {
                                  setSelectedRule(rule);
                                  setExtendDurationMinutes(240);
                                  setShowExtendModal(true);
                                }}
                              >
                                ⏳ Extend
                              </button>
                            )}

                            {isActive && (
                              <button
                                className="usr-action-btn btn-unblock"
                                title="Unblock Rule"
                                onClick={() => {
                                  setSelectedRule(rule);
                                  setShowUnblockModal(true);
                                }}
                              >
                                🔓 Unblock
                              </button>
                            )}

                            <button
                              className="usr-action-btn btn-delete"
                              title="Delete Rule Record"
                              onClick={() => {
                                setSelectedRule(rule);
                                setShowDeleteModal(true);
                              }}
                            >
                              🗑️
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
        )}

        {/* Pagination */}
        <div className="usr-pagination-footer">
          <AdminPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* MODAL 1: Block Entire User ID */}
      {showBlockUserModal && (
        <div className="usr-modal-overlay">
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <h3>🚫 Block Entire User ID</h3>
              <button className="usr-modal-close" onClick={() => setShowBlockUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleBlockUserSubmit}>
              <div className="usr-modal-body">
                <p className="usr-modal-desc">
                  This action will restrict <strong>ALL API access</strong> and terminate active sessions for the specified User ID.
                </p>

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
        </div>
      )}

      {/* MODAL 2: Block Multiple Target URLs */}
      {showBlockUrlsModal && (
        <div className="usr-modal-overlay">
          <div className="usr-modal-card wide">
            <div className="usr-modal-header">
              <h3>🔗 Block Specific Target URLs for User</h3>
              <button className="usr-modal-close" onClick={() => setShowBlockUrlsModal(false)}>×</button>
            </div>
            <form onSubmit={handleBlockUrlsSubmit}>
              <div className="usr-modal-body">
                <p className="usr-modal-desc">
                  Restrict access to specific booking or payment features for a User ID. The user remains logged in, but attempts to access these endpoints will return a <code>403 URL_BLOCKED</code> error toast.
                </p>

                <div className="usr-form-grid">
                  <div className="usr-form-group">
                    <label className="usr-label">Target User ID <span className="req">*</span></label>
                    <input
                      type="text"
                      className="usr-input-text"
                      placeholder="e.g. 1001"
                      value={blockUrlsForm.userId}
                      onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, userId: e.target.value })}
                      required
                    />
                  </div>

                  <div className="usr-form-group">
                    <label className="usr-label">Block Type</label>
                    <select
                      className="usr-select"
                      value={blockUrlsForm.blockType}
                      onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, blockType: e.target.value })}
                    >
                      <option value="TEMPORARY">Temporary Restriction</option>
                      <option value="PERMANENT">Permanent Restriction</option>
                    </select>
                  </div>
                </div>

                {blockUrlsForm.blockType === 'TEMPORARY' && (
                  <div className="usr-form-group">
                    <label className="usr-label">Duration (Minutes)</label>
                    <div className="usr-preset-chips">
                      {[30, 60, 120, 240, 1440].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          className={`usr-chip ${blockUrlsForm.durationMinutes === mins ? 'active' : ''}`}
                          onClick={() => setBlockUrlsForm({ ...blockUrlsForm, durationMinutes: mins })}
                        >
                          {mins >= 1440 ? `${mins / 1440} Day` : `${mins} Mins`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="usr-form-group">
                  <label className="usr-label">Select Popular API Endpoints to Block</label>
                  <div className="usr-url-preset-list">
                    {POPULAR_RESTRICTABLE_URLS.map(item => {
                      const isSelected = blockUrlsForm.urls.includes(item.url);
                      return (
                        <div
                          key={item.url}
                          className={`usr-url-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleUrlSelection(item.url)}
                        >
                          <input type="checkbox" checked={isSelected} readOnly />
                          <span>{item.label}</span>
                          <code>{item.url}</code>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="usr-form-group">
                  <label className="usr-label">Add Custom URL Path</label>
                  <div className="usr-add-url-row">
                    <input
                      type="text"
                      className="usr-input-text"
                      placeholder="e.g. /api/v1/hotels/cancel"
                      value={blockUrlsForm.customUrlInput}
                      onChange={(e) => setBlockUrlsForm({ ...blockUrlsForm, customUrlInput: e.target.value })}
                    />
                    <button type="button" className="sd-btn-secondary" onClick={addCustomUrl}>
                      + Add URL
                    </button>
                  </div>
                </div>

                <div className="usr-selected-urls-container">
                  <label className="usr-label">Selected URLs ({blockUrlsForm.urls.length}):</label>
                  <div className="usr-selected-tags">
                    {blockUrlsForm.urls.map(url => (
                      <span key={url} className="usr-tag-item">
                        {url}
                        <button type="button" onClick={() => toggleUrlSelection(url)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

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
                <button type="button" className="sd-btn-secondary" onClick={() => setShowBlockUrlsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sd-btn-primary usr-btn-url-block" disabled={submittingAction}>
                  {submittingAction ? 'Applying...' : `Block Selected URLs (${blockUrlsForm.urls.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Unblock Security Rule */}
      {showUnblockModal && selectedRule && (
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
        </div>
      )}

      {/* MODAL 4: Extend Security Rule */}
      {showExtendModal && selectedRule && (
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
        </div>
      )}

      {/* MODAL 5: Delete Rule Confirmation */}
      {showDeleteModal && selectedRule && (
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
        </div>
      )}
    </div>
  );
}
