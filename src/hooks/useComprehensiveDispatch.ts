/**
 * 综合智能派工引擎 Hook
 * 整合农事任务、临时任务、巡查问题三个数据源的待派发任务
 * 基于多因子AI评分算法生成派工建议
 */

import { useMemo, useCallback } from 'react';
import { useTasks } from './useTasks';
import { useTempTasks } from './useTempTasks';
import { useProblemDispatch } from './useProblemDispatch';
import { usePersistentAttendance } from './usePersistentAttendance';
import { useEnvironmentData } from './useEnvironmentData';
import { useWorkerStore } from '../stores/useWorkerStore';
import type { Task, TempTask } from './useTasks';
import type { AttendanceEntry } from './usePersistentAttendance';
import type { DispatchConfig, ConfidenceLevel, SuggestedAction, EnhancedRecommendation } from '../types/dispatch';
import { DEFAULT_DISPATCH_CONFIG } from '../types/dispatch';
import type { WeatherImpact } from '../types/environment';

// ============================================
// 类型定义
// ============================================

/** 任务来源类型 */
export type DispatchTaskSource = 'farm' | 'tempTask' | 'inspection';

/** 统一派发任务结构 */
export interface UnifiedDispatchTask {
  id: string;
  source: DispatchTaskSource;        // 任务来源
  sourceId: string;                 // 原始任务ID
  taskCode: string;                 // 任务编号
  title: string;                   // 任务标题
  type: string;                    // 任务类型
  typeName: string;                // 类型名称
  priority: 'urgent' | 'high' | 'normal' | 'low';
  workZone: string;                // 工作区域
  greenhouse: string;               // 温室/大棚
  cropName: string;                // 作物名称
  batchId?: string;                // 关联批次ID
  batchCode?: string;              // 关联批次编号
  requiredSkills: string[];         // 所需技能标签
  estimatedHours: number;           // 预计工时
  dueDate: string;                 // 截止日期
  description?: string;             // 任务描述
  createdAt: string;                // 创建时间
  assigneeId?: string;             // 已分配的执行人ID
  assigneeName?: string;           // 已分配的執行人姓名
}

/** 员工综合状态 */
export interface WorkerComprehensiveStatus {
  id: string;
  name: string;
  workerType: string;              // 员工类型：正式工、季节工、临时工
  workZone: string;               // 当前工作区域
  skills: string[];               // 持有技能标签
  currentLoad: number;             // 当前负荷 0-100%
  availableHoursToday: number;     // 今日剩余可用工时
  recentPerformance: number;        // 近30天表现评分 0-100
  distance: Record<string, number>; // 到各区域的距离(km)
  batchFamiliarity: Record<string, number>; // 对各批次的熟悉度 0-100
  attendanceStatus: 'working' | 'off' | 'on_break';
}

/** 全维度因素详情 */
export interface FactorsDetail {
  production: string[];   // 生产因素说明：批次信息、作物名称、生长阶段、种植面积、超期天数等
  environment: string[];  // 环境因素说明：天气影响、传感器告警等
  worker: string[];       // 人员因素说明：推荐理由、可用性状态等
}

/** 推荐结果 */
export interface WorkerRecommendation {
  worker: WorkerComprehensiveStatus;
  matchScore: number;              // 综合匹配分数 0-100
  skillMatchRate: number;         // 技能匹配度 0-100%
  locationScore: number;           // 地理位置得分 0-100
  loadScore: number;               // 负荷得分 0-100
  performanceScore: number;         // 历史表现得分 0-100
  urgencyScore: number;            // 紧急程度得分 0-100
  batchFamiliarityScore: number;    // 批次熟悉度得分 0-100
  reasons: string[];                // 推荐理由
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  suggestedAction: SuggestedAction;
  reasonsDetail: {
    positive: string[];
    warning: string[];
  };
  riskWarnings: string[];
  isAvailable: boolean;
  // 天气影响
  weatherImpact?: WeatherImpact;
  weatherScore: number;            // 天气影响得分 0-100
  // 全维度因素详情
  factorsDetail: FactorsDetail;
  /** 排班联动：员工当日排班状态 */
  scheduleStatus?: 'on_duty' | 'off_duty' | 'no_schedule';
  /** 排班联动：员工当日已派任务数 */
  assignedTaskCount?: number;
}

