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
  site: <Ico><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ico>,
  chevron: <Ico size={14}><polyline points="6 9 12 15 18 9" /></Ico>,
};

const ADMIN = '/admin';
const p = (path = '') => path ? `${ADMIN}/${path}` : ADMIN;

/* ── Nav structure with section groups ── */
const navGroups = [
  {
    section: null,
    items: [
      { label: 'Dashboard', to: p(), icon: icons.dashboard, end: true, submenu: [] },
      {
        label: 'Account Management', to: p('account-management'), icon: icons.account, submenu: [
          { label: 'Transaction Log', to: p('account-management/transaction-log') },
          { label: 'Bank List', to: p('account-management/bank-list') },
          { label: 'QrCode List', to: p('account-management/qrcode-list') },
          { label: 'Payment Upload', to: p('account-management/payment-upload') },
          { label: 'Payment Upload List', to: p('account-management/payment-upload-list') },
          { label: 'Balance Sheet', to: p('account-management/balance-sheet') },
        ],
      },
    ],
  },
  {
    section: null,
    items: [
      {
        label: 'B2B Management', to: p('b2b-management'), icon: icons.customers, submenu: [
          { label: 'Agent Management', to: p('b2b-management/agent-management') },
          { label: 'Agent Bookings', to: p('b2b-management/agent-bookings') },
          { label: 'Deposit Management', to: p('b2b-management/deposit-management') },
          { label: 'Wallet Management', to: p('b2b-management/wallet-management') },
          { label: 'Ledger Details', to: p('b2b-management/ledger') },
          { label: 'Commission Rules', to: p('b2b-management/commission-management') },
          { label: 'Markup Settings', to: p('b2b-management/markup-management') },
          { label: 'B2B Reports', to: p('b2b-management/reports') },
          { label: 'Top Sectors', to: p('b2b-management/top-routes') },
          { label: 'Broadcaster Alerts', to: p('b2b-management/notifications') },
          { label: 'Audit Log Traces', to: p('b2b-management/logs') },
          { label: 'Portal Configs', to: p('b2b-management/settings') }
        ]
      }
    ]
  },
  {
    section: null,
    items: [
      {
        label: 'B2C Bus Management', to: p('b2c-bus'), icon: icons.bus, submenu: [
          { label: 'Booking List', to: p('b2c-bus/booking-list') },
          { label: 'Discount List', to: p('b2c-bus/discount-list') },
          { label: 'Add Discount', to: p('b2c-bus/add-discount') },
          { label: 'Discount Mapping', to: p('b2c-bus/discount-mapping') },
          { label: 'Markup List', to: p('b2c-bus/markup-list') },
          { label: 'GST Settings', to: p('b2c-bus/gst-settings') },
          { label: 'Coupon List', to: p('b2c-bus/coupon-list') },
          { label: 'Used Coupon List', to: p('b2c-bus/used-coupon-list') },
          { label: 'Convenience Fee', to: p('b2c-bus/convenience-fee') },
          { label: 'Cancellation List', to: p('b2c-bus/cancellation-list') },
          { label: 'Search History', to: p('b2c-bus/search-history') },
          { label: 'Voucher Settings', to: p('b2c-bus/voucher-settings') },
          { label: 'Popular Routes', to: p('b2c-bus/popular-routes') },
        ],
      },
      {
        label: 'B2C Flight Management', to: p('b2c-flight'), icon: icons.flight, submenu: [
          { label: 'Booking List', to: p('b2c-flight/booking-list') },
          { label: 'Discount List', to: p('b2c-flight/discount-list') },
          { label: 'Add Discount', to: p('b2c-flight/add-discount') },
          { label: 'Markup List', to: p('b2c-flight/markup-list') },
          { label: 'Coupon List', to: p('b2c-flight/coupon-list') },
          { label: 'Used Coupon List', to: p('b2c-flight/used-coupon-list') },
          { label: 'Convenience Fee', to: p('b2c-flight/convenience-fee') },
          { label: 'Add Convenience Fee', to: p('b2c-flight/add-convenience-fee') },
          { label: 'Cancellation Requests', to: p('b2c-flight/cancellation-request-list') },
          { label: 'Remark List', to: p('b2c-flight/remark-list') },
          { label: 'Edit Remark', to: p('b2c-flight/remark-edit-list') },
          { label: 'Amendments List', to: p('b2c-flight/amendments-list') },
          { label: 'Allowed Fare Types', to: p('b2c-flight/allowed-fare-type') },
          { label: 'Flight Search History', to: p('b2c-flight/search-history') },
          { label: 'Pending Airline List', to: p('b2c-flight/pending-airline-list') },
          { label: 'Airline Web Check Links', to: p('b2c-flight/airline-webcheck-link') },
          { label: 'Airline Brand List', to: p('b2c-flight/airline-brands') },
          { label: 'Popular Routes', to: p('b2c-flight/popular-routes') },
          { label: 'Popular Destinations', to: p('b2c-flight/popular-destination') },
          { label: 'Voucher Settings', to: p('b2c-flight/voucher-settings') },
        ],
      },
      {
        label: 'B2C Hotel Management', to: p('b2c-hotel'), icon: icons.hotel, submenu: [
          { label: 'Discount List', to: p('b2c-hotel/discount-list') },
          { label: 'Coupon List', to: p('b2c-hotel/coupon-list') },
          { label: 'Convenience Fee', to: p('b2c-hotel/convenience-fee') },
          { label: 'GST Settings', to: p('b2c-hotel/gst-settings') },
          { label: 'Voucher Settings', to: p('b2c-hotel/voucher-settings') },
          { label: 'Booking List', to: p('hotel-management/booking-list') },
          { label: 'Cancellation List', to: p('hotel-management/cancellation-list') },
          { label: 'Search History', to: p('hotel-management/search-history') },
          { label: 'Popular Destinations', to: p('hotel-management/popular-destinations') },
        ],
      },
    ],
  },
  {
    section: 'CONTENT MANAGEMENT',
    items: [
      {
        label: 'Blog Management', to: p('blog-management'), icon: icons.blog, submenu: [
          { label: 'Blog List', to: p('blog-management/blog-list') },
          { label: 'Add Blog', to: p('blog-management/add-blog') },
          { label: 'Blog Category List', to: p('blog-management/blog-category-list') },
          { label: 'Add Blog Category', to: p('blog-management/add-blog-category') },
          { label: 'Blog Sub Category List', to: p('blog-management/blog-sub-category-list') },
          { label: 'Add Blog Sub Category', to: p('blog-management/add-blog-sub-category') },
        ],
      },
      {
        label: 'Menu Management', to: p('menu-management'), icon: icons.menu, submenu: [
          { label: 'Menu List', to: p('menu-management/menus') },
          { label: 'Add Menu', to: p('menu-management/menus/new') },
        ],
      },
      {
        label: 'Offer Management', to: p('offer-management'), icon: icons.offer, submenu: [
          { label: 'Offer List', to: p('offer-management/offers') },
          { label: 'Add New Offer', to: p('offer-management/offers/new') },
        ],
      },
      {
        label: 'Page Management', to: p('page-management'), icon: icons.page, submenu: [
          { label: 'All Page List', to: p('page-management/all-pages') },
          { label: 'Add New Page', to: p('page-management/add-page') },
          { label: 'About Us', to: p('page-management/about-us') },
        ],
      },
      {
        label: 'Payment Management', to: p('payment-management'), icon: icons.payment, submenu: [
          { label: 'Payment Setting', to: p('payment-setting') },
          { label: 'Bank Detail List', to: p('bank-detail-list') },
          { label: 'Tax Management', to: p('tax-management') },
          { label: 'Manual Invoice List', to: p('manual-invoice-list') },
          { label: 'QR Code List', to: p('qrcode-list') },
          { label: 'Payment Store Data', to: p('payment-store-data') },
          { label: 'Wallet Transaction List', to: p('wallet-transaction-list') },
        ],
      },
    ],
  },
  {
    section: 'USER MANAGEMENT',
    items: [
      {
        label: 'Customer Management', to: p('customer-management'), icon: icons.customers, submenu: [
          { label: 'Customer List', to: p('customer-management/customer-list') },
          { label: 'Add New Customer', to: p('customer-management/add-new-customer') },
          { label: 'Deposit Request List', to: p('customer-management/deposit-request-list') },
        ],
      },
      {
        label: 'Query Management', to: p('query-management'), icon: icons.query, submenu: [
          { label: 'Query List', to: p('query-management/query-list') },
        ],
      },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      {
        label: 'Security Management', to: p('security-management'), icon: icons.security, submenu: [
          { label: 'Black List IP', to: p('security-management/black-list-ip') },
          { label: 'White List IP', to: p('security-management/white-list-ip') },
        ],
      },
      {
        label: 'Site Management', to: p('site-management'), icon: icons.site, submenu: [
          { label: 'Site Setting', to: p('site-management/site-setting') },
          { label: 'Social Links', to: p('site-management/social-links') },
          { label: 'Slider Image', to: p('site-management/slider-image') },
          { label: 'Add Home Slider Image', to: p('site-management/add-home-slider-image') },
          { label: 'Home Slider 2 Image', to: p('site-management/home-slider-2-image') },
          { label: 'Add Home Slider 2 Image', to: p('site-management/add-home-slider-2-image') },
          { label: 'Manual Booking Supplier', to: p('site-management/manual-booking-supplier') },
          { label: 'Meta Data List', to: p('site-management/meta-data-list') },
          { label: 'Seo Link List', to: p('site-management/seo-link-list') },
        ],
      },
      {
        label: 'Testimonial Management', to: p('testimonial-management'), icon: icons.testimonial, submenu: [
          { label: 'Category List', to: p('testimonial-management/category-list') },
          { label: 'Testimonial List', to: p('testimonial-management/testimonial-list') },
          { label: 'Add Testimonial', to: p('testimonial-management/add-testimonial') },
        ],
      },
      {
        label: 'Theme Management', to: p('theme-management'), icon: icons.theme, submenu: [
          { label: 'B2C Header Theme', to: p('theme-management/b2c-header-theme') },
          { label: 'B2C Home Theme', to: p('theme-management/b2c-home-theme') },
          { label: 'B2C Footer Theme', to: p('theme-management/b2c-footer-theme') },
          { label: 'Themes List', to: p('theme-management/themes-list') },
        ],
      },
    ],
  }
];

