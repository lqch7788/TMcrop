/**
 * 各模块枚举 → material_flow_log.source_category 统一映射器
 * 2026-06-13 新建
 * 2026-08-21：返回值改为中文（与 CATEGORY_LABELS / 用户界面保持一致）
 */

/** 种源 propagationType -> source_category（大小写不敏感匹配） */
export function mapPropagationToCategory(propagationType: string | null | undefined): string {
  if (!propagationType) return '其他';
  const map: Record<string, string> = {
    EXTERNAL: '外购',
    EXTERNAL_PURCHASE: '外购',
    BREEDING: '育种',
    SEED_SAVING: '自留种',
    ASEXUAL: '无性繁殖',
    PLANTING_SELF_KEPT: '自留种植',
    TRANSFER_FROM_INVENTORY: '调拨',
    GRAFTING: '嫁接',
    TISSUE_CULTURE: '组培',
    CUTTING: '�插',
    DIVISION: '分株',
    LAYERING: '压条',
    BULB: '种球',
  };
  const key = propagationType.toUpperCase();
  return map[key] || '其他';
}

/** 库存 sourceType -> source_category */
export function mapInventorySourceToCategory(sourceType: string | null | undefined): string {
  const map: Record<string, string> = {
    external_purchased: '外购',
    self_produced: '自产',
    gift: '赠送',
    transfer: '调拨',
    manual: '手动',
    external: '外部',
  };
  return (sourceType && map[sourceType]) ? map[sourceType] : '其他';
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
