/**
 * 生产退料模块 E2E 验证脚本（2026-09-28 审批流接入后版本）
 *
 * 覆盖修复项：
 *  - 库存时机：pending 不占库存，**审批通过才恢复**（2026-09-28 审批流接入）
 *  - 退料数据闭环校验（来源单号存在 + 已出库状态 + 累计不超实发 + 数量>0）
 *  - 状态机 statusClass 权威（pending/approved/rejected/voided/draft）
 *  - POST/PUT 返回完整记录；批量删除单事务；删除归档；分页/LIKE 防护
 *
 * 用法：node server/scripts/e2e-material-return-verify.cjs
 */
const BASE = 'http://localhost:3001/api';

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name}${detail ? ' → ' + detail : ''}`); }
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  let json = null;
  try { json = await res.json(); } catch { /* 非 JSON */ }
  return { status: res.status, body: json };
}

/** 物料主表库存（/api/materials 返回扁平数组，客户端过滤） */
async function getStock(code) {
  const r = await api('GET', '/materials?limit=500');
  const list = Array.isArray(r.body) ? r.body : (Array.isArray(r.body?.data) ? r.body.data : []);
  const row = list.find(m => m.code === code);
  return row ? Number(row.quantity) || 0 : null;
}

(async () => {
  console.log('\n========== 生产退料 E2E 验证（审批流接入版）==========\n');

  // 准备基座
  const ex = await api('GET', '/material-executes?limit=200');
  const execList = Array.isArray(ex.body?.data) ? ex.body.data : [];
  const okExec = execList.find(r => ['completed', 'partial'].includes(String(r.executeStatusClass || '').toLowerCase())
    && Array.isArray(r.materials) && r.materials.length > 0);
  const cancelledExec = execList.find(r => String(r.executeStatusClass || '').toLowerCase() === 'cancelled'
    && Array.isArray(r.materials) && r.materials.length > 0);
  if (!okExec) { console.log('⚠️  无可用测试出库单，终止'); process.exit(1); }

  const srcCode = okExec.code;
  const line = okExec.materials[0];
  const matCode = line.materialCode;
  const actualQty = Number(line.actualQuantity ?? line.requestedQuantity ?? 0);
  const baseStock = await getStock(matCode);
  console.log(`测试基座：${srcCode} / ${matCode} / 实发 ${actualQty} / 基线库存 ${baseStock}\n`);

  /** 构造退料明细 */
  const mkLine = (qty) => ({
    sourceApplicationCode: srcCode, materialCode: matCode,
    materialName: line.materialName || matCode, spec: line.spec || '', unit: line.unit || '',
    quantity: actualQty, returnQuantity: qty, unitPrice: Number(line.unitPrice) || 0,
    warehousePosition: line.warehousePosition || '', reason: '生产剩余', remark: '', batchNo: line.batchNo || '',
  });

  // ---------- 1. 列表与分页防护 ----------
  console.log('【1】列表与分页参数');
  {
    const base = await api('GET', '/material-returns?limit=3');
    check('GET 列表返回 200', base.status === 200);
    const bad = await api('GET', '/material-returns?page=abc&limit=xyz');
    check('非法 page/limit 不返回 500（参数钳制）', bad.status === 200, `实际 ${bad.status}`);
    const big = await api('GET', '/material-returns?limit=999999');
    check('超大 limit 被钳制（≤200）', Number(big.body?.meta?.limit) <= 200, `实际 ${big.body?.meta?.limit}`);
    const like = await api('GET', '/material-returns?applicant=%25');
    check('LIKE 通配符转义不报错', like.status === 200);
  }

  // ---------- 2. 数据闭环校验 ----------
  console.log('\n【2】数据闭环校验（应全部拒绝）');
  const rejectCases = [
    ['数量为 0', { code: 'TL-E2E-ZERO', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(0) }] }],
    ['数量为负', { code: 'TL-E2E-NEG', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(-5) }] }],
    ['空明细', { code: 'TL-E2E-EMPTY', date: '2026-09-28', applicant: 'E2E', materials: [] }],
    ['缺少来源单号', { code: 'TL-E2E-NOSRC', date: '2026-09-28', applicant: 'E2E', materials: [{ materialCode: matCode, materialName: 'E2E', returnQuantity: 1, reason: '生产剩余' }] }],
    ['来源单号不存在', { code: 'TL-E2E-FAKE', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(1), sourceApplicationCode: 'CK-NOT-EXIST-999' }] }],
    ['超量退料', { code: 'TL-E2E-OVER', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(actualQty + 9999) }] }],
    ['物料不在来源单明细内', { code: 'TL-E2E-WRONG', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(1), materialCode: '__NOT_IN_LIST__' }] }],
  ];
  if (cancelledExec) {
    const cm = cancelledExec.materials[0];
    rejectCases.push(['来源单已取消', { code: 'TL-E2E-CANCELLED', date: '2026-09-28', applicant: 'E2E', materials: [{ ...mkLine(1), sourceApplicationCode: cancelledExec.code, materialCode: cm.materialCode }] }]);
  }
  for (const [name, payload] of rejectCases) {
    const r = await api('POST', '/material-returns', payload);
    check(`拒绝：${name}`, r.status === 400, `返回 ${r.status} ${JSON.stringify(r.body?.error || '').slice(0, 60)}`);
  }

  // ---------- 3. 创建 pending：库存不变（审批流新语义）----------
  console.log('\n【3】创建 pending（库存不变 + 完整记录）');
  const rc1 = `TL-E2E-P1-${Date.now()}`;
  const mk = await api('POST', '/material-returns', {
    code: rc1, date: '2026-09-28', type: '生产退料', applicant: 'E2E', department: '生产部',
    warehouseLocation: 'A区-01', status: '待审批', statusClass: 'pending', remark: 'E2E审批流',
    materials: [mkLine(2)],
  });
  check('POST 创建返回 201', mk.status === 201, `实际 ${mk.status} ${JSON.stringify(mk.body?.error || '').slice(0, 60)}`);
  const id1 = mk.body?.data?.id;
  check('返回完整记录', !!mk.body?.data?.status && Array.isArray(mk.body?.data?.materials));
  const s1 = await getStock(matCode);
  check(`pending 库存不变（${baseStock} → ${s1}）`, s1 === baseStock, `实际 ${s1}`);

  // ---------- 4. 审批通过 → 库存恢复 ----------
  console.log('\n【4】审批通过 → 库存恢复');
  const apv = await api('PUT', `/material-returns/${id1}`, { status: '已审批' });
  check('状态流转为已审批', apv.status === 200 && apv.body?.data?.statusClass === 'approved',
    `实际 ${apv.body?.data?.statusClass}`);
  const s2 = await getStock(matCode);
  check(`审批通过 → 库存 +2（${baseStock} → ${s2}）`, s2 === baseStock + 2, `实际 ${s2}`);

  // ---------- 5. 作废 → 库存回收 ----------
  console.log('\n【5】作废 → 库存回收');
  const vd = await api('PUT', `/material-returns/${id1}`, { status: '已作废', rejectReason: 'E2E作废' });
  check('状态置为已作废', vd.status === 200 && vd.body?.data?.statusClass === 'voided', `实际 ${vd.body?.data?.statusClass}`);
  const s3 = await getStock(matCode);
  check(`作废 → 库存 -2（回到 ${baseStock}）`, s3 === baseStock, `实际 ${s3}`);

  // ---------- 6. 已作废删除不重复扣减 ----------
  console.log('\n【6】删除已作废单（不重复扣减库存）');
  const sBeforeDel = await getStock(matCode);
  const del = await api('DELETE', `/material-returns/${id1}?reason=E2E清理`);
  check('DELETE 返回 200 + archived', del.status === 200 && del.body?.data?.archived === true, `实际 ${del.status}`);
  const s4 = await getStock(matCode);
  check('删除已作废单不再扣减库存（已不占额度）', s4 === sBeforeDel, `${sBeforeDel} → ${s4}`);

  // ---------- 7. 驳回流程 ----------
  console.log('\n【7】驳回流程（approved → rejected 回收库存）');
  const rc2 = `TL-E2E-REJ-${Date.now()}`;
  const mk2 = await api('POST', '/material-returns', {
    code: rc2, date: '2026-09-28', applicant: 'E2E', status: '待审批', statusClass: 'pending',
    materials: [mkLine(1)],
  });
  const id2 = mk2.body?.data?.id;
  check('创建 pending 失败重试单', mk2.status === 201, JSON.stringify(mk2.body?.error || ''));
  await api('PUT', `/material-returns/${id2}`, { status: '已审批' });
  const s5 = await getStock(matCode);
  check('审批后 +1', s5 === baseStock + 1, `${baseStock} → ${s5}`);
  const rej = await api('PUT', `/material-returns/${id2}`, { status: '已驳回' });
  check('驳回后 statusClass=rejected', rej.body?.data?.statusClass === 'rejected', `实际 ${rej.body?.data?.statusClass}`);
  const s6 = await getStock(matCode);
  check('驳回 → 库存回到基线', s6 === baseStock, `${baseStock} → ${s6}`);
  await api('DELETE', `/material-returns/${id2}?reason=E2E清理`);

  // ---------- 8. 批量删除（单事务）----------
  console.log('\n【8】批量删除（单事务 + 库存回收）');
  {
    const ids = [];
    for (let i = 0; i < 2; i++) {
      const m = await api('POST', '/material-returns', {
        code: `TL-E2E-B${Date.now()}-${i}`, date: '2026-09-28', applicant: 'E2E',
        status: '待审批', statusClass: 'pending', materials: [mkLine(1)],
      });
      // 置为已审批让它们占库存
      if (m.body?.data?.id) {
        await api('PUT', `/material-returns/${m.body.data.id}`, { status: '已审批' });
        ids.push(m.body.data.id);
      }
    }
    const sB = await getStock(matCode);
    const batch = await api('POST', '/material-returns/batch-delete', { ids });
    check('批量删除返回 200', batch.status === 200, `实际 ${batch.status} ${JSON.stringify(batch.body?.error || '').slice(0, 60)}`);
    const sA = await getStock(matCode);
    check(`批量删除回收库存 -${ids.length}`, sA === sB - ids.length, `${sB} → ${sA}`);

    // 含无效 id → 整体回滚
    const mk3 = await api('POST', '/material-returns', {
      code: `TL-E2E-RB-${Date.now()}`, date: '2026-09-28', applicant: 'E2E',
      status: '待审批', statusClass: 'pending', materials: [mkLine(1)],
    });
    const goodId = mk3.body?.data?.id;
    const sRB = await getStock(matCode);
    const rb = await api('POST', '/material-returns/batch-delete', { ids: [goodId, '__NOT_EXIST__'] });
    check('含无效 id → 整体失败', rb.status === 400, `实际 ${rb.status}`);
    const still = await api('GET', `/material-returns/${goodId}`);
    check('事务回滚后有效记录仍存在', still.status === 200, `实际 ${still.status}`);
    const sRA = await getStock(matCode);
    check('回滚后库存未变化', sRA === sRB, `${sRB} → ${sRA}`);
    if (goodId) await api('DELETE', `/material-returns/${goodId}?reason=E2E清理`);
  }

  // ---------- 9. 草稿态（撤回语义）----------
  console.log('\n【9】草稿态（撤回后不占库存）');
  {
    const rc3 = `TL-E2E-DRAFT-${Date.now()}`;
    const m = await api('POST', '/material-returns', {
      code: rc3, date: '2026-09-28', applicant: 'E2E', status: '待审批', statusClass: 'pending',
      materials: [mkLine(1)],
    });
    const did = m.body?.data?.id;
    const dr = await api('PUT', `/material-returns/${did}`, { status: '草稿' });
    check('状态可置为草稿', dr.status === 200 && dr.body?.data?.statusClass === 'draft', `实际 ${dr.body?.data?.statusClass}`);
    const sD = await getStock(matCode);
    check('草稿态不占库存', sD === baseStock, `${baseStock} → ${sD}`);
    await api('DELETE', `/material-returns/${did}?reason=E2E清理`);
  }

  // ---------- 10. 清理 ----------
  console.log('\n【10】清理测试数据');
  {
    const all = await api('GET', '/material-returns?limit=200');
    const leftover = (all.body?.data || []).filter(r => /^TL-(E2E|APV|APVFLOW)-/.test(String(r.code || '')));
    let cleaned = 0;
    for (const rec of leftover) {
      const d = await api('DELETE', `/material-returns/${rec.id}?reason=自动化测试清理`);
      if (d.status === 200) cleaned++; else console.log(`    ⚠️ 清理失败 ${rec.code}: ${d.status}`);
    }
    console.log(`  已清理 ${cleaned}/${leftover.length} 条`);
    const after = await api('GET', '/material-returns?limit=200');
    const rest = (after.body?.data || []).filter(r => /^TL-(E2E|APV|APVFLOW)-/.test(String(r.code || ''))).length;
    check('测试数据已全部清理', rest === 0, `残留 ${rest} 条`);
  }

  // ---------- 汇总 ----------
  const finalStock = await getStock(matCode);
  console.log(`\n最终库存：${finalStock}（基线 ${baseStock}）${finalStock === baseStock ? ' ✅ 账实一致' : ' ⚠️ 与基线不符'}`);
  console.log('\n========== 验证汇总 ==========');
  console.log(`通过 ${pass} / 失败 ${fail}`);
  if (failures.length > 0) { console.log('\n失败项：'); failures.forEach(f => console.log(`  - ${f}`)); }
  console.log('');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('\n脚本异常:', e); process.exit(1); });
