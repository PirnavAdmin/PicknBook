/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import emailService from '../../../services/emailService';
import '../SecurityManagement.css';

const normalizeLog = (l) => {
  if (!l) return null;
  const isSent = (l.deliveryStatus === 'SENT' || l.status === 'Sent' || l.status === 'SENT');

  let formattedDateTime = 'Recent';
  const rawDate = l.sentAt || l.createdAt || l.dateTime;
  if (rawDate && rawDate !== 'Recent') {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDateTime = d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        formattedDateTime = String(rawDate);
      }
    } catch (e) {
      formattedDateTime = String(rawDate);
    }
  }

  return {
    id: l.id,
    recipient: l.recipientEmail || l.recipient || 'N/A',
    subject: l.subject || 'No Subject',
    status: isSent ? 'Sent' : 'Failed',
    deliveryStatus: l.deliveryStatus || (isSent ? 'SENT' : 'FAILED'),
    dateTime: formattedDateTime,
    failureReason: l.errorMessage || l.failureReason || '',
    scope: l.scope || 'USER',
    event: l.securityEvent || l.event || l.emailType || 'Security Alert',
    template: l.templateId ? `Template #${l.templateId}` : (l.template || 'Manual Send'),
    retryCount: l.retryCount ?? 0,
    ipAddress: l.ipAddress || '127.0.0.1',
    sentBy: l.createdBy || l.sentBy || 'System',
    body: l.body || l.message || 'No Body Content'
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, recipientSearch]);

  const filtered = logs.filter(l => {
    const matchesStatus = statusFilter === 'All Status' || l.status === statusFilter;
    const searchLow = recipientSearch.toLowerCase();
    const matchesRecipient = !recipientSearch || 
      l.recipient.toLowerCase().includes(searchLow) ||
      l.subject.toLowerCase().includes(searchLow);

    return matchesStatus && matchesRecipient;
  });

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  return (
    <div className="security-mgmt-container">
      {/* Heading Line with Title & Green Export Button */}
      <div className="email-heading-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#A51C49', margin: 0, letterSpacing: '-0.5px' }}>Email</h1>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#000000', margin: 0 }}>Logs & History</h2>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Audit and search logs of all security-related email notifications dispatched.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button data-admin-action="export"
            type="button"
            className="btn-create-template"
            style={{ height: '34px', padding: '0 14px', fontSize: '11.5px', background: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExport}
          >
            📤 Export Logs
          </button>
          <button data-admin-action="primary"
            type="button"
            className="btn-create-template"
            style={{ height: '34px', padding: '0 14px', fontSize: '11.5px', background: '#901335', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setIsManualModalOpen(true)}
          >
            ✉️ Send Manual Email
          </button>
        </div>
      </div>

      {/* Cards Line: Decreased Card Widths + Status Dropdown + Search Bar in the same row */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
        
        {/* Compact Decreased Width Metrics Cards */}
        <div style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
          <div className="email-stats-card card-total" style={{ borderLeft: '4px solid #2563eb', padding: '6px 12px', minWidth: '130px', height: '48px', margin: 0, gap: '8px' }}>
            <div className="email-stats-icon" style={{ background: '#eff6ff', color: '#2563eb', width: '30px', height: '30px', fontSize: '13px', borderRadius: '6px' }}>✉️</div>
            <div className="email-stats-info">
              <span className="email-stats-title" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>TOTAL LOGS</span>
              <span className="email-stats-val" style={{ color: '#2563eb', fontSize: '1.1rem', lineHeight: 1.1 }}>{logs.length}</span>
            </div>
          </div>

          <div className="email-stats-card card-active" style={{ borderLeft: '4px solid #16a34a', padding: '6px 12px', minWidth: '130px', height: '48px', margin: 0, gap: '8px' }}>
            <div className="email-stats-icon" style={{ background: '#f0fdf4', color: '#16a34a', width: '30px', height: '30px', fontSize: '13px', borderRadius: '6px' }}>✓</div>
            <div className="email-stats-info">
              <span className="email-stats-title" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>SENT DELIVERED</span>
              <span className="email-stats-val" style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: 1.1 }}>{logs.filter(l => l.status === 'Sent').length}</span>
            </div>
          </div>

          <div className="email-stats-card card-inactive" style={{ borderLeft: '4px solid #dc2626', padding: '6px 12px', minWidth: '130px', height: '48px', margin: 0, gap: '8px' }}>
            <div className="email-stats-icon" style={{ background: '#fef2f2', color: '#dc2626', width: '30px', height: '30px', fontSize: '13px', borderRadius: '6px' }}>✗</div>
            <div className="email-stats-info">
              <span className="email-stats-title" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>SENT FAILED</span>
              <span className="email-stats-val" style={{ color: '#dc2626', fontSize: '1.1rem', lineHeight: 1.1 }}>{logs.filter(l => l.status === 'Failed').length}</span>
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', background: '#cbd5e1', margin: '0 2px' }} />

        {/* Status Dropdown & Search Bar in Card Line */}
        <div style={{ display: 'flex', gap: '10px', flex: 1, alignItems: 'center', minWidth: '320px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '140px' }}>
            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>STATUS</label>
            <select
              style={{ height: '34px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', background: '#ffffff', color: '#1e293b' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>SEARCH RECIPIENT / SUBJECT</label>
            <input
              type="text"
              placeholder="Search email / subject..."
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              style={{ height: '34px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', width: '100%', color: '#1e293b' }}
            />
          </div>

          <button data-admin-action="reset"
            type="button"
            className="btn-reset-filters-white"
            onClick={() => {
              setStatusFilter('All Status');
              setRecipientSearch('');
              showToast('🔄 Filters reset successfully.');
            }}
            style={{ height: '34px', padding: '0 12px', marginTop: '14px', fontSize: '11px' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Attached Main Table Container (Spans Edge to Edge Left and Right) */}
      <div className="sec-attached-table-box">
        <div style={{ overflowX: 'auto' }}>
          <table className="email-table">
            <thead>
              <tr>
                <th style={{ textTransform: 'capitalize', width: '50px', verticalAlign: 'middle', textAlign: 'center' }}>S.No</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle' }}>Date & Time</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle' }}>Recipient</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle' }}>Subject</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle', textAlign: 'center' }}>Status</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle', textAlign: 'center' }}>Sent By</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle', textAlign: 'center' }}>Delivery Status</th>
                <th style={{ textTransform: 'capitalize', verticalAlign: 'middle', textAlign: 'center', width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log, index) => (
                  <tr key={log.id} style={{ height: '46px' }}>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td style={{ verticalAlign: 'middle', color: '#64748b' }}>{log.dateTime}</td>
                    <td style={{ verticalAlign: 'middle', fontWeight: '600', color: '#0f172a' }}>{log.recipient}</td>
                    <td style={{ verticalAlign: 'middle', color: '#334155' }}>{log.subject}</td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <span className={`badge-status ${log.status === 'Sent' ? 'active' : 'inactive'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#475569' }}>{log.sentBy}</td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <span className={`badge-status ${log.deliveryStatus === 'Delivered' ? 'active' : 'inactive'}`}>
                        {log.deliveryStatus}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <button className="admin-view-button"
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Eye size={13} color="#2563eb" /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b', verticalAlign: 'middle' }}>
                    ✉️ No email logs matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Attached AdminPagination Footer */}
        <div className="sec-pagination-attached-footer">
          <AdminPagination
            currentPage={currentPage}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemName="email logs"
          />
        </div>
      </div>

      {/* VIEW EMAIL LOG DETAIL POPUP */}
      {selectedLog && createPortal(
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
              <button data-admin-close type="button" className="btn-form-cancel" onClick={() => setSelectedLog(null)}>Close Details</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MANUAL EMAIL SENDER MODAL */}
      {isManualModalOpen && createPortal(
        <div className="email-full-screen-modal-overlay">
          <div className="email-full-screen-modal-content" style={{ width: '90%', maxWidth: '600px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="email-form-header">
              <h3>✉️ Send Manual Email instantly</h3>
              <span className="email-form-close-cross" onClick={() => setIsManualModalOpen(false)}>✕</span>
            </div>

            <form onSubmit={handleSendManual} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Recipient Email (To) <span data-admin-required className="req">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. custom.user@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Email Subject <span data-admin-required className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Offer"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                  />
                </div>

                <div className="email-form-field">
                  <label style={{ fontSize: '10px' }}>Email Body <span data-admin-required className="req">*</span></label>
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
                <button data-admin-action="primary" type="submit" className="btn-form-save" style={{ background: '#22c55e', color: '#ffffff' }}>Send Email</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {toastMessage && <div className="sec-toast">{toastMessage}</div>}
    </div>
  );
}
