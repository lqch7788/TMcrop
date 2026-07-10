/**
 * CSV 导出工具（2026-07-10 P1-1）
 * 抽自 7 个 Page 的 handleConfirmExport 中的 csv 分支（保留原有行为）。
 *
 * 设计：通用 CSV 导出，仅负责"序列化 + 下载"，业务层负责 prepare headers/rows。
 * - UTF-8 BOM 防 Excel 乱码
 * - 字段引号转义（内部 " 转 ""）
 * - 支持 showSaveFilePicker（Electron/Chromium），不支持时降级 Blob 下载
 */

export interface ExportCsvOptions {
  filename: string;            // 含扩展名，如 "种源管理_2026-07-10.csv"
  headers: string[];            // 列头中文数组
  rows: Array<Record<string, unknown>>;  // 每行数据（key 与 headers 列名一致）
}

/**
 * 字段值转字符串（CSV 单元格），含 null/undefined → ''
 */
function cellToString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

/**
 * CSV 单元格转义：含 , " \n 的字段用 " 包，内部 " 转 ""
 */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 序列化 headers + rows 为 CSV 字符串（带 UTF-8 BOM）
 */
export function serializeCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(cellToString(row[h]))).join(','));
  }
  // UTF-8 BOM 防 Excel 打开中文乱码
  return '﻿' + lines.join('\n');
}

/**
 * 浏览器端触发文件下载（支持 showSaveFilePicker / 降级 Blob）
 */
async function triggerDownload(filename: string, blob: Blob): Promise<void> {
  const anyWin = window as unknown as { showSaveFilePicker?: (opts: any) => Promise<any> };
  if (anyWin.showSaveFilePicker) {
    try {
      const handle = await anyWin.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // 用户取消保存对话框或不支持 — 降级到普通下载
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 主入口：序列化 CSV 并下载
 */
export async function exportCsv(options: ExportCsvOptions): Promise<void> {
  const content = serializeCsv(options.headers, options.rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  await triggerDownload(options.filename, blob);
}