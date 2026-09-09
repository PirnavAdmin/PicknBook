/* eslint-disable */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCw,
  Trash2,
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Upload,
  X,
  ChevronDown,
  Paperclip
} from 'lucide-react';

const INITIAL_ADJUSTMENTS = [
  {
    id: 'ADJ-00125',
    date: '08 Sep 2026',
    type: 'Credit',
    account: 'Cash Account',
    referenceType: 'Booking',
    referenceId: 'BOOK-77821',
    amount: 25000,
    reason: 'Correction',
    description: 'Amount adjusted due to booking fee difference.',
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '08 Sep 2026, 10:30 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '08 Sep 2026, 12:15 PM',
    customer: 'Ramesh Kumar',
    transactionId: 'TXN-901458',
    module: 'Flight',
    attachment: 'invoice_adjustment.pdf'
  },
  {
    id: 'ADJ-00124',
    date: '07 Sep 2026',
    type: 'Debit',
    account: 'Gateway Fees',
    referenceType: 'Transaction',
    referenceId: 'TXN-901458',
    amount: 5500,
    reason: 'Gateway Fee',
    description: 'Adjustment for gateway processing charges.',
    status: 'Pending',
    createdBy: 'Finance Team',
    createdTime: '07 Sep 2026, 02:15 PM',
    approvedBy: '-',
    approvedTime: '-',
    customer: 'Priya Sharma',
    transactionId: 'TXN-901458',
    module: 'Bus',
    attachment: 'gateway_receipt.pdf'
  },
  {
    id: 'ADJ-00123',
    date: '05 Sep 2026',
    type: 'Credit',
    account: 'Refund Account',
    referenceType: 'Refund',
    referenceId: 'REF-55621',
    amount: 9200,
    reason: 'Refund Adj.',
    description: 'Partial refund reconciliation credit.',
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '05 Sep 2026, 09:40 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '05 Sep 2026, 11:10 AM',
    customer: 'Amit Patel',
    transactionId: 'TXN-882310',
    module: 'Hotel',
    attachment: 'refund_doc.pdf'
  },
  {
    id: 'ADJ-00122',
    date: '03 Sep 2026',
    type: 'Debit',
    account: 'Bank Charges',
    referenceType: 'Bank',
    referenceId: 'BANK-45461',
    amount: 12000,
    reason: 'Bank Fee',
    description: 'Bank wire transfer adjustment charge.',
    status: 'Rejected',
    createdBy: 'Finance Team',
    createdTime: '03 Sep 2026, 04:20 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '04 Sep 2026, 09:15 AM',
    customer: 'N/A',
    transactionId: 'TXN-773411',
    module: 'Banking',
    attachment: ''
  },
  {
    id: 'ADJ-00121',
    date: '01 Sep 2026',
    type: 'Credit',
    account: 'Customer Wallet',
    referenceType: 'Customer',
    referenceId: 'CUST-99211',
    amount: 2500,
    reason: 'Customer Balance',
    description: 'Wallet top-up bonus credit correction.',
    status: 'Approved',
    createdBy: 'Finance Team',
    createdTime: '01 Sep 2026, 01:10 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '01 Sep 2026, 03:00 PM',
    customer: 'Suresh Raina',
    transactionId: 'TXN-662100',
    module: 'Wallet',
    attachment: 'wallet_credit.pdf'
  },
  {
    id: 'ADJ-00120',
    date: '28 Aug 2026',
    type: 'Debit',
    account: 'Service Tax',
    referenceType: 'Invoice',
    referenceId: 'TAX-200480',
    amount: 7800,
    reason: 'Tax Correction',
    description: 'GST tax rate correction debit.',
    status: 'Approved',
    createdBy: 'Finance Team',
    createdTime: '28 Aug 2026, 11:00 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '28 Aug 2026, 02:45 PM',
    customer: 'Corporate Client A',
    transactionId: 'TXN-554122',
    module: 'Flight',
    attachment: 'tax_invoice.pdf'
  },
  {
    id: 'ADJ-00119',
    date: '25 Aug 2026',
    type: 'Credit',
    account: 'Cash Account',
    referenceType: 'Booking',
    referenceId: 'BOOK-77801',
    amount: 15000,
    reason: 'Manual Correction',
    description: 'Manual cash settlement credit adjustment.',
    status: 'Pending',
    createdBy: 'Admin',
    createdTime: '25 Aug 2026, 03:30 PM',
    approvedBy: '-',
    approvedTime: '-',
    customer: 'Anita Desai',
    transactionId: 'TXN-443100',
    module: 'Hotel',
    attachment: ''
  },
  {
    id: 'ADJ-00118',
    date: '22 Aug 2026',
    type: 'Credit',
    account: 'Gateway Fees',
    referenceType: 'Transaction',
    referenceId: 'TXN-102399',
    amount: 4200,
    reason: 'Chargeback Adj.',
    description: 'Chargeback reversal fee credit.',
    status: 'Approved',
    createdBy: 'Finance Team',
    createdTime: '22 Aug 2026, 10:15 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '22 Aug 2026, 12:00 PM',
    customer: 'Vikram Singh',
    transactionId: 'TXN-102399',
    module: 'Flight',
    attachment: 'chargeback_doc.pdf'
  },
  {
    id: 'ADJ-00117',
    date: '19 Aug 2026',
    type: 'Debit',
    account: 'Hotel Wallet',
    referenceType: 'Booking',
    referenceId: 'BOOK-77561',
    amount: 9600,
    reason: 'Promotional Credit',
    description: 'Promo code discount debit adjustment.',
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '19 Aug 2026, 05:00 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '20 Aug 2026, 10:00 AM',
    customer: 'Rajesh Gupta',
    transactionId: 'TXN-332190',
    module: 'Hotel',
    attachment: ''
  },
  {
    id: 'ADJ-00116',
    date: '18 Aug 2026',
    type: 'Debit',
    account: 'Reversal',
    referenceType: 'Transaction',
    referenceId: 'TXN-300355',
    amount: 6400,
    reason: 'Duplicate Payment',
    description: 'Duplicate payment transaction reversal.',
    status: 'Pending',
    createdBy: 'Finance Team',
    createdTime: '18 Aug 2026, 11:45 AM',
    approvedBy: '-',
    approvedTime: '-',
    customer: 'Meena Reddy',
    transactionId: 'TXN-300355',
    module: 'Bus',
    attachment: ''
  }
];

