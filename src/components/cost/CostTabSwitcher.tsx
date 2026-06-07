import React from 'react';
import { TrendingUp, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui';

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
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
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
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CostTabSwitcher;
// logger.info('组件创建成功: CostTabSwitcher');
