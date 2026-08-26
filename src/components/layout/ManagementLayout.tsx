import { useState } from 'react';
import ManagementSidebar from './ManagementSidebar';
import { GlobalTopBar } from './GlobalTopBar';

/**
 * 经营核算系统布局 — 与其他专用布局同模式
 * - Header: top-12, h-12
 * - Sidebar: top-12, w-16/w-52
 */
export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const sidebarWidth = sidebarCollapsed ? 64 : 208;

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagementSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <header
        className="fixed top-0 left-0 right-0 z-30 h-12 bg-[var(--header-bg,#ffffff)] border-b border-gray-200"
      >
        <GlobalTopBar />
      </header>

      <div
        style={{
          marginLeft: sidebarWidth,
          marginTop: 48,
          minHeight: 'calc(100vh - 48px)',
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}