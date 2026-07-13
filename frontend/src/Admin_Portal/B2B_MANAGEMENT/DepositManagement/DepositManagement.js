import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function DepositManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || 'Pending'; // Pending, Approved, Rejected, All

  const [deposits, setDeposits] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Remarks composition
  const [adminRemarkVal, setAdminRemarkVal] = useState('');
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  useEffect(() => {
    if (statusParam === 'History' || statusParam === 'All') {
      setActiveTab('All');
    } else {
      setActiveTab(statusParam);
    }
  }, [statusParam]);

  useEffect(() => {
    loadDeposits();
  }, [activeTab, search]);

  useEffect(() => {
    if (selectedDeposit) {
      setAdminRemarkVal(selectedDeposit.adminRemark || '');
    }
  }, [selectedDeposit]);

  const loadDeposits = async () => {
    setIsLoading(true);
    try {
      const data = await b2bAdminService.getDeposits(activeTab, 'All', search);
      setDeposits(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load deposits:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to approve this deposit request?")) return;
    try {
      await b2bAdminService.approveDepositRequest(id);
      loadDeposits();
      setSelectedDeposit(null);
    } catch (err) {
      alert(err.message || "Failed to approve deposit.");
    }
  };

  const handleReject = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to reject this deposit request?")) return;
    try {
      await b2bAdminService.rejectDepositRequest(id);
      loadDeposits();
      setSelectedDeposit(null);
    } catch (err) {
      alert(err.message || "Failed to reject deposit.");
    }
  };

  const handleSaveRemark = async (e) => {
    e.preventDefault();
    if (!selectedDeposit || isSavingRemark) return;
    setIsSavingRemark(true);
    try {
      const res = await b2bAdminService.updateDepositRemark(selectedDeposit.id, adminRemarkVal);
      setSelectedDeposit(prev => prev ? { ...prev, adminRemark: adminRemarkVal } : null);
      alert(res.message || "Admin remark updated successfully.");
      loadDeposits();
    } catch (err) {
      alert(err.message || "Failed to save remark.");
    } finally {
      setIsSavingRemark(false);
    }
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">Deposit Management</h1>
          <p className="b2b-subtitle">Approve or reject B2B bank top-up requests submitted by agencies.</p>
        </div>
      </div>

      <div className="b2b-tabs">
        {[
          { label: 'Pending Reviews', val: 'Pending' },
          { label: 'Approved Top-ups', val: 'Approved' },
          { label: 'Rejected Slips', val: 'Rejected' },
          { label: 'All History', val: 'All' }
        ].map(tab => {
          const isTabActive = activeTab === tab.val;
          return (
            <button
              key={tab.val}
              className={`b2b-tab ${isTabActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.val);
                setSearchParams({ status: tab.val });
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="b2b-card">
        <div className="b2b-filter-bar">
          <div className="b2b-search">
            <span className="b2b-search-icon">🔍</span>
            <input 
              type="text" 
              className="b2b-input" 
              placeholder="Search by Agent name, User, or remarks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="b2b-table-wrap">
          <table className="b2b-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Agent User</th>
                <th>Mode / Type</th>
                <th>Amount Requested</th>
                <th>Remarks / Info</th>
                <th>Requested Date</th>
                <th>Processed Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--b2b-muted)' }}>
                    Fetching deposit requests from backend server...
                  </td>
                </tr>
              ) : deposits.length > 0 ? (
                deposits.map(d => (
                  <tr key={d.id} onClick={() => setSelectedDeposit(d)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 'bold', color: 'var(--b2b-primary)' }}>{d.id}</td>
                    <td>{d.user}</td>
                    <td>
                      <span className="b2b-badge b2b-badge-secondary">{d.type}</span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--b2b-primary)' }}>
                      ₹{(d.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.userRemark || '—'}
                    </td>
                    <td>{d.entryDate || '—'}</td>
                    <td>{d.transactionDate || '—'}</td>
                    <td>
                      <span className={`b2b-badge b2b-badge-${
                        d.status === 'Approved' ? 'success' :
                        d.status === 'Pending' ? 'warning' : 'danger'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      {d.status === 'Pending' ? (
                        <>
                          <button 
                            className="b2b-btn b2b-btn-primary"
                            onClick={(e) => handleApprove(d.id, e)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', marginRight: '6px' }}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="b2b-btn b2b-btn-danger"
                            onClick={(e) => handleReject(d.id, e)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            ✕ Reject
                          </button>
                        </>
                      ) : (
                        <button 
                          className="b2b-btn b2b-btn-secondary"
                          onClick={() => setSelectedDeposit(d)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          👁️ View / Remarks
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                    No deposit requests match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDeposit && (
        <div className="b2b-backdrop" onClick={() => setSelectedDeposit(null)}>
          <div className="b2b-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="b2b-modal-header">
              <h3 style={{ margin: 0 }}>Deposit Verification (Request ID: {selectedDeposit.id})</h3>
              <button className="b2b-modal-close" onClick={() => setSelectedDeposit(null)}>✕</button>
            </div>
            <div className="b2b-modal-body">
              <div className="b2b-detail-grid">
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Agent User Info</span>
                  <span className="b2b-detail-val">{selectedDeposit.user}</span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Deposit Amount</span>
                  <span className="b2b-detail-val" style={{ color: 'var(--b2b-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    ₹{(selectedDeposit.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Transfer Channel</span>
                  <span className="b2b-detail-val">{selectedDeposit.type}</span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Requested Date</span>
                  <span className="b2b-detail-val">{selectedDeposit.entryDate || '—'}</span>
                </div>
                <div className="b2b-detail-item b2b-detail-full">
                  <span className="b2b-detail-label">Agent Reference remarks</span>
                  <span className="b2b-detail-val" style={{ whiteSpace: 'pre-wrap' }}>{selectedDeposit.userRemark || '—'}</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--b2b-border)', margin: '16px 0' }} />

              {/* Review Remarks Submission */}
              <form onSubmit={handleSaveRemark}>
                <div className="b2b-form-group">
                  <label className="b2b-label">Admin Review Remarks (Section 3.3)</label>
                  <textarea 
                    className="b2b-input" 
                    rows="3" 
                    placeholder="e.g. Verified transaction ref. Clear funds received."
                    value={adminRemarkVal}
                    onChange={e => setAdminRemarkVal(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  ></textarea>
                </div>
                <button type="submit" className="b2b-btn b2b-btn-secondary" style={{ width: '100%' }} disabled={isSavingRemark}>
                  {isSavingRemark ? 'Saving remarks...' : 'Save Review Remarks'}
                </button>
              </form>
            </div>
            <div className="b2b-modal-footer" style={{ marginTop: '16px' }}>
              <button type="button" className="b2b-btn b2b-btn-secondary" onClick={() => setSelectedDeposit(null)}>Close</button>
              {selectedDeposit.status === 'Pending' && (
                <>
                  <button 
                    type="button" 
                    className="b2b-btn b2b-btn-danger" 
                    onClick={() => handleReject(selectedDeposit.id)}
                  >
                    Reject Slip
                  </button>
                  <button 
                    type="button" 
                    className="b2b-btn b2b-btn-primary" 
                    onClick={() => handleApprove(selectedDeposit.id)}
                  >
                    Approve & Load Wallet
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositManagement;
