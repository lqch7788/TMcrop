/**
 * 供应商资质证照合规规则（2026-09-28 批次B 合规风控）
 *
 * 农业投入品经营受法规强监管：卖农药须持《农药经营许可证》、经营种子须备案、
 * 肥料须登记。采购方若从不持证的供应商进货，属于合规风险（假劣农资无法追溯）。
 *
 * 规则为**纯查表**（品类码 → 证照种类），不做任何模糊判断。
 * 前端 `src/components/supplier/qualification.ts` 是同一规则的展示侧副本
 * （前后端跨进程边界无法共享模块，与本文件保持同口径，改动需同步）。
 */
import { formatLocalDateISO } from '../utils/dateUtil';

/** 证照种类 */
export type QualificationKind = 'pesticide' | 'seed' | 'fertilizer';

/**
 * 合规状态
 * - not_required：该品类不强制持证
 * - missing：需持证但证号/有效期未登记（视为不合规）
 * - expired：已过期
 * - expiring：有效但将在 EXPIRING_WINDOW_DAYS 天内到期
 * - valid：有效
 */
export type QualificationStatus = 'not_required' | 'missing' | 'expired' | 'expiring' | 'valid';

/** 到期预警窗口（天）：距有效期止 ≤ 该天数即进入"即将到期" */
export const EXPIRING_WINDOW_DAYS = 30;

/** 证照中文名 */
export const QUALIFICATION_LABELS: Record<QualificationKind, string> = {
  pesticide: '农药经营许可证',
  seed: '种子经营备案',
  fertilizer: '肥料登记证',
};

/**
 * 强制持证品类 → 证照种类
 * 键为 suppliers.supplier_type（与材料分类表 rule_type='supplier' 的大类码一致）
 */
export const REQUIRED_QUALIFICATION_BY_TYPE: Record<string, QualificationKind> = {
  PP: 'pesticide',   // 农药与植保产品类
  SP: 'seed',        // 种子与种苗类
  FE: 'fertilizer',  // 肥料与土壤改良类
};

/** 证照种类 → DB 列名 */
export const QUALIFICATION_FIELDS: Record<QualificationKind, { no: string; expiry: string }> = {
  pesticide: { no: 'pesticide_license_no', expiry: 'pesticide_license_expiry' },
  seed: { no: 'seed_filing_no', expiry: 'seed_filing_expiry' },
  fertilizer: { no: 'fertilizer_reg_no', expiry: 'fertilizer_reg_expiry' },
};

export interface QualificationEvaluation {
  kind: QualificationKind;
  /** 证照中文名，如「农药经营许可证」 */
  label: string;
  status: QualificationStatus;
  /** 已登记的证号（未登记为空串） */
  no: string;
  /** 有效期至 YYYY-MM-DD（未登记为空串） */
  expiry: string;
  /** 距到期天数（负数=已逾期）；无有效期时 null */
  daysLeft: number | null;
}

/**
 * 计算 expiry 距今天数（负数=已过期）；日期非法返回 null
 * 用本地日期做基准，避免 UTC 与东八区跨日差（项目 2026-06-09 时区事故教训）
 */
export function daysUntil(expiry: string, today: string = formatLocalDateISO()): number | null {
  const e = String(expiry || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) return null;
  const expiryMs = Date.parse(`${e}T00:00:00`);
  const todayMs = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(expiryMs) || Number.isNaN(todayMs)) return null;
  return Math.round((expiryMs - todayMs) / 86400000);
}

/**
 * 评估一个供应商的资质合规状态
 * @param row suppliers 表行（snake_case 列名）
 * @returns 不需要持证时 status 为 not_required；否则返回对应证照的评估结果
 */
