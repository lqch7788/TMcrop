// 领料单物料明细类型
export interface MaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  category: string;
  requestedQuantity: number;
  stockQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  batchNo?: string; // 批次号（批次级库存追溯）
  remark?: string;
}

// 2026-08-10：选区域(多选)类型——与施肥管理「施肥区域(多选,支持不同作物不同区域)」对齐
//   type: planting(种植批次) | seedling(育苗批次) | custom(其他用途,自由文本)
//   cropName: 展示用作物品种名(planting/seedling) 或 用途说明文本(custom)
//   area: 区域名(种植 rootName,育苗 siteName) 或 空字符串(custom)
//   code: 批次号(plantCode/seedlingCode) 或 空字符串(custom)
export interface SelectedArea {
  type: 'planting' | 'seedling' | 'custom';
  id: string;
  code: string;
  cropName: string;
  area: string;
  greenhouseId?: string;
  greenhouseName?: string;
}

// 领料单类型
export interface MaterialReceivingRecord {
  id: number;
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  /** 2026-08-10：已废弃(改为 plantAreas 多选区域)——保留用于旧数据兼容展示 */
  plantArea?: string;
  /** 2026-08-10：选区域(多选)——plant_area 列在 Store normalize 阶段从 JSON 字符串解析 */
  plantAreas: SelectedArea[];
  reviewer: string;
  status: string;
  statusClass: string;
  rejectReason?: string;
  /** 出库状态：null(未出库) | 'partial'(部分出库) | 'complete'(已出库) */
  dispatchStatus?: string;
  materials: MaterialItem[];
}

// 领料出库物料明细类型
export interface ExecuteMaterialItem {
  materialCode: string;
  materialName: string;
  batchNo?: string; // 批次号（批次级库存追溯）
  spec: string;
  unit: string;
  category: string;
  requestedQuantity: number;
  stockQuantity: number;
  actualQuantity: number;
  remark?: string;
  applicationCode: string;
  unitPrice?: number;
  warehousePosition?: string;
}

// 领料出库单类型
export interface MaterialExecuteRecord {
  id: string | number;
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  operator: string;
  productionBatchCode: string;
  sourceApplicationCodes: string[];
  executeStatus: string;
  executeStatusClass: string;
  materials: ExecuteMaterialItem[];
}

// 月份汇总行（未展开状态）
export interface MonthSummaryRow {
  month: string;
  monthName: string;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
}

// 月份明细行（展开状态）
export interface MonthDetailRow {
  month: string;
  monthName: string;
  categoryKey: string;
  categoryName: string;
  quantity: number;
  amount: number;
  percentage: number;
}

// 月度统计数据
export interface MonthlyStatistics {
  year: string;
  month: string;
  department: string;
  requisitionCount: number;
  materialTypes: number;
  totalQuantity: number;
  actualQuantity: number;
  differenceRate: number;
  totalAmount: number;
}

// 物料统计数据
export interface MaterialStatistics {
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

// 部门统计数据
export interface DepartmentStatistics {
  applicant: string;
  department: string;
  requisitionCount: number;
  requisitionOrders: number;
  materialTypes: number;
  totalQuantity: number;
  totalAmount: number;
  avgPerOrder: number;
  avgAmount: number;
  topMaterials: string[];
}

// 大棚统计数据
export interface GreenhouseStatistics {
  greenhouse: string;
  greenhouseType: string;
  period: string;
  requisitionCount: number;
  materialTypes: number;
  totalQuantity: number;
  totalAmount: number;
  comparison: {
    lastMonth: {
      quantity: number;
      amount: number;
      changeRate: number;
    };
  };
}

// 大田统计数据
export interface FieldStatistics {
  field: string;
  crop: string;
  period: string;
  requisitionCount: number;
  materialTypes: number;
  totalQuantity: number;
  totalAmount: number;
  comparison: {
    lastMonth: {
      quantity: number;
      amount: number;
      changeRate: number;
    };
  };
}

// 批次统计数据
export interface BatchStatistics {
  batchCode: string;
  cropName: string;
  variety: string;
  plantArea: string;
  areaSize: string;
  plannedStartDate: string;
  plannedEndDate: string;
  requisitionCount: number;
  materialTypes: number;
  totalQuantity: number;
  actualQuantity: number;
  totalAmount: number;
  details: Array<{
    materialCode: string;
    materialName: string;
    category: string;
    spec: string;
    unit: string;
    totalQuantity: number;
    actualQuantity: number;
    totalAmount: number;
    mainWarehouse: string;
    mainApplicant: string;
  }>;
}

// 物料分类颜色配置
export interface CategoryColors {
  gradient: string[];
  solid: string;
}

// 物料分类汇总数据
export interface CategorySummary {
  name: string;
  key: string;
  value: number;
  amount: number;
  percentage: number;
  gradient: string[];
  solid: string;
}

// 月度趋势数据
export interface CategoryTrend {
  month: string;
  生产投入: number;
  设施装备: number;
  作业支持: number;
  采后流通: number;
  数字管理: number;
  能源耗材: number;
  其他: number;
  total: number;
}

// 图表数据
export interface TrendChartData {
  month: string;
  quantity: number;
  amount: number;
}

export interface DepartmentPieData {
  name: string;
  value: number;
  percentage: number;
}

export interface CategoryPieData {
  name: string;
  value: number;
  percentage: number;
}

// ============================================
// 成本核算相关类型
// ============================================

// 成本统计数据
export interface CostStatistics {
  period: string;
  category: string;
  department: string;
  batchCode: string;
  totalCost: number;
  quantity: number;
  avgPrice: number;
}

// 批次成本明细
export interface BatchCostDetail {
  batchCode: string;
  cropName: string;
  area: string;
  materialCount: number;
  totalCost: number;
  unitCost: number;
}

// 部门成本对比
export interface DepartmentCost {
  department: string;
  requisitionCount: number;
  materialTypes: number;
  totalCost: number;
  percentage: number;
  rank: number;
}

// 供应商价格对比
export interface SupplierPriceComparison {
  supplier: string;
  materialTypes: number;
  totalAmount: number;
  avgPrice: number;
  priceIndex: number;
}

// 成本分类汇总
export interface CostCategorySummary {
  category: string;
  requisitionCount: number;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
  monthOverMonth: number;
}

// ============================================
// 表单状态类型（消除组件 props 中的 any）
// ============================================

/** 领料申请新增/编辑表单状态 */
export interface MaterialRequestFormState {
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  /** 2026-08-10：选区域(多选) */
  plantAreas: SelectedArea[];
  reviewer: string;
  expectedDate: string;
  remarks: string;
  materials: MaterialItem[];
}

/** 领料出库新增表单状态 */
export interface ExecuteAddFormState {
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  operator: string;
  productionBatchCode: string;
  sourceApplicationCodes: string[];
  remarks: string;
  materials: ExecuteMaterialItem[];
}

/** 领料出库编辑表单状态 */
export interface ExecuteEditFormState {
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  operator: string;
  productionBatchCode: string;
  remarks: string;
  materials: ExecuteMaterialItem[];
}

// 月度成本趋势
export interface MonthlyCostTrend {
  month: string;
  totalCost: number;
  categoryCosts: {
    生产投入: number;
    设施装备: number;
    作业支持: number;
    采后流通: number;
    数字管理: number;
    能源耗材: number;
    其他: number;
  };
}
