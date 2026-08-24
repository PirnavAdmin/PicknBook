/* eslint-disable */
import React, { useMemo, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getNextNumericId, useAdminList } from "../../utils/adminPortalStorage";

// Seed states for local storage persistence
const DEFAULT_SITE_SETTINGS = {
  siteName: "Book My Route Admin",
  supportEmail: "support@bookmyroute.com",
  supportPhone: "+91 98765 43210",
  maintenanceMode: "false",
  defaultCurrency: "INR",
  googleMapsKey: "AIzaSyD_mockMapKey_2026",
  sendGridKey: "SG.mockSendgridKey.2026",
  registrationAllowed: "true",
};

const DEFAULT_IP_RULES = [
  { id: 1, ip: "103.88.22.41", type: "Blacklist", status: "Active", description: "Brute-force attempts detected", timestamp: "2026-05-28T09:12:00Z" },
  { id: 2, ip: "192.168.1.105", type: "Whitelist", status: "Active", description: "Office Gateway IP", timestamp: "2026-05-27T08:00:00Z" },
  { id: 3, ip: "82.165.23.11", type: "Blacklist", status: "Suspended", description: "Suspicious login trial", timestamp: "2026-05-26T14:35:00Z" }
];

const DEFAULT_TRANSACTIONS = [
  { id: "TXN-9842", ref: "BMR-FL-102", category: "Booking Revenue", type: "Credit", amount: 84500, status: "Settled", date: "2026-05-28T11:20:00Z" },
  { id: "TXN-9841", ref: "BMR-BS-441", category: "Booking Revenue", type: "Credit", amount: 12800, status: "Settled", date: "2026-05-28T10:15:00Z" },
  { id: "TXN-9840", ref: "TOP-10291", category: "Wallet Top-up", type: "Credit", amount: 50000, status: "Settled", date: "2026-05-28T08:00:00Z" },
  { id: "TXN-9839", ref: "PAY-GATE-9", category: "Gateway Payout", type: "Debit", amount: 35000, status: "Settled", date: "2026-05-27T19:30:00Z" },
  { id: "TXN-9838", ref: "AWS-SRV-MAY", category: "Server Cost", type: "Debit", amount: 12400, status: "Settled", date: "2026-05-27T15:10:00Z" },
  { id: "TXN-9837", ref: "REF-BMR-982", category: "Customer Refund", type: "Debit", amount: 6200, status: "Pending", date: "2026-05-26T12:05:00Z" }
];

