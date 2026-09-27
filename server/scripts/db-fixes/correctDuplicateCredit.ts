/**
 * 一次性数据修正：消除"重复入账"造成的库存虚增（2026-09-27）
 *
 * 背景：
 *  PUT /api/materials/inbound/:id 旧逻辑无条件 apply —— 对已完成的单做非明细更新
 *  （如只传 status:'completed'）会重复入账，主表与批次账同时虚增。
 *  （缺陷已在同次修复：入账条件改为"从未入账变入账 或 明细变化"，见 routes/materials.ts）
 *
 * 本脚本修正已发生的虚增：主表扣回、批次账扣回、补一条 adjust 流水说明来由。
 *
 * 用法（必须先停后端）：
 *  cd server && npx tsx scripts/db-fixes/correctDuplicateCredit.ts \
 *      --code=MAT_FILM_001 --batch=B20260510 --qty=8 --ref=IN2026051501
 */
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const arg = (name: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : '';
};

const CODE = arg('code');
const BATCH = arg('batch');
const QTY = Number(arg('qty'));
const REF = arg('ref') || '';

async function main() {
  if (!CODE || !QTY) {
    console.error('用法: npx tsx scripts/db-fixes/correctDuplicateCredit.ts --code=<物料编码> --batch=<批次号> --qty=<虚增数量> [--ref=<关联单号>]');
    process.exit(1);
  }
  console.log(`[correctDuplicateCredit] 物料 ${CODE} | 批次 ${BATCH || '(跳过批次)'} | 扣回 ${QTY} | 关联 ${REF}`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const now = new Date();

  // 1) 主表扣回（按 code 单行，与业务逻辑同口径）
  const main = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [CODE]);
  if (!main.length || !main[0].values.length) {
    console.error(`未找到物料 ${CODE}`);
    process.exit(1);
  }
  const [mainId, mainQty] = main[0].values[0] as [number, number];
  const newQty = Number(mainQty) - QTY;
  if (newQty < 0) {
    console.error(`扣回后库存为负（当前 ${mainQty} - ${QTY}），拒绝执行`);
    process.exit(1);
  }
  db.run('UPDATE materials SET quantity = ? WHERE id = ?', [newQty, mainId]);
  console.log(`  ✓ 主表: ${mainQty} → ${newQty}`);

  // 2) 批次账扣回
  if (BATCH) {
    const b = db.exec('SELECT id, remaining_quantity, total_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?', [CODE, BATCH]);
    if (b.length && b[0].values.length) {
      const [bid, remain, total] = b[0].values[0] as [number, number, number];
      if (Number(remain) < QTY) {
        console.error(`批次 ${BATCH} 余量 ${remain} 不足以扣回 ${QTY}，拒绝执行`);
        process.exit(1);
      }
      db.run(
        'UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, total_quantity = total_quantity - ?, update_time = ? WHERE id = ?',
        [QTY, QTY, now.toISOString(), bid]
      );
      console.log(`  ✓ 批次 ${BATCH}: 剩余 ${remain} → ${Number(remain) - QTY}, 总量 ${total} → ${Number(total) - QTY}`);
    } else {
      console.warn(`  批次 ${BATCH} 未命中，跳过批次扣回`);
    }
  }

  // 3) 补一条 adjust 流水（说明来由，保持可追溯；adjust 为"库存调整"类型，前端已有中文映射）
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const txId = `EXEC-ADJ-${stamp}-1-fixdb`;
  const localNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  db.run(
    `INSERT INTO inventory_transaction
      (id, transaction_id, instance_id, stock_type, transaction_type, quantity,
       balance_before, balance_after, business_id, business_type, business_code,
       operator_id, operator_name, operate_date, remarks, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [txId, txId, CODE, 'material', 'adjust', QTY, Number(mainQty), newQty, '', 'adjust', REF, 'system', '数据修正', localNow, `修正重复入账虚增（${REF}）`, localNow]
  );
  console.log('  ✓ 已补 adjust 流水（备注：修正重复入账虚增）');

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('[correctDuplicateCredit] 完成');
}

main().catch((e) => {
  console.error('[correctDuplicateCredit] 失败:', e);
  process.exit(1);
});
