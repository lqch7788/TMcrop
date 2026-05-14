/**
 * 月度任务规划Hook
 * 实施智能派工系统阶段三：月度任务规划
 *
 * 功能：
 * 1. generateMonthlyPlan - 生成月度规划
 * 2. aggregateByWeek - 按周汇总任务
 * 3. analyzeMaterialRequirements - 物资需求分析
 * 4. analyzeToolRequirements - 工具需求分析
 * 5. analyzeWorkerRequirements - 人员需求分析
 * 6. estimateCost - 成本预估
 */

import { useCallback } from 'react';
import { CropBatch } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useProductionPlanStore } from '../stores';
import { COST_CONFIG } from '../data/costConfig';
import { CROP_STAGE_TASK_CONFIG, DEFAULT_TASK_CONFIG } from '../data/cropStageTaskConfig';

// ============================================
// 预测任务类型定义
// ============================================
export interface PredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  plantingArea: number;
  stage: string;
  stageName: string;
  taskType: string;
  taskTypeName: string;
  suggestedDate: string;
  estimatedHours: number;
  estimatedWorkers: number;
  priority: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'high' | 'normal';
  reason: string;
  isOverdue: boolean;
  daysSinceLastTask: number;
  intervalDays: number;
}

// ============================================
// 周汇总类型
// ============================================
export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  taskCount: number;
  totalHours: number;
  keyCrops: string[];
  keyTasks: string[];
  requiredWorkers: number;
}

// ============================================
// 物资需求类型
// ============================================
export interface MaterialRequirement {
  materialName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
}

// ============================================
// 工具需求类型
// ============================================
export interface ToolRequirement {
  toolName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
}

// ============================================
// 人员需求类型
// ============================================
export interface WorkerRequirement {
  role: string;
  skill: string;
  requiredCount: number;
  estimatedHours: number;
}

// ============================================
// 成本明细类型
// ============================================
export interface CostBreakdown {
  materialCost: number;
  toolCost: number;
  laborCost: number;
  total: number;
}

// ============================================
// 日计划类型
// ============================================
export interface DailyPlan {
  date: string;
  tasks: PredictedTask[];
  totalTasks: number;
  totalHours: number;
  requiredWorkers: number;
}

// ============================================
// 月度计划类型
// ============================================
export interface MonthlyPlan {
  month: string;
  batches: string[];
  totalTasks: number;
  totalHours: number;
  totalCost: number;
  weeklySummaries: WeeklySummary[];
  taskTypeBreakdown: Record<string, number>;
  dailyPlans: Record<string, DailyPlan>;
  materialRequirements: MaterialRequirement[];
  toolRequirements: ToolRequirement[];
  workerRequirements: WorkerRequirement[];
  costBreakdown: CostBreakdown;
  generatedAt: string;
  generatedBy: string;
  planningHorizon: 'monthly';
}

// ============================================
// 工具函数
// ============================================

/**
 * 获取月份结束日期
 */
