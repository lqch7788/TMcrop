/**
 * 调薪申请类型定义
 */
import type { SalaryAdjustmentData } from '../../../stores/useSalaryAdjustmentStore';

/** 调整类型选项 */
export const ADJUSTMENT_TYPE_OPTIONS = [
  { value: '转正调薪', label: '转正调薪' },
  { value: '年度调薪', label: '年度调薪' },
  { value: '晋升调薪', label: '晋升调薪' },
  { value: '绩效调薪', label: '绩效调薪' },
  { value: '市场调薪', label: '市场调薪' },
  { value: '其他', label: '其他' },
] as const;

/** 调薪记录状态 */
export type SalaryAdjustmentStatus = '待审批' | '已通过' | '已拒绝' | '已取消';

/**
 * 调薪记录
 *
 * 2026-10-11 类型清理：统一使用 Store 侧类型（后端数据模型为唯一真相源），
 * 不再重复定义，避免同义类型互不兼容
 */
export type SalaryAdjustmentRecord = SalaryAdjustmentData;

/**
 * 筛选条件
 */
export interface SalaryAdjustmentFilters {
  employeeName: string;
  department: string;
  adjustmentType: string;
  status: string;
  startDate: string;
  endDate: string;
}

/**
 * 表单数据
 */
export interface SalaryAdjustmentFormData {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentType: string;
  effectiveDate: string;
  reason: string;
  remarks: string;
}

/**
 * 分页状态
 */
export interface SalaryAdjustmentPagination {
  current: number;
  pageSize: number;
  total: number;
}

/**
 * 状态选项
 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
] as const;
