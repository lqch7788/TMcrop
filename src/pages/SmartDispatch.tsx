/**
 * 智能派工管理页面
 * 整合农事任务、临时任务、巡查问题的统一派发入口
 * 基于AI多因子评分算法生成派工建议
 *
 * 架构：Zustand Store（数据层）→ Hooks（业务逻辑）→ 页面组件（UI展示）
 * UI：Tailwind CSS + lucide-react（不使用 antd）
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, MapPin, Clock, AlertTriangle, CheckCircle2, Zap, Bot, Loader2,
  Send, CalendarClock, Split, X, ChevronRight, ChevronDown,
  RefreshCw, Lightbulb
} from 'lucide-react';

// Hooks
import {
  useComprehensiveDispatch,
  type UnifiedDispatchTask,
  type WorkerRecommendation,
  type DispatchTaskSource
} from '../hooks/useComprehensiveDispatch';
import { useEnvironmentData } from '../hooks/useEnvironmentData';
import { useCropGrowthEngine } from '../hooks/useCropGrowthEngine';
import { useMaterialEquipment } from '../hooks/useMaterialEquipment';
import { useDailyWorkOrderAnalysis, type DailyWorkOrderReport } from '../hooks/useDailyWorkOrderAnalysis';
import { usePendingConfirmTasks, type PendingConfirmTask, type PendingConfirmStatus } from '../hooks/usePendingConfirmTasks';
import { useDispatchActions } from '../hooks/useDispatchActions';
// ★ 排班联动：派发后同步 schedule 行（Batch 4+5 接入）
import { useDispatchScheduleBridge } from '../hooks/useDispatchScheduleBridge';
// ★ 班组分配贯通：selectedTeamIds 透传到后端 recommend 端点缩窄候选池
import { useDispatchStore } from '../stores/useDispatchStore';
// ★ 2026-08-24 PR2：AIPanel 上下文注入需要 greenhouse name → ID 反查
import { useGreenhouseStore } from '../stores/useGreenhouseStore';
// ★ 排班冲突提示（2026-07-31）
import { showAlert } from '@/lib/dialogService';
// ★ 2026-08-25 fix：AI-08 路径按钮需要 enhancedApiClient（顶部静态 import，删除底部 require）
import { enhancedApiClient } from '../lib/apiClient';

// 子组件
import { DispatchTaskPool } from '../components/dispatch/DispatchTaskPool';
// 2026-08-22：AI-06 工时预测 UI
import { WorkhourPredictor } from '../components/farm/ai/WorkhourPredictor';
// 2026-08-22：AI 统一助手面板（10 模块一键调用）
import { AIPanel } from '../components/farm/ai/AIPanel';
import { EnvironmentPanel } from '../components/dispatch/EnvironmentPanel';
import { PredictedTasksPanel } from '../components/dispatch/PredictedTasksPanel';
import { DispatchMetricsDashboard } from '../components/dispatch/DispatchMetricsDashboard';
import { DispatchConfigPanel } from '../components/dispatch/DispatchConfigPanel';
import { MaterialEquipmentPanel } from '../components/dispatch/MaterialEquipmentPanel';
// ★ Task 13：班组 chip 多选组件（用于按班组筛选候选池）
import { TeamChipMultiSelect } from '../components/dispatch/TeamChipMultiSelect';

// ============================================
// 常量定义
// ============================================

/** 派工决策因素权重说明 */
const DISPATCH_WEIGHTS_INFO = [
  { label: '技能匹配度', value: '30%', color: 'text-emerald-600' },
  { label: '地理位置', value: '20%', color: 'text-blue-600' },
  { label: '当前负荷', value: '20%', color: 'text-amber-600' },
  { label: '历史表现', value: '15%', color: 'text-purple-600' },
  { label: '紧急程度', value: '10%', color: 'text-red-600' },
  { label: '批次熟悉', value: '3%', color: 'text-pink-600' },
  { label: '周期适配', value: '2%', color: 'text-cyan-600' },
];

/** 优先级颜色映射 */
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

/** 状态标签颜色映射 */
const STATUS_COLORS: Record<PendingConfirmStatus, { bg: string; text: string; label: string }> = {
  pending_ai: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待AI推荐' },
  recommended: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'AI已推荐' },
  predicted: { bg: 'bg-purple-100', text: 'text-purple-700', label: '预测任务' },
  optimization: { bg: 'bg-amber-100', text: 'text-amber-700', label: '优化建议' },
};

// ============================================
// 子组件
// ============================================

