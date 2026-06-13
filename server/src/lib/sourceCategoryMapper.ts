/**
 * 各模块枚举 → material_flow_log.source_category 统一映射器
 * 2026-06-13 新建
 */

/** 种源 propagationType -> source_category */
export function mapPropagationToCategory(propagationType: string | null | undefined): string {
  const map: Record<string, string> = {
    EXTERNAL: 'external_purchase',
    BREEDING: 'breeding',
    SEED_SAVING: 'self_produced',
    ASEXUAL: 'asexual',
  };
  return (propagationType && map[propagationType]) ? map[propagationType] : 'other';
}

/** 库存 sourceType -> source_category */
export function mapInventorySourceToCategory(sourceType: string | null | undefined): string {
  const map: Record<string, string> = {
    external_purchased: 'external_purchase',
    self_produced: 'self_produced',
    gift: 'gift',
    transfer: 'transfer',
    manual: 'manual',
    external: 'external',
  };
  return (sourceType && map[sourceType]) ? map[sourceType] : 'other';
}

/** 出库 businessType -> flow_type（需要写流水的类型） */
export function mapOutboundToFlowType(businessType: string): string | null {
  const map: Record<string, string> = {
    customer_sale: 'inventory→external',
    internal_planting: 'inventory→planting',
    internal_seedling: 'inventory→seedling',
    internal_seed_source: 'inventory→seed_source',
    transfer_out: 'inventory→external',
  };
  return map[businessType] || null;
}

/** 出库白名单：判断是否需要写 flow_log */
export function isOutboundSkipped(businessType: string): boolean {
  return mapOutboundToFlowType(businessType) === null;
}
