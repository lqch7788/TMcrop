/**
 * 2026-07-17 PT008 修复 — 把"杀线虫剂"重写为"调节剂" + 补 PT019-024 的 parent_id
 *
 * 背景：seedBasicData.ts 已删除杀线虫剂，但 seedData.ts 里旧版本 INSERT 过 PT008=nematicide。
 *       migratePesticideType.ts 没清理这个废记录。
 *       后端启动 whitelist 禁用了 fixMissingSchema，所以这条没法自动清理。
 *
 * 执行内容（全部幂等）：
 *   1. UPDATE PT008：杀线虫剂 → 调节剂（plant_growth_regulator）
 *   2. UPDATE PT019-024：parent_id = 'PT008'
 *
 * ⚠️ 运行前必须停掉后端服务器
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/yuanxingtu.db');

(async () => {
  console.log('=== PT008 修复脚本 ===');
  console.log('DB:', DB_PATH);

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  // 1. UPDATE PT008
  db.run(`UPDATE dictionaries
          SET dict_code = 'plant_growth_regulator',
              dict_label = '调节剂',
              dict_value = 'plant_growth_regulator',
              color = 'violet',
              updated_at = datetime('now', 'localtime')
          WHERE id = 'PT008' AND dict_code = 'nematicide'`);
  console.log('PT008 UPDATE 影响行数:', db.getRowsModified());

  // 2. UPDATE PT019-024 parent_id
  db.run(`UPDATE dictionaries SET parent_id = 'PT008' WHERE id IN ('PT019','PT020','PT021','PT022','PT023','PT024') AND parent_id IS NULL`);
  console.log('PT019-024 parent_id UPDATE 影响行数:', db.getRowsModified());

  // 保存
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('✓ DB 已保存');

  // 验证
  console.log('\n=== 验证 ===');
  const check = db.exec(`SELECT id, dict_code, dict_label, parent_id FROM dictionaries WHERE id BETWEEN 'PT008' AND 'PT024' ORDER BY id`);
  for (const r of check[0]?.values || []) {
    console.log('  ', r[0], '|', r[1], '=', r[2], '| parent =', r[3]);
  }
  db.close();
  console.log('\n修复完成。请重启后端服务器。');
})().catch((err) => {
  console.error('修复失败:', err);
  process.exit(1);
});