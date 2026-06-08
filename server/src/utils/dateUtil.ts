/**
 * 日期工具函数
 * 2026-06-09 新增：解决 UTC 时区差问题
 *
 * 之前代码用 `new Date().toISOString().slice(0, 10)` 取日期 —— 但 toISOString() 返回 UTC 时间，
 * 中国时区 (UTC+8) 在早上 0:00-8:00 之间 UTC 还是"昨天"，导致生成的 ID (INS-20260608-XXXX) 是昨天日期。
 *
 * 业务 ID（库存实例 / 流水）必须用**本地日期**（getFullYear/getMonth/getDate），
 * 否则跨 0:00 UTC 边界时业务编码会跳号。
 */
export function formatLocalDateYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** 同上但保留 '-' 分隔（YYYY-MM-DD），用于 inbound_date / operate_date 等 SQL 字段 */
export function formatLocalDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
