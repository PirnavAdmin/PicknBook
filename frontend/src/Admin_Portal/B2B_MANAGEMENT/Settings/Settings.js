import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'Membership'; // Membership, GST, Convenience Fee, Payment Gateway

  const [activeTab, setActiveTab] = useState('Membership');
  const [settings, setSettings] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    setSettings(b2bAdminService.getSettings());
  }, []);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    b2bAdminService.updateSettings(settings);
    triggerToast('B2B Administrative Configuration saved!');
  };

  const handleNestedChange = (category, field, value) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [field]: field === 'activeProvider' ? value : field === 'testMode' ? value === 'true' : Number(value)
      }
    });
  };

  const handleMembershipChange = (index, field, value) => {
    const list = [...settings.membership];
    list[index][field] = Number(value);
    setSettings({ ...settings, membership: list });
  };

  if (!settings) return <div className="b2b-container">Loading Settings...</div>;

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">B2B Portal Settings</h1>
          <p className="b2b-subtitle">Manage membership levels, GDS convenience fees, GST classifications, and Payment Gateway credentials.</p>
        </div>
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-success" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          ✓ {toastMsg}
        </div>
      )}

      <div className="b2b-tabs">
        {['Membership', 'GST', 'Convenience Fee', 'Payment Gateway'].map(tab => (
          <button
            key={tab}
            className={`b2b-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSearchParams({ tab });
            }}
          >
            {tab} Configs
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'Membership' && (
          <div className="b2b-card">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Agent Membership Tier Rules</h3>
            <div className="b2b-table-wrap">
              <table className="b2b-table">
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Minimum Monthly Bookings Required</th>
                    <th>Minimum Deposit Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.membership.map((m, i) => (
                    <tr key={m.name}>
                      <td style={{ fontWeight: 'bold' }}>{m.name}</td>
                      <td>
                        <input 
                          type="number" 
                          className="b2b-input" 
                          value={m.minMonthlyBookings} 
                          onChange={(e) => handleMembershipChange(i, 'minMonthlyBookings', e.target.value)}
                          style={{ width: '150px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="b2b-input" 
                          value={m.depositRequired} 
                          onChange={(e) => handleMembershipChange(i, 'depositRequired', e.target.value)}
                          style={{ width: '200px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'GST' && (
          <div className="b2b-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>GST Tax Classification Percentages</h3>
            <div className="b2b-form-group">
              <label className="b2b-label">Flight GST Rate (%)</label>
              <input 
                type="number" 
                className="b2b-input" 
                step="0.1"
                value={settings.gst.flight} 
                onChange={(e) => handleNestedChange('gst', 'flight', e.target.value)}
              />
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Bus GST Rate (%)</label>
              <input 
                type="number" 
                className="b2b-input" 
                step="0.1"
                value={settings.gst.bus} 
                onChange={(e) => handleNestedChange('gst', 'bus', e.target.value)}
              />
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Hotel GST Rate (%)</label>
              <input 
                type="number" 
                className="b2b-input" 
                step="0.1"
                value={settings.gst.hotel} 
                onChange={(e) => handleNestedChange('gst', 'hotel', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === 'Convenience Fee' && (
          <div className="b2b-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Portal Convenience Fees</h3>
            <div className="b2b-form-group">
              <label className="b2b-label">Flight Convenience Fee (₹ per ticket)</label>
              <input 
                type="number" 
                className="b2b-input" 
                value={settings.convenienceFee.flight} 
                onChange={(e) => handleNestedChange('convenienceFee', 'flight', e.target.value)}
              />
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Bus Convenience Fee (₹ per seat)</label>
              <input 
                type="number" 
                className="b2b-input" 
                value={settings.convenienceFee.bus} 
                onChange={(e) => handleNestedChange('convenienceFee', 'bus', e.target.value)}
              />
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Hotel Convenience Fee (₹ per night)</label>
              <input 
                type="number" 
                className="b2b-input" 
                value={settings.convenienceFee.hotel} 
                onChange={(e) => handleNestedChange('convenienceFee', 'hotel', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === 'Payment Gateway' && (
          <div className="b2b-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Payment Gateway Integrations</h3>
            <div className="b2b-form-group">
              <label className="b2b-label">Active Provider Gateway</label>
              <select 
                className="b2b-select"
                value={settings.paymentGateway.activeProvider}
                onChange={(e) => handleNestedChange('paymentGateway', 'activeProvider', e.target.value)}
              >
                <option value="Razorpay">Razorpay Checkout</option>
                <option value="PayU">PayU Gateway</option>
                <option value="Cashfree">Cashfree Payments</option>
              </select>
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Merchant Account ID (MID)</label>
              <input 
                type="text" 
                className="b2b-input" 
                value={settings.paymentGateway.merchantId} 
                onChange={(e) => handleNestedChange('paymentGateway', 'merchantId', e.target.value)}
              />
            </div>
            <div className="b2b-form-group">
              <label className="b2b-label">Gateway Sandbox Test Mode</label>
              <select 
                className="b2b-select"
                value={String(settings.paymentGateway.testMode)}
                onChange={(e) => handleNestedChange('paymentGateway', 'testMode', e.target.value)}
              >
                <option value="true">Enabled (Sandbox Testing)</option>
                <option value="false">Disabled (Production Credentials)</option>
              </select>
            </div>
          </div>
        )}

        <button type="submit" className="b2b-btn b2b-btn-primary" style={{ minWidth: '200px', padding: '12px 24px' }}>
          💾 Save Portal Settings
        </button>
      </form>
    </div>
  );
}

export default Settings;
