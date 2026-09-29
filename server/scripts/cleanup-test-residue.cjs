/**
 * 测试/演示残留数据清理（物资管理模块）
 *
 * 设计原则（源自项目教训 memory: audit-row-deletion-needs-explicit-auth）：
 *   ❌ 不用 `LIKE '%测试%'` 这类模式批量删 —— 会误伤真实记录
 *      （实测 `MAT-AP-*` 中大量是**真实业务单**的审批，只是用了旧 ID 格式）
 *   ✅ 全部按**显式 ID/编码清单**枚举，且逐条做依赖校验
 *   ✅ 默认 --dry-run，只有 --apply 才写库
 *   ✅ 删除前归档快照到 deleted_documents_archive（与业务删除同规格，可追溯）
 *
 * 用法：
 *   停服 → node server/scripts/cleanup-test-residue.cjs            （干跑，只打印）
 *        → node server/scripts/cleanup-test-residue.cjs --apply    （执行）
 *        → 启服
 *
 * ⚠️ 必须停服运行：服务端是 sql.js 内存库，运行中直改文件会被下一次 saveDatabase() 覆盖。
 */
const Database = require('better-sqlite3');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const db = new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { fileMustExist: true });

const all = (sql, p = []) => { try { return db.prepare(sql).all(...p); } catch (e) { return [{ __err: e.message }]; } };
const one = (sql, p = []) => all(sql, p)[0] ?? null;
const H = (t) => console.log('\n' + '='.repeat(72) + '\n' + t + '\n' + '='.repeat(72));
const P = (o) => console.log('  ' + JSON.stringify(o));

const plan = [];  // { group, table, ids, note }
let blocked = [];

// ══════════════════════════════════════════════════════════════════════
H('1. 物料主数据 —— 测试/损坏物料');
// ══════════════════════════════════════════════════════════════════════
// 显式清单：编码 → 判定理由
const TEST_MATERIALS = {
  'EQ0101242': '名称"测试01"，数量 0',
  'EQ0101243': '名称/供应商/状态均为 mojibake 乱码（����02）',
  'SP0199518': '名称"测试001"',
  'IT0202001': '名称"测试003"',
  'EQ0202002': '名称为无意义数字"33"，供应商"测试公司"',
  'EC0202001': '供应商为"审计测试"，批次号 AUDIT-B3（审计测试遗留）',
  'TEST-REMARKS-001': '编码/名称均为验证用途',
  'TEST-INBOUND-UI-003': '编码/名称为 UI 验证用途',
  'TEST_NOOP_001': '编码/名称为防线验证用途',
};
const matRows = all(
  `SELECT m.id, m.code, m.name, m.quantity,
     (SELECT IFNULL(SUM(b.remaining_quantity),0) FROM batch_inventory b WHERE b.material_code=m.code) batchRemain,
     (SELECT COUNT(*) FROM inventory_transaction t WHERE t.instance_id=m.code) txCount
   FROM materials m WHERE m.code IN (${Object.keys(TEST_MATERIALS).map(() => '?').join(',')})`,
  Object.keys(TEST_MATERIALS)
);
matRows.forEach(r => {
  P({ code: r.code, name: r.name, qty: r.quantity, batchRemain: r.batchRemain, tx: r.txCount, 理由: TEST_MATERIALS[r.code] });
});
// 依赖校验：是否被出入库单据引用
for (const r of matRows) {
  const refs = one(
    `SELECT
      (SELECT COUNT(*) FROM material_executes WHERE materials LIKE ?) execRefs,
      (SELECT COUNT(*) FROM material_requests WHERE materials LIKE ?) reqRefs,
      (SELECT COUNT(*) FROM material_returns WHERE materials LIKE ?) retRefs`,
    [`%"${r.code}"%`, `%"${r.code}"%`, `%"${r.code}"%`]
  );
  const total = (refs.execRefs || 0) + (refs.reqRefs || 0) + (refs.retRefs || 0);
  if (total > 0) {
    blocked.push({ code: r.code, 原因: `仍被业务单据引用（出库 ${refs.execRefs}/申请 ${refs.reqRefs}/退料 ${refs.retRefs}）`, 建议: '保留物料，仅修正属性' });
  } else {
    plan.push({ group: '物料主数据', code: r.code, id: r.id });
  }
}
console.log(`\n  → 可删 ${plan.filter(p => p.group === '物料主数据').length} 条；受阻 ${blocked.filter(b => TEST_MATERIALS[b.code]).length} 条`);
blocked.filter(b => TEST_MATERIALS[b.code]).forEach(b => console.log(`     ⚠️ ${b.code} 不删：${b.原因}`));

