/**
 * 农事操作记录页面头部组件
 */

import React from 'react';
import { Leaf } from 'lucide-react';

interface AgricultureRecordStats {
  total: number;
  task: number;
  tempTask: number;
  manual: number;
}

interface AgricultureRecordPageHeaderProps {
  stats: AgricultureRecordStats;
}

export function AgricultureRecordPageHeader({ stats }: AgricultureRecordPageHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">农事操作记录</h1>
          <p className="text-sm text-gray-500">统一展示任务派发、临时任务、手动录入的操作记录</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">全部记录</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">任务派发</p>
          <p className="text-2xl font-bold">{stats.task}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">临时任务</p>
          <p className="text-2xl font-bold">{stats.tempTask}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">手动录入</p>
          <p className="text-2xl font-bold">{stats.manual}</p>
        </div>
      </div>
    </div>
  );
}
