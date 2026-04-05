/**
 * 月报数据类型定义
 */

export interface MonthlyReport {
  id: number;
  code: string;
  month: string;
  dept: string;
  totalWorkdays: number;
  totalWorkhours: number;
  avgDailyWorkers: number;
  completedTasks: number;
  pendingTasks: number;
  totalHarvest: string;
  qualityRate: string;
  laborCost: string;
  materialCost: string;
  issuesCount: number;
  resolvedIssues: number;
  attendanceRate: string;
  publisher: string;
  publishDate: string;
  status: string;
  statusClass: 'normal' | 'warning';
}

export interface ExportFormat {
  value: 'excel' | 'csv' | 'word';
  label: string;
  desc: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
];

export const MONTH_OPTIONS = [
  '2024年3月',
  '2024年2月',
  '2024年1月',
];

export const DEPT_OPTIONS = [
  '全部',
  '生产部',
  '技术部',
];
