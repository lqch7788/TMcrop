/**
 * 日期工具函数 (L-3 抽取)
 * 全站统一使用本地时区生成 YYYY-MM-DD（避免 UTC 跨天导致日期错位）
 */

/** 本地时区的 YYYY-MM-DD（避免 new Date().toISOString() 跨时区） */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 本地时区的 YYYYMM（用于批次号生成） */
export function yearMonthLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
