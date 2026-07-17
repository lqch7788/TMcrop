/**
 * 2026-07-17 DROP COLUMN status — 病虫害防治记录状态字段移除
 *
 * 背景：
 *   - DB pesticide_records 表 status 列全部为 'completed'（10 条/10 条 100%）
 *   - 前端 PestControlTable 永远显示"已完成"（业务上防治=已完成事件，无中间态）
 *   - 用户决定：列+DB 字段都删
 *   - 后端 INSERT 已同步删 status 列写入
 *   - 前端 PestControlTable/AddPestControlModal 状态字段已删除
 *
 * ⚠️ 运行前必须停掉后端服务器（否则磁盘改动会被内存 saveDatabase 覆盖）！
 *
 * 用法：
 *   cd server
 *   npx tsx scripts/dropPestRecordStatusColumn.ts
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/yuanxingtu.db');

(async () => {
  console.log('=== DROP pesticide_records.status ===');
  console.log('DB:', DB_PATH);

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  // 检查 status 列当前状态
  const before = db.exec(`PRAGMA table_info(pesticide_records)`);
  const statusCol = before[0]?.values?.find((r: any) => r[1] === 'status');
  console.log('DROP 前 status 列:', statusCol ? `${statusCol[1]} (type=${statusCol[2]})` : '已不存在');

  if (statusCol) {
    db.run(`ALTER TABLE pesticide_records DROP COLUMN status`);
    console.log('✓ DROP COLUMN status 执行');
  } else {
    console.log('• status 列已不存在，跳过');
  }

  // 保存
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('✓ DB 已保存');

  // 验证
  console.log('\n=== 验证 ===');
  const after = db.exec(`PRAGMA table_info(pesticide_records)`);
  const stillThere = after[0]?.values?.find((r: any) => r[1] === 'status');
  console.log('DROP 后 status 列:', stillThere ? `❌ 仍在` : `✅ 已移除`);
  console.log('总字段数:', after[0]?.values?.length);

  // 数据完整性检查
  const cnt = db.exec(`SELECT COUNT(*) FROM pesticide_records`);
  console.log('pesticide_records 记录数（应仍为 10）:', cnt[0]?.values?.[0]?.[0]);

  db.close();
  console.log('\n完成。请重启后端服务器。');
})().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});