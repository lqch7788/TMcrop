/**
 * 种源台账一致性审计（只读，2026-10-17）
 *
 * 用途：定期检查种源详情四 Tab 的数据源是否对账一致，防止系统性偏差。
 * 检查项：
 *   ① 凭证毛额 = 调拨流水毛额 − 冲销流水（仅调拨型种源）
 *   ② 凭证已退 = 退库主流水合计（business_type='inventory_transfer' 的 transfer_in）
 *   ③ 种源入库数量 Q = 凭证毛额(未冲销) − 已退
 *   ④ 可用 R = Q − 有效领用（育苗 source_deducted_quantity + 有效种植 move_in）
 *   ⑤ used_quantity = Q − R
 *   ⑥ 历史育苗/种植领用缺库存流水/移库记录数量
 *   ⑦ 流转 target_code 无法匹配任何业务批号的数量
 *
 * 用法：node server/scripts/audit-seed-source-consistency.cjs
 *   退出码 0 = 通过；1 = 发现差异（需人工核对）
 */
const path = require('path');
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const db = new Database(DB_PATH, { readonly: true });
const n = (v) => Number(v) || 0;
const eq = (a, b) => Math.abs(n(a) - n(b)) < 0.001;

const sources = db.prepare(`
  SELECT id, source_code, quantity, remaining_quantity, used_quantity, unit,
         propagation_type, source_origin, deleted_at
  FROM seed_sources WHERE deleted_at IS NULL ORDER BY create_time
`).all();

const issues = [];
for (const s of sources) {
  const v = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN quantity END),0) grossActive,
           COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN returned_quantity END),0) returnedActive,
           COUNT(*) c
    FROM inventory_inbound_records
    WHERE business_id = ? AND source_module IN ('seed_source','inventory','planting')
  `).get(s.id);
  const tin = db.prepare(`
    SELECT COALESCE(SUM(quantity),0) q FROM inventory_transaction
    WHERE business_id = ? AND transaction_type='transfer_in' AND business_type='transfer'
  `).get(s.id).q;
  const rev = db.prepare(`
    SELECT COALESCE(ABS(SUM(quantity)),0) q FROM inventory_transaction
    WHERE (business_id = ? OR instance_id = ?) AND transaction_type='reverse_inbound'
  `).get(s.id, s.id).q;
  const returned = db.prepare(`
    SELECT COALESCE(SUM(quantity),0) q FROM inventory_transaction
    WHERE business_id = ? AND transaction_type='transfer_in' AND business_type='inventory_transfer'
  `).get(s.id).q;
  const seedUse = db.prepare(`
    SELECT COALESCE(SUM(source_deducted_quantity),0) q FROM seedlings
    WHERE source_id = ? AND deleted_at IS NULL AND source_deducted_quantity > 0
  `).get(s.id).q;
  const plantUse = db.prepare(`
    SELECT COALESCE(SUM(pmr.quantity),0) q
    FROM planting_move_records pmr
    WHERE pmr.source_id = ? AND pmr.source_type='seed' AND pmr.operation_type='move_in'
      AND NOT EXISTS (
        SELECT 1 FROM inventory_transaction fix
        WHERE fix.business_code = pmr.planting_code AND fix.remarks LIKE '单位口径修复%'
      )
  `).get(s.id).q;

  const isTransfer = s.propagation_type === 'transfer_from_inventory' || s.source_origin === 'inventory_transfer';
  const code = s.source_code;

  if (isTransfer && n(tin) > 0 && !eq(n(v.grossActive), n(tin) - n(rev))) {
    issues.push({ code, type: '①凭证毛额', detail: `凭证 ${n(v.grossActive)} ≠ 调拨 ${n(tin)} − 冲销 ${n(rev)}` });
  }
  if (isTransfer && !eq(v.returnedActive, returned)) {
    issues.push({ code, type: '②凭证已退', detail: `凭证已退 ${n(v.returnedActive)} ≠ 退库流水 ${n(returned)}` });
  }
  if (isTransfer && n(tin) > 0 && !eq(s.quantity, n(v.grossActive) - n(v.returnedActive))) {
    issues.push({ code, type: '③入库数量', detail: `Q ${n(s.quantity)} ≠ 凭证净额 ${n(v.grossActive) - n(v.returnedActive)}` });
  }
  const expectedR = n(s.quantity) - n(seedUse) - n(plantUse);
  if (!eq(s.remaining_quantity, expectedR)) {
    issues.push({ code, type: '④可用数量', detail: `R ${n(s.remaining_quantity)} ≠ Q − 有效领用 ${expectedR}（育苗 ${n(seedUse)} / 种植 ${n(plantUse)}）` });
  }
  if (!eq(s.used_quantity, n(s.quantity) - n(s.remaining_quantity))) {
    issues.push({ code, type: '⑤used字段', detail: `used ${n(s.used_quantity)} ≠ Q−R ${n(s.quantity) - n(s.remaining_quantity)}` });
  }
}

// ⑥ 历史领用缺流水/移库
const seedMissingTx = db.prepare(`
  SELECT COUNT(*) c FROM seedlings s
  WHERE s.deleted_at IS NULL AND COALESCE(s.source_deducted_quantity,0) > 0
    AND s.source_id IS NOT NULL AND s.source_id != ''
    AND EXISTS (SELECT 1 FROM seed_sources ss WHERE ss.id = s.source_id)
    AND NOT EXISTS (
      SELECT 1 FROM inventory_transaction tx
      WHERE tx.instance_id='seed_source:'||s.source_id AND tx.business_type='seedling'
        AND tx.business_id=s.id AND tx.transaction_type='outbound'
    )
