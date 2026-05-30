/**
 * 每日任务规划 Hook
 * 实现智能派工系统阶段二：每日任务规划功能
 * 提供每日派工计划生成、确认与派发功能
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useTasks, Task } from './useTasks';
import { useTempTasks, TempTask } from './useTempTasks';
import { usePersistentAttendance } from './usePersistentAttendance';
import { CropBatch } from '../types';
import {
  DailyPlan,
  PredictedTask,
  WorkerLoadAnalysis,
  WeatherData,
} from '../types/planning';
import { useLocalStorage } from './useLocalStorage';
import { useProductionPlanStore, useDailyPlanStore } from '../stores';
import { useComprehensiveDispatch } from './useComprehensiveDispatch';
import type { WorkerRecommendation } from './useComprehensiveDispatch';

// ============================================
// 工具函数
// ============================================

/**
 * 判断任务是否超期
 */
function isTaskOverdue(task: Task | TempTask, targetDate: string): boolean {
  if ('status' in task) {
    if (['completed', 'cancelled', 'abandoned', 'failed'].includes(task.status)) {
      return false;
    }
  } else {
    if (['completed', 'cancelled'].includes(task.status)) {
      return false;
    }
  }

  if (!task.dueDate) return false;

  const dueDate = new Date(task.dueDate);
  const target = new Date(targetDate);
  dueDate.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return dueDate < target;
}

/**
 * 计算超期天数
 */
