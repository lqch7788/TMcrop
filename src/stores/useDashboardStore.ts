/**
 * Dashboard 总览 Store
 *
 * 架构：enhancedApiClient → /api/summary/* → SQLite 汇总表
 * 数据流：Store → 组件（组件不直接读写 localStorage）
 * 参考：iotStore.ts 的 FIELD_MAP + normalize 模式
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { getYieldStats, type YieldStatsItem } from '../services/summaryService';
import { getCostStats, type CostStatsResult } from '../services/costService';

// ========== 类型定义 ==========

/** 批次统计数据项（后端已返回 camelCase） */
export interface BatchStatItem {
  id: number;
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

/** 概览统计数据 */
export interface DashboardStats {
  totalBatches: number;
  totalYield: number;
  totalCost: number;
  totalLabor: number;
}

/** 告警分类明细（匹配 AlertsCard UI） */
export interface AlertsBreakdown {
  total: number;
  environment: number;
  equipment: number;
  pest: number;
  farming: number;
}

// ========== 字段映射表：后端(snake_case) → 前端(camelCase) ==========

/** 概览 API 返回字段映射 */
const OVERVIEW_FIELD_MAP: Record<string, string> = {
  month_total_yield: 'totalYield',
  month_harvest_count: 'harvestCount',
  month_total_amount: 'totalAmount',
  total_tasks: 'totalTasks',
  completed_tasks: 'completedTasks',
  in_progress_tasks: 'inProgressTasks',
  pending_tasks: 'pendingTasks',
  completion_rate: 'completionRate',
  total_hours: 'totalHours',
  total_labor_cost: 'totalLaborCost',
  total_problems: 'totalProblems',
  resolved_problems: 'resolvedProblems',
  resolution_rate: 'resolutionRate',
  active_count: 'activeCount',
};

/** 批次统计后端字段映射（后端 SQL 别名已是 camelCase，此映射作兜底） */
const BATCH_FIELD_MAP: Record<string, string> = {
  plan_code: 'batchCode',
  plan_name: 'batchName',
  crop_name: 'cropName',
  crop_variety: 'variety',
  greenhouse_name: 'greenhouse',
  area_name: 'plantingArea',
  planned_quantity: 'targetYield',
  actual_quantity: 'actualQuantity',
  planting_date: 'plantingDate',
  expected_harvest_date: 'expectedHarvestDate',
  actual_harvest_date: 'actualHarvestDate',
  completion_rate: 'completionRate',
};

/** 将后端 snake_case 对象转为前端 camelCase */
function normalizeWithMap(raw: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...raw };
  for (const [snake, camel] of Object.entries(fieldMap)) {
    if (snake in result) {
      result[camel] = result[snake];
    }
  }
  return result;
}

/**
 * 从概览 API 原始数据提取 DashboardStats
 *
 * 2026-09-29 修复：原按蛇形键读取（month_total_yield 等），但 /api/summary/overview
 * 实际返回驼峰键（后端 queryToObjects + 响应中间件双重转换），导致基地总览的
 * 批次/产量/成本/工时四个统计恒为 0。现统一按驼峰读取。
 */
function extractDashboardStats(overviewData: Record<string, unknown>): DashboardStats {
  const yieldData = (overviewData.yield as Record<string, unknown>) || {};
  const batchData = (overviewData.batch as Record<string, unknown>) || {};
  const laborData = (overviewData.labor as Record<string, unknown>) || {};

  return {
    totalBatches: (batchData.activeCount as number) || 0,
    totalYield: (yieldData.monthTotalYield as number) || 0,
    totalCost: (laborData.totalLaborCost as number) || 0,
    totalLabor: (laborData.totalHours as number) || 0,
  };
}

// ========== Store 接口 ==========

interface DashboardState {
  /** 批次统计列表 */
  batchStats: BatchStatItem[];
  /** 概览统计数据 */
  dashboardStats: DashboardStats;
  /** 告警分类统计 */
  alertsBreakdown: AlertsBreakdown;
  /** 月度产量统计（/api/summary/yield-stats group_by=month，2026-10-11 接入） */
  yieldStats: YieldStatsItem[];
  /** 按作物的产量合计（用于作物筛选下拉选项） */
  yieldByCrop: YieldStatsItem[];
  /** 成本统计数据（/api/summary/cost-stats，2026-10-11 接入） */
  costStats: CostStatsResult['data'] | null;
  /** 加载状态 */
  isLoading: boolean;
  error: string | null;

