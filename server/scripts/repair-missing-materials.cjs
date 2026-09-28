/**
 * 数据修复脚本：补建「被业务单据引用但主表缺失」的物料
 *
 * 背景（2026-09-28）：
 *   出库单/退料单的物料明细中引用了 materials 主表中不存在的物料编码，
 *   导致退料审批时 applyReturnStock 抛错（物料不存在）→ 联动失败 → 审批回滚 → 单据卡在待审批。
 *
 * 策略：
 *   1. 扫描 material_executes / material_returns 的物料明细，收集被引用的物料编码
 *   2. 与 materials 主表比对，找出缺失项
 *   3. 通过官方 API（POST /api/materials）补建，初始库存 0（退料入库时再累加）
 *      —— 不直接改 .db 文件（遵循项目规则）
 *
 * 用法：
 *   node server/scripts/repair-missing-materials.cjs           # 只检测（dry-run）
 *   node server/scripts/repair-missing-materials.cjs --apply   # 执行补建
 */
const BASE = 'http://localhost:3001/api';
const APPLY = process.argv.includes('--apply');

(async () => {
  console.log(`\n=== 缺失物料修复（${APPLY ? '执行模式' : '检测模式'}）===\n`);

  // 1. 现有物料
  const mats = await (await fetch(`${BASE}/materials?limit=500`)).json();
  const existing = new Set((Array.isArray(mats) ? mats : []).map(m => m.code));
  console.log(`主表现有物料：${existing.size} 条`);

  // 2. 收集业务单据引用的物料
  const refs = new Map();
  const execs = (await (await fetch(`${BASE}/material-executes?limit=300`)).json()).data || [];
  execs.forEach(e => (e.materials || []).forEach(m => {
    if (m.materialCode && !refs.has(m.materialCode)) {
      refs.set(m.materialCode, {
        name: m.materialName, unit: m.unit, price: m.unitPrice,
        location: m.warehousePosition, spec: m.spec, src: `出库单 ${e.code}`,
      });
    }
  }));
  const rets = (await (await fetch(`${BASE}/material-returns?limit=300`)).json()).data || [];
  rets.forEach(r => (r.materials || []).forEach(m => {
    if (m.materialCode && !refs.has(m.materialCode)) {
      refs.set(m.materialCode, {
        name: m.materialName, unit: m.unit, price: m.unitPrice,
        location: m.warehousePosition, spec: m.spec, src: `退料单 ${r.code}`,
      });
    }
  }));
  console.log(`业务单据引用物料：${refs.size} 个`);

  // 3. 找出缺失
  const missing = [...refs.entries()].filter(([code]) => !existing.has(code));
  console.log(`\n主表缺失：${missing.length} 个`);
  missing.forEach(([code, i]) => console.log(`  ${code} | ${i.name} | ${i.unit} | ${i.spec || '-'} | 来源: ${i.src}`));

  if (missing.length === 0) {
    console.log('\n✅ 无缺失，无需修复');
    return;
  }
  if (!APPLY) {
    console.log('\n（检测模式，未写入。加 --apply 执行补建）');
    return;
  }

  // 4. 补建（初始库存 0，退料入库时累加）
  console.log('\n=== 执行补建 ===');
  let ok = 0, fail = 0;
  for (const [code, info] of missing) {
    const res = await fetch(`${BASE}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name: info.name || code,
        unit: info.unit || '',
        specification: info.spec || '',
        quantity: 0,
        price: String(info.price || ''),
        location: info.location || '',
        dataStatus: '启用',
        remarks: '2026-09-28 数据修复：业务单据引用的缺失物料补建',
      }),
    });
    if (res.ok) { ok++; console.log(`  ✅ ${code} ${info.name}`); }
    else {
      fail++;
      const err = await res.json().catch(() => ({}));
      console.log(`  ❌ ${code}：${res.status} ${JSON.stringify(err.error || '').slice(0, 80)}`);
    }
  }
  console.log(`\n补建完成：成功 ${ok} / 失败 ${fail}`);
  if (fail > 0) console.log('⚠️ 存在失败项，请检查上述错误（未做静默跳过）');
})();
