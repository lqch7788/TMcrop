/**
 * 生产计划人工成本统计 Hook
 *
 * 设计文档 3.5 节要求：
 * - LaborCostSummary 接口：按生产计划单号聚合人工成本
 * - calculateLaborCost：基于任务工时计算人工费
 *
 * 数据源：useTasks（来自 farmTaskStore → API）
 * 费率来源：COST_CONFIG.LABOR_RATE_PER_HOUR（可被后端配置覆盖）
 */

import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { COST_CONFIG, calculateLaborCost as calcLaborCost } from '../data/costConfig';

// ========== 类型定义 ==========

/** 按生产计划汇总的人工成本条目 */
export interface LaborCostItem {
  /** 生产计划单号 */
  productionPlanCode: string;
  /** 总工时（小时） */
  totalHours: number;
  /** 总人工费（元） */
  totalLaborCost: number;
  /** 关联任务数 */
  taskCount: number;
  /** 关联的任务ID列表 */
  taskIds: string[];
  /** 费率达到率（元/小时） */
  rate: number;
}

/** 人工成本汇总 */
export interface LaborCostSummary {
  /** 总工时 */
  grandTotalHours: number;
  /** 总人工费 */
  grandTotalCost: number;
  /** 按计划分组明细 */
  byPlan: LaborCostItem[];
  /** 按执行人分组明细 */
  byWorker: { workerId: string; workerName: string; totalHours: number; totalCost: number; taskCount: number }[];
  /** 按区域分组明细 */
  byGreenhouse: { greenhouse: string; totalHours: number; totalCost: number; taskCount: number }[];
}

// ========== 计算函数 ==========

/**
 * 根据工时计算人工费（使用配置的费率）
 */
export function calculateLaborCost(hours: number, rate?: number): number {
  return calcLaborCost(hours) * (rate ? rate / COST_CONFIG.LABOR_RATE_PER_HOUR : 1);
}

/** 从任务列表中按完成状态过滤可计费任务 */
function getBillableTasks(tasks: ReturnType<typeof useTasks>['tasks']) {
  return tasks.filter(
    t => (t.status === 'completed' || t.status === 'waiting_acceptance') && t.estimatedHours && t.estimatedHours > 0
  );
}

// ========== Hook ==========

/**
 * 生产计划人工成本统计 Hook
 * 从 useTasks 获取所有任务，按生产计划/执行人/区域聚合人工成本
 */
export function useLaborCostCalc() {
  const { tasks } = useTasks();

  /** 默认费率（后续可从后端配置覆盖） */
  const rate = COST_CONFIG.LABOR_RATE_PER_HOUR;

  const summary: LaborCostSummary = useMemo(() => {
    const billable = getBillableTasks(tasks);

    // 按生产计划聚合
    const planMap = new Map<string, { totalHours: number; taskIds: string[] }>();
    const workerMap = new Map<string, { workerName: string; totalHours: number; taskCount: number }>();
    const greenhouseMap = new Map<string, { totalHours: number; taskCount: number }>();

    billable.forEach(task => {
      const hours = task.estimatedHours || 0;

      // 按生产计划
      const planCode = (task as Record<string, unknown>).productionPlanCode as string || task.greenhouseName || '未关联';
      const plan = planMap.get(planCode) || { totalHours: 0, taskIds: [] };
      plan.totalHours += hours;
      plan.taskIds.push(task.id);
      planMap.set(planCode, plan);

      // 按执行人
      const wKey = task.assigneeId || task.assigneeName || '未分配';
      const worker = workerMap.get(wKey) || { workerName: task.assigneeName || '未分配', totalHours: 0, taskCount: 0 };
      worker.totalHours += hours;
      worker.taskCount += 1;
      workerMap.set(wKey, worker);

      // 按区域
      const gh = task.greenhouseName || '未指定';
      const ghItem = greenhouseMap.get(gh) || { totalHours: 0, taskCount: 0 };
      ghItem.totalHours += hours;
      ghItem.taskCount += 1;
      greenhouseMap.set(gh, ghItem);
    });

    const byPlan: LaborCostItem[] = Array.from(planMap.entries()).map(([code, data]) => ({
      productionPlanCode: code,
      totalHours: Math.round(data.totalHours * 100) / 100,
      totalLaborCost: Math.round(calculateLaborCost(data.totalHours) * 100) / 100,
      taskCount: data.taskIds.length,
      taskIds: data.taskIds,
      rate,
    }));

    const byWorker = Array.from(workerMap.entries()).map(([id, data]) => ({
      workerId: id,
      workerName: data.workerName,
      totalHours: Math.round(data.totalHours * 100) / 100,
      totalCost: Math.round(calculateLaborCost(data.totalHours) * 100) / 100,
      taskCount: data.taskCount,
    }));

    const byGreenhouse = Array.from(greenhouseMap.entries()).map(([name, data]) => ({
      greenhouse: name,
      totalHours: Math.round(data.totalHours * 100) / 100,
      totalCost: Math.round(calculateLaborCost(data.totalHours) * 100) / 100,
      taskCount: data.taskCount,
    }));

    const grandTotalHours = Math.round(Array.from(planMap.values()).reduce((s, d) => s + d.totalHours, 0) * 100) / 100;
    const grandTotalCost = Math.round(calculateLaborCost(grandTotalHours) * 100) / 100;

    return {
      grandTotalHours,
      grandTotalCost,
      byPlan,
      byWorker,
      byGreenhouse,
    };
  }, [tasks, rate]);

  return { summary, tasks, rate };
}
