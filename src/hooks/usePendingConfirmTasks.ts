/**
 * 待确认派工任务 Hook
 * 智能派工系统阶段六：派工确认页面数据管理
 * 获取所有待确认的任务，包括AI推荐、预测任务、优化建议等
 */

import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { useTempTasks } from './useTempTasks';
import { useProblemDispatch } from './useProblemDispatch';
import { useCropGrowthEngine, type PredictedTask } from './useCropGrowthEngine';
import { useAIOptimization, type AIOptimizationSuggestion } from './useAIOptimization';
import type { WorkerRecommendation, UnifiedDispatchTask, WorkerComprehensiveStatus } from './useComprehensiveDispatch';


// ============================================
// 类型定义
// ============================================

/** 待确认任务状态枚举 */
export type PendingConfirmStatus =
  | 'pending_ai'      // 待AI推荐
  | 'recommended'     // AI已推荐
  | 'predicted'       // 预测任务
  | 'optimization';   // 优化建议

/** 待确认派工任务扩展信息 */
export interface PendingConfirmTask extends UnifiedDispatchTask {
  /** 派工确认状态 */
  dispatchStatus: PendingConfirmStatus;
  /** 是否为预测任务 */
  isPredictedTask?: boolean;
  /** AI优化建议 */
  aiOptimizationSuggestion?: AIOptimizationSuggestion;
  /** AI推荐的执行人列表 */
  aiRecommendedWorkers?: WorkerRecommendation[];
  /** AI置信度评分 */
  aiConfidenceScore?: number;
  /** 当前执行人评分（用于优化对比） */
  currentWorkerScore?: number;
  /** 任务来源标签 */
  sourceLabel?: string;
}

/** 待确认任务统计信息 */
export interface PendingConfirmStats {
  total: number;
  pendingAI: number;
  recommended: number;
  predicted: number;
  optimization: number;
}

// ============================================
// 辅助函数
// ============================================

/** 任务来源转标签 */
function getSourceLabel(source: UnifiedDispatchTask['source']): string {
  switch (source) {
    case 'farm':
      return '农事任务';
    case 'tempTask':
      return '临时任务';
    case 'inspection':
      return '巡查问题';
    default:
      return '未知';
  }
}

/** 标准化农事任务 */
function normalizeFarmTask(task: ReturnType<typeof useTasks>['tasks'][0]): UnifiedDispatchTask {
  return {
    id: `farm-${task.id}`,
    source: 'farm',
    sourceId: task.id,
    taskCode: task.taskCode,
    title: task.title,
    type: task.type,
    typeName: task.typeName,
    priority: task.priority,
    workZone: task.greenhouseName || '',
    greenhouse: task.greenhouseName || '',
    cropName: task.cropName || '',
    batchId: task.batchId,
    batchCode: task.batchCode,
    requiredSkills: [],
    estimatedHours: task.estimatedHours || 2,
    dueDate: task.dueDate || '',
    description: task.description,
    createdAt: task.createdAt || new Date().toISOString(),
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
  };
}

/** 标准化临时任务 */
function normalizeTempTask(task: ReturnType<typeof useTempTasks>['tempTasks'][0]): UnifiedDispatchTask {
  return {
    id: `tempTask-${task.id}`,
    source: 'tempTask',
    sourceId: task.id,
    taskCode: task.taskCode,
    title: task.title,
    type: task.tempTaskType || 'default',
    typeName: task.tempTaskType || '临时任务',
    priority: task.priority,
    workZone: task.workLocation || '',
    greenhouse: task.workLocation || '',
    cropName: '',
    requiredSkills: [],
    estimatedHours: task.estimatedHours || 2,
    dueDate: task.dueDate || '',
    description: task.description,
    createdAt: task.createdAt || new Date().toISOString(),
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
  };
}

/**
 * 获取任务对应的派工状态
 * 逻辑：
 * 1. 如果任务有关联的执行人且有待优化的AI建议 → optimization
 * 2. 如果任务有AI推荐 → recommended
 * 3. 如果任务是预测任务 → predicted
 * 4. 其他 → pending_ai
 */
