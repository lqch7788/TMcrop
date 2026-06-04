/**
 * 出库记录 PDF 导出工具 (V3.1)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §4.2 + §14
 *
 * 使用 jspdf + jspdf-autotable（前端已装依赖）
 * 限制：≤ 2000 行（受 jspdf 性能/体积影响）
 *
 * 已知限制（设计 14 节）：
 * jspdf 默认 Helvetica **不支持中文**。本实现用 latin 转中文拼音/英文映射
 * 如需原生中文支持需嵌入思源黑体子集（+3MB），本设计不在范围内
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OutboundRow, OutboundSummary } from '../services/inventoryTransactionService';

const MAX_PDF_ROWS = 2000;

export async function exportOutboundPDF(rows: OutboundRow[], summary: OutboundSummary | null): Promise<void> {
  if (rows.length > MAX_PDF_ROWS) {
    throw new Error(
      `PDF 最多支持 ${MAX_PDF_ROWS} 行，当前 ${rows.length.toLocaleString()} 条。请缩小时间范围或改用 XLSX/CSV。`
    );
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 标题
  doc.setFontSize(16);
  doc.text('Outbound Records Report', 14, 15);

  // 汇总
  doc.setFontSize(10);
  const today = new Date().toISOString().slice(0, 10);
  const sumText = summary
    ? `Generated: ${today}  |  Total: ${summary.totalCount}  |  Quantity: ${summary.totalQuantity}  |  Today: ${summary.todayCount}`
    : `Generated: ${today}  |  Total: ${rows.length}`;
  doc.text(sumText, 14, 22);

  // 表格（精简 10 列，避免 PDF 过宽；中文显示受限 → 用英文 key 友好）
  autoTable(doc, {
    startY: 28,
    head: [['Date', 'InstanceID', 'StockType', 'Crop', 'Qty', 'Unit', 'Warehouse', 'BizType', 'Operator', 'Balance']],
    body: rows.map((r) => [
      r.operateDate,
      r.instanceId,
      r.stockType,
      r.cropName || '-',
      String(r.quantityOut),
      r.unit || '',
      r.warehouseName || '-',
      r.businessType || '-',
      r.operatorName || '-',
      `${r.balanceBefore}->${r.balanceAfter}`,
    ]),
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { cellWidth: 35 },   // InstanceID
      3: { cellWidth: 25 },   // Crop
      6: { cellWidth: 30 },   // Warehouse
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  doc.save(`outbound-${today}.pdf`);
}

/**
 * 客户端 XLSX 导出（用项目已有 xlsx 依赖，避免后端 +1MB）
 * 设计 4.2 节：后端只出 CSV；XLSX/PDF 走前端
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportOutboundXLSX(rows: OutboundRow[], summary: OutboundSummary | null): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 明细
  const detail = rows.map((r) => ({
    '业务单号':    r.businessCode || '',
    '操作时间':    r.operateDate,
    '实例ID':      r.instanceId,
    '作物编码':    r.cropCode || '',
    '类型':        r.stockType,
    '作物名称':    r.cropName || '',
    '品种':        r.varietyName || '',
    '种植模式':    r.plantingMode || '',
    '采收区域':    r.greenhouseName || '',
    '品质等级':    r.grade || '',
    '出库数量':    r.quantityOut,
    '单位':        r.unit || '',
    '余额前':      r.balanceBefore,
    '余额后':      r.balanceAfter,
    '仓库':        r.warehouseName || '',
    '业务类型':    r.businessType || '',
    '出库人':      r.operatorName || '',
    '备注':        r.remarks || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), '明细');

  // Sheet 2: 汇总
  if (summary) {
    const sumData = [
      { '指标': '总条数',         '值': summary.totalCount },
      { '指标': '总出库量',       '值': summary.totalQuantity },
      { '指标': '今日出库次数',   '值': summary.todayCount },
      ...Object.entries(summary.byStockType).map(([k, v]) => ({
        '指标': `按库存类型-${k}`, '数量(条)': v.count, '数量(kg)': v.quantity,
      })),
      ...Object.entries(summary.byBusinessType).map(([k, v]) => ({
        '指标': `按业务类型-${k}`, '数量(条)': v.count, '数量(kg)': v.quantity,
      })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumData), '汇总');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const today = new Date().toISOString().slice(0, 10);
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `outbound-${today}.xlsx`);
}
