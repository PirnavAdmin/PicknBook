/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function Notifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel') || 'Email'; // Email, SMS, WhatsApp

  const [agents, setAgents] = useState([]);
  
  // Composer states
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [recipientGroup, setRecipientGroup] = useState('All');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Delivery log state
  const [deliveryLogs, setDeliveryLogs] = useState([]);

  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

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
      console.error(e);
    }
  };

  const handleChannelToggle = (key) => {
    setChannels({ ...channels, [key]: !channels[key] });
  };

  const handleSend = (e) => {
    e.preventDefault();
    setToastMsg('');

    const activeChannels = Object.keys(channels).filter(k => channels[k]);
    if (activeChannels.length === 0) {
      alert('Please select at least one notification channel.');
      return;
    }

    let recipientName = 'All Agents';
    if (recipientGroup === 'Specific' && selectedAgentId) {
      const selectedAgent = agents.find(a => String(a.id) === String(selectedAgentId));
      recipientName = selectedAgent ? selectedAgent.companyName : 'Specific Agent';
    } else if (recipientGroup !== 'All') {
      recipientName = `${recipientGroup} Tier Agents`;
    }

    const newDispatches = activeChannels.map((channel, i) => ({
      id: `tx-${Date.now() + i}`,
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      recipient: recipientName,
      status: 'Delivered',
      time: new Date().toISOString().replace('T', ' ').slice(0, 16),
      title: subject || 'No Subject'
    }));

    setDeliveryLogs([...newDispatches, ...deliveryLogs]);
    b2bAdminService.addLog('Activity', `Broadcasted ${activeChannels.join('/')} alert to ${recipientName}: ${subject || 'Alert Message'}`);

    setSubject('');
    setMessage('');
    setSelectedAgentId('');
    setToastMsg('Notification dispatch campaign completed successfully!');
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">B2B Notification Hub</h1>
          <p className="b2b-subtitle">Dispatch announcements, low balance warnings, and campaigns to agents via Email, SMS, or WhatsApp.</p>
        </div>
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-success" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          ✓ {toastMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '24px' }}>
        <div className="b2b-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Compose Notification Broadcast</h3>
          
          <form onSubmit={handleSend}>
            <div className="b2b-form-group">
              <label className="b2b-label">Send Channel *</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={channels.email} onChange={() => handleChannelToggle('email')} />
                  ✉️ Email
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
              <label className="b2b-label">Recipient Target *</label>
              <select className="b2b-select" value={recipientGroup} onChange={(e) => setRecipientGroup(e.target.value)} required>
                <option value="All">All Registered Agencies</option>
                <option value="Specific">Specific Agency</option>
              </select>
            </div>

            {recipientGroup === 'Specific' && (
              <div className="b2b-form-group">
                <label className="b2b-label">Choose Target Agency *</label>
                <select className="b2b-select" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} required>
                  <option value="">-- Choose Agent --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.companyName}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="b2b-form-group">
              <label className="b2b-label">Message Subject / Title</label>
              <input type="text" className="b2b-input" placeholder="Enter subject header" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Message Content *</label>
              <textarea className="b2b-textarea" rows="5" placeholder="Type message details here..." value={message} onChange={(e) => setMessage(e.target.value)} required></textarea>
            </div>

            <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              🚀 Send Broadcast Notification
            </button>
          </form>
        </div>

        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Notification Dispatch Logs</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Recipient Target</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className={`b2b-badge ${
                        log.channel === 'Email' ? 'b2b-badge-primary' :
                        log.channel === 'WhatsApp' ? 'b2b-badge-success' : 'b2b-badge-warning'
                      }`}>{log.channel}</span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.recipient}</td>
                    <td>{log.title}</td>
                    <td>
                      <span className="b2b-badge b2b-badge-success">{log.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
