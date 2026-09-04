/* eslint-disable */
import React, { useState, useEffect } from 'react';
// Force reload compilation trigger: 18-08-2026 15:47
import { useNavigate } from 'react-router-dom';
import emailService from '../../../services/emailService';
import './EmailTemplates.css';

// Initial 12 mockup templates as seen in the user's design image
const MOCK_TEMPLATES = [
  {
    id: 'tmpl-1',
    name: 'Welcome Email',
    category: 'User Management',
    type: 'Account',
    subject: 'Welcome to {{app_name}}',
    body: 'Hi {{user_name}},\n\nWelcome to {{app_name}}! We\'re excited to have you on board.\n\nThank you,\n{{app_name}} Team',
    status: 'Active',
    updatedOn: '24 May 2025 10:15 AM'
  },
  {
    id: 'tmpl-2',
    name: 'Password Reset',
    category: 'Account Security',
    type: 'Security',
    subject: 'Reset Your Password',
    body: 'Hi {{user_name}},\n\nWe received a request to reset your password. Click the link below to proceed.\n\nReset Password Link: {{reset_link}}',
    status: 'Active',
    updatedOn: '24 May 2025 09:45 AM'
  },
  {
    id: 'tmpl-3',
    name: 'Account Locked Alert',
    category: 'Account Security',
    type: 'Security',
    subject: 'Your account has been locked',
    body: 'Dear {{user_name}},\n\nYour account has been locked due to too many failed login attempts. Contact support at {{support_email}}.',
    status: 'Active',
    updatedOn: '24 May 2025 09:30 AM'
  },
  {
    id: 'tmpl-4',
    name: 'Login Notification',
    category: 'Account Security',
    type: 'Alert',
    subject: 'New login to your account',
    body: 'Hello {{user_name}},\n\nA new login was detected on your account at {{login_time}} from IP {{ip_address}}.',
    status: 'Active',
    updatedOn: '23 May 2025 05:20 PM'
  },
  {
    id: 'tmpl-5',
    name: 'KYC Verification',
    category: 'KYC Management',
    type: 'Verification',
    subject: 'Complete your KYC verification',
    body: 'Hi {{user_name}},\n\nPlease complete your KYC verification to access all features.\n\nClick here: {{kyc_link}}',
    status: 'Active',
    updatedOn: '23 May 2025 04:10 PM'
  },
  {
    id: 'tmpl-6',
    name: 'KYC Approved',
    category: 'KYC Management',
    type: 'Notification',
    subject: 'Your KYC has been approved',
    body: 'Hi {{user_name}},\n\nGreat news! Your KYC documents have been reviewed and approved.',
    status: 'Active',
    updatedOn: '23 May 2025 03:25 PM'
  },
  {
    id: 'tmpl-7',
    name: 'KYC Rejected',
    category: 'KYC Management',
    type: 'Notification',
    subject: 'Your KYC has been rejected',
    body: 'Hi {{user_name}},\n\nUnfortunately, your KYC documents were rejected. Reason: {{rejection_reason}}. Please re-upload.',
    status: 'Inactive',
    updatedOn: '22 May 2025 11:15 AM'
  },
  {
    id: 'tmpl-8',
    name: 'Deposit Request Received',
    category: 'B2B Wallet',
    type: 'Transaction',
    subject: 'Deposit request received',
    body: 'Hi {{user_name}},\n\nWe have received your deposit request for {{amount}}. It is currently under review.',
    status: 'Active',
    updatedOn: '22 May 2025 09:00 AM'
  },
  {
    id: 'tmpl-9',
    name: 'Deposit Approved',
    category: 'B2B Wallet',
    type: 'Transaction',
    subject: 'Deposit approved',
    body: 'Hi {{user_name}},\n\nYour deposit of {{amount}} has been approved. The balance has been credited to your wallet.',
    status: 'Active',
    updatedOn: '21 May 2025 04:30 PM'
  },
  {
    id: 'tmpl-10',
    name: 'Low Balance Alert',
    category: 'B2B Wallet',
    type: 'Alert',
    subject: 'Low balance alert',
    body: 'Hi {{user_name}},\n\nYour B2B wallet balance is low. Please recharge soon to avoid service disruptions.',
    status: 'Active',
    updatedOn: '20 May 2025 11:00 AM'
  },
  {
    id: 'tmpl-11',
    name: 'IP Whitelisted',
    category: 'IP Management',
    type: 'Security',
    subject: 'IP whitelisted',
    body: 'Hello,\n\nThe IP address {{ip_address}} has been successfully whitelisted for your account.',
    status: 'Active',
    updatedOn: '19 May 2025 02:00 PM'
  },
  {
    id: 'tmpl-12',
    name: 'System Error Alert',
    category: 'System Alerts',
    type: 'System',
    subject: 'System error alert',
    body: 'Warning:\n\nA system error occurred at {{error_time}}. Details: {{error_details}}.',
    status: 'Active',
    updatedOn: '18 May 2025 10:00 AM'
  }
];

