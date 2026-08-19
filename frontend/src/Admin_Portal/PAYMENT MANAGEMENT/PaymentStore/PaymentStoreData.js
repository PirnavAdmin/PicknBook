/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X,
  Building2,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const mockStores = [
  { id: '1', name: 'PickNBook Main', provider: 'Razorpay', status: 'Active' },
  { id: '2', name: 'PickNBook Ind', provider: 'Stripe', status: 'Active' },
];

function PaymentStoreData() {
  const [stores, setStores] = useState(mockStores);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State
  const [form, setForm] = useState({
    name: '',
    provider: 'Razorpay',
    status: 'Active'
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name) {
      alert('Please enter a store name.');
      return;
    }

    const newStore = {
      id: String(stores.length + 1),
      name: form.name,
      provider: form.provider,
      status: form.status
    };

    setStores([...stores, newStore]);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      provider: 'Razorpay',
      status: 'Active'
    });
  };

  const deleteStore = (id) => {
    if (window.confirm('Are you sure you want to delete this payment store?')) {
      setStores(stores.filter(s => s.id !== id));
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
  };

  const filtered = stores.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {!showAddForm ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Payment Store Data</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Payment Store Data</span>
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
              <Plus size={16} /> Add Store
            </button>
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
                placeholder="Search store or provider..."
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
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Store Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '220px' }}>Provider</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '140px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{s.provider}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: s.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        color: s.status === 'Active' ? '#15803d' : '#b91c1c'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteStore(s.id)}
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
        /* Add Store view */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Add Store</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; Payment Store Data &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Add Store</span>
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '30px' }}>
            
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Store Information
            </h4>
            
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  STORE NAME *
                  <input
                    type="text"
                    required
                    placeholder="Enter store name"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  PROVIDER *
                  <select
                    value={form.provider}
                    onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Razorpay">Razorpay</option>
                    <option value="Stripe">Stripe</option>
                    <option value="PayPal">PayPal</option>
                    <option value="PickNBook Wallet">PickNBook Wallet</option>
                  </select>
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

export default PaymentStoreData;