/** 统计卡片 */
function StatsCards({
  pendingAI, recommended, predicted, optimization, total
}: {
  pendingAI: number; recommended: number; predicted: number; optimization: number; total: number;
}) {
  const stats = [
    { label: '待AI推荐', value: pendingAI, bg: 'bg-gray-500', icon: '⏳' },
    { label: 'AI已推荐', value: recommended, bg: 'bg-emerald-500', icon: '✅' },
    { label: '预测任务', value: predicted, bg: 'bg-purple-500', icon: '🔮' },
    { label: '优化建议', value: optimization, bg: 'bg-amber-500', icon: '💡' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center text-white text-sm`}>
              {stat.icon}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 任务卡片 */
function TaskCard({
  task, isSelected, onSelect, onAccept, onReplace, onDelay, onAcceptOptimization
}: {
  task: PendingConfirmTask;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReplace: () => void;
  onDelay: () => void;
  onAcceptOptimization?: () => void;
}) {
  const status = STATUS_COLORS[task.dispatchStatus] || STATUS_COLORS.pending_ai;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-400'
      }`}
      onClick={onSelect}
    >
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {isSelected ? '✓' : ''}
          </span>
          <span className="text-xs text-gray-500">{task.sourceLabel}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-2 line-clamp-1">{task.title}</h4>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
          <span>{task.typeName}</span>
          <span>|</span>
          <span>{task.workZone || task.greenhouse || '-'}</span>
          <span>|</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
            {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'}
          </span>
        </div>

        {/* AI推荐信息 */}
        {task.aiRecommendedWorkers && task.aiRecommendedWorkers.length > 0 && (
          <div className="mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-emerald-700 font-medium">AI推荐</span>
              <span className="text-xs text-emerald-600">置信度: {task.aiConfidenceScore || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {task.aiRecommendedWorkers[0].worker.name}
              </span>
              {/* 2026-08-22：AI-06 工时预测（紧凑标签） */}
              <WorkhourPredictor
                taskType={task.type}
                priority={task.priority}
                greenhouseId={greenhouses.find(g => g.name === task.greenhouse)?.id}
                assigneeId={task.aiRecommendedWorkers[0].worker.id}
                taskId={task.id}
                compact
              />
            </div>
          </div>
        )}

        {/* 优化建议 */}
        {task.aiOptimizationSuggestion && (
          <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">优化建议</span>
            </div>
            <div className="text-xs text-amber-600">
              建议更换为 {task.aiOptimizationSuggestion.suggestedWorkerName}
              <span className="ml-1 text-amber-500">
                (+{task.aiOptimizationSuggestion.scoreDiff}分)
              </span>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {task.dispatchStatus === 'optimization' && onAcceptOptimization ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAcceptOptimization(); }}
              className="flex-1 py-2 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> 接受优化
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              disabled={!task.aiRecommendedWorkers?.length}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                task.aiRecommendedWorkers?.length
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> 接受
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onReplace(); }}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> 更换
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelay(); }}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1"
          >
            <CalendarClock className="w-3 h-3" /> 延后
          </button>
        </div>
      </div>
    </div>
  );
}

