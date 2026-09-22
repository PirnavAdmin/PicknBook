/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Trash2, 
  X,
  Building2,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Star
} from 'lucide-react';

const mockBanks = [
  { id: '1', name: 'HDFC Bank', number: '50100254988789', ifsc: 'HDFC0001234', holder: 'PickNBook Pvt Ltd', status: 'Active', isPrimary: 'Yes' },
  { id: '2', name: 'ICICI Bank', number: '123456789012', ifsc: 'ICIC0000123', holder: 'PickNBook Pvt Ltd', status: 'Active', isPrimary: 'No' },
  { id: '3', name: 'State Bank of India', number: '30987654321', ifsc: 'SBIN0004567', holder: 'PickNBook Pvt Ltd', status: 'Inactive', isPrimary: 'No' },
];

function BankDetailList() {
  const [banks, setBanks] = useState(mockBanks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [purposeFilter, setPurposeFilter] = useState('All');

  // Form State
  const [form, setForm] = useState({
    name: 'HDFC Bank',
    number: '',
    ifsc: '',
    holder: '',
    purpose: 'Operations',
    status: 'Active',
    isPrimary: false
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.number || !form.ifsc || !form.holder) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const newBank = {
      id: String(banks.length + 1),
      name: form.name,
      number: form.number,
      ifsc: form.ifsc,
      holder: form.holder,
      status: form.status,
      isPrimary: form.isPrimary ? 'Yes' : 'No'
    };

    let updated = [...banks];
    if (form.isPrimary) {
      updated = updated.map(b => ({ ...b, isPrimary: 'No' }));
    }
    setBanks([...updated, newBank]);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: 'HDFC Bank',
      number: '',
      ifsc: '',
      holder: '',
      purpose: 'Operations',
      status: 'Active',
      isPrimary: false
    });
  };

  const deleteBank = (id) => {
    if (window.confirm('Are you sure you want to delete this bank details?')) {
      setBanks(banks.filter(b => b.id !== id));
    }
  };

  const togglePrimary = (id) => {
    setBanks(banks.map(b => ({
      ...b,
      isPrimary: b.id === id ? 'Yes' : 'No'
    })));
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPurposeFilter('All');
  };

  const filtered = banks.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.number.includes(search) || b.holder.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = banks.length;
  const activeCount = banks.filter(b => b.status === 'Active').length;
  const inactiveCount = banks.filter(b => b.status === 'Inactive').length;
  const primaryCount = banks.filter(b => b.isPrimary === 'Yes').length;

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {!showAddForm ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Bank Detail List</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Bank Detail List</span>
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
              <Plus size={16} /> Add Bank Account
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
                <Building2 size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Banks</span>
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

            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fdf2f8', display: 'grid', placeItems: 'center', color: '#db2777' }}>
                <Star size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Primary Account</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{primaryCount}</h3>
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
                placeholder="Search bank name or account..."
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
              value={purposeFilter}
              onChange={e => setPurposeFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', fontWeight: 500 }}
            >
              <option value="All">All Purpose</option>
              <option value="Operations">Operations</option>
              <option value="Payout">Payout</option>
              <option value="Reserve">Reserve</option>
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
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Bank Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Account Number</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '140px' }}>IFSC Code</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '200px' }}>Account Holder</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '90px', textAlign: 'center' }}>Primary</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{b.number}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 500 }}>{b.ifsc}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{b.holder}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: b.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        color: b.status === 'Active' ? '#15803d' : '#b91c1c'
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => togglePrimary(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: b.isPrimary === 'Yes' ? '#eab308' : '#cbd5e1' }}
                      >
                        <Star fill={b.isPrimary === 'Yes' ? '#eab308' : 'none'} size={18} />
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteBank(b.id)}
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
        /* Add Bank Account view */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Add Bank Account</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; Bank Detail List &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Add Bank Account</span>
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '30px' }}>
            
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Bank Account Details
            </h4>
            
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  BANK NAME *
                  <select
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Bank">Kotak Bank</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  ACCOUNT NUMBER *
                  <input
                    type="text"
                    required
                    placeholder="Enter account number"
                    value={form.number}
                    onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  IFSC CODE *
                  <input
                    type="text"
                    required
                    placeholder="Enter IFSC code"
                    value={form.ifsc}
                    onChange={e => setForm(prev => ({ ...prev, ifsc: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  ACCOUNT HOLDER NAME *
                  <input
                    type="text"
                    required
                    placeholder="Enter account holder name"
                    value={form.holder}
                    onChange={e => setForm(prev => ({ ...prev, holder: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  ACCOUNT PURPOSE *
                  <select
                    value={form.purpose}
                    onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Operations">Operations</option>
                    <option value="Payout">Payout</option>
                    <option value="Reserve">Reserve</option>
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
                    onClick={() => setForm(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
                    style={{
                      position: 'relative',
                      width: '46px',
                      height: '22px',
                      borderRadius: '11px',
                      background: form.isPrimary ? '#A51C49' : '#cbd5e1',
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
                      left: form.isPrimary ? '26px' : '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s'
                    }} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Mark as primary account</span>
                </div>
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

export default BankDetailList;
