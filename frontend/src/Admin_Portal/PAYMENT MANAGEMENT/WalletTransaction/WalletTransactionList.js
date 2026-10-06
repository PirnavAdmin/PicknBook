/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { WalletApi } from '../../../services/walletService';
import { adminWalletService } from '../../../services/adminWalletService';
import { toApiUrl } from '../../../services/apiClient';
import AdminPagination from '../../../components/AdminPagination';

export default function WalletTransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSummaryLoading, setCustomerSummaryLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rawList = await adminWalletService.getAdminLedger({
        page: 1,
        pageSize: 100,
        search: searchTerm || undefined,
        transactionType: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      const list = Array.isArray(rawList)
        ? rawList
        : Array.isArray(rawList?.items)
        ? rawList.items
        : Array.isArray(rawList?.data)
        ? rawList.data
        : Array.isArray(rawList?.transactions)
        ? rawList.transactions
        : Array.isArray(rawList?.results)
        ? rawList.results
        : [];

      if (list.length > 0) {
        const parsed = list.map((item, idx) => {
          const creditAmt = Number(item.creditAmount || item.credit || 0);
          const debitAmt = Number(item.debitAmount || item.debit || 0);
          let amountNum = 0;
          if (item.amount !== undefined && item.amount !== null) {
            amountNum = Math.abs(Number(item.amount));
          } else if (creditAmt > 0) {
            amountNum = creditAmt;
          } else if (debitAmt > 0) {
            amountNum = debitAmt;
          } else {
            amountNum = Number(item.txnAmount || item.value || item.depositAmount || 0);
          }

          const rawType = item.transactionType || item.type || item.txnType || (debitAmt > 0 ? 'Debit' : 'Credit');
          const typeStr = String(rawType).toLowerCase();
          const type = (typeStr.includes('debit') || debitAmt > 0 || typeStr.includes('booking') || typeStr.includes('reset')) ? 'Debit' : 'Credit';

          const dateVal = item.createdAtUtc || item.createdAt || item.dateTime || item.createdOn || item.transactionDate || item.date || item.requestedAt;
          let formattedDate = 'N/A';
          if (dateVal) {
            try {
              let str = String(dateVal).trim();
              if (str.includes(":") && !str.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
                str = str.replace(" ", "T") + "Z";
              }
              const d = new Date(str);
              if (!Number.isNaN(d.getTime())) {
                const day = d.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                });
                const time = d.toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                }).toLowerCase();
                formattedDate = `${day}, ${time}`;
              } else {
                formattedDate = String(dateVal);
              }
            } catch (e) {
              formattedDate = String(dateVal);
            }
          }

          const rawUserId = item.agentId || item.userId || item.customerId;
          const companySuffix = item.companyName ? ` (${item.companyName})` : '';
          const custName = (item.agentName || item.customerName || item.customer || item.userName || item.name || item.email || 'Customer') + companySuffix;
          const custId = item.agentId ? `AGT-${item.agentId}` : (item.userId ? `CUST-${item.userId}` : item.customerId || (item.userCode ? `CUST-${item.userCode}` : 'N/A'));

          return {
            id: String(item.id || item.transactionId || item.txnId || item.refCode || item.referenceId || `WLT-${10000 + idx}`),
            rawUserId: rawUserId,
            dateTime: formattedDate,
            customer: String(custName),
            customerEmail: item.email || item.customerEmail || '',
            customerPhone: item.phone || item.customerPhone || '',
            customerId: String(custId),
            type: type,
            category: String(item.transactionType || item.referenceType || item.category || item.transactionCategory || item.type || (type === 'Credit' ? 'Credit' : 'Debit')),
            description: String(item.description || item.remarks || item.reason || item.narration || item.depositMode || item.action || ''),
            referenceId: String(item.referenceId || item.refCode || item.refNo || item.txnRef || item.paymentId || item.transactionReference || 'N/A'),
            amount: Math.abs(amountNum),
            balanceAfter: Number(item.runningBalance || item.balanceAfter || item.walletBalance || item.closingBalance || item.updatedBalance || 0),
            status: String(item.status || item.txnStatus || 'Completed'),
            method: String(item.referenceType || item.method || item.paymentMethod || item.paymentMode || item.depositMode || (type === 'Credit' ? 'AdminCredit' : 'AdminReset')),
          };
        });

        setTransactions(parsed);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.warn("[WalletTransactionList] Error loading wallet ledger:", err);
      setError(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleOpenCustomerSummary = async (rawUserId, fallbackName) => {
    if (!rawUserId) return;
    setIsCustomerModalOpen(true);
    setCustomerSummaryLoading(true);
    try {
      const summary = await adminWalletService.getCustomerSummary(rawUserId);
      setCustomerSummary(summary);
    } catch (err) {
      try {
        const summary = await WalletApi.getCustomerSummary(rawUserId);
        setCustomerSummary(summary);
      } catch (err2) {
        console.warn("Could not fetch customer summary from backend API, using local fallback...", err2);
        setCustomerSummary({
          userId: rawUserId,
          customerName: fallbackName || `Customer #${rawUserId}`,
          walletBalance: transactions.filter(t => t.rawUserId === rawUserId && t.type === 'Credit').reduce((a, b) => a + b.amount, 0),
          walletStatus: 'Active',
          picknbookCoins: 0,
          totalDeposits: transactions.filter(t => t.rawUserId === rawUserId && t.category.includes('Deposit')).reduce((a, b) => a + b.amount, 0),
          totalBookingSpend: transactions.filter(t => t.rawUserId === rawUserId && t.type === 'Debit').reduce((a, b) => a + b.amount, 0),
          totalRefunds: transactions.filter(t => t.rawUserId === rawUserId && t.category.includes('Refund')).reduce((a, b) => a + b.amount, 0),
          totalAdjustments: transactions.filter(t => t.rawUserId === rawUserId && t.category.includes('Adjustment')).reduce((a, b) => a + b.amount, 0),
          recentTransactions: transactions.filter(t => t.rawUserId === rawUserId).slice(0, 5)
        });
      }
    } finally {
      setCustomerSummaryLoading(false);
    }
  };

  // Filtered Transactions based on search, category and status
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        (t.id || '').toLowerCase().includes(search) ||
        (t.customer || '').toLowerCase().includes(search) ||
        (t.customerId || '').toLowerCase().includes(search) ||
        (t.referenceId || '').toLowerCase().includes(search) ||
        (t.description || '').toLowerCase().includes(search) ||
        (t.category || '').toLowerCase().includes(search) ||
        (t.method || '').toLowerCase().includes(search);

      let matchType = true;
      if (typeFilter !== 'ALL') {
        const typeLower = typeFilter.toLowerCase();
        const tTypeLower = (t.type || '').toLowerCase();
        const tCatLower = (t.category || '').toLowerCase();
        const tDescLower = (t.description || '').toLowerCase();
        const tMethodLower = (t.method || '').toLowerCase();
        const tRefLower = (t.referenceId || '').toLowerCase();

        if (typeFilter === 'Credit') {
          matchType = tTypeLower === 'credit';
        } else if (typeFilter === 'Debit') {
          matchType = tTypeLower === 'debit';
        } else if (typeFilter === 'Refund') {
          matchType = tCatLower.includes('refund') || tDescLower.includes('refund') || tMethodLower.includes('refund');
        } else if (typeFilter === 'Deposit') {
          matchType = tCatLower.includes('deposit') || tDescLower.includes('deposit') || tMethodLower.includes('deposit');
        } else if (typeFilter === 'Adjustment') {
          matchType = tCatLower.includes('admin') || tCatLower.includes('adjust') || tDescLower.includes('admin') || tRefLower.includes('admin') || tMethodLower.includes('admin');
        } else {
          matchType = tTypeLower === typeLower || tCatLower.includes(typeLower) || tMethodLower.includes(typeLower);
        }
      }

      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        const sFilterLower = statusFilter.toLowerCase();
        const tStatusLower = (t.status || '').toLowerCase();

        if (sFilterLower === 'success' || sFilterLower === 'completed') {
          matchStatus = ['success', 'completed', 'active', 'approved'].includes(tStatusLower);
        } else if (sFilterLower === 'pending') {
          matchStatus = ['pending', 'processing', 'in progress', 'reserved'].includes(tStatusLower);
        } else if (sFilterLower === 'failed') {
          matchStatus = ['failed', 'cancelled', 'rejected', 'error'].includes(tStatusLower);
        } else {
          matchStatus = tStatusLower.includes(sFilterLower);
        }
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  // Paginated logs for table display
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Calculate Metrics dynamically based on filtered transactions
  const metrics = useMemo(() => {
    const totalCredit = filtered.filter(t => t.type === 'Credit').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalDebit = filtered.filter(t => t.type === 'Debit').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalBalance = totalCredit - totalDebit;
    const totalCount = filtered.length;
    return { totalBalance, totalCredit, totalDebit, totalCount };
  }, [filtered]);

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
        <div className="wt-header-title-wrap" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1 ref={(el) => { if (el) el.style.setProperty('color', '#A51C49', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#A51C49', margin: 0, letterSpacing: '-0.5px' }}>Wallet</h1>
          <h2 ref={(el) => { if (el) el.style.setProperty('color', '#000000', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#000000', margin: 0 }}>Transactions</h2>
        </div>
        <div className="wt-header-actions">
          <button className="wt-btn-outline" onClick={fetchTransactions} title="Refresh Transactions">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="wt-btn-export" onClick={exportCSV} title="Export Transactions">
            <Download size={15} /> Export
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
            <Wallet size={18} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Wallet Credits</div>
            <div className="wt-metric-val" style={{ color: '#16a34a' }}>+₹{metrics.totalCredit.toLocaleString('en-IN')}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <ArrowUpRight size={18} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Wallet Debits</div>
            <div className="wt-metric-val" style={{ color: '#dc2626' }}>-₹{metrics.totalDebit.toLocaleString('en-IN')}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <ArrowDownLeft size={18} />
          </div>
        </div>

        <div className="wt-metric-card">
          <div>
            <div className="wt-metric-label">Total Transactions</div>
            <div className="wt-metric-val">{metrics.totalCount}</div>
          </div>
          <div className="wt-metric-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <RotateCcw size={18} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="wt-filter-card">
        <div className="wt-search-box">
          <Search size={16} className="wt-search-icon" />
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
            <option value="ALL">All Categories</option>
            <option value="Credit">Credits Only</option>
            <option value="Debit">Debits Only</option>
            <option value="Refund">Refunds</option>
            <option value="Deposit">Deposits</option>
            <option value="Adjustment">Adjustments</option>
          </select>

          <select className="wt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="Completed">Completed</option>
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
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <div>Loading wallet transactions...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                  <div>{error}</div>
                  <button className="wt-btn-outline" style={{ marginTop: '12px' }} onClick={fetchTransactions}>
                    Retry Loading
                  </button>
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No wallet transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#A51C49' }}>{t.id}</td>
                  <td>{t.dateTime}</td>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: t.rawUserId ? '#A51C49' : '#0f172a', cursor: t.rawUserId ? 'pointer' : 'default', textDecoration: t.rawUserId ? 'underline' : 'none' }}
                      onClick={() => t.rawUserId && handleOpenCustomerSummary(t.rawUserId, t.customer)}
                      title={t.rawUserId ? "Click to view customer wallet profile summary" : ""}
                    >
                      {t.customer}
                    </div>
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
                  <td style={{ textAlign: 'center', fontWeight: 700, color: t.type === 'Credit' ? '#15803d' : '#b91c1c' }}>
                    {t.type === 'Credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`wt-badge ${
                        ['success', 'completed', 'active', 'approved'].includes((t.status || '').toLowerCase())
                          ? 'wt-badge-success'
                          : ['pending', 'processing', 'in progress', 'reserved'].includes((t.status || '').toLowerCase())
                          ? 'wt-badge-pending'
                          : 'wt-badge-failed'
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

        <AdminPagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="wallet transactions"
        />
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && createPortal(
        <div className="wt-modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="wt-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="wt-modal-header">
              <h3 className="wt-modal-title">Transaction Details - {selectedTxn.id}</h3>
              <button className="wt-icon-btn" onClick={() => setSelectedTxn(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="wt-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                <div>
                  <div className="wt-label">Customer Name</div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{selectedTxn.customer}</div>
                </div>
                <div>
                  <div className="wt-label">Customer ID</div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{selectedTxn.customerId}</div>
                </div>
                <div>
                  <div className="wt-label">Date & Time</div>
                  <div style={{ fontSize: '0.82rem' }}>{selectedTxn.dateTime}</div>
                </div>
                <div>
                  <div className="wt-label">Transaction Type</div>
                  <div style={{ fontSize: '0.82rem' }}>{selectedTxn.type} ({selectedTxn.category})</div>
                </div>
                <div>
                  <div className="wt-label">Reference ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{selectedTxn.referenceId}</div>
                </div>
                <div>
                  <div className="wt-label">Payment Method</div>
                  <div style={{ fontSize: '0.82rem' }}>{selectedTxn.method}</div>
                </div>
                <div>
                  <div className="wt-label">Transaction Amount</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: selectedTxn.type === 'Credit' ? '#15803d' : '#b91c1c' }}>
                    {selectedTxn.type === 'Credit' ? '+' : '-'}₹{selectedTxn.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="wt-label">Balance After Txn</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 600 }}>₹{selectedTxn.balanceAfter.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <div className="wt-label">Description / Remarks</div>
                <div style={{ color: '#475569', fontSize: '0.82rem' }}>{selectedTxn.description}</div>
              </div>
            </div>
            <div className="wt-modal-footer">
              <button className="wt-btn-outline" onClick={() => setSelectedTxn(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customer Wallet Profile Modal */}
      {isCustomerModalOpen && createPortal(
        <div className="wt-modal-overlay" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="wt-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="wt-modal-header">
              <h3 className="wt-modal-title">Customer Consolidated Wallet Profile</h3>
              <button className="wt-icon-btn" onClick={() => setIsCustomerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="wt-modal-body">
              {customerSummaryLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <div>Loading customer profile...</div>
                </div>
              ) : customerSummary ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{customerSummary.customerName}</h4>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>User ID: #{customerSummary.userId}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`wt-badge ${customerSummary.walletStatus === 'Active' ? 'wt-badge-success' : 'wt-badge-failed'}`}>
                        {customerSummary.walletStatus || 'Active'}
                      </span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#A51C49', marginTop: '2px' }}>
                        ₹{(customerSummary.walletBalance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 600 }}>Total Deposits</div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#166534' }}>₹{(customerSummary.totalDeposits || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.70rem', color: '#b91c1c', fontWeight: 600 }}>Booking Spend</div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#991b1b' }}>₹{(customerSummary.totalBookingSpend || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.70rem', color: '#1d4ed8', fontWeight: 600 }}>Total Refunds</div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1e40af' }}>₹{(customerSummary.totalRefunds || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#faf5ff', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.70rem', color: '#6b21a8', fontWeight: 600 }}>Adjustments</div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#581c87' }}>₹{(customerSummary.totalAdjustments || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {customerSummary.recentTransactions && customerSummary.recentTransactions.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#334155' }}>Recent Wallet Transactions</h5>
                      <div style={{ fontSize: '0.80rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {customerSummary.recentTransactions.map((rt, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{rt.type || rt.transactionType}</span> - {rt.description || rt.referenceType || rt.refCode}
                            </div>
                            <div style={{ fontWeight: 700, color: (rt.type === 'Credit' || rt.transactionType === 'Credit') ? '#15803d' : '#b91c1c' }}>
                              ₹{(rt.amount || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748b', textAlign: 'center' }}>No summary data available.</div>
              )}
            </div>
            <div className="wt-modal-footer">
              <button className="wt-btn-outline" onClick={() => setIsCustomerModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
