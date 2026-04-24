/**
 * 导出Hook - 提供通用的导出功能
 */

import { useState } from 'react';
import { ExportFormat } from './types';

interface UseExportOptions {
  data: Record<string, unknown>[];
  headers: string[];
  filenamePrefix: string;
}

export function useExport({ data, headers, filenamePrefix }: UseExportOptions) {
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = (allIds: number[]) => {
    if (selectedRows.length === allIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...allIds]);
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = async () => {
    const selectedData = data.filter((_, index) => selectedRows.includes(index));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content =
        headers.join(',') +
        '\n' +
        selectedData
          .map((row) =>
            headers.map((h) => `"${(row[h] as string) || ''}"`).join(',')
          )
          .join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}</tr>${selectedData
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td>${(row[h] as string) || ''}</td>`).join('')}</tr>`
        )
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}${selectedData
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td>${(row[h] as string) || ''}</td>`).join('')}</tr>`
        )
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: exportFormat.toUpperCase() + ' Files',
              accept: { [mimeType]: ['.' + extension] },
            },
          ],
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

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  return {
    exportMode,
    selectedRows,
    exportFormat,
    showExportModal,
    setExportFormat,
    handleExportClick,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleDoExport,
    handleCancelExport,
    setShowExportModal,
  };
}
