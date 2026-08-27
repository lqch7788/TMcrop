import { useState } from 'react';
import IoTSidebar from './IoTSidebar';
import { GlobalTopBar } from './GlobalTopBar';

/**
 * 智能环境监测系统布局
 * - Header: top-12, h-12 — 与 V1.1 主 Header 对齐
 * - Sidebar: top-12, w-16/w-52 — 与 V1.1 主 Sidebar 对齐
 * - 内容区: marginLeft 64/208 避开固定 Sidebar
 */
export default function IoTLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // 与 V1.1 主 Sidebar 宽度一致：64px 折叠 / 208px 展开
  const sidebarWidth = sidebarCollapsed ? 64 : 208;

  return (
    <div className="min-h-screen bg-gray-50">
      <IoTSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* 顶部 Header — 与 V1.1 主 Header 同位置 (top-0, h-12)，所以 sidebar 从 top-12 开始 */}
      <header
        className="fixed top-0 left-0 right-0 z-30 h-12 bg-[var(--header-bg,#ffffff)] border-b border-gray-200"
      >
        <GlobalTopBar />
      </header>

      {/* 右侧内容区：用 inline marginLeft 避开固定 Sidebar */}
      <div
        style={{
          marginLeft: sidebarWidth,
          marginTop: 24, // mt-6 — 与 MainLayout main 的 mt-6 完全一致
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
