/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './SIDEBAR ADMIN/sidebar_admin.js';
import AdminTopbar from './TOPBAR ADMIN/Topbar';
import './adminlayout.css';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // hidden by default
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const location = useLocation();
  const theme = 'light';

  useEffect(() => {
    setPageLoading(true);
    const timer = setTimeout(() => setPageLoading(false), 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const classifyButtons = () => {
      const buttons = document.querySelectorAll('.admin-shell button, .admin-shell a.btn, .admin-shell input[type="button"], .admin-shell input[type="submit"]');
      buttons.forEach(btn => {
        const text = (btn.textContent || btn.value || '').trim().toLowerCase();
        
        // Remove existing classification classes
        btn.classList.remove(
          'btn-add', 'btn-search', 'btn-filter', 'btn-export', 'btn-reset',
          'btn-clear', 'btn-cancel', 'btn-total', 'btn-pending-booking',
          'btn-completed-booking', 'btn-pending', 'btn-replied', 'btn-resolved',
          'btn-profit', 'btn-view', 'btn-total-records', 'btn-clear-filter'
        );

        if (text.includes('clear filter') || text.includes('clear filters')) {
          btn.classList.add('btn-clear-filter');
        } else if (text.includes('pending booking')) {
          btn.classList.add('btn-pending-booking');
        } else if (text.includes('completed booking')) {
          btn.classList.add('btn-completed-booking');
        } else if (text.includes('profit')) {
          btn.classList.add('btn-profit');
        } else if (text.includes('view') || text.includes('details') || text.includes('show')) {
          btn.classList.add('btn-view');
        } else if (text.includes('add') || text.includes('generate') || text.includes('create') || text.includes('new')) {
          btn.classList.add('btn-add');
        } else if (text.includes('search') || text.includes('find')) {
          btn.classList.add('btn-search');
        } else if (text.includes('filter') || text.includes('hide filter')) {
          btn.classList.add('btn-filter');
        } else if (text.includes('export') || text.includes('download')) {
          btn.classList.add('btn-export');
        } else if (text.includes('reset')) {
          btn.classList.add('btn-reset');
        } else if (text.includes('clear')) {
          btn.classList.add('btn-clear');
        } else if (text.includes('cancel') || text.includes('close')) {
          btn.classList.add('btn-cancel');
        } else if (text.includes('total records') || text.includes('record count')) {
          btn.classList.add('btn-total-records');
        } else if (text.includes('total')) {
          btn.classList.add('btn-total');
        } else if (text.includes('pending')) {
          btn.classList.add('btn-pending');
        } else if (text.includes('replied')) {
          btn.classList.add('btn-replied');
        } else if (text.includes('resolved') || text.includes('success') || text.includes('completed') || text.includes('paid')) {
          btn.classList.add('btn-resolved');
        }
      });

      // Classify action icons and status cells
      const actionableElements = document.querySelectorAll('.admin-shell button, .admin-shell a, .admin-shell span, .admin-shell .action-btn');
      actionableElements.forEach(el => {
        const title = (el.getAttribute('title') || '').toLowerCase();
        const className = el.className || '';
        let text = (el.textContent || '').trim().toLowerCase();
        
        // Normalize text by removing all leading checkmark and cross symbols if present
        text = text.replace(/^[✓✗✔✘\s]+/g, '').trim();

        el.classList.remove('action-icon-view', 'action-icon-edit', 'action-icon-delete', 'status-active-badge', 'status-inactive-badge');

        if (title.includes('view') || title.includes('detail') || className.includes('view-btn')) {
          el.classList.add('action-icon-view');
        } else if (title.includes('edit') || title.includes('update') || className.includes('edit-btn')) {
          el.classList.add('action-icon-edit');
        } else if (title.includes('delete') || title.includes('remove') || className.includes('delete-btn')) {
          el.classList.add('action-icon-delete');
        }

        const isStatusText = ['active', 'inactive', 'deactive', 'completed', 'pending', 'cancelled', 'failed', 'replied', 'resolved', 'paid'].includes(text);
        if (className.includes('status') || className.includes('badge') || isStatusText) {
          // Skip if this element is nested inside another status/badge element to avoid duplicate matching
          if (el.parentElement && el.parentElement.closest('.status-active-badge, .status-inactive-badge, .status, .badge, [class*="status-badge"], [class*="status-pill"], [class*="status-toggle"], [class*="badge-"]')) {
            return;
          }

          // Clean up any existing status symbol spans to prevent duplicate symbols accumulation
          el.querySelectorAll('.symbol-badge-indicator').forEach(child => child.remove());

          const hasSvgIcon = el.querySelector('svg') !== null;

          if (text === 'active' || text === 'completed' || text === 'success' || text === 'replied' || text === 'resolved' || text === 'paid') {
            el.classList.add('status-active-badge');
            if (!hasSvgIcon) {
              const symbolSpan = document.createElement('span');
              symbolSpan.className = 'symbol-badge-indicator';
              symbolSpan.style.marginRight = '4px';
              symbolSpan.style.fontWeight = 'bold';
              symbolSpan.textContent = '✓';
              el.insertBefore(symbolSpan, el.firstChild);
            }
          } else if (text === 'inactive' || text === 'deactive' || text === 'pending' || text === 'cancelled' || text === 'failed') {
            el.classList.add('status-inactive-badge');
            if (!hasSvgIcon) {
              const symbolSpan = document.createElement('span');
              symbolSpan.className = 'symbol-badge-indicator';
              symbolSpan.style.marginRight = '4px';
              symbolSpan.style.fontWeight = 'bold';
              symbolSpan.textContent = '✗';
              el.insertBefore(symbolSpan, el.firstChild);
            }
          }
        }
      });
    };

    let observer;
    const runClassificationSafe = () => {
      if (observer) observer.disconnect();
      classifyButtons();
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
    };

    runClassificationSafe();
    observer = new MutationObserver(runClassificationSafe);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (observer) observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className={`admin-shell ${theme}-theme`} style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* Animated Skyline Overlay over PNG Background */}
      <div className="admin-skyline-bg">
        <svg viewBox="0 0 1200 500" fill="none" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          {/* Gradients */}
          <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(30,117,255,0.01)" />
              <stop offset="50%" stopColor="rgba(30,117,255,0.3)" />
              <stop offset="100%" stopColor="rgba(30,117,255,0.01)" />
            </linearGradient>
          </defs>

          {/* Dotted Flight Path */}
          <path d="M -50,180 C 150,130 350,290 550,230 C 750,170 950,110 1250,150" 
                stroke="url(#pathGrad)" strokeWidth="2" className="admin-flight-path" />
          <path d="M 1200,280 C 1000,220 800,320 600,290 C 400,260 200,240 -50,300" 
                stroke="url(#pathGrad)" strokeWidth="1.5" className="admin-flight-path-2" />

          {/* Drifting Clouds */}
          <g className="admin-cloud-1" opacity="0.6">
            <path d="M 150,80 Q 165,65 185,75 Q 200,60 215,75 Q 230,75 230,85 Q 230,95 150,95 Z" fill="#ffffff" />
          </g>
          <g className="admin-cloud-2" opacity="0.5">
            <path d="M 850,60 Q 865,45 885,55 Q 900,40 915,55 Q 930,55 930,65 Q 930,75 850,75 Z" fill="#ffffff" />
          </g>
          <g className="admin-cloud-3" opacity="0.4">
            <path d="M 520,110 Q 532,98 548,106 Q 560,94 572,106 Q 584,106 584,114 Q 584,122 520,122 Z" fill="#ffffff" />
          </g>

          {/* Hot Air Balloon 1 */}
          <g className="admin-balloon-1" transform="translate(160, 240)">
            <path d="M 0,0 C -12,-20 -15,-35 0,-45 C 15,-35 12,-20 0,0 Z" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M -7,-25 C -2,-25 2,-25 7,-25" stroke="#3b82f6" strokeWidth="1" />
            <rect x="-2" y="4" width="4" height="4" fill="none" stroke="#3b82f6" strokeWidth="1" />
            <line x1="-4" y1="0" x2="-2" y2="4" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="4" y1="0" x2="2" y2="4" stroke="#3b82f6" strokeWidth="0.8" />
          </g>

          {/* Hot Air Balloon 2 */}
          <g className="admin-balloon-2" transform="translate(860, 260)">
            <path d="M 0,0 C -10,-18 -12,-30 0,-38 C 12,-30 10,-18 0,0 Z" fill="none" stroke="#10b981" strokeWidth="1.2" />
            <rect x="-1.5" y="3.5" width="3" height="3" fill="none" stroke="#10b981" strokeWidth="0.8" />
            <line x1="-3" y1="0" x2="-1.5" y2="3.5" stroke="#10b981" strokeWidth="0.7" />
            <line x1="3" y1="0" x2="1.5" y2="3.5" stroke="#10b981" strokeWidth="0.7" />
          </g>

          {/* Flying Plane along the path */}
          <g className="admin-plane-fly">
            {/* Simple plane outline */}
            <path d="M 0,0 L 8,-3 L 18,-3 L 10,0 L 13,6 L 8,2 L 3,6 L 5,0 L -2,-3 Z" fill="#3b82f6" transform="translate(50, 160) scale(1.2)" />
          </g>
        </svg>
      </div>

      {/* Topbar — full width, PickNBook toggles sidebar */}
      <AdminTopbar
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={theme}
      />

      {/* Main content — always full width */}
      <main className="main-area" style={{ height: 'calc(100vh - 62px)', overflowY: 'auto' }}>
        {pageLoading && (
          <div className="admin-page-top-loader">
            <div className="admin-page-top-loader-bar" />
          </div>
        )}
        <Outlet context={{ searchQuery, setSearchQuery, theme }} />
      </main>

      {/* Sidebar overlay — slides in from left on top of content */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
}

export default AdminLayout;
