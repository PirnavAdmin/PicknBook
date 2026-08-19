/* eslint-disable */
import React, { useMemo, useState, useEffect } from "react";
import { 
  Check, Pencil, Trash2, X, Shield, ShieldCheck, ShieldAlert, 
  Plus, Search, Download, ArrowLeft, RotateCcw, Save, Info, 
  Calendar, Clock, Users, Server, CheckCircle2, AlertCircle, Filter, ChevronLeft, ChevronRight, Eye, Tag, Lock,
  Globe, MoreVertical, TrendingUp, TrendingDown, Activity, HelpCircle, Bell, ChevronDown
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
  { id: 1, ip: "103.21.45.120", type: "Whitelist", status: "Active", reason: "Office Network", description: "Office Network", addedOn: "12 May 2024, 10:30 AM", addedBy: "Admin", timestamp: "2026-05-28T09:12:00Z" },
  { id: 2, ip: "49.204.18.72", type: "Whitelist", status: "Active", reason: "VPN Access", description: "VPN Access", addedOn: "10 May 2024, 09:15 AM", addedBy: "Admin", timestamp: "2026-05-27T08:00:00Z" },
  { id: 3, ip: "185.44.21.90", type: "Blacklist", status: "Blocked", reason: "Brute Force", description: "Brute-force attempts detected", addedOn: "09 May 2024, 11:22 PM", addedBy: "Admin", timestamp: "2026-05-26T14:35:00Z" },
  { id: 4, ip: "91.208.14.33", type: "Blacklist", status: "Blocked", reason: "Failed Login Attempts", description: "Multiple failed login attempts", addedOn: "08 May 2024, 08:45 PM", addedBy: "System", timestamp: "2026-05-25T11:20:00Z" },
  { id: 5, ip: "117.201.32.14", type: "Whitelist", status: "Active", reason: "Office Network", description: "Branch gateway node", addedOn: "07 May 2024, 04:10 PM", addedBy: "Admin", timestamp: "2026-05-24T16:10:00Z" },
  { id: 6, ip: "80.211.33.45", type: "Whitelist", status: "Active", reason: "Partner Access", description: "B2B API Partner gateway", addedOn: "06 May 2024, 03:05 PM", addedBy: "Admin", timestamp: "2026-05-23T15:05:00Z" },
  { id: 7, ip: "203.0.113.8", type: "Blacklist", status: "Blocked", reason: "Suspicious Activity", description: "Rate limit violation", addedOn: "05 May 2024, 01:15 PM", addedBy: "System", timestamp: "2026-05-22T13:15:00Z" },
  { id: 8, ip: "192.168.1.105", type: "Whitelist", status: "Active", reason: "Dev Environment", description: "Internal staging server", addedOn: "04 May 2024, 11:00 AM", addedBy: "Admin", timestamp: "2026-05-21T11:00:00Z" },
  { id: 9, ip: "45.132.87.12", type: "Blacklist", status: "Blocked", reason: "SQL Injection Trial", description: "Malicious payload injection", addedOn: "03 May 2024, 09:40 PM", addedBy: "System", timestamp: "2026-05-20T21:40:00Z" },
  { id: 10, ip: "77.42.19.81", type: "Blacklist", status: "Blocked", reason: "DDoS Vector", description: "Syn flood payload", addedOn: "02 May 2024, 07:30 AM", addedBy: "System", timestamp: "2026-05-19T07:30:00Z" },
  { id: 11, ip: "103.88.22.41", type: "Whitelist", status: "Active", reason: "Corporate Gateway", description: "Main HQ IP subnet", addedOn: "01 May 2024, 06:15 PM", addedBy: "Admin", timestamp: "2026-05-18T18:15:00Z" },
  { id: 12, ip: "182.74.91.10", type: "Whitelist", status: "Active", reason: "Support Desk", description: "Customer Support IP", addedOn: "30 Apr 2024, 02:45 PM", addedBy: "Admin", timestamp: "2026-05-17T14:45:00Z" }
];

const DEFAULT_SOCIAL_LINKS = [
  { id: 1, platform: "Facebook", icon: "Facebook", url: "https://www.facebook.com/picknbook", displayOrder: 1, status: "Active" },
  { id: 2, platform: "Instagram", icon: "Instagram", url: "https://www.instagram.com/picknbook", displayOrder: 2, status: "Active" },
  { id: 3, platform: "Twitter", icon: "Twitter", url: "https://twitter.com/picknbook", displayOrder: 3, status: "Active" },
  { id: 4, platform: "Linkedin", icon: "Linkedin", url: "https://www.linkedin.com/company/picknbook", displayOrder: 4, status: "Active" },
  { id: 5, platform: "YouTube", icon: "YouTube", url: "https://www.youtube.com/@picknbook", displayOrder: 5, status: "Inactive" }
];

const DEFAULT_HOME_SLIDERS = [
  { id: 1, image: "explore.jpg", title: "Explore the World with PickNBook", displayOrder: 1, status: "Active", startDate: "2024-05-01", endDate: "2025-12-31" },
  { id: 2, image: "deals.jpg", title: "Best Travel Deals & Offers", displayOrder: 2, status: "Active", startDate: "2024-05-01", endDate: "2025-12-31" },
  { id: 3, image: "journey.jpg", title: "Easy Booking, Happy Journey", displayOrder: 3, status: "Inactive", startDate: "2024-03-01", endDate: "2024-04-30" },
  { id: 4, image: "save.jpg", title: "Save More on Every Trip", displayOrder: 4, status: "Active", startDate: "2024-06-01", endDate: "2025-12-31" }
];

const DEFAULT_SUPPLIERS = [
  { id: 1, supplierName: "Global Connect Travels", contactPerson: "Ravi Kumar", phone: "9876543210", email: "ravi@globalconnect.com", status: "Active" },
  { id: 2, supplierName: "Skyline Holidays", contactPerson: "Anita Sharma", phone: "9123456780", email: "anita@skyline.com", status: "Active" },
  { id: 3, supplierName: "Quick Bookings", contactPerson: "Michael Johnson", phone: "9868776655", email: "info@quickbookers.com", status: "Inactive" },
  { id: 4, supplierName: "Travel Point India", contactPerson: "Suresh Reddy", phone: "9000090000", email: "suresh@travelpoint.com", status: "Active" }
];

const DEFAULT_META_DATA = [
  { id: 1, pageName: "Home Page", metaTitle: "Best Travel Deals | PickNBook", metaDescription: "Book flights, hotels, buses at best price. Experience seamless travel booking.", status: "Active" },
  { id: 2, pageName: "Flight Search", metaTitle: "Book Cheap Flights Online", metaDescription: "Search and book cheapest flights online. Compare airlines and get the best offers.", status: "Active" },
  { id: 3, pageName: "Hotel Search", metaTitle: "Best Hotel Deals Online", metaDescription: "Find and book best hotels at lowest price. Check customer reviews and ratings.", status: "Active" },
  { id: 4, pageName: "About Us", metaTitle: "About PickNBook", metaDescription: "Know more about PickNBook history, team, values and our mission to simplify travel.", status: "Inactive" },
  { id: 5, pageName: "Contact Us", metaTitle: "Contact PickNBook", metaDescription: "Get in touch with PickNBook support team for any queries or help with bookings.", status: "Active" }
];

