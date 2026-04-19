/**
 * 任务派发统一页面
 * 整合农事任务派发、临时任务、智能派工三个模块
 * 通过Tab切换显示不同模式
 */

import React, { useState } from 'react';
import { Truck, Clock, Sparkles } from 'lucide-react';
import { FarmDispatchTab } from './components/dispatch/FarmDispatchTab';
import { TempTaskTab } from './components/dispatch/TempTaskTab';
import { SmartDispatchTab } from './components/dispatch/SmartDispatchTab';
import { DISPATCH_MODE_CONFIG } from './types/dispatch';
import type { DispatchMode } from './types/dispatch';
import { TasksProvider } from '../../hooks/TasksContext';

/**
 * Tab配置
 */
const TABS: { key: DispatchMode; label: string; icon: React.ReactNode }[] = [
  {
    key: 'farm',
    label: '农事任务',
    icon: <Truck className="w-4 h-4" />,
  },
  {
    key: 'tempTask',
    label: '临时任务',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    key: 'smart',
    label: '智能派工',
    icon: <Sparkles className="w-4 h-4" />,
  },
];

/**
 * 任务派发统一页面
 */
export const DispatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DispatchMode>('farm');

  // 渲染当前Tab内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'farm':
        return <FarmDispatchTab />;
      case 'tempTask':
        return <TempTaskTab />;
      case 'smart':
        return <SmartDispatchTab />;
      default:
        return <FarmDispatchTab />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">农事任务派发</h1>
              <p className="text-sm text-gray-500">统一管理农事任务、临时任务和智能派工</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tab列表 */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.key && (
                <span className="ml-2 text-xs text-blue-500">
                  {DISPATCH_MODE_CONFIG[tab.key].description}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab内容 */}
        <div className="p-6">
          <TasksProvider>
            {renderTabContent()}
          </TasksProvider>
        </div>
      </div>
    </div>
  );
};

export default DispatchPage;
