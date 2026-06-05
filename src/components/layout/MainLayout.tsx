/**
 * 主布局（带侧边栏 + 顶部 Header）
 * 2026-06-05 抽自 App.tsx：之前 MainLayout 函数定义在 App.tsx 内部未导出，导致多页面 import 失败
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Header 固定在顶部 */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onMenuClick={() => setSidebarOpen(true)} />
      </div>

      <div className={sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}>
        <main className="pt-12 p-4 lg:p-6 mt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
