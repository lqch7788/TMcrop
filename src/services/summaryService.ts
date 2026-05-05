/**
 * 生产汇总统计 API 服务
 * 对接后端 /api/summary 和 /api/problems/daily-summary
 */

import { apiClient, USE_API } from './apiClient';

// ============================================
// 类型定义
// ============================================

/** 批次汇总统计项 */
export interface BatchStatsItem {
  id: string;
  batchCode: string;
  batchName: string;
  cropName: string;
  variety: string;
  greenhouse: string;
  plantingArea: string;
  targetYield: number;
  actualQuantity: number;
  harvestQuantity: number;
  completionRate: number;
  status: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string;
  taskCount: number;
  completedTaskCount: number;
  pendingTaskCount: number;
  inProgressTaskCount: number;
  totalWorkHours: number;
  laborCost: number;
  remainingYield: number;
}

/** 产量统计项 */
export interface YieldStatsItem {
  name: string;
  value: number;
  count?: number;
  avg_price?: number;
  total_amount?: number;
  year?: string;
  month?: string;
}

/** 成本统计项 */
export interface CostStatsItem {
  cost_type: string;
  month: string;
  work_hours: number;
  total_amount: number;
  worker_count: number;
}

/** 人工统计项 */
export interface LaborStatsItem {
  name: string;
  hours: number;
  amount: number;
  work_count?: number;
  avg_daily_hours?: number;
  worker_count?: number;
  year?: string;
  month?: string;
}

/** 人工统计汇总 */
export interface LaborStatsSummary {
  total_hours: number;
  total_amount: number;
  avg_hourly_rate: number;
}

/** 问题统计概览 */
export interface ProblemSummaryOverview {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
  month_new: number;
  trend: number;
  resolution_rate: number;
}

/** 问题每日汇总项 */
export interface ProblemDailyItem {
  date: string;
  month: string;
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

/** 生产报表概览 */
export interface ProductionOverview {
  yield: {
    month_harvest_count: number;
    month_total_yield: number;
    month_total_amount: number;
  };
  task: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    pending_tasks: number;
    completion_rate: number;
  };
  labor: {
    total_hours: number;
    total_labor_cost: number;
  };
  problem: {
    total_problems: number;
    resolved_problems: number;
    resolution_rate: number;
  };
  batch: {
    active_count: number;
  };
}

/** 生产指标数据 */
export interface ProductionIndicators {
  period: { start: string; end: string };
  yield: {
    total_yield: number;
    harvest_count: number;
    avg_yield_per_harvest: number;
  };
  task: {
    total: number;
    completed: number;
    completion_rate: number;
  };
  problem: {
    total: number;
    resolved: number;
    resolution_rate: number;
  };
  labor: {
    total_hours: number;
    total_cost: number;
    worker_count: number;
    efficiency: number;
  };
  overall_score: number;
}

// ============================================
// 批次统计 API
// ============================================

/**
 * 获取批次汇总统计
 * GET /api/summary/batch-stats
 */
