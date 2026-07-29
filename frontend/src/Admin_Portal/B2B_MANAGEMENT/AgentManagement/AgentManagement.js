/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function AgentManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'list'; // list, add, edit, view, status, membership, credit, wallet

  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All'); 
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Drawer & detail states
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Status adjustment & settings states
  const [statusVal, setStatusVal] = useState('Active');
  const [walletStatusVal, setWalletStatusVal] = useState('Active');
  const [creditLimitVal, setCreditLimitVal] = useState('');
  const [membershipVal, setMembershipVal] = useState('Bronze');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add agent form state
  const [newAgent, setNewAgent] = useState({
    companyName: '',
    businessType: 'Retail Agent',
    contactName: '',
    email: '',
    phoneNumber: '',
    gstin: '',
    city: '',
    password: 'Password@123'
  });

  useEffect(() => {
    fetchAgentsList();
  }, [activeTab, search]);

  useEffect(() => {
    // If url mode changes, auto-load or focus
    if (mode === 'add') {
      setIsDrawerOpen(false);
    }
  }, [mode]);

  const fetchAgentsList = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await b2bAdminService.getAgents(activeTab, search);
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load agents list.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleViewProfile = async (id) => {
    setSelectedAgentId(id);
    setIsProfileLoading(true);
    setIsDrawerOpen(true);
    try {
      const profile = await b2bAdminService.getAgentById(id);
      setAgentProfile(profile);
      setStatusVal(profile.status);
      setWalletStatusVal(profile.walletStatus || 'Active');
      setCreditLimitVal(profile.creditLimit || '100000');
      setMembershipVal(profile.membership || 'Bronze');
    } catch (err) {
      alert(err.message || "Failed to fetch profile.");
      setIsDrawerOpen(false);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleAddAgentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        ...newAgent,
        creditLimit: 10000.00,
        membershipTier: 'Silver'
      };
      const res = await b2bAdminService.createAgent(payload);
      triggerToast(res.message || 'Agent manually onboarded successfully!');
      setNewAgent({
        companyName: '',
        businessType: 'Retail Agent',
        contactName: '',
        email: '',
        phoneNumber: '',
        gstin: '',
        city: '',
        password: 'Password@123'
      });
      setSearchParams({ mode: 'list' });
      fetchAgentsList();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to onboard agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatusOnly = async (e) => {
    e.preventDefault();
    if (!selectedAgentId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await b2bAdminService.updateAgentStatus(selectedAgentId, statusVal);
      triggerToast(res.message || 'Account status updated.');
      setAgentProfile(prev => prev ? { ...prev, status: statusVal } : null);
      fetchAgentsList();
    } catch (err) {
      alert(err.message || 'Failed to save status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWalletOnly = async () => {
    if (!selectedAgentId || !agentProfile || isSubmitting) return;
    setIsSubmitting(true);
    const nextVal = agentProfile.walletStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await b2bAdminService.updateAgentWalletStatus(selectedAgentId, nextVal);
      triggerToast(res.message || 'Wallet status updated.');
      setAgentProfile(prev => prev ? { ...prev, walletStatus: nextVal } : null);
      setWalletStatusVal(nextVal);
      fetchAgentsList();
    } catch (err) {
      alert(err.message || 'Failed to toggle wallet status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMembershipOrCredit = async (e) => {
    e.preventDefault();
    if (!selectedAgentId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (mode === 'membership') {
        const res = await b2bAdminService.updateMembershipTier(selectedAgentId, membershipVal);
        triggerToast(res.message || 'Membership tier updated successfully!');
      } else if (mode === 'credit') {
        const res = await b2bAdminService.updateCreditLimit(selectedAgentId, creditLimitVal);
        triggerToast(res.message || 'Credit limit updated successfully!');
      }
      setIsDrawerOpen(false);
      fetchAgentsList();
    } catch (err) {
      alert(err.message || 'Failed to update agent parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">
            {mode === 'add' ? 'Add Travel Agent' :
             mode === 'edit' ? 'Edit Agent Profile' :
             mode === 'status' ? 'Agent Account Statuses' :
             mode === 'membership' ? 'Agent Memberships' :
             mode === 'credit' ? 'Credit Limit Allocations' :
             mode === 'wallet' ? 'Agent Wallet Balances' : 'B2B Agent Directory'}
          </h1>
          <p className="b2b-subtitle">Travel network indicators, credit distributions, and agent volume calculations.</p>
        </div>
        {mode !== 'list' && (
          <button className="b2b-btn b2b-btn-secondary" onClick={() => setSearchParams({ mode: 'list' })}>
            ⬅ Back to Directory
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
          <h4 style={{ margin: '0 0 4px', color: 'var(--b2b-danger)' }}>Backend Sync Issue</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>
        </div>
      )}

      {mode === 'add' ? (
        <div className="b2b-card" style={{ maxWidth: '700px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Create B2B Agency Account</h3>
          <form onSubmit={handleAddAgentSubmit}>
            <div className="b2b-form-grid">
              <div className="b2b-form-group">
                <label className="b2b-label">Company Name *</label>
                <input type="text" className="b2b-input" value={newAgent.companyName} onChange={e => setNewAgent({ ...newAgent, companyName: e.target.value })} required placeholder="e.g. Star Travels" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Business Type *</label>
                <select className="b2b-select" value={newAgent.businessType} onChange={e => setNewAgent({ ...newAgent, businessType: e.target.value })} required>
                  <option value="Retail Agent">Retail Agent</option>
                  <option value="Wholesale Agent">Wholesale Agent</option>
                  <option value="Corporate Partner">Corporate Partner</option>
                </select>
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Contact Person Name *</label>
                <input type="text" className="b2b-input" value={newAgent.contactName} onChange={e => setNewAgent({ ...newAgent, contactName: e.target.value })} required placeholder="e.g. John Doe" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Email Address *</label>
                <input type="email" className="b2b-input" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} required placeholder="agent@startravels.com" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Phone Number *</label>
                <input type="text" className="b2b-input" value={newAgent.phoneNumber} onChange={e => setNewAgent({ ...newAgent, phoneNumber: e.target.value })} required placeholder="9876543210" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">GSTIN ID</label>
                <input type="text" className="b2b-input" value={newAgent.gstin} onChange={e => setNewAgent({ ...newAgent, gstin: e.target.value })} placeholder="27AAAAA1111A1Z1" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">City *</label>
                <input type="text" className="b2b-input" value={newAgent.city} onChange={e => setNewAgent({ ...newAgent, city: e.target.value })} required placeholder="e.g. Hyderabad, TS" />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Default Access Password</label>
                <input type="password" className="b2b-input" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isSubmitting}>
              {isSubmitting ? 'Registering B2B Account...' : '✓ Add Agent & Register'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Main List & Directory */}
          <div className="b2b-tabs">
            {[
              { label: 'All Agents', val: 'All' },
              { label: 'Pending Approval', val: 'PendingApproval' },
              { label: 'Active Agents', val: 'Active' },
              { label: 'Inactive Agents', val: 'Inactive' },
              { label: 'Rejected Registrations', val: 'Rejected' }
            ].map(tab => (
              <button key={tab.val} className={`b2b-tab ${activeTab === tab.val ? 'active' : ''}`} onClick={() => setActiveTab(tab.val)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="b2b-card">
            <div className="b2b-filter-bar">
              <div className="b2b-search">
                <span className="b2b-search-icon">🔍</span>
                <input type="text" className="b2b-input" placeholder="Search by name, company, email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="b2b-btn b2b-btn-secondary" onClick={fetchAgentsList} disabled={isLoading}>
                {isLoading ? 'Refreshing...' : '🔄 Refresh list'}
              </button>
            </div>

            <div className="b2b-table-wrap">
              <table className="b2b-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Email / Mobile</th>
                    {mode === 'membership' && <th>Membership Tier</th>}
                    {mode === 'credit' && <th>Credit Limit</th>}
                    <th>Wallet Balance</th>
                    <th>Wallet Status</th>
                    <th>Approval Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--b2b-muted)' }}>Loading records from API...</td>
                    </tr>
                  ) : agents.length > 0 ? (
                    agents.map(a => (
                      <tr key={a.id} onClick={() => handleViewProfile(a.id)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 'bold', color: 'var(--b2b-primary)' }}>{a.id}</td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{a.companyName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--b2b-muted)' }}>{a.businessType}</div>
                        </td>
                        <td>{a.contactName}</td>
                        <td>
                          <div>{a.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--b2b-muted)' }}>{a.phoneNumber}</div>
                        </td>
                        {mode === 'membership' && (
                          <td>
                            <span className="b2b-badge b2b-badge-primary">{a.membership || 'Bronze'}</span>
                          </td>
                        )}
                        {mode === 'credit' && (
                          <td style={{ fontWeight: '600' }}>
                            ₹{(a.creditLimit || 100000).toLocaleString('en-IN')}
                          </td>
                        )}
                        <td style={{ fontWeight: '700', color: 'var(--b2b-success)' }}>
                          ₹{(a.walletBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`b2b-badge b2b-badge-${a.walletStatus === 'Active' ? 'success' : 'danger'}`}>
                            {a.walletStatus || 'Active'}
                          </span>
                        </td>
                        <td>
                          <span className={`b2b-badge b2b-badge-${
                            a.status === 'Active' ? 'success' :
                            a.status === 'PendingApproval' ? 'warning' : 'danger'
                          }`}>{a.status === 'PendingApproval' ? 'Pending Approval' : a.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button className="b2b-btn b2b-btn-secondary" onClick={() => handleViewProfile(a.id)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            {mode === 'edit' ? '✏️ Edit Profile' :
                             mode === 'status' ? '⚡ Approval Status' :
                             mode === 'membership' ? '🎖️ Tier Settings' :
                             mode === 'credit' ? '💳 Credit Settings' :
                             mode === 'wallet' ? '👛 Wallet Settings' : '👁️ Audit'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>No travel agents found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Profile Drawer */}
      {isDrawerOpen && (
        <div className="b2b-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="b2b-drawer" onClick={e => e.stopPropagation()}>
            <div className="b2b-drawer-header">
              <h3 style={{ margin: 0 }}>
                {mode === 'edit' ? 'Edit B2B Agent Settings' :
                 mode === 'status' ? 'Update Account Approval Status' :
                 mode === 'membership' ? 'Configure Membership Levels' :
                 mode === 'credit' ? 'Configure Credit Settings' :
                 mode === 'wallet' ? 'Configure Wallet Balance' : 'Agent Audit Details'}
              </h3>
              <button className="b2b-modal-close" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>

            <div className="b2b-drawer-body">
              {isProfileLoading ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--b2b-muted)' }}>Loading agent details...</div>
              ) : agentProfile ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--b2b-primary-light)', color: 'var(--b2b-primary)', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.25rem', fontWeight: 'bold', margin: '0 auto 8px', justifyContent: 'center' }}>
                      {agentProfile.companyName.charAt(0)}
                    </div>
                    <h4 style={{ margin: '0 0 2px' }}>{agentProfile.companyName}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>ID: {agentProfile.id}</p>
                  </div>

                  {/* Dynamic Action Forms based on MODE */}
                  {mode === 'status' ? (
                    <form onSubmit={handleUpdateStatusOnly}>
                      <div className="b2b-form-group">
                        <label className="b2b-label">Account Approval Status</label>
                        <select className="b2b-select" value={statusVal} onChange={e => setStatusVal(e.target.value)}>
                          <option value="PendingApproval">Pending Approval</option>
                          <option value="Active">Active / Approved</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving status...' : 'Update status'}
                      </button>
                    </form>
                  ) : mode === 'membership' ? (
                    <form onSubmit={handleSaveMembershipOrCredit}>
                      <div className="b2b-form-group">
                        <label className="b2b-label">Membership Tier</label>
                        <select className="b2b-select" value={membershipVal} onChange={e => setMembershipVal(e.target.value)}>
                          <option value="Bronze">Bronze Tier</option>
                          <option value="Silver">Silver Tier</option>
                          <option value="Gold">Gold Tier</option>
                          <option value="Platinum">Platinum Tier</option>
                        </select>
                      </div>
                      <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%' }}>
                        Save Membership Tier Override
                      </button>
                    </form>
                  ) : mode === 'credit' ? (
                    <form onSubmit={handleSaveMembershipOrCredit}>
                      <div className="b2b-form-group">
                        <label className="b2b-label">Assigned Credit Limit (₹)</label>
                        <input type="number" className="b2b-input" value={creditLimitVal} onChange={e => setCreditLimitVal(e.target.value)} required />
                      </div>
                      <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%' }}>
                        Save Credit Allocation
                      </button>
                    </form>
                  ) : mode === 'wallet' ? (
                    <div>
                      <div className="b2b-form-group">
                        <label className="b2b-label">Balance Actions</label>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                          <div><strong>Current Wallet:</strong> ₹{(agentProfile.walletBalance || 0).toLocaleString('en-IN')}</div>
                          <div><strong>Wallet Status:</strong> {agentProfile.walletStatus || 'Active'}</div>
                        </div>
                        <button type="button" className={`b2b-btn ${agentProfile.walletStatus === 'Active' ? 'b2b-btn-danger' : 'b2b-btn-primary'}`} onClick={handleToggleWalletOnly} style={{ width: '100%' }}>
                          {agentProfile.walletStatus === 'Active' ? '🚫 Freeze Wallet Transactions' : '⚡ Unfreeze Wallet Transactions'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Default View / Edit details
                    <form onSubmit={handleUpdateStatusOnly}>
                      <div className="b2b-detail-grid">
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">City</span>
                          <span className="b2b-detail-val">{agentProfile.city || '—'}</span>
                        </div>
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">GSTIN</span>
                          <span className="b2b-detail-val" style={{ fontFamily: 'monospace' }}>{agentProfile.gstin || '—'}</span>
                        </div>
                        <div className="b2b-detail-item b2b-detail-full">
                          <span className="b2b-detail-label">Email Address</span>
                          <span className="b2b-detail-val">{agentProfile.email}</span>
                        </div>
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">Contact Person</span>
                          <span className="b2b-detail-val">{agentProfile.contactName}</span>
                        </div>
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">Phone</span>
                          <span className="b2b-detail-val">{agentProfile.phoneNumber}</span>
                        </div>
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">Assigned Tier</span>
                          <span className="b2b-detail-val">{membershipVal}</span>
                        </div>
                        <div className="b2b-detail-item">
                          <span className="b2b-detail-label">Credit Limit</span>
                          <span className="b2b-detail-val">₹{Number(creditLimitVal).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <hr style={{ border: 'none', borderTop: '1px solid var(--b2b-border)', margin: '16px 0' }} />

                      <div className="b2b-form-group">
                        <label className="b2b-label">Approval Status</label>
                        <select className="b2b-select" value={statusVal} onChange={e => setStatusVal(e.target.value)}>
                          <option value="PendingApproval">Pending Approval</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving modifications...' : 'Save Profile Adjustments'}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--b2b-danger)', textAlign: 'center' }}>Unable to load agent profile.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentManagement;
