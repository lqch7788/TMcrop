/**
 * 2026-09-27 批三修复 E2E 验证脚本
 * 覆盖：已完成单编辑（差额调库存）/ 0 数量行过滤 / 批量审批端点联动 / 统计口径（实发≠申请）
 * 用法：node scripts/e2e-batch3-fixes.cjs（后端需运行在 3001）
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

async function materialQty(code) {
  const list = await get('/materials');
  const arr = Array.isArray(list.data) ? list.data : [];
  const hit = arr.find((m) => m.code === code);
  return hit ? Number(hit.quantity) : null;
}

async function main() {
  const stamp = Date.now();
  console.log('=== 批三修复 E2E ===');

  const matsRes = await get('/materials');
  const mats = Array.isArray(matsRes.data) ? matsRes.data : [];
  const testMat = mats.filter((m) => Number(m.quantity) >= 20).sort((a, b) => Number(b.quantity) - Number(a.quantity))[0];
  if (!testMat) { console.log('!! 无可用测试物料'); process.exit(1); }
  const qtyBaseline = Number(testMat.quantity);
  console.log(`测试物料: ${testMat.code}（库存 ${qtyBaseline}）`);

  // ==================== T1 已完成单编辑（差额调库存） ====================
  console.log('\n[T1] 已完成单编辑差额调库存');
  const appCode = `E2EB3-EDIT-${stamp}`;
  const req = await post('/material-requests', {
    request_code: appCode, request_title: 'E2E批三', applicant_name: 'E2E测试员',
    status: 'approved', approval_status: 'approved',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 10, unit: testMat.unit || '个' }],
  });
  const reqId = req.data && (req.data.id || req.data.requestCode) || appCode;

  // 直接出库（completed）5 件
  const ex = await post('/material-executes', {
    code: `CK-E2EB3-${stamp}`, date: '2026-09-27',
    execute_status_class: 'completed',
    source_application_codes: [appCode],
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 10, actualQuantity: 5, applicationCode: appCode }],
  });
  const exId = ex.data && ex.data.id;
  const afterCreate = await materialQty(testMat.code);
  check('T1 建已完成单扣 5 件', afterCreate === qtyBaseline - 5, { before: qtyBaseline, after: afterCreate });

  // 编辑已完成单：数量 5 → 8（差额 -3）
  const editRes = await put('/material-executes/' + exId, {
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 10, actualQuantity: 8, applicationCode: appCode }],
  });
  check('T1 已完成单编辑被接受（不再 400）', editRes.status === 200, editRes.json);
  const afterEdit = await materialQty(testMat.code);
  check('T1 差额调整：库存再 -3', afterEdit === qtyBaseline - 8, { after: afterEdit });

  // 2026-09-27 新规则：已发料单禁删（DELETE 400）→ 先验证拦截，再用【作废】恢复库存
  const delBlocked = await del('/material-executes/' + exId);
  check('T1 已发料单删除被拦（400）', delBlocked.status === 400, delBlocked.json);
  await put('/material-executes/' + exId, { execute_status_class: 'cancelled', execute_status: '已取消', remarks: 'E2E清理' });
  const afterClean = await materialQty(testMat.code);
  check('T1 作废后库存回到基线', afterClean === qtyBaseline, { after: afterClean });
  await del('/material-requests/' + reqId);

  // ==================== T2 0 数量行过滤 ====================
  console.log('\n[T2] 0 数量行过滤');
  const appCode2 = `E2EB3-ZERO-${stamp}`;
  const zeroAll = await post('/material-requests', {
    request_code: appCode2, request_title: 'E2E零数量', applicant_name: 'E2E测试员',
    status: 'pending', approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 0, unit: '个' }],
  });
  check('T2 全部 0 数量被拒（400）', zeroAll.status === 400, zeroAll.json);

  const mixed = await post('/material-requests', {
    request_code: appCode2 + 'B', request_title: 'E2E混合', applicant_name: 'E2E测试员',
    status: 'pending', approval_status: 'pending',
    materials: [
      { materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 3, unit: '个' },
      { materialCode: testMat.code, materialName: '零行', requestedQuantity: 0, unit: '个' },
    ],
  });
  check('T2 混合单创建成功', mixed.status === 201 || mixed.status === 200, mixed.json);
  const mixedId = mixed.data && (mixed.data.id || mixed.data.requestCode);
  const mixedDetail = await get('/material-requests/' + mixedId);
  const mixedMats = (mixedDetail.data && mixedDetail.data.materials) || [];
  const matArr = typeof mixedMats === 'string' ? JSON.parse(mixedMats) : mixedMats;
  check('T2 0 数量行已被剔除（剩 1 行）', Array.isArray(matArr) && matArr.length === 1, { len: Array.isArray(matArr) ? matArr.length : -1 });
  if (mixedId) await del('/material-requests/' + mixedId);

  // ==================== T3 批量审批端点联动 ====================
  console.log('\n[T3] 批量审批端点联动回写');
  const appCode3 = `E2EB3-BATCH-${stamp}`;
  const req3 = await post('/material-requests', {
    request_code: appCode3, request_title: 'E2E批量审批', applicant_name: 'E2E测试员',
    status: 'pending', approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 2, unit: '个' }],
  });
  const req3Id = req3.data && (req3.data.id || req3.data.requestCode) || appCode3;
  const apId3 = `E2E-AP-BATCH-${stamp}`;
  await post('/approvals', {
    id: apId3, type: 'material_request', type_name: '领料申请', title: 'E2E批量审批单',
    applicant_name: 'E2E测试员', status: 'pending', current_step: 1, total_steps: 1,
    approvers: [{ userId: 'U-E2E', userName: 'E2E审批人', role: '审批人', order: 1, status: 'pending' }],
    records: [],
    business_link: { type: 'material', requestId: req3Id, requestCode: appCode3 },
  });
  const batchRes = await post('/approvals/batch-action', {
    approvalIds: [apId3], action: 'approve', approverId: 'U-E2E', approverName: 'E2E审批人',
  });
  check('T3 批量审批接口调用成功', batchRes.status === 200, batchRes.json);
  const req3Detail = await get('/material-requests/' + req3Id);
  const req3Status = req3Detail.data && (req3Detail.data.approvalStatus || req3Detail.data.approval_status);
  check('T3 批量审批后申请单状态回写为 approved', req3Status === 'approved', { status: req3Status });
  await del('/material-requests/' + req3Id);
  await del('/approvals/' + apId3);

  // ==================== T4 统计口径（实发≠申请） ====================
  console.log('\n[T4] 统计口径（实发量来自出库）');
  const statRes = await get('/material-statistics');
  check('T4 统计接口 200', statRes.status === 200);
  const ms = (statRes.data && statRes.data.materialStatistics) || [];
  check('T4 物料统计行存在', ms.length > 0, { len: ms.length });
  const hasActualField = ms.every((m) => m.actualQuantity !== undefined && m.actualAmount !== undefined);
  check('T4 返回实发量与实发金额字段', hasActualField);
  const anyDiff = ms.some((m) => Math.abs((m.actualQuantity || 0) - (m.totalQuantity || 0)) > 0.01);
  check('T4 存在实发≠申请的行（不再恒等）', anyDiff);

  console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