function getMonthEndDate(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * 获取指定日期是当年的第几周
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * 获取日期所在周的开始日期（周一）
 */
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `PRED_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// 任务预测核心逻辑
// ============================================

/**
 * 根据批次预测指定日期的任务
 * @param batch 作物批次
 * @param dateStr 目标日期 (YYYY-MM-DD)
 * @param lastTaskDates 上次执行任务的日期记录
 * @returns 预测任务数组
 */
function predictTasksForBatchAndDate(
  batch: CropBatch,
  dateStr: string,
  lastTaskDates: Record<string, string>
): PredictedTask[] {
  const tasks: PredictedTask[] = [];
  const stageConfig = CROP_STAGE_TASK_CONFIG[batch.cropName]?.[batch.stage];

  if (!stageConfig) {
    // 使用默认配置
    const defaultConfig = [DEFAULT_TASK_CONFIG];
    for (const config of defaultConfig) {
      const lastDate = lastTaskDates[`${batch.id}_${config.taskType}`];
      const daysSinceLastTask = lastDate
        ? Math.floor((new Date(dateStr).getTime() - new Date(lastDate).getTime()) / 86400000)
        : config.intervalDays;

      if (daysSinceLastTask >= config.intervalDays) {
        const taskId = generateId();
        tasks.push({
          id: taskId,
          batchId: batch.id,
          batchCode: batch.batchCode,
          cropName: batch.cropName,
          greenhouseId: batch.greenhouseId,
          greenhouseName: batch.greenhouseName,
          plantingArea: batch.plantingArea,
          stage: batch.stage,
          stageName: batch.stageName,
          taskType: config.taskType,
          taskTypeName: config.taskTypeName,
          suggestedDate: dateStr,
          estimatedHours: config.baseHours * Math.ceil(batch.plantingArea / 100),
          estimatedWorkers: config.baseWorkers,
          priority: 'medium',
          urgency: 'normal',
          reason: `根据生长阶段例行任务`,
          isOverdue: daysSinceLastTask > config.intervalDays * 1.5,
          daysSinceLastTask,
          intervalDays: config.intervalDays,
        });
      }
    }
    return tasks;
  }

  // 遍历该生长阶段的所有任务配置
  for (const config of stageConfig) {
    const lastDate = lastTaskDates[`${batch.id}_${config.taskType}`];
    const daysSinceLastTask = lastDate
      ? Math.floor((new Date(dateStr).getTime() - new Date(lastDate).getTime()) / 86400000)
      : config.intervalDays;

    // 判断是否应该执行该任务
    if (daysSinceLastTask >= config.intervalDays) {
      const taskId = generateId();

      // 根据面积计算实际工时和人数
      const areaFactor = Math.ceil(batch.plantingArea / 100);
      const estimatedHours = config.baseHours * areaFactor;
      const estimatedWorkers = Math.max(1, Math.min(config.baseWorkers, Math.ceil(areaFactor / 2)));

      // 判断优先级和紧急程度
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let urgency: 'urgent' | 'high' | 'normal' = 'normal';

      if (daysSinceLastTask > config.intervalDays * 2) {
        priority = 'high';
        urgency = 'urgent';
      } else if (daysSinceLastTask > config.intervalDays * 1.5) {
        priority = 'medium';
        urgency = 'high';
      }

      tasks.push({
        id: taskId,
        batchId: batch.id,
        batchCode: batch.batchCode,
        cropName: batch.cropName,
        greenhouseId: batch.greenhouseId,
        greenhouseName: batch.greenhouseName,
        plantingArea: batch.plantingArea,
        stage: batch.stage,
        stageName: batch.stageName,
        taskType: config.taskType,
        taskTypeName: config.taskTypeName,
        suggestedDate: dateStr,
        estimatedHours,
        estimatedWorkers,
        priority,
        urgency,
        reason: `根据生长阶段例行任务，距上次${config.taskTypeName}已过${daysSinceLastTask}天`,
        isOverdue: daysSinceLastTask > config.intervalDays * 1.5,
        daysSinceLastTask,
        intervalDays: config.intervalDays,
      });
    }
  }

  return tasks;
}

// ============================================
// Hook返回类型
// ============================================
export interface UseMonthlyTaskPlanningReturn {
  // 月度计划
  generateMonthlyPlan: (month: string, batchIds: string[]) => MonthlyPlan;

  // 按周汇总
  aggregateByWeek: (tasks: PredictedTask[], startDate: string, endDate: string) => WeeklySummary[];

  // 物资需求分析
  analyzeMaterialRequirements: (tasks: PredictedTask[]) => MaterialRequirement[];

  // 工具需求分析
  analyzeToolRequirements: (tasks: PredictedTask[]) => ToolRequirement[];

  // 人员需求分析
  analyzeWorkerRequirements: (tasks: PredictedTask[]) => WorkerRequirement[];

  // 成本预估
  estimateCost: (tasks: PredictedTask[], materialRequirements: MaterialRequirement[]) => CostBreakdown;

  // 辅助函数：预测某日期范围内的任务
  predictTasks: (startDate: string, endDate: string, batches: CropBatch[]) => PredictedTask[];

  // 辅助函数：获取已保存的上次任务执行日期
  getLastTaskDates: () => Record<string, string>;

  // 保存任务执行日期记录
  saveLastTaskDate: (batchId: string, taskType: string, date: string) => void;
}

// ============================================
// useMonthlyTaskPlanning Hook
// ============================================
export function useMonthlyTaskPlanning(): UseMonthlyTaskPlanningReturn {
  // 使用localStorage存储上次任务执行日期
  const [lastTaskDates, setLastTaskDates] = useLocalStorage<Record<string, string>>(
    'yuanxingtu_monthly_planning_last_tasks',
    {}
  );

  // ============================================
  // 预测任务
  // ============================================
  const predictTasks = useCallback((
    startDate: string,
    endDate: string,
    batches: CropBatch[]
  ): PredictedTask[] => {
    const allTasks: PredictedTask[] = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    // 只处理执行中或已发布的批次
    const activeBatches = batches.filter(
      b => b.batchStatus === 'in_progress' || b.batchStatus === 'published' || b.status === 'in_progress'
    );

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // 遍历每个活跃批次，预测该日期的任务
      for (const batch of activeBatches) {
        const tasks = predictTasksForBatchAndDate(batch, dateStr, lastTaskDates);
        allTasks.push(...tasks);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allTasks;
  }, [lastTaskDates]);

  // ============================================
  // 生成月度计划
  // ============================================
  const generateMonthlyPlan = useCallback((
    month: string,
    batchIds: string[]
  ): MonthlyPlan => {
    const startDate = `${month}-01`;
    const endDate = getMonthEndDate(month);

    // 从 Zustand Store 获取批次数据
    const batches: CropBatch[] = useProductionPlanStore.getState().plans || [];
    if (batches.length === 0) {
      // Store 可能尚未加载，尝试 fetch
      useProductionPlanStore.getState().fetchPlans();
    }

    // 过滤指定批次的执行中/已发布批次
    const targetBatches = batchIds.length > 0
      ? batches.filter(b => batchIds.includes(b.id))
      : batches.filter(b => b.batchStatus === 'in_progress' || b.batchStatus === 'published' || b.status === 'in_progress');

    // 预测未来30天任务
    const allTasks = predictTasks(startDate, endDate, targetBatches);

    // 按周汇总
    const weeklySummaries = aggregateByWeek(allTasks, startDate, endDate);

    // 物资需求分析
    const materialRequirements = analyzeMaterialRequirements(allTasks);

    // 工具需求分析
    const toolRequirements = analyzeToolRequirements(allTasks);

    // 人员需求分析
    const workerRequirements = analyzeWorkerRequirements(allTasks);

    // 成本预估
    const costBreakdown = estimateCost(allTasks, materialRequirements);

    // 按日期分组生成日计划
    const dailyPlans: Record<string, DailyPlan> = {};
    const dailyTasksMap: Record<string, PredictedTask[]> = {};

    for (const task of allTasks) {
      if (!dailyTasksMap[task.suggestedDate]) {
        dailyTasksMap[task.suggestedDate] = [];
      }
      dailyTasksMap[task.suggestedDate].push(task);
    }

    for (const [date, tasks] of Object.entries(dailyTasksMap)) {
      dailyPlans[date] = {
        date,
        tasks,
        totalTasks: tasks.length,
        totalHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
        requiredWorkers: tasks.reduce((sum, t) => sum + t.estimatedWorkers, 0),
      };
    }

    // 任务类型分布统计
    const taskTypeBreakdown: Record<string, number> = {};
    for (const task of allTasks) {
      taskTypeBreakdown[task.taskType] = (taskTypeBreakdown[task.taskType] || 0) + 1;
    }

    return {
      month,
      batches: batchIds,
      totalTasks: allTasks.length,
      totalHours: allTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      totalCost: costBreakdown.total,
      weeklySummaries,
      taskTypeBreakdown,
      dailyPlans,
      materialRequirements,
      toolRequirements,
      workerRequirements,
      costBreakdown,
      generatedAt: new Date().toISOString(),
      generatedBy: 'AI Planning Engine',
      planningHorizon: 'monthly',
    };
  }, [predictTasks, lastTaskDates]);

  // ============================================
  // 按周汇总
  // ============================================
  const aggregateByWeek = useCallback((
    tasks: PredictedTask[],
    startDate: string,
    endDate: string
  ): WeeklySummary[] => {
    const weeklyMap: Record<number, WeeklySummary> = {};

    // 遍历日期范围，初始化每周汇总
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const weekNum = getWeekNumber(currentDate);
      const weekStart = getWeekStartDate(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (!weeklyMap[weekNum]) {
        weeklyMap[weekNum] = {
          weekNumber: weekNum,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          taskCount: 0,
          totalHours: 0,
          keyCrops: [],
          keyTasks: [],
          requiredWorkers: 0,
        };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 汇总任务到对应周
    const cropCountMap: Record<number, Record<string, number>> = {};
    const taskCountMap: Record<number, Record<string, number>> = {};

    for (const task of tasks) {
      const taskDate = new Date(task.suggestedDate);
      const weekNum = getWeekNumber(taskDate);
      const weekSummary = weeklyMap[weekNum];

      if (weekSummary) {
        weekSummary.taskCount++;
        weekSummary.totalHours += task.estimatedHours;
        weekSummary.requiredWorkers += task.estimatedWorkers;

        // 记录作物和任务类型计数
        if (!cropCountMap[weekNum]) cropCountMap[weekNum] = {};
        if (!taskCountMap[weekNum]) taskCountMap[weekNum] = {};

        cropCountMap[weekNum][task.cropName] = (cropCountMap[weekNum][task.cropName] || 0) + 1;
        taskCountMap[weekNum][task.taskTypeName] = (taskCountMap[weekNum][task.taskTypeName] || 0) + 1;
      }
    }

    // 生成关键作物和关键任务列表
    for (const [weekNum, summary] of Object.entries(weeklyMap)) {
      const num = Number(weekNum);
      const crops = cropCountMap[num] || {};
      const tasks_map = taskCountMap[num] || {};

      // 取数量最多的3种作物
      summary.keyCrops = Object.entries(crops)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([crop]) => crop);

      // 取数量最多的3种任务类型
      summary.keyTasks = Object.entries(tasks_map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([taskType]) => taskType);
    }

    return Object.values(weeklyMap).sort((a, b) => a.weekNumber - b.weekNumber);
  }, []);

  // ============================================
  // 物资需求分析
  // 物资需求计算逻辑：
  // - 施肥任务：每10m²需要1kg复合肥
  // - 植保任务：每20m²需要1L农药
  // - 灌溉任务：每2m²需要1m³水
  // ============================================
  const analyzeMaterialRequirements = useCallback((tasks: PredictedTask[]): MaterialRequirement[] => {
    const materialMap: Record<string, MaterialRequirement> = {};

    for (const task of tasks) {
      const area = task.plantingArea;

      if (task.taskType === 'fertilization') {
        // 施肥：每10m²需要1kg复合肥
        const quantity = Math.ceil(area / 10);
        const key = '复合肥';
        if (!materialMap[key]) {
          materialMap[key] = {
            materialName: '复合肥',
            specification: 'NPK含量45%',
            quantity: 0,
            unit: 'kg',
            estimatedUnitPrice: 3.5,
            estimatedTotalPrice: 0,
          };
        }
        materialMap[key].quantity += quantity;
      }

      if (task.taskType === 'plant_protection' || task.taskType === 'pesticide') {
        // 植保：每20m²需要1L农药
        const quantity = Math.ceil(area / 20);
        const key = '农药';
        if (!materialMap[key]) {
          materialMap[key] = {
            materialName: '农药',
            specification: '高效低毒',
            quantity: 0,
            unit: 'L',
            estimatedUnitPrice: 25,
            estimatedTotalPrice: 0,
          };
        }
        materialMap[key].quantity += quantity;
      }

      if (task.taskType === 'irrigation') {
        // 灌溉：每2m²需要1m³水
        const quantity = Math.ceil(area / 2);
        const key = '灌溉水';
        if (!materialMap[key]) {
          materialMap[key] = {
            materialName: '灌溉水',
            specification: '清洁水源',
            quantity: 0,
            unit: 'm³',
            estimatedUnitPrice: 0.5,
            estimatedTotalPrice: 0,
          };
        }
        materialMap[key].quantity += quantity;
      }
    }

    // 计算总价
    for (const material of Object.values(materialMap)) {
      material.estimatedTotalPrice = material.quantity * material.estimatedUnitPrice;
    }

    return Object.values(materialMap).sort((a, b) => b.estimatedTotalPrice - a.estimatedTotalPrice);
  }, []);

  // ============================================
  // 工具需求分析
  // ============================================
  const analyzeToolRequirements = useCallback((tasks: PredictedTask[]): ToolRequirement[] => {
    const toolMap: Record<string, ToolRequirement> = {};

    for (const task of tasks) {
      const area = task.plantingArea;

      if (task.taskType === 'irrigation') {
        // 灌溉需要水管、喷头
        const key = '灌溉设备';
        if (!toolMap[key]) {
          toolMap[key] = {
            toolName: '灌溉设备',
            specification: '浇水壶/水管',
            quantity: 0,
            unit: '套',
            estimatedUnitPrice: 15,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[key].quantity += Math.ceil(area / 100);
      }

      if (task.taskType === 'fertilization') {
        // 施肥需要施肥器
        const key = '施肥器';
        if (!toolMap[key]) {
          toolMap[key] = {
            toolName: '施肥器',
            specification: '手持式',
            quantity: 0,
            unit: '个',
            estimatedUnitPrice: 20,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[key].quantity += Math.ceil(area / 100);
      }

      if (task.taskType === 'plant_protection' || task.taskType === 'pesticide') {
        // 植保需要喷雾器
        const key = '喷雾器';
        if (!toolMap[key]) {
          toolMap[key] = {
            toolName: '喷雾器',
            specification: '背负式',
            quantity: 0,
            unit: '台',
            estimatedUnitPrice: 80,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[key].quantity += Math.ceil(area / 200);
      }

      if (task.taskType === 'pruning') {
        // 修剪需要剪刀
        const key = '修剪剪刀';
        if (!toolMap[key]) {
          toolMap[key] = {
            toolName: '修剪剪刀',
            specification: '园艺专用',
            quantity: 0,
            unit: '把',
            estimatedUnitPrice: 35,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[key].quantity += Math.ceil(area / 100);
      }

      if (task.taskType === 'harvest') {
        // 采收需要篮子、剪刀
        const basketKey = '采收篮';
        if (!toolMap[basketKey]) {
          toolMap[basketKey] = {
            toolName: '采收篮',
            specification: '塑料周转箱',
            quantity: 0,
            unit: '个',
            estimatedUnitPrice: 25,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[basketKey].quantity += Math.ceil(area / 50);

        const scissorsKey = '采摘剪刀';
        if (!toolMap[scissorsKey]) {
          toolMap[scissorsKey] = {
            toolName: '采摘剪刀',
            specification: '水果专用',
            quantity: 0,
            unit: '把',
            estimatedUnitPrice: 18,
            estimatedTotalPrice: 0,
          };
        }
        toolMap[scissorsKey].quantity += Math.ceil(area / 100);
      }
    }

    // 计算总价
    for (const tool of Object.values(toolMap)) {
      tool.estimatedTotalPrice = tool.quantity * tool.estimatedUnitPrice;
    }

    return Object.values(toolMap).sort((a, b) => b.estimatedTotalPrice - a.estimatedTotalPrice);
  }, []);

  // ============================================
  // 人员需求分析
  // ============================================
  const analyzeWorkerRequirements = useCallback((tasks: PredictedTask[]): WorkerRequirement[] => {
    // 按技能类型汇总
    const skillMap: Record<string, WorkerRequirement> = {};

    // 任务类型到技能的映射
    const taskTypeToSkill: Record<string, { role: string; skill: string }> = {
      'irrigation': { role: '浇水工', skill: '浇水灌溉' },
      'fertilization': { role: '施肥工', skill: '施肥作业' },
      'plant_protection': { role: '植保工', skill: '病虫害防治' },
      'pesticide': { role: '植保工', skill: '打药操作' },
      'pruning': { role: '修剪工', skill: '修剪整枝' },
      'harvest': { role: '采收工', skill: '采摘技能' },
      'weeding': { role: '除草工', skill: '除草作业' },
    };

    for (const task of tasks) {
      const mapping = taskTypeToSkill[task.taskType] || { role: '杂工', skill: '基础农活' };
      const key = mapping.skill;

      if (!skillMap[key]) {
        skillMap[key] = {
          role: mapping.role,
          skill: key,
          requiredCount: 0,
          estimatedHours: 0,
        };
      }

      skillMap[key].requiredCount += task.estimatedWorkers;
      skillMap[key].estimatedHours += task.estimatedHours * task.estimatedWorkers;
    }

    return Object.values(skillMap).sort((a, b) => b.estimatedHours - a.estimatedHours);
  }, []);

  // ============================================
  // 成本预估
  // ============================================
  const estimateCost = useCallback((
    tasks: PredictedTask[],
    materialRequirements: MaterialRequirement[]
  ): CostBreakdown => {
    // 物资成本
    const materialCost = materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0);

    // 工具成本（按物资成本的比例估算磨损）
    const toolCost = materialCost * COST_CONFIG.TOOL_COST_RATIO;

    // 人工成本（按配置的人工费率计算）
    const laborCost = tasks.reduce((sum, t) => sum + t.estimatedHours * COST_CONFIG.LABOR_RATE_PER_HOUR, 0);

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      toolCost: Math.round(toolCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      total: Math.round((materialCost + toolCost + laborCost) * 100) / 100,
    };
  }, []);

  // ============================================
  // 保存任务执行日期记录
  // ============================================
  const saveLastTaskDate = useCallback((
    batchId: string,
    taskType: string,
    date: string
  ) => {
    const key = `${batchId}_${taskType}`;
    setLastTaskDates(prev => ({
      ...prev,
      [key]: date,
    }));
  }, [setLastTaskDates]);

  // ============================================
  // 获取上次任务执行日期
  // ============================================
  const getLastTaskDates = useCallback((): Record<string, string> => {
    return lastTaskDates;
  }, [lastTaskDates]);

  return {
    generateMonthlyPlan,
    aggregateByWeek,
    analyzeMaterialRequirements,
    analyzeToolRequirements,
    analyzeWorkerRequirements,
    estimateCost,
    predictTasks,
    getLastTaskDates,
    saveLastTaskDate,
  };
}
