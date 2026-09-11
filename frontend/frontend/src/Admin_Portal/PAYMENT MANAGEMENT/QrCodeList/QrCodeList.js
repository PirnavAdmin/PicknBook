/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X,
  QrCode,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const mockQrs = [
  { id: '1', name: 'Main Office QR', bank: 'HDFC Bank', upi: 'admin@picknbook', status: 'Active' },
  { id: '2', name: 'Collections QR', bank: 'ICICI Bank', upi: 'collect@picknbook', status: 'Active' },
  { id: '3', name: 'Support QR', bank: 'SBI', upi: 'support@sbi-picknbook', status: 'Inactive' },
];

function PaymentQrCodeList() {
  const [qrs, setQrs] = useState(mockQrs);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State
  const [form, setForm] = useState({
    name: '',
    bank: 'HDFC Bank',
    upi: '',
    status: 'Active'
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name || !form.upi) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const newQr = {
      id: String(qrs.length + 1),
      name: form.name,
      bank: form.bank,
      upi: form.upi,
      status: form.status
    };

    setQrs([...qrs, newQr]);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      bank: 'HDFC Bank',
      upi: '',
      status: 'Active'
    });
  };

  const deleteQr = (id) => {
    if (window.confirm('Are you sure you want to delete this QR code details?')) {
      setQrs(qrs.filter(q => q.id !== id));
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
  };

  const filtered = qrs.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(search.toLowerCase()) || q.upi.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = qrs.length;
  const activeCount = qrs.filter(q => q.status === 'Active').length;
  const inactiveCount = qrs.filter(q => q.status === 'Inactive').length;

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {!showAddForm ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>QR Code List</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>QR Code List</span>
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
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
              <Plus size={16} /> Add QR Code
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
                <QrCode size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total QR Codes</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{totalCount}</h3>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'grid', placeItems: 'center', color: '#15803d' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{activeCount}</h3>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#b91c1c' }}>
                <X size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Inactive</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{inactiveCount}</h3>
              </div>
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
                placeholder="Search QR Name or UPI ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', fontWeight: 500 }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={resetFilters}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>QR Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '220px' }}>Bank / Account</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '260px' }}>UPI ID / Web</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, idx) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{q.name}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{q.bank}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 500 }}>{q.upi}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: q.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        color: q.status === 'Active' ? '#15803d' : '#b91c1c'
                      }}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteQr(q.id)}
                          style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', display: 'inline-flex' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Add QR Code view */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Add QR Code</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; QR Code List &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Add QR Code</span>
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '30px' }}>
            
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              QR Code Information
            </h4>
            
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  QR NAME *
                  <input
                    type="text"
                    required
                    placeholder="Enter QR name"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  BANK / ACCOUNT *
                  <select
                    value={form.bank}
                    onChange={e => setForm(prev => ({ ...prev, bank: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="SBI">SBI</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  UPI ID / WEB *
                  <input
                    type="text"
                    required
                    placeholder="Enter UPI ID (e.g. picknbook@bank)"
                    value={form.upi}
                    onChange={e => setForm(prev => ({ ...prev, upi: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  STATUS *
                  <select
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); resetForm(); }}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.15)' }}
                >
                  Save
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default PaymentQrCodeList;
