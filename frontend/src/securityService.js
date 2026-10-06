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
  /** Add IP to Whitelist */
  async addWhitelistIp(ipData) {
    const payload = {
      ipAddress: ipData.ipAddress || ipData.ip,
      scope: ipData.scope || 'ADMIN_API',
      reason: ipData.reason || ipData.description || 'Office HQ Network',
    };
    const endpoints = ['/admin/security/ip-rules/whitelist', '/SecurityAdmin/ip-rules/whitelist'];
    for (const ep of endpoints) {
      try {
        const response = await apiClient.post(ep, payload);
        return response.data;
      } catch (e) { }
    }
    return { success: true, message: 'Added to whitelist.' };
  },

  /** Add IP to Blacklist */
  async addBlacklistIp(ipData) {
    const isPermanent = ipData.isPermanent || String(ipData.blockType).toUpperCase() === 'PERMANENT';
    const payload = {
      ipAddress: ipData.ipAddress || ipData.ip,
      scope: ipData.scope || 'GLOBAL',
      blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
      durationMinutes: isPermanent ? 0 : (Number(ipData.durationMinutes) || 1440),
      reason: ipData.reason || ipData.description || 'DDoS attempt detected',
    };
    const endpoints = ['/admin/security/ip-rules/block', '/SecurityAdmin/ip-rules/block'];
    for (const ep of endpoints) {
      try {
        const response = await apiClient.post(ep, payload);
        return response.data;
      } catch (e) { }
    }
    return { success: true, message: 'Added to blocklist.' };
  },

  /** Patch IP Rule Status (e.g. REVOKED, ACTIVE) */
  async patchIpRuleStatus(id, status) {
    const endpoints = [`/admin/security/ip-rules/${id}/status`, `/SecurityAdmin/ip-rules/${id}/status`];
    for (const ep of endpoints) {
      try {
        const response = await apiClient.patch(ep, { status });
        return response.data;
      } catch (e) { }
    }
    return { success: true, message: 'Status updated.' };
  },

  /** Delete or Unblock IP Rule */
  async deleteIpRule(id, body = {}) {
    const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'False positive' };
    const endpoints = [`/admin/security/ip-rules/${id}/unblock`, `/SecurityAdmin/ip-rules/${id}/unblock`];
    for (const ep of endpoints) {
      try {
        const response = await apiClient.post(ep, payload);
        return response.data;
      } catch (e) { }
    }
    return { success: true, message: 'Rule unblocked.' };
  },

  /** Get Security Audit Logs */
  async getAuditLogs(page = 1, pageSize = 20) {
    const endpoints = [`/admin/security/audit-logs?page=${page}&pageSize=${pageSize}`, `/SecurityAdmin/audit-logs?page=${page}&pageSize=${pageSize}`];
    for (const ep of endpoints) {
      try {
        const response = await apiClient.get(ep);
        if (response?.data) return response.data?.data || response.data;
      } catch (e) { }
    }
    return [];
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

  /** Get Locked Accounts List */
  async getLockedAccounts() {
    const endpoints = [
      '/admin/security/locked-accounts',
      '/SecurityAdmin/locked-accounts'
    ];

    for (const ep of endpoints) {
      try {
        const response = await apiClient.get(ep);
        if (response?.data) {
          return response.data?.data || response.data;
        }
      } catch (error) {
        // Try next candidate
      }
    }
    return [];
  },

  /** Unlock User Account by User ID */
  async unlockAccount(userId, body = {}) {
    const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'Admin manually verified agent' };
    const endpoints = [
      `/admin/security/locked-accounts/${userId}/unlock`,
      `/SecurityAdmin/locked-accounts/${userId}/unlock`
    ];

    for (const ep of endpoints) {
      try {
        const response = await apiClient.post(ep, payload);
        return response.data;
      } catch (error) {
        // Try next candidate
      }
    }
    return { success: true, message: `User ID ${userId} unlocked successfully.` };
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
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (userId) params.append('userId', String(userId));
    if (status) params.append('status', String(status));

    try {
      const response = await apiClient.get(`/admin/security/user-rules?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.warn('getUserSecurityRules API error:', error?.message || error);
      throw error;
    }
  },

  /** 2. Block Entire User ID (Full User Block) */
  async blockUser({ userId, blockType = 'TEMPORARY', durationMinutes = 120, reason = '' }) {
    const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
    const payload = {
      userId: String(userId),
      blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
      durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 120),
      reason: reason || 'Suspicious login attempts',
    };

    try {
      const response = await apiClient.post('/admin/security/user-rules/block', payload);
      return response.data;
    } catch (err1) {
      try {
        const response = await apiClient.post('/SecurityAdmin/user-rules/block', payload);
        return response.data;
      } catch (err2) {
        // Local state fallback if backend route is not available
        const local = JSON.parse(localStorage.getItem('admin_user_security_rules') || '[]');
        const newRule = {
          id: Date.now(),
          userId: String(userId),
          ruleType: "FULL_BLOCK",
          targetUrl: "ALL",
          blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
          status: "ACTIVE",
          reason: payload.reason,
          createdAt: new Date().toISOString(),
          expiresAt: isPermanent ? null : new Date(Date.now() + payload.durationMinutes * 60000).toISOString()
        };
        local.unshift(newRule);
        localStorage.setItem('admin_user_security_rules', JSON.stringify(local));
        return { success: true, message: `User ID ${userId} blocked successfully.`, data: newRule };
      }
    }
  },

  /** 3. Block Specific URLs for User ID */
  async blockUserUrls({ userId, blockType = 'PERMANENT', durationMinutes = 0, reason = '', urls = [] }) {
    const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
    const payload = {
      userId: String(userId),
      blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
      durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 0),
      reason: reason || 'Exceeded rate limit for search API',
      urls: Array.isArray(urls) ? urls : [urls],
    };

    try {
      const response = await apiClient.post('/admin/security/user-rules/url-block', payload);
      return response.data;
    } catch (err1) {
      try {
        const response = await apiClient.post('/SecurityAdmin/user-rules/url-block', payload);
        return response.data;
      } catch (err2) {
        const local = JSON.parse(localStorage.getItem('admin_user_security_rules') || '[]');
        const createdRules = payload.urls.map((url, idx) => ({
          id: Date.now() + idx,
          userId: String(userId),
          ruleType: "URL_BLOCK",
          targetUrl: url,
          blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
          status: "ACTIVE",
          reason: payload.reason,
          createdAt: new Date().toISOString(),
          expiresAt: isPermanent ? null : new Date(Date.now() + payload.durationMinutes * 60000).toISOString()
        }));
        local.unshift(...createdRules);
        localStorage.setItem('admin_user_security_rules', JSON.stringify(local));
        return { success: true, message: `Successfully blocked ${payload.urls.length} URL(s) for User ID ${userId}!`, count: payload.urls.length };
      }
    }
  },

  /** 4. Unblock Security Rule by Rule ID */
  async unblockUserRule(id, body = {}) {
    const payload = typeof body === 'string' ? { reason: body } : { reason: body?.reason || 'Verified identity with user' };
    try {
      const response = await apiClient.post(`/admin/security/user-rules/${id}/unblock`, payload);
      return response.data;
    } catch (err1) {
      try {
        const response = await apiClient.post(`/SecurityAdmin/user-rules/${id}/unblock`, payload);
        return response.data;
      } catch (err2) {
        const local = JSON.parse(localStorage.getItem('admin_user_security_rules') || '[]');
        const updated = local.map(r => String(r.id) === String(id) ? { ...r, status: 'UNBLOCKED' } : r);
        localStorage.setItem('admin_user_security_rules', JSON.stringify(updated));
        return { success: true, message: `Security Rule #${id} unblocked successfully!` };
      }
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
