/**
 * 数据修复脚本：回填「退料审批单」的物料明细字段
 *
 * 背景（2026-09-28）：
 *   早期版本的 submitReturnMaterialApproval 只提交 {name, quantity}，
 *   导致审批页「退料物料明细」展开后除名称/数量外其余列（来源领料单号、物料编码、
 *   分类、规格、单位、单价、小计、货位）全为空白。
 *   现已改为提交完整字段，但**历史审批单**需回填。
 *
 * 策略：
 *   以审批单 businessLink.requestId 找到对应退料单，用退料单的完整物料明细回填
 *   审批单的 businessLink.materials（展开行数据源）与顶级 materials（双保险）。
 *   通过官方 API（PUT /api/approvals/:id）更新，不直接改 .db。
 *
 * 用法：
 *   node server/scripts/repair-approval-return-materials.cjs           # 只检测
 *   node server/scripts/repair-approval-return-materials.cjs --apply   # 执行回填
 */
const BASE = 'http://localhost:3001/api';
const APPLY = process.argv.includes('--apply');

(async () => {
  console.log(`\n=== 退料审批单明细回填（${APPLY ? '执行模式' : '检测模式'}）===\n`);

  const approvals = (await (await fetch(`${BASE}/approvals?limit=500`)).json()).data || [];
  const returns = (await (await fetch(`${BASE}/material-returns?limit=300`)).json()).data || [];
  const retApprovals = approvals.filter(a => a.type === 'return_material');
  console.log(`退料审批单：${retApprovals.length} 条 | 退料单：${returns.length} 条\n`);

  let needFix = 0, noSource = 0, alreadyOk = 0;

  for (const a of retApprovals) {
    const ms = a.businessLink?.materials || [];
    const isComplete = ms.length > 0 && ms[0].materialCode !== undefined;
    if (isComplete) { alreadyOk++; console.log(`  ✅ ${a.code} 明细字段已完整`); continue; }

    const rid = a.businessLink?.requestId;
    const rcode = a.businessLink?.requestCode;
    const rec = returns.find(x => String(x.id) === String(rid) || String(x.code) === String(rcode));

    if (!rec) {
      noSource++;
      console.log(`  ⚠️ ${a.code}：找不到对应退料单（id=${rid} code=${rcode}）→ 无法回填，跳过`);
      continue;
    }

    const fullMats = (rec.materials || []).map(m => ({
      name: m.materialName || m.materialCode,
      quantity: Number(m.returnQuantity) || 0,
      materialCode: m.materialCode,
      spec: m.spec,
      unit: m.unit,
      unitPrice: Number(m.unitPrice) || 0,
      sourceApplicationCode: m.sourceApplicationCode,
      warehousePosition: m.warehousePosition,
      reason: m.reason,
    }));

    if (fullMats.length === 0) {
      noSource++;
      console.log(`  ⚠️ ${a.code}：退料单 ${rec.code} 无物料明细 → 跳过`);
      continue;
    }

    needFix++;
    console.log(`  🔧 ${a.code} ← 退料单 ${rec.code}（${fullMats.length} 条明细）`);

    if (!APPLY) continue;

    // 注意：PUT 的 approvers/records/attachments/related_task_ids 无 COALESCE，
    // 必须显式回传原值，否则会被置空
    const res = await fetch(`${BASE}/approvals/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessLink: { ...a.businessLink, materials: fullMats },
        materials: fullMats,
        approvers: a.approvers || [],
        records: a.records || [],
        attachments: a.attachments || [],
        relatedTaskIds: a.relatedTaskIds || [],
      }),
    });
    if (res.ok) console.log(`      ✅ 回填成功`);
    else {
      const err = await res.json().catch(() => ({}));
      console.log(`      ❌ 回填失败：${res.status} ${JSON.stringify(err.error || '').slice(0, 100)}`);
    }
  }

  console.log(`\n汇总：需回填 ${needFix} 条 | 已完整 ${alreadyOk} 条 | 无来源跳过 ${noSource} 条`);
  if (!APPLY && needFix > 0) console.log('（检测模式，未写入。加 --apply 执行回填）');
  if (noSource > 0) console.log('⚠️ 存在无来源项（多为退料单已删除的孤立测试审批单），已如实列出未静默跳过');
})();
