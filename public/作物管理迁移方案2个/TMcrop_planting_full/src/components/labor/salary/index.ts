// 工资管理模块导出
export { SalaryPage } from './SalaryPage';
export { SalaryTable } from './SalaryTable';
export { SalaryFilters } from './SalaryFilters';
export { SalarySlipModal } from './SalarySlipModal';
export { SalaryCalculateModal } from './SalaryCalculateModal';
export { useSalary } from './hooks/useSalary';

// 类型导出
export type {
  SalaryRecord,
  SalaryFilters,
  SalaryPagination,
  SalaryCalcType,
  SalaryStatus,
  SalaryTableProps,
  SalarySlipModalProps,
  SalaryCalculateModalProps,
  SalaryCalculateData,
} from './types';
