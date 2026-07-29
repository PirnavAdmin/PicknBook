/* eslint-disable */
// B2B Admin Centralized API & Storage Service

const FALLBACK_API_BASE_URL = "https://undogmatically-knotlike-evita.ngrok-free.dev";

function resolveApiBaseUrl() {
  const explicitBase = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_ADMIN_API_BASE_URL;
  if (explicitBase && explicitBase.trim()) return explicitBase.trim();
  return FALLBACK_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

function getAdminAuthHeaders() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// LocalStorage Keys for elements without direct REST endpoints
const DEPOSITS_KEY = 'b2b_deposits';
const MARKUPS_KEY = 'b2b_markups';
const LOGS_KEY = 'b2b_logs';
const SETTINGS_KEY = 'b2b_settings';
const WALLET_HISTORY_KEY = 'b2b_wallet_history';

const initializeEmptyStorage = () => {
  const deps = localStorage.getItem(DEPOSITS_KEY);
  if (deps && deps.includes("dep-501")) {
    localStorage.removeItem(DEPOSITS_KEY);
  }
  const logs = localStorage.getItem(LOGS_KEY);
  if (logs && logs.includes("log-001")) {
    localStorage.removeItem(LOGS_KEY);
  }
  const markups = localStorage.getItem(MARKUPS_KEY);
  if (markups && markups.includes("Domestic Flight")) {
    localStorage.removeItem(MARKUPS_KEY);
  }
  const settings = localStorage.getItem(SETTINGS_KEY);
  if (settings && settings.includes("Bronze")) {
    localStorage.removeItem(SETTINGS_KEY);
  }
  const wallet = localStorage.getItem(WALLET_HISTORY_KEY);
  if (wallet && wallet.includes("wlt-901")) {
    localStorage.removeItem(WALLET_HISTORY_KEY);
  }

  if (!localStorage.getItem(DEPOSITS_KEY)) localStorage.setItem(DEPOSITS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(MARKUPS_KEY)) localStorage.setItem(MARKUPS_KEY, JSON.stringify({
    flight: [],
    bus: [],
    hotel: [],
    agentWise: []
  }));
  if (!localStorage.getItem(LOGS_KEY)) localStorage.setItem(LOGS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(SETTINGS_KEY)) localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    membership: [],
    gst: { flight: 0, bus: 0, hotel: 0 },
    convenienceFee: { flight: 0, bus: 0, hotel: 0 },
    paymentGateway: { activeProvider: '', merchantId: '', testMode: true }
  }));
  if (!localStorage.getItem(WALLET_HISTORY_KEY)) localStorage.setItem(WALLET_HISTORY_KEY, JSON.stringify([]));
};

initializeEmptyStorage();

