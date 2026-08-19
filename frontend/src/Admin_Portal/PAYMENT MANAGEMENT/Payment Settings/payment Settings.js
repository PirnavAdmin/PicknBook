/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Power, 
  Trash2, 
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const mockMethods = [
  { id: '1', name: 'Razorpay', provider: 'Razorpay', type: 'Online', status: 'Active', isDefault: 'Yes' },
  { id: '2', name: 'Stripe', provider: 'Stripe', type: 'Online', status: 'Active', isDefault: 'No' },
  { id: '3', name: 'PayPal', provider: 'PayPal', type: 'Online', status: 'Active', isDefault: 'No' },
  { id: '4', name: 'Wallet', provider: 'PickNBook Wallet', type: 'Wallet', status: 'Active', isDefault: 'No' },
  { id: '5', name: 'Cash on Delivery', provider: 'Manual', type: 'Offline', status: 'Inactive', isDefault: 'No' },
];

function PaymentSettings() {
  const [methods, setMethods] = useState(mockMethods);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Form State
  const [form, setForm] = useState({
    name: '',
    provider: 'Razorpay',
    type: 'Online',
    status: 'Active',
    isDefault: false,
    currency: 'INR - Indian Rupee',
    mode: 'Live',
    apiKey: '',
    secretKey: '',
    webhookUrl: '',
    description: ''
  });

  const handleCreate = (e) => {
    if (e) e.preventDefault();
    if (!form.name || !form.apiKey || !form.secretKey) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const newMethod = {
      id: String(methods.length + 1),
      name: form.name,
      provider: form.provider,
      type: form.type,
      status: form.status,
      isDefault: form.isDefault ? 'Yes' : 'No'
    };

    let updated = [...methods];
    if (form.isDefault) {
      updated = updated.map(m => ({ ...m, isDefault: 'No' }));
    }
    setMethods([...updated, newMethod]);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      provider: 'Razorpay',
      type: 'Online',
      status: 'Active',
      isDefault: false,
      currency: 'INR - Indian Rupee',
      mode: 'Live',
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      description: ''
    });
  };

  const toggleStatus = (id) => {
    setMethods(methods.map(m => m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m));
  };

  const deleteMethod = (id) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      setMethods(methods.filter(m => m.id !== id));
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setTypeFilter('All');
  };

  const filtered = methods.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.provider.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchesType = typeFilter === 'All' || m.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalCount = methods.length;
  const activeCount = methods.filter(m => m.status === 'Active').length;
  const inactiveCount = methods.filter(m => m.status === 'Inactive').length;
  const defaultMethodName = methods.find(m => m.isDefault === 'Yes')?.name || 'None';

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Dynamic layout based on showAddForm */}
      {!showAddForm ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Payment Setting</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Configure and manage payment methods, gateways and payment rules.
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
              <Plus size={16} /> Add Payment Method
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Methods</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{totalCount}</h3>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'grid', placeItems: 'center', color: '#15803d' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Methods</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{activeCount}</h3>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#b91c1c' }}>
                <X size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Inactive Methods</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{inactiveCount}</h3>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fdf2f8', display: 'grid', placeItems: 'center', color: '#db2777' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Default Method</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{defaultMethodName}</h3>
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
                placeholder="Search payment method..."
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

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', fontWeight: 500 }}
            >
              <option value="All">All Type</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Wallet">Wallet</option>
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
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Method Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Provider / Gateway</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '140px' }}>Type</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '120px' }}>Default</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{m.name}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{m.provider}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 500 }}>{m.type}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: m.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        color: m.status === 'Active' ? '#15803d' : '#b91c1c'
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: m.isDefault === 'Yes' ? '#16a34a' : '#64748b' }}>{m.isDefault}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                          <Eye size={13} />
                        </button>
                        <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => toggleStatus(m.id)}
                          style={{ border: '1px solid #cbd5e1', background: m.status === 'Active' ? '#fef3c7' : '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: m.status === 'Active' ? '#d97706' : '#64748b', display: 'inline-flex' }}
                          title="Toggle Status"
                        >
                          <Power size={13} />
                        </button>
                        <button
                          onClick={() => deleteMethod(m.id)}
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
        /* Add Payment Method view */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Add Payment Method</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; Payment Setting &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Add Payment Method</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => alert('Configuration tested successfully!')}
                style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Test Configuration
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleCreate}
                style={{ background: '#A51C49', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.2)' }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '30px' }}>
            
            {/* Section 1: Details */}
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Payment Method Details
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                METHOD NAME *
                <input
                  type="text"
                  required
                  placeholder="Enter method name"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                PROVIDER / GATEWAY *
                <select
                  value={form.provider}
                  onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Razorpay">Razorpay</option>
                  <option value="Stripe">Stripe</option>
                  <option value="PayPal">PayPal</option>
                  <option value="PickNBook Wallet">PickNBook Wallet</option>
                  <option value="Manual">Manual</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                METHOD TYPE *
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Wallet">Wallet</option>
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

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                  style={{
                    position: 'relative',
                    width: '46px',
                    height: '22px',
                    borderRadius: '11px',
                    background: form.isDefault ? '#A51C49' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0,
                    outline: 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: form.isDefault ? '26px' : '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s'
                  }} />
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Set as default method</span>
              </div>
            </div>

            {/* Section 2: Configuration */}
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Configuration
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                CURRENCY *
                <select
                  value={form.currency}
                  onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="INR - Indian Rupee">INR - Indian Rupee</option>
                  <option value="USD - US Dollar">USD - US Dollar</option>
                  <option value="EUR - Euro">EUR - Euro</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                MODE *
                <select
                  value={form.mode}
                  onChange={e => setForm(prev => ({ ...prev, mode: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Live">Live</option>
                  <option value="Sandbox">Sandbox</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                API KEY *
                <input
                  type="text"
                  required
                  placeholder="Enter API key"
                  value={form.apiKey}
                  onChange={e => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                SECRET KEY *
                <input
                  type="password"
                  required
                  placeholder="Enter secret key"
                  value={form.secretKey}
                  onChange={e => setForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', gridColumn: '1 / -1' }}>
                WEBHOOK URL *
                <input
                  type="text"
                  required
                  placeholder="Enter webhook URL"
                  value={form.webhookUrl}
                  onChange={e => setForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', gridColumn: '1 / -1' }}>
                DESCRIPTION
                <textarea
                  placeholder="Enter description (optional)"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </label>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm(); }}
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.15)' }}
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default PaymentSettings;
