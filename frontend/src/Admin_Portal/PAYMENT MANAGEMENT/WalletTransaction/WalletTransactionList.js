/* eslint-disable */
import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Plus,
  Search,
  Download,
  Filter,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './WalletTransactionList.css';

const INITIAL_WALLET_TRANSACTIONS = [
  {
    id: 'WLT-90812',
    dateTime: '08 Sep 2026, 11:45 AM',
    customer: 'Rahul Sharma',
    customerId: 'CUST-5821',
    type: 'Credit',
    category: 'Deposit',
    description: 'Wallet Top-up via Cashfree UPI',
    referenceId: 'CF-99281726',
    amount: 15000,
    balanceAfter: 45000,
    status: 'Success',
    method: 'UPI (Cashfree)',
  },
  {
    id: 'WLT-90811',
    dateTime: '08 Sep 2026, 10:20 AM',
    customer: 'Priya Verma',
    customerId: 'CUST-4312',
    type: 'Debit',
    category: 'Booking Payment',
    description: 'Payment for Flight Booking #BOOK-77821',
    referenceId: 'BOOK-77821',
    amount: 8200,
    balanceAfter: 12400,
    status: 'Success',
    method: 'Wallet',
  },
  {
    id: 'WLT-90810',
    dateTime: '07 Sep 2026, 05:30 PM',
    customer: 'Amit Patel',
    customerId: 'CUST-2918',
    type: 'Credit',
    category: 'Refund',
    description: 'Cancellation Refund for Bus Booking #BOOK-77815',
    referenceId: 'REF-55620',
    amount: 3500,
    balanceAfter: 8900,
    status: 'Success',
    method: 'Wallet Refund',
  },
  {
    id: 'WLT-90809',
    dateTime: '07 Sep 2026, 02:15 PM',
    customer: 'Sneha Gupta',
    customerId: 'CUST-7012',
    type: 'Credit',
    category: 'Adjustment',
    description: 'Admin Manual Credit Adjustment - Promotional Bonus',
    referenceId: 'ADJ-00128',
    amount: 1000,
    balanceAfter: 6800,
    status: 'Success',
    method: 'Admin Credit',
  },
  {
    id: 'WLT-90808',
    dateTime: '06 Sep 2026, 04:10 PM',
    customer: 'Vikas Malhotra',
    customerId: 'CUST-8819',
    type: 'Debit',
    category: 'Booking Payment',
    description: 'Payment for Hotel Booking #BOOK-77810',
    referenceId: 'BOOK-77810',
    amount: 12500,
    balanceAfter: 3200,
    status: 'Success',
    method: 'Wallet',
  },
  {
    id: 'WLT-90807',
    dateTime: '06 Sep 2026, 09:05 AM',
    customer: 'Ananya Roy',
    customerId: 'CUST-6102',
    type: 'Credit',
    category: 'Deposit',
    description: 'Wallet Top-up via Credit Card',
    referenceId: 'CF-88192301',
    amount: 25000,
    balanceAfter: 28500,
    status: 'Success',
    method: 'Credit Card',
  },
  {
    id: 'WLT-90806',
    dateTime: '05 Sep 2026, 06:40 PM',
    customer: 'Karan Singh',
    customerId: 'CUST-3319',
    type: 'Debit',
    category: 'Adjustment',
    description: 'Admin Manual Debit - Correction for Chargeback',
    referenceId: 'ADJ-00122',
    amount: 2500,
    balanceAfter: 14200,
    status: 'Success',
    method: 'Admin Debit',
  },
  {
    id: 'WLT-90805',
    dateTime: '05 Sep 2026, 01:20 PM',
    customer: 'Deepak Mehta',
    customerId: 'CUST-9014',
    type: 'Credit',
    category: 'Deposit',
    description: 'Bank Transfer Deposit Request Approved',
    referenceId: 'DEP-44912',
    amount: 50000,
    balanceAfter: 55000,
    status: 'Success',
    method: 'Bank Transfer',
  },
];

