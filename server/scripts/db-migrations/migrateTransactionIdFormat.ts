/**
 * 2026-07-08 V3.4 流水号格式迁移脚本
 *
 * 背景：
 *  出库/退库流水（seedling.ts:288-289, 1113-1114; seedSource.ts:577-578）违反 [[code-generation-contract-rule]] 铁律，
 *  违规使用 TXO-/OUT- 前缀 + Date.now()/Math.random() 生成流水号。
 *
 * 目标：
 *  把所有违规流水（transaction_id 或 id 包含 TXO- 或 OUT- 前缀）迁移为统一格式
 *  TRX-${YYYYMMDD}-${NNNN}，与项目统一工具 generateTransactionId 生成格式一致。
 *
 * 策略：
 *  1. 备份 DB（执行前由调用方负责）
 *  2. 查询所有违规 transaction_id / id
 *  3. 按 operate_date 分组，每组从 max(existing TRX-) + 1 开始自增分配新 ID
 *  4. UPDATE 写回（同时更新 transaction_id 和 id 两个字段）
 *  5. 验证：再次查询，违规数应为 0
 *
 * 运行：
 *  npm run migrate:tx-id-format             # 实际执行
 *  npm run migrate:tx-id-format:dry-run     # 只打印，不写入
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const IS_DRY_RUN = process.argv.includes('--dry-run');

interface DirtyRow {
  pk: number;            // 内部 PK (rowid)
  oldTransactionId: string;
  oldId: string;
  operateDate: string;   // YYYY-MM-DD
}

async function main() {
  console.log(`[migrateTransactionIdFormat] ${IS_DRY_RUN ? 'DRY-RUN' : 'EXECUTE'} 模式`);
  console.log(`[migrateTransactionIdFormat] DB: ${DB_PATH}`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. 查询所有违规记录
  //    违规定义：transaction_id 或 id 包含 TXO- 或 OUT- 前缀
  //    注意：纯 OUT-YYYYMMDD-NNNN 格式（合规）不会被匹配，因为 OUT- 后面接非 TXO- 才合规
  //    实际：原有违规都是 OUT-TXO-... 或 TXO-... 嵌套，所以用 LIKE '%TXO-%' OR LIKE '%OUT-%' 兜底
  const dirtyQuery = db.exec(`
    SELECT rowid, transaction_id, id, operate_date
    FROM inventory_transaction
    WHERE transaction_id LIKE '%TXO-%'
       OR transaction_id LIKE 'OUT-%'
       OR id LIKE 'TXO-%'
       OR id LIKE 'OUT-%'
    ORDER BY operate_date ASC, rowid ASC
  `);

  if (!dirtyQuery[0] || dirtyQuery[0].values.length === 0) {
    console.log('[migrateTransactionIdFormat] 没有违规流水，迁移完成。');
    return;
  }

  const dirtyRows: DirtyRow[] = dirtyQuery[0].values.map(([pk, txId, id, date]) => ({
    pk: Number(pk),
    oldTransactionId: String(txId),
    oldId: String(id),
    operateDate: String(date),
  }));

  console.log(`[migrateTransactionIdFormat] 发现 ${dirtyRows.length} 条违规流水：`);
  for (const row of dirtyRows.slice(0, 5)) {
    console.log(`  - txId=${row.oldTransactionId} | id=${row.oldId} | date=${row.operateDate}`);
  }
  if (dirtyRows.length > 5) {
    console.log(`  ... 还有 ${dirtyRows.length - 5} 条`);
  }

  // 2. 按日期分组，查询每组现有的 TRX- 最大序号
  const dateGroups = new Map<string, number>(); // dateStr(YYYYMMDD) -> maxSerial
  for (const row of dirtyRows) {
    const dateStr = row.operateDate.replace(/-/g, '');
    if (!dateGroups.has(dateStr)) {
      // 查询该日期现有 TRX- 流水的最大序号
      const maxQuery = db.exec(`
        SELECT MAX(CAST(SUBSTR(transaction_id, -4) AS INTEGER))
        FROM inventory_transaction
        WHERE transaction_id LIKE 'TRX-${dateStr}-%'
          AND LENGTH(transaction_id) = 17
          AND SUBSTR(transaction_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
      `);
      const maxSerial = maxQuery[0]?.values[0]?.[0] != null ? Number(maxQuery[0].values[0][0]) : 0;
      dateGroups.set(dateStr, maxSerial);
    }
  }

  // 3. 按日期 + 顺序分配新 ID
  const updates: Array<{ pk: number; newTxId: string; newId: string; dateStr: string; oldTxId: string; oldId: string }> = [];
  const lastSerialByDate = new Map<string, number>();
  for (const row of dirtyRows) {
    const dateStr = row.operateDate.replace(/-/g, '');
    const currentMax = dateGroups.get(dateStr) || 0;
    const lastSerial = lastSerialByDate.get(dateStr) ?? currentMax;
    const newSerial = lastSerial + 1;
    lastSerialByDate.set(dateStr, newSerial);
    const newTxId = `TRX-${dateStr}-${String(newSerial).padStart(4, '0')}`;
    const newId = newTxId; // transaction_id 和 id 同样规范化
    updates.push({
      pk: row.pk,
      newTxId,
      newId,
      dateStr,
      oldTxId: row.oldTransactionId,
      oldId: row.oldId,
    });
  }

  console.log(`[migrateTransactionIdFormat] 准备更新 ${updates.length} 条流水：`);
  for (const u of updates.slice(0, 5)) {
    console.log(`  - ${u.oldTxId} → ${u.newTxId}`);
  }
  if (updates.length > 5) {
    console.log(`  ... 还有 ${updates.length - 5} 条`);
  }

  if (IS_DRY_RUN) {
    console.log('[migrateTransactionIdFormat] DRY-RUN 完成，未写入 DB。');
    return;
  }

  // 4. 实际更新
  const updateStmt = db.prepare(`
    UPDATE inventory_transaction
    SET transaction_id = ?, id = ?
    WHERE rowid = ?
  `);
  let updatedCount = 0;
  for (const u of updates) {
    updateStmt.run([u.newTxId, u.newId, u.pk]);
    updatedCount++;
  }
  updateStmt.free();

  // 5. 写回 DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`[migrateTransactionIdFormat] 已写入 DB：${updatedCount} 条流水更新。`);

  // 6. 验证
  const verifyQuery = db.exec(`
    SELECT COUNT(*) FROM inventory_transaction
    WHERE transaction_id LIKE '%TXO-%'
       OR transaction_id LIKE 'OUT-%'
       OR id LIKE 'TXO-%'
       OR id LIKE 'OUT-%'
  `);
  const remaining = verifyQuery[0]?.values[0]?.[0] || 0;
  console.log(`[migrateTransactionIdFormat] 验证：剩余违规流水数 = ${remaining} ${remaining === 0 ? '✅' : '❌'}`);

  // 7. 采样输出
  const sampleQuery = db.exec(`
    SELECT transaction_id, id, operate_date
    FROM inventory_transaction
    WHERE rowid IN (${updates.slice(0, 3).map((u) => u.pk).join(',')})
  `);
  console.log('[migrateTransactionIdFormat] 采样验证：');
  if (sampleQuery[0]) {
    for (const row of sampleQuery[0].values) {
      console.log(`  - txId=${row[0]} | id=${row[1]} | date=${row[2]}`);
    }
  }
}

main().catch((err) => {
  console.error('[migrateTransactionIdFormat] 错误：', err);
  process.exit(1);
});
