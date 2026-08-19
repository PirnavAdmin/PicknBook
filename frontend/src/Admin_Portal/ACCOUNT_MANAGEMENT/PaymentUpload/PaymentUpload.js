/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Layers, 
  FileText, 
  Upload, 
  Info,
  X,
  FileCheck
} from 'lucide-react';

function PaymentUpload() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    payerName: '',
    paymentDate: '',
    amount: '',
    paymentMode: 'Bank Transfer',
    bankAccount: 'HDFC Bank - 8789',
    referenceNo: '',
    remarks: ''
  });
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate inputs
    if (!form.payerName || !form.paymentDate || !form.amount || !form.referenceNo) {
      alert('Please fill in all required fields.');
      return;
    }
    setSuccessMsg('Payment proof uploaded successfully! Our team will review the transaction.');
    setTimeout(() => {
      setSuccessMsg('');
      navigate('/admin/account-management/payment-upload-list');
    }, 2000);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ padding: '24px 30px', color: '#0f172a', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>Payment Upload</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Home &gt; Account Management &gt; <span style={{ color: '#A51C49', fontWeight: 600 }}>Payment Upload</span>
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
          <FileCheck size={20} />
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
            <Upload size={20} />
          </div>
          <div>
            <div style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              Upload Payment Proof
            </div>
            <div style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.2 }}>
              Submit manual booking payment transactions for review
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', marginBottom: '24px' }}>
            
            {/* Payer Name */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>PAYER NAME *</span>
                <input
                  type="text"
                  required
                  placeholder="Enter name of payer / source"
                  value={form.payerName}
                  onChange={e => setForm(prev => ({ ...prev, payerName: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Payment Date */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>PAYMENT DATE *</span>
                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
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
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>PAYMENT MODE *</span>
                <select
                  value={form.paymentMode}
                  onChange={e => setForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Bank Account */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>RECEIVING BANK / ACCOUNT *</span>
                <select
                  value={form.bankAccount}
                  onChange={e => setForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', background: '#fff' }}
                >
                  <option value="HDFC Bank - 8789">HDFC Bank - 8789</option>
                  <option value="ICICI Bank - 0123">ICICI Bank - 0123</option>
                  <option value="SBI - 5678">SBI - 5678</option>
                </select>
              </div>
            </div>

            {/* Transaction / Reference No. */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>TRANSACTION / REFERENCE NO. *</span>
                <input
                  type="text"
                  required
                  placeholder="Enter reference or UTR number"
                  value={form.referenceNo}
                  onChange={e => setForm(prev => ({ ...prev, referenceNo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Drag & Drop File Upload Zone */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>UPLOAD PROOF (RECEIPT / SCREENSHOT)</span>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('receipt-upload').click()}
                style={{
                  border: isDragOver ? '2px dashed #A51C49' : '2px dashed #cbd5e1',
                  background: isDragOver ? '#fff1f2' : '#f8fafc',
                  borderRadius: '12px',
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
              >
                <input
                  id="receipt-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff1f2', color: '#A51C49', display: 'grid', placeItems: 'center' }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                      {file ? `Size: ${(file.size / 1024).toFixed(1)} KB` : 'PNG, JPG, PDF (max 5MB)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9f1239', letterSpacing: '0.02em' }}>REMARKS</span>
              <textarea
                placeholder="Enter remarks (optional)"
                rows={2}
                value={form.remarks}
                onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
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

          {/* Crimson Notice Info box */}
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
            <span>Uploaded payment receipts are verified by our audit desk within 2 hours.</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/account-management/payment-upload-list')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(165, 28, 73, 0.2)' }}
            >
              Submit Payment →
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

export default PaymentUpload;
