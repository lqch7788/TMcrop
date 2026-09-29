/**
 * E2E 测试审批单清理（AUDIT29* 前缀）
 *
 * 为什么需要停服运行：审批单终态（approved/rejected）**无法经 API 删除**
 * （DELETE /api/approvals/:id 只允许 draft/cancelled），而 E2E 必须把单据批到终态才能断言。
 * 服务端是 sql.js 内存库，运行中直改文件会被下一次 saveDatabase() 覆盖。
 *
 * 用法：停服 → node server/scripts/e2e-cleanup-test-approvals.cjs → 启服
 * 安全：只删 id/code 以 AUDIT29 开头的行；删前打印清单，删后校验零残留。
 */
const Database = require('better-sqlite3');
const path = require('path');

const PREFIXES = ['AUDIT29'];   // 覆盖 AUDIT29- / AUDIT29G / AUDIT29TL 等全部 E2E 前缀
const db = new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { fileMustExist: true });

const where = PREFIXES.map(() => 'id LIKE ?').join(' OR ');
const params = PREFIXES.map(p => `${p}%`);

const rows = db.prepare(`SELECT id, code, type, status FROM approvals WHERE ${where} ORDER BY id`).all(...params);
console.log(`匹配测试审批单：${rows.length} 行`);
rows.forEach(r => console.log(`  - ${r.id} | ${r.code} | ${r.status}`));

const n = db.prepare(`DELETE FROM approvals WHERE ${where}`).run(...params).changes;
console.log(`\n已删除 ${n} 行`);

// 退料类 E2E 会留下成对的 material_return_in / material_return_undo 流水（净额 0），
// 指示其业务单据以 AUDIT29 开头 —— 一并清理，避免污染库存详情的操作历史
const txRows = db.prepare("SELECT id, transaction_type, quantity, business_code FROM inventory_transaction WHERE business_code LIKE 'AUDIT29%'").all();
if (txRows.length) {
  console.log(`\n清理测试库存流水：${txRows.length} 行`);
  txRows.forEach(r => console.log(`  - ${r.id} | ${r.transaction_type} | qty=${r.quantity}`));
  db.prepare("DELETE FROM inventory_transaction WHERE business_code LIKE 'AUDIT29%'").run();
}

const leftoverApprovals = db.prepare(`SELECT COUNT(*) c FROM approvals WHERE ${where}`).get(...params).c;
const leftoverReturns = db.prepare("SELECT COUNT(*) c FROM material_returns WHERE code LIKE 'AUDIT29%'").get().c;
const leftoverTx = db.prepare("SELECT COUNT(*) c FROM inventory_transaction WHERE business_code LIKE 'AUDIT29%'").get().c;
const leftoverSup = db.prepare("SELECT COUNT(*) c FROM suppliers WHERE supplier_name LIKE '%-AUDIT29%'").get().c;

console.log(`残留校验：审批单 ${leftoverApprovals} / 退料单 ${leftoverReturns} / 流水 ${leftoverTx} / 供应商 ${leftoverSup}`);
const clean = leftoverApprovals + leftoverReturns + leftoverTx + leftoverSup === 0;
console.log(clean ? '✅ 零残留' : '❌ 仍有残留');

console.log('\n关键表行数：');
for (const t of ['materials', 'inbound_records', 'suppliers', 'approvals', 'material_returns', 'material_requests', 'material_executes', 'batch_inventory', 'inventory_transaction']) {
  console.log(`  ${t}: ${db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c}`);
}

db.close();
process.exit(clean ? 0 : 1);
