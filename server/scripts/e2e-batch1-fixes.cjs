/**
 * 2026-09-27 批一修复 E2E 验证脚本
 * 覆盖：作废联动审批 / 删除保护(含 pending_out) / 结案 / 退料库存联动 / executions 状态口径
 * 用法：node scripts/e2e-batch1-fixes.cjs（后端需运行在 3001）
 */
const BASE = 'http://localhost:3001/api';
let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed += 1;
  } else {
    console.log(`  ✗ ${name}${extra ? ' — ' + JSON.stringify(extra) : ''}`);
    failed += 1;
  }
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* 无 body */ }
  return { status: res.status, json, data: json && json.data !== undefined ? json.data : json };
}

const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const put = (p, b) => api('PUT', p, b);
const del = (p) => api('DELETE', p);

/** 查单个物料当前主表库存 */
async function materialQty(code) {
  const r = await get('/materials/' + encodeURIComponent(code));
  if (r.json && r.json.data && r.json.data.quantity !== undefined) return Number(r.json.data.quantity);
  // 列表兜底
  const list = await get('/materials');
  const arr = Array.isArray(list.data) ? list.data : [];
  const hit = arr.find((m) => m.code === code);
  return hit ? Number(hit.quantity) : null;
}

async function main() {
  const stamp = Date.now();
  const created = { requests: [], executes: [], returns: [], approvals: [] };

  console.log('=== 批一修复 E2E ===');

  // 取一个有足够库存的物料做测试
  const matsRes = await get('/materials');
  const mats = Array.isArray(matsRes.data) ? matsRes.data : [];
  const testMat = mats.filter((m) => Number(m.quantity) >= 10).sort((a, b) => Number(b.quantity) - Number(a.quantity))[0];
  if (!testMat) { console.log('!! 无可用测试物料（库存≥10）'); process.exit(1); }
  console.log(`测试物料: ${testMat.code}（${testMat.name}，库存 ${testMat.quantity}）`);

  // ==================== T1 作废联动审批 ====================
  console.log('\n[T1] 作废联动审批');
  const code1 = `E2EB1-VOID-${stamp}`;
  const req1 = await post('/material-requests', {
    request_code: code1,
    request_title: 'E2E作废联动测试',
    applicant_name: 'E2E测试员',
    status: 'pending',
    approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 2, unit: testMat.unit || '个' }],
  });
  check('T1 建申请单', req1.status === 201 || req1.status === 200, req1.json);
  const req1Id = req1.data && (req1.data.id || req1.data.requestCode) || code1;
  created.requests.push(req1Id);

  const apId = `E2E-AP-VOID-${stamp}`;
  const ap1 = await post('/approvals', {
    id: apId,
    type: 'material_request',
    type_name: '领料申请',
    title: 'E2E作废联动审批单',
    applicant_name: 'E2E测试员',
    status: 'pending',
    approvers: [{ userId: 'U-E2E', userName: 'E2E审批人', role: '审批人', order: 1, status: 'pending' }],
    records: [],
    // business_link 传对象（后端会 JSON.stringify）；传字符串会双重编码导致匹配失败
    business_link: { type: 'material', requestId: req1Id, requestCode: code1 },
  });
  check('T1 建审批单', ap1.status === 201 || ap1.status === 200, ap1.json);

  const voidRes = await put('/material-requests/' + req1Id, { status: 'voided', approval_status: 'voided', remarks: 'E2E作废' });
  check('T1 作废成功', voidRes.status === 200, voidRes.json);

  const apList = await get('/approvals');
  const apArr = Array.isArray(apList.data) ? apList.data : (apList.data && apList.data.items) || [];
  const apAfter = apArr.find((a) => a.id === apId);
  check('T1 作废后审批单被取消', !!apAfter && apAfter.status === 'cancelled', apAfter && apAfter.status);

  // ==================== T2 删除保护（pending_out 引用） ====================
  console.log('\n[T2] 删除保护（含待出库引用）');
  const code2 = `E2EB1-DEL-${stamp}`;
  const req2 = await post('/material-requests', {
    request_code: code2,
    request_title: 'E2E删除保护测试',
    applicant_name: 'E2E测试员',
    status: 'pending',
    approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 3, unit: testMat.unit || '个' }],
  });
  const req2Id = req2.data && (req2.data.id || req2.data.requestCode) || code2;
  created.requests.push(req2Id);

  const ex2 = await post('/material-executes', {
    code: `CK-E2EB1-${stamp}`,
    date: '2026-09-27',
    execute_status_class: 'pending_out',
    source_application_codes: [code2],
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 3, actualQuantity: 3, applicationCode: code2 }],
  });
  check('T2 建待出库单', ex2.status === 201 || ex2.status === 200, ex2.json);
  const ex2Id = ex2.data && ex2.data.id;
  if (ex2Id) created.executes.push(ex2Id);

  const del1 = await del('/material-requests/' + req2Id);
  check('T2 有待出库引用时删除被拦（400）', del1.status === 400, { status: del1.status, err: del1.json && del1.json.error });

  // 改为已取消 → 应可删除（残留引用自动清理）
  const cancelRes = await put('/material-executes/' + ex2Id, { execute_status_class: 'cancelled' });
  check('T2 出库单改已取消', cancelRes.status === 200, cancelRes.json);
  const del2 = await del('/material-requests/' + req2Id);
  check('T2 仅剩已取消引用时可删除', del2.status === 200, { status: del2.status, err: del2.json && del2.json.error });
  if (del2.status === 200) created.requests = created.requests.filter((x) => x !== req2Id);

  // ==================== T3 executions 状态口径 ====================
  console.log('\n[T3] executions 口径（待出库不计已领）');
  const code3 = `E2EB1-EXEC-${stamp}`;
  const req3 = await post('/material-requests', {
    request_code: code3,
    request_title: 'E2E口径测试',
    applicant_name: 'E2E测试员',
    status: 'approved',
    approval_status: 'approved',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 5, unit: testMat.unit || '个' }],
  });
  const req3Id = req3.data && (req3.data.id || req3.data.requestCode) || code3;
  created.requests.push(req3Id);

  const ex3 = await post('/material-executes', {
    code: `CK-E2EB1-EXEC-${stamp}`,
    date: '2026-09-27',
    execute_status_class: 'pending_out',
    source_application_codes: [code3],
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 5, actualQuantity: 5, applicationCode: code3 }],
  });
  const ex3Id = ex3.data && ex3.data.id;
  if (ex3Id) created.executes.push(ex3Id);

  const execRes = await get(`/material-requests/${req3Id}/executions`);
  const summary = execRes.data && execRes.data.summary && execRes.data.summary[0];
  check('T3 待出库不计入已领（dispatched=0）', !!summary && summary.dispatchedQuantity === 0, summary);
  check('T3 待出库计入待发料（pending=5）', !!summary && summary.pendingQuantity === 5, summary);
  check('T3 剩余量为 0（申请5-待发5）', !!summary && summary.remainingQuantity === 0, summary);

  // ==================== T4 结案 ====================
  console.log('\n[T4] 结案');
  const closeRes = await put('/material-requests/' + req3Id, { dispatch_status: 'closed' });
  check('T4 结案成功', closeRes.status === 200, closeRes.json);
  const badRes = await put('/material-requests/' + req3Id, { dispatch_status: 'partial' });
  check('T4 非 closed 值被拒（400）', badRes.status === 400, badRes.json);

  // ==================== T5 退料库存联动 ====================
  console.log('\n[T5] 退料库存联动');
  const qtyBefore = await materialQty(testMat.code);
  const retCode = `TL-E2EB1-${stamp}`;
  const ret = await post('/material-returns', {
    code: retCode,
    date: '2026-09-27',
    type: '生产退料',
    applicant: 'E2E退料员',
    status: '待审批',
    statusClass: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, returnQuantity: 3, unit: testMat.unit || '个', batchNo: '' }],
  });
  check('T5 建退料单', ret.status === 201 || ret.status === 200, ret.json);
  const retId = ret.data && ret.data.id;
  if (retId) created.returns.push(retId);

  const qtyAfter = await materialQty(testMat.code);
  check('T5 退料入库 +3', qtyAfter === qtyBefore + 3, { before: qtyBefore, after: qtyAfter });

  // 流水检查（响应经 camelCase 中间件，字段名兼容两种）
  const txRes = await get(`/inventory/transaction/${encodeURIComponent(testMat.code)}`);
  const txArr = Array.isArray(txRes.data) ? txRes.data : (Array.isArray(txRes.json) ? txRes.json : []);
  const returnTx = txArr.filter((t) => (t.transactionType || t.transaction_type) === 'material_return_in'
    && (t.businessCode || t.business_code) === retCode);
  check('T5 有 material_return_in 流水', returnTx.length > 0, { found: returnTx.length, total: txArr.length });

  const delRet = await del('/material-returns/' + retId);
  check('T5 删除退料单', delRet.status === 200, delRet.json);
  const qtyFinal = await materialQty(testMat.code);
  check('T5 删除退料回收库存（回到原值）', qtyFinal === qtyBefore, { before: qtyBefore, final: qtyFinal });
  if (delRet.status === 200) created.returns = created.returns.filter((x) => x !== retId);

  // ==================== 清理 ====================
  console.log('\n[清理]');
  for (const id of created.executes) { await del('/material-executes/' + id); }
  for (const id of created.requests) { await del('/material-requests/' + id); }
  for (const id of created.returns) { await del('/material-returns/' + id); }
  await del('/approvals/' + apId);
  console.log('  清理完成');

  console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
