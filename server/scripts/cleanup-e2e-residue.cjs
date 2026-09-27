/**
 * E2E 测试残留清理（2026-09-27）
 *
 * 背景：E2E 验证脚本为测试口径会创建 approved 状态的申请单，
 * 而业务规则"已审批单不允许删除"（设计使然）导致 API 清理失败 —— 残留测试单据。
 * 本脚本直连 sql.js 文件清理（**必须在后端停止时运行**，否则内存库会覆盖改动）。
 *
 * 清理范围（均为 E2E 前缀的测试痕迹，流水成对抵消净影响 0）：
 *   1. material_requests     request_code LIKE 'E2EB%'
 *   2. material_returns      code LIKE 'TL-E2EB%'
 *   3. material_executes     code LIKE 'CK-E2E%'
 *   4. approvals             id LIKE 'E2E-%' OR business_link LIKE '%E2EB%'
 *   5. inventory_transaction business_code 含 CK-E2E%/TL-E2EB% 的流水
 *
 * 用法：停后端 → node scripts/cleanup-e2e-residue.cjs → 启后端
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');

initSqlJs().then((SQL) => {
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const report = [];
  let total = 0;

  const countAndDelete = (label, sqlCount, sqlDelete, params) => {
    const c = db.exec(sqlCount, params);
    const n = c.length ? c[0].values[0][0] : 0;
    if (n > 0) {
      db.run(sqlDelete, params);
      report.push(`  ${label}: ${n} 条`);
      total += n;
    } else {
      report.push(`  ${label}: 0 条`);
    }
  };

  countAndDelete(
    'E2E 申请单',
    "SELECT COUNT(*) FROM material_requests WHERE request_code LIKE 'E2EB%' OR request_code LIKE 'E2EARC%' OR request_code LIKE 'MR-E2E%'",
    "DELETE FROM material_requests WHERE request_code LIKE 'E2EB%' OR request_code LIKE 'E2EARC%' OR request_code LIKE 'MR-E2E%'"
  );
  countAndDelete(
    'E2E 退料单',
    "SELECT COUNT(*) FROM material_returns WHERE code LIKE 'TL-E2EB%'",
    "DELETE FROM material_returns WHERE code LIKE 'TL-E2EB%'"
  );
  countAndDelete(
    'E2E 出库单',
    "SELECT COUNT(*) FROM material_executes WHERE code LIKE 'CK-E2E%'",
    "DELETE FROM material_executes WHERE code LIKE 'CK-E2E%'"
  );
  countAndDelete(
    'E2E 审批单',
    "SELECT COUNT(*) FROM approvals WHERE id LIKE 'E2E-%' OR business_link LIKE '%E2EB%'",
    "DELETE FROM approvals WHERE id LIKE 'E2E-%' OR business_link LIKE '%E2EB%'"
  );
  // 领料出库单号（CK 前缀）中含 E2E 标记的流水；不含其他模块（如 INB- 入库）的历史测试痕迹
  const e2eTxWhere = `(business_code LIKE 'CK%' AND business_code LIKE '%E2E%')
     OR business_code LIKE 'TL-E2EB%'
     OR (business_code LIKE 'CK%' AND remarks LIKE '%E2EB%')`;
  countAndDelete(
    'E2E 库存流水',
    `SELECT COUNT(*) FROM inventory_transaction WHERE ${e2eTxWhere}`,
    `DELETE FROM inventory_transaction WHERE ${e2eTxWhere}`
  );
  // 2026-09-27：E2E 前缀的出库单（含归档测试遗留的作废单）与归档记录
  countAndDelete(
    'E2E 出库单(E2EARC 等)',
    "SELECT COUNT(*) FROM material_executes WHERE code LIKE 'E2EARC%' OR code LIKE 'CK-E2E%' OR code LIKE '%E2E'",
    "DELETE FROM material_executes WHERE code LIKE 'E2EARC%' OR code LIKE 'CK-E2E%' OR code LIKE '%E2E'"
  );
  countAndDelete(
    'E2E 归档记录',
    "SELECT COUNT(*) FROM deleted_documents_archive WHERE doc_code LIKE 'E2E%' OR doc_code LIKE '%E2EARC%' OR doc_code LIKE 'CK-E2E%'",
    "DELETE FROM deleted_documents_archive WHERE doc_code LIKE 'E2E%' OR doc_code LIKE '%E2EARC%' OR doc_code LIKE 'CK-E2E%'"
  );

  console.log('=== E2E 残留清理 ===');
  report.forEach((l) => console.log(l));
  console.log(`合计清理: ${total} 条`);

  if (total > 0) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log('已写盘:', DB_PATH);
  } else {
    console.log('无需清理，未写盘');
  }
});
