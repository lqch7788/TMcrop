/**
 * 物料入库单 → 库存联动（2026-09-27 抽取）
 *
 * 两条路径共用同一套"生效/回收"逻辑，避免行为漂移：
 * 1. PUT /api/materials/inbound/:id —— 人工改状态（pending→completed）或改明细后重新入账
 * 2. 审批通过/驳回联动（routes/approvalLinkage.ts）—— 待审核单审批通过后自动入账
 *
 * 约定：所有函数在调用方事务内运行，均不调用 saveDatabase（落盘由调用方 COMMIT 后统一执行）。
 */
import * as materialsDb from '../db/materials';
import { upsertBatchInventory } from '../db/batchInventory';
import { writeStockTransaction } from '../routes/materialExecute';
import { nowLocalTimestamp } from '../lib/timeUtils';
import { generateApprovalCode } from '../lib/approvalCode';

/** 解析入库单明细（兼容双重 JSON 编码与旧字段名 materialCode/code 由各使用点自行兜底） */
export function parseInboundMaterials(raw: unknown): any[] {
  let cur: unknown = raw;
  for (let i = 0; i < 3 && typeof cur === 'string'; i++) {
    try { cur = JSON.parse(cur as string); } catch { return []; }
  }
  return Array.isArray(cur) ? cur : [];
}

export interface InboundStockParams {
  inboundId: string | number;
  inboundCode: string;
  materials: any[];
  operatorName: string;
  /** 单头供应商兜底（明细无 supplier 时用于新建物料主数据） */
  fallbackSupplier?: string;
}

/**
 * 入库单生效：主表累加（含字段覆盖规则，见 syncInboundToMaterials）
 * + 批次账 upsert + 写 material_inbound 流水（含变动前后余额）。
 * 调用方负责幂等（不要把已生效的单重复调用）。
 */
export function applyInboundStock(db: any, params: InboundStockParams): void {
  const { inboundId, inboundCode, operatorName, fallbackSupplier } = params;

  // 2026-09-27 修复：历史入库单 JSON 可能只有旧键 materialCode（无 code）——
  // db 层 syncInboundToMaterials/upsertBatchInventory 严格读 code，会静默跳过（流水却照写 → 账实脱节）。
  // 统一在此规范化为 code 键，再交给下游（路由层出口的兼容转换到不了 db 层）。
  const materials = params.materials.map((m) => ({
    ...m,
    code: String(m.code || m.materialCode || '').trim(),
  }));

  // 流水余额：入库前主表余量（按 code 取单行）
  const beforeMap = new Map<string, number>();
  for (const m of materials) {
    const code = String(m.code || m.materialCode || '').trim();
    if (!code || beforeMap.has(code)) continue;
    const r = db.exec('SELECT quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    beforeMap.set(code, r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0);
  }

  materialsDb.syncInboundToMaterials(materials, { persist: false, fallbackSupplier });
  upsertBatchInventory(materials, Number(inboundId));

  let seq = 0;
  for (const m of materials) {
    const code = String(m.code || m.materialCode || '').trim();
    const qty = Number(m.quantity) || 0;
    if (!code || qty <= 0) continue;
    writeStockTransaction(db, ++seq, 'material_inbound', inboundId, inboundCode, code, qty, {
      operatorName,
      balanceBefore: beforeMap.get(code) ?? 0,
      balanceAfter: (beforeMap.get(code) ?? 0) + qty,
      remark: `物料入库 ${inboundCode}｜入库人 ${operatorName}`,
      businessType: 'material_inbound',
    });
  }
}

/**
 * 待审核入库单 → 创建审批记录（同事务内调用，不落盘）
 *
 * 审批页（/material-approval）"物料入库" tab 读 approvals.type='material_inbound'；
 * business_link 指向 inbound_records.id，审批通过后由 approvalLinkage 回写入库单并加库存。
 */
export function createMaterialInboundApproval(db: any, params: {
  inboundId: string | number;
  inboundCode: string;
  materials: any[];
  operator?: string;
  supplier?: string;
}): string {
  const { inboundId, inboundCode, materials, operator, supplier } = params;
  const now = new Date().toISOString();
  const id = `approval_mi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const approvalCode = generateApprovalCode('AP');
  const totalQty = materials.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const detailText = materials
    .map((m) => `${m.code || m.materialCode || '?'}×${m.quantity || 0}`)
    .join('、');
  const businessLink = JSON.stringify({
    type: 'material_inbound',
    requestId: String(inboundId),
    requestCode: inboundCode,
  });

  db.run(`
    INSERT INTO approvals (
      id, code, type, type_name, category, title, description,
      applicant_id, applicant_name, applicant_department,
      apply_date, apply_time, current_step, total_steps,
      status, priority, due_date, business_link, attachments,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    approvalCode,
    'material_inbound',
    '物料入库',
    'business',
    `物料入库审批：${inboundCode}（${materials.length} 种物料，合计 ${totalQty}）`,
    `供应商：${supplier || '-'}｜明细：${detailText}`,
    '',
    String(operator || '').trim() || '仓库',
    '',
    now.split('T')[0],
    now.split('T')[1].split('.')[0],
    1,
    1,
    'pending',
    'normal',
    null,
    businessLink,
    null,
    now,
    now,
  ]);
  return approvalCode;
}

