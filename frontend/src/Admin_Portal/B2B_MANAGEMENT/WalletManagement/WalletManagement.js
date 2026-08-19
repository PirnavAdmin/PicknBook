/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminPagination from '../../../components/AdminPagination';
import './b2bWallet.css';
import '../../SECURITY_MANAGEMENT/SecurityManagement.css';

export default function WalletManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSecurityView = location.pathname.includes('security-management');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // States
  const [wallets, setWallets] = useState([]);

  // Advanced Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWalletStatus, setFilterWalletStatus] = useState('All');
  const [filterKycStatus, setFilterKycStatus] = useState('All');
  const [filterBalanceRange, setFilterBalanceRange] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawers and Modals
  const [activeDrawer, setActiveDrawer] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // Drawer Form State
  const [companyName, setCompanyName] = useState('');
  const [b2bId, setB2bId] = useState('');
  const [email, setEmail] = useState('');
  const [contactCode, setContactCode] = useState('+91');
  const [contactNumber, setContactNumber] = useState('');
  
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [currency, setCurrency] = useState('INR - Indian Rupee');
  const [creditLimit, setCreditLimit] = useState('0.00');
  const [walletValidity, setWalletValidity] = useState('');
  
  const [kycStatus, setKycStatus] = useState('Verified');
  const [kycVerifiedBy, setKycVerifiedBy] = useState('Super Admin');
  const [kycVerifiedDate, setKycVerifiedDate] = useState('');
  
  const [walletStatus, setWalletStatus] = useState('Active');
  const [autoTopup, setAutoTopup] = useState('Select');
  const [lowBalanceAlert, setLowBalanceAlert] = useState('Enable');
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState('0.00');
  const [remarks, setRemarks] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Drawer Actions
  const handleOpenAddDrawer = () => {
    setSelectedWallet(null);
    setCompanyName('');
    setB2bId(`B2B${Math.floor(1000 + Math.random() * 9000)}`);
    setEmail('');
    setContactCode('+91');
    setContactNumber('');
    setInitialBalance('0.00');
    setCurrency('INR - Indian Rupee');
    setCreditLimit('0.00');
    setWalletValidity('');
    setKycStatus('Verified');
    setKycVerifiedBy('Super Admin');
    setKycVerifiedDate('');
    setWalletStatus('Active');
    setAutoTopup('Select');
    setLowBalanceAlert('Enable');
    setLowBalanceThreshold('0.00');
    setRemarks('');
    setActiveDrawer('add');
  };

  const handleOpenEditDrawer = (w) => {
    setSelectedWallet(w);
    setCompanyName(w.companyName);
    setB2bId(w.b2bId);
    setEmail(w.email);
    setContactCode(w.contactCode || '+91');
    setContactNumber(w.contactNumber || '');
    setInitialBalance(String(w.walletBalance || '0.00'));
    setCurrency(w.currency || 'INR - Indian Rupee');
    setCreditLimit(String(w.creditLimit || '0.00'));
    setWalletValidity(w.walletValidity || '');
    setKycStatus(w.kycStatus);
    setKycVerifiedBy(w.kycVerifiedBy || 'Super Admin');
    setKycVerifiedDate(w.kycVerifiedDate || '');
    setWalletStatus(w.walletStatus);
    setAutoTopup(w.autoTopup || 'Select');
    setLowBalanceAlert(w.lowBalanceAlert || 'Enable');
    setLowBalanceThreshold(String(w.lowBalanceThreshold || '0.00'));
    setRemarks(w.remarks || '');
    setActiveDrawer('edit');
  };

  const handleOpenViewDrawer = (w) => {
    setSelectedWallet(w);
    setActiveDrawer('view');
  };

  const handleOpenDeleteModal = (w) => {
    setSelectedWallet(w);
    setConfirmDeleteModal(true);
  };

  // Action Submit Form
  const handleSaveWallet = (e) => {
    e.preventDefault();
    const balVal = parseFloat(initialBalance) || 0;
    const limitVal = parseFloat(creditLimit) || 0;
    const availVal = balVal + limitVal;

    const newOrUpdated = {
      id: activeDrawer === 'edit' ? selectedWallet.id : `w-${Date.now()}`,
      companyName,
      b2bId,
      email,
      contactCode,
      contactNumber,
      walletBalance: balVal,
      availableBalance: availVal,
      creditLimit: limitVal,
      currency,
      walletValidity,
      status: walletStatus === 'Active' ? 'Active' : 'Inactive',
      kycStatus,
      kycVerifiedBy,
      kycVerifiedDate,
      walletStatus,
      autoTopup,
      lowBalanceAlert,
      lowBalanceThreshold: parseFloat(lowBalanceThreshold) || 0,
      remarks
    };

    if (activeDrawer === 'add') {
      setWallets([newOrUpdated, ...wallets]);
      showToast('✓ B2B Wallet Account created successfully!');
    } else {
      setWallets(wallets.map(item => item.id === selectedWallet.id ? newOrUpdated : item));
      showToast('✓ B2B Wallet Account updated successfully!');
    }
    setActiveDrawer(null);
  };

  const handleDeleteWallet = () => {
    setWallets(wallets.filter(item => item.id !== selectedWallet.id));
    setConfirmDeleteModal(false);
    setSelectedWallet(null);
    showToast('✓ Wallet deleted successfully!');
  };

  // Apply filters logic
  const filteredList = wallets.filter(w => {
    // 1. Search Query
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      const match = w.companyName.toLowerCase().includes(s) || w.b2bId.toLowerCase().includes(s) || w.email.toLowerCase().includes(s);
      if (!match) return false;
    }

    // 2. Status
    if (filterStatus !== 'All' && w.status !== filterStatus) return false;

    // 3. Wallet Status
    if (filterWalletStatus !== 'All' && w.walletStatus !== filterWalletStatus) return false;

    // 4. KYC Status
    if (filterKycStatus !== 'All' && w.kycStatus !== filterKycStatus) return false;

    // 5. Balance Range
    if (filterBalanceRange !== 'All') {
      const bal = w.walletBalance;
      if (filterBalanceRange === '0 - 10,000' && (bal < 0 || bal > 10000)) return false;
      if (filterBalanceRange === '10,001 - 50,000' && (bal <= 10000 || bal > 50000)) return false;
      if (filterBalanceRange === '50,001 - 1,00,000' && (bal <= 50000 || bal > 100000)) return false;
      if (filterBalanceRange === 'Above 1,00,000' && bal <= 100000) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = filteredList.length;
  const activeCount = filteredList.filter(w => w.walletStatus === 'Active').length;
  const blockedCount = filteredList.filter(w => w.walletStatus === 'Blocked').length;
  const inactiveCount = filteredList.filter(w => w.walletStatus === 'Inactive').length;
  const totalSum = filteredList.reduce((acc, curr) => acc + (curr.walletBalance || 0), 0);

  const percentActive = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(2) : '0.00';
  const percentBlocked = totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(2) : '0.00';
  const percentInactive = totalCount > 0 ? ((inactiveCount / totalCount) * 100).toFixed(2) : '0.00';

  // Paginated Rules list
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={isSecurityView ? "security-mgmt-container" : "b2b-wallet-container"}>
      {toastMessage && (
        <div className="sd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Title & Actions */}
      <div className="sd-top-header" style={{ marginBottom: '16px' }}>
        <div className="sd-header-left">
          <h1 className="sd-page-title">{isSecurityView ? 'B2B Wallet Security' : 'B2B Wallet'}</h1>
          <p className="sd-page-subtitle">
            {isSecurityView ? (
              <>Security Management &nbsp;/&nbsp; B2B Wallet Security</>
            ) : (
              <>B2B Management &nbsp;/&nbsp; B2B Wallet</>
            )}
          </p>
        </div>
        <div className="sd-header-right">
          <button className="sd-export-btn" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }} onClick={handleOpenAddDrawer}>
            <span>+ Add Wallet</span>
          </button>
          <button className="sd-export-btn" onClick={() => showToast('📥 Exporting B2B Wallets list CSV...')}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Summary KPI Stats Grid */}
      <div className="sd-kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>💳</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{totalCount}</div>
            <div className="sd-kpi-label">Total Wallets</div>
            <div className="sd-kpi-sublabel">All B2B Wallets</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>💰</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">₹ {totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="sd-kpi-label">Total Balance</div>
            <div className="sd-kpi-sublabel">All Wallet Balance</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#f0fdf4', color: '#15803d' }}>✓</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{activeCount}</div>
            <div className="sd-kpi-label">Active Wallets</div>
            <div className="sd-kpi-sublabel">{percentActive}% of total wallets</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fef2f2', color: '#b91c1c' }}>🛑</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{blockedCount}</div>
            <div className="sd-kpi-label">Blocked Wallets</div>
            <div className="sd-kpi-sublabel">{percentBlocked}% of total wallets</div>
          </div>
        </div>

        <div className="sd-kpi-card">
          <div className="sd-kpi-icon-box" style={{ background: '#fff7ed', color: '#c2410c' }}>⏳</div>
          <div className="sd-kpi-info">
            <div className="sd-kpi-value">{inactiveCount}</div>
            <div className="sd-kpi-label">Inactive Wallets</div>
            <div className="sd-kpi-sublabel">{percentInactive}% of total wallets</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="sd-panel sd-filters-panel" style={{ padding: '16px', marginBottom: '16px' }}>
          <div className="sd-filters-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="sd-filter-field">
              <label>Search B2B / Company</label>
              <input type="text" placeholder="Search company, name, email or ID..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>

            <div className="sd-filter-field">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Wallet Status</label>
              <select value={filterWalletStatus} onChange={(e) => setFilterWalletStatus(e.target.value)}>
                <option>All Wallet Status</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Blocked</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>KYC Status</label>
              <select value={filterKycStatus} onChange={(e) => setFilterKycStatus(e.target.value)}>
                <option>All KYC Status</option>
                <option>Verified</option>
                <option>Pending</option>
                <option>Rejected</option>
              </select>
            </div>

            <div className="sd-filter-field">
              <label>Balance Range</label>
              <select value={filterBalanceRange} onChange={(e) => setFilterBalanceRange(e.target.value)}>
                <option>All</option>
                <option>0 - 10,000</option>
                <option>10,001 - 50,000</option>
                <option>50,001 - 1,00,000</option>
                <option>Above 1,00,000</option>
              </select>
            </div>

            <div className="sd-filter-buttons" style={{ display: 'flex', gap: '8px', gridColumn: 'span 5', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="sd-btn-reset" onClick={() => { setFilterSearch(''); setFilterStatus('All Status'); setFilterWalletStatus('All Wallet Status'); setFilterKycStatus('All KYC Status'); setFilterBalanceRange('All'); }}>Reset</button>
              <button className="sd-btn-filter" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Grid list Panel */}
      <div className="sd-panel" style={{ padding: '16px' }}>
        <div className="sd-panel-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>B2B Wallet Accounts <span className="sd-records-count">({totalCount} Records)</span></h3>
          <button
            className={`sd-filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>
        </div>

        <div className="sd-table-container">
          <table className="sd-mini-table">
            <thead>
              <tr>
                <th width="50">#</th>
                <th>Company Name</th>
                <th>B2B ID</th>
                <th>Email</th>
                <th>Wallet Balance</th>
                <th>Available Balance</th>
                <th>Status</th>
                <th>KYC Status</th>
                <th>Wallet Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length > 0 ? (
                paginatedList.map((w, idx) => (
                  <tr key={w.id}>
                    <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{w.companyName}</td>
                    <td style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{w.b2bId}</td>
                    <td>{w.email}</td>
                    <td style={{ fontWeight: 700 }}>₹ {(w.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹ {(w.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge-custom badge-status-${w.status.toLowerCase()}`}>
                        {w.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-custom badge-status-${w.kycStatus === 'Verified' ? 'active' : w.kycStatus === 'Pending' ? 'expired' : 'inactive'}`}>
                        {w.kycStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-custom badge-wallet-${w.walletStatus.toLowerCase()}`}>
                        {w.walletStatus}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-act-icon" title="View Details" onClick={() => handleOpenViewDrawer(w)}>👁️</button>
                        <button className="btn-act-icon" title="Edit" onClick={() => handleOpenEditDrawer(w)}>📝</button>
                        <button className="btn-act-icon delete" title="Delete" onClick={() => handleOpenDeleteModal(w)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    💼 No B2B Wallet accounts configured. Click "+ Add Wallet" to configure one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          itemName="Wallets"
        />
      </div>

      {/* Slide-In Drawer for Add & Edit */}
      {(activeDrawer === 'add' || activeDrawer === 'edit') && createPortal(
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>{activeDrawer === 'add' ? 'Add B2B Wallet' : 'Edit B2B Wallet'}</h3>
                <p>Configure balance, credit limits, validity parameters, and KYC details.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <form onSubmit={handleSaveWallet} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="sec-drawer-body" style={{ flex: 1, overflowY: 'auto' }}>
                
                {/* Company Information */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Company Information</h4>
                  <div className="drawer-field">
                    <label>Company Name <span className="req">*</span></label>
                    <input type="text" required placeholder="Enter company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  
                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>B2B ID</label>
                      <input type="text" readOnly style={{ background: '#f8fafc', color: '#64748b' }} value={b2bId} />
                    </div>
                    <div className="drawer-field">
                      <label>Email <span className="req">*</span></label>
                      <input type="email" required placeholder="Enter email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Contact Number <span className="req">*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={contactCode} onChange={(e) => setContactCode(e.target.value)} style={{ width: '80px' }}>
                        <option>+91</option>
                        <option>+1</option>
                        <option>+44</option>
                        <option>+971</option>
                        <option>+33</option>
                      </select>
                      <input type="text" required placeholder="Enter contact number" style={{ flex: 1 }} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Wallet Information */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Wallet Information</h4>
                  
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Initial Balance (₹) <span className="req">*</span></label>
                      <input type="number" required step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Currency <span className="req">*</span></label>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option>INR - Indian Rupee</option>
                        <option>USD - US Dollar</option>
                        <option>EUR - Euro</option>
                        <option>GBP - British Pound</option>
                        <option>AED - UAE Dirham</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>Credit Limit (₹)</label>
                      <input type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                    </div>
                    <div className="drawer-field">
                      <label>Wallet Validity</label>
                      <input type="date" value={walletValidity} onChange={(e) => setWalletValidity(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* KYC & Verification */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>KYC & Verification</h4>
                  
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>KYC Status <span className="req">*</span></label>
                      <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}>
                        <option>Verified</option>
                        <option>Pending</option>
                        <option>Rejected</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>KYC Verified By</label>
                      <select value={kycVerifiedBy} onChange={(e) => setKycVerifiedBy(e.target.value)}>
                        <option>Super Admin</option>
                        <option>Admin</option>
                        <option>Support Team</option>
                        <option>System</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>KYC Verified Date</label>
                    <input type="date" value={kycVerifiedDate} onChange={(e) => setKycVerifiedDate(e.target.value)} />
                  </div>
                </div>

                {/* Wallet Settings */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Wallet Settings</h4>
                  
                  <div className="drawer-grid-row">
                    <div className="drawer-field">
                      <label>Wallet Status <span className="req">*</span></label>
                      <select value={walletStatus} onChange={(e) => setWalletStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Blocked</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Auto Top-up</label>
                      <select value={autoTopup} onChange={(e) => setAutoTopup(e.target.value)}>
                        <option>Select</option>
                        <option>Enable</option>
                        <option>Disable</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-grid-row" style={{ marginTop: '8px' }}>
                    <div className="drawer-field">
                      <label>Low Balance Alert</label>
                      <select value={lowBalanceAlert} onChange={(e) => setLowBalanceAlert(e.target.value)}>
                        <option>Enable</option>
                        <option>Disable</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label>Low Balance Threshold (₹) <span className="req">*</span></label>
                      <input type="number" step="0.01" value={lowBalanceThreshold} onChange={(e) => setLowBalanceThreshold(e.target.value)} />
                    </div>
                  </div>

                  <div className="drawer-field" style={{ marginTop: '8px' }}>
                    <label>Remarks</label>
                    <textarea rows="2" maxLength="250" placeholder="Enter remarks (optional)..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    <span className="char-counter">{remarks.length}/250</span>
                  </div>
                </div>

              </div>

              <div className="sec-drawer-footer">
                <div className="footer-button-group">
                  <button type="button" className="btn-drawer-cancel" onClick={() => setActiveDrawer(null)}>Cancel</button>
                  <button type="submit" className="btn-drawer-save" style={{ background: '#901335', color: '#fff', border: '1px solid #901335' }}>
                    {activeDrawer === 'add' ? 'Save Wallet' : 'Update Wallet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-In View Details Sheet */}
      {activeDrawer === 'view' && selectedWallet && createPortal(
        <div className="sec-drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <div className="sec-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sec-drawer-header">
              <div>
                <h3>Wallet Details</h3>
                <p>Detailed B2B account summary and validation constraints.</p>
              </div>
              <span className="sec-drawer-close" role="button" onClick={() => setActiveDrawer(null)}>✕</span>
            </div>

            <div className="sec-drawer-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="view-details-list">
                
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>Company Information</h4>
                <div className="view-details-item">
                  <span className="view-details-lbl">Company Name</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold' }}>{selectedWallet.companyName}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">B2B ID</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{selectedWallet.b2bId}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Email</span>
                  <span className="view-details-val">{selectedWallet.email}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Contact Number</span>
                  <span className="view-details-val">{selectedWallet.contactCode} {selectedWallet.contactNumber}</span>
                </div>

                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>Wallet Information</h4>
                <div className="view-details-item">
                  <span className="view-details-lbl">Wallet Balance</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold' }}>₹ {(selectedWallet.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Available Balance</span>
                  <span className="view-details-val" style={{ fontWeight: 'bold', color: '#16a34a' }}>₹ {(selectedWallet.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Credit Limit</span>
                  <span className="view-details-val">₹ {(selectedWallet.creditLimit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Currency</span>
                  <span className="view-details-val">{selectedWallet.currency}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Wallet Validity</span>
                  <span className="view-details-val">{selectedWallet.walletValidity || '—'}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Wallet Status</span>
                  <span className="view-details-val">
                    <span className={`badge-custom badge-wallet-${selectedWallet.walletStatus.toLowerCase()}`}>
                      {selectedWallet.walletStatus}
                    </span>
                  </span>
                </div>

                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>KYC & Verification</h4>
                <div className="view-details-item">
                  <span className="view-details-lbl">KYC Status</span>
                  <span className="view-details-val">
                    <span className={`badge-custom badge-status-${selectedWallet.kycStatus === 'Verified' ? 'active' : 'inactive'}`}>
                      {selectedWallet.kycStatus}
                    </span>
                  </span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">KYC Verified By</span>
                  <span className="view-details-val">{selectedWallet.kycVerifiedBy || '—'}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">KYC Verified Date</span>
                  <span className="view-details-val">{selectedWallet.kycVerifiedDate || '—'}</span>
                </div>

                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>Wallet Settings</h4>
                <div className="view-details-item">
                  <span className="view-details-lbl">Auto Top-up</span>
                  <span className="view-details-val">{selectedWallet.autoTopup}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Low Balance Alert</span>
                  <span className="view-details-val">{selectedWallet.lowBalanceAlert}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Low Balance Threshold</span>
                  <span className="view-details-val">₹ {(selectedWallet.lowBalanceThreshold || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="view-details-item">
                  <span className="view-details-lbl">Remarks</span>
                  <span className="view-details-val" style={{ whiteSpace: 'pre-wrap' }}>{selectedWallet.remarks || '—'}</span>
                </div>

              </div>
            </div>
            <div className="sec-drawer-footer">
              <button className="btn-drawer-cancel" style={{ width: '100%' }} onClick={() => setActiveDrawer(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal && selectedWallet && createPortal(
        <div className="modal-backdrop-overlay" onClick={() => setConfirmDeleteModal(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="dialog-close-x" role="button" onClick={() => setConfirmDeleteModal(false)}>✕</span>
            <div className="delete-icon-wrapper">
              <div className="delete-trash-circle">⚠️</div>
            </div>
            <h3>Are you sure you want to delete this wallet?</h3>
            <p className="delete-subtext">This action cannot be undone. All wallet data and transaction history will be permanently removed.</p>
            <div className="delete-rule-brief" style={{ marginBottom: '16px' }}>
              <div className="brief-row">
                <span className="brief-lbl">Company Name:</span>
                <span className="brief-val">{selectedWallet.companyName}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">B2B ID:</span>
                <span className="brief-val">{selectedWallet.b2bId}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Email:</span>
                <span className="brief-val">{selectedWallet.email}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Wallet Balance:</span>
                <span className="brief-val">₹ {(selectedWallet.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="brief-row">
                <span className="brief-lbl">Status:</span>
                <span className="brief-val">{selectedWallet.status}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-drawer-cancel" onClick={() => setConfirmDeleteModal(false)}>Cancel</button>
              <button className="btn-drawer-save" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeleteWallet}>
                Delete Wallet
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
