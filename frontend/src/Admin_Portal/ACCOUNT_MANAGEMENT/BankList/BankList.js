/* eslint-disable */
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Download,
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  CheckCircle2,
  XCircle,
  Trash2,
  Landmark,
  Crown,
  ArrowLeft,
  Upload,
  ChevronDown,
  Check,
  Building2
} from 'lucide-react';

const INITIAL_BANK_ACCOUNTS = [
  {
    id: 'BANK-001',
    bankName: 'HDFC Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '123456784582',
    ifscCode: 'HDFC0001234',
    branch: 'Banjara Hills, Hyderabad',
    accountType: 'Current',
    purpose: 'Settlement',
    isDefault: true,
    status: 'Active',
    lastUpdated: '08 Sep 2026',
    currency: 'INR (₹)',
    openingBalance: 1250000,
    createdBy: 'Admin',
    createdTime: '01 Aug 2026, 10:30 AM',
    updatedBy: 'Finance Manager',
    updatedTime: '08 Sep 2026, 02:15 PM',
    remarks: 'Primary settlement account for flight and hotel bookings.'
  },
  {
    id: 'BANK-002',
    bankName: 'ICICI Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '987654327021',
    ifscCode: 'ICIC0004567',
    branch: 'MG Road, Bangalore',
    accountType: 'Current',
    purpose: 'Refund',
    isDefault: false,
    status: 'Active',
    lastUpdated: '07 Sep 2026',
    currency: 'INR (₹)',
    openingBalance: 850000,
    createdBy: 'Admin',
    createdTime: '05 Aug 2026, 11:00 AM',
    updatedBy: 'Finance Manager',
    updatedTime: '07 Sep 2026, 04:20 PM',
    remarks: 'Dedicated account for customer cancellation refunds.'
  },
  {
    id: 'BANK-003',
    bankName: 'State Bank of India',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '112233442345',
    ifscCode: 'SBIN0005678',
    branch: 'Connaught Place, New Delhi',
    accountType: 'Savings',
    purpose: 'Operations',
    isDefault: false,
    status: 'Inactive',
    lastUpdated: '05 Sep 2026',
    currency: 'INR (₹)',
    openingBalance: 320000,
    createdBy: 'Finance Team',
    createdTime: '10 Aug 2026, 09:15 AM',
    updatedBy: 'Finance Manager',
    updatedTime: '05 Sep 2026, 01:10 PM',
    remarks: 'Internal operational expenses account.'
  },
  {
    id: 'BANK-004',
    bankName: 'Axis Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '556677886055',
    ifscCode: 'UTIB0001111',
    branch: 'BKC, Mumbai',
    accountType: 'Current',
    purpose: 'Settlement',
    isDefault: false,
    status: 'Active',
    lastUpdated: '03 Sep 2026',
    currency: 'INR (₹)',
    openingBalance: 640000,
    createdBy: 'Admin',
    createdTime: '12 Aug 2026, 02:30 PM',
    updatedBy: 'Finance Team',
    updatedTime: '03 Sep 2026, 05:45 PM',
    remarks: 'Secondary gateway settlement bank.'
  },
  {
    id: 'BANK-005',
    bankName: 'Kotak Mahindra Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '998877663987',
    ifscCode: 'KKBK0002222',
    branch: 'Park Street, Kolkata',
    accountType: 'Current',
    purpose: 'Refund',
    isDefault: false,
    status: 'Active',
    lastUpdated: '01 Sep 2026',
    currency: 'INR (₹)',
    openingBalance: 490000,
    createdBy: 'Finance Team',
    createdTime: '15 Aug 2026, 10:00 AM',
    updatedBy: 'Finance Manager',
    updatedTime: '01 Sep 2026, 03:20 PM',
    remarks: 'Backup refund processing account.'
  },
  {
    id: 'BANK-006',
    bankName: 'Canara Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '443322118878',
    ifscCode: 'CNRB0003333',
    branch: 'T Nagar, Chennai',
    accountType: 'Savings',
    purpose: 'Operations',
    isDefault: false,
    status: 'Inactive',
    lastUpdated: '28 Aug 2026',
    currency: 'INR (₹)',
    openingBalance: 150000,
    createdBy: 'Admin',
    createdTime: '18 Aug 2026, 04:15 PM',
    updatedBy: 'Finance Manager',
    updatedTime: '28 Aug 2026, 11:30 AM',
    remarks: 'Old payroll operational account.'
  },
  {
    id: 'BANK-007',
    bankName: 'IndusInd Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '667788994455',
    ifscCode: 'INDB0004444',
    branch: 'Gachibowli, Hyderabad',
    accountType: 'Current',
    purpose: 'General',
    isDefault: false,
    status: 'Active',
    lastUpdated: '25 Aug 2026',
    currency: 'INR (₹)',
    openingBalance: 780000,
    createdBy: 'Admin',
    createdTime: '20 Aug 2026, 01:45 PM',
    updatedBy: 'Finance Team',
    updatedTime: '25 Aug 2026, 04:10 PM',
    remarks: 'General corporate treasury account.'
  },
  {
    id: 'BANK-008',
    bankName: 'YES Bank',
    accountHolder: 'PickNBook Pvt Ltd',
    accountNumber: '334455667766',
    ifscCode: 'YESB0005555',
    branch: 'Viman Nagar, Pune',
    accountType: 'Current',
    purpose: 'Settlement',
    isDefault: false,
    status: 'Active',
    lastUpdated: '20 Aug 2026',
    currency: 'INR (₹)',
    openingBalance: 520000,
    createdBy: 'Finance Team',
    createdTime: '22 Aug 2026, 09:30 AM',
    updatedBy: 'Finance Manager',
    updatedTime: '20 Aug 2026, 12:00 PM',
    remarks: 'UPI merchant settlement bank account.'
  }
];

