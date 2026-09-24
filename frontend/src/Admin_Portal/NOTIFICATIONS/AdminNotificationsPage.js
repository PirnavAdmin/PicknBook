/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bus,
  Plane,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  User,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowRight,
  ShieldAlert,
  Wallet,
  CreditCard,
  Tag,
  MessageSquare,
  CheckCheck
} from 'lucide-react';
import './AdminNotificationsPage.css';
import { adminNotificationService } from '../../services/adminNotificationService';
import { getAdminDashboardSummary } from '../../services/adminDashboardService';

// Mock Initial Data Fallbacks for all categories to ensure UI works seamlessly even before backend events occur
const MOCK_BUS_NOTIFICATIONS = [
  { id: 901, searchId: 'sh-901', title: 'New Bus Search', route: 'Bangalore → Hyderabad', user: 'Rajesh Sharma (AGT-12)', date: '23 Sept 2026, 11:30 AM', category: 'Bus', status: 'Active', severity: 'Low', path: '/admin/b2c-bus/search-history' },
  { id: 902, searchId: 'sh-902', title: 'Seat Reservation Requested', route: 'Mumbai → Pune', user: 'Siva sai reddy (CUST-15)', date: '23 Sept 2026, 11:15 AM', category: 'Bus', status: 'Pending', severity: 'Medium', path: '/admin/b2c-bus/search-history' },
  { id: 903, searchId: 'sh-903', title: 'Bus Cancellation Query', route: 'Chennai → Vijayawada', user: 'Priya Verma (CUST-8)', date: '23 Sept 2026, 10:45 AM', category: 'Bus', status: 'Action Needed', severity: 'High', path: '/admin/b2c-bus/search-history' },
  { id: 904, searchId: 'sh-904', title: 'Frequent Search Route', route: 'Hyderabad → Goa', user: 'Amit Patel (AGT-8)', date: '23 Sept 2026, 10:10 AM', category: 'Bus', status: 'Active', severity: 'Low', path: '/admin/b2c-bus/search-history' },
  { id: 905, searchId: 'sh-905', title: 'Express Route Search', route: 'Delhi → Jaipur', user: 'Vikram Singh (CUST-22)', date: '23 Sept 2026, 09:50 AM', category: 'Bus', status: 'Active', severity: 'Low', path: '/admin/b2c-bus/search-history' },
];

const MOCK_FLIGHT_NOTIFICATIONS = [
  { id: 101, searchId: 'flt-101', title: 'Flight Search Query', route: 'DEL → BOM (Delhi to Mumbai)', user: 'Anil Kumar (CUST-40)', date: '23 Sept 2026, 11:42 AM', category: 'Flight', status: 'Active', severity: 'Low', path: '/admin/b2c-flight/flight-search-history' },
  { id: 102, searchId: 'flt-102', title: 'International Fare Search', route: 'BOM → DXB (Dubai)', user: 'Global Travels (AGT-04)', date: '23 Sept 2026, 11:10 AM', category: 'Flight', status: 'Active', severity: 'Low', path: '/admin/b2c-flight/flight-search-history' },
  { id: 103, searchId: 'flt-103', title: 'Round Trip Inquiry', route: 'BLR → DEL (Bangalore to Delhi)', user: 'Meera Nair (CUST-19)', date: '23 Sept 2026, 10:30 AM', category: 'Flight', status: 'Pending', severity: 'Medium', path: '/admin/b2c-flight/flight-search-history' },
  { id: 104, searchId: 'flt-104', title: 'Corporate Flight Log', route: 'HYD → MAA (Hyderabad to Chennai)', user: 'TechCorp Admin (AGT-88)', date: '23 Sept 2026, 09:55 AM', category: 'Flight', status: 'Completed', severity: 'Low', path: '/admin/b2c-flight/flight-search-history' },
];

const MOCK_HOTEL_NOTIFICATIONS = [
  { id: 8127, searchId: 'sh-8127', title: 'Hotel Search Query', route: 'Hyderabad (2 Guests, 1 Room)', user: 'Siva sai reddy (CUST-15)', date: '23 Sept 2026, 11:25 AM', category: 'Hotel', status: 'Active', severity: 'Low', path: '/admin/b2c-hotel/search-history' },
  { id: 8128, searchId: 'sh-8128', title: 'Luxury Resort Search', route: 'Goa (4 Guests, 2 Rooms)', user: 'Sunil Rao (AGT-33)', date: '23 Sept 2026, 10:50 AM', category: 'Hotel', status: 'Active', severity: 'Low', path: '/admin/b2c-hotel/search-history' },
  { id: 8129, searchId: 'sh-8129', title: 'Business Hotel Check-In', route: 'Mumbai (1 Guest, 1 Room)', user: 'Pooja Hegde (CUST-90)', date: '23 Sept 2026, 10:15 AM', category: 'Hotel', status: 'Action Needed', severity: 'High', path: '/admin/b2c-hotel/search-history' },
];

