/**
 * 2026-09-27：领料出库「两步出库」+ 数据安全修复 E2E 验证
 * 覆盖：待出库建单不扣库存 / 确认发料扣库存 / 编辑状态感知 / 删除状态感知 / 超发拦截
 * 运行：node server/scripts/e2e-execute-two-step.cjs
 */
const BASE = 'http://localhost:3001/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const get = (p) => fetch(`${BASE}${p}`).then(j);
const post = (p, b) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);
const put = (p, b) => fetch(`${BASE}${p}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);
const del = (p) => fetch(`${BASE}${p}`, { method: 'DELETE' }).then(j);

let pass = 0, fail = 0;
const check = (n, c, e = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n} ${e}`); } };

const stockOf = async (code) => {
  const r = await get('/materials');
  const list = Array.isArray(r) ? r : (r.data || []);
  const m = (Array.isArray(list) ? list : []).find((x) => x.code === code);
  return m ? Number(m.quantity) : null;
};

(async () => {
  const TEST_CODE = 'PH0101001'; // 塑料周转箱（库存 150）
  const baseStock = await stockOf(TEST_CODE);
  console.log(`基线库存 ${TEST_CODE} = ${baseStock}`);

  console.log('\n=== ① 两步出库：待出库建单不扣库存 ===');
  const r1 = await post('/material-executes', {
    date: '2026-09-27', applicant: 'E2E两步', source_application_codes: '[]',
    execute_status_class: 'pending_out',
    materials: JSON.stringify([{ materialCode: TEST_CODE, materialName: '塑料周转箱', unit: '个', requestedQuantity: 5, unitPrice: 38, actualQuantity: 5 }]),
  });
  check('创建待出库单', r1.success, r1.error || '');
  const execId = r1.data?.id;
  check('单号已生成', /^CK\d{11}$/.test(r1.data?.code || ''), r1.data?.code);
  const afterCreate = await stockOf(TEST_CODE);
  check('待出库单不扣库存', afterCreate === baseStock, `${afterCreate} vs ${baseStock}`);

  console.log('\n=== ② 确认发料：扣库存 + 状态变更 ===');
  const r2 = await post(`/material-executes/${execId}/confirm`, {});
  check('确认发料成功', r2.success, r2.error || '');
  check('状态变为已出库', r2.data?.executeStatusClass === 'completed', r2.data?.executeStatusClass);
  const afterConfirm = await stockOf(TEST_CODE);
  check('库存已扣减 5', afterConfirm === baseStock - 5, `${afterConfirm} vs ${baseStock - 5}`);

  console.log('\n=== ③ 重复确认应被拒 ===');
  const r3 = await post(`/material-executes/${execId}/confirm`, {});
  check('已发料单据再次确认被拒', r3.success === false, r3.error || '');

  console.log('\n=== ④ 作废已发料单：恢复库存 + 单据保留（2026-09-27 审计方案：已发料禁删） ===');
  const r4blocked = await del(`/material-executes/${execId}`);
  check('已发料单删除被拦（400 引导作废）', r4blocked.success === false, r4blocked.error || '');
  const r4 = await put(`/material-executes/${execId}`, { execute_status_class: 'cancelled', execute_status: '已取消', remarks: '作废：E2E' });
  check('作废成功', r4.success, r4.error || '');
  const afterDel = await stockOf(TEST_CODE);
  check('库存恢复', afterDel === baseStock, `${afterDel} vs ${baseStock}`);
  const kept = await get(`/material-executes/${execId}`);
  check('作废后单据仍可查（追溯保留）', kept.success === true && !!kept.data, kept.error || '');

  console.log('\n=== ⑤ 待出库单删除：不凭空增库存 ===');
  const r5a = await post('/material-executes', {
    date: '2026-09-27', applicant: 'E2E两步', source_application_codes: '[]',
    execute_status_class: 'pending_out',
    materials: JSON.stringify([{ materialCode: TEST_CODE, materialName: '塑料周转箱', unit: '个', requestedQuantity: 3, unitPrice: 38, actualQuantity: 3 }]),
  });
  const r5b = await del(`/material-executes/${r5a.data.id}`);
  const afterDel2 = await stockOf(TEST_CODE);
  check('待出库单删除后库存不变', afterDel2 === baseStock, `${afterDel2} vs ${baseStock}`);

  console.log('\n=== ⑥ 超发拦截 ===');
  const r6 = await post('/material-executes', {
    date: '2026-09-27', applicant: 'E2E超发', source_application_codes: '[]',
    execute_status_class: 'completed',
    materials: JSON.stringify([{ materialCode: TEST_CODE, requestedQuantity: 5, actualQuantity: 99 }]),
  });
  check('超发被拒（实发99 > 申请5）', r6.success === false && /超发|超过/.test(r6.error || ''), r6.error || '');

  console.log('\n=== ⑦ 编辑待出库单不触发库存变化 ===');
  const r7a = await post('/material-executes', {
    date: '2026-09-27', applicant: 'E2E编辑', source_application_codes: '[]',
    execute_status_class: 'pending_out',
    materials: JSON.stringify([{ materialCode: TEST_CODE, requestedQuantity: 4, actualQuantity: 4 }]),
  });
  const beforeEdit = await stockOf(TEST_CODE);
  const r7b = await put(`/material-executes/${r7a.data.id}`, { materials: [{ materialCode: TEST_CODE, requestedQuantity: 6, actualQuantity: 6 }] });
  const afterEdit = await stockOf(TEST_CODE);
  check('编辑待出库单成功', r7b.success, r7b.error || '');
  check('编辑待出库单库存不变（未扣过账）', afterEdit === beforeEdit, `${afterEdit} vs ${beforeEdit}`);

  console.log('\n=== ⑧ 待出库 → 已出库（编辑升级状态）：扣库存 ===');
  const r8 = await put(`/material-executes/${r7a.data.id}`, { execute_status_class: 'completed', execute_status: '已出库', materials: [{ materialCode: TEST_CODE, requestedQuantity: 6, actualQuantity: 6 }] });
  const afterUpgrade = await stockOf(TEST_CODE);
  check('状态升级成功', r8.success, r8.error || '');
  check('库存扣减 6', afterUpgrade === beforeEdit - 6, `${afterUpgrade} vs ${beforeEdit - 6}`);

  console.log('\n=== 清理 ===');
  // r7a 单已被 ⑧ 升级为已发料（completed）→ 新规则禁删，改用【作废】恢复库存
  await put(`/material-executes/${r7a.data.id}`, { execute_status_class: 'cancelled', execute_status: '已取消', remarks: '作废：E2E清理' });
  const finalStock = await stockOf(TEST_CODE);
  check('清理（作废）后库存回到基线', finalStock === baseStock, `${finalStock} vs ${baseStock}`);

  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail > 0 ? 1 : 0);
})();
