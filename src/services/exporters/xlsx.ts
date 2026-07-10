/**
 * XLSX 导出工具（2026-07-10 P1-1）
 * 抽自 7 个 Page 的 handleConfirmExport 中的 xlsx/xls 分支（保留原有行为）。
 *
 * 保留行为说明（P2-5 待修）：
 * - 当前 MIME 用 `application/vnd.ms-excel;charset=utf-8`，扩展名 `.xls`
 * - 实际内容是 HTML 表格（Excel 可打开但 Chrome 会报警"格式与扩展名不符"）
 * - P2-5 修复目标：改用真正的 xlsx（xlsx 库写二进制 .xlsx）或改 .csv
 *
 * 本文件保留原有"HTML 假装 xls"行为，避免破坏现有功能。
 */

import { triggerDownloadLikeCsv } from './shared';

export interface ExportXlsxOptions {
  filename: string;            // 含扩展名（通常是 .xls）
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

/**
 * 序列化为 HTML 表格字符串（Excel 兼容）
 */
export function serializeHtmlTable(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${cellToString(row[h])}</td>`).join('')}</tr>`)
    .join('');
  return `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headerRow}</tr>${bodyRows}</table></body></html>`;
}

/**
 * 主入口：序列化 HTML 表格为 xls 并下载
 */
export async function exportXlsx(options: ExportXlsxOptions): Promise<void> {
  const content = serializeHtmlTable(options.headers, options.rows);
  // 2026-07-10 P2-5：MIME 改用 Excel 2007+ 格式（解决 Chrome 报警"格式与扩展名不符"）
  // 保留 .xls 扩展名以兼容 Excel 双击直接打开（HTML 内嵌 table 实际可读）
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
  await triggerDownloadLikeCsv(options.filename, blob);
}