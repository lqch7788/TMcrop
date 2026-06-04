/**
 * 出库流水测试数据生成脚本 (V3.1)
 * 用法：cd D:/TMcrop/yuanxingtu/V1.1 && npx tsx scripts/seedOutboundFixtures.ts
 *
 * 跨 2025-12 至 2026-06 共 7 个月生成 1000 条出库流水
 * + 先建 50 个 stock（避免 LEFT JOIN 全部 null）
 * 设计文档：docs/superpowers/plans/2026-06-04-outbound-records.md Task 4.1
 */

import { initDatabase, saveDatabase, getDatabase } from '../server/src/db';
import { initializeDatabase } from '../server/src/db/schema';
import { fixMissingSchema } from '../server/src/db/fixMissingSchema';
import { execCount } from '../server/src/utils/queryHelper';

const COUNT = 1000;
const CROPS = [
  { name: '番茄', variety: '粉冠F1',  code: 'TS0000000001' },
  { name: '黄瓜', variety: '水果黄瓜', code: 'TS0000000002' },
  { name: '辣椒', variety: '尖椒',     code: 'TS0000000003' },
  { name: '生菜', variety: '罗马生菜', code: 'TS0000000004' },
];
const STOCK_TYPES = ['seed', 'seedling', 'product'] as const;
const BUSINESS_TYPES = ['harvest', 'purchase', 'manual', 'transfer'] as const;
const WAREHOUSES = [
  { id: 'WH001', name: '成品冷库A区' },
  { id: 'WH002', name: '常温仓库' },
  { id: 'W002',  name: '种苗库' },
];
const OPERATORS = ['张三', '李四', '王五', '赵六', 'system'] as const;
const PLANTING_MODES = ['open_field', 'greenhouse', 'hydroponic', 'substrate'] as const;
const GRADES = ['special', 'excellent', 'good', 'qualified', 'unqualified'] as const;
const UNITS = ['公斤', '株', '袋', '箱', '盘'] as const;

(async () => {
  console.log('初始化数据库...');
  await initDatabase();           // 必须 await，否则 initializeDatabase 拿不到 db
  initializeDatabase();
  await fixMissingSchema();
  // 重新拿 db 引用（initializeDatabase 内部可能重新初始化）
  const db = getDatabase();

  // 1. 准备 stock（不足 50 个则创建）
  const stockCount = execCount(db, 'SELECT COUNT(*) FROM inventory_stock');
  console.log(`当前库存实例: ${stockCount}`);
  if (stockCount < 50) {
    const need = 50 - stockCount;
    console.log(`需新建 ${need} 个库存实例...`);
    for (let i = 0; i < need; i++) {
      const stockType = STOCK_TYPES[i % 3];
      const crop = CROPS[i % CROPS.length];
      const wh = WAREHOUSES[i % WAREHOUSES.length];
      const instId = `IPR-FIX-${String(i).padStart(4, '0')}`;
      const date = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const unit = UNITS[i % UNITS.length];
      const qty = 100 + (i % 10) * 50;
      db.run(`INSERT OR IGNORE INTO inventory_stock
        (id, instance_id, stock_type, business_id, business_type, business_code, crop_id, crop_name, variety_id, variety_name, crop_code,
         current_quantity, frozen_quantity, available_quantity, unit, warehouse_id, warehouse_name, inbound_date, source_type, status, version,
         planting_mode, grade, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`STK-FIX-${i}`, instId, stockType, `TEST-BIZ-${i}`, 'manual', `FIX-${i}`, '', crop.name, '', crop.variety, crop.code,
         qty, 0, qty, unit, wh.id, wh.name, date, 'manual', 'in_stock', 1,
         PLANTING_MODES[i % 4], GRADES[i % 5], now, now]);
    }
    saveDatabase();
    console.log(`✓ 新建 ${need} 个库存实例`);
  }

  // 2. 准备 1000 条出库流水（跨 2025-12-01 至 2026-06-30 共 7 个月）
  const existingTx = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type = 'outbound'");
  console.log(`当前出库流水: ${existingTx}`);

  // 3. 准备 stock 列表（用于关联）
  const stockRows = db.exec('SELECT instance_id FROM inventory_stock ORDER BY instance_id LIMIT 50');
  const stockIds: string[] = (stockRows[0]?.values || []).map((r: any) => r[0]);
  if (stockIds.length === 0) {
    console.error('❌ 没有可用的库存实例，请先建 stock');
    process.exit(1);
  }

  const startTs = new Date('2025-12-01').getTime();
  const endTs = new Date('2026-06-30').getTime();
  const range = endTs - startTs;

  console.log(`开始生成 ${COUNT} 条跨月出库流水...`);
  // 先清理上次 seed 留下的 FIX 流水（避免 UNIQUE 冲突，幂等运行）
  db.run(`DELETE FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'`);
  saveDatabase();
  const cleaned = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'");
  console.log(`清理 TRX-FIX-* 流水: 剩余 ${cleaned} 条`);
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < COUNT; i++) {
    const stockType = STOCK_TYPES[i % 3];
    const instId = stockIds[i % stockIds.length];
    const ts = new Date(startTs + Math.random() * range);
    const date = ts.toISOString().slice(0, 10);
    const businessType = BUSINESS_TYPES[i % BUSINESS_TYPES.length];
    const txId = `TRX-FIX-${String(i).padStart(5, '0')}`;
    const qty = -(Math.floor(Math.random() * 50) + 1);
    const op = OPERATORS[i % OPERATORS.length];
    const bizIdx = i % stockIds.length;

    try {
      db.run(`INSERT INTO inventory_transaction
        (id, transaction_id, instance_id, stock_type, transaction_type, quantity, balance_before, balance_after,
         business_id, business_type, business_code, operator_id, operator_name, operate_date, remarks, create_time)
        VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, txId, instId, stockType, qty, 100, 100 + qty,
         `TEST-BIZ-${bizIdx}`, businessType, `FIX-${bizIdx}`,
         `OP-${i % 5}`, op, date, `seed 测试流水 ${i}`, ts.toISOString()]);
      inserted++;
    } catch (e: any) {
      failed++;
      if (failed <= 3) console.error(`插入失败 #${i}:`, e.message);
    }
  }
  saveDatabase();

  // 重新拿 db（saveDatabase 之后 db 句柄可能仍有效，但保险起见重查）
  const finalDb = getDatabase();
  const stmt = finalDb.prepare("SELECT COUNT(*) AS total FROM inventory_transaction WHERE transaction_type = 'outbound'");
  let total = 0;
  if (stmt.step()) {
    total = (stmt.getAsObject() as any).total || 0;
  }
  stmt.free();
  console.log(`✅ 完成。成功: ${inserted}，失败: ${failed}，出库流水总数: ${total}`);
  process.exit(0);
})();
