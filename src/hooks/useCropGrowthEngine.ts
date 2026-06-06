/**
 * 作物生长引擎 Hook
 * 基于生长周期的任务预测和病虫害预警
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTasks } from './useTasks';
import { usePersistentAttendance } from './usePersistentAttendance';
import { useProductionPlanStore } from '../stores/useProductionPlanStore';
import { useCropGrowthConfigStore } from '../stores/useCropGrowthConfigStore';
import type { Task } from './useTasks';
import { generateAlertTriggeredTasks, useEnvironmentData } from './useEnvironmentData';

// ============================================
// 生长阶段定义
// ============================================

export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest';

/** 季节类型定义 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * 根据月份判断季节
 * @param month 当前月份（1-12）
 * @returns 季节类型
 */
export function getSeasonByMonth(month: number): Season {
  if (month >= 3 && month <= 5) {
    return 'spring';  // 春季(3-5月)
  } else if (month >= 6 && month <= 8) {
    return 'summer';  // 夏季(6-8月)
  } else if (month >= 9 && month <= 11) {
    return 'autumn';  // 秋季(9-11月)
  } else {
    return 'winter';   // 冬季(12-2月)
  }
}

/**
 * 根据季节获取任务间隔调整值（天数）
 * @param season 季节类型
 * @returns 间隔调整值（负数表示减少间隔，正数表示增加间隔）
 */
export function getSeasonalIntervalAdjustment(season: Season): number {
  switch (season) {
    case 'spring':
      return -1;  // 春季：间隔减少1天（任务更频繁）
    case 'summer':
      return -2;  // 夏季：间隔减少2天（高温需要更频繁灌溉）
    case 'autumn':
      return 0;   // 秋季：间隔不变
    case 'winter':
      return 2;   // 冬季：间隔增加2天（低温减缓生长）
  }
}

/** @deprecated 使用 useCropGrowthConfigStore.getState().getStageDays() 替代 */
export const GROWTH_STAGE_CONFIG: Record<GrowthStage, { label: string; days: number }> = {
  seedling: { label: '幼苗期', days: 30 },
  vegetative: { label: '营养生长期', days: 45 },
  flowering: { label: '开花期', days: 30 },
  fruiting: { label: '结果期', days: 40 },
  harvest: { label: '采收期', days: 20 },
};

/** ★ V3.0 Phase 6: 从Store获取生长阶段标签（中文） */
const STAGE_LABELS: Record<GrowthStage, string> = {
  seedling: '幼苗期',
  vegetative: '营养生长期',
  flowering: '开花期',
  fruiting: '结果期',
  harvest: '采收期',
};

/** 作物类型配置 */
interface CropConfig {
  name: string;
  stages: {
    stage: GrowthStage;
    startDay: number;     // 阶段开始天数
    endDay: number;       // 阶段结束天数
    tasks: CropTask[];
  }[];
}

/** 生长周期任务 */
interface CropTask {
  type: string;           // 任务类型
  typeName: string;       // 任务类型名称
  frequency: number;      // 频率（天数）
  priority: 'high' | 'medium' | 'low';
  skillRequired: string[];
  estimatedHours: number;
  description: string;
}

/** 作物生长任务预测 */
export interface PredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseName: string;
  taskType: string;
  typeName: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  reason: string;         // 预测原因
  source: 'growth_stage' | 'overdue' | 'pest_alert' | 'weather_alert' | 'env_alert';
  estimatedHours: number;
  requiredSkills: string[];
  status: 'predicted' | 'overdue' | 'alert';
  seasonalAdjustment?: string;  // 季节调整说明（如"夏季高温，间隔减少2天"）
}

// ============================================
// 作物类型配置（示例番茄）
// ============================================

/** @deprecated 使用 useCropGrowthConfigStore.getState().getCropConfigs() 替代 */
const CROP_CONFIGS: CropConfig[] = [];

