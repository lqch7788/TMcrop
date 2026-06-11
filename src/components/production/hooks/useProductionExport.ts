/**
 * 生产计划导出 Hook
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 *
 * 负责：进入导出模式、确认导出、执行 Excel/CSV/Word 导出、取消导出
 */
import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '../../../lib/dateUtils';
import { batchStatusLabels } from '../constants';
import type { CropBatch } from '../../../types';

interface UseProductionExportParams {
  batches: CropBatch[];
  selectedRows: string[];
  exportFormat: string;
  setExportMode: (v: boolean) => void;
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  setShowExportModal: (v: boolean) => void;
}

export function useProductionExport({
  batches,
  selectedRows,
  exportFormat,
  setExportMode,
  setSelectedRows,
  setShowExportModal,
}: UseProductionExportParams) {
  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, [setExportMode, setSelectedRows]);

  const handleConfirmExport = useCallback(() => {
    setShowExportModal(true);
  }, [setShowExportModal]);

  // L-02 + L-03: 用 xlsx 库生成真 Excel；batchStatusLabels 从 constants 复用
  const handleDoExport = useCallback(async () => {
    try {
      const selectedData = batches.filter((b) => selectedRows.includes(b.id));
      const headers = [
        '生产计划批次号', '种植模式', '作物名称', '作物品种', '种植区域', '种植面积',
        '开始时间', '预计结束时间', '负责人', '目标产量', '发布人', '初次发布时间',
        '最后修改时间', '当前状态', '版本号', '备注',
      ];
      const exportData = selectedData.map((row) => ({
        '生产计划批次号': row.batchCode,
        '种植模式': row.plantingMode,
        '作物名称': row.cropName,
        '作物品种': row.variety,
        '种植区域': row.greenhouseName,
        '种植面积': row.plantingArea,
        '开始时间': row.startDate,
        '预计结束时间': row.expectedHarvestDate,
        '负责人': row.responsiblePerson,
        '目标产量': row.targetYield,
        '发布人': row.publisher || '-',
        '初次发布时间': row.publishDate || '-',
        '最后修改时间': row.lastModifyDate || '-',
        '当前状态': batchStatusLabels[row.batchStatus || 'draft'] || '-',
        '版本号': 'V1.0',
        '备注': row.description || '-',
      }));

      if (exportFormat === 'excel') {
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '生产计划');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `生产计划_${todayLocal()}.xlsx`);
      } else if (exportFormat === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `生产计划_${todayLocal()}.csv`);
      } else if (exportFormat === 'word') {
        // word 仍用 html 包裹（无 docx 库时是常见方案）
        const escapeHtml = (s: unknown) =>
          String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}${exportData.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h as keyof typeof row])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([content], { type: 'application/msword' });
        saveAs(blob, `生产计划_${todayLocal()}.doc`);
      }

      setShowExportModal(false);
      setExportMode(false);
      setSelectedRows([]);
    } catch (error) {
      console.error('[ProductionPlan] 导出失败:', error);
      await showAlert('导出失败，请重试');
      setShowExportModal(false);
      setExportMode(false);
      setSelectedRows([]);
    }
  }, [batches, selectedRows, exportFormat, setShowExportModal, setExportMode, setSelectedRows]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, [setExportMode, setSelectedRows]);

  return {
    handleExportClick,
    handleConfirmExport,
    handleDoExport,
    handleCancelExport,
  };
}
