// 工资计算类型
export type SalaryCalcType = '月薪制' | '日薪制' | '时薪制';
export type SalaryStatus = '待确认' | '已确认' | '已发放';

/**
 * 工资记录
 */
export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  month: string;  // YYYY-MM
  calcType: SalaryCalcType;
  baseSalary: number;       // 基本工资
  overtimePay: number;      // 加班费
  bonuses: number;          // 奖金
  deductions: number;       // 扣款
  lateDeductions: number;   // 迟到扣款
  absenceDeductions: number; // 缺勤扣款
  socialSecurity: number;   // 社保
  housingFund: number;      // 公积金
  personalTax: number;      // 个税
  netSalary: number;        // 实发工资
  status: SalaryStatus;
}

/**
 * 工资筛选条件
 */
export interface SalaryFilters {
  month?: string;
  staffName?: string;
  calcType?: SalaryCalcType;
  status?: SalaryStatus;
}

/**
 * 工资分页
 */
export interface SalaryPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

/**
 * 工资表格Props
 */
export interface SalaryTableProps {
  data: SalaryRecord[];
  pagination: SalaryPagination;
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: SalaryRecord) => void;
  onCalculate?: (record: SalaryRecord) => void;
  onExport?: (record: SalaryRecord) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onShowExportModal?: () => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchEditConfirm?: () => void;
  onConfirmDelete?: () => void;
  onCancelBatch?: () => void;
  onExportClick?: () => void;
}

/**
 * 工资条弹窗Props
 */
export interface SalarySlipModalProps {
  record: SalaryRecord | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 工资计算弹窗Props (针对临时工)
 */
export interface SalaryCalculateModalProps {
  record: SalaryRecord | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: SalaryCalculateData) => void;
}

/**
 * 工资计算数据
 */
export interface SalaryCalculateData {
  daysWorked?: number;    // 出勤天数 (日薪制)
  hoursWorked?: number;   // 实际工时 (时薪制)
  dailyRate?: number;     // 日工资
  hourlyRate?: number;    // 时工资
}
