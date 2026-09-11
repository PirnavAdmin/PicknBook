/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../services/emailService';
import '../SecurityManagement.css';

export default function EmailReminders() {
  const navigate = useNavigate();

  const [reminders, setReminders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states matching API parameters
  const [reminderName, setReminderName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [includeLoginLink, setIncludeLoginLink] = useState(true);
  const [templateId, setTemplateId] = useState('');

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadRemindersData = async () => {
    try {
      const data = await emailService.getReminders();
      if (Array.isArray(data)) {
        setReminders(data);
      }
    } catch (err) {
      console.warn('Could not load scheduled reminders from api', err);
    }
  };

  useEffect(() => {
    loadRemindersData();
  }, []);

  const handleOpenAdd = () => {
    setEditingReminder(null);
    setReminderName('Booking Payment Reminder');
    setRecipientEmail('customer@example.com');
    setSubject('Payment Due Tomorrow');
    setMessage('Please pay your remaining balance.');
    
    // Set default scheduled time to 24h from now formatted for input datetime-local
    const tom = new Date(Date.now() + 86400000);
    const tomStr = tom.toISOString().slice(0, 16);
    setScheduledTime(tomStr);

    setIncludeLoginLink(true);
    setTemplateId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rem) => {
    setEditingReminder(rem);
    setReminderName(rem.reminderName || '');
    setRecipientEmail(rem.recipientEmail || '');
    setSubject(rem.subject || '');
    setMessage(rem.message || '');
    
    const dStr = rem.scheduledTime ? new Date(rem.scheduledTime).toISOString().slice(0, 16) : '';
    setScheduledTime(dStr);
    
    setIncludeLoginLink(rem.includeLoginLink ?? true);
    setTemplateId(rem.templateId || '');
    setIsModalOpen(true);
  };

  const handleCancelReminder = async (id) => {
    try {
      await emailService.cancelReminder(id);
      showToast('✓ Reminder cancelled successfully (Status: Cancelled).');
      loadRemindersData();
    } catch (err) {
      showToast('⚠️ Failed to cancel reminder.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await emailService.deleteReminder(id);
      showToast('🗑️ Scheduled reminder deleted successfully.');
      loadRemindersData();
    } catch (err) {
      showToast('⚠️ Failed to delete reminder.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      reminderName,
      recipientEmail,
      subject: templateId ? null : subject,
      message: templateId ? null : message,
      scheduledTime: new Date(scheduledTime).toISOString(),
      includeLoginLink,
      templateId: templateId ? parseInt(templateId) : null
    };

    try {
      if (editingReminder) {
        await emailService.updateReminder(editingReminder.id, payload);
        showToast('💾 Reminder updated successfully!');
      } else {
        await emailService.scheduleReminder(payload);
        showToast('🆕 New reminder scheduled successfully!');
      }
      setIsModalOpen(false);
      loadRemindersData();
    } catch (err) {
      showToast('⚠️ Failed to save reminder.');
    }
  };

  const filtered = reminders.filter(r => {
    const matchesStatus = statusFilter === 'All Status' || r.status === statusFilter;
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (r.reminderName && r.reminderName.toLowerCase().includes(searchLow)) ||
      (r.recipientEmail && r.recipientEmail.toLowerCase().includes(searchLow)) ||
      (r.subject && r.subject.toLowerCase().includes(searchLow));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="security-mgmt-container">
      {/* Breadcrumbs */}
      <div className="sec-breadcrumb">
        <span className="crumb-link" onClick={() => navigate('/admin')}>Dashboard</span>
        <span>›</span>
        <span className="crumb-link" onClick={() => navigate('/admin/security-management')}>Security Management</span>
        <span>›</span>
        <span className="crumb-link">Email Management</span>
        <span>›</span>
        <span className="active-crumb">Email Reminders</span>
      </div>

      <div className="email-heading-box" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#901335', margin: '0' }}>Scheduled Email Reminders</h2>
        <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Configure automated reminders and track pending scheduled email alerts.</p>
      </div>

      {/* Metrics Cards */}
      <div className="email-stats-grid">
        <div className="email-stats-card card-total" style={{ borderLeft: '4px solid #901335' }}>
          <div className="email-stats-icon" style={{ background: '#fdf2f4', color: '#901335' }}>⏰</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Total Reminders</span>
            <span className="email-stats-val" style={{ color: '#901335' }}>{reminders.length}</span>
          </div>
        </div>

        <div className="email-stats-card card-active" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="email-stats-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>📅</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Pending Reminders</span>
            <span className="email-stats-val" style={{ color: '#16a34a' }}>{reminders.filter(r => r.status === 'Pending').length}</span>
          </div>
        </div>

        <div className="email-stats-card card-inactive" style={{ borderLeft: '4px solid #ea580c' }}>
          <div className="email-stats-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>📤</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Sent/Cancelled</span>
            <span className="email-stats-val" style={{ color: '#ea580c' }}>{reminders.filter(r => r.status !== 'Pending').length}</span>
          </div>
        </div>
      </div>

      {/* Filters Container */}
      <div className="sec-card" style={{ padding: '16px', marginTop: '15px' }}>
        <div className="email-filters-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
          <div className="email-filter-item" style={{ flex: '1 1 100px' }}>
            <label style={{ fontSize: '10px' }}>Status</label>
            <select style={{ height: '32px', fontSize: '11px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All Status">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Sent">Sent</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="email-filter-item search" style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '10px' }}>Search Reminder</label>
            <input
              type="text"
              placeholder="Search by name, subject, recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className="btn-reset-filters-white"
            onClick={() => {
              setStatusFilter('All Status');
              setSearchQuery('');
              showToast('🔄 Filters reset successfully.');
            }}
          >
            Reset
          </button>

          <button
            className="btn-create-template"
            style={{ background: '#901335', color: '#ffffff', border: 'none', marginLeft: 'auto' }}
            onClick={handleOpenAdd}
          >
            + Schedule Reminder
          </button>
        </div>

        {/* Reminders Table */}
        <table className="sec-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Reminder Name</th>
              <th>Recipient Email</th>
              <th>Subject</th>
              <th>Scheduled Time</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((rem, index) => (
                <tr key={rem.id}>
                  <td>{index + 1}</td>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{rem.reminderName}</td>
                  <td>{rem.recipientEmail}</td>
                  <td>{rem.subject || `[Template ID: ${rem.templateId}]`}</td>
                  <td>{new Date(rem.scheduledTime).toLocaleString()}</td>
                  <td>
                    <span className={`badge-status ${rem.status === 'Pending' ? 'active' : (rem.status === 'Cancelled' ? 'expired' : 'inactive')}`}>
                      {rem.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <span style={{ cursor: 'pointer', fontSize: '11px' }} title="Edit" onClick={() => handleOpenEdit(rem)}>✏️</span>
                      {rem.status === 'Pending' && (
                        <span 
                          style={{ cursor: 'pointer', color: '#ea580c', fontSize: '11px', fontWeight: 'bold' }} 
                          title="Cancel Reminder" 
                          onClick={() => handleCancelReminder(rem.id)}
                        >
                          🚫 Cancel
                        </span>
                      )}
                      <span style={{ cursor: 'pointer', color: '#ef4444', fontSize: '11px' }} title="Delete" onClick={() => handleDelete(rem.id)}>🗑️</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  ⏰ No reminder rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE REMINDER MODAL POPUP */}
      {isModalOpen && (
        <div className="email-full-screen-modal-overlay">
          <div className="email-full-screen-modal-content" style={{ width: '90%', maxWidth: '600px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="email-form-header">
              <h3>{editingReminder ? 'Edit Scheduled Reminder' : 'Schedule New Reminder'}</h3>
              <span className="email-form-close-cross" onClick={() => setIsModalOpen(false)}>✕</span>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Reminder Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={reminderName}
                    onChange={(e) => setReminderName(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Recipient Email <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Scheduled Date & Time <span className="req">*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Select Predefined Template (Optional)</label>
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">-- Do not use template (Custom Subject & Message) --</option>
                    <option value="1">Template ID #1: IP Blacklist Warning</option>
                  </select>
                </div>

                {!templateId && (
                  <>
                    <div className="email-form-field">
                      <label style={{ fontSize: '10px' }}>Custom Email Subject <span className="req">*</span></label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="email-form-field">
                      <label style={{ fontSize: '10px' }}>Custom Email Message <span className="req">*</span></label>
                      <textarea
                        required
                        style={{ minHeight: '100px' }}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="email-toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px' }}>Include Login CTA Button</span>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={includeLoginLink}
                      onChange={(e) => setIncludeLoginLink(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

              </div>

              <div className="email-form-footer">
                <button type="button" className="btn-form-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-form-save" style={{ background: '#901335', color: '#ffffff' }}>
                  {editingReminder ? 'Update Reminder' : 'Schedule Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && <div className="sec-toast">{toastMessage}</div>}
    </div>
  );
}
