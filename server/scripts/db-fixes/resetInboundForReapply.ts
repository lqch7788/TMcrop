/**
 * 一次性修复：重置指定入库单为待审核并清理其入库流水（2026-09-27）
 *
 * 背景：
 *  兼容性缺陷（历史 JSON 只有 materialCode 键）导致入账时：
 *  主表/批次账静默跳过，但流水照写 → 出现"有流水、无库存"的账实脱节。
 *  单 6（RK20260403-006）即为此情况：PUT completed 后流水 +2 条但主表未加。
 *
 * 用途：把该单状态重置为 pending + 删除其 material_inbound 流水，
 *       之后重新走 PUT /api/materials/inbound/:id {status:'completed'} 正常入账（新逻辑已兼容旧键）。
 *
 * 运行（必须先停后端）：
 *  cd server && npx tsx scripts/db-fixes/resetInboundForReapply.ts --id=6
 */
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const idArg = process.argv.find((a) => a.startsWith('--id='));
const INBOUND_ID = idArg ? Number(idArg.split('=')[1]) : 0;

async function main() {
  if (!INBOUND_ID) {
    console.error('用法: npx tsx scripts/db-fixes/resetInboundForReapply.ts --id=<入库单ID>');
    process.exit(1);
  }
  console.log(`[resetInboundForReapply] DB: ${DB_PATH} | 目标入库单 id=${INBOUND_ID}`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1) 当前状态确认
  const cur = db.exec('SELECT code, status FROM inbound_records WHERE id = ?', [INBOUND_ID]);
  if (!cur.length || !cur[0].values.length) {
    console.error(`未找到入库单 id=${INBOUND_ID}`);
    process.exit(1);
  }
  const [code, oldStatus] = cur[0].values[0] as [string, string];
  console.log(`  单据 ${code}，当前状态: ${oldStatus}`);

  // 2) 重置为 pending（供重新入账）
  db.run("UPDATE inbound_records SET status = 'pending' WHERE id = ?", [INBOUND_ID]);
  console.log('  ✓ 状态已重置为 pending');

  // 3) 清理该单产生的 material_inbound 流水（重入账会写新的）
  const before = db.exec("SELECT COUNT(*) FROM inventory_transaction WHERE business_id = ? AND transaction_type = 'material_inbound'", [String(INBOUND_ID)]);
  const cnt = before.length ? before[0].values[0][0] : 0;
  db.run("DELETE FROM inventory_transaction WHERE business_id = ? AND transaction_type = 'material_inbound'", [String(INBOUND_ID)]);
  const after = db.exec("SELECT COUNT(*) FROM inventory_transaction WHERE business_id = ? AND transaction_type = 'material_inbound'", [String(INBOUND_ID)]);
  console.log(`  ✓ 清理入库流水 ${cnt} 条（剩余 ${after.length ? after[0].values[0][0] : 0}）`);

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('[resetInboundForReapply] 完成。请启动后端后执行 PUT /api/materials/inbound/' + INBOUND_ID + ' {"status":"completed"} 重新入账。');
}

main().catch((e) => {
  console.error('[resetInboundForReapply] 失败:', e);
  process.exit(1);
});
