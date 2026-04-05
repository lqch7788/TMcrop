// 成本核算数据处理
import type {
  CostStatistics,
  BatchCostDetail,
  DepartmentCost,
  SupplierPriceComparison,
  CostCategorySummary,
  MonthlyCostTrend,
} from '../types/materialReceiving';
import type { MaterialReceivingRecord } from '../types/materialReceiving';
import { materialReceivingDetails } from './materialReceivingData';
import { getCategoryByCode } from './materialReceivingData';
import type { CostFilters } from '../components/cost/CostFiltersForm';

// KPI统计数据
export const costKPIData = {
  totalCost: 158420,
  monthlyCost: 32450,
  avgBatchCost: 15842,
  costDiffRate: -2.3,
};

// 成本构成饼图数据（按物料分类）
export const costCategoryPieData = [
  { name: '肥料与土壤改良剂', value: 35800, amount: 35800, percentage: 28.5, gradient: ['#06B6D4', '#0891B2'], solid: '#06B6D4' },
  { name: '农药与植保产品', value: 22400, amount: 22400, percentage: 17.8, gradient: ['#8B5CF6', '#7C3AED'], solid: '#8B5CF6' },
  { name: '种质资源', value: 18600, amount: 18600, percentage: 14.8, gradient: ['#F59E0B', '#D97706'], solid: '#F59E0B' },
  { name: '农业机械', value: 15200, amount: 15200, percentage: 12.1, gradient: ['#F97316', '#EA580C'], solid: '#F97316' },
  { name: '劳保与防护用品', value: 12800, amount: 12800, percentage: 10.2, gradient: ['#EC4899', '#DB2777'], solid: '#EC4899' },
  { name: '采收容器', value: 8500, amount: 8500, percentage: 6.8, gradient: ['#64748B', '#475569'], solid: '#64748B' },
  { name: '监测设备', value: 6200, amount: 6200, percentage: 4.9, gradient: ['#10B981', '#059669'], solid: '#10B981' },
  { name: '其他', value: 5500, amount: 5500, percentage: 4.4, gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' },
];

// 月度成本趋势数据（12个月）
export const monthlyCostTrendData: MonthlyCostTrend[] = [
  { month: '2025-01', totalCost: 8920, categoryCosts: { 生产投入: 2460, 设施装备: 1420, 作业支持: 960, 采后流通: 840, 数字管理: 360, 能源耗材: 150, 其他: 90 } },
  { month: '2025-02', totalCost: 10580, categoryCosts: { 生产投入: 2850, 设施装备: 1680, 作业支持: 1140, 采后流通: 960, 数字管理: 420, 能源耗材: 180, 其他: 120 } },
  { month: '2025-03', totalCost: 11860, categoryCosts: { 生产投入: 3240, 设施装备: 1860, 作业支持: 1260, 采后流通: 1080, 数字管理: 480, 能源耗材: 210, 其他: 135 } },
  { month: '2025-04', totalCost: 13240, categoryCosts: { 生产投入: 3600, 设施装备: 2040, 作业支持: 1440, 采后流通: 1200, 数字管理: 540, 能源耗材: 240, 其他: 150 } },
  { month: '2025-05', totalCost: 14710, categoryCosts: { 生产投入: 4050, 设施装备: 2250, 作业支持: 1560, 采后流通: 1350, 数字管理: 600, 能源耗材: 270, 其他: 165 } },
  { month: '2025-06', totalCost: 16120, categoryCosts: { 生产投入: 4440, 设施装备: 2460, 作业支持: 1740, 采后流通: 1440, 数字管理: 660, 能源耗材: 300, 其他: 180 } },
  { month: '2025-07', totalCost: 15220, categoryCosts: { 生产投入: 4200, 设施装备: 2340, 作业支持: 1620, 采后流通: 1380, 数字管理: 600, 能源耗材: 285, 其他: 174 } },
  { month: '2025-08', totalCost: 13940, categoryCosts: { 生产投入: 3840, 设施装备: 2160, 作业支持: 1500, 采后流通: 1260, 数字管理: 540, 能源耗材: 255, 其他: 156 } },
  { month: '2025-09', totalCost: 12630, categoryCosts: { 生产投入: 3450, 设施装备: 1950, 作业支持: 1380, 采后流通: 1140, 数字管理: 495, 能源耗材: 234, 其他: 144 } },
  { month: '2025-10', totalCost: 11210, categoryCosts: { 生产投入: 3060, 设施装备: 1740, 作业支持: 1200, 采后流通: 1020, 数字管理: 450, 能源耗材: 210, 其他: 126 } },
  { month: '2025-11', totalCost: 10060, categoryCosts: { 生产投入: 2760, 设施装备: 1560, 作业支持: 1080, 采后流通: 900, 数字管理: 405, 能源耗材: 186, 其他: 114 } },
  { month: '2025-12', totalCost: 9180, categoryCosts: { 生产投入: 2550, 设施装备: 1440, 作业支持: 960, 采后流通: 810, 数字交管理: 360, 能源耗材: 165, 其他: 105 } },
];

// 分类成本明细数据
export const costCategoryDetailData: CostCategorySummary[] = [
  { category: '肥料与土壤改良剂', requisitionCount: 45, totalQuantity: 1250, totalAmount: 35800, percentage: 28.5, monthOverMonth: 5.2 },
  { category: '农药与植保产品', requisitionCount: 38, totalQuantity: 890, totalAmount: 22400, percentage: 17.8, monthOverMonth: -2.1 },
  { category: '种质资源', requisitionCount: 25, totalQuantity: 520, totalAmount: 18600, percentage: 14.8, monthOverMonth: 8.3 },
  { category: '农业机械', requisitionCount: 20, totalQuantity: 85, totalAmount: 15200, percentage: 12.1, monthOverMonth: -1.5 },
  { category: '劳保与防护用品', requisitionCount: 32, totalQuantity: 450, totalAmount: 12800, percentage: 10.2, monthOverMonth: 3.7 },
  { category: '采收容器', requisitionCount: 18, totalQuantity: 680, totalAmount: 8500, percentage: 6.8, monthOverMonth: 12.0 },
  { category: '监测设备', requisitionCount: 12, totalQuantity: 45, totalAmount: 6200, percentage: 4.9, monthOverMonth: -0.8 },
  { category: '其他', requisitionCount: 15, totalQuantity: 220, totalAmount: 5500, percentage: 4.4, monthOverMonth: 1.2 },
];

// 批次成本追踪数据
export const batchCostData: BatchCostDetail[] = [
  { batchCode: 'FQ2026-001', cropName: '番茄', area: '3000m²', materialCount: 8, totalCost: 18560, unitCost: 6.19 },
  { batchCode: 'FQ2026-002', cropName: '黄瓜', area: '2500m²', materialCount: 6, totalCost: 14240, unitCost: 5.70 },
  { batchCode: 'FQ2026-003', cropName: '草莓', area: '600m²', materialCount: 5, totalCost: 7680, unitCost: 12.80 },
  { batchCode: 'FQ2026-004', cropName: '生菜', area: '500m²', materialCount: 4, totalCost: 4920, unitCost: 9.84 },
  { batchCode: 'FQ2026-005', cropName: '辣椒', area: '1800m²', materialCount: 7, totalCost: 11200, unitCost: 6.22 },
  { batchCode: 'FQ2026-006', cropName: '茄子', area: '1200m²', materialCount: 5, totalCost: 8200, unitCost: 6.83 },
];

// 部门成本对比数据
export const departmentCostData: DepartmentCost[] = [
  { department: '生产部', requisitionCount: 85, materialTypes: 25, totalCost: 68500, percentage: 54.5, rank: 1 },
  { department: '技术部', requisitionCount: 42, materialTypes: 15, totalCost: 28400, percentage: 22.6, rank: 2 },
  { department: '设备部', requisitionCount: 28, materialTypes: 12, totalCost: 18200, percentage: 14.5, rank: 3 },
  { department: '后勤部', requisitionCount: 15, materialTypes: 8, totalCost: 5600, percentage: 4.5, rank: 4 },
  { department: '采后处理部', requisitionCount: 12, materialTypes: 6, totalCost: 4800, percentage: 3.8, rank: 5 },
];

// 供应商价格对比数据
export const supplierPriceData: SupplierPriceComparison[] = [
  { supplier: '有机肥供应商A', materialTypes: 5, totalAmount: 28500, avgPrice: 45.2, priceIndex: 100 },
  { supplier: '化肥供应商B', materialTypes: 3, totalAmount: 22400, avgPrice: 52.8, priceIndex: 117 },
  { supplier: '农药供应商C', materialTypes: 8, totalAmount: 18200, avgPrice: 38.5, priceIndex: 85 },
  { supplier: '种子供应商D', materialTypes: 6, totalAmount: 15600, avgPrice: 42.0, priceIndex: 93 },
  { supplier: '劳保用品供应商E', materialTypes: 4, totalAmount: 9800, avgPrice: 28.5, priceIndex: 63 },
  { supplier: '农机供应商F', materialTypes: 3, totalAmount: 15200, avgPrice: 178.8, priceIndex: 396 },
  { supplier: '包装材料供应商G', materialTypes: 2, totalAmount: 6200, avgPrice: 18.2, priceIndex: 40 },
  { supplier: '监测设备供应商H', materialTypes: 2, totalAmount: 4800, avgPrice: 106.7, priceIndex: 236 },
];

// 分类明细弹窗数据（按分类展开的物料列表）
export const costCategoryMaterialData: Record<string, any[]> = {
  '肥料与土壤改良剂': [
    { materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', quantity: 580, price: 43.8, amount: 25404 },
    { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', quantity: 420, price: 83.0, amount: 34860 },
    { materialCode: 'SP0203001', materialName: '复合肥', spec: '40kg/袋', unit: '袋', quantity: 250, price: 72.5, amount: 18125 },
  ],
  '农药与植保产品': [
    { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '100g/瓶', unit: '瓶', quantity: 380, price: 28.1, amount: 10678 },
    { materialCode: 'SP0302001', materialName: '多菌灵', spec: '200g/袋', unit: '袋', quantity: 280, price: 34.4, amount: 9632 },
    { materialCode: 'SP0303001', materialName: '百菌清', spec: '100g/瓶', unit: '瓶', quantity: 230, price: 25.6, amount: 5888 },
  ],
};

// 计算年度总成本
export const getYearTotalCost = (): number => {
  return monthlyCostTrendData.reduce((sum, item) => sum + item.totalCost, 0);
};

// 计算月度平均成本
export const getMonthlyAvgCost = (): number => {
  const total = getYearTotalCost();
  return total / 12;
};

// ============================================
// 动态数据计算函数
// ============================================

// 1. 根据筛选条件过滤记录
export function filterCostRecords(filters: CostFilters): MaterialReceivingRecord[] {
  return materialReceivingDetails.filter(record => {
    // 日期筛选
    if (record.date < filters.dateRange.start || record.date > filters.dateRange.end) {
      return false;
    }
    // 部门筛选
    if (filters.departments.length > 0 && !filters.departments.includes(record.department)) {
      return false;
    }
    // 仓库筛选
    if (filters.warehouses.length > 0 && !filters.warehouses.includes(record.warehouseLocation)) {
      return false;
    }
    // 批次筛选
    if (filters.batches.length > 0 && !filters.batches.includes(record.productionBatchCode)) {
      return false;
    }
    // 分类筛选（检查物料明细）
    if (filters.categories.length > 0) {
      const hasMatchCategory = record.materials.some(mat => {
        const cat = getCategoryByCode(mat.materialCode);
        return filters.categories.includes(cat);
      });
      if (!hasMatchCategory) return false;
    }
    return true;
  });
}

// 2. 计算总成本
export function calcCostTotal(records: MaterialReceivingRecord[]): number {
  return records.reduce((sum, record) => {
    const recordCost = record.materials.reduce((matSum, mat) => {
      return matSum + mat.requestedQuantity * mat.unitPrice;
    }, 0);
    return sum + recordCost;
  }, 0);
}

// 3. 计算本月成本
export function calcMonthlyCost(records: MaterialReceivingRecord[]): number {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return records
    .filter(r => r.date.startsWith(currentMonth))
    .reduce((sum, record) => {
      return sum + record.materials.reduce((matSum, mat) => {
        return matSum + mat.requestedQuantity * mat.unitPrice;
      }, 0);
    }, 0);
}

// 4. 按分类聚合
export interface CategoryAgg {
  category: string;
  requisitionCount: number;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
}

export function aggregateByCategory(records: MaterialReceivingRecord[]): CategoryAgg[] {
  const totalCost = calcCostTotal(records);
  const categoryMap = new Map<string, CategoryAgg>();

  records.forEach(record => {
    record.materials.forEach(mat => {
      const cat = getCategoryByCode(mat.materialCode);
      const amount = mat.requestedQuantity * mat.unitPrice;
      const existing = categoryMap.get(cat);
      if (existing) {
        existing.requisitionCount += 1;
        existing.totalQuantity += mat.requestedQuantity;
        existing.totalAmount += amount;
      } else {
        categoryMap.set(cat, {
          category: cat,
          requisitionCount: 1,
          totalQuantity: mat.requestedQuantity,
          totalAmount: amount,
          percentage: 0,
        });
      }
    });
  });

  // 计算百分比
  const result = Array.from(categoryMap.values());
  result.forEach(item => {
    item.percentage = totalCost > 0 ? (item.totalAmount / totalCost) * 100 : 0;
  });

  // 按金额降序排列
  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}

// 5. 按部门聚合
export interface DepartmentAgg {
  department: string;
  requisitionCount: number;
  materialTypes: number;
  totalAmount: number;
  percentage: number;
}

export function aggregateByDepartment(records: MaterialReceivingRecord[]): DepartmentAgg[] {
  const totalCost = calcCostTotal(records);
  const deptMap = new Map<string, DepartmentAgg>();

  records.forEach(record => {
    const amount = record.materials.reduce((sum, mat) => {
      return sum + mat.requestedQuantity * mat.unitPrice;
    }, 0);
    const existing = deptMap.get(record.department);
    if (existing) {
      existing.requisitionCount += 1;
      existing.totalAmount += amount;
    } else {
      deptMap.set(record.department, {
        department: record.department,
        requisitionCount: 1,
        materialTypes: 0,
        totalAmount: amount,
        percentage: 0,
      });
    }
  });

  const result = Array.from(deptMap.values());
  result.forEach(item => {
    item.percentage = totalCost > 0 ? (item.totalAmount / totalCost) * 100 : 0;
  });

  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}

// 6. 按批次聚合
export interface BatchAgg {
  batchCode: string;
  cropName: string;
  area: string;
  requisitionCount: number;
  materialTypes: number;
  totalAmount: number;
  unitCost: number;
}

export function aggregateByBatch(records: MaterialReceivingRecord[]): BatchAgg[] {
  const batchMap = new Map<string, BatchAgg>();

  records.forEach(record => {
    const amount = record.materials.reduce((sum, mat) => {
      return sum + mat.requestedQuantity * mat.unitPrice;
    }, 0);
    const existing = batchMap.get(record.productionBatchCode);
    if (existing) {
      existing.requisitionCount += 1;
      existing.totalAmount += amount;
      existing.materialTypes += record.materials.length;
    } else {
      batchMap.set(record.productionBatchCode, {
        batchCode: record.productionBatchCode,
        cropName: record.plantArea.split('-')[0] || '未知',
        area: '0m²',
        requisitionCount: 1,
        materialTypes: record.materials.length,
        totalAmount: amount,
        unitCost: 0,
      });
    }
  });

  return Array.from(batchMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

// 7. 按月份聚合（趋势图用）
export interface MonthlyAgg {
  month: string;
  totalAmount: number;
}

export function aggregateByMonth(records: MaterialReceivingRecord[]): MonthlyAgg[] {
  const monthMap = new Map<string, number>();

  records.forEach(record => {
    const month = record.date.substring(0, 7); // YYYY-MM
    const amount = record.materials.reduce((sum, mat) => {
      return sum + mat.requestedQuantity * mat.unitPrice;
    }, 0);
    monthMap.set(month, (monthMap.get(month) || 0) + amount);
  });

  return Array.from(monthMap.entries())
    .map(([month, totalAmount]) => ({ month, totalAmount }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// 8. 获取筛选后的明细数据（用于弹窗）
export interface MaterialDetailItem {
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: string;
}

export function getFilteredMaterialDetails(
  records: MaterialReceivingRecord[],
  dimension: 'category' | 'department' | 'batch',
  dimensionValue: string
): MaterialDetailItem[] {
  return records
    .filter(record => {
      if (dimension === 'department' && record.department !== dimensionValue) return false;
      if (dimension === 'batch' && record.productionBatchCode !== dimensionValue) return false;
      return true;
    })
    .flatMap(record => record.materials)
    .filter(mat => {
      if (dimension === 'category') {
        return getCategoryByCode(mat.materialCode) === dimensionValue;
      }
      return true;
    })
    .map(mat => ({
      code: mat.materialCode,
      name: mat.materialName,
      spec: mat.spec,
      unit: mat.unit,
      quantity: mat.requestedQuantity,
      unitPrice: mat.unitPrice,
      amount: mat.requestedQuantity * mat.unitPrice,
      category: getCategoryByCode(mat.materialCode),
    }));
}

// 9. 获取批次的物料明细汇总（用于展开显示）
export interface BatchMaterialDetail {
  materialCode: string;
  materialName: string;
  totalAmount: number;
}

export function getBatchMaterialDetails(records: MaterialReceivingRecord[]): Record<string, BatchMaterialDetail[]> {
  const result: Record<string, BatchMaterialDetail[]> = {};

  records.forEach(record => {
    const batchCode = record.productionBatchCode;
    if (!result[batchCode]) {
      result[batchCode] = [];
    }
    record.materials.forEach(mat => {
      const existing = result[batchCode].find(m => m.materialCode === mat.materialCode);
      if (existing) {
        existing.totalAmount += mat.requestedQuantity * mat.unitPrice;
      } else {
        result[batchCode].push({
          materialCode: mat.materialCode,
          materialName: mat.materialName,
          totalAmount: mat.requestedQuantity * mat.unitPrice,
        });
      }
    });
  });

  // 排序并只保留前4个
  Object.keys(result).forEach(batchCode => {
    result[batchCode] = result[batchCode]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 4);
  });

  return result;
}
