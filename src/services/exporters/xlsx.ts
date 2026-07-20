/**
 * XLSX 导出工具（2026-07-20 重构）
 * 改为使用 SheetJS (xlsx) 库生成真正的 .xlsx 二进制文件
 * 解决旧版 HTML 伪装 xls 导致 Excel 打不开的 bug
 */

import { triggerDownloadLikeCsv } from './shared';

export interface ExportXlsxOptions {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

// 2026-07-16：防范 Excel 公式注入（CWE-1236）
const FORMULA_LEADING_CHARS = /^[=+\-@\t\r]/;
const PURE_NUMBER_RE = /^-?\d+(\.\d+)?$/;
export function escapeFormula(value: string): string {
  if (PURE_NUMBER_RE.test(value)) return value;
  return FORMULA_LEADING_CHARS.test(value) ? `'${value}` : value;
}

function cellValue(value: unknown): string | number {
  if (value == null) return '';
  const s = String(value);
  // 纯数字保留数字类型（Excel 可直接计算）
  if (PURE_NUMBER_RE.test(s)) return Number(s);
  return escapeFormula(s);
}

/** 保留的旧 HTML 序列化函数（其他模块可能还在用） */
export function serializeHtmlTable(headers: string[], rows: Array<Record<string, unknown>>): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const bodyRows = rows.map((row) =>
    `<tr>${headers.map((h) => `<td>${esc(cellValue(row[h]) as string)}</td>`).join('')}</tr>`
  ).join('');
  return `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headerRow}</tr>${bodyRows}</table></body></html>`;
}

/**
 * 主入口：使用 SheetJS 生成真正的 .xlsx 并下载
 */
export async function exportXlsx(options: ExportXlsxOptions): Promise<void> {
  const XLSX = await import('xlsx');
  // 构建二维数组：第一行表头 + 数据行
  const aoa: any[][] = [options.headers];
  for (const row of options.rows) {
    aoa.push(options.headers.map((h) => cellValue(row[h])));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // 自动列宽
  const colWidths = options.headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...options.rows.map((r) => String(r[h] ?? '').length).slice(0, 200));
    return { wch: Math.min(Math.max(maxLen + 4, 10), 40) };
  });
  ws['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '施肥记录');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  await triggerDownloadLikeCsv(options.filename, blob);
}