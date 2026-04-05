/**
 * 月报数据Hook
 * 管理月报的筛选、分页、导出等状态
 */

import { useState, useCallback } from 'react';
import { MonthlyReport, EXPORT_FORMATS } from '../types';

// Mock数据 - 扩展到8条，覆盖不同月份和状态
const mockMonthlyReports: MonthlyReport[] = [
  { id: 1, code: 'MR202403', month: '2024年3月', dept: '生产部', totalWorkdays: 624, totalWorkhours: 4992, avgDailyWorkers: 20, completedTasks: 156, pendingTasks: 12, totalHarvest: '45.8吨', qualityRate: '97.5%', laborCost: '8.5万元', materialCost: '6.2万元', issuesCount: 5, resolvedIssues: 4, attendanceRate: '98.2%', publisher: '张建华', publishDate: '2024-04-01', status: '已发布', statusClass: 'normal' },
  { id: 2, code: 'MR202402', month: '2024年2月', dept: '生产部', totalWorkdays: 560, totalWorkhours: 4480, avgDailyWorkers: 20, completedTasks: 142, pendingTasks: 8, totalHarvest: '38.2吨', qualityRate: '96.8%', laborCost: '7.8万元', materialCost: '5.8万元', issuesCount: 3, resolvedIssues: 3, attendanceRate: '97.5%', publisher: '张建华', publishDate: '2024-03-01', status: '已发布', statusClass: 'normal' },
  { id: 3, code: 'MR202401', month: '2024年1月', dept: '生产部', totalWorkdays: 620, totalWorkhours: 4960, avgDailyWorkers: 20, completedTasks: 138, pendingTasks: 15, totalHarvest: '32.5吨', qualityRate: '95.5%', laborCost: '8.2万元', materialCost: '5.2万元', issuesCount: 8, resolvedIssues: 6, attendanceRate: '96.8%', publisher: '张建华', publishDate: '2024-02-01', status: '已发布', statusClass: 'normal' },
  { id: 4, code: 'MR202312', month: '2023年12月', dept: '生产部', totalWorkdays: 600, totalWorkhours: 4800, avgDailyWorkers: 20, completedTasks: 125, pendingTasks: 5, totalHarvest: '28.6吨', qualityRate: '96.2%', laborCost: '7.5万元', materialCost: '4.8万元', issuesCount: 4, resolvedIssues: 4, attendanceRate: '97.8%', publisher: '张建华', publishDate: '2024-01-01', status: '已发布', statusClass: 'normal' },
  { id: 5, code: 'MR202311', month: '2023年11月', dept: '生产部', totalWorkdays: 580, totalWorkhours: 4640, avgDailyWorkers: 19, completedTasks: 118, pendingTasks: 10, totalHarvest: '25.3吨', qualityRate: '95.8%', laborCost: '7.2万元', materialCost: '4.5万元', issuesCount: 6, resolvedIssues: 5, attendanceRate: '96.5%', publisher: '张建华', publishDate: '2023-12-01', status: '已发布', statusClass: 'normal' },
  { id: 6, code: 'MR202310', month: '2023年10月', dept: '生产部', totalWorkdays: 620, totalWorkhours: 4960, avgDailyWorkers: 20, completedTasks: 145, pendingTasks: 8, totalHarvest: '42.1吨', qualityRate: '97.2%', laborCost: '8.0万元', materialCost: '6.0万元', issuesCount: 3, resolvedIssues: 3, attendanceRate: '98.5%', publisher: '张建华', publishDate: '2023-11-01', status: '已发布', statusClass: 'normal' },
  { id: 7, code: 'MR202309', month: '2023年9月', dept: '生产部', totalWorkdays: 596, totalWorkhours: 4768, avgDailyWorkers: 20, completedTasks: 132, pendingTasks: 6, totalHarvest: '35.8吨', qualityRate: '96.5%', laborCost: '7.6万元', materialCost: '5.4万元', issuesCount: 5, resolvedIssues: 4, attendanceRate: '97.2%', publisher: '张建华', publishDate: '2023-10-01', status: '已发布', statusClass: 'normal' },
  { id: 8, code: 'MR202404', month: '2024年4月', dept: '生产部', totalWorkdays: 240, totalWorkhours: 1920, avgDailyWorkers: 20, completedTasks: 68, pendingTasks: 45, totalHarvest: '18.5吨', qualityRate: '97.8%', laborCost: '3.2万元', materialCost: '2.8万元', issuesCount: 2, resolvedIssues: 1, attendanceRate: '98.6%', publisher: '张建华', publishDate: '2024-05-01', status: '草稿', statusClass: 'draft' },
];

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
  handleSelectRow: (id: number) => void;
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

  const reports = mockMonthlyReports;

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === reports.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(reports.map((r) => r.id));
    }
  }, [selectedRows.length, reports]);

  // 选择/取消选择单行
  const handleSelectRow = useCallback((id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  }, []);

  // 确认导出
  const handleConfirmExport = useCallback(() => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
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