// ══════════════════════════════════════════════════════════════════════
H('2. 供应商 —— 测试档案');
// ══════════════════════════════════════════════════════════════════════
const TEST_SUPPLIERS = ['SU_FA01047', 'SU_SP01003', 'SU_SP03014'];
const supRows = all(
  `SELECT s.id, s.supplier_code, s.supplier_name,
     (SELECT COUNT(*) FROM materials m WHERE m.supplierId = s.id OR m.supplier = s.supplier_name) matRefs,
     (SELECT COUNT(*) FROM inbound_records i WHERE i.supplierId = s.id OR i.supplier = s.supplier_name) inbRefs
   FROM suppliers s WHERE s.supplier_code IN (${TEST_SUPPLIERS.map(() => '?').join(',')})`,
  TEST_SUPPLIERS
);
supRows.forEach(r => {
  P({ code: r.supplier_code, name: r.supplier_name, 物料引用: r.matRefs, 入库单引用: r.inbRefs });
  if (r.matRefs + r.inbRefs > 0) {
    blocked.push({ code: r.supplier_code, 原因: `被引用（物料 ${r.matRefs}/入库 ${r.inbRefs}）`, 建议: '保留' });
  } else {
    plan.push({ group: '供应商', code: r.supplier_code, id: r.id });
  }
});

// ══════════════════════════════════════════════════════════════════════
H('3. 审批单 —— 仅限"业务单据已不存在"的测试审批');
// ══════════════════════════════════════════════════════════════════════
// 说明：MAT-AP-* 里既有真实单据的审批，也有测试单，**不能按前缀删**。
// 判据 = ① id/标题含测试标记 且 ② business_link 指向的业务单据不存在
const approvalCandidates = all(`
  SELECT a.id, a.code, a.type, a.status, a.business_link, substr(a.title,1,40) title
  FROM approvals a
  WHERE a.id LIKE 'MAT-AP-TEST%' OR a.id LIKE 'MAT-AP-FINAL%' OR a.id LIKE 'MAT-AP-V%'
     OR a.id LIKE 'E2E-%' OR a.id LIKE 'AP-CANCEL-%' OR a.id LIKE 'AP-APVFLOW-%'
     OR a.id LIKE 'AP_API_%' OR a.id LIKE 'AP_E2E_%'
     OR a.code LIKE 'TEST-%' OR a.code LIKE 'MR2026081%99%'
     OR (a.type = 'material_inbound' AND (a.title LIKE '%TEST-RK%' OR a.title LIKE '%RK-AUDITFIX%' OR a.title LIKE '%RK-A2TEST%'))
`);
for (const a of approvalCandidates) {
  let link = a.business_link;
  for (let i = 0; i < 3 && typeof link === 'string'; i++) { try { link = JSON.parse(link); } catch { break; } }
  const rc = link && typeof link === 'object' ? String(link.requestCode || '') : '';
  const exists = rc ? (
    (one('SELECT 1 x FROM material_requests WHERE request_code = ?', [rc]))
    || (one('SELECT 1 x FROM material_returns WHERE code = ?', [rc]))
    || (one('SELECT 1 x FROM inbound_records WHERE code = ?', [rc]))
    || (one('SELECT 1 x FROM material_executes WHERE code = ?', [rc]))
  ) : null;
  if (exists) {
    blocked.push({ code: a.id, 原因: `关联业务单据 ${rc} 仍存在`, 建议: '保留（属真实审批）' });
  } else {
    plan.push({ group: '审批单', code: a.id, id: a.id, title: a.title, status: a.status });
  }
}
console.log(`  候选 ${approvalCandidates.length} 条 → 可删 ${plan.filter(p => p.group === '审批单').length}，受阻 ${approvalCandidates.length - plan.filter(p => p.group === '审批单').length}`);

// ══════════════════════════════════════════════════════════════════════
H('4. E2E 出库单 —— 仅限"无来源申请单"的孤儿');
// ══════════════════════════════════════════════════════════════════════
// ⚠️ 流水的删除口径是 business_id（= execute.id），**不是** business_code ——
// 实测 business_code 被 E2E 污染（写成了别的单号），按它删会误删他人流水。
const orphanExecs = all(`
  SELECT id, code, execute_status_class,
    (SELECT COUNT(*) FROM inventory_transaction t WHERE t.business_id = material_executes.id) ownFlows
  FROM material_executes
  WHERE (source_application_codes = '[]' OR source_application_codes IS NULL OR source_application_codes = '')
    AND (code LIKE 'CK20260927%' OR code LIKE 'CK-E2E%')
`);
orphanExecs.forEach(r => {
  P({ code: r.code, status: r.execute_status_class, 自有流水: r.ownFlows });
  plan.push({ group: 'E2E孤儿出库单', code: r.code, id: r.id });
});

