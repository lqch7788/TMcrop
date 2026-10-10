/**
 * 免审批资格判定（2026-09-29 审计新增，服务端权威判定）
 *
 * 背景（P1-2）：此前"免审批自动通过"完全由前端驱动 —— 前端算完级别后，
 * 以**申请人自己的身份**调 PATCH /approvals/:id/action 把单据批掉。
 * 后果有两个：
 *   ① 自审自批无法禁止（一禁就把免审批流程一起禁掉，系统不可用）；
 *   ② 客户端可伪造"免审批"，只要绕过前端就能把任意单据直接批掉。
 *
 * 本模块提供**服务端独立复核**：审批人以申请人身份操作时，只有该单据确实符合
 * 免审批规则（类型免审 / 金额低于阈值）才放行，否则拒绝并要求他人审批。
 *
 * 判定口径与前端 `resolveApprovalLevel` 保持一致（forceExempt / forceStrict / 金额阈值），
 * 但**只覆盖免审批这一档**，不移植完整分级逻辑（避免影响采购/生产/技术方案等其他类型的级别）。
 */
import { getDatabase } from '../db';

/** 默认免审批金额上限（system_configs 缺该键时的兜底，与 seedData 一致） */
const DEFAULT_EXEMPT_MAX = 1000;

/**
 * 与金额无关的审批类型（2026-10-10 修复）——这些类型提交时 amount 恒为 0，
 * 若允许走入"金额 < 阈值 → 免审批"规则会导致"提交即自动通过"（实测事故：
 * 任务派发单 SP20261010RW475 创建后 61ms 被自动批准）。
 * 名单与前端 src/config/approvalHierarchy.ts 的 forcedLevel=STANDARD 配置保持一致。
 */
const NON_AMOUNT_DRIVEN_TYPES = new Set([
  'task_dispatch',
  'task_change',
  'inspection_issue',
  'issue_resolve',
  'seedling_plan',
]);

export interface ExemptVerdict {
  /** 是否具备免审批资格（即以申请人身份自动通过） */
  eligible: boolean;
  /** 判定依据（写入审批记录备注/错误文案） */
  reason: string;
}

/**
 * 读取免审批金额上限（system_configs.approval.threshold.exempt-max）
 * 配置缺失/非法时回落 DEFAULT_EXEMPT_MAX
 */
export function getExemptMaxAmount(db: any = getDatabase()): number {
  try {
    const stmt = db.prepare("SELECT config_value FROM system_configs WHERE config_key = 'approval.threshold.exempt-max'");
    stmt.bind([]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    const v = Number((row as { config_value?: unknown } | null)?.config_value);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_EXEMPT_MAX;
  } catch {
    return DEFAULT_EXEMPT_MAX; // 表缺失（历史环境）→ 兜底阈值
  }
}

/** 读取某审批类型的规则（force_exempt / force_strict） */
function getTypeRule(db: any, type: string): { forceExempt: boolean; forceStrict: boolean } {
  try {
    const stmt = db.prepare('SELECT force_exempt, force_strict FROM approval_type_rules WHERE approval_type = ?');
    stmt.bind([type]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (!row) return { forceExempt: false, forceStrict: false }; // 未配置 → 不强制
    return {
      forceExempt: Number((row as { force_exempt?: unknown }).force_exempt) === 1,
      forceStrict: Number((row as { force_strict?: unknown }).force_strict) === 1,
    };
  } catch {
    return { forceExempt: false, forceStrict: false };
  }
}

/**
 * 判定一张审批单是否具备免审批资格
 *
 * 规则（按优先级）：
 *   1. 类型 force_strict=1          → 不具备（强制严格审批，任何金额都要人工）
 *   2. 类型 force_exempt=1          → 具备（强制免审）
 *   3. 金额未知（缺失/非数字/负数）  → **不具备**（无从判定金额不得免审，fail-closed）
 *   4. 金额 < 免审批上限            → 具备
 *   5. 其余                         → 不具备
 *
 * 注意：金额为 0 视为"低于阈值"→ 具备（退料单历史数据单价为 0 时仍可走免审批，
 * 与现有生产行为一致；金额缺失/非法则拒绝，不给伪造留口子）。
 *
 * @param approvalRow approvals 表行（需含 type / amount）
 */
export function evaluateExemptEligibility(db: any, approvalRow: Record<string, unknown>): ExemptVerdict {
  const type = String(approvalRow?.type ?? '').trim();
  const rule = getTypeRule(db, type);
  if (rule.forceStrict) {
    return { eligible: false, reason: `审批类型「${type}」为强制严格审批，不允许免审批自动通过` };
  }
  if (rule.forceExempt) {
    return { eligible: true, reason: `审批类型「${type}」配置为强制免审批` };
  }
  // 2026-10-10：与金额无关的类型不走金额免审批（提交时 amount=0 会被误判为"低于阈值"→ 自动通过）
  if (NON_AMOUNT_DRIVEN_TYPES.has(type)) {
    return { eligible: false, reason: `审批类型「${type}」与金额无关，不适用金额免审批规则（需人工审批）` };
  }
  const raw = approvalRow?.amount;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { eligible: false, reason: '单据金额缺失，无法判定免审批资格（需他人审批）' };
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { eligible: false, reason: `单据金额非法（${String(raw)}），无法判定免审批资格（需他人审批）` };
  }
  const max = getExemptMaxAmount(db);
  if (amount < max) {
    return { eligible: true, reason: `金额 ${amount} 低于免审批上限 ${max}` };
  }
  return { eligible: false, reason: `金额 ${amount} 已达免审批上限 ${max}，需他人审批` };
}

/**
 * 从业务单据回填审批单金额（服务端权威口径，不信客户端传值）
 *
 * 2026-09-29：领料申请此前完全不传 amount → 金额分级对该业务线彻底失效。
 * 前端已补传，但服务端仍按 businessLink 回查一次业务表，避免客户端漏传/伪造。
 *
 * @returns 回填到的金额；无法回填时返回 null（调用方保持原值）
 */
export function resolveBusinessAmount(db: any, businessLink: { type?: string; requestId?: string } | null): number | null {
  const type = String(businessLink?.type ?? '').trim();
  const requestId = String(businessLink?.requestId ?? '').trim();
  if (!type || !requestId) return null;
  try {
    if (type === 'material') {
      const stmt = db.prepare('SELECT total_amount FROM material_requests WHERE id = ? OR request_code = ?');
      stmt.bind([requestId, requestId]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      const v = Number((row as { total_amount?: unknown } | null)?.total_amount);
      return Number.isFinite(v) ? v : null;
    }
    if (type === 'return') {
      // 退料单无金额列，按明细汇总 returnQuantity × unitPrice
      const stmt = db.prepare('SELECT materials FROM material_returns WHERE id = ? OR code = ?');
      stmt.bind([requestId, requestId]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      if (!row) return null;
      let raw: unknown = (row as { materials?: unknown }).materials;
      for (let i = 0; i < 3 && typeof raw === 'string'; i++) {
        try { raw = JSON.parse(raw as string); } catch { return null; }
      }
      if (!Array.isArray(raw)) return null;
      let sum = 0;
      for (const m of raw as Array<{ returnQuantity?: number; quantity?: number; unitPrice?: number }>) {
        const qty = Number(m?.returnQuantity ?? m?.quantity ?? 0) || 0;
        const price = Number(m?.unitPrice ?? 0) || 0;
        sum += qty * price;
      }
      return sum;
    }
  } catch {
    return null; // 表缺失/字段缺失（历史环境）→ 不回填
  }
  return null;
}
