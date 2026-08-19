/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Star, 
  AlertTriangle,
  Info
} from 'lucide-react';

const mockBanks = [
  { id: '1', name: 'HDFC Bank', number: '50100254988789', holder: 'PickNBook Pvt Ltd', ifsc: 'HDFC0001890', status: 'Active', primary: true },
  { id: '2', name: 'ICICI Bank', number: '12340567890123', holder: 'PickNBook Pvt Ltd', ifsc: 'ICIC0001221', status: 'Active', primary: false },
  { id: '3', name: 'State Bank of India', number: '09888235455678', holder: 'PickNBook Pvt Ltd', ifsc: 'SBIN0000876', status: 'Inactive', primary: false },
];

function BankList() {
  const [banks, setBanks] = useState(mockBanks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '', number: '', holder: '', ifsc: '', status: 'Active', primary: false
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const newBank = {
      id: String(banks.length + 1),
      ...addForm,
      primary: banks.length === 0 ? true : addForm.primary
    };

    let updatedBanks = [...banks];
    if (newBank.primary) {
      updatedBanks = updatedBanks.map(b => ({ ...b, primary: false }));
    }
    setBanks([...updatedBanks, newBank]);
    setShowAddForm(false);
    setAddForm({ name: '', number: '', holder: '', ifsc: '', status: 'Active', primary: false });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    let updatedBanks = banks.map(b => {
      if (b.id === editItem.id) {
        return { ...editItem };
      }
      return b;
    });

    if (editItem.primary) {
      updatedBanks = updatedBanks.map(b => b.id === editItem.id ? b : { ...b, primary: false });
    }
    setBanks(updatedBanks);
    setEditItem(null);
  };

  const performDelete = () => {
    const wasPrimary = deleteItem.primary;
    let updatedBanks = banks.filter(b => b.id !== deleteItem.id);
    if (wasPrimary && updatedBanks.length > 0) {
      updatedBanks[0].primary = true; // Default first as primary if primary was deleted
    }
    setBanks(updatedBanks);
    setDeleteItem(null);
  };

  const togglePrimary = (id) => {
    const updated = banks.map(b => ({
      ...b,
      primary: b.id === id ? true : false
    }));
    setBanks(updated);
  };

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Bank List</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Bank List</span>
          </p>
        </div>

        {!showAddForm && (
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
            <Plus size={16} /> Add Bank
          </button>
        )}
      </div>

      {/* In-page Add Form */}
      {showAddForm && (
        <div style={{
          width: '100%',
          margin: '0 0 32px',
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
            gap: '16px',
            position: 'relative'
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
              <Plus size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                Add Bank Account
              </div>
              <div style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.2 }}>
                Configure a new bank gateway or settlement account
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', display: 'inline-flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCreate} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', marginBottom: '20px' }}>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                BANK NAME *
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank"
                  value={addForm.name}
                  onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                ACCOUNT NUMBER *
                <input
                  type="text"
                  required
                  placeholder="Enter account number"
                  value={addForm.number}
                  onChange={e => setAddForm(prev => ({ ...prev, number: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                ACCOUNT HOLDER *
                <input
                  type="text"
                  required
                  placeholder="Enter account holder name"
                  value={addForm.holder}
                  onChange={e => setAddForm(prev => ({ ...prev, holder: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                IFSC CODE *
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0000123"
                  value={addForm.ifsc}
                  onChange={e => setAddForm(prev => ({ ...prev, ifsc: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                STATUS *
                <select
                  value={addForm.status}
                  onChange={e => setAddForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setAddForm(prev => ({ ...prev, primary: !prev.primary }))}
                  style={{
                    position: 'relative',
                    width: '46px',
                    height: '22px',
                    borderRadius: '11px',
                    background: addForm.primary ? '#A51C49' : '#cbd5e1',
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
                    left: addForm.primary ? '26px' : '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s'
                  }} />
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Set as Primary Account</span>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.2)' }}
              >
                Save Bank Link →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank details table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '60px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Bank Name</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Account Number</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '200px' }}>Account Holder</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>IFSC Code</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px' }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '90px', textAlign: 'center' }}>Primary</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((b, idx) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                <td style={{ padding: '14px 16px', color: '#334155', fontFamily: 'monospace' }}>{b.number}</td>
                <td style={{ padding: '14px 16px', color: '#334155' }}>{b.holder}</td>
                <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 500 }}>{b.ifsc}</td>
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: b.primary ? '#eab308' : '#cbd5e1' }}
                  >
                    <Star fill={b.primary ? '#eab308' : 'none'} size={18} />
                  </button>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setEditItem({ ...b })}
                      style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteItem(b)}
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

      {/* Edit Bank Modal */}
      {editItem && (
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
            maxWidth: '540px',
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
                <Pencil size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Edit Bank Details</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Modify the bank gateway settings</div>
              </div>
              <button onClick={() => setEditItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  BANK NAME *
                  <input
                    type="text"
                    required
                    value={editItem.name}
                    onChange={e => setEditItem(prev => ({ ...prev, name: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  ACCOUNT NUMBER *
                  <input
                    type="text"
                    required
                    value={editItem.number}
                    onChange={e => setEditItem(prev => ({ ...prev, number: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  ACCOUNT HOLDER *
                  <input
                    type="text"
                    required
                    value={editItem.holder}
                    onChange={e => setEditItem(prev => ({ ...prev, holder: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  IFSC CODE *
                  <input
                    type="text"
                    required
                    value={editItem.ifsc}
                    onChange={e => setEditItem(prev => ({ ...prev, ifsc: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  STATUS *
                  <select
                    value={editItem.status}
                    onChange={e => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%', paddingTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setEditItem(prev => ({ ...prev, primary: !prev.primary }))}
                    style={{
                      position: 'relative',
                      width: '46px',
                      height: '22px',
                      borderRadius: '11px',
                      background: editItem.primary ? '#A51C49' : '#cbd5e1',
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
                      left: editItem.primary ? '26px' : '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s'
                    }} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Set as Primary</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.15)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bank Modal */}
      {deleteItem && (
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
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '28px 32px 16px', position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  Delete Bank
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Are you sure you want to delete this bank?
                </p>
              </div>
              <button onClick={() => setDeleteItem(null)} style={{ position: 'absolute', top: '28px', right: '28px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0 32px 12px' }}>
              <div style={{
                background: '#fff1f2',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#9f1239',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #fecdd3'
              }}>
                <Info size={16} style={{ color: '#e11d48', flexShrink: 0 }} />
                <span>This action cannot be undone. Deleting this bank may affect routing transactions.</span>
              </div>
            </div>

            <div style={{ padding: '16px 32px 28px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteItem(null)}
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.15)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default BankList;
