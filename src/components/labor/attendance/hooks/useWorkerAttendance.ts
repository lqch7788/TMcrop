/**
 * 工人考勤数据 Hook
 * 统一管理考勤相关的数据和操作逻辑
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AttendanceRecord,
  AttendanceFilters,
  ExportFormat,
  EXPORT_FORMAT_OPTIONS,
} from '../types';
import { apiClient, USE_API } from '../../../../services/apiClient';

// File System Access API 类型声明
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept?: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }
}

// 模拟考勤数据 - 扩展到8条，覆盖不同部门、状态，关联批次
const attendanceData: AttendanceRecord[] = [
  { id: 1, workerId: 'W001', name: '郭靖', dept: '生产部', date: '2024-03-14', checkIn: '07:50', checkOut: '18:10', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T001', batchId: 'B001' },
  { id: 2, workerId: 'W002', name: '杨过', dept: '生产部', date: '2024-03-14', checkIn: '08:00', checkOut: '18:00', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T002', batchId: 'B002' },
  { id: 3, workerId: 'W003', name: '张无忌', dept: '生产部', date: '2024-03-14', checkIn: '07:45', checkOut: '17:50', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T003', batchId: 'B003' },
  { id: 4, workerId: 'W004', name: '令狐冲', dept: '技术部', date: '2024-03-14', checkIn: '08:10', checkOut: '18:00', hours: 9.5, status: '迟到', statusClass: 'warning', taskId: 'T004', batchId: 'B004' },
  { id: 5, workerId: 'W005', name: '段誉', dept: '生产部', date: '2024-03-14', checkIn: '-', checkOut: '-', hours: 0, status: '请假', statusClass: 'draft', taskId: undefined, batchId: 'B005' },
  { id: 6, workerId: 'W006', name: '黄蓉', dept: '仓储部', date: '2024-03-14', checkIn: '08:05', checkOut: '17:55', hours: 9.8, status: '正常', statusClass: 'normal', taskId: 'T004', batchId: 'B004' },
  { id: 7, workerId: 'W007', name: '陈家洛', dept: '生产部', date: '2024-03-14', checkIn: '07:30', checkOut: '18:30', hours: 11, status: '加班', statusClass: 'info', taskId: 'T006', batchId: 'B007' },
  { id: 8, workerId: 'W008', name: '任盈盈', dept: '生产部', date: '2024-03-14', checkIn: '08:20', checkOut: '18:00', hours: 9.7, status: '早退', statusClass: 'warning', taskId: 'T001', batchId: 'B001' },
];

export interface UseWorkerAttendanceReturn {
  // 数据
  filters: AttendanceFilters;
  pagination: { currentPage: number; pageSize: number };
  exportMode: boolean;
  selectedRows: number[];
  exportFormat: ExportFormat;
  showExportModal: boolean;

  // 导出数据（计算属性）
  exportHeaders: string[];
  filteredData: AttendanceRecord[];
  paginatedData: AttendanceRecord[];
  totalPages: number;

  // 操作方法
  setFilters: (filters: Partial<AttendanceFilters>) => void;
  setPagination: (pagination: Partial<{ currentPage: number; pageSize: number }>) => void;
  setExportMode: (mode: boolean) => void;
  setSelectedRows: (rows: number[]) => void;
  setExportFormat: (format: ExportFormat) => void;
  setShowExportModal: (show: boolean) => void;

  // 选择操作
  handleSelectAll: () => void;
  handleSelectRow: (id: number) => void;

  // 导出操作
  handleExportClick: () => void;
  handleCancelExport: () => void;
  handleConfirmExport: () => void;
  handleDoExport: () => void;
}

export function useWorkerAttendance(): UseWorkerAttendanceReturn {
  // 筛选条件状态
  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: '',
    endDate: '',
    dept: '全部',
    keyword: '',
  });

  // 分页状态
  const [pagination, setPaginationState] = useState({
    currentPage: 1,
    pageSize: 10,
  });

  // 导出模式状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // 考勤数据状态（从 API 加载）
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 从 API 加载考勤数据
  useEffect(() => {
    const loadAttendanceData = async () => {
      setIsLoading(true);
      try {
        if (USE_API) {
          // 尝试从 API 获取考勤数据
          const apiData = await apiClient.get<AttendanceRecord[]>('/labor/attendance');
          if (apiData && apiData.length > 0) {
            setAttendanceRecords(apiData);
          } else {
            setAttendanceRecords(attendanceData);
          }
        } else {
          // 非 API 模式，检查是否后端已实现
          try {
            const apiData = await apiClient.get<AttendanceRecord[]>('/labor/attendance');
            if (apiData && apiData.length > 0) {
              setAttendanceRecords(apiData);
            } else {
              setAttendanceRecords(attendanceData);
            }
          } catch {
            // API 不可用，使用 mock 数据
            setAttendanceRecords(attendanceData);
          }
        }
      } catch (error) {
        console.error('加载考勤数据失败，使用 mock 数据:', error);
        setAttendanceRecords(attendanceData);
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  // 筛选数据
  const filteredData = useMemo(() => {
    return attendanceRecords.filter((item) => {
      if (filters.dept !== '全部' && item.dept !== filters.dept) return false;
      if (filters.keyword && !item.name.includes(filters.keyword) && !item.workerId.includes(filters.keyword)) return false;
      return true;
    });
  }, [filters, attendanceRecords]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  // 总页数
  const totalPages = Math.ceil(filteredData.length / pagination.pageSize) || 1;

  // 导出表头
  const exportHeaders = ['工号', '姓名', '部门', '日期', '签到时间', '签退时间', '工时', '状态'];

  // 更新筛选条件
  const setFiltersHandler = useCallback((newFilters: Partial<AttendanceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPaginationState((prev) => ({ ...prev, currentPage: 1 })); // 重置页码
  }, []);

  // 更新分页
  const setPagination = useCallback((newPagination: Partial<{ currentPage: number; pageSize: number }>) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
    if (newPagination.currentPage === undefined) {
      setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map((a) => a.id));
    }
  }, [selectedRows.length, filteredData]);

  // 选择/取消单行
  const handleSelectRow = useCallback((id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  }, []);

  // 点击导出按钮
  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, []);

  // 取消导出
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  // 确认导出
  const handleConfirmExport = useCallback(() => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  }, [selectedRows.length]);

  // 执行导出
  const handleDoExport = useCallback(async () => {
    const selectedData = attendanceData.filter((a) => selectedRows.includes(a.id));
    const exportData = selectedData.map((row) => ({
      '工号': row.workerId,
      '姓名': row.name,
      '部门': row.dept,
      '日期': row.date,
      '签到时间': row.checkIn,
      '签退时间': row.checkOut,
      '工时': row.hours,
      '状态': row.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content =
        exportHeaders.join(',') +
        '\n' +
        exportData
          .map((row) => exportHeaders.map((h) => `"${row[h] || ''}"`).join(','))
          .join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${exportHeaders.map((h) => `<th>${h}</th>`).join('')}</tr>${exportData.map((row) => `<tr>${exportHeaders.map((h) => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${exportHeaders.map((h) => `<th>${h}</th>`).join('')}${exportData.map((row) => `<tr>${exportHeaders.map((h) => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `工人考勤_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
  }, [selectedRows, exportFormat, exportHeaders]);

  return {
    // 数据
    filters,
    pagination,
    exportMode,
    selectedRows,
    exportFormat,
    showExportModal,

    // 导出数据
    exportHeaders,
    filteredData,
    paginatedData,
    totalPages,

    // 操作方法
    setFilters: setFiltersHandler,
    setPagination,
    setExportMode,
    setSelectedRows,
    setExportFormat,
    setShowExportModal,

    // 选择操作
    handleSelectAll,
    handleSelectRow,

    // 导出操作
    handleExportClick,
    handleCancelExport,
    handleConfirmExport,
    handleDoExport,
  };
}