const MOCK_SECURITY_NOTIFICATIONS = [
  { id: 501, title: 'Suspicious Method Blocked', route: 'IP: 192.168.1.45 (Fraud Lock)', user: 'Unknown Device (SEC-88)', date: '23 Sept 2026, 11:50 AM', category: 'Security', status: 'Critical', severity: 'Critical', path: '/admin/security' },
  { id: 502, title: 'New Agent Registration', route: 'TravelSolutions Ltd (B2B Agent)', user: 'Karan Malhotra (AGT-99)', date: '23 Sept 2026, 10:35 AM', category: 'Security', status: 'Pending Review', severity: 'Medium', path: '/admin/agent-management' },
  { id: 503, title: 'Account Unblocked by Admin', route: 'User Lock Removed', user: 'Ramesh Babu (CUST-52)', date: '23 Sept 2026, 09:15 AM', category: 'Security', status: 'Completed', severity: 'Low', path: '/admin/customer-management' },
];

const MOCK_WALLET_NOTIFICATIONS = [
  { id: 601, title: 'Low Wallet Balance Alert', route: 'Agent Wallet < ₹1,000 Threshold', user: 'Apex Travels (AGT-44)', date: '23 Sept 2026, 11:05 AM', category: 'Wallet', status: 'High', severity: 'High', path: '/admin/b2b-agents/wallets' },
  { id: 602, title: 'Agent Wallet Top-up', route: '₹50,000 Added via PG (Txn #9812)', user: 'Global Express (AGT-04)', date: '23 Sept 2026, 10:20 AM', category: 'Wallet', status: 'Completed', severity: 'Low', path: '/admin/b2b-agents/wallets' },
  { id: 603, title: 'Payment Gateway Alert', route: 'Razorpay Webhook Delay (2 retries)', user: 'System Gateway', date: '23 Sept 2026, 09:40 AM', category: 'Wallet', status: 'Medium', severity: 'Medium', path: '/admin/payments' },
];

