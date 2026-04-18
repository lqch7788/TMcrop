/**
 * 生产汇总表模块类型定义
 */

// 导出格式
export type ExportFormat = 'excel' | 'csv' | 'word' | 'excel_with_attachments';

// 导出格式选项
export const EXPORT_FORMATS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  { value: 'excel_with_attachments', label: 'Excel+附件 (.zip)', desc: '包含照片等附件，适合需要原始证据的场景' },
];

// 统计卡片配置
export interface StatCardConfig {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
}

// 筛选器配置项
export interface FilterSelectConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

// 表格列定义
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, record: T) => React.ReactNode;
}

// 状态标签样式
export const STATUS_STYLES = {
  normal: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
} as const;

export type StatusStyleKey = keyof typeof STATUS_STYLES;
