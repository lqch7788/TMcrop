/**
 * 统一Tab切换组件 - 用于聚合页面内的功能切换
 * 样式参考：生产领料页面 MaterialReceivingHeader
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';

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

      {/* Tab切换区域 */}
      <div className="mt-6">
        <div className="flex gap-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              size="default"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 pb-3 text-base font-semibold transition-all relative rounded-none ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TabHeader;
