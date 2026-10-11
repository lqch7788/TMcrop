/**
 * 工资预算类型定义
 */
import { ApprovalStatus } from '../../../types/approval';
import type { SalaryBudgetData } from '../../../stores/useSalaryBudgetStore';

/**
 * 工资预算记录
 *
 * 2026-10-11 类型清理：统一使用 Store 侧类型（后端数据模型为唯一真相源），
 * 不再重复定义，避免同义类型互不兼容
 */
export type SalaryBudgetRecord = SalaryBudgetData;

/**
 * 预算汇总数据
 */
export interface BudgetSummary {
  month: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  grandTotal: number;
  count: number;
}

/**
 * 筛选条件
 */
export interface SalaryBudgetFilters {
  deptId: string;
  budgetMonth: string;
  status: ApprovalStatus | '';
}

/**
 * 表单数据
 */
export interface SalaryBudgetFormData {
  deptId: string;
  deptName: string;
  budgetMonth: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  remark: string;
}

/**
 * 分页状态
 */
export interface SalaryBudgetPagination {
  current: number;
  pageSize: number;
  total: number;
}

/**
 * 状态选项
 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING', label: '待审批' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'CANCELLED', label: '已取消' },
] as const;

/**
 * LocalStorage 存储键名
 */
export const SALARY_BUDGET_STORAGE_KEY = 'SALARY_BUDGET_RECORDS';
