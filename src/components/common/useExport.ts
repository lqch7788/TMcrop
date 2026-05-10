/**
 * 统一导出Hook
 * 所有页面导出功能统一使用此Hook
 * 流程与库存总览完全一致
 */

import { useState, useCallback } from 'react';

export interface UseExportOptions {
  /** 导出文件名前缀 */
  fileNamePrefix: string;
  /** 默认导出格式 */
  defaultFormat?: 'xlsx' | 'csv' | 'word';
}

export interface UseExportReturn {
  // 状态
  exportMode: boolean;
  exportFormat: 'xlsx' | 'csv' | 'word';
  showExportModal: boolean;
  selectedCount: number;

  // 设置选中数量
  setSelectedCount: (count: number) => void;

  // 操作方法
  /** 进入导出模式 */
  onExport: () => void;
  /** 确认导出（打开格式选择弹窗） */
  onConfirmExport: () => void;
  /** 取消选择（退出导出模式） */
  onCancelExport: () => void;
  /** 全选/取消全选 */
  onSelectAll: (totalCount: number, currentSelected: number[], allIds: (number | string)[]) => void;
  /** 关闭格式选择弹窗 */
  onCloseModal: () => void;
  /** 执行导出 */
  doExport: (data: Record<string, unknown>[], headers: string[], getRowData: (record: Record<string, unknown>) => (string | number | null | undefined)[]) => Promise<void>;
}

export function useExport({
  fileNamePrefix,
  defaultFormat = 'xlsx'
}: UseExportOptions): UseExportReturn {
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'word'>(defaultFormat);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // 进入导出模式
  const onExport = useCallback(() => {
    setExportMode(true);
  }, []);

  // 确认导出（打开格式选择弹窗）
  const onConfirmExport = useCallback(() => {
    if (selectedCount === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  }, [selectedCount]);

  // 取消选择（退出导出模式）
  const onCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedCount(0);
  }, []);

  // 全选/取消全选
  const onSelectAll = useCallback((totalCount: number, currentSelected: number[], allIds: (number | string)[]) => {
    if (currentSelected.length === totalCount) {
      // 取消全选
      setSelectedCount(0);
    } else {
      // 全选
      setSelectedCount(allIds.length);
    }
  }, []);

  // 关闭格式选择弹窗
  const onCloseModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  // 执行导出
  const doExport = useCallback(async (
    data: Record<string, unknown>[],
    headers: string[],
    getRowData: (record: Record<string, unknown>) => (string | number | null | undefined)[]
  ) => {
    if (data.length === 0) {
      alert('没有可导出的数据');
      return;
    }

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
      mimeType = exportFormat === 'xlsx'
        ? 'application/vnd.ms-excel;charset=utf-8'
        : 'application/vnd.ms-word;charset=utf-8';
      extension = exportFormat === 'xlsx' ? 'xls' : 'doc';
    }

    const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedCount(0);
  }, [exportFormat, fileNamePrefix]);

  return {
    exportMode,
    exportFormat,
    showExportModal,
    selectedCount,
    setSelectedCount,
    onExport,
    onConfirmExport,
    onCancelExport,
    onSelectAll,
    onCloseModal,
    doExport,
  };
}
