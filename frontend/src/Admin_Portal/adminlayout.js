import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './SIDEBAR ADMIN/sidebar_admin';
import AdminTopbar from './TOPBAR ADMIN/Topbar';
import './adminlayout.css';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // hidden by default
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {};

  return (
    <div className={`admin-shell ${theme}-theme`} style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* Topbar — full width, PickNBook toggles sidebar */}
      <AdminTopbar
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main content — always full width */}
      <main className="main-area" style={{ height: 'calc(100vh - 62px)', overflowY: 'auto' }}>
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