const DEFAULT_FORM = {
  id: '',
  bankName: 'HDFC Bank',
  accountHolder: 'PickNBook Pvt Ltd',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  branch: '',
  accountType: 'Current',
  currency: 'INR (₹)',
  purpose: 'Settlement',
  openingBalance: '0.00',
  isDefault: false,
  status: 'Active',
  notes: '',
  attachment: ''
};

export default function BankList() {
  // Navigation View State: 'list' | 'create' | 'edit' | 'details'
  const [view, setView] = useState('list');
  const [accounts, setAccounts] = useState(INITIAL_BANK_ACCOUNTS);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Masked Account Numbers Visibility Toggle State
  const [visibleAccountIds, setVisibleAccountIds] = useState(new Set());

  // Filter State
  const [filters, setFilters] = useState({
    query: '',
    accountType: 'All',
    status: 'All',
    purpose: 'All'
  });

  // Action Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Notification Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleAccountVisibility = (id) => {
    setVisibleAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Mask Account Number Helper
  const formatAccountNumber = (accNo, id) => {
    if (!accNo) return '';
    if (visibleAccountIds.has(id)) return accNo;
    const last4 = accNo.slice(-4);
    return `•••• •••• ${last4}`;
  };

  // Filtered List
  const filteredAccounts = useMemo(() => {
    return accounts.filter(item => {
      if (filters.accountType !== 'All' && item.accountType !== filters.accountType) return false;
      if (filters.status !== 'All' && item.status !== filters.status) return false;
      if (filters.purpose !== 'All' && item.purpose !== filters.purpose) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesName = item.bankName.toLowerCase().includes(q);
        const matchesAcc = item.accountNumber.toLowerCase().includes(q);
        const matchesIfsc = item.ifscCode.toLowerCase().includes(q);
        const matchesHolder = item.accountHolder.toLowerCase().includes(q);
        if (!matchesName && !matchesAcc && !matchesIfsc && !matchesHolder) return false;
      }
      return true;
    });
  }, [accounts, filters]);

  // Paginated List
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  }, [filteredAccounts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;

  // View Openers (All open in full dedicated page view)
  const handleOpenCreate = () => {
    const nextNum = accounts.length + 1;
    const newId = `BANK-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...DEFAULT_FORM,
      id: newId
    });
    setView('create');
  };

  const handleOpenEdit = (item) => {
    setActiveDropdown(null);
    setSelectedItem(item);
    setFormData({
      id: item.id,
      bankName: item.bankName,
      accountHolder: item.accountHolder,
      accountNumber: item.accountNumber,
      confirmAccountNumber: item.accountNumber,
      ifscCode: item.ifscCode,
      branch: item.branch,
      accountType: item.accountType,
      currency: item.currency || 'INR (₹)',
      purpose: item.purpose,
      openingBalance: item.openingBalance || '0.00',
      isDefault: item.isDefault,
      status: item.status,
      notes: item.remarks || '',
      attachment: ''
    });
    setView('edit');
  };

  const handleOpenDetails = (item) => {
    setActiveDropdown(null);
    setSelectedItem(item);
    setView('details');
  };

  // Form Submission
  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      alert('Please fill in required fields (Bank Name, Account Number, IFSC Code).');
      return;
    }

    if (view === 'create') {
      const newAcc = {
        ...formData,
        id: formData.id || `BANK-${String(accounts.length + 1).padStart(3, '0')}`,
        openingBalance: Number(formData.openingBalance) || 0,
        lastUpdated: '08 Sep 2026',
        createdBy: 'Admin',
        createdTime: '08 Sep 2026, 01:00 PM',
        updatedBy: 'Admin',
        updatedTime: '08 Sep 2026, 01:00 PM',
        remarks: formData.notes || '-'
      };

      if (formData.isDefault) {
        setAccounts(prev => prev.map(a => ({ ...a, isDefault: false })));
      }

      setAccounts(prev => [newAcc, ...prev]);
      showToast(`Bank account ${newAcc.bankName} (${newAcc.id}) added successfully!`);
    } else if (view === 'edit') {
      if (formData.isDefault) {
        setAccounts(prev =>
          prev.map(a => (a.id === formData.id ? { ...a, ...formData, isDefault: true, lastUpdated: '08 Sep 2026' } : { ...a, isDefault: false }))
        );
      } else {
        setAccounts(prev =>
          prev.map(a => (a.id === formData.id ? { ...a, ...formData, lastUpdated: '08 Sep 2026' } : a))
        );
      }
      showToast(`Bank account ${formData.id} updated successfully!`);
    }

    setView('list');
  };

  // Actions
  const handleSetAsDefault = (item) => {
    setActiveDropdown(null);
    setAccounts(prev => prev.map(a => ({ ...a, isDefault: a.id === item.id })));
    showToast(`${item.bankName} (${item.id}) set as default settlement account!`);
  };

  const handleToggleStatus = (item) => {
    setActiveDropdown(null);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setAccounts(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a));
    if (selectedItem?.id === item.id) {
      setSelectedItem(prev => ({ ...prev, status: newStatus }));
    }
    showToast(`Bank account ${item.id} is now ${newStatus}.`);
  };

  const handleDelete = (item) => {
    setActiveDropdown(null);
    setAccounts(prev => prev.filter(a => a.id !== item.id));
    showToast(`Bank account ${item.id} deleted.`, 'info');
    if (view === 'details') setView('list');
  };

  const defaultAccountObj = useMemo(() => {
    return accounts.find(a => a.isDefault) || accounts[0] || {};
  }, [accounts]);

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
          VIEW 1: MAIN BANK LIST VIEW
         ───────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Header & Breadcrumb */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>Bank List</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Bank List
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                Manage bank accounts used for settlements, refunds and other financial transactions.
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
              <Plus size={15} /> Add Bank Account
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Card 1: Total Bank Accounts */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Bank Accounts</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{accounts.length}</h3>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>↑ 14% from last month</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff1f2', color: '#A51C49', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={18} />
              </div>
            </div>

            {/* Card 2: Active Accounts */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Accounts</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {accounts.filter(a => a.status === 'Active').length}
                </h3>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>↑ 20% from last month</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>

            {/* Card 3: Inactive Accounts */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Inactive Accounts</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {accounts.filter(a => a.status === 'Inactive').length}
                </h3>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>↓ 50% from last month</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} />
              </div>
            </div>

            {/* Card 4: Default Account */}
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
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Default Account</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {defaultAccountObj.bankName || 'HDFC Bank'}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>{defaultAccountObj.accountType || 'Current'} Account</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={18} />
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
            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 220px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Search</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px' }} />
                <input
                  type="text"
                  placeholder="Search by Bank Name, Account No., IFSC..."
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

            {/* Account Type Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Account Type</span>
              <select
                value={filters.accountType}
                onChange={e => setFilters(prev => ({ ...prev, accountType: e.target.value }))}
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
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
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
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Purpose Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Purpose</span>
              <select
                value={filters.purpose}
                onChange={e => setFilters(prev => ({ ...prev, purpose: e.target.value }))}
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
                <option value="Settlement">Settlement</option>
                <option value="Refund">Refund</option>
                <option value="Operations">Operations</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Filter Action Buttons */}
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
                onClick={() => setFilters({ query: '', accountType: 'All', status: 'All', purpose: 'All' })}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Table Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Bank Account List <span style={{ color: '#64748b', fontWeight: 500 }}>({filteredAccounts.length})</span>
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
                    <th style={{ padding: '10px 10px' }}>Bank ID</th>
                    <th style={{ padding: '10px 10px' }}>Bank Name</th>
                    <th style={{ padding: '10px 10px' }}>Account Holder</th>
                    <th style={{ padding: '10px 10px' }}>Account Number</th>
                    <th style={{ padding: '10px 10px' }}>IFSC Code</th>
                    <th style={{ padding: '10px 10px' }}>Account Type</th>
                    <th style={{ padding: '10px 10px' }}>Purpose</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Default</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 10px' }}>Last Updated</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 10px', color: '#64748b' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
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
                          {row.id}
                        </button>
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} color="#A51C49" />
                          <span>{row.bankName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#334155' }}>{row.accountHolder}</td>
                      <td style={{ padding: '10px 10px', color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{formatAccountNumber(row.accountNumber, row.id)}</span>
                          <button
                            type="button"
                            onClick={() => toggleAccountVisibility(row.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}
                            title="Toggle account number"
                          >
                            {visibleAccountIds.has(row.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#475569', fontFamily: 'monospace' }}>{row.ifscCode}</td>
                      <td style={{ padding: '10px 10px', color: '#334155' }}>{row.accountType}</td>
                      <td style={{ padding: '10px 10px', color: '#475569' }}>{row.purpose}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: row.isDefault ? '#dcfce7' : '#f1f5f9',
                          color: row.isDefault ? '#15803d' : '#64748b'
                        }}>
                          {row.isDefault ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: row.status === 'Active' ? '#dcfce7' : '#fee2e2',
                          color: row.status === 'Active' ? '#15803d' : '#991b1b'
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.lastUpdated}</td>
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

                        {/* Action Popup Dropdown */}
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
                            {!row.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetAsDefault(row)}
                                style={{
                                  width: '100%',
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: 'none',
                                  textAlign: 'left',
                                  fontSize: '11px',
                                  color: '#9333ea',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <Crown size={12} color="#9333ea" /> Set as Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(row)}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: row.status === 'Active' ? '#d97706' : '#16a34a',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {row.status === 'Active' ? <XCircle size={12} color="#d97706" /> : <CheckCircle2 size={12} color="#16a34a" />}
                              {row.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActiveDropdown(null); showToast(`Downloading details for ${row.id}...`); }}
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
                              <Download size={12} color="#64748b" /> Download Details
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

            {/* Pagination Footer */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: '#64748b'
            }}>
              <span>Showing 1 to {paginatedData.length} of {filteredAccounts.length} entries</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: CREATE / EDIT BANK ACCOUNT PAGE (DEDICATED FULL PAGE)
         ───────────────────────────────────────────────────────────── */}
      {(view === 'create' || view === 'edit') && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header & Back */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Bank List <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{view === 'create' ? 'Add Bank Account' : 'Edit Bank Account'}</span>
              </p>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {view === 'create' ? 'Add Bank Account' : `Edit Bank Account (${formData.id})`}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Add a new bank account to be used for settlements and refunds.
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
                  {/* Bank Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Bank Name*
                    </label>
                    <select
                      value={formData.bankName}
                      onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
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
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                      <option value="YES Bank">YES Bank</option>
                    </select>
                  </div>

                  {/* Account Holder Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Account Holder Name*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter account holder name"
                      value={formData.accountHolder}
                      onChange={e => setFormData(prev => ({ ...prev, accountHolder: e.target.value }))}
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

                  {/* Account Number */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Account Number*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter account number"
                      value={formData.accountNumber}
                      onChange={e => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
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

                  {/* Confirm Account Number */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Confirm Account Number*
                    </label>
                    <input
                      type="text"
                      placeholder="Confirm account number"
                      value={formData.confirmAccountNumber}
                      onChange={e => setFormData(prev => ({ ...prev, confirmAccountNumber: e.target.value }))}
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

                  {/* IFSC Code */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      IFSC Code*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter IFSC code"
                      value={formData.ifscCode}
                      onChange={e => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))}
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

                  {/* Branch Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Branch Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter branch name"
                      value={formData.branch}
                      onChange={e => setFormData(prev => ({ ...prev, branch: e.target.value }))}
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
                  {/* Account Type & Currency Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Account Type*
                      </label>
                      <select
                        value={formData.accountType}
                        onChange={e => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
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
                        <option value="Current">Current</option>
                        <option value="Savings">Savings</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Currency*
                      </label>
                      <select
                        value={formData.currency}
                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
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
                        <option value="INR (₹)">INR (₹)</option>
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Purpose & Opening Balance Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Purpose*
                      </label>
                      <select
                        value={formData.purpose}
                        onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
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
                        <option value="Settlement">Settlement</option>
                        <option value="Refund">Refund</option>
                        <option value="Operations">Operations</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Opening Balance
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.openingBalance}
                        onChange={e => setFormData(prev => ({ ...prev, openingBalance: e.target.value }))}
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

                  {/* Default Account & Status Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Default Account
                      </label>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="defaultAcc"
                            checked={formData.isDefault === true}
                            onChange={() => setFormData(prev => ({ ...prev, isDefault: true }))}
                          />
                          <span>Yes</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="defaultAcc"
                            checked={formData.isDefault === false}
                            onChange={() => setFormData(prev => ({ ...prev, isDefault: false }))}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

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
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Notes</label>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{(formData.notes || '').length}/500</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Enter notes (optional)"
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                </div>
              </div>

              {/* Form Action Buttons */}
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
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: BANK ACCOUNT DETAILS PAGE (DEDICATED FULL PAGE)
         ───────────────────────────────────────────────────────────── */}
      {view === 'details' && selectedItem && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Account Management <span style={{ color: '#cbd5e1' }}>/</span> Bank List <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>{selectedItem.id}</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Bank Account Details
                </h1>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: selectedItem.status === 'Active' ? '#dcfce7' : '#fee2e2',
                  color: selectedItem.status === 'Active' ? '#15803d' : '#991b1b'
                }}>
                  {selectedItem.status}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                View complete details for this bank account.
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
                <Pencil size={14} color="#64748b" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedItem)}
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
                  color: selectedItem.status === 'Active' ? '#d97706' : '#16a34a',
                  cursor: 'pointer'
                }}
              >
                {selectedItem.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => showToast(`Downloading details for ${selectedItem.id}...`)}
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
                <Download size={14} /> Download
              </button>
            </div>
          </div>

          {/* Details Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* Card 1: Bank Information */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="#A51C49" /> Bank Information
              </h3>

              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Bank ID:</span> <strong style={{ color: '#0f172a', float: 'right' }}>{selectedItem.id}</strong></div>
                <div><span style={{ color: '#64748b' }}>Bank Name:</span> <strong style={{ color: '#0f172a', float: 'right' }}>{selectedItem.bankName}</strong></div>
                <div><span style={{ color: '#64748b' }}>Branch:</span> <span style={{ color: '#334155', float: 'right' }}>{selectedItem.branch || 'Main Branch'}</span></div>
                <div><span style={{ color: '#64748b' }}>IFSC Code:</span> <strong style={{ color: '#475569', float: 'right', fontFamily: 'monospace' }}>{selectedItem.ifscCode}</strong></div>
                <div><span style={{ color: '#64748b' }}>Account Type:</span> <span style={{ color: '#334155', float: 'right' }}>{selectedItem.accountType} Account</span></div>
                <div><span style={{ color: '#64748b' }}>Currency:</span> <span style={{ color: '#334155', float: 'right' }}>{selectedItem.currency || 'INR (₹)'}</span></div>
              </div>
            </div>

            {/* Card 2: Account Information */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={15} color="#16a34a" /> Account Information
              </h3>

              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Account Holder:</span> <strong style={{ color: '#0f172a', float: 'right' }}>{selectedItem.accountHolder}</strong></div>
                <div>
                  <span style={{ color: '#64748b' }}>Account Number:</span>
                  <div style={{ float: 'right', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                    <strong>{formatAccountNumber(selectedItem.accountNumber, selectedItem.id)}</strong>
                    <button
                      type="button"
                      onClick={() => toggleAccountVisibility(selectedItem.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}
                    >
                      {visibleAccountIds.has(selectedItem.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                </div>
                <div><span style={{ color: '#64748b' }}>Purpose:</span> <span style={{ color: '#334155', float: 'right' }}>{selectedItem.purpose}</span></div>
                <div>
                  <span style={{ color: '#64748b' }}>Default Account:</span>
                  <span style={{ float: 'right', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: selectedItem.isDefault ? '#dcfce7' : '#f1f5f9', color: selectedItem.isDefault ? '#15803d' : '#64748b' }}>
                    {selectedItem.isDefault ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{ float: 'right', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: selectedItem.status === 'Active' ? '#dcfce7' : '#fee2e2', color: selectedItem.status === 'Active' ? '#15803d' : '#991b1b' }}>
                    {selectedItem.status}
                  </span>
                </div>
                <div><span style={{ color: '#64748b' }}>Opening Balance:</span> <strong style={{ color: '#0f172a', float: 'right' }}>₹ {selectedItem.openingBalance?.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>

            {/* Card 3: Audit Information */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#3b82f6" /> Audit Information
              </h3>

              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Created By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.createdBy}</span></div>
                <div><span style={{ color: '#64748b' }}>Created At:</span> <span style={{ color: '#475569', float: 'right' }}>{selectedItem.createdTime}</span></div>
                <div><span style={{ color: '#64748b' }}>Updated By:</span> <span style={{ fontWeight: 600, color: '#334155', float: 'right' }}>{selectedItem.updatedBy}</span></div>
                <div><span style={{ color: '#64748b' }}>Updated At:</span> <span style={{ color: '#475569', float: 'right' }}>{selectedItem.updatedTime}</span></div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ color: '#64748b' }}>Remarks:</span>
                  <p style={{ margin: '2px 0 0', color: '#334155', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                    {selectedItem.remarks}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
