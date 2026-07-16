/**
 * 2026-07-16：手动跑 inventory_stock crop_name 归一化迁移
 *
 * 背景：
 *   - 历史入库时把"品种名"误当作"作物名"传入（如「宁玉」实际是「草莓」品种），
 *     导致 inventory_stock.crop_name = variety_name（如「宁玉（宁玉）」），
 *     UI 显示错位。
 *   - 修复代码在 src/db/fixMissingSchema.ts，但该函数被启动白名单禁用
 *     （server/src/index.ts:173 注释：YELLOW 级含 UPDATE 迁移，c55 事故）。
 *   - 用独立脚本方式手动跑（与 runMethodMigration.ts 一致）。
 *
 * 用法：npx tsx server/scripts/migrateInventoryCropName.ts
 *
 * 幂等：写 schema_migrations 记录，只跑一次；如需重跑先 DELETE 该记录。
 */
import { initDatabase, getDatabase, saveDatabase } from '../src/db';

(async () => {
  await initDatabase();
  const db = getDatabase();

  // 安全检查：inventory_stock / crop_varieties 表是否存在
  const stockCols = db.exec(`PRAGMA table_info(inventory_stock)`);
  if (stockCols.length === 0) {
    console.error('✗ inventory_stock 表不存在，请先初始化数据库');
    process.exit(1);
  }
  const varietyCols = db.exec(`PRAGMA table_info(crop_varieties)`);
  if (varietyCols.length === 0) {
    console.error('✗ crop_varieties 表不存在，请先初始化数据库');
    process.exit(1);
  }

  // 幂等检查
  db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const checkStmt = db.prepare(`SELECT id FROM schema_migrations WHERE id = ?`);
  checkStmt.bind(['inventory_stock_crop_name_normalize_v1']);
  const alreadyApplied = checkStmt.step();
  checkStmt.free();
  if (alreadyApplied) {
    console.log('• 已执行过 inventory_stock_crop_name_normalize_v1，跳过');
    console.log('  如需强制重跑：DELETE FROM schema_migrations WHERE id = \'inventory_stock_crop_name_normalize_v1\';');
    process.exit(0);
  }

  // 查找 crop_name 在 crop_varieties.sub_variety1_name 中能命中的库存行
  const findStmt = db.prepare(`
    SELECT s.id, s.crop_name, s.variety_name,
           cv.variety_name AS cv_variety_name, cv.sub_variety1_name AS cv_sub1
    FROM inventory_stock s
    INNER JOIN crop_varieties cv
      ON cv.sub_variety1_name = s.crop_name AND cv.status = 'active'
    WHERE s.crop_name IS NOT NULL AND s.crop_name != ''
  `);
  const updateStmt = db.prepare(`
    UPDATE inventory_stock
    SET crop_name = ?, variety_name = COALESCE(variety_name, ?)
    WHERE id = ?
  `);

  const fixedRows: Array<{
    id: string;
    old: { crop: string; variety: string | null };
    new: { crop: string; variety: string };
  }> = [];
  while (findStmt.step()) {
    const r = findStmt.getAsObject() as Record<string, unknown>;
    const newCropName = String(r.cv_variety_name || r.crop_name || '');
    const newVarietyName = String(r.cv_sub1 || r.variety_name || '');
    updateStmt.bind([newCropName, newVarietyName, String(r.id)]);
    updateStmt.step();
    fixedRows.push({
      id: String(r.id),
      old: { crop: String(r.crop_name || ''), variety: (r.variety_name as string | null) || null },
      new: { crop: newCropName, variety: newVarietyName },
    });
  }
  findStmt.free();
  updateStmt.free();

  // 写 schema_migrations 记录
  if (fixedRows.length > 0) {
    const ins = db.prepare(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`);
    ins.bind(['inventory_stock_crop_name_normalize_v1', new Date().toISOString()]);
    ins.step();
    ins.free();
    saveDatabase();
  }

  // 输出报告
  console.log(`\n✓ 修复完成，共 ${fixedRows.length} 行 inventory_stock 数据`);
  console.log('=== 修复明细 ===');
  for (const row of fixedRows) {
    console.log(`  ${row.id}:`);
    console.log(`    原值: crop_name='${row.old.crop}', variety_name='${row.old.variety ?? 'null'}'`);
    console.log(`    新值: crop_name='${row.new.crop}', variety_name='${row.new.variety}'`);
  }

  console.log('\n=== 关键样本验证 ===');
  const samples = ['INS-20260716-0001', 'INS-20260716-0002', 'IPR-20260713-0003'];
  for (const iid of samples) {
    const stmt = db.prepare(`SELECT instance_id, crop_name, variety_name FROM inventory_stock WHERE instance_id = ?`);
    stmt.bind([iid]);
    if (stmt.step()) {
      const r = stmt.getAsObject();
      console.log(`  ${r.instance_id}: crop_name='${r.crop_name}', variety_name='${r.variety_name}'`);
    }
    stmt.free();
  }
})().catch((e) => {
  console.error('MIG ERR:', e);
  process.exit(1);
});