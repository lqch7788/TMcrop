/**
 * 导出Hook - 提供通用的导出功能
 */

import { useState } from 'react';
import { ExportFormat } from './types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 附件数据类型
export interface AttachmentItem {
  problemId: number;
  problemCode: string;
  type: 'photo_before' | 'photo_after' | 'voice' | 'gps' | 'material';
  data: string;  // base64 数据
  filename: string;
}

interface UseExportOptions {
  data: Record<string, unknown>[];
  headers: string[];
  filenamePrefix: string;
}

export function useExport({ data, headers, filenamePrefix }: UseExportOptions) {
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<(number | string)[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = (allIds: (number | string)[]) => {
    if (selectedRows.length === allIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...allIds]);
    }
  };

  const handleSelectRow = (id: number | string) => {
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

  // 生成 Excel HTML 内容（支持超链接）
  const generateExcelHtml = (selectedData: Record<string, unknown>[], headers: string[]): string => {
    return `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join('')}</tr>${selectedData
      .map(
        (row) =>
          `<tr>${headers.map((h) => {
            const value = row[h];
            const strValue = String(value || '');
            // 如果是超链接格式（file: attachments/...），创建超链接
            if (strValue.startsWith('file:')) {
              const linkText = strValue.replace('file: attachments/', '').replace(/.*\//, '');
              return `<td><a href="${strValue}" target="_blank">${linkText}</a></td>`;
            }
            return `<td>${strValue}</td>`;
          }).join('')}</tr>`
      )
      .join('')}</table></body></html>`;
  };

  // 导出带附件的 Zip 包
  const handleDoExportWithAttachments = async (
    attachments: AttachmentItem[]
  ) => {
    const zip = new JSZip();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // 1. 添加 Excel 文件
    const selectedData = selectedRows.length > 0 && data[0] && 'id' in data[0]
      ? data.filter((item) => selectedRows.includes((item as { id: number | string }).id))
      : data.filter((_, index) => selectedRows.includes(index));

    const excelContent = generateExcelHtml(selectedData, headers);
    zip.file(`${filenamePrefix}.xlsx`, excelContent);

    // 2. 按问题编号创建附件文件夹
    const attachmentsByProblem = new Map<number, AttachmentItem[]>();
    attachments.forEach(att => {
      const existing = attachmentsByProblem.get(att.problemId) || [];
      existing.push(att);
      attachmentsByProblem.set(att.problemId, existing);
    });

    const attachmentsFolder = zip.folder('attachments');
    if (attachmentsFolder) {
      for (const [problemId, items] of attachmentsByProblem) {
        const problemCode = items[0]?.problemCode || `PD${problemId}`;
        const problemFolder = attachmentsFolder.folder(problemCode);

        if (problemFolder) {
          // GPS 坐标
          const gpsItems = items.filter(a => a.type === 'gps');
          if (gpsItems.length > 0) {
            const gpsData = gpsItems[0].data;
            problemFolder.file('GPS.txt', `纬度: ${(gpsData as unknown as {lat: number, lng: number}).lat}\n经度: ${(gpsData as unknown as {lat: number, lng: number}).lng}`);
          }

          // 物资编码
          const materialItems = items.filter(a => a.type === 'material');
          if (materialItems.length > 0) {
            problemFolder.file('物资编码.txt', materialItems.map(m => m.filename).join('\n'));
          }

          // 作业前照片
          const beforePhotos = items.filter(a => a.type === 'photo_before');
          beforePhotos.forEach((photo, idx) => {
            const ext = photo.filename.split('.').pop() || 'jpg';
            problemFolder.file(`作业前照片_${idx + 1}.${ext}`, photo.data, { base64: true });
          });

          // 作业后照片
          const afterPhotos = items.filter(a => a.type === 'photo_after');
          afterPhotos.forEach((photo, idx) => {
            const ext = photo.filename.split('.').pop() || 'jpg';
            problemFolder.file(`作业后照片_${idx + 1}.${ext}`, photo.data, { base64: true });
          });

          // 语音备注
          const voiceItems = items.filter(a => a.type === 'voice');
          voiceItems.forEach((voice, idx) => {
            problemFolder.file(`语音备注_${idx + 1}.webm`, voice.data, { base64: true });
          });
        }
      }
    }

    // 3. 生成并下载 zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${filenamePrefix}_${dateStr}.zip`);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 导出函数，支持 excel_with_attachments 格式
  const handleDoExport = async (attachments?: AttachmentItem[]) => {
    // 如果是 excel_with_attachments 格式且有附件数据，调用 zip 导出
    if (exportFormat === 'excel_with_attachments' && attachments && attachments.length > 0) {
      return handleDoExportWithAttachments(attachments);
    }

    // 否则执行常规导出
    const selectedData = selectedRows.length > 0 && data[0] && 'id' in data[0]
      ? data.filter((item) => selectedRows.includes((item as { id: number | string }).id))
      : data.filter((_, index) => selectedRows.includes(index));

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
      content = generateExcelHtml(selectedData, headers);
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
    handleDoExportWithAttachments,
    handleCancelExport,
    setShowExportModal,
  };
}

// 导出类型供外部使用
export type { AttachmentItem };