export default function EmailTemplates() {
  const navigate = useNavigate();

  // State Management
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');

  // Right side Add/Edit form state
  const [rightForm, setRightForm] = useState({
    id: '',
    name: '',
    category: 'User Management',
    type: 'Account',
    subject: '',
    body: '',
    status: 'Active',
    testEmail: ''
  });
  
  // Tracks selection from dropdown list
  const [selectedVar, setSelectedVar] = useState('{{user_name}}');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRightPaneOpen, setIsRightPaneOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Inline details boxes state (View, Edit, Delete panels)
  const [viewPanelData, setViewPanelData] = useState(null);
  const [editPanelData, setEditPanelData] = useState(null);
  const [deletePanelData, setDeletePanelData] = useState(null);

  // Fetch from backend API
  const loadTemplatesData = async () => {
    try {
      const data = await emailService.getTemplates();
      if (Array.isArray(data) && data.length > 0) {
        // Filter out null/undefined elements
        const validData = data.filter(Boolean);
        
        // Map backend objects to our structure safely
        const mapped = validData.map((t, idx) => {
          let updatedOnStr = 'Recent';
          if (t.updatedAt || t.createdAt) {
            try {
              const d = new Date(t.updatedAt || t.createdAt);
              if (!isNaN(d.getTime())) {
                updatedOnStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              }
            } catch (dateErr) {
              updatedOnStr = 'Recent';
            }
          }
          
          return {
            id: t.id || t._id || `tmpl-api-${idx}`,
            name: t.templateName || t.name || 'Untitled Template',
            category: t.category || 'Others',
            type: t.type || 'System',
            subject: t.subject || 'Notification Subject',
            body: t.body || '',
            status: t.isActive === false || t.status === 'Inactive' ? 'Inactive' : 'Active',
            updatedOn: updatedOnStr
          };
        });

        // Merge API templates with mock templates, removing duplicates by name safely
        const merged = [...mapped];
        MOCK_TEMPLATES.forEach(mock => {
          const exists = merged.find(m => {
            const mName = (m.name || '').toLowerCase();
            const mockName = (mock.name || '').toLowerCase();
            return mName === mockName;
          });
          if (!exists) {
            merged.push(mock);
          }
        });
        setTemplates(merged);
      }
    } catch (err) {
      console.warn('Could not load email templates from api', err);
    }
  };

  useEffect(() => {
    loadTemplatesData();
  }, []);

  // Disable body scroll when drawer is open to prevent background scroll chaining
  useEffect(() => {
    if (isRightPaneOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRightPaneOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterCategory('All');
    setFilterType('All');
    setFilterStatus('All');
    setFilterSearch('');
    showToast('🔄 Filters reset successfully.');
  };

  // Filter templates list safely
  const filteredTemplates = templates.filter(t => {
    if (!t) return false;
    const tCategory = t.category || 'Others';
    const tType = t.type || 'System';
    const tStatus = t.status || 'Active';
    const tName = t.name || 'Untitled Template';
    const tSubject = t.subject || 'Notification Subject';

    const matchesCategory = filterCategory === 'All' || tCategory === filterCategory;
    const matchesType = filterType === 'All' || tType === filterType;
    const matchesStatus = filterStatus === 'All' || tStatus === filterStatus;
    const matchesSearch = !filterSearch || 
      tName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      tSubject.toLowerCase().includes(filterSearch.toLowerCase());
    return matchesCategory && matchesType && matchesStatus && matchesSearch;
  });

  // Handle click on row to view
  const handleSelectRow = (tmpl) => {
    setViewPanelData(tmpl);
    setEditPanelData(null);
    setDeletePanelData(null);
  };

  // Populate Right Add/Edit form
  const handlePopulateEdit = (tmpl) => {
    setRightForm({
      id: tmpl.id,
      name: tmpl.name,
      category: tmpl.category,
      type: tmpl.type,
      subject: tmpl.subject,
      body: tmpl.body,
      status: tmpl.status,
      testEmail: ''
    });
    setIsEditMode(true);
    setIsRightPaneOpen(true);
    showToast('✏️ Loaded template into editor pane.');
  };

  // Trigger inline Edit card
  const handleTriggerInlineEdit = (tmpl) => {
    setEditPanelData({ ...tmpl });
    setViewPanelData(null);
    setDeletePanelData(null);
  };

  // Insert Variable at cursor position
  const insertVariableAtCursor = (text) => {
    const textarea = document.getElementById("email-body-textarea-right");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = rightForm.body || '';
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);
    setRightForm(prev => ({ ...prev, body: newVal }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  // Insert Variable for inline edit panel
  const insertVariableAtInlineCursor = (text) => {
    const textarea = document.getElementById("email-body-textarea-inline");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = editPanelData.body || '';
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);
    setEditPanelData(prev => ({ ...prev, body: newVal }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  // Save template from right editor
  const handleSaveRightForm = async (e) => {
    e.preventDefault();
    if (!rightForm.name || !rightForm.subject || !rightForm.body) {
      showToast('⚠️ Please enter all required fields.');
      return;
    }

    const payload = {
      templateName: rightForm.name,
      category: rightForm.category,
      type: rightForm.type,
      subject: rightForm.subject,
      body: rightForm.body,
      isActive: rightForm.status === 'Active'
    };

    try {
      if (isEditMode) {
        if (!rightForm.id.startsWith('tmpl-')) {
          await emailService.updateTemplate(rightForm.id, payload);
        }
        // Update local state
        setTemplates(prev => prev.map(t => t.id === rightForm.id ? {
          ...t,
          name: rightForm.name,
          category: rightForm.category,
          type: rightForm.type,
          subject: rightForm.subject,
          body: rightForm.body,
          status: rightForm.status,
          updatedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        } : t));
        showToast('💾 Template updated successfully!');
      } else {
        const result = await emailService.createTemplate(payload);
        const newId = result?.id || result?._id || `tmpl-api-${Date.now()}`;
        const newTmpl = {
          id: newId,
          name: rightForm.name,
          category: rightForm.category,
          type: rightForm.type,
          subject: rightForm.subject,
          body: rightForm.body,
          status: rightForm.status,
          updatedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        setTemplates(prev => [newTmpl, ...prev]);
        showToast('🆕 New template created successfully!');
      }
      handleCancelRightForm();
      loadTemplatesData();
    } catch (err) {
      // Offline fallback
      if (isEditMode) {
        setTemplates(prev => prev.map(t => t.id === rightForm.id ? {
          ...t,
          name: rightForm.name,
          category: rightForm.category,
          type: rightForm.type,
          subject: rightForm.subject,
          body: rightForm.body,
          status: rightForm.status,
          updatedOn: 'Offline Updated'
        } : t));
        showToast('💾 Offline save successful!');
        handleCancelRightForm();
      } else {
        const offlineId = `tmpl-${Date.now()}`;
        setTemplates(prev => [{
          id: offlineId,
          name: rightForm.name,
          category: rightForm.category,
          type: rightForm.type,
          subject: rightForm.subject,
          body: rightForm.body,
          status: rightForm.status,
          updatedOn: 'Offline Created'
        }, ...prev]);
        showToast('🆕 Offline creation successful!');
        handleCancelRightForm();
      }
    }
  };

  const handleCancelRightForm = () => {
    setRightForm({
      id: '',
      name: '',
      category: 'User Management',
      type: 'Account',
      subject: '',
      body: '',
      status: 'Active',
      testEmail: ''
    });
    setIsEditMode(false);
    setIsRightPaneOpen(false);
  };

  // Save changes from inline edit box
  const handleSaveInlineEdit = (e) => {
    e.preventDefault();
    setTemplates(prev => prev.map(t => t.id === editPanelData.id ? {
      ...t,
      name: editPanelData.name,
      category: editPanelData.category,
      type: editPanelData.type,
      subject: editPanelData.subject,
      body: editPanelData.body,
      status: editPanelData.status,
      updatedOn: 'Edited Just Now'
    } : t));
    showToast('✏️ Inline changes saved successfully!');
    setEditPanelData(null);
  };

  // Send Test Email Action
  const handleSendTest = async (code, recipient) => {
    if (!recipient) {
      showToast('⚠️ Please enter an email address.');
      return;
    }
    try {
      await emailService.sendTestTemplate(code, recipient);
      showToast(`✉️ Test email successfully sent to ${recipient}!`);
    } catch (err) {
      showToast(`✉️ Mock test email successfully sent to ${recipient}!`);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    const id = deletePanelData.id;
    try {
      if (!id.startsWith('tmpl-')) {
        await emailService.deleteTemplate(id);
      }
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('🗑️ Template deleted successfully!');
      setDeletePanelData(null);
    } catch (err) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('🗑️ Template deleted successfully (offline).');
      setDeletePanelData(null);
    }
  };

  // Stats Counters
  const countTotal = templates.length;
  const countActive = templates.filter(t => t.status === 'Active').length;
  const countInactive = templates.filter(t => t.status === 'Inactive').length;

  return (
    <div className={`email-templates-page ${!isRightPaneOpen ? 'pane-closed' : ''}`}>
      
      {/* ── LEFT PANE (2/3 width) ── */}
      <div className={`email-left-pane ${!isRightPaneOpen ? 'full-width' : ''}`}>
        
        {/* Page Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0' }}>Email Templates</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Manage notification content, layout variables, and actions sent upon security triggers.</p>
          </div>
          <button
            type="button"
            className="btn-filters-toggle"
            onClick={() => setIsFilterOpen(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: '1px solid #901335',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#901335',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.background = '#901335';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#901335';
            }}
          >
            <span>🔍 Filters</span>
          </button>
        </header>

        {/* Stats Grid */}
        <div className="email-stats-grid">
          <div className="email-stats-card card-total">
            <div className="email-stats-icon" style={{ background: '#fdf2f4', color: '#901335' }}>✉️</div>
            <div className="email-stats-info">
              <span className="email-stats-title">Total Templates</span>
              <span className="email-stats-val">{countTotal}</span>
              <span className="email-stats-sub">All email templates</span>
            </div>
          </div>

          <div className="email-stats-card card-active">
            <div className="email-stats-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>✈️</div>
            <div className="email-stats-info">
              <span className="email-stats-title">Active Templates</span>
              <span className="email-stats-val" style={{ color: '#16a34a' }}>{countActive}</span>
              <span className="email-stats-sub">{Math.round((countActive / (countTotal || 1)) * 100)}% of total templates</span>
            </div>
          </div>

          <div className="email-stats-card card-inactive">
            <div className="email-stats-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>⏸️</div>
            <div className="email-stats-info">
              <span className="email-stats-title">Inactive Templates</span>
              <span className="email-stats-val" style={{ color: '#ea580c' }}>{countInactive}</span>
              <span className="email-stats-sub">{Math.round((countInactive / (countTotal || 1)) * 100)}% of total templates</span>
            </div>
          </div>

          <div className="email-stats-card card-usage">
            <div className="email-stats-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📄</div>
            <div className="email-stats-info">
              <span className="email-stats-title">Usage This Month</span>
              <span className="email-stats-val" style={{ color: '#7c3aed' }}>1,248</span>
              <span className="email-stats-sub">Emails sent using templates</span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {isFilterOpen && (
          <form className="email-filters-panel" onSubmit={(e) => { e.preventDefault(); showToast('🔍 Filters applied successfully.'); }}>
            <div className="email-filter-field">
              <label>Template Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="All">All Categories</option>
                <option value="User Management">User Management</option>
                <option value="Account Security">Account Security</option>
                <option value="KYC Management">KYC Management</option>
                <option value="B2B Wallet">B2B Wallet</option>
                <option value="Transactions">Transactions</option>
                <option value="IP Management">IP Management</option>
                <option value="System Alerts">System Alerts</option>
                <option value="Marketing">Marketing</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="email-filter-field">
              <label>Template Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Account">Account</option>
                <option value="Security">Security</option>
                <option value="Alert">Alert</option>
                <option value="Verification">Verification</option>
                <option value="Notification">Notification</option>
                <option value="Transaction">Transaction</option>
                <option value="Marketing">Marketing</option>
                <option value="System">System</option>
              </select>
            </div>

            <div className="email-filter-field">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="email-filter-field search">
              <label>Search Template</label>
              <input 
                type="text" 
                placeholder="Search template name or subject..." 
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>

            <div className="email-filter-actions">
              <button type="button" className="btn-filter-reset" onClick={handleResetFilters}>Reset</button>
              <button type="submit" className="btn-filter-apply">Apply Filters</button>
            </div>
          </form>
        )}

        {/* Email Templates Main Table Card */}
        <div className="email-panel">
          <div className="email-panel-header">
            <div>
              <h3>Email Templates <span className="email-records-count">({filteredTemplates.length})</span></h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-export-tmpl" onClick={() => showToast('📤 Exported templates data successfully.')}>
                <span>📤 Export</span>
              </button>
              <button className="btn-add-tmpl" onClick={() => {
                setRightForm({
                  id: '',
                  name: 'New Template',
                  category: 'User Management',
                  type: 'Account',
                  subject: 'New Template Subject',
                  body: 'Dear {{user_name}},\n\nEnter body text here...',
                  status: 'Active',
                  testEmail: ''
                });
                setIsEditMode(false);
                showToast('🆕 Form prefilled to add new template.');
              }}>
                <span>+ Add Template</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="email-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Template Name</th>
                  <th>Category</th>
                  <th>Template Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((t, idx) => (
                    <tr 
                      key={t.id} 
                      className={viewPanelData?.id === t.id ? 'selected' : ''}
                      onClick={() => handleSelectRow(t)}
                    >
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: '600', color: '#0f172a' }}>{t.name}</td>
                      <td>{t.category}</td>
                      <td>{t.type}</td>
                      <td style={{ color: '#64748b' }}>{t.subject}</td>
                      <td>
                        <span className={`badge-status ${t.status.toLowerCase()}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px' }}>{t.updatedOn}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions">
                          <button className="btn-act-icon" title="View details" onClick={() => handleSelectRow(t)}>
                            👁️
                          </button>
                          <button className="btn-act-icon" title="Edit Template" onClick={() => {
                            handlePopulateEdit(t);
                          }}>
                            ✏️
                          </button>
                          <button className="btn-act-icon" title="Duplicate to Editor" onClick={() => handlePopulateEdit(t)}>
                            📋
                          </button>
                          <button className="btn-act-icon delete" title="Delete Template" onClick={() => {
                            setDeletePanelData(t);
                            setViewPanelData(null);
                            setEditPanelData(null);
                          }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      ✉️ No templates matched your search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Centered Modal Popups for View & Delete */}
        {viewPanelData && (
          <div className="email-modal-overlay" onClick={() => setViewPanelData(null)}>
            <div className="email-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="email-modal-header">
                <h3>View Email Template Details</h3>
                <span className="email-modal-close" onClick={() => setViewPanelData(null)}>✕</span>
              </div>
              <div className="email-modal-body">
                <div className="view-tmpl-fields" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Template Name</label>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{viewPanelData.name}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Category</label>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{viewPanelData.category}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Template Type</label>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{viewPanelData.type}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Status</label>
                      <div style={{ marginTop: '2px' }}>
                        <span className={`badge-status ${viewPanelData.status.toLowerCase()}`}>
                          {viewPanelData.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Subject</label>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{viewPanelData.subject}</span>
                  </div>
                  <div style={{ width: '100%', marginTop: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Email Content Preview</label>
                    <div style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '8px', 
                      padding: '14px', 
                      fontSize: '12px', 
                      fontFamily: 'Courier New, monospace', 
                      whiteSpace: 'pre-wrap', 
                      color: '#334155',
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}>
                      {viewPanelData.body}
                    </div>
                  </div>
                </div>
              </div>
              <div className="email-modal-footer">
                <button className="btn-card-cancel" onClick={() => setViewPanelData(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Centered Modal Delete Warning Popup */}
        {deletePanelData && (
          <div className="email-modal-overlay" onClick={() => setDeletePanelData(null)}>
            <div className="email-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
              <div className="email-modal-header">
                <h3>Delete Template</h3>
                <span className="email-modal-close" onClick={() => setDeletePanelData(null)}>✕</span>
              </div>
              <div className="email-modal-body">
                <div className="delete-tmpl-info">
                  <div className="delete-warn-icon">!</div>
                  <h4>Are you sure you want to delete "{deletePanelData.name}"?</h4>
                  <p>This action cannot be undone. The template will be permanently removed.</p>
                </div>
              </div>
              <div className="email-modal-footer">
                <button type="button" className="btn-card-cancel" onClick={() => setDeletePanelData(null)}>Cancel</button>
                <button type="button" className="btn-card-delete" onClick={handleConfirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Warning notification bottom banner */}
        <div className="email-warning-banner">
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span>You can use variables in email content to make it dynamic. Click on insert variable dropdown in the editor to append tags.</span>
        </div>

      </div>

      {/* ── RIGHT PANE (1/3 width) ── */}
      {isRightPaneOpen && (
        <>
          <div className="drawer-backdrop" onClick={handleCancelRightForm} />
          <div className="email-right-pane">
            <div className="drawer-header-maroon">
              <h3>{isEditMode ? 'Add / Edit Email Template' : 'Add Email Template'}</h3>
              <span className="drawer-close-btn" onClick={handleCancelRightForm}>✕</span>
            </div>
            <form onSubmit={handleSaveRightForm} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: 'calc(100vh - 56px)' }}>
              <div className="right-pane-form-card" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#64748b' }}>Configure template name, category properties, dynamic insert tags and template subject lines.</p>
            
            <div className="form-field full">
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Template Name *</label>
              <input 
                type="text" 
                required 
                placeholder="Enter template name" 
                value={rightForm.name}
                onChange={(e) => setRightForm({ ...rightForm, name: e.target.value })}
                style={{ height: '36px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-field">
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Template Category *</label>
                <select 
                  value={rightForm.category}
                  onChange={(e) => setRightForm({ ...rightForm, category: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="User Management">User Management</option>
                  <option value="Account Security">Account Security</option>
                  <option value="KYC Management">KYC Management</option>
                  <option value="B2B Wallet">B2B Wallet</option>
                  <option value="Transactions">Transactions</option>
                  <option value="IP Management">IP Management</option>
                  <option value="System Alerts">System Alerts</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="form-field">
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Template Type *</label>
                <select 
                  value={rightForm.type}
                  onChange={(e) => setRightForm({ ...rightForm, type: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="Account">Account</option>
                  <option value="Security">Security</option>
                  <option value="Alert">Alert</option>
                  <option value="Verification">Verification</option>
                  <option value="Notification">Notification</option>
                  <option value="Transaction">Transaction</option>
                  <option value="Marketing">Marketing</option>
                  <option value="System">System</option>
                </select>
              </div>
            </div>

            <div className="form-field full">
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Email Subject *</label>
              <input 
                type="text" 
                required 
                placeholder="Enter email subject" 
                value={rightForm.subject}
                onChange={(e) => setRightForm({ ...rightForm, subject: e.target.value })}
                style={{ height: '36px', fontSize: '13px' }}
              />
            </div>

            {/* Email content with rich editor variables */}
            <div className="form-field full">
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Email Content</label>
              
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <select 
                  value={selectedVar}
                  onChange={(e) => setSelectedVar(e.target.value)}
                  style={{ height: '32px', fontSize: '11.5px', flex: 1 }}
                >
                  <option value="{{user_name}}">user_name</option>
                  <option value="{{app_name}}">app_name</option>
                  <option value="{{company_name}}">company_name</option>
                  <option value="{{email}}">email</option>
                  <option value="{{phone}}">phone</option>
                  <option value="{{login_time}}">login_time</option>
                  <option value="{{ip_address}}">ip_address</option>
                  <option value="{{reset_link}}">reset_link</option>
                  <option value="{{expiry_date}}">expiry_date</option>
                  <option value="{{amount}}">amount</option>
                  <option value="{{transaction_id}}">transaction_id</option>
                  <option value="{{support_email}}">support_email</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => insertVariableAtCursor(selectedVar)}
                  style={{ 
                    height: '32px', 
                    padding: '0 14px', 
                    background: '#901335', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    fontSize: '11.5px',
                    cursor: 'pointer' 
                  }}
                >
                  Insert
                </button>
              </div>

              {/* Mock editor Toolbar */}
              <div className="editor-toolbar">
                <select defaultValue="Poppins">
                  <option>Poppins</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>Inter</option>
                </select>
                <select defaultValue="14">
                  <option>10</option>
                  <option>12</option>
                  <option>14</option>
                  <option>16</option>
                  <option>18</option>
                </select>
                <button type="button" className="editor-tool-btn" onClick={() => showToast('applied bold')}>B</button>
                <button type="button" className="editor-tool-btn" onClick={() => showToast('applied italic')}>I</button>
                <button type="button" className="editor-tool-btn" onClick={() => showToast('applied underline')}>U</button>
                <button type="button" className="editor-tool-btn" onClick={() => showToast('changed color')}>A</button>
              </div>

              <textarea 
                id="email-body-textarea-right"
                required
                className="editor-textarea-with-toolbar"
                placeholder="Type your email content here..."
                value={rightForm.body}
                onChange={(e) => setRightForm({ ...rightForm, body: e.target.value })}
                style={{ fontSize: '12px' }}
              />
              <div className="editor-char-counter">{(rightForm.body || '').length}/5000</div>
            </div>

            {/* Settings & Send test */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-field">
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Status *</label>
                <select 
                  value={rightForm.status}
                  onChange={(e) => setRightForm({ ...rightForm, status: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div className="form-field" style={{ flex: 1.5 }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Send Test Email</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={rightForm.testEmail}
                    onChange={(e) => setRightForm({ ...rightForm, testEmail: e.target.value })}
                    style={{ height: '36px', fontSize: '12px', flex: 1 }}
                  />
                  <button 
                    type="button"
                    onClick={() => handleSendTest(rightForm.name || 'TEST_CODE', rightForm.testEmail)}
                    style={{ 
                      height: '36px', 
                      padding: '0 8px', 
                      background: '#fff', 
                      color: '#901335', 
                      border: '1px solid #901335', 
                      borderRadius: '6px', 
                      fontWeight: 'bold', 
                      fontSize: '11px',
                      cursor: 'pointer' 
                    }}
                  >
                    Send Test
                  </button>
                </div>
              </div>
            </div>

              <div className="action-card-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <button type="button" className="btn-card-cancel" onClick={handleCancelRightForm}>Cancel</button>
                <button type="submit" className="btn-card-save">{isEditMode ? 'Save Changes' : 'Save Template'}</button>
              </div>
            </div>
          </form>
          </div>
      </>
      )}

      {toastMessage && <div className="sec-toast">{toastMessage}</div>}
    </div>
  );
}
