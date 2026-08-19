/* eslint-disable */
import React, { useState } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const mockTransactions = [
  { id: '1', date: '31-May-2024 11:45 AM', reference: 'WLT-0001452', user: 'Ravi Kumar', type: 'Credit', amount: '5,000.00', status: 'Success' },
  { id: '2', date: '31-May-2024 02:10 PM', reference: 'WLT-0001453', user: 'Anita Sharma', type: 'Debit', amount: '3,500.00', status: 'Success' },
  { id: '3', date: '30-May-2024 10:15 AM', reference: 'WLT-0001454', user: 'Globe Connect', type: 'Debit', amount: '10,000.00', status: 'Success' },
  { id: '4', date: '30-May-2024 04:30 PM', reference: 'WLT-0001455', user: 'Ravi Kumar', type: 'Debit', amount: '1,200.00', status: 'Failed' },
  { id: '5', date: '29-May-2024 09:10 AM', reference: 'WLT-0001456', user: 'Anita Sharma', type: 'Credit', amount: '3,000.00', status: 'Success' },
];

function WalletTransactionList() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setStatusFilter('All');
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = t.reference.toLowerCase().includes(search.toLowerCase()) || t.user.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Wallet Transaction List</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Payment Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Wallet Transaction List</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#ffffff',
        padding: '16px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search reference or user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
          />
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', fontWeight: 500 }}
        >
          <option value="All">All Type</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', fontWeight: 500 }}
        >
          <option value="All">All Status</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>

        <button
          onClick={resetFilters}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
        >
          Reset
        </button>

        <button
          onClick={() => alert('Exporting transaction list to Excel...')}
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
          <FileSpreadsheet size={15} /> Export
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Date & Time</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '150px' }}>Reference No.</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>User</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '150px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const isCredit = t.type === 'Credit';
              const isSuccess = t.status === 'Success';

              return (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{t.date}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', fontFamily: 'monospace' }}>{t.reference}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{t.user}</td>
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
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: isCredit ? '#15803d' : '#b91c1c' }}>
                    {isCredit ? '+' : '-'} ₹ {t.amount}
                  </td>
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

    </div>
  );
}

export default WalletTransactionList;
