/**
 * 统一导出Hook
 * 所有页面导出功能统一使用此Hook
 */

import { useState, useCallback } from 'react';
import { showAlert } from '@/lib/dialogService';

export type ExportFormat = 'excel' | 'csv' | 'word';

export interface UseExportModalOptions {
  /** 默认导出格式 */
  defaultFormat?: ExportFormat;
  /** 导出文件名前缀 */
  fileNamePrefix: string;
}

export function useExportModal({ defaultFormat = 'excel', fileNamePrefix }: UseExportModalOptions) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(defaultFormat);

  // 进入导出模式
  const handleExport = useCallback(() => {
    // 导出模式由调用方管理，这里只处理弹窗
    setShowExportModal(true);
  }, []);

  // 确认导出
  const handleConfirmExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // 执行实际导出
  const doExport = useCallback(async (
    data: Record<string, unknown>[],
    headers: string[],
    getRowData: (record: Record<string, unknown>) => (string | number | null | undefined)[]
  ) => {
    if (data.length === 0) {
      await showAlert('没有可导出的数据');
      return;
    }

    const { fileNamePrefix: prefix } = { fileNamePrefix };

    // 生成导出数据
    const exportData = data.map(record => getRowData(record));

    // 创建内容
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map((_, i) => `"${row[i] ?? ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else {
      // Excel和Word都使用HTML格式
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = exportFormat === 'excel'
        ? 'application/vnd.ms-excel;charset=utf-8'
        : 'application/vnd.ms-word;charset=utf-8';
      extension = exportFormat === 'excel' ? 'xls' : 'doc';
    }

    const fileName = `${prefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // 导出失败时静默处理，已显示错误提示
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
  }, [exportFormat, fileNamePrefix]);

  // 关闭弹窗
  const handleCloseModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  return {
    exportFormat,
    setExportFormat,
    showExportModal,
    handleExport,
    handleConfirmExport,
    handleCloseModal,
    doExport,
  };
}
