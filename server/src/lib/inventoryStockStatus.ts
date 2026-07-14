/**
 * 库存状态计算工具（V3.0 统一层）
 *
 * 唯一权威的 status 计算入口，所有写操作（冻结/出库/解冻/调拨/补录/编辑）
 * 和批量重算脚本都必须使用本文件导出的函数。
 *
 * 严禁在多处重复实现 0/10 阈值逻辑或优先级判断。
 *
 * 2026-07-14：方案 C 重构 — 状态不再是写入时的"快照"，而是基于数量/冻结量
 * 实时计算。优点：UI 永远显示最新状态，无需定时任务。
 */

import type { Database } from 'sql.js';

/** 库存状态枚举（与前端 InventoryStatus 完全对应） */
export type InventoryStockStatus =
  | 'in_stock'       // 库存中（绿色）
  | 'low_stock'      // 低库存 < 10（黄色）
  | 'frozen_full'    // 全部冻结（深蓝色）
  | 'frozen_partial' // 部分冻结（浅蓝色）
  | 'outbound'       // 已出库（灰色）
  | 'empty'          // 已用完（红色）
  | 'transferred';   // 已调拨（青色，源行从作物库存列表中隐藏）

/** 低库存阈值（与 inventory.repository.ts:469 统计接口一致） */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * 核心计算：当前数量 + 冻结量 + 原状态 → 库存状态
 *
 * 优先级（从高到低）：
 * 1. transferred — 已调拨，源行不显示在作物库存列表
 * 2. frozen      — 冻结优先于其他状态（冻结的部分无法出库）
 * 3. empty       — 数量 = 0
 * 4. low_stock   — 数量 < LOW_STOCK_THRESHOLD
 * 5. in_stock    — 正常库存
 *
 * @param currentQuantity 当前可用量（current_quantity 字段）
 * @param frozenQuantity  冻结量（frozen_quantity 字段）
 * @param rawStatus       数据库中的原 status（保留 transferred 状态）
 */
export function computeInventoryStatus(
  currentQuantity: number,
  frozenQuantity: number,
  rawStatus: string | null | undefined
): InventoryStockStatus {
  // 1. transferred 状态一旦设置就不变（用户主动标记）
  if (rawStatus === 'transferred') return 'transferred';

  // 2. 冻结状态优先于数量判断（冻结的部分仍占库存）
  // 2026-07-14：区分全部冻结 vs 部分冻结
  if (frozenQuantity > 0) {
    return frozenQuantity >= currentQuantity ? 'frozen_full' : 'frozen_partial';
  }

  // 3. 数量为 0 → empty
  if (currentQuantity <= 0) return 'empty';

  // 4. 数量 < 阈值 → low_stock
  if (currentQuantity < LOW_STOCK_THRESHOLD) return 'low_stock';

  // 5. 默认 in_stock
  return 'in_stock';
}

/**
 * 重算并更新单条库存的 status
 * @returns 更新后的 status
 */
export function recomputeAndUpdateStockStatus(
  db: Database,
  instanceId: string
): InventoryStockStatus | null {
  const stmt = db.prepare(
    'SELECT current_quantity, frozen_quantity, status FROM inventory_stock WHERE instance_id = ?'
  );
  stmt.bind([instanceId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as any;
  stmt.free();

  const newStatus = computeInventoryStatus(
    Number(row.current_quantity) || 0,
    Number(row.frozen_quantity) || 0,
    row.status
  );

  db.run(
    'UPDATE inventory_stock SET status = ?, update_time = ? WHERE instance_id = ?',
    [newStatus, new Date().toISOString(), instanceId]
  );

  return newStatus;
}

/**
 * 批量重算所有 inventory_stock 的 status
 * @returns { updated, total } 更新条数和总条数
 */
export function recomputeAllStockStatus(db: Database): { updated: number; total: number } {
  // 1. 统计总数
  const countResult = db.exec('SELECT COUNT(*) as c FROM inventory_stock');
  const total = Number(countResult[0]?.values?.[0]?.[0] || 0);

  // 2. 遍历所有记录
  const allStmt = db.prepare('SELECT instance_id, current_quantity, frozen_quantity, status FROM inventory_stock');
  const updates: Array<{ instanceId: string; newStatus: InventoryStockStatus }> = [];

  while (allStmt.step()) {
    const row = allStmt.getAsObject() as any;
    const newStatus = computeInventoryStatus(
      Number(row.current_quantity) || 0,
      Number(row.frozen_quantity) || 0,
      row.status
    );
    if (newStatus !== row.status) {
      updates.push({ instanceId: row.instance_id, newStatus });
    }
  }
  allStmt.free();

  // 3. 批量更新
  if (updates.length > 0) {
    const upd = db.prepare('UPDATE inventory_stock SET status = ?, update_time = ? WHERE instance_id = ?');
    const now = new Date().toISOString();
    for (const { instanceId, newStatus } of updates) {
      upd.run([newStatus, now, instanceId]);
    }
    upd.free();
  }

  return { updated: updates.length, total };
}
