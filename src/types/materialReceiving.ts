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

// 领料单类型
export interface MaterialReceivingRecord {
  id: number;
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  plantArea: string;
  reviewer: string;
  productionBatchCode: string;
  status: string;
  statusClass: string;
  rejectReason?: string;
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
