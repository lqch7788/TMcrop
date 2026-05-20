import React from 'react';
import { Button } from '@/components/ui/button';

interface StatTabHeaderProps {
  activeTab: 'monthly' | 'material';
  onTabChange: (tab: 'monthly' | 'material') => void;
}

export const StatTabHeader: React.FC<StatTabHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="border-b border-gray-100">
        <div className="flex items-center gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('monthly')}
            className={`${activeTab === 'monthly'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 月度汇总
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('material')}
            className={`${activeTab === 'material'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📦 物料汇总
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatTabHeader;
console.log('组件创建成功: StatTabHeader');
