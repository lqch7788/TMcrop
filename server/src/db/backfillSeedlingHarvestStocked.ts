/**
 * 一次性回填脚本：按 harvest_records 历史入库量回填 seedlings.harvest_stocked_count
 *
 * 2026-08-14 背景：
 * - 育苗列表新增"已入库数量"列（数据源 = seedlings.harvest_stocked_count）
 * - 历史入库链路从未累加该字段（普通入库不回写；旧补录回写指向不存在的
 *   harvest_to_inventory_qty 列，属坏代码），导致存量数据恒为 0
 * - 本次改造已在 inventoryInboundFromSource.service 打通实时累加链路，
 *   本脚本负责一次性回填历史存量
 *
 * 幂等设计：仅回填 harvest_stocked_count 为 0/NULL 的行（不覆盖手工纠错为非 0 的值）；
 *           每次启动重算 0 值行，与历史入库记录保持一致（入库/删除动作自身已实时维护该字段）。
 * 启动方式：index.ts 启动白名单显式调用（对齐 backfillTransferInboundRecords 先例）
 */

import { getDatabase, saveDatabase } from './index';

export function backfillSeedlingHarvestStockedCount(): { filledCount: number; totalQty: number } {
  const db = getDatabase();

  // 安全检查：依赖列存在才执行
  try {
    db.exec('SELECT harvest_stocked_count FROM seedlings LIMIT 0');
    db.exec('SELECT products, source_module, source_id FROM harvest_records LIMIT 0');
  } catch (e: any) {
    console.warn('[backfillSeedlingHarvestStockedCount] 依赖列不存在，跳过:', e?.message || e);
    return { filledCount: 0, totalQty: 0 };
  }

  // 遍历育苗入库记录（含补录），按 source_id 聚合入库总量
  const stmt = db.prepare("SELECT source_id, products FROM harvest_records WHERE source_module = 'seedling'");
  const totals = new Map<string, number>();
  while (stmt.step()) {
    const row = stmt.getAsObject() as { source_id: string; products: string };
    if (!row.source_id) continue;
    let sum = 0;
    try {
      const products = JSON.parse(row.products || '[]');
      if (Array.isArray(products)) {
        sum = products.reduce((s: number, p: any) => s + (Number(p?.harvestQuantity) || 0), 0);
      }
    } catch {
      // products 非法 JSON 跳过该条（累加口径与入库 service 一致，不会产生非 JSON）
    }
    totals.set(row.source_id, (totals.get(row.source_id) || 0) + sum);
  }
  stmt.free();

  if (totals.size === 0) {
    return { filledCount: 0, totalQty: 0 };
  }

  let filledCount = 0;
  let totalQty = 0;
  for (const [seedlingId, qty] of totals.entries()) {
    if (qty <= 0) continue;
    // 仅回填 0/NULL 行，保护手工纠错值（getRowsModified 精确统计实际回填数）
    db.run(
      'UPDATE seedlings SET harvest_stocked_count = ?, update_time = COALESCE(update_time, ?) WHERE id = ? AND (harvest_stocked_count IS NULL OR harvest_stocked_count = 0)',
      [qty, new Date().toISOString(), seedlingId],
    );
    if (db.getRowsModified() > 0) {
      filledCount += 1;
      totalQty += qty;
    }
  }

  saveDatabase();
  return { filledCount, totalQty };
}
