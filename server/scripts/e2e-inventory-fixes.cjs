/**
 * 2026-09-27 物料库存全链路修复 E2E 验证
 * 覆盖批1/批2/批3 修复项：
 *  T1 入库事务 + material_inbound 库存流水（此前入库不写流水）
 *  T2 编辑已完成入库单数量 → 库存差额调整（旧回收+新入账）
 *  T3 已完成入库单删除 → 400 拒绝（此前直接删不回收库存）
 *  T4 状态回退 completed→pending → 库存回收 + material_reverse_inbound 流水
 *  T5 非完成态入库单删除 → 成功
 *  T6 退料批次解析：FEFO 显示串恢复真实批次（不新建脏批次行）
 *  T7 统计接口退料量字段（returnedQuantity/netQuantity + 月度 returned_quantity）
 * 用法：node scripts/e2e-inventory-fixes.cjs（后端需运行在 3001）
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

/** 读物料主表数量 */
async function materialQty(code) {
  const list = await get('/materials');
  const arr = Array.isArray(list.data) ? list.data : [];
  const hit = arr.find((m) => m.code === code);
  return hit ? Number(hit.quantity) : null;
}

/** 读物料批次账（batch_inventory） */
async function batchRows(code) {
  const r = await get(`/materials/batches/${encodeURIComponent(code)}`);
  return Array.isArray(r.data) ? r.data : [];
}

/** 读库存流水 */
async function txList(code) {
  const r = await get(`/inventory/transaction/${encodeURIComponent(code)}`);
  return Array.isArray(r.data) ? r.data : [];
}

