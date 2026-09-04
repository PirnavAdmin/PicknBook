/* eslint-disable */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle, 
  Upload, 
  List, 
  RefreshCw, 
  FileDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  ArrowRight
} from 'lucide-react';

const chartData = [
  { name: '01 May', Credits: 45000, Debits: 30000, Balance: 15000 },
  { name: '08 May', Credits: 95000, Debits: 45000, Balance: 65000 },
  { name: '15 May', Credits: 120000, Debits: 75000, Balance: 110000 },
  { name: '22 May', Credits: 160000, Debits: 85000, Balance: 185000 },
  { name: '29 May', Credits: 220000, Debits: 130000, Balance: 275000 },
];

const recentTransactions = [
  { id: '1', date: '31-May-2024', desc: 'Payment Received - PNB78543', type: 'Credit', amount: '₹ 25,000.00', status: 'Success' },
  { id: '2', date: '31-May-2024', desc: 'Hotel Payout - HPN587', type: 'Debit', amount: '₹ 12,500.00', status: 'Success' },
  { id: '3', date: '30-May-2024', desc: 'Manual Adjustment - ADJ102', type: 'Credit', amount: '₹ 5,000.00', status: 'Success' },
  { id: '4', date: '30-May-2024', desc: 'Settlement to Partner - ST889', type: 'Debit', amount: '₹ 15,000.00', status: 'Success' },
  { id: '5', date: '29-May-2024', desc: 'Refund - RF10291', type: 'Debit', amount: '₹ 2,500.00', status: 'Failed' },
  { id: '6', date: '29-May-2024', desc: 'QR Payment - QR8544', type: 'Credit', amount: '₹ 8,000.00', status: 'Success' },
];

function AccountDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Account Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Dashboard</span>
          </p>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#334155',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          📅 01-May-2024 - 31-May-2024
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Total Balance */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Balance</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>₹ 12,45,678.90</h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff1f2', display: 'grid', placeItems: 'center', color: '#A51C49' }}>
              <Wallet size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#A51C49', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
            View details <ArrowRight size={12} />
          </span>
        </div>

        {/* Today's Credits */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Credits</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>₹ 1,22,430.00</h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', display: 'grid', placeItems: 'center', color: '#15803d' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
            View details <ArrowRight size={12} />
          </span>
        </div>

        {/* Today's Debits */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Debits</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>₹ 45,678.00</h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#b91c1c' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
            View details <ArrowRight size={12} />
          </span>
        </div>

        {/* Pending Payments */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Payments</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>₹ 78,900.00</h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', display: 'grid', placeItems: 'center', color: '#b45309' }}>
              <Clock size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
            12 Pending <ArrowRight size={12} />
          </span>
        </div>

        {/* Pending Reconciliation */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Reconcile</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>₹ 34,000.00</h3>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', display: 'grid', placeItems: 'center', color: '#0369a1' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
            5 Pending <ArrowRight size={12} />
          </span>
        </div>

      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '28px' }}>
        
        {/* Balance Overview Area Chart */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>Balance Overview</h4>
          
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Credits" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCredits)" />
                <Area type="monotone" dataKey="Debits" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>Recent Transactions</h4>
            <span 
              onClick={() => navigate('/admin/account-management/transaction-log')} 
              style={{ fontSize: '0.72rem', color: '#A51C49', fontWeight: 700, cursor: 'pointer' }}
            >
              View All
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTransactions.map(tx => {
              const isCredit = tx.type === 'Credit';
              const isFailed = tx.status === 'Failed';
              return (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      background: isCredit ? '#dcfce7' : '#fee2e2', 
                      color: isCredit ? '#16a34a' : '#dc2626', 
                      display: 'grid', 
                      placeItems: 'center' 
                    }}>
                      {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.desc}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {tx.date}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isCredit ? '#16a34a' : '#dc2626' }}>
                      {isCredit ? '+' : '-'}{tx.amount.replace('₹', '').trim()}
                    </div>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      color: isFailed ? '#dc2626' : '#16a34a', 
                      background: isFailed ? '#fee2e2' : '#dcfce7',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginTop: '2px'
                    }}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Quick Actions row */}
      <h4 style={{ margin: '0 0 16px', fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>Quick Actions</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        {/* Upload Payment */}
        <div 
          onClick={() => navigate('/admin/account-management/payment-upload')}
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.01)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'grid', placeItems: 'center' }}>
            <Upload size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Upload Payment</div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Submit payment proof</span>
          </div>
        </div>

        {/* View Transactions */}
        <div 
          onClick={() => navigate('/admin/account-management/transaction-log')}
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.01)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'grid', placeItems: 'center' }}>
            <List size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>View Transactions</div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Open transaction logs</span>
          </div>
        </div>

        {/* Reconcile */}
        <div 
          onClick={() => navigate('/admin/account-management/reconciliation')}
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.01)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'grid', placeItems: 'center' }}>
            <RefreshCw size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Reconcile</div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Match bank statements</span>
          </div>
        </div>

        {/* Download Summary */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.01)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'grid', placeItems: 'center' }}>
            <FileDown size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Export Report</div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Download summary PDF</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AccountDashboard;