export default function WalletTransactionList() {
  const [transactions, setTransactions] = useState(INITIAL_WALLET_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);

  // New Adjustment Form State
  const [adjForm, setAdjForm] = useState({
    customerId: '',
    customerName: '',
    type: 'Credit',
    amount: '',
    reason: '',
  });

  // Calculate Metrics
  const metrics = useMemo(() => {
    const totalBalance = transactions.reduce((acc, curr) => acc + (curr.type === 'Credit' ? curr.amount : -curr.amount), 320000);
    const totalCredit = transactions.filter(t => t.type === 'Credit').reduce((acc, curr) => acc + curr.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'Debit').reduce((acc, curr) => acc + curr.amount, 0);
    const totalCount = transactions.length;
    return { totalBalance, totalCredit, totalDebit, totalCount };
  }, [transactions]);

  // Filtered Transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || t.type === typeFilter || t.category === typeFilter;
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  const handleAddAdjustment = (e) => {
    e.preventDefault();
    if (!adjForm.customerId || !adjForm.amount) return;

    const newTxn = {
      id: `WLT-${Math.floor(10000 + Math.random() * 90000)}`,
      dateTime: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customer: adjForm.customerName || 'Admin User',
      customerId: adjForm.customerId,
      type: adjForm.type,
      category: 'Adjustment',
      description: `Admin Adjustment: ${adjForm.reason || 'Manual Balance Correction'}`,
      referenceId: `ADJ-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: parseFloat(adjForm.amount),
      balanceAfter: 25000 + parseFloat(adjForm.amount),
      status: 'Success',
      method: `Admin ${adjForm.type}`,
    };

    setTransactions([newTxn, ...transactions]);
    setIsAdjModalOpen(false);
    setAdjForm({ customerId: '', customerName: '', type: 'Credit', amount: '', reason: '' });
  };

  const exportCSV = () => {
    const headers = ['Txn ID', 'Date', 'Customer ID', 'Customer Name', 'Type', 'Category', 'Amount', 'Reference', 'Status'];
    const rows = filtered.map(t => [t.id, t.dateTime, t.customerId, t.customer, t.type, t.category, t.amount, t.referenceId, t.status]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="wt-container">
      {/* Header */}
      <div className="wt-header-area">
        <div>
          <h1 className="wt-header-title">Wallet Transactions</h1>
          <p className="wt-header-sub">Manage customer wallet credits, debits, refunds & manual adjustments.</p>
        </div>
        <div className="wt-header-actions">
          <button className="wt-btn-outline" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="wt-btn-primary" onClick={() => setIsAdjModalOpen(true)}>
            <Plus size={16} /> Manual Adjustment
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="wt-metrics-grid">
        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total System Wallet Balance</div>
            <div className="wt-metric-val">₹{metrics.totalBalance.toLocaleString('en-IN')}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}>
            <Wallet size={22} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Wallet Credits</div>
            <div className="wt-metric-val" style={{ color: '#16a34a' }}>+₹{metrics.totalCredit.toLocaleString('en-IN')}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <ArrowUpRight size={22} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Wallet Debits</div>
            <div className="wt-metric-val" style={{ color: '#ff0000' }}>-₹{metrics.totalDebit.toLocaleString('en-IN')}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#fee2e2', color: '#ff0000' }}>
            <ArrowDownLeft size={22} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Transactions</div>
            <div className="wt-metric-val">{metrics.totalCount}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <RotateCcw size={22} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="wt-filter-card">
        <div className="wt-search-box">
          <Search size={18} className="wt-search-icon" />
          <input
            type="text"
            className="wt-search-input"
            placeholder="Search by User, Txn ID, Ref ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="wt-filter-group">
          <select className="wt-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types & Categories</option>
            <option value="Credit">Credits Only</option>
            <option value="Debit">Debits Only</option>
            <option value="Refund">Refunds</option>
            <option value="Deposit">Deposits</option>
            <option value="Adjustment">Adjustments</option>
          </select>

          <select className="wt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="wt-table-card">
        <table className="wt-table">
          <thead>
            <tr>
              <th>Txn ID</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Category / Method</th>
              <th>Reference ID</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No wallet transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#A51C49' }}>{t.id}</td>
                  <td>{t.dateTime}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.customer}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.customerId}</div>
                  </td>
                  <td>
                    <span
                      className={`wt-badge ${
                        t.type === 'Credit'
                          ? 'wt-badge-credit'
                          : t.category === 'Refund'
                          ? 'wt-badge-refund'
                          : t.category === 'Adjustment'
                          ? 'wt-badge-adj'
                          : 'wt-badge-debit'
                      }`}
                    >
                      {t.type === 'Credit' ? '▲ Credit' : '▼ Debit'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.category}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.method}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.referenceId}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'Credit' ? '#15803d' : '#ff0000' }}>
                    {t.type === 'Credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`wt-badge ${
                        t.status === 'Success' ? 'wt-badge-success' : t.status === 'Pending' ? 'wt-badge-pending' : 'wt-badge-failed'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="wt-icon-btn" title="View Details" onClick={() => setSelectedTxn(t)}>
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="wt-modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="wt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wt-modal-header">
              <h3 className="wt-modal-title">Transaction Details - {selectedTxn.id}</h3>
              <button className="wt-icon-btn" onClick={() => setSelectedTxn(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="wt-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div className="wt-label">Customer Name</div>
                  <div style={{ fontWeight: 600 }}>{selectedTxn.customer}</div>
                </div>
                <div>
                  <div className="wt-label">Customer ID</div>
                  <div style={{ fontWeight: 600 }}>{selectedTxn.customerId}</div>
                </div>
                <div>
                  <div className="wt-label">Date & Time</div>
                  <div>{selectedTxn.dateTime}</div>
                </div>
                <div>
                  <div className="wt-label">Transaction Type</div>
                  <div>{selectedTxn.type} ({selectedTxn.category})</div>
                </div>
                <div>
                  <div className="wt-label">Reference ID</div>
                  <div style={{ fontFamily: 'monospace' }}>{selectedTxn.referenceId}</div>
                </div>
                <div>
                  <div className="wt-label">Payment Method</div>
                  <div>{selectedTxn.method}</div>
                </div>
                <div>
                  <div className="wt-label">Transaction Amount</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: selectedTxn.type === 'Credit' ? '#15803d' : '#ff0000' }}>
                    {selectedTxn.type === 'Credit' ? '+' : '-'}₹{selectedTxn.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="wt-label">Balance After Txn</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>₹{selectedTxn.balanceAfter.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <div className="wt-label">Description / Remarks</div>
                <div style={{ color: '#475569', fontSize: '0.88rem' }}>{selectedTxn.description}</div>
              </div>
            </div>
            <div className="wt-modal-footer">
              <button className="wt-btn-outline" onClick={() => setSelectedTxn(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {isAdjModalOpen && (
        <div className="wt-modal-overlay" onClick={() => setIsAdjModalOpen(false)}>
          <div className="wt-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddAdjustment}>
              <div className="wt-modal-header">
                <h3 className="wt-modal-title">Manual Wallet Adjustment</h3>
                <button className="wt-icon-btn" type="button" onClick={() => setIsAdjModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="wt-modal-body">
                <div className="wt-field">
                  <label className="wt-label">Customer ID *</label>
                  <input
                    type="text"
                    className="wt-input"
                    placeholder="e.g. CUST-5821"
                    required
                    value={adjForm.customerId}
                    onChange={(e) => setAdjForm({ ...adjForm, customerId: e.target.value })}
                  />
                </div>

                <div className="wt-field">
                  <label className="wt-label">Customer Name</label>
                  <input
                    type="text"
                    className="wt-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={adjForm.customerName}
                    onChange={(e) => setAdjForm({ ...adjForm, customerName: e.target.value })}
                  />
                </div>

                <div className="wt-field">
                  <label className="wt-label">Adjustment Type *</label>
                  <select
                    className="wt-select"
                    style={{ width: '100%' }}
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
                  >
                    <option value="Credit">Credit (Add Money to Wallet)</option>
                    <option value="Debit">Debit (Deduct Money from Wallet)</option>
                  </select>
                </div>

                <div className="wt-field">
                  <label className="wt-label">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    className="wt-input"
                    placeholder="Enter amount"
                    required
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  />
                </div>

                <div className="wt-field">
                  <label className="wt-label">Reason / Remarks</label>
                  <input
                    type="text"
                    className="wt-input"
                    placeholder="e.g. Promotional Bonus, Booking Refund Correction"
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="wt-modal-footer">
                <button className="wt-btn-outline" type="button" onClick={() => setIsAdjModalOpen(false)}>
                  Cancel
                </button>
                <button className="wt-btn-primary" type="submit">
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