const getItem = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setItem = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const b2bAdminService = {
  decorateHeaders: (headers) => {
    const apiBase = resolveApiBaseUrl();
    if (apiBase.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }
    return headers;
  },

  // ================= 1. DASHBOARD STATISTICS & RECENT ACTIVITY =================

  getB2bStats: async () => {
    const url = `${API_BASE_URL}/api/admin/b2b/dashboard/stats`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load B2B statistics from server. (Status: ${res.status})`);
    }
    return res.json();
  },

  getB2bActivities: async () => {
    const url = `${API_BASE_URL}/api/admin/b2b/dashboard/activities`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load B2B activities log from server. (Status: ${res.status})`);
    }
    return res.json();
  },

  // ================= 2. B2B AGENT MANAGEMENT =================

  getAgents: async (status, search) => {
    const params = new URLSearchParams();
    if (status && status !== 'All') {
      params.set('status', status);
    }
    if (search) {
      params.set('search', search);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const url = `${API_BASE_URL}/api/admin/agents${queryStr}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load B2B agents directory. (Status: ${res.status})`);
    }
    return res.json();
  },

  getAgentById: async (id) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to retrieve agent profile. (Status: ${res.status})`);
    }
    return res.json();
  },

  createAgent: async (agentPayload) => {
    const url = `${API_BASE_URL}/api/admin/agents`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(agentPayload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to manually onboarding agent. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Manually onboarded agent: ${agentPayload.companyName}`);
    return res.json();
  },

  updateAgent: async (id, agentPayload) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(agentPayload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to edit agent info. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Updated agent details for agent ID ${id}`);
    return res.json();
  },

  updateAgentStatus: async (id, status) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/status`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update agent status. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Updated agent status for ID ${id} to ${status}`);
    return res.json();
  },

  updateAgentWalletStatus: async (id, walletStatus) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/wallet-status`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ walletStatus })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update wallet status. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Updated agent wallet status for ID ${id} to ${walletStatus}`);
    return res.json();
  },

  suspendAgent: async (id) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to suspend agent account. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Suspended agent ID ${id}`);
    return res.json();
  },

  updateMembershipTier: async (id, membershipTier) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/membership`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ membershipTier })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update membership tier. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Updated membership tier for agent ID ${id} to ${membershipTier}`);
    return res.json();
  },

  updateCreditLimit: async (id, creditLimit) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/credit-limit`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ creditLimit: Number(creditLimit) })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update credit limit. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Updated credit limit for agent ID ${id} to ${creditLimit}`);
    return res.json();
  },

  // ================= 3. WALLET BALANCE MANUAL ADJUSTMENTS =================

  adjustAgentWalletBalance: async (id, { amount, action, remark }) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/wallet/adjust`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: Number(amount), action, remark })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to adjust wallet balance. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Wallet balance ${action} adjusted by ${amount} for agent ID ${id}`);
    return res.json();
  },

  // ================= 4. FINANCIAL AUDIT LEDGER & BOOKINGS =================

  getAgentLedger: async (id) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/ledger`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load ledger records. (Status: ${res.status})`);
    }
    return res.json();
  },

  getAgentMarkups: async (id) => {
    const url = `${API_BASE_URL}/api/admin/agents/${id}/markups`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to retrieve agent client markup settings. (Status: ${res.status})`);
    }
    return res.json();
  },

  getB2bBookingsList: async (agentName) => {
    const queryStr = agentName ? `?agentName=${encodeURIComponent(agentName)}` : '';
    const url = `${API_BASE_URL}/api/admin/b2b/bookings${queryStr}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load B2B bookings list. (Status: ${res.status})`);
    }
    return res.json();
  },

  // ================= 5. COMMISSION MANAGEMENT RULES =================

  getCommissionRules: async () => {
    const url = `${API_BASE_URL}/api/admin/b2b/commissions`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load commission rules list. (Status: ${res.status})`);
    }
    return res.json();
  },

  createCommissionRule: async (rule) => {
    const url = `${API_BASE_URL}/api/admin/b2b/commissions`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create commission rule. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Created commission rule: ${rule.membershipTier} - ${rule.serviceType}`);
    return res.json();
  },

  editCommissionRule: async (id, rule) => {
    const url = `${API_BASE_URL}/api/admin/b2b/commissions/${id}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to edit commission rule. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Edited commission rule ID ${id}`);
    return res.json();
  },

  deleteCommissionRule: async (id) => {
    const url = `${API_BASE_URL}/api/admin/b2b/commissions/${id}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to delete commission rule. (Status: ${res.status})`);
    }
    b2bAdminService.addLog('Activity', `Deleted commission rule ID ${id}`);
    return res.json();
  },

  // ================= 3. DEPOSIT REQUESTS (AGENT TOP-UPS) =================
  getDeposits: async (status, type, search) => {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.set('status', status);
    if (type && type !== 'All') params.set('type', type);
    if (search) params.set('search', search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const url = `${API_BASE_URL}/api/admin/deposits${queryStr}`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load deposits list. (Status: ${res.status})`);
    }
    return res.json();
  },

  cycleDepositStatus: async (id) => {
    const url = `${API_BASE_URL}/api/admin/deposits/${id}/status`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers
    });
    if (!res.ok) {
      throw new Error(`Failed to cycle deposit status. (Status: ${res.status})`);
    }
    return res.json();
  },

  updateDepositRemark: async (id, adminRemark) => {
    const url = `${API_BASE_URL}/api/admin/deposits/${id}/remark`;
    const headers = b2bAdminService.decorateHeaders(getAdminAuthHeaders());

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ adminRemark })
    });
    if (!res.ok) {
      throw new Error(`Failed to update deposit remark. (Status: ${res.status})`);
    }
    return res.json();
  },

  approveDepositRequest: async (depositId) => {
    return b2bAdminService.cycleDepositStatus(depositId);
  },

  rejectDepositRequest: async (depositId) => {
    // Cycles: Pending -> Approved -> Rejected
    await b2bAdminService.cycleDepositStatus(depositId);
    return b2bAdminService.cycleDepositStatus(depositId);
  },

  getLogs: () => getItem(LOGS_KEY),
  addLog: (type, details, user = 'Admin') => {
    const logs = getItem(LOGS_KEY) || [];
    const newLog = {
      id: `log-${Date.now()}`,
      type,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user,
      details
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop();
    setItem(LOGS_KEY, logs);
    return newLog;
  },

  getWalletHistory: () => getItem(WALLET_HISTORY_KEY),

  getMarkups: () => getItem(MARKUPS_KEY),
  updateMarkups: (markups) => {
    setItem(MARKUPS_KEY, markups);
    b2bAdminService.addLog('Activity', 'Updated B2B markup parameters.');
  },

  getSettings: () => getItem(SETTINGS_KEY),
  updateSettings: (settings) => {
    setItem(SETTINGS_KEY, settings);
    b2bAdminService.addLog('Activity', 'Updated B2B settings.');
  }
};
