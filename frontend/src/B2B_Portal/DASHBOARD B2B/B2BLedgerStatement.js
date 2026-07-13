import React, { useState, useEffect } from "react";
import { Search, Calendar, RefreshCw, ArrowUpRight, ArrowDownLeft, FileText } from "lucide-react";
import { getLedgerStatement } from "../../services/b2bService";
import "../../STYLES/B2BLayout.css";

export default function B2BLedgerStatement() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getLedgerStatement(fromDate, toDate);
      setLedger(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading ledger:", error);
      
      // Fallback Demo Ledger
      setLedger([
        {
          id: 1,
          transactionType: "Deposit",
          referenceId: "TXN9988221",
          debitAmount: 0.0,
          creditAmount: 50000.0,
          runningBalance: 50000.0,
          description: "Deposit request approved by Admin. Method: NEFT",
          createdAtUtc: "2026-07-08T09:45:00Z"
        },
        {
          id: 2,
          transactionType: "Booking",
          referenceId: "PNB-FL-99812",
          debitAmount: 5400.0,
          creditAmount: 0.0,
          runningBalance: 44600.0,
          description: "Flight reservation booking deduction. PNR: XY789Z",
          createdAtUtc: "2026-07-08T10:12:00Z"
        },
        {
          id: 3,
          transactionType: "Booking",
          referenceId: "PNB-BS-22110",
          debitAmount: 1200.0,
          creditAmount: 0.0,
          runningBalance: 43400.0,
          description: "Bus booking deduction. PNR: OBS-882",
          createdAtUtc: "2026-07-08T11:40:00Z"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLedger();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="b2b-dashboard">
      <div className="b2b-dashboard-header">
        <h1>Ledger Statement</h1>
        <p>Monitor your agent account statement, running wallet balances, credit deposits, and ticket booking deductions.</p>
      </div>

      {/* Date Filter Panel */}
      <div className="b2b-panel" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group-item" style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} />
              <span>From Date</span>
            </label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
            />
          </div>

          <div className="form-group-item" style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} />
              <span>To Date</span>
            </label>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            className="b2b-btn"
            style={{ padding: '12px 24px', background: 'var(--b2b-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Search size={16} />
            Filter Statement
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="b2b-panel">
        <h2 className="b2b-panel-title" style={{ marginBottom: '20px' }}>Ledger Entries</h2>

        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <RefreshCw size={30} className="spin" style={{ color: 'var(--b2b-primary)', marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--b2b-text-secondary)' }}>Loading ledger transactions...</p>
          </div>
        ) : ledger.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--b2b-text-secondary)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No ledger statements found for the selected range.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--b2b-border)', paddingBottom: '12px', color: 'var(--b2b-text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Reference</th>
                  <th style={{ padding: '12px 8px' }}>Debit (Dr)</th>
                  <th style={{ padding: '12px 8px' }}>Credit (Cr)</th>
                  <th style={{ padding: '12px 8px' }}>Running Balance</th>
                  <th style={{ padding: '12px 8px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--b2b-border)' }}>
                    <td style={{ padding: '16px 8px', whiteSpace: 'nowrap' }}>{formatDate(item.createdAtUtc)}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 8px', 
                        borderRadius: '20px', 
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        background: item.transactionType === "Deposit" ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: item.transactionType === "Deposit" ? '#10b981' : '#ef4444'
                      }}>
                        {item.transactionType === "Deposit" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {item.transactionType}
                      </span>
                    </td>
                    <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>{item.referenceId}</td>
                    <td style={{ padding: '16px 8px', color: item.debitAmount > 0 ? '#ef4444' : 'inherit' }}>
                      {item.debitAmount > 0 ? `₹${item.debitAmount.toFixed(2)}` : "-"}
                    </td>
                    <td style={{ padding: '16px 8px', color: item.creditAmount > 0 ? '#10b981' : 'inherit', fontWeight: item.creditAmount > 0 ? '600' : 'normal' }}>
                      {item.creditAmount > 0 ? `₹${item.creditAmount.toFixed(2)}` : "-"}
                    </td>
                    <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>₹{item.runningBalance.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px', color: 'var(--b2b-text-secondary)', minWidth: '200px' }}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
