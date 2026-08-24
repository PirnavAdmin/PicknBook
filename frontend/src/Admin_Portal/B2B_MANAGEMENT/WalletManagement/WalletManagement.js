/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function WalletManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const actionParam = searchParams.get('action') || 'Adjust'; // Credit, Debit, History, Statement

  const [activeTab, setActiveTab] = useState('Adjust');
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Adjust Form state
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [adjustType, setAdjustType] = useState('Credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // History Filter
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (actionParam === 'Credit' || actionParam === 'Debit') {
      setActiveTab('Adjust');
      setAdjustType(actionParam);
    } else if (actionParam === 'History' || actionParam === 'Statement') {
      setActiveTab('History');
    }
  }, [actionParam]);

  const loadData = async () => {
    try {
      const activeList = await b2bAdminService.getAgents('Active');
      setAgents(Array.isArray(activeList) ? activeList : []);
    } catch (e) {
      console.error(e);
    }
    setHistory(b2bAdminService.getWalletHistory());
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!selectedAgentId) {
      setErrorMsg('Please select a travel agent.');
      return;
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    const agentObj = agents.find(a => String(a.id) === String(selectedAgentId));
    if (!agentObj) {
      setErrorMsg('Agent not found.');
      return;
    }

    if (adjustType === 'Debit' && agentObj.walletBalance < amt) {
      setErrorMsg(`Insufficient funds. Agent only has a balance of ₹${agentObj.walletBalance.toLocaleString('en-IN')}`);
      return;
    }

    try {
      const res = await b2bAdminService.adjustAgentWalletBalance(selectedAgentId, {
        amount: amt,
        action: adjustType,
        remark: description || `Manual Balance ${adjustType} by Admin`
      });
      if (res && res.success) {
        setSuccessMsg(res.message || `Successfully ${adjustType === 'Credit' ? 'credited' : 'debited'} ₹${amt.toLocaleString('en-IN')}.`);
        setAmount('');
        setDescription('');
        setSelectedAgentId('');
        loadData();
      } else {
        setErrorMsg('Failed to adjust wallet balance.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to adjust wallet balance.');
    }
  };

  const filteredHistory = history.filter(h => {
    const query = historySearch.toLowerCase();
    return (
      h.agentName.toLowerCase().includes(query) ||
      h.description.toLowerCase().includes(query) ||
      h.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">Wallet Management</h1>
          <p className="b2b-subtitle">Manually add or deduct agent wallet balances, and track the credit/debit audit logs.</p>
        </div>
      </div>

      <div className="b2b-tabs">
        <button
          className={`b2b-tab ${activeTab === 'Adjust' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('Adjust');
            setSearchParams({ action: 'Credit' });
          }}
        >
          Add / Deduct Balance
        </button>
        <button
          className={`b2b-tab ${activeTab === 'History' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('History');
            setSearchParams({ action: 'History' });
          }}
        >
          Wallet History & Statements
        </button>
      </div>

      {activeTab === 'Adjust' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <div className="b2b-card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Adjust Wallet Balance</h3>
            
            {successMsg && (
              <div className="b2b-badge b2b-badge-success" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'block' }}>
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="b2b-badge b2b-badge-danger" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'block' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="b2b-form-group">
                <label className="b2b-label">Select Agent Agency *</label>
                <select 
                  className="b2b-select"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Agent Agency --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.companyName} (ID: {a.id}) [Bal: ₹{(a.walletBalance || 0).toLocaleString('en-IN')}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="b2b-form-group">
                <label className="b2b-label">Adjustment Action *</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="adjustType" 
                      value="Credit" 
                      checked={adjustType === 'Credit'} 
                      onChange={() => setAdjustType('Credit')}
                    />
                    Add Balance (Credit)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="adjustType" 
                      value="Debit" 
                      checked={adjustType === 'Debit'} 
                      onChange={() => setAdjustType('Debit')}
                    />
                    Deduct Balance (Debit)
                  </label>
                </div>
              </div>

              <div className="b2b-form-group">
                <label className="b2b-label">Amount (₹) *</label>
                <input 
                  type="number" 
                  className="b2b-input" 
                  placeholder="Enter adjustment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div className="b2b-form-group">
                <label className="b2b-label">Remarks / Description *</label>
                <textarea 
                  className="b2b-textarea" 
                  rows="3"
                  placeholder="Reason for balance modification e.g., manual payment settlement..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Update Wallet Balance
              </button>
            </form>
          </div>

          <div className="b2b-card">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Agent Wallets Status Directory</h3>
            <div className="b2b-table-wrap">
              <table className="b2b-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Wallet Status</th>
                    <th>Wallet Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '600' }}>{a.companyName}</td>
                      <td>
                        <span className={`b2b-badge b2b-badge-${
                          a.walletStatus === 'Active' ? 'success' : 'danger'
                        }`}>{a.walletStatus || 'Active'}</span>
                      </td>
                      <td style={{ fontWeight: '700', color: a.walletBalance >= 0 ? 'var(--b2b-success)' : 'var(--b2b-danger)' }}>
                        ₹{(a.walletBalance || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="b2b-card">
          <div className="b2b-filter-bar">
            <div className="b2b-search">
              <span className="b2b-search-icon">🔍</span>
              <input 
                type="text" 
                className="b2b-input" 
                placeholder="Search history by agency name, transaction description..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          </div>

          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Agent Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Closing Balance</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{h.id}</td>
                      <td style={{ fontWeight: '600' }}>{h.agentName}</td>
                      <td>
                        <span className={`b2b-badge b2b-badge-${h.type === 'Credit' ? 'success' : 'danger'}`}>
                          {h.type}
                        </span>
                      </td>
                      <td>{h.description}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>{h.referenceId}</td>
                      <td style={{ fontWeight: '700', color: h.type === 'Credit' ? 'var(--b2b-success)' : 'var(--b2b-danger)' }}>
                        {h.type === 'Credit' ? '+' : '-'} ₹{h.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: '600' }}>₹{h.closingBalance.toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>{h.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                      No transaction history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletManagement;
