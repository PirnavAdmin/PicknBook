/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';

// API Groups Legend Info
const API_GROUPS_LEGEND = [
  {
    key: 'Public APIs',
    label: 'Public APIs',
    count: 24,
    desc: 'APIs available for public consumption.',
    icon: '🌐'
  },
  {
    key: 'Partner APIs',
    label: 'Partner APIs',
    count: 18,
    desc: 'APIs for partners and third-party integrations.',
    icon: '🤝'
  },
  {
    key: 'Internal APIs',
    label: 'Internal APIs',
    count: 16,
    desc: 'Internal system and microservice APIs.',
    icon: '🏢'
  },
  {
    key: 'Admin APIs',
    label: 'Admin APIs',
    count: 12,
    desc: 'Administrative and management APIs.',
    icon: '🛡️'
  },
  {
    key: 'Mobile APIs',
    label: 'Mobile APIs',
    count: 16,
    desc: 'APIs used by mobile applications.',
    icon: '📱'
  }
];

export default function ApiSecurity() {
  const navigate = useNavigate();

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // States
  const [policies, setPolicies] = useState([]);

  // Filters State
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAppliesTo, setFilterAppliesTo] = useState('All');
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Centered Modals States
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Rate Limiting');
  const [formAppliesTo, setFormAppliesTo] = useState('Admin, User, B2B');
  const [formApiGroup, setFormApiGroup] = useState('Public APIs');
  const [formDescription, setFormDescription] = useState('');
  
  const [formRateLimitEnabled, setFormRateLimitEnabled] = useState('Enable');
  const [formLimitValue, setFormLimitValue] = useState('100');
  const [formWindowValue, setFormWindowValue] = useState('1');
  const [formWindowUnit, setFormWindowUnit] = useState('Minutes');
  
  const [formPriority, setFormPriority] = useState('Medium');
  const [formViolationAction, setFormViolationAction] = useState('Block Request');
  
  const [formEnableLogging, setFormEnableLogging] = useState(true);
  const [formSendAlert, setFormSendAlert] = useState(true);
  const [formAllowWhitelist, setFormAllowWhitelist] = useState(false);
  const [formEnableCaptcha, setFormEnableCaptcha] = useState(false);
  const [formStatus, setFormStatus] = useState('Active');
  const [formEmailTemplate, setFormEmailTemplate] = useState('API Rate Limit Exceeded');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Centered Modals
  const handleOpenAddModal = () => {
    setSelectedPolicy(null);
    setFormName('');
    setFormType('Rate Limiting');
    setFormAppliesTo('Admin, User, B2B');
    setFormApiGroup('Public APIs');
    setFormDescription('');
    setFormRateLimitEnabled('Enable');
    setFormLimitValue('100');
    setFormWindowValue('1');
    setFormWindowUnit('Minutes');
    setFormPriority('Medium');
    setFormViolationAction('Block Request');
    setFormEnableLogging(true);
    setFormSendAlert(true);
    setFormAllowWhitelist(false);
    setFormEnableCaptcha(false);
    setFormStatus('Active');
    setFormEmailTemplate('API Rate Limit Exceeded');
    setActiveModal('add');
  };

  const handleOpenEditModal = (p) => {
    setSelectedPolicy(p);
    setFormName(p.name);
    setFormType(p.type);
    setFormAppliesTo(p.appliesTo);
    setFormApiGroup(p.apiGroup || 'Public APIs');
    setFormDescription(p.description || '');
    setFormRateLimitEnabled(p.rateLimitEnabled || 'Enable');
    setFormLimitValue(String(p.limitValue || '100'));
    setFormWindowValue(String(p.windowValue || '1'));
    setFormWindowUnit(p.windowUnit || 'Minutes');
    setFormPriority(p.priority || 'Medium');
    setFormViolationAction(p.violationAction || 'Block Request');
    setFormEnableLogging(p.enableLogging ?? true);
    setFormSendAlert(p.sendAlert ?? true);
    setFormAllowWhitelist(p.allowWhitelist ?? false);
    setFormEnableCaptcha(p.enableCaptcha ?? false);
    setFormStatus(p.status);
    setFormEmailTemplate(p.emailTemplate || 'API Rate Limit Exceeded');
    setActiveModal('edit');
  };

  const handleOpenViewModal = (p) => {
    setSelectedPolicy(p);
    setActiveModal('view');
  };

  const handleOpenDeleteModal = (p) => {
    setSelectedPolicy(p);
    setConfirmDeleteModal(true);
  };

  // Actions submit handlers
  const handleSavePolicy = (e) => {
    e.preventDefault();
    const rateLimitStr = formRateLimitEnabled === 'Enable' ? `${formLimitValue} / ${formWindowValue === '1' ? formWindowUnit.slice(0, -1).toLowerCase() : `${formWindowValue} ${formWindowUnit.toLowerCase()}`}` : '—';
    const newOrUpdated = {
      id: activeModal === 'edit' ? selectedPolicy.id : `api-pol-${Date.now()}`,
      name: formName,
      type: formType,
      appliesTo: formAppliesTo,
      apiGroup: formApiGroup,
      rateLimit: rateLimitStr,
      status: formStatus,
      createdOn: activeModal === 'edit' ? selectedPolicy.createdOn : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      createdBy: activeModal === 'edit' ? selectedPolicy.createdBy : 'admin',
      description: formDescription,
      rateLimitEnabled: formRateLimitEnabled,
      limitValue: parseInt(formLimitValue) || 100,
      windowValue: parseInt(formWindowValue) || 1,
      windowUnit: formWindowUnit,
      priority: formPriority,
      violationAction: formViolationAction,
      enableLogging: formEnableLogging,
      sendAlert: formSendAlert,
      allowWhitelist: formAllowWhitelist,
      enableCaptcha: formEnableCaptcha,
      emailTemplate: formEmailTemplate
    };

    if (activeModal === 'add') {
      setPolicies([newOrUpdated, ...policies]);
      showToast('✓ API Security Policy created successfully!');
    } else {
      setPolicies(policies.map(item => item.id === selectedPolicy.id ? newOrUpdated : item));
      showToast('✓ API Security Policy updated successfully!');
    }
    setActiveModal(null);
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
    if (filterGroup !== 'All' && p.apiGroup !== filterGroup) return false;
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

      {/* Top Header / Title & Actions */}
      <div className="sd-top-header" style={{ marginBottom: '16px' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">API Security</h1>
          <p className="sd-page-subtitle">Security Management &nbsp;/&nbsp; API Security</p>
        </div>
        <div className="sd-header-right">
          <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={handleOpenAddModal}>
            <span>+ Add Policy</span>
          </button>
          <button className="sd-export-btn" onClick={() => showToast('📥 Exporting API Security Policies list CSV...')}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Summary KPI Stats Grid */}
      <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>🛡️</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{totalCount}</div>
            <div className="sd-kpi-label">Total API Policies</div>
            <div className="sd-kpi-sublabel">All API security policies</div>
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
          <div className="sd-kpi-icon-box" style={{ background: '#faf5ff', color: '#7e22ce' }}>⚙️</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">86</div>
            <div className="sd-kpi-label">Protected APIs</div>
            <div className="sd-kpi-sublabel">APIs under protection</div>
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
                <option>Rate Limiting</option>
                <option>Authentication</option>
                <option>Access Control</option>
                <option>Request Validation</option>
                <option>Threat Protection</option>
                <option>Data Protection</option>
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
                <option>Partner</option>
                <option>All Users</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>API Group</label>
              <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                <option>All</option>
                <option>Public APIs</option>
                <option>Partner APIs</option>
                <option>Internal APIs</option>
                <option>Admin APIs</option>
                <option>Mobile APIs</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Search Query</label>
              <input type="text" placeholder="Search policy name..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>

            <div className="sd-filter-buttons" style={{ display: 'flex', gap: '8px', gridColumn: 'span 5', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="sd-btn-reset" onClick={() => { setFilterType('All'); setFilterStatus('All'); setFilterAppliesTo('All'); setFilterGroup('All'); setFilterSearch(''); }}>Reset</button>
              <button className="sd-btn-filter" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid list policies table panel */}
      <div className="sd-panel" style={{ padding: '16px' }}>
        <div className="sd-panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>API Security Policies <span className="sd-records-count">({totalCount} Records)</span></h3>
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
                <th>API Group</th>
                <th>Rate Limit</th>
                <th>Status</th>
                <th>Created On</th>
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
                      <span className={`badge-custom badge-action-${p.type === 'Rate Limiting' ? 'block' : 'none'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td>{p.appliesTo}</td>
                    <td>{p.apiGroup}</td>
                    <td style={{ fontWeight: 700 }}>{p.rateLimit}</td>
                    <td>
                      <span className={`badge-custom badge-status-${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.createdOn}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-act-icon" title="View Details" onClick={() => handleOpenViewModal(p)}>👁️</button>
                        <button className="btn-act-icon" title="Edit" onClick={() => handleOpenEditModal(p)}>📝</button>
                        <button className="btn-act-icon delete" title="Delete" onClick={() => handleOpenDeleteModal(p)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    🛡️ No API Security policies configured.
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

      {/* Legend cards at bottom representing API Groups */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>API Groups</h3>
        <div className="sec-categories-row">
          {API_GROUPS_LEGEND.map((pt, i) => (
            <div className="sec-category-card" key={i}>
              <div className="sec-category-card-top">
                <span className="sec-category-icon">{pt.icon}</span>
                <span className="badge-custom sec-category-rules-badge">{pt.count} APIs</span>
              </div>
              <div className="sec-category-card-middle">
                <span className="sec-category-label">{pt.label}</span>
                <span className="sec-category-desc">{pt.desc}</span>
              </div>
              <span className="sec-category-view-link" onClick={() => { setFilterGroup(pt.key); setShowFilters(true); }}>View Policies →</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT-SIDE SLIDE-OVER DRAWER FOR ADD & EDIT POLICY */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveModal(null)}>
          <div className="sec-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header" style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {activeModal === 'add' ? 'Add API Security Policy' : 'Edit API Security Policy'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Configure rate limits, priorities, violation restrictions, and captcha checks.
                </p>
              </div>
              <span className="sec-drawer-close" role="button" style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => setActiveModal(null)}>✕</span>
            </div>

            <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="sec-drawer-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                
                {/* Policy Information Section */}
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
                        <option>Rate Limiting</option>
                        <option>Authentication</option>
                        <option>Access Control</option>
                        <option>Request Validation</option>
                        <option>Threat Protection</option>
                        <option>Data Protection</option>
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
                        <option>Partner</option>
                        <option>All Users</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>API Group <span className="req">*</span></label>
                      <select value={formApiGroup} onChange={(e) => setFormApiGroup(e.target.value)}>
                        <option>Public APIs</option>
                        <option>Partner APIs</option>
                        <option>Internal APIs</option>
                        <option>Admin APIs</option>
                        <option>Mobile APIs</option>
                        <option>All APIs</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Status <span className="req">*</span></label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Description</label>
                    <textarea rows="2" maxLength="250" placeholder="Enter policy description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                    <span className="char-counter">{formDescription.length}/250</span>
                  </div>
                </div>

                {/* Policy Configuration Section */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Configuration</h4>
                  
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Rate Limiting <span className="req">*</span></label>
                      <select value={formRateLimitEnabled} onChange={(e) => setFormRateLimitEnabled(e.target.value)}>
                        <option>Enable</option>
                        <option>Disable</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Limit Value <span className="req">*</span></label>
                      <input type="number" required disabled={formRateLimitEnabled === 'Disable'} value={formLimitValue} onChange={(e) => setFormLimitValue(e.target.value)} />
                    </div>
                  </div>

                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>Time Window <span className="req">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="number" required disabled={formRateLimitEnabled === 'Disable'} style={{ width: '70px' }} value={formWindowValue} onChange={(e) => setFormWindowValue(e.target.value)} />
                        <select disabled={formRateLimitEnabled === 'Disable'} value={formWindowUnit} onChange={(e) => setFormWindowUnit(e.target.value)} style={{ flex: 1 }}>
                          <option>Seconds</option>
                          <option>Minutes</option>
                          <option>Hours</option>
                        </select>
                      </div>
                    </div>
                    <div className="drawer-field">
                      <label>Priority <span className="req">*</span></label>
                      <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Action on Violation <span className="req">*</span></label>
                    <select value={formViolationAction} onChange={(e) => setFormViolationAction(e.target.value)}>
                      <option>Block Request</option>
                      <option>Alert Only</option>
                      <option>Throttle</option>
                    </select>
                  </div>
                </div>

                {/* Additional Settings Section */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Additional Settings</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formEnableLogging} onChange={(e) => setFormEnableLogging(e.target.checked)} />
                      Enable Logging
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formSendAlert} onChange={(e) => setFormSendAlert(e.target.checked)} />
                      Send Email Alert on Violation
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formAllowWhitelist} onChange={(e) => setFormAllowWhitelist(e.target.checked)} />
                      Allow Whitelisted IPs
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={formEnableCaptcha} onChange={(e) => setFormEnableCaptcha(e.target.checked)} />
                      Enable CAPTCHA on Violation
                    </label>
                  </div>
                </div>

                {/* Email template selector */}
                <div className="drawer-field">
                  <label>Email Alert Template</label>
                  <select value={formEmailTemplate} onChange={(e) => setFormEmailTemplate(e.target.value)}>
                    <option>API Rate Limit Exceeded</option>
                    <option>Threat Alert Template</option>
                    <option>Admin Login Blocked</option>
                    <option>None</option>
                  </select>
                </div>
              </div>

              <div className="sec-drawer-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-drawer-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="button" className="btn-drawer-draft" onClick={() => showToast('✓ Saved as Draft.')}>Save as Draft</button>
                <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered View Modal */}
      {activeModal === 'view' && selectedPolicy && (
        <div className="sec-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="sec-modal-card" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header" style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Policy Details</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Detailed API protection parameters.</p>
              </div>
              <span className="sec-drawer-close" role="button" style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => setActiveModal(null)}>✕</span>
            </div>

            <div className="sec-drawer-body" style={{ padding: '24px' }}>
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
                  <span className="view-details-lbl">API Group</span>
                  <span className="view-details-val">{selectedPolicy.apiGroup}</span>
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
                  <span className="view-details-lbl">Rate Limit Config</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold' }}>{selectedPolicy.rateLimit}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Priority</span>
                  <span className="view-details-val">{selectedPolicy.priority}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Violation Action</span>
                  <span className="view-details-val">{selectedPolicy.violationAction}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Logging Enabled</span>
                  <span className="view-details-val">{selectedPolicy.enableLogging ? 'Yes' : 'No'}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Email Alert Enabled</span>
                  <span className="view-details-val">{selectedPolicy.sendAlert ? 'Yes' : 'No'}</span>
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
            
            <div className="sec-drawer-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button className="btn-drawer-cancel" style={{ width: '100%' }} onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN BACKDROP / CENTERED DELETE CONFIRMATION MODAL */}
      {confirmDeleteModal && selectedPolicy && (
        <div className="sec-modal-overlay" onClick={() => setConfirmDeleteModal(false)}>
          <div className="delete-confirm-dialog" style={{ position: 'relative', margin: 0 }} onClick={(e) => e.stopPropagation()}>
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
