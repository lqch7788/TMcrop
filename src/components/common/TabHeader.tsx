/**
 * 统一Tab切换组件 - 用于聚合页面内的功能切换
 *
 * 2026-06-19: 重构为 V1.1 Tabs 风格（Radix 胶囊式）
 * - 浅灰底圆角容器 (bg-gray-100/80 rounded-xl) + 白卡选中 (bg-white shadow-sm)
 * - 替代之前的"下划线"风格
 * - 保持 title/subtitle/icon 头部的现有逻辑不变
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

export interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface TabHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabHeader({
  title,
  subtitle,
  icon,
  tabs,
  activeTab,
  onTabChange,
}: TabHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Tab 切换区域 — 2026-06-19: 改用 V1.1 Tabs 胶囊式风格（与 src/components/ui/tabs.tsx 一致） */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

export default TabHeader;
