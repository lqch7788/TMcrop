/**
 * 导出工具函数
 * 从 Reports.tsx 提取的可复用导出逻辑
 * 支持 CSV、Excel(HTML)、Word(HTML) 格式导出
 */

/**
 * HTML转义，防止XSS
 */
export function escapeHtml(str: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(str).replace(/[&<>"']/g, (s) => entityMap[s]);
}

/**
 * 导出为 CSV 文件
 * @param headers 表头数组
 * @param data 数据行（key为表头名，value为单元格值）
 * @param filename 下载文件名（不含扩展名）
 */
export function exportToCSV(headers: string[], data: Record<string, unknown>[], filename: string): void {
  const BOM = '﻿'; // BOM头确保Excel正确识别UTF-8中文
  const csvContent =
    BOM +
    headers.join(',') +
    '\n' +
    data
      .map((row) => headers.map((h) => `"${String(row[h] ?? '')}"`).join(','))
      .join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

/**
 * 导出为 Excel (HTML格式，.xls扩展名)
 * 利用浏览器将HTML表格识别为Excel格式
 * @param headers 表头数组
 * @param data 数据行
 * @param filename 下载文件名（不含扩展名）
 */
export function exportToExcel(headers: string[], data: Record<string, unknown>[], filename: string): void {
  const tableHtml = buildHtmlTable(headers, data);
  const content = `<html><head><meta charset="utf-8"></head><body>${tableHtml}</body></html>`;

  downloadFile(content, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

/**
 * 导出为 Word (HTML格式，.doc扩展名)
 * 利用浏览器将HTML表格识别为Word格式
 * @param headers 表头数组
 * @param data 数据行
 * @param filename 下载文件名（不含扩展名）
 */
export function exportToWord(headers: string[], data: Record<string, unknown>[], filename: string): void {
  const tableHtml = buildHtmlTable(headers, data);
  const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>${tableHtml}</body></html>`;

  downloadFile(content, `${filename}.doc`, 'application/vnd.ms-word;charset=utf-8');
}

/**
 * 将图表DOM元素导出为PNG图片
 * 使用SVG foreignObject技术，无需额外依赖
 * @param chartRef 图表DOM元素引用
 * @param filename 下载文件名（不含扩展名）
 */
export async function exportChartAsImage(chartRef: HTMLElement, filename: string): Promise<void> {
  const canvas = await domToCanvas(chartRef);
  const dataUrl = canvas.toDataURL('image/png');

  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${filename}.png`,
      types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
    });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    // 降级：使用传统下载方式
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  }
}

// ========== 内部辅助函数 ==========

/**
 * 生成HTML表格字符串
 */
function buildHtmlTable(headers: string[], data: Record<string, unknown>[]): string {
  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const dataRows = data
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${String(row[h] ?? '')}</td>`).join('')}</tr>`
    )
    .join('');

  return `<table border="1"><tr>${headerRow}</tr>${dataRows}</table>`;
}

/**
 * 通用文件下载函数
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 将DOM元素绘制到Canvas（使用SVG foreignObject技术）
 */
async function domToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { width, height } = element.getBoundingClientRect();
  const data = new XMLSerializer().serializeToString(element);
  const svgBlob = new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<foreignObject width="100%" height="100%">` +
        `<div xmlns="http://www.w3.org/1999/xhtml">${data}</div>` +
        `</foreignObject></svg>`,
    ],
    { type: 'image/svg+xml;charset=utf-8' }
  );

  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D上下文不可用'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG图片加载失败'));
    };
    img.src = url;
  });
}
