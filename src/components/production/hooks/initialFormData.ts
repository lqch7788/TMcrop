/**
 * 生产计划表单默认值
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 */
import { PlanType } from '../../../types';
import { useAuthStore } from '../../../stores';
import type { ProductionFormData } from './types';

// 表单默认值
export const getInitialFormData = (): ProductionFormData => {
  // M-02: 从 useAuthStore 获取当前登录用户；若未登录则空字符串（不硬编码 fallback 用户名）
  const initialUsername = useAuthStore.getState().currentUser?.username || '';
  return {
    batchCode: '',
    planType: PlanType.PLANTING as PlanType,
    planTypeName: '种植计划',
    cropCode: '',
    cropName: '',
    variety: '',
    greenhouseId: [],
    plantingArea: '',
    plantingAreaUnit: 'm²',
    startDate: '',
    expectedHarvestDate: '',
    targetYield: '',
    unit: 'kg',
    plantingMode: [],
    responsiblePerson: '',
    publisher: initialUsername,
    description: '',
    planDetail: '',
    // 关联订单字段
    orderId: [],
    orderCode: [],
    // 2026-06-14: 目标语义分流（默认 0，按 plan_type 决定显示哪些字段）
    targetSeedlingCount: 0,
    targetInputCount: 0,
    targetOutputCount: 0,
    targetExpandedCount: 0,
  };
};
