/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Calendar, 
  FileText, 
  Info,
  CheckCircle,
  TrendingDown
} from 'lucide-react';

function SettlementTransfer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fromAccount: 'Main Account',
    toAccount: 'Partner Payout',
    amount: '',
    date: '',
    purpose: ''
  });
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.date || !form.purpose) {
      alert('Please fill in all required fields.');
      return;
    }
    setSuccessMsg('Settlement transfer posted successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      navigate('/admin/account-management/transaction-log');
    }, 2000);
  };

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Settlement / Transfer</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Settlement / Transfer</span>
          </p>
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

      {/* Form Card (Full-Width) */}
      <div style={{
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #A51C49 0%, #7e1236 100%)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <div style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              Post Settlement / Transfer
            </div>
            <div style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.2 }}>
              Transfer funds between internal bank accounts or record partner settlements
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', marginBottom: '24px' }}>
            
            {/* From Account */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>FROM ACCOUNT *</span>
                <select
                  value={form.fromAccount}
                  onChange={e => setForm(prev => ({ ...prev, fromAccount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Main Account">Main Account</option>
                  <option value="Partner Payout">Partner Payout</option>
                  <option value="Wallet Reserve">Wallet Reserve</option>
                </select>
              </div>
            </div>

            {/* To Account / Party */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>TO ACCOUNT / PARTY *</span>
                <select
                  value={form.toAccount}
                  onChange={e => setForm(prev => ({ ...prev, toAccount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Partner Payout">Partner Payout</option>
                  <option value="Main Account">Main Account</option>
                  <option value="Wallet Reserve">Wallet Reserve</option>
                  <option value="External Settlement Vendor">External Settlement Vendor</option>
                </select>
              </div>
            </div>

            {/* Amount */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>AMOUNT (₹) *</span>
                <input
                  type="number"
                  required
                  placeholder="Enter transfer amount"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Transfer Date */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>TRANSFER DATE *</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Purpose / Description */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>PURPOSE / DESCRIPTION *</span>
              <textarea
                required
                placeholder="Enter transfer purpose description..."
                rows={2}
                value={form.purpose}
                onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.85rem',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

          </div>

          {/* Info Notice Box */}
          <div style={{
            background: '#fff1f2',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#9f1239',
            fontSize: '0.78rem',
            fontWeight: 500,
            border: '1px solid #fecdd3',
            marginBottom: '20px'
          }}>
            <Info size={14} style={{ color: '#A51C49', flexShrink: 0 }} />
            <span>Fund transfers between internal bank records are instantly audited and mapped to reconciliation logs.</span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/account-management/transaction-log')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.2)' }}
            >
              Submit Transfer →
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

export default SettlementTransfer;
