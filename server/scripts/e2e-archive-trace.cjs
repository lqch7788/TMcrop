/**
 * 2026-09-27 删除追溯方案 E2E 验证
 * 覆盖：已发料单禁删（400）/ 作废（库存恢复+单据保留）/ 待出库单删除归档 /
 *       申请单删除归档 / 归档按单号追溯查询（快照完整）
 * 用法：node scripts/e2e-archive-trace.cjs（后端需运行在 3001）
 *
 * 说明：归档表按审计原则不可经 API 删除，测试产生的归档记录（前缀 E2EARC）
 * 由 cleanup-e2e-residue.cjs 直连清理（停服执行）。
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
  const prefix = `E2EARC-${stamp}`;
  console.log('=== 删除追溯方案 E2E ===');

  const matsRes = await get('/materials');
  const mats = Array.isArray(matsRes.data) ? matsRes.data : [];
  const testMat = mats.filter((m) => Number(m.quantity) >= 20).sort((a, b) => Number(b.quantity) - Number(a.quantity))[0];
  if (!testMat) { console.log('!! 无可用测试物料'); process.exit(1); }
  const qtyBaseline = Number(testMat.quantity);
  console.log(`测试物料: ${testMat.code}（库存 ${qtyBaseline}）`);

  // ==================== T1 已发料单禁止删除 ====================
  console.log('\n[T1] 已发料单禁止物理删除');
  const app1 = `${prefix}-APP1`;
  // 2026-09-27：申请单以 pending 状态建——后端建出库单不校验申请状态（状态过滤只在出库建单弹窗前端做），
  // 而 pending 单清理时可按 API 删除，避免"approved 禁删"导致测试单残留
  const req1 = await post('/material-requests', {
    request_code: app1, request_title: 'E2E归档', applicant_name: 'E2E测试员',
    status: 'pending', approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 10, unit: testMat.unit || '个' }],
  });
  const req1Id = req1.data && (req1.data.id || req1.data.requestCode) || app1;

  const ex1 = await post('/material-executes', {
    code: `${prefix}-CK1`, date: '2026-09-27', execute_status_class: 'completed',
    source_application_codes: [app1],
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 10, actualQuantity: 5, applicationCode: app1 }],
  });
  const ex1Id = ex1.data && ex1.data.id;
  const afterCreate = await materialQty(testMat.code);
  check('T1 建已完成单扣 5', afterCreate === qtyBaseline - 5, { after: afterCreate });

  const delBlocked = await del('/material-executes/' + ex1Id);
  check('T1 已发料单 DELETE 被拦（400 引导作废）', delBlocked.status === 400 && String(delBlocked.json?.error || '').includes('作废'), delBlocked.json);

  // ==================== T2 作废（库存恢复 + 单据保留） ====================
  console.log('\n[T2] 作废：库存恢复 + 单据保留可查');
  const voidRes = await put('/material-executes/' + ex1Id, {
    execute_status_class: 'cancelled', execute_status: '已取消', remarks: '作废：E2E 验证',
  });
  check('T2 作废成功', voidRes.status === 200, voidRes.json);
  const afterVoid = await materialQty(testMat.code);
  check('T2 库存已恢复至基线', afterVoid === qtyBaseline, { after: afterVoid });

  const detail = await get('/material-executes/' + ex1Id);
  check('T2 作废后单据仍存在（可查）', detail.status === 200
    && (detail.data?.executeStatusClass === 'cancelled' || detail.data?.execute_status_class === 'cancelled'), detail.data && detail.data.executeStatusClass);

  // ==================== T3 待出库单删除 → 归档 ====================
  console.log('\n[T3] 待出库单删除：归档快照可追溯');
  const exCode3 = `${prefix}-CK3`;
  const ex3 = await post('/material-executes', {
    code: exCode3, date: '2026-09-27', execute_status_class: 'pending_out',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, unit: testMat.unit || '个', requestedQuantity: 3, actualQuantity: 3 }],
  });
  const ex3Id = ex3.data && ex3.data.id;
  const delRes = await del(`/material-executes/${ex3Id}?reason=${encodeURIComponent('E2E 归档验证-出库')}`);
  check('T3 待出库单删除成功且已归档', delRes.status === 200 && delRes.data?.archived === true, delRes.json);

  const archRes = await get(`/deleted-documents?code=${encodeURIComponent(exCode3)}`);
  const archRows = Array.isArray(archRes.data) ? archRes.data : [];
  check('T3 归档按单号可查到', archRows.length === 1, { found: archRows.length });
  if (archRows.length > 0) {
    const a = archRows[0];
    check('T3 归档含完整快照（物料明细）', Array.isArray(a.snapshot?.materials) && a.snapshot.materials.length === 1, a.snapshot && typeof a.snapshot);
    check('T3 归档含删除原因', a.reason === 'E2E 归档验证-出库', a.reason);
    check('T3 归档含删除时间', !!a.deletedAt, a.deletedAt);
  }

  // ==================== T4 申请单删除 → 归档 ====================
  console.log('\n[T4] 申请单删除：归档快照可追溯');
  const app4 = `${prefix}-APP4`;
  const req4 = await post('/material-requests', {
    request_code: app4, request_title: 'E2E归档-申请', applicant_name: 'E2E存档员',
    status: 'pending', approval_status: 'pending',
    materials: [{ materialCode: testMat.code, materialName: testMat.name, requestedQuantity: 2, unit: testMat.unit || '个' }],
  });
  const req4Id = req4.data && (req4.data.id || req4.data.requestCode);
  const delReq = await del(`/material-requests/${req4Id}?reason=${encodeURIComponent('E2E 归档验证-申请')}`);
  check('T4 申请单删除成功且已归档', delReq.status === 200 && delReq.data?.archived === true, delReq.json);

  const archRes2 = await get(`/deleted-documents?code=${encodeURIComponent(app4)}&type=material_request`);
  const archRows2 = Array.isArray(archRes2.data) ? archRes2.data : [];
  check('T4 申请单归档可查到', archRows2.length === 1, { found: archRows2.length });
  if (archRows2.length > 0) {
    const a = archRows2[0];
    const snapMats = Array.isArray(a.snapshot?.materials) ? a.snapshot.materials
      : (typeof a.snapshot?.materials === 'string' ? JSON.parse(a.snapshot.materials) : []);
    check('T4 归档含物料明细', snapMats.length === 1, { mats: snapMats.length });
    // 响应经 camelCase 中间件深度转换，快照键兼容蛇形/驼峰两种
    const applicantVal = String(a.snapshot?.applicantName || a.snapshot?.applicant_name || '');
    check('T4 归档含申请人', applicantVal === 'E2E存档员', applicantVal);
    check('T4 归档含删除原因', a.reason === 'E2E 归档验证-申请', a.reason);
  }

  // ==================== T5 类型筛选 ====================
  console.log('\n[T5] 归档查询类型筛选');
  const typed = await get(`/deleted-documents?type=material_execute&code=${encodeURIComponent(prefix)}`);
  const typedRows = Array.isArray(typed.data) ? typed.data : [];
  check('T5 类型筛选仅返回出库单归档', typedRows.length === 1 && typedRows[0].docType === 'material_execute', { n: typedRows.length });

  // ==================== 清理（可删的实体；作废单/归档按审计原则保留） ====================
  console.log('\n[清理]');
  // 作废单 ex1 保留（审计原则：作废单据本体保留）——带 E2E 前缀可辨识
  await del('/material-requests/' + req1Id); // 申请1 已作废关联？——其关联出库单已 cancelled，残留引用会被自动清理
  console.log(`  说明：作废单 ${prefix}-CK1 与 2 条归档记录按审计原则保留（前缀可辨识，cleanup 工具可清）`);

  console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
