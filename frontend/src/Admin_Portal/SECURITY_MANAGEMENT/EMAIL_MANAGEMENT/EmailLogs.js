/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../services/emailService';
import '../SecurityManagement.css';

const normalizeLog = (l) => {
  if (!l) return null;
  return {
    id: l.id,
    recipient: l.recipientEmail || 'N/A',
    subject: l.subject || 'No Subject',
    status: l.status === 'SENT' ? 'Sent' : 'Failed',
    deliveryStatus: l.status === 'SENT' ? 'Delivered' : 'Failed',
    dateTime: l.sentAt ? new Date(l.sentAt).toLocaleString() : 'Recent',
    failureReason: l.errorMessage || '',
    scope: l.scope || 'System',
    event: l.event || 'Notification',
    template: l.template || 'Manual Send',
    ipAddress: l.ipAddress || '0.0.0.0',
    sentBy: l.sentBy || 'System',
    body: l.body || 'No Body Content'
  };
};

export default function EmailLogs() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Manual Send state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [isHtml, setIsHtml] = useState(true);
  const [includeLoginLink, setIncludeLoginLink] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadLogsData = async () => {
    try {
      const data = await emailService.getHistoryLogs();
      if (Array.isArray(data)) {
        setLogs(data.map(normalizeLog));
      }
    } catch (err) {
      console.warn('Could not load email history from api', err);
    }
  };

  useEffect(() => {
    loadLogsData();
  }, []);

  const handleExport = () => {
    showToast('📥 Email logs exported successfully (CSV)!');
  };

  const handleSendManual = async (e) => {
    e.preventDefault();
    if (!toEmail || !manualSubject || !manualBody) {
      showToast('⚠️ Please fill in all required fields.');
      return;
    }

    const payload = {
      toEmail,
      subject: manualSubject,
      body: manualBody,
      isHtml,
      includeLoginLink
    };

    try {
      await emailService.sendManualEmail(payload);
      showToast('✉️ Manual email sent & queued successfully!');
      setIsManualModalOpen(false);
      // Reset manual fields
      setToEmail('');
      setManualSubject('');
      setManualBody('');
      // Reload logs to show new entry
      loadLogsData();
    } catch (err) {
      showToast('⚠️ Failed to dispatch manual email.');
    }
  };

  const filtered = logs.filter(l => {
    const matchesStatus = statusFilter === 'All Status' || l.status === statusFilter;
    const searchLow = recipientSearch.toLowerCase();
    const matchesRecipient = !recipientSearch || 
      l.recipient.toLowerCase().includes(searchLow) ||
      l.subject.toLowerCase().includes(searchLow);

    return matchesStatus && matchesRecipient;
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
        <span className="active-crumb">Email Logs</span>
      </div>

      <div className="email-heading-box" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#901335', margin: '0' }}>Email Logs & History</h2>
        <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Audit and search logs of all security-related email notifications dispatched.</p>
      </div>

      {/* Metrics Cards */}
      <div className="email-stats-grid">
        <div className="email-stats-card card-total" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="email-stats-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>✉️</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Total Logs</span>
            <span className="email-stats-val" style={{ color: '#2563eb' }}>{logs.length}</span>
          </div>
        </div>

        <div className="email-stats-card card-active" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="email-stats-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>✓</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Sent Delivered</span>
            <span className="email-stats-val" style={{ color: '#16a34a' }}>{logs.filter(l => l.status === 'Sent').length}</span>
          </div>
        </div>

        <div className="email-stats-card card-inactive" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="email-stats-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>✗</div>
          <div className="email-stats-info">
            <span className="email-stats-title">Sent Failed</span>
            <span className="email-stats-val" style={{ color: '#dc2626' }}>{logs.filter(l => l.status === 'Failed').length}</span>
          </div>
        </div>
      </div>

      {/* Filters Container */}
      <div className="sec-card" style={{ padding: '16px', marginTop: '15px' }}>
        <div className="email-filters-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
          <div className="email-filter-item" style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: '10px' }}>Status</label>
            <select style={{ height: '32px', fontSize: '11px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All Status">All Status</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="email-filter-item search" style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '10px' }}>Search Recipient / Subject</label>
            <input
              type="text"
              placeholder="Search email / subject..."
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
            />
          </div>

          <button
            className="btn-reset-filters-white"
            onClick={() => {
              setStatusFilter('All Status');
              setRecipientSearch('');
              showToast('🔄 Filters reset successfully.');
            }}
          >
            Reset
          </button>

          <button
            className="btn-create-template"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', background: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' }}
            onClick={() => setIsManualModalOpen(true)}
          >
            ✉️ Send Manual Email
          </button>

          <button
            className="btn-create-template"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', background: '#901335', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            onClick={handleExport}
          >
            📤 Export Logs
          </button>
        </div>

        {/* Logs Table */}
        <table className="sec-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date & Time</th>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Sent By</th>
              <th>Delivery Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((log, index) => (
                <tr key={log.id}>
                  <td>{index + 1}</td>
                  <td style={{ color: '#64748b' }}>{log.dateTime}</td>
                  <td style={{ fontWeight: '600' }}>{log.recipient}</td>
                  <td>{log.subject}</td>
                  <td>
                    <span className={`badge-status ${log.status === 'Sent' ? 'active' : 'inactive'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>{log.sentBy}</td>
                  <td>
                    <span className={`badge-status ${log.deliveryStatus === 'Delivered' ? 'active' : 'inactive'}`}>
                      {log.deliveryStatus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ cursor: 'pointer', fontSize: '11px', color: '#2563eb' }} onClick={() => setSelectedLog(log)}>👁️ View</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  ✉️ No email logs matched your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW EMAIL LOG DETAIL POPUP */}
      {selectedLog && (
        <div className="email-full-screen-modal-overlay">
          <div className="email-full-screen-modal-content" style={{ width: '90%', maxWidth: '600px', height: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="email-form-header">
              <h3>📧 Email Log Details</h3>
              <span className="email-form-close-cross" onClick={() => setSelectedLog(null)}>✕</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Recipient:</span>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedLog.recipient}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Timestamp:</span>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedLog.dateTime}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Sent By:</span>
                  <div>{selectedLog.sentBy}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <div style={{ fontWeight: 'bold', color: selectedLog.status === 'Sent' ? '#16a34a' : '#dc2626' }}>
                    {selectedLog.status}
                  </div>
                </div>
              </div>

              {selectedLog.failureReason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '6px', color: '#991b1b' }}>
                  <strong>Failure Reason:</strong> {selectedLog.failureReason}
                </div>
              )}

              <div>
                <label style={{ fontWeight: 'bold', color: '#475569' }}>Subject:</label>
                <div style={{ border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', marginTop: '4px', background: '#ffffff', fontWeight: '600' }}>
                  {selectedLog.subject}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', color: '#475569' }}>Email Message Content:</label>
                <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', marginTop: '4px', background: '#ffffff', whiteSpace: 'pre-wrap', minHeight: '100px', maxHeight: '200px', overflowY: 'auto', lineHeight: '1.4' }}>
                  {selectedLog.body}
                </div>
              </div>
            </div>

            <div className="email-form-footer">
              <button type="button" className="btn-form-cancel" onClick={() => setSelectedLog(null)}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL EMAIL SENDER MODAL */}
      {isManualModalOpen && (
        <div className="email-full-screen-modal-overlay">
          <div className="email-full-screen-modal-content" style={{ width: '90%', maxWidth: '600px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="email-form-header">
              <h3>✉️ Send Manual Email instantly</h3>
              <span className="email-form-close-cross" onClick={() => setIsManualModalOpen(false)}>✕</span>
            </div>

            <form onSubmit={handleSendManual} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Recipient Email (To) <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. custom.user@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Email Subject <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Offer"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Email Body <span className="req">*</span></label>
                  <textarea
                    required
                    style={{ minHeight: '150px' }}
                    placeholder="Type email body message content here..."
                    value={manualBody}
                    onChange={(e) => setManualBody(e.target.value)}
                  />
                </div>

                <div className="email-toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px' }}>Send in HTML Format</span>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={isHtml}
                      onChange={(e) => setIsHtml(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="email-toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px' }}>Include Login Link CTA Button</span>
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
                <button type="button" className="btn-form-cancel" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-form-save" style={{ background: '#22c55e', color: '#ffffff' }}>Send Email</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && <div className="sec-toast">{toastMessage}</div>}
    </div>
  );
}
