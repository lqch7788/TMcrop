/**
 * 智能派工管理页面
 * 整合农事任务、临时任务、巡查问题的统一派发入口
 * 基于AI多因子评分算法生成派工建议
 */

import React, { useState, useMemo } from 'react';
import { Sparkles, MapPin, Clock, AlertTriangle, CheckCircle2, Zap, Bot, Send, CalendarClock, Split, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useComprehensiveDispatch, type UnifiedDispatchTask, type WorkerRecommendation, type DispatchTaskSource } from '../hooks/useComprehensiveDispatch';
import { useEnvironmentData } from '../hooks/useEnvironmentData';
import { useCropGrowthEngine, type PredictedTask } from '../hooks/useCropGrowthEngine';
import { useMaterialEquipment } from '../hooks/useMaterialEquipment';
import { DispatchTaskPool } from '../components/dispatch/DispatchTaskPool';
import { EnvironmentPanel } from '../components/dispatch/EnvironmentPanel';
import { PredictedTasksPanel } from '../components/dispatch/PredictedTasksPanel';
import { DispatchMetricsDashboard } from '../components/dispatch/DispatchMetricsDashboard';
import { DispatchConfigPanel } from '../components/dispatch/DispatchConfigPanel';
import { MaterialEquipmentPanel } from '../components/dispatch/MaterialEquipmentPanel';

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

/** 优先级颜色 */
const PRIORITY_COLORS: Record<UnifiedDispatchTask['priority'], string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

