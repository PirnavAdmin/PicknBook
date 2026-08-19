/* eslint-disable */
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Trash2, 
  X,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Upload,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';

const mockInvoices = [
  { id: '1', number: 'INV-2024-0001', customer: 'Ravi Kumar', amount: '15,000.00', date: '31-May-2024', status: 'Paid' },
  { id: '2', number: 'INV-2024-0002', customer: 'Anita Sharma', amount: '25,000.00', date: '30-May-2024', status: 'Pending' },
  { id: '3', number: 'INV-2024-0003', customer: 'Globe Connect', amount: '12,500.00', date: '29-May-2024', status: 'Overdue' },
];

function ManualInvoiceList() {
  const [invoices, setInvoices] = useState(mockInvoices);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Form State
  const [form, setForm] = useState({
    customer: 'Ravi Kumar',
    number: '',
    invoiceDate: '',
    dueDate: '',
    amount: '',
    status: 'Pending',
    remarks: ''
  });
  const [file, setFile] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.number || !form.invoiceDate || !form.dueDate || !form.amount) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const newInv = {
      id: String(invoices.length + 1),
      number: form.number,
      customer: form.customer,
      amount: parseFloat(form.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      date: new Date(form.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: form.status
    };

    setInvoices([...invoices, newInv]);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      customer: 'Ravi Kumar',
      number: '',
      invoiceDate: '',
      dueDate: '',
      amount: '',
      status: 'Pending',
      remarks: ''
    });
    setFile(null);
  };

  const deleteInvoice = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(i => i.id !== id));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
  };

  const filtered = invoices.filter(i => {
    const matchesSearch = i.number.toLowerCase().includes(search.toLowerCase()) || i.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {!showAddForm ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Manual Invoice List</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Manual Invoice List</span>
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
              <Plus size={16} /> Add Invoice
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
                placeholder="Search invoice number or customer..."
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
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
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
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '180px' }}>Invoice No.</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49' }}>Customer</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '150px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '160px' }}>Issue Date</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '130px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => {
                  const badgeColor = 
                    i.status === 'Paid' ? { bg: '#dcfce7', text: '#15803d' } :
                    i.status === 'Overdue' ? { bg: '#fee2e2', text: '#b91c1c' } :
                    { bg: '#fef3c7', text: '#b45309' };

                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#A51C49', fontFamily: 'monospace' }}>{i.number}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{i.customer}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹ {i.amount}</td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>{i.date}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: badgeColor.bg,
                          color: badgeColor.text
                        }}>
                          {i.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'inline-flex' }}>
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteInvoice(i.id)}
                            style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', padding: '5px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', display: 'inline-flex' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Add Manual Invoice view */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Add Manual Invoice</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Home &gt; Payment Management &gt; Manual Invoice List &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Add Manual Invoice</span>
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '30px' }}>
            
            <h4 style={{ margin: '0 0 20px', color: '#A51C49', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Invoice Information
            </h4>
            
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', marginBottom: '28px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  CUSTOMER *
                  <select
                    value={form.customer}
                    onChange={e => setForm(prev => ({ ...prev, customer: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                  >
                    <option value="Ravi Kumar">Ravi Kumar</option>
                    <option value="Anita Sharma">Anita Sharma</option>
                    <option value="Globe Connect">Globe Connect</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  INVOICE NUMBER *
                  <input
                    type="text"
                    required
                    placeholder="Enter invoice number (e.g. INV-2024-0010)"
                    value={form.number}
                    onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  INVOICE DATE *
                  <input
                    type="date"
                    required
                    value={form.invoiceDate}
                    onChange={e => setForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  DUE DATE *
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>
                  AMOUNT (₹) *
                  <input
                    type="number"
                    required
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
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
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', gridColumn: '1 / -1' }}>
                  REMARKS (OPTIONAL)
                  <textarea
                    placeholder="Enter invoice remarks..."
                    rows={2}
                    value={form.remarks}
                    onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </label>

                {/* File attachment */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239' }}>UPLOAD INVOICE FILE</span>
                  
                  <div
                    onClick={() => document.getElementById('file-upload').click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '30px',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={22} style={{ color: '#A51C49' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                        {file ? file.name : 'Click to upload or drag and drop'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>PDF, JPG, PNG (Max 5MB)</span>
                    </div>
                  </div>
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

export default ManualInvoiceList;
