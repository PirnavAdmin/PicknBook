import React, { useState, useEffect } from "react";
import {
  getWalletSummary,
  getWalletTransactions,
  getWalletDeposits,
  submitWalletDeposit
} from "../../services/walletService";
import "../../STYLES/WalletPage.css";

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // Add Money Form State
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState("NEFT");
  const [depositRemark, setDepositRemark] = useState("");
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await getWalletSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch wallet summary", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchTabContent = async () => {
    try {
      setLoadingData(true);
      if (activeTab === "transactions") {
        const res = await getWalletTransactions({ page: 1, pageSize: 50 });
        setTransactions(res.transactions || []);
      } else if (activeTab === "deposits") {
        const res = await getWalletDeposits();
        setDeposits(res || []);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab}`, err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTabContent();
  }, [activeTab]);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (Number(depositAmount) <= 0) return;
    
    setSubmittingDeposit(true);
    setDepositMessage("");
    try {
      await submitWalletDeposit({
        amount: Number(depositAmount),
        type: depositType,
        remark: depositRemark,
        transactionDate: new Date(depositDate).toISOString(),
      });
      setDepositMessage("Deposit request submitted successfully.");
      setDepositAmount("");
      setDepositRemark("");
      setShowAddMoney(false);
      if (activeTab === "deposits") {
        fetchTabContent();
      }
    } catch (err) {
      setDepositMessage("Failed to submit deposit. Please try again.");
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const renderSummaryCard = () => {
    if (loadingSummary) return <div className="wallet-card loading">Loading Wallet...</div>;
    if (!summary) return <div className="wallet-card error">Unable to load wallet data.</div>;

    return (
      <div className="wallet-summary-card">
        <div className="wallet-balance-section">
          <p className="wallet-label">Available Balance</p>
          <h2 className="wallet-balance">₹ {summary.availableBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
          <span className={`wallet-status ${summary.walletStatus?.toLowerCase()}`}>
            Status: {summary.walletStatus}
          </span>
        </div>
        <div className="wallet-coins-section">
          <p className="wallet-label">PickNBook Coins</p>
          <h2 className="wallet-coins">{summary.picknbookCoins}</h2>
          <span className="wallet-status">Loyalty Rewards</span>
        </div>
        <div className="wallet-actions">
          <button className="btn-add-money" onClick={() => setShowAddMoney(!showAddMoney)}>
            {showAddMoney ? "Close Add Money" : "Add Money"}
          </button>
        </div>
      </div>
    );
  };

  const renderAddMoneyForm = () => {
    if (!showAddMoney) return null;
    return (
      <div className="wallet-add-money-form">
        <h3>Add Money to Wallet</h3>
        {depositMessage && <div className="deposit-message">{depositMessage}</div>}
        <form onSubmit={handleAddMoney}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" required value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label>Transfer Type</label>
            <select value={depositType} onChange={e => setDepositType(e.target.value)}>
              <option value="NEFT">NEFT</option>
              <option value="IMPS">IMPS</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash Deposit</option>
            </select>
          </div>
          <div className="form-group">
            <label>Transaction Date</label>
            <input type="date" required value={depositDate} onChange={e => setDepositDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Remark / Reference No.</label>
            <input type="text" value={depositRemark} onChange={e => setDepositRemark(e.target.value)} placeholder="e.g. UTR Number" />
          </div>
          <button type="submit" disabled={submittingDeposit} className="btn-submit">
            {submittingDeposit ? "Submitting..." : "Submit Deposit Request"}
          </button>
        </form>
      </div>
    );
  };

  const renderTransactions = () => {
    if (loadingData) return <div className="data-loading">Loading transactions...</div>;
    if (transactions.length === 0) return <div className="data-empty">No transactions found.</div>;

    return (
      <table className="wallet-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Running Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
              <td>{t.transactionType}</td>
              <td>{t.refCode || t.referenceType}</td>
              <td>{t.description}</td>
              <td className={t.transactionType === "Credit" ? "text-success" : "text-danger"}>
                {t.transactionType === "Credit" ? "+" : "-"} ₹{t.amount.toLocaleString("en-IN")}
              </td>
              <td>₹{t.runningBalance.toLocaleString("en-IN")}</td>
              <td><span className={`status-badge ${t.status?.toLowerCase()}`}>{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderDeposits = () => {
    if (loadingData) return <div className="data-loading">Loading deposits...</div>;
    if (deposits.length === 0) return <div className="data-empty">No deposit requests found.</div>;

    return (
      <table className="wallet-table">
        <thead>
          <tr>
            <th>Entry Date</th>
            <th>Transaction Date</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Status</th>
            <th>User Remark</th>
            <th>Admin Remark</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map(d => (
            <tr key={d.id}>
              <td>{new Date(d.entryDate).toLocaleDateString("en-IN")}</td>
              <td>{d.transactionDate ? new Date(d.transactionDate).toLocaleDateString("en-IN") : "-"}</td>
              <td>₹{d.amount.toLocaleString("en-IN")}</td>
              <td>{d.type}</td>
              <td><span className={`status-badge ${d.status?.toLowerCase()}`}>{d.status}</span></td>
              <td>{d.userRemark || "-"}</td>
              <td>{d.adminRemark || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="wallet-page-container">
      <div className="wallet-header-section">
        <h1>Wallet Dashboard</h1>
        <p>Manage your wallet balance, coins, and view complete transaction history.</p>
      </div>

      {renderSummaryCard()}
      {renderAddMoneyForm()}

      <div className="wallet-tabs-section">
        <div className="wallet-tabs">
          <button className={activeTab === "transactions" ? "active" : ""} onClick={() => setActiveTab("transactions")}>Transactions</button>
          <button className={activeTab === "deposits" ? "active" : ""} onClick={() => setActiveTab("deposits")}>Deposits</button>
          <button className={activeTab === "coins" ? "active" : ""} onClick={() => setActiveTab("coins")}>Coins</button>
        </div>
        
        <div className="wallet-tab-content">
          {activeTab === "transactions" && renderTransactions()}
          {activeTab === "deposits" && renderDeposits()}
          {activeTab === "coins" && <div className="data-empty">Coin history is currently unavailable.</div>}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