`).get().c;
const plantMissingTx = db.prepare(`
  SELECT COUNT(*) c FROM plantings p
  WHERE p.deleted_at IS NULL AND p.source_id IS NOT NULL AND p.source_id != ''
    AND EXISTS (SELECT 1 FROM seed_sources ss WHERE ss.id = p.source_id)
    AND NOT EXISTS (
      SELECT 1 FROM inventory_transaction tx
      WHERE tx.instance_id='seed_source:'||p.source_id AND tx.business_type='internal_planting'
        AND tx.business_id=p.id AND tx.transaction_type='outbound'
    )
`).get().c;
const plantMissingMove = db.prepare(`
  SELECT COUNT(*) c FROM plantings p
  WHERE p.deleted_at IS NULL AND p.source_id IS NOT NULL AND p.source_id != ''
    AND EXISTS (SELECT 1 FROM seed_sources ss WHERE ss.id = p.source_id)
    AND EXISTS (
      SELECT 1 FROM material_flow_log f
      WHERE f.flow_type='seed_source→planting' AND f.source_id=p.source_id
        AND (f.target_code=p.planting_code OR f.target_quantity=p.planting_quantity)
    )
    AND NOT EXISTS (
      SELECT 1 FROM planting_move_records m
      WHERE m.source_id=p.source_id AND m.planting_code=p.planting_code AND m.operation_type='move_in'
    )
    AND NOT EXISTS (
      SELECT 1 FROM inventory_transaction fix
      WHERE fix.business_code = p.planting_code AND fix.remarks LIKE '单位口径修复%'
    )
`).get().c;

// ⑦ 流转 target_code 无法匹配
const orphanPlantFlows = db.prepare(`
  SELECT COUNT(*) c FROM material_flow_log f
  WHERE f.flow_type='seed_source→planting'
    AND NOT EXISTS (SELECT 1 FROM plantings p WHERE p.planting_code=f.target_code)
`).get().c;
const orphanSeedFlows = db.prepare(`
  SELECT COUNT(*) c FROM material_flow_log f
  WHERE f.flow_type='seed_source→seedling'
    AND NOT EXISTS (SELECT 1 FROM seedlings s WHERE s.seedling_code=f.target_code)
`).get().c;

console.log('='.repeat(64));
console.log(`种源台账一致性审计（${sources.length} 个在用种源）`);
console.log('='.repeat(64));
if (issues.length === 0) {
  console.log('✅ ①-⑤ 种源级对账全部通过');
} else {
  for (const i of issues) console.log(`❌ ${i.code} ${i.type}: ${i.detail}`);
}
console.log('');
console.log(`⑥ 育苗领用缺库存流水: ${seedMissingTx}`);
console.log(`⑥ 种植领用缺库存流水: ${plantMissingTx}`);
console.log(`⑥ 种植领用缺移库记录: ${plantMissingMove}`);
console.log(`⑦ 种植流转 target_code 无匹配（历史测试/目标已删）: ${orphanPlantFlows}`);
console.log(`⑦ 育苗流转 target_code 无匹配（历史测试/目标已删）: ${orphanSeedFlows}`);
console.log('   说明：⑦ 为历史上测试数据或目标单据已删除的孤儿流转，不影响账实与四 Tab 对账；');
console.log('         如需彻底清零，需按 ID 人工确认后删除（不可按模式批量删）。');

// ⑦ 孤儿流转不计入失败（历史测试/目标已删；①-⑥ 才是账实一致性）
const bad = issues.length + seedMissingTx + plantMissingTx + plantMissingMove;
console.log('');
console.log(bad === 0
  ? (orphanPlantFlows + orphanSeedFlows === 0 ? '✅ 全部检查通过' : `✅ 账实一致性检查通过（另有 ${orphanPlantFlows + orphanSeedFlows} 条历史孤儿流转，见 ⑦）`)
  : `⚠️ 共发现 ${bad} 项账实差异，请人工核对`);
db.close();
process.exit(bad === 0 ? 0 : 1);
