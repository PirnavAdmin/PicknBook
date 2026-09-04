/* eslint-disable */
import React, { useState, useEffect } from "react";
import Header from "../../components/tables/DepositeHeader";
import DepositTable from "../../components/tables/DepositeTable";
import { getDepositRequests } from "../../services/depositService";
import "../../STYLES/deposite.css";

const STORAGE_KEY = "my_deposit_request_data";
const DEFAULT_DEPOSIT_DATA = [
  {
    id: 1,
    entryDate: "2026-02-28",
    transactionDate: "2026-02-28",
    amount: "15000",
    type: "UPI Transfer",
    status: "Approved",
    userRemark: "Wallet Top-up via GPay",
    adminRemark: "Verified & Credited",
  },
  {
    id: 2,
    entryDate: "2026-02-20",
    transactionDate: "2026-02-20",
    amount: "8500",
    type: "Bank Transfer",
    status: "Approved",
    userRemark: "Direct IMPS Deposit",
    adminRemark: "Auto Approved",
  },
  {
    id: 3,
    entryDate: "2026-02-14",
    transactionDate: "2026-02-14",
    amount: "12000",
    type: "Refund Credit",
    status: "Approved",
    userRemark: "Flight Cancellation Refund",
    adminRemark: "Refund Credit Approved",
  },
  {
    id: 4,
    entryDate: "2026-01-15",
    transactionDate: "2026-01-15",
    amount: "5000",
    type: "UPI Transfer",
    status: "Approved",
    userRemark: "Payment done",
    adminRemark: "Verified",
  },
  {
    id: 5,
    entryDate: "2026-03-01",
    transactionDate: "2026-03-01",
    amount: "25000",
    type: "Bank Transfer",
    status: "Pending",
    userRemark: "NEFT Transfer Request",
    adminRemark: "Under Verification",
  },
];

const DepositRequestList = () => {
  const [depositData, setDepositData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEPOSIT_DATA;
    } catch {
      return DEFAULT_DEPOSIT_DATA;
    }
  });

  useEffect(() => {
    let isMounted = true;
    const loadFromApi = async () => {
      try {
        const response = await getDepositRequests();
        const records = Array.isArray(response) ? response : (response?.data || response?.deposits || []);
        if (isMounted && records.length > 0) {
          const normalized = records.map((r, idx) => ({
            id: r.id || r._id || idx + 1,
            entryDate: r.entryDate || (r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : "2026-02-28"),
            transactionDate: r.transactionDate || r.trnsDate || (r.date ? new Date(r.date).toISOString().split('T')[0] : "2026-02-28"),
            amount: String(r.amount || 0),
            type: r.type || r.paymentMode || "UPI Transfer",
            status: r.status || "Approved",
            userRemark: r.userRemark || r.remark || "Wallet Top-up",
            adminRemark: r.adminRemark || r.approvalRemark || "Verified & Credited",
          }));
          setDepositData(normalized);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          } catch {}
        }
      } catch (err) {
        console.warn("Could not fetch deposit requests from API:", err);
      }
    };
    loadFromApi();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(depositData));
    } catch {
      // Ignore storage failures.
    }
  }, [depositData]);

  return (
    <div className="deposit-container">
      <Header />
      <DepositTable
        data={depositData}
        onDelete={(id) => setDepositData((prev) => prev.filter((i) => i.id !== id))}
        onUpdateRow={(id, row) => setDepositData((prev) => prev.map((i) => (i.id === id ? row : i)))}
      />
    </div>
  );
};

export default DepositRequestList;
