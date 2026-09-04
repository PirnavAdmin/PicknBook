/* eslint-disable */
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './sidebar_admin.css';

/* ── SVG icon helper ── */
const Ico = ({ children, size = 16 }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const icons = {
  dashboard: <Ico><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Ico>,
  bookings: <Ico><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>,
  cancellation: <Ico><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></Ico>,
  bus: <Ico><rect x="3" y="5" width="18" height="11" rx="2" /><path d="M3 10h18" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></Ico>,
  flight: <Ico><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></Ico>,
  blog: <Ico><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>,
  page: <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></Ico>,
  menu: <Ico><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Ico>,
  offer: <Ico><path d="M20 12V7a2 2 0 0 0-2-2h-5L3 15l6 6 10-10z" /><circle cx="7.5" cy="7.5" r="1.5" /></Ico>,
  customers: <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Ico>,
  query: <Ico><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></Ico>,
  testimonial: <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>,
  hotel: <Ico><path d="M3 21h18M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14M9 9h6M9 13h6M9 17h6" /></Ico>,
  account: <Ico><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></Ico>,
  theme: <Ico><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Ico>,
  payment: <Ico><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><line x1="6" y1="12" x2="6.01" y2="12" /><line x1="18" y1="12" x2="18.01" y2="12" /></Ico>,
  security: <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Ico>,
  email: <Ico><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Ico>,
  site: <Ico><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ico>,
  chevron: <Ico size={14}><polyline points="6 9 12 15 18 9" /></Ico>,
};

const ADMIN = '/admin';
const p = (path = '') => path ? `${ADMIN}/${path}` : ADMIN;

/* ── Nav structure ── */
const navGroups = [
  {
    section: null,
    items: [
      { label: 'Dashboard', to: p(), icon: icons.dashboard, end: true, submenu: [] },
      {
        label: 'Bookings',
        to: p('bookings'),
        icon: icons.bookings,
        submenu: [
          {
            label: 'All Bookings',
            to: p('bookings/all'),
            icon: icons.bookings,
            submenu: [
              { label: 'Flight', to: p('b2c-flight/booking-list'), icon: icons.flight },
              { label: 'Bus', to: p('b2c-bus/booking-list'), icon: icons.bus },
              { label: 'Hotel', to: p('hotel-management/booking-list'), icon: icons.hotel },
            ],
          },
          {
            label: 'Cancellations',
            to: p('bookings/cancellations'),
            icon: icons.cancellation,
            submenu: [
              { label: 'Flight', to: p('b2c-flight/cancellation-request-list'), icon: icons.flight },
              { label: 'Bus', to: p('b2c-bus/cancellation-list'), icon: icons.bus },
              { label: 'Hotel', to: p('hotel-management/cancellation-list'), icon: icons.hotel },
            ],
          },
        ],
      },
      {
        label: 'Promotions',
        to: p('promotions'),
        icon: icons.offer,
        submenu: [
          {
            label: 'Coupons',
            to: p('promotions/coupons'),
            submenu: [
              { label: 'Flight', to: p('b2c-flight/coupon-list') },
              { label: 'Bus', to: p('b2c-bus/coupon-list') },
              { label: 'Hotel', to: p('b2c-hotel/coupon-list') },
            ],
          },
          {
            label: 'Discounts',
            to: p('promotions/discounts'),
            submenu: [
              { label: 'Flight', to: p('b2c-flight/discount-list') },
              { label: 'Bus', to: p('b2c-bus/discount-list') },
              { label: 'Hotel', to: p('b2c-hotel/discount-list') },
            ],
          },
          {
            label: 'Markup',
            to: p('promotions/markup'),
            submenu: [
              { label: 'Bus', to: p('b2c-bus/markup-list') },
              { label: 'Flight', to: p('b2c-flight/markup-list') },
              { label: 'Hotel', to: p('hotel-management/markup-list') },
            ],
          },
          {
            label: 'Offers',
            to: p('promotions/offers'),
            submenu: [
              { label: 'Flight', to: p('offer-management/offers') },
              { label: 'Bus', to: p('offer-management/offers') },
              { label: 'Hotel', to: p('offer-management/offers') },
            ],
          },
        ],
      },
      {
        label: 'Content',
        to: p('content-group'),
        icon: icons.page,
        submenu: [
          { label: 'Blog', to: p('blog-management/blog-list') },
          { label: 'Page Management', to: p('page-management/all-pages') },
          {
            label: 'Popular Routes',
            to: p('content/popular-routes'),
            submenu: [
              { label: 'Bus', to: p('b2c-bus/popular-routes') },
              { label: 'Flight', to: p('b2c-flight/popular-routes') },
              { label: 'Hotel', to: p('hotel-management/popular-destinations') },
            ],
          },
        ],
      },
      {
        label: 'Account Management', to: p('account-management'), icon: icons.account, submenu: [
          { label: 'Account Dashboard', to: p('account-management/dashboard') },
          { label: 'Account Adjustment', to: p('account-management/account-adjustment') },
          { label: 'Balance Sheet', to: p('account-management/balance-sheet') },
          { label: 'Bank List', to: p('account-management/bank-list') },
          { label: 'Payment Upload', to: p('account-management/payment-upload') },
          { label: 'Payment Upload List', to: p('account-management/payment-upload-list') },
          { label: 'QrCode List', to: p('account-management/qrcode-list') },
          { label: 'Reconciliation', to: p('account-management/reconciliation') },
          { label: 'Settlement / Transfer', to: p('account-management/settlement-transfer') },
          { label: 'Transaction Log', to: p('account-management/transaction-log') },
        ],
      },
      {
        label: 'Payment Management', to: p('payment-management'), icon: icons.payment, submenu: [
          { label: 'Bank Detail List', to: p('payment-management/bank-detail-list') },
          { label: 'Manual Invoice', to: p('payment-management/manual-invoice') },
          { label: 'Payment Settings', to: p('payment-management/payment-settings') },
          { label: 'Payment Store', to: p('payment-management/payment-store') },
          { label: 'QrCode List', to: p('payment-management/qrcode-list') },
          { label: 'Tax Management', to: p('payment-management/tax-management') },
          { label: 'Wallet Transaction', to: p('payment-management/wallet-transaction') },
        ],
      },
      {
        label: 'Customers',
        to: p('customers-group'),
        icon: icons.customers,
        submenu: [
          { label: 'Customers', to: p('customer-management/customer-list') },
          { label: 'Queries', to: p('query-management/query-list') },
          { label: 'Deposit Requests', to: p('customer-management/deposit-request-list') },
          {
            label: 'Search History',
            to: p('customers/search-history'),
            submenu: [
              { label: 'Bus', to: p('b2c-bus/search-history') },
              { label: 'Flight', to: p('b2c-flight/search-history') },
              { label: 'Hotel', to: p('hotel-management/search-history') },
            ],
          },
        ],
      },
      {
        label: 'Security Management', to: p('security-management'), icon: icons.security, submenu: [
          { label: 'Security Dashboard', to: p('security-management') },
          { label: 'IP Management', to: p('security-management/ip-management') },
          { label: 'Authentication Security', to: p('security-management/auth-security') },
          { label: 'API Security', to: p('security-management/api-security') },
          { label: 'Account Security', to: p('security-management/account-security') },
          { label: 'Security Limits', to: p('security-management/security-limits') },
          { label: 'Security Audit Logs', to: p('security-management/security-logs') },
        ],
      },
      {
        label: 'Email Management', to: p('email-management'), icon: icons.email, submenu: [
          { label: 'Email Logs', to: p('email-management/email-logs') },
          { label: 'Email Templates', to: p('email-management/email-templates') },
        ],
      },
      {
        label: 'Testimonial Management', to: p('testimonial-management'), icon: icons.testimonial, submenu: [
          { label: 'Category List', to: p('testimonial-management/category-list') },
          { label: 'Testimonial List', to: p('testimonial-management/testimonial-list') },
        ],
      },
    ],
  }
];

function Sidebar({ isOpen = false, onClose, searchQuery = '', setSearchQuery }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [openMenus, setOpenMenus] = useState(new Set());

  const toggleLevel1 = (toKey) => {
    setOpenMenus(prev => {
      const next = new Set();
      if (!prev.has(toKey)) {
        next.add(toKey);
      }
      return next;
    });
  };

  const toggleLevel2 = (parentKey, toKey) => {
    setOpenMenus(prev => {
      const next = new Set();
      next.add(parentKey);
      if (!prev.has(toKey)) {
        next.add(toKey);
      }
      return next;
    });
  };

  const isSubItemActive = (sub) => {
    if (sub.to && (currentPath === sub.to || currentPath.startsWith(sub.to + '/'))) return true;
    if (sub.submenu && sub.submenu.length > 0) {
      return sub.submenu.some(child => currentPath === child.to || currentPath.startsWith(child.to + '/'));
    }
    return false;
  };

  const isParentActive = (item) => {
    if (item.end ? currentPath === item.to : (item.to && currentPath.startsWith(item.to + '/'))) return true;
    if (item.submenu && item.submenu.length > 0) {
      return item.submenu.some(isSubItemActive);
    }
    return false;
  };

  // Filter by search query
  const query = (searchQuery || '').toLowerCase();
  const filterSubmenu = (list) => {
    if (!query) return list;
    return list.filter(s => {
      if (s.label.toLowerCase().includes(query)) return true;
      if (s.submenu && s.submenu.some(c => c.label.toLowerCase().includes(query))) return true;
      return false;
    });
  };

  const filteredGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(item =>
      !query ||
      item.label.toLowerCase().includes(query) ||
      (item.submenu && item.submenu.some(s =>
        s.label.toLowerCase().includes(query) ||
        (s.submenu && s.submenu.some(c => c.label.toLowerCase().includes(query)))
      ))
    ),
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Backdrop — click anywhere outside to close */}
      {isOpen && (
        <div
          className="ds-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside className={`ds-sidebar ${isOpen ? 'ds-sidebar-open' : ''}`}>
        {/* Sidebar header */}
        <div className="ds-sidebar-header">
          <div className="ds-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="ds-brand-name">Admin Panel</span>
        </div>

        {/* Nav */}
        <nav className="ds-nav">
          {filteredGroups.map((group, gi) => (
            <div key={gi} className="ds-group">
              {group.section && (
                <p className="ds-section-label">{group.section}</p>
              )}

              {group.items.map((item) => {
                const isMenuOpen = openMenus.has(item.to);
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const active = hasSubmenu ? isMenuOpen : (item.end ? currentPath === item.to : (item.to && (currentPath === item.to || currentPath.startsWith(item.to + '/'))));

                return (
                  <div key={item.to} className="ds-item-wrap">
                    {/* Level 1 Parent row */}
                    {hasSubmenu ? (
                      <button
                        className={`ds-nav-row ${active ? 'ds-active' : ''}`}
                        onClick={() => toggleLevel1(item.to)}
                        type="button"
                      >
                        <span className={`ds-nav-icon ${active ? 'ds-icon-active' : ''}`}>
                          {item.icon}
                        </span>
                        <span className="ds-nav-label">{item.label}</span>
                        <span className={`ds-chevron ${isMenuOpen ? 'ds-chevron-open' : ''}`}>
                          {icons.chevron}
                        </span>
                      </button>
                    ) : (
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `ds-nav-row${isActive ? ' ds-active' : ''}`}
                        onClick={onClose}
                      >
                        <span className={`ds-nav-icon ${active ? 'ds-icon-active' : ''}`}>
                          {item.icon}
                        </span>
                        <span className="ds-nav-label">{item.label}</span>
                      </NavLink>
                    )}

                    {/* Level 1 Submenu */}
                    {hasSubmenu && (
                      <div className={`ds-submenu ${isMenuOpen ? 'ds-submenu-open' : ''}`}>
                        {filterSubmenu(item.submenu).map(sub => {
                          const hasLevel2Sub = sub.submenu && sub.submenu.length > 0;
                          const isLevel2Open = openMenus.has(sub.to);
                          const isLevel2HeaderActive = isLevel2Open;

                          if (hasLevel2Sub) {
                            return (
                              <div key={sub.to} className="ds-item-wrap">
                                <button
                                  className={`ds-sub-parent-row ${isLevel2HeaderActive ? 'ds-active' : ''}`}
                                  onClick={() => toggleLevel2(item.to, sub.to)}
                                  type="button"
                                >
                                  <span className="ds-sub-dot"></span>
                                  <span className="ds-nav-label">{sub.label}</span>
                                  <span className={`ds-chevron ${isLevel2Open ? 'ds-chevron-open' : ''}`}>
                                    {icons.chevron}
                                  </span>
                                </button>
                                <div className={`ds-nested-submenu ${isLevel2Open ? 'ds-submenu-open' : ''}`}>
                                  {filterSubmenu(sub.submenu).map(child => (
                                    <NavLink
                                      key={child.to}
                                      to={child.to}
                                      end={child.end !== undefined ? child.end : true}
                                      className={({ isActive }) => `ds-sub-nested-row${isActive ? ' ds-sub-active' : ''}`}
                                      onClick={onClose}
                                    >
                                      <span className="ds-sub-dot" style={{ width: '4px', height: '4px' }}></span>
                                      {child.label}
                                    </NavLink>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <NavLink
                              key={sub.to}
                              to={sub.to}
                              end={sub.end !== undefined ? sub.end : true}
                              className={({ isActive }) => `ds-sub-row${isActive ? ' ds-sub-active' : ''}`}
                              onClick={onClose}
                            >
                              <span className="ds-sub-dot"></span>
                              {sub.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
