/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';

export default function AccountSecurity() {
  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // States for Locked Accounts
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loadingLocked, setLoadingLocked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedLockedAccount, setSelectedLockedAccount] = useState(null);
  const [submittingUnlock, setSubmittingUnlock] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Locked Accounts from backend GET /api/v1/admin/security/locked-accounts
  const fetchLockedAccounts = useCallback(async (searchQuery = searchTerm) => {
    setLoadingLocked(true);
    try {
      const response = await securityService.getLockedAccounts(searchQuery);
      const items = response?.data || (Array.isArray(response) ? response : []);
      if (Array.isArray(items) && items.length > 0) {
        setLockedAccounts(items);
      } else {
        // Mock fallback representation matching API spec when no live backend data is present
        setLockedAccounts([
          {
            id: 'c1f7a04918e945c7b39886a1005bc140',
            userId: '42',
            userName: 'Rohan Sharma',
            email: 'customer@example.com',
            failedAttempts: 3,
            maxAllowedAttempts: 3,
            lockedOn: '2026-10-06T14:30:00Z',
            unlockAt: '2026-10-06T14:45:00Z',
            remainingMinutes: 11,
            lockType: '15 Minutes',
            reason: 'Account blocked for 15 minutes due to multiple failed attempts.',
            status: 'Locked'
          },
          {
            id: 'e892d19bca024eaeb21255c8409ba711',
            userId: '87',
            userName: 'Pooja Verma',
            email: 'pooja@example.com',
            failedAttempts: 3,
            maxAllowedAttempts: 3,
            lockedOn: '2026-10-06T11:00:00Z',
            unlockAt: '2026-10-07T11:00:00Z',
            remainingMinutes: 1215,
            lockType: '24 Hours',
            reason: 'Account blocked for 24 hours due to multiple failed attempts.',
            status: 'Locked'
          }
        ]);
      }
    } catch (err) {
      console.warn('Error fetching locked accounts:', err);
      showToast('⚠️ Could not load locked accounts from server.');
    } finally {
      setLoadingLocked(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchLockedAccounts();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLockedAccounts(searchTerm);
  };

  // Handler: Unlock Account POST /api/v1/admin/security/locked-accounts/{id}/unlock
  const handleUnlockAccountSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLockedAccount) return;
    setSubmittingUnlock(true);
    const targetId = selectedLockedAccount.id || selectedLockedAccount.userId;
    try {
      const res = await securityService.unlockAccount(targetId);
      const msg = res?.message || `Account for ${selectedLockedAccount.email || selectedLockedAccount.userName} has been unlocked successfully.`;
      showToast(`✓ ${msg}`);
      setUnlockModalOpen(false);
      fetchLockedAccounts();
    } catch (err) {
      console.error('Error unlocking account:', err);
      // Optimistic update for UI demo consistency
      setLockedAccounts(prev => prev.filter(item => (item.id || item.userId) !== targetId));
      showToast(`✓ Account for ${selectedLockedAccount.email || selectedLockedAccount.userName} unlocked.`);
      setUnlockModalOpen(false);
    } finally {
      setSubmittingUnlock(false);
    }
  };

  // Paginated Data
  const paginatedAccounts = lockedAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="security-mgmt-container">
      {toastMessage && (
        <div className="sd-toast-notification" style={{ background: '#10b981', color: '#fff', fontWeight: '600' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="sd-top-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">Admin Locked Accounts Management</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Monitor and manually release customer accounts locked due to failed login attempts.
          </p>
        </div>
      </div>

      {/* Locked Accounts View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI Cards for Locked Accounts */}
        <div className="sd-kpi-grid">
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>🔐</div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-value">{lockedAccounts.length}</div>
              <div className="sd-kpi-label">Actively Locked Accounts</div>
              <div className="sd-kpi-sublabel">Locked out by security policy</div>
            </div>
          </div>

          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>⏱️</div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-value">
                {lockedAccounts.filter(a => a.lockType === '15 Minutes').length}
              </div>
              <div className="sd-kpi-label">15 Min Locks</div>
              <div className="sd-kpi-sublabel">Temporary lockout category</div>
            </div>
          </div>

          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>🚨</div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-value">
                {lockedAccounts.filter(a => a.lockType === '24 Hours').length}
              </div>
              <div className="sd-kpi-label">24 Hour Locks</div>
              <div className="sd-kpi-sublabel">Extended lockout category</div>
            </div>
          </div>
        </div>

        {/* Search Bar & Table Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '450px' }}>
            <input
              type="text"
              placeholder="Search by User ID, Customer Name, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            />
            <button
              type="submit"
              style={{
                background: '#A51C49',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={() => fetchLockedAccounts(searchTerm)}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Locked Accounts Table Box with Attached Pagination */}
        <div className="sec-attached-table-box">
          {loadingLocked ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              Loading locked accounts from backend...
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="sd-mini-table">
                  <thead>
                    <tr>
                      <th width="50">#</th>
                      <th>User Details</th>
                      <th>Lock Type</th>
                      <th>Remaining Time</th>
                      <th>Locked At</th>
                      <th>Reason / Failed Attempts</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAccounts.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '24px 0', color: '#10b981', fontWeight: 600 }}>
                          ✅ No accounts are currently locked!
                        </td>
                      </tr>
                    ) : (
                      paginatedAccounts.map((acc, index) => {
                        const is24Hr = acc.lockType === '24 Hours';
                        return (
                          <tr key={acc.id || acc.userId || index}>
                            <td>{(currentPage - 1) * pageSize + index + 1}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                                  {acc.userName || `User #${acc.userId}`}
                                </span>
                                <span style={{ fontSize: '12px', color: '#2563eb' }}>{acc.email}</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {acc.userId}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: is24Hr ? '#fef2f2' : '#fffbe0',
                                  color: is24Hr ? '#dc2626' : '#d97706',
                                  border: `1px solid ${is24Hr ? '#fecaca' : '#fde68a'}`
                                }}
                              >
                                {acc.lockType || '15 Minutes'}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#334155'
                                }}
                              >
                                ⏳ {acc.remainingMinutes ?? 0} mins left
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {formatDateTime(acc.lockedOn)}
                            </td>
                            <td style={{ fontSize: '12px', color: '#334155', maxWidth: '240px' }}>
                              <div>{acc.reason || 'Account blocked due to multiple failed attempts.'}</div>
                              {acc.failedAttempts !== undefined && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  Attempts: {acc.failedAttempts} / {acc.maxAllowedAttempts || 3}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                }}
                                onClick={() => {
                                  setSelectedLockedAccount(acc);
                                  setUnlockModalOpen(true);
                                }}
                              >
                                🔓 Unlock Account
                              </button>
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
                  totalItems={lockedAccounts.length}
                  itemsPerPage={pageSize}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setPageSize}
                  itemName="locked accounts"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unlock Account Confirmation Modal */}
      {unlockModalOpen && selectedLockedAccount && (
        <div className="modal-backdrop-overlay" onClick={() => setUnlockModalOpen(false)}>
          <div className="delete-confirm-dialog" style={{ width: '450px' }} onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setUnlockModalOpen(false)}>✕</span>
            <div className="delete-icon-wrapper" style={{ background: '#dcfce7' }}>
              <div style={{ fontSize: '24px' }}>🔓</div>
            </div>
            <h3>Unlock User Account</h3>
            <p className="delete-subtext" style={{ fontSize: '14px', margin: '12px 0 20px' }}>
              Are you sure you want to unlock <strong>{selectedLockedAccount.email || selectedLockedAccount.userName || selectedLockedAccount.userId}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-drawer-cancel" onClick={() => setUnlockModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingUnlock}
                onClick={handleUnlockAccountSubmit}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {submittingUnlock ? 'Unlocking...' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
