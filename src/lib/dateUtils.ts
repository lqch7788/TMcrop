/**
 * 日期工具函数 (L-3 抽取)
 * 全站统一使用本地时区生成 YYYY-MM-DD（避免 UTC 跨天导致日期错位）
 */

/** 本地时区的 YYYY-MM-DD（避免 new Date().toISOString() 跨时区）
 *  0 参：返回今天；1 参：把传入的 Date | string 格式化为本地 YYYY-MM-DD
 *  2026-06-12 修复：之前签名只接受 0 参，所有 todayLocal(date) 调用方传入的 date
 *  都被静默丢弃，DatePicker 选任何日期都会变成"今天"，导致开始/结束日期永远一致
 */
export function todayLocal(date?: Date | string): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 本地时区的 YYYYMM（用于批次号生成） */
export function yearMonthLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 2026-07-10：本地时区的 HH:MM:SS（用于表单时间字段）
 * @example currentTimeLocal() // "14:35:22"
 */
export function currentTimeLocal(date?: Date | string): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** 临期预警阈值（天）：批次效期距今小于该值即视为临期（与领料模块 EXPIRY_WARN_DAYS 口径一致） */
export const EXPIRY_WARN_DAYS = 30;

/**
 * 本年度日期范围（本地时间）：YYYY-01-01 ~ 今天
 *
 * 汇总表各页面（看板/指标看板）默认用本年度而非"本月"：
 * 库里业务数据集中在年中，默认本月会让首屏显示成一屏 0。
 */
export function currentYearRange(): { startDate: string; endDate: string } {
  return { startDate: `${new Date().getFullYear()}-01-01`, endDate: todayLocal() };
}

/**
 * 按筛选模式计算日期范围（month / quarter / year），全部用本地时间拼接，
 * 避免 toISOString 的 UTC 偏移（东八区在 08:00 前会取到前一天）。
 */
export function rangeByMode(mode: 'month' | 'quarter' | 'year'): { startDate: string; endDate: string } {
  const now = new Date();
  const end = todayLocal();
  if (mode === 'month') {
    return { startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, endDate: end };
  }
  if (mode === 'quarter') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
    return { startDate: `${now.getFullYear()}-${String(qStartMonth).padStart(2, '0')}-01`, endDate: end };
  }
  return currentYearRange();
}

/**
 * 距离到期天数（按自然日、本地时区）
 * 2026-09-27：物料库存/批次明细临期预警共用；无法解析的日期返回 null
 * @returns 正数=还有 N 天到期；0=今天到期；负数=已过期 N 天；null=无日期/格式非法
 */
export function daysUntilExpiry(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
