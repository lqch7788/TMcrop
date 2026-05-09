// StatisticsTab 类型定义
// 用于领料统计页面的类型声明

/** 主Tab状态 */
export type StatActiveTab = 'monthly' | 'material';

/** 快捷筛选周期 */
export type QuickFilterPeriod = 'currentWeek' | 'currentMonth' | 'currentQuarter' | 'currentYear';

/** 日期范围 */
export interface DateRange {
  start: string;
  end: string;
}

/** 排序配置 */
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

/** 统计汇总数据 */
export interface StatSummaryData {
  requisitionCount: number;
  totalQuantity: number;
  totalAmount: number;
  avgDifferenceRate: number;
  yearOnYearChange: number;
}

/** 月度统计辅助数据 */
export interface MonthStats {
  rank: number | string;
  percent: string;
  qoq: string;
  yoy: string;
}

/** 导出目标类型 */
export type ExportTarget = 'monthly' | 'material';

/** 导出文件类型 */
export type ExportFileType = 'csv' | 'xlsx' | 'doc';

/** 月度汇总表格数据 */
export interface MonthSummary {
  month: string;
  monthName: string;
  totalQuantity: number;
  totalAmount: number;
}

/** 月度详情数据 */
export interface MonthDetail {
  monthName: string;
  categoryKey: string;
  categoryName: string;
  quantity: number;
  amount: number;
}

/** 物料统计数据项 */
export interface MaterialStatItem {
  materialCode: string;
  materialName: string;
  category: string;
  spec: string;
  barcode: string;
  unit: string;
  supplier: string;
  batchCode: string;
  productionDate: string;
  expiryDate: string;
  productionPlanBatchCode: string;
  requisitionDepartment: string;
  usageArea: string;
  requisitioner: string;
  requisitionTime: string;
  requisitionCount: number;
  totalQuantity: number;
  actualQuantity: number;
  totalAmount: number;
  mainWarehouse: string;
}

/** useStatisticsTab hook 返回类型 */
export interface UseStatisticsTabReturn {
  // 状态
  statActiveTab: StatActiveTab;
  statDepartmentFilter: string[];
  statDateRange: DateRange;
  statCategoryFilter: string[];
  statWarehouseFilter: string[];
  statMaterialSearch: string;
  statSupplierFilter: string[];
  statBatchCodeFilter: string[];
  statProductionPlanFilter: string[];
  statUsageAreaFilter: string[];
  statRequisitionerFilter: string[];
  statQuickFilterPeriod: QuickFilterPeriod;
  statYearFilter: string;
  statMonthFilter: string;
  expandedMonths: Set<string>;
  sortConfig: SortConfig;
  statCurrentPage: number;
  statPageSize: number;
  statExportMode: boolean;
  statSelectedRows: number[];
  statShowExportTypeModal: boolean;
  statExportFileType: ExportFileType;
  statExportTarget: ExportTarget;
  statShowDetailModal: boolean;
  statSelectedRecord: MaterialStatItem | null;
  selectedMonth: string;
  statGreenhouseTypeFilter: string;
  statGreenhouseFilter: string[];
  statFieldFilter: string[];
  statBatchFilter: string;
  statComparisonPeriod: string;

  // 过滤后的数据
  materialStatFilteredData: MaterialStatItem[];

  // 设置函数
  setStatActiveTab: (tab: StatActiveTab) => void;
  setStatDepartmentFilter: (filter: string[]) => void;
  setStatDateRange: (range: DateRange) => void;
  setStatCategoryFilter: (filter: string[]) => void;
  setStatWarehouseFilter: (filter: string[]) => void;
  setStatMaterialSearch: (search: string) => void;
  setStatSupplierFilter: (filter: string[]) => void;
  setStatBatchCodeFilter: (filter: string[]) => void;
  setStatProductionPlanFilter: (filter: string[]) => void;
  setStatUsageAreaFilter: (filter: string[]) => void;
  setStatRequisitionerFilter: (filter: string[]) => void;
  setStatQuickFilterPeriod: (period: QuickFilterPeriod) => void;
  setStatYearFilter: (year: string) => void;
  setStatMonthFilter: (month: string) => void;
  setStatCurrentPage: (page: number) => void;
  setStatPageSize: (size: number) => void;
  setStatExportMode: (mode: boolean) => void;
  setStatSelectedRows: (rows: number[]) => void;
  setStatShowExportTypeModal: (show: boolean) => void;
  setStatExportFileType: (type: ExportFileType) => void;
  setStatExportTarget: (target: ExportTarget) => void;
  setStatShowDetailModal: (show: boolean) => void;
  setStatSelectedRecord: (record: MaterialStatItem | null) => void;
  setSelectedMonth: (month: string) => void;
  setStatGreenhouseTypeFilter: (filter: string) => void;
  setStatGreenhouseFilter: (filter: string[]) => void;
  setStatFieldFilter: (filter: string[]) => void;
  setStatBatchFilter: (filter: string) => void;
  setStatComparisonPeriod: (period: string) => void;

  // 辅助函数
  handleStatQuickFilter: (period: string) => void;
  handleStatReset: () => void;
  toggleMonthExpand: (month: string) => void;
  resetExpandedMonths: () => void;
  handleMonthSort: (key: string) => void;
  getSortedMonthSummaries: () => MonthSummary[];
  getMonthStats: (month: string) => MonthStats;
  getCategoryStats: (detailQty: number, monthQty: number) => string;
  getAllMonthKeys: () => number[];
  handleStatSelectAll: () => void;
  handleStatCancelExport: () => void;
  handleStatExportConfirm: () => void;
  confirmStatExport: () => Promise<void>;
  handleMaterialStatExportConfirm: () => void;
  handleMaterialStatCancelExport: () => void;
  handleMaterialStatSelectAll: () => void;
  confirmMaterialStatExport: () => Promise<void>;
  getStatSummaryData: () => StatSummaryData;
}
