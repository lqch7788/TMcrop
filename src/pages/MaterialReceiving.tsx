import { useState } from 'react';
import { ClipboardList, FileText, ClipboardCheck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui';

// 领料统计Tab组件
import StatisticsTab from './material/tabs/StatisticsTab';
// 领料申请Tab组件
import ApplicationTab from './material/tabs/ApplicationTab';
// 领料出库Tab组件
import ExecuteTab from './material/tabs/ExecuteTab';

export default function MaterialReceiving() {
  const [activeTab, setActiveTab] = useState('application');

  // 2026-09-27 用户反馈：卡片间距偏大 + tab 卡片过高 → space-y-6→space-y-3、pt-6→pt-1、按钮 pb-3→pb-2
  return (
    <div className="space-y-3">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-4 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
              <p className="text-gray-500">生产领料记录管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换区域 - 顶部标签页样式（紧凑版） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-1 pb-0">
        <div className="flex gap-8 border-b border-gray-200">
          {[
            { key: 'application', label: '申请领料', icon: FileText },
            { key: 'execute', label: '领料出库', icon: ClipboardCheck },
            { key: 'statistics', label: '领料统计', icon: BarChart3 },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => {
                setActiveTab(tab.key);
                // 2026-09-27 审计修复（B2）：切到统计 tab 时发刷新事件——
                // 申请/出库操作后统计数据不再停留在挂载时的旧值
                if (tab.key === 'statistics') {
                  window.dispatchEvent(new CustomEvent('material-statistics-refresh'));
                }
              }}
              className={`pb-2 text-base font-semibold relative ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Button>
          ))}
        </div>
      </div>

    {/* Tab内容区域 */}
    <div>
      {/* 领料申请 Tab内容 */}
      <div className={activeTab === 'application' ? '' : 'hidden'}>
        <ApplicationTab />
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
        <ExecuteTab />
      </div>

      {/* 领料统计 Tab内容 */}
      <div className={activeTab === 'statistics' ? '' : 'hidden'}>
        <StatisticsTab />
      </div>
      </div>
    </div>
  );
}
