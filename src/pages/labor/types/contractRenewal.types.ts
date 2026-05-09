/**
 * 合同续签类型定义
 */

/** 合同期限选项 */
export const CONTRACT_PERIOD_OPTIONS = [
  { value: 12, label: '1年' },
  { value: 24, label: '2年' },
  { value: 36, label: '3年' },
  { value: 60, label: '5年' },
] as const;

/** 合同续签记录状态 */
export type ContractRenewalStatus = '待审批' | '已通过' | '已拒绝' | '已取消';

/**
 * 合同续签记录
 */
export interface ContractRenewalRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
  status: ContractRenewalStatus;
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/**
 * 筛选条件
 */
export interface ContractRenewalFilters {
  employeeName: string;
  department: string;
  status: string;
  startDate: string;
  endDate: string;
}

/**
 * 表单数据
 */
export interface ContractRenewalFormData {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange: string;
  remarks: string;
}

/**
 * 分页状态
 */
export interface ContractRenewalPagination {
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
