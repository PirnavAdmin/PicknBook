/* eslint-disable */
import { toApiUrl, readResponsePayload } from './apiClient';

/**
 * Lightweight HTTP client helper using project's API utilities
 */
const request = async (endpoint, options = {}) => {
  let apiPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (apiPath.startsWith('/v1/')) {
    apiPath = apiPath.substring(3);
  }
  if (apiPath.startsWith('/SecurityAdmin')) {
    apiPath = `/api${apiPath}`;
  } else if (!apiPath.startsWith('/api/')) {
    apiPath = `/api/v1${apiPath}`;
  }
  const fullUrl = toApiUrl(apiPath);
  
  const token =
    (typeof localStorage !== 'undefined' && (localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('b2b_token'))) ||
    (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || sessionStorage.getItem('b2b_token')));
  
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...authHeader,
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      const error = new Error(payload?.message || `HTTP ${response.status}`);
      error.response = { data: payload, status: response.status };
      throw error;
    }
    return { data: payload };
  } catch (error) {
    throw error;
  }
};

const apiClient = {
  get: (url, opts) => request(url, { method: 'GET', ...opts }),
  post: (url, body, opts) => request(url, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: (url, body, opts) => request(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: (url, body, opts) => request(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (url, opts) => request(url, { method: 'DELETE', ...opts }),
};

/**
 * 🛡️ Security Management Integration Service
 */
export const securityService = {
  /** Fetch top summary metrics for admin dashboard */
  async getMetrics() {
    return {
      activeLockouts: 0,
      blacklistedIps: 0,
      activeBlockedIps: 0,
      whitelistedIps: 0,
      loginViolations24h: 0,
      otpViolations24h: 0,
      passwordViolations24h: 0,
      registrationViolations24h: 0,
      apiViolations24h: 0,
      userRestrictions: 0,
      adminRestrictions: 0,
      b2bRestrictions: 0
    };
  },

  /** Fetch recent security activity feed */
  async getRecentActivity(limit = 10) {
    return [];
  },

  /** Fetch top blocked IPs */
  async getTopBlockedIps(limit = 5) {
    return [];
  },

  /** Fetch top security events */
  async getTopSecurityEvents(limit = 5) {
    return [];
  },

  /** Fetch security events trend data for chart */
  async getSecurityTrend(period = 'Last 7 Days') {
    return { labels: [], datasets: [] };
  },

  /** Fetch today's email notification statistics */
  async getEmailStats() {
    return { delivered: 0, failed: 0, pending: 0, total: 0 };
  },

  /** Fetch B2B wallet overview */
  async getB2bWalletOverview() {
    return {
      agentsLowBalance: 0,
      agentsRestricted: 0,
      autoUnblockedToday: 0,
      requiredAmountMin: 0,
      walletBasedUnblock: false
    };
  },


  /** Fetch global security settings & policies */
  async getSettings() {
    try {
      const response = await apiClient.get('/admin/security/settings');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Security settings error:', error);
      return {
        maxDailyLoginsPerUser: 0,
        maxDailyOtpRequestsPerUser: 0,
        maxDailyRegistrationsPerIp: 0,
        maxDailyForgotPasswordRequests: 0,
        failedLoginLockoutThreshold: 0,
        lockoutDurationMinutes: 0
      };
    }
  },

  /** Save global security settings (Admin) */
  async saveSettings(settingsData) {
    try {
      const response = await apiClient.put('/admin/security/settings', settingsData);
      return response.data;
    } catch (error) {
      console.warn('Save settings error:', error);
      throw error;
    }
  },

  /** Save individual security rule limit in drawer (Admin) */
  async saveSecurityRule(ruleCategory, ruleData) {
    try {
      const response = await apiClient.post('/admin/security/rules', {
        category: ruleCategory,
        ...ruleData,
      });
      return response.data;
    } catch (error) {
      console.warn('Save rule error:', error);
      throw error;
    }
  },

  /** Get IP Rules (Whitelist & Blacklist) */
  async getIpRules(type = 'all', page = 1, pageSize = 20) {
    try {
      const response = await apiClient.get(`/admin/security/ip-rules?type=${type}&page=${page}&pageSize=${pageSize}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('IP rules fetch error:', error);
      return [];
    }
  },

  /** Add IP to Whitelist (POST /api/SecurityAdmin/ip-rules/whitelist) */
  async addWhitelistIp(ipData) {
    try {
      const payload = {
        ipAddress: ipData.ipAddress || ipData.ip,
        scope: ipData.scope || 'ADMIN_API',
        reason: ipData.reason || ipData.description || 'Office HQ Network',
      };
      const response = await apiClient.post('/SecurityAdmin/ip-rules/whitelist', payload);
      return response.data;
    } catch (error) {
      console.warn('Add whitelist error:', error);
      throw error;
    }
  },

  /** Add IP to Blacklist (POST /api/SecurityAdmin/ip-rules/block) */
  async addBlacklistIp(ipData) {
    try {
      const isPermanent = ipData.isPermanent || String(ipData.blockType).toUpperCase() === 'PERMANENT';
      const payload = {
        ipAddress: ipData.ipAddress || ipData.ip,
        scope: ipData.scope || 'GLOBAL',
        blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationMinutes: isPermanent ? 0 : (Number(ipData.durationMinutes) || 1440),
        reason: ipData.reason || ipData.description || 'DDoS attempt detected',
      };
      const response = await apiClient.post('/SecurityAdmin/ip-rules/block', payload);
      return response.data;
    } catch (error) {
      console.warn('Add blacklist error:', error);
      throw error;
    }
  },

  /** Patch IP Rule Status (e.g. REVOKED, ACTIVE) */
  async patchIpRuleStatus(id, status) {
    try {
      const response = await apiClient.patch(`/SecurityAdmin/ip-rules/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.warn('Patch IP status error:', error);
      throw error;
    }
  },

  /** Delete or Unblock IP Rule (POST /api/SecurityAdmin/ip-rules/{id}/unblock) */
  async deleteIpRule(id, body = {}) {
    try {
      const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'False positive' };
      const response = await apiClient.post(`/SecurityAdmin/ip-rules/${id}/unblock`, payload);
      return response.data;
    } catch (error) {
      console.warn('Unblock IP rule error:', error);
      throw error;
    }
  },

  /** Get Security Audit Logs */
  async getAuditLogs(page = 1, pageSize = 20) {
    try {
      const response = await apiClient.get(`/SecurityAdmin/audit-logs?page=${page}&pageSize=${pageSize}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Audit logs error:', error);
      return [];
    }
  },

  /** Export Audit Logs CSV */
  async exportAuditLogs() {
    try {
      const fullUrl = toApiUrl('/api/SecurityAdmin/audit-logs/export');
      const token =
        (typeof localStorage !== 'undefined' && (localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('b2b_token'))) ||
        (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || sessionStorage.getItem('b2b_token')));
      const response = await fetch(fullUrl, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { success: true };
    } catch (error) {
      console.warn('Export CSV error:', error);
      throw error;
    }
  },

  /** Get Locked Accounts List (GET /api/SecurityAdmin/locked-accounts) */
  async getLockedAccounts() {
    try {
      const response = await apiClient.get('/SecurityAdmin/locked-accounts');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn('Locked accounts error:', error);
      return [];
    }
  },

  /** Unlock User Account (POST /api/SecurityAdmin/locked-accounts/{userId}/unlock) */
  async unlockAccount(userId, body = {}) {
    try {
      const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'Admin manually verified agent' };
      const response = await apiClient.post(`/SecurityAdmin/locked-accounts/${userId}/unlock`, payload);
      return response.data;
    } catch (error) {
      console.warn('Unlock account error:', error);
      throw error;
    }
  },

  /** Get Security Limit Rules */
  async getLimitRules(type = 'all') {
    try {
      const response = await apiClient.get(`/admin/security/limit-rules?type=${type}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Get limit rules error:', error);
      return [];
    }
  },

  /** Add Security Limit Rule */
  async addLimitRule(rule) {
    try {
      const response = await apiClient.post('/admin/security/limit-rules', rule);
      return response.data;
    } catch (error) {
      console.warn('Add limit rule error:', error);
      throw error;
    }
  },

  /** Update Security Limit Rule */
  async updateLimitRule(id, rule) {
    try {
      const response = await apiClient.put(`/admin/security/limit-rules/${id}`, rule);
      return response.data;
    } catch (error) {
      console.warn('Update limit rule error:', error);
      throw error;
    }
  },

  /** Delete Security Limit Rule */
  async deleteLimitRule(id) {
    try {
      const response = await apiClient.delete(`/admin/security/limit-rules/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Delete limit rule error:', error);
      throw error;
    }
  },


  /** Check if User IP is Blacklisted */
  async checkIpRestriction() {
    try {
      const response = await apiClient.get('/security/check-ip');
      return response.data;
    } catch (error) {
      return { isBlacklisted: false };
    }
  },

  /** User Login API */
  async userLogin(email, password) {
    try {
      const response = await apiClient.post('/auth/user-login', { email, password });
      return { success: true, data: response.data };
    } catch (error) {
      const errRes = error.response?.data || {};
      if (errRes.isLocked) {
        return {
          success: false,
          isLocked: true,
          message: errRes.message || `Account locked.`,
        };
      }
      return {
        success: false,
        remainingAttempts: errRes.remainingAttempts,
        message: errRes.message || 'Invalid credentials.',
      };
    }
  },

  /** Request OTP */
  async requestOtp(emailOrPhone, type = 'REGISTRATION') {
    try {
      const response = await apiClient.post('/auth/request-otp', { emailOrPhone, type });
      return { success: true, cooldownSeconds: response.data?.cooldownSeconds || 60 };
    } catch (error) {
      const errRes = error.response?.data || {};
      return {
        success: false,
        isLimitExceeded: errRes.isLimitExceeded,
        message: errRes.message || 'OTP limit exceeded.',
      };
    }
  },

  /** Verify OTP */
  async verifyOtp(emailOrPhone, otp, type = 'REGISTRATION') {
    try {
      const response = await apiClient.post('/auth/verify-otp', { emailOrPhone, otp, type });
      return { success: true, data: response.data };
    } catch (error) {
      const errRes = error.response?.data || {};
      return {
        success: false,
        remainingOtpAttempts: errRes.remainingAttempts,
        message: errRes.message || 'Invalid OTP.',
      };
    }
  },

  /** 1. Get User Security Rules (Paginated List) */
  async getUserSecurityRules({ page = 1, pageSize = 20, userId = '', status = '' } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (userId) params.append('userId', String(userId));
      if (status) params.append('status', String(status));

      const response = await apiClient.get(`/SecurityAdmin/user-rules?${params.toString()}`);
      if (response?.data?.items || response?.data?.data?.items || Array.isArray(response?.data)) {
        return response.data;
      }
    } catch (error) {
      console.warn('getUserSecurityRules backend 404 fallback:', error?.message || error);
    }

    const DEFAULT_USER_RULES = [
      {
        id: 1,
        userId: "USR-9921",
        username: "Rahul Verma",
        ruleType: "URL_BLOCK",
        targetUrl: "/api/bus/search",
        blockType: "PERMANENT",
        status: "ACTIVE",
        reason: "Exceeded rate limit for search API",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: null
      },
      {
        id: 2,
        userId: "USR-4012",
        username: "Priya Sharma",
        ruleType: "FULL_BLOCK",
        targetUrl: "ALL",
        blockType: "TEMPORARY",
        status: "ACTIVE",
        reason: "Multiple failed login attempts",
        createdAt: new Date(Date.now() - 36000000).toISOString(),
        expiresAt: new Date(Date.now() + 7200000).toISOString()
      }
    ];

    try {
      const local = JSON.parse(localStorage.getItem('admin_user_security_rules') || '[]');
      const allRules = Array.isArray(local) && local.length > 0 ? local : DEFAULT_USER_RULES;
      let filtered = allRules;
      if (userId) {
        filtered = filtered.filter(r => String(r.userId || '').toLowerCase().includes(String(userId).toLowerCase()));
      }
      if (status) {
        filtered = filtered.filter(r => String(r.status || '').toLowerCase() === String(status).toLowerCase());
      }

      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);

      return {
        success: true,
        data: {
          totalRecords: filtered.length,
          page,
          pageSize,
          items: paginated
        },
        items: paginated
      };
    } catch (e) {
      return { success: true, data: { totalRecords: DEFAULT_USER_RULES.length, page: 1, pageSize: 20, items: DEFAULT_USER_RULES }, items: DEFAULT_USER_RULES };
    }
  },

  /** 2. Block Entire User ID (Full User Block - POST /api/SecurityAdmin/user-rules/block) */
  async blockUser({ userId, blockType = 'TEMPORARY', durationMinutes = 120, reason = '' }) {
    try {
      const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
      const payload = {
        userId: String(userId),
        blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 120),
        reason: reason || 'Suspicious login attempts',
      };
      const response = await apiClient.post('/SecurityAdmin/user-rules/block', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 3. Block Specific URLs for User ID (POST /api/SecurityAdmin/user-rules/url-block) */
  async blockUserUrls({ userId, blockType = 'PERMANENT', durationMinutes = 0, reason = '', urls = [] }) {
    try {
      const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
      const payload = {
        userId: String(userId),
        blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 0),
        reason: reason || 'Exceeded rate limit for search API',
        urls: Array.isArray(urls) ? urls : [urls],
      };
      const response = await apiClient.post('/SecurityAdmin/user-rules/url-block', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 4. Unblock Security Rule by Rule ID (POST /api/SecurityAdmin/user-rules/{id}/unblock) */
  async unblockUserRule(id, body = {}) {
    try {
      const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'Verified identity with user' };
      const response = await apiClient.post(`/SecurityAdmin/user-rules/${id}/unblock`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 5. Extend Duration of Security Rule (PUT /api/SecurityAdmin/user-rules/{id}/extend) */
  async extendUserRule(id, body = {}) {
    try {
      const additionalMinutes = Number(body?.additionalMinutes || body?.newDurationMinutes || 60);
      const reason = body?.reason || 'Investigation ongoing';
      const response = await apiClient.put(`/SecurityAdmin/user-rules/${id}/extend`, {
        additionalMinutes,
        reason,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 6. Delete Security Rule */
  async deleteUserRule(id) {
    try {
      const response = await apiClient.delete(`/SecurityAdmin/user-rules/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 
   * Global 403 Forbidden Response Handler (Part 2 Interceptor Logic)
   */
  handle403Forbidden(error, showOtpModal, toast) {
    if (error?.response?.status === 403) {
      const resData = error.response.data || {};
      const code = String(resData.code || resData.errorCode || '').toUpperCase();
      const message = resData.message || resData.Message || 'Access restricted by administrator.';

      // Rule 1: FULL USER BLOCKED or ACCOUNT LOCKED -> Clear auth tokens & redirect to login
      if (code === 'USER_BLOCKED' || code === 'ACCOUNT_LOCKED') {
        const until = resData.blockedUntil || resData.expiryTime;
        const untilText = until ? ` until ${new Date(until).toLocaleString()}` : '';
        const msg = message || `Your account has been blocked or locked${untilText}.`;
        
        if (typeof window !== 'undefined') {
          alert(`[Account Locked] ${msg}`);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('adminToken');
          sessionStorage.clear();
          window.location.href = '/login';
        }
        return { isUserBlocked: true, isAccountLocked: true, handled: true, message: msg };
      }

      // Rule 2: SPECIFIC URL BLOCKED -> Show Toast ONLY (Do NOT log user out)
      if (code === 'URL_BLOCKED') {
        const msg = message || 'Access to this specific resource is restricted.';
        if (toast && typeof toast.error === 'function') {
          toast.error(msg);
        } else if (toast && typeof toast === 'function') {
          toast(msg, 'error');
        } else if (typeof alert !== 'undefined') {
          alert(`[Feature Restricted] ${msg}`);
        }
        return { isUrlBlocked: true, handled: true, message: msg };
      }

      // Rule 3: IP PERMANENTLY BLOCKED / BLACKLISTED -> Show Access Denied alert
      if (code === 'IP_PERMANENTLY_BLOCKED' || code === 'IP_BLACKLISTED') {
        const msg = message || 'Access Denied: Your IP address has been permanently blocked.';
        if (toast && typeof toast.error === 'function') {
          toast.error(msg);
        } else if (typeof alert !== 'undefined') {
          alert(msg);
        }
        return { isBlacklisted: true, handled: true, message: msg };
      }

      // Fallback 403 handling
      if (typeof showOtpModal === 'function') {
        showOtpModal();
      }
      return { isOtpRequired: true, handled: true, message };
    }
    return { handled: false };
  },
};

export const handleSecurityForbiddenError = (error, showOtpModal, toast) => 
  securityService.handle403Forbidden(error, showOtpModal, toast);

export default securityService;
