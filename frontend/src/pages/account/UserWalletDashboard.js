/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { WalletApi } from "../../services/walletService";
import { getAccountProfile } from "../../services/accountProfileService";
import { getPublicFeaturedOffers } from "../../services/adminFeaturedOffersService";
import "../../STYLES/deposite.css";

export default function UserWalletDashboard() {
  // Summary State
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState(""); // '' | 'Credit' | 'Debit' | 'Refund'
  const [txLoading, setTxLoading] = useState(true);

  // Deposit Requests State
  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(true);

  // Add Money Form State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState("BankTransfer");
  const [depositRemark, setDepositRemark] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 16));
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositFeedback, setDepositFeedback] = useState(null);

  // Global Error Feedback
  const [globalError, setGlobalError] = useState("");
  const [adminOffers, setAdminOffers] = useState([]);

  // 1. Fetch Summary & Profile (Live Backend Data)
  // Consolidated rate-limit safe refresh function
  const refreshAll = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial && (!summary || transactions.length === 0)) {
          setSummaryLoading(true);
          setTxLoading(true);
          setDepositsLoading(true);
        }

        const [summaryRes, profileRes, txRes, depRes, offersRes] = await Promise.allSettled([
          WalletApi.getSummary(),
          getAccountProfile(),
          WalletApi.getTransactions(page, pageSize, filterType),
          WalletApi.getDeposits(),
          getPublicFeaturedOffers(),
        ]);

        let summaryData = summary;
        if (summaryRes.status === "fulfilled" && summaryRes.value) {
          summaryData = summaryRes.value;
          setSummary(summaryData);
        }

        let profileData = profile;
        if (profileRes.status === "fulfilled" && profileRes.value) {
          profileData = profileRes.value;
          setProfile(profileData);
        }

        if (offersRes.status === "fulfilled" && Array.isArray(offersRes.value)) {
          setAdminOffers(offersRes.value);
        }

        let depositArray = [];
        if (depRes.status === "fulfilled" && depRes.value) {
          const depRaw = depRes.value;
          depositArray = Array.isArray(depRaw) ? depRaw : (depRaw.deposits || depRaw.items || depRaw.data || []);
          setDeposits(depositArray);
        }

        // Process Transactions List
        let list = [];
        if (txRes.status === "fulfilled" && txRes.value) {
          const raw = txRes.value;
          list =
            raw.transactions ||
            raw.items ||
            raw.data ||
            raw.deposits ||
            raw.history ||
            raw.records ||
            raw.ledger ||
            raw.results ||
            (Array.isArray(raw) ? raw : []);
        }

        // Include any transaction history or additions from summaryData
        const sumTx =
          summaryData?.transactions ||
          summaryData?.recentTransactions ||
          summaryData?.walletTransactions ||
          summaryData?.history ||
          summaryData?.additions ||
          summaryData?.payments ||
          summaryData?.deposits ||
          [];

        if (Array.isArray(sumTx) && sumTx.length > 0) {
          for (const sItem of sumTx) {
            const exists = list.some(
              (t) =>
                String(t.id || t.refCode || t.transactionId || t.depositId || "").toLowerCase() ===
                String(sItem.id || sItem.refCode || sItem.transactionId || sItem.depositId || "").toLowerCase()
            );
            if (!exists) {
              list.push(sItem);
            }
          }
        }

        // 1. Process Deposits / Admin Credits — normalize from backend schema
        const depositTxList = depositArray.map((d) => {
          const rawStatus = (d.status || "").toLowerCase();
          let normalizedStatus = "PENDING";
          if (rawStatus === "approved" || rawStatus === "success" || rawStatus === "completed") normalizedStatus = "SUCCESS";
          else if (rawStatus === "rejected" || rawStatus === "failed" || rawStatus === "declined") normalizedStatus = "FAILED";
          else if (rawStatus === "pending") normalizedStatus = "PENDING";

          return {
            id: d.id || d.depositId || d.transactionId,
            refCode:
              d.refCode ||
              d.referenceNumber ||
              d.transactionId ||
              d.depositId ||
              (d.id ? `DEP-${d.id}` : null),
            createdAt: d.createdAt || d.createdOn || d.transactionDate || d.date,
            transactionType: "Credit",
            type: "Credit",
            description:
              d.adminRemark ||
              d.remark ||
              d.userRemark ||
              d.description ||
              d.note ||
              "Admin Wallet Deposit Credit",
            amount: Number(d.amount || 0),
            runningBalance: d.runningBalance ?? d.balanceAfter ?? null,
            status: normalizedStatus,
          };
        });

        // 2. Process User Cancellation Refunds
        let cancellationTxList = [];
        const userCancels = summaryData?.cancellations || summaryData?.refunds || summaryData?.bookingCancellations || [];
        if (Array.isArray(userCancels) && userCancels.length > 0) {
          cancellationTxList = userCancels.map((c) => ({
            id: c.id || c.cancellationId || `CNC-${c.id}`,
            refCode: c.refCode || c.pnr || c.bookingId || `REFUND-${c.id}`,
            createdAt: c.createdAt || c.cancelledAt || new Date().toISOString(),
            transactionType: "Refund",
            type: "Refund",
            description: c.reason ? `Cancellation Refund: ${c.reason}` : "User Booking Cancellation Refund",
            amount: Number(c.refundAmount || c.amount || 0),
            runningBalance: c.runningBalance ?? c.balanceAfter,
            status: c.status || "SUCCESS",
          }));
        }

        // Merge transactions, deposits, and cancellations
        let merged = [...list];
        for (const depTx of depositTxList) {
          const exists = merged.some(
            (t) => String(t.id || t.refCode || "").toLowerCase() === String(depTx.id || depTx.refCode || "").toLowerCase()
          );
          if (!exists) {
            merged.push(depTx);
          }
        }

        for (const cancelTx of cancellationTxList) {
          const exists = merged.some(
            (t) => String(t.id || t.refCode || "").toLowerCase() === String(cancelTx.id || cancelTx.refCode || "").toLowerCase()
          );
          if (!exists) {
            merged.push(cancelTx);
          }
        }


        // Sort merged list newest-first
        merged.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateB - dateA;
        });

        // --- BALANCE-DERIVED FALLBACK ---
        // If the backend summary confirms a real positive balance but returned NO transaction records,
        // show a single derived entry so the user knows where their balance came from.
        const resolvedBalance =
          summaryData?.availableBalance ??
          summaryData?.walletBalance ??
          summaryData?.balance ??
          profileData?.walletBalance ??
          profileData?.availableBalance ??
          0;
        const currentBal = Number(resolvedBalance) || 0;

        if (merged.length === 0 && currentBal > 0) {
          // Prefer any explicit credit timestamp or reference from summary
          const creditRef =
            summaryData?.lastCreditRef ||
            summaryData?.referenceNumber ||
            summaryData?.transactionId ||
            summaryData?.walletId ||
            summaryData?.id;

          const creditDate =
            summaryData?.lastCreditAt ||
            summaryData?.lastTransactionAt ||
            summaryData?.updatedAt ||
            summaryData?.createdAt ||
            profileData?.updatedAt ||
            profileData?.createdAt;

          const creditNote =
            summaryData?.lastCreditNote ||
            summaryData?.remark ||
            summaryData?.description ||
            "Admin Wallet Credit";

          merged.push({
            id: creditRef || `BAL-CREDIT-${currentBal}`,
            refCode: creditRef || `WLT-ADD-${Math.round(currentBal)}`,
            createdAt: creditDate || null,
            transactionType: "Credit",
            type: "Credit",
            description: creditNote,
            amount: currentBal,
            runningBalance: currentBal,
            status: "SUCCESS",
            _derived: true, // internal marker (not displayed)
          });
        }

        // Apply filter — strictly on real + derived-from-summary data
        let filteredList = merged;
        if (filterType) {
          const target = filterType.toLowerCase();
          filteredList = merged.filter((t) => {
            const tType = (t.transactionType || t.type || "").toLowerCase();
            if (target === "credit") return tType === "credit" || tType === "deposit";
            if (target === "debit") return tType === "debit";
            if (target === "refund") return tType === "refund";
            return true;
          });
        }

        setTransactions(filteredList);
        setTxTotal(filteredList.length);
      } catch (err) {
        console.error("Error loading wallet data:", err);
      } finally {
        setSummaryLoading(false);
        setTxLoading(false);
        setDepositsLoading(false);
      }
    },
    [page, pageSize, filterType]
  );

  // Initial Load & Rate-Limited Sync Polling
  useEffect(() => {
    refreshAll(true);

    const intervalId = setInterval(() => {
      refreshAll(false);
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAll]);

  // Submit Add Money / Deposit Request
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(depositAmount);
    if (!amountNum || amountNum <= 0) {
      setDepositFeedback({ type: "error", message: "Please enter a valid deposit amount." });
      return;
    }

    setDepositSubmitting(true);
    setDepositFeedback(null);

    try {
      const res = await WalletApi.submitDeposit({
        amount: amountNum,
        type: depositType,
        remark: depositRemark,
        transactionDate: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
      });

      setDepositFeedback({
        type: "success",
        message: res.message || "Deposit request submitted successfully! Awaiting Admin verification.",
      });

      setDepositAmount("");
      setDepositRemark("");

      // Refresh live backend data
      refreshAll();

      setTimeout(() => {
        setIsDepositModalOpen(false);
        setDepositFeedback(null);
      }, 2000);
    } catch (err) {
      setDepositFeedback({
        type: "error",
        message: err.message || "Failed to submit deposit request. Please try again.",
      });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleQuickAmount = (val) => {
    setDepositAmount(String(val));
  };

  // Resolve Live Balance (Summary API primary, Profile fallback)
  const rawBalance =
    summary?.availableBalance ??
    summary?.walletBalance ??
    summary?.balance ??
    profile?.walletBalance ??
    profile?.availableBalance ??
    0;
  const availableBalance = Number(rawBalance) || 0;
  const picknbookCoins = summary?.picknbookCoins ?? profile?.picknbookCoins ?? 0;
  const walletStatus = summary?.walletStatus ?? profile?.walletStatus ?? "Active";
  const isInactive = walletStatus !== "Active";
  const totalPages = Math.ceil(txTotal / pageSize) || 1;

  return (
    <div className="deposit-container">
      {/* Page Header */}
      <div className="deposit-header">
        <div>
          <h1 className="deposit-page-title" style={{ fontSize: "1.75rem", margin: "4px 0" }}>
            Wallet <span>Dashboard</span>
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            Manage your wallet balance, coins, and view complete transaction history.
          </p>
        </div>
      </div>

      {/* Global Error Notice */}
      {globalError && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecdd3",
            borderRadius: "8px",
            color: "#ff0000",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={18} />
          <span>{globalError}</span>
        </div>
      )}

      {/* Wallet Status Warning */}
      {isInactive && (
        <div
          style={{
            padding: "14px 18px",
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: "10px",
            color: "#8c6b00",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "600",
          }}
        >
          <AlertTriangle size={20} style={{ color: "#d48806" }} />
          <span>Wallet is inactive. Contact support.</span>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: Available Balance */}
        <div
          className="deposit-card"
          style={{
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--theme-border, #e2e8f0)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 600 }}>
              Available Balance
            </span>
            <div style={{ padding: "8px", background: "#fef2f2", borderRadius: "8px", color: "#ff0000" }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>
            {summaryLoading ? "₹..." : `₹${availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ marginTop: "8px", fontSize: "0.8rem", color: isInactive ? "#ff0000" : "#16a34a", fontWeight: 600 }}>
            ● Status: {walletStatus}
          </div>
        </div>

        {/* Card 2: Pick&Book Coins */}
        <div
          className="deposit-card"
          style={{
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--theme-border, #e2e8f0)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 600 }}>
              Pick&Book Coins
            </span>
            <div style={{ padding: "8px", background: "#fef3c7", borderRadius: "8px", color: "#d97706" }}>
              <Coins size={20} />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706" }}>
            {summaryLoading ? "..." : picknbookCoins}
          </div>
          <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
            Loyalty Rewards Earned
          </div>
        </div>
      </div>

      {/* Main Section Tabs / Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>

        {/* Ledger Transaction History Section */}
        <div className="deposit-table-card" style={{ borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Transaction History & Ledger</h3>
              <small style={{ color: "#64748b" }}>Filter by transaction type to review credits, debits, and refunds</small>
            </div>

            {/* Filter Buttons: [All] [Credits] [Debits] [Refunds] */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={filterType === "" ? "deposit-btn-primary" : "deposit-btn-secondary"}
                onClick={() => { setFilterType(""); setPage(1); }}
                style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "9999px" }}
              >
                All
              </button>
              <button
                type="button"
                className={filterType === "Credit" ? "deposit-btn-primary" : "deposit-btn-secondary"}
                onClick={() => { setFilterType("Credit"); setPage(1); }}
                style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "9999px" }}
              >
                Credits (+)
              </button>
              <button
                type="button"
                className={filterType === "Debit" ? "deposit-btn-primary" : "deposit-btn-secondary"}
                onClick={() => { setFilterType("Debit"); setPage(1); }}
                style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "9999px" }}
              >
                Debits (-)
              </button>
              <button
                type="button"
                className={filterType === "Refund" ? "deposit-btn-primary" : "deposit-btn-secondary"}
                onClick={() => { setFilterType("Refund"); setPage(1); }}
                style={{ padding: "6px 14px", fontSize: "0.85rem", borderRadius: "9999px" }}
              >
                Refunds (+)
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <style>{`
              .deposit-table thead, .deposit-table th, .deposit-table thead tr {
                background: #ff0000 !important;
                background-color: #ff0000 !important;
                background-image: none !important;
                color: #ffffff !important;
              }
            `}</style>
            <table className="deposit-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#ff0000", color: "#ffffff" }}>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left", background: "#ff0000" }}>ID / Ref Code</th>
                  <th style={{ padding: "12px", textAlign: "left", background: "#ff0000" }}>Date & Time</th>
                  <th style={{ padding: "12px", textAlign: "left", background: "#ff0000" }}>Type</th>
                  <th style={{ padding: "12px", textAlign: "left", background: "#ff0000" }}>Description</th>
                  <th style={{ padding: "12px", textAlign: "right", background: "#ff0000" }}>Amount</th>
                  <th style={{ padding: "12px", textAlign: "right", background: "#ff0000" }}>Running Balance</th>
                  <th style={{ padding: "12px", textAlign: "center", background: "#ff0000" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      Loading transaction history...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      No transactions found for current filter.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.transactionType === "Credit" || tx.transactionType === "Refund" || tx.type === "Credit" || tx.type === "Refund";
                    const isRefund = tx.transactionType === "Refund" || tx.type === "Refund";
                    const amountVal = Number(tx.amount || 0);

                    return (
                      <tr key={tx.id || tx.transactionId || Math.random()} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px" }}>
                          <strong style={{ display: "block" }}>{tx.refCode || `TXN-${tx.id}`}</strong>
                          {tx.referenceType && <small style={{ color: "#64748b" }}>{tx.referenceType}</small>}
                        </td>
                        <td style={{ padding: "12px", fontSize: "0.88rem", color: "#334155" }}>
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString("en-IN")
                            : tx.date
                              ? new Date(tx.date).toLocaleString("en-IN")
                              : tx._derived
                                ? <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Admin Credited</span>
                                : "—"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: isRefund ? "#e0f2fe" : isCredit ? "#dcfce7" : "#fee2e2",
                              color: isRefund ? "#0369a1" : isCredit ? "#15803d" : "#ff0000",
                            }}
                          >
                            {tx.transactionType || tx.type || "Credit"}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontSize: "0.9rem", color: "#1e293b" }}>
                          {tx.description || tx.remark || tx.userRemark || "Wallet Transaction"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: isCredit ? "#16a34a" : "#ff0000" }}>
                          {isCredit ? "+" : "-"} ₹{amountVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: "#334155" }}>
                          {tx.runningBalance !== undefined && tx.runningBalance !== null
                            ? `₹${Number(tx.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: (tx.status || "SUCCESS") === "SUCCESS" ? "#dcfce7" : "#fef3c7",
                              color: (tx.status || "SUCCESS") === "SUCCESS" ? "#16a34a" : "#d97706",
                            }}
                          >
                            {tx.status || "SUCCESS"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
