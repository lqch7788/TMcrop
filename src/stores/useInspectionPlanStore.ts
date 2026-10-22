/**
 * 巡查计划 Zustand Store（2026-10-21 P3）
 *
 * 对接后端: /api/inspection-plans
 *
 * V2.1 架构铁律：组件 → Store → enhancedApiClient → API，不做本地兜底缓存。
 *
 * 【为什么要独立 Store】
 * 计划是「模板」，与巡查记录「实例」是两类数据：
 *   · 记录数按天增长（13 → 每天 +N），需要独立分页与筛选
 *   · 计划数少、变更低频，与记录混在一个 store 里会让「新增巡查」的写入把计划列表冲掉
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型 ==========

/** 计划检查项模板 */
export interface PlanChecklistItem {
  key: string;
  label: string;
  required?: boolean;
}

/** 巡查计划 */
export interface InspectionPlan {
  id: string;
  planCode: string;
  title: string;
  inspectionType: string;
  greenhouseId?: string | null;
  greenhouseName?: string | null;
  cropName?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  infrastructureId?: string | null;
  infrastructureName?: string | null;
  area?: string | null;
  checklist?: string | PlanChecklistItem[] | null;
  frequency: string;
  intervalValue?: number | null;
  weekdays?: string | number[] | null;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  windowDays?: number | null;
  defaultTime?: string | null;
  durationHours?: number | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  autoSchedule?: number | null;
  shiftCode?: string | null;
  pauseRanges?: string | null;
  status?: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createTime?: string;
  updateTime?: string;
  version?: number;
  /** 列表端点附带的实例计数（不含 cancelled） */
  occurrenceCount?: number;
}

/**
 * 计划实例（= 农事任务）
 *
 * 注意字段名是**驼峰**：后端 SQL 里虽然写了 `id AS task_id`，
 * 但 /api 响应会过 apiCamelcaseMiddleware 一律转成驼峰（taskId / planOccurrenceDate）。
 * 按蛇形声明会读到 undefined —— 实测「执行日/任务编号」两列全空。
 */
export interface PlanOccurrence {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  taskType: string;
  status: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  planOccurrenceDate: string;
  planDate?: string | null;
  planTime?: string | null;
  planEnd?: string | null;
  estimatedHours?: number | null;
  description?: string | null;
  inspectionPlanId: string;
  schedule?: { id: string; workerName?: string; planStart?: string; planEnd?: string; shiftType?: string; status?: string } | null;
  inspectionRecordId?: string;
  inspectionRecordCode?: string;
}

/**
 * 计划统计（口径见方案 §8.3）
 *
 * 2026-10-22 审核返修：补齐 §8.3 规定的 8 项指标。
 *   原实现只有 total/已提交/缺记录/执行率，且 total 把 cancelled 也算作「应执行」，
 *   暂停或编辑取消的实例会让执行率虚低。
 */
export interface PlanStats {
  range: { from: string; to: string };
  /** 应执行：按当前频率算出的窗口日期数 − 暂停区间日期数 */
  expected: number;
  /** 已生成：窗口内实例任务数（排除 cancelled） */
  generated: number;
  /** 已取消：窗口内 status='cancelled' 的实例数 */
  cancelled: number;
  /** 已排班：存在非 cancelled 排班行的 distinct 任务数 */
  scheduled: number;
  /** 已记录：存在巡查记录的 distinct 任务数 */
  recorded: number;
  /** 已验收：任务 completed 且存在记录 */
  verified: number;
  /** 逾期未执行：执行日已过、无记录、未取消未完成 */
  overdue: number;
  /** 未闭环问题：由该计划记录产生、状态未完成的问题 */
  openProblems: number;
  /** 执行率 = 已记录 / 应执行 */
  completionRate: number;

  // ==== 兼容旧字段（旧版后端仍在返回，保留读取以防部署错位）====
  total?: number;
  byStatus?: Record<string, number>;
  submittedRecords?: number;
  missingRecords?: number;
}

/** 生成结果 */
export interface PlanGenerateResult {
  planId: string;
  created: string[];
  skipped: string[];
  scheduled: number;
  unscheduledReasons: Record<string, string>;
  blockedReason?: string;
}

// ========== Store ==========

interface InspectionPlanState {
  plans: InspectionPlan[];
  currentPlan: InspectionPlan | null;
  occurrences: PlanOccurrence[];
  stats: PlanStats | null;
  isLoading: boolean;
  error: string | null;

