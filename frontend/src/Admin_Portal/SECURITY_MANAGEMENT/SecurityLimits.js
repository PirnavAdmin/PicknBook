/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import './SecurityManagement.css';



const LIMIT_CATEGORIES_INFO = [
  {
    key: 'Login Limits',
    label: 'Login Limits',
    count: 4,
    desc: 'Limits related to login attempts and failures.',
    icon: '🔑'
  },
  {
    key: 'OTP Limits',
    label: 'OTP Limits',
    count: 3,
    desc: 'Limits for OTP requests and validations.',
    icon: '📱'
  },
  {
    key: 'Password Limits',
    label: 'Password Limits',
    count: 3,
    desc: 'Limits for password failures and reset attempts.',
    icon: '🔒'
  },
  {
    key: 'Registration Limits',
    label: 'Registration Limits',
    count: 2,
    desc: 'Limits for registration attempts.',
    icon: '📝'
  },
  {
    key: 'Account Lock',
    label: 'Account Lock',
    count: 2,
    desc: 'Account lock duration and restrictions.',
    icon: '🔒'
  },
  {
    key: 'Session Limits',
    label: 'Session Limits',
    count: 2,
    desc: 'Limits for active sessions and device login.',
    icon: '💻'
  },
  {
    key: 'IP Limits',
    label: 'IP Limits',
    count: 2,
    desc: 'Rate limiting and IP based restrictions.',
    icon: '🌐'
  }
];