/** 批量派发建议 */
export interface BatchDispatchSuggestion {
  zone: string;              // 区域名称
  tasks: UnifiedDispatchTask[];  // 该区域的任务列表
  suggestedWorkers: WorkerRecommendation[];  // 建议的执行人
  totalHours: number;       // 总工时
  routeOptimization: string; // 路径优化建议
}

// ============================================
// 派工权重配置（7因子）
// ============================================

// 默认使用标准权重配置
const DISPATCH_WEIGHTS = DEFAULT_DISPATCH_CONFIG.weights;

// ============================================
// 技能标签映射（任务类型 -> 所需技能）
// ============================================

const TASK_TYPE_SKILLS: Record<string, string[]> = {
  irrigation: ['微喷灌溉', '滴灌操作', '水肥一体化'],
  fertilization: ['施肥操作', '水肥一体化', '肥料配制'],
  spraying: ['农药配制', '喷雾操作', '生物防治'],
  pruning: ['整枝修剪', '嫁接操作', '疏花疏果'],
  harvest: ['果蔬采收', '分级包装', '冷链处理'],
  scouting: ['病害识别', '巡田检查', '环境监测'],
  weeding: ['除草作业', '土壤处理'],
  planting: ['定植操作', '播种技术', '炼苗技术'],
  default: ['种植作业', '田间管理'],
};

// ============================================
// 辅助函数
// ============================================

/** 获取动态权重配置 */
function getDynamicWeights(
  task: UnifiedDispatchTask,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG
): typeof DISPATCH_WEIGHTS {
  const weights = { ...config.weights };

  // 紧急任务 → 表现权重提升，负荷权重降低
  if (task.priority === 'urgent') {
    weights.historicalPerformance = config.dynamicAdjustments.urgentTask.performance || 0.25;
    weights.currentLoad = config.dynamicAdjustments.urgentTask.load || 0.15;
  }

  // 大面积任务（预计工时>8小时）→ 技能权重提升，负荷权重降低
  if (task.estimatedHours > 8) {
    weights.skillMatch = config.dynamicAdjustments.largeArea.skillMatch || 0.45;
    weights.currentLoad = config.dynamicAdjustments.largeArea.load || 0.15;
  }

  // 病虫害任务 → 技能权重大幅提升
  if (task.type === 'spraying' || task.type === 'pest_control') {
    weights.skillMatch = config.dynamicAdjustments.pestControl.skillMatch || 0.50;
    weights.currentLoad = config.dynamicAdjustments.pestControl.load || 0.15;
  }

  return weights;
}

/** 计算技能匹配度 */
function calculateSkillMatch(workerSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;
  const matched = requiredSkills.filter(skill =>
    workerSkills.some(ws => ws.includes(skill) || skill.includes(ws))
  );
  return Math.round((matched.length / requiredSkills.length) * 100);
}

/** 计算地理位置得分（距离越近分数越高） */
function calculateLocationScore(distance: number): number {
  if (distance <= 1) return 100;
  if (distance <= 2) return 85;
  if (distance <= 3) return 70;
  if (distance <= 5) return 55;
  return 40;
}

/** 计算负荷得分（负荷越低分数越高） */
function calculateLoadScore(load: number): number {
  return Math.round(100 - load);
}

/** 计算历史表现得分 */
function calculatePerformanceScore(performance: number): number {
  return performance;
}

/** 计算紧急程度得分 */
function calculateUrgencyScore(priority: UnifiedDispatchTask['priority']): number {
  switch (priority) {
    case 'urgent': return 100;
    case 'high': return 80;
    case 'normal': return 60;
    case 'low': return 40;
    default: return 50;
  }
}

/** 计算批次熟悉度 */
function calculateBatchFamiliarity(
  worker: WorkerComprehensiveStatus,
  batchId?: string
): number {
  if (!batchId) return 50;
  return worker.batchFamiliarity[batchId] || 50;
}