function SectionPlaceholder({ title, description, kicker = "Admin Portal" }) {
  const location = useLocation();

  // Route/Title detection logic for specialized dashboards
  const normalizedPath = (location?.pathname || "").toLowerCase();
  const isSiteSettings = normalizedPath.includes("site-setting") || title === "Site Setting";
  const isIpManagement = normalizedPath.includes("black-list-ip") || normalizedPath.includes("white-list-ip") || title.includes("List IP");
  const isFinancial = normalizedPath.includes("transaction-log") || normalizedPath.includes("balance-sheet") || title === "Transaction Log" || title === "Balance Sheet";

  // Common notification Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // --- 1. SITE SETTINGS DASHBOARD STATE ---
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("admin-site-settings");
    return saved ? JSON.parse(saved) : DEFAULT_SITE_SETTINGS;
  });
  const [settingsTab, setSettingsTab] = useState("general");
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSaveSettings = () => {
    setSavingSettings(true);
    setTimeout(() => {
      localStorage.setItem("admin-site-settings", JSON.stringify(siteSettings));
      setSavingSettings(false);
      showToast("System configuration updated successfully!", "success");
    }, 600);
  };

  const handleClearSessions = () => {
    showToast("All active user sessions purged from registry.", "success");
  };

  // --- 2. SECURITY IP RULES STATE ---
  const [ipRules, setIpRules] = useState(() => {
    const saved = localStorage.getItem("admin-security-ip-rules");
    return saved ? JSON.parse(saved) : DEFAULT_IP_RULES;
  });
  const [ipSearch, setIpSearch] = useState("");
  const [ipFilter, setIpFilter] = useState("All");
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [newIpRule, setNewIpRule] = useState({ ip: "", type: "Blacklist", status: "Active", description: "" });
  const [ipError, setIpError] = useState("");

  const handleSaveIpRules = (newRules) => {
    setIpRules(newRules);
    localStorage.setItem("admin-security-ip-rules", JSON.stringify(newRules));
  };

  const handleAddIpRuleSubmit = () => {
    const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(newIpRule.ip.trim())) {
      setIpError("Please enter a valid IPv4 address (e.g. 192.168.1.100).");
      return;
    }
    const updated = [
      {
        id: Date.now(),
        ip: newIpRule.ip.trim(),
        type: newIpRule.type,
        status: newIpRule.status,
        description: newIpRule.description.trim() || "Manual security rule entry",
        timestamp: new Date().toISOString()
      },
      ...ipRules
    ];
    handleSaveIpRules(updated);
    showToast(`Security rule for IP ${newIpRule.ip} added successfully!`, "success");
    setNewIpRule({ ip: "", type: "Blacklist", status: "Active", description: "" });
    setIpError("");
    setShowAddIpModal(false);
  };

  const handleDeleteIpRule = (id, ip) => {
    const updated = ipRules.filter(r => r.id !== id);
    handleSaveIpRules(updated);
    showToast(`Security rule for IP ${ip} deleted.`, "success");
  };

  const handleToggleIpStatus = (id) => {
    const updated = ipRules.map(r => r.id === id ? { ...r, status: r.status === "Active" ? "Suspended" : "Active" } : r);
    handleSaveIpRules(updated);
    showToast("IP security state toggled.", "success");
  };

  // --- 3. FINANCIAL LEDGER STATE ---
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("admin-financial-ledger");
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("All");
  const [txnCategoryFilter, setTxnCategoryFilter] = useState("All");
  const [showAddTxnModal, setShowAddTxnModal] = useState(false);
  const [newTxn, setNewTxn] = useState({ ref: "", category: "Booking Revenue", type: "Credit", amount: "", status: "Settled" });
  const [txnError, setTxnError] = useState("");

  const handleSaveTransactions = (newTxns) => {
    setTransactions(newTxns);
    localStorage.setItem("admin-financial-ledger", JSON.stringify(newTxns));
  };

  const handleAddTxnSubmit = () => {
    const amountVal = parseFloat(newTxn.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setTxnError("Please enter a valid positive amount.");
      return;
    }
    const refCode = newTxn.ref.trim() || `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = [
      {
        id: `TXN-${Date.now().toString().slice(-4)}`,
        ref: refCode,
        category: newTxn.category,
        type: newTxn.type,
        amount: amountVal,
        status: newTxn.status,
        date: new Date().toISOString()
      },
      ...transactions
    ];
    handleSaveTransactions(updated);
    showToast(`Ledger transaction ${refCode} of ₹${amountVal.toLocaleString("en-IN")} recorded.`, "success");
    setNewTxn({ ref: "", category: "Booking Revenue", type: "Credit", amount: "", status: "Settled" });
    setTxnError("");
    setShowAddTxnModal(false);
  };

  const handleDeleteTransaction = (id, refCode) => {
    const updated = transactions.filter(t => t.id !== id);
    handleSaveTransactions(updated);
    showToast(`Transaction record ${refCode} deleted.`, "success");
  };

  // Financial dynamic totals calculations
  const { totalInflow, totalOutflow, netReserve } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    transactions.forEach(t => {
      if (t.type === "Credit") inflow += t.amount;
      else outflow += t.amount;
    });
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netReserve: inflow - outflow
    };
  }, [transactions]);

  // Filtered transactions computed array
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = String(t.ref + " " + t.category + " " + t.id).toLowerCase().includes(txnSearch.toLowerCase());
      const matchType = txnTypeFilter === "All" || t.type === txnTypeFilter;
      const matchCategory = txnCategoryFilter === "All" || t.category === txnCategoryFilter;
      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, txnSearch, txnTypeFilter, txnCategoryFilter]);

  // Filtered IP rules computed array
  const filteredIpRules = useMemo(() => {
    return ipRules.filter(r => {
      const matchSearch = r.ip.toLowerCase().includes(ipSearch.toLowerCase()) || r.description.toLowerCase().includes(ipSearch.toLowerCase());
      const matchType = ipFilter === "All" || r.type === ipFilter;
      return matchSearch && matchType;
    });
  }, [ipRules, ipSearch, ipFilter]);

  // --- 4. GENERIC PLACEHOLDER STATE (CRUD manager fallback) ---
  const storageKey = useMemo(() => {
    const slug = String(location?.pathname || title || "admin-module")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `placeholder-${slug}`;
  }, [location?.pathname, title]);

  const [items, setItems] = useAdminList(storageKey, []);
  const [formValues, setFormValues] = useState({ label: "", status: "active", note: "" });
  const [editItem, setEditItem] = useState(null);
  const [crudError, setCrudError] = useState("");

  const handleCrudAdd = () => {
    const label = String(formValues.label || "").trim();
    if (!label) {
      setCrudError("Title is required.");
      return;
    }
    setItems((prev) => [
      {
        id: getNextNumericId(prev),
        label,
        status: formValues.status === "inactive" ? "inactive" : "active",
        note: String(formValues.note || "").trim(),
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setFormValues({ label: "", status: "active", note: "" });
    setCrudError("");
    showToast("Entry added successfully!", "success");
  };

  const handleCrudDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast("Entry deleted.", "success");
  };

  const handleCrudEditSave = () => {
    if (!editItem) return;
    const label = String(editItem.label || "").trim();
    if (!label) {
      setCrudError("Title is required.");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === editItem.id
          ? {
              ...item,
              label,
              status: editItem.status === "inactive" ? "inactive" : "active",
              note: String(editItem.note || "").trim(),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setEditItem(null);
    setCrudError("");
    showToast("Entry updated successfully!", "success");
  };

  // --- RENDER ROUTING BY ROUTE CONTEXT ---

  // RENDER SITE SETTINGS DASHBOARD
  if (isSiteSettings) {
    return (
      <section className="admin-placeholder" style={{ maxWidth: "100%", width: "100%", margin: "0 auto 24px" }}>
        <p className="admin-placeholder-kicker">{kicker} • Configuration</p>
        <h1 className="admin-placeholder-title">⚙️ Site Configuration Panel</h1>
        <p className="admin-placeholder-subtitle">Adjust core portal endpoints, operations parameters, integrations, and global maintenance states.</p>

        {siteSettings.maintenanceMode === "true" && (
          <div style={{
            margin: "16px 0",
            padding: "12px 20px",
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "10px",
            color: "#b45309",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "pulse 2s infinite"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>SYSTEM NOTICE: Maintenance Mode is currently ACTIVE. Clients will be blocked from bookings.</span>
          </div>
        )}

        <div style={{ marginTop: "24px", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "20px" }}>
          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #edf2f7", marginBottom: "24px", paddingBottom: "12px" }}>
            {["general", "operations", "integrations"].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setSettingsTab(tab)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: settingsTab === tab ? "rgba(30, 117, 255, 0.08)" : "none",
                  color: settingsTab === tab ? "var(--primary)" : "var(--muted)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s ease"
                }}
              >
                {tab === "general" ? "General Info" : tab === "operations" ? "System Operations" : "APIs & Security"}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {settingsTab === "general" && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                WEBSITE BRAND NAME
                <input
                  type="text"
                  value={siteSettings.siteName}
                  onChange={e => setSiteSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                SUPPORT EMAIL ADDRESS
                <input
                  type="email"
                  value={siteSettings.supportEmail}
                  onChange={e => setSiteSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                SUPPORT HOTLINE NUMBER
                <input
                  type="text"
                  value={siteSettings.supportPhone}
                  onChange={e => setSiteSettings(prev => ({ ...prev, supportPhone: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                />
              </label>
            </div>
          )}

          {settingsTab === "operations" && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                PORTAL DEFAULT CURRENCY
                <select
                  value={siteSettings.defaultCurrency}
                  onChange={e => setSiteSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                MAINTENANCE HOLD MODE
                <select
                  value={siteSettings.maintenanceMode}
                  onChange={e => setSiteSettings(prev => ({ ...prev, maintenanceMode: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                >
                  <option value="false">Inactive (System Online)</option>
                  <option value="true">Active (System Offline holding page)</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                NEW USER REGISTRATIONS
                <select
                  value={siteSettings.registrationAllowed}
                  onChange={e => setSiteSettings(prev => ({ ...prev, registrationAllowed: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                >
                  <option value="true">Allowed & Enabled</option>
                  <option value="false">Blocked & Disabled</option>
                </select>
              </label>
            </div>
          )}

          {settingsTab === "integrations" && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                GOOGLE MAPS GEOLOCATION KEY
                <input
                  type="password"
                  value={siteSettings.googleMapsKey}
                  onChange={e => setSiteSettings(prev => ({ ...prev, googleMapsKey: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", letterSpacing: "2px" }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                SENDGRID EMAIL SMTP API KEY
                <input
                  type="password"
                  value={siteSettings.sendGridKey}
                  onChange={e => setSiteSettings(prev => ({ ...prev, sendGridKey: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", letterSpacing: "2px" }}
                />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleClearSessions}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "8px",
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Purge Active Sessions
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "28px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(30, 117, 255, 0.25)",
                transition: "all 0.2s ease"
              }}
            >
              {savingSettings ? (
                <>
                  <div style={{ border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", width: "14px", height: "14px", animation: "spin 0.6s linear infinite" }} />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save System Settings
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // RENDER SECURITY IP MANAGEMENT
  if (isIpManagement) {
    return (
      <section className="admin-placeholder" style={{ maxWidth: "100%", width: "100%", margin: "0 auto 24px" }}>
        <p className="admin-placeholder-kicker">{kicker} • Security Shield</p>
        <h1 className="admin-placeholder-title">🛡️ Security Access Rules (IP List)</h1>
        <p className="admin-placeholder-subtitle">Authorize whitelist corporate addresses and restrict blacklist malicious vectors to safeguard transaction servers.</p>

        {/* Access Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", margin: "20px 0" }}>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.08)", display: "grid", placeItems: "center", color: "#ef4444" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>BLACKLISTED ADDRS</div>
              <strong style={{ fontSize: "1.3rem", color: "#0f172a" }}>{ipRules.filter(r => r.type === "Blacklist").length} Nodes</strong>
            </div>
          </div>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(30, 117, 255, 0.08)", display: "grid", placeItems: "center", color: "#1e75ff" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>WHITELISTED TUNNELS</div>
              <strong style={{ fontSize: "1.3rem", color: "#0f172a" }}>{ipRules.filter(r => r.type === "Whitelist").length} Safe</strong>
            </div>
          </div>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", display: "grid", placeItems: "center", color: "#10b981" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>MITIGATION LEVEL</div>
              <strong style={{ fontSize: "1.3rem", color: "#10b981" }}>Peak Security</strong>
            </div>
          </div>
        </div>

        {/* Toolbar Filter Control */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center", margin: "20px 0", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "460px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Filter IP address or comment..."
                value={ipSearch}
                onChange={e => setIpSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
            </div>
            <select
              value={ipFilter}
              onChange={e => setIpFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", background: "#fff" }}
            >
              <option value="All">All Types</option>
              <option value="Blacklist">Blacklist Rules</option>
              <option value="Whitelist">Whitelist Rules</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddIpModal(true)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(30, 117, 255, 0.2)"
            }}
          >
            <span>+</span> Add Access Rule
          </button>
        </div>

        {/* Security Table Grid */}
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "12px", background: "#fff", overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.8fr 1.2fr 0.8fr",
            gap: "12px",
            padding: "12px 16px",
            background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.8rem",
            alignItems: "center"
          }}>
            <span>TARGET IP</span>
            <span>RULE TYPE</span>
            <span>STATUS</span>
            <span>DESCRIPTION NOTE</span>
            <span>CREATED DATE</span>
            <span style={{ textAlign: "right" }}>ACTIONS</span>
          </div>

          {filteredIpRules.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>No security policies match search critera.</div>
          ) : (
            filteredIpRules.map(rule => (
              <div key={rule.id} style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.8fr 1.2fr 0.8fr",
                gap: "12px",
                padding: "14px 16px",
                borderBottom: "1px solid #edf2f7",
                fontSize: "0.82rem",
                alignItems: "center",
                color: "#334155"
              }}>
                <strong style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#0f172a" }}>{rule.ip}</strong>
                <span>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: rule.type === "Blacklist" ? "#fee2e2" : "#e0f2fe",
                    color: rule.type === "Blacklist" ? "#991b1b" : "#0369a1"
                  }}>
                    {rule.type}
                  </span>
                </span>
                <span>
                  <button
                    type="button"
                    onClick={() => handleToggleIpStatus(rule.id)}
                    style={{
                      border: "none",
                      background: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: rule.status === "Active" ? "#d1fae5" : "#e2e8f0",
                      color: rule.status === "Active" ? "#065f46" : "#475569"
                    }}>
                      {rule.status} ⇄
                    </span>
                  </button>
                </span>
                <span style={{ color: "#475569" }}>{rule.description}</span>
                <span style={{ color: "#64748b" }}>{new Date(rule.timestamp).toLocaleString("en-IN")}</span>
                <span style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteIpRule(rule.id, rule.ip)}
                    style={{ background: "#fef2f2", border: "1px solid #fee2e2", padding: "4px 8px", borderRadius: "6px", color: "#b91c1c", cursor: "pointer" }}
                    title="Delete Rule"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        {/* Add Security Rule Modal overlay */}
        {showAddIpModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 }}>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "420px", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Add Security IP Rule</h3>
                <button type="button" onClick={() => setShowAddIpModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              </div>

              {ipError && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fde2e2", borderRadius: "8px", fontSize: "0.78rem", marginBottom: "14px", fontWeight: 600 }}>
                  ⚠️ {ipError}
                </div>
              )}

              <div style={{ display: "grid", gap: "14px" }}>
                <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  IP ADDRESS (IPv4)
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.55"
                    value={newIpRule.ip}
                    onChange={e => setNewIpRule(prev => ({ ...prev, ip: e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                    RULE TYPE
                    <select
                      value={newIpRule.type}
                      onChange={e => setNewIpRule(prev => ({ ...prev, type: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Blacklist">Blacklist</option>
                      <option value="Whitelist">Whitelist</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                    INITIAL STATUS
                    <select
                      value={newIpRule.status}
                      onChange={e => setNewIpRule(prev => ({ ...prev, status: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  DESCRIPTION COMMENTS
                  <input
                    type="text"
                    placeholder="Reason for whitelist/blacklist..."
                    value={newIpRule.description}
                    onChange={e => setNewIpRule(prev => ({ ...prev, description: e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                  />
                </label>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowAddIpModal(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button type="button" onClick={handleAddIpRuleSubmit} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, var(--primary), var(--primary-strong))", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Deploy Rule</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // RENDER FINANCIAL TRANSACTION LEDGER
  if (isFinancial) {
    return (
      <section className="admin-placeholder" style={{ maxWidth: "100%", width: "100%", margin: "0 auto 24px" }}>
        <p className="admin-placeholder-kicker">{kicker} • Operations Ledger</p>
        <h1 className="admin-placeholder-title">📊 Accounting & Cash Ledger Statement</h1>
        <p className="admin-placeholder-subtitle">Real-time ledger audit trail. Monitors client-side booking income flow and payout distribution schedules dynamically.</p>

        {/* Dynamic financial statistics cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", margin: "20px 0" }}>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", display: "grid", placeItems: "center", color: "#10b981" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>TOTAL INFLOW (CREDITS)</div>
              <strong style={{ fontSize: "1.3rem", color: "#10b981" }}>₹ {totalInflow.toLocaleString("en-IN")}</strong>
            </div>
          </div>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.08)", display: "grid", placeItems: "center", color: "#ef4444" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>TOTAL OUTFLOW (DEBITS)</div>
              <strong style={{ fontSize: "1.3rem", color: "#ef4444" }}>₹ {totalOutflow.toLocaleString("en-IN")}</strong>
            </div>
          </div>
          <div style={{ padding: "20px", borderRadius: "14px", border: "1px solid #eef2f6", background: "linear-gradient(135deg, #ffffff, #f8fafc)", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "rgba(30, 117, 255, 0.08)", display: "grid", placeItems: "center", color: "#1e75ff" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>NET LEDGER RESERVE</div>
              <strong style={{ fontSize: "1.3rem", color: "#1e75ff" }}>₹ {netReserve.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>

        {/* Toolbar Ledger Controls */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center", margin: "20px 0", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "560px" }}>
            <div style={{ position: "relative", flex: 1.5 }}>
              <input
                type="text"
                placeholder="Search Txn ID, reference, category..."
                value={txnSearch}
                onChange={e => setTxnSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
            </div>
            <select
              value={txnTypeFilter}
              onChange={e => setTxnTypeFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", background: "#fff" }}
            >
              <option value="All">All Types</option>
              <option value="Credit">Credits Only</option>
              <option value="Debit">Debits Only</option>
            </select>
            <select
              value={txnCategoryFilter}
              onChange={e => setTxnCategoryFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", background: "#fff" }}
            >
              <option value="All">All Categories</option>
              <option value="Booking Revenue">Booking Revenue</option>
              <option value="Wallet Top-up">Wallet Top-up</option>
              <option value="Gateway Payout">Gateway Payout</option>
              <option value="Server Cost">Server Cost</option>
              <option value="Customer Refund">Customer Refund</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddTxnModal(true)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(30, 117, 255, 0.2)"
            }}
          >
            <span>+</span> Log Transaction
          </button>
        </div>

        {/* Ledger Table Grid */}
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "12px", background: "#fff", overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr 1.5fr 1fr 1.2fr 1fr 0.8fr",
            gap: "12px",
            padding: "12px 16px",
            background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.8rem",
            alignItems: "center"
          }}>
            <span>TXN ID</span>
            <span>REFERENCE</span>
            <span>CATEGORY</span>
            <span>TYPE</span>
            <span>AMOUNT</span>
            <span>STATUS</span>
            <span style={{ textAlign: "right" }}>ACTION</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>No ledger transactions match query criteria.</div>
          ) : (
            filteredTransactions.map(txn => (
              <div key={txn.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.5fr 1fr 1.2fr 1fr 0.8fr",
                gap: "12px",
                padding: "14px 16px",
                borderBottom: "1px solid #edf2f7",
                fontSize: "0.82rem",
                alignItems: "center",
                color: "#334155"
              }}>
                <strong style={{ color: "#64748b" }}>{txn.id}</strong>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{txn.ref}</span>
                <span style={{ color: "#475569" }}>{txn.category}</span>
                <span>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: txn.type === "Credit" ? "#d1fae5" : "#fee2e2",
                    color: txn.type === "Credit" ? "#065f46" : "#b91c1c"
                  }}>
                    {txn.type}
                  </span>
                </span>
                <strong style={{ color: txn.type === "Credit" ? "#10b981" : "#ef4444" }}>
                  {txn.type === "Credit" ? "+ " : "- "}₹ {txn.amount.toLocaleString("en-IN")}
                </strong>
                <span>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: txn.status === "Settled" ? "#e0f2fe" : "#fef3c7",
                    color: txn.status === "Settled" ? "#0369a1" : "#d97706"
                  }}>
                    {txn.status}
                  </span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(txn.id, txn.ref)}
                    style={{ background: "#fef2f2", border: "1px solid #fee2e2", padding: "4px 8px", borderRadius: "6px", color: "#b91c1c", cursor: "pointer" }}
                    title="Remove Record"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        {/* Add Transaction Modal */}
        {showAddTxnModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 }}>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "420px", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Log Cash Ledger Transaction</h3>
                <button type="button" onClick={() => setShowAddTxnModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              </div>

              {txnError && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fde2e2", borderRadius: "8px", fontSize: "0.78rem", marginBottom: "14px", fontWeight: 600 }}>
                  ⚠️ {txnError}
                </div>
              )}

              <div style={{ display: "grid", gap: "14px" }}>
                <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  REFERENCE CODE (OPTIONAL)
                  <input
                    type="text"
                    placeholder="e.g. BMR-FL-103 (auto-gen if empty)"
                    value={newTxn.ref}
                    onChange={e => setNewTxn(prev => ({ ...prev, ref: e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                    FLOW TYPE
                    <select
                      value={newTxn.type}
                      onChange={e => setNewTxn(prev => ({ ...prev, type: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Credit">Credit (Inflow)</option>
                      <option value="Debit">Debit (Payout/Outflow)</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                    TRANSACTION STATUS
                    <select
                      value={newTxn.status}
                      onChange={e => setNewTxn(prev => ({ ...prev, status: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Settled">Settled</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  LEDGER CATEGORY
                  <select
                    value={newTxn.category}
                    onChange={e => setNewTxn(prev => ({ ...prev, category: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="Booking Revenue">Booking Revenue</option>
                    <option value="Wallet Top-up">Wallet Top-up</option>
                    <option value="Gateway Payout">Gateway Payout</option>
                    <option value="Server Cost">Server Cost</option>
                    <option value="Customer Refund">Customer Refund</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: "4px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  TRANSACTION AMOUNT (INR)
                  <input
                    type="number"
                    placeholder="Enter ledger amount"
                    value={newTxn.amount}
                    onChange={e => setNewTxn(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                  />
                </label>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowAddTxnModal(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button type="button" onClick={handleAddTxnSubmit} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, var(--primary), var(--primary-strong))", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Commit Ledger</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // FALLBACK RENDER: ORIGINAL GENERIC CRITICAL BOILERPLATE RECORDS MANAGER
  return (
    <section className="admin-placeholder">
      <p className="admin-placeholder-kicker">{kicker}</p>
      <h1 className="admin-placeholder-title">{title}</h1>
      <p className="admin-placeholder-subtitle">{description}</p>

      <div className="admin-placeholder-manager">
        <div className="admin-placeholder-toolbar">
          <label>
            <span>Title</span>
            <input
              type="text"
              placeholder="Add a new record"
              value={formValues.label}
              onChange={(e) => setFormValues(prev => ({ ...prev, label: e.target.value }))}
            />
          </label>
          <label>
            <span>Status</span>
            <select 
              value={formValues.status} 
              onChange={(e) => setFormValues(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="wide">
            <span>Note</span>
            <input
              type="text"
              placeholder="Optional note"
              value={formValues.note}
              onChange={(e) => setFormValues(prev => ({ ...prev, note: e.target.value }))}
            />
          </label>
          <button type="button" className="primary" onClick={handleCrudAdd}>
            <Check size={16} />
            Add Entry
          </button>
        </div>

        {crudError ? <p className="admin-placeholder-error">{crudError}</p> : null}

        <div className="admin-placeholder-table">
          <div className="admin-placeholder-table-head">
            <span>ID</span>
            <span>Title</span>
            <span>Status</span>
            <span>Updated</span>
            <span className="action-col">Action</span>
          </div>

          {items.length === 0 ? (
            <div className="admin-placeholder-empty">No entries yet. Add one to get started.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="admin-placeholder-row">
                <span>{item.id}</span>
                <span>{item.label}</span>
                <span className={`status ${item.status}`}>{item.status}</span>
                <span>{new Date(item.updatedAt).toLocaleString()}</span>
                <span className="action-col">
                  <button type="button" onClick={() => setEditItem({ ...item })} aria-label="Edit entry">
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleCrudDelete(item.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {editItem && (
        <div className="admin-placeholder-modal-backdrop" onClick={() => setEditItem(null)}>
          <section
            className="admin-placeholder-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit entry"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Edit Entry</h2>
              <button type="button" onClick={() => setEditItem(null)} aria-label="Close edit dialog">
                <X size={16} />
              </button>
            </header>

            <div className="admin-placeholder-modal-grid">
              <label>
                <span>Title</span>
                <input 
                  type="text" 
                  value={editItem.label} 
                  onChange={(e) => setEditItem(prev => ({ ...prev, label: e.target.value }))} 
                />
              </label>
              <label>
                <span>Status</span>
                <select 
                  value={editItem.status} 
                  onChange={(e) => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="wide">
                <span>Note</span>
                <input 
                  type="text" 
                  value={editItem.note || ""} 
                  onChange={(e) => setEditItem(prev => ({ ...prev, note: e.target.value }))} 
                />
              </label>
            </div>

            <div className="admin-placeholder-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleCrudEditSave}>
                Save
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Global Toast Render */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          padding: "12px 24px",
          borderRadius: "10px",
          background: toast.type === "success" ? "#ecfdf5" : "#fef2f2",
          border: `1px solid ${toast.type === "success" ? "#10b981" : "#ef4444"}`,
          color: toast.type === "success" ? "#065f46" : "#991b1b",
          fontSize: "0.88rem",
          fontWeight: "bold",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
          zIndex: 9999,
          animation: "dropdownSlideDown 0.3s ease"
        }}>
          {toast.type === "success" ? "✅ " : "❌ "}{toast.message}
        </div>
      )}
    </section>
  );
}

export default SectionPlaceholder;
