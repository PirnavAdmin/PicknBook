/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import securityService from '../../services/securityService';
import './SecurityManagement.css';

// Simple Donut Chart Component
function DonutChart({ data, total }) {
  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePercent = 0;
  const segments = data.map((item) => {
    const percent = total > 0 ? item.value / total : 0;
    const offset = circumference * cumulativePercent;
    const length = circumference * percent;
    cumulativePercent += percent;
    return { ...item, offset, length };
  });

  return (
    <div className="sd-donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.length} ${circumference - seg.length}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
      </svg>
      <div className="sd-donut-center">
        <span className="sd-donut-total">{total}</span>
        <span className="sd-donut-label">Total</span>
      </div>
    </div>
  );
}

// Simple Line Chart Component (SVG)
function MiniLineChart({ datasets, labels }) {
  const width = 380;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allValues, 10);
  const minVal = 0;

  const getX = (i) => padding.left + (i / (labels.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(minVal + f * (maxVal - minVal)));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {gridLines.map((val, i) => (
        <g key={i}>
          <line x1={padding.left} y1={getY(val)} x2={width - padding.right} y2={getY(val)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padding.left - 8} y={getY(val) + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{val}</text>
        </g>
      ))}
      {/* X Labels */}
      {labels.map((label, i) => (
        <text key={i} x={getX(i)} y={height - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">{label}</text>
      ))}
      {/* Lines */}
      {datasets.map((ds, di) => {
        const points = ds.data.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');
        return (
          <g key={di}>
            <polyline points={points} fill="none" stroke={ds.color} strokeWidth="2" strokeLinejoin="round" />
            {ds.data.map((val, i) => (
              <circle key={i} cx={getX(i)} cy={getY(val)} r="3" fill="#fff" stroke={ds.color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return dateStr; }
};

const getPercentStr = (val, prev) => {
  if (!prev || prev === 0) return { text: '—', isUp: false };
  const diff = ((val - prev) / prev) * 100;
  return { text: `${Math.abs(diff).toFixed(1)}%`, isUp: diff >= 0 };
};

export default function SecurityManagement() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);
  const [securityError, setSecurityError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState('Last 7 Days');

  // Date Range Picker State
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState('days'); // 'days' | 'months' | 'years'
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const calendarRef = useRef(null);

  // Close calendar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
        setCalendarView('days');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dashboard Metrics (from API)
  const [metrics, setMetrics] = useState({
    activeLockouts: 0,
    blacklistedIps: 0,
    activeBlockedIps: 0,
    whitelistedIps: 0,
    automaticBlocks: 0,
    manualBlocks: 0,
    expiredBlocks: 0,
    loginViolations24h: 0,
    otpViolations24h: 0,
    passwordViolations24h: 0,
    registrationViolations24h: 0,
    apiViolations24h: 0,
    userRestrictions: 0,
    adminRestrictions: 0,
    b2bRestrictions: 0
  });

  // Comparison with yesterday
  const [metricsYesterday, setMetricsYesterday] = useState({});

  // Trend Chart Data
  const [trendData, setTrendData] = useState({ labels: [], datasets: [] });

  // Top Blocked IPs
  const [topBlockedIps, setTopBlockedIps] = useState([]);

  // Top Security Events
  const [topSecurityEvents, setTopSecurityEvents] = useState([]);

  // Recent Activities
  const [recentActivities, setRecentActivities] = useState([]);

  // Email Notifications Summary (Today)
  const [emailStats, setEmailStats] = useState({ delivered: 0, failed: 0, pending: 0, total: 0 });

  // B2B Wallet Overview
  const [walletOverview, setWalletOverview] = useState({
    agentsLowBalance: 0,
    agentsRestricted: 0,
    autoUnblockedToday: 0,
    requiredAmountMin: 0,
    walletBasedUnblock: false
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Metrics
      const fetchedMetrics = await securityService.getMetrics();
      if (fetchedMetrics) {
        setMetrics({
          activeLockouts: fetchedMetrics.activeLockouts ?? 0,
          blacklistedIps: fetchedMetrics.blacklistedIps ?? fetchedMetrics.totalBlacklistedIps ?? 0,
          activeBlockedIps: fetchedMetrics.activeBlockedIps ?? 0,
          whitelistedIps: fetchedMetrics.whitelistedIps ?? fetchedMetrics.totalWhitelistedIps ?? 0,
          automaticBlocks: fetchedMetrics.automaticBlocks ?? 0,
          manualBlocks: fetchedMetrics.manualBlocks ?? 0,
          expiredBlocks: fetchedMetrics.expiredBlocks ?? 0,
          loginViolations24h: fetchedMetrics.loginViolations24h ?? fetchedMetrics.failedLoginAttempts24h ?? 0,
          otpViolations24h: fetchedMetrics.otpViolations24h ?? 0,
          passwordViolations24h: fetchedMetrics.passwordViolations24h ?? 0,
          registrationViolations24h: fetchedMetrics.registrationViolations24h ?? 0,
          apiViolations24h: fetchedMetrics.apiViolations24h ?? 0,
          userRestrictions: fetchedMetrics.userRestrictions ?? 0,
          adminRestrictions: fetchedMetrics.adminRestrictions ?? 0,
          b2bRestrictions: fetchedMetrics.b2bRestrictions ?? 0
        });
        if (fetchedMetrics.yesterday) {
          setMetricsYesterday(fetchedMetrics.yesterday);
        }
      }

      // 2. Recent Activity
      try {
        const activity = await securityService.getRecentActivity?.();
        if (Array.isArray(activity)) {
          setRecentActivities(activity.slice(0, 5));
        } else if (activity?.data && Array.isArray(activity.data)) {
          setRecentActivities(activity.data.slice(0, 5));
        }
      } catch (e) { console.warn('Recent activity load error:', e); }

      // 3. Top Blocked IPs
      try {
        const blocked = await securityService.getTopBlockedIps?.();
        if (Array.isArray(blocked)) {
          setTopBlockedIps(blocked.slice(0, 5));
        } else if (blocked?.data && Array.isArray(blocked.data)) {
          setTopBlockedIps(blocked.data.slice(0, 5));
        }
      } catch (e) { console.warn('Top blocked IPs load error:', e); }

      // 4. Top Security Events
      try {
        const events = await securityService.getTopSecurityEvents?.();
        if (Array.isArray(events)) {
          setTopSecurityEvents(events.slice(0, 5));
        } else if (events?.data && Array.isArray(events.data)) {
          setTopSecurityEvents(events.data.slice(0, 5));
        }
      } catch (e) { console.warn('Top events load error:', e); }

      // 5. Trend Data
      try {
        const trend = await securityService.getSecurityTrend?.(trendPeriod);
        if (trend?.labels && trend?.datasets) {
          setTrendData(trend);
        } else if (trend?.data?.labels) {
          setTrendData(trend.data);
        }
      } catch (e) { console.warn('Trend data load error:', e); }

      // 6. Email Stats (Today)
      try {
        const emailData = await securityService.getEmailStats?.();
        if (emailData) {
          const d = emailData.data || emailData;
          setEmailStats({
            delivered: d.delivered ?? d.sent ?? 0,
            failed: d.failed ?? 0,
            pending: d.pending ?? 0,
            total: d.total ?? ((d.delivered ?? d.sent ?? 0) + (d.failed ?? 0) + (d.pending ?? 0))
          });
        }
      } catch (e) { console.warn('Email stats load error:', e); }

      // 7. B2B Wallet Overview
      try {
        const wallet = await securityService.getB2bWalletOverview?.();
        if (wallet) {
          const w = wallet.data || wallet;
          setWalletOverview({
            agentsLowBalance: w.agentsLowBalance ?? w.agentsWithLowBalance ?? 0,
            agentsRestricted: w.agentsRestricted ?? 0,
            autoUnblockedToday: w.autoUnblockedToday ?? 0,
            requiredAmountMin: w.requiredAmountMin ?? w.minWalletAmount ?? 0,
            walletBasedUnblock: w.walletBasedUnblock ?? w.autoUnblockEnabled ?? false
          });
        }
      } catch (e) { console.warn('B2B wallet overview error:', e); }

      setLastUpdated(new Date());
    } catch (err) {
      if (err.response?.status === 403 || err.status === 403) {
        setSecurityError(err.response?.data?.message || 'HTTP 403 Forbidden: Access denied.');
      }
      console.warn('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Build date range display
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Activity icon mapping
  const getActivityIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('block') && t.includes('auto')) return { icon: '🔴', color: '#ef4444', bg: '#fef2f2' };
    if (t.includes('lock')) return { icon: '🔒', color: '#f97316', bg: '#fff7ed' };
    if (t.includes('whitelist') || t.includes('unblock')) return { icon: '🟢', color: '#10b981', bg: '#ecfdf5' };
    if (t.includes('wallet') || t.includes('b2b')) return { icon: '💼', color: '#8b5cf6', bg: '#f5f3ff' };
    if (t.includes('login')) return { icon: '🔑', color: '#ef4444', bg: '#fef2f2' };
    return { icon: '🛡️', color: '#6366f1', bg: '#eef2ff' };
  };

  // Metric cards definition — 15 cards (3 rows × 5)
  const metricCards = [
    // Row 1
    {
      label: 'Locked Accounts',
      value: metrics.activeLockouts,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="12" />
          <line x1="19" y1="16" x2="19.01" y2="16" />
        </svg>
      ),
      color: '#ef4444',
      bg: '#fef2f2',
      key: 'activeLockouts'
    },
    {
      label: 'Blacklisted IPs',
      value: metrics.blacklistedIps,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      color: '#ea580c',
      bg: '#fff7ed',
      key: 'blacklistedIps'
    },
    {
      label: 'Active Blocked IPs',
      value: metrics.activeBlockedIps,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      ),
      color: '#ef4444',
      bg: '#fef2f2',
      key: 'activeBlockedIps'
    },
    {
      label: 'Whitelisted IPs',
      value: metrics.whitelistedIps,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 11 11 13 15 9" />
        </svg>
      ),
      color: '#16a34a',
      bg: '#f0fdf4',
      key: 'whitelistedIps'
    },
    {
      label: 'Automatic Blocks',
      value: metrics.automaticBlocks ?? 0,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      color: '#8b5cf6',
      bg: '#f5f3ff',
      key: 'automaticBlocks'
    },
    // Row 2
    {
      label: 'Manual Blocks',
      value: metrics.manualBlocks ?? 0,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5" />
          <path d="M6 14v-2.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5.5a10 10 0 0 0 10 10h1a10 10 0 0 0 10-10v-1.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
        </svg>
      ),
      color: '#2563eb',
      bg: '#eff6ff',
      key: 'manualBlocks'
    },
    {
      label: 'Expired Blocks',
      value: metrics.expiredBlocks ?? 0,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      color: '#ea580c',
      bg: '#fff7ed',
      key: 'expiredBlocks'
    },
    {
      label: 'Login Violations',
      value: metrics.loginViolations24h,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      color: '#0d9488',
      bg: '#f0fdfa',
      key: 'loginViolations24h'
    },
    {
      label: 'OTP Violations',
      value: metrics.otpViolations24h,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <rect x="8" y="5" width="8" height="4" />
          <line x1="9" y1="13" x2="9.01" y2="13" />
          <line x1="12" y1="13" x2="12.01" y2="13" />
          <line x1="15" y1="13" x2="15.01" y2="13" />
          <line x1="9" y1="17" x2="9.01" y2="17" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
          <line x1="15" y1="17" x2="15.01" y2="17" />
        </svg>
      ),
      color: '#e11d48',
      bg: '#fff1f2',
      key: 'otpViolations24h'
    },
    {
      label: 'Password Violations',
      value: metrics.passwordViolations24h,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      color: '#1d4ed8',
      bg: '#dbeafe',
      key: 'passwordViolations24h'
    },
    // Row 3
    {
      label: 'Registration Violations',
      value: metrics.registrationViolations24h,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="16" y1="11" x2="22" y2="11" />
        </svg>
      ),
      color: '#7c3aed',
      bg: '#f5f3ff',
      key: 'registrationViolations24h'
    },
    {
      label: 'API Violations',
      value: metrics.apiViolations24h,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      color: '#16a34a',
      bg: '#f0fdf4',
      key: 'apiViolations24h'
    },
    {
      label: 'User Restrictions',
      value: metrics.userRestrictions,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      color: '#ea580c',
      bg: '#fff7ed',
      key: 'userRestrictions'
    },
    {
      label: 'Admin Restrictions',
      value: metrics.adminRestrictions,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
          <path d="M12 14v4" />
        </svg>
      ),
      color: '#2563eb',
      bg: '#eff6ff',
      key: 'adminRestrictions'
    },
    {
      label: 'B2B Restrictions',
      value: metrics.b2bRestrictions,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      color: '#9333ea',
      bg: '#faf5ff',
      key: 'b2bRestrictions'
    },
  ];

  // Donut chart data
  const donutData = [
    { label: 'Delivered', value: emailStats.delivered, color: '#22c55e' },
    { label: 'Failed', value: emailStats.failed, color: '#ef4444' },
    { label: 'Pending', value: emailStats.pending, color: '#f59e0b' },
  ];

  // Trend chart fallback labels
  const trendLabels = trendData.labels?.length > 0
    ? trendData.labels
    : ['10 May', '12 May', '14 May', '16 May', '18 May', '20 May'];

  const trendDatasets = trendData.datasets?.length > 0
    ? trendData.datasets
    : [
      { label: 'Login Violations', data: [0, 0, 0, 0, 0, 0], color: '#ef4444' },
      { label: 'OTP Violations', data: [0, 0, 0, 0, 0, 0], color: '#f59e0b' },
      { label: 'Password Violations', data: [0, 0, 0, 0, 0, 0], color: '#3b82f6' },
      { label: 'API Violations', data: [0, 0, 0, 0, 0, 0], color: '#8b5cf6' },
    ];

  if (isLoading) {
    return (
      <div className="security-mgmt-container">
        <div className="sd-loading-state">
          <div className="sd-loading-spinner" />
          <p>Loading Security Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-mgmt-container">
      {securityError && (
        <div className="sd-error-banner">
          <span className="sd-error-icon">🛑</span>
          <div><strong>Security Alert:</strong> {securityError}</div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="sd-top-header">
        <div className="sd-header-left">
          <h1 className="sd-page-title">Security Dashboard</h1>
          <p className="sd-page-subtitle">Security Management &nbsp;/&nbsp; Dashboard / Overview</p>
        </div>
        <div className="sd-header-right">
          <div className="sd-datepicker-wrapper" ref={calendarRef}>
            <div className="sd-date-range" onClick={() => { setShowCalendar(!showCalendar); setCalendarView('days'); }}>
              <span className="sd-calendar-icon">📅</span>
              <span>
                {dateRangeStart && dateRangeEnd
                  ? `${dateRangeStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${dateRangeEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : todayStr}
              </span>
            </div>
            {showCalendar && (
              <div className="sd-calendar-popup">
                {/* Calendar Header */}
                <div className="sd-cal-header">
                  <button className="sd-cal-nav" onClick={() => {
                    if (calendarView === 'days') {
                      setCalendarMonth(p => p === 0 ? (setCalendarYear(y => y - 1), 11) : p - 1);
                    } else if (calendarView === 'years') {
                      setCalendarYear(y => y - 12);
                    } else if (calendarView === 'months') {
                      setCalendarYear(y => y - 1);
                    }
                  }}>‹</button>

                  <div className="sd-cal-title-wrapper">
                    {calendarView === 'days' ? (
                      <>
                        <button className="sd-cal-selector-btn" onClick={() => setCalendarView('months')}>
                          {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long' })} ▾
                        </button>
                        <button className="sd-cal-selector-btn" onClick={() => setCalendarView('years')}>
                          {calendarYear} ▾
                        </button>
                      </>
                    ) : (
                      <span className="sd-cal-title-back" onClick={() => setCalendarView('days')}>
                        {calendarView === 'months' && `Select Month (${calendarYear})`}
                        {calendarView === 'years' && `Select Year (${calendarYear - 5} - ${calendarYear + 6})`}
                        <span className="sd-cal-back-indicator"> ✕ Go back</span>
                      </span>
                    )}
                  </div>

                  <button className="sd-cal-nav" onClick={() => {
                    if (calendarView === 'days') {
                      setCalendarMonth(p => p === 11 ? (setCalendarYear(y => y + 1), 0) : p + 1);
                    } else if (calendarView === 'years') {
                      setCalendarYear(y => y + 12);
                    } else if (calendarView === 'months') {
                      setCalendarYear(y => y + 1);
                    }
                  }}>›</button>
                </div>

                {/* Year Grid */}
                {calendarView === 'years' && (
                  <div className="sd-cal-year-grid">
                    {Array.from({ length: 12 }, (_, i) => calendarYear - 5 + i).map(yr => (
                      <button key={yr} className={`sd-cal-year-btn ${yr === calendarYear ? 'active' : ''}`}
                        onClick={() => { setCalendarYear(yr); setCalendarView('days'); }}>{yr}</button>
                    ))}
                  </div>
                )}

                {/* Month Grid */}
                {calendarView === 'months' && (
                  <div className="sd-cal-month-grid">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                      <button key={m} className={`sd-cal-month-btn ${i === calendarMonth ? 'active' : ''}`}
                        onClick={() => { setCalendarMonth(i); setCalendarView('days'); }}>{m}</button>
                    ))}
                  </div>
                )}

                {/* Days Grid */}
                {calendarView === 'days' && (() => {
                  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(null);
                  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                  return (
                    <>
                      <div className="sd-cal-day-names">
                        {dayNames.map(d => <span key={d}>{d}</span>)}
                      </div>
                      <div className="sd-cal-days-grid">
                        {cells.map((day, idx) => {
                          if (!day) return <span key={idx} className="sd-cal-empty" />;
                          const thisDate = new Date(calendarYear, calendarMonth, day);
                          const isStart = dateRangeStart && thisDate.toDateString() === dateRangeStart.toDateString();
                          const isEnd = dateRangeEnd && thisDate.toDateString() === dateRangeEnd.toDateString();
                          const inRange = dateRangeStart && dateRangeEnd && thisDate > dateRangeStart && thisDate < dateRangeEnd;
                          const isToday = thisDate.toDateString() === new Date().toDateString();
                          return (
                            <button key={idx}
                              className={`sd-cal-day ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${inRange ? 'in-range' : ''} ${isToday ? 'today' : ''}`}
                              onClick={() => {
                                if (!selectingEnd) {
                                  setDateRangeStart(thisDate);
                                  setDateRangeEnd(null);
                                  setSelectingEnd(true);
                                } else {
                                  if (thisDate < dateRangeStart) {
                                    setDateRangeEnd(dateRangeStart);
                                    setDateRangeStart(thisDate);
                                  } else {
                                    setDateRangeEnd(thisDate);
                                  }
                                  setSelectingEnd(false);
                                  setShowCalendar(false);
                                }
                              }}
                            >{day}</button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

                {/* Quick Actions */}
                <div className="sd-cal-actions">
                  <button onClick={() => {
                    const t = new Date();
                    setDateRangeStart(t); setDateRangeEnd(t);
                    setSelectingEnd(false); setShowCalendar(false);
                  }}>Today</button>
                  <button onClick={() => {
                    const t = new Date();
                    const w = new Date(t); w.setDate(t.getDate() - 7);
                    setDateRangeStart(w); setDateRangeEnd(t);
                    setSelectingEnd(false); setShowCalendar(false);
                  }}>Last 7 Days</button>
                  <button onClick={() => {
                    const t = new Date();
                    const m = new Date(t); m.setDate(t.getDate() - 30);
                    setDateRangeStart(m); setDateRangeEnd(t);
                    setSelectingEnd(false); setShowCalendar(false);
                  }}>Last 30 Days</button>
                  <button onClick={() => {
                    setDateRangeStart(null); setDateRangeEnd(null);
                    setSelectingEnd(false); setShowCalendar(false);
                  }}>Clear</button>
                </div>
              </div>
            )}
          </div>
          <button className="sd-export-btn" onClick={() => showToast('Exporting security report...')}>
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards — 3 rows × 5 cards (icon-left layout like reference design) */}
      {[0, 1, 2].map((rowIdx) => (
        <div className="sd-metrics-row" key={rowIdx}>
          {metricCards.slice(rowIdx * 5, rowIdx * 5 + 5).map((card, i) => {
            const cmp = getPercentStr(card.value, metricsYesterday?.[card.key]);
            return (
              <div className="sd-metric-card" key={i}>
                <div className="sd-metric-icon-box" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
                <div className="sd-metric-info">
                  <span className="sd-metric-label">{card.label}</span>
                  <div className="sd-metric-value">{card.value}</div>
                  <div className={`sd-metric-change ${cmp.isUp ? 'up' : 'down'}`}>
                    <span>{cmp.isUp ? '▲' : '▼'}</span> {cmp.text} <span className="sd-metric-vs">vs Last 7 Days</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Middle Row: Trend Chart | Top Blocked IPs | Top Security Events */}
      <div className="sd-three-col-row">
        {/* Security Events Trend */}
        <div className="sd-panel sd-trend-panel">
          <div className="sd-panel-header">
            <h3>Security Events Trend</h3>
            <select className="sd-period-select" value={trendPeriod} onChange={(e) => setTrendPeriod(e.target.value)}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>
          <div className="sd-chart-legend">
            {trendDatasets.map((ds, i) => (
              <div key={i} className="sd-legend-item">
                <span className="sd-legend-dot" style={{ background: ds.color }} />
                <span>{ds.label}</span>
              </div>
            ))}
          </div>
          <div className="sd-chart-container">
            <MiniLineChart datasets={trendDatasets} labels={trendLabels} />
          </div>
        </div>

        {/* Top Blocked IPs */}
        <div className="sd-panel">
          <div className="sd-panel-header">
            <h3>Top Blocked IPs</h3>
            <span className="sd-view-all" onClick={() => navigate('/admin/security-management/ip-management')}>View All</span>
          </div>
          <table className="sd-mini-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Blocks</th>
                <th>Last Blocked On</th>
              </tr>
            </thead>
            <tbody>
              {topBlockedIps.length > 0 ? topBlockedIps.map((ip, i) => (
                <tr key={i}>
                  <td className="sd-ip-cell">{ip.ipAddress || ip.ip || '—'}</td>
                  <td><span className="sd-block-count">{ip.blockCount ?? ip.blocks ?? 0}</span></td>
                  <td className="sd-date-cell">{formatDateTime(ip.lastBlockedOn || ip.lastBlockedAt || ip.blockedAt)}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="sd-empty-cell">No blocked IPs found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Security Events */}
        <div className="sd-panel">
          <div className="sd-panel-header">
            <h3>Top Security Events</h3>
            <span className="sd-view-all" onClick={() => navigate('/admin/security-management/security-logs')}>View All</span>
          </div>
          <table className="sd-mini-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Count</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {topSecurityEvents.length > 0 ? topSecurityEvents.map((ev, i) => {
                const totalEvents = topSecurityEvents.reduce((sum, e) => sum + (e.count ?? e.eventCount ?? 0), 0);
                const pct = totalEvents > 0 ? (((ev.count ?? ev.eventCount ?? 0) / totalEvents) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={i}>
                    <td>{ev.eventName || ev.eventType || ev.event || '—'}</td>
                    <td><span className="sd-event-count">{ev.count ?? ev.eventCount ?? 0}</span></td>
                    <td className="sd-pct-cell">{pct}%</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="3" className="sd-empty-cell">No events found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Recent Activities | Email Notifications | B2B Wallet */}
      <div className="sd-three-col-row">
        {/* Recent Security Activities */}
        <div className="sd-panel">
          <div className="sd-panel-header">
            <h3>Recent Security Activities</h3>
            <span className="sd-view-all" onClick={() => navigate('/admin/security-management/security-logs')}>View All</span>
          </div>
          <div className="sd-activity-list">
            {recentActivities.length > 0 ? recentActivities.map((act, i) => {
              const ai = getActivityIcon(act.eventType || act.action || '');
              return (
                <div key={i} className="sd-activity-item">
                  <div className="sd-activity-icon" style={{ background: ai.bg, color: ai.color }}>{ai.icon}</div>
                  <div className="sd-activity-content">
                    <div className="sd-activity-title">{act.eventType || act.action || 'Security Event'}</div>
                    <div className="sd-activity-desc">
                      {act.description || act.reason || act.details || (act.ipAddress ? `IP: ${act.ipAddress}` : (act.accountEmail ? `Account: ${act.accountEmail}` : '—'))}
                    </div>
                  </div>
                  <div className="sd-activity-meta">
                    <span className="sd-activity-time">{formatDateTime(act.createdAt || act.dateTime)}</span>
                    <span className={`sd-activity-badge ${(act.source || act.status || 'system').toLowerCase().includes('auto') ? 'auto' : 'manual'}`}>
                      {act.source || act.status || 'Automatic'}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="sd-empty-activities">No recent activities</div>
            )}
          </div>
        </div>

        {/* Email Notifications (Today) */}
        <div className="sd-panel sd-email-panel">
          <div className="sd-panel-header">
            <h3>Email Notifications (Today)</h3>
            <span className="sd-view-all" onClick={() => navigate('/admin/security-management/email-logs')}>View All</span>
          </div>
          <div className="sd-email-donut-section">
            <DonutChart data={donutData} total={emailStats.total} />
            <div className="sd-email-legend">
              <div className="sd-email-legend-item">
                <span className="sd-legend-dot" style={{ background: '#22c55e' }} />
                <span className="sd-email-legend-label">Delivered</span>
                <span className="sd-email-legend-val">{emailStats.delivered} ({emailStats.total > 0 ? ((emailStats.delivered / emailStats.total) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="sd-email-legend-item">
                <span className="sd-legend-dot" style={{ background: '#ef4444' }} />
                <span className="sd-email-legend-label">Failed</span>
                <span className="sd-email-legend-val">{emailStats.failed} ({emailStats.total > 0 ? ((emailStats.failed / emailStats.total) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="sd-email-legend-item">
                <span className="sd-legend-dot" style={{ background: '#f59e0b' }} />
                <span className="sd-email-legend-label">Pending</span>
                <span className="sd-email-legend-val">{emailStats.pending} ({emailStats.total > 0 ? ((emailStats.pending / emailStats.total) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
            </div>
          </div>
          <div className="sd-email-link" onClick={() => navigate('/admin/security-management/email-logs')}>
            Go to Email Logs →
          </div>
        </div>

        {/* B2B Wallet Overview */}
        <div className="sd-panel">
          <div className="sd-panel-header">
            <h3>B2B Wallet Overview</h3>
            <span className="sd-view-all" onClick={() => navigate('/admin/security-management/b2b-wallet-security')}>View All</span>
          </div>
          <div className="sd-wallet-list">
            <div className="sd-wallet-row">
              <span className="sd-wallet-label">Agents With Low Balance</span>
              <span className="sd-wallet-value red">{walletOverview.agentsLowBalance}</span>
            </div>
            <div className="sd-wallet-row">
              <span className="sd-wallet-label">Agents Restricted</span>
              <span className="sd-wallet-value orange">{walletOverview.agentsRestricted}</span>
            </div>
            <div className="sd-wallet-row">
              <span className="sd-wallet-label">Auto Unblocked Today</span>
              <span className="sd-wallet-value green">{walletOverview.autoUnblockedToday}</span>
            </div>
            <div className="sd-wallet-row">
              <span className="sd-wallet-label">Required Amount (Min.)</span>
              <span className="sd-wallet-value">₹ {walletOverview.requiredAmountMin.toLocaleString('en-IN')}</span>
            </div>
            <div className="sd-wallet-row">
              <span className="sd-wallet-label">Wallet Based Unblock</span>
              <span className={`sd-wallet-badge ${walletOverview.walletBasedUnblock ? 'enabled' : 'disabled'}`}>
                {walletOverview.walletBasedUnblock ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sd-footer-card">
        <span>🔄 All security statistics are updated in real-time. Last updated: {lastUpdated ? formatDateTime(lastUpdated.toISOString()) : '—'}</span>
        <span>Data shown in Asia/Kolkata timezone</span>
      </div>

      {toastMessage && (
        <div className="sec-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