/** 计算置信度等级和分数 */
function calculateConfidence(
  score: number,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG
): { level: ConfidenceLevel; score: number } {
  if (score >= config.thresholds.confidenceHigh) {
    return { level: 'high', score };
  }
  if (score >= config.thresholds.confidenceMedium) {
    return { level: 'medium', score };
  }
  return { level: 'low', score };
}

/** 生成推荐理由（增强版：正面+警告） */
function generateEnhancedReasons(
  task: UnifiedDispatchTask,
  worker: WorkerComprehensiveStatus,
  scores: {
    skillMatchRate: number;
    locationScore: number;
    loadScore: number;
    distance: number;
  }
): { positive: string[]; warning: string[] } {
  const positive: string[] = [];
  const warning: string[] = [];

  // 技能匹配
  if (scores.skillMatchRate >= 80) {
    positive.push(`技能匹配${scores.skillMatchRate}%（${task.requiredSkills.slice(0, 2).join('、')}）`);
  } else if (scores.skillMatchRate < 60) {
    warning.push(`技能匹配仅${scores.skillMatchRate}%，可能影响质量`);
  }

  // 地理位置
  if (scores.locationScore >= 85) {
    positive.push(`距离近（${scores.distance}km内）`);
  } else if (scores.locationScore < 60) {
    warning.push(`距离较远（${scores.distance}km）`);
  }

  // 负荷状态
  if (worker.currentLoad < 30) {
    positive.push('当前空闲');
  } else if (worker.currentLoad > 70) {
    warning.push(`当前负荷较高（${worker.currentLoad}%）`);
  }

  // 批次熟悉度
  if (task.batchId && worker.batchFamiliarity[task.batchId] > 70) {
    positive.push(`熟悉该批次（${worker.batchFamiliarity[task.batchId]}%）`);
  }

  // 历史表现
  if (worker.recentPerformance >= 90) {
    positive.push(`近期表现优秀（${worker.recentPerformance}分）`);
  }

  return { positive, warning };
}

/** 生成风险警告 */
function generateRiskWarnings(
  task: UnifiedDispatchTask,
  worker: WorkerComprehensiveStatus,
  skillMatchRate: number
): string[] {
  const warnings: string[] = [];

  // 技能不匹配风险
  if (skillMatchRate < 60) {
    warnings.push('技能匹配度不足，可能影响任务质量');
  }

  // 负荷过高风险
  if (worker.currentLoad > 80) {
    warnings.push('员工当前负荷过高，可能无法及时完成');
  }

  // 位置偏远风险
  const distance = worker.distance[task.workZone] || 5;
  if (distance > 5) {
    warnings.push('距离较远，往返耗时较长');
  }

  // 超期任务风险
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      warnings.push('任务已超期，需尽快执行');
    }
  }

  return warnings;
}

