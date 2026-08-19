/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Check, 
  X, 
  Calendar, 
  Plus,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const mockUploads = [
  { id: '1', uploadId: 'UPL10025', payer: 'Ravi Kumar', amount: '₹ 15,000.00', date: '31-May-2024 11:20 AM', status: 'Pending', reference: 'UTR1290382' },
  { id: '2', uploadId: 'UPL10024', payer: 'Anita Sharma', amount: '₹ 25,000.00', date: '31-May-2024 09:15 AM', status: 'Pending', reference: 'UTR8563721' },
  { id: '3', uploadId: 'UPL10023', payer: 'Global Express Travels', amount: '₹ 8,500.00', date: '30-May-2024 04:45 PM', status: 'Under Review', reference: 'UTR4629810' },
  { id: '4', uploadId: 'UPL10022', payer: 'Vikram Singh', amount: '₹ 12,000.00', date: '29-May-2024 10:20 AM', status: 'Approved', reference: 'UTR7726354' },
  { id: '5', uploadId: 'UPL10021', payer: 'Sunita Roy', amount: '₹ 4,500.00', date: '28-May-2024 03:10 PM', status: 'Rejected', reference: 'UTR1129384', rejectReason: 'Duplicate upload' }
];

function PaymentUploadList() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState(mockUploads);
  const [activeTab, setActiveTab] = useState('All');
  
  // Modal states
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectForm, setRejectForm] = useState({ reason: 'Incorrect Account', remarks: '' });

  // Tab calculations
  const countTab = (status) => uploads.filter(u => status === 'All' || u.status === status).length;

  const handleApprove = (id) => {
    const updated = uploads.map(u => u.id === id ? { ...u, status: 'Approved' } : u);
    setUploads(updated);
    if (viewItem && viewItem.id === id) setViewItem({ ...viewItem, status: 'Approved' });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    const updated = uploads.map(u => 
      u.id === rejectItem.id 
        ? { ...u, status: 'Rejected', rejectReason: rejectForm.reason + (rejectForm.remarks ? `: ${rejectForm.remarks}` : '') } 
        : u
    );
    setUploads(updated);
    setRejectItem(null);
    setRejectForm({ reason: 'Incorrect Account', remarks: '' });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const updated = uploads.map(u => u.id === editItem.id ? { ...editItem } : u);
    setUploads(updated);
    setEditItem(null);
  };

  const filtered = uploads.filter(u => activeTab === 'All' || u.status === activeTab);

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Payment Upload List</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Payment Upload List</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/account-management/payment-upload')}
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
          <Plus size={16} /> Upload Payment
        </button>
      </div>

      {/* Tabs Row */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        gap: '24px'
      }}>
        {['All', 'Pending', 'Under Review', 'Approved', 'Rejected'].map(tab => {
          const count = countTab(tab);
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                fontSize: '0.85rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#A51C49' : '#64748b',
                borderBottom: active ? '2px solid #A51C49' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {tab}
              <span style={{
                background: active ? '#fff1f2' : '#f1f5f9',
                color: active ? '#A51C49' : '#64748b',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Upload Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Upload ID</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Payer / Source</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '140px' }}>Amount</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Uploaded On</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, idx) => {
              const statusColor = 
                u.status === 'Approved' ? { bg: '#dcfce7', text: '#15803d' } :
                u.status === 'Rejected' ? { bg: '#fee2e2', text: '#b91c1c' } :
                u.status === 'Under Review' ? { bg: '#e0f2fe', text: '#0369a1' } :
                { bg: '#fef3c7', text: '#b45309' }; // Pending

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{u.uploadId}</td>
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 600 }}>{u.payer}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{u.amount}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{u.date}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: statusColor.bg,
                      color: statusColor.text
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setViewItem(u)}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>

                      {u.status !== 'Approved' && u.status !== 'Rejected' && (
                        <>
                          <button
                            onClick={() => handleApprove(u.id)}
                            style={{ border: '1px solid #bbf7d0', background: '#dcfce7', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#15803d', display: 'inline-flex' }}
                            title="Approve"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setRejectItem(u)}
                            style={{ border: '1px solid #fecdd3', background: '#fee2e2', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c', display: 'inline-flex' }}
                            title="Reject"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View Item Modal */}
      {viewItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          display: 'grid',
          placeItems: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #A51C49 0%, #7e1236 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              position: 'relative'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                <Eye size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Payment Details</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Review payment metadata and receipt</div>
              </div>
              <button onClick={() => setViewItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Upload ID:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{viewItem.uploadId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Payer / Source:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{viewItem.payer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Amount:</span>
                  <span style={{ fontWeight: 800, color: '#A51C49' }}>{viewItem.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Uploaded Date:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{viewItem.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Reference / UTR:</span>
                  <span style={{ fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{viewItem.reference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Status:</span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{viewItem.status}</span>
                </div>

                {viewItem.rejectReason && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', color: '#b91c1c', fontSize: '0.78rem' }}>
                    <strong>Rejection Reason:</strong> {viewItem.rejectReason}
                  </div>
                )}
              </div>

              {/* View Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '20px' }}>
                <button
                  onClick={() => setViewItem(null)}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
                {viewItem.status !== 'Approved' && viewItem.status !== 'Rejected' && (
                  <button
                    onClick={() => handleApprove(viewItem.id)}
                    style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Approve Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectItem && (
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
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#b91c1c',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              position: 'relative'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                <X size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Reject Payment</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Are you sure you want to reject this payment?</div>
              </div>
              <button onClick={() => setRejectItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  REASON FOR REJECTION *
                  <select
                    value={rejectForm.reason}
                    onChange={e => setRejectForm(prev => ({ ...prev, reason: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Incorrect Account">Incorrect Account</option>
                    <option value="UTR Reference Mismatch">UTR Reference Mismatch</option>
                    <option value="Duplicate Upload">Duplicate Upload</option>
                    <option value="Invalid Receipt Screenshot">Invalid Receipt Screenshot</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  REMARKS / EXPLANATION
                  <textarea
                    placeholder="Enter additional remarks for the user..."
                    rows={2}
                    value={rejectForm.remarks}
                    onChange={e => setRejectForm(prev => ({ ...prev, remarks: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </label>

              </div>

              {/* Warning Notice */}
              <div style={{
                background: '#fff1f2',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#b91c1c',
                fontSize: '0.75rem',
                border: '1px solid #fecdd3',
                marginBottom: '20px'
              }}>
                <AlertTriangle size={14} style={{ color: '#e11d48', flexShrink: 0 }} />
                <span>Rejection notifications are instantly dispatched to the payer/agent.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setRejectItem(null)}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#b91c1c', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Reject Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PaymentUploadList;