  /** 获取批次统计数据 */
  fetchBatchStats: (params?: Record<string, string>) => Promise<void>;
  /** 获取概览统计数据 */
  fetchDashboardStats: () => Promise<void>;
  /** 获取产量统计（月度 + 按作物，供基地总览产量图） */
  fetchYieldStats: (params?: { crop_name?: string }) => Promise<void>;
  /** 获取成本统计（人工 + 物料 + 能源，供基地总览成本图/能耗卡） */
  fetchCostStats: () => Promise<void>;
}

// ========== Store 实现 ==========

export const useDashboardStore = create<DashboardState>()(
  (set)=> ({
      // 初始数据
      batchStats: [],
      dashboardStats: { totalBatches: 0, totalYield: 0, totalCost: 0, totalLabor: 0 },
      alertsBreakdown: { total: 0, environment: 0, equipment: 0, pest: 0, farming: 0 },
      yieldStats: [],
      yieldByCrop: [],
      costStats: null,
      isLoading: false,
      error: null,

      /** 获取批次统计 - 调用 /api/summary/batch-stats */
      fetchBatchStats: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (params?.crop_name) queryParams.set('crop_name', params.crop_name);
          if (params?.status) queryParams.set('status', params.status);
          if (params?.greenhouse_name) queryParams.set('greenhouse_name', params.greenhouse_name);
          if (params?.page) queryParams.set('page', params.page);
          if (params?.limit) queryParams.set('limit', params.limit);

          const queryString = queryParams.toString();
          const url = `/summary/batch-stats${queryString ? `?${queryString}` : ''}`;

          const response = await enhancedApiClient.get<{ success: boolean; data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(url);

          // enhancedApiClient 已自动提取 .data，response 直接就是数组
          const list = Array.isArray(response) ? response : [];
          const normalized = list.map((item) =>
            normalizeWithMap(item as Record<string, unknown>, BATCH_FIELD_MAP)
          ) as unknown as BatchStatItem[];
          set({ batchStats: normalized, isLoading: false });
        } catch (error) {
          // logger.warn('[DashboardStore] 获取批次统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /** 获取概览统计 - 调用 /api/summary/overview + /api/alerts */
      fetchDashboardStats: async () => {
        set({ isLoading: true, error: null });
        try {
          // 并行获取概览数据和告警统计
          // 注意：enhancedApiClient 已自动解包 { success, data } 外层，返回的即 data 本体
          const [overviewRes, alertsRes] = await Promise.all([
            enhancedApiClient.get<Record<string, unknown>>('/summary/overview'),
            enhancedApiClient.get<Record<string, unknown>>('/alerts/stats/summary').catch(() => null),
          ]);

          // 处理概览数据
          if (overviewRes) {
            const stats = extractDashboardStats(overviewRes);
            set({ dashboardStats: stats });
          }

          // 处理告警数据
          if (alertsRes) {
            const alertData = alertsRes as Record<string, unknown>;
            set({
              alertsBreakdown: {
                total: (alertData.total as number) || 0,
                environment: (alertData.critical as number) || 0,  // critical 告警 → 环境告警
                equipment: (alertData.warning as number) || 0,      // warning 告警 → 设备故障
                pest: (alertData.info as number) || 0,              // info 告警 → 病虫害
                farming: (alertData.pending as number) || 0,        // pending → 农事告警
              },
            });
          }

          set({ isLoading: false });
        } catch (error) {
          // logger.warn('[DashboardStore] 获取概览统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /** 获取产量统计 - 月度 + 按作物两组（2026-10-11：替代 farmData.yieldStats mock） */
      fetchYieldStats: async (params) => {
        try {
          // 并发拉月度数据（图表主数据）与按作物数据（作物筛选下拉选项）
          const [monthly, byCrop] = await Promise.all([
            getYieldStats({ group_by: 'month', crop_name: params?.crop_name }),
            getYieldStats({ group_by: 'crop' }),
          ]);
          set({
            yieldStats: Array.isArray(monthly) ? monthly : [],
            yieldByCrop: Array.isArray(byCrop) ? byCrop : [],
          });
        } catch (error) {
          // Fail Loud：保留错误信息供 UI 显示，不清空已有数据
          set({ error: (error as Error).message });
        }
      },

      /** 获取成本统计 - 人工/物料/能源（2026-10-11：替代 farmData.costAnalysis mock） */
      fetchCostStats: async () => {
        try {
          const result = await getCostStats();
          set({ costStats: result.data });
        } catch (error) {
          // Fail Loud：保留错误信息供 UI 显示
          set({ error: (error as Error).message });
        }
      },
    })
);
