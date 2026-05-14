/**
 * 智能派工管理页面
 * 整合农事任务、临时任务、巡查问题的统一派发入口
 * 基于AI多因子评分算法生成派工建议
 *
 * 架构：Zustand Store（数据层）→ Hooks（业务逻辑）→ 页面组件（UI展示）
 * UI：Tailwind CSS + lucide-react（不使用 antd）
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles, MapPin, Clock, AlertTriangle, CheckCircle2, Zap, Bot,
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

// 子组件
import { DispatchTaskPool } from '../components/dispatch/DispatchTaskPool';
import { EnvironmentPanel } from '../components/dispatch/EnvironmentPanel';
import { PredictedTasksPanel } from '../components/dispatch/PredictedTasksPanel';
import { DispatchMetricsDashboard } from '../components/dispatch/DispatchMetricsDashboard';
import { DispatchConfigPanel } from '../components/dispatch/DispatchConfigPanel';
import { MaterialEquipmentPanel } from '../components/dispatch/MaterialEquipmentPanel';

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
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center text-white text-lg`}>
              {stat.icon}
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
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
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
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

  if (tasks.length === 0) return null;

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
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
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

  // ── 本地状态 ──
  const [selectedTask, setSelectedTask] = useState<PendingConfirmTask | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<DispatchTaskSource | 'all'>('all');
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dispatchAction, setDispatchAction] = useState<'dispatch' | 'delay' | 'split' | 'dismiss' | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<WorkerRecommendation | null>(null);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayDays, setDelayDays] = useState(1);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedWorkersForSplit, setSelectedWorkersForSplit] = useState<string[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  // ── 计算属性 ──
  const filteredTasks = useMemo(() => filterBySource(sourceFilter as DispatchTaskSource), [filterBySource, sourceFilter]);

  const recommendations = useMemo<WorkerRecommendation[] | null>(() => {
    if (!selectedTask) return null;
    return getRecommendations(selectedTask, 5);
  }, [selectedTask, getRecommendations]);

  const dailyReport = useMemo<DailyWorkOrderReport>(() => {
    return generateDailyReport(new Date().toISOString().split('T')[0]);
  }, [generateDailyReport]);

  const predictedPendingTasks = useMemo(() => {
    return pendingTasks.filter(t => t.dispatchStatus === 'predicted');
  }, [pendingTasks]);

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
    const result = confirmDispatch(selectedTask.id, worker.worker.id, worker.worker.name);
    showResult(result);
    setSelectedTask(null);
  };

  const handleAccept = (task: PendingConfirmTask) => {
    if (task.aiRecommendedWorkers?.length) {
      const topWorker = task.aiRecommendedWorkers[0];
      const result = confirmDispatch(task.id, topWorker.worker.id, topWorker.worker.name);
      showResult(result);
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

  // ── 渲染 ──
  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">智能派工</h1>
              <p className="text-xs text-gray-500">AI综合评分 · 多源任务整合 · 智能推荐</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" /> 配置中心
          </button>
        </div>
      </div>

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
                            : index === 0 ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900">派工配置中心</h2>
              </div>
              <button onClick={() => setShowConfigPanel(false)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DispatchConfigPanel onSave={(config) => { console.log('配置已保存:', config); }} />
            </div>
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      <BatchActionsBar selectedCount={selectedTasks.size} onConfirmAll={handleBatchConfirm} onCancel={() => setSelectedTasks(new Set())} />
    </div>
  );
}
