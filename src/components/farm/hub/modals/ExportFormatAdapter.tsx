/**
 * 导出格式选择弹窗适配器
 * 管理导出格式状态并执行导出
 */

import React, { useState } from 'react';
import { ExportFormatModal } from './ExportFormatModal';
import { useTasks } from '../../../../hooks/useTasks';

interface ExportFormatAdapterProps {
  taskIds: string[];
  onClose: () => void;
}

export function ExportFormatAdapter({ taskIds, onClose }: ExportFormatAdapterProps) {
  const tasksHook = useTasks();
  const [exportFormat, setExportFormat] = useState('excel');

  const handleConfirm = () => {
    console.log('[ExportFormatAdapter] 导出任务:', { taskIds, format: exportFormat });

    // 获取选中的任务数据
    const selectedTasks = tasksHook.tasks.filter(t => taskIds.includes(t.id));

    const statusMap: Record<string, { label: string }> = {
      draft: { label: '草稿' },
      pending: { label: '待接受' },
      accepted: { label: '已接受' },
      in_progress: { label: '进行中' },
      waiting_acceptance: { label: '待验收' },
      completed: { label: '已完成' },
      rejected: { label: '返工中' },
      cancelled: { label: '已取消' },
      abandoned: { label: '已放弃' },
    };

    const priorityMap: Record<string, { label: string }> = {
      urgent: { label: '紧急' },
      high: { label: '高' },
      normal: { label: '普通' },
      low: { label: '低' },
    };

    const headers = ['任务ID', '任务类型', '任务区域', '作物', '批次', '执行人', '进度', '优先级', '状态', '备注', '计划开始时间', '计划结束时间', '任务工时'];
    const exportData = selectedTasks.map(task => ({
      '任务ID': task.id || task.taskCode,
      '任务类型': task.typeName || task.type,
      '任务区域': task.greenhouseName || task.field || '',
      '作物': task.cropName || task.crop || '',
      '批次': task.batchCode || '',
      '执行人': task.assigneeName || task.assignee || '',
      '进度': `${task.progress || 0}%`,
      '优先级': priorityMap[task.priority || 'normal']?.label || '普通',
      '状态': statusMap[task.status]?.label || task.status,
      '备注': task.remarks || '',
      '计划开始时间': task.planStart || task.dueDate || '',
      '计划结束时间': task.planEnd || '',
      '任务工时': task.estimatedHours ? `${task.estimatedHours}小时` : '',
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'xlsx' || exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `农事任务_${new Date().toISOString().slice(0, 10)}.${extension}`;

    // 创建下载
    const blob = new Blob(['﻿' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <ExportFormatModal
      isOpen={true}
      exportFormat={exportFormat}
      selectedCount={taskIds.length}
      onFormatChange={setExportFormat}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
}
