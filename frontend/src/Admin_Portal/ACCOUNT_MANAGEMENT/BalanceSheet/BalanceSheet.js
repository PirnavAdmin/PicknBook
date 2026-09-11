/* eslint-disable */
import React, { useState, useMemo } from 'react';
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
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Wallet,
  Upload,
  X,
  ChevronDown,
  ArrowLeft,
  Paperclip,
  Check
} from 'lucide-react';

const INITIAL_ENTRIES = [
  {
    id: 1,
    date: '01 Sep 2026',
    referenceId: 'BS-000125',
    type: 'Opening',
    module: '-',
    description: 'Opening Balance',
    credit: 0,
    debit: 0,
    balance: 1250000,
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '01 Sep 2026, 09:00 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '01 Sep 2026, 09:15 AM',
    customer: 'System Initial',
    gateway: 'N/A',
    remarks: 'Initial opening balance carry forward'
  },
  {
    id: 2,
    date: '02 Sep 2026',
    referenceId: 'TXN-102458',
    type: 'Credit',
    module: 'Flight',
    description: 'Customer Booking Payment',
    credit: 25600,
    debit: 0,
    balance: 1275600,
    status: 'Approved',
    createdBy: 'Payment Gateway',
    createdTime: '02 Sep 2026, 11:30 AM',
    approvedBy: 'Auto System',
    approvedTime: '02 Sep 2026, 11:30 AM',
    customer: 'Ramesh Kumar',
    gateway: 'Cashfree',
    remarks: 'Flight ticket booking payment received'
  },
  {
    id: 3,
    date: '03 Sep 2026',
    referenceId: 'TXN-102459',
    type: 'Debit',
    module: 'Hotel',
    description: 'Refund to Customer',
    credit: 0,
    debit: 5500,
    balance: 1270100,
    status: 'Pending',
    createdBy: 'Support Admin',
    createdTime: '03 Sep 2026, 02:15 PM',
    approvedBy: '-',
    approvedTime: '-',
    customer: 'Priya Sharma',
    gateway: 'Razorpay',
    remarks: 'Hotel booking cancellation refund requested'
  },
  {
    id: 4,
    date: '04 Sep 2026',
    referenceId: 'ADJ-00124',
    type: 'Credit',
    module: 'Adjustment',
    description: 'Manual Credit Adjustment',
    credit: 12000,
    debit: 0,
    balance: 1282100,
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '04 Sep 2026, 04:00 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '04 Sep 2026, 05:10 PM',
    customer: 'Corporate Account A',
    gateway: 'Direct Transfer',
    remarks: 'Adjustment credited for fare correction'
  },
  {
    id: 5,
    date: '05 Sep 2026',
    referenceId: 'TXN-102460',
    type: 'Debit',
    module: 'Bus',
    description: 'Service Charge Deduction',
    credit: 0,
    debit: 7800,
    balance: 1274300,
    status: 'Approved',
    createdBy: 'System Auto',
    createdTime: '05 Sep 2026, 10:00 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '05 Sep 2026, 10:30 AM',
    customer: 'Bus Operator Partner',
    gateway: 'N/A',
    remarks: 'Monthly service charge deduction'
  },
  {
    id: 6,
    date: '06 Sep 2026',
    referenceId: 'TXN-102461',
    type: 'Credit',
    module: 'Flight',
    description: 'Agent Settlement',
    credit: 18200,
    debit: 0,
    balance: 1292500,
    status: 'Approved',
    createdBy: 'Finance Team',
    createdTime: '06 Sep 2026, 01:20 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '06 Sep 2026, 02:45 PM',
    customer: 'B2B Travel Agent X',
    gateway: 'Bank Transfer',
    remarks: 'Agent deposit settlement credited'
  },
  {
    id: 7,
    date: '07 Sep 2026',
    referenceId: 'ADJ-00125',
    type: 'Debit',
    module: 'Adjustment',
    description: 'TDS Deduction',
    credit: 0,
    debit: 2500,
    balance: 1290000,
    status: 'Rejected',
    createdBy: 'Finance Team',
    createdTime: '07 Sep 2026, 03:50 PM',
    approvedBy: 'Finance Manager',
    approvedTime: '07 Sep 2026, 05:00 PM',
    customer: 'Tax Authority',
    gateway: 'N/A',
    remarks: 'TDS calculation error rejection'
  },
  {
    id: 8,
    date: '08 Sep 2026',
    referenceId: 'TXN-102462',
    type: 'Credit',
    module: 'Hotel',
    description: 'Hotel Booking Payment',
    credit: 9600,
    debit: 0,
    balance: 1299600,
    status: 'Approved',
    createdBy: 'Customer App',
    createdTime: '08 Sep 2026, 09:10 AM',
    approvedBy: 'Auto System',
    approvedTime: '08 Sep 2026, 09:10 AM',
    customer: 'Vikram Singh',
    gateway: 'Razorpay',
    remarks: 'Hotel room reservation payment'
  },
  {
    id: 9,
    date: '09 Sep 2026',
    referenceId: 'TXN-102463',
    type: 'Debit',
    module: 'Bus',
    description: 'Cancellation Refund',
    credit: 0,
    debit: 6200,
    balance: 1293400,
    status: 'Pending',
    createdBy: 'Customer Support',
    createdTime: '09 Sep 2026, 11:45 AM',
    approvedBy: '-',
    approvedTime: '-',
    customer: 'Anita Desai',
    gateway: 'Cashfree',
    remarks: 'Bus ticket refund request'
  },
  {
    id: 10,
    date: '10 Sep 2026',
    referenceId: 'ADJ-00126',
    type: 'Credit',
    module: 'Adjustment',
    description: 'Wallet Top Up',
    credit: 15000,
    debit: 0,
    balance: 1308400,
    status: 'Approved',
    createdBy: 'Admin',
    createdTime: '10 Sep 2026, 10:00 AM',
    approvedBy: 'Finance Manager',
    approvedTime: '10 Sep 2026, 10:30 AM',
    customer: 'Agent Portal Wallet',
    gateway: 'UPI Transfer',
    remarks: 'B2B agent wallet credit top up'
  }
];

