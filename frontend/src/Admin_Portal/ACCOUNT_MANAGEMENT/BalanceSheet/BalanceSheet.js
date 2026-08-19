/* eslint-disable */
import React, { useState } from 'react';
import { 
  Calendar, 
  Layers, 
  Printer, 
  FileSpreadsheet, 
  Filter, 
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const mockParticulars = [
  { category: 'ASSETS', items: [
    { name: 'Cash and Bank Balances', amount: '₹ 12,45,678.90' },
    { name: 'Accounts Receivables', amount: '₹ 3,24,500.00' },
    { name: 'Supplier Deposits / Prepayments', amount: '₹ 5,80,000.00' },
    { name: 'Office Equipment', amount: '₹ 1,50,000.00' }
  ], total: '₹ 23,00,178.90' },
  
  { category: 'LIABILITIES', items: [
    { name: 'Accounts Payables (B2B Agents / Suppliers)', amount: '₹ 7,45,000.00' },
    { name: 'Unearned Revenue (Advance Bookings)', amount: '₹ 3,80,000.00' },
    { name: 'GST & Tax Payables', amount: '₹ 1,22,430.00' }
  ], total: '₹ 12,47,430.00' },

  { category: 'EQUITY', items: [
    { name: 'Share Capital', amount: '₹ 5,00,000.00' },
    { name: 'Retained Earnings', amount: '₹ 5,52,748.90' }
  ], total: '₹ 10,52,748.90' }
];

function BalanceSheet() {
  const [account, setAccount] = useState('All Accounts');
  const [fromDate, setFromDate] = useState('2024-05-01');
  const [toDate, setToDate] = useState('2024-05-31');
  const [data, setData] = useState(mockParticulars);

  const handleFilter = (e) => {
    e.preventDefault();
    // In a real application, this would query account data for the specified date range.
    alert(`Filtering balance sheet for ${account} from ${fromDate} to ${toDate}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Balance Sheet</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Balance Sheet</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
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
            <Printer size={15} /> Print
          </button>

          <button
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
            <FileSpreadsheet size={15} /> Export
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="no-print" style={{
        background: '#ffffff',
        padding: '18px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '28px',
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

        <button
          onClick={handleFilter}
          style={{
            background: '#A51C49',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            height: '36px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Filter size={15} /> Apply Filter
        </button>
      </div>

      {/* Balance Sheet Print/Visual container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '36px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Document Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #A51C49', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#A51C49', letterSpacing: '0.04em' }}>PICKNBOOK PRIVATE LIMITED</h1>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Balance Sheet</h3>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            As of {new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Categories grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {data.map(cat => (
            <div key={cat.category}>
              {/* Category Title */}
              <div style={{
                background: '#fff1f2',
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#A51C49',
                borderRadius: '6px',
                marginBottom: '10px',
                letterSpacing: '0.04em'
              }}>
                {cat.category}
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px' }}>
                {cat.items.map(item => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#334155', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.amount}</span>
                  </div>
                ))}

                {/* Sub Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '8px',
                  marginTop: '4px'
                }}>
                  <span>Total {cat.category.charAt(0) + cat.category.slice(1).toLowerCase()}</span>
                  <span style={{ borderBottom: '1px solid #0f172a', paddingBottom: '2px' }}>{cat.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Double Underline Grand Totals Checker */}
        <div style={{
          marginTop: '36px',
          borderTop: '2px solid #cbd5e1',
          paddingTop: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.94rem',
          fontWeight: 800,
          color: '#A51C49'
        }}>
          <span>TOTAL LIABILITIES & EQUITY</span>
          <span style={{
            borderBottom: '4px double #A51C49',
            paddingBottom: '3px'
          }}>
            ₹ 23,00,178.90
          </span>
        </div>
      </div>

    </div>
  );
}

export default BalanceSheet;