async function main() {
  const stamp = Date.now();
  const prefix = `E2EINV-${stamp}`;
  console.log('=== 物料库存全链路修复 E2E ===');

  // 选一个库存充足的测试物料
  const matsRes = await get('/materials');
  const mats = Array.isArray(matsRes.data) ? matsRes.data : [];
  const testMat = mats.filter((m) => Number(m.quantity) >= 50).sort((a, b) => Number(b.quantity) - Number(a.quantity))[0];
  if (!testMat) { console.log('!! 无可用测试物料'); process.exit(1); }
  const code = testMat.code;
  const qtyBaseline = Number(testMat.quantity);
  const mainBaseline = await materialQty(code);
  const batchesBefore = await batchRows(code);
  console.log(`测试物料: ${code}（主表 ${mainBaseline}，批次行 ${batchesBefore.length} 条）`);

  // ==================== T1 入库事务 + 流水 ====================
  console.log('\n[T1] 入库（completed）→ 主表/批次账/流水三路同步');
  const inboundCode = `${prefix}-IN`;
  const t1 = await post('/materials/inbound', {
    code: inboundCode,
    inboundDate: '2026-09-27',
    supplier: 'E2E供应商',
    operator: 'E2E测试员',
    status: 'completed',
    materials: [{ code, name: testMat.name, unit: testMat.unit || '袋', quantity: 10, batchNo: '' }],
  });
  check('入库接口 201', t1.status === 201, t1);
  const afterInbound = await materialQty(code);
  check(`主表 +10（${mainBaseline} → ${afterInbound}）`, afterInbound === mainBaseline + 10, afterInbound);
  const txs1 = await txList(code);
  const inboundTx = txs1.filter((t) => t.transactionType === 'material_inbound' && String(t.businessCode) === inboundCode);
  check('material_inbound 流水已写入（含操作人）', inboundTx.length > 0 && String(inboundTx[0].operatorName) === 'E2E测试员', inboundTx[0]);
  const batchesAfter1 = await batchRows(code);
  // 注意：camelCase 响应中间件已把 batch_no → batchNo、remaining_quantity → remainingQuantity
  check('批次账新增承接行（默认批次 +10）', batchesAfter1.some((b) => (b.batchNo || b.batch_no) === '默认批次' && Number(b.remainingQuantity ?? b.remaining_quantity) >= 10), batchesAfter1);
  const inboundId = t1.data && (t1.data.id !== undefined ? t1.data.id : (t1.json && t1.json.id));

  // ==================== T2 编辑已完成入库单数量 ====================
  console.log('\n[T2] 编辑已完成入库单（数量 10→15）→ 差额调整');
  const t2 = await put(`/materials/inbound/${inboundId}`, {
    materials: [{ code, name: testMat.name, unit: testMat.unit || '袋', quantity: 15, batchNo: '' }],
  });
  const afterEdit = await materialQty(code);
  check('主表净差额 +5（回收 10 再入 15）', afterEdit === mainBaseline + 15, { afterEdit, expect: mainBaseline + 15 });

  // ==================== T3 已完成入库单禁删 ====================
  console.log('\n[T3] 已完成入库单删除 → 400');
  const t3 = await del(`/materials/inbound/${inboundId}`);
  check('删除被拒绝（400）', t3.status === 400, t3);
  const afterT3 = await materialQty(code);
  check('库存未被变动', afterT3 === mainBaseline + 15, afterT3);

  // ==================== T4 状态回退 → 库存回收 ====================
  console.log('\n[T4] 状态回退 completed→pending → 回收库存 + 反向流水');
  const t4 = await put(`/materials/inbound/${inboundId}`, { status: 'pending' });
  const afterT4 = await materialQty(code);
  check('库存回收到基线', afterT4 === mainBaseline, { afterT4, mainBaseline });
  const txs4 = await txList(code);
  const reverseTx = txs4.filter((t) => t.transactionType === 'material_reverse_inbound' && String(t.businessCode) === inboundCode);
  check('material_reverse_inbound 流水已写入', reverseTx.length > 0, reverseTx[0]);

  // ==================== T5 非完成态删除 ====================
  console.log('\n[T5] 非完成态入库单删除 → 成功');
  const t5 = await del(`/materials/inbound/${inboundId}`);
  check('删除成功', t5.status === 200, t5);
  const afterT5 = await materialQty(code);
  check('库存保持基线', afterT5 === mainBaseline, afterT5);

  // ==================== T6 退料批次解析 ====================
  console.log('\n[T6] 退料带 FEFO 显示串 → 恢复真实批次（不建脏批次行）');
  // 找一个剩余量 > 0 的真实批次（camelCase 中间件转换后的键名）
  const realBatch = (await batchRows(code)).find((b) => Number(b.remainingQuantity ?? b.remaining_quantity) > 0);
  if (realBatch) {
    const batchNo = realBatch.batchNo || realBatch.batch_no;
    const beforeRemain = Number(realBatch.remainingQuantity ?? realBatch.remaining_quantity);
    // 构造显示串：真实批次(3)，退料量 3
    const displayStr = `${batchNo}(${3}${testMat.unit || ''})`;
    const returnCode = `${prefix}-RT`;
    const t6 = await post('/material-returns', {
      id: returnCode,
      code: returnCode,
      date: '2026-09-27',
      applicant: 'E2E退料员',
      status: '已审批',
      statusClass: 'approved',
      materials: [{
        sourceApplicationCode: 'E2E-SRC', materialCode: code, materialName: testMat.name,
        unit: testMat.unit || '袋', returnQuantity: 3, batchNo: displayStr,
      }],
    });
    check('退料单创建 201', t6.status === 201, t6);
    const afterReturn = await materialQty(code);
    check(`主表 +3（${mainBaseline} → ${afterReturn}）`, afterReturn === mainBaseline + 3, afterReturn);
    const batchesAfter6 = await batchRows(code);
    const targetBatch = batchesAfter6.find((b) => (b.batchNo || b.batch_no) === batchNo);
    check(`真实批次余量 +3（${beforeRemain} → ${targetBatch ? (targetBatch.remainingQuantity ?? targetBatch.remaining_quantity) : '?'}）`,
      targetBatch && Number(targetBatch.remainingQuantity ?? targetBatch.remaining_quantity) === beforeRemain + 3, { batchNo, beforeRemain, targetBatch });
    const dirtyBatch = batchesAfter6.find((b) => String(b.batchNo || b.batch_no).includes('('));
    check('无脏批次行（批次号含显示串括号）', !dirtyBatch, dirtyBatch);
    // 撤销：删除有效态退料单 → undo 回收
    const t6d = await del(`/material-returns/${returnCode}`);
    const afterT6d = await materialQty(code);
    check(`删除退料单后库存回基线（${mainBaseline}）`, afterT6d === mainBaseline, afterT6d);
  } else {
    console.log('  ! 跳过：该物料无剩余批次行');
  }

  // ==================== T7 统计接口退料字段 ====================
  console.log('\n[T7] 统计接口退料量字段');
  const stats = await get('/material-statistics');
  // camelCase 中间件：material_statistics → materialStatistics
  const matStats = Array.isArray(stats.data?.materialStatistics ?? stats.data?.material_statistics)
    ? (stats.data?.materialStatistics ?? stats.data?.material_statistics) : [];
  const hit = matStats.find((m) => m.materialCode === code || m.material_code === code);
  if (hit) {
    check('物料统计行含 returnedQuantity', 'returnedQuantity' in hit || 'returned_quantity' in hit, hit);
    check('物料统计行含 netQuantity', 'netQuantity' in hit || 'net_quantity' in hit, hit);
  } else {
    console.log('  ! 该物料不在统计中（无申请单记录），仅验证字段名定义');
    const sample = matStats[0];
    check('统计行字段含 returnedQuantity（样本）', sample && ('returnedQuantity' in sample || 'returned_quantity' in sample), sample);
    check('统计行字段含 netQuantity（样本）', sample && ('netQuantity' in sample || 'net_quantity' in sample), sample);
  }
  const monthly = Array.isArray(stats.data?.monthlyStatistics ?? stats.data?.monthly_statistics)
    ? (stats.data?.monthlyStatistics ?? stats.data?.monthly_statistics) : [];
  const mSample = monthly[0];
  check('月度统计含 returnedQuantity', mSample && ('returnedQuantity' in mSample || 'returned_quantity' in mSample), mSample);

  // ==================== 汇总 ====================
  const finalQty = await materialQty(code);
  console.log(`\n=== 结果: ${passed} 通过 / ${failed} 失败 ===`);
  console.log(`库存基线校验: 起始 ${mainBaseline} → 结束 ${finalQty} ${finalQty === mainBaseline ? '（一致 ✓）' : '（不一致 ✗）'}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error('E2E 执行异常:', e); process.exit(1); });