/** 生成全维度因素详情 */
function generateFactorsDetail(
  task: UnifiedDispatchTask,
  worker: WorkerComprehensiveStatus,
  weatherImpact: WeatherImpact,
  skillMatchRate: number,
  distance: number,
  unacknowledgedAlerts: { id: string; message: string }[]
): FactorsDetail {
  // 生产因素
  const production: string[] = [];
  if (task.batchCode) {
    production.push(`关联批次：${task.batchCode}`);
  }
  if (task.cropName) {
    production.push(`作物名称：${task.cropName}`);
  }
  // 生长阶段（根据任务类型推断）
  if (task.type === 'harvest') {
    production.push('生长阶段：成熟期');
  } else if (task.type === 'pruning') {
    production.push('生长阶段：生长期');
  } else if (task.type === 'planting') {
    production.push('生长阶段：育苗期');
  }
  // 工作区域
  if (task.workZone) {
    production.push(`工作区域：${task.workZone}`);
  }
  // 超期天数计算
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      production.push(`已超期：${diffDays}天`);
    } else if (diffDays === 0) {
      production.push('截止日期：今天');
    } else {
      production.push(`剩余天数：${Math.abs(diffDays)}天`);
    }
  }
  // 预计工时
  production.push(`预计工时：${task.estimatedHours}小时`);

  // 环境因素
  const environment: string[] = [];
  // 天气影响
  if (weatherImpact.suitable) {
    environment.push(`天气适宜：${weatherImpact.reason}`);
  } else {
    environment.push(`天气影响：${weatherImpact.reason}`);
  }
  // 温度影响
  if (weatherImpact.temperature !== undefined) {
    environment.push(`温度：${weatherImpact.temperature}°C`);
  }
  // 传感器告警检测（检查与当前任务区域相关的告警）
  const relevantAlerts = unacknowledgedAlerts.filter(alert =>
    alert.message.includes(task.workZone || '') ||
    alert.message.includes(task.greenhouse || '')
  );
  if (relevantAlerts.length > 0) {
    environment.push(`传感器告警：${relevantAlerts.length}条相关告警`);
    relevantAlerts.slice(0, 2).forEach(alert => {
      environment.push(`  - ${alert.message.slice(0, 20)}...`);
    });
  } else {
    environment.push('传感器状态：无异常告警');
  }

  // 人员因素
  const workerFactors: string[] = [];
  // 推荐理由
  if (skillMatchRate >= 80) {
    workerFactors.push(`技能匹配度高（${skillMatchRate}%）`);
  } else if (skillMatchRate < 60) {
    workerFactors.push(`技能匹配不足（${skillMatchRate}%）`);
  }
  // 距离因素
  if (distance <= 2) {
    workerFactors.push(`地理位置优越（距${distance}km）`);
  } else if (distance > 5) {
    workerFactors.push(`距离较远（${distance}km）`);
  }
  // 可用性状态
  if (worker.attendanceStatus === 'working') {
    workerFactors.push('当前在岗');
  } else if (worker.attendanceStatus === 'off') {
    workerFactors.push('当前休息');
  } else if (worker.attendanceStatus === 'on_break') {
    workerFactors.push('当前休息中');
  }
  // 负荷状态
  if (worker.currentLoad < 30) {
    workerFactors.push(`负荷状态：空闲（${worker.currentLoad}%）`);
  } else if (worker.currentLoad > 70) {
    workerFactors.push(`负荷状态：繁忙（${worker.currentLoad}%）`);
  } else {
    workerFactors.push(`负荷状态：正常（${worker.currentLoad}%）`);
  }
  // 历史表现
  if (worker.recentPerformance >= 90) {
    workerFactors.push(`历史表现：优秀（${worker.recentPerformance}分）`);
  } else if (worker.recentPerformance >= 80) {
    workerFactors.push(`历史表现：良好（${worker.recentPerformance}分）`);
  } else {
    workerFactors.push(`历史表现：一般（${worker.recentPerformance}分）`);
  }
  // 批次熟悉度
  if (task.batchId && worker.batchFamiliarity[task.batchId]) {
    const familiarity = worker.batchFamiliarity[task.batchId];
    if (familiarity >= 80) {
      workerFactors.push(`批次熟悉度：高（${familiarity}%）`);
    } else if (familiarity >= 50) {
      workerFactors.push(`批次熟悉度：中（${familiarity}%）`);
    } else {
      workerFactors.push(`批次熟悉度：低（${familiarity}%）`);
    }
  }
  // 今日剩余可用工时
  workerFactors.push(`今日可用工时：${worker.availableHoursToday}小时`);

  return {
    production,
    environment,
    worker: workerFactors,
  };
}

/** 计算建议动作 */
function determineSuggestedAction(
  task: UnifiedDispatchTask,
  confidenceScore: number,
  riskWarnings: string[]
): SuggestedAction {
  // 置信度低 → 需人工决策
  if (confidenceScore < 40) {
    return 'manual';
  }

  // 置信度中等 → 建议人工确认
  if (confidenceScore < 60) {
    return 'manual';
  }

  // 大面积任务 → 建议拆分
  if (task.estimatedHours > 8) {
    return 'split';
  }

  // 有严重风险警告 → 需人工确认
  if (riskWarnings.some(w => w.includes('负荷过高') || w.includes('技能匹配不足'))) {
    return 'manual';
  }

  // 默认 → 可以直接派发
  return 'dispatch';
}

