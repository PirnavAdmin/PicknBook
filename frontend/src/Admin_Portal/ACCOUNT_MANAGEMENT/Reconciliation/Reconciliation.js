/* eslint-disable */
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertCircle,
  ArrowLeft,
  Download,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowRight,
  RotateCcw,
  Save,
  X
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────────
const mockReconciles = [
  { id: 'REC-00125', date: '08 Sep 2026', bankGateway: 'HDFC Bank', type: 'Bank', statementPeriod: '01 Sep - 08 Sep 2026', totalTransactions: 1250, matched: 1230, unmatched: 20, varianceAmount: '0.00', status: 'Completed', createdBy: 'Admin' },
  { id: 'REC-00124', date: '07 Sep 2026', bankGateway: 'Cashfree', type: 'Gateway', statementPeriod: '01 Sep - 07 Sep 2026', totalTransactions: 980, matched: 970, unmatched: 10, varianceAmount: '2,500.00', status: 'Pending', createdBy: 'Admin' },
  { id: 'REC-00123', date: '05 Sep 2026', bankGateway: 'ICICI Bank', type: 'Bank', statementPeriod: '01 Sep - 05 Sep 2026', totalTransactions: 1420, matched: 1400, unmatched: 20, varianceAmount: '0.00', status: 'Completed', createdBy: 'Admin' },
  { id: 'REC-00122', date: '03 Sep 2026', bankGateway: 'Razorpay', type: 'Gateway', statementPeriod: '01 Sep - 03 Sep 2026', totalTransactions: 760, matched: 742, unmatched: 18, varianceAmount: '8,200.00', status: 'In Progress', createdBy: 'Finance Team' },
  { id: 'REC-00121', date: '01 Sep 2026', bankGateway: 'SBI Bank', type: 'Bank', statementPeriod: '01 Aug - 31 Aug 2026', totalTransactions: 2450, matched: 2420, unmatched: 30, varianceAmount: '0.00', status: 'Completed', createdBy: 'Admin' },
  { id: 'REC-00120', date: '28 Aug 2026', bankGateway: 'Cashfree', type: 'Gateway', statementPeriod: '25 Aug - 28 Aug 2026', totalTransactions: 640, matched: 630, unmatched: 10, varianceAmount: '1,200.00', status: 'Pending', createdBy: 'Finance Team' },
  { id: 'REC-00119', date: '25 Aug 2026', bankGateway: 'HDFC Bank', type: 'Bank', statementPeriod: '20 Aug - 25 Aug 2026', totalTransactions: 1100, matched: 1080, unmatched: 20, varianceAmount: '0.00', status: 'Completed', createdBy: 'Admin' },
  { id: 'REC-00118', date: '22 Aug 2026', bankGateway: 'ICICI Bank', type: 'Bank', statementPeriod: '15 Aug - 22 Aug 2026', totalTransactions: 890, matched: 870, unmatched: 20, varianceAmount: '3,500.00', status: 'Pending', createdBy: 'Finance Team' },
  { id: 'REC-00117', date: '20 Aug 2026', bankGateway: 'Razorpay', type: 'Gateway', statementPeriod: '15 Aug - 20 Aug 2026', totalTransactions: 560, matched: 545, unmatched: 15, varianceAmount: '7,200.00', status: 'In Progress', createdBy: 'Admin' },
  { id: 'REC-00116', date: '18 Aug 2026', bankGateway: 'Axis Bank', type: 'Bank', statementPeriod: '10 Aug - 18 Aug 2026', totalTransactions: 1320, matched: 1310, unmatched: 10, varianceAmount: '0.00', status: 'Completed', createdBy: 'Finance Team' },
];

const unmatchedTransactions = [
  { date: '08 Sep 2026', refId: 'BOOK-77821', amount: '2,500', reason: 'Amount Mismatch' },
  { date: '08 Sep 2026', refId: 'TXN-102458', amount: '1,200', reason: 'Not Found in Statement' },
  { date: '07 Sep 2026', refId: 'REF-55621', amount: '3,000', reason: 'Missing in Bank Statement' },
  { date: '07 Sep 2026', refId: 'TXN-102457', amount: '800', reason: 'Duplicate Entry' },
  { date: '05 Sep 2026', refId: 'BOOK-77818', amount: '1,500', reason: 'Delay in Settlement' },
];

