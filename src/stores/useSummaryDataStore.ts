/**
 * 生产汇总数据 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage（三级降级）
 * 数据流：Store → 组件（组件不直接读写 localStorage）
 *
 * 对接后端：
 * - /api/summary/overview     → 生产报表概览
 * - /api/summary/yield-stats  → 产量统计
 * - /api/summary/cost-stats   → 成本统计
 * - /api/summary/labor-stats  → 人工统计
 * - /api/summary/batch-stats  → 批次汇总
 * - /api/summary/indicators   → 生产指标
 * - /api/problems/daily-summary  → 问题每日汇总
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

/** 生产报表概览（前端驼峰命名，嵌套结构匹配API响应） */
export interface SummaryOverview {
  yield: {
    monthHarvestCount: number;
    monthTotalYield: number;
    monthTotalAmount: number;
  };
  task: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  labor: {
    totalHours: number;
    totalLaborCost: number;
  };
  problem: {
    totalProblems: number;
    resolvedProblems: number;
    resolutionRate: number;
  };
  batch: {
    activeCount: number;
    totalBatches: number;     // Phase 0 后端补充
  };
  totalCost: number;           // Phase 0 后端补充：人工+物料+能源
}

/** 产量统计项（queryToObjects返回驼峰命名） */
export interface YieldStatItem {
  name: string;
  value: number;
  count: number;
  avgPrice?: number;
  totalAmount?: number;
  year?: string;
  month?: string;
}

/** 成本明细项（扁平化后统一结构） */
export interface CostDetailItem {
  costCategory: 'labor' | 'material' | 'energy';
  costType: string;
  costTypeCode?: string;
  costName?: string;
  month: string;
  totalQuantity?: number;
  totalAmount: number;
  recordCount?: number;
  workHours?: number;
  workerCount?: number;
}

/** 成本汇总（从数据数组客户端计算） */
export interface CostSummary {
  totalLaborCost: number;
  totalMaterialCost: number;
  totalEnergyCost: number;
  totalCost: number;
  totalWorkHours: number;
  avgHourlyRate: number;
}

/** 人工统计项（queryToObjects返回驼峰命名） */
export interface LaborStatItem {
  name: string;
  hours: number;
  amount: number;
  year?: string;
  month?: string;
  workerCount?: number;
  workCount?: number;
  taskCount?: number;
  avgDailyHours?: number;
}

/** 全链条追溯环节记录项 */
export interface ChainStageItem {
  id: string;
  code: string;
  name?: string;
  cropName?: string;
  variety?: string;
  greenhouse?: string;
  quantity?: number;
  status?: string;
  supplierName?: string;
  unit?: string;
  survivalRate?: number;
  unitPrice?: number;
  totalAmount?: number;
  qualityGrade?: string;
  warehouseName?: string;
  [key: string]: unknown;
}

/** 全链条追溯阶段统计 */
export interface ChainStageStat {
  key: string;
  label: string;
  count: number;
  detail?: Record<string, unknown> | Array<Record<string, unknown>>;
  items?: ChainStageItem[];
}

/** 批次汇总统计项（queryToObjects返回驼峰命名） */
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
  /** 是否有种源数据（全链条追溯） */
  hasSeedSource?: number;
  /** 是否有育苗数据（全链条追溯） */
  hasSeedling?: number;
  /** 是否有种植数据（全链条追溯） */
  hasPlanting?: number;
}

