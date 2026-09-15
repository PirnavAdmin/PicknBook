/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Scale,
  FileText,
  CreditCard,
  Settings,
  Save,
  CheckCircle2,
  ShieldCheck,
  Zap,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import './paymentSettings.css';

import Reconciliation from '../../ACCOUNT_MANAGEMENT/Reconciliation/Reconciliation';
import TransactionLog from '../../ACCOUNT_MANAGEMENT/TransactionLog/TransactionLog';
import WalletTransactionList from '../WalletTransaction/WalletTransactionList';
import AdminPaymentsList from '../../PAYMENTS ADMIN/AdminPaymentsList';

function PaymentSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'wallet-settings';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saveNotification, setSaveNotification] = useState(false);

  // Sync tab with search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Wallet Settings State
  const [walletSettings, setWalletSettings] = useState({
    minDepositAmount: 500,
    maxDepositAmount: 500000,
    minBalanceAlert: 1000,
    autoRefundToWallet: true,
    allowNegativeBalance: false,
    maxNegativeLimit: 0,
    cashfreeWalletEnabled: true,
    razorpayWalletEnabled: true,
    dailyTopupLimit: 200000,
    cashbackPercentage: 2,
    serviceTaxPercent: 18,
  });

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  };

  return (
    <div className="ps-container">
      {/* Header */}
      <div className="ps-header">
        <p className="ps-kicker">Payment & Wallet Management</p>
        <h1 className="ps-title">Wallet & Payment Settings</h1>
        <p className="ps-subtitle">Configure system wallet parameters, reconciliation, transaction audit logs, and gateway integrations.</p>
      </div>

      {/* Tabs Bar */}
      <div className="ps-tabs-bar">
        <button
          className={`ps-tab-btn ${activeTab === 'wallet-settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('wallet-settings')}
        >
          <Settings size={16} /> Wallet Settings
        </button>

        <button
          className={`ps-tab-btn ${activeTab === 'wallet-transactions' ? 'active' : ''}`}
          onClick={() => handleTabChange('wallet-transactions')}
        >
          <Wallet size={16} /> Wallet Transactions
        </button>

        <button
          className={`ps-tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => handleTabChange('reconciliation')}
        >
          <Scale size={16} /> Reconciliation
        </button>

        <button
          className={`ps-tab-btn ${activeTab === 'transaction-log' ? 'active' : ''}`}
          onClick={() => handleTabChange('transaction-log')}
        >
          <FileText size={16} /> Transaction Log
        </button>

        <button
          className={`ps-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => handleTabChange('payments')}
        >
          <CreditCard size={16} /> Payments / Failed
        </button>
      </div>

      {/* Notification Toast */}
      {saveNotification && (
        <div style={{
          background: '#dcfce7',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #bbf7d0',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem'
        }}>
          <CheckCircle2 size={18} /> Payment & Wallet Settings saved successfully!
        </div>
      )}

      {/* TAB CONTENT 1: WALLET SETTINGS */}
      {activeTab === 'wallet-settings' && (
        <form onSubmit={handleSaveSettings}>
          {/* General Limits */}
          <div className="ps-card">
            <h3 className="ps-card-title">Wallet Deposit & Balance Limits</h3>
            <p className="ps-card-desc">Set minimum deposit amounts, daily limits, and alert thresholds for user wallets.</p>

            <div className="ps-grid-2">
              <div className="ps-form-group">
                <label className="ps-label">Minimum Wallet Top-up (₹)</label>
                <input
                  type="number"
                  className="ps-input"
                  value={walletSettings.minDepositAmount}
                  onChange={(e) => setWalletSettings({ ...walletSettings, minDepositAmount: Number(e.target.value) })}
                />
              </div>

              <div className="ps-form-group">
                <label className="ps-label">Maximum Single Top-up (₹)</label>
                <input
                  type="number"
                  className="ps-input"
                  value={walletSettings.maxDepositAmount}
                  onChange={(e) => setWalletSettings({ ...walletSettings, maxDepositAmount: Number(e.target.value) })}
                />
              </div>

              <div className="ps-form-group">
                <label className="ps-label">Low Balance Warning Alert (₹)</label>
                <input
                  type="number"
                  className="ps-input"
                  value={walletSettings.minBalanceAlert}
                  onChange={(e) => setWalletSettings({ ...walletSettings, minBalanceAlert: Number(e.target.value) })}
                />
              </div>

              <div className="ps-form-group">
                <label className="ps-label">Daily Top-up Limit per User (₹)</label>
                <input
                  type="number"
                  className="ps-input"
                  value={walletSettings.dailyTopupLimit}
                  onChange={(e) => setWalletSettings({ ...walletSettings, dailyTopupLimit: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Refund & Overdraft Rules */}
          <div className="ps-card">
            <h3 className="ps-card-title">Automated Refund & Overdraft Controls</h3>
            <p className="ps-card-desc">Configure automated wallet refunds for cancelled bookings and negative balance rules.</p>

            <div className="ps-toggle-row">
              <div>
                <div className="ps-toggle-label">Auto-Refund Cancellation Amounts to Wallet</div>
                <div className="ps-toggle-sub">Instantly credit refund amounts to customer wallet upon booking cancellation.</div>
              </div>
              <label className="ps-switch">
                <input
                  type="checkbox"
                  checked={walletSettings.autoRefundToWallet}
                  onChange={(e) => setWalletSettings({ ...walletSettings, autoRefundToWallet: e.target.checked })}
                />
                <span className="ps-slider"></span>
              </label>
            </div>

            <div className="ps-toggle-row">
              <div>
                <div className="ps-toggle-label">Enable Cashfree Auto-Deposit Verification</div>
                <div className="ps-toggle-sub">Automatically credit wallet balance upon Cashfree webhook confirmation.</div>
              </div>
              <label className="ps-switch">
                <input
                  type="checkbox"
                  checked={walletSettings.cashfreeWalletEnabled}
                  onChange={(e) => setWalletSettings({ ...walletSettings, cashfreeWalletEnabled: e.target.checked })}
                />
                <span className="ps-slider"></span>
              </label>
            </div>

            <div className="ps-toggle-row">
              <div>
                <div className="ps-toggle-label">Enable Razorpay Wallet Top-ups</div>
                <div className="ps-toggle-sub">Allow users to top-up wallet using Razorpay PG gateway.</div>
              </div>
              <label className="ps-switch">
                <input
                  type="checkbox"
                  checked={walletSettings.razorpayWalletEnabled}
                  onChange={(e) => setWalletSettings({ ...walletSettings, razorpayWalletEnabled: e.target.checked })}
                />
                <span className="ps-slider"></span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="ps-btn-save">
              <Save size={16} /> Save Wallet Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT 2: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div style={{ marginTop: '10px' }}>
          <Reconciliation />
        </div>
      )}

      {/* TAB CONTENT 3: TRANSACTION LOG */}
      {activeTab === 'transaction-log' && (
        <div style={{ marginTop: '10px' }}>
          <TransactionLog />
        </div>
      )}

      {/* TAB CONTENT 4: WALLET TRANSACTIONS */}
      {activeTab === 'wallet-transactions' && (
        <div style={{ marginTop: '10px' }}>
          <WalletTransactionList />
        </div>
      )}

      {/* TAB CONTENT 5: PAYMENTS / FAILED */}
      {activeTab === 'payments' && (
        <div style={{ marginTop: '10px' }}>
          <AdminPaymentsList />
        </div>
      )}
    </div>
  );
}

export default PaymentSettings;
