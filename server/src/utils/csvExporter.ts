/**
 * CSV 导出工具 (V3.1 出库记录独立页)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §7.3
 *
 * 字段顺序与设计 7.3 节表对齐（18 列，与表格列对应）
 * 含 CSV 转义：包含逗号/引号/换行的字段用双引号包裹，内部双引号双写
 */

import { OutboundRow } from '../repositories/inventoryTransaction.repository';

const HEADERS = [
  '业务单号', '操作时间', '实例ID', '作物编码', '类型', '作物名称', '品种',
  '种植模式', '采收区域', '品质等级', '出库数量', '单位',
  '余额前', '余额后', '仓库', '业务类型', '出库人', '备注',
];

export function toCSV(rows: OutboundRow[]): string {
  const lines: string[] = [HEADERS.join(',')];
  for (const r of rows) {
    const cells = [
      r.businessCode,
      r.operateDate,
      r.instanceId,
      r.cropCode,
      r.stockType,
      r.cropName,
      r.varietyName,
      r.plantingMode,
      r.greenhouseName,
      r.grade,
      String(r.quantityOut),
      r.unit,
      String(r.balanceBefore),
      String(r.balanceAfter),
      r.warehouseName,
      r.businessType,
      r.operatorName,
      r.remarks,
    ].map(v => v === undefined || v === null ? '' : csvEscape(String(v)));
    lines.push(cells.join(','));
  }
  // 加 UTF-8 BOM 让 Excel 正确识别中文（避免乱码）
  return '﻿' + lines.join('\n');
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
