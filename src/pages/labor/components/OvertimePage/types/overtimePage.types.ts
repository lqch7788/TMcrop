/**
 * 加班申请页面类型定义
 */
import { OvertimeType } from '../../../../types/labor/overtime';

/** 加班类型选项 */
export const OVERTIME_TYPE_OPTIONS = [
  { value: '工作日加班', label: '工作日加班' },
  { value: '休息日加班', label: '休息日加班' },
  { value: '节假日加班', label: '节假日加班' },
];

/** 加班类型字符串映射到枚举 */
export const OVERTIME_TYPE_MAP: Record<string, OvertimeType> = {
  '工作日加班': OvertimeType.WORKDAY,
  '休息日加班': OvertimeType.WEEKEND,
  '节假日加班': OvertimeType.HOLIDAY,
};

/** 默认基本工资（用于预览计算） */
export const DEFAULT_BASE_SALARY = 6000;

/** 状态筛选选项 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
];

/** 加班记录类型 */
export interface OvertimeRecord {
  id: string;
  staffId: string;
  staffName: string;
  overtimeType: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/** 加班筛选条件类型 */
export interface OvertimeFilters {
  staffName: string;
  overtimeType: string;
  status: string;
  startDate: string;
  endDate: string;
}

/** 表单数据类型 */
export interface OvertimeFormData {
  staffId: string;
  staffName: string;
  overtimeType: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  remarks: string;
}

/** 批量操作模式 */
export type BatchMode = 'none' | 'approve' | 'reject' | 'export';

/** 分页状态类型 */
export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

/** 加班费预览类型 */
export interface OvertimeFeePreview {
  hourlyRate: number;
  rate: number;
  rateText: string;
  totalFee: number;
}