/** 生成推荐理由（旧版兼容） */
function generateReasons(
  task: UnifiedDispatchTask,
  worker: WorkerComprehensiveStatus,
  skillMatchRate: number,
  distance: number
): string[] {
  const reasons: string[] = [];
  if (skillMatchRate >= 80) {
    reasons.push(`技能匹配度${skillMatchRate}%`);
  }
  if (distance <= 2) {
    reasons.push(`距离近(${distance}km)`);
  }
  if (worker.currentLoad < 50) {
    reasons.push(`当前负荷低(${worker.currentLoad}%)`);
  }
  if (worker.recentPerformance >= 90) {
    reasons.push(`近期表现优秀(${worker.recentPerformance}分)`);
  }
  return reasons;
}

/** 生成路径优化建议 */
function generateRouteOptimization(tasks: UnifiedDispatchTask[]): string {
  if (tasks.length <= 1) {
    return '单任务直接执行';
  }

  // 按温室/大棚分组，生成最优路径建议
  const greenhouses = [...new Set(tasks.map(t => t.greenhouse).filter(Boolean))];

  if (greenhouses.length === 1) {
    return `同一区域${greenhouses[0]}，建议按优先级顺序执行`;
  }

  // 生成路径顺序建议
  const orderedZones = greenhouses.join(' → ');
  return `建议路径：${orderedZones}，可减少移动时间`;
}

/**
 * 获取批量派发建议
 * 分析任务池中同一区域的任务，如果有3个以上待派发任务，自动生成批量派发建议
 */