function getDispatchStatus(
  task: UnifiedDispatchTask,
  hasAIRecommendation: boolean,
  isPredicted: boolean,
  hasOptimization: boolean
): PendingConfirmStatus {
  if (hasOptimization) return 'optimization';
  if (hasAIRecommendation) return 'recommended';
  if (isPredicted) return 'predicted';
  return 'pending_ai';
}

// ============================================
// Hook 定义
// ============================================

/**
 * 待确认派工任务 Hook
 * @param getRecommendations 获取AI推荐的函数
 */
export function usePendingConfirmTasks(
  getRecommendations?: (task: UnifiedDispatchTask, topN?: number) => WorkerRecommendation[]
) {
  // 获取各模块数据
  const { tasks: farmTasks } = useTasks();
  const { tempTasks } = useTempTasks();
  const { pendingProblems } = useProblemDispatch();
  const { predictedTasks } = useCropGrowthEngine();
  const { suggestion: optimizationSuggestion } = useAIOptimization();

  // 构建待确认任务列表
  const pendingTasks = useMemo<PendingConfirmTask[]>(() => {
    const tasks: PendingConfirmTask[] = [];

    // 1. 农事任务 - 待派发状态（pending）
    farmTasks
      .filter(t => t.status === 'pending')
      .forEach(task => {
        const normalizedTask = normalizeFarmTask(task);
        const hasAIRecommendation = !!getRecommendations;
        const aiRecommendedWorkers = getRecommendations
          ? getRecommendations(normalizedTask, 3)
          : undefined;
        const aiConfidenceScore = aiRecommendedWorkers?.[0]?.matchScore;

        tasks.push({
          ...normalizedTask,
          dispatchStatus: getDispatchStatus(normalizedTask, hasAIRecommendation, false, false),
          isPredictedTask: false,
          aiRecommendedWorkers,
          aiConfidenceScore,
          sourceLabel: getSourceLabel('farm'),
        });
      });

    // 2. 临时任务 - 待处理状态（pending）
    tempTasks
      .filter(t => t.status === 'pending')
      .forEach(task => {
        const normalizedTask = normalizeTempTask(task);
        const hasAIRecommendation = !!getRecommendations;
        const aiRecommendedWorkers = getRecommendations
          ? getRecommendations(normalizedTask, 3)
          : undefined;
        const aiConfidenceScore = aiRecommendedWorkers?.[0]?.matchScore;

        tasks.push({
          ...normalizedTask,
          dispatchStatus: getDispatchStatus(normalizedTask, hasAIRecommendation, false, false),
          isPredictedTask: false,
          aiRecommendedWorkers,
          aiConfidenceScore,
          sourceLabel: getSourceLabel('tempTask'),
        });
      });

    // 3. 巡查问题 - 待处理问题
    pendingProblems.forEach(problem => {
      const issueText = problem.issueText || problem.description || problem.title || '';
      const normalizedTask: UnifiedDispatchTask = {
        id: `inspection-${problem.id}`,
        source: 'inspection',
        sourceId: problem.id.toString(),
        taskCode: `PD-${problem.id}`,
        title: `【问题处理】${issueText.slice(0, 30)}`,
        type: 'scouting',
        typeName: '问题处理',
        priority: problem.issueSeverity === '严重' ? 'urgent' :
                  problem.issueSeverity === '中等' ? 'high' : 'normal',
        workZone: problem.greenhouseName || '',
        greenhouse: problem.greenhouseName || '',
        cropName: problem.cropName || '',
        batchId: problem.batchId,
        batchCode: problem.batchCode,
        requiredSkills: [],
        estimatedHours: 2,
        dueDate: '',
        description: issueText,
        createdAt: new Date().toISOString(),
      };

      const hasAIRecommendation = !!getRecommendations;
      const aiRecommendedWorkers = getRecommendations
        ? getRecommendations(normalizedTask, 3)
        : undefined;
      const aiConfidenceScore = aiRecommendedWorkers?.[0]?.matchScore;

      tasks.push({
        ...normalizedTask,
        dispatchStatus: getDispatchStatus(normalizedTask, hasAIRecommendation, false, false),
        isPredictedTask: false,
        aiRecommendedWorkers,
        aiConfidenceScore,
        sourceLabel: getSourceLabel('inspection'),
      });
    });

    // 4. 预测任务
    if (predictedTasks && predictedTasks.length > 0) {
      predictedTasks.forEach((predicted: PredictedTask) => {
        const predictedTask: UnifiedDispatchTask = {
          id: `predicted-${predicted.id}`,
          source: 'farm',
          sourceId: predicted.id,
          taskCode: predicted.taskCode || `PRED-${predicted.id}`,
          title: predicted.taskName,
          type: predicted.taskType || 'default',
          typeName: predicted.taskTypeName || '预测任务',
          priority: predicted.priority || 'normal',
          workZone: predicted.workZone || '',
          greenhouse: predicted.workZone || '',
          cropName: predicted.cropName || '',
          batchId: predicted.batchId,
          batchCode: predicted.batchCode,
          requiredSkills: [],
          estimatedHours: predicted.estimatedHours || 2,
          dueDate: predicted.plannedDate || '',
          description: predicted.description || '',
          createdAt: new Date().toISOString(),
          assigneeId: undefined,
          assigneeName: undefined,
        };

        const hasAIRecommendation = !!getRecommendations;
        const aiRecommendedWorkers = getRecommendations
          ? getRecommendations(predictedTask, 3)
          : undefined;
        const aiConfidenceScore = aiRecommendedWorkers?.[0]?.matchScore;

        tasks.push({
          ...predictedTask,
          dispatchStatus: 'predicted',
          isPredictedTask: true,
          aiRecommendedWorkers,
          aiConfidenceScore,
          sourceLabel: '预测任务',
        });
      });
    }

    // 5. 如果有优化建议，将对应任务标记为优化
    if (optimizationSuggestion) {
      const taskIndex = tasks.findIndex(t => t.id === optimizationSuggestion.taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          dispatchStatus: 'optimization',
          aiOptimizationSuggestion: optimizationSuggestion,
        };
      }
    }

    return tasks;
  }, [farmTasks, tempTasks, pendingProblems, predictedTasks, optimizationSuggestion, getRecommendations]);

  // 按状态分类统计
  const stats = useMemo<PendingConfirmStats>(() => ({
    total: pendingTasks.length,
    pendingAI: pendingTasks.filter(t => t.dispatchStatus === 'pending_ai').length,
    recommended: pendingTasks.filter(t => t.dispatchStatus === 'recommended').length,
    predicted: pendingTasks.filter(t => t.dispatchStatus === 'predicted').length,
    optimization: pendingTasks.filter(t => t.dispatchStatus === 'optimization').length,
  }), [pendingTasks]);

  // 获取指定状态的任务
  const getTasksByStatus = (status: PendingConfirmStatus) => {
    return pendingTasks.filter(t => t.dispatchStatus === status);
  };

  return {
    // 所有待确认任务
    pendingTasks,
    // 统计信息
    stats,
    // 按状态获取任务
    getTasksByStatus,
    // AI推荐待确认任务
    recommendedTasks: pendingTasks.filter(t => t.dispatchStatus === 'recommended'),
    // 待AI推荐任务
    pendingAITasks: pendingTasks.filter(t => t.dispatchStatus === 'pending_ai'),
    // 预测任务
    predictedTasks: pendingTasks.filter(t => t.dispatchStatus === 'predicted'),
    // 优化建议任务
    optimizationTasks: pendingTasks.filter(t => t.dispatchStatus === 'optimization'),
  };
}

// 导出类型
export type {
  PendingConfirmTask,
  PendingConfirmStatus,
  PendingConfirmStats,
};