/** 问题每日汇总项（来自 /api/problems/daily-summary） */
export interface ProblemDailyItem {
  date: string;
  month: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

/** 生产指标（前端驼峰命名） */
export interface ProductionIndicator {
  period: { start: string; end: string };
  yield: {
    totalYield: number;
    harvestCount: number;
    avgYieldPerHarvest: number;
  };
  task: {
    total: number;
    completed: number;
    completionRate: number;
  };
  problem: {
    total: number;
    resolved: number;
    resolutionRate: number;
  };
  labor: {
    totalHours: number;
    totalCost: number;
    workerCount: number;
    efficiency: number;
  };
  overallScore: number;
}

/** 生产指标原始数据（后端蛇形命名，用于调试和原始数据追溯） */
export interface IndicatorsRaw {
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

// ========== 字段映射表 ==========

/** 后端蛇形 → 前端驼峰（overview 字段映射） */
function mapOverview(raw: Record<string, unknown>): SummaryOverview {
  const y = (raw.yield || {}) as Record<string, number>;
  const t = (raw.task || {}) as Record<string, number>;
  const l = (raw.labor || {}) as Record<string, number>;
  const p = (raw.problem || {}) as Record<string, number>;
  const b = (raw.batch || {}) as Record<string, number>;

  return {
    yield: {
      monthHarvestCount: y.month_harvest_count || 0,
      monthTotalYield: y.month_total_yield || 0,
      monthTotalAmount: y.month_total_amount || 0,
    },
    task: {
      totalTasks: t.total_tasks || 0,
      completedTasks: t.completed_tasks || 0,
      inProgressTasks: t.in_progress_tasks || 0,
      pendingTasks: t.pending_tasks || 0,
      completionRate: t.completion_rate || 0,
    },
    labor: {
      totalHours: l.total_hours || 0,
      totalLaborCost: l.total_labor_cost || 0,
    },
    problem: {
      totalProblems: p.total_problems || 0,
      resolvedProblems: p.resolved_problems || 0,
      resolutionRate: p.resolution_rate || 0,
    },
    batch: {
      activeCount: b.active_count || 0,
      totalBatches: b.total_batches || b.active_count || 0,
    },
    totalCost: (raw.total_cost as number) || 0,
  };
}

/** 后端蛇形 → 前端驼峰（indicators 字段映射） */
function mapIndicator(raw: Record<string, unknown>): ProductionIndicator {
  const y = (raw.yield || {}) as Record<string, number>;
  const t = (raw.task || {}) as Record<string, number>;
  const p = (raw.problem || {}) as Record<string, number>;
  const lab = (raw.labor || {}) as Record<string, number>;
  const period = (raw.period || { start: '', end: '' }) as { start: string; end: string };

  return {
    period,
    yield: {
      totalYield: y.total_yield || 0,
      harvestCount: y.harvest_count || 0,
      avgYieldPerHarvest: y.avg_yield_per_harvest || 0,
    },
    task: {
      total: t.total || 0,
      completed: t.completed || 0,
      completionRate: t.completion_rate || 0,
    },
    problem: {
      total: p.total || 0,
      resolved: p.resolved || 0,
      resolutionRate: p.resolution_rate || 0,
    },
    labor: {
      totalHours: lab.total_hours || 0,
      totalCost: lab.total_cost || 0,
      workerCount: lab.worker_count || 0,
      efficiency: lab.efficiency || 0,
    },
    overallScore: (raw.overall_score as number) || 0,
  };
}

/** 问题每日汇总后端蛇形 → 前端驼峰 */
function mapProblemItem(raw: Record<string, unknown>): ProblemDailyItem {
  return {
    date: (raw.date as string) || '',
    month: (raw.month as string) || '',
    total: (raw.total as number) || 0,
    pending: (raw.pending as number) || 0,
    inProgress: (raw.in_progress as number) || 0,
    resolved: (raw.resolved as number) || 0,
    highPriority: (raw.high_priority as number) || 0,
    mediumPriority: (raw.medium_priority as number) || 0,
    lowPriority: (raw.low_priority as number) || 0,
  };
}

/** 计算成本汇总（从 labor/material/energy 数组客户端聚合） */
function computeCostSummary(
  labor: CostDetailItem[],
  material: CostDetailItem[],
  energy: CostDetailItem[]
): CostSummary {
  const totalLaborCost = labor.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalMaterialCost = material.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalEnergyCost = energy.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalWorkHours = labor.reduce((sum, item) => sum + (Number(item.workHours) || 0), 0);

  return {
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
    totalEnergyCost: Math.round(totalEnergyCost * 100) / 100,
    totalCost: Math.round((totalLaborCost + totalMaterialCost + totalEnergyCost) * 100) / 100,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    avgHourlyRate: totalWorkHours > 0
      ? Math.round((totalLaborCost / totalWorkHours) * 100) / 100
      : 0,
  };
}

// ========== Store 接口 ==========

interface SummaryDataState {
  overview: SummaryOverview | null;
  yieldItems: YieldStatItem[];
  yieldGroupBy: string;
  costDetailItems: CostDetailItem[];
  costSummary: CostSummary | null;
  laborItems: LaborStatItem[];
  laborGroupBy: string;
  batchItems: BatchStatItem[];
  chainStages: ChainStageStat[];
  problemItems: ProblemDailyItem[];
  indicators: ProductionIndicator[];
  indicatorsRaw: IndicatorsRaw | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTimestamps: Record<string, number>;
  schemaVersion: number;

