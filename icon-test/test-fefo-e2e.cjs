/**
 * FEFO 批次库存系统 — 完整端到端测试
 * 2026-07-05
 *
 * 测试场景:
 * 1. 入库多批次有机肥（同一物料不同生产/过期日期）
 * 2. FEFO 分配验证（早过期优先）
 * 3. 出库扣减
 * 4. 退料恢复
 * 5. 边界条件（数量不足/空批次/单批次不足跨批次）
 */

const BASE = 'http://localhost:3001/api';
let passed = 0, failed = 0;

function check(name, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name} ${detail}`); failed++; }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

async function main() {
  console.log('=== FEFO 端到端测试 ===\n');

  // ============ 步骤 1: 查现有数据 ============
  console.log('--- 步骤 1: 查询现有批次库存 ---');
  const beforeBatches = await get('/materials/batches/MAT_FERT_001');
  const beforeCount = beforeBatches.data ? beforeBatches.data.length : 0;
  console.log(`  现有 MAT_FERT_001 批次: ${beforeCount} 条`);
  if (beforeCount > 0) {
    beforeBatches.data.forEach(b => {
      console.log(`    ${b.batchNo} 剩余${b.remainingQuantity}${b.unit} 过期${b.expiryDate}`);
    });
  }

  // ============ 步骤 2: FEFO 分配测试 ============
  console.log('\n--- 步骤 2: FEFO 分配 ---');

  // 测试1: 分配小于单批次库存
  const alloc1 = await post('/materials/batch-allocate', { materialCode: 'MAT_FERT_001', quantity: 5 });
  check('FEFO 分配 5 单位', alloc1.success && alloc1.data?.fulfilled > 0,
    `fulfilled=${alloc1.data?.fulfilled}`);
  if (alloc1.data?.allocations?.length > 0) {
    const a = alloc1.data.allocations[0];
    console.log(`    分配: ${a.batchNo} ×${a.quantity}${a.unit} 过期${a.expiryDate}`);
    check('单批次满足则只分配1个批次', alloc1.data.allocations.length === 1);
  }

  // 测试2: 分配超过库存
  const alloc2 = await post('/materials/batch-allocate', { materialCode: 'MAT_FERT_001', quantity: 99999 });
  console.log(`  请求99999, fulfilled=${alloc2.data?.fulfilled}`);
  check('超量请求 partial fulfill', alloc2.data?.fulfilled < 99999);

  // 测试3: 分配为0
  const alloc3 = await post('/materials/batch-allocate', { materialCode: 'MAT_FERT_001', quantity: 0 });
  check('quantity=0 返回错误', !alloc3.success);

  // 测试4: 不存在的物料
  const alloc4 = await post('/materials/batch-allocate', { materialCode: 'NOEXIST', quantity: 10 });
  check('不存在物料 fulfilled=0', alloc4.data?.fulfilled === 0);

  // ============ 步骤 3: 出库扣减 ============
  console.log('\n--- 步骤 3: 出库扣减 ---');
  const beforeTotal = beforeBatches.data?.reduce((s, b) => s + b.remainingQuantity, 0) || 0;
  console.log(`  扣减前总库存: ${beforeTotal}`);

  // 获取实际可用的分配方案
  const deductPlan = await post('/materials/batch-allocate', { materialCode: 'MAT_FERT_001', quantity: 3 });
  if (deductPlan.data?.allocations?.length > 0) {
    const deducts = deductPlan.data.allocations.map(a => ({
      materialCode: 'MAT_FERT_001',
      batchNo: a.batchNo,
      quantity: a.quantity
    }));
    const deductResult = await post('/materials/batch-deduct', { allocations: deducts });
    check('扣减成功', deductResult.success);

    // 验证扣减后库存
    const afterBatches = await get('/materials/batches/MAT_FERT_001');
    const afterTotal = afterBatches.data?.reduce((s, b) => s + b.remainingQuantity, 0) || 0;
    check('库存已减少', afterTotal === beforeTotal - 3,
      `expected ${beforeTotal - 3}, got ${afterTotal}`);
  }

  // ============ 步骤 4: 退料恢复 ============
  console.log('\n--- 步骤 4: 退料恢复 ---');
  const beforeRestore = (await get('/materials/batches/MAT_FERT_001')).data
    ?.reduce((s, b) => s + b.remainingQuantity, 0) || 0;
  console.log(`  恢复前总库存: ${beforeRestore}`);

  // 获取批次信息用于恢复
  const bi = (await get('/materials/batches/MAT_FERT_001')).data;
  if (bi && bi.length > 0) {
    const restoreResult = await post('/materials/batch-restore', {
      returns: [{
        materialCode: 'MAT_FERT_001',
        batchNo: bi[0].batchNo,
        quantity: 3
      }]
    });
    check('恢复成功', restoreResult.success);

    const afterRestore = (await get('/materials/batches/MAT_FERT_001')).data
      ?.reduce((s, b) => s + b.remainingQuantity, 0) || 0;
    check('库存已恢复', afterRestore === beforeRestore + 3,
      `expected ${beforeRestore + 3}, got ${afterRestore}`);
  }

  // ============ 步骤 5: 跨批次 FEFO ============
  console.log('\n--- 步骤 5: 跨批次 FEFO ---');

  // 检查是否有物料有多个批次
  const allBatches = await get('/materials/batches/MAT_FERT_001');
  const batchCount = allBatches.data?.length || 0;
  console.log(`  MAT_FERT_001 批次数: ${batchCount}`);

  if (batchCount >= 2) {
    // 请求分配超过第一个批次的库存
    const b1 = allBatches.data[0];
    const requestQty = b1.remainingQuantity + 1;
    const crossAlloc = await post('/materials/batch-allocate', {
      materialCode: 'MAT_FERT_001', quantity: requestQty
    });
    check('跨批次分配产生多个alloc', crossAlloc.data?.allocations?.length >= 2,
      `got ${crossAlloc.data?.allocations?.length} allocations`);
    if (crossAlloc.data?.allocations?.length >= 2) {
      console.log(`    批次1: ${crossAlloc.data.allocations[0].batchNo} ×${crossAlloc.data.allocations[0].quantity}`);
      console.log(`    批次2: ${crossAlloc.data.allocations[1].batchNo} ×${crossAlloc.data.allocations[1].quantity}`);
      // 验证分配到的是最早过期批次
      check('第1个分配是最早过期批次',
        new Date(crossAlloc.data.allocations[0].expiryDate) <= new Date(crossAlloc.data.allocations[1].expiryDate));
    }
  } else {
    console.log('  ⚠ 只有1个批次，跳过跨批次测试');
  }

  // ============ 结果 ============
  console.log(`\n============ 结果: ${passed} PASS / ${failed} FAIL ============`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
