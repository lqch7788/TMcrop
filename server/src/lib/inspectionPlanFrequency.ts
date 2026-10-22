/**
 * 巡查计划频率计算（2026-10-21 P2b）
 *
 * 【为什么单独抽成纯函数】
 * 频率算法是本模块最容易写错、又最难靠点页面验证的部分：
 *   · weekly 的相位（weeksBetween 用 floor 还是四舍五入）差一天就整体错位
 *   · end_date 为空时被 Math.min 处理成 0 → 区间塌缩成一天（真实数据里 end_date 可空）
 *   · new Date('2026-11-03') 按 UTC 解析，中国时区早上会退一天
 * 这三点任何一条出错，页面表现都是「计划少生成了几天任务」，很难定位。
 * 因此把它做成无副作用纯函数 + 单测覆盖 4 种频率与边界，
 * 路由/服务只负责取计划、调用它、写库。
 *
 * 【日期口径】
 * 全程本地日期：`new Date(y, m-1, d)` 构造，绝不用 `new Date('YYYY-MM-DD')`（UTC 解析）。
 */

/** 巡查计划频率 */
export type PlanFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

/** 参与频率计算的最小计划字段（只要这几个，别的字段不进算法） */
export interface PlanFrequencyInput {
  start_date: string;
  /** 为空/未设置视为无限期 */
  end_date?: string | null;
  frequency: string;
  /** 间隔倍数，>=1 */
  interval_value?: number | null;
  /** 1=周一 … 7=周日；weekly 必填非空 */
  weekdays?: string | number[] | null;
  /** 1..28；monthly 必填 */
  day_of_month?: number | null;
}

/** 把 'YYYY-MM-DD' 解析为本地零点的 Date（禁 UTC 解析） */
export function parseLocalDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  // 反查：排除 2026-02-30 这类「构造时被 Date 自动进位」的非法日期
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** Date → 'YYYY-MM-DD'（本地） */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** 周几编码：1=周一 … 7=周日 */
export function weekdayCode(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** 整天差（from 早于 to 时为负） */
export function daysBetween(from: Date, to: Date): number {
  // 用 UTC 归一化后相减，绕开夏令时/时区导致的 23 或 25 小时天
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** 整月差 */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** 把 weekdays 规整成 number[]（兼容 JSON 字符串与数组入参） */
export function normalizeWeekdays(raw: string | number[] | null | undefined): number[] {
  if (!raw) return [];
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = raw.split(',');
    }
  }
  const out: number[] = [];
  for (const item of list) {
    const n = Number(String(item).trim());
    if (Number.isInteger(n) && n >= 1 && n <= 7) out.push(n);
  }
  return [...new Set(out)];
}

/** 该日期是否命中计划频率 */
export function matchesFrequency(plan: PlanFrequencyInput, date: Date): boolean {
  const start = parseLocalDate(plan.start_date);
  if (!start) return false;
  // 计划起始日之前不生成
  if (date.getTime() < start.getTime()) return false;

  const frequency = String(plan.frequency || '') as PlanFrequency;
  const interval = Math.max(1, Number(plan.interval_value ?? 1) || 1);
  const diffDays = daysBetween(start, date);

  switch (frequency) {
    case 'once':
      // 一次性：只有起始日当天生成一次（不看区间起点）
      return diffDays === 0;

    case 'daily':
      return diffDays % interval === 0;

    case 'weekly': {
      const weekdays = normalizeWeekdays(plan.weekdays);
      if (weekdays.length === 0) return false;
      if (!weekdays.includes(weekdayCode(date))) return false;
      // 相位锚点是起始日：整周数 = 起始日到当天的整天差 / 7 向下取整
      const weeksBetween = Math.floor(diffDays / 7);
      return weeksBetween % interval === 0;
    }

    case 'monthly': {
      const dom = Number(plan.day_of_month);
      if (!Number.isInteger(dom) || dom < 1 || dom > 28) return false;
      if (date.getDate() !== dom) return false;
      const monthDiff = monthsBetween(start, date);
      // 起始日在 29-28 日之间时，月份差为 0 的首月也要算
      if (monthDiff < 0) return false;
      return monthDiff % interval === 0;
    }

    default:
      return false;
  }
}

/**
 * 计算 [from, to] 区间内所有命中频率的日期（'YYYY-MM-DD'，升序）。
 *
 * 区间语义：
 *   · 起点 from 只截取输出区间，**不参与相位**（相位锚点恒为 plan.start_date）
 *   · 终点 end = min(to, plan.end_date || to) —— end_date 为空视为无限期
 *   · 最多扫描 MAX_SCAN_DAYS 天，防止非法入参把进程跑死
 */
export const MAX_SCAN_DAYS = 366;

export function computeOccurrences(plan: PlanFrequencyInput, from: string, to: string): string[] {
  const startFrom = parseLocalDate(from);
  const startTo = parseLocalDate(to);
  if (!startFrom || !startTo) return [];
  if (startTo.getTime() < startFrom.getTime()) return [];

  // end_date 为空 → 无限期；非空 → 取较小者。
  // 注意：不能直接 Math.min(to, plan.end_date) —— 空串/null 会被 Math.min 处理成 0，
  //   区间直接塌缩成 1970 年，一天都生成不出来。
  let end = startTo;
  const planEndStr = String(plan.end_date || '').trim();
  if (planEndStr) {
    const planEnd = parseLocalDate(planEndStr);
    if (planEnd && planEnd.getTime() < end.getTime()) end = planEnd;
  }

  const out: string[] = [];
  const cursor = new Date(startFrom.getFullYear(), startFrom.getMonth(), startFrom.getDate());
  let scanned = 0;
  while (cursor.getTime() <= end.getTime() && scanned < MAX_SCAN_DAYS) {
    if (matchesFrequency(plan, cursor)) out.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    scanned++;
  }
  return out;
}

/**
 * 校验频率参数组合（保存计划时调用）。
 * 返回错误信息数组；空数组表示合法。
 * 目标：非法组合在**保存时**就被拒绝，不留到生成阶段静默不生成。
 */
export function validateFrequencyInput(plan: PlanFrequencyInput): string[] {
  const errors: string[] = [];
  const frequency = String(plan.frequency || '');

  if (!parseLocalDate(plan.start_date)) errors.push('startDate 必须是合法的 YYYY-MM-DD 日期');
  if (plan.end_date && !parseLocalDate(plan.end_date)) errors.push('endDate 必须是合法的 YYYY-MM-DD 日期');
  if (plan.start_date && plan.end_date && String(plan.end_date) < String(plan.start_date)) {
    errors.push('endDate 不能早于 startDate');
  }

  const allowed: PlanFrequency[] = ['once', 'daily', 'weekly', 'monthly'];
  if (!allowed.includes(frequency as PlanFrequency)) {
    errors.push(`frequency 必须是 ${allowed.join(' / ')} 之一`);
  }

  const interval = Number(plan.interval_value ?? 1);
  if (!Number.isInteger(interval) || interval < 1) {
    errors.push('intervalValue 必须是 >= 1 的整数');
  }

  if (frequency === 'weekly' && normalizeWeekdays(plan.weekdays).length === 0) {
    errors.push('weekly 频率必须选择至少一个周几（1=周一 … 7=周日）');
  }

  if (frequency === 'monthly') {
    const dom = Number(plan.day_of_month);
    // 上限 28：2 月只有 28 天，29-31 号的月计划永远无法执行
    if (!Number.isInteger(dom) || dom < 1 || dom > 28) {
      errors.push('monthly 频率的每月几号必须是 1..28 的整数');
    }
  }

  return errors;
}