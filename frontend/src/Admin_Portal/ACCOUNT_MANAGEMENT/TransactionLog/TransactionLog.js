/* eslint-disable */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Download,
  FileText,
  ArrowLeft,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Building2,
  Plus,
  X,
  RotateCcw,
  Printer,
  ExternalLink,
  CornerDownLeft,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────────
const mockTransactions = [
  { id: 'TXN-102458', refId: 'BOOK-77821', dateTime: '08 Sep 2026\n10:24 AM', type: 'Credit', module: 'Flight', description: 'Customer Payment - Flight Booking', amount: '12,500.00', paymentMethod: 'Cashfree (UPI)', status: 'Success', gatewayTxnId: 'CF-7T2839281', gatewayResponse: 'Payment successful', customer: 'John Doe (CUST-5821)', bookingId: 'BOOK-77821', ipAddress: '192.168.1.25', remarks: '-' },
  { id: 'TXN-102457', refId: 'REF-55621', dateTime: '08 Sep 2026\n09:15 AM', type: 'Debit', module: 'Flight', description: 'Refund to Customer', amount: '8,200.00', paymentMethod: 'Cashfree', status: 'Success', gatewayTxnId: 'CF-8R2912345', gatewayResponse: 'Refund processed', customer: 'Jane Smith (CUST-4312)', bookingId: 'BOOK-77819', ipAddress: '192.168.1.30', remarks: 'Cancellation refund' },
  { id: 'TXN-102456', refId: 'SETT-99871', dateTime: '07 Sep 2026\n06:30 PM', type: 'Credit', module: 'Settlement', description: 'Gateway Settlement (Cashfree)', amount: '1,45,600.00', paymentMethod: 'Bank Transfer', status: 'Success', gatewayTxnId: 'CF-ST8912456', gatewayResponse: 'Settlement completed', customer: '-', bookingId: '-', ipAddress: '-', remarks: 'Daily settlement' },
  { id: 'TXN-102455', refId: 'ADJ-00125', dateTime: '07 Sep 2026\n04:10 PM', type: 'Debit', module: 'Adjustment', description: 'Manual Adjustment - Service Charge', amount: '2,500.00', paymentMethod: '-', status: 'Success', gatewayTxnId: '-', gatewayResponse: '-', customer: '-', bookingId: '-', ipAddress: '192.168.1.10', remarks: 'Monthly service charge' },
  { id: 'TXN-102454', refId: 'BOOK-77820', dateTime: '06 Sep 2026\n11:20 AM', type: 'Credit', module: 'Hotel', description: 'Customer Payment - Hotel Booking', amount: '9,200.00', paymentMethod: 'Credit Card', status: 'Success', gatewayTxnId: 'RZ-CC9182374', gatewayResponse: 'Payment successful', customer: 'Raj Kumar (CUST-6012)', bookingId: 'BOOK-77820', ipAddress: '192.168.1.42', remarks: '-' },
  { id: 'TXN-102453', refId: 'REC-00124', dateTime: '06 Sep 2026\n10:05 AM', type: 'Debit', module: 'Reconciliation', description: 'Bank Charge Deduction', amount: '1,200.00', paymentMethod: 'HDFC Bank', status: 'Success', gatewayTxnId: 'HDFC-BC912345', gatewayResponse: 'Charge applied', customer: '-', bookingId: '-', ipAddress: '-', remarks: 'Monthly bank charges' },
  { id: 'TXN-102452', refId: 'BOOK-77819', dateTime: '05 Sep 2026\n08:40 PM', type: 'Credit', module: 'Bus', description: 'Customer Payment - Bus Booking', amount: '3,500.00', paymentMethod: 'Net Banking', status: 'Success', gatewayTxnId: 'CF-NB1823456', gatewayResponse: 'Payment successful', customer: 'Priya Sharma (CUST-3221)', bookingId: 'BOOK-77819', ipAddress: '192.168.1.55', remarks: '-' },
  { id: 'TXN-102451', refId: 'REF-55620', dateTime: '05 Sep 2026\n06:15 PM', type: 'Debit', module: 'Bus', description: 'Cancellation Refund', amount: '3,500.00', paymentMethod: 'Razorpay', status: 'Success', gatewayTxnId: 'RZ-RF2918345', gatewayResponse: 'Refund processed', customer: 'Amit Patel (CUST-2918)', bookingId: 'BOOK-77815', ipAddress: '192.168.1.60', remarks: '-' },
  { id: 'TXN-102450', refId: 'FEE-88901', dateTime: '04 Sep 2026\n03:30 PM', type: 'Debit', module: 'Charges', description: 'Gateway Fee', amount: '250.00', paymentMethod: 'Cashfree', status: 'Success', gatewayTxnId: 'CF-FE9123456', gatewayResponse: 'Fee deducted', customer: '-', bookingId: '-', ipAddress: '-', remarks: '-' },
  { id: 'TXN-102449', refId: 'BOOK-77818', dateTime: '04 Sep 2026\n11:25 AM', type: 'Credit', module: 'Flight', description: 'Customer Payment - Flight Booking', amount: '6,800.00', paymentMethod: 'Wallet', status: 'Success', gatewayTxnId: 'WL-1928345', gatewayResponse: 'Payment successful', customer: 'Sneha Gupta (CUST-7012)', bookingId: 'BOOK-77818', ipAddress: '192.168.1.70', remarks: '-' },
];

