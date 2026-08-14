/**
 * 一次性回填脚本：按 harvest_records 历史入库量回填 plantings.harvest_to_inventory_qty
 *
 * 2026-08-14 背景：
 * - 种植列表"已入库量"列（数据源 = plantings.harvest_to_inventory_qty）长期断链：
 *   plantings 表无此列、无任何写入路径，列表恒显示 '-'（与育苗 harvest_stocked_count 同款断链）
 * - 本次改造已在 inventoryInboundFromSource.service 打通种植实时累加链路，
 *   本脚本负责一次性回填历史存量
 *
 * 一次性设计（对齐 backfillSeedlingHarvestStocked）：执行成功后写 system_configs 标记
 *   （config_key = 'planting_harvest_to_inventory_backfill_done'），之后启动永久跳过。
 * 回填口径：仅回填 harvest_to_inventory_qty 为 0/NULL 的行（不覆盖手工纠错为非 0 的值）
 * 启动方式：index.ts 启动白名单显式调用
 */

import { getDatabase, saveDatabase } from './index';

/** 回填完成标记（system_configs.config_key） */
const BACKFILL_DONE_KEY = 'planting_harvest_to_inventory_backfill_done';

export function backfillPlantingHarvestToInventory(): { filledCount: number; totalQty: number } {
  const db = getDatabase();

  // 一次性标记：已回填过则永久跳过
  try {
    const doneStmt = db.prepare('SELECT config_key FROM system_configs WHERE config_key = ?');
    doneStmt.bind([BACKFILL_DONE_KEY]);
    if (doneStmt.step()) {
      doneStmt.free();
      return { filledCount: 0, totalQty: 0 };
    }
    doneStmt.free();
  } catch {
    // system_configs 表可能不存在（旧库），继续尝试回填
  }

  // 安全检查：依赖列存在才执行
  try {
    db.exec('SELECT harvest_to_inventory_qty FROM plantings LIMIT 0');
    db.exec('SELECT products, source_module, source_id FROM harvest_records LIMIT 0');
  } catch (e: any) {
    console.warn('[backfillPlantingHarvestToInventory] 依赖列不存在，跳过:', e?.message || e);
    return { filledCount: 0, totalQty: 0 };
  }

  // 遍历种植入库记录（含补录），按 source_id 聚合入库总量
  const stmt = db.prepare("SELECT source_id, products FROM harvest_records WHERE source_module = 'planting'");
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
      // products 非法 JSON 跳过该条（累加口径与入库 service 一致）
    }
    totals.set(row.source_id, (totals.get(row.source_id) || 0) + sum);
  }
  stmt.free();

  if (totals.size === 0) {
    // 无种植历史入库记录：仍写标记（避免每次启动重复扫描）
    writeDoneMark(db);
    return { filledCount: 0, totalQty: 0 };
  }

  let filledCount = 0;
  let totalQty = 0;
  for (const [plantingId, qty] of totals.entries()) {
    if (qty <= 0) continue;
    // 仅回填 0/NULL 行，保护手工纠错值（getRowsModified 精确统计实际回填数）
    db.run(
      'UPDATE plantings SET harvest_to_inventory_qty = ?, update_time = COALESCE(update_time, ?) WHERE id = ? AND (harvest_to_inventory_qty IS NULL OR harvest_to_inventory_qty = 0)',
      [qty, new Date().toISOString(), plantingId],
    );
    if (db.getRowsModified() > 0) {
      filledCount += 1;
      totalQty += qty;
    }
  }

  // 写入一次性完成标记（此后启动跳过）
  writeDoneMark(db);

  saveDatabase();
  return { filledCount, totalQty };
}

/** 写入回填完成标记（system_configs），失败仅告警不影响回填结果 */
function writeDoneMark(db: ReturnType<typeof getDatabase>): void {
  const now = new Date().toISOString();
  try {
    db.run(
      `INSERT OR IGNORE INTO system_configs (id, config_key, config_value, config_type, category, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'string', 'migration', '种植已入库量历史回填完成标记（一次性）', 1, ?, ?)`,
      ['cfg-backfill-planting-harvest-to-inventory', BACKFILL_DONE_KEY, now, now, now],
    );
  } catch (e) {
    console.warn('[backfillPlantingHarvestToInventory] 写入完成标记失败（不影响回填结果）:', e);
  }
}
