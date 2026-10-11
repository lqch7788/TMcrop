/**
 * 工人考勤数据类型定义
 */

// 考勤记录 / 筛选条件：统一复用 store 的类型定义（避免本地重复定义 id:number 与后端 string id 冲突）
export type { AttendanceRecord, AttendanceFilters } from '../../../stores/attendanceStore';

// 导出格式
export type ExportFormat = 'excel' | 'csv' | 'word';

// 导出格式选项
export interface ExportFormatOption {
  value: ExportFormat;
  label: string;
  desc: string;
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 导出格式选项配置
export const EXPORT_FORMAT_OPTIONS: ExportFormatOption[] = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
];

// 部门选项
export const DEPT_OPTIONS = ['全部', '生产部', '技术部'];

// 每页条数选项
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
