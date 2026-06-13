/**
 * 物料流转追溯系统 — 前端类型定义
 * 2026-06-13 新建
 */

/** 流转类型枚举 */
export type FlowType =
  | 'inventory→seed_source' | 'plan→seed_source'
  | 'seed_source→seedling' | 'seed_source→planting'
  | 'seedling→planting' | 'planting→seed_source'
  | 'planting→harvest' | 'seedling→harvest'
  | 'harvest→inventory'
  | 'external→seedling' | 'external→planting'
  | 'inventory→external' | 'inventory→planting'
  | 'inventory→seedling' | 'correction';

/** 来源分类统一枚举 */
export enum FlowSourceCategory {
  EXTERNAL_PURCHASE = 'external_purchase',
  SELF_PRODUCED = 'self_produced',
  BREEDING = 'breeding',
  ASEXUAL = 'asexual',
  GIFT = 'gift',
  TRANSFER = 'transfer',
  MANUAL = 'manual',
  EXTERNAL = 'external',
  OTHER = 'other',
}

/** 流转日志记录 */
export interface MaterialFlowLog {
  id: string;
  oid: number;
  flowType: FlowType;
  cropCode?: string;
  cropName: string;
  cropVariety?: string;
  sourceType?: string;
  sourceId?: string;
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  sourceCategory?: string;
  targetType: string;
  targetId: string;
  targetCode: string;
  targetQuantity?: number;
  targetUnit?: string;
  businessId?: string;
  businessCode?: string;
  createdAt: string;
  createdBy?: string;
}

/** 来源分类映射：各模块枚举 -> FlowSourceCategory */
export const PROPAGATION_TO_SOURCE_CATEGORY: Record<string, FlowSourceCategory> = {
  EXTERNAL: FlowSourceCategory.EXTERNAL_PURCHASE,
  BREEDING: FlowSourceCategory.BREEDING,
  SEED_SAVING: FlowSourceCategory.SELF_PRODUCED,
  ASEXUAL: FlowSourceCategory.ASEXUAL,
};

/** 库存来源类型 → source_category 映射 */
export const INVENTORY_SOURCE_TO_CATEGORY: Record<string, FlowSourceCategory> = {
  external_purchased: FlowSourceCategory.EXTERNAL_PURCHASE,
  self_produced: FlowSourceCategory.SELF_PRODUCED,
  gift: FlowSourceCategory.GIFT,
  transfer: FlowSourceCategory.TRANSFER,
  manual: FlowSourceCategory.MANUAL,
};