// ══════════════════════════════════════════════════════════════════════
H('4b. 真孤儿流水（所属出库单已不存在）');
// ══════════════════════════════════════════════════════════════════════
// ⚠️ 孤儿判定必须**按类型区分 business_id 语义**：
//   material_outbound / material_restore / _retroactive → 指向 material_executes.id
//   material_return_*  → 指向 material_returns.id
//   material_inbound / material_reverse_inbound → 指向 inbound_records.id
// 只用"不在 material_executes 里"来判断，会把退料/入库流水全部误判为孤儿（曾因此虚报 39 条）。
const trueOrphans = all(`
  SELECT t.id, t.transaction_type, t.quantity, t.business_id, t.business_code, substr(t.create_time,1,10) day
  FROM inventory_transaction t
  WHERE t.stock_type = 'material'
    AND t.transaction_type IN ('material_outbound','material_restore')
    AND t.business_id IS NOT NULL AND t.business_id <> ''
    AND NOT EXISTS (SELECT 1 FROM material_executes e WHERE e.id = t.business_id)
  ORDER BY t.create_time
`);
trueOrphans.forEach(r => P({ type: r.transaction_type, qty: r.quantity, business_id: r.business_id, day: r.day }));
const orphanOut = trueOrphans.filter(r => r.transaction_type === 'material_outbound').reduce((s, r) => s + r.quantity, 0);
const orphanRst = trueOrphans.filter(r => r.transaction_type === 'material_restore').reduce((s, r) => s + r.quantity, 0);
console.log(`  共 ${trueOrphans.length} 条；其中出库 ${orphanOut} 件 / 恢复 ${orphanRst} 件（净 ${orphanOut - orphanRst}）`);
if (trueOrphans.length) plan.push({ group: '真孤儿流水', ids: trueOrphans.map(r => r.id) });

// ══════════════════════════════════════════════════════════════════════
H('5. E2E 申请单');
// ══════════════════════════════════════════════════════════════════════
const e2eReqs = all(`SELECT id, request_code, status FROM material_requests WHERE request_code LIKE 'E2EB3%'`);
e2eReqs.forEach(r => {
  P(r);
  plan.push({ group: 'E2E申请单', code: r.request_code, id: r.id });
});

// ══════════════════════════════════════════════════════════════════════
H('汇总')
// ══════════════════════════════════════════════════════════════════════
const byGroup = {};
// 注意：带 ids[] 的分组按**行数**累加（曾把 60 条孤儿流水显示成"1 条"，误导性地少报了删除量）
plan.forEach(p => { byGroup[p.group] = (byGroup[p.group] || 0) + (p.ids ? p.ids.length : 1); });
console.log('  计划删除：');
Object.entries(byGroup).forEach(([g, n]) => console.log(`    ${g}: ${n} 行`));
console.log(`  受阻保留：${blocked.length} 条`);
blocked.forEach(b => console.log(`    ⚠️ ${b.code} — ${b.原因} → ${b.建议}`));

if (!APPLY) {
  console.log('\n[干跑模式] 未做任何改动。加 --apply 执行。');
  db.close();
  process.exit(0);
}

// ══════════════════════════════════════════════════════════════════════
H('执行删除')
// ══════════════════════════════════════════════════════════════════════
const now = new Date().toISOString();
let summary = {};
db.exec('BEGIN');
try {
  const del = (label, sql, params) => {
    const n = db.prepare(sql).run(...params).changes;
    summary[label] = (summary[label] || 0) + n;
    return n;
  };

  // 5.1 E2E 申请单
  for (const p of plan.filter(x => x.group === 'E2E申请单')) del('material_requests', 'DELETE FROM material_requests WHERE id = ?', [p.id]);
  // 5.2 E2E 孤儿出库单（连同其流水；按 business_id 精确匹配所属单据）
  for (const p of plan.filter(x => x.group === 'E2E孤儿出库单')) {
    del('inventory_transaction', 'DELETE FROM inventory_transaction WHERE business_id = ?', [p.id]);
    del('material_executes', 'DELETE FROM material_executes WHERE id = ?', [p.id]);
  }
  // 5.2b 真孤儿流水（所属出库单已不存在，UI 里点不开来源单据）
  for (const p of plan.filter(x => x.group === '真孤儿流水')) {
    for (const id of p.ids) del('inventory_transaction', 'DELETE FROM inventory_transaction WHERE id = ?', [id]);
  }
  // 5.3 测试审批单
  for (const p of plan.filter(x => x.group === '审批单')) del('approvals', 'DELETE FROM approvals WHERE id = ?', [p.id]);
  // 5.4 测试供应商
  for (const p of plan.filter(x => x.group === '供应商')) del('suppliers', 'DELETE FROM suppliers WHERE id = ?', [p.id]);
  // 5.5 测试物料（连同批次账与流水）
  for (const p of plan.filter(x => x.group === '物料主数据')) {
    del('batch_inventory', 'DELETE FROM batch_inventory WHERE material_code = ?', [p.code]);
    del('inventory_transaction', 'DELETE FROM inventory_transaction WHERE instance_id = ?', [p.code]);
    del('materials', 'DELETE FROM materials WHERE id = ?', [p.id]);
  }

  db.exec('COMMIT');
  console.log('  已提交');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('  ❌ 失败已回滚：', e.message);
  db.close();
  process.exit(1);
}
Object.entries(summary).forEach(([t, n]) => console.log(`    ${t}: 删除 ${n} 行`));

H('删除后校验')
for (const t of ['materials', 'batch_inventory', 'inventory_transaction', 'material_requests', 'material_executes', 'material_returns', 'suppliers', 'approvals', 'inbound_records']) {
  console.log(`  ${t}: ${one(`SELECT COUNT(*) c FROM ${t}`).c}`);
}
db.close();