const DEFAULT_FORM = {
  id: '',
  type: 'Credit',
  date: '08 Sep 2026',
  account: 'Cash Account',
  amount: '',
  referenceType: 'Booking',
  referenceId: '',
  reason: 'Correction',
  description: '',
  attachment: '',
  customer: '',
  module: 'Flight'
};

export default function AccountAdjustment() {
  const navigate = useNavigate();

  // Navigation / View State
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit' | 'details'
  const [adjustments, setAdjustments] = useState(INITIAL_ADJUSTMENTS);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Filter State
  const [filters, setFilters] = useState({
    dateRange: '01 Sep 2026 - 30 Sep 2026',
    type: 'All',
    status: 'All',
    account: 'All',
    query: ''
  });

  // Action Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modal / Action Popup State
  const [modal, setModal] = useState({
    isOpen: false,
    action: null, // 'approve' | 'reject' | 'reverse' | 'delete'
    item: null,
    reason: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Notification Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter Logic
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(item => {
      if (filters.type !== 'All' && item.type !== filters.type) return false;
      if (filters.status !== 'All' && item.status !== filters.status) return false;
      if (filters.account !== 'All' && item.account !== filters.account) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesRef = item.referenceId.toLowerCase().includes(q);
        const matchesReason = item.reason.toLowerCase().includes(q);
        const matchesAccount = item.account.toLowerCase().includes(q);
        if (!matchesId && !matchesRef && !matchesReason && !matchesAccount) return false;
      }
      return true;
    });
  }, [adjustments, filters]);

  // Paginated List
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdjustments.slice(start, start + itemsPerPage);
  }, [filteredAdjustments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAdjustments.length / itemsPerPage) || 1;

  // Actions
  const handleOpenCreate = () => {
    const newId = `ADJ-${String(126 + adjustments.length).padStart(5, '0')}`;
    setFormData({ ...DEFAULT_FORM, id: newId });
    setView('create');
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      id: item.id,
      type: item.type,
      date: item.date,
      account: item.account,
      amount: item.amount,
      referenceType: item.referenceType,
      referenceId: item.referenceId,
      reason: item.reason,
      description: item.description,
      attachment: item.attachment || '',
      customer: item.customer || '',
      module: item.module || 'Flight'
    });
    setActiveDropdown(null);
    setView('edit');
  };

  const handleOpenDetails = (item) => {
    setSelectedItem(item);
    setActiveDropdown(null);
    setView('details');
  };

  const handleSaveForm = (isDraft = false) => {
    if (!formData.amount || !formData.account) {
      alert('Please fill in required fields (Account, Amount).');
      return;
    }

    if (view === 'create') {
      const newItem = {
        ...formData,
        amount: Number(formData.amount),
        status: isDraft ? 'Pending' : 'Pending',
        createdBy: 'Admin',
        createdTime: '08 Sep 2026, 12:30 PM',
        approvedBy: '-',
        approvedTime: '-'
      };
      setAdjustments(prev => [newItem, ...prev]);
      showToast(`Account adjustment ${newItem.id} created successfully!`);
    } else if (view === 'edit') {
      setAdjustments(prev =>
        prev.map(i => (i.id === formData.id ? { ...i, ...formData, amount: Number(formData.amount) } : i))
      );
      showToast(`Account adjustment ${formData.id} updated successfully!`);
    }

    setView('list');
  };

  // Modal Action Handlers
  const handleOpenModal = (action, item) => {
    setActiveDropdown(null);
    setModal({ isOpen: true, action, item, reason: '' });
  };

  const handleConfirmModalAction = () => {
    const { action, item, reason } = modal;
    if (!item) return;

    if (action === 'approve') {
      setAdjustments(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, status: 'Approved', approvedBy: 'Finance Manager', approvedTime: '08 Sep 2026, 12:45 PM' }
            : i
        )
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => ({ ...prev, status: 'Approved', approvedBy: 'Finance Manager', approvedTime: '08 Sep 2026, 12:45 PM' }));
      }
      showToast(`Adjustment ${item.id} approved successfully!`);
    } else if (action === 'reject') {
      setAdjustments(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'Rejected', approvedBy: 'Finance Manager' } : i))
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => ({ ...prev, status: 'Rejected', approvedBy: 'Finance Manager' }));
      }
      showToast(`Adjustment ${item.id} rejected.`);
    } else if (action === 'reverse') {
      const reversedId = `ADJ-REV-${item.id}`;
      const revItem = {
        ...item,
        id: reversedId,
        type: item.type === 'Credit' ? 'Debit' : 'Credit',
        reason: 'Reversal',
        description: `Reversal of ${item.id}. Reason: ${reason || 'Accounting Correction'}`,
        status: 'Approved',
        date: '08 Sep 2026',
        createdBy: 'Admin',
        createdTime: '08 Sep 2026, 12:50 PM',
        approvedBy: 'System Auto',
        approvedTime: '08 Sep 2026, 12:50 PM'
      };
      setAdjustments(prev => [revItem, ...prev]);
      showToast(`Reversal transaction ${reversedId} posted!`);
    } else if (action === 'delete') {
      setAdjustments(prev => prev.filter(i => i.id !== item.id));
      showToast(`Adjustment ${item.id} deleted.`, 'info');
      if (view === 'details') setView('list');
    }

    setModal({ isOpen: false, action: null, item: null, reason: '' });
  };

  return (
    <div style={{
      padding: '20px 24px',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          background: toast.type === 'info' ? '#3b82f6' : '#10b981',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: LIST VIEW
         ───────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Header & Breadcrumb */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>Account Adjustment</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Account Adjustment
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                Manage manual account credits and debits to maintain accurate financial records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#A51C49',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(165, 28, 73, 0.25)'
              }}
            >
              <Plus size={15} />
              Create Adjustment
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Card 1 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Adjustments</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>125</h3>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>↑ 12% from last month</span>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCw size={18} />
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Credit</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>₹ 8,75,400</h3>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>↑ 18% from last month</span>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={20} />
              </div>
            </div>

            {/* Card 3 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Debit</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>₹ 5,26,800</h3>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>↓ 5% from last month</span>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={20} />
              </div>
            </div>

            {/* Card 4 */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pending Approval</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>12</h3>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>↓ 20% from last month</span>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
            </div>
          </div>

          {/* Filter Bar Toolbar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {/* Date Range */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Date Range</span>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '11px',
                background: '#ffffff',
                color: '#334155'
              }}>
                <Calendar size={12} color="#64748b" />
                <span>{filters.dateRange}</span>
                <ChevronDown size={12} color="#64748b" />
              </div>
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Adjustment Type</span>
              <select
                value={filters.type}
                onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  padding: '5px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#334155',
                  outline: 'none',
                  background: '#ffffff',
                  height: '28px'
                }}
              >
                <option value="All">All</option>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Status</span>
              <select
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  padding: '5px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#334155',
                  outline: 'none',
                  background: '#ffffff',
                  height: '28px'
                }}
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Account Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Account</span>
              <select
                value={filters.account}
                onChange={e => setFilters(prev => ({ ...prev, account: e.target.value }))}
                style={{
                  padding: '5px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#334155',
                  outline: 'none',
                  background: '#ffffff',
                  height: '28px'
                }}
              >
                <option value="All">All</option>
                <option value="Cash Account">Cash Account</option>
                <option value="Gateway Fees">Gateway Fees</option>
                <option value="Refund Account">Refund Account</option>
                <option value="Bank Charges">Bank Charges</option>
                <option value="Customer Wallet">Customer Wallet</option>
                <option value="Service Tax">Service Tax</option>
                <option value="Hotel Wallet">Hotel Wallet</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 200px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Search</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px' }} />
                <input
                  type="text"
                  placeholder="Search by Adjustment ID, Reference ID..."
                  value={filters.query}
                  onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '5px 8px 5px 26px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '11px',
                    outline: 'none',
                    height: '28px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginTop: '14px' }}>
              <button
                type="button"
                style={{
                  padding: '5px 14px',
                  background: '#A51C49',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  height: '28px'
                }}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setFilters({ dateRange: '01 Sep 2026 - 30 Sep 2026', type: 'All', status: 'All', account: 'All', query: '' })}
                style={{
                  padding: '5px 12px',
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
          </div>

          {/* Adjustment List Table Container */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Table Header Controls */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Adjustment List <span style={{ color: '#64748b', fontWeight: 500 }}>({filteredAdjustments.length})</span>
              </h3>

              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Download size={12} color="#64748b" />
                <span>Export</span>
                <ChevronDown size={11} color="#64748b" />
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '10px 12px' }}>#</th>
                    <th style={{ padding: '10px 12px' }}>Adjustment ID</th>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>Account</th>
                    <th style={{ padding: '10px 12px' }}>Reference</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '10px 12px' }}>Reason</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Created By</th>
                    <th style={{ padding: '10px 12px' }}>Approved By</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(row)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#A51C49',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '12px'
                          }}
                        >
                          {row.id}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{row.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: row.type === 'Credit' ? '#dcfce7' : '#fee2e2',
                          color: row.type === 'Credit' ? '#15803d' : '#991b1b'
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>{row.account}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{row.referenceId}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹ {row.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{row.reason}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background:
                            row.status === 'Approved'
                              ? '#dcfce7'
                              : row.status === 'Pending'
                              ? '#fef9c3'
                              : '#fee2e2',
                          color:
                            row.status === 'Approved'
                              ? '#15803d'
                              : row.status === 'Pending'
                              ? '#854d0e'
                              : '#991b1b'
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{row.createdBy}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{row.approvedBy}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Action Dropdown Popup */}
                        {activeDropdown === row.id && (
                          <div style={{
                            position: 'absolute',
                            right: '12px',
                            top: '32px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                            zIndex: 100,
                            minWidth: '130px',
                            overflow: 'hidden',
                            padding: '4px 0',
                            textAlign: 'left'
                          }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(row)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Eye size={12} color="#3b82f6" /> View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Pencil size={12} color="#64748b" /> Edit
                            </button>

                            {row.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenModal('approve', row)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    color: '#16a34a',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <CheckCircle2 size={12} color="#16a34a" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenModal('reject', row)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <XCircle size={12} color="#dc2626" /> Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenModal('reverse', row)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#d97706',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <RotateCcw size={12} color="#d97706" /> Reverse
                            </button>

                            <button
                              type="button"
                              onClick={() => showToast(`Downloading PDF for ${row.id}...`)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Download size={12} color="#64748b" /> Download
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenModal('delete', row)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderTop: '1px solid #f1f5f9'
                              }}
                            >
                              <Trash2 size={12} color="#dc2626" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#64748b'
            }}>
              <span>Showing 1 to {paginatedData.length} of {filteredAdjustments.length} entries</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: currentPage === page ? '#A51C49' : '#ffffff',
                        color: currentPage === page ? '#ffffff' : '#334155',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  style={{
                    padding: '3px 8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#334155'
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: CREATE / EDIT VIEW
         ───────────────────────────────────────────────────────────── */}
      {(view === 'create' || view === 'edit') && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header & Back */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Account Adjustment <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{view === 'create' ? 'Create Adjustment' : 'Edit Adjustment'}</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {view === 'create' ? 'Create Account Adjustment' : `Edit Account Adjustment (${formData.id})`}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Add a manual credit or debit adjustment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          {/* Form Container */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Left Column */}
              <div>
                {/* Adjustment Type Radio */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Adjustment Type*
                  </label>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="adjType"
                        checked={formData.type === 'Credit'}
                        onChange={() => setFormData(prev => ({ ...prev, type: 'Credit' }))}
                      />
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>Credit</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="adjType"
                        checked={formData.type === 'Debit'}
                        onChange={() => setFormData(prev => ({ ...prev, type: 'Debit' }))}
                      />
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>Debit</span>
                    </label>
                  </div>
                </div>

                {/* Account Select */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Account*
                  </label>
                  <select
                    value={formData.account}
                    onChange={e => setFormData(prev => ({ ...prev, account: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Cash Account">Cash Account</option>
                    <option value="Gateway Fees">Gateway Fees</option>
                    <option value="Refund Account">Refund Account</option>
                    <option value="Bank Charges">Bank Charges</option>
                    <option value="Customer Wallet">Customer Wallet</option>
                    <option value="Service Tax">Service Tax</option>
                    <option value="Hotel Wallet">Hotel Wallet</option>
                  </select>
                </div>

                {/* Amount */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Amount*
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 24px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Reference Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Reference Type*
                  </label>
                  <select
                    value={formData.referenceType}
                    onChange={e => setFormData(prev => ({ ...prev, referenceType: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Booking">Booking</option>
                    <option value="Transaction">Transaction</option>
                    <option value="Refund">Refund</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Customer">Customer</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                {/* Reference ID */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Reference ID*
                  </label>
                  <input
                    type="text"
                    placeholder="Search or enter reference ID"
                    value={formData.referenceId}
                    onChange={e => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Adjustment Date */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Adjustment Date*
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Reason Select */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Reason*
                  </label>
                  <select
                    value={formData.reason}
                    onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Correction">Correction</option>
                    <option value="Gateway Fee">Gateway Fee</option>
                    <option value="Refund Adj.">Refund Adj.</option>
                    <option value="Bank Fee">Bank Fee</option>
                    <option value="Customer Balance">Customer Balance</option>
                    <option value="Tax Correction">Tax Correction</option>
                    <option value="Chargeback Adj.">Chargeback Adj.</option>
                    <option value="Promotional Credit">Promotional Credit</option>
                    <option value="Duplicate Payment">Duplicate Payment</option>
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Description*</label>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{(formData.description || '').length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Enter adjustment description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Attachment Box */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Attachment
                  </label>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}>
                    <Upload size={20} color="#A51C49" style={{ margin: '0 auto 6px' }} />
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                      Drag & drop file here or <span style={{ color: '#A51C49', fontWeight: 600 }}>Choose File</span>
                    </p>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Supported formats: PDF, JPG, PNG (Max 5MB)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Footer Action */}
            <div style={{
              display: 'flex',
              justify: 'flex-end',
              gap: '10px',
              borderTop: '1px solid #e2e8f0',
              marginTop: '24px',
              paddingTop: '16px'
            }}>
              <button
                type="button"
                onClick={() => setView('list')}
                style={{
                  padding: '8px 18px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(true)}
                style={{
                  padding: '8px 18px',
                  background: '#ffffff',
                  border: '1px solid #A51C49',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#A51C49',
                  cursor: 'pointer'
                }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(false)}
                style={{
                  padding: '8px 20px',
                  background: '#A51C49',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(165, 28, 73, 0.25)'
                }}
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: ADJUSTMENT DETAILS VIEW
         ───────────────────────────────────────────────────────────── */}
      {view === 'details' && selectedItem && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Account Adjustment <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{selectedItem.id}</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Adjustment Details
                </h1>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: selectedItem.status === 'Approved' ? '#dcfce7' : '#fef9c3',
                  color: selectedItem.status === 'Approved' ? '#15803d' : '#854d0e'
                }}>
                  {selectedItem.status}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                View complete information about this adjustment.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setView('list')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => showToast(`Downloading PDF for ${selectedItem.id}...`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> Download
              </button>
              <button
                type="button"
                onClick={() => handleOpenModal('reverse', selectedItem)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #A51C49',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#A51C49',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} /> Reverse Adjustment
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            {/* Left Main Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card 1: Basic Information */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#A51C49" /> Basic Information
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: '12px' }}>
                  <div><span style={{ color: '#64748b' }}>Adjustment ID:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.id}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Date:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.date}</strong></div>

                  <div>
                    <span style={{ color: '#64748b' }}>Type:</span>
                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: selectedItem.type === 'Credit' ? '#dcfce7' : '#fee2e2', color: selectedItem.type === 'Credit' ? '#15803d' : '#991b1b' }}>
                      {selectedItem.type}
                    </span>
                  </div>

                  <div><span style={{ color: '#64748b' }}>Account:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.account}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Amount:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>₹ {selectedItem.amount?.toLocaleString('en-IN')}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Reference Type:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.referenceType}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Reference ID:</span> <strong style={{ color: '#A51C49', marginLeft: '8px' }}>{selectedItem.referenceId}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Reason:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.reason}</strong></div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b' }}>Description:</span>
                    <p style={{ margin: '4px 0 0', color: '#334155', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      {selectedItem.description}
                    </p>
                  </div>

                  {selectedItem.attachment && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748b' }}>Attachment:</span>
                      <a href="#download" onClick={(e) => { e.preventDefault(); showToast(`Downloading ${selectedItem.attachment}...`); }} style={{ color: '#A51C49', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Paperclip size={12} /> {selectedItem.attachment} <Download size={11} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2 & 3 Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Approval Information */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} color="#16a34a" /> Approval Information
                  </h3>
                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><span style={{ color: '#64748b' }}>Created By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.createdBy}</span></div>
                    <div><span style={{ color: '#64748b' }}>Created At:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.createdTime}</span></div>
                    <div><span style={{ color: '#64748b' }}>Approved By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.approvedBy}</span></div>
                    <div><span style={{ color: '#64748b' }}>Approved At:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.approvedTime}</span></div>
                  </div>
                </div>

                {/* Related Information */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={15} color="#3b82f6" /> Related Information
                  </h3>
                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><span style={{ color: '#64748b' }}>Booking ID:</span> <span style={{ fontWeight: 600, color: '#A51C49', float: 'right' }}>{selectedItem.referenceId}</span></div>
                    <div><span style={{ color: '#64748b' }}>Customer:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.customer || 'N/A'}</span></div>
                    <div><span style={{ color: '#64748b' }}>Transaction ID:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.transactionId}</span></div>
                    <div><span style={{ color: '#64748b' }}>Module:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.module}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit History Timeline */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="#A51C49" /> Audit History
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '14px' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: '4px', top: '6px', bottom: '6px', width: '2px', background: '#cbd5e1' }} />

                {/* Event 1 */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>08 Sep 2026, 12:15 PM</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Approved by Finance Manager</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Looks good.</div>
                </div>

                {/* Event 2 */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>08 Sep 2026, 11:20 AM</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Submitted for approval</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Admin</div>
                </div>

                {/* Event 3 */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }} />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>08 Sep 2026, 10:30 AM</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Created</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Adjustment created by Admin.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ACTION POPUP MODAL (Approve, Reject, Reverse, Delete)
         ───────────────────────────────────────────────────────────── */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '440px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {modal.action === 'approve' && 'Approve Adjustment'}
                {modal.action === 'reject' && 'Reject Adjustment'}
                {modal.action === 'reverse' && 'Reverse Adjustment'}
                {modal.action === 'delete' && 'Delete Adjustment'}
              </h3>
              <button
                type="button"
                onClick={() => setModal({ isOpen: false, action: null, item: null, reason: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px', fontSize: '13px', color: '#334155' }}>
              {modal.action === 'approve' && (
                <p style={{ margin: 0 }}>
                  Are you sure you want to approve adjustment <strong>{modal.item?.id}</strong> for ₹{modal.item?.amount?.toLocaleString('en-IN')}?
                </p>
              )}

              {modal.action === 'reject' && (
                <div>
                  <p style={{ margin: '0 0 10px' }}>
                    Please provide a reason for rejecting adjustment <strong>{modal.item?.id}</strong>:
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Enter rejection reason..."
                    value={modal.reason}
                    onChange={e => setModal(prev => ({ ...prev, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {modal.action === 'reverse' && (
                <div>
                  <p style={{ margin: '0 0 10px' }}>
                    Reversing adjustment <strong>{modal.item?.id}</strong> will create a counter balancing ledger entry.
                  </p>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Reversal Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Accounting correction, wrong entry..."
                    value={modal.reason}
                    onChange={e => setModal(prev => ({ ...prev, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {modal.action === 'delete' && (
                <p style={{ margin: 0, color: '#dc2626' }}>
                  Warning: Are you sure you want to delete adjustment <strong>{modal.item?.id}</strong>? This action cannot be undone.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'flex-end',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => setModal({ isOpen: false, action: null, item: null, reason: '' })}
                style={{
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalAction}
                style={{
                  padding: '6px 16px',
                  background:
                    modal.action === 'delete' || modal.action === 'reject'
                      ? '#dc2626'
                      : '#A51C49',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