export function evaluateSupplierQualification(
  row: Record<string, unknown>,
  today: string = formatLocalDateISO()
): QualificationEvaluation {
  const typeCode = String(row?.supplier_type ?? '').trim().toUpperCase();
  const kind = REQUIRED_QUALIFICATION_BY_TYPE[typeCode];
  if (!kind) {
    return { kind: 'pesticide', label: '', status: 'not_required', no: '', expiry: '', daysLeft: null };
  }
  const fields = QUALIFICATION_FIELDS[kind];
  const no = String(row?.[fields.no] ?? '').trim();
  const expiry = String(row?.[fields.expiry] ?? '').trim();

  // 证号与有效期任一缺失 → 未完成登记，视为不合规
  if (!no || !expiry) {
    return { kind, label: QUALIFICATION_LABELS[kind], status: 'missing', no, expiry, daysLeft: null };
  }

  const left = daysUntil(expiry, today);
  if (left === null) {
    // 有效期格式非法同样按未合规处理（Fail Loud：不静默当作有效）
    return { kind, label: QUALIFICATION_LABELS[kind], status: 'missing', no, expiry, daysLeft: null };
  }
  if (left < 0) return { kind, label: QUALIFICATION_LABELS[kind], status: 'expired', no, expiry, daysLeft: left };
  if (left <= EXPIRING_WINDOW_DAYS) return { kind, label: QUALIFICATION_LABELS[kind], status: 'expiring', no, expiry, daysLeft: left };
  return { kind, label: QUALIFICATION_LABELS[kind], status: 'valid', no, expiry, daysLeft: left };
}

/**
 * 采购环节是否应拦截该供应商
 *
 * @returns null = 放行；string = 拦截原因（硬阻断）或告警文案（软告警），由调用方按开关决定语义
 *
 * 硬阻断仅针对「未登记」与「已过期」；「即将到期」仍属有效，只告警不拦截。
 */
export function getQualificationIssue(
  row: Record<string, unknown>,
  today: string = formatLocalDateISO()
): string | null {
  const ev = evaluateSupplierQualification(row, today);
  if (ev.status === 'missing') {
    // 文案不带主语：调用方会自行拼「供应商「X」……」或「该供应商……」，
    // 带主语会拼出「供应商「X」该供应商未登记…」的病句
    return !ev.no ? `未登记${ev.label}` : `${ev.label}未登记有效期`;
  }
  if (ev.status === 'expired') {
    return `${ev.label}已于 ${ev.expiry} 过期（逾期 ${Math.abs(ev.daysLeft ?? 0)} 天）`;
  }
  if (ev.status === 'expiring') {
    return `${ev.label}将于 ${ev.expiry} 到期（剩余 ${ev.daysLeft} 天）`;
  }
  return null;
}

/** 该问题是否构成硬阻断（"即将到期"不阻断） */
export function isBlockingIssue(row: Record<string, unknown>, today: string = formatLocalDateISO()): boolean {
  const s = evaluateSupplierQualification(row, today).status;
  return s === 'missing' || s === 'expired';
}

/**
 * 硬阻断开关（默认关闭 = 仅告警）
 *
 * 存量供应商大多未登记证照，直接硬阻断会让采购流程整体不可用，
 * 故默认只告警；数据补齐后设置 SUPPLIER_QUALIFICATION_ENFORCE=1 收紧为硬阻断。
 */
export function isQualificationEnforced(): boolean {
  return process.env.SUPPLIER_QUALIFICATION_ENFORCE === '1';
}

/**
 * 采购类写端点的硬阻断守卫
 *
 * @param db 数据库句柄
 * @param supplierId 请求体里的供应商 id（为空则不校验——未选供应商不属于本守卫范围）
 * @returns null = 放行；string = 应拒绝的原因
 *
 * 开关关闭时直接放行（默认仅前端告警）；供应商 id 查不到记录时放行，
 * 由调用方原有的"供应商不存在"逻辑处理，避免本守卫吞掉别的错误语义。
 */
export function assertSupplierQualificationAllowed(db: any, supplierId: unknown): string | null {
  if (!isQualificationEnforced()) return null;
  const id = String(supplierId ?? '').trim();
  if (!id) return null;
  try {
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (!row || Object.keys(row).length === 0) return null;
    if (!isBlockingIssue(row as Record<string, unknown>)) return null;
    const name = String((row as Record<string, unknown>).supplier_name ?? id);
    return `供应商「${name}」${getQualificationIssue(row as Record<string, unknown>)}，按合规要求不能建立采购业务（如已补录证照请刷新后重试）`;
  } catch {
    // 表/列缺失（历史环境）时不阻断业务
    return null;
  }
}
