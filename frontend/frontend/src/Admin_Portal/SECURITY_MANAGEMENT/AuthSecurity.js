/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';



const POLICY_TYPES_INFO = [
  {
    key: 'Login',
    label: 'Login Policies',
    count: 4,
    desc: 'Manage login attempts, rate limiting and restrictions.',
    icon: '🔑'
  },
  {
    key: 'MFA',
    label: 'MFA Policies',
    count: 2,
    desc: 'Manage multi-factor authentication requirements.',
    icon: '📱'
  },
  {
    key: 'Password',
    label: 'Password Policies',
    count: 2,
    desc: 'Manage password strength, expiry and history rules.',
    icon: '🔒'
  },
  {
    key: 'Session',
    label: 'Session Policies',
    count: 2,
    desc: 'Manage user sessions and timeout settings.',
    icon: '💻'
  },
  {
    key: 'Account Lock',
    label: 'Account Lock Policies',
    count: 1,
    desc: 'Manage account lockout and security restrictions.',
    icon: '🔒'
  },
  {
    key: 'Verification',
    label: 'Verification Policies',
    count: 2,
    desc: 'Manage email/phone verification requirements.',
    icon: '🛡️'
  }
];



export default function AuthSecurity() {
  const navigate = useNavigate();
  
  // Tabs: 'policies' | 'mfa' | 'password' | 'sessions'
  const [activeTab, setActiveTab] = useState('policies');
  const [toastMessage, setToastMessage] = useState(null);

  // States
  const [policies, setPolicies] = useState([]);
  const [mfaUsers, setMfaUsers] = useState([]);
  const [pwdPolicies, setPwdPolicies] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Filters State
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAppliesTo, setFilterAppliesTo] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Modals
  const [activeDrawer, setActiveDrawer] = useState(null); // 'policy-add' | 'policy-edit' | 'pwd-add' | 'pwd-edit' | 'view'
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);

  // Add/Edit Policy form
  const [policyName, setPolicyName] = useState('');
  const [policyType, setPolicyType] = useState('Login');
  const [policyAppliesTo, setPolicyAppliesTo] = useState('Admin, User');
  const [policyDesc, setPolicyDesc] = useState('');
  const [policyMfa, setPolicyMfa] = useState('Yes');
  const [policyTimeout, setPolicyTimeout] = useState('30');
  const [policyAttempts, setPolicyAttempts] = useState('5');
  const [policyLockout, setPolicyLockout] = useState('15');
  const [policyStatus, setPolicyStatus] = useState('Active');
  
  // Checkboxes
  const [policyStrongPwd, setPolicyStrongPwd] = useState(true);
  const [policyEnable2fa, setPolicyEnable2fa] = useState(true);
  const [policyEmailVerify, setPolicyEmailVerify] = useState(true);
  const [policyPhoneVerify, setPolicyPhoneVerify] = useState(false);

  // Add/Edit Password Policy form
  const [pwdPolicyName, setPwdPolicyName] = useState('');
  const [pwdPolicyDesc, setPwdPolicyDesc] = useState('');
  const [pwdMinLength, setPwdMinLength] = useState('8');
  const [pwdUpper, setPwdUpper] = useState(true);
  const [pwdLower, setPwdLower] = useState(true);
  const [pwdNumber, setPwdNumber] = useState(true);
  const [pwdSpecial, setPwdSpecial] = useState(true);
  const [pwdExpiryDays, setPwdExpiryDays] = useState('90');
  const [pwdStatus, setPwdStatus] = useState('Active');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Terminate/Revoke Session Action
  const handleTerminateSession = (sessId) => {
    setSessions(sessions.map(s => s.id === sessId ? { ...s, status: 'Terminated' } : s));
    showToast('✓ Session terminated successfully.');
  };

  // Delete Policy confirm
  const handleDeletePolicy = () => {
    if (activeTab === 'policies') {
      setPolicies(policies.filter(p => p.id !== selectedItem.id));
      showToast('✓ Policy deleted successfully.');
    } else if (activeTab === 'mfa') {
      setMfaUsers(mfaUsers.filter(u => u.id !== selectedItem.id));
      showToast('✓ MFA settings revoked for user.');
    } else if (activeTab === 'password') {
      setPwdPolicies(pwdPolicies.filter(p => p.id !== selectedItem.id));
      showToast('✓ Password policy deleted successfully.');
    }
    setDeleteConfirmModal(false);
    setSelectedItem(null);
  };

  // Save Policy Form Submit
  const handleSavePolicy = (e) => {
    e.preventDefault();
    if (activeDrawer === 'policy-add') {
      const newPolicy = {
        id: `pol-${Date.now()}`,
        name: policyName,
        type: policyType,
        appliesTo: policyAppliesTo,
        mfaRequired: policyMfa,
        status: policyStatus,
        createdOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        description: policyDesc,
        sessionTimeout: parseInt(policyTimeout) || 30,
        maxLoginAttempts: parseInt(policyAttempts) || 5,
        lockoutDuration: parseInt(policyLockout) || 15,
        reqStrongPassword: policyStrongPwd,
        enable2fa: policyEnable2fa,
        emailVerification: policyEmailVerify,
        phoneVerification: policyPhoneVerify
      };
      setPolicies([newPolicy, ...policies]);
      showToast('✓ Authentication Policy created successfully.');
    } else {
      setPolicies(policies.map(p => p.id === selectedItem.id ? {
        ...p,
        name: policyName,
        type: policyType,
        appliesTo: policyAppliesTo,
        mfaRequired: policyMfa,
        status: policyStatus,
        description: policyDesc,
        sessionTimeout: parseInt(policyTimeout) || 30,
        maxLoginAttempts: parseInt(policyAttempts) || 5,
        lockoutDuration: parseInt(policyLockout) || 15,
        reqStrongPassword: policyStrongPwd,
        enable2fa: policyEnable2fa,
        emailVerification: policyEmailVerify,
        phoneVerification: policyPhoneVerify
      } : p));
      showToast('✓ Authentication Policy updated successfully.');
    }
    setActiveDrawer(null);
  };

  // Save Password Policy Submit
  const handleSavePwdPolicy = (e) => {
    e.preventDefault();
    if (activeDrawer === 'pwd-add') {
      const newPwdPol = {
        id: `pwd-${Date.now()}`,
        name: pwdPolicyName,
        minLength: parseInt(pwdMinLength) || 8,
        upper: pwdUpper,
        lower: pwdLower,
        number: pwdNumber,
        special: pwdSpecial,
        expiry: parseInt(pwdExpiryDays) || 90,
        status: pwdStatus
      };
      setPwdPolicies([newPwdPol, ...pwdPolicies]);
      showToast('✓ Password Complexity Policy created successfully.');
    } else {
      setPwdPolicies(pwdPolicies.map(p => p.id === selectedItem.id ? {
        ...p,
        name: pwdPolicyName,
        minLength: parseInt(pwdMinLength) || 8,
        upper: pwdUpper,
        lower: pwdLower,
        number: pwdNumber,
        special: pwdSpecial,
        expiry: parseInt(pwdExpiryDays) || 90,
        status: pwdStatus
      } : p));
      showToast('✓ Password Complexity Policy updated successfully.');
    }
    setActiveDrawer(null);
  };

  // Form triggers
  const triggerAddPolicy = () => {
    setSelectedItem(null);
    setPolicyName('');
    setPolicyType('Login');
    setPolicyAppliesTo('Admin, User');
    setPolicyDesc('');
    setPolicyMfa('Yes');
    setPolicyTimeout('30');
    setPolicyAttempts('5');
    setPolicyLockout('15');
    setPolicyStatus('Active');
    setPolicyStrongPwd(true);
    setPolicyEnable2fa(true);
    setPolicyEmailVerify(true);
    setPolicyPhoneVerify(false);
    setActiveDrawer('policy-add');
  };

  const triggerEditPolicy = (p) => {
    setSelectedItem(p);
    setPolicyName(p.name);
    setPolicyType(p.type);
    setPolicyAppliesTo(p.appliesTo);
    setPolicyDesc(p.description || '');
    setPolicyMfa(p.mfaRequired);
    setPolicyTimeout(String(p.sessionTimeout || '30'));
    setPolicyAttempts(String(p.maxLoginAttempts || '5'));
    setPolicyLockout(String(p.lockoutDuration || '15'));
    setPolicyStatus(p.status);
    setPolicyStrongPwd(p.reqStrongPassword);
    setPolicyEnable2fa(p.enable2fa);
    setPolicyEmailVerify(p.emailVerification);
    setPolicyPhoneVerify(p.phoneVerification);
    setActiveDrawer('policy-edit');
  };

  const triggerAddPwdPolicy = () => {
    setSelectedItem(null);
    setPwdPolicyName('');
    setPwdPolicyDesc('');
    setPwdMinLength('8');
    setPwdUpper(true);
    setPwdLower(true);
    setPwdNumber(true);
    setPwdSpecial(true);
    setPwdExpiryDays('90');
    setPwdStatus('Active');
    setActiveDrawer('pwd-add');
  };

  const triggerEditPwdPolicy = (p) => {
    setSelectedItem(p);
    setPwdPolicyName(p.name);
    setPwdPolicyDesc(p.desc || '');
    setPwdMinLength(String(p.minLength || '8'));
    setPwdUpper(p.upper);
    setPwdLower(p.lower);
    setPwdNumber(p.number);
    setPwdSpecial(p.special);
    setPwdExpiryDays(String(p.expiry || '90'));
    setPwdStatus(p.status);
    setActiveDrawer('pwd-edit');
  };

  const triggerDelete = (item) => {
    setSelectedItem(item);
    setDeleteConfirmModal(true);
  };

  // Filter apply handlers
  const filteredPolicies = policies.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false;
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;
    if (filterAppliesTo !== 'All' && !p.appliesTo.includes(filterAppliesTo)) return false;
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !(p.description || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="security-mgmt-container">
      {toastMessage && (
        <div className="sd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation subtab headers */}
      <div className="sd-top-header" style={{ marginBottom: '16px' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">Authentication Security / Policies</h1>
          <p className="sd-page-subtitle">Security Management &nbsp;/&nbsp; Authentication Security &nbsp;/&nbsp; Policies</p>
        </div>
        <div className="sd-header-right">
          {activeTab === 'policies' && (
            <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={triggerAddPolicy}>
              <span>+ Add Policy</span>
            </button>
          )}
          {activeTab === 'password' && (
            <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={triggerAddPwdPolicy}>
              <span>+ Add Password Policy</span>
            </button>
          )}
          <button className="sd-export-btn" onClick={() => showToast('Exporting authentication data CSV...')}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Tab selectors */}
      <div className="sec-tabs-bar" style={{ marginBottom: '16px' }}>
        <div role="button" className={`sec-tab-btn ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => setActiveTab('policies')}>
          <span>Auth Policies</span>
        </div>
        <div role="button" className={`sec-tab-btn ${activeTab === 'mfa' ? 'active' : ''}`} onClick={() => setActiveTab('mfa')}>
          <span>MFA Users</span>
        </div>
        <div role="button" className={`sec-tab-btn ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
          <span>Password Policies</span>
        </div>
        <div role="button" className={`sec-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
          <span>Session Management</span>
        </div>
      </div>

      {/* --- Auth Policies VIEW --- */}
      {activeTab === 'policies' && (
        <>
          {/* Top KPI row */}
          <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>📁</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{policies.length}</div>
                <div className="sd-kpi-label">Total Policies</div>
                <div className="sd-kpi-sublabel">All Authentication Policies</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>🛡️</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{policies.filter(p => p.status === 'Active').length}</div>
                <div className="sd-kpi-label">Active Policies</div>
                <div className="sd-kpi-sublabel">75% of total policies</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>⚠️</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{policies.filter(p => p.status !== 'Active').length}</div>
                <div className="sd-kpi-label">Inactive Policies</div>
                <div className="sd-kpi-sublabel">25% of total policies</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#faf5ff', color: '#7e22ce' }}>🔑</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">1,248</div>
                <div className="sd-kpi-label">MFA Enabled Users</div>
                <div className="sd-kpi-sublabel">88.42% of total users</div>
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
                    <option>Login</option>
                    <option>MFA</option>
                    <option>Password</option>
                    <option>Session</option>
                    <option>Account Lock</option>
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

          {/* Policies Table grid */}
          <div className="sd-panel" style={{ padding: '16px' }}>
            <div className="sd-panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Policies List <span className="sd-records-count">({filteredPolicies.length} Records)</span></h3>
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
                    <th>MFA Required</th>
                    <th>Status</th>
                    <th>Created On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((p, idx) => (
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        <span className={`badge-custom badge-action-${p.type === 'MFA' ? 'block' : p.type === 'Session' ? 'terminate' : 'none'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td>{p.appliesTo}</td>
                      <td>
                        {p.mfaRequired === 'Yes' ? (
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Yes</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗ No</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-custom badge-status-${p.status.toLowerCase()}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{p.createdOn}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-act-icon" title="Edit" onClick={() => triggerEditPolicy(p)}>📝</button>
                          <button className="btn-act-icon delete" title="Delete" onClick={() => triggerDelete(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Policy Legend reference row cards */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Policy Types</h3>
            <div className="sec-categories-row">
              {POLICY_TYPES_INFO.map((pt, i) => (
                <div className="sec-category-card" key={i}>
                  <div className="sec-category-card-top">
                    <span className="sec-category-icon">{pt.icon}</span>
                    <span className="badge-custom sec-category-rules-badge">{pt.count} Policies</span>
                  </div>
                  <div className="sec-category-card-middle">
                    <span className="sec-category-label">{pt.label}</span>
                    <span className="sec-category-desc">{pt.desc}</span>
                  </div>
                  <span className="sec-category-view-link" onClick={() => { setFilterType(pt.key); }}>View Policies →</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* --- MFA Users VIEW --- */}
      {activeTab === 'mfa' && (
        <div className="sd-panel" style={{ padding: '16px' }}>
          <div className="sd-panel-header" style={{ marginBottom: '12px' }}>
            <h3>MFA Users List <span className="sd-records-count">({mfaUsers.length} Records)</span></h3>
          </div>
          <div className="sd-table-container">
            <table className="sd-mini-table">
              <thead>
                <tr>
                  <th width="50">#</th>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>User Type</th>
                  <th>MFA Status</th>
                  <th>Method</th>
                  <th>Enabled On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mfaUsers.map((u, idx) => (
                  <tr key={u.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge-custom badge-action-none`}>
                        {u.type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-custom badge-status-${u.status === 'Enabled' ? 'active' : 'inactive'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.method}</td>
                    <td>{u.enabledOn}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-act-icon delete" title="Disable MFA" onClick={() => triggerDelete(u)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Password Policies VIEW --- */}
      {activeTab === 'password' && (
        <div className="sd-panel" style={{ padding: '16px' }}>
          <div className="sd-panel-header" style={{ marginBottom: '12px' }}>
            <h3>Password Policies <span className="sd-records-count">({pwdPolicies.length} Records)</span></h3>
          </div>
          <div className="sd-table-container">
            <table className="sd-mini-table">
              <thead>
                <tr>
                  <th width="50">#</th>
                  <th>Policy Name</th>
                  <th>Min Length</th>
                  <th>Require Uppercase</th>
                  <th>Require Lowercase</th>
                  <th>Require Number</th>
                  <th>Require Special Char</th>
                  <th>Expiry Days</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pwdPolicies.map((pwd, idx) => (
                  <tr key={pwd.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{pwd.name}</td>
                    <td style={{ fontWeight: 700 }}>{pwd.minLength}</td>
                    <td>{pwd.upper ? '✅' : '❌'}</td>
                    <td>{pwd.lower ? '✅' : '❌'}</td>
                    <td>{pwd.number ? '✅' : '❌'}</td>
                    <td>{pwd.special ? '✅' : '❌'}</td>
                    <td style={{ fontWeight: 700 }}>{pwd.expiry} Days</td>
                    <td>
                      <span className={`badge-custom badge-status-${pwd.status.toLowerCase()}`}>
                        {pwd.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-act-icon" title="Edit" onClick={() => triggerEditPwdPolicy(pwd)}>📝</button>
                        <button className="btn-act-icon delete" title="Delete" onClick={() => triggerDelete(pwd)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Session Management VIEW --- */}
      {activeTab === 'sessions' && (
        <>
          {/* Top KPI Cards */}
          <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>💻</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{sessions.filter(s => s.status === 'Active').length}</div>
                <div className="sd-kpi-label">Active Sessions</div>
                <div className="sd-kpi-sublabel">Currently online users</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>⏳</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{sessions.filter(s => s.status === 'Expired').length}</div>
                <div className="sd-kpi-label">Expired Sessions</div>
                <div className="sd-kpi-sublabel">Timed out sessions in 24h</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>🛑</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">{sessions.filter(s => s.status === 'Terminated').length}</div>
                <div className="sd-kpi-label">Terminated Sessions</div>
                <div className="sd-kpi-sublabel">Revoked connections in 24h</div>
              </div>
            </div>

            <div className="sd-kpi-card">
              <div className="sd-kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>⏱️</div>
              <div className="sd-kpi-info">
                <div className="sd-kpi-value">42m</div>
                <div className="sd-kpi-label">Average Session Time</div>
                <div className="sd-kpi-sublabel">Average session length</div>
              </div>
            </div>
          </div>

          {/* Session Table list */}
          <div className="sd-panel" style={{ padding: '16px' }}>
            <div className="sd-panel-header" style={{ marginBottom: '12px' }}>
              <h3>Active Sessions <span className="sd-records-count">({sessions.length} Records)</span></h3>
            </div>
            <div className="sd-table-container">
              <table className="sd-mini-table">
                <thead>
                  <tr>
                    <th width="50">#</th>
                    <th>User Name</th>
                    <th>User Type</th>
                    <th>IP Address</th>
                    <th>Device / Browser</th>
                    <th>Location</th>
                    <th>Login Time</th>
                    <th>Last Activity</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess, idx) => (
                    <tr key={sess.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{sess.name}</td>
                      <td>{sess.type}</td>
                      <td className="cell-ip">{sess.ip}</td>
                      <td>{sess.device}</td>
                      <td>{sess.location}</td>
                      <td>{sess.loginTime}</td>
                      <td>{sess.lastActivity}</td>
                      <td>
                        <span className={`badge-custom badge-status-${sess.status === 'Active' ? 'active' : sess.status === 'Expired' ? 'expired' : 'inactive'}`}>
                          {sess.status}
                        </span>
                      </td>
                      <td>
                        {sess.status === 'Active' ? (
                          <div className="table-actions">
                            <button className="btn-act-icon delete" title="Terminate Session" onClick={() => handleTerminateSession(sess.id)}>🛑</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Terminated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- DRAWERS for POLICY Add/Edit --- */}
      {(activeDrawer === 'policy-add' || activeDrawer === 'policy-edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'policy-add' ? 'Add Policy' : 'Edit Policy'}</h3>
                <p>Authentication Security &nbsp;›&nbsp; Policies &nbsp;›&nbsp; {activeDrawer === 'policy-add' ? 'Add Policy' : 'Edit Policy'}</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSavePolicy} className="sec-drawer-form">
              <div className="sec-drawer-body">
                {/* Policy Information Section */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Information</h4>
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Policy Name <span className="req">*</span></label>
                      <input type="text" required placeholder="Enter policy name" value={policyName} onChange={(e) => setPolicyName(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Policy Type <span className="req">*</span></label>
                      <select value={policyType} onChange={(e) => setPolicyType(e.target.value)}>
                        <option>Login</option>
                        <option>MFA</option>
                        <option>Password</option>
                        <option>Session</option>
                        <option>Account Lock</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Applies To <span className="req">*</span></label>
                      <select value={policyAppliesTo} onChange={(e) => setPolicyAppliesTo(e.target.value)}>
                        <option>Admin, User</option>
                        <option>Admin</option>
                        <option>User</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Status <span className="req">*</span></label>
                      <select value={policyStatus} onChange={(e) => setPolicyStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <label>Description</label>
                    <textarea rows="2" maxLength="250" placeholder="Enter policy description..." value={policyDesc} onChange={(e) => setPolicyDesc(e.target.value)} />
                    <span className="char-counter">{policyDesc.length}/250</span>
                  </div>
                </div>

                {/* Policy Configuration Section */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Configuration</h4>
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>MFA Required <span className="req">*</span></label>
                      <select value={policyMfa} onChange={(e) => setPolicyMfa(e.target.value)}>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Session Timeout (Minutes) <span className="req">*</span></label>
                      <input type="number" required value={policyTimeout} onChange={(e) => setPolicyTimeout(e.target.value)} />
                    </div>
                  </div>

                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Max Login Attempts <span className="req">*</span></label>
                      <input type="number" required value={policyAttempts} onChange={(e) => setPolicyAttempts(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Lockout Duration (Minutes) <span className="req">*</span></label>
                      <input type="number" required value={policyLockout} onChange={(e) => setPolicyLockout(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Additional Settings Section */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Additional Settings</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '4px' }}>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={policyStrongPwd} onChange={(e) => setPolicyStrongPwd(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Require Strong Password</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={policyEmailVerify} onChange={(e) => setPolicyEmailVerify(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Email Verification Required</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={policyEnable2fa} onChange={(e) => setPolicyEnable2fa(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Enable Two-Factor Authentication</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={policyPhoneVerify} onChange={(e) => setPolicyPhoneVerify(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Phone Verification Required</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="sec-drawer-footer">
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>Cancel</button>
                  <button type="button" className="btn-drawer-draft" onClick={() => showToast('✓ Saved as Draft.')}>Save as Draft</button>
                  <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>
                    {activeDrawer === 'policy-add' ? 'Save Policy' : 'Update Policy'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DRAWERS for PASSWORD POLICY Add/Edit --- */}
      {(activeDrawer === 'pwd-add' || activeDrawer === 'pwd-edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'pwd-add' ? 'Add Password Policy' : 'Edit Password Policy'}</h3>
                <p>Authentication Security &nbsp;›&nbsp; Password Policies &nbsp;›&nbsp; Configure Rules</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSavePwdPolicy} className="sec-drawer-form">
              <div className="sec-drawer-body">
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Policy Information</h4>
                  <div className="drawer-field">
                    <label>Policy Name <span className="req">*</span></label>
                    <input type="text" required placeholder="Enter password policy name" value={pwdPolicyName} onChange={(e) => setPwdPolicyName(e.target.value)} />
                  </div>
                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Description</label>
                    <textarea rows="2" maxLength="250" placeholder="Enter policy description..." value={pwdPolicyDesc} onChange={(e) => setPwdPolicyDesc(e.target.value)} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Password Rules</h4>
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Minimum Length <span className="req">*</span></label>
                      <input type="number" required value={pwdMinLength} onChange={(e) => setPwdMinLength(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Expiry (Days) <span className="req">*</span></label>
                      <input type="number" required value={pwdExpiryDays} onChange={(e) => setPwdExpiryDays(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '12px' }}>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={pwdUpper} onChange={(e) => setPwdUpper(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Require Uppercase (A-Z)</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={pwdLower} onChange={(e) => setPwdLower(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Require Lowercase (a-z)</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={pwdNumber} onChange={(e) => setPwdNumber(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Require Number (0-9)</span>
                    </label>
                    <label className="toggle-label-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={pwdSpecial} onChange={(e) => setPwdSpecial(e.target.checked)} />
                      <span style={{ fontSize: '11px' }}>Require Special Characters (!@#$...)</span>
                    </label>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '12px' }}>
                    <label>Status <span className="req">*</span></label>
                    <select value={pwdStatus} onChange={(e) => setPwdStatus(e.target.value)}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sec-drawer-footer">
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>Cancel</button>
                  <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>
                    Save Policy
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && selectedItem && (
        <div className="modal-backdrop-overlay" onClick={() => setDeleteConfirmModal(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setDeleteConfirmModal(false)}>✕</span>
            <div className="delete-icon-wrapper">
              <div className="delete-trash-circle">🗑️</div>
            </div>
            <h3>Delete Policy</h3>
            <p className="delete-subtext">Are you sure you want to delete this policy?</p>
            <div className="delete-rule-brief" style={{ marginBottom: '16px' }}>
              <div className="brief-row">
                <span className="brief-lbl">Policy Name:</span>
                <span className="brief-val">{selectedItem.name}</span>
              </div>
            </div>
            <div className="sd-error-banner" style={{ fontSize: '10px', padding: '6px 8px', marginBottom: '16px' }}>
              ⚠️ This action cannot be undone. All associated data will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-drawer-cancel" onClick={() => setDeleteConfirmModal(false)}>Cancel</button>
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
