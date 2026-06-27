/**
 * 指标数据 Zustand Store (V2.1 架构 - 已简化)
 *
 * 架构：enhancedApiClient → API
 * 数据流：Store → useIndicators Hook → 组件
 *
 * 对接后端: /api/indicators
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import type { Indicator, EvaluationItem, AnalyzeItem, CategorySummary } from '../pages/types/indicators.types';

// ========== 字段映射 ==========

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  target: 'target',
  actual: 'actual',
  trend: 'trend',
  frequency: 'frequency',
  source: 'source',
  warning: 'warning',
  weight: 'weight',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 后端蛇形 → 前端驼峰 转换 */
function normalize(item: Record<string, unknown>): Indicator {
  const result: Record<string, unknown> = { ...item };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 数值字段类型保障
  result.target = Number(result.target ?? 0);
  result.actual = Number(result.actual ?? 0);
  result.warning = Number(result.warning ?? 0);
  result.weight = Number(result.weight ?? 0);
  // 默认值
  result.trend = result.trend || 'stable';
  result.frequency = result.frequency || '月度';
  result.source = result.source || '人工录入';
  return result as unknown as Indicator;
}

/** 前端驼峰 → 后端蛇形 转换 */
function denormalize(data: Partial<Indicator>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

/** 生成临时ID */
function generateLocalId(): string {
  return `KPI_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ========== 计算函数 ==========

/** 分类颜色映射 */
const CATEGORY_COLORS: Record<string, string> = {
  '生产指标': '#06b6d4',
  '质量指标': '#7C3AED',
  '成本指标': '#22c55e',
  '效率指标': '#f59e0b',
  '服务指标': '#ec4899',
  '设备指标': '#0891b2',
  '资源指标': '#3b82f6',
  '效益指标': '#10b981',
  '安全指标': '#ef4444',
};

/** 从指标列表计算分类汇总 */
function computeCategorySummary(indicators: Indicator[]): CategorySummary[] {
  const groups: Record<string, { count: number; totalAchievement: number }> = {};
  for (const ind of indicators) {
    if (!groups[ind.category]) {
      groups[ind.category] = { count: 0, totalAchievement: 0 };
    }
    groups[ind.category].count++;
    if (ind.target > 0) {
      groups[ind.category].totalAchievement += (ind.actual / ind.target) * 100;
    }
  }
  return Object.entries(groups).map(([name, data]) => ({
    name,
    count: data.count,
    avgAchievement: data.count > 0 ? Math.round(data.totalAchievement / data.count * 10) / 10 : 0,
    color: CATEGORY_COLORS[name] || '#6b7280',
  }));
}

/** 从指标列表计算分析数据（每项指标一个数据点） */
function computeAnalyzeData(indicators: Indicator[]): AnalyzeItem[] {
  return indicators.map(ind => ({
    month: ind.name,
    target: ind.target,
    actual: ind.actual,
    达成率: ind.target > 0 ? Math.round((ind.actual / ind.target) * 1000) / 10 : 0,
  }));
}

// ========== 默认评估数据（API 失败时 fallback，与后端种子数据保持同步）==========
const DEFAULT_EVALUATION_DATA: EvaluationItem[] = [
  { id: '1', name: '上海松江基地', productionScore: 92, qualityScore: 95, costScore: 88, efficiencyScore: 90, totalScore: 91.25, rank: 1 },
  { id: '2', name: '上海崇明基地', productionScore: 88, qualityScore: 92, costScore: 85, efficiencyScore: 87, totalScore: 88.0, rank: 2 },
  { id: '3', name: '上海嘉定基地', productionScore: 85, qualityScore: 90, costScore: 90, efficiencyScore: 85, totalScore: 87.5, rank: 3 },
  { id: '4', name: '上海奉贤基地', productionScore: 90, qualityScore: 88, costScore: 82, efficiencyScore: 88, totalScore: 87.0, rank: 4 },
  { id: '5', name: '西安雁塔基地', productionScore: 82, qualityScore: 85, costScore: 88, efficiencyScore: 86, totalScore: 85.25, rank: 5 },
  { id: '6', name: '西安高新基地', productionScore: 80, qualityScore: 88, costScore: 85, efficiencyScore: 84, totalScore: 84.25, rank: 6 },
  { id: '7', name: '宁波北仑基地', productionScore: 78, qualityScore: 82, costScore: 86, efficiencyScore: 82, totalScore: 82.0, rank: 7 },
  { id: '8', name: '宁波镇海基地', productionScore: 75, qualityScore: 80, costScore: 84, efficiencyScore: 80, totalScore: 79.75, rank: 8 },
];

/** 后端snake_case → 前端camelCase 评估数据规范化 */
function normalizeEvaluation(item: Record<string, unknown>): EvaluationItem {
  return {
    id: item.id as string,
    name: item.name as string,
    productionScore: Number(item.productionScore ?? item.production_score ?? 0),
    qualityScore: Number(item.qualityScore ?? item.quality_score ?? 0),
    costScore: Number(item.costScore ?? item.cost_score ?? 0),
    efficiencyScore: Number(item.efficiencyScore ?? item.efficiency_score ?? 0),
    totalScore: Number(item.totalScore ?? item.total_score ?? 0),
    rank: Number(item.rank ?? 0),
  };
}

// ========== Store 接口 ==========

export interface IndicatorDataState {
  /** 指标列表 */
  indicators: Indicator[];
  /** 评估数据 */
  evaluationData: EvaluationItem[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // 计算属性（从 indicators 派生，通过 recomputeDerivedData 更新）
  categorySummary: CategorySummary[];
  analyzeData: AnalyzeItem[];

  // CRUD 方法
  fetchIndicators: (filters?: Record<string, string>) => Promise<void>;
  createIndicator: (data: Partial<Indicator>) => Promise<Indicator | null>;
  updateIndicator: (id: string, updates: Partial<Indicator>) => Promise<void>;
  deleteIndicator: (id: string) => Promise<boolean>;
  deleteIndicators: (ids: string[]) => Promise<boolean>;

  // 评估数据管理
  fetchEvaluations: () => Promise<void>;
  setEvaluationData: (data: EvaluationItem[]) => void;

  // 派生数据刷新
  recomputeDerivedData: () => void;
}

// ========== Store ==========

export const useIndicatorDataStore = create<IndicatorDataState>()(
  (set, get) => ({
      indicators: [],
      evaluationData: DEFAULT_EVALUATION_DATA,
      isLoading: false,
      error: null,
      categorySummary: [],
      analyzeData: [],

      // ---------- 重新计算派生数据 ----------
      recomputeDerivedData: () => {
        const { indicators } = get();
        set({
          categorySummary: computeCategorySummary(indicators),
          analyzeData: computeAnalyzeData(indicators),
        });
      },

      // ---------- 获取指标列表 ----------
      fetchIndicators: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => {
              if (v) params.set(k, v);
            });
          }
          const query = params.toString();
          const url = `/indicators${query ? `?${query}` : ''}`;

          const response = await enhancedApiClient.get(url);

          // enhancedApiClient 已提取 .data，返回数组
          const rawData = Array.isArray(response) ? response : [];
          const normalized = rawData.map((item: Record<string, unknown>) => normalize(item));
          set({
            indicators: normalized,
            categorySummary: computeCategorySummary(normalized),
            analyzeData: computeAnalyzeData(normalized),
            isLoading: false,
          });
        } catch (error) {
          // 2026-06-27 P0：API 失败显式化（V2.1 铁律：无缓存兜底）
          // 直接 log 错误 + 设 error 状态，让 UI 展示给用户
          console.error('[IndicatorDataStore] fetchIndicators API 失败:', error);
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      // ---------- 创建指标（乐观更新 + 回滚）----------
      createIndicator: async (data) => {
        const localId = generateLocalId();
        const now = new Date().toISOString();

        // 构造乐观更新项
        const optimisticItem: Indicator = {
          id: localId,
          code: data.code || '',
          name: data.name || '',
          category: data.category || '生产指标',
          unit: data.unit || '',
          target: data.target ?? 0,
          actual: data.actual ?? 0,
          trend: (data.trend as 'up' | 'down' | 'stable') || 'stable',
          frequency: data.frequency || '月度',
          source: data.source || '人工录入',
          warning: data.warning ?? 0,
          weight: data.weight ?? 0,
        };

        // 乐观更新 UI
        set((state) => {
          const newIndicators = [optimisticItem, ...state.indicators];
          return {
            indicators: newIndicators,
            categorySummary: computeCategorySummary(newIndicators),
            analyzeData: computeAnalyzeData(newIndicators),
          };
        });

        try {
          // 构造请求体（后端要求 id 必填）
          const body = { ...denormalize(data), id: localId };
          const response = await enhancedApiClient.post('/indicators', body);

          // enhancedApiClient 提取 .data → 返回完整记录
          const savedItem = response && typeof response === 'object' && 'id' in response
            ? normalize(response as Record<string, unknown>)
            : optimisticItem;

          set((state) => {
            const newIndicators = state.indicators.map((t) =>
              t.id === localId ? { ...savedItem, id: savedItem.id || localId } : t
            );
            return {
              indicators: newIndicators,
              categorySummary: computeCategorySummary(newIndicators),
              analyzeData: computeAnalyzeData(newIndicators),
            };
          });
          return { ...optimisticItem, id: savedItem.id || localId, code: savedItem.code || optimisticItem.code };
        } catch (error) {
          const errMsg = (error as Error)?.message || '创建指标失败';
          // logger.warn('[IndicatorDataStore] 创建指标API失败:', errMsg);
          // API失败：移除乐观更新项
          set((state) => {
            const rolledBack = state.indicators.filter((t) => t.id !== localId);
            return {
              indicators: rolledBack,
              categorySummary: computeCategorySummary(rolledBack),
              analyzeData: computeAnalyzeData(rolledBack),
              error: errMsg,
            };
          });
          throw new Error(errMsg);
        }
      },

      // ---------- 更新指标（乐观更新 + 回滚）----------
      updateIndicator: async (id, updates) => {
        const prev = get().indicators.find((t) => t.id === id);
        // 乐观更新 UI
        set((state) => {
          const newIndicators = state.indicators.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          );
          return {
            indicators: newIndicators,
            categorySummary: computeCategorySummary(newIndicators),
            analyzeData: computeAnalyzeData(newIndicators),
          };
        });
        try {
          const body = denormalize(updates);
          await enhancedApiClient.put(`/indicators/${id}`, body);
        } catch (error) {
          const errMsg = (error as Error)?.message || '更新指标失败';
          // logger.warn('[IndicatorDataStore] 更新指标API失败:', errMsg);
          // API失败：回滚
          if (prev) {
            set((state) => {
              const rolledBack = state.indicators.map((t) => (t.id === id ? prev : t));
              return {
                indicators: rolledBack,
                categorySummary: computeCategorySummary(rolledBack),
                analyzeData: computeAnalyzeData(rolledBack),
                error: errMsg,
              };
            });
          }
          throw new Error(errMsg);
        }
      },

      // ---------- 删除单个指标（乐观删除）----------
      deleteIndicator: async (id) => {
        const prev = get().indicators.find((t) => t.id === id);
        set((state) => {
          const newIndicators = state.indicators.filter((t) => t.id !== id);
          return {
            indicators: newIndicators,
            categorySummary: computeCategorySummary(newIndicators),
            analyzeData: computeAnalyzeData(newIndicators),
          };
        });
        try {
          await enhancedApiClient.delete(`/indicators/${id}`);
          return true;
        } catch (error) {
          // logger.warn('[IndicatorDataStore] 删除指标API失败:', error);
          // API失败：回滚
          if (prev) {
            set((state) => {
              const rolledBack = [...state.indicators, prev];
              return {
                indicators: rolledBack,
                categorySummary: computeCategorySummary(rolledBack),
                analyzeData: computeAnalyzeData(rolledBack),
              };
            });
          }
          return false;
        }
      },

      // ---------- 批量删除指标（乐观删除）----------
      deleteIndicators: async (ids) => {
        const prevItems = get().indicators.filter((t) => ids.includes(t.id));
        set((state) => {
          const newIndicators = state.indicators.filter((t) => !ids.includes(t.id));
          return {
            indicators: newIndicators,
            categorySummary: computeCategorySummary(newIndicators),
            analyzeData: computeAnalyzeData(newIndicators),
          };
        });
        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient.delete(`/indicators/${id}`).catch(() => {})
            )
          );
          return true;
        } catch {
          // API失败：回滚
          if (prevItems.length > 0) {
            set((state) => {
              const rolledBack = [...state.indicators, ...prevItems];
              return {
                indicators: rolledBack,
                categorySummary: computeCategorySummary(rolledBack),
                analyzeData: computeAnalyzeData(rolledBack),
              };
            });
          }
          return false;
        }
      },

      // ---------- 评估数据管理 ----------
      fetchEvaluations: async () => {
        try {
          const response = await enhancedApiClient.get('/indicator-evaluations');
          const rawData = Array.isArray(response) ? response : [];
          const normalized = rawData.map((item: Record<string, unknown>) => normalizeEvaluation(item));
          if (normalized.length > 0) {
            set({ evaluationData: normalized });
          }
        } catch (error) {
          // logger.warn('[IndicatorDataStore] 评估数据API获取失败:', error);
        }
      },

      setEvaluationData: (data) => set({ evaluationData: data }),
    })
);