export default function SecurityLimits() {
  const navigate = useNavigate();
  const location = useLocation();

  // State Management
  const [limitsList, setLimitsList] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [securityError, setSecurityError] = useState(null);
  const [limitSubTab, setLimitSubTab] = useState('admin'); // 'admin' | 'user' | 'b2b'
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Advanced Filters State
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('');

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({});

  // Pagination & Page Size
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal / Drawer Drawers state
  const [activeDrawer, setActiveDrawer] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedRule, setSelectedRule] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Drawer Form State
  const [formCategory, setFormCategory] = useState('Login Limits');
  const [formType, setFormType] = useState('Max Failed Login Attempts');
  const [formEvent, setFormEvent] = useState('Login Failure');
  const [formValue, setFormValue] = useState('5');
  const [formDurationVal, setFormDurationVal] = useState('15');
  const [formDurationUnit, setFormDurationUnit] = useState('Minutes');
  const [formAction, setFormAction] = useState('Block');
  const [formStatus, setFormStatus] = useState('Active');
  const [formDescription, setFormDescription] = useState('');
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [formEmailTemplate, setFormEmailTemplate] = useState('Admin Login Blocked');
  const [formCreatedBy, setFormCreatedBy] = useState('system');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync subtab state with route hash or path queries if needed
  useEffect(() => {
    const hash = location.hash || '';
    if (hash.includes('user')) {
      setLimitSubTab('user');
    } else if (hash.includes('b2b')) {
      setLimitSubTab('b2b');
    } else {
      setLimitSubTab('admin');
    }
  }, [location.hash]);

  // Load rules from API
  useEffect(() => {
    async function loadRules() {
      try {
        const raw = await securityService.getLimitRules('all');
        const rulesArray = Array.isArray(raw) ? raw : (raw?.data || raw?.rules || []);
        if (Array.isArray(rulesArray) && rulesArray.length > 0) {
          const normalized = rulesArray.map((r, i) => ({
            id: r.id || `api-${i}`,
            categoryType: r.categoryType || 'admin',
            category: r.category || 'Login Limits',
            type: r.type || 'Max Failed Login Attempts',
            event: r.event || 'Login Failure',
            value: r.value || '5',
            duration: r.duration || '15 Minutes',
            durationVal: r.durationVal || 15,
            durationUnit: r.durationUnit || 'Minutes',
            action: r.action || 'Block',
            status: r.status || 'Active',
            createdOn: r.createdOn || new Date().toLocaleString(),
            createdBy: r.createdBy || 'system',
            description: r.description || '',
            sendEmail: r.sendEmail ?? true,
            emailTemplate: r.emailTemplate || 'None',
            triggeredCount: r.triggeredCount || 0,
            lastTriggered: r.lastTriggered || '—',
            expiresOn: r.expiresOn || '—'
          }));
          setLimitsList(normalized);
        } else {
          setLimitsList([]);
        }
      } catch (err) {
        console.warn('API getLimitRules failed, loading mock rules.', err);
        setLimitsList([]);
        if (err.response?.status === 403) {
          setSecurityError(err.response?.data?.message || 'Access Denied: Forbidden');
        }
      }
    }
    loadRules();
  }, []);

  // Sync sub-tab tab selection
  const handleTabChange = (tabKey) => {
    setLimitSubTab(tabKey);
    setCurrentPage(1);
    setSelectedIds(new Set());
    // Clear page filters
    handleResetFilters();
  };

  // Filter apply logic
  const handleApplyFilters = () => {
    const filters = {};
    if (filterCategory !== 'All') filters.Category = filterCategory;
    if (filterType !== 'All') filters.Type = filterType;
    if (filterStatus !== 'All') filters.Status = filterStatus;
    if (filterEvent !== 'All') filters.Event = filterEvent;
    if (filterAction !== 'All') filters.Action = filterAction;
    if (filterSearch) filters.Search = filterSearch;
    if (filterCreatedBy !== 'All') filters.CreatedBy = filterCreatedBy;
    if (filterDateRange) filters.DateRange = filterDateRange;

    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterCategory('All');
    setFilterType('All');
    setFilterStatus('All');
    setFilterEvent('All');
    setFilterAction('All');
    setFilterSearch('');
    setFilterCreatedBy('All');
    setFilterDateRange('');
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const removeFilterChip = (key) => {
    const nextFilters = { ...appliedFilters };
    delete nextFilters[key];
    setAppliedFilters(nextFilters);

    if (key === 'Category') setFilterCategory('All');
    if (key === 'Type') setFilterType('All');
    if (key === 'Status') setFilterStatus('All');
    if (key === 'Event') setFilterEvent('All');
    if (key === 'Action') setFilterAction('All');
    if (key === 'Search') setFilterSearch('');
    if (key === 'CreatedBy') setFilterCreatedBy('All');
    if (key === 'DateRange') setFilterDateRange('');
    setCurrentPage(1);
  };

  // Delete Action Handler
  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('❌ Please type "DELETE" exactly to confirm.');
      return;
    }
    try {
      await securityService.deleteLimitRule(selectedRule.id);
    } catch (e) {}

    const nextList = limitsList.filter(l => l.id !== selectedRule.id);
    setLimitsList(nextList);
    setConfirmDeleteModal(false);
    setDeleteConfirmText('');
    setSelectedRule(null);
    showToast('✓ Rule deleted successfully!');
  };

  // Save / Add / Update Rule Action
  const handleSaveRule = async (e) => {
    e.preventDefault();
    const durationStr = formDurationVal && formDurationUnit !== 'None' ? `${formDurationVal} ${formDurationUnit}` : '—';
    const newOrUpdatedRule = {
      id: activeDrawer === 'edit' ? selectedRule.id : `rule-${Date.now()}`,
      categoryType: limitSubTab,
      category: formCategory,
      type: formType,
      event: formEvent,
      value: formValue || '—',
      duration: durationStr,
      durationVal: formDurationVal ? parseInt(formDurationVal) : null,
      durationUnit: formDurationUnit,
      action: formAction,
      status: formStatus,
      createdOn: activeDrawer === 'edit' ? selectedRule.createdOn : '26 May 2026 11:00 AM',
      createdBy: formCreatedBy,
      description: formDescription,
      sendEmail: formSendEmail,
      emailTemplate: formSendEmail ? formEmailTemplate : 'None',
      triggeredCount: activeDrawer === 'edit' ? selectedRule.triggeredCount : 0,
      lastTriggered: activeDrawer === 'edit' ? selectedRule.lastTriggered : '—',
      expiresOn: formStatus === 'Active' ? '26 May 2026 12:00 PM' : '—'
    };

    try {
      if (activeDrawer === 'add') {
        await securityService.addLimitRule(newOrUpdatedRule);
        setLimitsList([newOrUpdatedRule, ...limitsList]);
        showToast('✓ Security Limit Rule created successfully!');
      } else {
        await securityService.updateLimitRule(selectedRule.id, newOrUpdatedRule);
        setLimitsList(limitsList.map(item => item.id === selectedRule.id ? newOrUpdatedRule : item));
        showToast('✓ Security Limit Rule updated successfully!');
      }
    } catch (err) {
      console.warn('API save error:', err);
      // Fallback
      if (activeDrawer === 'add') {
        setLimitsList([newOrUpdatedRule, ...limitsList]);
      } else {
        setLimitsList(limitsList.map(item => item.id === selectedRule.id ? newOrUpdatedRule : item));
      }
      showToast('✓ Saved rule configuration.');
    }
    setActiveDrawer(null);
  };

  // Trigger Open Drawers
  const handleOpenAddDrawer = () => {
    setSelectedRule(null);
    setFormCategory('Login Limits');
    setFormType('Max Failed Login Attempts');
    setFormEvent('Login Failure');
    setFormValue('5');
    setFormDurationVal('15');
    setFormDurationUnit('Minutes');
    setFormAction('Block');
    setFormStatus('Active');
    setFormDescription('');
    setFormSendEmail(true);
    setFormEmailTemplate('Admin Login Blocked');
    setFormCreatedBy('system');
    setActiveDrawer('add');
  };

  const handleOpenEditDrawer = (rule) => {
    setSelectedRule(rule);
    setFormCategory(rule.category);
    setFormType(rule.type);
    setFormEvent(rule.event);
    setFormValue(rule.value === '—' ? '' : rule.value);
    setFormDurationVal(rule.durationVal || '');
    setFormDurationUnit(rule.durationUnit || 'Minutes');
    setFormAction(rule.action);
    setFormStatus(rule.status);
    setFormDescription(rule.description || '');
    setFormSendEmail(rule.sendEmail);
    setFormEmailTemplate(rule.emailTemplate !== 'None' ? rule.emailTemplate : 'Admin Login Blocked');
    setFormCreatedBy(rule.createdBy);
    setActiveDrawer('edit');
  };

  const handleOpenViewDrawer = (rule) => {
    setSelectedRule(rule);
    setActiveDrawer('view');
  };

  const handleOpenDeleteModal = (rule) => {
    setSelectedRule(rule);
    setDeleteConfirmText('');
    setConfirmDeleteModal(true);
  };

  // Bulk / Multi Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = new Set(paginatedRules.map(r => r.id));
      setSelectedIds(ids);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // List processing logic based on current subtab & applied filters
  const filteredList = limitsList.filter(rule => {
    // 1. Tab Sync
    if (rule.categoryType !== limitSubTab) return false;

    // 2. Applied Filters
    if (appliedFilters.Category && rule.category !== appliedFilters.Category) return false;
    if (appliedFilters.Type && rule.type !== appliedFilters.Type) return false;
    if (appliedFilters.Status && rule.status !== appliedFilters.Status) return false;
    if (appliedFilters.Event && rule.event !== appliedFilters.Event) return false;
    if (appliedFilters.Action && rule.action !== appliedFilters.Action) return false;
    if (appliedFilters.CreatedBy && rule.createdBy !== appliedFilters.CreatedBy) return false;

    if (appliedFilters.Search) {
      const s = appliedFilters.Search.toLowerCase();
      const matchSearch =
        rule.category.toLowerCase().includes(s) ||
        rule.type.toLowerCase().includes(s) ||
        rule.event.toLowerCase().includes(s) ||
        (rule.description || '').toLowerCase().includes(s);
      if (!matchSearch) return false;
    }
    return true;
  });

  // Calculate Metrics specific to selected Tab
  const totalRules = filteredList.length;
  const activeCount = filteredList.filter(r => r.status === 'Active').length;
  const inactiveCount = filteredList.filter(r => r.status === 'Inactive').length;
  const expiredCount = filteredList.filter(r => r.status === 'Expired').length;
  
  // Percentages calculations
  const percentActive = totalRules > 0 ? ((activeCount / totalRules) * 100).toFixed(2) : '0.00';
  const percentInactive = totalRules > 0 ? ((inactiveCount / totalRules) * 100).toFixed(2) : '0.00';

  // Pagination bounds
  const totalEntries = filteredList.length;
  const startEntryIndex = (currentPage - 1) * pageSize;
  const paginatedRules = filteredList.slice(startEntryIndex, startEntryIndex + pageSize);

  return (
    <div className="security-mgmt-container">
      {securityError && (
        <div className="sd-error-banner">
          <span className="sd-error-icon">🛑</span>
          <div><strong>Security Alert:</strong> {securityError}</div>
        </div>
      )}

      {toastMessage && (
        <div className="sd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}



      {/* Top Header Title & Actions */}
      <div className="sd-top-header" style={{ marginBottom: '16px' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Security Limits</span>
          </h1>
          <p className="sd-page-subtitle">Configure thresholds, session policies, lockout durations, and rate limits.</p>
        </div>
        <div className="sd-header-right">
          <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={handleOpenAddDrawer}>
            <span>+ Add Limit Rule</span>
          </button>
          <button className="sd-export-btn" onClick={() => showToast('📥 Exporting Security Limits list CSV...')}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Summary KPI stats cards mapping */}
      <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{totalRules}</div>
            <div className="sd-kpi-label">
              {limitSubTab === 'admin' ? 'Admin Limits Configured' : limitSubTab === 'user' ? 'User Limits Configured' : 'B2B Limits Configured'}
            </div>
            <div className="sd-kpi-sublabel">Total limit rules</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 11 13 15 9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{activeCount}</div>
            <div className="sd-kpi-label">Active Rules</div>
            <div className="sd-kpi-sublabel">{percentActive}% of total rules</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{inactiveCount}</div>
            <div className="sd-kpi-label">Inactive Rules</div>
            <div className="sd-kpi-sublabel">{percentInactive}% of total rules</div>
          </div>
        </div>

        {limitSubTab !== 'admin' && (
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-value">
                {limitSubTab === 'user' ? '3' : '15'}
              </div>
              <div className="sd-kpi-label">
                {limitSubTab === 'user' ? 'Expiring Soon' : 'Triggered (Today)'}
              </div>
              <div className="sd-kpi-sublabel">
                {limitSubTab === 'user' ? 'In next 7 days' : 'Total events logged'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Selector Bar (Limit categories) */}
      <div className="sec-tabs-bar" style={{ marginTop: '16px' }}>
        <div role="button" className={`sec-tab-btn ${limitSubTab === 'admin' ? 'active' : ''}`} onClick={() => handleTabChange('admin')}>
          <span>Admin Limits</span>
        </div>
        <div role="button" className={`sec-tab-btn ${limitSubTab === 'user' ? 'active' : ''}`} onClick={() => handleTabChange('user')}>
          <span>User Limits</span>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilterPanel && (
        <div className="sd-panel sd-filters-panel" style={{ marginTop: '12px', padding: '16px' }}>
        <div className="sd-filters-grid">
          <div className="sd-filter-field">
            <label>Limit Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option>All</option>
              <option>Login Limits</option>
              <option>OTP Limits</option>
              <option>Password Limits</option>
              <option>Registration Limits</option>
              <option>Account Lock</option>
              <option>Session Limits</option>
              <option>IP Limits</option>
              <option>Wallet Limits</option>
              <option>Transaction Limits</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Limit Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option>All</option>
              <option>Max Failed Login Attempts</option>
              <option>Max OTP Requests</option>
              <option>Max Failed Password Attempts</option>
              <option>Max Registration Attempts</option>
              <option>Account Lock Duration</option>
              <option>Max Active Sessions</option>
              <option>Max Requests Per IP</option>
              <option>Max API Requests</option>
              <option>Max IPs</option>
              <option>Max Wallet Unblock Requests</option>
              <option>Max Transactions</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Expired</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Security Event</label>
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
              <option>All</option>
              <option>Login Failure</option>
              <option>OTP Request</option>
              <option>Password Failure</option>
              <option>Registration</option>
              <option>Multiple Failures</option>
              <option>Session</option>
              <option>Rate Limit</option>
              <option>API Request</option>
              <option>New IP Access</option>
              <option>Wallet Unblock</option>
              <option>Transaction</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Action</label>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option>All</option>
              <option>Block</option>
              <option>Lock</option>
              <option>Terminate</option>
              <option>Allow</option>
              <option>Alert</option>
              <option>Captcha</option>
              <option>None</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Search Query</label>
            <input
              type="text"
              placeholder="Search limit name or description..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="sd-filter-field">
            <label>Created By</label>
            <select value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)}>
              <option>All</option>
              <option>system</option>
              <option>admin</option>
            </select>
          </div>

          <div className="sd-filter-field">
            <label>Date Range</label>
            <input
              type="text"
              placeholder="e.g. 20 May 2026 - 26 May 2026"
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
            />
          </div>

          <div className="sd-filter-buttons" style={{ gridColumn: 'span 1' }}>
            <button className="sd-btn-reset" onClick={handleResetFilters}>Reset</button>
            <button className="sd-btn-filter" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={handleApplyFilters}>Apply Filters</button>
          </div>
        </div>

        {/* Applied filter chips tags row */}
        {Object.keys(appliedFilters).length > 0 && (
          <div className="sd-applied-chips">
            <span className="sd-chip-label">Active Filters:</span>
            {Object.entries(appliedFilters).map(([k, val]) => (
              <span key={k} className="sd-filter-chip">
                {k}: {val}
                <button className="sd-chip-close" onClick={() => removeFilterChip(k)}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Main Table Card list */}
      <div className="sd-panel" style={{ marginTop: '12px', padding: '16px' }}>
        <div className="sd-panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Security Limits List <span className="sd-records-count">({totalEntries} Records)</span></h3>
          <button
            className={`sd-filter-toggle-btn ${showFilterPanel ? 'active' : ''}`}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>
        </div>

        <div className="sd-table-container">
          <table className="sd-mini-table sec-ip-table">
            <thead>
              <tr>
                <th width="40">
                  <input type="checkbox" onChange={handleSelectAll} checked={paginatedRules.length > 0 && paginatedRules.every(r => selectedIds.has(r.id))} />
                </th>
                <th>#</th>
                <th>Limit Category</th>
                <th>Limit Type</th>
                <th>Security Event</th>
                <th>Limit Value</th>
                <th>Duration</th>
                <th>Action</th>
                <th>Status</th>
                <th>Created On</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.length > 0 ? (
                paginatedRules.map((rule, idx) => {
                  const isRowSelected = selectedIds.has(rule.id);
                  return (
                    <tr key={rule.id} className={isRowSelected ? 'row-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={isRowSelected} onChange={() => handleSelectRow(rule.id)} />
                      </td>
                      <td>{startEntryIndex + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{rule.category}</td>
                      <td>{rule.type}</td>
                      <td className="cell-ip">{rule.event}</td>
                      <td style={{ fontWeight: 700 }}>{rule.value}</td>
                      <td>{rule.duration}</td>
                      <td>
                        <span className={`badge-custom badge-action-${rule.action.toLowerCase()}`}>
                          {rule.action}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-custom badge-status-${rule.status.toLowerCase()}`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="cell-created">{rule.createdOn}</td>
                      <td className="cell-expiry">{rule.createdBy}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-act-icon" title="View Details" onClick={() => handleOpenViewDrawer(rule)}>👁️</button>
                          <button className="btn-act-icon" title="Edit" onClick={() => handleOpenEditDrawer(rule)}>📝</button>
                          <button className="btn-act-icon delete" title="Delete" onClick={() => handleOpenDeleteModal(rule)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    🌐 No Security Limit rules matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable AdminPagination Component */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalEntries}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          itemName="Rules"
        />
      </div>

      {/* Bottom Category Reference cards (Image 2 style) */}
      <div style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Limit Categories</h3>
        <div className="sec-categories-row">
          {LIMIT_CATEGORIES_INFO.map((cat, i) => (
            <div className="sec-category-card" key={i}>
              <div className="sec-category-card-top">
                <span className="sec-category-icon">{cat.icon}</span>
                <span className="badge-custom sec-category-rules-badge">
                  {cat.count} Rules
                </span>
              </div>
              <div className="sec-category-card-middle">
                <span className="sec-category-label">{cat.label}</span>
                <span className="sec-category-desc">{cat.desc}</span>
              </div>
              <span 
                className="sec-category-view-link"
                onClick={() => { setFilterCategory(cat.key); handleApplyFilters(); }}
              >
                View Rules →
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Right Side Slide-In Form Drawer for Add & Edit */}
      {(activeDrawer === 'add' || activeDrawer === 'edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'add' ? 'Add Limit Rule' : 'Edit Limit Rule'}</h3>
                <p>Configure thresholds, trigger events, lockout durations, and action overlays.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSaveRule} className="sec-drawer-form">
              <div className="sec-drawer-body">
                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Limit Category <span className="req">*</span></label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                      <option>Login Limits</option>
                      <option>OTP Limits</option>
                      <option>Password Limits</option>
                      <option>Registration Limits</option>
                      <option>Account Lock</option>
                      <option>Session Limits</option>
                      <option>IP Limits</option>
                      <option>Wallet Limits</option>
                      <option>Transaction Limits</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Limit Type <span className="req">*</span></label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                      <option>Max Failed Login Attempts</option>
                      <option>Max OTP Requests</option>
                      <option>Max Failed Password Attempts</option>
                      <option>Max Registration Attempts</option>
                      <option>Account Lock Duration</option>
                      <option>Max Active Sessions</option>
                      <option>Max Requests Per IP</option>
                      <option>Max API Requests</option>
                      <option>Max IPs</option>
                      <option>Max Wallet Unblock Requests</option>
                      <option>Max Transactions</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Security Event <span className="req">*</span></label>
                    <select value={formEvent} onChange={(e) => setFormEvent(e.target.value)}>
                      <option>Login Failure</option>
                      <option>OTP Request</option>
                      <option>Password Failure</option>
                      <option>Registration</option>
                      <option>Multiple Failures</option>
                      <option>Session</option>
                      <option>Rate Limit</option>
                      <option>API Request</option>
                      <option>New IP Access</option>
                      <option>Wallet Unblock</option>
                      <option>Transaction</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Limit Value <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 or 1000"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Duration <span className="req">*</span></label>
                    <div className="duration-input-grp">
                      <input
                        type="number"
                        placeholder="e.g. 15"
                        value={formDurationVal}
                        onChange={(e) => setFormDurationVal(e.target.value)}
                      />
                      <select value={formDurationUnit} onChange={(e) => setFormDurationUnit(e.target.value)}>
                        <option>Seconds</option>
                        <option>Minutes</option>
                        <option>Hours</option>
                        <option>Days</option>
                        <option>None</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <label>Action <span className="req">*</span></label>
                    <select value={formAction} onChange={(e) => setFormAction(e.target.value)}>
                      <option>Block</option>
                      <option>Lock</option>
                      <option>Terminate</option>
                      <option>Allow</option>
                      <option>Alert</option>
                      <option>Captcha</option>
                      <option>None</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Status <span className="req">*</span></label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Created By</label>
                    <input
                      type="text"
                      disabled
                      value={formCreatedBy}
                    />
                  </div>
                </div>

                <div className="drawer-field">
                  <label>Description (Optional)</label>
                  <textarea
                    rows="3"
                    maxLength="255"
                    placeholder="Enter short description..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                  <span className="char-counter">{formDescription.length}/255</span>
                </div>

                <div className="drawer-field toggle-field">
                  <label className="toggle-label-row">
                    <input
                      type="checkbox"
                      checked={formSendEmail}
                      onChange={(e) => setFormSendEmail(e.target.checked)}
                    />
                    <span>Email Notification</span>
                  </label>
                  <p className="toggle-subtext">Send alert email when this limit threshold is exceeded.</p>
                </div>

                {formSendEmail && (
                  <div className="drawer-field">
                    <label>Email Template</label>
                    <select value={formEmailTemplate} onChange={(e) => setFormEmailTemplate(e.target.value)}>
                      <option>Admin Login Blocked</option>
                      <option>Admin OTP Blocked</option>
                      <option>Admin Password Blocked</option>
                      <option>Admin Account Locked</option>
                      <option>Admin Session Terminated</option>
                      <option>Admin Rate Limit Exceeded</option>
                      <option>User Limit Exceeded</option>
                      <option>Threat Alert Template</option>
                      <option>Custom Template</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="sec-drawer-footer">
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>Cancel</button>
                  <button type="button" className="btn-drawer-draft" onClick={() => showToast('✓ Saved as Draft.')}>Save as Draft</button>
                  <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>Save Rule</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Drawer Sheet */}
      {activeDrawer === 'view' && selectedRule && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>Limit Rule Details</h3>
                <p>Detailed view and triggers logging statistics.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <div className="sec-drawer-body details-body">
              {/* Section 1: Limit Information */}
              <div className="details-section">
                <h4>Limit Information</h4>
                <div className="details-grid-list">
                  <div className="details-item">
                    <span className="details-label">Limit Category</span>
                    <span className="details-value">{selectedRule.category}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Limit Type</span>
                    <span className="details-value">{selectedRule.type}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Security Event</span>
                    <span className="details-value monospace">{selectedRule.event}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Limit Value</span>
                    <span className="details-value" style={{ fontWeight: 700 }}>{selectedRule.value}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Duration</span>
                    <span className="details-value">{selectedRule.duration}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Action Target</span>
                    <span className="details-value text-red" style={{ color: '#ef4444', fontWeight: 700 }}>{selectedRule.action}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Status</span>
                    <span className={`details-value badge-status ${selectedRule.status === 'Active' ? 'active' : ''}`}>{selectedRule.status}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Created By</span>
                    <span className="details-value">{selectedRule.createdBy}</span>
                  </div>
                </div>
                <div className="details-desc-box" style={{ marginTop: '12px' }}>
                  <span className="details-label">Description</span>
                  <p className="details-desc-text">{selectedRule.description || 'No description provided.'}</p>
                </div>
              </div>

              {/* Section 2: Email Configuration */}
              <div className="details-section">
                <h4>Email Configuration</h4>
                <div className="details-grid-list">
                  <div className="details-item">
                    <span className="details-label">Send Email Alert</span>
                    <span className="details-value">{selectedRule.sendEmail ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Email Template</span>
                    <span className="details-value">{selectedRule.emailTemplate}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Additional Details */}
              <div className="details-section">
                <h4>Additional Details</h4>
                <div className="details-grid-list three-col">
                  <div className="details-item">
                    <span className="details-label">Triggered Count</span>
                    <span className="details-value activity-count">{selectedRule.triggeredCount} Times</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Last Triggered</span>
                    <span className="details-value">{selectedRule.lastTriggered}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Rule Expires On</span>
                    <span className="details-value" style={{ color: '#f59e0b' }}>{selectedRule.expiresOn}</span>
                  </div>
                </div>
              </div>

              <button className="btn-details-close" onClick={() => setActiveDrawer(null)}>Close details</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal overlay */}
      {confirmDeleteModal && selectedRule && (
        <div className="modal-backdrop-overlay" onClick={() => setConfirmDeleteModal(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setConfirmDeleteModal(false)}>✕</span>
            <div className="delete-icon-wrapper">
              <div className="delete-trash-circle">🗑️</div>
            </div>
            <h3>Delete Limit Rule</h3>
            <p className="delete-subtext">Are you sure you want to delete this security limit rule? This action cannot be undone and will immediately disable threshold blocks.</p>

            <div className="delete-rule-brief" style={{ marginBottom: '16px' }}>
              <div className="brief-row">
                <span className="brief-lbl">Category:</span>
                <span className="brief-val">{selectedRule.category}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Type:</span>
                <span className="brief-val">{selectedRule.type}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Value:</span>
                <span className="brief-val" style={{ color: '#ef4444' }}>{selectedRule.value}</span>
              </div>
            </div>

            <div className="drawer-field" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Type <span style={{ color: '#ef4444' }}>"DELETE"</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                placeholder="Type DELETE"
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                className="btn-drawer-cancel"
                onClick={() => { setConfirmDeleteModal(false); setDeleteConfirmText(''); }}
              >
                Cancel
              </button>
              <button
                className="btn-drawer-save"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={handleDeleteConfirm}
                style={{
                  background: deleteConfirmText === 'DELETE' ? '#ef4444' : '#fca5a5',
                  borderColor: deleteConfirmText === 'DELETE' ? '#ef4444' : '#fca5a5',
                  cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed'
                }}
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
