import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaterialReceivingHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { key: 'application', label: '申请领料' },
  { key: 'execute', label: '领料出库' },
  { key: 'statistics', label: '领料统计' },
  { key: 'cost', label: '成本核算' },
];

export const MaterialReceivingHeader: React.FC<MaterialReceivingHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
            <p className="text-gray-500">生产领料记录管理</p>
          </div>
        </div>
      </div>

      {/* Tab切换区域 */}
      <div className="mt-6">
        <div className="flex gap-8 border-b border-gray-200">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 pb-3 text-base font-semibold transition-all relative rounded-none ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
};

export default MaterialReceivingHeader;