export async function getBatchStats(filters?: {
  crop_name?: string;
  status?: string;
  greenhouse_name?: string;
  start_date?: string;
  end_date?: string;
}): Promise<BatchStatsItem[]> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.crop_name) params.crop_name = filters.crop_name;
      if (filters.status) params.status = filters.status;
      if (filters.greenhouse_name) params.greenhouse_name = filters.greenhouse_name;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
    }
    return apiClient.get<BatchStatsItem[]>('/summary/batch-stats', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 产量统计 API
// ============================================

/**
 * 获取产量统计
 * GET /api/summary/yield-stats
 */
export async function getYieldStats(filters?: {
  start_date?: string;
  end_date?: string;
  group_by?: 'month' | 'crop' | 'greenhouse' | 'quality';
  crop_name?: string;
  greenhouse_name?: string;
}): Promise<YieldStatsItem[]> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.group_by) params.group_by = filters.group_by;
      if (filters.crop_name) params.crop_name = filters.crop_name;
      if (filters.greenhouse_name) params.greenhouse_name = filters.greenhouse_name;
    }
    return apiClient.get<YieldStatsItem[]>('/summary/yield-stats', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 成本统计 API
// ============================================

/**
 * 获取成本统计
 * GET /api/summary/cost-stats
 */
export async function getCostStats(filters?: {
  start_date?: string;
  end_date?: string;
  group_by?: 'month';
  batch_code?: string;
}): Promise<{
  byMonth: CostStatsItem[];
  summary: {
    total_labor_cost: number;
    total_work_hours: number;
    avg_hourly_rate: number;
  };
}> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.group_by) params.group_by = filters.group_by;
      if (filters.batch_code) params.batch_code = filters.batch_code;
    }
    return apiClient.get('/summary/cost-stats', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 人工统计 API
// ============================================

/**
 * 获取人工工时统计
 * GET /api/summary/labor-stats
 */
export async function getLaborStats(filters?: {
  start_date?: string;
  end_date?: string;
  group_by?: 'month' | 'worker' | 'greenhouse' | 'task';
  greenhouse_name?: string;
  worker_name?: string;
}): Promise<{
  details: LaborStatsItem[];
  summary: LaborStatsSummary;
}> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.group_by) params.group_by = filters.group_by;
      if (filters.greenhouse_name) params.greenhouse_name = filters.greenhouse_name;
      if (filters.worker_name) params.worker_name = filters.worker_name;
    }
    return apiClient.get('/summary/labor-stats', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 问题统计 API
// ============================================

/**
 * 获取每日问题汇总
 * GET /api/problems/daily-summary
 */
export async function getProblemDailySummary(filters?: {
  start_date?: string;
  end_date?: string;
  greenhouse_name?: string;
  group_by?: 'date' | 'greenhouse' | 'status' | 'priority';
}): Promise<ProblemDailyItem[]> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.greenhouse_name) params.greenhouse_name = filters.greenhouse_name;
      if (filters.group_by) params.group_by = filters.group_by;
    }
    return apiClient.get<ProblemDailyItem[]>('/problems/daily-summary', params);
  }
  throw new Error('本地服务模式未实现');
}

/**
 * 获取问题统计概览
 * GET /api/problems/summary-overview
 */
export async function getProblemSummaryOverview(filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<ProblemSummaryOverview> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
    }
    return apiClient.get<ProblemSummaryOverview>('/problems/summary-overview', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 生产报表概览 API
// ============================================

/**
 * 获取生产报表概览
 * GET /api/summary/overview
 */
export async function getProductionOverview(filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<ProductionOverview> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
    }
    return apiClient.get<ProductionOverview>('/summary/overview', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 生产指标 API
// ============================================

/**
 * 获取生产指标统计
 * GET /api/summary/indicators
 */
export async function getProductionIndicators(filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<ProductionIndicators> {
  if (USE_API) {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
    }
    return apiClient.get<ProductionIndicators>('/summary/indicators', params);
  }
  throw new Error('本地服务模式未实现');
}

// ============================================
// 便捷组合函数
// ============================================

/**
 * 获取完整生产汇总数据（一次性获取所有统计数据）
 * 用于生产汇总表页面初始化
 */
export async function getFullProductionSummary(filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<{
  overview: ProductionOverview;
  yieldStats: YieldStatsItem[];
  laborStats: { details: LaborStatsItem[]; summary: LaborStatsSummary };
  problemSummary: ProblemSummaryOverview;
}> {
  const [overview, yieldStats, laborStats, problemSummary] = await Promise.all([
    getProductionOverview(filters),
    getYieldStats({ ...filters, group_by: 'month' }),
    getLaborStats({ ...filters, group_by: 'month' }),
    getProblemSummaryOverview(filters),
  ]);

  return { overview, yieldStats, laborStats, problemSummary };
}
