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
  dashboard:   <Ico><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ico>,
  bus:         <Ico><rect x="3" y="5" width="18" height="11" rx="2"/><path d="M3 10h18"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></Ico>,
  flight:      <Ico><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></Ico>,
  blog:        <Ico><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></Ico>,
  page:        <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></Ico>,
  menu:        <Ico><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Ico>,
  offer:       <Ico><path d="M20 12V7a2 2 0 0 0-2-2h-5L3 15l6 6 10-10z"/><circle cx="7.5" cy="7.5" r="1.5"/></Ico>,
  customers:   <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  query:       <Ico><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></Ico>,
  testimonial: <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>,
  chevron:     <Ico size={14}><polyline points="6 9 12 15 18 9"/></Ico>,
};

const ADMIN = '/admin';
const p = (path = '') => path ? `${ADMIN}/${path}` : ADMIN;

/* ── Nav structure with section groups ── */
const navGroups = [
  {
    section: null,
    items: [
      { label: 'Dashboard', to: p(), icon: icons.dashboard, end: true, submenu: [] },
    ],
  },
  {
    section: 'BUS MANAGEMENT',
    items: [
      {
        label: 'B2C Bus Management', to: p('b2c-bus'), icon: icons.bus, submenu: [
          { label: 'Booking List',      to: p('b2c-bus/booking-list') },
          { label: 'Discount List',     to: p('b2c-bus/discounts') },
          { label: 'Add Discount',      to: p('b2c-bus/discounts/new') },
          { label: 'Discount Mapping',  to: p('b2c-bus/discount-mapping') },
          { label: 'Markup List',       to: p('b2c-bus/markup-list') },
          { label: 'GST Settings',      to: p('b2c-bus/gst-settings') },
          { label: 'Coupon List',       to: p('b2c-bus/coupon-list') },
          { label: 'Used Coupon List',  to: p('b2c-bus/used-coupon-list') },
          { label: 'Convenience Fee',   to: p('b2c-bus/convenience-fee') },
          { label: 'Cancellation List', to: p('b2c-bus/cancellation-list') },
          { label: 'Search History',    to: p('b2c-bus/search-history') },
          { label: 'Voucher Settings',  to: p('b2c-bus/voucher-settings') },
          { label: 'Popular Routes',    to: p('b2c-bus/popular-routes') },
        ],
      },
      {
        label: 'B2C Flight Management', to: p('b2c-flight'), icon: icons.flight, submenu: [
          { label: 'Booking List',             to: p('b2c-flight/booking-list') },
          { label: 'Discount List',            to: p('b2c-flight/discounts') },
          { label: 'Add Discount',             to: p('b2c-flight/discounts/new') },
          { label: 'Markup List',              to: p('b2c-flight/markup') },
          { label: 'Coupon List',              to: p('b2c-flight/coupon-list') },
          { label: 'Used Coupon List',         to: p('b2c-flight/used-coupon-list') },
          { label: 'Convenience Fee',          to: p('b2c-flight/convenience-fee') },
          { label: 'Add Convenience Fee',      to: p('b2c-flight/convenience-fee/add') },
          { label: 'Cancellation Requests',    to: p('b2c-flight/cancellation-requests') },
          { label: 'Remark List',              to: p('b2c-flight/remark-list') },
          { label: 'Add Remark',               to: p('b2c-flight/remark-list/add') },
          { label: 'Amendments List',          to: p('b2c-flight/amendments') },
          { label: 'Allowed Fare Types',       to: p('b2c-flight/allowed-fare-types') },
          { label: 'Flight Search History',    to: p('b2c-flight/search-history') },
          { label: 'Pending Airline List',     to: p('b2c-flight/pending-airlines') },
          { label: 'Airline Web Check Links',  to: p('b2c-flight/airline-webcheck-links') },
          { label: 'Airline Brand List',       to: p('b2c-flight/airline-brands') },
          { label: 'Popular Routes',           to: p('b2c-flight/popular-routes') },
          { label: 'Popular Destinations',     to: p('b2c-flight/popular-destinations') },
        ],
      },
    ],
  },
  {
    section: 'CONTENT MANAGEMENT',
    items: [
      {
        label: 'Blog Management', to: p('blog-management'), icon: icons.blog, submenu: [
          { label: 'Blog List',              to: p('blog-management/blog-list') },
          { label: 'Add Blog',               to: p('blog-management/add-blog') },
          { label: 'Blog Category List',     to: p('blog-management/blog-category-list') },
          { label: 'Add Blog Category',      to: p('blog-management/add-blog-category') },
          { label: 'Blog Sub Category List', to: p('blog-management/blog-sub-category-list') },
          { label: 'Add Blog Sub Category',  to: p('blog-management/add-blog-sub-category') },
        ],
      },
      {
        label: 'Page Management', to: p('page-management'), icon: icons.page, submenu: [
          { label: 'All Page List', to: p('page-management/pages') },
          { label: 'Add New Page',  to: p('page-management/pages/new') },
        ],
      },
      {
        label: 'Menu Management', to: p('menu-management'), icon: icons.menu, submenu: [
          { label: 'Menu List', to: p('menu-management/menus') },
          { label: 'Add Menu',  to: p('menu-management/menus/new') },
        ],
      },
      {
        label: 'Offer Management', to: p('offer-management'), icon: icons.offer, submenu: [
          { label: 'Offer List',    to: p('offer-management/offers') },
          { label: 'Add New Offer', to: p('offer-management/offers/new') },
        ],
      },
    ],
  },
  {
    section: 'USER MANAGEMENT',
    items: [
      {
        label: 'Customer Management', to: p('customer-management'), icon: icons.customers, submenu: [
          { label: 'Customer List',       to: p('customer-management/customer-list') },
          { label: 'Add New Customer',    to: p('customer-management/add-new-customer') },
          { label: 'Deposit Request List',to: p('customer-management/deposit-request-list') },
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
        label: 'Testimonial Management', to: p('testimonial-management'), icon: icons.testimonial, submenu: [
          { label: 'Testimonial List',  to: p('testimonial-management/testimonial-list') },
          { label: 'Add Testimonial',   to: p('testimonial-management/add-testimonial') },
        ],
      },
    ],
  },
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
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <span className="ds-brand-name">Admin Panel</span>
      </div>

      {/* Search */}
      <div className="ds-search-wrap">
        <svg className="ds-search-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="ds-search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
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
