/**
 * Word 导出工具（2026-07-10 P1-1）
 * 抽自 7 个 Page 的 handleConfirmExport 中的 word 分支（保留原有行为）。
 *
 * 保留行为说明（P2-5 待修）：
 * - 当前 MIME 用 `application/msword;charset=utf-8`，扩展名 `.doc`
 * - 实际内容是 HTML（Word 可打开但会报警）
 * - P2-5 修复目标：改用真正的 docx 库（docx npm）
 *
 * 本文件保留原有"HTML 假装 doc"行为，避免破坏现有功能。
 */

import { triggerDownloadLikeCsv } from './shared';

export interface ExportWordOptions {
  filename: string;            // 含扩展名（通常是 .doc）
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export async function exportWord(options: ExportWordOptions): Promise<void> {
  const headerRow = options.headers.map((h) => `<th style="background-color: #4a90d9; color: white;">${h}</th>`).join('');
  const bodyRows = options.rows
    .map((row) => `<tr>${options.headers.map((h) => `<td>${cellToString(row[h])}</td>`).join('')}</tr>`)
    .join('');
  const content = `<html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #4a90d9; color: white; }</style></head><body><table border="1"><tr>${headerRow}</tr>${bodyRows}</table></body></html>`;
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  await triggerDownloadLikeCsv(options.filename, blob);
}