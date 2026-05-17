// ============================================================
// 审批业务详情联动Hook
// 文件路径：src/hooks/useApprovalBusinessDetail.ts
// 功能：根据 approval.businessLink.type 自动调用对应业务Store加载实际数据
// 架构：审批详情弹窗 → useApprovalBusinessDetail() → 业务Store → 业务数据
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Approval, BusinessLink } from '../types/approval';

// ============================================================
// 业务详情返回类型
// ============================================================

export interface BusinessDetailData {
  /** 业务数据（各Store返回的原始对象） */
  data: unknown;
  /** 业务类型名称 */
  typeName: string;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

// ============================================================
// 审批类型 → 业务Store 映射表
// ============================================================

/** 业务Store加载器函数类型 */
type StoreLoader = (requestId: string) => Promise<unknown>;

/** businessLink.type → { 类型名称, 加载函数 } */
const BUSINESS_STORE_MAP: Record<string, { typeName: string; loader: StoreLoader }> = {
  // ========== 物料相关 ==========
  material_request: {
    typeName: '领料申请',
    loader: async (requestId) => {
      const { useMaterialRequestDataStore } = await import('../stores/useMaterialRequestDataStore');
      const state = useMaterialRequestDataStore.getState();
      if (state.items.length === 0) await state.loadItems?.();
      return useMaterialRequestDataStore.getState().items.find((i: any) => i.id === requestId || i.requestId === requestId);
    },
  },
  return_material: {
    typeName: '退料单',
    loader: async (requestId) => {
      const { useMaterialReturnStore } = await import('../stores/useMaterialReturnStore');
      const state = useMaterialReturnStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useMaterialReturnStore.getState().items?.find((i: any) => i.id === requestId);
    },
  },
  material_inbound: {
    typeName: '入库记录',
    loader: async (requestId) => {
      const { useInboundStore } = await import('../stores/useInboundStore');
      const state = useInboundStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useInboundStore.getState().items?.find((i: any) => i.id === requestId);
    },
  },
  material_transfer: {
    typeName: '库存调拨',
    loader: async (requestId) => {
      const { useWarehouseMaterialStore } = await import('../stores/useWarehouseMaterialStore');
      const state = useWarehouseMaterialStore.getState();
      return (state as any).transfers?.find((t: any) => t.id === requestId);
    },
  },

  // ========== 生产相关 ==========
  purchase: {
    typeName: '采购计划',
    loader: async (requestId) => {
      const { usePurchasePlanStore } = await import('../stores/usePurchasePlanStore');
      const state = usePurchasePlanStore.getState();
      if (state.plans.length === 0) await state.fetchPlans();
      return usePurchasePlanStore.getState().plans.find((p: any) => p.id === requestId);
    },
  },
  production_plan: {
    typeName: '生产计划',
    loader: async (requestId) => {
      const { useProductionPlanStore } = await import('../stores/useProductionPlanStore');
      const state = useProductionPlanStore.getState();
      if (state.plans?.length === 0) await state.fetchPlans?.();
      return useProductionPlanStore.getState().plans?.find((p: any) => p.id === requestId);
    },
  },
  production: {
    typeName: '生产计划',
    loader: async (requestId) => {
      const { useProductionPlanStore } = await import('../stores/useProductionPlanStore');
      const state = useProductionPlanStore.getState();
      if (state.plans?.length === 0) await state.fetchPlans?.();
      return useProductionPlanStore.getState().plans?.find((p: any) => p.id === requestId);
    },
  },
  production_batch: {
    typeName: '生产批次',
    loader: async (requestId) => {
      const { useProductionPlanStore } = await import('../stores/useProductionPlanStore');
      const state = useProductionPlanStore.getState();
      return state.plans?.find((p: any) => p.id === requestId);
    },
  },
  tech_solution: {
    typeName: '技术方案',
    loader: async (requestId) => {
      const { useTechSolutionStore } = await import('../stores/useTechSolutionStore');
      const state = useTechSolutionStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useTechSolutionStore.getState().items?.find((i: any) => i.id === requestId);
    },
  },

  // ========== 农事相关 ==========
  task_dispatch: {
    typeName: '农事任务',
    loader: async (requestId) => {
      const { useFarmTaskStore } = await import('../stores/farmTaskStore');
      const state = useFarmTaskStore.getState();
      if (state.tasks.length === 0) await state.fetchTasks();
      return useFarmTaskStore.getState().tasks.find((t: any) => t.id === requestId);
    },
  },
  task_change: {
    typeName: '任务变更',
    loader: async (requestId) => {
      const { useFarmTaskStore } = await import('../stores/farmTaskStore');
      const state = useFarmTaskStore.getState();
      return state.tasks.find((t: any) => t.id === requestId);
    },
  },
  inspection: {
    typeName: '巡查记录',
    loader: async (requestId) => {
      const { useInspectionDataStore } = await import('../stores/useInspectionDataStore');
      const state = useInspectionDataStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useInspectionDataStore.getState().items?.find((i: any) => i.id === requestId);
    },
  },
  inspection_issue: {
    typeName: '巡查问题',
    loader: async (requestId) => {
      const { useInspectionDataStore } = await import('../stores/useInspectionDataStore');
      const state = useInspectionDataStore.getState();
      return state.items?.find((i: any) => i.id === requestId);
    },
  },
  resolve: {
    typeName: '问题整改',
    loader: async (requestId) => {
      const { useProblemStore } = await import('../stores/useProblemStore');
      const state = useProblemStore.getState();
      if (state.problems?.length === 0) await state.loadItems?.();
      return useProblemStore.getState().problems?.find((p: any) => p.id === requestId);
    },
  },
  issue_resolve: {
    typeName: '问题整改',
    loader: async (requestId) => {
      const { useProblemStore } = await import('../stores/useProblemStore');
      const state = useProblemStore.getState();
      return state.problems?.find((p: any) => p.id === requestId);
    },
  },

  // ========== 采收相关 ==========
  harvest: {
    typeName: '采收记录',
    loader: async (requestId) => {
      const { useHarvestStore } = await import('../stores/useHarvestStore');
      const state = useHarvestStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useHarvestStore.getState().items?.find((i: any) => i.id === requestId);
    },
  },

  // ========== HR相关 ==========
  leave: {
    typeName: '请假申请',
    loader: async (requestId) => {
      const { useLeaveStore } = await import('../stores/leaveStore');
      const state = useLeaveStore.getState();
      if (state.leaves?.length === 0) await state.loadItems?.();
      return useLeaveStore.getState().leaves?.find((l: any) => l.id === requestId);
    },
  },
  overtime: {
    typeName: '加班申请',
    loader: async (requestId) => {
      const { useOvertimeStore } = await import('../stores/overtimeStore');
      const state = useOvertimeStore.getState();
      if (state.overtimes?.length === 0) await state.loadItems?.();
      return useOvertimeStore.getState().overtimes?.find((o: any) => o.id === requestId);
    },
  },
  resignation: {
    typeName: '离职申请',
    loader: async (requestId) => {
      const { useResignationStore } = await import('../stores/useResignationStore');
      const state = useResignationStore.getState();
      if (state.resignations?.length === 0) await state.loadItems?.();
      return useResignationStore.getState().resignations?.find((r: any) => r.id === requestId);
    },
  },
  resign: {
    typeName: '离职申请',
    loader: async (requestId) => {
      const { useResignationStore } = await import('../stores/useResignationStore');
      const state = useResignationStore.getState();
      return state.resignations?.find((r: any) => r.id === requestId);
    },
  },
  recruitment: {
    typeName: '招聘需求',
    loader: async (requestId) => {
      const { useRecruitmentStore } = await import('../stores/useRecruitmentStore');
      const state = useRecruitmentStore.getState();
      if (state.recruitments?.length === 0) await state.loadItems?.();
      return useRecruitmentStore.getState().recruitments?.find((r: any) => r.id === requestId);
    },
  },
  onboarding: {
    typeName: '入职办理',
    loader: async (requestId) => {
      const { useOnboardingStore } = await import('../stores/useOnboardingStore');
      const state = useOnboardingStore.getState();
      if (state.onboardings?.length === 0) await state.loadItems?.();
      return useOnboardingStore.getState().onboardings?.find((o: any) => o.id === requestId);
    },
  },
  attendance_repair: {
    typeName: '考勤补录',
    loader: async (requestId) => {
      const { useAttendanceRepairStore } = await import('../stores/useAttendanceRepairStore');
      const state = useAttendanceRepairStore.getState();
      return (state as any).repairs?.find((r: any) => r.id === requestId);
    },
  },
  salary_adjustment: {
    typeName: '调薪申请',
    loader: async (requestId) => {
      const { useSalaryAdjustmentStore } = await import('../stores/useSalaryAdjustmentStore');
      const state = useSalaryAdjustmentStore.getState();
      return (state as any).adjustments?.find((a: any) => a.id === requestId);
    },
  },
  contract_renewal: {
    typeName: '合同续签',
    loader: async (requestId) => {
      const { useContractRenewalStore } = await import('../stores/useContractRenewalStore');
      const state = useContractRenewalStore.getState();
      return (state as any).renewals?.find((r: any) => r.id === requestId);
    },
  },
  salary_budget: {
    typeName: '工资预算',
    loader: async (requestId) => {
      const { useSalaryBudgetStore } = await import('../stores/useSalaryBudgetStore');
      const state = useSalaryBudgetStore.getState();
      return (state as any).budgets?.find((b: any) => b.id === requestId);
    },
  },
  transfer: {
    typeName: '转岗申请',
    loader: async (requestId) => {
      const { useWorkerStore } = await import('../stores/useWorkerStore');
      const state = useWorkerStore.getState();
      return (state as any).transfers?.find((t: any) => t.id === requestId);
    },
  },

  // ========== 指标/预算相关 ==========
  indicator: {
    typeName: '指标数据',
    loader: async (requestId) => {
      const { useIndicatorStore } = await import('../stores/useIndicatorStore');
      const state = useIndicatorStore.getState();
      if (state.indicators?.length === 0) await state.loadItems?.();
      return useIndicatorStore.getState().indicators?.find((i: any) => i.id === requestId);
    },
  },
  budget_create: {
    typeName: '预算编制',
    loader: async (requestId) => {
      const { useBudgetStore } = await import('../stores/useBudgetStore');
      const state = useBudgetStore.getState();
      if (state.budgets?.length === 0) await state.loadItems?.();
      return useBudgetStore.getState().budgets?.find((b: any) => b.id === requestId);
    },
  },
  budget_adjust: {
    typeName: '预算调整',
    loader: async (requestId) => {
      const { useBudgetStore } = await import('../stores/useBudgetStore');
      const state = useBudgetStore.getState();
      return state.budgets?.find((b: any) => b.id === requestId);
    },
  },

  // ========== 作物补录相关 ==========
  seed_source: {
    typeName: '种源补录',
    loader: async (requestId) => {
      const { useSeedSourceStore } = await import('../stores/useSeedSourceStore');
      const state = useSeedSourceStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useSeedSourceStore.getState().items?.find((s: any) => s.id === requestId);
    },
  },
  seed_source_inbound: {
    typeName: '种源入库',
    loader: async (requestId) => {
      const { useSeedSourceStore } = await import('../stores/useSeedSourceStore');
      const state = useSeedSourceStore.getState();
      return state.items?.find((s: any) => s.id === requestId);
    },
  },
  seedling: {
    typeName: '育苗补录',
    loader: async (requestId) => {
      const { useSeedlingStore } = await import('../stores/useSeedlingStore');
      const state = useSeedlingStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return useSeedlingStore.getState().items?.find((s: any) => s.id === requestId);
    },
  },
  seedling_plan: {
    typeName: '育苗计划',
    loader: async (requestId) => {
      const { useSeedlingStore } = await import('../stores/useSeedlingStore');
      const state = useSeedlingStore.getState();
      return state.items?.find((s: any) => s.id === requestId);
    },
  },
  planting_plan: {
    typeName: '种植计划',
    loader: async (requestId) => {
      const { usePlantingStore } = await import('../stores/usePlantingStore');
      const state = usePlantingStore.getState();
      if (state.items?.length === 0) await state.loadItems?.();
      return usePlantingStore.getState().items?.find((p: any) => p.id === requestId);
    },
  },
  crop_storage: {
    typeName: '作物入库补录',
    loader: async (requestId) => {
      const { useCropStorageStore } = await import('../stores/useCropStorageStore');
      const state = useCropStorageStore.getState();
      return (state as any).items?.find((i: any) => i.id === requestId);
    },
  },

  // ========== 订单相关 ==========
  order_create: {
    typeName: '订单创建',
    loader: async (requestId) => {
      const { useOrderStore } = await import('../stores/useOrderStore');
      const state = useOrderStore.getState();
      return (state as any).orders?.find((o: any) => o.id === requestId);
    },
  },
  order: {
    typeName: '订单',
    loader: async (requestId) => {
      const { useOrderStore } = await import('../stores/useOrderStore');
      const state = useOrderStore.getState();
      return (state as any).orders?.find((o: any) => o.id === requestId);
    },
  },

  // ========== 公告 ==========
  announcement: {
    typeName: '公告',
    loader: async (requestId) => {
      const { useAnnouncementStore } = await import('../stores/useAnnouncementStore');
      const state = useAnnouncementStore.getState();
      if (state.announcements?.length === 0) await state.loadItems?.();
      return useAnnouncementStore.getState().announcements?.find((a: any) => a.id === requestId);
    },
  },
};

// ============================================================
// 主 Hook
// ============================================================

export function useApprovalBusinessDetail(approval: Approval | null): BusinessDetailData {
  const [businessData, setBusinessData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBusinessData = useCallback(async (approval: Approval) => {
    const businessType = approval.businessLink?.type;
    const requestId = approval.businessLink?.requestId;

    if (!businessType || !requestId) {
      setBusinessData(null);
      setIsLoading(false);
      return;
    }

    const storeConfig = BUSINESS_STORE_MAP[businessType];
    if (!storeConfig) {
      // 未配置的审批类型，静默跳过
      setBusinessData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await storeConfig.loader(requestId);
      setBusinessData(data || null);
    } catch (err) {
      console.error(`[useApprovalBusinessDetail] 加载业务数据失败 (${businessType}):`, err);
      setError((err as Error).message);
      setBusinessData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (approval) {
      loadBusinessData(approval);
    } else {
      setBusinessData(null);
      setIsLoading(false);
      setError(null);
    }
  }, [approval, loadBusinessData]);

  const typeName = approval?.businessLink?.type
    ? BUSINESS_STORE_MAP[approval.businessLink.type]?.typeName || approval.businessLink.type
    : '';

  return { data: businessData, typeName, isLoading, error };
}

// ============================================================
// 便捷函数：获取业务详情（非Hook，可在回调中使用）
// ============================================================

export async function fetchBusinessDetail(approval: Approval): Promise<BusinessDetailData> {
  const businessType = approval.businessLink?.type;
  const requestId = approval.businessLink?.requestId;

  if (!businessType || !requestId) {
    return { data: null, typeName: '', isLoading: false, error: null };
  }

  const storeConfig = BUSINESS_STORE_MAP[businessType];
  if (!storeConfig) {
    return { data: null, typeName: '', isLoading: false, error: null };
  }

  try {
    const data = await storeConfig.loader(requestId);
    return { data: data || null, typeName: storeConfig.typeName, isLoading: false, error: null };
  } catch (err) {
    return { data: null, typeName: storeConfig.typeName, isLoading: false, error: (err as Error).message };
  }
}

export default useApprovalBusinessDetail;