  fetchOverview: () => Promise<void>;
  fetchYieldStats: (params?: { groupBy?: string; startDate?: string; endDate?: string }) => Promise<void>;
  fetchCostStats: (params?: { batchCode?: string; startDate?: string; endDate?: string }) => Promise<void>;
  fetchLaborStats: (params?: { groupBy?: string; startDate?: string; endDate?: string }) => Promise<void>;
  fetchBatchStats: (params?: { cropName?: string; status?: string; greenhouse?: string }) => Promise<void>;
  fetchChainOverview: () => Promise<void>;
  fetchProblems: (params?: { startDate?: string; endDate?: string; greenhouse?: string }) => Promise<void>;
  fetchIndicators: (params?: { period?: string }) => Promise<void>;
  fetchAll: () => Promise<void>;
  invalidateAll: () => void;
  isCacheStale: (key: string, maxAgeMs: number) => boolean;
  // V10.0 多维度对比分析
  comparisonData: Record<string, any> | null;
  fetchComparisonStats: (params: {
    mainParam?: string; compareParam1?: string; compareParam2?: string;
    startDate?: string; endDate?: string; sampling?: string;
  }) => Promise<void>;
}

// ========== Store 实现 ==========

export const useSummaryDataStore = create<SummaryDataState>()(
  (set, get) => ({
      overview: null,
      yieldItems: [],
      yieldGroupBy: 'month',
      costDetailItems: [],
      costSummary: null,
      laborItems: [],
      laborGroupBy: 'month',
      batchItems: [],
      chainStages: [],
      problemItems: [],
      indicators: [],
      indicatorsRaw: null,
      isLoading: false,
      error: null,
      lastFetchTimestamps: {},
      schemaVersion: 1,
      comparisonData: null,

      /**
       * 获取生产报表概览
       * GET /api/summary/overview
       * 后端手动构造返回蛇形命名，前端做字段映射
       */
      fetchOverview: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await enhancedApiClient.get<Record<string, unknown>>('/summary/overview');
          // enhancedApiClient 已提取 .data，返回的值直接就是 overview 对象
          const overview = mapOverview(data as Record<string, unknown>);
          set({
            overview,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, overview: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取概览失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取产量统计
       * GET /api/summary/yield-stats?group_by={}&start_date={}&end_date={}
       * queryToObjects 返回驼峰命名，直接使用
       */
      fetchYieldStats: async (params) => {
        const groupBy = params?.groupBy || 'month';
        set({ isLoading: true, error: null, yieldGroupBy: groupBy });
        try {
          const queryParams = new URLSearchParams();
          queryParams.set('group_by', groupBy);
          if (params?.startDate) queryParams.set('start_date', params.startDate);
          if (params?.endDate) queryParams.set('end_date', params.endDate);

          const url = `/summary/yield-stats?${queryParams.toString()}`;
          const data = await enhancedApiClient.get<YieldStatItem[]>(url);
          // enhancedApiClient 已提取 .data，data 即为数组
          const items = Array.isArray(data) ? data : [];
          set({
            yieldItems: items,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, yieldStats: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取产量统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取成本统计
       * GET /api/summary/cost-stats
       * 后端返回: { success, data: {labor, material, energy}, summary: {...} }
       * enhancedApiClient 提取 .data 后返回 {labor, material, energy}（summary 在兄弟节点丢失）
       * 需要在客户端从数组计算 costSummary
       */
      fetchCostStats: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          queryParams.set('cost_type', 'all');
          if (params?.batchCode) queryParams.set('batch_code', params.batchCode);
          if (params?.startDate) queryParams.set('start_date', params.startDate);
          if (params?.endDate) queryParams.set('end_date', params.endDate);

          const url = `/summary/cost-stats?${queryParams.toString()}`;
          const data = await enhancedApiClient.get<{
            labor: CostDetailItem[];
            material: CostDetailItem[];
            energy: CostDetailItem[];
          }>(url);

          // 提取各类数组并扁平化
          const labor = (data?.labor || []).map((item: CostDetailItem) => ({
            ...item,
            costCategory: 'labor' as const,
          }));
          const material = (data?.material || []).map((item: CostDetailItem) => ({
            ...item,
            costCategory: 'material' as const,
          }));
          const energy = (data?.energy || []).map((item: CostDetailItem) => ({
            ...item,
            costCategory: 'energy' as const,
          }));

          const allItems = [...labor, ...material, ...energy];
          const summary = computeCostSummary(labor, material, energy);

          set({
            costDetailItems: allItems,
            costSummary: summary,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, costStats: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取成本统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取人工工时统计
       * GET /api/summary/labor-stats?group_by={}&start_date={}&end_date={}
       * 后端返回: { success, data: { details: [...], summary: {...} } }
       * enhancedApiClient 提取 .data 后返回 { details: [...], summary: {...} }
       * queryToObjects 返回驼峰命名
       */
      fetchLaborStats: async (params) => {
        const groupBy = params?.groupBy || 'month';
        set({ isLoading: true, error: null, laborGroupBy: groupBy });
        try {
          const queryParams = new URLSearchParams();
          queryParams.set('group_by', groupBy);
          if (params?.startDate) queryParams.set('start_date', params.startDate);
          if (params?.endDate) queryParams.set('end_date', params.endDate);

          const url = `/summary/labor-stats?${queryParams.toString()}`;
          const data = await enhancedApiClient.get<{
            details: LaborStatItem[];
            summary: Record<string, number>;
          }>(url);

          const details = Array.isArray(data?.details) ? data.details : [];
          set({
            laborItems: details,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, laborStats: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取人工统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取批次汇总统计
       * GET /api/summary/batch-stats?crop_name={}&status={}&greenhouse_name={}
       * queryToObjects 返回驼峰命名
       */
      fetchBatchStats: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (params?.cropName) queryParams.set('crop_name', params.cropName);
          if (params?.status) queryParams.set('status', params.status);
          if (params?.greenhouse) queryParams.set('greenhouse_name', params.greenhouse);

          const query = queryParams.toString();
          const url = `/summary/batch-stats${query ? `?${query}` : ''}`;
          const data = await enhancedApiClient.get<BatchStatItem[]>(url);

          const items = Array.isArray(data) ? data : [];
          set({
            batchItems: items,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, batchStats: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取批次统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取全链条追溯概览（6环节独立统计）
       * GET /api/summary/chain-overview
       */
      fetchChainOverview: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await enhancedApiClient.get<{ stages: ChainStageStat[] }>('/summary/chain-overview');
          const stages = data?.stages || [];
          set({
            chainStages: stages,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, chainOverview: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取全链条概览失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取问题每日汇总
       * GET /api/problems/daily-summary?date={}&greenhouse_name={}
       * 后端返回蛇形命名，前端做字段映射
       */
      fetchProblems: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (params?.startDate) queryParams.set('start_date', params.startDate);
          if (params?.endDate) queryParams.set('end_date', params.endDate);
          if (params?.greenhouse) queryParams.set('greenhouse_name', params.greenhouse);

          const query = queryParams.toString();
          const url = `/problems/daily-summary${query ? `?${query}` : ''}`;
          const data = await enhancedApiClient.get<ProblemDailyItem[]>(url);

          const items = Array.isArray(data) ? data.map(mapProblemItem) : [];
          set({
            problemItems: items,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, problems: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取问题统计失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 获取生产指标统计
       * GET /api/summary/indicators
       * 后端手动构造返回蛇形命名，同时保存原始数据和驼峰映射数据
       */
      fetchIndicators: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (params?.period) queryParams.set('period', params.period);
          const query = queryParams.toString();
          const url = `/summary/indicators${query ? `?${query}` : ''}`;
          const data = await enhancedApiClient.get<Record<string, unknown>>(url);
          // enhancedApiClient 已提取 .data
          const raw = data as unknown as IndicatorsRaw;
          const indicator = mapIndicator(raw as unknown as Record<string, unknown>);

          set({
            indicators: [indicator],
            indicatorsRaw: raw,
            isLoading: false,
            lastFetchTimestamps: { ...get().lastFetchTimestamps, indicators: Date.now() },
          });
        } catch (error) {
          console.warn('[SummaryDataStore] 获取生产指标失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /**
       * 一次性获取所有汇总数据（并行请求）
       */
      fetchAll: async () => {
        set({ isLoading: true, error: null });
        try {
          await Promise.all([
            get().fetchOverview(),
            get().fetchYieldStats(),
            get().fetchCostStats(),
            get().fetchLaborStats(),
            get().fetchBatchStats(),
            get().fetchChainOverview(),
            get().fetchProblems(),
            get().fetchIndicators(),
          ]);
          set({ isLoading: false });
        } catch (error) {
          console.warn('[SummaryDataStore] fetchAll 部分请求失败:', error);
          set({ isLoading: false });
        }
      },

      /**
       * 清空所有缓存数据，恢复到初始状态
       */
      invalidateAll: () => {
        set({
          overview: null,
          yieldItems: [],
          yieldGroupBy: 'month',
          costDetailItems: [],
          costSummary: null,
          laborItems: [],
          laborGroupBy: 'month',
          batchItems: [],
          chainStages: [],
          problemItems: [],
          indicators: [],
          indicatorsRaw: null,
          error: null,
          lastFetchTimestamps: {},
        });
      },

      /** V10.0 多维度对比统计 */
      fetchComparisonStats: async (params = {}) => {
        set({ isLoading: true });
        try {
          const query = new URLSearchParams();
          if (params.mainParam) query.set('main_param', params.mainParam);
          if (params.compareParam1) query.set('compare_param1', params.compareParam1);
          if (params.compareParam2) query.set('compare_param2', params.compareParam2);
          if (params.startDate) query.set('start_date', params.startDate);
          if (params.endDate) query.set('end_date', params.endDate);
          if (params.sampling) query.set('sampling', params.sampling);
          const response = await enhancedApiClient.get<any>(`/summary/comparison-stats?${query.toString()}`);
          set({ comparisonData: response.data ?? response, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      /**
       * 检查指定 key 的缓存是否已过期
       * @param key 缓存键名（对应 lastFetchTimestamps 的 key）
       * @param maxAgeMs 最大有效期（毫秒）
       */
      isCacheStale: (key, maxAgeMs) => {
        const timestamp = get().lastFetchTimestamps[key];
        if (!timestamp) return true;
        return Date.now() - timestamp > maxAgeMs;
      },
    })
);