// ── Shared Styles ──
const cardBase = {
  background: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  padding: '20px 24px',
  flex: 1,
  minWidth: '180px',
};

const thStyle = {
  padding: '13px 14px',
  fontWeight: 700,
  fontSize: '0.74rem',
  color: '#A51C49',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  background: '#fff1f2',
  borderBottom: '2px solid #fecdd3',
};

const tdStyle = {
  padding: '12px 14px',
  fontSize: '0.82rem',
  color: '#334155',
  fontWeight: 500,
  borderBottom: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
};

const btnPrimary = {
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
  boxShadow: '0 4px 12px rgba(165, 28, 73, 0.18)',
  transition: 'all 0.2s',
};

const btnOutline = {
  background: '#ffffff',
  color: '#A51C49',
  border: '1.5px solid #A51C49',
  borderRadius: '8px',
  padding: '10px 20px',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s',
};

const inputStyle = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.82rem',
  outline: 'none',
  height: '40px',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#334155',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: '0.73rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  marginBottom: '6px',
};

// ── Action Dropdown ──
function ActionDropdown({ onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    { key: 'viewDetails', label: 'View Details', icon: <Eye size={14} />, color: '#3b82f6' },
    { key: 'downloadReceipt', label: 'Download Receipt', icon: <Download size={14} />, color: '#A51C49' },
    { key: 'viewReference', label: 'View Reference', icon: <ExternalLink size={14} />, color: '#6366f1' },
    { key: 'reverseTransaction', label: 'Reverse Transaction', icon: <CornerDownLeft size={14} />, color: '#f59e0b' },
    { key: 'addToAdjustment', label: 'Add to Adjustment', icon: <Plus size={14} />, color: '#16a34a' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: open ? '#f1f5f9' : 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        <MoreVertical size={16} color="#64748b" />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 12px 36px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '210px', overflow: 'hidden' }}>
          {actions.map((a) => (
            <button key={a.key} onClick={() => { setOpen(false); onAction(a.key); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: a.color, textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Transaction Detail View (Full Page) ──
function TransactionDetailView({ item, onBack }) {
  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Transaction Log
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Transaction Details</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Account Management &gt; Transaction Log &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...btnOutline, padding: '8px 16px', fontSize: '0.78rem' }}><Printer size={14} /> Print</button>
          <button style={{ ...btnOutline, padding: '8px 16px', fontSize: '0.78rem', color: '#16a34a', borderColor: '#86efac' }}><Download size={14} /> Download Receipt</button>
        </div>
      </div>

      {/* Status Banner */}
      <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CheckCircle size={20} color="#16a34a" />
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803d' }}>Transaction {item.status} — {item.id}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Transaction Information */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#A51C49" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Transaction Information</h4>
          </div>
          {[
            ['Transaction ID', item.id],
            ['Reference ID', item.refId],
            ['Date & Time', item.dateTime.replace('\n', ', ')],
            ['Type', item.type, item.type === 'Credit' ? '#16a34a' : '#ef4444'],
            ['Module', item.module],
            ['Description', item.description],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: c || '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '220px' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Payment Information */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={18} color="#3b82f6" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Payment Information</h4>
          </div>
          {[
            ['Amount', '\u20B9 ' + item.amount],
            ['Payment Method', item.paymentMethod],
            ['Status', item.status],
            ['Gateway Transaction ID', item.gatewayTxnId],
            ['Gateway Response', item.gatewayResponse],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'right', color: l === 'Status' ? '#16a34a' : l === 'Amount' ? '#A51C49' : '#0f172a' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Customer & Booking Info */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="#7c3aed" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Customer & Booking</h4>
          </div>
          {[
            ['Customer', item.customer],
            ['Booking ID', item.bookingId],
            ['IP Address', item.ipAddress],
            ['Remarks', item.remarks],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '200px' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Related Actions */}
      <div style={{ ...cardBase, maxWidth: '500px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800 }}>Related Actions</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button style={{ ...btnOutline, padding: '9px 18px', fontSize: '0.78rem', color: '#A51C49', borderColor: '#fca5a5' }}><FileText size={14} /> View Booking</button>
          <button style={{ ...btnOutline, padding: '9px 18px', fontSize: '0.78rem', color: '#6366f1', borderColor: '#c7d2fe' }}><User size={14} /> View Customer</button>
          <button style={{ ...btnOutline, padding: '9px 18px', fontSize: '0.78rem', color: '#A51C49', borderColor: '#fca5a5' }}><Download size={14} /> Download Receipt</button>
        </div>
      </div>
    </div>
  );
}

// ── View Reference Page ──
function ViewReferencePage({ item, onBack }) {
  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Transaction Log
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>View Reference</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Transaction Log &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span> &gt; Reference
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#A51C49" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Transaction Reference</h4>
          </div>
          {[
            ['Transaction ID', item.id],
            ['Reference ID', item.refId],
            ['Module', item.module],
            ['Type', item.type],
            ['Amount (\u20B9)', item.amount],
            ['Date', item.dateTime.replace('\n', ', ')],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={18} color="#3b82f6" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Gateway Reference</h4>
          </div>
          {[
            ['Gateway Transaction ID', item.gatewayTxnId],
            ['Payment Method', item.paymentMethod],
            ['Gateway Response', item.gatewayResponse],
            ['Status', item.status],
            ['IP Address', item.ipAddress],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: l === 'Status' ? '#16a34a' : '#0f172a', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Linked Records */}
      <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Linked Records</h4>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Record Type', 'Record ID', 'Description', 'Amount (\u20B9)', 'Status', 'Date'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { rType: 'Booking', rId: item.bookingId, desc: item.description, amt: item.amount, st: 'Active', dt: item.dateTime.replace('\n', ', ') },
              { rType: 'Payment', rId: item.gatewayTxnId, desc: 'Gateway Payment', amt: item.amount, st: 'Captured', dt: item.dateTime.replace('\n', ', ') },
            ].map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>{r.rType}</span></td>
                <td style={{ ...tdStyle, color: '#A51C49', fontWeight: 700 }}>{r.rId}</td>
                <td style={tdStyle}>{r.desc}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{'\u20B9'} {r.amt}</td>
                <td style={tdStyle}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>{r.st}</span></td>
                <td style={tdStyle}>{r.dt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reverse Transaction Page ──
function ReverseTransactionPage({ item, onBack, onReverse }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Transaction Log
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Reverse Transaction</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Transaction Log &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span> &gt; Reverse
        </p>
      </div>

      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertCircle size={20} color="#d97706" />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>This action will create a reversal entry. This cannot be undone.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ ...cardBase }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800 }}>Transaction to Reverse</h4>
          {[
            ['Transaction ID', item.id],
            ['Reference ID', item.refId],
            ['Type', item.type],
            ['Module', item.module],
            ['Amount (\u20B9)', item.amount],
            ['Payment Method', item.paymentMethod],
            ['Date', item.dateTime.replace('\n', ', ')],
            ['Customer', item.customer],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ ...cardBase }}>
          <h4 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 800 }}>Reversal Details</h4>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Reversal Reason *</label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="">Select Reason</option>
              <option>Customer Request</option><option>Duplicate Transaction</option><option>Incorrect Amount</option><option>Fraud Detected</option><option>System Error</option><option>Other</option>
            </select>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Reversal Amount (\u20B9)</label>
            <input value={item.amount} disabled style={{ ...inputStyle, width: '100%', background: '#f1f5f9', color: '#94a3b8' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter reversal notes..." rows={4} style={{ ...inputStyle, height: 'auto', width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
            <button onClick={onBack} style={{ ...btnOutline, padding: '10px 24px' }}>Cancel</button>
            <button onClick={() => onReverse(reason, notes)} style={{ ...btnPrimary, padding: '10px 24px', background: '#f59e0b', boxShadow: '0 4px 12px rgba(245,158,11,0.2)' }}>
              <CornerDownLeft size={15} /> Reverse Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add to Adjustment Page ──
function AddToAdjustmentPage({ item, onBack, onAdd }) {
  const [adjustmentType, setAdjustmentType] = useState('Credit');
  const [notes, setNotes] = useState('');

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Transaction Log
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Add to Adjustment</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Transaction Log &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span> &gt; Add to Adjustment
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#A51C49" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Source Transaction</h4>
          </div>
          {[
            ['Transaction ID', item.id],
            ['Reference ID', item.refId],
            ['Type', item.type],
            ['Module', item.module],
            ['Amount (\u20B9)', item.amount],
            ['Description', item.description],
            ['Date', item.dateTime.replace('\n', ', ')],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '200px' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color="#16a34a" /></div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Adjustment Details</h4>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Adjustment Type *</label>
            <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option>Credit</option><option>Debit</option>
            </select>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Amount (\u20B9) *</label>
            <input defaultValue={item.amount} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Linked Reference ID</label>
            <input value={item.refId} disabled style={{ ...inputStyle, width: '100%', background: '#f1f5f9', color: '#94a3b8' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Adjustment Notes *</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter adjustment description..." rows={3} style={{ ...inputStyle, height: 'auto', width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
            <button onClick={onBack} style={{ ...btnOutline, padding: '10px 24px' }}>Cancel</button>
            <button onClick={() => onAdd(adjustmentType, notes)} style={{ ...btnPrimary, padding: '10px 24px', background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,106,0.2)' }}>
              <Plus size={15} /> Add Adjustment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
function TransactionLog() {
  const [items] = useState(mockTransactions);
  const [view, setView] = useState('list');
  const [selectedItem, setSelectedItem] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('01 Sep 2026 - 30 Sep 2026');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAction = (action, item) => {
    switch (action) {
      case 'viewDetails':
        setSelectedItem(item);
        setView('details');
        break;
      case 'downloadReceipt':
        showSuccess('Receipt for ' + item.id + ' downloaded successfully!');
        break;
      case 'viewReference':
        setSelectedItem(item);
        setView('viewReference');
        break;
      case 'reverseTransaction':
        setSelectedItem(item);
        setView('reverse');
        break;
      case 'addToAdjustment':
        setSelectedItem(item);
        setView('addAdjustment');
        break;
      default:
        break;
    }
  };

  const handleReverse = (reason, notes) => {
    setView('list');
    showSuccess('Transaction ' + selectedItem.id + ' reversal created successfully. Reason: ' + reason);
  };

  const handleAddAdjustment = (type, notes) => {
    setView('list');
    showSuccess('Adjustment entry created from transaction ' + selectedItem.id + ' successfully.');
  };

  // Filtering
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (typeFilter !== 'All' && item.type !== typeFilter) return false;
      if (moduleFilter !== 'All' && item.module !== moduleFilter) return false;
      if (paymentFilter !== 'All' && !item.paymentMethod.includes(paymentFilter)) return false;
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.id.toLowerCase().includes(q) && !item.refId.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q) && !item.customer.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, typeFilter, moduleFilter, paymentFilter, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginatedItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ── Render sub-views ──
  if (view === 'details' && selectedItem) return <TransactionDetailView item={selectedItem} onBack={() => setView('list')} />;
  if (view === 'viewReference' && selectedItem) return <ViewReferencePage item={selectedItem} onBack={() => setView('list')} />;
  if (view === 'reverse' && selectedItem) return <ReverseTransactionPage item={selectedItem} onBack={() => setView('list')} onReverse={handleReverse} />;
  if (view === 'addAdjustment' && selectedItem) return <AddToAdjustmentPage item={selectedItem} onBack={() => setView('list')} onAdd={handleAddAdjustment} />;

  // ── Main List View ──
  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      {/* Success Message */}
      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '14px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Breadcrumb */}
      <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: '#64748b' }}>
        Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Transaction Log</span>
      </p>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#A51C49' }}>Transaction Log</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            View all financial transactions across bookings, payments, refunds, settlements, adjustments and reconciliations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px', width: '220px' }} />
          </div>
          <button style={{ ...btnOutline, padding: '10px 18px', color: '#ef4444', borderColor: '#fca5a5' }}>
            <Download size={15} /> Export
          </button>
          <button style={btnPrimary}>
            <Download size={15} /> Download Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Transactions', value: '12,450', trend: '\u2191 18%', trendColor: '#16a34a', sub: 'from last month', icon: <FileText size={22} color="#fff" />, iconBg: '#A51C49' },
          { label: 'Total Credits', value: '\u20B9 24,85,620', trend: '\u2191 15%', trendColor: '#16a34a', sub: 'from last month', icon: <ArrowDownCircle size={22} color="#fff" />, iconBg: '#16a34a' },
          { label: 'Total Debits', value: '\u20B9 18,42,300', trend: '\u2191 12%', trendColor: '#16a34a', sub: 'from last month', icon: <ArrowUpCircle size={22} color="#fff" />, iconBg: '#f59e0b' },
          { label: 'Refunds', value: '\u20B9 3,15,200', trend: '520 Transactions', trendColor: '#64748b', sub: '', icon: <RefreshCw size={22} color="#fff" />, iconBg: '#6366f1' },
          { label: 'Settlements', value: '\u20B9 20,80,400', trend: '48 Transactions', trendColor: '#64748b', sub: '', icon: <Building2 size={22} color="#fff" />, iconBg: '#0ea5e9' },
        ].map((card, idx) => (
          <div key={idx} style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '16px', minWidth: '195px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{card.label}</p>
              <p style={{ margin: '4px 0 2px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{card.value}</p>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: card.trendColor }}>{card.trend} {card.sub && <span style={{ color: '#94a3b8', fontWeight: 500 }}>{card.sub}</span>}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#ffffff', padding: '16px 24px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
        <div style={{ flex: '1.5', minWidth: '200px' }}>
          <label style={labelStyle}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input placeholder="Search by Transaction ID, Reference ID, Customer, etc..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }} />
          </div>
        </div>
        <div style={{ minWidth: '130px' }}>
          <label style={labelStyle}>Transaction Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Credit</option><option>Debit</option>
          </select>
        </div>
        <div style={{ minWidth: '130px' }}>
          <label style={labelStyle}>Module</label>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Flight</option><option>Hotel</option><option>Bus</option><option>Settlement</option><option>Adjustment</option><option>Reconciliation</option><option>Charges</option>
          </select>
        </div>
        <div style={{ minWidth: '140px' }}>
          <label style={labelStyle}>Payment Method</label>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Cashfree</option><option>Razorpay</option><option>Bank Transfer</option><option>Credit Card</option><option>Net Banking</option><option>Wallet</option><option>HDFC Bank</option>
          </select>
        </div>
        <div style={{ minWidth: '110px' }}>
          <label style={labelStyle}>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Success</option><option>Pending</option><option>Failed</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...btnPrimary, padding: '10px 22px', background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,106,0.18)' }}>
            <Search size={14} /> Search
          </button>
          <button onClick={() => { setTypeFilter('All'); setModuleFilter('All'); setPaymentFilter('All'); setStatusFilter('All'); setSearchQuery(''); }} style={{ ...btnOutline, padding: '10px 22px' }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Transaction Log <span style={{ color: '#64748b', fontWeight: 500 }}>({filtered.length.toLocaleString()})</span></h3>
          <button style={{ ...btnOutline, padding: '7px 14px', fontSize: '0.78rem', color: '#16a34a', borderColor: '#86efac' }}>
            <Download size={14} /> Export
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '36px' }}>#</th>
                <th style={thStyle}>Transaction ID</th>
                <th style={thStyle}>Reference ID</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount ({'\u20B9'})</th>
                <th style={thStyle}>Payment Method</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, idx) => {
                const typeColor = item.type === 'Credit' ? '#16a34a' : '#ef4444';
                const typeBg = item.type === 'Credit' ? '#dcfce7' : '#fee2e2';
                return (
                  <tr key={item.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{(currentPage - 1) * perPage + idx + 1}</td>
                    <td style={{ ...tdStyle, color: '#A51C49', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleAction('viewDetails', item)}>{item.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#334155' }}>{item.refId}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem', lineHeight: '1.4' }}>
                      {item.dateTime.split('\n').map((line, i) => (
                        <span key={i} style={{ display: 'block', color: i === 0 ? '#334155' : '#94a3b8', fontWeight: i === 0 ? 500 : 400, fontSize: i === 1 ? '0.72rem' : '0.78rem' }}>{line}</span>
                      ))}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: typeBg, color: typeColor }}>{item.type}</span>
                    </td>
                    <td style={tdStyle}>{item.module}</td>
                    <td style={{ ...tdStyle, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{item.amount}</td>
                    <td style={tdStyle}>{item.paymentMethod}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>{item.status}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <ActionDropdown onAction={(action) => handleAction(action, item)} />
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
          <span>Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length.toLocaleString()} entries</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={16} color="#64748b" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)}
                style={{
                  border: currentPage === page ? '1.5px solid #A51C49' : '1px solid #e2e8f0',
                  background: currentPage === page ? '#A51C49' : '#fff',
                  color: currentPage === page ? '#fff' : '#64748b',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                  fontWeight: currentPage === page ? 700 : 500, fontSize: '0.82rem', minWidth: '36px',
                }}>
                {page}
              </button>
            ))}
            {totalPages > 5 && <span style={{ padding: '0 4px' }}>...</span>}
            {totalPages > 5 && (
              <button onClick={() => setCurrentPage(totalPages)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b' }}>
                {totalPages.toLocaleString()}
              </button>
            )}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
              style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={16} color="#64748b" />
            </button>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ ...inputStyle, height: '34px', marginLeft: '8px', padding: '4px 8px', fontSize: '0.78rem' }}>
              <option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}

export default TransactionLog;
