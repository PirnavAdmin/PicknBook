/* eslint-disable */
import { toApiUrl, readResponsePayload } from './apiClient';

/**
 * Lightweight HTTP client helper using project's API utilities
 */
const request = async (endpoint, options = {}) => {
  let apiPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!apiPath.startsWith('/api/')) {
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
    try {
      const response = await apiClient.get('/admin/security/metrics');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Security metrics error:', error);
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
    }
  },

  /** Fetch recent security activity feed */
  async getRecentActivity(limit = 10) {
    try {
      const response = await apiClient.get(`/admin/security/recent-activity?limit=${limit}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Recent activity error:', error);
      return [];
    }
  },

  /** Fetch top blocked IPs */
  async getTopBlockedIps(limit = 5) {
    try {
      const response = await apiClient.get(`/admin/security/top-blocked-ips?limit=${limit}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Top blocked IPs error:', error);
      return [];
    }
  },

  /** Fetch top security events */
  async getTopSecurityEvents(limit = 5) {
    try {
      const response = await apiClient.get(`/admin/security/top-security-events?limit=${limit}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Top security events error:', error);
      return [];
    }
  },

  /** Fetch security events trend data for chart */
  async getSecurityTrend(period = 'Last 7 Days') {
    try {
      const periodParam = period.replace(/\s/g, '_').toLowerCase();
      const response = await apiClient.get(`/admin/security/trend?period=${periodParam}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Security trend error:', error);
      return { labels: [], datasets: [] };
    }
  },

  /** Fetch today's email notification statistics */
  async getEmailStats() {
    try {
      const response = await apiClient.get('/admin/security/email-stats');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Email stats error:', error);
      return { delivered: 0, failed: 0, pending: 0, total: 0 };
    }
  },

  /** Fetch B2B wallet overview */
  async getB2bWalletOverview() {
    try {
      const response = await apiClient.get('/admin/security/b2b-wallet-overview');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('B2B wallet overview error:', error);
      return {
        agentsLowBalance: 0,
        agentsRestricted: 0,
        autoUnblockedToday: 0,
        requiredAmountMin: 0,
        walletBasedUnblock: false
      };
    }
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

  /** Add IP to Whitelist */
  async addWhitelistIp(ipData) {
    try {
      const payload = {
        ipAddress: ipData.ipAddress || ipData.ip,
        reason: ipData.reason || ipData.description || 'Whitelisted IP',
      };
      const response = await apiClient.post('/admin/security/ip-rules/whitelist', payload);
      return response.data;
    } catch (error) {
      console.warn('Add whitelist error:', error);
      throw error;
    }
  },

  /** Add IP to Blacklist */
  async addBlacklistIp(ipData) {
    try {
      const payload = {
        ipAddress: ipData.ipAddress || ipData.ip,
        reason: ipData.reason || ipData.description || 'Blacklisted IP',
        durationMinutes: ipData.durationMinutes || 60,
        isPermanent: ipData.isPermanent || false,
      };
      const response = await apiClient.post('/admin/security/ip-rules/blacklist', payload);
      return response.data;
    } catch (error) {
      console.warn('Add blacklist error:', error);
      throw error;
    }
  },

  /** Patch IP Rule Status (e.g. REVOKED, ACTIVE) */
  async patchIpRuleStatus(id, status) {
    try {
      const response = await apiClient.patch(`/admin/security/ip-rules/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.warn('Patch IP status error:', error);
      throw error;
    }
  },

  /** Delete or Unblock IP Rule */
  async deleteIpRule(id) {
    try {
      const response = await apiClient.delete(`/admin/security/ip-rules/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Delete IP rule error:', error);
      throw error;
    }
  },

  /** Get Security Audit Logs */
  async getAuditLogs(page = 1, pageSize = 20) {
    try {
      const response = await apiClient.get(`/admin/security/audit-logs?page=${page}&pageSize=${pageSize}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Audit logs error:', error);
      return [];
    }
  },

  /** Export Audit Logs CSV */
  async exportAuditLogs() {
    try {
      const fullUrl = toApiUrl('/api/v1/admin/security/audit-logs/export');
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
    try {
      const response = await apiClient.get('/admin/security/locked-accounts');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('Locked accounts error:', error);
      return [];
    }
  },

  /** Unlock User Account */
  async unlockAccount(id) {
    try {
      const response = await apiClient.post(`/admin/security/locked-accounts/${id}/unlock`);
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
  async getUserSecurityRules({ page = 1, pageSize = 10, userId = '', ruleType = '' } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (userId) params.append('userId', String(userId));
      if (ruleType) params.append('ruleType', String(ruleType));

      const response = await apiClient.get(`/v1/admin/security/user-rules?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.warn('getUserSecurityRules error:', error);
      return { success: false, data: [], pagination: { total: 0, page: 1, pageSize: 10 } };
    }
  },

  /** 2. Block Entire User ID (Full User Block - POST /api/v1/admin/security/user-rules/block) */
  async blockUser({ userId, blockType = 'TEMPORARY', durationMinutes = 120, reason = '' }) {
    try {
      const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
      const payload = {
        userId: String(userId),
        blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 120),
        reason: reason || 'Suspicious activity detected',
      };
      const response = await apiClient.post('/v1/admin/security/user-rules/block', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 3. Block Specific URLs for User ID (POST /api/v1/admin/security/user-rules/url-block) */
  async blockUserUrls({ userId, blockType = 'PERMANENT', durationMinutes = 0, reason = '', urls = [] }) {
    try {
      const isPermanent = String(blockType).toUpperCase() === 'PERMANENT';
      const payload = {
        userId: String(userId),
        blockType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationMinutes: isPermanent ? 0 : (Number(durationMinutes) || 0),
        reason: reason || 'Restricted feature access',
        urls: Array.isArray(urls) ? urls : [urls],
      };
      const response = await apiClient.post('/v1/admin/security/user-rules/url-block', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 4. Unblock Security Rule by Rule ID (POST /api/v1/admin/security/user-rules/{id}/unblock) */
  async unblockUserRule(id, { reason = '' } = {}) {
    try {
      const response = await apiClient.post(`/v1/admin/security/user-rules/${id}/unblock`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 5. Extend Duration of Security Rule (PUT /api/v1/admin/security/user-rules/{id}/extend) */
  async extendUserRule(id, { newDurationMinutes = 60, reason = '' } = {}) {
    try {
      const response = await apiClient.put(`/v1/admin/security/user-rules/${id}/extend`, {
        newDurationMinutes: Number(newDurationMinutes) || 60,
        reason,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /** 6. Delete Security Rule (DELETE /api/v1/admin/security/user-rules/{id}) */
  async deleteUserRule(id) {
    try {
      const response = await apiClient.delete(`/v1/admin/security/user-rules/${id}`);
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