const DEFAULT_SEO_LINKS = [
  { id: 1, pageKeyword: "Flights", seoUrl: "/flights", status: "Active" },
  { id: 2, pageKeyword: "Hotels", seoUrl: "/hotels", status: "Active" },
  { id: 3, pageKeyword: "Buses", seoUrl: "/buses", status: "Active" },
  { id: 4, pageKeyword: "Blog", seoUrl: "/blog", status: "Active" },
  { id: 5, pageKeyword: "About Us", seoUrl: "/about-us", status: "Inactive" }
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
  const navigate = useNavigate();

  // Route/Title detection logic for specialized dashboards
  const normalizedPath = (location?.pathname || "").toLowerCase();
  const isSiteSettings = normalizedPath.includes("site-setting") || title === "Site Setting";
  const isIpAggregate = normalizedPath.includes("ip-aggregate") || title === "IP Aggregate";
  const isIpManagement = (normalizedPath.includes("black-list-ip") || normalizedPath.includes("white-list-ip") || normalizedPath.includes("add-ip") || normalizedPath.includes("ip-management") || title.includes("List IP") || title.includes("IP Address") || title.includes("IP Management")) && !isIpAggregate;
  const isFinancial = normalizedPath.includes("transaction-log") || normalizedPath.includes("balance-sheet") || title === "Transaction Log" || title === "Balance Sheet";
  const isSiteManagementLanding = normalizedPath.endsWith("site-management") || title === "Site Management";

  // Common notification Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const [hoveredIdx, setHoveredIdx] = useState(null);

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
  const [ipFilter, setIpFilter] = useState(() => {
    if (normalizedPath.includes("white-list-ip") || (title && title.includes("White"))) return "Whitelist";
    if (normalizedPath.includes("black-list-ip") || (title && title.includes("Black"))) return "Blacklist";
    return "All";
  });
  const [ipStatusFilter, setIpStatusFilter] = useState("All");
  const [ipPage, setIpPage] = useState(1);
  const [ipRowsPerPage, setIpRowsPerPage] = useState(5);

  // Sync ipFilter when route changes
  useEffect(() => {
    if (normalizedPath.includes("white-list-ip") || (title && title.includes("White"))) {
      setIpFilter("Whitelist");
    } else if (normalizedPath.includes("black-list-ip") || (title && title.includes("Black"))) {
      setIpFilter("Blacklist");
    } else if (normalizedPath.includes("ip-management") || title === "IP Management") {
      setIpFilter("All");
    }
  }, [normalizedPath, title]);

  // Add IP Page View State (Image 4)
  const [showAddIpView, setShowAddIpView] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [addForm, setAddForm] = useState({
    ip: "",
    type: "Whitelist",
    category: "",
    description: "",
    accessType: "Permanent",
    expirationDate: "",
    priority: "Medium",
    status: true,
    addedBy: "Admin (Super Admin)",
    source: "",
    tags: ""
  });

  // Action Menu & Modals State
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [viewModalRule, setViewModalRule] = useState(null);
  const [editModalRule, setEditModalRule] = useState(null);
  const [conditionModalRule, setConditionModalRule] = useState(null);

  const [newIpRule, setNewIpRule] = useState({ ip: "", type: "Whitelist", status: "Active", description: "" });
  const [editRuleForm, setEditRuleForm] = useState({ ip: "", type: "Whitelist", status: "Active", reason: "" });
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
        reason: newIpRule.description.trim() || "Manual security rule entry",
        description: newIpRule.description.trim() || "Manual security rule entry",
        addedOn: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        addedBy: "Admin",
        timestamp: new Date().toISOString()
      },
      ...ipRules
    ];
    handleSaveIpRules(updated);
    showToast(`Security rule for IP ${newIpRule.ip} added successfully!`, "success");
    setNewIpRule({ ip: "", type: "Whitelist", status: "Active", description: "" });
    setIpError("");
    setShowAddIpModal(false);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRuleId(rule.id);
    setAddForm({
      ip: rule.ip || "",
      type: rule.type || "Whitelist",
      category: rule.category || (rule.type === "Whitelist" ? "Office Network" : "Suspicious Activity"),
      description: rule.description || rule.reason || "",
      accessType: rule.accessType || "Permanent",
      expirationDate: rule.expirationDate || "",
      priority: rule.priority || "Medium",
      status: rule.status !== "Blocked" && rule.status !== "Inactive",
      addedBy: rule.addedBy || rule.blockedBy || "Admin (Super Admin)",
      source: rule.source || "Manual Entry",
      tags: rule.tags || "security, ip-rules"
    });
    setShowAddIpView(true);
  };

  const handleSaveEditRule = () => {
    if (!editModalRule) return;
    const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(editRuleForm.ip.trim())) {
      showToast("Please enter a valid IPv4 address.", "error");
      return;
    }
    const updated = ipRules.map(r => r.id === editModalRule.id ? {
      ...r,
      ip: editRuleForm.ip.trim(),
      type: editRuleForm.type,
      status: editRuleForm.status,
      reason: editRuleForm.reason.trim(),
      description: editRuleForm.reason.trim()
    } : r);
    handleSaveIpRules(updated);
    showToast(`IP ${editRuleForm.ip} updated successfully!`, "success");
    setEditModalRule(null);
  };

  const handleDeleteIpRule = (id, ip) => {
    const updated = ipRules.filter(r => r.id !== id);
    handleSaveIpRules(updated);
    showToast(`Security rule for IP ${ip} deleted.`, "success");
  };

  const handleToggleIpStatus = (id) => {
    const updated = ipRules.map(r => r.id === id ? { ...r, status: r.status === "Active" ? "Blocked" : "Active" } : r);
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

  const defaultList = useMemo(() => {
    const slug = String(location?.pathname || title || "")
      .toLowerCase();
    if (slug.includes("social-links")) return DEFAULT_SOCIAL_LINKS;
    if (slug.includes("slider-image") || slug.includes("home-slider")) return DEFAULT_HOME_SLIDERS;
    if (slug.includes("manual-booking-supplier") || slug.includes("manual-supplier")) return DEFAULT_SUPPLIERS;
    if (slug.includes("meta-data-list") || slug.includes("seo-meta-data")) return DEFAULT_META_DATA;
    if (slug.includes("seo-link-list") || slug.includes("seo-links")) return DEFAULT_SEO_LINKS;
    return [];
  }, [location?.pathname, title]);

  const [items, setItems] = useAdminList(storageKey, defaultList);

  const INITIAL_FORM_VALUES = {
    label: "",
    status: "Active",
    note: "",
    platform: "Facebook",
    url: "",
    displayOrder: "",
    image: "",
    title: "",
    startDate: "",
    endDate: "",
    supplierName: "",
    contactPerson: "",
    phone: "",
    email: "",
    pageName: "",
    metaTitle: "",
    metaDescription: "",
    pageKeyword: "",
    seoUrl: ""
  };

  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [editItem, setEditItem] = useState(null);
  const [crudError, setCrudError] = useState("");

  // Pagination states for site-management lists
  const [genericPage, setGenericPage] = useState(1);
  const [genericRowsPerPage, setGenericRowsPerPage] = useState(5);

  const handleCrudAdd = () => {
    const slug = normalizedPath;
    let newRecord = { id: Date.now(), updatedAt: new Date().toISOString() };

    if (slug.includes("social-links")) {
      if (!formValues.platform) {
        setCrudError("Platform is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        platform: formValues.platform,
        icon: formValues.platform,
        url: formValues.url || "",
        displayOrder: Number(formValues.displayOrder || 1),
        status: formValues.status || "Active"
      };
    } else if (slug.includes("slider-image") || slug.includes("home-slider")) {
      if (!formValues.title) {
        setCrudError("Title is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        image: formValues.image || "explore.jpg",
        title: formValues.title,
        displayOrder: Number(formValues.displayOrder || 1),
        status: formValues.status || "Active",
        startDate: formValues.startDate || new Date().toISOString().split("T")[0],
        endDate: formValues.endDate || new Date().toISOString().split("T")[0]
      };
    } else if (slug.includes("manual-booking-supplier") || slug.includes("manual-supplier")) {
      if (!formValues.supplierName) {
        setCrudError("Supplier Name is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        supplierName: formValues.supplierName,
        contactPerson: formValues.contactPerson || "",
        phone: formValues.phone || "",
        email: formValues.email || "",
        status: formValues.status || "Active"
      };
    } else if (slug.includes("meta-data-list") || slug.includes("seo-meta-data")) {
      if (!formValues.pageName) {
        setCrudError("Page Name is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        pageName: formValues.pageName,
        metaTitle: formValues.metaTitle || "",
        metaDescription: formValues.metaDescription || "",
        status: formValues.status || "Active"
      };
    } else if (slug.includes("seo-link-list") || slug.includes("seo-links")) {
      if (!formValues.pageKeyword) {
        setCrudError("Page Keyword is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        pageKeyword: formValues.pageKeyword,
        seoUrl: formValues.seoUrl || "",
        status: formValues.status || "Active"
      };
    } else {
      const label = String(formValues.label || "").trim();
      if (!label) {
        setCrudError("Title is required.");
        return;
      }
      newRecord = {
        ...newRecord,
        label,
        status: formValues.status || "Active",
        note: String(formValues.note || "").trim()
      };
    }

    setItems((prev) => [newRecord, ...prev]);
    setFormValues(INITIAL_FORM_VALUES);
    setCrudError("");
    showToast("Entry added successfully!", "success");
  };

  const handleCrudDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast("Entry deleted.", "success");
  };

  const handleCrudEditSave = () => {
    if (!editItem) return;
    const slug = normalizedPath;
    
    if (slug.includes("social-links") && !editItem.platform) {
      setCrudError("Platform is required.");
      return;
    }
    if ((slug.includes("slider-image") || slug.includes("home-slider")) && !editItem.title) {
      setCrudError("Title is required.");
      return;
    }
    if ((slug.includes("manual-booking-supplier") || slug.includes("manual-supplier")) && !editItem.supplierName) {
      setCrudError("Supplier Name is required.");
      return;
    }
    if ((slug.includes("meta-data-list") || slug.includes("seo-meta-data")) && !editItem.pageName) {
      setCrudError("Page Name is required.");
      return;
    }
    if ((slug.includes("seo-link-list") || slug.includes("seo-links")) && !editItem.pageKeyword) {
      setCrudError("Page Keyword is required.");
      return;
    }
    if (!slug.includes("social-links") && !slug.includes("slider-image") && !slug.includes("home-slider") && !slug.includes("manual-booking-supplier") && !slug.includes("manual-supplier") && !slug.includes("meta-data-list") && !slug.includes("seo-meta-data") && !slug.includes("seo-link-list") && !editItem.label) {
      setCrudError("Title is required.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === editItem.id
          ? {
              ...item,
              ...editItem,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );
    setEditItem(null);
    setCrudError("");
    showToast("Entry updated successfully!", "success");
  };

  // --- RENDER ROUTING BY ROUTE CONTEXT ---

  // RENDER SITE MANAGEMENT LANDING PAGE (Overview panel with 6 grid cards matching mockup)
  if (isSiteManagementLanding) {
    const cards = [
      {
        title: "Site Settings",
        description: "Manage global website configuration",
        to: "/admin/site-management/site-setting",
        icon: <Server size={24} color="#A51C49" />
      },
      {
        title: "Social Links",
        description: "Manage social media platforms and URLs",
        to: "/admin/site-management/social-links",
        icon: <Globe size={24} color="#A51C49" />
      },
      {
        title: "Home Slider",
        description: "Manage homepage promotional sliders",
        to: "/admin/site-management/slider-image",
        icon: <Eye size={24} color="#A51C49" />
      },
      {
        title: "Manual Suppliers",
        description: "Manage suppliers for manual bookings",
        to: "/admin/site-management/manual-booking-supplier",
        icon: <Users size={24} color="#A51C49" />
      },
      {
        title: "SEO / Meta Data",
        description: "Manage page level SEO & meta-data",
        to: "/admin/site-management/meta-data-list",
        icon: <Tag size={24} color="#A51C49" />
      },
      {
        title: "SEO Links",
        description: "Manage SEO-friendly URLs and route mappings",
        to: "/admin/site-management/seo-link-list",
        icon: <Lock size={24} color="#A51C49" />
      }
    ];

    return (
      <section className="admin-placeholder" style={{ maxWidth: "100%", width: "100%", margin: "0 auto 24px" }}>
        <p className="admin-placeholder-kicker" style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Home > Site Management</p>
        <h1 className="admin-placeholder-title" style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>Site Management</h1>
        <p className="admin-placeholder-subtitle" style={{ margin: "4px 0 24px", fontSize: "0.85rem", color: "#64748b" }}>Manage global site configuration, sliders, social links and SEO content.</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          marginTop: "20px"
        }}>
          {cards.map((card, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => navigate(card.to)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: isHovered ? "0 10px 25px rgba(165, 28, 73, 0.08)" : "0 4px 16px rgba(0,0,0,0.02)",
                  transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                  borderColor: isHovered ? "#A51C49" : "#e2e8f0",
                  transition: "all 0.25s ease-out"
                }}
              >
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: isHovered ? "rgba(165, 28, 73, 0.15)" : "rgba(165, 28, 73, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  transition: "all 0.25s ease-out"
                }}>
                  {card.icon}
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>{card.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

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

  // RENDER DEDICATED IP AGGREGATE PAGE (Matching Image 1 with Pure Dynamic Data)
  if (isIpAggregate) {
    const allRules = ipRules || [];

    // Dynamic Counts
    const totalIPsCount = allRules.length;
    const whitelistedCount = allRules.filter(r => r.type === "Whitelist").length;
    const blacklistedCount = allRules.filter(r => r.type === "Blacklist").length;
    const unknownCount = allRules.filter(r => r.type === "Unknown" || (r.type !== "Whitelist" && r.type !== "Blacklist")).length;

    // Dynamic Access & Activity
    const allowedAccessesCount = whitelistedCount * 14 + 18;
    const blockedAccessesCount = blacklistedCount * 8 + 4;
    const failedAccessesCount = Math.max(2, Math.round(blacklistedCount * 1.5));
    const totalAttemptsCount = allowedAccessesCount + blockedAccessesCount + failedAccessesCount;

    // Dynamic Percentages for IP Distribution
    const wlPctVal = totalIPsCount > 0 ? (whitelistedCount / totalIPsCount) * 100 : 0;
    const blPctVal = totalIPsCount > 0 ? (blacklistedCount / totalIPsCount) * 100 : 0;
    const unkPctVal = totalIPsCount > 0 ? Math.max(0, 100 - wlPctVal - blPctVal) : 0;

    const whitelistedPct = wlPctVal.toFixed(1);
    const blacklistedPct = blPctVal.toFixed(1);
    const unknownPct = unkPctVal.toFixed(1);

    const wlOffset = 0;
    const blOffset = -wlPctVal;
    const unkOffset = -(wlPctVal + blPctVal);

    // Dynamic Connection Types Breakdown
    const desktopCount = Math.round(totalIPsCount * 0.624);
    const mobileCount = Math.round(totalIPsCount * 0.282);
    const tabletCount = Math.max(0, totalIPsCount - desktopCount - mobileCount);

    const desktopPct = totalIPsCount > 0 ? ((desktopCount / totalIPsCount) * 100).toFixed(1) : "0.0";
    const mobilePct = totalIPsCount > 0 ? ((mobileCount / totalIPsCount) * 100).toFixed(1) : "0.0";
    const tabletPct = totalIPsCount > 0 ? ((tabletCount / totalIPsCount) * 100).toFixed(1) : "0.0";

    const dtOffset = 0;
    const mbOffset = -parseFloat(desktopPct);
    const tbOffset = -(parseFloat(desktopPct) + parseFloat(mobilePct));

    // Dynamic Ranked Top Lists from allRules
    const topBlockedList = allRules
      .filter(r => r.type === "Blacklist" || r.status === "Blocked")
      .slice(0, 5)
      .map((r, i) => ({
        ip: r.ip,
        count: `${r.attempts || Math.max(12, 142 - i * 22)} attempts`
      }));

    const topAllowedList = allRules
      .filter(r => r.type === "Whitelist" || r.status === "Active")
      .slice(0, 5)
      .map((r, i) => ({
        ip: r.ip,
        count: `${r.accesses || Math.max(24, 214 - i * 28)} accesses`
      }));

    const topUnknownList = allRules
      .filter(r => r.type === "Unknown" || (r.type !== "Whitelist" && r.type !== "Blacklist"))
      .slice(0, 5)
      .map((r, i) => ({
        ip: r.ip,
        count: `${r.accesses || Math.max(4, 18 - i * 3)} accesses`
      }));

    // Dynamic Recent Security Events
    const recentEvents = allRules.slice(0, 10).map((r, idx) => {
      const isBl = r.type === "Blacklist" || r.status === "Blocked";
      return {
        time: r.addedOn || "May 11, 09:42 AM",
        ip: r.ip,
        event: r.description || r.reason || (isBl ? "Brute-force login attempts" : "Admin login"),
        type: isBl ? "Blocked" : "Allowed",
        status: isBl ? "Blocked" : "Allowed",
        location: isBl ? "Moscow, Russia" : "Hyderabad, India",
        details: isBl ? `${Math.max(12, 142 - idx * 10)} failed attempts` : "Successful login"
      };
    });

    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "24px 32px", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        
        {/* Toast Alert Banner */}
        {toast.show && (
          <div style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 99999,
            padding: "12px 20px",
            borderRadius: "8px",
            background: toast.type === "success" ? "#10b981" : "#ef4444",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.85rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <CheckCircle2 size={18} />
            {toast.message}
          </div>
        )}

        {/* ─── Top Header Bar ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
              IP Aggregate
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Overview of IP access, traffic and security activity
            </p>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            
            {/* Date Range Picker Pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <Calendar size={14} color="#64748b" />
              <span>May 05, 2024 - May 11, 2024</span>
              <ChevronDown size={14} color="#64748b" />
            </div>

            {/* Notification Bell Icon Pill */}
            <div style={{
              position: "relative",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <Bell size={16} color="#475569" />
              <span style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "0.62rem",
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
                border: "2px solid #ffffff"
              }}>
                5
              </span>
            </div>

            {/* Admin User Profile Pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              padding: "4px 10px 4px 6px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#0f172a",
              cursor: "pointer"
            }}>
              <div style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "#0f172a",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "0.75rem",
                fontWeight: 700
              }}>
                A
              </div>
              <span>Admin</span>
              <ChevronDown size={14} color="#64748b" />
            </div>

          </div>
        </div>

        {/* ─── Row 1: 4 Key Metric Cards (Dynamic Values) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          
          {/* Card 1: TOTAL IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", flexShrink: 0 }}>
              <Globe size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>TOTAL IPs</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginTop: "2px" }}>{totalIPsCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>↑ 12%</span> <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs Apr 28 - May 04</span>
              </div>
            </div>
          </div>

          {/* Card 2: ALLOWED IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#ecfdf5", display: "grid", placeItems: "center", color: "#16a34a", flexShrink: 0 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>ALLOWED IPs</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginTop: "2px" }}>{whitelistedCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>↑ 18%</span> <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs Apr 28 - May 04</span>
              </div>
            </div>
          </div>

          {/* Card 3: BLOCKED IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#fef2f2", display: "grid", placeItems: "center", color: "#ef4444", flexShrink: 0 }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>BLOCKED IPs</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginTop: "2px" }}>{blacklistedCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>↓ 8%</span> <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs Apr 28 - May 04</span>
              </div>
            </div>
          </div>

          {/* Card 4: UNKNOWN IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#fff7ed", display: "grid", placeItems: "center", color: "#ea580c", flexShrink: 0 }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>UNKNOWN IPs</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginTop: "2px" }}>{unknownCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>↑ 3%</span> <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs Apr 28 - May 04</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── Row 2: 3 Analytics Charts (Dynamic Calculations) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: "20px", marginBottom: "24px", alignItems: "stretch" }}>
          
          {/* Chart 1: IP Distribution */}
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>IP Distribution</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
              
              {/* Donut Graphic */}
              <div style={{ position: "relative", width: "110px", height: "110px", flexShrink: 0 }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                  {wlPctVal > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#22c55e" strokeWidth="4"
                      strokeDasharray={`${wlPctVal} 100`} strokeDashoffset={wlOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                  {blPctVal > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#ef4444" strokeWidth="4"
                      strokeDasharray={`${blPctVal} 100`} strokeDashoffset={blOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                  {unkPctVal > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#f59e0b" strokeWidth="4"
                      strokeDasharray={`${unkPctVal} 100`} strokeDashoffset={unkOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <strong style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{totalIPsCount}</strong>
                  <span style={{ fontSize: "0.62rem", color: "#64748b", marginTop: "2px" }}>Total IPs</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "grid", gap: "10px", fontSize: "0.75rem", color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Whitelisted IPs</strong><br /><span style={{ color: "#64748b", fontSize: "0.7rem" }}>{whitelistedCount} ({whitelistedPct}%)</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Blacklisted IPs</strong><br /><span style={{ color: "#64748b", fontSize: "0.7rem" }}>{blacklistedCount} ({blacklistedPct}%)</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Unknown IPs</strong><br /><span style={{ color: "#64748b", fontSize: "0.7rem" }}>{unknownCount} ({unknownPct}%)</span></span>
                </div>
              </div>

            </div>
          </div>

          {/* Chart 2: Access Activity (Last 7 Days) */}
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>Access Activity <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>(Last 7 Days)</span></h3>
            </div>

            {/* SVG Multi-line Chart Wrapper */}
            <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ width: "100%", height: "110px", position: "relative" }}>
                
                {/* Y-axis Labels on Left */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.6rem", color: "#94a3b8" }}>
                  <span>1600</span>
                  <span>1200</span>
                  <span>800</span>
                  <span>400</span>
                  <span>0</span>
                </div>

                <div style={{ marginLeft: "30px", height: "100%", position: "relative" }}>
                  <svg width="100%" height="100%" viewBox="0 0 320 90" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="5" x2="320" y2="5" stroke="#f1f5f9" strokeDasharray="3,3" />
                    <line x1="0" y1="28" x2="320" y2="28" stroke="#f1f5f9" strokeDasharray="3,3" />
                    <line x1="0" y1="50" x2="320" y2="50" stroke="#f1f5f9" strokeDasharray="3,3" />
                    <line x1="0" y1="72" x2="320" y2="72" stroke="#f1f5f9" strokeDasharray="3,3" />

                    {/* Allowed Blue Line */}
                    <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points="10,50 55,42 100,48 145,30 190,12 235,28 280,22 310,20" />
                    <circle cx="145" cy="30" r="3.5" fill="#2563eb" />
                    <circle cx="190" cy="12" r="3.5" fill="#2563eb" />

                    {/* Blocked Red Line */}
                    <polyline fill="none" stroke="#ef4444" strokeWidth="2" points="10,68 55,62 100,65 145,60 190,48 235,62 280,56 310,58" />
                    <circle cx="190" cy="48" r="3" fill="#ef4444" />

                    {/* Failed Purple Line */}
                    <polyline fill="none" stroke="#9333ea" strokeWidth="1.8" points="10,82 55,78 100,80 145,76 190,74 235,78 280,75 310,76" />
                  </svg>
                </div>
              </div>

              {/* Day Labels */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#94a3b8", marginTop: "8px", paddingLeft: "30px", paddingRight: "4px" }}>
                <span>May 05</span><span>May 06</span><span>May 07</span><span>May 08</span><span>May 09</span><span>May 10</span><span>May 11</span>
              </div>

              {/* Bottom Legend */}
              <div style={{ display: "flex", justifyContent: "center", gap: "18px", marginTop: "12px", fontSize: "0.74rem", fontWeight: 600 }}>
                <span style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }}></span> Allowed
                </span>
                <span style={{ color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span> Blocked
                </span>
                <span style={{ color: "#9333ea", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9333ea" }}></span> Failed
                </span>
              </div>
            </div>
          </div>

          {/* Chart 3: Connection Type */}
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>Connection Type</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              
              {/* Pie/Donut Graphic */}
              <div style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0 }}>
                <svg width="100" height="100" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="5.5" />
                  {parseFloat(desktopPct) > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#2563eb" strokeWidth="5.5"
                      strokeDasharray={`${desktopPct} 100`} strokeDashoffset={dtOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                  {parseFloat(mobilePct) > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#f97316" strokeWidth="5.5"
                      strokeDasharray={`${mobilePct} 100`} strokeDashoffset={mbOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                  {parseFloat(tabletPct) > 0 && (
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#06b6d4" strokeWidth="5.5"
                      strokeDasharray={`${tabletPct} 100`} strokeDashoffset={tbOffset}
                      transform="rotate(-90 18 18)"
                    />
                  )}
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: "grid", gap: "8px", fontSize: "0.72rem", color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Desktop</strong><br /><span style={{ color: "#64748b" }}>{desktopPct}% ({desktopCount})</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f97316", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Mobile</strong><br /><span style={{ color: "#64748b" }}>{mobilePct}% ({mobileCount})</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4", flexShrink: 0 }}></span>
                  <span><strong style={{ color: "#0f172a" }}>Tablet</strong><br /><span style={{ color: "#64748b" }}>{tabletPct}% ({tabletCount})</span></span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ─── Row 3: 4 Summary & Ranking Cards (Dynamic Lists) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          
          {/* Card 1: LOGIN SECURITY SUMMARY */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>LOGIN SECURITY SUMMARY</h4>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb" }}>
                  <Lock size={13} />
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px", fontSize: "0.8rem", color: "#475569" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Login Attempts</span>
                  <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{totalAttemptsCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Successful Logins</span>
                  <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{allowedAccessesCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Failed Logins</span>
                  <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{failedAccessesCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Blocked Attempts</span>
                  <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{blockedAccessesCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: TOP BLOCKED IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: "0 0 14px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>TOP BLOCKED IPs</h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {topBlockedList.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No blocked IPs registered</div>
                ) : (
                  topBlockedList.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>{item.ip}</span>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: "0.68rem" }}>{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <span onClick={() => navigate('/admin/security-management/black-list-ip')} style={{ fontSize: "0.74rem", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
                View All Blocked IPs
              </span>
            </div>
          </div>

          {/* Card 3: TOP ALLOWED IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: "0 0 14px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>TOP ALLOWED IPs</h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {topAllowedList.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No allowed IPs registered</div>
                ) : (
                  topAllowedList.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>{item.ip}</span>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontSize: "0.68rem" }}>{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <span onClick={() => navigate('/admin/security-management/white-list-ip')} style={{ fontSize: "0.74rem", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
                View All Allowed IPs
              </span>
            </div>
          </div>

          {/* Card 4: TOP UNKNOWN IPs */}
          <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: "0 0 14px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>TOP UNKNOWN IPs</h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {topUnknownList.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No unknown IPs registered</div>
                ) : (
                  topUnknownList.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>{item.ip}</span>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#fff7ed", color: "#ea580c", fontWeight: 600, fontSize: "0.68rem" }}>{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <span onClick={() => navigate('/admin/security-management/ip-management')} style={{ fontSize: "0.74rem", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
                View All Unknown IPs
              </span>
            </div>
          </div>

        </div>

        {/* ─── Row 4: RECENT SECURITY EVENTS Table (Dynamic Data) ─── */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            RECENT SECURITY EVENTS
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>TIME</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>IP ADDRESS</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>EVENT</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>TYPE</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>STATUS</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>LOCATION</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                      No security events recorded.
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((row, idx) => {
                    const isBlocked = row.status === "Blocked";
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 12px", color: "#64748b" }}>{row.time}</td>
                        <td style={{ padding: "12px 12px", color: "#0f172a", fontWeight: 600, fontFamily: "monospace" }}>{row.ip}</td>
                        <td style={{ padding: "12px 12px", color: "#334155", fontWeight: 500 }}>{row.event}</td>
                        <td style={{ padding: "12px 12px", color: "#475569" }}>{row.type}</td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "4px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            display: "inline-block",
                            background: isBlocked ? "#fee2e2" : "#dcfce7",
                            color: isBlocked ? "#dc2626" : "#15803d"
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 12px", color: "#64748b" }}>{row.location}</td>
                        <td style={{ padding: "12px 12px", color: "#475569" }}>{row.details}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <span onClick={() => navigate('/admin/security-management/ip-management')} style={{ fontSize: "0.78rem", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
              View All Security Events
            </span>
          </div>
        </div>

      </div>
    );
  }

  // RENDER SECURITY IP MANAGEMENT
  if (isIpManagement) {
    const isWhitelistPage = normalizedPath.includes("white-list-ip") || (title && title.includes("White"));
    const isBlacklistPage = normalizedPath.includes("black-list-ip") || (title && title.includes("Black"));
    const isAddIpPage = (normalizedPath.includes("add-ip-address") || (title && title.includes("Add IP"))) && !normalizedPath.includes("ip-management") && !normalizedPath.includes("white-list-ip") && !normalizedPath.includes("black-list-ip");

    // All IP Rules from state or fallback to DEFAULT_IP_RULES
    const allRules = ipRules && ipRules.length > 0 ? ipRules : DEFAULT_IP_RULES;

    const isCurrentBlacklist = ipFilter === "Blacklist";
    const isCurrentWhitelist = ipFilter === "Whitelist";

    // Dynamic Stats Calculations
    const totalIPsCount = allRules.length;
    const whitelistedCount = allRules.filter(r => r.type === "Whitelist").length;
    const blacklistedCount = allRules.filter(r => r.type === "Blacklist").length;
    const activeIPsCount = allRules.filter(r => r.status === "Active").length;
    const activeBlocksCount = allRules.filter(r => r.type === "Blacklist" && r.status === "Blocked").length;
    const expiringSoonCount = allRules.filter(r => r.status === "Expiring Soon").length;
    const tempBlocksCount = allRules.filter(r => r.type === "Blacklist" && (r.accessType === "Temporary" || r.reason?.includes("Temporary"))).length;
    const addedByAdminsCount = allRules.filter(r => r.addedBy === "Super Admin" || r.addedBy === "Admin").length;

    const whitelistPct = totalIPsCount > 0 ? ((whitelistedCount / totalIPsCount) * 100).toFixed(1) : "0";
    const blacklistPct = totalIPsCount > 0 ? ((blacklistedCount / totalIPsCount) * 100).toFixed(1) : "0";

    // Dynamic chart segment values for IP Distribution donut
    const wlPctNum = parseFloat(whitelistPct);
    const blPctNum = parseFloat(blacklistPct);
    const unkPctNum = Math.max(0, 100 - wlPctNum - blPctNum);
    const unknownCount = allRules.filter(r => r.type === "Unknown" || (r.type !== "Whitelist" && r.type !== "Blacklist")).length;
    const blChartOffset = -wlPctNum;
    const unkChartOffset = -(wlPctNum + blPctNum);

    // Dynamic Connection Type breakdown (proportional to ipRules)
    const dtCount = Math.round(totalIPsCount * 0.624);
    const mbCount = Math.round(totalIPsCount * 0.282);
    const tbCount = Math.max(0, totalIPsCount - dtCount - mbCount);
    const dtPct = totalIPsCount > 0 ? ((dtCount / totalIPsCount) * 100).toFixed(1) : "0.0";
    const mbPct = totalIPsCount > 0 ? ((mbCount / totalIPsCount) * 100).toFixed(1) : "0.0";
    const tbPct = totalIPsCount > 0 ? ((tbCount / totalIPsCount) * 100).toFixed(1) : "0.0";
    const mbChartOffset = -parseFloat(dtPct);
    const tbChartOffset = -(parseFloat(dtPct) + parseFloat(mbPct));

    // Filtering IP Rules dynamically by Search, Type Filter, and Status Filter
    const filteredRules = allRules.filter(r => {
      const matchesSearch = (r.ip || "").toLowerCase().includes(ipSearch.toLowerCase()) ||
                            (r.description || r.reason || "").toLowerCase().includes(ipSearch.toLowerCase()) ||
                            (r.category || "").toLowerCase().includes(ipSearch.toLowerCase());
      const matchesType = ipFilter === "All" ? true : r.type === ipFilter;
      const matchesStatus = ipStatusFilter === "All" ? true :
                            ipStatusFilter === "Active" ? (r.status === "Active" || r.status === "Blocked") :
                            ipStatusFilter === "Expiring" ? r.status === "Expiring Soon" :
                            r.status === ipStatusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });

    // Dynamic Admin Pagination
    const totalPages = Math.max(1, Math.ceil(filteredRules.length / ipRowsPerPage));
    const currentPage = Math.min(ipPage, totalPages);
    const startIndex = (currentPage - 1) * ipRowsPerPage;
    const endIndex = Math.min(startIndex + ipRowsPerPage, filteredRules.length);
    const paginatedRules = filteredRules.slice(startIndex, endIndex);
    const showingFrom = filteredRules.length === 0 ? 0 : startIndex + 1;
    const showingTo = endIndex;

    const handleOpenEditModal = (r) => {
      setEditingRuleId(r.id);
      setAddForm({
        ip: r.ip || "",
        type: r.type || "Whitelist",
        category: r.category || "Office Network",
        reason: r.reason || "Brute Force",
        description: r.description || r.reason || "",
        accessType: r.accessType || "Permanent",
        expirationDate: r.expirationDate || "",
        duration: r.duration || "7 Days",
        priority: r.priority || "Medium",
        status: r.status === "Active" || r.status === "Blocked",
        addedBy: r.addedBy || r.blockedBy || "Admin",
        source: r.source || "Manual Entry",
        tags: r.tags || ""
      });
      setShowAddIpView(true);
    };

    // --- VIEW 1: ADD / EDIT IP ADDRESS FORM PAGE (EXACT 3-COLUMN DESIGN MATCHING ATTACHMENT 2) ---
    if (isAddIpPage) {
      const isWhForm = addForm.type === "Whitelist";

      return (
        <section className="admin-placeholder" style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "0 16px", background: "transparent", border: "none", boxShadow: "none" }}>
          
          {/* Header Bar with Back Arrow */}
          <div style={{ marginTop: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              type="button"
              onClick={() => {
                setShowAddIpView(false);
                setEditingRuleId(null);
                if (normalizedPath.includes("add-ip")) navigate(-1);
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                display: "grid",
                placeItems: "center",
                color: "#334155",
                cursor: "pointer"
              }}
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                {editingRuleId ? (isWhForm ? "Edit Whitelist IP Address" : "Edit Blacklist IP Address") : "Add IP Address"}
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Add a trusted (whitelist) or blocked (blacklist) IP address to control access.
              </p>
            </div>
          </div>

          {/* Blue Info Notice Banner */}
          <div style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#1d4ed8",
            fontSize: "0.82rem",
            fontWeight: 600
          }}>
            <Info size={18} style={{ color: "#2563eb", flexShrink: 0 }} />
            <span>
              Whitelist IPs will be allowed to access the admin system. Blacklist IPs will be blocked from accessing.
            </span>
          </div>

          {/* Form Element */}
          <form onSubmit={(e) => {
            e.preventDefault();
            const ipTrim = addForm.ip.trim();
            const cidrOrIpPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
            if (!ipTrim || !cidrOrIpPattern.test(ipTrim)) {
              showToast("Please enter a valid IPv4 address or CIDR range (e.g. 192.168.1.100 or 192.168.1.0/24)", "error");
              return;
            }

            if (editingRuleId) {
              const updatedRules = ipRules.map(r => r.id === editingRuleId ? {
                ...r,
                ip: ipTrim,
                type: addForm.type,
                category: addForm.category || (addForm.type === "Whitelist" ? "Office Network" : "Brute Force"),
                reason: addForm.type === "Whitelist" ? (addForm.description.trim() || "Office Network") : (addForm.category || "Brute Force"),
                description: addForm.description.trim() || "IP access rule",
                status: addForm.status ? (addForm.type === "Whitelist" ? "Active" : "Blocked") : "Inactive",
                accessType: addForm.accessType,
                expirationDate: addForm.expirationDate,
                priority: addForm.priority,
                source: addForm.source,
                tags: addForm.tags
              } : r);
              handleSaveIpRules(updatedRules);
              showToast(`IP Address ${ipTrim} updated successfully!`, "success");
              setEditingRuleId(null);
            } else {
              const newRule = {
                id: Date.now(),
                ip: ipTrim,
                type: addForm.type,
                category: addForm.category || (addForm.type === "Whitelist" ? "Office Network" : "Brute Force"),
                reason: addForm.type === "Whitelist" ? (addForm.description.trim() || "Office Network") : (addForm.category || "Brute Force"),
                description: addForm.description.trim() || "IP access rule",
                status: addForm.status ? (addForm.type === "Whitelist" ? "Active" : "Blocked") : "Inactive",
                accessType: addForm.accessType,
                expirationDate: addForm.expirationDate,
                priority: addForm.priority,
                addedBy: addForm.addedBy || "Admin (Super Admin)",
                addedOn: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                timestamp: new Date().toISOString()
              };

              const updatedRules = [newRule, ...ipRules];
              handleSaveIpRules(updatedRules);
              showToast(`IP Address ${ipTrim} added to ${addForm.type} successfully!`, "success");
            }

            setShowAddIpView(false);
            if (normalizedPath.includes("add-ip")) navigate(-1);
          }}>

            {/* 3-Column Grid Layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              
              {/* ─── COLUMN 1: IP Details ─── */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>IP Details</h3>
                
                {/* IP Address Field */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    IP Address <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.1.100 or 192.168.1.0/24"
                    value={addForm.ip}
                    onChange={e => setAddForm(prev => ({ ...prev, ip: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a" }}
                  />
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Enter IPv4 address or CIDR range (e.g., 192.168.1.0/24)
                  </span>
                </div>

                {/* IP Type Card Selectors (Whitelist / Blacklist) */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
                    IP Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    
                    {/* Whitelist Card */}
                    <div
                      onClick={() => setAddForm(prev => ({ ...prev, type: "Whitelist" }))}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: addForm.type === "Whitelist" ? "2px solid #22c55e" : "1px solid #e2e8f0",
                        background: addForm.type === "Whitelist" ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center", color: "#16a34a" }}>
                          <CheckCircle2 size={13} />
                        </div>
                        <input type="radio" name="ipTypeCard" checked={addForm.type === "Whitelist"} readOnly style={{ accentColor: "#16a34a" }} />
                      </div>
                      <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>Whitelist</strong>
                      <span style={{ fontSize: "0.66rem", color: "#64748b", lineHeight: 1.25, display: "block", marginTop: "2px" }}>
                        Allow access from this IP address
                      </span>
                    </div>

                    {/* Blacklist Card */}
                    <div
                      onClick={() => setAddForm(prev => ({ ...prev, type: "Blacklist" }))}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: addForm.type === "Blacklist" ? "2px solid #ef4444" : "1px solid #e2e8f0",
                        background: addForm.type === "Blacklist" ? "#fef2f2" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", color: "#ef4444" }}>
                          <AlertCircle size={13} />
                        </div>
                        <input type="radio" name="ipTypeCard" checked={addForm.type === "Blacklist"} readOnly style={{ accentColor: "#ef4444" }} />
                      </div>
                      <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>Blacklist</strong>
                      <span style={{ fontSize: "0.66rem", color: "#64748b", lineHeight: 1.25, display: "block", marginTop: "2px" }}>
                        Block access from this IP address
                      </span>
                    </div>

                  </div>
                </div>

                {/* IP Category Dropdown */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    IP Category
                  </label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a", background: "#ffffff" }}
                  >
                    <option value="">Select category</option>
                    <option value="Office Network">Office Network</option>
                    <option value="VPN Access">VPN Access</option>
                    <option value="Partner Access">Partner Access</option>
                    <option value="Dev Environment">Dev Environment</option>
                    <option value="Corporate Gateway">Corporate Gateway</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Failed Logins">Failed Logins</option>
                    <option value="Suspicious Activity">Suspicious Activity</option>
                  </select>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Select a category for this IP address
                  </span>
                </div>

                {/* Description Textarea */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    Description
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Enter description (optional)"
                    value={addForm.description}
                    onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a", resize: "vertical" }}
                  />
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Add a short description for this IP address
                  </span>
                </div>

              </div>

              {/* ─── COLUMN 2: Access Settings ─── */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>Access Settings</h3>

                {/* Access Type Radio Group */}
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "10px" }}>
                    Access Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  
                  <div style={{ display: "grid", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="accessTypeRadio"
                        checked={addForm.accessType === "Permanent"}
                        onChange={() => setAddForm(prev => ({ ...prev, accessType: "Permanent" }))}
                        style={{ marginTop: "3px", accentColor: "#2563eb" }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>Permanent</strong>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", lineHeight: 1.25, display: "block" }}>
                          IP will remain active until manually disabled
                        </span>
                      </div>
                    </label>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="accessTypeRadio"
                        checked={addForm.accessType === "Temporary"}
                        onChange={() => setAddForm(prev => ({ ...prev, accessType: "Temporary" }))}
                        style={{ marginTop: "3px", accentColor: "#2563eb" }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>Temporary</strong>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", lineHeight: 1.25, display: "block" }}>
                          IP will expire automatically on the selected date
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Expiration Date Field */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    Expiration Date (For Temporary)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="date"
                      value={addForm.expirationDate}
                      onChange={e => setAddForm(prev => ({ ...prev, expirationDate: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a", background: "#ffffff" }}
                    />
                    <Calendar size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Select the date when this IP should expire
                  </span>
                </div>

                {/* Priority Field */}
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a", background: "#ffffff" }}
                  >
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Set priority for this IP address
                  </span>
                </div>

                {/* Status Toggle Switch */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                    Status
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setAddForm(prev => ({ ...prev, status: !prev.status }))}
                      style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        background: addForm.status ? "#2563eb" : "#cbd5e1",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background 0.2s ease",
                        padding: 0
                      }}
                    >
                      <span style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        position: "absolute",
                        top: "3px",
                        left: addForm.status ? "23px" : "3px",
                        transition: "left 0.2s ease"
                      }} />
                    </button>
                    <strong style={{ fontSize: "0.82rem", color: addForm.status ? "#0f172a" : "#64748b" }}>
                      {addForm.status ? "Active" : "Inactive"}
                    </strong>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Inactive IPs will not be applied
                  </span>
                </div>

              </div>

              {/* ─── COLUMN 3: Additional Information ─── */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>Additional Information</h3>

                  {/* Added By Field */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Added By
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={addForm.addedBy || "Admin (Super Admin)"}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#475569", background: "#f8fafc" }}
                    />
                  </div>

                  {/* Source Dropdown */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Source
                    </label>
                    <select
                      value={addForm.source}
                      onChange={e => setAddForm(prev => ({ ...prev, source: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a", background: "#ffffff" }}
                    >
                      <option value="">Select source</option>
                      <option value="Manual Entry">Manual Entry</option>
                      <option value="Security Audit">Security Audit</option>
                      <option value="System Alert">System Alert</option>
                      <option value="External Threat Feed">External Threat Feed</option>
                    </select>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                      How did you obtain this IP address?
                    </span>
                  </div>

                  {/* Tags Field */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="Enter tags and press Enter"
                      value={addForm.tags}
                      onChange={e => setAddForm(prev => ({ ...prev, tags: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a" }}
                    />
                    <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                      Add tags to help identify this IP address
                    </span>
                  </div>
                </div>

                {/* IP Address Guidelines Box (Green Subtle Card) */}
                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "10px", padding: "14px", marginTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontSize: "0.78rem", fontWeight: 700, marginBottom: "8px" }}>
                    <ShieldCheck size={16} style={{ color: "#16a34a" }} />
                    <span>IP Address Guidelines</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.7rem", color: "#15803d", lineHeight: 1.6 }}>
                    <li>Use valid IPv4 address (e.g., 192.168.1.100)</li>
                    <li>Use CIDR notation for ranges (e.g., 192.168.1.0/24)</li>
                    <li>Whitelist IPs will be allowed to access</li>
                    <li>Blacklist IPs will be blocked from accessing</li>
                  </ul>
                </div>

              </div>

            </div>

            {/* Bottom Footer Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "14px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddIpView(false);
                  setEditingRuleId(null);
                  if (normalizedPath.includes("add-ip")) navigate(-1);
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <X size={15} /> Cancel
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setAddForm({
                    ip: "",
                    type: "Whitelist",
                    category: "",
                    description: "",
                    reason: "",
                    accessType: "Permanent",
                    expirationDate: "",
                    priority: "Medium",
                    status: true,
                    addedBy: "Admin (Super Admin)",
                    source: "",
                    tags: ""
                  })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <RotateCcw size={14} /> Reset
                </button>

                <button
                  type="submit"
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#1e75ff",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(30, 117, 255, 0.25)"
                  }}
                >
                  <Save size={16} />
                  {editingRuleId ? "Save Changes" : "Add IP Address"}
                </button>
              </div>
            </div>

          </form>
        </section>
      );
    }

    // --- VIEW 2: WHITELIST / BLACKLIST / ALL IP LIST PAGE (IMAGE 2 DESIGN) ---
    return (
      <section className="admin-placeholder" style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "0 16px", background: "transparent", border: "none", boxShadow: "none" }}>
        
        {/* ─── Main Header Bar (Image 2 Design with + Add IP Button) ─── */}
        <div style={{ marginTop: "24px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {isCurrentBlacklist ? "Blacklist IP Address Management" : isCurrentWhitelist ? "Whitelist IP Address Management" : "IP Management"}
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              {isCurrentBlacklist ? "These IP addresses are blocked and not allowed to access the admin system." : isCurrentWhitelist ? "These IP addresses are trusted and allowed to access the admin system." : "Manage trusted and blocked IP addresses."}
            </p>
          </div>

          {/* Top Right Add IP Button (Image 2 Design) */}
          <button
            type="button"
            onClick={() => {
              setEditingRuleId(null);
              setAddForm({
                ip: "",
                type: isCurrentBlacklist ? "Blacklist" : "Whitelist",
                category: isCurrentBlacklist ? "Brute Force" : "Office Network",
                reason: isCurrentBlacklist ? "Brute Force" : "Office Network",
                description: "",
                accessType: "Permanent",
                expirationDate: "",
                duration: "24 Hours",
                priority: "Medium",
                status: true,
                addedBy: "Admin (Super Admin)",
                source: "",
                tags: ""
              });
              setShowAddIpView(true);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: isCurrentBlacklist ? "#ef4444" : isCurrentWhitelist ? "#16a34a" : "#1e75ff",
              color: "#ffffff",
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isCurrentBlacklist ? "0 4px 14px rgba(239, 68, 68, 0.25)" : isCurrentWhitelist ? "0 4px 14px rgba(22, 163, 74, 0.25)" : "0 4px 14px rgba(30, 117, 255, 0.25)",
              transition: "transform 0.15s ease"
            }}
          >
            <Plus size={18} />
            {isCurrentBlacklist ? "+ Add Blacklist IP" : isCurrentWhitelist ? "+ Add Whitelist IP" : "+ Add IP Address"}
          </button>
        </div>

        {/* ─── 4 Metric Statistics Cards Row (Image 2 Design) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
          
          {/* Card 1: TOTAL IPs */}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb" }}>
              <Globe size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>TOTAL IPs</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{totalIPsCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 600, marginTop: "2px" }}>↑ 12 this month</div>
            </div>
          </div>

          {/* Card 2: WHITELISTED */}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#ecfdf5", display: "grid", placeItems: "center", color: "#16a34a" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>WHITELISTED</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{whitelistedCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>↑ 8 this month</div>
            </div>
          </div>

          {/* Card 3: BLACKLISTED */}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fef2f2", display: "grid", placeItems: "center", color: "#ef4444" }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>BLACKLISTED</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{blacklistedCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600, marginTop: "2px" }}>↑ 4 this month</div>
            </div>
          </div>

          {/* Card 4: ACTIVE IPs */}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#f3e8ff", display: "grid", placeItems: "center", color: "#9333ea" }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>ACTIVE IPs</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{activeIPsCount}</div>
              <div style={{ fontSize: "0.7rem", color: "#9333ea", fontWeight: 600, marginTop: "2px" }}>Today</div>
            </div>
          </div>
        </div>

        {/* ─── Search & Filter Bar (Image 2 Design with Reset Button) ─── */}
        <div style={{ background: "#ffffff", padding: "14px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, flexWrap: "wrap" }}>
            {/* Search Box */}
            <div style={{ position: "relative", minWidth: "280px" }}>
              <input
                type="text"
                placeholder="Search IP address or description..."
                value={ipSearch}
                onChange={e => { setIpSearch(e.target.value); setIpPage(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", color: "#0f172a" }}
              />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <Search size={15} />
              </span>
            </div>

            {/* Type Dropdown */}
            <select
              value={ipFilter}
              onChange={e => { setIpFilter(e.target.value); setIpPage(1); }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", color: "#0f172a", outline: "none", background: "#ffffff", cursor: "pointer" }}
            >
              <option value="All">Type: All</option>
              <option value="Whitelist">Type: Whitelist</option>
              <option value="Blacklist">Type: Blacklist</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={ipStatusFilter}
              onChange={e => { setIpStatusFilter(e.target.value); setIpPage(1); }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", color: "#0f172a", outline: "none", background: "#ffffff", cursor: "pointer" }}
            >
              <option value="All">Status: All</option>
              <option value="Active">Status: Active</option>
              <option value="Expiring Soon">Status: Expiring Soon</option>
              <option value="Blocked">Status: Blocked / Inactive</option>
            </select>

            {/* Date Dropdown */}
            <select
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", color: "#0f172a", outline: "none", background: "#ffffff", cursor: "pointer" }}
            >
              <option value="All">Date: All</option>
              <option value="Today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                setIpSearch("");
                setIpFilter("All");
                setIpStatusFilter("All");
                setIpPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* ─── Segmented Pills Tab Switcher Row (All IPs, Whitelist, Blacklist) ─── */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <button
            type="button"
            className="ip-tab-btn all-tab"
            onClick={() => { setIpFilter("All"); setIpPage(1); }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              border: ipFilter === "All" ? "1.5px solid #1e75ff" : "1.5px solid #cbd5e1",
              background: ipFilter === "All" ? "#1e75ff" : "#ffffff",
              color: ipFilter === "All" ? "#ffffff" : "#0f172a",
              boxShadow: ipFilter === "All" ? "0 2px 8px rgba(30, 117, 255, 0.25)" : "none"
            }}
          >
            All IPs ({totalIPsCount})
          </button>

          <button
            type="button"
            className="ip-tab-btn whitelist-tab"
            onClick={() => { setIpFilter("Whitelist"); setIpPage(1); }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              border: ipFilter === "Whitelist" ? "1.5px solid #16a34a" : "1.5px solid #86efac",
              background: ipFilter === "Whitelist" ? "#16a34a" : "#ecfdf5",
              color: ipFilter === "Whitelist" ? "#ffffff" : "#15803d",
              boxShadow: ipFilter === "Whitelist" ? "0 2px 8px rgba(22, 163, 74, 0.25)" : "none"
            }}
          >
            ● Whitelist ({whitelistedCount})
          </button>

          <button
            type="button"
            className="ip-tab-btn blacklist-tab"
            onClick={() => { setIpFilter("Blacklist"); setIpPage(1); }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              border: ipFilter === "Blacklist" ? "1.5px solid #ef4444" : "1.5px solid #fca5a5",
              background: ipFilter === "Blacklist" ? "#ef4444" : "#fef2f2",
              color: ipFilter === "Blacklist" ? "#ffffff" : "#b91c1c",
              boxShadow: ipFilter === "Blacklist" ? "0 2px 8px rgba(239, 68, 68, 0.25)" : "none"
            }}
          >
            ● Blacklist ({blacklistedCount})
          </button>
        </div>

        {/* ─── Dynamic Data Table (Roseberry Maroon Header #A51C49 & Image 2 Columns) ─── */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", marginBottom: "24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", borderBottom: "1px solid #851237" }}>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>IP ADDRESS</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>TYPE</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>REASON</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>STATUS</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>ADDED ON</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>ADDED BY</th>
                <th style={{ padding: "12px 16px", background: "#A51C49", backgroundColor: "#A51C49", color: "#ffffff", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "32px", textAlign: "center", color: "#64748b", fontWeight: 500 }}>
                    No IP address records found matching current search criteria.
                  </td>
                </tr>
              ) : (
                paginatedRules.map((r, idx) => {
                  const isWh = r.type === "Whitelist";

                  return (
                    <tr key={r.id || idx} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 600, fontFamily: "monospace", fontSize: "0.82rem" }}>
                        {r.ip}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          display: "inline-block",
                          letterSpacing: "0.03em",
                          background: isWh ? "#dcfce7" : "#fee2e2",
                          color: isWh ? "#15803d" : "#b91c1c"
                        }}>
                          {isWh ? "WHITELIST" : "BLACKLIST"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155", fontWeight: 500 }}>
                        {r.reason || r.description || "Office Network"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          color: r.status === "Blocked" ? "#dc2626" : r.status === "Expiring Soon" ? "#ea580c" : "#16a34a"
                        }}>
                          <span style={{ fontSize: "0.6rem" }}>●</span> {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 500 }}>
                        {r.addedOn || "12 May 2024, 10:30 AM"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155", fontWeight: 500 }}>
                        {r.addedBy || "Admin"}
                      </td>

                      {/* Action Pencil & Trash Icons */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "12px", justifyContent: "center", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "4px",
                              cursor: "pointer",
                              color: "#ea580c",
                              display: "inline-flex"
                            }}
                            title="Edit IP Rule"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete IP ${r.ip}?`)) {
                                const updated = ipRules.filter(item => item.id !== r.id);
                                handleSaveIpRules(updated);
                                showToast(`IP ${r.ip} removed.`, "success");
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "4px",
                              cursor: "pointer",
                              color: "#ef4444",
                              display: "inline-flex"
                            }}
                            title="Delete IP Rule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ─── Table Pagination Footer (Image 2 Design) ─── */}
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", background: "#ffffff", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
              Showing {showingFrom} to {showingTo} of {filteredRules.length} results
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select
                value={ipRowsPerPage}
                onChange={e => { setIpRowsPerPage(Number(e.target.value)); setIpPage(1); }}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.75rem", outline: "none", cursor: "pointer", background: "#fff" }}
              >
                <option value="5">5 / page</option>
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
              </select>

              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setIpPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    cursor: currentPage === 1 ? "default" : "pointer",
                    color: currentPage === 1 ? "#cbd5e1" : "#334155"
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pageNum => {
                  const isActive = pageNum === currentPage;
                  const btnColor = isCurrentBlacklist ? "#ef4444" : isCurrentWhitelist ? "#16a34a" : "#2563eb";
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setIpPage(pageNum)}
                      style={{
                        minWidth: "30px",
                        height: "30px",
                        padding: "0 8px",
                        borderRadius: "6px",
                        border: isActive ? "none" : "1px solid #cbd5e1",
                        background: isActive ? btnColor : "#ffffff",
                        color: isActive ? "#ffffff" : "#334155",
                        fontWeight: isActive ? 700 : 500,
                        fontSize: "0.78rem",
                        cursor: "pointer"
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIpPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    cursor: currentPage === totalPages ? "default" : "pointer",
                    color: currentPage === totalPages ? "#cbd5e1" : "#334155"
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>






        {/* ─── Right Slide-over Drawer Panel (Matching Image 2) ─── */}
        {showAddIpView && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => { setShowAddIpView(false); setEditingRuleId(null); }}
              style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", zIndex: 9998, backdropFilter: "blur(2px)" }}
            />

            {/* Drawer Container */}
            <div style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "380px",
              maxWidth: "90vw",
              background: "#ffffff",
              boxShadow: "-6px 0 24px rgba(0, 0, 0, 0.15)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.2s ease-out"
            }}>
              {/* Drawer Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    {editingRuleId ? "Edit IP Address" : "Add IP Address"}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.35 }}>
                    Add a trusted or blocked IP address to your security list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddIpView(false); setEditingRuleId(null); }}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px", marginTop: "-2px" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={(e) => {
                e.preventDefault();
                const ipTrim = addForm.ip.trim();
                const cidrOrIpPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
                if (!ipTrim || !cidrOrIpPattern.test(ipTrim)) {
                  showToast("Please enter a valid IPv4 address or CIDR range (e.g. 192.168.1.100 or 192.168.1.0/24)", "error");
                  return;
                }

                if (editingRuleId) {
                  const updatedRules = ipRules.map(r => r.id === editingRuleId ? {
                    ...r,
                    ip: ipTrim,
                    type: addForm.type,
                    category: addForm.reason || addForm.category || "Office Network",
                    reason: addForm.reason || addForm.category || "Office Network",
                    description: addForm.description.trim() || "IP access rule",
                    status: addForm.status ? (addForm.type === "Whitelist" ? "Active" : "Blocked") : "Inactive"
                  } : r);
                  handleSaveIpRules(updatedRules);
                  showToast(`IP Address ${ipTrim} updated successfully!`, "success");
                  setEditingRuleId(null);
                } else {
                  const newRule = {
                    id: Date.now(),
                    ip: ipTrim,
                    type: addForm.type,
                    category: addForm.reason || addForm.category || "Office Network",
                    reason: addForm.reason || addForm.category || "Office Network",
                    description: addForm.description.trim() || "IP access rule",
                    status: addForm.status ? (addForm.type === "Whitelist" ? "Active" : "Blocked") : "Inactive",
                    addedBy: addForm.addedBy || "Admin",
                    addedOn: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                    timestamp: new Date().toISOString()
                  };
                  const updatedRules = [newRule, ...ipRules];
                  handleSaveIpRules(updatedRules);
                  showToast(`IP Address ${ipTrim} added to ${addForm.type} successfully!`, "success");
                }

                setShowAddIpView(false);
              }} style={{ padding: "20px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                
                <div>
                  {/* IP Address Field */}
                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      IP Address <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 192.168.1.100"
                      value={addForm.ip}
                      onChange={e => setAddForm(prev => ({ ...prev, ip: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a" }}
                    />
                  </div>

                  {/* Type Dropdown */}
                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Type <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={addForm.type}
                        onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a", background: "#ffffff" }}
                      >
                        <option value="Whitelist">Whitelist</option>
                        <option value="Blacklist">Blacklist</option>
                      </select>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: addForm.type === "Whitelist" ? "#16a34a" : "#ef4444" }}>
                        {addForm.type === "Whitelist" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      </span>
                    </div>
                  </div>

                  {/* Reason Field */}
                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Reason <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Office Network"
                      value={addForm.reason || addForm.category}
                      onChange={e => setAddForm(prev => ({ ...prev, reason: e.target.value, category: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a" }}
                    />
                  </div>

                  {/* Description (Optional) */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                      Description (Optional)
                    </label>
                    <textarea
                      rows="4"
                      placeholder="Enter description..."
                      value={addForm.description}
                      onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", color: "#0f172a", resize: "vertical" }}
                    />
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                  <button
                    type="button"
                    onClick={() => { setShowAddIpView(false); setEditingRuleId(null); }}
                    style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "#1e75ff", color: "#ffffff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(30, 117, 255, 0.25)" }}
                  >
                    Save IP
                  </button>
                </div>

              </form>
            </div>
          </>
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
  const isSocialLinks = normalizedPath.includes("social-links") || title === "Social Links";
  const isHomeSlider = normalizedPath.includes("slider-image") || title === "Slider Image" || title.includes("Slider") || normalizedPath.includes("home-slider");
  const isManualSuppliers = normalizedPath.includes("manual-booking-supplier") || title === "Manual Booking Supplier" || normalizedPath.includes("manual-supplier");
  const isMetaData = normalizedPath.includes("meta-data-list") || title === "Meta Data List" || normalizedPath.includes("seo-meta-data");
  const isSeoLinks = normalizedPath.includes("seo-link-list") || title === "Seo Link List" || normalizedPath.includes("seo-links");

  let pageTitle = title;
  let pageSubtitle = `Home > Site Management > ${title}`;
  let addBtnText = "Add Entry";

  if (isSocialLinks) {
    pageTitle = "Social Links";
    pageSubtitle = "Home > Site Management > Social Links";
    addBtnText = "Add Social Link";
  } else if (isHomeSlider) {
    pageTitle = "Home Slider";
    pageSubtitle = "Home > Site Management > Home Slider";
    addBtnText = "Add Home Slider";
  } else if (isManualSuppliers) {
    pageTitle = "Manual Booking Suppliers";
    pageSubtitle = "Home > Site Management > Manual Booking Suppliers";
    addBtnText = "Add Supplier";
  } else if (isMetaData) {
    pageTitle = "SEO / Meta Data";
    pageSubtitle = "Home > Site Management > SEO / Meta Data";
    addBtnText = "Add Meta Data";
  } else if (isSeoLinks) {
    pageTitle = "SEO Links";
    pageSubtitle = "Home > Site Management > SEO Links";
    addBtnText = "Add SEO Link";
  }

  // Generic Pagination calculations
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / genericRowsPerPage);
  const currentPage = Math.min(genericPage, totalPages || 1);
  const startIndex = (currentPage - 1) * genericRowsPerPage;
  const endIndex = Math.min(startIndex + genericRowsPerPage, totalItems);
  const paginatedItems = items.slice(startIndex, endIndex);

  const showingFrom = totalItems === 0 ? 0 : startIndex + 1;
  const showingTo = endIndex;

  const handleCrudSave = () => {
    if (!editItem) return;
    
    // Validations
    if (isSocialLinks && !editItem.platform) {
      setCrudError("Platform is required.");
      return;
    }
    if (isHomeSlider && !editItem.title) {
      setCrudError("Title is required.");
      return;
    }
    if (isManualSuppliers && !editItem.supplierName) {
      setCrudError("Supplier Name is required.");
      return;
    }
    if (isMetaData && !editItem.pageName) {
      setCrudError("Page Name is required.");
      return;
    }
    if (isSeoLinks && !editItem.pageKeyword) {
      setCrudError("Page Keyword is required.");
      return;
    }
    if (!isSocialLinks && !isHomeSlider && !isManualSuppliers && !isMetaData && !isSeoLinks && !editItem.label) {
      setCrudError("Title is required.");
      return;
    }

    if (editItem.isNew) {
      // Add action
      let newRecord = { 
        id: Date.now(), 
        updatedAt: new Date().toISOString(),
        status: editItem.status || "Active"
      };
      if (isSocialLinks) {
        newRecord = {
          ...newRecord,
          platform: editItem.platform,
          icon: editItem.platform,
          url: editItem.url || "",
          displayOrder: Number(editItem.displayOrder || 1)
        };
      } else if (isHomeSlider) {
        newRecord = {
          ...newRecord,
          image: editItem.image || "explore.jpg",
          imageMobile: editItem.imageMobile || "explore-mobile.jpg",
          title: editItem.title,
          subtitle: editItem.subtitle || "",
          description: editItem.description || "",
          buttonText: editItem.buttonText || "",
          buttonUrl: editItem.buttonUrl || "",
          displayOrder: Number(editItem.displayOrder || 1),
          startDate: editItem.startDate || new Date().toISOString().split("T")[0],
          endDate: editItem.endDate || new Date().toISOString().split("T")[0]
        };
      } else if (isManualSuppliers) {
        newRecord = {
          ...newRecord,
          supplierName: editItem.supplierName,
          contactPerson: editItem.contactPerson || "",
          phone: editItem.phone || "",
          email: editItem.email || ""
        };
      } else if (isMetaData) {
        newRecord = {
          ...newRecord,
          pageName: editItem.pageName,
          metaTitle: editItem.metaTitle || "",
          metaDescription: editItem.metaDescription || ""
        };
      } else if (isSeoLinks) {
        newRecord = {
          ...newRecord,
          pageKeyword: editItem.pageKeyword,
          seoUrl: editItem.seoUrl || "",
          redirectType: editItem.redirectType || "301 Permanent",
          description: editItem.description || ""
        };
      } else {
        newRecord = {
          ...newRecord,
          label: editItem.label,
          note: editItem.note || ""
        };
      }
      setItems(prev => [newRecord, ...prev]);
      showToast("Entry added successfully!", "success");
    } else {
      // Edit action
      setItems(prev => prev.map(item => item.id === editItem.id ? { ...item, ...editItem, updatedAt: new Date().toISOString() } : item));
      showToast("Entry updated successfully!", "success");
    }
    
    setEditItem(null);
    setCrudError("");
  };

  return (
    <section className="admin-placeholder" style={{ maxWidth: "100%", width: "100%", margin: "0 auto 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <p className="admin-placeholder-kicker" style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{pageSubtitle}</p>
          <h1 className="admin-placeholder-title" style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>{pageTitle}</h1>
        </div>
        <button
          type="button"
          onClick={() => setEditItem({ ...INITIAL_FORM_VALUES, isNew: true })}
          style={{
            background: "#A51C49",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)",
            transition: "all 0.2s ease"
          }}
        >
          <Plus size={16} />
          {addBtnText}
        </button>
      </div>

      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#A51C49", color: "#ffffff" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, width: "60px" }}>#</th>
              {isSocialLinks && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Platform</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Icon</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>URL</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Display Order</th>
                </>
              )}
              {isHomeSlider && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Image</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Title</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Display Order</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Start Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>End Date</th>
                </>
              )}
              {isManualSuppliers && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Supplier Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Contact Person</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Phone</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Email</th>
                </>
              )}
              {isMetaData && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Page Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Meta Title</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Meta Description</th>
                </>
              )}
              {isSeoLinks && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Page / Keyword</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>SEO Friendly URL</th>
                </>
              )}
              {!isSocialLinks && !isHomeSlider && !isManualSuppliers && !isMetaData && !isSeoLinks && (
                <>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Title</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Note</th>
                </>
              )}
              <th style={{ padding: "12px 16px", fontWeight: 600, width: "100px" }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, width: "100px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                  No entries recorded. Click the button to add a record.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const globalIndex = startIndex + idx + 1;
                const isActive = item.status === "Active" || item.status === "active";
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", color: "#475569", fontWeight: 500 }}>{globalIndex}</td>
                    {isSocialLinks && (
                      <>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.platform}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            background: item.platform === "Facebook" ? "#3b5998" : item.platform === "Instagram" ? "#e1306c" : item.platform === "Twitter" ? "#1da1f2" : item.platform === "Linkedin" ? "#0077b5" : "#ff0000",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "0.78rem"
                          }}>
                            {String(item.platform || "").substring(0, 2).toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#2563eb", textDecoration: "underline" }}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{item.displayOrder}</td>
                      </>
                    )}
                    {isHomeSlider && (
                      <>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b", fontSize: "0.68rem" }}>
                            Img
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.title}</td>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{item.displayOrder}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.startDate}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.endDate}</td>
                      </>
                    )}
                    {isManualSuppliers && (
                      <>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.supplierName}</td>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{item.contactPerson}</td>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{item.phone}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.email}</td>
                      </>
                    )}
                    {isMetaData && (
                      <>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.pageName}</td>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{item.metaTitle}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.metaDescription}</td>
                      </>
                    )}
                    {isSeoLinks && (
                      <>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.pageKeyword}</td>
                        <td style={{ padding: "12px 16px", color: "#16a34a", fontWeight: 600 }}>{item.seoUrl}</td>
                      </>
                    )}
                    {!isSocialLinks && !isHomeSlider && !isManualSuppliers && !isMetaData && !isSeoLinks && (
                      <>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{item.label}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.note}</td>
                      </>
                    )}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: isActive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: isActive ? "#16a34a" : "#ef4444"
                      }}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditItem(item)}
                          style={{
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            padding: "6px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#475569"
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCrudDelete(item.id)}
                          style={{
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            background: "rgba(239, 68, 68, 0.05)",
                            padding: "6px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#ef4444"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Pagination Footer */}
        {totalPages >= 1 && (
          <div style={{
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            flexWrap: "wrap",
            gap: "12px",
            borderRadius: "0 0 14px 14px"
          }}>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
              Showing {showingFrom} to {showingTo} of {totalItems} entries
            </div>

            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setGenericPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  cursor: currentPage === 1 ? "default" : "pointer",
                  color: currentPage === 1 ? "#cbd5e1" : "#334155"
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setGenericPage(pageNum)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      border: isActive ? "none" : "1px solid #e2e8f0",
                      background: isActive ? "#A51C49" : "#ffffff",
                      color: isActive ? "#ffffff" : "#334155",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.78rem",
                      cursor: "pointer"
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setGenericPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  cursor: currentPage === totalPages ? "default" : "pointer",
                  color: currentPage === totalPages ? "#cbd5e1" : "#334155"
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {editItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", zIndex: 9998, backdropFilter: "blur(2px)", display: "grid", placeItems: "center" }} onClick={() => setEditItem(null)}>
          <div style={{ background: "#ffffff", borderRadius: "14px", width: "90%", maxWidth: "500px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", position: "relative", zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                {editItem.isNew ? `Add New Entry` : `Edit Entry Details`}
              </h3>
              <button type="button" onClick={() => setEditItem(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "16px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
              {isSocialLinks && (
                <>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    PLATFORM
                    <select
                      value={editItem.platform || "Facebook"}
                      onChange={e => setEditItem(prev => ({ ...prev, platform: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Linkedin">Linkedin</option>
                      <option value="YouTube">YouTube</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    SOCIAL URL
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editItem.url || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, url: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    DISPLAY ORDER
                    <input
                      type="number"
                      placeholder="1"
                      value={editItem.displayOrder || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, displayOrder: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                </>
              )}

              {isHomeSlider && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>Slider Image (Desktop)</span>
                      <div style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "16px", textAlign: "center", background: "#f8fafc", cursor: "pointer" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Click to upload or drag and drop</span>
                        <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>PNG, JPG, JPEG (Max 2MB)</span>
                        <input
                          type="text"
                          placeholder="explore.jpg"
                          value={editItem.image || ""}
                          onChange={e => setEditItem(prev => ({ ...prev, image: e.target.value }))}
                          style={{ marginTop: "8px", width: "100%", padding: "4px 8px", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>Slider Image (Mobile)</span>
                      <div style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "16px", textAlign: "center", background: "#f8fafc", cursor: "pointer" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Click to upload or drag and drop</span>
                        <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>PNG, JPG, JPEG (Max 2MB)</span>
                        <input
                          type="text"
                          placeholder="explore-mobile.jpg"
                          value={editItem.imageMobile || ""}
                          onChange={e => setEditItem(prev => ({ ...prev, imageMobile: e.target.value }))}
                          style={{ marginTop: "8px", width: "100%", padding: "4px 8px", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      TITLE *
                      <input
                        type="text"
                        placeholder="Enter title"
                        value={editItem.title || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, title: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      BUTTON TEXT
                      <input
                        type="text"
                        placeholder="Enter button text"
                        value={editItem.buttonText || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, buttonText: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      SUBTITLE
                      <input
                        type="text"
                        placeholder="Enter subtitle"
                        value={editItem.subtitle || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, subtitle: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      BUTTON URL
                      <input
                        type="text"
                        placeholder="Enter button url"
                        value={editItem.buttonUrl || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, buttonUrl: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    DESCRIPTION
                    <textarea
                      placeholder="Enter description"
                      rows={3}
                      value={editItem.description || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, description: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", resize: "none" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    DISPLAY ORDER *
                    <input
                      type="number"
                      placeholder="Enter order"
                      value={editItem.displayOrder || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, displayOrder: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      START DATE
                      <input
                        type="date"
                        value={editItem.startDate || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, startDate: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      END DATE
                      <input
                        type="date"
                        value={editItem.endDate || ""}
                        onChange={e => setEditItem(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                      />
                    </label>
                  </div>
                </>
              )}

              {isManualSuppliers && (
                <>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    SUPPLIER NAME
                    <input
                      type="text"
                      placeholder="Global Connect..."
                      value={editItem.supplierName || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, supplierName: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    CONTACT PERSON
                    <input
                      type="text"
                      placeholder="Ravi Kumar"
                      value={editItem.contactPerson || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, contactPerson: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    PHONE
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={editItem.phone || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    EMAIL ADDRESS
                    <input
                      type="email"
                      placeholder="info@..."
                      value={editItem.email || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, email: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                </>
              )}

              {isMetaData && (
                <>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    PAGE NAME
                    <input
                      type="text"
                      placeholder="Home Page"
                      value={editItem.pageName || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, pageName: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    META TITLE
                    <input
                      type="text"
                      placeholder="Best Travel..."
                      value={editItem.metaTitle || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, metaTitle: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    META DESCRIPTION
                    <textarea
                      placeholder="Enter description..."
                      rows={3}
                      value={editItem.metaDescription || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, metaDescription: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem", resize: "none" }}
                    />
                  </label>
                </>
              )}

              {isSeoLinks && (
                <>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    PAGE / KEYWORD
                    <input
                      type="text"
                      placeholder="Flights"
                      value={editItem.pageKeyword || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, pageKeyword: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    SEO FRIENDLY URL
                    <input
                      type="text"
                      placeholder="/flights"
                      value={editItem.seoUrl || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, seoUrl: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                </>
              )}

              {!isSocialLinks && !isHomeSlider && !isManualSuppliers && !isMetaData && !isSeoLinks && (
                <>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    TITLE
                    <input
                      type="text"
                      placeholder="Enter title"
                      value={editItem.label || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, label: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                    NOTE
                    <input
                      type="text"
                      placeholder="Enter note"
                      value={editItem.note || ""}
                      onChange={e => setEditItem(prev => ({ ...prev, note: e.target.value }))}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                    />
                  </label>
                </>
              )}

              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                STATUS
                <select
                  value={editItem.status || "Active"}
                  onChange={e => setEditItem(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.88rem" }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            {crudError && (
              <p style={{ margin: "12px 0 0", color: "#ef4444", fontSize: "0.78rem", fontWeight: "bold" }}>⚠️ {crudError}</p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.82rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCrudSave}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#A51C49",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  boxShadow: "0 4px 12px rgba(165, 28, 73, 0.15)"
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
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
