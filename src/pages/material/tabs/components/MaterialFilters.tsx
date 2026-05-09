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
      departmentOptions={['生产部', '技术部', '设备部', '后勤部', '采后处理部']}
      categoryOptions={['肥料与土壤改良剂', '农药与植保产品', '种质资源', '劳保与防护用品', '农业机械', '采收容器', '监测设备']}
      warehouseOptions={['仓库A区', '仓库B区', '仓库C区']}
      supplierOptions={['有机肥供应商A', '化肥供应商B', '农药供应商C', '种子供应商D', '劳保用品供应商E', '农机供应商F', '包装材料供应商G', '监测设备供应商H']}
      batchCodeOptions={['YC20260301', 'HF20260315', 'NY20260220', 'NY20260110', 'ZZ20260201', 'ZZ20260115', 'LB20260228', 'LB20260305', 'NJ20260120', 'NJ20260210', 'BZ20260320', 'JC20260105']}
      productionPlanOptions={['ZZB2026-001', 'ZZB2026-002', 'ZZB2026-003', 'YMB2026-001', 'YMB2026-002', 'YMB2026-003', 'JZB2026-001', 'JZB2026-002']}
      usageAreaOptions={['玻璃温室A区', '日光温室1号', '塑料大棚1号', '露天种植区', '大田A区', '玻璃温室B区', '全园区', '日光温室2号', '设备维修间', '滴灌系统', '采后处理车间', '监测室']}
      requisitionerOptions={['张伟民', '李明轩', '王建国', '赵俊杰', '郑志远', '陈思远', '吴海龙', '孙晓峰', '郑志明', '周志刚']}
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
