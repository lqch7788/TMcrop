/**
 * 工资预算类型定义
 */
import { ApprovalStatus } from '../../types/approval';

/**
 * 工资预算记录
 */
export interface SalaryBudgetRecord {
  id: string;
  budgetCode: string;        // 预算编号
  deptId: string;           // 部门ID
  deptName: string;         // 部门名称
  budgetMonth: string;       // 预算月份 (YYYY-MM)
  totalBaseSalary: number;  // 基本工资总额
  totalOvertimePay: number; // 加班费总额
  totalBonus: number;       // 奖金总额
  grandTotal: number;       // 总计
  status: ApprovalStatus;   // 审批状态
  applicantId: string;      // 申请人ID
  applicantName: string;    // 申请人姓名
  applyDate: string;        // 申请日期
  remark?: string;          // 备注
}

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