const MOCK_PROMO_NOTIFICATIONS = [
  { id: 701, title: 'Festival Coupon Redeemed', route: 'FLAT200 Applied (Discount: ₹200)', user: 'Rahul Verma (CUST-102)', date: '23 Sept 2026, 11:28 AM', category: 'Offers', status: 'Active', severity: 'Low', path: '/admin/promotions/coupons' },
  { id: 702, title: 'New Customer Support Ticket', route: 'Refund Query #TCK-4921', user: 'Sneha Patel (CUST-39)', date: '23 Sept 2026, 10:55 AM', category: 'Offers', status: 'Pending', severity: 'Medium', path: '/admin/support/queries' },
  { id: 703, title: 'Automated Email Reminder Sent', route: 'Payment Pending Reminder (Booking #B88)', user: 'System Mailer', date: '23 Sept 2026, 09:00 AM', category: 'Offers', status: 'Completed', severity: 'Low', path: '/admin/notifications' },
];

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // States per category
  const [busNotifications, setBusNotifications] = useState(MOCK_BUS_NOTIFICATIONS);
  const [flightNotifications, setFlightNotifications] = useState(MOCK_FLIGHT_NOTIFICATIONS);
  const [hotelNotifications, setHotelNotifications] = useState(MOCK_HOTEL_NOTIFICATIONS);
  const [securityNotifications, setSecurityNotifications] = useState(MOCK_SECURITY_NOTIFICATIONS);
  const [walletNotifications, setWalletNotifications] = useState(MOCK_WALLET_NOTIFICATIONS);
  const [promoNotifications, setPromoNotifications] = useState(MOCK_PROMO_NOTIFICATIONS);

  // Expansion toggles per card (default false = show 5 items)
  const [expandedCards, setExpandedCards] = useState({
    bus: false,
    flight: false,
    hotel: false,
    security: false,
    wallet: false,
    promo: false
  });

  // Fetch real notifications from Backend API & map payload structure
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch unread count from backend
      const count = await adminNotificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);

      // 2. Fetch notifications list from backend (GET /api/admin/notifications)
      const res = await adminNotificationService.getNotifications({ pageSize: 100 });
      const rawItems = Array.isArray(res) ? res : (res?.data || res?.items || []);

      if (rawItems && rawItems.length > 0) {
        // Map backend schema (Severity, ActionUrl, integer Ids)
        const normalized = rawItems.map(item => {
          const cat = item.category || item.Category || 'General';
          const sev = item.severity || item.Severity || item.priority || 'Medium';
          const path = item.actionUrl || item.ActionUrl || item.entityPath || item.path || '/admin/dashboard';
          const routeStr = item.route || item.message || item.description || 'System Log';
          const userStr = item.user || item.userRef || item.userName || 'Admin / System';
          const dateStr = item.date || item.createdAt ? new Date(item.createdAt).toLocaleString() : new Date().toLocaleString();

          return {
            id: item.id || item.Id || Math.random(),
            searchId: item.searchId || item.entityId || item.id,
            title: item.title || item.Title || `${cat} Notification`,
            route: routeStr,
            user: userStr,
            date: dateStr,
            category: cat,
            severity: sev,
            status: item.status || sev,
            path: path,
            isRead: item.isRead || item.IsRead || false
          };
        });

        // Group into category lists
        const bus = normalized.filter(n => n.category.toLowerCase().includes('bus'));
        const flight = normalized.filter(n => n.category.toLowerCase().includes('flight'));
        const hotel = normalized.filter(n => n.category.toLowerCase().includes('hotel'));
        const security = normalized.filter(n => n.category.toLowerCase().includes('sec') || n.category.toLowerCase().includes('user'));
        const wallet = normalized.filter(n => n.category.toLowerCase().includes('wall') || n.category.toLowerCase().includes('pay'));
        const promo = normalized.filter(n => n.category.toLowerCase().includes('off') || n.category.toLowerCase().includes('coupon') || n.category.toLowerCase().includes('query') || n.category.toLowerCase().includes('remind'));

        if (bus.length > 0) setBusNotifications(bus);
        if (flight.length > 0) setFlightNotifications(flight);
        if (hotel.length > 0) setHotelNotifications(hotel);
        if (security.length > 0) setSecurityNotifications(security);
        if (wallet.length > 0) setWalletNotifications(wallet);
        if (promo.length > 0) setPromoNotifications(promo);
      }
    } catch (err) {
      console.warn("Using mock fallbacks for Admin Notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const toggleExpand = (categoryKey) => {
    setExpandedCards(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const handleNotificationClick = async (item) => {
    if (item.id && !item.isRead) {
      await adminNotificationService.markAsRead(item.id);
    }
    const targetPath = item.path || '/admin/dashboard';
    const targetUrl = targetPath.includes('?') 
      ? `${targetPath}&highlightId=${encodeURIComponent(item.searchId || item.id)}`
      : `${targetPath}?highlightId=${encodeURIComponent(item.searchId || item.id)}`;
    navigate(targetUrl);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await adminNotificationService.markAllAsRead();
    setUnreadCount(0);
    fetchNotifications();
  };

  const getSeverityClass = (sev) => {
    const s = String(sev || '').toLowerCase();
    if (s.includes('crit') || s.includes('high') || s.includes('action')) return 'anp-status-critical';
    if (s.includes('med') || s.includes('pend')) return 'anp-status-medium';
    return 'anp-status-low';
  };

  return (
    <div className="anp-container">
      {/* Top Header Banner */}
      <div className="anp-header-card">
        <div className="anp-header-left">
          <div className="anp-header-icon">
            <Bell size={24} color="#ffffff" />
          </div>
          <div>
            <h2 className="anp-title">Admin Notification Center</h2>
            <p className="anp-subtitle">Live real-time activity, search history, security alerts, and financial logs.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="anp-header-stats">
            <div className="anp-stat-chip">
              <Bus size={15} /> <span>{busNotifications.length} Bus</span>
            </div>
            <div className="anp-stat-chip">
              <Plane size={15} /> <span>{flightNotifications.length} Flight</span>
            </div>
            <div className="anp-stat-chip">
              <Building2 size={15} /> <span>{hotelNotifications.length} Hotel</span>
            </div>
            <div className="anp-stat-chip">
              <ShieldAlert size={15} /> <span>{securityNotifications.length} Security</span>
            </div>
            <div className="anp-stat-chip">
              <Wallet size={15} /> <span>{walletNotifications.length} Wallet</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleMarkAllRead}
              className="anp-toggle-btn"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}
              title="Mark all as read"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
            <button
              onClick={fetchNotifications}
              className="anp-toggle-btn"
              style={{ background: '#ffffff', color: '#A51C49', border: 'none' }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'anp-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Categorized Notification Cards */}
      <div className="anp-cards-grid">
        
        {/* 1. BUS NOTIFICATIONS CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-bus">
            <div className="anp-card-title-group">
              <Bus size={20} className="anp-cat-icon" />
              <h3>Bus Notifications</h3>
            </div>
            <span className="anp-badge-count">{busNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.bus ? busNotifications : busNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <MapPin size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view line in table <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {busNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('bus')}>
                {expandedCards.bus ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({busNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

        {/* 2. FLIGHT NOTIFICATIONS CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-flight">
            <div className="anp-card-title-group">
              <Plane size={20} className="anp-cat-icon" />
              <h3>Flight Notifications</h3>
            </div>
            <span className="anp-badge-count">{flightNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.flight ? flightNotifications : flightNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <MapPin size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view line in table <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {flightNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('flight')}>
                {expandedCards.flight ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({flightNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

        {/* 3. HOTEL NOTIFICATIONS CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-hotel">
            <div className="anp-card-title-group">
              <Building2 size={20} className="anp-cat-icon" />
              <h3>Hotel Notifications</h3>
            </div>
            <span className="anp-badge-count">{hotelNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.hotel ? hotelNotifications : hotelNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <MapPin size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view line in table <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {hotelNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('hotel')}>
                {expandedCards.hotel ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({hotelNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

        {/* 4. SECURITY & USER CONTROL CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-security">
            <div className="anp-card-title-group">
              <ShieldAlert size={20} color="#dc2626" className="anp-cat-icon" />
              <h3>Security & User Control</h3>
            </div>
            <span className="anp-badge-count">{securityNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.security ? securityNotifications : securityNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <ShieldAlert size={13} style={{ marginRight: '4px', flexShrink: 0, color: '#dc2626' }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view security log <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {securityNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('security')}>
                {expandedCards.security ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({securityNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

        {/* 5. WALLET & PAYMENTS CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-wallet">
            <div className="anp-card-title-group">
              <Wallet size={20} color="#0d9488" className="anp-cat-icon" />
              <h3>Wallet & Payments</h3>
            </div>
            <span className="anp-badge-count">{walletNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.wallet ? walletNotifications : walletNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <CreditCard size={13} style={{ marginRight: '4px', flexShrink: 0, color: '#0d9488' }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view wallet details <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {walletNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('wallet')}>
                {expandedCards.wallet ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({walletNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

        {/* 6. OFFERS, QUERIES & REMINDERS CARD */}
        <div className="anp-category-card">
          <div className="anp-card-header anp-card-header-payments">
            <div className="anp-card-title-group">
              <Tag size={20} color="#9333ea" className="anp-cat-icon" />
              <h3>Coupons, Queries & Mailers</h3>
            </div>
            <span className="anp-badge-count">{promoNotifications.length} Logs</span>
          </div>
          
          <div className="anp-card-body">
            {(expandedCards.promo ? promoNotifications : promoNotifications.slice(0, 5)).map((item, idx) => (
              <div
                key={item.id || idx}
                className="anp-notif-item"
                onClick={() => handleNotificationClick(item)}
              >
                <div className="anp-item-top">
                  <span className="anp-item-title">{item.title}</span>
                  <span className={`anp-status-pill ${getSeverityClass(item.severity)}`}>
                    {item.severity || item.status}
                  </span>
                </div>
                <div className="anp-item-route">
                  <MessageSquare size={13} style={{ marginRight: '4px', flexShrink: 0, color: '#9333ea' }} />
                  <strong>{item.route}</strong>
                </div>
                <div className="anp-item-meta">
                  <span><User size={12} /> {item.user}</span>
                  <span><Clock size={12} /> {item.date}</span>
                </div>
                <div className="anp-item-hover-hint">
                  Click to view offer/support log <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>

          {promoNotifications.length > 5 && (
            <div className="anp-card-footer">
              <button className="anp-toggle-btn" onClick={() => toggleExpand('promo')}>
                {expandedCards.promo ? <>Show Less <ChevronUp size={16} /></> : <>+ View More ({promoNotifications.length - 5} more) <ChevronDown size={16} /></>}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
