/**
 * 时间工具函数（2026-07-20）
 * 提供统一的本地时间戳生成，避免 UTC 跨天错位 bug
 * 参考：fertilizer.service.ts:17-22 原始实现
 */

export function nowLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}