// MaterialFilters 组件 - 物料筛选器
// 使用 StatSearchBar 组件进行物料统计页面的筛选
import { StatSearchBar } from '../../../../components/materialReceiving/stats/StatSearchBar';

interface MaterialFiltersProps {
  /** 物料编码/名称搜索 */
  materialSearch: string;
  /** 部门筛选 */
  departmentFilter: string[];
  /** 日期范围 */
  dateRange: { start: string; end: string };
  /** 分类筛选 */
  categoryFilter: string[];
  /** 仓库筛选 */
  warehouseFilter: string[];
  /** 供应商筛选 */
  supplierFilter: string[];
  /** 批次号筛选 */
  batchCodeFilter: string[];
  /** 生产计划批次筛选 */
  productionPlanFilter: string[];
  /** 用途/区域筛选 */
  usageAreaFilter: string[];
  /** 领料人筛选 */
  requisitionerFilter: string[];
  /** 快捷筛选周期 */
  quickFilterPeriod: string;
  /** 真实选项（从 API 数据派生） */
  filterOptions: {
    departments: string[];
    categories: string[];
    suppliers: string[];
    batchCodes: string[];
    productionPlans: string[];
    usageAreas: string[];
    requisitioners: string[];
  };
  /** 设置物料搜索 */
  onMaterialSearchChange: (search: string) => void;
  /** 设置部门筛选 */
  onDepartmentChange: (filter: string[]) => void;
  /** 设置日期范围 */
  onDateRangeChange: (range: { start: string; end: string }) => void;
  /** 设置分类筛选 */
  onCategoryChange: (filter: string[]) => void;
  /** 设置仓库筛选 */
  onWarehouseChange: (filter: string[]) => void;
  /** 设置供应商筛选 */
  onSupplierChange: (filter: string[]) => void;
  /** 设置批次号筛选 */
  onBatchCodeChange: (filter: string[]) => void;
  /** 设置生产计划批次筛选 */
  onProductionPlanChange: (filter: string[]) => void;
  /** 设置用途/区域筛选 */
  onUsageAreaChange: (filter: string[]) => void;
  /** 设置领料人筛选 */
  onRequisitionerChange: (filter: string[]) => void;
  /** 快捷筛选变化 */
  onQuickFilterChange: (period: string) => void;
  /** 重置筛选 */
  onReset: () => void;
}

export function MaterialFilters({
  materialSearch,
  departmentFilter,
  dateRange,
  categoryFilter,
  warehouseFilter,
  supplierFilter,
  batchCodeFilter,
  productionPlanFilter,
  usageAreaFilter,
  requisitionerFilter,
  quickFilterPeriod,
  filterOptions,
  onMaterialSearchChange,
  onDepartmentChange,
  onDateRangeChange,
  onCategoryChange,
  onWarehouseChange,
  onSupplierChange,
  onBatchCodeChange,
  onProductionPlanChange,
  onUsageAreaChange,
  onRequisitionerChange,
  onQuickFilterChange,
  onReset,
}: MaterialFiltersProps) {
  return (
    <StatSearchBar
      materialSearch={materialSearch}
      departmentFilter={departmentFilter}
      dateRange={dateRange}
      categoryFilter={categoryFilter}
      warehouseFilter={warehouseFilter}
      supplierFilter={supplierFilter}
      batchCodeFilter={batchCodeFilter}
      productionPlanFilter={productionPlanFilter}
      usageAreaFilter={usageAreaFilter}
      requisitionerFilter={requisitionerFilter}
      quickFilterPeriod={quickFilterPeriod}
      departmentOptions={filterOptions.departments}
      categoryOptions={filterOptions.categories}
      warehouseOptions={[]}
      supplierOptions={filterOptions.suppliers}
      batchCodeOptions={filterOptions.batchCodes}
      productionPlanOptions={filterOptions.productionPlans}
      usageAreaOptions={filterOptions.usageAreas}
      requisitionerOptions={filterOptions.requisitioners}
      onMaterialSearchChange={onMaterialSearchChange}
      onDepartmentChange={onDepartmentChange}
      onDateRangeChange={onDateRangeChange}
      onCategoryChange={onCategoryChange}
      onWarehouseChange={onWarehouseChange}
      onSupplierChange={onSupplierChange}
      onBatchCodeChange={onBatchCodeChange}
      onProductionPlanChange={onProductionPlanChange}
      onUsageAreaChange={onUsageAreaChange}
      onRequisitionerChange={onRequisitionerChange}
      onQuickFilterChange={onQuickFilterChange}
      onReset={onReset}
    />
  );
}
