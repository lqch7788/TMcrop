/**
 * 出库业务类型（出库用途/目的）
 * 与入库业务类型（src/types/inventory.ts 中的 BusinessType）语义独立。
 * DB 字段 inventory_transaction.business_type 仍为 VARCHAR，存此枚举的字符串值。
 */
export enum OutboundBusinessType {
  CUSTOMER_SALE    = 'customer_sale',
  TRANSFER_OUT     = 'transfer_out',
  DAMAGE_LOSS      = 'damage_loss',
  GIFT_SAMPLE      = 'gift_sample',
  INVENTORY_ADJUST = 'inventory_adjust',
  OTHER            = 'other',
}

export const OUTBOUND_BUSINESS_TYPE_META: Record<OutboundBusinessType, { label: string; color: string }> = {
  [OutboundBusinessType.CUSTOMER_SALE]:     { label: '销售交货', color: 'bg-emerald-100 text-emerald-700' },
  [OutboundBusinessType.TRANSFER_OUT]:      { label: '调拨出库', color: 'bg-blue-100 text-blue-700' },
  [OutboundBusinessType.DAMAGE_LOSS]:       { label: '损耗报损', color: 'bg-red-100 text-red-700' },
  [OutboundBusinessType.GIFT_SAMPLE]:       { label: '赠送/试吃', color: 'bg-purple-100 text-purple-700' },
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

// 2026-07-16：库存类型 meta — 从 OutboundRecordsComponents 抽出复用
// 改为深底白字（500 级实色 + 白字），与"业务"列浅底深字形成对比，且解决组件硬编码 text-white
// 与浅底色叠加导致白字看不清的问题
export const STOCK_TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  seed:     { label: '种源', color: 'bg-amber-500 text-white',    icon: '🌱' },
  seedling: { label: '种苗', color: 'bg-green-500 text-white',    icon: '🌿' },
  product:  { label: '成品', color: 'bg-emerald-500 text-white',  icon: '📦' },
};