const DEFAULT_FORM = {
  id: null,
  type: 'Credit',
  date: '10 Sep 2026',
  module: 'Flight',
  referenceId: '',
  amount: '',
  description: '',
  status: 'Pending',
  attachment: '',
  customer: '',
  gateway: 'Cashfree',
  remarks: ''
};

export default function BalanceSheet() {
  // Navigation View State: 'list' | 'create' | 'edit' | 'details'
  const [view, setView] = useState('list');
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State for Create & Edit
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Filters State
  const [filters, setFilters] = useState({
    dateRange: '01 Sep 2026 - 30 Sep 2026',
    type: 'All',
    module: 'All',
    status: 'All',
    query: ''
  });

  // Action Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      if (filters.type !== 'All' && item.type !== filters.type) return false;
      if (filters.module !== 'All' && item.module !== filters.module) return false;
      if (filters.status !== 'All' && item.status !== filters.status) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesRef = item.referenceId.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesRef && !matchesDesc) return false;
      }
      return true;
    });
  }, [entries, filters]);

  // Paginated List
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;

  // View Openers
  const handleOpenCreate = () => {
    const nextIdNum = 102464 + entries.length;
    setFormData({
      ...DEFAULT_FORM,
      referenceId: `TXN-${nextIdNum}`
    });
    setView('create');
  };

  const handleOpenEdit = (item) => {
    setActiveDropdown(null);
    setSelectedItem(item);
    setFormData({
      id: item.id,
      type: item.type === 'Opening' ? 'Credit' : item.type,
      date: item.date,
      module: item.module === '-' ? 'Flight' : item.module,
      referenceId: item.referenceId,
      amount: item.credit > 0 ? item.credit : item.debit,
      description: item.description,
      status: item.status,
      attachment: '',
      customer: item.customer || '',
      gateway: item.gateway || 'Cashfree',
      remarks: item.remarks || ''
    });
    setView('edit');
  };

  const handleOpenDetails = (item) => {
    setActiveDropdown(null);
    setSelectedItem(item);
    setView('details');
  };

  // Form Save Handler
  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.referenceId) {
      alert('Please fill in required fields (Reference ID & Amount).');
      return;
    }

    const amt = Number(formData.amount);
    const isCredit = formData.type === 'Credit';

    if (view === 'edit' && formData.id) {
      setEntries(prev =>
        prev.map(item => {
          if (item.id === formData.id) {
            return {
              ...item,
              type: formData.type,
              date: formData.date,
              module: formData.module,
              referenceId: formData.referenceId,
              description: formData.description,
              credit: isCredit ? amt : 0,
              debit: isCredit ? 0 : amt,
              status: formData.status,
              customer: formData.customer,
              gateway: formData.gateway,
              remarks: formData.remarks
            };
          }
          return item;
        })
      );
      showToast(`Balance sheet entry ${formData.referenceId} updated successfully!`);
    } else {
      const lastBalance = entries.length > 0 ? entries[entries.length - 1].balance : 1250000;
      const newBalance = isCredit ? lastBalance + amt : lastBalance - amt;

      const newEntry = {
        id: Date.now(),
        date: formData.date,
        referenceId: formData.referenceId,
        type: formData.type,
        module: formData.module,
        description: formData.description || `${formData.type} Entry`,
        credit: isCredit ? amt : 0,
        debit: isCredit ? 0 : amt,
        balance: newBalance,
        status: formData.status,
        createdBy: 'Admin',
        createdTime: '10 Sep 2026, 12:40 PM',
        approvedBy: formData.status === 'Approved' ? 'Finance Manager' : '-',
        approvedTime: formData.status === 'Approved' ? '10 Sep 2026, 12:40 PM' : '-',
        customer: formData.customer || 'Direct Customer',
        gateway: formData.gateway || 'Cashfree',
        remarks: formData.remarks || '-'
      };

      setEntries(prev => [...prev, newEntry]);
      showToast(`New balance sheet entry ${newEntry.referenceId} created!`);
    }

    setView('list');
  };

  // Status Action Handlers
  const handleApprove = (item) => {
    setActiveDropdown(null);
    setEntries(prev => prev.map(i => i.id === item.id ? { ...i, status: 'Approved', approvedBy: 'Finance Manager', approvedTime: '10 Sep 2026, 12:45 PM' } : i));
    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => ({ ...prev, status: 'Approved', approvedBy: 'Finance Manager', approvedTime: '10 Sep 2026, 12:45 PM' }));
    }
    showToast(`Entry ${item.referenceId} approved!`);
  };

  const handleReject = (item) => {
    setActiveDropdown(null);
    setEntries(prev => prev.map(i => i.id === item.id ? { ...i, status: 'Rejected', approvedBy: 'Finance Manager' } : i));
    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => ({ ...prev, status: 'Rejected', approvedBy: 'Finance Manager' }));
    }
    showToast(`Entry ${item.referenceId} rejected.`, 'info');
  };

  const handleDelete = (item) => {
    setActiveDropdown(null);
    setEntries(prev => prev.filter(i => i.id !== item.id));
    showToast(`Entry ${item.referenceId} deleted.`, 'info');
    if (view === 'details') setView('list');
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
          VIEW 1: MAIN BALANCE SHEET LIST VIEW
         ───────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Header & Breadcrumb */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>Balance Sheet</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Balance Sheet
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                View and manage your account balance details including credits, debits, settlements and closing balance.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer'
              }}>
                <Calendar size={13} color="#64748b" />
                <span>01 Sep 2026 - 30 Sep 2026</span>
                <ChevronDown size={13} color="#64748b" />
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  background: '#A51C49',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(165, 28, 73, 0.25)'
                }}
              >
                <Plus size={14} /> Add Entry
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Card 1: Opening Balance */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Opening Balance</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>₹ 12,50,000</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>As on 01 Sep 2026</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={18} />
              </div>
            </div>

            {/* Card 2: Total Credit */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Total Credit</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>₹ 24,85,620</h3>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>1,825 Transactions</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={20} />
              </div>
            </div>

            {/* Card 3: Total Debit */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Total Debit</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>₹ 3,15,200</h3>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>412 Transactions</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={20} />
              </div>
            </div>

            {/* Card 4: Closing Balance */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Closing Balance</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>₹ 34,20,420</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>As on 30 Sep 2026</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} />
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
            {/* Date Range Filter */}
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
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Transaction Type</span>
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
                <option value="Opening">Opening</option>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
            </div>

            {/* Module Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Module</span>
              <select
                value={filters.module}
                onChange={e => setFilters(prev => ({ ...prev, module: e.target.value }))}
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
                <option value="Flight">Flight</option>
                <option value="Bus">Bus</option>
                <option value="Hotel">Hotel</option>
                <option value="Adjustment">Adjustment</option>
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

            {/* Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 180px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Search</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px' }} />
                <input
                  type="text"
                  placeholder="Search by Reference ID, Description..."
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

            {/* Filter Actions */}
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
                onClick={() => setFilters({ dateRange: '01 Sep 2026 - 30 Sep 2026', type: 'All', module: 'All', status: 'All', query: '' })}
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
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '16px'
          }}>
            {/* Header Controls */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Balance Sheet <span style={{ color: '#64748b', fontWeight: 500 }}>(1,245)</span>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#9f1239', fontWeight: 600 }}>
                    <th style={{ padding: '10px 10px' }}>#</th>
                    <th style={{ padding: '10px 10px' }}>Date</th>
                    <th style={{ padding: '10px 10px' }}>Reference ID</th>
                    <th style={{ padding: '10px 10px' }}>Type</th>
                    <th style={{ padding: '10px 10px' }}>Module</th>
                    <th style={{ padding: '10px 10px' }}>Description</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Credit (₹)</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Balance (₹)</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 10px', color: '#64748b' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#334155', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ padding: '10px 10px' }}>
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
                            fontSize: '11px'
                          }}
                        >
                          {row.referenceId}
                        </button>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background:
                            row.type === 'Opening'
                              ? '#dbeafe'
                              : row.type === 'Credit'
                              ? '#dcfce7'
                              : '#fee2e2',
                          color:
                            row.type === 'Opening'
                              ? '#1e40af'
                              : row.type === 'Credit'
                              ? '#15803d'
                              : '#991b1b'
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#475569' }}>{row.module}</td>
                      <td style={{ padding: '10px 10px', color: '#334155' }}>{row.description}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                        {row.credit > 0 ? row.credit.toLocaleString('en-IN') : '-'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                        {row.debit > 0 ? row.debit.toLocaleString('en-IN') : '-'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {row.balance.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
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
                      <td style={{ padding: '10px 10px', textAlign: 'center', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            color: '#A51C49'
                          }}
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Action Dropdown Popup */}
                        {activeDropdown === row.id && (
                          <div style={{
                            position: 'absolute',
                            right: '10px',
                            top: '30px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                            zIndex: 100,
                            minWidth: '140px',
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
                                  onClick={() => handleApprove(row)}
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
                                  onClick={() => handleReject(row)}
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
                              onClick={() => { setActiveDropdown(null); showToast(`Downloading statement for ${row.referenceId}...`); }}
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
                              onClick={() => handleDelete(row)}
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

            {/* Pagination */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: '#64748b'
            }}>
              <span>Showing 1 to {paginatedData.length} of 1,245 entries</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: '26px',
                        height: '26px',
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
                    padding: '3px 6px',
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

          {/* Bottom Summary Cards Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            {/* Monthly Summary Widget */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="#A51C49" /> Monthly Summary
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowDownRight size={14} color="#16a34a" /> Total Credits
                  </span>
                  <strong style={{ color: '#0f172a' }}>₹ 24,85,620</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpRight size={14} color="#dc2626" /> Total Debits
                  </span>
                  <strong style={{ color: '#0f172a' }}>₹ 3,15,200</strong>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹ Net Balance</span>
                  <strong style={{ fontSize: '14px', color: '#A51C49' }}>₹ 21,70,420</strong>
                </div>
              </div>
            </div>

            {/* Module Wise Summary Table */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="#A51C49" /> Module Wise Summary
              </h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#fff1f2', color: '#9f1239', fontWeight: 600 }}>
                    <th style={{ padding: '6px 8px' }}>Module</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Credit (₹)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Net (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155' }}>Flight</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>12,45,600</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>1,20,400</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>11,25,200</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155' }}>Bus</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>4,20,800</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>65,800</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>3,55,000</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155' }}>Hotel</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>6,85,400</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>1,29,000</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>5,56,400</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155' }}>Adjustment</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>1,34,620</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>10,000</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>1,24,620</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: CREATE / EDIT BALANCE SHEET ENTRY PAGE (NEW PAGE)
         ───────────────────────────────────────────────────────────── */}
      {(view === 'create' || view === 'edit') && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header & Back */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Balance Sheet <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{view === 'create' ? 'Create Entry' : 'Edit Entry'}</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {view === 'create' ? 'Add Balance Sheet Entry' : `Edit Balance Sheet Entry (${formData.referenceId})`}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Add or modify a manual credit/debit balance sheet transaction entry.
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
              ← Back
            </button>
          </div>

          {/* Form Page Container */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <form onSubmit={handleSaveForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Column */}
                <div>
                  {/* Transaction Type Radio */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Transaction Type*
                    </label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="transType"
                          checked={formData.type === 'Credit'}
                          onChange={() => setFormData(prev => ({ ...prev, type: 'Credit' }))}
                        />
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>Credit</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="transType"
                          checked={formData.type === 'Debit'}
                          onChange={() => setFormData(prev => ({ ...prev, type: 'Debit' }))}
                        />
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>Debit</span>
                      </label>
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date*
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

                  {/* Module Select */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Module*
                    </label>
                    <select
                      value={formData.module}
                      onChange={e => setFormData(prev => ({ ...prev, module: e.target.value }))}
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
                      <option value="Flight">Flight</option>
                      <option value="Bus">Bus</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Adjustment">Adjustment</option>
                    </select>
                  </div>

                  {/* Reference ID */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Reference ID*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reference ID"
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
                </div>

                {/* Right Column */}
                <div>
                  {/* Description */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Description*</label>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{(formData.description || '').length}/500</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter description"
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

                  {/* Customer / Entity */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Customer / Entity Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter customer or party name"
                      value={formData.customer}
                      onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
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

                  {/* Attachment */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Attachment
                    </label>
                    <div style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '14px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}>
                      <Upload size={18} color="#A51C49" style={{ margin: '0 auto 4px' }} />
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                        Drag & drop file here or <span style={{ color: '#A51C49', fontWeight: 600 }}>Choose File</span>
                      </p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Supported formats: PDF, JPG, PNG (Max 5MB)</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Status*
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
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
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Page Footer Action Buttons */}
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
                  type="submit"
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: BALANCE SHEET ENTRY DETAILS PAGE (NEW PAGE)
         ───────────────────────────────────────────────────────────── */}
      {view === 'details' && selectedItem && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Balance Sheet <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{selectedItem.referenceId}</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Balance Sheet Entry Details
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
                View complete details for this balance sheet transaction entry.
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
                ← Back
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedItem)}
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
                <Pencil size={14} color="#64748b" /> Edit Entry
              </button>
              <button
                type="button"
                onClick={() => showToast(`Downloading PDF statement for ${selectedItem.referenceId}...`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  background: '#A51C49',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> Download Statement
              </button>
            </div>
          </div>

          {/* Details Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card 1: Entry Information */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#A51C49" /> Entry Information
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: '12px' }}>
                  <div><span style={{ color: '#64748b' }}>Date:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.date}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Reference ID:</span> <strong style={{ color: '#A51C49', marginLeft: '8px' }}>{selectedItem.referenceId}</strong></div>

                  <div>
                    <span style={{ color: '#64748b' }}>Type:</span>
                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: selectedItem.type === 'Opening' ? '#dbeafe' : selectedItem.type === 'Credit' ? '#dcfce7' : '#fee2e2', color: selectedItem.type === 'Opening' ? '#1e40af' : selectedItem.type === 'Credit' ? '#15803d' : '#991b1b' }}>
                      {selectedItem.type}
                    </span>
                  </div>

                  <div><span style={{ color: '#64748b' }}>Module:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>{selectedItem.module}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Credit Amount:</span> <strong style={{ color: '#16a34a', marginLeft: '8px' }}>{selectedItem.credit > 0 ? `₹ ${selectedItem.credit.toLocaleString('en-IN')}` : '-'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Debit Amount:</span> <strong style={{ color: '#dc2626', marginLeft: '8px' }}>{selectedItem.debit > 0 ? `₹ ${selectedItem.debit.toLocaleString('en-IN')}` : '-'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Closing Balance:</span> <strong style={{ color: '#0f172a', marginLeft: '8px' }}>₹ {selectedItem.balance.toLocaleString('en-IN')}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: selectedItem.status === 'Approved' ? '#dcfce7' : '#fef9c3', color: selectedItem.status === 'Approved' ? '#15803d' : '#854d0e' }}>{selectedItem.status}</span></div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b' }}>Description:</span>
                    <p style={{ margin: '4px 0 0', color: '#334155', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      {selectedItem.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 & 3 Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Audit & Log Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} color="#16a34a" /> Audit & Log Details
                  </h3>
                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><span style={{ color: '#64748b' }}>Created By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.createdBy}</span></div>
                    <div><span style={{ color: '#64748b' }}>Created At:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.createdTime}</span></div>
                    <div><span style={{ color: '#64748b' }}>Approved By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.approvedBy}</span></div>
                    <div><span style={{ color: '#64748b' }}>Approved At:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.approvedTime}</span></div>
                  </div>
                </div>

                {/* Related Module Information */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark size={15} color="#3b82f6" /> Related Information
                  </h3>
                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><span style={{ color: '#64748b' }}>Customer/Party:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.customer || 'N/A'}</span></div>
                    <div><span style={{ color: '#64748b' }}>Payment Gateway:</span> <span style={{ fontWeight: 600, color: '#A51C49', float: 'right' }}>{selectedItem.gateway}</span></div>
                    <div><span style={{ color: '#64748b' }}>Remarks:</span> <span style={{ fontWeight: 500, color: '#475569', float: 'right' }}>{selectedItem.remarks}</span></div>
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
                <div style={{ position: 'absolute', left: '4px', top: '6px', bottom: '6px', width: '2px', background: '#cbd5e1' }} />

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedItem.approvedTime}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Approved / Verified</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{selectedItem.approvedBy}</div>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedItem.createdTime}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Created / Logged</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{selectedItem.createdBy}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
