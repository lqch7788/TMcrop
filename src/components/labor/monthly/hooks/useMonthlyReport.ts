/**
 * 月报数据Hook
 *
 * V2.0架构改造：数据存储迁移到 useMonthlyReportStore
 * 管理月报的筛选、分页、导出等状态
 * 导出等业务逻辑保留在Hook层
 */
import { useEffect, useState, useCallback } from 'react';
import { useMonthlyReportStore } from '@/stores';
import { MonthlyReport, EXPORT_FORMATS } from '../types';
import { showAlert } from '@/lib/dialogService';

export interface UseMonthlyReportReturn {
  // 数据
  reports: MonthlyReport[];
  // 筛选状态
  month: string;
  setMonth: (month: string) => void;
  dept: string;
  setDept: (dept: string) => void;
  // 分页状态
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  // 导出状态
  exportMode: boolean;
  setExportMode: (mode: boolean) => void;
  selectedRows: number[];
  setSelectedRows: (rows: number[]) => void;
  exportFormat: 'excel' | 'csv' | 'word';
  setExportFormat: (format: 'excel' | 'csv' | 'word') => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  // 导出相关方法
  handleSelectAll: () => void;
  handleSelectRow: (id: string) => void;
  handleConfirmExport: () => void;
  handleCancelExport: () => void;
  // 计算属性
  totalPages: number;
  paginatedReports: MonthlyReport[];
  currentStats: {
    totalWorkdays: number;
    attendanceRate: string;
    completedTasks: number;
    totalHarvest: string;
  };
}

export function useMonthlyReport(): UseMonthlyReportReturn {
  const store = useMonthlyReportStore();

  // 组件挂载时初始化种子数据
  useEffect(() => {
    store.initSeedData();
  }, []);

  // 筛选状态
  const [month, setMonth] = useState('2024年3月');
  const [dept, setDept] = useState('全部');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  const reports = store.reports;

  // 全选/取消全选 - 基于分页数据
  const handleSelectAll = useCallback(() => {
    const paginatedIds = reports.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r) => r.id);
    const allPaginatedSelected = paginatedIds.every((id) => selectedRows.includes(id));

    if (allPaginatedSelected) {
      // 取消当前页全选
      setSelectedRows(selectedRows.filter((id) => !paginatedIds.includes(id)));
    } else {
      // 全选当前页
      const newSelected = Array.from(new Set([...selectedRows, ...paginatedIds]));
      setSelectedRows(newSelected);
    }
  }, [selectedRows, currentPage, pageSize, reports]);

  // 选择/取消选择单行
  const handleSelectRow = useCallback((id: string) => {
    const numId = Number(id);
    setSelectedRows((prev) =>
      prev.includes(numId) ? prev.filter((rowId) => rowId !== numId) : [...prev, numId]
    );
  }, []);

  // 确认导出
  const handleConfirmExport = useCallback(() => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  }, [selectedRows]);

  // 执行导出
  const handleDoExport = useCallback(async () => {
    const selectedData = reports.filter((r) => selectedRows.includes(r.id));
    const headers = [
      '报表编号', '月份', '部门', '总工日', '总工时', '日均人数',
      '已完成任务', '待处理任务', '总产量', '品质率', '人工成本',
      '物料成本', '问题数', '已解决问题', '考勤率', '发布人', '发布日期', '状态',
    ];

    const exportData = selectedData.map((row) => ({
      '报表编号': row.code,
      '月份': row.month,
      '部门': row.dept,
      '总工日': row.totalWorkdays,
      '总工时': row.totalWorkhours,
      '日均人数': row.avgDailyWorkers,
      '已完成任务': row.completedTasks,
      '待处理任务': row.pendingTasks,
      '总产量': row.totalHarvest,
      '品质率': row.qualityRate,
      '人工成本': row.laborCost,
      '物料成本': row.materialCost,
      '问题数': row.issuesCount,
      '已解决问题': row.resolvedIssues,
      '考勤率': row.attendanceRate,
      '发布人': row.publisher,
      '发布日期': row.publishDate,
      '状态': row.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content =
        headers.join(',') +
        '\n' +
        exportData
          .map((row) => headers.map((h) => `"${row[h] || ''}"`).join(','))
          .join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}</tr>${exportData
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td>${row[h] || ''}</td>`).join('')}</tr>`
        )
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers
        .map((h) => `<th>${h}</th>`)
        .join('')}${exportData
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td>${row[h] || ''}</td>`).join('')}</tr>`
        )
        .join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `月度报表_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      // 导出失败
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
  }, [exportFormat, reports, selectedRows]);

  // 取消导出
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  // 计算属性
  const totalPages = Math.ceil(reports.length / pageSize);
  const paginatedReports = reports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 当前统计数据（使用第一条数据作为示例）
  const currentStats = {
    totalWorkdays: reports[0]?.totalWorkdays || 0,
    attendanceRate: reports[0]?.attendanceRate || '0%',
    completedTasks: reports[0]?.completedTasks || 0,
    totalHarvest: reports[0]?.totalHarvest || '0吨',
  };

  return {
    reports,
    month,
    setMonth,
    dept,
    setDept,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    exportMode,
    setExportMode,
    selectedRows,
    setSelectedRows,
    exportFormat,
    setExportFormat,
    showExportModal,
    setShowExportModal,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleCancelExport,
    totalPages,
    paginatedReports,
    currentStats,
  };
}
