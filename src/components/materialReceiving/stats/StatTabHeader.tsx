import React from 'react';

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
          <button
            onClick={() => onTabChange('monthly')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'monthly'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 月度汇总
          </button>
          <button
            onClick={() => onTabChange('material')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'material'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📦 物料汇总
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatTabHeader;
console.log('组件创建成功: StatTabHeader');
