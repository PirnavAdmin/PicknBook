/* eslint-disable */
import React, { useState, useEffect } from "react";
import "../../STYLES/AccountStatement.css";
import { getLedgerStatement } from "../../services/b2bService";

const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const ALL_TRANSACTIONS = [
  {
    id: 1,
    detail: "Bus Booking - Hyderabad to Vijayawada (Orange Tours)",
    bookingRef: "BUS123456",
    debit: 850,
    credit: 0,
    balance: -850,
    date: "2024-02-15",
    type: "Bus",
    status: "Confirmed",
  },
  {
    id: 2,
    detail: "Refund - Bus Cancellation (Mumbai to Pune)",
    bookingRef: "BUS987654",
    debit: 0,
    credit: 3500,
    balance: -5000,
    date: "2024-02-14",
    type: "Bus",
    status: "Completed",
  },
  {
    id: 3,
    detail: "Bus Booking - Bangalore to Mysore (Orange Tours)",
    bookingRef: "BUS456789",
    debit: 2800,
    credit: 0,
    balance: -7800,
    date: "2024-02-13",
    type: "Bus",
    status: "Confirmed",
  },
  {
    id: 4,
    detail: "Bus Booking - Bangalore to Chennai (SRS Travels)",
    bookingRef: "BUS654321",
    debit: 1250,
    credit: 0,
    balance: -9300,
    date: "2024-02-12",
    type: "Bus",
    status: "Confirmed",
  },
  {
    id: 5,
    detail: "Wallet Topup - Credit to Account",
    bookingRef: "WALLET001",
    debit: 0,
    credit: 25000,
    balance: 4700,
    date: "2024-02-11",
    type: "Wallet",
    status: "Completed",
  },
  {
    id: 6,
    detail: "Bus Booking - Mumbai to Bangalore (VRL Travels)",
    bookingRef: "BUS111111",
    debit: 1600,
    credit: 0,
    balance: 3100,
    date: "2024-02-10",
    type: "Bus",
    status: "Confirmed",
  },
  {
    id: 7,
    detail: "Bus Booking - Delhi to Jaipur (Shree Travels)",
    bookingRef: "BUS222222",
    debit: 1200,
    credit: 0,
    balance: -2700,
    date: "2024-02-09",
    type: "Bus",
    status: "Confirmed",
  },
  {
    id: 8,
    detail: "Partial Refund - Bus Modification Charge",
    bookingRef: "BUS654322",
    debit: 500,
    credit: 0,
    balance: -3200,
    date: "2024-02-08",
    type: "Bus",
    status: "Completed",
  },
];

function formatCurrency(value) {
  return `Rs ${Math.abs(value).toLocaleString("en-IN")}`;
}

const getB2BTransactions = () => {
  const saved = localStorage.getItem("b2b_ledger_transactions");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return ALL_TRANSACTIONS;
    }
  }
  localStorage.setItem("b2b_ledger_transactions", JSON.stringify(ALL_TRANSACTIONS));
  return ALL_TRANSACTIONS;
};

const AccountStatement = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState("Mini Statement");
  const [filterData, setFilterData] = useState({ year: "2026", month: "Feb" });
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadLedger = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await getLedgerStatement();
      if (Array.isArray(data)) {
        // Sort newest first
        const sorted = data.sort((a, b) => {
          const dateA = new Date(a.createdAtUtc || a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAtUtc || b.createdAt || b.date || 0).getTime();
          if (dateA !== dateB) return dateB - dateA;
          return (b.id || 0) - (a.id || 0);
        });
        setAllTransactions(sorted);
        setTransactions(sorted);
      } else {
        setAllTransactions([]);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error loading live B2B ledger statement:", err);
      setErrorMsg("Failed to load live ledger data from the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilterData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSearch = () => {
    let filtered = [...allTransactions];

    if (filterType === "Mini Statement") {
      filtered = filtered.slice(0, 5);
    } else if (filterType === "Yearly") {
      const year = Number.parseInt(filterData.year, 10);
      filtered = filtered.filter((item) => new Date(item.createdAtUtc || item.createdAt || item.date).getFullYear() === year);
    } else if (filterType === "Monthly") {
      const year = Number.parseInt(filterData.year, 10);
      const month = MONTH_MAP[filterData.month];
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.createdAtUtc || item.createdAt || item.date);
        return itemDate.getFullYear() === year && itemDate.getMonth() === month;
      });
    }

    setTransactions(filtered);
  };

  const handleClearFilter = () => {
    setTransactions(allTransactions);
    setFilterData({ year: "2026", month: "Feb" });
    setFilterType("Mini Statement");
    setIsFilterOpen(false);
  };

  return (
    <section className="account-statement-page">
      <header className="statement-header">
        <div>
          <h2>Account Statement</h2>
          <p>Track booking debits, refunds, and wallet movement in one ledger view.</p>
        </div>
        <div className="statement-header-actions">
          <button
            className="statement-btn secondary"
            type="button"
            onClick={() => setIsFilterOpen((previous) => !previous)}
          >
            Filter
          </button>
          <button className="statement-btn ghost" type="button" onClick={handleClearFilter}>
            Clear Filter
          </button>
        </div>
      </header>

      {isFilterOpen && (
        <div className="statement-filter-card">
          <h3>Search Filter</h3>

          <div className="statement-filter-grid">
            <label>
              <span>Select Filter Type</span>
              <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="Mini Statement">Mini Statement</option>
                <option value="Yearly">Yearly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </label>

            {filterType !== "Mini Statement" && (
              <label>
                <span>Year</span>
                <select name="year" value={filterData.year} onChange={handleFilterChange}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </label>
            )}

            {filterType === "Monthly" && (
              <label>
                <span>Month</span>
                <select name="month" value={filterData.month} onChange={handleFilterChange}>
                  {Object.keys(MONTH_MAP).map((month) => (
                    <option value={month} key={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="statement-filter-actions">
            <button className="statement-btn primary" type="button" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>
      )}

      <div className="statement-table-wrap">
        <div className="statement-table-scroll">
          <table className="statement-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Detail</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="statement-empty">
                    Loading ledger data...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="6" className="statement-empty statement-debit">
                    {errorMsg}
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((transaction, index) => {
                  const displayBalance = transaction.runningBalance !== undefined ? transaction.runningBalance : transaction.balance;
                  const displayDate = transaction.createdAtUtc || transaction.createdAt || transaction.date;
                  return (
                    <tr key={transaction.id || index}>
                      <td className="statement-serial">{index + 1}</td>
                      <td>
                        <strong>{transaction.detail || transaction.description || "Booking"}</strong>
                        <small>{transaction.bookingRef || transaction.reference}</small>
                      </td>
                      <td className={transaction.debit > 0 ? "statement-debit" : "statement-muted"}>
                        {transaction.debit > 0 ? formatCurrency(transaction.debit) : "-"}
                      </td>
                      <td className={transaction.credit > 0 ? "statement-credit" : "statement-muted"}>
                        {transaction.credit > 0 ? formatCurrency(transaction.credit) : "-"}
                      </td>
                      <td className={displayBalance < 0 ? "statement-debit" : "statement-credit"}>
                        {formatCurrency(displayBalance)}
                      </td>
                      <td>{displayDate ? new Date(displayDate).toLocaleDateString("en-IN") : "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="statement-empty">
                    No Results Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AccountStatement;