function getBatchDispatchSuggestions(
  taskPool: UnifiedDispatchTask[],
  workers: WorkerComprehensiveStatus[],
  getRecommendations: (task: UnifiedDispatchTask, topN?: number) => WorkerRecommendation[]
): BatchDispatchSuggestion[] {
  const suggestions: BatchDispatchSuggestion[] = [];

  // 按区域分组
  const tasksByZone = taskPool.reduce<Record<string, UnifiedDispatchTask[]>>((acc, task) => {
    const zone = task.workZone || '未分配区域';
    if (!acc[zone]) {
      acc[zone] = [];
    }
    acc[zone].push(task);
    return acc;
  }, {});

  // 对有3个以上任务的区域生成批量建议
  Object.entries(tasksByZone).forEach(([zone, tasks]) => {
    if (tasks.length >= 3) {
      // 计算总工时
      const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

      // 为该区域任务获取推荐员工（取每个任务的推荐，取并集）
      const workerMap = new Map<string, WorkerRecommendation>();
      tasks.forEach(task => {
        const recs = getRecommendations(task, 3);
        recs.forEach(rec => {
          if (!workerMap.has(rec.worker.id)) {
            workerMap.set(rec.worker.id, rec);
          }
        });
      });

      // 计算综合得分并排序（考虑多任务匹配度）
      const suggestedWorkers = Array.from(workerMap.values())
        .map(rec => {
          // 统计该员工被推荐执行的任务数
          const recommendedTaskCount = tasks.filter(t => {
            const recs = getRecommendations(t, 10);
            return recs.some(r => r.worker.id === rec.worker.id);
          }).length;

          return {
            ...rec,
            matchScore: rec.matchScore + (recommendedTaskCount * 5), // 多任务匹配加分
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

      suggestions.push({
        zone,
        tasks,
        suggestedWorkers,
        totalHours,
        routeOptimization: generateRouteOptimization(tasks),
      });
    }
  });

  return suggestions;
}

/** 标准化农事任务为统一格式 */
function normalizeFarmTask(task: Task): UnifiedDispatchTask {
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
    requiredSkills: TASK_TYPE_SKILLS[task.type] || TASK_TYPE_SKILLS.default,
    estimatedHours: task.estimatedHours || 2,
    dueDate: task.dueDate || '',
    description: task.description,
    createdAt: task.createdAt || new Date().toISOString(),
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
  };
}

/** 标准化临时任务为统一格式 */
function normalizeTempTask(task: TempTask): UnifiedDispatchTask {
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
    requiredSkills: [], // 临时任务暂无技能要求
    estimatedHours: task.estimatedHours || 2,
    dueDate: task.dueDate || '',
    description: task.description,
    createdAt: task.createdAt || new Date().toISOString(),
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
  };
}

/** 标准化巡查问题为统一格式 */
function normalizeInspectionTask(problem: {
  id: number;
  issueText: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  issueSeverity: string;
  batchId?: string;
  batchCode?: string;
}): UnifiedDispatchTask {
  // 严重程度转优先级
  const severityToPriority: Record<string, UnifiedDispatchTask['priority']> = {
    '严重': 'urgent',
    '中等': 'high',
    '轻微': 'normal',
  };

  // 问题类型判断（issueText 可能为空或未定义）
  const getType = (text?: string): { type: string; typeName: string } => {
    if (!text) return { type: 'scouting', typeName: '问题处理' };
    if (text.includes('虫') || text.includes('蚜')) return { type: 'spraying', typeName: '病虫防治' };
    if (text.includes('病') || text.includes('斑')) return { type: 'spraying', typeName: '病害处理' };
    if (text.includes('水') || text.includes('旱')) return { type: 'irrigation', typeName: '灌溉处理' };
    if (text.includes('肥')) return { type: 'fertilization', typeName: '施肥处理' };
    return { type: 'scouting', typeName: '问题处理' };
  };

  const typeInfo = getType(problem.issueText || '');

  return {
    id: `inspection-${problem.id}`,
    source: 'inspection',
    sourceId: problem.id.toString(),
    taskCode: `PD-${problem.id}`,
    title: `【问题处理】${(problem.issueText || '未知问题').slice(0, 30)}`,
    type: typeInfo.type,
    typeName: typeInfo.typeName,
    priority: severityToPriority[problem.issueSeverity] || 'normal',
    workZone: problem.greenhouseName || '',
    greenhouse: problem.greenhouseName || '',
    cropName: problem.cropName || '',
    batchId: problem.batchId,
    batchCode: problem.batchCode,
    requiredSkills: TASK_TYPE_SKILLS[typeInfo.type] || [],
    estimatedHours: 2,
    dueDate: '',
    description: problem.issueText,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// 主 Hook
// ============================================

/**
 * 综合智能派工 Hook
 */
export function useComprehensiveDispatch() {
  // 1. 获取各模块数据
  const { tasks: farmTasks, updateTask } = useTasks();
  const { tempTasks, updateTempTask } = useTempTasks();
  const { pendingProblems } = useProblemDispatch();
  const { attendance: attendanceRecords } = usePersistentAttendance();

  // 1.5 获取环境数据（天气预报、传感器、告警）
  const {
    todayWeather,
    assessWeatherImpact,
    getCurrentWeatherRecommendation,
    unacknowledgedAlerts,
    criticalAlerts,
  } = useEnvironmentData();

  // 2. 构建统一任务池（仅获取待派发状态的任务）
  // 注意：pending状态的任务表示已发布但执行人还未接受，需要派发
  // 农事任务和临时任务在创建时可能已设置assigneeId，但仍处于pending状态等待执行人确认
  const taskPool = useMemo(() => {
    const unifiedTasks: UnifiedDispatchTask[] = [];

    // 农事任务 - 待发布状态（pending）
    // 移除 !assigneeId 条件，因为任务创建时可能已设置执行人但仍需派发确认
    const pendingFarmTasks = farmTasks.filter(
      t => t.status === 'pending'
    );
    unifiedTasks.push(...pendingFarmTasks.map(normalizeFarmTask));

    // 临时任务 - 待处理状态（pending）
    const pendingTempTasks = tempTasks.filter(
      t => t.status === 'pending'
    );
    unifiedTasks.push(...pendingTempTasks.map(normalizeTempTask));

    // 巡查问题 - 待处理问题
    unifiedTasks.push(...pendingProblems.map(normalizeInspectionTask));

    return unifiedTasks;
  }, [farmTasks, tempTasks, pendingProblems]);

  // 3. 构建员工综合状态
  const workers = useMemo((): WorkerComprehensiveStatus[] => {
    // 从 useWorkerStore 获取工人基础信息
    const storeWorkers = useWorkerStore.getState().workers;
    return storeWorkers.map(w => {
      // 计算今日已用工时（从考勤记录）
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = attendanceRecords.filter(
        r => r.date === today && r.name === w.name
      );
      const usedHours = todayRecords.reduce((sum, r) => sum + (r.hours || 0), 0);

      // 计算员工当前负荷（基于进行中的任务数估算）
      const workerTasks = farmTasks.filter(
        t => t.assigneeName === w.name && t.status === 'in_progress'
      );
      const tempWorkerTasks = tempTasks.filter(
        t => t.assigneeName === w.name && t.status === 'in_progress'
      );
      const taskLoad = (workerTasks.length + tempWorkerTasks.length) * 20; // 每任务约20%负荷

      // 计算对各批次的熟悉度（基于历史任务数量估算）
      const batchFamiliarity: Record<string, number> = {};
      farmTasks.forEach(t => {
        if (t.assigneeName === w.name && t.batchCode) {
          batchFamiliarity[t.batchCode] = Math.min(
            100,
            (batchFamiliarity[t.batchCode] || 0) + 10
          );
        }
      });

      return {
        id: w.id,
        name: w.name,
        // Worker类型无 workerType 字段，统一默认'正式工'
        workerType: '正式工',
        // Worker类型用 workArea 映射到 workZone
        workZone: w.workArea || 'A区',
        skills: w.skillTags || [],
        currentLoad: Math.min(100, taskLoad),
        availableHoursToday: Math.max(0, 8 - usedHours), // 假设每天工作8小时
        // Worker类型无 recentPerformance 字段，使用默认值
        recentPerformance: 85,
        // Worker类型无 distance 字段，使用默认区域距离
        distance: { 'A区': 1, 'B区': 2, 'C区': 3 },
        batchFamiliarity,
        attendanceStatus: usedHours > 0 ? 'working' : 'off',
      };
    });
  }, [farmTasks, tempTasks, attendanceRecords]);

  // 4. AI推荐算法
  const getRecommendations = useCallback(
    (task: UnifiedDispatchTask, topN: number = 5): WorkerRecommendation[] => {
      // 获取动态权重
      const dynamicWeights = getDynamicWeights(task);

      // 评估天气影响
      const weatherImpact = assessWeatherImpact(task.type);

      // 计算天气得分（适合执行=100，不适合=0）
      const weatherScore = weatherImpact.suitable ? 100 : 0;

      return workers
        .map(worker => {
          const skillMatchRate = calculateSkillMatch(worker.skills, task.requiredSkills);
          const distance = worker.distance[task.workZone] || 5;
          const locationScore = calculateLocationScore(distance);
          const loadScore = calculateLoadScore(worker.currentLoad);
          const performanceScore = calculatePerformanceScore(worker.recentPerformance);
          const urgencyScore = calculateUrgencyScore(task.priority);
          const batchFamiliarityScore = calculateBatchFamiliarity(worker, task.batchId);

          // 综合得分计算（7因子加权，使用动态权重）
          const matchScore = Math.round(
            skillMatchRate * dynamicWeights.skillMatch +
            locationScore * dynamicWeights.location +
            loadScore * dynamicWeights.currentLoad +
            performanceScore * dynamicWeights.historicalPerformance +
            urgencyScore * dynamicWeights.urgency +
            batchFamiliarityScore * dynamicWeights.batchFamiliarity +
            weatherScore * 0.05 // 天气影响权重5%
          );

          // 计算置信度
          const { level: confidenceLevel, score: confidenceScore } = calculateConfidence(matchScore);

          // 生成增强版推荐理由
          const reasonsDetail = generateEnhancedReasons(task, worker, {
            skillMatchRate,
            locationScore,
            loadScore,
            distance,
          });

          // 添加天气警告到风险警告
          const riskWarnings = generateRiskWarnings(task, worker, skillMatchRate);
          if (!weatherImpact.suitable) {
            riskWarnings.unshift(`天气不适合：${weatherImpact.reason}`);
          }

          // 计算建议动作
          let suggestedAction = determineSuggestedAction(task, matchScore, riskWarnings);

          // 如果天气不适合，默认建议延后
          if (!weatherImpact.suitable && suggestedAction === 'dispatch') {
            suggestedAction = 'delay';
          }

          // 检查员工是否可用
          const isAvailable = worker.attendanceStatus !== 'off' && worker.currentLoad < 100;

          // 生成全维度因素详情
          const factorsDetail = generateFactorsDetail(
            task,
            worker,
            weatherImpact,
            skillMatchRate,
            distance,
            [] // 空数组，后续可以从外部传入告警列表
          );

          return {
            worker,
            matchScore,
            skillMatchRate,
            locationScore,
            loadScore,
            performanceScore,
            urgencyScore,
            batchFamiliarityScore,
            reasons: generateReasons(task, worker, skillMatchRate, distance),
            confidenceLevel,
            confidenceScore,
            suggestedAction,
            reasonsDetail,
            riskWarnings,
            isAvailable,
            weatherImpact,
            weatherScore,
            factorsDetail,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, topN);
    },
    [workers]
  );

  // 5. 执行派发
  // 派发操作会更新执行人，并将任务状态设置为 accepted（执行人已接受）
  // 这样任务会从未接受队列中移除
  const executeDispatch = useCallback(
    (task: UnifiedDispatchTask, workerId: string, workerName: string) => {
      switch (task.source) {
        case 'farm': {
          // 农事任务：更新任务执行人并设置为已接受
          updateTask(task.sourceId, {
            assigneeId: workerId,
            assigneeName: workerName,
            status: 'accepted',
          });
          break;
        }
        case 'tempTask': {
          // 临时任务：调用 /accept 记录接单操作，再调用 /submit-progress 记录开始执行
          // 1. 调用 /accept 记录接单动作（状态变为 accepted）
          fetch(`/api/temp-tasks/${task.sourceId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operator_id: workerId, operator_name: workerName }),
          }).catch(() => { /* accept failed */ });

          // 2. 更新执行人信息（不改变状态，状态由 submit-progress 改变）
          updateTempTask(task.sourceId, {
            assigneeId: workerId,
            assigneeName: workerName,
          });

          // 3. 延迟调用 /submit-progress 记录开始执行（progress=0，状态变为 in_progress）
          setTimeout(() => {
            fetch(`/api/temp-tasks/${task.sourceId}/submit-progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                progress: 0,
                operator_id: workerId,
                operator_name: workerName,
                comment: '开始执行任务',
              }),
            }).catch(() => { /* submit-progress failed */ });
          }, 100);
          break;
        }
        case 'inspection': {
          // 巡查问题：需要创建新任务或直接分派（取决于业务逻辑）
          // 这里暂时标记问题已被处理
          // 巡查问题待分派
          break;
        }
      }
    },
    [updateTask, updateTempTask]
  );

  // 6. 按来源筛选任务
  const filterBySource = useCallback(
    (source?: DispatchTaskSource) => {
      if (!source) return taskPool;
      return taskPool.filter(t => t.source === source);
    },
    [taskPool]
  );

  // 7. 获取统计信息
  const stats = useMemo(() => ({
    total: taskPool.length,
    farm: taskPool.filter(t => t.source === 'farm').length,
    tempTask: taskPool.filter(t => t.source === 'tempTask').length,
    inspection: taskPool.filter(t => t.source === 'inspection').length,
  }), [taskPool]);

  // 8. 批量派发建议（同一区域有3个以上待派发任务时自动生成）
  const batchSuggestions = useMemo<BatchDispatchSuggestion[]>(() => {
    return getBatchDispatchSuggestions(taskPool, workers, getRecommendations);
  }, [taskPool, workers, getRecommendations]);

  return {
    // 任务池
    taskPool,
    filterBySource,
    stats,

    // 员工列表
    workers,

    // AI推荐
    getRecommendations,

    // 批量派发建议
    batchSuggestions,

    // 执行派发
    executeDispatch,

    // 环境数据
    todayWeather,
    getCurrentWeatherRecommendation,
    unacknowledgedAlerts,
    criticalAlerts,
  };
}
