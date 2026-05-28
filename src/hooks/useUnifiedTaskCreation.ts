/**
 * 统一任务创建 Hook - 智能派工系统阶段五
 * 整合农事任务、临时任务、巡查反馈三种任务创建入口
 * 提供统一的派发状态管理和AI推荐能力
 */

import { useState, useCallback } from 'react';
import { useTasks } from './useTasks';
import { useTempTasks } from './useTempTasks';
import { useProblemDispatch } from './useProblemDispatch';
import { useComprehensiveDispatch, type UnifiedDispatchTask } from './useComprehensiveDispatch';
import type { DispatchMode, DispatchModeConfig } from '../types/dispatch';
import { DEFAULT_DISPATCH_MODE_CONFIG } from '../types/dispatch';
import type { Task, TaskStatus } from '../types/task';
import type { TempTask } from './useTempTasks';

// ============================================
// 派发状态类型
// ============================================
type UnifiedDispatchStatus = 'draft' | 'pending_ai' | 'recommended' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

/**
 * 输入优先级类型（支持4级）
 */
type InputPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * 转换为Task优先级（3级）
 */
function toTaskPriority(p: InputPriority): 'urgent' | 'high' | 'normal' {
  if (p === 'urgent' || p === 'high') return p;
  return 'normal';
}

/**
 * 转换为TempTask优先级（3级）
 */
function toTempTaskPriority(p: InputPriority): 'urgent' | 'high' | 'normal' {
  if (p === 'urgent' || p === 'high') return p;
  return 'normal';
}

// ============================================
// 统一任务创建输入接口
// ============================================
export interface UnifiedTaskInput {
  // 通用字段
  taskName: string;
  taskType: string;
  greenhouseName: string;
  scheduledDate: string;
  estimatedHours: number;
  priority: InputPriority;

  // 来源标识
  sourceType: 'farm' | 'temp' | 'problem';
  sourceId?: string;

  // 派发相关
  dispatchMode: DispatchMode;
  assignedTo?: string;
  assignedToName?: string;
  useAIRecommendation: boolean;
  aiRecommendedWorkerId?: string;
  aiConfidenceScore?: number;

  // 规划相关
  planningHorizon: 'daily' | 'weekly' | 'monthly';
  planningDate?: string;
  isAutoPlanned?: boolean;

  // 农事任务特有
  batchId?: string;
  batchCode?: string;
  operationType?: string;
  requiredSkills?: string[];

  // 临时任务特有
  isEmergency?: boolean;
  description?: string;
  workLocation?: string;

  // 巡查反馈特有
  problemId?: number;
  requireFeedback?: boolean;
  deadline?: string;

  // 执行人信息
  assignerId?: string;
  assignerName?: string;
}

// ============================================
// 工人匹配分数（用于AI推荐结果）
// ============================================
export interface WorkerMatchScore {
  workerId: string;
  workerName: string;
  workerType: string;
  workZone: string;
  skills: string[];
  currentLoad: number;
  matchScore: number;
  skillMatchRate: number;
  locationScore: number;
  loadScore: number;
  performanceScore: number;
  confidenceScore: number;
  reasons: string[];
  isAvailable: boolean;
}

// ============================================
// 优化建议
// ============================================
export interface OptimizationSuggestion {
  type: 'skill_mismatch' | 'load_high' | 'distance_far' | 'performance_low';
  message: string;
  suggestedWorkerId?: string;
  suggestedWorkerName?: string;
  scoreImprovement?: number;
}

// ============================================
// Hook 返回接口
// ============================================
export interface UnifiedTaskCreationReturn {
  // 创建任务
  createTask: (input: UnifiedTaskInput) => Promise<UnifiedDispatchTask | TempTask | Task | null>;

  // 获取AI推荐
  getAIRecommendation: (taskInfo: Partial<UnifiedTaskInput>) => Promise<WorkerMatchScore[]>;

  // 模式配置
  modeConfig: DispatchModeConfig;
  currentMode: DispatchMode;
  switchMode: (mode: DispatchMode) => void;

  // 状态查询
  dispatchStatus: UnifiedDispatchStatus;
  getDispatchStatus: (input: UnifiedTaskInput) => UnifiedDispatchStatus;

  // 优化建议检查
  checkOptimization: (
    task: UnifiedDispatchTask | TempTask | Task,
    assignedWorkerId: string,
    assignedWorkerName: string
  ) => Promise<OptimizationSuggestion | null>;

