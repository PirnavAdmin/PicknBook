import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './sidebar_admin.css';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'nav-icon-svg',
  'aria-hidden': 'true'
};

const icons = {
  dashboard: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
  account: (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  bus: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="11" rx="2" />
      <path d="M3 10h18" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  ),
  flight: (
    <svg {...iconProps}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  hotel: (
    <svg {...iconProps}>
      <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 11h2m-2 4h2m4-4h2m-2 4h2" />
    </svg>
  ),
  blog: (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  customers: (
    <svg {...iconProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  menu: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="3" height="3" rx="1" />
      <rect x="3" y="10.5" width="3" height="3" rx="1" />
      <rect x="3" y="16" width="3" height="3" rx="1" />
      <line x1="8" y1="6.5" x2="21" y2="6.5" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="17.5" x2="21" y2="17.5" />
    </svg>
  ),
  offer: (
    <svg {...iconProps}>
      <path d="M20 12V7a2 2 0 0 0-2-2h-5L3 15l6 6 10-10z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  ),
  page: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  payment: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="7" y1="15" x2="11" y2="15" />
    </svg>
  ),
  query: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
      <circle cx="12" cy="17" r="0.8" />
    </svg>
  ),
  security: (
    <svg {...iconProps}>
      <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" />
    </svg>
  ),
  site: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
  testimonial: (
    <svg {...iconProps}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  theme: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" />
      <line x1="17.5" y1="17.5" x2="19.5" y2="19.5" />
      <line x1="4.5" y1="19.5" x2="6.5" y2="17.5" />
      <line x1="17.5" y1="6.5" x2="19.5" y2="4.5" />
    </svg>
  ),
  chevronDown: (
    <svg {...iconProps} strokeWidth="1.5">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )
};

const ADMIN_BASE = '/admin';

const adminPath = (path = '') => (path ? `${ADMIN_BASE}/${path}` : ADMIN_BASE);

const navItems = [
  {
    label: 'Dashboard',
    to: adminPath(),
    icon: icons.dashboard,
    submenu: []
  },
  // {
  //   label: 'Account Management',
  //   to: adminPath('account-management'),
  //   icon: icons.account,
  //   submenu: [
  //     { label: 'Transaction Log', to: adminPath('account-management/transaction-log') },
  //     { label: 'Bank List', to: adminPath('account-management/bank-list') },
  //     { label: 'QrCode List', to: adminPath('account-management/qrcode-list') },
  //     { label: 'Payment Upload', to: adminPath('account-management/payment-upload') },
  //     { label: 'Payment Upload List', to: adminPath('account-management/payment-upload-list') },
  //     { label: 'Balance Sheet', to: adminPath('account-management/balance-sheet') }
  //   ]
  // },
  {
    label: 'B2C Bus Management',
    to: adminPath('b2c-bus'),
    icon: icons.bus,
    submenu: [
      { label: 'Booking List', to: adminPath('b2c-bus/booking-list') },
      { label: 'Discount List', to: adminPath('b2c-bus/discounts') },
      { label: 'Add Discount', to: adminPath('b2c-bus/discounts/new') },
      { label: 'Discount Mapping', to: adminPath('b2c-bus/discount-mapping') },
      { label: 'Markup List', to: adminPath('b2c-bus/markup-list') },
      { label: 'GST Settings', to: adminPath('b2c-bus/gst-settings') },
      { label: 'Coupon List', to: adminPath('b2c-bus/coupon-list') },
      { label: 'Used Coupon List', to: adminPath('b2c-bus/used-coupon-list') },
      { label: 'Convenience Fee', to: adminPath('b2c-bus/convenience-fee') },
      { label: 'Edit Convenience Fee', to: adminPath('b2c-bus/convenience-fee/edit') },
      { label: 'Cancellation List', to: adminPath('b2c-bus/cancellation-list') },
      { label: 'Search History', to: adminPath('b2c-bus/search-history') },
      { label: 'Voucher Settings', to: adminPath('b2c-bus/voucher-settings') },
      { label: 'Popular Bus Routes', to: adminPath('b2c-bus/popular-routes') }
    ]
  },
  {
    label: 'B2C Flight Management',
    to: adminPath('b2c-flight'),
    icon: icons.flight,
    submenu: [
      { label: 'Booking List', to: adminPath('b2c-flight/booking-list') },
      { label: 'Discount List', to: adminPath('b2c-flight/discounts') },
      { label: 'Add Discount', to: adminPath('b2c-flight/discounts/new') },
      { label: 'Markup List', to: adminPath('b2c-flight/markup') },
      { label: 'Coupon List', to: adminPath('b2c-flight/coupon-list') },
      { label: 'Used Coupon List', to: adminPath('b2c-flight/used-coupon-list') },
      { label: 'Convenience Fee', to: adminPath('b2c-flight/convenience-fee') },
      { label: 'Add Convenience Fee', to: adminPath('b2c-flight/convenience-fee/add') },
      { label: 'Edit Convenience Fee', to: adminPath('b2c-flight/convenience-fee/edit') },
      { label: 'Cancellation Request List', to: adminPath('b2c-flight/cancellation-requests') },
      { label: 'Remark List', to: adminPath('b2c-flight/remark-list') },
      { label: 'Add Remark', to: adminPath('b2c-flight/remark-list/add') },
      { label: 'Edit Remark', to: adminPath('b2c-flight/remark-list/edit') },
      { label: 'Amendments List', to: adminPath('b2c-flight/amendments') },
      { label: 'Allowed Fare Types', to: adminPath('b2c-flight/allowed-fare-types') },
      { label: 'Flight Search History', to: adminPath('b2c-flight/search-history') },
      { label: 'Pending Airline List', to: adminPath('b2c-flight/pending-airlines') },
      { label: 'Add Pending Airline', to: adminPath('b2c-flight/pending-airlines/add') },
      { label: 'Edit Pending Airline', to: adminPath('b2c-flight/pending-airlines/edit') },
      { label: 'Airline Web Check Links', to: adminPath('b2c-flight/airline-webcheck-links') },
      { label: 'Airline Brand List', to: adminPath('b2c-flight/airline-brands') },
      { label: 'Popular Routes', to: adminPath('b2c-flight/popular-routes') },
      { label: 'Popular Destinations', to: adminPath('b2c-flight/popular-destinations') }
    ]
  },
  {
    label: 'B2C Hotel Management',
    to: adminPath('b2c-hotel'),
    icon: icons.hotel,
    submenu: [
      { label: 'Discount List', to: adminPath('b2c-hotel/discounts') },
      { label: 'Coupon List', to: adminPath('b2c-hotel/coupon-list') },
      { label: 'Convenience Fee', to: adminPath('b2c-hotel/convenience-fee') },
      { label: 'GST Settings', to: adminPath('b2c-hotel/gst-settings') }
    ]
  },
  {
    label: 'Blog Management',
    to: adminPath('blog-management'),
    icon: icons.blog,
    submenu: [
      { label: 'Blog List', to: adminPath('blog-management/blog-list') },
      { label: 'Add Blog', to: adminPath('blog-management/add-blog') },
      { label: 'Blog Sub Category List', to: adminPath('blog-management/blog-sub-category-list') },
      { label: 'Add Blog Sub Category', to: adminPath('blog-management/add-blog-sub-category') },
      { label: 'Blog Category List', to: adminPath('blog-management/blog-category-list') },
      { label: 'Add Blog Category', to: adminPath('blog-management/add-blog-category') }
    ]
  },
  {
    label: 'Customer Management',
    to: adminPath('customer-management'),
    icon: icons.customers,
    submenu: [
      { label: 'Customer List', to: adminPath('customer-management/customer-list') },
      { label: 'Add New Customer', to: adminPath('customer-management/add-new-customer') },
      { label: 'Deposit Request List', to: adminPath('customer-management/deposit-request-list') }
    ]
  },
  {
    label: 'Page Management',
    to: adminPath('page-management'),
    icon: icons.page,
    submenu: [
      { label: 'All Page List', to: adminPath('page-management/pages') },
      { label: 'Add New Page', to: adminPath('page-management/pages/new') }
    ]
  },
  {
    label: 'Menu Management',
    to: adminPath('menu-management'),
    icon: icons.menu,
    submenu: [
      { label: 'Menu List', to: adminPath('menu-management/menus') },
      { label: 'Add Menu', to: adminPath('menu-management/menus/new') }
    ]
  },
  {
    label: 'Offer Management',
    to: adminPath('offer-management'),
    icon: icons.offer,
    submenu: [
      { label: 'Offer List', to: adminPath('offer-management/offers') },
      { label: 'Add New Offer', to: adminPath('offer-management/offers/new') }
    ]
  },
  // {
  //   label: 'Payment Management',
  //   to: adminPath('payment-management'),
  //   icon: icons.payment,
  //   submenu: [
  //     { label: 'Payment Setting', to: adminPath('payment-management/payment-setting') },
  //     { label: 'Tax Management', to: adminPath('payment-management/tax-management') }
  //   ]
  // },
  {
    label: 'Query Management',
    to: adminPath('query-management'),
    icon: icons.query,
    submenu: [
      { label: 'Query list', to: adminPath('query-management/query-list') }
    ]
  },
  // {
  //   label: 'Security Management',
  //   to: adminPath('security-management'),
  //   icon: icons.security,
  //   submenu: [
  //     { label: 'Black list IP', to: adminPath('security-management/black-list-ip') },
  //     { label: 'White List IP', to: adminPath('security-management/white-list-ip') }
  //   ]
  // },
  // {
  //   label: 'Site Management',
  //   to: adminPath('site-management'),
  //   icon: icons.site,
  //   submenu: [
  //     { label: 'Site Setting', to: adminPath('site-management/site-setting') },
  //     { label: 'Social Links', to: adminPath('site-management/social-links') },
  //     { label: 'Slider Image', to: adminPath('site-management/slider-image') },
  //     { label: 'Add Home Slider Image', to: adminPath('site-management/add-home-slider-image') },
  //     { label: 'Home Slider 2 Image', to: adminPath('site-management/home-slider-2-image') },
  //     { label: 'Add Home Slider 2 Image', to: adminPath('site-management/add-home-slider-2-image') },
  //     { label: 'Manual Booking Supplier', to: adminPath('site-management/manual-booking-supplier') },
  //     { label: 'Meta Data List', to: adminPath('site-management/meta-data-list') },
  //     { label: 'Seo Link List', to: adminPath('site-management/seo-link-list') }
  //   ]
  // },
  {
    label: 'Testimonial Management',
    to: adminPath('testimonial-management'),
    icon: icons.testimonial,
    submenu: [
      { label: 'Testimonial List', to: adminPath('testimonial-management/testimonial-list') },
      { label: 'Add Testimonial', to: adminPath('testimonial-management/add-testimonial') }
    ]
  },
  // {
  //   label: 'Theme Management',
  //   to: adminPath('theme-management'),
  //   icon: icons.theme,
  //   submenu: [
  //     { label: 'B2C Header Theme', to: adminPath('theme-management/b2c-header-theme') },
  //     { label: 'B2C Home Theme', to: adminPath('theme-management/b2c-home-theme') },
  //     { label: 'B2C Footer Theme', to: adminPath('theme-management/b2c-footer-theme') },
  //     { label: 'Themes List', to: adminPath('theme-management/themes-list') }
  //   ]
  // }
];

function Sidebar({ isCollapsed: externalCollapsed, setIsCollapsed: setExternalCollapsed, searchQuery = '', setSearchQuery }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = setExternalCollapsed !== undefined ? setExternalCollapsed : setInternalCollapsed;

  // Filter nav items based on search query
  const filteredItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.submenu.some(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Inline Styles
  const styles = {
    sidebar: {
      padding: '20px 16px',
      background: 'var(--panel)',
      borderRight: '1px solid var(--border)',
      boxShadow: '-2px 0 8px rgba(31, 31, 31, 0.04)',
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollBehavior: 'smooth',
      width: isCollapsed ? '70px' : '270px',
      minWidth: isCollapsed ? '70px' : '270px',
      maxWidth: isCollapsed ? '70px' : '270px',
      transition: 'width 0.3s ease',
      position: 'relative',
      flexShrink: 0,
    },
    brand: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      marginBottom: '18px',
      justifyContent: isCollapsed ? 'center' : 'flex-start',
    },
    brandMark: {
      display: 'grid',
      placeItems: 'center',
      height: '40px',
      width: '40px',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, rgba(74, 15, 26, 0.15), rgba(47, 47, 47, 0.1))',
      color: 'var(--primary)',
      fontWeight: 800,
      letterSpacing: '1px',
      fontSize: '0.85rem',
      flexShrink: 0,
    },
    brandText: {
      display: isCollapsed ? 'none' : 'flex',
      flexDirection: 'column',
      gap: '2px',
      transition: 'opacity 0.3s ease',
    },
    brandTitle: {
      fontWeight: 700,
      fontSize: '0.95rem',
      color: 'var(--text-primary)',
    },
    brandSubtitle: {
      fontSize: '0.7rem',
      color: 'var(--text-secondary)',
    },
    sidebarSearch: {
      marginBottom: '16px',
      position: 'relative',
      display: isCollapsed ? 'none' : 'block',
      transition: 'opacity 0.3s ease',
    },
    searchInput: {
      width: '100%',
      padding: '9px 12px 9px 36px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      background: 'var(--surface-soft)',
      color: 'var(--text-primary)',
      outline: 'none',
      transition: 'all 0.2s ease',
      fontSize: '0.85rem',
      fontFamily: 'inherit',
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    sidebarNav: {
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      borderRadius: '8px',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      fontSize: '0.88rem',
      fontWeight: 500,
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      minHeight: '40px',
      cursor: 'pointer',
      position: 'relative',
    },
    navIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      flexShrink: 0,
      color: 'currentColor',
    },
    navLabel: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: isCollapsed ? 'none' : 'block',
      transition: 'opacity 0.3s ease',
    },
    navChevron: {
      width: '16px',
      height: '16px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s ease',
    },
    navPlus: {
      color: 'var(--text-muted)',
      fontWeight: 700,
      fontSize: '0.9rem',
      opacity: 0,
      transition: 'opacity 0.2s ease',
      display: isCollapsed ? 'none' : 'block',
    },
    submenu: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      paddingLeft: '12px',
      marginTop: '4px',
      borderLeft: 'none',
      paddingTop: '4px',
    },
    submenuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '6px',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      fontSize: '0.8rem',
      fontWeight: 400,
      cursor: 'pointer',
    },
    noResults: {
      padding: '20px 10px',
      textAlign: 'center',
      color: 'var(--text-secondary)',
      fontSize: '0.85rem',
      display: isCollapsed ? 'none' : 'block',
    },
  };

  return (
    <aside
      className="admin-sidebar"
      style={styles.sidebar}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => {
        setIsCollapsed(true);
        setExpandedMenu(null);
      }}
    >
      {/* Brand Section */}
      <div style={styles.brand}>
        <span style={styles.brandMark}>BR</span>
        <div style={styles.brandText}>
          <div style={styles.brandTitle}>Book My Route</div>
          <div style={styles.brandSubtitle}>Admin Console</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.sidebarSearch}>
        <span style={styles.searchIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search anything..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.background = 'var(--panel)';
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 117, 255, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.background = 'var(--surface-soft)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Navigation */}
      <nav style={styles.sidebarNav}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div key={item.to}>
              {/* Main Nav Item */}
              {item.submenu.length === 0 ? (
                <NavLink
                  to={item.to}
                  end={item.to === ADMIN_BASE}
                  className="nav-link-item"
                  style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                </NavLink>
              ) : (
                <div
                  className={`nav-link-item ${expandedMenu === item.to ? 'active' : ''}`}
                  style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
                  onClick={() => setExpandedMenu(expandedMenu === item.to ? null : item.to)}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                  <span style={{
                    ...styles.navChevron,
                    display: isCollapsed ? 'none' : 'flex',
                    transform: expandedMenu === item.to ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    {icons.chevronDown}
                  </span>
                </div>
              )}

              {/* Submenu */}
              {item.submenu.length > 0 && (
                <div style={{
                  ...styles.submenu,
                  display: expandedMenu === item.to ? 'flex' : 'none',
                }}>
                  {item.submenu.map((subitem) => (
                    <NavLink
                      key={subitem.to}
                      to={subitem.to}
                      title={subitem.label}
                      className="sub-link-item"
                    >
                      {subitem.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={styles.noResults}>
            No items found for "{searchQuery}"
          </div>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
