import React from 'react';
import { TrendingUp, GitCompare } from 'lucide-react';

type TabKey = 'overview' | 'comparison';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

interface CostTabSwitcherProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabs: TabItem[] = [
  { key: 'overview', label: '成本概览', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'comparison', label: '分类对比', icon: <GitCompare className="w-4 h-4" /> },
];

export const CostTabSwitcher: React.FC<CostTabSwitcherProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors relative ${
              activeTab === tab.key
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CostTabSwitcher;
console.log('组件创建成功: CostTabSwitcher');