  fetchPlans: (filters?: { status?: string; inspection_type?: string; keyword?: string }) => Promise<void>;
  fetchPlan: (id: string) => Promise<InspectionPlan | null>;
  createPlan: (payload: Record<string, unknown>) => Promise<{ plan: InspectionPlan; generate: PlanGenerateResult } | null>;
  updatePlan: (id: string, payload: Record<string, unknown>) => Promise<{
    plan: InspectionPlan;
    generate?: PlanGenerateResult;
    pause?: { cancelledTasks: string[] };
    resync?: { updated: number; cancelled: number; conflicts: Array<{ taskId: string; date: string; reason: string }> };
    resyncError?: string;
  } | null>;
  archivePlan: (id: string) => Promise<boolean>;
  generateOccurrences: (id: string, range?: { from?: string; to?: string }) => Promise<PlanGenerateResult | null>;
  fetchOccurrences: (id: string) => Promise<void>;
  fetchStats: (id: string, range?: { from?: string; to?: string }) => Promise<void>;
  clearDetail: () => void;
}

export const useInspectionPlanStore = create<InspectionPlanState>()((set, get) => ({
  plans: [],
  currentPlan: null,
  occurrences: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchPlans: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (filters?.status) params.set('status', filters.status);
      if (filters?.inspection_type) params.set('inspection_type', filters.inspection_type);
      if (filters?.keyword) params.set('keyword', filters.keyword);
      const data = await enhancedApiClient.get<InspectionPlan[]>(`/inspection-plans?${params.toString()}`);
      set({ plans: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchPlan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const data = await enhancedApiClient.get<InspectionPlan>(`/inspection-plans/${encodeURIComponent(id)}`);
      set({ currentPlan: data, isLoading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  createPlan: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await enhancedApiClient.post<any>('/inspection-plans', payload);
      const plan = res as InspectionPlan;
      const generate = (plan as any).generate as PlanGenerateResult | undefined;
      set((state) => ({ plans: [plan, ...state.plans], isLoading: false }));
      return { plan, generate: generate ?? { planId: plan.id, created: [], skipped: [], scheduled: 0, unscheduledReasons: {} } };
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updatePlan: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      // 2026-10-22（审核 P2-1）：enhancedApiClient 只返回响应里的 `data`，
      //   而后端已把 pause / generate / resync 放进 data —— 这里从 data 对象上取。
      const res = await enhancedApiClient.put<any>(`/inspection-plans/${encodeURIComponent(id)}`, payload);
      const plan = res as InspectionPlan;
      set((state) => ({
        plans: state.plans.map((p) => (p.id === id ? { ...p, ...plan } : p)),
        currentPlan: state.currentPlan?.id === id ? { ...state.currentPlan, ...plan } : state.currentPlan,
        isLoading: false,
      }));
      return {
        plan,
        generate: (res as any)?.generate,
        pause: (res as any)?.pause,
        resync: (res as any)?.resync,
        resyncError: (res as any)?.resyncError,
      };
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  archivePlan: async (id) => {
    try {
      await enhancedApiClient.delete(`/inspection-plans/${encodeURIComponent(id)}`);
      set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  generateOccurrences: async (id, range) => {
    try {
      const res = await enhancedApiClient.post<PlanGenerateResult>(
        `/inspection-plans/${encodeURIComponent(id)}/generate`,
        range || {}
      );
      await get().fetchPlans();
      return res;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  fetchOccurrences: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const data = await enhancedApiClient.get<PlanOccurrence[]>(
        `/inspection-plans/${encodeURIComponent(id)}/occurrences`
      );
      set({ occurrences: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchStats: async (id, range) => {
    try {
      const params = new URLSearchParams();
      if (range?.from) params.set('from', range.from);
      if (range?.to) params.set('to', range.to);
      const qs = params.toString();
      const data = await enhancedApiClient.get<PlanStats>(
        `/inspection-plans/${encodeURIComponent(id)}/stats${qs ? `?${qs}` : ''}`
      );
      set({ stats: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearDetail: () => set({ currentPlan: null, occurrences: [], stats: null }),
}));

/** 解析 checklist（后端存 JSON 字符串，列表接口可能已转数组） */
export function parsePlanChecklist(raw: string | PlanChecklistItem[] | null | undefined): PlanChecklistItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 频率 → 中文文案 */
export function describePlanFrequency(plan: InspectionPlan): string {
  const interval = Number(plan.intervalValue ?? 1) || 1;
  const unit = interval > 1 ? `每 ${interval} ` : '每';
  switch (plan.frequency) {
    case 'once': return '一次性';
    case 'daily': return interval > 1 ? `每 ${interval} 天` : '每天';
    case 'weekly': {
      const days = Array.isArray(plan.weekdays)
        ? plan.weekdays
        : (() => { try { return JSON.parse(String(plan.weekdays || '[]')); } catch { return []; } })();
      const names = ['一', '二', '三', '四', '五', '六', '日'];
      const text = (days as number[]).map((d) => `周${names[d - 1]}`).join('、');
      return `${unit}周 ${text || '（未设置）'}`;
    }
    case 'monthly':
      return `${unit}月 ${plan.dayOfMonth || '?'} 号`;
    default: return String(plan.frequency || '-');
  }
}