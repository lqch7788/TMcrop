/**
 * 种源详情弹窗共享常量
 * 2026-10-18：从 DetailModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { ReactNode } from 'react';
import { ArrowLeftRight, Store, Sprout } from 'lucide-react';

/** 入库模式配置 — 三种入口各有不同的关联信息 */
export const MODE_CONFIG: Record<string, { label: string; icon: ReactNode; color: string }> = {
  planting_self_kept:   { label: '种植留种', icon: <Sprout className="w-4 h-4" />,      color: 'text-green-700 bg-green-50' },
  inventory_transfer:   { label: '库存调拨', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-cyan-700 bg-cyan-50' },
  transfer_from_inventory: { label: '库存调拨', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-cyan-700 bg-cyan-50' },
  external_purchase:    { label: '外购入库', icon: <Store className="w-4 h-4" />,         color: 'text-blue-700 bg-blue-50' },
  external:             { label: '外购入库', icon: <Store className="w-4 h-4" />,         color: 'text-blue-700 bg-blue-50' },
};

// 来源模块中文映射（与 SeedSourceInboundModal 的 sourceModule 保持一致）
// 2026-07-14：移到模块顶层（避免 InboundRecordsPanel 每次 render 重建）
// 2026-07-19：补全所有 inventory_inbound_records.source_module / crop_circulation_records.source_module 实际值
// - inventory_inbound_records.source_module 实际值：seed_source / inventory / inventory_inbound / seedling / planting / harvest
// - crop_circulation_records.source_module 实际值：planting / seedling / harvest / seed_source
export const SOURCE_MODULE_MAP: Record<string, string> = {
  // inventory_inbound_records 来源
  seed_source: '商品种源入库',
  inventory: '库存调拨',
  inventory_inbound: '外购入库',
  // crop_circulation_records（PROPAGATION 自产回流）来源
  planting: '种植采收回流',
  seedling: '育苗回流',
  harvest: '采收回流',
  // 兜底
  circulation: '作物流转',
  circulation_records: '作物流转',
  inbound: '入库流水',
};