function Sidebar({ isOpen = false, onClose, searchQuery = '', setSearchQuery }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState(() => {
    // Auto-open the group that contains the current route
    const open = new Set();
    navGroups.forEach(g => g.items.forEach(item => {
      if (item.submenu.some(s => location.pathname.startsWith(s.to)) ||
        location.pathname.startsWith(item.to + '/')) {
        open.add(item.to);
      }
    }));
    return open;
  });

  const toggle = (to) => {
    setOpenMenus(prev => {
      const next = new Set(prev);
      next.has(to) ? next.delete(to) : next.add(to);
      return next;
    });
  };

  const isParentActive = (item) =>
    item.submenu.some(s => location.pathname === s.to || location.pathname.startsWith(s.to + '/')) ||
    (item.submenu.length === 0 && (item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)));

  // Filter by search query
  const query = (searchQuery || '').toLowerCase();
  const filteredGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(item =>
      !query ||
      item.label.toLowerCase().includes(query) ||
      item.submenu.some(s => s.label.toLowerCase().includes(query))
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
                const active = isParentActive(item);
                const isMenuOpen = openMenus.has(item.to);
                const hasSubmenu = item.submenu.length > 0;

                return (
                  <div key={item.to} className="ds-item-wrap">
                    {/* Parent row */}
                    {hasSubmenu ? (
                      <button
                        className={`ds-nav-row ${active ? 'ds-active' : ''}`}
                        onClick={() => toggle(item.to)}
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

                    {/* Submenu */}
                    {hasSubmenu && (
                      <div className={`ds-submenu ${isMenuOpen ? 'ds-submenu-open' : ''}`}>
                        {item.submenu
                          .filter(s => !query || s.label.toLowerCase().includes(query))
                          .map(sub => (
                            <NavLink
                              key={sub.to}
                              to={sub.to}
                              className={({ isActive }) => `ds-sub-row${isActive ? ' ds-sub-active' : ''}`}
                              onClick={onClose}
                            >
                              <span className="ds-sub-dot"></span>
                              {sub.label}
                            </NavLink>
                          ))}
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