  // 显示优化建议弹窗回调
  onShowOptimizationModal?: (task: UnifiedDispatchTask | TempTask | Task, suggestion: OptimizationSuggestion) => void;
  setShowOptimizationModal: (callback: (task: UnifiedDispatchTask | TempTask | Task, suggestion: OptimizationSuggestion) => void) => void;
}

// ============================================
// 优化检查因素
// ============================================
interface OptimizationFactors {
  workerLoad: number;
  workerPerformance: number;
  skillMatchRate: number;
  distance: number;
  batchFamiliarity?: number;
}

// ============================================
// 计算派发状态
// ============================================
function calculateDispatchStatus(input: UnifiedTaskInput): UnifiedDispatchStatus {
  // AI辅助模式且未指定执行人 → 待AI推荐
  if (input.dispatchMode === 'ai_assisted' && !input.assignedTo) {
    return 'pending_ai';
  }

  // AI自动模式 → AI已推荐
  if (input.dispatchMode === 'ai_auto') {
    return 'recommended';
  }

  // 手动模式且已指定执行人 → 已派发
  if (input.dispatchMode === 'manual' && input.assignedTo) {
    return 'pending';
  }

  // 默认 → 草稿
  return 'draft';
}

// ============================================
// 辅助函数：生成任务编号
// ============================================
function generateTaskCode(prefix: string, existingTasks: Task[]): string {
  const date = new Date();
  const datePrefix = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');

  // 查找当天的最大流水号
  let maxSequence = 0;
  existingTasks.forEach(t => {
    const taskCode = t.taskCode || t.id;
    if (taskCode && taskCode.startsWith(`${prefix}${datePrefix}-`)) {
      const seqStr = taskCode.slice(-3);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  const nextSequence = maxSequence + 1;
  return `${prefix}${datePrefix}-${String(nextSequence).padStart(3, '0')}`;
}

// ============================================
// 检查优化建议
// ============================================
async function checkTaskOptimization(
  task: UnifiedDispatchTask | TempTask | Task,
  factors: OptimizationFactors
): Promise<OptimizationSuggestion | null> {
  const { workerLoad, workerPerformance, skillMatchRate, distance } = factors;

  // 检查技能匹配度
  if (skillMatchRate < 60) {
    return {
      type: 'skill_mismatch',
      message: `技能匹配度仅${skillMatchRate}%，可能影响任务质量`,
      scoreImprovement: 100 - skillMatchRate,
    };
  }

  // 检查负荷
  if (workerLoad > 80) {
    return {
      type: 'load_high',
      message: `执行人当前负荷${workerLoad}%，可能无法及时完成任务`,
      scoreImprovement: 100 - workerLoad,
    };
  }

  // 检查距离
  if (distance > 5) {
    return {
      type: 'distance_far',
      message: `执行人距离任务地点${distance}km，往返耗时较长`,
      scoreImprovement: 100 - (distance * 10),
    };
  }

  // 检查历史表现
  if (workerPerformance < 70) {
    return {
      type: 'performance_low',
      message: `执行人近期表现评分${workerPerformance}分，建议选择更高评分的人员`,
      scoreImprovement: workerPerformance,
    };
  }

  return null;
}

// ============================================
// 主 Hook
// ============================================
export function useUnifiedTaskCreation(): UnifiedTaskCreationReturn {
  // 任务Hooks
  const { tasks: farmTasks, createTask: createFarmTask } = useTasks();
  const { addTempTask } = useTempTasks();
  const { dispatchProblem } = useProblemDispatch();

  // 综合派工Hook（用于AI推荐）
  const { getRecommendations, workers } = useComprehensiveDispatch();

  // 当前模式状态
  const [currentMode, setCurrentMode] = useState<DispatchMode>('ai_assisted');
  const [modeConfig] = useState<DispatchModeConfig>(DEFAULT_DISPATCH_MODE_CONFIG);

  // 优化建议弹窗回调
  const [optimizationModalCallback, setOptimizationModalCallback] = useState<
    ((task: UnifiedDispatchTask | TempTask | Task, suggestion: OptimizationSuggestion) => void) | null
  >(null);

  // 切换模式
  const switchMode = useCallback((mode: DispatchMode) => {
    setCurrentMode(mode);
  }, []);

  // 获取派发状态
  const getDispatchStatus = useCallback((input: UnifiedTaskInput): UnifiedDispatchStatus => {
    return calculateDispatchStatus(input);
  }, []);

  // 当前派发状态（初始为draft）
  const dispatchStatus: UnifiedDispatchStatus = 'draft';

  // 创建农事任务
  const createFarmDispatchTask = useCallback(async (input: UnifiedTaskInput): Promise<Task | null> => {
    const taskCode = generateTaskCode('NS', farmTasks);

    // 确定任务状态
    let taskStatus: TaskStatus = 'pending';
    if (input.dispatchMode === 'ai_assisted' && !input.assignedTo) {
      taskStatus = 'pending'; // AI辅助未指定执行人时保持pending
    } else if (input.dispatchMode === 'ai_auto') {
      taskStatus = 'pending'; // AI自动模式也是pending，等待执行
    }

    const newTask: Partial<Task> = {
      id: taskCode,
      taskCode: taskCode,
      title: input.taskName,
      type: input.taskType,
      typeName: input.operationType || input.taskType,
      status: taskStatus,
      priority: toTaskPriority(input.priority),
      progress: 0,
      sourceType: 'dispatch',
      dispatchMode: 'farm', // 农事任务使用'farm'模式
      assigneeId: input.assignedTo || '',
      assigneeName: input.assignedToName || '',
      assignerId: input.assignerId || 'U001',
      assignerName: input.assignerName || '系统管理员',
      dueDate: input.scheduledDate,
      estimatedHours: input.estimatedHours,
      greenhouseName: input.greenhouseName,
      batchId: input.batchId,
      batchCode: input.batchCode,
      description: input.description,
      feedbackRequirements: [],
      reworkCount: 0,
      reworkHistory: [],
      deadlineExtensions: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 使用useTasks的createTask方法
    const created = createFarmTask(newTask);

    return created;
  }, [farmTasks, createFarmTask]);

  // 创建临时任务
  const createTempDispatchTask = useCallback(async (input: UnifiedTaskInput): Promise<TempTask | null> => {
    const taskCode = generateTaskCode('TT', farmTasks);

    const newTempTask: Omit<TempTask, 'id' | 'createdAt' | 'updatedAt'> & { taskCode: string } = {
      taskCode,  // 传递生成的任务编号
      title: input.taskName,
      type: input.taskType,
      typeName: input.operationType || input.taskType || '临时任务',
      urgency: toTempTaskPriority(input.priority),
      priority: toTempTaskPriority(input.priority),
      status: 'pending',
      location: input.workLocation || input.greenhouseName,
      greenhouseName: input.greenhouseName,
      assigneeId: input.assignedTo || '',
      assigneeName: input.assignedToName || '',
      assignerId: input.assignerId || 'U001',
      assignerName: input.assignerName || '系统管理员',
      estimatedHours: input.estimatedHours,
      description: input.description,
      dueDate: input.scheduledDate,
      rejectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = addTempTask(newTempTask);
    return created;
  }, [farmTasks, addTempTask]);

  // 创建巡查反馈任务
  const createProblemDispatchTask = useCallback(async (input: UnifiedTaskInput): Promise<Task | null> => {
    if (!input.problemId) {
      console.error('创建巡查反馈任务失败：缺少problemId');
      return null;
    }

    // 转换优先级
    const problemPriority: 'high' | 'medium' | 'low' =
      input.priority === 'urgent' ? 'high' :
      input.priority === 'high' ? 'medium' : 'low';

    // 使用useProblemDispatch的dispatchProblem方法
    const created = dispatchProblem(
      input.problemId,
      input.assignedTo || 'U001',
      input.assignedToName || '未指定',
      input.assignerId || 'U001',
      input.assignerName || '系统管理员',
      input.deadline,
      input.requireFeedback ? ['gps', 'photo_before', 'photo_after'] : undefined,
      problemPriority
    );

    return created;
  }, [dispatchProblem]);

  // 统一创建任务入口
  const createTask = useCallback(async (input: UnifiedTaskInput): Promise<UnifiedDispatchTask | TempTask | Task | null> => {
    // 1. 根据sourceType调用对应的创建方法
    let createdTask: UnifiedDispatchTask | TempTask | Task | null = null;

    switch (input.sourceType) {
      case 'farm':
        createdTask = await createFarmDispatchTask(input);
        break;
      case 'temp':
        createdTask = await createTempDispatchTask(input);
        break;
      case 'problem':
        createdTask = await createProblemDispatchTask(input);
        break;
      default:
        console.error('未知的任务来源类型:', input.sourceType);
        return null;
    }

    if (!createdTask) {
      return null;
    }

    // 2. 纯人工模式下，检查优化建议
    if (input.dispatchMode === 'manual' && input.assignedTo && optimizationModalCallback) {
      const factors: OptimizationFactors = {
        workerLoad: 50, // 默认值，后续可从workers获取真实数据
        workerPerformance: 85, // 默认值
        skillMatchRate: 75, // 默认值
        distance: 2, // 默认值
      };

      // 尝试获取执行人的真实数据
      const worker = workers.find(w => w.id === input.assignedTo);
      if (worker) {
        factors.workerLoad = worker.currentLoad;
        factors.workerPerformance = worker.recentPerformance;
        factors.distance = worker.distance[input.greenhouseName] || 5;
      }

      const suggestion = await checkTaskOptimization(createdTask, factors);
      if (suggestion) {
        // 延迟调用，让任务先创建完成
        setTimeout(() => {
          optimizationModalCallback?.(createdTask!, suggestion);
        }, 100);
      }
    }

    return createdTask;
  }, [
    createFarmDispatchTask,
    createTempDispatchTask,
    createProblemDispatchTask,
    workers,
    optimizationModalCallback
  ]);

  // 获取AI推荐
  const getAIRecommendation = useCallback(async (taskInfo: Partial<UnifiedTaskInput>): Promise<WorkerMatchScore[]> => {
    // 构建统一任务格式
    const unifiedTask: UnifiedDispatchTask = {
      id: 'temp-' + Date.now(),
      source: taskInfo.sourceType === 'temp' ? 'tempTask' : taskInfo.sourceType === 'problem' ? 'inspection' : 'farm',
      sourceId: taskInfo.sourceId || '',
      taskCode: '',
      title: taskInfo.taskName || '',
      type: taskInfo.taskType || 'default',
      typeName: taskInfo.operationType || taskInfo.taskType || '任务',
      priority: (taskInfo.priority === 'low' || taskInfo.priority === 'medium') ? 'normal' : (taskInfo.priority as 'urgent' | 'high' | 'normal') || 'normal',
      workZone: taskInfo.greenhouseName || '',
      greenhouse: taskInfo.greenhouseName || '',
      cropName: '',
      batchId: taskInfo.batchId,
      batchCode: taskInfo.batchCode,
      requiredSkills: taskInfo.requiredSkills || [],
      estimatedHours: taskInfo.estimatedHours || 2,
      dueDate: taskInfo.scheduledDate || '',
      description: taskInfo.description,
      createdAt: new Date().toISOString(),
    };

    // 调用综合派工Hook的推荐算法
    const recommendations = getRecommendations(unifiedTask, 5);

    // 转换为WorkerMatchScore格式
    const matchScores: WorkerMatchScore[] = recommendations.map(rec => ({
      workerId: rec.worker.id,
      workerName: rec.worker.name,
      workerType: rec.worker.workerType,
      workZone: rec.worker.workZone,
      skills: rec.worker.skills,
      currentLoad: rec.worker.currentLoad,
      matchScore: rec.matchScore,
      skillMatchRate: rec.skillMatchRate,
      locationScore: rec.locationScore,
      loadScore: rec.loadScore,
      performanceScore: rec.performanceScore,
      confidenceScore: rec.confidenceScore,
      reasons: rec.reasons,
      isAvailable: rec.isAvailable,
    }));

    return matchScores;
  }, [getRecommendations]);

  // 检查优化建议
  const checkOptimization = useCallback(async (
    task: UnifiedDispatchTask | TempTask | Task,
    assignedWorkerId: string,
    _assignedWorkerName: string
  ): Promise<OptimizationSuggestion | null> => {
    // 获取执行人信息
    const worker = workers.find(w => w.id === assignedWorkerId);
    if (!worker) {
      return null;
    }

    // 获取温室名称（从不同类型的任务中提取）
    const greenhouseName = 'greenhouse' in task ? task.greenhouse :
      ('greenhouseName' in task ? task.greenhouseName : '');

    const factors: OptimizationFactors = {
      workerLoad: worker.currentLoad,
      workerPerformance: worker.recentPerformance,
      skillMatchRate: 75, // 默认值，可根据任务类型计算
      distance: worker.distance[greenhouseName] || 5,
    };

    return checkTaskOptimization(task, factors);
  }, [workers]);

  // 设置优化建议弹窗回调
  const setShowOptimizationModal = useCallback((
    callback: (task: UnifiedDispatchTask | TempTask | Task, suggestion: OptimizationSuggestion) => void
  ) => {
    setOptimizationModalCallback(() => callback);
  }, []);

  return {
    createTask,
    getAIRecommendation,
    modeConfig,
    currentMode,
    switchMode,
    dispatchStatus,
    getDispatchStatus,
    checkOptimization,
    onShowOptimizationModal: optimizationModalCallback || undefined,
    setShowOptimizationModal,
  };
}

// 导出类型
export type { UnifiedDispatchStatus };
