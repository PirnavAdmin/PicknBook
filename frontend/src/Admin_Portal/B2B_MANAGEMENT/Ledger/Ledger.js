import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'All'; // All, Credit, Debit, Balance

  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const activeList = await b2bAdminService.getAgents('Active');
      setAgents(Array.isArray(activeList) ? activeList : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedAgentId) {
        setLedgerEntries([]);
        return;
      }
      try {
        const data = await b2bAdminService.getAgentLedger(selectedAgentId);
        const entries = Array.isArray(data) ? data : [];
        const dateFiltered = entries.filter(e => {
          const txDate = e.createdAtUtc ? e.createdAtUtc.split('T')[0] : '';
          if (startDate && txDate < startDate) return false;
          if (endDate && txDate > endDate) return false;
          
          if (typeParam === 'Credit' && Number(e.creditAmount) <= 0) return false;
          if (typeParam === 'Debit' && Number(e.debitAmount) <= 0) return false;

          return true;
        });
        setLedgerEntries(dateFiltered);
      } catch (err) {
        console.error("Failed to load ledger history:", err);
      }
    };
    fetchLedger();
  }, [selectedAgentId, startDate, endDate, typeParam]);

  const handlePrint = () => {
    window.print();
  };

  const selectedAgentObj = agents.find(a => String(a.id) === String(selectedAgentId));

  return (
    <div className="b2b-container">
      <div className="b2b-header-row no-print">
        <div>
          <h1 className="b2b-title">Agent Ledger Accounts</h1>
          <p className="b2b-subtitle">Generate statements of accounts, running credit/debit records, and download reports.</p>
        </div>
        {selectedAgentId && (
          <button className="b2b-btn b2b-btn-secondary" onClick={handlePrint}>
            🖨️ Print Ledger Statement
          </button>
        )}
      </div>

      <div className="b2b-card no-print">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Filter Ledger Parameters</h3>
        <div className="b2b-form-grid">
          <div className="b2b-form-group">
            <label className="b2b-label">Select Travel Agent Agency *</label>
            <select 
              className="b2b-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <option value="">-- Choose Agent Agency --</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.companyName} (ID: {a.id})</option>
              ))}
            </select>
          </div>
          <div className="b2b-form-group">
            <label className="b2b-label">Start Date</label>
            <input 
              type="date" 
              className="b2b-input" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="b2b-form-group">
            <label className="b2b-label">End Date</label>
            <input 
              type="date" 
              className="b2b-input" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="b2b-form-group">
            <label className="b2b-label">Filtered Transaction Type</label>
            <select 
              className="b2b-select" 
              value={typeParam}
              onChange={(e) => setSearchParams({ type: e.target.value })}
            >
              <option value="All">All Transactions</option>
              <option value="Credit">Credits Only</option>
              <option value="Debit">Debits Only</option>
              <option value="Balance">Closing Balances</option>
            </select>
          </div>
        </div>
      </div>

      {selectedAgentId ? (
        <div className="b2b-card printable-ledger" style={{ border: '1px solid var(--b2b-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '2px solid var(--b2b-primary)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', color: 'var(--b2b-primary)' }}>Pick N Book B2B Ledger Account</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--b2b-muted)' }}>Corporate Account Statement</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: '0 0 4px' }}>{selectedAgentObj?.companyName}</h3>
              <p style={{ margin: '0 0 2px', fontSize: '0.85rem' }}>Agent ID: {selectedAgentObj?.id}</p>
              <p style={{ margin: '0 0 2px', fontSize: '0.85rem' }}>Email: {selectedAgentObj?.email}</p>
              <p style={{ margin: '0 0 2px', fontSize: '0.85rem' }}>Phone: {selectedAgentObj?.phoneNumber}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem' }}>
            <div>
              <strong>Statement Period:</strong> {startDate || 'Creation'} to {endDate || 'Present'}
            </div>
            <div>
              <strong>Current Balance:</strong> <span style={{ color: 'var(--b2b-success)', fontWeight: 'bold' }}>₹{(selectedAgentObj?.walletBalance || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Description</th>
                  <th>Ref Reference</th>
                  <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Closing Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                  {ledgerEntries.length > 0 ? (
                    ledgerEntries.map(e => {
                      const isCredit = Number(e.creditAmount) > 0;
                      const isDebit = Number(e.debitAmount) > 0;
                      const amount = isCredit ? e.creditAmount : e.debitAmount;
                      const formattedDate = e.createdAtUtc ? e.createdAtUtc.replace('T', ' ').slice(0, 16) : '';
                      return (
                        <tr key={e.id}>
                          <td>{formattedDate}</td>
                          <td style={{ fontWeight: '600' }}>{e.description}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>{e.referenceId}</td>
                          <td style={{ textAlign: 'right', color: 'var(--b2b-success)', fontWeight: isCredit ? 'bold' : 'normal' }}>
                            {isCredit ? `+₹${amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--b2b-danger)', fontWeight: isDebit ? 'bold' : 'normal' }}>
                            {isDebit ? `-₹${amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ₹{e.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                      No ledger transactions found in the chosen filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="b2b-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--b2b-muted)' }}>
          Please select a travel agent agency above to generate and inspect their statement of account ledger.
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-ledger, .printable-ledger * {
            visibility: visible;
          }
          .printable-ledger {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Ledger;
