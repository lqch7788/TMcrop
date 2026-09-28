/**
 * 供应商资质证照规则 — 前端展示侧（2026-09-28 批次B 合规风控）
 *
 * ⚠️ 与后端 `server/src/lib/supplierQualification.ts` 是同一套规则的副本。
 * 前后端跨进程边界无法共享模块（前端不能 import server/src），
 * 两处口径必须一致：品类→证照映射、预警窗口、状态判定、文案。
 * 改动其一时必须同步另一处。
 *
 * 法规依据：经营农药须持《农药经营许可证》、经营种子须备案、肥料须登记。
 * 采购方从不持证供应商进货属合规风险（假劣农资无法追溯）。
 */
import { todayLocal } from '@/lib/dateUtils';

/** 证照种类 */
export type QualificationKind = 'pesticide' | 'seed' | 'fertilizer';

/**
 * 合规状态
 * - not_required：该品类不强制持证
 * - missing：需持证但证号/有效期未登记（不合规）
 * - expired：已过期
 * - expiring：有效但将在 EXPIRING_WINDOW_DAYS 天内到期
 * - valid：有效
 */
export type QualificationStatus = 'not_required' | 'missing' | 'expired' | 'expiring' | 'valid';

/** 到期预警窗口（天）——与后端一致 */
export const EXPIRING_WINDOW_DAYS = 30;

/** 证照中文名 */
export const QUALIFICATION_LABELS: Record<QualificationKind, string> = {
  pesticide: '农药经营许可证',
  seed: '种子经营备案',
  fertilizer: '肥料登记证',
};

/** 强制持证品类 → 证照种类（键为 suppliers.supplier_type 的大类码） */
export const REQUIRED_QUALIFICATION_BY_TYPE: Record<string, QualificationKind> = {
  PP: 'pesticide',
  SP: 'seed',
  FE: 'fertilizer',
};

/** 证照种类 → 前端字段名（camelCase，与 Supplier 类型一致） */
export const QUALIFICATION_FIELDS: Record<QualificationKind, { no: keyof SupplierQualificationFields; expiry: keyof SupplierQualificationFields }> = {
  pesticide: { no: 'pesticideLicenseNo', expiry: 'pesticideLicenseExpiry' },
  seed: { no: 'seedFilingNo', expiry: 'seedFilingExpiry' },
  fertilizer: { no: 'fertilizerRegNo', expiry: 'fertilizerRegExpiry' },
};

/** 供应商上的证照字段（camelCase） */
export interface SupplierQualificationFields {
  pesticideLicenseNo?: string;
  pesticideLicenseExpiry?: string;
  seedFilingNo?: string;
  seedFilingExpiry?: string;
  fertilizerRegNo?: string;
  fertilizerRegExpiry?: string;
  supplierType?: string;
}

export interface QualificationEvaluation {
  kind: QualificationKind;
  /** 证照中文名（不需持证时为空串） */
  label: string;
  status: QualificationStatus;
  no: string;
  expiry: string;
  /** 距到期天数（负数=已逾期）；无有效期时 null */
  daysLeft: number | null;
}

/**
 * 计算 expiry 距今天数（负数=已过期）；日期非法返回 null
 * 以本地日期为基准，避免 UTC 跨日差（项目时区事故教训）
 */
export function daysUntil(expiry: string, today: string = todayLocal()): number | null {
  const e = String(expiry || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) return null;
  const expiryMs = Date.parse(`${e}T00:00:00`);
  const todayMs = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(expiryMs) || Number.isNaN(todayMs)) return null;
  return Math.round((expiryMs - todayMs) / 86400000);
}

/** 该供应类型要求的证照种类（不强制持证返回 null） */
export function requiredKindForType(supplierType: string): QualificationKind | null {
  return REQUIRED_QUALIFICATION_BY_TYPE[String(supplierType || '').trim().toUpperCase()] || null;
}

/**
 * 评估供应商的资质合规状态
 * @param supplier 供应商记录（或含证照字段的表单对象）
 */
