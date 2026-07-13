import React, { useState, useEffect } from 'react';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function CommissionManagement() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [membershipTier, setMembershipTier] = useState('Gold');
  const [serviceType, setServiceType] = useState('Flight');
  const [commissionType, setCommissionType] = useState('Percentage');
  const [commissionValue, setCommissionValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await b2bAdminService.getCommissionRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch commission rules from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setMembershipTier('Gold');
    setServiceType('Flight');
    setCommissionType('Percentage');
    setCommissionValue('');
    setIsActive(true);
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const val = Number(commissionValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please specify a valid positive commission value.');
      return;
    }

    const payload = {
      membershipTier,
      serviceType,
      commissionType,
      commissionValue: val,
      isActive
    };

    try {
      if (isEditing) {
        await b2bAdminService.editCommissionRule(editId, payload);
        triggerToast('Commission rule updated successfully!');
      } else {
        await b2bAdminService.createCommissionRule(payload);
        triggerToast('New commission rule created successfully!');
      }
      resetForm();
      loadRules();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save commission rule.');
    }
  };

  const handleEditClick = (rule) => {
    setIsEditing(true);
    setEditId(rule.id);
    setMembershipTier(rule.membershipTier);
    setServiceType(rule.serviceType);
    setCommissionType(rule.commissionType || 'Percentage');
    setCommissionValue(rule.commissionValue);
    setIsActive(rule.isActive);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this commission rule?')) return;
    setErrorMsg('');
    try {
      const res = await b2bAdminService.deleteCommissionRule(id);
      triggerToast(res.message || 'Commission rule deleted successfully.');
      loadRules();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete commission rule.');
    }
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">B2B Commission Rules</h1>
          <p className="b2b-subtitle">Manage agent ticketing commissions based on partner levels and inventory categories.</p>
        </div>
        {(isEditing || errorMsg) && (
          <button className="b2b-btn b2b-btn-secondary" onClick={resetForm}>
            Add New Rule
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-success" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', display: 'block', width: 'fit-content' }}>
          ✓ {toastMsg}
        </div>
      )}

      {errorMsg && (
        <div className="b2b-card" style={{ borderColor: 'var(--b2b-danger)', backgroundColor: 'var(--b2b-danger-light)', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 4px', color: 'var(--b2b-danger)' }}>Commission Rules Alert</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 2fr', gap: '24px' }}>
        {/* Left Side: Create / Edit Form */}
        <div className="b2b-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
            {isEditing ? '✏️ Edit Commission Rule' : '➕ Create Commission Rule'}
          </h3>
          <form onSubmit={handleSubmitRule}>
            <div className="b2b-form-group">
              <label className="b2b-label">Agent Membership Tier *</label>
              <select className="b2b-select" value={membershipTier} onChange={e => setMembershipTier(e.target.value)}>
                <option value="Bronze">Bronze Tier</option>
                <option value="Silver">Silver Tier</option>
                <option value="Gold">Gold Tier</option>
                <option value="Platinum">Platinum Tier</option>
              </select>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Service Category *</label>
              <select className="b2b-select" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                <option value="Flight">Flight Bookings</option>
                <option value="Bus">Bus Bookings</option>
                <option value="Hotel">Hotel Stays</option>
              </select>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Commission Formula Type</label>
              <select className="b2b-select" value={commissionType} onChange={e => setCommissionType(e.target.value)}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Commission Value *</label>
              <input 
                type="number" 
                step="0.01" 
                className="b2b-input" 
                value={commissionValue} 
                onChange={e => setCommissionValue(e.target.value)} 
                required 
                placeholder="e.g. 2.5" 
              />
            </div>

            <div className="b2b-form-group">
              <label className="b2b-label">Rule Active State</label>
              <select className="b2b-select" value={String(isActive)} onChange={e => setIsActive(e.target.value === 'true')}>
                <option value="true">Active Rules Enabled</option>
                <option value="false">Disabled / Suspended</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" className="b2b-btn b2b-btn-primary" style={{ flex: 1 }}>
                {isEditing ? '✓ Update Rule' : '✓ Create Rule'}
              </button>
              {isEditing && (
                <button type="button" className="b2b-btn b2b-btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Active Rules List Table */}
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Active Commission Matrices</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Service</th>
                  <th>Formula</th>
                  <th style={{ textAlign: 'right' }}>Commission Value</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--b2b-muted)' }}>
                      Synchronizing with backend API...
                    </td>
                  </tr>
                ) : rules.length > 0 ? (
                  rules.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 'bold' }}>{r.membershipTier}</td>
                      <td>{r.serviceType}</td>
                      <td>{r.commissionType || 'Percentage'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--b2b-primary)' }}>
                        {r.commissionType === 'Fixed' ? '₹' : ''}
                        {r.commissionValue.toFixed(2)}
                        {r.commissionType !== 'Fixed' ? '%' : ''}
                      </td>
                      <td>
                        <span className={`b2b-badge b2b-badge-${r.isActive ? 'success' : 'danger'}`}>
                          {r.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="b2b-btn b2b-btn-secondary" onClick={() => handleEditClick(r)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            ✏️ Edit
                          </button>
                          <button className="b2b-btn b2b-btn-danger" onClick={() => handleDeleteClick(r.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--b2b-danger)', color: '#fff' }}>
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                      No commission rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommissionManagement;
