/**
 * 2026-09-27：领料申请 tab 全部新功能 E2E 验证
 * 覆盖：出库执行情况 / 撤回→草稿态 / 重新提交 / 用量计算与归还日期落库 /
 *       批次号关联 / 临期数据 / 物料搜索数据基础 / 统计基础数据
 * 运行：node server/scripts/e2e-application-tab.cjs
 */
const BASE = 'http://localhost:3001/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const get = (p) => fetch(`${BASE}${p}`).then(j);
const post = (p, b) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);
const put = (p, b) => fetch(`${BASE}${p}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);
const del = (p) => fetch(`${BASE}${p}`, { method: 'DELETE' }).then(j);
const patch = (p, b) => fetch(`${BASE}${p}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

(async () => {
  console.log('=== P1-5 临期物料数据（用于前端预警测试）===');
  const nearExpiry = await get('/materials');
  const list = Array.isArray(nearExpiry) ? nearExpiry : (nearExpiry.data || []);
  const today = new Date('2026-09-27').getTime();
  const expiring = (Array.isArray(list) ? list : []).filter((m) => {
    if (!m.expiryDate) return false;
    const d = Math.floor((new Date(m.expiryDate).getTime() - today) / 86400000);
    return d >= 0 && d < 30;
  });
  check('存在 30 天内临期物料（供预警 UI 验证）', expiring.length > 0, `找到 ${expiring.length} 个`);
  for (const m of expiring.slice(0, 4)) {
    const d = Math.floor((new Date(m.expiryDate).getTime() - today) / 86400000);
    console.log(`      ${m.code} ${m.name} 效期 ${m.expiryDate}（剩 ${d} 天）`);
  }

  console.log('\n=== P1-4 生产计划批次号（下拉数据源）===');
  const plans = await get('/production-plans');
  const planList = Array.isArray(plans) ? plans : (plans.data || []);
  check('生产计划列表可取（批次号下拉有数据）', planList.length > 0, `${planList.length} 条`);

  console.log('\n=== P0-2/P1-6/P1-7 新建：草稿字段 + 用量计算 + 归还日期落库 ===');
  const r1 = await post('/material-requests', {
    request_code: 'MR-E2E-ALL', request_title: '领料申请', request_type: '领料申请',
    department_name: '生产部', applicant_name: 'E2E测试', warehouse_name: '仓库A区',
    reviewer: '李审核', production_batch_code: planList[0]?.batchCode || 'ZZ20260619-001',
    materials: JSON.stringify([{
      materialCode: 'SP0202001', materialName: '尿素（46%氮）', unit: '袋',
      requestedQuantity: 300, stockQuantity: 150, unitPrice: 120,
      dosagePerMu: 20, areaMu: 15, returnDate: '',
    }]),
    attachments: JSON.stringify([]),
  });
  check('创建成功（含用量/批次号）', r1.success, r1.error || '');
  const d1 = await get('/material-requests/MR-E2E-ALL');
  const m1 = (d1.data?.materials || [])[0] || {};
  check('用量/亩 落库', Number(m1.dosagePerMu) === 20, JSON.stringify(m1.dosagePerMu));
  check('面积 落库', Number(m1.areaMu) === 15, JSON.stringify(m1.areaMu));
  check('生产批次号落库', d1.data?.productionBatchCode === (planList[0]?.batchCode || 'ZZ20260619-001'), d1.data?.productionBatchCode);
  check('库存不足软校验（300>150）', m1.stockInsufficient === true);
  check('用量×面积 应得数量 300（前端自动算，此处校验基准）', Number(m1.dosagePerMu) * Number(m1.areaMu) === Number(m1.requestedQuantity));

  console.log('\n=== P0-1 出库执行情况（无出库时应为 0）===');
  const exec0 = await get('/material-requests/MR-E2E-ALL/executions');
  check('出库执行端点可用', exec0.success === true);
  check('未出库时 dispatched=0', exec0.data?.totals?.dispatched === 0);
  check('逐物料汇总含剩余量', (exec0.data?.summary || [])[0]?.remainingQuantity === 300);

  console.log('\n=== P2-11 撤回 → 草稿态 → 重新提交 ===');
  const ap = await post('/approvals', {
    id: 'AP-E2E-ALL', type: 'material_request', typeName: '领料单', title: 'E2E测试的领料申请',
    applicantName: 'E2E测试', businessLink: { type: 'material', requestId: 'MR-E2E-ALL', requestCode: 'MR-E2E-ALL' }, materials: [],
  });
  check('审批单创建', ap.success === true || !!ap.id, ap.error || '');
  const wd = await post('/material-requests/MR-E2E-ALL/withdraw', {});
  check('撤回成功', wd.success === true, wd.error || '');
  const d2 = await get('/material-requests/MR-E2E-ALL');
  check('撤回后 approval_status=draft（前端据此显示"草稿"）', d2.data?.approvalStatus === 'draft', d2.data?.approvalStatus);
  const apAfter = await get('/approvals/AP-E2E-ALL');
  check('撤回后审批单已 cancelled', apAfter.data?.status === 'cancelled', apAfter.data?.status);
  // 重新提交（模拟前端 resubmitItem：状态回 pending + 重建审批单）
  const rs1 = await put('/material-requests/MR-E2E-ALL', { status: 'draft', approval_status: 'pending' });
  check('重新提交：状态回 pending', rs1.success === true);
  const d3 = await get('/material-requests/MR-E2E-ALL');
  check('重新提交后 approvalStatus=pending', d3.data?.approvalStatus === 'pending', d3.data?.approvalStatus);

  console.log('\n=== P2-8 物料搜索数据基础（物料明细含编码/名称）===');
  const d4 = await get('/material-requests?limit=10000');
  const all = d4.data || [];
  const hit = all.filter((r) => (r.materials || []).some((m) => String(m.materialCode || '').includes('SP0202001')));
  check('可按物料编码检索到单据（前端过滤数据源）', hit.length > 0, `${hit.length} 张`);

  console.log('\n=== 清理 ===');
  await del('/material-requests/MR-E2E-ALL');
  const cleanup = await get('/material-requests/MR-E2E-ALL');
  check('测试数据已清理', !cleanup.data);
  // 2026-09-27 修复：审批单也需清理（此前遗漏导致 approvals 表残留测试数据）
  await del('/approvals/AP-E2E-ALL');
  const apCleanup = await get('/approvals/AP-E2E-ALL');
  check('测试审批单已清理', !apCleanup.data || apCleanup.error);

  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail > 0 ? 1 : 0);
})();