export function evaluateSupplierQualification(
  supplier: SupplierQualificationFields,
  today: string = todayLocal()
): QualificationEvaluation {
  const kind = requiredKindForType(supplier?.supplierType || '');
  if (!kind) {
    return { kind: 'pesticide', label: '', status: 'not_required', no: '', expiry: '', daysLeft: null };
  }
  const fields = QUALIFICATION_FIELDS[kind];
  const no = String(supplier?.[fields.no] ?? '').trim();
  const expiry = String(supplier?.[fields.expiry] ?? '').trim();

  // 证号与有效期任一缺失 → 未完成登记
  if (!no || !expiry) {
    return { kind, label: QUALIFICATION_LABELS[kind], status: 'missing', no, expiry, daysLeft: null };
  }
  const left = daysUntil(expiry, today);
  if (left === null) {
    // 有效期格式非法同样按未合规处理（不静默当作有效）
    return { kind, label: QUALIFICATION_LABELS[kind], status: 'missing', no, expiry, daysLeft: null };
  }
  if (left < 0) return { kind, label: QUALIFICATION_LABELS[kind], status: 'expired', no, expiry, daysLeft: left };
  if (left <= EXPIRING_WINDOW_DAYS) return { kind, label: QUALIFICATION_LABELS[kind], status: 'expiring', no, expiry, daysLeft: left };
  return { kind, label: QUALIFICATION_LABELS[kind], status: 'valid', no, expiry, daysLeft: left };
}

/**
 * 采购环节的资质提示
 * @returns null = 无需提示；string = 提示/拦截文案
 *
 * 「即将到期」仍属有效，只提示不拦截。
 */
export function getQualificationIssue(
  supplier: SupplierQualificationFields,
  today: string = todayLocal()
): string | null {
  const ev = evaluateSupplierQualification(supplier, today);
  if (ev.status === 'missing') {
    // 文案不带主语，调用方自行拼「该供应商……」（与后端 lib/supplierQualification.ts 同口径）
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

/** 该提示是否构成硬性问题（"即将到期"不算） */
export function isBlockingQualification(supplier: SupplierQualificationFields): boolean {
  const s = evaluateSupplierQualification(supplier).status;
  return s === 'missing' || s === 'expired';
}

/** 状态 → 徽章文案 */
export const QUALIFICATION_STATUS_TEXT: Record<QualificationStatus, string> = {
  not_required: '不适用',
  missing: '未登记',
  expired: '已过期',
  expiring: '即将到期',
  valid: '有效',
};

/** 状态 → 徽章样式（Tailwind）。颜色递进：绿(有效) → 黄(即将到期) → 红(已过期) → 橙(未登记) */
export const QUALIFICATION_STATUS_CLASS: Record<QualificationStatus, string> = {
  not_required: 'bg-gray-100 text-gray-500',
  missing: 'bg-orange-100 text-orange-700',
  expired: 'bg-red-100 text-red-700',
  expiring: 'bg-yellow-100 text-yellow-700',
  valid: 'bg-green-100 text-green-700',
};

/** 需要关注的合规状态（用于列表筛选与页面告警） */
export const ATTENTION_STATUSES: QualificationStatus[] = ['missing', 'expired', 'expiring'];

/**
 * 筛选器「资质状态」选项
 * 'attention' 是聚合值（未登记 / 已过期 / 即将到期），其余与 QualificationStatus 一一对应
 */
export const QUALIFICATION_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '全部', label: '全部' },
  { value: 'attention', label: '需关注（未登记/过期/临期）' },
  { value: 'missing', label: '未登记' },
  { value: 'expired', label: '已过期' },
  { value: 'expiring', label: '即将到期' },
  { value: 'valid', label: '有效' },
];

/**
 * 表单渲染用的证照行（固定三类，顺序稳定）
 * 弹窗里三类全部展示：supplier_type 是单选，但实际存在一家同时经营种子+农药的情况，
 * 显示全部可让用户预先登记，避免换类型时才发现要重填。
 */
export const QUALIFICATION_ROWS: Array<{
  kind: QualificationKind;
  label: string;
  noField: keyof SupplierQualificationFields;
  expiryField: keyof SupplierQualificationFields;
}> = (Object.keys(QUALIFICATION_FIELDS) as QualificationKind[]).map((kind) => ({
  kind,
  label: QUALIFICATION_LABELS[kind],
  noField: QUALIFICATION_FIELDS[kind].no,
  expiryField: QUALIFICATION_FIELDS[kind].expiry,
}));
