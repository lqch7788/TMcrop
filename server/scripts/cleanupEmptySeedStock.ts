/**
 * 2026-07-16：物理清理历史"僵尸"种源库存
 *
 * 背景：
 *   种源退库后产生的新种源库存（stock_type='seed'，退库后 quantity=0）的 status 标记为 'depleted'/'transferred'，
 *   这些记录无业务价值且无法被 inventoryDeleteGuard 删除（因 TX-RET-OUT 流水关联），
 *   导致它们在作物库存列表里反复出现，用户也无法清理。
 *
 * 本脚本：物理 DELETE 这类僵尸记录 + 关联的退库流水 + 关联的入库记录，
 *   因为这些记录本就是无效状态（种源退库业务流水的终点），删除不破坏有效追溯链。
 *
 * 修复后：
 *   - 退库代码 status='transferred'（避免新产生僵尸，已在 seedSourceReturn.service.ts 修改）
 *   - DELETE API 白名单（已在 inventoryDeleteGuard.service.ts 修改）
 *   - 本脚本一次性清理历史遗留（替代手工 SQL）
 *
 * 用法：npx tsx server/scripts/cleanupEmptySeedStock.ts
 *
 * 幂等：可重复执行（清理完后再次执行无效果）。
 */
import { initDatabase, getDatabase, saveDatabase } from '../src/db';

(async () => {
  await initDatabase();
  const db = getDatabase();

  // 查找所有 stock_type='seed' 且 current_quantity=0 且 status 在 {transferred/depleted/empty} 的库存
  const findStmt = db.prepare(`
    SELECT id, instance_id, current_quantity, status, business_id, create_time
    FROM inventory_stock
    WHERE stock_type = 'seed'
      AND current_quantity = 0
      AND (status IS NULL OR status IN ('transferred', 'depleted', 'empty'))
    ORDER BY create_time DESC
  `);

  const candidates: Array<{
    id: string;
    instance_id: string;
    current_quantity: number;
    status: string;
    business_id: string;
  }> = [];
  while (findStmt.step()) {
    const r = findStmt.getAsObject() as Record<string, unknown>;
    candidates.push({
      id: String(r.id),
      instance_id: String(r.instance_id),
      current_quantity: Number(r.current_quantity),
      status: String(r.status || ''),
      business_id: String(r.business_id || ''),
    });
  }
  findStmt.free();

  console.log(`\n=== 找到 ${candidates.length} 条 0 数量种源库存（待物理清理） ===`);
  for (const c of candidates) {
    console.log(`  ${c.instance_id} (id=${c.id}, status=${c.status}, biz=${c.business_id})`);
  }

  if (candidates.length === 0) {
    console.log('\n✓ 无需清理');
    process.exit(0);
  }

  // 事务包裹：物理删除
  db.exec('BEGIN TRANSACTION');
  let deletedStock = 0;
  let deletedTx = 0;
  let deletedIr = 0;

  try {
    for (const c of candidates) {
      // 1. 删 inventory_transaction（关联的退库流水 + 调拨流水）
      const delTx = db.prepare(`DELETE FROM inventory_transaction WHERE instance_id = ?`);
      delTx.bind([c.instance_id]);
      delTx.step();
      deletedTx += (db.getRowsModified ? db.getRowsModified() : 0);
      delTx.free();

      // 2. 删 inventory_inbound_records（关联的入库流水）
      const delIr = db.prepare(`DELETE FROM inventory_inbound_records WHERE source_id = ?`);
      delIr.bind([c.id]);
      delIr.step();
      deletedIr += (db.getRowsModified ? db.getRowsModified() : 0);
      delIr.free();

      // 3. 删 inventory_stock 自身
      const delStock = db.prepare(`DELETE FROM inventory_stock WHERE id = ?`);
      delStock.bind([c.id]);
      delStock.step();
      if (db.getRowsModified) {
        deletedStock += db.getRowsModified();
      } else {
        // fallback：检查 row 是否真的被删
        const chk = db.prepare(`SELECT id FROM inventory_stock WHERE id = ?`);
        chk.bind([c.id]);
        if (!chk.step()) deletedStock++;
        chk.free();
      }
      delStock.free();
    }

    db.exec('COMMIT');
    saveDatabase();

    console.log(`\n✓ 清理完成`);
    console.log(`  - inventory_stock: ${deletedStock} 条删除`);
    console.log(`  - inventory_transaction: ${deletedTx} 条删除（关联流水）`);
    console.log(`  - inventory_inbound_records: ${deletedIr} 条删除（关联入库）`);
    console.log('\n后续操作：强刷浏览器（Ctrl+Shift+R）→ 作物库存列表将自动隐藏这些记录');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('✗ 清理失败:', (e as Error).message);
    process.exit(1);
  }
})().catch((e) => {
  console.error('SCRIPT ERR:', e);
  process.exit(1);
});