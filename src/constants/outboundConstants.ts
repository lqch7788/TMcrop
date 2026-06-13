/**
 * 出库业务类型（出库用途/目的）
 * 与入库业务类型（src/types/inventory.ts 中的 BusinessType）语义独立。
 * DB 字段 inventory_transaction.business_type 仍为 VARCHAR，存此枚举的字符串值。
 */
export enum OutboundBusinessType {
  CUSTOMER_SALE    = 'customer_sale',
  TRANSFER_OUT     = 'transfer_out',
  DAMAGE_LOSS      = 'damage_loss',
  INTERNAL_PLANTING   = 'internal_planting',
  INTERNAL_SEEDLING   = 'internal_seedling',
  INTERNAL_SEED_SOURCE = 'internal_seed_source',
  GIFT_SAMPLE      = 'gift_sample',
  RETURN_INBOUND   = 'return_inbound',
  INVENTORY_ADJUST = 'inventory_adjust',
  OTHER            = 'other',
}

export const OUTBOUND_BUSINESS_TYPE_META: Record<OutboundBusinessType, { label: string; color: string }> = {
  [OutboundBusinessType.CUSTOMER_SALE]:     { label: '销售交货', color: 'bg-emerald-100 text-emerald-700' },
  [OutboundBusinessType.TRANSFER_OUT]:      { label: '调拨出库', color: 'bg-blue-100 text-blue-700' },
  [OutboundBusinessType.DAMAGE_LOSS]:       { label: '损耗报损', color: 'bg-red-100 text-red-700' },
  [OutboundBusinessType.INTERNAL_PLANTING]:    { label: '内部种植', color: 'bg-green-100 text-green-700' },
  [OutboundBusinessType.INTERNAL_SEEDLING]:    { label: '内部育苗', color: 'bg-lime-100 text-lime-700' },
  [OutboundBusinessType.INTERNAL_SEED_SOURCE]: { label: '内部种源', color: 'bg-teal-100 text-teal-700' },
  [OutboundBusinessType.GIFT_SAMPLE]:       { label: '赠送/试吃', color: 'bg-purple-100 text-purple-700' },
  [OutboundBusinessType.RETURN_INBOUND]:    { label: '退货回库', color: 'bg-amber-100 text-amber-700' },
  [OutboundBusinessType.INVENTORY_ADJUST]:  { label: '盘点调整', color: 'bg-cyan-100 text-cyan-700' },
  [OutboundBusinessType.OTHER]:             { label: '其他',     color: 'bg-gray-100 text-gray-700' },
};

const LEGACY_BUSINESS_TYPE_SET = new Set([
  'harvest', 'purchase', 'manual', 'transfer',
  'seed_source', 'seedling', 'planting',
]);

const OUTBOUND_TYPE_SET = new Set<string>(Object.values(OutboundBusinessType));

export function mapLegacyBusinessType(legacy: string | null | undefined): OutboundBusinessType {
  if (!legacy) return OutboundBusinessType.OTHER;
  if (LEGACY_BUSINESS_TYPE_SET.has(legacy)) return OutboundBusinessType.OTHER;
  if (OUTBOUND_TYPE_SET.has(legacy)) return legacy as OutboundBusinessType;
  return OutboundBusinessType.OTHER;
}
