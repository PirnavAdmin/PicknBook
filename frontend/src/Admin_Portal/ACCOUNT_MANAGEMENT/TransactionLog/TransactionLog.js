/* eslint-disable */
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  FileDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  X, 
  Calendar,
  AlertCircle
} from 'lucide-react';

const mockTransactions = [
  { id: 'TXN764312', date: '31-May-2024 11:40 AM', desc: 'Payment Received - PNB78543', account: 'Main Account', type: 'Credit', amount: '₹ 25,000.00', status: 'Success' },
  { id: 'TXN764311', date: '31-May-2024 10:30 AM', desc: 'Hotel Payout - HPN587', account: 'Main Account', type: 'Debit', amount: '₹ 12,500.00', status: 'Success' },
  { id: 'TXN764310', date: '30-May-2024 06:20 PM', desc: 'Manual Adjustment - ADJ102', account: 'Main Account', type: 'Credit', amount: '₹ 5,000.00', status: 'Success' },
  { id: 'TXN764309', date: '30-May-2024 04:10 PM', desc: 'Settlement to Partner - ST889', account: 'Partner Payout', type: 'Debit', amount: '₹ 15,000.00', status: 'Success' },
  { id: 'TXN764308', date: '29-May-2024 09:15 PM', desc: 'Refund - RF10291', account: 'Main Account', type: 'Debit', amount: '₹ 2,500.00', status: 'Failed' },
  { id: 'TXN764307', date: '29-May-2024 02:25 PM', desc: 'QR Payment - QR8544', account: 'Main Account', type: 'Credit', amount: '₹ 8,000.00', status: 'Success' },
  { id: 'TXN764306', date: '28-May-2024 11:05 AM', desc: 'Wallet Deposit - W12093', account: 'Wallet Reserve', type: 'Credit', amount: '₹ 30,000.00', status: 'Success' },
];

function TransactionLog() {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactions, setTransactions] = useState(mockTransactions);

  // Add form state
  const [newTx, setNewTx] = useState({
    desc: '',
    account: 'Main Account',
    type: 'Credit',
    amount: '',
    status: 'Success'
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const cleanAmount = parseFloat(newTx.amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const createdTx = {
      id: 'TXN' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      desc: newTx.desc,
      account: newTx.account,
      type: newTx.type,
      amount: '₹ ' + cleanAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      status: newTx.status
    };

    setTransactions([createdTx, ...transactions]);
    setShowAddModal(false);
    setNewTx({ desc: '', account: 'Main Account', type: 'Credit', amount: '', status: 'Success' });
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = t.desc.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchesAccount = accountFilter === 'All' || t.account === accountFilter;
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesAccount && matchesType && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Transaction Log</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Transaction Log</span>
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#A51C49',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(165, 28, 73, 0.2)'
          }}
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Advanced Filters */}
      <div style={{
        background: '#ffffff',
        padding: '18px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search Description or Txn ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              color: '#0f172a'
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        {/* Account Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', outline: 'none', height: '36px', fontWeight: 500 }}
          >
            <option value="All">All Accounts</option>
            <option value="Main Account">Main Account</option>
            <option value="Partner Payout">Partner Payout</option>
            <option value="Wallet Reserve">Wallet Reserve</option>
          </select>
        </div>

        {/* Type Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', outline: 'none', height: '36px', fontWeight: 500 }}
          >
            <option value="All">All Types</option>
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
        </div>

        {/* Status Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', outline: 'none', height: '36px', fontWeight: 500 }}
          >
            <option value="All">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <button
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#334155',
            marginLeft: 'auto'
          }}
        >
          <FileDown size={15} /> Export
        </button>
      </div>

      {/* Transaction Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '160px' }}>Date & Time</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Transaction ID</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Description</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '150px' }}>Account</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px' }}>Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Amount</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const isCredit = t.type === 'Credit';
              const isSuccess = t.status === 'Success';
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{t.date}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{t.id}</td>
                  <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: 500 }}>{t.desc}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{t.account}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700,
                      background: isCredit ? '#dcfce7' : '#fee2e2',
                      color: isCredit ? '#15803d' : '#b91c1c'
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{t.amount}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700,
                      background: isSuccess ? '#dcfce7' : '#fee2e2',
                      color: isSuccess ? '#15803d' : '#b91c1c'
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'grid',
          placeItems: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #A51C49 0%, #7e1236 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              position: 'relative'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff'
              }}>
                <Plus size={20} />
              </div>
              <div>
                <div style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Add New Transaction</div>
                <div style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Record credit/debit activity manually</div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                
                {/* Description */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                  DESCRIPTION *
                  <input
                    type="text"
                    required
                    placeholder="Enter transaction description"
                    value={newTx.desc}
                    onChange={e => setNewTx(prev => ({ ...prev, desc: e.target.value }))}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  />
                </label>

                {/* Account & Type row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                    ACCOUNT *
                    <select
                      value={newTx.account}
                      onChange={e => setNewTx(prev => ({ ...prev, account: e.target.value }))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#fff', height: '38px' }}
                    >
                      <option value="Main Account">Main Account</option>
                      <option value="Partner Payout">Partner Payout</option>
                      <option value="Wallet Reserve">Wallet Reserve</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                    TYPE *
                    <select
                      value={newTx.type}
                      onChange={e => setNewTx(prev => ({ ...prev, type: e.target.value }))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#fff', height: '38px' }}
                    >
                      <option value="Credit">Credit</option>
                      <option value="Debit">Debit</option>
                    </select>
                  </label>
                </div>

                {/* Amount & Status row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                    AMOUNT *
                    <input
                      type="text"
                      required
                      placeholder="Enter amount in ₹"
                      value={newTx.amount}
                      onChange={e => setNewTx(prev => ({ ...prev, amount: e.target.value }))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                    STATUS *
                    <select
                      value={newTx.status}
                      onChange={e => setNewTx(prev => ({ ...prev, status: e.target.value }))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#fff', height: '38px' }}
                    >
                      <option value="Success">Success</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </label>
                </div>

              </div>

              {/* Warning box */}
              <div style={{
                background: '#fff8e6',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#b45309',
                fontSize: '0.75rem',
                border: '1px solid #fde68a',
                marginBottom: '20px'
              }}>
                <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                <span>Entering a manual transaction will immediately affect account balances.</span>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.15)' }}
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default TransactionLog;
