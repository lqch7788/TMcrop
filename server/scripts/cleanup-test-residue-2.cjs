/**
 * 测试/演示残留清理 · 第二批（用户授权"清所有项目"）
 *
 * 与第一批同样的原则：显式 ID 枚举 + 逐条依赖校验，默认干跑。
 *
 * 覆盖：
 *   A. 测试入库单 RK20260927-0003（id=44）+ 其批次/流水 + **库存修正**
 *      —— 该单含一条真实物料 EC0204001（机油 4L）100 件，删除后主表须 130 → 30
 *   B. 解锁后的测试物料 TEST-INBOUND-UI-003 / TEST_NOOP_001 / TEST_REMARKS_001
 *   C. 测试供应商 SU_SP03014（清空引用后已 0 引用）
 *   D. 3 条无主批次行（material_code 无主数据，余量均为 0）
 *   E. 5 条 mojibake 测试审批单
 *   F. 11 条种子退料单（引用不存在的出库单，2024 种子数据）
 *   G. 解锁 SP0199518 的 draft 脏申请单 MR1786351349523
 *
 * 用法：停服 → node server/scripts/cleanup-test-residue-2.cjs [--apply] → 启服
 */
const Database = require('better-sqlite3');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const db = new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { fileMustExist: true });
const all = (s, p = []) => { try { return db.prepare(s).all(...p); } catch (e) { return [{ __err: e.message }]; } };
const one = (s, p = []) => all(s, p)[0] ?? null;
const H = (t) => console.log('\n' + '='.repeat(72) + '\n' + t + '\n' + '='.repeat(72));
const P = (o) => console.log('  ' + JSON.stringify(o));

const plan = [];   // { group, table, run:[{sql,params}], note }
const blocked = [];

// ─────────────────────────────────────────────────────────────────────
H('A. 测试入库单 RK20260927-0003 (id=44)');
// ─────────────────────────────────────────────────────────────────────
const TEST_INBOUND_ID = 44;
const inbound = one('SELECT id, code, status, operator FROM inbound_records WHERE id = ?', [TEST_INBOUND_ID]);
if (inbound) {
  P(inbound);
  // 该单的三条明细：两条测试物料 + 一条真实物料 EC0204001(机油 4L) 100
  const TEST_CODES = ['TEST-INBOUND-UI-003', 'TEST_NOOP_001'];
  const REAL_CODE = 'EC0204001';
  const batches = all('SELECT material_code, batch_no, total_quantity, remaining_quantity FROM batch_inventory WHERE inbound_record_id = ?', [TEST_INBOUND_ID]);
  console.log('  批次行：'); batches.forEach(b => P(b));
  const realMain = one('SELECT quantity FROM materials WHERE code = ?', [REAL_CODE]);
  const realBatchRest = one('SELECT IFNULL(SUM(remaining_quantity),0) q FROM batch_inventory WHERE material_code = ? AND inbound_record_id <> ?', [REAL_CODE, TEST_INBOUND_ID]);
  console.log(`  ${REAL_CODE} 主表 ${realMain.quantity}；删除本单批次后应剩 ${realBatchRest.q}`);
  // ⚠️ 判据修正：不能只看"批次 total-remaining"就认定"被领用" —— 同一入库单会写两条批次行
  // （upsertBatchInventory 的"默认批次" + 迁移补的 "DEFAULT-{code}-{id}"），其中一条余量为 0
  // 是重复行被清零，不代表真有出库。真正的判据是**该物料有没有真实出库/申请/退料单据**。
  const realRefs = {
    exec: one('SELECT COUNT(*) c FROM material_executes WHERE materials LIKE ?', [`%${REAL_CODE}%`]).c,
    req: one('SELECT COUNT(*) c FROM material_requests WHERE materials LIKE ?', [`%${REAL_CODE}%`]).c,
    ret: one('SELECT COUNT(*) c FROM material_returns WHERE materials LIKE ?', [`%${REAL_CODE}%`]).c,
  };
  console.log(`  真实单据引用：出库 ${realRefs.exec} / 申请 ${realRefs.req} / 退料 ${realRefs.ret}`);
  if (realRefs.exec + realRefs.req + realRefs.ret > 0) {
    blocked.push({ code: inbound.code, 原因: `${REAL_CODE} 被真实业务单据引用，删除入库会破坏其账目`, 建议: '人工核对后处理' });
  } else if (Number(realMain.quantity) < Number(realBatchRest.q)) {
    blocked.push({ code: inbound.code, 原因: `${REAL_CODE} 主表数量(${realMain.quantity})低于剩余真实批次(${realBatchRest.q})`, 建议: '人工核对' });
  } else {
    plan.push({
      group: 'A 测试入库单', note: `${inbound.code} + 批次 + 流水 + 库存修正(${REAL_CODE} -100)`,
      steps: [
        { sql: 'DELETE FROM inventory_transaction WHERE business_id = ?', params: [String(TEST_INBOUND_ID)] },
        { sql: 'DELETE FROM batch_inventory WHERE inbound_record_id = ?', params: [TEST_INBOUND_ID] },
        // 主表按"剩余真实批次汇总"重算（而非硬编码 -100），保证两本账必然自洽
        {
          sql: `UPDATE materials SET quantity = (SELECT IFNULL(SUM(remaining_quantity),0) FROM batch_inventory WHERE material_code = ?), lastUpdateTime = ? WHERE code = ?`,
          params: [REAL_CODE, new Date().toISOString(), REAL_CODE],
          label: `materials(${REAL_CODE} 重算为剩余批次汇总)`,
        },
        { sql: 'DELETE FROM inbound_records WHERE id = ?', params: [TEST_INBOUND_ID] },
      ],
    });
  }
} else { console.log('  已不存在，跳过'); }