/** 任务组 */
function TaskGroup({
  title, icon, tasks, selectedTaskId, onSelectTask, onAccept, onReplace, onDelay, onAcceptOptimization
}: {
  title: string; icon: string; tasks: PendingConfirmTask[]; selectedTaskId?: string;
  onSelectTask: (task: PendingConfirmTask) => void;
  onAccept: (task: PendingConfirmTask) => void;
  onReplace: (task: PendingConfirmTask) => void;
  onDelay: (task: PendingConfirmTask) => void;
  onAcceptOptimization: (task: PendingConfirmTask) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isRecommended = title === 'AI已推荐';

  if (tasks.length === 0) return null;

  if (isRecommended) {
    return (
      <div className="space-y-2">
        {/* 表格标题 — 纯文字，黑色粗体 */}
        <h3 className="text-sm font-bold text-gray-900">
          {title} <span className="ml-1 text-xs font-normal text-gray-400">({tasks.length})</span>
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">选择</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">来源</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">任务编号</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">任务标题</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">类型</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">位置</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">优先级</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">AI推荐人</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">置信度</th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {tasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{task.sourceLabel}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">{task.taskCode || '-'}</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap max-w-xs truncate">{task.title}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{task.typeName}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{task.workZone || task.greenhouse || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                        {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-emerald-700 whitespace-nowrap">
                      {task.aiRecommendedWorkers?.[0]?.worker.name || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-emerald-600 whitespace-nowrap">
                      {task.aiConfidenceScore ? `${task.aiConfidenceScore}%` : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onAccept(task); }}
                          disabled={!task.aiRecommendedWorkers?.length}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            task.aiRecommendedWorkers?.length
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          接受
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onReplace(task); }}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        >
                          更换
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelay(task); }}
                          className="px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        >
                          延后
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-gray-900">{title}</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">{tasks.length}</span>
        </div>
        <ChevronDown className={`w-4 h-5 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
      </button>
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task)}
              onAccept={() => onAccept(task)}
              onReplace={() => onReplace(task)}
              onDelay={() => onDelay(task)}
              onAcceptOptimization={() => onAcceptOptimization(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 批量操作栏 */
function BatchActionsBar({ selectedCount, onConfirmAll, onCancel }: {
  selectedCount: number; onConfirmAll: () => void; onCancel: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 px-6 py-3 flex items-center gap-4 z-50">
      <span className="text-sm text-gray-700">
        已选择 <span className="font-bold text-blue-600">{selectedCount}</span> 个任务
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirmAll}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
        >
          <CheckCircle2 className="w-4 h-4" /> 批量确认派发
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          取消选择
        </button>
      </div>
    </div>
  );
}

// ============================================
// 主页面组件
// ============================================

export default function SmartDispatchPage() {
  // ── Hooks ──
  const {
    taskPool, stats, workers, getRecommendations,
    filterBySource, todayWeather, getCurrentWeatherRecommendation,
    unacknowledgedAlerts, criticalAlerts,
  } = useComprehensiveDispatch();

  const { weatherForecasts, sensors, alerts } = useEnvironmentData();
  const { predictedTasks, overdueTasks, pestAlerts } = useCropGrowthEngine();
  const { materials, equipments, equipmentAlerts, overview: materialEquipmentOverview } = useMaterialEquipment();
  const { generateDailyReport } = useDailyWorkOrderAnalysis();
  const { pendingTasks, stats: confirmStats, recommendedTasks, pendingAITasks, optimizationTasks } = usePendingConfirmTasks(getRecommendations);
  const { confirmDispatch, replaceWorker, delayTask, acceptOptimization, rejectOptimization } = useDispatchActions();
  // ★ 排班联动 hook：派发成功后 fire-and-forget 同步 schedule 行
  const { syncAfterDispatch, confirmDispatchWithSoftWarn } = useDispatchScheduleBridge();
  // ★ Task 13：班组分配的服务器侧候选池筛选（透传 teamIds 到 /api/dispatch/recommend）
  const recommendWorkers = useDispatchStore((s) => s.recommendWorkers);
  // ★ 2026-08-24 PR2：greenhouse 名字 → ID 反查（selectedTask.greenhouse 是名字，AIPanel 需要 ID）
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);

  // ── 本地状态 ──
  const [selectedTask, setSelectedTask] = useState<PendingConfirmTask | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  // ★ Task 13：按班组筛选候选池（透传到 useDispatchStore.recommendWorkers teamIds）
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  // ★ Task 13：服务器侧班组筛选的 worker ID 白名单（null 表示不过滤）
  const [serverFilteredWorkerIds, setServerFilteredWorkerIds] = useState<string[] | null>(null);
  const [sourceFilter, setSourceFilter] = useState<DispatchTaskSource | 'all'>('all');
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dispatchAction, setDispatchAction] = useState<'dispatch' | 'delay' | 'split' | 'dismiss' | null>(null);
  // ★ 2026-08-24 PR8：AI-08 路径优化结果（中间列"📍 路径"按钮触发）
  const [routeResult, setRouteResult] = useState<{
    workerName: string;
    totalKm: number;
    originalKm: number;
    savingsPercent: number;
    steps: { name?: string; taskId: string; distanceFromPrevKm: number; cumulativeDistanceKm: number }[];
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<WorkerRecommendation | null>(null);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayDays, setDelayDays] = useState(1);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedWorkersForSplit, setSelectedWorkersForSplit] = useState<string[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // 派工配置弹窗拖拽/缩放/最大化
  const [configIsMaximized, setConfigIsMaximized] = useState(false);
  const configMinSize = { width: 640, height: 400 };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });

  // 配置弹窗拖动
  const handleConfigDragStart = (e: React.MouseEvent) => {
    if (configIsMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('config-panel-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY, left: rect.left, top: rect.top });
    }
  };

  // 配置弹窗缩放
  const handleConfigResizeStart = (e: React.MouseEvent, dir: string) => {
    if (configIsMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
    const dialog = document.getElementById('config-panel-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setResizeStart({ x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, left: rect.left, top: rect.top });
    }
  };

  // 拖动+缩放 mouseMove/mouseUp (useEffect)
  React.useEffect(() => {
    if (!isDragging && !isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const dialog = document.getElementById('config-panel-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.left = `${dragStart.left + deltaX}px`;
          dialog.style.top = `${dragStart.top + deltaY}px`;
          dialog.style.margin = '0';
        }
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let newW = resizeStart.w;
        let newH = resizeStart.h;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;
        if (resizeDir.includes('e')) newW = Math.max(configMinSize.width, resizeStart.w + dx);
        if (resizeDir.includes('s')) newH = Math.max(configMinSize.height, resizeStart.h + dy);
        if (resizeDir.includes('w')) {
          newW = Math.max(configMinSize.width, resizeStart.w - dx);
          newLeft = resizeStart.left + (resizeStart.w - newW);
        }
        if (resizeDir.includes('n')) {
          newH = Math.max(configMinSize.height, resizeStart.h - dy);
          newTop = resizeStart.top + (resizeStart.h - newH);
        }
        const dialog = document.getElementById('config-panel-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.width = `${newW}px`;
          dialog.style.height = `${newH}px`;
          dialog.style.left = `${newLeft}px`;
          dialog.style.top = `${newTop}px`;
          dialog.style.margin = '0';
          dialog.style.maxWidth = 'none';
          dialog.style.maxHeight = 'none';
        }
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir('');
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDir]);

  // 配置弹窗最大化/还原
  const toggleConfigMaximize = () => {
    const dialog = document.getElementById('config-panel-dialog');
    const overlay = document.getElementById('config-panel-overlay');
    if (!configIsMaximized && dialog) {
      dialog.style.position = 'fixed';
      dialog.style.top = '0';
      dialog.style.left = '0';
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
      dialog.style.margin = '0';
      dialog.style.transform = 'none';
      if (overlay) {
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'flex-start';
      }
    } else if (dialog) {
      dialog.style.position = '';
      dialog.style.top = '';
      dialog.style.left = '';
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
      dialog.style.margin = '';
      dialog.style.transform = '';
      if (overlay) {
        overlay.style.alignItems = '';
        overlay.style.justifyContent = '';
      }
    }
    setConfigIsMaximized(!configIsMaximized);
  };
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  // ── 计算属性 ──
  const filteredTasks = useMemo(() => filterBySource(sourceFilter as DispatchTaskSource), [filterBySource, sourceFilter]);

  // ★ Task 13：班组 chip 变化 → 服务器侧缩窄候选池
  // 后端 /api/dispatch/recommend 返回白名单 worker IDs，前端与本地 getRecommendations 取交集
  useEffect(() => {
    // 清空班组时撤销服务器侧过滤
    if (selectedTeamIds.length === 0) {
      setServerFilteredWorkerIds(null);
      return;
    }
    // 没有选中任务时不发请求（taskId 必填）
    if (!selectedTask) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const taskId = selectedTask.sourceId ?? selectedTask.id;
        const recs = await recommendWorkers({ taskId, teamIds: selectedTeamIds });
        if (cancelled) return;
        setServerFilteredWorkerIds(recs.map((r) => r.workerId));
      } catch (err: unknown) {
        // 服务器端过滤失败回退到不过滤，不阻塞 UI
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[SmartDispatch] 班组过滤请求失败，回退到全量候选池:', message);
        if (!cancelled) setServerFilteredWorkerIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTask, selectedTeamIds, recommendWorkers]);

  const recommendations = useMemo<WorkerRecommendation[] | null>(() => {
    if (!selectedTask) return null;
    const all = getRecommendations(selectedTask, 5);
    // ★ Task 13：与服务器侧班组筛选白名单取交集，缩窄候选池
    if (serverFilteredWorkerIds === null) return all;
    if (serverFilteredWorkerIds.length === 0) return [];
    return all.filter((rec) => serverFilteredWorkerIds.includes(rec.worker.id));
  }, [selectedTask, getRecommendations, serverFilteredWorkerIds]);

  const dailyReport = useMemo<DailyWorkOrderReport>(() => {
    return generateDailyReport(new Date().toISOString().split('T')[0]);
  }, [generateDailyReport]);

  const predictedPendingTasks = useMemo(() => {
    return pendingTasks.filter(t => t.dispatchStatus === 'predicted');
  }, [pendingTasks]);

  // ★ 2026-08-24 PR2：greenhouse 名字 → ID 反查（selectedTask.greenhouse 是温室名字，AIPanel 需要 ID）
  // → 没找到时不传 greenhouseId，由 AIPanel 抛错提示用户（Fail Loud）
  const selectedGreenhouseId = useMemo(() => {
    if (!selectedTask?.greenhouse) return undefined;
    return greenhouses.find(g => g.name === selectedTask.greenhouse)?.id;
  }, [selectedTask?.greenhouse, greenhouses]);

  // ── 处理函数 ──
  const showResult = (result: { success: boolean; message: string }) => {
    setDispatchResult(result);
    setTimeout(() => setDispatchResult(null), 3000);
  };

  const handleSelectTask = (task: PendingConfirmTask) => {
    setSelectedTask(task);
    setDispatchResult(null);
  };

  const handleDispatch = (worker: WorkerRecommendation) => {
    if (!selectedTask) return;
    // ★ Task 13：派发前占用检查 + 软警告 + override 日志（用户取消则不发派工）
    void (async () => {
      const accepted = await confirmDispatchWithSoftWarn(
        { source: selectedTask.source === 'tempTask' ? 'tempTask' : 'farm', sourceId: selectedTask.sourceId || selectedTask.id },
        worker.worker.id,
        { taskPlanDate: (selectedTask as PendingConfirmTask & { planDate?: string }).planDate || (selectedTask as PendingConfirmTask & { dueDate?: string }).dueDate }
      );
      if (!accepted) return; // 用户在软警告弹窗中取消
      try {
        const result = confirmDispatch(selectedTask.id, worker.worker.id, worker.worker.name);
        showResult(result);
        setSelectedTask(null);
      } catch (err: unknown) {
        // ★ 排班冲突（2026-07-31）：后端返回 409 时提示用户
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('409') || message.includes('已有排班') || message.includes('conflict')) {
          await showAlert('该员工在此时间段已有排班记录，无法重复排班');
        } else {
          await showAlert(`派工失败：${message}`);
        }
      }
    })();
  };

  const handleAccept = (task: PendingConfirmTask) => {
    if (task.aiRecommendedWorkers?.length) {
      const topWorker = task.aiRecommendedWorkers[0];
      // ★ Task 13：派发前占用检查 + 软警告 + override 日志（用户取消则不发派工）
      void (async () => {
        const accepted = await confirmDispatchWithSoftWarn(
          { source: task.source === 'tempTask' ? 'tempTask' : 'farm', sourceId: task.sourceId || task.id },
          topWorker.worker.id,
          { taskPlanDate: (task as PendingConfirmTask & { planDate?: string }).planDate || (task as PendingConfirmTask & { dueDate?: string }).dueDate }
        );
        if (!accepted) return; // 用户在软警告弹窗中取消
        try {
          const result = confirmDispatch(task.id, topWorker.worker.id, topWorker.worker.name);
          showResult(result);
        } catch (err: unknown) {
          // ★ 排班冲突（2026-07-31）：后端返回 409 时提示用户
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('409') || message.includes('已有排班') || message.includes('conflict')) {
            await showAlert('该员工在此时间段已有排班记录，无法重复排班');
          } else {
            await showAlert(`派工失败：${message}`);
          }
        }
      })();
    }
  };

  const handleReplace = (task: PendingConfirmTask) => {
    setSelectedTask(task);
    setShowReplaceModal(true);
  };

  const handleDelay = (task: PendingConfirmTask) => {
    setSelectedTask(task);
    setShowDelayModal(true);
  };

  const handleAcceptOptimization = (task: PendingConfirmTask) => {
    if (task.aiOptimizationSuggestion) {
      const result = acceptOptimization(task.aiOptimizationSuggestion);
      showResult(result);
    }
  };

  const handleDelayConfirm = () => {
    if (selectedTask) {
      const result = delayTask(selectedTask.id, delayDays);
      showResult(result);
    }
    setShowDelayModal(false);
    setDelayDays(1);
  };

  const handleSplitConfirm = () => {
    if (selectedWorkersForSplit.length > 0) {
      const names = workers.filter(w => selectedWorkersForSplit.includes(w.id)).map(w => w.name).join('、');
      showResult({ success: true, message: `已拆分为 ${selectedWorkersForSplit.length} 个子任务，派发给：${names}` });
    }
    setShowSplitModal(false);
    setSelectedWorkersForSplit([]);
  };

  const handleReplaceConfirm = () => {
    if (selectedTask && selectedRecommendation) {
      const result = replaceWorker(selectedTask.id, selectedRecommendation.worker.id, selectedRecommendation.worker.name);
      showResult(result);
    }
    setShowReplaceModal(false);
    setSelectedRecommendation(null);
  };

  const toggleFactorsExpand = (workerId: string) => {
    setExpandedFactors(prev => {
      const next = new Set(prev);
      if (next.has(workerId)) { next.delete(workerId); } else { next.add(workerId); }
      return next;
    });
  };

  const handleBatchConfirm = () => {
    showResult({ success: true, message: `已批量派发 ${selectedTasks.size} 个任务` });
    setSelectedTasks(new Set());
  };

  // ★ 2026-08-24 PR8：调 AI-08 路径优化（中间列"📍 路径"按钮触发）
  // → 调 /api/dispatch/worker-tasks-and-location 拿工人位置 + 今日任务
  // → 调 /api/ai/route/optimize 算最优路径
  const handleShowRoute = async (worker: { id: string; name: string }) => {
    setRouteLoading(true);
    setRouteResult(null);
    try {
      // 2026-08-25 fix：删除底部 require（浏览器不支持），顶部已静态 import enhancedApiClient
      const date = new Date().toISOString().split('T')[0];
      // 1. 拿工人位置 + 今日任务
      const locResp = await enhancedApiClient.post('/dispatch/worker-tasks-and-location', {
        worker_id: worker.id,
        date,
      });
      const locData = (locResp as any)?.data ?? locResp;
      const tasks = locData?.tasks || [];
      if (tasks.length === 0) {
        await showAlert(`${worker.name} 今日（${date}）无待执行任务，无需路径优化`);
        return;
      }
      // 2. 调 AI-08 路径优化
      const routeResp = await enhancedApiClient.post('/ai/route/optimize', {
        worker_start: { lat: locData.worker.lat, lng: locData.worker.lng },
        tasks: tasks.map((t: any) => ({
          task_id: t.id, lat: t.lat, lng: t.lng, name: t.name,
        })),
      });
      const routeData = (routeResp as any)?.data ?? routeResp;
      setRouteResult({
        workerName: worker.name,
        totalKm: routeData.totalDistanceKm,
        originalKm: routeData.originalDistanceKm,
        savingsPercent: routeData.savingsPercent,
        steps: routeData.optimizedSteps || [],
      });
    } catch (e: any) {
      await showAlert(`路径优化失败：${e?.message || '未知错误'}`);
    } finally {
      setRouteLoading(false);
    }
  };

  // ── 渲染 ──
  return (
    <div className="space-y-4">
      {/* 页面标题 - 紧凑型 */}
      <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">智能派工</h1>
              <p className="text-xs text-gray-500">AI综合评分 · 多源任务整合</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" /> 配置中心
          </button>
        </div>
      </div>

      {/* ★ Task 13：班组 chip 多选 → 透传 teamIds 到后端缩窄候选池 */}
      <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium text-gray-700 pt-1 shrink-0">按班组筛选</div>
          <div className="flex-1">
            <TeamChipMultiSelect value={selectedTeamIds} onChange={setSelectedTeamIds} />
            {selectedTeamIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                已选 {selectedTeamIds.length} 个班组，AI 推荐候选池已缩窄。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ★ 2026-08-22：AI 智能助手面板（10 模块一键调用）
          ★ 2026-08-24 PR2：透传 selectedTask 真实上下文 + autoTrigger 自动化
            - 选中任务变化 → 200ms debounce → 自动调 AI-01 派工 + AI-06 工时（无需点按钮）
            - 班组筛选 → 透传 teamIds 缩窄候选池
            - 缺 greenhouseId 时 AI-01 会明确提示用户（Fail Loud） */}
      <AIPanel
        cropType={selectedTask?.cropName || '番茄'}
        taskId={selectedTask?.id}
        taskType={selectedTask?.type}
        greenhouseId={selectedGreenhouseId}
        priority={selectedTask?.priority}
        requiredSkills={selectedTask?.requiredSkills}
        estimatedHours={selectedTask?.estimatedHours}
        batchId={selectedTask?.batchId}
        batchCode={selectedTask?.batchCode}
        teamIds={selectedTeamIds}
        autoTrigger
        autoTriggerKeys={['workhour', 'dispatch', 'growth', 'pest', 'growthState']}
        // ★ 2026-08-24 PR4+PR5+PR6：P2/P3/P4 模块不进 autoTriggerKeys → 独立触发场景：
        //   P2：
        //   - AI-02：点击"生成周排班"按钮触发
        //   - AI-07：物料页面进入时自动加载（5min 轮询）
        //   - AI-08：中间列选中推荐员工后，由"查看路径"按钮触发
        //   - AI-14：监控仪表板 DispatchMetricsDashboard 顶部自动轮询
        //   P3：
        //   - AI-03：在审批详情页挂载 AIPanel compact 模式，透传 employeeId/approvalType
        //   - AI-12：用户在问答输入框输入 question 后手动提问
        //   - AI-13：在报告中心页面挂载，透传 reportType/dateRange
        //   - AI-15：在员工管理页面挂载，可选传 teamId 班组过滤
        //   P4：
        //   - AI-09：点击按钮触发文件选择对话框 → 上传 base64 → 调识别（不自动）
        //   - AI-11：用户在语音文本框输入 transcribed_text → 手动解析（不自动）
      />

      {/* 监控仪表板 */}
      <DispatchMetricsDashboard />

      {/* 决策因素说明 */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-900">派工决策因素与权重</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DISPATCH_WEIGHTS_INFO.map(item => (
            <div key={item.label} className="text-center">
              <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 预测任务面板 */}
      <PredictedTasksPanel predictedTasks={predictedTasks} overdueTasks={overdueTasks} pestAlerts={pestAlerts} />

      {/* 统计卡片 */}
      <StatsCards
        pendingAI={confirmStats.pendingAI}
        recommended={confirmStats.recommended}
        predicted={confirmStats.predicted}
        optimization={confirmStats.optimization}
        total={confirmStats.total}
      />

      {/* 任务分组列表 */}
      <div className="space-y-4">
        <TaskGroup title="AI已推荐" icon="✅" tasks={recommendedTasks} selectedTaskId={selectedTask?.id}
          onSelectTask={handleSelectTask} onAccept={handleAccept} onReplace={handleReplace}
          onDelay={handleDelay} onAcceptOptimization={handleAcceptOptimization} />
        <TaskGroup title="待AI推荐" icon="⏳" tasks={pendingAITasks} selectedTaskId={selectedTask?.id}
          onSelectTask={handleSelectTask} onAccept={handleAccept} onReplace={handleReplace}
          onDelay={handleDelay} onAcceptOptimization={handleAcceptOptimization} />
        <TaskGroup title="预测任务" icon="🔮" tasks={predictedPendingTasks} selectedTaskId={selectedTask?.id}
          onSelectTask={handleSelectTask} onAccept={handleAccept} onReplace={handleReplace}
          onDelay={handleDelay} onAcceptOptimization={handleAcceptOptimization} />
        <TaskGroup title="优化建议" icon="💡" tasks={optimizationTasks} selectedTaskId={selectedTask?.id}
          onSelectTask={handleSelectTask} onAccept={handleAccept} onReplace={handleReplace}
          onDelay={handleDelay} onAcceptOptimization={handleAcceptOptimization} />
      </div>

      {/* 物料设备状态 */}
      <MaterialEquipmentPanel overview={materialEquipmentOverview} materials={materials}
        equipments={equipments} equipmentAlerts={equipmentAlerts} />

      {/* 派发结果提示 */}
      {dispatchResult && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          dispatchResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          {dispatchResult.message}
        </div>
      )}

      {/* 三栏布局：任务池 → 推荐 → 详情+环境 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 左侧：任务池 */}
        <div className="col-span-1">
          <DispatchTaskPool
            tasks={filteredTasks}
            selectedTaskId={selectedTask?.sourceId || selectedTask?.id}
            onSelectTask={(task) => handleSelectTask({ ...task, dispatchStatus: 'recommended', sourceLabel: task.source === 'farm' ? '农事任务' : task.source === 'tempTask' ? '临时任务' : '巡查问题' } as PendingConfirmTask)}
            sourceFilter={sourceFilter}
            onSourceFilterChange={(f) => setSourceFilter(f as DispatchTaskSource | 'all')}
          />
        </div>

        {/* 中间：AI推荐 */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">智能推荐</h3>
              {selectedTask && <p className="text-xs text-gray-500 mt-1">为 <span className="font-medium">{selectedTask.title}</span> 推荐的员工</p>}
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
              {!selectedTask ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-gray-300" />
                  <p>请选择左侧任务</p>
                  <p className="text-xs text-gray-400 mt-1">系统将自动生成推荐</p>
                </div>
              ) : recommendations && recommendations.length > 0 ? (
                <div className="space-y-2">
                  {recommendations
                    .filter(rec => !dismissedRecommendations.includes(rec.worker.id))
                    .map((rec, index) => (
                      <div key={rec.worker.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedRecommendation?.worker.id === rec.worker.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : index === 0 ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
                        }`}>
                        {/* 排名和名字 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>{index + 1}</span>
                            <span className="font-medium text-gray-900">{rec.worker.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              rec.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                              rec.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {rec.confidenceLevel === 'high' ? '高' : rec.confidenceLevel === 'medium' ? '中' : '低'}置信
                            </span>
                            <span className="text-sm font-bold text-emerald-600">{rec.matchScore}分</span>
                          </div>
                        </div>

                        {/* 基本信息 */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rec.worker.workZone}</span>
                          <span>负荷{rec.worker.currentLoad}%</span>
                        </div>

                        {/* 推荐理由 */}
                        {rec.reasonsDetail?.positive?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {rec.reasonsDetail.positive.map((reason, i) => (
                              <span key={`pos-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">{reason}</span>
                            ))}
                          </div>
                        )}

                        {/* 警告 */}
                        {rec.reasonsDetail?.warning?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {rec.reasonsDetail.warning.map((reason, i) => (
                              <span key={`warn-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">{reason}</span>
                            ))}
                          </div>
                        )}

                        {/* 风险警告 */}
                        {rec.riskWarnings?.length > 0 && (
                          <div className="mb-2 p-2 bg-red-50 rounded border border-red-200">
                            <div className="text-xs text-red-600 font-medium mb-1">风险提示</div>
                            {rec.riskWarnings.map((warning, i) => (
                              <div key={i} className="text-xs text-red-500">• {warning}</div>
                            ))}
                          </div>
                        )}

                        {/* 全维度因素分析（可折叠） */}
                        <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleFactorsExpand(rec.worker.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                          >
                            <span className="font-medium text-gray-700">全维度因素分析</span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedFactors.has(rec.worker.id) ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedFactors.has(rec.worker.id) && rec.factorsDetail && (
                            <div className="p-3 space-y-3 bg-white">
                              {(['production', 'environment', 'worker'] as const).map(category => {
                                const config = {
                                  production: { label: '生产因素', bg: 'bg-green-100 text-green-700', color: 'text-green-500' },
                                  environment: { label: '环境因素', bg: 'bg-blue-100 text-blue-700', color: 'text-blue-500' },
                                  worker: { label: '人员因素', bg: 'bg-purple-100 text-purple-700', color: 'text-purple-500' },
                                }[category];
                                const factors = rec.factorsDetail[category];
                                return (
                                  <div key={category} className="factor-section">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg}`}>{config.label}</span>
                                    </div>
                                    <div className="pl-2 space-y-1">
                                      {factors?.length > 0 ? factors.map((factor: string, i: number) => (
                                        <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                          <span className={config.color}>•</span> {factor}
                                        </div>
                                      )) : <div className="text-xs text-gray-400">无相关信息</div>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮行 */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDispatch(rec)}
                            disabled={!rec.isAvailable}
                            className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 ${
                              index === 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } ${!rec.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Send className="w-3 h-3" /> 派发
                          </button>
                          {/* ★ 2026-08-24 PR8：AI-08 路径优化按钮（中间列 → 触发路径优化） */}
                          <button
                            onClick={() => handleShowRoute(rec.worker)}
                            disabled={routeLoading}
                            title="AI-08 路径优化：根据今日任务和工人位置算最优执行顺序"
                            className="px-2 py-1.5 rounded text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <MapPin className="w-3 h-3" /> 路径
                          </button>
                          <button
                            onClick={() => { setDispatchAction('delay'); setSelectedRecommendation(rec); setShowDelayModal(true); }}
                            className="flex-1 py-1.5 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1"
                          >
                            <CalendarClock className="w-3 h-3" /> 延后
                          </button>
                          <button
                            onClick={() => { setDispatchAction('dismiss'); setDismissedRecommendations(prev => [...prev, rec.worker.id]); }}
                            className="flex-1 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" /> 忽略
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p>暂无可用员工</p>
                </div>
              )}

              {/* ★ 2026-08-24 PR8：AI-08 路径优化结果展示区 */}
              {routeLoading && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> AI-08 路径优化计算中...
                </div>
              )}
              {routeResult && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-800">📍 {routeResult.workerName} 最优路径</span>
                    </div>
                    <button onClick={() => setRouteResult(null)} className="text-xs text-orange-500 hover:text-orange-700">关闭</button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-orange-700 mb-2">
                    <span>原 {routeResult.originalKm.toFixed(1)}km → 优 {routeResult.totalKm.toFixed(1)}km</span>
                    <span className="px-1.5 py-0.5 bg-orange-100 rounded font-medium">节省 {routeResult.savingsPercent}%</span>
                  </div>
                  <div className="space-y-1">
                    {routeResult.steps.map((s, i) => (
                      <p key={i} className="text-xs text-orange-700">
                        {i + 1}. {s.name || s.taskId} <span className="text-orange-500">（距上站 {s.distanceFromPrevKm.toFixed(1)}km · 累计 {s.cumulativeDistanceKm.toFixed(1)}km）</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：任务详情 + 推荐理由 */}
        <div className="col-span-1 space-y-3">
          {selectedTask && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">任务详情</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">任务编号</span><span className="text-gray-900 font-medium">{selectedTask.taskCode}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">任务标题</span><span className="text-gray-900 font-medium">{selectedTask.title}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">任务类型</span><span className="text-gray-900">{selectedTask.typeName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">优先级</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[selectedTask.priority] || PRIORITY_COLORS.normal}`}>
                    {selectedTask.priority === 'urgent' ? '紧急' : selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'normal' ? '中' : '低'}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">工作区域</span><span className="text-gray-900">{selectedTask.workZone || selectedTask.greenhouse}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">预计工时</span><span className="text-gray-900">{selectedTask.estimatedHours}小时</span></div>
                {selectedTask.batchCode && <div className="flex justify-between"><span className="text-gray-500">关联批次</span><span className="text-gray-900">{selectedTask.batchCode}</span></div>}
              </div>
            </div>
          )}

          {/* 推荐理由说明 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">推荐理由说明</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">技能匹配度 (30%)</div>
                  <div className="text-xs text-gray-500 mt-0.5">根据任务所需技能与员工持有技能的匹配程度计算</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">地理位置 (20%)</div>
                  <div className="text-xs text-gray-500 mt-0.5">根据员工当前位置与任务工作区域的距离计算</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">当前负荷 (20%)</div>
                  <div className="text-xs text-gray-500 mt-0.5">根据员工当前任务负荷情况计算，负荷越低分数越高</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">历史表现 (15%)</div>
                  <div className="text-xs text-gray-500 mt-0.5">根据员工近30天的任务完成情况综合评分</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">紧急程度 (10%)</div>
                  <div className="text-xs text-gray-500 mt-0.5">根据任务优先级计算，紧急任务优先分配给效率高的员工</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 最右侧：环境面板 */}
        <div className="col-span-1">
          <EnvironmentPanel
            todayWeather={todayWeather}
            weatherForecasts={weatherForecasts}
            sensors={sensors}
            alerts={alerts}
            unacknowledgedAlerts={unacknowledgedAlerts}
            getCurrentWeatherRecommendation={getCurrentWeatherRecommendation}
          />
        </div>
      </div>

      {/* ── 弹窗 ── */}

      {/* 延后操作弹窗 */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-80 p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">延后派发</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">将任务延后派发</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">延后天数</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <button key={day} onClick={() => setDelayDays(day)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      delayDays === day ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>{day}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDelayModal(false)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">取消</button>
              <button onClick={handleDelayConfirm} className="flex-1 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600">确认延后</button>
            </div>
          </div>
        </div>
      )}

      {/* 拆分操作弹窗 */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Split className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">拆分任务</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">选择多个执行人来分担任务</p>
            <div className="mb-4 space-y-2">
              {workers.map(worker => (
                <label key={worker.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkersForSplit.includes(worker.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                  <input type="checkbox" checked={selectedWorkersForSplit.includes(worker.id)}
                    onChange={() => setSelectedWorkersForSplit(prev => prev.includes(worker.id) ? prev.filter(id => id !== worker.id) : [...prev, worker.id])}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <div className="flex-1"><div className="font-medium text-gray-900">{worker.name}</div></div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSplitModal(false)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">取消</button>
              <button onClick={handleSplitConfirm} disabled={selectedWorkersForSplit.length === 0}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${selectedWorkersForSplit.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                确认拆分 ({selectedWorkersForSplit.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 更换执行人弹窗 */}
      {showReplaceModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">更换执行人</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">为 <span className="font-medium">{selectedTask.title}</span> 选择新的执行人</p>
            <div className="mb-4 space-y-2">
              {workers.map(worker => (
                <label key={worker.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedRecommendation?.worker.id === worker.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                  <input type="radio" name="worker" checked={selectedRecommendation?.worker.id === worker.id}
                    onChange={() => setSelectedRecommendation({ worker, matchScore: 0, skillMatchRate: 0, locationScore: 0, loadScore: 0, performanceScore: 0, urgencyScore: 0, batchFamiliarityScore: 0, reasons: [], confidenceLevel: 'medium', confidenceScore: 0, suggestedAction: 'dispatch', reasonsDetail: { positive: [], warning: [] }, riskWarnings: [], isAvailable: true, weatherScore: 0, factorsDetail: { production: [], environment: [], worker: [] } })}
                    className="w-4 h-4 text-blue-600" />
                  <div className="flex-1"><div className="font-medium text-gray-900">{worker.name}</div></div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReplaceModal(false)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">取消</button>
              <button onClick={handleReplaceConfirm} disabled={!selectedRecommendation}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${!selectedRecommendation ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                确认更换
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置中心弹窗 */}
      {showConfigPanel && (
        <div id="config-panel-overlay" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            id="config-panel-dialog"
            className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col relative"
          >
            {/* 标题栏（渐变绿 + 可拖动） */}
            <div
              className="p-4 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 cursor-move rounded-t-xl"
              onMouseDown={handleConfigDragStart}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <h2 className="font-semibold text-white select-none">派工配置中心</h2>
              </div>
              <div className="flex items-center gap-1">
                {/* 最大化/还原按钮 */}
                <button
                  onClick={toggleConfigMaximize}
                  className="text-white hover:bg-emerald-500 p-1.5 rounded transition-colors"
                  title={configIsMaximized ? '还原' : '最大化'}
                >
                  {configIsMaximized ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 4v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0-4V6a2 2 0 00-2-2h-2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
                {/* 关闭按钮 */}
                <button onClick={() => setShowConfigPanel(false)} className="text-white hover:bg-emerald-500 p-1.5 rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DispatchConfigPanel onSave={(config) => { console.log('配置已保存:', config); }} />
            </div>
            {/* 缩放拖拽手柄（最大化时隐藏） */}
            {!configIsMaximized && (
              <>
                <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'nw')} />
                <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'ne')} />
                <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'sw')} />
                <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'se')} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-n-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'n')} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-s-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleConfigResizeStart(e, 's')} />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-w-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'w')} />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-e-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleConfigResizeStart(e, 'e')} />
              </>
            )}
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      <BatchActionsBar selectedCount={selectedTasks.size} onConfirmAll={handleBatchConfirm} onCancel={() => setSelectedTasks(new Set())} />
    </div>
  );
}
