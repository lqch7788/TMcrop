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