// ── Styles ──────────────────────────────────────────────────────────
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
  fontSize: '0.76rem',
  color: '#A51C49',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  background: '#fff1f2',
  borderBottom: '2px solid #fecdd3',
};

const tdStyle = {
  padding: '13px 14px',
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

// ── Action Dropdown Component ──
function ActionDropdown({ onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    { key: 'view', label: 'View Details', icon: <Eye size={14} />, color: '#3b82f6' },
    { key: 'edit', label: 'Edit', icon: <Edit3 size={14} />, color: '#6366f1' },
    { key: 'markReconciled', label: 'Mark as Reconciled', icon: <Check size={14} />, color: '#16a34a' },
    { key: 'viewUnmatched', label: 'View Unmatched', icon: <AlertCircle size={14} />, color: '#f59e0b' },
    { key: 'download', label: 'Download Report', icon: <Download size={14} />, color: '#0ea5e9' },
    { key: 'delete', label: 'Delete', icon: <Trash2 size={14} />, color: '#ef4444' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? '#f1f5f9' : 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        <MoreVertical size={16} color="#64748b" />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: '4px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
          zIndex: 100,
          minWidth: '200px',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}>
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => { setOpen(false); onAction(a.key); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: a.color,
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confirm Dialog ──
function ConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: '0 0 28px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onCancel} style={{ ...btnOutline, padding: '9px 20px' }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btnPrimary, padding: '9px 20px', background: confirmColor || '#A51C49' }}>{confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}


// ── Detail View Page ──
function ReconciliationDetailView({ item, onBack }) {
  const statusColor = item.status === 'Completed' ? '#16a34a' : item.status === 'Pending' ? '#f59e0b' : '#3b82f6';
  const statusBg = item.status === 'Completed' ? '#dcfce7' : item.status === 'Pending' ? '#fef3c7' : '#dbeafe';

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Reconciliation List
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Reconciliation Details</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Account Management &gt; Reconciliation &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span>
          </p>
        </div>
        <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: statusBg, color: statusColor }}>{item.status}</span>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Reconciliation Info */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#A51C49" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Reconciliation Info</h4>
          </div>
          {[
            ['Reconciliation ID', item.id],
            ['Bank / Gateway', item.bankGateway],
            ['Type', item.type],
            ['Statement Period', item.statementPeriod],
            ['Created By', item.createdBy],
            ['Date', item.date],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Transaction Summary */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="#3b82f6" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Transaction Summary</h4>
          </div>
          {[
            ['Total Transactions', item.totalTransactions.toLocaleString()],
            ['Matched', item.matched.toLocaleString()],
            ['Unmatched', item.unmatched.toLocaleString()],
            ['Variance Amount (₹)', item.varianceAmount],
            ['Match Rate', ((item.matched / item.totalTransactions) * 100).toFixed(1) + '%'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Audit Info */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#7c3aed" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Audit Information</h4>
          </div>
          {[
            ['Created By', item.createdBy],
            ['Created At', item.date + ', 10:30 AM'],
            ['Updated By', item.createdBy],
            ['Updated At', item.date + ', 02:15 PM'],
            ['Remarks', 'Auto-reconciled via batch process'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '200px' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matched Transactions Sample Table */}
      <div style={{ ...cardBase, marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Transaction Breakdown</h4>
          <button style={{ ...btnOutline, padding: '8px 16px', fontSize: '0.78rem' }}>
            <Download size={14} /> Download Report
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Reference ID', 'System Amount (₹)', 'Bank Amount (₹)', 'Difference (₹)', 'Status'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { ref: 'TXN-102458', sysAmt: '5,200.00', bankAmt: '5,200.00', diff: '0.00', st: 'Matched' },
              { ref: 'TXN-102459', sysAmt: '3,800.00', bankAmt: '3,800.00', diff: '0.00', st: 'Matched' },
              { ref: 'TXN-102460', sysAmt: '12,500.00', bankAmt: '12,000.00', diff: '500.00', st: 'Unmatched' },
              { ref: 'BOOK-77821', sysAmt: '2,500.00', bankAmt: '0.00', diff: '2,500.00', st: 'Unmatched' },
              { ref: 'TXN-102461', sysAmt: '8,900.00', bankAmt: '8,900.00', diff: '0.00', st: 'Matched' },
            ].map((t, i) => (
              <tr key={i}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={{ ...tdStyle, color: '#A51C49', fontWeight: 700 }}>{t.ref}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{t.sysAmt}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{t.bankAmt}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: parseFloat(t.diff) > 0 ? '#ef4444' : '#16a34a' }}>{t.diff}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                    background: t.st === 'Matched' ? '#dcfce7' : '#fee2e2',
                    color: t.st === 'Matched' ? '#15803d' : '#b91c1c',
                  }}>{t.st}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Edit View Page ──
function ReconciliationEditView({ item, onBack, onSave }) {
  const [formData, setFormData] = useState({
    bankGateway: item.bankGateway,
    type: item.type,
    statementPeriod: item.statementPeriod,
    status: item.status,
    notes: '',
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Reconciliation List
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Edit Reconciliation</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Account Management &gt; Reconciliation &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Edit {item.id}</span>
        </p>
      </div>

      <div style={{ ...cardBase, maxWidth: '700px', padding: '28px 32px' }}>
        <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 800 }}>Reconciliation Information</h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Reconciliation ID</label>
            <input value={item.id} disabled style={{ ...inputStyle, width: '100%', background: '#f1f5f9', color: '#94a3b8' }} />
          </div>
          <div>
            <label style={labelStyle}>Bank / Gateway *</label>
            <select value={formData.bankGateway} onChange={e => handleChange('bankGateway', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option>HDFC Bank</option><option>ICICI Bank</option><option>SBI Bank</option><option>Axis Bank</option><option>Cashfree</option><option>Razorpay</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type *</label>
            <select value={formData.type} onChange={e => handleChange('type', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option>Bank</option><option>Gateway</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statement Period</label>
            <input value={formData.statementPeriod} onChange={e => handleChange('statementPeriod', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Status *</label>
            <select value={formData.status} onChange={e => handleChange('status', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option>Completed</option><option>Pending</option><option>In Progress</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input value={item.date} disabled style={{ ...inputStyle, width: '100%', background: '#f1f5f9', color: '#94a3b8' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Enter notes (optional)"
              rows={3}
              style={{ ...inputStyle, height: 'auto', width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <button onClick={onBack} style={{ ...btnOutline, padding: '10px 28px' }}>Cancel</button>
          <button onClick={() => onSave(formData)} style={{ ...btnPrimary, padding: '10px 28px' }}>
            <Save size={15} /> Update Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Start Reconciliation Page ──
function StartReconciliationView({ onBack, onCreate }) {
  const [form, setForm] = useState({ bankGateway: '', type: 'Bank', periodFrom: '', periodTo: '' });
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Reconciliation List
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Start Reconciliation</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Account Management &gt; Reconciliation &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Start New</span>
        </p>
      </div>

      <div style={{ ...cardBase, maxWidth: '700px', padding: '28px 32px' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800 }}>New Reconciliation Process</h4>
        <p style={{ margin: '0 0 24px', fontSize: '0.82rem', color: '#64748b' }}>Start a new reconciliation process for a bank account or payment gateway.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Bank / Gateway *</label>
            <select value={form.bankGateway} onChange={e => handleChange('bankGateway', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="">Select Bank / Gateway</option>
              <option>HDFC Bank</option><option>ICICI Bank</option><option>SBI Bank</option><option>Axis Bank</option><option>Cashfree</option><option>Razorpay</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Reconciliation Type *</label>
            <select value={form.type} onChange={e => handleChange('type', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option>Bank</option><option>Gateway</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statement Period From *</label>
            <input type="date" value={form.periodFrom} onChange={e => handleChange('periodFrom', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Statement Period To *</label>
            <input type="date" value={form.periodTo} onChange={e => handleChange('periodTo', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <button onClick={onBack} style={{ ...btnOutline, padding: '10px 28px' }}>Cancel</button>
          <button onClick={() => onCreate(form)} style={{ ...btnPrimary, padding: '10px 28px' }}>
            <Plus size={15} /> Proceed
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Unmatched Page ──
function ViewUnmatchedPage({ item, onBack }) {
  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A51C49', fontWeight: 700, fontSize: '0.88rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Back to Reconciliation List
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Unmatched Transactions</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Reconciliation &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>{item.id}</span> &gt; Unmatched
          </p>
        </div>
        <button style={{ ...btnOutline, padding: '8px 16px', fontSize: '0.78rem' }}>
          <Download size={14} /> Export Unmatched
        </button>
      </div>

      <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Date', 'Reference ID', 'System Amount (₹)', 'Bank Amount (₹)', 'Difference (₹)', 'Reason', 'Action'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { date: '08 Sep 2026', ref: 'TXN-102460', sys: '12,500.00', bank: '12,000.00', diff: '500.00', reason: 'Amount Mismatch' },
              { date: '08 Sep 2026', ref: 'BOOK-77821', sys: '2,500.00', bank: '0.00', diff: '2,500.00', reason: 'Not Found in Statement' },
              { date: '07 Sep 2026', ref: 'REF-55621', sys: '3,000.00', bank: '0.00', diff: '3,000.00', reason: 'Missing in Bank Statement' },
              { date: '07 Sep 2026', ref: 'TXN-102457', sys: '800.00', bank: '800.00', diff: '0.00', reason: 'Duplicate Entry' },
            ].map((t, i) => (
              <tr key={i}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{t.date}</td>
                <td style={{ ...tdStyle, color: '#A51C49', fontWeight: 700 }}>{t.ref}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{t.sys}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{t.bank}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: parseFloat(t.diff) > 0 ? '#ef4444' : '#16a34a' }}>{t.diff}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>{t.reason}</span>
                </td>
                <td style={tdStyle}>
                  <button style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                    Force Match
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
function Reconciliation() {
  const [items, setItems] = useState(mockReconciles);
  const [view, setView] = useState('list'); // list | details | edit | start | viewUnmatched
  const [selectedItem, setSelectedItem] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('01 Sep 2026 - 30 Sep 2026');
  const [bankFilter, setBankFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);

  // Existing backend methods preserved
  const handleAutoMatch = () => {
    const updated = items.map(item => {
      if (item.id === 'REC-00124' && item.status === 'Pending') {
        return { ...item, status: 'Completed', varianceAmount: '0.00', matched: item.totalTransactions, unmatched: 0 };
      }
      return item;
    });
    setItems(updated);
    showSuccess('Auto-match engine resolved unmatched transactions based on Reference and Amounts!');
  };

  const handleReconcileSubmit = () => {
    showSuccess('Reconciliation statements processed and posted successfully!');
  };

  const handleManualMatch = (id) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Completed', varianceAmount: '0.00', matched: item.totalTransactions, unmatched: 0 };
      }
      return item;
    });
    setItems(updated);
    showSuccess('Transaction matched manually.');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAction = (action, item) => {
    switch (action) {
      case 'view':
        setSelectedItem(item);
        setView('details');
        break;
      case 'edit':
        setSelectedItem(item);
        setView('edit');
        break;
      case 'markReconciled':
        setConfirmDialog({
          title: 'Mark as Reconciled',
          message: `Are you sure you want to mark reconciliation ${item.id} as completed? This will finalize all matched transactions.`,
          confirmLabel: 'Mark Reconciled',
          confirmColor: '#16a34a',
          onConfirm: () => {
            handleManualMatch(item.id);
            setConfirmDialog(null);
          },
        });
        break;
      case 'viewUnmatched':
        setSelectedItem(item);
        setView('viewUnmatched');
        break;
      case 'download':
        showSuccess(`Report for ${item.id} downloaded successfully!`);
        break;
      case 'delete':
        setConfirmDialog({
          title: 'Delete Reconciliation',
          message: `Are you sure you want to delete reconciliation ${item.id}? This action cannot be undone.`,
          confirmLabel: 'Delete',
          confirmColor: '#ef4444',
          onConfirm: () => {
            setItems(prev => prev.filter(i => i.id !== item.id));
            setConfirmDialog(null);
            showSuccess(`Reconciliation ${item.id} deleted successfully.`);
          },
        });
        break;
      default:
        break;
    }
  };

  const handleSave = (formData) => {
    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, ...formData } : i));
    setView('list');
    showSuccess(`Reconciliation ${selectedItem.id} updated successfully.`);
  };

  const handleCreate = (form) => {
    const newItem = {
      id: `REC-00${126 + items.length}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      bankGateway: form.bankGateway,
      type: form.type,
      statementPeriod: `${form.periodFrom} - ${form.periodTo}`,
      totalTransactions: 0,
      matched: 0,
      unmatched: 0,
      varianceAmount: '0.00',
      status: 'In Progress',
      createdBy: 'Admin',
    };
    setItems(prev => [newItem, ...prev]);
    setView('list');
    showSuccess(`New reconciliation ${newItem.id} created successfully!`);
  };

  // Filtering logic
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (bankFilter !== 'All' && item.bankGateway !== bankFilter) return false;
      if (typeFilter !== 'All' && item.type !== typeFilter) return false;
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.id.toLowerCase().includes(q) && !item.bankGateway.toLowerCase().includes(q) && !item.varianceAmount.includes(q)) return false;
      }
      return true;
    });
  }, [items, bankFilter, typeFilter, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginatedItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const toggleRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedRows.length === paginatedItems.length) setSelectedRows([]);
    else setSelectedRows(paginatedItems.map(i => i.id));
  };

  // Stats
  const stats = useMemo(() => {
    const totalRec = items.length;
    const matchedTxn = items.reduce((s, i) => s + i.matched, 0);
    const unmatchedTxn = items.reduce((s, i) => s + i.unmatched, 0);
    const pendingReview = items.filter(i => i.status === 'Pending').length;
    const totalAmount = 2485620;
    return { totalRec, matchedTxn, unmatchedTxn, pendingReview, totalAmount };
  }, [items]);

  // ── Render sub-views ──
  if (view === 'details' && selectedItem) return <ReconciliationDetailView item={selectedItem} onBack={() => setView('list')} />;
  if (view === 'edit' && selectedItem) return <ReconciliationEditView item={selectedItem} onBack={() => setView('list')} onSave={handleSave} />;
  if (view === 'start') return <StartReconciliationView onBack={() => setView('list')} onCreate={handleCreate} />;
  if (view === 'viewUnmatched' && selectedItem) return <ViewUnmatchedPage item={selectedItem} onBack={() => setView('list')} />;

  // ── Main List View ──
  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmColor={confirmDialog.confirmColor}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Success Message */}
      {successMsg && (
        <div style={{
          background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d',
          padding: '14px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '6px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.78rem', color: '#64748b' }}>
          Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Reconciliation</span>
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#A51C49' }}>Reconciliation</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Match and verify transactions between internal records and bank / gateway statements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setView('start')} style={btnPrimary}>
            <Plus size={16} /> Start Reconciliation
          </button>
          <button style={{ ...btnOutline, color: '#ef4444', borderColor: '#fca5a5' }}>
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Reconciliations', value: stats.totalRec, trend: '↑ 12%', trendColor: '#16a34a', icon: <FileText size={22} color="#fff" />, iconBg: '#A51C49' },
          { label: 'Matched Transactions', value: `1,82,${stats.matchedTxn > 9999 ? '450' : stats.matchedTxn}`, trend: '↑ 15%', trendColor: '#16a34a', icon: <CheckCircle size={22} color="#fff" />, iconBg: '#16a34a' },
          { label: 'Unmatched Transactions', value: `2,${stats.unmatchedTxn > 999 ? '450' : stats.unmatchedTxn}`, trend: '↓ 8%', trendColor: '#ef4444', icon: <AlertCircle size={22} color="#fff" />, iconBg: '#f59e0b' },
          { label: 'Pending Review', value: stats.pendingReview, trend: '↑ 20%', trendColor: '#f59e0b', icon: <Clock size={22} color="#fff" />, iconBg: '#6366f1' },
          { label: 'Total Reconciled Amount', value: '₹ 24,85,620', trend: '↑ 18%', trendColor: '#16a34a', icon: <DollarSign size={22} color="#fff" />, iconBg: '#0ea5e9' },
        ].map((card, idx) => (
          <div key={idx} style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '16px', minWidth: '200px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: card.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{card.label}</p>
              <p style={{ margin: '4px 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{card.value}</p>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: card.trendColor }}>{card.trend} <span style={{ color: '#94a3b8', fontWeight: 500 }}>from last month</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#ffffff', padding: '18px 24px', borderRadius: '14px',
        border: '1px solid #e2e8f0', marginBottom: '24px',
        display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1', minWidth: '180px' }}>
          <label style={labelStyle}>Date Range</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }} />
          </div>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={labelStyle}>Bank / Gateway</label>
          <select value={bankFilter} onChange={e => setBankFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option>
            <option>HDFC Bank</option><option>ICICI Bank</option><option>SBI Bank</option><option>Axis Bank</option><option>Cashfree</option><option>Razorpay</option>
          </select>
        </div>
        <div style={{ minWidth: '150px' }}>
          <label style={labelStyle}>Reconciliation Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Bank</option><option>Gateway</option>
          </select>
        </div>
        <div style={{ minWidth: '120px' }}>
          <label style={labelStyle}>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="All">All</option><option>Completed</option><option>Pending</option><option>In Progress</option>
          </select>
        </div>
        <div style={{ flex: '1.5', minWidth: '200px' }}>
          <label style={labelStyle}>&nbsp;</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input
              placeholder="Search by Reconciliation ID, Reference, Amount..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => {}} style={{ ...btnPrimary, padding: '10px 22px', background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,106,0.18)' }}>
            <Search size={14} /> Search
          </button>
          <button onClick={() => { setBankFilter('All'); setTypeFilter('All'); setStatusFilter('All'); setSearchQuery(''); }} style={{ ...btnOutline, padding: '10px 22px' }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
        {/* Table Header */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Reconciliation List <span style={{ color: '#64748b', fontWeight: 500 }}>({filtered.length})</span></h3>
          <button style={{ ...btnOutline, padding: '7px 14px', fontSize: '0.78rem', color: '#16a34a', borderColor: '#86efac' }}>
            <Download size={14} /> Export
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedRows.length === paginatedItems.length && paginatedItems.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thStyle, width: '40px' }}>#</th>
                <th style={thStyle}>Reconciliation ID</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Bank/Gateway</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Statement Period</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Transactions</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Matched</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Unmatched</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Variance Amount (₹)</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created By</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, idx) => {
                const statusColor = item.status === 'Completed' ? '#16a34a' : item.status === 'Pending' ? '#f59e0b' : '#3b82f6';
                const statusBg = item.status === 'Completed' ? '#dcfce7' : item.status === 'Pending' ? '#fef3c7' : '#dbeafe';
                return (
                  <tr key={item.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedRows.includes(item.id)} onChange={() => toggleRow(item.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{(currentPage - 1) * perPage + idx + 1}</td>
                    <td style={{ ...tdStyle, color: '#A51C49', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleAction('view', item)}>{item.id}</td>
                    <td style={tdStyle}>{item.date}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{item.bankGateway}</td>
                    <td style={tdStyle}>{item.type}</td>
                    <td style={tdStyle}>{item.statementPeriod}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{item.totalTransactions.toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{item.matched.toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{item.unmatched}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: parseFloat(item.varianceAmount.replace(/,/g, '')) > 0 ? '#ef4444' : '#16a34a' }}>
                      {item.varianceAmount}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                        background: statusBg, color: statusColor,
                      }}>{item.status}</span>
                    </td>
                    <td style={tdStyle}>{item.createdBy}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <ActionDropdown onAction={(action) => handleAction(action, item)} />
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No reconciliation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b',
        }}>
          <span>Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} entries</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} color="#64748b" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  border: currentPage === page ? '1.5px solid #A51C49' : '1px solid #e2e8f0',
                  background: currentPage === page ? '#A51C49' : '#fff',
                  color: currentPage === page ? '#fff' : '#64748b',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                  fontWeight: currentPage === page ? 700 : 500, fontSize: '0.82rem', minWidth: '36px',
                }}
              >
                {page}
              </button>
            ))}
            {totalPages > 5 && <span style={{ padding: '0 4px' }}>...</span>}
            {totalPages > 5 && (
              <button onClick={() => setCurrentPage(totalPages)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b' }}>
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              <ChevronRight size={16} color="#64748b" />
            </button>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ ...inputStyle, height: '34px', marginLeft: '8px', padding: '4px 8px', fontSize: '0.78rem' }}>
              <option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Summary Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '28px' }}>
        {/* Reconciliation Summary */}
        <div style={{ ...cardBase, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color="#A51C49" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>Reconciliation Summary</h4>
          </div>
          {[
            ['Reconciliation ID', 'REC-00125'],
            ['Bank / Gateway', 'HDFC Bank'],
            ['Type', 'Bank'],
            ['Statement Period', '01 Sep 2026 - 08 Sep 2026'],
            ['Total Transactions', '1,250'],
            ['Matched', '1,230'],
            ['Unmatched', '20'],
            ['Variance Amount', '₹ 0.00'],
            ['Status', 'Completed'],
            ['Created By', 'Admin'],
            ['Created At', '08 Sep 2026, 10:30 AM'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>{l}</span>
              <span style={{ color: v === 'Completed' ? '#16a34a' : '#0f172a', fontWeight: v === 'Completed' ? 700 : 600, fontSize: '0.78rem' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Match Status Donut */}
        <div style={{ ...cardBase, padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', alignSelf: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={16} color="#3b82f6" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>Match Status</h4>
          </div>
          {/* Simple Donut using CSS */}
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '10px 0 20px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '160px', height: '160px', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#A51C49" strokeWidth="3" strokeDasharray="98.4 100" strokeLinecap="round" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="1.6 100" strokeDashoffset="-98.4" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>1,250</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#A51C49' }} />
              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>Matched <span style={{ color: '#64748b' }}>1,230 (98.4%)</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>Unmatched <span style={{ color: '#64748b' }}>20 (1.6%)</span></span>
            </div>
          </div>
        </div>

        {/* Recent Unmatched Transactions */}
        <div style={{ ...cardBase, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} color="#f59e0b" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>Recent Unmatched Transactions</h4>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Reference ID', 'Amount (₹)', 'Reason'].map(h => (
                  <th key={h} style={{ padding: '8px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unmatchedTransactions.slice(0, 4).map((t, i) => (
                <tr key={i}>
                  <td style={{ padding: '7px 6px', fontSize: '0.76rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>{t.date}</td>
                  <td style={{ padding: '7px 6px', fontSize: '0.76rem', color: '#A51C49', fontWeight: 700, borderBottom: '1px solid #f1f5f9' }}>{t.refId}</td>
                  <td style={{ padding: '7px 6px', fontSize: '0.76rem', color: '#0f172a', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{t.amount}</td>
                  <td style={{ padding: '7px 6px', fontSize: '0.72rem', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: '12px' }}>
            <button
              onClick={() => { setSelectedItem(items[0]); setView('viewUnmatched'); }}
              style={{ background: 'none', border: 'none', color: '#A51C49', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              View All Unmatched <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Start Reconciliation Quick Card */}
        <div style={{ ...cardBase, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color="#16a34a" />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>Start Reconciliation</h4>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
            Start a new reconciliation process for a bank account or payment gateway.
          </p>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Bank / Gateway *</label>
            <select style={{ ...inputStyle, width: '100%' }}>
              <option value="">Select Bank / Gateway</option>
              <option>HDFC Bank</option><option>ICICI Bank</option><option>SBI Bank</option><option>Cashfree</option><option>Razorpay</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Statement Period *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input type="text" defaultValue="01 Sep 2026 - 30 Sep 2026" style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }} />
            </div>
          </div>
          <button onClick={() => setView('start')} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '12px' }}>
            Proceed <ArrowRight size={15} />
          </button>
        </div>
      </div>

    </div>
  );
}

export default Reconciliation;
