/* eslint-disable */
import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Info, 
  Search, 
  Filter,
  Check,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';

const mockReconciles = [
  { id: '1', date: '31-May-2024', ref: 'TXN764312', desc: 'Payment Received - PNB78543', systemAmt: '33,200.00', bankAmt: '33,200.00', diff: '0.00', status: 'Matched' },
  { id: '2', date: '30-May-2024', ref: 'TXN764311', desc: 'Settlement to Partner - ST889', systemAmt: '12,500.00', bankAmt: '12,000.00', diff: '500.00', status: 'Unmatched' },
  { id: '3', date: '29-May-2024', ref: 'TXN764307', desc: 'QR Payment - QR8544', systemAmt: '8,200.00', bankAmt: '8,200.00', diff: '0.00', status: 'Matched' },
  { id: '4', date: '28-May-2024', ref: 'TXN764301', desc: 'Hotel Booking HPN382', systemAmt: '4,500.00', bankAmt: '0.00', diff: '4,500.00', status: 'Unmatched' }
];

function Reconciliation() {
  const [items, setItems] = useState(mockReconciles);
  const [account, setAccount] = useState('All Accounts');
  const [fromDate, setFromDate] = useState('2024-05-01');
  const [toDate, setToDate] = useState('2024-05-31');
  const [diffFilter, setDiffFilter] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAutoMatch = () => {
    // Perform a mock auto match
    const updated = items.map(item => {
      if (parseFloat(item.diff) > 0 && item.ref === 'TXN764311') {
        // Adjust and match
        return { ...item, bankAmt: '12,500.00', diff: '0.00', status: 'Matched' };
      }
      return item;
    });
    setItems(updated);
    setSuccessMsg('Auto-match engine resolved 1 unmatched transactions based on Reference and Amounts!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleReconcileSubmit = () => {
    setSuccessMsg('Reconciliation statements processed and posted successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleManualMatch = (id) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, bankAmt: item.systemAmt, diff: '0.00', status: 'Matched' };
      }
      return item;
    });
    setItems(updated);
    setSuccessMsg('Transaction matched manually.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const filtered = items.filter(item => {
    if (diffFilter === 'Matched' && item.status !== 'Matched') return false;
    if (diffFilter === 'Unmatched' && item.status !== 'Unmatched') return false;
    return true;
  });

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Reconciliation</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Reconciliation</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleAutoMatch}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={15} /> Auto Match
          </button>

          <button
            onClick={handleReconcileSubmit}
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
            <Check size={15} /> Reconcile
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter panel */}
      <div style={{
        background: '#ffffff',
        padding: '18px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-end'
      }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
          ACCOUNT
          <select
            value={account}
            onChange={e => setAccount(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', outline: 'none', height: '36px', minWidth: '160px' }}
          >
            <option value="All Accounts">All Accounts</option>
            <option value="Main Account">Main Account</option>
            <option value="Partner Payout">Partner Payout</option>
            <option value="Wallet Reserve">Wallet Reserve</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
          FROM DATE
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', height: '36px', boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
          TO DATE
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', height: '36px', boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
          DIFFERENCE STATUS
          <select
            value={diffFilter}
            onChange={e => setDiffFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', outline: 'none', height: '36px', minWidth: '140px' }}
          >
            <option value="All">All Differences</option>
            <option value="Matched">Zero Difference (Matched)</option>
            <option value="Unmatched">Has Difference (Unmatched)</option>
          </select>
        </label>
      </div>

      {/* Comparison Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Date</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Reference</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Description</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px', textAlign: 'right' }}>System Amount (₹)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px', textAlign: 'right' }}>Bank Amount (₹)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px', textAlign: 'right' }}>Difference (₹)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '110px' }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '90px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const isMatched = item.status === 'Matched';
              const hasDiff = parseFloat(item.diff) > 0;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{item.date}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{item.ref}</td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 500 }}>{item.desc}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{item.systemAmt}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{item.bankAmt}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: hasDiff ? '#dc2626' : '#16a34a' }}>
                    {item.diff}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: isMatched ? '#dcfce7' : '#fee2e2',
                      color: isMatched ? '#15803d' : '#b91c1c'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {!isMatched && (
                      <button
                        onClick={() => handleManualMatch(item.id)}
                        style={{
                          border: '1px solid #bbf7d0',
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        Force Match
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Warning banner */}
      <div style={{
        background: '#fff8e6',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#b45309',
        fontSize: '0.8rem',
        fontWeight: 500,
        border: '1px solid #fde68a',
        marginTop: '24px'
      }}>
        <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
        <span>Ensure all difference variances are reconciled or force-matched before final statement reconciliation.</span>
      </div>

    </div>
  );
}

export default Reconciliation;
