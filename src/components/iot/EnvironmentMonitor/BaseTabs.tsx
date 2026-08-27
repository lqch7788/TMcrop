/**
 * 顶部基地 Tab 切换组件
 */
import React from 'react';
import { BaseInfo } from './mockData';

interface BaseTabsProps {
  bases: BaseInfo[];
  activeBase: string;
  onChange: (baseId: string) => void;
}

const BaseTabs: React.FC<BaseTabsProps> = ({ bases, activeBase, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3 flex items-center gap-4">
      <h2 className="text-lg font-bold text-gray-800">实时总览</h2>
      <div className="flex items-center gap-2 flex-wrap">
        {bases.map(base => (
          <button
            key={base.id}
            onClick={() => onChange(base.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeBase === base.id
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {base.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BaseTabs;
