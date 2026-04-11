/**
 * 生产汇总表视图类型定义
 * 用于聚合多个数据源的视图类型
 */

import type { ReactNode } from 'react';

/**
 * 批次汇总行（用于 PlanSummary 表格）
 */
export interface BatchSummaryRow {
  id: string;
  batchCode: string;           // 批次编号
  cropName: string;            // 作物名称
  variety: string;            // 品种
  greenhouse: string;          // 温室
  plantingArea: number;        // 种植面积(亩)
  targetYield: number;         // 目标产量(kg)
  actualYield: number;         // 实际产量(kg)
  completionRate: string;      // 完成率
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'suspended';
  statusClass: 'normal' | 'warning' | 'danger';
  // 扩展字段（新增）
  taskCount: number;          // 关联任务数
  completedTaskCount: number;  // 已完成任务数
  totalWorkHours: number;      // 总工时
  laborCost: number;          // 人工成本(元)
  materialCost: number;       // 物料成本(元)
}

/**
 * 统计卡片配置（用于 StatCards 组件）
 */
export interface SummaryStatCard {
  label: string;               // 卡片标签
  value: string | number;      // 卡片数值
  icon: ReactNode;            // 图标
  iconBgColor: string;        // 图标背景色
  trend?: number;             // 变化趋势(百分比)
  trendDirection?: 'up' | 'down';
}

/**
 * 成本对比
 */
export interface CostComparison {
  batchId: string;
  batchCode: string;
  budgetCost: number;         // 预算成本
  actualCost: number;         // 实际成本
  variance: number;           // 差异金额
  varianceRate: number;       // 差异率(%)
}

/**
 * 批次详情Tab类型
 */
export type BatchDetailTab = 'tasks' | 'worklogs' | 'costs' | 'attendance';

/**
 * 批次筛选条件
 */
export interface BatchFilters {
  cropName?: string;
  status?: string;
  greenhouse?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 批次产量统计
 */
export interface BatchYieldStats {
  batchId: string;
  targetYield: number;
  actualYield: number;
  completionRate: number;
  qualifiedRate?: number;     // 合格率
  lossRate?: number;          // 损耗率
}

/**
 * 批次工时统计
 */
export interface BatchWorkHourStats {
  batchId: string;
  plannedHours: number;       // 计划工时
  actualHours: number;        // 实际工时
  efficiency: number;         // 工时效率
  overtimeHours: number;      // 加班工时
}

/**
 * 批次成本明细
 */
export interface BatchCostDetail {
  laborCost: number;          // 人工成本
  materialCost: number;        // 物料成本
  equipmentCost: number;       // 设备成本
  energyCost: number;         // 能源成本
  otherCost: number;          // 其他成本
  totalCost: number;          // 总成本
  unitCost: number;           // 单位成本(元/斤)
}

/**
 * 筛选器配置项
 */
export interface BatchFilterSelect {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * 表格列定义
 */
export interface BatchTableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, record: T) => ReactNode;
}

// ============ 每日工单汇总类型 ============

/**
 * 每日工单汇总行（用于 DailyWorkSummary 表格）
 */
export interface DailyWorkSummaryRow {
  id: string;               // 日期作为ID
  date: string;             // 日期
  greenhouse: string;        // 温室
  crop: string;             // 作物
  taskType: string;         // 作业类型
  plannedArea: number;      // 计划面积(亩)
  completedArea: number;     // 完成面积(亩)
  workerCount: number;       // 作业人数
  workHours: number;         // 工时
  status: string;           // 状态
  completionRate: string;    // 完成率
}

/**
 * 每日工单统计卡片配置
 */
export interface DailyWorkStatCard {
  label: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
}

/**
 * 每日工单筛选条件
 */
export interface DailyWorkFilters {
  date?: string;
  greenhouse?: string;
  taskType?: string;
}

// ============ 每日问题汇总类型 ============

/**
 * 每日问题汇总行（用于 DailyProblemSummary 表格）
 */
export interface DailyProblemSummaryRow {
  id: string;
  date: string;
  greenhouse: string;
  crop: string;
  worker: string;
  problemType: string;
  description: string;
  severity: string;
  status: string;
  handler: string;
}

/**
 * 每日问题统计卡片配置
 */
export interface DailyProblemStatCard {
  label: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
}

/**
 * 每日问题筛选条件
 */
export interface DailyProblemFilters {
  date?: string;
  greenhouse?: string;
}

// ============ 生产报表类型 ============

/**
 * 生产报表统计卡片配置
 */
export interface ReportStatCard {
  label: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
}

/**
 * 图表数据项（用于报表组件）
 */
export interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}