// ============================================
// 病虫害预警规则
// ============================================

interface PestAlertRule {
  id: string;
  name: string;
  symptom: string[];      // 症状关键词
  cropType: string[];     // 适用作物
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

/** @deprecated 使用 useCropGrowthConfigStore.getState().getPestAlertRules() 替代 */
const PEST_ALERT_RULES: PestAlertRule[] = [];

// ============================================
// Hook
// ============================================

export interface UseCropGrowthEngineReturn {
  // 预测任务
  predictedTasks: PredictedTask[];
  overdueTasks: PredictedTask[];

  // 病虫害预警
  pestAlerts: PredictedTask[];

  // 刷新预测
  refreshPredictions: () => void;

  // 获取批次当前阶段
  getBatchCurrentStage: (batchId: string) => GrowthStage | null;

  // 根据巡查记录生成预警
  generatePestAlertFromInspection: (inspectionReport: string, cropName: string) => PredictedTask | null;
}

export function useCropGrowthEngine(): UseCropGrowthEngineReturn {
  const { tasks } = useTasks();
  const { attendance: attendanceRecords } = usePersistentAttendance();

  // 获取环境告警触发的任务
  const { alertTriggeredTasks } = useEnvironmentData();

  const [predictedTasks, setPredictedTasks] = useState<PredictedTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<PredictedTask[]>([]);
  const [pestAlerts, setPestAlerts] = useState<PredictedTask[]>([]);

  // 计算批次当前生长阶段
  const getBatchCurrentStage = useCallback((batchId: string): GrowthStage | null => {
    const plans = useProductionPlanStore.getState().batches;
    const batch = plans.find(b => b.id === batchId);
    if (!batch) return null;

    const plantingDate = new Date(batch.startDate);
    const today = new Date();
    const daysSincePlanting = Math.floor((today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

    const cropConfigs = useCropGrowthConfigStore.getState().getCropConfigs();
    for (const config of cropConfigs) {
      if (config.name !== batch.cropName) continue;

      for (const stage of config.stages) {
        if (daysSincePlanting >= stage.startDay && daysSincePlanting <= stage.endDay) {
          return stage.stage;
        }
      }
    }

    return null;
  }, []);

  // 生成基于生长周期的预测任务
  const generateGrowthStageTasks = useCallback((): PredictedTask[] => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;  // getMonth() 返回 0-11
    const currentSeason = getSeasonByMonth(currentMonth);
    const seasonalAdjustment = getSeasonalIntervalAdjustment(currentSeason);
    const tasks: PredictedTask[] = [];

    const plans = useProductionPlanStore.getState().batches;
    plans.forEach(batch => {
      const plantingDate = new Date(batch.startDate);
      const daysSincePlanting = Math.floor((today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

      const cropConfigs = useCropGrowthConfigStore.getState().getCropConfigs();
      const config = cropConfigs.find(c => c.name === batch.cropName);
      if (!config) return;

      for (const stage of config.stages) {
        // 只处理当前阶段和下一个阶段
        if (daysSincePlanting > stage.endDay + 10) continue;

        for (const task of stage.tasks) {
          // 计算下次任务日期，应用季节调整
          const lastTaskDate = new Date(plantingDate);
          lastTaskDate.setDate(lastTaskDate.getDate() + stage.startDay);

          const daysIntoStage = daysSincePlanting - stage.startDay;
          if (daysIntoStage < 0) continue;

          // 应用季节调整后的任务频率
          const adjustedFrequency = Math.max(1, task.frequency + seasonalAdjustment);
          const cyclesSinceStart = Math.floor(daysIntoStage / adjustedFrequency);
          const nextTaskDay = stage.startDay + (cyclesSinceStart + 1) * adjustedFrequency;

          if (nextTaskDay > stage.endDay) continue;

          const dueDate = new Date(plantingDate);
          dueDate.setDate(dueDate.getDate() + nextTaskDay);

          // 如果任务已过期或即将到期（3天内）
          if (dueDate >= today || (dueDate >= new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000))) {
            const isOverdue = dueDate < today;

            // 生成季节调整说明
            let seasonalAdjustmentText = '';
            if (seasonalAdjustment !== 0) {
              const seasonNames: Record<Season, string> = {
                spring: '春季',
                summer: '夏季',
                autumn: '秋季',
                winter: '冬季',
              };
              const actionText = seasonalAdjustment < 0 ? '减少' : '增加';
              seasonalAdjustmentText = `${seasonNames[currentSeason]}${actionText}${Math.abs(seasonalAdjustment)}天`;
            }

            tasks.push({
              id: `pred_${batch.id}_${task.type}_${nextTaskDay}`,
              batchId: batch.id,
              batchCode: batch.batchCode,
              cropName: batch.cropName,
              greenhouseName: batch.greenhouseName,
              taskType: task.type,
              typeName: task.typeName,
              priority: task.priority,
              dueDate: dueDate.toISOString().split('T')[0],
              reason: isOverdue ? `已超期${Math.abs(Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))}天` : `预计${task.description}`,
              source: isOverdue ? 'overdue' : 'growth_stage',
              estimatedHours: task.estimatedHours,
              requiredSkills: task.skillRequired,
              status: isOverdue ? 'overdue' : 'predicted',
              seasonalAdjustment: seasonalAdjustmentText || undefined,
            });
          }
        }
      }
    });

    return tasks;
  }, []);

  // 从巡查记录生成病虫害预警
  const generatePestAlertFromInspection = useCallback((inspectionReport: string, cropName: string): PredictedTask | null => {
    const pestRules = useCropGrowthConfigStore.getState().getPestAlertRules();
    for (const rule of pestRules) {
      if (!rule.cropType.includes(cropName)) continue;

      const matchedSymptom = rule.symptom.find(s => inspectionReport.includes(s));
      if (matchedSymptom) {
        const today = new Date();
        return {
          id: `pest_${Date.now()}_${rule.id}`,
          batchId: '',
          batchCode: '',
          cropName,
          greenhouseName: '',
          taskType: 'spraying',
          typeName: '病虫防治',
          priority: rule.priority,
          dueDate: today.toISOString().split('T')[0],
          reason: `预警：${rule.name} - ${matchedSymptom}。${rule.suggestion}`,
          source: 'pest_alert',
          estimatedHours: 2,
          requiredSkills: ['农药配制', '喷雾操作', '生物防治'],
          status: 'alert',
        };
      }
    }
    return null;
  }, []);

  // 刷新所有预测
  const refreshPredictions = useCallback(() => {
    const growthTasks = generateGrowthStageTasks();
    setPredictedTasks(growthTasks.filter(t => t.source === 'growth_stage'));
    setOverdueTasks(growthTasks.filter(t => t.source === 'overdue'));
  }, [generateGrowthStageTasks]);

  // 初始加载和定期刷新
  useEffect(() => {
    refreshPredictions();

    // 每5分钟刷新一次
    const interval = setInterval(refreshPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshPredictions]);

  // 将环境告警触发的任务合并到 pestAlerts 中
  useEffect(() => {
    if (alertTriggeredTasks.length > 0) {
      setPestAlerts(prev => {
        // 过滤掉已有的环境告警任务，避免重复添加
        const existingAlertIds = prev.filter(t => t.source === 'env_alert').map(t => t.id);
        const newAlerts = alertTriggeredTasks.filter(t => !existingAlertIds.includes(t.id));
        if (newAlerts.length === 0) return prev;
        return [...prev, ...newAlerts] as PredictedTask[];
      });
    }
  }, [alertTriggeredTasks]);

  return {
    predictedTasks,
    overdueTasks,
    pestAlerts,
    refreshPredictions,
    getBatchCurrentStage,
    generatePestAlertFromInspection,
  };
}
