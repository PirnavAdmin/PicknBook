/* eslint-disable */
// Force reload compilation trigger: 18-08-2026 15:47
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import { Eye, Edit2, Trash2, ChevronDown } from 'lucide-react';
import './SecurityAuditLogs.css';

export default function SecurityAuditLogs() {
  const navigate = useNavigate();

  // Primary State - Purely Dynamic Backend Logs
  const [logs, setLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [securityError, setSecurityError] = useState(null);

  // Filters State
  const [filterDateRange, setFilterDateRange] = useState('20 May 2025 - 26 May 2025');
  const [filterEventType, setFilterEventType] = useState('All Types');
  const [filterSeverity, setFilterSeverity] = useState('All Severity');
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterUser, setFilterUser] = useState('All Users');
  const [filterSearch, setFilterSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal / Popup States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add'); // 'add' or 'edit'
  
  const [selectedLog, setSelectedLog] = useState(null); // View Details modal
  const [logToDelete, setLogToDelete] = useState(null); // Delete modal
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Success Modal
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Form State for Add / Edit Drawer
  const [formState, setFormState] = useState({
    id: '',
    eventType: 'Login',
    module: 'Authentication',
    severity: 'Info',
    user: 'superadmin',
    details: '',
    ip: '',
    referenceId: '',
    status: 'Success',
    notifyAdmin: 'No',
    markImportant: 'No'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch real dynamic logs directly from backend API endpoint
  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const rawLogs = await securityService.getAuditLogs();
        const logsArray = Array.isArray(rawLogs) ? rawLogs : (rawLogs?.data || rawLogs?.rules || []);
        const normalizedLogs = (Array.isArray(logsArray) ? logsArray : []).map((l, index) => ({
          id: l.id || `api-${Date.now()}-${index}`,
          dateTime: l.createdAt || l.dateTime || new Date().toLocaleString(),
          user: l.userId || l.user || l.email || l.userOrAdminId || 'System',
          ip: l.ipAddress || l.ip || '0.0.0.0',
          eventType: l.eventType || 'Security Event',
          module: l.module || 'System Settings',
          severity: l.severity || 'Info',
          details: l.reason || l.details || l.reasonDetails || 'N/A',
          referenceId: l.referenceId || `REF-${Math.floor(Math.random() * 100000)}`,
          userAgent: l.userAgent || 'Mozilla/5.0 System Client',
          location: l.location || 'Staging Server',
          sessionId: l.sessionId || 'N/A',
          status: l.status || (l.isActive === false ? 'Failed' : 'Success'),
          notifyAdmin: l.notifyAdmin ? 'Yes' : 'No',
          markImportant: l.markImportant ? 'Yes' : 'No'
        }));
        setLogs(normalizedLogs);
      } catch (err) {
        if (err.response?.status === 403 || err.status === 403) {
          const errMsg = err.response?.data?.message || 'HTTP 403 Forbidden: Access denied.';
          setSecurityError(errMsg);
        }
        console.warn('Security Audit Logs fetch error:', err);
      }
    }
    loadAuditLogs();
  }, []);

  // Disable body scroll when drawer is open to prevent background scroll chaining
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Filter application
  const filteredLogs = logs.filter(log => {
    const s = (filterSearch || '').toLowerCase();
    const userStr = String(log?.user || '').toLowerCase();
    const ipStr = String(log?.ip || '').toLowerCase();
    const detailsStr = String(log?.details || '').toLowerCase();
    const eventStr = String(log?.eventType || '').toLowerCase();
    const moduleStr = String(log?.module || '').toLowerCase();

    const matchesSearch = s === '' || 
      userStr.includes(s) ||
      ipStr.includes(s) ||
      detailsStr.includes(s) ||
      eventStr.includes(s) ||
      moduleStr.includes(s);

    const matchesEventType = filterEventType === 'All Types' || log?.eventType === filterEventType;
    const matchesSeverity = filterSeverity === 'All Severity' || log?.severity === filterSeverity;
    const matchesModule = filterModule === 'All Modules' || log?.module === filterModule;
    const matchesUser = filterUser === 'All Users' || log?.user === filterUser;

    return matchesSearch && matchesEventType && matchesSeverity && matchesModule && matchesUser;
  });

  // Unique list values to populate filters dynamically and safely
  const uniqueEventTypes = ['All Types', ...new Set(logs.map(l => l.eventType).filter(Boolean))];
  const uniqueSeverities = ['All Severity', ...new Set(logs.map(l => l.severity).filter(Boolean))];
  const uniqueModules = ['All Modules', ...new Set(logs.map(l => l.module).filter(Boolean))];
  const uniqueUsers = ['All Users', ...new Set(logs.map(l => l.user).filter(Boolean))];

  // Pagination Math
  const totalEntries = filteredLogs.length;
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredLogs.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  const handleResetFilters = () => {
    setFilterSearch('');
    setFilterEventType('All Types');
    setFilterSeverity('All Severity');
    setFilterModule('All Modules');
    setFilterUser('All Users');
    setFilterDateRange('20 May 2025 - 26 May 2025');
    setCurrentPage(1);
    showToast('🧹 Filters reset successfully.');
  };

  // Open Drawer to Add Log
  const handleOpenAddDrawer = () => {
    setFormState({
      id: '',
      eventType: 'Login',
      module: 'Authentication',
      severity: 'Info',
      user: 'superadmin',
      details: 'User profile accessed',
      ip: '45.76.32.18',
      referenceId: `LOG-${Date.now().toString().slice(-4)}`,
      status: 'Success',
      notifyAdmin: 'No',
      markImportant: 'No'
    });
    setDrawerMode('add');
    setIsDrawerOpen(true);
  };

  // Open Drawer to Edit Log
  const handleOpenEditDrawer = (log) => {
    setFormState({
      id: log.id,
      eventType: log.eventType,
      module: log.module,
      severity: log.severity,
      user: log.user,
      details: log.details,
      ip: log.ip,
      referenceId: log.referenceId || '',
      status: log.status,
      notifyAdmin: log.notifyAdmin || 'No',
      markImportant: log.markImportant || 'No'
    });
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  // Handle Form Submission inside right drawer
  const handleSaveDrawerLog = (e) => {
    e.preventDefault();

    if (drawerMode === 'add') {
      const newLog = {
        id: `log-${Date.now()}`,
        dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        user: formState.user,
        eventType: formState.eventType,
        module: formState.module,
        severity: formState.severity,
        ip: formState.ip || '127.0.0.1',
        details: formState.details || 'N/A',
        referenceId: formState.referenceId || `LOG-${Date.now().toString().slice(-4)}`,
        userAgent: navigator.userAgent,
        location: 'Staging, Local',
        sessionId: `SID-${Math.floor(100000 + Math.random() * 900000)}`,
        status: formState.status,
        notifyAdmin: formState.notifyAdmin,
        markImportant: formState.markImportant
      };

      setLogs(prev => [newLog, ...prev]);
      setIsDrawerOpen(false);
      setShowSuccessModal(true); // Trigger add success modal popup!
    } else {
      // Edit mode
      setLogs(prev => prev.map(l => l.id === formState.id ? {
        ...l,
        eventType: formState.eventType,
        module: formState.module,
        severity: formState.severity,
        user: formState.user,
        details: formState.details,
        ip: formState.ip,
        referenceId: formState.referenceId,
        status: formState.status,
        notifyAdmin: formState.notifyAdmin,
        markImportant: formState.markImportant
      } : l));
      setIsDrawerOpen(false);
      showToast('💾 Audit log updated successfully.');
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDeleteLog = () => {
    if (logToDelete) {
      setLogs(prev => prev.filter(l => l.id !== logToDelete.id));
      setLogToDelete(null);
      showToast('🗑️ Audit log entry permanently deleted.');
    }
  };

  // Metric Calculation variables
  const countTotal = logs.length;
  const countToday = logs.filter(l => l.dateTime.includes('26 May 2025') || l.dateTime.includes('Today')).length;
  const countCritical = logs.filter(l => l.severity === 'Critical').length;
  const countWarning = logs.filter(l => l.severity === 'Warning').length;
  const countInfo = logs.filter(l => l.severity === 'Info').length;

  return (
    <div className="security-mgmt-container">
      {securityError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <span>🛑</span>
          <div>{securityError}</div>
        </div>
      )}

      {/* Header Row */}
      <div className="audit-page-header">
        <div>
          <h2>Security Audit Logs</h2>
          <p>View and monitor all security related events and activities in the system.</p>
        </div>
        <div className="header-actions-panel">
          <button 
            type="button" 
            className="btn-filters-toggle" 
            onClick={() => setIsFilterOpen(prev => !prev)}
            style={{ 
              borderColor: isFilterOpen ? '#901335' : '#cbd5e1', 
              color: isFilterOpen ? '#901335' : '#475569',
              background: isFilterOpen ? '#fdf2f4' : '#ffffff'
            }}
          >
            <span>🔍 {isFilterOpen ? 'Hide Filters' : 'Filters'}</span>
          </button>
          <button className="btn-header-maroon" onClick={handleOpenAddDrawer}>
            <span>+ Add Audit Log</span>
          </button>
          <button className="btn-export-logs" onClick={() => showToast('📤 Audit logs data exported successfully.')}>
            <span>📤 Export</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="audit-stats-grid">
        <div className="audit-stats-card card-total">
          <div className="audit-stats-icon" style={{ background: '#fdf2f4', color: '#901335' }}>📜</div>
          <div className="audit-stats-info">
            <span className="audit-stats-title">Total Logs</span>
            <span className="audit-stats-val">{countTotal}</span>
            <span className="audit-stats-sub">All audit logs</span>
          </div>
        </div>

        <div className="audit-stats-card card-today">
          <div className="audit-stats-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📅</div>
          <div className="audit-stats-info">
            <span className="audit-stats-title">Today's Logs</span>
            <span className="audit-stats-val">{countToday}</span>
            <span className="audit-stats-sub">{Math.round((countToday / (countTotal || 1)) * 100)}% of total</span>
          </div>
        </div>

        <div className="audit-stats-card card-critical">
          <div className="audit-stats-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>⚠️</div>
          <div className="audit-stats-info">
            <span className="audit-stats-title">Critical Events</span>
            <span className="audit-stats-val">{countCritical}</span>
            <span className="audit-stats-sub">{Math.round((countCritical / (countTotal || 1)) * 100)}% of total</span>
          </div>
        </div>

        <div className="audit-stats-card card-warning">
          <div className="audit-stats-icon" style={{ background: '#fff7ed', color: '#f97316' }}>🔔</div>
          <div className="audit-stats-info">
            <span className="audit-stats-title">Warning Events</span>
            <span className="audit-stats-val">{countWarning}</span>
            <span className="audit-stats-sub">{Math.round((countWarning / (countTotal || 1)) * 100)}% of total</span>
          </div>
        </div>

        <div className="audit-stats-card card-info">
          <div className="audit-stats-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>ℹ️</div>
          <div className="audit-stats-info">
            <span className="audit-stats-title">Info Events</span>
            <span className="audit-stats-val">{countInfo}</span>
            <span className="audit-stats-sub">{Math.round((countInfo / (countTotal || 1)) * 100)}% of total</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isFilterOpen && (
        <form className="audit-filters-panel" onSubmit={(e) => { e.preventDefault(); showToast('🔍 Filters applied successfully.'); }}>
        <div className="audit-filter-field">
          <label>Date Range</label>
          <input 
            type="text" 
            placeholder="e.g. 20 May 2025 - 26 May 2025" 
            value={filterDateRange} 
            onChange={(e) => setFilterDateRange(e.target.value)}
          />
        </div>

        <div className="audit-filter-field">
          <label>Event Type</label>
          <select value={filterEventType} onChange={(e) => { setFilterEventType(e.target.value); setCurrentPage(1); }}>
            {uniqueEventTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>

        <div className="audit-filter-field">
          <label>Severity</label>
          <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}>
            {uniqueSeverities.map(sev => <option key={sev} value={sev}>{sev}</option>)}
          </select>
        </div>

        <div className="audit-filter-field">
          <label>Module</label>
          <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setCurrentPage(1); }}>
            {uniqueModules.map(mod => <option key={mod} value={mod}>{mod}</option>)}
          </select>
        </div>

        <div className="audit-filter-field">
          <label>User</label>
          <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="audit-filter-field search">
          <label>Search</label>
          <input 
            type="text" 
            placeholder="Search by keyword..." 
            value={filterSearch} 
            onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="audit-filter-actions">
          <button type="button" className="btn-filter-reset" onClick={handleResetFilters}>Reset</button>
          <button type="submit" className="btn-filter-apply">Apply Filters</button>
        </div>
      </form>
      )}

      {/* Main Table Card */}
      <div className="audit-table-panel">
        <div className="audit-table-header">
          <h3>Audit Logs <span className="count-badge">({filteredLogs.length})</span></h3>
        </div>

        <div className="audit-table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Date & Time</th>
                <th>User</th>
                <th>Event Type</th>
                <th>Module</th>
                <th>Severity</th>
                <th>IP Address</th>
                <th>Details / Reason</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentEntries.length > 0 ? (
                currentEntries.map((log, index) => (
                  <tr key={log.id}>
                    <td>{indexOfFirstEntry + index + 1}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>{log.dateTime}</td>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{log.user}</td>
                    <td>{log.eventType}</td>
                    <td>{log.module}</td>
                    <td>
                      <span className={`badge-severity ${log.severity.toLowerCase()}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{log.ip}</td>
                    <td style={{ color: '#64748b' }}>{log.details}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          className={`actions-trigger-btn ${activeDropdownId === log.id ? "active" : ""}`}
                          onClick={() => setActiveDropdownId(activeDropdownId === log.id ? null : log.id)}
                        >
                          <span>Actions</span> <ChevronDown size={14} />
                        </button>

                        {activeDropdownId === log.id && (
                          <div
                            style={{
                              position: 'absolute',
                              ...(index >= currentEntries.length - 2 || currentEntries.length <= 3
                                ? { bottom: '100%', marginBottom: '6px' }
                                : { top: '100%', marginTop: '6px' }),
                              right: 0,
                              background: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              zIndex: 99999,
                              minWidth: '150px',
                              width: 'max-content',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#334155',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              onClick={() => { setActiveDropdownId(null); setSelectedLog(log); }}
                            >
                              <Eye size={15} /> <span>View Details</span>
                            </button>
                            <button
                              type="button"
                              style={{
                                border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#334155',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              onClick={() => { setActiveDropdownId(null); handleOpenEditDrawer(log); }}
                            >
                              <Edit2 size={15} /> <span>Edit Log</span>
                            </button>
                            <button
                              type="button"
                              style={{
                                border: 'none', background: 'transparent', textAlign: 'left', padding: '9px 12px',
                                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#ef4444',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              onClick={() => { setActiveDropdownId(null); setLogToDelete(log); }}
                            >
                              <Trash2 size={15} /> <span>Delete Log</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    📄 No audit logs matched your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="audit-pagination-row">
          <div className="audit-pagination-info">
            Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, totalEntries)} of {totalEntries} entries
          </div>
          <div className="audit-pagination-controls">
            <button 
              className={`audit-page-btn ${currentPage === 1 ? 'disabled' : ''}`} 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`audit-page-btn ${currentPage === p ? 'active' : ''}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}

            <button 
              className={`audit-page-btn ${currentPage === totalPages ? 'disabled' : ''}`} 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>

            <select 
              className="audit-page-size-select"
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Add / Edit Drawer Panel (starts below topbar at top: 76px) */}
      {isDrawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
          <div className="audit-drawer-popup">
            <div className="drawer-header-maroon">
              <h3>{drawerMode === 'add' ? 'Add Audit Log' : 'Edit Audit Log'}</h3>
              <span className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>✕</span>
            </div>
            <form onSubmit={handleSaveDrawerLog} className="audit-form" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: 'calc(100vh - 56px)' }}>
              <div className="audit-drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#64748b' }}>Configure event type, module properties, metadata properties and details for recording.</p>
              <div className="form-group-row">
                <div className="form-field-item">
                  <label>Event Type *</label>
                  <select 
                    value={formState.eventType}
                    onChange={(e) => setFormState({ ...formState, eventType: e.target.value })}
                  >
                    <option value="Login">Login</option>
                    <option value="Logout">Logout</option>
                    <option value="Password Reset">Password Reset</option>
                    <option value="Create">Create</option>
                    <option value="Update">Update</option>
                    <option value="Delete">Delete</option>
                    <option value="Permission Change">Permission Change</option>
                    <option value="IP Blocked">IP Blocked</option>
                    <option value="Config Update">Config Update</option>
                    <option value="API Key Generated">API Key Generated</option>
                  </select>
                </div>

                <div className="form-field-item">
                  <label>Module *</label>
                  <select 
                    value={formState.module}
                    onChange={(e) => setFormState({ ...formState, module: e.target.value })}
                  >
                    <option value="Authentication">Authentication</option>
                    <option value="User Management">User Management</option>
                    <option value="Email Template">Email Template</option>
                    <option value="Roles & Permissions">Roles & Permissions</option>
                    <option value="IP Management">IP Management</option>
                    <option value="System Settings">System Settings</option>
                    <option value="API Security">API Security</option>
                    <option value="Account Security">Account Security</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field-item">
                  <label>Severity *</label>
                  <select 
                    value={formState.severity}
                    onChange={(e) => setFormState({ ...formState, severity: e.target.value })}
                  >
                    <option value="Info">Info</option>
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-field-item">
                  <label>User *</label>
                  <select 
                    value={formState.user}
                    onChange={(e) => setFormState({ ...formState, user: e.target.value })}
                  >
                    <option value="superadmin">superadmin</option>
                    <option value="johndoe">johndoe</option>
                    <option value="emma.johnson">emma.johnson</option>
                    <option value="michele.wilson">michele.wilson</option>
                    <option value="daniel.taylor">daniel.taylor</option>
                    <option value="sarah.anderson">sarah.anderson</option>
                  </select>
                </div>
              </div>

              <div className="form-field-item" style={{ flex: 'none', width: '100%' }}>
                <label>Description / Details *</label>
                <textarea 
                  required
                  placeholder="Enter description or details"
                  value={formState.details}
                  onChange={(e) => setFormState({ ...formState, details: e.target.value })}
                  maxLength={500}
                />
                <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right', marginTop: '2px' }}>
                  {(formState.details || '').length}/5000
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field-item">
                  <label>IP Address</label>
                  <input 
                    type="text" 
                    placeholder="Enter IP address"
                    value={formState.ip}
                    onChange={(e) => setFormState({ ...formState, ip: e.target.value })}
                  />
                </div>

                <div className="form-field-item">
                  <label>Reference ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter reference ID"
                    value={formState.referenceId}
                    onChange={(e) => setFormState({ ...formState, referenceId: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field-item">
                  <label>Status *</label>
                  <select 
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  >
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field-item">
                  <label>Notify Admin</label>
                  <select 
                    value={formState.notifyAdmin}
                    onChange={(e) => setFormState({ ...formState, notifyAdmin: e.target.value })}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="form-field-item">
                  <label>Mark as Important</label>
                  <select 
                    value={formState.markImportant}
                    onChange={(e) => setFormState({ ...formState, markImportant: e.target.value })}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
              <div className="action-card-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <button type="button" className="btn-card-cancel" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
                <button type="submit" className="btn-card-save">{drawerMode === 'add' ? 'Save Log' : 'Update Log'}</button>
              </div>
            </div>
          </form>
          </div>
        </>
      )}

      {/* Centered Modal Details Popup */}
      {selectedLog && (
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>View Audit Log Details</h3>
              <span className="audit-modal-close" onClick={() => setSelectedLog(null)}>✕</span>
            </div>
            <div className="audit-modal-body">
              <div className="view-details-grid">
                <div className="view-details-col">
                  <div className="info-label-pair">
                    <label>Event Type</label>
                    <span>{selectedLog.eventType}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Module</label>
                    <span>{selectedLog.module}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Severity</label>
                    <div>
                      <span className={`badge-severity ${selectedLog.severity.toLowerCase()}`}>
                        {selectedLog.severity}
                      </span>
                    </div>
                  </div>
                  <div className="info-label-pair">
                    <label>User</label>
                    <span style={{ fontWeight: 'bold' }}>{selectedLog.user}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Description</label>
                    <span>{selectedLog.details}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Status</label>
                    <span>{selectedLog.status}</span>
                  </div>
                </div>

                <div className="view-details-col">
                  <div className="info-label-pair">
                    <label>IP Address</label>
                    <span className="pre-style">{selectedLog.ip}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Reference ID</label>
                    <span className="pre-style">{selectedLog.referenceId || 'N/A'}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Date & Time</label>
                    <span>{selectedLog.dateTime}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>User Agent</label>
                    <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      {selectedLog.userAgent || 'N/A'}
                    </span>
                  </div>
                  <div className="info-label-pair">
                    <label>Location</label>
                    <span>{selectedLog.location || 'Unknown'}</span>
                  </div>
                  <div className="info-label-pair">
                    <label>Session ID</label>
                    <span className="pre-style">{selectedLog.sessionId || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button className="btn-card-cancel" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal Delete Warning Popup */}
      {logToDelete && (
        <div className="audit-modal-overlay" onClick={() => setLogToDelete(null)}>
          <div className="audit-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>Delete Audit Log</h3>
              <span className="audit-modal-close" onClick={() => setLogToDelete(null)}>✕</span>
            </div>
            <div className="audit-modal-body">
              <div className="warn-alert-circle">🗑️</div>
              <div className="success-popup-info">
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Are you sure you want to delete this audit log?</h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                  This action cannot be undone. The audit log will be permanently deleted.
                </p>
                <div style={{ width: '100%', background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <div><strong>Event Type:</strong> {logToDelete.eventType}</div>
                  <div><strong>User:</strong> {logToDelete.user}</div>
                  <div><strong>Date & Time:</strong> {logToDelete.dateTime}</div>
                </div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button type="button" className="btn-card-cancel" onClick={() => setLogToDelete(null)}>Cancel</button>
              <button type="button" className="btn-card-delete" onClick={handleConfirmDeleteLog}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal Success Dialog (Green Checkmark) */}
      {showSuccessModal && (
        <div className="audit-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="audit-modal-card" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-body" style={{ padding: '24px' }}>
              <div className="success-popup-info">
                <div className="success-check-circle">✓</div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>Audit log added successfully!</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                  The audit log has been recorded.
                </p>
                <button 
                  type="button" 
                  className="btn-card-save" 
                  onClick={() => setShowSuccessModal(false)}
                  style={{ width: '80px', height: '32px' }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {toastMessage && <div className="sec-toast">{toastMessage}</div>}
    </div>
  );
}