function calculateOverdueDays(dueDate: string, targetDate: string): number {
  const due = new Date(dueDate);
  const target = new Date(targetDate);
  due.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * 获取任务名称
 */
function getTaskName(task: Task | TempTask): string {
  return 'title' in task ? task.title : task.title;
}

/**
 * 获取执行人名称
 */
function getAssigneeName(task: Task | TempTask): string {
  return 'assigneeName' in task ? task.assigneeName : task.assigneeName;
}

// ============================================
// Hook 返回类型
// ============================================

export interface UseDailyTaskPlanningReturn {
  // 生成每日派工计划
  generateDailyPlan: (date: string) => DailyPlan;

  // 确认并派发计划
  confirmAndDispatch: (plan: DailyPlan) => Promise<{ success: boolean; dispatchedTasks: number }>;

  // 获取今日计划
  getTodayPlan: () => DailyPlan;

  // 获取人员负荷分析
  getWorkerLoadAnalysis: (date: string) => WorkerLoadAnalysis[];

  // 获取天气信息
  getWeatherForecast: (date: string) => WeatherData | null;

  // 获取待派发任务
  getPendingDispatchTasks: (date: string) => PredictedTask[];
}

// ============================================
// useDailyTaskPlanning Hook
// ============================================

export function useDailyTaskPlanning(): UseDailyTaskPlanningReturn {
  // 获取农事任务数据
  const { tasks, createTask, updateTask } = useTasks();

  // 获取临时任务数据
  const { tempTasks } = useTempTasks();

  // 获取考勤数据
  const { attendance } = usePersistentAttendance();

  // 获取工人匹配功能
  const { getRecommendations } = useComprehensiveDispatch();

  // 响应式订阅生产计划 Store 数据
  const storeBatches = useProductionPlanStore((state) => state.plans);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);

  // 每日计划 Store（持久化到服务器）
  const dailyPlanStore = useDailyPlanStore();

  // 存储上次任务执行日期记录（仍使用 localStorage）
  const [lastTaskDates, setLastTaskDates] = useLocalStorage<Record<string, string>>(
    'yuanxingtu_daily_planning_last_tasks',
    {}
  );

  // 初始化时从服务器获取每日计划
  useEffect(() => {
    dailyPlanStore.fetchPlans();
  }, []);

  // ============================================
  // 获取人员负荷分析
  // ============================================
  const getWorkerLoadAnalysis = useCallback((targetDate: string): WorkerLoadAnalysis[] => {
    const workerMap = new Map<string, WorkerLoadAnalysis>();

    // 统计农事任务
    tasks.forEach(task => {
      if (!task.assigneeName) return;

      if (!workerMap.has(task.assigneeName)) {
        workerMap.set(task.assigneeName, {
          workerId: task.assigneeId || task.assigneeName,
          workerName: task.assigneeName,
          todayTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          loadStatus: 'normal',
          availability: 'available',
          currentTasks: [],
        });
      }

      const analysis = workerMap.get(task.assigneeName)!;
      analysis.todayTasks++;
      analysis.currentTasks?.push(task.title);

      if (task.status === 'completed') {
        analysis.completedTasks++;
      }
    });

    // 统计临时任务
    tempTasks.forEach(task => {
      if (!task.assigneeName) return;

      if (!workerMap.has(task.assigneeName)) {
        workerMap.set(task.assigneeName, {
          workerId: task.assigneeId || task.assigneeName,
          workerName: task.assigneeName,
          todayTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          loadStatus: 'normal',
          availability: 'available',
          currentTasks: [],
        });
      }

      const analysis = workerMap.get(task.assigneeName)!;
      analysis.todayTasks++;
      analysis.currentTasks?.push(task.title);

      if (task.status === 'completed') {
        analysis.completedTasks++;
      }
    });

    // 计算完成率和负荷状态
    return Array.from(workerMap.values()).map(analysis => {
      const completionRate = analysis.todayTasks > 0
        ? Math.round((analysis.completedTasks / analysis.todayTasks) * 100)
        : 0;

      let loadStatus: WorkerLoadAnalysis['loadStatus'] = 'normal';
      if (analysis.todayTasks >= 5) {
        loadStatus = completionRate < 60 ? 'overloaded' : 'busy';
      } else if (analysis.todayTasks >= 3) {
        loadStatus = completionRate < 70 ? 'busy' : 'normal';
      }

      const availability: WorkerLoadAnalysis['availability'] =
        analysis.completedTasks < analysis.todayTasks ? 'busy' : 'available';

      return {
        ...analysis,
        completionRate,
        loadStatus,
        availability,
      };
    });
  }, [tasks, tempTasks]);

  // ============================================
  // 获取天气信息（模拟数据）
  // ============================================
  const getWeatherForecast = useCallback((targetDate: string): WeatherData | null => {
    // 模拟天气数据，实际应从天气API获取
    const weatherConditions = ['晴', '多云', '阴', '小雨', '大雨'];
    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const randomTemp = Math.floor(Math.random() * 15) + 15; // 15-30度

    const weatherData: WeatherData = {
      date: targetDate,
      temperature: randomTemp,
      condition: randomCondition,
      forecast: `${randomCondition} ${randomTemp}°C`,
      recommendation: randomCondition.includes('雨')
        ? '今日有降雨，户外作业建议调整到明日或使用避雨设施'
        : '天气良好，适合各类农事作业',
    };

    return weatherData;
  }, []);

  // ============================================
  // 获取待派发任务（超期或今日待处理）
  // ============================================
  const getPendingDispatchTasks = useCallback((targetDate: string): PredictedTask[] => {
    const pendingTasks: PredictedTask[] = [];

    // 使用响应式订阅的批次数据
    const batches: CropBatch[] = storeBatches || [];

    // 过滤执行中批次
    const activeBatches = batches.filter(
      b => b.batchStatus === 'in_progress' || b.batchStatus === 'published' || b.status === 'in_progress'
    );

    // 为每个批次生成待处理任务
    for (const batch of activeBatches) {
      // 检查超期任务
      const batchTasks = tasks.filter(t =>
        t.batchId === batch.id ||
        t.batchCode === batch.batchCode
      );

      for (const task of batchTasks) {
        if (task.status !== 'completed' && isTaskOverdue(task, targetDate)) {
          const delayDays = task.dueDate ? calculateOverdueDays(task.dueDate, targetDate) : 0;

          pendingTasks.push({
            id: `PRED_${task.id}_${Date.now()}`,
            batchId: batch.id,
            batchCode: batch.batchCode,
            cropName: batch.cropName,
            greenhouseId: batch.greenhouseId,
            greenhouseName: batch.greenhouseName,
            plantingArea: batch.plantingArea,
            stage: batch.stage,
            stageName: batch.stageName,
            taskType: (task as Task).taskType || (task as unknown as Record<string, unknown>).taskType as string || 'irrigation',
            taskTypeName: (task as Task).taskTypeName || (task as unknown as Record<string, unknown>).taskTypeName as string || '灌溉',
            suggestedDate: targetDate,
            estimatedHours: (task as Task).estimatedHours || (task as unknown as Record<string, unknown>).estimatedHours as number || 2,
            estimatedWorkers: 1,
            priority: delayDays > 3 ? 'high' : 'medium',
            urgency: delayDays > 3 ? 'urgent' : 'high',
            reason: `超期${delayDays}天未完成，需要立即处理`,
            isOverdue: true,
            daysSinceLastTask: delayDays,
            intervalDays: delayDays,
          });
        }
      }
    }

    return pendingTasks;
  }, [tasks, storeBatches]);

  // ============================================
  // 生成每日派工计划
  // ============================================
  const generateDailyPlan = useCallback((targetDate: string): DailyPlan => {
    // 获取超期待处理任务
    const pendingTasks = getPendingDispatchTasks(targetDate);

    // 获取人员负荷
    const workerLoads = getWorkerLoadAnalysis(targetDate);

    // 获取天气信息
    const weather = getWeatherForecast(targetDate);

    // 计算可用人员
    const availableWorkers = workerLoads.filter(w => w.availability === 'available');

    // 为每个任务生成派工建议
    const workerSuggestions: DailyPlan['workerSuggestions'] = [];

    for (const task of pendingTasks) {
      if (availableWorkers.length === 0) break;

      // 找到负荷最低的可用工人
      const bestWorker = availableWorkers.reduce((best, current) =>
        current.todayTasks < best.todayTasks ? current : best
      );

      workerSuggestions.push({
        workerId: bestWorker.workerId,
        workerName: bestWorker.workerName,
        taskId: task.id,
        confidenceScore: 75, // 模拟置信度
      });

      // 更新可用工人列表（标记为已分配）
      bestWorker.todayTasks++;
      if (bestWorker.todayTasks >= 3) {
        const index = availableWorkers.indexOf(bestWorker);
        if (index > -1) availableWorkers.splice(index, 1);
      }
    }

    // 天气建议
    let weatherRecommendation = '';
    if (weather) {
      if (weather.condition?.includes('雨')) {
        weatherRecommendation = '有雨天气，灌溉任务建议延后';
      }
    }

    const plan: DailyPlan = {
      date: targetDate,
      tasks: pendingTasks,
      totalTasks: pendingTasks.length,
      totalHours: pendingTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      requiredWorkers: Math.max(1, Math.ceil(pendingTasks.length / 3)),
      workerSuggestions,
    };

    // 保存计划到服务器
    await dailyPlanStore.savePlan(targetDate, plan);

    return plan;
  }, [getPendingDispatchTasks, getWorkerLoadAnalysis, getWeatherForecast, dailyPlanStore]);

  // ============================================
  // 确认并派发计划
  // ============================================
  const confirmAndDispatch = useCallback(async (
    plan: DailyPlan
  ): Promise<{ success: boolean; dispatchedTasks: number }> => {
    let dispatchedCount = 0;
    const errors: string[] = [];

    try {
      for (const task of plan.tasks) {
        // 找到对应的派工建议
        const suggestion = plan.workerSuggestions?.find(s => s.taskId === task.id);

        if (suggestion) {
          try {
            // 创建任务：正确映射 PredictedTask 字段到 createTask 需要的字段
            await createTask({
              title: `${task.greenhouseName}-${task.taskTypeName}`,
              type: task.taskType,
              typeName: task.taskTypeName,
              assigneeId: suggestion.workerId,
              assigneeName: suggestion.workerName,
              dueDate: task.suggestedDate,
              priority: task.priority,
              estimatedHours: task.estimatedHours,
              status: 'pending',
              sourceType: 'dispatch',
              dispatchMode: 'farm',
              greenhouseId: task.greenhouseId,
              greenhouseName: task.greenhouseName,
              cropName: task.cropName,
              batchId: task.batchId,
              batchCode: task.batchCode,
            });

            dispatchedCount++;

            // 更新最后任务执行日期
            const key = `${task.batchId}_${task.taskType}`;
            setLastTaskDates(prev => ({
              ...prev,
              [key]: task.suggestedDate,
            }));
          } catch (taskError) {
            errors.push(`任务 ${task.taskTypeName} 创建失败: ${(taskError as Error).message}`);
          }
        }
      }

      // 更新计划状态为已派发（保存到服务器）
      await dailyPlanStore.savePlan(plan.date, plan);

      // 如果有任何错误，返回 false
      if (errors.length > 0) {
        console.error('部分任务派发失败:', errors);
        return { success: false, dispatchedTasks: dispatchedCount };
      }

      return { success: true, dispatchedTasks: dispatchedCount };
    } catch (error) {
      console.error('派发失败:', error);
      return { success: false, dispatchedTasks: dispatchedCount };
    }
  }, [createTask, setLastTaskDates, dailyPlanStore]);

  // ============================================
  // 获取今日计划
  // ============================================
  const getTodayPlan = useCallback((): DailyPlan => {
    const today = new Date().toISOString().split('T')[0];

    // 从 Store 获取计划
    const storedPlan = dailyPlanStore.getPlan(today);
    if (storedPlan) {
      return storedPlan;
    }

    // 否则生成新计划
    return generateDailyPlan(today);
  }, [dailyPlanStore, generateDailyPlan]);

  return {
    generateDailyPlan,
    confirmAndDispatch,
    getTodayPlan,
    getWorkerLoadAnalysis,
    getWeatherForecast,
    getPendingDispatchTasks,
  };
}
