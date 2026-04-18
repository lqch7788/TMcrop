/**
 * 生产汇总数据聚合服务
 * 用于 PlanSummary 页面和成本对比分析
 */

import { cropBatches, tasks, workLogs, attendanceRecords, materialReceivings } from './mockData';
import type { BatchSummaryRow, BatchCostDetail, CostComparison } from '../types/views';

// WorkLog 和 Attendance 的 batchId 关联通过 useWorkLog 和 useWorkerAttendance 的 mock 数据提供
// 这里使用静态导入的方式获取 batchId 关联数据

/**
 * 按批次聚合工时
 */
function aggregateWorkHoursByBatch(): Record<string, number> {
  const result: Record<string, number> = {};

  // 从 workLogs 聚合（workLogs 已有 batchId）
  workLogs.forEach(log => {
    if (log.batchId) {
      result[log.batchId] = (result[log.batchId] || 0) + (log.workDuration || 8);
    }
  });

  return result;
}

/**
 * 按批次聚合人工成本
 * 人工成本 = 工时 × 时薪（默认 35 元/小时）
 */
function aggregateLaborCostByBatch(): Record<string, number> {
  const result: Record<string, number> = {};
  const HOURLY_RATE = 35; // 默认时薪

  workLogs.forEach(log => {
    if (log.batchId) {
      const hours = log.workDuration || 8;
      result[log.batchId] = (result[log.batchId] || 0) + (hours * HOURLY_RATE);
    }
  });

  return result;
}

/**
 * 按批次聚合物料成本
 */
function aggregateMaterialCostByBatch(): Record<string, number> {
  const result: Record<string, number> = {};

  materialReceivings.forEach(record => {
    if (record.productionBatchCode) {
      // 查找对应的批次
      const batch = cropBatches.find(b => b.batchCode === record.productionBatchCode);
      if (batch) {
        result[batch.id] = (result[batch.id] || 0) + (record.quantity * record.unitPrice);
      }
    }
  });

  return result;
}

/**
 * 获取所有批次的汇总数据
 */
export function getBatchSummaries(): BatchSummaryRow[] {
  const workHoursMap = aggregateWorkHoursByBatch();
  const laborCostMap = aggregateLaborCostByBatch();
  const materialCostMap = aggregateMaterialCostByBatch();

  return cropBatches.map(batch => {
    // 聚合该批次的任务
    const batchTasks = tasks.filter(t => t.batchId === batch.id);
    const completedTasks = batchTasks.filter(t => t.status === 'completed');

    // 计算完成率
    const completionRate = batchTasks.length > 0
      ? ((completedTasks.length / batchTasks.length) * 100).toFixed(1) + '%'
      : '0%';

    // 获取温室名称
    const greenhouseName = typeof batch.greenhouse === 'string'
      ? batch.greenhouse
      : batch.greenhouseName || '';

    return {
      id: batch.id,
      batchCode: batch.batchCode,
      cropName: batch.cropName,
      variety: batch.variety,
      greenhouse: greenhouseName,
      plantingArea: batch.plantingArea,
      targetYield: batch.targetYield,
      actualYield: batch.actualYield,
      completionRate,
      status: batch.status as BatchSummaryRow['status'],
      statusClass: getStatusClass(completionRate, batch.status),
      taskCount: batchTasks.length,
      completedTaskCount: completedTasks.length,
      totalWorkHours: workHoursMap[batch.id] || 0,
      laborCost: laborCostMap[batch.id] || 0,
      materialCost: materialCostMap[batch.id] || 0,
    };
  });
}

/**
 * 获取批次成本明细
 */
export function getBatchCostDetail(batchId: string): BatchCostDetail | null {
  const batch = cropBatches.find(b => b.id === batchId);
  if (!batch) return null;

  const laborCost = aggregateLaborCostByBatch()[batchId] || 0;
  const materialCost = aggregateMaterialCostByBatch()[batchId] || 0;

  // 其他成本（预留，暂无数据）
  const equipmentCost = 0;
  const energyCost = 0;
  const otherCost = 0;

  const totalCost = laborCost + materialCost + equipmentCost + energyCost + otherCost;

  // 计算单位成本（按实际产量）
  const unitCost = batch.actualYield > 0 ? totalCost / batch.actualYield : 0;

  return {
    laborCost,
    materialCost,
    equipmentCost,
    energyCost,
    otherCost,
    totalCost,
    unitCost,
  };
}

/**
 * 获取成本对比数据（预算 vs 实际）
 */
export function getCostComparison(): CostComparison[] {
  return cropBatches.map(batch => {
    const laborCost = aggregateLaborCostByBatch()[batch.id] || 0;
    const materialCost = aggregateMaterialCostByBatch()[batch.id] || 0;
    const actualCost = laborCost + materialCost;

    // 预算成本：使用目标产量 × 预算单成本（假设 2 元/斤）
    const BUDGET_UNIT_COST = 2; // 元/斤
    const budgetCost = batch.targetYield * BUDGET_UNIT_COST;

    const variance = actualCost - budgetCost;
    const varianceRate = budgetCost > 0 ? (variance / budgetCost) * 100 : 0;

    return {
      batchId: batch.id,
      batchCode: batch.batchCode,
      budgetCost,
      actualCost,
      variance,
      varianceRate,
    };
  });
}

/**
 * 获取状态样式
 */
function getStatusClass(completionRate: string, status: string): 'normal' | 'warning' | 'danger' {
  if (status === 'completed') return 'normal';
  if (status === 'cancelled' || status === 'suspended') return 'danger';

  const rate = parseFloat(completionRate);
  if (rate >= 80) return 'normal';
  if (rate >= 50) return 'warning';
  return 'danger';
}

/**
 * 获取批次产量统计
 */
export function getBatchYieldStats(batchId: string) {
  const batch = cropBatches.find(b => b.id === batchId);
  if (!batch) return null;

  const batchTasks = tasks.filter(t => t.batchId === batchId);
  const completedTasks = batchTasks.filter(t => t.status === 'completed');

  const completionRate = batchTasks.length > 0
    ? (completedTasks.length / batchTasks.length) * 100
    : 0;

  return {
    batchId,
    targetYield: batch.targetYield,
    actualYield: batch.actualYield,
    completionRate,
    qualifiedRate: 95, // 预留
    lossRate: 5, // 预留
  };
}

/**
 * 获取批次工时统计
 */
export function getBatchWorkHourStats(batchId: string) {
  const workHoursMap = aggregateWorkHoursByBatch();
  const batch = cropBatches.find(b => b.id === batchId);
  if (!batch) return null;

  const batchTasks = tasks.filter(t => t.batchId === batchId);
  const plannedHours = batchTasks.reduce((sum, t) => sum + (t.estimatedHours || 8), 0);
  const actualHours = workHoursMap[batchId] || 0;

  return {
    batchId,
    plannedHours,
    actualHours,
    efficiency: plannedHours > 0 ? (actualHours / plannedHours) * 100 : 0,
    overtimeHours: Math.max(0, actualHours - plannedHours),
  };
}

export default {
  getBatchSummaries,
  getBatchCostDetail,
  getCostComparison,
  getBatchYieldStats,
  getBatchWorkHourStats,
};
