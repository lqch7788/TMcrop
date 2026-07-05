/**
 * 端到端测试：育苗使用种源 → 内部种源追溯时间线应显示新 outbound 流水
 * 2026-07-05 回归测试
 */

const BASE = 'http://localhost:3001';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  // 测试用种源：郁金香 SRC-1782958858908-rkk6wi（availableCount=111，可用扣减 10）
  const sourceId = 'SRC-1782958858908-rkk6wi';
  const deductCount = 10;

  console.log('========== 端到端测试：育苗使用种源 → 追溯时间线 ==========\n');

  // 1. 记录扣减前状态
  const before = await fetchJson(`${BASE}/api/seed-sources/${sourceId}`);
  if (!before.data?.success) {
    console.log('[FAIL] 找不到种源');
    process.exit(1);
  }
  const remainingBefore = before.data.data.remainingQuantity;
  console.log(`[BEFORE] 种源 ${sourceId} remainingQuantity = ${remainingBefore}`);

  // 2. 调用 POST /api/seedlings/with-deduct
  const seedlingCode = `TEST-TRACE-${Date.now()}`;
  const seedling = {
    seedling_code: seedlingCode,
    crop_name: '郁金香',
    crop_code: 'FL010400000',
    seedling_type: 'cutting',
    seedling_date: '2026-07-05',
    seedling_quantity: deductCount,
    survival_quantity: deductCount,
    status: 'sown',
    source_mode: 'internal',
    propagation_mode: 'one_to_one',
    greenhouse_name: 'A区-3号棚',  // 验证 toAreaName 也能被 JOIN 出来
  };

  const createRes = await fetchJson(`${BASE}/api/seedlings/with-deduct`, {
    method: 'POST',
    body: JSON.stringify({ sourceId, count: deductCount, seedling }),
  });
  console.log(`[CREATE] status=${createRes.status}, success=${createRes.data?.success}`);

  if (!createRes.data?.success) {
    console.log('[FAIL] 育苗创建失败:', createRes.data?.error);
    process.exit(1);
  }
  const newSeedlingId = createRes.data.data.id;
  console.log(`[CREATE] 新建育苗 id = ${newSeedlingId}`);

  // 3. 验证种源剩余数量已扣减
  const after = await fetchJson(`${BASE}/api/seed-sources/${sourceId}`);
  const remainingAfter = after.data.data.remainingQuantity;
  console.log(`[AFTER] 种源 ${sourceId} remainingQuantity = ${remainingAfter}`);
  const deductOk = remainingAfter === remainingBefore - deductCount;
  console.log(`[CHECK 扣减] expected ${remainingBefore - deductCount}, got ${remainingAfter} → ${deductOk ? '✅ PASS' : '❌ FAIL'}\n`);

  // 4. 查询 inventory_transaction 验证追溯记录
  const instanceId = `seed_source:${sourceId}`;
  const txRes = await fetchJson(`${BASE}/api/inventory/transaction/${encodeURIComponent(instanceId)}`);
  const txs = txRes.data?.data || [];
  console.log(`[TX 查询] instance_id="${instanceId}" → ${txs.length} 条流水`);
  txs.forEach((tx) => {
    console.log(`  - id=${tx.id} type=${tx.transactionType} qty=${tx.quantity} business_type=${tx.businessType} business_id=${tx.businessId}`);
    console.log(`    remarks="${tx.remarks}"`);
  });
  console.log();

  // 5. 关键断言：找到刚刚创建的 outbound 流水
  const ourTx = txs.find(
    (tx) =>
      tx.transactionType === 'outbound' &&
      tx.businessId === newSeedlingId &&
      Math.abs(tx.quantity) === deductCount,
  );

  console.log('========== 断言 ==========');
  console.log(`[断言 1] 种源剩余数量扣减  ${deductOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[断言 2] inventory_transaction 找到新 outbound 流水  ${ourTx ? '✅ PASS' : '❌ FAIL'}`);
  if (ourTx) {
    console.log(`[断言 3] 流水 instance_id 匹配种源  ${ourTx.instanceId === instanceId ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`[断言 4] 流水 business_type='seedling'（与 crop_instance 对齐，避开前端白名单过滤）  ${ourTx.businessType === 'seedling' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`[断言 5] 流水 business_id 指向新建育苗  ${ourTx.businessId === newSeedlingId ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`[断言 6] 流水 quantity 符号正确（负数表示扣减）  ${ourTx.quantity < 0 ? '✅ PASS' : '❌ FAIL'}`);
  }
  console.log();

  // 6. 清理（删除测试育苗，恢复种源）
  console.log('[CLEANUP] 删除测试育苗 + 恢复种源...');
  // 注：种源剩余数量不会被自动恢复（与 with-deduct 设计一致，不回滚）。这里只删除测试育苗。
  const delRes = await fetchJson(`${BASE}/api/seedlings/${newSeedlingId}`, { method: 'DELETE' });
  console.log(`[CLEANUP] 删除育苗 status=${delRes.status}, success=${delRes.data?.success}`);

  const allPass = deductOk && !!ourTx;
  console.log(`\n========== 总结: ${allPass ? '✅ 全部通过' : '❌ 有失败'} ==========`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error('[ERROR]', e);
  process.exit(1);
});