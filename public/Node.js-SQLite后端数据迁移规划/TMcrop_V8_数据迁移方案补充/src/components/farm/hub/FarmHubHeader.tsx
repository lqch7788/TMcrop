/**
 * 农事任务中心 - 顶部统计看板
 * 样式与 TaskDispatchPage 统一
 */

import React from 'react';
import { HubStats } from '../../../hooks/useFarmHub';
import { Send, CheckCircle, Clock, AlertTriangle, ClipboardList, Activity, AlertCircle, CheckCheck, XCircle } from 'lucide-react';

interface FarmHubHeaderProps {
  stats: HubStats;
  onOpenSmartDispatch: () => void;
  onOpenDailyPlan: () => void;
  onOpenMonthlyPlan: () => void;
}

/**
 * 统计卡片组件
 */
function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${valueColor || 'text-gray-900'}`}>{value}</p>
        </div>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}

/**
 * 顶部统计看板组件
 */
export function FarmHubHeader({
  stats,
  onOpenSmartDispatch,
  onOpenDailyPlan,
  onOpenMonthlyPlan,
}: FarmHubHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">农事任务中心</h1>
            <p className="text-gray-500">智能排程与任务调度管理中心</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSmartDispatch}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
          >
            智能派工
          </button>
          <button
            onClick={onOpenDailyPlan}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
          >
            每日规划
          </button>
          <button
            onClick={onOpenMonthlyPlan}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
          >
            月度规划
          </button>
        </div>
      </div>

      {/* 任务统计卡片区域 - 一排9列 */}
      <div className="grid grid-cols-9 gap-3">
        {/* 待办任务 */}
        <StatCard
          icon={ClipboardList}
          label="待办任务"
          value={stats.pendingTasks}
          iconColor="text-blue-500"
        />

        {/* 进行中任务 */}
        <StatCard
          icon={Clock}
          label="进行中"
          value={stats.inProgressTasks}
          iconColor="text-orange-500"
          valueColor="text-orange-600"
        />

        {/* 今日完成 */}
        <StatCard
          icon={CheckCircle}
          label="今日完成"
          value={stats.todayCompleted}
          iconColor="text-green-500"
          valueColor="text-green-600"
        />

        {/* 紧急问题 */}
        <StatCard
          icon={AlertTriangle}
          label="紧急问题"
          value={stats.urgentProblems}
          iconColor="text-red-500"
          valueColor="text-red-600"
        />

        {/* 今日巡查 */}
        <StatCard
          icon={Activity}
          label="今日巡查"
          value={stats.todayInspections}
          iconColor="text-purple-500"
        />

        {/* 累计巡查 */}
        <StatCard
          icon={ClipboardList}
          label="累计巡查"
          value={stats.totalInspections}
          iconColor="text-indigo-500"
        />

        {/* 异常巡查 */}
        <StatCard
          icon={XCircle}
          label="异常巡查"
          value={stats.abnormalInspections}
          iconColor="text-red-400"
          valueColor="text-red-500"
        />

        {/* 待处理问题 */}
        <StatCard
          icon={AlertCircle}
          label="待处理问题"
          value={stats.pendingProblems}
          iconColor="text-amber-500"
          valueColor="text-amber-600"
        />

        {/* 已处理问题 */}
        <StatCard
          icon={CheckCheck}
          label="已处理问题"
          value={stats.processedProblems}
          iconColor="text-teal-500"
          valueColor="text-teal-600"
        />
      </div>
    </div>
  );
}

export default FarmHubHeader;