/**
 * 审批结果回写入库单（2026-09-27 新增，替换 approvalLinkage 的幽灵 inventory 路径）
 *
 * - approved                → status='completed' + 生效库存（applyInboundStock）
 * - rejected/cancelled/...  → status='voided'（原为 completed 时防御性回收库存）
 *
 * 事务与落盘由调用方（审批 action 路由）管理。
 */
export function applyMaterialInboundApproval(
  db: any,
  requestId: string,
  status: string,
): { success: boolean; message: string } {
  const rows = db.exec('SELECT id, code, supplier, operator, status, materials FROM inbound_records WHERE id = ?', [Number(requestId)]);
  if (!rows.length || !rows[0].values.length) {
    return { success: false, message: `入库单 ${requestId} 不存在` };
  }
  const [id, code, supplier, operator, oldStatus, materialsJson] = rows[0].values[0] as any[];
  const matList = parseInboundMaterials(materialsJson);
  const operatorName = String(operator || '').trim() || '仓库';

  if (status === 'approved') {
    if (oldStatus === 'completed') {
      // 幂等：重复审批不应重复入账
      return { success: true, message: '入库单已是完成状态（跳过重复入账）' };
    }
    db.run("UPDATE inbound_records SET status = 'completed' WHERE id = ?", [id]);
    if (matList.length > 0) {
      applyInboundStock(db, {
        inboundId: id,
        inboundCode: String(code || ''),
        materials: matList,
        operatorName,
        fallbackSupplier: String(supplier || ''),
      });
    }
    return { success: true, message: '物料入库审批通过：入库单已完成并计入库存' };
  }

  // 驳回 / 取消 / 部分通过 → 作废
  if (oldStatus === 'completed') {
    // 防御：已完成单若被审批驳回（理论不入审批流），先回收库存再作废
    reverseInboundStock(db, matList, id, String(code || ''), operatorName);
  }
  db.run("UPDATE inbound_records SET status = 'voided' WHERE id = ?", [id]);
  return { success: true, message: '物料入库审批未通过：入库单已作废' };
}

/**
 * 入库单回收（撤销/驳回/改明细重入账前）：
 * - 主表按 code 锁定单行回收（防同 code 多行连坐）
 * - 批次账按 (code, batchNo) 回收；批次余量不足 → 抛错回滚（fail loud）
 * - 写 material_reverse_inbound 流水（操作人/余额/备注可追溯）
 */
export function reverseInboundStock(
  db: any,
  materials: any[],
  inboundId: string | number,
  inboundCode: string,
  operatorName: string
): void {
  const now = nowLocalTimestamp();
  let seq = 0;
  // 与 applyInboundStock 同口径：兼容旧键 materialCode
  for (const raw of materials) {
    const m = { ...raw, code: String(raw.code || raw.materialCode || '').trim() };
    const code = m.code;
    const qty = Number(m.quantity) || 0;
    if (!code || qty <= 0) continue;
    // 批次号与 upsertBatchInventory 同口径（空 → 默认批次）
    const batchNo = String(m.batchNo || '').trim() || '默认批次';

    // 主表回收（按 code 锁定单行）
    const mainRows = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    if (mainRows.length > 0 && mainRows[0].values.length > 0) {
      const mainId = mainRows[0].values[0][0];
      const mainQty = Number(mainRows[0].values[0][1]) || 0;
      if (mainQty < qty) {
        throw new Error(`物料 ${code} 当前库存 ${mainQty} 不足以回收入库量 ${qty}（库存已被后续使用），无法撤销入库`);
      }
      db.run('UPDATE materials SET quantity = quantity - ?, lastUpdateTime = ? WHERE id = ?', [qty, now, mainId]);
    }

    // 批次账回收（按 code + batchNo 匹配；未命中显式告警而非静默）
    // total_quantity 与 remaining 同步扣回（与 upsertBatchInventory 累加对称）
    const batchRows = db.exec('SELECT id, remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?', [code, batchNo]);
    if (batchRows.length > 0 && batchRows[0].values.length > 0) {
      const batchId = batchRows[0].values[0][0];
      const batchRemain = Number(batchRows[0].values[0][1]) || 0;
      if (batchRemain < qty) {
        throw new Error(`物料 ${code} 批次 ${batchNo} 余量 ${batchRemain} 不足以回收入库量 ${qty}`);
      }
      db.run(
        'UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, total_quantity = total_quantity - ?, update_time = ? WHERE id = ?',
        [qty, qty, now, batchId]
      );
    } else {
      console.warn(`[物料入库] 回收批次未命中：物料 ${code} 批次 ${batchNo}（入库单 ${inboundCode}）`);
    }

    writeStockTransaction(db, ++seq, 'material_reverse_inbound', inboundId, inboundCode, code, qty, {
      operatorName,
      remark: `入库单撤销回收 ${inboundCode}`,
      businessType: 'material_inbound',
    });
  }
}
