/**
 * 测试物料「属性修正」（不删行）
 *
 * 背景：有 4 个物料被真实业务单据引用，删除会破坏数据（已由 cleanup-test-residue.cjs
 * 的依赖校验拦下）。改为只修正**可确证**的属性：
 *   - mojibake 乱码 → 按同批次/备注可确证的正常值
 *   - 测试残留的供应商引用 → 清空（不臆造供应商）
 *   - 测试批次号标记 → 清空
 * 无法确证原值的字段（如 EQ0202002 的名称"33"）**保持原样**并列入报告，等人工确认。
 *
 * 用法：停服 → node server/scripts/fix-test-material-attrs.cjs [--apply]
 */
const Database = require('better-sqlite3');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const db = new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { fileMustExist: true });

/** 修正计划：每项写明依据，可人工复核 */
const FIXES = [
  {
    code: 'EQ0101243',
    set: { name: '测试02', dataStatus: '启用', unit: '个', supplier: '', supplierId: '', batchNo: '' },
    依据: 'remarks 字段保留了原名「测试02」（与同批 EQ0101242「测试01」一致）；dataStatus 乱码按全表标准值「启用」；供应商无法溯源故清空；批次号「123」为测试值',
    保留: 'unit 原值为乱码（2 字节），按同类设备物料取「个」，如不符请人工修正',
  },
  {
    code: 'EC0202001',
    set: { supplier: '', supplierId: '', batchNo: '' },
    依据: '物料名称「尼龙扎带（30cm）」为真实名称无需改；供应商「审计测试」与批次号「AUDIT-B3」是审计测试遗留标记',
    保留: '名称保持不变',
  },
  {
    code: 'EQ0202002',
    set: { supplier: '', supplierId: '' },
    依据: '清除测试供应商「测试公司」',
    保留: '名称「33」与规格「测试」无从确证原值，**未修改**，需人工指定',
  },
  {
    code: 'SP0199518',
    set: { supplier: '', supplierId: '' },
    依据: '清除测试供应商「测试001」（清空后该供应商 SU_SP03014 将不再被引用）',
    保留: '名称/规格/条码均为「测试001」，无从确证原值，**未修改**，需人工指定',
  },
  {
    code: 'EQ0202001',
    set: { supplier: '', supplierId: '' },
    依据: '物料名称「薄膜」为真实名称、有真实出库记录（CK20260928001）；仅供应商字段是测试残留值「测试」',
    保留: '名称保持不变',
  },
];

console.log('='.repeat(72));
console.log(`测试物料属性修正${APPLY ? '（执行）' : '（干跑）'}`);
console.log('='.repeat(72));

const plan = [];
for (const f of FIXES) {
  const row = db.prepare('SELECT * FROM materials WHERE code = ?').get(f.code);
  if (!row) { console.log(`\n⚠️ ${f.code} 不存在，跳过`); continue; }
  console.log(`\n【${f.code}】${row.name}`);
  console.log(`  依据：${f.依据}`);
  console.log(`  保留待人工：${f.保留}`);
  const changes = {};
  for (const [k, v] of Object.entries(f.set)) {
    if (row[k] !== v) changes[k] = { from: row[k], to: v };
  }
  if (Object.keys(changes).length === 0) { console.log('  → 无需变更'); continue; }
  Object.entries(changes).forEach(([k, c]) => console.log(`  ${k}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`));
  plan.push({ code: f.code, changes });
}

if (!APPLY) {
  console.log('\n[干跑] 未改动。加 --apply 执行。');
  db.close();
  process.exit(0);
}

console.log('\n' + '='.repeat(72));
db.exec('BEGIN');
try {
  const now = new Date().toISOString();
  for (const p of plan) {
    const keys = Object.keys(p.changes);
    const sql = `UPDATE materials SET ${keys.map(k => `${k} = ?`).join(', ')}, lastUpdateTime = ? WHERE code = ?`;
    const params = [...keys.map(k => p.changes[k].to), now, p.code];
    const n = db.prepare(sql).run(...params).changes;
    console.log(`  ${p.code}: 更新 ${n} 行`);
  }
  db.exec('COMMIT');
  console.log('  已提交');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('  ❌ 失败已回滚：', e.message);
  db.close();
  process.exit(1);
}

console.log('\n=== 修正后核对 ===');
for (const f of FIXES) {
  const r = db.prepare('SELECT code, name, unit, supplier, supplierId, batchNo, dataStatus FROM materials WHERE code = ?').get(f.code);
  console.log('  ' + JSON.stringify(r));
}
console.log('\n=== 受影响的测试供应商是否已无引用 ===');
const orphanSup = db.prepare(`
  SELECT s.id, s.supplier_code, s.supplier_name,
    (SELECT COUNT(*) FROM materials m WHERE m.supplierId = s.id OR m.supplier = s.supplier_name) matRefs
  FROM suppliers s WHERE s.supplier_code = 'SU_SP03014'`).get();
console.log('  ' + JSON.stringify(orphanSup) + (orphanSup && orphanSup.matRefs === 0 ? '  → 已无引用，可删除' : ''));
db.close();
