/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';

// Policy Types Legend Info
const POLICY_TYPES_LEGEND = [
  {
    key: 'Account Lock',
    label: 'Account Lock Policies',
    count: 2,
    desc: 'Manage account lockout rules and auto unlock settings.',
    icon: '🔒'
  },
  {
    key: 'Login Attempts',
    label: 'Login Attempt Policies',
    count: 2,
    desc: 'Control failed login attempts and restrictions.',
    icon: '🔑'
  },
  {
    key: 'Password',
    label: 'Password Policies',
    count: 2,
    desc: 'Manage password expiry, history and reset rules.',
    icon: '🔒'
  },
  {
    key: 'Account',
    label: 'Account Management Policies',
    count: 1,
    desc: 'Manage profile updates and account deactivation.',
    icon: '👤'
  },
  {
    key: 'Data Access',
    label: 'Data Access Policies',
    count: 1,
    desc: 'Control personal data access and verification.',
    icon: '🛡️'
  }
];

export default function AccountSecurity() {
  const navigate = useNavigate();

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // States
  const [policies, setPolicies] = useState([]);

  // Filters State
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAppliesTo, setFilterAppliesTo] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal / Drawer Drawers state
  const [activeDrawer, setActiveDrawer] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // Drawer Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Account Lock');
  const [formAppliesTo, setFormAppliesTo] = useState('Admin, User, B2B');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxAttempts, setFormMaxAttempts] = useState('5');
  const [formLockoutDuration, setFormLockoutDuration] = useState('15');
  const [formLockoutUnit, setFormLockoutUnit] = useState('Minutes');
  const [formAutoUnlock, setFormAutoUnlock] = useState('Yes');
  const [formNotifyUser, setFormNotifyUser] = useState('Yes');
  const [formLogEvents, setFormLogEvents] = useState(true);
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [formEnableCaptcha, setFormEnableCaptcha] = useState(false);
  const [formStatus, setFormStatus] = useState('Active');
  const [formEmailTemplate, setFormEmailTemplate] = useState('Account Locked Notification');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Drawer triggers
  const handleOpenAddDrawer = () => {
    setSelectedPolicy(null);
    setFormName('');
    setFormType('Account Lock');
    setFormAppliesTo('Admin, User, B2B');
    setFormDescription('');
    setFormMaxAttempts('5');
    setFormLockoutDuration('15');
    setFormLockoutUnit('Minutes');
    setFormAutoUnlock('Yes');
    setFormNotifyUser('Yes');
    setFormLogEvents(true);
    setFormSendEmail(true);
    setFormEnableCaptcha(false);
    setFormStatus('Active');
    setFormEmailTemplate('Account Locked Notification');
    setActiveDrawer('add');
  };

  const handleOpenEditDrawer = (p) => {
    setSelectedPolicy(p);
    setFormName(p.name);
    setFormType(p.type);
    setFormAppliesTo(p.appliesTo);
    setFormDescription(p.description || '');
    setFormMaxAttempts(String(p.maxAttempts || '5'));
    setFormLockoutDuration(String(p.lockoutDuration || '15'));
    setFormLockoutUnit(p.lockoutUnit || 'Minutes');
    setFormAutoUnlock(p.autoUnlock || 'Yes');
    setFormNotifyUser(p.notifyUser || 'Yes');
    setFormLogEvents(p.logEvents ?? true);
    setFormSendEmail(p.sendEmail ?? true);
    setFormEnableCaptcha(p.enableCaptcha ?? false);
    setFormStatus(p.status);
    setFormEmailTemplate(p.emailTemplate || 'Account Locked Notification');
    setActiveDrawer('edit');
  };

  const handleOpenViewDrawer = (p) => {
    setSelectedPolicy(p);
    setActiveDrawer('view');
  };

  const handleOpenDeleteModal = (p) => {
    setSelectedPolicy(p);
    setConfirmDeleteModal(true);
  };

  // Actions Submit
  const handleSavePolicy = (e) => {
    e.preventDefault();
    const newOrUpdated = {
      id: activeDrawer === 'edit' ? selectedPolicy.id : `acc-pol-${Date.now()}`,
      name: formName,
      type: formType,
      appliesTo: formAppliesTo,
      status: formStatus,
      createdOn: activeDrawer === 'edit' ? selectedPolicy.createdOn : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      createdBy: activeDrawer === 'edit' ? selectedPolicy.createdBy : 'admin',
      description: formDescription,
      maxAttempts: parseInt(formMaxAttempts) || 5,
      lockoutDuration: parseInt(formLockoutDuration) || 15,
      lockoutUnit: formLockoutUnit,
      autoUnlock: formAutoUnlock,
      notifyUser: formNotifyUser,
      logEvents: formLogEvents,
      sendEmail: formSendEmail,
      enableCaptcha: formEnableCaptcha,
      emailTemplate: formEmailTemplate
    };

    if (activeDrawer === 'add') {
      setPolicies([newOrUpdated, ...policies]);
      showToast('✓ Account Security Policy created successfully!');
    } else {
      setPolicies(policies.map(item => item.id === selectedPolicy.id ? newOrUpdated : item));
      showToast('✓ Account Security Policy updated successfully!');
    }
    setActiveDrawer(null);
  };

  const handleDeletePolicy = () => {
    setPolicies(policies.filter(item => item.id !== selectedPolicy.id));
    setConfirmDeleteModal(false);
    setSelectedPolicy(null);
    showToast('✓ Policy deleted successfully!');
  };

  // Filter application
  const filteredList = policies.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false;
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;
    if (filterAppliesTo !== 'All' && !p.appliesTo.includes(filterAppliesTo)) return false;
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !(p.description || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalCount = filteredList.length;
  const activeCount = filteredList.filter(r => r.status === 'Active').length;
  const inactiveCount = filteredList.filter(r => r.status === 'Inactive').length;
  const percentActive = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(0) : '0';
  const percentInactive = totalCount > 0 ? ((inactiveCount / totalCount) * 100).toFixed(0) : '0';

  // Pagination bounds
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="security-mgmt-container">
      {toastMessage && (
        <div className="sd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation / Breadcrumbs */}
      <div className="sd-top-header" style={{ marginBottom: '16px' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">Account Security</h1>
          <p className="sd-page-subtitle">Security Management &nbsp;/&nbsp; Account Security</p>
        </div>
        <div className="sd-header-right">
          <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={handleOpenAddDrawer}>
            <span>+ Add Policy</span>
          </button>
          <button className="sd-export-btn" onClick={() => showToast('📥 Exporting Account Security Policies list CSV...')}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Summary KPI Stats Grid */}
      <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>🔒</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{totalCount}</div>
            <div className="sd-kpi-label">Total Policies</div>
            <div className="sd-kpi-sublabel">All account security policies</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>🛡️</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{activeCount}</div>
            <div className="sd-kpi-label">Active Policies</div>
            <div className="sd-kpi-sublabel">{percentActive}% of total policies</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>⚠️</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{inactiveCount}</div>
            <div className="sd-kpi-label">Inactive Policies</div>
            <div className="sd-kpi-sublabel">{percentInactive}% of total policies</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#faf5ff', color: '#7e22ce' }}>👥</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">1,248</div>
            <div className="sd-kpi-label">Affected Users</div>
            <div className="sd-kpi-sublabel">Users impacted by policies</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="sd-panel sd-filters-panel" style={{ padding: '16px', marginBottom: '16px' }}>
          <div className="sd-filters-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="sd-filter-field">
              <label>Policy Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option>All</option>
                <option>Account Lock</option>
                <option>Login Attempts</option>
                <option>Password</option>
                <option>Account</option>
                <option>Data Access</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Applies To</label>
              <select value={filterAppliesTo} onChange={(e) => setFilterAppliesTo(e.target.value)}>
                <option>All</option>
                <option>Admin</option>
                <option>User</option>
                <option>B2B</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Search Query</label>
              <input type="text" placeholder="Search policy name..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>

            <div className="sd-filter-buttons" style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button className="sd-btn-reset" onClick={() => { setFilterType('All'); setFilterStatus('All'); setFilterAppliesTo('All'); setFilterSearch(''); }}>Reset</button>
              <button className="sd-btn-filter" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Table grid List */}
      <div className="sd-panel" style={{ padding: '16px' }}>
        <div className="sd-panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Account Security Policies <span className="sd-records-count">({totalCount} Records)</span></h3>
          <button
            className={`sd-filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>
        </div>

        <div className="sd-table-container">
          <table className="sd-mini-table">
            <thead>
              <tr>
                <th width="50">#</th>
                <th>Policy Name</th>
                <th>Policy Type</th>
                <th>Applies To</th>
                <th>Status</th>
                <th>Created On</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length > 0 ? (
                paginatedList.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span className={`badge-custom badge-action-${p.type === 'Account Lock' ? 'block' : 'none'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td>{p.appliesTo}</td>
                    <td>
                      <span className={`badge-custom badge-status-${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.createdOn}</td>
                    <td>{p.createdBy}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-act-icon" title="View Details" onClick={() => handleOpenViewDrawer(p)}>👁️</button>
                        <button className="btn-act-icon" title="Edit" onClick={() => handleOpenEditDrawer(p)}>📝</button>
                        <button className="btn-act-icon delete" title="Delete" onClick={() => handleOpenDeleteModal(p)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    🔒 No Account Security policies configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          itemName="Policies"
        />
      </div>

      {/* Legend Cards at the Bottom */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Policy Types</h3>
        <div className="sec-categories-row">
          {POLICY_TYPES_LEGEND.map((pt, i) => (
            <div className="sec-category-card" key={i}>
              <div className="sec-category-card-top">
                <span className="sec-category-icon">{pt.icon}</span>
                <span className="badge-custom sec-category-rules-badge">{pt.count} Policies</span>
              </div>
              <div className="sec-category-card-middle">
                <span className="sec-category-label">{pt.label}</span>
                <span className="sec-category-desc">{pt.desc}</span>
              </div>
              <span className="sec-category-view-link" onClick={() => { setFilterType(pt.key); setShowFilters(true); }}>View Policies →</span>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-In Drawer for Add & Edit */}
      {(activeDrawer === 'add' || activeDrawer === 'edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'add' ? 'Add Account Security Policy' : 'Edit Account Security Policy'}</h3>
                <p>Configure account lockout rules, login restriction thresholds, and verification options.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSavePolicy} className="sec-drawer-form">
              <div className="sec-drawer-body">
                {/* Policy Information */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Information</h4>
                  <div className="drawer-field">
                    <label>Policy Name <span className="req">*</span></label>
                    <input type="text" required placeholder="Enter policy name" value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </div>
                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>Policy Type <span className="req">*</span></label>
                      <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                        <option>Account Lock</option>
                        <option>Login Attempts</option>
                        <option>Password</option>
                        <option>Account</option>
                        <option>Data Access</option>
                        <option>Session Management</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Applies To <span className="req">*</span></label>
                      <select value={formAppliesTo} onChange={(e) => setFormAppliesTo(e.target.value)}>
                        <option>Admin, User, B2B</option>
                        <option>Admin, User</option>
                        <option>Admin</option>
                        <option>User</option>
                        <option>B2B</option>
                      </select>
                    </div>
                  </div>
                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Description</label>
                    <textarea rows="2" maxLength="250" placeholder="Enter policy description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                    <span className="char-counter">{formDescription.length}/250</span>
                  </div>
                </div>

                {/* Policy Configuration */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Configuration</h4>
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Max Failed Attempts <span className="req">*</span></label>
                      <input type="number" required value={formMaxAttempts} onChange={(e) => setFormMaxAttempts(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Lockout Duration <span className="req">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="number" required style={{ width: '70px' }} value={formLockoutDuration} onChange={(e) => setFormLockoutDuration(e.target.value)} />
                        <select value={formLockoutUnit} onChange={(e) => setFormLockoutUnit(e.target.value)} style={{ flex: 1 }}>
                          <option>Minutes</option>
                          <option>Hours</option>
                          <option>Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>Auto Unlock <span className="req">*</span></label>
                      <select value={formAutoUnlock} onChange={(e) => setFormAutoUnlock(e.target.value)}>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Notify User <span className="req">*</span></label>
                      <select value={formNotifyUser} onChange={(e) => setFormNotifyUser(e.target.value)}>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Settings */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Additional Settings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formLogEvents} onChange={(e) => setFormLogEvents(e.target.checked)} />
                      Log Security Events
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formSendEmail} onChange={(e) => setFormSendEmail(e.target.checked)} />
                      Send Email Notification
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formEnableCaptcha} onChange={(e) => setFormEnableCaptcha(e.target.checked)} />
                      Enable Captcha After Failed Attempts
                    </label>
                  </div>
                </div>

                {/* Status & Email Template */}
                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Status <span className="req">*</span></label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div className="drawer-field">
                    <label>Email Template</label>
                    <select value={formEmailTemplate} onChange={(e) => setFormEmailTemplate(e.target.value)}>
                      <option>Account Locked Notification</option>
                      <option>Admin Password Blocked</option>
                      <option>User Limit Exceeded</option>
                      <option>None</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sec-drawer-footer">
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>Cancel</button>
                  <button type="button" className="btn-drawer-draft" onClick={() => showToast('✓ Saved as Draft.')}>Save as Draft</button>
                  <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>
                    Save Policy
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-In View Details Sheet */}
      {activeDrawer === 'view' && selectedPolicy && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>Policy details</h3>
                <p>Detailed system parameters and validation configuration.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <div className="sec-drawer-body">
              <div className="view-details-list">
                <div className="view-details-item">
                  <span className="view-details-lbl">Policy Name</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold' }}>{selectedPolicy.name}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Policy Type</span>
                  <span className="view-details-val">{selectedPolicy.type}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Applies To</span>
                  <span className="view-details-val">{selectedPolicy.appliesTo}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Status</span>
                  <span className="view-details-val">
                    <span className={`badge-custom badge-status-${selectedPolicy.status.toLowerCase()}`}>
                      {selectedPolicy.status}
                    </span>
                  </span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Max Failed Attempts</span>
                  <span className="view-details-val">{selectedPolicy.maxAttempts}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Lockout Duration</span>
                  <span className="view-details-val">{selectedPolicy.lockoutDuration} {selectedPolicy.lockoutUnit}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Auto Unlock</span>
                  <span className="view-details-val">{selectedPolicy.autoUnlock}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Notify User</span>
                  <span className="view-details-val">{selectedPolicy.notifyUser}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Log Security Events</span>
                  <span className="view-details-val">{selectedPolicy.logEvents ? 'Yes' : 'No'}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Send Email</span>
                  <span className="view-details-val">{selectedPolicy.sendEmail ? 'Yes' : 'No'}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Email Template</span>
                  <span className="view-details-val">{selectedPolicy.emailTemplate}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Description</span>
                  <span className="view-details-val" style={{ whiteSpace: 'pre-wrap' }}>{selectedPolicy.description || '—'}</span>
                </div>
              </div>
            </div>
            <div className="sec-drawer-footer">
              <button className="btn-drawer-cancel" style={{ width: '100%' }} onClick={() => setActiveDrawer(null)}>Close Panel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal && selectedPolicy && (
        <div className="modal-backdrop-overlay" onClick={() => setConfirmDeleteModal(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setConfirmDeleteModal(false)}>✕</span>
            <div className="delete-icon-wrapper">
              <div className="delete-trash-circle">🗑️</div>
            </div>
            <h3>Delete Policy</h3>
            <p className="delete-subtext">Are you sure you want to delete this policy?</p>
            <div className="delete-rule-brief" style={{ marginBottom: '16px' }}>
              <div className="brief-row">
                <span className="brief-lbl">Policy Name:</span>
                <span className="brief-val">{selectedPolicy.name}</span>
              </div>
            </div>
            <div className="sd-error-banner" style={{ fontSize: '10px', padding: '6px 8px', marginBottom: '16px' }}>
              ⚠️ This action cannot be undone. All associated data will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-drawer-cancel" onClick={() => setConfirmDeleteModal(false)}>Cancel</button>
              <button className="btn-drawer-save" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeletePolicy}>
                Delete Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
