/* eslint-disable */
import React, { useState } from "react";
import Header from "../../components/tables/DepositeHeader";
import DepositTable from "../../components/tables/DepositeTable";
import "../../STYLES/deposite.css";

const STORAGE_KEY = "my_deposit_request_data";
const DEFAULT_DEPOSIT_DATA = [
  {
    id: 1,
    entryDate: "2026-01-10",
    transactionDate: "2026-01-10",
    amount: "5000",
    type: "UPI Transfer",
    status: "Approved",
    userRemark: "Payment done",
    adminRemark: "Verified",
  },
  {
    id: 2,
    entryDate: "2026-01-15",
    transactionDate: "2026-01-15",
    amount: "12000",
    type: "Bank Transfer",
    status: "Pending",
    userRemark: "Waiting approval",
    adminRemark: "-",
  },
];

const DepositRequestList = () => {
  const [depositData, setDepositData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_DEPOSIT_DATA;
    } catch {
      return DEFAULT_DEPOSIT_DATA;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(depositData));
    } catch {
      // Ignore storage failures.
    }
  }, [depositData]);

  React.useEffect(() => {
    const syncDeposits = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : DEFAULT_DEPOSIT_DATA;
        setDepositData(Array.isArray(parsed) ? parsed : DEFAULT_DEPOSIT_DATA);
      } catch {
        setDepositData(DEFAULT_DEPOSIT_DATA);
      }
    };

    window.addEventListener("focus", syncDeposits);
    window.addEventListener("storage", syncDeposits);

    return () => {
      window.removeEventListener("focus", syncDeposits);
      window.removeEventListener("storage", syncDeposits);
    };
  }, []);

  return (
    <div className="deposit-container">
      <Header />
      <DepositTable data={depositData} onDelete={(id) => setDepositData(depositData.filter(i => i.id !== id))} onUpdateRow={(id, row) => setDepositData(depositData.map(i => i.id === id ? row : i))} />
    </div>
  );
};

export default DepositRequestList;
