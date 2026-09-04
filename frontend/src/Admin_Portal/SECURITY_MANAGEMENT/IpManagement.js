/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import securityService from '../../services/securityService';
import AdminPagination from '../../components/AdminPagination';
import { Filter, Download, Plus } from 'lucide-react';
import './SecurityManagement.css';

// Helper to format remaining time dynamically
const formatExpiresIn = (seconds, blockType) => {
  if (blockType === 'Permanent') return '—';
  if (seconds === undefined || seconds === null) return '—';
  if (seconds <= 0) return 'Expired';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const formatDateTime = (date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function IpManagement({ defaultSubTab = 'all' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // State Management
  const [ipRules, setIpRules] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [securityError, setSecurityError] = useState(null);
  const [ipSubTab, setIpSubTab] = useState(defaultSubTab); // 'all' | 'whitelist' | 'blacklist' | 'active_blocks' | 'auto_blocks' | 'manual_blocks' | 'auto_whitelist' | 'expired_blocks' | 'history'
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Advanced Filters State
  const [filterIp, setFilterIp] = useState('');
  const [filterScope, setFilterScope] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterRuleType, setFilterRuleType] = useState('All');
  const [filterReason, setFilterReason] = useState('All');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('All');
  const [filterSecurityEvent, setFilterSecurityEvent] = useState('All');

  // Applied Filters state for visual chips and search trigger
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
  const [formIp, setFormIp] = useState('');
  const [formScope, setFormScope] = useState('User');
  const [formAction, setFormAction] = useState('Blocked');
  const [formRuleType, setFormRuleType] = useState('IP Rule');
  const [formBlockType, setFormBlockType] = useState('Temporary');
  const [formDuration, setFormDuration] = useState('60');
  const [formReason, setFormReason] = useState('');
  const [formSource, setFormSource] = useState('Manual');
  const [formSecurityEvent, setFormSecurityEvent] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formEmailTemplate, setFormEmailTemplate] = useState('IP Blocked Notification');
  const [formSendNotification, setFormSendNotification] = useState(true);
  const [formPriority, setFormPriority] = useState('Medium');
  const [formDescription, setFormDescription] = useState('');
  const [formExpiresOn, setFormExpiresOn] = useState('');
  const [addAnotherAfterSave, setAddAnotherAfterSave] = useState(false);

  // Dynamic countdown effect for temporary blocks
  useEffect(() => {
    const timer = setInterval(() => {
      setIpRules(prevRules =>
        prevRules.map(rule => {
          if (rule.blockType === 'Temporary' && rule.expiresInSeconds !== null && rule.expiresInSeconds > 0) {
            const nextSec = rule.expiresInSeconds - 1;
            if (nextSec <= 0) {
              return { ...rule, expiresInSeconds: 0, status: 'Expired', action: 'Expired' };
            }
            return { ...rule, expiresInSeconds: nextSec };
          }
          return rule;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync subtab state with route path changes on mount
  useEffect(() => {
    const path = location.pathname || '';
    if (path.includes('white-list-ip')) {
      setIpSubTab('whitelist');
      setCurrentPage(1);
    } else if (path.includes('black-list-ip')) {
      setIpSubTab('blacklist');
      setCurrentPage(1);
    }
  }, []);

  // Fetch real rules from API on load and combine with mocks
  useEffect(() => {
    async function loadBackendRules() {
      try {
        const raw = await securityService.getIpRules('all');
        const rulesArray = Array.isArray(raw) ? raw : (raw?.data || raw?.rules || []);
        if (Array.isArray(rulesArray) && rulesArray.length > 0) {
          const fetchedNormalized = rulesArray.map((r, i) => {
            const isWhite = (r.type || r.listType || '').toLowerCase().includes('white');
            return {
              id: r.id || `api-${i}`,
              ipAddress: r.ipAddress || r.ip || '0.0.0.0',
              scope: r.scope || 'User',
              action: isWhite ? 'Whitelisted' : 'Blocked',
              source: r.source || 'Manual',
              reason: r.reason || r.description || 'API Sync',
              blockType: r.isPermanent ? 'Permanent' : 'Temporary',
              addedOn: formatDateTime(new Date(r.addedOn || r.createdAt || Date.now())),
              expiresInSeconds: r.isPermanent ? null : 3600,
              status: r.status || (isWhite ? 'Whitelisted' : 'Active'),
              createdBy: r.createdBy || 'admin@example.com',
              description: r.description || r.reason || '',
              priority: 'Medium',
              sendNotification: false,
              emailTemplate: 'None',
              securityEvent: '',
              account: '',
              durationMinutes: 60,
              createdOn: formatDateTime(new Date(r.addedOn || r.createdAt || Date.now())),
              failures: { login: 0, otp: 0, password: 0, registration: 0, api: 0 }
            };
          });
          // Merge avoiding duplicates
          setIpRules(prev => {
            const merged = [...prev];
            fetchedNormalized.forEach(fn => {
              if (!merged.find(m => m.ipAddress === fn.ipAddress)) {
                merged.push(fn);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn('Backend fetch failed, using rich mock data.', err);
        if (err.response?.status === 403) {
          setSecurityError(err.response?.data?.message || 'Access Denied: Forbidden');
        }
      }
    }
    loadBackendRules();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Metric calculation functions
  const totalRules = ipRules.length;
  const whitelistCount = ipRules.filter(r => r.action === 'Whitelisted').length;
  const blacklistCount = ipRules.filter(r => r.action === 'Blacklisted').length;
  const blockedCount = ipRules.filter(r => r.action === 'Blocked').length;
  const expiredCount = ipRules.filter(r => r.action === 'Expired' || r.status === 'Expired').length;

  const percentWhitelisted = totalRules > 0 ? ((whitelistCount / totalRules) * 100).toFixed(2) : '0.00';
  const percentBlacklisted = totalRules > 0 ? ((blacklistCount / totalRules) * 100).toFixed(2) : '0.00';
  const percentBlocked = totalRules > 0 ? ((blockedCount / totalRules) * 100).toFixed(2) : '0.00';
  const percentExpired = totalRules > 0 ? ((expiredCount / totalRules) * 100).toFixed(2) : '0.00';

  // Apply filters action
  const handleApplyFilters = () => {
    const filters = {};
    if (filterIp) filters.Ip = filterIp;
    if (filterScope !== 'All') filters.Scope = filterScope;
    if (filterAction !== 'All') filters.Action = filterAction;
    if (filterStatus !== 'All') filters.Status = filterStatus;
    if (filterSource !== 'All') filters.Source = filterSource;
    if (filterRuleType !== 'All') filters.RuleType = filterRuleType;
    if (filterReason !== 'All') filters.Reason = filterReason;
    if (filterAccount) filters.Account = filterAccount;
    if (filterDateRange) filters.DateRange = filterDateRange;
    if (filterExpiry !== 'All') filters.Expiry = filterExpiry;
    if (filterSecurityEvent !== 'All') filters.SecurityEvent = filterSecurityEvent;

    setAppliedFilters(filters);
    setCurrentPage(1);
    showToast('Filters applied successfully.');
  };

  // Reset filters action
  const handleResetFilters = () => {
    setFilterIp('');
    setFilterScope('All');
    setFilterAction('All');
    setFilterStatus('All');
    setFilterSource('All');
    setFilterRuleType('All');
    setFilterReason('All');
    setFilterAccount('');
    setFilterDateRange('');
    setFilterExpiry('All');
    setFilterSecurityEvent('All');
    setAppliedFilters({});
    setCurrentPage(1);
    showToast('Filters reset.');
  };

  const removeFilterChip = (key) => {
    const updated = { ...appliedFilters };
    delete updated[key];
    setAppliedFilters(updated);

    // Reset corresponding individual state
    if (key === 'Ip') setFilterIp('');
    if (key === 'Scope') setFilterScope('All');
    if (key === 'Action') setFilterAction('All');
    if (key === 'Status') setFilterStatus('All');
    if (key === 'Source') setFilterSource('All');
    if (key === 'RuleType') setFilterRuleType('All');
    if (key === 'Reason') setFilterReason('All');
    if (key === 'Account') setFilterAccount('');
    if (key === 'DateRange') setFilterDateRange('');
    if (key === 'Expiry') setFilterExpiry('All');
    if (key === 'SecurityEvent') setFilterSecurityEvent('All');
  };

  const getSubTabHeaderTitle = (tab) => {
    switch (tab) {
      case 'whitelist': return 'Whitelisted IP List';
      case 'blacklist': return 'Blacklisted IP List';
      case 'active_blocks': return 'Active Blocked IP List';
      case 'auto_blocks': return 'Automatic Blocked IP List';
      case 'manual_blocks': return 'Manual Blocked IP List';
      case 'auto_whitelist': return 'Automatic Whitelisted IP List';
      case 'expired_blocks': return 'Expired Blocked IP List';
      case 'history': return 'IP Audit History';
      case 'all':
      default: return 'IP Rules List';
    }
  };

  // Tab filtering logic
  const getTabFilteredRules = () => {
    switch (ipSubTab) {
      case 'whitelist':
        return ipRules.filter(r => r.action === 'Whitelisted');
      case 'blacklist':
        return ipRules.filter(r => r.action === 'Blacklisted');
      case 'active_blocks':
        return ipRules.filter(r => r.action === 'Blocked' && r.status === 'Active');
      case 'auto_blocks':
        return ipRules.filter(r => r.source === 'Automatic' && r.action === 'Blocked');
      case 'manual_blocks':
        return ipRules.filter(r => r.source === 'Manual' && r.action === 'Blocked');
      case 'auto_whitelist':
        return ipRules.filter(r => r.source === 'Automatic' && r.action === 'Whitelisted');
      case 'expired_blocks':
        return ipRules.filter(r => r.action === 'Expired' || r.status === 'Expired');
      case 'history':
        return ipRules; // IP History represents all rules as history audit logs
      case 'all':
      default:
        return ipRules;
    }
  };

  // Advanced Filters logic on top of Tabbed Navigation rules
  const getFilteredRules = () => {
    let list = getTabFilteredRules();

    if (appliedFilters.Ip) {
      list = list.filter(r => r.ipAddress.toLowerCase().includes(appliedFilters.Ip.toLowerCase()));
    }
    if (appliedFilters.Scope) {
      list = list.filter(r => r.scope === appliedFilters.Scope);
    }
    if (appliedFilters.Action) {
      list = list.filter(r => r.action === appliedFilters.Action);
    }
    if (appliedFilters.Status) {
      list = list.filter(r => r.status === appliedFilters.Status);
    }
    if (appliedFilters.Source) {
      list = list.filter(r => r.source === appliedFilters.Source);
    }
    if (appliedFilters.RuleType) {
      list = list.filter(r => r.ruleType === appliedFilters.RuleType);
    }
    if (appliedFilters.Reason) {
      list = list.filter(r => r.reason.toLowerCase().includes(appliedFilters.Reason.toLowerCase()));
    }
    if (appliedFilters.Account) {
      list = list.filter(r => r.account?.toLowerCase().includes(appliedFilters.Account.toLowerCase()));
    }
    if (appliedFilters.SecurityEvent) {
      list = list.filter(r => r.securityEvent === appliedFilters.SecurityEvent);
    }
    if (appliedFilters.Expiry) {
      if (appliedFilters.Expiry === 'Active') {
        list = list.filter(r => r.blockType === 'Temporary' && r.expiresInSeconds > 0);
      } else if (appliedFilters.Expiry === 'Expired') {
        list = list.filter(r => r.status === 'Expired');
      }
    }

    return list;
  };

  const finalFilteredList = getFilteredRules();

  // Pagination bounds
  const totalEntries = finalFilteredList.length;
  const startEntryIndex = (currentPage - 1) * pageSize;
  const paginatedRules = finalFilteredList.slice(startEntryIndex, startEntryIndex + pageSize);
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  // Checkbox row toggles
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = new Set(paginatedRules.map(r => r.id));
      setSelectedIds(ids);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  // Open Add Rule Drawer
  const handleOpenAddDrawer = () => {
    setSelectedRule(null);
    setFormIp('');
    setFormScope('User');
    setFormAction('Blocked');
    setFormRuleType('IP Rule');
    setFormBlockType('Temporary');
    setFormDuration('60');
    setFormReason('');
    setFormSource('Manual');
    setFormSecurityEvent('');
    setFormAccount('');
    setFormEmailTemplate('IP Blocked Notification');
    setFormSendNotification(true);
    setFormPriority('Medium');
    setFormDescription('');
    setFormExpiresOn('');
    setActiveDrawer('add');
  };

  // Open Edit Rule Drawer
  const handleOpenEditDrawer = (rule) => {
    setSelectedRule(rule);
    setFormIp(rule.ipAddress);
    setFormScope(rule.scope);
    setFormAction(rule.action);
    setFormRuleType(rule.ruleType || 'IP Rule');
    setFormBlockType(rule.blockType);
    setFormDuration(String(rule.durationMinutes || '60'));
    setFormReason(rule.reason);
    setFormSource(rule.source);
    setFormSecurityEvent(rule.securityEvent || '');
    setFormAccount(rule.account || '');
    setFormEmailTemplate(rule.emailTemplate || 'IP Blocked Notification');
    setFormSendNotification(rule.sendNotification ?? true);
    setFormPriority(rule.priority || 'Medium');
    setFormDescription(rule.description || '');
    setFormExpiresOn(rule.expiresOn || '');
    setActiveDrawer('edit');
  };

  // Open View Details Modal/Drawer
  const handleOpenViewDrawer = (rule) => {
    setSelectedRule(rule);
    setActiveDrawer('view');
  };

  // Save / Update Rule Action
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!formIp.trim()) {
      showToast('❌ IP Address/CIDR is required!');
      return;
    }

    const currentFormatted = formatDateTime(new Date());

    if (activeDrawer === 'add') {
      const expiresSec = formBlockType === 'Temporary' ? parseInt(formDuration) * 60 : null;
      const newRule = {
        id: `rule-${Date.now()}`,
        ipAddress: formIp.trim(),
        scope: formScope,
        action: formAction,
        source: formSource,
        reason: formReason.trim() || (formAction === 'Whitelisted' ? 'Office Access' : 'Security Trigger'),
        blockType: formBlockType,
        addedOn: currentFormatted,
        expiresInSeconds: expiresSec,
        status: formAction === 'Whitelisted' ? 'Whitelisted' : 'Active',
        createdBy: 'admin@picknbook.in',
        description: formDescription.trim() || `Access rule configured by admin.`,
        priority: formPriority,
        sendNotification: formSendNotification,
        emailTemplate: formEmailTemplate,
        securityEvent: formSecurityEvent || 'Custom Rule',
        account: formAccount.trim(),
        durationMinutes: formBlockType === 'Temporary' ? parseInt(formDuration) : null,
        createdOn: currentFormatted,
        failures: { login: 0, otp: 0, password: 0, registration: 0, api: 0 }
      };

      // Call API helper in background
      try {
        if (formAction === 'Whitelisted') {
          await securityService.addWhitelistIp(newRule);
        } else {
          await securityService.addBlacklistIp({
            ...newRule,
            durationMinutes: newRule.durationMinutes || 60,
            isPermanent: newRule.blockType === 'Permanent'
          });
        }
      } catch (err) {
        console.warn('API save warning:', err);
      }

      setIpRules([newRule, ...ipRules]);
      showToast('✓ IP Rule created successfully!');

      if (addAnotherAfterSave) {
        // Keep drawer open, reset only IP/Description
        setFormIp('');
        setFormDescription('');
      } else {
        setActiveDrawer(null);
      }
    } else if (activeDrawer === 'edit') {
      const expiresSec = formBlockType === 'Temporary' ? parseInt(formDuration) * 60 : null;
      const updated = ipRules.map(r => {
        if (r.id === selectedRule.id) {
          return {
            ...r,
            ipAddress: formIp.trim(),
            scope: formScope,
            action: formAction,
            source: formSource,
            reason: formReason.trim(),
            blockType: formBlockType,
            expiresInSeconds: expiresSec,
            status: formAction === 'Whitelisted' ? 'Whitelisted' : 'Active',
            description: formDescription.trim(),
            priority: formPriority,
            sendNotification: formSendNotification,
            emailTemplate: formEmailTemplate,
            securityEvent: formSecurityEvent,
            account: formAccount.trim(),
            durationMinutes: formBlockType === 'Temporary' ? parseInt(formDuration) : null
          };
        }
        return r;
      });

      // API call mockup
      try {
        await securityService.patchIpRuleStatus(selectedRule.id, formAction === 'Whitelisted' ? 'WHITELIST' : 'ACTIVE');
      } catch (e) {}

      setIpRules(updated);
      showToast('✓ IP Rule updated successfully!');
      setActiveDrawer(null);
    }
  };

  // Open delete dialog
  const handleOpenDeleteModal = (rule) => {
    setSelectedRule(rule);
    setDeleteConfirmText('');
    setConfirmDeleteModal(true);
  };

  // Confirmed Delete Rule
  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('⚠️ Please type DELETE to confirm.');
      return;
    }

    try {
      await securityService.deleteIpRule(selectedRule.id);
    } catch (e) {}

    setIpRules(ipRules.filter(r => r.id !== selectedRule.id));
    setConfirmDeleteModal(false);
    setSelectedRule(null);
    showToast('✓ IP Rule deleted successfully.');
  };

  return (
    <div className="security-mgmt-container">
      {securityError && (
        <div className="sd-error-banner">
          <span className="sd-error-icon">🛑</span>
          <div><strong>Security Alert:</strong> {securityError}</div>
        </div>
      )}

      {/* Breadcrumb Row */}
      <div className="sec-breadcrumb">
        <span className="crumb-link" onClick={() => navigate('/admin')}>Dashboard</span>
        <span>›</span>
        <span className="crumb-link" onClick={() => navigate('/admin/security-management')}>Security Management</span>
        <span>›</span>
        <span className="active-crumb">IP Management</span>
      </div>

      {/* Top Title/Action Row */}
      <div className="sd-top-header" style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">IP Management</h1>
        </div>
        <div className="sd-header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`sd-filter-toggle-btn ${showFilterPanel ? 'active' : ''}`}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #A51C49',
              background: '#A51C49',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(165, 28, 73, 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#851237'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#A51C49'}
          >
            <Filter size={16} /> Filter
          </button>

          <button
            type="button"
            onClick={() => showToast('Exporting IP list CSV...')}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #1e8e3e',
              background: '#1e8e3e',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(30, 142, 62, 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#167232'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1e8e3e'}
          >
            <Download size={16} /> Export
          </button>

          <button
            type="button"
            onClick={handleOpenAddDrawer}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #A51C49',
              background: '#A51C49',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(165, 28, 73, 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#851237'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#A51C49'}
          >
            <Plus size={16} /> Add IP Rule
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid (5 column row like design) */}
      <div className="sd-kpi-grid" style={{ marginTop: '4px', marginBottom: '4px' }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{totalRules}</div>
            <div className="sd-kpi-label">Total IP Rules</div>
            <div className="sd-kpi-sublabel">All Rules</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 11 11 13 15 9" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{whitelistCount}</div>
            <div className="sd-kpi-label">Whitelisted IPs</div>
            <div className="sd-kpi-sublabel">{percentWhitelisted}% of total</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{blacklistCount}</div>
            <div className="sd-kpi-label">Blacklisted IPs</div>
            <div className="sd-kpi-sublabel">{percentBlacklisted}% of total</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{blockedCount}</div>
            <div className="sd-kpi-label">Blocked IPs</div>
            <div className="sd-kpi-sublabel">{percentBlocked}% of total</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{expiredCount}</div>
            <div className="sd-kpi-label">Expired IPs</div>
            <div className="sd-kpi-sublabel">{percentExpired}% of total</div>
          </div>
        </div>
      </div>

      {/* Tabs Selector Bar (9 tabs like reference) */}
      <div className="sec-tabs-bar" style={{ marginTop: '4px', marginBottom: '4px' }}>
        {[
          { key: 'all', label: 'All IPs' },
          { key: 'whitelist', label: 'Whitelist' },
          { key: 'blacklist', label: 'Blacklist' },
          { key: 'active_blocks', label: 'Active Blocks' },
          { key: 'auto_blocks', label: 'Automatic Blocks' },
          { key: 'manual_blocks', label: 'Manual Blocks' },
          { key: 'auto_whitelist', label: 'Automatic Whitelist' },
          { key: 'expired_blocks', label: 'Expired Blocks' },
          { key: 'history', label: 'IP History' }
        ].map(tab => (
          <div
            key={tab.key}
            role="button"
            className={`sec-tab-btn ${ipSubTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              setIpSubTab(tab.key);
              setCurrentPage(1);
            }}
          >
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Advanced Filters Panel */}
      {showFilterPanel && (
        <div className="sd-panel sd-filters-panel" style={{ marginTop: '4px', marginBottom: '4px', padding: '14px' }}>
          <div className="sd-filters-grid">
            <div className="sd-filter-field">
              <label>IP Address / CIDR</label>
              <input
                type="text"
                placeholder="Search IP or CIDR..."
                value={filterIp}
                onChange={(e) => setFilterIp(e.target.value)}
              />
            </div>

            <div className="sd-filter-field">
              <label>Scope</label>
              <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)}>
                <option>All</option>
                <option>Admin</option>
                <option>User</option>
                <option>Admin & User</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Action</label>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <option>All</option>
                <option>Blocked</option>
                <option>Blacklisted</option>
                <option>Whitelisted</option>
                <option>Expired</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option>All</option>
                <option>Active</option>
                <option>Whitelisted</option>
                <option>Expired</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Source</label>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                <option>All</option>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Rule Type</label>
              <select value={filterRuleType} onChange={(e) => setFilterRuleType(e.target.value)}>
                <option>All</option>
                <option>IP Rule</option>
                <option>IP Range</option>
                <option>CIDR Block</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Reason</label>
              <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)}>
                <option>All</option>
                <option>OTP Mismatch Limit</option>
                <option>Suspicious Activity</option>
                <option>Office IP</option>
                <option>Login Failure Limit</option>
                <option>Policy Violation</option>
                <option>Invalid Password Limit</option>
                <option>Internal Network</option>
                <option>OTP Resend Limit</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Account / Email</label>
              <input
                type="text"
                placeholder="Search account or email..."
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              />
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

            <div className="sd-filter-field">
              <label>Expiry</label>
              <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)}>
                <option>All</option>
                <option>Active</option>
                <option>Expired</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Security Event</label>
              <select value={filterSecurityEvent} onChange={(e) => setFilterSecurityEvent(e.target.value)}>
                <option>All</option>
                <option>OTP Mismatch</option>
                <option>Login Failure</option>
                <option>Invalid Password</option>
                <option>Suspicious Behavior</option>
                <option>Policy Abuse</option>
                <option>Bypass Access</option>
                <option>OTP Resend Limit</option>
              </select>
            </div>

            {/* Buttons Field */}
            <div className="sd-filter-buttons">
              <button className="sd-btn-reset" onClick={handleResetFilters}>
                🔄 Reset
              </button>
              <button className="sd-btn-filter" onClick={handleApplyFilters}>
                🔍 Filter
              </button>
            </div>
          </div>

          {/* Applied Filter Chips Row */}
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

      {/* Main IP Rules Card Wrapper */}
      <div className="sd-panel" style={{ marginTop: '4px', padding: '16px' }}>
        <div className="sd-panel-header" style={{ marginBottom: '8px' }}>
          <h3>{getSubTabHeaderTitle(ipSubTab)} <span className="sd-records-count">({totalEntries} Records)</span></h3>
        </div>

        {/* IP Rules Table list */}
        <div className="sd-table-container">
          <table className="sd-mini-table sec-ip-table">
            <thead>
              <tr>
                <th width="40">
                  <input type="checkbox" onChange={handleSelectAll} checked={paginatedRules.length > 0 && paginatedRules.every(r => selectedIds.has(r.id))} />
                </th>
                <th>IP Address / CIDR</th>
                <th>Scope</th>
                <th>Action</th>
                <th>Source</th>
                <th>Reason</th>
                <th>Block Type</th>
                <th>Added / Blocked On</th>
                <th>Expires In</th>
                <th>Status</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.length > 0 ? (
                paginatedRules.map((rule) => {
                  // Badges configurations
                  const getScopeBadgeClass = (scope) => {
                    const s = (scope || '').toLowerCase();
                    if (s.includes('admin & user')) return 'badge-scope-both';
                    if (s.includes('admin')) return 'badge-scope-admin';
                    if (s.includes('user')) return 'badge-scope-user';
                    if (s.includes('b2b')) return 'badge-scope-b2b';
                    return 'badge-scope-default';
                  };

                  const getActionBadgeClass = (act) => {
                    const a = (act || '').toLowerCase();
                    if (a === 'whitelisted') return 'badge-action-whitelist';
                    if (a === 'blocked') return 'badge-action-blocked';
                    if (a === 'blacklisted') return 'badge-action-blacklist';
                    return 'badge-action-expired';
                  };

                  const getSourceBadgeClass = (src) => {
                    return (src || '').toLowerCase() === 'automatic' ? 'badge-source-auto' : 'badge-source-manual';
                  };

                  const getBlockTypeBadgeClass = (bt) => {
                    return (bt || '').toLowerCase() === 'temporary' ? 'badge-block-temp' : 'badge-block-perm';
                  };

                  const getStatusBadgeClass = (st) => {
                    const s = (st || '').toLowerCase();
                    if (s === 'active') return 'badge-status-active';
                    if (s === 'whitelisted') return 'badge-status-whitelist';
                    return 'badge-status-expired';
                  };

                  return (
                    <tr key={rule.id} className={selectedIds.has(rule.id) ? 'row-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(rule.id)} onChange={() => handleSelectRow(rule.id)} />
                      </td>
                      <td className="cell-ip">{rule.ipAddress}</td>
                      <td>
                        <span className={`badge-custom ${getScopeBadgeClass(rule.scope)}`}>{rule.scope}</span>
                      </td>
                      <td>
                        <span className={`badge-custom ${getActionBadgeClass(rule.action)}`}>{rule.action}</span>
                      </td>
                      <td>
                        <span className={`badge-custom ${getSourceBadgeClass(rule.source)}`}>{rule.source}</span>
                      </td>
                      <td className="cell-reason">{rule.reason}</td>
                      <td>
                        <span className={`badge-custom ${getBlockTypeBadgeClass(rule.blockType)}`}>{rule.blockType}</span>
                      </td>
                      <td className="cell-date">{rule.addedOn}</td>
                      <td className="cell-expiry">
                        {rule.blockType === 'Temporary' ? (
                          <span className={rule.expiresInSeconds > 0 ? 'expiry-countdown' : 'expiry-expired'}>
                            {formatExpiresIn(rule.expiresInSeconds, rule.blockType)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`badge-custom ${getStatusBadgeClass(rule.status)}`}>{rule.status}</span>
                      </td>
                      <td className="cell-created">{rule.createdBy}</td>
                      <td style={{ textAlign: 'right' }}>
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
                    🌐 No IP Management rules matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Admin Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalEntries}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          itemName="Records"
        />

        {/* Real-time sync note */}
        <div className="sd-footer-note" style={{ marginTop: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', color: '#475569', borderLeft: '3px solid #901335' }}>
          <strong>Note:</strong> IP Rules are evaluated in real-time. Changes may take a few seconds to apply across the system infrastructure security group configurations.
        </div>
      </div>

      {/* Drawer Overlay Form Modal for Add and Edit IP Rule (Slide-out Panel) */}
      {(activeDrawer === 'add' || activeDrawer === 'edit') && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'add' ? 'Add IP Rule' : 'Edit IP Rule'}</h3>
                <p>Configure access rules, action overrides, and security notifications.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSaveRule} className="sec-drawer-form">
              <div className="sec-drawer-body">
                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>IP Address / CIDR <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 192.168.1.100 or 192.168.1.0/24"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                    />
                  </div>

                  <div className="drawer-field">
                    <label>Scope <span className="req">*</span></label>
                    <select value={formScope} onChange={(e) => setFormScope(e.target.value)}>
                      <option>User</option>
                      <option>Admin</option>
                      <option>Admin & User</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Action <span className="req">*</span></label>
                    <select value={formAction} onChange={(e) => {
                      setFormAction(e.target.value);
                      if (e.target.value === 'Whitelisted') {
                        setFormBlockType('Permanent');
                      } else {
                        setFormBlockType('Temporary');
                      }
                    }}>
                      <option>Blocked</option>
                      <option>Blacklisted</option>
                      <option>Whitelisted</option>
                      <option>Expired</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Rule Type <span className="req">*</span></label>
                    <select value={formRuleType} onChange={(e) => setFormRuleType(e.target.value)}>
                      <option>IP Rule</option>
                      <option>IP Range</option>
                      <option>CIDR Block</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Block Type <span className="req">*</span></label>
                    <select value={formBlockType} onChange={(e) => setFormBlockType(e.target.value)} disabled={formAction === 'Whitelisted'}>
                      <option>Temporary</option>
                      <option>Permanent</option>
                    </select>
                  </div>

                  {formBlockType === 'Temporary' && (
                    <div className="drawer-field">
                      <label>Duration <span className="req">*</span></label>
                      <div className="duration-input-grp">
                        <input
                          type="number"
                          required
                          value={formDuration}
                          onChange={(e) => setFormDuration(e.target.value)}
                        />
                        <span>Minutes</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Reason <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Select or enter reason"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      list="reasons-list"
                    />
                    <datalist id="reasons-list">
                      <option value="OTP Mismatch Limit" />
                      <option value="Suspicious Activity" />
                      <option value="Office IP" />
                      <option value="Login Failure Limit" />
                      <option value="Policy Violation" />
                      <option value="Invalid Password Limit" />
                      <option value="Internal Network" />
                      <option value="OTP Resend Limit" />
                    </datalist>
                  </div>

                  <div className="drawer-field">
                    <label>Source <span className="req">*</span></label>
                    <select value={formSource} onChange={(e) => setFormSource(e.target.value)}>
                      <option>Manual</option>
                      <option>Automatic</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Security Event</label>
                    <select value={formSecurityEvent} onChange={(e) => setFormSecurityEvent(e.target.value)}>
                      <option value="">Select Security Event</option>
                      <option value="OTP Mismatch">OTP Mismatch</option>
                      <option value="Login Failure">Login Failure</option>
                      <option value="Invalid Password">Invalid Password</option>
                      <option value="Suspicious Behavior">Suspicious Behavior</option>
                      <option value="Policy Abuse">Policy Abuse</option>
                      <option value="Bypass Access">Bypass Access</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Account / Email (Optional)</label>
                    <input
                      type="text"
                      placeholder="Search account or email..."
                      value={formAccount}
                      onChange={(e) => setFormAccount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="drawer-grid-row">
                  <div className="drawer-field">
                    <label>Email Template</label>
                    <select value={formEmailTemplate} onChange={(e) => setFormEmailTemplate(e.target.value)}>
                      <option value="None">None</option>
                      <option value="IP Blocked Notification">IP Blocked Notification</option>
                      <option value="Threat Alert Template">Threat Alert Template</option>
                      <option value="Agent Suspension Template">Agent Suspension Template</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label>Priority</label>
                    <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-field toggle-field">
                  <label className="toggle-label-row">
                    <input
                      type="checkbox"
                      checked={formSendNotification}
                      onChange={(e) => setFormSendNotification(e.target.checked)}
                    />
                    <span className="custom-toggle-slider" />
                    <span>Send Email Notification</span>
                  </label>
                  <span className="toggle-subtext">Yes, send email notification alert message.</span>
                </div>

                <div className="drawer-field">
                  <label>Description (Optional)</label>
                  <textarea
                    placeholder="Enter description..."
                    rows="3"
                    maxLength="255"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                  <div className="char-counter">{formDescription.length}/255</div>
                </div>

                <div className="drawer-field">
                  <label>Expires On</label>
                  <input
                    type="datetime-local"
                    value={formExpiresOn}
                    onChange={(e) => setFormExpiresOn(e.target.value)}
                  />
                </div>
              </div>

              <div className="sec-drawer-footer">
                {activeDrawer === 'add' && (
                  <label className="checkbox-save-label">
                    <input
                      type="checkbox"
                      checked={addAnotherAfterSave}
                      onChange={(e) => setAddAnotherAfterSave(e.target.checked)}
                    />
                    <span>Add Another IP Rule After Save</span>
                  </label>
                )}
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn-drawer-draft" onClick={() => { showToast('Saved draft rule successfully.'); setActiveDrawer(null); }}>
                    Save as Draft
                  </button>
                  <button type="submit" className="btn-drawer-save">
                    {activeDrawer === 'add' ? 'Save Rule' : 'Update Rule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Overlay for IP Rule Details (Slide-out view details panel) */}
      {activeDrawer === 'view' && selectedRule && (
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>IP Rule Details</h3>
                <p>Detailed breakdown for IP rule metadata and logging records.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <div className="sec-drawer-body details-body">
              {/* IP Information Section */}
              <div className="details-section">
                <h4>IP Information</h4>
                <div className="details-grid-list">
                  <div className="details-item">
                    <span className="details-label">IP Address / CIDR</span>
                    <span className="details-value monospace">{selectedRule.ipAddress}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Scope</span>
                    <span className="details-value">{selectedRule.scope}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Action</span>
                    <span className="details-value">{selectedRule.action}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Status</span>
                    <span className={`details-value badge-status ${selectedRule.status === 'Active' ? 'active' : ''}`}>{selectedRule.status}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Rule Type</span>
                    <span className="details-value">{selectedRule.ruleType || 'IP Rule'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Block Type</span>
                    <span className="details-value">{selectedRule.blockType}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Duration</span>
                    <span className="details-value">{selectedRule.durationMinutes ? `${selectedRule.durationMinutes} Minutes` : '—'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Added / Blocked On</span>
                    <span className="details-value">{selectedRule.addedOn}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Expires On</span>
                    <span className="details-value">
                      {selectedRule.blockType === 'Temporary' && selectedRule.expiresInSeconds > 0
                        ? `${selectedRule.addedOn} (${formatExpiresIn(selectedRule.expiresInSeconds, selectedRule.blockType)} left)`
                        : '—'}
                    </span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Source</span>
                    <span className="details-value">{selectedRule.source}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Security Event</span>
                    <span className="details-value">{selectedRule.securityEvent || '—'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Reason</span>
                    <span className="details-value">{selectedRule.reason}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Created By</span>
                    <span className="details-value">{selectedRule.createdBy}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Created On</span>
                    <span className="details-value">{selectedRule.createdOn || selectedRule.addedOn}</span>
                  </div>
                </div>
                <div className="details-desc-box" style={{ marginTop: '12px' }}>
                  <span className="details-label">Description</span>
                  <p className="details-desc-text">{selectedRule.description || 'No description provided.'}</p>
                </div>
              </div>

              {/* Account / Email Section */}
              <div className="details-section">
                <h4>Account / Email</h4>
                <div className="details-grid-list two-col">
                  <div className="details-item">
                    <span className="details-label">Account</span>
                    <span className="details-value">{selectedRule.account || '—'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Email</span>
                    <span className="details-value">{selectedRule.account || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Email Notification Section */}
              <div className="details-section">
                <h4>Email Notification</h4>
                <div className="details-grid-list three-col">
                  <div className="details-item">
                    <span className="details-label">Sent</span>
                    <span className="details-value">{selectedRule.sendNotification ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Email Template</span>
                    <span className="details-value">{selectedRule.emailTemplate || 'None'}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Last Sent On</span>
                    <span className="details-value">{selectedRule.sendNotification ? selectedRule.addedOn : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Activity Summary Section */}
              <div className="details-section">
                <h4>Activity Summary</h4>
                <div className="details-grid-list five-col">
                  <div className="details-item">
                    <span className="details-label">Login Failures</span>
                    <span className="details-value activity-count">{selectedRule.failures?.login ?? 0}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">OTP Mismatches</span>
                    <span className="details-value activity-count">{selectedRule.failures?.otp ?? 0}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Invalid Passwords</span>
                    <span className="details-value activity-count">{selectedRule.failures?.password ?? 0}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">Registrations</span>
                    <span className="details-value activity-count">{selectedRule.failures?.registration ?? 0}</span>
                  </div>
                  <div className="details-item">
                    <span className="details-label">API Violations</span>
                    <span className="details-value activity-count">{selectedRule.failures?.api ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sec-drawer-footer">
              <button type="button" className="btn-details-close" onClick={() => setActiveDrawer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {confirmDeleteModal && selectedRule && (
        <div className="modal-backdrop-overlay" onClick={() => setConfirmDeleteModal(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setConfirmDeleteModal(false)}>✕</span>
            
            <div className="delete-icon-wrapper">
              <div className="delete-trash-circle">🗑️</div>
            </div>

            <h3>Delete IP Rule</h3>
            <p className="delete-subtext">Are you sure you want to delete this IP Rule?<br />This action cannot be undone.</p>

            {/* Rule summary cards details box */}
            <div className="delete-rule-brief">
              <div className="brief-row">
                <span className="brief-lbl">IP Address / CIDR</span>
                <span className="brief-val monospace">{selectedRule.ipAddress}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Scope</span>
                <span className="brief-val">{selectedRule.scope}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Action</span>
                <span className="brief-val">{selectedRule.action}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Reason</span>
                <span className="brief-val">{selectedRule.reason}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Status</span>
                <span className="brief-val font-green">{selectedRule.status}</span>
              </div>
            </div>

            {/* Confirmation typing field */}
            <div className="confirm-type-field" style={{ marginTop: '16px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Please type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                className="confirm-type-input"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
              />
            </div>

            {/* Action buttons */}
            <div className="delete-dialog-buttons" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn-dialog-cancel" onClick={() => setConfirmDeleteModal(false)} style={{ flex: 1, padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                Cancel
              </button>
              <button
                className="btn-dialog-delete"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== 'DELETE'}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: deleteConfirmText === 'DELETE' ? '#ef4444' : '#fca5a5',
                  color: '#fff',
                  cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="sec-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
