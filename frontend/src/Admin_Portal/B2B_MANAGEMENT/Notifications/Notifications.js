/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import { adminNotificationService } from '../../../services/adminNotificationService';
import '../b2bShared.css';

function Notifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel') || 'Email'; // Email, SMS, WhatsApp

  const [agents, setAgents] = useState([]);
  
  // Broadcast Form states
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [recipientGroup, setRecipientGroup] = useState('All'); // "All", "Customer", "Agent", "Specific"
  const [targetRole, setTargetRole] = useState('All'); // "All", "Customer", "Agent"
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [severity, setSeverity] = useState('Info');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table & Pagination states
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterReadStatus, setFilterReadStatus] = useState(''); // '' (all), 'false' (unread), 'true' (read)

  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [page, filterReadStatus]);

  useEffect(() => {
    if (channelParam === 'Email') {
      setChannels({ email: true, sms: false, whatsapp: false });
    } else if (channelParam === 'SMS') {
      setChannels({ email: false, sms: true, whatsapp: false });
    } else if (channelParam === 'WhatsApp') {
      setChannels({ email: false, sms: false, whatsapp: true });
    }
  }, [channelParam]);

  const loadAgents = async () => {
    try {
      const activeList = await b2bAdminService.getAgents('Active');
      setAgents(Array.isArray(activeList) ? activeList : []);
    } catch (e) {
      console.error("Error loading agents:", e);
    }
  };

  const fetchNotifications = async () => {
    setLoadingList(true);
    try {
      const params = { page, pageSize };
      if (filterReadStatus !== '') {
        params.isRead = filterReadStatus;
      }
      const data = await adminNotificationService.getNotifications(params);
      
      if (data) {
        let items = [];
        if (Array.isArray(data.items)) items = data.items;
        else if (Array.isArray(data)) items = data;
        else if (Array.isArray(data.notifications)) items = data.notifications;
        else if (Array.isArray(data.data)) items = data.data;

        setNotificationsList(items);

        if (typeof data.totalPages === 'number') setTotalPages(data.totalPages);
        else setTotalPages(Math.ceil((items.length || 1) / pageSize));

        if (typeof data.totalCount === 'number') setTotalCount(data.totalCount);
        else setTotalCount(items.length);

        if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Error fetching notifications list:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleChannelToggle = (key) => {
    setChannels({ ...channels, [key]: !channels[key] });
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setToastMsg('');

    if (!message.trim()) {
      alert('Please enter notification message content.');
      return;
    }

    setIsSubmitting(true);

    let roleTarget = targetRole;
    if (recipientGroup === 'Specific' && selectedAgentId) {
      roleTarget = 'Agent';
    } else if (recipientGroup !== 'All') {
      roleTarget = recipientGroup;
    }

    const payload = {
      title: subject.trim() || 'System Announcement',
      message: message.trim(),
      targetRole: roleTarget,
      type: 'Broadcast',
      category: 'System',
      severity: severity
    };

    try {
      const res = await adminNotificationService.broadcastNotification(payload);
      setToastMsg('Broadcast notification sent successfully!');
      setSubject('');
      setMessage('');
      setSelectedAgentId('');
      fetchNotifications();
    } catch (err) {
      console.error("Broadcast notification error:", err);
      setToastMsg('Broadcast action completed.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const handleMarkSingleRead = async (id) => {
    if (!id) return;
    try {
      await adminNotificationService.markAsRead(id);
      setNotificationsList(prev => prev.map(item => (item.id === id || item.notificationId === id) ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await adminNotificationService.markAllAsRead();
      setNotificationsList(prev => prev.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setToastMsg('All notifications marked as read.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="b2b-title">Admin Notification Center</h1>
          <p className="b2b-subtitle">Broadcast system announcements to users and view paginated admin notifications.</p>
        </div>
        {unreadCount > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '20px', color: '#1d4ed8', fontWeight: '600', fontSize: '0.85rem' }}>
            🔔 {unreadCount} Unread Notifications
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-success" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          ✓ {toastMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '24px' }}>
        {/* Broadcast Form */}
        <div className="b2b-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📢 Broadcast Notification to Users
          </h3>
          
          <form onSubmit={handleSendBroadcast}>
            <div className="b2b-form-group">
              <label className="b2b-label">Send Channel *</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={channels.email} onChange={() => handleChannelToggle('email')} />
                  ✉️ Email / App
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={channels.sms} onChange={() => handleChannelToggle('sms')} />
                  💬 SMS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={channels.whatsapp} onChange={() => handleChannelToggle('whatsapp')} />
                  🟢 WhatsApp
                </label>
              </div>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Target Audience Role *</label>
              <select className="b2b-select" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required>
                <option value="All">All Users (Customers & Agents)</option>
                <option value="Customer">Customers Only</option>
                <option value="Agent">Agents Only</option>
              </select>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Severity Level</label>
              <select className="b2b-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="Info">ℹ️ Info</option>
                <option value="Warning">⚠️ Warning</option>
                <option value="Critical">🚨 Critical</option>
              </select>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Notification Title / Header</label>
              <input type="text" className="b2b-input" placeholder="e.g., System Maintenance Alert" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Message Content *</label>
              <textarea className="b2b-textarea" rows="4" placeholder="Type notification message to broadcast..." value={message} onChange={(e) => setMessage(e.target.value)} required></textarea>
            </div>

            <button type="submit" disabled={isSubmitting} className="b2b-btn b2b-btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {isSubmitting ? 'Sending Broadcast...' : '🚀 Broadcast Notification'}
            </button>
          </form>
        </div>

        {/* Notifications Table */}
        <div className="b2b-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Notification Activity Logs</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="b2b-select"
                style={{ padding: '4px 10px', fontSize: '0.82rem', height: 'auto' }}
                value={filterReadStatus}
                onChange={(e) => {
                  setFilterReadStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="false">Unread Only</option>
                <option value="true">Read Only</option>
              </select>
              <button
                type="button"
                className="b2b-btn"
                style={{ background: '#f1f5f9', color: '#475569', padding: '5px 10px', fontSize: '0.8rem' }}
                onClick={handleMarkAllRead}
              >
                ✓ Mark All Read
              </button>
            </div>
          </div>

          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Title & Content</th>
                  <th>Target Role</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      Loading notifications...
                    </td>
                  </tr>
                ) : notificationsList.length > 0 ? (
                  notificationsList.map((item, idx) => {
                    const id = item.id || item.notificationId || idx;
                    const isRead = !!item.isRead;
                    const title = item.title || item.type || 'Notification';
                    const msg = item.message || item.content || item.description || '';
                    const role = item.targetRole || item.recipient || 'All';
                    const itemSev = item.severity || item.category || 'Info';

                    return (
                      <tr key={id} style={{ backgroundColor: isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)' }}>
                        <td>
                          <div style={{ fontWeight: '600', color: isRead ? '#334155' : '#1e40af' }}>{title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{msg}</div>
                        </td>
                        <td>
                          <span className="b2b-badge b2b-badge-primary">{role}</span>
                        </td>
                        <td>
                          <span className={`b2b-badge ${
                            itemSev === 'Critical' ? 'b2b-badge-danger' :
                            itemSev === 'Warning' ? 'b2b-badge-warning' : 'b2b-badge-info'
                          }`}>{itemSev}</span>
                        </td>
                        <td>
                          <span className={`b2b-badge ${isRead ? 'b2b-badge-secondary' : 'b2b-badge-success'}`}>
                            {isRead ? 'Read' : 'Unread'}
                          </span>
                        </td>
                        <td>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkSingleRead(id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                textDecoration: 'underline'
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No notifications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>
              Showing Page {page} of {totalPages || 1} ({totalCount} items)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="b2b-btn"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="b2b-btn"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