// ─────────────────────────────────────────────────────────────────────
H('B. 解锁后的测试物料');
// ─────────────────────────────────────────────────────────────────────
for (const code of ['TEST-INBOUND-UI-003', 'TEST_NOOP_001', 'TEST_REMARKS_001']) {
  const m = one('SELECT id, code, name, quantity FROM materials WHERE code = ?', [code]);
  if (!m) { console.log(`  ${code} 已不存在`); continue; }
  const refs = {
    inbound: one('SELECT COUNT(*) c FROM inbound_records WHERE materials LIKE ?', [`%${code}%`]).c,
    exec: one('SELECT COUNT(*) c FROM material_executes WHERE materials LIKE ?', [`%${code}%`]).c,
    req: one('SELECT COUNT(*) c FROM material_requests WHERE materials LIKE ?', [`%${code}%`]).c,
    ret: one('SELECT COUNT(*) c FROM material_returns WHERE materials LIKE ?', [`%${code}%`]).c,
  };
  P({ code, name: m.name, qty: m.quantity, ...refs });
  // A 组会先删掉唯一的入库单引用，此处按"删完之后"判断
  const afterInbound = refs.inbound - (inbound ? 1 : 0);
  if (afterInbound + refs.exec + refs.req + refs.ret > 0) {
    blocked.push({ code, 原因: `仍有引用（入库 ${afterInbound}/出库 ${refs.exec}/申请 ${refs.req}/退料 ${refs.ret}）`, 建议: '保留' });
  } else {
    plan.push({
      group: 'B 测试物料', note: code,
      steps: [
        { sql: 'DELETE FROM inventory_transaction WHERE instance_id = ?', params: [code] },
        { sql: 'DELETE FROM batch_inventory WHERE material_code = ?', params: [code] },
        { sql: 'DELETE FROM materials WHERE id = ?', params: [m.id] },
      ],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
H('C. 测试供应商 SU_SP03014');
// ─────────────────────────────────────────────────────────────────────
const sup = one(`SELECT s.id, s.supplier_code, s.supplier_name,
  (SELECT COUNT(*) FROM materials m WHERE m.supplierId = s.id OR m.supplier = s.supplier_name) matRefs,
  (SELECT COUNT(*) FROM inbound_records i WHERE i.supplierId = s.id OR i.supplier = s.supplier_name) inbRefs
  FROM suppliers s WHERE s.supplier_code = 'SU_SP03014'`);
if (sup) {
  P(sup);
  if (sup.matRefs + sup.inbRefs > 0) blocked.push({ code: sup.supplier_code, 原因: `仍被引用`, 建议: '保留' });
  else plan.push({ group: 'C 测试供应商', note: sup.supplier_code, steps: [{ sql: 'DELETE FROM suppliers WHERE id = ?', params: [sup.id] }] });
} else console.log('  已不存在');

// ─────────────────────────────────────────────────────────────────────
H('D. 无主批次行');
// ─────────────────────────────────────────────────────────────────────
const orphanBatches = all(`SELECT id, material_code, batch_no, remaining_quantity FROM batch_inventory b
  WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE m.code = b.material_code)`);
orphanBatches.forEach(b => P(b));
const nonZero = orphanBatches.filter(b => Number(b.remaining_quantity) !== 0);
if (nonZero.length) blocked.push({ code: '无主批次行', 原因: `${nonZero.length} 条余量非 0，删除会丢库存痕迹`, 建议: '人工核对' });
else if (orphanBatches.length) plan.push({ group: 'D 无主批次行', note: `${orphanBatches.length} 条`, steps: orphanBatches.map(b => ({ sql: 'DELETE FROM batch_inventory WHERE id = ?', params: [b.id] })) });

// ─────────────────────────────────────────────────────────────────────
H('E. mojibake 测试审批单');
// ─────────────────────────────────────────────────────────────────────
const MOJI_APPROVALS = ['AP_TEST_001', 'PP1780322881793', 'PP1780322883388', 'PP1780322884999', 'v11_approval_test_001'];
const mojiRows = all(`SELECT id, code, type, status, applicant_name FROM approvals WHERE id IN (${MOJI_APPROVALS.map(() => '?').join(',')})`, MOJI_APPROVALS);
mojiRows.forEach(r => P(r));
const mojiIds = mojiRows.map(r => r.id);
if (mojiIds.length) plan.push({ group: 'E mojibake 审批单', note: `${mojiIds.length} 条`, steps: mojiIds.map(id => ({ sql: 'DELETE FROM approvals WHERE id = ?', params: [id] })) });

// ─────────────────────────────────────────────────────────────────────
H('F. 种子退料单（引用不存在的出库单）');
// ─────────────────────────────────────────────────────────────────────
const seedReturns = all(`SELECT r.id, r.code, r.status, r.statusClass FROM material_returns r
  WHERE json_valid(r.materials) AND EXISTS (
    SELECT 1 FROM json_each(r.materials) j
    WHERE NOT EXISTS (SELECT 1 FROM material_executes e WHERE e.code = json_extract(j.value, '$.sourceApplicationCode')))`);
seedReturns.forEach(r => P({ code: r.code, status: r.status }));
if (seedReturns.length) {
  plan.push({
    group: 'F 种子退料单', note: `${seedReturns.length} 条`,
    steps: seedReturns.flatMap(r => [
      { sql: 'DELETE FROM inventory_transaction WHERE business_id = ? OR business_code = ?', params: [String(r.id), r.code] },
      { sql: 'DELETE FROM material_returns WHERE id = ?', params: [r.id] },
    ]),
  });
}

// ─────────────────────────────────────────────────────────────────────
H('G. draft 脏申请单（解锁 SP0199518）—— 用户决定保留，本组不执行');
// ─────────────────────────────────────────────────────────────────────
// 2026-09-29 用户选择：SP0199518 与 EQ0202002 维持上一轮"保留，仅修正属性"的决定，
// 因此不删除其唯一引用者 MR1786351349523，本组整段跳过。
console.log('  [已按用户决定跳过] SP0199518 / EQ0202002 与其引用单据保持原样');

// ─────────────────────────────────────────────────────────────────────
H('汇总');
// ─────────────────────────────────────────────────────────────────────
plan.forEach(p => console.log(`  · ${p.group}: ${p.note}  (${p.steps.length} 条 SQL)`));
console.log(`  受阻保留：${blocked.length}`);
blocked.forEach(b => console.log(`    ⚠️ ${b.code} — ${b.原因} → ${b.建议}`));

if (!APPLY) { console.log('\n[干跑] 未改动。加 --apply 执行。'); db.close(); process.exit(0); }

H('执行');
const summary = {};
db.exec('BEGIN');
try {
  // A 组必须最先执行（解锁 B 组）；G 组次之（解锁 G2）
  const stepOrder = ['A 测试入库单', 'B 测试物料', 'C 测试供应商', 'D 无主批次行', 'E mojibake 审批单', 'F 种子退料单'];
  for (const g of stepOrder) {
    for (const p of plan.filter(x => x.group === g)) {
      for (const s of p.steps) {
        const table = (s.sql.match(/(?:DELETE FROM|UPDATE)\s+(\w+)/i) || [])[1] || 'other';
        const n = db.prepare(s.sql).run(...s.params).changes;
        summary[table] = (summary[table] || 0) + n;
      }
      console.log(`  ${p.group}: ${p.note} ✅`);
    }
  }
  db.exec('COMMIT');
  console.log('  已提交');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('  ❌ 失败已回滚：', e.message);
  db.close(); process.exit(1);
}
Object.entries(summary).forEach(([t, n]) => console.log(`    ${t}: ${n} 行`));

H('校验');
const consistency = one(`SELECT COUNT(*) total,
  SUM(CASE WHEN ABS(m.quantity - COALESCE((SELECT SUM(b.remaining_quantity) FROM batch_inventory b WHERE b.material_code=m.code),0))>0.001 THEN 1 ELSE 0 END) mm
  FROM materials m`);
console.log(`  两本账：${consistency.total} 条物料，不一致 ${consistency.mm} 条 ${consistency.mm === 0 ? '✅' : '⚠️'}`);
console.log(`  无主批次行：${one('SELECT COUNT(*) c FROM batch_inventory b WHERE NOT EXISTS(SELECT 1 FROM materials m WHERE m.code=b.material_code)').c}`);
console.log('  关键表行数：');
for (const t of ['materials', 'batch_inventory', 'inventory_transaction', 'material_requests', 'material_executes', 'material_returns', 'suppliers', 'approvals', 'inbound_records'])
  console.log(`    ${t}: ${one(`SELECT COUNT(*) c FROM ${t}`).c}`);
db.close();