export default function SmartDispatchPage() {
  // 使用综合派工引擎
  const {
    taskPool,
    stats,
    workers,
    getRecommendations,
    executeDispatch,
    filterBySource,
    todayWeather,
    getCurrentWeatherRecommendation,
    unacknowledgedAlerts,
    criticalAlerts,
  } = useComprehensiveDispatch();

  // 使用环境数据
  const {
    weatherForecasts,
    sensors,
    alerts,
    acknowledgeAlert,
  } = useEnvironmentData();

  // 使用作物生长引擎
  const {
    predictedTasks,
    overdueTasks,
    pestAlerts,
  } = useCropGrowthEngine();

  // 使用物料设备管理
  const {
    materials,
    equipments,
    equipmentAlerts,
    overview: materialEquipmentOverview,
  } = useMaterialEquipment();

  // 本地状态
  const [selectedTask, setSelectedTask] = useState<UnifiedDispatchTask | null>(null);
  const [sourceFilter, setSourceFilter] = useState<DispatchTaskSource | 'all'>('all');
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);

  // 派发操作状态
  const [dispatchAction, setDispatchAction] = useState<'dispatch' | 'delay' | 'split' | 'dismiss' | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<WorkerRecommendation | null>(null);

  // 延后操作弹窗状态
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayDays, setDelayDays] = useState(1);

  // 拆分操作弹窗状态
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedWorkersForSplit, setSelectedWorkersForSplit] = useState<string[]>([]);

  // 被忽略的推荐（本地状态过滤）
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);

  // 因素详情展开状态（记录哪些worker展开了因素详情）
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());

  // 切换因素详情展开状态
  const toggleFactorsExpand = (workerId: string) => {
    setExpandedFactors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      return newSet;
    });
  };

  // 根据筛选获取任务
  const filteredTasks = useMemo(
    () => filterBySource(sourceFilter),
    [filterBySource, sourceFilter]
  );

  // 获取选中任务的推荐
  const recommendations = useMemo<WorkerRecommendation[] | null>(() => {
    if (!selectedTask) return null;
    return getRecommendations(selectedTask, 5);
  }, [selectedTask, getRecommendations]);

  // 处理派发
  const handleDispatch = (worker: WorkerRecommendation) => {
    if (!selectedTask) return;

    executeDispatch(selectedTask, worker.worker.id, worker.worker.name);
    setDispatchResult({
      success: true,
      message: `已成功派发给 ${worker.worker.name}`,
    });

    // 3秒后清除结果
    setTimeout(() => setDispatchResult(null), 3000);

    // 清除选中任务
    setSelectedTask(null);
  };

  // 处理任务选择
  const handleSelectTask = (task: UnifiedDispatchTask) => {
    setSelectedTask(task);
    setDispatchResult(null);
    // 重置操作状态
    setDispatchAction(null);
    setSelectedRecommendation(null);
  };

  /**
   * 处理派发操作
   * @param recommendation 推荐结果
   * @param action 操作类型：dispatch(派发)、delay(延后)、split(拆分)、dismiss(忽略)
   */
  const handleDispatchAction = (recommendation: WorkerRecommendation, action: 'dispatch' | 'delay' | 'split' | 'dismiss') => {
    setDispatchAction(action);
    setSelectedRecommendation(recommendation);

    switch (action) {
      case 'dispatch':
        // 直接派发
        handleDispatch(recommendation);
        break;
      case 'delay':
        // 弹出延后天数选择
        setShowDelayModal(true);
        break;
      case 'split':
        // 弹出执行人选择
        setSelectedWorkersForSplit([recommendation.worker.id]);
        setShowSplitModal(true);
        break;
      case 'dismiss':
        // 从推荐列表中移除（本地过滤）
        if (selectedTask) {
          setDismissedRecommendations(prev => [...prev, recommendation.worker.id]);
        }
        setDispatchAction(null);
        setSelectedRecommendation(null);
        break;
    }
  };

  // 延后操作确认
  const handleDelayConfirm = () => {
    if (selectedRecommendation) {
      setDispatchResult({
        success: true,
        message: `已延后 ${delayDays} 天派发给 ${selectedRecommendation.worker.name}`,
      });
      setTimeout(() => setDispatchResult(null), 3000);
    }
    setShowDelayModal(false);
    setDelayDays(1);
    setDispatchAction(null);
    setSelectedRecommendation(null);
  };

  // 拆分操作确认
  const handleSplitConfirm = () => {
    if (selectedRecommendation && selectedWorkersForSplit.length > 0) {
      const selectedNames = workers
        .filter(w => selectedWorkersForSplit.includes(w.id))
        .map(w => w.name)
        .join('、');
      setDispatchResult({
        success: true,
        message: `已拆分为 ${selectedWorkersForSplit.length} 个子任务，派发给：${selectedNames}`,
      });
      setTimeout(() => setDispatchResult(null), 3000);
    }
    setShowSplitModal(false);
    setSelectedWorkersForSplit([]);
    setDispatchAction(null);
    setSelectedRecommendation(null);
  };

  // 切换拆分选择的执行人
  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkersForSplit(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  // 配置面板弹窗状态
  const [showConfigPanel, setShowConfigPanel] = useState(false);

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
            <Sparkles className="w-4 h-4" />
            配置中心
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
      <PredictedTasksPanel
        predictedTasks={predictedTasks}
        overdueTasks={overdueTasks}
        pestAlerts={pestAlerts}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="待派发总数" value={stats.total} color="bg-blue-500" />
        <StatCard label="农事任务" value={stats.farm} color="bg-green-500" />
        <StatCard label="临时任务" value={stats.tempTask} color="bg-purple-500" />
        <StatCard label="巡查问题" value={stats.inspection} color="bg-orange-500" />
      </div>

      {/* 物料设备状态面板 */}
      <MaterialEquipmentPanel
        overview={materialEquipmentOverview}
        materials={materials}
        equipments={equipments}
        equipmentAlerts={equipmentAlerts}
      />

      {/* 派发结果提示 */}
      {dispatchResult && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          dispatchResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          {dispatchResult.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {/* 左侧：任务池 */}
        <div className="col-span-1">
          <DispatchTaskPool
            tasks={filteredTasks}
            selectedTaskId={selectedTask?.id}
            onSelectTask={handleSelectTask}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
        </div>

        {/* 中间：推荐结果 */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">智能推荐</h3>
              {selectedTask && (
                <p className="text-xs text-gray-500 mt-1">
                  为 <span className="font-medium">{selectedTask.title}</span> 推荐的员工
                </p>
              )}
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
                    <div
                      key={rec.worker.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedRecommendation?.worker.id === rec.worker.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : index === 0
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* 排名、名字和置信度 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">{rec.worker.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 置信度徽章 */}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            rec.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                            rec.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {rec.confidenceLevel === 'high' ? '高置信' : rec.confidenceLevel === 'medium' ? '中置信' : '低置信'}
                          </span>
                          <span className="text-sm font-bold text-emerald-600">{rec.matchScore}分</span>
                        </div>
                      </div>

                      {/* 基本信息 */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span>{rec.worker.workerType}</span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {rec.worker.workZone}
                        </span>
                        <span>|</span>
                        <span>负荷{rec.worker.currentLoad}%</span>
                      </div>

                      {/* 推荐理由 - 正面（✅） */}
                      {rec.reasonsDetail.positive.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.reasonsDetail.positive.map((reason, i) => (
                            <span key={`pos-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 推荐理由 - 警告（⚠️） */}
                      {rec.reasonsDetail.warning.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.reasonsDetail.warning.map((reason, i) => (
                            <span key={`warn-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 风险警告 */}
                      {rec.riskWarnings.length > 0 && (
                        <div className="mb-2 p-2 bg-red-50 rounded border border-red-200">
                          <div className="text-xs text-red-600 font-medium mb-1">风险提示</div>
                          {rec.riskWarnings.map((warning, i) => (
                            <div key={i} className="text-xs text-red-500">• {warning}</div>
                          ))}
                        </div>
                      )}

                      {/* 全维度因素详情 - 可折叠section */}
                      <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                        {/* 展开/收起按钮 */}
                        <button
                          onClick={() => toggleFactorsExpand(rec.worker.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                        >
                          <span className="font-medium text-gray-700">全维度因素分析</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">
                              {expandedFactors.has(rec.worker.id) ? '收起' : '展开'}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                expandedFactors.has(rec.worker.id) ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {/* 展开的内容 */}
                        {expandedFactors.has(rec.worker.id) && (
                          <div className="p-3 space-y-3 bg-white">
                            {/* 生产因素 */}
                            <div className="factor-section">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  生产因素
                                </span>
                              </div>
                              <div className="pl-2 space-y-1">
                                {rec.factorsDetail.production.length > 0 ? (
                                  rec.factorsDetail.production.map((factor, i) => (
                                    <div key={`prod-${i}`} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className="text-green-500">•</span>
                                      <span>{factor}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-gray-400">无相关信息</div>
                                )}
                              </div>
                            </div>

                            {/* 环境因素 */}
                            <div className="factor-section">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  环境因素
                                </span>
                              </div>
                              <div className="pl-2 space-y-1">
                                {rec.factorsDetail.environment.length > 0 ? (
                                  rec.factorsDetail.environment.map((factor, i) => (
                                    <div key={`env-${i}`} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className="text-blue-500">•</span>
                                      <span>{factor}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-gray-400">无相关信息</div>
                                )}
                              </div>
                            </div>

                            {/* 人员因素 */}
                            <div className="factor-section">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  人员因素
                                </span>
                              </div>
                              <div className="pl-2 space-y-1">
                                {rec.factorsDetail.worker.length > 0 ? (
                                  rec.factorsDetail.worker.map((factor, i) => (
                                    <div key={`worker-${i}`} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className="text-purple-500">•</span>
                                      <span>{factor}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-gray-400">无相关信息</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 建议动作 */}
                      <div className="mb-2 text-xs">
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          rec.suggestedAction === 'dispatch' ? 'bg-emerald-100 text-emerald-700' :
                          rec.suggestedAction === 'manual' ? 'bg-yellow-100 text-yellow-700' :
                          rec.suggestedAction === 'split' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rec.suggestedAction === 'dispatch' ? '✓ 可直接派发' :
                           rec.suggestedAction === 'manual' ? '⚠ 需人工确认' :
                           rec.suggestedAction === 'split' ? '○ 建议拆分' : '○ 建议延后'}
                        </span>
                      </div>

                      {/* 操作工具按钮行 */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* 派发按钮 */}
                        <button
                          onClick={() => handleDispatch(rec)}
                          disabled={!rec.isAvailable}
                          className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            index === 0
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${!rec.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Send className="w-3 h-3" />
                          派发
                        </button>

                        {/* 延后按钮 */}
                        <button
                          onClick={() => handleDispatchAction(rec, 'delay')}
                          className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            dispatchAction === 'delay' && selectedRecommendation?.worker.id === rec.worker.id
                              ? 'bg-amber-500 text-white'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                          title="延后派发"
                        >
                          <CalendarClock className="w-3 h-3" />
                          延后
                        </button>

                        {/* 拆分按钮 */}
                        <button
                          onClick={() => handleDispatchAction(rec, 'split')}
                          className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            dispatchAction === 'split' && selectedRecommendation?.worker.id === rec.worker.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                          title="拆分任务给多人"
                        >
                          <Split className="w-3 h-3" />
                          拆分
                        </button>

                        {/* 忽略按钮 */}
                        <button
                          onClick={() => handleDispatchAction(rec, 'dismiss')}
                          className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            dispatchAction === 'dismiss' && selectedRecommendation?.worker.id === rec.worker.id
                              ? 'bg-gray-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                          }`}
                          title="忽略此推荐"
                        >
                          <X className="w-3 h-3" />
                          忽略
                        </button>
                      </div>

                      {/* 选中指示器 */}
                      {selectedRecommendation?.worker.id === rec.worker.id && (
                        <div className="text-xs text-blue-600 font-medium flex items-center justify-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          已选择操作
                        </div>
                      )}
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

        {/* 右侧：任务详情与推荐理由 */}
        <div className="col-span-1 space-y-3">
          {/* 任务详情 */}
          {selectedTask && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">任务详情</h3>
              </div>
              <div className="p-4 space-y-3">
                <DetailItem label="任务编号" value={selectedTask.taskCode} />
                <DetailItem label="任务标题" value={selectedTask.title} />
                <DetailItem label="任务类型" value={selectedTask.typeName} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">优先级</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[selectedTask.priority]}`}>
                    {selectedTask.priority === 'urgent' ? '紧急' : selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'normal' ? '中' : '低'}
                  </span>
                </div>
                <DetailItem label="工作区域" value={selectedTask.workZone || selectedTask.greenhouse} />
                <DetailItem label="作物" value={selectedTask.cropName || '-'} />
                <DetailItem label="预计工时" value={`${selectedTask.estimatedHours}小时`} />
                {selectedTask.batchCode && (
                  <DetailItem label="关联批次" value={selectedTask.batchCode} />
                )}
                {selectedTask.description && (
                  <DetailItem label="任务描述" value={selectedTask.description} />
                )}
              </div>
            </div>
          )}

          {/* 推荐理由说明 */}
          {recommendations && recommendations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">推荐理由说明</h3>
              </div>
              <div className="p-4 space-y-3">
                <ReasonItem
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  title="技能匹配度 (30%)"
                  desc="根据任务所需技能与员工持有技能的匹配程度计算"
                />
                <ReasonItem
                  icon={<MapPin className="w-5 h-5 text-blue-500" />}
                  title="地理位置 (20%)"
                  desc="根据员工当前位置与任务工作区域的距离计算"
                />
                <ReasonItem
                  icon={<Zap className="w-5 h-5 text-amber-500" />}
                  title="当前负荷 (20%)"
                  desc="根据员工当前任务负荷情况计算，负荷越低分数越高"
                />
                <ReasonItem
                  icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                  title="历史表现 (15%)"
                  desc="根据员工近30天的任务完成情况综合评分"
                />
                <ReasonItem
                  icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                  title="紧急程度 (10%)"
                  desc="根据任务优先级计算，紧急任务会优先分配给效率高的员工"
                />
              </div>
            </div>
          )}
        </div>

        {/* 右侧：环境信息面板 */}
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

      {/* 延后操作弹窗 */}
      {showDelayModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-80 p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">延后派发</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              将任务延后派发给 <span className="font-medium">{selectedRecommendation.worker.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">延后天数</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <button
                    key={day}
                    onClick={() => setDelayDays(day)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      delayDays === day
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDelayModal(false);
                  setDelayDays(1);
                  setDispatchAction(null);
                  setSelectedRecommendation(null);
                }}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleDelayConfirm}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600"
              >
                确认延后
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拆分操作弹窗 */}
      {showSplitModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Split className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">拆分任务</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              选择多个执行人来分担任务
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择执行人</label>
              <div className="space-y-2">
                {workers.map(worker => (
                  <label
                    key={worker.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedWorkersForSplit.includes(worker.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkersForSplit.includes(worker.id)}
                      onChange={() => toggleWorkerSelection(worker.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{worker.name}</div>
                      <div className="text-xs text-gray-500">{worker.workerType} | {worker.workZone}</div>
                    </div>
                    {selectedWorkersForSplit.includes(worker.id) && (
                      <span className="text-xs text-blue-600 font-medium">
                        已选择
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setSelectedWorkersForSplit([]);
                  setDispatchAction(null);
                  setSelectedRecommendation(null);
                }}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSplitConfirm}
                disabled={selectedWorkersForSplit.length === 0}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  selectedWorkersForSplit.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                确认拆分 ({selectedWorkersForSplit.length})
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
              <button
                onClick={() => setShowConfigPanel(false)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DispatchConfigPanel
                onSave={(config) => {
                  console.log('配置已保存:', config);
                  // 这里可以添加配置保存逻辑
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 统计卡片组件
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <span className="text-white text-lg font-bold">{value}</span>
        </div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}

// 详情项组件
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

// 推荐理由项组件
function ReasonItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <div className="font-medium text-gray-900 text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
