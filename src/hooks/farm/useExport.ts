/**
 * 通用导出工具Hook
 * 提供统一的Excel/CSV导出功能
 * 适用于种源管理、育苗管理、种植管理、订单管理、采收管理等模块
 */

import { useCallback } from 'react';
import { showAlert } from '@/lib/dialogService';

// 导出格式类型
export type ExportFormat = 'csv' | 'xlsx' | 'word';

// 导出配置接口
export interface ExportConfig {
  /** 文件名前缀 */
  fileNamePrefix: string;
  /** 导出表头 */
  headers: string[];
  /** 导出数据生成函数 */
  getExportData: (record: Record<string, unknown>) => Record<string, unknown>;
  /** 格式化回调（可选） */
  formatRecord?: (record: Record<string, unknown>) => unknown;
}

// 使用导出功能的Hook
export function useExport() {
  /**
   * 执行导出操作
   * @param selectedData - 选中的数据列表
   * @param config - 导出配置
   * @param exportFormat - 导出格式
   */
  const handleExport = useCallback(async (
    selectedData: Record<string, unknown>[],
    config: ExportConfig,
    exportFormat: ExportFormat = 'xlsx'
  ) => {
    if (selectedData.length === 0) {
      await showAlert('请先选择要导出的数据');
      return;
    }

    const { fileNamePrefix, headers, getExportData } = config;

    // 生成导出数据
    const exportData = selectedData.map(record => {
      const formattedRecord = config.formatRecord ? config.formatRecord(record) : record;
      return getExportData(formattedRecord);
    });

    // 创建内容
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'xlsx' || exportFormat === 'word') {
      // Excel和Word都使用HTML格式
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = exportFormat === 'xlsx'
        ? 'application/vnd.ms-excel;charset=utf-8'
        : 'application/vnd.ms-word;charset=utf-8';
      extension = exportFormat === 'xlsx' ? 'xls' : 'doc';
    }

    const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        // 现代浏览器使用 File System Access API
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
        // 降级方案
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // 导出失败，降级方案
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  return { handleExport };
}

export default useExport;
